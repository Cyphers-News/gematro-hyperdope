-- =====================================================================
-- Reaction relabelling, per-type Leaders rankings, and a sortable admin
-- queue
--
-- heart / like / laugh (the reaction table's own values) do not change -
-- only what they mean and how they are labelled does: heart is now shown as
-- Evergreen (a green heart, not red), like is shown as Trending, laugh is
-- shown as Funny. Renaming the column values themselves would touch every
-- row in phrase_reactions and phrase_reaction_counts's callers for no
-- behavioural gain, so this is a client-side relabel over an unchanged
-- schema - see calc/profile-tab.js and auth/admin-ui.js for the actual
-- label/icon swap.
--
-- What genuinely needs new SQL:
--   * admin_phrase_queue needs a sort parameter (recent interaction, total,
--     or any one reaction type) and the fields to sort by - total, first
--     and last reaction time weren't returned before.
--   * The Leaders tab's old single "Trending" view (top phrases by combined
--     reaction count) becomes three - Trending/Most Loved/Funniest, each
--     independently rankable by "most recent" or "all-time" - which needs a
--     per-reaction-type query trending_phrases never did.
--
-- Safe to re-run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. admin_phrase_queue: sortable, with total/first/last reaction time
--
-- Dropped and recreated: both the parameter list (adding sort) and the
-- return shape (adding total_count, first_reaction_at, last_reaction_at)
-- change, and Postgres allows neither via create or replace.
-- ---------------------------------------------------------------------

drop function if exists public.admin_phrase_queue(text, integer);

create or replace function public.admin_phrase_queue(
  status_filter text default 'pending',
  sort text default 'recent',
  lim integer default 100
)
returns table (
  id uuid, submission_id uuid, status text,
  phrase text, cipher text, value integer,
  user_id uuid, contributor_name text,
  heart_count integer, like_count integer, laugh_count integer, total_count integer,
  first_reaction_at timestamptz, last_reaction_at timestamptz,
  final_text text,
  reviewed_by_name text, reviewed_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select r.submission_id,
           count(*) filter (where r.reaction = 'heart')::int as heart_n,
           count(*) filter (where r.reaction = 'like')::int  as like_n,
           count(*) filter (where r.reaction = 'laugh')::int as laugh_n,
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
         coalesce(c.heart_n, 0), coalesce(c.like_n, 0), coalesce(c.laugh_n, 0), coalesce(c.total_n, 0),
         -- the enqueue trigger fires on the phrase's first-ever reaction, so
         -- q.created_at already *is* the first reaction time - coalesce is
         -- only a fallback for a queue row somehow older than this migration
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
    coalesce(c.last_at, q.created_at) desc
  limit least(coalesce(lim, 100), 300);
$$;

revoke all on function public.admin_phrase_queue(text, text, integer) from anon, authenticated;
grant execute on function public.admin_phrase_queue(text, text, integer) to authenticated;


-- ---------------------------------------------------------------------
-- 2. Per-reaction-type phrase rankings, for Leaders' Trending / Most Loved
--    / Funniest tabs
--
-- trending_phrases (unchanged, still backs "Popular" - combined engagement
-- across all three types) ranks by everything at once and cannot answer
-- "top by heart alone" or "newest like alone". This is the same shape,
-- scoped to one reaction type, with both an all-time (by count) and a
-- most-recent (by latest reaction of that type) ordering.
-- ---------------------------------------------------------------------

create or replace function public.phrases_by_reaction(
  reaction_type text,
  order_mode text default 'recent',
  lim integer default 30
)
returns table (
  submission_id uuid, phrase text, cipher text, value integer,
  user_id uuid, contributor_name text, contributor_avatar text,
  reaction_count integer, last_reacted_at timestamptz, published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.phrase, s.cipher, s.value, s.user_id,
         pp.display_name, pp.avatar,
         c.n, c.last_at, s.created_at
  from public.phrase_submissions s
  join public.public_profiles pp on pp.id = s.user_id
  join (
    select submission_id, count(*)::int as n, max(created_at) as last_at
    from public.phrase_reactions
    where reaction = reaction_type
    group by submission_id
  ) c on c.submission_id = s.id
  order by
    (case when order_mode = 'recent' then c.last_at end) desc,
    (case when order_mode <> 'recent' then c.n end) desc,
    c.last_at desc
  limit least(coalesce(lim, 30), 100);
$$;

comment on function public.phrases_by_reaction(text, text, integer) is
  'reaction_type is heart, like or laugh (shown to members as Evergreen, Trending, Funny). order_mode is recent (newest reaction of that type first) or top (highest count first, ties broken by most recent).';

revoke all on function public.phrases_by_reaction(text, text, integer) from anon, authenticated;
grant execute on function public.phrases_by_reaction(text, text, integer) to authenticated;
