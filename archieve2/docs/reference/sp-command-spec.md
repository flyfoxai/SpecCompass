# `sp` 命令规范

> 目标：在原版 `Spec Kit` 的命令式工作流基础上，重构为以文档工作为主的两层分层体系。

## 1. 当前阶段范围

`sp` 当前阶段只覆盖文档工作流，不定义任何生产代码流程。

补充：

- `sp.implement` 可视为后续规划中的实现阶段入口
- 但它不属于当前这份文档阶段规范
- 当前规范只覆盖到 `sp.analyze`

当前阶段纳入的命令：

- `sp.constitution`
- `sp.specify`
- `sp.clarify`
- `sp.flow`
- `sp.ui`
- `sp.gate`
- `sp.bundle`
- `sp.plan`
- `sp.tasks`
- `sp.analyze`

## 2. 与原版 `Spec Kit` 的兼容原则

为了便于基于原版 fork 并持续吸收上游更新，`sp` 采用“最小破坏改造”原则。

保留内容：

- `specify init` 作为项目初始化入口
- `specs/<feature>/` 作为 feature 产物根目录
- 基于当前 Git branch 的 active feature 检测
- `SPECIFY_FEATURE` 作为非 Git 场景的 feature 指定方式
- `.specify/scripts/`
- `.specify/templates/`
- `.specify/memory/`

调整内容：

- 对外命令前缀从 `speckit` 改为 `sp`
- 在原有 `specify / clarify / plan / tasks / analyze` 之间插入 `flow / ui / gate / bundle`
- 把 `plan / tasks / analyze` 明确归类为文档工作，不再默认视为实现前置步骤
- 将原版偏检查清单语义的 `checklist` 能力并入 `sp.gate`
- 将 Codex 与 Claude 都统一收敛为项目内 skills 安装形态，仅保留各宿主自身要求的触发形式差异

## 3. 总体工作流

文档工作流分成两层：

1. 第一层：业务澄清文档
2. 第二层：交付设计文档

标准命令顺序如下：

1. `sp.constitution`
2. `sp.specify`
3. `sp.clarify`
4. `sp.flow`
5. `sp.ui`
6. `sp.gate`
7. `sp.bundle`
8. `sp.plan`
9. `sp.tasks`
10. `sp.analyze`

补充说明：

- 标准顺序中的 `sp.clarify` 是第一次集中澄清入口，不代表它只能执行一次
- 当 `sp.flow` 或 `sp.ui` 暴露出新的业务分歧、路线冲突或关键界面决策缺口时，应允许回到 `sp.clarify`
- `sp.clarify` 对外始终保持单一命令，不再拆出 `cf_spec`、`cf_flow`、`cf_ui` 一类额外命令

## 3.1 每步命令的统一提示结构

参考原版 `Spec Kit` 的工作机制，`sp` 的每个命令模板都不应只是一个命令名，而应内置完整工作提示。

每个命令模板至少应包含：

- `Purpose`
- `Read First`
- `Do`
- `Do Not`
- `Output`
- `Check Before Finish`
- `Next`

推荐固定骨架如下：

```text
Purpose
- 说明当前步骤要解决的问题

Read First
- 列出必须先阅读的输入文件、上下文或前序产物

Do
- 列出本步必须完成的分析、整理、判断和产出动作

Do Not
- 列出本步禁止越界的行为

Output
- 列出要创建或更新的文件

Check Before Finish
- 检查缺失信息、冲突项、阻塞项和产物一致性

Next
- 给出建议继续执行的下一条命令
```

各块使用要求：

- `Purpose` 只写当前步骤目标，不混入后续阶段
- `Read First` 必须指向真实输入，不能让 agent 凭空发挥
- `Do` 必须是可执行动作，不是空泛口号
- `Do Not` 必须体现当前阶段的边界限制
- `Output` 必须能落到具体路径
- `Check Before Finish` 必须要求 agent 主动暴露阻塞问题
- `Next` 必须给出相邻步骤，不要跨层跳跃

## 3.2 当前阶段的越界限制

在本阶段，所有命令都应遵守：

- 不写生产代码
- 不产出生产级框架代码
- 不默认讨论部署细节
- 不把文档层未确认问题伪装成已决事项
- 尽量使用稳定编号建立跨文档回链

## 3.3 项目级记忆层、feature 级 memory 与局部 workset

为了降低中型项目场景下的重复推理成本，`sp` 采用两层记忆结构：

- `.specify/memory/*` 负责项目级第一跳路由
- `specs/<feature>/memory/*` 负责 feature 级局部阅读与 workset 路由

定位规则：

- `spec.md`、`clarifications.md`、`flows/*`、`ui/*`、`bundle.md`、`plan.md`、`delivery/*` 等仍然是正式事实源
- 两层 `memory/*` 都不是替代正文，而是默认阅读入口与压缩层
- 新步骤开始时，如果 `.specify/memory/project-index.md` 已存在，应先读取项目级入口
- 进入目标 feature 后，如果 `specs/<feature>/memory/index.md` 已存在，应优先读取 feature 级入口
- 后续只针对当前目标区域展开必要源文档，而不是每次全量回读整个项目或整个 feature

项目级 `memory/` 当前建议包含：

- `.specify/memory/constitution.md`
- `.specify/memory/project-index.md`
- `.specify/memory/feature-map.md`
- `.specify/memory/domain-map.md`
- `.specify/memory/active-context.md`
- `.specify/memory/hotspots.md`

feature 级 `memory/` 当前建议包含：

- `memory/index.md`
- `memory/stable-context.md`
- `memory/open-items.md`
- `memory/trace-index.md`
- `memory/worksets/index.md`
- `memory/worksets/ws-*.md`

职责分配：

