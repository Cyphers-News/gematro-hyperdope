# spec: numogram custom palette

status: draft
implementation state: deferred idea only; no implementation, commit, push or deployment authorized

> **continuity role:** proposed transition
> **owner:** cyphers technical owner
> **created:** 2026-11-13
> **supersedes:** none

only the designated owner may change `status` from `draft` to `accepted` or
`rejected`. the owner invited a collaborator to present a plan on sunday and
offered to implement after reviewing it. this draft preserves the candidate
idea in the meantime; it does not substitute for that plan, its review, or
later implementation authorization.

## context

the independent numogram redesign replaced an externally derived multicolour
rendering with a black, bone, green and pink cyphers plate. the current
stylesheet centralizes much of that palette in css custom properties, but the
two role colours are also reused by selection, focus and interface chrome.
zones expose a local `--zc` seam in several secondary representations, but all
zones currently resolve to the same bone colour.

a reported collaborator preference is likely satisfied by direct palette
customization rather than by restoring the old rendering: one colour picker
for each of the ten zones, one shared gate picker and one shared current
picker. this preference is secondhand product input, not owner acceptance.

the old multicolour rendering is not a source, default or restoration target
for this transition. any eventual defaults and user-selected colours must
remain part of the independent cyphers visual language.

the verified planning baseline is `master` at `6469c98`. the numogram source
files are clean relative to that commit; unrelated uncommitted work exists in
the wider repository and must not be folded into this slice.

## owner view

- change: add a compact palette editor with ten zone colours, one gate colour and one current colour.
- before: all zones share bone registration ink; currents are green and gates/channels are pink.
- after: a reader can author a local twelve-colour numogram palette without changing its mathematics, geometry, interaction grammar or provenance boundary.
- authority: this canonical markdown draft records the candidate transition. it authorizes no product edit and remains subordinate to later owner decisions.

## owner decisions

### control granularity

- **recommendation:** expose exactly twelve native colour inputs: zones `0` through `9`, `gates` and `currents`, plus one separate restore-defaults action.
- **alternative:** offer one accent picker, a collection of authored presets, or a fully general theme editor.
- **consequence:** twelve controls provide the requested zone-level variation while keeping field, ink, layout and unrelated site theme values outside the slice.

### zone-colour reach

- **recommendation:** let each zone token colour that zone's registration mark, numeral, filter chip and auxiliary zone references while retaining the black aperture silhouette; selected state should intensify or outline the same hue rather than replace it with the current colour.
- **alternative:** colour the aperture fill, colour only secondary controls, or let selection replace the zone hue.
- **consequence:** the recommendation makes one zone visually consistent across the instrument without recreating the old filled-rainbow composition. this remains an owner-review decision before acceptance.

### gate and current reach

- **recommendation:** the gate picker colours gate tags, channel courses and their explicitly labelled controls; the current picker colours current paths, syzygy bonds and their explicitly labelled controls. generic focus indicators, selected-zone state and layout chrome receive separate stable tokens.
- **alternative:** continue using `--num-current` and `--num-channel` as broad accent variables, allowing the two pickers to recolour selection, focus, headings and panel rules too.
- **consequence:** the recommendation prevents a narrowly named picker from changing unrelated interaction cues, at the cost of splitting currently overloaded css tokens.

### persistence

- **recommendation:** if persistence is accepted, store only the validated twelve-colour palette under one new versioned local-storage key and apply it before the first visible numogram paint.
- **alternative:** keep colours for the open panel or current page session only.
- **consequence:** persistence makes customization useful across visits but triggers a semantic preflight for storage, restoration, malformed legacy values and reset behavior.

### contrast reading

- **recommendation:** keep `contrast` as a fixed high-legibility escape reading. custom colours remain stored but do not override its verified ink/paper palette; leaving contrast restores the custom palette.
- **alternative:** derive a second accessible colour for all twelve custom values or apply the same values in both readings.
- **consequence:** a fixed contrast reading is predictable and testable, while a fully derived custom contrast system is substantially broader than this idea.

