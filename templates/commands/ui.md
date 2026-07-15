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
- Use `huashu-design` for frontend display pages, UI review pages, and
  project UI previews. The fixed SpecCompass review renderer and all generated
  frontend page previews must follow it. React + Vite, Storybook, JSON Forms,
  or a real project dev server are rendering/carrier choices; they do not
  replace the required design skill.
- If the host does not provide the `huashu-design` skill, stop before
  finalizing visual UI artifacts, state the missing skill explicitly, and
  record the fallback as `Design Skill: huashu-design missing`. Do not silently
  replace it with generic frontend styling. A controlled fallback may be used
  only for non-authoritative drafts and must be marked as a framework/design
  deviation in the review manifest and confirmation document.
- Classify the design scope before writing review data or downstream readiness:
  - `review-surface`: the SpecCompass confirmation shell and review controls.
    `huashu-design` is mandatory, and the narrow right confirmation rail belongs
    only to this scope.
  - `business-preview`: target product UI previews for human review.
    `huashu-design` is the default design authority unless a PRD-confirmed
    product design system overrides it.
  - `business-production`: target product frontend implementation. Use
    `huashu-design` as the baseline design and acceptance constraint unless the
    PRD or confirmed product design system provides a stronger authority.
- Frameworks are carriers, not design authority. React + Vite, Storybook, JSON
  Forms, Vue, Svelte, Lit, Alpine/HTMX, a project dev server, or any adapter may
  render the preview, but the review record must still name the design authority,
  chosen frontend framework, and any PRD override or deviation.
- Keep review-surface controls isolated: do not use SpecCompass review confirmation rail in business UI. The right confirmation rail, recommended-option controls, needs-decision controls, authorization writeback UI, and SpecCompass control-plane labels may appear only under `specs/<feature>/ui/review/*` unless the target product explicitly requires an approval side panel as a business feature.
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
- If the UI draft contains a human decision point, explain the real screen or interaction background
  in plain Chinese through `decision_background` / `背景信息` and summarize the
  actual choice in `decision_summary` / `决策摘要`, then give tiered decision options
  (`must_confirm` 3-4 options, ordinary human-judgment nodes
  default to 3 options, and low-risk binary choices only 2 options with
  `options_count_rationale`), and make every option a UI-readable executable
  exit. Each option must show `收益` / `benefit` and `代价` / `cost`; the
  recommended option must also show `推荐理由` / `recommendation_reason`. The
  execution fields / 执行字段 `consequence` and `next_exit` remain mandatory for
  writeback and downstream routing, but they are not the primary visible
  decision explanation; they must still state what the reviewer chooses the model to change next.
  Ground the wording in the current screen, region,
  component, field/action copy, permission, state, or source flow; do not reuse
  generic "looks correct" 模板句 / boilerplate. Any 技术词 must be replaced with
  business language or immediately followed by a Chinese explanation / 中文说明,
  for example `动态标记(dynamic marker，用来提示这里未来会自动更新)`. Each option
  must name 谁继续处理 after the choice, explain the cost of 不选推荐, and keep
  真实差异 between options; do not disguise the same screen route as 保留 /
  补充 / 调整 / 后续完善. Classify the decision before writing options:
  范围决策 decides which screens, regions, states, or actions enter this batch;
  门禁决策 decides whether the screen can release, block, request missing
  material, or route to human review; 降级决策 decides what simpler UI or manual
  fallback appears when the ideal interaction is not ready. Apply clarify-style
  checks to the common routes: needs-decision 选项必须说清缺什么、谁拍板、哪些下游工作暂停;
  split-flow 选项必须说清拆成哪些子流程 or UI review slices; 推荐项必须说明为什么比更慢、更重或更保守的替代方案更适合.
  The canonical option-writing rule lives in the `speccompass-review-data`
  skill. Follow its fact-preservation and anti-fabrication rules: never
  naturalize `node.id`, `change_type`, `next_exit`, paths, `source_ref`, schema
  fields, enum values, component IDs, action refs, field refs, state refs, or
  trace IDs; do not invent extra exits, owners, risks, screens, permissions,
  states, interactions, or downstream work just to reach 3-4 options; if
  sources only support a lower valid count, write `options_count_rationale`
  instead.
  Keep
  the UI in `DRAFT_ONLY`, `NEEDS_DECISION`, or `BLOCKED` until the user confirms
  or chooses a repair option.
