# Transition seal

Use this protocol inside Close before representing a material authorized slice
as done, implemented, complete, shipped, verified, or ready for commit or
release. Trigger on the meaning of the claim, not the appearance of those words
in quoted text, tests, or documentation.

The risk gate governs what may proceed. The transition seal governs whether
what actually emerged may become current repository truth. Neither substitutes
for the other.

## Consume actual consequence

Begin with an actual-change receipt when the implementation workflow supplies
one. Otherwise reconstruct the same evidence from the accepted transition,
final diff, reviews, and proof:

1. the authorization source and accepted revision;
2. promised change shape beside realized change shape;
3. the risk floor after inspecting the complete diff;
4. every triggered adversarial gate, the exact source or diff revision it
   reviewed, and the reconciled disposition of its findings;
5. proof actually run, observed results, and unverified or owner-only gaps;
6. unmet criteria, altered obligations, and departures requiring owner
   authority; and
7. durability stated separately: uncommitted, committed, pushed, deployed,
   migrated, or otherwise externally projected.

The authorization source must have a durable repository-owned locator. An
accepted spec, decision, contract, or concise boundary in another tracked
authoritative document may provide it. Conversation or an unrecorded remote
issue can authorize the work in the current session but cannot alone prove a
cold agent's future scope. If no authorized repository representation preserves
what was allowed and what remains outside the transition, return `partial`; do
not reconstruct authority from the completed diff.

Preserve epistemic status. A finding remains confirmed, inferred, unresolved,
or demonstrated by counterexample until evidence changes it. Consume the
reconciled disposition, not a reviewer's raw allegation. Do not promote every
adversarial finding into memory, contracts, or decisions.

The gate receipt follows [risk-gates.md](risk-gates.md). Gate selection comes
from deterministic consequence signals and repository history, not from the
reviewer's willingness to review itself.

A missing required gate receipt, or one made stale by later changes to the
surface it reviewed, prevents `closed`. Refresh the affected review or name the
gap honestly.

## Compare and reconcile

Reclassify the realized transition even if the opening plan predicted a smaller
surface. Compare accepted obligations with behavior and diff, then reconcile
every repository representation owned by Close: code, proof, current status,
front door, contracts, decisions, accepted spec lifecycle, generated
companions, operational instructions, and declared cross-repository seams.

If the project declares an active continuity-memory projection, compare it only
after repository-owned truth is reconciled. Correct or explicitly invalidate a
stale projection when authorized. If that store requires separate authority,
record the exact unresolved mismatch; do not silently edit it and do not let it
overrule repository evidence.

## Return one close outcome

These are outcomes of a close attempt, not additional spec lifecycle states:

- **`closed`:** the realized state is reconciled; required gate receipts are
  current; proof supports the claimed transition; departures are authorized;
  and a cold agent can reconstruct what exists, what was proven, what changed
  from the accepted transition, and what remains unauthorized from repository
  state alone. Only this outcome supports retiring the accepted spec or making
  the material terminal claim.
- **`partial`:** a bounded subset is implemented or proven, but criteria,
  proof, receipts, reconciliation, or authorized scope remain open. Preserve an
  honest checkpoint and keep the accepted transition active.
- **`divergent`:** the realized behavior or change shape materially departs
  from the accepted transition. The implementation may work, but it cannot be
  promoted under the old covenant. Preserve evidence and return for owner
  revision, repair, or rollback.

Do not force `partial` or `divergent` into false completion. State the outcome,
the reason, and the next authorized transition.

## Leave only durable residue

Write only the repository documents already owned by Close. The actual-change
receipt and close report are normally transient inputs and conversation output;
do not create a seal ledger, `VERIFICATION.md`, or session memoir.
