# {{project}} development and operations

> **Continuity role:** operational procedure
> **Status:** current
> **Last verified:** {{YYYY-MM-DD}}
> **Owns:** exact setup, run, test, configuration, data, and recovery procedures
> **Update when:** any procedure or required environment changes

## Prerequisites

- {{runtime and version}}
- {{external tool or service}}

## Setup

```text
{{exact commands from a clean checkout}}
```

## Run

```text
{{canonical launch command}}
```

Expected success:

```text
{{observable result}}
```

## Test and validate

Focused:

```text
{{smallest useful command}}
```

Complete:

```text
{{full required validation}}
```

## Configuration and precedence

| Source | Location | Owns | Precedence |
|---|---|---|---|
| {{source}} | {{path or service}} | {{facts}} | {{order}} |

Never include real secret values in this document.

## Persistent data

- Location: {{path or service}}
- Backup: {{procedure}}
- Reset: {{procedure and destructive warning}}
- Migrations: {{location and command}}

## Troubleshooting and recovery

### {{symptom}}

- Diagnose: {{safe check}}
- Cause: {{known cause or possibilities}}
- Recover: {{procedure and side effects}}
