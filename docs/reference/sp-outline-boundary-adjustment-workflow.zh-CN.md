# SP Outline 项目边界调整工作流

## 文档状态

- 文档类型：项目边界调整的详细设计与实施约束
- 当前版本：2026-07-29
- 审核状态：Claude Opus 4.8 与 Gemini 3.1 Pro 于 2026-07-28 给出 `CONDITIONAL_PASS`；本文已补齐人工确认来源、状态映射、锁生命周期、轻量调整白名单、root 冻结、stale 检查和非破坏性恢复约束
- 适用范围：Outline 项目边界、真实子项目、稳定 `feature_code` 以及相关 PRD、Spec、Flow、UI、Plan、Tasks、代码和测试
- 上位需求：[SpecCompass 产品需求文档](speccompass-product-requirements.zh-CN.md)
- 核心目标：把少量、重大、低频的项目结构调整与日常开发分开，既不放松结构安全，也不让普通工作承担迁移流程的复杂度

## 1. 核心结论

项目拆分、合并或其他边界调整可以由模型发起，也可以由用户发起：

- **模型发起**：模型发现一个项目承担了多个独立业务结果、职责互相冲突，或者现有边界已经无法指导开发，可以提出调整建议和候选方案。
- **用户发起**：用户可以直接要求讨论拆分、合并、增加、退役、移动或重新划分项目，模型负责整理方案、影响和风险。
- **最终确认**：无论由谁发起，最终确认都必须来自用户。模型的推荐、评分、分析结论、默认选项或“我认为可以执行”都不能代替用户确认。

发起讨论不等于开始调整。候选方案还在讨论时，当前权威基线保持 `ALIGNED`，日常开发继续。只有用户看过一个身份固定、内容完整的方案，并明确确认“按这个方案开始结构调整”，系统才创建正式迁移并阻断普通写入。

## 2. 权限边界

### 2.1 模型可以做什么

模型可以：

- 发现潜在的项目边界问题；
- 解释为什么可能需要拆分、合并、移动或退役；
- 生成一个或多个候选方案；
- 比较继续保持现状与调整结构的代价；
- 扫描可能受影响的文档、流程、界面、任务和代码；
- 根据用户意见修改草案；
- 在用户确认后，调用机械工具执行已经批准的调整步骤。

### 2.2 模型不能做什么

模型不能：

- 把自己的推荐写成 `USER_CONFIRMED`、`APPROVED` 或同等授权状态；
- 因为用户没有反对，就推断用户已经同意；
- 把点击预览、保存浏览器草稿、下载文件或机械写回本身视为调整授权；
- 在方案身份、边界、影响范围尚未固定时启动正式迁移；
- 在用户只要求“讨论”“分析”“给方案”时冻结日常开发；
- 修改已确认方案后继续沿用旧确认记录。

### 2.3 用户确认必须确认什么

最终确认必须绑定一个确定方案，而不是一句泛泛的“可以拆”。确认记录至少包含：

- `proposal_id` 与 `proposal_digest`；
- 当前 `base_baseline_id` 与 `base_baseline_digest`；
- 发起方是 `model` 还是 `user`；
- 调整类型和受影响项目；
- 用户决定：`CONFIRMED`、`REJECTED` 或 `NEEDS_REVISION`；
- 确认人、确认时间和确认来源。

`confirmed_by.type` 必须是 `human`，但这个字段本身不构成证明。正式 `decision.json` 只能由绑定当前审核会话的 loopback writer 写入固定目标。writer 必须从服务端会话注入 `writeback_request_id`、`review_session_id`、`proposal_id`、`proposal_digest`、`base_baseline_id`、`base_baseline_digest`、`impact_preview_digest`、`recorded_at` 和一次性 receipt，并把相同身份写入只追加的 writeback ledger。浏览器提交内容不能覆盖这些字段，也不能选择目标路径。

启动正式调整时，消费工具必须同时验证固定目标文件、writer 注入字段、ledger 记录、一次性 receipt、proposal/base/impact identity 和尚未消费状态。手写文件、模型直接生成的 JSON、缺少 ledger 记录、重复 receipt 或来源标记为 `model` 的记录全部 fail closed。机械写回工具只记录用户选择，不调用模型、不解释意见、不修改方案。下一次 Codex 运行只能消费已经通过这些检查的决定，不能自行补齐人工确认字段。

