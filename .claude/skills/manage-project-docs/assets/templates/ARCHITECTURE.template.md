# {{project}} architecture

> **Continuity role:** implemented system model
> **Status:** current
> **Last verified:** {{YYYY-MM-DD}}
> **Owns:** components, boundaries, data flow, and important seams that exist now
> **Update when:** structural implementation changes

## System context

{{What is inside this repository, what is outside, and who calls whom?}}

```text
{{small component or data-flow diagram}}
```

## Components

| Component | Path | Responsibility | Public seam |
|---|---|---|---|
| {{name}} | {{path}} | {{owned behavior}} | {{interface}} |

## Data flow

1. {{input or event}}
2. {{transformation and state change}}
3. {{external projection, output, or delivery}}

## Persistence

{{Stores, schema ownership, migrations, identity, retention, and recovery.}}

## External boundaries

{{Integrations, provider or client projections, timeouts, retries, and which
repository owns composed behavior.}}

## Important invariants

- {{Short invariant with link to CONTRACTS.md for normative wording.}}

## Known structural pressure

- {{Current limitation or likely seam, without presenting aspiration as implemented fact.}}
