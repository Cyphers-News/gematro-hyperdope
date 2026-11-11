# spec: numogram operator-exclusive illumination

status: retired
implementation state: accepted by the owner and verified locally; commit, push and deployment remain unauthorized

> **continuity role:** completed transition
> **owner:** cyphers technical owner
> **created:** 2026-11-11
> **accepted:** 2026-11-11
> **implemented:** 2026-11-11
> **depends on:** accepted `specs/numogram-reading-relations.md`
> **supersedes:** only that spec's automatic plate illumination for zone-derived gates, syzygetic-pair currents and tractors, three-plus resolved operators, single-zone twin cues, and the exact-two synthetic pulse link

## context

the numogram now distinguishes persistent zone picks from ephemeral gate and
current relation state. direct operator activation already works well: a gate
or channel selects its source and destination, a current or syzygy bond selects
both poles and its tractor, and the reading rail reports the ordered operation.

subsequent owner and external semantic review exposed a remaining ambiguity in
the plate's automatic highlighting. selecting zones currently causes the plate
to infer and illuminate related operators: a single zone can make its gate
course visibly derived, an exact syzygetic pair can ignite its current and
tractor, and a larger held set can light resolved gates and currents. the rail
is entitled to make those inferences; the plate's light is not. the same glow
currently means explicit choice, mathematical derivability, and completed
relation, which invites readers to treat a zone and its gate as co-selected or
synonymous.

the owner prefers the derived glow aesthetically, but accepts the stricter
interaction grammar because it leaves interpretive plurality with the reader:
a line lights only when the reader selects that line. the rail may continue to
name relations derivable from held zones without performing them visually.

the verified repository baseline was `master` at `1d68917`. that commit
contained the `numDerived` gate treatment. at planning time the working tree
also contained an uncommitted three-file candidate that preserved derived
gates across multi-selection. it had passed the focused numogram checks, the
51-test safety suite, the 91-test full suite, and rendered chromium state
checks, but was incompatible with this contract. implementation rewrote that
candidate deliberately rather than discarding the dirty worktree wholesale.

## owner view

- change: reserve operator illumination for direct operator selection; zone selection may inform the rail but lights only the zones the reader actually chose.
- before: one glow carries three meanings: selected, derived, and automatically resolved.
- after: selected zones are bright; selected operators and their ordered participants are bright; every inferred but unselected operator remains ambient while the rail reports what the held set makes available.
- authority: this retired spec records the accepted transition and its local proof. source and tests own current behavior; deployed state remains outside this document.

## owner decisions

### one visual verb

- **recommendation:** treat full operator illumination as proof of direct operator selection, never as proof that the application inferred a relationship from selected zones.
- **alternative:** preserve the intermediate `numDerived` intensity for gates and automatic relation lighting for completed held sets.
- **consequence:** the recommendation sacrifices a pleasing derived glow in exchange for a crisp, teachable rule: if a gate or current is lit, the reader selected it.

### rail intelligence, plate restraint

- **recommendation:** preserve zone dossiers, exact-two lemur readings, and three-plus relation inventories, including relations derived from held zones, while preventing those reports from changing operator illumination.
- **alternative:** remove inferred relations from the rail whenever their operators are not selected.
- **consequence:** the recommendation keeps the instrument educational without allowing its diagram to make choices for the reader.

### synthetic pair pulse

- **recommendation:** retire the generated glowing arc between exactly two held zones. it is not a canonical gate or current, and under the new contract a lit line must be an explicitly selected canonical operator.
- **alternative:** keep the pulse as a selection-only affordance with a separate style and explanation.
- **consequence:** the recommendation loses an attractive motion cue but removes the final line whose glow does not mean operator selection.

### relation-selected zones

