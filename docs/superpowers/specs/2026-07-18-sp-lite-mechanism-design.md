# SP Lite 多轮验证机制设计

## 目标

SP Lite 保留完整的 `sp.prd`、Outline Discovery、来源追踪和人工确认，但不要求一次展开整个项目的 Flow 和 UI。它把已确认 Outline 拆成若干可运行、可验证的 Lite 轮次。每轮先给出 2–3 个方向，由人选择后再生成当前范围所需的 Flow、UI、Plan、Tasks 和代码。

Lite 可以连续扩展上轮原型，也可以跳到与上轮无关的 Outline 分支。多轮之后，只要当前确认版 Outline 的全部必需范围都已实现并验证，项目可以直接完成，不必重新走一遍完整 SP。Lite 也可以在任意轮次提前转入完整 SP。

Lite 只缩小每轮范围，不降低当前范围的正确性、安全性、确认要求和测试要求。任何 Lite 状态都不能自动表示 `READY_FOR_PRODUCTION`。

## 方案选择

### 方案 A：线性累加

每轮只能接着上一轮增加功能。实现最简单，但无法自然处理相互独立的 Outline 分支，也会把无关功能伪造成父子关系。

### 方案 B：允许多个活动分支

多个 Lite 轮次可同时开发。速度可能更快，但 `plan.md`、`tasks.md`、共享代码和状态文件容易冲突，验证结果也难以归并。

### 方案 C：单活动轮次，历史形成依赖图

每个 feature 同时只允许一个活动轮次。历史轮次可以是扩展、独立、修正或补缺关系，并通过依赖引用形成有向无环图。代码按当前集成基线继续演进，无关业务分支不必伪装成线性继承。

采用方案 C。它支持用户要求的多轮累积和分支，同时与仓库当前单 feature、单 workset 路由和共享文档模型更一致。

## 核心产物

新增一个权威文件：

```text
specs/<feature>/lite.md
```

它只记录 Lite 的范围、轮次、决策和覆盖状态，不复制其他文档内容。现有文件继续负责各自领域：

```text
specs/<feature>/
├── prd.md
├── spec-outline.md
├── spec.md
├── lite.md                 # Lite 唯一状态合同
├── flows/                  # 现有 Flow 事实与确认记录
├── ui/                     # 现有 UI 事实与确认记录
├── plan.md                 # 累积计划和 Implementation Readiness
└── tasks.md                # 累积任务及执行历史
```

不新增 `lite-plan.md`、`lite-tasks.md` 或另一套权威 Flow/UI。现有 review batch 文件可以按轮次生成，但它们只是审核材料，稳定事实仍写回现有 Flow/UI 文档。

## Lite 轮次

每轮使用单调递增的稳定 ID，例如 `LITE-R001`。轮次表示一次有明确假设、范围和证据要求的验证工作，不等同于 Git 分支。

轮次在人工选定方向后冻结以下内容：

- `round_id`、创建时间和依据的 Outline 证据签名。
- 验证假设、成功信号、失败信号和停止条件。
- included、deferred anchors 的快照。
- 轮次关系、依赖轮次和选择理由。
- 人工选定的候选及候选版本。

执行进度、验证证据和结果可以追加更新。已经关闭的轮次不能原地改写；发现错误或范围变化时，新建修正轮次，并用 `supersedes` 指向旧轮次。

一个轮次只有一个当前状态：

```text
CANDIDATES_READY
  -> AWAITING_DIRECTION_SELECTION
  -> READY_FOR_LITE_FLOW_UI
  -> READY_FOR_LITE_PLAN
  -> READY_FOR_LITE_IMPLEMENTATION
  -> READY_FOR_BUSINESS_VALIDATION
  -> EVALUATED
  -> CLOSED
```

任何阶段都可以进入 `NEEDS_DECISION`、`STALE` 或 `STOPPED`。`CLOSED` 只表示本轮已经形成结论，结果另记为 `SUPPORTED`、`DISPROVED`、`INCONCLUSIVE` 或 `ABANDONED`。验证失败的轮次也可以正常关闭，但不能贡献“已验证”覆盖。

## 人工选择验证方向

### 候选生成

`/sp.lite <feature> next` 读取当前 PRD、确认版 Outline、Spec、历史轮次和覆盖账本，生成 2–3 个有实质区别的方向。每个候选必须包含：

