-- =====================================================================
-- Member tour progress
--
-- One row per member: has the welcome prompt been shown, and which of the
-- three guided-tour sections (calculator/member/social) are done. Purely
-- personal, single-row-per-user data with no cross-user concern at all -
-- same shape as presets or
-- history_entries, so plain self-row RLS is enough; nothing here needs the
-- security-definer-function pattern chat/reports/forum need specifically
-- because those involve moderation or another person's data.
--
-- tour_version exists so a future redesign of the tour can be offered again
-- to members who finished the current one, without the migration doing
-- anything - the client just compares its own TOUR_VERSION constant
-- (calc/tour.js) against the stored value and treats a mismatch as "not
-- prompted for this version yet".
--
-- Safe to re-run.
-- =====================================================================

create table if not exists public.member_tour_progress (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  tour_version    integer not null default 1,
  prompted        boolean not null default false,
  sections_done   text[] not null default '{}',
  updated_at      timestamptz not null default now()
);

comment on table public.member_tour_progress is
  'Guided-tour progress, one row per member. See calc/tour.js.';

drop trigger if exists member_tour_progress_touch_updated_at on public.member_tour_progress;
create trigger member_tour_progress_touch_updated_at
  before update on public.member_tour_progress
  for each row execute function public.touch_updated_at();

alter table public.member_tour_progress enable row level security;

drop policy if exists "member_tour_progress_select_own" on public.member_tour_progress;
create policy "member_tour_progress_select_own"
  on public.member_tour_progress for select
  to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "member_tour_progress_insert_own" on public.member_tour_progress;
create policy "member_tour_progress_insert_own"
  on public.member_tour_progress for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "member_tour_progress_update_own" on public.member_tour_progress;
create policy "member_tour_progress_update_own"
  on public.member_tour_progress for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- no delete policy - there is nothing to delete, only reset (an update back
-- to defaults, which "Guided Tour" under About → Cyphers (Info) does
-- client-side)

revoke all on public.member_tour_progress from anon, authenticated;
grant select, insert, update on public.member_tour_progress to authenticated;
