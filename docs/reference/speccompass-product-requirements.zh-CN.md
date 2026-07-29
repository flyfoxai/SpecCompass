# SpecCompass 产品需求文档

## 文档状态

- 文档类型：本项目长期维护的产品 PRD
- 当前版本：2026-07-28 基线
- 审查记录：早期迁移合同二轮曾达到 `PASS / NO_BLOCKER`；2026-07-28 针对日常/调整双通道与人工最终确认的 Claude Opus 4.8、Gemini 3.1 Pro 复核均为 `CONDITIONAL_PASS`，本文已按共同意见补齐授权来源、状态映射、锁生命周期、轻量白名单、root 冻结、stale 检查和恢复约束
- 适用范围：SpecCompass 的 PRD、Outline、子项目、Flow、UI、Plan、Tasks、实现与图形审核链路
- 权威关系：本文件定义产品需求；`sp-project-methodology.md` 解释方法；命令模板、skill、schema、脚本和 renderer 必须实现本文件，不得反向改写产品原则
- 细化设计：[SP Outline 项目边界调整工作流](sp-outline-boundary-adjustment-workflow.zh-CN.md)定义日常/调整双通道、草案讨论、人工最终确认和按影响裁剪的迁移流程

## 1. 产品定义

SpecCompass 是一套面向大模型协作的规格驱动开发控制系统。它要求产品意图先形成可审核的 PRD 和 Outline，再由确认后的项目边界驱动 Spec、Flow、UI、Plan、Tasks 和实现。系统的目标不是让模型一次生成更多内容，而是让需求、项目结构、审核决定和实现产物在多轮协作中保持稳定身份、明确权威和可验证的一致性。

## 2. 本轮问题

当前项目已经具备图形审核、机械写回、结构化 review data 和显式 feature 继承，但项目边界治理仍有一处根本矛盾：旧设计允许顶级 Outline 的项目划分与真实子项目长期处于 `merged`、`split`、`diverged` 或 `not_mapped`。这会让两个都具有长期指导意义的结构同时存在，模型无法可靠判断哪个结构指导后续开发，也无法在重大调整时完整追踪 PRD、Spec、Flow、UI 和代码影响。

本轮需要建立一个更严格的产品契约：

1. 模型或用户都可以发起 Outline 项目边界调整讨论；模型负责生成和分析候选，最终确认必须来自用户。
2. 确认后的权威 Outline 基线必须与真实 active 子项目一一对应。
3. Outline 项目边界节点与真实子项目共用稳定 `feature_code`。
4. 任何一侧的结构变化都必须先形成新的 Outline 提案，再完成跨产物迁移，最后一起切换为新基线。
5. 已完成开发的子项目只在重大业务变化下重构，非必要不得调整。

## 3. 权威模型

```text
用户输入、正式业务来源或模型发现的边界问题
          ↓
模型整理 Outline 候选与影响预览
          ↓
SP 边界检查 + 人工审核确认
          ↓
权威 Outline 基线
          ↓ 一一对应
真实子项目及稳定 feature_code
          ↓
PRD / Spec / Flow / UI / Plan / Tasks / 实现
```

Outline 中存在两类节点，不能混淆：

- **项目边界节点**：代表真实可交付子项目。确认后必须拥有 `feature_code`，并与一个 active feature 一一对应。
- **分析节点**：用于表达目标、能力、场景、业务链、约束或备选理解。它们使用独立稳定 `outline_node_id`，不创建 feature，也不要求与项目目录一一对应。

因此，“模型可以自由分析”和“项目结构必须稳定一致”并不冲突。模型可以先生成任意数量的分析节点和候选边界；只有通过 SP 边界检查和人工确认的项目边界才进入权威基线。

## 4. 产品原则

### 4.1 Outline 先行

- 新项目和重大需求变化必须先更新并确认 Outline，随后才能创建、拆分、合并、退役或重命名子项目。
- 子项目开发必须以当前权威 Outline 基线为上游，不得由目录、代码现状或临时实现反向偷偷定义产品边界。
- 项目侧提出的边界变化也必须先上推为 Outline 变更提案，不能先改目录再补文档。

