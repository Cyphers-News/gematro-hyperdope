# {{project}} agent guide

This file governs AI coding agents working in this repository. Read it before
acting.

## Required reading

1. `README.md` for the operational front door and authority map.
2. `STATUS.md` for the last verified checkpoint.
3. `CONTRACTS.md` when present, before changing behavior or persisted state.
4. The active spec in `specs/` when one exists.
5. `PROJECT_BRIEF.md` for generative or scope-changing work.

If documents disagree, identify which one owns the disputed fact. Do not infer
authority from the filename alone. Surface unresolved conflicts before editing.

## Authorization

- Discussion, brainstorming, critique, planning, resume, and audit requests are
  read-only unless the user explicitly requests changes.
- A direct bounded change request authorizes that change.
- New-project, substantial-feature, ambiguous, or cross-cutting implementation
  requires an explicitly accepted spec.
- Agents may draft specs. Only the user or designated owner may mark them
  accepted.
- Never change a normative contract merely to make implementation agree.

## Project boundaries

- {{source of truth or boundary}}
- {{interface that must not be bypassed}}
- Dependencies require approval before addition.
- Preserve established domain language unless asked to change it.

## Common commands

```text
{{setup command}}
{{small focused validation command}}
{{complete validation commands}}
```

## Working protocol

Before changing files:

1. Read the governing documents for the task.
2. Inspect version-control status.
3. State the authorized slice and likely proof.

During implementation:

1. Work by invariant rather than accumulating unrelated file changes.
2. Run focused proof after each meaningful chunk.
3. Surface contract conflicts, undeclared scope, and uncertain facts promptly.

Before completion:

1. Revisit the accepted spec's change-shape matrix when applicable.
2. Reconcile code, persisted state, external behavior, tests, and affected docs.
3. Update `STATUS.md` at a meaningful new checkpoint.
4. Record consequential decisions; do not manufacture retrospective rationale.
5. Run complete project validation and the documentation checker.
6. Report unresolved unknowns and the next authorized transition.

## Stop and ask

- A normative contract must change.
- Persisted data or a public interface changes outside an accepted spec.
- The task has multiple materially different interpretations.
- Verification would require destructive, external, privileged, or costly action.
- The requested change exceeds the authorized slice.
