# SP PRD 命令方法论设计

## 结论

`/sp.prd` 可以作为 SP 的可选前置命令，用来处理从 0 到 1 的需求发散、访谈式收集、候选需求隔离和 PRD 草稿沉淀。

它的定位必须非常清楚：`/sp.prd` 负责“想全”，`/sp.specify` 负责“说准”。更准确地说，`/sp.prd` 的目标是从战略目标、产品定位和能力版图出发，帮助用户把一个模糊产品想法生长成可讨论的 PRD 草稿；`/sp.specify` 的目标是把已确认的产品需求收敛成稳定、可验收、可追踪的 feature spec。

`prd.md` 是上游工作稿，不是稳定事实源；稳定事实源仍然是 `/sp.specify` 生成或更新后的 `spec.md`、稳定 memory、flow、ui、plan、tasks 等受控产物。

如果需求已经清楚，或者只是已有 feature 的小改动，可以跳过 `/sp.prd`，直接使用 `/sp.specify`。`/sp.prd` 不应成为所有任务的必经步骤。

说人话：`/sp.prd` 是“产品想法还没长成规格时的前置整理工具”，不是 SP 的强制入口。清楚的需求直接进 `/sp.specify`，不要为了流程完整而多跑一轮 PRD。

## 适用场景

适合使用 `/sp.prd`：

- 用户只有一句话想法，还没有明确功能边界。
- 项目从 0 开始，需要先梳理目标用户、问题、场景、范围和成功标准。
- 业务流程、界面、数据对象、角色权限或验收边界还不清楚。
- 大项目或高风险项目需要先做需求发现和范围切分。
- 用户明确希望 AI 帮助把想法生长成可讨论的 PRD。

不适合使用 `/sp.prd`：

- 已有明确需求，可以直接进入 `/sp.specify`。
- 只是修 bug、小范围调整或实现阶段问题。
- 已有稳定 `spec.md`，只需要 `/sp.clarify` 做局部决策。
- 用户已经要求进入 plan、tasks 或 implement。

## 核心原则

### 1. 发散和收敛分离

`/sp.prd` 允许发散，允许保留候选、假设、被拒绝项和开放问题。`/sp.specify` 负责收敛，只吸收已经确认、可追踪、适合稳定化的内容。

不要把 `prd.md` 写成最终规格。它应该保留“这是草稿”的属性，让后续命令知道哪些内容还不能当事实用。

### 2. 合理使用模型能力

PRD 阶段应该充分利用模型做“辅助发现”和“结构化整理”，但不能让模型替用户发明正式需求。

模型适合做：

- 把用户的自然语言整理成问题、目标用户、场景、范围、验收种子和风险种子。
- 发现缺口、矛盾、隐藏前提和边界不清的地方。
- 提出候选功能、候选流程、候选非目标和候选验收标准。
- 把候选项按影响、风险、成本、依赖和优先级进行对比。
- 根据用户反馈持续刷新 PRD 草稿和 open items。
- 在信息足够时生成 Handoff To Specify，帮助 `/sp.specify` 接住上下文。

模型不能做：

- 把 `[src:ai-proposed]` 候选项写成已确认需求。
- 为了显得完整而脑补业务规则、权限、合规要求或验收标准。
- 在用户没有确认时替用户接受风险、扩大范围或排除需求。
- 在 PRD 阶段提前设计 API、数据库、代码结构或实现任务。

使用模型能力要按项目复杂度调节：

- 小需求：只做轻量整理和少量高影响问题，不拉长 PRD。
- 普通 feature：整理主流程、边界、验收种子和 open items。
- 从 0 到 1、大项目、高风险项目：允许更深的候选探索、冲突扫描、范围切分和决策包。

### 3. 需求生长必须自上而下

PRD 中由模型辅助生长需求时，主框架必须遵循软件工程的自上而下规则：先确定战略目标、产品定位和业务主干，再展开问题域、能力版图、流程分支，最后才记录局部细节。

推荐顺序是：

```text
战略目标 -> 产品定位 -> 业务目标 -> 目标用户 -> 能力版图 -> 关键问题域 -> 核心场景 -> 主流程 -> 关键分支 -> 验收种子 -> 风险和未决项 -> 局部细节
```

模型可以在过程中提出细节候选，但细节不能脱离上级主干。任何局部细节都必须能回答三个问题：

- 它属于哪个目标、场景、流程、界面或验收边界。
- 它来自用户、已有文档、低争议推导，还是 AI 候选。
- 它是否已经确认，还是只能作为候选或 open item。

