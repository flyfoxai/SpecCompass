# `/sp.lite` 命令设计

## 目标

`/sp.lite` 是 SP Lite 的单一用户入口和轮次编排 owner。用户每次开始新一轮时，先从 2–3 个验证方向中选择、修改或自定义一个方向；方向确认后，命令根据当前项目进度，按正常 SP 顺序自动调用需要的 owner command，直到本轮选定的最小原型已经实现、检查通过并可以开展业务验证。

再次运行 `/sp.lite` 时，命令先恢复未完成轮次；如果上一轮已经关闭，则重新生成候选并开启下一轮选择。后续轮次可以扩展已有原型，也可以处理与最近轮次无关的 Outline 分支。完成判断始终以当前确认版 Outline 的累计覆盖为准。

Lite 只缩小每轮范围，不改变各 SP 命令的职责，不绕过人工确认，也不把命令退出码 0 当成 readiness、验证成功或业务 PASS。

## 方案比较

### 方案 A：把全部规则写进 `/sp.lite`

`/sp.lite` 自己生成 PRD、Flow、UI、Plan、Tasks 和代码。单次调用看起来最直接，但会复制所有 owner command 的规则，后续很快与 `/sp.flow`、`/sp.ui`、`/sp.plan` 等发生漂移，也无法复用已有 readiness 和确认合同。

### 方案 B：用一个固定 YAML 工作流串完全部步骤

实现成本较低，但当前 workflow gate 只能提供固定选项，不能可靠接收动态候选修改或自定义方向；嵌套 switch/loop 暂停后会重新执行父步骤；工作流输出也不能替代 `lite.md` 的长期业务状态。因此它适合作为执行外壳，不适合作为 Lite owner。

### 方案 C：状态感知编排器

`/sp.lite` 负责候选、人工选择、轮次状态和执行收口；一个确定性 Lite 状态检查器从 `lite.md` 和各阶段 readiness 计算唯一下一步；现有 owner command 继续生成和确认各自产物；workflow 只在允许时逐个调度命令并提供恢复能力。

采用方案 C。它满足“一次选择后自动推进”，同时保留现有 SP 的职责边界、证据合同和跨集成兼容性。

## 用户入口

默认入口不要求用户记忆子命令：

```text
/sp.lite [feature-or-brief]
```

默认行为是：检查状态、完成必要的基础阶段、安排本轮选择、确认后自动推进，或从上次暂停点继续。高级动作只用于明确控制和排障：

```text
/sp.lite status [feature]
/sp.lite select <A|B|C|custom> [修改说明]
/sp.lite evaluate [证据或结论]
/sp.lite sync
/sp.lite stop
/sp.lite promote
/sp.lite complete
```

`select`、`evaluate` 等动作不会建立另一套入口逻辑。它们都调用同一个状态控制器，完成动作后继续执行默认推进循环，直到遇到下一个人工门或本轮完成。

## 总体结构

```text
用户 /sp.lite
    |
    v
Lite Coordinator
    |-- 读取 lite.md、PRD、Outline、Spec、memory、readiness
    |-- 运行确定性 Lite 状态检查
    |-- 处理候选和人工选择
    |-- 只调度一个被允许的 owner command
    |-- 命令返回后重新读取持久化证据
    `-- 重复，直到暂停或完成

Owner commands
    sp.prd -> sp.specify -> sp.flow -> sp.ui -> sp.gate
    -> sp.bundle -> sp.plan -> sp.tasks -> sp.analyze
    -> sp.gate -> sp.implement -> sp.analyze -> sp.gate

Durable authority
    lite.md + 各 owner artifact/readiness/confirmation
