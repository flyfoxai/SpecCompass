# SP 代码阶段改进研讨

## 1. 背景

当前 SP 的主干已经比原版 Spec Kit 多了一层稳定控制：

- `spec` 负责需求和验收边界。
- `flow` 负责业务流程、状态变化、分支原因、失败路径。
- `ui` 负责界面结构、界面动作、界面元素与流程的绑定。
- `gate` 负责第一层业务文档是否能继续向后推进。
- `bundle` 负责把前面稳定结论压缩给交付设计层。
- `plan` 负责交付设计和 workset 拆分。
- `tasks` 负责把交付设计变成可执行任务。
- `analyze` 负责跨文档一致性检查和自动化准备度诊断。

这个骨架的优点是稳：它不会让模型拿到一个模糊需求就直接写代码。但现在的问题也很明确：SP 的框架主要支持到文档，代码阶段还没有和前面的 `flow/ui/memory/workset/trace/open-items` 机制充分打通。

如果要让 SP 支持到代码，不能简单照搬原版，也不能让 `/sp.implement` 直接自由发挥。正确方向是：保留 SP 的文档骨架，把原版 Spec Kit 的“规格到代码任务”方法论吸收进来，再用 SP 自己的控制机制加强代码阶段。

## 2. 原版 Spec Kit 到代码的方法论

原版 Spec Kit 的核心不是“模型直接读 spec 写代码”，而是四段式转换：

1. `specify` 把自然语言需求变成 `spec.md`，重点是用户故事、功能需求、成功标准和验收场景。
2. `plan` 把需求变成技术设计，明确技术栈、源码目录、数据模型、接口契约、quickstart 验证路径。
3. `tasks` 把 `spec.md + plan.md + research.md + data-model.md + contracts/ + quickstart.md` 变成 `tasks.md`，每个任务带任务 ID、用户故事、文件路径、依赖、并行标记和测试要求。
4. `implement` 只执行 `tasks.md`，按阶段推进，测试优先，完成后验证并勾选任务。

原版真正值得吸收的是这几个原则：

- 代码任务必须从规格和设计产物生成，不能从模型临时理解生成。
- 每个任务必须足够具体，最好能看到文件路径、测试路径和验收方式。
- 任务按用户故事或可独立交付单元组织，而不是按模型觉得顺手的模块组织。
- 测试、接口契约、数据模型、quickstart 是实现前的约束，不是实现后的补充说明。
- `implement` 不负责重新设计需求；它只负责执行任务。发现任务不成立时，应回到 `tasks`、`plan`、`specify` 或 `clarify`。

## 3. SP 应吸收但不能照搬的部分

原版的优点是能落到代码，缺点是对大型复杂业务的上下文管理较轻。SP 已经补了这部分：

- memory 用来保存稳定事实、路由、open items 和 trace。
- workset 用来控制上下文粒度。
- flow 是业务流程主轴。
- ui 不是孤立页面，而是流程节点和业务动作的界面表达。
- gate/analyze 用来防止断链、过期 memory 和未决风险被误当成 PASS。
- 多 agent 和并行任务有读写边界、handoff、共享状态串行合并规则。

所以 SP 的代码阶段不应退回“只按 user story 列任务”的轻量模式。更合适的做法是：

- 用原版的任务可执行性要求补强 SP。
- 用 SP 的 flow/ui/workset/trace/memory 机制约束原版的代码执行。
- 让 `plan/tasks/implement` 形成一个真正的代码闭环，而不是只停留在文档闭环。

## 4. 代码阶段的总体路线

推荐路线分为“目标态”和“当前落地前置条件”。

1. 继续保留 `spec -> flow -> ui -> gate -> bundle -> plan -> tasks -> analyze` 文档骨架。
2. 代码阶段只有在可机械判断的 readiness 条件满足后才启用，不能靠模型主观判断“应该可以写代码了”。
3. `sp.plan` 从“交付文档计划”增强为“交付设计 + 代码落点计划”。
4. `sp.tasks` 从“文档任务”增强为可以生成“实现任务”。
5. `sp.implement` 使用现有纪律，但读入更多 SP 约束：flow/UI anchor、workset、trace、open items、allowed write set、required checks。
6. 实现后运行代码范围的 `sp.analyze` 做回归检查，确认代码、测试、trace、memory、source docs 没有漂移。

代码阶段不是替代文档阶段，而是文档阶段通过门禁后的下游阶段。

当前最重要的前置工作不是继续扩写方法论，而是先消除模板矛盾：`sp.plan` 和 `sp.tasks` 不能继续无条件声明“只做文档任务”，同时又让 `sp.implement` 按生产代码执行器工作。应先把文档模式和实现模式的边界写清楚，再谈代码阶段增强。

## 5. `sp.plan` 的改进方向

### 5.1 现在的问题

当前 `sp.plan` 更偏向交付设计和 workset 拆分。它会要求关系可追踪、workset 有边界、风险可见，但还没有强制把这些内容落到代码层：

- 源码目录结构不一定明确。
- 测试框架和运行命令不一定明确。
- UI/API/data/permission/event 到代码区域的映射不一定明确。
- 每个 workset 对应哪些代码模块、测试模块、配置文件、迁移文件不一定明确。
- `sp.tasks` 因此很难稳定生成可执行代码任务。

### 5.2 应新增的计划内容

`sp.plan` 应在保留原有 delivery plan 的基础上，新增“代码落点计划”。至少包含：

- `Source Layout`：本 feature 会触达的源码目录、测试目录、配置目录。
- `Runtime Commands`：构建、测试、lint、类型检查、启动、quickstart 验证命令。
- `Code Mapping`：flow/UI/API/data/permission/event/acceptance anchor 到代码区域的映射。
- `Test Mapping`：每个核心 acceptance、API contract、UI action、业务流程的测试或手工验证路径。
- `Workset Code Boundary`：每个 workset 允许触达的代码区域、测试区域和禁止触达的共享区域。
- `Global Registry Risk`：是否会修改 package manifest、lockfile、路由注册表、数据库 schema、权限矩阵、全局配置、跨模块契约、迁移脚本等全局文件。
- `Implementation Readiness`：哪些 workset 已经可以生成实现任务，哪些仍然需要回到 `flow/ui/spec/clarify`。

### 5.3 `sp.plan` 的新门禁

`sp.plan` 不应只问“文档关系是否清楚”，还要问“代码任务是否能生成”：

- 如果不知道代码应该写在哪里，不能进入实现任务生成。
- 如果不知道用什么命令验证，不能进入实现任务生成。
- 如果 UI action 找不到业务事件、API、状态变化或验收路径，不能进入实现任务生成。
- 如果 API/data/permission/event 没有 source doc 或 trace 来源，不能进入实现任务生成。
- 如果 workset 代码边界过大，应先拆 workset、子 feature 或子项目。

