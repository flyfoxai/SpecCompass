# SP 项目的方法论

本文记录 SP 项目的核心方法论。它不是命令手册，也不是对 Spec Kit、Superpowers、Kiro 的功能复述，而是说明 SP 想用什么工程方法来管理大模型协作、规格设计、上下文窗口、验证和自动化开发。

## 一句话定义

SP 是一套面向大模型协作的软件工程控制方法：先确定主干，再逐层展开分支和叶子；每推进一个小单元，都要给模型足够但不过量的上下文，并用验证、复核和反馈机制及时纠偏。

它的目标不是让模型“更自由”，而是让模型在更清楚、更小、更可验证的工作边界内发挥能力。

## 核心问题

SP 要解决的不是单一工具问题，而是大模型参与软件工程时经常出现的系统性问题：

- 模型上下文窗口有限，无法长期稳定记住完整项目。
- 模型容易在信息不足时猜测，猜错后会造成连锁返工。
- 人工反复解释背景会浪费 token，也会引入新的歧义。
- 文档、设计、任务、代码、测试如果没有关联关系，模型会局部正确但整体跑偏。
- 自动化开发如果缺少验证纪律，容易出现“看起来完成，实际不可用”。
- 长流程开发如果没有阶段性回看，早期误差会在后续阶段被放大。

SP 的基本判断是：大模型不是不能做复杂项目，而是复杂项目必须被拆成模型能稳定处理的工程单元。

## 方法论来源

SP 借鉴多个方向，但不机械照抄任何一个。

### Spec Kit 的启发

Spec Kit 的核心价值在于：先规格，后实现；先阶段化，后执行；先模板化约束，后让模型生成内容。

SP 应尽量保留 Spec Kit 已验证的安装机制、目录骨架、模板外壳和宿主接入方式。机制层越稳定，SP 就越能把精力放在内容改进、上下文管理和验证纪律上。

### Superpowers 的启发

Superpowers 的核心价值在于执行纪律：没有验证证据不能声称完成；任务要小；失败要先找根因；实现和复核要分开；收口动作要谨慎。

SP 不需要照搬它的目录、命名、skill 机制或工作流细节，但应该吸收它对“模型容易自我合理化”的防御思想。

### Kiro 类 spec 机制的启发

Kiro 类工具的启发主要在规格分层、设计优先、缺陷修复规格化这些方向。它提醒 SP：规格不只是需求文档，也可以是设计协作、修复分析和长期演进的载体。

这部分在 SP 中应作为抽象借鉴处理。除非经过实际验证，不应把外部工具的具体能力写成 SP 已经具备的事实。

### CodeGraph 类图结构工具的启发

CodeGraph 类工具的价值不在于可视化编辑器本身，而在于把“节点、关系、输入、输出、校验、错误回链”显式化。

SP 可以吸收它的控制思想：先把业务流程拆成可检查的关键节点，再让 UI、API、数据、测试和代码回链到这些节点；生成或刷新重要产物后，先做一致性检查，再把结论写入稳定 memory。

SP 不应吸收它的重型形态。不要把 Unity GraphView、图数据库、实时 watcher、C# 图编译器或完整节点拓扑维护变成默认机制。SP 的默认实现仍然是 Markdown source docs、memory、trace-index、open-items、文本搜索和轻量检查。

### 三方统一后的吸收原则

Codex、Claude、Gemini 和人工判断达成一致的部分，应沉淀成 SP 的稳定规则，而不是停留在聊天结论里。

统一后的吸收原则是：

- **保留 Spec Kit 的稳定外壳**：安装机制、目录骨架、模板外壳、integration 框架、脚本入口和 agent 接入方式，应尽量沿用已经验证过的 Spec Kit 机制。除非机制本身无法承载 SP 目标，否则不轻易重写外壳。
- **增强的是内容控制能力**：SP 的主要改进应放在需求澄清、流程主轴、UI 约束、memory、trace、open-items、workset、实现准入、验证纪律和兜底路由上，而不是制造新的复杂运行时。
- **把 Superpowers 的纪律落到命令执行**：小任务、测试牵引、失败根因、实现与复核分离、完成前必须有新鲜验证证据，应落实到 `/sp.tasks`、`/sp.implement`、`/sp.analyze` 和 `/sp.gate`，不能只写成原则。
- **把 Kiro 类规格思想转成长期治理**：规格不只是一次性需求文档。需求变更、设计选择、缺陷修复、风险接受和验收调整，都应回写到 source docs、clarifications、memory、open-items 或 trace 中，成为后续 agent 可检索的稳定事实。
- **把 CodeGraph 的节点关系思想轻量化**：SP 应借鉴稳定节点、显式关系、输入输出、校验、错误回链和影响半径查询，但默认只用 Markdown、编码、trace-index、open-items、文本搜索和测试证据表达。外部图谱工具只能作为可选辅助，不能成为 source of truth。
- **以 flow 作为业务关系主轴**：在有业务流程的 feature 中，流程节点优先连接需求、角色、状态、UI、事件、API、数据、测试和代码锚点。UI 是流程节点和业务动作的界面表达，不应孤立设计。
- **用工程控制闭环防跑偏**：每次生成或刷新重要产物后，都要检查来源、关系、未决项、验证路径和错误信号，再决定是否写入稳定 memory 或进入下一阶段。模型不能用自己刚写下的乐观结论证明本轮 PASS。
- **按项目规模调节强度**：小项目走轻量规则，避免流程成本超过收益；中型项目用标准 memory、trace、workset 管理；超大项目先拆 workset、子 feature 或子项目，避免上下文窗口无法覆盖。
- **人工决策必须通过澄清包完成**：模型可以给推荐，但不能替用户做风险接受、需求冲突、拆分方案或验证降级决策。需要人工选择时，进入 `/sp.clarify` 生成固定格式决策包；用户选择后再记录为正式决策。

这些原则的边界同样明确：SP 吸收的是经过本项目验证后有利于稳定性、准确性和上下文管理的控制思想，不把外部项目的具体目录、命名、插件机制、图数据库、实时 watcher 或宿主私有能力写成 SP 的默认依赖。

### 当前项目改造工作的启发

SP 当前项目本身的改造过程，也沉淀出一套方法论。

这次改造的核心经验是：当自研机制反复出现不稳定、宿主行为不一致、命令触发混乱、文档口径漂移时，不应该继续在旧机制上层层打补丁。更稳健的做法是回到已经验证过的 upstream 基线，先把“瓶子”恢复稳定，再把 SP 自己真正有价值的“水”迁移进去。

这形成了几条重要原则：

- **先确认问题属于机制还是内容**：如果问题来自安装路径、命令外壳、宿主接入、目录结构，就按机制问题处理，优先对齐 upstream；如果问题来自文档深度、上下文路由、任务拆分、验证纪律，就按内容问题处理，保留 SP 改进。
- **先冻结基线，再谈改造**：改造前必须明确当前参考的是哪个 upstream 版本、哪些文件夹和文件属于基线、哪些是 SP 增强。没有基线，就无法判断差异是 bug、增强还是历史包袱。
- **机械对齐不是低水平，而是降低风险**：在机制层，最安全的方案往往是尽量机械对齐 upstream。目录、模板外壳、脚本链、安装入口越接近原版，未知问题越少。
- **旧内容先归档，不直接删除**：历史文档里可能有错误机制，但也可能有有效业务思想。迁移时应先归档，再提炼内容，避免把有价值的设计一起丢掉。
- **迁移的是能力，不是旧形态**：旧版的 flow、ui、delivery、memory、workset 等机制，应该转化为当前 upstream 框架能承载的模板、文档和路由，而不是强行保留旧目录和旧调用方式。
- **争议要显式记录和收口**：当 Codex、Claude、人工审计或原版做法之间存在不同意见时，应把背景、影响、原版做法、推荐选择写清楚，再由人做宏观决策。达成一致后，及时删除过期结论，只保留仍有争议的部分。
- **外部模型可以审计，但不能替代验证**：调用 Claude、Opus 或其他模型做复核是有价值的，但它们的结论仍要用本地文件、diff、测试、安装结果来确认。
- **安装运行是最终验收**：文档写得合理不代表机制可用。必须能在真实或临时项目里完成安装，并能用用户真实调用形式触发命令，才算机制层通过。

这部分经验对 SP 很重要，因为它不是来自抽象设计，而是来自本项目实际踩坑后的反向提炼：当模型和工程系统同时参与改造时，最危险的不是不知道怎么写内容，而是机制漂移后大家以为自己还在同一个系统里工作。

### Skill 吸收后的轻量规则

本轮对本地 skill 的调研结论是：SP 应吸收可迁移的工程纪律和设计方法，而不是复制外部 skill 的目录、工具链或重型运行时。可吸收内容必须满足三个条件：能落到现有 `/sp.*` 命令模板、能复用现有 memory/trace/open-items/task 体系、能提高准确性、稳定性、验证质量或降低重复 token 消耗。

稳定吸收规则如下：

- **完成证据契约**：`/sp.implement`、`/sp.analyze`、`/sp.gate` 在声称完成或 PASS 前，必须写清 task/workset、实际运行的检查、结果摘要、未检查范围和剩余路由。模型信心、泛泛总结、旧检查输出或没有上下文的成功描述都不能证明完成。
- **File-backed Evidence**：证据优先写回现有承载物。任务局部证据写入 task notes/status，未解决风险写入 `memory/open-items.md`，重复失败签名写入 `memory/fallback-log.md`，稳定 source-backed 事实才进入 trace 或 stable memory。不要默认新增独立 evidence 文件，除非项目明确采用。
- **TDD-aware task shaping**：验收关键行为在实现前应先识别证明测试、契约检查、UI 交互检查或人工验证路径。无法自动化时，要记录原因和人工验证方式；核心行为既没有测试/检查路径，也没有显式例外时，不应进入实现。
- **Debug Evidence Loop**：调试先复现或定位失败证据，再提出可证伪假设和最小反证检查。第二次尝试必须引用第一次的反证证据；连续两次没有新证据、没有更小单元或没有改变 owner route 时，应停止本层修补并向上兜底。
- **Review Feedback Handling**：重要评审意见要先归类为 `valid`、`invalid`、`needs-info` 或 `accepted-risk`。`accepted-risk` 必须有 owner、影响和回看条件；`needs-info` 不能被当作通过。
- **轻量 UI 三维规划**：`/sp.ui` 只做对当前功能有用的轻量规划，默认风格是简洁清爽、分类明确、操作人性化。规划分为视觉风格、布局/展示效率、流程操作人性化三个维度；可以问 2-3 个短问题，但不要默认引入完整设计系统、Figma/MCP、媒体生成、爬虫或重型审计。
- **轻量 Flow 设计原则**：`/sp.flow` 的第一约束是满足业务真实，其次才是图形整洁。能满足业务要求时选择最小充分 flow；规则保持功能单一、松散耦合，按角色、状态、权限、异常和验证边界拆分。不要为了 diagram elegance 牺牲业务顺序、权限约束或异常路径。
- **扩展命令质量约束**：扩展命令也应说明触发条件、输入输出、读写范围、当前证据来源、检查命令来源、人类决策路由和 stage-scoped 指令，避免把大型方法论全文塞进每个命令。

明确拒绝的吸收方向包括：视频/音频转录、爬虫抓取、通用 deep research、全量多代理平台、默认 Figma 深集成、媒体生成流水线、完整设计系统生成器、CI/PR 自动修复平台、默认新增复杂 evidence 数据库。它们可以作为可选扩展或一次性辅助，但不能进入 SP 默认方法论。

## 文档语言规则

SP 不强制所有文档使用同一种语言。新增或更新文档时，应先判断文档用途，再选择语言：

- 面向外部用户的入口、安装、快速开始、升级、迁移和公开定位文档，优先保持中英文同步，至少保证中文和英文 README 的核心能力、命令入口、版本说明和安装验收口径一致。
- SP 方法论、研究、设计决策和复杂机制沉淀文档，默认使用中文，以保证长期设计讨论的精度和可维护性。
- agent 命令模板、skills、执行 prompt、脚手架内默认生成的模型指令，默认使用英文，除非该 preset 或本地化文档明确面向中文用户。
- archive、历史记录、外部调研摘录和一次性审计材料保留原语言，不为了语言统一而重写；只有其中的稳定结论进入方法论或用户文档时，才按目标文档语言重新整理。

“面向外部用户”通常指 README、docs 入口、安装/升级/迁移/集成指南、release notes 或公开项目定位文档。“保持中英文同步”不是要求所有文档立刻双语化，而是当现有中英文成对文档已经存在，且本次改动影响安装、入口、能力说明、版本或验收口径时，应在同一次修改中同步更新；如果短期无法同步，应留下明确后续项。

语言规则的目标不是形式统一，而是减少误读：用户入口要便于传播和安装，方法论要便于准确演进，模型执行材料要便于多宿主兼容，历史材料要避免无效重写。

## 基本原则

### 1. 稳健优先

SP 首先追求稳定、可追踪、可验证，而不是追求一次性高速生成。

如果一个任务需要模型处理过大的上下文、跨太多模块、同时做太多判断，就应该先拆分，而不是直接执行。

### 2. 主干先行

复杂项目要先确定主干，再长出分支，最后处理叶子。

主干包括目标、边界、核心业务规则、成功标准、关键约束。分支包括流程、界面、接口、数据、权限、测试和交付路径。叶子是具体任务、具体文件、具体测试、具体实现点。

没有主干时，不应该急着写叶子。主干不稳，后面越自动化，错误传播越快。

### 2.1 项目接手方向判断 (Project Intake Direction Judgment)

接手已有项目时，第一步不是修某个刚看到的文件，而是做项目接手方向判断。稳定术语是 `project intake direction judgment`。SP 明确要求不能“看到什么做什么”：它会让模型在大量 specs、flow、UI、governance、archive 和历史分析之间游走，消耗 token 却没有形成推进主线。

`/sp.route y` 的含义保持不变：当 route JSON 的 `continueAllowed` 为 `true` 且没有人工决策、未知阻塞或重复 fallback 时，继续执行下一步正确命令。`/sp.route y` 不是全局扫描入口。

全局扫描入口是 `/sp.route all`。只有当用户显式运行 `/sp.route all`，或当前没有可靠 `PRIMARY_THEME`、active feature、根阻塞族时，才执行项目接手方向判断。普通 `/sp.route` 和 `/sp.route y` 默认是 Warm Route：沿当前主线读取最小 route/memory/open-items/Stage Readiness 证据，不重复全项目扫描。

方向判断只回答一个问题：本轮唯一主线是什么。输出必须包含以下字段：

```text
PROJECT_GOAL: <当前项目目标>
CURRENT_STAGE: <当前阶段>
PRIMARY_THEME: <本轮唯一主线>
PRIMARY_THEME_SUMMARY: <1-3 句中文说明该 feature/module 的主要作用；必须基于 READ_SET；未确认则写未确认>
ROOT_BLOCKER_FAMILY: <根阻塞类型>
FIRST_FIX: <必须先解决的问题>
DEFERRED_WORK: <明确延后的问题>
READ_SET: <本轮已经读取或建议读取的最小集合>
PRIORITY_CLASS: P0 | P1 | P2 | P3 | P4 | P5
OPTION_A: [CMD: </sp.* 或 None>] <人话说明动作和影响>
OPTION_B: [CMD: </sp.* 或 None>] <人话说明动作和影响>
OPTION_C: [CMD: </sp.* 或 None>] <第三个动作和影响；没有则写 [CMD: None] None>
OPTION_D: [CMD: </sp.* 或 None>] <第四个动作和影响；没有则写 [CMD: None] None>
RECOMMENDED_OPTION: A | B | C | D
WHY_RECOMMENDED: <为什么推荐这个选项，必须引用 READ_SET 证据>
USER_DECISION_NEEDED: yes | no
MY_RECOMMENDATION: 我的推荐：选 <A|B|C|D>：<用中文说明推荐对象和理由>
NEXT_ACTION: <唯一下一步动作>
NEXT_COMMAND_EXEC: </sp.* 或 None>
NEXT_COMMAND_ID: </sp.* 或 None；NEXT_COMMAND_EXEC 的兼容别名>
NEXT_COMMAND: </sp.* 加中文提示词的一整行；必须能一次复制粘贴执行；如果 NEXT_COMMAND_EXEC 为 None 则写 None>
WHY_THIS_NEXT: <为什么这是下一步>
DO_NOT_RUN: <明确禁止的命令或 None>
CAN_CONTINUE: yes | no
```

`/sp.route` 不能只说“上一步已完成”或只列问题。它必须给出 2-4 个用户能直接理解的下一步选项，说明每个选项会带来什么影响，标出推荐项并说明理由，然后再收敛成一个 `NEXT_ACTION` 和一个 `NEXT_COMMAND`。如果只有一个安全动作，也要把明显不该做的替代项写出来并说明为什么不推荐，例如“现在运行 `/sp.implement` 会越过 gate 授权”。这不是让用户重新判断主线，而是把判断结果说成人话。

推荐必须说人话。`MY_RECOMMENDATION` 必须使用“我的推荐：选 A：<主线或动作>”这类中文句式，明确说明为什么推荐这个选项。`NEXT_COMMAND_EXEC` 保持纯命令，方便自动解析；`NEXT_COMMAND_ID` 只是兼容旧提示的别名，值必须和 `NEXT_COMMAND_EXEC` 一致。`NEXT_COMMAND` 必须是一整行可以直接复制粘贴执行的命令，格式是“slash 命令 + 中文提示词”。中文提示词要告诉下一步命令重点关注什么、要重新检查哪些阶段边界或 gate 风险、必须依据哪些 memory/READ_SET 证据。不能只写“继续执行”或“按需检查”。

结构化推荐字段必须先展示，最终复制框必须放在整个回复最底部。这个最终复制框是最后一个 `text` 代码块，里面只能放 `NEXT_COMMAND` 的值本身：不要带 `NEXT_COMMAND:` 标签，不要放 `OPTION_A/B/C/D`、`MY_RECOMMENDATION`、`NEXT_COMMAND_EXEC`、`WHY_THIS_NEXT`、`DO_NOT_RUN` 或解释文字。如果 `NEXT_COMMAND_EXEC` 是 `None`，最终复制框只写 `None`。这样用户可以直接复制最后一个代码块启动下一步。

这里要区分人类入口和机器入口。`NEXT_COMMAND` 是给人复制粘贴的整行，不是给编排器直接 shell 执行的字符串。Hermes、OpenClaw、CrewAI、LangGraph 这类多 agent 编排环境必须从 route JSON 的 `next`/`blockerRoute`，或从 `NEXT_COMMAND_EXEC`，取得可执行 slash 命令；然后把 `NEXT_COMMAND` 中的中文提示词作为 worker 的任务上下文传入。不能让 worker 自己从长中文句子里猜命令。

每个选项必须以 `[CMD: ...]` 开头。`RECOMMENDED_OPTION` 不能指向 `[CMD: None] None` 的空选项；`MY_RECOMMENDATION` 里的字母必须和 `RECOMMENDED_OPTION` 一致；`NEXT_COMMAND_EXEC` 必须等于推荐选项里的 `[CMD: ...]`。`USER_DECISION_NEEDED` 只是人类说明字段，不能变成第三套自动继续机制；自动继续仍然只看 route JSON 的 `continueAllowed` 和 `autoExecute`。

遇到 `110-template-library-template-application` 这类编号 feature、模块名或主线名时，必须顺手给出简短中文介绍，帮助用户做主观检查。`PRIMARY_THEME_SUMMARY` 固定写 1-3 句，说明它主要做什么、为什么和当前路线有关。这个说明必须来自 `READ_SET`、feature memory、PRD、outline 或 Stage Readiness；如果证据不足，必须写“作用未确认”，并把下一步推荐收敛到补证据或 `/sp.route all`，不能根据名字编造作用。

示例：

```text
OPTION_A: [CMD: /sp.analyze 110-template-library-template-application] 继续复核该模板应用样本的 analyze 证据；影响是先把 gate 前边界确认清楚。
OPTION_B: [CMD: None] 现在运行 /sp.implement；不推荐，因为该 feature 仍是文档治理，未授权生产实现。
RECOMMENDED_OPTION: A
MY_RECOMMENDATION: 我的推荐：选 A：110-template-library-template-application。它最接近当前主线，且 gate 前还需要复核 analyze 证据。
PRIMARY_THEME_SUMMARY: 110-template-library-template-application 主要用于验证模板库模板在实际 feature 中的应用链路。当前应把它当作模板机制落地样本，而不是生产实现任务。
NEXT_COMMAND_EXEC: /sp.analyze 110-template-library-template-application
NEXT_COMMAND_ID: /sp.analyze 110-template-library-template-application
NEXT_COMMAND: /sp.analyze 110-template-library-template-application 请先用几句话说明 110-template-library-template-application 的主要作用：它是模板库模板在实际 feature 中的应用链路样本，用来检查模板机制是否能被正确落地。请重点关注 template application 的 Stage Readiness、open-items.md 中未关闭事项，以及是否存在越过 analyze/gate 边界的问题。请基于 active-context、feature-map 和该 feature 的 memory/index.md 重新判断，不能把运行时或实现证据当成已授权实现。
```

最终复制框示例必须另起一块，并放在回复最底部：

```text
/sp.analyze 110-template-library-template-application 请先用几句话说明 110-template-library-template-application 的主要作用：它是模板库模板在实际 feature 中的应用链路样本，用来检查模板机制是否能被正确落地。请重点关注 template application 的 Stage Readiness、open-items.md 中未关闭事项，以及是否存在越过 analyze/gate 边界的问题。请基于 active-context、feature-map 和该 feature 的 memory/index.md 重新判断，不能把运行时或实现证据当成已授权实现。
```

选项和推荐不能只根据当前文件、局部上下文或模型直觉生成。`OPTION_A` 到 `OPTION_D` 与 `WHY_RECOMMENDED` 必须立足 `READ_SET` 中列出的全局 SP 证据：route JSON、项目记忆、`.specify/memory/active-context.md`、`.specify/memory/feature-map.md`、feature `memory/index.md`、`memory/open-items.md` 和 Stage Readiness。证据缺失、过期或互相冲突时，推荐项只能是 `/sp.route all`、`/sp.clarify` 或最小取证/修复记忆动作，不能编造一个看似能推进的方向。

当 `USER_DECISION_NEEDED: yes`、`SP_STATUS: NEEDS_DECISION` 或阻塞类型是 `HUMAN_DECISION` 时，`RECOMMENDED_OPTION` 只能指向补齐决策包、运行 `/sp.clarify` 或补最小证据。它不能推荐下游实质推进命令来绕过人工决策。

如果 `PROJECT_GOAL`、`PRIMARY_THEME` 或 `ROOT_BLOCKER_FAMILY` 无法可靠判断，必须停止并返回 `SP_STATUS: NEEDS_DECISION`，给出 2-4 个选择、每个选择的影响、推荐项和下一步命令。不能用“我先看某个 feature”替代方向判断。是否继续执行只看 JSON 的 `continueAllowed` 和 `autoExecute` 语义，不再新增第二套继续字段。

### 2.2 普通命令收尾推荐契约

`/sp.route` 负责路线判断，但其他 `/sp.*` 命令不能因此把下一步建议省略。任何 `/sp.prd`、`/sp.specify`、`/sp.clarify`、`/sp.flow`、`/sp.ui`、`/sp.bundle`、`/sp.plan`、`/sp.tasks`、`/sp.analyze`、`/sp.gate`、`/sp.checklist`、`/sp.taskstoissues`、`/sp.implement`、`/sp.constitution` 的完成输出，都必须用同一套收尾推荐格式给出答案。

普通命令收尾的目标不是重新做一次全局 route，而是把本命令证据、当前 Stage Readiness、open-items、feature memory 和项目 memory 汇总成一个明确下一步。命令不能只说“已完成”，也不能只指出问题后让用户自己判断路线。每次收尾都要给 2-3 个选项，标出推荐项，说明为什么推荐，然后给出一行可直接复制粘贴的 `NEXT_COMMAND`。

固定格式：

```text
OPTION_A: [CMD: </sp.* 或 None>] <人话说明动作和影响>
OPTION_B: [CMD: </sp.* 或 None>] <人话说明动作和影响>
OPTION_C: [CMD: </sp.* 或 None>] <没有第三个有效选项时写 [CMD: None] None>
RECOMMENDED_OPTION: A | B | C
MY_RECOMMENDATION: 我的推荐：选 <A|B|C>：<用中文说明推荐对象和理由>
NEXT_ACTION: <唯一下一步动作，不写“如果需要”>
NEXT_COMMAND_EXEC: </sp.* 或 None>
NEXT_COMMAND_ID: </sp.* 或 None；NEXT_COMMAND_EXEC 的兼容别名>
NEXT_COMMAND: </sp.* 加中文提示词的一整行；必须能一次复制粘贴执行；如果 NEXT_COMMAND_EXEC 为 None 则写 None>
WHY_THIS_NEXT: <基于全局/feature memory、open-items、Stage Readiness 和本命令证据说明为什么这是正确方向>
DO_NOT_RUN: <当前明确不该跑的命令或 None>
```

`NEXT_COMMAND_EXEC` 是机器入口，只能放纯 slash 命令或 `None`。`NEXT_COMMAND` 是人类入口，必须是“slash 命令 + 中文提示词”的单行文本，方便用户一次复制粘贴继续执行。不得再输出单独的提示字段，也不得把中文提示词拆到下一行。Hermes、OpenClaw、CrewAI、LangGraph 等多 agent 编排器只能从 `NEXT_COMMAND_EXEC` 或 route JSON 取命令，把 `NEXT_COMMAND` 的中文说明作为 worker prompt/context 传入。

普通命令也必须把最终复制框放在整个回复最底部。字段块里的 `NEXT_COMMAND: ...` 用于说明和审计；最底部复制框只放同一条命令行本身，不放标签、不放选项、不放理由。用户看到最后一个代码块时，不需要再删字段名或筛选内容。

普通命令推荐也必须立足全局。输出 `WHY_THIS_NEXT` 前，命令应尽量引用或核对 `.specify/memory/active-context.md`、`.specify/memory/feature-map.md`、feature `memory/index.md`、`memory/open-items.md`、Stage Readiness 和当前命令证据。证据缺失或互相冲突时，推荐项应收敛到 `/sp.route all`、`/sp.clarify` 或最小 owner route，而不是下游阶段命令。

遇到 `110-template-library-template-application` 这类编号 feature、模块或主线名时，普通命令也要给 1-3 句简短中文说明，说明它主要做什么、为什么和当前推荐有关。说明必须来自 feature memory、PRD、outline、Stage Readiness 或本命令读到的证据；证据不足时写“作用未确认”，并推荐补证据或 `/sp.route all`。

普通命令不得用“如果你需要阶段入口判断”“必要时运行”“可考虑运行”“视情况继续”作为最终建议。可以说明备选项的条件，但 `RECOMMENDED_OPTION`、`NEXT_ACTION` 和 `NEXT_COMMAND` 必须给出唯一推荐答案。

多 agent 环境下，SP 的适配原则是“一个 coordinator，多个只读 worker，集中写 memory”。Hermes/OpenClaw 可以把 `/sp.route` 作为 coordinator 的入口，由 coordinator 读取 route JSON 和 `READ_SET`，再把 `NEXT_COMMAND` 的中文提示词派发给一个 worker。CrewAI 可以把 `/sp.route` 放在 manager/planner task，researcher/reviewer/implementer 等角色只读 `.specify/memory/*` 和 `specs/<feature>/memory/*`，需要修改 memory 时提交建议，由 coordinator 合并。LangGraph 应把 route JSON 建成状态机节点，用 `status`、`next`、`blockerRoute` 走条件边，并把 memory 更新放在串行 reviewer/commit 节点之后。任何框架都不应让多个 worker 并发写 active-context、feature-map 或 feature memory；否则会出现覆盖、旧证据推荐和阶段边界错判。

项目级读取顺序必须固定，且默认只读最小路由集合：

1. 项目入口：`README`、`.specify/memory/project-index.md`、`.specify/memory/active-context.md`、`.specify/memory/feature-map.md`、`/sp.route` 输出。
2. 候选 feature 的 `memory/index.md`、`memory/open-items.md`、Stage Readiness。
3. 只对主线候选展开 `prd.md`、`spec-outline.md`、`spec.md`、`analysis.md` 或 `gate.md`。
4. 不默认读取所有 flow、UI、governance、archive、历史分析文件。

如果项目有很多 feature，首次扫描只允许输出分布和候选主线，不允许逐个深读。`READ_SET` 要说明已经读了什么，以及为什么还不需要展开更多上下文。

主线选择按以下规则执行：

1. 机制漂移优先：SP 安装命令、模板、路由规则和当前机制不一致时，先修机制漂移。
2. 根阻塞优先：多个 feature 被同一类问题阻塞时，先解决根阻塞，不逐个重复修。
3. 阶段准入优先：`/sp.analyze` 已 PASS 但是否能进入下一阶段不明确时，下一步是 `/sp.gate` 或补 gate 所需证据。
4. 代表样本优先：需要迁移多个 feature 时，先选一个高信息量样本打通全链路，再复制模式。
5. 业务价值优先：多个候选都可推进时，选择用户目标、项目记忆或发布路径中价值最高的。
6. 低切换成本优先：价值相近时，选择所需上下文最少、最接近关闭状态的主线。

项目级优先级梯队如下：

| 梯队 | 类型 | 默认动作 |
|---|---|---|
| P0 | SP 安装、命令、模板、路由漂移 | 先修机制，不继续产出 feature 文档 |
| P1 | 阶段阻塞：缺 PRD、缺 outline、缺 source authority、缺人工决策 | 回到 owner stage，不向下游推进 |
| P2 | 主线 feature 的 readiness 缺口：Stage Readiness、open-items、trace/memory 断链 | 修主线样本，不批量展开 |
| P3 | gate/analyze 边界问题：analyze PASS 但 gate 未判断，Monitoring 未关闭 | 跑 gate 或补 gate 所需证据 |
| P4 | 运行时、集成、E2E、性能证据补齐 | 只在 feature 已授权进入对应阶段后补 |
| P5 | flow/UI/governance 可视化、格式整理、重构 | 主线闭环后再做 |

切换主线必须显式说明切换成本。输出至少包含 `CURRENT_THEME`、`REQUESTED_THEME`、`SWITCH_COST`、`RISK`、`RECOMMENDATION` 和 `NEXT_COMMAND`。除非用户明确确认切换，否则 SP 不应静默切换到另一个 feature。

### 3. 上下文窗口是工程资源

上下文窗口不是越大越好，也不是越小越好。正确目标是：当前工作需要什么，就拿什么；不相关的信息，不要塞进来。

模型开展工作前，应先建立“当前工作关联图”，而不是只读一个文档就开始做。关联图至少考虑这些信息：

- 当前目标：这次到底要解决什么问题，成功标准是什么。
- 当前阶段：现在是在澄清、设计、拆任务、复核、实现、修复，还是收口。
- 当前 feature：目标 feature 的规格、计划、任务、未决问题和最近结论。
- 业务流程：相关流程、状态变化、异常路径、用户角色。
- 界面和交互：相关页面、表单、按钮、字段、页面跳转、错误提示。
- 接口和契约：相关 API、输入输出、错误码、事件、外部依赖。
- 数据和权限：相关表、字段、索引、数据流、权限矩阵、审计要求。
- 代码文件：本次可能修改或依赖的文件、模块边界、已有实现风格。
- 测试和验证：已有测试、应新增的测试、人工验收路径、失败复现方式。
- 风险和约束：兼容性、性能、安全、迁移、发布、回滚、不可破坏的规则。

这不是要求每次全量读取，而是要求模型知道“应该找哪些关联信息”。读取策略应按工作大小分层：

- 小任务：只读取目标文件、相关测试、直接依赖和任务说明。
- 中任务：读取 feature 规格、相关流程或界面、接口契约、涉及模块。
- 大任务：先读项目路由和 feature memory，再按领域展开，不直接全仓扫描。
- 信息冲突：优先停下来标记冲突，必要时询问用户，不靠猜测继续。

上下文管理的关键不是“少读”，而是“有选择地读”。少读到漏掉接口、权限、界面或测试，会让模型产生局部正确的错误结果；多读到无关历史和无关模块，会浪费 token 并稀释注意力。

### 4. 宏观多询问，微观细落实

模型应在宏观决策上多问，在微观执行上少问。

宏观决策包括业务范围、优先级、方案取舍、合规风险、破坏性操作、是否接受技术债。这些不应由模型擅自决定。

微观执行包括补全文档结构、按明确任务修改文件、运行测试、刷新记忆、修复明确失败。只要输入充分、边界清楚，就应尽量自动推进。

需求入口也遵循这个原则。`/sp.prd` 是所有新 feature、能力方向和重要需求变更的强制上游入口，用于从 0 到 1 的需求发散、访谈式收集、候选需求隔离和 PRD 草稿沉淀。简单需求可以走精简 PRD，但不能跳过 PRD。精简 PRD 只适用于用户已经给出清楚目标、用户、范围和基本验收意图的情况，最少也要保留战略目标、目标用户、核心场景、范围/非目标、验收种子、风险/open questions 和 handoff；0 到 1 想法、范围不清、多能力方向、治理影响、高风险或 source 冲突必须走完整 PRD。`prd.md` 不是稳定事实源；`/sp.specify` 仍是稳定规格入口，负责把已确认、可追踪、适合稳定化的内容写入 `spec.md`。如果执行 `/sp.specify` 时缺少 `prd.md` 或 PRD readiness，应先返回 `/sp.prd`。

轻量小改和重要需求变更必须明确区分。轻量小改只限于不改变目标用户、业务范围、核心流程、验收边界、source authority、风险等级、数据/权限/合规含义的局部文字修正、命名澄清、重复内容合并或已确认细节补录；它可以在当前稳定 `spec.md` 内直接处理。只要变更引入新能力方向、新角色或权限、新业务流程/分支、验收口径变化、release scope 变化、source rebase、风险/合规/真实资金/真实数据影响，或会使当前 `spec.md` 的范围判断失效，就属于重要需求变更，必须回到 `/sp.prd` 做上游 intake 和 outline readiness。

PRD 阶段使用模型能力时，应遵循自上而下的需求生长：先确定战略目标、产品定位、业务目标、目标用户和能力版图，再拆解关键问题域、核心场景、范围边界、主流程、关键分支、验收种子和风险，最后才记录局部细节。用户主动提供的按钮、字段、文案、排序、权限例外等细节可以保留，但必须挂到上级目标、能力域、流程、界面、数据或验收对象下面；挂不上去的细节只能作为候选、seed 或 open item。