```

协调器不得在内存里假设上一命令已经成功。每次调度前先把当时的 64 位输入签名写入 `Stage Source Signatures`，调度后重新读取文件并验证 readiness、确认范围和 blocker。Flow、UI、Bundle、Plan、Tasks 的完成产物必须同时绑定当前 `Lite Round`、`Lite Stage`、`Included Outline Anchors` 和该次调度前签名；Flow/UI 还必须有当前轮人工确认，Plan 必须有当前轮人工批准。旧轮内容可以复用，但旧轮 artifact 不能直接充当当前轮完成证据。

Gate 和 Analyze 的 PASS 由协调器保存为 `lite-evidence/<LITE-RNNN>/` 下每阶段、每轮唯一的不可变快照，快照签名必须与当前轮账本中的阶段签名完全一致。Implement 必须返回同样的轮次、阶段、anchors、签名以及非空 Completion Evidence。Flow/UI 若不适用，也必须记录具体理由和人工确认的 `NOT_REQUIRED_CONFIRMED`，不能静默跳过。

## 每次调用的入口规则

### 1. 定位 feature

按以下优先级确定目标：显式参数、`.specify/feature.json`、可靠的 active feature memory。存在多个候选且无法确定时进入 `NEEDS_DECISION`，不能扫描后自行选择主线。

### 2. 获取编排租约

同一 feature 同时只能有一个 Lite 编排执行。`lite.md` 记录 `orchestration_run_id`、开始时间和当前阶段。检测到另一个仍有效的执行时停止，避免两个 `/sp.lite` 同时修改共享事实源。

异常退出留下的租约不永久锁死项目。重新运行时，如果没有活动进程证据，用户可以确认接管；接管只恢复状态，不重置轮次。

### 3. 同步来源

比较 PRD、Outline、Spec 和活动轮次的 Evidence Signature。语义变化时先执行 Lite sync，生成影响报告并暂停等待人工判断；纯格式变化可以由人确认不影响证据。活动轮次为 `STALE` 时禁止继续 Flow、UI、Plan、Tasks 和 Implement。

### 3.1 执行全局路线检查

在生成候选以及每次计算下一 owner command 前，控制器必须重新读取确认版 Outline、覆盖账本、历史轮次、项目和 feature memory、开放决定、共享接口/数据/权限合同、当前 workset/write set、代码基线和历史回归证据。检查器输出 `CLEAR`、`REUSE_REQUIRED`、`RECONCILE_REQUIRED`、`STALE_EVIDENCE` 或 `REGRESSION_BLOCKED`，自然语言协调器不能覆盖这个结果。

`REUSE_REQUIRED` 会暂停平行生成，要求候选或任务只保留尚未覆盖的 delta；`RECONCILE_REQUIRED` 返回拥有矛盾事实的 `/sp.*` owner；`STALE_EVIDENCE` 唯一路由是 `/sp.lite sync`；`REGRESSION_BLOCKED` 返回拥有修复工作的 plan/tasks/implement owner。只有 `CLEAR` 能继续自动调度。

非 `CLEAR` 的 owner route 是人工确认后的受限修复入口，不是正常生命周期
调度。被点名的 owner 只能处理 blocker refs 和 Allowed Write Set 内的修复，
结束后返回 `/sp.lite sync`；它不能自行把全局状态改成 `CLEAR`。任何 owner 的
正常 Lite 工作还必须验证 fresh route 中 `next` 正好等于自身，避免用户直接
调用后越过唯一 owner 顺序。

### 4. 补齐基础阶段

候选方向必须来自稳定的 PRD 和确认版 Outline。因此首次使用时，命令可以先调用 `/sp.prd`，并在 Outline 人工确认处暂停；确认后调用 `/sp.specify`。这属于候选生成的前置工作，不得提前生成 Lite Flow、UI 或实现任务。

后续轮次默认复用当前 PRD、Outline 和 Spec。只有来源变化、重要产品范围变化或 readiness 失效时才返回这些阶段。

### 5. 安排本轮选择

没有活动轮次时，生成 2–3 个候选并立即展示给用户。每个候选必须说明业务假设、included/deferred anchors、端到端验证路径、预期证据、成本、风险、依赖和与历史轮次的关系。

用户可以：

- 选择 A、B 或 C。
- 修改某个候选的 included/deferred 范围、验证信号或实现边界。
- 输入自定义方向。
- 暂不开始本轮。

系统可以推荐，但不能代选。自定义方向不能映射到确认版 Outline 时，先返回 `/sp.prd` 或 `/sp.clarify`，不能创建轮次后再补来源。`independent` 只表示本轮与上一轮业务上无关，不表示可以脱离确认版 Outline；所有新轮次都必须覆盖其中的已确认 anchors。

### 6. 冻结轮次并自动推进

选择确认后创建或激活 `LITE-Rxxx`，冻结本轮范围和验证合同。协调器随后进入推进循环，每次只调度状态检查器返回的一个 owner command。命令完成后重新检查持久化证据，再决定下一步。

### 7. 到达本轮终点

当代码、检查、累计回归、最终 analyze/gate 证据都满足本轮合同后，状态进入 `READY_FOR_BUSINESS_VALIDATION`。`/sp.lite` 输出原型运行方式、验证步骤、成功/失败信号和证据记录位置，然后结束本次调用。

业务验证结论必须由人提供。再次运行 `/sp.lite` 时，如果仍在等待结论，先完成 `evaluate`；若人工下一步是 `continue`、`revise` 或 `independent`，同一次调用关闭旧轮次后生成下一轮候选，并在新的方向选择门暂停。系统不能根据测试通过自动写成 `SUPPORTED`。

## 正常阶段顺序

Lite 必须保持 SP 的阶段顺序，只跳过经明确判断为“不适用”或已经由当前证据满足的阶段。

| 顺序 | 阶段 | owner command | 自动继续条件 | 必须暂停的情况 |
|---|---|---|---|---|
| 1 | 产品基础 | `/sp.prd` | PRD 已形成且 Outline 已可审核 | Outline 确认、来源选择、产品范围决策 |
| 2 | 稳定需求 | `/sp.specify` | `READY_FOR_FLOW` 且范围与当前 Outline 一致 | 高影响需求仍未确认 |
| 3 | 方向选择 | `/sp.lite select` | 人工冻结本轮候选 | 任何未完成选择或自定义范围冲突 |
| 4 | scoped Flow | `/sp.flow` | 当前轮次范围达到 `READY_FOR_UI` | Flow batch/scoped confirmation |
| 5 | scoped UI | `/sp.ui` | 当前轮次范围达到 `READY_FOR_PLAN` | UI batch/scoped confirmation；UI 不适用判定 |
| 6 | 业务文档门 | `/sp.gate` | 当前轮次业务文档 gate 允许 bundle | 风险接受、业务决策、确认失效 |
| 7 | 当前范围打包 | `/sp.bundle` | bundle 能追踪到本轮 anchors | bundle 需要发明缺失事实 |
| 8 | 本轮计划 | `/sp.plan` | 本轮 workset 有 Implementation Readiness | Plan 审批、写边界或架构决策 |
| 9 | 本轮任务 | `/sp.tasks` | 仅生成本轮授权的 `Mode: impl` 任务 | confirmation 比任务范围窄、任务包不完整 |
| 10 | 实现前分析 | `/sp.analyze` | 本轮依赖、trace、readiness 可判定 | owner gap 或隐含人工决策 |
| 11 | 实现前 gate | `/sp.gate` | 明确授权本轮 implementation | 风险接受、越界、未关闭 blocker |
| 12 | 实现 | `/sp.implement` | 选定任务完成且 Required Checks 有证据 | 写集合不足、失败签名重复、上下文过期 |
| 13 | 实现后分析 | `/sp.analyze` | delta、检查、trace 和回归结果完整 | 回归失败或证据不足 |
| 14 | 本轮最终 gate | `/sp.gate` | 本轮达到业务验证就绪 | 任何未关闭 blocker 或累计回归失败 |
| 15 | 业务验证 | `/sp.lite evaluate` | 人工记录结论和下一步 | 必须人工决定，不得自动跨越 |

如果当前轮次没有 UI，不能静默跳过 `/sp.ui`。必须在 `lite.md` 写明 `ui_applicability: NOT_REQUIRED`、理由、依据和人工确认；随后仍由状态检查器判断是否允许进入业务文档 gate。

## 自动推进循环

协调器使用以下逻辑：

```text
repeat:
  state = inspect_persisted_lite_and_sp_evidence()

  if state.requires_human_decision:
      persist pause reason
      show the decision package
      stop

  if state.round_ready_for_business_validation:
      persist validation instructions
      stop

  if state.round_closed:
      archive the round and clear active_round
      if human_next_action starts another Lite round:
          transition to NEEDS_CANDIDATES
          continue
      release orchestration lease
      stop

  command = state.next_required_command

  if command not in allowed_commands or not state.continue_allowed:
      persist blocker
      stop

  record dispatch attempt and input signature
  execute exactly one owner command
  inspect persisted evidence again

  if no valid state progress:
      classify failure and stop or perform one bounded repair retry
