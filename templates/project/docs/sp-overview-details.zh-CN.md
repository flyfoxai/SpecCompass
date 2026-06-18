# `sp` 详细说明

## 这套机制解决什么问题

- 需求和最终实现之间有大量路线、流程、界面决策需要澄清。
- 大模型上下文有限，容易重复推理、前后不一致。
- 项目一旦变大，模型容易读不全、记不住、找不到入口。

`sp` 的做法不是让模型一次看完整个项目，而是先搭骨架，再让模型按局部 workset 逐块推进。

## 核心机制

### 两层文档推进

- 第一层：业务澄清文档
- 第二层：交付设计文档

新 feature 进入两层推进前必须先运行 `sp.prd`。它把上游发现放到 `specs/<feature>/prd.md`，并把 PRD-to-spec outline readiness 写入 `specs/<feature>/spec-outline.md`，但稳定需求仍然必须经过 `sp.specify`。

### 统一澄清入口

`sp.clarify` 统一处理 `CF-SPEC`、`CF-FLOW`、`CF-UI` 三类高影响问题。

默认优先单选题、多选题和必要备注，尽量减少模糊问答。

### Query-First Memory

固定两层记忆入口：

- 项目级：`.specify/memory/*`
- feature 级：`specs/<feature>/memory/*`

记忆层不替代事实源，只负责路由、压缩和过滤。

### Workset

`sp.plan` 之后必须按局部业务闭环拆 workset，让模型只处理当前那一小块。

### 受控代码阶段

`sp` 是 documentation-first，不是 documentation-only。只有 `sp.plan` 写清 `Implementation Readiness`，并且 `sp.tasks` 生成已授权的 `Mode: impl` 任务包后，才进入代码实现。

实现阶段不要一上来全仓读源码，应该先从 memory 和任务包续作：

- 先读项目/feature memory、trace/open-items 和任务 `Read Set`
- 确认 `Allowed Write Set`、`Required Checks`、依赖检查和反向 trace 预期
- 只编辑当前任务允许范围
- 收尾时写 `Delta Summary` 和 `Proposed Updates`，让复核从真实增量开始，而不是重新全量审计

`sp.analyze` 和 `sp.gate` 对代码工作按增量优先复核：`Delta Summary`、当前 diff、任务包、trace/open-items，然后才读必要源码。删除、移动、重命名、公共行为、schema、权限、路由、事件或验收改动，必须有反向 trace/搜索证据，或者写入已跟踪 open item。

readiness 证据要轻量，但必须可检查。`Evidence Signature` 至少写清来源文件或 source docs、关键锚点、open-item 状态、视觉/人工核对状态和当前检查证据。人工确认必须能追到决策记录，不能只靠模型一句话。机械检查负责发现结构缺失和断链，业务语义是否真的 ready 仍由 `sp.analyze` 和 `sp.gate` 判断。

### 多 Agent 交接

并行开发时，由一个 coordinator 分配 workset，worker 只能在不重叠的 `Allowed Write Set` 内工作。memory、trace、tasks、analysis、gate、schema、route、中心注册表等共享 truth 文件，默认由 coordinator 串行合并，除非任务明确授权。

worker 应提交 `Delta Summary`、已运行检查和 `Proposed Updates`；coordinator 先处理冲突，再让 `/sp.analyze` 或 `/sp.gate` 推进阶段。

### 澄清传播闭环

澄清答案一旦稳定，就必须先更新 `Source Of Truth`，再同步 `Required Sync Files`，未同步完的 memory 要视为 stale。

## 预期效果

- 每一步都有更明确的阅读入口。
- 已稳定结论能沉淀下来，减少重复推理。
- 大 feature 可以按 workset 局部推进。
- 不同模型或不同人接手时，一致性更强。

## 适用情况

适合需求复杂、流程多、界面多、对象多，且希望为后续自动开发打基础的大中型业务项目。

不太适合一两个页面、几条简单规则的小工具。

## 建议阅读顺序

1. `docs/reference/sp-command-spec.md`
2. `docs/reference/sp-context-memory-architecture.md`
3. `.specify/memory/constitution.md`
4. `.specify/memory/project-index.md`
5. 对目标 feature 运行 `sp.prd`；清楚需求走精简 PRD，模糊想法走访谈式 PRD
6. 只有 PRD-to-spec outline readiness 可用后，才用 `sp.specify` 开始或稳定 feature

## Codex 补充说明

- 用户可见命令身份统一为 `sp.*`。
- Codex 保持原版风格，把核心 skill 包安装到 `.agents/skills/sp-*/SKILL.md`；输入 `$sp-prd`、`$sp-specify` 这类 `$sp-*`，或运行 `/skills` 选择对应 `sp-*` skill。已废弃的 prompt/plugin 命令面不属于当前 Codex 路径。
- Claude 通过 `.claude/commands/sp.*.md` 直接暴露项目斜杠命令
