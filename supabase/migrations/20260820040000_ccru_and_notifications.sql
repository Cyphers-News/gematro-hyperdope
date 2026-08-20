-- =====================================================================
-- A fourth reaction (CCRU), independent multi-select reactions, and
-- phrase-reaction notifications
--
-- Everything here is additive or widens an existing constraint - nothing in
-- 20260820030000_reaction_leaders_redesign.sql is edited, per instruction,
-- and no existing phrase_reactions or phrase_db_queue row is touched.
--
-- Two real behaviour changes, both requested explicitly:
--
--   1. A member can now hold more than one reaction on the same phrase
--      (Loved AND CCRU at once, say), where before heart/like/laugh were
--      mutually exclusive - reacting with a second type silently replaced
--      the first. The old uniqueness was (submission_id, user_id): one row
--      per member per phrase, whichever reaction it was. The new one is
--      (submission_id, user_id, reaction): one row per member per phrase
--      *per reaction type*. Every existing row already satisfies the new,
--      looser constraint (it trivially also has one reaction per member per
--      phrase for the one reaction it holds), so this widens what is
--      possible without touching what already exists.
--
--   2. Reacting to someone else's published phrase now notifies them.
--
-- Safe to re-run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Add ccru to the reaction set
-- ---------------------------------------------------------------------

alter table public.phrase_reactions drop constraint if exists phrase_reactions_kind;
alter table public.phrase_reactions add constraint phrase_reactions_kind
  check (reaction in ('heart', 'like', 'laugh', 'ccru'));

comment on column public.phrase_reactions.reaction is
  'heart = Loved, like = Trending News, laugh = Funny, ccru = CCRU. Renamed only in the UI - these four values are the whole reaction system.';


-- ---------------------------------------------------------------------
-- 2. Reactions become independent, not mutually exclusive
--
-- (submission_id, user_id) forced one reaction per member per phrase, so
-- setting a second type replaced the first via upsert. Widened to
-- (submission_id, user_id, reaction): a member may now hold any subset of
-- the four at once on the same phrase, each toggled on its own.
-- ---------------------------------------------------------------------

drop index if exists public.phrase_reactions_submission_user_key;
create unique index if not exists phrase_reactions_submission_user_reaction_key
  on public.phrase_reactions (submission_id, user_id, reaction);

-- Ranking a category (Trending News, Most Loved, ...) filters by reaction and
-- orders by recency or count - this is the index that query actually wants,
-- where the existing submission_idx/user_idx only ever helped a lookup by
-- phrase or by member.
create index if not exists phrase_reactions_reaction_created_idx
  on public.phrase_reactions (reaction, created_at desc);


-- ---------------------------------------------------------------------
-- 3. Batch counts, extended for ccru and for independent "did I react"
--    per type
--
-- my_reaction (a single text) could only ever say one thing at a time,
-- which stopped being true the moment reactions became independent - four
-- booleans, one per type, replace it.
-- ---------------------------------------------------------------------

drop function if exists public.phrase_reaction_counts(uuid[]);

create or replace function public.phrase_reaction_counts(target_ids uuid[])
returns table (
  submission_id uuid,
  heart_count integer, like_count integer, laugh_count integer, ccru_count integer,
  heart_mine boolean, like_mine boolean, laugh_mine boolean, ccru_mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select r.submission_id,
         count(*) filter (where r.reaction = 'heart')::int,
         count(*) filter (where r.reaction = 'like')::int,
         count(*) filter (where r.reaction = 'laugh')::int,
         count(*) filter (where r.reaction = 'ccru')::int,
         bool_or(r.reaction = 'heart' and r.user_id = auth.uid()),
         bool_or(r.reaction = 'like'  and r.user_id = auth.uid()),
         bool_or(r.reaction = 'laugh' and r.user_id = auth.uid()),
         bool_or(r.reaction = 'ccru'  and r.user_id = auth.uid())
  from public.phrase_reactions r
  where r.submission_id = any(target_ids)
  group by r.submission_id;
$$;

revoke all on function public.phrase_reaction_counts(uuid[]) from anon, authenticated, public;
grant execute on function public.phrase_reaction_counts(uuid[]) to authenticated;


-- ---------------------------------------------------------------------
-- 4. Phrase-reaction notifications
--
-- One row per (recipient, actor, phrase, reaction) - reacting again after
-- removing the same reaction resurfaces the same row as unread rather than
-- creating a second one, and toggling off never inserts anything at all
-- (the trigger below is AFTER INSERT only, never AFTER DELETE).
-- ---------------------------------------------------------------------

create table if not exists public.phrase_reaction_notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references auth.users (id) on delete cascade,
  actor_id      uuid not null references auth.users (id) on delete cascade,
  submission_id uuid not null references public.phrase_submissions (id) on delete cascade,
  reaction      text not null,
  read          boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint phrase_reaction_notifications_kind check (reaction in ('heart', 'like', 'laugh', 'ccru')),
  constraint phrase_reaction_notifications_not_self check (recipient_id <> actor_id)
);

