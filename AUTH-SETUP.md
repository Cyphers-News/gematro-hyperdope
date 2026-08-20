# Authentication setup

Cyphers is a static site, so Supabase does all the server-side work: password
hashing, session tokens, verification and reset emails, rate limiting, and the
Discord OAuth token exchange. Nothing secret lives in this repository.

There are four steps. None of them need a build tool.

---

## 1. Add your project URL and anon key

Edit `auth/supabase-config.js`:

```js
var SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co"
var SUPABASE_ANON_KEY = "YOUR-PUBLISHABLE-ANON-KEY"
```

Both come from **Supabase → Project Settings → API**.

The anon key is meant to be public — it identifies the project and carries no
privileges. What any request may actually read or write is decided by the Row
Level Security policies in the migration. **Never put the `service_role` key
here**; it bypasses RLS and must only ever live on a server.

Until these are filled in, the auth pages show "Authentication is not
configured yet" instead of failing with a network error.

---

## 2. Run the migration

`supabase/migrations/20260802000000_auth_profiles.sql`

Either paste it into **Supabase → SQL Editor** and run it, or if you use the
CLI:

```bash
supabase db push
```

It is safe to re-run. It creates:

- **`public.profiles`** — one row per user, keyed to `auth.users(id)` with
  `on delete cascade`. Holds `email`, `username`, `discord_id`,
  `discord_username`, `discord_avatar`, `created_at`, `updated_at`.
- **Indexes** — case-insensitive unique username, unique `discord_id`
  (this is what prevents one Discord account attaching to two profiles), and an
  email lookup index.
- **`handle_new_user()` + triggers** on `auth.users` insert *and* update, so the
  profile is created at signup and refreshed when Discord is linked later.
- **`touch_updated_at()` trigger** to maintain `updated_at`.
- **RLS policies** — see below.
- **Grants** — `anon` gets nothing at all; `authenticated` gets select/insert/update.
- **A backfill** for any users who already exist.

---

## 3. Configure Discord OAuth

