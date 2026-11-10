# spec: numogram readings and operator relations

status: accepted
implementation state: verified local candidate; owner visual review pending

> **continuity role:** proposed transition
> **owner:** cyphers technical owner
> **created:** 2026-11-10
> **depends on:** retired `specs/numogram-independent-visual-redesign.md`
> **supersedes:** only the retired spec's preserved three-plus adjacent-link behavior and pointer-only operator-reading boundary

the designated owner accepted this exact transition and authorized its bounded
local implementation on 2026-11-10. this acceptance does not authorize commit,
push, deployment, publication, or sibling-repository changes.

## context

the independent numogram redesign established the plate as an intentional
cyphers object: black aperture zones, toxic-green filament currents, hot-pink
gates, bone addresses, registration marks, a compact terminal reading rail,
and advanced controls folded into the apparatus. the current plate is
mathematically strong and visually native to the site, but its reading rail
still exposes only a thin slice of the canonical material and treats gates and
currents as indirect ways to select a zone.

the desired transition is not an encyclopedia redesign. clicking the figure
should feel like activating an occult instrument and receiving its terse
output. the existing square terminal boxes, acid hairlines, small uppercase
labels, dense monospace values, and white/green/pink semantic palette are the
normative visual grammar. an earlier spacious dossier mockup established useful
information hierarchy and state examples, but its large display objects,
serif-led editorial treatment, cards, generous whitespace, and flowchart
composition are explicitly rejected for this legacy site.

the source grounding is the archived ccru pandemonium material, the ccru zone
pages reproduced in the sourcebook section of anders j. aamodt's *unleashing
the numogram*, and the existing arithmetic and lemur tables in
`calc/numogram.js`. the application must distinguish sourced lore, derived
numogrammatic relations, and its own interface behavior.

the accepted implementation began from clean `master` at `93d6d98`, with the
focused `tests/numogram.test.js` script passing in full. the local candidate is
now implemented and verified as recorded below; it is not committed, pushed,
deployed, published, or reconciled into a sibling repository.

## owner view

- **one breath:** deepen the existing terminal reading rail so a zone reveals its canonical dossier, a gate or current reveals its actual operation, and a three-plus selection reports only relations mathematically resolved by the held zones.
- **before:** a zone produces a compact structural reading; gates, channels, and currents select a zone; exactly two zones produce a lemur reading; three or more zones preserve selection order but append arbitrary visual links and still describe only the most recent zone.
- **after:** one zone produces a canonical terminal dossier; a gate or current produces its own persistent relation reading and focused plate state; exactly two zones retain the lemur reading; three or more zones produce a held-zone inventory plus resolved currents and gates, without invented adjacent routes.
- **authority:** this markdown file owns only the proposed transition. current source and tests own observed behavior until a separately authorized implementation is verified.

## established owner direction

### visual register

- retain the existing `selection` / `reading` frame and the current
  `numBox`, `numBoxLabel`, `numAnnotRow`, and related terminal primitives.
- use white or bone for identity, green for syzygies and currents, pink for
  gates and channels, and muted bone for compact source-grounded notes.
- keep square borders, tight rows, monospace density, small uppercase labels,
  and hairline rules.
- do not introduce large zone orbs, editorial cards, serif display headings,
  large whitespace, dashboard tiles, or an infographic flowchart.
- widen the standing rail and therefore the complete black field; do not
  squeeze or rescale the plate to manufacture the added width.

### reading register

- the plate performs the relationship; the rail reports what happened.
- explanations remain compact and operational. arithmetic is expanded enough
  to teach the operation without turning the rail into a chapter.
- one short sourced system note may leak through at the bottom of a zone
  dossier. it is not a freeform occult interpretation.

### relation semantics

- netspans always display with the highest zone first, for example `7::2` and
  `6::0`. internal low-first storage may remain unchanged for lookup.
- a gate reading means source zone -> digital cumulation -> repeated reduction
  -> destination zone.
- a current reading means high::low syzygy -> arithmetic difference -> tractor
  zone.
- three-plus selection is an inventory, not a synthetic doctrine.

## relationship to the retired visual-redesign contract

the retired spec remains historical authority for the implemented plate,
mathematics, geometry, shell, layer anatomy, storage boundaries, and lifecycle.
this proposal changes only two previously preserved interaction boundaries:

1. `numPicked` remains ordered and `numSelected` remains the most recent zone,
   but three-plus picks no longer draw arbitrary adjacent links. selection
   order remains available for display and removal behavior; relation discovery
   is independent of order.
2. gates, channels, and currents become first-class readings rather than
   pointer-only aliases for selecting a zone. because they acquire distinct
   user-visible meaning, they also acquire keyboard activation and explicit
   accessible names.

no other retired-spec invariant is silently reopened.

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes | this spec's reading-state, content, highlighting, and visual contracts | focused state tests plus rendered pointer, keyboard, narrow, zoom, and owner review |
| persisted state or schema | no | existing trace-history and browser-storage boundaries | diff inventory and regression tests showing no new key, payload, or migration |
| external or provider-visible behavior | no | current static-client boundary | no network, auth, rpc, moderation, database, or provider changes |
| identifiers, secrets or privacy | no | current repository and escaping boundary | static canonical data only; user-derived trace strings retain existing escaping |
| lifecycle or terminal states | yes | this spec's relation-selection transitions plus existing reset and close contracts | activation, toggle-off, escape, trace, reset, close/reopen, filter, and layer tests |
| setup, operation or recovery | yes | content-addressed numogram asset references and existing local test runner | exact source hashes, local suite, and one-commit rollback shape |
| normative contract or decision | yes | this exact draft after explicit owner acceptance | accepted revision plus focused independent candidate review |
| cross-repository dependency | no | this slice is confined to `gematro-hyperdope` | changed-file inventory; sibling reconciliation remains separate work |

## canonical content model

### data already owned by the application

the implementation must continue deriving these facts from their existing
owners rather than copying them into new lore records:

- zone number and geometry from `CANONICAL_GEOMETRY` / `NUM_ZONES`;
- syzygy, demon, current name, and region key from `NUM_SYZYGIES`;
- current destination from the absolute syzygetic difference;
- gate value from digital cumulation and channel destination from repeated
  digital reduction;
- planet and sol number from `NUM_PLANETWORK`;
- phase lemur identity, mesh number, names, titles, classes, and routes from
  `NUM_LEMURS`.

### new canonical zone lore

add one frozen record per zone containing only facts not already owned above:

- quasiphonic particle;
- compact particle gloss where source wording supports one;
- one or two sentence system-note summary, paraphrased from the ccru zone page;
- source/status metadata sufficient to keep canonical source claims distinct
  from application-derived relations.

the lore record must not duplicate planet, syzygy, region, gate, channel,
phase population, lemur membership, door, or phase-limit facts.

### phase derivation

- phase `n` contains the lemurs whose high netspan digit is `n`.
- for phases 1 through 9, the door is `n::0`.
- the phase-limit is `n::(n-1)`.
- in phase 1, lurgo `1::0` is both door and phase-limit and must display both
  roles rather than one overwriting the other.
- phase population is `2^n` impulse-entities.
- zone 0 has no phase lemurs, door, phase-limit, or impulse population; the ui
  states that absence rather than silently omitting the section.

### netspan presentation

introduce one display formatter that always renders `max(a,b)::min(a,b)`.
use it for the new phase list and every existing user-visible lemur/netspan
surface touched by this slice. do not reorder the stored lookup keys or mutate
`NUM_LEMURS` solely for presentation.

## reading states

| active state | rail output | plate output |
|---|---|---|
| idle | existing compact invitation | ordinary plate |
| one zone | canonical zone dossier | selected zone plus its sourced syzygy/current/gate relations using existing focus grammar |
| exactly two zones | existing lemur reading, with high-first netspan formatting; do not append a complete zone dossier | the two held zones and their single netspan link |
| three or more zones | held-zone inventory plus resolved currents and gates | held zones plus only the natural relations resolved by the held set; no ordered synthetic link chain |
| gate or channel | gate relation reading | source zone, gate aperture, pink course, and destination only |
| current path or its syzygy bond | current relation reading | both syzygetic poles, green bond/current, and tractor zone only |
| number, word, or planet trace | existing trace context followed by the richer zone dossier | existing trace behavior |

## zone dossier

the dossier reuses the existing terminal blocks in this order:

1. **zone** - numeral, planet, sol number, and region label.
2. **syzygy** - high-first netspan, twin zone, carrying demon, named current,
   and tractor destination.
3. **gate** - gate value, expanded cumulation, repeated reduction, and channel.
4. **phase** - phase number, impulse population, and the complete phase lemur
   list in descending netspan notation. door and phase-limit receive compact
   textual role marks; intermediate entries remain dense and quiet.
5. **quasiphonic** - particle and compact gloss.
6. **system notes** - one or two source-grounded sentences.

the rail must remain usable if this content exceeds its height. on desktop the
reading rail scrolls independently while the plate remains whole. in the
stacked mobile layout, the page owns scrolling and the rail does not become a
nested scroll trap.

## operator relation readings

### gate

activating either a gate aperture or its channel course produces the same gate
relation state. the rail uses existing terminal boxes and pink emphasis:

- gate identity, for example `gt-36`;
- source zone and source planet;
- expanded cumulation, for example `1+2+3+4+5+6+7+8 = 36`;
- every reduction pass needed to reach one digit;
- final channel, for example `8 -> 9`;
- destination zone and destination planet.

the plate highlights no unrelated current, gate, or zone.

### current

activating either the visible current path or its source syzygy bond produces
the same current relation state. the rail uses existing terminal boxes and
green emphasis:

- current name;
- high-first source syzygy and carrying demon;
- source planets;
- arithmetic difference;
- tractor zone and tractor planet.

the plate highlights no unrelated gate, current, or zone.

### relation-state transitions

- relation state is represented separately from `numPicked`, `numSelected`,
  `numBody`, and `numDeriv`.
- activating a relation clears the active zone-pick/body/derivation reading and
  makes the relation the sole reading subject.
- activating the same relation again clears it to idle.
- activating a zone clears relation state before applying normal zone-toggle
  behavior.
- running or replaying a trace, selecting a body, reset reading, escape, and
  closing the menu clear relation state.
- a region, layer, or zone-filter change that makes the selected relation
  unavailable clears it instead of leaving a reading for invisible geometry.
- relation state is ephemeral: it is not written to url parameters,
  `numogramTraces`, local storage, account state, or any database.

## three-plus held selection

the held-zone inventory preserves `numPicked` insertion order for display and
existing toggle/removal semantics. relation resolution ignores order:

- a current appears when both poles of its syzygy are held. its tractor zone
  is reported even when the tractor is outside the held selection.
- a gate appears when its source and destination zones are held. a self-return
  qualifies when its source zone is held; the undrawn degenerate `gt-0` remains
  omitted.
- unrelated currents, gates, and zone dossiers do not appear.
- the plate highlights held zones and the same resolved relations reported in
  the rail.
- the arbitrary adjacent link chain currently drawn between three-plus picks
  is removed. exactly two picks retain one meaningful netspan link.

the canonical example is zones 4, 5, and 6:

- held zones: 4, 5, 6;
- resolved current: sink, `5::4 -> zone 1`, with the tractor explicitly marked
  outside the selection;
- resolved gate: `gt-15`, `zone 5 -> zone 6`.

## visual and responsive contract

- reuse existing terminal primitives; do not build a parallel card system.
- preserve the current `selection` / `reading` frame.
- zone/identity blocks use bone; syzygy/current blocks use green; gate/channel
  blocks use pink; notes use readable muted bone.
- labels remain small and uppercase; values remain dense monospace; prose
  remains compact and subordinate.
- widen the standing rail from its current `18em` basis / `22em` cap to a
  responsive target roughly in the `26em` to `30em` range on roomy desktop
  layouts. the rail may yield before the plate becomes illegible.
- the existing `numogramFit()` width calculation continues to derive the full
  field width from plate + actual rail + gap + padding, clamped to available
  calculator width.
- at the existing narrow breakpoint, preserve plate-first stacking and a
  full-width reading rail.
- at approximately 1366 by 768, the plate must not become smaller than the
  current verified rendering solely to fund the wider rail; if room is
  insufficient, the rail yields or the stacked layout begins earlier.
- no essential information is hover-only or color-only.

## accessibility contract

- zones retain their current keyboard operation and `aria-pressed` state.
- current groups, gate apertures, and channel courses become keyboard
  reachable because they now own distinct readings.
