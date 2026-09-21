-- =====================================================================
-- Usernames: required for new sign-ups, asked of existing members
--
-- WHY
--
-- A username was optional: the sign-up form never asked for one, the
-- welcome wizard's name step said "leave it empty", and anything that shows
-- a member fell back to their Discord name and then to 'Anonymous'. That
-- made accounts hard to tell apart exactly when it matters - a report, a
-- moderation decision, a leaderboard. On 2026-09-19 22 of 73 accounts had no
-- username (21 email sign-ups, 1 Discord).
--
-- The database also had no rules of its own for a username beyond a
-- case-insensitive unique index. The length and character rules lived only
-- in three browser forms (which did not agree with each other), and a member
-- can write profiles.username directly, so anything at all could be set by
-- calling the API instead of using a form.
--
-- WHAT THIS DOES
--
--  1. One set of rules, here, in username_problem(): 2-32 characters after
--     tidying (Unicode NFKC, outer whitespace trimmed, inner runs collapsed),
--     letters, numbers, space, dot, dash, underscore; starting and ending
--     with a letter or number; no doubled separators; and a short list of
--     names reserved for staff/system identities (admin, moderator, support,
--     system, anonymous...) that only an administrator may use. The browser
--     mirrors these rules (authUsernameProblem in auth/auth.js) for instant
--     feedback, but this is the one that decides.
--
--  2. profiles_username_guard: every insert, and every update that changes
--     the username, goes through those rules and a uniqueness check. A
--     username can be changed but never removed. Names that already exist are
--     left exactly as their owners chose them - they are only checked if the
--     owner changes them (two existing names predate these rules: one uses a
--     symbol, one is a reserved word on an admin account).
--
--  3. Uniqueness ignores case, separators and look-alike Unicode forms:
--     "Joe.Smith", "joe smith" and "JoeSmith" are one name, so an account
--     cannot pass itself off as another with a dot. Checked before adding:
--     no two existing names collide under this rule.
--
--  4. Sign-up: an email sign-up must carry a valid, available username in
--     its metadata, or the database refuses to create the account.
--     (Administrators creating a user in the dashboard must put
--     {"username": "..."} in the user metadata.) A Discord sign-up has no
--     form to ask on, so it may arrive without one and is asked on first
--     sign-in.
--
--  5. username_check(name): the sign-up form asks this before submitting, so
--     "already taken" is a clear message rather than a failed sign-up. It is
--     the one function granted to anon, deliberately: usernames are public,
--     and all it says is whether a name is free. It returns no ids.
--
--  6. Existing accounts without a username are left exactly as they are.
--     Nothing here renames, fills in, disables or removes them, and nothing
--     is locked: they keep full use of their account - chat, forum,
--     friends, phrase submissions, Master Decoder - with their data,
--     settings, scores and id untouched. The site asks them to choose a name
--     each time they sign in or open it (auth/username-gate.js) and saves it
--     to the same profile row. account_check() and the phrase_submissions
--     insert policy are deliberately NOT changed by this migration.
--
--  7. master_decoder_board: fixed and tightened.
--     BUG: it filtered rows with account_active(s.user_id). account_active()
--     answers false for anyone other than the caller unless the caller is an
--     admin (so it cannot be used to learn another member's ban status), so a
--     normal member saw only their own row on the board. It now reads the
--     joined profile's status directly. Members are listed by username; a
--     member who has not chosen one yet stays on the board (their scores
--     count) with their Discord name if they have one, otherwise no name -
--     never a stored or invented 'Anonymous'. The site labels those rows
--     "no username yet".
--
-- NOT DONE HERE, deliberately: profiles.username is NOT set NOT NULL. Discord
-- accounts arrive without one and the 22 existing accounts have not chosen
-- yet; the constraint belongs in a later migration once they have (see the
-- query at the end).
--
-- No row is changed. Safe to re-run. Reload the PostgREST schema cache after.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The rules
-- ---------------------------------------------------------------------

-- Tidy: NFKC (so full-width and other compatibility forms become ordinary
-- characters), outer whitespace off, inner whitespace runs to one space.
create or replace function public.username_normalize(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(regexp_replace(normalize(coalesce(p_name, ''), NFKC), '^\s+|\s+$', '', 'g'), '\s+', ' ', 'g'),
    '');
$$;

-- The identity of a name for uniqueness: case, separators and compatibility
-- forms do not make two names different.
create or replace function public.username_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(normalize(coalesce(p_name, ''), NFKC), '[\s._\-]', '', 'g'));
$$;