如果用户一开始就给了具体细节，例如某个按钮、字段、提醒文案、排序方式、权限例外或失败提示，PRD 可以保留，但必须挂到对应的上级对象下面。如果暂时找不到上级对象，应放入 `Open Questions`、`Candidate Requirements` 或 `UI Surface Seeds`，不能把孤立细节包装成已确认业务规则。

说人话：AI 可以帮用户把需求“长出来”，但不能从一个按钮直接脑补出一套业务系统。PRD 先问“我们要做成什么产品/系统”，再问“它要解决哪些问题”，最后才问“具体怎么表现”。

## 和 `/sp.constitution` 的目标边界

`/sp.prd` 和 `/sp.constitution` 都可能接触战略、边界和原则，但两者肩负的目标不同。

`/sp.prd` 的目标是：

- 从战略目标、产品愿景和业务目标出发，帮助用户形成某个产品、feature 或能力方向的 PRD 草稿。
- 收集能力版图、关键问题域、用户场景、范围、验收种子、风险和候选需求。
- 保留用户原始表达、AI 候选、被拒绝项和未决项，作为 `/sp.specify` 的上游输入。

`/sp.constitution` 的目标是：

- 建立或刷新项目长期治理规则。
- 明确所有 feature 都必须遵守的工程纪律、阶段边界、上下文管理、验证要求、风险门禁和人工决策规则。
- 维护项目级 memory 路由，让后续命令知道哪些规则是长期稳定约束。

边界规则：

- `/sp.prd` 可以发现长期治理候选，例如资金安全、合规要求、数据保留、人工审批、不可逆操作、上线风险和验证纪律。
- 这类内容不应只留在 `prd.md`。`/sp.prd` 应把它们同步写入 `.specify/memory/constitution.md` 的候选治理区，标记为 `Constitution Candidate`，保留来源、影响范围、确认状态和来源 feature。`prd.md` 只保留来源摘要或 handoff，不作为候选治理内容的主落点。
- `/sp.prd` 对 `.specify/memory/constitution.md` 的写入范围只能是追加或更新 `Constitution Candidates` 区；不能直接修改正式 constitution 正文、正式规则、阶段边界或验证纪律。
- 候选治理内容需要满足强度门槛：跨 feature 可能复用，或涉及安全、合规、不可逆操作、真实资金/数据风险、长期工程纪律、验证门禁、人类决策规则。单 feature 局部风险、局部 TODO 或普通需求取舍应留在 `prd.md`、feature memory 或 `open-items.md`。
- 候选治理内容可以被后续 `/sp.constitution` 保留、合并、改写或提升为正式长期规则；在提升前，它们不能覆盖已有 constitution 正式规则。
- `/sp.constitution` 不能替代 PRD 生成具体产品需求；它只整理长期规则和项目治理，不写具体页面、流程、功能清单或 feature 范围。
- 如果 `prd.md` 和 constitution 正式规则冲突，constitution 优先，并路由到 `/sp.clarify` 让用户做决策。

推荐候选治理区格式：

```text
## Constitution Candidates

| ID | Source Feature | Source Tag | Candidate Rule | Impact | Status | Next Route |
| --- | --- | --- | --- | --- | --- | --- |
| CC-001 | specs/<feature>/prd.md | [src:user] | 涉及真实资金交易的功能必须有人工确认和回滚方案 | safety, release | proposed | /sp.constitution or /sp.clarify |
```

`Status` 只使用固定枚举：`proposed`、`under-review`、`promoted`、`rejected`、`merged`。不要自由发明状态值。

### 4. PRD 细致程度有明确边界

`prd.md` 的细致程度应以“足够交给 `/sp.specify` 提炼稳定规格”为上限，不以“足够直接实现”为目标。

PRD 应该写到：

- 用户为什么需要这个东西。
- 谁使用、在什么场景使用。
- MVP 范围内做什么、不做什么。
- 核心业务能力和主流程雏形。
- 关键分支、失败路径、权限或风险线索。
- 界面、数据、验收和风险的 seeds。
- 已确认需求、候选需求、被拒绝项和 open questions。
- Handoff To Specify，让 `/sp.specify` 能接住上下文。

PRD 不应该默认写到：

- 每个页面的完整布局和全部元素。
- 每个流程节点的完整状态机。
- 每个字段的最终类型、校验规则和数据库结构。
- API 路由、接口协议、代码文件、类名、函数名。
- 完整测试用例、测试命令和实现任务。
- 为了显得完整而生成的大段行业通用功能清单。