`prd.md` 的细致程度边界是“足够交给 `/sp.specify` 提炼稳定规格”，不是“足够直接实现”。PRD 可以包含 flow/ui/data/acceptance/risk seeds，但不能替代 `/sp.flow`、`/sp.ui`、`/sp.plan`、`/sp.tasks`，也不能默认输出完整界面元素清单、状态机、API、数据库结构、代码路径、测试命令或实现任务。
Lean PRD 也不能只剩目录。它至少要有一个清晰战略目标、一个目标用户或角色、一个有边界的核心场景、明确的范围/非目标、验收种子，以及至少一个仍需确认的风险或开放问题；否则就该继续补 PRD 或转澄清，而不是假装已经足够进入下游。

`/sp.prd` 收尾时必须做 PRD-to-spec outline readiness 检查：如果战略目标、用户/角色、范围、能力地图和 source authority 已经清楚，应自动生成或刷新 `specs/<feature>/spec-outline.md`，状态为 `READY_FOR_SPECIFY`。如果 PRD 仍存在关键 `[src:ai-proposed]`、`[uncertain:*]`、范围冲突、source 缺失或 feature 边界不清，不能生成稳定 outline；应在 `prd.md` 末尾输出 `Outline Decision`，说明为什么不能稳定化、下一步应走 `/sp.clarify`、继续 `/sp.prd`、补 source，还是拆分 feature。如果 feature 目录已经明确，还应同步创建或刷新阻断型 `specs/<feature>/spec-outline.md`，并在其中保留同一个 `Outline Decision`，让 `/sp.specify`、检查脚本和后续 agent 能从单一入口读到当前阻断原因。

`spec-outline.md` 必须包含轻量 `Source Authority Summary`。它只列出稳定 source、候选 source、归档或缺失 source、是否存在 source rebase 决策，以及 `/sp.specify` 可以安全消费哪些来源；不要复制完整 PRD，也不要维护重型 source map。这样可以防止后续模型把 `[src:ai-proposed]`、旧归档、缺失 legacy source 或不可验证报告误当成稳定规格依据。
`/sp.specify` 消费 outline 前必须做轻量 freshness/source snapshot 检查。检查对象是 outline 的 `Based On`、`Source Snapshot` 或 `Source Authority Summary`、`Status History`、`Outline Decision` 和 `Handoff To Specify` 是否仍匹配当前 `prd.md`、source authority、feature 边界和人工决策记录；不要用文件 `mtime` 或原始 hash 做硬门禁。轻量脚本发现 `READY_FOR_SPECIFY` outline 缺少 `Based On`，或缺少 `Source Snapshot`、`Source Authority Summary`、`Evidence Signature` 三者之一时，只能输出 `WARN`，表示下游缺少稳定入口凭证，不代表业务语义已经失败。发现缺失、过期、source rebase 未确认、PRD 重大变化或 feature 边界不一致时，回到 `/sp.prd` 或 `/sp.clarify` 刷新，而不是继续稳定 `spec.md`。

如果信息不足但 feature 目录已经明确，可以生成阻断型 `specs/<feature>/spec-outline.md`，但状态只能是 `NEEDS_PRD`、`NEEDS_CLARIFY`、`NEEDS_SOURCE`、`SPLIT_REQUIRED`、`NEEDS_DECISION` 或 `BLOCKED`，不能是 `READY_FOR_SPECIFY`。阻断型 outline 的作用是保存已知骨架和缺口，不是授权 `/sp.specify` 继续稳定规格。`NEEDS_DECISION` 用于已经具备候选方向但必须由人工选择的产品、风险、source rebase、拆分或验收决策；人类选择写回 `prd.md`、`clarifications.md` 或 `spec-outline.md` 后，才能重新计算是否可升为 `READY_FOR_SPECIFY`。`/sp.outline` 或 PRD 内置 outline 逻辑不能替代 `/sp.specify`，只能判断是否可以进入 `/sp.specify`；它不能提前替代 flow、ui、plan、tasks 或实现设计。

已有 `spec-outline.md` 不能被当成静态结论。每次 `/sp.prd` 刷新时都应重读当前 PRD、source 和已有 outline，然后按现有证据重新计算状态：补足产品意图后 `NEEDS_PRD` 可以升为 `READY_FOR_SPECIFY`；记录人工决策后 `NEEDS_CLARIFY` 可以解除；补回 source 或用户明确同意 rebase 后 `NEEDS_SOURCE` 才能解除；用户确认单一 feature 边界或完成拆分后 `SPLIT_REQUIRED` 才能解除；人工选择写回后 `NEEDS_DECISION` 才能解除；`BLOCKED` 解除时必须在 handoff 说明阻塞如何解决。`Outline Decision` 只负责 readiness、blocker、next route 和为什么不能稳定化；`Handoff To Specify` 只负责在 ready 时摘要 `/sp.specify` 应稳定化的输入，或在 not-ready 时引用同一个 next route。两者可以互相引用，但不能出现两个相互矛盾的下一步结论。

`spec-outline.md` 应保留轻量 `Status History`，只记录状态变化、阻塞解除、source rebase、feature split 或 owner review 这类会影响下游准入的事件，不记录完整推理过程。每条记录至少包含 `timestamp/run-id`、`status`、`blocker-signature`、`next-route`、`evidence-summary`。`blocker-signature` 应是稳定短句，例如 `missing-source:legacy-prd`、`scope-split:admin-vs-tenant`，用于判断是不是同一个阻塞。这样后续模型可以快速判断 readiness 是如何形成的，避免每次从头重读全部 PRD 和 source。

如果同一 `blocker-signature`、同一 outline 状态、同一 `next-route` 连续两次刷新后仍没有新证据，模型必须停止重复生成，升级为 `BLOCKED` 或 `NEEDS_DECISION`，并输出决策包：背景、影响、2-4 个选项、推荐方案、下一步命令。`新证据` 只包括用户确认、source 恢复、明确 rebase 决策、feature split 结果、风险/合规/owner 决策或能改变 readiness 的文档证据；同义改写、补充模板段落、模型重新总结不算新证据。后续应进入 `/sp.clarify`、继续补 source、请求 owner 决策或拆分 feature，而不是继续消耗 token 重写相同文档。
重复 blocker 的决策包必须写回可复用的位置，默认写到 `specs/<feature>/memory/open-items.md`，并在 `prd.md` 或 `spec-outline.md` 中保持同一个 `blocker-signature` 和下一步路线，避免后续命令再从头判断同一问题。

高风险、0 到 1 新产品方向、范围拆分、source rebase、治理候选、真实资金/数据/合规影响的 outline 即使已经具备 `READY_FOR_SPECIFY` 的材料，也必须在 `Outline Decision` 或 `Handoff To Specify` 中给出明确 `Owner Review Required` 块。固定字段包括：`Risk Type`、`Review Focus`、`Impact If Approved`、`Impact If Rejected`、`Recommended Choice`、`Confirm To Proceed`。确认前只能建议 owner review 或 `/sp.clarify`，不能建议直接进入 `/sp.specify`。这不是降低自动化能力，而是防止模型把战略性或风险性判断伪装成普通规格整理。

轻量检查脚本发现高风险 `READY_FOR_SPECIFY` outline 缺少 `Owner Review Required` 时，只能输出候选 `WARN`，不能直接当成硬错误。是否阻断必须由 `/sp.analyze` 或 `/sp.gate` 重读 outline、PRD/source authority、当前风险和决策记录后判断：如果确实依赖 owner 确认，则转为 `NEEDS_DECISION` 或阻断 PASS；如果只是低风险词汇误报或已有等价确认，则记录为非阻断 warning。

`/sp.prd` 和 `/sp.constitution` 的目标要分清。`/sp.prd` 面向某个产品、feature 或能力方向，负责生长战略目标、产品定位、能力版图、问题域、场景和范围；`/sp.constitution` 面向整个项目，负责长期治理规则、工程纪律、阶段边界、验证要求、风险门禁和人工决策规则。PRD 可以发现长期治理候选，但不能直接把它们当成正式宪法规则；应写入 constitution 的候选治理区，由 `/sp.constitution` 后续保留、合并、确认并提升为正式长期规则。

候选治理区是长期治理候选的主落点。`/sp.prd` 可以追加或更新 `.specify/memory/constitution.md` 的 `Constitution Candidates` 区，但不能直接修改正式 constitution 正文、正式规则、阶段边界或验证纪律。`prd.md` 只保留来源摘要、用户原话或 handoff，避免后续 `/sp.constitution` 重读整份 PRD 反复提取。进入候选治理区必须有强度门槛：跨 feature 可能复用，或涉及安全、合规、不可逆操作、真实资金/数据风险、长期工程纪律、验证门禁或人类决策规则。单 feature 局部风险、局部 TODO 或普通需求取舍应留在 `prd.md`、feature memory 或 `open-items.md`。候选状态只使用固定枚举：`proposed`、`under-review`、`promoted`、`rejected`、`merged`。

`/sp.specify` 应先把用户目标、方案想法、验收标准、范围边界拆开，再检查是否存在天然冲突：用户意图互斥、验收标准矛盾、范围突然扩大、或出现独立的新业务目标。冲突不清时进入 `/sp.clarify`；已经影响规格时回到 `/sp.specify` 修正；影响 workset、技术路线或拆分方式时回到 `/sp.plan`；阻断阶段准入时 `/sp.gate` 必须给 `FAIL`、`NEEDS_DECISION` 或 `BLOCKED`。`/sp.implement` 不能用技术 hack 绕过业务矛盾。

如果 `/sp.clarify` 过程中发现用户其实提出了新功能，不应静默合并进当前 feature。它应返回 `NEW_FEATURE_DETECTED`，说明背景、影响、2-4 个选择、推荐方案，并路由回 `/sp.specify` 创建新 feature 或由用户明确确认扩展当前范围。

### 5. 小步推进

SP 的工作单元要小到可以被复核。

一个好的工作单元应说明：要改什么、为什么改、涉及哪些文件、依赖哪些输入、完成后如何验证、失败时回到哪里。

小步不是低效。小步的价值在于错误暴露早、回滚成本低、上下文需求小、模型更容易保持注意力。

### 6. 验证先于完成声明

“完成”不是模型的感觉，而是验证结果。

凡是声称完成、通过、修复、可用，都应有本次工作中的新鲜证据。证据可以是测试、构建、检查清单、人工验收记录、文档一致性检查或明确的无法自动化说明。

如果没有验证，只能说“已修改”或“待验证”，不能说“完成”。

### 6.1 明确误差信号，判断系统是否在收敛

从工程控制论角度看，模型不能只知道“下一步做什么”，还要知道当前系统哪里不稳定。SP 应把会导致跑偏的信号显式化，作为阶段判断和纠偏输入。

默认误差信号包括：

- open `Blocker`。
- open `Risk`，尤其是影响验收、发布、数据、安全、回滚或实现信心的风险。
- 非平凡 `@t0`，也就是缺少验证证据且会影响范围、验收、发布、回滚、人工决策或后续工作。
- `@r0` 没有对应 `RISK` 记录，或风险记录缺 owner、影响范围、关闭条件、回退/降级方案。
- `UnresolvedRef`，例如找不到 source doc、API 未落地、测试未绑定、trace anchor 无回链。
- stale memory，尤其是 memory 与 source docs、代码或测试结果冲突。
- 核心占位符、验收断链、trace 断链、失败测试或失败检查。

这些信号不要求每次都计算复杂分数。轻量做法是让 `/sp.analyze` 或 `/sp.gate` 输出一个“误差面板”：哪些为 0，哪些仍打开，哪些是硬阻断，哪些可以带 warning 进入下一步。目标不是追求数字好看，而是保证每次推进都能看见系统是否更稳定。

### 7. 及时回看和纠偏

SP 不默认继续往前做就是正确。

每个阶段结束时都要回看：目标是否变了，规格是否一致，任务是否仍有效，memory 是否过期，验证是否覆盖关键路径，是否出现新的人工决策点。

发现偏差后，应回到对应层级修复，而不是在更低层继续堆补丁。

### 8. 向上兜底，不局部硬冲

每条规则都应有兜底路线。模型在低层工作中遇到解决不了的问题时，不应该继续猜，也不应该扩大修改范围硬冲。

兜底前要先做本层根因判断。除非存在数据破坏、安全、权限、合规、不可逆迁移或明确缺少业务决策，模型应先完成一次有限的本层排查或修复尝试，并记录证据：尝试了什么、为什么失败、为什么当前层无法继续解决。

“有限尝试”不是扫一眼就放弃。最低标准是：读取当前任务和直接相关源文件或文档，复现或定位失败证据，提出至少一个具体假设，并用测试、检查、文件对照或文档证据验证它。只有这些证据说明问题不在当前层，才进入兜底。

默认兜底方式是只向上移动一层：

- 实现做不下去，回到 `tasks.md` 重新拆任务或调整顺序。
- 任务本身不成立，回到 `plan.md` 调整 workset、依赖或交付设计。
- 计划无法闭合，回到 `spec.md`、flows、ui 或 bundle 修正业务边界。
- 规格仍有冲突，回到 constitution、项目原则或用户决策。

连续失败的默认判定是：同一任务、同一验收项或同一文件区域在两次有证据的本层尝试后仍失败。第三次不应继续局部硬冲，应上移一层重新判断任务、计划或规格是否错误。

第一次失败后，不应马上重复同一种修法。第二次本层尝试前，模型应做一次简短差分诊断：上一次假设是什么，哪个证据证明它不够，第二次尝试换了什么假设、文件或验证方式。这样可以避免同一错误假设反复震荡，浪费 token 并扩大改动范围。

震荡保护要更明确：同一失败签名在同一层最多允许两次有证据的尝试。同一 workset 如果在两个层级之间反复往返超过阈值，应停止自动推进，输出 `NEEDS_DECISION` 或 `BLOCKED`，列出失败链路、已经尝试的路线、为什么当前层无法解决、以及下一步 2-4 个选项。不能在 `implement`、`tasks`、`plan` 之间循环消耗 token。

震荡保护不能只靠模型记忆。跨命令失败应写入 feature-local 轻量记录，推荐位置是 `specs/<feature>/memory/fallback-log.md`。每条记录至少包含：workset 或 anchor、来源命令、失败签名、失败证据、已经尝试的路线、下一步建议、记录时间或本轮标识。`fallback-log` 必须有边界：最多保留 10 条 active entry；同一失败签名重复出现、阻断阶段准入、涉及人工决策、数据迁移、权限、安全、发布、回滚或工作树清理时，应提升到 `memory/open-items.md`，并在 fallback-log 里只保留 `promoted -> OPEN-*` 或 stale 引用。任意命令发现同一 workset 或 anchor 在最近记录中反复出现相同失败签名，且没有新增证据时，应直接输出 `BLOCKED` 或 `NEEDS_DECISION`，不要重新消耗 token 再跑同一层。

跨多层上移要更谨慎。默认只允许上移一层；只有同时满足两个以上触发信号，或存在安全、权限、数据破坏、合规、不可逆迁移、明确缺少用户/业务决策这类硬风险，才允许直接跨多层。触发信号包括：连续失败、跨文档矛盾、约束冲突、验收标准缺失、权限或数据风险无法判断。

普通不确定、读集不足、可以通过本层证据验证的问题，不能被当作“明确缺少用户/业务决策”。只有业务目标、范围、成功标准、合规权限、数据风险或长期取舍确实需要人决定时，才进入这个兜底分支。

如果低层执行已经产生了不稳定的中间修改，兜底前必须先控制现场。模型应先检查当前变更范围，区分稳定改动、失败尝试、未验证改动和用户已有改动；不得用 `git reset`、`git checkout` 这类破坏性动作擅自清理。无法确认哪些改动可保留时，应停止扩大修改，并向用户说明现场状态、风险和可选处理方式。

如果混乱来自范围不清、规格冲突、验收标准不明、文档互相矛盾或用户意图变化，默认先回到 `sp.clarify` 做再确认和条理化，而不是直接进入实现层继续修补。`sp.clarify` 不属于线性兜底链里的普通上一层，而是非线性的澄清入口：任何层级发现输入侧病态，都可以先用它把问题重新拆成清楚的业务问题、决策点和后续路线。澄清结论必须回填到当前失败层或更高层的源文档、memory 或 open item；回填后，本层连续失败计数可以重置，再继续按 `tasks.md`、`plan.md`、`spec.md` 的常规链条推进。

每次兜底都要留下四个信息：失败发生在哪一层、为什么不能在当前层解决、上移到哪一层、下一步应执行哪个 `sp.*` 步骤或需要用户决定什么。

### 8.1 阻塞归因、边界状态和闭环

复杂阻塞不能靠“再跑一次”“多写一点文档”“多花 token”来解决。SP 的默认处理顺序是：先归因，再拆成边界状态，再选择 owner 命令，最后写回稳定事实源。

每个下游命令进入正文前，都要先做一次轻量的阶段入口准入检查。这个检查不是重新跑全流程，而是确认当前命令是否站在正确的上游事实之上：routing 是否指向当前 feature，必要产物是否存在，产物是否明显还是初始化模板或通用话术，关键 open item 是否阻断本阶段，用户输入是否引入了需求变化。只要这些前置条件会影响当前命令的正确性，就应停止当前命令，输出归因和下一步 owner route，而不是继续消耗 token 做低质量分析或实现。

日常恢复已有项目时，应先使用 `/sp.route` 作为轻量恢复入口。它只读取显式项目状态并输出 `speckit.route.v1` JSON，默认只建议下一步 `/sp.*`，不自动执行。需要 agent 在安全时衔接下一步时，使用 `/sp.route y`；只有 `continueAllowed: true` 且状态不是 `NEEDS_DECISION`、`HUMAN_DECISION`、`UNKNOWN_BLOCKER` 或 `REPEATED_FALLBACK` 时，命令模板才可以派发下一步。`autoExecute` 必须保持 `false`，脚本层仍只产 JSON；自动继续的判断属于命令模板和宿主 agent。发现 `fallback-log.md` 中同一失败签名重复、`fallback-loop-detected` 或 `REPEATED_FALLBACK` 时，必须停止重跑同一路线，进入 `/sp.clarify` 或 owner 决策路径。

阶段入口准入检查的默认路由如下：

- PRD、产品目标、项目定位、用户类型或 source authority 变化，回到 `/sp.prd` 或 `/sp.specify`。
- 需求、验收标准、业务规则、范围边界变化，回到 `/sp.specify`。
- 用户意图不清、需求冲突、风险接受、验证降级、范围取舍或不可逆决策，回到 `/sp.clarify`。
- 流程、状态、分支、权限、异常路径或无界面流程变化，回到 `/sp.flow`。
- 界面、屏幕、字段、动作、数据绑定或交互布局变化，回到 `/sp.ui`。
- workset、代码落点、运行命令、依赖面、实现准入或架构边界变化，回到 `/sp.plan`。
- 任务拆分、任务包字段、允许写入范围、必跑检查或并行边界变化，回到 `/sp.tasks`。
- 实现中发现上游事实缺失或冲突，停止当前实现，保留有效证据，按根因回到上游 owner 命令。

需求变更不能静默吸收到后续命令里。任何命令收到新的需求、改需求、删需求、换验收口径、换范围、换风险接受方式，都要先判断这次变化影响哪一层，再决定是否继续本命令。低风险措辞修改可以继续；会改变业务事实、流程、UI、计划、任务或代码边界的变化，必须先回到对应上游命令刷新事实源，再继续下游。

入口准入失败时，输出应固定包含：缺失或薄弱产物、`Blocker Type`、`Root Layer`、为什么当前命令不能继续、owner route、下一步 `/sp.*` 命令、写回目标。不要自动生成缺失的上游文档来“凑齐输入”；缺失产物应由对应 owner 命令创建或修复。

阻塞归因应使用一组稳定类型，而不是只写“blocked”：

- `INFO_GAP`：现有文档里有答案，只是没有读取、整理或回写。应先补读集、摘要和写回，不进入人工决策。
- `SOURCE_AUTHORITY_GAP`：PRD、用户原话、legacy source、外部权威资料或 source-of-truth 缺失、过期、不可访问。不能用测试替代源证据；应恢复来源，或通过 `/sp.specify` 明确 rebase 并废弃旧依赖。
- `UPSTREAM_DOC_GAP`：`spec.md`、flow、ui、bundle、plan、tasks 等上游文档不完整或互相矛盾。应回到对应 owner 命令修正，不直接进入代码。
- `CODE_TEST_ONLY`：业务和文档已经清楚，剩余证据只能在代码、测试、运行或人工验收阶段产生。应形成 `Mode: impl` handoff，不把文档阶段拖成伪阻塞。
- `EXECUTION_INFRA`：wrapper timeout、empty response、exit 143、CLI/宿主/网络/权限等执行链路问题。应隔离到 fallback-log 或执行问题记录；如果 gate 需要这条 live evidence，则不能 PASS，但它不是业务需求本身。
- `GENERIC_ARTIFACT`：生成物只是通用模板，没有具体业务行为、来源锚点、流程节点、UI/data/API 关系或验收证据。应回到 PRD、spec、flow、ui 或 plan 补真实内容，不能作为 PASS 证据。
- `SUBJECT_CONFUSION`：flow/UI 产物把 SP 命令、memory、preflight、gate、任务路由、方法论阶段或流程展示面板当成了目标业务系统内容。应停止当前生成，丢弃受影响草稿，回到 `/sp.flow` 或 `/sp.ui`，并在下一轮强制重读 `spec.md` 和相关 source docs；这不是 warning，而是方向错误。
- `BUSINESS_DECISION`：安全、租户隔离、删除恢复、审计告警、合规、风险接受、范围取舍、验证降级等需要人决定。应进入 `/sp.clarify` 决策包，模型只能推荐，不能代替选择。
- `ROUTING_STALE`：项目级 memory、feature memory、当前 workspace 或目标命令指向不一致。应先修 routing，再继续分析或执行。
- `SCOPE_CONFLICT`：需求天然互斥、目标冲突、验收标准矛盾或新功能混入当前范围。应先 `/sp.clarify`，再根据结果回 `/sp.specify`、`/sp.plan` 或 `/sp.gate`。

边界状态的判断要按这个阶梯执行：

1. 先检查 routing 和 memory 是否健康，避免在错误 feature 上继续消耗 token。
2. 收集当前证据，区分事实缺失、证据缺失、执行故障和真实业务冲突。
3. 给每个阻塞标注 `Blocker Type`、`Root Layer`、`Failure Signature` 和影响范围。
4. 拆到最小可解决单元：信息整理、源证据恢复、文档修复、实现 handoff、执行链路修复、验证补证或人工决策。
5. 选择 owner route：`/sp.prd`、`/sp.specify`、`/sp.clarify`、`/sp.flow`、`/sp.ui`、`/sp.plan`、`/sp.tasks`、`/sp.implement`、`/sp.analyze` 或 `/sp.gate`。
6. 对真实阻塞、风险和人工决策写入 `memory/open-items.md`；对执行链路问题写入 `fallback-log` 或失败现场报告，只有影响阶段准入时才提升为 open item。
7. 同一失败签名批量出现时，先归并为根因族，不生成几十个重复任务，也不批量重跑同一命令。
8. 如果必须人工介入，输出背景、影响、2-4 个选项、推荐方案和下一步命令，并路由到 `/sp.clarify` 或直接请求用户选择。
9. gate 只在当前证据闭环后判断；命令成功、文档生成、runner exit 0、进度百分比和模型总结都不是业务 PASS。

文档阶段和代码阶段要严格分开。文档阶段可以提交 source docs、memory、trace、open-items、analysis、gate、task packet 等成果，但不能把越界的 `src/`、`scripts/`、配置、schema、fixture 或测试资产混入文档收口。文档阶段发现必须补建代码或测试资产时，应把它写成下一阶段 `Mode: impl` 代码包交接：目标文件、原因、关联 anchor、允许写入范围、验证命令、写回目标和下一步路线都要可见。这样既不丢失发现的问题，也不会把未经授权的代码产物误当作文档阶段成果提交。

`memory/open-items.md` 是 blocker、risk、decision 和 close condition 的唯一稳定事实源。`analysis.md`、`gate.md`、`tasks.md`、fallback-log 和聊天记录只能是投影、证据或候选来源。发现真实阻塞散落在 analysis、plan、checklist、worklog 或旧 runner 输出中时，应该提升或引用到 open-items；已经解决、废弃或无效的阻塞要有证据关闭，而不是靠自然语言说“可收口”。

### 阻塞短原因与收尾质量门禁

任何可见的非就绪状态都必须带短原因。状态本身只告诉后续模型“停在哪里”，短原因告诉人和模型“为什么停”。因此 `BLOCKED`、`NEEDS_DECISION`、`NEEDS_PLAN`、`NEEDS_TASKS`、`NEEDS_CONTEXT`、`WAITING_FOR_BATCH_REVIEW`、`DRAFT_ONLY`、`FAIL`、`CONDITIONAL`、`STALE`、`REJECTED`、`DEFERRED_WITH_OWNER` 以及 flow/ui 图、右侧确认栏、Stage Readiness、task packet、open item、analysis/gate report 中的等价非就绪项，都必须在状态后直接附上 `Status Reason`。

`Status Reason` 是 10-30 个中文字符的可读短句，默认写中文；英文项目可以写等价长度的短英文短语，按显示宽度和可读性估算，不要求硬套中文字符计数，但不能只写 `blocked`、`missing info`、`待确认`、`有问题` 这类空泛词。短原因应说明根因和影响，必要时再配合长说明。例如：

```yaml
Status: BLOCKED
Status Reason: 缺少支付回调格式，无法定异常分支
Blocker Type: HUMAN_INPUT_REQUIRED
Owner Route: /sp.clarify
```

紧凑展示时可以写成：

```text
BLOCKED — 缺少支付回调格式，无法定异常分支
```

短原因不是完整报告，完整报告仍要保留 `Blocker Type`、`Root Layer`、`Failure Signature`、owner route、验证路径、写回目标和背景说明。短原因的用途是让确认会、后续模型和人工 reviewer 在列表、流程图、右侧确认栏、任务表或 gate 报告里一眼知道阻塞性质。

当前已落地的核心交付链路命令（`/sp.flow`、`/sp.ui`、`/sp.plan`、`/sp.tasks`、`/sp.implement`、`/sp.analyze`、`/sp.gate`）收尾前必须执行 `Finish Quality Gate`。它不是新命令，而是命令尾部的自检与自修复循环。其他 SP 命令遵循同一原则，并在各自模板中按命令职责逐步落地。推荐字段如下：

```yaml
Finish Quality Gate:
  model_fixable_issues: none | present
  human_blockers: none | present
  self_fix_rounds: 0-3
  quality_result: QUALITY_PASSED | CONTINUE_FIXING | HUMAN_BLOCKED | EXHAUSTED_BLOCKED
  evidence: <本轮检查依据、命令结果、文件差异或人工决策>
```

判定规则固定如下：

- `QUALITY_PASSED`：当前命令责任范围内的模型可修复质量问题已经清空，剩余事项要么不存在，要么是已记录且不阻断下一阶段的低风险 warning。它只表示收尾质量门禁通过，不替代 `/sp.analyze` 或 `/sp.gate` 的业务 `PASS` verdict。
- `CONTINUE_FIXING`：仍有模型可修复问题。它是命令内部循环控制状态，不得作为命令最终输出状态；此时不得汇报“完成”，必须继续修改、补文档、补证据或重跑检查。
- `HUMAN_BLOCKED`：剩余问题来自人工输入、业务决策、风险接受、外部凭证、不可访问 source、合规/权限/数据选择、不可逆操作授权等模型不能安全决定的事项。必须输出短 `Status Reason`、背景、影响、2-4 个选项、推荐项和下一步 `/sp.*` 路线。
- `EXHAUSTED_BLOCKED`：同一问题经过最多 3 轮有证据的自修复仍未消除，或继续修复需要扩大范围到未授权层级。必须保留失败现场、失败签名、已尝试路线、为什么继续自动修复不安全，以及 owner route。

`self_fix_rounds` 初始为 `0`，表示尚未对当前诊断问题执行自修复；每完成一轮有证据的自修复后递增。同一诊断问题连续 3 轮仍未消除，或任意一轮需要扩大到未授权范围时，才触发 `EXHAUSTED_BLOCKED`。不同问题不混算轮次，已关闭的问题不再占用后续问题的修复次数。

模型可修复问题包括：文档缺字段、flow 节点缺端口契约、UI 元素未绑定 flow/action/source、确认页缺右侧反馈栏、Stage Readiness 缺 `Status Reason`、任务包字段不完整、analysis/gate 报告缺证据、lint/test/build/typecheck 失败、可由当前上下文定位的格式/链接/引用错误、明显未按已确认需求实现的代码或文档缺口。

人工阻塞包括：业务规则冲突但多种方案都合理、PRD/source authority 缺失、外部 API 文档或密钥不可用、风险接受或验证降级需要授权、合规/安全/权限/租户边界需要人选、删除/迁移/发布等不可逆动作需要批准、reviewer 组织方式或确认范围需要用户决定。

自修复不能造假。不得用禁用检查、删除测试、`@ts-ignore`、降低验收或隐藏失败来制造通过；不得把失败项改写成 warning 来绕过硬门禁；不得因为“已经改了很多”就把 `CONTINUE_FIXING` 改成 `QUALITY_PASSED`。如果问题需要人工信息或决策，它不是质量问题；应归入 `human_blockers` 并输出 `HUMAN_BLOCKED`。如果问题在当前命令职责内可修复，不能停下来汇报，应继续修复，直到 `QUALITY_PASSED`、`HUMAN_BLOCKED` 或 `EXHAUSTED_BLOCKED`。

### 8.2 有界证据循环和 No Self-Pass

SP 不应依赖“无限循环”来防止虚报。无限循环会增加 token 消耗，放大错误方向，并让模型把重复动作误判成进展。SP 采用的是有界证据循环：每轮只处理一个最小可解决单元，必须产生新的证据或明确的下一步路由；没有新证据就停止自动推进。

每个阶段的循环都应遵守四条硬规则：

- 先做阶段入口准入检查，确认上游 `Stage Readiness`、routing、source、memory 和 open-items 足以支撑当前命令。
- 每一轮只处理一个 blocker、一个 workset、一个失败签名、一个缺口族，或一个最小代码任务。
- 每一轮结束必须写出状态变化、证据、失败签名和下一步 owner route。
- 同一 `Failure Signature` 或 `blocker-signature` 在同一层连续出现两次，且没有新增证据、没有缩小问题、没有改变 owner route，就停止循环，输出 `BLOCKED` 或 `NEEDS_DECISION`。

No Self-Pass 是强制规则。模型不能用“已经完成”“看起来可以”“文档已生成”“命令执行成功”“runner exit 0”“进度 100%”来替代证据。是否完成必须由当前证据证明：

- 代码阶段需要测试、lint、typecheck、build、运行检查、人工验收或明确不可运行原因。
- 文档阶段需要 source authority、Stage Readiness、trace/data linkage、open-items、visual/human review 状态和 gate/analyze 证据。
- 阻塞关闭需要 `memory/open-items.md` 的 `Close Evidence`，例如当前验证、可追踪的文档/代码修改、回滚或降级证据、明确的人类接受记录。

开放项的关闭要比创建更严格。`Risk`、`Blocker`、`High` 严重级别项，以及影响范围、验收、发布、回滚、安全、隐私、权限、认证、审计、合规、数据、迁移、租户隔离、RBAC、支付、计费、生产环境、真实资金、真实数据、实现信心、不可逆操作、owner/人工决策的项，如果被标为 `Closed`、`Resolved`、`Verified`、`Accepted`、`Deferred`、`Downgraded` 或 `Invalid`，必须有 `Close Evidence`。没有关闭证据时，应继续保持 open/monitoring，或由 `/sp.analyze`、`/sp.gate` 输出阻塞；不能把状态改成 Closed 来制造收口。

循环记录要轻，不要变成第二套项目管理系统。推荐只记录：

- 当前 workset 或 anchor。
- 本轮处理的最小问题。
- 当前证据或新增证据。
- `Failure Signature` / `blocker-signature`。
- 下一步 owner route。
- 是否需要 `/sp.clarify` 或人工决策。

`fallback-log` 只用于防止跨命令震荡；稳定 blocker、risk、decision 和关闭条件仍然进入 `memory/open-items.md`。如果 fallback-log 中的同一失败签名已经影响阶段准入，就应提升或引用到 open-items，而不是继续在日志里重复堆记录。已经提升的记录只保留一行引用，避免 fallback-log 变成第二套 blocker 台账。

## 上下文管理模型

SP 的上下文管理可以分成四个动作：定位、选择、压缩、沉淀。

### 1. 定位

先判断当前工作属于哪个层级：

- 项目级：原则、架构、全局约束、安装机制、跨 feature 影响。
- Feature 级：某个功能的业务规则、流程、界面、数据、接口、任务。
- Workset 级：一组可共同完成的相关任务。
- 文件级：具体实现、测试、配置或文档修改。

定位错误会导致上下文错误。比如本来是接口兼容性问题，却只读了界面文档；本来是业务规则问题，却直接改代码。

### 2. 选择

根据定位选择读集。读集应覆盖“当前工作必须知道的东西”，而不是覆盖“仓库里所有可能相关的东西”。

选择读集时应优先问：

- 这个任务会影响哪些用户路径？
- 会经过哪些界面、接口、数据表、权限规则？
- 会修改哪些文件，依赖哪些文件？
- 有哪些测试能证明它正确？
- 哪些旧结论或 memory 可能影响判断？
- 哪些信息如果缺失，会导致模型只能猜？

如果这些问题回答不上来，应先补上下文，而不是直接执行。

### 2.1 查询优先，关系优先

上下文选择应先从“关系入口”进入，而不是先全仓搜索。

推荐顺序是：

1. 先读项目级 `memory/index.md`、`active-context.md` 或 `feature-map.md`，确认当前 feature、阶段和最小读集。
2. 再读 feature 级 `memory/index.md`、`trace-index.md`、`worksets.md`、`open-items.md`，找到 workset、稳定锚点、未决风险和直接相邻对象。
3. 只展开一层直接关系：相关 flow、screen、API、table、permission、acceptance、test 和目标代码文件。这里的“一层”指直接引用该 API 的前端文件、承载该接口的数据表、对应的验收路径这类直接邻居，不是顺着调用链继续多跳扫描。
4. 如果证据显示一层关系不足，再继续扩展；不要默认多跳扫描，也不要把历史材料全部塞进上下文。

