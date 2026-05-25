# `sp` 命令模板草案

> 目标：把 `sp` 命令规范继续细化为可迁入原版 `Spec Kit` fork 的命令正文草案。
>
> 状态说明：本文是模板设计草稿。当前真实触发形式已经收敛为 Codex `$sp-*`、Claude `/sp-*`、其他 slash-host `/sp.*`。本文保留正文设计草案，但宿主包装必须以当前 project-local integration 机制为准。

## 1. 使用方式

这份文档不是运行时实现，而是模板层设计稿。

后续 fork 原版 `Spec Kit` 时，可将这里的正文迁移到不同 agent 的命令模板文件中：

- Codex skills 使用 `$sp-*`
- Claude skills 使用 `/sp-*`
- 传统 slash-host 使用 `/sp.*`

要求：

- 不同触发表面复用同一套正文语义
- 差异只放在命令文件位置、文件命名和 agent 特定包装
- 不同 agent 不应拥有不同的业务流程定义

## 2. 全局模板约束

每个命令模板都应先继承以下全局约束：

- 当前阶段只做文档工作，不进入代码实现
- 必须优先读取已有产物，不能凭空重写
- 必须显式暴露缺口、冲突、待确认问题和阻塞项
- 必须把输出落到 `specs/<feature>/` 下的标准路径
- 如果当前步骤的输入尚不稳定，应停止扩写并指出回退步骤
- 如果 `memory/index.md` 已存在，必须先读它
- 只针对当前目标区域展开源文档，不要默认重读整个 feature
- 如果本步改变了稳定事实、开放问题、追踪链或局部工作面，必须刷新对应 `memory/*`
- `memory/*` 的首屏优先放查询入口、过滤表和热点项，不优先放长段总结
- 小窗口 agent 首轮默认不超过 `7` 个文件，中窗口默认不超过 `9` 个文件，大窗口默认不超过 `12` 个文件
- `.specify/memory/active-context.md` 给出的项目级最小阅读集默认不超过 `5` 个文件
- 默认先路由到 `1` 个 active feature，再路由到 `1` 个主 workset
- 若 `screens >= 12`、`flows >= 12`、`tables >= 20`，或已出现两个以上明显子主题，则 `sp.plan` 至少拆成 `2` 个 `ws-*.md`
- 若 `screens >= 20`、`flows >= 20`、`tables >= 40`，或已跨两个以上业务域，则按接近中型规模处理
- 若规模达到或接近 `50` 个界面、`50` 条流程、`100` 张表，则视为中型项目工作负载，`sp.analyze` 未执行冒烟检查时不得判 `PASS`

推荐在每个命令正文前附一段统一前言：

```text
You are executing the document-stage `sp` workflow on top of the original Spec Kit mechanism.
Stay within documentation work only.
Reuse existing project context and active feature state.
Do not write production code.
If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
If `memory/index.md` exists, read it first and use it as the default routing entry.
Expand to source documents only for the current target area.
Respect the query-first memory layout and keep the read set within the current context budget.
Route to one active feature and one primary workset by default unless the task explicitly requires a broader comparison.
If required inputs are missing or unstable, stop and report the gap explicitly.
```

## 3. 命令正文草案

## 3.1 `sp.constitution`

调用形式：

- Codex: `$sp-constitution`
- Claude: `/sp-constitution`
- 传统 slash-host: `/sp.constitution`

正文草案：

