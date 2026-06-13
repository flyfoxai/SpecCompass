---
description: Define or refresh the screen structure and UI interaction documents for the active feature.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-spec
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# /sp.ui

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
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Keep screen, action, field, and acceptance anchors traceable. Put unresolved UI risks or blockers in `memory/open-items.md`.
- Treat newly generated or refreshed UI outputs as draft facts until checked by `/sp.analyze`, `/sp.gate`, or equivalent evidence. Draft UI facts may guide layout discussion, but they must not close risks, support PASS, or replace stable source facts.
- Manage context as an engineering budget: start from routing, trace, flow, and open items; expand only to the screens and contracts involved in the current UI decision.
- Treat data-linkage as a direct-neighbor constraint. When a UI field, action, screen state, permission, API parameter, validation rule, or test expectation changes business meaning, check the directly related flow node, data object, API contract, permission rule, acceptance path, trace entry, and open item before treating the UI as stable.
- `/sp.ui` must consume `/sp.flow` outputs. If `specs/<feature>/flows/*` is missing or the required flow contract is absent, stop and route to `/sp.flow` instead of inventing UI business behavior.
- If the UI depends on an unconfirmed flow draft, keep the UI result as draft or register an open item; do not promote it to stable memory, stable trace, gate PASS evidence, or implementation readiness input.
- Treat visual review as a confirmation gate when this is first-time UI generation, a major screen/action/field/permission/data-binding change, 3 or more new screens or critical actions, an explicit review request, or when user approval of the direction is unclear. In those cases, end with a draft result and ask the user to confirm or request changes by visible label before promoting it.
- For small label/text edits, concrete one-point user instructions, or explicit `--auto` runs, the review gate may be skipped. State why it was skipped, what changed, and whether the result is still draft or ready for the next step.

## Purpose

- Lock screens, screen responsibilities, key actions, field constraints, and screen relationships.

## Read First