```

允许自动调度的命令白名单为：

```text
sp.prd
sp.specify
sp.flow
sp.ui
sp.gate
sp.bundle
sp.plan
sp.tasks
sp.analyze
sp.implement
```

`sp.clarify` 可以自动调用来生成或补齐决策包，但不能替用户做决定。`sp.route` 可作为诊断证据，不参与 Lite 主状态机。扩展命令只有在显式注册为某阶段 hook、写集合明确且不会绕过人工门时才能执行。

## 人工硬门

以下边界永远不能由 `/sp.lite` 自动跨越：

1. 新轮次验证方向选择、修改或自定义。
2. PRD Outline 的新鲜人工确认。
3. 会被当前轮次消费的 Flow scoped confirmation。
4. 会被当前轮次消费的 UI scoped confirmation，或 UI 不适用判定。
5. 本轮 Plan/Implementation Readiness 的人工审批。
6. 风险接受、真钱、敏感数据、不可逆操作、权限或合规决定。
7. PRD/Outline 语义变化后的影响处理决定。
8. 业务验证结论和下一轮 `continue/revise/independent/stop/promote/complete` 决定。
9. `OUTLINE_COMPLETE_VIA_LITE` 和生产发布决定。

人工确认必须写入 owner artifact 或 `lite.md`，聊天中的“看起来可以”不能成为可恢复授权。

## `lite.md` 编排字段

`lite.md` 在既有轮次和覆盖账本之外增加以下稳定字段。字段可以用 YAML frontmatter 或固定 Markdown 数据块实现，但只能有一个权威表示。

```yaml
orchestrator:
  schema: speckit.lite.orchestrator.v1
  feature: 001-example
  active_round: LITE-R002
  state: NEEDS_FLOW
  active_round_state: READY_FOR_LITE_FLOW_UI
  current_stage: FLOW
  last_completed_stage: SPECIFY
  next_required_command: /sp.flow
  continue_allowed: true
  pause_code: null
  pause_reason: null
  orchestration_run_id: lite-20260718-001
  source_evidence_signature: <semantic signature>
  round_scope_signature: <selected anchor signature>
  last_progress_signature: <readiness/evidence signature>
  no_progress_count: 0