### 5.4 对项目的影响

这个改进会让 `plan` 的工作量增加，但能明显降低后面实现阶段的瞎猜概率。它把“代码落点”提前到计划阶段处理，避免模型在 implement 阶段才发现任务没法落地。

## 6. `sp.tasks` 的改进方向

### 6.1 现在的问题

当前 `sp.tasks` 明确偏文档任务，规则中还有“Stay within documentation work only”和“Do not write production code”。这对文档阶段是对的，但如果要进入代码阶段，它缺少第二种模式：实现任务模式。

### 6.2 推荐采用双模式

不建议删除文档任务模式。推荐让 `sp.tasks` 支持两个阶段或两种输出口径：

- `Documentation Task Mode`：用于把 flow、ui、delivery、memory、analysis 这些文档工作组织成任务。
- `Implementation Task Mode`：只在 `sp.plan` 的 `Implementation Readiness` 明确允许时启用，用于生成代码实现任务。`sp.analyze` 只能诊断 readiness 是否真实或过期，`sp.gate` 只能做阶段决策，不能另造一套 readiness 事实。

这样可以保留当前 SP 的稳健性，同时吸收原版 Spec Kit 的代码任务能力。

双模式必须有机械触发信号，不能让模型靠“感觉现在该写代码了”切换模式。最终口径是：`plan.md` 的 `Implementation Readiness` 是唯一准入事实来源；`tasks.md` 只能消费它；`analysis.md` 和 `gate.md` 可以记录诊断和决策，但不能把未被 plan 标记 ready 的 workset 提升为可实现。

### 6.3 实现任务必须包含的字段

每个代码任务至少应能解析出以下信息，但不要求每条任务都把所有字段完整展开：

- `Task ID`：稳定任务编号。
- `Workset`：属于哪个 workset。
- `Story / Acceptance`：对应哪个用户故事或验收锚点。
- `Trace Anchors`：关联的 FLOW、UI、API、TABLE、PERM、EVENT、ACC、TEST、CODE anchor。
- `Allowed Write Set`：允许修改的代码、测试、配置文件范围。
- `Forbidden Write Set`：默认禁止改共享 memory、trace、tasks 状态、其他 worker 范围、全局注册文件，除非任务明确授权。
- `Required Checks`：本任务完成必须运行或记录的测试、构建、lint、类型检查、quickstart 或手工验证路径。
- `Impact-Radius Trigger`：是否触发影响半径检查，尤其是 API、权限、数据、UI 字段、事件、副作用、验收、测试变化。
- `Writeback Target`：完成后是否需要更新 `tasks.md`、`memory/open-items.md`、`memory/trace-index.md`、source docs 或代码锚点。
- `Fallback Route`：任务无法执行时回到哪里，例如 `sp.tasks`、`sp.plan`、`sp.flow`、`sp.ui`、`sp.specify`、`sp.clarify`。

实际落地时应采用“全局默认 + 只写偏离”的方式控制 token 和文件体积。普通低风险任务只写任务 ID、workset、目标文件、测试文件、required checks、allowed write set。Forbidden Write Set、Fallback Route、Impact-Radius、Writeback Target 等规则优先继承全局默认；只有高风险、并行、跨边界或偏离默认时才在任务项里展开。

### 6.4 任务组织方式

原版按 user story 组织任务，这一点仍然有价值。但 SP 应在此基础上增加 workset 和 flow 轴：

- 优先按 workset 控制上下文边界。
- 在 workset 内按用户故事、流程路径或验收项组织。
- UI、API、data、permission、event、test 不应成为孤立任务；它们应回链到 flow 或 acceptance。
- `[P]` 并行任务必须满足文件不重叠、依赖已满足、共享 memory 只读、全局注册文件不冲突。

### 6.5 对项目的影响

这个改进会让 `tasks.md` 更像一个真正的执行 DAG。模型不需要重新推理“我要改哪里、怎么验收、能不能并行、失败回哪里”，从而降低 token 消耗和实现偏移。

风险是任务文件可能变大。解决办法是：只在高风险或并行任务里写完整边界；普通低风险任务使用全局默认规则，不堆模板化字段。任务分发给 worker 时，coordinator 或宿主工具必须把“全局默认规则 + 本任务偏离规则”组合后交给 worker，不能指望 worker 自己回溯整套方法论。

## 7. `sp.implement` 的改进方向

### 7.1 当前已有优势

当前 `sp.implement` 已经比原版更强，已经包含：

- TDD 和 acceptance-first。
- 影响半径检查。
- shared memory 串行写回。
- parallel worker 边界。
- forbidden write set。
- 失败兜底和震荡保护。
- headless 失败报告。
- 每个任务完成后更新状态和验证证据。

所以 `sp.implement` 不需要推翻重写，而是要让它消费前面阶段生成的代码任务字段。

### 7.2 应增强的执行输入

`sp.implement` 开始前应优先读取：

- `tasks.md` 中当前任务的 code task 字段。
- `plan.md` 中的 Source Layout、Runtime Commands、Code Mapping、Test Mapping。
- `memory/index.md` 和当前 workset memory。
- `memory/trace-index.md` 中与本任务相关的 flow/UI/API/data/test/acceptance 关系。
- `memory/open-items.md` 中影响本任务的 Risk、Blocker、Todo、Question。
- 直接相关源码、直接相关测试、失败测试或同名/相邻测试。

它不应重新全量读取所有文档，也不应因为 memory 有摘要就跳过 source doc 和当前代码。

同时要同步清理旧的悬空读取口径。原版 Spec Kit 的 `data-model.md`、`contracts/`、`quickstart.md` 如果在 SP 项目中不存在，`sp.implement` 不应把它们当成主要输入；应优先读取 SP 的 `Source Layout`、`Code Mapping`、`Test Mapping`、`Runtime Commands` 和相关 delivery/source docs。兼容读取可以保留为 `IF EXISTS`，但不能让核心执行依赖不存在的 upstream 产物。

### 7.3 应增强的执行纪律

`sp.implement` 应明确执行以下规则：

- 只执行当前任务或当前 workset，不跨任务扩张。
- 修改前确认 `Allowed Write Set`；没有边界则回到 `sp.tasks` 或请求 coordinator。
- 能先写测试或补测试的，先让测试失败，再写代码。
- 如果没有自动测试，先写清手工验证路径，再实现。
- 涉及高影响对象时，先记录 `Impact-Radius Plan`，实现后记录 `Impact-Radius Evidence`。
- 任务通过后，立即更新任务状态和验证证据，不拖到下一次模型调用再判断。
- 代码事实改变了稳定文档、trace、risk、open item 时，必须回写。
- 同一失败签名同一层最多两次尝试；再失败就上移到 `tasks/plan/spec/clarify`。
- 业务矛盾不能用技术 hack 绕过。
- 删除、重命名或移动文件前，必须检查 reverse trace、直接引用、相关测试和 workset 边界；如果对象仍被需求、flow、UI、API、测试或 memory 引用，不能静默删除，应回到任务或计划层确认。

