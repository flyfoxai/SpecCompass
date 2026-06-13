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
- Treat data-linkage as a direct-neighbor constraint. When a flow step changes state, data, permission, event, persistence, side effect, or acceptance meaning, check the directly related UI contract, API/data contract, permission rule, test or verification path, trace entry, and open item before treating the flow as stable.
- Treat visual review as a confirmation gate when this is first-time flow generation, a major branch/state/permission/exception change, 3 or more new flow nodes, an explicit review request, or when user approval of the direction is unclear. In those cases, end with a draft result and ask the user to confirm or request changes by visible label before promoting it to stable memory, stable trace, gate PASS evidence, or implementation readiness input.
- For small label/text edits, concrete one-point user instructions, or explicit `--auto` runs, the review gate may be skipped. State why it was skipped, what changed, and whether the result is still draft or ready for the next step.

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
- Prefer renderable text diagrams such as Mermaid, PlantUML, or Graphviz over
  bitmap images. When a rendered diagram, exported image, or preview is produced
  from those sources, make the review labels visible in the diagram, such as
  `FLOW A1`, `FLOW A1-3`, `DEC D2`, `ERR E1`, or `EXT X1`. Keep a mapping from
  each visible review label to the source anchor, name, business meaning, and
  related UI/API/data/test references.
- Use stable IDs for states, actions, decisions, and exceptions when practical. Keep the main coordinate at `FEATxx.WSxx.TYPExx`; use local labels such as `Step 1`, `Decision: reject`, or `Event: approve_submitted` for internal flow details instead of deep micro IDs.
- Refresh trace and memory files when flow changes alter stable facts or routing. If the change is only a draft inference, keep it in `flows/*` or `memory/open-items.md` until checked.
- Mark non-trivial missing validation evidence with `@t0` only when it can be resolved through trace or open-items.
- If one flow area is too large for one focused read set, recommend a workset split for `/sp.plan` instead of hiding complexity in one diagram.
- If branch, state, or exception behavior cannot be resolved after bounded evidence review, fall back to `/sp.clarify` or `/sp.specify` instead of inventing the transition.
- If a direct-neighbor data-linkage gap affects acceptance, tests, release, rollback, permissions, data safety, or human decisions, register it in `memory/open-items.md` and route to `/sp.clarify`, `/sp.specify`, `/sp.ui`, `/sp.plan`, or `/sp.gate` rather than smoothing it over in the flow diagram.
- If the same flow issue has multiple reasonable repairs, offer 2-3 options with impact, recommendation, and next command instead of choosing silently.
- If an earlier flow draft is still waiting for confirmation and the user moves to a downstream command or a new topic, remind the user that the draft is not stable and ask whether to continue review, abandon the draft, or start the new task.

## Do Not

- Do not drift into UI screen design.
- Do not write delivery-layer implementation details.
- Do not leave missing branch handling implicit.
- Do not invent exception handling or state transitions that are not supported by `spec.md` or clarifications.
- Do not use deep default IDs such as `FLOW01.STEP04`, `UI03.BTN05`, or `API02.FIELD03` as stable public coordinates unless a recurring cross-document object truly needs promotion.
- Do not write draft flow assumptions into `memory/stable-context.md` or use them to close `OPEN-*`, `RISK-*`, `@t0`, or `@r0`.
- Do not suggest `/sp.ui`, `/sp.plan`, or `/sp.gate` as if the flow is stable when the current run requires visual review and the user has not confirmed the draft.

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
- Confirm direct-neighbor data-linkage checks are visible for any step that changes state, data, permission, event, persistence, side effect, or acceptance meaning.
- Confirm every Mermaid artifact matches the written description.
- Confirm flow visuals or renderable Mermaid files show human-review labels and
  that each label maps back to a structured source row or anchor.
- Confirm draft assumptions are labeled or routed to `memory/open-items.md` instead of being promoted to stable memory.
- Confirm any open branch, state conflict, or unresolved exception is registered in `memory/open-items.md`.
- Confirm whether the visual review gate was required, skipped, or already satisfied. If required and not satisfied, confirm the flow remains a draft and is not promoted to stable memory or stable trace.

## Next

- Suggest `/sp.ui` or `/sp.gate`.
- End with a visual review prompt when renderable text diagrams, exported
  images, or flow previews exist. Tell the user:
  - flow visuals are ready for review, or only structured flow files are ready
    if no preview/export was generated;
  - which files to review, such as `specs/<feature>/flows/*.mmd`;
  - which viewer to use, such as GitHub Markdown preview, VS Code Mermaid
    preview, Mermaid Live Editor, mermaid-cli, PlantUML, or Graphviz depending
    on the file format;
  - that requested changes should reference visible labels or names, for
    example: "Please adjust FLOW A1-3 branch handling so rejected approvals go
    to manual review instead of direct failure";
  - that visual changes must be written back to structured flow files before
    diagrams, exports, or previews are regenerated.
- If visual review is required, do not present `/sp.ui` or `/sp.gate` as the
  immediate next step until the user confirms the flow draft or selects a
  repair option.
