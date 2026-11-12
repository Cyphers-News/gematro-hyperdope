-- =====================================================================
-- Phrase nomination quorum and bounded admin batch decisions
--
-- Reactions remain social signals. A phrase enters editorial custody only
-- after distinct non-author support crosses the accepted quorum:
--   * three supporters with any reactions; or
--   * two supporters when at least one holds the CCRU/book reaction.
--
-- Queue crossing stays durable. Removing reactions never removes or resets a
-- queue row, and this migration does not reclassify any existing row.
--
-- The batch RPC is deliberately narrower than admin_phrase_decide(): it may
-- only approve or reject rows that are still pending, and it validates the
-- complete payload before making the first decision.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Quorum-owned queue ingress
-- ---------------------------------------------------------------------

create or replace function public.phrase_reactions_enqueue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  supporter_count integer;
  has_ccru_support boolean;
begin
  -- A per-submission transaction lock makes simultaneous reaction inserts
  -- recount in sequence. The unique queue key prevents duplicate custody;
  -- this lock prevents a qualified phrase from being missed because every
  -- crossing transaction observed the others before they committed.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.submission_id::text, 0)
  );

  select s.user_id
    into owner_id
  from public.phrase_submissions s
  where s.id = new.submission_id;

  if owner_id is null then
    return new;
  end if;

  select count(distinct r.user_id)::integer,
         coalesce(pg_catalog.bool_or(r.reaction = 'ccru'), false)
    into supporter_count, has_ccru_support
  from public.phrase_reactions r
  where r.submission_id = new.submission_id
    and r.user_id <> owner_id;

  if supporter_count >= 3
     or (supporter_count >= 2 and has_ccru_support) then
    insert into public.phrase_db_queue (submission_id)
    values (new.submission_id)
    on conflict (submission_id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.phrase_reactions_enqueue() is
  'After a reaction insert, serializes by submission and queues the phrase once three distinct non-author supporters react, or two do when either holds CCRU/book. Existing queue rows are never reset.';

comment on table public.phrase_db_queue is
  'Phrases whose distinct non-author support crossed nomination quorum, waiting for an administrator to decide whether they belong in db.txt. Crossing is durable; reaction removal does not remove or reset a queue row.';

drop trigger if exists phrase_reactions_enqueue_trg on public.phrase_reactions;
create trigger phrase_reactions_enqueue_trg
  after insert on public.phrase_reactions
  for each row execute function public.phrase_reactions_enqueue();

revoke all on function public.phrase_reactions_enqueue() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. One decision owner, shared by single and batch callers
-- ---------------------------------------------------------------------

create or replace function public.admin_phrase_decide(
  target uuid,
  decision text,
  edited_text text default null
)
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

  if edited_text is not null
     and (pg_catalog.char_length(edited_text) < 1
          or pg_catalog.char_length(edited_text) > 500) then
    raise exception 'Final text must be between 1 and 500 characters';
  end if;

  update public.phrase_db_queue q
     set status = decision,
         final_text = coalesce(edited_text, q.final_text),
         reviewed_by = me,
         reviewed_at = pg_catalog.now()
   where q.id = target;
  if not found then
    raise exception 'No such queue entry';
  end if;

  if decision = 'approved' then
    select s.user_id
      into owner
    from public.phrase_db_queue q
    join public.phrase_submissions s on s.id = q.submission_id
    where q.id = target;

    if owner is not null and owner <> me then
      insert into public.phrase_reaction_notifications (
        recipient_id, actor_id, submission_id, reaction
      )
      select owner, me, q.submission_id, 'approved'
      from public.phrase_db_queue q
      where q.id = target
      on conflict (recipient_id, actor_id, submission_id, reaction)
      do update set read = false, created_at = pg_catalog.now();
    end if;
  end if;

  perform public.admin_log(
    'phrase_queue:' || decision,
    null,
    pg_catalog.jsonb_build_object('queue_id', target)
  );
  return decision;
end;
$$;

revoke all on function public.admin_phrase_decide(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_phrase_decide(uuid, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 3. Explicit, bounded, atomic batch decisions
-- ---------------------------------------------------------------------

create or replace function public.admin_phrase_decide_batch(items jsonb)
returns table (queue_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.admin_require();
  item jsonb;
  target_id uuid;
  item_decision text;
  item_text text;
  target_ids uuid[] := '{}'::uuid[];
  item_count integer;
  locked_count integer := 0;
begin
  if items is null or pg_catalog.jsonb_typeof(items) <> 'array' then
    raise exception 'Batch decisions must be an array';
  end if;

  item_count := pg_catalog.jsonb_array_length(items);
  if item_count < 1 or item_count > 100 then
    raise exception 'Batch decisions must contain between 1 and 100 items';
  end if;

  -- First pass: validate every field and build the exact target set. Nothing
  -- below this loop has written or locked a queue row yet.
  for item in
    select value from pg_catalog.jsonb_array_elements(items)
  loop
    if pg_catalog.jsonb_typeof(item) <> 'object' then
      raise exception 'Each batch item must be an object';
    end if;
    if pg_catalog.jsonb_typeof(item -> 'id') is distinct from 'string' then
      raise exception 'Each batch item needs a queue id';
    end if;
    if pg_catalog.jsonb_typeof(item -> 'decision') is distinct from 'string' then
      raise exception 'Each batch item needs a decision';
    end if;
    if item ? 'edited_text'
       and pg_catalog.jsonb_typeof(item -> 'edited_text') not in ('string', 'null') then
      raise exception 'Final text must be a string or null';
    end if;

    begin
      target_id := (item ->> 'id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid queue id';
    end;

    item_decision := item ->> 'decision';
    if item_decision not in ('approved', 'rejected') then
      raise exception 'Batch decisions may only approve or reject';
    end if;

    item_text := item ->> 'edited_text';
    if item_text is not null
       and (pg_catalog.char_length(item_text) < 1
            or pg_catalog.char_length(item_text) > 500) then
      raise exception 'Final text must be between 1 and 500 characters';
    end if;

    if pg_catalog.array_position(target_ids, target_id) is not null then
      raise exception 'Duplicate queue id';
    end if;
    target_ids := pg_catalog.array_append(target_ids, target_id);
  end loop;

  -- Lock in stable order so two administrators selecting overlapping rows do
  -- not deadlock. Requiring every target still to be pending makes stale
  -- moderation state fail the complete transaction rather than overwrite it.
  for target_id in
    select q.id
    from public.phrase_db_queue q
    where q.id = any(target_ids)
      and q.status = 'pending'
    order by q.id
    for update
  loop
    locked_count := locked_count + 1;
  end loop;

  if locked_count <> item_count then
    raise exception 'One or more queue entries are missing or no longer pending';
  end if;

  -- Second pass: all payload and stale-state checks are complete. Reusing the
  -- single decision function preserves notifications, audit, reviewer fields,
  -- timestamps and final-text behavior inside this one transaction.
  for item in
    select value from pg_catalog.jsonb_array_elements(items)
  loop
    target_id := (item ->> 'id')::uuid;
    item_decision := item ->> 'decision';
    item_text := item ->> 'edited_text';

    perform public.admin_phrase_decide(target_id, item_decision, item_text);
    queue_id := target_id;
    status := item_decision;
    return next;
  end loop;

  return;
end;
$$;

comment on function public.admin_phrase_decide_batch(jsonb) is
  'Admin-only atomic approve/reject for 1-100 explicitly selected pending phrase queue rows. Validates the complete payload and locks every target before reusing single-decision semantics.';

revoke all on function public.admin_phrase_decide_batch(jsonb) from public, anon, authenticated;
grant execute on function public.admin_phrase_decide_batch(jsonb) to authenticated;

notify pgrst, 'reload schema';