失败处理不能默认使用 `git reset`、`git checkout` 等破坏性清理。更稳的策略是优先使用临时 workspace、CI workspace、临时分支或 `git worktree` 隔离。若本地工作区已有用户改动或无法安全区分失败尝试与有效改动，应报告现场、给出选项并等待人工决策。

### 7.4 实现后的回归闭环

实现完成后不应只看任务是否勾选，还应检查：

- 代码是否满足对应 acceptance。
- 测试、构建、lint 或手工验证是否有当前证据。
- UI/API/data/permission/event 是否仍能追到 flow。
- `memory/trace-index.md` 是否需要新增或更新 CODE/TEST 关系。
- `memory/open-items.md` 中被关闭的风险是否有证据。
- 是否产生新的 `@t0` 或 `@r0`。

推荐流程是：实现任务完成后运行局部验证；一个 workset 或阶段完成后，再运行 `sp.analyze` 或 `sp.gate` 做系统性复核。

CODE/TEST trace 写回应有明确归属。普通串行实现可以在收口时写回；并行 worker 默认不能直接修改 `tasks.md`、`memory/open-items.md`、`memory/trace-index.md` 这类共享文件，只能在 handoff 中提交 proposed updates，由 coordinator 在串行 closeout 中合并。高风险边界对象必须写 CODE/TEST trace，普通内部函数只在有稳定追踪价值时记录。

## 8. `sp.analyze` 与 `sp.gate` 在代码阶段的作用

进入代码阶段后，`sp.analyze` 和 `sp.gate` 不应只检查文档，但两者职责要分开。

`sp.analyze` 应增加代码阶段检查重点：

- 任务是否都有文件路径、验证路径、trace 回链。
- 实现后的代码改动是否能回链到 task、workset、acceptance、flow 或 source doc。
- 测试是否覆盖关键 acceptance 和高风险边界。
- memory 是否和当前代码、测试、source docs 冲突。
- 多 agent 结果是否互相冲突。

代码实现后的 `sp.analyze` 应按增量范围工作。实现没有改动 flow/ui/spec 时，不应重新全量检查所有业务文档；应重点检查本次改动文件、相关 CODE/TEST trace、acceptance 到代码/测试的证据、memory 与代码是否 stale、以及新产生的 open items。

`sp.gate` 当前更像第一层业务门禁。如果要在代码阶段复用，必须增加阶段模式，至少区分：

- 业务门禁：判断第一层业务文档是否可以进入 bundle/plan。
- 实现准入门禁：判断 plan/tasks 是否已经具备代码落点、写入边界、验证命令和 readiness。
- 实现后回归门禁：判断构建、测试、lint、验收证据、trace、open blockers/high risks 是否允许进入 release/merge 或人工验收。

代码阶段的 gate 应尽量依赖客观工具证据，例如构建、测试、lint、类型检查、安全扫描、CI 或明确的手工验收记录，而不是让模型“读一遍代码觉得通过”。

阶段化 `sp.gate` 应增加的代码准入判断：

- 有构建、测试、lint 或等价验证失败时不能 PASS。
- 核心 acceptance 找不到代码或测试证据时不能 PASS。
- 高风险 API、权限、数据迁移、事件、副作用没有 trace 或回退路径时不能 PASS。
- memory 与代码冲突且未刷新时不能 PASS。
- open `Blocker` 或未被接受的 High Risk 不能 PASS。

为避免重复劳动，`sp.gate` 应优先读取最近的 `analysis.md` 或等价分析结果，不应把 `sp.analyze` 刚做过的检查完整重算一遍。gate 的职责是决策和阻断，analyze 的职责是诊断和列证据。

## 9. 代码阶段的推荐命令链

目标态链路：

```text
sp.specify
  -> sp.clarify
  -> sp.flow
  -> sp.ui
  -> sp.gate
  -> sp.bundle
  -> sp.plan
  -> sp.tasks
  -> sp.analyze
  -> sp.gate
  -> sp.implement
  -> sp.analyze
  -> sp.gate
```

说明：

- 前半段建立稳定业务和交付设计。
- 第一次 `sp.analyze/sp.gate` 判断是否可以进入实现，但前提是 `sp.gate` 已支持实现准入阶段模式。
- `sp.implement` 只执行已经可执行的代码任务。
- 实现后再次分析和过门禁，防止代码、测试、memory、trace 漂移。

在阶段化 `sp.gate` 尚未完成前，不应把三次 gate 当成可执行的强制链路。过渡期建议：

```text
sp.specify
  -> sp.clarify
  -> sp.flow
  -> sp.ui
  -> sp.gate        # 仅业务门禁
  -> sp.bundle
  -> sp.plan
  -> sp.tasks
  -> sp.analyze     # 实现准入诊断
  -> sp.implement   # 只在 readiness 明确时执行
  -> sp.analyze     # 代码范围回归
```

如果项目存在 release/merge 阶段，或者代码改动涉及高风险对象，再运行阶段化 `sp.gate` 做最终门禁。小型低风险 feature 可以合并实现准入诊断和业务门禁，避免重复检查。

## 10. 推荐落地顺序

建议分步落地，避免一次改太大。新的优先级是先消矛盾，再增强能力。

### 第 0 步：先消除模板矛盾

先修内部一致性，不新增复杂能力：

- `sp.plan` 和 `sp.tasks` 从无条件“只做文档任务”改成“默认文档模式，实现模式由 readiness 开启”。
- `sp.implement` 的读取清单对齐 SP 的 Source Layout、Code Mapping、Test Mapping、Runtime Commands，不再把不存在的 upstream 产物当成核心输入。
- `sp.gate` 读取 `analysis.md` 或等价分析结果，避免和 `sp.analyze` 重复计算。
- 方法论和 memory 架构中的编码类型表保持一致，正式包含 CODE 和 TEST。
- 明确 CODE/TEST trace 写回由串行 closeout 或 coordinator 负责，并行 worker 只能提出写回建议。

这一步是止血，风险最低，收益最高。

### 第一步：增强 `sp.plan`

让 `sp.plan` 产出代码落点计划：

- Source Layout。
- Runtime Commands。
- Code Mapping。
- Test Mapping。
- Workset Code Boundary。
- Global Registry Risk。
- Implementation Readiness。

