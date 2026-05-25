# `sp` 模板文件清单

> 目标：给当前仓库和未来真实 fork 提供一份可直接照着创建文件的模板清单。

## 1. 使用范围

这份清单主要定义模板文件清单。

当前仓库现在维护一套 canonical 模板目录：

- `templates/commands/`
- `templates/project/`

迁移前的分发目录保留在：

- `Archieved/installer-assets/`

设计边界：

- 当前阶段仍然只做文档工作
- 不涉及实现代码模板
- 不直接定义 CLI 改造代码
- 重点是命令模板、文档模板和生成骨架

## 2. 命令模板文件清单

## 2.1 skills agent 产物

这类产物面向当前已采用 skills integration 的宿主，例如 Codex 与 Claude。

注意：

- 当前仓库不再把 skills 文件单独维护为 canonical source
- `sp-*` skills 由安装器从 `templates/commands/*.md` 生成
- 因此这里描述的是目标产物集合，而不是第二套长期维护的模板真源

建议至少生成以下命令文件：

| 宿主触发 | 产物目录名 |
| --- | --- |
| `$sp-constitution` / `/sp-constitution` | `sp-constitution/SKILL.md` |
| `$sp-specify` / `/sp-specify` | `sp-specify/SKILL.md` |
| `$sp-clarify` / `/sp-clarify` | `sp-clarify/SKILL.md` |
| `$sp-flow` / `/sp-flow` | `sp-flow/SKILL.md` |
| `$sp-ui` / `/sp-ui` | `sp-ui/SKILL.md` |
| `$sp-gate` / `/sp-gate` | `sp-gate/SKILL.md` |
| `$sp-bundle` / `/sp-bundle` | `sp-bundle/SKILL.md` |
| `$sp-plan` / `/sp-plan` | `sp-plan/SKILL.md` |
| `$sp-tasks` / `/sp-tasks` | `sp-tasks/SKILL.md` |
| `$sp-analyze` / `/sp-analyze` | `sp-analyze/SKILL.md` |

兼容别名：

| 兼容命令 | 实际目标 |
| --- | --- |
| `sp.checklist` | `sp.gate` |

## 2.2 command agent 产物

这类产物面向传统 command/slash-command 宿主。

当前至少应考虑：

- Copilot
- Gemini CLI
- Kiro CLI
- generic `--ai-commands-dir`

建议至少存在以下命令文件：

| 命令 | 建议模板标识 |
| --- | --- |
| `/sp.constitution` | `sp.constitution` |
| `/sp.specify` | `sp.specify` |
| `/sp.clarify` | `sp.clarify` |
| `/sp.flow` | `sp.flow` |
| `/sp.ui` | `sp.ui` |
| `/sp.gate` | `sp.gate` |
| `/sp.bundle` | `sp.bundle` |
| `/sp.plan` | `sp.plan` |
| `/sp.tasks` | `sp.tasks` |
| `/sp.analyze` | `sp.analyze` |

说明：

- `templates/commands/` 作为唯一正文与机制真源
- skills 型与 command 型集成都从同一套模板生成
- 当前仓库已不再把 Codex 视为 prompt 宿主
- 其他 command 型 agent 应优先复用同一套 canonical 模板，再按宿主要求做轻量外层包装

## 2.3 generic agent 模板包装

这类模板面向：

- 使用 `--ai generic --ai-commands-dir <path>` 的自定义 agent

建议：

- 复用 slash command 正文模板
- 将最终命令文件写入用户指定目录
- 不再单独发明 generic 专属流程

## 3. 命令模板正文最小骨架

每个命令模板至少应包含：

```text
Purpose
Read First
Do
Do Not
Output
Check Before Finish
Next
```

建议统一前言：

```text
You are executing the document-stage `sp` workflow on top of the original Spec Kit mechanism.
Stay within documentation work only.
Reuse existing project context and active feature state.
Do not write production code.
If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
If `memory/index.md` exists, read it first and use it as the default routing entry.
Expand to source documents only for the current target area.
If required inputs are missing or unstable, stop and report the gap explicitly.
```

所有模板还应继承以下全局硬规则：

