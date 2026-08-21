-- =====================================================================
-- @username mentions in Forum replies
--
-- Not a text-parsed "@word" regex like @here: profiles.username has no
-- character or space restriction at all (confirmed - no check constraint
-- anywhere, and the onboarding/account UI calls it a "display name" with
-- no character hint), so a plain word-boundary match can't reliably tell
-- where a mention ends. Instead the client resolves who was @mentioned
-- through its own autocomplete (backed by the existing member_search RPC)
-- and sends their user ids explicitly alongside the post - forum_post
-- below never has to parse a name out of free text at all.
--
-- Depends on 20260820090000_forum_reply_follow_report.sql. Safe to re-run.
-- =====================================================================

create table if not exists public.forum_message_mentions (
  message_id        uuid not null references public.forum_messages (id) on delete cascade,
  mentioned_user_id uuid not null references auth.users (id) on delete cascade,
  primary key (message_id, mentioned_user_id)
);
create index if not exists forum_message_mentions_user_idx on public.forum_message_mentions (mentioned_user_id);

alter table public.forum_message_mentions enable row level security;

drop policy if exists "forum_mentions_select_all" on public.forum_message_mentions;
create policy "forum_mentions_select_all"
  on public.forum_message_mentions for select
  to authenticated
  using ( true );

-- no insert/update/delete grant - written only by forum_post() below
revoke all on public.forum_message_mentions from anon, authenticated;
grant select on public.forum_message_mentions to authenticated;

-- forum_post, replaced: adds an optional mentions uuid[] - each id is
-- validated (real member, not the sender, not blocked) and gets its own
-- notification row, deduped against @here through the exact same
-- (recipient_id, message_id) where kind='mention' partial unique index -
-- someone both @mentioned by name and covered by @here in the same
-- message is only ever notified once.
create or replace function public.forum_post(topic_id uuid, body text, reply_to uuid default null, mentions uuid[] default null)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg      public.mod_settings;
  chk      record;
  me       uuid := auth.uid();
  n        integer;
  clean    text;
  has_here boolean;
  new_id   uuid;
  new_at   timestamptz;
  mid      uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.forum_topics ft where ft.id = topic_id) then
    raise exception 'That topic no longer exists';
  end if;
  select s.* into cfg from public.mod_settings s where s.id;

  if reply_to is not null and not exists (
    select 1 from public.forum_messages fm where fm.id = reply_to and fm.topic_id = forum_post.topic_id
  ) then
    raise exception 'That message is not in this topic';
  end if;

  if mentions is not null and array_length(mentions, 1) > 10 then
    raise exception 'Too many people mentioned at once';
  end if;

  clean := btrim(regexp_replace(regexp_replace(coalesce(body, ''),
             '[^\S\r\n]+', ' ', 'g'), '(\r?\n){3,}', E'\n\n', 'g'));

  if length(clean) = 0 then raise exception 'Nothing to post'; end if;
  if length(clean) > cfg.max_len then
    raise exception 'Too long — % characters at most', cfg.max_len;
  end if;

  select count(*) into n from public.forum_messages fm
   where fm.user_id = me and fm.created_at > now() - interval '1 minute';
  if n >= cfg.per_minute then
    insert into public.moderation_events (user_id, category, reason, action, length)
      values (me, 'spam', 'rate limit', 'rejected', length(clean));
    raise exception 'Slow down a moment — too many posts';
  end if;

  has_here := clean ~* '(^|[^[:alnum:]_])@here([^[:alnum:]_]|$)';

  if has_here then
    select count(*) into n from public.forum_messages fm
     where fm.user_id = me
       and fm.created_at > now() - interval '10 minutes'
       and fm.body ~* '(^|[^[:alnum:]_])@here([^[:alnum:]_]|$)';
    if n >= 3 then
      raise exception 'Slow down — @here can only be used a few times every 10 minutes';
    end if;
  end if;

  if exists (
    select 1 from public.forum_messages fm
    where fm.user_id = me and fm.topic_id = forum_post.topic_id and fm.body = clean
      and fm.created_at > now() - make_interval(secs => cfg.dupe_window)
  ) then
    raise exception 'You have just posted that';
  end if;

  select * into chk from public.mod_check(clean);
  if not chk.ok then
    insert into public.moderation_events (user_id, category, reason, action, length)
      values (me, chk.category, chk.note, 'rejected', length(clean));
    raise exception 'Not posted — %', coalesce(chk.note, 'it broke a chat rule');
  end if;

  update public.forum_topics ft
     set message_count = ft.message_count + 1,
         last_message_at = now()
   where ft.id = forum_post.topic_id;

  insert into public.forum_messages (topic_id, user_id, body, reply_to)
  values (forum_post.topic_id, me, clean, reply_to)
  returning forum_messages.id, forum_messages.created_at into new_id, new_at;

  insert into public.forum_topic_reads (user_id, topic_id, last_read_at, following)
  values (me, forum_post.topic_id, now(), true)
  on conflict (user_id, topic_id) do update set last_read_at = excluded.last_read_at, following = true;

  if mentions is not null then
    foreach mid in array mentions loop
      -- silently skips anyone not a real member, the sender themself, or
      -- blocked either direction - a name someone typed and then deleted,
      -- or an id the client got wrong, should not fail the whole post
      if mid <> me and exists (select 1 from public.profiles p where p.id = mid)
         and not public.is_blocked(mid, me) then
        insert into public.forum_message_mentions (message_id, mentioned_user_id)
        values (new_id, mid)
        on conflict do nothing;
        insert into public.forum_notifications (recipient_id, actor_id, topic_id, message_id, kind)
        values (mid, me, forum_post.topic_id, new_id, 'mention')
        on conflict (recipient_id, message_id) where kind = 'mention' do nothing;
      end if;
    end loop;
  end if;

  if has_here then
    insert into public.forum_notifications (recipient_id, actor_id, topic_id, message_id, kind)
    select distinct r.uid, me, forum_post.topic_id, new_id, 'mention'
    from (
      select fm.user_id as uid from public.forum_messages fm where fm.topic_id = forum_post.topic_id
      union
      select tr.user_id as uid from public.forum_topic_reads tr
       where tr.topic_id = forum_post.topic_id and tr.following
    ) r
    where r.uid <> me
      and not public.is_blocked(r.uid, me)
    on conflict (recipient_id, message_id) where kind = 'mention' do nothing;
  end if;

  return query select new_id, new_at;
