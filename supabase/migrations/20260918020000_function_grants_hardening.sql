-- =====================================================================
-- Function grants - nothing callable signed out, two lookups closed
--
-- FOUND BY PROBING THE LIVE PROJECT (2026-09-18), not by reading migrations
--
-- Called with no session at all (the anon key alone), 16 functions still
-- executed: admin_list, admin_stats, admin_online, admin_audit_list,
-- admin_report_status, chat_threads, chat_mark_read, chat_unread_total,
-- chat_archive, chat_clear, member_block, member_unblock,
-- member_blocked_list, member_profile, is_blocked, friend_pair.
--
-- Most of them then stopped themselves - "Not signed in", or they acted on
-- auth.uid(), which is null - so the damage was limited to what they
-- return anyway. admin_list did not stop: it handed the list of admin user
-- ids to anyone on the internet. is_blocked did not either: it answers
-- "has either of these two users blocked the other" for any two ids.
--
-- Why: Supabase's default privileges grant EXECUTE on every new function in
-- public to anon and authenticated directly - not through PUBLIC. The
-- sweep in 20260820020000_security_definer_view_fix.sql revoked PUBLIC,
-- which does not touch a direct grant to anon, and several functions were
-- created in migrations that only ever granted to authenticated. Some of
-- the live grants also do not match what the migrations say (member_profile
-- and chat_threads are revoked from anon in their own files and were still
-- callable), so this does not rely on reading the history: it fixes the
-- state that is actually there.
--
-- WHAT THIS DOES
--
--  1. For every function in public that this project created (anything an
--     extension owns is left alone, same filter as the 20260820020000
--     sweep): note whether `authenticated` can execute it right now, revoke
--     EXECUTE from PUBLIC and from anon, and grant it back to authenticated
--     if it had it. A signed-in member can call exactly what they could
--     before; a signed-out visitor can call nothing.
--
--  2. Two lookups are taken away from members too, because they answer
--     questions about OTHER people that a member has no reason to ask:
--       is_blocked(u1, u2)  - whether either of two users blocked the other
--       are_friends(u1, u2) - whether two users are friends, whatever
--                             their privacy settings say
--     Neither is called by the site, neither is used in a row policy, and
--     every function that uses them is security definer and runs them as
--     their owner - so nothing that relies on them changes.
--
--  3. Default privileges: a function created from now on is not executable
--     by anon unless a migration says so on purpose.
--
-- Not changed, on purpose: account_active, chat_can_see_message and
-- chat_is_member are used inside row policies, which run as the member,
-- so they have to stay callable by authenticated. is_admin is what draws
-- the admin badge the site already shows everyone.
--
-- No table, row, policy or function body is touched. Safe to re-run.
-- Reload the PostgREST schema cache afterwards.
-- =====================================================================

do $$
declare
  r record;
  had_authenticated boolean;
begin
  for r in
    select p.oid, p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    had_authenticated := has_function_privilege('authenticated', r.oid, 'EXECUTE');
    execute format('revoke execute on function %s from public, anon', r.sig);
    if had_authenticated then
      execute format('grant execute on function %s to authenticated', r.sig);
    end if;
  end loop;
end
$$;

revoke execute on function public.is_blocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.are_friends(uuid, uuid) from public, anon, authenticated;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