- `.specify/memory/constitution.md`：项目级原则、越界限制与刷新规则
- `.specify/memory/project-index.md`：项目默认阅读入口与问题第一跳路由表
- `.specify/memory/feature-map.md`：feature 阶段、状态、入口与 workset 摘要
- `.specify/memory/domain-map.md`：业务域、共享对象、共享规则与推荐入口
- `.specify/memory/active-context.md`：当前最值得优先进入的 feature / workset 与最小阅读集
- `.specify/memory/hotspots.md`：跨 feature 高频风险、高漂移区和高复用热点
- `memory/index.md`：feature 默认阅读入口、问题路由表与 workset 入口
- `memory/stable-context.md`：稳定事实压缩层与快速查表层
- `memory/open-items.md`：开放问题、风险、阻塞与回退建议过滤层
- `memory/trace-index.md`：关键 `FLOW-* -> SCREEN-* -> UC-* -> API-* -> TABLE-* -> ACC-*` 追踪链与反查层
- `memory/worksets/*`：局部工作面，供有限上下文 agent 只处理一个小区域

推荐读取顺序：

1. `.specify/memory/project-index.md`
2. `.specify/memory/active-context.md`
3. 目标 feature 的 `memory/index.md`
4. 必要时读取 `memory/stable-context.md`、`memory/open-items.md`、`memory/trace-index.md`
5. 目标 `ws-*.md`
6. 必要源文档

设计原则：

- 小窗口 agent 应先用项目级入口决定“去哪”，再用 feature 级入口决定“读什么”
- 中大窗口 agent 也应先读两层 `memory/*`，再按需展开源文档
- `sp.plan` 之后必须能把第二层拆成若干 workset，而不是要求 agent 始终背负整个 feature
- 项目级 `memory/*` 首屏应优先放问题路由矩阵、feature 表格、域映射和热点过滤，不应退化成项目简介
- feature 级 `memory/*` 首屏应优先放路由表、查找表和热点项，而不是长段背景描述
- `trace-index.md` 必须支持从 `SCREEN-*`、`API-*`、`TABLE-*`、`ACC-*` 反向定位主链与 workset
- `worksets/index.md` 必须支持“我现在遇到的问题应该选哪个 workset”的快速判断
- 若稳定结论已存在于 fresh `memory/*`，后续步骤不得重复推理同一问题
- 若 memory 已 stale、缺字段或命中歧义，应只展开当前目标区域的最小源文档集，并在本步结束前刷新 memory

## 3.4 命令调用形式

为了兼容不同 agent，`sp` 的调用形式分两类：

- skills 型 agent：`sp-<command>`
- command 型 agent：`sp.<command>`

示例：

- Codex：`$sp-specify`
- Claude：`/sp-specify`
- 传统 slash-command 宿主：`/sp.specify`

## 3.5 查询优先、规模触发与上下文预算硬约束

所有命令在读写 `memory/*` 与第二层交付文档时，都必须继承以下硬约束。

查询优先首屏结构：

- `.specify/memory/project-index.md` 首屏第一块必须是“问题类型 / 关键词 / 推荐 feature / 推荐文件 / 下一跳”路由表
- `.specify/memory/feature-map.md` 首屏第一块必须是“feature / 域 / 当前阶段 / 最新 verdict / 主入口 / 主 workset”总表
- `.specify/memory/domain-map.md` 首屏第一块必须是“对象 / 规则 / 所属域 / 关联 feature / 推荐入口”反查表
- `.specify/memory/active-context.md` 首屏第一块必须是“当前目标 / 最小阅读集 / 推荐 workset / 当前风险 / 禁止越界范围”表
- `memory/index.md` 首屏第一块必须是“问题类型 / 关键词 / 推荐文件 / 推荐 workset / 下一跳”路由表
- `memory/stable-context.md` 首屏第一块必须是角色、对象、阶段或判断点快速表
- `memory/open-items.md` 首屏第一块必须是按严重度、状态、域、workset 可过滤的问题表
- `memory/trace-index.md` 首屏第一块必须是按 `SCREEN-* / API-* / TABLE-* / ACC-*` 反查的快捷索引
- `memory/worksets/index.md` 首屏第一块必须是“问题类型 / 关键词 / 推荐 workset / 最小阅读集 / 相邻 workset”选择表
- 每个 `ws-*.md` 首屏第一块必须是“适用问题 / 纳入范围 / 不纳入范围 / 最小阅读集 / 完成判据”

上下文预算：

- 小窗口 agent 首轮默认不超过 `7` 个文件
- 中窗口 agent 单轮默认不超过 `9` 个文件
- 大窗口 agent 单轮默认不超过 `12` 个文件
- `.specify/memory/active-context.md` 给出的项目级最小阅读集默认不超过 `5` 个文件
- 默认先路由到 `1` 个 active feature，再路由到 `1` 个主 workset

规模触发器：

- 若 `screens >= 12`，或 `flows >= 12`，或 `tables >= 20`，或已出现两个以上明显子主题，则 `sp.plan` 至少拆成 `2` 个 `ws-*.md`
- 若 `screens >= 20`，或 `flows >= 20`，或 `tables >= 40`，或已跨两个以上业务域，则视为“接近中型规模”
- 接近中型规模后，`sp.ui`、`sp.flow`、`sp.plan`、`sp.analyze` 都必须切换到中型项目写法
- 若规模达到或接近 `50` 个界面、`50` 条流程、`100` 张表，则视为中型项目工作负载

中型项目工作负载硬约束：

- 不允许用单个总 workset 覆盖整个 feature
- 不允许让单篇正文承担全量说明而没有索引和拆分入口
- `plan.md` 必须显式写出范围拆分理由与 workset 拆分理由
- `analysis.md` 必须记录抽样范围、关键样本、冒烟结论与对最终 verdict 的影响
- 达到中型项目工作负载但未执行冒烟检查时，`sp.analyze` 不得判定 `PASS`

记忆优先与 no-reinfer 约束：

- 新步骤开始时，应先判断现有 `memory/*` 是否 fresh，再决定是否展开源文档
- 若 `memory/stable-context.md`、`.specify/memory/active-context.md`、`memory/index.md` 已给出稳定结论、推荐入口或 workset 路由，默认直接复用，不重复从原始需求或正文重推
- 只有在以下情况才允许重新推理：memory 缺失、memory 被判 stale、自然语言目标无法映射到唯一 ID、或 source-of-truth 已被改写但 memory 尚未同步
- 若发生重新推理，必须在本步结束前把新的稳定结论回写到对应 `memory/*`，否则视为流程未闭环

clarify 传播硬约束：

