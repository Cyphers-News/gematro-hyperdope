---
name: maintain-codebase
description: Automatically guide safe, legible work in an existing repository. Use whenever the user asks the coding agent to add, fix, change, remove, refactor, audit, or understand functionality; when inheriting or resuming unfamiliar or heavily AI-generated code; or when a request may affect behavior, data, dependencies, security, deployment, or operations. Orient first, classify green/amber/red risk, choose a bounded operation, verify with project-owned proof, and explain evidence and uncertainty without requiring separate user prompts.
---

# Maintain Codebase

Treat code changes as changes to observable functionality, state, trust
boundaries, and operations—not as text generation.

## Preserve authority

- Read repository instructions before acting. Treat permission to write as
  distinct from a request to write.
- Treat a direct bounded change request as authorization for green or amber
  implementation within that scope.
- Keep baseline inventory, audit, explanation, and exploratory review read-only
  unless the user separately requests implementation.
- Never let a red audit turn into remediation in the same operation.
- Do not deploy, run live migrations, rotate credentials, move funds, or operate
  production systems through this skill.

## Enter one lifecycle

Read [references/lifecycle.md](references/lifecycle.md) for every material
repository task. It owns orientation, operation selection, implementation, and
close.

Then load only the route required:

| Need | Read |
|---|---|
| Determine risk and autonomy | [references/risk-routing.md](references/risk-routing.md) |
| Inventory an unfamiliar or accreted repository | [references/baseline.md](references/baseline.md) |
| Audit or fix security-sensitive work | [references/red-work.md](references/red-work.md) |
| Select proof and write the final handoff | [references/verification.md](references/verification.md) |

## Use deterministic signals correctly

When a diff exists, run the bundled `scripts/classify_change.py --repo .`
classifier if Python 3 is available. Resolve it from the active plugin root and
use the launcher available on the current platform: commonly `py -3` on native
Windows or `python3`/`python` elsewhere. Do not assume one launcher name exists
everywhere.

Treat its result as an advisory risk floor. It may reveal a reason to escalate.
It cannot certify safety, establish exploitability, or lower a contextual risk
classification.

## Communicate for a tired maintainer

At the start, report only the current behavior you found, the risk floor, the
bounded surface, and any real decision needed before proceeding.

At the end, report only:

- what changed;
- the consequential behavior or data path;
- proof actually run and its result;
- documentation or operational truth reconciled, if any;
- what remains unverified;
- the next safe action, if one exists.

Do not bury uncertainty in a long implementation narrative. Do not call work
secure, complete, or verified beyond the evidence collected.
