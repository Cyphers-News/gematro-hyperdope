# spec: phrase-entry navigation and stable saved order

status: accepted

> **continuity role:** proposed transition
> **owner:** cyphers technical owner (colette)
> **created:** 2026-11-18
> **grounded against:** `efdd30cc5c841683688fc5711e83d6802637d719`
> **accepted:** 2026-11-19 by colette, accepting recommendations 1–5, the
> explicit scope boundary, and the single post-implementation review topology
> as written in draft sha256
> `4c87cc1253faca8286041f2551da2d03c4112b1f95e2f5d90bcbd30b3ff2bf39`
> **reported and reproduced by:** colette, on the deployed calculator and the
> refreshed primary checkout
> **precedent:** `182d088` removed the symmetric `home`/`fn + left` history
> clear while preserving explicit clear controls
> **authority:** this accepted markdown specification owns the proposed
> transition
> **implementation state:** implemented and independently cleared in the local
> worktree on 2026-11-19; uncommitted, unpushed, and undeployed; the owner's
> affected-laptop `fn + right` check remains pending after delivery

this accepted specification defines two observed defects in one bounded
repair: an `end` navigation event implicitly generates a batch of contiguous
phrases, and the saved-history view reshuffles equal-timestamp rows after a
deletion. it does not redesign phrase generation, history synchronization,
saved-history management, filtering, or sibling repositories.

## owner view

- **change:** make phrase generation explicit-button-only, and make the saved
  list deterministic without changing its newest-first meaning.
- **before:** `end`—including laptop `fn + right`—silently generates a phrase
  swarm; one synchronization inserts that swarm under a shared timestamp; the
  saved list sorts only by that timestamp and can redeal the survivors after
  every deletion.
- **after:** `end` remains native caret navigation; the visible `enter as words`
  button retains the existing generator; saved remains newest-first, with
  canonical history position and row id resolving ties deterministically.
- **authority:** this spec owns only the proposed transition. current source
  and observed runtime behavior remain evidence until implementation is
  separately authorized and verified.

## context

colette reproduced the first defect by typing a multiword phrase, manually
moving through it with `fn + right`, and observing the calculator append every
contiguous phrase up to the configured limit. the input dispatches every
`keydown` as a numeric key code; code `35` is both browser `end` and the
generator's legacy action channel. browsers expose laptop `fn + right` as
`end`, not as a separately recoverable modifier chord.

the resulting rows made the second defect unusually visible. opening the saved
tab flushes pending history before querying it. new rows inserted by one sync
statement share a transaction timestamp, while the saved query orders only by
descending `created_at`. deleting one row triggers a new query and render;
postgres has no declared order among the tied survivors.

this is not the deleted-phrase resurrection defect. the observed deletion
reaches the local visible and full-history representations before database
reconciliation. the rows that remain are being returned in a different order.

## grounded evidence

### keyboard and generator

- `index.html` sends `event.keyCode` from every phrase-box `keydown` into
  `phraseBoxKeypress()`.
- `calc/calc.js` assigns key code `35` to the contiguous-phrase generator.
- the visible `enter as words` control calls `phraseBoxKeypress(35)` rather
  than a domain action of its own.
- `calc/quick-guide.js` advertises `end` as the feature's shortcut.
- no other production caller synthesizes key code `35`.
- changing from `keyCode` to `event.key` would not solve the collision: both a
  physical end key and the laptop chord arrive as the same semantic key.

the generator builds every contiguous phrase up to `optPhraseLimit`, removes
duplicate strings within that temporary batch, and appends the batch directly
to `sHistory`. it does not deduplicate against pre-existing history because it
bypasses the ordinary single-phrase insertion functions.

for `n` distinct words and a limit `l`, the candidate count is:

```text
sum, for k = 1 through min(l, n), of (n - k + 1)
```

at the default limit of five and `n >= 5`, that is `5n - 10`. repeated strings
within the generated batch reduce the final count. the reproduced phrase
`stop doing what youre doing` produces fourteen rows rather than fifteen
because the repeated single-word `doing` is collapsed. the eight-distinct-word
phrase `stop switching between logical paradoxes and cybernetic diagrams`
produces thirty rows.

### persistence and saved order

- `auth/history-sync.js` flushes the complete supported history through
  `history_entries_sync(phrases text[])` and loads it in ascending `position`.
- the sync migration deduplicates by phrase, assigns the earliest incoming
  ordinal as `position`, and inserts all new rows in one statement.
- `history_entries.created_at` defaults to `now()`, so new rows in one sync
  transaction form an equal-timestamp cohort.
- `auth/profile-features.js::entriesSearch()` selects `id`, `phrase`, and
  `created_at`, then orders only by descending `created_at` and limits the view
  to 200 rows.