这条规则借鉴的是 CodeGraph 这类工具的“先查索引、再沿关系扩上下文”思想，但 SP 的默认实现仍是 Markdown memory、trace、open-items、source docs 和测试。外部图谱工具可以辅助定位，不能替代源文档，也不能成为必需依赖。

检索排序也要明确。实现定位时，优先读取 source docs、目标源码、同 workset、同目录文件、直接依赖、直接调用方或被调用方；测试文件不硬排除，但默认降权。进入 TDD、bug 复现、验收验证、回归检查或解释失败测试时，再提高 tests 权重。这样既减少测试文件对实现定位的干扰，也不会漏掉测试提供的业务证据。

### 2.2 按项目规模调整执行强度

同一套方法论不能不分项目大小一刀切。SP 的优先级是先提高稳定性和准确度，再提高效率；规则应帮助模型少猜、少跑偏，而不是把每个小任务都变成填表流程。

推荐按项目规模调整执行强度：

| 项目规模 | 执行方式 | 目的 | 约束 |
|---|---|---|---|
| 小项目 | 轻量执行 | 快速确认目标、相关文件、相关测试，避免流程成本超过收益 | 不强制补全所有 trace、状态位和影响半径证据；低风险改动可以只保留简短验证记录；即使触及敏感节点，只要是局部低风险改动，也可以用测试或检查结果替代 `Impact-Radius Evidence` |
| 中型项目 | 标准执行 | 通过 memory、workset、trace 和 open-items 降低重复读取和漏读 | 关键 API、UI、数据、权限、验收和测试路径应有稳定锚点和直接相邻证据 |
| 超大项目 | 强约束执行 | 防止上下文过大、注意力分散、跨模块误改 | 必须先拆 workset 或子 feature；直接相邻对象过多时，不继续扩上下文，而是上移到计划层重新拆分 |

小项目的目标是“不拖慢”；中型项目的目标是“标准化收益最大”；超大项目的目标是“先控边界，再谈执行”。如果一个部分明显大到模型无法在当前窗口内稳定覆盖，应把它当作独立子范围处理，而不是继续塞更多上下文。

规模判断只作为启发式信号，不要求模型先做全仓精确计数。可以按以下粗略边界判断：小项目通常是 1-5 个文件、单模块、没有跨权限/数据/发布边界；中型项目通常涉及 6-20 个文件、多个 workset 或一条清晰端到端链路；超大项目通常超过 20 个文件、跨独立业务目标、独立发布节奏、数据迁移、权限模型或外部系统。只要出现独立发布、不可逆迁移、合规/安全风险或模型窗口无法稳定覆盖，即使文件数不多，也应按复杂范围处理并请求拆分确认。

### 2.3 三条借鉴规则的执行影响

SP 借鉴 CodeGraph 的是控制思想，不是工具本体。不要把 SQLite、Tree-sitter、MCP、watcher 或图数据库纳入默认安装链；这些工具可用时只能辅助定位，不可用时必须回退到 memory、源文档、文本搜索和测试。

| 借鉴规则 | Gemini 意见 | Codex 意见 | 对复杂度的影响 | 对效率的影响 | 对稳定性和准确性的影响 |
|---|---|---|---|---|---|
| 查询优先，关系优先 | 支持先从索引和关系入口进入，避免全仓盲扫 | 同意，并把它列为第一优先级；入口错会导致后续全部读集错 | 小项目只确认 feature、任务和目标文件；超大项目必须先走 memory、trace、workset，不直接全仓搜索 | 减少重复扫描和无关阅读 | 降低选错 feature、漏读接口、漏读验收路径的风险 |
| 影响半径先行 | 支持修改前先看直接影响面，尤其是接口、数据、权限和验收 | 同意，但触发范围要收窄；只在 API、UI、table、permission、event、acceptance、关键测试等高影响改动前强制 | 小修小补不强制；复杂改动只看直接相邻对象，过大则拆分 | 避免返工，但不把每次改动都变成重审 | 提前发现破坏性副作用、遗漏测试和 trace 断链 |
| 上下文硬预算 | 支持给上下文设上限，防止模型被无关信息淹没 | 同意，但不能机械少读；原则是“最小充分、有证据扩一层、仍不够就拆分或上移” | 小项目轻用；超大项目强制 workset、子 feature 或子项目化 | 把 token 用在相关材料上 | 防止窗口过载、注意力稀释和局部硬冲 |

这三条规则的共同边界是：它们服务于稳定和准确，不服务于形式完整。能用一行证据说明清楚的，不写长报告；能在当前层解决的，不上升成复杂流程；当前层无法稳定处理的，才向上兜底或拆分。

### 3. 压缩

上下文不能无限增长。稳定事实应被压缩成可复用的摘要，放入合适的 memory、spec、plan、tasks 或交付文档。

压缩时要保留可追踪性：结论是什么，依据在哪里，适用范围是什么，哪些问题仍未决。

坏的压缩是只写“已确认”“按原方案”。好的压缩应能让下一次模型不读完整历史，也知道该从哪里继续。

### 4. 沉淀

临时聊天不是可靠记忆。凡是后续会复用的信息，都应沉淀到文档系统。

需要沉淀的信息包括：

- 已确认的业务规则。
- 已选择或已放弃的方案及原因。
- 接口、数据、权限、界面之间的关键关系。
- 验证方式和验收标准。
- 失败原因、修复结论、仍需观察的风险。

沉淀的目的不是写更多文档，而是减少未来重复读取、重复解释和重复犯错。

## 记忆系统与防遗忘

SP 引入 memory，不是为了替代规格文档，也不是为了让模型“相信一份摘要”。它的核心作用是给模型提供可靠入口：下一次进入项目时，先知道该看哪里、当前风险在哪里、哪些事实已经稳定、哪些问题仍未解决。

大模型容易遗忘，不只是因为上下文窗口有限，还因为软件工程里的信息分散在不同层：业务目标在 spec，流程在 flows，界面在 ui，接口和表在 delivery，任务在 tasks，风险在 analysis，代码又在另一套目录里。如果没有记忆层，模型每次都要重新扫描，既浪费 token，也容易漏掉某个关键约束。

SP 的 memory 应承担四类职责。

### 1. 项目级记忆：先找到入口

项目级记忆回答“现在从哪里进项目”。

它应记录项目规则、当前阶段、活跃 feature、最小读集、跨 feature 领域对象、高风险热点。它的价值不是保存全部细节，而是避免模型一上来全仓搜索，或者把错误分支、错误目录、错误 feature 当成当前目标。

项目级记忆适合保存：

- 项目宪法和阶段边界。
- 当前活跃 feature 和推荐读取顺序。
- feature 列表、阶段、最新 gate 和 analysis 状态。
- 跨 feature 共享对象、共享规则、领域归属。
- 反复出错、反复漂移、影响面大的热点区域。

这层记忆解决的是“入口错误”和“重复找路”的问题。

### 2. Feature 级记忆：保存稳定骨架

Feature 级记忆回答“这个功能的稳定事实是什么”。

它不应该复制所有文档，而应压缩出后续编码和复核最容易忘记的主干：角色、状态、对象、流程锚点、页面锚点、接口锚点、表锚点、验收锚点、未决问题和风险。

Feature 级记忆适合保存：

- stable context：已经稳定的角色、对象、阶段、状态、关键约束。
- trace index：从流程到界面、接口、数据表、验收标准的追踪链。
- open items：仍未解决的问题、风险、影响范围和回退建议。它默认可以为空，不能为了提醒模型而预置假 `OPEN01` 或 `RISK01`。
- feature index：当前 feature 内部的路由表和推荐读序。

这层记忆解决的是“做着做着忘了业务主干”的问题。

`memory/open-items.md` 的边界要非常清楚：它只记录真实 feature 证据支撑的未决事项。scope、acceptance、permissions、data、API、UI、events、rollback、release、security、migration、external dependencies、test evidence 这些是提醒维度，应该写在方法论和命令检查规则里；只有检查后发现真实缺口，才进入 open-items 表。

### 3. Workset 级记忆：缩小当前工作面

Workset 级记忆回答“这次只做哪一小块”。

同一个 feature 可能同时包含主流程、审批、查询、权限、事件、副作用、测试等多个方向。直接把全部上下文塞给模型，会让注意力分散。Workset 的作用是把 feature 再切成可执行、可验证、可回看的局部工作面。

一个好的 workset 应说明：

- 当前工作目标是什么。
- 需要读取哪些稳定事实和追踪链。
- 相关页面、接口、表、验收项有哪些。
- 不应该顺手修改哪些无关区域。
- 完成后用什么证据验证。

这层记忆解决的是“上下文太大导致执行发散”的问题。

### 4. 复杂部分项目化：把过大的分支单独成树

复杂 feature 不应该靠一次性塞大上下文解决。如果一个部分明显超过当前 feature 的 workset 承载能力，应提前提出升级建议，把它作为独立子 feature、子项目或至少独立 workset 组来讨论。

这不是为了多写文档，而是为了避免模型在过大的上下文里注意力分散。比如一个项目可以粗分为 A、B、C、D、E 五个部分，其中 B 同时涉及多角色、多页面、多接口、多表、多外部系统和高风险验收，那么 B 不应继续作为普通 workset 混在总 feature 里执行，而应被当作一个可单独规划、单独验收、单独回写的子范围。

触发信号包括：

- 一个部分需要多个独立用户路径或多个角色协作才能讲清。
- 一个 workset 同时跨 UI、API、数据、权限、事件、副作用和迁移，并且无法用一个小读集覆盖。
- 关键问题需要多轮澄清，或 open items 长期阻塞后续任务。
- 验收标准、回滚路径、外部依赖或数据影响无法在当前 feature 内低成本确认。
- 实现预计会跨大量模块或文件，导致单次模型上下文无法稳定覆盖。

为了减少主观判断，建议用可观察信号做复杂度预警。拆分或升级不应靠“感觉很难”，而应基于明确的范围证据。

硬触发信号出现任意一项，就应在 `sp.plan` 阶段讨论拆分或升级：

- 需要独立外部系统、独立发布节奏、独立权限模型或独立数据迁移。
- 存在安全、合规、回滚、数据破坏或不可逆迁移风险，且该风险无法在当前 workset 内闭合。
- open items 中存在 2 个以上仍会阻断验收、发布、回滚或安全判断的 `Blocker` 或高影响 `Risk`。

普通预警信号至少满足 3 项，才需要讨论拆分或升级。这里的数字是辅助判断，不是要求模型做全仓精确计数；如果只能粗略判断，应说明依据和不确定性，不要为了凑数字扩大读取范围：

- 独立用户角色不少于 5 个，或独立用户路径不少于 6 条。
- 同时涉及 UI、API、数据表、权限、事件/副作用、迁移、外部系统中的 5 类以上。
- 追踪锚点数量达到 12 个以上。
- 一个 workset 需要读取 12 个以上核心文档才能安全执行。
- 实现预计跨 15 个以上主要文件或 4 个以上模块边界。

为了避免复杂度边界来回抖动，预警阈值应有缓冲。首次接近阈值时，优先记录为“拆分观察带”：提出备选拆分方案、说明继续保持当前粒度的风险，但不自动拆。只有信号继续增强、同一范围因复杂度连续失败，或用户确认拆分后，才真正升级为独立 workset 组、子 feature 或子项目。已经确认升级的范围，也不应因为后续某个数字略微下降就自动合并；合并同样需要说明影响并得到确认。

拆分观察带不是硬门禁。它的作用是提醒、记录和提前准备备选路线，不应在 headless 或非交互运行中单独阻断流程。只有出现已经确认的拆分争议、硬触发信号、连续失败、不可逆风险、风险接受、合规/数据决策或用户明确要求拆分判断时，才升级为 `NEEDS_DECISION` 或 `BLOCKED`。

headless 下不能因为观察带就硬撑超大任务。正确兜底是收缩单次执行范围：在不改变 feature 目录结构、不自动创建子项目的前提下，把当前 workset 内部拆成顺序小任务队列，每次只处理一个可验证的局部目标，并记录候选拆分、风险和回看点。如果硬触发信号已经成立，或收缩后仍连续失败，就 fail fast，输出 `NEEDS_DECISION` 或 `BLOCKED`，而不是继续扩大上下文。

这些信号只触发“提出拆分建议”，不自动拆分。拆分属于宏观路线选择，应在 `sp.plan` 阶段由模型把背景、影响、可选粒度和推荐方案说清楚，再交给用户确认。没有用户确认，不应擅自把一个 feature 改造成多个子 feature 或子项目。

如果 scope 已经清楚，复杂度主要来自技术实现细节，而不是业务边界、交付边界、外部依赖、权限数据模型或验收闭环，就不应把它升级为子 feature 或子项目。此时应先拆小任务、补测试、分阶段实现。

文件多不等于必须拆分。围绕单一业务实体或单一用户目标的高内聚全栈功能，即使同时涉及 UI、API、数据表、权限和测试，也应优先保留在同一 feature 的 workset 组内执行。只有当它出现跨业务域、外部系统、独立发布节奏、复杂权限/数据生命周期、不可逆迁移或无法闭合的验收风险时，才升级为子 feature 或子项目。

升级粒度按影响范围选择：

| 粒度 | 适用情况 | 最小契约 |
|---|---|---|
| 独立 workset 组 | 仍属于同一 feature 和同一发布目标，但单个 workset 太大 | 目标、边界、验收、回写路径 |
| 子 feature | 有独立用户目标、验收闭环或计划任务，需要单独追踪 | 输入约束、输出、影响范围、不变量、验收、回写路径 |
| 子项目 | 有独立生命周期、外部系统、发布节奏、权限/数据模型或仓库级影响 | 父子契约全量字段、集成检查、回滚策略、人工决策点 |

升级为子范围前，应写清父子契约：

- 父范围给子范围什么输入、约束和目标。
- 子范围交付什么输出、接口、数据、事件或文档。
- 子范围允许影响哪些区域，不允许顺手改哪些区域。
- 父范围如何验收子范围，集成时检查哪些不变量。
- 子范围完成后哪些结论要回写到父 feature 的 trace、memory 和 plan。

也要避免过度拆分。只有当复杂度已经影响理解、验证或执行稳定性时，才升级为子范围；普通的文件数量多、文档长，不等于必须拆成子项目。

### 5. 热点与未决项：让风险浮在水面

模型最容易出错的地方，往往不是完全未知的地方，而是“看起来知道但其实不稳定”的地方。

SP 应把未决问题、反复变动区域、高风险集成点、容易回归的路径显式放进 open items 和 hotspots，而不是藏在聊天记录或长文档段落里。

这样做有三个作用：

- 后续阶段不会把未决问题误当成已确认事实。
- 编码前能优先读取高风险路径，避免局部实现破坏整体设计。
- analysis 和 gate 可以检查风险是否被关闭，而不是只看文件是否存在。

这层记忆解决的是“风险被遗忘”的问题。

`open-items.md` 不应该把所有小问题都变成重型表格。低影响的 `Question` 或 `Todo` 可以保持轻量，只记录类型、严重性、描述和状态；一旦它影响范围、验收、发布、回滚、安全或后续实现信心，就必须补全 owner、影响范围、回退或降级方案、关闭条件、刷新时间和 trace/source 回链。

`Risk`、`Blocker` 和 `High` 严重性事项默认属于高影响项，不能只靠一句提醒保存。它们必须能追到 `memory/trace-index.md` 或 source docs，否则后续模型会知道“有风险”，但不知道风险影响哪里、谁负责、何时可以关闭。

### 记忆不是事实本身

SP 对 memory 的基本态度是：memory 是路由和摘要，不是最高事实源。

memory 可以告诉模型先读哪里、哪些内容可能重要、哪些地方可能过期；但当 memory 与 spec、flows、ui、delivery、tasks、代码或测试冲突时，必须回到源文档和当前文件验证。发现 memory 过期时，应标记并刷新，而不是继续沿用。

这条原则很重要。否则 memory 会从“降低 token 的入口”变成“制造幻觉的旧缓存”。

语义总结的权威性永远低于静态事实。`stable-context.md`、`trace-index.md`、阶段摘要或模型生成的解释，只能帮助路由和压缩上下文；它们不能覆盖当前 `spec.md`、`plan.md`、`tasks.md`、flow/ui/source docs、代码、测试和人工决策。如果源文件、规格或测试发生变化，而对应 memory、trace 或摘要没有同步，`sp.analyze` 和 `sp.gate` 应把它视为 stale memory 风险，而不是继续相信旧摘要。

memory 回写还要防止“脏反馈”。模型不能为了让检查通过而把 memory、trace、open item 或状态位改成更乐观的说法。关闭 `@t0`、`@r0`、`OPEN`、`RISK` 或刷新 trace 时，必须有当前源文档、当前代码、当前测试/检查结果、人工决策或明确不可自动验证说明作为依据。证据不足时，应保持 open、标记 stale 或写明下一步，而不是把不稳定事实沉淀成记忆。

### 编码阶段的防遗忘规则

SP 的最终目标包含自动化开发，因此 memory 不能只服务文档阶段，也要服务编码阶段。

编码前，模型不应只读取任务文件。它还应根据 workset 和 trace 找到与当前改动有关的稳定事实：业务规则、流程节点、页面字段、接口契约、数据表、权限、验收标准、相关测试和已知风险。

编码中，模型应保持工作面小，不把无关 workset 顺手改掉。遇到源文档、memory、代码现状冲突时，应停下来识别冲突，而不是靠猜测补齐。

当改动触及 API、UI、table、permission、event、acceptance 或关键测试时，应先做一次影响半径检查。检查对象只要求覆盖直接相邻关系：相关 flow、screen、API/contract、table/data、permission、acceptance、test、open item 和风险锚点。除非证据表明问题跨域扩散，不应把影响半径检查升级成全仓分析。

高影响改动还应尽量前馈处理，也就是在 `sp.plan` 或 `sp.tasks` 阶段提前预测可能扰动的范围。公共 API/schema、权限规则、数据迁移、核心 UI 字段、事件/副作用、外部依赖、关键 acceptance 或关键测试发生变化时，任务里应提前指出候选受影响对象和验证路径。这样不是要求提前读完整仓库，而是避免等实现后才发现任务本身漏掉了直接相邻的风险。

影响半径检查的强制触发条件要具体。只要改动命中 `trace-index.md` 已注册的主坐标，或改动公共 API/schema、权限规则、数据迁移、事件/副作用、跨文件导出符号、核心 acceptance 或核心测试，就必须留下证据。只修改私有函数内部实现、拼写、格式、注释、局部命名，且不改变行为和公共契约时，可以免写。

执行前要先区分“结构性变更”和“装饰性变更”。结构性变更包括契约、导出、输入输出、状态、副作用、权限、数据持久化、事件、验收路径、测试语义或跨 workset 关系变化，必须触发影响半径检查。装饰性变更包括格式、注释、拼写、局部命名或不改变行为的内部整理，可以只保留简短验证证据。这个判断不能靠感觉：如果无法确认是否改变行为，应按结构性变更处理。

风险信号只能基于当前读集、`trace-index.md`、source docs、任务证据和实际变更文件推断。不要为了判断“影响邻居数量”而让模型实时全仓扫描或多跳寻路。若 trace 中某个 API、TABLE、FLOW、UI、ACC 被多个对象依赖，或变更文件找不到 trace/source 回链，应标记高风险或 stale trace，而不是扩大到无边界分析。

影响半径检查要分成执行前和执行后两种记录，避免把计划当成结果。

执行前留下 `Impact-Radius Plan`：说明预计影响哪些稳定锚点、准备读取哪些直接相邻文件或文档、准备使用什么测试或验收路径。它是执行前的安全带，不是长篇报告。

执行后留下 `Impact-Radius Evidence`：说明实际检查了什么、实际影响了什么、用什么验证、是否还有未决项。它不能提前写成结论，也不能用“计划要验证”冒充“已经验证”。如果相关测试、检查或人工验证失败，Evidence 必须记录失败输出、影响范围和下一步处理，不能写成 PASS 或“已验证”。

`Impact-Radius Plan` 和 `Impact-Radius Evidence` 都不是链式推理记录，也不是要求模型公开完整思考过程。它们只记录工程证据：看什么、影响什么、用什么验证、是否还有未决项。低风险的拼写、格式、局部重命名或无行为变化修改，不需要强制写这两条记录。

记录落点要固定，避免模型到处写。默认把 `Impact-Radius Plan` 放在本次执行输出或 `tasks.md` 对应任务的执行备注里；把 `Impact-Radius Evidence` 放在同一个任务的验证备注、阶段输出或 gate/analyze 报告里。只有当检查结果改变了稳定事实、风险或未决项时，才回写 `memory/open-items.md`、`memory/trace-index.md` 或对应的 source-of-truth 文档。不要把这两条记录写成生产代码注释，也不要为了普通影响半径检查频繁改写主 memory 文件。

推荐模板控制在 3 行以内：

```text
Impact-Radius Plan: anchors=<FEAT01.WS02.API02, ACC04>; read=<plan.md, trace-index.md, api.ts, api.test.ts>
Impact-Radius Evidence: checked=<api.ts, api.test.ts>; verification=<pytest api.test.ts::test_approve>
open-items=<none|OPEN01|RISK01>; decision=<safe|needs follow-up|blocked>
```

`Impact-Radius Plan` 和 `Impact-Radius Evidence` 不要求拆成两个物理 turn。模型可以在同一次执行中先写下计划，再改动，再在验证后补 evidence；关键是不能把事后补写的计划伪装成事前判断，也不能用计划替代实际验证结果。Evidence 的写入时机必须晚于实际检查、测试、静态核对或人工验证记录；没有当前验证结果时，只能记录“待验证”和下一步，不能关闭任务或风险。

如果同一次执行里既要记录 plan 又要修改文件，顺序必须明确：先把 plan 写入本次输出或任务备注，再开始相关修改；修改完成并运行检查后，才能写 evidence。不要并发发起“写 plan”和“改目标文件”的工具调用，避免实际顺序变成先改后计划。

如果项目安装了 CodeGraph 或类似代码图谱工具，可以用它帮助发现候选相邻文件；如果工具不可用、结果过期或输出不一致，应立即回退到 memory、source docs、文本搜索和测试证据。不能因为图谱工具失败而中断主流程。

编码后，模型应把新产生的稳定事实写回对应位置：如果业务规则变了，更新规格和 stable context；如果接口、表、界面锚点变了，更新 trace；如果发现风险或遗留问题，更新 open items 或 hotspots；如果验证方式变了，更新任务或验收路径。

这形成一个防遗忘闭环：

1. 先用 memory 找到最小但充分的上下文。
2. 再用源文档和当前文件确认事实。
3. 在小 workset 内完成实现或文档修改。
4. 用测试、检查或验收路径验证。
5. 把新的稳定事实、风险和验证证据沉淀回文档系统。

如果只做前四步，不做第五步，下一次模型仍然会忘；如果只做第五步，不做第二步，memory 可能会沉淀错误事实。

## 编码关联方法

这里的“编码”有两层意思。

第一层是项目内容的结构化编号，也就是给 feature、workset、流程、界面、接口、数据表、验收路径、风险和检查状态建立稳定坐标。第二层才是实现代码怎么承接这些坐标，让代码、测试和文档可以互相追踪。

SP 应优先加强第一层。因为模型最容易出错的地方不是“不知道某段文字存在”，而是“不知道它属于哪里、和谁有关、当前是否已经检查过”。结构化编码就是为了解决这个问题。

### 1. 编码是项目记忆的坐标系

编码体系应该是开放的，但不能是随意的。

开放，指的是后续可以继续增加新的编码类型，比如 `EVENT`、`PERM`、`MSG`、`JOB`，不用推翻原有体系。不随意，指的是框架层必须先固定基础规则，feature 只能在规则内扩展，不能各写各的。

每个编码都要能回答三个问题：它是什么类型，它属于哪个上级范围，它和哪些其他内容有关。

推荐原则：

- 使用字母加数字或字母加语义短码，例如 `UI03`、`API02`、`ACC01`、`WS-PRIMARY-JOURNEY`。字母说明类型，数字或短码说明顺序或业务含义。
- 保留顺序性。`UI01`、`UI02`、`UI03` 能让人和模型快速判断阅读顺序、缺口和位置。
- 保留层级性。`FEAT01.WS02.UI03` 比单独的 `UI03` 更清楚，因为它说明这个界面属于哪个 feature 和哪个 workset。
- 支持多编码。一个内容可以同时带 `UI03`、`API02`、`TABLE01`、`ACC01`，像多标签一样用于搜索和追踪。
- 区分稳定身份和可变状态。`UI03` 这种身份编码不应频繁改；`t0`、`r0` 这种短状态值可以变；实际写入文档时建议加 `@`，形成 `@t0`、`@r0` 这类可搜索状态标签。
- 保证唯一性。一个主坐标在一个项目内只能指向一个对象；对象改名可以，主坐标不要随便复用。
- 保证可搜索性。主坐标和副标签应使用 grep 友好的 ASCII 字符，避免空格、中文、斜杠和容易被 shell 转义的符号。

这样做的目的不是让文档变复杂，而是让模型少猜。模型只要搜索同一个编码，就能找到相关规格、流程、界面、接口、表、测试和验收证据。

### 2. 框架规则要先固化，feature 只能扩展

编码体系不能让每个 feature 自己发明一套语义。SP 应维护一张框架级编码规则表，说明哪些前缀、状态维度和状态值是全局固定的，哪些允许 feature 扩展。

基础编码类型表：

| 类型 | 含义 | 示例 | 是否框架固定 | 扩展规则 |
| --- | --- | --- | --- | --- |
| `FEAT` | feature 范围 | `FEAT01` | 是 | 只能增加编号，不能改含义 |
| `WS` | workset 范围 | `WS02` | 是 | 只能在 feature 内增加 |
| `FLOW` | 业务流程主轴或流程链 | `FLOW03` | 是 | 可按业务增加；优先作为 UI/API/TABLE/CODE/ACC 的关系主轴 |
| `UI` | 界面或交互锚点 | `UI03` | 是 | 可按界面增加 |
| `API` | 接口或服务契约 | `API02` | 是 | 可按接口增加 |
| `TABLE` | 表、集合或核心数据结构 | `TABLE01` | 是 | 可按数据对象增加 |
| `ACC` | 验收路径或验收标准 | `ACC04` | 是 | 可按验收增加 |
| `OPEN` | 未决事项、问题或待办锚点 | `OPEN01` | 是 | 完整记录进入 `memory/open-items.md` |
| `RISK` | 风险锚点 | `RISK02` | 是 | 只做定位；完整风险记录进入 `memory/open-items.md` |
| `EVENT` | 事件、消息或副作用 | `EVENT01` | 可选保留 | 只有项目确实需要事件或副作用追踪时启用 |
| `JOB` | 定时任务、批处理或后台作业 | `JOB01` | 可选保留 | 只有项目确实存在后台作业时启用 |
| `PERM` | 权限规则 | `PERM01` | 可选保留 | 只有权限规则需要独立追踪时启用 |

状态维度表：

| 字母位 | 默认含义 | 示例 | 是否允许重定义 |
| --- | --- | --- | --- |
| `c` | 检查状态 | `c0`、`c1`、`c2` | 不允许 |
| `i` | 实现状态 | `i0`、`i1`、`i2` | 不允许 |
| `t` | 测试或验证状态 | `t0`、`t1`、`t2` | 不允许 |
| `r` | 风险状态 | `r0`、`r1`、`r2` | 不允许 |
| `s` | 同步状态 | `s0`、`s1`、`s2` | 不允许 |
| 其他字母 | 项目扩展状态维度 | `p0`、`q1` | 允许，但必须登记 |

默认状态值表：

| 数字位 | 默认含义 | 说明 |
| --- | --- | --- |
| `0` | 未完成、未开始、未通过或未同步 | 表示需要继续处理 |
| `1` | 已完成、已通过或已同步 | 表示当前可接受 |
| `2` | 部分完成、需要复核、失败后待处理或有条件接受 | 表示不能简单视为完成 |
| `3-4` | 保留扩展 | 使用前必须在 feature 编码说明中登记 |

框架层固定的是字母位的默认含义和 `0/1/2` 的基本语义。feature 可以新增编码类型、状态维度或状态值，但不能重定义已经固定的含义。例如不能在一个 feature 里让 `t1` 表示“测试通过”，另一个 feature 里让 `t1` 表示“测试失败”。状态位统一遵守 `0=需要处理`、`1=当前可接受`、`2=部分完成或需要复核`，不要为某个维度反向解释数字含义。

这张表应该优先维护在 feature memory 的现有文件中，例如 `memory/trace-index.md` 或 `memory/open-items.md`。模型执行命令前应先读取这张表，再解释状态位。不要过早新增一堆 registry 文件；只有现有表承载不住时，再拆出专门文件。

`trace-index.md` 和 `open-items.md` 的职责不要混在一起。`trace-index.md` 负责流程、界面、接口、数据、验收、workset 和 source docs 的追踪链；`open-items.md` 负责问题、todo、risk、blocker、影响、回退建议和关闭条件。

流程应优先作为 trace 的主轴。对有业务过程的 feature，UI、API、TABLE、CODE、ACC、TEST 应尽量能追到某个 `FLOW` 主坐标。流程在关系上是树干，但在编码上仍保持 `FEATxx.WSxx.TYPExx` 平级主坐标，不把 UI、按钮、字段、事件、状态迁移都写成 `FLOW` 的深层子编码。

`FLOW` 只承载业务流程状态，不承载纯 UI 本地状态。审批通过、驳回、提交、支付、退款、发货、归档、外部调用、权限判断、数据写入、验收结果变化等，应进入 `FLOW`。hover、focus、展开/折叠、tab 切换、弹层开关、局部 loading、纯展示组件状态，默认只属于 `UI`。如果某个 UI 本地状态会影响提交、权限、数据合法性或验收，就必须回到 `FLOW`、`sp.specify` 或 `sp.clarify` 明确业务含义，不能藏在 UI 细节里。

关键流程步骤应声明节点类型：`ui`、`system`、`external`、`scheduled`、`manual` 或 `none_ui`。`ui` 类型步骤必须能追到至少一个 UI 主坐标，除非明确进入 open-items；非 UI 步骤不要求绑定界面，但必须说明触发方式、输入、输出、失败路径或验收证据。一个 UI 可以服务多个流程步骤，但每个入口下可见元素、可触发事件、权限和必要字段差异必须可查。

流程步骤应采用轻量“端口契约”写法。这里的端口不是新工具，也不是图数据库字段，而是要求每个关键步骤说明：输入是什么、前置条件或权限是什么、允许触发什么业务动作、会产生什么输出或副作用、目标状态是什么、失败时进入哪里、由什么验收或测试证明。缺少这些信息时，后续 UI、API、测试和代码都会靠猜。

UI 契约应从流程产生，而不是由界面文档凭空发明。关键 UI 元素需要能追到来源流程步骤、业务事件或字段、预期 API/副作用、数据对象和验收证据。普通装饰、排版和无业务影响的视觉细节不进入全局编码；影响流程、数据、权限、提交、导航、错误处理或验收的元素必须能在 UI 文档或 trace 中被定位。

数据联动要跟随流程节点一起检查。只要数据对象、表、字段、状态、事件、权限或持久化语义变化，就必须检查直接相邻的 UI 字段、API 契约、权限规则、事件或副作用、验收路径、测试证据和 trace/open item。反过来，如果 UI 新增字段、API 新增参数、权限规则变化或测试语义变化，也要回看它对应的流程节点和数据对象。这里不要求多跳图遍历，只要求一层直接邻居清楚，避免模型只改一个点却漏掉实际业务链路。

逻辑关系要有约束方向。`guards`、`persists_to`、`reads`、`writes`、`emits`、`verifies`、`depends_on`、`blocks` 这类关系词不是装饰，它们决定影响半径。关系缺失时先补 trace/source doc；补不了就进入 `memory/open-items.md`；如果缺失关系会影响验收、测试、发布、回滚、权限、数据安全或人工决策，`/sp.analyze` 不能 PASS，`/sp.gate` 不能无条件 PASS。

`/sp.flow`、`/sp.ui`、`/sp.plan` 刚生成或刷新后的内容，在通过 `/sp.analyze`、`/sp.gate` 或等价轻量检查前，只能视为草稿事实。草稿可以用于继续讨论和局部推理，但不能直接覆盖稳定 memory、关闭风险、声明 PASS 或作为实现阶段的唯一依据。稳定事实进入 `trace-index.md`、`open-items.md` 或 source-of-truth 文档前，必须有来源、关系和验证路径。

等价轻量检查只用于早期 flow/UI 草稿，尤其是 `tasks.md` 尚未生成、正式 `/sp.analyze` 前置条件不满足时。它至少要确认：草稿有 `spec.md`、clarifications、flow、UI 或 open item 的来源；没有把草稿写成稳定 memory；没有关闭风险或支持 PASS；关键关系有 trace/open-item 路由，或者继续明确标记为 draft。它不是实现准入检查，也不能替代 `plan.md` 的 `Implementation Readiness`。

`trace-index.md` 默认保持单文件。只有当 trace 表已经大到模型每次读取都明显分散注意力，或同一 feature 内多个 workset 之间关系过多时，才按 `WSxx`、模块或子 feature 分治。分治时总索引仍叫 `memory/trace-index.md`，只保留主锚点、所属 workset、直接相邻文档和分片位置；细节可以进入 `memory/trace-index-WS02.md` 或 feature 内局部 trace 文件。小项目不要提前拆，否则会增加文件跳转和维护负担。

`memory/open-items.md` 还要显式承载 `UnresolvedRef`，也就是未解析引用。典型情况包括：未确认外部依赖、文档提到但尚未落地的 API、未绑定测试或验收证据、trace anchor 找不到 source doc、source doc 提到对象但 trace 没有注册。未解析引用不能写进稳定 trace 当作事实，只能进入 open-items，直到被确认、关闭或转成正式锚点。

回链成立的判断保持简单：`open-items.Anchor` 能命中 `trace-index.md` 的任意单元格，或者 `open-items.Affected Docs` 至少有一个文件能命中对应 trace row 的 `Expand Docs`。不要为了反查方便，在 `trace-index.md` 里再加一套 `Open Items` 或 `Risk` 反向列。反向列会让 trace 表变成风险台账，后续维护成本更高，也更容易出现两边状态不一致。

`trace-index.md` 里的 `Expand Docs` 不是装饰字段。凡是稳定 trace row 中写入的本地文件路径，都应能在当前 feature 目录中找到；找不到时应报告 `TRACE_EXPAND_DOC_MISSING`。检查时应按表头动态定位 `Expand Docs` 列，不能假设它永远是第三列；否则 trace 表一扩展，机械检查就会读错字段。这不代表可以自动判定对象已废弃，也不能把缺失文件当作业务 PASS 证据；正确处理是恢复源文件、修正 trace、降回草稿/open item，或交给下一阶段代码包处理。