### reset boundary

- **recommendation:** `restore default palette` resets palette state only. `reset reading` continues to clear reading state only.
- **alternative:** make the existing reading reset clear colours too.
- **consequence:** keeping the lifecycles separate prevents an ordinary interpretive reset from destroying a user's visual customization.

## scope

### in

- ten labelled native colour inputs for zones `0` through `9`;
- one labelled gate colour input and one labelled current colour input;
- one explicit restore-defaults action;
- a declared mapping from each palette role to every representation it owns;
- tokenization of hard-coded translucent glows, rules and shadows that would otherwise retain stale green or pink residue;
- keyboard and screen-reader access to every control;
- optional versioned local persistence if the owner accepts that decision;
- focused tests, rendered desktop/narrow/zoom review and exact numogram asset cache keys.

### out

- restoring, sampling or approximating the old externally derived rainbow;
- changing numogram arithmetic, geometry, zone identities, gate destinations, currents, syzygies, cosmologies, lore or provenance;
- changing selection meaning, relation illumination, filters, layers, traces, url state or trace history;
- a general site-theme editor, palette sharing, accounts, cloud sync, imports or exports;
- auth, profiles, saved phrases, moderation, database, migrations, dependencies, deployment or sibling repositories;
- implementation, commit, push or publication under this draft.

## governing contracts and decisions

- `specs/numogram-independent-visual-redesign.md` remains the historical authority for the independent visual-language and contrast decisions already implemented.
- `specs/numogram-operator-exclusive-illumination.md` remains the historical authority for explicit operator illumination; custom colour must not make inferred operators appear selected.
- `specs/numogram-reading-relations.md` remains the active accepted authority for current reading and relation behavior.
- `calc/numogram.js`, `calc/numogram.css` and `tests/numogram.test.js` own current executable behavior and proof.
- the collaborator preference recorded here is reported input. only the cyphers technical owner may accept the exact transition.

## change shape

| dimension | changed? | source of truth | proof |
|---|---:|---|---|
| user-visible behavior | yes | accepted revision of this spec and rendered numogram | interaction tests plus desktop, narrow and 200-percent visual review |
| persisted state or schema | unresolved | persistence owner decision above | semantic preflight, storage lifecycle tests and malformed-value recovery if accepted; explicit absence proof otherwise |
| external or provider-visible behavior | no | static local-client boundary | changed-file inventory and network inspection |
| identifiers, secrets or privacy | no | proposed palette contains colours only | diff inspection and storage-payload assertion |
| lifecycle or terminal states | yes | palette load, edit, contrast and restore transitions in the accepted revision | transition tests covering reopen, reload, contrast and both reset actions |
| setup, operation or recovery | no | existing static application and local test runner | required local suites and cache-key proof |
| normative contract or decision | yes | accepted revision of this spec, if any | owner acceptance and reconciliation against the three numogram specs above |
| cross-repository dependency | no | this slice remains confined to `gematro-hyperdope` | changed-file inventory; sibling work requires separate authorization |

## review visuals

- none. the unresolved question is semantic token ownership, which is more faithfully exposed by the mapping and decision text than by a decorative palette mockup.

## anticipated risk route

the later implementation floor is **amber** because this is user-visible ui
state. if the accepted revision includes local persistence, the deterministic
persistence trigger requires an independent read-only semantic preflight before
editing. if it remains session-only and the mapping is fully accepted, ordinary
focused verification is sufficient unless implementation crosses an undeclared
boundary. a fresh diff adversary is required only if the realized change is
broad, crosses the declared state boundary or leaves token ownership ambiguous.

## likely touched surfaces

