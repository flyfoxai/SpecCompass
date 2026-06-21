---
description: Define or refresh the screen structure and UI interaction documents for the active feature.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-spec --require-flow
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec -RequireFlow
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# /sp.ui

Use this command when the user wants to define or refresh the screen structure and UI interaction documents for the active feature.

## Subject Scope

The output of this command always describes the **target business application's
screens and interactions** being specified and built in this project. "The active
feature" means a feature of that application, not a feature of SP, SpecCompass,
Spec Kit, or this methodology.

This command must never produce UI designs, screen maps, wireframes, fields,
actions, or interaction models for SP's own command interface, workflow views,
memory management, preflight checks, gate decisions, or methodology stages. SP
commands, SP memory paths, and SP execution rules are operational context for
running this command; they are not UI content.

If any screen, section, field, action, state, or visual label describes a
`/sp.*` command, an SP memory file, a preflight step, a workset-management step,
or SP's own internal UI, stop immediately. Treat it as a subject-confusion error,
discard the affected output, and return a `SUBJECT_CONFUSION` blocker with the
required `spec.md` and `flows/*` read targets and next `/sp.ui` route. Do not
regenerate in the same run.

## Business UI vs Process Visualization UI

Business UI means screens, forms, navigation, actions, results, and feedback that
let target end users complete target business operations in the product being
built. Each screen must have a clear business operation source: target role,
business goal, flow step or business event, data object or field, permission or
validation rule, and acceptance path.

Process Visualization UI means UI that primarily displays a workflow, method,
state transition timeline, step progress, node activation panel, processing
dashboard, or flow diagram as the interface itself. Do not create Process
Visualization UI unless `spec.md` explicitly requires workflow monitoring,
process audit, orchestration, or operational status viewing as a product feature.
When it is explicitly required, bind it to the target product's business users,
data, permissions, and acceptance paths rather than SP's own process.

If a screen only visualizes flow progress or stage status and does not let a
target user perform or inspect a target business operation, treat it as
`SUBJECT_CONFUSION`, discard it, and stop with the next `/sp.ui` route instead
of regenerating in the same run.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- The subject of all output artifacts is the target business application. SP commands, SP memory paths, and SP processing rules are operational context only; they must not become UI content.
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
- Classify visual review into three tiers before promoting UI artifacts:
  - **No confirmation required**: trivial copy, label, formatting, or docs-only refresh; no new or changed screens, actions, fields, states, permissions, data binding, validation, or downstream readiness impact; and no visual artifact requires a direction choice. Record why confirmation was not required.
  - **Recommended confirmation**: small non-critical organization, readability, or layout changes, including 1-2 non-critical screens, actions, fields, or states, where flow/source backing is clear and no critical flow, data, permission, or acceptance path is affected. The run may continue as a draft or with a warning, but must state what the user should review by visible label.
  - **Required confirmation**: first-time stable UI generation, major screen/action/field/permission/data-binding changes, 3 or more new screens or critical actions, explicit review requests, unclear user approval of the direction, Process Visualization UI risk, model-inferred UI content that would be used beyond draft, or any change affecting stable memory, stable trace, gate PASS evidence, implementation readiness, or `READY_FOR_PLAN`. In those cases, end with a draft result and ask the user to confirm or request changes by visible label before promotion.
- When confirmation is recommended or required, show a concise Chinese UI review
  summary before asking the user to confirm. Do not only write "please confirm".
  The summary must let the user understand what they are confirming without
  opening every source file: design basis from PRD/spec and flow steps, why this
  UI shape was chosen, layout structure, screens/sections, actions and their
  effects, fields and validation sources, images/previews, charts/tables and
  data sources, permissions/states, known draft or inferred parts, files to
  review, and visible labels to reference in feedback.
- If the UI draft contains a human decision point, explain the background in
  plain Chinese, give 2-3 options, describe each option's impact, give a
  recommendation, and state the reason. Keep the UI in `DRAFT_ONLY`,
  `NEEDS_DECISION`, or `BLOCKED` until the user confirms or chooses a repair
  option.