- `calc/profile-tab.js` preserves query order while partitioning unpublished
  and published rows; it adds no client-side stable sort.

`position` is canonical for restoring calculator history, but current evidence
does not prove the saved-management view was intended to be position-only.
newest-first and position storage were introduced together. changing saved to
ascending position would also expose the oldest 200 rows and could hide recent
entries in a large history. this spec therefore preserves newest-first and
uses position only within a timestamp tie.

### direct safety precedent

commit `182d088` removed the parallel legacy behavior in which `home`,
including laptop `fn + left`, cleared the history table. that repair preserved
the explicit clear action and added proof that a navigation key cannot mutate
visible or filtered history. the governing rule for this slice is the same:

> keyboard navigation is not an implicit mutation channel; an explicit
> control invokes the mutation's named domain action.

### affected repositories

the same `end` dispatch and timestamp-only saved query currently appear in:

- `gematro-hyperdope`;
- `cyphers-news.github.io`;
- `ciphersnews`.

this spec authorizes no sibling-repository edit. it records a later
reconciliation obligation so the copies do not disappear from continuity.

## accepted owner decisions

### decision 1: native end navigation wins

**recommendation:** remove code `35` from the phrase-box mutation dispatcher.
extract the existing generator into a named explicit action and have the
visible `enter as words` button call it directly. remove the advertised `end`
shortcut and stale comments associating the word limit with that key.

**alternative:** attempt to distinguish a physical `end` key from laptop
`fn + right`, or retain `end` behind another modifier.

**consequence:** the browser does not expose a reliable distinction for the
reported chord. retaining a keyboard route preserves the collision class and
has no demonstrated user requirement. this contract rejects the alternative.

### decision 2: preserve newest-first and stabilize ties

**recommendation:** saved-history queries remain primarily ordered by
`created_at desc`. add `position asc` as the secondary order and `id asc` as a
final deterministic tie-breaker. select `position` with the other row fields.

**alternative:** order saved solely by ascending history position.

**consequence:** position-only is coherent for a history mirror but changes
the management view's established newest-first behavior and interacts badly
with its 200-row ceiling. this contract does not make that product change.

### decision 3: preserve explicit generator semantics

**recommendation:** the explicit button retains the generator's current input
normalization, numeric exclusion, configured limit, within-batch
deduplication, output order, direct append behavior, input contents, and
interaction with existing history.

**alternative:** use this repair to rename the feature, clamp its limit,
deduplicate against pre-existing history, obey `new phrases go first`, preview
the batch, or change its n-gram construction.

**consequence:** each alternative may be valuable, but each changes deliberate
feature semantics and expands regression surface beyond the observed keyboard
collision. this contract holds them outside.

### decision 4: no reconstructed batch undo

**recommendation:** do not add undo or batch deletion in this slice.

**alternative:** reconstruct the accidental batch from its phrase strings and
delete those strings later.

**consequence:** the generator can append a phrase that already existed.
database synchronization stores one row per phrase and loses batch provenance;
saved-tab deletion removes every matching local occurrence. a text-derived
undo can therefore delete legitimate pre-existing history. an exact future
undo must capture and restore a pre-generation snapshot while it still exists.

### decision 5: primary repository only

**recommendation:** implement and verify this slice only in
`gematro-hyperdope`. reconcile the sibling repositories after this repair is
accepted, implemented, and proven on the primary source.

**alternative:** edit all three repositories in one operation.

**consequence:** the repositories already have distinct branch state and
product intent. a three-way write would erase provenance and make rollback
ambiguous. this contract records propagation without authorizing it.

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes | decisions 1 and 2 in this spec | native `end`/`fn + right` observation; explicit-button generator regression; stable tied-row deletion sequence |
| persisted state or schema | no | current history schema and `history_entries_sync` contract | no migration or sync-function diff; existing positions and ids only govern query order |
| external or provider-visible behavior | no | current static-client and supabase boundary | changed-file inventory; no rpc payload, policy, grant, auth, or provider change |
| identifiers, secrets or privacy | no | existing phrase and account boundaries | no new identifier, secret access, telemetry, public projection, or phrase transport |
| lifecycle or terminal states | yes | navigation and saved-order invariants below | event/action tests and delete/refetch ordering proof |
| setup, operation or recovery | yes | existing cache-key and local-test practice | refreshed served keys under each asset's current convention, focused tests, safety suite, full suite, diff check |
| normative contract or decision | yes | this exact spec after owner acceptance | explicit acceptance of decisions 1–5 and content fingerprint |
| cross-repository dependency | yes, deferred | affected-repositories inventory | primary-repository changed-file proof plus separate sibling reconciliation record |

