# spec: calculator history batch removal and share card

status: accepted

> **continuity role:** proposed transition
> **owner:** cyphers technical owner (colette)
> **product confirmation:** netvoid said yes emphatically to combining the two
> features, as reported by colette on 2026-11-20
> **created:** 2026-11-20
> **grounded against:** `2d4a988a6417e3390753f1083c61f9a235767e6d`
> **accepted:** 2026-11-20 by colette, accepting recommendations 1–9 and
> clearing implementation as written in draft sha256
> `42c88ef044b3a2fef223c77a80863657ba23f2eb458ccee6030846318c932176`
> **authority:** this accepted specification authorizes the bounded local
> implementation described below; it does not authorize commit, push,
> deployment, publication, database migration, or sibling-repository
> reconciliation
> **implementation state:** local candidate implemented in two bounded commits
> and independently cleared; successful real-device native share/copy and
> every push, deployment, publication, migration, or sibling-repository action
> remain pending

this specification combines two calculator-output improvements into one
review and release unit while keeping their implementations independently
inspectable:

1. select and remove several phrases directly from the history table beneath
   the calculator; and
2. render the current calculation as a branded png that can be shared, copied,
   or saved according to browser capability.

the history action removes phrases from calculator history only. it never
withdraws, edits, hides, or deletes a published phrase submission. the share
action creates a local image only after an explicit user gesture. it never
uploads the image or phrase to cyphers, supabase, an analytics service, or a
new provider.

## implementation evidence

the bounded local candidate was completed on 2026-11-20 without a push,
deployment, migration, provider call, upload, submission mutation, or
sibling-repository write. after separate boundary verification, the history
slice was committed as `235c0ff`; the share-card implementation and this final
evidence record form the following commit.

the candidate changes `calc/calc.js`, `calc/init-variables.js`,
`calc/profile-tab.js`, `calc/export.js`, `calc/styles.css`, and `index.html`,
and adds the two focused test files named in this specification. current
content-derived browser keys cover every changed served asset.

local verification on the final candidate:

- the combined focused history/share/reconciliation command passed 37 of 37;
- the repository safety suite passed 55 of 55;
- the complete local suite passed 151 of 151;
- `git diff --check` returned clean;
- desktop, 320-css-pixel, 200-percent-zoom, duplicate-history, long-phrase,
  comment-bearing, extreme-colour, save-png, close-during-refresh, and
  permission-denial fixtures were exercised in isolated headless chromium;
- the saved png had a valid png signature and matched the preview payload;
- with focus mode hiding the live breakdown, the staged share breakdown
  remained visible and produced a complete 517,322-byte png;
- duplicate removal exposed `1 phrase / 2 rows` in both visible and accessible
  confirmation text, changed no history on the first activation, and removed
  every matching occurrence on the second.

the independent realized-diff review first blocked on two defects caused by
the candidate: global focus-mode selectors could hide the staged share grid,
and the duplicate-aware confirmation text did not replace an older explicit
accessible name. the focus projection is now contained beneath `#calcMain`,
and the shared armed-button helper now preserves, replaces, and restores
accessible names. the same reviewer re-read the repaired diff and returned
`pass`, with no remaining touched-scope blocker or regression.

successful operating-system clipboard image copy and native file share remain
release evidence, not claims made by this local implementation. their exact
one-png payloads and capability gates passed focused tests; the isolated
browser's refused clipboard path correctly kept the preview open and left
Save png available. deployed cache propagation and real-device behavior are
also unverified until an authorized release surface exists.

## owner view

- **change:** add a quiet selection mode to the calculator history
  table and an honest share control for the active calculation, with one
  bounded history reconciliation and local png generation.
- **before:** history offers occult single-row deletion gestures and a
  whole-table clear, so cleaning thirty accidental fragments takes thirty
  confirmations and redraws; the existing word-breakdown exporter makes a
  plain image hidden inside the Export menu, while the fixed top-right
  share-shaped glyph actually toggles focus mode.
- **after:** a compact table control selects visible phrase identities and
  removes them together without touching publication; a distinct share icon
  opens a matrix-filamented preview offering native share, copy image, and
  save png wherever each action is genuinely supported.