- 业务假设和对应的 PRD/Outline/Spec anchors。
- 端到端路径：触发、输入、核心动作和可观察结果。
- included 与 deferred 范围。
- 预期证据、成功条件、失败条件和停止条件。
- 对已有轮次、接口、数据和代码的依赖。
- 实现成本、首个反馈时间、可逆性和主要风险。
- 需要 mock、sandbox、feature flag 或真实环境的说明。

第一轮优先提供以下不同取向：尽快跑通业务主路径、优先验证最大业务不确定性、优先验证高代价技术或合规假设。后续轮次根据现状提供：扩展已有原型、处理独立 Outline 分支、修正被证伪方向、补齐剩余覆盖。不是每次都机械凑齐四类，只保留当前有意义的 2–3 个。

候选按业务决策价值、证据强度、错误方向成本、实现成本、可逆性和反馈时间排序。系统可以推荐，但不能自动选择。

### 人工选择门

用户可以选择候选、修改候选范围，或输入自定义方向。确认时必须记录：

- 被选候选及人工修改。
- 选择理由和决策人；决策人无法识别时记录为显式人工确认。
- included/deferred anchors。
- 验证信号、轮次关系和依赖。
- 风险处理方式及允许的实现边界。

未选候选只进入本轮决策历史，不能自动把其中的 anchors 改成 `deferred`。只有用户明确延期某个 Outline 范围时，覆盖账本才记录延期。

## 多轮关系与分支

新轮次使用以下关系之一：

| 关系 | 含义 |
|---|---|
| `extend` | 在一个或多个已有轮次的有效实现上增加能力 |
| `independent` | 处理另一条 Outline 分支，业务上不依赖最近轮次 |
| `revise` | 修正被证伪、失效或方向错误的轮次 |
| `coverage` | 核心假设已稳定，专门补齐未完成的 Outline 范围 |

`relation` 说明为什么开启本轮，`depends_on` 单独记录真正的基础设施、接口或证据依赖。`independent` 轮次可以没有业务父轮次，但仍基于当前代码集成基线，并必须运行历史轮次的回归检查。

同一 feature 同时只能有一个活动轮次。需要尝试互斥方案时，使用 sandbox、feature flag 或独立 Git 分支隔离，但这属于风险处理手段，不是 Lite 的默认事实模型。

## 覆盖账本

覆盖账本以当前确认版 Outline 的稳定 anchors 为范围全集。PRD、Spec anchors 用于追踪来源和验收，不得绕过 Outline 自行扩大“项目完成”的范围。

不能用一个状态同时表示“选过、写完、验证过”。每个 anchor 分别记录三个维度：

| 维度 | 状态 |
|---|---|
| 范围状态 | `unplanned`、`proposed`、`selected`、`deferred`、`changed`、`superseded`、`removed` |
| 交付状态 | `not_started`、`planned`、`implemented`、`verified`、`invalidated` |
| 证据状态 | `none`、`collecting`、`supported`、`disproved`、`inconclusive`、`not_required`、`stale` |

每项还要记录当前 anchor revision、覆盖轮次、替代关系、Flow/UI/Plan/Task/Code/Test 引用和状态变更历史。

规则如下：

- `implemented` 只说明代码存在，不能算作 `verified` 或 `supported`。
- `deferred` 不计入完成；它必须在后续轮次被选择，或由人工修改确认版 Outline 后移出范围。
- `superseded` 必须绑定 `replacement_anchor_id`。旧 anchor 不计入当前完成率，替代 anchor 完成前不能通过完成门。
- `not_required` 只适用于确实不需要业务实验的范围，必须由人工给出理由；它仍需要实现验收和技术验证。
- 百分比仅用于展示进度，门禁按逐项状态判断，避免用 95% 等阈值掩盖遗漏。

## 全局路线管控

Lite 的“最小”只描述当前轮次的交付范围，不表示可以局部决策。候选生成、方向冻结、每个 owner command 调度前、实现前和业务验证前，都必须从当前确认版 Outline 出发，联合读取历史 Lite 轮次、覆盖账本、共享接口与数据模型、权限边界、当前代码基线、开放决定和历史回归证据。

全局检查至少覆盖：

- 当前 included anchors 是否已被历史轮次实现或验证，是否存在可以直接复用的 Flow、UI、接口、组件、代码或测试。
- 新需求、决策、接口、数据模型、权限和验收语义是否与当前 Outline 或历史有效决定矛盾。
- 当前轮次的依赖、Allowed Write Set 和共享事实源是否与已有 workset 或未关闭工作重叠。
- PRD、Outline、Spec、历史确认或依赖轮次的 Evidence Signature 是否已经失效。
- 当前实现是否破坏仍有效历史轮次的最小回归集合，或让已验证 anchor 重新变成无效状态。

