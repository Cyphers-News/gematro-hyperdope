-- =====================================================================
-- Security definer views, and the PUBLIC grant every function had by
-- default without anyone asking for it
--
-- WHAT TRIGGERED THIS
--
-- Supabase's linter: "Data is publicly accessible via API as this is a
-- Security definer view." A Postgres view runs with the privileges of
-- whoever owns it unless it is declared `security_invoker`, which is exactly
-- what a security definer *function* does on purpose - the difference is a
-- view looks like an ordinary table to the API, so a caller has no reason to
-- expect it bypasses RLS the way an RPC's name at least hints at.
--
-- Three views exist in this schema. None of them can safely become
-- security_invoker: every one of them exists specifically to read past
-- profiles' owner-only RLS (public_profiles.sql, submissions_leaderboard.sql
-- both say so directly), and profiles' RLS is correctly self-only - loosening
-- that policy instead would expose every column to every row a policy
-- touched, not just the two or three columns each view actually needs.
-- Postgres has no column-scoped RLS; a GRANT applies table-wide regardless
-- of which policy made a row visible.
--
-- So the fix is not security_invoker (would break the feature) and it is not
-- "loosen the underlying RLS" (would expose email/status/etc. table-wide).
-- It is: stop being a view.
--
--   * member_cards, public_profiles - nothing outside the database queries
--     these directly (checked: no `.from("member_cards")` or
--     `.from("public_profiles")` anywhere in calc/ or auth/). They exist only
--     to be joined inside other security definer functions, which reach them
--     through their own elevated privilege as the function owner - not
--     through a grant to `authenticated`. That grant was never needed and is
--     revoked below. member_cards specifically was also a live bug: it
--     carries every member's display_name, avatar, roles, fav_ciphers and
--     friend_policy with no row filter of its own, so a direct
--     `select * from member_cards` returned a member's card in full even
--     with public_profile = false - the privacy flag was only ever checked
--     inside member_profile(), never by the view itself.
--
--   * leaderboard is queried directly by the client (profile-features.js,
--     leaderboardTop()) and has to stay reachable by `authenticated`. Views
--     cannot be un-security-definer'd here, so it becomes a security definer
--     *function* instead - same privilege, same result set, but a function's
--     return columns are fixed at RETURNS TABLE and reviewed every time they
--     change, where a view's `select *` risk quietly grows if a column is
--     ever added to public_profiles without thinking about it. This also
--     means Supabase's view-specific linter rule no longer has anything in
--     this schema to flag: after this migration there are zero views granted
--     to anon or authenticated, so there is nothing left to be a "security
--     definer view" reachable via the API.
--
-- THE SECOND THING, FOUND WHILE READING EVERY GRANT IN THE PROJECT FOR THIS
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default -
-- PUBLIC meaning literally every role, anon included, not a role anything
-- inherits through membership. Every migration in this project revokes from
-- `anon, authenticated` after creating a function, which reads as "locked
-- down" and was never actually enough: PUBLIC's grant is separate from and
-- unaffected by revoking two named roles, so anon could still execute every
-- one of these functions the entire time through its blanket PUBLIC access,
-- regardless of the explicit revoke sitting right next to it.
--
-- Not exploitable in the way it sounds, in most cases - the functions that
-- matter (admin_*, friend_*, chat_*, member_*) all check `auth.uid()` or call
-- admin_require() as their first act and raise for a caller with no session,
-- which anon has none of. But "the check inside happens to save us" is not
-- the same thing as "the grant says no", and a couple of functions
-- (is_admin, account_active, member_search with an empty/permissive query)
-- do not require a session at all - they were reachable and answerable by
-- anon with nothing but the anon key the whole time. This closes that for
-- every function that exists now, and for every one created after this
-- migration too.
--
-- Safe to re-run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. member_cards - internal only from here on
--
-- Every current use is a join inside another security definer function
-- (member_search, member_discover, friend_list, chat_threads, member_profile,
-- block lookups) - all of which keep working unchanged, because none of them
-- were relying on `authenticated` having a grant here. They read member_cards
-- as the function owner, same as they read profiles itself.
-- ---------------------------------------------------------------------

revoke all on public.member_cards from anon, authenticated;

comment on view public.member_cards is
  'Internal only - not queried directly by any client. Every column a member has chosen to keep private (public_profile, show_online, show_last_active, show_mutuals, show_friend_count) is only enforced by the security definer functions that read this view, not by the view itself, so it must never be granted to anon or authenticated directly. See 20260820020000_security_definer_view_fix.sql.';