例外情况是：用户明确提供了某个细节，或者这个细节直接影响范围、验收、合规、权限、数据风险或成本取舍。此时可以记录，但要标明来源和状态；如果需要变成稳定要求，仍然交给 `/sp.specify` 或 `/sp.clarify`。

细致程度的判断标准：

- 看完 PRD，应该能知道“这个需求是什么、为什么做、为谁做、边界在哪里、有哪些候选和风险”。
- 看完 PRD，不应该让模型以为可以跳过 `/sp.specify`、`/sp.flow`、`/sp.ui`、`/sp.plan` 或 `/sp.tasks` 直接写代码。
- 如果某段内容已经开始像设计文档、界面规格、数据模型或实现任务，应降级为 seed、约束、候选项或 open item，并提示下一步由对应命令展开。

### 5. PRD 不是事实源

`prd.md` 只能作为上游输入和追溯材料。下游命令不能直接把 `prd.md` 当作稳定需求。

稳定化路径必须是：

```text
prd.md -> /sp.specify -> spec.md -> flow/ui/plan/tasks/implement
```

如果下游命令发现只有 `prd.md` 有相关信息，而 `spec.md` 没有，应回到 `/sp.specify` 或 `/sp.clarify`，不能自行吸收。

### 6. 来源和不确定性必须显式化

PRD 中的关键内容必须带来源标签：

```text
[src:user]            用户明确说过
[src:doc]             来自已有文档、调研或外部资料
[src:ai-proposed]     AI 提出的候选项
[src:user-confirmed]  用户已经确认的候选项
```

可以补充轻量不确定性标签：

```text
[uncertain:tbd]       未定
[uncertain:assumed]   暂时假设
[uncertain:proposed]  候选建议
```

规则很简单：

- `[src:ai-proposed]` 不能直接进入稳定 `spec.md`。
- 用户确认后，候选项才能升级为 `[src:user-confirmed]`。
- 不确定项如果影响范围、验收、合规、权限、数据、成本或上线，必须进入 `memory/open-items.md`。
- 被拒绝内容要保留原因，避免后续模型重复提出。

### 7. 模型不能静默替用户决策

模型可以提出候选方案和推荐，但不能替用户做正式决策。

需要人工选择时，`/sp.prd` 应输出可读的决策包，并路由到 `/sp.clarify` 或等待用户确认。决策包必须包含：

- 背景。
- 已确认依据。
- 影响。
- 2-4 个候选方案。
- 每个方案的取舍。
- 推荐方案。
- 下一步 `/sp.*` 路线。

用户选择后，模型才能把结果记录为正式决策。

### 8. PRD 阶段禁止过早技术化

`/sp.prd` 只讨论 WHAT、WHY、WHO、WHEN、BOUNDARY、ACCEPTANCE SEEDS。

默认禁止输出：

- API 路由。
- 数据库表结构。
- 类名、函数名、文件路径。
- 框架选择。
- 部署方案。
- 测试命令。
- 实现任务。

如果用户主动给了技术约束，可以作为 `[src:user]` 的约束记录，但不展开成技术方案。真正的实现准备属于 `/sp.plan` 和 `/sp.tasks`。

### 9. Seeds 是原材料，不是设计结论

`/sp.prd` 可以输出这些 seeds：

- Flow Seeds：可能的主流程、分支、异常。
- UI Surface Seeds：可能涉及的页面、入口、界面区域。
- Data Object Seeds：业务对象、字段线索、关系线索。
- Acceptance Seeds：验收标准雏形。
- Risk Seeds：权限、合规、外部依赖、数据风险。

这些 seeds 只是后续命令的输入材料。`/sp.flow`、`/sp.ui`、`/sp.plan` 必须重新展开和验证，不能把 seeds 直接当设计结论。

### 10. 发散必须限流

PRD 发散不能无限进行。

推荐控制规则：

- 第一轮先让用户自由描述。
- 每轮最多问 1-3 个高影响问题。
- 每轮最多提出 3-5 个候选项。
- 每 3-4 轮刷新一次 `prd.md` checkpoint。
- 超过 5 轮仍未收敛，应建议进入收敛、落盘或 `/sp.clarify`。
- 用户说“先这样”“先出一版”“先按这个”时，应停止发散，输出当前 PRD 草稿和下一步路线。

## 命令阶段

### 阶段 1：触发定位

目标是判断这是不是适合 `/sp.prd` 的场景。

需要做：