**In the Discord Developer Portal** (<https://discord.com/developers/applications>):

1. **New Application** → name it.
2. **OAuth2** → copy the **Client ID** and **Client Secret**.
3. **OAuth2 → Redirects** → add exactly:
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```
   This points at *Supabase*, not at cyphers.news. Supabase receives the code
   and performs the token exchange server-side, which is why the client secret
   never touches the browser.

**In Supabase** (**Authentication → Providers → Discord**):

1. Enable it.
2. Paste the Client ID and Client Secret. They are stored in Supabase — not in
   this repo, and not in any environment file here.

**In Supabase → Authentication → URL Configuration:**

- **Site URL**: `https://cyphers.news`
- **Redirect URLs** — add every origin you use, one per line:
  ```
  https://cyphers.news/**
  http://127.0.0.1:8000/**
  http://localhost:8000/**
  ```
  Supabase refuses to redirect anywhere not on this list, which is what stops a
  crafted link bouncing a freshly authenticated user off-site.

---

## 4. Email settings

**Authentication → Providers → Email**: leave **Confirm email** on, so an
address must be verified before it can sign in.

The default Supabase SMTP is heavily rate limited and only intended for
testing. Before real traffic, set your own SMTP under **Project Settings → Auth
→ SMTP Settings**.

---

## Environment variables

**None are required.** There is no build step to substitute them into a static
page, so the two public values live in `auth/supabase-config.js`.

Everything genuinely secret is held by Supabase:

| Secret | Where it lives |
|---|---|
| Discord Client Secret | Supabase → Auth → Providers → Discord |
| `service_role` key | Supabase only. Never in this repo |
| Password hashes | `auth.users`, managed by Supabase (bcrypt) |
| SMTP credentials | Supabase → Project Settings → Auth |

---

## Row Level Security

RLS is enabled on `public.profiles` with three policies, all scoped to
`authenticated`:

| Policy | Statement | Rule |
|---|---|---|
| `profiles_select_own` | `select` | `auth.uid() = id` |
| `profiles_update_own` | `update` | `auth.uid() = id` for both `using` and `with check` |
| `profiles_insert_own` | `insert` | `with check (auth.uid() = id)` |

`auth.uid()` is read by Postgres from the verified JWT, so it cannot be spoofed
by editing anything in the browser. The `with check` on update is what stops a
user reassigning their row to somebody else's id.

There is **no delete policy** by design — profiles are removed by the cascade
when the `auth.users` row goes, so a client can never orphan or delete one
directly.

---

## What protects what

| Concern | Handled by |
|---|---|
| Password hashing | Supabase Auth (bcrypt). This code never sees a password |
| SQL injection | PostgREST parameterises everything; no SQL is built in the client |
| XSS | All user text passes through `authEsc()` before reaching `innerHTML` |
| CSRF | No cookie auth, so there is nothing to ride. The token goes in an `Authorization` header, which cross-site form posts cannot set |
| Rate limiting | Supabase Auth's built-in limits on signin, signup, OTP and recovery |
| Open redirect | `?next=` only accepts a bare relative `*.html`; Supabase enforces its own redirect allowlist |
| Account enumeration | Sign-in returns one message for wrong password and unknown email; forgot-password always reports success |
| Data access | RLS, enforced by Postgres |

---

## Two honest limitations

**Sessions are JWTs in `localStorage`, not `HttpOnly` cookies.** Only a server
can set an `HttpOnly` cookie, and this site has no server. This is the standard
trade-off for a static site with Supabase, and it means a successful XSS could
read the token — which is why all user-supplied text is escaped. If you ever
want `HttpOnly` cookies, that means adopting a server-rendered framework.

**Page guarding is a redirect, not a security boundary.** `profile.html` bounces
signed-out visitors to the login page, but the file itself is public static
markup. Nothing sensitive is in it — the data only arrives after an
authenticated query, and RLS is what actually refuses to return another user's
row.

---

## Verifying it works

1. Serve the site (`http://127.0.0.1:8000`) — opening `file://` will not work,
   OAuth redirects need a real origin.
2. Register → check for the verification email → confirm → sign in.
3. Confirm a row appeared in **Table Editor → profiles**.
4. Sign out, then **Continue with Discord** → a profile row should be created
   with `discord_id`, `discord_username` and `discord_avatar` filled in.
5. Signed in with email/password, open **Profile → Link your Discord account**
   to attach Discord to the existing account rather than making a second one.

---

## Friends

`supabase/migrations/20260806000000_friends.sql`

Run it the same way as the others — SQL Editor, or `supabase db push`. It is
safe to re-run. **Until it is run the Friends tab says so and does nothing
else**; the rest of the app is unaffected.

### What it creates

- **`public.friendships`** — one row per *pair*, not per direction. The pair is
  stored canonically (`user_a < user_b`) with a unique index on
  `(user_a, user_b)`. That one decision makes every duplicate case impossible
  in the database rather than in application code:

  | attempt | what stops it |
  |---|---|
  | A asks B twice | unique index |
  | A asks B, then B asks A | same canonical row → unique index |
  | A asks A | `user_a < user_b` check |
  | already friends, ask again | same row → unique index |

- **Privacy columns on `profiles`** — `friend_policy`
  (`everyone`/`members`/`friends_of_friends`/`nobody`), `show_online`,
  `show_last_active`, `show_mutuals`, `public_profile`, `last_active_at`.
- **`public.member_cards`** — the friends UI's equivalent of
  `public_profiles`: identity only, email never referenced.
- **Functions** — `friend_request`, `friend_respond`, `friend_cancel`,
  `friend_remove`, `friend_list`, `friend_requests`, `friend_counts`,
  `member_search`, `member_discover`, `member_profile`, `touch_last_active`.

### Why the writes go through functions

`friendships` has **no insert and no update policy at all** — only select and
delete, both restricted to rows you are part of. Every state change goes
through a `security definer` function instead, so rules like *"only the
addressee may accept"* and *"only the requester may cancel"* live in one place
and cannot be bypassed from the console.

Select is limited to rows you are in, so nobody can enumerate who is friends
with whom.

### Presence

`last_active_at` is a timestamp the client touches every 2½ minutes while the
tab is open, and "online" means *seen in the last five minutes*. There is
deliberately no online flag: a browser that closes without warning never sends
the "I left" message, and the member is left showing online for ever.

### Two things to know

- **"Anyone" and "Members only" are the same setting** while the whole social
  layer needs an account. Both values exist so the distinction is available
  later; the UI offers one button and says so.
- **Timezone-style caveat on `friends_of_friends`** — it is evaluated at the
  moment of the request, so losing a mutual friend afterwards does not undo a
  friendship already made.

---

## Safe friends chat

`supabase/migrations/20260806010000_chat.sql` — run after the friends one.

### The line that makes the rest of it true

`public.messages` has **no insert policy**. The only writer is `chat_send()`,
which is `security definer` and runs every check first. A filter in the browser
is a suggestion — anyone can open the console and insert directly — so none of
the rules live there. `auth/chat.js` re-implements a handful of the *shape*
rules (links, phone numbers, emails) purely so the warning appears while you
type; the server runs them all again regardless.

### Adding a rule

Rules are rows, not code:

```sql
insert into public.mod_rules (category, kind, pattern, note)
values ('contact', 'tight', 'newapp', 'keep it here');
```

`kind` is one of:

| kind | matched against | use for |
|---|---|---|
| `word` | whole words in the folded text | short terms where a substring hit would be a disaster |
| `tight` | substring of the separator-stripped text | terms long enough that a partial hit is deliberate |
| `regex` | the raw text, case-insensitive | shapes — phone numbers, postcodes, coordinates |

Text is folded before any rule sees it: lower-cased, leetspeak mapped
(`4→a`, `3→e`, `$→s`…), runs of three or more identical characters collapsed,
and separators normalised. So `f.u.c.k`, `fuuuck` and `F U C K` are all the
same string by the time a rule runs.

`public.mod_allow` is the counterweight: innocent words are removed **before**
substring matching, which is why *Scunthorpe*, *classic* and *assessment* can
be typed. Adding to that list is the maintenance cost of catching evasion, and
it is the right trade — the alternative is either missing `f.u.c.k` or blocking
`grass`.

### Turning on the AI stage

Phase 1 ships with `mod_settings.require_ai = false` and works immediately on
rules alone. To add the AI check:

```bash
supabase functions deploy moderate-message
supabase secrets set OPENAI_API_KEY=sk-...
```
```sql
update public.mod_settings set require_ai = true;
```

After that `chat_send()` refuses every caller, so the browser can no longer
reach the table and the Edge Function — which runs rules, then the AI, then
stores — becomes the only way a message can exist. **Nothing in the chat system
changes to make that switch.** The function fails closed: if the moderation API
is unreachable, the message is refused rather than stored unchecked.

### What is logged

`public.moderation_events` gets one row per rejection: who, when, which
category, which rule, how long the message was. **Not the message.** Keeping
rejected text would mean building a searchable archive of the worst things
anyone has typed. Reports go to `public.reports`, insert-only — a member can
file one and can never read any, including their own.

### What this does not do

Keyword and pattern matching stops the careless and the casual. It does not
stop someone patient and articulate, and it never will: abuse can be spelled
correctly and phrased politely. The AI stage narrows that gap and does not
close it. **This is a floor, not a ceiling, and it is not a substitute for
reading the reports.**

---

## Admin panel

`supabase/migrations/20260806030000_admin.sql` — run after the chat one.
The panel lives at **`/admin.html`**.

### Read this bit before running it

`profiles` was granted `UPDATE` at the **table** level, and its policy only
checks which *row* you are touching, not which *column*. Adding an `is_admin`
column to that table and changing nothing else would have meant any member
could run:

```js
supabase.from("profiles").update({ is_admin: true }).eq("id", myOwnId)
```

...and the policy would have allowed it, because it is their own row. So this
migration **revokes the table-wide grant** and replaces it with a grant on
exactly the columns a member may edit:

`username`, `avatar_url`, `setup_done`, `friend_policy`, `show_online`,
`show_last_active`, `show_mutuals`, `public_profile`

`is_admin`, `status` and `email` are not in that list, so an update naming them
is refused by Postgres before any policy is consulted. A trigger backs it up in
case a later migration re-grants the whole table by accident.

**If you add a profile column that members should be able to edit, you must add
it to that grant** — otherwise it will silently fail to save.

### The first admin

Bootstrapped by email in the migration:

```sql
do $$ declare bootstrap text := 'joehenderson196@gmail.com';
```

Change that line before running it if you want a different first admin. After
that, admins are made by admins from the Users section — the block never needs
editing again, and it does nothing if that address has not signed up yet.

### Where permission is decided

Not in the browser. Every privileged function's first act is `admin_require()`,
which raises `Administrators only` for anyone else. `admin.html` hides itself
from non-admins and the nav only shows the link to admins, but both are
convenience: typing the URL in gets you a page that can fetch nothing.

Granting `execute` to `authenticated` is deliberate and is *not* the
permission — the function checks the flag on every call, which is right the
moment it changes. A custom JWT claim would be stale for as long as the token
lives.

### Sections

| Section | What it does |
|---|---|
| Dashboard | Ten counts, plus who is online (refreshing every 20s) and recent admin activity |
| Reports | Filter by status, sort, open one to see the conversation around the reported message, mark open/reviewing/dismissed/actioned |
| Users | Search and sort, suspend, ban, restore, promote, demote, delete, trigger a password reset |
| Audit log | Every admin action: who, what, target, when, IP |

Adding a section is an entry in `adminSections` plus a render function, and a
read function in SQL that starts with `admin_require()`. Nothing registers a
route or a permission.

### Guards that are in the database, not the panel

- You cannot suspend, ban or delete yourself.
- You cannot remove the last administrator.
- You cannot suspend, ban or delete another admin without demoting them first.
- Deleting logs the name *before* the delete, because afterwards there is none.

### Suspended and banned accounts

Enforced on every write path — chat, friend requests, publishing — not in the
UI. A ban also sets `auth.users.banned_until`, which is the column Supabase's
own admin API uses, so they cannot sign in again; that write is wrapped so
that if a future Supabase release moves it, the app-level block still holds.

A suspension with an end date lapses on its own.

### Password resets

The panel calls the ordinary `resetPasswordForEmail` endpoint. It needs no
elevated rights and grants none — an admin triggering it learns nothing they
did not already know, and the email goes to the address on file.

### After you run it — check this first

Sign in as a **non-admin** and try:

```js
supabase.from("profiles").update({ is_admin: true }).eq("id", <their id>)
```

It must fail. If it succeeds, the column grant did not apply and nothing else
in this panel is worth anything.

---

## Phrase reactions

`supabase/migrations/20260820000000_phrase_reactions.sql` — run after the
admin one, which it depends on (`admin_require`, `admin_log`, `admin_stats`).
Safe to re-run.

Until it is run, the Leaders tab's reaction buttons and Trending view fail
with *"This feature needs its database migration to be run"* — the RPCs they
call simply do not exist yet. Nothing else on the page is affected.

### What it creates

- **`public.phrase_reactions`** — one row per member per phrase: heart, like
  or laugh. A unique index on `(submission_id, user_id)` is what a client
  upserts against, so changing your reaction replaces the row rather than
  adding a second one.
- **`public.phrase_reaction_counts(target_ids)`** — batch counts plus your own
  reaction, for a list of phrases at once (the Leaders tab opens a
  contributor's whole list in one go, up to 2000 phrases).
- **`public.trending_phrases(lim)`** — top phrases site-wide by reaction
  count, aggregated in the database rather than client-side, since pulling
  every submission down to sort it in the browser would not scale.
- **`member_profile`, extended** — adds `reactions_received` (summed across
  everything a member has published) and `top_phrase_reactions` (their best
  single phrase), which feed two new badges (`frBadgesFor`,
  `calc/friends-tab.js`) and a stat on the profile card. Dropped and
  recreated, same reason as the last time this shape changed — `RETURNS
  TABLE` cannot be altered with `create or replace`.
- **`public.phrase_db_queue`** — the review queue behind `/admin.html`'s
  Phrase queue section. A phrase is enqueued automatically (a trigger on
  `phrase_reactions`, on-conflict-do-nothing) the moment it earns its first
  reaction. No RLS policies at all: every access goes through
  `admin_phrase_queue` / `admin_phrase_decide`, both `admin_require()`-gated,
  same pattern as Reports.
- **`admin_stats`, extended** — adds `phrase_queue_pending`, shown as a
  dashboard tile.

### db.txt is a static file — nothing here writes to it

Approving a phrase in the queue means "this belongs in the database," not
"this is now in the database." The file itself only changes when an admin
copies the approved list out (the Phrase queue section's Export button) and
commits it by hand, same as any other edit to a file the site ships. An
"add automatically" version was deliberately not built: an automated
acronym/capitalisation guess is right most of the time and silently wrong
the rest, which is a bad trade for a file every visitor's browser parses on
every page load.

### db.txt size warning

The admin dashboard reads the file's real size with a `HEAD` request (no
migration involved — it's asking the file itself, not the database) and
warns past 3.2MB, 80% of a 4MB working cap (`ADMIN_DB_SIZE_WARN` /
`ADMIN_DB_SIZE_CAP`, `auth/admin.js`).

## Chat presence

`supabase/migrations/20260820010000_chat_presence.sql` — run after
`20260806070000_social.sql`, which it depends on (the archived/cleared
columns and function signature it extends). Safe to re-run.

Until it is run, the Chats inbox simply shows no online dot — `last_active_at`
comes back `null` from the old `chat_threads`, and `frOnlineDot` already
treats a missing value as "don't draw it." Nothing breaks either way.

### What it changes

- **`chat_threads`, extended** — adds `last_active_at`, read straight off
  `member_cards` (already joined in for `display_name`/`avatar`), so the
  inbox row can call the same `frOnlineDot` every other member card in the
  app already uses. The privacy gate is unchanged and lives where it always
  has — `member_cards` only exposes the column at all when the member has
  `show_last_active` on, and `frOnlineDot` only lights it up within the
  existing "online window." Dropped and recreated, same `RETURNS TABLE`
  reason as everywhere else in this file; the query body is otherwise
  byte-for-byte the version in `social.sql`.

## Security definer view fix

`supabase/migrations/20260820020000_security_definer_view_fix.sql` — run
after `20260820010000_chat_presence.sql`. Safe to re-run.

Fixes the Supabase linter warning *"Data is publicly accessible via API as
this is a Security definer view"*, plus a related gap found while auditing
every grant in the project for it: no migration ever revoked a function's
default PUBLIC execute grant, only `anon, authenticated` — meaning `anon`
could call any function that does not itself require a session (`is_admin`,
`account_active`, an empty-query `member_search`) the entire time, through
PUBLIC rather than through the explicit revoke sitting next to it.

**Before running it, reload PostgREST's schema cache afterwards** (Supabase
dashboard → Database → API → "Reload schema", or `NOTIFY pgrst, 'reload
schema';` in the SQL editor) — it drops the `leaderboard` view and adds a
function in its place, and PostgREST otherwise keeps serving the dropped
view's cached route until it reloads.

### What it changes

- **`member_cards`** — no longer granted to `anon` or `authenticated`.
  Nothing client-side ever queried it directly (only joined inside other
  security definer functions, which reach it through their own privilege, not
  a grant); the grant existing at all meant `select * from member_cards` via
  the REST API returned a member's full card — display name, avatar, roles,
  favourite ciphers, friend policy — even with `public_profile` off, since
  that flag was only ever checked inside `member_profile()`, never by the
  view itself.
- **`public_profiles`** — same fix, same reasoning: internal-only, used
  solely inside `leaderboard_top()` below.
- **`leaderboard` view → `leaderboard_top(lim)` function** — the one view
  that legitimately needs to stay reachable by `authenticated` (the client
  queries it directly for the Leaders tab), so it cannot just be
  revoked-and-forgotten like the two above. A view cannot satisfy the linter
  here without breaking the feature (`security_invoker = true` would apply
  the *querying* user's own RLS on `profiles`, which only ever allows reading
  your own row) or without loosening `profiles`' RLS table-wide, which would
  expose more than a display name and an avatar. Converting it to a security
  definer *function* keeps the exact same privilege and result set while
  removing the one thing the linter actually flags — a view — from the
  schema entirely. `calc`'s `leaderboardTop()` (`auth/profile-features.js`)
  now calls `.rpc("leaderboard_top", ...)` instead of
  `.from("leaderboard").select(...)`.
- **Every security definer function's `search_path`** pinned to `''` instead
  of `public` (`ALTER FUNCTION ... SET search_path = ''`, not a body
  rewrite). Every reference in this project was already fully schema-qualified
  (checked), so this changes nothing about how anything runs — it just stops
  relying on `public` staying unwritable by ordinary roles for that safety to
  hold.
- **PUBLIC execute revoked** from every function this project created (a
  `pg_depend`-filtered sweep skips anything extension-owned, so pgcrypto etc.
  are untouched), and `alter default privileges` does the same for anything
  created after this migration. The explicit `grant execute ... to
  authenticated` next to each function is what actually opens it now — before
  this, that grant was redundant, since PUBLIC already covered `anon` too.
- **`revoke create on schema public from public`** — belt and braces for the
  search_path change above. A no-op on Postgres 15+, which already revokes
  this by default; stated explicitly rather than assumed.

### After running it

Anything that read the `leaderboard` view directly (only `leaderboardTop()`,
already updated) needs the matching client code — already done in this
repo, but worth knowing if you have other integrations pointed at
`GET /rest/v1/leaderboard`. Everything else — `member_profile()`,
`member_search()`, `friend_list()`, `chat_threads()`, and every other
function that joins `member_cards` or `public_profiles` internally —
continues to work unchanged, since none of them relied on their own caller
having a grant on those views.

## Reaction relabel and Leaders redesign

`supabase/migrations/20260820030000_reaction_leaders_redesign.sql` — run
after `20260820020000_security_definer_view_fix.sql`. Safe to re-run.

The reaction table's own values (`heart`, `like`, `laugh`) are unchanged —
only what a member sees changed (heart → 💚 Evergreen, like → 🔥 Trending,
laugh → 😂 Funny, all client-side). What needed new SQL:

### What it adds

- **`admin_phrase_queue`, extended** — dropped and recreated (parameter list
  and return shape both change) with a `sort` parameter (`recent` / `total` /
  `evergreen` / `trending` / `funny`) and three fields the queue never
  returned before: `total_count`, `first_reaction_at` (the enqueue trigger
  already fires on a phrase's first reaction, so this was always equal to
  `created_at` — now returned under its own name) and `last_reaction_at`.
- **`phrases_by_reaction(reaction_type, order_mode, lim)`** — new. Backs
  Leaders' Trending / Most Loved / Funniest tabs, one reaction type at a
  time, ordered either by the most recent reaction of that type
  (`order_mode = 'recent'`) or by how many it has in total
  (`order_mode = 'top'`, ties broken by most recent). `trending_phrases`
  (combined engagement across all three types) is untouched — it still backs
  "Popular" as a sort option on a contributor's own phrase list, just no
  longer as a Leaders tab of its own.

Until this migration runs, Leaders' three new phrase tabs and the admin
queue's new sort chips show the same "needs its database migration" /
"admin migration has not been run" messages every other not-yet-migrated
feature in this app shows — nothing crashes, and the Leaderboard tab,
Dashboard, Reports, Users and Audit log sections of the admin panel are
unaffected either way.
