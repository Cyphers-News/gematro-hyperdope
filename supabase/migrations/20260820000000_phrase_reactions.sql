-- =====================================================================
-- Phrase reactions: heart / like / laugh, a review queue for db.txt, and
-- the two badges (member_profile) and stats (admin_stats) they feed.
--
-- db.txt is a static file shipped with the site, not a table - nothing here
-- writes to it, and nothing here can. What this adds is a way to notice
-- which published phrases people actually liked, and a queue an
-- administrator reviews by hand before ever touching that file themselves.
-- The "add automatically" idea was deliberately not built: an automated
-- acronym/capitalisation guess is exactly the kind of thing that is right
-- 95% of the time and silently wrong the other 5%, which is a bad trade for
-- a file every visitor's browser parses on every page load. A human looks at
-- each one first.
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Reactions
--
-- One reaction per member per phrase - heart, like or laugh. Changing your
-- mind replaces the row (the client upserts on the same unique key) rather
-- than piling up a second one, so "how many people reacted" and "how many
-- reactions" are always the same number.
-- ---------------------------------------------------------------------

create table if not exists public.phrase_reactions (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.phrase_submissions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  reaction      text not null,
  created_at    timestamptz not null default now(),
  constraint phrase_reactions_kind check (reaction in ('heart', 'like', 'laugh'))
);

comment on table public.phrase_reactions is
  'One reaction per member per phrase. A trigger below enqueues the phrase for db.txt review the first time it gets one.';

create unique index if not exists phrase_reactions_submission_user_key
  on public.phrase_reactions (submission_id, user_id);
create index if not exists phrase_reactions_submission_idx
  on public.phrase_reactions (submission_id);
create index if not exists phrase_reactions_user_idx
  on public.phrase_reactions (user_id);

alter table public.phrase_reactions enable row level security;

drop policy if exists "reactions_select_all" on public.phrase_reactions;
create policy "reactions_select_all"
  on public.phrase_reactions for select
  to authenticated
  using ( true );

-- one policy for insert/update/delete: you may only ever touch your own
-- reaction, same shape as phrase_submissions' own-row policies
drop policy if exists "reactions_write_own" on public.phrase_reactions;
create policy "reactions_write_own"
  on public.phrase_reactions for all
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

revoke all on public.phrase_reactions from anon, authenticated;
grant select, insert, update, delete on public.phrase_reactions to authenticated;