- 读取用户原始想法。
- 判断是新 feature、已有 feature 补充，还是可能需要拆分的大项目。
- 复述 Raw User Intent，不擅自改写成稳定需求。
- 询问少量基础问题：解决什么问题、谁使用、现在怎么处理、有什么硬约束。

不应做：

- 不直接生成完整 PRD。
- 不提出大量候选功能。
- 不写技术方案。

### 阶段 2：战略目标与产品定位

目标是先确定产品或系统的上层方向，而不是马上追问局部问题。

需要收集：

- 战略目标：用户想最终做成什么产品、系统或能力体系。
- 产品定位：它服务什么业务、市场、组织或个人目标。
- 业务目标：它希望长期改善什么结果。
- 主要用户或使用主体。
- 初步能力版图：这个系统大概要覆盖哪些能力领域。

例如“量化交易软件”的 PRD 起点不是“存数据问题”，而是：

```text
战略目标：做一套可持续迭代的量化交易软件。
产品定位：覆盖数据采集、策略研究、回测、风控、交易执行和收益复盘。
能力版图：数据管理、策略开发、回测引擎、风控系统、交易执行、收益分析、监控告警。
```

合格标准：

- 能说清“想做一个什么产品/系统”。
- 能说清它服务的长期目标。
- 能初步说清主要使用者。
- 能列出 3-7 个候选能力域。
- 不要求此时已经把每个问题、流程和界面讲清楚。

### 阶段 3：能力版图与问题域拆解

目标是把真实业务主干找出来。

需要收集：

- 每个能力域对应的关键问题。
- 当前替代方案。
- 成功信号。
- 核心场景。
- 必须做和明确不做。

AI 可以提出候选需求，但必须标 `[src:ai-proposed] [uncertain:proposed]`，并说明影响。

### 阶段 4：场景、主流程和边界扫描

目标是防止后续跑偏。

需要扫描：

- Scope In。
- Scope Out。
- 非目标。
- 角色和权限。
- 数据敏感性。
- 合规和外部依赖。
- 失败路径。
- 验收边界。

如果发现需求天然冲突、范围失控、风险接受或高影响取舍，应进入 `/sp.clarify`。

### 阶段 5：结构化落盘

目标是把对话转换成可追踪草稿。

输出或刷新：

```text
specs/<feature>/prd.md
specs/<feature>/memory/open-items.md
specs/<feature>/memory/index.md
```

`prd.md` 应记录：

- Raw User Intent。
- Problem And Value。
- Users And Scenarios。
- Goals。
- Scope In。
- Scope Out。
- Candidate Requirements。
- Confirmed Requirements。
- Rejected Ideas。
- Flow Seeds。
- UI Surface Seeds。
- Data Object Seeds。
- Acceptance Seeds。
- Risks。
- Open Questions。
- Decision Notes。
- Handoff To Specify。
- Constitution Candidates。

### 阶段 6：收敛评估

目标是判断是否可以交给 `/sp.specify`。

输出状态：

```text
Draft
NeedsReview
NeedsClarification
Blocked
ReadyForSpecify
```

状态含义：

- `Draft`：仍处于发散草稿，信息还不完整。
- `NeedsReview`：有较多 `[src:ai-proposed]` 或 `[uncertain:*]`，需要用户审核。
- `NeedsClarification`：存在高影响问题，需要 `/sp.clarify` 形成决策。
- `Blocked`：需求冲突或缺少关键输入，继续推进不安全。
- `ReadyForSpecify`：足以交给 `/sp.specify` 提炼，但不代表需求已经稳定。

不要让 `/sp.prd` 输出 `PASS`。PRD 阶段不是阶段门禁。

## ReadyForSpecify 标准

只有满足以下条件，才能标记为 `ReadyForSpecify`：

- 核心问题清楚。
- 战略目标和产品定位清楚。
- 目标用户清楚。
- 能力版图有初步结构。
- MVP 范围有 Scope In 和 Scope Out。
- Confirmed Requirements 非空。
- 至少有粗流程或关键场景。
- 高影响 open items 已记录并有下一步路线。
- `[src:ai-proposed]` 没有被伪装成确认需求。
- 被拒绝项已记录，避免重复发散。
- 有 Handoff To Specify 摘要。

`ReadyForSpecify` 只表示 PRD 可以进入 `/sp.specify`，不表示可以进入 flow、ui、plan、tasks 或 implement。

## 文件规则

默认使用 feature-local 路径：

```text
specs/<feature>/prd.md
specs/<feature>/memory/open-items.md
specs/<feature>/memory/index.md
```

