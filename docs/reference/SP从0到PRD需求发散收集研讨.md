# SP 从 0 到 PRD 的需求发散收集研讨

## 结论

更新后的结论是：SP 可以考虑新增 `/sp.prd`，但它必须是可选的 0 到 1 需求发散入口，不能替代 `/sp.specify` 的稳定规格职责。

如果项目是从 0 开始、用户只有自然语言想法、业务流程和功能边界尚不清楚，可以先用 `/sp.prd` 帮助用户发散、补充、筛选和确认需求。如果需求已经清楚，或者只是已有项目的小改动，可以直接进入 `/sp.specify`。

`/sp.prd` 的定位是“想全”，输出可以保留候选、拒绝项、来源标记和缺口；`/sp.specify` 的定位是“说准”，负责把已确认内容收敛成稳定 `spec.md`。下游 flow、ui、plan、tasks、implement、analyze、gate 默认只以 `spec.md` 和稳定 memory 为事实源，不能绕过 `/sp.specify` 直接把 `prd.md` 当成稳定需求。

AI 可以帮助用户发现需求，但不能把自己提出的候选项直接写成真实需求。真实需求只能来自用户明确输入、已有文档事实、可追踪的低争议推导，或者经过用户确认后的候选项。来源标记无论是否新增 `/sp.prd` 都应保留，它解决的是可追查和优先级判断问题；新增 `/sp.prd` 解决的是从 0 到 1 的发散收集体验和“脏稿/净稿”结构隔离问题。

## 背景问题

用户从 0 开始描述一个项目时，通常不会一次说清楚所有功能、流程、边界、角色、约束和验收标准。

如果模型只被动记录，PRD 会缺少关键业务信息。如果模型自由脑补，PRD 又会被 AI 候选项污染，后续 flow、ui、plan、tasks 和 implement 都会沿着错误目标继续放大错误。

所以 SP 需要的是一套受控的需求发散机制：先帮助用户把想法说出来，再帮助用户看到遗漏，再把 AI 生成的候选内容隔离出来，最后只把经过确认的内容沉淀为稳定规格。

## Gemini 的意见再评估

Gemini 认为，AI 在 PRD 阶段应该是“提问者与结构化合成器”，不是“发明家”。

它建议 `/sp.specify` 吸收以下机制：

- 先确认反向边界，包括不做什么、硬性约束、资源限制和合规限制。
- 使用 5W1H 或类似结构，把用户的大白话拆成目标、角色、场景、行为、约束和验收。
- 允许 AI 提出候选需求，但候选需求必须单独隔离，不能直接进入稳定 `spec.md`。
- 每轮只追问少量高价值问题，避免把需求收集变成问卷轰炸。
- Superpowers brainstorming 可以借鉴，但要限流，避免无限发散和范围蔓延。

Gemini 倾向把 brainstorming 做成显式触发能力，但不要求一定新增命令。

重新评估后，Gemini 的意见可以支撑两种实现方式：

- 不新增命令时，把这些机制放进 `/sp.specify` 的需求发散子阶段。
- 新增 `/sp.prd` 时，把这些机制前移到 `/sp.prd`，但仍要求 `/sp.specify` 负责稳定规格收敛。

因此，Gemini 的核心价值不是“必须不加 `/sp.prd`”，而是要求 AI 候选内容隔离、限流、反向边界优先、用户确认后才能稳定化。

## Claude 的意见再评估

Claude 最初认为，SP 当前缺的不是新命令，而是 `/sp.specify` 内部缺少一个“发散收集层”。

它建议需求收集分成四层：

- 主干层：目标、角色、成功标准、范围。
- 分支层：粗流程、业务对象、角色能力、已知异常。
- 约束层：合规、权限、非功能要求、外部依赖。
- 反需求层：非目标、拒绝方案、明确未知项。

Claude 建议使用来源标记：

- `[src:user]`：用户明确说过。
- `[src:doc]`：来自已有文档或外部输入。
- `[src:ai-proposed]`：AI 候选项。
- `[src:user-confirmed]`：用户确认后的候选项。

