# 基于原版 `Spec Kit` 的 fork 改造方案

> 目标：在尽量保留原版 `Spec Kit` 工作方式的前提下，把它改造成面向两层文档工作的 `sp`。
>
> 状态说明：本文保留为迁移期分析稿。涉及旧 prompt 分发、旧宿主包装或未落地机制的段落，只作历史分析参考，不应覆盖当前已实现的 `specify init` + project-local integration 机制。

## 1. 改造目标

这次改造不是重写一套新工具，而是在原版 `Spec Kit` 基础上做定向增强：

- 保留原版 CLI 初始化方式
- 保留原版 feature 目录和状态感知
- 保留原版 `spec.md / plan.md / tasks.md` 主骨架
- 新增面向第一层的 `flow / ui / gate / bundle`
- 将 `plan / tasks / analyze` 明确纳入文档工作流
- 将文档工作流定义为可独立结束的体系

## 2. 建议保留的原版能力

以下能力应直接继承，不建议推翻：

- `specify init`
- `specify check`
- `specs/<feature>/` 目录约定
- active feature 自动检测
- `SPECIFY_FEATURE` 环境变量
- `.specify/templates/`
- `.specify/scripts/`
- `.specify/memory/`
- 上游升级路径

原因：

- 这些是原版最有价值的“流程基础设施”
- 如果把这些也改掉，fork 漂移会明显增大
- 未来同步上游会更困难

## 3. 建议修改的部分

### 3.1 命令前缀

对外统一为：

- `sp.*`

不再以 `speckit.*` 作为主要暴露方式。

迁移期建议：

- 可以同时保留 `speckit.*` 兼容别名
- 文档与示例一律改用 `sp.*`

### 3.2 命令集合

原版偏重：

- `constitution`
- `specify`
- `clarify`
- `checklist`
- `plan`
- `tasks`
- `analyze`

fork 后改成：

- `constitution`
- `specify`
- `clarify`
- `flow`
- `ui`
- `gate`
- `bundle`
- `plan`
- `tasks`
- `analyze`

其中：

- 原版 `checklist` 的校验职责并入 `gate`
- 如有兼容需要，可保留 `sp.checklist -> sp.gate` 的别名

### 3.3 工作流重心

原版偏“规格到实现”。

fork 后应改成“文档两层推进，并在 `sp.analyze` 处结束当前工作流”。

## 4. 命令分层

### 4.1 第一层：业务澄清文档

- `sp.specify`
- `sp.clarify`
- `sp.flow`
- `sp.ui`
- `sp.gate`
- `sp.bundle`

### 4.2 第二层：交付设计文档

- `sp.plan`
- `sp.tasks`
- `sp.analyze`

## 5. 建议保留的文件骨架

尽量不要改动 feature 根目录结构，只在其下补强：

```text
specs/<feature>/
├── spec.md
├── clarifications.md
├── gate.md
├── bundle.md
├── plan.md
├── tasks.md
├── analysis.md
├── flows/
├── ui/
└── delivery/
```

这样做的好处：

- `spec.md / plan.md / tasks.md` 仍然兼容原版心智模型
- `plan.md` 继续保留原版入口意义，而详细交付设计可以下沉到 `delivery/*`
- 新增文档不会破坏上游已有脚本的基本假设
- 用户更容易理解 fork 与原版的关系

## 6. 模板层改造建议

建议主要修改这些位置：

- 命令模板
- feature 文档模板
- constitution 模板

### 6.1 命令模板

需要新增：

- `sp.flow`
- `sp.ui`
- `sp.gate`
- `sp.bundle`

需要重写：

- `sp.specify`
- `sp.clarify`
- `sp.plan`
- `sp.tasks`
- `sp.analyze`

### 6.2 文档模板

建议新增：

- `clarifications.md`
- `gate.md`
- `bundle.md`
- `analysis.md`
  - 固定输出 `PASS / PASS WITH RISKS / BLOCKED`
  - 固定输出缺口分类表，至少覆盖 `UI / API / Data / Permission / Side-Effect / Acceptance`
- `flows/*.mmd`
- `ui/screen-map.md`
- `ui/screen-xx.md`
- `ui/jsonforms/*`
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