- For explicit `--auto` runs, only the visual review gate may be skipped. State why it was skipped, what changed, which tier would otherwise apply, and whether the result is still draft or ready for the next step.
- `--auto` may skip only the visual review gate; it must never skip Subject Scope, business domain anchor, Stage Entry Preflight, subject-confusion checks, or Process Visualization UI checks.

## Purpose

- Lock screens, screen responsibilities, key actions, field constraints, and screen relationships.

## Read First

- Read `specs/<feature>/memory/index.md`, `specs/<feature>/memory/open-items.md`, and `specs/<feature>/memory/trace-index.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, and `specs/<feature>/flows/*`.

> Operational checks only: this section verifies SP inputs and routing needed to
> run the command. It does not describe the subject matter that the output should
> model.

## Stage Entry Preflight

- Confirm routing identifies one active feature and `spec.md` plus the required flow contracts are current enough to define UI facts.
- Confirm upstream flow `Stage Readiness` is present in `specs/<feature>/flows/index.md` or `specs/<feature>/memory/index.md`, has `Status: READY_FOR_UI`, and includes a usable `Based On` plus `Source Snapshot` or `Evidence Signature`.
- Confirm the upstream `Source Snapshot` or `Evidence Signature` includes at least `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Missing fields are warnings for `/sp.analyze`, but they block stable UI generation when they prevent proving stage entry, risk closure, trace closure, or downstream readiness.
- If `Source Snapshot` or `Evidence Signature` is absent, treat the flow readiness as not stable enough for stable UI generation. Route back to `/sp.flow` or the command that owns the readiness to refresh it; if all source evidence is visible and only the signature formatting is missing, refresh the readiness in that owner stage before continuing.
- If flow readiness is missing, `SP_STAGE_SEED`, `NEEDS_CLARIFY`, `NEEDS_DECISION`, `BLOCKED`, `DRAFT_ONLY`, stale, contradicted by high-impact `memory/open-items.md`, or based only on `Source: model-inferred` / `[INFER:DRAFT]`, stop before generating stable UI artifacts and route to `/sp.flow`, `/sp.clarify`, or `/sp.specify`.
- Confirm the business domain before generating screens: state the target business domain, product, user role, and feature being modeled. If this cannot be stated from `spec.md` and flow contracts, stop with `Blocker Type: SUBJECT_CONFUSION` or `UPSTREAM_DOC_GAP` and route to `/sp.specify`, `/sp.clarify`, or `/sp.flow`.
- Confirm the active UI request is for the target business product, not SP, SpecCompass, Spec Kit, command execution, memory management, preflight, gate, task routing, or methodology visualization. If the requested or inferred UI subject is the SP mechanism itself, stop with `Blocker Type: SUBJECT_CONFUSION`.
- Confirm `specs/<feature>/flows/*` exists and contains the flow steps, port contracts, permissions, branches, and exception paths needed by the requested UI work. If the flow contract is missing, generic, stale, or waiting for required visual review, stop and route to `/sp.flow`.
- Check whether user input changes product goal, source authority, requirements, acceptance, business rules, flow behavior, permission ownership, or scope boundary. If so, stop UI work and route to `/sp.prd`, `/sp.specify`, `/sp.clarify`, or `/sp.flow` before creating or refreshing UI artifacts.
- Check whether the requested UI decision depends on unresolved layout choice, interaction model, data-binding, validation, permission, risk acceptance, or verification downgrade. If it is a human choice, route to `/sp.clarify` with options; if it is a missing flow fact, route to `/sp.flow`.
- Confirm existing UI artifacts are not only generic templates, stale drafts, or unconfirmed visual-review outputs being used as stable facts. If they are, keep the result draft or route to the owner command before promoting memory or trace.
- If the flow contract and business domain are clear but UI information is coarse, continue only by creating a bounded draft UI decomposition. Use common product UI patterns to fill likely missing screens, states, fields, and actions, mark each inferred element as `Source: model-inferred`, and keep it draft until user review or later analyze/gate checks. If the missing UI information changes business rules, permissions, validation authority, data meaning, acceptance, compliance, rollback, or irreversible actions, stop and route to `/sp.flow`, `/sp.specify`, or `/sp.clarify` instead of inferring it.
- If preflight fails, report `Missing/Weak Artifact`, `Blocker Type`, `Root Layer`, `Owner Route`, `Why current command cannot continue`, `Next /sp.* route`, and `Writeback Target`. Do not invent UI business behavior to compensate for missing flow or requirement evidence.

## Do

- Before generating any screen, write a one-sentence business domain anchor that names the target product, target user, target business operation, and related flow source. Put this anchor visibly near the top of `ui/index.md` or the command summary, and use it to keep all screens, actions, fields, and visuals inside the business domain.
- Decompose UI top-down before writing screen files: user roles, task entry points, screen map, per-screen purpose, required sections, fields, actions, states, validation, permissions, feedback, error/recovery behavior, and verification evidence.
- Lightweight UI Planning:
  - Default UI direction when the user gives no preference: clean, fresh, clearly grouped, humane to operate, clear information hierarchy, efficient use of space, and not crowded on mobile.
  - Ask at most 2-3 short questions only when the missing choice would materially change the UI specification. Prefer one batch of questions.
  - Useful questions:
    1. Visual style: desired tone, required brand color/reference, or forbidden style.
    2. Layout density: primary device and whether the screen should optimize for dense desktop work, mobile use, or balanced responsive use.
    3. Workflow ergonomics: the most common user task, required operation order, and actions that should be one-click unless risk/audit rules require confirmation.
  - The UI specification MUST cover three dimensions:
    1. Visual Style: color intent, typography hierarchy, surface treatment, icon style, motion restraint, and contrast/readability.
    2. Layout & Display Efficiency: information priority, grouping, responsive density, compact action placement, stable dimensions, and avoidance of wasted screen space.
    3. Workflow Ergonomics: natural business sequence, primary/secondary action placement, minimal unnecessary clicks, reduced mouse travel, reasonable touch/click targets, and clear feedback states.
  - Do not turn UI planning into a full design-system, Figma/MCP, automated audit, crawler, media-generation, or heavy research workflow unless the user explicitly asks.
  - Avoid oversized controls that waste screen space, tiny controls that are hard to target, decorative card-heavy layouts for operational tools, and extra confirmation steps without risk, audit, permission, or irreversible-action reasons.
- When inputs are too brief, use bounded model inference to avoid an under-designed UI. Safe inferred details include standard create/view/edit/review/result screens, empty/loading/error/success states, confirmation prompts for risky actions, search/filter/sort where the data set clearly needs them, validation display for existing field rules, and audit/result feedback. Unsafe inferred details include new business events, new permissions, new data validation rules, data-retention/compliance behavior, irreversible actions, pricing/settlement behavior, or acceptance downgrades.
- Label inferred UI content clearly with `Source: model-inferred` or `OPEN-*` references. Inferred content may shape a review draft, but it must not close risks, replace user decisions, or become stable memory/trace until confirmed or checked.
- Use `[SRC:FLOW-*]`, `[SRC:SPEC-*]`, `[SRC:CLARIFY-*]`, `OPEN-*`, `Source: model-inferred`, or `[INFER:DRAFT]` markers for stable or draft screen, field, action, and state rows so provenance is visible. Stable UI facts need flow-backed or source-backed provenance; `[INFER:DRAFT]` and `Source: model-inferred` are never stable evidence by themselves.
- If the coarse input admits multiple valid UI patterns, provide 2-3 options with impact, recommendation, and next `/sp.clarify` or `/sp.ui` route. Do not silently choose a materially different interaction model for the user.
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
- After drafting but before writing files, run a subject-confusion and Process Visualization UI scan. If any draft screen primarily displays SP mechanics, workflow stages, flow step progress, state transition timelines, processing dashboards, or flow diagrams instead of target business operations, discard the affected draft before file write, stop execution, and return a `SUBJECT_CONFUSION` blocker that instructs the next run to regenerate from `spec.md` plus `flows/*`.
- If the same feature or workset hits `SUBJECT_CONFUSION` twice for the same business-domain boundary, stop retrying and route to `/sp.clarify` with 2-3 boundary choices for the user to decide.

## Do Not

- Do not write frontend implementation code.
- Do not invent screens that are not justified by the feature scope.
- Do not leave owner boundaries or action outcomes ambiguous.
- Do not produce screens, wireframes, fields, actions, states, or interaction models that represent SP's own command interface, workflow views, memory management, preflight checks, gate decisions, workset management, or methodology stages.
- Do not use `/sp.*` commands, `spec.md`, `memory/index.md`, `trace-index.md`, `open-items.md`, `preflight`, `workset`, `gate`, or other SP-internal terms as screen subjects, fields, buttons, actions, or navigation items unless the target product itself explicitly contains those user-facing concepts.
- Do not produce Process Visualization UI, flow step progress bars, state transition timelines, processing dashboards, workflow node activation panels, or "flow diagram as UI component" screens unless `spec.md` explicitly requires that product capability.
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
- Write or refresh UI `Stage Readiness` in `specs/<feature>/ui/index.md` or `specs/<feature>/memory/index.md`: include `Stage`, `Status`, `Based On`, `Source Snapshot` or `Evidence Signature`, `Unresolved Blockers`, `Needs Decision`, `Inferred/Draft Items`, `Next Allowed Stage`, and `Writeback Target`. The signature must include `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Use `READY_FOR_PLAN` only when screen/action/field/state bindings, flow provenance, draft-inference handling, visual-review status, and open blockers are clean; otherwise use `DRAFT_ONLY`, `NEEDS_DECISION`, or `BLOCKED` with the next owner route.

## Check Before Finish

- Confirm screen responsibilities match the flow and clarified rules.
- Confirm the UI is not under-decomposed: it covers user roles, entry points, screen map, screen purposes, sections, fields, actions, states, validation, permissions, feedback, error/recovery behavior, and verification evidence, or records explicit open items for missing parts.
- Confirm any `Source: model-inferred` UI content is marked as draft, traceable to the flow/spec source, and not promoted to stable memory/trace without confirmation or current evidence.
- Confirm every stable screen, section, field, action, state, and validation rule has provenance such as `[SRC:FLOW-*]`, `[SRC:SPEC-*]`, `[SRC:CLARIFY-*]`, or an explicit `OPEN-*`; `[INFER:DRAFT]` and `Source: model-inferred` do not qualify as stable provenance.
- Confirm critical actions and field constraints are explicit.
- Confirm Visual Style is described at a lightweight decision level: color intent, typography hierarchy, surface treatment, icon style, motion restraint, and contrast/readability.
- Confirm Layout & Display Efficiency is addressed: information priority, grouping, responsive density, compact action placement, stable dimensions, and avoidance of wasted screen space.
- Confirm Workflow Ergonomics is addressed: natural business sequence, primary/secondary action placement, minimal unnecessary clicks, reduced mouse travel, reasonable touch/click targets, and clear feedback states.
- Confirm every critical screen, action, and field has a flow, data, API, permission, acceptance, or open-item source.
- Confirm direct-neighbor data-linkage checks are visible for any field, action, validation, permission, API parameter, screen state, or test expectation that changes business meaning.
- Confirm UI actions do not create unapproved business events, state transitions, side effects, or validation rules.
- Confirm UI IDs and ownership terms stay consistent across files.
- Confirm UI visuals, wireframes, previews, or renderable UI assets show
  human-review labels and that each label maps back to a structured source row
  or anchor.
- Run a subject-confusion scan: confirm no screen, section, field, action, state, navigation item, visual label, or written UI description uses `/sp.*`, `sp.*`, `memory/index.md`, `trace-index.md`, `open-items.md`, or `SUBJECT_CONFUSION` as UI content. Treat broader terms such as `preflight`, `Allowed Write Set`, `Required Checks`, or `NEEDS_DECISION` as contextual analyze/gate findings, not automatic mechanical failures. If clear control-plane content is found, stop, discard the affected UI content, and return a `SUBJECT_CONFUSION` blocker with the exact `specs/<feature>/spec.md` and `specs/<feature>/flows/*` read targets and next `/sp.ui` route. Do not regenerate in the same run.
- Run a Process Visualization UI scan: confirm no screen is merely a flow step progress view, state transition timeline, processing dashboard, workflow node activation panel, or flow diagram UI unless `spec.md` explicitly requires that product feature. If found, treat it as `SUBJECT_CONFUSION`, discard it, and stop with a next `/sp.ui` route tied to target roles, data, actions, permissions, and acceptance paths.
- Confirm draft assumptions are labeled or routed to `memory/open-items.md` instead of being promoted to stable memory.
- Confirm unresolved screens, fields, permissions, or validation gaps are registered in `memory/open-items.md`.
- Confirm whether the visual review gate was required, skipped, or already satisfied. If required and not satisfied, confirm the UI remains a draft and is not promoted to stable memory or stable trace.
- Confirm UI `Stage Readiness` is not `READY_FOR_PLAN` when flow readiness is missing, source provenance is missing, draft inference is used as stable evidence, visual review is still required, `SP_STAGE_SEED` remains, or high-impact open items remain.

## Next

- End every run with a concrete closeout recommendation. Do not only list possible next commands or only ask for visual review. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.
- Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, UI `Stage Readiness`, visual-review state, flow/spec provenance, and this UI evidence. If visual review is required and not satisfied, recommend the review/repair route instead of `/sp.gate`.
- If the closeout names a numbered feature, module, or mainline such as `110-template-library-template-application`, include 1-3 short Chinese sentences explaining what it mainly does and why it matters. If the role is not confirmed by current evidence, say it is not confirmed and recommend evidence repair or `/sp.route all`.
- Use this exact closeout shape:

  ```text
  OPTION_A: [CMD: </sp.* or None>] <plain-language action and impact>
  OPTION_B: [CMD: </sp.* or None>] <plain-language action and impact>
  OPTION_C: [CMD: </sp.* or None>] <write [CMD: None] None when there is no third valid option>
  RECOMMENDED_OPTION: A | B | C
  MY_RECOMMENDATION: 我的推荐：选 <A|B|C>：<用中文说明推荐对象和理由>
  NEXT_ACTION: <one concrete next action; do not write "if needed">
  NEXT_COMMAND_EXEC: </sp.* or None>
  NEXT_COMMAND_ID: </sp.* or None; legacy alias of NEXT_COMMAND_EXEC>
  NEXT_COMMAND: </sp.* 加中文提示词的一整行；必须能一次复制粘贴执行；如果 NEXT_COMMAND_EXEC 为 None 则写 None>
  WHY_THIS_NEXT: <why this is the correct direction, grounded in global/feature memory, open-items, Stage Readiness, and this command evidence>
  DO_NOT_RUN: <commands that would be unsafe now, or None>
  ```
- Recommend `/sp.gate <feature>` only when UI `Stage Readiness` is `READY_FOR_PLAN` and required visual review is satisfied or explicitly not required; otherwise recommend `/sp.ui`, `/sp.flow`, `/sp.clarify`, or `/sp.specify` with the exact blocker route.
- Suggest `/sp.gate` only when UI `Stage Readiness` is `READY_FOR_PLAN`.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
- End with a visual review prompt when structured UI files, wireframes, JSON
  Forms assets, HTML/CSS prototypes, Storybook stories, previews, or exported
  images exist. Tell the user:
  - a short Chinese UI review summary before the confirmation request:
    `设计依据` from PRD/spec and flow, `布局结构`, `主要区域`,
    `动作按钮`, `字段/校验`, `图片/预览`, `图表/表格和数据源`,
    `权限/状态`, `草稿或推理项`, and `需要确认的问题`;
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
  The immediate recommendation should be the confirmation/repair action, with a
  copy-pasteable `/sp.ui <feature>` command that tells the next run exactly
  which visible screen/action/field labels to confirm or revise.
