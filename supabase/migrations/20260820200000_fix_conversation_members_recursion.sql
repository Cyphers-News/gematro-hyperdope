-- =====================================================================
-- Fix the recursion at its source: conversation_members' own policy
--
-- RUN THIS ONE. It contains everything 20260820190000 did, plus the root
-- fix that migration stopped short of. Running 20260820190000 first is
-- harmless but unnecessary; running this alone is enough.
--
-- WHAT IS ACTUALLY BROKEN
--
-- conv_members_select_mine (20260806010000_chat.sql) queries
-- conversation_members from inside a policy ON conversation_members:
--
--   using ( exists (
--     select 1 from public.conversation_members m2
--     where m2.conversation_id = conversation_members.conversation_id
--       and m2.user_id = (select auth.uid()) ) )
--
-- Evaluating that policy requires evaluating that policy. Postgres stops
-- it with 42P17, "infinite recursion detected in policy for relation
-- conversation_members".
--
-- It sat harmless from the day chat shipped because nothing ever read
-- conversation_members as the calling user - chat_history, chat_threads,
-- chat_send and the rest are SECURITY DEFINER, where RLS does not apply.
--
-- WHY 20260820190000 WAS NOT ENOUGH
--
-- That migration routed message_reactions' own policies around the
-- recursion, which fixes reacting. But messages_select_mine also does an
-- exists() against conversation_members, so ANY direct client access to
-- public.messages hits the same wall - including deleting your own
-- message, which is why "unsend" failed in private chat with the very
-- same 42P17 while the forum's equivalent worked fine. Patching each
-- policy that happens to touch conversation_members treats the symptom
-- one caller at a time; this fixes the policy that is actually wrong.
--
-- THE FIX, AND WHY IT CHANGES NO RULES
--
-- The membership test moves into a SECURITY DEFINER function. Inside it
-- RLS does not apply, so conversation_members is read directly and its
-- policy is never re-entered.
--
-- The question asked is character-for-character the one the old policy
-- asked: "is there a row in conversation_members for this conversation
-- and auth.uid()". Same rows visible to the same people. It is not a
-- loosening - a caller cannot pass someone else's identity, because the
-- function reads auth.uid() itself and takes only a conversation id. It
-- returns a boolean and exposes no rows.
--
-- BLAST RADIUS - worth reading before running
--
-- This replaces the SELECT policy on a core chat table. If the function
-- were wrong, the visible effect would be conversation member lists
-- reading as empty - chat would degrade, not leak, because every failure
-- mode of a membership check that returns false is "you see less". The
-- risk is a broken feature, not exposed data. I have kept the predicate
-- identical specifically so that even that is unlikely.
--
-- ROLLBACK
--   drop policy if exists "conv_members_select_mine" on public.conversation_members;
--   create policy "conv_members_select_mine"
--     on public.conversation_members for select to authenticated
--     using ( exists (
--       select 1 from public.conversation_members m2
--       where m2.conversation_id = conversation_members.conversation_id
--         and m2.user_id = (select auth.uid()) ) );
-- That restores the original (recursive, and therefore broken for direct
-- access) policy exactly as it was.
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Membership as a function, asked without re-entering the policy
-- ---------------------------------------------------------------------

create or replace function public.chat_is_member(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conv
      and cm.user_id = auth.uid()
  );
$$;

comment on function public.chat_is_member(uuid) is
  'Is the caller a member of this conversation? SECURITY DEFINER so RLS policies can ask without re-entering conversation_members own policy (42P17). Boolean only, always about auth.uid() - exposes no rows and cannot be asked about anyone else.';

revoke all on function public.chat_is_member(uuid) from public, anon, authenticated;
grant execute on function public.chat_is_member(uuid) to authenticated;

-- Same idea, one level up: "may the caller see this message". Used by
-- message_reactions, which keys off a message rather than a conversation.
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
  'Is the caller a member of the conversation this message belongs to? SECURITY DEFINER, boolean only, always about auth.uid().';

revoke all on function public.chat_can_see_message(uuid) from public, anon, authenticated;
grant execute on function public.chat_can_see_message(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. The policy that was recursing - same rule, asked safely
-- ---------------------------------------------------------------------

drop policy if exists "conv_members_select_mine" on public.conversation_members;
create policy "conv_members_select_mine"
  on public.conversation_members for select
  to authenticated
  using ( public.chat_is_member(conversation_members.conversation_id) );

-- ---------------------------------------------------------------------
-- 3. messages' own select rule, through the same function
--
-- Not strictly required once conversation_members no longer recurses,
-- but it saves evaluating a second table's policy for every message row
-- read, and states the rule in the same terms as everything around it.
-- The rule itself is unchanged: you see messages in conversations you
-- belong to.
-- ---------------------------------------------------------------------

drop policy if exists "messages_select_mine" on public.messages;
create policy "messages_select_mine"
  on public.messages for select
  to authenticated
  using ( public.chat_is_member(messages.conversation_id) );

-- ---------------------------------------------------------------------
-- 4. message_reactions - as 20260820190000 set them, restated so this
--    file stands alone
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

drop policy if exists "message_reactions_delete_own" on public.message_reactions;
create policy "message_reactions_delete_own"
  on public.message_reactions for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

notify pgrst, 'reload schema';
