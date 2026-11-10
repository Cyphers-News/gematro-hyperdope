# spec: legacy calculator ui-state repair sequence

status: accepted
implementation state: gate a reconciled; slice 1 verified; local checkpoint pending

> **continuity role:** proposed transition
> **owner:** cyphers technical owner
> **created:** 2026-11-10
> **accepted:** 2026-11-10 by the designated owner in conversation
> **grounded against:** `d926080bcf2ea66e269a1a8c4e6b4a3014a987d7`
> **sequence:** cipher-chart visibility, numeral-popout dismissal, then a sealed match/options decision

the owner accepted this saved specification and authorized its bounded local
implementation on 2026-11-10. the sequencing, local-commit, and no-push
boundaries remain part of that authorization.

gate a returned `revise` on 2026-11-10 after tracing chart restore/redraw
owners and number-information event collisions. the owner accepted the four
rules below in conversation, resolving the gate without broadening the two
implementation slices:

1. pinned click, tap, and context-menu activation remains limited to existing
   `.numProp` targets;
2. `.gV` and `.gVQ` retain modifier-hover behavior only;
3. a redraw that removes the pinned popover's originating number closes the
   stale popover;
4. transient hover remains traversable between its source and popover, then
   closes once the pointer has left both.

## implementation evidence

### slice 1 candidate

- the global chart option now projects chart classes and any live control
  instead of inverting prior dom state;
- settings import, redraw entry points, active focus mode, and an already-open
  focus panel converge through the same projection;
- focused state proof passes 6 of 6 cases, including restored false followed
  by one enable and all eight global/focus/focus-choice combinations;
- local headless chrome confirms the same eight combinations, restored focus
  state, focus exit, the site's 520-css-pixel mobile floor when emulating a
  390-pixel device, and an effective 200-percent visual viewport without
  document overflow or runtime exceptions;
- the full repository suite passes 84 of 84 tests; the deterministic
  classifier retains the expected amber floor for runtime ui state;
- no product file in the sealed match/options surface changed.

this evidence describes the verified pre-commit candidate. the local slice-1
commit is the rollback checkpoint and does not authorize a push.

acceptance authorizes only the bounded local implementation and verification of
slices 1 and 2, with one local commit after each slice. it does not authorize a
push, deployment, publication, sibling-repository reconciliation, or any
implementation of slice 3. match/options remains sealed until the owner
explicitly thaws it after net's daskala experiment has either happened or been
set aside.

## owner view

- change: make the cipher chart converge on one honest global visibility state after restores and focus transitions; give clicked or tapped number information an explicit nonmodal dismissal lifecycle; commit each repair locally without pushing; then stop before match/options.
- before: restored chart state can be checked, populated, and invisible; focus mode can silently veto the global chart; a clicked number panel has no close, outside, or escape path; match/options is an undecided merged surface.
- after: chart content and classes project the global boolean deterministically while focus mode retains an explicitly scoped choice; transient hover remains transient; pinned number information closes by button, outside, escape, or replacement; match/options is unchanged.
- authority: the canonical markdown spec owns the proposed transition after explicit owner acceptance; observed behavior remains evidence; reviewer findings require reconciliation; no review or test authorizes push or deployment.

## context

two inherited legacy interactions currently lie about their terminal state.
the chart defect appears only when restore or focus machinery joins the
ordinary toggle, and the number panel has creation logic without a mobile
dismissal contract. both are small amber ui repairs with several shared state
and event owners. the owner wants them executed sequentially, locally committed
without push, and stopped before a separate match/options information-
architecture decision.

## scope

in:

- deterministic cipher-chart visibility across ordinary, restored, imported,
  themed, redrawn, and focus-mode paths;
- explicit transient-hover and pinned-click number-information lifecycles;
- focused regression proof, responsive rendered proof, cache-key updates, one
  local commit per implemented slice, and two independent read-only gates;
- a visible seal preserving match/options for a later owner transition.

