-- =====================================================================
-- Discord-style replies (forum + chat), explicit follow/unfollow, and
-- reporting a forum topic
--
-- Depends on 20260820060000_forum.sql, 20260820080000_forum_extras.sql and
-- the chat migrations (20260806010000_chat.sql onward). Safe to re-run.
-- =====================================================================

-- ---- 1. reply-to, forum ----------------------------------------------

alter table public.forum_messages add column if not exists reply_to uuid references public.forum_messages (id) on delete set null;
create index if not exists forum_messages_reply_to_idx on public.forum_messages (reply_to);

-- forum_post, replaced: adds an optional reply_to, validated as belonging
-- to the same topic (replying across topics makes no sense and would let
-- a client leak which topic some other message lives in). Everything else
-- - moderation, rate limits, @here, the notification fan-out - is
-- unchanged from the 20260820080000 version.
create or replace function public.forum_post(topic_id uuid, body text, reply_to uuid default null)
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

  -- Posting is "following" - overrides a previous unfollow, since a
  -- deliberate reply is a stronger signal than a stale read timestamp.
  insert into public.forum_topic_reads (user_id, topic_id, last_read_at, following)
  values (me, forum_post.topic_id, now(), true)
  on conflict (user_id, topic_id) do update set last_read_at = excluded.last_read_at, following = true;

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

revoke all on function public.forum_post(uuid, text, uuid) from anon, authenticated;
grant execute on function public.forum_post(uuid, text, uuid) to authenticated;

-- forum_messages_list, extended with reply_to plus a denormalized snippet
-- of the parent (sender name + first part of its body) so the client can
-- render a quoted preview without a second round trip or a client-side
-- join against messages it may not have fetched (a reply to something far
-- back, outside the current page of 200).
drop function if exists public.forum_messages_list(uuid, integer);

