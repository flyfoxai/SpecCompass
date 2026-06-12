# SP 复杂阻塞根因拆解与闭环处理方法论

本文用于指导模型在 SP 框架下处理“阻塞、反复失败、无法收口、方向不确定”的复杂问题。目标不是让模型继续扩大尝试，而是让它把问题拆到可执行粒度，找到根因所在层级，先纠正底层方向和策略，再进入实现或验证。

## 1. 基本判断

复杂阻塞不能按普通任务处理。出现以下任一情况时，应进入复杂阻塞处理：

- 同一失败签名在同一层级出现两次。
- 同一 workset 在 `implement/tasks/plan/spec/clarify` 之间来回跳转，没有新证据。
- 阻塞描述过大，例如“测试不通过”“工作树很乱”“权限没解锁”“无法发布”，但没有拆成可验证子项。
- 当前修复动作开始触碰上游规格、验收、流程、数据、权限、架构边界或人工决策。
- 继续执行需要模型猜测用户意图、风险接受、回滚策略、合规选择或业务取舍。

进入复杂阻塞处理后，模型不能再用进度汇报、状态摘要或笼统建议代替逐项收口。

## 2. 控制论视角

SP 处理复杂问题时应采用闭环控制，而不是线性执行。

闭环包括六步：

1. 观察：收集当前失败证据、相关文档、任务状态、代码变化和验证结果。
2. 定向：判断问题属于哪个层级，识别根因假设和错误处理方向。
3. 决策：选择最小安全修复路线，必要时生成人工决策包。
4. 行动：只处理一个可验证子问题，不扩大范围。
5. 验证：用测试、检查、文档一致性或人工决策证明结果。
6. 回写：更新 `tasks.md`、`memory/open-items.md`、`trace-index.md`、`analysis.md` 或 `gate.md` 中被改变的事实。

如果验证失败，不能简单重复行动，必须重新进入“定向”阶段，说明原假设为什么不成立。

## 3. 根因层级

模型必须先判断阻塞属于哪一层。根因层级固定如下：

| 层级 | 典型根因 | 正确路线 |
|---|---|---|
| `prd` | 战略目标、用户、场景、价值或范围不清 | `/sp.prd` 或人工产品决策 |
| `spec` | 需求、验收、业务规则、角色、边界不清或冲突 | `/sp.specify` |
| `clarify` | 用户意图、风险接受、取舍、合规、回滚或人工选择缺失 | `/sp.clarify` |
| `flow` | 业务流程、状态流、分支、失败路径、补偿路径不清 | `/sp.flow` |
| `ui` | 页面元素、交互、字段、可见性、事件绑定缺少业务来源 | `/sp.ui` |
| `plan` | workset、架构路线、代码落点、运行命令、实现准入不清 | `/sp.plan` |
| `tasks` | 任务过大、不可执行、缺 Allowed Write Set、缺 Required Checks | `/sp.tasks` |
| `implement` | 局部代码错误、实现偏差、测试失败、引用未修复 | `/sp.implement` |
| `verify` | 测试语义、构建命令、验收证据、环境检查不稳定 | `/sp.analyze` 或 `/sp.gate` |
| `data` | 数据模型、schema、迁移顺序、fixture 数据形状、数据兼容或初始化状态不清 | `/sp.plan`、`/sp.flow` 或 `/sp.clarify` |
| `memory` | open item、trace、状态、历史证据或 fallback-log 不一致 | `/sp.analyze` |
| `external` | 外部服务、依赖、权限、环境、第三方限制 | `/sp.clarify` 或记录外部阻塞 |
| `human-decision` | 只能由人决定的产品、风险、合规、拆分或降级选择 | `/sp.clarify` |

判断规则：优先修正最上游的真实根因。不能用下游代码 hack 解决上游业务矛盾，也不能用测试改弱来掩盖需求或架构问题。

`Root Layer` 和 `Next Route` 必须一致。默认按上表路由；如果需要偏离，必须写明理由和风险。禁止把 `clarify`、`human-decision`、`external` 或需要风险接受的问题直接路由到 `/sp.implement`。