它明确建议：`[src:ai-proposed]` 只能作为候选内容，不能进入成功标准、范围边界或验收条件，除非用户确认。

Claude 也认为 Superpowers brainstorming 的思想值得借鉴，尤其是一问一答、给 2-3 个方案、展示取舍、写成设计文档、自检矛盾和占位内容、实现前需要用户确认。但不建议照搬 Superpowers 的命令形态、目录形态或 skill 工作流。

在二次审核“是否新增 `/sp.prd`”时，Claude 给出一个更精确的判断：来源标记和是否新增 `/sp.prd` 是两个独立问题。来源标记无论如何都应该落地，因为它可以帮助追查事实来源、判断优化优先级，也可以帮助发现用户原始需求里的逻辑问题。

Claude 认为，真正需要决策的是：从 0 发散收集和收敛成稳定规格，是否值得拆成两个工作模式。如果新增 `/sp.prd`，好处是更符合人类从自然语言想法开始的表达习惯，也能把“发散态脏稿”和“收敛态净稿”用文件结构隔离。坏处是多一条命令、多一份上游文档，可能造成双事实源和 token 浪费。

Claude 的推荐是：如果新增 `/sp.prd`，必须把它设计成可选的 0 到 1 发散前门，并用硬边界压住双事实源风险：`prd.md` 是上游工作稿，`spec.md` 是下游唯一稳定事实源，下游命令不直接依赖 `prd.md`。

## Codex 综合判断

我同意 Gemini 和 Claude 的核心判断：SP 应吸收 brainstorming 的控制思想，而不是吸收它的外壳。

更新后的推荐方案是：

- 不新增默认 `/sp.brainstorm`。
- 可以新增可选 `/sp.prd`，专门处理从 0 到 1 的需求发散、来源标记、候选需求、拒绝项、缺口扫描和人工确认。
- `/sp.specify` 仍然是稳定规格入口，负责把 `/sp.prd` 中已确认的内容收敛成 `spec.md`。
- AI 候选项必须与稳定需求隔离。
- `/sp.clarify` 只处理高影响歧义、冲突和人工决策，不承担广义需求入口。
- `/sp.flow` 只能展开已确认需求形成业务流程、节点、分支和状态。
- `/sp.ui` 只能把 flow 中的节点、数据、动作和状态装配成界面，不发明业务规则。

这样做的好处是：大项目和 0 到 1 项目有更自然的需求收集入口，小项目仍然可以跳过 `/sp.prd` 直接 `/sp.specify`，并通过“`prd.md` 脏稿、`spec.md` 净稿”的分工降低 AI 候选需求污染稳定规格的风险。

## 是否新增 `/sp.prd` 的利弊

### 新增 `/sp.prd` 的好处

- 更符合人类表达习惯。用户从 0 开始时，通常说的是想法、痛点、场景和担心，不是严格规格。`/sp.prd` 可以用更自然的方式引导用户说清楚。
- 发散和收敛分离。`/sp.prd` 可以保留候选、草稿、拒绝项和缺口；`/sp.specify` 只负责稳定规格。
- 来源标记更有归宿。`[src:user]`、`[src:doc]`、`[src:ai-proposed]`、`[src:user-confirmed]` 可以先在 `prd.md` 中充分使用，再由 `/sp.specify` 提炼。
- 更适合大项目或多角色、多流程、多界面的项目。早期信息收集越充分，后续 flow、ui、plan、tasks 越不容易跑偏。
- 可以借鉴 Superpowers brainstorming 的一问一答、方案比较、用户确认和自检机制，但不复制它的目录和命令形态。

### 新增 `/sp.prd` 的坏处

- 增加命令数量，用户和模型多一个路由判断。
- 如果边界不清，`prd.md` 和 `spec.md` 会变成双事实源。
- 小项目或明确需求的小改动可能多走一步，增加 token 成本。
- 后续模板和测试需要同步更新，否则容易出现旧口径和新口径并存。

### 不新增 `/sp.prd` 的好处