- **authority:** colette and netvoid have adopted the combined product
  direction. exact implementation authority still begins only after colette
  accepts this canonical draft revision.

## context

an `end` / laptop `fn + right` collision formerly invoked `enter as words` and
generated contiguous phrase fragments. that collision is repaired in
`2d4a988`, but cleaning an already affected history exposed the second half of
the problem: the calculator history table has no batch-management surface.
colette had to visit Profile → Saved and repeatedly remove rows there. the
profile screen was the emergency exit, not the target surface.

the need is not to retract the submitted phrases. a phrase may remain public
while disappearing from the owner's calculator history. those are separate
records and separate user intentions.

the same discussion returned to a long-standing social use of the calculator:
people frequently post ordinary page screenshots. the application already
contains extensive image-export machinery and a focus mode for making manual
screenshots cleaner, but the dedicated word-breakdown png is visually thin
without the code-rain atmosphere and is buried among many text-labelled
Export actions. the desired action is compact, recognizable, and native to
the result being shared.

## grounded current behavior

### calculator history

- `updateHistoryTable()` in `calc/calc.js` renders the table beneath the
  calculator from `sHistory`.
- every rendered phrase row carries its `sHistory` index in `data-ind`.
- a row has a focus/hover-revealed `×` and the table also supports
  shift-click deletion. both mutate only `sHistory` and redraw immediately.
- the first repeated header contains a guarded whole-table `×`.
- `Find Matches` may display only an ordered subset through
  `histDisplayOrder` without replacing `sHistory`.
- other filter paths temporarily place the visible projection in `sHistory`
  and retain the complete pre-filter history in `userHistory`.
- `histSyncSnapshot()` intentionally treats non-empty `userHistory` as the
  canonical saved history and merges visible additions into it. deleting only
  from filtered `sHistory` therefore does not durably delete the phrase.
- `profileDeleteEntry()` already demonstrates the required explicit-deletion
  rule: remove the phrase from both `sHistory` and `userHistory` before the
  next account reconciliation.
- account synchronization stores one row per `(user_id, phrase)`. local
  history can nevertheless contain duplicate strings, including after
  explicit contiguous-phrase generation.
- published phrases live on the submission/social path. history
  reconciliation does not withdraw them, and submission withdrawal does not
  define calculator-history membership.

### image export and focus mode

- `calc/export.js` lazy-loads the vendored `html2canvas` build only when an
  image is requested.
- `Print Word Breakdown` temporarily prepares `#BreakdownSpot`, renders it,
  trims transparent pixels, and opens a preview with Save Image and Refresh.
- the existing export already records the visible phrase without bracketed
  comments, active cipher, total, letter/word count, and breakdown.
- no current image path writes a png blob to the clipboard or invokes the Web
  Share API.
- `#focusModeBtn` is a fixed top-right control whose box-and-up-arrow glyph is
  conventionally read as Share, but its actual behavior is to toggle focus
  mode for manual screenshots.
- the fixed left-side display-options control and the focus-mode behavior are
  independently useful and must not become accidental casualties of adding
  an actual share action.

## owner decisions

### decision 1: one release unit, two commit boundaries

- Recommendation: implement on one feature branch and review as one
calculator-usability release, with history batch removal and share-card
generation in separate commits. each focused test file must pass at its own
commit boundary; the final branch receives one integrated rendered pass and
one independent adversarial diff review.

- Alternative: combine every change in one commit, or run two unrelated
specification/release cycles.

- Consequence: one commit obscures which state machine caused a regression.
two release cycles add ceremony without isolating any deployment or schema
boundary. two commits inside one branch preserve both coherence and diagnosis.

### decision 2: selection mode lives on the history table

- Recommendation: place one compact, always discoverable selection control
in the first history-table header. activating it enters an explicit selection
mode. each phrase row gains a visible checkbox/selection mark; clicking the
checkbox or phrase area toggles that phrase identity; selected rows receive a
non-color-only visual state; and a compact action strip shows selected phrase
count, `Select visible`, `Remove`, and `Cancel`. `Remove` is disabled at zero
selections. `Cancel`, Escape, or successful removal exits the mode and clears
selection. outside selection mode, the table retains its current row
interaction. no permanent checkbox forest appears during ordinary
calculation.