out:

- match/options movement, deletion, or redesign;
- new persisted settings, schema, migration, database, auth, rpc, or provider
  behavior;
- changes to number-property mathematics, history persistence, numogram code,
  sibling repositories, push, deployment, or publication;
- universal conversion of every numeric span into a new interactive control
  without a separately accepted expansion.

## confirmed owner directions

- work is sequential, not parallel.
- a material question or product decision stops the sequence before further
  implementation.
- each completed implementation slice receives its own local commit.
- no slice is pushed under this authorization.
- match/options runs last and remains held for another day or two while net has
  the opportunity to work through it with daskala.
- if that experiment does not happen, the owner may later thaw slice 3 for a
  new grounding and acceptance pass.

## owner decisions in this accepted contract

### decision 1: preserve two cipher-chart scopes

**recommendation:** preserve the global cipher-chart setting and the narrower
focus-mode setting as separate controls. rename the latter visibly to `cipher
chart in focus mode`, and make the following precedence explicit:

1. global off means the chart is absent everywhere;
2. global on plus ordinary mode means the chart is visible;
3. global on plus focus mode uses the focus-specific choice;
4. leaving focus mode reveals the globally enabled chart again.

**alternative:** remove the focus-specific cipher-chart choice and let the
global setting govern both modes.

**consequence:** the alternative is simpler but removes an existing screenshot
composition choice. this contract preserves capability while making
the state hierarchy legible.

the accepted precedence is normative for slice 1. a requested change blocks
slice 1 until the matrix below is revised and reaccepted.

### decision 2: distinguish transient and pinned number information

**recommendation:** modifier-hover remains transient; click, tap, and
context-menu activation creates a pinned nonmodal popover. a pinned popover
closes through its visible close control, an activation outside it, escape, or
replacement by another number.

**alternative:** make every number panel transient and close it whenever the
pointer leaves.

**consequence:** the alternative reproduces the mobile failure because touch
has no reliable leave gesture. this contract therefore rejects it.

### decision 3: do not decide match/options by inheritance

**recommendation:** preserve the existing match/options surface untouched in
slices 1 and 2. when slice 3 is thawed, begin from user tasks and ownership of
controls rather than the present file or menu grouping.

**alternative:** opportunistically move nearby controls while repairing the
other two defects.

**consequence:** opportunistic movement destroys the clean rollback boundary
and preempts net's pending learning exercise. this contract forbids it.

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes | this spec's visibility matrix and popover lifecycle | focused state tests plus rendered desktop, mobile, zoom, pointer, touch-equivalent, and keyboard checks |
| persisted state or schema | no | existing `optShowCipherChart` settings entry and current storage formats | restore regression using existing blobs; no new key, payload, migration, or write path |
| external or provider-visible behavior | no | current static-client boundary | changed-file inventory; no network, rpc, database, auth, or provider surface |
| identifiers, secrets or privacy | no | current calculator value and settings boundaries | no secret or identity access; number content remains generated from existing numeric values |
| lifecycle or terminal states | yes | this spec's chart projection and popover open-mode contracts | transition tests for restore, focus entry/exit, open, replace, close, outside, escape, and hover leave |
| setup, operation or recovery | yes | existing content-key practice and local test runner | source-derived cache keys, full suite, and one-commit rollback per slice |
| normative contract or decision | yes | this exact spec after owner acceptance | accepted revision plus reconciled independent preflight and candidate review |
| cross-repository dependency | no | `gematro-hyperdope` is the only authorized checkout | changed-file inventory; sister-repository reconciliation remains separate |

## grounding evidence

### cipher-chart reproduction

the fresh default sequence currently behaves correctly:

1. global option true, chart visible and populated;
2. toggle off, option false, chart empty and hidden;
3. toggle on, option true, chart populated and visible.

the supported restored-state sequence fails:

