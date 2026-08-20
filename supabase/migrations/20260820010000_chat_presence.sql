-- ---------------------------------------------------------------------
-- Chat threads, extended with presence
--
-- The inbox row wants the same online dot every other member card already
-- shows (frOnlineDot / friendsIsOnline), but chat_threads never returned
-- last_active_at - only member_cards' privacy-gated column does, and
-- chat_threads already joins that view for display_name/avatar. Adding the
-- one column is enough; the privacy gate (show_last_active, and whether the
-- dot even renders at all) lives in the view and in frOnlineDot already, and
-- needs no change here.
--
-- Dropped and recreated, same reason as every other RETURNS TABLE change in
-- this project: create or replace cannot alter the return type. Body is
-- otherwise identical to social.sql's version - archived/cleared handling
-- untouched.
-- ---------------------------------------------------------------------

drop function if exists public.chat_threads(boolean);

create or replace function public.chat_threads(include_archived boolean default false)
returns table (
  friend_id uuid, display_name text, avatar text,
  last_body text, last_at timestamptz, unread integer, archived boolean,
  last_active_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  with mine as (
    select cm.conversation_id, cm.last_read_at, cm.archived_at, cm.cleared_at
    from public.conversation_members cm where cm.user_id = auth.uid()
  ),
  other as (
    select cm.conversation_id, cm.user_id
    from public.conversation_members cm
    where cm.user_id <> auth.uid()
      and cm.conversation_id in (select conversation_id from mine)
  ),
  last_msg as (
    select distinct on (m.conversation_id) m.conversation_id, m.body, m.created_at
    from public.messages m
    join mine mi2 on mi2.conversation_id = m.conversation_id
    where mi2.cleared_at is null or m.created_at > mi2.cleared_at
    order by m.conversation_id, m.created_at desc
  )
  select o.user_id, mc.display_name, mc.avatar, lm.body, lm.created_at,
    (select count(*)::int from public.messages m2
      where m2.conversation_id = o.conversation_id
        and m2.sender_id <> auth.uid()
        and m2.created_at > greatest(coalesce(mi.last_read_at, 'epoch'::timestamptz),
                                     coalesce(mi.cleared_at, 'epoch'::timestamptz))),
    (mi.archived_at is not null),
    mc.last_active_at
  from other o
  join mine mi on mi.conversation_id = o.conversation_id
  join public.member_cards mc on mc.id = o.user_id
  left join last_msg lm on lm.conversation_id = o.conversation_id
  where not public.is_blocked(auth.uid(), o.user_id)
    and (include_archived or mi.archived_at is null)
  order by lm.created_at desc nulls last;
$$;

revoke all on function public.chat_threads(boolean) from anon, authenticated;
grant execute on function public.chat_threads(boolean) to authenticated;

-- chat_unread_total calls chat_threads(false) by name+signature, which still
-- resolves correctly to this new definition - no change needed there.