- Default human confirmation strategy is `confirm_strategy: batch`. For a
  multi-module, multi-page, or dependency-domain UI generation, generate or
  refresh all in-scope UI drafts first, add them to the batch review manifest,
  and set UI readiness to `WAITING_FOR_BATCH_REVIEW` until the user completes
  the batch confirmation. Do not interrupt the user for per-page or per-module
  confirmation unless the user selected `confirm_strategy: rolling`, the current
  run is a small hotfix, a core dependency must be locked before the rest, the
  batch is too large for one review, or reviewer availability requires a split.
  In those cases, record the downgrade reason and use `hybrid` or `rolling`.
- Batch confirmation must preserve human context: one UI batch should include
  `Batch ID`, `Batch Scope`, `Included Screens`, `Excluded Screens`, `Source
  Snapshot` or `Evidence Signature`, `Review Owner`, `Batch Review Status`,
  framework approximation/deviation notes, `Partial Approval Policy`, and
  `Fallback Strategy`. Scoped approval does not unlock `READY_FOR_PLAN` unless
  needs-decision or unresolved decision items are explicitly split into a child
  batch and dependency impact is recorded.
- Scoped approval does not authorize the full batch. A `SCOPED_CONFIRMATION` result must
  name confirmed items, needs-decision items, unresolved decision items, child
  batch IDs, dependency impact, and the next owner route. Downstream stages may
  consume only the confirmed scope when unresolved items are isolated and do not
  affect the requested downstream work.
- Batch-related notifications must use a stable field shape when they are shown
  in command output or review pages: `NOTIFY_TYPE`, `MESSAGE`, `WHY_NOW`,
  `IMPACT`, `REQUIRED_ACTION`, `BLOCKS_STAGE`, `NEXT_COMMAND`, `DO_NOT_RUN`,
  and `WRITE_BACK`. Use `INFO` when first explaining the batch-first strategy,
  `AUTH` when a batch is ready for confirmation, `STALE` when source changes
  invalidate a prior confirmation, and `BLOCK` when a downstream command would
  bypass required confirmation.
- For explicit `--auto` runs, only the visual review gate may be skipped. State why it was skipped, what changed, which tier would otherwise apply, and whether the result is still draft or ready for the next step.
- `--auto` may skip only the visual review gate; it must never skip Subject Scope, business domain anchor, Stage Entry Preflight, subject-confusion checks, Process Visualization UI checks, batch confirmation, confirmation-document writeback, stale checks, owner approval, or authorization scope checks. If the current scope requires batch confirmation, `--auto` must still write `WAITING_FOR_BATCH_REVIEW` and request human authorization.

## Confirmation Document Schema

`specs/<feature>/ui/review/ui-confirmation.md` is the SP workflow authorization record for a confirmed UI batch. It must be Markdown with machine-readable frontmatter:

```yaml
document_type: sp_human_confirmation
command: /sp.ui
feature: <feature>
schema_version: 1
review_artifact: .specify/review/renderer/speccompass-review-renderer.html
review_artifact_mode: fixed-renderer | local-writer | server-preview | markdown-only
review_data_artifact: specs/<feature>/ui/review/ui-review-data.json
review_data_schema: .specify/review/schemas/ui-review-data.schema.json
review_validator: .specify/review/scripts/validate-review-data.mjs
confirm_strategy: batch | hybrid | rolling
batch_id: <Batch ID from the review manifest>
batch_scope: "<confirmed UI scope>"
batch_review_status: CONFIRMED | SCOPED_CONFIRMATION | NEEDS_REVISION | STALE | REVOKED
source_artifacts_snapshot:
  - path: specs/<feature>/ui/index.md
    digest: sha256:<...> | not-computed
    semantic_scope: [screens, actions, fields, states]
    anchors: [<stable-screen-or-field-id>]
source_hash_verified: MATCH | STALE | NOT_CHECKED
confirmed_by:
  name: <human name or role>
  email: <optional>
  role: owner | reviewer | stakeholder
  confirmed_at: <ISO-8601 or run label>
owner_approval:
  required: true | false
  status: CONFIRMED | PENDING | NOT_REQUIRED
human_confirmation: CONFIRMED | NEEDS_REVISION | SCOPED_CONFIRMATION | STALE | REVOKED
authorization_scope: READY_FOR_PLAN | BLOCKED | <narrow confirmed scope>
design_authority: huashu-design
design_scope: review-surface | business-preview | business-production
design_skill_used: huashu-design | fallback-generic | <custom>
frontend_framework: <framework-or-not-selected>
brand_override: none | <PRD source/design system>
design_deviation_items:
  - item_id: <id>
    expected: <huashu-design expectation>
    actual: <override/deviation>
    reason: <PRD/user-confirmed source>
    severity: deviation-minor | deviation-moderate | deviation-critical
implementation_design_requirements:
  - use huashu-design tokens unless PRD override applies
  - preserve confirmed layout hierarchy
  - do not use SpecCompass review confirmation rail in business UI
confirmed_items: [<screen/file-level labels or IDs authorized without item-level choice>]
needs_decision_items: [<SCREEN/ACTION/FIELD labels or IDs whose saved option next_exit starts with needs-decision; OPTION_B.next_exit must use this route>]
unresolved_decision_items: [<SCREEN/ACTION/FIELD labels or IDs with no selected option or no exit path>]
draft_excluded_items: [<SCREEN/ACTION/FIELD labels or IDs in DRAFT state, selected locally but not submitted with review note>]
decision_recorded_items: [<SCREEN/ACTION/FIELD labels or IDs whose saved option next_exit is a concrete continuation route and not needs-decision; usually OPTION_A/C/D>]
decision_records:
  - id: <visible label or stable ID>
    selected_option: OPTION_A | OPTION_B | OPTION_C | OPTION_D | NO_DECISION_REQUIRED
    selected_summary: <plain-language selected action>
    recommended_option: OPTION_A | OPTION_B | OPTION_C | OPTION_D | NO_DECISION_REQUIRED
    benefit: <what this choice gains for the screen, user task, delivery, or risk control>
    cost: <tradeoff, delay, manual work, weaker guardrail, or rework risk>
    recommendation_reason: <why this option is recommended>
    consequence: <execution field: what the next model or owner must do after selection>
    next_exit: <next owner route or downstream stage unlocked by this choice>
    reviewer_note: <optional human note>
revision_requests:
  - target_ref: <module:screen:node stable reference>
    target_label: <visible module / screen / UI decision label>
    review_type: ui
    change_type: ADD_SCREEN | DELETE_SCREEN | MODIFY_SCREEN_STRUCTURE | ADD_REGION | MODIFY_REGION_LAYOUT | ADD_COMPONENT | DELETE_COMPONENT | MODIFY_FIELD_ACTION_COPY | ADD_STATE | MODIFY_INTERACTION | ADD_PERMISSION_DISPLAY | OTHER
    selected_option: OPTION_A | OPTION_B | OPTION_C | OPTION_D
    reviewer_note: <natural-language revision request / 自然语言修改意见>
    expected_model_action: <what the next /sp.ui run should revise>
    next_exit: <owner route or next stage>
child_batches:
  - batch_id: <child-batch-id>
    status: pending | confirmed | needs_revision | stale
    dependency_impact: <what remains blocked>
items_with_deviation:
  - id: <item-id>
    severity: deviation-minor | deviation-moderate | deviation-critical
    note: <framework approximation, inferred UI behavior, or visual deviation>
reservations: [<explicit reservations>]
revocation:
  status: active | revoked | superseded
  revoked_by: <name-or-None>
  revoked_at: <ISO-8601-or-None>
```

Do not promote UI `Stage Readiness` to `READY_FOR_PLAN` until this document
exists, has `human_confirmation: CONFIRMED`, has owner approval when required,
covers the requested authorization scope, and is not stale. Review manifests,
browser-side draft selections, screenshots, or preview state are review aids;
they are not authorization evidence until written to `ui-confirmation.md`.