1. simulate a restored `optShowCipherChart=false` with fresh-dom class state;
2. the chart is empty while `#ChartSpot` lacks `hideValue`;
3. activate the global checkbox;
4. `optShowCipherChart` and the checkbox become true;
5. the chart receives 3,027 characters of rendered html;
6. the blind `classList.toggle("hideValue")` hides that content.

observed terminal state: option true, checkbox checked, `hideValue` present,
computed display `none`, chart content populated.

the focus-mode sequence also establishes a distinct, currently undisclosed
veto: global option true and child display `flex`, while
`body.focusHideCipherChart` makes the parent `#ChartSpotScroll` display `none`.

source seams:

- `calc/calc.js`: option export/import registration, focus controls,
  `applyFocusModeVisibility()`, and `conf_CC()`;
- `calc/breakdown.js`: chart content generation and false-state clearing;
- `calc/localstorage.js`: local/workspace restore path into `initCalc()` and
  `updateTables()`;
- `calc/styles.css`: `hideValue` and focus-parent visibility rules.

### numeral-popout reproduction

at a 390 by 844 mobile viewport:

1. activate a `.numProp` value;
2. exactly one `.numPropTooltip` appears;
3. the tooltip contains no button or element with button semantics;
4. activate outside it; the tooltip count remains one;
5. press escape; the tooltip count remains one.

no console exception is required for the failure. it is a missing lifecycle,
not a thrown error.

source seams:

- `calc/init-variables.js`: modifier-hover, click, context-menu, positioning,
  and the sole mouseleave dismissal;
- `calc/num-prop.js`: number-property content generation, which remains out of
  behavioral scope;
- `calc/styles.css`: popover geometry and the new close-control/mobile rules;
- generated `.numProp`, `.gV`, and `.gVQ` surfaces in calculator and history
  rendering.

### history

`git blame` attributes both `conf_CC()`'s blind class toggle and the current
number-tooltip event lifecycle to legacy commit `733656dc` from 2023. this is
historical provenance, not a claim about present authorship or intent.

### baseline proof

`bash scripts/test-local.sh full` passes 78 of 78 tests at the grounded
baseline. no existing test directly names `conf_CC`, `optShowCipherChart`,
`numPropTooltip`, or the dismissal lifecycle. the defects therefore require a
new focused proof surface rather than an update to an owning regression test.

## slice 1: cipher-chart visibility contract

### invariant

`optShowCipherChart` is the sole global state. dom contents, checkbox state,
inline presentation, and `hideValue` are projections. projection code may set
or remove a class from the boolean; it may not invert a class and hope that
the previous dom happened to agree.

### visibility matrix

| global chart | focus mode | chart in focus mode | required result |
|---:|---:|---:|---|
| off | off | either | chart content absent or inert and chart not visible |
| off | on | either | chart not visible; focus choice does not mutate global state |
| on | off | either | chart populated and visible |
| on | on | on | chart populated and visible |
| on | on | off | chart populated but focus parent hidden; leaving focus reveals it |

### required entry paths

the matrix must converge after each of these paths:

- ordinary checkbox off and on;
- initial local settings restore;
- explicit saved-settings load;
- account workspace restore through the shared settings importer;
- imported settings file;
- interface/theme application;
- focus-mode entry, focus control change, and focus-mode exit;
- cipher or phrase redraw while either visibility scope is active.

the repair must reuse the existing option and restoration path. it must not add
a second stored flag, mutate a settings blob merely by restoring it, or force a
save during initialization.

### likely implementation surface

- replace blind chart-class inversion in `calc/calc.js` with one deterministic
  projection seam;
- call that seam from ordinary toggle and restore/redraw boundaries as needed;
- preserve `calc/breakdown.js` as the content renderer rather than teaching css
  to infer application state;
- clarify the focus-only label without moving controls;
- update cache keys for every changed served asset in `index.html`;
- add focused state-contract tests.

exact file selection remains the implementer's choice after the semantic
preflight. duplicating synchronization across several callers is a review
finding, not a requirement.

