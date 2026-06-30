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

## Subject Scope

The output of this command always describes the **target business application**
being specified and built in this project. "The active feature" means a feature
of that application, not a feature of SP, SpecCompass, Spec Kit, or this
methodology.

This command must never produce flow diagrams or written flow descriptions for
SP's own command processing, routing logic, memory operations, preflight checks,
gate decisions, or methodology stages. SP commands, SP memory paths, and SP
execution rules are operational context for running this command; they are not
business flow content.

If any flow node, decision, event, state, actor, or diagram label describes a
`/sp.*` command, an SP memory file, a preflight step, a workset-management step,
or SP's own internal processing, stop immediately. Treat it as a
subject-confusion error, discard the affected output, and return a
`SUBJECT_CONFUSION` blocker with the required `spec.md` read target and next
`/sp.flow` route. Do not regenerate in the same run.

For `ui` type flow steps, the UI contract describes what target end users need
to input, trigger, see, confirm, or recover from in order to complete a target
business step. It is not a workflow monitoring panel, method walkthrough,
process visualization, SP command dashboard, or flow diagram rendered as UI.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- The subject of all output artifacts is the target business application. SP commands, SP memory paths, and SP processing rules are operational context only; they must not become flow content.
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
- Keep diagrams reviewable before asking for approval. A single reviewable flow diagram should normally contain 5-7 business nodes. At 8 or more business nodes, warn that the diagram should be split and prefer a summary diagram plus subflows. At 10 or more business nodes, do not move directly into confirmation by default: split the diagram first, or write a qualified complex-flow exception reason. A qualified exception must explain why the diagram cannot be split, the required preconditions, the postconditions handed to the next section, the segment-by-segment review order, and the pass criteria for each section. A low-risk linear exception / 低风险线性例外 may also keep a longer diagram in one view only when it states that the path has no high-risk decision, permission, irreversible result, external dependency, or exception branch, and provides a collapsible segment checklist / 分段折叠清单 so reviewers can audit it in smaller chunks. A complex flow may stay in one diagram only when the exception reason is visible, specific, and reviewable. The overview diagram should show only major stages, cross-subflow handoffs, and unresolved blockers; each child subflow should have one responsibility and its own visible review labels.
- Do not merge real business steps just to satisfy the 5-7 node budget. Treat a step as its own business node, or move it into a child subflow, when it changes business state, crosses roles, calls an external system, makes a permission or approval decision, changes a user-visible result, handles failure/compensation/recovery, creates a persistence side effect, or changes acceptance evidence. A complex-flow exception reason must name the concrete coupling that prevents splitting, the required preconditions, the postconditions handed to the next section, the segment-by-segment review order, and the pass criteria for each section; generic phrases such as "business complexity" or "cannot split" are not enough.
- Use a top-down main-trunk layout for Mermaid or other renderable flow
  diagrams: keep the source-backed happy path vertical and centered, expand
  exception, rollback, blocked, and recovery paths sideways, avoid crossing
  connectors, and do not add decorative symmetry nodes. Separate stable node
  IDs from visible business labels; visible labels should be concise target
  domain labels that humans can cite in feedback.
- The fixed SpecCompass review renderer is not Mermaid-based: it reads structured JSON nodes/edges and draws the review diagram with a native SVG/DAG layout. Do not replace `.specify/review/renderer/speccompass-review-renderer.html` with a Mermaid page during normal `/sp.flow` or `/sp.ui` runs. Mermaid, PlantUML, or Graphviz may still be used as project flow source files or external previews. When generating Mermaid source/previews, do not assume Mermaid + ELK is stable until it is verified in the target project; keep a readable font size between 16px and 18px, set `useMaxWidth: false`, avoid whole-SVG downscaling, and tune `nodeSpacing` and `rankSpacing` so the top-down main trunk and side exception paths remain legible. Sequence diagrams / 时序图 must be detected as `sequenceDiagram`, kept in Mermaid's native sequence syntax, and must not be passed through flowchart label wrapping. In `sequenceDiagram`, every `participant` or `actor` alias that is translated, contains Chinese, whitespace, slash, or punctuation must be emitted as a safe double-quoted alias such as `participant Actor as "管理员角色 / 系统角色"`, with backslashes and quotes escaped, so Mermaid does not mis-parse the sequence chart. External Mermaid preview switching must clear the old SVG, show a `正在渲染` placeholder, and use a render token or equivalent guard so a slow or failed previous render cannot overwrite the current diagram.
- Flow review page layout must prevent full-page scroll on desktop: the left module navigation scrolls independently, while the center diagram area and right confirmation rail scroll as one review workspace. The right rail must use no sticky/max-height clipping that hides feedback or confirmation controls.
- Human-focused review pages must show a project business overview / 项目整体业务地图, module summary / 模块简介, and per-flow summary / 流程简介 before detailed confirmation. The center diagram area must include a fullscreen / 全屏 view action for complex Mermaid diagrams. The right confirmation rail must replace legacy bulk approve / 全部通过 and bulk block / 全部阻塞 with batch actions that confirm recommended options / 按推荐确认, mark decision-needed items / 标记需补充决策, and reset the visible batch, plus a panel for the selected diagram, subflow, or node / 选中的图、子流程或节点. Long source previews, current diagram source, or index previews must be collapsible / 可折叠 so they do not waste right-rail height.
- Module summary / 模块简介 and per-flow summary / 流程简介 must be business-bound, not generic boilerplate / 泛化套话, and must not restate methodology / 不复述方法论. Generate them as a 1-2 sentences / 1-2 句 business snapshot / 业务快照 that says 谁在什么场景处理什么 / who handles what in which business scenario, where the current flow starts, where it ends, and which choices can change the business result. The default center layer should use human labels such as 模块做什么, 这张图看什么, and 重点看哪里. Do not directly concatenate / 不得直接拼接 `businessObject`, `roles`, or `flowResponsibility` into a field-like sentence; translate those fields into one natural business sentence first. The full processing scope / 处理范围, raw field values, file name, node count, and node budget / 文件名、节点数、节点预算 belong only in folded trace details / 只能进入折叠追溯, not the default center summary. Use the target business scenario / 业务场景 such as survey publishing, template application, file access, tenant permission, export delivery, AI drafting/follow-up/analysis, or the current product's real modules. Do not fill these areas with abstract wording that only says the diagram shows paths, decisions, branches, completion checks, or placeholder wording like "current module + business object" / “当前模块 + 业务对象” and "explain how the current business is handled" / “说明当前业务如何处理”.
- Generate review copy correctly at the source / 必须在生成阶段写对文案. The review page is not a copy cleanup layer / 审核页不是文案清洗器: do not generate technical wording first and then rely on page translation, regex replacement, or HTML rendering to make it readable / 不能先生成技术话术再依赖页面翻译. Business module default copy must not reuse system/architecture fallback wording / 业务模块默认文案不得套用系统/架构兜底. System/architecture wording may only be used for the `system_arch` layer / 系统/架构话术只能用于 `system_arch` 层, and it must say 无需产品确认. Module-level review layer and diagram-level review layer must be judged separately / 模块级和图级层级必须分开判断: do not mark a whole business feature as `system_arch` only because `flows/index.md` mentions direct-neighbor, cross-module, evidence chain, or adjacency checks; those terms can affect a concrete diagram or node, not the whole module. Specific business-context matching / 精确业务语境匹配 must run before broad matching, especially for 通知/模板/开发者门户/API Key/AI modules whose names overlap but whose reviewers and decisions differ.
- Keep the confirmation rail scoped to the current center view. When the center shows one Mermaid diagram, the node checklist must show only that diagram's nodes; when it shows the index, the checklist may show index-level review labels. The index preview is not authorization for a concrete Mermaid diagram: if the module has Mermaid files, current-flow bulk recommended-option / 当前流程批量按推荐确认 must be disabled while the center is in index mode, with a clear prompt to switch to a concrete flow diagram first. `NOT_APPLICABLE_FOR_UI` means the feature does not proceed to UI review, not that its flow diagrams are hidden; if Mermaid flow files exist, the flow review page must still allow diagram review. The copied/written confirmation summary must still cover the full batch across all diagrams, files, and index-level labels so the authorization record is complete.
- When a diagram node is selected, the selected node should focus the right rail on that single checkpoint / 右侧节点栏只显示该确认点. Provide a clear "show all checkpoints" action to cancel the selection and restore the full checklist. The left module navigation must show one red pending must-confirm counter / 待处理必审 X/Y for each module, where X is unresolved required confirmations and Y is the total must-confirm / 总必审 count from node-level saved state. This counter must be sourced from diagram-backed nodes only / 只统计图上真实节点: the same nodes that can receive a red marker in the Mermaid SVG. Index-level review labels, file-level fallback confirmations, collapsed source notes, and authorization-summary-only records may be copied into the writeback summary, but they must not enter the left module total. Do not show a second `当前图必审` or `当前视图必审` counter in the left navigation: choosing a module or switching diagrams changes only the center/right current view, not the module-level total. The right confirmation rail must not repeat the module-level `待处理必审 X/Y` counter in module facts, selected-node facts, batch facts, or current-view facts; it may show action feedback for the currently visible nodes, but not a second count that can be mistaken for another source of truth. This counter must refresh in real-time / 实时 after recommended-option saves, non-recommended submits, reselect, and current-flow bulk actions. The diagram must add a red marker / 红色标记 inside the node, preferably the internal top-right corner / 内部右上角, on nodes classified as 必须确认. Selecting a diagram node or right-rail node card must show a clear selected state / 选中态 on both sides. Stable help text that does not change with the selected node should use a collapsible panel, tooltip / 悬浮提示, popover, or button-triggered hint instead of occupying the default rail. Group right-rail information from broad to narrow, keep module-level authorization and module-level batch controls together, and avoid duplicate / 同一信息 repeated displays unless emphasis is required.
- For `NOT_APPLICABLE_FOR_UI`, still show / 主视图必须显示 reviewable Mermaid flow diagrams whenever flow files exist; only show an empty or not-applicable main view when no flow diagram exists.
- Support long node labels / 长节点标签 in the native review renderer and Mermaid source/previews. The fixed renderer should wrap visible node text with CSS such as `white-space: normal` and `overflow-wrap`; Mermaid source/previews should wrap labels before render, including `A[long label] --> B[long label]` style lines where nodes and edges share one line. Do not solve long text by shrinking the whole diagram below readable size.
- Generate stable node IDs, source refs, and review labels so the fixed renderer
  can provide two-way linkage / 双向联动 between the diagram and the node
  checklist. The renderer contract owns click handling, selected state, and
  keyboard accessibility; `/sp.flow` only supplies the data needed for clicking a
  node card / 点击右侧节点卡 and clicking a diagram node / 点击流程图节点 to target the
  same checkpoint.
