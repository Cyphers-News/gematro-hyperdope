# spec: numogram independent visual redesign

status: retired
implementation state: implementation complete and verified; owner authorized master release on 2026-11-10

> **continuity role:** proposed transition
> **owner:** cyphers technical owner
> **created:** 2026-11-09
> **supersedes:** none

the designated owner accepted this exact transition and separately authorized
its bounded local implementation on 2026-11-09. this acceptance does not
authorize commit, push, deployment, or sibling-repository changes.
the owner separately authorized commit and push on 2026-11-10.

## context

the current numogram combines canonical arithmetic with a presentation whose
composition, line treatment, zone treatment, and annotation language closely
follow an external contemporary rendering. the renderer is also embedded in a
large stateful menu: svg classes act as interaction contracts, several
cosmology panels share its css, traces persist locally, url state is restored,
and runtime fitting measures the existing three-column shell. the transition
must therefore establish an independent cyphers visual language without
mistaking a visual rewrite for permission to rewrite the mathematical or
interactive system beneath it.

the verified starting point is clean `master` at `9c380dd` on 2026-11-09. the
local full suite passes 78 of 78 tests. `docs/LOCAL-TESTS.md` still describes an
older numogram failure and is historical/stale for the present baseline.

the initial semantic adversarial review found that several visible names are
aliases rather than faithful descriptions: a current group contains both a
short syzygy bond and a current path to a tractor zone; a gate tag and its channel path are
separate objects; the visible model selector and effective cosmology can
diverge; the selected zone and the ordered pick chain are different state; and
reset is a reading reset rather than a factory reset. this draft incorporates
those findings before any product edit.

## owner view

- change: replace the derivative numogram presentation with an independently rendered black, green, and pink cyphers plate while preserving canonical mathematics and current capabilities.
- before: a dense rainbow diagram and control wall whose visible composition closely resembles the external rendering that informed it.
- after: black aperture zones, green five-filament currents with open chevrons, pink gates and value tags, bone numerals, registration marks, and a calmer reading surface with advanced apparatus still reachable.
- authority: this canonical markdown spec owns the proposed transition; current source and passing tests own observed behavior until implementation is accepted and verified.

## owner decisions

### primary visual grammar

- recommendation: use black aperture zones, green five-filament currents, open green chevrons, pink channel courses, small black gate apertures with enlarged pink numerals, bone numerals, registration brackets, and syzygetic notches as the complete primary grammar.
- alternative: retain per-zone colors, inherited outlined circular gate labels, or filled endpoint arrows from the inherited rendering.
- consequence: accepting the recommendation establishes a structurally distinct silhouette and makes currents, gates, and zones legible by form as well as color.

### current and syzygy anatomy

- recommendation: apply five filaments only to each current path from its source syzygy to its tractor zone; retain the short twin bond as a quieter single green syzygy bridge and make it the actual independently toggleable syzygies layer.
- alternative: filament both the current path and short bond, or preserve the current fictive syzygies switch that merely recedes the whole current layer.
- consequence: the recommendation distinguishes the current's motion from the pair that generates it and turns the existing syzygies label into truthful behavior; this is an intentional user-visible layer correction.

### gate anatomy and crossing priority

- recommendation: render both the channel course and its separate gate-value tag in pink while preserving their distinct dom classes; paint and activate visible currents above gates at crossings so interaction follows the foreground object.
- alternative: retain the current gate-first pointer arbitration even when a green current is visually foremost.
- consequence: the recommendation changes which object receives a click at an exact current/gate intersection, while leaving both objects reachable away from crossings.

### apparatus density

- recommendation: show the numogram plate and reading rail by default, while keeping cosmologies, filters, layers, and related visible controls in one collapsed apparatus disclosure; the stored trace container remains hidden.
- alternative: retain the current always-visible control wall.
- consequence: the default composition becomes intentional without deleting capability or changing stored state.

### contrast control

- recommendation: preserve the existing invert pathway during this slice, retheme it as a contrast control, and place it inside the apparatus.
- alternative: delete the invert pathway as part of the redesign.
- consequence: preserving it avoids an unnecessary behavior deletion and leaves later removal as a separately reviewable decision.

### stored trace visibility