- Alternative: put batch management only in Profile → Saved, or leave
selection boxes permanently visible.

- Consequence: Profile → Saved repeats the detour that produced this request.
permanent checkboxes spend dense visual space on a minority action. a latent
mode keeps the table quiet until the user asks to curate it.

### decision 3: selection identifies phrases, not unstable row positions

- Recommendation: selection state is a set of exact phrase strings. selecting
one occurrence marks every visible identical occurrence. the action strip
counts unique phrase identities; if a duplicate is present, its repeated rows
are visibly selected together and the confirmation states that all occurrences
of the selected phrase will leave history.

- Alternative: store rendered indices and delete only the selected local
occurrence.

- Consequence: indices are invalidated by redraws, match ordering, filtering,
and earlier deletion. account history is unique by phrase, so leaving another
identical occurrence can immediately re-create the supposedly removed record.
phrase identity matches the persisted contract and prevents a hidden
many-to-one resurrection.

### decision 4: only visible phrases may enter the selection

- Recommendation: `Select visible` derives its candidates from the rendered
history rows, not from all of `sHistory` or `userHistory`. if filtering,
`Find Matches`, or another redraw hides a selected phrase while selection mode
is active, prune that phrase from the selection before enabling removal. the
user never removes a phrase that is absent from the current table.

- Alternative: retain hidden selections across filter and match changes and
show only the aggregate count.

- Consequence: hidden persistence enables a compact control to delete rows
the user can no longer inspect. pruning is the safer contract and keeps the
action strip small; users may deliberately select another visible result
after changing the view.

### decision 5: one canonical removal action, redraw, and sync

- Recommendation: introduce one history-domain helper that removes a set of
phrase identities from both `sHistory` and non-empty `userHistory`, retires or
reconciles stale display ordering, redraws once, and requests one immediate
`histSyncFlush()` when account synchronization is active. route the new batch
action plus the history table's existing row `×` and shift-click gesture
through that helper so one surface cannot retain contradictory deletion
semantics.

`Remove` uses the project's existing armed-button pattern: the first
activation names the exact unique-phrase count; the second activation executes
without a browser `confirm()` dialog. publication records are never queried or
mutated.

- Alternative: splice selected indices in a loop and let the normal watcher
eventually notice, while leaving the old row handlers unchanged.

- Consequence: looped splices invalidate later indices, cause intermediate
redraws, and reproduce the filtered-history resurrection bug. an immediate
single flush makes the explicit durable action observable while preserving
the existing retry/status behavior on network failure.

### decision 6: the actual share control and focus control must look honest

- Recommendation: keep focus mode as a first-class fixed control, replace its
misleading box-and-up-arrow glyph with an unambiguous focus/frame glyph, and
place a new icon-only Share button beside it in the same quiet fixed cluster.
both controls keep accessible names, tooltips, focus-visible treatment, and
44-pixel touch targets.

- Alternative: commandeer the current share-shaped control for sharing and
move focus mode inside the share preview.

- Consequence: commandeering avoids one icon but makes an established
display mode harder to reach and couples two independent behaviors. two small,
truthful icons are more minimal than one icon with a secret second office.

### decision 7: share a purpose-built cyphers card

- Recommendation: Share renders an offscreen card from the current active
word breakdown rather than capturing arbitrary page chrome. the card contains
the visible phrase text under the breakdown's comment-stripping rule, active
cipher name and calculation-mode label, total, available letter and word
count, the complete rendered letter/value/word-sum breakdown, a restrained
`cyphers.news` signature, and a static low-contrast matrix-rain layer. the rain
is generated locally and is independent of live code rain. the active cipher
supplies the result accent; a controlled dark palette and contrast ceiling
keep extreme themes legible. content determines card height, long phrases
wrap, and no fixed social crop may discard the breakdown.

- Alternative: export the existing bare `#BreakdownSpot`, capture the whole
viewport, or require live code rain to be running.

- Consequence: the existing bare export is the visually thin artifact under
discussion. viewport capture reintroduces navigation and unrelated state.
depending on a live animation makes output timing, theme, and disabled-rain
state part of the file contract. a dedicated local card is stable, branded,
and bounded.

### decision 8: preview first, then capability-honest actions