- If the current diagram has 10 or more business nodes and no visible, specific complex-flow exception reason that covers the cannot-split reason, preconditions, postconditions, segment review order, and segment pass criteria, and no qualified low-risk linear exception / 低风险线性例外, disable the current-flow bulk recommended-option action / 禁用当前流程按推荐批量确认. The page must explain that the reviewer should split the diagram first, add the concrete cannot-split reason, or mark a low-risk linear exception that says there is no high-risk decision, permission, irreversible result, external dependency, or exception branch and provides a collapsible segment checklist. Decision nodes must show a default path / 默认路径 warning in the node card when reviewers need to verify where unclear, missing, rejected, or exceptional outcomes go.
- Split flow review responsibility into 业务层面 and 系统/架构层面 before asking for confirmation. Business-level flows cover users, business objects, status, approval, exceptions, and outcomes, and are confirmed by the 产品经理. System/architecture flows cover baselines, routing, adjacency checks, evidence chains, cross-module handoffs, or automation governance needed to support business goals, and are confirmed by the 系统负责人 or architecture owner. The product view may explain how system/architecture flows affect the business module, but must mark them as 无需产品确认.
- Node cards must classify review into 6 类 with a colored dot and short label: 必须确认, 建议确认, 存疑, 关键环节, 已验证, and 系统/架构确认. Use 必须确认 for high-impact business decisions, permissions, state changes, or irreversible results; 建议确认 for low-risk items worth quick human review; 存疑 for incomplete or conflicting facts; 关键环节 for mainline steps reviewers should understand; 已验证 for items already covered by upstream sources; 系统/架构确认 for nodes outside product responsibility. 已 PRD 验证 and 已 spec 验证 must share the same 已验证 level and same color, with the source written only in the remark.
- Node cards must be human-readable / 说人话 for non-programmer reviewers and use default compact node copy / 默认短句. The default visible layer is a 业务决策卡 / business decision card, not a field table, but 业务决策卡只能作为内部概念 / business decision card is an internal concept; 默认层不得显示可见标题“业务决策卡” / must not display the visible title "business decision card". Reviewers must understand the one business decision / 一句业务判断 within 5 秒 / a 5-second scan and the right-rail top must be a 首屏无技术 / technical-free first screen. The default layer may show only the node name, review level, confirmation owner, status, one action prompt starting with `请判断...`, the recommended choice with one short reason, and tiered executable `OPTION_A`/`OPTION_B`/`OPTION_C`/`OPTION_D` choices. `must_confirm` nodes must have 3-4 executable options; ordinary human-judgment nodes default to 3 options; low-risk binary choices may use 2 options only when `options_count_rationale` explains why two exits are enough. Node name, review level, confirmation owner, and status are card header metadata / 卡片头部元信息 and must render as one compact single line / 紧凑单行; they must not be split into field-table rows / 不得拆成字段表行. Selected-node facts should use reviewer labels such as 谁确认, 要决定, 推荐选法, 确认状态, and 已写意见 instead of technical field labels. The card body / 卡片正文三行 must stay within three compact rows: `请判断...`, `推荐...`, and option buttons. Do not show separate `这是什么` / `要决定什么` / `怎么选` question rows in the default layer; compress them into the action prompt or move them to folded details. Each default sentence must be short, business-bound, and understandable without reading source files.
- Node option behavior is owned by the fixed renderer contract in `.specify/review/renderer/README.md`. `/sp.flow` must generate valid review data with tiered executable options, `recommended_option`, and `OPTION_B.next_exit` starting with `needs-decision`; it must not restate or reimplement the renderer state machine, browser persistence, summary-copy, navigation-safety, confirmation-package download, or diagram redraw rules in command output.
- Node cards must keep supporting material in collapsible supporting copy / 折叠详情, but the visible labels must still be human wording. Do not expose field-table labels such as 对象类型, 判断点, 来源, 主流程图, 节点说明, 审核人要看什么, 关联业务, 为什么存在, 需要判断什么, 不需要确认, 不需要管什么, 节点做什么, 通过标准, 可以通过的标准, 风险提示, or 常见风险 in the default right-rail top. Use reviewer-facing labels such as 节点动作, 审核重点, 业务影响, 审核原因, 无需审核, 继续条件, 常见问题, 依据位置, and 原文摘要 in folded details. Source, original text, remarks, trace IDs, `selected_option`, `recommended_option`, and `next_exit` belong only in folded details or compatibility fields and should be relabeled as 依据位置, 原文摘要, or 确认记录 when visible. Use different wording for FLOW, DEC, ERR, STATE, SEQ, ADJ, EXT, and ROLE nodes. Clean Mermaid brackets, braces, quotes, HTML labels, and raw technical markers before showing the business label.
- Classify visual review into three tiers before promoting flow artifacts:
  - **No confirmation required**: trivial label, copy, formatting, or docs-only refresh; no new or changed flow semantics; no new nodes, branches, states, permissions, exceptions, or downstream readiness impact; and no visual artifact requires a direction choice. Record why confirmation was not required.
  - **Recommended confirmation**: small non-critical additions or readability/layout changes, including 1-2 non-critical nodes, branches, or labels, where source backing is clear and downstream readiness is not affected. The run may continue as a draft or with a warning, but must state what the user should review by visible label.
  - **Required confirmation**: first-time stable flow generation, major branch/state/permission/exception changes, 3 or more new flow nodes, explicit review requests, unclear user approval of the direction, model-inferred flow content that would be used beyond draft, or any change affecting stable memory, stable trace, gate PASS evidence, implementation readiness, or `READY_FOR_UI`. In those cases, end with a draft result and ask the user to confirm or request changes by visible label before promotion.