- `memory/*` 首屏优先回答“现在先读什么”，而不是先写背景总结
- `.specify/memory/active-context.md` 的项目级最小阅读集默认不超过 `5` 个文件
- 小窗口 agent 首轮默认不超过 `7` 个文件，中窗口默认不超过 `9` 个文件，大窗口默认不超过 `12` 个文件
- 若 fresh `memory/*` 已回答当前问题，模板必须优先复用，不得重新推理同一稳定结论
- 若 memory 缺失、stale 或命中歧义，模板必须要求 agent 只读取最小源文档集，并在结束前回写 memory
- 需要被追踪、提问或修改的对象必须优先采用可扫读的稳定 ID，并尽量同时提供 `Canonical Name`、`Alias Keywords`、`Owner ID`
- 若 `screens >= 12`、`flows >= 12`、`tables >= 20`，或已出现两个以上明显子主题，则 `sp.plan` 至少生成 `2` 个 `ws-*.md`
- 若 `screens >= 20`、`flows >= 20`、`tables >= 40`，或已跨两个以上业务域，则模板必须切换到接近中型规模写法
- 若规模达到或接近 `50` 个界面、`50` 条流程、`100` 张表，则 `analysis.md` 未记录冒烟检查时不得输出 `PASS`

各命令详细正文来源：

- [reference/sp-command-template-drafts.md](sp-command-template-drafts.md)

## 4. 项目级记忆模板文件清单

未来 fork 时，建议先准备以下项目级入口模板：

| 输出文件 | 生成命令 | 是否本阶段纳入 |
| --- | --- | --- |
| `.specify/memory/constitution.md` | `sp.constitution` | 是 |
| `.specify/memory/project-index.md` | `sp.constitution` 初始化，`sp.gate` / `sp.analyze` 刷新 | 是 |
| `.specify/memory/feature-map.md` | `sp.constitution` 初始化，`sp.specify` / `sp.gate` / `sp.plan` / `sp.analyze` 刷新 | 是 |
| `.specify/memory/domain-map.md` | `sp.constitution` 初始化，按项目演进补充 | 是 |
| `.specify/memory/active-context.md` | `sp.constitution` 初始化，`sp.specify` / `sp.bundle` 刷新 | 是 |
| `.specify/memory/hotspots.md` | `sp.constitution` 初始化，`sp.analyze` 刷新 | 是 |

要求：

- 项目级模板必须优先服务查询与路由，而不是项目介绍
- `project-index.md` 首屏必须是问题路由矩阵
- `feature-map.md` 必须是表格优先
- `active-context.md` 必须能直接给出当前最小阅读集
- `active-context.md` 默认只推荐 `1` 个 active feature 和 `1` 个主 workset

## 5. feature 文档模板文件清单

未来 fork 时，建议在模板层准备以下文档骨架：

| 输出文件 | 生成命令 | 是否本阶段纳入 |
| --- | --- | --- |
| `spec.md` | `sp.specify` | 是 |
| `clarifications.md` | `sp.clarify` | 是 |
| `clarify-log.md` | `sp.clarify` | 是 |
| `gate.md` | `sp.gate` | 是 |
| `bundle.md` | `sp.bundle` | 是 |
| `plan.md` | `sp.plan` | 是 |
| `tasks.md` | `sp.tasks` | 是 |
| `analysis.md` | `sp.analyze` | 是 |
| `memory/index.md` | `sp.specify` 初始化，后续命令持续刷新 | 是 |
| `memory/stable-context.md` | `sp.specify` 初始化，`sp.clarify` / `sp.bundle` 刷新 | 是 |
| `memory/open-items.md` | `sp.specify` 初始化，`sp.clarify` / `sp.gate` 刷新 | 是 |
| `memory/trace-index.md` | `sp.clarify` 初始化，`sp.flow` / `sp.ui` / `sp.plan` 刷新 | 是 |
| `memory/worksets/index.md` | `sp.plan` | 是 |
| `memory/worksets/ws-*.md` | `sp.plan` 创建，`sp.tasks` 刷新 | 是 |
| `delivery/01-prd.md` | `sp.plan` | 是 |
| `delivery/02-screen-to-delivery-map.md` | `sp.plan` | 是 |
| `delivery/03-use-case-matrix.md` | `sp.plan` | 是 |
| `delivery/04-domain-model.md` | `sp.plan` | 是 |
| `delivery/05-data-entity-catalog.md` | `sp.plan` | 是 |
| `delivery/06-table-index.md` | `sp.plan` | 是 |
| `delivery/tables/table-*.md` | `sp.plan` | 是 |
| `delivery/07-api-contracts.md` | `sp.plan` | 是 |
| `delivery/08-permissions-matrix.md` | `sp.plan` | 是 |
| `delivery/09-events-and-side-effects.md` | `sp.plan` | 是 |
| `delivery/10-non-functional-requirements.md` | `sp.plan` | 是 |
| `delivery/11-module-boundaries.md` | `sp.plan` | 是 |
| `delivery/12-test-and-acceptance.md` | `sp.plan` | 是 |
| `flows/index.md` | `sp.flow` | 是 |
| `flows/main-flow.mmd` | `sp.flow` | 是 |
| `flows/sequence.mmd` | `sp.flow` | 是 |
| `flows/state.mmd` | `sp.flow` | 是 |
| `ui/index.md` | `sp.ui` | 是 |
| `ui/screen-map.md` | `sp.ui` | 是 |
| `ui/screen-*.md` | `sp.ui` | 是 |
| `ui/jsonforms/schema.json` | `sp.ui` | 是 |
| `ui/jsonforms/uischema.json` | `sp.ui` | 是 |
| `ui/jsonforms/data.example.json` | `sp.ui` | 是 |