flow/ui 的主体必须是目标业务系统，不是 SP 自己的命令、阶段、memory、gate、任务包或执行控制台。`/sp.flow` 输出的是业务流程、角色、数据状态、业务分支和异常路径；`/sp.ui` 输出的是业务界面、字段、动作、反馈和状态，而不是展示 `/sp.prd`、`/sp.flow`、`trace-index.md`、`open-items.md`、`Allowed Write Set`、`Required Checks` 这些 SP 控制面对象。唯一例外是目标产品本身明确是 SP/SpecCompass/Spec Kit、AI agent、开发者工具、CLI、工作流工具、规格工具或流程工具；即使如此，flow/ui 文档也必须带有可见的 source、业务域、角色、验收或 trace 锚点，证明这些控制面词汇属于目标产品需求，而不是模型把 SP 机制误当成业务对象。

### 3. 编码要同时支持主坐标和副标签

单一编码适合定位，多编码适合关联。

推荐每个重要内容都有一个主坐标，再按需要挂副标签：

- 主坐标示例：`FEAT01.WS02.UI03`，表示第 1 个 feature 下第 2 个 workset 的第 3 个 UI 锚点。
- 非 UI 主坐标示例：`FEAT01.WS02.API02`、`FEAT01.WS03.TABLE01`、`FEAT01.WS04.JOB01`、`FEAT01.WS04.EVENT02`。
- 副标签示例：`API02`、`TABLE01`、`ACC04`、`RISK02`、`@t0`、`@r0`。
- 现有兼容写法：继续使用 `SCREEN-PRIMARY`、`API-CREATE`、`TABLE-PRIMARY_RECORD` 这类语义锚点，同时可以补充 `UI01`、`API01` 作为短编码。

主坐标解决“它属于哪里”。副标签解决“它和谁有关”。

当 feature 存在明确业务流程时，`FLOW` 应成为副标签和 trace 关系的优先汇聚点。也就是说，不是让所有对象的主坐标都变成 `FLOW` 的子编码，而是让它们在关系上能回链到流程：

```text
FEAT01.WS02.UI03 serves FEAT01.WS02.FLOW01
FEAT01.WS02.API02 transitions FEAT01.WS02.FLOW01
FEAT01.WS02.TABLE01 mutated_by FEAT01.WS02.API02
FEAT01.WS02.ACC04 verifies FEAT01.WS02.FLOW01
```

这样模型搜索 `FEAT01.WS02.FLOW01` 时，可以快速带出相关界面、接口、数据、代码和验收路径；同时每个对象仍保留自己独立、可搜索、不过长的主坐标。

主坐标之外，还可以为重要对象增加语义限定名，也就是 CodeGraph 中 `qualifiedName` 思想的轻量借鉴。主坐标是稳定身份，不随业务命名轻易变化；语义限定名是搜索别名，帮助模型按业务语义定位对象。

示例：

```text
稳定主坐标：FEAT01.WS02.API03
语义限定名：attendance.leave::WS02::API.APPROVE
```

这两个值解决不同问题：`FEAT01.WS02.API03` 用来唯一定位和维持 trace 稳定，`attendance.leave::WS02::API.APPROVE` 用来让模型通过业务名、领域名和能力名快速搜索。业务命名变化时，可以更新语义限定名，但不要复用或随意改写稳定主坐标。

例如一个审批按钮可以这样表达：

```text
主坐标：FEAT01.WS02.UI03
关联标签：SCREEN-REVIEW API-APPROVE TABLE-DECISION_RECORD ACC-DECISION-SUCCESS
状态位：@t0
未决记录：如果存在真实未决问题，见 memory/open-items.md 中对应的 OPEN01 或 RISK01 行
```

模型后续处理审批问题时，不需要读完整文档才能知道关联范围。搜索 `WS02` 可以找到同一工作集；搜索 `API-APPROVE` 可以找到接口链；搜索 `ACC-DECISION-SUCCESS` 可以找到验收路径；搜索 `@t0` 可以找到仍需验证的对象。真正的 todo、风险原因、影响范围和关闭条件，不写在这一行里，而是进入 `memory/open-items.md`。

关系也应该显式写出类型。SP 不需要引入图数据库，但 trace、workset 和 memory 中的关系词应尽量稳定，避免只写“相关”。推荐默认关系动词包括：

| 关系词 | 含义 |
|---|---|
| `contains` | 上级范围包含下级对象 |
| `uses` | 一个对象使用另一个对象 |
| `calls` | 调用接口、函数或服务 |
| `persists_to` | 写入表、集合或持久化对象 |
| `reads` | 读取数据源或配置 |
| `writes` | 写入数据源、状态或文件 |
| `guards` | 权限、校验、策略或门禁保护某路径 |
| `verifies` | 测试、验收或检查验证某对象 |
| `blocks` | 未决项或风险阻断后续阶段 |
| `depends_on` | 依赖某对象、约束或外部系统 |
| `emits` | 产生事件、消息或副作用 |
| `supersedes` | 新对象替代旧对象 |

feature 可以扩展关系词，但必须在 feature memory 或 trace 的编码说明中登记。未登记关系词通常只作为 warning；如果关系含义不清导致影响半径无法判断，才阻断。

关系词和节点标签要做轻量归一化。模型可以在草稿中使用自然语言，但进入 `trace-index.md`、`open-items.md`、workset 关系或 gate/analyze 报告时，应尽量折叠到标准关系词或 feature 已登记扩展词。未知同义词默认是 warning，不阻断主流程；如果它让“谁影响谁、改谁要看谁”无法判断，就升级为硬问题。

为了便于模型搜索，memory 表格应尽量字段化，而不是只写长段自然语言。以下字段是标准字段全集，不是每个小项目都必须全量维护：

| 字段 | 用途 |
|---|---|
| `Type` | 对象类型，例如 `UI`、`API`、`TABLE`、`ACC`、`Risk`、`UnresolvedRef` |
| `Anchor` | 稳定主坐标或锚点 |
| `Qualified Name` / `Alias` | 可选语义限定名或搜索别名 |
| `Workset` | 所属 workset |
| `Relation` | 与其他对象的关系动词和目标 |
| `Source Docs` | 事实来源文档 |
| `Expand Docs` | 需要扩展读取的直接相邻文档 |
| `Status` | 当前状态或 open/closed 信息 |
| `Evidence` | 测试、检查、验收或文件证据 |

这些字段不是为了增加表格负担，而是为了让模型能按 `Type`、`Anchor`、`Workset`、`Relation`、`Status` 先定位，再决定是否展开全文读取。`Qualified Name` / `Alias` 只给重要跨模块对象、领域概念或容易重名的对象使用，不要求每个锚点都填写。小项目或轻量任务可以使用 5 列精简版：`Anchor`、`Name`、`Type`、`Relations`、`Status/Evidence`。只有当关系复杂、需要多跳追踪或存在高风险边界时，才使用标准字段全集。

### 4. 编码要表达上下级关系

编码必须能看出隶属关系，否则它只是标签，不是坐标。

推荐层级关系：

- `FEAT01` 表示 feature。
- `FEAT01.WS02` 表示 feature 下的 workset。
- `FEAT01.WS02.UI03` 表示 workset 下的 UI 锚点。
- `FEAT01.WS02.API02` 表示 workset 下的 API 锚点。
- `FEAT01.WS02.ACC04` 表示 workset 下的验收锚点。
- `FEAT01.WS03.JOB01` 表示 workset 下的后台任务锚点。
- `FEAT01.WS03.EVENT02` 表示 workset 下的事件或副作用锚点。

多编码时也要保留隶属关系。不要只写一串孤立标签：

```text
UI03 API02 TABLE01 ACC04
```

更好的写法是：

```text
FEAT01.WS02.UI03
FEAT01.WS02.API02
FEAT01.WS02.TABLE01
FEAT01.WS02.ACC04
```

这样模型能立即判断这些内容属于同一个 feature 和 workset。上下文窗口有限时，这种结构能显著减少“先搜索再推理归属”的消耗。

主坐标要有层级，但不能无限套娃。默认主坐标最多 3 层：

```text
FEATxx.WSxx.TYPExx
```

例如 `FEAT01.WS02.UI03`、`FEAT01.WS02.API02`、`FEAT01.WS02.TABLE01`、`FEAT01.WS02.ACC04`。这 3 层分别回答：属于哪个 feature、属于哪个 workset、是哪一个关键对象。

小项目如果没有必要拆 workset，可以退化成 2 层：

```text
FEATxx.TYPExx
```

例如 `FEAT01.UI01`、`FEAT01.API02`。不要为了形式完整强行制造 `WS01`。

禁止继续向下给微观细节追加层级。不要把按钮、字段、私有函数、流程内部细步写成 `FEAT01.WS02.UI03.BTN05`、`FEAT01.WS02.API02.FIELD03` 或 `FEAT01.WS02.FLOW01.STEP04`。这些内容应归属到最近的 UI、API、TABLE、FLOW、ACC 等父级锚点下，用自然语言、语义别名、副标签或测试证据说明。

同理，流程主轴不是深层编码许可。流程内部步骤、分支、事件和迁移默认写在 flow 文档表格或 trace 关系中；只有当某个事件、消息、权限或副作用需要跨文档、跨模块反复追踪时，才升级为 `EVENT`、`PERM`、`JOB` 等正式锚点。

这条规则的目的不是削弱上下级关系，而是避免模型维护过长编码。SP 需要的是能稳定定位上下文的宏观坐标，不是给每个微观细节都发身份证。

### 5. 状态位应少用，并且不替代 open items

长状态标签可以表达清楚含义，但不适合大量散落。SP 更适合采用短状态值，例如 `t0`、`r0`；实际落点应收敛在 `tasks.md`、`memory/trace-index.md`、`memory/open-items.md` 或阶段报告中。source-of-truth 文档只保留稳定锚点、稳定事实和验收依据，不承载可变状态位。不要把 `@t0`、`@r0` 这类可变状态写进生产代码注释、测试名称或源规格正文。

推荐把状态位设计成可改写标签，而不是改写主编码。为了便于搜索和避免和普通副标签混淆，状态位统一加 `@` 前缀。

更重要的是：状态位不是 todo、risk 或 blocker 的完整记录。状态位只是搜索入口和阶段检查信号。凡是需要解释原因、影响范围、负责人、回退建议、关闭条件或后续动作的事项，都必须进入 feature memory 的 `memory/open-items.md`。

例如：

```text
FEAT01.WS02.UI03 @t0
FEAT01.WS02.API02 @r0
```

这里 `FEAT01.WS02.UI03` 和 `FEAT01.WS02.API02` 是稳定身份，`@t0/@r0` 是当前需要注意的状态。这样做有两个好处：

- 改状态不会破坏历史引用、trace 链和测试命名。
- 可以通过搜索或统计 `@t0`、`@r0` 快速找出需要验证或存在风险的区域。

短状态位由“字母位 + 数字位”组成：

- 字母位表示状态维度，例如 `c` 表示检查类状态，`i` 表示实现类状态，`t` 表示测试类状态，`r` 表示风险类状态，`s` 表示同步类状态。
- 数字位表示状态值，例如 `0` 表示未开始或未完成，`1` 表示已完成，`2` 表示部分完成或需要复核。
- 框架已经定义的字母位不能被 feature 重定义。
- 框架已经定义的数字位不能被 feature 重定义。
- 新增字母位或 `3-4` 扩展值必须在编码说明里登记，避免不同文档理解不同。

规则要尽量简单：默认不打状态位。数字 `1` 表示当前可接受的正常状态，通常不写成行内标签；正常或已关闭状态标签只有在阶段检查确实需要统计时才临时使用。只有对象偏离默认状态、需要后续动作、存在风险、需要验证或需要同步时，才打状态位。一个对象默认最多保留 2 个状态位；超过 2 个，通常说明该对象应该拆分，或把细节迁移到 `memory/open-items.md`。

推荐起步只常用这两个状态入口：

- `@t0`：需要验证、尚无足够测试或验收证据。
- `@r0`：存在未关闭风险，完整记录必须能在 `memory/open-items.md` 找到对应 `RISK01` 这类条目。

其他维度保留为阶段性工具，不默认全量使用：

- `c0/c1/c2`：未检查 / 已检查 / 需要复核。
- `i0/i1/i2`：未实现 / 已实现 / 部分实现。
- `t0/t1/t2`：未验证 / 已验证 / 验证失败或需补测。
- `r0/r1/r2`：有未关闭风险 / 无已知风险或风险已关闭 / 风险已接受但需跟踪。
- `s0/s1/s2`：未同步 / 已同步 / 同步后可能过期。

这些状态位不一定都要立刻落地。原则是：凡是模型经常会忘、人工经常要追问、阶段切换经常要判断的状态，都适合编码化；凡是不能被搜索、统计或阶段检查使用的状态，就不要加入。

todo、risk 和 blocker 的承载规则：

- 简单、临时、马上会处理的提醒，可以只放在当前任务或段落里。
- Low/Medium 的 `Question` 或 `Todo` 如果是局部问题，且不影响范围、验收、发布、回滚、安全或实现信心，可以在 `memory/open-items.md` 中使用轻量记录。
- 影响范围不清、需要后续动作、需要人工决策、影响验收、影响发布或需要回退建议的事项，必须进入 `memory/open-items.md`。
- `Risk`、`Blocker` 和 `High` 严重性事项必须使用完整记录，包括 owner、影响范围、回退或降级方案、关闭条件、刷新时间和 trace/source 回链。
- 行内出现 `@r0` 时，应能在 `memory/open-items.md` 找到对应的 `RISK01` 这类条目。
- 行内出现 `@t0` 且验证缺口不是一眼可解决时，应能在 `memory/open-items.md` 找到对应的 `OPEN01` 或 `RISK01` 这类条目。
- 关闭风险、blocker 或 todo 时，不只删除行内标签，还要更新 `memory/open-items.md` 的状态、刷新时间和关闭依据。关闭依据必须是当前验证证据、可追溯代码/文档变更、明确人工决策，或写清不可自动验证的复核路径；不能只写“已处理”“模型判断可控”。
- 降级、删除或关闭 `Blocker`、High Risk、`@r0` 时，如果当前环境能读取 diff，应检查该变更是否同时带有关闭证据、人工接受记录、rollback/degrade path 或后续复核锚点。缺少证据时不能 PASS。
- 生产代码注释和测试名称默认只写稳定主坐标或业务语义名，不写 `@t0`、`@r0`。如果确实需要在测试中表达状态，应通过测试描述、验收 ID 或业务路径表达，不使用可变状态位。
- `memory/open-items.md` 不应初始化默认业务行。空表是合法状态，表示当前还没有被证据确认的未决事项。
- `Risk=Open` 不能由模型自行判定为可通过。如果要接受风险继续推进，必须有明确人工决策，并写清 owner、revisit anchor、trace registration、impact scope、rollback/degrade path 和 close condition。
- `Blocker=Open` 不能 PASS。未决项如果会导致继续前必须重写 `spec.md`、`plan.md` 或 `tasks.md`，也不能 PASS。

### 6. 编码应具备唯一性和可搜索性

编码一旦确定，就应该成为稳定锚点。稳定锚点的核心要求是唯一、可搜索、可追踪。

推荐搜索友好规则：

- 主坐标只使用大写字母、数字、短横线和点号，例如 `FEAT01.WS02.API02`。
- 状态位使用 `@` 前缀，例如 `@t0`、`@r0`；正常状态默认不写。
- 一个对象只能有一个主坐标，可以有多个副标签；状态位默认最多 2 个。
- 主坐标不要复用。对象删除后，原坐标应标记废弃，不要分配给新对象。
- 主坐标一旦发布，不因中间插入、删除或排序调整而重排。新对象使用下一个可用编号或清晰的新语义别名；旧编号缺口可以提示复核，但不能为了“连续好看”改写历史坐标。
- 副标签可以重复，因为它用于关联；主坐标不能重复，因为它用于定位。
- 主坐标用于稳定定位，语义别名用于业务搜索。复杂对象可以同时带一个稳定坐标和一个语义别名，例如 `FEAT01.WS02.API02 AUTH.LOGIN.SUBMIT`。
- 文档、trace 表和必要的测试描述中应尽量原样写入主坐标，避免同一对象出现多个拼写。生产代码注释默认不强制写 SP 坐标；只有当团队本来就维护稳定架构注释、接口契约注释或生成文档标记时，才可写稳定主坐标。可变状态位不要写进生产代码注释和测试名称。
- 搜索时优先搜索完整主坐标，再搜索同前缀范围，最后搜索副标签。

示例：

```text
FEAT01.WS02.API02 API-APPROVE ACC-DECISION-SUCCESS @t0
```

这行信息可以支持三类搜索：

- 搜索 `FEAT01.WS02.API02`：定位唯一对象。
- 搜索 `FEAT01.WS02`：找到同一 workset 的全部对象。
- 搜索 `@t0`：找到未验证对象；如果验证缺口复杂，再去 `memory/open-items.md` 读取对应 `OPEN01` 或 `RISK01` 这类条目。

### 7. 编码应支持简单计算和自动检查

好的编码不只是给人读，还应该能被简单规则检查。

SP 可以逐步引入这些可计算规则：

- 序号检查：`UI01`、`UI02`、`UI04` 中间缺 `UI03`，说明可能有文档缺口、废弃对象或编号跳跃。它是复核信号，不是自动重排理由。
- 同前缀聚合：所有 `FEAT01.WS02.*` 都属于同一工作集，可以一次性列出当前 workset 的最小上下文。
- 配对检查：出现 `API02` 时，应能在 trace 中找到对应的 `ACC*`、`TABLE*` 或测试锚点。
- 唯一性检查：同一个主坐标不应在 registry 中指向多个对象。
- 状态统计：统计 `@t0`、`@r0`，就能快速知道哪些地方未验证、哪些风险未关闭。
- 覆盖检查：每个核心 `ACC*` 至少应能追到一个流程、一个界面或接口、一个数据影响点、一个测试或验收证据。
- 风险检查：如果某个 `RISK01` 这类条目仍是未关闭状态，`gate` 不应轻易通过。
- open-items 检查：如果行内有 `@r0` 却没有对应 `RISK01` 这类条目，或复杂 `@t0` 没有对应 `OPEN01`，说明记忆链断裂。

这类计算不要求一开始就写复杂程序。早期可以先让命令模板和人工检查按这些规则搜索；后续再把稳定规则沉淀成脚本或测试。

### 8. 未来可以把编码规则产品化

编码规则先写进方法论和 memory，后续可以逐步产品化，但不要一开始就做得过重。

建议演进路径：

1. 先复用现有 `memory/trace-index.md` 和 `memory/open-items.md`，分别承载 trace 坐标和未决事项，不急着新增 `coding-registry.md`。
2. 在 `memory/open-items.md` 中维护 `OPEN01`、`RISK01` 这类条目，以及 blocker、todo、影响范围、回退建议、关闭条件和刷新时间。
3. 在 `memory/trace-index.md` 中维护主坐标、对象名称、类型、所属 workset、副标签和验收覆盖关系。
4. 增加轻量检查：主坐标重复、序号缺口、`@r0` 无对应 `RISK01` 这类条目、复杂 `@t0` 无对应 open item、核心 `ACC*` 无验证证据。
5. 等真实项目证明需要后，再把稳定规则抽成 `status-schema.yaml` 或专门 registry。
6. schema 变更时增加版本号和迁移说明，避免旧 feature 与新规则冲突。

这条路线的原则是：先让模型和人按统一规则写，再把稳定规则脚本化。不要反过来先写复杂工具，再逼文档适配工具。

如果未来引入 CodeGraph 这类外部代码图谱工具，也应作为可选辅助，而不是 SP 主安装链依赖。

可以借鉴它的控制思想：

- 先查索引再扩上下文。
- 用稳定节点和关系减少重复推理。
- 修改前看直接影响半径。
- 输出上下文必须有预算。
- 工具结果必须能回链到源文档、代码或测试。
- 源文件变化但 memory 或 trace 未变化时，要提示 stale memory 或 stale trace。
- 区分结构性变更和装饰性变更，小改动不强制重型影响分析。

不能搬进 SP 默认机制的部分：

- 不把 SQLite、Tree-sitter、MCP server 或实时 watcher 纳入基础安装链。
- 不把 `trace-index.md` 改造成图数据库。
- 不让外部 CodeGraph 成为 source of truth。
- 不要求每个小改动都跑重型图分析。

SP 的默认路径仍应保持 Markdown memory、trace-index、open-items、source docs、文本搜索和轻量检查。可以学它的路由思想，不搬它的运行时。工具可用时辅助定位；工具不可用时向上兜底，不影响 `/sp.*` 主流程继续工作。

### 9. 编码体系要避免两个极端

第一个极端是没有编码。没有编码时，模型只能靠自然语言搜索和大段阅读，token 消耗高，遗漏概率也高。

第二个极端是编码过度。所有句子都加复杂编号，会让文档难读，维护成本过高。

SP 更适合采用“关键锚点编码”：

- 核心角色、流程节点、界面、接口、表、权限、验收、风险必须有编码。
- 普通解释性段落不必强制编码。
- 状态位只用于需要被阶段检查或自动追踪的对象；todo、risk、blocker 的正文进入 `memory/open-items.md`。
- 编码规则要允许新增类型，但新增类型必须写入 trace 或 memory 的编码说明中。

### 10. 代码结构要承接 workset 和模块边界

编码时应尽量让代码组织对应 `delivery/11-module-boundaries.md` 和 workset 切分。

这意味着：

- 一个模块主要负责一个清晰业务责任，不把审批、查询、创建、侧效应混在一起。
- 文件路径和模块命名应能让模型大致看出所属业务区域。
- 跨模块调用应通过明确接口、服务或事件连接，避免隐式共享状态。
- 高风险 side effects、补偿、审计、通知等逻辑应单独隔离，避免散落在主流程里。

这样做能降低上下文负担。模型定位问题时，不需要全仓搜索“审批逻辑到底藏在哪里”，而是能从 workset 和模块边界直接进入相关代码。

### 11. 代码对象要回链到稳定锚点

SP 文档里已经有 `ROLE-*`、`SCREEN-*`、`API-*`、`TABLE-*`、`ACC-*` 等稳定锚点。编码阶段应尽量让关键代码对象能回链到这些锚点。

推荐方式不是到处写长注释，而是在合适位置建立轻量关联：

- API handler、service、repository、event handler 的命名应靠近对应业务能力。
- 测试名称或测试描述应包含对应 acceptance 或业务路径。
- 关键边界文件可以用短注释说明它服务哪个 workset 或 acceptance。
- 数据迁移、事件、权限规则等高风险代码，应能从 trace-index 找到来源。

这能解决一个常见问题：模型看到代码能懂局部逻辑，但不知道它服务哪条业务路径，改动时容易破坏上游规格或下游验收。

### 12. 测试是上下文索引，不只是质量检查

SP 应把测试看成编码阶段的重要记忆入口。

好的测试不只是证明代码能跑，还应该帮助模型快速理解功能边界。测试名称、测试分组、测试 fixture 应尽量表达业务路径、角色、状态和验收目标。

推荐做法：

- 关键测试绑定 acceptance ID 或业务路径名。
- 同一个 workset 的测试尽量集中或可检索。
- 测试数据使用业务语义命名，而不是只有 `foo`、`bar`、`mock1`。
- 失败测试应能指出是规则错、接口错、权限错、状态错，还是副作用错。

这样下次模型修 bug 时，可以先读相关测试和 workset，而不是重新推理整套需求。

### 13. 编码任务要保持小而可回写

实现阶段的任务不应只写“完成某模块”。每个编码任务都应该能回答：

- 它对应哪个 workset。
- 它修改哪些代码区域。
- 它覆盖哪个 acceptance 或风险。
- 它需要哪些测试证明。
- 它完成后是否需要更新 memory、trace、open-items 或任务状态。

任务越小，模型越不容易遗忘上下文；任务越能回写，下一轮越不需要重新解释。

代码阶段必须区分文档任务和实现任务。`sp.tasks` 生成的任务或任务分组应能机械读取 `Mode: doc` 或 `Mode: impl`。`sp.implement` 只执行 `Mode: impl`；没有明确模式时默认按 `Mode: doc` 处理，不能写生产代码。`Mode: doc` 可以更新规格、flow、ui、plan、memory、trace、open-items、analysis 或 gate 产物，但不能被模型临时解释成实现任务。

文档阶段发现代码问题时，只能产出实现交接包，不能把代码产物混进文档收口。比如文档阶段发现需要新增 `src/` 文件、补测试资产、改脚本、改配置或补 schema，应在 `tasks.md` 或 `memory/open-items.md` 中形成下一阶段 `Mode: impl` code handoff packet，写清目标文件、原因、关联锚点、`Allowed Write Set`、`Required Checks`、验证方式和下一步路线。文档阶段可以提交文档成果；未经授权的 `src/`、`scripts/`、配置、生成代码或测试资产不能顺手 stage/commit。已经临时产生的代码草稿必须作为下一阶段代码包交接、隔离或清理，不能丢，也不能伪装成文档阶段成果。

实现准入事实只能有一个权威来源。`plan.md` 的 `Implementation Readiness` 负责说明哪些 workset 可以生成实现任务、缺什么前置条件、为什么还不能实现；`sp.analyze` 只诊断 readiness 是否真实、是否过期、是否和代码落点、验证命令或 open items 冲突；`sp.gate` 只做阶段决策，不另造一套 readiness。`tasks.md` 消费 readiness 生成任务，不能自行发明 readiness。

`sp.plan` 的代码映射不要过早承诺符号级细节。计划阶段默认映射到模块、目录、关键文件、边界对象或 workset；实现后稳定下来的 CODE/TEST 关系再进入 `memory/trace-index.md` 或 feature-local trace。只有 public API、权限规则、数据迁移、核心测试、事件边界等高风险对象，才提前要求稳定 CODE/TEST anchor。

实现任务采用“全局默认 + 只写偏离”时，worker 必须看得到最终生效规则。task packet 应包含压缩后的 effective defaults，至少包括默认 Forbidden Write Set、Fallback Route、Writeback Rule 和 Required Evidence；或者指向一个很小、只读、稳定的 defaults 文件，并要求 worker 开始前读取。defaults 文件只读，不进入 worker 的 Allowed Write Set。不能只把默认规则写在方法论里，然后让 worker 靠记忆执行。

代码续作和高风险实现任务必须把“续作上下文”写成可执行字段，而不是让后续模型重新全量理解项目。推荐固定字段是：`Read Set`、`Dependencies Checked`、`Reverse Trace Checked`、`Expected Delta`、`Delta Summary`、`Proposed Updates`。这些字段的作用是压缩上下文、控制影响面、降低误删误改风险，并让复核从增量证据开始。

- `Read Set` 从 feature memory、workset memory、trace/open-items、source docs、直接代码和直接测试开始，不默认全仓重读。
- `Dependencies Checked` 只要求先检查直接邻居，例如 imports、calls、routes、contracts、schemas、permissions、tests 和 workset trace 行；只有证据显示影响扩大时才继续展开。
- `Reverse Trace Checked` 用于删除、移动、重命名、公共行为、schema、权限、路由、事件或验收改动前的反向引用和搜索证据。
- `Expected Delta` 说明本任务预期改变什么，避免 worker 把任务扩大成顺手重构。
- `Delta Summary` 是复核入口，不是 PASS 证据本身；`sp.analyze` 和 `sp.gate` 必须把它和当前 diff、任务包、trace/open-items、必要源码和验证结果对照。
- `Proposed Updates` 是 worker 提交给 coordinator、`sp.analyze` 或 `sp.gate` 的共享状态更新建议，不等于 worker 可以直接改共享 truth 面。

本项目采用以下代码阶段落地决策：

- `CODE` 和 `TEST` 是正式 trace 类型或字段。高风险边界对象和验收关键测试必须登记或提出登记建议；普通内部 helper、私有函数、纯样式组件和局部 glue code 不强制登记。
- task packet 初期直接包含压缩后的 effective defaults，减少 worker 漏读。等规则稳定、自动化成熟后，才考虑抽成小型只读 defaults 文件。
- 普通 trace warning 可以推进，但必须记录在 task evidence、analysis 或 `memory/open-items.md`；跨阶段仍未解决，或影响验收、测试、发布、回滚、人工决策时，升级为 blocker。
- `Allowed Write Set` 不足时不能自动扩权。代码边界或 workset 错误返回 `NEEDS_PLAN`；任务拆分或 task packet 字段不足返回 `NEEDS_TASKS`。
- `sp.plan`、`sp.tasks`、`sp.implement`、`sp.analyze`、`sp.gate` 都必须执行上述规则，不能只停留在方法论文档。

### 14. 变更后必须处理记忆债务

编码会改变事实。事实改变后，如果文档和 memory 不更新，就会产生“记忆债务”：下一次模型读到旧 memory，会按旧事实继续做，错误会被放大。

以下情况应触发回写：

- API 入参、出参、错误码或权限规则发生变化。
- 数据表、字段、状态机、事件顺序发生变化。
- UI 字段、按钮、页面跳转或提示方式发生变化。
- 验收路径、测试方式、测试覆盖范围发生变化。
- 发现原规格有遗漏、冲突或无法实现的假设。

回写不一定每次都很重，但任务状态不能拖到后续阶段再猜。每完成一个实现任务，都应在同一次执行中更新任务勾选、当前验证证据，以及被这个任务直接改变的状态位或 open item。这样下一轮模型不需要重新花 token 判断“这个任务到底完成没有”。

这条规则在单 agent 或 coordinator 自己执行任务时，表示执行者可以直接完成必要回写；在多 agent 场景下，worker 不能直接写共享 truth 面。Worker 只能通过 handoff 的 `Status`、`Evidence` 和 proposed updates 报告完成情况；`tasks.md` 勾选、状态位、memory、trace 和 open item 的正式回写，必须由 coordinator 在串行 closeout 中完成。

任务状态的统一规则：

- 任务已经实现并通过该任务要求的验证或复核：更新 `tasks.md` 的完成状态，记录验证证据，并关闭或调整直接相关的 `@t0`、`@r0`、`OPEN`、`RISK` 条目。
- 任务实现完成但复核、验收或人工决策还没完成：不要把它伪装成最终完成；保留未关闭状态位或 open item，写清关闭条件、负责人或下一步复核动作。
- 复核是任务完成条件的一部分时，应在复核通过后再把状态改成最终结束；如果复核失败，保持任务未完成或拆出后续任务。
- 如果复核或人工决策会阻塞自动执行，优先在 `sp.tasks` 阶段拆成“实现任务”和“复核/决策任务”。实现任务可以在验证通过后关闭；复核/决策任务继续留 open，直到真实复核或决策完成。
- `sp.analyze` 和 `sp.gate` 负责发现漂移和批量收口，不应替代正常的“任务完成即回写”。

稳定业务事实变化应更新 source-of-truth 文档和 feature memory；风险或遗留问题应进入 open-items 或 hotspots。普通低风险小改动可以只更新任务状态和测试证据，不必频繁改写主 memory。

并行任务要区分“可并行实现”和“共享状态写入”。`[P]` 任务可以并行修改互不重叠的代码或文档，但共享 truth 面必须串行更新，或者由一个收口步骤统一批量合并。并行代理可以各自产出证据和建议，不应同时抢写同一份 memory、trace、任务树或阶段结论。

受控多 agent 的 canonical 契约以 `templates/project/docs/reference/sp-command-spec.md` §10.3 为准，包括 hard gates、worker handoff 字段、worker 状态枚举、dependency closure、fallback report 字段、shared truth files 和 global registry-like files。命令模板可以保留运行时关键规则副本，但修改这些字段或枚举时必须先更新 §10.3，再同步 `/sp.tasks`、`/sp.implement`、`/sp.analyze`、`/sp.gate` 和模板测试；不要在各文档里各自发明第二套状态或字段名。

共享 truth 面只定义一次，后续规则一律引用它，不再各自重列。默认包括：`tasks.md` 的任务状态和证据、`memory/open-items.md`、`memory/trace-index.md`、`memory/worksets/*`、`memory/stable-context.md`、feature 路由、稳定摘要、全局状态摘要、`analysis.md`、`gate.md`，以及会影响阶段路由或门禁判断的 source-of-truth 文档。Worker 默认只读这些文件；只有 coordinator 或明确的串行 closeout 任务可以写入。

分配并行代理时要把写权限边界写进任务本身：每个代理只能修改自己的 disjoint write set；共享 truth 面和其他 worker 的写入范围默认都属于 `Forbidden Write Set`。代理需要改变共享 memory、trace、任务状态或阶段结论时，应在返回结果中给出证据和 proposed update，由主执行者或收口任务统一合并。

并行任务的边界必须能从 `tasks.md` 直接读出来，不能靠聊天历史记忆。但高频读取的 `tasks.md` 不能被元数据撑大，默认约束应放在方法论、memory 和命令规则里，单个任务只写必要差异。

面向多 agent 的 `[P]` 任务默认只需要额外写清：

- `Allowed Write Set`：允许 worker 修改的文件、目录或文档范围。
- `Required Checks`：本任务必须运行或记录的测试、构建、lint、脚本检查或人工验证路径。

其他边界使用全局默认：`Task ID`、`Workset`、依赖和 `[P]` 状态沿用任务本身；`Read Set` 从 workset、trace、source docs 和直接相关测试推导；`Forbidden Write Set` 默认引用共享 truth 面，并包括其他 worker 的写入范围。只有任务偏离这些默认值，才在任务中补写 `Read Set`、`Forbidden Write Set` 或 `Expected Output`。

涉及全局注册类文件的任务默认不应 `[P]`。例如 `package.json`、锁文件、路由注册表、公共常量、数据库 schema、权限矩阵、全局配置、跨模块接口契约、迁移脚本、event bus registries、核心类型定义。它们看起来可能只是一个文件，但会改变多个 worker 的隐式依赖；除非 `sp.tasks` 能证明影响范围被隔离，否则应降级为串行任务。

共享可变文件只能串行合并。并行 worker 只能对共享 truth 面提交 proposed updates，由 coordinator 或串行 closeout 任务统一合并。`[P]` 任务的 Allowed Write Set 必须互不重叠；如果实际执行需要修改共享注册、全局配置、路由、schema、权限、迁移、lockfile 或 package manifest，应拆成串行 integration task，而不是继续当并行任务执行。

### 15. 规则维护要增量化，避免重复检查

