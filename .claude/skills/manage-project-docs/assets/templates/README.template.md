# {{project}}

> **Continuity role:** operational front door
> **Status:** {{current | experimental | maintenance | archived}}
> **Last verified:** {{YYYY-MM-DD}}
> **Owns:** the shortest successful use and the map to deeper documentation
> **Update when:** installation, primary use, maturity, or document authority changes

{{One paragraph explaining what the project currently does. Write for the
owner and future agents, not a public audience unless the project is public.}}

## Current state

{{What is usable now? What maturity or stability should a returning reader
expect? Link STATUS.md for volatile detail.}}

## Quickest successful use

Prerequisites:

- {{runtime, account, service, or platform requirement}}

From a cold start, in order:

```text
{{step 1: setup or install}}
{{step 2: anything that must be configured or running first}}
{{step 3: the launch or first-use command}}
```

Expected evidence of success:

```text
{{observable result}}
```

## Common use

```text
{{one representative invocation or interaction}}
```

## Configuration and data

- Configuration: {{location and precedence}}
- Secrets: {{source; never include secret values}}
- Persistent data: {{location and backup/reset warning}}
- External integrations: {{link or none}}

## Documentation authority

| Document | Role | Status | Owns |
|---|---|---|---|
| `README.md` | operational | current | front door and shortest successful use |
| `STATUS.md` | operational | current | verified checkpoint and next useful action |
| `AGENTS.md` | behavioral | current | agent authorization and completion protocol |
| {{document}} | {{normative / historical / planning / advisory / generated}} | {{status}} | {{facts owned}} |

## Known limitations

- {{limitation or link to STATUS.md}}
