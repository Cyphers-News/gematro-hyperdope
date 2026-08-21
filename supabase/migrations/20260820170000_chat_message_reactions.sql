-- =====================================================================
-- Reactions on private chat messages
--
-- WHY THIS MIGRATION IS NEEDED
--
-- Forum messages have had reactions since 20260820080000_forum_extras.sql
-- (public.forum_message_reactions). Private chat messages have never had
-- anywhere to store one - there is no existing column or table that can
-- hold "user X reacted 'heart' to message Y" for public.messages. That is
-- the whole reason this migration exists; nothing here is a rewrite of
-- something that already worked.
--
-- Backward compatible: one new table plus one new function. No existing
-- table, column, policy, function or row is altered or removed. Chat with
-- no reactions behaves exactly as before - every message simply has zero
-- of them, which is the same state a brand new message is in anyway.
--
-- THE ONE IMPORTANT DIFFERENCE FROM THE FORUM VERSION
--
-- forum_message_reactions' select policy is `using (true)`: correct
-- there, because the Forum is a public board where every signed-in member
-- can already read every message.
--
-- Copying that here would be a privacy hole. These reactions hang off
-- private one-to-one conversations, so `using (true)` would let any
-- signed-in member read reaction rows belonging to conversations they are
-- not in - leaking who is talking to whom, roughly how active a
-- conversation is, and a set of valid message ids to probe with. So every
-- path below is scoped to "the caller is a member of the conversation
-- this message belongs to", matching the existing messages_select_mine
-- policy (20260806010000_chat.sql) rather than the Forum's.
--
-- That scoping is applied three times over, deliberately:
--   * select  - you may only read reactions on messages you can read
--   * insert  - ...and only react to those, and only as yourself
--   * delete  - you may only remove your own reaction
-- plus again inside message_reaction_counts(), which is SECURITY DEFINER
-- and therefore bypasses RLS - without its own membership check that
-- function would undo everything the policies do.
--
-- ROLLBACK
--   drop function if exists public.message_reaction_counts(uuid[]);
--   drop table if exists public.message_reactions;
-- Dropping the table destroys reactions but no messages: message_id is a
-- foreign key out of public.messages, never the other way round.
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The table
--
-- Same shape as forum_message_reactions: select/insert/delete only, no
-- update - a reaction either exists or it does not, there is nothing to
-- edit in place. Same four reaction kinds, so the client's existing
-- {heart, like, laugh, ccru} component works here unchanged.
-- ---------------------------------------------------------------------

create table if not exists public.message_reactions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  reaction    text not null,
  created_at  timestamptz not null default now(),
  constraint message_reactions_kind check (reaction in ('heart', 'like', 'laugh', 'ccru'))
);

comment on table public.message_reactions is
  'Reactions on private chat messages. Unlike forum_message_reactions, every policy here is scoped to conversation membership - these rows describe private conversations.';

-- one reaction of each kind per person per message: the uniqueness the
-- client relies on when it treats a duplicate insert (23505) as "already
-- reacted" rather than an error
create unique index if not exists message_reactions_key
  on public.message_reactions (message_id, user_id, reaction);
-- the read path: counts are always fetched for a page of message ids
create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- ---------------------------------------------------------------------
-- 2. Policies - all three scoped to conversation membership
-- ---------------------------------------------------------------------

-- Read: only reactions on messages in a conversation you belong to. The
-- inner exists() is the same join messages_select_mine uses.
drop policy if exists "message_reactions_select_mine" on public.message_reactions;
create policy "message_reactions_select_mine"
  on public.message_reactions for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages msg
      join public.conversation_members cm on cm.conversation_id = msg.conversation_id
      where msg.id = message_reactions.message_id
        and cm.user_id = (select auth.uid())
    )
  );

-- Write: as yourself, and only onto a message you can actually read -
-- both halves matter. Without the membership half, a member could react
-- to any message id they could guess, writing rows into someone else's
-- private conversation.
drop policy if exists "message_reactions_insert_own" on public.message_reactions;
create policy "message_reactions_insert_own"
  on public.message_reactions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.messages msg
      join public.conversation_members cm on cm.conversation_id = msg.conversation_id
      where msg.id = message_reactions.message_id
        and cm.user_id = (select auth.uid())
    )
  );

-- Remove: your own row only. No membership clause needed - a row you own
-- could only have been created under the insert policy above, and being
-- removed from a conversation should not strand your old reactions.
drop policy if exists "message_reactions_delete_own" on public.message_reactions;
create policy "message_reactions_delete_own"
  on public.message_reactions for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

revoke all on public.message_reactions from public, anon, authenticated;
grant select, insert, delete on public.message_reactions to authenticated;

-- ---------------------------------------------------------------------
-- 3. Counts
--
-- Mirrors forum_message_reaction_counts, returning one row per (message,
-- reaction) with its total and whether the caller is one of the reactors,
-- which the client folds into the same {heart,like,laugh,ccru,mine:{...}}
-- shape the existing reaction component already consumes.
--
-- SECURITY DEFINER means this runs as the owner and RLS does NOT apply
-- inside it, so it repeats the membership check itself. Without that,
-- this one function would hand back reaction data for every conversation
-- on the site to anyone who passed the right ids - exactly what the
-- policies above exist to prevent.
-- ---------------------------------------------------------------------

create or replace function public.message_reaction_counts(ids uuid[])
returns table (message_id uuid, reaction text, cnt integer, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select r.message_id, r.reaction, count(*)::int, bool_or(r.user_id = auth.uid())
  from public.message_reactions r
  where r.message_id = any(ids)
    and exists (
      select 1
      from public.messages msg
      join public.conversation_members cm on cm.conversation_id = msg.conversation_id
      where msg.id = r.message_id
        and cm.user_id = auth.uid()
    )
  group by r.message_id, r.reaction;
$$;

revoke all on function public.message_reaction_counts(uuid[]) from public, anon, authenticated;
grant execute on function public.message_reaction_counts(uuid[]) to authenticated;

notify pgrst, 'reload schema';
