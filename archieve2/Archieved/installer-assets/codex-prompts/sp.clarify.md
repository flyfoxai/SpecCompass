---
description: Resolve high-impact business clarification questions for the active feature.
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# /prompts:sp.clarify

Use this command when the user wants to resolve high-impact business clarification questions for the active feature.

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

- Act as the unified clarification entry for document-stage business decisions.
- Resolve high-impact gaps or conflicts coming from `spec`, `flow`, or `ui`.

## Read First

- Read `specs/<feature>/memory/index.md` if it exists.
- Read `specs/<feature>/memory/open-items.md` if it exists.
- Read `specs/<feature>/spec.md`.
- Read `specs/<feature>/clarifications.md` and `specs/<feature>/clarify-log.md` if they exist.
- Read the current source area if the issue came from `flows/*` or `ui/*`.

## Do

- Identify whether each question belongs to `CF-SPEC`, `CF-FLOW`, or `CF-UI`.
- Ask route-level questions before local detail questions.
- Treat route-changing questions as immediate.
- Group safe local uncertainties into bounded batch questions when possible.
- Record decisions, impacts, and revisit conditions explicitly.
- Update `spec.md` only where clarification stabilizes the baseline requirement.
- Refresh feature memory when stable facts or open questions change.

## Do Not

- Do not jump to process diagrams, UI design, or delivery design.
- Do not hide rule conflicts.
- Do not convert weak evidence into fixed decisions.

## Output

- Create or update `specs/<feature>/clarifications.md`
- Create or update `specs/<feature>/clarify-log.md`
- Update `specs/<feature>/spec.md` only where clarification changes baseline requirements
- Refresh `specs/<feature>/memory/stable-context.md`
- Refresh `specs/<feature>/memory/open-items.md`
- Refresh `specs/<feature>/memory/index.md` when routing changes

## Check Before Finish

- Confirm every conclusion is traceable to a question and answer.
- Confirm unresolved items remain visible.
- Confirm downstream files that depend on the clarification are named explicitly.

## Next

- Suggest `/prompts:sp.flow` or `/prompts:sp.ui`, depending on what the clarification unlocked.