这一步把代码落点提前到计划层处理，避免 implement 阶段才发现任务没法落地。

### 第二步：增强 `sp.tasks`

让 `sp.tasks` 支持文档任务和实现任务双模式，并增加机械触发条件。实现任务使用“全局默认 + 只写偏离”，避免 `tasks.md` 膨胀。

### 第三步：对齐 `sp.implement`

让 `sp.implement` 消费实现任务字段和 plan 的代码落点计划，补删除/重命名/移动安全检查，明确 CODE/TEST trace 写回归属，继续禁止默认 destructive cleanup。

### 第四步：阶段化 `sp.gate`

在正式使用三次 gate 链路前，先让 `sp.gate` 支持业务门禁、实现准入、实现后回归三种阶段模式；或在文档中明确过渡期只把 gate 用作业务门禁。

### 第五步：补检查机制

增强 `sp.analyze` 和 `sp.gate`：

- 检查实现任务是否具备文件路径和验证路径。
- 检查代码/测试是否能回链到 trace 和 acceptance。
- 检查 open items、风险、memory 与代码是否冲突。
- 检查变更文件是否缺 CODE/TEST 回链。
- 检查实现后 analyze 是否只覆盖代码相关增量，避免重复全量业务检查。

这一步风险最高，因为它会影响 PASS/FAIL 判断，应该先用轻量 warning，再逐步变成硬门禁。

## 11. 关键决策点

后续真正改模板前，需要确认几个产品策略：

1. `sp.tasks` 是否采用双模式，还是直接把文档任务升级为实现任务。
2. `sp.gate` 是否做阶段模式，还是只保留业务门禁，代码阶段主要由 `sp.analyze` 和工具检查承担。
3. 实现任务字段要放在 `tasks.md` 主体里，还是放在 feature memory 的辅助文件里，避免 `tasks.md` 过大。
4. CODE/TEST anchor 是否在代码阶段强制生成，还是只对高风险边界对象强制。
5. 低风险小任务是否允许 fast path，只记录简短验证证据，不写完整影响半径。
6. 小型低风险 feature 是否允许合并 readiness 诊断和 gate，避免过重流程。

我的建议：

- 采用双模式，避免破坏文档阶段。
- 进入代码阶段前必须有 `plan.md` `Implementation Readiness` 证据；是否同时要求 `sp.analyze` 和阶段化 `sp.gate` 通过，应按项目风险决定，但它们不能替代 plan 的 readiness 事实。
- 任务主体保留必要字段，详细上下文放到 memory/workset。
- CODE/TEST anchor 只对高风险边界对象强制，普通内部函数不强制。
- 保留 fast path，但必须有当前验证证据。
- `sp.gate` 短期先阶段化；如果后续发现一个模板承载过重，再拆成更明确的门禁模式或辅助文档。

## 12. 总结

原版 Spec Kit 给出的核心方法论是：规格先变成技术计划，技术计划再变成带文件路径和测试路径的任务，最后实现命令严格执行任务。

SP 应吸收这条代码链路，但用自己的增强机制提高稳定性：

- 用 `flow` 作为业务主轴。
- 用 `ui` 把界面元素绑定到流程节点和业务动作。
- 用 `workset` 控制上下文窗口。
- 用 `memory` 保存稳定事实和未决问题。
- 用 `trace` 连接需求、流程、界面、接口、数据、测试和代码。
- 用 `analyze/gate` 阻断断链、过期 memory、未决风险和验证缺失。
- 用 `implement` 小步执行、测试牵引、失败上移。

最终目标不是让模型“更自由地写代码”，而是让模型在明确边界、明确证据、明确回退路线下，把已经稳定的 SP 文档系统转成可靠代码。

## 13. Gemini、Claude 与 Codex 综合审核意见

本节记录对本研讨稿的外部审核意见。Gemini 和 Claude 都只做审核，没有直接修改文件。Codex 在阅读双方意见后做综合判断。

### 13.1 共同判断

Gemini、Claude 和 Codex 都认可主方向：SP 不应停留在文档阶段，代码阶段也不应让模型自由发挥。更稳的路线是继续使用 `flow/ui/workset/memory/trace/open-items` 控制上下文，再吸收原版 Spec Kit 的代码落地方法：`plan` 明确代码落点，`tasks` 生成可执行实现任务，`implement` 只按任务小步执行，最后由 `analyze/gate` 回查代码、测试、trace 和验收是否一致。

说人话就是：前面的文档不是装饰品，必须真正约束后面的代码。模型写代码前要知道改哪里、为什么改、怎么验、不能碰哪里、失败回哪一层。

三方也都认可一个更具体的判断：当前优先级不是继续扩写方法论，而是先消除命令模板之间的矛盾。`sp.plan/sp.tasks` 不能仍按纯文档阶段表达，`sp.implement` 却已经按代码执行器工作。这个断链如果不修，后续代码阶段会靠模型临场补全，稳定性不够。

### 13.2 Gemini 的主要意见

Gemini 认为当前方案方向正确，但要避免把 trace、编码机制和代码门禁变成新的负担。

它强调：

- 不建议把 `FEAT01.WS02.API03` 这类坐标大量写进生产代码注释，否则会造成写放大，重构时也容易丢失或过期。
- 正向追踪应主要由 `sp.plan` 的 Code Mapping 完成，也就是从需求、flow、UI、API、数据、验收到具体代码文件和测试文件。
- 反向追踪应优先借助测试和 trace。关键测试名、测试描述或测试记录可以包含 `ACC`、`FLOW` 或关键业务坐标，让模型从失败测试反查业务来源。
- `tasks.md` 应保持执行 DAG，不应塞满 API 契约、业务长文和历史解释。任务只放必要执行字段和指针，细节放在 `memory/trace-index.md`、workset memory 或 source docs。
- 并行 worker 默认只能改自己的 `Allowed Write Set`。共享的 `tasks.md`、`open-items.md`、`trace-index.md` 由 coordinator 串行合并。
- 涉及 API、权限、数据、事件、核心 UI 动作、验收变化时，`sp.implement` 动手前应先写简短 `Impact-Radius Plan`，完成后写 `Impact-Radius Evidence`。
- code gate 应尽量依赖客观检查，例如测试、构建、lint、类型检查、验收证据、trace 回链，而不是模型主观判断。
- 对普通内部修改，reverse trace 可以轻量；对 API、权限、数据迁移、核心 UI、验收测试等高风险边界，reverse trace 应更严格。
- worker prompt 不能只给单个任务，还要给全局默认规则和本任务偏离规则，否则 worker 容易漏掉上下文边界。