- Read `specs/<feature>/memory/index.md`, `specs/<feature>/memory/open-items.md`, and `specs/<feature>/memory/trace-index.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, and `specs/<feature>/flows/*`.

## Do

- Define the screen map and screen responsibilities.
- Document key actions, fields, sections, and validation constraints.
- Use the upstream flow port contract as the UI boundary: input, permission, action, side effect, target state, failure path, and verification tell UI what it may collect, show, trigger, and validate.
- Bind each screen to the flow step, business event, data object, permission, or acceptance path it serves. A screen without a business source must become an open item, not a stable UI fact.
- Bind each critical UI action to an allowed business event or flow effect. If the action changes state, writes data, calls an API, triggers an external side effect, or affects acceptance, the source flow/API/data contract must be visible.
- Bind each business field to its data object, validation source, permission rule, or API contract when those exist. UI may organize fields, but it must not invent business validation.
- Keep screen-level Markdown and JSON Forms assets aligned when JSON Forms is in use.
- Prefer structured UI documents, JSON Forms, HTML/CSS prototypes, or Storybook
  stories over bitmap images. When a rendered mockup, exported image, wireframe,
  or preview is produced from those sources, make the review labels visible in
  the visual, such as `SCREEN S1`, `SECTION S1.2`, `FIELD F3`, `ACTION A2`, or
  `STATE ST4`. Keep a mapping from each visible review label to the source
  anchor, name, business meaning, and related flow/API/data/test references.
- Use stable IDs for screens, sections, fields, and actions where practical. Keep the main coordinate at `FEATxx.WSxx.TYPExx`; use local labels such as `Field: email`, `Action: submit`, or `State: empty` for screen internals instead of deep micro IDs.
- Refresh trace and memory entries when UI structure changes stable facts or source routing. If the change is only a draft inference, keep it in `ui/*` or `memory/open-items.md` until checked.
- Preserve links from UI anchors to flow, API, data, permissions, and acceptance paths when those are relevant.
- Mark non-trivial missing validation evidence with `@t0` only when it can be resolved through trace or open-items.
- If the UI decision depends on unresolved scope, flow, permission, or acceptance behavior, fall back to `/sp.clarify`, `/sp.flow`, or `/sp.specify` instead of inventing the screen behavior.
- If a direct-neighbor data-linkage gap affects acceptance, tests, release, rollback, permissions, data safety, or human decisions, register it in `memory/open-items.md` and route to `/sp.flow`, `/sp.specify`, `/sp.clarify`, `/sp.plan`, or `/sp.gate` rather than making the UI absorb the missing business rule.
- If the same UI issue has multiple reasonable layouts, interaction models, or information architecture repairs, offer 2-3 options with impact, recommendation, and next command instead of choosing silently.
- If an earlier UI draft is still waiting for confirmation and the user moves to a downstream command or a new topic, remind the user that the draft is not stable and ask whether to continue review, abandon the draft, or start the new task.

## Do Not

- Do not write frontend implementation code.
- Do not invent screens that are not justified by the feature scope.
- Do not leave owner boundaries or action outcomes ambiguous.
- Do not treat UI convenience ideas as requirements unless the feature scope or clarification supports them.
- Do not add business events, permissions, state transitions, side effects, or data validation that the flow, spec, clarification, API, or data contract does not support.
- Do not write draft UI assumptions into `memory/stable-context.md` or use them to close `OPEN-*`, `RISK-*`, `@t0`, or `@r0`.
- Do not use deep default IDs such as `UI03.BTN05`, `UI03.FIELD07`, or `FLOW01.STEP04` as stable public coordinates unless a recurring cross-document object truly needs promotion.
- Do not suggest `/sp.plan` or `/sp.gate` as if the UI is stable when the current run requires visual review and the user has not confirmed the draft.

## Output

- Create or update `specs/<feature>/ui/index.md`
- Create or update `specs/<feature>/ui/screen-map.md`
- Create or update `specs/<feature>/ui/screen-*.md`
- Create or update `specs/<feature>/ui/jsonforms/*` when applicable
- Refresh `specs/<feature>/memory/stable-context.md` only when source-backed or checked UI facts changed, or when routing changed. Draft inferences stay in `ui/*` or `memory/open-items.md`.
- Refresh `specs/<feature>/memory/trace-index.md` only when stable UI trace links changed. Draft links stay in `ui/*` or `memory/open-items.md` until checked.
- Refresh `specs/<feature>/memory/index.md` if routing changes

## Check Before Finish

- Confirm screen responsibilities match the flow and clarified rules.
- Confirm critical actions and field constraints are explicit.
- Confirm every critical screen, action, and field has a flow, data, API, permission, acceptance, or open-item source.
- Confirm direct-neighbor data-linkage checks are visible for any field, action, validation, permission, API parameter, screen state, or test expectation that changes business meaning.
- Confirm UI actions do not create unapproved business events, state transitions, side effects, or validation rules.
- Confirm UI IDs and ownership terms stay consistent across files.
- Confirm UI visuals, wireframes, previews, or renderable UI assets show
  human-review labels and that each label maps back to a structured source row
  or anchor.
- Confirm draft assumptions are labeled or routed to `memory/open-items.md` instead of being promoted to stable memory.
- Confirm unresolved screens, fields, permissions, or validation gaps are registered in `memory/open-items.md`.
- Confirm whether the visual review gate was required, skipped, or already satisfied. If required and not satisfied, confirm the UI remains a draft and is not promoted to stable memory or stable trace.

## Next

- Suggest `/sp.gate`.
- End with a visual review prompt when structured UI files, wireframes, JSON
  Forms assets, HTML/CSS prototypes, Storybook stories, previews, or exported
  images exist. Tell the user:
  - UI visuals are ready for review, or only structured UI files are ready if no
    preview/export was generated;
  - which files to review, such as `specs/<feature>/ui/*.md` and
    `specs/<feature>/ui/jsonforms/*`;
  - which viewer to use, such as GitHub Markdown preview, VS Code Markdown
    preview, JSON Forms playground, Storybook, browser, project dev server, or
    a normal image viewer depending on the file format;
  - that requested changes should reference visible labels or names, for
    example: "Please adjust ACTION A2 on SCREEN S1 so approval requires a
    confirmation dialog";
  - that visual changes must be written back to structured UI files before
    previews or exported images are regenerated.
- If visual review is required, do not present `/sp.gate` as the immediate next
  step until the user confirms the UI draft or selects a repair option.