- recommendation: preserve trace storage and replay semantics without exposing the currently hidden recent-trace container in the apparatus.
- alternative: add a visible history of the eight locally stored trace entries.
- consequence: the recommendation avoids turning a visual redesign into a new local-history and privacy surface.

### diagram keyboard scope

- recommendation: preserve current keyboard semantics in this slice: zones and cosmology bands remain focusable, while gates, channels, and currents retain their existing pointer operation; all ordinary controls and the apparatus disclosure remain keyboard reachable.
- alternative: add full keyboard activation for every diagram object now.
- consequence: the recommendation avoids silently claiming accessibility behavior the current component does not have; full diagram parity remains a separately specifiable improvement.

### repository sequence

- recommendation: implement and accept the design in `gematro-hyperdope` first, then treat `ciphersnews` and `cyphers-news.github.io` as separate adaptations.
- alternative: copy the finished files into all three repositories in one operation.
- consequence: separate ports respect divergent implementations, branches, tests, and cache conventions instead of manufacturing false equivalence.

## scope

in:

- independently redesign the primary numogram svg vocabulary and surrounding menu shell.
- preserve canonical zones, syzygies, gate arithmetic, current direction, and current values.
- preserve the ordered, unbounded zone-pick chain, its adjacent links, the special reading used only when exactly two zones are picked, most-recent-zone selection, twin highlighting, tracing, filtering, layers, visible model selection, effective cosmology state, current keyboard semantics, url restoration, and local trace storage.
- correct provenance text so canonical sources are credited for the system without claiming their composition or line treatment as this implementation's visual authority.
- replace presentation-specific tests with behavioral, geometric, accessibility, and cache-integrity proofs.
- reconcile the stale numogram baseline in `docs/LOCAL-TESTS.md` after the implementation is verified.
- perform a read-only semantic adversarial review before product edits and a fresh read-only diff adversarial review before any commit decision.

out:

- changes to gematria calculation, cipher selection, saved phrases, `shistory`, `userhistory`, submission, deletion, ordering, or history synchronization.
- database, supabase, authentication, rpc, polling, notifications, or account behavior.
- changes to the trace-storage schema or existing url parameter names and meanings.
- exposing the currently hidden recent-trace container or its eight locally stored entries.
- resurrecting ghost compatibility state such as exploration mode, explicit input modes, classical scope, or unused folded-section keys as visible controls.
- broad internal renaming of generic legacy surfaces such as `numPanelGeo` or `numogramGeoPanel()`.
- repairing the broken and unused channel `self` property; the renderer must continue to determine self-returning channels by comparing their actual endpoints.
- dependency, build-tool, workflow, branch-protection, deployment, or hosting changes.
- changes to `calc/index.html` or the existing calculator-to-numogram integration entry point.
- implementation in `ciphersnews` or `cyphers-news.github.io`.
- commit, push, publication, or deployment.
- a generalized cleanup of the legacy css or calculator architecture.

## governing contracts and decisions

