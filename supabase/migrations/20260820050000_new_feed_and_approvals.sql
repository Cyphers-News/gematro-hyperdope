-- =====================================================================
-- A chronological "New" phrase feed, "your phrase was added" notifications,
-- and two more orderings for phrases_by_reaction
--
-- Builds on 20260820040000_ccru_and_notifications.sql without editing it or
-- anything earlier. Safe to re-run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Newest phrases, across every contributor - Leaders' new "New" tab,
--    before Trending. Unlike phrases_by_reaction this needs no reaction at
--    all: every submission qualifies, newest first, purely so people can
--    scroll what just landed and react to it.
-- ---------------------------------------------------------------------

create or replace function public.newest_phrases(lim integer default 40)
returns table (
  submission_id uuid, phrase text, cipher text, value integer,
  user_id uuid, contributor_name text, contributor_avatar text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.phrase, s.cipher, s.value, s.user_id,
         pp.display_name, pp.avatar, s.created_at
  from public.phrase_submissions s
  join public.public_profiles pp on pp.id = s.user_id
  order by s.created_at desc
  limit least(coalesce(lim, 40), 100);
$$;

revoke all on function public.newest_phrases(integer) from anon, authenticated, public;
grant execute on function public.newest_phrases(integer) to authenticated;


-- ---------------------------------------------------------------------
-- 2. phrases_by_reaction, extended with az/value ordering
--
-- Was recent (newest reaction of that type first) or top (highest count
-- first). The Leaders ranking-mode control is now four options, not two -
-- alphabetical and by-value join recent/top rather than replacing them.
-- Dropped and recreated: same function, same two original modes still work
-- exactly as before, this only adds two more branches to the ordering.
-- ---------------------------------------------------------------------

drop function if exists public.phrases_by_reaction(text, text, integer);

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
set search_path = ''
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
    (case when order_mode = 'az'    then s.phrase end) asc,
    (case when order_mode = 'value' then s.value end) asc nulls last,
    (case when order_mode = 'recent' then c.last_at end) desc,
    (case when order_mode not in ('recent', 'az', 'value') then c.n end) desc,
    c.last_at desc
  limit least(coalesce(lim, 30), 100);
$$;

comment on function public.phrases_by_reaction(text, text, integer) is
  'order_mode: recent (newest reaction first), top (highest count first, ties by most recent), az (phrase alphabetical), value (cypher value low to high).';

revoke all on function public.phrases_by_reaction(text, text, integer) from anon, authenticated, public;
grant execute on function public.phrases_by_reaction(text, text, integer) to authenticated;


-- ---------------------------------------------------------------------
-- 3. "Your phrase was added to the database" notifications
--
-- Reuses phrase_reaction_notifications (20260820040000) rather than a
-- parallel table - same recipient/actor/submission/read/created_at shape,
-- same RLS, same read/list/mark-read functions already work on it
-- unchanged. 'approved' widens the reaction check constraint as a fifth
-- value alongside the four real reactions; it is not a reaction a member
-- holds, just a second kind of event the same table already models
-- correctly (something happened to your phrase, you have not seen it yet).
-- ---------------------------------------------------------------------

alter table public.phrase_reaction_notifications drop constraint if exists phrase_reaction_notifications_kind;
alter table public.phrase_reaction_notifications add constraint phrase_reaction_notifications_kind
  check (reaction in ('heart', 'like', 'laugh', 'ccru', 'approved'));

create or replace function public.admin_phrase_decide(target uuid, decision text, edited_text text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.admin_require();
  owner uuid;
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

  if decision = 'approved' then
    select s.user_id into owner
    from public.phrase_db_queue q
    join public.phrase_submissions s on s.id = q.submission_id
    where q.id = target;

    if owner is not null and owner <> me then
      insert into public.phrase_reaction_notifications (recipient_id, actor_id, submission_id, reaction)
      select owner, me, q.submission_id, 'approved'
      from public.phrase_db_queue q
      where q.id = target
      on conflict (recipient_id, actor_id, submission_id, reaction)
      do update set read = false, created_at = now();
    end if;
  end if;

  perform public.admin_log('phrase_queue:' || decision, null, jsonb_build_object('queue_id', target));
  return decision;
end;
$$;

revoke all on function public.admin_phrase_decide(uuid, text, text) from anon, authenticated, public;
grant execute on function public.admin_phrase_decide(uuid, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 4. Same PUBLIC-execute hardening as previous migrations
-- ---------------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('newest_phrases', 'phrases_by_reaction', 'admin_phrase_decide')
  loop
    execute format('revoke execute on function %s from public', r.sig);
  end loop;
end $$;