Gemini 曾建议在失败恢复时考虑默认使用 `git reset` 一类清理手段。Codex 不采纳这一点。原因是本地工作区可能存在用户已有改动，默认破坏性清理会引入更大的稳定性风险。更稳的做法是使用临时 workspace、CI workspace、临时分支或 `git worktree` 隔离失败尝试；如果无法安全区分失败尝试和用户有效改动，就报告现场并请求人工决策。

Gemini 可采纳的推荐落地顺序是：先改 `sp.plan/sp.tasks` 的文本约束，再强化 `sp.implement` 的执行纪律，最后增强 `sp.analyze/sp.gate` 的代码阶段检查。

### 13.3 Claude 的主要意见

Claude 的核心提醒更尖锐：方法论层已经相当完整，真正掉队的是命令模板。也就是说，问题不只是“代码阶段还没想清楚”，而是 `sp.implement` 已经像代码执行器，但上游 `sp.plan` 和 `sp.tasks` 还主要停留在文档任务阶段。

Claude 指出的关键断链：

- `sp.implement` 已经要求读技术栈、架构、文件结构、测试、contracts、quickstart，并执行实现任务。
- 但当前 `sp.plan` 仍偏文档交付计划，没有稳定产出 Source Layout、Runtime Commands、Code Mapping、Test Mapping、Workset Code Boundary。
- 当前 `sp.tasks` 仍偏文档任务，缺少实现任务模式，无法稳定提供 `Allowed Write Set`、文件路径、测试路径和代码 trace。
- trace-index 的 schema 已经允许 `CODE` 和 `TEST`，但命令还没有明确“谁在什么时候写 CODE/TEST 行”。
- 当前 `sp.gate` 更像第一层业务门禁，不一定适合直接承担实现准入门禁和实现后回归门禁；如果继续复用 `sp.gate`，需要明确阶段模式和不同判据。

Claude 建议先解决模板断链，而不是继续扩写方法论。它特别强调：

- `tasks.md` 的实现任务字段不能每项都填满，应使用“全局默认 + 只写偏离”的方式防止任务文件膨胀。
- 实现任务模式必须有机械 readiness 信号，不能靠模型感觉切换。
- `sp.implement` 不能把原版 `data-model.md`、`contracts/`、`quickstart.md` 当成 SP 的核心输入；这些文件不存在时，应优先读取 SP 自己的 Source Layout、Code Mapping、Test Mapping、Runtime Commands 和 source docs。
- CODE/TEST trace 写回应由串行 closeout 或 coordinator 负责；并行 worker 只提交 proposed updates。
- `sp.gate` 应读取 `analysis.md` 或等价分析结果，负责决策和阻断，不要重复完整执行 `sp.analyze` 的诊断工作。

### 13.4 Codex 综合判断

Codex 认可 Gemini 和 Claude 的主要意见，并做如下收口：

第一，代码阶段的核心改造点不应再停留在“补方法论”。方法论已经有 memory、trace、workset、状态位、影响半径、多 agent handoff、误差面板、失败上移等机制。后续真正要做的是让 `plan/tasks/implement/analyze/gate` 模板和这些机制对齐。

第二，CODE/TEST anchor 应采用收窄强制策略。高风险边界对象必须进入 trace，例如 API handler、权限判断、数据迁移、事件处理、核心 UI action、核心验收测试。普通内部函数不强制写 CODE anchor，避免把系统变成注释维护工程。

第三，`tasks.md` 不能变成大而全的上下文仓库。实现任务里应保留最小执行字段：任务 ID、workset、目标文件、测试文件、必要 trace anchor、required checks、allowed write set。详细背景、关系图、风险、长契约放到 source docs、memory、trace 或 workset 文件。

第四，代码阶段的双向追踪应按两条路线实现：

- 需求改动追代码：从 `spec/flow/ui/acceptance` 进入 `trace-index.md`，再进入 `Code Mapping`、workset 和目标文件。
- 代码改动反查需求：从改动文件、测试、CODE/TEST trace、同目录关系、直接 imports/calls，反查对应 flow、UI、API、data、permission、acceptance 和 open items。

第五，误删和越界修改应作为代码阶段硬规则。删除、重命名或移动文件前，必须检查 reverse trace、相关测试、直接引用和 workset 边界。如果对象仍被 requirement、flow、UI、API、测试或 memory 引用，不能静默删除，应回到任务或计划层确认。

第六，失败恢复不能默认破坏工作区。禁止把 `git reset`、`git checkout`、清空目录等动作作为默认 fallback。可自动执行的优先是隔离式策略：临时 workspace、CI workspace、临时分支、`git worktree`。如果必须触碰已有工作区，应说明改了哪些文件、失败命令是什么、为什么不能自动恢复，并给用户选项。

第七，`sp.gate` 是否拆成多模式需要后续产品决策。短期更稳的做法是先在现有 `sp.gate` 中增加阶段化判据：业务门禁、实现准入、实现后回归分别输出不同结论；如果后续发现一个文件承载过重，再拆成更明确的 gate 模式或辅助文档。

### 13.5 后续模板改造建议

后续真正修改模板时，建议按以下顺序执行：

1. 第 0 步先消除模板矛盾：`sp.plan/sp.tasks` 改成默认文档模式、实现模式由 readiness 开启；`sp.implement` 读取 SP 代码落点字段；`sp.gate` 读取 `analysis.md`；CODE/TEST 写回归属明确。
2. 增强 `sp.plan`：产出 Source Layout、Runtime Commands、Code Mapping、Test Mapping、Workset Code Boundary、Global Registry Risk、Implementation Readiness。
3. 增强 `sp.tasks`：支持文档任务和实现任务双模式，采用机械 readiness 触发；实现任务使用“全局默认 + 只写偏离”。
4. 对齐 `sp.implement`：消费实现任务字段和 plan 的代码落点；补删除、重命名、移动安全检查；禁止默认 destructive cleanup。
5. 阶段化 `sp.gate`：区分业务门禁、实现准入、实现后回归。过渡期不能把三次 gate 当成已经可执行的强制链路。
6. 增强 `sp.analyze/gate` 的代码阶段检查：先以 warning 检查代码/测试回链、acceptance 证据、未回链变更文件、stale memory 与代码冲突，再逐步把高风险项升级为硬门禁。

### 13.6 当前结论

这个改进方向值得吸收，但应保持克制：不要引入重型图数据库，不要要求每个函数都有编码，不要把 `tasks.md` 写成百科全书，也不要用破坏性 git 操作掩盖失败现场。SP 最适合的路线是轻量 trace + workset 边界 + 代码落点计划 + 必要 CODE/TEST 锚点 + 验证证据闭环。

这样既能做到需求改动可追到代码，也能做到代码改动可反查相关需求、流程、界面、接口、数据和测试，同时不会让模型被过量上下文拖慢。