- the canonical arithmetic produced by the existing zone, syzygy, gate, and current model is invariant in this slice.
- the tractor zone is the current's destination: the zone whose number equals the absolute difference of the feeding syzygy. the current path is the primary flow from that syzygy to its tractor zone.
- the current renderer groups two visual parts: a short twin bond that articulates the source syzygy and the separate current path to its tractor zone. only the current path receives five filaments; the bond becomes the quieter, independently toggleable syzygy bridge. `tractor route` is not canonical terminology and is not used as a domain concept.
- a gate has two distinct dom objects: `.numChannel` owns the course and `.numGate` owns the value tag. both become pink without merging their identities.
- `toggleNumogramMenu()` and the existing `#numogramMenuArea` host remain the calculator integration contract.
- existing svg element identities, data attributes, focusability, and state classes remain the interaction contract unless the semantic preflight proves a narrower equivalent and the spec is revised before implementation.
- `numogramTraces` and the existing url-state parameters retain their names, meanings, and restoration behavior.
- `numPicked` remains an ordered, unbounded membership chain and `numSelected` remains its most recently picked reading subject. implementation must not collapse either into an unordered set or a two-zone pair.
- `numModel` remains the visible selector key while `numCosmo` remains the effective model, including hidden effective states such as `cross`, `demon`, and `divine`. apparatus rendering and restoration must not infer one solely from the other.
- `numogramReset()` remains a reading reset rather than a factory reset. it does not clear hidden zones, folded sections, stored traces, deck grouping, divination inputs, or contrast state. close/reopen continues to preserve most globals while clearing the same narrower pick, exploration, and derivation state as before.
- all four exposed modes remain available: numogram, gnosticism, pandemonium, and divination; their effective internal substates remain intact.
- the channel object's existing `self` property is not authoritative because it is currently derived from a nonexistent field. rendering must continue to compare actual `from` and `to` endpoints.
- the hidden recent-trace container remains hidden. preserving storage is not permission to surface previously typed local traces.
- the owner-approved visual contract is structural rather than merely chromatic: zone, current, and gate types must remain distinguishable in grayscale and at thumbnail scale.
- a green local suite proves only executable assertions. rendered behavior, composited contrast, canonical orientation, and deployment cache behavior require separate evidence.
- the stale historical claims in `docs/LOCAL-TESTS.md` do not override the verified 78-of-78 baseline.
- adversarial reviewers are read-only. they classify findings and propose proof; they do not repair the candidate they review.

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes | this spec's visual, truthful syzygy-layer, crossing-priority, and shell contract | rendered desktop, narrow, zoom, grayscale, pointer, keyboard, and owner canonical review |
| persisted state or schema | no | current trace storage and history boundaries | storage-key and url restoration regression tests; diff review confirms no persistence files changed |
| external or provider-visible behavior | no | current static-client boundary | changed-file inventory and absence of network, auth, rpc, or provider edits |
| identifiers, secrets or privacy | no | current repository and escaping boundary | no identifier/schema changes; dynamic-html review confirms trace strings remain escaped |
| lifecycle or terminal states | no | current open, close, reopen, trace, and selection behavior | component lifecycle, listener cleanup, state restoration, and replay tests |
| setup, operation or recovery | yes | content-addressed asset references and one-commit rollback boundary | source-hash tests, clean local serve, and documented rollback diff |
| normative contract or decision | yes | this exact accepted spec revision | owner acceptance plus both adversarial review reports |
| cross-repository dependency | no | this slice is confined to `gematro-hyperdope` | repository status and changed-file inventory; sibling ports remain separate specs or accepted adaptations |

## review visuals

- none. the accepted visual direction is expressed as a normative textual grammar in this spec; rendered implementation evidence will be attached during verification rather than treating a disposable mockup as executable authority.

## likely touched surfaces

| surface | intended change | containment rule |
|---|---|---|
| `calc/numogram.js` | renderer primitives, syzygy-bond/current-path grouping, geometry, shell markup, reading text, and dormant provenance text | preserve model arithmetic, ordered pick semantics, visible/effective model state, reset lifecycle, storage, url state, and integration entry points |
| `calc/numogram.css` | visual tokens, zone/current/gate grammar, shell layout, focus, motion, narrow behavior, auxiliary-mode retheme | replace core rules in place; inventory generated selectors before removing inherited rules |
| `tests/numogram.test.js` | replace derivative presentation assertions; add semantic, geometry, interaction, accessibility, and cache proofs | retain arithmetic and persistence assertions; tests must not simply mirror implementation constants |
| `index.html` | update only the content-derived numogram js/css query keys | keys must equal the required source-hash prefix and no unrelated markup may change |
| `docs/LOCAL-TESTS.md` | reconcile historical numogram failure claims with the verified current baseline | preserve the older checkpoint as history where useful; do not rewrite unrelated ci guidance |
| `specs/numogram-independent-visual-redesign.md` | record the accepted contract and append candidate evidence | evidence reconciliation must not silently alter accepted product decisions |

the following are inspect-only unless the accepted spec is revised:
`calc/calc.js`, `calc/index.html`, authentication and profile scripts, history and
sync scripts, sql, workflows, dependencies, and sibling repositories.

## adversarial review protocol

### gate a: semantic preflight before product edits

use a fresh read-only reviewer that did not author the implementation plan.
provide the change goal and current source, but do not provide a reassuring
argument for why the planned implementation is safe. require it to:

- reconstruct the operational meaning and lifecycle of every state variable, storage key, query parameter, css/dom class, renderer primitive, mode, and measured shell element likely to be touched;
- trace readers, writers, callsites, and hidden consumers;
- identify misleading names or apparent meanings that differ from actual behavior;
- enumerate invariants, boundary cases, and counterexample tests;
- classify findings as stop-ship, required-spec addition, verification-only, or harmless;
- make no edits, staging changes, commits, pushes, network calls, or deployment actions.

