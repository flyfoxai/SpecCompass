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

1. `docs/sp-command-spec.md`
2. `docs/sp-context-memory-architecture.md`
3. `.specify/memory/constitution.md`
4. `.specify/memory/project-index.md`
5. 开始第一个 feature 的 `sp.specify`

## Codex 补充说明

- Codex Desktop prompts 使用 `/prompts:sp.*`
- `/sp.*` 不属于 Codex
- 若要把 Codex prompts 装到 Codex 目录，安装时必须启用 Codex 模式；安装器会优先写入 `CODEX_HOME/prompts`，并同步镜像到 `CODEX_HOME/commands`
- Codex 安装时会同时清理 `prompts` 与 `commands` 里的旧 `/prompts:speckit.*` 命令文件，以及遗留的 `sp-*` skills 目录
