-- =====================================================================
-- Forum: topics anyone can start, open to anyone signed in to post in
--
-- Distinct from chat (private, friends-only, one conversation per pair) and
-- from the old public.posts/post_likes feed removed in
-- 20260808000000_remove_feed.sql (a single reverse-chronological stream of
-- one-off posts). This is topic-based - a member opens a subject, anyone
-- signed in can read and reply inside it - closer in shape to chat than to
-- a feed, which is why writes go through the same kind of pipeline
-- chat_send_core already does: clean the text, rate-limit, catch an
-- immediate repeat, run it past mod_check, log and refuse if it fails.
-- No table grant lets a client insert directly, same reasoning as chat and
-- reports: a policy can say who is posting but not what they put in every
-- other column.
--
-- Safe to re-run.
-- =====================================================================

create table if not exists public.forum_topics (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  created_by       uuid not null references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  message_count    integer not null default 0,
  constraint forum_topics_title_len check (length(btrim(title)) between 1 and 120),
  constraint forum_topics_desc_len check (description is null or length(description) <= 500)
);

comment on table public.forum_topics is
  'One row per forum subject. Created only through forum_topic_create() - see that function for the moderation pass every title/description goes through.';

create index if not exists forum_topics_last_message_idx on public.forum_topics (last_message_at desc);
create index if not exists forum_topics_created_idx on public.forum_topics (created_at desc);

