-- =====================================================================
-- Fix: reacting to a chat message failed with
--   42P17: infinite recursion detected in policy for relation
--          "conversation_members"
--
-- WHAT WENT WRONG
--
-- conv_members_select_mine (20260806010000_chat.sql) is written as:
--
--   create policy "conv_members_select_mine"
--     on public.conversation_members for select to authenticated
--     using ( exists (
--       select 1 from public.conversation_members m2
--       where m2.conversation_id = conversation_members.conversation_id
--         and m2.user_id = (select auth.uid()) ) );
--
-- That policy queries conversation_members from inside a policy ON
-- conversation_members. Evaluating it requires evaluating it, which is
-- the recursion Postgres is reporting.
--
-- It has been that way since chat shipped without ever causing trouble,
-- because nothing reached conversation_members as the calling user:
-- chat_history, chat_threads, chat_send and the rest are all SECURITY
-- DEFINER, and RLS does not apply inside those.
--
-- 20260820170000_chat_message_reactions.sql was the first thing to read
-- conversation_members from an RLS policy, which runs as the caller with
-- RLS fully in force - so it walked straight into the existing recursion.
-- The reaction policies were the trigger, not the cause.
--
-- THE FIX
--
-- Ask the membership question through a SECURITY DEFINER function
-- instead. Inside it, RLS does not apply, so conversation_members is
-- read directly and the recursive policy is never evaluated.
--
-- This does NOT weaken anything. The function answers exactly the
-- question the inline exists() asked - "is the caller a member of the
-- conversation this message belongs to" - against auth.uid(), which a
-- caller cannot forge. It takes a message id and returns a boolean; it
-- exposes no rows, and cannot be used to read anybody's messages or
-- membership. The three policies keep the same meaning they had.
--
-- The underlying recursive policy on conversation_members is left
-- exactly as it is. It is a latent bug worth fixing on its own terms,
-- but changing the select rule on a core chat table to fix a reactions
-- feature is the kind of blast radius that belongs in its own change,
-- deliberately, not smuggled in here.
--
-- ROLLBACK
--   Re-run 20260820170000_chat_message_reactions.sql to restore the
--   inline (recursive, non-working) policies, then:
--   drop function if exists public.chat_can_see_message(uuid);
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The membership test, as a function
--
-- stable: same answer throughout a statement, so the planner may call it
-- once per row rather than once per policy evaluation.
-- ---------------------------------------------------------------------

create or replace function public.chat_can_see_message(msg uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = msg
      and cm.user_id = auth.uid()
  );
$$;

comment on function public.chat_can_see_message(uuid) is
  'Is the caller a member of the conversation this message belongs to? SECURITY DEFINER so RLS policies can ask without tripping the self-referential policy on conversation_members. Returns a boolean only - exposes no rows.';

revoke all on function public.chat_can_see_message(uuid) from public, anon, authenticated;
-- granted to authenticated because RLS policies on message_reactions call
-- it as the caller; it is safe to hold, answering only about auth.uid()
grant execute on function public.chat_can_see_message(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. The same three policies, asking the same question the safe way
-- ---------------------------------------------------------------------

drop policy if exists "message_reactions_select_mine" on public.message_reactions;
create policy "message_reactions_select_mine"
  on public.message_reactions for select
  to authenticated
  using ( public.chat_can_see_message(message_reactions.message_id) );

drop policy if exists "message_reactions_insert_own" on public.message_reactions;
create policy "message_reactions_insert_own"
  on public.message_reactions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.chat_can_see_message(message_reactions.message_id)
  );

-- unchanged in meaning: your own row only. Restated here so the whole
-- policy set for this table can be read in one place.
drop policy if exists "message_reactions_delete_own" on public.message_reactions;
create policy "message_reactions_delete_own"
  on public.message_reactions for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

notify pgrst, 'reload schema';