这是受支持工作流内的来源保证，不宣称能抵抗一个同时拥有任意文件写权限、浏览器自动化权限和本机进程控制权的恶意程序。模型在最终确认阶段不得调用审核页面的确认动作、loopback 确认端点或伪造 ledger。如果当前运行环境不能提供可信的人工交互来源，系统必须保持 `ALIGNED` 并要求用户回到受支持的审核页面，不能降级为模型代写确认。

如果用户最初直接说“把 A 拆成 B 和 C”，这属于用户发起。模型仍需先生成可审核的具体方案和影响预览。用户在聊天中引用方案并说“确认”，表示要求进入最终确认步骤；在当前受支持实现中，仍需由用户本人在绑定该 proposal identity 的审核页面完成确认写回。模型不能把聊天文本转换成 `decision.json`。未来如果宿主提供不可由模型伪造的 user-message receipt，可以增加另一种机械确认适配器，但不能只相信模型转述的消息内容。

## 3. 两条用户通道

### 3.1 日常工作通道

日常通道处理当前项目边界内的普通工作，例如：

- 修改 PRD、Spec、Flow、UI、Plan、Tasks；
- 开发和修复当前 feature 的代码与测试；
- 增删普通 Outline 分析节点；
- 调整说明文字、图形布局或不影响项目身份的展示内容。

日常命令只运行一次公共、只读、静默的边界检查：

1. 当前基线仍为 `ALIGNED`；
2. 当前 feature 属于权威基线；
3. 没有已经正式开始的边界迁移；
4. 派生的 `review-index.json` 与当前基线一致。

检查通过后直接继续。日常通道不创建 proposal、inventory、receipt、迁移日志或锁，不扫描全部项目文件，也不要求用户理解迁移状态。

所有会写 feature 文档或代码的命令必须使用同一个公共门禁，包括 `/sp.implement`。这项检查应放入公共 prerequisites，避免在每个命令模板中重复整套迁移说明。

### 3.2 项目边界调整通道

调整通道只在用户明确确认后进入。推荐流程是：

```text
模型或用户发起
        ↓
生成草案与影响预览
        ↓
用户与模型讨论、修改草案
        ↓
形成身份固定的最终候选方案
        ↓
用户最终确认
        ↓
创建正式调整并阻断普通写入
        ↓
执行轻量调整或重大迁移
        ↓
激活新基线，回到日常工作
```

草案讨论期间不得写入 `proposed_baseline`，不得创建 active transition，也不得改变 `ALIGNED`。草案及影响预览必须记录 base baseline、被扫描的产物集合摘要、每个来源摘要和 `impact_preview_digest`。日常工作可以继续，因此草案天然可能过期。

审核页写回前要检查 proposal/base/impact identity；下一次 `/sp.prd` 消费决定时必须重新运行同一权威扫描并再次比较。base baseline、proposal 内容、产物集合、任一来源摘要或关键影响分类只要发生变化，就把决定标记为 `STALE`，保持 `ALIGNED`，重新生成预览并要求用户重新确认。不能只提示 warning 后继续，也不能让模型判断变化“应该没关系”。

正式迁移启动后，MVP 采用 root 级普通写入冻结。只冻结受影响 feature 的精细并发控制可以以后再做，避免第一版引入复杂的跨项目依赖判断。

## 4. 三类变化

用户只看到“日常工作”和“边界调整”两条通道。调整通道内部按影响分成轻量调整和重大迁移。

| 变化 | 处理方式 | 是否要求最终用户确认 |
|---|---|---|
| 当前项目内修改 PRD、Spec、Flow、UI、代码或测试 | 日常工作 | 否，沿用对应产物原有审核规则 |
| 普通分析节点、说明文字、图形布局变化 | 日常工作 | 否，只要不改变项目边界 |
| 项目显示标题、说明、展示顺序变化 | 轻量调整 | 是 |
| 新增项目，即使暂时没有下游产物 | 重大迁移 | 是，同时确认新 code、parent 和 handoff；无关检查可按 inventory 跳过 |
| split、merge、reparent、retire | 重大迁移 | 是 |
| 更改 feature slug、移动项目目录 | 重大迁移 | 是 |
| 改变项目 owner、核心业务对象、核心业务结果或关键 handoff | 重大迁移 | 是 |
| 把任何既有产物转移给其他项目 | 重大迁移 | 是 |
| 无法判断是否改变项目边界 | 只生成影响预览 | 用户决定是否进入调整 |