- When confirmation is recommended or required, show a concise Chinese flow
  review summary before asking the user to confirm. Do not only write "please
  confirm". The summary must let the user understand what they are confirming
  without opening every source file: business goal, source basis from PRD/spec
  or clarifications, actors, main flow stages, decisions, exception/recovery
  paths, state changes, UI contracts, system/external steps, draft or inferred
  parts, files to review, and visible labels to reference in feedback.
- If the flow draft contains a human decision point, explain the real business
  background in plain Chinese, give tiered decision options (`must_confirm` 3-4
  options, ordinary human-judgment nodes default to 3 options, and low-risk
  binary choices only 2 options with `options_count_rationale`), and make every
  option a business-readable executable exit. Each option must say what the
  reviewer chooses the model to do next, the concrete consequence, the
  downstream impact on scope, schedule, risk, UI, plan, tasks, implementation,
  or tests, the actionable `next_exit`, and why the recommended option is
  safest. The right rail shows this as three plain-language rows: `适合什么情况`
  from `when_to_choose`, `选了以后怎么做` from `consequence`, and
  `对项目有什么影响` from `project_impact`. Do not use reusable 模板句 /
  boilerplate such as "current evidence looks correct"; ground the wording in
  the current module, business object, branch, state, permission, exception
  path, or source document. Any 技术词 must be replaced with business language or
  immediately followed by a Chinese explanation / 中文说明, for example
  `网关配置(Gateway Profile，用来决定发布前由哪组规则拦截风险)`.
  Each option must also name 谁继续处理 after the choice, explain the cost of
  不选推荐, and keep 真实差异 between options; do not disguise the same route as
  保留 / 补充 / 调整 / 后续完善. Classify the decision before writing options:
  范围决策 decides how much work enters this batch and must explain scope,
  schedule, manual cost, and rework risk; 门禁决策 decides release, block,
  missing-material, or human-review exits and must explain who judges and the
  cost of false pass or false block; 降级决策 decides the fallback when the full
  capability is unavailable and must explain user experience, operational cost,
  release timing, and risk boundary.
  Keep the flow in `DRAFT_ONLY`, `NEEDS_DECISION`, or `BLOCKED` until the user
  completes confirmation of selected option.
- Default human confirmation strategy is `confirm_strategy: batch`. For a
  multi-module, multi-workset, or dependency-domain flow generation, generate or
  refresh all in-scope flow drafts first, add them to the batch review manifest,
  and set flow readiness to `WAITING_FOR_BATCH_REVIEW` until the user completes
  the batch confirmation. Do not interrupt the user for per-module confirmation
  unless the user selected `confirm_strategy: rolling`, the current run is a
  small hotfix, a core dependency must be locked before the rest, the batch is
  too large for one review, or reviewer availability requires a split. In those
  cases, record the downgrade reason and use `hybrid` or `rolling`.
- Batch confirmation must preserve human context: one flow batch should include
  `Batch ID`, `Batch Scope`, `Included Items`, `Excluded Items`, `Source
  Snapshot` or `Evidence Signature`, `Review Owner`, `Batch Review Status`,
  `Scoped Approval Policy`, and `Fallback Strategy`. Scoped approval does not
  unlock `READY_FOR_UI` unless needs-decision or unresolved decision items are
  explicitly split into a child batch and dependency impact is recorded.
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
- `--auto` may skip only the visual review gate; it must never skip Subject Scope, business domain anchor, Stage Entry Preflight, subject-confusion checks, batch confirmation, confirmation-document writeback, stale checks, owner approval, or authorization scope checks. If the current scope requires batch confirmation, `--auto` must still write `WAITING_FOR_BATCH_REVIEW` and request human authorization.

## Confirmation Document Schema

`specs/<feature>/flows/review/flow-confirmation.md` is the SP workflow authorization record for a confirmed flow batch. It must be Markdown with machine-readable frontmatter:

```yaml
document_type: sp_human_confirmation
command: /sp.flow
feature: <feature>
schema_version: 1
review_artifact: .specify/review/renderer/speccompass-review-renderer.html
review_artifact_mode: fixed-renderer | local-writer | server-preview | markdown-only
review_data_artifact: specs/<feature>/flows/review/flow-review-data.json
review_data_schema: .specify/review/schemas/flow-review-data.schema.json
review_validator: .specify/review/scripts/validate-review-data.mjs
confirm_strategy: batch | hybrid | rolling
batch_id: <Batch ID from the review manifest>
batch_scope: <confirmed flow scope>
batch_review_status: CONFIRMED | SCOPED_CONFIRMATION | NEEDS_REVISION | STALE | REVOKED
source_artifacts_snapshot:
  - path: specs/<feature>/spec.md
    digest: sha256:<...> | not-computed
    semantic_scope: [requirements, acceptance, flow]
    anchors: [<stable-heading-or-id>]
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
authorization_scope: READY_FOR_UI | BLOCKED | <narrow confirmed scope>
confirmed_items: [<flow/file-level labels or IDs authorized without node-level choice>]
needs_decision_items: [<node labels or IDs whose saved option next_exit starts with needs-decision; OPTION_B.next_exit must use this route>]
unresolved_decision_items: [<node labels or IDs with no selected option or no exit path>]
draft_excluded_items: [<node labels or IDs excluded because they were in DRAFT state at writeback time>]
decision_recorded_items: [<node labels or IDs whose saved option next_exit is a concrete continuation route and not needs-decision; usually OPTION_A/C/D>]
decision_records:
  - id: <visible label or stable ID>
    selected_option: OPTION_A | OPTION_B | OPTION_C | OPTION_D | NO_DECISION_REQUIRED
    selected_summary: <plain-language selected action>
    recommended_option: OPTION_A | OPTION_B | OPTION_C | OPTION_D | NO_DECISION_REQUIRED
    recommendation_reason: <why this option is recommended>
    project_impact: <impact on scope, schedule, risk, downstream UI/plan/implementation>
    next_exit: <next owner route or downstream stage unlocked by this choice>
    reviewer_note: <optional human note>
revision_requests:
  - target_ref: <module:item:node stable reference>
    target_label: <visible module / flow / node label>
    review_type: flow
    change_type: ADD_NODE | DELETE_NODE | MODIFY_NODE | MODIFY_BRANCH | ADD_EXCEPTION_PATH | SPLIT_SUBFLOW | MERGE_SIMPLIFY | ADD_ENTRY_EXIT | OTHER
    selected_option: OPTION_A | OPTION_B | OPTION_C | OPTION_D
    reviewer_note: <natural-language revision request / 自然语言修改意见>
    expected_model_action: <what the next /sp.flow run should revise>
    next_exit: <owner route or next stage>
child_batches:
  - batch_id: <child-batch-id>
    status: pending | confirmed | needs_revision | stale
    dependency_impact: <what remains blocked>
items_with_deviation:
  - id: <item-id>
    severity: deviation-minor | deviation-moderate | deviation-critical
    note: <deviation or inference note>
reservations: [<explicit reservations>]
revocation:
  status: active | revoked | superseded
  revoked_by: <name-or-None>
  revoked_at: <ISO-8601-or-None>
```