### 4.2 稳定态一一对应

- `current_baseline` 中每个 active 项目边界节点必须对应一个 active feature，每个 active feature 也必须对应一个项目边界节点。
- 稳定态的 `outline_alignment.status` 只能是 `one_to_one`。
- `merged`、`split`、`diverged` 和 `not_mapped` 只允许出现在旧数据迁移、结构变更提案或迁移中的暂态记录，不得支持普通开发命令继续推进。
- 根项目 `000-*` 可以拥有组合级 Outline；其下首个项目 `001-*` 只有在显式 `parent_feature`、`sibling_order: 1` 和已确认 handoff 同时成立时才是第一个子项目。数字本身不推导继承。

### 4.3 稳定编码

- `feature_code` 是项目边界的全局稳定身份，Outline 项目边界节点、feature 目录、review index 和跨产物引用使用同一代码。
- 编码沿用 SP 的连续十进制形式：`000` 固定为顶级需求，新项目从 `001` 起全局递增，超过 `999` 后扩展为 `1000`。真实 feature 使用 `<feature_code>-<slug>`；数字不携带父子关系。
- `feature_code` 一经发布不得重编号、复用或交换；退役代码永久保留为 tombstone。
- `specs/feature-code-ledger.json` 保存所有已分配代码及 `reserved`、`active`、`retired`、`void` 状态。任何状态都占用代码，编号空缺不得回填。
- 新代码只在最终候选准备进入人工审核时预留，并绑定 `proposal_id` 和目标 slug。迁移启动必须核验该预留；拒绝、过期或激活前撤销的代码转为 `void`。
- 边界拆分时，原代码退役，每个拆分结果使用全新代码；边界合并时，所有原代码退役，合并结果使用全新代码。新边界通过 `predecessor_codes` 回链旧边界，tombstone 通过 `successor_codes` 指向新边界。不得选择其中一个旧代码代表语义已经变化的新边界。
- 展示顺序使用 `order`，同一父项下的顺序使用 `sibling_order`。调整顺序不得改变身份代码。
- 分析节点使用 `outline_node_id`，不得借用 `feature_code` 伪装成项目。
- 受 Outline 管理的新 feature 只能使用账本预留的连续代码，并把它显式传给 SP 创建脚本；时间戳只作为历史兼容格式，不再用于新的权威项目边界。

### 4.4 重大调整门禁

以下任一情况属于重大结构调整：

- 新增、拆分、合并、移动或退役项目边界；
- 改变项目所有权、核心业务结果、关键业务对象或命名 handoff；
- 使既有 Spec、Flow、UI、Plan、Tasks、实现或测试的责任归属失效；
- 改变 root/parent 关系或跨项目业务链。

文字修正、展示排序、分析节点重组以及不改变责任边界的说明补充不属于项目重构。模型必须先分类变更；证据不足时按重大调整处理并阻断自动推进。

已有实现的子项目进行重大调整时，必须说明业务必要性、替代方案、不调整的后果、迁移范围、回滚方案和人工批准。仅为了让导图更整齐、名称更一致、模块数量更均衡或模型更容易理解，不构成重构理由。

## 5. 结构变更生命周期

结构调整的发起、讨论与正式执行必须分开。模型或用户可以发起候选讨论，但候选草案不写入 `proposed_baseline`，不创建 active transition，也不改变 `ALIGNED`。只有用户确认一个身份固定、内容完整并绑定当前 baseline 的具体 proposal 后，系统才创建正式结构迁移并阻断普通写入。模型推荐、默认选项、浏览器草稿、下载文件或机械写回本身都不能作为最终确认。详细规则见 [SP Outline 项目边界调整工作流](sp-outline-boundary-adjustment-workflow.zh-CN.md)。

讨论期间可以继续日常开发。草案必须记录 base baseline；正式启动前发现 base 或影响范围变化时，重新生成影响预览。proposal 内容或关键影响范围改变后，旧确认失效，必须由用户重新确认。

