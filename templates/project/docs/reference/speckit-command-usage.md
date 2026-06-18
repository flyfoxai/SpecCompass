# Speckit CLI 命令使用文档

本文用于安装后的项目内自查：什么时候在父目录执行，什么时候进入项目根目录执行，agent 命令为什么可能不显示，以及 SP 与原版 Spec Kit 的机制边界。

## 1. 安装和版本确认

SP 用户正常安装：

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/SpecCompass.git@vX.Y.Z
```

确认当前实际运行的 CLI：

```bash
specify --version
specify version
specify check
```

如果命令行为和文档不一致，先确认 PATH 上的 `specify` 是不是旧版本。

## 2. 初始化项目

新建项目时，在父目录执行：

```bash
specify init my-project --integration codex
cd my-project
```

已有项目中初始化时，进入项目根目录执行：

```bash
cd /path/to/project
specify init . --integration codex
```

或者：

```bash
specify init --here --integration codex
```

常用选项：

- `--integration <key>`：选择 agent，例如 `codex`、`claude`、`gemini`
- `--script sh|ps`：选择 Bash 或 PowerShell 脚本
- `--ignore-agent-tools`：跳过 agent CLI 检查
- `--force`：在非空目录中强制合并或覆盖
- `--preset <id>`：初始化时安装 preset

## 3. 项目根目录执行规则

这些命令需要在已初始化项目根目录执行，因为它们会读写 `.specify/`：

```bash
specify integration list
specify integration install <key>
specify integration switch <key>
specify integration upgrade [key]
specify preset add <preset-id>
specify preset resolve <template-name>
specify extension add <extension-id>
specify workflow run <workflow-id-or-yaml>
```

只查看帮助或版本时，可以在任意目录执行：

```bash
specify --help
specify init --help
specify integration --help
specify preset --help
specify extension --help
specify workflow --help
```

## 4. Agent 命令暴露

Spec Kit 不直接控制每个 agent 的 UI。它负责把命令模板、上下文文件、脚本和 manifest 安装到对应 agent 会读取的位置。

SP 的用户入口按宿主分层：

- Claude、Gemini 等 slash-command 宿主：使用 `/sp.*`。
- Codex：使用 skills。输入 `$`、运行 `/skills` 选择 `sp-*` skill，或提出匹配 skill description 的自然语言请求。

slash-command 宿主的用户可见命令是：

```text
/sp.constitution
/sp.route
/sp.specify
/sp.clarify
/sp.plan
/sp.tasks
/sp.analyze
/sp.gate
/sp.implement
```

关键边界：

- Claude、Gemini 等宿主应通过自己的命令目录显示 SP 命令。
- Codex 至少应生成 `.agents/skills/sp-*/SKILL.md`，这是当前稳定入口。
- Codex 下不要把 `/sp.*` 是否出现在 slash menu 作为安装成功标准。

### 4.1 Codex skills-first 边界

OpenAI Codex 维护者已在公开 issue（包括 #15939、#22674、#14459、#13893）中说明：custom slash commands 和 custom prompts 已废弃，推荐迁移到 skills。因此 SP 对 Codex 的主路径必须是 skills-first。

因此，SP 对 Codex 的判断必须收敛到 skills：

- `.agents/skills/sp-*/SKILL.md` 生成成功：说明基础 Codex skills 路径存在。
- slash menu 是否显示 `/sp.*`：不是当前 Codex 安装成功标准。
- 旧实验版生成的 `.codex/prompts/sp.*.md`、`plugins/sp/`、`.agents/plugins/marketplace.json` 不再作为有效安装产物。

Codex 使用时应输入 `$`、运行 `/skills` 选择 `sp-specify`、`sp-plan`、`sp-tasks`、`sp-analyze`、`sp-implement`、`sp-gate`、`sp-ui` 等 skill，或提出匹配 skill description 的自然语言请求。

## 5. 恢复入口和 Feature 路由

已有项目继续工作时，推荐先运行：

```text
/sp.route
```

它只建议下一步，不自动执行。输出是 `speckit.route.v1` JSON，其中
`autoExecute` 固定为 `false`，并包含 `next`、`reason`、`missing`、
`blockers`、`continueAllowed`、`blockerType`、`blockerRoute` 等字段。

如果希望 agent 在安全时直接衔接下一步，显式运行：

```text
/sp.route y
```

此时 route 脚本仍只产出 JSON；是否继续由命令模板和宿主 agent 判断。
只有 `continueAllowed: true` 且不是人工决策、未知阻塞或重复 fallback 时，
agent 才可以随后执行推荐的 `/sp.*` 命令。

停止规则：

- `NEEDS_DECISION`、`HUMAN_DECISION`、`UNKNOWN_BLOCKER`：进入 `/sp.clarify`，生成或补齐人工决策包。
- `BLOCKED` + `UPSTREAM_DOC_GAP`：如果 `blockerRoute` 是具体 owner route，例如 `/sp.flow`，可以继续到该 owner 命令补文档。
- `REPEATED_FALLBACK` 或 `fallback-loop-detected`：说明 `memory/fallback-log.md` 已记录同一失败签名重复出现，不能继续重跑同一路线；应进入 `/sp.clarify` 或 owner 决策。
- 普通缺失阶段：如 `NEEDS_PRD`、`NEEDS_SPECIFY`、`NEEDS_FLOW`、`NEEDS_UI`、`NEEDS_BUNDLE`、`NEEDS_PLAN`、`NEEDS_TASKS`，可在 `continueAllowed: true` 时继续到对应命令。

SP 和原版一样，feature 文档通常在：

```text
specs/<feature>/
```

当前 feature 通常由 git 分支推导，也可以用环境变量覆盖：

```bash
export SPECIFY_FEATURE=001-photo-albums
```

如果没有 active feature，应先运行：

```text
/sp.prd
```

然后由 `spec-outline.md` 的 outline readiness 判断是否可以进入 `/sp.specify`。后续命令不应把 `main` 或 `master` 这种普通分支误当成 feature。

## 6. Integration / Preset / Extension / Workflow 机制

Integration 负责安装 agent 命令文件、上下文文件和 manifest。升级、切换、卸载时应保留用户改过的文件，除非显式 `--force`。

Preset 用来定制现有流程，例如覆盖模板、命令文本或术语。多个 preset 按 priority 叠加，数字越小优先级越高。可用：

```bash
specify preset resolve <template-name>
```

查看实际使用哪个模板。

Extension 用来增加新能力，例如新命令、新 hook、新质量门禁。安装第三方 extension 前应审查来源。

Workflow 是 YAML 多步骤流程，可以串联命令、shell step 和人工 gate，并支持失败后 resume。

## 7. 快速排查清单

- `specify version` 显示的版本是否正确。
- 命令是否在项目根目录执行。
- `.specify/` 是否存在。
- agent 命令目录是否生成。
- Claude/Gemini/Codex 是否重启或重新加载了项目。
- Codex 是否只是生成了 skills，但当前客户端不显示 slash autocomplete。
- 没有 active feature 时，是否先运行了 `/sp.prd`，再由 outline readiness 进入 `/sp.specify`。
- README 是否承诺了未经真实客户端验证的命令显示方式。
