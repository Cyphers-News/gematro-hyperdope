# spec: matches menu cleanup

status: accepted

> **continuity role:** proposed transition
> **owner:** cyphers technical owner (colette)
> **requested by:** net
> **drafted by:** daskala, with net
> **revision 5 reconciliation:** codex, with colette
> **created:** 2026-11-13
> **revision 5 created:** 2026-11-15
> **grounded against:** `182d0881c37c9228f58a3d972945f438b596abb9` (the
> committed home-key/history-clear repair). `git diff 388c692 182d088` hashes to
> sha256 `8ef95edeb23df7bb1b97956a72ea5c95092cc089d6a63ad8ab2b93e346a9a050`,
> byte-identical to the provisional candidate revision 5 was drafted against;
> 55/55 safety and 116/116 full re-run at `182d088` (daskala, 2026-11-15).
> independent review of that repair is not recorded here.
> **accepted:** 2026-11-15 by net, in conversation ("i approve the spec as
> written"), approving revision 5 sha256
> `01ecad50a5bbf879c59d6247b07581f3bbf3c30757996c7e0f8cc88b7fdb3933`; colette
> designated net's explicit approval as the acceptance gate. the only edits since
> are this grounding line and status. implementation requires net's separate
> "approved to build". daskala's review points (a) `:focus-within` keeps the
> panel open after a mouse click in chromium, contradicting the "mouse leaves →
> closes (unchanged)" row; (b) "reset settings to default" and profile csv
> "replace" are absent from the clear inventory — are pending owner answers; any
> text change they cause returns to net for re-approval.
> **supersedes:** none. this is the candidate that slice 3 of
> `specs/legacy-ui-state-repair-sequence.md` ("match/options simplification,
> sealed") waits on.

**revision 5 (2026-11-15):** rebased the destructive-history contract onto the
explicit clear action introduced by the home-key repair; made net's 2A guard
consistent across every whole-history clear surface; repaired the escape versus
`:focus-within` contradiction; removed false menu-button aria semantics; and
separated product review from technical verification.

**revision 4 (2026-11-14):** net chose 2A and confirmed clear-history scope.

**revision 3 (2026-11-14):** rebased onto `fed72bd` (filtered clear-all fix);
decision 5 rewritten from the semantic preflight receipt.

**revision 2 (2026-11-13):** addressed the owner's `revise` review of revision 1
(sha256 `fc31e848…3f3f`): opening contract, clear-history ambiguity in the
matrix, settings persistence, perceived-vs-observed ordering, review visuals.

only the designated owner may change `status` from `draft` to `accepted` or
`rejected`. implementation against a draft spec requires separate explicit
authorization. per the governing sequence spec, match/options stays sealed
until the owner explicitly thaws it. this draft preserves the outcome of net's
daskala attempt and reconciles it with later repository changes; it is not
owner acceptance.

## owner view

- change: clean up and reorder the matches menu so the most useful actions are
  obvious and easy to find.
- before: the menu feels messy and a bit hidden. the "click to find matches"
  text is confusing, and new people probably don't realize the match button
  itself is clickable. important stuff like enter as words is buried under
  calculate, and clear history is in a weird spot. switch ciphers is unclear
  and feels out of place.
- after: a newcomer should open the menu and immediately understand what to
  do. the main actions should feel obvious without needing to hunt or hover,
  and the powerful features (especially enter as words) should be right near
  the top.
- authority: this markdown spec after owner acceptance.

(owner view written by net, lightly formatted.)

note on "buried": in source, enter as words already sits above both
calculation tables (`createFindMatchesMenu`, `calc/calc.js`). net's sense that it
is buried is perceived discoverability in a long undifferentiated panel, not
observed ordering. the real transition is clearer grouping and emphasis, not
moving enter as words relative to calculate.

## context

the old options tab was folded into the matches dropdown in an earlier
change (see the comment block above `createFindMatchesMenu` in `calc/calc.js`).
the result has 15+ controls in one long panel (about 740px tall at 1366x900).
net, who did that merge, asked for it to be simplified before handoff.

net confirmed that "match" means matching within the history table, which
is what the matches tab does today (`updateHistoryTableAutoHlt`). database
search is a separate query button and is not in scope.

a mockup was built in a throwaway copy (not in the repo) and reviewed by net.
see review visuals.

after revision 4, the owner repaired a separate destructive keyboard bug: the
home key and fn+left-arrow had been routed through `phraseBoxKeypress(36)` and
could erase history. the repair makes home ordinary text navigation, introduces
one explicit local mutator (`clearHistoryTable`), and requires confirmation at
every visible whole-history clear surface. revision 5 treats that candidate as
the new baseline rather than asking the matches cleanup to resurrect case 36.

## review responsibilities

- net owns whether the rendered grouping, labels and emphasis solve the product
  problem she described.
- daskala may use the revision 4 → 5 change note to explain why the technical
  contract moved, but net is not responsible for certifying sync, focus, aria,
  cache-key or persistence details.
- the owner and independent reviewers own those technical gates.
- return to net only for a genuine product preference or a final rendered
  recognition pass, not repeated technical spec reconciliation.

## owner decisions

### decision 1: make "find matches" an explicit button (net: A)

- recommendation: add a "find matches" button at the top of the panel; the
  tab click keeps running matches as a shortcut.
- alternative: keep only the tab click, and reword the hint.
- consequence: this reverses an earlier deliberate removal ("no find matches
  button here, the tab itself runs the search"). it adds discoverability once
  the panel is open; it does not by itself make the panel openable (see
  decision 6). the guided tour step for `.findMatchesTab` should be updated to
  mention it.

### decision 2: switch ciphers moves to a "files & database" section (net: B)

- recommendation (daskala): keep under history, renamed "use ciphers from
  imported file".
- net's choice: move it into the collapsed section, renamed "files & database".
- consequence: the control only affects importing a history csv
  (`export-csv.js`, `optLoadUserHistCiphers`), not the phrase database. the
  section name "files & database" covers that honestly. the quick guide entry
  moves with it.

### decision 3: shorter labels (net: short)

- "number calculation" becomes "numbers", "gematria calculation" becomes
  "gematria", "word limit:" becomes "limit". group headings: match, input,
  calculate.
- consequence: quick guide (`calc/quick-guide.js`, matches tab section) must be
  updated to the new names in the same change.

### decision 4: files & database starts closed (net: closed)

- consequence: the default database auto-loads on startup, so its controls are
  visible to everyone today. closed-by-default hides them from most users but
  costs regular database users one extra click each time. open/closed is not
  remembered between page loads.

### decision 5: clear history placement, confirmation and sync guards

placement (net: A): near the top, after reset order, visually separated and
styled as destructive.

scope of a clear (net, confirmed): clearing history changes no settings,
ciphers or database state. for a signed-in user, the history table and saved
account history are one mirrored list, so a successful clear removes both.
keeping the saved copy while clearing the table is out of scope.

#### inherited semantic receipt

two independent read-only reviewers traced the clear path at `6469c98`
(delegations `deleg_db8de313`, `deleg_3ff84e45`) and agreed on every case. both
ran the real `auth/history-sync.js` in a vm against a fake rpc that copies the
sql semantics; neither ran on postgres or the live site.

- confirmed contract: `history_entries_sync` is a full reconcile. it deletes
  the caller's rows missing from the snapshot, so an empty snapshot deletes all
  of them (`supabase/migrations/20261101000000_history_entries_sync.sql`).
- confirmed contract: signed in, loaded and unfiltered, a clear reaches the
  saved copy about 1.2–2.4s later through the change watcher.
- demonstrated counterexample at `6469c98`, fixed in `fed72bd`: with a matches
  filter active, case 36 emptied only `sHistory` and left `userHistory`; the
  clear was cosmetic and the profile clear resurrected. `fed72bd` emptied both
  arrays and added a four-tick regression test.
- confirmed contract: during a load (`histSyncLoaded` false), an unguarded
  local clear does not reach the server and saved rows merge back when the load
  resolves. after a failed load, sync stays off for the session.
- confirmed contract: during an in-flight save, an unguarded clear is queued
  (`histSyncPending`) and still lands.
- confirmed contract: on repeated rpc failure the snapshot retries at +5s,
  +30s and +120s, then pauses. a refresh before success restores the rows. the
  next edit re-enables sync and lands the clear.
- inferred dependency: a refresh within about 2.4s depends on the
  fire-and-forget beforeunload save, which has no keepalive.
- inferred dependency: another open tab with the old list can re-upload it on
  its next edit. tracked separately by the owner.
- unresolved ambiguity: whether postgrest accepts `{phrases: []}` cleanly has
  not been checked against live supabase.
- unresolved ambiguity: a whole-history clear does not reset
  `histDisplayOrder`, and the hidden-ciphers reader (`highlighter.js` around
  line 718) skips its staleness check. out of scope here; noted.

#### revision 5 baseline and contract

the home-key repair deliberately supersedes the old case-36 clear mechanism:

- home and fn+left-arrow are text navigation and never clear history.
- `clearHistoryTable()` is the one local whole-history mutator. it empties both
  `sHistory` and `userHistory` and clears the rendered history area.
- the matches button and history-header x use `histClearAllBtnClick`.
- the right-click clear uses its existing context-menu confirmation lifecycle
  and then the same local mutator.
- the signed-in account clear retains its explicit saved-history operation and
  its existing load/save guards.
- no visible whole-history clear surface may fall through to an immediate
  destructive action when `profileConfirmClick` is unavailable; a native
  confirmation is the fallback.

confirmation is a shared destructive-action contract, not a matches-only
exception. every visible whole-history clear surface requires two deliberate
activations or an equivalent native confirmation before mutation. the matches
button uses the arm label "Clear?", matching the repaired shared handler.

**guard while loading or saving (net: 2A, reconciled consistently).** when a
signed-in user's history has not finished loading, or a save is in flight,
every explicit whole-history clear surface shows the existing wait notice and
does not mutate local or saved history. signed-out users are never blocked.
implement this as a shared precondition at the explicit action layer; keep the
local mutator free of notification, confirmation and authentication policy.

do not disturb: the `histSyncSnapshot` union, the save/pending chain and
per-hash retry ladder, the sql reconcile, the account clear's explicit remote
operation, and `profileConfirmClick`'s single-armed-state behavior. do not
restore `phraseBoxKeypress(36)` or any keyboard shortcut to whole-history clear.

### decision 6: opening contract (net: C)

today the panel opens only through css `:hover` (`.dropdown:hover
.dropdown-content`, `calc/styles.css`), and the tab button's click runs
matching. there is no keyboard opening lifecycle.

evidence:

- observed, real device (net, iphone, chrome; webkit engine as all ios browsers
  are): first tap on matches opens the panel; a second tap runs matching;
  tapping outside closes the panel.
- observed, headless chromium (daskala): with an emulated 390px touch device the
  panel did not open on tap; with the keyboard, tab focus on the matches button
  plus enter ran matching but never opened the panel. the emulation disagrees
  with the real iphone; the real device is treated as authoritative for ios.
- unobserved: android (blink) touch behavior.

choice (net): C, keep today's mouse and touch behavior and add keyboard support.
alternative a makes the tab toggle the panel and moves matching exclusively to
the in-panel button. alternative b keeps tab-to-match and adds a separate
disclosure control. c remains the lowest behavior change and relies on webkit's
sticky-hover tap for ios; android remains a proof gap until checked.

contract (one row per input):

| input | result |
|---|---|
| mouse hover over tab or panel | panel open (unchanged) |
| mouse leaves tab and panel | panel closes (unchanged) and clears any dismissed override |
| mouse click on tab | runs matching (unchanged); panel stays as hover dictates |
| ios first tap on tab | panel opens (observed, unchanged) |
| ios second tap on tab | runs matching (observed, unchanged) |
| ios tap outside | panel closes (observed, unchanged) |
| android tap | must match the ios rows; observe before close, and return to the owner if it does not |
| tab key reaches the matches button | panel opens through `:focus-within` unless the current focus visit was dismissed |
| tab / shift+tab inside the panel | moves through controls in visual order; panel stays open |
| enter or space on the matches button | runs matching; it does not claim to toggle the panel |
| enter or space on an in-panel control | that control's existing action |
| escape anywhere in the panel | sets an explicit dismissed state, closes the panel and returns focus to the matches button |
| focus remains on the matches button after escape | panel stays closed because dismissed state outranks `:focus-within` and `:hover` |
| focus and pointer both leave the tab/panel | panel stays closed and the dismissed state resets for the next visit |
| collapsed "files & database" summary | enter/space toggles it through native `<details>` behavior |

the explicit dismissed state is necessary: without it, returning focus to the
matches button would immediately satisfy `:focus-within` and reopen the panel.
it must override both focus and hover until the current visit ends. the guided
tour's `tourForceDropdown` rule remains the highest display override so a tour
step can still expose the panel.

the matches button is not an aria menu button or disclosure button: it runs
matching and does not toggle a `role="menu"` or another popup. do not add
`aria-haspopup="true"` or a misleading `aria-expanded` state. retain native
button semantics, visible focus, logical dom order and escape behavior. if a
future owner chooses a real disclosure control, that is a separate contract.

## scope

in:

- order, grouping, labels and compactness of the matches dropdown;
- an explicit find matches button;
- a collapsed "files & database" section;
- quick guide and guided tour text that names these controls;
- desktop and mobile (at or below 911px) layout of the panel;
- keyboard opening, traversal, dismissal and re-entry behavior;
- applying the already chosen 2A precondition consistently to every explicit
  whole-history clear surface.

out:

- matching algorithms and database search;
- removing any control; every control keeps working;
- the other two forks (`ciphersnews`, `cyphers-news.github.io`); owner to decide
  separately;
- new persisted fields or formats. these controls' options are persisted today
  through `calcOptionsArr` (`calc/calc.js`) and restored through a menu rebuild
  by `applyCalcSettingsString` (`calc/localstorage.js`);
- the multi-tab history resurrection problem;
- `histDisplayOrder` cleanup;
- replacing choice c with a dedicated disclosure control.

## governing contracts and decisions

- `specs/legacy-ui-state-repair-sequence.md`, slice 3 entry conditions and
  forbidden shortcuts;
- the reviewed and locally committed result of the home-key/history-clear
  repair. revision 5 must be re-grounded to that commit before acceptance.

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes | this spec | rendered desktop + 520px screenshots; focused interaction tests |
| persisted state or schema | no new field or format; existing persisted options must redraw correctly | `calcOptionsArr`, `applyCalcSettingsString` | restore and import a settings blob with non-default values for every moved control, then assert each rebuilt control |
| external or provider-visible behavior | the clear payload is unchanged; 2A withholds destructive mutation while loading or saving at every explicit clear surface | `clearHistoryTable`, history sync, `history_entries_sync` | focused tests for every clear surface and the inherited sync receipt; manual empty-array check |
| identifiers, secrets or privacy | no: existing control ids remain stable | ids read by `export-csv.js` and the `conf_*` handlers | test each id exists once and its handler changes the same state |
| lifecycle or terminal states | yes: keyboard open/dismiss/re-entry and shared clear preconditions | decisions 5 and 6 | browser interaction matrix; real iphone and android observation |
| setup, operation or recovery | no | n/a | n/a |
| normative contract or decision | yes: this exact accepted revision would thaw slice 3 | owner | owner acceptance after re-grounding |
| cross-repository dependency | no | n/a | forks remain out of scope |

risk route: red because the slice touches destructive persisted account history;
amber independently for focus, keyboard and responsive state. after owner
acceptance and before product edits, run one fresh independent semantic
preflight against the committed home-key repair and this exact spec. after
implementation, run a fresh diff adversary before commit. earlier receipts are
historical evidence, not waivers for the moved clear seam.

## review visuals

- none.

## implementation by invariant

1. every existing control remains present exactly once, with the same id and
   state-changing handler. prove it over the rendered panel.
2. clicking the matches tab and the new find matches button both run
   `updateHistoryTableAutoHlt` and produce the same history order.
3. panel order is: find matches; reset order; destructive clear history; match
   group; input group (enter as words + limit); calculate group (numbers and
   gematria); collapsed files & database (switch ciphers, page size, scroll
   size, clear query and unload).
4. number and gematria pickers are edited in place through `create_NumCalc` and
   `create_GemCalc`, not duplicated.
5. database buttons still un-hide when a database loads and after `conf_SEC`
   redraws the menu, including while the section is collapsed.
6. quick guide and tour text use the new labels and no longer describe home as
   a history-clear shortcut.
7. every whole-history clear surface confirms, applies 2A consistently, then
   reaches the explicit local mutator; no keyboard navigation event can reach
   it. tests cover matches, header x, context menu, account clear, native
   fallback, loading, saving, signed-out behavior and filtered canonical state.
8. the decision 6 matrix holds. escape's dismissed override defeats hover and
   focus for the current visit, then resets only after pointer and focus leave.
9. no false menu/disclosure aria semantics are introduced.
10. restoring or importing settings redraws every moved control with its saved
    value.

## done when

- the home-key/history-clear repair has independent review, a local commit, and
  this spec's provisional baseline is replaced with that commit;
- the owner accepts the exact re-grounded spec and separately authorizes
  implementation, thawing slice 3;
- net receives one rendered recognition pass and agrees the grouping, labels
  and emphasis answer her owner view; technical proof does not bounce back to
  her as a product decision;
- the panel fits a 1366x768 viewport without internal scroll when files &
  database is closed and remains usable at 520px wide;
- rendered proof opens and dismisses the panel by real interaction, never by
  forcing it visible;
- every row of decision 6 is exercised; ios and android rows are observed on a
  real device;
- settings restore and import redraw all moved controls;
- the throwaway-account check proves an empty clear survives a five-second wait
  and refresh;
- `bash scripts/test-local.sh safety` and `bash scripts/test-local.sh full`
  pass, including the focused tests;
- the fresh diff adversary is reconciled;
- quick guide, tour, cache keys and this spec agree with the realized diff.

## risks and unknowns

- postgrest empty-array encoding is unverified against live supabase; close
  requires the throwaway-account check above.
- android touch behavior is unobserved.
- headless touch emulation contradicted the real iphone; emulation is not
  accepted as real-device proof.
- another open tab can re-upload old history after a clear; tracked separately.
- the current home-key repair remains uncommitted and may change during
  independent review, which would require another narrow rebase of decision 5.

## open questions

- should the other two forks receive the same change later?
- should review screenshots be tracked beside this spec?