本轮审核后的最终优先级是：先修命令模板断链，再逐步增强代码阶段能力。也就是说，先让 `plan/tasks/implement/analyze/gate` 之间不互相矛盾，再让它们承载更强的代码执行闭环。

## 14. 本轮 Claude / Gemini 方案审阅后的共同落地规则

本轮继续征求 Claude 和 Gemini 的方案意见后，可以确认一组共同原则。这些原则不引入重型系统，目标是让信息流更稳：不该出现的信息少出现，当前任务需要的信息尽量完整出现。

### 14.1 代码阶段是文档阶段的受控延伸

代码阶段不是新开一套流程，也不是让模型自由发挥。它应消费前面阶段已经稳定下来的结论：

- `flow` 提供业务流程主轴。
- `ui` 提供界面动作、界面元素和流程节点的绑定。
- `workset` 提供上下文边界和并行边界。
- `memory/open-items` 提供稳定事实、未决项、风险和阻断。
- `trace` 提供需求、流程、界面、接口、数据、测试、代码之间的连接。
- `plan/tasks` 把这些结论压缩成代码落点和可执行任务。
- `implement` 只执行已授权任务。
- `analyze/gate` 负责诊断、证据和阻断。

说人话：写代码前，模型必须知道这次改动属于哪个业务流程、哪个 workset、能改哪些文件、要跑哪些验证、失败时回哪一层。缺这些信息时，不应继续猜。

### 14.2 命令职责应形成代码闭环

`sp.plan` 应负责代码落点计划：

- 产出 Source Layout、Runtime Commands、Code Mapping、Test Mapping。
- 明确每个 workset 的 Allowed Write Set 和 Forbidden Write Set。
- 标记 Global Registry Risk，例如路由注册、权限矩阵、数据库迁移、全局配置、共享 schema、package manifest、lockfile。
- 给出 Implementation Readiness，说明哪些 workset 可进入实现，哪些仍需回到 `flow/ui/spec/clarify`。

`sp.tasks` 应负责生成 task packet：

- 默认保留文档任务模式。
- 只有 readiness 明确时才进入实现任务模式。
- 任务使用“全局默认 + 只写偏离”，避免每条任务堆满重复字段。
- 每个实现任务至少包含 Task ID、Workset、目标文件或目录、测试路径或验证路径、trace anchors、Required Checks、Allowed Write Set。
- 高风险任务额外写 Impact-Radius、Forbidden Write Set、Fallback Route、Writeback Target 和是否允许并行。

`sp.implement` 应负责受控执行：

- 只执行当前任务或当前 workset。
- 没有 Allowed Write Set 不开始实现。
- 发现任务缺代码落点、验证命令、验收锚点或关键上下文时，返回 `NEEDS_CONTEXT` 或上移到 `sp.tasks/sp.plan`。
- 能测试先行就测试先行；不能自动测试时，先写明手工验证路径和证据格式。
- 完成后记录改动文件、运行命令、验证结果、验收证据、proposed trace updates、open-items 变化和剩余风险。

`sp.analyze` 应负责增量诊断：

- 实现前检查任务是否具备文件路径、验证路径、trace anchors、Allowed Write Set、readiness 和未关闭 blocker。
- 实现后检查改动文件是否能回链到 task/workset/acceptance/flow/source doc，测试是否覆盖核心验收，memory 是否 stale，是否越界修改，是否产生新的 open items。
- 默认按增量范围工作；没有修改 `spec/flow/ui` 时，不应重新全量检查业务文档。

`sp.gate` 应负责阶段化决策：

- 业务门禁判断 `spec/flow/ui` 是否能进入 `bundle/plan`。
- 实现准入门禁判断 `plan.md` 的 readiness、`tasks.md` 的任务包和 `analysis.md` 的诊断证据是否足以安全进入代码阶段；如果 readiness 事实缺失或错误，回到 `sp.plan`，不要在 gate 中补造。
- 实现后回归门禁判断测试、构建、lint、类型检查、验收证据、trace、open blockers/high risks 是否允许继续。
- `sp.gate` 应消费最近的 `analysis.md` 或等价分析结果，负责 `PASS` / `FAIL` / `CONDITIONAL` / `BLOCKED` / `NEEDS_DECISION`，不应重复完整执行 `sp.analyze`。

### 14.3 CODE/TEST trace 采用轻量强制

编码机制应延续到代码阶段，但不能把所有代码都编号化。推荐规则：

- 高风险边界对象必须有 CODE/TEST trace。
- 普通内部函数、私有 helper、纯样式组件、局部 glue code 不强制 CODE anchor。
- TEST anchor 优先绑定 acceptance、flow、核心 UI action、高风险 API、权限、数据、事件和跨模块契约。
- 主索引仍以 `memory/trace-index.md` 或 feature-local trace 为主，代码内只允许对稳定边界写短 anchor。
- 测试名或测试描述可以承载 `ACC/FLOW/TEST` 信息，便于从失败测试反查业务来源。

强制 trace 的对象包括：

- public API handler。
- route entry。
- permission check。
- data schema 和 migration。
- event producer / consumer。
- external integration。
- core UI action。
- business state transition。
- acceptance-critical test。
- cross-module shared contract。
- security-sensitive、billing、payment、order、auth 等核心业务边界。

这样可以满足两条追踪路线：

- 需求改动追代码：从 `spec/flow/ui/acceptance` 到 `trace-index.md`，再到 Code Mapping、workset、目标文件和测试。
- 代码改动反查需求：从改动文件、测试、CODE/TEST trace、imports/calls、同目录关系，反查 flow、UI、API、data、permission、acceptance、open items。

### 14.4 Worker 使用 task packet 管上下文

worker 不应靠自己全量翻文档，也不应只拿一句任务描述。推荐由 coordinator 或命令模板组装 task packet。

task packet 至少包含：

- Task ID 和 Workset。
- 当前目标和明确不做的内容。
- 相关 anchors：Spec、Flow、UI、API、Data、Permission、Event、Acceptance、CODE/TEST。
- 必需 source docs、memory 条目、open items。
- 目标源码、目标测试、相邻文件或失败测试。
- Allowed Write Set 和 Forbidden Write Set。
- Required Checks 和手工验证路径。
- Impact-Radius triggers。
- Handoff、proposed trace updates、proposed memory/open-items updates。

worker 开始前必须做 Context Completeness Check：

- 是否知道目标文件或目录。
- 是否知道验收锚点。
- 是否知道验证命令或手工验证路径。
- 是否知道写入边界。
- 是否知道相关 open blocker 或 high risk。
- 是否知道是否触发 API、data、permission、UI、event、cross-module 风险。