确定性状态检查器必须返回下列一种治理结果，并把证据引用和唯一 owner route 写入 route payload：

| 治理结果 | 含义 | 处理方式 |
|---|---|---|
| `CLEAR` | 未发现阻止当前阶段的问题 | 允许调度唯一下一 owner command |
| `REUSE_REQUIRED` | anchor 或实现已经存在且可复用 | 合并当前范围并引用既有证据，禁止生成平行实现 |
| `RECONCILE_REQUIRED` | 需求、决定、接口、数据、权限或写集合冲突 | 暂停并返回 `/sp.clarify`、`/sp.specify`、`/sp.plan` 或其他明确 owner |
| `STALE_EVIDENCE` | 上游或依赖签名变化 | 返回 `/sp.lite sync`，影响处理完之前禁止下游推进 |
| `REGRESSION_BLOCKED` | 历史有效轮次的回归检查失败 | 返回 `/sp.tasks`、`/sp.plan` 或 `/sp.implement` 修复，不得进入业务验证 |

所有非 `CLEAR` 结果都禁止自动调度。若结果点名 blocker owner，必须由人工确认
进入“受限修复模式”：只处理 payload 中的冲突、失效或回归引用，并严格遵守
Allowed Write Set；不得顺便执行该 owner 的正常阶段工作，也不得自行清空
`lite.md` 的协调器状态。修复完成后统一返回 `/sp.lite sync`，由控制器重读证据、
重算签名并决定是否解除阻塞。普通 owner 只有在 fresh route 同时满足
`CLEAR`、`continueAllowed=true` 和 `next` 等于自身时才能推进，这避免直接调用
owner 绕过全局路线或越序执行。

候选生成也受此门约束：已经完整覆盖的 anchor 不能包装成“新方向”；部分重复的候选必须说明复用部分和真实新增 delta；互斥方向必须采用 revise、sandbox 或 feature flag，并明确替代关系。独立轮次可以与最近一轮业务无关，但仍必须服从当前 Outline、代码基线、共享合同和历史回归要求。

`lite.md` 保存最近一次全局检查的输入签名、结果、证据引用、冲突集合、复用集合、历史回归集合和检查时间，并在 `Stage Source Signatures` 中为每个已完成阶段记录调度前的 64 位签名。任何影响这些输入的 owner artifact 变化都会使检查结果失效；协调器不得沿用内存中的旧结论。

Flow、UI、Bundle、Plan 和 Tasks 的阶段产物必须写明当前 `Lite Round`、`Lite Stage`、`Included Outline Anchors` 和与账本一致的 `Source Signature`。Flow/UI 还要记录当前轮人工确认，Plan 记录当前轮人工批准。Gate/Analyze 的 PASS 不能引用持续变化的 `gate.md` 或 `analysis.md`，而要保存为 `lite-evidence/<LITE-RNNN>/` 下每阶段、每轮唯一的不可变快照；Implement 则必须提供非空完成证据。这样复用的是已有设计或实现内容，不是把别轮证据冒充成本轮授权。

## 每轮 Flow 和 UI

每轮只处理 included anchors 以及使它们可运行所必需的依赖。

Flow 至少包含验证主路径、影响验证结论的关键决策、最小失败反馈、外部依赖边界和 included/deferred anchors。UI 至少包含必要页面或交互面、输入、动作、数据绑定，以及影响业务验证的 loading、empty、error、success 状态。

复用现有 batch confirmation：

- 每轮生成带 `LITE-Rxxx` 和 anchor scope 的 Flow/UI review batch。
- 人工确认结果继续使用 `SCOPED_CONFIRMATION` 和 `authorization_scope`。
- 只授权当前轮次明确确认的范围，不解锁整个 Flow/UI batch。
- 以前轮次的内容和结论在来源签名未变化时可以复用，修正轮次只重做受影响部分；但当前轮仍必须生成绑定当前 round、stage、anchors 和签名的证据，并取得当前轮 scoped confirmation，不能直接把旧轮 artifact 当作当前轮已完成。

Flow 或 UI 确实不适用时，必须由人确认，并在 `Stage Skip Reasons` 写具体理由、在 `Stage Skip Confirmations` 写 `STAGE=NOT_REQUIRED_CONFIRMED`。缺少任一项都不能进入后续 gate。

