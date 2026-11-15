# Verification and handoff

Proof must match the claim and risk floor.

## Select proof

- **Green:** focused rendering, link, syntax, snapshot, or content check plus
  diff inspection.
- **Amber:** focused regression test, relevant integration proof, repository
  required checks, and diff inspection.
- **Red audit:** evidence trace and explicit coverage gaps; no remediation.
- **Named red fix:** defect-specific regression proof, required suite, diff
  review, and independent release review still required.

Tests at one layer do not prove every representation. Trace material changes
through user-visible behavior, application state, persistence, external
projection, delivery, and operational documentation where applicable.

## Review the final state

1. Compare the request, stated scope, and actual diff.
2. Separate pre-existing failures from introduced regressions.
3. Name every check actually run and its observed result.
4. Mark skipped, unavailable, external, or owner-only proof as unverified.
5. Reconcile existing documentation only when its owned truth changed.
6. Never infer production state from repository files alone.

## Concise handoff

Use this shape and omit empty fields:

```text
Changed:
Risk floor:
Behavior/data path:
Verified:
Documentation/operations:
Unverified:
Next safe action:
```

Explain one consequential path in plain language. Do not narrate every command,
repeat the plan, or replace evidence with confidence language.
