---
description: Bind worksets, deliverables, and acceptance items into an executable documentation task set.
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# /prompts:sp.tasks

Use this command when the user wants to bind worksets, deliverables, and acceptance items into an executable documentation task set.

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

- Bind worksets, objects, deliverables, and acceptance items into an executable document set.

## Read First

- Read `specs/<feature>/memory/index.md` and `specs/<feature>/memory/worksets/index.md`.
- Read `specs/<feature>/plan.md` and `specs/<feature>/delivery/*`.

## Do

- Break the delivery plan into explicit documentation tasks tied to worksets and acceptance.
- Keep task ownership, dependency order, and output targets visible.
- Refresh workset memory if task grouping changes the active local area.

## Do Not

- Do not write production code tasks that are disconnected from the document outputs.
- Do not leave dependencies implicit.
- Do not merge unrelated worksets into one task bucket without justification.

## Output

- Create or update `specs/<feature>/tasks.md`
- Refresh `specs/<feature>/memory/worksets/index.md`
- Refresh `specs/<feature>/memory/worksets/ws-*.md` where needed
- Refresh `specs/<feature>/memory/index.md`

## Check Before Finish

- Confirm every major task maps back to a workset or delivery artifact.
- Confirm dependencies and acceptance hooks are explicit.
- Confirm the active local work area can be discovered from memory.

## Next

- Suggest `/prompts:sp.analyze`.
