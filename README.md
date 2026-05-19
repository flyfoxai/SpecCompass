# OpenSpecs SP

[English](./README.en.md)

OpenSpecs SP 是基于 [GitHub Spec Kit](https://github.com/github/spec-kit) 改造的 Spec-Driven Development 工具链。本仓库当前以 Spec Kit `v0.8.11` 的机制为基线，保留原版的安装框架、CLI 结构、集成方式和脚本骨架，主要改的是命令内容、文档结构和上下文管理方式。

## 原版来源

原版项目是 GitHub 官方的 Spec Kit：

```text
https://github.com/github/spec-kit
```

OpenSpecs SP 不是从零重写，而是在原版“瓶子”里换了更适合自动化开发的“内容”。这样做的目的，是尽量继承原版稳定的安装和运行机制，减少自造框架带来的不确定性。

## 为什么要修改

原版 Spec Kit 已经能把需求、计划、任务和实现串起来，但在复杂项目和长上下文任务里，仍然容易出现几个问题：

- 文档之间的层级和责任边界不够细，模型容易一次读太多内容。
- feature 的流程、界面、交付、检查和分析信息不够集中，后续自动化容易重复推理。
- 项目级记忆和 feature 级记忆不足，模型在多轮工作中容易丢上下文或重复计算。
- 原版命令更偏通用 SDD，本项目希望进一步服务“少人工介入、低 token 消耗、低出错率”的自动化开发流程。

## 修改后的优势

- 保留原版安装机制：仍然使用 `specify init`、integration registry、共享脚本和模板打包方式。
- 命令名更短：内置命令的用户调用统一使用 `sp.*`；skills 宿主里的 `sp-*` 只作为内部目录/包名。
- 文档分层更细：补强 `flow`、`ui`、`delivery`、`gate`、`analysis` 等工作面。
- 上下文更稳定：加入 project memory、feature memory、routing、hotspots 等记忆文件，帮助模型先定位再阅读。
- 自动化检查更强：`sp.analyze` 用来检查文档系统是否足够支撑后续自动化，而不是只看文件是否存在。

## 安装使用

需要先安装 [uv](https://docs.astral.sh/uv/)。

从用户 fork 的当前分支安装 CLI：

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/openSpecs.git@codex/sp-v0.8.11-rebase --force
```

初始化新项目时选择你实际使用的宿主：

```bash
specify init my-project --integration codex
cd my-project
```

也可以选择 Claude 或 Copilot：

```bash
specify init my-project --integration claude
specify init my-project --integration copilot
```

进入项目后，在对应的 AI 宿主里调用命令。用户可见命令统一使用点号形式：

```text
/sp.constitution
/sp.specify
/sp.clarify
/sp.plan
/sp.flow
/sp.ui
/sp.tasks
/sp.gate
/sp.analyze
/sp.bundle
/sp.implement
/sp.checklist
/sp.taskstoissues
```

在 Codex、Claude 等 skills 宿主里，也请使用 `/sp.*` 形式。安装目录里的 `sp-*` 只是内部 skill 包名，不是用户要手动输入的命令名。

### 命令功能

| 命令 | 作用 |
|---|---|
| `/sp.constitution` | 建立或刷新项目原则、约束和长期工作规则。 |
| `/sp.specify` | 创建或刷新 feature 的基础需求文档，并建立 feature 路由。 |
| `/sp.clarify` | 在进入计划前提出关键澄清问题，减少需求歧义。 |
| `/sp.plan` | 把已确认的需求整理成交付计划、设计输出和 workset。 |
| `/sp.flow` | 梳理业务流程、状态、分支和时序路径。 |
| `/sp.ui` | 梳理页面、交互、表单数据和界面到交付项的关系。 |
| `/sp.tasks` | 把 workset、交付项和验收点整理成可执行任务。 |
| `/sp.gate` | 对当前文档质量做阶段门判断，决定是否可以继续向后推进。 |
| `/sp.analyze` | 跨文档检查一致性、缺口和自动化准备度，并输出分析结论。 |
| `/sp.bundle` | 打包稳定的文档结论，方便后续实现或审查使用。 |
| `/sp.implement` | 在文档和任务准备好后，按任务执行实现工作。 |
| `/sp.checklist` | 根据当前 feature 生成或检查质量清单。 |
| `/sp.taskstoissues` | 把任务转换成按依赖排序的 GitHub issues。 |

### 推荐流程

```text
/sp.constitution -> /sp.specify -> /sp.clarify -> /sp.plan -> /sp.flow + /sp.ui -> /sp.tasks -> /sp.gate -> /sp.analyze -> /sp.implement
```

说明：

- `/sp.clarify` 不是每次都必须运行，但需求不清楚时应先运行。
- `/sp.flow` 和 `/sp.ui` 可以按项目类型选择使用；有复杂流程或界面时建议运行。
- `/sp.bundle` 通常在文档已经稳定、需要交付给实现或审查前运行。
- `/sp.checklist` 和 `/sp.taskstoissues` 是辅助命令，按团队需要使用。

## 说明

本项目会尽量继续跟随上游 Spec Kit 的机制升级。原则是：安装框架和宿主接入方式尽量贴近原版，SP 自己的改进主要放在命令内容、模板质量、记忆机制和自动化工作流上。