- `sp.clarify` 一旦形成稳定答案，必须先更新 `Source Of Truth`，再刷新 `Required Sync Files`
- 只要 `clarify-log.md` 中某条记录仍存在未完成传播，该问题不得标记为 `Closed`
- 只要传播未完成，相关 memory 必须视为 stale，后续步骤不得把它当作稳定前提
- `sp.gate`、`sp.bundle`、`sp.plan`、`sp.analyze` 在结束前都必须检查是否存在未完成传播的澄清项

## 4. 产物目录

当前标准目录分成项目级入口和 feature 级产物两部分：

```text
.specify/
└── memory/
    ├── constitution.md
    ├── project-index.md
    ├── feature-map.md
    ├── domain-map.md
    ├── active-context.md
    └── hotspots.md

specs/<feature>/
├── spec.md
├── clarifications.md
├── gate.md
├── bundle.md
├── plan.md
├── tasks.md
├── analysis.md
├── memory/
│   ├── index.md
│   ├── stable-context.md
│   ├── open-items.md
│   ├── trace-index.md
│   └── worksets/
│       ├── index.md
│       └── ws-*.md
├── delivery/
│   ├── 01-prd.md
│   ├── 02-screen-to-delivery-map.md
│   ├── 03-use-case-matrix.md
│   ├── 04-domain-model.md
│   ├── 05-data-entity-catalog.md
│   ├── 06-table-index.md
│   ├── 07-api-contracts.md
│   ├── 08-permissions-matrix.md
│   ├── 09-events-and-side-effects.md
│   ├── 10-non-functional-requirements.md
│   ├── 11-module-boundaries.md
│   ├── 12-test-and-acceptance.md
│   └── tables/
│       └── table-*.md
├── flows/
│   ├── index.md
│   ├── main-flow.mmd
│   ├── sequence.mmd
│   └── state.mmd
└── ui/
    ├── index.md
    ├── screen-map.md
    ├── screen-*.md
    └── jsonforms/
        ├── schema.json
        ├── uischema.json
        └── data.example.json
```

这样做的原因：

- 尽量保留原版 `spec.md / plan.md / tasks.md` 的骨架
- 新增 `flow / ui / gate / bundle` 作为补强层
- 降低 fork 后与上游的结构性冲突

## 5. 命令定义

### 5.1 `sp.constitution`

用途：

- 建立本项目的文档原则和分层规则

输入：

- 项目原则
- 团队约束
- 文档产物要求

输出：

- `.specify/memory/constitution.md`
- `.specify/memory/project-index.md`
- `.specify/memory/feature-map.md`
- `.specify/memory/domain-map.md`
- `.specify/memory/active-context.md`
- `.specify/memory/hotspots.md`

约束：

- 必须明确“两层分层优先于直接实现”
- 必须明确当前阶段只做文档工作

命令模板提示重点：

- 先固化工作原则，再讨论 feature
- 初始化项目级默认路由入口，而不只是写一份原则文档
- 把“什么时候不能进入下一步”写入 constitution
- 写明跨平台、跨 agent 的最小一致规则

### 5.2 `sp.specify`

用途：

- 创建 feature 的初始需求文档
- 形成第一层业务澄清的基线

输入：

- 原始需求描述
- 用户目标
- 范围信息

输出：

- `specs/<feature>/spec.md`
- `.specify/memory/feature-map.md`
- `.specify/memory/active-context.md`
- `specs/<feature>/memory/index.md`
- `specs/<feature>/memory/stable-context.md`
- `specs/<feature>/memory/open-items.md`

内容要求：

- 只写 what / why
- 不写技术方案
- 不写代码实现

命令模板提示重点：

- 引导用户聚焦 what / why
- 主动指出范围外内容
- 强制分离需求描述与实现设想

标准工作提示：

- `Read First`：优先读取 `.specify/memory/project-index.md` 与 `.specify/memory/constitution.md`，再读取原始需求、已有相关 feature 文档
- `Do`：提炼业务目标、参与角色、范围边界、成功标准、非目标，并初始化 feature 的默认记忆入口，同时把当前 feature 注册进 `feature-map.md` 并刷新 `active-context.md`
- `Do Not`：不要写架构、组件、接口、数据库或代码方案
- `Check Before Finish`：确认需求陈述没有混入实现承诺，没有遗漏核心业务目标，并已初始化 `memory/index.md`、`memory/stable-context.md`、`memory/open-items.md`，同时确认项目级入口已能定位到当前 feature
- `Next`：建议进入 `sp.clarify`

### 5.3 `sp.clarify`

用途：

- 作为文档阶段统一澄清入口，收敛 `spec / flow / ui` 中暴露出的关键业务分歧与决策缺口
- 通过结构化问答降低模型重复推理成本，并把关键决策沉淀为稳定文档与可查询日志

输入：

- `spec.md`
- `clarifications.md`
- `clarify-log.md`
- 已存在的 `flows/*` 或 `ui/*`（如果当前问题来自对应阶段）
- 用户追加说明
- 历史澄清记录与待确认问题
- 当前步骤暴露出的阻塞项或冲突项

输出：

- 视影响范围更新后的 `spec.md`
- 视影响范围更新后的 `clarifications.md`
- `clarify-log.md`
- `memory/stable-context.md`
- `memory/open-items.md`
- `memory/trace-index.md`

关注点：

- `CF-SPEC`：需求边界、业务框架、规则、对象、角色、验收口径
- `CF-FLOW`：主线阶段衔接、关键分支、异常路径、状态切换、流程责任边界
- `CF-UI`：页面分组、关键交互、页面责任边界、信息展示口径、操作约束
- `Immediate`：影响路线、边界、主结构或阻塞当前步骤的问题，立即发问
- `Batch`：局部且暂不阻塞的问题，积累到同一主题后再集中发问
- 单选题、多选题、可选备注
- 选项安全性、问题升级与冲突回退

非目标：

- 不单独新增 `cf_spec` / `cf_flow` / `cf_ui` 命令
- 不把不安全的开放式选项直接抛给用户
- 不在低层矛盾未解时继续细化局部方案
- 不替代 `sp.flow` 或 `sp.ui` 生成完整展示资产
- 不进入技术方案

命令模板提示重点：