end;
$$;

revoke all on function public.forum_post(uuid, text, uuid, uuid[]) from anon, authenticated;
grant execute on function public.forum_post(uuid, text, uuid, uuid[]) to authenticated;

-- forum_messages_list, extended with a mentions array (id + display name
-- per mentioned member) so the client can highlight "@Name" in the
-- rendered body without a second round trip - same reasoning as the
-- reply_to snippet columns already denormalized here.
drop function if exists public.forum_messages_list(uuid, integer);

create or replace function public.forum_messages_list(topic_id uuid, lim integer default 200)
returns table (
  id uuid, user_id uuid, sender_name text, sender_avatar text,
  body text, created_at timestamptz, mine boolean, sender_online boolean,
  reply_to uuid, reply_sender_name text, reply_body text,
  mentions jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.user_id, mc.display_name, mc.avatar, m.body, m.created_at,
         (m.user_id = auth.uid()),
         (mc.show_online and mc.last_active_at is not null
            and mc.last_active_at > now() - interval '5 minutes'),
         m.reply_to,
         rp.display_name,
         left(rm.body, 140),
         coalesce((
           select jsonb_agg(jsonb_build_object('id', fmm.mentioned_user_id, 'name', mp.display_name))
           from public.forum_message_mentions fmm
           left join public.member_cards mp on mp.id = fmm.mentioned_user_id
           where fmm.message_id = m.id
         ), '[]'::jsonb)
  from public.forum_messages m
  left join public.member_cards mc on mc.id = m.user_id
  left join public.forum_messages rm on rm.id = m.reply_to
  left join public.member_cards rp on rp.id = rm.user_id
  where m.topic_id = forum_messages_list.topic_id
  order by m.created_at asc
  limit least(coalesce(lim, 200), 500);
$$;

revoke all on function public.forum_messages_list(uuid, integer) from anon, authenticated;
grant execute on function public.forum_messages_list(uuid, integer) to authenticated;
