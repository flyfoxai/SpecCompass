# `SpecCompass`

`sp` 是一个基于 `Spec Kit` 改造出来的分层文档工作流。
框架步骤名统一使用 `sp.*`，不同 agent 只是在触发形式上适配。

它的重点不是直接跳到代码，而是先把需求、业务框架、流程、界面、交付设计和一致性分析按固定步骤沉淀成可查询、可回链、可局部推进的文档骨架，帮助大模型在有限上下文里稳定工作。

当前流程是文档优先，但不是只做文档。只有 `plan.md` 写明 `Implementation Readiness`，`tasks.md` 生成可执行的 `Mode: impl` 任务包后，实现阶段才允许作为下游受控阶段进入。

`sp.prd` 是可选命令。只有产品意图还不成熟、需要先做上游 PRD 发现时才使用；清楚的需求可以直接从 `sp.specify` 开始。

## 最核心的东西

- 两层推进：先业务澄清，再交付设计。
- 可选 PRD 发现：`sp.prd` 把早期产品意图整理成草稿，但 `prd.md` 不是稳定事实源。
- 统一澄清：`sp.clarify` 统一处理 spec、flow、ui 的高影响问题。
- Query-First Memory：先查项目级和 feature 级 memory，再决定读哪些正文。
- Workset：把大 feature 拆成局部工作面，减少上下文压力。
- 代码续作任务包：实现任务要写清最小 `Read Set`、直接依赖检查、反向 trace 要求、预期增量、`Delta Summary` 和共享更新建议。
- 增量优先复核：实现后先看 `Delta Summary` 和当前 diff，再决定是否扩大读取源码上下文。
- 澄清传播闭环：结论变更后必须同步相关文档和 memory。

## 基本流程

1. `sp.constitution`
2. `[可选] sp.prd`
3. `sp.specify`
4. `sp.clarify`
5. `sp.flow`
6. `sp.ui`
7. `sp.gate`
8. `sp.bundle`
9. `sp.plan`
10. `sp.tasks`
11. `sp.analyze`
12. `sp.gate`
13. `sp.implement`
14. `sp.analyze`
15. `sp.gate`

## 触发方式

- 支持 slash 命令的宿主，用户可见命令统一使用 `sp.*` 命名空间。Claude 这类宿主直接显示 `/sp.*`。
- Codex 的稳定入口是 skills：输入 `$` 或运行 `/skills`，选择 `sp-prd`、`sp-specify`、`sp-plan`、`sp-tasks`、`sp-analyze`、`sp-implement`、`sp-gate`、`sp-ui`。
- skills 宿主的磁盘包保持原版风格，例如 `sp-specify/SKILL.md`；Codex 中应通过 skills UI 选择它们，不要期待 `/sp.*` 斜杠命令必然显示。
- 当前安装器把宿主集成文件写入目标项目，而不是旧的全局 prompt 目录

## 代码阶段纪律

- `sp.plan` 负责 `Implementation Readiness`、代码/测试映射、依赖面和反向 trace 预期。
- `sp.tasks` 把 ready 的 workset 转成 `Mode: impl` 任务包，写清 `Allowed Write Set`、`Required Checks`、`Read Set`、依赖检查、反向 trace 检查、预期增量和共享更新建议。
- `sp.implement` 从 memory 和任务包开始，只编辑选中的已授权任务，并在声称完成前填写 `Delta Summary`。
- `sp.analyze` 和 `sp.gate` 按增量优先复核：`Delta Summary`、当前 diff、任务包、trace/open-items，然后才读必要源码。
- 多 agent worker 默认不直接改共享 memory，除非被指定为 coordinator；共享更新通过 `Proposed Updates` 串行合并。

## 下一步看哪里

- 详细说明：`docs/sp-overview-details.zh-CN.md`
- 命令规范：`docs/reference/sp-command-spec.md`
- 记忆层规范：`docs/reference/sp-context-memory-architecture.md`
- 安装与兼容：`docs/reference/sp-installation-and-agent-compatibility.md`