- pointer, enter, and space use the same activation function and produce the
  same state.
- relation objects expose concise accessible names that describe the relation,
  for example `gate 36, zone 8 to zone 9` and `hold current, zones 7 and 2 to
  zone 5`.
- active relation state is represented by text or shape as well as color.
- the existing polite live region announces the changed reading without
  replaying decorative plate content.
- existing generous invisible hit targets, crossing priority, visible focus,
  reduced-motion behavior, and escape semantics remain intact.

## scope

### in

- richer one-zone terminal dossiers for all ten zones;
- canonical quasiphonic and compact system-note data;
- derived phase membership, population, door, and phase-limit display;
- consistent high-first netspan presentation;
- distinct gate and current reading states;
- keyboard parity and accessible names for those newly meaningful operators;
- three-plus resolved-relation inventory and matching plate highlights;
- removal of arbitrary three-plus adjacent links;
- wider responsive reading rail using the existing fitting lifecycle;
- focused automated, browser, source, and independent-review proof;
- exact numogram js/css cache-key reconciliation after implementation.

### out

- any change to canonical zone geometry, current direction, gate arithmetic,
  channel destination, gt15 route geometry, or plate visual grammar;
- general pandemonium matrix redesign;
- rite classification, rite sorting, major/minor rite interpretation, or
  encoded `mj` / `mn` semantics;
- new cosmology modes or changes to gnosticism, pandemonium deck, divination,
  aq, numeric tracing, planet tracing, or reduction rules;
- exposing stored trace history or changing trace/url/storage schemas;
- database, supabase, authentication, profiles, saved phrases, submissions,
  history synchronization, moderation, or notifications;
- new dependencies, framework migration, generalized css cleanup, or legacy
  calculator refactor;
- changes to the successor svelte site;
- sibling-repository adaptation;
- commit, push, publication, or deployment.

## likely touched surfaces

| surface | intended change | containment rule |
|---|---|---|
| `calc/numogram.js` | frozen zone lore, derived phase helpers, high-first formatter, relation state, dossier/relation/aggregate renderers, activation and highlight branches | preserve arithmetic owners, trace/storage/url contracts, existing modes, reset categories, and integration entry point |
| `calc/numogram.css` | widened rail and styles for denser phase, operator, and aggregate readings plus active relation focus | extend current terminal grammar; no parallel mockup/card stylesheet and no plate geometry mutation |
| `tests/numogram.test.js` | canonical data, derivation, interaction, accessibility, aggregate, lifecycle, and source-hash assertions | preserve existing arithmetic/geometry/storage tests; replace only the superseded three-plus link assertion |
| `index.html` | update only content-derived numogram js/css query keys | no unrelated html or script-order changes |
| `specs/numogram-reading-relations.md` | exact accepted revision and later verification evidence | product decisions change only through explicit owner revision; evidence cannot rewrite the accepted contract |

inspect-only unless a concrete conflict is found and the spec is revised:
`calc/calc.js`, `calc/index.html`, `docs/LOCAL-TESTS.md`, auth/profile/history
scripts, sql, workflows, dependencies, and sibling repositories.

## implementation by invariant

1. **freeze the source boundary.** transcribe only missing zone lore; add
   completeness and source-status checks; derive every already-owned fact.
2. **make notation truthful.** add one high-first netspan formatter and apply it
   to the phase list and touched existing reading surfaces without changing
   lookup storage.
3. **introduce relation state without contaminating zone state.** define the
   separate ephemeral representation and prove every entry and exit path before
   changing visible rendering.
4. **render through the existing terminal grammar.** build zone, gate, current,
   and aggregate readings from current primitives; do not import the discarded
   dossier mockup's component language.
5. **make the plate and rail agree.** highlight exactly the relations reported
   by the active reading; remove three-plus synthetic links while preserving
   the exact-two netspan and pick-order semantics.
6. **add honest operator accessibility.** make newly meaningful gate/current
   objects focusable and route pointer and keyboard through one activation
   path.
7. **widen without starving the plate.** adjust the rail responsively and let
   the existing measured-fit function widen the full field; preserve stacked
   mobile behavior and nonnested scrolling.