fixture 边界要分清：fixture 的数据形状、schema、迁移兼容、初始化策略属于 `data`；fixture 脚本语法、测试本地搭建、导入路径或执行命令错误属于 `implement`。如果脚本错误只是数据契约变更的症状，优先按 `data` 处理。

## 4. Blocker Breakdown

每个未关闭 blocker 都必须拆成 `Blocker Breakdown`。最小字段如下：

| 字段 | 要求 |
|---|---|
| `Blocker ID` | 来自 `memory/open-items.md`，或本次发现的临时 ID |
| `Symptom` | 用户或验证看到的表层问题 |
| `Evidence` | 当前失败命令、文件、文档冲突、缺失字段或人工输入 |
| `Root Layer` | 使用固定根因层级之一 |
| `Root Cause Hypothesis` | 当前最可信的根因假设 |
| `Disconfirming Evidence` | 已排除的错误方向或失败尝试；第二次同类尝试前必填 |
| `Project Constraint` | 违反了哪个 SP 规则、项目目标、验收或架构边界 |
| `Smallest Solvable Unit` | 下一步能独立完成并验证的最小问题，必须能用一个明确验证动作证明 |
| `Repair Strategy` | 推荐处理方式，不超过一个主路线 |
| `Verification` | 如何证明该子问题解决 |
| `Writeback Target` | 需要更新的任务、open item、trace、source doc 或 gate |
| `Next Route` | 精确到一个 `/sp.*` 命令或人工决策 |

如果不能填写 `Smallest Solvable Unit`，说明问题还没有拆到可执行粒度，不能进入实现。

`Smallest Solvable Unit` 的上限是一次可控闭环：一个业务验收点、一个 flow 分支、一个边界对象、一个失败命令，或一个明确的人工决策。它不能写成“修完所有测试”“清理全部工作树”“解决整个模块”。

低风险、单层级、证据充分的简单 blocker 可以走轻量路径，只填写 `Symptom`、`Evidence`、`Smallest Solvable Unit`、`Verification` 和 `Next Route`。只要问题跨层、涉及人工决策、涉及数据/权限/发布风险、触碰 Allowed Write Set 边界，或同类失败出现第二次，就必须使用完整 `Blocker Breakdown`。

## 5. 问题拆分规则

复杂阻塞要按“可独立验证”拆，不按文件数量或模型方便程度拆。

优先拆分维度：

- 按验收路径拆：每个子问题对应一个 acceptance 或手工验证路径。
- 按业务流程节点拆：每个子问题对应一个 flow step、分支或失败路径。
- 按边界对象拆：API、数据表、权限、事件、UI action、测试契约分别处理。
- 按错误类型拆：需求冲突、代码错误、测试资产缺失、环境问题、数据迁移风险分开处理。
- 按决策类型拆：模型能修复的问题和必须人工选择的问题分开。

不允许作为复杂阻塞收口依据的拆法：

- “先把所有测试修完”。
- “清理所有 dirty worktree”。
- “统一解决 owner-gated 模块”。
- “把所有阻塞一起处理”。
- “先大重构再验证”。

这类拆法太大，容易造成 token 浪费、误删、重复尝试和错误归因。

## 6. 根因优先，而不是症状优先

模型每次修复前必须回答：

- 当前看到的是症状，还是根因？
- 如果修了这个症状，是否会掩盖上游问题？
- 当前失败是代码错、测试语义错、任务边界错、计划错、规格错，还是人没有决策？
- 最小修复是否会改变项目方向、验收语义或架构边界？

如果答案指向上游层级，必须先上移。

例子：

- `pnpm test` 失败不等于“改代码”。先判断是代码回归、测试资产缺失、无测试仓库的 test 语义错误，还是测试命令定义错误。
- dirty worktree 不等于“全部提交”。先拆成用户已有改动、模型稳定改动、失败尝试、生成物、临时文件、需要归档的证据。
- owner-gated 没解锁不等于“继续改 src”。先确认权限边界、assignment、lock、人工授权和 Allowed Write Set。

## 7. 错误方向纠偏

发现处理方向错误时，必须先纠偏，再继续执行。

纠偏输出应包含：

