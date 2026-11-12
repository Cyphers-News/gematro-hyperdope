# spec: interim phrase nomination quorum and queue relief

status: accepted
implementation state: uncommitted local candidate implemented and independently cleared; isolated staging proof and every live-system action remain pending

> **continuity role:** proposed transition
> **owner:** cyphers technical owner
> **created:** 2026-11-11
> **accepted:** 2026-11-11 by the designated owner in conversation
> **amended:** 2026-11-11; exact final-text bound and executable full-suite command accepted after independent preflight
> **grounded against:** `cef16fe6e19e05a53f48a70c837bbc11f739d609`
> **horizon:** interim pressure valve pending netvoid's broader reaction and phrase-review redesign

the designated owner accepted this exact transition on 2026-11-11 and authorized
its bounded local implementation only after an independent red review returns
clear. acceptance does not authorize applying a migration to any live database,
pushing, deploying, exporting phrases, editing `db.txt`, or publishing a release.

the independent pre-implementation review first returned `revise` because this
contract named oversized final text without defining a deterministic bound and
named a test-runner mode the repository does not support. the owner accepted
the two bounded amendments recorded below: non-null edited final text is 1 to
500 unicode characters as measured by postgres `char_length`, with one shared
predicate for single and batch decisions; the repository full-suite command is
`bash scripts/test-local.sh full`. no other normative behavior changed.

the local candidate was implemented on 2026-11-11. its independent
post-implementation red review returned `revise` twice, first for three client
reconciliation and recovery defects and then for conflating a confirmed
database refusal with an uncertain transport failure. those findings were
repaired; the same reviewer returned `clear` on the final candidate. focused
tests passed 18 of 18, the complete local suite passed 109 of 109, and a
fictional browser fixture passed 18 of 18 checks at desktop and 390-pixel
viewports. this is not staging proof: the migration has not been applied, and
its runtime grants, concurrent quorum crossing, rollback, notifications, audit
rows, and final-text persistence remain unverified against postgres/supabase.

## owner view

- **one breath:** stop treating one casual reaction as a database nomination,
  then let an administrator decide an explicitly selected set without watching
  the entire panel reincarnate after every click.
- **before:** the first reaction from anyone, including the phrase author,
  permanently creates a pending queue row; the admin client fetches at most 100
  rows; every approve or reject redraws and refetches the complete admin panel;
  each decision is one rpc and one click at a time.
- **after:** a phrase enters the queue only when distinct non-author support
  crosses the accepted quorum; nomination remains durable after crossing;
  single decisions settle in place; up to 100 explicitly selected pending rows
  may be approved or rejected in one armed, atomic batch; the client requests
  the database function's existing 300-row ceiling and says when that ceiling
  has been reached.
- **authority:** reaction rows establish support, the database alone decides
  whether quorum has crossed, administrators retain the final editorial
  decision, and `db.txt` remains a separately edited and deployed static file.

## context

the phrase queue is presently an amplifier with no threshold. the trigger in
`supabase/migrations/20260820000000_phrase_reactions.sql` inserts a queue row
after the first reaction and never removes or resets it. later migrations made
the four reactions independent, so one member may hold several reaction types
on one phrase. the admin query counts reaction rows, while the proposed quorum
must count distinct supporting people.

the moderation surface compounds the inflow problem. `admin_phrase_queue`
defaults to 100 rows and caps itself at 300. the client supplies no limit, so a
dashboard count of 180 pending phrases can coexist with a queue view showing
only the newest 100. deciding one row calls `admin_phrase_decide`, then
`adminRender()`, which replaces the whole admin body with `Loading...`, refetches
the queue, and reconstructs every row.

the current approval boundary is nevertheless worth preserving. approval only
marks a queue row and may notify the submitter. it does not write to `db.txt`.
an administrator still exports the approved list, checks capitalization, pastes
it into the static file, commits, and deploys in a separate operation.

this spec is deliberately not the future phrase system. it narrows nomination
signal and removes clerical abrasion while leaving the final human review and
static database publication boundary intact.

## confirmed product rules

### nomination quorum

a phrase becomes eligible for the review queue when either condition is true:

1. at least **three distinct non-author members** currently hold one or more
   reactions of any type on the phrase; or
2. at least **two distinct non-author members** currently hold one or more
   reactions and at least one of those supporters holds a `ccru` / book
   reaction.