- 入口最少，路由最稳。
- `/sp.specify` 是唯一需求入口，下游事实源更简单。
- 改动成本小，能快速落地来源标记、候选隔离和缺口扫描。
- 对小项目更轻量。

### 不新增 `/sp.prd` 的坏处

- `/sp.specify` 职责变重，既要发散又要收敛。
- 发散内容和稳定规格靠提示词隔离，结构上没有“脏稿/净稿”的硬边界。
- 对从 0 开始的用户不够直观，用户不一定知道 `/sp.specify` 可以陪他完成 PRD 级需求收集。

## `/sp.prd` 的推荐设计

`/sp.prd` 应该是可选命令，只在需求不清、项目从 0 开始、业务复杂或用户明确希望先做 PRD 需求整理时使用。

它的职责是：

- 用人类自然语言方式收集目标、痛点、用户、场景和约束。
- 引导用户设计功能、流程、边界、非目标和验收标准雏形。
- 通过少量高价值问题补齐关键缺口，不做长问卷。
- 允许 AI 提出候选需求、候选流程和候选功能，但必须标记来源和状态。
- 记录被拒绝的想法及原因，避免后续模型重复提出。
- 把需要人工决策的高影响问题写入 `memory/open-items.md`，必要时路由到 `/sp.clarify`。

它不负责：

- 生成稳定 `spec.md`。
- 写技术方案、API、数据库、代码落点或测试任务。
- 替用户接受风险、决定范围、确认候选需求。
- 让下游命令直接依赖 `prd.md` 作为事实源。

推荐输出：

```text
specs/<feature>/prd.md
specs/<feature>/memory/open-items.md
specs/<feature>/memory/index.md
```

`prd.md` 可以包含：

- 原始用户描述。
- 目标和问题。
- 角色和场景。
- 功能候选。
- 粗流程候选。
- 约束和非目标。
- 验收雏形。
- 来源标记。
- 被拒绝想法。
- 缺口扫描。
- 下一步建议。

`/sp.specify` 读取 `prd.md` 时，只能提炼 `[src:user]`、`[src:doc]`、`[src:user-confirmed]` 和低争议可追踪推导。`[src:ai-proposed]` 不能进入稳定 `spec.md`，除非用户确认。被拒绝内容不能重新包装成候选需求。

`/sp.clarify` 的边界不变：它只处理高影响人工决策。`/sp.prd` 发现的冲突、范围取舍、候选需求接受、风险接受，可以路由到 `/sp.clarify` 形成决策包；但 `/sp.clarify` 不应变成新的需求收集入口。

## `/sp.prd` 的功能设计方案

本节是对 Gemini、Claude 和 Codex 三方意见的综合。共同方向是：`/sp.prd` 要像产品经理和需求工程师一样工作，用自然语言引导用户说清楚真实需求；但它不能像自由脑暴一样无限扩散，也不能把 AI 猜测写成稳定事实。

### 阶段流程

`/sp.prd` 建议采用四段式流程：

1. 触发定向：读取用户一句话想法、已有项目上下文和当前 feature 路由，判断这是新 feature、现有 feature 补充，还是需要拆分的复杂项目。
2. 核心收集：收集问题、目标用户、当前做法、核心价值和必须上线的能力。
3. 边界扫描：收集非目标、约束、风险、合规、外部依赖、资源和时间限制。
4. 结构化落盘：生成或刷新 `specs/<feature>/prd.md`，并把高影响未决项写入 `memory/open-items.md`。

阶段推进不要求用户说“下一步”。当某一阶段已经足够清楚时，模型应主动进入下一阶段；当信息不够时，只问当前最影响后续工作的少量问题。

### 提问和引导方式

`/sp.prd` 应符合人的表达习惯：先让用户自由说，再由模型整理和补洞，而不是一开始丢一份长问卷。

推荐提问方式：