create table if not exists public.forum_messages (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.forum_topics (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  constraint forum_messages_len check (length(btrim(body)) between 1 and 2000)
);

comment on table public.forum_messages is
  'One row per reply. Created only through forum_post() - see that function for the same moderation pass chat_send_core uses.';

create index if not exists forum_messages_topic_idx on public.forum_messages (topic_id, created_at);
create index if not exists forum_messages_user_idx on public.forum_messages (user_id);

alter table public.forum_topics enable row level security;
alter table public.forum_messages enable row level security;

drop policy if exists "forum_topics_select_all" on public.forum_topics;
create policy "forum_topics_select_all"
  on public.forum_topics for select
  to authenticated
  using ( true );

drop policy if exists "forum_messages_select_all" on public.forum_messages;
create policy "forum_messages_select_all"
  on public.forum_messages for select
  to authenticated
  using ( true );

-- no insert/update/delete policy on either table - forum_topic_create() and
-- forum_post() below are the only way in, same reasoning as chat_send_core

revoke all on public.forum_topics from anon, authenticated;
revoke all on public.forum_messages from anon, authenticated;
grant select on public.forum_topics to authenticated;
grant select on public.forum_messages to authenticated;

-- ---------------------------------------------------------------------
-- Writing - same shape as chat_send_core: clean the text, rate-limit,
-- refuse an immediate repeat, run mod_check, log and refuse if it fails.
-- Reuses mod_settings (max_len/per_minute/dupe_window) rather than a
-- second copy of the same three numbers for a second kind of message.
-- ---------------------------------------------------------------------

create or replace function public.forum_topic_create(title text, description text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg   public.mod_settings;
  chk   record;
  me    uuid := auth.uid();
  n     integer;
  clean_title text;
  clean_desc  text;
  tid   uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select s.* into cfg from public.mod_settings s where s.id;

  clean_title := btrim(regexp_replace(coalesce(title, ''), '[^\S\r\n]+', ' ', 'g'));
  if length(clean_title) = 0 then raise exception 'A topic needs a title'; end if;
  if length(clean_title) > 120 then raise exception 'Title is too long — 120 characters at most'; end if;

  clean_desc := nullif(btrim(regexp_replace(coalesce(description, ''), '[^\S\r\n]+', ' ', 'g')), '');
  if clean_desc is not null and length(clean_desc) > 500 then
    raise exception 'Description is too long — 500 characters at most';
  end if;

  select count(*) into n from public.forum_topics ft
   where ft.created_by = me and ft.created_at > now() - interval '10 minutes';
  if n >= 5 then
    raise exception 'Slow down a moment — too many topics';
  end if;

  select * into chk from public.mod_check(clean_title);
  if not chk.ok then
    insert into public.moderation_events (user_id, category, reason, action, length)
      values (me, chk.category, chk.note, 'rejected', length(clean_title));
    raise exception 'Topic not created — %', coalesce(chk.note, 'the title broke a chat rule');
  end if;

  if clean_desc is not null then
    select * into chk from public.mod_check(clean_desc);
    if not chk.ok then
      insert into public.moderation_events (user_id, category, reason, action, length)
        values (me, chk.category, chk.note, 'rejected', length(clean_desc));
      raise exception 'Topic not created — %', coalesce(chk.note, 'the description broke a chat rule');
    end if;
  end if;

  insert into public.forum_topics (title, description, created_by)
  values (clean_title, clean_desc, me)
  returning id into tid;

  return tid;
end;
$$;

create or replace function public.forum_post(topic_id uuid, body text)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg   public.mod_settings;
  chk   record;
  me    uuid := auth.uid();
  n     integer;
  clean text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.forum_topics ft where ft.id = topic_id) then
    raise exception 'That topic no longer exists';
  end if;
  select s.* into cfg from public.mod_settings s where s.id;

  clean := btrim(regexp_replace(regexp_replace(coalesce(body, ''),
             '[^\S\r\n]+', ' ', 'g'), '(\r?\n){3,}', E'\n\n', 'g'));

  if length(clean) = 0 then raise exception 'Nothing to post'; end if;
  if length(clean) > cfg.max_len then
    raise exception 'Too long — % characters at most', cfg.max_len;
  end if;

  select count(*) into n from public.forum_messages fm
   where fm.user_id = me and fm.created_at > now() - interval '1 minute';
  if n >= cfg.per_minute then
    insert into public.moderation_events (user_id, category, reason, action, length)
      values (me, 'spam', 'rate limit', 'rejected', length(clean));
    raise exception 'Slow down a moment — too many posts';
  end if;

  if exists (
    select 1 from public.forum_messages fm
    where fm.user_id = me and fm.topic_id = forum_post.topic_id and fm.body = clean
      and fm.created_at > now() - make_interval(secs => cfg.dupe_window)
  ) then
    raise exception 'You have just posted that';
  end if;

  select * into chk from public.mod_check(clean);
  if not chk.ok then
    insert into public.moderation_events (user_id, category, reason, action, length)
      values (me, chk.category, chk.note, 'rejected', length(clean));
    raise exception 'Not posted — %', coalesce(chk.note, 'it broke a chat rule');
  end if;

  update public.forum_topics ft
     set message_count = ft.message_count + 1,
         last_message_at = now()
   where ft.id = forum_post.topic_id;

  return query
    insert into public.forum_messages (topic_id, user_id, body)
    values (forum_post.topic_id, me, clean)
    returning forum_messages.id, forum_messages.created_at;
end;
$$;

-- ---------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------

create or replace function public.forum_topics_list(lim integer default 50)
returns table (
  id uuid, title text, description text,
  created_by uuid, creator_name text,
  created_at timestamptz, last_message_at timestamptz, message_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.title, t.description, t.created_by,
         coalesce(p.username, p.discord_username, 'Member'),
         t.created_at, t.last_message_at, t.message_count
  from public.forum_topics t
  left join public.profiles p on p.id = t.created_by
  order by t.last_message_at desc
  limit least(coalesce(lim, 50), 100);
$$;

create or replace function public.forum_messages_list(topic_id uuid, lim integer default 200)
returns table (
  id uuid, user_id uuid, sender_name text, sender_avatar text,
  body text, created_at timestamptz, mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.user_id,
         coalesce(pp.display_name, 'Member'), pp.avatar,
         m.body, m.created_at, (m.user_id = auth.uid())
  from public.forum_messages m
  left join public.public_profiles pp on pp.id = m.user_id
  where m.topic_id = forum_messages_list.topic_id
  order by m.created_at asc
  limit least(coalesce(lim, 200), 500);
$$;

revoke all on function public.forum_topic_create(text, text) from anon, authenticated, public;
revoke all on function public.forum_post(uuid, text) from anon, authenticated, public;
revoke all on function public.forum_topics_list(integer) from anon, authenticated, public;
revoke all on function public.forum_messages_list(uuid, integer) from anon, authenticated, public;
grant execute on function public.forum_topic_create(text, text) to authenticated;
grant execute on function public.forum_post(uuid, text) to authenticated;
grant execute on function public.forum_topics_list(integer) to authenticated;
grant execute on function public.forum_messages_list(uuid, integer) to authenticated;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('forum_topic_create', 'forum_post', 'forum_topics_list', 'forum_messages_list')
  loop
    execute format('revoke execute on function %s from public', r.sig);
  end loop;
end $$;