comment on table public.phrase_reaction_notifications is
  'One row per (recipient, actor, phrase, reaction) - written only by phrase_reactions_notify() below, never directly by a client. Re-reacting after removing the same reaction updates this row back to unread rather than inserting a second one.';

create unique index if not exists phrase_reaction_notif_key
  on public.phrase_reaction_notifications (recipient_id, actor_id, submission_id, reaction);
create index if not exists phrase_reaction_notif_recipient_idx
  on public.phrase_reaction_notifications (recipient_id, read, created_at desc);

alter table public.phrase_reaction_notifications enable row level security;

drop policy if exists "phrase_notif_select_own" on public.phrase_reaction_notifications;
create policy "phrase_notif_select_own"
  on public.phrase_reaction_notifications for select
  to authenticated
  using ( (select auth.uid()) = recipient_id );

-- read is the only thing a recipient may change, and only their own row -
-- column-level grant below is what actually restricts it to that one column
drop policy if exists "phrase_notif_update_own" on public.phrase_reaction_notifications;
create policy "phrase_notif_update_own"
  on public.phrase_reaction_notifications for update
  to authenticated
  using ( (select auth.uid()) = recipient_id )
  with check ( (select auth.uid()) = recipient_id );

revoke all on public.phrase_reaction_notifications from anon, authenticated, public;
grant select on public.phrase_reaction_notifications to authenticated;
grant update (read) on public.phrase_reaction_notifications to authenticated;
-- no insert/delete grant at all: only phrase_reactions_notify() (security
-- definer, below) ever creates a row, and nothing ever deletes one

-- Fires once per new reaction row (never on delete, i.e. never on unreact).
-- Silently does nothing when the phrase's owner reacted to their own work -
-- the unique key's own check constraint would refuse that insert anyway,
-- but checking first avoids raising past a legitimate self-reaction.
create or replace function public.phrase_reactions_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare owner uuid;
begin
  select s.user_id into owner from public.phrase_submissions s where s.id = new.submission_id;
  if owner is null or owner = new.user_id then
    return new;
  end if;

  insert into public.phrase_reaction_notifications (recipient_id, actor_id, submission_id, reaction)
  values (owner, new.user_id, new.submission_id, new.reaction)
  on conflict (recipient_id, actor_id, submission_id, reaction)
  do update set read = false, created_at = now();

  return new;
end;
$$;

drop trigger if exists phrase_reactions_notify_trg on public.phrase_reactions;
create trigger phrase_reactions_notify_trg
  after insert on public.phrase_reactions
  for each row execute function public.phrase_reactions_notify();

revoke all on function public.phrase_reactions_notify() from anon, authenticated, public;

-- ---- reading and clearing your own notifications -----------------------

create or replace function public.phrase_notif_unread_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.phrase_reaction_notifications n
  where n.recipient_id = auth.uid() and not n.read;
$$;

revoke all on function public.phrase_notif_unread_count() from anon, authenticated, public;
grant execute on function public.phrase_notif_unread_count() to authenticated;