- **recommendation:** when a gate or current is directly selected, continue allowing that relation to select and illuminate its participant zones automatically. the reading rail and directional geometry state their ordered roles.
- **alternative:** light only the operator and leave its zones ambient.
- **consequence:** the recommendation preserves the existing explanatory payoff while keeping agency clear: the operator gesture, not a zone inference, caused the participant selection.

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes | this spec's illumination matrix | focused state tests and rendered chromium comparison |
| persisted state or schema | no | existing ephemeral `numRelation` / `numPicked` boundary | diff inspection and persistence-absence assertions |
| external or provider-visible behavior | no | static local client boundary | changed-file inventory and classifier |
| identifiers, secrets or privacy | no | existing repository boundary | diff inspection |
| lifecycle or terminal states | yes | zone-selection and operator-selection transitions below | pointer, keyboard, toggle-off, escape, filter and reset tests |
| setup, operation or recovery | no | existing local runner and content-addressed asset delivery | required suites and source-hash assertions |
| normative contract or decision | yes | this exact spec after explicit owner acceptance | accepted revision and direct diff review |
| cross-repository dependency | no | this slice remains confined to `gematro-hyperdope` | sibling reconciliation stays a separate owner transition |

## governing interaction contract

### illumination matrix

| reader action | fully illuminated plate objects | ambient plate objects | reading rail |
|---|---|---|---|
| select zone 4 | zone 4 only | every gate, current, twin, tractor and destination | zone-4 dossier, including gt10 and sink information |
| select zones 4 and 5 | zones 4 and 5 only | gt10, gt15, sink, tractor 1 and every unrelated operator | lemur `5::4`, naming sink without enacting it |
| select zones 4, 5 and 6 | zones 4, 5 and 6 only | every gate and current | held-zone inventory reporting sink and gt15 |
| select gt10 or its channel | gt10, its channel, source zone 4 and destination zone 1 | every unrelated zone and operator | gate reading with source before destination |
| select sink or its syzygy bond | sink, high pole 5, low pole 4 and tractor zone 1 | every unrelated zone and operator | current reading with high pole, low pole and tractor |

### selection meaning

- zone gestures modify ordered `numPicked` state and the most-recent
  `numSelected` subject. they do not select a gate, current, twin, tractor or
  destination.
- gate/current gestures modify separate ephemeral `numRelation` state. they
  clear ordinary zone picks, then illuminate only the selected operator and
  its participants.
- direct gate activation preserves source-before-destination order in the
  rail. direct current activation preserves high-pole, low-pole, tractor order.
- relation participants may receive selected visual and accessible treatment
  because the explicit operator gesture selected the relation containing them.
- pointer, enter and space continue through the same activation function.

### inference without enactment

- `numResolvedRelations()` remains the arithmetic owner for relations
  available from a held set.
- exactly two zones retain their canonical lemur reading. a syzygetic pair may
  name its current in the rail but does not light that current or its tractor.
- three or more zones retain the held-zone inventory and its resolved current
  and gate rows. those rows do not light the corresponding plate operators.
- one-zone dossiers continue displaying gate, syzygy and current information.
  those facts do not light their operators or related zones.

### no synthetic relation light

- a single selected zone does not apply twin, tractor or destination highlight
  classes to any other zone.
- exact-two selection does not draw the generated `numLinkGlow`,
  `numLinkLine`, or `numLinkPulse` route.
- automatic exploration compatibility state does not provide a backdoor that
  lights an operator from zone state.
- ambient canonical geometry remains visible according to the existing focus,
  filter, region and layer rules. ambient does not mean hidden.

## scope

### in

- remove the `numDerived` runtime and css state;
- remove automatic gate/current/twin/tractor/destination illumination from all
  zone-selection cardinalities;
- remove the exact-two generated pulse route while preserving ordered zone
  picks and the lemur reading;
- retain direct gate and current relation selection and ordered participant
  readings;
- make accessible pressed/selected state agree with explicit zone and operator
  selection;
- preserve sidebar relation derivation and inventory;
- replace superseded state assertions and update exact numogram asset hashes.

### out

- canonical geometry, arithmetic, gate destinations, current direction,
  syzygies, phases, lemurs, lore or source attribution;
- reading-rail content, ordering or responsive layout except where a stale
  illumination claim must be corrected;
- filters, regions, layers, cosmologies, trace arithmetic, url state, trace
  history, reset categories or menu fitting;
- database, auth, profiles, saved phrases, history synchronization, moderation,
  dependencies, workflows or deployment;
- successor-site or sibling-repository reconciliation;
- commit, push, publication or deployment.