- 原处理方向。
- 为什么该方向不稳或不正确。
- 新的根因层级。
- 新的最小修复路线。
- 哪些已做改动可以保留，哪些是失败尝试，哪些需要人工确认后清理。
- 下一步命令。

如果错误方向已经带来代码或文档修改，不能直接 reset。应先分类：

- 稳定有效改动：可保留并验证。
- 失败尝试：记录证据，建议撤销或隔离。
- 未验证改动：不能作为完成证据。
- 用户已有改动：不能擅自删除或覆盖。

“稳定有效改动”必须有验证证据支持。没有通过的验证命令、人工确认、文档一致性证据或明确 gate 证据时，默认归类为未验证改动，不能作为完成依据，也不能用于关闭 blocker。

## 8. 人工决策边界

以下问题不能由模型擅自 PASS：

- 需求天然冲突。
- 风险接受或发布降级。
- 合规、数据、安全、权限边界。
- 回滚、软删除、兼容期或迁移策略。
- 拆分成子项目、子功能或保留在当前 workset。
- 验证降级，例如缺少自动测试时是否接受手工验证。
- 是否提交、归档、删除或保留不确定的 dirty worktree 内容。

人工决策必须通过 `/sp.clarify` 或等价决策包提出，格式固定：

- 背景：现在卡在哪里。
- 影响：不决策会影响什么。
- 证据：当前已确认和未确认的信息。
- 选项：2-4 个可选方案。
- 取舍：每个方案对稳定性、准确性、效率、后续成本的影响。
- 推荐：模型推荐哪一个，为什么。
- 下一步：用户选定后走哪个 `/sp.*` 命令。

进入 `NEEDS_DECISION` 后，同一 `Blocker ID` 下游命令必须冻结。除非用户已经选择方案并回写 source doc、open item 或任务，否则 `/sp.plan`、`/sp.tasks`、`/sp.implement`、`/sp.analyze` 和 `/sp.gate` 只能引用该待决项，不能绕过它继续推进。

冻结状态应稳定写入 `memory/open-items.md` 或对应 source doc/task，最少包含：`Blocker ID`、`Failure Signature`、`Root Layer`、`Pending Decision`、`Frozen Scope`、`Allowed Reads`、`Disallowed Actions`、`Decision Package Link`、`Writeback Target`、`Next Route`。模型建议不能替代 `human-selected` 决策记录。

## 9. 防震荡机制

同一问题不能在多个命令间无限循环。

失败签名必须可复查。推荐格式：

```text
<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>
```

例如：

```text
verify::pnpm test::tests/unit/project-smoke.test.ts::missing-fixture
memory::/sp.gate::memory/open-items.md::stale-status
```

如果没有文件路径，使用 `feature/workset/anchor`；如果没有命令，使用触发该失败的 `/sp.*` route。模型不能只靠改写自然语言来把同一个失败当成新问题。

规则：

- 同一失败签名同层级最多两次尝试。
- 第二次尝试前必须写出差异诊断：第一假设、反证、新假设、新验证方式。
- 第二次尝试前如果 `Disconfirming Evidence` 为空，必须停止进入 `BLOCKED`，不能继续执行。
- 第二次仍失败，必须停止自动推进，进入 `BLOCKED` 或 `NEEDS_DECISION`。
- 发生跨命令 fallback 时，应记录或提议更新 `memory/fallback-log.md`。
- fallback-log 只防止重复循环，不替代 `open-items.md`、`trace-index.md` 或验证证据。

fallback-log 的提权规则：

- `/sp.tasks` 和 `/sp.implement` 只能追加 fallback-log 条目或写 `promote-candidate: <Failure Signature>`，不能直接创建、合并、关闭或提权 `memory/open-items.md` blocker。
- 只有 `/sp.analyze` 和 `/sp.gate` 可以把 fallback-log 条目提升为 `memory/open-items.md` blocker。
- 同一失败签名在同一 workset 出现两次，必须由 `/sp.analyze` 或 `/sp.gate` 提权为 `memory/open-items.md` blocker。
- fallback 已经阻断阶段准入，必须由 `/sp.analyze` 或 `/sp.gate` 提权为 `memory/open-items.md` blocker。
- fallback 涉及人工决策、数据迁移、权限、安全、发布、回滚或工作树清理，必须由 `/sp.analyze` 或 `/sp.gate` 提权为 `memory/open-items.md` blocker。
- 如果该失败签名已经提权，不能新建重复 open item；应引用 existing open item ID，并把 fallback-log 标注为 `promoted`。

