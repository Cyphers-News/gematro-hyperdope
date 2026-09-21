-- =====================================================================
-- Master Decoder - server-run rounds and a monthly leaderboard
--
-- Features -> Master Decoder (calc/master-decoder.js). A word appears, the
-- player types its cipher sum, sixty seconds, as many as they can.
--
-- WHY THE ROUND LIVES HERE AND NOT IN THE BROWSER
--
-- The standalone game this was adapted from sent its final score from the
-- browser and the database took it on trust within a 0..50 range - which
-- its own notes admitted anyone could fill in from the console. Here the
-- browser never reports a score at all. The database:
--
--   * picks every word (master_decoder_pick_word) and keeps its sum out of
--     reach - master_decoder_rounds has no grant and no policy
--   * checks every answer against its own sum (master_decoder_answer)
--   * keeps the clock: nothing before the countdown ends, nothing after the
--     sixty seconds (plus a short grace for the network), and nothing
--     sooner than 1.2s after the previous word - the pause the game has
--     always had between words, which is what caps a round at about 50
--   * credits the score itself, one correct answer at a time
--
-- What it cannot stop is a script that does the arithmetic - the sums of
-- A..Z are not a secret. It can only hold such a script to exactly the pace
-- a person gets, which puts it on the same board as a very fast person
-- rather than at 999999.
--
-- THE MONTHLY RESET
--
-- Every round is stamped with a period, 'YYYY-MM', computed here from now()
-- in UTC when the round starts - never taken from the browser. Scores are
-- kept per (player, period, cipher). The board only ever reads the current
-- period, so on the 1st of the month (00:00 UTC) the new month's board
-- starts empty by itself: no cron job, nothing deleted. Previous months
-- stay in master_decoder_scores as history and simply stop being read.
-- A round started before midnight counts toward the month it started in.
--
-- Who is shown: the same display rule as every other board here
-- (public_profiles, 20260802030000_submissions_leaderboard.sql) - chosen
-- username, then Discord name, then 'Anonymous', and an avatar. Never
-- email. Banned accounts, and suspended ones still inside their
-- suspension, cannot start a round and are left off the board
-- (account_check / account_active, 20260806030000_admin.sql).
--
-- Everything is callable by signed-in members only, same as the rest of
-- this schema - nothing here is granted to anon.
--
-- Depends on: 20260802000000_auth_profiles.sql (profiles,
-- touch_updated_at), 20260802040000_avatars.sql (profiles.avatar_url),
-- 20260806030000_admin.sql (account_check, account_active).
--
-- Additive only: two new tables and new functions. No existing table,
-- function or row is touched.
--
-- Safe to re-run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- One row per round played. Holds the word currently in play and its sum,
-- which is why nothing but the functions below can read it.
create table if not exists public.master_decoder_rounds (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  cipher_mode    text        not null,
  period         text        not null,
  started_at     timestamptz not null default now(),
  play_from      timestamptz not null,   -- end of the five second countdown
  ends_at        timestamptz not null,   -- play_from + sixty seconds
  word           text,                   -- the word in play, null until the first is served
  word_sum       integer,                -- its sum in cipher_mode
  word_ready_at  timestamptz,            -- answers before this are refused
  answered       integer     not null default 0,
  correct        integer     not null default 0,
  closed_at      timestamptz,
  constraint master_decoder_rounds_cipher_valid check (cipher_mode in ('ordinal', 'reduced')),
  constraint master_decoder_rounds_period_valid check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint master_decoder_rounds_counts_valid check (correct >= 0 and answered >= correct and answered <= 1000)
);

comment on table public.master_decoder_rounds is
  'One row per Master Decoder round. Written and read only by the master_decoder_* functions - no grant, no policy - because it holds the answer to the word in play.';

create index if not exists master_decoder_rounds_user_idx
  on public.master_decoder_rounds (user_id, started_at desc);

-- A player's best per month per cipher. The board reads this.
create table if not exists public.master_decoder_scores (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  period         text        not null,
  cipher_mode    text        not null,
  best_score     integer     not null default 0,
  best_at        timestamptz,
  plays          integer     not null default 0,
  last_played_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint master_decoder_scores_pkey primary key (user_id, period, cipher_mode),
  constraint master_decoder_scores_cipher_valid check (cipher_mode in ('ordinal', 'reduced')),
  constraint master_decoder_scores_period_valid check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint master_decoder_scores_score_range  check (best_score >= 0 and best_score <= 1000),
  constraint master_decoder_scores_plays_valid  check (plays >= 0)
);