如果任何关键项缺失，worker 不应继续实现，应返回 `NEEDS_CONTEXT`、`NEEDS_PLAN`、`NEEDS_TASKS` 或 `NEEDS_DECISION`。

### 14.5 并行 agent 默认文件级隔离、串行合并共享状态

为了降低冲突，默认规则应保守：

- 并行任务默认以文件或强隔离模块为边界。
- 两个并行 worker 默认不能修改同一个实体文件。
- 并行 worker 默认不能直接修改共享的 `tasks.md`、`memory/open-items.md`、`memory/trace-index.md`。
- 并行 worker 只能提交 proposed updates，由 coordinator 串行合并。
- 涉及全局注册表、权限矩阵、数据库 schema、迁移、共享类型、公共 API、package manifest、lockfile 的任务默认不可并行。

如果未来要支持同文件内 AST 区块级并行，必须依赖可靠的 AST 合并工具和更强的冲突检查；在没有这类基础设施前，不应作为默认策略。

### 14.6 删除、移动、重命名和跨模块修改默认高风险

以下操作默认属于 high-risk code operation：

- 删除文件、删除导出符号、删除 API、删除测试。
- 移动文件、重命名文件、重命名 public symbol。
- 修改 public API contract、database schema、permission rule、route registry、event name/payload。
- 修改 shared type/schema、package manifest、lockfile、generated code。
- 跨 workset、跨模块、跨共享依赖修改。
- 大范围格式化。

执行前必须做 Reverse Trace Check：

- 是否被 `trace-index` 引用。
- 是否关联 FLOW、UI、API、DATA、PERM、EVENT、ACC。
- 是否被测试覆盖或依赖。
- 是否被 imports/calls 引用。
- 是否被 memory/open-items 提及。
- 是否属于其他 workset。
- 是否是 public boundary。
- 是否需要 migration、compatibility 或 fallback。

如果对象仍被需求、flow、ui、api、test、memory 或其他 workset 引用，不能静默删除。高风险删除、移动、重命名应由 `sp.plan` 或 coordinator 明确授权；必要时由 `sp.gate` 输出 NEEDS_DECISION。

测试是验收证据。worker 不能删除或弱化测试，除非任务明确说明对应 acceptance 已变化或测试已过期，并提供替代证据。

### 14.7 失败恢复保留现场，不默认破坏工作区

失败恢复应延续当前稳定策略：

- 优先使用临时 workspace、CI workspace、临时分支或 `git worktree`。
- 不默认执行 `git reset`、`git checkout`、清空目录等破坏性动作。
- 如果必须清理本地现场，先说明改了哪些文件、失败命令、当前判断、不能自动恢复的原因，再给用户选项。

这条规则和代码阶段尤其相关，因为实现失败时很容易混入有效改动、用户已有改动和失败尝试。默认破坏性清理会降低稳定性。

## 15. 本轮用户决策

本节记录对第 14 节剩余分歧点的最终选择。后续改命令模板时，应按这些规则落地。

### 15.1 Trace anchor 先做轻量检查，不立即强门禁

决策：

- 采用轻量检查脚本或等价 `sp.analyze/gate` 检查。
- 初期默认输出 warning，不立即阻断流程。
- 检查重点是代码里的短 `@trace` 是否在 `trace-index.md` 或 feature-local trace 注册，以及 trace 中登记的 CODE/TEST 文件是否仍存在。
- 等规则稳定后，再把高风险边界对象缺 trace、trace 指向不存在文件、核心验收缺 TEST 证据等问题逐步升级为 gate blocker。

原因：

这能防止 trace 腐烂，又不会在规则早期把流程卡死。当前阶段优先保证框架能稳定走完，再逐步提高门禁严格度。

### 15.2 Worker 扩读原因默认写入 task evidence

决策：

- worker 默认只使用 task packet 中的最小必要上下文。
- 当命中高风险、上下文不足、跨切面影响时，可以按需读取相关 `workset`、`memory` 或 source docs。
- 每次扩读应在当前任务的 handoff、task evidence 或实现收口记录中说明原因。
- 只有扩读发现真实风险、缺失信息、阻断项或需要后续追踪的问题时，才同步写入 `memory/open-items.md`。
- 不新增单独审计日志作为默认机制。

原因：

task evidence 和当前任务直接绑定，模型、人和后续 reviewer 都容易理解为什么扩读。把所有扩读都写入 open items 会污染未决事项；单独审计日志当前过重。

### 15.3 软删除清退写入 open-items，代码标记只做辅助

决策：

- 默认优先物理删除废弃代码，并依赖 git 历史追溯。
- 只有公共 API 兼容、不可逆数据迁移、灰度保留、trace 不清或影响半径过大等高风险场景，才允许临时软删除或墓碑标记。
- 一旦采用软删除，必须在 `memory/open-items.md` 写入清退项。
- 清退项至少包含：清退对象、清退原因、关联 trace、清退期限或触发条件、验证要求、负责人或后续命令路线。
- 代码中的短 `@deprecated until ...` 或等价标记只能作为辅助提示，不能替代 `open-items.md` 的主记录。
- `sp.analyze/gate` 后续应检查过期软删除项，过期后输出 warning 或 blocker，视风险级别决定。

原因：

软删除能降低高风险场景的误删风险，但默认软删除会堆死代码、污染搜索和模型反查。把清退责任写入 open-items，可以用现有 SP 机制追踪，不需要引入额外系统。

## 16. Claude / Gemini 共同审核后确认的补强项

本节记录 Claude 和 Gemini 在再次审核代码阶段方案后共同认为需要补强、且当前没有实质分歧的部分。这些内容应进入方法论和后续命令模板，不作为待决异议保留。

### 16.1 readiness 必须只有一个权威来源

实现准入不能同时由 `plan.md`、`analysis.md`、`gate.md`、`tasks.md` 各自声明一套结论，否则模型会挑到过期结论继续执行。

推荐规则：

- `plan.md` 的 `Implementation Readiness` 是实现准入事实的唯一权威来源，负责说明哪些 workset 可进入实现、缺什么前置条件、不能实现的原因是什么。
- `sp.analyze` 负责诊断 readiness 是否真实、是否过期、是否和代码落点、验证命令、open items 冲突。
- `sp.gate` 负责做阶段决策：`PASS`、`FAIL`、`CONDITIONAL`、`BLOCKED`、`NEEDS_DECISION`，但不另造一套 readiness 事实。
- `tasks.md` 只能消费 readiness 生成任务，不应自行发明 readiness。

### 16.2 tasks 必须有机械任务模式

`sp.tasks` 支持文档任务和实现任务后，必须让模型能机械判断当前任务属于哪一种。

推荐规则：