系统采用双基线，避免文档先切换而项目尚未迁移的中间状态被误当成新事实：

- `current_baseline`：当前权威 Outline 与 active 子项目一致，可指导普通开发。
- `proposed_baseline`：已经提出或批准、但尚未完成所有项目和产物迁移的新结构。它不能替代当前开发基线。

schema v1 的内部机器状态固定为：

1. `ALIGNED`
2. `OUTLINE_CHANGE_PROPOSED`
3. `OUTLINE_CHANGE_APPROVED`
4. `PROJECT_RESTRUCTURE_STAGED`
5. `FLOW_UI_IMPACT_VALIDATED`
6. `CROSS_ARTIFACT_VALIDATED`

`ALIGNED_NEW_BASELINE` 只允许写入追加式迁移日志的 `transition_event`，不得写入 `transition_state`。该事件记录成功提交，提交完成后以新的 baseline ID 回到 `ALIGNED`。正常迁移之外还必须支持三个异常状态：`LEGACY_ADOPTION_REQUIRED`、`MIGRATION_BLOCKED` 和 `ROLLBACK_REQUIRED`。异常状态不得被普通开发命令自动清除。

未确认草案不进入上述状态机，仍保持 `ALIGNED`。为兼容 schema v1，`OUTLINE_CHANGE_PROPOSED` 表示有效人工 decision 已验证、active proposal 已持久化但一次性 receipt 尚未记入 consumed ledger；`OUTLINE_CHANGE_APPROVED` 表示 receipt 已消费并允许进入 inventory/staging。两步由同一启动命令在一把短锁内连续执行，中断后只允许以相同 identity 幂等前滚。用户界面只显示派生状态：五个迁移中间状态统一显示为 `MIGRATION_ACTIVE`，两个异常状态保持原名，`LEGACY_ADOPTION_REQUIRED` 显示为独立的 `SETUP_REQUIRED`。显示状态不得回写 `transition_state`。

只有完成 `CROSS_ARTIFACT_VALIDATED` 并记录 `ALIGNED_NEW_BASELINE` 提交事件后，普通开发命令才能使用新结构。切换采用比较并交换语义：提交时的 `base_baseline_id` 与 `base_baseline_digest` 必须仍等于当前权威基线，否则视为并发冲突并进入 `MIGRATION_BLOCKED`。重新基于最新基线生成 proposal 后，所有 source digest 已变化的批准和影响证据自动失效，必须重新评估。任何失败都保留 `current_baseline`，并使 `proposed_baseline` 进入可诊断、可重试或可撤销状态；不能留下半切换的 active 结构。

每个 root 同时只允许一个 active `proposed_baseline`。MVP 把 proposal 视为不可变对象，`transition_revision` 固定绑定该 proposal；任何内容变化都创建新的 proposal ID，而不是并发改写同一 revision。每次迁移使用全局唯一 `transition_id` 和追加式迁移日志，逐步记录输入 digest、完成步骤、实际写集、检查结果和下一恢复动作。进程中断后，命令只能依据 boundaries、manifest、publication receipt 和日志恢复或进入 `ROLLBACK_REQUIRED`，不能依赖模型猜测已完成范围。

迁移锁采用租约，不是永久文件锁。每条机械命令单独获取、刷新和释放锁；人工讨论、审核等待和两条独立命令之间不得持锁。schema v1 的结构迁移命令锁保留默认 300 秒租约，单条命令运行超过 30 秒时至少每 30 秒刷新一次 `heartbeat_at`；feature-code ledger 可以使用更短租约，但锁内 Git 扫描必须有超时，保存前必须刷新租约并再次验证 owner。后继进程只有在当前时间超过 `lease_expires_at` 后，才能通过固定路径 `<lock>.recovery` 的原子 exclusive create 建立唯一 recovery claim；创建后必须重新读取并确认完整 observed claim 没有变化，才可以接管。任一字段已变化就放弃接管，不能直接 `rename` 一个只在接管前读取过的锁。`wx` 打开与 JSON 写完之间存在极短可见窗口，读取者必须有限重读；持续为空、截断或不可解析时按损坏锁 fail closed 并保留现场，绝不能据此判断锁已过期。start、feature-code ledger、activation finalization、rollback finalization 和结构迁移命令锁都遵守同一规则。