- Recommendation: the Share control generates the png and opens one preview.
the preview holds the already-generated png blob so every consequential action
begins with a fresh user gesture. show `Share` only after file-share capability
is confirmed; show `Copy image` only in a secure context with clipboard-write
and `ClipboardItem`; always show `Save png`; and retain `Refresh` only when it
re-renders the same current calculation. native share receives one png File
and clipboard receives one `image/png` blob. share cancellation is quiet;
denial or failure leaves the preview open and Save png available.

- Alternative: invoke native share immediately from the icon, show disabled
actions everywhere, or silently turn a failed copy/share into a download.

- Consequence: generating before the action sheet may lose transient browser
activation, while preview action buttons restore a direct gesture around the
already-created blob. capability-honest controls avoid dead affordances and
silent fallback avoids neither confusion nor accidental downloads.

### decision 9: primary repository only

- Recommendation: specify, implement, verify, and review only
`gematro-hyperdope`. record sibling reconciliation as a later explicit
operation after the primary diff is accepted and proven.

- Alternative: edit `cyphers-news.github.io` and `ciphersnews` in the same
implementation pass.

- Consequence: the repositories have distinct histories and product intent.
simultaneous copying would erase provenance and make it unclear which source
defined the behavior. this draft authorizes no sibling write.

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes | decisions 2, 5, 6, 7, and 8 | focused state tests plus rendered desktop, narrow, zoom, touch, and keyboard observations |
| persisted state or schema | yes | existing `history_entries_sync(phrases text[])`; state changes, schema does not | exact canonical snapshot after batch removal; no migration or sql diff |
| external or provider-visible behavior | yes | decision 8; only a user-invoked browser/os surface changes | capability-stub tests and one real native-share-capable browser check; no automatic request or upload |
| identifiers, secrets or privacy | yes | share payload and privacy invariants below; bounded export only | generated-card inspection proves no account, history corpus, ids, tokens, comments, or hidden rows are included |
| lifecycle or terminal states | yes | selection and share-preview state contracts | transition tests for enter, select, prune, arm, remove, cancel, share, copy, save, failure, and close |
| setup, operation or recovery | yes | existing local-test and content-hash practice | focused tests, safety suite, full suite, served-key checks, and fallback observations |
| normative contract or decision | yes | this exact draft after explicit owner acceptance | accepted content fingerprint and owner decision record |
| cross-repository dependency | yes | decision 9; sibling reconciliation is deferred | primary changed-file inventory and a separately authorized reconciliation later |

risk: amber. batch removal is a bounded destructive change to durable member
history, and share/copy crosses from page memory into a user-controlled browser
or operating-system surface. neither slice changes schema, authentication,
publication, grants, providers, or server-side execution. one independent
read-only adversarial review of the realized two-commit diff is required; old
defects outside touched behavior are filed separately rather than absorbed
into another specification revision.

## scope

in:

- a compact selection-mode entry point on the history table beneath the
  calculator;
- exact-phrase selection, row marking, select-visible, cancel, selected count,
  and armed batch removal;
- canonical removal from visible and pre-filter history representations;
- one redraw and one immediate reconciliation request per completed batch;
- routing the table's existing row `×` and shift-click deletion through the
  same canonical helper;
- preserving publication and submission records exactly;
- an actual share button with a semantically distinct focus-mode control;
- a local, branded, matrix-backed png card for the active word breakdown;
- capability-detected native file share, png clipboard copy, and universal
  save fallback from a preview;
- focused automated proof, rendered proof, cache-key reconciliation, full
  local verification, and one independent realized-diff review.

out:

- deleting, withdrawing, editing, unreacting to, or hiding published phrase
  submissions;
- adding a bulk action to Profile → Saved or changing its 200-row query;
- changing history size limits, load/merge behavior, sync retry policy, rpc
  payload, schema, rls, grants, indexes, or migrations;
- undo, trash, retention windows, batch provenance, or reconstructing the
  original accidental generation event;
- changing `enter as words`, phrase generation membership/order, or the
  repaired `end` navigation contract;
- redesigning `Find Matches`, its ordering algorithm, or filter semantics;
- sharing the complete history table, enabled-cipher chart, numogram,
  astrology, date calculator, number-properties panel, or arbitrary page
  regions through the new compact control;