### 6.3 constitution 模板

需要明确写入：

- 两层推进原则
- 本阶段只做文档工作
- `flow` 固定使用 `Mermaid`
- `ui` 固定使用 `Markdown + JSON Forms`
- 在 `gate` 通过前不进入第二层

## 7. 脚本层改造建议

原版若已有根据 active feature 读写 `spec.md / plan.md / tasks.md` 的脚本，应优先复用。

建议策略：

- 优先保留原有 feature 定位脚本
- 在原脚本上扩展对 `flows/`、`ui/`、`delivery/`、`gate.md`、`bundle.md`、`analysis.md` 的支持
- 避免重写整个脚本框架

另外应保留原版跨平台脚本策略：

- `sh` 版本脚本
- `ps1` 版本脚本
- Windows 默认走 `ps`
- 其他平台默认走 `sh`

## 7.1 Agent 模板改造建议

原版已支持多 agent 模板写入，fork 后不应退化为只兼容单一 agent。

至少应继续支持：

- Qoder CLI
- Kiro CLI
- Amp
- Auggie CLI
- Claude Code
- CodeBuddy CLI
- Codex CLI
- Cursor
- Gemini CLI
- GitHub Copilot
- IBM Bob
- Jules
- Kilo Code
- Pi Coding Agent
- Qwen Code
- Roo Code
- SHAI (OVHcloud)
- Tabnine CLI
- Mistral Vibe
- Kimi Code
- iFlow CLI
- Windsurf
- Junie
- Trae
- Antigravity (`agy`)
- generic bring-your-own agent

改造原则：

- 命令语义统一为 `sp.*`
- Codex 与 Claude 当前都应按 project-local skills 安装
- 传统 slash-host 继续使用 `/sp.*`
- 不同 agent 的命令正文尽量保持一致
- 保留 agent 专用目录写入机制
- Codex 兼容时要优先考虑 `.agents/skills` 与 manifest 跟踪
- generic agent 入口应继续保留

## 7.2 命令正文改造建议

相比单纯替换命令名，更关键的是保留原版“每步有工作提示”的机制。

因此每个 `sp` 命令正文建议固定包含：

- 当前步骤目标
- 必读输入
- 本步必须完成的动作
- 本步禁止越界的动作
- 输出文件路径
- 完成前检查点
- 下一步建议命令

并且要满足：

- skills 版本与 slash-host 版本正文语义一致
- 差异只放在触发语法、frontmatter 和 agent 特定目录结构，不放在工作逻辑上
- 每一步都要像原版 `Spec Kit` 那样给出充分的过程提示，而不是只留一句命令标题
- `sp.analyze` 不能退化成自由发挥的总结，必须固定输出最终结论和缺口分类，便于不同 feature 横向比较

## 8. 升级策略

建议采用“上游跟随 + 本地补丁”的方式维护 fork。

具体原则：

- 尽量不改 CLI 初始化入口
- 尽量不改 feature 根目录约定
- 主要改命令模板和文档模板
- 本地自定义内容集中在模板与命令层

这样未来同步上游时，主要冲突点会集中在：

- 命令模板渲染层与 integration registry
- `.specify/templates/`
- `.specify/memory/constitution.md`

## 9. 当前阶段建议实施顺序

### 9.1 第一批

- 定义 `sp` 命令规范
- 定义两层文档工作流
- 定义 `flow` 与 `ui` 的展示框架

### 9.2 第二批

- 设计 feature 文档目录
- 设计各命令模板
- 设计 gate 与 bundle 模板

### 9.3 第三批

- 在真实 fork 仓库中替换 slash command
- 替换模板
- 验证 active feature 工作方式
- 验证 macOS / Linux / Windows 的脚本选择
- 验证 Claude / Codex / Cursor / Copilot / Gemini / Qwen 的命令落地

## 10. 本次设计结论

本次最重要的结论有三个：

1. 不应脱离原版 `Spec Kit` 另起炉灶
2. `plan / tasks / analyze` 在你的体系里属于文档工作，而不是实现工作
3. `flow` 与 `ui` 应作为第一层的独立命令纳入正式命令体系

补充约束：

- `analysis.md` 必须是文档阶段的固定收口文档，而不是松散结论页
