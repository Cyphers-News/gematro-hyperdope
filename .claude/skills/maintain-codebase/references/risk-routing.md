# Risk routing

Assign the highest justified floor. File type is evidence, not the decision.

## Green

Typical shapes:

- wording, inert documentation, comments, and static assets;
- isolated presentation changes with no behavior, data, accessibility, or
  interaction consequence;
- mechanical test-fixture corrections whose expected behavior is established.

Green may proceed directly. Run focused proof and inspect the diff. Escalate if
the change affects focus, navigation, responsive interaction, generated output,
configuration, or any runtime path.

## Amber

Typical shapes:

- ordinary application behavior and UI state;
- parsing, storage, import/export, caching, concurrency, or recovery;
- dependencies, build configuration, public interfaces, and compatibility;
- refactors whose goal is to preserve behavior;
- user-visible feature addition or retirement without a red boundary.

Before editing, name the current behavior, affected representations, rollback
shape, and proof. A direct bounded change request normally authorizes the work.

## Red

Treat any of these as red unless evidence establishes a stricter existing
procedure:

- authentication, authorization, roles, access control, sessions, or identity;
- secrets, credentials, tokens, privileged keys, or environment handling;
- untrusted content entering executable, HTML, URL, CSS, shell, SQL, or template
  contexts;
- dynamic code execution, deserialization, uploads, plugins, or imported files;
- database grants, row policies, privileged functions, schema migrations, or
  destructive persistence;
- admin, moderation, impersonation, account deletion, or privacy boundaries;
- deployment, infrastructure, production data, incident response, or recovery;
- payments, wallets, cryptocurrency, signing, or money-bearing systems.

Red is a workflow constraint, not a vulnerability severity. Read `red-work.md`.

## Deterministic classifier

The classifier reports path and diff signals. Apply these rules:

1. Raise the floor to at least the classifier result.
2. Never lower a contextual classification because no pattern matched.
3. Inspect every matched path and trace actual behavior before making a finding.
4. Report limitations: untracked files, generated code, deployed configuration,
   and external state may be absent.
5. Do not turn words such as `eval`, `innerHTML`, `auth`, or `security definer`
   into findings without a source-to-sink or authorization path.