- usernames, avatars, account ids, saved-history lists, private comments,
  reactions, or analytics in the share image;
- uploading images, generating hosted links, adding analytics, calling an
  image/model provider, or adding a runtime dependency;
- replacing the existing advanced Export menu or its other print targets;
- fixed social-network templates or platform-specific posting integrations;
- sibling-repository edits, commits, pushes, deployments, or publication.

## governing invariants

### history/publication boundary

calculator-history removal changes only the local history arrays and their
existing account mirror. no batch-selection or removal path reads or writes
phrase submission, reaction, moderation, notification, or publication state.

### canonical deletion

explicitly removing a phrase eliminates every exact occurrence from both
`sHistory` and a non-empty `userHistory` before synchronization observes the
new state. a filtered or match-ordered view cannot preserve a hidden copy that
later restores the phrase.

### visible-selection boundary

only currently rendered phrase identities can be selected or removed. a
redraw prunes identities that are no longer visible. selection state never
uses a stale row index as durable identity.

### bounded destructive action

selection alone changes no history. the first Remove activation only arms the
exact selected set and count; the second applies it. changing selection,
canceling, leaving the mode, or focusing a different destructive control
disarms the action.

### one mutation wave

one confirmed batch computes the surviving arrays before assignment, assigns
each representation once, retires stale display-order state once, redraws once,
and requests at most one immediate account flush. a failed flush does not
claim durable success; existing retry/status behavior remains authoritative.

### share payload boundary

the share card is derived only from the active visible breakdown and fixed
site signature. it contains no history rows beyond the active phrase, no
bracketed private comment, no account/profile data, and no hidden dom content.

### local generation and explicit egress

image generation is local. no egress occurs when opening or closing the
preview. a png leaves page memory only through an explicit Share, Copy image,
or Save png activation. there is no automatic upload or telemetry event.

### capability honesty

unsupported native-share or clipboard actions are absent, not decorative.
runtime failure keeps the preview and save path available and produces no
false success. native share cancellation is not presented as an error.

### complete and legible image

the active phrase, cipher, total, available counts, and complete rendered
breakdown are present once, untruncated, and legible against the static matrix
field. the rain supports the object; it cannot obscure the calculation.

### semantic icon honesty

the box-and-up-arrow glyph means Share. focus mode retains its behavior under
a distinct focus/frame glyph. both controls expose their names to assistive
technology and visible tooltips without relying on icon interpretation.

### scope escape

implementation stops for a new owner decision if it requires a database
migration, submission mutation, history-sync contract change, remote image
service, new dependency, arbitrary-page capture, sibling-repository write, or
removal of focus mode.

## interaction contracts

### history selection state

```text
idle
  -> activate select
selecting (0 selected)
  -> toggle visible phrase / select visible
selecting (n selected)
  -> remove
armed (same n exact phrase identities)
  -> remove again
applied -> idle

selecting or armed
  -> selection changes: selecting, disarmed
  -> filter/redraw hides a phrase: prune it, disarm
  -> cancel or escape: idle, no mutation
```

the action strip uses ordinary task language. `Remove` becomes
`Remove 12 phrases?` while armed. singular/plural grammar follows the unique
phrase count. if duplicates exist, every duplicate row for that identity is
marked before removal; the accessible description states that all matching
occurrences leave history.

### share preview state

```text
no active breakdown
  -> share: notification, no preview, no png

active breakdown
  -> share: generate local png blob
  -> generation failure: notification, no false preview
  -> success: preview with supported actions

preview
  -> share: native share sheet; cancel returns quietly
  -> copy image: clipboard success notification or recoverable failure
  -> save png: local download
  -> refresh: regenerate from current active breakdown
  -> close/escape/outside: discard preview reference, no mutation
```

changing the calculator while a preview is open does not silently rewrite the
already-visible image. Refresh deliberately regenerates from the current
breakdown and updates the preview, filename, blob, and capability payload
together.

## likely implementation surface

- `index.html`
  - add the fixed share control beside focus mode;
  - replace focus mode's misleading share glyph;
  - refresh content-derived keys for changed browser assets.