-- ---------------------------------------------------------------------
-- 2. public_profiles - internal only from here on
--
-- Used only inside leaderboard_top() below. Nothing client-side ever queried
-- it directly.
-- ---------------------------------------------------------------------

revoke all on public.public_profiles from anon, authenticated;

comment on view public.public_profiles is
  'Internal only - not queried directly by any client, only joined inside leaderboard_top(). Deliberately excludes email. See 20260820020000_security_definer_view_fix.sql.';


-- ---------------------------------------------------------------------
-- 3. leaderboard: view -> security definer function
--
-- Identical result shape and ordering to the view it replaces. The client
-- change is a one-line swap from .from("leaderboard").select("*") to
-- .rpc("leaderboard_top", {...}) - see auth/profile-features.js.
-- ---------------------------------------------------------------------

create or replace function public.leaderboard_top(lim integer default 25)
returns table (
  user_id uuid,
  display_name text,
  avatar text,
  submissions integer,
  last_submission timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pp.id            as user_id,
    pp.display_name,
    pp.avatar,
    count(s.id)::int as submissions,
    max(s.created_at) as last_submission
  from public.public_profiles pp
  join public.phrase_submissions s on s.user_id = pp.id
  group by pp.id, pp.display_name, pp.avatar
  order by count(s.id) desc, max(s.created_at) desc
  limit least(greatest(coalesce(lim, 25), 1), 200);
$$;

comment on function public.leaderboard_top(integer) is
  'Replaces the old public.leaderboard view (dropped below) so this schema has no security-definer view left reachable via the API. Same columns, same ranking. Usernames and avatars only - never email.';

revoke all on function public.leaderboard_top(integer) from anon, authenticated, public;
grant execute on function public.leaderboard_top(integer) to authenticated;

drop view if exists public.leaderboard;


-- ---------------------------------------------------------------------
-- 4. search_path, pinned to nothing rather than to 'public'
--
-- Every security definer function in this project already fully qualifies
-- every table and function it touches (checked across all migrations: no
-- unqualified reference to any project table or function exists anywhere in
-- the SQL, only in comments) - `set search_path = public` was already safe
-- given that, but pinning it to '' removes the assumption entirely rather
-- than resting it on `public` staying unwritable by anon/authenticated. Since
-- everything is already schema-qualified, this changes nothing about how any
-- function runs.
--
-- Done as ALTER FUNCTION, not CREATE OR REPLACE, so no function body is
-- restated here - this touches only the search_path configuration Postgres
-- stores alongside each function, nothing else about it.
--
-- Both sweeps below (this one and #5) exclude anything pg_depend marks as
-- extension-owned, so a function pgcrypto or another extension put in
-- `public` is left exactly as that extension installed it - only functions
-- this project's own migrations created are ever in scope.
-- ---------------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('alter function %s set search_path = ''''', r.sig);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 5. Revoke the implicit PUBLIC execute grant, on every function that
--    exists today...
--
-- No function in this project is meant to be callable by anon (checked:
-- there is no `grant execute ... to anon` anywhere in any migration) - every
-- one is either `authenticated`-only or a trigger, and a trigger fires
-- through the trigger mechanism regardless of who holds EXECUTE on its
-- function, so revoking PUBLIC breaks nothing there either.
-- ---------------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('revoke execute on function %s from public', r.sig);
  end loop;
end $$;

-- ...and on every function created after this migration, so the next
-- CREATE FUNCTION that forgets an explicit revoke is safe by default instead
-- of quietly open to anon until someone notices. ALTER DEFAULT PRIVILEGES
-- only covers objects the *same role* creates from here on - since every
-- migration in this project runs as the one role applying them, that is the
-- role this needs to bind to, and does, automatically, by running as
-- whichever role runs this migration.
alter default privileges in schema public revoke execute on functions from public;


-- ---------------------------------------------------------------------
-- 6. Defence in depth for the search_path change above: search_path = ''
--    plus fully-qualified references is already safe regardless of who can
--    create objects in `public`, but Postgres 15+ (which is what search_path
--    = 'public' was already leaning on) removes CREATE on the public schema
--    from PUBLIC by default anyway. Stated explicitly here rather than left
--    as an assumption about which Postgres version this project runs on.
-- ---------------------------------------------------------------------

revoke create on schema public from public;