8. **attack the candidate.** after focused and full proof, assign one fresh
   read-only reviewer to inspect the exact diff, source correspondence, state
   transitions, persistence absence, and test independence. the reviewer does
   not edit.
9. **reconcile delivery references.** after accepted repairs and rerun proof,
   update exact content keys and present the local diff. commit, push, and
   deployment remain separate owner transitions.

## focused independent review

one bounded read-only reviewer is required after a candidate exists and before
any commit decision. this is not another full-surface adversarial audit. the
reviewer receives this accepted spec, the exact diff, the canonical source
locators, and the relevant tests, and must challenge:

- whether static lore is sourced and derived facts remain derived;
- whether every displayed netspan is high-first without lookup corruption;
- door, phase-limit, phase-1 dual-role, and zone-0 absence behavior;
- gate/current relation arithmetic and exact highlight membership;
- three-plus relation resolution and removal of synthetic ordered routes;
- separation and complete clearing of relation, pick, body, and derivation
  state;
- pointer/keyboard parity, accessible names, focus, escape, and live-region
  behavior;
- responsive rail/plate fitting and scroll ownership;
- absence of new persistence, url, network, auth, database, and sibling scope;
- whether new tests prove behavior rather than restating implementation data.

findings are classified as stop-ship, required repair, verification-only, or
harmless. the primary writer owns any repair and reruns affected proof.

## acceptance criteria

- all ten zones render a complete terminal dossier without duplicated
  arithmetic or relation truth.
- zone 6 reports saturn / sol-6 / warp, particle `tch`, syzygy `6::3`, gt-21
  with full cumulation and reduction, 64 impulse-entities, phase lemurs tchu
  through tchattuk, tchu as door, and tchattuk as phase-limit.
- zone 1 marks lurgo as both door and phase-limit; zone 0 states that it has no
  phase population, door, or limit.
- every netspan displayed by a touched surface is high-first.
- activating gt-36 reports and highlights only `zone 8 -> 36 -> zone 9`.
- activating hold reports and highlights only `7::2 -> zone 5`.
- gate apertures and channel courses converge on the same gate reading;
  current paths and their syzygy bonds converge on the same current reading.
- repeated relation activation toggles to idle; zone, trace, body, reset,
  escape, close, and relevant visibility changes clear relation state exactly
  as specified.
- pointer, enter, and space produce identical operator readings with visible
  focus and accurate accessible names.
- exactly two zones retain one lemur/netspan reading and one meaningful link.
- selecting zones 4, 5, and 6 reports only those zones, sink `5::4 -> 1`, and
  gt-15 `5 -> 6`; it draws no arbitrary 4-to-5-to-6 link chain.
- aggregate rail output and plate highlights name the same relation set.
- the widened desktop rail retains the present terminal appearance, remains
  readable on a short laptop window, and does not reduce the plate below its
  current useful size solely to fit prose.
- the existing mobile plate-first stack has no document-wide horizontal
  overflow or nested reading scroll.
- existing traces, url restoration, local trace storage, modes, layers,
  filters, reset, close/reopen, reduced motion, crossing priority, and plate
  mathematics retain their prior behavior except where explicitly superseded.
- no user-derived string reaches a new unescaped html context.
- the focused numogram suite, safety suite, and full local suite pass without
  exclusion or assertion weakening.
- js/css cache keys match the accepted source hashes.
- the focused read-only reviewer has no unresolved stop-ship or required
  repair finding.
- the owner confirms the rendered reading still feels native to cyphers rather
  than like the discarded editorial dossier.

## validation

```sh
node tests/numogram.test.js
bash scripts/test-local.sh safety
bash scripts/test-local.sh full
git diff --check
git status --short --branch
```

also inspect the actual served calculator in a chromium-based browser at
approximately 1500 by 1000, 1366 by 768, 1024 by 768, and 390 by 844; repeat
the consequential states at 200 percent zoom and with reduced motion enabled.
exercise mouse and keyboard activation for one zone, gt-36, hold, an exact-two
lemur, the 4/5/6 aggregate, trace replacement, filter/layer invalidation,
escape, reset, and repeated close/reopen. inspect the console and verify that
the plate and rail agree in every state.

## implementation evidence