| surface | proposed responsibility | containment rule |
|---|---|---|
| `calc/numogram.js` | palette defaults, input rendering, validation, apply/restore lifecycle and optional storage | do not change arithmetic, selection, relation or trace state |
| `calc/numogram.css` | twelve role tokens, representation mapping, split overloaded interaction/chrome tokens and derived translucent effects | preserve geometry, layer semantics, focus visibility and fixed contrast reading |
| `tests/numogram.test.js` | role mapping, input accessibility, restore boundary, contrast behavior and optional storage lifecycle | test observable behavior rather than only token names |
| `index.html` | content-derived query keys for changed numogram assets only | no unrelated markup or script-order changes |
| this spec | exact accepted palette contract and later evidence | evidence may not silently rewrite owner decisions |

## implementation by invariant

1. **one validated palette model:** define ten zone values plus one gate and one current value, all normalized to six-digit hex colours. reject or replace malformed persisted values without throwing or partially applying a palette.
2. **one role, every representation:** create an explicit role-to-surface map before editing css. a zone colour follows the same zone across the plate, controls and auxiliary views; gate and current colours reach only their accepted semantic surfaces.
3. **customization never changes meaning:** colour edits modify style tokens only. they do not alter selected classes, `aria-pressed`, geometry, filter state, relation state, arithmetic or reading prose.
4. **selection remains legible without colour:** focus, selection and pressed state retain shape, weight, text or outline cues. custom colours may not become the only representation of state.
5. **contrast remains recoverable:** the fixed contrast reading stays legible regardless of the stored custom palette and returns to that palette when contrast is left.
6. **resets keep separate custody:** reading reset never clears palette state; palette restore never clears reading state. close/reopen and reload behavior follow the accepted persistence decision exactly.
7. **delivery follows content:** any changed numogram js/css query keys equal the required source-hash prefixes; no deployment claim follows from local proof.

## done when

- the exact control count, role mapping, persistence behavior, contrast behavior and reset boundary have been accepted by the owner;
- all twelve controls are labelled, keyboard-operable and visibly associated with the role they change;
- every accepted representation updates immediately with no stale hard-coded green or pink effects;
- malformed stored data, if persistence is accepted, safely falls back without affecting unrelated local storage;
- selected, focused, hidden and directly activated states remain distinguishable without relying on colour alone;
- focused numogram tests, `bash scripts/test-local.sh safety` and `bash scripts/test-local.sh full` pass with inherited failures separated from regressions;
- the live page is inspected at desktop, the repository's narrow viewport and 200-percent-equivalent zoom in both ordinary and contrast readings;
- changed asset query keys match their source hashes and the final diff remains inside the accepted slice;
- this draft is reconciled to `accepted`, `rejected` or an explicitly retained draft; implementation evidence is not added unless implementation is separately authorized.

## risks and unknowns

- current tokens are overloaded: `--num-current` and `--num-channel` colour interaction and chrome beyond the literal current/gate geometry. failing to split or consciously retain that coupling will enlarge the visible outcome.
- several glows, rules, gradients, borders and shadows contain literal green/pink rgba values; updating only the obvious custom properties would leave chromatic residue.
- arbitrary colours can reduce contrast against black apertures or the field. the accepted design must define whether to warn, constrain, auto-adjust or rely on the fixed contrast reading.
- the precise visual reach of each zone colour remains an owner decision. filled apertures would change the independent silhouette more strongly than registration/numeral colour.
- the current accepted `numogram-reading-relations` spec still records owner visual review pending. a palette implementation must not be used to bury or silently satisfy that separate review.

## open questions

1. should zone colour affect registration/numeral/chip/band only, or also the black aperture fill?
2. should gate/current pickers recolour associated labelled controls, or plate geometry only?
3. should the palette persist across page reloads, or remain session-only?
4. is a fixed custom-colour contrast warning sufficient, or should ordinary mode prevent values below a chosen contrast threshold?
5. should this transition wait for and absorb the collaborator's sunday plan, or remain an independent owner-authored alternative?