-- Batch counts for a list of phrases at once - the Leaders tab opens a
-- contributor's whole published list (up to 2000 phrases) in one go, and a
-- request per phrase there would be a request storm. Only returns rows for
-- phrases that have at least one reaction; the client treats a missing id as
-- all-zero.
create or replace function public.phrase_reaction_counts(target_ids uuid[])
returns table (
  submission_id uuid,
  heart_count integer,
  like_count integer,
  laugh_count integer,
  my_reaction text
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
         max(r.reaction) filter (where r.user_id = auth.uid())
  from public.phrase_reactions r
  where r.submission_id = any(target_ids)
  group by r.submission_id;
$$;

revoke all on function public.phrase_reaction_counts(uuid[]) from anon, authenticated;
grant execute on function public.phrase_reaction_counts(uuid[]) to authenticated;


-- ---------------------------------------------------------------------
-- 2. member_profile, extended
--
-- Adds reactions_received (summed across every phrase they have published)
-- and top_phrase_reactions (their single best phrase), so the two new
-- badges below and the profile's own stat row have something to read.
-- Dropped and recreated, same reason as the last time this table shape
-- changed: RETURNS TABLE cannot be altered with create or replace.
-- ---------------------------------------------------------------------

drop function if exists public.member_profile(uuid);

create or replace function public.member_profile(target uuid)
returns table (
  id uuid, display_name text, username text, avatar text,
  joined_at timestamptz, last_active_at timestamptz,
  state text, mutuals integer,
  submissions integer, rank integer, ciphers_used integer,
  roles text[], fav_ciphers text[], friends integer, is_admin boolean,
  reactions_received integer, top_phrase_reactions integer
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select s.user_id, count(*)::int as n,
           rank() over (order by count(*) desc)::int as rnk
    from public.phrase_submissions s
    group by s.user_id
  ),
  phrase_counts as (
    select submission_id, count(*)::int as n
    from public.phrase_reactions
    group by submission_id
  ),
  react as (
    select s.user_id,
           coalesce(sum(pc.n), 0)::int as total,
           coalesce(max(pc.n), 0)::int as top
    from public.phrase_submissions s
    left join phrase_counts pc on pc.submission_id = s.id
    group by s.user_id
  )
  select m.id, m.display_name, m.username, m.avatar, m.joined_at,
         case when m.show_online then m.last_active_at end,
         public.friend_state(auth.uid(), m.id),
         case when m.show_mutuals then public.friend_mutual_count(auth.uid(), m.id) else 0 end,
         coalesce(r.n, 0),
         r.rnk,
         (select count(distinct s2.cipher)::int
            from public.phrase_submissions s2
           where s2.user_id = m.id and s2.cipher is not null),
         m.roles,
         m.fav_ciphers,
         case when m.show_friend_count then (
           select count(*)::int from public.friendships f
            where f.status = 'accepted' and m.id in (f.user_a, f.user_b)
         ) else null end,
         coalesce((select p2.is_admin from public.profiles p2 where p2.id = m.id), false),
         coalesce(react.total, 0),
         coalesce(react.top, 0)
  from public.member_cards m
  left join ranked r on r.user_id = m.id
  left join react on react.user_id = m.id
  where m.id = target
    and (m.public_profile or m.id = auth.uid());
$$;

revoke all on function public.member_profile(uuid) from anon, authenticated;
grant execute on function public.member_profile(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 3. The review queue
--
-- One row per phrase that has ever earned a reaction. Status starts pending
-- and only an administrator moves it - approved (worth adding), rejected
-- (not going in), or exported (approved and already copied out to db.txt by
-- hand). No RLS policies at all: every access goes through admin_* functions
-- below, each of which calls admin_require() first - same pattern as
-- reports and every other admin-only table in this schema.
-- ---------------------------------------------------------------------

create table if not exists public.phrase_db_queue (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.phrase_submissions (id) on delete cascade,
  status        text not null default 'pending',
  final_text    text,
  reviewed_by   uuid references auth.users (id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  constraint phrase_db_queue_status_check check (status in ('pending', 'approved', 'rejected', 'exported'))
);

comment on table public.phrase_db_queue is
  'Phrases that earned at least one reaction, waiting for an administrator to decide whether they belong in db.txt. The suggested capitalisation is computed client-side (calc/database.js) and only ever saved here once an admin accepts it.';

create unique index if not exists phrase_db_queue_submission_key
  on public.phrase_db_queue (submission_id);
create index if not exists phrase_db_queue_status_idx
  on public.phrase_db_queue (status, created_at desc);

alter table public.phrase_db_queue enable row level security;
revoke all on public.phrase_db_queue from anon, authenticated;

-- Enqueues a phrase the moment it earns its first reaction. on conflict does
-- nothing, so a second, third, fiftieth reaction on the same phrase - or one
-- from a different member after the first reactor changes their mind - never
-- creates a duplicate entry or resets a decision an admin already made.
create or replace function public.phrase_reactions_enqueue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.phrase_db_queue (submission_id)
  values (new.submission_id)
  on conflict (submission_id) do nothing;
  return new;
end;
$$;

drop trigger if exists phrase_reactions_enqueue_trg on public.phrase_reactions;
create trigger phrase_reactions_enqueue_trg
  after insert on public.phrase_reactions
  for each row execute function public.phrase_reactions_enqueue();

create or replace function public.admin_phrase_queue(status_filter text default 'pending', lim integer default 100)
returns table (
  id uuid, submission_id uuid, status text,
  phrase text, cipher text, value integer,
  user_id uuid, contributor_name text,
  heart_count integer, like_count integer, laugh_count integer,
  final_text text,
  reviewed_by_name text, reviewed_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.submission_id, q.status,
         s.phrase, s.cipher, s.value, s.user_id,
         (select coalesce(pr.username, pr.discord_username, 'Member')
            from public.profiles pr where pr.id = s.user_id),
         coalesce((select count(*)::int from public.phrase_reactions r
                    where r.submission_id = s.id and r.reaction = 'heart'), 0),
         coalesce((select count(*)::int from public.phrase_reactions r
                    where r.submission_id = s.id and r.reaction = 'like'), 0),
         coalesce((select count(*)::int from public.phrase_reactions r
                    where r.submission_id = s.id and r.reaction = 'laugh'), 0),
         q.final_text,
         (select coalesce(pv.username, pv.discord_username) from public.profiles pv where pv.id = q.reviewed_by),
         q.reviewed_at, q.created_at
  from public.phrase_db_queue q
  join public.phrase_submissions s on s.id = q.submission_id
  where public.admin_require() is not null
    and (status_filter is null or status_filter = 'all' or q.status = status_filter)
  order by q.created_at desc
  limit least(coalesce(lim, 100), 300);
$$;

create or replace function public.admin_phrase_decide(target uuid, decision text, edited_text text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := public.admin_require();
begin
  if decision not in ('pending', 'approved', 'rejected', 'exported') then
    raise exception 'Unknown decision';
  end if;
  update public.phrase_db_queue q
     set status = decision,
         final_text = coalesce(edited_text, q.final_text),
         reviewed_by = me,
         reviewed_at = now()
   where q.id = target;
  if not found then raise exception 'No such queue entry'; end if;

  perform public.admin_log('phrase_queue:' || decision, null, jsonb_build_object('queue_id', target));
  return decision;
end;
$$;

revoke all on function public.phrase_reactions_enqueue() from anon, authenticated;
grant execute on function public.admin_phrase_queue(text, integer) to authenticated;
grant execute on function public.admin_phrase_decide(uuid, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 4. admin_stats, extended
--
-- One more tile: how many phrases are waiting in the queue, so a pending
-- pile-up is visible on the dashboard rather than only inside the section
-- itself.
-- ---------------------------------------------------------------------

drop function if exists public.admin_stats();

create or replace function public.admin_stats()
returns table (
  users_total integer, users_online integer, users_new_today integer,
  reports_total integer, reports_open integer,
  users_banned integer, users_suspended integer, admins integer,
  messages_today integer, rejections_today integer,
  phrase_queue_pending integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.profiles),
    (select count(*)::int from public.profiles p
      where p.last_active_at > now() - interval '5 minutes'),
    (select count(*)::int from public.profiles p where p.created_at >= date_trunc('day', now())),
    (select count(*)::int from public.reports),
    (select count(*)::int from public.reports r where r.status in ('open', 'reviewing')),
    (select count(*)::int from public.profiles p where p.status = 'banned'),
    (select count(*)::int from public.profiles p where p.status = 'suspended'),
    (select count(*)::int from public.profiles p where p.is_admin),
    (select count(*)::int from public.messages m where m.created_at >= date_trunc('day', now())),
    (select count(*)::int from public.moderation_events e where e.created_at >= date_trunc('day', now())),
    (select count(*)::int from public.phrase_db_queue q where q.status = 'pending')
  where public.admin_require() is not null;
$$;

revoke all on function public.admin_stats() from anon, authenticated;
grant execute on function public.admin_stats() to authenticated;


-- ---------------------------------------------------------------------
-- 5. Trending phrases
--
-- The Leaders tab's second view: top phrases site-wide by reaction count,
-- not grouped by who published them. The aggregation happens here rather
-- than client-side, since pulling every phrase_submissions row down to sort
-- it in the browser would not scale as the table grows.
-- ---------------------------------------------------------------------

create or replace function public.trending_phrases(lim integer default 30)
returns table (
  submission_id uuid, phrase text, cipher text, value integer,
  user_id uuid, contributor_name text, contributor_avatar text,
  heart_count integer, like_count integer, laugh_count integer, total_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.phrase, s.cipher, s.value, s.user_id,
         pp.display_name, pp.avatar,
         coalesce(c.heart_n, 0)::int,
         coalesce(c.like_n, 0)::int,
         coalesce(c.laugh_n, 0)::int,
         (coalesce(c.heart_n, 0) + coalesce(c.like_n, 0) + coalesce(c.laugh_n, 0))::int
  from public.phrase_submissions s
  join public.public_profiles pp on pp.id = s.user_id
  join (
    select submission_id,
           count(*) filter (where reaction = 'heart') as heart_n,
           count(*) filter (where reaction = 'like')  as like_n,
           count(*) filter (where reaction = 'laugh') as laugh_n
    from public.phrase_reactions
    group by submission_id
  ) c on c.submission_id = s.id
  order by (coalesce(c.heart_n, 0) + coalesce(c.like_n, 0) + coalesce(c.laugh_n, 0)) desc,
           s.created_at desc
  limit least(coalesce(lim, 30), 100);
$$;

revoke all on function public.trending_phrases(integer) from anon, authenticated;
grant execute on function public.trending_phrases(integer) to authenticated;
