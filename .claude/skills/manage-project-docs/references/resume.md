# Resume workflow

Use this read-only workflow when a user returns after lost context, feels
overwhelmed by a repository, or asks what currently works and what to do next.
Its goal is orientation and one verified success, not cleanup.

## 1. Find the front door

Read repository instructions, then locate:

- the README or other claimed starting point;
- current status or handoff notes;
- the active accepted spec, if any;
- development, operations and integration setup;
- decision or architecture documents only as needed to explain the live path.

If no authority map exists, infer a tentative map from contents and label it as
an audit finding rather than silently treating filenames as authoritative.

## 2. Reconstruct current state

Answer with evidence:

1. What does the project currently do?
2. What is its maturity and known-good path?
3. How is it started and used?
4. What configuration and external integration are required?
5. Where does persistent state live?
6. What is incomplete, broken or misleading?
7. What work was active at the last checkpoint?
8. Which continuity documents exist, and which are missing or stale?

Distinguish current implementation from historical plans and unaccepted specs.
Treat an absent front door, status, agent instructions, or version control as a
finding in its own right — a returning user cannot see what is not there, so
the brief must say it.

## 3. Attempt one smoke path

Run a safe documented smoke test when the request and environment permit it.
Do not install dependencies, alter persistent data, contact production systems,
or repair failures without authorization.

If the path fails, capture the earliest failing boundary and continue with
read-only diagnosis. The failure itself is re-entry evidence.

## 4. Return a compact re-entry brief

Report:

- project purpose and current maturity;
- known-good entry point and result;
- a "running it again" section: the exact verified commands to start and use
  the project, including any setup the user will have forgotten — environment
  variables, credentials locations, external services or servers that must be
  running first, and the order to bring them up;
- configuration, data and integration locations;
- active or last accepted work;
- documentation coverage: which continuity documents exist and which are
  missing, so gaps are visible rather than silently tolerated;
- contradictions or missing instructions;
- the smallest sensible next action.

Write for fast scanning: terse and technical beats narrative. Prefer a table
for file-and-role maps and short imperative lines for commands. The reader is
a capable developer who has merely forgotten the specifics; give them back the
specifics, not an essay.

Do not rewrite documentation during a resume unless the user separately
authorizes that change.