the following corollaries are normative:

- one member holding several reaction types counts as one supporting person;
- the phrase author's reactions do not contribute to either threshold and
  cannot satisfy the book condition;
- no account receives a hidden or formal "ccru member" multiplier;
- reaction type remains meaningful for ranking and display, but only the book
  reaction changes the nomination threshold;
- the threshold is evaluated from database state, never reconstructed from
  client-visible counts;
- the first successful threshold crossing creates at most one queue row;
- after a queue row exists, removing reactions does not dequeue the phrase,
  reset its status, or erase an administrator's decision;
- existing pending, approved, rejected, and exported queue rows are
  grandfathered exactly as they are. this migration does not retroactively
  delete, reclassify, or re-qualify them.

### editorial authority

- quorum means "review this", not "publish this";
- an administrator may still approve or reject each nominated phrase and may
  edit the final capitalization before approval;
- approving never edits `db.txt`, commits, deploys, or marks a phrase exported;
- no language model, heuristic classifier, member-role caste, or automatic
  publishing decision enters this interim slice.

### durable crossing

nomination is a one-way crossing into editorial custody. support may later
fall below threshold, including to zero, without making the historical
nomination disappear. this matches the existing queue's durable lifecycle and
prevents social reaction churn from undoing moderator work.

## scope

in:

- one append-only migration replacing the first-reaction enqueue trigger with
  distinct-supporter quorum evaluation;
- concurrency-safe, duplicate-safe threshold crossing;
- exact member-facing copy explaining how a phrase reaches review;
- a 300-row admin fetch using the existing rpc ceiling, with a visible warning
  when the returned set reaches that ceiling;
- in-place single-row decisions that preserve queue position and focus;
- explicit selection, select-visible, clear-selection, and armed batch approve
  or reject for pending rows, capped at 100 rows per batch;
- one admin-gated batch rpc that preserves existing decision, notification,
  audit, and final-text semantics;
- focused browser-state proof, migration fixture proof, full local tests,
  documentation reconciliation, and independent read-only release review.

out:

- automatic phrase approval, rejection, capitalization, deduplication, or
  `db.txt` mutation;
- llm review, provider calls, new secrets, dependencies, or raw phrase export;
- privileged nomination rights for ccru contributors or any new member role;
- retroactive cleanup of existing queue rows based on their present reactions;
- redesigning reaction rankings, notifications, phrase submission, profiles,
  reports, audit history, or the future moderation architecture;
- automatic application of a migration, production data inspection, push,
  deployment, publication, or sister-repository reconciliation.

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes | this spec's nomination copy and admin interaction contract | focused dom/browser tests for copy, selection, focus, success, failure, and ceiling warning |
| persisted state or schema | yes | append-only migration replacing enqueue logic and adding one batch rpc | transaction fixtures for quorum, durability, duplicate prevention, batch atomicity, notification, and audit behavior |
| external or provider-visible behavior | no | existing static client and supabase boundary | no new provider, webhook, model, key, or outbound request in the diff |
| identifiers, secrets or privacy | no | existing authenticated user ids, submission ids, queue ids, and admin gate | no new identifier or secret; rpc grants and returned fields remain least-privileged |
| lifecycle or terminal states | yes | this spec's durable crossing and atomic decision rules | state-transition fixtures from unqualified to pending and pending to approved/rejected |
| setup, operation or recovery | yes | `AUTH-SETUP.md`, migration order, existing export procedure, and rollback boundary | dry-run migration review, local suite, staged smoke proof, and documented revert/apply sequence |
| normative contract or decision | yes | this exact spec after explicit owner acceptance | accepted fingerprint plus reconciled independent release review |
| cross-repository dependency | no | `gematro-hyperdope` is the only authorized checkout | changed-file inventory; sister repositories remain a later reconciliation operation |

## current behavior and authority map