跨命令 handoff 必须带上来源命令、`Blocker ID`、失败签名、已排除假设、当前 `Root Layer`、目标 `Next Route` 和 `Writeback Target`。否则目标命令容易重复已经失败的路径。

## 10. 收口标准

一个复杂 blocker 只有在以下条件满足时才算收口：

- 已有明确 `Root Layer`。
- 已拆成一个或多个 `Smallest Solvable Unit`。
- 每个子问题都有验证方式。
- 修复动作没有越过 Allowed Write Set 或项目约束。
- 当前验证证据支持结论。
- 稳定事实已经回写。
- 剩余风险如果未关闭，必须有 owner、影响范围、回滚或降级路径、关闭条件和 revisit anchor。

回写必须完整。`Writeback Target` 中列出的目标要么全部更新成功，要么在 `memory/open-items.md` 保留“回写未完成”的 blocker，说明已写目标、未写目标、原因和下一步 route。不能在部分回写后声称 blocker 已关闭。

`RESOLVED` 表示已验证解决。

`OPEN` 表示仍阻塞或仍需处理。

`DEFERRED_WITH_OWNER` 表示明确接受延期，且有 owner、影响、关闭条件、回滚/降级和 revisit anchor。owner 不能是“模型”或“自动流程”；revisit anchor 必须能定位到具体 open item、任务、issue、日期或外部 owner 记录。

`INVALID_OR_STALE` 表示证据显示该 blocker 已不适用，且说明为什么。

## 11. 对 SP 命令的落地要求

### `/sp.analyze`

应负责诊断和拆解：

- 检查 blocker 是否已经有 `Blocker Breakdown`。
- 判断根因层级是否合理。
- 校验 `Root Layer` 和 `Next Route` 是否一致。
- 发现同一失败签名重复时，要求补齐 `Disconfirming Evidence`。
- 标出错误处理方向。
- 对无法收口的问题给出最小可解决单元和下一步 route。
- 负责把满足条件的 fallback-log 或 `promote-candidate` 提权到 `memory/open-items.md`；如果已经提权，只引用 existing open item ID。
- 不直接替代 `/sp.gate` 做阶段决策。

### `/sp.gate`

应负责裁决：

- 没有 blocker-by-blocker breakdown 时不能 PASS。
- 大 blocker 没拆成可执行子项时不能 PASS 或 CONDITIONAL。
- 剩余 `OPEN` blocker 必须映射为 `FAIL`、`BLOCKED` 或 `NEEDS_DECISION`。
- `CONDITIONAL` 只能用于有 owner、影响、回滚/降级、关闭条件和 revisit anchor 的延期项。
- `Writeback Target` 未完整回写时不能 PASS。
- `CONDITIONAL` 必须引用可查锚点，不能只写“后续处理”“下次迭代”。
- 负责在阶段准入前把阻断性的 fallback-log 或 `promote-candidate` 提权到 `memory/open-items.md`；如果已经提权，只引用 existing open item ID。

### `/sp.implement`

应负责局部修复：

- 只能处理 `Mode: impl` 且有 Allowed Write Set 的最小子问题。
- 第一次失败后必须做差异诊断。
- 第二次同类失败后停止，不继续硬冲。
- 如果发现根因在上游，必须返回对应 route。
- 只能追加 fallback-log 或 `promote-candidate`，不能直接提权、关闭或合并 `memory/open-items.md` blocker。
- 遇到 `NEEDS_DECISION`、越界写入、缺 Allowed Write Set 或缺 Required Checks 时必须停止，不能用技术 hack 绕过。

### `/sp.tasks`

应负责生成可执行子问题：

