---
description: Organize delivery design outputs and split the feature into worksets.
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# /prompts:sp.plan

Use this command when the user wants to organize delivery design outputs and split the feature into worksets.

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

- Organize the relationships among screens, flows, APIs, tables, permissions, and acceptance, then split them into worksets.

## Read First

- Read `.specify/memory/feature-map.md`, `specs/<feature>/memory/index.md`, `specs/<feature>/memory/stable-context.md`, and `specs/<feature>/memory/trace-index.md`.
- Read `specs/<feature>/bundle.md` and the constitution rules that constrain delivery design.

## Do

- Define delivery design outputs and the workset structure.
- Split the feature into bounded work areas when the scope is large enough to justify it.
- Keep relationships among flows, screens, data, APIs, permissions, and acceptance explicit.
- Refresh memory and workset indexes when routing changes.

## Do Not

- Do not write production code or implementation tasks here.
- Do not collapse multiple independent work areas into one vague workset.
- Do not lose traceability back to first-layer sources.

## Output

- Create or update `specs/<feature>/plan.md`
- Create or update `specs/<feature>/memory/worksets/index.md`
- Create or update `specs/<feature>/memory/worksets/ws-*.md`
- Refresh `specs/<feature>/memory/index.md`
- Refresh `.specify/memory/feature-map.md` when workset routing changes materially

## Check Before Finish

- Confirm worksets are bounded and actionable.
- Confirm major delivery objects and relationships are visible.
- Confirm routing memory points to the current primary workset.

## Next

- Suggest `/prompts:sp.tasks`.