| fact | evidence class | current owner |
|---|---|---|
| any first reaction inserts a queue row | observed | `phrase_reactions_enqueue()` and its after-insert trigger |
| a queue row is unique per submission and survives reaction removal | observed | `phrase_db_queue_submission_key` plus insert-on-conflict behavior |
| members may hold multiple reaction types on one phrase | observed | the later three-column reaction uniqueness index and client toggle behavior |
| the admin queue returns 100 rows by default and never more than 300 | observed | latest `admin_phrase_queue(status, sort, lim)` definition |
| a single decision refetches and redraws the whole admin surface | observed | `adminPhraseAct()` calling `adminRender()` after success |
| approval writes queue state, notification, and audit data but not `db.txt` | observed | `admin_phrase_decide()` plus the admin export instructions |
| the interim quorum and batch interaction described here | accepted | this exact accepted spec revision |
| netvoid's larger system revamp | aspirational | future owner/team decision, intentionally not specified here |

## implementation contract

### invariant 1: quorum is person-counted and server-owned

the append-only migration replaces the current enqueue function and trigger
without editing historical migration files. for each newly inserted reaction,
the database must:

1. resolve the submission owner;
2. exclude every reaction row held by that owner;
3. count distinct remaining `user_id` values, not reaction rows;
4. test whether at least one remaining supporter holds `reaction = 'ccru'`;
5. insert one pending queue row only when one accepted threshold is satisfied;
6. use the existing submission uniqueness boundary and conflict-safe insertion
   so retries cannot duplicate or reset an existing queue row.

the implementation must serialize or otherwise reconcile concurrent reactions
to the same submission. three reactions arriving together must not all observe
"below threshold" and leave a qualified phrase unqueued. the exact locking
mechanism is an implementation choice, but a concurrent-crossing fixture is a
release requirement rather than an explanatory comment.

the function remains `security definer`, uses an empty search path and fully
qualified object references, exposes no new direct table grant, and is revoked
from `anon`, `authenticated`, and `public` unless trigger execution requires a
narrower documented grant. the existing queue table, statuses, unique index,
rls posture, and old rows remain untouched.

### invariant 2: the client tells the threshold truth

replace the present "react to nominate" note with compact copy that makes the
social action and editorial crossing distinct. the wording must communicate:

- three distinct supporters nominate a phrase;
- two supporters suffice when one marks it ccru/book;
- the author's own reactions do not count;
- an administrator still makes the final decision.

the copy must not imply that every reaction creates a nomination, that book is
an approval, or that a user must belong to a privileged ccru role.

### invariant 3: one decision does not redraw the world

`adminPhraseAct()` retains the existing single-decision rpc and final-text
behavior. the server accepts `edited_text is null` or a non-null value whose
postgres `char_length` is between 1 and 500 inclusive. the same validation
predicate is owned by the shared single/batch decision helper, and every batch
item is validated before the first durable write. while a decision is pending,
only that row's controls become busy.
after server success:

- if the row no longer belongs in the active status filter, remove that row;
- in the `all` view, update its status and review presentation in place;
- update the visible selection/count state without calling `adminRender()`;
- move keyboard focus to the next available decision control, or to the queue
  toolbar when no row remains;
- announce the result through the existing toast without resetting scroll.

on failure, the row, edited text, controls, selection, scroll, and focus are
restored. no success state is shown before the server confirms the decision.
filter changes, sort changes, navigation, and an explicit refresh may still
perform a complete queue render.

### invariant 4: batch authority is explicit, bounded, and atomic

only pending rows expose batch-selection controls. the toolbar provides:

- the selected count;
- select all currently visible pending rows, up to the 100-row batch cap;
- clear selection;
- approve selected;
- reject selected.

approve and reject use the existing four-second armed-button pattern. the
second activation names the decision and exact selected count. selection alone
never changes database state. there is no implicit "all matching", "all 300",
or filter-wide action beyond the ids presently selected in the browser.

the new admin-gated batch rpc accepts a bounded array of queue id, decision,
and edited final-text records. it must:

- reject a non-array payload, an empty payload, more than 100 items, duplicate
  queue ids, unknown decisions, malformed ids, or any non-null `edited_text`
  whose postgres `char_length` is outside 1 to 500 inclusive before writes;
- permit only `approved` or `rejected` decisions through this batch surface;
- require every target still to be `pending` at decision time;
- run the whole batch in one transaction, returning affected ids and statuses;
- roll back every row if any target is stale, invalid, missing, or fails;
- delegate to the existing decision semantics or one shared private helper so
  approval notifications, self-notification suppression, final text, reviewer
  fields, timestamps, and per-row audit entries cannot drift;