- 先判断问题属于 `CF-SPEC`、`CF-FLOW` 还是 `CF-UI`
- 先问宏观路线问题，再问局部问题
- 重要且阻塞的问题立即提问，其余问题按主题积累后集中提问
- 默认优先生成单选题或多选题，允许用户补充可选备注
- 选项必须在当前框架内、可组合且不会引入隐性冲突
- 如果无法安全生成局部选项，应退回更宏观的问题重新澄清
- 已稳定结论写入 `clarifications.md`，问题与决策过程写入 `clarify-log.md`

标准工作提示：

- `Read First`：优先读取 `memory/index.md` 与 `memory/open-items.md`，再读取 `spec.md`、`clarifications.md`、`clarify-log.md` 以及当前问题来源文档
- `Do`：先判断当前是否存在路线级冲突或宏观边界缺口；按 `CF-SPEC / CF-FLOW / CF-UI` 归类问题；将问题分为 `Immediate` 与 `Batch`；先固化业务框架，再补齐角色、对象、规则、边界、异常、流程或界面决策；若当前问题来自 `flow` 或 `ui` 调整，还必须先把自然语言描述解析到唯一 `Target ID`；把已决结论先写回 `Source Of Truth`，再按 `Required Sync Files` 刷新受影响文档，并把提问历史、候选选项、最终答案、影响范围、回看条件、传播状态写入 `clarify-log.md`
- `Do Not`：不要提前画完整 UI、流程图或开始技术设计；不要把互相冲突的选项塞进同一道题；不要在宏观路线未确认时继续局部细化
- `Check Before Finish`：确认业务主线阶段、角色责任边界、对象流转骨架、关键判断点都已显式写出；确认每个关键规则都有适用条件、优先级和例外说明；确认高影响问题已即时发问，低影响问题已进入批量队列；若本次涉及 `flow` 或 `ui` 调整，确认 `Target ID`、`Operation`、`Affected IDs`、`Affected Documents`、`Source Of Truth`、`Required Sync Files`、`Propagation Status` 与回写结果一致；确认 `clarifications.md`、`clarify-log.md`、`stable-context.md`、`open-items.md` 与相关 `flows/*`、`ui/*`、`worksets/*` 已同步
- `Next`：若当前问题来自 `sp.specify`，建议进入 `sp.flow`；若当前问题来自 `sp.flow` 或 `sp.ui`，建议回到被阻塞的原步骤继续

业务框架固定结构：

1. `Mainline Stages`
2. `Stage Responsibility Boundaries`
3. `Object Flow Backbone`
4. `Top-Level Decision Points`
5. `Capability Boundaries`

要求：

- `Mainline Stages` 只写主线阶段，不混入页面细节
- `Stage Responsibility Boundaries` 说明阶段 owner、参与者和边界
- `Object Flow Backbone` 只说明核心对象如何穿过主线
- `Top-Level Decision Points` 只写会影响流程分叉的高层判断
- `Capability Boundaries` 明确当前纳入与延期能力

`sp.clarify` 的结构化问答规则：

1. 问题分类
   - `CF-SPEC`：影响需求口径、角色责任、能力边界、规则框架的问题
   - `CF-FLOW`：影响流程主链、阶段切换、分支条件、异常回路的问题
   - `CF-UI`：影响页面分组、关键操作、展示口径、交互限制的问题
2. 提问时机
   - `Immediate`：会影响路线、能力边界、主流程结构、主页面结构，或会阻塞当前步骤继续推进
   - `Batch`：暂不阻塞、可局部延后、且可与同主题问题合并提问
   - 满足以下任一条件时必须判为 `Immediate`：影响 in-scope / out-of-scope、影响主线阶段数量或顺序、影响页面分组主结构、影响关键对象 owner、会导致当前步骤无法继续落文档
   - 满足以下全部条件时才可判为 `Batch`：不改路线、不改主骨架、不影响当前步骤继续、可与同主题问题统一作答
   - 同一主题累计达到 `3` 个局部问题，或同一 workset 已出现连续两轮同类回退时，应把该主题批量问题整体冲刷为一次集中提问
   - 在进入 `sp.gate`、`sp.bundle`、`sp.plan` 前，未处理的高影响 `Batch` 问题必须先执行一次冲刷检查
3. 题型默认值
   - 默认使用单选题或多选题
   - 允许附带 `Optional Remarks`
   - 不默认依赖开放式长文本回答
4. 选项生成约束
   - 单选题选项必须互斥
   - 多选题选项必须可组合，不能隐藏冲突
   - 选项必须落在当前 feature 范围与现有框架内
   - 若无法生成安全选项，不应继续问低层问题，而应退回更宏观的路线问题
5. 文档落点
   - 稳定结论进入 `clarifications.md`
   - 提问过程、候选项、答案、影响范围、回看条件进入 `clarify-log.md`
   - 若结论改变了基线需求、流程口径或界面口径，还应同步刷新受影响文档与 `memory/*`
   - `Immediate` 问题必须在 `clarify-log.md` 中留下可单独回放的完整记录
   - `Batch` 问题必须先进入按主题分组的队列，并在冲刷后补齐对应问答记录与处理状态
   - 任何一次澄清落地都必须先更新 `Source Of Truth`，再刷新 `Required Sync Files`
   - 若传播未完成，问题状态不得标成 `Closed`
6. 定向修改记录
   - 如果问题来自 `sp.flow` 或 `sp.ui` 的后续调整，必须补充 `Target Type`、`Target ID`、`Canonical Name`、`Alias Keywords`、`Owner ID`、`Operation`、`Reason`、`Source Of Truth`、`Affected IDs`、`Affected Documents`、`Required Sync Files`、`Need Back-Propagation`、`Propagation Status`、`Propagation Check`
   - `Operation` 建议限定为 `Add`、`Update`、`Move`、`Split`、`Merge`、`Deprecate`、`Remove`
   - 若用户只给自然语言描述，应先尝试映射到唯一 ID；若仍不唯一，应回退到更高层归属问题，而不是直接修改局部文档
