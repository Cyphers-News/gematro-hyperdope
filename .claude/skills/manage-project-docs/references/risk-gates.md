# Risk-triggered adversarial gates

Use this boundary protocol before any authorized implementation, whether the
authority is an accepted spec or a direct bounded request. Plan records the
anticipated route when it shapes a material transition; Close reclassifies the
realized diff. This is not a seventh continuity operation and it does not make
adversarial review mandatory for every slice.

The default for a small, isolated change is ordinary verification. Choose a
gate from observable consequence and repository history, not from a review
model's opinion about whether review is necessary. Model routing may inform a
human or implementing agent, but it cannot lower the risk floor or waive a
deterministic trigger.

## Route by anticipated consequence

Require semantic preflight before editing when the authorized slice materially
touches one or more of these surfaces:

- shared state, persistence, migration, recovery, identity, authentication, or
  privacy boundaries;
- generated interfaces, public contracts, compatibility seams, or state with
  several readers and writers;
- identifiers whose names have historically concealed their operational
  meaning;
- ownership or lifecycle semantics that cannot be reconstructed confidently
  from the accepted transition and current evidence; or
- a repository-specific trigger recorded by contract, decision, or prior
  demonstrated counterexample.

Require a fresh diff adversary after implementation when the realized change
is broad or high-consequence, crosses a boundary not declared in the accepted
change shape, leaves a material preflight ambiguity unresolved, or changes the
surface reviewed by an earlier receipt. Ordinary verification remains enough
when none of these conditions applies.

The opening route is a risk floor, not a permanent classification. Reclassify
from the complete diff before close.

## Run semantic preflight before editing

Use an independently scoped, read-only reviewer. Give it the goal, accepted
behavior or visual contract, repository evidence, and declared change shape.
Do not give it the implementer's comforting narrative about why a proposed
solution is safe. The implementing agent remains the only writer.

Ask the reviewer to:

1. reconstruct the operational meaning of every touched state variable,
   class, storage key, function, and public identifier from its readers and
   writers;
2. identify names whose apparent meaning differs from actual behavior;
3. enumerate invariants, hidden consumers, restore paths, and compatibility
   seams;
4. separate a `do not disturb` list from facts that must be proved before
   changing; and
5. propose counterexample tests without editing files.

The receipt must name the reviewed source revision or evidence fingerprint,
the accepted goal, the surfaces inspected, findings with epistemic status,
and any proof or ambiguity still outstanding.

## Run the diff adversary before commit

Use a fresh read-only reviewer and assume the implementation is wrong. Supply
the accepted transition, complete diff, relevant call sites, and proof output;
do not supply the implementation narrative as a conclusion.

Ask it to attack the realized state transitions, persistence and restoration,
filters and navigation, generated output, responsive and keyboard behavior,
caches, compatibility consumers, privacy boundaries, and any project-specific
seams identified during preflight. It must distinguish:

- stop-ship counterexamples or contract violations;
- unresolved ambiguities requiring owner or implementation decisions; and
- claims that ordinary tests, rendering, or browser verification can settle.

After repairs, refresh the review when the changed surface makes the receipt
stale.

## Preserve epistemic status

Classify each finding as one of:

- **confirmed contract:** repository authority or executable proof establishes
  the obligation;
- **inferred dependency:** evidence supports a dependency that remains
  incompletely proved;
- **unresolved ambiguity:** available evidence cannot select one meaning or
  consequence; or
- **demonstrated counterexample:** an executable or traceable example disproves
  the relevant safety claim.

Reconcile findings against evidence and the eventual implementation outcome.
Do not automatically promote a reviewer's allegation into contracts,
decisions, status, or continuity memory. Close consumes the reconciled receipt,
not the raw review.
