<div align="center">
    <h1>SpecCompass</h1>
    <h3><em>面向 AI 编程 Agent 的规格驱动开发：增强分层规划、记忆和验证。</em></h3>
</div>

SpecCompass 是基于 [github/spec-kit](https://github.com/github/spec-kit) 的增强 fork，面向 **AI 辅助规格驱动开发**，适合 Codex、Claude、Gemini 等编程 agent 使用。它保留 Spec Kit 已经验证稳定的安装和集成机制，同时增强分层规划、项目记忆、上下文窗口管理、关联追踪、实现准入、验证纪律和稳健兜底规则，更适合复杂软件项目。

我们的原则很简单：尽量保留原版 Spec Kit 已经验证稳定的“瓶子”，包括目录骨架、模板外壳、CLI 安装流程、integration 框架和脚本入口；只替换里面的“水”，让它更适合复杂项目和大模型协作。

英文版说明见 [README.md](./README.md)。

![SpecCompass 命令职责图](./docs/assets/speccompass-command-map-zh.svg)

![SpecCompass 多层次处理流程](./docs/assets/speccompass-layered-flow-zh.svg)

## 为什么要改

原版 Spec Kit 的安装和运行机制很稳定，但在复杂 AI 编程项目里，模型需要同时处理需求、架构、界面、接口、数据、测试和交付证据，单靠 spec、plan、tasks 往往不够。

SP 主要想解决这些问题：

- 上下文太大，模型容易读漏、读重。
- 需求、界面、流程、接口、表、权限、验收容易脱节。
- 风险、待办、阻塞项没有固定位置，下一轮容易忘。
- 文档过期后，模型还可能继续沿着旧路线执行。
- 大功能没有提前拆分，导致 agent 的注意力窗口被压满，准确性下降。
- 检查失败、需求不清或决策冲突时，agent 容易反复猜测，而不是回到正确层级修复。

SP 是可以单独安装和使用的增强版。用户不需要再手动下载原版，也不需要自己做“对齐原版”的操作。

它适合希望把 AI 编程流程管得更稳的开发者：用规格明确目标，用计划和任务约束实现，用 memory 和 trace 减少重复加载上下文，用 analyze/gate 在继续编码前发现偏移。

SP 是 **文档优先，但不是只做文档**。文档链路用于控制代码阶段：只有 `plan.md` 给出明确的 `Implementation Readiness`，`tasks.md` 生成可执行的 `Mode: impl` 任务包，并且实现任务具备写入边界和验证命令后，才进入编码。

实际使用时，`Mode: doc` 用于规格、flow、ui、plan、memory、trace、analysis、gate 等文档和复核工作。`Mode: impl` 只在某个 workset 已经 ready 或 conditionally ready 后出现。任务包会写清 `Allowed Write Set` 和 `Required Checks`，`/sp.implement` 消费任务包执行，不靠模型临时猜可以改哪些文件。

## 方法论

SP 把 AI 开发看成一个工程控制闭环，而不是一次性 prompt。目标是给 agent 足够完成工作的上下文，但不要让上下文窗口被无关信息塞满，导致 token 浪费和判断失准。

主方法论见 [SP 项目的方法论](./docs/reference/sp-project-methodology.md)。从 0 到 1 的可选产品发现方法论单独放在 [SP PRD 命令方法论设计](./docs/reference/SP-PRD命令方法论设计.md)。简要来说：

- 先确定主干：先明确目标、范围、成功标准、约束和 active feature，再展开实现细节。
- 产品意图还没成型时，可以使用可选 `/sp.prd`。它帮助从战略目标、产品定位、用户、场景、能力版图、流程种子、验收种子、风险和未决问题生长 PRD 草稿，但 `prd.md` 不是稳定事实源。
- 上下文要小而充分：优先通过项目 memory、feature memory、workset、trace 和直接相关 source docs 进入，不默认全仓读取。
- 用稳定锚点和可搜索编码标记 feature、workset、UI、API、风险、测试和验收路径，减少后续 agent 重复推理。
- 把未解决事项明确写入 `memory/open-items.md`，包括 risk、blocker、decision、owner、关闭条件和回看点。
- 对 API、权限、数据、事件流、UI 契约、核心测试等高风险改动，先做轻量影响半径检查。
- 把 `plan.md` 的 `Implementation Readiness` 作为代码阶段准入的唯一事实源。其他命令可以消费、诊断或裁决它，但不能另造一套准入结论。
- 用 `Mode: doc` 和 `Mode: impl` 区分文档任务和实现任务；`/sp.implement` 只能对已授权的 `Mode: impl` 任务写代码。
- `/sp.analyze` 负责发现漂移，`/sp.gate` 负责阶段准入；没有证据时，模型不能把高风险或不清楚的状态标成 PASS。
- 失败时向上兜底，而不是继续猜：回到 clarify、spec、plan、tasks，必要时拆分过大的 workset，或者用说人话的选项让用户决策。
- 借鉴 CodeGraph 的稳定节点、显式关系和影响查询思想，但只作为轻量方法论，不把重型代码图运行时作为默认依赖。

## 机制如何运转

SpecCompass 的目标是让人看得懂，也让 agent 执行时不容易跑偏：

- 从 0 到 1、产品意图不清时，可以先用可选 `/sp.prd` 做上游发现。清楚的需求直接进入 `/sp.specify`。
- 稳定需求从 `/sp.specify` 进入。新增或变更需求要先检查冲突，不能直接混进旧规格里。
- 意图不清时，`/sp.clarify` 用说人话的方式给出选项，并把决策记录下来，避免后续 agent 重新猜。
- `/sp.plan` 在编码前确定技术路线、workset、影响半径、agent 边界、源码结构、运行命令、代码/测试映射和 `Implementation Readiness`。
- `/sp.flow` 是主轴。业务流程节点把界面、事件、API、数据对象、测试和代码锚点连接起来。
- `/sp.ui` 在 flow 之后运行：先收集每个界面需要承载的流程元素，再把它们拼成合理界面。
- `/sp.tasks` 把工作拆小，消费 `Implementation Readiness`，生成 `Mode: doc` 或 `Mode: impl` 任务包，每个任务都应该有明确范围、验证证据、`Allowed Write Set` 和必需检查。
- `/sp.implement` 只执行选中的 `Mode: impl` 任务。它会在编辑前检查 `Allowed Write Set`、必需验证、trace 锚点和任务上下文，之后记录验证证据。
- `/sp.analyze` 和 `/sp.gate` 负责收口：检查漂移、断链、过期上下文、未闭环风险、readiness 矛盾、任务包缺口和阶段准入。
- 多 agent 协作时，由 coordinator 分配 workset，worker 只写允许范围，最后由 analyze/gate 合并检查，避免互相覆盖。

这套机制不是为了增加形式主义，而是为了减少死胡同：当 agent 不能安全继续时，要向上回到正确阶段，说明背景和影响，给用户可选方案，而不是自己编一个答案继续做。

## `/sp.implement` 的价值

`/sp.implement` 不是简单让模型开始写代码。它的价值是把代码生成变成一个有边界、可追踪、可复核的工程步骤：

- 防止 agent 把一个大 feature 理解成“可以随便改全仓”。每次实现都应该从选中的 `Mode: impl` 任务、`Allowed Write Set` 和必需检查开始。
- 把代码改动回链到需求、flow、UI、API、数据、测试和 workset 锚点。以后需求变了，可以快速找到受影响的代码；代码变了，也能找到相关业务背景。
- 对删除、重命名、跨模块修改这类高风险动作，先做影响半径和反向 trace 检查，降低误删、误改、破坏关联关系的概率。
- 把实现压小到模型能稳定处理的范围：一次只做一个任务或任务组，依赖、边界和验证证据都写清楚。
- 记录实际验证了什么、哪里失败、下一步应该回到哪个阶段。实现不能安全继续时，回到 `/sp.tasks`、`/sp.plan`、`/sp.specify` 或 `/sp.clarify`，而不是继续猜。

## 修改后的优势

- 仍然使用 upstream 风格的 `specify init`、模板、脚本和 agent integration。
- 用户可见命令统一使用 `sp.*` 命名空间，例如 `/sp.specify`、`/sp.plan`、`/sp.analyze`。
- Codex 的稳定入口是 skills：可执行 skill 包安装在 `.agents/skills/sp-*/SKILL.md`；用户可以用 `$sp-*` 或 `/skills` 显式调用，当自然语言请求匹配 skill description 时，Codex 也可能自动调用对应 skill。
- Claude 和 markdown 命令类宿主通过自己的命令目录直接显示 `/sp.analyze` 这类命令。
- 新增可选 PRD 发现入口 `/sp.prd`，用于早期产品梳理。PRD 输出保存在 `specs/<feature>/prd.md`，使用 `[src:user]`、`[src:ai-proposed]` 等来源标签，并把已确认意图交给 `/sp.specify`，不能绕过规格稳定化。
- 新增 flow、ui、delivery、memory、trace、open-items 等分层文档，帮助模型按最小上下文工作。
- 强化 Flow-first 关联管理：业务流程节点优先连接需求、界面、动作、API、数据、测试和代码。
- 增加稳定编码和锚点规则，用来标记 feature、workset、UI、API、风险、测试和 trace 关系，方便模型快速搜索和定位关联内容。
- 增加受控代码阶段交接：`plan.md` 负责 `Implementation Readiness`，`tasks.md` 生成 `Mode: doc` 或 `Mode: impl` 任务包，`/sp.implement` 只执行已授权的实现任务。
- 增加实现安全边界：`Allowed Write Set`、`Required Checks`、默认执行约束、删除/移动/重命名前扫描，以及高风险边界和验收关键测试的 `CODE` / `TEST` trace 规则。
- 增加项目级 memory，包括 active context、feature map、hotspots、open items、trace index，减少重复读取和重复判断。
- 增加上下文预算规则，优先读取当前 workset、直接依赖、相关测试和 trace 链路，再决定是否扩大范围。
- 增加影响半径纪律，重点约束 API、权限、数据迁移、事件流、UI 契约和核心测试等高风险改动。
- 明确什么时候必须回写状态，什么时候不要重复检查，降低 token 浪费。
- `/sp.analyze`、`/sp.gate`、`/sp.implement` 加强了证据检查、风险闭环、向上兜底、headless 失败报告和实现后回写。`/sp.analyze` 使用 `PASS`、`FAIL`、`BLOCKED`、`NEEDS_DECISION`；`/sp.gate` 使用 `PASS`、`FAIL`、`CONDITIONAL`、`BLOCKED`、`NEEDS_DECISION`。`CONDITIONAL` 只属于 gate，表示下一阶段依赖明确条件，这些条件必须关闭或被明确接受。
- 对需求不清、需求冲突、阶段走错的情况，要求模型回到合适的 `/sp.*` 阶段，必要时给用户可选方案，而不是继续猜。
- 对大型项目可以提前拆分复杂子域，避免一次任务过大导致注意力失焦。
- 支持轻量多 agent 协作：明确 workset 归属、允许写入范围、共享状态串行化、过期 worker 检测和合并复核。

## 安装

安装到本机工具链：

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/SpecCompass.git
```

升级已有安装：

```bash
uv tool install specify-cli --force --from git+https://github.com/flyfoxai/SpecCompass.git
```

检查安装：

```bash
specify version
specify check
```

## 在 Codex 项目中使用

新建项目：

```bash
specify init my-project --integration codex
cd my-project
```

已有项目：

```bash
cd /path/to/your/project
specify init . --integration codex
```

如果当前环境没有目标 agent CLI，或者只想先装模板：

```bash
specify init . --integration codex --ignore-agent-tools
```

对 Codex 来说，不要再用斜杠菜单里是否出现 `/sp.*` 作为安装成功标准。当前 Codex 的稳定入口是 skills，而不是项目级 `/sp.*` slash commands。

在 Codex 里，可以输入 `$sp-<command>` 显式调用 SP skill，也可以运行 `/skills` 后选择 `sp-<command>`。当自然语言请求匹配 skill description 时，Codex 也可能自动调用对应 skill；但对于 SP 这种阶段化工作流，建议优先显式调用，减少误触发或漏触发。

常用 SP skills：

```text
$sp-specify
$sp-prd
$sp-plan
$sp-tasks
$sp-analyze
$sp-implement
$sp-gate
$sp-ui
```

安装验收建议检查：

```bash
specify version
specify check
test -d .agents/skills
test -f .agents/skills/sp-prd/SKILL.md
test -f .agents/skills/sp-plan/SKILL.md
test -f .agents/skills/sp-analyze/SKILL.md
```

如果旧项目里已经有早期实验版生成的 `.codex/prompts/sp.*`、`.codex/commands`、`plugins/sp/`、`.agents/plugins/marketplace.json` 或其他 Codex prompt/plugin/command 残留，重新运行 `specify init . --integration codex` 即可刷新集成。当前 Codex 支持会保留 skills，并清理这些过时命令面。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `/sp.constitution`，Codex 中用 `$sp-constitution` | 建立或更新项目原则、工程约束和治理规则 |
| `/sp.prd`，Codex 中用 `$sp-prd` | 可选上游 PRD 发现，用于产品意图还不成熟时梳理草稿，并交给 `/sp.specify` 稳定化 |
| `/sp.specify`，Codex 中用 `$sp-specify` | 创建 feature 规格，说明要做什么、为什么做 |
| `/sp.clarify`，Codex 中用 `$sp-clarify` | 对不清楚的需求做结构化澄清 |
| `/sp.plan`，Codex 中用 `$sp-plan` | 生成技术方案、架构选择、源码结构、代码/测试映射和实现准入 |
| `/sp.flow`，Codex 中用 `$sp-flow` | 生成或刷新业务流程、状态流、时序流 |
| `/sp.ui`，Codex 中用 `$sp-ui` | 生成或刷新界面、页面映射、表单和交互说明 |
| `/sp.tasks`，Codex 中用 `$sp-tasks` | 把方案拆成带边界和验证要求的 `Mode: doc` 或 `Mode: impl` 任务包 |
| `/sp.analyze`，Codex 中用 `$sp-analyze` | 检查一致性、实现准入、任务包、trace、证据和漂移 |
| `/sp.gate`，Codex 中用 `$sp-gate` | 判断当前阶段是否可以安全进入下一步 |
| `/sp.implement`，Codex 中用 `$sp-implement` | 在允许写入范围内执行选中的 `Mode: impl` 任务，并记录验证证据 |
| `/sp.bundle`，Codex 中用 `$sp-bundle` | 打包当前 feature 的交付文档 |
| `/sp.checklist`，Codex 中用 `$sp-checklist` | 生成质量检查清单 |

## 和原版的关系

SP 来源于 [github/spec-kit](https://github.com/github/spec-kit)，并尽量保留原版稳定的安装和工作流风格。对用户来说，这个仓库就是安装目标：安装 SP，初始化项目，然后按宿主入口使用 SP：支持 slash 命令的宿主用 `/sp.*`，Codex 通过 `$sp-*`、`/skills` 或匹配的自然语言请求调用 skills。

## 许可证

本项目遵循原版 Spec Kit 的许可证。见 [LICENSE](./LICENSE)。