7. 标准定向修改句式
   - 更新类：`把 <Target ID> 的 <属性> 改成 <新值>`
   - 删除类：`删除 <Target ID>，并把 <影响对象> 并入 <目标对象>`
   - 移动类：`把 <Target ID> 从 <旧 Owner ID> 移到 <新 Owner ID>`
   - 拆分类：`把 <Target ID> 拆成 <新 Target ID A> 和 <新 Target ID B>`
   - 合并类：`把 <Target ID A> 和 <Target ID B> 合并为 <新 Target ID>`
   - 自然语言映射示例：`申请页提交按钮` -> `ACTION-LEAVE-APPLY-020`
   - 自然语言映射示例：`审批页驳回原因框` -> `FIELD-LEAVE-APPROVAL-010`
   - 自然语言映射示例：`列表页筛选区` -> `SECTION-LEAVE-LIST-010`
8. 目标解析顺序
   - 先识别问题域：`spec`、`flow`、`ui`
   - 再识别对象类型：页面、分区、动作、字段、阶段、步骤、判断点、异常点
   - 再利用 `Canonical Name`、`Alias Keywords`、`Owner ID`、`Source Rules / Source Flows / Source Screens` 反查候选对象
   - 若候选对象大于 1，不直接猜测，必须改问归属问题，例如先确认是“申请页提交按钮”还是“审批页提交按钮”
   - 若发现多个局部对象同时冲突，应回退到更高层路线问题，而不是继续堆局部修补题
9. `flow / ui` 调整回路
   - 纯展示性、无业务含义变化的局部修订，可在 `sp.flow` 或 `sp.ui` 中直接修改，但仍建议记录对应 `Target ID`
   - 只要变更触及规则、阶段边界、流程分支、页面责任、关键动作或字段约束，就应先经 `sp.clarify` 定案，再回到原步骤改文档
10. 批量队列与冲刷规则
   - `Batch` 记录必须至少带上 `Queue Topic`、`Queue Reason`、`Queue Size`、`Flush Trigger`、`Latest Safe Step`
   - `Queue Topic` 应按路线问题、审批范围、字段精度、通知策略、页面归属等可复用主题命名，不要按一次临时提问随意命名
   - `Flush Trigger` 至少从以下集合中选择：`Topic Threshold Reached`、`Before Gate`、`Before Bundle`、`Before Plan`、`Drift Detected`、`User Requested Review`
   - 一次冲刷应尽量把同主题问题合并成 `1` 道单选或多选题，而不是把碎片问题逐条抛给用户
   - 若冲刷后仍无法生成安全选项，必须升级为更宏观的 `Immediate` 路线问题
11. 提问包最小结构
   - 每道对外提问都应显式包含：`Question ID`、`Category`、`Mode`、`Question Type`、`Question`、`Allowed Options`、`Why This Matters`、`Impact Scope`
   - 若问题针对 `flow` 或 `ui`，还应显式包含：`Target ID`、`Target Type`、`Owner ID`、`Affected Documents`
   - 单选题建议控制在 `2` 到 `4` 个选项之间，多选题建议控制在 `2` 到 `6` 个可组合选项之间
   - 任何一个选项若会导致后续必须同时重写路线、主流程和主页面结构，则该选项不应与局部方案并列，必须升级为更宏观问题
12. 传播完成定义
   - `Source Of Truth` 已先完成更新
   - `Required Sync Files` 中列出的文档已全部刷新，或已明确标记未完成原因
   - `memory/stable-context.md`、`memory/open-items.md`、`memory/trace-index.md` 中受影响项已同步
   - 若传播影响 workset 入口，`memory/index.md`、`memory/worksets/*`、`.specify/memory/active-context.md` 也已同步
   - `Propagation Status` 只允许使用 `Not Started`、`Source Updated`、`In Sync`、`Partial`、`Blocked`
   - `Propagation Check` 必须显式说明“哪些文件已更新，哪些文件仍待更新”

### 5.4 `sp.flow`

用途：

- 将已澄清的业务流程单独沉淀为可检查的流程资产

输入：

- `spec.md`
- `clarifications.md`

输出：

- `flows/index.md`
- `flows/main-flow.mmd`
- `flows/sequence.mmd`
- `flows/state.mmd`
- `memory/trace-index.md`

展示框架：

- `Mermaid flowchart`
- `Mermaid sequenceDiagram`
- `Mermaid stateDiagram-v2`

要求：

- 主流程图表达正常路径和关键判断
- 时序图表达角色与系统交互顺序
- 状态图表达状态切换与触发条件
- `flows/index.md` 必须为每条主流程提供 `Flow ID`、`Canonical Name`、`Alias Keywords`、`Owner Stage`、`Key Step IDs`
- 主流程至少显式编号到 `FLOW-*`、`STEP-*`、`DEC-*`、`EX-*`
- Mermaid 节点标签应尽量直接带出对应 ID，避免只靠位置识别
- 后续调整流程时，必须优先引用 `FLOW-* / STEP-* / DEC-* / EX-*`，不能只说“第二个判断框”这类模糊位置

非目标：

- 不产出 BPMN
- 不产出高保真图形设计

命令模板提示重点：

- 先核对流程是否已从 `clarify` 中稳定
- 如果规则未清，不允许强行画完整流程
- 每张图只表达一个主主题，避免过度拥挤

标准工作提示：

- `Read First`：优先读取 `memory/index.md`，再读取 `spec.md`、`clarifications.md` 与规则列表
- `Do`：先写 `flows/index.md` 作为流程入口，并为每条流程补齐 `Canonical Name`、`Alias Keywords`、`Owner Stage`；再分别输出主流程图、关键交互时序图、状态流转图，并把关键 `FLOW-* / STEP-* / DEC-* / EX-*` 主链刷新到 `memory/trace-index.md`
- `Do Not`：不要用图形工具稿替代文本图，不要补造未经确认的业务规则
- `Check Before Finish`：确认三张图之间的角色、动作、状态名称一致；确认关键流程已回链进 `trace-index.md`；确认 `STEP-*`、`DEC-*`、`EX-*` 已足够支撑后续定向修改；若已接近中型规模，还要确认 `flows/index.md` 首屏已提供按域或子主题分组的索引表
- `Next`：建议进入 `sp.ui`

### 5.5 `sp.ui`

用途：

- 将已澄清业务映射为页面结构与配置型原型

输入：

- `spec.md`
- `clarifications.md`
- `flows/*`

输出：