-- null when the name is acceptable, otherwise a sentence a member can read.
create or replace function public.username_problem(p_name text, p_allow_reserved boolean default false)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  n text := public.username_normalize(p_name);
  k text;
begin
  if n is null then
    return 'Choose a username.';
  end if;
  if char_length(n) < 2 or char_length(n) > 32 then
    return 'Use between 2 and 32 characters.';
  end if;
  if n !~ '^[A-Za-z0-9 ._\-]+$' then
    return 'Use letters, numbers, spaces, dots, dashes and underscores only.';
  end if;
  if n !~ '^[A-Za-z0-9]' or n !~ '[A-Za-z0-9]$' then
    return 'Start and end with a letter or a number.';
  end if;
  if n ~ '[ ._\-]{2}' then
    return 'Do not put two spaces, dots, dashes or underscores together.';
  end if;
  if not p_allow_reserved then
    k := public.username_key(n);
    if k in ('admin', 'administrator', 'admins', 'mod', 'mods', 'moderator', 'moderators',
             'support', 'system', 'staff', 'root', 'owner', 'superuser', 'sysadmin',
             'security', 'help', 'helpdesk', 'official', 'cyphers', 'cyphersnews',
             'cyphersofficial', 'cyphersteam', 'anonymous', 'anon', 'unknown', 'guest',
             'user', 'member', 'nobody', 'null', 'undefined', 'deleted', 'deleteduser')
       or k like '%admin%' or k like '%moderator%'
    then
      return 'That name is reserved. Please choose another.';
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.username_normalize(text) from public, anon, authenticated;
revoke all on function public.username_key(text) from public, anon, authenticated;
-- The unique index below is built on username_key(username), and Postgres
-- evaluates an index expression as the role doing the write - so a member
-- saving their own profile must be able to execute it, or every profile save
-- fails with "permission denied for function username_key". It only turns
-- text into a comparison key; it reads nothing.
grant execute on function public.username_key(text) to authenticated;
revoke all on function public.username_problem(text, boolean) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. Every write to profiles.username goes through the rules
-- ---------------------------------------------------------------------

create or replace function public.profiles_username_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  problem text;
begin
  if tg_op = 'UPDATE' and new.username is not distinct from old.username then
    return new;
  end if;

  new.username := public.username_normalize(new.username);

  if tg_op = 'UPDATE' and new.username is not distinct from old.username then
    return new; -- only the spacing changed
  end if;

  if new.username is null then
    if tg_op = 'UPDATE' and old.username is not null then
      raise exception 'A username is required - it can be changed, but not removed.';
    end if;
    return new; -- a Discord sign-up, asked for a name on first sign-in
  end if;

  problem := public.username_problem(new.username, coalesce(new.is_admin, false));
  if problem is not null then
    raise exception '%', problem;
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id <> new.id
      and p.username is not null
      and public.username_key(p.username) = public.username_key(new.username)
  ) then
    raise exception 'That username is already taken.';
  end if;

  return new;
end;
$$;

revoke all on function public.profiles_username_guard() from public, anon, authenticated;

drop trigger if exists profiles_username_guard on public.profiles;
create trigger profiles_username_guard
  before insert or update of username on public.profiles
  for each row execute function public.profiles_username_guard();

-- the backstop for two sign-ups racing for the same name
create unique index if not exists profiles_username_key_norm
  on public.profiles (public.username_key(username))
  where username is not null;


-- ---------------------------------------------------------------------
-- 3. Sign-up
--
-- Same function as before, same update path (a later sign-in or a linked
-- Discord account only ever fills blanks, and never touches the username).
-- The difference is on INSERT: the username chosen on the form arrives in
-- the user metadata and is written to the profile; an email sign-up without
-- a valid, free one is refused, which aborts the sign-up itself.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  is_discord boolean := coalesce(new.raw_app_meta_data ->> 'provider', '') = 'discord';
  chosen text;
  problem text;