不建议默认使用全局 `.specify/prd.md`，因为 PRD 通常属于某个 feature。全局 PRD 容易造成多 feature 并行时的事实源混乱。

`memory/open-items.md` 记录：

- 需要用户确认的候选需求。
- 高影响 open questions。
- 需求冲突。
- 被推迟的决策。
- 风险接受问题。
- 可能需要拆分 feature 的信号。

`memory/index.md` 只记录短摘要和路由，不复制整份 PRD。

`prd.md` 必须固定保留在当前 feature 目录下，不能在 `/sp.specify` 后删除。它的作用是保留上游推理、用户原始表达、被拒绝项、候选项和需求形成过程，方便后续复盘和追溯。

`memory/index.md` 应记录 PRD 是否存在、PRD 的短摘要、当前 PRD 状态，以及什么时候需要回看 PRD。推荐记录形式：

```text
PRD: specs/<feature>/prd.md
PRD Status: Draft | NeedsReview | NeedsClarification | Blocked | ReadyForSpecify
Consult PRD When: 需要追溯原始意图、候选项、被拒绝项、open questions 或 Handoff To Specify
Stable Source: spec.md and stable memory, not prd.md
```

后续命令可以在必要时查阅 `prd.md`，但必须遵守两条规则：

- 只能把它作为追溯、解释、候选线索和 seeds 来源。
- 如果要把其中内容变成稳定需求，必须明确提示用户运行 `/sp.specify` 或 `/sp.clarify`，不能直接吸收。

## 和其他命令的边界

### 命令路由提醒规则

项目执行中一旦发现需要回到需求层，模型必须明说，不要继续猜。

固定提示格式：

```text
这里不应该继续实现/规划，需要先执行 `<recommended-command>`。
背景：为什么当前信息不够或出现冲突。
影响：如果不处理，会影响哪些范围、验收、风险或代码落点。
建议命令：`/sp.clarify` 或 `/sp.specify`。
需要用户提供：要确认的问题、候选方案或原始需求补充。
```

选择规则：

- 用户意图不清、范围冲突、风险接受、权限/合规/成功标准需要人工取舍：提示 `/sp.clarify`。
- 新增内容需要成为稳定需求，或者 PRD 内容需要正式进入规格：提示 `/sp.specify`。
- 发现是新 feature，而不是当前 feature 的补充：提示创建新 feature 后运行 `/sp.specify`，必要时先运行 `/sp.prd`。
- 已经进入 plan、tasks、implement，但发现稳定规格缺失：停止当前阶段，明确回到 `/sp.specify` 或 `/sp.clarify`。

### 和 `/sp.specify`

`/sp.specify` 是稳定规格入口。

它可以读取 `prd.md`，但只能吸收：

- `[src:user]`
- `[src:doc]`
- `[src:user-confirmed]`
- 有证据、低争议、可追踪的推导

它不能吸收：

- 未确认 `[src:ai-proposed]`
- 被拒绝项
- 没有来源的行业常见功能
- 未解决 blocker

如果没有 `prd.md`，`/sp.specify` 仍然必须能独立工作。`/sp.prd` 是可选前置，不是强制依赖。

### 和 `/sp.clarify`

`/sp.prd` 负责发现问题，`/sp.clarify` 负责处理高影响人工决策。

如果问题只是普通缺口，`/sp.prd` 可以继续问。只有涉及范围、风险、合规、权限、成功标准、冲突需求、拆分取舍或长期成本时，才进入 `/sp.clarify`。

`/sp.clarify` 不应变成新的需求收集入口。如果澄清时发现新功能，应返回新 feature 或扩展当前 feature 的决策包。

### 和 `/sp.flow`

`/sp.flow` 不直接消费 `prd.md` 作为事实源。

它可以参考 Flow Seeds，但必须以 `spec.md` 和稳定 memory 为准。如果 Flow Seeds 中有未确认候选，必须回到 `/sp.specify` 或 `/sp.clarify`。

### 和 `/sp.ui`

`/sp.ui` 可以参考 UI Surface Seeds，但界面元素必须绑定 flow 节点、业务动作、数据对象、状态和验收证据。

UI chrome、通知、badge、动画、图标、count、默认排序等容易被 AI 脑补的内容，除非用户明确要求，否则只能作为 `[src:ai-proposed] [uncertain:proposed]`。

### 和 `/sp.plan`

`/sp.plan` 负责实现准备和代码落点。