- 第一轮先问三个基础问题：想解决什么问题、谁在用、现在他们怎么处理。
- 每轮最多聚焦 1-3 个问题，优先问会影响范围、流程、验收或风险的问题。
- 多用选择题和对比题，减少用户从空白开始写的负担。
- 对反向边界要主动确认，例如“本期是否明确不做社交、支付、通知、导出”。
- 对候选功能要给出影响，不只给列表。例如说明它会影响流程、权限、数据、UI、测试或上线范围。
- 如果用户说法模糊，最多追问一次；仍不清楚时写入 open item，而不是继续消耗 token。

禁止行为：

- 不一次性抛出大量问题。
- 不重复追问用户已经回答过的维度。
- 不主动扩展用户没有迹象需要的领域。
- 不把“行业常见功能”当成用户真实需求。
- 不在 PRD 阶段写 API、数据库、技术栈、代码落点或实现任务。

### 输出文件和字段

推荐路径是 feature-local：

```text
specs/<feature>/prd.md
specs/<feature>/memory/open-items.md
specs/<feature>/memory/index.md
```

不建议使用全局 `.specify/prd.md` 作为默认路径。PRD 内容通常属于某个 feature，全局 PRD 容易和多 feature 并行、active-context、feature-map 发生混淆。

`prd.md` 建议包含这些字段：

```markdown
# PRD: <feature>

## Meta
- Status: Draft | ReadyForSpecify
- Confidence: Low | Medium | High
- Source Summary: user/doc/ai-proposed/user-confirmed counts

## Raw User Intent
- <保留关键用户原话或摘要，带来源>

## Problem And Value
- Problem:
- Current Workaround:
- Target Outcome:
- Success Signal:

## Users And Scenarios
- Primary User:
- Secondary Users:
- Key Scenarios:

## Goals
- Must:
- Nice To Have:

## Scope
### In
- <需求项> [src:*] [conf:*]

### Out
- <明确不做项> [src:*]

## Candidate Requirements
- <AI 或用户提出但未确认的候选项> [src:ai-proposed] [conf:L/M]

## Rejected Ideas
- <已拒绝项> — reason: <原因>

## Rough Flow Seeds
- <主流程雏形、分支雏形、异常雏形>

## Constraints
- Product:
- Compliance:
- Security:
- Data:
- External Dependencies:
- Time/Resource:

## Acceptance Seeds
- <可观察验收结果雏形>

## Open Questions
- <需要 /sp.clarify 或后续确认的问题>

## Handoff To Specify
- Confirmed Items:
- Candidate Items Not Ready:
- Recommended Next Command:
```

### 来源标记和候选规则

统一采用前文已确认的来源标记：

```text
[src:user]            用户明确说过
[src:doc]             来自已有文档或外部输入
[src:ai-proposed]     AI 提出的候选项
[src:user-confirmed]  用户确认后的候选项
```

可选增加置信度标记，但不要替代来源标记：

```text
[conf:H] 用户明确确认且无冲突
[conf:M] 合理推导但仍需在 specify 中检查
[conf:L] 假设、候选或冲突项
```

候选需求规则：

- `[src:ai-proposed]` 默认只能进入 `Candidate Requirements`。
- 用户明确接受后，才可改为 `[src:user-confirmed]`。
- `[conf:L]` 不能进入 `Scope/In`，应进入 `Open Questions` 或候选区。
- 用户拒绝的内容进入 `Rejected Ideas`，避免后续模型重复提出。
- 冲突项必须同时保留冲突双方来源，并写入 `Open Questions` 或 `memory/open-items.md`。

### 与现有命令衔接

`/sp.prd` 到 `/sp.specify`：

- `/sp.prd` 只产出上游工作稿。
- `/sp.specify` 检测到 `specs/<feature>/prd.md` 时，可以读取它作为输入。
- `/sp.specify` 只能把已确认内容、文档事实和低争议可追踪推导写入 `spec.md`。
- `/sp.specify` 不得把 `[src:ai-proposed]` 直接写成验收、范围或成功标准。

`/sp.prd` 到 `/sp.clarify`：

