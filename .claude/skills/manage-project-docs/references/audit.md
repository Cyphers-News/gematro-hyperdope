# Audit workflow

Use this read-only workflow to compare documentation with the live repository.
An audit reports and prioritizes drift; it does not silently fix it.

## 1. Establish scope and evidence

Inventory documentation by reading enough content to identify apparent purpose
and authority. Inspect the live worktree, not only the last commit, and record
whether uncommitted work may explain temporary drift.

Use the narrowest relevant evidence:

- executable code and registries;
- tests and fixtures;
- manifests and configuration examples, never secrets;
- migrations and generated schemas;
- external integration contracts or captured requests;
- current operational behavior;
- normative and historical documents.

Passing tests are evidence only for the claims they exercise.

## 2. Trace claims across representations

For each material claim, ask:

1. What user-visible behavior is promised?
2. What state is persisted?
3. What crosses an external boundary?
4. What identifiers or secrets can appear?
5. What lifecycle and failure states exist?
6. Which document owns the claim?
7. What proof demonstrates agreement?

Prioritize exactness, privacy, data-loss, compatibility and recovery claims.

## 3. Classify findings

- **Operational drift:** setup, paths, commands or examples are stale.
- **Authority drift:** current, historical, advisory and normative documents
  are not distinguishable or supersession is unclear.
- **Contract drift:** implementation violates or exceeds a normative promise.
- **Representational drift:** configuration, runtime, persistence, external
  projection or documentation give one fact different meanings.
- **Reference drift:** generated or enumerable facts are stale.
- **Continuity gap:** a cold reader cannot identify current state or reach a
  successful use.

Distinguish defects from documentation errors. Do not weaken a valuable
contract automatically when implementation falls short.

## 4. Report with evidence

For each finding include:

- severity and class;
- documented claim;
- live evidence and relevant path;
- consequence;
- likely owner of the truth;
- recommended reconciliation or proof.

End with cross-cutting causes, remediation order, and checks that could prevent
recurrence. Mark inference explicitly.