不能按文件数量或百分比判断是否重大。移动一个核心 PRD、改变一个项目 owner，或者调整一个关键 handoff，即使只涉及一个文件，也属于重大迁移。

轻量与重大调整由字段差异和权威扫描共同判定，不以模型的自然语言结论为准。任何项目数量、active code 集合、parent、feature slug、Outline 项目节点、handoff、owner、生命周期、predecessor/successor 或既有产物归属变化，都必须进入重大迁移。无法机械证明只改了允许字段时，也按重大迁移处理。

## 5. 轻量元数据调整

轻量调整只允许修改以下展示元数据：`title`、全局 `order`，以及 parent 不变时的 `sibling_order`。工具必须逐字段比较前后基线；除这些白名单字段、baseline 身份、创建信息和 digest 外，其他字段必须逐字节不变。新增或删除项目、改变项目含义、修改 parent、slug、handoff、owner、Outline 项目节点、生命周期、历史关系或产物归属，都不属于轻量调整。

轻量调整仍需要用户确认具体 proposal，但不需要完整文件 inventory、staging manifest 或 Flow/UI 影响阶段。标题修改只改变展示名称；如果用户或模型想借标题修改改变项目职责，必须重新建立重大迁移方案。

最小步骤：

1. 生成不可变候选方案；
2. 校验允许字段白名单，并证明所有结构字段和产物归属未变化；
3. 用户确认具体 proposal digest；
4. 重新确认 current baseline digest 未变化；
5. 原子更新权威基线并重建派生索引；
6. 写入简洁的激活日志。

只要字段 diff 超出白名单、权威扫描发现产物归属变化，或影响范围无法确定，立即停止轻量调整，保持 `ALIGNED`，重新生成重大迁移方案并要求用户确认。不能在后台自动升级并继续执行，也不能沿用轻量方案的确认记录。

## 6. 编码延续与分配

项目边界代码沿用 SP 原生 feature 编号形式：`000` 固定为顶级需求，后续代码使用 `001`、`002`、`003` 这样的十进制全局序列，超过 `999` 后自然扩展为 `1000`。真实 feature 继续使用 `<feature_code>-<slug>` 目录和分支名称。`feature_code` 同时写入确认后的 Outline 项目边界、feature、review index 和跨产物引用，不再建立第二套项目代码。

代码只表示长期身份，不编码父子关系和显示位置。`parent_feature_code` 表示继承，`sibling_order` 表示同级位置，`order` 表示全局导航顺序。reparent、标题调整和顺序调整都不得改变既有 `feature_code`。不能改成 `001.001` 等层级号码，否则项目移动会迫使所有下游引用重编号。

仓库级 `specs/feature-code-ledger.json` 是代码分配账本。它记录 `reserved`、`active`、`retired` 和 `void` 四种状态，并保存下一可分配十进制序号。分配器计算新代码时必须同时考虑账本、当前 baseline、tombstone、现有 spec 目录和可见 Git refs；任何已经观察或分配过的代码都不能再次发放。账本只负责身份分配历史，项目边界和生命周期仍以 `outline-boundaries.json` 的 current baseline 为准。

代码只在候选方案已经完整、准备进入最终人工审核时预留，不能在模型刚提出拆分建议时占号。预留项必须绑定 `proposal_id` 和目标 feature slug，并出现在用户最终确认的 proposal 中。确认后的迁移启动工具核验预留记录；没有预留、预留属于其他 proposal、slug 不匹配或尝试新发时间戳代码时一律拒绝。proposal 被拒绝、过期或在激活前撤销时，预留代码转为 `void`，保留记录但不复用。

激活新 baseline 后，新代码转为 `active`，被退役代码转为 `retired`。拆分时原代码退役，每个 successor 使用新代码；合并时所有 predecessor 退役，合并结果使用新代码。tombstone、`predecessor_codes` 和 `successor_codes` 继续记录语义继承。只改变目录 slug、parent 或 owner 而项目身份没有变化时，经过重大迁移后保留原代码。