- call `admin_require()` and retain the current execute-grant posture: no
  anonymous or general-public execution.

on success, the ui reconciles only returned rows. on failure, every selected
row remains visible and selected, and the toast explains that nothing was
changed. a stale-row failure offers an explicit queue refresh rather than
silently overriding another administrator.

### invariant 5: the backlog is visible without pretending to be infinite

the client passes `lim: 300` to the existing queue rpc. if 300 rows return, the
surface states that the view has reached the server ceiling and that additional
older rows may exist. draining or narrowing the current result makes older rows
reachable on the next refresh.

this interim slice does not add pagination or claim that 300 is a complete
future queue design. the larger revamp owns that decision.

### invariant 6: publication remains a separate current

batch approval must not call `adminExportApproved()`, mark rows exported,
modify a file, create a commit, push, or deploy. the approved tab and existing
manual export instructions remain intact. any future "approve and publish"
operation requires a separate owner decision and security/operations review.

## expected surfaces

| surface | expected change | collision risk |
|---|---|---|
| new `supabase/migrations/*.sql` | quorum trigger/function and admin batch rpc; updated comments on the current contract | red: privileged functions, grants, concurrency, durable state, notification and audit semantics |
| `auth/admin.js` | pass the 300-row limit; add the bounded batch rpc wrapper | red adjacency: privileged moderation calls and payload shape |
| `auth/admin-ui.js` | row identity/state, local reconciliation, selection toolbar, armed batch action, focus recovery, ceiling warning | amber/red adjacency: stale admin state, accidental broad selection, edited-text loss, focus and scroll regression |
| `auth/admin.css` | selection, busy, toolbar, and narrow-table affordances | amber: legibility and target size in a dense privileged surface |
| `calc/profile-tab.js` | exact quorum explanation | green in isolation; must agree with database behavior |
| `AUTH-SETUP.md` | replace first-reaction documentation with the accepted quorum and batch operation/recovery notes | operational truth must not get ahead of an unapplied live migration |
| `tests/phrase-queue.test.js` or equivalent focused proof | client state and migration-contract regression coverage | fixtures must not masquerade as a live database or rendered browser proof |

implementation may discover a smaller existing test seam or css owner. any new
runtime surface, schema object, grant, queue status, provider, or publication
path is a scope change and returns to the owner before implementation continues.

## ordered implementation slices

### slice 1: make nomination honest at ingress

- add the append-only quorum migration and update member-facing copy;
- prove ordinary three-person crossing, two-person book crossing, self-reaction
  exclusion, multi-reaction de-duplication, under-threshold refusal, durable
  crossing, no status reset, and concurrent crossing;
- do not touch existing queue rows or admin interaction yet.

**exit:** focused migration fixtures pass, the exact function/grant diff has
received red-risk review, and current queue records remain unchanged.

### slice 2: make one decision locally terminal

- give rows stable dom identity and explicit busy/error/success states;
- replace the post-decision full `adminRender()` with local reconciliation;
- request 300 rows and show the ceiling warning;
- prove edited-text preservation, active-filter removal, all-filter update,
  failure restoration, focus movement, scroll preservation, and stale response
  protection.

**exit:** focused ui tests and a rendered admin-fixture pass at desktop, narrow
width, 200 percent zoom, and keyboard-only operation.

### slice 3: add selected batch decisions

- add the bounded atomic rpc and thin client wrapper;
- add pending-only checkboxes and the armed batch toolbar;
- preserve each row's current edited text in the payload;
- prove all-or-nothing failure, stale target refusal, notification and audit
  parity, cap enforcement, explicit-id scope, focus recovery, and no export.

**exit:** focused sql and ui proof pass, the full local suite passes, the final
diff is cleanly bounded, and an independent reviewer returns `clear` or every
finding is reconciled before release consideration.

slices are ordered because batch action must reuse a settled single-row state
contract, and ui relief must not obscure whether the ingress migration is
semantically correct. an implementation checkpoint may be committed locally
only under separate owner authorization; this accepted spec does not authorize
one.

## acceptance criteria

1. one non-author holding all four reactions does not enqueue a phrase.
2. the author plus two ordinary non-author supporters does not enqueue it.
3. three distinct non-author supporters enqueue exactly one pending row.
4. two distinct non-author supporters enqueue exactly one row when either
   supporter holds `ccru`; the author's book reaction does not qualify it.