Recovery claim 本身不能使用带随机后缀的并行路径，否则多个恢复者仍可同时成功；固定 recovery claim 如果因崩溃残留，自动命令必须 fail closed，保留现场并给出只删除已核实孤儿 claim 的恢复路线，不能递归用另一轮无保护 rename 猜测清理。Heartbeat 必须绑定已打开并核对过的原 claim 文件，不能用路径级原子替换覆盖锁；即使旧进程在租约检查后暂停并于接管后恢复，也只能更新旧文件实体，随后因路径 owner 已变化而失败。释放主锁或 recovery claim 前必须重新核对 owner。`ENOENT` 可以视为已经释放；Windows 上的 `EPERM`、`EACCES`、`EBUSY` 使用有限退避重试，主锁最终仍无法删除时命令必须报告失败和恢复路径，不能按成功静默退出。exclusive create 写入失败后的 claim 清理同样不得静默；如果清理失败，必须同时报告原始错误和清理错误。仅隔离后的唯一 `.stale` 文件清理失败可以降级为 warning。锁携带随机 `owner_id`、基线 digest、创建时间、心跳时间和租约到期时间，PID 只作本机诊断，不作为跨系统接管依据。跨人工等待的一致性由 proposal/base/impact digest 和提交前 CAS 保证。

物理项目重构必须在 transition 专属的隔离 staging workspace、受控分支或等价可回收区域中完成，并在切换前产生文件级迁移清单。自动废弃只允许删除 manifest 明确拥有并经过路径边界检查的 staging 内容，同时保留迁移审计记录。真实工作区一旦被修改，只有在机械证明当前内容仍与 manifest 完全匹配且不会覆盖用户改动时才能撤销；否则进入 `ROLLBACK_REQUIRED` 并保留现场。不得自动运行 `git reset --hard`、`git clean`、`git stash`、`git restore` 或模型临时推导的反向修改。

## 6. 跨产物影响合同

结构调整必须逐项评估以下产物：

- PRD 与 `Subproject Handoff`
- `spec-outline.md` 与 `spec.md`
- Flow、状态、角色、异常和跨项目交接
- UI screen、section、action、权限和状态
- Plan、Tasks、workset 和依赖
- API、数据、事件、迁移和实现代码
- 测试、验收、trace、memory 和 open items

每个受影响 Flow/UI 对象必须选择一个结果：

- `UNCHANGED_WITH_EVIDENCE`
- `REGENERATE`
- `MIGRATE`
- `RETIRE`
- `BLOCKED`

`UNCHANGED_WITH_EVIDENCE` 必须引用仍然成立的来源、边界和验证证据，不能只写“无需修改”。存在 `BLOCKED`、遗漏产物、悬空引用、重复 owner 或无法验证的迁移时，不得切换基线。

每个 inventoried artifact 都必须记录 reassignment 和 impact outcome。明确 evidence record 至少用于所有 `UNCHANGED_WITH_EVIDENCE`、人工判断和高风险结论。`MIGRATE`、`REGENERATE` 与 `RETIRE` 可以由合并的 validation report 记录 manifest 操作、结果摘要和检查结果，不要求每个文件单独生成 receipt，但不得省略该 artifact 的处理结果。

拆分、合并、移动或退役提案还必须包含逐产物 `artifact_reassignment`：每个既有 PRD/Spec/Flow/UI/Plan/Task/实现/测试对象都明确指向一个 successor feature、进入共享资产清单、退役，或标记 `BLOCKED`。系统不得按文件路径、名称相似度或“主要职责”自动猜默认继承者。

