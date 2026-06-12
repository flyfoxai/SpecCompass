# SP 复杂阻塞机制修复方案协商记录

本文记录 Gemini、Claude 与 Codex 对“复杂阻塞根因拆解与闭环处理机制”修复方案的协商结果。本文是过程记录，不替代正式方法论；正式结论需要再写入对应方法论、命令模板、preset 和测试。

## 已一致同意的修复项

### 1. `/sp.plan` 必须接入复杂阻塞闭环

`/sp.plan` 和 lean preset 的 `sp.plan` 不能遗漏新机制。它们需要识别和传递：

- `Blocker ID`
- `Failure Signature`
- `Root Layer`
- `Next Route`
- `Writeback Target`
- `NEEDS_DECISION` 决策冻结

原因：`/sp.plan` 是 workset、代码边界、实现准入和下游任务生成的关键控制点。如果它不遵守冻结和 handoff 规则，下游 `/sp.tasks`、`/sp.implement` 仍可能绕过未决策问题继续推进。

### 2. fallback-log 晋升必须幂等去重

`fallback-log` 只能用于防止重复震荡，不能成为第二事实源。晋升到 `memory/open-items.md` 前必须先检查是否已有相同或等价的 `Failure Signature` / `Blocker ID`。

统一规则：

- 已经 `promoted` 的 fallback entry 只能引用已有 open item。
- 同一失败签名不能重复创建多个 open item。
- 新证据可以补充到已有 open item 或 evidence 记录中。
- `memory/open-items.md` 仍是 blocker、风险、决策、关闭条件的当前事实源。

### 3. Handoff 模板必须补齐关键字段

跨命令 handoff 必须携带足够信息，避免目标命令重复已经失败的路径。

必填字段：

- Source command
- Target command
- `Blocker ID`
- `Failure Signature`
- `Root Layer`
- `Next Route`
- `Writeback Target`
- Excluded hypotheses / `Disconfirming Evidence`

### 4. open-items 必须表达 pending decision / freeze

进入 `NEEDS_DECISION` 后，同一 `Blocker ID` 的下游工作必须冻结，直到人类选择已经回写。这个状态不能只靠 prose 推断，需要在 open item 中有稳定表达。

可采用的字段或状态包括：

- `Status: PENDING_DECISION`
- `Freeze: active`
- `Decision Owner`
- `Decision Options`
- `Selected Decision`
- `Writeback Target`
- `Unfreeze Condition`

### 5. data root layer 与 fixture/脚本错误必须消歧

fixture 相关问题不能一律归入 `data` 或一律归入 `implement`。

建议边界：

- fixture 数据结构、字段兼容、迁移顺序、数据契约、初始化数据设计问题，归 `data`。
- fixture 生成脚本语法错误、局部函数调用错误、测试脚本实现错误，归 `implement`。
- 如果脚本错误只是数据契约变化的症状，应优先归 `data`，避免在实现层反复修补表象。

### 6. 测试需要覆盖 plan / lean_plan 和语义断言

当前测试不能只检查宽泛关键词存在。需要补充更具体的语义断言：

- `templates/commands/plan.md` 和 `presets/lean/commands/sp.plan.md` 包含阻塞 handoff、失败签名、决策冻结和回写目标规则。
- `NEEDS_DECISION` 未回写前不能继续生成可执行任务或实现准入。
- fallback-log 已 promoted 时不能重复创建 open item。
- `Root Layer` 与 `Next Route` 必须一致，偏离时必须说明理由和风险。
- fixture 数据问题与 fixture 脚本问题的归因边界必须明确。

## 待协商分歧

### 分歧 A：lean preset 是否补 `sp.clarify`

Gemini 倾向：补一个 lean `sp.clarify.md`，保持 `/sp.clarify` 路由可达。

Claude 倾向：不补完整 clarify，lean 保持轻量；人工决策落到 open-items pending decision / freeze，必要时升级到 full preset。

待进一步确认：是否可以补“极简 lean clarify”，只负责决策包、问人、回写和解除 freeze，而不引入完整 clarify 复杂度。

追问理由后，双方意见收敛：

- Gemini 支持补极简 lean clarify。理由是 lean 也需要显式的人类决策接球点，否则 freeze 后容易让用户和后续 agent 不知道下一步。
- Claude 也支持补极简 lean clarify，但要求严格限制职责，不能膨胀成 full clarify。

Codex 判断：采用“极简 lean clarify”。它只允许做五件事：识别决策点、生成决策包、等待或记录用户选择、回写并解除 freeze、给出下一步命令。禁止引入 full clarify 的大范围歧义分析、优先级评分、需求重写和复杂访谈逻辑。

### 分歧 B：fallback-log 晋升职责由谁负责

Gemini 倾向：允许 `tasks` / `implement` 对当前失败签名触发晋升，但必须先查后写、禁止重复创建。

Claude 倾向：`tasks` / `implement` 只 append fallback-log；统一由 `analyze` / `gate` 做 promotion，减少写放大和并发冲突。

待进一步确认：是否采用“受限触发”机制，即现场命令只能处理当前签名、必须幂等去重，`analyze` / `gate` 负责批量收口。

追问理由后，双方意见收敛：

- Gemini 改为支持只允许 `analyze` / `gate` promotion。理由是 `tasks` / `implement` 高频执行，直接写 open-items 会增加写放大、并发冲突和 token 成本。
- Claude 坚持只允许 `analyze` / `gate` promotion。理由是 promotion 是有状态写操作，需要集中处理；`tasks` / `implement` 缺少原子 read-check-write 能力，不能可靠去重。

Codex 判断：采用集中 promotion。`tasks` / `implement` 只允许追加 fallback-log，必要时可写 `promote-candidate: <Failure Signature>`，但不能直接创建、合并、关闭或标记 open item。`analyze` / `gate` 负责读取候选项、去重、晋升到 open-items，并把 fallback-log 标记为 `promoted`。

## 最终协商结论

本轮修复应按以下规则执行：

1. `/sp.plan` 和 lean `sp.plan` 接入完整 blocker handoff、failure signature、decision freeze 和 writeback target。
2. lean preset 增加极简 `sp.clarify.md`，只做决策包、问人、回写、解除 freeze 和下一步路由。
3. fallback-log promotion 集中到 `/sp.analyze` 和 `/sp.gate`。
4. `/sp.tasks` 和 `/sp.implement` 只追加 fallback-log 或 `promote-candidate`，不直接修改 open-items 的 blocker 状态。
5. open-items 增加 pending decision / frozen 的稳定表达。
6. Handoff 模板补齐 `Root Layer`、`Next Route`、`Writeback Target`。
7. data 与 fixture/脚本错误边界写入方法论和命令模板。
8. 测试补齐 plan、lean_plan、lean clarify 路由、promotion 权限边界和语义断言。