```text
Purpose
- Establish the project constitution for the layered document workflow.
- Define hard boundaries between business clarification and delivery design.

Read First
- Read current project README and any existing constitution or team principles.
- Read the layered workflow rules and command spec if they already exist.

Do
- Write or update the constitution so it explicitly states:
- this project uses a two-layer document workflow
- the current stage covers documentation only
- flow assets use Mermaid
- UI documentation uses Markdown plus JSON Forms
- second-layer work starts only after gate passes
- the document workflow stops at `sp.analyze`
- Preserve compatibility with the original Spec Kit workflow where practical.

Do Not
- Do not start writing feature documents.
- Do not define production code standards here.
- Do not leave ambiguous stage boundaries.

Output
- Update `.specify/memory/constitution.md`
- Update `.specify/memory/project-index.md`
- Update `.specify/memory/feature-map.md`
- Update `.specify/memory/domain-map.md`
- Update `.specify/memory/active-context.md`
- Update `.specify/memory/hotspots.md`

Check Before Finish
- Confirm the constitution clearly defines what is allowed and what is blocked in this stage.
- Confirm cross-platform and cross-agent compatibility principles are stated.

Next
- Suggest `sp.specify`
```

## 3.2 `sp.specify`

调用形式：

- Codex: `$sp-specify`
- Claude: `/sp-specify`
- 传统 slash-host: `/sp.specify`

正文草案：

```text
Purpose
- Create the first baseline requirement document for the active feature.
- Capture what the feature is and why it matters.

Read First
- Read `.specify/memory/constitution.md`.
- Read `.specify/memory/project-index.md` if it exists.
- Read the user request, related notes, and any existing docs for the active feature.

Do
- Write `spec.md` for the active feature.
- Capture business objective, target users or roles, in-scope items, out-of-scope items, and success criteria.
- Keep the language requirement-focused and business-focused.
- Separate user goals from solution ideas if both appear in the input.
- Register the active feature in `.specify/memory/feature-map.md`.
- Refresh `.specify/memory/active-context.md` so later agents can route into this feature quickly.

Do Not
- Do not write code, architecture, database, API, framework, or deployment design.
- Do not silently convert assumptions into decisions.

Output
- Create or update `specs/<feature>/spec.md`
- Create or update `.specify/memory/feature-map.md`
- Create or update `.specify/memory/active-context.md`
- Create or update `specs/<feature>/memory/index.md`
- Create or update `specs/<feature>/memory/stable-context.md`
- Create or update `specs/<feature>/memory/open-items.md`

Check Before Finish
- Confirm the document explains what and why, not production delivery details.
- Confirm scope boundaries and non-goals are visible.
- Confirm unresolved areas are marked instead of guessed.
- Confirm the project-level feature routing now points to the active feature.
- Confirm the feature memory entry has been initialized for later steps.

Next
- Suggest `sp.clarify`
```

## 3.3 `sp.clarify`

调用形式：

- Codex: `$sp-clarify`
- Claude: `/sp-clarify`
- 传统 slash-host: `/sp.clarify`

正文草案：