本机并发由分配器的短租约 exclusive lock 和同目录原子替换处理。多个离线工作副本无法只靠文件锁实现全局原子取号，因此最终迁移仍必须通过 current baseline digest 和 Git 合并冲突检查：发现同号预留、账本版本过期或 base digest 过期时 fail closed，重新同步后分配新号，不自动选择某一份记录。编号出现空缺是正常审计结果，不得为追求连续显示而补洞。

现有 SP 的 `create-new-feature` 继续承担目录和分支创建，但在受 Outline 管理的项目中必须显式传入账本已经预留的 `--number`，不得再由脚本扫描后自行猜号。历史时间戳 feature 可以在存量接入时保留为不可变代码；新的权威 Outline 项目只分配连续十进制代码。

## 7. 重大迁移

重大迁移保留严格检查，但这些复杂机制只在调整通道运行。

必须保留：

- current→proposal 的 code、tombstone、split/merge 历史校验；
- proposal、用户确认和当前 baseline 的身份绑定；
- 由工具重新扫描受影响产物，不能相信手填空清单；
- 物理文件发生移动或改写时使用隔离 staging；
- 根据真实 inventory 决定是否运行 Flow、UI、代码和测试检查；
- 激活前重新扫描、重新计算摘要并执行最后一次比较更新；
- `ROLLBACK_REQUIRED` 只能回滚或生成新的前向恢复方案，不能经 `block → resume` 绕过；
- 激活失败时 current baseline 保持不变。

不再把 Flow/UI 写成每次必走的固定状态。没有 Flow 或 UI 产物时，不生成空证明。可以把多个内部检查合并为一份 `validation-report.json`，其中记录执行过、跳过及阻断的检查和原因。

每个 inventoried artifact 仍必须有 reassignment 和 impact outcome。`UNCHANGED_WITH_EVIDENCE` 无论风险高低都必须提供匹配当前来源摘要的明确证据；人工判断和高风险结论也必须有明确证据。`MIGRATE`、`REGENERATE` 和 `RETIRE` 可以由合并后的 validation report 记录 manifest 操作、结果摘要和检查结果，不要求为每个文件再创建一份独立 receipt。

### 7.1 发布与崩溃恢复

物理文件变化必须先在 transition 专属隔离区完成，不能在讨论或审核期间修改真实工作区。验证完成后，正式发布由短锁保护，并明确区分三个阶段：

1. **发布前**：尚未修改真实工作区，可以安全废弃隔离 staging，current baseline 不变。
2. **产物已经发布、baseline 尚未提交**：所有普通写入继续冻结。恢复程序只能依据已验证 manifest 完成前滚，或者在能够机械证明不会覆盖用户改动时撤销本次发布；不能假定“旧 baseline 还在”就代表项目仍然完整。无法证明安全时进入 `ROLLBACK_REQUIRED`。
3. **`outline-boundaries.json` 已完成原子提交**：新 baseline 已生效，只允许前滚重建 `review-index.json` 等派生文件和完成日志，不得直接恢复旧 baseline。

`outline-boundaries.json` 仍是权威基线的唯一提交点，但它不能让跨文件系统操作凭空变成原子事务。迁移日志和 manifest 必须能识别上述三个阶段。普通命令在 active transition、产物已发布未提交或派生不一致时全部 fail closed。

### 7.2 存量项目首次接入

存量接入不是日常调整，也不是结构迁移。缺少 `outline-boundaries.json` 时，普通命令统一返回 `LEGACY_ADOPTION_REQUIRED`，唯一入口是 `/sp.prd <root-feature> --adopt-outline-boundaries`。这个入口先机械扫描 `review-index.json`、feature 目录和现有映射，生成带来源摘要的候选报告；然后由模型读取真实 PRD、Outline、handoff 和目录内容，生成 proposal 与正式 Outline 审核页。模型可以分析和生成真实内容，但不能替用户写最终 decision、receipt 或 writer ledger。schema-v1 flat index 迁移出的非根条目会暂用 `parent_feature: null`、`sibling_order: 0` 表示“层级未知”；当候选报告同时标记 `parent_unconfirmed` 时，采纳 proposal 必须在用户审核前把真实 parent 和大于等于 1 的 sibling 顺序补齐。这是对缺失事实的确认，不是改写已经确认的结构；已有显式 parent 或 sibling 顺序仍必须原样保留。

