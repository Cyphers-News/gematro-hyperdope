-- =====================================================================
-- Remove the social feed
--
-- 20260806070000_social.sql is staying. Despite its name most of it is the
-- chat work — chat_archive, chat_clear, chat_history, chat_threads,
-- chat_unread_total — plus member_report and admin_reports, all of which are
-- still in use. Only its last section, "3. The feed", belonged to the removed
-- feature.
--
-- That file is not edited to take the feed out of it. It has already run
-- against the live database, and rewriting a migration after the fact makes
-- the recorded history disagree with what actually happened. A migration that
-- drops the objects afterwards is honest about the sequence and, unlike an
-- edit, also converges a database that has already applied the original.
--
-- WHAT THIS DELETES: every post anyone wrote, and every like. Nothing else
-- reads these tables, so nothing else breaks — but the rows do not come back.
-- Count them before you run this if you want to know what you are losing:
--
--   select (select count(*) from public.posts)      as posts,
--          (select count(*) from public.post_likes) as likes;
-- =====================================================================

drop function if exists public.post_create(text, jsonb, text);
drop function if exists public.feed_list(text, integer, integer);
drop function if exists public.post_like(uuid, boolean);

-- post_likes has a cascading reference to posts, so it would go either way.
-- It is named anyway: an explicit drop says it was meant, and the order means
-- this reads correctly whether or not the reference is still there.
drop table if exists public.post_likes;
drop table if exists public.posts;