规则维护的目标不是让模型每次重新审一遍全项目，而是让它知道“哪些刚变过、哪些还没关、哪些已经检核通过且证据仍有效”。这样才能减少重复 token 消耗，同时避免漏掉真正需要复查的地方。

任务完成时要做最小必要回写：

- 更新该任务自己的完成状态、验证证据、复核状态或人工决策状态。
- 只更新被本任务直接改变的状态位、open item、trace/source doc 或 workset 记录。
- 同一执行回合内连续完成的低风险、同上下文小任务，可以在回合末一次性批量写回多个任务状态和证据；但不能拖到后续 `/sp.analyze`、`/sp.gate` 或下一次模型调用再猜。
- 如果某个大类、workset 或阶段已经完成并通过检核，应留下可搜索的检核证据：对象、检核时间或本次运行标识、验证方式、仍然打开的例外项。
- 如果没有稳定事实变化，不为了“显得完整”改写 memory；只在任务备注或阶段输出里留下验证证据即可。

`/sp.analyze` 和 `/sp.gate` 的复查顺序应是增量优先：

- 先看最近完成或最近修改的任务、锚点、source docs、trace 行和 open-items。
- 再看仍处于 `@t0`、`@r0`、Open、Blocked、Needs Decision、stale、unchecked 的对象。
- 再看这些对象的直接依赖、直接调用方、直接验收路径和直接测试证据。
- 已经标记完成、证据仍有效、依赖没有变化的大类，只做轻量一致性抽查，不重新深读全部细节。

已完成大类只有在以下情况才需要重新深查：

- 它直接依赖的 source doc、公共接口契约、数据结构、权限、验收路径、关键测试证据或上游决策发生变化。
- 相关 open item、risk、blocker 被重新打开，或出现新的 `@t0`、`@r0`。
- 轻量检查、测试、构建、lint、trace 检查失败。
- active feature 路由或 workset 路由发生变化。
- 用户明确要求全量审计。

这条规则不是让模型跳过证据。它只是规定证据检查要有范围：稳定且已检核的内容不反复深挖；最近变动、未关闭、不确定和直接上游契约依赖变动的内容必须细查。这样既能避免重复劳动，也能把注意力集中在最可能出错的地方。

增量化主要适用于文档审计和模型读取范围，不适用于随意降低测试验证。也就是说，已完成大类可以不重新深读全部规格细节，但如果本次直接修改或影响了依赖、公共 API、数据结构、权限、验收路径或关键测试，必须优先运行本地相关测试、相关检查或可复核的手工验证，并记录证据。CI/全量测试只能承担更大范围的回归、当前环境无法本地运行的检查，或未直接触及区域的补充验证；不能用来替代当前任务可执行的本地相关验证。模型不能只凭“看起来没影响”跳过验证。

推荐落点也要简单。优先复用现有文件，不新增复杂登记系统：

- `tasks.md` 记录任务完成状态、验证证据和必要的任务备注。
- `memory/open-items.md` 记录仍未关闭的 todo、risk、blocker、decision 和关闭条件。
- `memory/trace-index.md` 记录稳定锚点、关系和关键验证回链。
- `memory/worksets/*` 或 `memory/stable-context.md` 只记录影响后续路由的稳定事实。
- 如果后续需要自动化，再把“recent anchors / last checked / unchecked”沉淀成轻量检查脚本；早期不强制建新表。

### 16. 用编码方式减少未来 token 消耗

SP 的编码规则最终服务一个目标：让模型下次进入项目时，用更少上下文获得更准判断。

能减少 token 消耗的编码方式包括：

- 稳定编码让模型快速定位 feature、workset、界面、接口、表和验收路径。
- 多编码让模型通过搜索一次找到相关链路。
- 状态位让模型快速发现未验证对象和未关闭风险；完整 todo、risk、blocker 仍从 `memory/open-items.md` 读取。
- 小项目只使用最小路由和验证证据，避免编码和状态位负担超过收益。
- 超大项目必须把稳定编码、workset、trace 和 open-items 当作上下文入口，而不是依赖一次性大读集。
- 如果直接相邻对象过多，不继续扩上下文；应先拆 workset、子 feature 或子项目。
- 影响半径检查只记录直接相邻证据，避免把安全检查变成大段报告。
- 文件命名和目录结构体现业务边界。
- 模块职责清楚，减少跨文件猜测。
- 测试能作为业务路径索引。
- 关键代码与 trace、acceptance、workset 有可查关系。
- 高风险逻辑集中，便于优先审查。
- 变更完成后同步文档和 memory，避免旧缓存误导后续模型。

这不是要求代码为模型而写，而是要求代码对人和模型都更可读、更可追踪、更容易验证。

## 工程控制闭环

SP 可以理解为一个闭环控制系统。

1. 输入控制：确认目标、阶段、材料、缺口和人工决策点。
2. 范围控制：确定当前最小但充分的上下文范围。
3. 执行控制：把工作拆成可执行、可验证的小单元。
4. 验证控制：用测试、检查、评审或验收路径证明结果。
5. 反馈控制：把稳定结论写回文档和 memory。
6. 纠偏控制：发现冲突、失败、缺口时回到正确层级修复。

这个闭环的重点是降低模型工作的自由度，让模型每次面对的是一个结构清楚、证据充分、边界明确的问题。

复杂阻塞要走轻量根因闭环，而不是增加重流程。遇到阻塞、反复失败、无法收口或方向不确定时，先把问题定位到根因层级，再拆成可验证的小单元，再决定下一步命令。常用根因层级包括：`prd`、`spec`、`clarify`、`flow`、`ui`、`plan`、`tasks`、`implement`、`verify`、`memory`、`external`、`human-decision`。模型不能用下游代码 hack 解决上游业务矛盾，也不能用测试改弱来掩盖需求、计划或验证语义问题。

每个仍未关闭的高影响 blocker 都应有最小 `Blocker Breakdown`：`Blocker ID`、`Failure Signature`、症状、当前证据、`Root Layer`、`Disconfirming Evidence`、`Smallest Solvable Unit`、推荐处理策略、验证方式、`Writeback Target` 和下一步 `/sp.*` 路由。这个 breakdown 可以写在 `analysis.md`、`gate.md`、任务备注或输出报告中；`memory/open-items.md` 仍然是 blocker 的唯一稳定事实源，不新增第二套持久台账。普通低风险 warning 不需要套完整模板。

`Failure Signature` 应尽量稳定，推荐形态是 `<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>`。`Root Layer` 必须和下一步路线一致，常见值包括 `prd`、`spec`、`clarify`、`flow`、`ui`、`plan`、`tasks`、`implement`、`verify`、`memory`、`data`、`external` 和 `human-decision`。其中 `data` 用于 schema、migration、fixture 数据形状、兼容性、数据契约或初始化问题。重复处理同一失败签名前，必须补 `Disconfirming Evidence`，说明为什么上一轮判断被证据推翻；如果没有新证据，就不要重试，应转为 `BLOCKED`、`NEEDS_DECISION` 或回到正确 owner 命令。

如果 blocker 太大，先拆分，不直接实现。优先按验收路径、业务流程节点、边界对象、错误类型和人工决策类型拆分；不要用“修完所有测试”“清理所有 dirty worktree”“统一解决所有权限问题”这类大包任务继续推进。拆分后的每个子问题必须能独立验证，或者明确需要人工选择。

需要人工介入时，不让模型空转。模型应立即引导到 `/sp.clarify`，或者在当前交互中直接发起人类可读的问题：说明背景、影响、当前证据，给出 2-4 个选项、每个选项的影响、推荐方案和下一步命令。无法形成最小可解决单元、风险接受、合规/数据/权限取舍、回滚/降级策略、拆分争议和验证降级，都属于应及时问人的场景。

## 命令级执行纪律

方法论必须落到命令执行上，否则只会停留在原则层。当前代码阶段链路固定为：`/sp.plan` 产出代码落点和 `Implementation Readiness`，`/sp.tasks` 消费 readiness 生成 `Mode: doc` 或 `Mode: impl` task packet，`/sp.implement` 只执行已授权的 `Mode: impl` 任务，`/sp.analyze` 做 readiness、task packet、trace 和实现证据诊断，`/sp.gate` 消费分析证据做阶段决策。

最需要执行纪律的阶段包括 `/sp.flow`、`/sp.ui`、`/sp.plan`、`/sp.tasks`、`/sp.implement`、`/sp.analyze`、`/sp.gate`。其中 `Implementation Readiness` 只能由 `plan.md` 提供事实来源；其他命令只能消费、诊断或裁决，不能另造一套准入结论。

### 阶段通过凭证：Stage Readiness

SP 的阶段推进不能只看“文件是否存在”或“命令是否运行成功”。每个关键阶段都要在当前 feature 的 `spec.md`、对应阶段产物或 `specs/<feature>/memory/index.md` 中留下轻量 `Stage Readiness` 凭证，说明当前阶段能否进入下一阶段。

`Stage Readiness` 的推荐字段包括：`Stage`、`Status`、`Based On`、`Source Snapshot` 或 `Evidence Signature`、`Confirm Strategy`、`Batch ID`、`Batch Scope`、`Batch Review Status`、`Unresolved Blockers`、`Needs Decision`、`Inferred/Draft Items`、`Next Allowed Stage` 和 `Writeback Target`。它不是新台账，只是当前阶段产物对下一阶段的入口声明；长期 blocker 仍然写入 `memory/open-items.md`。

`Source Snapshot` 或 `Evidence Signature` 是轻量一致性标记，用来说明本次 readiness 基于哪些源文档、关键锚点、open item 状态、visual review 或 gate/analyze 证据。最低格式应包含五类信息：`Sources`（来源文件或 source docs）、`Anchors`（关键坐标、trace 或业务锚点）、`Open Items`（open-items/blocker/risk 状态）、`Visual/Human Review`（视觉核对或人工核对状态，不适用时也要写明）、`Checks`（本轮 analyze/gate/test/script/验证证据）。不要用文件 `mtime` 或原始 hash 当硬门禁，因为 Git、复制、批量生成和格式化都会造成噪音。如果上游 readiness 缺少 `Source Snapshot`/`Evidence Signature`，下游命令不能把它当作稳定准入凭证；应先回到拥有该 readiness 的命令补写或刷新。只有当当前证据清楚、缺口只是格式遗漏且不影响准入、风险关闭、trace 关闭或实现准入时，才可在 owner 命令内补齐签名后继续。`/sp.analyze` 发现 snapshot/signature 缺失、过期或不一致时应先给出 stale/mismatch finding 和 owner route；`/sp.gate` 只有在该不一致影响当前阶段入口、PASS、风险关闭或实现准入时才阻断。

`[src:user-confirmed]`、`USER_CONFIRMED`、`VERIFIED_BY_HUMAN` 或类似“已人工确认”标记不能由模型自证。模型可以写 `PENDING_USER_CONFIRMATION`、`NEEDS_USER_CONFIRMATION` 或 `NEEDS_DECISION`，但只有附近存在可追溯的 `Decision Record`、`Decision ID`、`clarifications.md`、`clarify-log.md` 或等价人工选择记录时，才能把事项写成已确认。缺少决策记录时，应保留为待确认状态并路由到 `/sp.clarify`。
轻量脚本对人工确认标记只能做邻近证据扫描，所以 `HUMAN_CONFIRMATION_EVIDENCE_MISSING` 是候选 `WARN`，不是自动硬阻断。真实项目可能把决策记录放在 `clarifications.md`、`clarify-log.md`、决策台账或跨文件 handoff 里；`/sp.analyze` 和 `/sp.gate` 应读取引用到的决策记录后判断是否有效，而不是只凭脚本 WARN 直接判失败。

轻量脚本输出 JSON 时应提供 `needsHumanReview` 机器字段。该字段为 `true` 表示本次 findings 中存在未支撑的人工确认标记或缺少 owner review 这类“可能需要人工确认”的候选项。它不是新的硬门禁，也不改变 `WARN` 的基本含义；它的作用是让 headless runner、批处理脚本和后续 agent 不会把普通 warning 与人工决策风险混在一起。非交互环境看到 `needsHumanReview=true` 时，必须读取已有决策记录；如果读不到，就输出 `NEEDS_DECISION`、`BLOCKED` 或路由到 `/sp.clarify`，不能用模型判断替代人工确认。

轻量机械检查只能证明结构和链接条件，不等于证明业务语义真实正确。脚本可以发现缺少 Evidence Signature 字段、明显的 trace/open-items 断链、未支撑的人工确认标记、主体混淆和自我 PASS 信号；但业务含义是否合理、需求是否真的满足、风险是否可接受，仍必须由 `/sp.analyze`、`/sp.gate` 结合 source docs、trace、open-items、代码/测试证据和人工决策判断。

固定状态包括：

- `READY_FOR_FLOW`：`/sp.specify` 和必要 `/sp.clarify` 已经给出足够稳定的业务目标、用户、范围、验收和关键约束，可以进入业务流程设计。
- `WAITING_FOR_BATCH_REVIEW`：`/sp.flow` 或 `/sp.ui` 已经生成当前批次的草稿、确认页或确认清单，但人工尚未完成批量授权；此状态不能支撑下游稳定阶段。
- `READY_FOR_UI`：`/sp.flow` 已经形成业务流程、节点、分支、状态、UI 契约和必要确认；在默认批量策略下，必须是 flow batch 已确认后才可以进入业务 UI 设计。
- `READY_FOR_PLAN`：`/sp.ui`、flow、spec、clarify 的关键约束足够稳定；在默认批量策略下，必须是 UI batch 已确认后才可以进入交付/实现规划。
- `NEEDS_CLARIFY`：缺口可以通过澄清问题解决。
- `NEEDS_DECISION`：需要人工在 2-4 个选项中做产品、风险、合规、回滚、拆分或验收选择。
- `BLOCKED`：自动推进不安全，且当前命令无法通过读取现有材料恢复。
- `DRAFT_ONLY`：当前产物是草稿、模型推理方案、未确认视觉方案或未通过检查的阶段输出。

下游命令必须消费上游 `Stage Readiness`。`/sp.flow` 只能在上游状态为 `READY_FOR_FLOW` 时生成稳定流程；如果看到 `SP_STAGE_SEED`、`NEEDS_CLARIFY`、`NEEDS_DECISION`、`WAITING_FOR_BATCH_REVIEW`、`BLOCKED`、高影响 open item、泛化模板或过期 spec，应停止并回到 `/sp.specify` 或 `/sp.clarify`。`/sp.ui` 只能在 flow 状态为 `READY_FOR_UI` 时生成稳定业务 UI；如果 flow 是未确认草稿、等待批量确认、缺少 port contract、缺少 UI 契约或主体混淆，应停止并回到 `/sp.flow`。`/sp.plan` 只能消费 `READY_FOR_PLAN` 的 UI；看到 flow 或 UI 的 `WAITING_FOR_BATCH_REVIEW` 时，必须提示先完成对应批量确认，不能把待确认草稿转成实现规划依据。

模型推理只能作为候选草稿，不能变成阶段通过凭证。凡是 `Source: model-inferred`、`[INFER:DRAFT]`、`[uncertain:*]` 或未确认 visual review 的内容，都不能支撑 `READY_FOR_FLOW`、`READY_FOR_UI`、`READY_FOR_PLAN`、风险关闭、stable trace、gate PASS 或实现准入。只有当它被用户确认、被上游源文档吸收，或被 analyze/gate 等价证据检查后，才能从草稿转为稳定事实。

如果用户在任一阶段提出需求改动，当前命令必须重新评估 Stage Readiness。改动影响目标、范围、用户、验收、业务规则、权限、流程、UI 行为、数据意义或风险边界时，不能继续沿用旧凭证，应自动退回最近的 owner 命令：目标/范围回 `/sp.specify`，不清楚的决策回 `/sp.clarify`，流程规则回 `/sp.flow`，界面行为回 `/sp.ui`，交付边界回 `/sp.plan`。

### Flow/UI 批量确认策略

Flow/UI 的默认人工确认策略是 `batch`，也就是先集中确认当前 feature、workset 组或依赖域内所有需要确认的 flow，再集中确认所有 UI。系统内部可以分模块、分页面、分批次生成草稿和预览，但默认不在每个模块刚生成完时打断用户要求单独确认。这样可以把设计师、业务 owner 和技术 owner 的介入集中到少数确认窗口，减少跨天、跨周重复会议和上下文遗忘。

确认策略字段固定为 `confirm_strategy: batch | hybrid | rolling`，默认值为 `batch`。`batch` 表示人工确认集中发生；`hybrid` 表示先确认高风险或强依赖核心模块，再批量确认其余模块；`rolling` 表示每个模块或小范围变更生成后立即确认。只有用户显式要求、批量范围超过可理解上限、存在强跨模块依赖、核心流程仍在探索、reviewer 群体无法共同参与、上游在确认期间发生语义变化，或当前只是小型 hotfix 时，才建议从 `batch` 降级为 `hybrid` 或 `rolling`。

默认流程是：

1. `/sp.flow` 生成当前确认范围内所有 flow 草稿、预览和 batch review manifest，状态写为 `WAITING_FOR_BATCH_REVIEW`。
2. 用户集中完成 flow batch 确认；确认文档写入 `flow-confirmation.md`，并锁定 source snapshot、batch scope、确认人、偏差项和授权范围。
3. 只有 flow batch 已确认且未 stale 时，`/sp.flow` 才能把 readiness 提升为 `READY_FOR_UI`。
4. `/sp.ui` 消费已确认的 flow batch，生成当前确认范围内所有 UI 草稿、预览和 batch review manifest，状态写为 `WAITING_FOR_BATCH_REVIEW`。
5. 用户集中完成 UI batch 确认；确认文档写入 `ui-confirmation.md`。
6. 只有 UI batch 已确认且未 stale 时，`/sp.ui` 才能把 readiness 提升为 `READY_FOR_PLAN`。

每个 batch 必须有可追溯边界：`Batch ID`、`Batch Scope`、`Batch Created From`、`Source Snapshot` 或 `Evidence Signature`、`Included Items`、`Excluded Items`、`Review Owner`、`Confirmation Deadline` 或有效期提示、`Scoped Approval Policy` 和 `Fallback Strategy`。部分通过默认不能直接解锁下游；未通过项要么拆成明确的子 batch 并更新依赖关系，要么保持整个 batch 为 `WAITING_FOR_BATCH_REVIEW` / `NEEDS_DECISION`。`SCOPED_CONFIRMATION` 只能授权明确列入 `confirmed_items` 或 `decision_recorded_items` 的范围；任何依赖 `needs_decision_items`、`unresolved_decision_items` 或未解决 child batch 的下游计划、任务和实现都必须阻断。

确认结果必须写入仓库内 Markdown 授权文档：flow 使用 `specs/<feature>/flows/review/flow-confirmation.md`，UI 使用 `specs/<feature>/ui/review/ui-confirmation.md`。浏览器 localStorage、临时 DOM 状态、截图、review manifest 或 HTML 页面本身都不是授权证据；它们只有在结果被写入确认文档，并被 `Stage Readiness` 的 `Visual/Human Review` 或 `Confirmation Artifact` 引用后，才可被下游命令消费。固定 renderer 可以保存右侧确认栏宽度这类本机显示偏好，并针对低分辨率屏幕提高右栏可读字号；这些偏好只影响本地阅读体验，不得进入确认包，也不得和 flow/UI 授权状态混在一起。

确认文档必须使用机器可读 frontmatter。最低字段包括：

```yaml
document_type: sp_human_confirmation
command: /sp.flow | /sp.ui
feature: <feature>
schema_version: 1
review_artifact: .specify/review/renderer/speccompass-review-renderer.html
review_artifact_mode: fixed-renderer | local-writer | server-preview | markdown-only
review_data_artifact: specs/<feature>/flows/review/flow-review-data.json | specs/<feature>/ui/review/ui-review-data.json
review_data_schema: .specify/review/schemas/flow-review-data.schema.json | .specify/review/schemas/ui-review-data.schema.json
review_validator: .specify/review/scripts/validate-review-data.mjs
confirm_strategy: batch | hybrid | rolling
batch_id: <Batch ID>
batch_scope: "<confirmed scope>"
batch_review_status: CONFIRMED | SCOPED_CONFIRMATION | NEEDS_REVISION | STALE | REVOKED
source_artifacts_snapshot:
  - path: <source artifact>
    digest: sha256:<...> | not-computed
    semantic_scope: [<requirements | flow | ui | acceptance>]
    anchors: [<stable heading or ID>]
source_hash_verified: MATCH | STALE | NOT_CHECKED
confirmed_by:
  name: <human name or role>
  role: owner | reviewer | stakeholder
  confirmed_at: <ISO-8601 or run label>
owner_approval:
  required: true | false
  status: CONFIRMED | PENDING | NOT_REQUIRED
human_confirmation: CONFIRMED | NEEDS_REVISION | SCOPED_CONFIRMATION | STALE | REVOKED
authorization_scope: READY_FOR_UI | READY_FOR_PLAN | BLOCKED | <narrow confirmed scope>
confirmed_items: [<flow/file-level labels or IDs authorized without node-level choice>]
needs_decision_items: [<node labels or IDs whose saved option next_exit starts with needs-decision; OPTION_B.next_exit must use this route>]
unresolved_decision_items: [<node labels or IDs with no selected option or no exit path>]
draft_excluded_items: [<node labels or IDs excluded because they were in DRAFT state at writeback time>]
decision_recorded_items: [<node labels or IDs whose saved option next_exit is a concrete continuation route and not needs-decision; usually OPTION_A/C/D>]
revision_requests:
  - target_ref: <module:item:node stable reference>
    target_label: <visible module / flow-or-screen / node label>
    review_type: flow | ui
    change_type: <flow-or-ui revision type>
    selected_option: OPTION_A | OPTION_B | OPTION_C | OPTION_D
    reviewer_note: <natural-language revision request / 自然语言修改意见>
    expected_model_action: <what the next /sp.flow or /sp.ui run should revise>
    next_exit: <owner route or next stage>
child_batches:
  - batch_id: <child-batch-id>
    status: pending | confirmed | needs_revision | stale
    dependency_impact: <what remains blocked>
items_with_deviation:
  - id: <item-id>
    severity: deviation-minor | deviation-moderate | deviation-critical
    note: <deviation or inference note>
reservations: [<explicit reservations>]
revocation:
  status: active | revoked | superseded
  revoked_by: <name-or-None>
  revoked_at: <ISO-8601-or-None>
```

历史兼容只允许发生在读取旧确认材料时：旧 `owner_approval.status: APPROVED` 可以兼容解释为 `CONFIRMED`，旧 `REJECTED` 可以迁移或解释为 `NEEDS_REVISION`。新写入或新生成的 flow/UI 确认文档不得继续使用 `APPROVED` 或 `REJECTED` 表示确认结果，必须使用 `CONFIRMED`、`NEEDS_REVISION`、`SCOPED_CONFIRMATION`、`STALE` 或 `REVOKED`。

Flow/UI 确认页由可复用的 `speccompass-review-data` 工具链驱动：普通 `/sp.flow`、`/sp.ui` 只填结构化 review data / structured review data，不得修改 renderer，也不得为确认页编写 HTML/CSS/JS。review data 是待审内容 / review data is draft review content；确认页不是编辑器 / not an editor，不直接修改 flow 或 UI 设计 / does not directly edit flow or UI design。审核人接受推荐时只先写入浏览器本地选择；正式授权必须通过下载确认包 / download confirmation package，并由模型把确认包写回确认文档。审核人不接受推荐时，必须选择 Flow 或 UI 专属 `change_type`，写自然语言修改意见 / natural-language revision，并由下载确认包写入 `revision_requests`；复制摘要只在下载不可用时作为兜底。下一轮 `/sp.flow` 或 `/sp.ui` 必须先读取确认文档中的 `revision_requests`，结合 PRD/spec/flow/UI 来源重新推理并修订结构化数据，再重新生成确认页，而不是要求审核人在浏览器中直接增删改流程或界面。Flow 修改类型包括 `ADD_NODE`、`DELETE_NODE`、`MODIFY_NODE`、`MODIFY_BRANCH`、`ADD_EXCEPTION_PATH`、`SPLIT_SUBFLOW`、`MERGE_SIMPLIFY`、`ADD_ENTRY_EXIT`、`OTHER`；UI 修改类型包括 `ADD_SCREEN`、`DELETE_SCREEN`、`MODIFY_SCREEN_STRUCTURE`、`ADD_REGION`、`MODIFY_REGION_LAYOUT`、`ADD_COMPONENT`、`DELETE_COMPONENT`、`MODIFY_FIELD_ACTION_COPY`、`ADD_STATE`、`MODIFY_INTERACTION`、`ADD_PERMISSION_DISPLAY`、`OTHER`。renderer directory / renderer 目录 `.specify/review/renderer/` 是 multi-file fixed infrastructure / 多文件固定基础设施：`speccompass-review-renderer.html` 只是入口页，`styles/*.css` 与 `scripts/*.js` 是共享页面基础设施；普通命令不得修改 HTML 入口、CSS、JavaScript、布局规则、点击处理、localStorage 草稿、下载确认包、复制摘要或右侧确认栏状态机。固定 renderer 主入口必须使用短参数 / short URL parameter：flow 审核页是 `.specify/review/renderer/speccompass-review-renderer.html?flow=<feature>`，UI 审核页是 `.specify/review/renderer/speccompass-review-renderer.html?ui=<feature>`；命令收尾必须优先提示启动器输出的 Web 审核页，不得把 `flow-review-batch.md` 或 `ui-review-batch.md` 当作主入口。renderer 通过浏览器 URL 路径解析 `specs/<feature>/flows/review/flow-review-data.json` 或 `specs/<feature>/ui/review/ui-review-data.json`，不依赖 macOS/Windows/Linux 文件分隔符。无短参数时可以在受支持的来源上保留手动加载控件，但这不是不受支持传输方式的兜底。flow 数据写入 `specs/<feature>/flows/review/flow-review-data.json` 并使用 `.specify/review/schemas/flow-review-data.schema.json`；UI 数据写入 `specs/<feature>/ui/review/ui-review-data.json` 并使用 `.specify/review/schemas/ui-review-data.schema.json`；两者都必须用 `.specify/review/scripts/validate-review-data.mjs` 校验。校验失败不能收尾，不能提升 readiness；模型可修的问题必须继续修复，确实需要人工信息或授权的缺口才写成带 owner route 的 blocker。

交互复核必须在项目根目录启动固定服务：flow 使用 `node .specify/review/scripts/serve-review.mjs --flow <feature>`，UI 使用 `node .specify/review/scripts/serve-review.mjs --ui <feature>`。启动器只绑定 `127.0.0.1`，只有在 renderer 和 review data 均返回 HTTP 200 后才输出 `SPECCOMPASS_REVIEW_URL=`；模型必须保持该进程运行并把原样 URL 交给用户，不能猜测或替换端口。交互复核禁止使用 `file://`，并且 `localhost` 不接受；HTTPS、`::1` 和其他主机名同样不接受。已有项目如缺少这套固定基础设施，使用 `specify init --force` 刷新 `.specify/review/`；`specs/` 下的项目 review data 和确认文档不属于该固定目录。

确认栏提供三个互不混淆的范围按钮：`当前视图按推荐保存` 始终处理当前 flow/UI 项的全部节点，即使当前已聚焦单个节点；`当前模块按推荐保存` 处理当前业务模块内的所有 flow/UI 项；`当前需求按推荐保存` 处理当前加载 feature 的所有模块和项目，不跨到 `specs/review-index.json` 中的其他需求。三者都只能填写带有效推荐的 `MISSING` 节点，不能覆盖草稿或已有选择；执行前必须询问当前范围还有多少未完成、是否按推荐保存。下载确认包前还必须对当前需求执行同样的未完成项检查，询问是否将可处理的剩余项按推荐保存，缺少有效推荐的节点仍需人工处理并阻止下载。

Flow/UI 复核页还必须维护轻量需求索引 `specs/review-index.json`。这个文件只服务确认页导航，不是业务流程或 UI 内容。`/sp.flow` 生成或修复 flow review data 时设置当前真实 feature 的 `has_flow_review: true`，保留 `has_ui_review`；`/sp.ui` 生成或修复 UI review data 时设置 `has_ui_review: true`，保留 `has_flow_review`。两者都必须保留已有真实 feature 条目和顺序，只在当前真实 feature 缺失时补入，不能为了导航效果虚构未来的 002/003 slug。索引根字段为 `schema_version`、`project`、`updated_at`、`features`，每个 feature 条目包含 `order`、`feature`、`title`、`has_flow_review`、`has_ui_review`。固定 renderer 顶部用该索引展示 `上一需求 / 需求 X/Y / 下一需求`，这里的需求对应 001/002/003 级 feature；当前 feature 内部导航必须写成 `上一业务模块 / 业务模块 X/Y / 下一业务模块`，不能再写成容易混淆的 `上一模块 / 模块 X/Y / 下一模块`。如果目标 feature 对应的 flow 或 UI review data 尚未生成，导航按钮应禁用并提示 `待生成`；如果当前页有本地草稿或未导出的确认选择，跨需求跳转前必须提醒先下载确认包。

example data must not replace generation rules / 实验数据不能替代生成规则。`docs/examples/review/*`、实验 JSON 和一次性 preview HTML 只能作为 few-shot、视觉冒烟测试或人工观察样例，不能替代 `/sp.flow`、`/sp.ui`、`speccompass-review-data` skill 或 `validate-review-data.mjs` 的生成规则修复。正式验收必须看当前 feature 的 `flow-review-data.json` 或 `ui-review-data.json` 是否由 PRD/spec/flow/UI 来源重新生成或修复、是否通过 `validate-review-data.mjs`、是否能被固定 renderer 正确展示。手工把示例文件改得好看，不代表 SP 机制已经能稳定生成合格确认内容。

Flow/UI 确认结果的主出口是下载确认包 / download confirmation package，不再依赖无限长度的剪贴板文本；复制摘要 / copy summary 只作为浏览器下载受限时的兜底。确认包必须是 JSON，`format` 固定为 `speccompass-confirmation-package`，并包含 `target_path`，且 `target_path` 只能指向 `specs/<feature>/flows/review/flow-confirmation.md` 或 `specs/<feature>/ui/review/ui-confirmation.md`，不能写入仓库内其他文件。模型收到后应按包内 `package_instruction` 直接写回该确认文档。确认包超过 `100000` UTF-8 bytes 时必须自动分包；分包不能硬切字符串或拆断半条选择记录，应优先按模块边界拆，必要时按完整 record 拆。每个分包都必须自包含并重复 `package_session_id`、`review_type`、`batch_id`、`review_data_id`、`source_review_data`、`target_path`、`part_index`、`part_count`、`total_record_count`、`part_record_count`、`continuation_from`、`continuation_to`、`package_instruction` 和相关 `module_context`；`module_context` 必须跟随每个模块片段，每条 record 也必须重复 `module_id` / `module_title`，让被分到新包中的选择仍能知道归属模块。多包写回时必须先收齐所有文件，确认 `package_session_id` 相同、数量等于 `part_count`、每包 `total_record_count` 一致，且所有 `part_record_count` 之和等于 `total_record_count`，再按 `part_index` 顺序合并为一次 coherent target_path update / 连贯写回；不得把任意单个 part 当成完整确认文档覆盖写入。`package_instruction.merge_verification` 必须用机器可读文字重复这条校验公式：收齐同一 `package_session_id`、`review_type`、`batch_id`、`review_data_id`、`source_review_data`、`target_path` 的 exactly `part_count` 个文件，确认每包 `total_record_count` 一致，且 `sum(part_record_count) == total_record_count` 后才能写回；如缺包、重复、串包或公式不成立，必须停止并要求补齐正确包，不能写入 `target_path`。多包导出时页面必须保留可见的多包下载链接 / manual part download links，防止浏览器拦截连续自动下载；任何本地选择变更后必须清空旧链接，避免 stale package 被误交付。`continuation_from` / `continuation_to` 只是 boundary anchors / 边界锚点，用于检查连续性，不表示记录被切断，也不得替代 `target_path` 或 `module_context`。确认包必须显式标记 DRAFT / `draft_excluded_items` 为未授权草稿：这些记录只能作为后续处理线索，不能写成已授权决策。浏览器 localStorage、下载按钮状态、复制成功状态和截图仍不是授权证据；只有确认包或兜底摘要被写入 `flow-confirmation.md` / `ui-confirmation.md` 后，才具备授权意义。

UI review data is not flow review data / UI 审核数据不是 flow 审核数据。UI 的中间预览必须由 `screens[].screen_layout`、`screen_regions` 和可见 `components` 描述；可选 `states` 只补充屏幕状态说明；`nodes` 只用于右侧确认栏的决策和授权模型，不能用一组 flow 节点/边冒充界面。屏幕布局 / screen layout 要说明这是表单、看板、列表详情、向导、详情、设置、页面地图、弹窗或自定义结构；每个区域要写清位置、用途和组件；按钮、输入框、表格、卡片、导航、空态、错误提示、徽标、图表说明等都要作为结构化组件出现。确实重要的动态行为使用 dynamic marker / 动态标注或纯文本标注，例如“此处数字未来会自动更新”，不得写动画、弹窗实现或 renderer 指令。决策选项需要深度推理 / decision options require deeper reasoning：每个需要人工判断的 UI 节点都必须用人话说明真实界面或交互背景，节点级必须提供 `背景信息` / `decision_background` 和 `决策摘要` / `decision_summary`；`must_confirm` 节点必须提供 3-4 个可执行选项，普通人工判断默认 3 项，低风险二元判断只有在 `options_count_rationale` 说明为什么 2 个出口足够时才允许 2 项。每个选项必须给出 `收益` / `benefit` 和 `代价` / `cost`，推荐项必须额外给出 `推荐理由` / `recommendation_reason`，让非技术 reviewer 能判断选择会解锁、延后或阻断哪些后续工作。`consequence` 和 `next_exit` 是写回与路由用的执行字段 / execution field，仍然必须存在：`consequence` 说明选择后模型或责任人要改什么，`next_exit` 给出可执行出口并点明谁继续处理。选项文案必须说明不选推荐的代价，并在同一节点内保持真实差异，不能只是把同一条路线改写成“保留 / 补充 / 局部调整 / 后续完善”。生成选项前必须先选决策模板：范围决策说明哪些 screen、区域、状态或 action 进入本批；门禁决策说明界面是否能发布、是否要补材料、是否要转人工审核；降级决策说明完整能力不可用时采用什么更简单的界面或人工兜底。常见出口必须按 `/sp.clarify` 的拍板包标准写：needs-decision 选项必须说清缺什么、谁拍板、哪些下游工作暂停；split-flow 选项必须说清拆成哪些子流程；推荐项必须说明为什么比更慢、更重或更保守的替代方案更适合。禁止复用模板句、stock phrase 或 boilerplate，例如“当前依据看起来正确”“后续完善相关内容”；同一节点内多个选项如果只是换编号但背景、收益、代价和推荐理由相同，也视为模型偷懒。面向 reviewer 的技术词必须改成业务语言，确实必须保留英文或术语时，要在同一句给出中文说明或解释。命令收尾前必须运行 `.specify/review/scripts/validate-review-data.mjs`，让校验器拦截重复选项文案、模板句、未解释技术词、空泛出口、缺失背景/摘要/收益/代价/推荐理由、缺失“谁继续处理”、必审节点缺少 why-now 说明，以及多个选项的收益或代价高度相似；这类失败属于模型可修质量问题，不能转成让用户人工兜底。