审核页中的 `boundary_adjustment` 显式写 `operation: ADOPTION`、空 base identity 和 `change_class: ADOPTION`，不能伪装成 `METADATA` 或 `STRUCTURAL`。`prepare-outline-boundary-adoption.mjs` 会验证候选报告未过期、项目代码和目录一一对应、parent 合法、Outline 节点存在、handoff 文件与锚点存在、无重复代码或符号链接，并对现有产物生成摘要；准备结束后仍不得出现权威 boundaries 文件。

用户只能在绑定的本地页面上最终确认。loopback writer 机械写入 decision、一次性 receipt 和追加式 writer ledger，不调用模型。`activate-outline-boundary-adoption.mjs` 在短租约内重新验证当前目录、候选、proposal、审核摘要、writer ledger 和 receipt；确认全部一致后，先消费一次 receipt，再建立 feature-code ledger，最后以 exclusive create 建立首个 `ALIGNED` baseline，并前滚重建 `review-index.json` 和激活日志。并发调用、提交点后崩溃或派生文件写入失败都只允许幂等前滚，不能覆盖另一个 boundaries 文件。

页面写回返回的第二次命令带 `--consume-outline-decision <proposal-id>`。这次只能消费同一份不可变 report、proposal、preview、decision 和 ledger，禁止重新运行 bootstrap、重新生成页面或改写 preview，否则会让用户刚确认的身份失效。若权威 boundaries 已经完成提交，后续即使普通 PRD 更新了审核页，旧激活命令也只能按已提交 baseline 幂等补齐 code ledger、review index 和日志，不能倒退或覆盖权威状态。

Adoption 只记录当前事实，不移动、重命名、删除或新建业务项目，也不改写现有 PRD、Outline、Flow、UI 或代码。若当前结构确实需要调整，先按现状完成 adoption，再另行进入人工确认的调整流程。激活后必须重新运行边界门禁；普通 `/sp.prd` 只能在新门禁通过后重新生成新版 PRD/Outline 页面。仅升级 CLI 不会刷新已复制到项目里的命令和脚本，存量项目还要在提交本地修改后执行 `specify init . --integration <agent> --force`。

### 7.3 未确认 Outline 的整体废弃与重生成

这个入口只处理一种特殊情况：项目还没有 `outline-boundaries.json`，现有 Outline 明确是未确认草稿，而用户不愿把这份草稿先采纳成“当前事实”。它不是日常命令，也不是已有 baseline 上的结构迁移。

核心关系是：

```text
PRD / 用户需求 / 正式业务来源（保留）
                 ↓
旧 Outline 草稿与伴生决定（失效并归档）
                 ↓
模型重新读取全部 PRD + 相关现有实现
                 ↓
新 Outline 草稿（临时项目身份）
                 ↓
用户审核确认
                 ↓
项目 reconciliation + 影响迁移
                 ↓
首个权威 baseline
```

`/sp.prd <root> --discard-outline-draft` 先运行只生成清单的 `plan`，再按返回的 `plan_digest` 运行 `apply`。plan 不移动文件。apply 使用短租约，先检查全部写集，再把以下文件移动到 `prd/review/history/outline-draft-resets/<reset-id>/`：

- 每个来源容器的 `spec-outline.md`；
- `outline-review-data.json`、`outline-confirmation.md`；
- Outline Discovery 数据、pending response、intent ledger 和相关 consumed response；
- root 下未激活的 `outline-boundaries-adoption.json`；
- root 下 `boundary-adjustments/drafts/` 的 proposal、preview、decision 等文件。

白名单不包含任何 `prd.md`、`spec.md`、Flow、UI、Plan、Tasks、代码、测试、数据或 migration。脚本不是按目录“看起来像 Outline”就递归删除，而是逐个固定模式收集 regular file、记录 SHA-256，并拒绝符号链接、大小写归一化重复、绝对路径、`..` 越界和 archive 逃逸。已有权威 baseline、active transition、staging、transition sidecar 或来源摘要变化都会阻断。

apply 的提交点是 `outline-draft-reset.json`。它在所有归档、未确认代码预留作废和 transitional review index 更新完成后最后写入。若进程中途退出，同一 plan 可以识别“源文件已不在、同摘要 archive 已存在”并继续；源和 archive 同时存在、两者都不存在或摘要不一致时保留现场并停止。重复执行已完成 plan 只返回同一 receipt，不再移动文件。