review data 是待审内容 / review data is draft review content. The Web review
page is not an editor / 不是编辑器 and does not directly edit flow or UI design /
不直接修改 flow 或 UI 设计. It collects local choices and exports authorization
text. If the reviewer rejects the recommendation, require a `change_type` plus
natural-language revision / 自然语言修改意见 and write it to `revision_requests` in
the confirmation document. UI revision request types are `ADD_SCREEN`,
`DELETE_SCREEN`, `MODIFY_SCREEN_STRUCTURE`, `ADD_REGION`,
`MODIFY_REGION_LAYOUT`, `ADD_COMPONENT`, `DELETE_COMPONENT`,
`MODIFY_FIELD_ACTION_COPY`, `ADD_STATE`, `MODIFY_INTERACTION`,
`ADD_PERMISSION_DISPLAY`, and `OTHER`. A later `/sp.ui` run must read existing
`ui-confirmation.md` `revision_requests`, apply the requested changes to the UI
artifacts and `ui-review-data.json`, validate the data again, and regenerate the
review page before asking for fresh confirmation.

Review pages are rendered by the reusable `speccompass-review-data` toolchain:
normal `/sp.flow` and `/sp.ui` commands must fill structured review data, must
not edit the fixed renderer, and must not write HTML/CSS/JS for the confirmation
surface. The renderer directory `.specify/review/renderer/` is multi-file fixed
infrastructure / 多文件固定基础设施; `speccompass-review-renderer.html` is only the
entry page and its `styles/*.css` and `scripts/*.js` are shared renderer assets.
Use `.specify/review/renderer/speccompass-review-renderer.html` as the fixed
renderer, write UI data to
`specs/<feature>/ui/review/ui-review-data.json`, validate it with
`.specify/review/scripts/validate-review-data.mjs` against
`.specify/review/schemas/ui-review-data.schema.json`, and keep the result as
draft when validation fails. 校验失败不能收尾，不能提升 readiness.

example data must not replace generation rules / 实验数据不能替代生成规则.
Files under `docs/examples/review/*` or one-off experiment pages are only
few-shot references and visual smoke-test fixtures. They cannot be used as proof
that `/sp.ui` is fixed. A valid run must generate or repair the target
feature's `ui-review-data.json` from the current PRD/spec/flow/UI sources; the
corresponding `/sp.flow` proof is the target feature's `flow-review-data.json`,
not a preview fixture. Apply the `speccompass-review-data` option-writing rules, run
`.specify/review/scripts/validate-review-data.mjs`, and continue fixing
model-fixable issues until validation passes or a real human-owned blocker is
recorded. Do not close the command by hand-editing example data, an experiment
JSON file, or the renderer preview.