global_control:
  status: CLEAR
  checked_at: <timestamp>
  input_signature: <outline/history/contracts/code signature>
  outline_signature: <confirmed outline signature>
  code_baseline: <git commit or explicit baseline signature>
  reuse_refs: []
  conflict_refs: []
  shared_contract_refs: []
  regression_checks: []
  blocker_route: null
  reason: null

human_gates:
  direction_selection: CONFIRMED
  outline_confirmation: CONFIRMED
  flow_confirmation: PENDING
  ui_confirmation: NOT_REACHED
  plan_approval: NOT_REACHED
  validation_result: NOT_REACHED

dispatch_history:
  - attempt_id: LITE-R002-FLOW-01
    command: /sp.flow
    input_signature: <signature>
    started_at: <timestamp>
    finished_at: <timestamp-or-null>
    process_result: COMPLETED
    evidence_result: ADVANCED
    next_stage: FLOW_CONFIRMATION
```

`process_result` 只表示命令进程结果；`evidence_result` 才表示持久化状态是否有效推进。两者不能合并。

## 状态与唯一下一步

`orchestrator.state` 是协调器的路由状态，`active_round_state` 是 `lite.md` 中活动轮次的生命周期状态。两者不能共用一个字段。控制器每次只能返回一个 `next_required_command` 或一个暂停原因：

| 当前状态 | 唯一下一步 | 成功写回 | 暂停/回退 |
|---|---|---|---|
| `NEEDS_FOUNDATION` | `/sp.prd` | PRD/Outline readiness | Outline 人工确认或来源 blocker |
| `NEEDS_SPEC` | `/sp.specify` | `READY_FOR_FLOW` | `/sp.prd`、`/sp.clarify` |
| `NEEDS_CANDIDATES` | `/sp.lite` 生成候选 | 候选版本和推荐 | 无可验证候选则 `NEEDS_DECISION` |
| `NEEDS_DECISION` | 无自动命令 | 决策包 | 等待人补充来源、范围或验证目标 |
| `AWAITING_SELECTION` | 人工选择 | 冻结活动轮次 | 不自动继续 |
| `NEEDS_FLOW` | `/sp.flow` | scoped Flow batch/readiness | 等待 Flow confirmation |
| `NEEDS_UI` | `/sp.ui` | scoped UI batch/readiness | 等待 UI confirmation/N/A 决定 |
| `NEEDS_BUSINESS_GATE` | `/sp.gate` | scoped gate verdict | owner gap、风险或人工决定 |
| `NEEDS_BUNDLE` | `/sp.bundle` | scoped bundle evidence | 缺失 first-layer 事实 |
| `NEEDS_PLAN` | `/sp.plan` | 本轮 readiness/write set/checks | 等待 Plan approval |
| `NEEDS_TASKS` | `/sp.tasks` | 本轮 task packets | 范围或确认不覆盖任务 |
| `NEEDS_PRE_IMPL_ANALYZE` | `/sp.analyze` | 诊断证据 | owner route 或 blocker |
| `NEEDS_PRE_IMPL_GATE` | `/sp.gate` | 实现授权 | 风险接受或 readiness blocker |
| `NEEDS_IMPLEMENT` | `/sp.implement` | code/test/delta evidence | write set、失败或 stale |
| `NEEDS_FINAL_ANALYZE` | `/sp.analyze` | 最终诊断和回归证据 | 修复、plan/tasks 或 blocker |
| `NEEDS_FINAL_GATE` | `/sp.gate` | 本轮验证就绪 verdict | 未关闭 blocker 或回归失败 |
| `READY_FOR_BUSINESS_VALIDATION` | 人工验证 | 证据和结论 | 不自动判定结果 |
| `EVALUATED` | 人工下一步决定 | 关闭轮次和覆盖账本 | `revise/stop/promote/complete` 门 |
| `CLOSED` | 按人工下一步路由 | 清空活动轮次；需要继续时转 `NEEDS_CANDIDATES` | `stop/promote/complete` 时进入对应终态 |
| `STALE` | `/sp.lite sync` | 影响报告 | 人工范围/证据处理决定 |
| `EXHAUSTED_BLOCKED` | 无自动命令 | 失败包和唯一 owner route | 修复输入、人工决定或显式重试 |
| `STOPPED` | 无 | 停止记录 | 仅人工恢复或 promote |
| `PROMOTED_TO_FULL_SP` | `/sp.route` 或明确 owner command | Lite 交接记录 | 按完整 SP readiness 继续 |
| `OUTLINE_COMPLETE` | 无 | `OUTLINE_COMPLETE_VIA_LITE` 记录 | 生产发布仍需独立 gate |

控制器不能根据“文件存在”直接推进。它必须验证文件不是 seed/template、readiness 状态正确、Evidence Signature 匹配、确认范围覆盖本轮、open items 不阻塞下一阶段。

控制器也不能只看活动轮次。`global_control.input_signature` 与当前 Outline、历史轮次、共享合同、代码基线或回归证据不一致时，旧的 `CLEAR` 立即失效。非 `CLEAR` 结果必须把 `continue_allowed` 设为 `false`，并返回一个负责消除问题的 `blocker_route`。

## 首次运行时序

```text
/sp.lite "新的产品想法"
  -> 没有稳定 PRD/Outline
  -> 自动调用 /sp.prd
  -> 暂停：人工确认 Outline