reset 后 `review-index.json` 暂时保留旧目录作为来源导航，但把层级改为 flat、Outline mapping 改为 `not_mapped`，并只清空 Outline Review/Discovery availability；Flow/UI availability 保留。此时 index 不是新项目结构的事实源。门禁读取 receipt 后返回 `OUTLINE_DRAFT_REGENERATION_REQUIRED`，不能再把旧条目送进普通 legacy adoption。

`--regenerate-outline-draft --reset <reset-id>` 必须验证 receipt、归档和所有 PRD digest。模型读取每个来源容器的 PRD，以及与项目边界判断相关的 spec、Flow、UI、task、代码、测试、数据和 migration；旧 Outline 只能作为“已失效历史”留在 archive，不能偷偷恢复。新 Outline 的项目候选使用 `draft-project-*` 临时身份，不携带稳定 code、active feature 或既定 parent。reset ID 和 receipt digest 要进入 Outline review 的 source authority identity，防止另一轮 reset 的确认被误消费。

用户确认新 Outline 后，才进入单独的 reconciliation proposal。此时可以根据语义延续、拆分、合并和新建情况分配候选 SP code，逐项列出所有保留产物的 `UNCHANGED_WITH_EVIDENCE / MIGRATE / REGENERATE / RETIRE / BLOCKED` 以及 successor/shared/retire/blocked 归属。代码和数据默认保留；没有独立清理确认时，即使新 Outline 不再引用旧实现，也只能标为 legacy 或 blocked，不能自动删除。

## 8. 状态和锁的简化

schema v1 继续使用 PRD 定义的内部机器状态；本文件不另建第二套 `transition_state` 枚举。普通用户只看到由内部状态派生的显示状态：

| 机器状态或事件 | 用户显示状态 |
|---|---|
| `ALIGNED`、成功的 `ALIGNED_NEW_BASELINE` 事件 | `ALIGNED` |
| `OUTLINE_CHANGE_PROPOSED`、`OUTLINE_CHANGE_APPROVED`、`PROJECT_RESTRUCTURE_STAGED`、`FLOW_UI_IMPACT_VALIDATED`、`CROSS_ARTIFACT_VALIDATED` | `MIGRATION_ACTIVE` |
| `MIGRATION_BLOCKED` | `MIGRATION_BLOCKED` |
| `ROLLBACK_REQUIRED` | `ROLLBACK_REQUIRED` |
| `LEGACY_ADOPTION_REQUIRED` | `SETUP_REQUIRED`，它属于存量接入，不属于边界调整 |

未确认 draft 没有迁移状态，仍保持 `ALIGNED`。兼容 schema v1 时，`OUTLINE_CHANGE_PROPOSED` 是一个短暂、可恢复的内部状态：有效人工 decision 已完成身份验证，active proposal 已持久化，但一次性 receipt 尚未记入 consumed ledger。`OUTLINE_CHANGE_APPROVED` 表示 receipt 已消费、同一 decision 不能再次启动迁移，可以进入 inventory 和 staging。两步应由同一启动命令在一把短锁内连续完成；中间崩溃只能依据相同 decision 和 receipt 幂等前滚，不能接收新的方案或第二次确认。它们都不能表示未确认草案。未来若合并机器状态，必须升级 schema version 并提供 migrator。

锁按命令获取、刷新和释放，只保护一次状态更新、扫描、staging 发布或最终激活，不跨越人工审核，也不跨越两条独立命令。schema v1 的结构迁移命令锁保留 300 秒租约和运行超过 30 秒时的 heartbeat；feature-code ledger 可以使用 60 秒短租约，但锁内 Git 扫描必须有超时，保存前必须刷新并验证 owner。它们只限制单条机械命令和异常进程留下的 stale lock，不表示允许锁住几小时等待用户。

