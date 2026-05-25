# /sp.flow

Use this command when the user wants to define or refresh the business flow documents for the active feature.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.

## Purpose

- Lock stage order, branching, exception handling, and state progression.

## Read First

- Read `specs/<feature>/memory/index.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, and rule lists that affect the target flow.

## Do

- Define the business mainline stages and actor boundaries.
- Capture state progression, branches, exceptions, defaults, and overrides.
- Keep Mermaid flow assets and supporting Markdown in sync.
- Use stable IDs for states, actions, decisions, and exceptions when practical.
- Refresh trace and memory files when flow changes alter stable facts or routing.

## Do Not

- Do not drift into UI screen design.
- Do not write delivery-layer implementation details.
- Do not leave missing branch handling implicit.

## Output

- Create or update `specs/<feature>/flows/index.md`
- Create or update `specs/<feature>/flows/*.mmd`
- Refresh `specs/<feature>/memory/stable-context.md`
- Refresh `specs/<feature>/memory/trace-index.md`
- Refresh `specs/<feature>/memory/index.md` if routing changes

## Check Before Finish

- Confirm the mainline and exception paths are both visible.
- Confirm state transitions are consistent with the clarified business rules.
- Confirm every Mermaid artifact matches the written description.

## Next

- Suggest `/sp.ui` or `/sp.gate`.