## likely touched surfaces

| surface | intended change | containment rule |
|---|---|---|
| `calc/numogram.js` | remove automatic operator and related-zone projection; preserve direct `numRelation` projection; stop generating the exact-two pulse | do not alter arithmetic, reading derivation, persistence or operator activation ownership |
| `calc/numogram.css` | remove `numDerived` and dead automatic trace/pulse treatments | preserve established black/green/pink plate grammar, focus visibility and reduced motion |
| `tests/numogram.test.js` | replace inferred-highlight assertions with operator-exclusive state and accessibility proofs | prove behavior rather than merely searching implementation tokens |
| `index.html` | update only content-derived numogram js/css query keys | preserve script order and unrelated asset keys |
| `specs/numogram-operator-exclusive-illumination.md` | record exact accepted revision and later implementation evidence | evidence may not silently rewrite the accepted contract |

inspect only unless a concrete conflict appears: `calc/calc.js`,
`docs/LOCAL-TESTS.md`, auth/profile/history code, sql, workflows, dependencies
and sibling repositories.

## implementation by invariant

1. **neutralize the superseded candidate without broad reset.** preserve the
   dirty worktree, remove the unaccepted additive-gate projection deliberately,
   and review the exact resulting diff.
2. **make `numRelation` the sole operator-light owner.** only the direct gate or
   current relation branch may apply active operator classes.
3. **make zone projection literal.** ordinary selection highlights only zones
   present in `numPicked`; it applies no twin, tractor, destination, gate or
   current state.
4. **separate reporting from performance.** keep `numResolvedRelations()`,
   zone dossiers, lemur readings and aggregate inventories intact while
   removing their plate-side activation effects.
5. **retire noncanonical selection light.** remove the exact-two generated
   pulse route and the css/tests that exist only to support it.
6. **align accessibility with the state owner.** explicit zone picks report
   pressed; relation-selected participants and the selected operator report
   active; ambient objects report inactive.
7. **attack every transition.** prove zone-to-zone, zone-to-operator,
   operator-to-zone, operator toggle-off, escape, reset, close/reopen and
   filter/layer invalidation without stale classes.
8. **reconcile delivery.** update exact content keys only after the candidate
   passes focused, rendered, safety and full-suite proof.

## acceptance criteria

- selecting zone 4 fully illuminates zone 4 and no gate, current, twin,
  tractor or destination.
- selecting zones 4 and 5 fully illuminates only zones 4 and 5. the rail names
  lemur `5::4` and sink; sink and tractor 1 remain ambient.
- selecting zones 4, 5 and 6 fully illuminates only those zones. the rail still
  reports sink `5::4 -> 1` and gt15 `5 -> 6`.
- selecting gt10 through either its aperture or channel fully illuminates only
  gt10, its channel, source zone 4 and destination zone 1. the rail lists
  source before destination.
- selecting sink through either its current path or syzygy bond fully
  illuminates only sink, zone 5, zone 4 and tractor zone 1. the rail lists high
  pole, low pole and tractor.
- no `numDerived` runtime class or css rule remains.
- no ordinary zone selection applies operator `numOn`, `numTwin` or zone
  `numTrace` state.
- no exact-two selection draws `numLinkGlow`, `numLinkLine` or `numLinkPulse`.
- three-plus relation inventory remains mathematically identical to the
  pre-transition output despite no longer changing operator illumination.
- repeated relation activation toggles to idle. zone activation, trace, body,
  reset, escape, close and visibility invalidation clear relation state without
  leaving stale operator or participant classes.
- pointer, enter and space produce identical relation states and accessible
  names; explicitly picked zones and relation-selected participants expose
  accurate active state.
- filters, regions, layers, modes, url restoration, local trace storage,
  reduced motion, crossing priority and canonical geometry remain unchanged.
- the focused numogram script, safety suite and full local suite pass without
  exclusion or weakened assertion.
- js/css query keys match the accepted source hashes.
- owner inspection confirms that the lost pair pulse is an acceptable cost of
  making illumination unambiguous.

## validation

```sh
node tests/numogram.test.js
bash scripts/test-local.sh safety
bash scripts/test-local.sh full
git diff --check
git status --short --branch
```