所有过期接管使用固定路径 `<lock>.recovery` 的原子 exclusive claim，而不是每个恢复者各建一个随机 recovery 文件。恢复者取得唯一 claim 后重新读取主锁，并比较最初观察到的完整 owner、identity 和 lease；只有内容完全未变才允许隔离旧锁并创建新 owner。`wx` 打开与 JSON 写完之间可能短暂暴露空文件或半份 JSON，读取者必须有限重读；持续不可解析时按损坏锁 fail closed、保留现场，不能误判为过期后接管。Heartbeat 通过已打开并核对的原 claim 文件续租，不能用路径级替换覆盖后来 owner；旧进程在接管后恢复时只能写旧文件实体，并在路径 owner 复核时失败。start、feature-code ledger、activation finalization 和 rollback finalization 不得再采用 `read expired -> rename current path` 的无 fencing 流程。固定 recovery claim 若因崩溃残留，必须 fail closed 并要求核实后清理，不能用同样的 rename 竞态自动接管 recovery claim。主锁/recovery claim 删除遇到 Windows `EPERM`、`EACCES` 或 `EBUSY` 时有限重试；最终失败必须报告阻塞和恢复路线；exclusive create 失败后的 claim 清理也必须同时报告原始错误与清理错误。只有已经隔离且不再承担互斥职责的唯一 `.stale` 文件可以在清理失败时只告警。草案和确认之间继续依靠 base digest、proposal digest、impact preview digest 和提交前 CAS 保证一致性。

第一版可以把已确认 proposal 设为不可变：内容变化时创建新的 proposal ID，并让旧确认失效。这样暂时不需要支持多人同时修改同一 proposal 的复杂 revision 协议。

## 9. 数据组织

目标结构应把当前事实与单次调整证据分开：

```text
specs/
├── feature-code-ledger.json
└── <root-feature>/
    ├── outline-boundaries.json
    ├── prd/review/
    │   ├── outline-draft-reset-plan.json
    │   ├── outline-draft-reset.json
    │   └── history/outline-draft-resets/<reset-id>/...
    └── boundary-adjustments/
        ├── writeback-ledger.jsonl
        ├── consumed-decisions.jsonl
        ├── drafts/<proposal-id>/
        │   ├── proposal.json
        │   ├── impact-preview.json
        │   └── decision.json
        ├── transitions/<transition-id>/
            ├── inventory.json
            ├── evidence.json
            ├── validation-report.json
            └── ...
        └── staging/<transition-id>/
            ├── plan.json
            ├── manifest.json
            ├── publication-receipt.json
            ├── outputs/...
            └── _recovery/...
```

`outline-boundaries.json` 只承担当前有效边界事实。draft 不具备授权意义；transition 目录只在用户确认后创建。正式 `decision.json` 必须有对应的 writer ledger 记录。完成或撤销后保留或显式归档 transition 目录，激活日志记录关键 digest 和目录引用，以便后来追查。过期 draft 标记为 `STALE`，只允许用户或显式清理命令归档；日常命令不得自动删除。

当前实现已经按上述路径区分草案、transition 验证文件和物理 staging。`outline-boundaries.json` 只保存 active transition 的最小状态与摘要标记；较大的 inventory、evidence、manifest 和 publication receipt 保持为独立文件。

## 10. 保留、简化和延期

### 10.1 现在必须保留

- 所有写命令统一使用日常边界门禁；
- root 使用 `000`，稳定 code 不得复用；
- 新项目代码由仓库级账本预留，激活、退役和作废都保留历史；
- 项目退役必须留下 tombstone；
- 模型或用户都可发起，但最终确认必须来自用户；
- 正式迁移前有权威影响扫描；
- 激活时重新验证摘要、命令短锁、baseline、proposal、manifest 和 publication receipt；
- 失败不覆盖当前基线和用户工作区。

### 10.2 可以简化

- staging manifest 只在物理文件变化时生成，并由工具根据差异生成；
- 审批只需要一份结构化 `decision.json`，不建设多签系统；
- 证据合并为一份验证报告；每个 unchanged 项、高风险项和人工判断项仍要求明确证据；
- 锁按单条机械命令持有，不跨越人工等待；
- 正式迁移期间先冻结整个 root，不做精细子项目锁。

### 10.3 可以延期

- 全项目永久 artifact registry；
- 每个文件一份独立 evidence receipt；
- 多人同时编辑同一个迁移的完整 revision 协议；
- 由模型自动推断目标路径、successor 或自动生成反向修改；
- 只冻结受影响 feature 的依赖图并发控制；
- HMAC、多签审批和额外服务端。