确认页页面代码是共享基础设施，不是每次命令生成物。普通 `/sp.flow`、`/sp.ui` 不得把 HTML、CSS、JavaScript、SVG、CSS class、事件处理器或页面布局指令写进任何 review data 字段；`schema_notes`、`trace_notes` 等自由文本备注也只能写纯文本业务说明。确认页不追求复杂动画 / no complex animation，不使用复杂弹窗；展示位置、尺寸、点击选项、右侧确认栏、持久化草稿与下载确认包稳定性优先，复制摘要只作为兜底。固定 renderer 可以使用极简 native `<dialog>`，但 only for explanation or preview / 只用于说明或预览，必须使用安全 DOM/text API 而不是 `innerHTML`，并且 must not carry recommendation choices / 不得承载推荐/非推荐选择、审核意见、授权确认、下载确认包、复制摘要或全局通知；审核选择、意见、授权写回和导出动作仍只能在右侧确认栏、localStorage 草稿、下载确认包、兜底摘要和确认文档链路中完成。确实重要但当前 renderer 不承载的动态效果，应在数据里用纯文本标注 / plain text markers 说明，例如“此处数字未来会自动更新”，不能写成实现指令。固定 renderer 可以在打开页面时运行轻量 runtime validation：重复或缺失 `node.id` 是阻断错误，因为会让本地选择串到其他确认点；缺失推荐项、选项数量异常或浏览器未开放 localStorage 只能作为可见警告。这只是防护栏；命令收尾前仍必须运行 `validate-review-data.mjs`。浏览器本地选择按 review type、artifact path、batch id、source snapshot 和当前 module/item/node 结构隔离，防止旧 review data version 的草稿静默串用；但 localStorage 仍不是授权证据。下载失败或复制摘要失败时不能标记为已导出；存在已保存但未写回 `flow-confirmation.md` 或 `ui-confirmation.md` 的选择时，页面应在离开、关闭或刷新前提醒。右侧确认栏必须把授权路径拆成“本地选择 → 下载确认包 → 写回确认文档”三步，并把“复制摘要”明确标成 fallback，避免把浏览器草稿或按钮点击误当成 git 跟踪的正式授权。

节点级确认字段必须按所选选项的 `next_exit` 写入，而不是只按按钮名猜测：saved option 的 `next_exit` 以 `needs-decision` 开头时进入 `needs_decision_items`；按约定 `OPTION_B.next_exit` 必须使用 `needs-decision` 路由，且 `OPTION_B` 不能被统计为已确认。saved option 的 `next_exit` 是具体继续路线且不以 `needs-decision` 开头时，进入 `decision_recorded_items` 和 `decision_records`；这通常是 `OPTION_A/C/D`。没有选择或没有出口路径的节点 / nodes with no selected option or no exit path 进入 `unresolved_decision_items`；仍处于 DRAFT 状态 / nodes in DRAFT state 的待提交草稿只能进入 `draft_excluded_items`，因为草稿不能进入 `decision_records`，不能被当成普通未处理决策，也不具备授权意义。确认摘要可以提示 DRAFT 节点存在，并只能把它们列入 `draft_excluded_items` 排除清单，不得把草稿选项写成已授权节点决策。已验证或无需节点级选择的流程/文件级授权才进入 `confirmed_items`。

下游命令必须把确认文档当作授权链的一部分，而不是只相信上游口头结论。`/sp.plan`、`/sp.tasks`、`/sp.implement`、`/sp.analyze` 和 `/sp.gate` 消费 flow/UI 事实时，必须检查确认文档是否存在、`human_confirmation` 是否为 `CONFIRMED`、owner approval 是否满足、`authorization_scope` 是否覆盖当前用途、source snapshot 是否未 stale。缺失、等待确认、部分确认未拆分、需要修订、撤销或 stale 都不能支撑 `READY_FOR_PLAN`、任务包、实现准入、gate PASS 或风险关闭。

`/sp.tasks` 是实现任务授权链上的最后一个拆分点，不能把未确认的 flow/UI 草稿事实转换成 `Mode: impl` task packet。它生成任务前必须同时核对 `plan.md` 的 `Implementation Readiness`、flow/UI 的 `Stage Readiness`、对应确认文档、授权范围和 source snapshot；如果 flow/UI 采用默认 batch 策略，则只有 `flow-confirmation.md` 与 `ui-confirmation.md` 均满足确认、owner approval、未 stale 且覆盖当前任务范围时，才允许生成消费这些事实的实现任务。`SCOPED_CONFIRMATION` 只能在未确认部分已经拆成 child batch、依赖边界清楚、当前任务不消费未确认范围时，作为窄范围输入继续。

提示机制也要服务批量确认：首次进入确认范围时用 `INFO` 说明默认 batch-first 原因；批次生成完成时用 `AUTH` 提示集中确认；上游变化导致批次基线失效时用 root `STALE` 折叠派生 stale；下游命令试图越过待确认 batch 时用 `BLOCK` 指向 owner route。重要提示应稳定输出这些字段：`NOTIFY_TYPE`、`MESSAGE`、`WHY_NOW`、`IMPACT`、`REQUIRED_ACTION`、`BLOCKS_STAGE`、`NEXT_COMMAND`、`DO_NOT_RUN` 和 `WRITE_BACK`。

Flow/UI 确认页采用统一模板：顶部显示 `SpecCompass — <项目名> / <feature>`、简短 specCompass 机制说明和页面标题；左侧或中部展示带可见标签的 flow 图、流程表、UI 屏幕或项目 UI 全貌；右侧是一条约 280-320px 的窄确认栏，使用 Tiffany Blue `#0ABAB5` 作为主色，包含 batch 摘要、选中项详情、状态提示、意见输入、逐节点决策选项卡、逐节点反馈输入框、待决策列表、阻塞或 stale 列表和批量确认按钮。每个需要人工判断的节点必须提供分层可执行选项：`must_confirm` 节点必须提供 3-4 个可执行选项，普通人工判断默认 3 项，低风险二元判断只有在 `options_count_rationale` 说明为什么 2 个出口足够时才允许 2 项；默认优先展示节点 `背景信息`、`决策摘要`，以及每个选项的 `收益`、`代价`，推荐项额外展示 `推荐理由`。选择后模型动作、后续出口、授权追溯和确认所选方案必须放入折叠详情或确认记录中；`consequence`、`next_exit` 作为执行字段 / execution field 继续用于写回和路由。不能把“通过 / 暂缓 / 退回 / 阻塞”作为节点级主按钮。右侧反馈确认栏是 flow 确认页的合格条件；缺失时，该 review artifact 不能作为授权证据，也不能支撑下游 `READY_FOR_UI` 或实现准入。确认页必须显示写回路径，并能让用户清楚知道确认结果需要进入 git 跟踪。

面向人工效率的 flow 确认页还必须显示 project business overview / 项目整体业务地图、module summary / 模块简介和 per-flow summary / 流程简介，让 reviewer 先理解整个项目包含哪些业务模块、当前模块负责什么、当前流程处理什么，再进入节点级确认。中间图形区必须提供 fullscreen / 全屏查看动作，便于复杂 Mermaid 图放大核对。右侧确认栏必须提供“按推荐确认”“标记需补充决策”“重置可见项”等批量按钮，并始终显示 selected diagram, subflow, or node / 选中的图、子流程或节点的确认状态与反馈。旧的 bulk approve / 全部通过 和 bulk block / 全部阻塞 按钮必须从节点级主交互中移除，不能继续作为节点卡操作按钮；历史页面或文档中出现这些名字时，只能在迁移说明中解释为新机制的“按推荐确认”和“标记需补充决策”。“重置可见项”只清除当前视图的浏览器本地状态，使节点回到未选择（MISSING），不删除已经写入 `flow-confirmation.md` 的正式授权记录。索引预览、当前图源文和长源文必须使用 collapsible / 折叠面板，避免右侧栏被固定源文占满而无法完成确认。

右侧确认栏必须跟随中间当前视图，而不是默认堆满整个模块的所有节点。中间显示单张 Mermaid 图时，右栏节点清单只显示该图节点；中间显示索引预览时，右栏才显示索引级 review 标签或文件级确认项。索引预览只适合阅读和索引级确认，不能代表某一张具体 Mermaid 图的授权；只要当前模块存在 Mermaid 图，索引模式下必须禁用“当前图按推荐确认”，并提示 reviewer 先切换到具体流程图。复制或写回的确认摘要仍必须覆盖整个 batch 的所有模块、所有图文件、所有索引级标签和所有节点级反馈，避免为了降低当前审核负担而遗漏授权范围。

点击主流程图节点后，右侧节点栏只显示该确认点，并提供清晰的“显示全部确认点”动作来取消点选、恢复完整清单。左侧集中审核台必须为每个模块只显示一个红色的“待处理必审 X/Y”，其中 X 是未完成的必审节点，Y 是总必审数量 / total must-confirm，且必须来自节点级保存状态和图上真实节点的同一来源；也就是说，Y 只统计能够在 Mermaid SVG 中显示红色必审标记的 diagram-backed 节点。Recommended nodes are not included in the red must-confirm pending count / 建议确认不计入红色待处理必审；页面需要用独立的紧凑提示显示建议确认待处理数量，避免 reviewer 把 recommended 未处理项误认为已经完成。索引级确认项、文件级兜底确认项、折叠源文提示和只用于授权摘要的记录仍可进入复制/写回摘要，但不得进入左侧模块总数。左侧不得再叠加“当前图必审”或“当前视图必审”第二口径。右侧确认栏、模块事实区、选中节点事实区、批次事实区和当前视图区也不得重复显示模块级“待处理必审 X/Y”；右侧可以显示当前可见节点的操作反馈，但不能形成第二个统计口径。点击模块或切换图只改变中间和右侧的当前视图，不能改变 Y，也不能让 reviewer 误以为模块总必审发生变化；推荐选项保存、非推荐选项提交、重新选择、重置和当前流程批量操作后都要实时刷新 X。主流程图中所有被归类为“必须确认”的节点必须在节点内部右上角带红色标记，避免高风险判断藏在普通节点里；节点已处理后，标记可以弱化或切换为 Tiffany Blue。点击主流程图节点或右侧节点卡时，两侧都必须出现清晰选中态并同步 `aria-pressed`。不会随节点变化的信息应使用折叠、tooltip / 悬浮提示、popover 或按钮提示，不要常驻挤占右栏；右栏信息必须按整体到细分分组，同类内容放在一起，同一信息除非需要强调只显示一次。

右侧节点确认项必须保持紧凑：node feedback is collapsed by default / 节点反馈默认折叠，只在 reviewer 需要记录具体修改意见、需补充决策原因或确认条件时展开输入框。右侧确认栏还必须提供 current-flow bulk / 当前流程批量 操作，用于对中间当前图的节点一次性按推荐确认、标记需补充决策或重置；这些按钮只能作用于当前图或当前索引视图，不能误改同模块其他流程图的节点状态。

主流程图和节点逐项确认必须建立 two-way linkage / 双向联动。点击右侧节点卡（clicking a node card）时，中间 Mermaid 图中的对应节点必须使用 Tiffany Blue 高亮、更新 `aria-pressed`，并在选中详情中显示该节点说明；点击流程图节点（clicking a diagram node）时，右侧对应节点卡必须变色、同步 `aria-pressed` 并滚动到可见。节点卡必须支持 `role="button"`、`tabindex="0"` 和 `Enter/Space` 键盘选择。长节点标签（long node labels）必须在 Mermaid 渲染前进行 wrap / 换行，包含 `A[长节点] --> B[长节点]` 这类节点和连线同一行的写法；CSS 还必须设置 `white-space: normal`、`overflow-wrap` 或等价规则，禁止通过缩小整张图字体来掩盖文字过长问题。时序图必须识别为 `sequenceDiagram` 并保留 Mermaid 原生时序语法，只翻译可读消息文本，不得套用 flowchart 节点换行包装；`participant` 或 `actor` 的中文、空格、斜杠、标点或翻译后别名必须输出为安全双引号形式，例如 `participant Actor as "管理员角色 / 系统角色"`，并转义反斜杠和双引号，避免 Mermaid 解析失败。切换图时必须先清空旧 SVG、显示“正在渲染”，并使用 render token 或等价机制阻止旧的异步渲染结果覆盖当前图。

flow 确认页必须先区分业务层面与系统/架构层面。业务层面流程说明用户、业务对象、状态、审批、异常和完成结果，默认由产品经理确认；系统/架构层面流程说明为了支撑业务目标而存在的基线、路由、邻接检查、证据链、跨模块交接或自动化治理，默认由系统负责人或架构负责人确认。产品经理视图可以看到系统/架构层与业务模块的关系，但必须明确写出“无需产品确认”，避免把不属于业务负责人的技术保障流程变成形式化确认。

flow 确认文案必须在生成阶段就按审核对象说人话：业务层面的模块简介、流程简介、节点标题、节点卡短句和选项说明必须先输出产品经理能理解的业务语言；系统/架构层面才使用系统负责人或架构负责人语境。审核页不是文案清洗器，不能先生成技术话术再依赖页面翻译、正则替换或 HTML 展示层清理；页面最多做轻量术语归一、换行和折叠展示。业务模块默认文案不得套用系统/架构兜底；系统/架构话术只能用于 `system_arch` 层，并必须写明“无需产品确认”。模块整体的业务/系统架构层级必须由 feature 身份或明确层级标记决定，不能因为 `flows/index.md` 里出现 direct-neighbor、cross-module、证据链、邻接检查等泛词，就把整个业务模块改判为系统/架构层；这些词只可用于单张图或单个节点的系统/架构提示。精确业务语境匹配必须早于泛匹配，尤其通知/模板/开发者门户/API Key/AI 等名称相近但审核对象不同的模块，必须先匹配真实业务场景，再生成模块和节点说明。

节点逐项确认应收敛为 6 类审核层级，并用颜色小点和短标签展示：`必须确认`、`建议确认`、`存疑`、`关键环节`、`已验证`、`系统/架构确认`。`必须确认`用于影响主业务路径、高风险决策、权限、状态变化或不可逆结果的节点；`建议确认`用于影响较小但值得人工快速核对的节点；`存疑`用于信息不足、来源冲突或需要业务补充意见的节点；`关键环节`用于主流程上的重要步骤，要求 reviewer 理解但不一定逐项授权；`已验证`用于已由上游文档覆盖且无需重复确认的节点；`系统/架构确认`用于超出业务确认范围、由系统负责人处理的节点。已 PRD 验证和已 spec 验证必须合并到同一层级、使用同一颜色，只在备注中写明“已 PRD 验证”或“已 spec 验证”，不能再拆成两种颜色增加审核负担。

### `/sp.flow`：建立业务流程和界面契约

`/sp.flow` 负责业务流程搭建，不负责具体页面布局。它应输出流程主坐标、关键步骤、节点类型、状态、业务事件、分支原因、guard、effect、target state、失败路径，以及需要 UI 参与的界面契约。

`/sp.flow` 和 `/sp.ui` 的建模主体永远是目标业务系统，不是 SP 自身机制。SP 命令、memory 文件、preflight、gate、workset、trace 等词只能作为运行规则和证据管理上下文，不能成为业务流程节点、界面、字段、按钮、用户路径或图中标签。除非目标产品本身就是一个面向用户的 SP/AI/CLI 工具，并且规格明确要求这些概念出现在产品里，否则一旦 flow/ui 产物把 `/sp.*`、`spec.md`、`memory/index.md` 等写成业务内容，就必须视为主体混淆，停止输出，丢弃受影响草稿，输出 `SUBJECT_CONFUSION` blocker 和下一步 owner route。机械检查已经对明确的 meta-product 场景保留窄例外：只有规格说明目标产品确实是开发者/工作流/规格工具，且产物里有业务域、角色、source、验收、坐标或 trace 锚点时，控制面术语才可被视为产品内容。不要在同一轮里继续重生成，避免错误方向反复消耗 token。

这类主体混淆不能只靠模型自觉遵守。轻量检查脚本只扫描 `flows/*` 和 `ui/*` 中明显、低误报的 SP 控制面标记，例如 `/sp.*`、`sp.*`、`memory/index.md`、`trace-index.md`、`open-items.md` 和 `SUBJECT_CONFUSION`。命中时应输出 `SUBJECT_CONFUSION_CONTROL_PLANE_TERM`，并阻断 analyze/gate PASS。`preflight`、`Allowed Write Set`、`Required Checks`、`NEEDS_DECISION` 等词可能是目标业务系统里的合法文案，不应作为机械硬错误；它们只在 `/sp.analyze` 和 `/sp.gate` 的上下文诊断中结合 `spec.md`、source docs、flow/ui 关系和验收证据判断是否跑偏。

`/sp.flow` 和 `/sp.ui` 生成前必须先锁定业务域：目标产品是什么、目标用户是谁、本次处理的业务操作是什么、来源需求或流程锚点是什么。如果这些话无法从 `spec.md`、clarifications 或 flow 合同中说清楚，就不能继续生成，应回到 `/sp.specify`、`/sp.clarify` 或 `/sp.flow` 补齐。这个锁定动作必须发生在生成前，不应只靠最后的自检来纠错。业务域锚点应作为可见内容写入 flow/ui 产物顶部或命令摘要，方便用户和后续 agent 快速判断是否跑偏。

同一 feature 或 workset 如果连续两次因为同一业务边界触发 `SUBJECT_CONFUSION`，说明模型无法可靠区分“目标业务系统”和“SP 执行机制”。此时不能继续自动重试，应升级为 `/sp.clarify`，给出 2-3 个边界选项，让用户明确目标系统是否真的包含工作流监控、AI/CLI/方法论界面或 SP 类概念。

执行要求：

- `/sp.flow` 必须先做恰当的环节拆解，再生成图或表。拆解顺序应自上而下：业务目标、参与角色、生命周期状态、主流程阶段、决策点、异常/恢复路径、非 UI 的系统/外部/定时/人工步骤、UI 契约和验证证据。不能因为用户只说了一句粗略需求，就只生成一个“开始-处理-结束”的空流程。
- `/sp.flow` 的流程图必须降低人工审核负担。单张可审核流程图通常控制在 5-7 个业务节点；8 个及以上业务节点必须提示拆分，并优先拆成 overview 加子流程；10 个及以上业务节点默认不得直接进入确认，必须先拆成子流程，或写明合格的“复杂流程例外理由”。合格例外理由必须同时说明为什么不能拆、前置依赖、后置输出、分段审核顺序和每段通过标准。低风险线性例外（low-risk linear exception）只能用于没有高风险判断、权限、不可逆结果、外部依赖或异常分支的纯线性流程，并且必须写明“不包含高风险判断、权限、不可逆结果、外部依赖或异常分支”，同时提供分段折叠清单（collapsible segment checklist），让 reviewer 按小段核对。复杂流程确实必须放在同一张图中展示时可以接受，但例外理由必须可见、具体、可审查，并且不能把认知负担转嫁给审核人。overview 只展示主阶段、子流程交接、跨角色交接和未解决 blocker；子流程必须单一职责、输入输出边界清楚，并带可见 review 标签。
- 业务节点不能为了满足 5-7 个节点预算而被粗暴合并。只要一个步骤发生业务状态变化、跨角色交接、跨系统交互、权限或审批判断、用户可见结果变化、失败/补偿/恢复路径、持久化副作用或验收证据变化，就应视为独立业务节点或拆到子流程中。复杂流程例外理由不能写成“业务复杂”“不可拆”等套话，必须说明不能拆的具体业务耦合点、前置依赖、后置输出、分段审核顺序和每段通过标准；拆成子流程后，也必须检查每段的前置条件和后置输出是否能对接，避免局部通过但整体断链。
- `/sp.flow` 的图形布局采用自上而下的主干优先布局：主成功路径纵向居中，异常、驳回、补偿、回滚、阻塞和恢复路径向侧边展开；尽量避免交叉线，不为了视觉对称增加无业务意义节点；稳定节点 ID 与图上业务标签分离，图上标签使用简洁业务中文或目标领域用语，便于人工在反馈中引用。
- 固定 SpecCompass review renderer 不是 Mermaid renderer，而是读取结构化 JSON 节点/边并使用原生 SVG/DAG 布局绘制确认页流程图；普通 `/sp.flow`、`/sp.ui` 不能把 `.specify/review/renderer/speccompass-review-renderer.html` 替换成 Mermaid 页面。Mermaid、PlantUML、Graphviz 仍可作为项目流程源文件或外部预览工具。生成 Mermaid 源文件或预览时，不在未验证目标项目接入方式前假设 Mermaid + ELK 可稳定启用；必须把字体控制在 16px 到 18px，设置 `useMaxWidth: false`，禁止整张 SVG 因自适应缩小到不可读，并通过 `nodeSpacing`、`rankSpacing` 等布局参数拉开节点和层级，让主干、分支、异常路径更容易阅读。`sequenceDiagram` 文件必须按时序图渲染，不得被流程图标签换行器改写；其中 `participant`/`actor` alias 只要包含中文、空格、斜杠、标点或经过翻译，就必须安全双引号包裹并转义，避免时序图显示异常；外部 Mermaid 预览切换图时要清除旧 SVG、显示“正在渲染”，并用 render token 或等价 stale-render guard 防止慢返回或失败的旧渲染覆盖当前图。
- flow 确认页在桌面端必须采用固定视口审核壳：左侧模块导航独立滚动；中间图形区和右侧确认栏作为同一个审核工作区滚动，保持图和确认项的对应关系；禁止 sticky/max-height 裁剪右栏控件，不能让反馈框、逐项按钮或复制摘要按钮被右侧边栏自身高度截断。
- flow 确认页右侧确认栏必须只对应中间当前视图：单图模式只列当前图节点，索引模式才列索引级标签或文件级确认项；但索引预览不能替代具体图的授权，只要模块存在 Mermaid 图，索引模式必须禁用当前流程“按推荐确认”，并提示先切换到具体流程图。左侧集中审核台只保留一个“待处理必审 X/Y”，且 Y 必须与 Mermaid 图中可显示红色必审标记的 diagram-backed 节点同源；索引级标签、文件级 fallback 和授权摘要项不进入左侧总数。`NOT_APPLICABLE_FOR_UI` 只表示不进入 UI 阶段，不表示 flow 图不需要审核；如果该模块存在 Mermaid flow 图，flow 确认页仍应允许进入图形审核。下载确认包和写回授权文档必须覆盖整个 batch 的全部图、文件、索引标签和节点反馈；复制摘要只能作为下载失败时的兜底。
- `NOT_APPLICABLE_FOR_UI` 模块只在没有 Mermaid flow 图时允许主视图显示空态；只要存在 flow 图，主视图必须显示（still show）可审核流程图，不能因为 UI 阶段不适用而空白。
- flow 确认页必须处理长节点标签（long node labels）：生成 Mermaid 审核页时要在渲染前对过长业务标签进行 wrap / 换行，包含节点和连线写在同一行的常见 Mermaid 写法，并用 CSS 允许标签正常换行。该换行处理只适用于 flowchart/graph 类流程图；时序图（sequenceDiagram）必须保持 participant/message/activation 等原生结构。不能把字体缩到不可读来容纳长文案。
- flow 确认页必须实现图和右侧节点卡的 two-way linkage / 双向联动：点击右侧节点卡（clicking a node card）时高亮中间图节点，点击流程图节点（clicking a diagram node）时选中右侧节点卡并滚动到可见；两侧都必须同步 `aria-pressed`，右侧节点卡支持 `role="button"`、`tabindex="0"` 和 `Enter/Space`。
- flow 确认页的节点反馈默认折叠（node feedback is collapsed by default），右栏以节点状态、标签、来源和轻量按钮为主，避免 textarea 全量展开造成右栏高度远超中间图；但 DRAFT 节点必须在渲染、刷新或切换模块回来后自动展开反馈输入区，保证“填写意见并提交”的路径始终可见。页面必须提供当前流程批量按推荐确认（current-flow bulk recommended-option）、标记需补充决策（needs-decision）和重置动作，并保证这些动作只影响中间当前显示的流程图或索引节点；current-flow bulk recommended-option acts on the current visible flow or node only / 只保存当前可见流程或节点。批量按推荐保存前提示当前可见未完成数量 / ask how many unfinished visible items remain before bulk saving recommendations，并询问是否都按推荐设置进行保存；重置动作只清除当前视图 localStorage 中的临时选择和临时反馈，使节点回到未选择状态，不影响已经写回的授权文档。若当前图达到 10 个及以上业务节点，且既没有可见、具体的复杂流程例外理由，也没有合格的低风险线性例外，页面必须禁用当前流程“按推荐批量确认”，并提示先拆分，或补充不能拆、前置依赖、后置输出、分段审核办法和通过标准，或标记不包含高风险判断、权限、不可逆结果、外部依赖或异常分支且带分段折叠清单的低风险线性例外。判断点（DEC）必须在节点卡上高亮提醒审核默认路径，不能只把默认路径缺失藏在图源文里。
- flow 确认页的节点逐项确认必须说人话，并采用 `默认短句 / default compact node copy`。节点卡默认层必须是业务决策卡 / business decision card，不是字段表；但业务决策卡只能作为内部概念或无障碍语义，默认层不得显示可见标题“业务决策卡”，避免 reviewer 看到控制面术语而忽略业务判断。审核人应能在 5 秒内看懂这一项要做的一句业务判断，并遵守“首屏无技术”：右栏顶部不展示接口、字段、trace、来源表、对象类型或长背景；默认层白名单只包括业务动作、谁确认、要决定什么、推荐选法、确认状态、已写意见和分层 A/B/C/D 可执行选项。节点名、审核层级、确认责任、状态和业务/系统层级属于卡片头部元信息（card header metadata），只能渲染为紧凑单行（compact single line），不得拆成字段表行（must not be split into field-table rows）。卡片正文三行 / three body rows 固定为：一句 `背景信息`、一句 `决策摘要`、一组横向选项按钮；不得拆成字段表行。每个选项默认展示选项名、推荐标记、`收益` 和 `代价`；推荐选项额外展示 `推荐理由`。不要把 `这是什么`、`要决定什么`、`怎么选` 三段问答平铺在默认层；这些内容只能被压缩成一句行动提示，或进入折叠详情。每项默认说明必须是一句产品经理能读懂的话，避免把对象类型、判断点、来源、备注、追溯 ID、技术字段或长段背景直接铺在右栏顶部。
- flow 确认页的节点选项必须采用两步授权交互。情况 A：推荐选项点击即保存 / recommended-option click saves immediately，点击推荐项后立即写入本地选择，卡片必须先显示“正在保存推荐选择”一类即时可见反馈 / immediate visible feedback，再显示“已按推荐保存，可重新选择”和“重新选择”按钮，允许修复误操作；该状态区必须用 `aria-live` 或等价方式对保存结果做可访问提示。推荐保存函数必须重新计算 `recommended_option` 并校验点击项仍然等于推荐项；如果不一致，必须降级为非推荐 DRAFT 路径，不能绕过审核意见直接写授权。提示语必须区分“本地正式记录”和“下载确认包并写回确认文档后的外部授权记录”，并明确正式授权必须下载确认包并写回 `flow-confirmation.md`。情况 B：非推荐选项 / non-recommended option 不能直接保存为授权，点击后只进入“待提交草稿”，卡片必须立即显示“非推荐选项已暂存为草稿”，右侧栏必须打开并聚焦该节点的审核意见输入框；审核人填写原因后点击贴近输入框的“提交选择”才允许保存。节点级点击必须先完成当前卡片的局部反馈，只允许局部更新状态块、选项按钮、输入框、选中节点摘要和图上高亮；节点级操作不得触发 Mermaid 完整重绘、整页 `render()` 或整条右栏重建。左侧统计、模块列表或批量摘要可以在局部反馈出现后用短延迟刷新。已持久化的 DRAFT 在页面刷新、重新渲染或切换模块返回后，也必须自动展开审核意见区。未填写原因时必须显示“请先填写审核意见”之类的行内错误，并在输入框下方同步显示，不能只放在卡片顶部，也不得使用弹窗替代右栏输入。节点状态机必须显式区分 `MISSING | DRAFT | SAVED_RECOMMENDED | SAVED_SUBMITTED`：`MISSING` 是未选择，`DRAFT` 是非推荐选项已点选但未提交意见，`SAVED_RECOMMENDED` 是推荐项已本地保存，`SAVED_SUBMITTED` 是非推荐项带意见提交。重新选择清空正式选择和草稿，回到未选择。草稿不能进入 `decision_records`，不能被统计为已确认，不能支撑 `READY_FOR_UI`、gate PASS 或下游实现准入；未选择或没有出口路径的节点进入 `unresolved_decision_items`，待提交草稿节点只能进入 `draft_excluded_items` 排除清单，因为草稿不具备授权意义。下载确认包前如果存在待提交草稿，页面必须先在下载按钮旁或邻近位置提示“草稿不具备授权意义，下载确认包前请先处理草稿”，把按钮改成“仍要下载确认包”，且第一次提示不得重建右栏、不得丢失当前输入、不得触发 Mermaid 重绘、不得调用整页 `render()` 或把该警告写进当前流程图提示区；用户再次明确继续时才允许下载。即使用户继续下载，确认包也只能把草稿列入 `draft_excluded_items` 排除清单，不能把草稿选项放入正式授权明细或普通 unresolved 清单，并且包内必须保留醒目的 draft warning，避免导出的文件被误当成完整授权。复制摘要执行相同草稿排除规则，但只能作为下载不可用时的兜底。离开页面、关闭页面或刷新时也必须用 beforeunload / navigation/close 提醒。批量按推荐确认不能覆盖已保存选择、已提交的非推荐选择或待提交草稿；批量动作后必须在右侧栏提示保存了几个、跳过几个已有选择、跳过几个待提交草稿，避免审核人误以为所有节点都已被覆盖。重置动作只清除当前视图 localStorage 中的临时选择，并应提示正式授权仍以写回确认文档为准。
- 节点卡必须保留 `折叠详情 / collapsible supporting copy` 用于追溯，但折叠详情也要使用人能马上理解的标签。默认层黑名单包括“对象类型、判断点、来源、主流程图、节点说明、审核人要看什么、关联业务、为什么存在、需要判断什么、不需要确认、不需要管什么、节点做什么、通过标准、可以通过的标准、风险提示、常见风险”等字段表口径；这些内容只能折叠展示，并改成“节点动作、审核重点、业务影响、审核原因、无需审核、继续条件、常见问题”等更自然的标签。来源、原始说明、备注、执行字段 `consequence`、后续出口 `next_exit`、授权追溯、`selected_option`、`recommended_option` 和兼容字段只能作为折叠详情或确认记录展示；可见标签应写成“依据位置”“原文摘要”“确认记录”等审核口径，不能默认展开压住主要决策。
- flow 确认页的模块简介和流程简介必须绑定业务上下文，不得使用泛化套话 / generic boilerplate，也不复述方法论。中间区默认只展示 1-2 句面向业务的摘要，默认标签应类似“模块做什么”“这张图看什么”“重点看哪里”，按业务快照生成：谁在什么场景处理什么 / who handles what in which business scenario；这张图从哪个业务触发开始，到哪个业务结果结束，哪些选择会改变结果。不得直接拼接 / must not directly concatenate `businessObject`、`roles` 或 `flowResponsibility` 形成字段式句子；这些字段只能作为生成自然业务陈述的素材，完整字段值、处理范围、文件名、节点数、节点预算只能进入折叠追溯详情。摘要必须紧贴目标模块和业务场景，例如问卷发布、模板应用、文件访问、租户权限、导出交付、AI 起草、AI 追问或 AI 分析；禁止只写“展示路径、判断、分支和完成条件”，也禁止用“当前模块 + 业务对象”“说明当前业务怎样被处理”这类抽象占位话术替代真实业务说明。系统/架构层流程可以说明它影响哪些业务模块，但必须标明无需产品经理确认内部实现细节。
- 这些简介、节点标题和节点卡短句必须在 `/sp.flow` 产物生成阶段完成业务化表达；审核页不是文案清洗器，不能先生成技术话术再依赖页面翻译。业务模块默认文案不得套用系统/架构兜底，系统/架构话术只能用于 `system_arch` 层。模块级 review layer 必须和图级 review layer 分开判断：模块级只能根据 feature 身份或明确层级标记判定；图级或节点级才允许根据 `adjacency.mmd`、direct-neighbor、cross-module 等局部证据提示系统/架构确认。精确业务语境匹配必须早于泛匹配，尤其通知/模板/开发者门户/API Key/AI 等相近模块，避免把通知模板误归入问卷模板库，或把 API Key 生命周期误写成开发者门户总览。
- 如果输入信息偏粗，但业务域、用户角色、业务目标和 feature 边界是清楚的，模型可以使用受控推理补齐常见业务环节，避免流程过于简单。允许推理的内容包括常见生命周期、申请/审核/通过/驳回/撤回/重试/审计、空状态或失败分支、超时/重试、通知/审计副作用和验证点。禁止推理的内容包括新业务规则、权限边界、定价/结算、数据保留/合规、不可逆删除、租户/安全权限和验收降级。
- 推理补齐的内容必须标记为 `Source: model-inferred` 或挂到 `OPEN-*`，只能作为草稿方案。它可以用于帮助用户 review，但不能直接关闭风险、替代人工决策、写入稳定 trace 或支撑 gate PASS。
- 如果粗略输入对应多种合理流程方案，模型应给出 2-3 个方案，说明影响、取舍、推荐方案和下一步 `/sp.clarify` 或 `/sp.flow` 路线，让用户选择；不能静默选择一个会改变业务过程的方案。
- 每个关键流程步骤应说明业务含义、节点类型、角色、输入、输出、允许事件和验收证据。
- 每个关键流程步骤应补齐轻量端口契约：输入、前置条件或权限、执行动作、输出或副作用、目标状态、失败路径和验证方式。
- 业务事件应说明触发条件、权限或 guard、成功 effect、失败路径和目标状态。
- 需要界面的步骤只提出 UI 契约：需要收集什么字段、展示什么业务事实、允许触发哪些事件、有哪些权限和错误状态。
- UI 契约描述的是目标用户为了完成业务步骤需要输入、查看、触发、确认或处理错误的内容；不是流程监控面板、方法步骤说明、SP 命令仪表盘或把流程图直接做成界面。
- 不设计具体 screen 布局，不决定视觉组件，不给按钮、字段或内部小步骤分配深层主坐标。
- flow 产物在通过 analyze/gate 或等价检查前只能作为草稿，不直接写成稳定 trace 结论，也不能用来关闭风险。
- `/sp.flow` 首选 Mermaid、PlantUML、Graphviz 等可渲染文本图，不首选普通位图图片。如果从这些源文件导出图片或预览，图上必须显示便于人工反馈的可见标签或名称，例如 `FLOW A1`、`FLOW A1-3`、`DEC D2`、`ERR E1`。这些标签要能回到结构化源文件中的行、表格或锚点，方便用户说“请调整 FLOW A1-3 的分流处理”时，模型能准确定位并回写。
- 右侧反馈确认栏除模块级确认外，还必须包含逐节点决策选项卡和逐节点反馈输入框；节点项应使用图上的可见标签或从流程表提取的 `FLOW`、`DEC`、`ERR`、`STATE` 等标签。每个需要人工判断的节点必须提供分层可执行选项：`must_confirm` 节点必须提供 3-4 个可执行选项，普通人工判断默认 3 项，低风险二元判断只有在 `options_count_rationale` 说明为什么 2 个出口足够时才允许 2 项；默认层包含“请判断……”行动提示、推荐方案、推荐依据和选项短说明。节点级必须写清 `背景信息` 和 `决策摘要`；每个选项必须写清 `收益` 和 `代价`；推荐项必须写清 `推荐理由`。选项还必须通过执行字段 `consequence` 和 `next_exit` 说明选择后模型要对流程步骤/分支出口/异常路径/拆分合并做什么、谁继续处理、对 scope、schedule、risk、UI、plan、tasks、implementation 或 tests 的影响、不选推荐会增加什么代价，以及为什么推荐项最稳妥，不能用“当前依据看起来正确”这类套话。同一节点内的选项必须有真实差异，不能只是把同一条路线改写成“保留 / 补充 / 局部调整 / 后续完善”。生成选项前必须先选决策模板：范围决策说明本轮处理哪些流程步骤、分支或异常路径；门禁决策说明能否放行、拦截、补材料或转人工审核；降级决策说明完整能力不可用时采用什么兜底流程、人工处理或分阶段上线。常见出口必须按 `/sp.clarify` 的拍板包标准写：needs-decision 选项必须说清缺什么、谁拍板、哪些下游工作暂停；split-flow 选项必须说清拆成哪些子流程；推荐项必须说明为什么比更慢、更重或更保守的替代方案更适合。`consequence`、`next_exit`、授权追溯和确认所选方案必须进入折叠详情、反馈控件或写回记录，不能挤在右栏顶部。页面还必须提供英文标签说明，例如 `FLOW` 表示流程项、`DEC` 表示判断点、`ERR` 表示异常路径，避免中英文混排时用户不知道英文片段含义。命令收尾前必须运行 `.specify/review/scripts/validate-review-data.mjs`，并让模板句 / boilerplate、缺失“谁继续处理”、必审节点缺失 why-now 说明、选项收益/代价高度相似、未解释技术词和 approve/defer/reject/block 类空泛出口直接失败。
- 阻塞、待决策和 stale 状态必须同时出现在图和右侧确认栏。`Pending Decisions` 非空、决策节点没有明确默认路径、分支出口指向未定义状态或未定义子流程时，不能把 flow 提升为 `READY_FOR_UI`，应保持 `NEEDS_DECISION` 或 `BLOCKED`，并把 owner route 写入 Stage Readiness、确认页右栏和 `memory/open-items.md`。
- `/sp.flow` 收尾时应明确提示用户：流程图源文件、渲染预览或导出图已经准备好，请核对；说明应使用 GitHub Markdown、VS Code Mermaid preview、Mermaid Live Editor、mermaid-cli、PlantUML 或 Graphviz 等对应工具查看；同时提醒修改意见应引用图上标签，并先回写结构化流程文件再重新渲染或导出。
- `/sp.flow` 首次生成流程、重大分支/状态/权限/异常变化、一次新增 3 个以上流程节点、用户显式要求 review，或模型无法确认用户是否认可方向时，必须把结果作为草稿收尾，并进入默认 `batch` 确认策略：把当前确认范围内的 flow 项加入 batch review manifest，状态写为 `WAITING_FOR_BATCH_REVIEW`，请求用户在批量确认页按图上标签集中确认或反馈修改。确认前不得把草稿提升为稳定 memory、稳定 trace、gate PASS 证据、`READY_FOR_UI` 或实现准入依据。
- `/sp.flow` 要求人工确认时，必须先展示一段简洁中文“流程确认摘要”，不能只说“请确认”。摘要要说明：这张流程基于哪些 PRD/spec/clarifications；解决的业务目标是什么；有哪些参与角色；主流程分成哪些阶段；关键决策点、异常/恢复路径、状态变化、系统/外部步骤、UI 契约分别是什么；哪些内容是草稿或模型推理；用户应打开哪些文件或预览；反馈时应引用哪些可见标签，例如 `FLOW A1-3`、`DEC D2`、`ERR E1`。用户不应为了知道自己要确认什么而必须先翻完整文档。
- `/sp.flow` 可以分模块生成，但默认不逐模块打断用户确认。只有当前运行范围是单模块 hotfix、用户显式选择 `confirm_strategy: rolling`、批次超出可理解上限、核心依赖必须先锁定，或 reviewer 组织方式不允许集中确认时，才把策略降级为 `hybrid` 或 `rolling`，并在 Stage Readiness 中写明降级原因、影响范围和下一步确认路径。
- 小范围文案、标签、已明确指定的单点调整，或用户显式要求 `--auto` 时，`--auto` 只能跳过视觉确认，也就是只能跳过交互式视觉确认提示，不能跳过 batch confirmation、确认文档写回、Stage Entry Preflight、stale 检查、owner approval、授权范围核对、主体范围、业务域锚点、入口准入或主体混淆检查。只要当前变更范围触发批量确认，`--auto` 仍必须写入 `WAITING_FOR_BATCH_REVIEW`、说明变更范围和草稿/稳定状态，并提示用户回到批量确认页完成授权。
- 如果同一流程问题存在多条合理修复路线，模型应给出 2-3 个选项，说明影响和推荐方案，等待用户选择；不能直接按模型偏好改成唯一方案。
- 如果上一轮流程 batch 等待确认，但用户切换话题或继续下游命令，模型应提醒“流程批量确认尚未完成”，说明受影响的 batch scope、不能运行的下游命令和推荐 owner route；默认推荐回到批量确认页，而不是让用户逐模块补确认。
- 发现用户意图、分支规则、权限、补偿、回滚或验收不清时，回到 `/sp.clarify` 或 `/sp.specify`，不能靠流程表猜。