stop if the reviewer finds a semantic ambiguity that changes scope, persistence,
canonical arithmetic, acceptance criteria, or the meaning of an existing
interaction. revise and re-accept the spec before implementation.

### gate b: fresh diff adversary before commit

after implementation and local verification, use a fresh read-only reviewer
that did not write the candidate. require it to assume the implementation is
wrong, inspect the complete diff and every changed identifier's consumers, and
attack at least:

- arithmetic, syzygy-bond/current-path anatomy, tractor-zone destination, and direction invariance;
- trace creation, replay, clearing, storage, and url restoration;
- ordered three-plus-zone picking, most-recent selection, exact-two-zone reading, twins, filtering, truthful syzygy/current layers, and hidden states;
- visible `numModel`, effective `numCosmo`, all four exposed cosmology modes, hidden effective substates, and shared css;
- reading-reset semantics, close/reopen preservation, shell fitting, resize listeners, narrow flow, and focus;
- `warp`, `plex`, syzygy-bond/current-path separation, gate/channel separation, gate-tag clearance, filament ordering, chevrons, bundle-wide hit targets, crossing priority, and zone occlusion;
- absence of newly exposed trace history or resurrected ghost compatibility controls;
- dynamic-html escaping, content hashes, changed-file scope, and rollback shape;
- whether tests prove independent behavior rather than restating new implementation constants.

no commit decision may proceed with an unresolved stop-ship finding. a
verification-only finding must be discharged by named evidence or retained as
an explicit owner-visible gap.

## gate a evidence

the initial gate-a review completed read-only on 2026-11-09 before any product
edit. it changed no files and reported the focused numogram suite green. its
required semantic corrections are incorporated into this draft:

| apparent name | operational meaning preserved by this spec |
|---|---|
| current group | an implementation wrapper containing a short syzygy bond and the separate current path to its tractor zone |
| gate | the value tag; its course is the separately addressed channel |
| syzygies layer | currently an alias that recedes the current group; proposed here as a real independent bond layer |
| picked pair | an ordered, unbounded pick chain; only exactly two picks receive a special reading |
| selected zone | the most recently picked reading subject, not the membership collection |
| model | the visible selector key, which can differ from the effective cosmology state |
| reset | a reading reset, not a factory reset |
| recent history | eight locally stored traces with no currently visible history surface |
| channel self flag | broken and unused; actual endpoint comparison remains authoritative |

the review also established that gate/channel/current groups are not presently
keyboard-focusable, that the generic geo panel names serve every auxiliary
model, and that ghost compatibility state should not be resurrected as
preserved ui. those are now explicit scope and proof boundaries rather than
implementation folklore.

## implementation by invariant