影响证据使用机器可校验结构，至少包含 `evidence_type`、`ref`、`source_digest`、`verified_at`、`verifier` 和 `result`。`evidence_type` 是封闭枚举，只允许 `test_pass`、`contract_check`、`hash_match`、`source_trace`、`human_approval`；未知值必须 fail closed，新增类型只能通过 schema 版本升级。引用不存在、digest 不匹配、验证时间早于当前 proposed baseline，或只有占位文字的 `UNCHANGED_WITH_EVIDENCE` 一律按 `BLOCKED` 处理。

## 7. 机器可读合同

当前实现使用以下权威 Outline 边界清单：

```text
specs/<root-feature>/outline-boundaries.json
```

最小字段包括：

```json
{
  "schema_version": 1,
  "current_baseline_id": "baseline-...",
  "proposed_baseline_id": null,
  "transition_state": "ALIGNED",
  "project_boundaries": [
    {
      "feature_code": "001",
      "feature": "001-example",
      "parent_feature_code": "000",
      "sibling_order": 1,
      "outline_node_id": "boundary-001",
      "lifecycle": "active"
    }
  ]
}
```

现有 schema v1 的字段和枚举不得被新设计静默改义。新的 draft proposal、impact preview、decision 和 writer ledger 使用各自封闭的版本化 schema；如果需要改变 `outline-boundaries.json` 的字段、状态枚举或语义，必须升级 schema version 并通过显式 migrator 迁移。所有 schema 在每层对象使用 `additionalProperties: false`，validator 对未知版本 fail closed。`review-index.json` 继续承担审核导航与 review availability，但在 `ALIGNED` 状态下必须与权威边界清单双向一致，不能成为第二套边界事实源。

`outline-boundaries.json` 是项目边界身份、标题、父子关系、生命周期和 baseline 状态的唯一写入事实源。`review-index.json` 中的 `project`、`hierarchy`、`order`、`feature_code`、`feature`、`title`、`parent_feature`、`sibling_order`、`boundary_source` 和 `outline_alignment` 只能由它单向派生。普通命令只能直接维护 `updated_at` 和四个 review availability 字段：`has_flow_review`、`has_ui_review`、`has_outline_review`、`has_outline_discovery`。任何直接修改派生字段、派生 digest 不一致或无法找到权威 root 清单的变更都必须被 validator 和 CI 拒绝；默认修复路线是从当前权威 boundaries 重建派生字段，同时保留四个 availability 字段。

`feature-code-ledger.json` 是代码分配历史的唯一写入事实源，但不是第二套项目边界清单。分配器使用短锁和原子替换，在取号时同时检查账本、current baseline、tombstone、spec 目录和可见 Git refs。多个离线副本发生同号预留或账本/base digest 冲突时必须停止并重新分配，不能自动合并。baseline 仍决定项目是否 active 或 retired；账本保证任何出现过的代码以后都不会再次发放。

跨文件迁移使用隔离 staging 和单一权威提交点，不宣称文件系统提供跨文件原子事务。`prepare-outline-transition-artifacts.mjs` 根据 closed plan、inventory 和 evidence 生成 canonical manifest，并验证 source/staged digest 与路径边界；`publish-outline-transition-artifacts.mjs` 为每个 move/rewrite/retire 保存 transition 专属恢复副本，逐操作更新 receipt，重复执行时按 digest 识别已完成操作。产物已经发布但 `outline-boundaries.json` 尚未提交时，整个 root 的普通写入继续阻断，只允许依据 manifest 前滚完成。`outline-boundaries.json` 通过同目录原子替换后，新 baseline 生效，receipt 更新为 `BASELINE_COMMITTED`，再前滚重建 `review-index.json`、feature-code ledger 和完成日志。迁移日志明确区分 `ARTIFACTS_STAGED`、`ARTIFACTS_PUBLISHED`、`BASELINE_ACTIVATION_PREPARED` 和 `ALIGNED_NEW_BASELINE`。普通命令检测到 active transition、已发布未提交状态或派生不一致时必须阻断。