comment on table public.master_decoder_scores is
  'Best Master Decoder score per player, per month (period YYYY-MM, UTC), per cipher. Written only by master_decoder_start/master_decoder_answer. Past months are kept as history; the board reads the current month only.';

create index if not exists master_decoder_scores_board_idx
  on public.master_decoder_scores (period, cipher_mode, best_score desc, best_at asc);

drop trigger if exists master_decoder_scores_touch_updated_at on public.master_decoder_scores;
create trigger master_decoder_scores_touch_updated_at
  before update on public.master_decoder_scores
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------
-- 2. Row Level Security
--
-- On, with no policy at all on either table, and no grant: the functions
-- below are the only way in or out. Same reasoning as forum_messages and
-- chat - a policy can say who is writing, not what goes in every column.
-- ---------------------------------------------------------------------

alter table public.master_decoder_rounds enable row level security;
alter table public.master_decoder_scores enable row level security;

revoke all on public.master_decoder_rounds from anon, authenticated;
revoke all on public.master_decoder_scores from anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. Internal helpers - not callable by any client
-- ---------------------------------------------------------------------

-- The leaderboard month a moment belongs to. UTC, so the reset happens at
-- one instant for everybody.
create or replace function public.master_decoder_period(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_at at time zone 'UTC', 'YYYY-MM');
$$;

-- The game's word list, unchanged from the standalone game's 2026 build.
create or replace function public.master_decoder_pick_word()
returns text
language sql
volatile
set search_path = ''
as $$
  select w.list[1 + floor(random() * array_length(w.list, 1))::integer]
  from (select array[
    'World', 'New York', 'Magic', 'Coding', 'Love', 'Freedom', 'Journey',
    'Mystery', 'Harmony', 'Wisdom', 'Destiny', 'Balance', 'Fortune',
    'Legacy', 'Horizon'
  ] as list) w;
$$;

-- Ordinal: A=1 .. Z=26. Reduced: A..I = 1..9, J..R = 1..9, S..Z = 1..8.
-- Anything that is not A-Z (the space in "New York") counts for nothing.
-- mdLetterValue() in calc/master-decoder.js is the same rule, used there
-- only for the hover reveal.
create or replace function public.master_decoder_sum(p_word text, p_mode text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum(
           case when p_mode = 'reduced' then ((ascii(t.c) - 65) % 9) + 1
                else ascii(t.c) - 64
           end), 0)::integer
  from regexp_split_to_table(upper(coalesce(p_word, '')), '') as t(c)
  where t.c ~ '^[A-Z]$';
$$;

revoke all on function public.master_decoder_period(timestamptz) from public, anon, authenticated;
revoke all on function public.master_decoder_pick_word() from public, anon, authenticated;
revoke all on function public.master_decoder_sum(text, text) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. Starting a round
--
-- Closes any round the player still has open (a reload, a closed panel),
-- opens a new one whose countdown starts now, and counts the play. The
-- first word is not handed out here - see master_decoder_word() - so it
-- cannot be read during the countdown.
--
-- Rate limit: a round takes 65 seconds, so fifteen starts in ten minutes is
-- already more than anybody can play; it exists to bound the table, not to
-- pace the game.
-- ---------------------------------------------------------------------

