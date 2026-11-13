# Plan workflow

Use this workflow to turn a substantial idea or requested change into a
reviewable spec. Planning does not authorize product implementation. Reading
and conversational planning remain read-only; create saved planning artifacts
only when the user requests them or repository instructions explicitly
authorize them.

## 1. Ground the transition

Read durable intent, current status, relevant contracts, the implemented seams
likely to change, and existing tests. Do not re-derive the entire project.

Name the current state and the proposed new state. Identify any conflict that
requires a contract decision before the spec can be accepted.

## 2. Declare the change shape

Include this matrix in every material spec:

| Dimension | Changed? | Source of truth | Proof |
|---|---:|---|---|
| User-visible behavior | yes/no | | |
| Persisted state or schema | yes/no | | |
| External or provider-visible behavior | yes/no | | |
| Identifiers, secrets or privacy | yes/no | | |
| Lifecycle or terminal states | yes/no | | |
| Setup, operation or recovery | yes/no | | |
| Normative contract or decision | yes/no | | |
| Cross-repository dependency | yes/no | | |

Require a conscious `no`; do not leave dimensions blank. The proof may be a
test, generated comparison, manual observation, or explicit review.

Apply [risk-gates.md](risk-gates.md) to the declared shape. Record every
triggered semantic preflight or diff adversary in the spec's implementation and
proof obligations. Ordinary verification is the default when no deterministic
trigger applies; a review model does not choose or waive the route.

## 3. Draft the spec

Define:

- context and reason for the change now;
- a compact owner view: one-breath change, before, after and authority;
- owner decisions with recommendation, alternative and consequence;
- scope in and scope out;
- governing contracts and decisions;
- files or components likely to change;
- ordered implementation by invariant, not merely by file;
- observable acceptance criteria;
- validation commands;
- risks, unknowns and blocking questions.

Review visuals are optional. When they materially clarify the change, reference
only local PNG, JPEG or WebP files beneath the spec directory, with descriptive
alt text. Do not invoke an image provider or add a remote asset merely to fill
the section.

Keep the status `draft`. Open questions that affect acceptance criteria block
approval.

## 4. Render the owner surface

When a saved material spec is authorized, render a local change atlas unless
the owner requests text only:

```text
python3 <skill>/scripts/render_change_atlas.py SPEC --output OUTPUT.html
python3 <skill>/scripts/render_change_atlas.py SPEC --output OUTPUT.html --check
```

Use an explicit local or ignored output path. The atlas is generated and
advisory: it never replaces or updates the Markdown spec, and it has no accept
button or browser-to-repository write path. Present its source path and
fingerprint. Regenerate it after any source, template or review-image change.

The renderer accepts only its supported spec structure. It escapes prose,
embeds validated local raster images, performs no network access, and refuses
to overwrite a foreign file or an atlas bound to another source.

### companion pass

if the active agent router supplies a visual-companion skill, follow
[spec-companion.md](spec-companion.md) before presenting the saved material
spec. the companion explains a selected relationship or consequence beside
the atlas's complete review surface. it remains a separate local artifact;
do not embed active content in the static atlas or its review-image section.

## 5. Request the transition

Present the atlas (or its owner view when no saved artifact was authorized),
name decisions needed, and keep the complete spec reachable. The user or
designated owner may mark the exact canonical revision `accepted` or
`rejected`. Do not interpret enthusiasm, discussion, atlas viewing, or a
request for options as acceptance.

when a companion was built, link it alongside the atlas and canonical spec,
name the question it answers, and disclose its coverage and proof gaps. when
the companion pass was skipped or unavailable, give the concrete reason in
one sentence. the spec's status and owner authority are unchanged.
