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
- 命令名更短：内置命令优先使用 `sp.*`，skills 宿主使用 `sp-*`。
- 文档分层更细：补强 `flow`、`ui`、`delivery`、`gate`、`analysis` 等工作面。
- 上下文更稳定：加入 project memory、feature memory、routing、hotspots 等记忆文件，帮助模型先定位再阅读。
- 自动化检查更强：`sp.analyze` 用来检查文档系统是否足够支撑后续自动化，而不是只看文件是否存在。

## 安装使用

需要先安装 [uv](https://docs.astral.sh/uv/)。

从用户 fork 的当前分支安装：

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/openSpecs.git@codex/sp-v0.8.11-rebase --force
```

初始化新项目：

```bash
specify init my-project --integration codex
cd my-project
```

如果使用 Claude：

```bash
specify init my-project --integration claude
cd my-project
```

常用命令：

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
```

在 Codex、Claude 等 skills 宿主里，命令通常以连字符形式出现：

```text
$sp-constitution
$sp-specify
$sp-plan
$sp-tasks
$sp-analyze
$sp-implement
```

建议工作顺序：

```text
sp.constitution -> sp.specify -> sp.clarify -> sp.plan -> sp.flow/ui -> sp.tasks -> sp.gate -> sp.analyze -> sp.implement
```

## 说明

本项目会尽量继续跟随上游 Spec Kit 的机制升级。原则是：安装框架和宿主接入方式尽量贴近原版，SP 自己的改进主要放在命令内容、模板质量、记忆机制和自动化工作流上。