### acceptance criteria

- every row of the visibility matrix passes from a fresh document and after a
  restored false setting;
- option, checkbox, child class, parent visibility, and rendered content never
  claim contradictory effective states;
- global off survives reload and can be turned on exactly once;
- focus-only off does not overwrite the persisted global choice;
- leaving focus mode restores the globally enabled chart;
- no restore path writes settings or history merely to display the chart;
- chart auto-fit, gradient, breakdown, export, and focus-mode layout remain
  unchanged outside visibility;
- no match/options control moves.

### rollback

revert the slice-1 commit. no data rollback or migration exists because no
persisted representation changes.

## slice 2: numeral-popout dismissal contract

### invariant

only one number-information surface exists at a time. its opening mode owns its
dismissal behavior:

- `hover`: modifier-hover information is transient and closes on the existing
  source-plus-popover pointer-leave boundary;
- `pinned`: click, tap, or context-menu information persists while it is being
  read and closes only through close, outside activation, escape, or
  replacement.

pinned activation belongs only to `.numProp`. `.gV` and `.gVQ` remain
modifier-hover surfaces because their surrounding history and query cells own
other click and context-menu behavior. if redraw removes the originating
`.numProp`, its pinned popover closes rather than preserving stale context.

the dom must carry or otherwise expose the opening mode. dismissal must not
depend on guessing whether a touch device can synthesize mouseleave.

### pinned lifecycle

| event | required result |
|---|---|
| activate a number | open one pinned popover for that number |
| activate another number | replace the existing popover; never stack |
| activate inside the popover | remain open unless the close control was used |
| activate the close control | close immediately |
| activate outside | close without also activating an obscured underlying control |
| press escape | close and preserve a sensible focus position |
| context-menu a number | open the alternate-properties variant with the same dismissal contract |
| modifier-hover, traverse into the popover, then leave both | close the transient variant |
| redraw removes the pinned source | close the stale pinned variant |

### geometry and access

- the close control has an accessible name, visible focus, and a target of at
  least 44 by 44 css pixels;
- the popover remains within the effective viewport on desktop and mobile;
- a popover taller than the viewport scrolls internally without trapping the
  page or placing the close control off-screen;
- the number and existing property tables remain unchanged;
- no dismissal is hover-only or color-only;
- document-level listeners are installed once and do not accumulate across
  repeated open/close cycles;
- the activation event that opens a popover cannot immediately trigger its
  outside-dismissal path.

### likely implementation surface

- centralize create, position, and close behavior in
  `calc/init-variables.js` while retaining existing property builders;
- add the close control as inert, fixed application markup around the existing
  generated numeric table;
- add scoped popover and mobile geometry in `calc/styles.css`;
- update served-asset cache keys in `index.html`;
- add focused lifecycle tests covering both default and alternate properties.

making every calculated number keyboard-activatable is desirable but outside
this narrow repair unless the preflight demonstrates that the new close/focus
contract cannot be honest without it. such a finding blocks implementation for
an owner decision rather than silently expanding the slice.

### acceptance criteria

- the user can always see and activate a close control without precision
  hunting;
- outside activation and escape close pinned popovers;
- modifier-hover remains transient and does not become sticky;
- click/tap does not close merely because the pointer leaves;
- context-menu alternate properties retain their content and native-menu
  suppression only on the intended number target;
- repeated openings keep exactly one popover and one set of listeners;
- 320-pixel mobile, ordinary desktop, and effective 200-percent zoom have no
  document-wide horizontal overflow or clipped close control;
- number calculations and exports remain unchanged;
- no match/options control moves.

### rollback

revert the slice-2 commit. the prior number-property content remains intact and
no persisted state requires recovery.

## slice 3: match/options simplification, sealed

### current inventory

the present matches dropdown owns:

