# spec: matches menu cleanup

status: accepted

> **continuity role:** proposed transition
> **owner:** cyphers technical owner (colette); net is the designated approver
> **requested by:** net
> **drafted by:** daskala, with net (revisions 1–4, 8); codex, with colette
> (revisions 5–7)
> **created:** 2026-11-13
> **revision 8 created:** 2026-11-15
> **grounded against:** `182d0881c37c9228f58a3d972945f438b596abb9`
> **accepted:** 2026-11-15 by colette (owner), in conversation: "approved: keep
> current opening and clear behavior unchanged; track keyboard access and 2a
> separately". colette then stated net only needs to give "approved to build";
> that is recorded as the owner accepting revision 8 on net's behalf.
> revision 8 draft sha256 `08461212da1a98de5b79c47e8f0cf4593c52fa8e369dba9ceccd581436147ac4`.
> **supersedes:** revisions 1–7 of this file (rev 5 was accepted at `ad2605d`
> and is superseded by this narrower revision once accepted). this is the
> candidate that slice 3 of `specs/legacy-ui-state-repair-sequence.md`
> ("match/options simplification, sealed") waits on.

**revision 8 (2026-11-15): scope reset.** revisions 5–7 grew this slice by
absorbing pre-existing site defects found while reviewing it (keyboard opening,
checkbox reachability, focus outlines, a lifecycle-wide 2A guard, redraw
defects). each review found more because each revision covered more. revision
8 returns to net's original request: a reorganised menu. behaviour that exists
at `182d088` is kept as it is; the absorbed work is listed under follow-ups and
filed separately. the review evidence from revisions 2–7 is kept in git history
and in the follow-up notes, not here.

only the designated approver may change `status`. implementation requires a
separate explicit "approved to build". per the governing sequence spec,
acceptance of this exact revision thaws slice 3.

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
- authority: this markdown spec after acceptance.

(owner view written by net, lightly formatted.)

note on "buried": in source, enter as words already sits above both
calculation tables. net's sense that it is buried is perceived discoverability
in a long undifferentiated panel. the transition is clearer grouping and
emphasis.

## decisions (net)

1. **find matches button (A):** add a "find matches" button at the top of the
   panel. clicking the matches tab keeps running matching as a shortcut. the
   "click to find matches ↑" hint is removed.
2. **switch ciphers (B):** moves into the collapsed "files & database"
   section. label unchanged unless net asks otherwise.
3. **labels (short):** "number calculation" → "numbers", "gematria
   calculation" → "gematria", "word limit:" → "limit". group headings: match,
   input, calculate.
4. **files & database starts closed:** a native `<details>`, closed each time
   the menu is drawn; not remembered.
5. **clear history placement (A, narrowed):** near the top, after reset order,
   visually separated and styled as destructive. it keeps its **existing**
   handler and confirmation exactly as at `182d088` (`histClearAllBtnClick`,
   arm label "Clear?", native confirm fallback). **change from net's earlier
   choice:** the 2A "wait while loading/saving" guard is not part of this slice;
   it moves to a follow-up because doing it properly spans every clear surface
   and the account sync lifecycle. net must re-approve this narrowing.
6. **opening behaviour: unchanged.** the menu opens exactly as it does today
   (hover on desktop; on touch devices, whatever the browser does today). no
   keyboard-opening mechanism is added in this slice. observed today, recorded
   for the follow-up only: iphone (net) first tap opens; android 17 chrome 157
   and firefox 160 (colette) first tap opens and runs matching.

## scope

in:

- order, grouping, headings and labels of the matches dropdown;
- the find matches button;
- the collapsed "files & database" section (switch ciphers, phrases on db page,
  scroll db by lines, clear db query, unload database);
- clear history's position and destructive styling;
- quick guide and guided-tour text that names these controls;
- layout at desktop and at the existing ≤911px breakpoint.

out (unchanged from `182d088`, or filed separately):

- how the panel opens or closes, on any device or input;
- any change to what a clear or reset does, its confirmation, or its guards;
- matching algorithms, database search, persisted option names or formats;
- the other two forks;
- everything under "follow-ups".

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes: layout, labels, one new button | this spec | renders at 1366x768 and 520px; net's recognition pass |
| persisted state or schema | no | `calcOptionsArr`, `applyCalcSettingsString` | restore test: moved controls show restored values |
| external or provider-visible behavior | no | clear/sync code untouched | diff touches no clear, reset or sync function |
| identifiers, secrets or privacy | no: every control id kept | `export-csv.js`, `conf_*` handlers, db-button un-hide code | test: each id exists once and its handler changes the same state |
| lifecycle or terminal states | no | panel opening and clear paths untouched | diff review |
| setup, operation or recovery | no | n/a | n/a |
| normative contract or decision | yes: thaws slice 3 | approver | acceptance of this revision |
| cross-repository dependency | no | n/a | n/a |

risk: amber (ordinary UI with persisted options being redrawn). no history,
clear, reset, auth or sync code changes, so the earlier red route no longer
applies. if the realized diff touches any of those, it is out of scope and
stops for the owner.

## implementation by invariant

1. every existing control is present exactly once with the same id and
   handler; `create_NumCalc`, `create_GemCalc` and `create_PL` are edited in
   place, not duplicated.
2. the find matches button and the matches tab call the same function and
   produce the same history order.
3. panel order: find matches; reset order; clear history (destructive); match
   (cross cipher, same cipher, show only matching, numerology); input (enter as
   words + limit); calculate (numbers, gematria); files & database (closed).
4. database-button visibility is unchanged from `182d088` on every path,
   including paths that are already wrong (filed separately); this slice must
   not make any path worse.
5. restoring saved settings redraws every moved control with its saved value.
6. quick guide and tour text use the new labels; changed assets get fresh
   cache keys as the existing tests require.

## done when

- net approves this revision, then separately says "approved to build";
- invariants 1–6 have focused tests, and `bash scripts/test-local.sh safety`
  and `bash scripts/test-local.sh full` pass;
- the closed panel fits 1366x768 without internal scroll and is usable at
  520px (rendered by real hover, not forced visible);
- net does one recognition pass on the rendered menu (iphone included);
- one adversarial review of the actual diff, limited to what the diff touches,
  is reconciled;
- colette reviews the PR.

## follow-ups (filed separately, not requirements of this slice)

- keyboard opening of the menu, checkbox keyboard access, visible focus
  outlines (note: `:has(:focus-visible)` dropped focus on Tab in headless
  chromium; `:focus-within` keeps mouse-clicked menus open);
- android/ios opening behaviour (net's A/B/C);
- 2A guard across all clear/reset surfaces with an explicit auth/history
  lifecycle (rev 7's state table is a starting point);
- reset hides db buttons; ciphers.js / GEMATRO_DB imports throw on removed
  `chkbox_SEC`; stale `styles.css` cache keys;
- filtered additions vanish (observed live); profile csv replace resurrects
  filtered history; sign-out leaves history on screen (red); android chrome
  enter key; pull-to-refresh wipes signed-out history.
