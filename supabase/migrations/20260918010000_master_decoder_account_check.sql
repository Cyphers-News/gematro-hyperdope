-- =====================================================================
-- Master Decoder - account status is checked on every play, not only at start
--
-- 20260918000000_master_decoder.sql calls account_check() in
-- master_decoder_start() only. An account banned or suspended in the middle
-- of a round could therefore still fetch its first word and keep answering
-- - and have correct answers credited to master_decoder_scores - until that
-- round's sixty seconds ran out. The board already leaves such accounts off
-- (account_active() in master_decoder_board()), but the requirement is that
-- they cannot submit at all.
--
-- This re-issues master_decoder_word() and master_decoder_answer() with the
-- same account_check() master_decoder_start() uses, placed straight after the
-- signed-in check. Nothing else in either function changes: same signature,
-- same return shape, same rules. CREATE OR REPLACE keeps the existing grants
-- (authenticated only); they are restated below anyway so this file stands
-- on its own.
--
-- No table, column, row or other function is touched. Safe to re-run.
-- Depends on 20260918000000_master_decoder.sql and 20260806030000_admin.sql.
-- =====================================================================


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
  -- banned, or suspended and still inside the suspension: no more play,
  -- even in a round that was started before the ban landed
  perform public.account_check(me);

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
  -- banned, or suspended and still inside the suspension: no more play,
  -- even in a round that was started before the ban landed
  perform public.account_check(me);
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


revoke all on function public.master_decoder_word(uuid) from public, anon, authenticated;
revoke all on function public.master_decoder_answer(uuid, integer) from public, anon, authenticated;
grant execute on function public.master_decoder_word(uuid) to authenticated;
grant execute on function public.master_decoder_answer(uuid, integer) to authenticated;