create or replace function public.forum_messages_list(topic_id uuid, lim integer default 200)
returns table (
  id uuid, user_id uuid, sender_name text, sender_avatar text,
  body text, created_at timestamptz, mine boolean, sender_online boolean,
  reply_to uuid, reply_sender_name text, reply_body text
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
         left(rm.body, 140)
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

-- ---- 2. reply-to, chat -------------------------------------------------

alter table public.messages add column if not exists reply_to uuid references public.messages (id) on delete set null;
create index if not exists messages_reply_to_idx on public.messages (reply_to);

create or replace function public.chat_send_core(me uuid, target uuid, body text, reply_to uuid default null)
returns table (id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  cfg  public.mod_settings;
  chk  record;
  cid  uuid;
  n    integer;
  clean text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select s.* into cfg from public.mod_settings s where s.id;

  if not public.are_friends(me, target) then
    raise exception 'You can only message friends';
  end if;
  if public.is_blocked(me, target) then
    raise exception 'You cannot message this member';
  end if;

  cid := public.chat_conversation_with_pair(me, target);

  if reply_to is not null and not exists (
    select 1 from public.messages rm where rm.id = reply_to and rm.conversation_id = cid
  ) then
    raise exception 'That message is not in this conversation';
  end if;

  clean := btrim(regexp_replace(regexp_replace(coalesce(body, ''),
             '[^\S\r\n]+', ' ', 'g'), '(\r?\n){3,}', E'\n\n', 'g'));

  if length(clean) = 0 then raise exception 'Nothing to send'; end if;
  if length(clean) > cfg.max_len then
    raise exception 'Too long — % characters at most', cfg.max_len;
  end if;

  select count(*) into n from public.messages fm
   where fm.sender_id = me and fm.created_at > now() - interval '1 minute';
  if n >= cfg.per_minute then
    insert into public.moderation_events (user_id, category, reason, action, length)
      values (me, 'spam', 'rate limit', 'rejected', length(clean));
    raise exception 'Slow down a moment — too many messages';
  end if;

  if exists (
    select 1 from public.messages m
    where m.sender_id = me and m.body = clean
      and m.created_at > now() - make_interval(secs => cfg.dupe_window)
  ) then
    raise exception 'You have just sent that';
  end if;

  select * into chk from public.mod_check(clean);
  if not chk.ok then
    insert into public.moderation_events (user_id, category, reason, action, length)
      values (me, chk.category, chk.note, 'rejected', length(clean));
    raise exception 'Message not sent — %', coalesce(chk.note, 'it broke a chat rule');
  end if;

  return query
    insert into public.messages (conversation_id, sender_id, body, reply_to)
    values (cid, me, clean, reply_to)
    returning messages.id, messages.created_at;
end;
$$;

create or replace function public.chat_send(target uuid, body text, reply_to uuid default null)
returns table (id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare cfg public.mod_settings;
begin
  select s.* into cfg from public.mod_settings s where s.id;
  if cfg.require_ai and auth.role() <> 'service_role' then
    raise exception 'Chat is routed through moderation right now - try again shortly';
  end if;
  return query select * from public.chat_send_core(auth.uid(), target, body, reply_to);
end;
$$;

revoke all on function public.chat_send(uuid, text, uuid) from anon, authenticated;
grant execute on function public.chat_send(uuid, text, uuid) to authenticated;

drop function if exists public.chat_history(uuid, integer);

create or replace function public.chat_history(target uuid, lim integer default 100)
returns table (
  id uuid, sender_id uuid, body text, created_at timestamptz, mine boolean,
  reply_to uuid, reply_sender_name text, reply_body text
)
language sql stable security definer set search_path = public
as $$
  select m.id, m.sender_id, m.body, m.created_at, (m.sender_id = auth.uid()),
         m.reply_to,
         coalesce(rp.username, rp.discord_username),
         left(rm.body, 140)
  from public.messages m
  join public.dm_pairs d on d.conversation_id = m.conversation_id
  left join public.messages rm on rm.id = m.reply_to
  left join public.profiles rp on rp.id = rm.sender_id
  where d.user_a = least(auth.uid(), target)
    and d.user_b = greatest(auth.uid(), target)
    and exists (select 1 from public.conversation_members cm
                 where cm.conversation_id = m.conversation_id and cm.user_id = auth.uid())
  order by m.created_at desc
  limit least(coalesce(lim, 100), 200);
$$;

revoke all on function public.chat_history(uuid, integer) from anon, authenticated;
grant execute on function public.chat_history(uuid, integer) to authenticated;

-- ---- 3. explicit follow/unfollow on a forum topic ----------------------
--
-- forum_topic_reads already tracked "has this member ever opened this
-- topic" (last_read_at) for the [NEW] indicator - following is a second,
-- independent bit of state on the same row: opening a topic still marks it
-- read, but no longer silently implies "and now notify me about @here in
-- it forever" the way row-existence used to. A member can follow a topic
-- they have not opened yet (Follow from the list) or unfollow one they
-- have read plenty of (Unfollow from inside it) without affecting whether
-- it still shows [NEW] correctly.

alter table public.forum_topic_reads add column if not exists following boolean not null default true;

drop function if exists public.forum_topics_list(integer);

create or replace function public.forum_topics_list(lim integer default 50)
returns table (
  id uuid, title text, description text,
  created_by uuid, creator_name text, creator_avatar text,
  created_at timestamptz, last_message_at timestamptz, message_count integer,
  unread_count integer, following boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.title, t.description, t.created_by,
         coalesce(p.username, p.discord_username, 'Member'),
         coalesce(p.avatar_url, p.discord_avatar),
         t.created_at, t.last_message_at, t.message_count,
         (select count(*)::int from public.forum_messages fm
          where fm.topic_id = t.id
            and fm.user_id <> auth.uid()
            and fm.created_at > coalesce(
                  (select tr.last_read_at from public.forum_topic_reads tr
                   where tr.user_id = auth.uid() and tr.topic_id = t.id),
                  '-infinity'::timestamptz)),
         coalesce((select tr.following from public.forum_topic_reads tr
                    where tr.user_id = auth.uid() and tr.topic_id = t.id), false)
  from public.forum_topics t
  left join public.profiles p on p.id = t.created_by
  order by t.last_message_at desc
  limit least(coalesce(lim, 50), 100);
$$;

revoke all on function public.forum_topics_list(integer) from anon, authenticated;
grant execute on function public.forum_topics_list(integer) to authenticated;

-- Explicit set, direct client upsert (auth/forum.js) rather than an RPC -
-- pure personal data, same reasoning as forum_topic_reads' own RLS. Kept
-- here only as documentation of the shape the client writes:
--   upsert({user_id, topic_id, following}, {onConflict:"user_id,topic_id"})
-- last_read_at is not included in that payload, so a Follow click from the
-- topic list (never opened) does not falsely mark it as read - it takes
-- the column's own default (now()) only on first insert.

-- ---- 4. reporting a forum topic -----------------------------------------

alter table public.reports add column if not exists forum_topic_id uuid references public.forum_topics (id) on delete set null;
alter table public.reports add column if not exists forum_message_id uuid references public.forum_messages (id) on delete set null;
alter table public.reports add column if not exists forum_body text;

drop function if exists public.member_report(uuid, text, text, uuid, text);

create or replace function public.member_report(
  target uuid, reason text, detail text default null,
  message uuid default null, action text default 'review',
  forum_topic uuid default null, forum_message uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me   uuid := auth.uid();
  msg  public.messages;
  fmsg public.forum_messages;
begin
  if me is null or target = me then raise exception 'Cannot report yourself'; end if;
  if exists (select 1 from public.reports r
              where r.reporter_id = me and r.reported_id = target
                and r.created_at > now() - interval '1 hour') then
    raise exception 'You have already reported this member recently';
  end if;

  if message is not null then
    select m.* into msg from public.messages m
     where m.id = message
       and exists (select 1 from public.conversation_members cm
                    where cm.conversation_id = m.conversation_id and cm.user_id = me);
    if not found then raise exception 'That message is not one you can see'; end if;
  end if;

  if forum_message is not null then
    select fm.* into fmsg from public.forum_messages fm where fm.id = forum_message;
    if not found then raise exception 'That message no longer exists'; end if;
  elsif forum_topic is not null and not exists (select 1 from public.forum_topics ft where ft.id = forum_topic) then
    raise exception 'That topic no longer exists';
  end if;

  insert into public.reports (reporter_id, reported_id, reason, detail,
                              message_id, conversation_id, message_body, action_requested,
                              forum_topic_id, forum_message_id, forum_body)
  values (me, target, reason, detail, msg.id, msg.conversation_id, msg.body,
          coalesce(nullif(action, ''), 'review'),
          forum_topic, fmsg.id, fmsg.body);
end;
$$;

revoke all on function public.member_report(uuid, text, text, uuid, text, uuid, uuid) from anon, authenticated;
grant execute on function public.member_report(uuid, text, text, uuid, text, uuid, uuid) to authenticated;