/sp.lite
  -> 读取新鲜 Outline confirmation
  -> 自动调用 /sp.specify
  -> 生成 A/B/C 三个 Lite 候选
  -> 用户选择或修改 B
  -> 创建 LITE-R001
  -> /sp.flow
  -> 暂停：确认本轮 Flow

/sp.lite
  -> 从 Flow confirmation 恢复
  -> /sp.ui -> 暂停确认 UI
  -> 后续调用继续从暂停点恢复
  -> /sp.gate -> /sp.bundle -> /sp.plan
  -> 暂停：批准本轮 Plan
  -> /sp.tasks -> /sp.analyze -> /sp.gate
  -> /sp.implement -> /sp.analyze -> /sp.gate
  -> READY_FOR_BUSINESS_VALIDATION
```

如果宿主支持在同一次交互中完成确认，确认后可以继续同一调用；如果宿主或 workflow 以暂停/恢复实现人工门，用户再次执行 `/sp.lite` 即可恢复，不要求记住 workflow run ID。

## 后续轮次时序

```text
/sp.lite
  -> 上轮等待验证：先记录 evaluate 结论
  -> 关闭 LITE-R001
  -> 若人工决定继续 Lite，同一次调用根据剩余 Outline 和历史证据生成新候选
  -> A: 扩展已有原型
  -> B: 处理独立 Outline 分支
  -> C: 修正被证伪方向
  -> 用户选择 B
  -> 创建 LITE-R002 relation=independent
  -> 仅为 LITE-R002 调用所需阶段
  -> 实现时同时运行仍有效历史轮次的最小回归集合
  -> READY_FOR_BUSINESS_VALIDATION