详细结构来源：

- [reference/sp-feature-template-pack.md](sp-feature-template-pack.md)

补充硬要求：

- `memory/index.md` 首屏必须先放“问题类型 / 关键词 / 推荐文件 / 推荐 workset / 下一跳”路由表
- `memory/stable-context.md` 首屏必须先放角色、对象、阶段或判断点快速表
- `memory/open-items.md` 首屏必须先放按严重度、状态、域、workset 可过滤的问题表
- `memory/trace-index.md` 首屏必须先放按 `SCREEN-* / API-* / TABLE-* / ACC-*` 反查的快捷索引
- `clarifications.md` 只保留稳定结论，不承载完整提问历史
- `clarify-log.md` 首屏必须先放“Question ID / Category / Mode / Queue Topic / Source Step / Status / Impact Scope / Propagation Status”索引表
- `memory/worksets/index.md` 首屏必须先放“问题类型 / 关键词 / 推荐 workset / 最小阅读集 / 相邻 workset”选择表
- 每个 `ws-*.md` 首屏必须先放“适用问题 / 纳入范围 / 不纳入范围 / 最小阅读集 / 完成判据”
- 接近中型规模后，`ui/screen-map.md`、`flows/index.md`、`delivery/07-api-contracts.md`、`delivery/06-table-index.md` 首屏都必须加分组索引
- 中型项目工作负载下，`plan.md` 必须写范围拆分理由和 workset 拆分理由
- 中型项目工作负载下，不允许只保留一个总 workset

## 6. 各文档模板的最小起始骨架

## 6.1 `spec.md`

```md
# <Feature Title>

## Background

## Goals

## In Scope

## Out of Scope

## Roles

## Success Criteria

## Open Clarification Items
```

## 6.2 `clarifications.md`

```md
# Clarifications

## Roles

## Business Objects

## Business Framework

### Mainline Stages

### Stage Responsibility Boundaries

### Object Flow Backbone

### Top-Level Decision Points

### Capability Boundaries

## Rules

## Defaults And Overrides

## Branches And Exceptions

## Boundary Conditions

## States

## Open Questions

## Acceptance Examples
```

补充要求：

- 只沉淀已经稳定的业务结论
- `CF-SPEC / CF-FLOW / CF-UI` 的分类可写入条目标签，但不要把完整问答过程堆进正文
- 若结论改变了流程或界面口径，应与对应文档保持一致

## 6.2.1 `clarify-log.md`

```md
# Clarify Log

## Question Index

| Question ID | Category | Mode | Queue Topic | Source Step | Status | Impact Scope | Propagation Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Question Record Template

### <Question ID>

#### Category

#### Mode

#### Question Type

#### Source Step

#### Trigger Reason

#### Queue Topic

#### Queue Reason

#### Queue Size

#### Flush Trigger

#### Latest Safe Step

#### Why This Matters

#### Target Type

#### Target ID

#### Canonical Name

#### Alias Keywords

#### Owner ID

#### Allowed Options

#### Operation

#### Source Of Truth

#### Selected Answer

#### Optional Remarks

#### Impact Scope

#### Affected Documents

#### Required Sync Files

#### Affected IDs

#### Need Back-Propagation

#### Target Resolution

#### Propagation Status

#### Propagation Check

#### Status

#### Revisit Condition
```

