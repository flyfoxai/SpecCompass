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

它在已有主线时做 Warm Route：只根据当前 active feature、route/memory、
open-items 和 Stage Readiness 建议下一步，不自动执行。输出是
`speckit.route.v1` JSON，其中
`autoExecute` 固定为 `false`，并包含 `next`、`reason`、`missing`、
`blockers`、`continueAllowed`、`blockerType`、`blockerRoute` 等字段。
面向人的说明还应给出 `PROJECT_GOAL`、`CURRENT_STAGE`、`PRIMARY_THEME`、
`ROOT_BLOCKER_FAMILY`、`FIRST_FIX`、`DEFERRED_WORK`、`READ_SET`、
`PRIORITY_CLASS`、`NEXT_ACTION`、`NEXT_COMMAND`、`WHY_THIS_NEXT`、
`DO_NOT_RUN`。

需要全局扫描和重新判断项目主线时，显式运行：

```text
/sp.route all
```

`/sp.route all` 才执行项目接手方向判断：先读项目 memory 和候选 feature
memory，只为一个主线展开深层文档。它不应默认深读所有 feature、flow/UI、
governance、archive 或历史分析文件。无法判断主线时，应返回
`NEEDS_DECISION`，而不是让用户自行理解“是否需要阶段入口判断”。

如果希望 agent 在安全时直接衔接下一步，显式运行：

```text
/sp.route y
```

此时 route 脚本仍只产出 JSON；是否继续由命令模板和宿主 agent 判断。
只有 `continueAllowed: true` 且不是人工决策、未知阻塞或重复 fallback 时，
agent 才可以随后执行推荐的 `/sp.*` 命令。
`/sp.route y` 的语义保持不变：它是安全继续下一步，不是全局扫描。
即使 `plan.md` 和 `tasks.md` 已经存在，`/sp.route` 也不能直接跳到
`/sp.implement`；它必须先确认 `analysis.md` 为 PASS，再确认 `gate.md`
为 `Verdict: PASS`，然后才允许进入实现。

### 5.1 SP 命令收尾推荐

每个 `/sp.*` 命令完成后都必须给出可执行的下一步推荐，不能只说“完成了”或只列问题。收尾必须包含 2-3 个选项、一个推荐项、推荐理由、唯一下一步动作，以及一行可以直接复制粘贴的 `NEXT_COMMAND`。

推荐块固定包含：

```text
OPTION_A: [CMD: </sp.* 或 None>] <动作和影响>
OPTION_B: [CMD: </sp.* 或 None>] <动作和影响>
OPTION_C: [CMD: </sp.* 或 None>] <没有第三个有效选项时写 [CMD: None] None>
RECOMMENDED_OPTION: A | B | C
MY_RECOMMENDATION: 我的推荐：选 <A|B|C>：<推荐对象和理由>
NEXT_ACTION: <唯一下一步动作>
NEXT_COMMAND_EXEC: </sp.* 或 None>
NEXT_COMMAND_ID: </sp.* 或 None>
NEXT_COMMAND: </sp.* 加中文提示词的一整行，必须能一次复制粘贴执行>
WHY_THIS_NEXT: <为什么这是正确方向>
DO_NOT_RUN: <当前不要运行的命令或 None>
```

`NEXT_COMMAND_EXEC` 是给自动化或多 agent 编排器使用的纯命令。`NEXT_COMMAND` 是给人复制粘贴的整行命令，中文提示词必须和 slash 命令写在同一行，不再拆成单独提示字段。如果推荐中出现 `110-template-library-template-application` 这类编号模块，输出还应简短说明它的主要作用，方便用户做主观检查。

结构化推荐内容放在前面，最终复制框必须放在整个回复最底部。最终复制框只放 `NEXT_COMMAND` 的值本身，不带 `NEXT_COMMAND:` 标签，也不放 `OPTION_A/B/C`、`MY_RECOMMENDATION`、`NEXT_COMMAND_EXEC`、`WHY_THIS_NEXT`、`DO_NOT_RUN` 或解释文字。如果没有可执行下一步，复制框只写 `None`。

当 `/sp.flow` 或 `/sp.ui` 需要人工确认时，命令不能只写“请确认”。它必须先用简洁中文展示确认摘要：flow 要说明设计依据、业务目标、角色、主流程、决策点、异常/恢复、状态变化和需要看的标签；UI 要说明 PRD/spec/flow 依据、布局结构、screen/section、按钮和作用、字段和校验、图片/预览、图表/表格及数据源、权限/状态和需要看的标签。若其中有人工决策点，必须给分层可执行选项：Flow 的 `must_confirm` 使用 2-4 项；如果是来源明确、互斥且确实只有两个出口，必须用 `options_count_rationale` 说明为什么不存在第三条真实路径。UI 的 `must_confirm` 必须使用 3-4 项；只有普通、非 `must_confirm` 的低风险二元 UI 判断，才可以在说明为什么 2 项足够后使用 2 项。每个选项都要说人话说明真实背景、选择后模型要做什么、会影响哪些后续范围/排期/风险/实现/测试，以及为什么推荐。

人工已经查看当前界面，或明确要求采用全部推荐项时，可以使用统一入口 `/sp.accept outline|flow|ui <feature> [--advance]`。它只读取当前 review data，运行正式 validator，逐项采用 `recommended_option`，并原子写入固定确认文档；缺推荐、`needs-decision` 出口、stale identity 或 Outline boundary adjustment/adoption 都会失败关闭。默认只保存；`--advance` 才按非根 `outline -> specify`、`flow -> ui`、`ui -> gate` 消费当前确认并推进一个阶段。`000-*` 顶层组合根消费 Outline 确认后改走 `/sp.route all` 选择明确的 `001+` 实施子项目，绝不运行 `/sp.specify 000-*`。

