# AI 辅助 PRD 需求梳理项目调研

## 结论

这次 GitHub 调研的结论是：已经有不少项目在尝试让模型帮助用户从一句话想法梳理 PRD，但成熟项目真正有价值的不是“自动写一份 PRD”，而是把需求发现、来源标记、不确定性管理、质量门、下游任务化和上下文包做成一套受控流程。

SP 可以吸收这些方法论，但不应照搬外部项目的重型形态。更稳的方向是：新增可选 `/sp.prd` 作为 0 到 1 的需求发散入口，继续保持 `/sp.specify` 是稳定规格入口，继续让 `spec.md`、flow、ui、plan、tasks、implement、analyze、gate 形成后续受控链路。

最值得吸收的内容有六类：

- 访谈式需求收集：先让用户说人话，再由模型整理、补洞、追问高价值问题。
- 发散与收敛分离：PRD 阶段允许候选和不确定内容，spec 阶段只接收确认事实。
- 来源和不确定性标签：区分用户原话、文档事实、AI 候选、用户确认、假设、待决。
- 质量门：PRD 完成前检查范围、验收、非目标、术语、可决策性和下游可用性。
- 下游可执行性：PRD 不是终点，必须能稳定交给 specify、flow、ui、plan、tasks。
- Token 控制：按项目复杂度调整深度，批量少问，缺口超过阈值就落盘并路由，不在聊天里无限追问。

## 调研范围

本次重点查看了这些项目和方向：