risk: amber. the implementation is narrow and migration-free, but one touched
surface mutates durable member history and the other determines how that
history is presented for deletion. the realized diff receives one independent
post-implementation adversarial review. no second pre-implementation gate is
required because the incident was owner-reproduced, independently grounded,
and governed by the accepted `home` repair precedent.

## scope

in:

- decouple explicit contiguous-phrase generation from keyboard code `35`;
- allow browser-native `end` behavior in the phrase input without history
  mutation;
- retain explicit-button generation with unchanged output semantics;
- remove the `end` shortcut from the quick guide and stale source comments;
- give saved-history queries deterministic `created_at`, `position`, and `id`
  ordering while retaining newest-first cohorts;
- focused automated proof, cache-key reconciliation, full local verification,
  and one independent review of the realized diff.

out:

- undo, batch identity, multi-select, batch deletion, or current-data cleanup;
- generator renaming, preview, confirmation, phrase-limit validation, or
  changes to generated phrase membership/order;
- deduplicating generated phrases against pre-existing local history;
- changing the `new phrases go first` interaction;
- changing history synchronization, retry, flush, load, maximum-size, rpc,
  schema, indexes, rls, grants, or migrations;
- filtered additions disappearing when a filter is removed;
- changing shift-click, hidden-row delete, input-box delete, saved-tab delete,
  or clear-all behavior;
- changing saved from newest-first to a pure history-position mirror;
- pagination or changing the 200-row saved limit;
- sibling-repository implementation, push, deployment, or publication.

## governing invariants

### navigation invariant

pressing `end` in the phrase box changes no history state and sends no history
write because of that key event. native caret movement remains available. the
same holds when the platform emits `end` for `fn + right`.

### explicit-action invariant

the visible `enter as words` button remains the sole trigger for contiguous-
phrase generation. it calls a named generator action directly, not a synthetic
keyboard code. its current word-limit and output semantics remain exact.

### saved-order invariant

saved rows are grouped newest timestamp first. rows with the same timestamp
follow ascending canonical history position. malformed or legacy ties that
also share a position follow ascending row id. deleting any row preserves the
relative order of every survivor.

### state-boundary invariant

the repair reads existing `position` and `id`; it does not create new durable
state, batch provenance, timestamps, schema, or synchronization behavior.

### scope-escape invariant

if the realized repair needs to change `auth/history-sync.js`, either history
migration, filter restoration, deletion semantics, the 200-row limit, or the
generator's output membership/order, implementation stops for a new owner
decision rather than expanding this spec in place.

## likely implementation surface

- `calc/calc.js`
  - extract the existing code-35 generator body into a named explicit action;
  - point the final merged matches-menu button at that action;
  - remove the `case 35` mutation route and stale key-coupled comments.
- `calc/quick-guide.js`
  - remove the advertised `end` shortcut while retaining the explicit feature
    documentation.
- `auth/profile-features.js`
  - select `position` and declare the three-level saved-query order.
- served html consumers
  - refresh each changed browser asset's existing query-string cache key;
  - preserve content-derived keys where that convention is already enforced,
    without converting unrelated manual-version assets in this slice.
- focused tests
  - add keyboard/action separation and generator-semantic proof;
  - add saved-query ordering proof; retain existing filtered-delete coverage.

no production sql file is expected to change.

## implementation by invariant

1. **separate input event from domain action.** move the current generator body
   without semantic edits into one callable action. make the explicit button
   call it. leave the phrase-box handler with its existing enter, up, down, and
   delete behavior, but no end branch.
2. **retire the shortcut contract.** remove `end` from the quick guide and
   remove source comments that define the word limit or button through that
   key. do not add a replacement keyboard shortcut.
3. **declare stable saved order.** extend the saved row projection with
   `position`; chain descending timestamp, ascending position, and ascending
   id orders before the existing limit. preserve search filtering and row
   partitioning.
4. **prove the boundary.** test that key code 35 mutates nothing, the explicit
   action still generates exact representative batches, repeated words retain
   within-batch deduplication, and pre-existing duplicates retain current
   behavior. test the query builder's ordered columns and directions rather
   than mocking the owning query away.
5. **reconcile delivery.** refresh every changed asset's served cache key under
   its current convention,
   run focused, safety, and full checks, then obtain one independent review of
   only the realized diff and named invariants.

## acceptance criteria

### keyboard and explicit generation

- with the caret inside a multiword phrase, physical `end` changes no history
  row and leaves native caret-to-end behavior available;
- on the owner's affected laptop, `fn + right` changes no history row;
- clicking `enter as words` still generates the same ordered batch under the
  same configured limit;
- `stop doing what youre doing` still produces the current fourteen-string
  deduplicated batch;
- existing enter, up, down, delete, word-limit, and button behavior remain
  unchanged except for removal of the `end` shortcut;
