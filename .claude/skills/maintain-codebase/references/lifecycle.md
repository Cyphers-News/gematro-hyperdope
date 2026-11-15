# Maintenance lifecycle

Use this lifecycle for any material repository task. Do not require the user to
invoke each stage separately.

## 1. Orient

1. Locate the repository root.
2. Read `CLAUDE.md`, `AGENTS.md`, and their required documents where present.
3. Inspect version-control status without changing it.
4. Identify executable entry points, affected behavior, relevant tests, data
   stores, external boundaries, and documented validation commands.
5. Distinguish observed state from documentation claims and model inference.
6. Preserve unrelated user changes in a dirty worktree.

Do not bootstrap documentation merely because preferred files are absent.
Report missing continuity or proof surfaces only when they affect the task.

## 2. Select the operation

- **Baseline:** understand an unfamiliar or accreted codebase. Remain read-only
  and use `baseline.md`.
- **Change:** add, fix, alter, refactor, or retire bounded functionality.
- **Red audit:** inspect security-sensitive behavior. Remain read-only and use
  `red-work.md`.
- **Named red fix:** re-verify one previously reported finding, then implement
  the smallest complete fix with focused proof.

If the request combines operations, keep their terminal conditions separate.
An audit report is not implementation authorization.

## 3. Classify risk before editing

Read `risk-routing.md`. Classify from behavior and trust boundaries, not file
extension alone. State the floor and the evidence that produced it.

- Green work may proceed directly with focused proof.
- Amber work requires an explicit bounded surface and rollback shape; the
  user's direct change request normally supplies authorization.
- Red work follows `red-work.md` and may require a separate operation,
  reviewer, or live-system owner.

## 4. Shape and implement

1. Trace the current behavior before selecting a fix.
2. Name the smallest coherent change and what remains outside it.
3. Prefer existing public seams over new parallel paths.
4. Add or update proof at the layer that owns the claim.
5. Avoid unrelated cleanup, speculative abstraction, and large generated
   rewrites.
6. Reclassify if the actual diff crosses a new trust or lifecycle boundary.

Stop for a material product choice, missing authority, destructive operation,
or red-risk transition not already authorized.

## 5. Verify and reconcile

Read `verification.md`. Compare the final diff with the request, run focused
proof and the repository's required checks, and inspect the diff directly.

Update existing operational or normative documentation only when its owned
truth changed. Do not create a work log. If no durable claim changed, say that
documentation was checked and did not require modification.

## 6. Close visibly

Produce the concise handoff from `verification.md`. A cold maintainer should be
able to identify what changed, what proves it, and what remains unsafe or
unknown without reading the complete transcript.