### `/sp.ui`：消费流程契约，组织界面结构

`/sp.ui` 在 `/sp.flow` 之后运行，负责把流程中的 UI 契约落成 screen、关键元素和交互结构。它可以优化信息架构和界面组织，但不能擅自改变业务状态机。

`/sp.ui` 的输出必须是业务 UI。业务 UI 是让目标用户完成目标业务操作的 screen、表单、导航、动作、结果和反馈；它至少要能说明目标角色、业务目标、关联流程步骤或业务事件、数据对象或字段、权限或校验来源、验收路径。只有展示“流程进度”“状态流转时间线”“处理节点激活情况”“流程图本身”的界面，默认不是业务 UI。

流程展示型 UI 只有在 `spec.md` 明确要求“工作流监控、流程审计、编排控制、运行状态查看”等产品能力时才允许出现。即使允许，也必须绑定目标业务用户、业务数据、权限、操作动作和验收路径，不能展示 SP 自身的命令流程或方法论步骤。

执行要求：

- `/sp.ui` 必须消费 `/sp.flow` 的流程契约后再做界面拆解。拆解顺序应自上而下：用户角色、任务入口、screen map、每个 screen 的业务目的、区块、字段、动作、状态、校验、权限、反馈、错误/恢复行为和验证证据。不能把粗略需求直接变成几个泛泛的页面名，也不能把流程图本身当成 UI。
- 前端展示页面的设计必须使用 `huashu-design` skill。适用范围包括固定 SpecCompass review renderer、UI 确认页、项目 UI 全貌预览、模块页面预览、业务 UI 预览，以及后期前端开发中的主题 token、CSS 变量、组件样式、布局规则和验收检查。React + Vite、Storybook、JSON Forms、真实项目 dev server、Vue、Svelte 或其他框架只是渲染/承载方式，不能替代 `huashu-design` 的设计规范入口。
- `huashu-design` 按三层执行：`review-surface` 是 SpecCompass 确认页外壳，必须使用统一 Tiffany blue 模板、右侧确认栏、反馈输入、逐节点推荐选项、需补充决策标记和授权写回控件；`business-preview` 是目标产品业务界面的可视化预览，默认以 `huashu-design` 作为设计权威；`business-production` 是真实业务前端实现，默认继承 `huashu-design` 作为设计基线和验收约束。
- 如果 PRD 或已确认的目标产品设计系统对业务前端有明确品牌、组件库、交互范式或框架要求，它可以覆盖 `business-preview` 或 `business-production` 中与 `huashu-design` 冲突的部分，但必须在确认文档、Stage Readiness 或 plan 中记录覆盖来源、影响范围和偏差项。框架选择只是实现载体，不是设计权威；“用了 React/Vue/Svelte”不能替代设计授权。
- 右侧确认栏、逐节点推荐选项、需补充决策控件、授权写回 UI 和 SpecCompass 控制面标签只属于确认页和 `specs/<feature>/ui/review/*`。它们不能泄漏到业务前端实现中，除非目标产品本身明确要求一个业务审批侧栏；即便如此，也必须按目标产品的业务术语、权限和数据重新建模，不能直接复用 SpecCompass 的确认控件。
- 如果宿主没有提供 `huashu-design` skill，命令必须显式提示缺失，并把确认页或前端预览标记为 `Design Skill: huashu-design missing`。除非用户明确接受降级，否则不得把通用前端样式当作最终设计依据；降级预览只能作为非授权草稿，并需在 batch review manifest、确认摘要和确认文档中记录设计偏差。
- `/sp.ui` 必须把设计授权写入 `ui-confirmation.md` 或 UI Stage Readiness，包括 `design_authority: huashu-design`、`design_scope`、`frontend_framework`、`brand_override`、`design_deviation_items` 和 `implementation_design_requirements`。`/sp.plan` 必须把这些字段整理为 `Frontend Design Authority`；`/sp.tasks` 必须在前端 `Mode: impl` 任务中加入 `Design Constraint`；`/sp.implement` 必须在改动业务前端代码前读取这些字段，并把它们转换成 theme token、CSS 变量、组件样式、布局规则和检查项。
- 如果 flow 契约和业务域清楚，但 UI 信息偏粗，模型可以使用受控推理补齐常见界面结构，避免界面方案过于简单。允许推理的内容包括常见新建/查看/编辑/审核/结果页、空/加载/错误/成功状态、风险动作确认、明显需要的数据集搜索/筛选/排序、已有字段规则的校验展示和审计/结果反馈。禁止推理的内容包括新增业务事件、新权限、新数据校验规则、数据保留/合规、不可逆动作、定价/结算和验收降级。
- 推理补齐的 UI 内容必须标记为 `Source: model-inferred` 或挂到 `OPEN-*`，只能作为草稿界面方案。它可以用于帮助用户 review，但不能直接关闭风险、替代人工决策、写入稳定 trace 或支撑 gate PASS。
- 如果粗略输入对应多种合理 UI 路线，模型应给出 2-3 个方案，说明影响、取舍、推荐方案和下一步 `/sp.clarify` 或 `/sp.ui` 路线，让用户选择；不能静默选择一个会改变交互模型或业务含义的方案。
- 每个 screen 应说明服务哪些流程步骤、业务状态或业务事件。
- 关键元素应说明类型、业务含义、来源流程步骤、绑定事件或字段、权限、必填条件和验收证据。
- 一个 screen 被多个流程复用时，应列出不同入口、角色或状态下可见元素和可触发事件的差异。
- 表单字段的业务校验来源应来自流程、规格、数据约束或接口契约；UI 不应随手发明业务校验。
- 不新增业务事件、权限规则、状态迁移或强副作用；发现确有需要时，回到 `/sp.flow`、`/sp.specify` 或 `/sp.clarify`。
- 禁止把流程图、步骤进度条、状态流转时间线、处理看板、workflow node activation panel 当成默认 UI。示例：请假审批功能中，错误 UI 是“显示 FLOW A1 -> A2 -> A3 的流程进度面板”；正确 UI 是“提交请假申请表、展示请假时长和审批人、允许提交/撤回、展示审批结果和驳回原因”。
- ui 产物在通过 analyze/gate 或等价检查前只能作为草稿界面方案；不能因为页面看起来完整，就把孤儿 UI、未绑定动作或未验证字段写成稳定事实。
- `/sp.ui` 首选结构化 UI 文档、JSON Forms、HTML/CSS prototype、Storybook story 或其他可执行/可预览 UI 产物，不首选普通位图图片。如果从这些源文件导出图片或预览，界面上必须显示便于人工反馈的可见标签或名称，例如 `SCREEN S1`、`SECTION S1.2`、`FIELD F3`、`ACTION A2`、`STATE ST4`。这些标签要能回到结构化 UI 源文件中的 screen、section、field、action 或 state。
- `/sp.ui` 收尾时应明确提示用户：结构化 UI 文件、可执行预览或导出图已经准备好，请核对；说明应使用 GitHub/VS Code Markdown preview、JSON Forms playground、Storybook、浏览器、项目 dev server 或图片查看器等对应工具查看；同时提醒修改意见应引用界面上的标签，并先回写结构化 UI 文件再重新渲染或导出。
- `/sp.ui` 必须在 `/sp.flow` 之后消费流程契约。缺少 flow 输出时，应停止并路由到 `/sp.flow`；如果依赖的 flow 仍是未确认草稿、`WAITING_FOR_BATCH_REVIEW` 或 batch confirmation stale，UI 只能保持草稿或 open item，不能假装业务状态机已经稳定。
- `/sp.ui` 首次生成界面结构、重大 screen/action/field/permission 变化、一次新增 3 个以上 screen/action、用户显式要求 review，或模型无法确认用户是否认可界面方向时，必须把结果作为草稿收尾，并进入默认 `batch` 确认策略：把当前确认范围内的 UI 项加入 batch review manifest，状态写为 `WAITING_FOR_BATCH_REVIEW`，请求用户在批量确认页按可见标签集中确认或反馈修改。确认前不得把草稿提升为稳定 memory、稳定 trace、gate PASS 证据、`READY_FOR_PLAN` 或实现准入依据。
- `/sp.ui` 要求人工确认时，必须先展示一段简洁中文“UI 确认摘要”，不能只说“请确认 UI 草稿”。摘要要说明：这个 UI 基于 PRD/spec 的哪些要求；消费了 flow 中哪些流程、状态或事件；为什么采用当前布局；整体布局是上下、左右、表单/详情/列表/向导等哪种结构；有哪些 screen、section、按钮、字段、状态和权限；按钮名称和作用分别是什么；图片、预览或导出图有几个、在哪里看；图表或表格有几个、类型是什么、数据源或数据库/接口来源是什么；哪些内容是草稿或模型推理；用户反馈时应引用哪些可见标签，例如 `SCREEN S1`、`SECTION S1.2`、`ACTION A2`、`FIELD F3`。用户不应为了确认一个界面而先猜它长什么样、为什么这样设计、哪些点需要看。
- `/sp.ui` 可以分模块或分页面生成，但默认不逐模块打断用户确认。只有当前运行范围是单模块 hotfix、用户显式选择 `confirm_strategy: rolling`、批次超出可理解上限、不同 reviewer 不能共同确认，或上游 flow/UI 依赖需要分阶段锁定时，才降级为 `hybrid` 或 `rolling`，并在 Stage Readiness 中写明降级原因、影响范围和下一步确认路径。
- 小范围文案、标签、已明确指定的单点调整，或用户显式要求 `--auto` 时，`--auto` 只能跳过视觉确认，也就是只能跳过交互式视觉确认提示，不能跳过 batch confirmation、确认文档写回、Stage Entry Preflight、stale 检查、owner approval、授权范围核对、主体范围、业务域锚点、入口准入、主体混淆或流程展示型 UI 检查。只要当前变更范围触发批量确认，`--auto` 仍必须写入 `WAITING_FOR_BATCH_REVIEW`、说明变更范围和草稿/稳定状态，并提示用户回到批量确认页完成授权。
- 如果同一 UI 问题存在多种合理布局、交互或信息架构路线，模型应给出 2-3 个选项，说明影响和推荐方案，等待用户选择；不能直接按模型偏好定型。
- 如果上一轮 UI batch 等待确认，但用户切换话题或继续下游命令，模型应提醒“UI 批量确认尚未完成”，说明受影响的 batch scope、不能运行的下游命令和推荐 owner route；默认推荐回到批量确认页，而不是让用户逐页面补确认。

Flow/UI 的确认摘要如果包含需要人工决策的点，必须按 `/sp.clarify` 风格的决策包说人话：先交代 `背景信息` 和 `决策摘要`，再给 3-4 个真实可执行选项（低风险二元判断必须说明为什么 2 项足够），每个选项说明 `收益` 和 `代价`，推荐项额外说明 `推荐理由`，同时保留 `consequence`、`next_exit` 作为执行字段 / execution field 让下一轮模型知道如何写回。不能只把问题抛给用户，也不能在用户确认前把 `DRAFT_ONLY` 提升成 `READY_FOR_UI`、`READY_FOR_PLAN` 或 gate/plan/tasks 的准入证据。

### `/sp.implement`：小步实现，测试牵引

`/sp.implement` 不应把任务理解为“尽快把代码写完”，而应理解为“在最小安全上下文内完成一个可验证单元”。

执行要求：

- 开始前确认当前 workset、acceptance、相关 trace、open items 和直接相邻文件。
- 涉及核心行为时，优先用测试、验收脚本或手工验证路径牵引实现；能先写或先补测试的，不直接裸改。
- 每次只修改当前任务需要的区域，不顺手重构无关模块。
- 触及 API、权限、数据、事件、副作用、核心测试时，执行前留下简短 `Impact-Radius Plan`，验证后再留下 `Impact-Radius Evidence`。
- 完成后必须验证；验证失败时先找根因，不能只为了通过检查而改弱测试或绕开约束。
- 如果连续两次本层修复仍失败，先检查并说明当前未稳定修改；如果问题来自范围、规格、验收或文档冲突，回到 `sp.clarify` 重新清晰化，再按需要进入 tasks、plan 或 spec，而不是继续局部硬冲。

这条规则吸收的是 Superpowers 的执行纪律：模型可以多干活，但不能跳过验证、不能扩大范围、不能把失败解释成成功。

删除、移动、重命名不能只依赖 trace。轻量 trace 不覆盖所有对象，如果对象没有出现在 `memory/trace-index.md`，仍要做轻量引用扫描，例如文本搜索、imports、calls、路由注册、测试引用和同目录引用。找到引用但无法判断是否安全时，应上移到 `sp.plan` 或 `sp.tasks` 重新确认影响范围。高风险边界对象不能因为 trace 缺失就被当作“没人用”。

软删除不是默认策略。默认优先物理删除废弃代码，并依赖 git 历史追溯；只有公共 API 兼容、不可逆数据迁移、灰度保留、trace 不清或影响半径过大等高风险场景，才允许临时软删除或墓碑标记。一旦采用软删除，必须在 `memory/open-items.md` 建清退项，写明清退对象、原因、关联 trace、触发条件或期限、验证要求、负责人或后续命令路线。代码里的短 `@deprecated until ...` 只能作为辅助提示，不能替代 open item。

`sp.implement` 的验证证据是任务审计信息，不等于发布或合并证据。单任务完成后必须记录运行了什么检查、结果如何；workset 或阶段收口时，`sp.analyze`、coordinator 或 `sp.gate` 应独立复核关键检查结果。核心验收、构建、测试、lint、类型检查和关键手工验证能重跑的优先重跑；不能重跑时必须说明原因和替代证据。

### `/sp.analyze`：找缺口，不粉饰

`/sp.analyze` 的价值不是证明文档“看起来完整”，而是发现后续自动化会在哪里出错。

执行要求：

- 优先检查 active feature、memory 路由、source docs、trace、tasks 是否一致。
- 对 spec、plan、tasks、flows、ui、delivery、memory、open-items 做交叉一致性检查。
- 检查 ID、owner、状态、屏幕、API、表、权限、验收路径、测试证据是否能互相追踪。
- 检查 Flow-UI 断链：流程步骤无类型、业务分支无原因、UI 没有 FLOW 来源、UI action 没有业务事件、事件没有 flow effect/API/状态变化、强副作用没有数据/API/失败路径。
- 检查主体混淆：flow/ui 是否把 SP 机制、命令、memory、preflight、gate、任务路由或方法论阶段当成业务内容。发现后按 `SUBJECT_CONFUSION` 阻断，不能给 PASS。
- 检查流程展示型 UI：UI 是否只是流程进度、状态时间线、处理看板、节点激活面板或流程图界面。如果 `spec.md` 没有明确要求这种产品能力，或缺少目标角色、业务数据、权限和验收路径绑定，应按 `SUBJECT_CONFUSION` 或 `GENERIC_ARTIFACT` 阻断。
- 检查流程节点契约：关键步骤是否缺输入、前置条件、权限、动作、输出、副作用、目标状态、失败路径或验证方式；缺失项必须回链到具体 `FLOW`、`UI`、`API`、`ACC` 或 open item。
- 检查游离产物：UI、API、TABLE、CODE、ACC、TEST 如果属于某个业务能力，应能追到 `FLOW`、source doc 或明确 open item；不能解释来源的叶子产物不能被当作稳定设计。
- 检查草稿事实是否被误写成稳定 memory：未经验证的 flow/ui/plan 结论、失败尝试或模型推测，不能直接关闭风险、更新稳定 trace 或支撑 PASS。
- 检查变更类型：结构性变更是否留下影响半径证据；装饰性变更是否至少有简短验证或不影响行为的说明。
- 检查风险信号：跨层变更、核心锚点复杂变化、trace 出入度高的对象变化、变更文件未映射 trace、source back-link 缺失，都应进入 warning、open item 或 gate/analyze 报告。
- 发现 stale memory、未解析引用、核心占位符、验收断链、Blocker 未关闭，或高影响风险缺 owner、影响范围、回退/降级方案、关闭条件、revisit anchor、trace 回链或明确人工接受/延期决定时，不能给 PASS。
- Low/Medium 风险如果不阻断下一阶段，并且已经进入 open-items 或 gate/analyze 报告，且具备 owner、关闭条件和回看点，可以给诊断 PASS 但必须带 warning。
- 对可接受的小缺口，必须写清为什么不阻断、放到哪里继续跟踪。

`/sp.analyze` 可以写 analysis 和刷新 memory，这是 SP 的内容增强；但它不能因此降低证据标准。它输出的 PASS/FAIL 只表示“文档、memory、trace 和自动化准备度诊断是否通过”，不等于允许进入下一阶段。阶段准入仍由 `/sp.gate` 裁决。

`/sp.analyze` 运行轻量 memory 检查时，应在 `analysis.md` 写入简短 `Memory Check Summary`，至少包含命令、时间或 run label、feature/workset、状态、`needsHumanReview`、gate modes covered、source snapshot 或 evidence signature label、open-items state、ERROR/WARN 数量和关键 finding ID。这样 `/sp.gate` 可以在摘要仍然新鲜、覆盖当前 gate mode/workset，且 source/open-items 标签仍匹配时复用当前机械证据，不必在 analyze 后立刻重复运行同一检查。若摘要缺少这些最小字段、覆盖范围不匹配、source snapshot/evidence signature 已过期，或 open-items 状态变化，应回到 `/sp.analyze` 或重新运行轻量检查。

trace warning 必须有升级路径。普通 trace 缺口初期可以作为 warning 推进，但必须写入任务证据、analysis 报告或 `memory/open-items.md`；同一 warning 跨阶段仍未处理，或开始影响验收、测试、发布、回滚、人工决策时，应升级为 blocker。高风险边界对象缺 CODE/TEST trace、trace 指向不存在文件、核心验收缺 TEST 证据时，不应长期停留在 warning。

### 阻塞闭环模式：不能用进度汇报替代关闭

当用户要求“解决阻塞点”“清理 blocker”“收口剩余问题”，或者 `/sp.analyze`、`/sp.gate` 发现 open blocker/high risk 时，SP 必须进入阻塞闭环模式。这个模式不是新命令，也不新增长期台账；`memory/open-items.md` 仍然是未决事项、风险、阻塞和决策的唯一稳定事实源。`analysis.md` 和 `gate.md` 可以生成 closeout report，但那只是报告投影，不能和 `open-items.md` 形成两套互相竞争的状态。

逐项阻塞状态只允许使用这四类：`RESOLVED`、`OPEN`、`DEFERRED_WITH_OWNER`、`INVALID_OR_STALE`。`RESOLVED` 必须有当前验证证据、可追溯文档/代码变更或明确人工决策；`OPEN` 表示仍需修复、补证据或决策；`DEFERRED_WITH_OWNER` 必须有 owner、影响范围、回退或降级方案、关闭条件和回看点；`INVALID_OR_STALE` 必须说明为什么该阻塞已经不适用，以及用什么当前证据证明。

命令 verdict 不新增枚举。`/sp.analyze` 仍只输出 `PASS`、`FAIL`、`BLOCKED`、`NEEDS_DECISION`；`/sp.gate` 仍只输出 `PASS`、`FAIL`、`CONDITIONAL`、`BLOCKED`、`NEEDS_DECISION`。逐项状态到 verdict 的映射规则是：仍有需要人工选择的 `OPEN` 项时，返回 `NEEDS_DECISION`；仍有当前层可修复的 `OPEN` 项时，通常返回 `FAIL` 并指向最近 owner 命令；仍有自动推进不安全的 `OPEN` 项时，返回 `BLOCKED`；High risk 的 `DEFERRED_WITH_OWNER` 如果没有明确接受、owner、关闭条件和回看点，不能 PASS；只有全部 `RESOLVED`、`INVALID_OR_STALE`，或低风险/已接受延期项具备完整跟踪条件时，才允许 PASS 或 gate 的 `CONDITIONAL`。

closeout report 必须逐项列出阻塞 ID 或来源、当前证据、采取的动作或还缺的动作、验证结果、最终逐项状态、对应 `memory/open-items.md` 处理结果，以及下一步 `/sp.*` 路线。低风险局部事项可以轻量记录；影响验收、发布、回滚、安全、合规、数据、实现准入或人工决策的事项必须完整记录。进度百分比、口头简报、自然语言“已基本解决”、或“验证通过但台账还没清理”不能替代逐项 closeout。

阻塞收口要先判断“文档阶段能解决”还是“代码阶段才能解决”。规格矛盾、流程断链、UI 业务含义、数据关系缺口、任务拆分、风险接受和人工决策，优先回到文档阶段命令修正；缺失代码、测试资产、脚本、配置或 schema 的实际落地，必须进入下一阶段 `Mode: impl` 任务。命令运行成功、文档生成成功或检查脚本退出 0，都只能说明工具层动作完成，不等于业务 PASS；业务 PASS 仍要看验收、trace、open-items、数据联动、代码/测试证据和 gate verdict。

旁路命令不能绕过主链路。`/sp.bundle`、`/sp.checklist`、`/sp.taskstoissues`、`/sp.constitution` 这类命令可能包装信息、生成检查清单、外发 issue 或更新治理规则，但它们不拥有业务事实确认权。它们发现高影响歧义、需求冲突、Flow-UI 断链、数据联动断链、open blocker、任务包缺字段、仓库目标不明或需要人工选择时，应登记到 `memory/open-items.md`、输出最近的 `/sp.*` 回退路线，或进入 `/sp.clarify` 生成决策包。不能因为检查清单生成成功、bundle 写好了、issue 创建成功、constitution 刷新完成，就把未解决问题当成 PASS。

### `/sp.gate`：阶段门禁，宁可降级通过也不能假通过

`/sp.gate` 的目标是判断“是否可以进入下一阶段”，不是机械追求满分。

执行要求：

- 硬门禁失败时必须阻断，例如 active feature 错误、核心验收断链、Blocker 未关闭、高风险无 owner 或无回退方案。
- Flow-UI 硬断链必须阻断，例如 `ui` 类型步骤没有 UI 主坐标且没有 open item、关键 UI action 没有事件、事件没有 effect/API/状态变化、UI/API/TABLE/ACC/CODE 无法追到相关 FLOW、主路径没有验收或验证证据。
- 主体混淆和错误 UI 类型必须阻断。flow/ui 产物如果把 SP 自身机制当成业务内容，或 UI 主要是在展示流程/状态而不是支持目标业务操作，除非规格明确要求且证据完整，否则不能 PASS。
- 关键流程节点契约缺失必须阻断，例如主路径缺输入、权限、动作、输出、副作用、目标状态、失败路径或验证方式，且没有 open item 或人工接受的降级说明。
- 未经验证的草稿事实不能支撑 PASS。flow/ui/plan 新产物如果还没有通过 analyze/gate 或等价检查，只能继续修订或进入 open item，不能作为稳定依据向后推进。
- 硬门禁只阻断继续向后推进，不阻断向上修正。发现这些问题时，应回到 `tasks.md`、`plan.md`、`spec.md`、source docs 或用户决策处修正，再重新分析和过门禁。
- 软问题可以通过，但必须进入 open-items、gate 报告或下一阶段任务。
- 如果验证成本过高，可以请求用户接受降级验证，但必须说清风险、影响、后续补偿动作。
- PASS 必须基于证据；不能因为模型认为“应该没问题”就通过。

这里的稳定性底线是：可以接受 70 分或 80 分的阶段性结果，但不能让 40 分的不及格状态伪装成通过。SP 允许逐步完善，不允许方向错误、路由错误、风险失控或验收断链继续向后滚动。

`sp.analyze` 和 `sp.gate` 的边界必须固定：`sp.analyze` 负责 findings、evidence、warnings、blockers、stale memory、trace gaps 和建议路线；`sp.gate` 读取 analyze 结果和当前关键证据，做 `PASS`、`FAIL`、`CONDITIONAL`、`BLOCKED`、`NEEDS_DECISION`。`CONDITIONAL` 表示有明确条件、owner、关闭路径和回看点的有条件放行；普通 warning 只是附带风险说明，不是独立 verdict。`sp.gate` 不应完整重算 `sp.analyze` 的所有检查，只做必要复核和阶段决策。若 `analysis.md` 缺失、过期、矛盾、没有当前 `Memory Check Summary`，或无法覆盖本次 gate 问题，应回到 `/sp.analyze`；只有能用一个小的直接检查判定 `FAIL`、`BLOCKED` 或 `NEEDS_DECISION` 时，gate 才可以不退回 analyze。

## 模型分工与复核

SP 鼓励充分使用模型能力，但不鼓励把所有判断压进一个上下文里一次性完成。

适合分工的情况：

- 一个任务可以拆成互不冲突的独立读集，例如安装机制、命令模板、memory 规则、测试验证分别检查。
- 需要第二视角复核，例如 Claude、Gemini 或另一个 agent 检查方案是否存在遗漏。
- 主模型正在执行实现，旁路模型可以做只读审计、风险清单或回归检查。

不适合分工的情况：

- 子任务会修改同一批文件，容易互相覆盖。
- 主流程下一步必须依赖该结论，等待分工反而增加上下文成本。
- 问题本身需要用户业务决策，外部模型只能提供意见，不能替用户决定。

模型分工必须满足两个边界：

- 外部模型的意见是审计输入，不是事实本身；最终仍要用本地文件、测试、安装结果和源文档验证。
- 如果模型之间意见不一致，应把背景、影响、各方观点、原版做法和推荐选项汇总给用户，而不是让其中一个模型强行拍板。

### 多 agent 协作协议

SP 支持多个 agent 协作，但不绑定某个宿主的子 agent 实现。Codex、Claude、Gemini 或其他宿主可以用原生子 agent、CLI 多进程、`git worktree` 多工作区，或者人工打开多个会话来执行；SP 只规定协作协议和验收边界。

默认模型是 `Coordinator + Workers`：

- `Coordinator` 负责源文档、任务 DAG、任务分配、共享 memory、串行合并、最终验证和阶段门禁。
- `Worker` 只负责一个被分配的任务或 workset，在允许写入范围内实现、验证并输出 handoff。
- `Reviewer` 是可选角色，只做只读复核、风险清单、测试建议或结果审计，不直接改共享 truth 文件。

多 agent 机制必须由当前 SP 命令的 `Coordinator` 主动发起。用户在 Codex 中执行 `$sp-*` skill，或在 Claude/Gemini 等宿主中执行对应 `sp.*` 命令时，当前被调用的主 agent 默认就是 coordinator。它负责判断当前阶段是否适合并行、是否值得并行、是否具备隔离条件，并生成 worker task packet 或 reviewer 审查要求。Worker 不能自己发现“我可以并行”后扩大任务范围，也不能主动改写共享 truth。

发起顺序应固定：

1. 用户调用一个 SP 命令。
2. 当前 agent 成为 coordinator，读取当前阶段需要的 source docs、memory、tasks、trace 和验证约束。
3. Coordinator 判断是否存在可并行的只读审查或实现任务。
4. 如果适合并行，coordinator 生成分配表、task packet、write set、handoff 格式和收口规则。
5. 宿主负责实际启动 worker：可以是 Claude Code subagent、Codex 独立 skill 会话、Gemini CLI 会话、`git worktree` 工作区，或人工复制 task packet 到新会话。
6. Worker 按 packet 执行并返回 handoff。
7. Coordinator 串行复核、合并、回写 memory/trace/tasks，并运行 `sp.analyze` 或 `sp.gate`。

如果宿主不支持自动子 agent，SP 仍应可用。Coordinator 应把 task packet 明确输出给用户，由用户手动打开其他 agent 会话执行；不能因为没有自动调度能力就把多 agent 规则写成不可执行的隐式假设。