create or replace function public.phrase_notifications_list(lim integer default 30)
returns table (
  id uuid, actor_id uuid, actor_name text,
  submission_id uuid, phrase text, cipher text, value integer, reaction text,
  read boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.actor_id,
         coalesce(p.username, p.discord_username, 'Member'),
         n.submission_id, s.phrase, s.cipher, s.value, n.reaction,
         n.read, n.created_at
  from public.phrase_reaction_notifications n
  join public.phrase_submissions s on s.id = n.submission_id
  left join public.profiles p on p.id = n.actor_id
  where n.recipient_id = auth.uid()
  order by n.read asc, n.created_at desc
  limit least(coalesce(lim, 30), 100);
$$;

revoke all on function public.phrase_notifications_list(integer) from anon, authenticated, public;
grant execute on function public.phrase_notifications_list(integer) to authenticated;

-- Marks one notification read - the id itself is the authorization check
-- (the update only ever touches the caller's own row, per the RLS policy
-- above), so opening someone else's id by guessing simply matches nothing.
create or replace function public.phrase_notif_mark_read(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.phrase_reaction_notifications
     set read = true
   where id = target and recipient_id = auth.uid();
$$;

revoke all on function public.phrase_notif_mark_read(uuid) from anon, authenticated, public;
grant execute on function public.phrase_notif_mark_read(uuid) to authenticated;

create or replace function public.phrase_notif_mark_all_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.phrase_reaction_notifications
     set read = true
   where recipient_id = auth.uid() and not read;
$$;

revoke all on function public.phrase_notif_mark_all_read() from anon, authenticated, public;
grant execute on function public.phrase_notif_mark_all_read() to authenticated;


-- ---------------------------------------------------------------------
-- 5. admin_phrase_queue and trending_phrases, extended for ccru
--
-- Dropped and recreated (both add ccru_count to the return shape).
-- ---------------------------------------------------------------------

drop function if exists public.admin_phrase_queue(text, text, integer);

create or replace function public.admin_phrase_queue(
  status_filter text default 'pending',
  sort text default 'recent',
  lim integer default 100
)
returns table (
  id uuid, submission_id uuid, status text,
  phrase text, cipher text, value integer,
  user_id uuid, contributor_name text,
  heart_count integer, like_count integer, laugh_count integer, ccru_count integer, total_count integer,
  first_reaction_at timestamptz, last_reaction_at timestamptz,
  final_text text,
  reviewed_by_name text, reviewed_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with counts as (
    select r.submission_id,
           count(*) filter (where r.reaction = 'heart')::int as heart_n,
           count(*) filter (where r.reaction = 'like')::int  as like_n,
           count(*) filter (where r.reaction = 'laugh')::int as laugh_n,
           count(*) filter (where r.reaction = 'ccru')::int  as ccru_n,
           count(*)::int                                     as total_n,
           min(r.created_at)                                 as first_at,
           max(r.created_at)                                 as last_at
    from public.phrase_reactions r
    group by r.submission_id
  )
  select q.id, q.submission_id, q.status,
         s.phrase, s.cipher, s.value, s.user_id,
         (select coalesce(pr.username, pr.discord_username, 'Member')
            from public.profiles pr where pr.id = s.user_id),
         coalesce(c.heart_n, 0), coalesce(c.like_n, 0), coalesce(c.laugh_n, 0), coalesce(c.ccru_n, 0), coalesce(c.total_n, 0),
         coalesce(c.first_at, q.created_at),
         coalesce(c.last_at, q.created_at),
         q.final_text,
         (select coalesce(pv.username, pv.discord_username) from public.profiles pv where pv.id = q.reviewed_by),
         q.reviewed_at, q.created_at
  from public.phrase_db_queue q
  join public.phrase_submissions s on s.id = q.submission_id
  left join counts c on c.submission_id = s.id
  where public.admin_require() is not null
    and (status_filter is null or status_filter = 'all' or q.status = status_filter)
  order by
    (case when sort = 'total'     then coalesce(c.total_n, 0) end) desc,
    (case when sort = 'evergreen' then coalesce(c.heart_n, 0) end) desc,
    (case when sort = 'trending'  then coalesce(c.like_n, 0)  end) desc,
    (case when sort = 'funny'     then coalesce(c.laugh_n, 0) end) desc,
    (case when sort = 'ccru'      then coalesce(c.ccru_n, 0)  end) desc,
    coalesce(c.last_at, q.created_at) desc
  limit least(coalesce(lim, 100), 300);
$$;

revoke all on function public.admin_phrase_queue(text, text, integer) from anon, authenticated, public;
grant execute on function public.admin_phrase_queue(text, text, integer) to authenticated;

drop function if exists public.trending_phrases(integer);

create or replace function public.trending_phrases(lim integer default 30)
returns table (
  submission_id uuid, phrase text, cipher text, value integer,
  user_id uuid, contributor_name text, contributor_avatar text,
  heart_count integer, like_count integer, laugh_count integer, ccru_count integer, total_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.phrase, s.cipher, s.value, s.user_id,
         pp.display_name, pp.avatar,
         coalesce(c.heart_n, 0)::int,
         coalesce(c.like_n, 0)::int,
         coalesce(c.laugh_n, 0)::int,
         coalesce(c.ccru_n, 0)::int,
         (coalesce(c.heart_n, 0) + coalesce(c.like_n, 0) + coalesce(c.laugh_n, 0) + coalesce(c.ccru_n, 0))::int
  from public.phrase_submissions s
  join public.public_profiles pp on pp.id = s.user_id
  join (
    select submission_id,
           count(*) filter (where reaction = 'heart') as heart_n,
           count(*) filter (where reaction = 'like')  as like_n,
           count(*) filter (where reaction = 'laugh') as laugh_n,
           count(*) filter (where reaction = 'ccru')  as ccru_n
    from public.phrase_reactions
    group by submission_id
  ) c on c.submission_id = s.id
  order by (coalesce(c.heart_n, 0) + coalesce(c.like_n, 0) + coalesce(c.laugh_n, 0) + coalesce(c.ccru_n, 0)) desc,
           s.created_at desc
  limit least(coalesce(lim, 30), 100);
$$;

revoke all on function public.trending_phrases(integer) from anon, authenticated, public;
grant execute on function public.trending_phrases(integer) to authenticated;

-- phrases_by_reaction (20260820030000) takes reaction_type as a plain text
-- parameter and was never hardcoded to heart/like/laugh - 'ccru' works
-- against it unchanged, no drop/recreate needed.


-- ---------------------------------------------------------------------
-- 6. Same PUBLIC-execute hardening as 20260820020000, for the functions
--    this migration adds
-- ---------------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'phrase_reaction_counts', 'phrase_reactions_notify',
        'phrase_notif_unread_count', 'phrase_notifications_list',
        'phrase_notif_mark_read', 'phrase_notif_mark_all_read',
        'admin_phrase_queue', 'trending_phrases'
      )
  loop
    execute format('revoke execute on function %s from public', r.sig);
  end loop;
end $$;