- run matches and reset order;
- cross-cipher, same-cipher, and show-only-matching filters;
- numerology mode;
- enter-as-words and word limit;
- number and gematria calculation methods;
- database page and scroll sizing, clear query, and unload;
- switch ciphers from csv;
- clear history.

this inventory is observed structure, not an endorsement of the grouping.

### entry conditions

slice 3 remains unavailable until all are true:

1. slices 1 and 2 are locally committed and have passed the post-implementation
   adversarial gate;
2. the owner explicitly thaws match/options;
3. the outcome of net's daskala attempt is known, including any candidate,
   questions, or decision residue worth preserving;
4. the owner decides whether the surface should be simplified in place,
   re-separated, or redistributed by user task;
5. a revised or new accepted spec names the resulting control ownership,
   mobile behavior, destructive-action placement, and acceptance criteria.

### forbidden shortcuts

- do not move controls while implementing slices 1 or 2;
- do not equate the current merged menu with the desired information
  architecture;
- do not delete a control because it appears unrelated without tracing its
  call sites, settings representation, guide text, export/import behavior, and
  mobile reachability;
- do not treat net's or daskala's exploratory candidate as owner acceptance.

## ordered execution and review gates

### 0. refresh the boundary

- confirm exact checkout, branch, head, origin relation, and worktree state;
- rerun the focused reproduction if head moved;
- preserve unrelated user changes;
- run the full suite and record inherited failures before editing.

### gate a: independent semantic preflight

run one fresh, read-only reviewer after owner acceptance and before product
edits. the reviewer receives this spec, the grounded source seams, and the two
reproductions, but not a proposed patch.

the reviewer must:

- enumerate every chart-state owner and restore/redraw entry path;
- enumerate hover, click, tap, context-menu, outside, escape, focus, and
  replacement behavior for number information;
- challenge the recommended scope with at least one counterexample per slice;
- identify collisions with export, history interaction, focus mode, menus,
  mobile layout, or listener lifetime;
- classify every finding as confirmed contract, inferred dependency,
  unresolved ambiguity, or demonstrated counterexample;
- return `clear`, `revise`, or `block` with evidence.

the primary implementer reconciles every finding in this spec or in a visible
owner decision. reviewer speculation does not silently become a requirement.

### 1. implement and close slice 1

- implement only the cipher-chart contract;
- add focused state proof;
- run focused browser proof and the full suite;
- inspect diff and cache keys;
- commit locally with no push.

any unresolved behavior or material scope expansion stops here.

### 2. implement and close slice 2

- begin from the committed slice-1 boundary;
- implement only the numeral-popout contract;
- add focused lifecycle proof;
- run focused browser proof and the full suite;
- inspect diff and cache keys;
- commit locally with no push.

any unresolved behavior or material scope expansion stops here.

### gate b: independent candidate review

run a fresh, read-only reviewer against the exact two commits and their common
baseline. the reviewer must compare request, accepted spec, diff, focused
tests, full-suite result, and rendered evidence.

the reviewer must attempt these counterexamples:

- restored global chart false, then one enable;
- every focus/global visibility matrix row and focus exit;
- settings/workspace import without an incidental save;
- pinned default and alternate popovers closed by button, outside, and escape;
- hover popover leaving without affecting a pinned lifecycle;
- repeated openings without stacked dom or listeners;
- 320-pixel, desktop, and 200-percent layouts;
- confirmation that match/options and unrelated state were untouched.

findings use the same epistemic classes as gate a and return `clear`, `revise`,
or `block`. a finding is reconciled before any later push request. gate b does
not authorize push.

### 3. stop at the seal

report both local commit ids, reconciled review disposition, proof, remaining
gaps, and the still-sealed state of slice 3. do not begin match/options.

## verification commands and evidence

expected repository proof after each implementation slice:

```text
node tests/ui-state-contracts.test.js
bash scripts/test-local.sh full
git diff --check
python3 /home/resonatingloop/.codex/plugins/cache/resonatingloop/codebase-care/0.3.0/scripts/classify_change.py --repo .
```

