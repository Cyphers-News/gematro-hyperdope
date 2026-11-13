# {{project}} contracts

> **Continuity role:** normative invariants
> **Status:** current
> **Last verified:** {{YYYY-MM-DD}}
> **Owns:** confirmed promises implementation must not drift from casually
> **Update when:** an authorized decision changes an invariant or its proof

Changing a contract requires an explicit decision. A failing implementation is
not, by itself, authorization to weaken the contract.

## Sources of truth

| Fact | Owner | Proof or inventory |
|---|---|---|
| {{fact category}} | {{file, database, registry, service, or repository}} | {{test, generated artifact, or review}} |

## Invariants

| ID | Claim | Representation owner | Proof |
|---|---|---|---|
| `{{INV-001}}` | {{precise behavioral promise}} | {{code or schema seam}} | {{test or explicit review}} |

## Interfaces and boundaries

- {{allowed public interface}}
- {{forbidden bypass}}
- {{cross-repository ownership rule}}

## Data and schema

{{Canonical types, persisted shape, migration policy, compatibility promises,
and which generated inventory is current.}}

## Lifecycle and failure semantics

{{Legal states, terminal states, recovery behavior, retry rules, and how
unexpected failure is represented.}}

## Privacy and secrets

{{Identifier sources, secret sources, permitted boundaries, export promises,
and adversarial proof. Use "not applicable" only after conscious review.}}

## Configuration

{{Configuration sources, precedence, defaults, and the distinction between
configured intent, effective behavior, and external wire behavior.}}

## Required validation

```text
{{exact commands and any manual contract review}}
```

## Supersession

- {{decision or contract section}} supersedes {{older claim}}, because {{reason}}.

## Intentionally unspecified

- {{fact implementation may choose without changing a contract}}