serve the local calculator and inspect these states in chromium at a laptop
viewport and the repository's narrow mobile viewport: zone 4; zones 4+5;
zones 4+5+6; gt10 through aperture and channel; sink through current and bond;
operator toggle-off; zone replacement; escape; reset; close/reopen; filtered
participant; hidden gate layer; hidden current layer; reduced motion; keyboard
enter and space. record computed classes, opacities and accessible pressed state
for each consequential object, and confirm no console error.

## risk register

| trigger | plausible bonk | containment and proof |
|---|---|---|
| early return in `numogramApply()` | stale operator classes survive a new zone or cardinality change | reset transient classes before branching; rendered transition matrix |
| `numPicked` and `numRelation` collapse together | relation participants become durable zone picks or pollute url/history | retain separate state; persistence-absence and transition tests |
| removing plate inference removes rail inference | multi-zone inventories or lemur current names disappear | keep pure relation derivation and reading tests unchanged |
| relation participants look selected but expose inactive accessibility state | visual and assistive state disagree | pointer and keyboard aria assertions plus rendered accessibility inspection |
| compatibility exploration state remains | hidden path can still light operators from a zone | source assertion that only relation projection activates operators |
| pulse removal damages ordinary pick behavior | second pick stops toggling, ordering or exact-two lemur reading | ordered pick and exact-two reading regressions |
| content key updates race implementation | github pages serves mixed js/css generations | derive hashes after final proof; verify served requests locally |
| prior dirty candidate is broadly discarded | unrelated owner work is lost | patch only named hunks; inspect pre/post diff and status |

## authorization boundary

accepting this spec authorizes no product edit by itself. implementation,
commit, push, deployment, publication and sibling-repository reconciliation
remain separate owner transitions.

## implementation evidence

the owner accepted this exact transition and separately cleared its bounded
implementation on 2026-11-11. the implementation preserved the pre-existing
dirty candidate and rewrote only the declared illumination seam; it did not
reset, commit, push, deploy or touch a sibling repository.

### changed surfaces

- `calc/numogram.js` now gives ordinary zone light exclusively to `numPicked`
  and operator light exclusively to direct `numRelation` state. relation
  participants inherit selected visual and accessible state from the explicit
  operator gesture. the synthetic exact-two link layer is absent.
- `calc/numogram.css` no longer contains derived-gate, twin, tractor or
  synthetic-pulse treatments. selected zones retain the established green
  aperture grammar; selected gates and currents retain the existing pink and
  green operator grammar.
- `tests/numogram.test.js` executes literal one-, two- and three-zone states,
  direct gate and current states, participant accessibility, rail-only
  inference and the absence of synthetic line vocabulary.
- `index.html` serves the final content-derived numogram js and css keys.
- `docs/LOCAL-TESTS.md` records this checkpoint and makes the superseded
  2026-11-10 hashes explicitly historical.

### proof collected

- `node tests/numogram.test.js`: all numogram checks passed.
- `bash scripts/test-local.sh safety`: 51 passed, 0 failed.
- `bash scripts/test-local.sh full`: 91 passed, 0 failed.
- chromium at 1366 by 768 and 520 by 780 exercised zone 4, zones 4+5,
  zones 4+5+6, gt10, sink, pointer activation, enter, space, escape, repeated
  operator toggle-off, current-layer invalidation, gate-layer invalidation,
  participant filtering, close/reopen and reduced motion with no console or
  runtime errors.
- rendered state confirmed that zone-derived relations remain in the reading
  rail while every unselected operator remains ambient; direct gt10 selects
  zones 4 and 1, and direct sink selects zones 5, 4 and tractor 1.
- the deterministic classifier reports a red `html-execution-sink` signal
  because it matches deleted lines as well as additions. independent read-only
  adversarial review traced that signal entirely to removal of the synthetic
  link renderer's two `innerHTML` writes, found no added or widened execution
  sink, and reported no stop-ship finding.
- `git diff --check`: clean.

### delivery boundary

local source and content keys agree. deployed cache state, live-user state,
github pages propagation and sibling-repository conformance remain unverified
and outside this implementation authorization.
