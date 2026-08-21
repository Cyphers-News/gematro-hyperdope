-- =====================================================================
-- Forum extras: online status, message reactions, unread tracking,
-- new-topic notifications, @here mentions
--
-- Five features, one migration, because they share infrastructure:
-- forum_topic_reads (below) backs both the [NEW] indicator and "who is
-- following this topic" for @here, and forum_notifications backs both
-- new-topic and @here mentions through one inbox rather than two.
--
-- Depends on 20260820060000_forum.sql (forum_topics/forum_messages/
-- forum_post/forum_topics_list/forum_messages_list already exist) and on
-- is_blocked/mod_settings/mod_check from the chat migrations. Safe to
-- re-run.
-- =====================================================================

-- ---- 1. online status in the message list --------------------------------
--
-- forum_messages_list joined public_profiles, which carries no presence
-- data at all - member_cards does (last_active_at, already gated by
-- show_last_active/show_online at the view level, same as friend_list and
-- every other place presence is read). Switching the join is the reuse of
-- an existing pattern, not a new one. Dropped and recreated: adding a
-- column to RETURNS TABLE needs it, same as every other such change here.

drop function if exists public.forum_messages_list(uuid, integer);

create or replace function public.forum_messages_list(topic_id uuid, lim integer default 200)
returns table (
  id uuid, user_id uuid, sender_name text, sender_avatar text,
  body text, created_at timestamptz, mine boolean, sender_online boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.user_id,
         mc.display_name, mc.avatar,
         m.body, m.created_at, (m.user_id = auth.uid()),
         (mc.show_online and mc.last_active_at is not null
            and mc.last_active_at > now() - interval '5 minutes')
  from public.forum_messages m
  left join public.member_cards mc on mc.id = m.user_id
  where m.topic_id = forum_messages_list.topic_id
  order by m.created_at asc
  limit least(coalesce(lim, 200), 500);
$$;

revoke all on function public.forum_messages_list(uuid, integer) from anon, authenticated;
grant execute on function public.forum_messages_list(uuid, integer) to authenticated;

-- ---- 2. per-message emoji reactions ---------------------------------------
--
-- Same four reactions as phrase_reactions (heart/like/laugh/ccru), same
-- self-row-only shape - but select/insert/delete only, no update: a
-- reaction is either there or it isn't, there is nothing to edit in place.

create table if not exists public.forum_message_reactions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.forum_messages (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  reaction    text not null,
  created_at  timestamptz not null default now(),
  constraint forum_message_reactions_kind check (reaction in ('heart', 'like', 'laugh', 'ccru'))
);

create unique index if not exists forum_message_reactions_key
  on public.forum_message_reactions (message_id, user_id, reaction);
create index if not exists forum_message_reactions_message_idx
  on public.forum_message_reactions (message_id);

alter table public.forum_message_reactions enable row level security;

drop policy if exists "forum_msg_react_select_all" on public.forum_message_reactions;
create policy "forum_msg_react_select_all"
  on public.forum_message_reactions for select
  to authenticated
  using ( true );

drop policy if exists "forum_msg_react_insert_own" on public.forum_message_reactions;
create policy "forum_msg_react_insert_own"
  on public.forum_message_reactions for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "forum_msg_react_delete_own" on public.forum_message_reactions;
create policy "forum_msg_react_delete_own"
  on public.forum_message_reactions for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

revoke all on public.forum_message_reactions from anon, authenticated;
grant select, insert, delete on public.forum_message_reactions to authenticated;

-- One row per (message, reaction) with its count and whether the caller is
-- one of the reactors - the client folds this into the exact same
-- {heart,like,laugh,ccru,mine:{...}} shape phraseReactionCounts already
-- returns per phrase, so the whole reaction-button component
-- (profileChipReactionsHtml et al, calc/profile-tab.js) works unmodified
-- on forum messages too.
create or replace function public.forum_message_reaction_counts(ids uuid[])
returns table (message_id uuid, reaction text, cnt integer, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select r.message_id, r.reaction, count(*)::int, bool_or(r.user_id = auth.uid())
  from public.forum_message_reactions r
  where r.message_id = any(ids)
  group by r.message_id, r.reaction;
$$;

revoke all on function public.forum_message_reaction_counts(uuid[]) from anon, authenticated;
grant execute on function public.forum_message_reaction_counts(uuid[]) to authenticated;

-- ---- 3. per-member read tracking, and the [NEW] count ---------------------
--
-- Pure personal data, no business logic - same self-row-RLS/direct-grant
-- shape as member_tour_progress and presets, not the function-only-write
-- pattern the tables above use. Also doubles as "is this member following
-- this topic" for @here (below): opening a topic marks it read, which is
-- exactly the signal "I am paying attention to this one" needs.

create table if not exists public.forum_topic_reads (
  user_id       uuid not null references auth.users (id) on delete cascade,
  topic_id      uuid not null references public.forum_topics (id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.forum_topic_reads enable row level security;

drop policy if exists "forum_topic_reads_select_own" on public.forum_topic_reads;
create policy "forum_topic_reads_select_own"
  on public.forum_topic_reads for select
  to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "forum_topic_reads_insert_own" on public.forum_topic_reads;
create policy "forum_topic_reads_insert_own"
  on public.forum_topic_reads for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "forum_topic_reads_update_own" on public.forum_topic_reads;
create policy "forum_topic_reads_update_own"
  on public.forum_topic_reads for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

revoke all on public.forum_topic_reads from anon, authenticated;
grant select, insert, update on public.forum_topic_reads to authenticated;

-- forum_topics_list, extended with the viewer's own unread count - a
-- message the viewer wrote themselves never counts as unread to them (see
-- the fm.user_id <> auth.uid() below), and a topic never opened reads as
-- "everything so far is unread" (the coalesce to -infinity). Also now
-- returns creator_avatar (the topic feed redesign puts a picture/initial on
-- every row) and following (has the viewer ever opened this topic, or ever
-- posted in it - the same "is following" definition forum_post's @here
-- handling already uses, exposed here for the feed's own Following filter).

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
         exists (select 1 from public.forum_topic_reads tr
                  where tr.user_id = auth.uid() and tr.topic_id = t.id)
         or exists (select 1 from public.forum_messages fm
                     where fm.topic_id = t.id and fm.user_id = auth.uid())
  from public.forum_topics t
  left join public.profiles p on p.id = t.created_by
  order by t.last_message_at desc
  limit least(coalesce(lim, 50), 100);
$$;

revoke all on function public.forum_topics_list(integer) from anon, authenticated;
grant execute on function public.forum_topics_list(integer) to authenticated;

-- The Forum header's small activity line ("1 active topic · 3 replies
-- today") - two cheap aggregate counts, not derived client-side from
-- forum_topics_list's own (paginated, at most 100 rows) result, so the
-- numbers stay right regardless of how many topics exist.
create or replace function public.forum_activity_stats()
returns table (active_topics integer, replies_today integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.forum_topics
      where last_message_at > now() - interval '24 hours'),
    (select count(*)::int from public.forum_messages
      where created_at >= date_trunc('day', now()));
$$;

revoke all on function public.forum_activity_stats() from anon, authenticated;
grant execute on function public.forum_activity_stats() to authenticated;

-- ---- 4. the forum notification setting ------------------------------------

alter table public.profiles add column if not exists forum_notifications boolean not null default true;

comment on column public.profiles.forum_notifications is
  'Global new-topic notifications, on by default. Off does not affect @here mentions - see forum_post below - those are the member choosing to follow one specific topic, not a global broadcast.';

-- ---- 5. one inbox for both new-topic and @here notifications --------------
--
-- A dedicated table rather than reusing phrase_reaction_notifications: the
-- foreign keys are completely different shapes (topic/message, not a
-- submission), and a reaction type check constraint that only makes sense
-- for phrases has no equivalent here. "One notification system" (the ask)
-- means one inbox and one unread count on the client - frRenderNews merges
-- rows from both tables - not one shared table forcing an unrelated schema
-- on both features.

create table if not exists public.forum_notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references auth.users (id) on delete cascade,
  actor_id      uuid not null references auth.users (id) on delete cascade,
  topic_id      uuid not null references public.forum_topics (id) on delete cascade,
  message_id    uuid references public.forum_messages (id) on delete cascade,
  kind          text not null,
  read          boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint forum_notifications_kind check (kind in ('new_topic', 'mention')),
  constraint forum_notifications_not_self check (recipient_id <> actor_id)
);

-- Partial unique indexes rather than one over all four columns: message_id
-- is null for 'new_topic' rows, and NULL <> NULL in a unique index, so a
-- plain composite index would never actually catch a duplicate new_topic
-- row. Each kind gets the key that actually identifies "already notified".
create unique index if not exists forum_notif_new_topic_key
  on public.forum_notifications (recipient_id, topic_id) where kind = 'new_topic';
create unique index if not exists forum_notif_mention_key
  on public.forum_notifications (recipient_id, message_id) where kind = 'mention';
create index if not exists forum_notif_recipient_idx
  on public.forum_notifications (recipient_id, read, created_at desc);

alter table public.forum_notifications enable row level security;

drop policy if exists "forum_notif_select_own" on public.forum_notifications;
create policy "forum_notif_select_own"
  on public.forum_notifications for select
  to authenticated
  using ( (select auth.uid()) = recipient_id );

drop policy if exists "forum_notif_update_own_read" on public.forum_notifications;
create policy "forum_notif_update_own_read"
  on public.forum_notifications for update
  to authenticated
  using ( (select auth.uid()) = recipient_id )
  with check ( (select auth.uid()) = recipient_id );

-- no insert/delete grant - written only by forum_topic_notify() (trigger)
-- and forum_post() (below), both security definer
revoke all on public.forum_notifications from anon, authenticated;
grant select, update on public.forum_notifications to authenticated;

create or replace function public.forum_notif_unread_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.forum_notifications
  where recipient_id = auth.uid() and not read;
$$;

create or replace function public.forum_notifications_list(lim integer default 30)
returns table (
  id uuid, actor_id uuid, actor_name text,
  topic_id uuid, topic_title text, message_id uuid,
  kind text, read boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.actor_id, coalesce(p.username, p.discord_username, 'Member'),
         n.topic_id, t.title, n.message_id, n.kind, n.read, n.created_at
  from public.forum_notifications n
  left join public.profiles p on p.id = n.actor_id
  left join public.forum_topics t on t.id = n.topic_id
  where n.recipient_id = auth.uid()
  order by n.created_at desc
  limit least(coalesce(lim, 30), 100);
$$;

create or replace function public.forum_notif_mark_read(target uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.forum_notifications set read = true
  where id = target and recipient_id = auth.uid();
  select true;
$$;

create or replace function public.forum_notif_mark_all_read()
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.forum_notifications set read = true
  where recipient_id = auth.uid() and not read;
  select true;
$$;

revoke all on function public.forum_notif_unread_count() from anon, authenticated;
revoke all on function public.forum_notifications_list(integer) from anon, authenticated;
revoke all on function public.forum_notif_mark_read(uuid) from anon, authenticated;
revoke all on function public.forum_notif_mark_all_read() from anon, authenticated;
grant execute on function public.forum_notif_unread_count() to authenticated;
grant execute on function public.forum_notifications_list(integer) to authenticated;
grant execute on function public.forum_notif_mark_read(uuid) to authenticated;
grant execute on function public.forum_notif_mark_all_read() to authenticated;

-- ---- 6. new-topic notifications, fired from the topic itself --------------
--
-- Set-based insert, not a per-recipient loop: one INSERT ... SELECT covers
-- every eligible member at once. forum_notifications is off by default for
-- nobody (forum_notifications defaults true), so this reaches everyone
-- until a member turns it off themselves.

create or replace function public.forum_topic_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.forum_notifications (recipient_id, actor_id, topic_id, kind)
  select p.id, new.created_by, new.id, 'new_topic'
  from public.profiles p
  where p.id <> new.created_by
    and p.forum_notifications
    and not public.is_blocked(p.id, new.created_by)
  on conflict (recipient_id, topic_id) where kind = 'new_topic' do nothing;
  return new;
end;
$$;

drop trigger if exists forum_topics_notify_trg on public.forum_topics;
create trigger forum_topics_notify_trg
  after insert on public.forum_topics
  for each row execute function public.forum_topic_notify();

-- ---- 7. @here, and the rest of forum_post's own logic ---------------------
--
-- create or replace rather than a separate function: forum_post already
-- exists (20260820060000_forum.sql) and this needs to run everything it did
-- before, plus detect @here and notify, all inside the one transaction that
-- inserts the message - so an @here notification can never fire for a post
-- that itself got rejected a moment later, and vice versa.
--
-- While rewriting it: the duplicate-post check below was comparing
-- fm.created_at (a timestamp) to a bare interval instead of "now() minus
-- that interval" - a latent bug from the original migration that never ran
-- against a live database yet to surface it. Fixed here.

create or replace function public.forum_post(topic_id uuid, body text)
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

  -- a whole "word", so this does not fire on "@herein" or "someone@here.com"
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

  insert into public.forum_messages (topic_id, user_id, body)
  values (forum_post.topic_id, me, clean)
  returning forum_messages.id, forum_messages.created_at into new_id, new_at;

  if has_here then
    -- everyone who has ever posted in the topic, plus everyone who has ever
    -- opened it (forum_topic_reads doubles as "is following") - not every
    -- member on the site, and never the sender
    insert into public.forum_notifications (recipient_id, actor_id, topic_id, message_id, kind)
    select distinct r.uid, me, forum_post.topic_id, new_id, 'mention'
    from (
      select fm.user_id as uid from public.forum_messages fm where fm.topic_id = forum_post.topic_id
      union
      select tr.user_id as uid from public.forum_topic_reads tr where tr.topic_id = forum_post.topic_id
    ) r
    where r.uid <> me
      and not public.is_blocked(r.uid, me)
    on conflict (recipient_id, message_id) where kind = 'mention' do nothing;
  end if;

  return query select new_id, new_at;
end;
$$;

revoke all on function public.forum_post(uuid, text) from anon, authenticated;
grant execute on function public.forum_post(uuid, text) to authenticated;
