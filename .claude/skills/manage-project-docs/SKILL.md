---
name: manage-project-docs
description: Maintain repository documentation as a continuity protocol tied to code, tests, contracts, and operational truth. Use whenever the user wants to bootstrap or retrofit project docs, resume or re-orient in a dormant or unfamiliar repository, draft an implementation spec, reconcile documentation before closing a material change, audit documentation against the live codebase, or turn a recurring failure into a reusable check — including when they phrase it casually, such as "update the docs", "what's the state of this repo", "is the README still accurate", "write up where we left off", or "I'm back after months away". If the task touches README, STATUS, CLAUDE.md, AGENTS.md, specs, or documentation drift, reach for this skill.
---

# Manage Project Docs

Treat documentation as durable project state, workflows as state transitions,
and executable checks as invariant proofs. Optimize for the repository owner
and future agents returning without conversational memory, not a public
audience unless the project is public.

## Preserve authorization

- Read and obey the repository's existing agent instructions first — CLAUDE.md,
  AGENTS.md, and anything they name as required reading.
- Treat discussion, exploration, critique, resume, and audit requests as
  read-only unless the user explicitly requests changes. This holds regardless
  of the session's permission mode: permission to write is not a request to
  write.
- Treat a direct bounded change request as implementation authorization for
  that change.
- Require an explicitly accepted spec before starting a new project or a
  substantial, ambiguous, or cross-cutting feature.
- Never promote a draft spec to accepted on the user's behalf. Plan-mode
  approval is not spec acceptance: approving a plan authorizes executing that
  plan in this session, while an accepted spec is a durable repository artifact
  the owner marks accepted in the file itself. Keep the two distinct.
- Never change a normative contract merely to make implementation and prose
  agree. Surface the conflict and request a decision.

## Select one operation

| User need | Operation | Read |
|---|---|---|
| Start or retrofit a documentation system | Bootstrap | [references/bootstrap.md](references/bootstrap.md) |
| Return after lost context or prove the happy path | Resume | [references/resume.md](references/resume.md) |
| Shape a material implementation slice | Plan | [references/plan.md](references/plan.md) |
| Reconcile a completed implementation slice | Close | [references/close.md](references/close.md) |
| Compare documentation claims with live evidence | Audit | [references/audit.md](references/audit.md) |
| Turn a recurring failure into a reusable guardrail | Promote | [references/promote.md](references/promote.md) |

Read [references/document-model.md](references/document-model.md) when choosing
documents, assigning authority, resolving apparent contradictions, or deciding
which bundled templates to use. Do not load every workflow reference by
default.

## Route risk-triggered opposition

Before any authorized implementation, including a direct bounded change,
evaluate anticipated consequence. Read
[references/risk-gates.md](references/risk-gates.md) before editing if shared
state, persistence, migrations, authentication, generated interfaces,
historically misunderstood identifiers, or another declared high-consequence
seam is in scope. Plan records the anticipated route and Close reclassifies the
realized diff. Ordinary verification remains the default for small isolated
changes. The risk trigger is deterministic project judgment; do not delegate
it to the review model.

## Seal material terminal claims

Before representing an authorized material implementation as done,
implemented, complete, shipped, verified, or ready for commit or release, read
[references/close.md](references/close.md) and
[references/transition-seal.md](references/transition-seal.md). Trigger on the
semantic claim, not a raw keyword occurrence. Consume an actual-change receipt
when one exists; otherwise reconstruct its evidence. Return `closed`, `partial`,
or `divergent`. Only `closed` supports the terminal claim or spec retirement.

## Run the common preflight

1. Locate the repository root and read its instruction files (CLAUDE.md,
   AGENTS.md, and their required reading).
2. Inspect version-control status without changing it.
3. Inventory documentation by content and apparent purpose; do not infer a
   document's authority from its filename.
4. Identify the requested operation and whether it authorizes writes.
5. Separate confirmed facts from proposals and unresolved questions.
6. State the intended reads or changes before broad exploration.

## Use the harness deliberately

- The Plan operation pairs naturally with plan mode: drafting a spec is
  read-only work, and plan mode makes that boundary structural. Exiting plan
  mode still does not accept the spec.
- For a broad Audit or Resume in a large repository, fan out read-only
  subagents to gather evidence in parallel, then reconcile their findings
  yourself. Subagents report; the operation's judgment stays in one place.
- The Promote operation has Claude Code-native targets: a local fact can
  become a CLAUDE.md instruction, and a structured invariant can become a
  hook or a check wired into the repository's validation. Choose the smallest
  mechanism that catches the failure.
- Where CLAUDE.md and AGENTS.md coexist, treat them as one instruction surface
  and reconcile them together when collaboration policy changes; do not update
  one and leave the other contradicting it.

## Use the bundled resources

- Copy from `assets/templates/` only during an authorized bootstrap or
  documentation change. Resolve every template marker; never overwrite an
  existing document blindly.
- Run `scripts/check_docset.py REPO` to check the universal core: required
  front-door documents, unresolved placeholders, local Markdown links, spec
  statuses, status freshness, and close-residue warnings. Use `--help` for
  optional requirements and strong-claim review.
- Keep project-specific semantic proofs in the project itself. A generic
  checker cannot prove wire behavior, privacy guarantees, state transitions,
  schemas, or cross-repository conformance.

## Maintain the continuity boundary

Keep these categories distinct:

- durable intent;
- current operational truth;
- normative invariants;
- historical decisions;
- proposed or accepted work;
- generated reference material.

When one fact appears in multiple categories or system layers, identify every
representation affected by a change and reconcile them together. Prefer an
honest `unknown`, `historical`, or `proposed` label over invented precision.

## Finish visibly

Report:

- the operation performed;
- documents or claims inspected or changed;
- executable checks run and their results;
- unresolved contradictions, unknowns, or stale claims;
- the next authorized transition, if one exists.

Do not call the repository continuous merely because documents exist. Confirm
that the owner can find the current state, reach one successful use, and
identify what may happen next without reading a defense of the last session.