Node-level confirmation fields must use the selected option's `next_exit` as
the writeback classifier. A saved option whose `next_exit` starts with
`needs-decision` goes to `needs_decision_items`; by convention
`OPTION_B.next_exit` must start with `needs-decision` and `OPTION_B` never
counts as confirmed. A saved option whose `next_exit` is a concrete continuation
route and does not start with `needs-decision` goes to
`decision_recorded_items` and `decision_records`; this is usually
`OPTION_A/C/D`. Nodes with no selected option or no exit path map to
`unresolved_decision_items`. Nodes in DRAFT state must be listed only in
`draft_excluded_items` because draft choices must not enter `decision_records`
and must not look like authorized or ordinary unresolved decisions. Only
flow/file-level items authorized without a node-level choice go to
`confirmed_items`.

Do not promote flow `Stage Readiness` to `READY_FOR_UI` until this document
exists, has `human_confirmation: CONFIRMED`, has owner approval when required,
covers the requested authorization scope, and is not stale. Review manifests,
HTML draft state, screenshots, or browser-side review aids are not authorization
evidence until written to `flow-confirmation.md`.

Review pages are rendered by the reusable `speccompass-review-data` toolchain:
normal `/sp.flow` and `/sp.ui` commands must fill structured review data, must
not edit the fixed renderer, and must not write HTML/CSS/JS for the confirmation
surface. The renderer directory `.specify/review/renderer/` is multi-file fixed
infrastructure / 多文件固定基础设施; `speccompass-review-renderer.html` is only the
entry page and its `styles/*.css` and `scripts/*.js` are shared renderer assets.
Use `.specify/review/renderer/speccompass-review-renderer.html` as the fixed
renderer, write flow data to
`specs/<feature>/flows/review/flow-review-data.json`, validate it with
`.specify/review/scripts/validate-review-data.mjs` against
`.specify/review/schemas/flow-review-data.schema.json`, and keep the result as
draft when validation fails. 校验失败不能收尾，不能提升 readiness.

review data 是待审内容 / review data is draft review content. The Web review
page is not an editor / 不是编辑器 and does not directly edit flow or UI design /
不直接修改 flow 或 UI 设计. It collects local choices and exports authorization
text. If the reviewer rejects the recommendation, require a `change_type` plus
natural-language revision / 自然语言修改意见 and write it to `revision_requests` in
the confirmation document. Flow revision request types are `ADD_NODE`,
`DELETE_NODE`, `MODIFY_NODE`, `MODIFY_BRANCH`, `ADD_EXCEPTION_PATH`,
`SPLIT_SUBFLOW`, `MERGE_SIMPLIFY`, `ADD_ENTRY_EXIT`, and `OTHER`. A later
`/sp.flow` run must read existing `flow-confirmation.md` `revision_requests`,
apply the requested changes to the flow artifacts and `flow-review-data.json`,
validate the data again, and regenerate the review page before asking for fresh
confirmation.

Legacy compatibility is read-only: old `owner_approval.status: APPROVED` may be
read as `CONFIRMED`, and old `REJECTED` may be migrated or interpreted as
`NEEDS_REVISION`. New writes / 新写入 or newly generated flow confirmation
records must not use `APPROVED` or `REJECTED`; use the current confirmation
vocabulary instead.

## Purpose

- Lock stage order, branching, exception handling, and state progression.

## Read First

- Read `specs/<feature>/memory/index.md`.
- Read `specs/<feature>/memory/open-items.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, and rule lists that affect the target flow.

> Operational checks only: this section verifies SP inputs and routing needed to
> run the command. It does not describe the subject matter that the output should
> model.

## Stage Entry Preflight

- Confirm routing identifies one active feature and `spec.md` is current enough to define flow facts.
- Confirm upstream `Stage Readiness` is present in `spec.md` or `specs/<feature>/memory/index.md`, has `Status: READY_FOR_FLOW`, and includes a usable `Based On` plus `Source Snapshot` or `Evidence Signature`.
- Confirm the upstream `Source Snapshot` or `Evidence Signature` includes at least `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Missing fields are warnings for `/sp.analyze`, but they block stable flow generation when they prevent proving stage entry, risk closure, trace closure, or downstream readiness.
- If `Source Snapshot` or `Evidence Signature` is absent, treat the upstream readiness as not stable enough for stable flow generation. Route back to `/sp.specify` or the command that owns the readiness to refresh it; if all source evidence is visible and only the signature formatting is missing, refresh the readiness in that owner stage before continuing.
- If upstream readiness is missing, `SP_STAGE_SEED`, `NEEDS_CLARIFY`, `NEEDS_DECISION`, `BLOCKED`, `DRAFT_ONLY`, stale, contradicted by high-impact `memory/open-items.md`, or based only on `Source: model-inferred` / `[INFER:DRAFT]`, stop before generating flow artifacts and route to `/sp.specify` or `/sp.clarify`.
- Confirm the business domain before generating flow nodes: state the target business domain, product, user role, and feature being modeled. If this cannot be stated from `spec.md`, stop with `Blocker Type: SUBJECT_CONFUSION` or `UPSTREAM_DOC_GAP` and route to `/sp.specify` or `/sp.clarify`.
- Confirm the active flow request is for the target business product, not SP, SpecCompass, Spec Kit, command execution, memory management, preflight, gate, task routing, or methodology visualization. If the requested or inferred flow subject is the SP mechanism itself, stop with `Blocker Type: SUBJECT_CONFUSION`.
- Check whether user input changes product goal, source authority, requirements, acceptance, business rules, or scope boundary. If so, stop flow work and route to `/sp.prd`, `/sp.specify`, or `/sp.clarify` before creating or refreshing flow artifacts.
- Check whether the requested flow decision depends on unresolved user intent, conflicting requirements, risk acceptance, verification downgrade, permission ownership, or irreversible tradeoff. If so, route to `/sp.clarify` with the decision options instead of inventing the transition.
- Confirm existing flow artifacts are not only generic templates, stale drafts, or unconfirmed visual-review outputs being used as stable facts. If they are, keep the result draft or route to the owner command before promoting memory or trace.
- Confirm whether the current run belongs to an existing flow batch or starts a
  new one. If an existing `WAITING_FOR_BATCH_REVIEW` flow batch covers the same
  scope, update that batch instead of creating independent per-module
  confirmations. If source changes make the batch baseline stale, mark the batch
  stale and route to the owner refresh before adding more downstream evidence.