`sp.tasks` 需要允许消费与当前 Lite 轮次完全一致的 scoped confirmation，而不是要求整个 feature 的 Flow/UI 全部确认。任何超出授权范围的 task 都必须停止并返回 Flow、UI 或 Plan owner。

## Plan、Tasks 和 Implement

仍使用现有 `plan.md` 和 `tasks.md`：

- 每个 workset 和 task 标记 `Lite Round: LITE-Rxxx` 与 trace anchors。
- `plan.md` 的 `Implementation Readiness` 只授权当前轮次。
- `Allowed Write Set` 只覆盖本轮代码、测试、配置和必要文档。
- 新轮次可以追加、修正或关闭原有 workset，但不能删除已完成历史。
- `tasks.md` 不为 deferred anchors 生成占位任务。
- 实现前检查本轮依赖和冲突；实现后更新代码、测试、trace 和覆盖账本。
- 每轮必须运行本轮检查及所有仍有效历史轮次的最小回归集合。
- 实现前的全局路线管控必须为 `CLEAR`；`REUSE_REQUIRED` 先收缩任务到真实 delta，其他治理结果一律阻止实现。

Lite 不允许以“原型”为由跳过会改变验证真实性的权限、数据、错误处理或安全约束。外部服务、真钱、敏感数据或不可逆操作应使用 mock、sandbox 或明确阻塞。

## 轮次评估与下一步

实现完成后，`/sp.lite <feature> evaluate` 汇总测试、演示、用户反馈、指标或人工观察。系统只能整理证据和给出建议，以下决定由人完成：

- `continue`：支持当前假设，进入下一轮候选选择。
- `revise`：假设被证伪，创建修正轮次。
- `independent`：保留当前结果，转向另一 Outline 分支。
- `stop`：停止当前项目或 feature。
- `promote`：带着剩余范围进入完整 SP。
- `complete`：当前确认版 Outline 已全部完成，进入累计完成门。

轮次关闭要求 included anchors 的实现结果和必要检查已有记录，验证证据得到 `SUPPORTED`、`DISPROVED`、`INCONCLUSIVE` 或 `ABANDONED` 结论，并由人确认下一步。它不要求每轮都成功。

## Outline 累计完成门

多轮 Lite 可以直接完成整个项目，但必须同时满足：

1. 当前 PRD 和 Outline 已确认，`lite.md` 的证据签名与其一致。
2. 当前 Outline 的每个必需 anchor 都达到 `delivery_status: verified`。
3. 每个用于业务判断的验证假设都有 `supported` 证据；`not_required` 项有人工理由。
4. 所有适用 anchor 都能追踪到已确认的 Flow/UI 范围；不需要 Flow 或 UI 的项有明确说明。
5. `plan.md`、`tasks.md` 没有剩余必需任务、未接受 blocker 或越界写入。
6. 各轮依赖已集成，累计回归检查和 Outline acceptance checks 通过。
7. 没有 `deferred`、`changed`、`invalidated` 或 `stale` 的当前必需 anchor。
8. 人工确认 `OUTLINE_COMPLETE_VIA_LITE`。

确认版 Outline 是完成范围的唯一基准。历史候选、单轮成功率或代码文件数量都不能替代它。`OUTLINE_COMPLETE_VIA_LITE` 表示已完成当前 Outline，不表示部署、运维、容量、合规审批等生产门禁已经通过；生产发布仍走对应 gate。

## PRD 和 Outline 变化

`/sp.lite <feature> sync` 对比现有 `Source Snapshot` 或 `Evidence Signature`：

- 新 anchor 加入账本，初始为 `unplanned/not_started/none`。
- 语义变化的 anchor 标为 `changed`，相关交付和证据标为 `invalidated` 或 `stale`。
- 被删除的 anchor 保留在历史中并标为 `removed`，不再属于当前完成范围。
- 受影响的活动轮次进入 `STALE`，停止 Plan、Tasks 和 Implement。

系统生成影响报告，由人决定是仅刷新引用、重新验证、创建 `revise` 轮次、保留或删除已有代码。纯标题或排版变化可以由人确认不影响原证据；模型不得自行把语义变化判成无影响。

## 命令与工作流

新增 `/sp.lite`，作为 Lite 生命周期的唯一 owner：

```text
/sp.lite <feature> init
/sp.lite <feature> next
/sp.lite <feature> select <candidate-or-custom>
/sp.lite <feature> evaluate
/sp.lite <feature> sync
/sp.lite <feature> stop
/sp.lite <feature> promote
/sp.lite <feature> complete
```

