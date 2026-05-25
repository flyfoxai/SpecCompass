---
description: Establish or refresh the project constitution for the sp workflow.
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# /prompts:sp.constitution

Use this command when the user wants to establish or refresh the project constitution for the `sp` workflow.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.

## Purpose

- Establish the project constitution for the layered document workflow.
- Define hard boundaries between business clarification and delivery design.

## Read First

- Read the current project README and any existing constitution or team principles.
- Read the layered workflow rules and command spec if they already exist.

## Do

- Write or update the constitution so it clearly states:
- this project uses a two-layer document workflow
- the current stage covers documentation only
- flow assets use Mermaid
- UI documentation uses Markdown plus JSON Forms
- second-layer work starts only after gate passes
- the document workflow stops at `sp.analyze`
- Preserve compatibility with the original Spec Kit workflow where practical.
- Refresh the project-level memory entry files.

## Do Not

- Do not start writing feature documents.
- Do not define production code standards here.
- Do not leave stage boundaries ambiguous.

## Output

- Create or update `.specify/memory/constitution.md`
- Create or update `.specify/memory/project-index.md`
- Create or update `.specify/memory/feature-map.md`
- Create or update `.specify/memory/domain-map.md`
- Create or update `.specify/memory/active-context.md`
- Create or update `.specify/memory/hotspots.md`

## Check Before Finish

- Confirm the constitution clearly defines what is allowed and blocked in this stage.
- Confirm cross-platform and cross-agent compatibility principles are stated.

## Next

- Suggest `/prompts:sp.specify`.