每个 root 的 active proposal 必须记录 `base_baseline_id`、`base_baseline_digest`、`proposal_digest`、`transition_id` 和 `transition_revision`。Git 分支或其他离线工作副本可以各自形成提案，但合并时只要 base digest 不再等于目标分支的 current digest，就不得自动合并或按字段拼接，必须 rebase 后重新运行影响评估并重新批准受影响决定。

存量项目不能通过扫描目录直接晋升为权威 Outline。首次升级进入 `LEGACY_ADOPTION_REQUIRED`：工具可以只读扫描现有 feature、handoff 和 review index 生成候选清单，但必须报告无来源、重复代码、无法确定 parent、孤立产物和暂态映射，经 `/sp.prd` 审核确认并通过一致性检查后才建立首个 `ALIGNED` baseline。

## 8. 命令行为

未确认 draft 不影响普通命令。正式 active transition 创建后，MVP 对该 root 的所有普通写入实行冻结，不区分是否看起来与本次迁移无关；只读诊断和绑定 active transition 的迁移 workset 可以运行。精细到 feature 的并发冻结属于后续优化，不得在 MVP 中由模型自行判断。

- `/sp.prd`：接受模型或用户发起 Outline 边界讨论，负责候选生成、影响预览、重大调整分类和人工最终确认消费。草案讨论保持 `ALIGNED`；只有人工确认具体 proposal 后才建立正式 `proposed_baseline`。已存在下游产物时，必须先扫描影响再允许批准。
- `/sp.specify`：只消费 `ALIGNED` 的当前基线；存在未完成结构迁移时阻断普通稳定化。
- `/sp.flow`、`/sp.ui`：只在当前对齐边界内生成或修复；结构迁移时按影响合同处理并输出显式结果。
- `/sp.plan`、`/sp.tasks`：不得为尚未完成基线切换的新边界安排普通实现工作，只能生成明确标记的迁移 workset。
- `/sp.analyze`、`/sp.gate`：检查双索引一致性、跨产物闭包、悬空引用、重复归属、旧代码复用和未完成迁移。
- `/sp.implement`：只能执行已通过 gate 的当前基线任务或结构迁移任务，不能自行改变项目边界。

所有因结构状态而阻断的命令必须输出同一机器合同：`block_reason`、`root_feature`、`current_baseline_id`、`proposed_baseline_id`、`transition_state`、`transition_id`、`blocked_since`、`evidence_refs`、`repair_command_exec` 和 `repair_command`。`repair_command_exec` 只含可解析命令，`repair_command` 是带必要参数和中文提示、可直接执行的唯一恢复路线；禁止只写“先修复迁移”或给出多个互相冲突的下一步。

## 9. 图形审核与写回

当前已实现并必须保留的审核基线：

- Flow、UI、正式 Outline 和 Outline Discovery 共用固定 renderer 与受限 `127.0.0.1` launcher。
- 页面只允许从 launcher 短 URL 自动加载绑定的 review data；不再显示“加载 Flow”“加载 UI”“加载 Outline”“选择文件”等手动入口，也不接受 inline data。
- 主操作是“写入项目”。loopback writer 只把完整结构化决定机械记录到固定 confirmation 或 pending 文件，不调用模型、不解释人工意见、不修改 PRD/Flow/UI，也不生成新一轮 review data。
- 项目边界最终确认只能由绑定人工审核会话的 loopback writer 写入固定 `decision.json`；writer 从服务端会话注入 proposal/base/impact identity、request/session ID、时间和一次性 receipt，并同步追加 writeback ledger。单独出现 `confirmed_by.type: human`、模型生成文件或缺少 ledger 记录不能授权迁移。当前运行环境无法提供可信人工来源时必须 fail closed。
- 用户在聊天中表达确认只能触发最终确认页面，不能由模型转写成 decision。只有宿主未来提供不可由模型伪造的 user-message receipt 时，才可增加等价的机械确认适配器。
- 用户写回后返回 Codex，重新运行拥有该产物的 `/sp.prd`、`/sp.flow` 或 `/sp.ui`。只有这次模型运行可以读取决定和审核意见、执行有针对性的推理与重生成。
- 下载 confirmation package 只在本地写回失败且 launcher 明确允许降级时出现；复制摘要是写回和下载都不可用时的最后降级。
- 降级包必须携带 `package_session_id`、随机 nonce、`review_data_id`、当前 baseline ID/digest、source digest、目标 identity 和生成时间。消费命令把 package identity 写入追加式 consumed ledger；相同 nonce/session 重放、baseline 或 source 已变化、目标 identity 不匹配时拒绝消费。离线降级不能依赖 launcher 退出后无法验证的临时 HMAC 密钥。
- 浏览器状态、localStorage、页面完成、机械写回和下载本身都不是下游授权；权威命令必须重新校验 identity、digest、来源和 confirmation。
- 一页只有“运行分析”和少量固定分类时，分类操作直接平铺；只有分类各自拥有长期独立内容与状态时才使用 tabs。

