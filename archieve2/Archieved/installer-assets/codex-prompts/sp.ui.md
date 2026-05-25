---
description: Define or refresh the screen structure and UI interaction documents for the active feature.
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# /prompts:sp.ui

Use this command when the user wants to define or refresh the screen structure and UI interaction documents for the active feature.

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

- Lock screens, screen responsibilities, key actions, field constraints, and screen relationships.

## Read First

- Read `specs/<feature>/memory/index.md` and `specs/<feature>/memory/trace-index.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, and `specs/<feature>/flows/*`.

## Do

- Define the screen map and screen responsibilities.
- Document key actions, fields, sections, and validation constraints.
- Keep screen-level Markdown and JSON Forms assets aligned when JSON Forms is in use.
- Use stable IDs for screens, sections, fields, and actions where practical.
- Refresh trace and memory entries when UI structure changes stable facts or source routing.

## Do Not

- Do not write frontend implementation code.
- Do not invent screens that are not justified by the feature scope.
- Do not leave owner boundaries or action outcomes ambiguous.

## Output

- Create or update `specs/<feature>/ui/index.md`
- Create or update `specs/<feature>/ui/screen-map.md`
- Create or update `specs/<feature>/ui/screen-*.md`
- Create or update `specs/<feature>/ui/jsonforms/*` when applicable
- Refresh `specs/<feature>/memory/stable-context.md`
- Refresh `specs/<feature>/memory/trace-index.md`
- Refresh `specs/<feature>/memory/index.md` if routing changes

## Check Before Finish

- Confirm screen responsibilities match the flow and clarified rules.
- Confirm critical actions and field constraints are explicit.
- Confirm UI IDs and ownership terms stay consistent across files.

## Next

- Suggest `/prompts:sp.gate`.