the bounded local candidate was implemented on 2026-11-10 in the five planned
surfaces: `calc/numogram.js`, `calc/numogram.css`,
`tests/numogram.test.js`, `index.html`, and this specification. no dependency,
database, auth, sync, storage-schema, successor-site, or sibling-repository
surface changed.

the implemented content keys are:

- `calc/numogram.js?v=6fc4a221f9e964f8`
- `calc/numogram.css?v=f377e8fc4de74bba`

proof run against the post-review candidate:

- `node tests/numogram.test.js` — passed;
- `bash scripts/test-local.sh safety` — 51 passed, 0 failed;
- `bash scripts/test-local.sh full` — 78 passed, 0 failed;
- `git diff --check` — passed;
- local chromium — zone 6, gt-36, hold, exact-two, 4/5/6, filtered
  external tractor, hidden gate layer, warp-only region, enter, space, escape,
  relation toggle-off, filter/layer invalidation, 1366x768, 1024x768,
  narrow stacked rendering, reduced motion, and a 200-percent effective
  viewport all agreed between plate and rail with no console error.

one independent read-only reviewer classified two required repairs: static
system notes had repeated derived machinery and misattributed zone 7's
swamp-labyrinth property; aggregate resolution could report a relation hidden
by a filter, layer, or region. the writer repaired both, added regression
proof, and reran all checks above. the reviewer then reported no unresolved
stop-ship or required-repair finding.

the deterministic change classifier reports a red floor because this legacy
renderer builds dynamic html. contextual source-to-sink review found no new
untrusted input: the added lore is frozen static data, relation values are
derived from closed model tables, and user-entered trace text retains its
existing escaping boundary. this is a review constraint, not a claim that the
classifier proved a vulnerability.

owner inspection of the rendered candidate remains the final unverified visual
acceptance criterion. commit, push, deployment, publication, and sibling
reconciliation remain separate owner transitions.

## risk register

| trigger | plausible bonk | containment and proof |
|---|---|---|
| copied relation facts | lore and arithmetic drift into contradictory parallel truths | store only missing particle/note data; derive every relation and phase role; completeness tests |
| storage order leaks into ui | netspans render low-first or lookups are broken by presentation repair | one display formatter; storage remains unchanged; exhaustive high-first assertions |
| relation reuses `numSelected` | operator clicks pollute zone picks, history, urls, or exact-two lemur state | separate ephemeral relation state and transition tests |
| stale relation survives a new reading | rail describes geometry the plate no longer highlights | enumerate and test every clearing transition and hidden-layer/filter case |
| operator group is only pointer-active | a new first-class reading remains inaccessible from keyboard | focusable relation objects, shared activation path, real keyboard proof |
| three-plus chain remains | ui asserts a route created only by click order | suppress link layer above two picks and test canonical relation resolution instead |
| self-return gate rule floods aggregate | selected zones produce surprising self-gates | explicit contained-endpoint rule, omit gt-0, example and boundary tests |
| lore paraphrase becomes doctrine | editorial prose is presented as canonical quotation | short source-grounded summaries, status metadata, source review, no invented interpretation |
| widened rail starves plate | laptop view becomes a textual drawer beside a thumbnail | responsive yielding rail, current-size floor, rendered short-window proof |
| long phase list creates nested scroll trap | mobile reading becomes difficult to traverse | desktop rail scroll only; mobile page scroll; narrow and zoom proof |
| innerhtml expansion creates a sink | trace or user text is interpolated unsafely | static lore, existing escaping for user-derived text, contextual diff review |
| cache key omitted | deployed clients mix old state logic with new css or vice versa | exact content-key assertions and later served-asset verification |
| sibling copy treated as reconciliation | divergent repositories receive an unreviewed partial port | sibling work remains outside this spec and requires independent baselines |

## rollback shape

the implementation is a static-client change with no migration or persisted
state transition. before commit it is reverted by discarding only the bounded
candidate diff. after a separately authorized commit, one commit reverts the
feature and its matching cache references. rollback does not touch database,
auth, user history, stored traces, or sibling repositories.

## open questions

none presently block the local candidate. exact line wrapping, responsive rail
values, and compact spacing remain rendered implementation judgments inside
the visual and plate-size contracts above. owner visual acceptance remains
open. this specification does not authorize commit, push, deployment,
publication, or sibling reconciliation.