1. **semantic boundary is known before editing.** complete gate a, incorporate every required-spec addition, and stop for owner resolution if a state name or hidden consumer changes the accepted scope.
2. **canonical mathematics is unchanged.** freeze zone, syzygy, gate, current, reduction, and accumulation outputs with focused tests before replacing presentation primitives.
3. **the visual language is independently structural.** render black aperture zones with opaque occlusion discs, bone numerals, registration brackets, and syzygetic notches; render each current path to its tractor zone as five sampled tangent-normal filaments with alternating intensity and an open green chevron; retain its source bond as a quieter green syzygy bridge; render pink channel courses; and render their separate gate values as enlarged pink numerals in small borderless black apertures.
4. **geometry remains legible and interactive.** keep canonical positions and radii frozen, express the desired larger zone presence through visual treatment, compute conservative aperture-bounds clearance, include outer filaments, brackets, notches, occluders, and chevrons in bounds, make central hit strokes cover the full filament bundle, and inspect self-returning `warp` and `plex` independently. at crossings, separate visible and hit layers deliberately so the visible foreground current receives the intersection activation.
5. **interaction contracts survive the new svg.** preserve identifiers, data attributes, delegated selectors, state classes, existing focusability, twin and trace states, the ordered multi-pick chain, most-recent selection, exact-two reading, generated adjacent links, visible/effective model divergence, reset lifecycle, filtering, and generated readings. raw user strings remain escaped; do not trust the broken channel `self` flag.
6. **capability is calmed, not invented.** rebuild the malformed generated shell as plate plus reading rail, place actually visible advanced controls in an apparatus disclosure, retain all four exposed modes and their effective substates, preserve the invert pathway as an apparatus-level contrast control, and do not expose hidden trace history or ghost compatibility state.
7. **responsive and accessible behavior is proved honestly.** revise runtime fitting with the shell, preserve listener and timer cleanup, expose non-color distinctions, retain visible focus and 44-pixel ordinary controls, preserve keyboard activation for zones and cosmology bands, avoid claiming keyboard parity for pointer-only diagram objects, and suppress nonessential animation under reduced motion.
8. **provenance becomes accurate without inventing a panel.** retain canonical mathematical sources while removing dormant source and test prose that claims their composition, line weights, circle treatment, or annotation style are followed. do not claim a user-visible provenance change unless a later accepted revision deliberately surfaces one.
9. **tests and delivery references change with the source.** replace presentation-copy assertions with invariant and geometry proofs, run focused and full suites, update only the numogram content keys in `index.html`, and reconcile the stale local-test documentation.
10. **the completed candidate is attacked before commitment.** complete gate b, repair stop-ship findings, rerun every affected proof after repairs, and present the exact local diff and remaining gaps for owner review. commit, push, and deployment remain separate transitions.

## implementation evidence

the bounded implementation changes the five declared implementation and
verification surfaces plus this canonical spec. no inspected auth, history-sync,
database, workflow, dependency, calculator-entry, or sibling-repository surface
changed.

- focused numogram assertions pass.
- the required safety suite passes 51 of 51 tests.
- the full local suite passes the verified 78-of-78 baseline.
- `git diff --check` passes.
- `calc/numogram.js` hashes to
  `2de9f2e2f7617f84d5c410cb63fe7b93e5e2620744456ab95816bb2bc110a250`;
  `index.html` serves its required `2de9f2e2f7617f84` prefix.
- `calc/numogram.css` hashes to
  `b2a6d07afb651362be224b27ae58881a6be4549c66e343269f9501ed1b27f704`;
  `index.html` serves its required `b2a6d07afb651362` prefix.
- actual-page chromium evidence covers the specified desktop, short-window,
  narrow, and 200-percent-equivalent viewports; reduced motion; keyboard and
  ordered multi-pick interaction; independent current/syzygy layers; all four
  exposed models; hidden trace history; `?number=364` navigation and replay;
  twin and filter transitions; hidden planet-trace model/cosmology divergence;
  five repeated close/reopen/resize/focus cycles; an exhaustive census of 186
  visible-control instances across all four cosmologies with no target below 44 by
  44 pixels;
  all apparatus groups without horizontal loss; and close/reopen teardown and
  state restoration. no runtime exception or console error was observed.
- the fresh read-only gate-b reviewer found no arithmetic or semantic stop-ship
  defect and identified seven required repairs: three target collisions,
  undersized controls, horizontally hidden apparatus groups, insufficient
  target regressions, stale derivative provenance prose, one trace-history
  contradiction in this spec, and one ghost url-replay comment. the primary
  writer applied the bounded repairs and reran the focused, safety, full, and
  browser proofs. the reviewer then identified three narrower proof gaps:
  registration brackets were absent from clearance, the 44-pixel census was
  selector-narrow, and visual-authority comments survived below the repaired
  headline. the candidate now treats brackets and self-returning loops as
  first-class geometry, clears gt-36 from zone 9's bracket, applies a scoped
  target floor to every visible html control, exhaustively probes all four
  cosmologies, and removes the remaining visual-authority prose. final
  exact-diff review then exposed and discharged four deeper proof seams: a
  stale self-loop bounds formula, screen-pixel strokes measured as svg units,
  a widest-state registration stroke missing from clearance, and an invisible
  zone-target halo stealing exposed plex/warp filaments. source comments and
  fitting code were also reconciled with the actual model/cosmology states and
  plate-plus-reading-rail shell. at those exact js/css hashes, gate b reported
  no stop-ship finding and no required repair. the owner then approved the
  rendered whole and requested one bounded visual refinement: replace the
  small outlined gate-number boxes with slightly larger pink numerals in black
  apertures analogous to the zones. follow-up review found four required
  repairs: fully opaque resting wells, no buried leader fragments, dedicated
  high-contrast gate ink in both readings, and precise alternative-language in
  this spec. the repaired rendering emits one exposed leader only where the
  label actually leaves its aperture, retains 19-pixel hot-pink numerals in
  30-unit black apertures, and keeps independent 44-by-44 pointer targets.
  default and inverted gate contrast measure 5.773:1 and 5.577:1. the final
  exact-diff review found no stop-ship defect and declared the candidate
  supportable for a local commit decision. these verification results were
  collected before release; they do not themselves establish deployed-cache
  state or sibling adaptation.