补充要求：

- `Category` 只允许 `CF-SPEC`、`CF-FLOW`、`CF-UI`
- `Mode` 只允许 `Immediate` 或 `Batch`
- `Immediate` 必须用于路线、范围、主线阶段、主页面结构、owner 边界或当前步骤阻塞类问题
- `Batch` 只允许用于不改路线、可局部延后、且可按同主题合并的问题
- `Question Type` 默认使用 `Single Select` 或 `Multi Select`
- 建议单选题控制在 `2` 到 `4` 个选项之间，多选题控制在 `2` 到 `6` 个可组合选项之间
- `Allowed Options` 必须是安全候选项，不得包含隐性冲突
- 若无法生成安全候选项，应改为记录更宏观的新问题，而不是硬问局部问题
- 若问题来自 `flow` 或 `ui` 变更，应先确保 `Target ID` 可唯一定位
- 每条会触发跨文档变更的记录都必须写 `Source Of Truth` 与 `Required Sync Files`
- `Propagation Status` 只允许使用 `Not Started`、`Source Updated`、`In Sync`、`Partial`、`Blocked`
- `Propagation Check` 至少写明：已更新文件、未更新文件、未更新原因
- `Queue Topic` 应采用可复用主题名，例如 `approval-scope`、`notification-policy`、`timezone-precision`、`screen-ownership`
- 同主题累计达到 `3` 个问题、同一 workset 连续两轮回退，或即将进入 `sp.gate` / `sp.bundle` / `sp.plan` 前，应执行批量冲刷
- `Flush Trigger` 只建议使用 `Topic Threshold Reached`、`Before Gate`、`Before Bundle`、`Before Plan`、`Drift Detected`、`User Requested Review`
- 建议在记录内追加 `Target Resolution` 小节，至少写明：输入原话、候选对象、排除理由、最终定位依据
- 若用户输入是自然语言修改请求，建议优先用以下格式回写解析结果：
- `User Phrase`: `申请页提交按钮`
- `Resolved Target`: `ACTION-LEAVE-APPLY-020`
- `Resolution Basis`: `Canonical Name + Alias Keywords + Owner ID`

## 6.3 `gate.md`

```md
# Gate Result

## Verdict

## Business Framework Checks

## Passed Checks

## Open Questions

## Blocking Items

## Recommended Rollback Step
```

## 6.4 `bundle.md`

```md
# Business Bundle

## Feature Summary

## Business Framework Snapshot

### Mainline Stages

### Stage Boundaries

### Object Backbone

### Top-Level Decision Points

### In-Scope And Deferred Boundaries

## Query Entry Points

## Roles And Objects

## Flow Summary

## Rule Summary

## Screen Inventory

## Stable Decisions

## Risks

## Blocking Items

## Handoff Notes
```

补充要求：

- `Query Entry Points` 至少给出 5 到 10 条高频查询入口，覆盖 `flow` 与 `ui`
- 每条入口建议包含：自然语言别名、目标 `ID`、主文档、扩展文档
- 交接时应保证新 agent 不必通读全文，也能先从入口表定位到目标对象

## 5.5 `plan.md`

```md
# Delivery Plan

## Delivery Goals

## Scope Breakdown

## Screen To Delivery Mapping

## Module Boundaries

## Data Objects And Flow

## External Dependencies

## Validation Entry Points

## Auto-Development Readiness
```

## 5.6 `memory/index.md`

```md
# Feature Memory Index

## Metadata

## Question Routing Matrix

## Recommended Read Order

## Hotspots

## Stable Context Entry

## Trace Entry

## Open Items Entry

## Workset Entry

## Latest Gate

## Latest Analysis
```

## 5.7 `memory/stable-context.md`

```md
# Stable Context

## Metadata

## Feature Summary

## Target Resolution Shortcuts

## Role Lookup

## Stage Lookup

## Object Lookup

## Decision Lookup

## Flow Target Lookup

## UI Target Lookup

## Confirmed Boundaries

## Stable Delivery Anchors
```

## 5.8 `memory/open-items.md`