- 高影响 open question、候选需求取舍、范围冲突、风险接受，进入 `/sp.clarify`。
- `/sp.clarify` 输出决策包，用户选择后回写为 `[src:user-confirmed]` 或 rejected。

`/sp.prd` 到 `/sp.flow` 和 `/sp.ui`：

- `/sp.flow` 和 `/sp.ui` 默认不直接消费 `prd.md`。
- 它们应基于 `/sp.specify` 生成的稳定 `spec.md` 和 stable memory 工作。
- 如果 flow/ui 发现 PRD 候选项仍未确认，应路由回 `/sp.specify` 或 `/sp.clarify`，不能自行吸收。

`/sp.prd` 到 `/sp.plan`、`/sp.tasks`、`/sp.implement`：

- 后续实现链路不直接读取 `prd.md` 作为事实源。
- `prd.md` 只可作为追溯来源或 explainability 材料，不可替代 `spec.md`、flow、ui、plan 和 tasks。

### Token 和稳定性控制

`/sp.prd` 的发散必须限流。

默认控制规则：

- 每轮最多 1-3 个问题。
- 候选功能一次最多 3-5 个。
- 核心用户最多先收集 3 类。
- open questions 默认不超过 5 个高影响项。
- 超过 5 轮仍未收敛时，生成当前 draft，并建议下一步 `/sp.clarify` 或 `/sp.specify`。
- 每 3-4 轮对话刷新一次 `prd.md` checkpoint，后续对话优先读取 `prd.md`，不依赖冗长聊天历史。
- 用户说“先这样”“先按这个”“先出一版”时，应输出当前 `prd.md`，不要继续发散。

稳定性控制规则：

- 用户修改早期核心答案时，只更新受影响字段，不重跑全流程。
- 需求冲突不靠模型猜测解决，进入 open item 或 `/sp.clarify`。
- 候选需求不能证明自己合理，必须有用户确认或文档来源。
- `Status: ReadyForSpecify` 只表示 PRD 足以交给 `/sp.specify` 提炼，不表示需求已稳定。

## Superpowers Brainstorming 可借鉴点

Superpowers 的 `brainstorming` skill 主要解决的是“在实现前把想法变成设计”的问题。它要求先理解上下文，再逐步提问，再提出 2-3 个方案，再写设计文档和自检，最后经过用户确认才进入实现。

SP 可以借鉴这些部分：

- 实现前必须先完成需求和设计确认。
- 问题要少而关键，优先一问一答。
- 给用户 2-4 个可选方案，并说明影响和推荐。
- 大范围项目先拆分，再深入第一个子项目。
- 候选方案要有取舍，不只给单一路线。
- 写入文档后要自检占位、矛盾、歧义和范围漂移。
- 用户确认是决策来源，模型推荐不是正式决策。

SP 不应照搬这些部分：

- 不复制 Superpowers 的 `docs/superpowers/specs/...` 路径。
- 不新增独立 brainstorming 命令作为默认入口。
- 不把脑暴内容直接写入稳定需求。
- 不把所有小项目都强制走长篇设计流程。
- 不让发散阶段无限追问或无限扩写。

## 推荐机制

如果暂时不新增 `/sp.prd`，`/sp.specify` 应包含一个轻量的需求发散收集子阶段：

1. 收集用户原始描述。
2. 读取最小必要项目上下文。
3. 把输入整理成目标、角色、范围、非目标、流程雏形、约束和验收雏形。
4. 做缺口扫描，找出最影响后续设计的空白。
5. 每轮只提出少量高价值问题。
6. AI 可以提出候选需求，但必须标为候选。
7. 用户确认后，候选项才能进入稳定 `spec.md`。
8. 未确认内容进入 `memory/open-items.md`，并带上影响、选项、推荐和下一步命令。
9. 当需求足够支撑 flow/ui/plan 时收敛，不追求一次性完美 PRD。

## 命令分工

`/sp.prd` 可选负责 0 到 1 的 PRD-like 需求发散：