- `calc/calc.js`
  - own history selection state and shared exact-phrase removal helpers;
  - render the table selection control, row marks, and action strip;
  - keep table redraw/empty-history behavior coherent.
- `calc/init-variables.js`
  - route row interaction, shift-click, selection toggles, and existing row
    deletion into the shared history action;
  - avoid modifier-action collisions while selection mode is active.
- `calc/profile-tab.js`
  - reuse or delegate to the generic exact-phrase removal primitive rather
    than maintaining a conflicting profile-only array rule.
- `calc/highlighter.js`
  - only if necessary, expose or notify the rendered visible phrase set so a
    redraw can prune selection; do not change match calculation or ordering.
- `calc/export.js`
  - build and dispose the offscreen share card;
  - produce and retain a png blob plus preview url;
  - add capability checks and native share/copy/save handlers;
  - preserve the existing advanced image exports.
- `calc/styles.css`
  - selection-mode/table-action styling, honest icon cluster, share card,
    preview actions, responsive/zoom/focus/reduced-motion states.
- focused tests
  - add independent history-batch and share-card state-contract coverage;
  - extend existing history reconciliation and content-hash proofs where the
    shared deletion primitive changes their seam.

`auth/history-sync.js`, sql migrations, submission/social code, and
`calc/coderain.js` are not expected to change. reusing a read-only bundled
glyph list is acceptable only if it does not couple card generation to live
animation state; otherwise the card owns a small deterministic static field in
`calc/export.js`.

## implementation by invariant

### commit 1: batch removal from calculator history

1. **establish pure identity operations.** implement/test helpers that derive
   unique exact phrase identities, filter complete history arrays without
   index mutation, identify the rendered visible set, and prune selection.
2. **introduce selection state without mutation.** render the header control,
   checkboxes/row states, action strip, selected count, select-visible, cancel,
   Escape, and disarming rules. ordinary mode remains visually and
   behaviorally unchanged.
3. **apply one canonical removal.** compute survivors for `sHistory` and
   non-empty `userHistory`, update state once, clear selection/order state,
   redraw once, and request one flush. no publication api is imported or
   called.
4. **reconcile existing table deletion.** route the row `×` and shift-click
   through the same helper while preserving their one-phrase interaction and
   current confirmation behavior.
5. **prove the boundary.** cover unfiltered, filtered, match-ordered,
   duplicate, signed-out, signed-in success, sync-failure, empty-result, and
   redrawn-selection cases before the commit is considered complete.

### commit 2: branded share card and capability fallbacks

1. **separate icon meanings.** give focus mode a focus/frame glyph and add the
   accessible share control without altering focus options or focus-mode
   state.
2. **build a bounded card model.** snapshot the active visible phrase,
   `breakCipher`, total, available counts, and current rendered breakdown.
   reject empty or invalid source state before creating a preview.
3. **render locally.** create an offscreen card with static matrix canvas,
   controlled palette, site signature, and cloned/normalized breakdown;
   rasterize it through the existing lazy exporter, trim safely, create one
   png blob, then remove the staging dom.
4. **extend the preview, not the network.** show only supported native-share
   and clipboard actions, keep Save png universal, handle cancellation and
   failure, revoke stale object urls on refresh/close, and retain existing
   preview security rules for phrase-derived filenames/content.
5. **prove the artifact.** inspect ordinary, long, punctuation-heavy,
   user-colored, comment-bearing, narrow, and high-zoom cases; stub browser
   capabilities in focused tests and exercise at least one real supported
   share/copy path before release consideration.

### integrated gate

- run both focused suites, the repository safety suite, and the full suite;
- inspect the combined diff for submission, migration, provider, analytics,
  and dependency escape;
- render the live calculator at desktop, phone width, and 200 percent zoom;
- use keyboard-only operation for both modes and a coarse-pointer device or
  emulation for table selection;
- generate, copy/share where supported, and save the same current card;
- obtain one independent read-only adversarial review of the realized diff;
- reconcile findings that arise from touched behavior only. pre-existing
  defects outside these contracts become separate bug records and do not
  enlarge this specification.

## acceptance criteria

### history

1. ordinary history-table rendering contains no permanent selection boxes or
   batch toolbar.