Legacy compatibility is read-only: old `owner_approval.status: APPROVED` may be
read as `CONFIRMED`, and old `REJECTED` may be migrated or interpreted as
`NEEDS_REVISION`. New writes / 新写入 or newly generated UI confirmation records
must not use `APPROVED` or `REJECTED`; use the current confirmation vocabulary
instead.

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
- If flow readiness is missing, `SP_STAGE_SEED`, `NEEDS_CLARIFY`, `NEEDS_DECISION`, `WAITING_FOR_BATCH_REVIEW`, `BLOCKED`, `DRAFT_ONLY`, stale, contradicted by high-impact `memory/open-items.md`, or based only on `Source: model-inferred` / `[INFER:DRAFT]`, stop before generating stable UI artifacts and route to `/sp.flow`, `/sp.clarify`, or `/sp.specify`.
- Confirm the business domain before generating screens: state the target business domain, product, user role, and feature being modeled. If this cannot be stated from `spec.md` and flow contracts, stop with `Blocker Type: SUBJECT_CONFUSION` or `UPSTREAM_DOC_GAP` and route to `/sp.specify`, `/sp.clarify`, or `/sp.flow`.
- Confirm the active UI request is for the target business product, not SP, SpecCompass, Spec Kit, command execution, memory management, preflight, gate, task routing, or methodology visualization. If the requested or inferred UI subject is the SP mechanism itself, stop with `Blocker Type: SUBJECT_CONFUSION`.
- Confirm `specs/<feature>/flows/*` exists and contains the flow steps, port contracts, permissions, branches, and exception paths needed by the requested UI work. If the flow contract is missing, generic, stale, or waiting for required batch confirmation or visual review, stop and route to `/sp.flow`.
- Check whether user input changes product goal, source authority, requirements, acceptance, business rules, flow behavior, permission ownership, or scope boundary. If so, stop UI work and route to `/sp.prd`, `/sp.specify`, `/sp.clarify`, or `/sp.flow` before creating or refreshing UI artifacts.
- Check whether the requested UI decision depends on unresolved layout choice, interaction model, data-binding, validation, permission, risk acceptance, or verification downgrade. If it is a human choice, route to `/sp.clarify` with options; if it is a missing flow fact, route to `/sp.flow`.
- Confirm existing UI artifacts are not only generic templates, stale drafts, or unconfirmed visual-review outputs being used as stable facts. If they are, keep the result draft or route to the owner command before promoting memory or trace.
- Confirm whether the current run belongs to an existing UI batch or starts a
  new one. If an existing `WAITING_FOR_BATCH_REVIEW` UI batch covers the same
  scope, update that batch instead of creating independent per-page
  confirmations. If source or flow changes make the batch baseline stale, mark
  the batch stale and route to the owner refresh before adding more downstream
  evidence.
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
- If an earlier UI batch is still waiting for confirmation and the user moves to
  a downstream command or a new topic, remind the user that the batch is not
  stable, name the affected `Batch ID` and `Batch Scope`, and recommend returning
  to the batch review page. Do not suggest `/sp.plan`, `/sp.tasks`, or
  `/sp.implement` until the batch is confirmed or explicitly split.
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
- Do not suggest `/sp.plan` or `/sp.gate` as if the UI is stable when the current run requires batch confirmation or visual review and the user has not confirmed the draft.

## Output

- Create or update `specs/<feature>/ui/index.md`
- Create or update `specs/<feature>/ui/screen-map.md`
- Create or update `specs/<feature>/ui/screen-*.md`
- Create or update `specs/<feature>/ui/jsonforms/*` when applicable
- Create or update `specs/<feature>/ui/review/ui-review-batch.md` or an
  equivalent batch review manifest when confirmation is recommended or required.
  This Markdown manifest is a 备用 plain-text record only. Do not present
  `ui-review-batch.md` 作为主入口 for human review.
- Create or update structured review data at
  `specs/<feature>/ui/review/ui-review-data.json` using the
  `speccompass-review-data` skill when confirmation is recommended or required.
  Validate it with `.specify/review/scripts/validate-review-data.mjs` and
  `.specify/review/schemas/ui-review-data.schema.json` before presenting it in
  the fixed renderer. If validation fails, fix model-fixable data issues first;
  if the remaining gap requires human input, keep the UI as draft and route the
  gap explicitly. Review data fields are plain structured data: do not put
  HTML, CSS, JavaScript, SVG, class names, event handlers, or page layout
  instructions in any field, including `schema_notes` and `trace_notes`.
  UI review data is not flow review data / UI 审核数据不是 flow 审核数据:
  before describing layout, each screen must explain its place in the business
  with `business_context`, `primary_users`, `entry_scenarios`, `user_goal`,
  `user_outcome`, and `flow_refs`. These fields must let a reviewer answer: why
  this screen exists in the larger product, who opens it, what observable event
  brings them here, what task they complete, and what business result they leave
  with. Do not satisfy them with layout wording or generic copy such as
  `用于展示相关信息`, `方便用户查看数据`, or a list of objects on the page.
  `flow_refs` are evidence citations only. Use Flow roles, events, states,
  exceptions, permissions, and outcomes as source facts, then transform those
  facts into screen purposes, regions, fields, actions, feedback, and UI states.
  Never turn Flow node IDs, edges, branches, stage progress, or a Mermaid graph
  into visible business UI unless the product spec explicitly requires process
  monitoring. After the business context is clear, each screen must provide
  `screen_layout`, `screen_regions`, and visible `components`; optional `states`
  add screen-state notes. `screen_layout` is the
  screen layout / 屏幕布局 that tells the reviewer whether this is a form,
  dashboard, list/detail, wizard, modal, or other screen shape. The `nodes` array is only the right-rail
  decision and authorization model; it must not replace the middle-screen UI
  preview. Dynamic marker / 动态标注 behavior must be written as plain text
  such as `此处数字未来会自动更新`, not as animation, popup code, or renderer
  instructions. 决策选项需要深度推理: `must_confirm` nodes need 3-4 executable
  options; ordinary human-judgment nodes default to 3 options; low-risk binary
  choices may use 2 options only when `options_count_rationale` explains why 2
  exits are enough. Each decision node must use `decision_background` for the
  real screen or interaction background and `decision_summary` for the actual
  choice. Every option must be an actionable exit through `next_exit` and must
  provide `benefit`, `cost`, `consequence`, and `recommended_option`; the
  recommended option must also provide `recommendation_reason`. The visible
  option card must lead with `背景信息`, `决策摘要`, `收益`, `代价`, and, for the
  recommended option, `推荐理由`. `consequence` and `next_exit` are execution
  fields for writeback/routing, not the primary visible decision explanation.