```

“独立”只表示业务范围不依赖最近轮次，不表示可以忽略当前代码基线、共享接口或历史回归。

## 失败、重试与恢复

### 命令失败

命令进程非零退出时，记录失败签名、阶段、输入签名和 stderr 摘要。第一次可以在相同 owner 内做一次有证据的修复重试；相同签名再次出现时停止，不能在 `/sp.lite` 内无限循环。

### 命令退出但没有推进

进程退出 0，但 readiness、confirmation 或 artifact signature 没有有效变化时，记为 `NO_PROGRESS`。协调器可以重新读取一次最小证据并给 owner command 一次更具体的修复提示；仍无进展则进入 `EXHAUSTED_BLOCKED`。

### 人工门后恢复

重新运行 `/sp.lite` 时，不依据上次聊天内容恢复，而是重新读取确认文档和 `lite.md`。确认仍新鲜则继续；缺失、范围不足或 stale 则继续暂停。

### 实现中断

恢复 `/sp.implement` 前检查 task 状态、实际 diff、Allowed Write Set 和 Required Checks。已经完成且证据有效的任务不重复执行；部分完成任务从 task packet 的最小未完成单元恢复。

### 防止错误循环

以 `round_id + stage + owner_route + input_signature + failure_signature` 作为循环签名。相同签名连续两次无进展即断路，并给出唯一 owner route 或人工决定包。

## Workflow 的角色

新增 `speckit-lite` workflow 作为 CLI 和不支持宿主内连续调度时的执行外壳，但它不保存 Lite 业务真相。

建议 workflow 只做三件事：

1. 调用 `/sp.lite` 检查并写出确定性 route state。
2. 当 `continue_allowed=true` 时调度一个 owner command。
3. 再次调用 `/sp.lite` reconcile，并在人工门、完成或 blocker 处暂停。

不建议把全部阶段嵌套在一个大型 `while/switch` 中。当前 nested resume 会重跑父步骤，动态候选也不能由固定 gate 完整表达。实现时可以增加一个一等的 `lite` workflow step，或让 CLI runner 在顶层逐步执行并在每次调度后保存 current stage。

无论采用哪种执行外壳，workflow run state 只能用于“进程恢复”，`lite.md` 和 owner readiness 才用于“业务恢复”。两者冲突时，以当前持久化业务证据为准，并把 workflow state 重定位到控制器返回的唯一下一步。

## 输出合同

每次 `/sp.lite` 结束时返回：

```text
FEATURE: <feature>
ACTIVE_ROUND: <LITE-Rxxx or None>
ROUND_RELATION: <extend|independent|revise|coverage|None>
STATE: <state>
LAST_COMPLETED_STAGE: <stage>
PAUSE_REASON: <plain language or None>
USER_DECISION_NEEDED: yes|no
NEXT_COMMAND_EXEC: </sp.* or None>
CONTINUE_ALLOWED: true|false
PROTOTYPE_RUN: <command/url/instructions or None>
VALIDATION_EVIDENCE: <paths or None>
OUTLINE_REMAINING: <anchor summary>
```

当需要用户选择时，输出必须包含候选 A/B/C 和一个推荐，但 `NEXT_COMMAND_EXEC` 为 `None`。当进入自动推进时，机器调度只读取确定性 route payload 和 `continue_allowed`，不能解析自然语言推荐。

## 完成语义

一次 `/sp.lite` 自动推进完成，表示本轮已经达到 `READY_FOR_BUSINESS_VALIDATION`，不是业务假设已被支持，也不是项目完成。

本轮只有在人工记录验证结论和下一步后才能 `CLOSED`。`CLOSED` 是历史轮次状态，不是协调器必须停留的终态；人工决定继续 Lite 时，协调器立即转为 `NEEDS_CANDIDATES` 并展示下一轮选择。项目只有在当前确认版 Outline 的所有必需 anchors 通过累计完成门，并由人确认 `OUTLINE_COMPLETE_VIA_LITE` 后才能进入 `OUTLINE_COMPLETE`。该状态仍不等于 `READY_FOR_PRODUCTION`。

## 测试重点

- 首次无 PRD、无 Outline、等待 Outline 确认和确认后恢复。
- 动态 A/B/C 候选、修改候选、自定义方向和拒绝自动代选。
- 同一次交互确认后连续推进，以及跨多次 `/sp.lite` 调用恢复。
- `extend`、`independent`、`revise`、`coverage` 后续轮次。
- 每个阶段只调度唯一允许的 owner command，顺序不可越级。
- Flow/UI scoped confirmation 只解锁当前轮次范围。
- UI 不适用必须有依据和人工确认，不能因省事自动跳过。
- 命令退出 0 但无 readiness 变化时不得继续。
- 相同失败签名两次无进展时断路。
- 实现中断后不重复已完成任务，不越过 Allowed Write Set。
- PRD/Outline 变化使活动轮次 stale，并阻止后续自动调度。
- 已覆盖 anchor 不得重复生成平行实现，部分重复候选只能实现真实新增 delta。
- 需求、决定、接口、数据模型、权限或 Allowed Write Set 冲突时，必须返回拥有该事实的 owner route。
- 独立轮次仍检查当前代码基线、共享合同和全部有效历史回归集合。
- 全局检查输入变化会使旧检查 stale；历史回归失败阻止业务验证和 Outline 完成。
- 业务验证结论、下一轮方向和 Outline 完成均保持人工门。
- workflow state 与 `lite.md` 冲突时按持久化业务证据重定位。
- 完整 SP 默认流程和没有启用 Lite 的 feature 不受影响。

## 明确不做

- 不让 `/sp.lite` 复制或替代其他 SP owner command。
- 不把固定 workflow step 顺序当成实际 readiness。
- 不允许模型根据评分替用户选择验证方向。
- 不因 Lite 而跳过确认、测试、安全、权限或风险处理。
- 不在一个 feature 中并行运行多个活动 Lite 轮次。
- 不把原型可运行、测试通过、本轮关闭或 Outline 完成等同于生产就绪。
