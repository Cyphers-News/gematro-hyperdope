# Close workflow

Use this workflow during an authorized implementation task before declaring a
material slice complete. Closing reconciles the project; it does not broaden
the approved scope. Read [transition-seal.md](transition-seal.md) and return its
`closed`, `partial`, or `divergent` outcome before making a material terminal
claim.

## 1. Revisit the accepted transition

Read the accepted spec and its change-shape matrix when one exists; otherwise
reopen the exact bounded authorization. Consume an actual-change receipt when
the implementation workflow supplies one; otherwise reconstruct the same
evidence from the final diff, proof, and reviews. Compare promised and realized
change shape, then reclassify risk from the complete diff. Surface undeclared
dimensions rather than quietly adding work.

For a direct change with no accepted spec, identify a durable repository-owned
authorization locator: a decision, contract, accepted spec, or concise boundary
in another tracked authoritative document. Conversation or an unrecorded remote
issue may authorize the work, but cannot by itself support cold reconstruction
after the session. If no authorized repository document preserves what was
allowed and what remains outside the transition, the close outcome cannot be
`closed`.

Inventory every risk-triggered gate. Confirm that each receipt names the source
or diff revision reviewed and still covers the final surface. Reconcile findings
against evidence while preserving whether each is confirmed, inferred,
unresolved, or demonstrated by counterexample.

Use [risk-gates.md](risk-gates.md) to reclassify the realized diff. A boundary
crossed after the opening route may trigger a fresh diff adversary; a review
model's self-routing cannot waive that requirement.

## 2. Reconcile by invariant

For every changed fact, inspect the affected representations:

1. user-visible behavior;
2. application and persisted state;
3. external projection or delivery;
4. privacy and identifiers;
5. lifecycle and recovery;
6. operational documentation;
7. normative contracts and decisions;
8. generated reference.

Update code, proof, and authorized documentation together where applicable.
If implementation contradicts a normative contract, stop for a decision.

## 3. Run proof

Run focused proofs during implementation, then the repository's complete
required validation. Run the generic document checker and any project-specific
conformance, migration, lifecycle, privacy or integration tests named by the
matrix.

Search changed governing prose for strong claims such as `exact`, `always`,
`never`, `current`, `future`, and `canonical`. Verify the intended meaning, not
only the presence of matching strings.

Determine the transition-seal outcome after proof and reconciliation. Missing
or stale required gate receipts prevent `closed`. Material departures from the
accepted transition return `divergent`; bounded unfinished obligations return
`partial`.

## 4. Persist the new checkpoint

Write the current snapshot. Do not file the session.

| If this changed | Write this | Shape |
|---|---|---|
| Verified state, gaps, next action | Overwrite `STATUS.md` | Template sections only. Commands + one result string (`2 tests OK`). Unproven items as one-line bullets. |
| Successful-use path | `README.md` | Owner's shortest use. Link to contracts; do not copy them. |
| A new don't-drift invariant | `CONTRACTS.md` | One claim and its proof. Do not transcribe spec Out: into a new invariant unless the owner asked. |
| A newly non-trivial procedure | `docs/DEVELOPMENT.md` | How to run it, not how this slice went. |
| A choice a later agent would re-derive that the spec does not already record | `DECISIONS.md` | One decision. Spec Out: is already the record of rejected work. |
| Slice acceptance criteria met and seal outcome is `closed` | `specs/*.md` | `status: retired` |

Do not add documents outside the model in [document-model.md](document-model.md). There is no `VERIFICATION.md`. Reusable operator procedures belong in Promote, not in the project.

Bulky proof (browser profiles, published runtimes, driver binaries): keep the result string in STATUS. Delete the rest unless STATUS names a file that must remain.

## 5. Report honestly, in the conversation

The close report is the message to the owner, not a repository file. List
the seal outcome, validation results, documents changed, departures, unproven
items, durability, and the next transition. Suite transcripts belong here if
they belong anywhere. Do not describe normalized or reconstructed facts as
exact. A `partial` or `divergent` outcome is a useful close result, not
permission to say the material slice is complete.
