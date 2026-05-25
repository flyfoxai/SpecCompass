---
description: Define or refresh the business flow documents for the active feature.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-spec
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# sp.flow

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
- User-facing next-step commands must use `/sp.*` form. Treat `sp-*` only as an internal skill directory detail.
- Keep trace coordinates stable and searchable. Put unresolved flow risks or blockers in `memory/open-items.md`.
- Manage context as an engineering budget: start from routing, spec, clarifications, and open items; expand only to the flow source documents needed for the current branch or state decision.

## Purpose

- Lock stage order, branching, exception handling, and state progression.

## Read First

- Read `specs/<feature>/memory/index.md`.
- Read `specs/<feature>/memory/open-items.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, and rule lists that affect the target flow.

## Do

- Define the business mainline stages and actor boundaries.
- Capture state progression, branches, exceptions, defaults, and overrides.
- Keep Mermaid flow assets and supporting Markdown in sync.
- Use stable IDs for states, actions, decisions, and exceptions when practical.
- Refresh trace and memory files when flow changes alter stable facts or routing.
- Mark non-trivial missing validation evidence with `@t0` only when it can be resolved through trace or open-items.
- If one flow area is too large for one focused read set, recommend a workset split for `/sp.plan` instead of hiding complexity in one diagram.
- If branch, state, or exception behavior cannot be resolved after bounded evidence review, fall back to `/sp.clarify` or `/sp.specify` instead of inventing the transition.

## Do Not

- Do not drift into UI screen design.
- Do not write delivery-layer implementation details.
- Do not leave missing branch handling implicit.
- Do not invent exception handling or state transitions that are not supported by `spec.md` or clarifications.

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
- Confirm any open branch, state conflict, or unresolved exception is registered in `memory/open-items.md`.

## Next

- Suggest `/sp.ui` or `/sp.gate`.