- 每个任务或任务分组应有 `Mode: doc` 或 `Mode: impl`。
- `sp.implement` 只允许执行 `Mode: impl` 的任务。
- `Mode: doc` 任务只能修改文档、memory、trace、open items、计划或检查产物，不能写生产代码。
- 如果任务没有模式，默认按 `Mode: doc` 处理，除非 `sp.tasks` 明确重建任务并补齐实现准入证据。

这能避免“文档任务被 implement 当成代码任务执行”的漂移。

### 16.3 全局默认必须随任务一起可见

“全局默认 + 只写偏离”可以降低 token 和文件体积，但 worker 不能看不到默认规则。

推荐规则：

- task packet 必须包含一份压缩后的 effective defaults，至少包括默认 Forbidden Write Set、默认 Fallback Route、默认 Writeback Rule、默认 Required Evidence。
- 或者，task packet 必须指向一个很小、只读、稳定的 defaults 文件，worker 开始前必须读取。
- 不允许只在方法论里写默认规则，然后让 worker 靠记忆执行。

当前更稳的落地方式是：先把压缩 defaults 放进 task packet。未来如果 defaults 稳定且自动化成熟，再抽成小文件。

### 16.4 共享可变文件只能串行合并

并行 worker 不能直接抢写共享 truth 文件。

共享可变文件包括：

- `tasks.md`
- `memory/open-items.md`
- `memory/trace-index.md`
- `memory/worksets/*`
- feature 级路由、稳定摘要、全局状态摘要

推荐规则：

- worker 只提交 proposed updates。
- coordinator 或串行 closeout 任务统一合并。
- `[P]` 任务的 Allowed Write Set 必须互不重叠。
- 涉及共享注册、全局配置、路由、schema、权限、迁移、lockfile、package manifest 的任务默认拆成串行 integration task，不作为并行 worker 任务。

### 16.5 删除、移动、重命名不能只依赖 trace

轻量 trace 不会覆盖所有低风险对象，所以删除或移动对象时不能只看 `trace-index.md`。

推荐规则：

- 如果对象在 trace 中存在，先做 reverse trace。
- 如果对象不在 trace 中，仍要做轻量引用扫描，例如文本搜索、imports、calls、路由注册、测试引用、同目录引用。
- 找到引用但无法判断是否安全时，应上移到 `sp.plan` 或 `sp.tasks` 重新确认影响范围。
- 高风险边界对象仍按 blocker 处理，不能因为 trace 缺失就当作“没人用”。

### 16.6 trace warning 必须有升级路径

初期把 trace 缺口作为 warning 是合理的，但 warning 不能永远无人处理。

推荐规则：

- 高风险边界对象的 trace 缺失应直接阻断或进入 `NEEDS_DECISION`。
- 普通 trace warning 可以继续推进，但必须写入 task evidence、analysis 报告或 `memory/open-items.md`。
- 同一 trace warning 跨阶段仍未处理，或影响验收、测试、发布、回滚、人工决策时，应升级为 blocker。

### 16.7 implement 证据不是 release 证据

`sp.implement` 记录的验证证据是任务审计信息，不等于最终发布或合并证据。

推荐规则：

- worker 或单任务实现完成后，必须记录本任务运行了什么检查、结果如何。
- workset 或阶段收口时，`sp.analyze` 或 coordinator 应独立复核关键检查结果。
- `sp.gate` 决策时应以最新可复核证据为准，不能只相信 worker 自报。
- 对核心验收、构建、测试、lint、类型检查、关键手工验证，能重跑的优先重跑；不能重跑的必须说明原因和替代证据。

### 16.8 analyze 和 gate 的边界必须固定

`sp.analyze` 和 `sp.gate` 都看证据，但不能混成一个命令。

推荐规则：

- `sp.analyze` 输出 findings、evidence、warnings、blockers、stale memory、trace gaps 和建议路线。
- `sp.gate` 读取 analyze 结果和当前关键证据，做 `PASS`、`FAIL`、`CONDITIONAL`、`BLOCKED`、`NEEDS_DECISION`。
- `sp.gate` 不应完整重算 `sp.analyze` 的所有检查；它只做必要复核和阶段决策。

### 16.9 plan 阶段不要过早承诺符号级映射

代码还没实现前，`plan.md` 不应强行写太细的函数级、类级、符号级 trace。

推荐规则：

- `sp.plan` 的 Code Mapping 默认保持到模块、边界对象、workset、目录或关键文件级别。
- 实现后稳定下来的 CODE/TEST 关系，再进入 `trace-index.md` 或 feature-local trace。
- 只有 public API、权限规则、数据迁移、核心测试、事件边界这类高风险对象，才提前要求稳定 CODE/TEST anchor。

### 16.10 软删除必须有生命周期

软删除、墓碑标记、兼容保留不能只写一句“以后清理”。

推荐规则：

- 一旦采用软删除，必须在 `memory/open-items.md` 建清退项。
- 清退项必须包含对象、原因、关联 trace、清退触发条件或期限、验证要求、负责人或后续命令路线。
- `sp.analyze/gate` 应检查过期清退项，必要时升级 warning 或 blocker。

## 17. 本轮最终采纳并落地的规则

用户已确认采纳以下方案。本节作为最终决策记录，不再作为待决异议。

1. `CODE` 和 `TEST` 作为正式 trace 类型或字段。高风险边界对象和验收关键测试必须登记或提出登记建议；普通内部 helper、私有函数、纯样式组件和局部 glue code 不强制登记，避免源码污染和维护放大。
2. task packet 初期直接包含压缩后的 effective defaults，至少包括 Forbidden Write Set、Fallback Route、Writeback Rule、Required Evidence。未来规则稳定且自动化成熟后，再考虑抽成小型只读 defaults 文件。
3. trace warning 有升级路径。高风险缺 trace 直接阻断或进入 `NEEDS_DECISION`；普通 warning 可继续推进，但必须记录在 task evidence、analysis 或 `memory/open-items.md`。跨阶段未解决，或影响验收、测试、发布、回滚、人工决策时，升级为 blocker。
4. `Allowed Write Set` 不足时不能自动扩权。代码边界、workset 或 source layout 错误时返回 `NEEDS_PLAN`；任务拆分、字段、验证路径或 task packet 不完整时返回 `NEEDS_TASKS`。
5. 上述规则必须进入实际命令模板：`sp.plan` 负责代码落点和 `Implementation Readiness`，`sp.tasks` 生成 `Mode: doc` / `Mode: impl` 与任务包，`sp.implement` 只执行 `Mode: impl` 并遵守写入边界，`sp.analyze` 诊断 readiness/trace/task packet，`sp.gate` 消费 analysis 并做阶段决策。