create or replace function public.master_decoder_start(p_cipher_mode text)
returns table (round_id uuid, period text, countdown_ms integer, round_ms integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me       uuid := (select auth.uid());
  v_period text := public.master_decoder_period(now());
  v_recent integer;
  v_id     uuid;
begin
  if me is null then
    raise exception 'Sign in to play Master Decoder.';
  end if;
  perform public.account_check(me);

  if p_cipher_mode is null or p_cipher_mode not in ('ordinal', 'reduced') then
    raise exception 'Unknown cipher.';
  end if;

  select count(*) into v_recent
  from public.master_decoder_rounds r
  where r.user_id = me and r.started_at > now() - interval '10 minutes';
  if v_recent >= 15 then
    raise exception 'Too many rounds started. Wait a few minutes and try again.';
  end if;

  update public.master_decoder_rounds r
     set closed_at = now()
   where r.user_id = me and r.closed_at is null;

  insert into public.master_decoder_rounds (user_id, cipher_mode, period, play_from, ends_at)
  values (me, p_cipher_mode, v_period, now() + interval '5 seconds', now() + interval '65 seconds')
  returning id into v_id;

  insert into public.master_decoder_scores as s (user_id, period, cipher_mode, plays, last_played_at)
  values (me, v_period, p_cipher_mode, 1, now())
  on conflict on constraint master_decoder_scores_pkey do update
    set plays = s.plays + 1,
        last_played_at = now();

  return query select v_id, v_period, 5000, 60000;
end;
$$;

comment on function public.master_decoder_start(text) is
  'Opens a Master Decoder round for auth.uid() - never a caller-supplied id. Closes any open round of theirs first. The period (YYYY-MM, UTC) is fixed here, server-side.';


-- ---------------------------------------------------------------------
-- 5. The first word, once the countdown is over
--
-- 300ms of tolerance either side of play_from for clock and network. Asking
-- twice returns the same word rather than a fresh one.
-- ---------------------------------------------------------------------

create or replace function public.master_decoder_word(p_round_id uuid)
returns table (word text, time_left_ms integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me     uuid := (select auth.uid());
  r      public.master_decoder_rounds;
  v_word text;
begin
  if me is null then
    raise exception 'Sign in to play Master Decoder.';
  end if;

  select * into r
  from public.master_decoder_rounds x
  where x.id = p_round_id and x.user_id = me
  for update;

  if not found or r.closed_at is not null then
    raise exception 'This round is no longer running.';
  end if;
  if now() < r.play_from - interval '300 milliseconds' then
    raise exception 'The round has not started yet.';
  end if;
  if now() >= r.ends_at then
    raise exception 'Time is up.';
  end if;

  v_word := r.word;
  if v_word is null then
    v_word := public.master_decoder_pick_word();
    update public.master_decoder_rounds x
       set word = v_word,
           word_sum = public.master_decoder_sum(v_word, x.cipher_mode),
           word_ready_at = now()
     where x.id = r.id;
  end if;

  return query select v_word,
    greatest(0, floor(extract(epoch from (r.ends_at - now())) * 1000))::integer;
end;
$$;

comment on function public.master_decoder_word(uuid) is
  'Serves the first word of the caller''s own round, and only once its countdown is over.';


-- ---------------------------------------------------------------------
-- 6. Answering
--
-- Locks the round row, so two answers sent at once cannot both be counted
-- against the same word. Right or wrong, the next word is chosen now but
-- is not answerable for 1.2 seconds - the pause the game shows the result
-- for. A correct answer raises the player's best for the round's month as
-- it happens, so a closed tab or a lost connection keeps what was earned.
--
-- 1.5s of grace after ends_at is for an answer sent in the last moment
-- that is still in flight when the clock runs out.
-- ---------------------------------------------------------------------

create or replace function public.master_decoder_answer(p_round_id uuid, p_answer integer)
returns table (
  is_correct   boolean,
  correct_sum  integer,
  score        integer,
  next_word    text,
  next_in_ms   integer,
  time_left_ms integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me      uuid := (select auth.uid());
  r       public.master_decoder_rounds;
  v_ok    boolean;
  v_next  text;
  v_score integer;
begin
  if me is null then
    raise exception 'Sign in to play Master Decoder.';
  end if;
  if p_answer is null then
    raise exception 'Please enter a valid number.';
  end if;

  select * into r
  from public.master_decoder_rounds x
  where x.id = p_round_id and x.user_id = me
  for update;

  if not found or r.closed_at is not null or r.word is null then
    raise exception 'This round is no longer running.';
  end if;
  if now() > r.ends_at + interval '1500 milliseconds' then
    raise exception 'Time is up.';
  end if;
  if now() < r.word_ready_at - interval '50 milliseconds' then
    raise exception 'Too fast. Wait for the next word.';
  end if;

  v_ok := (p_answer = r.word_sum);
  v_next := public.master_decoder_pick_word();

  update public.master_decoder_rounds x
     set answered = x.answered + 1,
         correct = x.correct + case when v_ok then 1 else 0 end,
         word = v_next,
         word_sum = public.master_decoder_sum(v_next, x.cipher_mode),
         word_ready_at = now() + interval '1200 milliseconds'
   where x.id = r.id
  returning x.correct into v_score;

  if v_ok then
    update public.master_decoder_scores s
       set best_score = v_score,
           best_at = now()
     where s.user_id = me
       and s.period = r.period
       and s.cipher_mode = r.cipher_mode
       and s.best_score < v_score;
  end if;

  return query select v_ok, r.word_sum, v_score, v_next, 1200,
    greatest(0, floor(extract(epoch from (r.ends_at - now())) * 1000))::integer;
end;
$$;

comment on function public.master_decoder_answer(uuid, integer) is
  'Checks an answer against the server''s own sum for the word in play, enforces the round clock and the 1.2s pause between words, and credits the caller''s monthly best.';


-- ---------------------------------------------------------------------
-- 7. Ending a round
--
-- Closes it and returns the score as the server counted it, which is the
-- one the game shows. Calling it on an already-closed round of your own
-- just reads the result back.
-- ---------------------------------------------------------------------

create or replace function public.master_decoder_finish(p_round_id uuid)
returns table (score integer, period text, best_score integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Sign in to play Master Decoder.';
  end if;

  update public.master_decoder_rounds x
     set closed_at = now()
   where x.id = p_round_id and x.user_id = me and x.closed_at is null;

  return query
    select r.correct, r.period, coalesce(s.best_score, 0)
    from public.master_decoder_rounds r
    left join public.master_decoder_scores s
      on s.user_id = r.user_id and s.period = r.period and s.cipher_mode = r.cipher_mode
    where r.id = p_round_id and r.user_id = me;

  if not found then
    raise exception 'This round could not be found.';
  end if;
end;
$$;

comment on function public.master_decoder_finish(uuid) is
  'Closes the caller''s own round and returns the server-counted score.';


-- ---------------------------------------------------------------------
-- 8. The board - current month only
--
-- The month is decided here, not by the caller. Rows with no correct
-- answer yet are left off (a play is counted before the first answer), as
-- are banned and currently-suspended accounts. Ties go to whoever got
-- there first.
--
-- Returns one object so the panel needs one call:
--   { period, resets_on, rows: [{pos, user_id, display_name, avatar,
--     best_score, is_me}], mine: {best_score, plays, pos} | null }
-- ---------------------------------------------------------------------

create or replace function public.master_decoder_board(p_cipher_mode text, p_limit integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me       uuid := (select auth.uid());
  v_period text := public.master_decoder_period(now());
  v_resets text := to_char(date_trunc('month', now() at time zone 'UTC') + interval '1 month', 'YYYY-MM-DD');
  v_lim    integer := least(greatest(coalesce(p_limit, 10), 1), 50);
  v_rows   jsonb;
  v_pos    integer;
  v_mine   jsonb;
begin
  if me is null then
    raise exception 'Sign in to see the Master Decoder leaderboard.';
  end if;
  if p_cipher_mode is null or p_cipher_mode not in ('ordinal', 'reduced') then
    raise exception 'Unknown cipher.';
  end if;

  with ranked as (
    select
      s.user_id,
      s.best_score,
      coalesce(p.username, p.discord_username, 'Anonymous') as display_name,
      coalesce(p.avatar_url, p.discord_avatar)               as avatar,
      row_number() over (order by s.best_score desc, s.best_at asc, s.user_id) as pos
    from public.master_decoder_scores s
    join public.profiles p on p.id = s.user_id
    where s.period = v_period
      and s.cipher_mode = p_cipher_mode
      and s.best_score > 0
      and public.account_active(s.user_id)
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'pos', k.pos,
      'user_id', k.user_id,
      'display_name', k.display_name,
      'avatar', k.avatar,
      'best_score', k.best_score,
      'is_me', k.user_id = me
    ) order by k.pos) filter (where k.pos <= v_lim), '[]'::jsonb),
    max(k.pos) filter (where k.user_id = me)
  into v_rows, v_pos
  from ranked k;

  select jsonb_build_object('best_score', s.best_score, 'plays', s.plays, 'pos', v_pos)
  into v_mine
  from public.master_decoder_scores s
  where s.user_id = me and s.period = v_period and s.cipher_mode = p_cipher_mode;

  return jsonb_build_object(
    'period', v_period,
    'resets_on', v_resets,
    'rows', v_rows,
    'mine', v_mine
  );
end;
$$;

comment on function public.master_decoder_board(text, integer) is
  'Current-month Master Decoder board for one cipher. Display name and avatar only - never email. The month is computed server-side (UTC).';


-- ---------------------------------------------------------------------
-- 9. Grants - signed-in members only
-- ---------------------------------------------------------------------

revoke all on function public.master_decoder_start(text) from public, anon, authenticated;
revoke all on function public.master_decoder_word(uuid) from public, anon, authenticated;
revoke all on function public.master_decoder_answer(uuid, integer) from public, anon, authenticated;
revoke all on function public.master_decoder_finish(uuid) from public, anon, authenticated;
revoke all on function public.master_decoder_board(text, integer) from public, anon, authenticated;

grant execute on function public.master_decoder_start(text) to authenticated;
grant execute on function public.master_decoder_word(uuid) to authenticated;
grant execute on function public.master_decoder_answer(uuid, integer) to authenticated;
grant execute on function public.master_decoder_finish(uuid) to authenticated;
grant execute on function public.master_decoder_board(text, integer) to authenticated;
