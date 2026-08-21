-- =====================================================================
-- Fix: "column reference topic_id is ambiguous" - the real cause
--
-- Found by calling forum_post() directly in SQL (bypassing PostgREST),
-- which reported the exact statement and line:
--
--   QUERY:  insert into public.forum_topic_reads (user_id, topic_id, ...)
--           values (me, forum_post.topic_id, now(), true)
--           on conflict (user_id, topic_id) do update set ...
--   CONTEXT: PL/pgSQL function forum_post(uuid,text,uuid,uuid[]) line 82
--
-- The ambiguous reference is the topic_id in the ON CONFLICT target list,
-- not in the values or a where clause. Every earlier fix in this series
-- qualified the references it could (forum_post.topic_id) and assumed
-- that covered the statement - but an ON CONFLICT conflict-target cannot
-- be qualified: "on conflict (forum_post.topic_id)" is not valid syntax,
-- the target list must be bare column names. So the one place the usual
-- fix does not apply is precisely the place that was still broken.
--
-- This also explains why the error fired on every post rather than only
-- on replies: this statement runs unconditionally, for every post.
--
-- The fix rewrites that single statement as an explicit update-then-
-- insert, which needs no conflict-target column list at all. Semantics
-- are unchanged (set last_read_at = now() and following = true, whether
-- or not a row already exists). The trailing "on conflict do nothing"
-- (no column list, so unambiguous) keeps it safe against a concurrent
-- insert landing between the update and the insert.
--
-- Renaming the topic_id parameter would also have fixed it, but that
-- changes the function's signature, and the client calls this RPC with
-- named parameters (auth/forum.js: {topic_id, body, reply_to, mentions}),
-- so it would have required a coordinated frontend change and deploy to
-- avoid breaking posting a second way. This keeps the signature intact.
--
-- Nothing else in the schema has this problem: the other ON CONFLICT
-- column lists in this function name recipient_id/message_id (not
-- parameter names), and forum_topic_notify's "on conflict (recipient_id,
-- topic_id)" is inside a trigger function that takes no parameters at
-- all, so nothing can collide there.
--
-- Rollback: not meaningful - this only fixes a statement that previously
-- raised an error on every forum post.
--
-- Safe to re-run.
-- =====================================================================

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
  if not exists (select 1 from public.forum_topics ft where ft.id = forum_post.topic_id) then
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

  -- Update-then-insert rather than an upsert: see this migration's header.
  -- An ON CONFLICT target list cannot be schema-qualified, so with a
  -- parameter also named topic_id there is no way to write
  -- "on conflict (user_id, topic_id)" unambiguously here.
  update public.forum_topic_reads tr
     set last_read_at = now(), following = true
   where tr.user_id = me and tr.topic_id = forum_post.topic_id;

  if not found then
    insert into public.forum_topic_reads (user_id, topic_id, last_read_at, following)
    values (me, forum_post.topic_id, now(), true)
    on conflict do nothing;
  end if;

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

notify pgrst, 'reload schema';