begin
  if tg_op = 'INSERT' then
    chosen := public.username_normalize(meta ->> 'username');
    problem := public.username_problem(chosen, false);
    if problem is null and exists (
      select 1 from public.profiles p
      where p.username is not null and public.username_key(p.username) = public.username_key(chosen)
    ) then
      problem := 'That username is already taken.';
    end if;

    if problem is not null then
      if is_discord then
        chosen := null; -- asked on first sign-in instead
      else
        raise exception 'Username: %', problem;
      end if;
    end if;
  end if;

  insert into public.profiles (id, email, username, discord_id, discord_username, discord_avatar)
  values (
    new.id,
    new.email,
    chosen,
    case when is_discord then coalesce(meta ->> 'provider_id', meta ->> 'sub') end,
    case when is_discord then coalesce(meta ->> 'custom_claims' , meta ->> 'full_name', meta ->> 'name', meta ->> 'user_name') end,
    case when is_discord then coalesce(meta ->> 'avatar_url', meta ->> 'picture') end
  )
  on conflict (id) do update set
    -- only fill blanks; never clobber a username the user chose themselves
    email            = coalesce(excluded.email, public.profiles.email),
    discord_id       = coalesce(excluded.discord_id, public.profiles.discord_id),
    discord_username = coalesce(excluded.discord_username, public.profiles.discord_username),
    discord_avatar   = coalesce(excluded.discord_avatar, public.profiles.discord_avatar),
    updated_at       = now();

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. "Is this name free?" - for the sign-up form and the name prompt
--
-- null means yes. A signed-in member's own current name counts as free, so
-- re-saving it is not "taken".
-- ---------------------------------------------------------------------

create or replace function public.username_check(p_name text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  problem text := public.username_problem(p_name, false);
begin
  if problem is not null then
    return problem;
  end if;
  if exists (
    select 1 from public.profiles p
    where p.username is not null
      and public.username_key(p.username) = public.username_key(p_name)
      and p.id is distinct from (select auth.uid())
  ) then
    return 'That username is already taken.';
  end if;
  return null;
end;
$$;

comment on function public.username_check(text) is
  'Whether a username is acceptable and free: null, or the reason it is not. Granted to anon on purpose - usernames are public and it returns nothing else.';

revoke all on function public.username_check(text) from public, anon, authenticated;
grant execute on function public.username_check(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. (intentionally empty) No lock on accounts without a username
-- ---------------------------------------------------------------------
--
-- An earlier draft made account_check() refuse members without a username
-- and required one for phrase submissions. That locked existing members out
-- of ordinary use of their own accounts, so it was dropped: account_check()
-- and "submissions_insert_own" stay exactly as they are live (ban and
-- suspension checks only).


-- ---------------------------------------------------------------------
-- 6. Master Decoder board: other members visible again, never 'Anonymous'
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
      coalesce(p.username, p.discord_username) as display_name,
      (p.username is null)                     as needs_username,
      coalesce(p.avatar_url, p.discord_avatar) as avatar,
      row_number() over (order by s.best_score desc, s.best_at asc, s.user_id) as pos
    from public.master_decoder_scores s
    join public.profiles p on p.id = s.user_id
    where s.period = v_period
      and s.cipher_mode = p_cipher_mode
      and s.best_score > 0
      -- the status read straight off the row: account_active() answers false
      -- for anyone but the caller, which hid every other player
      and (p.status = 'active'
           or (p.status = 'suspended' and p.status_until is not null and p.status_until < now()))
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'pos', k.pos,
      'user_id', k.user_id,
      'display_name', k.display_name,
      'needs_username', k.needs_username,
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

revoke all on function public.master_decoder_board(text, integer) from public, anon, authenticated;
grant execute on function public.master_decoder_board(text, integer) to authenticated;


-- ---------------------------------------------------------------------
-- LATER, not now: once this returns 0, every account has a username and
-- profiles.username can be made NOT NULL (Discord sign-ups would then need
-- a name before the profile row is created, so handle_new_user must change
-- with it).
--
--   select count(*) from public.profiles where username is null;
-- ---------------------------------------------------------------------
