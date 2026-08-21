-- =====================================================================
-- Deleting your own forum message
--
-- WHY THIS MIGRATION IS NEEDED
--
-- public.messages (private chat) has had a delete path since chat
-- shipped - the messages_delete_own policy, finally made usable by the
-- DELETE grant in 20260820120000_security_audit_fixes.sql. Forum
-- messages have never had one: public.forum_messages is granted SELECT
-- only, with no delete policy anywhere, so nobody - not even the author -
-- can remove a forum post. Adding the same control to both surfaces
-- needs a server-side path on the forum side first.
--
-- WHY A FUNCTION RATHER THAN A POLICY + GRANT
--
-- forum_topics.message_count is a stored counter that forum_post()
-- increments on every post. A plain "grant delete + delete policy" would
-- let the row go while leaving that counter overstated for ever, and the
-- topic feed reads the counter, not a live count. Doing the delete and
-- the decrement together inside one security definer function keeps the
-- two in step in a single transaction, the same way forum_post keeps
-- them in step on the way up.
--
-- WHAT DELETING TAKES WITH IT
--
-- Rows that only exist to describe this message go with it, by the
-- foreign keys already declared on those tables (all "on delete
-- cascade"): its reactions, its @mentions, and the notifications that
-- pointed at it. Two things deliberately do NOT vanish:
--   * reports (reports.forum_message_id is "on delete set null") - a
--     report must outlive the message it is about, or deleting your own
--     post would erase the evidence of it.
--   * replies to it - forum_messages.reply_to is "on delete set null",
--     so a reply survives with its pointer cleared and renders through
--     the reply preview's "Original message unavailable" state
--     (frReplyQuoteHtml, calc/social-reply.js) rather than disappearing
--     along with the message it answered.
--
-- Owner-only, deliberately. Admin/moderator deletion of anyone's post is
-- a separate feature with its own audit trail requirements (it was
-- flagged as a gap in the security audit and stays open) - this adds the
-- author's own control and nothing wider.
--
-- Backward compatible: one new function. No table, column, policy or
-- existing function is altered. No rows change until somebody chooses to
-- delete something.
--
-- ROLLBACK
--   drop function if exists public.forum_message_delete(uuid);
-- Nothing else to undo - no schema was changed. Already-deleted messages
-- are not recoverable by dropping the function, the same as any delete.
--
-- Safe to re-run.
-- =====================================================================

create or replace function public.forum_message_delete(target uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me  uuid := auth.uid();
  tid uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;

  -- Ownership is the lookup, not a separate check afterwards: selecting
  -- with "and fm.user_id = me" means somebody else's message and a
  -- message that never existed are indistinguishable from out here,
  -- which is the honest answer to both.
  select fm.topic_id into tid
    from public.forum_messages fm
   where fm.id = target and fm.user_id = me;

  if tid is null then
    raise exception 'That message is not yours, or is no longer there';
  end if;

  delete from public.forum_messages where id = target;

  -- greatest(...,0) rather than a bare subtraction: the counter is
  -- stored, and a topic whose count has drifted low for any reason
  -- should not be pushed negative by a legitimate delete.
  update public.forum_topics ft
     set message_count = greatest(0, ft.message_count - 1)
   where ft.id = tid;

  return true;
end;
$$;

revoke all on function public.forum_message_delete(uuid) from public, anon, authenticated;
grant execute on function public.forum_message_delete(uuid) to authenticated;

notify pgrst, 'reload schema';