- Create or update the lightweight feature review index at
  `specs/review-index.json` when UI review data is created or repaired. Keep
  this index about feature navigation only: preserve existing real entries and
  order, add the current real feature only if missing, set the current entry's
  `has_ui_review` to `true`, preserve `has_flow_review`, refresh `updated_at`,
  and do not invent future 002/003 feature slugs. Required entry fields are
  `order`, `feature`, `title`, `has_flow_review`, and `has_ui_review`; root
  fields are `schema_version`, `project`, `updated_at`, and `features`.
- If `specs/<feature>/ui/review/ui-confirmation.md` already contains
  `revision_requests`, read them before generating new UI review data. Treat
  each request as a model-actionable repair instruction, reason against the
  current PRD/spec/flow/UI sources, update the UI artifacts and review data, and
  then regenerate the Web review page. Do not ask the reviewer to directly
  edit screens, regions, components, or interactions in the browser page.
- After the user completes batch confirmation, write or update
  `specs/<feature>/ui/review/ui-confirmation.md` using the Confirmation
  Document Schema above. This Markdown file is the authorization evidence
  downstream commands must read before treating UI artifacts as stable input.
- Present UI review data with the fixed renderer main entry
  `.specify/review/renderer/speccompass-review-renderer.html?ui=<feature>`.
  Command output must point reviewers to this Web review page first because it
  auto-loads `specs/<feature>/ui/review/ui-review-data.json` by short URL
  parameter; the `ui-review-batch.md` file is only a fallback text record.
  普通 `/sp.flow`、`/sp.ui`
  不得修改 renderer or renderer directory `.specify/review/renderer/` and must
  only fill structured review data / 只填结构化
  review data; it must not write HTML/CSS/JS for the confirmation surface /
  不得为确认页编写 HTML/CSS/JS. The renderer is multi-file fixed infrastructure /
  多文件固定基础设施; do not modify its HTML entry, CSS files, JavaScript files,
  layout rules, click handlers, persistence, or summary logic during normal
  `/sp.flow` and `/sp.ui` runs. The fixed renderer owns the unified confirmation
  template, right confirmation sidebar, browser draft handling, decision
  interactions, summary copy, visual grouping, and accessibility details. `/sp.ui`
  must instead provide complete data for that renderer: page title, project UI
  overview, screen map summary, per-screen business context, primary users,
  entry scenarios, user goal, user outcome, Flow evidence references, stable review IDs, visible
  labels, globally unique `node.id` values across the whole review data file,
  `review_layer`, `review_level`, owner, `node_kind`, source refs,
  framework approximation/deviation notes, design authority metadata, tiered
  `OPTION_A`/`OPTION_B`/`OPTION_C`/`OPTION_D` choices,
  `recommended_option`, required `decision_background`, required
  `decision_summary`, required `benefit`, required `cost`, required
  `consequence`, required actionable `next_exit`, and required
  `recommendation_reason` for the recommended option. Use
  `options_count_rationale` when a low-risk binary choice uses only 2 options.
  Also provide batch scope, pending-decision routes, blocker/stale reasons, and
  writeback target `ui-confirmation.md`.
  `must_confirm` nodes must have 3-4 options; ordinary human-judgment nodes
  default to 3 options; low-risk binary choices may use 2 options only with
  `options_count_rationale`. Each decision must show `背景信息` and `决策摘要`;
  each option must show `收益` and `代价`; the recommended option must show
  `推荐理由`. The execution fields / 执行字段 `consequence` and `next_exit`
  must still say what happens after selection and who continues the work. It
  must say 谁继续处理, state the 不选推荐 cost, explain downstream impact on screen scope, interaction risk, implementation, acceptance tests, or delivery schedule,
  explain why the recommended UI option is safest, and show 真实差异 between
  options.
  Choose a decision template
  before writing the options: 范围决策, 门禁决策, or 降级决策. Run
  `.specify/review/scripts/validate-review-data.mjs`; it must reject repeated
  option copy, 模板句 / boilerplate, unexplained 技术词, vague approve/defer/reject
  exits, missing actionable `next_exit`, missing continuation owner, missing
  why-this-must-be-decided-now copy, missing background/summary/tradeoff fields,
  and overly similar benefit/cost/recommendation copy.
  example data must not replace generation rules / 实验数据不能替代生成规则:
  do not treat changes to `docs/examples/review/*` or experiment pages as a
  successful `/sp.ui` output. The generated `ui-review-data.json` for the
  current feature is the artifact that must pass the validator; the Flow-side
  equivalent is the current feature's `flow-review-data.json`, not example data.
  Use Tiffany Blue
  `#0ABAB5` and `huashu-design` only as renderer/design authority metadata in
  the review data. The visual design must come from `huashu-design`; if that
  skill is missing, mark the review data with
  `Design Skill: huashu-design missing` and keep the result non-authoritative
  until the user accepts the deviation. Page implementation details live in
  `.specify/review/renderer/README.md`. If HTML review is unavailable, the
  Markdown batch review manifest must expose the same review data fields.
