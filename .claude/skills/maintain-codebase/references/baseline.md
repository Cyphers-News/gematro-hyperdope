# Baseline inventory

Use for an unfamiliar, heavily accreted, or AI-generated repository. This is a
read-only operation unless the user separately authorizes a change.

## Build the inventory

Identify substantial user-visible features and supporting subsystems. For each,
record only:

- purpose and current entry point;
- primary implementation and data owner;
- evidence that it is used or reachable;
- available proof and known breakage;
- trust or operational boundary;
- proposed disposition and confidence.

Avoid equating files with features. One feature may cross UI, state, storage,
external services, and documentation.

## Assign one disposition

- **KEEP:** active, useful, sufficiently understood, and supported by evidence.
- **KEEP DORMANT:** still sound and intentionally retained but not currently in
  ordinary use.
- **REPAIR:** intended functionality is buggy, insecure, drifted, or contradicted
  by its governing contract.
- **REFACTOR:** useful behavior works, but structure materially obstructs safe
  change, testing, or comprehension.
- **RETIRE:** functionality no longer earns its maintenance cost, complexity, or
  attack surface.

Do not use REFACTOR as a softer label for a security defect. Restore violated
behavior or safety under REPAIR; refactor only when structure is the actual
problem.

Reachable dormant code remains attack surface. If a supposedly unused route,
RPC, import path, admin action, or integration can still be invoked, classify
its exposure separately and consider RETIRE or REPAIR.

## Report

Return:

1. the system and trust-boundary map;
2. a compact feature/disposition table;
3. blockers ordered by consequence and confidence;
4. a small queue of independently verifiable next slices;
5. unknowns that require owner or runtime evidence.

Do not turn the baseline into a mass rewrite plan. A disposition is a proposal
until the owner authorizes the corresponding transition.
