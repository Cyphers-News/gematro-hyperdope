# Document model

Use the smallest document set that gives each kind of truth one clear owner.
Write for the repository owner and future agents returning without
conversational memory, not a public contributor, unless the project is
actually public. Locations may vary when a repository already has established
conventions; record the actual map in its README instead of forcing renames.

## Core documents

| Document | Owns | Update trigger |
|---|---|---|
| `README.md` | Owner's front door, maturity, shortest successful use, documentation map | Primary installation or use path changes |
| `AGENTS.md` | Agent authorization, required reading, scope rules, validation and close protocol | Collaboration policy changes |
| `STATUS.md` | Current checkpoint only (overwrite, not a history or session transcript) | A meaningful stopping point is reached |

These three documents form the minimum continuity surface for a maintained
project. Small scripts and disposable experiments may use a header comment
instead.

## Add documents when their truth exists

| Document | Add when | Owns |
|---|---|---|
| `PROJECT_BRIEF.md` | Direction or non-goals matter | Durable purpose, intended users, scope and non-goals |
| `CONTRACTS.md` | Interfaces, storage, privacy or compatibility promises must not drift casually | Normative invariants and their proofs |
| `docs/DEVELOPMENT.md` | Setup, configuration or recovery is non-trivial | Exact build, run, test, data and troubleshooting procedures |
| `docs/ARCHITECTURE.md` | Multiple components or boundaries need explanation | Implemented system shape and data flow |
| `DECISIONS.md` | Consequential choices should not be re-derived | Accepted rationale, consequences and supersession history |
| `specs/*.md` | A substantial slice needs approval and acceptance criteria | Proposed or accepted transition, never durable current truth |
| Generated change atlas | A saved material spec needs an owner-facing approval surface | Advisory projection of one exact canonical spec revision |
| Local visual companion | An authorized saved spec benefits from a supported visual explanation | Authored, bounded projection with explicit coverage and source fingerprints; no planning authority |
| `docs/INTEGRATIONS.md` | Use crosses repository, service or client boundaries | End-to-end setup and conformance expectations |
| Generated reference | Facts can be derived deterministically | CLI, API, schema or configuration inventory |

Do not create both `PLAN.md` and an active spec when they would own the same
transition. Prefer one explicit lifecycle: `draft -> accepted -> retired`, or `draft -> rejected`.
Do not add `VERIFICATION.md` or other close-memoir files; `STATUS.md` owns
the checkpoint and the conversational close report owns the session.

A change atlas owns no project truth. Keep its source path and fingerprint
visible, verify it against the renderer before presentation, and delete or
regenerate it when stale. Repository policy decides whether canonical specs are
tracked; generated atlases remain local unless deliberately promoted.

a visual companion stays separate from the static atlas. its source
fingerprints identify the revision it explains; the atlas freshness check
does not validate its authored model. recheck that model when its sources
change, following [spec-companion.md](spec-companion.md).

## Assign authority explicitly

Label governing documents and include an authority map in the README:

- **operational/current:** how the project works now;
- **normative:** behavior implementation must preserve;
- **historical:** what was intended or decided at an earlier time;
- **planning:** proposed or accepted future transition;
- **advisory:** useful guidance that does not override a contract;
- **generated:** derived from an executable source of truth.

When documents disagree, do not apply a universal filename-based precedence.
Determine which document owns the disputed fact, whether a later decision
explicitly superseded it, and what the executable evidence shows. Report an
unresolved authority conflict rather than silently choosing convenient prose.

## Distinguish representations of one fact

A material change may affect several representations:

```text
user-visible behavior
    -> application state
    -> persisted state
    -> external or provider projection
    -> delivery or export
    -> operational and normative documentation
```

Keep configured intent, effective behavior, external wire facts, reported
results, and reconstructed legacy facts separate. Tests passing at one layer
do not prove that all representations agree.

## Attach proof at the right layer

Use generic checks for structured claims such as files, links, statuses,
commands, generated inventories, and referenced paths. Use project-owned tests
for semantic claims such as:

- provider-visible request fields;
- privacy and secret-exclusion guarantees;
- lifecycle terminal states;
- storage migrations and schema invariants;
- cross-repository behavior;
- recovery and retry semantics.

Avoid brittle tests over whole paragraphs. Test structured facts and review
the surrounding prose for meaning.