Git 提供版本历史和内容摘要，但不能代替业务上的 code 退役关系、用户确认和产物归属。不得自动运行 `git reset --hard`、`git clean`、`git stash`、`git restore` 或其他可能改变用户工作区的 Git 命令。

自动废弃只允许作用于 transition manifest 明确拥有、经过 realpath 边界检查的专属 staging 目录；废弃 staging 后仍要保留 proposal、decision、inventory、journal 和 rollback report。只要真实工作区已经被修改，回滚工具必须先比较 manifest 与当前内容。无法机械证明撤销不会覆盖用户改动时，保持现场、进入 `ROLLBACK_REQUIRED` 并输出逐目标人工恢复清单，不能自动尝试反向修改。

## 11. 验收标准

1. 模型提出拆分建议但用户未确认时，当前状态仍为 `ALIGNED`，日常命令正常运行。
2. 用户要求讨论拆分但未确认具体方案时，不创建 active transition，不生成长期锁。
3. 模型推荐某个方案不能产生最终确认记录。
4. 只有 writer ledger 证明来自有效人工审核会话，且 receipt、proposal/base/impact identity 完全匹配时，才允许启动正式调整；单独写入 `confirmed_by.type: human` 无效。
5. proposal、base、产物集合、来源摘要或关键影响范围变化后，旧确认自动失效。
6. 连续运行日常命令不会创建迁移文件、锁、inventory 或 receipt。
7. 只有 `title`、`order` 和 parent 不变时的 `sibling_order` 可以走轻量调整；新增项目和其他结构字段变化都进入重大迁移。
8. 没有 Flow/UI 产物时，不生成假的 Flow/UI 验证阶段。
9. 没有物理文件变化时，不要求 staging manifest。
10. split、merge、reparent、retire、目录移动和既有产物转移仍经过身份、影响、用户确认、激活重验和回滚检查。
11. 正式迁移期间 `/sp.implement` 和其他普通写命令不能绕过门禁。
12. 激活失败或进程中断后，系统能区分发布前、产物已发布未提交和 baseline 已提交三个阶段，恢复动作不会覆盖用户未提交修改。
13. 正式迁移期间整个 root 的普通写入被阻断；只有绑定 active transition 的迁移 workset 和只读诊断可以运行。
14. 两个本机进程并发预留不会得到同一代码；作废、退役、已删除目录和超过 `999` 的代码都不会导致旧号复用。
15. 新项目只有使用与 proposal 绑定的预留代码才能启动迁移；受 Outline 管理的 feature 创建必须显式消费该代码，不使用时间戳或自动猜号。
16. 两个恢复者并发处理同一过期 start、ledger 或 finalization 锁时，只有固定 recovery claim 的 owner 可以接管；另一个恢复者不能移走新的有效锁。
17. 主锁或 recovery claim 删除失败不会被静默吞掉；有限重试仍失败时，命令保留现场、返回非成功状态并给出明确恢复路径。
18. 无权威 baseline 的显式 reset 只归档 Outline 草稿白名单；PRD、代码、Flow/UI、spec、task、测试、数据和 migration 均由 plan 摘要证明保留。
19. reset 的部分归档可以按同一 digest 幂等前滚；任一来源漂移、路径越界、symlink、双份源/archive 或权威 baseline 出现都 fail closed。
20. reset 后的新 Outline 不继承旧 `review-index` 项目划分，候选节点先用临时身份；人工确认后才进入 code 分配和项目 reconciliation。

## 12. 实施状态

已经实现并纳入回归：公共边界门禁（含 `/sp.implement`）、feature code 账本、draft/active 分离、loopback writer 人工凭证、`NONE / METADATA / STRUCTURAL` 分类、按 inventory 动态跳过 Flow/UI、固定 recovery sidecar 与 owner fencing、Windows 锁删除重试、单命令短锁、manifest staging、可重放 artifact publish、baseline commit、提交后前滚收尾，以及无首个 baseline 时的 Outline 草稿 plan/apply reset、精确归档、receipt 路由与 PRD/代码保护。

当前有意保留的边界：不建设永久 artifact registry；不支持多人同时改写同一 active proposal；不自动推断 successor 或目标路径；不自动删除 staging 审计与恢复副本；不做 feature 级并发冻结。需要改变 proposal 内容时必须生成新的 proposal ID 并重新人工确认。
