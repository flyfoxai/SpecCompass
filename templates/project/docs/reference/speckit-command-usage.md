# Speckit CLI 命令使用文档

本文用于安装后的项目内自查：什么时候在父目录执行，什么时候进入项目根目录执行，agent 命令为什么可能不显示，以及 SP 与原版 Spec Kit 的机制边界。

## 1. 安装和版本确认

SP 用户正常安装：

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/SpecPilot.git@vX.Y.Z
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

原版 Spec Kit 的多数 agent 显示 `/speckit.*` 命令；Codex skills 模式官方写法是 `$speckit-*`，安装文件位于 `.agents/skills/speckit-*/SKILL.md`。

SP 的用户可见目标是 `/sp.*`：

```text
/sp.constitution
/sp.specify
/sp.clarify
/sp.plan
/sp.tasks
/sp.analyze
/sp.gate
/sp.implement
```

关键边界：

- `sp-*` 只能作为 skill 目录名或内部实现细节，不应要求用户手动输入。
- Claude、Gemini 等宿主应通过自己的命令目录显示 SP 命令。
- Codex 至少应生成 `.agents/skills/sp-*/SKILL.md`。
- 如果文档声称 Codex 会显示 `/prompt::sp.*`，必须用真实 Codex 客户端验证；不能只看文件存在。

### 4.1 Codex `/prompt::...` 边界

当前证据不能证明原版 Spec Kit 通过 `specify init --integration codex` 能稳定显示 `/prompt::speckit.*`。原版明确生成的是 `.agents/skills/speckit-*/SKILL.md`，官方文档对 Codex skills 模式的描述更接近 `$speckit-*` 或 `speckit-<command>` skill。

因此，SP 对 Codex 的判断必须分层：

- `.agents/skills/sp-*/SKILL.md` 生成成功：说明基础 Codex skills 路径存在。
- `.codex/prompts/sp.*.md` 或 `.codex/commands/sp.*.md` 生成成功：说明 prompt/command 文件存在。
- Codex plugin installed/enabled：说明 plugin 管理层接受了注册。
- Codex 斜杠菜单显示 `/prompt::sp.*`：必须由真实 Codex 客户端 UI 验证，不能由文件存在或 plugin list 代替。

如果当前 Codex 客户端没有显示 `/prompt::sp.*`，不要把用户命令改成 `sp-*`。正确处理是记录为 Codex prompt/plugin discovery 问题，并检查 Codex 客户端版本、plugin marketplace、cache、重启刷新策略，以及当前客户端是否支持该命名空间。

## 5. Feature 路由

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
/sp.specify
```

后续命令不应把 `main` 或 `master` 这种普通分支误当成 feature。

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
- 没有 active feature 时，是否先运行了 `/sp.specify`。
- README 是否承诺了未经真实客户端验证的命令显示方式。