- If the source information is coarse but the business domain, user role, business goal, and feature boundary are clear, continue only by creating a bounded draft decomposition. Use common business-flow patterns to fill likely missing steps, mark each inferred step as `Source: model-inferred`, and keep it draft until user review or later analyze/gate checks. If the coarse source hides a business choice, security/permission rule, compliance rule, irreversible transition, pricing/settlement rule, or acceptance meaning, stop and route to `/sp.clarify` or `/sp.specify` instead of inferring it.
- If preflight fails, report `Missing/Weak Artifact`, `Blocker Type`, `Root Layer`, `Owner Route`, `Why current command cannot continue`, `Next /sp.* route`, and `Writeback Target`. Do not generate flow documents from missing or contradictory requirement facts just to satisfy downstream commands.

## Do

- Before generating any flow node, write a one-sentence business domain anchor that names the target product, target user, target business operation, and source requirement. Put this anchor visibly near the top of `flows/index.md` or the command summary, and use it to keep all flow nodes, labels, events, and UI contracts inside the business domain.
- Decompose the flow top-down before writing diagrams: business goal, actors, lifecycle states, mainline stages, decision points, exception/recovery paths, non-UI/system/external steps, UI contracts, and verification evidence.
- Flow Design Principles:
  - Business fit is the first constraint. A flow step, branch, state, exception, or handoff is valid only when it serves a source-backed business requirement, acceptance path, permission rule, data/state transition, recovery need, audit need, or user outcome.
  - Prefer the simplest sufficient flow. Do not add stages, approvals, confirmations, retries, states, actors, diagrams, or subflows unless they change business correctness, risk control, recovery, auditability, verification, or user outcome.
  - Keep flow units single-purpose and loosely coupled. Each subflow should have one business responsibility, clear entry/exit conditions, explicit inputs/outputs, and minimal assumptions about neighboring subflows.
  - Split when a branch has its own actor, lifecycle state, permission boundary, exception policy, verification path, or independent review value. Keep it inline only when splitting would hide a simple local decision.
  - When multiple valid flow shapes exist, offer 2-3 options with business impact and recommend the simplest one that satisfies the source requirements.
  - Do not optimize for diagram elegance over business truth. Do not merge distinct business responsibilities just to make one diagram shorter, and do not create new nodes for symmetry or decoration.
- When inputs are too brief, use bounded model inference to avoid an under-designed flow. Safe inferred details include common lifecycle stages, request/review/approve/reject/cancel/retry/audit patterns, empty or failure branches, timeout/retry behavior, notification or audit side effects, and verification checkpoints. Unsafe inferred details include new business rules, authority boundaries, pricing/settlement, data-retention/compliance, irreversible deletion, tenant/security permissions, or acceptance downgrades.
- Label inferred flow content clearly with `Source: model-inferred` or `OPEN-*` references. Inferred content may shape a review draft, but it must not close risks, replace user decisions, or become stable memory/trace until confirmed or checked.
- Use `[SRC:SPEC-*]`, `[SRC:CLARIFY-*]`, `[SRC:FLOW-*]`, `OPEN-*`, `Source: model-inferred`, or `[INFER:DRAFT]` markers for stable or draft flow rows so provenance is visible. Stable flow facts need source-backed provenance; `[INFER:DRAFT]` and `Source: model-inferred` are never stable evidence by themselves.
- If the coarse input admits multiple valid flow patterns, provide 2-3 design options with impact, recommendation, and next `/sp.clarify` or `/sp.flow` route. Do not silently choose a materially different business process for the user.
- Define the business mainline stages and actor boundaries.
- Capture state progression, branches, exceptions, defaults, and overrides.
- For each critical flow step, record the node type: `ui`, `system`, `external`, `scheduled`, `manual`, or `none_ui`.
- For each critical flow step, record a lightweight port contract: input, precondition or permission, business action, output or side effect, target state, failure path, and verification or acceptance evidence.
- For `ui` type steps, record only the business UI contract: fields to collect, business facts to show, end-user actions allowed, permissions, and error states. Leave layout and composition to `/sp.ui`. Wrong: "Display flow progress: Step 1 -> Step 2 -> Step 3". Right: "Collect approval reason and attachments, show request summary, allow submit/cancel for the submitter role, and show validation errors."
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
- If an earlier flow batch is still waiting for confirmation and the user moves
  to a downstream command or a new topic, remind the user that the batch is not
  stable, name the affected `Batch ID` and `Batch Scope`, and recommend returning
  to the batch review page. Do not suggest `/sp.ui`, `/sp.plan`, or `/sp.gate`
  until the batch is confirmed or explicitly split.
- After drafting but before writing files, run a subject-confusion scan. If any draft flow node, label, event, or UI contract primarily describes SP mechanics, command stages, routing, memory operations, or a process-display UI instead of the target business domain, discard the affected draft before file write, stop execution, and return a `SUBJECT_CONFUSION` blocker that instructs the next run to regenerate from `spec.md`.
- If the same feature or workset hits `SUBJECT_CONFUSION` twice for the same business-domain boundary, stop retrying and route to `/sp.clarify` with 2-3 boundary choices for the user to decide.

## Do Not

- Do not drift into UI screen design.
- Do not write delivery-layer implementation details.
- Do not leave missing branch handling implicit.
- Do not produce flow nodes, diagrams, actors, events, states, decisions, or written descriptions that represent SP's own command processing, routing, memory operations, preflight checks, gate decisions, workset management, or methodology stages.
- Do not use `/sp.*` commands, `spec.md`, `memory/index.md`, `trace-index.md`, `open-items.md`, `preflight`, `workset`, `gate`, or other SP-internal terms as business flow nodes unless the target product itself explicitly contains those user-facing concepts.
- Do not define `ui` type steps as workflow monitoring panels, process visualization views, state transition timelines, or flow diagrams as UI. They must describe target end-user business inputs, actions, visible business facts, permissions, and error states.
- Do not invent exception handling or state transitions that are not supported by `spec.md` or clarifications.
- Do not use deep default IDs such as `FLOW01.STEP04`, `UI03.BTN05`, or `API02.FIELD03` as stable public coordinates unless a recurring cross-document object truly needs promotion.
- Do not write draft flow assumptions into `memory/stable-context.md` or use them to close `OPEN-*`, `RISK-*`, `@t0`, or `@r0`.
- Do not suggest `/sp.ui`, `/sp.plan`, or `/sp.gate` as if the flow is stable when the current run requires batch confirmation or visual review and the user has not confirmed the draft.

## Output

- Create or update `specs/<feature>/flows/index.md`
- Create or update `specs/<feature>/flows/*.mmd`
- Create or update `specs/<feature>/flows/review/flow-review-batch.md` or an
  equivalent batch review manifest when confirmation is recommended or required.
  This Markdown manifest is a 备用 plain-text record only. Do not present
  `flow-review-batch.md` 作为主入口 for human review.