## 10. 跨系统稳健性

审核与结构迁移机制必须在 macOS、Linux 和 Windows 的常见文件系统行为下 fail closed：

- 路径由 launcher 和 schema 推导，不接受客户端选择任意仓库路径；
- 写入使用同目录临时文件、刷盘和原子替换，并保留原文件权限；
- 并发写入使用具备所有权身份的锁，错误进程不能删除后来者的锁；
- schema 与运行时 validator 必须同样拒绝额外字段、未知枚举和不完整语义；
- renderer、launcher 和正式 validator 对同一合同采用一致的严格度；
- Node.js 缺失、端口占用、浏览器限制、只读目录、权限失败、锁冲突、旧 schema 和中断写入都必须给出可恢复诊断，不能静默丢失审核结果；
- 降级下载必须包含完整 identity、目标和重放保护信息，重新消费时仍按相同合同验证。
- schema 内的仓库路径统一使用 POSIX 风格相对路径；平台适配层负责 Windows 分隔符、盘符、大小写和长路径处理。绝对路径、`..` 逃逸、符号链接越界和大小写归一化后重复的目标必须拒绝。

## 11. 当前实现基线与差距

| 能力 | 2026-07-28 状态 | 要求 |
|---|---|---|
| 机械本地写回与降级下载 | 已实现 | 保持并继续做跨平台回归 |
| 移除手动加载入口、只允许 launcher 自动加载 | 已实现 | 保持 Flow/UI/Outline/Discovery 一致 |
| `000 › 001` 显式继承导航 | 已实现 | 继续以 parent/handoff 为准，不从编号推断 |
| `review-index.json` schema v2 | 已实现并加固 | 保持 validator、权限和多消费者合同同步 |
| 短分析分类平铺 | 已写入 UI 命令和方法论 | 增加生成行为测试，不只检查提示词 |
| Outline 与 active feature 稳定态一一对应 | 合同与门禁已实现 | 在真实项目迁移中继续验证数据质量 |
| `outline-boundaries.json` 权威合同 | 已实现 | schema、运行时 validator、派生同步和共享门禁已落地 |
| SP 连续编码与永久分配账本 | 已实现 | 已接入预留、并发短锁、作废不复用、迁移启动校验、baseline 激活/撤销对账和显式 `--number` 创建 |
| 双基线与结构迁移状态机 | 已实现 | 草案保持 `ALIGNED`；只有 loopback writer 的人工决定才能启动；每条命令独立持有短锁 |
| 跨产物影响闭包和回滚 | 已实现受控发布链 | inventory 动态检查 Flow/UI；物理变化使用 manifest、恢复副本、可重放 publication receipt 和提交前重验 |
| 存量项目权威边界接入 | 候选生成已实现 | 仍需人工确认后建立首个权威基线 |
| 多分支并发与中断恢复 | 已实现并加固 | base digest CAS、固定 recovery sidecar、owner 二次核对、Windows 删除重试、单命令短锁、staged/published/committed 三阶段和故障重试已覆盖；多人共改同一 proposal 延后 |

## 12. 验收标准

