# `speckit-layered`

`sp` 是一个基于 `Spec Kit` 改造出来的分层文档工作流。
框架步骤名统一使用 `sp.*`，不同 agent 只是在触发形式上适配。

它的重点不是直接写代码，而是先把需求、业务框架、流程、界面、交付设计和一致性分析按固定步骤沉淀成可查询、可回链、可局部推进的文档骨架，帮助大模型在有限上下文里稳定工作。

当前阶段只覆盖文档工作，流程到 `sp.analyze` 结束，不包含实现阶段。

## 最核心的东西

- 两层推进：先业务澄清，再交付设计。
- 统一澄清：`sp.clarify` 统一处理 spec、flow、ui 的高影响问题。
- Query-First Memory：先查项目级和 feature 级 memory，再决定读哪些正文。
- Workset：把大 feature 拆成局部工作面，减少上下文压力。
- 澄清传播闭环：结论变更后必须同步相关文档和 memory。

## 基本流程

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

## 触发方式

- Codex 使用项目内 skills，例如 `$sp-specify`
- Claude 使用项目内 skills，例如 `/sp-specify`
- 其他 slash-command 宿主可能使用 `/sp.specify`
- 当前安装器把宿主集成文件写入目标项目，而不是旧的全局 prompt 目录

## 下一步看哪里

- 详细说明：`docs/sp-overview-details.zh-CN.md`
- 命令规范：`docs/reference/sp-command-spec.md`
- 记忆层规范：`docs/reference/sp-context-memory-architecture.md`
- 安装与兼容：`docs/reference/sp-installation-and-agent-compatibility.md`
