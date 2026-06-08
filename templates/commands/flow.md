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
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Keep trace coordinates stable and searchable. Put unresolved flow risks or blockers in `memory/open-items.md`.
- Treat newly generated or refreshed flow outputs as draft facts until checked by `/sp.analyze`, `/sp.gate`, or equivalent evidence. Draft flow facts may guide discussion, but they must not close risks, support PASS, or replace stable source facts.
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
- For each critical flow step, record the node type: `ui`, `system`, `external`, `scheduled`, `manual`, or `none_ui`.
- For each critical flow step, record a lightweight port contract: input, precondition or permission, business action, output or side effect, target state, failure path, and verification or acceptance evidence.
- For `ui` type steps, record only the UI contract: fields to collect, business facts to show, events allowed, permissions, and error states. Leave layout and composition to `/sp.ui`.
- For non-UI steps, record the trigger, required input, side effect, failure path, and verification route. Do not force a screen binding when no screen is needed.
- Keep Mermaid flow assets and supporting Markdown in sync.
- Use stable IDs for states, actions, decisions, and exceptions when practical. Keep the main coordinate at `FEATxx.WSxx.TYPExx`; use local labels such as `Step 1`, `Decision: reject`, or `Event: approve_submitted` for internal flow details instead of deep micro IDs.
- Refresh trace and memory files when flow changes alter stable facts or routing. If the change is only a draft inference, keep it in `flows/*` or `memory/open-items.md` until checked.
- Mark non-trivial missing validation evidence with `@t0` only when it can be resolved through trace or open-items.
- If one flow area is too large for one focused read set, recommend a workset split for `/sp.plan` instead of hiding complexity in one diagram.
- If branch, state, or exception behavior cannot be resolved after bounded evidence review, fall back to `/sp.clarify` or `/sp.specify` instead of inventing the transition.

## Do Not

- Do not drift into UI screen design.
- Do not write delivery-layer implementation details.
- Do not leave missing branch handling implicit.
- Do not invent exception handling or state transitions that are not supported by `spec.md` or clarifications.
- Do not use deep default IDs such as `FLOW01.STEP04`, `UI03.BTN05`, or `API02.FIELD03` as stable public coordinates unless a recurring cross-document object truly needs promotion.
- Do not write draft flow assumptions into `memory/stable-context.md` or use them to close `OPEN-*`, `RISK-*`, `@t0`, or `@r0`.

## Output

- Create or update `specs/<feature>/flows/index.md`
- Create or update `specs/<feature>/flows/*.mmd`
- Refresh `specs/<feature>/memory/stable-context.md` only when source-backed or checked flow facts changed, or when routing changed. Draft inferences stay in `flows/*` or `memory/open-items.md`.
- Refresh `specs/<feature>/memory/trace-index.md` only when stable trace links changed. Draft links stay in `flows/*` or `memory/open-items.md` until checked.
- Refresh `specs/<feature>/memory/index.md` if routing changes

## Check Before Finish

- Confirm the mainline and exception paths are both visible.
- Confirm state transitions are consistent with the clarified business rules.
- Confirm every critical flow step has node type and port contract coverage, or an explicit `OPEN-*` / `RISK-*` item.
- Confirm every `ui` type step links to a UI contract or an open item, and every non-UI step has a trigger and verification route.
- Confirm every Mermaid artifact matches the written description.
- Confirm draft assumptions are labeled or routed to `memory/open-items.md` instead of being promoted to stable memory.
- Confirm any open branch, state conflict, or unresolved exception is registered in `memory/open-items.md`.

## Next

- Suggest `/sp.ui` or `/sp.gate`.