PRD 阶段不写代码路径、架构方案、API、数据库结构或验证命令。`/sp.plan` 可以参考 PRD 中的约束和风险种子，但必须从 `spec.md`、flow、ui 和稳定 memory 推导实现计划。

### 和 `/sp.tasks`

`/sp.tasks` 负责生成可执行任务。

PRD 中的 Acceptance Seeds 和 Risk Seeds 可以帮助后续任务设计，但 tasks 不能直接从 `prd.md` 生成实现任务。实现任务必须来自稳定 plan 和 tasks 模板。

### 和 `/sp.analyze`、`/sp.gate`

`/sp.analyze` 可以检查 PRD 是否误把候选项稳定化、是否存在未记录 open items、是否有 `prd.md` 绕过 `spec.md` 的迹象。

`/sp.gate` 不以 PRD 为准入事实源。阶段准入仍以正式阶段文档、验证证据和 gate 规则为准。

## PRD 质量检查

每次 `/sp.prd` 生成或刷新后，应做轻量检查：

- 是否所有 AI 候选都标了 `[src:ai-proposed]`。
- 是否所有关键需求都有来源。
- 是否存在未标记的不确定项。
- 是否存在 API、数据库、文件路径、类名、框架名等过早技术化内容。
- 是否有 Scope In 和 Scope Out。
- 是否有非目标或明确不做的内容。
- 是否有验收种子。
- 是否有被拒绝项记录。
- 是否高影响 open items 已进入 `memory/open-items.md`。
- 是否输出下一步命令路线。

技术越权检查不应机械禁止用户主动提供的技术约束。用户明确说出的技术约束可以保留，但要作为约束，不展开成实现方案。

## Token 和上下文管理

`/sp.prd` 默认只加载：

- 用户本轮输入。
- 当前 feature 的 `prd.md`。
- 当前 feature 的 `memory/open-items.md`。
- 当前 feature 的 `memory/index.md`。
- 必要的项目级短摘要。

默认不加载：

- 完整 `spec.md` 历史。
- flow/ui 全量文档。
- plan/tasks。
- 代码库。
- 全局 memory 全量内容。

如果用户要求基于已有项目做 PRD，或涉及现有业务约束，可以按需读取相关 source docs，但必须说明读取范围。不要为了“更全面”把整个项目塞进上下文。

## 多 Agent 使用规则

`/sp.prd` 默认由单 coordinator 执行。原因是需求访谈和人工决策需要一个统一口径，多个 agent 同时提问会制造噪声。

可使用 reviewer agent 做只读检查：

- 检查候选需求是否来源清楚。
- 检查是否有隐藏冲突。
- 检查是否过早技术化。
- 检查是否缺少非目标、验收种子或失败路径。

Reviewer 不能直接修改 `prd.md`，只能提出审查意见。最终写入由 coordinator 统一完成。

## 兜底策略

如果 `/sp.prd` 无法继续推进：

- 信息不足但不冲突：保持 `Draft`，写入 open items，给下一轮问题。
- 用户需要选择：输出决策包，进入 `/sp.clarify`。
- 需求互相冲突：标记 `Blocked`，说明冲突链路和候选方案。
- 需求已经足够：标记 `ReadyForSpecify`，推荐 `/sp.specify`。
- 用户提出新 feature：说明这是新目标，建议创建新 feature 或要求用户确认扩展当前范围。

小问题搞不定时，不应在局部继续硬编。应向上回到更大的路线：先明确需求和边界，再继续后续阶段。

## 三方审核共识

Codex、Claude 和 Gemini 对 `/sp.prd` 方法论形成的共同意见是：

- `/sp.prd` 可以增加，但必须是可选前置命令。
- `prd.md` 只能是草稿和上游输入，不能成为稳定事实源。
- `/sp.specify` 仍是稳定规格入口。
- AI 候选必须强制标记，用户确认后才能稳定化。
- 高影响冲突和人工取舍必须通过 `/sp.clarify`。
- PRD 阶段不能写技术方案和代码路径。
- PRD 可以输出 flow/ui/data/acceptance/risk seeds，但 seeds 不是设计结论。
- 发散必须限流，避免无限追问和 token 浪费。
- 默认单 coordinator，reviewer 只读检查。

需要后续落地时同步修订的地方：

- 命令规范、README、模板和测试需要同步增加 `/sp.prd` 的职责边界和回归检查。
- `/sp.specify` 模板需要增加从 `prd.md` 提炼已确认内容的规则，以及没有 `prd.md` 时独立工作的规则。
