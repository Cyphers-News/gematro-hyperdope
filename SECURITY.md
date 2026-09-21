# Security Policy

Thank you for helping keep Cyphers and its members safe.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately through GitHub's private vulnerability reporting on this
repository: **Security → Report a vulnerability**
(<https://github.com/CyphersNews/gematro-hyperdope/security/advisories/new>).

Please include:

- what the problem is, and which page, file or database function it affects;
- the steps to reproduce it, against your own account or a local copy;
- what an attacker could do with it.

We aim to acknowledge a report within a few days, and to tell you what we
intend to do about it once we have reproduced it. We will credit you in the
fix unless you would rather we did not.

## Please do not

- test against other people's accounts, data or messages;
- run automated scanners, load tests or brute-force attempts against the live
  site;
- access, change or delete data that is not yours;
- post details of an unfixed problem publicly.

Testing against a local copy of the site and your own account is welcome. The
repository runs as static files, so a local web server is all it takes.

## Supported versions

The site at <https://cyphers.news> is deployed from the `main` branch. Only
the current deployed state is supported: there are no release branches and no
back-ported fixes. If you are running your own copy, the latest commit is the
only version we can speak for.

## What is meant to be public

Some things look like secrets and are not:

- **`auth/supabase-config.js`** holds the Supabase project URL and the
  **publishable** key. That key identifies the project and carries no
  privileges of its own; what any request may read or write is decided by the
  Row Level Security policies in `supabase/migrations/`. It belongs in the
  browser. The **service role** key is a different thing entirely: it bypasses
  RLS, it is never in this repository, and it only ever lives in the
  environment of a server-side function.
- **The migrations** describe the schema, the policies and the database
  functions. The design is meant to hold whether or not it is published, but
  `supabase/` is excluded from the deployed site by `_config.yml` so the chat
  filter's rules are not served next to the app.

If you believe something in the repository is a real secret, please report it
privately rather than filing an issue, and we will rotate it.

## How the security model works, in short

- The browser is never trusted. Every rule that matters is enforced by the
  database: Row Level Security on every table, and `security definer`
  functions that derive who you are from your session (`auth.uid()`) rather
  than from anything the request claims.
- Client-side validation exists to give quick feedback. The same rules are
  enforced again in the database, and the database is the one that decides.
- Scores, game rounds, moderation and administrative actions are decided
  server-side. Nothing that matters is calculated in the page and believed.

## For contributors

When you send a pull request, please keep to these:

- never commit real credentials, tokens, `.env` files or personal data - use
  synthetic values in tests and examples;
- anything a member can type must be escaped where it is put into the page
  (`authEsc`, `escHtml`, or `textContent`), or written as text rather than
  markup;
- authorization belongs in the database function or the RLS policy, not in
  the page that calls it;
- a new table needs RLS enabled and a policy written with it;
- a new database function that takes an id must still derive the caller from
  `auth.uid()`, not from its arguments;
- dependencies are vendored in `lib/`. Adding or updating one is a deliberate
  change: say in the pull request why it is needed and what changed.

Tests live in `tests/`, run with `node tests/<name>.test.js`, and
`tests/security.test.js` covers the properties above.
