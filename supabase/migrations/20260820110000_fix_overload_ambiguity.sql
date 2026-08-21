-- =====================================================================
-- Fix: "function ... is not unique" when sending a chat message or a
-- forum post
--
-- create or replace only replaces a function with the exact same
-- parameter list - adding reply_to (then, for forum_post, mentions too)
-- changed the parameter list each time, which creates a brand new
-- overloaded function rather than replacing the old one. The old, shorter
-- signatures were never dropped, so chat_send/chat_send_core/forum_post
-- have all been living as two or three overloads at once since
-- 20260820090000 and 20260820100000.
--
-- PostgREST calls RPCs with named parameters. A call that omits reply_to
-- (or mentions) no longer has one obvious meaning once more than one
-- overload exists - "call the shorter-signature version" and "call the
-- longer one and let the omitted parameter default to null" are both
-- valid readings, and Postgres refuses to guess. That is exactly the "is
-- not unique" error this produced.
--
-- The fix is only to remove the leftover old-signature copies, not to
-- change any behaviour - once exactly one version of each function
-- exists, every existing call site (chat_send_as's 3-argument positional
-- call to chat_send_core included) resolves unambiguously again, with
-- Postgres filling in the trailing default itself.
--
-- Safe to re-run.
-- =====================================================================

drop function if exists public.chat_send(uuid, text);
drop function if exists public.chat_send_core(uuid, uuid, text);
drop function if exists public.forum_post(uuid, text);
drop function if exists public.forum_post(uuid, text, uuid);