Task packet 和 handoff 的载体要按规模选择。小型人工协作可以放在当前命令输出里；多个 worker、长 handoff 或需要复盘时，应优先写成 feature-local 文件，例如 `<feature>/workers/<task-id>-packet.md` 和 `<feature>/workers/<task-id>-handoff.md`。这样 coordinator 可以按文件逐个读取摘要，不必把所有 worker 的长上下文塞进同一轮对话。

Task packet 和 handoff 不能把正文写进 `tasks.md`。`tasks.md` 是高频读取的任务树，只能记录任务状态、简短证据和必要的 handoff 文件引用，例如 `Evidence: workers/T012-handoff.md`。把 packet、长日志、完整 diff 或长 handoff 塞进 `tasks.md`，会污染后续上下文并放大 token 消耗。凡是被 `tasks.md`、`analysis.md`、`gate.md` 或 open item 持久引用的 handoff 文件，清理前必须先把关键证据摘要内联到引用方，或保留该 handoff 摘要文件；不能留下指向已删除临时文件的死链。

Task packet 和 handoff 不是 memory。它们属于 feature-local execution artifacts，只服务本轮并行协作、复核和故障复盘。它们必须位于 `memory/` 之外，memory recall 和自动扫描路径必须显式排除 `<feature>/workers/`；后续 agent 不能把过期 worker 产物当作稳定事实引用。Worker 的 handoff 可能失败、越权、过期、互相矛盾或只完成局部任务，因此不能直接写进稳定 memory。只有 coordinator 串行复核后确认的稳定事实、风险、trace 变化、open item、任务状态和验证证据，才允许回写到共享 truth 面。其他 worker 不得把包含临时 anchor 的 handoff 当作稳定依据继续引用；Reviewer 发现临时 anchor 外泄到长期文档、代码、测试名或稳定 memory 时，应标为 warning 或 blocker。

`workers/` 执行产物应有生命周期。当前批次未收口前保留；收口后只保留对复盘有价值的 packet/handoff 摘要或失败现场，长日志、废弃 worktree、临时 branch 和无用 diff 应清理或归档，避免文件搜索时反复命中过期材料。清理前如果会影响复盘，应先在 `analysis.md`、`gate.md`、`tasks.md` 或 open item 中留下可独立理解的必要证据摘要，并更新或移除已失效的文件指针。清理 `<feature>/workers/` 前，coordinator 应检查 `tasks.md`、`analysis.md`、`gate.md` 和 open item 是否仍有指向该文件的活跃引用，避免留下死链。

命令并发边界：

- `sp.specify`、`sp.clarify`、`sp.flow`、`sp.ui`、`sp.plan`、`sp.tasks`、`sp.analyze`、`sp.gate` 默认由 coordinator 串行执行，因为它们会改变需求、计划、任务 DAG、memory、trace 或阶段准入结论。
- `sp.implement` 可以由多个 worker 并行执行，但只适用于 `tasks.md` 中明确标记 `[P]` 且 write set 不重叠、依赖已满足、共享 memory 只读的任务。
- 只读搜索、代码定位、风险审计、测试建议可以并行运行，但它们的结论必须回到 coordinator 统一判断，不能直接作为 PASS。

决策类命令可以让多个 agent 做“参谋”，不能让多个 agent 同时“拍板”。也就是说，不能同时启动 3 个 agent 各自执行 `sp.plan` 并分别写入 `plan.md`；正确方式是一个 coordinator 执行 `sp.plan`，其他 agent 只读 review、challenge、调研替代方案或检查遗漏，最后由 coordinator 汇总成唯一版本。

各命令的多 agent 适配边界如下：

| 命令 | 默认执行者 | 可并行角色 | 禁止事项 | 原因 |
|---|---|---|---|---|
| `sp.specify` | 单 coordinator | Reviewer 只读检查需求冲突、范围扩大、新 feature 迹象 | 多 agent 同时写 `spec.md` | 需求事实源只能有一个，否则后续 plan 会分叉 |
| `sp.clarify` | 单 coordinator | Reviewer 只读补充问题风险 | 多 agent 同时向用户提问或各自记录决策 | 人工决策必须收口成一份澄清包 |
| `sp.flow` | 单 coordinator | Reviewer 只读检查流程分支、异常路径、角色遗漏 | 多 agent 同时改流程主轴 | flow 是 UI/API/data/测试的主连接线，不能多写 |
| `sp.ui` | 单 coordinator | Reviewer 只读检查界面元素、数据绑定、业务动作遗漏 | 多 agent 同时改同一 screen 或 UI source docs | UI 要回链 flow，孤立并行容易断链 |
| `sp.plan` | 单 coordinator | Researcher/Reviewer 只读调研技术方案、风险、依赖 | 多 agent 同时写 `plan.md` 或各自定路线 | 技术路线、workset 和实现准入必须唯一 |
| `sp.tasks` | 单 coordinator | Reviewer 只读检查任务依赖、遗漏、并行边界 | 多 agent 同时生成任务 DAG 或改任务编号 | 任务 DAG 是执行调度源，不能产生多套编号 |
| `sp.implement` | Coordinator + 可选 workers | Worker 并行执行明确 `[P]` 实现任务；Reviewer 只读复核 | Worker 改共享 truth、扩大 write set、直接 PASS | 实现可以并行，但状态收口必须串行 |
| `sp.analyze` | 单 coordinator | Reviewer 只读复核诊断结论或长上下文查漏 | 多 agent 各自给最终 PASS/FAIL | analyze 是诊断入口，结论要汇总到一份报告 |
| `sp.gate` | 单 coordinator | Reviewer 只读挑战放行依据 | 多 agent 各自放行阶段 | gate 是阶段门禁，只能有一个最终裁决 |

例外规则：如果 `sp.plan`、`sp.tasks` 或 `sp.analyze` 的工作量很大，可以拆成只读子问题交给外部 agent，例如“检查 API 风险”“检查 UI-flow 断链”“检查测试覆盖缺口”。这些结果必须作为输入回到 coordinator；coordinator 才能修改 source docs、tasks、memory、trace 或 gate 结论。

`sp.tasks` 应生成可执行的任务 DAG，而不只是线性清单。每个任务都应能看出前置依赖、后置影响、是否可 `[P]`、允许写入范围、验证路径和 handoff 期待。只有同时满足以下条件，任务才适合 `[P]`：

- 前置任务已经完成或不影响当前任务。
- 写入范围与其他并行任务无交集。
- 不需要同时修改共享 memory、trace、tasks 状态或全局路由。
- 不修改全局注册类文件，或者已经把注册/合并动作拆成串行 closeout 任务。
- 可以独立运行本任务的局部验证，并能在合并后接受 coordinator 的全局验证。

触及 source docs、memory、trace、任务状态或阶段结论的 `Mode: doc` 任务默认不得标 `[P]`。如果确实需要并行，只能作为只读 review/research 子任务返回建议，正式文档修改仍由 coordinator 串行执行。

新锚点不能由并行 worker 各自抢号。默认策略是 worker 只使用临时占位符，例如 `T012.TMP01`、`W2.TMP01`，并且临时占位符只出现在 handoff 和 trace 提案中，不写入生产代码、测试名或长期文档；coordinator 在 closeout 串行合并时统一登记并改写成正式主坐标。只有 coordinator 明确预分配了正式 anchor 号段时，worker 才能使用正式号段；预分配失败留下的编号空洞应作为复核信号处理，不自动视为错误。

Worker 执行时必须遵守读写边界。共享 truth 面默认只读。Worker 如果需要改变这些共享文件，应输出 proposed updates，而不是直接写入。Worker 物理上越权修改了 `Forbidden Write Set` 时，coordinator 应默认拒绝该分支或要求重跑，不应把越权改动“顺手修一修”后合并。

如果 worker 在执行中发现必须修改 forbidden/shared/global 文件才能继续，不能直接扩权。正确做法是停止扩大修改，保留或提交本任务允许范围内的有效局部结果；把所需的全局修改写进 handoff 的 proposed updates、open item 或返回给 coordinator 的任务拆分建议。确实已经产生越权 diff 时，coordinator 应要求回退越权部分、重跑 worker，或把该任务降级为串行 closeout。

并行实现应优先使用物理隔离。推荐每个 worker 使用独立 branch、临时 workspace、CI workspace 或 `git worktree`。人工多会话也应遵守同样规则：每个会话只做一个任务，不跨越自己的 write set，不直接抢写共享 memory。不要把多个 worker 放在同一个脏工作区里同时改文件，然后依靠模型记忆判断归属。

Worker task packet 必须暴露产物成熟度，避免把草稿当成稳定事实。至少应包含 `Source State: draft | ready | gate-passed | unknown`，或指向能证明状态的 gate/analysis 记录。`unknown` 默认按 `draft` 处理。Review/research worker 可以读取草稿作为背景，但不能把未通过 analyze/gate 的 flow、ui、plan、tasks、memory 或 trace 结论当作稳定依据继续放大。`Mode: impl` worker 默认要求 `ready` 或 `gate-passed`；如果必须基于草稿做探索性实现，packet 必须显式标注例外、允许写入范围和验证路线，结果不得直接作为完成任务合并。

Coordinator 不应一次性铺开过多并行 worker。默认按小批次派发和收口：每批只包含 write set 明确互不重叠、依赖已经满足、验证路径清楚的任务；上一批的 closeout 和必要全局验证完成后，再派发下一批。这样能避免十几个 handoff 同时返回造成合并风暴和上下文爆炸。

Worker 完成后必须输出 handoff，至少包含：

```md
## Agent Handoff
Task / Workset:
Status:
Execution Environment:
Allowed Write Set:
Actual Files Changed:
Anchors Affected:
Inputs Read:
Checks Run:
Result:
Evidence:
Proposed Shared Updates:
Open Items / Risks:
Merge Notes:
```

`Status` 是 coordinator 判断后续路线的机器可读入口，必须使用 §10.3 的 canonical worker status enum：`ACCEPTABLE_LOCAL`、`NEEDS_SINGLE_AGENT_REVIEW`、`REJECTED_BOUNDARY_VIOLATION`、`STALE` 或 `FAILED_CHECKS`。`Execution Environment` 可包含 agent id、role、branch/worktree、baseline ref 或等价执行环境证据；不要把这些扩成第二套 handoff 字段。

- `ACCEPTABLE_LOCAL`：任务在允许范围内完成，必要检查已运行或说明不可运行原因，且可由 coordinator 独立复核。
- `NEEDS_SINGLE_AGENT_REVIEW`：存在可保留的局部结果或有用证据，但仍缺验证、缺上下文、存在依赖不清，或需要转为单 agent 顺序复核。
- `REJECTED_BOUNDARY_VIOLATION`：worker 触碰 forbidden/shared/global 文件、扩大 write set，或违反任务边界。
- `STALE`：worker 基线过旧、超时、丢失 handoff 或结果无法可靠复核。
- `FAILED_CHECKS`：任务尝试失败、检查失败，或不能合并为完成结果。

`Inputs Read` 只记录影响实现判断的少数核心文件或文档，不要求把所有 grep、搜索结果和无关文件逐项列出，避免 handoff 变成长日志。

简单任务可以使用轻量 handoff，但不能省略状态和证据。最小字段是：`Status`、`Actual Files Changed`、`Checks Run`、`Evidence`、`Proposed Shared Updates`。涉及风险、越权、临时 anchor、失败、局部结果或人工决策时，必须使用完整 handoff。

Reviewer 的输出也要结构化，但保持只读。推荐回执字段是：`Scope Reviewed`、`Findings`、`Severity: blocker | high | medium | low`、`Evidence`、`Suggested Route`。Reviewer 的结论只能回到 coordinator；需要沉淀时由 coordinator 写入 open item、analysis 或 gate，Reviewer 不能直接改共享 truth。

`Proposed Shared Updates` 必须结构化，不能只写一段自由文本。推荐使用 YAML 代码块：

```yaml
Proposed Shared Updates:
  - target: memory/open-items.md
    action: add | update | close | mark-stale
    anchor: OPEN01 | RISK02 | T012.TMP01 | <coordinator-assigned>
    evidence: <source doc, diff, test, decision, or failure output>
    reason: <why coordinator should apply this update>
```

没有 `target`、`action`、`anchor` 和 `evidence` 的 proposed update，只能作为建议阅读，不能直接合并进共享 truth。

Coordinator 的 closeout 必须串行执行：

- 逐个读取 worker handoff 和 diff。
- 检查是否越权修改、write set 重叠、隐式依赖冲突或缺少验证证据。
- 逐个 merge 或 cherry-pick，遇到冲突先停止，不让多个冲突叠在一起。
- 合并后运行相关测试、构建、lint、脚本检查或人工验证路径。
- 统一更新共享 truth 面中的必要状态和稳定事实。
- 本批 worker 全部收口后，再统一运行一次 `sp.analyze` 或等价检查，确认 UI/API/data/contract/flow/trace/memory 没有互相矛盾。
- 最后由 `sp.gate` 判断能否进入下一阶段。

Closeout 采用逐个摄取原则。Coordinator 一次只处理一个 worker：读 handoff、查 diff、判断状态、尝试合并、运行必要验证、写回必要状态，然后再处理下一个 worker。不要一次性把 3-5 个 worker 的完整 handoff、diff 和测试日志全部塞进上下文。单个 worker 收口并写回稳定状态后，其完整 handoff/diff 可以移出当前工作上下文，只保留状态、证据摘要和必要指针。

遇到物理 merge/cherry-pick 冲突时，coordinator 不应在合并阶段手写代码解冲突。默认动作是 abort 当前合并，标记该 worker 为 `FAILED_CHECKS` 或 `STALE`，保留冲突摘要和影响文件，然后选择重派、single-agent sequential recovery、创建 integration task，或回到 `sp.tasks` 重新拆分。逻辑冲突也是同样原则：不能为了合并而即兴改业务规则。

`NEEDS_SINGLE_AGENT_REVIEW` 不能直接当作完成合并。Coordinator 可以保留 allowed 范围内、证据充分且不扩大风险的局部 diff，但对应任务保持 open，或拆出串行 closeout/验证/决策任务；没有验证或依赖不清的局部结果不得标记 `[X]`。

越权修改的处置也要显式记录。Worker 触碰 `Forbidden Write Set` 时，coordinator 应把该 handoff 标为 `REJECTED_BOUNDARY_VIOLATION` 或 `NEEDS_SINGLE_AGENT_REVIEW`，记录越权文件、原因、是否有可保留的 allowed diff，以及下一步路线。不得静默丢弃，也不得静默合并。若越权来自任务本身拆错，应回到 `sp.tasks` 或 `sp.plan` 调整任务边界。

如果 worker 超时、崩溃、丢失 handoff，或临时 branch/worktree 已废弃，coordinator 不应无限等待。应把该 worker 标为 `STALE`，检查是否有可用 diff 和风险；没有可靠 handoff 时，默认丢弃该 worker 结果、把任务退回 unassigned/open，并记录下一步是重派、single-agent sequential recovery，还是回到 `sp.tasks` 重新拆分。

超时阈值不应靠模型临场猜。Task packet 应包含 `Timeout / Attempt Limit`，或引用当前项目默认值。没有明确阈值时，coordinator 不应无限等待；在人工多会话场景中，超时由用户或 coordinator 明确宣布后生效。Stale 任务可以重派，但必须生成新的 packet 或刷新 base revision，不能让旧 worker 继续基于过期上下文合并。

`sp.analyze` 在多 agent 场景下要重点检查 worker 结果之间的矛盾，而不是只检查单个任务是否自洽。它应关注：UI 调用的 API 是否存在、API 契约和数据模型是否一致、两个 worker 是否改了同一业务状态、trace anchor 是否断链、open item 是否被错误关闭、proposed shared updates 是否互相冲突、合并后测试是否失败。

`sp.analyze` 发现跨 worker 矛盾时，应输出明确路线：可自动修复的证据缺口给 `FAIL` 并指向修复任务；需要人工产品、风险、合规、范围或验证降级选择的给 `NEEDS_DECISION`；缺少安全自动推进条件的给 `BLOCKED`。`sp.analyze` 不应在诊断阶段直接回滚 worker 结果；回滚、丢弃或重派由 coordinator closeout 或后续修复任务执行，并记录证据。批次 closeout 后的 analyze 应默认走增量优先：深查本批改动锚点、未关闭项和直接依赖；已经检核通过且依赖未变的部分只做轻量抽查，避免每批重复全量深读。

`sp.gate` 在多 agent 场景下不能只看每个 worker 都声称完成。它要确认 coordinator 已经完成串行合并、共享 memory 收口、全局或相关验证、风险关闭或延期记录，并且没有未处理的 worker handoff、未合并分支、打开的 blocker 或需要人工决策的问题。

多 agent 出错后的兜底必须显式成文。凡是 worker stale、失败、不可验证、越权、write set 冲突、依赖未形成 closure，或结果需要单 agent 复核，coordinator 都要冻结该批次，停止继续派发和合并未验证输出，按 §10.3 的 fallback report 字段记录 `Fallback Reason`、`affected worker classifications`、`changed files`、`evidence kept`、`discarded/deferred results`、`single-agent recovery route` 和 `next /sp.* step`。缺少 fallback report 时，`sp.analyze` 和 `sp.gate` 不得把该批次作为 PASS 依据。

不要为了多 agent 协作引入过重机制：

- 不做 worker 之间的 P2P 协商；共享信息通过 coordinator 和 handoff 中转。
- 不做 AST 级锁、函数级锁或复杂调度平台；文件级/目录级 write set 已足够作为默认边界。
- 不设计复杂自动 rebase 策略；merge 冲突或合并后测试失败时，优先打回当前 worker、创建修复任务，或回到 `sp.plan` / `sp.tasks` 重新拆分。
- 不把某个宿主的子 agent 能力当成 SP 唯一入口；宿主能力只是执行方式，SP 的稳定协议仍是任务 DAG、write set、handoff、串行 closeout、analyze/gate。

轻量验证路径可以从人工多会话开始：一个主会话做 coordinator，多个新会话做 worker，各自按 `sp.implement` worker 边界执行，最后把 handoff 带回主会话合并和检查。该方式能先验证协议是否约束得住模型，再决定是否需要自动化调度。

## 降级与后备策略

SP 的规则不能因为某个工具、模型或检查不可用就整体宕机。默认策略是向更稳定、更上层的路线兜底。

降级顺序：

1. 专用工具可用时，用专用工具辅助定位或检查。
2. 专用工具失败时，回退到 memory、source docs、文本搜索、测试和人工可读证据。
3. 自动检查无法判断时，生成报告和 open item，不把不确定伪装成 PASS。
4. 低层修复连续失败时，上移到 tasks、plan、spec 或用户决策。

这适用于 CodeGraph、轻量检查脚本、外部模型审计、压缩模型、长上下文模型和宿主 CLI。工具越强，越应该被当作加速器；工具不可用时，主流程仍应能按 SP 文档、memory 和验证纪律继续推进。

## 证据分级门禁

SP 允许灵活规则，但不能让 PASS 变成模型的主观感觉。PASS 的标准不是“所有检查都固定命中”，而是“关键风险都有证据覆盖，剩余问题都有记录、责任、回看点，不会让后续工作跑偏”。

推荐判断公式：

```text
PASS =
  active feature 正确
  + source docs / memory / tasks 不冲突
  + 核心验收路径可追踪
  + 高风险项已关闭或被人工明确接受
  + 关键改动有测试或验证证据
  + 剩余问题已进入 open-items 且不阻断下一阶段
```

PASS 需要优先绑定可复核证据，而不是自然语言自我解释。凡是可以机械检查的内容，应先用机械证据约束模型判断：active feature 对应目录存在；核心占位符、TODO/TBD/placeholder 不残留在必需源文档中；关键 trace 坐标能在当前 read set 中找到 source 回链；测试、构建、lint 或脚本检查以当前运行结果为准；`memory/open-items.md` 中的 `Blocker=Open`、High Risk 缺字段、关键验收断链不能被一句“风险可控”覆盖。

`/sp.analyze` 和 `/sp.gate` 应优先汇总误差信号，而不是只写长篇结论。推荐用轻量面板列出：Blocker、High Risk、非平凡 `@t0`、`@r0`、UnresolvedRef、stale memory、trace/acceptance 断链、失败检查。面板不要求复杂计分，但应说明这些信号相比上次是减少、持平还是增加。若关键误差信号增加，不能只给乐观 PASS；必须说明原因、影响和下一步 `/sp.*` 路线。

`/sp.analyze` 和 `/sp.gate` 可以更新 routing、status、open-items 和 memory，但不能用本轮判定后的写回反过来证明本轮 PASS。本轮 PASS 的依据必须来自当前输入、当前检查结果、上游 source documents、当前代码/测试证据或明确人工决策。写回只能记录这些证据导致的状态变化，不能把模型刚写下的乐观状态当成证据本身。

安装后的项目中，轻量检查脚本的标准路径是 `.specify/scripts/...`。在 SP 源码仓库开发态下，如果 `.specify/scripts/...` 不存在，才允许使用根目录 `scripts/...` 作为 fallback。不要把源码态路径误写成安装态规范，否则模型会在用户项目里找错脚本。

### 硬门禁：不能 PASS

以下情况必须阻断 `sp.gate`、`sp.analyze` 或阶段 PASS：

- 目标不清：`spec.md`、`plan.md`、`tasks.md` 仍有核心占位符、范围不明或验收标准缺失。
- 路由错误：active feature 不存在，memory 指向过期 feature，或 source docs 与 memory 冲突且未标记 stale。
- 高风险未收口：`Blocker=Open`，或 High Risk 没有 owner、影响范围、回退或降级方案、关闭条件。
- 非平凡 `@t0` 断链：`@t0` 影响范围、验收、发布、回滚、人工决策或后续工作，但没有进入 `memory/open-items.md`，或没有 owner、关闭条件和下一步验证路线。
- 验收断链：核心 acceptance 找不到对应 flow、UI、API、data、permission 或 test/verification 证据。
- 关键 trace 断链：高风险 API、权限、数据迁移、事件、副作用没有 trace 或 source 回链。
- Flow-UI 断链：关键流程步骤没有类型或业务含义，`ui` 类型步骤没有 UI 主坐标且没有 open item，孤儿 UI 没有 FLOW 来源，关键 UI action 没有业务事件，业务事件没有 effect、API 或状态变化，强副作用没有数据/API/失败路径。
- 状态混淆：纯 UI 本地状态被写成业务流程状态，或业务状态变化被藏在 UI 细节里，导致权限、数据、验收或 API 关系无法判断。
- 测试证据缺失：改动触及核心行为，但没有测试、手工验证记录，或明确的不可测说明。
- memory 误导：memory 与当前文档、代码或测试冲突，且没有刷新、标记 stale 或回到源文档修正。
- 自我证明：`sp.analyze` 或 `sp.gate` 用本轮刚写入的乐观 memory/status/open-items 作为本轮 PASS 的主要依据，而不是引用当前输入、检查结果、源文档、代码/测试证据或人工决策。

这些问题会让项目方向错，继续执行会扩大错误，所以不能只作为提醒处理。

“不能 PASS”不是“流程死掉”。它的含义是不能进入更下游的实现、交付、合并或发布；允许且鼓励带着阻断证据向上回退，修正任务、计划、规格或源文档。连续两次向上修正后仍无法消除同一硬门禁，应停止自动推进并向用户说明背景、影响、选项和推荐方案。

### 软门禁：允许通过，但必须记录

以下情况通常不阻断，但必须进入 `memory/open-items.md`、gate 报告或阶段输出：

- 普通 trace 缺口。
- 非核心测试缺口。
- 平凡 `@t0`：只影响局部文案、格式、低风险 UI 微调或一眼可复核的轻量验证提醒，不影响范围、验收、发布、回滚、人工决策或后续工作。
- 普通关系词不标准。
- 非高风险边界对象缺少代码锚点。
- 文件命名与测试命名不一一对应。
- CodeGraph 或其他可选辅助工具不可用、失败或结果过期，但已经回退到 memory、source docs、文本搜索和测试证据。

这些问题不会直接导致当前阶段判断错误，但后续可能需要补。它们应该可搜索、可回看、可关闭，不能只留在聊天历史里。

soft issue 的边界必须收窄：只有不影响路由、契约、测试、验收、trace、`Blocker`、High Risk 的低风险 warning 才能带着走。测试失败、构建失败、路由错误、验收断链、关键 trace 断链、打开的 `Blocker`、缺字段的 High Risk 都不是 soft issue，不能被包装成 warning 后继续推进。

### 人工决策门禁：模型不能擅自 PASS

以下情况不是技术检查能决定的，模型必须向用户询问，不能自行 PASS：

- 多个方案都合理，但取舍涉及成本、体验、长期架构或产品方向。
- 需求、文档、代码或用户意图之间存在冲突。
- 是否接受风险继续推进。
- 验证成本过高，是否允许降级验证或延后验证。
- 范围拆分存在争议，例如是否把复杂 workset 升级为子 feature 或子项目。
- 一个 UI action 可能对应多种业务含义，或错误路径涉及补偿、重试、撤销、人工介入、状态回滚。
- 权限、角色、租户隔离、审批责任、字段业务校验来源不清，继续实现会改变业务事实或验收含义。

非交互或 headless 环境也不能把人工决策伪装成自动通过。如果遇到软门禁或低风险待办，可以写入 `memory/open-items.md`、阶段输出或报告后继续；如果遇到风险接受、范围拆分争议、业务取舍、合规数据风险、不可逆迁移或硬门禁，应输出 `NEEDS_DECISION` 或 `BLOCKED`，记录背景、影响、选项、推荐和下一步 `sp.*` 路线，然后停止进入更下游阶段。默认保守策略是“不自动拆分、不自动接受风险、不做不可逆动作”，而不是为了不中断而继续猜。

人工决策不是模型自己拍板。模型可以基于证据给出推荐，但推荐不等于正式决策。遇到需要人工选择的事项时，默认路线是进入 `/sp.clarify`：模型先生成一个人能直接判断的决策包，用户选择其中一个方案或给出修正方案，模型再把用户选择记录成正式决策。没有捕获到用户选择之前，下游命令必须把该事项视为 `NEEDS_DECISION`、`BLOCKED` 或 open item，不能把模型推荐当成 PASS 依据。

`/sp.clarify` 生成的决策包必须固定包含：背景、已确认依据、影响、2-4 个候选方案、每个方案的取舍、推荐方案、下一步 `/sp.*` 路线。用户选择后，模型记录的决策必须固定包含：用户选择、选择原因或用户补充、影响范围、要回写的文档或 memory、关闭条件、回看条件和下一步命令。决策记录可以写入 `clarifications.md`、`clarify-log.md`、`spec.md`、`memory/open-items.md` 或相关阶段文档，但必须能被后续 agent 搜到并复核。

如果命令模板原本要求“询问用户后等待”，在 headless 或非交互运行中不能无限等待，也不能自动当作用户同意。正确做法是输出 `NEEDS_DECISION` 或 `BLOCKED`，并把背景、影响、2-4 个选项、推荐方案和下一步 `/sp.*` 路线写清楚。输出末尾应追加机器可读状态，例如 `SP_STATUS: NEEDS_DECISION`、`SP_STATUS: BLOCKED` 或 `SP_STATUS: FAIL`，并追加 `SP_EXIT_CODE: 1`，作为自动 runner 可解析的阻断标记；如果宿主支持进程退出控制，还应使用非零退出状态或等价阻断信号，避免 CI、脚本或自动 runner 把需要人工决策的结果当成成功继续执行。

headless 自动化要优先靠隔离而不是靠事后强行清理。推荐在临时工作区、CI workspace、临时分支或 `git worktree` 中执行高风险自动任务。CI 或自动开发 runner 的首选失败策略是丢弃本次任务创建的临时分支、临时目录或 worktree，而不是在用户当前工作区做复杂 partial reset。任务开始前应记录当前 dirty files 和未跟踪文件；如果后续失败且改动只发生在本次任务创建的隔离区，可以按任务范围清理。本次任务与用户已有改动重叠、无法确认所有权、或清理需要破坏性命令时，应返回 `BLOCKED` 并说明现场，而不是自动 `git reset`、`git checkout` 或 `git restore`。

进入 `BLOCKED` 前必须留下 headless 失败现场报告：改了哪些文件、失败命令或检查结果、当前判断、为什么自动恢复不安全、下一步 `/sp.*` 路线。CI 或自动 runner 支持 artifact 时，可以把 failure report 保存为 artifact；不支持时，也要在命令输出和 open item 中留下可复盘摘要。

问人时必须说人话，不允许只抛术语或让用户自己猜背景。每次询问应包含：

- 背景：现在卡在哪里，已经确认了什么证据。
- 影响：不同选择会怎样影响后续设计、实现、测试、风险或成本。
- 选项：给出 2-4 个推荐选项，不要给一长串开放式问题。
- 取舍：说明每个选项的收益和代价；推荐选项还要说明为什么比更慢、更重或更保守的方案更合适。
- 推荐：给出模型自己的推荐选择，并说明理由；如果没有足够依据推荐，也要明确说原因。
- 下一步：说明用户选择后应该继续执行哪个 `/sp.*` 命令，以及哪些文档、memory 或 open item 会被更新。

### 灵活规则的验证边界

SP 的灵活规则应按证据而不是按死板形式判断：

- 测试文件降权，不排除。修改既有代码前，必须查找并读取直接相关测试、失败测试、同名/相邻测试，或至少读取能说明契约的测试函数名、断言摘要和失败输出。间接影响测试可以先读签名和范围，必要时再展开全文。PASS 不要求全量读测试，但核心 acceptance 必须有测试或验证证据。
- 轻量检查脚本以报告为主。普通 warning 不阻断；路由错误、Blocker、High Risk、验收断链、关键 trace 断链才阻断。
- 代码锚点只强制用于高风险边界对象，例如 API handler、权限规则、数据迁移、事件处理、核心测试。普通内部函数不强制。
- 测试覆盖不按文件名一一对应强制判断。优先检查 acceptance 是否有验证证据。
- 关系类型采用默认推荐词和 feature 级扩展登记。未登记扩展词通常只警告；如果关系含义不清导致影响半径无法判断，才阻断。
- 低风险小改可以走轻量快通道：影响面清楚、通常不超过一个文件、无架构/依赖/数据/权限/验收变化时，只需要在改前留下简短计划、改后留下当前验证证据；不需要重型 impact 文档。但不能先改完再补写“事前计划”。

## 人工介入边界

SP 追求减少人工介入，但不追求取消人工判断。

需要人工介入的情况：

- 业务目标、优先级、范围或成功标准不清楚。
- 多个方案都可行，但取舍涉及成本、风险、体验或长期方向。
- 涉及破坏性操作、公开发布、数据迁移、安全合规。
- 文档、代码、用户意图之间发生冲突。
- 自动修复连续失败，需要重新判断设计或范围。

不需要人工介入的情况：

- 按已确认规则补全文档。
- 按明确任务修改低风险文件。
- 执行测试、检查、格式化、文档一致性复核。
- 根据明确失败原因做小范围修复。

## 与命令体系的关系

SP 的命令只是方法论的载体，不是方法论本身。

命令应服务于几个目的：

- 把模糊输入变成结构化规格。
- 把规格拆成设计、任务和验证路径。
- 把相关上下文路由到当前工作。
- 在阶段切换前检查是否可以继续。
- 在实现后收集验证证据并沉淀结论。

用户可见命令形式统一使用 `/sp.*`。这里的“用户可见”是指说明用户下一步要直接输入或点击的命令，例如 `/sp.analyze`、`/sp.plan`。

为了贴近 upstream Spec Kit 的机制，不同位置允许不同写法：

- 直接用户调用、下一步建议、README 使用说明：Claude、Gemini 等 slash-command 宿主使用 `/sp.<command>`；Codex 使用 skills，输入 `$`、运行 `/skills` 后选择 `sp-<command>`，或提出匹配 skill description 的自然语言请求。
- 命令模板 frontmatter 的 `agent:`、内部阶段名、职责描述：可以使用 `sp.<command>`，因为这里是内部标识或阶段名称，不是让用户直接输入。
- extension hook 这类机器字段可以保留无斜杠命令值，例如 `EXECUTE_COMMAND: {command}`；展示给用户的 `Command:` 或 `To execute:` 再使用 `/{command}`。
- Codex 保持 upstream 风格的 skill 包目录，例如 `sp-analyze/SKILL.md`。当前 Codex 已废弃 custom slash commands/custom prompts，主入口是 skills；`.codex/prompts/` 和 plugin 命令面不再作为当前 SP 的有效入口。

## 与原版 Spec Kit 的关系

SP 应尽量保留原版 Spec Kit 的机制骨架，因为稳定机制能降低未知风险。

SP 的改进重点是内容和工程控制：更清楚的分层文档、更强的上下文管理、更严格的验证纪律、更明确的人机决策边界。

可以用一个简单比喻理解：Spec Kit 是瓶子，SP 改进的是瓶子里的水。除非瓶子本身无法承载目标，否则不应轻易改瓶子。

## 未来演进原则

后续改进 SP 时，应遵守以下原则：

- 先说明新增机制解决什么工程问题，再决定是否加入。
- 能靠内容模板解决的，不优先改安装和宿主机制。
- 能靠上下文路由解决的，不要求模型全量读取。
- 能小步验证的，不做大范围不可验证改动。
- 每个差异化设计都要能解释、能测试、能回滚。
- 外部工具的新思想先抽象成 SP 方法论，再决定是否落地成命令或模板。

## 成功标准

SP 方法论是否有效，不看文档是否复杂，而看真实项目中能否达到这些结果：

- 模型能找到当前工作真正相关的规格、接口、文件、界面、数据和测试。
- 用户不需要反复解释同一背景。
- token 更多用于解决问题，而不是重复读取和纠错。
- 新会话能通过 project memory 找到活跃 feature 和最小读集。
- 模型能区分 memory、源文档、当前代码之间的优先级，并识别过期 memory。
- 编码前能通过 trace 找到相关流程、界面、接口、数据、权限和测试。
- 代码结构、模块边界和测试命名能帮助模型定位业务关联，而不是只能靠全文搜索。
- 每个重要代码变更都能追溯到 workset、acceptance、接口、数据或风险来源。
- 编码后能把变化后的稳定事实、风险和验证证据回写到合适位置。
- 任务能被拆小、执行、验证、回看。
- 关键业务决策不会被模型擅自替代。
- 问题能早发现、早修复，而不是在实现末端集中爆炸。
- 长流程自动化开发中，错误率下降，返工减少，人为介入减少。