5. concurrent threshold-crossing reactions cannot leave a qualified phrase
   absent or create duplicate queue rows.
6. removing every reaction after crossing does not remove or reset the row.
7. no existing queue row changes during migration application.
8. member-facing copy accurately states the threshold and admin boundary.
9. the pending view requests up to 300 rows and visibly warns at the ceiling.
10. a successful single decision does not invoke a full admin render, reset
    scroll, or discard another row's edited text.
11. a failed single decision restores the exact actionable row and focus.
12. batch action affects only explicitly selected ids, refuses more than 100,
    and requires the second armed activation.
13. any invalid, stale, or failed batch member rolls back the complete batch.
14. batch approval produces the same final text, reviewer fields, approval
    notification behavior, and per-row audit evidence as single approval.
15. single and batch decisions both accept null edited text, reject non-null
    edited text outside 1 to 500 postgres characters, and finish all batch
    payload validation before the first row update.
16. no path added here modifies `db.txt`, exports, commits, pushes, deploys,
    calls an llm, or sends phrase text to a new provider.

## validation plan

focused automated proof:

```text
node --test tests/phrase-queue.test.js
bash scripts/test-local.sh full
```

the focused test must cover the client state contract and deterministic
migration fixtures. because the repository currently has no disposable local
supabase harness, parsing sql or mocking an rpc is not sufficient proof of the
database claims. before any live migration, run the migration and transaction
fixtures in an isolated staging project with fictional accounts/submissions,
including two concurrent sessions crossing the same threshold.

rendered proof:

- pending queue with 0, 1, 100, and 300 fixture rows;
- success and server-failure restoration for single and batch actions;
- another row's edited capitalization surviving a neighboring decision;
- keyboard traversal, focus after row removal, 44-pixel controls, narrow
  viewport, 200 percent zoom, and no document-wide overflow;
- no console exception or stale response overwriting a newer filter/sort view.

release proof:

- inspect the complete migration grants and ownership, not just function bodies;
- compare notification and audit rows produced by single and batch approval;
- verify no historical migration was edited and no existing queue row was
  mutated by migration application;
- run the deterministic risk classifier, inspect the final diff, and obtain an
  independent read-only red review before any request to apply or release;
- treat production counts, production migration state, and deployed assets as
  unverified until an authorized live-system owner checks them directly.

## risks and anti-bonk clauses

- **reaction rows are not supporters.** summing reaction counts silently lets
  one enthusiastic person manufacture quorum.
- **the author is not a supporter for nomination.** exclusion applies to both
  the distinct count and the book shortcut.
- **crossing is not current popularity.** later unreacting cannot destroy the
  editorial record or reopen a decided row.
- **concurrency is part of correctness.** unique insertion prevents duplicates
  but does not by itself prove that simultaneous reactions cannot miss quorum.
- **batch is not looped optimism.** parallel client calls can partially succeed
  and leave the ui lying; the database call must own atomicity.
- **selection is not a filter inference.** no batch action may silently include
  rows merely because they match the current sort or status.
- **stale admin state may not overwrite another admin.** batch targets must
  still be pending when the transaction decides them.
- **approval is not publication.** the manual static-file boundary survives.
- **documentation follows effective state.** `AUTH-SETUP.md` may be prepared in
  the implementation diff, but live-operation wording must state whether the
  new migration has actually been applied.

## rollback and recovery shape

before live application, rollback means reverting the bounded code/migration
candidate. after a live migration, recovery requires an owner-operated
forward migration or explicit function/trigger restoration; historical
migration files are never edited in place.

rolling back the ui must not roll back or delete queue decisions already
written. rolling back quorum behavior must not remove rows that crossed while
it was active. a batch rpc failure is transactionally all-or-nothing; its ui
recovery is to retain selection, surface the error, and offer an explicit
refresh.

## acceptance and later supersession

the designated owner accepted this transition on 2026-11-11, contingent on an
independent red review returning clear before implementation begins. any
material revision to the normative contract requires fresh owner acceptance.
visual review marks and companion interaction do not revise it.

if implemented, netvoid's broader redesign may later supersede
the quorum, queue, or publication workflow. that future transition must name
which invariants it replaces; it must not inherit this interim machinery by
accident merely because it exists.