- 大 blocker 必须拆成独立任务、决策任务、验证任务或归档任务。
- 任务必须说明验证方式和写回目标。
- 需要人工决策的任务不能伪装成实现任务。
- 任务包必须继承来源 `Blocker ID`、失败签名、已排除假设和 Allowed Write Set。
- 只能把 repeated fallback 写成任务、fallback-log 或 `promote-candidate`，不能直接提权、关闭或合并 `memory/open-items.md` blocker。

### `/sp.plan`

应负责纠正技术路线：

- 当 blocker 来自代码边界、workset、运行命令、实现准入或架构路线时，由 `/sp.plan` 修正。
- `/sp.plan` 不应直接生成实现任务，只负责让 `/sp.tasks` 有足够依据生成任务。
- 对复杂 blocker 必须记录 `Blocker ID`、`Failure Signature`、`Root Layer`、`Next Route`、`Writeback Target` 和 `NEEDS_DECISION` 冻结要求。

### `/sp.clarify`

应负责人工选择：

- 当根因是用户意图、风险接受、业务取舍、合规、回滚或拆分争议时，输出决策包。
- 用户决策后，必须写回对应 source doc、open item 或任务。
- 未决策前必须保持 `NEEDS_DECISION` 冻结状态，不能让下游命令继续推进同一 blocker。

## 12. 推荐输出模板

复杂阻塞处理时，模型应优先输出如下结构：

```text
Verdict: FAIL | BLOCKED | NEEDS_DECISION

Root-Cause Summary:
- Main root layer:
- Why this is not a lower-layer coding issue:
- Wrong direction to avoid:

Blocker Breakdown:
| ID | Failure Signature | Symptom | Evidence | Root Layer | Disconfirming Evidence | Smallest Solvable Unit | Strategy | Verification | Next Route |
|---|---|---|---|---|---|---|---|---|---|

Decision Needed:
- Background:
- Impact:
- Options:
- Recommendation:
- Next command:

Writeback:
- open-items:
- tasks:
- trace:
- fallback-log:

Handoff:
- Source command:
- Target command:
- Blocker ID:
- Failure Signature:
- Root Layer:
- Next Route:
- Writeback Target:
- Excluded hypotheses:
- Pending decision:
```

如果没有人工决策，删除 `Decision Needed` 部分。

## 13. 外部思想借鉴

本方法论吸收以下思想，但不照搬重型工具：

- 系统工程强调需求、设计、验证、确认和风险管理之间的可追踪关系。SP 用 `spec/flow/ui/plan/tasks/trace/open-items/gate` 替代重型 SysML 或数据库。
- OODA 强调在复杂环境中持续观察、定向、决策、行动。SP 的关键是把“定向”保存为可追踪证据，避免模型每轮重新猜。
- AI coding agent 的经验表明，复杂任务需要任务分解、代码定位、测试反馈和轨迹记录。SP 采用轻量 `Blocker Breakdown`、`fallback-log` 和 `trace-index`，而不是引入重型 agent runtime。
- 多 agent 框架强调角色和 SOP。SP 只吸收边界、handoff、串行 closeout 和共享 truth 面，不默认引入复杂多 agent 编排。

参考资料：

- NASA Systems Engineering Handbook: https://www.nasa.gov/wp-content/uploads/2018/09/nasa_systems_engineering_handbook_0.pdf
- NASA MBSE Handbook 1009A: https://standards.nasa.gov/system/files/tmp/2025-03-12-NASA-HDBK-1009A.pdf
- OODA Loop overview: https://thedecisionlab.com/reference-guide/computer-science/the-ooda-loop
- SWE-agent: https://github.com/swe-agent/swe-agent
- Aider repository map: https://aider.chat/2023/10/22/repomap.html
- MetaGPT: https://github.com/FoundationAgents/MetaGPT
- OpenHands: https://github.com/OpenHands/openhands

## 14. 最终原则

复杂问题的正确处理顺序是：

```text
先定层级 -> 再拆子问题 -> 再纠正方向 -> 再执行最小修复 -> 再验证 -> 再回写
```

不能反过来：

```text
先继续改代码 -> 再解释为什么改了 -> 再用总结声称阻塞减少
```

SP 应优先保证方向正确、边界清晰、证据可复查。效率只能建立在稳定闭环之上。