```md
# Open Items

## Summary

## Filter Views

| Item ID | Type | Severity | Domain | Workset | Description | Impact Area | Affected Docs | Suggested Rollback | Last Refresh | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.9 `memory/trace-index.md`

```md
# Trace Index

## Query Shortcuts

## Key Trace Chains

| Trace ID | Flow | Screen | Use Case | API | Table | Acceptance | Workset | Expand Docs | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Rule Links

| Rule ID | Flows | Screens | APIs | Tables | Notes |
| --- | --- | --- | --- | --- | --- |

## Reverse Lookup

| Lookup Type | ID | Primary Trace | Primary Workset | Expand Docs | Notes |
| --- | --- | --- | --- | --- | --- |
```

## 5.10 `memory/worksets/index.md`

```md
# Workset Index

## Workset Selection Guide

| If You Need To... | Choose Workset | Why |
| --- | --- | --- |

## Workset Catalog

| Workset ID | Use When | Avoid When | Context Budget | Key Screens | Key APIs | Key Tables | Acceptance | Adjacent Worksets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.11 `memory/worksets/ws-*.md`

```md
# <Workset ID> <Workset Name>

## Fast Entry

## Minimum Read Set

## Goal

## In Scope

## Out Of Scope

## Key Trace Chains

## Required Source Docs

## Stable Facts

## Open Items

## Adjacent Dependencies

## Completion Signals
```

## 5.12 `delivery/01-prd.md`

```md
# PRD

## Target Release

## In Scope

## Out Of Scope

## Milestones

## Risks
```

## 5.13 `delivery/02-screen-to-delivery-map.md`

```md
# Screen To Delivery Map

| Screen ID | Screen | Module | Use Cases | APIs | Tables | Acceptance | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.14 `delivery/03-use-case-matrix.md`

```md
# Use Case Matrix

| Use Case ID | Source Screen | Trigger | Preconditions | Success Result | Failure Result | Rules | Related APIs |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.15 `delivery/04-domain-model.md`

```md
# Domain Model

## Entities

## Relationships

## Lifecycle

## Ownership Boundaries
```

## 5.16 `delivery/05-data-entity-catalog.md`

```md
# Data Entity Catalog

| Object ID | Name | Description | Key Fields | Field Type Hints | Source Rules | Downstream Tables |
| --- | --- | --- | --- | --- | --- | --- |
```

## 5.17 `delivery/06-table-index.md`

```md
# Table Index

| Table ID | Table Name | Module | Primary Entity | Related APIs | Lifecycle | Notes |
| --- | --- | --- | --- | --- | --- | --- |
```

## 5.18 `delivery/tables/table-*.md`

```md
# <Table ID> <Table Name>

## Purpose

## Fields

## State Field Mapping

## Primary Key And Unique Constraints

## Indexes

## Foreign Keys

## Write Sources

## Read Scenarios

## Audit Fields

## Retention

## Delete Strategy
```

## 5.19 `delivery/07-api-contracts.md`

```md
# API Contracts

| API ID | Purpose | Method | Path | Request | Response | Error Codes | Idempotency | Permission Preconditions | Side Effects |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.20 `delivery/08-permissions-matrix.md`

```md
# Permissions Matrix

| Role ID | Action | Resource Scope | Condition | Allowed | Page Visibility | Field Editability | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.21 `delivery/09-events-and-side-effects.md`

```md
# Events And Side Effects

| Event ID | Trigger Source | Trigger Condition | Downstream Action | Sync Or Async | Idempotency Key | Retry Or Compensation | Failure Handling |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.22 `delivery/10-non-functional-requirements.md`

```md
# Non Functional Requirements

## Performance

## Concurrency And Idempotency

## Timezone And Time Rules

## Audit And Traceability

## Data Retention

## Import Export

## Sorting And Pagination
```

## 5.23 `delivery/11-module-boundaries.md`

```md
# Module Boundaries

| Module ID | Module | Responsible For | Not Responsible For | Dependencies | External Interfaces |
| --- | --- | --- | --- | --- | --- |
```

## 5.24 `delivery/12-test-and-acceptance.md`

```md
# Test And Acceptance

| Acceptance ID | Source Rule | Source Screen | Source API | Source Table | Preconditions | Goal | Verification Method |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.25 `tasks.md`