- neither the quick guide nor source comments claim that `end` generates
  phrases.

### stable saved order

- the saved query declares `created_at desc`, then `position asc`, then
  `id asc`;
- cohorts with distinct timestamps remain newest-first;
- equal-timestamp rows appear in canonical position order;
- after deleting any row from an equal-timestamp cohort, every survivor keeps
  its previous relative position;
- filtered saved search uses the same deterministic ordering;
- the 200-row limit, unpublished/published partition, submission behavior,
  and deletion semantics remain unchanged.

### state, delivery, and review

- no migration, schema, rpc, rls, grant, sync, filter-restoration, or persisted
  setting changes;
- changed browser assets are referenced under refreshed cache keys, and every
  existing content-hash assertion remains true;
- focused tests pass;
- `bash scripts/test-local.sh safety` passes;
- `bash scripts/test-local.sh full` passes;
- `git diff --check` passes;
- one independent post-implementation reviewer returns `clear`, or returns a
  bounded `revise` that is reconciled and re-reviewed against the amended
  candidate;
- owner-visible verification distinguishes source/test proof from the final
  hardware check of `fn + right`.

## validation commands

the exact focused test filename may be chosen during implementation, but the
proof must be independently runnable before the aggregate suites:

```bash
node --test tests/phrase-entry-navigation.test.js
node --test tests/saved-history-order.test.js
bash scripts/test-local.sh safety
bash scripts/test-local.sh full
git diff --check
```

if the two focused concerns live in one test file, run that file once rather
than creating ceremonial duplication. a source-regex assertion alone is not
sufficient for the generator: the explicit action must execute against a
representative history fixture. the saved-order proof must exercise the real
query builder chain rather than a stubbed `entriesSearch()` return value.

## review topology

- **before implementation:** owner accepts this exact draft and separately
  authorizes the bounded build. no additional adversarial gate is required.
- **during implementation:** any scope-escape invariant stops work for owner
  direction.
- **after implementation:** one independent read-only review examines the
  actual diff, focused proofs, aggregate suites, cache keys, and absence of
  sync/migration changes.
- **after review:** commit, push, deployment, sibling reconciliation, and
  production verification each require their own applicable authorization;
  implementation approval alone grants none of them.

## risks and held-out work

- an explicit `enter as words` action can still create a large batch by
  design. `optPhraseLimit` remains editable and unclamped.
- local history can still contain generated duplicates of pre-existing
  phrases while the database stores one row per phrase.
- an exact future undo requires a before-state snapshot; phrase-text
  reconstruction is unsafe.
- hidden/table-row deletion remains difficult to discover, and no batch
  cleanup is added.
- deletion while an active matches filter remains safe only through the
  saved-tab path that updates both history representations.
- additions made while filtering can still disappear locally when the filter
  restores its older full-history copy.
- the identical defects remain present in the two sibling repositories until
  a separately authorized reconciliation.

none of these held-out facts blocks this narrow repair. none is silently
declared acceptable forever by remaining outside this slice.

## approval state

colette accepted recommendations 1–5, the explicit scope boundary, and the
single post-implementation review topology as written on 2026-11-19. that
acceptance is bound above to the reviewed draft fingerprint. colette then
separately authorized the bounded implementation and its single independent
adversarial gate. commit, push, deployment, production verification, and
sibling-repository changes remain separate transitions.

## local implementation evidence

the local candidate extracts the existing contiguous-phrase body into
`enterPhraseAsWords()`, removes key code `35` from `phraseBoxKeypress()`, points
the visible button at the named action, removes the advertised `end` shortcut,
and gives `entriesSearch()` the declared `created_at desc`, `position asc`,
`id asc` order. served cache keys were refreshed under the assets' existing
conventions. no sync, sql, migration, rls, grant, filter, or sibling-repository
file changed.

proof completed on 2026-11-19:

- focused phrase-navigation, saved-order, and menu tests: 12/12 passing;
- safety suite: 55/55 passing;
- full local suite: 128/128 passing;
- javascript syntax checks and `git diff --check`: passing;
- independent read-only adversarial disposition: `clear`;
- independent differential comparison of baseline key-code generation against
  the named action: 750 deterministic cases with no history, input, or redraw
  drift;
- independent vendored-client observation: the query serializes
  `order=created_at.desc,position.asc,id.asc`, selects `position`, and retains
  the 200-row limit.

unproven here: the owner's final physical `fn + right` observation on the
affected laptop after delivery. source and executable tests prove that key code
`35` has no mutation branch and does not prevent the browser default, but they
do not substitute for that platform-specific check.

the spec remains `accepted` rather than `retired` while that check and the
separately authorized delivery transitions remain open.