2. the first table header exposes one keyboard- and touch-reachable control
   named `Select history phrases`, with an accurate pressed state.
3. selection mode visibly marks chosen rows without using color alone; plain
   row activation toggles selection and does not trigger load, reorder, or
   deletion gestures.
4. `Select visible` selects exactly the unique phrase identities represented
   by rendered rows, including a `Find Matches` subset and a filtered subset.
5. a redraw that hides a selected phrase removes it from the selection and
   disarms Remove; a hidden phrase is never deleted by the compact action.
6. selecting one duplicate exact phrase visibly selects every rendered
   duplicate and removal eliminates every exact occurrence from both history
   representations.
7. the first Remove activation changes no array and sends no request; the
   second activation removes the same exact selected identities.
8. one completed batch assigns each affected history representation once,
   redraws once, and calls `histSyncFlush()` no more than once.
9. while filtered, batch removal deletes the selected phrase from both
   `sHistory` and `userHistory`; clearing the filter cannot restore it.
10. while match-ordered, batch removal affects selected rendered phrases only;
    stale display indices cannot delete a different phrase.
11. the existing table-row `×` and shift-click deletion follow the same
    filtered/canonical rule after this change.
12. signed-out removal makes no account request. signed-in removal uses only
    the existing history reconciliation path and sends the surviving canonical
    phrase snapshot.
13. sync failure produces no durable-success claim and leaves the existing
    retry/paused status authoritative; it does not restore publication or call
    a submission endpoint.
14. removing every selected phrase leaves a genuinely empty table and a
    canonical empty history without invoking whole-table clear implicitly.
15. Cancel and Escape leave history unchanged; leaving or completing selection
    clears all temporary selection/armed state.
16. the batch controls remain usable at 320 css pixels, 200 percent zoom,
    keyboard only, and coarse pointer, with no document-wide horizontal
    overflow and no target smaller than 44 by 44 css pixels on touch.

### share

17. the box-and-up-arrow glyph invokes Share and exposes that name; focus mode
    keeps its current state behavior under a distinct focus/frame glyph.
18. Share with no active word breakdown creates no image, clipboard write,
    native share, or download and reports what is needed.
19. a successful card contains the visible comment-stripped phrase, active
    cipher and mode label, exact total, available letter/word count, complete
    rendered breakdown, static matrix field, and `cyphers.news` signature.
20. long phrases wrap and the card grows; no phrase, value, sum, cipher name,
    or signature is clipped at desktop or narrow widths.
21. the matrix field remains subordinate enough that every calculation field
    passes the repository's visible contrast review across representative
    themes and extreme allowed cipher colors.
22. the card contains no username, avatar, account identifier, full history,
    hidden filtered row, bracketed private comment, reaction, token, or
    analytics identifier.
23. opening, refreshing, and closing the preview make no network request other
    than the existing one-time local vendored-script load if `html2canvas` has
    not already loaded.
24. native Share appears only after a positive file-share capability check and
    receives exactly one `image/png` file with a sanitized bounded filename.
25. cancelling native share is quiet. native-share failure keeps the preview
    open, reports failure, and leaves Copy image and Save png available as
    supported.
26. Copy image appears only with the required secure clipboard capabilities,
    writes exactly one `image/png` blob, announces success, and preserves Save
    png after denial or failure.
27. Save png is always present after successful generation and downloads the
    exact image shown in the preview without executing phrase-derived markup.
28. Refresh atomically replaces preview image, filename, blob, and action
    payload from the current breakdown and revokes the superseded object url.
29. closing by control, Escape, or overlay releases temporary dom/object urls
    and leaves calculator, focus mode, history, and account state unchanged.
30. no new upload, analytics, provider, database, dependency, submission, or
    publication path exists in the final diff.

### release

31. changed browser assets are served under their repository-standard current
    content keys; a hard refresh cannot mix old handlers with new markup.
32. both focused test files, the safety suite, and the full local suite pass at
    the final commit.
33. one independent reviewer returns `clear`, or every touched-scope finding is
    reconciled and the focused/full gates are rerun before release is proposed.

## validation plan

focused automated proof:

```text
node --test tests/history-batch.test.js
node --test tests/share-card.test.js
node --test tests/history-sync-reconciliation.test.js tests/ui-state-contracts.test.js
bash scripts/test-local.sh safety
bash scripts/test-local.sh full
```

