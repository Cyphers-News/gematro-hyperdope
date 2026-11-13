# Promote workflow

Use this workflow after a failure, audit finding, or repeated manual recovery
reveals a reusable lesson.

## 1. Classify the lesson

Ask where the correction belongs:

- **local fact:** update one repository's instructions, tests or status;
- **reusable policy:** update the shared workflow or template;
- **operator procedure that will recur across repositories:** promote here;
  do not paste a "reusable workflow" section into a project README;
- **structured invariant:** add a deterministic generic check;
- **semantic invariant:** add a project-owned test or conformance harness;
- **judgment call:** add a review question rather than a brittle test.

Do not treat every project-specific preference as universal policy.

## 2. Preserve upstream and downstream ownership

Shared templates are upstream. Filled project documents become locally
authoritative and may diverge intentionally. Propose upstream improvements,
then audit downstream projects for applicability; never overwrite local files
automatically.

If versions are tracked, use them to report newly available rules or checks,
not to claim that older project documents are invalid.

## 3. Capture the smallest reusable guardrail

Record:

- the observed failure shape;
- the transition where it should have been caught;
- the smallest workflow question, template field or executable check that
  would catch it;
- cases where the guardrail should not apply;
- a sanitized fixture or example when useful.

Validate the promoted guardrail against both the originating case and at least
one different repository shape before treating it as general.