- `ui/index.md`
- `ui/screen-map.md`
- `ui/screen-*.md`
- `ui/jsonforms/schema.json`
- `ui/jsonforms/uischema.json`
- `ui/jsonforms/data.example.json`
- `memory/trace-index.md`

展示框架：

- `Markdown` 页面卡片
- `Markdown` 页面清单
- `JSON Forms`

要求：

- 页面卡片说明页面目标、进入条件、主要区块、动作、规则、异常提示
- 页面卡片必须显式覆盖页面状态、区块显隐条件、字段可编辑条件和提交反馈
- 页面动作应尽量回链到 `UC-*`，关键提交或查询动作应尽量回链到 `API-*`
- `JSON Forms` 仅用于配置型页面和表单型页面
- 当前阶段不产出高保真视觉稿
- 每个页面应具备稳定 `SCREEN-*` 编号
- `ui/screen-map.md` 必须为每页提供 `Screen ID`、`Canonical Name`、`Alias Keywords`、`Module`、`Key Action IDs`
- 单页卡片至少要显式编号到 `SCREEN-*`、`SECTION-*`、`ACTION-*`、`FIELD-*`
- 后续调整页面时，必须优先引用 `SCREEN-* / SECTION-* / ACTION-* / FIELD-*`，不能只说“上面那个按钮”或“第二块内容”

非目标：

- 不写 React/Vue 组件代码
- 不输出实现级样式方案

命令模板提示重点：

- 页面卡片优先，组件实现后置
- 先说明页面目标和动作，再组织区块
- `JSON Forms` 只服务于配置页和表单页

标准工作提示：

- `Read First`：优先读取 `memory/index.md` 与 `memory/trace-index.md`，再读取 `spec.md`、`clarifications.md`、`flows/*`
- `Do`：先整理 screen map，并为每页补齐 `Canonical Name`、`Alias Keywords`、`Key Action IDs`；再逐页写页面卡片，显式整理 `SECTION-*`、`ACTION-*`、`FIELD-*` 清单；最后只为配置页或表单页补 `JSON Forms`，并把关键 `SCREEN-*`、`SECTION-*`、`ACTION-*`、`UC-*`、`API-*` 追踪链刷新到 `memory/trace-index.md`
- `Do Not`：不要输出高保真视觉稿，不要写前端框架代码
- `Check Before Finish`：确认页面入口、动作、规则、异常提示、页面状态、显隐条件和可编辑条件可回链到业务流程；确认关键页面、区块、动作、字段都已具备稳定编号；若页面达到 `20` 个及以上，还要确认 `screen-map.md` 首屏已提供“模块 / 页面数 / 关键页面 / 入口文件”索引表；同时确认追踪索引已经覆盖关键页面链路
- `Next`：建议进入 `sp.gate`

### 5.6 `sp.gate`

用途：

- 检查第一层业务文档是否允许进入第二层交付设计

输入：

- `spec.md`
- `clarifications.md`
- `flows/*`
- `ui/*`

输出：

- `gate.md`
- `.specify/memory/project-index.md`
- `.specify/memory/feature-map.md`
- `memory/index.md`
- `memory/open-items.md`

结论类型：

- `PASS`
- `PASS WITH OPEN QUESTIONS`
- `BLOCKED`

检查项：

- 业务框架是否完整
- 业务框架是否按固定顺序出现
- 主流程是否闭环
- 关键分支是否存在
- 主要异常是否覆盖
- 规则优先级是否明确
- 页面清单是否明确
- 阻塞项是否显式列出

兼容说明：

- `sp.gate` 吸收原版 `/speckit.checklist` 的校验入口语义
- 当前核心规范只使用 `sp.gate`，不再把 `/sp.checklist` 作为并行入口写入规范正文

命令模板提示重点：

- 输出必须给出 `PASS`、`PASS WITH OPEN QUESTIONS` 或 `BLOCKED`
- 必须先判断业务框架是否已经稳定，不能跳过骨架检查直接看流程图
- 不能只给空泛评价，必须指出阻塞项和证据

标准工作提示：

- `Read First`：优先读取 `.specify/memory/project-index.md`、`memory/index.md`、`memory/open-items.md`，再读取第一层全部产物
- `Do`：先检查业务框架是否完整且顺序正确，再逐项检查流程闭环、异常覆盖、规则优先级、页面清单与阻塞项，并同步刷新 feature memory 中的 gate 状态与阻塞项状态，同时把 gate 结论同步进项目级 `project-index.md` 与 `feature-map.md`
- `Do Not`：不要用模糊表述替代结论，不要因为赶进度放过关键缺口
- `Check Before Finish`：确认每个结论都有证据文件与对应问题说明，并明确记录业务框架检查结果；同时确认 `memory/index.md`、`memory/open-items.md`、`.specify/memory/project-index.md`、`.specify/memory/feature-map.md` 已更新
- `Next`：通过则进入 `sp.bundle`，阻塞则回到缺口所在步骤

### 5.7 `sp.bundle`

用途：

- 将第一层散落产物整理成可交接的业务产物包

输入：

- `spec.md`
- `clarifications.md`
- `flows/*`
- `ui/*`
- `gate.md`

输出：

- `bundle.md`
- `.specify/memory/active-context.md`
- `memory/index.md`
- `memory/stable-context.md`

要求：

- 汇总 feature 目标、角色、流程、规则、页面、开放问题
- 显式给出 feature 的业务框架快照
- 指明哪些内容已稳定
- 指明哪些内容仅属于风险提示，哪些属于阻塞项
- 作为第二层输入时，应尽量保留 `ROLE-*`、`RULE-*`、`FLOW-*`、`SCREEN-*` 等编号

命令模板提示重点：

- 把散落文档整理成可交接包，而不是简单复制粘贴
- 业务框架快照要先于细节摘要出现
- 每个开放问题都要标注影响范围
- 明确第二层可以直接消费的内容

标准工作提示：

- `Read First`：优先读取 `.specify/memory/active-context.md`、`memory/index.md`、`memory/stable-context.md`，再读取 `spec.md`、`clarifications.md`、`flows/*`、`ui/*`、`gate.md`
- `Do`：先整理业务框架快照，再按目标、角色、规则、流程、页面、风险、阻塞项进行归档整理，并把第二层接手所需的稳定背景重新压缩进 `stable-context.md`，同时刷新项目级 `active-context.md` 中的推荐阅读顺序
- `Do Not`：不要重写第一层，不要隐藏未决事项
- `Check Before Finish`：确认第二层接手时不需要重新猜业务主线、阶段划分、角色边界和对象主骨架，并更新 `memory/index.md` 与 `.specify/memory/active-context.md` 中的推荐阅读顺序
- `Next`：建议进入 `sp.plan`

