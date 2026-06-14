# Speckit CLI 命令使用文档

本文记录原版 `github/spec-kit` 的官方使用方式、命令执行目录、Agent 命令暴露方式、核心机制，以及 SP 在升级和回归测试时必须核对的项目。

本文不是普通 README，而是后续排查“为什么安装后命令不显示、为什么命令要在某个目录执行、为什么文件被覆盖或保留”的依据。

## 1. 信息来源和基线

官方来源：

- 官方仓库：[github/spec-kit](https://github.com/github/spec-kit)
- 官方 README：[README.md](https://github.com/github/spec-kit/blob/main/README.md)
- 官方安装文档：[docs/installation.md](https://github.com/github/spec-kit/blob/main/docs/installation.md)
- 官方 CLI 总览：[docs/reference/overview.md](https://github.com/github/spec-kit/blob/main/docs/reference/overview.md)
- 官方核心命令：[docs/reference/core.md](https://github.com/github/spec-kit/blob/main/docs/reference/core.md)
- 官方 integrations：[docs/reference/integrations.md](https://github.com/github/spec-kit/blob/main/docs/reference/integrations.md)
- 官方 presets：[docs/reference/presets.md](https://github.com/github/spec-kit/blob/main/docs/reference/presets.md)
- 官方 extensions：[docs/reference/extensions.md](https://github.com/github/spec-kit/blob/main/docs/reference/extensions.md)
- 官方 workflows：[docs/reference/workflows.md](https://github.com/github/spec-kit/blob/main/docs/reference/workflows.md)

本地实测基线：

- 官方安装方式：`uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.8.16 --force`
- 官方实测版本：`specify 0.8.16`
- 官方 Codex 测试目录：`/Users/hula/Projects/ASK3/upstream-codex-official-v0.8.16`
- SP 当前开发版本：`specify 0.10.8`

重要边界：

- 官方文档描述的是原版 Spec Kit 的设计和使用方式。
- SP 是增强 fork，用户安装 SP 后可以直接使用 SP，不需要自己再安装原版。
- 但 SP 内部升级时应优先保持原版 CLI、目录、integration、preset、extension、workflow 机制兼容，再迁移 SP 的内容增强。
- 如果官方文档、官方实测、本地 SP 行为三者不一致，应在验证清单里记录，不要直接假设其中任何一个已经正确。

## 2. 官方安装和验证

原版官方推荐用 `uv tool install` 做持久安装。安装时应指定 release tag，避免今天装到一个版本、明天装到另一个版本。

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z
```

SP 对应安装方式：

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/SpecCompass.git@vX.Y.Z
```

如果要从本地源码调试 SP：

```bash
uv tool install specify-cli --from /Users/hula/Projects/SpecCompass --force
```

验证命令：

```bash
specify --version
specify version
specify check
```

官方文档还说明：

- `uv run specify ...` 是从当前源码仓库运行 CLI，适合开发调试，不等同于用户正式安装路径。
- `uvx --from ... specify ...` 是一次性运行，不会更新 PATH 上持久安装的 `specify`。
- 如果命令行为像旧版本，先用 `specify version` 确认实际运行的 CLI。
- PyPI 上同名包不一定是官方维护包，官方推荐从 GitHub 仓库安装。

## 3. 官方主流程

官方 README 的主流程是：

1. 安装 `specify-cli`
2. 初始化项目
3. 在项目目录启动 coding agent
4. 建立 constitution
5. 创建 spec
6. 创建 plan
7. 生成 tasks
8. 执行 implement

原版命令示例：

```bash
specify init my-project --integration copilot
cd my-project
```

进入项目后，在 agent 中使用：

```text
/speckit.constitution
/speckit.specify
/speckit.clarify
/speckit.plan
/speckit.tasks
/speckit.analyze
/speckit.implement
```

SP 对应用户可见命令目标：

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

注意：

- 原版多数 agent 使用 `/speckit.*` slash 命令。
- 原版 Codex skills 模式官方写法是 `$speckit-*`，不是普通 `/speckit.*`。
- SP 的目标是宿主入口一致：slash-command 宿主使用 `/sp.*`；Codex 使用 skills，输入 `$`、运行 `/skills` 后选择 `sp-*`，或提出匹配 skill description 的自然语言请求。

## 4. 顶层 CLI 命令

`specify --help` 的核心顶层命令：

| 命令 | 作用 | 推荐执行目录 |
| --- | --- | --- |
| `specify init` | 初始化新项目或当前项目 | 父目录或目标项目目录 |
| `specify check` | 检查依赖工具 | 任意目录 |
| `specify version` | 显示版本和系统信息 | 任意目录 |
| `specify integration` | 管理 agent 集成 | 已初始化项目根目录 |
| `specify preset` | 管理 preset | 已初始化项目根目录 |
| `specify extension` | 管理 extension | 已初始化项目根目录 |
| `specify workflow` | 管理和运行 workflow | 已初始化项目根目录 |

执行目录判断：

| 场景 | 应该在哪里执行 | 原因 |
| --- | --- | --- |
| 只看帮助或版本 | 任意目录 | 不读写项目文件 |
| 新建项目 | 父目录 | `specify init my-project` 会创建新目录 |
| 初始化已有项目 | 目标项目根目录 | `specify init .` 或 `specify init --here` 会写入当前目录 |
| 安装、切换、升级 integration | 已初始化项目根目录 | 需要读写 `.specify/` 和 agent 命令目录 |
| 管理 preset/extension/workflow | 已初始化项目根目录 | 需要读写 `.specify/` 下的 registry、catalog、模板和命令 |
| 运行 workflow | 已初始化项目根目录 | 需要读取当前项目和 feature 状态 |

## 5. 初始化项目

查看帮助：

```bash
specify init --help
```

新建项目：

```bash
specify init my-project --integration codex
cd my-project
```

已有项目中初始化：

```bash
cd /path/to/project
specify init . --integration codex
```

或者：

```bash
cd /path/to/project
specify init --here --integration codex
```

常用选项：

| 选项 | 作用 |
| --- | --- |
| `--integration <key>` | 使用新 integration 系统，推荐路径 |
| `--integration-options "..."` | 给具体 integration 传递额外参数 |
| `--script sh\|ps` | 指定 Bash 或 PowerShell 脚本 |
| `--ignore-agent-tools` | 跳过 agent CLI 检查 |
| `--no-git` | 跳过 git 初始化 |
| `--here` | 在当前目录初始化 |
| `--force` | 非空目录下强制合并或覆盖 |
| `--preset <id>` | 初始化时安装 preset |
| `--branch-numbering sequential\|timestamp` | 指定 feature 分支编号策略 |

注意：

- `--integration` 和旧 `--ai` 路径互斥。
- 官方文档说明，非交互环境如果不指定 integration，可能默认走 Copilot；因此自动化脚本必须显式写 `--integration <key>`。
- 官方文档提示 git extension 当前默认启用，但未来版本可能改成显式安装，SP 升级时要重点核对。

## 6. Agent 命令暴露机制

Spec Kit 不直接控制每个 agent 的 UI。它做的是把命令模板、上下文文件、脚本和 manifest 安装到对应 agent 会读取的位置。

原版官方 README 的命令说明：

| 类型 | 原版用户命令 | 原版 skill 名 |
| --- | --- | --- |
| slash 命令类 agent | `/speckit.specify` | `speckit-specify` |
| skills 模式 agent | 视宿主而定 | `speckit-<command>` |
| Codex CLI skills 模式 | 官方文档写 `$speckit-*` | `.agents/skills/speckit-*/SKILL.md` |

原版 Codex 实测生成结构：

```text
.agents/skills/speckit-analyze/SKILL.md
.agents/skills/speckit-checklist/SKILL.md
.agents/skills/speckit-clarify/SKILL.md
.agents/skills/speckit-constitution/SKILL.md
.agents/skills/speckit-implement/SKILL.md
.agents/skills/speckit-plan/SKILL.md
.agents/skills/speckit-specify/SKILL.md
.agents/skills/speckit-tasks/SKILL.md
.agents/skills/speckit-taskstoissues/SKILL.md
```

原版 Codex 实测只走 `.agents/skills/speckit-*/SKILL.md` 这类 skills 产物，没有把 prompt/plugin 命令面作为稳定用户入口。

对 SP 的要求：

- Claude、Gemini 等支持 slash 命令的宿主，应显示 `/sp.*`。
- Codex 至少必须生成 `.agents/skills/sp-*/SKILL.md`，因为这是当前稳定入口。
- SP 不再生成 `.codex/prompts/sp.*.md`、`.agents/plugins/marketplace.json` 和 `plugins/sp/` 作为 Codex 兼容产物，因为这些路径会误导用户期待已废弃的 slash/prompt 入口。
- 不能在 README 或使用文档里承诺 Codex UI 一定显示 `/sp.*`。
- Codex 下应指导用户输入 `$`、运行 `/skills` 选择对应 `sp-*` skill，或提出匹配 skill description 的自然语言请求。

### 6.1 Codex skills-first 边界记录

本节记录 2026-05 的排查结论，用于后续避免再次把 Codex slash menu 当成安装成功标准。

人话结论：

- 原版 Codex 集成的明确产物是 `.agents/skills/speckit-*/SKILL.md`。
- 原版官方 README 和 integrations 文档把 Codex skills 模式描述为 `$speckit-*` 或 `speckit-<command>` skill。
- OpenAI Codex 维护者已在 issue #15939、#22674、#14459、#13893 中说明 custom slash commands/custom prompts 已废弃，并建议迁移到 skills。
- 因此，SpecCompass 对 Codex 的主入口应是 `$` 或 `/skills` 中的 `sp-*` skill，也允许匹配 skill description 的自然语言请求触发。

本地实测证据：

- 原版测试目录 `/Users/hula/Projects/ASK3/upstream-codex-official-v0.8.16` 中生成了 `.agents/skills/speckit-*/SKILL.md`。
- 同一原版测试目录没有生成 `.codex/prompts/`。
- 同一原版测试目录没有生成 `.agents/plugins/`。
- 同一原版测试目录没有看到由 Spec Kit 注册的 Codex plugin marketplace。
- 用户手动安装原版后，也观察到当前 Codex 客户端没有显示原版 prompt slash 入口，这说明该显示效果至少不是当前官方安装路径的稳定结果。

SP 当前结论：

- SP 可以生成 `.agents/skills/sp-*/SKILL.md`，这是与原版 Codex skills 机制同形的基础路径。
- 早期实验版曾额外生成 `.codex/prompts/sp.*.md`、`.agents/plugins/marketplace.json` 和 `plugins/sp/`，但这些产物不能稳定提供 Codex UI slash autocomplete，保留反而容易误导。
- 因此当前 SP 对 Codex 收敛为 skills-only：生成 `.agents/skills/sp-*/SKILL.md`，并清理早期 prompt/plugin 命令面。

后续判断规则：

- “文件生成成功”只说明安装器写入成功。
- “模型能读取 skill”只说明运行时可被模型参考。
- “斜杠菜单显示 `/sp.*`”不是当前 Codex 安装成功标准，不能用它否定 skills 安装成功。

后续修复方向：

- 不应再把 Codex slash 显示问题简单归因于“没有对齐原版 Spec Kit”，因为原版当前也以 skills 为主。
- README 和安装文档必须把 Codex 主入口写成 `$`、`/skills` 中的 `sp-*` skill，或匹配 skill description 的自然语言请求。
- 如果未来 Codex 官方重新提供稳定 prompt/plugin 调用接口，应先重新实测并作为新功能设计，不应在当前文档里提前承诺。

推荐产品策略：

- 主路径：继续保证 `.agents/skills/sp-*/SKILL.md` 正确生成，因为这是当前最接近 upstream 的 Codex 支持方式。
- 清理路径：安装时移除旧实验版 `.codex/prompts/sp.*.md`、`plugins/sp/` 和 `.agents/plugins/marketplace.json`，避免用户或模型误判入口。
- 兜底路径：安装后提供检查命令或文档步骤，明确检查“已生成 skills”。如果 slash UI 不显示，不判定安装失败。

## 7. Feature 路由机制

原版核心文档说明，feature 路由通常依赖 git 分支，也支持环境变量覆盖。

关键规则：

- `specs/<feature>/` 是 feature 文档根。
- 当前 feature 通常由当前 git 分支名推导。
- 非 git 仓库或特殊场景可用 `SPECIFY_FEATURE` 指定 feature。
- `SPECIFY_FEATURE` 的值应是 feature 目录名，例如 `001-photo-albums`。
- 在运行 `/speckit.plan` 或后续命令前，应确保 agent 环境能读取到该变量。

SP 对应要求：

- 不应把普通分支名如 `main`、`master` 误判成已有 feature。
- 如果没有 active feature，应明确返回没有 active feature，并提示先运行 `/sp.specify`。
- 如果 feature 文档不存在，后续命令不能继续猜路径，应回到 `/sp.specify` 或 `/sp.clarify`。

## 8. Integration 机制

官方 integrations 文档说明：integration 负责把 Spec Kit 接到具体 coding agent，包括命令文件、上下文规则、目录结构。

常用命令：

```bash
specify integration list
specify integration install <key>
specify integration uninstall [key]
specify integration switch <key>
specify integration upgrade [key]
```

官方文档还描述了 `use`、catalog、multi-install 等能力。SP 本地版本如果 `specify integration --help` 未显示这些命令，应作为本地实现差异单独核对，不能在用户文档中假定已可用。

机制要点：

- integration 会写入 agent 命令目录和上下文文件。
- 文件安装会被 manifest 跟踪，典型位置是 `.specify/integrations/*.manifest.json`。
- 卸载时，未修改的 managed files 可以自动移除。
- 用户修改过的文件应保留，避免覆盖用户内容。
- `upgrade` 是 diff-aware 刷新，发现 managed file 被本地改过时应阻断，除非使用 `--force`。
- `switch` 用于替换默认 integration；如果目标已安装，则类似切换默认值。
- 多 integration 并存必须谨慎，只有隔离目录和上下文文件不冲突时才安全。

执行建议：

```bash
cd /path/to/initialized-project
specify integration list
specify integration install gemini
specify integration switch claude
specify integration upgrade codex
```

## 9. Preset 机制

官方 presets 文档说明：preset 用来改变 Spec Kit 的工作方式，例如改模板、改术语、改命令内容、做组织规范适配。它更像“定制现有流程”，不是新增能力。

常用命令：

```bash
specify preset list
specify preset search [query]
specify preset add <preset-id>
specify preset add --from https://example.com/preset.zip
specify preset add --dev /path/to/local/preset
specify preset remove <preset-id>
specify preset resolve <template-name>
specify preset enable <preset-id>
specify preset disable <preset-id>
specify preset set-priority <preset-id> <priority>
specify preset catalog list
specify preset catalog add <url> --name <name> --install-allowed
```

机制要点：

- preset 可以覆盖 command、template、script。
- 多个 preset 可以叠加。
- 数字越小，优先级越高。
- 文件解析是逐文件独立进行的，不是整个 preset 一次性全盘覆盖。
- `specify preset resolve <name>` 用来查看某个模板最终来自哪一层。
- catalog 默认偏发现用途，是否允许安装由 `--install-allowed` 控制。

官方解析优先级：

1. Project-local overrides：`.specify/templates/overrides/`
2. Installed presets：按 priority 排序
3. Installed extensions：按 priority 排序
4. Spec Kit core：`.specify/templates/`

SP 注意：

- SP 不应让 preset 使用 `sp.*` 或 `sp-*` 碰瓷核心命名空间。
- 如果要允许 preset 覆盖核心命令，必须有明确优先级和冲突解释。
- 对用户来说，preset 是定制机制，不应成为 SP 核心命令漂移的来源。

## 10. Extension 机制

官方 extensions 文档说明：extension 用来增加 Spec Kit 没有的新能力，例如新命令、新 hook、新质量门禁、外部工具集成。

常用命令：

```bash
specify extension list
specify extension search [query]
specify extension add <extension-id>
specify extension add /path/to/local/extension --dev
specify extension add <extension-id> --from https://example.com/extension.zip
specify extension remove <extension-id>
specify extension update [extension-id]
specify extension enable <extension-id>
specify extension disable <extension-id>
specify extension set-priority <extension-id> <priority>
specify extension catalog list
specify extension catalog add <url> --name <name> --install-allowed
```

机制要点：

- extension 是“新增能力”，preset 是“定制现有能力”。
- extension 可以注册新命令和模板。
- extension 可以有配置文件，常见位置在 `.specify/extensions/<ext>/`。
- extension 可以启用、禁用、更新、移除。
- 多 extension 提供同名资源时，低 priority 数字优先。
- catalog 有项目级、用户级、内置默认等来源，项目级配置通常写入 `.specify/extension-catalogs.yml`。

安全注意：

- 官方明确提示社区 extension 独立维护，安装前需要审查来源。
- SP 不应默认信任第三方 extension 的脚本、hook 或命令内容。
- 自动化环境中安装 extension 应固定版本或来源，避免 catalog 漂移。

## 11. Workflow 机制

官方 workflows 文档说明：workflow 是 YAML 定义的多步骤自动化流程，可以串联 command、prompt、shell step、人工 gate，并支持暂停、失败后恢复。

常用命令：

```bash
specify workflow run <source>
specify workflow run speckit -i spec="Build a kanban board" -i scope=full
specify workflow resume <run_id>
specify workflow status [run_id]
specify workflow list
specify workflow add <source>
specify workflow remove <workflow_id>
specify workflow search [query]
specify workflow info <workflow_id>
specify workflow catalog list
specify workflow catalog add <url> --name <name>
```

机制要点：

- workflow 需要已初始化项目。
- workflow 可以从 catalog ID、URL、本地 YAML 路径运行。
- workflow 支持输入参数，例如 `-i key=value`。
- workflow run 可以进入 `created`、`running`、`completed`、`paused`、`failed`、`aborted` 等状态。
- `resume` 应从中断点继续，而不是从头重跑。
- gate step 适合放人工确认点。

官方 Full SDD Cycle 的思想：

```text
specify -> review-spec gate -> plan -> review-plan gate -> tasks -> implement
```

SP 对应增强：

- SP 可以在 workflow 中加入 `/sp.analyze`、`/sp.gate`、memory 检查、风险闭环、headless 失败报告。
- 但 workflow 的基本恢复、暂停、状态管理应尽量沿用原版机制。

## 12. Help 获取规则

`specify` 使用多级命令结构，通常每一级都支持 `--help`。

常用查询：

```bash
specify --help
specify init --help
specify check --help
specify version --help
specify integration --help
specify integration install --help
specify integration switch --help
specify preset --help
specify preset add --help
specify preset catalog add --help
specify extension --help
specify extension add --help
specify extension catalog add --help
specify workflow --help
specify workflow run --help
```

排查原则：

1. 先看 `specify --version` 和 `specify version`，确认到底运行的是哪个版本。
2. 再看具体子命令 `--help`，不要只凭 README 记忆。
3. 如果官方文档有某命令、本地 help 没有，先记录为版本差异或 SP 回归点。
4. 如果文件生成了但 agent UI 没显示，应检查 agent 的真实加载机制，不能只看安装脚本成功。

## 13. SP 回归验证清单

每次升级 SP 或对齐原版 CLI 时，至少验证：

- `specify --help` 顶层命令与预期一致。
- `specify init --help` 的参数、示例、目录语义准确。
- `specify init my-project --integration codex` 能在父目录创建新项目。
- `specify init . --integration codex` 能在已有项目根目录初始化。
- `.specify/`、`specs/`、agent 命令目录生成位置正确。
- Claude 安装后真实客户端显示 `/sp.*`。
- Gemini 安装后真实客户端显示 `/sp.*` 或宿主支持的等价命令入口，并确认能执行 SP 命令。
- Codex 安装后 `.agents/skills/sp-*/SKILL.md` 生成完整。
- Codex 使用 `$` 或 `/skills` 能选择 `sp-*` skill；匹配 skill description 的自然语言请求也可触发；不要把 `/sp.*` slash menu 可见性作为成功标准。
- `specify integration install/switch/upgrade/uninstall` 在项目根目录稳定工作。
- `integration upgrade` 对本地改过的 managed file 能阻断或要求 `--force`。
- `preset add/search/resolve/catalog` 能读写正确 `.specify/` 文件。
- `extension add/search/update/catalog` 能读写正确 `.specify/` 文件。
- `workflow run/resume/status/list/add/catalog` 能在项目根目录运行。
- `SPECIFY_FEATURE` 能覆盖 feature 路由。
- 没有 active feature 时，SP 不应误报 `specs/main` 或 `specs/master` 可用。
- README 和安装文档不得承诺未经真实客户端验证的命令暴露方式。

## 14. 人话总结

原版 Spec Kit 的稳定性主要来自三点：

- CLI 只负责安装和管理文件，不假装控制每个 agent 的 UI。
- feature、template、integration、preset、extension、workflow 都有明确的项目内落点。
- 升级、切换、卸载依赖 manifest 和优先级机制，尽量减少覆盖用户内容。

SP 要保留自己的增强能力，但不能破坏这些底层机制。尤其是 Codex 命令显示问题，必须区分“安装文件已经生成”和“客户端 UI 真的可调用”。这两个不是一回事。