- Create or update structured review data at
  `specs/<feature>/flows/review/flow-review-data.json` using the
  `speccompass-review-data` skill when confirmation is recommended or required.
  Validate it with
  `.specify/review/scripts/validate-review-data.mjs` and
  `.specify/review/schemas/flow-review-data.schema.json` before presenting it in
  the fixed renderer. If validation fails, fix model-fixable data issues first;
  if the remaining gap requires human input, keep the flow as draft and route the
  gap explicitly. Review data fields are plain structured data: do not put
  HTML, CSS, JavaScript, SVG, class names, event handlers, or page layout
  instructions in any field, including `schema_notes` and `trace_notes`.
- If `specs/<feature>/flows/review/flow-confirmation.md` already contains
  `revision_requests`, read them before generating new flow review data. Treat
  each request as a model-actionable repair instruction, reason against the
  current PRD/spec/flow sources, update the flow artifacts and review data, and
  then regenerate the Web review page. Do not ask the reviewer to directly
  edit the flow in the browser page.
- After the user completes batch confirmation, write or update
  `specs/<feature>/flows/review/flow-confirmation.md` using the Confirmation
  Document Schema above. This Markdown file is the authorization evidence
  downstream commands must read before treating flow artifacts as stable input.
- Present flow review data with the fixed renderer main entry
  `.specify/review/renderer/speccompass-review-renderer.html?flow=<feature>`.
  Command output must point reviewers to this Web review page first because it
  auto-loads `specs/<feature>/flows/review/flow-review-data.json` by short URL
  parameter; the `flow-review-batch.md` file is only a fallback text record.
  普通 `/sp.flow`、`/sp.ui`
  不得修改 renderer or renderer directory `.specify/review/renderer/` and must
  only fill structured review data / 只填结构化
  review data; it must not write HTML/CSS/JS for the confirmation surface /
  不得为确认页编写 HTML/CSS/JS. The renderer is multi-file fixed infrastructure /
  多文件固定基础设施; do not modify its HTML entry, CSS files, JavaScript files,
  layout rules, click handlers, persistence, or summary logic during normal
  `/sp.flow` and `/sp.ui` runs. The fixed renderer's right feedback rail is mandatory
  for human confirmation. The fixed renderer owns the unified template,
  right feedback rail, selected-state behavior, browser draft handling,
  confirmation-package download, summary-copy fallback, navigation safety,
  native SVG/DAG review rendering, and
  accessibility details.
  `/sp.flow` must instead provide complete data for that renderer: project
  business overview / 项目整体业务地图, module summary / 模块简介, per-flow summary
  / 流程简介, fullscreen-capable diagram metadata, stable node IDs, review
  labels, globally unique `node.id` values across the whole review data file,
  `review_layer`, `review_level`, owner, `node_kind`, source refs,
  tiered `OPTION_A`/`OPTION_B`/`OPTION_C`/`OPTION_D` choices,
  `recommended_option`, required `consequence`, required `project_impact`,
  required actionable `next_exit`, `options_count_rationale` when a low-risk
  binary choice uses only 2 options, batch scope, pending-decision routes,
  blocker/stale reasons, and writeback target `flow-confirmation.md`.
  `must_confirm` nodes must have 3-4 options; ordinary human-judgment nodes
  default to 3 options; low-risk binary choices may use 2 options only with
  `options_count_rationale`. Each option must carry three user-facing meanings:
  `适合什么情况` / `when_to_choose`, `选了以后怎么做` / `consequence`, and
  `对项目有什么影响` / `project_impact`. It must say 谁继续处理, state the
  不选推荐 cost, and show 真实差异 between options. Choose a decision template
  before writing the options: 范围决策, 门禁决策, or 降级决策. Run
  `.specify/review/scripts/validate-review-data.mjs`; it must reject repeated
  option copy, 模板句 / boilerplate, unexplained 技术词, vague approve/defer/reject
  exits, missing actionable `next_exit`, missing continuation owner, missing
  why-this-must-be-decided-now copy, and overly similar `project_impact` copy.
  Use Tiffany Blue
  `#0ABAB5` and `huashu-design` only as renderer/design authority metadata in
  the review data. Page implementation details live in
  `.specify/review/renderer/README.md`. If HTML review is unavailable, the
  Markdown batch review manifest must expose the same review data fields.