## done when

- gate a has no unresolved stop-ship finding or unincorporated required-spec addition.
- canonical zone, syzygy, gate, and current outputs match the frozen pre-change model.
- every current path to a tractor zone visibly contains five ordered green filaments derived from one route, with an open chevron that communicates the canonical direction before the destination aperture; each short twin bond remains a distinct quieter syzygy bridge rather than acquiring five filaments.
- `warp` curls into zone 3 without reversing, bunching illegibly, or losing its chevron; `plex` remains legible and unclipped at the bottom of the plate.
- every gate preserves a distinct pink `.numChannel` course and `.numGate` value tag, with verified clearance from zones, currents, other tags, brackets, and hit targets.
- zones read as black apertures rather than outlined discs, retain opaque occlusion beneath them, and replace every selected, twin, trace, pick, and focus treatment formerly carried by the visible ring.
- zones, currents, and gates remain distinguishable at thumbnail scale and in grayscale.
- three or more picked zones retain their order and produce adjacent links; `numSelected` remains the most recent reading subject; exactly two picks retain their special reading; twins, traces, filters, hidden states, and url restoration remain coherent.
- the syzygies switch independently controls the quiet bond layer and the currents switch controls current paths; neither switch becomes an alias for dimming the same group.
- visible model selection and effective cosmology state survive traces, model switches, reset, and restoration without being collapsed into one variable; all four exposed modes and hidden effective substates behave as before.
- reading reset and close/reopen preserve and clear exactly their existing categories of state; neither is promoted to a factory reset.
- the default shell presents the plate and reading rail; actually visible advanced capabilities remain reachable through the keyboard-operable apparatus disclosure, while hidden trace history and ghost compatibility state remain unexposed.
- zones and cosmology bands retain keyboard activation; gates, channels, and currents retain their existing pointer operation without the spec claiming new keyboard parity.
- outer visible filaments activate across the complete bundle, and a current/gate crossing activates the visually foreground current rather than an obscured lower path.
- the menu survives open, close, reopen, reading reset, repeated resize, desktop, short-window, narrow flow, 200 percent zoom, and reduced-motion operation without stale listeners, clipped controls, document-wide overflow, or focus loss.
- trace text and every other user-derived string remain escaped at dynamic-html boundaries.
- the focused numogram suite passes and the full local suite passes at least the verified 78-of-78 baseline with no assertion weakening or exclusion.
- the served numogram js/css cache keys exactly match the required content-derived source prefixes.
- the complete implementation diff is confined to the five declared product
  and verification surfaces; this canonical spec is the only additional record.
- gate b has no unresolved stop-ship finding; every verification-only finding names its evidence or remains an explicit owner-visible gap.
- the technical owner confirms canonical orientation, zone placement, current and gate direction, and the independent visual silhouette from rendered evidence.
- `docs/LOCAL-TESTS.md` truthfully distinguishes the historical failing checkpoint from the current verified baseline.
- release state is reported separately from implementation evidence; no database operation or sibling-repository port is implied by this slice.

## validation commands

```sh
node --test tests/numogram.test.js
bash scripts/test-local.sh safety
bash scripts/test-local.sh full
git diff --check
git status --short --branch
```

also verify the actual served page in a chromium-based browser at approximately
1500 by 1000, 1366 by 768, 1024 by 768, and 390 by 844; repeat the consequential
flow at 200 percent zoom and with reduced motion enabled. inspect pointer and
keyboard operation, all modes and filters, trace replay and url reload,
open/close/reopen, `warp`, `plex`, thumbnail silhouette, grayscale structure,
and the browser console. browser rendering and owner review are evidence gates,
not substitutes for the executable suite.

