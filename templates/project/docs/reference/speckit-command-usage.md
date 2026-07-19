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

停止规则：

- `NEEDS_DECISION`、`HUMAN_DECISION`、`UNKNOWN_BLOCKER`：进入 `/sp.clarify`，生成或补齐人工决策包。
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

`/sp.prd` 的三级职责不能混用。一级只负责项目组合拆分：先从用户输入、当前 PRD、已接受决策和正式业务来源平铺提取全部能力原子及 `business_context`；后者至少保留 `product_subject`、`business_objects`、`operations`、`outcomes`、`business_chains` 和 `evidence_gaps`。初始生成严格执行“一个能力原子、一条业务链、一个候选子项目”，不因顺序相邻、共享对象或存储、同进程运行或共同终局结果而预先合并；合并只能作为用户选择，绑定到具体分支并在有效 Discovery 响应确认后生效。候选数量不固定，导图过密时拆图而不减少候选。低延迟、共享存储、顺序处理或部署便利不能决定产品边界；事务一致性和双向交接若来自法规、合同或多方法律义务，应保留为业务不变量，否则只记为交付风险。禁止按前端、后端、数据库、API、引擎、消息队列、仓库、部署或团队拆分。候选标题只靠“中心、枢纽、平台、系统、模块、工作台、网络”等容器词成立时，只能视为边界警示；应检查它拥有的业务状态、独立结果和交接契约。

二级只负责单个已确认子项目的业务闭环；一级确认保留单产品时，也用同一合同框定该产品。保留单产品时读取已确认父 PRD、产品级已接受事件、继承约束及其来源；已拆分时只读取一份已确认 `Subproject Handoff` 及其来源、继承约束和子项目局部变更。每条首个切片业务链必须包含触发或输入、业务对象及起始状态、动作或控制、结果状态或可观察结果、异常路径、来源和命名交接，不得重做全局候选分组。单个交接冲突只重开这个命名边界，不能重开全部子项目。三级只负责保留来源身份的正式编译：把已确认材料写入 `spec-outline.md` 和正式 review data，不新建、合并、拆分或重释业务事实。

一级和二级均执行跨领域替换测试：一段话若只替换产品名就能原样用于无关行业，必须改成有来源的业务对象、动作、控制、结果、交接或明确证据缺口。写出 Discovery 前还要执行可见文本清洗，删除内部阶段、检查过程、目录创建、SP 路由和渲染说明，不能用“目标、用户、问题、范围、全局认知”等套话代替产品内容。

用户确认项目边界后，父级 PRD 记录 `Project Decomposition`，并为每个独立子项目生成子项目交接（`Subproject Handoff`），写清业务目标、角色、能力和对象、范围、上下游交接、全局业务门禁、来源和未决问题。Level 1 不会自动创建子项目目录或授权 `/sp.specify`。确认拆分后，各子项目分别建立 feature 目录并完成自己的 `/sp.prd` 和 Outline 确认；父级大项目不再整体进入 `/sp.specify`。确认不拆分时只记录保留单项目的业务理由。

Level 1 和 Level 2 的项目边界选择留在图形 Discovery 中，不能仅因为拆分未确认、影响较大或状态为 `SPLIT_REQUIRED`/`NEEDS_DECISION` 就转到 `/sp.clarify`。图形响应下载前，`NEXT_COMMAND_EXEC` 保持 `None`；用户交回响应后由下一次 `/sp.prd` 消费。只有节点绑定的图形选择确实表达不了某个独立决策时，才使用 `/sp.clarify`。

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