- Refresh `specs/<feature>/memory/stable-context.md` only when source-backed or checked flow facts changed, or when routing changed. Draft inferences stay in `flows/*` or `memory/open-items.md`.
- Refresh `specs/<feature>/memory/trace-index.md` only when stable trace links changed. Draft links stay in `flows/*` or `memory/open-items.md` until checked.
- Refresh `specs/<feature>/memory/index.md` if routing changes
- Write or refresh flow `Stage Readiness` in `specs/<feature>/flows/index.md` or `specs/<feature>/memory/index.md`: include `Stage`, `Status`, `Based On`, `Source Snapshot` or `Evidence Signature`, `Confirm Strategy`, `Batch ID`, `Batch Scope`, `Batch Review Status`, `Unresolved Blockers`, `Needs Decision`, `Inferred/Draft Items`, `Next Allowed Stage`, and `Writeback Target`. The signature must include `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Use `WAITING_FOR_BATCH_REVIEW` when the batch is generated but not confirmed. Use `READY_FOR_UI` only when the source-backed flow, port contracts, UI contracts, provenance, batch or visual-review status, and open blockers are clean; otherwise use `DRAFT_ONLY`, `NEEDS_DECISION`, or `BLOCKED` with the next owner route.
- Add `Status Reason` to every blocked or non-ready item in the diagram, table, review rail, manifest, open item, or Stage Readiness. The reason must be 10-30 Chinese characters (or equivalent short English phrase for English-language projects), explain the root cause and impact, and sit directly after statuses such as `BLOCKED`, `NEEDS_DECISION`, `WAITING_FOR_BATCH_REVIEW`, `DRAFT_ONLY`, `STALE`, or `REJECTED`.

## Check Before Finish

- Confirm the mainline and exception paths are both visible.
- Confirm every non-trivial node, branch, state, exception, handoff, and subflow exists for a business reason, not diagram symmetry.
- Confirm the mainline is the shortest source-backed path that satisfies acceptance, permissions, state progression, and recovery needs.
- Confirm each subflow has one responsibility, clear input/output boundaries, and no hidden dependency on neighboring subflows.
- Confirm split/inline decisions are recorded when a branch is large, cross-actor, permissioned, independently verifiable, or exception-heavy.
- Confirm simplification did not remove required permissions, auditability, recovery, verification evidence, or source-backed exception handling.
- Confirm the flow is not under-decomposed: it covers business goal, actors, mainline stages, decisions, exceptions, state changes, non-UI/system steps, UI contracts, and verification evidence, or records explicit open items for missing parts.
- Confirm any `Source: model-inferred` flow content is marked as draft, traceable to the source requirement, and not promoted to stable memory/trace without confirmation or current evidence.
- Confirm every stable flow node, decision, event, state, UI contract, and exception path has provenance such as `[SRC:SPEC-*]`, `[SRC:CLARIFY-*]`, `[SRC:FLOW-*]`, or an explicit `OPEN-*`; `[INFER:DRAFT]` and `Source: model-inferred` do not qualify as stable provenance.
- Confirm state transitions are consistent with the clarified business rules.
- Confirm every critical flow step has node type and port contract coverage, or an explicit `OPEN-*` / `RISK-*` item.
- Confirm every `ui` type step links to a UI contract or an open item, and every non-UI step has a trigger and verification route.
- Confirm direct-neighbor data-linkage checks are visible for any step that changes state, data, permission, event, persistence, side effect, or acceptance meaning.
- Confirm every Mermaid artifact matches the written description.
- Confirm flow visuals or renderable Mermaid files show human-review labels and
  that each label maps back to a structured source row or anchor.
- Confirm every reviewable diagram obeys the node budget: 5-7 business nodes
  is the normal target, 8 or more business nodes triggers a split warning, and
  10 or more business nodes must be split before confirmation unless a visible
  qualified complex-flow exception reason explains why it cannot be split, the
  preconditions, postconditions, segment review order, and pass criteria, or a
  qualified low-risk linear exception says there is no high-risk decision,
  permission, irreversible result, external dependency, or exception branch and
  provides a collapsible segment checklist for smaller review chunks.
- Confirm node granularity is honest: state changes, role handoffs, external
  calls, permission or approval decisions, user-visible result changes, failure
  or recovery paths, persistence side effects, and acceptance-evidence changes
  are not hidden inside one vague node. Confirm any complex-flow exception
  includes concrete coupling, preconditions, postconditions, segment review
  order, and segment pass criteria.
- Confirm the human-focused review page includes a project business overview / 项目整体业务地图, module summary / 模块简介, per-flow summary / 流程简介, fullscreen / 全屏 diagram action, replacement actions for legacy bulk approve / 全部通过 and bulk block / 全部阻塞, selected diagram, subflow, or node details / 选中的图、子流程或节点, and collapsible / 折叠 source or index preview panels. Confirm old bulk approve / 全部通过 and bulk block / 全部阻塞 buttons are removed from node-level primary actions; historical names may appear only in migration notes.
- Confirm module summaries, flow summaries, node titles, node-card short copy, and option descriptions were already written in human business language at generation stage / 生成阶段, not fixed later by the review page. Confirm the review page is not a copy cleanup layer / 审核页不是文案清洗器, and that the output does not generate technical wording first and then rely on page translation / 不能先生成技术话术再依赖页面翻译. Confirm 业务模块默认文案不得套用系统/架构兜底; 系统/架构话术只能用于 `system_arch` 层. Confirm module-level review layer is not inferred from broad `flows/index.md` words such as direct-neighbor, cross-module, evidence chain, or adjacency checks; feature-level and diagram-level layer checks must be separate. Confirm 精确业务语境匹配 runs before broad matching for 通知/模板/开发者门户/API Key/AI modules.
- Confirm review data can support selecting a diagram node to focus the right
  rail on that single checkpoint / 右侧节点栏只显示该确认点, with a visible action to
  show all checkpoints again. Confirm the left navigation can show one pending
  must-confirm counter / 待处理必审 X/Y in red for each module, where X is
  unresolved and Y is the total must-confirm / 总必审 count, with no second
  `当前图必审` or `当前视图必审` counter; Y must be sourced only from diagram-backed
  nodes that can display red markers in the diagram, while index-level labels
  and file-level fallback confirmations stay out of the left total and only
  appear in authorization summaries. Confirm module switching cannot change Y
  or imply that the module total changed. Confirm the data has enough stable
  IDs for real-time / 实时 counter refresh, red marker / 红色标记 rendering inside
  the node / 内部右上角, selected state / 选中态, collapsible / 折叠 supporting
  copy, tooltip / 悬浮提示 or popover help, and non-duplicate / 同一信息 grouped
  right-rail facts. Renderer-specific mechanics stay in the renderer README.
- Confirm the right confirmation rail is scoped to the current center view while copied/written authorization summaries cover the full batch across every diagram, file, and index-level review label. Confirm index preview mode disables current-flow bulk recommended-option / 当前流程批量按推荐确认 whenever Mermaid flow files exist, and that `NOT_APPLICABLE_FOR_UI` modules with Mermaid files can still enter diagram review.
- Confirm review data marks which nodes need feedback by default / 节点反馈默认折叠,
  which nodes are pending reviewer notes, and which current-flow bulk / 当前流程批量
  recommended-option, needs-decision, and reset actions are in scope. Confirm
  reset semantics are described as clearing only current-view browser draft
  choices and never deleting `flow-confirmation.md` authorization.
- Confirm current-flow bulk recommended-option / 当前流程批量按推荐确认 is disabled / 禁用 when the current diagram has 10 or more business nodes without a specific complex-flow exception reason covering the cannot-split reason, preconditions, postconditions, segment review order, and segment pass criteria, and without a qualified low-risk linear exception that has no high-risk decision, permission, irreversible result, external dependency, or exception branch plus a collapsible segment checklist. Confirm DEC node cards highlight the default path / 默认路径 review warning.
- Confirm node cards distinguish 业务层面 from 系统/架构层面, route product-facing items to 产品经理, route technical support/governance items to 系统负责人, and mark system/architecture items as 无需产品确认 when shown in product review.
- Confirm node cards use the 6 类 review levels 必须确认, 建议确认, 存疑, 关键环节, 已验证, and 系统/架构确认. Confirm 已 PRD 验证 and 已 spec 验证 use the same 已验证 color/level and differ only in the remark.
- Confirm node cards are human-readable / 说人话 and use default compact node copy / 默认短句 at the top. The default layer must be a 业务决策卡 / business decision card that can be understood in 5 秒 / a 5-second scan and follows 首屏无技术 / technical-free first screen. It shows only the node label, review level, owner, status, one `请判断...` action prompt, the recommended choice with one short reason, and executable options. Confirm selected-node facts use 谁确认, 要决定, 推荐选法, 确认状态, and 已写意见. Confirm 业务决策卡只能作为内部概念 and 默认层不得显示可见标题“业务决策卡”. Confirm the card body stays within three compact rows and the top copy is one business decision / 一句业务判断, not a field table. Confirm separate 这是什么 / 要决定什么 / 怎么选 rows do not appear in the default layer. Confirm each option defaults to title plus one short "when to choose this" sentence. Confirm technical/table labels such as 对象类型, 判断点, 来源, 主流程图, 节点说明, 审核人要看什么, 关联业务, 为什么存在, 需要判断什么, 不需要管什么, 节点做什么, 通过标准, 可以通过的标准, 风险提示, and 常见风险 do not appear in the default layer. Supporting copy must use plain labels such as 节点动作, 审核重点, 业务影响, 审核原因, 无需审核, 继续条件, 常见问题, 依据位置, 原文摘要, trace fields, 选择后会发生什么, 项目影响, 推荐理由, 后续出口, 授权追溯, and 确认记录 only in collapsible supporting copy / 折叠详情 or folded feedback controls, with dedicated wording for FLOW, DEC, ERR, STATE, SEQ, ADJ, EXT, and ROLE.
- Confirm every renderable flow diagram uses a top-down main-trunk layout with
  the mainline centered, exceptions/recovery/blockers side-expanded, stable IDs
  separated from concise visible business labels, and no unnecessary crossing
  lines.
- Confirm the fixed SpecCompass review renderer is not Mermaid-based and uses structured JSON plus native SVG/DAG layout for the review page. For Mermaid source/previews, confirm readable font size between 16px and 18px, `useMaxWidth: false`, tuned `nodeSpacing` and `rankSpacing`, and no whole-SVG shrink that makes complex diagrams unreadable. Confirm `sequenceDiagram` files render as sequence diagrams without flowchart label wrapping; every translated or punctuation-containing participant/actor alias is safely double-quoted and escaped. Confirm external Mermaid preview switching clears the old SVG, shows `正在渲染`, and uses a render token or equivalent stale-render guard.
- Confirm the review page uses the required scroll model: left module navigation scrolls independently; center diagram area and right confirmation rail scroll as one review workspace; the right rail has no sticky/max-height clipping.
- Confirm the right feedback rail includes per-node decision options, per-node feedback input, and an English label glossary for visible terms such as `FLOW`, `DEC`, `ERR`, `STATE`, `ROLE`, `BLOCKED`, and `DRAFT`.
- Confirm every human-judgment node has tiered decision options, a clear `recommended_option`, required `when_to_choose` with real business background, required `consequence`, required `project_impact`, required actionable `next_exit`, and confirmation of selected option. The option copy must explain `适合什么情况`, `选了以后怎么做`, and `对项目有什么影响`: what the reviewer chooses the model to do next, 谁继续处理 after selection, downstream impact on scope, schedule, risk, UI, plan, tasks, implementation, or tests, the cost of 不选推荐, and why the recommended option is safest. `must_confirm` nodes require 3-4 options; ordinary human-judgment nodes default to 3 options; low-risk binary choices may use 2 options only with `options_count_rationale`. Options in the same node must have 真实差异 and must be shaped by one of three decision templates: 范围决策, 门禁决策, or 降级决策. The wording must not repeat 模板句 / boilerplate across options; any visible 技术词 must have an immediate Chinese explanation / 中文说明. Confirm `.specify/review/scripts/validate-review-data.mjs` passes so lazy labels, repeated impact copy, missing owner, and missing why-now copy are caught before closeout. Confirm saved options whose `next_exit` starts with `needs-decision` write to `needs_decision_items` (`OPTION_B.next_exit` must use this route and never counts as confirmed), saved concrete continuation routes such as `OPTION_A/C/D` write to `decision_recorded_items`, and unresolved nodes write to `unresolved_decision_items`. Do not use approve/defer/reject/block as the node-level primary interaction; statuses such as `BLOCKED` or `NEEDS_DECISION` may appear only as system results with a reason, owner, repair route, and exit path.
- Confirm long node labels / 长节点标签 wrap before Mermaid render, including same-line node-and-edge Mermaid syntax, and that CSS allows node labels to wrap without shrinking the whole diagram below readability.
- Confirm diagram-to-rail two-way linkage / 双向联动 is data-addressable:
  clicking a node card / 点击右侧节点卡 and clicking a diagram node / 点击流程图节点
  both reference the same stable node ID, source ref, and review label. The
  renderer README owns selected-state and keyboard behavior such as Enter/Space.
- Confirm `NOT_APPLICABLE_FOR_UI` modules with Mermaid flow files still show / 主视图必须显示 the reviewable flow diagram, and only show an empty not-applicable main view when no Mermaid flow diagram exists.
- Confirm blocked, pending decision, and stale statuses are visible both in the
  diagram or table and in the right feedback rail. A non-empty Pending Decisions
  list, any decision node missing an explicit default path, or any undefined branch exit must keep `Stage Readiness.Status` as `NEEDS_DECISION` or
  `BLOCKED`, not `READY_FOR_UI`. Confirm every decision node has an explicit default path before promotion.
- Run a subject-confusion scan: confirm no flow node, actor, event, state, decision, diagram label, or written flow description uses `/sp.*`, `sp.*`, `memory/index.md`, `trace-index.md`, `open-items.md`, or `SUBJECT_CONFUSION` as business content. Treat broader terms such as `preflight`, `Allowed Write Set`, `Required Checks`, or `NEEDS_DECISION` as contextual analyze/gate findings, not automatic mechanical failures. If clear control-plane content is found, stop, discard the affected flow content, and return a `SUBJECT_CONFUSION` blocker with the exact `specs/<feature>/spec.md` read target and next `/sp.flow` route. Do not regenerate in the same run.
- Confirm draft assumptions are labeled or routed to `memory/open-items.md` instead of being promoted to stable memory.
- Confirm any open branch, state conflict, or unresolved exception is registered in `memory/open-items.md`.
- Confirm whether the visual review gate was required, skipped, or already satisfied. If required and not satisfied, confirm the flow remains a draft and is not promoted to stable memory or stable trace.
- Confirm whether the default batch confirmation applies. If it applies and is
  not complete, confirm `Stage Readiness.Status` is `WAITING_FOR_BATCH_REVIEW`,
  the batch manifest lists all in-scope flow items, and downstream commands are
  blocked until confirmation or explicit batch split.
- Confirm flow `Stage Readiness` is not `READY_FOR_UI` when source provenance is missing, draft inference is used as stable evidence, batch/visual review is still required, `SP_STAGE_SEED` remains, or high-impact open items remain.
- Run the `Finish Quality Gate` before closeout:
  ```yaml
  Finish Quality Gate:
    model_fixable_issues: none | present
    human_blockers: none | present
    self_fix_rounds: 0-3
    quality_result: QUALITY_PASSED | CONTINUE_FIXING | HUMAN_BLOCKED | EXHAUSTED_BLOCKED
    evidence: <current checks, files, diagram labels, review artifacts, and blocker routes>
  ```
  Do not stop to report while model-fixable quality issues remain. Continue fixing incomplete port contracts, unreadable diagrams, missing right feedback rail, missing `Status Reason`, malformed review manifests, missing source labels, or flow/UI contract gaps until `QUALITY_PASSED`, `HUMAN_BLOCKED`, or `EXHAUSTED_BLOCKED`. If the remaining issue needs human input, source authority, or a decision, return `HUMAN_BLOCKED` with a 10-30 Chinese characters (or equivalent short English phrase for English-language projects) `Status Reason`, background, impact, options, recommendation, and owner route. CONTINUE_FIXING is an internal loop state; do not use it as the final output status of this command. If three self-fix rounds cannot resolve the same issue, return `EXHAUSTED_BLOCKED` with the failure signature and next route.

## Next

- End every run with a concrete closeout recommendation. Do not only list possible next commands. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.
- Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, flow `Stage Readiness`, and this flow evidence. If flow readiness is missing or blocked, recommend `/sp.flow`, `/sp.clarify`, or `/sp.specify` with the exact blocker route instead of downstream work.
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
- Recommend `/sp.ui <feature>` or `/sp.gate <feature>` only when flow `Stage Readiness` is `READY_FOR_UI`; if the status is `WAITING_FOR_BATCH_REVIEW`, recommend the flow batch review/confirmation route and list `/sp.ui`, `/sp.plan`, and `/sp.implement` under `DO_NOT_RUN`.
- Suggest `/sp.ui` or `/sp.gate` only when flow `Stage Readiness` is `READY_FOR_UI`.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
- End with a visual review prompt and batch confirmation prompt when renderable text diagrams, exported
  images, or flow previews exist. Tell the user:
  - a short Chinese flow review summary before the confirmation request:
    `设计依据` from PRD/spec/clarifications, `业务目标`, `参与角色`,
    `主流程`, `决策点`, `异常/恢复`, `状态变化`, `UI 契约`,
    `系统/外部步骤`, `草稿或推理项`, and `需要确认的问题`;
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
- If batch confirmation or visual review is required, do not present `/sp.ui` or `/sp.gate` as the immediate next step until the user confirms the flow draft
  or selects a repair option.
  The immediate recommendation should be the confirmation/repair action, with a
  copy-pasteable `/sp.flow <feature>` command that tells the next run exactly
  which visible flow/decision/exception labels to confirm or revise.