the exact focused filenames may change if the implementation finds a smaller
existing owner, but history and share must remain independently runnable. node
tests may prove state, source boundaries, capability dispatch, cleanup, and
content hashes. they do not substitute for rendered browser or operating-
system behavior.

rendered history fixtures:

- empty, one-row, thirty-row, repeated-header, and duplicate-phrase histories;
- natural order, `Find Matches` order, and a filter whose hidden canonical
  history contains selected and unselected phrases;
- signed out, signed in/success, and signed in/forced sync failure;
- desktop, 320-pixel width, 200 percent zoom, keyboard only, coarse pointer,
  and reduced motion;
- observation of redraw count, focus after removal, scroll preservation, and
  absence of intermediate reordering while selections are being made.

rendered share fixtures:

- a short two-word phrase, a long wrapping phrase, punctuation/diacritics,
  a phrase with a bracketed comment, a derived cipher, and an extreme allowed
  cipher color;
- live code rain on and off, proving the card keeps its own static field;
- native-share supported/unsupported, clipboard supported/unsupported,
  permission rejection, share cancellation, save, refresh, and close;
- desktop preview, phone-width preview, 200 percent zoom, keyboard traversal,
  visible focus, 44-pixel targets, and no horizontal page overflow;
- visual comparison between preview and saved/copied/shared png so actions do
  not carry a stale blob.

release proof:

- inspect the final changed-file list and grep for new fetch/xhr/supabase,
  analytics, provider, dependency, and submission calls;
- inspect the exact native share and clipboard payloads in instrumented tests;
- confirm no migration, package/dependency, social, moderation, or sibling
  repository file changed;
- generate the static change atlas from this exact accepted revision;
- run one independent read-only adversarial review against this specification
  and the realized two-commit diff;
- treat deployed cache propagation and real mobile native-share behavior as
  unverified until checked on the authorized deployed surface.

## risks and unknowns

| risk or unknown | treatment in this draft |
|---|---|
| a filtered view hides the canonical phrase copy | exact-phrase removal reaches both arrays before one flush |
| duplicate local strings disagree with unique persisted rows | phrase-identity selection marks/removes all exact occurrences |
| selection survives a redraw invisibly | redraw prunes to rendered phrase identities and disarms removal |
| browser share/clipboard support differs | positive capability detection plus always-present save recovery |
| asynchronous image generation loses user activation | generate first; perform share/copy from a new preview-button gesture |
| live rain is disabled, moving, or theme-dependent | card owns a static local matrix layer with controlled palette |
| phrase-derived content enters markup or filenames | text-only dom construction/escaping and bounded sanitization retain existing export security rules |
| focus and share use the same conventional glyph | keep both behaviors but assign two truthful icons |
| long breakdown exceeds a social crop | content-driven height; no fixed platform crop in this slice |
| an unrelated defect appears during review | file it separately unless the realized diff caused it; do not expand this spec automatically |

no owner decision remains blocked if the recommendations above are accepted as
written. the exact focus glyph, static glyph distribution, and pixel spacing
remain bounded implementation choices subject to the rendered acceptance
criteria; they do not change product semantics.

## done when

- colette has explicitly accepted one exact fingerprint of this specification.
- commit 1 satisfies every history acceptance criterion and its independently
  runnable focused tests before share-card code is added.
- commit 2 satisfies every share acceptance criterion without weakening the
  proven history boundary.
- the safety and full local suites pass on the combined branch, and the
  rendered desktop, narrow, zoom, keyboard, pointer, and png checks are
  recorded honestly.
- one independent adversarial review of the realized diff returns clear or
  every touched-scope finding is reconciled and the gates are rerun.
- the final changed-file proof contains no migration, submission mutation,
  upload/provider/analytics path, runtime dependency, sibling-repository edit,
  push, deployment, or publication.

## acceptance record

this draft becomes accepted only when colette explicitly accepts this exact
revision or accepts named changes that are incorporated and fingerprinted.
enthusiasm, netvoid's product confirmation, atlas viewing, implementation
discussion, or approval of the earlier conversational shape does not by itself
authorize code changes.