业务框架快照固定结构：

1. `Mainline Stages`
2. `Stage Boundaries`
3. `Object Backbone`
4. `Top-Level Decision Points`
5. `In-Scope And Deferred Boundaries`

要求：

- `bundle.md` 中的快照应比 `clarifications.md` 更紧凑，只保留第二层必须消费的骨架信息
- 名称可以适度压缩，但语义必须与 `clarifications.md` 对齐

### 5.8 `sp.plan`

用途：

- 把第一层业务产物包转换成第二层交付设计文档

输入：

- `bundle.md`

输出：

- `plan.md`
- `.specify/memory/feature-map.md`
- `memory/index.md`
- `memory/trace-index.md`
- `memory/worksets/index.md`
- `memory/worksets/ws-*.md`
- `delivery/01-prd.md`
- `delivery/02-screen-to-delivery-map.md`
- `delivery/03-use-case-matrix.md`
- `delivery/04-domain-model.md`
- `delivery/05-data-entity-catalog.md`
- `delivery/06-table-index.md`
- `delivery/tables/table-*.md`
- `delivery/07-api-contracts.md`
- `delivery/08-permissions-matrix.md`
- `delivery/09-events-and-side-effects.md`
- `delivery/10-non-functional-requirements.md`
- `delivery/11-module-boundaries.md`
- `delivery/12-test-and-acceptance.md`

内容要求：

- 范围与阶段划分
- 页面到实现对象的映射
- 用例矩阵
- 模块边界
- 数据对象与数据流
- 表级规格
- 外部依赖与接口契约
- 权限矩阵与副作用约束
- 非功能约束
- 测试与验收入口
- `plan.md` 给出自动开发就绪结论
- API、表、权限、副作用、验收文档具备最小结构化字段，避免后续 agent 继续猜测

注意：

- `sp.plan` 在当前体系里仍然属于文档工作
- `sp.plan` 不直接启动编码

命令模板提示重点：

- 把第一层结果转换成交付对象
- 不要回退去重写业务需求
- 不要开始实现

标准工作提示：

- `Read First`：优先读取 `.specify/memory/feature-map.md`、`memory/index.md`、`memory/stable-context.md`、`memory/trace-index.md`，再读取 `bundle.md` 和 constitution 中关于第二层的规则
- `Do`：形成范围划分、页面映射、用例矩阵、模块边界、数据对象、表级规格、外部依赖、接口契约、权限矩阵、副作用规则、验收入口和自动开发就绪结论，并把第二层切分为可局部推进的 workset，同时把 workset 数量与主要入口同步进项目级 `feature-map.md`
- `Do Not`：不要写代码，不要跳过 bundle 中的开放问题和风险
- `Check Before Finish`：确认页面、用例、接口、表、权限与验收对象都能回链到第一层依据，并且 API、表、权限、副作用、验收文档已具备最小结构化字段；确认 `memory/worksets/*` 已建立局部阅读入口；若达到拆分触发器，确认至少存在 `2` 个 `ws-*.md`；若已接近中型规模，确认 `screen-map.md`、`flows/index.md`、`delivery/07-api-contracts.md`、`delivery/06-table-index.md` 首屏都已提供分组索引；若已达到中型项目工作负载，确认 `plan.md` 已写出范围拆分理由和 workset 拆分理由；并确认 `.specify/memory/feature-map.md` 已可显示当前 feature 的主要 workset 摘要
- `Next`：建议进入 `sp.tasks`

### 5.9 `sp.tasks`

用途：

- 从 `plan.md` 生成可执行的交付任务文档

输入：

- `plan.md`
- `delivery/*`

输出：

- `tasks.md`
- `memory/index.md`
- `memory/worksets/index.md`
- `memory/worksets/ws-*.md`

内容要求：

- 任务分组
- 前置依赖
- 可并行项
- 阶段性检查点
- 验收对应关系
- 主要追踪对象

注意：

- 当前阶段的 `tasks.md` 是文档任务拆解
- 不是代码自动执行清单
- 但它必须足够精确，能映射到页面、接口、表和验收对象

命令模板提示重点：

- 任务必须能映射回 `plan.md`
- 任务必须能映射回验收对象
- 任务应尽量映射回 `SCREEN-*`、`API-*`、`TABLE-*`
- 避免纯技术人自嗨式拆分

标准工作提示：

- `Read First`：优先读取 `memory/index.md` 与 `memory/worksets/index.md`，再读取 `plan.md` 与 `delivery/*`
- `Do`：按交付目标拆任务、标注依赖、并行关系、阶段检查点和验收映射，并把任务绑定回各自 workset
- `Do Not`：不要生成只对工程师自己有意义的碎片任务，不要提前排实现细节代码
- `Check Before Finish`：确认每个任务都有明确归属、前置条件、完成判据和主要追踪对象，并且每个任务都能指向一个主要 workset；同时确认 `worksets/index.md` 仍能用“问题类型 / 关键词 / 推荐 workset / 最小阅读集”快速选路，而不是退化成任务目录
- `Next`：建议进入 `sp.analyze`

### 5.10 `sp.analyze`

用途：

- 对文档工作流中的跨产物一致性做检查

输入：

- `spec.md`
- `clarifications.md`
- `flows/*`
- `ui/*`
- `bundle.md`
- `plan.md`
- `delivery/*`
- `tasks.md`

输出：

- `analysis.md`
- `.specify/memory/project-index.md`
- `.specify/memory/feature-map.md`
- `.specify/memory/hotspots.md`

检查重点：

- 需求和任务是否断裂
- 流程与页面是否不一致
- 规则和数据契约是否冲突
- 页面、用例、接口、表之间是否断链
- 权限矩阵和副作用规则是否缺失
- 开放问题是否被错误地当作已决事项
- 验收样例是否能映射到任务
- 是否已达到自动开发最低补充规格
- 若 feature 已接近中型规模，是否已评估拆分结构、查询结构与 workset 路由仍然有效
- 若 feature 已达到中型项目工作负载，是否已执行抽样冒烟检查
- 缺口属于 UI、API、数据、权限、副作用还是验收精度