- Refresh `specs/<feature>/memory/stable-context.md` only when source-backed or checked UI facts changed, or when routing changed. Draft inferences stay in `ui/*` or `memory/open-items.md`.
- Refresh `specs/<feature>/memory/trace-index.md` only when stable UI trace links changed. Draft links stay in `ui/*` or `memory/open-items.md` until checked.
- Refresh `specs/<feature>/memory/index.md` if routing changes
- Write or refresh UI `Stage Readiness` in `specs/<feature>/ui/index.md` or `specs/<feature>/memory/index.md`: include `Stage`, `Status`, `Based On`, `Source Snapshot` or `Evidence Signature`, `Confirm Strategy`, `Batch ID`, `Batch Scope`, `Batch Review Status`, `Unresolved Blockers`, `Needs Decision`, `Inferred/Draft Items`, `Next Allowed Stage`, and `Writeback Target`. The signature must include `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Use `WAITING_FOR_BATCH_REVIEW` when the batch is generated but not confirmed. Use `READY_FOR_PLAN` only when screen/action/field/state bindings, flow provenance, draft-inference handling, batch or visual-review status, and open blockers are clean; otherwise use `DRAFT_ONLY`, `NEEDS_DECISION`, or `BLOCKED` with the next owner route.
- UI `Stage Readiness` must also include `Design Authority`, `Design Scope`,
  `Frontend Framework`, `Brand Override`, `Design Deviations`, and
  `Implementation Design Requirements`. Do not mark `READY_FOR_PLAN` for
  frontend work unless these fields are present and the review-surface isolation
  rule is satisfied.
- Add `Status Reason` to every blocked or non-ready item in the diagram, table, review rail, manifest, open item, or Stage Readiness. The reason must be 10-30 Chinese characters (or equivalent short English phrase for English-language projects), explain the root cause and impact, and sit directly after statuses such as `BLOCKED`, `NEEDS_DECISION`, `WAITING_FOR_BATCH_REVIEW`, `DRAFT_ONLY`, `STALE`, or `REJECTED`.

## Check Before Finish

- Confirm screen responsibilities match the flow and clarified rules.
- Confirm every screen explains its business position in plain language: why it
  exists, who uses it, when they enter, what they need to complete, and what
  result they obtain. Reject layout-only, object-inventory-only, or generic
  display wording even when regions and components are structurally valid.
- Confirm Flow contributed only source facts and trace references. Flow node IDs,
  edges, branches, timelines, and diagrams must not appear as product regions or
  components unless process monitoring is an explicit product requirement.
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
- Confirm whether the default batch confirmation applies. If it applies and is
  not complete, confirm `Stage Readiness.Status` is `WAITING_FOR_BATCH_REVIEW`,
  the batch manifest lists all in-scope UI items, and downstream commands are
  blocked until confirmation or explicit batch split.
- Confirm UI `Stage Readiness` is not `READY_FOR_PLAN` when flow readiness is missing, source provenance is missing, draft inference is used as stable evidence, batch/visual review is still required, `SP_STAGE_SEED` remains, or high-impact open items remain.
- Run the `Finish Quality Gate` before closeout:
  ```yaml
  Finish Quality Gate:
    model_fixable_issues: none | present
    human_blockers: none | present
    self_fix_rounds: 0-3
    quality_result: QUALITY_PASSED | CONTINUE_FIXING | HUMAN_BLOCKED | EXHAUSTED_BLOCKED
    evidence: <current checks, files, screen labels, review artifacts, and blocker routes>
  ```
  Do not stop to report while model-fixable quality issues remain. Continue fixing missing flow bindings, weak screen/action/field provenance, missing right feedback rail, missing `Status Reason`, Huashu/design-authority gaps, malformed review manifests, or process-visualization leakage until `QUALITY_PASSED`, `HUMAN_BLOCKED`, or `EXHAUSTED_BLOCKED`. If the remaining issue needs human input, source authority, framework/design-system decision, or risk acceptance, return `HUMAN_BLOCKED` with a 10-30 Chinese characters (or equivalent short English phrase for English-language projects) `Status Reason`, background, impact, options, recommendation, and owner route. CONTINUE_FIXING is an internal loop state; do not use it as the final output status of this command. If three self-fix rounds cannot resolve the same issue, return `EXHAUSTED_BLOCKED` with the failure signature and next route.

## Next

- After `ui-review-data.json` passes validation, start the fixed review launcher
  from the project root in a long-running terminal:
  `node .specify/review/scripts/serve-review.mjs --ui <feature>`. Wait for the
  launcher self-check; it may print `SPECCOMPASS_REVIEW_URL=` only after the
  renderer 和 review data 均返回 HTTP 200. Keep that process running and present
  the exact emitted URL to the user. Do not guess a port or rewrite the URL.
  交互复核禁止使用 `file://`，并且 `localhost` 不接受；only the emitted
  `http://127.0.0.1:<port>/...` URL is a valid interactive entry. A failed
  self-check is a model-fixable closeout failure, not a reason to return a file
  link, relative path, or Markdown batch manifest as the primary review entry.
- End every run with a concrete closeout recommendation. Do not only list possible next commands or only ask for visual review. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.
- Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, UI `Stage Readiness`, batch/visual-review state, flow/spec provenance, and this UI evidence. If batch or visual review is required and not satisfied, recommend the review/repair route instead of `/sp.gate`, `/sp.plan`, or `/sp.tasks`.
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
- Recommend `/sp.gate <feature>` only when UI `Stage Readiness` is `READY_FOR_PLAN` and required batch confirmation plus visual review are satisfied or explicitly not required; otherwise recommend `/sp.ui`, `/sp.flow`, `/sp.clarify`, or `/sp.specify` with the exact blocker route.
- Suggest `/sp.gate` only when UI `Stage Readiness` is `READY_FOR_PLAN`.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
- End with a visual review prompt and batch confirmation prompt when structured UI files, wireframes, JSON
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
- If batch confirmation or visual review is required, do not present `/sp.gate` as the immediate next step until the user confirms the UI draft or selects a
  repair option.
  The immediate recommendation should be the confirmation/repair action, with a
  copy-pasteable `/sp.ui <feature>` command that tells the next run exactly
  which visible screen/action/field labels to confirm or revise.