- 从自然语言想法中收集目标、角色、场景、功能、粗流程、边界和约束。
- 做缺口扫描和候选需求生长。
- 使用来源标记区分用户事实、文档事实、AI 候选和用户确认。
- 保存 `prd.md` 作为上游工作稿。
- 发现高影响冲突时路由到 `/sp.clarify`。
- 不生成稳定 `spec.md`，不作为下游事实源。

`/sp.specify` 负责需求入口和 PRD-like 基线：

- 新 feature intake。
- 真实需求收集。
- 目标、角色、范围、非目标、成功标准。
- 候选需求隔离。
- 冲突初检。
- `spec.md` 和需求级 memory 写入。
- 如果存在 `prd.md`，只提炼已确认内容进入 `spec.md`。

`/sp.clarify` 负责高影响人工决策：

- 需求冲突。
- 范围取舍。
- 风险接受。
- 是否拆分 feature。
- 是否接受关键候选需求。
- 决策包和决策记录。

`/sp.flow` 负责业务流程：

- 主流程、分支流程、异常流程。
- 业务节点、状态变化、输入输出。
- 节点与验收、数据、权限、外部系统的关系。
- 发现新业务规则时回到 `/sp.specify` 或 `/sp.clarify`。

`/sp.ui` 负责界面装配：

- 屏幕结构。
- 字段、动作、状态、错误提示。
- 页面与 flow 节点绑定。
- UI 如何承载数据、事件和业务动作。
- 不发明新的业务流程或权限规则。

## 来源标记与候选需求规则

建议使用四类来源或状态：

| 标记 | 含义 | 是否可进入稳定需求 |
| --- | --- | --- |
| `[src:user]` | 用户明确说过 | 可以 |
| `[src:doc]` | 来自已有文档或外部输入 | 可以 |
| `[src:ai-proposed]` | AI 提出的候选项 | 不可以 |
| `[src:user-confirmed]` | 用户确认后的候选项 | 可以 |

AI 生成的候选需求必须以候选区、待确认区或 open item 形式存在，不能直接写进成功标准、范围边界、验收条件、权限规则或核心业务流程。

被拒绝的候选项不应直接删除，应记录到轻量的 rejected note 或 open item 历史中，说明拒绝原因，避免模型后续重复提出。

## 风险与边界

主要风险是 AI 把合理但未经确认的内容当成真实需求。解决办法是来源标记和候选隔离。

第二个风险是需求收集变成无限脑暴。解决办法是每轮只问高影响问题，并把低影响缺口放入 open items 或后续 flow/ui 阶段。

第三个风险是 `/sp.clarify` 被重新变成需求入口。解决办法是：发现新目标、新角色、新流程、新验收边界时，回到 `/sp.specify`，而不是在 clarify 中静默吸收。

第四个风险是 flow/ui 倒灌需求。解决办法是：flow/ui 只能展开已确认需求；如果发现新业务规则，必须回到 specify 或 clarify。

第五个风险是过早写技术方案。解决办法是：`/sp.specify` 只写 what、why、boundary、acceptance；API、数据库、框架、部署和代码落点留给 plan/tasks/implement。

## 后续落地建议

建议下一步把本研讨压缩成正式方法论和命令模板规则：

- 在方法论文档中加入“可选 `/sp.prd` 前置发散阶段”和“`spec.md` 唯一稳定事实源”。
- 新增 `/sp.prd` 模板时，明确它只产出上游工作稿和 open items，不产出稳定 `spec.md`。
- 在 `/sp.specify` 模板中加入从 `prd.md` 提炼已确认内容的规则，以及没有 `prd.md` 时继续独立工作的规则。
- 在 `/sp.specify` 或 `/sp.prd` 模板中加入缺口扫描、候选隔离、来源标记和确认规则。
- 在 `/sp.clarify` 模板中强调它只处理高影响决策，不做新需求入口。
- 在 `/sp.flow` 和 `/sp.ui` 模板中加入“不得倒灌新业务规则”的检查。
- 在测试中增加回归检查，确保 `prd.md` 不是下游事实源，并确保 AI 候选项不得直接进入稳定需求。