- [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)：包含 brainstorming、product brief、PRD create/update/validate、PRD coach、PRD validation checklist。
- [automazeio/ccpm](https://github.com/automazeio/ccpm)：从 PRD 到 epic、task、GitHub issue、并行执行和进度追踪。
- [coleam00/context-engineering-intro](https://github.com/coleam00/context-engineering-intro)：用 INITIAL.md 生成 PRP，再执行 PRP，强调上下文工程和可执行验证门。
- [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master)：解析 PRD 生成任务、依赖、复杂度和研究增强。
- [fivetaku/show-me-the-prd](https://github.com/fivetaku/show-me-the-prd)：一句话输入，通过 5-6 个结构化问题生成 PRD、数据模型、阶段计划和 AI 项目规格。
- [feba-capital/prd-generator](https://github.com/feba-capital/prd-generator)：强调 TBD / Assumed / Proposed 不确定性标签、16 个质量门、多文档一致性检查。
- [dredozubov/prd-generator](https://github.com/dredozubov/prd-generator)：从对话上下文生成 PRD 的轻量 Claude Code 插件。
- [rihebty/flow-kit](https://github.com/rihebty/flow-kit)：纯 Markdown 流程包，强调低运行时依赖、阶段工件、上下文文件和按需引用。
- [anombyte93/prd-taskmaster](https://github.com/anombyte93/prd-taskmaster)：Claude Code skill，通过 12+ 个问题生成面向工程和 Taskmaster 的 PRD，并做质量检查、任务拆分提示、依赖和复杂度估计。
- [Wirasm/PRPs-agentic-eng](https://github.com/Wirasm/PRPs-agentic-eng)：PRP 方法论，强调 PRD、代码库上下文、运行手册和验证命令组合成 AI 编码上下文包。
- [JochenYang/requirements-interview](https://github.com/JochenYang/Jochen-ai-rules)：requirements-interview skill，用多轮访谈把需求发现转成 SPEC、PRD 和 PLAN。
- [TiuTalk/project-manager skill gist](https://gist.github.com/TiuTalk/51bcb67545469bb7deaf1655b86ef2ef)：Claude Code product manager skill，强调一问一答、假设追踪、禁止过早技术化、UI chrome 高幻觉区。
- [melodic-software requirements-discovery-elicitation](https://mcpmarket.com/tools/skills/requirements-discovery-elicitation)：requirements discovery skill，强调多来源需求采集、文档挖掘、stakeholder persona 模拟、冲突处理和版本化输出。
- [Saml1211/PRD-MCP-Server](https://github.com/Saml1211/PRD-MCP-Server)：PRD MCP Server，说明 PRD 生成可以工具化，但默认引入 MCP Server 会增加 SP 的运行时复杂度。
- [PageAI-Pro/ralph-loop](https://github.com/PageAI-Pro/ralph-loop)：长循环 AI agent，把 PRD、任务、日志、历史和技能放进 `.agent/`，强调持续迭代、任务表和执行日志。
- [shotgun-sh/shotgun](https://github.com/shotgun-sh/shotgun)：代码库感知 spec-driven 工具，强调给 AI 编码代理写不容易跑偏的规格。

搜索中还发现了很多普通 “PRD generator” 或 “TaskMaster” 项目，但不少只是示例应用、普通任务管理器，或者 README 只有功能宣传，缺少可验证的方法论，因此不作为主要参考。

## 各项目方法论观察

### BMAD-METHOD

BMAD 对 SP 最有价值的地方，是把 PRD 当作一个需要引导、记录、复核和校验的过程，而不是一次性生成文档。

它的 brainstorming 有几个值得借鉴的控制点：

- 先选择工作姿态，例如用户主导、AI 共同发散、AI 自主发散。
- 发散和收敛分离，发散阶段不急着总结，收敛阶段才筛选和决策。
- 使用 memlog 记录想法、问题、决策、方向和技巧切换，避免上下文窗口丢失。
- 每次只问一个问题，避免把用户拖进长问卷。
- 技巧库按需加载，不把所有技巧一次性塞进上下文。

它的 PRD 流程也有几个重要点：

- PRD 可以创建、更新、验证，三种模式分开。
- `.decision-log.md` 作为决策审计轨迹，`addendum.md` 保存不适合进入 PRD 主体但仍有价值的深度内容。
- Discovery 阶段先让用户 brain dump，再校准项目重要性和工作模式。
- PRD 模板不是死清单，而是根据产品形态和风险选择适合的章节。
- PRD 审核使用 rubric，不只是检查标题是否齐全，而是检查是否可决策、是否有实质、是否清楚定义 done。

对 SP 的启发：`/sp.prd` 可以借鉴“工作模式 + 决策日志 + 发散收敛 + PRD 质量门”，但不需要照搬 BMAD 的多 skill、多 bundle、多子代理结构。

### CCPM

CCPM 的核心是把 PRD 放在项目管理链路的最上游：

```text
PRD creation -> Epic planning -> Task decomposition -> GitHub sync -> Parallel execution
```

它先进行 guided brainstorming，再写 `.claude/prds/<name>.md`，然后把 PRD 转成 technical epic，再把 epic 拆成任务。任务包含依赖、并行性、冲突关系和验收条件。

对 SP 的启发：

- PRD 必须面向下游任务化，而不是只写给人看。
- PRD 到实现之间应有中间层，SP 里对应的是 `spec -> flow -> ui -> plan -> tasks`，不应直接 `prd -> code`。
- 并行开发需要任务依赖和冲突边界，而不是简单“多开几个 agent”。
- 状态查询、进度、blocked 等确定性信息可以尽量由脚本或结构化文件提供，减少模型重复扫描。

不建议 SP 默认吸收 GitHub Issues 作为事实源。SP 当前更适合先用 feature-local Markdown、memory、trace-index 和轻量检查。GitHub Issues 可以作为后续可选集成。

### Context Engineering / PRP

Context Engineering 的 PRP 思路不是传统 PRD，而是“给 AI 编码代理的一次性高质量上下文包”。它要求先从 INITIAL.md 读取需求，再调研代码库、文档、示例、坑点和验证命令，最后生成 PRP 并执行。

对 SP 的启发：

- PRD 阶段不应只问业务，还应记录后续可能需要的外部资料、样例、约束和已有系统线索。
- 代码阶段需要上下文包思想，但更适合放在 `/sp.plan` 和 `/sp.tasks`，不是 `/sp.prd`。
- 可执行验证门必须尽早规划，但 PRD 阶段只记录验收种子，不直接写具体测试命令。
- “缺上下文导致 AI 失败”这个判断与 SP 的上下文管理方法论一致。

对 SP 的边界：PRP 更靠近实现准备，SP 不应把 PRD 设计成 PRP，否则会让 `/sp.prd` 和 `/sp.plan` 职责混乱。

### Task Master

Task Master 更偏 PRD 后处理：读取 PRD，生成任务、依赖、优先级、复杂度和测试策略。它也提供工具加载模式，用 core / standard / all 控制上下文成本。

对 SP 的启发：

- PRD 到任务需要解析层，而不是让模型凭记忆拆任务。
- 任务应包含依赖、验收、测试策略和复杂度判断。
- 大项目要有复杂度分析和任务扩展机制。
- 工具或规则加载应分层，日常只加载核心能力，复杂项目再扩展，避免 token 常态浪费。

SP 已经有 `/sp.tasks`，因此不需要吸收 Task Master 的完整任务系统，但可以继续强化从 `spec/flow/ui/plan` 到任务包的映射完整性。

### show-me-the-prd

show-me-the-prd 的重点是“人类友好的访谈式引导”。它从一句话想法开始，用 5-6 个结构化问题生成四份文档：PRD、数据模型、阶段计划、AI 项目规格。

值得借鉴：

- 问题必须用普通人能理解的表达，而不是直接问技术术语。
- 每个选项提供优缺点和复杂度，而不是只给选项名。
- 已有计划可以进入 enhancement mode，只检查缺口，不重做全部工作。
- 数据对象、阶段计划和 AI 行为规则可以从 PRD 阶段形成种子。

SP 不建议默认一次生成四份下游文档。SP 已经有 flow、ui、plan、tasks，`/sp.prd` 应只输出需求发散稿和下游种子，不直接替代后续命令。

### feba-capital/prd-generator

这个项目最值得借鉴的是“不确定性不能伪装成事实”。它要求所有未确认内容必须显式标记：

- `TBD`
- `Assumed`
- `Proposed`

它还强调跨文档一致性和质量门，避免 PRD、API、模型、权限等文档互相冲突。

对 SP 的启发：

- `/sp.prd` 应明确区分 `[src:user]`、`[src:doc]`、`[src:ai-proposed]`、`[src:user-confirmed]`。
- 可以增加轻量不确定性标签，例如 `[uncertain:tbd]`、`[uncertain:assumed]`、`[uncertain:proposed]`，但不要引入过重语法。
- 如果某项未决会阻断后续 specify、flow、plan 或 implement，应标记为 blocker 并写入 `memory/open-items.md`。
- 质量门不应只检查 PRD 是否有章节，而应检查是否存在隐藏决策、跨文档冲突、未标记假设和不可验收需求。

### dredozubov/prd-generator

这是更轻量的“从对话上下文生成 PRD”的插件，字段覆盖执行摘要、用户、范围、用户故事、架构、技术栈、API、风险等。

它说明轻量 PRD 生成确实有用户需求，但也暴露一个风险：如果只从聊天上下文生成 PRD，又没有来源标记、未决项、质量门和下游隔离，就容易把对话里的临时推测写成稳定事实。

SP 可以吸收它的低门槛入口，但不能吸收“直接把对话整理成正式 PRD”的弱控制方式。

### flow-kit

flow-kit 的价值在于纯 Markdown、低运行时依赖和阶段化工件。它通过 `GO.md`、阶段 prompts、CONTEXT、ARCHITECTURE、TASK、LESSONS 等文件维持上下文和流程。

对 SP 的启发：

- SP 的机制层要保持稳定，能靠 Markdown 和文件工件工作，不依赖某个宿主的短期命令能力。
- 每个阶段应有明确输入、输出和回退路线。
- 老项目进入时需要先扫描项目上下文，不能直接让模型自由写需求和代码。
- 对小项目要允许轻量路径，对大项目要保留完整路径。

SP 已经在方法论中吸收了类似思想，后续 `/sp.prd` 应继续沿用“文件是状态，不靠聊天历史续命”的原则。

### prd-taskmaster

prd-taskmaster 的价值在于把 PRD 明确写成“给 AI 任务拆解器使用”的输入，而不是泛泛的产品文档。它通过 12+ 个问题收集信息，再生成工程师可用的 PRD、质量检查、任务拆分提示、依赖和复杂度估计。

对 SP 的启发：

- PRD 阶段可以提前收集任务化所需的线索，但只能作为 seeds，不能直接越过 `/sp.specify`、`/sp.plan` 和 `/sp.tasks`。
- 问题数量不应固定照搬。SP 更适合按复杂度提问：轻量项目少问，高风险项目多问。
- PRD 质量检查要覆盖“是否可测试、是否可拆任务、依赖是否明显、范围是否明确”。
- Codex/Claude 的使用入口应尽量通过 skill/command 模板稳定触发，不依赖某个宿主的短期 UI 行为。

不建议 SP 照搬它的 `.taskmaster/` 目录。SP 已有 feature-local `specs/<feature>/`、memory、trace 和 tasks 体系，再引入一套任务目录会造成事实源重复。

### PRPs-agentic-eng

PRP 的核心不是传统 PRD，而是“AI 编码上下文包”：PRD 加上代码库路径、既有模式、关键示例、运行手册和验证命令。它证明了 AI 要稳定写代码，不能只知道产品目标，还需要知道代码怎么落、怎么验、哪里容易错。

对 SP 的启发：

- `/sp.prd` 不能承担 PRP 的全部职责，否则会过早技术化。
- `/sp.plan` 和 `/sp.tasks` 应继续承担代码上下文包职责，把 `spec/flow/ui/data/API` anchor 映射到文件、测试和验证命令。
- PRD 阶段只收集“可能需要的外部资料、已有系统、约束、验收种子”，不要写代码路径。
- 实现前 readiness 应由 `/sp.plan` 输出，而不是由 `/sp.prd` 或 `/sp.analyze` 抢职责。

### requirements-interview

requirements-interview 强调多轮访谈，并在对话推进中同步 SPEC、PRD 和 PLAN。它的优点是能把需求发现和执行计划连起来，缺点是如果没有事实源边界，容易把草稿、规格和计划同时改乱。

对 SP 的启发：

- `/sp.prd` 可以多轮访谈，但每轮要落盘，不靠聊天历史。
- 同步多个文档时要有职责边界。PRD 是草稿，SPEC 是稳定事实，PLAN 是实现准备，不应由一个阶段随意全部改写。
- 如果 `/sp.prd` 发现已经进入技术路线或任务拆分，应停止扩展并推荐 `/sp.specify` 或 `/sp.plan`。
- 多轮访谈应有退出条件，例如 ReadyForSpecify、NeedsClarification、Blocked，而不是无限继续问。

### project-manager skill

project-manager skill 的可借鉴点很集中：一问一答、只讨论 WHAT/WHY、不输出类名/文件名等实现细节、挑战过度设计、所有需求必须能追溯到用户明确说过或清楚暗示过的内容。

它还特别提醒 UI chrome 是高幻觉区域，例如 toast、徽章、图标、动画、数量提示。这个判断对 SP 很有价值，因为 UI 细节最容易被模型“顺手补上”。

对 SP 的启发：

- `/sp.prd` 阶段禁止输出 API、类名、文件名、架构层和代码路径。
- UI chrome、通知、动画、图标、badge、count 等必须标 `[src:ai-proposed] [uncertain:proposed]`，除非用户明确要求。
- 每个用户故事至少要考虑失败路径或异常路径的验收种子。
- 用户需求冲突时不能“润色过去”，必须输出人工决策包。

### requirements-discovery-elicitation

这个方向强调多来源需求采集：文档挖掘、访谈、竞品/领域研究、stakeholder persona 模拟、缺口分析和冲突处理。

对 SP 的启发：

- persona 模拟可以作为候选缺口发现工具，但不能生成稳定需求。
- 文档挖掘和外部研究必须带 `[src:doc]`，并记录来源。
- 自动冲突处理不能默认接受。低风险冲突可以给建议，高影响冲突必须进入 `/sp.clarify`。
- MCP 或多工具调研可以作为高风险/复杂项目增强，不应成为默认 PRD 路径。

### PRD-MCP-Server

PRD-MCP-Server 说明 PRD 生成可以做成外部工具或 MCP Server。但对 SP 当前目标来说，默认引入 MCP Server 会增加安装、权限、模型调用和兼容性成本。

对 SP 的启发：

- 可以借鉴“结构化输入 -> PRD 输出 -> 校验”的工具化思想。
- 默认实现仍应保持 Markdown 模板和命令模板，降低运行时依赖。
- 未来如果产品化，可以把 PRD readiness、source tag 检查、open-items 检查做成轻量 CLI，而不是一开始做 MCP Server。

### ralph-loop

ralph-loop 的价值在于把长循环执行拆成 PRD、任务表、任务文件、日志、历史和技能几个固定区域。它适合长时间自治执行，但也提醒 SP：循环越长，越需要边界、日志和终止条件。

对 SP 的启发：

- PRD 阶段不应进入长循环。最多做有限轮访谈，超过阈值就落盘并路由。
- 后续实现阶段可以借鉴日志和历史记录，但必须有震荡保护和失败签名阈值。
- `SUMMARY.md` 这种短上下文摘要值得借鉴，可对应 SP 的 feature-local `memory/index.md`。

### shotgun

shotgun 的方向是代码库感知规格，目标是让 AI coding agent 不容易跑偏。它说明“规格写给 AI 执行”已经成为一个独立方向。

对 SP 的启发：

- `/sp.prd` 和 `/sp.specify` 的产物应同时兼顾人类可读和模型可执行。
- 真正面向代码的 codebase-aware 内容应在 `/sp.plan` 阶段引入，不在 PRD 阶段提前污染业务需求。
- 规格中应该保留稳定 anchor，让后续 flow、ui、plan、tasks 和 code trace 能回链。

## 可吸收的方法论

### 1. `/sp.prd` 应采用“访谈式需求工程”

用户从 0 开始通常不会说“请给我目标用户、验收标准和非功能需求”。更自然的方式是先让用户描述想法，再由模型整理成结构，最后追问少量关键缺口。

推荐规则：

- 第一轮先让用户自由描述，不要立刻套模板。
- 每轮最多问 1-3 个高影响问题。
- 问题优先覆盖范围、目标用户、成功标准、非目标、约束、关键流程。
- 对普通用户用“你希望谁在什么情况下完成什么事”这类表达，不直接抛 PM 术语。
- 选项必须说明影响，例如会增加数据模型、权限、UI、测试或上线复杂度。

### 2. 发散稿和稳定规格必须分离

外部项目普遍有一个问题：PRD 越强，越容易被误认为下游事实源。SP 必须压住这个风险。

推荐规则：

- `prd.md` 是发散稿，可以包含候选、假设、拒绝项、开放问题。
- `spec.md` 是稳定规格，下游命令默认只认它和稳定 memory。
- `/sp.specify` 负责把 `prd.md` 中已确认内容收敛为 `spec.md`。
- `[src:ai-proposed]` 不能直接进入 `spec.md` 的稳定需求。
- 被拒绝项要保留原因，避免模型后续重复提出。

### 3. 来源和不确定性标签要轻量但强制

SP 已经接受来源标签，调研进一步证明它很重要。

推荐保留来源标签：

```text
[src:user]
[src:doc]
[src:ai-proposed]
[src:user-confirmed]
```

推荐可选增加轻量不确定性标签：

```text
[uncertain:tbd]
[uncertain:assumed]
[uncertain:proposed]
```

使用规则：

- 来源标签回答“这是谁说的”。
- 不确定性标签回答“这能不能当事实用”。
- 两者可以同时存在，例如 `[src:ai-proposed] [uncertain:proposed]`。
- 如果不确定项影响范围、验收、合规、成本、数据、权限或上线，就必须进入 `memory/open-items.md`。

### 4. PRD 质量门要检查“能不能用于决策”

不要只检查章节完整。外部成熟项目的质量门更关注内容是否有用。

推荐 `/sp.prd` 或 `/sp.analyze` 增加 PRD readiness 检查：

- 是否说明真实问题和目标用户。
- 是否说明成功标准或可观察结果。
- 是否有明确 scope in / scope out。
- 是否有非目标，防止模型顺手扩展。
- 是否有可追踪来源和未决项。
- 是否有不可验收、空泛或模板化内容。
- 是否有术语漂移和互相矛盾。
- 是否能交给 `/sp.specify` 收敛。

输出不必复杂，只要给出：

```text
PRD Readiness: ReadyForSpecify | NeedsClarification | DraftOnly
Blockers:
Warnings:
Recommended next command:
```

### 5. 根据项目复杂度调整深度

BMAD 和 Task Master 都体现了复杂度自适应。SP 应避免所有项目都走同一强度。

推荐分三档：

- 轻量：小功能、个人工具、明确需求。只做一轮整理和少量 open items。
- 标准：普通产品 feature。做来源标记、范围、角色、流程种子、验收种子。
- 高风险：合规、支付、多租户、权限、数据治理、企业流程。增加质量门、决策日志、风险和 reviewer 检查。

复杂度判断不应完全自动拍板。模型可以给出建议和理由，涉及成本、范围或风险时让用户确认。

### 6. PRD 应产生 flow/ui/plan 的种子，不直接替代它们

调研项目常把 PRD、数据模型、阶段计划和 AI 项目规则一次性生成。SP 不建议这样默认做，因为 SP 已经有更细的阶段链路。

`/sp.prd` 可以输出这些“种子”：

- Rough Flow Seeds：可能的主流程、分支、异常。
- UI Surface Seeds：可能涉及的界面或入口。
- Data Object Seeds：业务对象、字段线索、关系线索。
- Acceptance Seeds：验收标准雏形。
- Risk Seeds：权限、合规、外部依赖、数据风险。

这些种子必须由后续 `/sp.specify`、`/sp.flow`、`/sp.ui`、`/sp.plan` 继续确认和展开。

### 7. 决策日志和 rejected ideas 很重要

BMAD 的 `.decision-log.md` 和 SP 当前 memory 思路高度一致。PRD 阶段尤其需要记录用户做过的取舍。

推荐：

- 不单独新增复杂全局日志系统。
- feature-local 记录到 `specs/<feature>/memory/open-items.md` 和 `specs/<feature>/memory/index.md`。
- `prd.md` 内保留 `Rejected Ideas` 和 `Decision Notes`。
- 高风险决策最终应通过 `/sp.clarify` 形成固定决策包。

### 8. 研究能力要按需使用

show-me-the-prd 和 BMAD 都使用研究能力，但 SP 不应默认每轮都联网或研究。原因是 token、时间和事实稳定性成本都高。

推荐：

- 用户要求“调研、竞品、最新、技术栈、法规、价格、第三方服务”时必须研究。
- PRD 阶段涉及当前市场、法律、API、平台限制时应研究。
- 普通内部需求梳理不默认联网。
- 研究结果必须标 `[src:doc]` 或外部来源，不可混进用户需求。

## 不建议吸收的内容

### 不建议默认生成大量文档

有些 PRD generator 会一次生成 4 到 11 个文件。对 SP 来说，这会和已有 flow、ui、plan、tasks 重叠，增加维护成本。

更稳做法：`/sp.prd` 只生成 `prd.md` 和必要 memory；其他产物由后续命令生成。

### 不建议让 PRD 直接进入代码

PRP 和部分 PRD generator 会把 PRD 直接做成实现上下文包。SP 不应跳过 specify、flow、ui、plan、tasks、analyze、gate。

更稳做法：PRD 只负责“想全”，spec 负责“说准”，plan/tasks/implement 负责“做对”。

### 不建议把 GitHub Issues 作为默认事实源

CCPM 的 GitHub Issues 路线适合团队协作，但对 SP 当前阶段偏重。

更稳做法：Markdown source docs 是默认事实源；GitHub Issues 可以作为未来可选同步层。

### 不建议默认多 agent 参与 PRD 发散

BMAD party mode、reviewer subagents 和 CCPM parallel agents 都有价值，但 PRD 早期太多 agent 可能带来噪声。

更稳做法：默认单 agent 访谈；高风险或用户要求时，才让多 agent 做 reviewer、风险检查或方案对比。

### 不建议把行业常见功能当成真实需求

很多 PRD generator 容易“补全”行业标配。SP 必须把这类内容标成候选，不允许直接稳定化。

更稳做法：AI 可以提出候选项，但必须说明影响、来源和确认条件。

## 对 `/sp.prd` 的改进建议

### 推荐命令定位

`/sp.prd` 是可选前置命令，只处理从 0 到 1 的需求发散收集。

适合使用：

- 用户只有一句话想法。
- 产品边界、用户、流程、验收还不清楚。
- 大项目需要先做需求探索。
- 用户希望 AI 帮忙把想法生长成可讨论 PRD。

不适合使用：

- 需求已经清楚，可以直接 `/sp.specify`。
- 只是修 bug 或小改动。
- 已经有稳定 spec，只需要 clarify 或 plan。

### 推荐输出路径

```text
specs/<feature>/prd.md
specs/<feature>/memory/open-items.md
specs/<feature>/memory/index.md
```

不建议默认使用全局 `.specify/prd.md`。

### 推荐 PRD 字段

```markdown
# PRD: <feature>

## Meta
- Status: Draft | ReadyForSpecify
- Depth: Light | Standard | HighRisk
- Source Summary:

## Raw User Intent

## Problem And Value

## Users And Scenarios

## Goals

## Scope In

## Scope Out

## Candidate Requirements

## Rejected Ideas

## Rough Flow Seeds

## UI Surface Seeds

## Data Object Seeds

## Constraints

## Acceptance Seeds

## Risks

## Open Questions

## Decision Notes

## Handoff To Specify
```

### 推荐状态

```text
Draft
ReadyForSpecify
NeedsClarification
Blocked
```

不要让 `/sp.prd` 输出 `PASS`。PRD 阶段不是最终门禁，它最多说明是否可以进入 `/sp.specify`。

### 推荐交互策略

```text
1. 先让用户自由说。
2. 模型整理当前理解。
3. 模型指出最关键缺口。
4. 每轮只问 1-3 个问题。
5. 给选项时说明影响。
6. AI 候选必须标记。
7. 用户确认后才稳定化。
8. 超过追问阈值就落盘并路由到 /sp.clarify 或 /sp.specify。
```

### 推荐质量门

```text
ReadyForSpecify 条件：
- 核心问题清楚。
- 目标用户清楚。
- MVP 范围有 in/out。
- 至少有粗流程或关键场景。
- 高影响不确定项已进入 open-items。
- AI 候选和用户确认内容没有混淆。
- 有下一步 /sp.specify 的 handoff 摘要。
```

如果不满足：

- 缺用户决策：输出 `NeedsClarification`，推荐 `/sp.clarify`。
- 只是信息还少但可继续发散：保持 `Draft`。
- 需求互相冲突且不能安全推进：输出 `Blocked`，说明冲突和选项。

## 与 SP 现有机制的衔接

### 和 `/sp.specify`

`/sp.specify` 是稳定规格入口。它可以读取 `prd.md`，但只能吸收：

- `[src:user]`
- `[src:doc]`
- `[src:user-confirmed]`
- 有证据、低争议、可追踪的推导

不能吸收：

- 未确认 `[src:ai-proposed]`
- 被拒绝项
- 未解决 blocker
- 没有来源的行业常见功能

### 和 `/sp.clarify`

`/sp.prd` 负责发现缺口，`/sp.clarify` 负责形成高影响人工决策。

需要人工决策时，输出应说人话：

```text
背景：
影响：
可选方案：
推荐：
下一步命令：
```

### 和 `/sp.flow`

`/sp.flow` 不从 PRD 直接生成正式流程。它可以参考 PRD 中的 Rough Flow Seeds，但必须以 `spec.md` 为事实源。

### 和 `/sp.ui`

`/sp.ui` 可以参考 UI Surface Seeds，但界面元素必须绑定 flow 节点、业务动作、数据对象和状态。

### 和 `/sp.plan`、`/sp.tasks`

PRD 中的数据对象、风险、验收种子可以帮助 plan/tasks 更早发现代码落点和测试要求，但实现任务仍必须来自 plan/tasks 的受控输出。

### 和 memory

PRD 阶段的稳定记忆应进入 feature-local memory，不要靠聊天历史：

```text
memory/open-items.md
memory/index.md
```

记录内容包括：

- 未决问题。
- 用户已经拒绝的方向。
- 高风险假设。
- 需要后续 clarify 的决策。
- 与后续 flow/ui/plan 有关的种子。

## 后续落地建议

建议分三步落地，避免一次性引入过大复杂度。

### 第一步：文档和模板

- 在方法论中明确 `/sp.prd` 的可选定位。
- 增加 `prd.md` 模板。
- 在 `/sp.specify` 中增加读取 `prd.md` 的规则。
- 在 `/sp.clarify` 中增加处理 PRD 决策包的规则。

### 第二步：轻量检查

- 增加 PRD readiness 检查。
- 检查 `[src:ai-proposed]` 是否被误写成稳定需求。
- 检查 open items 是否有 blocker 分类。
- 检查 scope out 是否为空。

### 第三步：复杂项目增强

- 支持 HighRisk PRD 深度。
- 支持 PRD reviewer 检查。
- 支持按项目复杂度建议是否拆分 feature。
- 支持把 PRD seeds 映射到 flow/ui/data/code anchors。

## 最终判断

外部项目证明，AI 参与 PRD 梳理是有价值的，但稳定性来自约束，而不是来自模型“更会写文档”。

SP 应该把 `/sp.prd` 设计成受控需求发散器：

- 它帮助用户把需求想全。
- 它记录来源、候选、假设、拒绝项和缺口。
- 它不直接制造稳定事实。
- 它把可确认内容交给 `/sp.specify`。
- 它把不能自动决定的内容交给 `/sp.clarify`。
- 它把流程、界面、数据、验收和风险作为后续命令的种子。

这样可以最大化利用模型的推理和发散能力，同时避免 PRD 阶段把错误需求、隐藏假设和行业脑补一路传递到代码阶段。
