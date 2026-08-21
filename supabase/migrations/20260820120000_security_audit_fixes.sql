-- =====================================================================
-- Security audit fixes - Forum/Social/Notifications review
--
-- Five confirmed issues from a full-repo audit after the Forum feature
-- landed. None of these change what a legitimate member can already do -
-- each is either closing an access gap that should never have been open,
-- or fixing a grant that was actively blocking a feature from working.
--
-- Rollback: every statement below is reversible by hand if needed -
-- see the note at the end of each numbered section. Nothing here deletes
-- rows or alters existing data; every change is to grants, a function
-- body, or a column list.
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CRITICAL - explicit lockdown for functions that were missing one
--
-- Every function below already has "revoke all ... from anon,
-- authenticated" in the migration that created it, which is enough on
-- its own IF the "revoke execute from public" default-privileges sweep
-- in 20260820020000_security_definer_view_fix.sql applies to the role
-- that later ran 20260820080000 onward. That is a reasonable assumption,
-- not a guarantee - PUBLIC is a pseudo-role every other role belongs to,
-- and Postgres grants EXECUTE to PUBLIC on a new function by default
-- unless that default was overridden for the exact role that created it.
--
-- chat_send_core(uuid, uuid, text, uuid) is the one that matters most:
-- it takes the sender's identity as a plain parameter and trusts it
-- completely (chat_send passes auth.uid(); nothing stops a direct
-- caller passing anyone else's id instead). The original 3-argument
-- version was explicitly revoked from anon/authenticated the day it was
-- written (20260806010000_chat.sql:918) specifically because of this;
-- the replacement 4-argument version lost that explicit statement when
-- reply_to was added. This closes that gap outright rather than trusting
-- an inherited default to still be in effect.
--
-- Rollback: `grant execute on function <name> to authenticated;` restores
-- the previous (ambiguous) state for any one of these - not recommended.
-- ---------------------------------------------------------------------

revoke all on function public.chat_send_core(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.account_check(uuid) from public, anon, authenticated;
revoke all on function public.forum_message_reaction_counts(uuid[]) from public, anon, authenticated;
revoke all on function public.forum_activity_stats() from public, anon, authenticated;
revoke all on function public.forum_notif_unread_count() from public, anon, authenticated;
revoke all on function public.forum_notifications_list(integer) from public, anon, authenticated;
revoke all on function public.forum_notif_mark_read(uuid) from public, anon, authenticated;
revoke all on function public.forum_notif_mark_all_read() from public, anon, authenticated;
revoke all on function public.forum_post(uuid, text, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.forum_topics_list(integer) from public, anon, authenticated;
revoke all on function public.forum_messages_list(uuid, integer) from public, anon, authenticated;
revoke all on function public.chat_send(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.chat_history(uuid, integer) from public, anon, authenticated;
revoke all on function public.member_report(uuid, text, text, uuid, text, uuid, uuid) from public, anon, authenticated;

-- ...then put back exactly the grants those functions are meant to have
-- (authenticated only - none of these belong to anon).
grant execute on function public.forum_message_reaction_counts(uuid[]) to authenticated;
grant execute on function public.forum_activity_stats() to authenticated;
grant execute on function public.forum_notif_unread_count() to authenticated;
grant execute on function public.forum_notifications_list(integer) to authenticated;
grant execute on function public.forum_notif_mark_read(uuid) to authenticated;
grant execute on function public.forum_notif_mark_all_read() to authenticated;
grant execute on function public.forum_post(uuid, text, uuid, uuid[]) to authenticated;
grant execute on function public.forum_topics_list(integer) to authenticated;
grant execute on function public.forum_messages_list(uuid, integer) to authenticated;
grant execute on function public.chat_send(uuid, text, uuid) to authenticated;
grant execute on function public.chat_history(uuid, integer) to authenticated;
grant execute on function public.member_report(uuid, text, text, uuid, text, uuid, uuid) to authenticated;
-- chat_send_core and account_check are deliberately NOT granted to
-- authenticated - they are only ever called from inside another
-- security definer function (chat_send, chat_send_as, forum_post,
-- forum_topic_create below), which runs with the function owner's
-- rights and does not need its own grant on what it calls internally.


-- ---------------------------------------------------------------------
-- 2. CRITICAL - suspended/banned members could post again
--
-- The original chat_send (20260806030000_admin.sql:649) called
-- account_check(auth.uid()) before sending - the one thing standing
-- between a ban and a banned member still messaging people. Rewriting
-- chat_send to add reply_to (20260820090000_forum_reply_follow_report.sql)
-- rebuilt the function from the pre-ban-enforcement version and the call
-- was never carried over. forum_post and forum_topic_create never had it
-- at all - the Forum was built without noticing phrase_submissions was
-- the one write path in the app that already enforced this
-- (account_active() in its own insert policy).
--
-- account_check() raises a clear exception ("This account is banned" /
-- "suspended until ...") rather than a bare RLS-violation error, which is
-- why it is used here instead of the boolean account_active().
--
-- Rollback: remove the `perform public.account_check(me);` /
-- `perform public.account_check(auth.uid());` line from each function
-- body below and re-run - or restore from the previous migration file,
-- since every other line is unchanged from what is already live.
-- ---------------------------------------------------------------------

create or replace function public.chat_send(target uuid, body text, reply_to uuid default null)
returns table (id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare cfg public.mod_settings;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform public.account_check(auth.uid());
  select s.* into cfg from public.mod_settings s where s.id;
  if cfg.require_ai and auth.role() <> 'service_role' then
    raise exception 'Chat is routed through moderation right now - try again shortly';
  end if;
  return query select * from public.chat_send_core(auth.uid(), target, body, reply_to);
end;
$$;

create or replace function public.forum_topic_create(title text, description text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg   public.mod_settings;
  chk   record;
  me    uuid := auth.uid();
  n     integer;
  clean_title text;
  clean_desc  text;
  tid   uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  perform public.account_check(me);
  select s.* into cfg from public.mod_settings s where s.id;

  clean_title := btrim(regexp_replace(coalesce(title, ''), '[^\S\r\n]+', ' ', 'g'));
  if length(clean_title) = 0 then raise exception 'A topic needs a title'; end if;
  if length(clean_title) > 120 then raise exception 'Title is too long — 120 characters at most'; end if;

  clean_desc := nullif(btrim(regexp_replace(coalesce(description, ''), '[^\S\r\n]+', ' ', 'g')), '');
  if clean_desc is not null and length(clean_desc) > 500 then
    raise exception 'Description is too long — 500 characters at most';
  end if;

  select count(*) into n from public.forum_topics ft
   where ft.created_by = me and ft.created_at > now() - interval '10 minutes';
  if n >= 5 then
    raise exception 'Slow down a moment — too many topics';
  end if;

  select * into chk from public.mod_check(clean_title);
  if not chk.ok then
    insert into public.moderation_events (user_id, category, reason, action, length)
      values (me, chk.category, chk.note, 'rejected', length(clean_title));
    raise exception 'Topic not created — %', coalesce(chk.note, 'the title broke a chat rule');
  end if;

  if clean_desc is not null then
    select * into chk from public.mod_check(clean_desc);
    if not chk.ok then
      insert into public.moderation_events (user_id, category, reason, action, length)
        values (me, chk.category, chk.note, 'rejected', length(clean_desc));
      raise exception 'Topic not created — %', coalesce(chk.note, 'the description broke a chat rule');
    end if;
  end if;

  insert into public.forum_topics (title, description, created_by)
  values (clean_title, clean_desc, me)
  returning id into tid;

  return tid;
end;
$$;

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

revoke all on function public.forum_topic_create(text, text) from public, anon, authenticated;
grant execute on function public.forum_topic_create(text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 3. HIGH - forum_notifications' UPDATE grant covered every column
--
-- The RLS policy already restricts *which rows* (own row only, and
-- WITH CHECK stops recipient_id being reassigned to someone else - this
-- was never a cross-user issue). What was missing is restricting *which
-- columns*: a member could rewrite actor_id/topic_id/message_id/kind on
-- their own notification, not just mark it read. The older, identical
-- feature (phrase_reaction_notifications, 20260820040000) already got
-- this right with a column-scoped grant; this brings forum_notifications
-- in line with it.
--
-- Rollback: `grant update on public.forum_notifications to authenticated;`
-- restores the previous (over-broad) grant.
-- ---------------------------------------------------------------------

revoke update on public.forum_notifications from authenticated;
grant update (read) on public.forum_notifications to authenticated;


-- ---------------------------------------------------------------------
-- 4. CRITICAL (functional, fails closed) - forum_notifications toggle
--    could not actually be saved
--
-- profiles' UPDATE grant is column-scoped (20260806050000_public_profile.sql),
-- and forum_notifications (added later, 20260820080000_forum_extras.sql)
-- was never added to that list. Every call to
-- `profiles.update({forum_notifications: ...})` has been failing with a
-- permission error since the column was created - the toggle in Account
-- has never actually been able to save a change. This adds it to the
-- same grant, nothing else changes.
--
-- Rollback: `revoke update (forum_notifications) on public.profiles from authenticated;`
-- ---------------------------------------------------------------------

grant update (forum_notifications) on public.profiles to authenticated;


-- ---------------------------------------------------------------------
-- 5. LOW - "unsend" (delete your own message) has never worked
--
-- messages_delete_own (20260806010000_chat.sql:557) has existed since
-- chat shipped, restricted correctly to the sender's own row - but no
-- DELETE grant was ever issued alongside it, so every delete attempt
-- fails at the grant check before RLS is even consulted. Not a security
-- issue (fails closed), but it is a real, long-standing gap between what
-- the schema clearly intends and what a member can actually do, found
-- while auditing this table. Fixing it here since it is a one-line,
-- zero-regression-risk change in the same family of issues.
--
-- Rollback: `revoke delete on public.messages from authenticated;`
-- ---------------------------------------------------------------------

grant delete on public.messages to authenticated;
