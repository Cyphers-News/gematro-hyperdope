-- =====================================================================
-- Teardown: Matching, Stripe, LLM and their GDPR support
--
-- DELIBERATELY NOT IN migrations/. Everything in that folder runs on a
-- `supabase db push`, and one line in here permanently deletes real birth
-- dates. This is a script you read, decide about, and run by hand — never
-- something a deploy can trigger for you.
--
-- WHY IT EXISTS: the five 20260807* migration files were deleted from the
-- repo. Deleting a migration file does not undo what it already did. If those
-- migrations were ever applied, every table and function below is still in
-- the database right now, still holding whatever it held.
--
-- WHY IT IS SAFE TO RUN, structurally: no code that is being kept touches any
-- of this. No remaining migration references these objects, no shipped
-- JavaScript calls any of these functions, and every table below cascades
-- from auth.users — so account deletion keeps working correctly whether you
-- run this or not. The only thing at stake is the data itself.
--
-- Work through the steps in order. Step 1 is read-only.
-- =====================================================================


-- ---------------------------------------------------------------------
-- STEP 1 — Find out what is actually there. Read-only, run this first.
--
-- If it comes back empty, the migrations were never applied, nothing below
-- exists, and you can stop here: the feature is already gone.
-- ---------------------------------------------------------------------

select c.relname                                        as object,
       case c.relkind when 'r' then 'table' else 'view' end as kind,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from public.%I', c.relname),
                           false, true, '')))[1]::text::bigint as rows
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
  and  c.relkind = 'r'
  and  c.relname in ('feature_flags', 'subscriptions', 'user_birth_data',
                     'user_cypher_preferences', 'billing_events',
                     'llm_usage', 'llm_limits', 'consent_events')
order  by c.relname;

-- and the functions, which hold no data but are worth seeing:
select p.oid::regprocedure as function
from   pg_proc p join pg_namespace n on n.oid = p.pronamespace
where  n.nspname = 'public'
  and  p.proname in ('flag_enabled','subscription_active','subscription_mine',
                     'matching_access','astro_sign_name','astro_element',
                     'numerology_life_path','ubd_derive_life_path','match_factors',
                     'match_list','match_status','match_forget','admin_flags',
                     'admin_set_flag','admin_set_subscription','billing_link_customer',
                     'billing_apply_event','admin_billing','llm_tier','llm_quota',
                     'llm_reserve','llm_complete','esoteric_context','ubd_log_consent',
                     'account_export','llm_prune')
order  by 1;


-- ---------------------------------------------------------------------
-- STEP 2 — Back up anything step 1 showed with rows in it.
--
-- Not optional if user_birth_data came back non-zero. From the Supabase
-- dashboard: Database > Backups, or run a pg_dump of just these tables.
-- There is no undo past this point.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- STEP 3 — Drop the functions.
--
-- No data lost here, and nothing that remains calls any of them. Several were
-- defined more than once across the five migrations (match_list, match_status
-- and llm_tier were each redefined by the force-free migration), so this
-- matches on name and drops every overload rather than guessing signatures.
-- ---------------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from   pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where  n.nspname = 'public'
      and  p.proname = any (array[
             'flag_enabled','subscription_active','subscription_mine',
             'matching_access','astro_sign_name','astro_element',
             'numerology_life_path','ubd_derive_life_path','match_factors',
             'match_list','match_status','match_forget','admin_flags',
             'admin_set_flag','admin_set_subscription','billing_link_customer',
             'billing_apply_event','admin_billing','llm_tier','llm_quota',
             'llm_reserve','llm_complete','esoteric_context','ubd_log_consent',
             'account_export','llm_prune'])
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
    raise notice 'dropped %', r.sig;
  end loop;
end $$;

-- The GDPR migration suggested scheduling llm_prune nightly. If you ever ran
-- that cron.schedule line, the job is still there pointing at a function that
-- no longer exists. This removes it; the error if it was never scheduled is
-- harmless and you can ignore it.
-- select cron.unschedule('llm-prune');


-- ---------------------------------------------------------------------
-- STEP 4 — Drop the tables that hold no personal data.
--
-- feature_flags was three matching toggles. llm_limits was a rate-limit tier
-- table. llm_usage is a log of LLM calls — if it has rows they are yours, not
-- anyone's personal data, but read step 1's count before deciding.
-- ---------------------------------------------------------------------

drop table if exists public.feature_flags cascade;
drop table if exists public.llm_limits    cascade;
drop table if exists public.llm_usage     cascade;
drop table if exists public.user_cypher_preferences cascade;


-- ---------------------------------------------------------------------
-- STEP 5 — Decide about these. Do not run step 5 on autopilot.
--
-- subscriptions and billing_events are financial records. If anyone ever
-- actually paid, you may have a tax or accounting duty to keep them, and that
-- duty outlives the feature. Check step 1: if both are empty, nobody paid and
-- there is nothing to keep. If they are not empty, export them before you drop
-- them, or leave them in place — they are inert either way now that no code
-- reads them.
--
-- consent_events is the record of who agreed to what. Once the data that
-- consent covered is gone, the log has nothing left to evidence, so dropping
-- it with user_birth_data is coherent. Dropping it *before* is not.
-- ---------------------------------------------------------------------

-- drop table if exists public.billing_events cascade;
-- drop table if exists public.subscriptions  cascade;


-- ---------------------------------------------------------------------
-- STEP 6 — user_birth_data. Real birth dates, times and places.
--
-- This is the irreversible one and it is left commented out on purpose.
-- Uncomment it only once step 1 has told you what is in there and step 2 has
-- backed it up.
--
-- Worth knowing before you decide: leaving this table in place is not a
-- security hole. Its four RLS policies are all own-row-only and no shipped
-- code reads it any more. But it is personal data with no remaining purpose,
-- which under GDPR is exactly the kind of thing that should not be sitting
-- around — so "leave it indefinitely" is the one option that is worse than
-- either dropping it or deliberately keeping it for a stated reason.
-- ---------------------------------------------------------------------

-- drop table if exists public.consent_events  cascade;
-- drop table if exists public.user_birth_data cascade;
