# {{project}} integrations

> **Continuity role:** cross-boundary operational procedure
> **Status:** current
> **Last verified:** {{YYYY-MM-DD}}
> **Owns:** end-to-end setup, verification, and ownership at external boundaries
> **Update when:** client, service, configuration, transport, or conformance changes

## Integration map

| Integration | Purpose | Local owner | External owner | Verification |
|---|---|---|---|---|
| {{name}} | {{purpose}} | {{path or component}} | {{service, client, or repository}} | {{smoke or conformance test}} |

## {{integration name}}

### Prerequisites

- {{required installation, account, runtime, or data}}

### Configure

```text
{{exact configuration with placeholders, never real secrets}}
```

Configuration belongs in: {{exact client and file/location}}.

### Launch

```text
{{server and client commands or actions}}
```

### Verify end to end

```text
{{request or interaction}}
```

Expected result:

```text
{{observable response and relevant logs/state}}
```

### Ownership and failure boundaries

- Local repository guarantees: {{facts}}
- External system guarantees: {{facts}}
- Composed behavior proved by: {{test or manual procedure}}
- Recovery: {{safe diagnostic and retry procedure}}