the focused test filename is proposed, not mandatory. if an existing test
clearly owns the contract after preflight, use it and record why.

browser proof after slice 1:

- fresh default off/on;
- restored false then one enable;
- every visibility-matrix row;
- settings load, workspace-compatible restore, and focus exit;
- desktop, 390-pixel mobile, and effective 200-percent zoom;
- console and exception capture.

browser proof after slice 2:

- default and alternate properties;
- hover and pinned opening modes;
- button, outside, escape, and replacement dismissal;
- repeated open/close cycles;
- desktop, 320- or 390-pixel mobile, and effective 200-percent zoom;
- keyboard focus, viewport containment, scrolling, console, and exception
  capture.

the owner performs the final comfort check. automated checks and independent
review do not establish that the controls feel usable.

## risks and unknowns

### known risks

- a helper may synchronize one entry path while restore or theme application
  retains a contradictory class;
- focus mode hides the chart's parent while global visibility acts on the
  child, so checking only one element produces a false pass;
- a document-level outside handler may close the popover immediately on its
  opening event or consume unrelated menu/history activations;
- treating clicked and hovered popovers identically can repair mobile by
  regressing desktop modifier-hover behavior;
- rebuilding dynamic number surfaces can orphan focus or leave a popover for a
  trigger no longer present;
- a cache-key omission can make live verification exercise mixed old/new
  assets even when local source is correct.

### stop conditions

stop the active slice before further implementation when:

- an owner decision changes the visibility precedence or popover mode;
- repair requires a new persisted flag or settings-schema change;
- a trustworthy fix requires broad conversion of numeric values into new
  interactive controls;
- a proposed listener interferes with history deletion, captions, dropdowns,
  context menus, or another document-level interaction;
- the diff enters auth, account, database, rpc, import parsing, or another red
  boundary;
- head or worktree moves unexpectedly and the candidate cannot be reconciled;
- slice 3 would be touched.

## files and components expected to remain untouched

- auth and account code;
- supabase migrations, functions, and policies;
- history persistence and synchronization;
- number-property mathematics in `calc/num-prop.js`;
- numogram code and specifications;
- database contents and matching algorithms;
- sibling repositories;
- deployment configuration.

## documentation and cache reconciliation

- this spec owns the proposed transition until implementation closes;
- `FEATURES.md` already describes the enduring cipher-chart and number-property
  capabilities and needs no change unless capability, not merely reliability,
  changes;
- update `index.html` content keys for every served asset whose bytes change;
- after each slice, update this spec's implementation state and proof without
  rewriting historical reproduction evidence;
- do not create a separate verification memoir. the commit, tests, accepted
  spec, review disposition, and concise handoff are the continuity packet.

## done when

- slice 1 has one local unpushed commit that passes its focused state proof,
  browser matrix, full suite, cache-key inspection, classifier, and diff review;
- slice 2 has one later local unpushed commit that passes its focused lifecycle
  proof, browser interaction matrix, full suite, cache-key inspection,
  classifier, and diff review;
- gate a and gate b findings are classified, reconciled, and retain their
  evidence status rather than silently becoming requirements;
- the handoff names both commit ids, the grounded baseline, exact checks run,
  observed results, remaining proof gaps, and the absence of push or deployment;
- match/options is byte-for-byte outside the intended product diff and remains
  sealed for a separate owner transition.

## acceptance boundary

the owner accepted the two embedded decisions: preserve the two-tier cipher-
chart scope with an explicit focus label, and distinguish transient hover from
pinned click/tap/context-menu number information. after gate a returned
`revise`, the owner also accepted the four reconciliation rules recorded near
the top of this spec.

this acceptance applies to the exact revision recorded above. gate a's
`revise` disposition is reconciled by the explicit owner decision; no product
edit precedes that reconciliation. gate b remains required against the exact
two-commit candidate before any later push request.