推荐输出表：

- 最终结论表应至少包含：结论、是否允许进入后续自动实现、总体说明
- 缺口分类表应至少包含：Gap ID、类别、严重级别、问题描述、影响范围、证据、建议回退步骤

命令模板提示重点：

- 分析的目标是找裂缝，不是复述文档
- 必须指出具体冲突、缺口和影响
- 最终必须给出 `PASS`、`PASS WITH RISKS` 或 `BLOCKED`

标准工作提示：

- `Read First`：先读取项目级 `.specify/memory/*` 入口，再读取 feature 级 `memory/*` 入口，最后读取第一层与第二层全部核心产物
- `Read First` 补充：若项目级入口仍显示 `No active feature`、`not selected` 或其他与当前工作区不符的旧状态，必须继续核对 `feature-map.md`、`specs/*/memory/index.md` 与当前正文，再决定是否真的缺少目标 feature
- `Do`：先判断项目级入口是否 stale、是否与 feature 级入口或正文冲突；若只有一个清晰可用的 feature 级入口，则直接以该 feature 继续分析，并把项目级入口陈旧列为要刷新的发现。然后检查需求、流程、页面、规则、计划、任务之间的断裂和冲突，并基于通过线给出最终 verdict；同时检查 memory 是否过期、追踪索引是否断裂、workset 是否仍然代表当前局部结构，并把高优先级风险同步进 `.specify/memory/hotspots.md`，把 readiness 结论同步进 `.specify/memory/project-index.md` 与 `.specify/memory/feature-map.md`
- `Do Not`：不要只写摘要，不要把未决问题包装成一致
- `Check Before Finish`：确认每个发现都包含影响说明、证据位置、缺口分类和建议回退步骤；若 feature 已接近中型项目规模，还要确认已判断拆分结构、查询结构和 workset 路由是否仍有效；若已达到中型项目工作负载，还要确认已记录冒烟范围、关键样本、抽样结论和 verdict 影响，且未执行冒烟检查时不得判定 `PASS`；同时确认已判断 memory 和 workset 是否陈旧，并已刷新项目级热点与 readiness 入口；最终结论必须落在 `PASS`、`PASS WITH RISKS` 或 `BLOCKED`
- `Next`：若存在重大裂缝，返回对应步骤修正；否则结束文档阶段

参考成品示例：

- [reference/sp-analysis-example-leave-request.md](sp-analysis-example-leave-request.md)

## 6. 展示框架规范

### 6.1 流程展示

`sp.flow` 固定使用：

- `Mermaid flowchart`
- `Mermaid sequenceDiagram`
- `Mermaid stateDiagram-v2`

原因：

- 文本可维护
- 便于 agent 稳定生成
- 便于版本管理
- 与当前仓库第一层方法一致

### 6.2 界面展示

`sp.ui` 固定使用：

- `Markdown` 页面清单
- `Markdown` 页面卡片
- `JSON Forms`

原因：

- 页面卡片适合表达页面目标、区块和行为
- 页面卡片也适合表达页面状态、显隐条件、可编辑条件和动作追踪关系
- `JSON Forms` 适合表达配置型和表单型页面的结构化原型
- 两者组合能在不进入实现的前提下形成可复核 UI 文档

## 7. 与原版命令的映射

说明：

- 下表先按语义步骤映射，再给出当前常见宿主触发示例
- 当前不再把 Codex 视为 `/prompts:*` prompt 宿主

| 原版命令语义 | `sp` 语义 | 当前常见触发示例 | 当前阶段定位 |
| --- | --- | --- |
| `speckit.constitution` | `sp.constitution` | Codex: `$sp-constitution`; Claude: `/sp-constitution`; slash hosts: `/sp.constitution` | 文档工作 |
| `speckit.specify` | `sp.specify` | Codex: `$sp-specify`; Claude: `/sp-specify`; slash hosts: `/sp.specify` | 文档工作 |
| `speckit.clarify` | `sp.clarify` | Codex: `$sp-clarify`; Claude: `/sp-clarify`; slash hosts: `/sp.clarify` | 文档工作 |
| `speckit.checklist` | `sp.gate` | Codex: `$sp-gate`; Claude: `/sp-gate`; slash hosts: `/sp.gate` | 文档工作 |
| 无 | `sp.flow` | Codex: `$sp-flow`; Claude: `/sp-flow`; slash hosts: `/sp.flow` | 文档工作 |
| 无 | `sp.ui` | Codex: `$sp-ui`; Claude: `/sp-ui`; slash hosts: `/sp.ui` | 文档工作 |
| 无 | `sp.gate` | Codex: `$sp-gate`; Claude: `/sp-gate`; slash hosts: `/sp.gate` | 文档工作 |
| 无 | `sp.bundle` | Codex: `$sp-bundle`; Claude: `/sp-bundle`; slash hosts: `/sp.bundle` | 文档工作 |
| `speckit.plan` | `sp.plan` | Codex: `$sp-plan`; Claude: `/sp-plan`; slash hosts: `/sp.plan` | 文档工作 |
| `speckit.tasks` | `sp.tasks` | Codex: `$sp-tasks`; Claude: `/sp-tasks`; slash hosts: `/sp.tasks` | 文档工作 |
| `speckit.analyze` | `sp.analyze` | Codex: `$sp-analyze`; Claude: `/sp-analyze`; slash hosts: `/sp.analyze` | 文档工作 |

## 8. 本阶段交付边界

本阶段完成标准：

- 文档命令体系定义完成
- 两层文档产物结构定义完成
- `flow` 与 `ui` 的展示框架写入命令规范
- 项目级与 feature 级 query-first memory 规则写入命令规范
- 上下文窗口预算与中型项目硬约束写入命令规范
- fork 原版 `Spec Kit` 的改造边界清楚
- 跨平台安装与 agent 兼容要求清楚

本阶段不完成：

- 生产代码命令
- 代码生成策略
- 运行时脚本开发
- 真实 UI 渲染器接入