现有 `/sp.flow`、`/sp.ui`、`/sp.plan`、`/sp.tasks`、`/sp.implement` 读取 `lite.md` 的活动轮次和授权范围。它们不各自定义 Lite 状态，也不依赖每次手工传 `--lite`。

新增 `workflows/speckit-lite/workflow.yml` 作为单轮编排入口。第一次运行包含 PRD、Outline 和 Specify；后续运行从 `sp.lite next` 开始。工作流直接列出步骤，不引入当前引擎不支持的 workflow inheritance。状态判断始终以 `lite.md` 为准，YAML 只负责调用和人工 gate。

## 失败处理

- 没有可验证候选：返回 `NEEDS_DECISION`，不为凑数生成方向。
- 用户自定义方向无法映射到确认版 Outline：先修改 PRD/Outline，不能直接进入 Lite。
- 候选依赖未确认范围：拆出依赖，或把依赖一并纳入当前人工确认。
- 实现越过 `Allowed Write Set`：停止并返回 `/sp.plan`。
- 回归破坏历史轮次：当前轮次不能进入业务验证。
- 证据不足：结果为 `INCONCLUSIVE`，不能记为 `supported`。
- 账本与文档/代码不一致：将相关状态置为 `STALE`，先执行 sync 和人工核对。

## 测试要求

至少覆盖：

- 首轮生成 2–3 个候选、人工选择、自定义方向和拒绝自动选择。
- 未选候选不改变覆盖账本，明确延期才产生 `deferred`。
- `extend`、`independent`、`revise`、`coverage` 四种关系。
- 同一 feature 拒绝第二个活动轮次，独立轮次可依赖非最近轮次。
- scoped Flow/UI confirmation 只解锁当前轮次 task。
- `implemented`、`verified`、`supported` 三种状态不能互相替代。
- PRD/Outline 新增、修改、删除对历史轮次和账本的影响。
- 多轮累计回归，失败时阻止本轮验证和累计完成。
- 任何 deferred/stale/invalidated anchor 阻止 `OUTLINE_COMPLETE_VIA_LITE`。
- 所有 Outline anchors 完成后通过累计完成门，但仍不产生 `READY_FOR_PRODUCTION`。
- Full SP 默认流程及现有 feature 不受影响。

## 分阶段实施

### 第一阶段：状态合同

定义 `lite.md` schema、轮次 ID、三维覆盖账本、状态机、验证器和迁移规则，实现 `init`、`next`、`select`、`sync`、`evaluate`。

### 第二阶段：范围消费

让 Flow、UI、Plan、Tasks 和 Implement 读取活动轮次，复用 `SCOPED_CONFIRMATION`、workset、`Implementation Readiness`、`Allowed Write Set` 和 `Required Checks`。

### 第三阶段：多轮与累计完成

实现轮次依赖、四种关系、历史回归集合、Outline 变化传播和 `OUTLINE_COMPLETE_VIA_LITE` 门。

### 第四阶段：工作流与审核界面

增加 Lite 单轮 workflow，在现有 review surface 中显示候选对比、人工选择、覆盖进度、轮次关系和证据结果。

## 多模型审查结论

Claude 和 Gemini 都建议使用明确轮次、人工候选选择、轮次依赖和 Outline 覆盖账本，并同意 Lite 不能另建 `lite-plan.md` 或 `lite-tasks.md`。两者也都认为后续轮次应支持扩展、独立分支、修正和补缺。

本设计对两份建议做了以下修正：

- 不按轮次建立另一套权威 Flow/UI 文件，继续使用现有 Flow/UI 与 batch confirmation。
- 不把未选候选自动标成 deferred。
- 不用单一状态混合选择、实现和验证进度。
- 不把 `superseded` 本身视为完成，替代 anchor 仍需完成。
- 不采用 95% 等比例作为项目完成条件；当前确认版 Outline 的必需项必须逐项完成。
- 不允许多个活动轮次同时修改共享事实源，但允许历史轮次形成非线性依赖关系。

## 明确不做

- 不修改完整 SP 的默认语义。
- 不把 Lite 变成低测试、低安全或纯演示代码模式。
- 不要求每轮创建 Git 分支或 feature flag。
- 不要求一次补全全部 Flow/UI 后才能开始第一轮实现。
- 不根据候选评分自动替用户决定验证方向。
