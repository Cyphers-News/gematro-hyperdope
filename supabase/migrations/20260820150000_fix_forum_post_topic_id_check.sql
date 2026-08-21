-- =====================================================================
-- Fix: "column reference topic_id is ambiguous", still happening after
-- 20260820140000's overload cleanup
--
-- Every prior fix in this thread qualified the topic_id references
-- inside forum_post except one, at the very top of the function:
--
--   if not exists (select 1 from public.forum_topics ft where ft.id = topic_id) then
--
-- forum_topics has no column named topic_id (its key is just "id"), so
-- this line was assumed safe on that basis and left alone through every
-- previous version of this function, including the one just confirmed
-- live via direct introspection. Given every other candidate in the
-- function has now been ruled out by that same direct introspection and
-- the error is still happening, that assumption is wrong somewhere -
-- most likely PL/pgSQL's ambiguity check does not only look at the exact
-- table this specific query names, but this is no longer worth
-- theorizing about further. This qualifies the one line that was never
-- qualified, on the same pattern already used everywhere else in this
-- function (forum_post.topic_id), which is unambiguous no matter what
-- the actual mechanism turns out to be.
--
-- Rollback: not meaningful - this only fixes a query that previously
-- raised an error on every post attempt.
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

notify pgrst, 'reload schema';