## risk register

| risk trigger | plausible bonk | containment and proof |
|---|---|---|
| misleading state or history name | visual work changes a hidden persistence or restoration contract | gate a traces every reader/writer and storage key before edits; no persistence file is in scope |
| conflating syzygy bond with current path | every part of `.numCurrent` receives filaments and syzygy/current layers remain semantically false | keep distinct children and filament only the current path to the tractor zone |
| conflating gate with channel | a pink tag or pink course disappears from selection and filtering | preserve `.numGate` and `.numChannel` as separate pink objects |
| conflating `numSelected` with `numPicked` | multi-pick order, adjacent links, or reading subject silently change | test ordered chains of at least three zones plus exact-two special reading |
| conflating `numModel` with `numCosmo` | trace-driven hidden effective modes vanish or apparatus lies | test visible selector and effective state independently through trace and reset flows |
| treating reset as factory reset | hidden zones, stored traces, contrast, or divination state are erased | freeze and test the current reading-reset and close/reopen lifecycle separately |
| trusting channel `self` | `warp` and `plex` self-return geometry is misclassified | continue comparing real endpoints; leave property repair outside this slice |
| svg class or data-attribute removal | hover, filtering, tracing, selection, or ordered multi-pick links silently stop working | preserve the interaction contract and exercise every state through production delegation |
| naive filament duplication | strands cross, separate, reverse, or bunch around bends | generate sampled tangent-normal offsets from one route and inspect tight curves |
| endpoint markers under apertures | current direction disappears or appears reversed | place explicit open chevrons before destinations and assert orientation |
| gate apertures with stale box geometry | apertures overlap zones, paths, or one another | model each aperture's conservative painted bounds and retain separate generous invisible hit areas |
| narrow hit stroke beneath a wide bundle | visible outer filaments advertise dead pointer targets | size the central hit stroke to cover the complete rendered bundle |
| independent visual and hit z-orders | clicking a visible current selects a lower gate at a crossing | specify foreground current priority and test exact intersections |
| indiscriminate css deletion | auxiliary cosmologies or hidden states become invisible | inventory generated selectors and render all four modes before removing rules |
| shell rewrite without fitting rewrite | clipping, false narrow mode, overflow, or stale resize work | update and stress the measurement lifecycle with repeated resize and reopen tests |
| test rewrite mirrors new constants | suite passes while behavior is wrong | freeze independent arithmetic outputs, use relational geometry checks, and let gate b challenge test independence |
| dynamic-html reconstruction | trace text becomes an injection sink | preserve escaping and inspect every user-derived interpolation contextually |
| incorrect content key | deployed clients receive stale or mismatched assets | exact hash assertion plus served-page inspection after any later deployment |
| simultaneous sibling-repository copy | divergent clients acquire partial or broken behavior | keep sibling ports outside this slice and require independent baselines |
| reviewer repairs its own finding | independent review becomes a second unowned implementation lane | reviewer remains read-only; the primary writer applies accepted repairs and reruns proof |

## risks and unknowns

- gt15 routing: known visual deviation from canonical geometry due to available plate clearance. preserve the canonical gate relation; revisit path routing in the new site's unconstrained layout.
- the current css contains duplicated and late override rules; selector ownership must be established before deletion rather than inferred from visual similarity.
- the generated menu shell currently relies on browser repair of a duplicate closing element; normalization is in scope only because the same shell is being rebuilt.
- the real renderer's current zone radius differs from the disposable mockup's scale. canonical positions and radii remain frozen; the desired slightly larger visual presence must come from aperture treatment, numeral scale, and registration geometry rather than a model-radius mutation.
- the shared auxiliary-mode styling may reveal additional selectors during gate a. selectors are a required-spec addition only if supporting them changes declared files, behavior, or acceptance criteria; ordinary inventory detail may remain implementation evidence.
- local browser proof cannot establish deployed cache behavior. deployment remains a separate authorization and verification gate.
- the accepted textual visual grammar is precise about roles and relations but does not prescribe every coordinate. owner rendered review remains authoritative for aesthetic convergence inside those bounds.

## open questions

- none. this transition is implemented and retired. release evidence remains distinct from implementation proof, and sibling ports still require their separately named transitions.