```text
Purpose
- Act as the unified clarification entry for document-stage business decisions.
- Resolve high-impact gaps or conflicts coming from `spec`, `flow`, or `ui`.

Read First
- If `specs/<feature>/memory/index.md` exists, read it first.
- If `specs/<feature>/memory/open-items.md` exists, read it before asking new questions.
- Read `specs/<feature>/spec.md`
- Read `specs/<feature>/clarifications.md` if it exists.
- Read `specs/<feature>/clarify-log.md` if it exists.
- Read the current source area if the issue came from `flows/*` or `ui/*`.
- Read any user follow-up notes and prior clarification records.

Do
- Identify whether each question belongs to `CF-SPEC`, `CF-FLOW`, or `CF-UI`.
- Decide whether each question is `Immediate` or `Batch`.
- Ask macro route questions first before local detail questions.
- Treat a question as `Immediate` if it changes scope, mainline stages, primary page grouping, owner boundaries, or blocks the current step.
- Treat a question as `Batch` only if it is local, safe to defer, and can be grouped with the same topic without changing the route.
- Group deferred questions by `Queue Topic` instead of by document order.
- Flush a batch queue when the same topic reaches `3` pending items, when the same workset loops twice on the same uncertainty, or before `sp.gate`, `sp.bundle`, or `sp.plan`.
- If a batch queue cannot be flushed into one safe structured question, step back and ask a higher-level route question immediately.
- If the issue came from a flow or UI adjustment request, resolve the natural-language description to a single `Target ID` before proposing options.
- Use standard modification sentence patterns when drafting or restating the question:
- `把 <Target ID> 的 <属性> 改成 <新值>`
- `删除 <Target ID>，并把 <影响对象> 并入 <目标对象>`
- `把 <Target ID> 从 <旧 Owner ID> 移到 <新 Owner ID>`
- `把 <Target ID> 拆成 <新 Target ID A> 和 <新 Target ID B>`
- `把 <Target ID A> 和 <Target ID B> 合并为 <新 Target ID>`
- If the user speaks in natural language, restate the resolved mapping explicitly, for example:
- `申请页提交按钮` -> `ACTION-LEAVE-APPLY-020`
- `审批页驳回原因框` -> `FIELD-LEAVE-APPROVAL-010`
- `列表页筛选区` -> `SECTION-LEAVE-LIST-010`
- Write the business framework before detailed flows:
- define the business mainline stages
- define actor responsibility boundaries across those stages
- define how core objects move through the business mainline
- define key decision points and explicit out-of-scope extensions
- keep the framework in a fixed section order for consistency across features
- Expand role definitions, business objects, rules, state changes, branches, exceptions, defaults, overrides, and acceptance examples.
- Default to single-select or multi-select questions with optional remarks.
- Keep single-select questions at `2` to `4` options when possible.
- Keep multi-select questions at `2` to `6` safely composable options when possible.
- Generate only bounded options that fit the current framework and do not create hidden contradictions.
- If safe low-level options cannot be formed, step back and ask a more macro route question instead.
- Record open questions separately when the input is not strong enough for a decision.
- Update `spec.md` only where clarification stabilizes the baseline requirement.
- Write stable conclusions to `clarifications.md`.
- Write the question history, options, selected answers, impact scope, revisit conditions, and when applicable `Target Type`, `Target ID`, `Canonical Name`, `Alias Keywords`, `Owner ID`, `Operation`, `Affected IDs`, `Affected Documents`, `Queue Topic`, `Queue Size`, `Flush Trigger`, and `Latest Safe Step` to `clarify-log.md`.

Do Not
- Do not jump to process diagrams, UI design, or delivery design.
- Do not hide rule conflicts.
- Do not create separate command surfaces such as `cf_spec`, `cf_flow`, or `cf_ui`.
- Do not rely on open free-form answers when a safe structured question can be asked.
- Do not modify a flow or UI object before the target-resolution path is explicit enough for another agent to reproduce.

Output
- Update `specs/<feature>/spec.md` if the baseline requirement changed.
- Create or update `specs/<feature>/clarifications.md` if a stable conclusion changed.
- Create or update `specs/<feature>/clarify-log.md`
- Create or update `specs/<feature>/memory/stable-context.md`
- Create or update `specs/<feature>/memory/open-items.md`
- Create or update `specs/<feature>/memory/trace-index.md`

Check Before Finish
- Confirm the business framework is explicit enough that another agent can explain the feature top-down before reading any diagrams.
- Confirm the framework uses this fixed order:
- `Mainline Stages`
- `Stage Responsibility Boundaries`
- `Object Flow Backbone`
- `Top-Level Decision Points`
- `Capability Boundaries`
- Confirm each clarification item is tagged as `CF-SPEC`, `CF-FLOW`, or `CF-UI`.
- Confirm blocking route-level questions were asked immediately.
- Confirm deferred local questions were explicitly queued for batch clarification.
- Confirm no `Batch` question changed route, scope, owner, mainline stage, or primary page grouping.
- Confirm each batch queue has an explicit `Queue Topic`, `Flush Trigger`, and `Latest Safe Step`.
- Confirm all pending batch queues were checked for mandatory flush before `sp.gate`, `sp.bundle`, or `sp.plan`.
- Confirm question options are mutually exclusive or safely composable.
- Confirm stable conclusions are in `clarifications.md` and decision history is in `clarify-log.md`.
- Confirm every flow or UI change request can be traced to a unique `Target ID`.
- Confirm the target-resolution path is recoverable from `Canonical Name`, `Alias Keywords`, `Owner ID`, and source links.
- Confirm key rules include applicability, priority, and exceptions.
- Confirm open questions are explicit.
- Confirm no technical design has leaked in.
- Confirm the stable context, open items, and trace entry have been refreshed.

Next
- If this clarification came right after `sp.specify`, suggest `sp.flow`.
- If it was triggered from `sp.flow` or `sp.ui`, suggest returning to that blocked step.
```

## 3.4 `sp.flow`

调用形式：

- Codex: `$sp-flow`
- Claude: `/sp-flow`
- 传统 slash-host: `/sp.flow`

正文草案：

```text
Purpose
- Convert clarified business behavior into inspectable flow assets.

Read First
- If `specs/<feature>/memory/index.md` exists, read it first.
- Read `specs/<feature>/spec.md`
- Read `specs/<feature>/clarifications.md`

Do
- Create or update `flows/index.md` as the flow routing entry before detailed diagrams.
- Create a main Mermaid flowchart for the normal path and key branching points.
- Create a Mermaid sequence diagram for actor-system interaction order.
- Create a Mermaid state diagram for state transitions and triggers.
- Assign stable `FLOW-*`, `STEP-*`, `DEC-*`, and `EX-*` identifiers to the flow assets that may be referenced later.
- Record `Canonical Name`, `Alias Keywords`, and `Owner Stage` in `flows/index.md`.
- Keep naming aligned with the business terminology already used in the docs.
- Refresh `memory/trace-index.md` with the key `FLOW-*` chains.

Do Not
- Do not invent missing rules just to complete a diagram.
- Do not use BPMN or high-fidelity visual design tools.
- Do not overload a single diagram with too many mixed concerns.

Output
- Create or update `specs/<feature>/flows/index.md`
- Create or update `specs/<feature>/flows/main-flow.mmd`
- Create or update `specs/<feature>/flows/sequence.mmd`
- Create or update `specs/<feature>/flows/state.mmd`
- Create or update `specs/<feature>/memory/trace-index.md`

Check Before Finish
- Confirm the three diagrams use consistent actor names, actions, and state names.
- Confirm missing business details are reported instead of guessed.
- Confirm the trace index reflects the key flow routes.
- Confirm the flow assets are granular enough that later changes can target a specific `STEP-*`, `DEC-*`, or `EX-*`.
- If the feature is near medium-project scale, confirm `flows/index.md` starts with a domain-or-topic grouped index table.

Next
- Suggest `sp.ui`
```

## 3.5 `sp.ui`

调用形式：

- Codex: `$sp-ui`
- Claude: `/sp-ui`
- 传统 slash-host: `/sp.ui`

正文草案：

```text
Purpose
- Turn clarified business behavior into page-level documentation and configuration-form prototypes.

Read First
- If `specs/<feature>/memory/index.md` exists, read it first.
- If `specs/<feature>/memory/trace-index.md` exists, read it before expanding all UI source files.
- Read `specs/<feature>/spec.md`
- Read `specs/<feature>/clarifications.md`
- Read `specs/<feature>/flows/*`

Do
- Write a screen map that shows the main pages or views and their entry conditions.
- Write page cards that explain page goal, actors, entry path, page states, key sections, actions, interface bindings, rules, error messaging, and exit conditions.
- Record section visibility conditions, field editability conditions, and submission feedback when the screen includes gated content or editable forms.
- Assign stable `SCREEN-*`, `SECTION-*`, `ACTION-*`, and `FIELD-*` identifiers to the page assets that may be referenced later.
- Record `Canonical Name`, `Alias Keywords`, and `Key Action IDs` in the screen map.
- If the feature includes configuration pages or form pages, create JSON Forms artifacts for them.
- Keep the output reviewable as documentation rather than production code.
- Refresh `memory/trace-index.md` with `SCREEN-*`, `UC-*`, and key `API-*` mappings.

Do Not
- Do not write React, Vue, HTML, CSS, or other production artifacts.
- Do not produce high-fidelity visual design comps.
- Do not use JSON Forms for non-form screens just to force uniformity.

Output
- Create or update `specs/<feature>/ui/screen-map.md`
- Create or update `specs/<feature>/ui/screen-*.md`
- Create or update `specs/<feature>/ui/jsonforms/schema.json`
- Create or update `specs/<feature>/ui/jsonforms/uischema.json`
- Create or update `specs/<feature>/ui/jsonforms/data.example.json`
- Create or update `specs/<feature>/memory/trace-index.md`

Check Before Finish
- Confirm every page can be traced back to a business flow or rule.
- Confirm key actions are mapped to `UC-*` and, when applicable, `API-*`.
- Confirm page states cover at least initial, loading, empty, error, and no-access states.
- Confirm the page assets are granular enough that later changes can target a specific `SECTION-*`, `ACTION-*`, or `FIELD-*`.
- Confirm configuration and form prototypes are limited to the screens that need them.
- Confirm the trace index has enough screen-level routing for later worksets.
- If the feature has `20` screens or more, confirm `screen-map.md` starts with a module summary table.

Next
- Suggest `sp.gate`
```

## 3.6 `sp.gate`

调用形式：

- Codex: `$sp-gate`
- Claude: `/sp-gate`
- 传统 slash-host: `/sp.gate`

正文草案：

```text
Purpose
- Decide whether the first-layer business package is strong enough to enter delivery design.

Read First
- If `specs/<feature>/memory/index.md` exists, read it first.
- Read `specs/<feature>/memory/open-items.md` if it exists.
- Read all first-layer outputs for the active feature.

Do
- Evaluate the feature against gate criteria:
- check the business framework first
- confirm `clarifications.md` contains an explicit framework section
- confirm the framework uses this fixed order:
- `Mainline Stages`
- `Stage Responsibility Boundaries`
- `Object Flow Backbone`
- `Top-Level Decision Points`
- `Capability Boundaries`
- confirm the framework is understandable top-down before reading flows and pages
- business objective is clear
- main flow is closed
- key branches exist
- important exceptions are covered
- rules and priorities are explicit
- page inventory is visible
- blocking open questions are explicit
- Produce a gate conclusion using one of:
- PASS
- PASS WITH OPEN QUESTIONS
- BLOCKED
- Support the conclusion with concrete evidence.
- Record the framework check result explicitly in `gate.md` before lower-level checks.
- Refresh `memory/index.md` with the current gate state.
- Refresh `memory/open-items.md` with risks, blockers, and rollback guidance.

Do Not
- Do not give a vague review without a verdict.
- Do not ignore blocking gaps for the sake of momentum.
- Do not skip framework completeness and jump straight to flow or page checks.

Output
- Create or update `specs/<feature>/gate.md`
- Create or update `.specify/memory/project-index.md`
- Create or update `.specify/memory/feature-map.md`
- Create or update `specs/<feature>/memory/index.md`
- Create or update `specs/<feature>/memory/open-items.md`

Check Before Finish
- Confirm the verdict is explicit.
- Confirm the business framework was checked before detailed flow and page review.
- Confirm the framework result is recorded explicitly in `gate.md`.
- Confirm each blocked or risky point references evidence from feature documents.
- Confirm the project-level index and feature map reflect the latest gate conclusion.
- Confirm the memory entry reflects the latest gate status.

Next
- If passed, suggest `sp.bundle`
- If blocked, suggest the specific step that must be revisited
```

## 3.7 `sp.bundle`

调用形式：

- Codex: `$sp-bundle`
- Claude: `/sp-bundle`
- 传统 slash-host: `/sp.bundle`

正文草案：

```text
Purpose
- Consolidate first-layer outputs into a handoff-ready business bundle.

Read First
- If `specs/<feature>/memory/index.md` exists, read it first.
- Read `specs/<feature>/memory/stable-context.md` if it exists.
- Read `spec.md`, `clarifications.md`, `flows/*`, `ui/*`, and `gate.md`

Do
- Summarize the stable business objective, roles, core rules, process shape, screen inventory, risks, and open questions.
- Add a compact business-framework snapshot before the lower-level summaries:
- mainline stages
- stage owners and constrained actors
- object flow backbone
- top-level decision points
- explicit in-scope and deferred capability boundaries
- keep the snapshot in a fixed order for second-layer consumption
- Separate stable decisions, non-blocking risks, and blocking issues.
- Organize the bundle so the second layer can consume it without re-deriving the business story.
- Refresh `memory/stable-context.md` so the second layer can reuse the stable bundle view.
- Refresh `memory/index.md` with the recommended second-layer read order.
- Refresh `.specify/memory/active-context.md` with the recommended second-layer read order.

Do Not
- Do not merely copy raw sections without synthesis.
- Do not hide unresolved items.

Output
- Create or update `specs/<feature>/bundle.md`
- Create or update `.specify/memory/active-context.md`
- Create or update `specs/<feature>/memory/index.md`
- Create or update `specs/<feature>/memory/stable-context.md`

Check Before Finish
- Confirm the bundle is usable as the sole handoff package into `sp.plan`.
- Confirm the business framework is understandable before the reader goes into diagrams, pages, and delivery objects.
- Confirm the snapshot uses this fixed order:
- `Mainline Stages`
- `Stage Boundaries`
- `Object Backbone`
- `Top-Level Decision Points`
- `In-Scope And Deferred Boundaries`
- Confirm stability, risk, and blocking status are separated clearly.
- Confirm the project active context now recommends the second-layer read order.
- Confirm the stable context is now usable as a default entry for `sp.plan`.

Next
- Suggest `sp.plan`
```

## 3.8 `sp.plan`

调用形式：

- Codex: `$sp-plan`
- Claude: `/sp-plan`
- 传统 slash-host: `/sp.plan`

正文草案：

```text
Purpose
- Translate the first-layer business bundle into second-layer delivery design.

Read First
- If `specs/<feature>/memory/index.md` exists, read it first.
- Read `specs/<feature>/memory/stable-context.md` and `specs/<feature>/memory/trace-index.md` if they exist.
- Read `specs/<feature>/bundle.md`
- Read the constitution rules for the second layer.

Do
- Define delivery scope and phases.
- Keep `plan.md` as the second-layer index and orchestration document.
- Map business screens to delivery-facing document objects.
- Expand the delivery package to cover use cases, domain objects, table specs, API contracts, permissions, side effects, non-functional constraints, module boundaries, and acceptance entry points.
- Add an explicit auto-development readiness conclusion.
- Ensure API, table, permission, side-effect, and acceptance outputs contain the minimum structured fields needed for later automation.
- Keep this as design documentation, not production work.
- Create `memory/worksets/index.md` and split the feature into bounded worksets for later localized work.
- Make the worksets queryable by question type, object type, and context budget.
- Refresh `.specify/memory/feature-map.md` with the main feature entry and workset count.
- When scale triggers are hit, enforce multiple worksets rather than one global work area.
- When the feature is near medium-project scale, add grouped first-screen indexes to `screen-map.md`, `flows/index.md`, `delivery/07-api-contracts.md`, and `delivery/06-table-index.md`.
- When the feature is medium-project workload, record the scope-splitting reason and the workset-splitting reason in `plan.md`.

Do Not
- Do not rewrite first-layer business logic from scratch.
- Do not start coding.
- Do not treat open questions as resolved unless the bundle says so.

Output
- Create or update `specs/<feature>/plan.md`
- Create or update `.specify/memory/feature-map.md`
- Create or update `specs/<feature>/memory/index.md`
- Create or update `specs/<feature>/memory/trace-index.md`
- Create or update `specs/<feature>/memory/worksets/index.md`
- Create or update `specs/<feature>/memory/worksets/ws-*.md`
- Create or update `specs/<feature>/delivery/01-prd.md`
- Create or update `specs/<feature>/delivery/02-screen-to-delivery-map.md`
- Create or update `specs/<feature>/delivery/03-use-case-matrix.md`
- Create or update `specs/<feature>/delivery/04-domain-model.md`
- Create or update `specs/<feature>/delivery/05-data-entity-catalog.md`
- Create or update `specs/<feature>/delivery/06-table-index.md`
- Create or update `specs/<feature>/delivery/tables/table-*.md`
- Create or update `specs/<feature>/delivery/07-api-contracts.md`
- Create or update `specs/<feature>/delivery/08-permissions-matrix.md`
- Create or update `specs/<feature>/delivery/09-events-and-side-effects.md`
- Create or update `specs/<feature>/delivery/10-non-functional-requirements.md`
- Create or update `specs/<feature>/delivery/11-module-boundaries.md`
- Create or update `specs/<feature>/delivery/12-test-and-acceptance.md`

Check Before Finish
- Confirm `plan.md` acts as an index rather than the only detailed second-layer document.
- Confirm every major delivery object traces back to bundle evidence.
- Confirm the delivery package already carries the minimum structured fields rather than deferring them to a later phase.
- Confirm the plan stays within documentation scope.
- Confirm the worksets are bounded local work areas rather than full-feature rewrites.
- Confirm the project feature map now exposes the main feature entry and workset count.
- Confirm `memory/worksets/index.md` can answer "which workset should I pick" without rereading the whole plan.
- If the split trigger applies, confirm there are at least `2` `ws-*.md` files.
- If the feature is near medium-project scale, confirm grouped indexes exist on the first screen of the major routing documents.
- If the feature is medium-project workload, confirm `plan.md` records why the scope and worksets were split the way they were.

Next
- Suggest `sp.tasks`
```

## 3.9 `sp.tasks`

调用形式：

- Codex: `$sp-tasks`
- Claude: `/sp-tasks`
- 传统 slash-host: `/sp.tasks`

正文草案：

```text
Purpose
- Break the delivery plan into executable documentation-stage tasks.

Read First
- If `specs/<feature>/memory/index.md` exists, read it first.
- Read `specs/<feature>/memory/worksets/index.md` and the relevant `ws-*.md` files if they exist.
- Read `specs/<feature>/plan.md`
- Read `specs/<feature>/delivery/*`

Do
- Group tasks by delivery stream or milestone.
- Mark dependencies, parallelizable items, checkpoints, and acceptance links.
- Make each task traceable to the relevant delivery document, stable ID, or acceptance item.
- Mark a primary trace target for each task.
- Keep task granularity useful for planning and validation.
- Bind each task to a primary workset so later agents can work locally.
- Refresh workset entry files if the task split changes the local reading strategy.

Do Not
- Do not turn this into a code-generation checklist.
- Do not create low-value technical busywork disconnected from the plan.

Output
- Create or update `specs/<feature>/tasks.md`
- Create or update `specs/<feature>/memory/index.md`
- Create or update `specs/<feature>/memory/worksets/index.md`
- Create or update `specs/<feature>/memory/worksets/ws-*.md`

Check Before Finish
- Confirm each task maps back to a plan item.
- Confirm each task has a completion signal or acceptance target.
- Confirm each task has an explicit primary trace target such as `SCREEN-*`, `API-*`, `TABLE-*`, or `ACC-*`.
- Confirm each task has a primary workset entry.
- Confirm later agents can start from the workset without rereading the whole task list.

Next
- Suggest `sp.analyze`
```

## 3.10 `sp.analyze`

调用形式：

- Codex: `$sp-analyze`
- Claude: `/sp-analyze`
- 传统 slash-host: `/sp.analyze`

正文草案：

```text
Purpose
- Analyze cross-document consistency and find structural gaps across the document workflow.

Read First
- Read `.specify/memory/project-index.md` first if it exists.
- Read `.specify/memory/active-context.md` if it exists.
- Read `specs/<feature>/memory/index.md` first if it exists.
- Read `specs/<feature>/memory/stable-context.md`, `open-items.md`, `trace-index.md`, and `worksets/*` if they exist.
- Read `spec.md`, `clarifications.md`, `flows/*`, `ui/*`, `bundle.md`, `plan.md`, `delivery/*`, and `tasks.md`

Do
- Identify broken mappings, contradictions, missing dependencies, and false assumptions of completeness.
- Check whether flows align with screens, whether rules align with delivery objects, whether table, API, permission, and event documents stay mutually consistent, and whether tasks align with acceptance.
- Judge whether the document set has reached the minimum supplementary precision for later automatic development.
- If the feature has reached medium-project scale, run a smoke check on representative flows, screens, APIs, and tables, and record the sampling basis.
- If the feature is near medium-project scale, explicitly judge whether the split structure, query structure, and workset routing still hold.
- Categorize each gap under UI, API, data, permission, side-effect, or acceptance precision.
- Produce a final verdict using `PASS`, `PASS WITH RISKS`, or `BLOCKED`.
- Structure the result so the final verdict and gap categories can be compared across features rather than written as freeform prose.
- Report findings with impact and suggested rollback or repair step.
- Check whether `memory/*` is stale, incomplete, or inconsistent with the source docs.
- Check whether any workset is too broad, missing key links, or no longer represents a local work area.
- Refresh `.specify/memory/hotspots.md` with project-level high-priority risks.
- Refresh `.specify/memory/project-index.md` and `.specify/memory/feature-map.md` with the latest readiness result.

Do Not
- Do not summarize the documents without analysis.
- Do not mark unresolved items as aligned when they are still open.

Output
- Create or update `specs/<feature>/analysis.md`
- Create or update `.specify/memory/project-index.md`
- Create or update `.specify/memory/feature-map.md`
- Create or update `.specify/memory/hotspots.md`

Check Before Finish
- Confirm every finding includes evidence and impact.
- Confirm every finding includes a precision category when relevant.
- If medium-project scale applies, confirm the smoke-test scope, sampling summary, and verdict impact are written.
- If the feature is medium-project workload, confirm `PASS` is not used when the smoke test is missing.
- Confirm the result includes a fixed verdict block and a fixed gap-category table.
- Confirm the final verdict is explicit and consistent with the passline criteria.
- Confirm the result makes clear whether the document stage is coherent enough to stop or must loop back.
- Confirm the analysis states whether the external memory layer is fresh enough to serve as the default routing entry.
- Confirm the project-level risk and readiness indexes were refreshed.

Next
- If major gaps remain, suggest the exact prior command to revisit.
- If no major gaps remain, stop at the end of the document stage.
```

## 4. 后续迁移建议

将这份文档迁入真实 fork 时，建议顺序如下：

1. 先将全局约束写入 constitution 与命令模板公共片段
2. 再落地 `sp.specify` 到 `sp.analyze` 的 agent 命令文件
3. 最后按 integration registry 输出到 skills、markdown、toml 等宿主目录

迁移时应保持：

- 同一步命令在不同 agent 上的正文逻辑一致
- 文档阶段边界一致
- 输出路径一致