1. 在 `ALIGNED` 状态下，权威 Outline 的每个 active 项目边界与 active feature 双向一一对应，代码一致且无重复。
2. 分析节点可以自由增删和重排，且不会创建、删除或重编号 feature。
3. 任何项目数量、code、parent、slug、handoff、owner、生命周期、历史关系或既有产物归属变化，都必须经过人工最终确认和重大迁移；检查根据真实 inventory 执行，没有相关产物时可以有理由地跳过 Flow/UI 检查。
4. 任一普通命令遇到未完成结构迁移、暂态映射、悬空引用或 validator 不一致时都会阻断并给出唯一修复路由。
5. 写回成功后无需人工复制或下载；写回失败时仍可通过受约束下载恢复，且不会绕过模型消费和授权检查。
6. Flow、UI、Outline 和 Discovery 在桌面与移动端均不出现旧手动加载入口，自动加载、导航、写回和降级无布局重叠。
7. macOS、Linux、Windows 的迁移和写回测试覆盖权限保持、原子替换、锁竞争、中断恢复、只读失败、旧 schema、未知字段和重放。
8. 两个分支基于同一 current baseline 提出不同结构变化时，后合并者因 base digest 过期而阻断，不能自动拼接边界文件。
9. 拆分或合并不会复用旧代码；每个旧代码 tombstone、successor/predecessor 关系和既有产物都有可验证去向。
10. 任何迁移步骤中断后都能依据 transition 日志识别发布前、产物已发布未提交或 baseline 已提交，并给出唯一恢复路线；恢复不会覆盖用户未提交改动。
11. 模型或手写 JSON 不能产生人工最终确认；只有 writer ledger、一次性 receipt 和 proposal/base/impact identity 全部匹配时才允许启动迁移。
12. 未确认 draft 保持 `ALIGNED`；active transition 创建后整个 root 的普通写入都被阻断。
13. 本机并发预留、项目目录删除、proposal 作废、项目退役和编号超过 `999` 都不会造成代码复用；离线副本冲突会 fail closed。
14. 新增边界只有在 proposal 中携带匹配的预留代码才能启动迁移；激活和撤销会把预留状态分别更新为 `active` 或 `void`。
15. 两个进程同时观察到同一个过期锁时，只有固定 recovery claim 的唯一 owner 可以接管；后来者不能移走先行恢复者刚创建的新锁，也不能重复分配代码或重复消费人工 receipt。
16. 主锁或 recovery claim 在 Windows 文件占用下删除失败时会有限重试；最终失败必须留下明确诊断和恢复路线，不能让残留锁在无提示状态下阻塞日常 SP。

## 13. 非目标

- 不让 renderer 直接调用模型或直接修改正式 PRD、Flow、UI。
- 不把所有 Outline 分析节点都变成项目。
- 不因 Outline 展示需要自动重构已完成子项目。
- 不用连续编号表达继承，也不为视觉顺序重编号 feature。
- 不允许项目目录、review index 和 Outline 各自成为独立边界事实源。

## 14. 发布约束

本需求按以下统一顺序实现，当前 1-5 已落地并由定向测试覆盖：

1. 统一 `review-index` 权限和公共边界门禁，补齐 `/sp.implement`，让普通写命令使用同一 fail-closed 快检。
2. 建立 `feature-code-ledger.json` 和跨平台机械分配器，把预留、迁移启动、baseline 激活、撤销和显式 `--number` 创建串起来。
3. 增加 draft 与 active transition 区分、writer/ledger 人工确认来源，以及 `NONE / METADATA / STRUCTURAL` 机械分类。
4. 明确 schema v1 内部状态到用户状态的映射，让锁按单条命令持有，并按真实 inventory 动态执行 Flow/UI 等检查。
5. 修复 code/tombstone、权威 inventory、三阶段发布记录、激活重验、非破坏性 rollback 和 CAS。
6. 后续再评估多人并发 revision、永久 artifact registry 和精细 feature 冻结；任何权威合同变化都升级 schema version 并提供 migrator。

每一阶段必须有迁移兼容、失败恢复、定向测试和完整回归证据，不能仅更新文案后宣称产品能力完成。
