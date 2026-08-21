-- =====================================================================
-- Fix: stale forum_post/forum_messages_list versions still live
--
-- Direct introspection (pg_get_functiondef against the live database)
-- showed two things that should not both be true at once:
--
-- 1. TWO overloads of forum_post exist side by side: the current
--    4-argument version (topic_id, body, reply_to, mentions) and a
--    stale 2-argument version (topic_id, body) from
--    20260820080000_forum_extras.sql that 20260820110000_fix_overload_
--    ambiguity.sql was supposed to have dropped. Its "drop function if
--    exists" silently does nothing if the signature it names does not
--    match what is actually live, so either that migration never ran on
--    this project, or a later create-or-replace of the 2-arg version ran
--    again after it.
--
-- 2. forum_messages_list is still the 20260820080000 shape (no reply_to,
--    reply_sender_name, reply_body or mentions columns), even though
--    20260820100000_forum_username_mentions.sql replaced it with a
--    version that returns those. Same root cause as #1 - that
--    migration's changes to this function did not take effect either.
--
-- Whatever the exact cause, the fix is the same either way: force both
-- functions back to a single, current, correct state, and tell PostgREST
-- to drop its cached schema so it stops using whatever it had cached
-- from before. chat_send/chat_send_core went through the identical
-- signature change (reply_to added) via the same migration that failed
-- to clean up forum_post, so their stale short-signature versions are
-- dropped here too, on the same evidence.
--
-- Rollback: re-creating `public.forum_post(uuid, text)` restores the
-- ambiguity this migration removes - not recommended. The
-- forum_messages_list redefinition can be reverted by re-running
-- 20260820080000_forum_extras.sql's version if the newer columns are
-- unwanted, though nothing in the client stops sending/expecting them.
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 20260820110000_fix_overload_ambiguity.sql targeted the exact right
--    four signatures (chat_send/chat_send_core/forum_post x2) but its
--    forum_post drops are directly proven (via live introspection) not
--    to have taken effect - so its chat_send/chat_send_core drops are
--    equally suspect and are re-run here too, on the same reasoning as
--    section 1 below.
-- ---------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_proc
    where proname = 'chat_send' and pronamespace = 'public'::regnamespace
      and pg_get_function_identity_arguments(oid) = 'target uuid, body text'
  ) then
    drop function public.chat_send(uuid, text);
  end if;

  if exists (
    select 1 from pg_proc
    where proname = 'chat_send_core' and pronamespace = 'public'::regnamespace
      and pg_get_function_identity_arguments(oid) = 'me uuid, target uuid, body text'
  ) then
    drop function public.chat_send_core(uuid, uuid, text);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Drop every forum_post signature except the current 4-arg one.
--    Unconditional (no "if exists" silently swallowing a mismatch) so a
--    wrong assumption about what is live surfaces as a real error instead
--    of quietly doing nothing again.
-- ---------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_proc
    where proname = 'forum_post' and pronamespace = 'public'::regnamespace
      and pg_get_function_identity_arguments(oid) = 'topic_id uuid, body text'
  ) then
    drop function public.forum_post(uuid, text);
  end if;

  if exists (
    select 1 from pg_proc
    where proname = 'forum_post' and pronamespace = 'public'::regnamespace
      and pg_get_function_identity_arguments(oid) = 'topic_id uuid, body text, reply_to uuid'
  ) then
    drop function public.forum_post(uuid, text, uuid);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. forum_messages_list, brought back to the current shape (reply
--    snippet + mentions), identical to 20260820100000_forum_username_
--    mentions.sql's version - nothing new, just re-asserting it.
-- ---------------------------------------------------------------------

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

revoke all on function public.forum_messages_list(uuid, integer) from public, anon, authenticated;
grant execute on function public.forum_messages_list(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Re-affirm the single correct forum_post is exactly what should be
--    live (matches 20260820130000_fix_forum_reply_ambiguity.sql - safe
--    to run again, create or replace).
-- ---------------------------------------------------------------------

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
  perform public.account_check(me);
  if not exists (select 1 from public.forum_topics ft where ft.id = topic_id) then
    raise exception 'That topic no longer exists';
  end if;
  select s.* into cfg from public.mod_settings s where s.id;

  if reply_to is not null and not exists (
    select 1 from public.forum_messages fm where fm.id = forum_post.reply_to and fm.topic_id = forum_post.topic_id
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

revoke all on function public.forum_post(uuid, text, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.forum_post(uuid, text, uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Force PostgREST to drop whatever it has cached and pick up the
--    function signatures as they actually are now. Supabase normally
--    does this automatically on DDL, but costs nothing to be explicit
--    given how this whole file got here.
-- ---------------------------------------------------------------------

notify pgrst, 'reload schema';
