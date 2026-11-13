# Bootstrap workflow

Use this workflow for a new repository or an authorized retrofit. Do not use it
to overwrite an established documentation system merely because its filenames
differ from the bundled templates.

## 1. Classify the project

Determine whether the repository is:

- disposable scratch work;
- a maintained single-purpose tool;
- a multi-component system with durable boundaries;
- a fork or vendored source governed upstream.

Start with `README.md`, `AGENTS.md`, and `STATUS.md` for maintained projects.
Use the conditional documents in `document-model.md` only when their truth
exists.

## 2. Discover before drafting

For an existing repository, inspect:

- current documentation and instruction files;
- package manifests and executable entry points;
- configuration examples without reading secrets;
- migrations or schema owners;
- test, lint, type-check and build configuration;
- integration boundaries and persisted-data locations;
- recent version-control history when it clarifies current intent.

Prefer targeted reads. Do not infer a contract from an implementation detail
unless the user confirms that it is intentional.

## 3. Interview unresolved intent

Ask only questions that materially change the document set or project
contract. Establish:

- the project purpose and consumer;
- the shortest successful use;
- non-goals;
- sources of truth;
- interfaces or data that must not break;
- exact validation commands;
- unresolved decisions;
- boundaries on agent authorization.

Mark unconfirmed findings with a temporary verification marker during drafting.
Resolve or remove every marker before calling the bootstrap complete.

## 4. Create documents in dependency order

1. Write the brief when durable intent needs its own owner.
2. Write contracts only from confirmed decisions and observable guarantees.
3. Write development or integration procedures and execute the happy path.
4. Write status from the verified result.
5. Write agent guidance last so its required-reading and validation map points
   to documents that actually exist.
6. Make the README the canonical front door and authority map.

Use templates from `../assets/templates/` as scaffolds, not as mandatory prose.
Remove irrelevant sections instead of filling them vaguely.

Make the front door answer "how do I get this going from nothing" as an
ordered sequence: environment, setup or install, anything that must be
configured or running first, then first use — each step an exact command with
its expected result. A single proof-of-life one-liner shows the project works;
it does not restart a user who has forgotten the way in.

Carry experiential context into the documents, not only structure. The
quirks, failure modes, and surprising behaviors observed while verifying —
the command that fails without an environment variable, the input that is
silently truncated, the setup step that must happen first — are the
highest-value content for a cold reader, precisely because they are what a
returning owner will have forgotten. A doc set with perfect sections and no
lived detail orients no one.

## 5. Prove re-entry

Follow the README from a cold start far enough to reach one observable success.
Record:

- commands executed;
- configuration required;
- where state was created;
- expected success evidence;
- any undocumented recovery needed.

Run the generic checker and the repository's native validation. Report anything
that remains inferred, unverified, or intentionally absent.
