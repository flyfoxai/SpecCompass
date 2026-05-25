---
description: Package the stable first-layer conclusions for second-layer delivery design.
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# /prompts:sp.bundle

Use this command when the user wants to package the stable first-layer conclusions for second-layer delivery design.

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

- Compress the stable first-layer conclusions into a package the second layer can consume directly.

## Read First

- Read `.specify/memory/active-context.md`, `specs/<feature>/memory/index.md`, and `specs/<feature>/memory/stable-context.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, `specs/<feature>/flows/*`, `specs/<feature>/ui/*`, and `specs/<feature>/gate.md`.

## Do

- Summarize the stable feature context that the delivery layer needs.
- Call out unresolved constraints or carry-forward risks explicitly.
- Keep the package concise, query-friendly, and traceable back to first-layer sources.
- Refresh active context and feature memory so later steps can route into the correct delivery work.

## Do Not

- Do not invent delivery design that is not already implied by first-layer outputs.
- Do not hide remaining risks.
- Do not duplicate large source documents verbatim.

## Output

- Create or update `specs/<feature>/bundle.md`
- Refresh `.specify/memory/active-context.md`
- Refresh `specs/<feature>/memory/stable-context.md`
- Refresh `specs/<feature>/memory/index.md`

## Check Before Finish

- Confirm the package is sufficient for delivery-layer entry without rereading everything.
- Confirm unresolved items are clearly marked.
- Confirm the bundle only reflects stable first-layer conclusions.

## Next

- Suggest `/prompts:sp.plan`.