停止规则：

- `NEEDS_DECISION`、`HUMAN_DECISION`：若决定属于当前 Outline/Flow/UI 且 review data 能表达，留在所属 Web 审核页完成；只有无法由所属页面表达的独立上游决定才进入 `/sp.clarify`。`UNKNOWN_BLOCKER` 先进入 owner 诊断，不能由模型猜测放行。
- `BLOCKED` + `UPSTREAM_DOC_GAP`：如果 `blockerRoute` 是具体 owner route，例如 `/sp.flow`，可以继续到该 owner 命令补文档。
- `REPEATED_FALLBACK` 或 `fallback-loop-detected`：说明 `memory/fallback-log.md` 已记录同一失败签名重复出现，不能继续重跑同一路线；应进入 `/sp.clarify` 或 owner 决策。
- 普通缺失阶段：如 `NEEDS_PRD`、`NEEDS_SPECIFY`、`NEEDS_FLOW`、`NEEDS_UI`、`NEEDS_BUNDLE`、`NEEDS_PLAN`、`NEEDS_TASKS`、`NEEDS_ANALYZE`、`NEEDS_GATE`，可在 `continueAllowed: true` 时继续到对应命令。

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

`/sp.prd` 使用递归 Outline 窗口，而不是固定三级项目职责。默认业务资料根是仓库根 `prd/`；人工可以追加或明确替换资料目录，命令必须记录实际来源根和锚点。`specs/<feature>/prd.md` 是当前 feature 的整理与决策落点，不是默认唯一资料。每轮先完整提取当前展开根的 `business_context`，包含 `product_subject`、`business_objects`、`operations`、`outcomes`、`capability_atoms`、`business_chains` 和证据缺口，再按业务责任分配直接子单元。`000` 是有目标、有结果和来源的顶级单元，第一次只生成一层；普通单元每轮生成两层或三层，提前到达 terminal 时可以少于两层。一个能力原子只归属一个直接子单元；具有独立状态、独立结果或明确 handoff 的能力默认保持独立候选，不能因共享页面、数据库、运行时、阶段或团队而合并。非根多原子单元必须提供由正式 PRD 或已确认人工决定支持的 `grouping_basis` 和来源状态；模型自己提出或尚未解决的合并只能成为 Web Discovery 选项，当前窗口仍生成独立单元。父单元必须提供 `decomposition_basis` 或 `terminal_basis`。三层仅是界面显示窗口，不是整棵树上限。

v4 `decompose` 分图除结构根外，只能展示已登记到本轮 `decomposition_window.units` 的 Outline 单元。普通说明节点不是下一级项目，不显示项目编号和树深；目标、能力、验收等功能细节只在已确认 terminal 单元的 `detail` 窗口生成。

子单元生成自己的 Outline 时，使用已确认 `Subproject Handoff` 继承方向、责任和交接，同时重新读取默认 `prd/`、人工指定目录、当前 feature PRD、父级引用和本地确认资料。handoff 是优先来源，不是白名单，也不声称写全子单元细节。父子核对检查范围、责任、结果、交接、来源和全局约束，并检查子单元完整覆盖父单元，不比较节点名称、数量或文字是否相同。只有正式确认的 terminal 单元才进入详细功能 Outline；Flow 和 UI 继续分别消费 PRD、Outline 和 Flow。

三个设计阶段按输入递增：Outline 基于 PRD 资料；Flow 基于 PRD 资料和已确认 Outline；UI 基于 PRD 资料、已确认 Outline 和已确认 Flow。资料不足时，模型可以补全低影响、可逆的结构并标记推断；会改变范围、权限、安全、资金、合规、不可逆行为、关键验收或造成大范围返工的决定，必须进入所属 Outline/Flow/UI Web 审核页，给出 2-4 个方案、影响和推荐。Outline、Flow 和 UI 三个设计阶段都确认后，Plan、Tasks、Implement 应自行完成框架内的技术分解、任务和代码，只在发现新的重大决定或上游冲突时回退。

每个递归窗口都执行跨领域替换测试：一段话若只替换产品名就能原样用于无关行业，必须改成有来源的业务对象、动作、控制、结果、交接或明确证据缺口。写出 Discovery 前还要执行可见文本清洗，删除内部阶段、检查过程、目录创建、SP 路由和渲染说明，不能用“目标、用户、问题、范围、全局认知”等套话代替产品内容。

用户确认直接子单元后，父级 PRD 记录 `Project Decomposition`，并为每个子单元生成 `Subproject Handoff`，写清业务目标、整体结果、角色、能力和对象、范围、上下游交接、继承约束、来源和未决问题。`000` 保留顶级 Outline 语义和全局约束，不在同一轮替子单元生成更深层细节；子单元在自己的 feature 或展开窗口继续递归。任何需要 Flow/UI 的实现边界，都必须来自已确认的 terminal 单元；未到 terminal 时不能跳过拆分直接进入实现。

所有递归窗口的拆分和终止选择留在图形 Discovery 中，不能仅因为拆分未确认、影响较大或状态为 `SPLIT_REQUIRED`/`NEEDS_DECISION` 就转到 `/sp.clarify`。图形响应下载前，`NEXT_COMMAND_EXEC` 保持 `None`；用户交回响应后由下一次 `/sp.prd` 消费。只有节点绑定的图形选择确实表达不了某个独立决策时，才使用 `/sp.clarify`。

PRD 页面可以同时展示 `constitution_snapshot`，但固定为 `read_only` 和 `governance_only`。它只是 Constitution 的只读治理快照：不参与业务推断，不产生问题或推荐，不写入 PRD，也不能成为 discovery delta 的目标。`/sp.constitution` 继续负责正式长期治理规则；`/sp.prd` 只负责产品事实、业务能力和范围。

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