```md
# Delivery Tasks

## Task Groups

## Dependencies

## Parallel Tracks

## Checkpoints

## Acceptance Mapping

## Trace Targets
```

## 5.26 `analysis.md`

```md
# Cross-Document Analysis

## Final Verdict

| Verdict | Allow Auto-Implementation | Reason |
| --- | --- | --- |

## Passed Items

## Risks

## Blockers

## Summary

## Findings

## Impact

## Evidence

## Gap Categories

| Gap ID | Category | Severity | Description | Impact Scope | Evidence | Suggested Rollback |
| --- | --- | --- | --- | --- | --- | --- |

## Medium-Project Smoke Test

### Scope

### Sampling Summary

| Domain | Total | Sampled | Critical Included | Result |
| --- | --- | --- | --- | --- |

### Findings

### Verdict Impact

## Suggested Rollback Step

## Auto-Development Minimum Check

## Memory Freshness Check

## Workset Validity Check

## End-Of-Stage Decision
```

## 5.27 `flows/index.md`

```md
# Flow Index

| Flow ID | Canonical Name | Alias Keywords | Owner Stage | Key Step IDs | Source Rules | Source Screens | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.28 `flows/main-flow.mmd`

```text
flowchart TD
    Start[STEP-XXX-001 Start] --> Step1[STEP-XXX-010 Main Step]
    Step1 --> Decision{DEC-XXX-020 Decision}
    Decision -->|Yes| EndA[STEP-XXX-090 End A]
    Decision -->|No| Ex1[EX-XXX-030 Exception Or Alternate Route]
    Ex1 --> EndB[STEP-XXX-099 End B]
```

## 5.29 `flows/sequence.mmd`

```text
sequenceDiagram
    actor User
    participant UI
    participant System

    User->>UI: Trigger action
    UI->>System: Request processing
    System-->>UI: Return result
    UI-->>User: Show result
```

## 5.30 `flows/state.mmd`

```text
stateDiagram-v2
    [*] --> Draft
    Draft --> Ready: complete clarification
    Ready --> Approved: pass gate
```

## 5.31 `ui/index.md`

```md
# Screen Index

| Screen ID | Canonical Name | Alias Keywords | Module | Role | Primary Goal | Linked Flows | Key Action IDs |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.32 `ui/screen-map.md`

```md
# Screen Map

| Screen ID | Canonical Name | Alias Keywords | Module | Role | Goal | Entry | Upstream Flow | Key Action IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

## 5.33 `ui/screen-*.md`

```md
# <Screen ID> <Screen Name>

## Screen ID

## Canonical Name

## Alias Keywords

## Goal

## Roles

## Entry Conditions

## Section Inventory

| Section ID | Canonical Name | Alias Keywords | Owner ID | Purpose | Visibility Condition |
| --- | --- | --- | --- | --- | --- |

## Sections

## Action Inventory

| Action ID | Canonical Name | Alias Keywords | Owner ID | Trigger | Result | Linked Use Case | Linked API |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Key Actions

## Field Inventory

| Field ID | Canonical Name | Alias Keywords | Owner ID | Type | Editability | Validation |
| --- | --- | --- | --- | --- | --- | --- |

## Rules

## Error Messaging

## Exit Conditions
```

## 5.34 `ui/jsonforms/schema.json`

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

## 5.35 `ui/jsonforms/uischema.json`

```json
{
  "type": "VerticalLayout",
  "elements": []
}
```

## 5.36 `ui/jsonforms/data.example.json`

```json
{}
```

## 6. 推荐生成顺序

建议未来 fork 的模板创建顺序：

1. 先创建 constitution 模板
2. 再创建命令模板
3. 再创建 feature 文档模板
4. 最后创建 agent-specific 包装

## 7. 推荐验收点

模板层完成后，至少检查：

- Codex / Claude skills 与 slash-host 模板是否共用同一逻辑
- `sp.gate` 是否吸收 `checklist` 语义
- `sp.plan / sp.tasks / sp.analyze` 是否仍被约束在文档阶段
- 文档工作流是否在 `sp.analyze` 处结束
- `Mermaid` 与 `JSON Forms` 是否已经固定进入模板约束
- 第二层是否已具备数据库、接口、权限和非功能规格模板
- 是否已建立稳定编号与跨文档追踪骨架
