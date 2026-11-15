# Red work

Red identifies work requiring constrained autonomy. It does not by itself claim
a vulnerability or assign severity.

## Authorized defensive audit

For an audit request:

1. Confirm the repository or system is within the user's authorized scope.
2. Keep the operation read-only and local unless the user explicitly authorizes
   a safe external check.
3. Do not read or print secret values; report credential type and location with
   values redacted.
4. Map trust boundaries, enforcement points, privileged actions, and lifecycle
   states.
5. Trace untrusted sources to sensitive sinks and client requests to server-side
   authorization.
6. Report exact evidence, prerequisites, impact, confidence, existing controls,
   remediation direction, and a future regression test.
7. Distinguish CONFIRMED, LIKELY, and UNVERIFIED.
8. Stop after the report. Do not opportunistically patch findings.

Do not probe production, operate accounts, exploit other users, or execute
untrusted artifacts. A clean static review does not establish deployed state.

## Named red fix

Begin a separate operation from a named finding or clearly bounded defect:

1. Re-verify the finding against current code and challenge its assumptions.
2. Establish the expected security or authorization invariant.
3. Add a focused regression proof that fails for the defect when practical.
4. Implement the smallest complete fix; do not bundle adjacent cleanup.
5. Re-run focused and required project proof.
6. Inspect the final diff for new sinks, widened grants, fallback paths, and
   migration/recovery consequences.
7. Require independent human or agent review before release. The implementer’s
   self-review is evidence, not independence.

Do not run live migrations, revoke credentials, deploy, move funds, or perform
incident containment. Produce exact human-operated steps and stop at the
authorization boundary.

## Incident context

When compromise is suspected, prioritize a confirmed timeline, credential and
host boundaries, evidence preservation, and human-owned containment. Do not let
a repository patch substitute for incident response.
