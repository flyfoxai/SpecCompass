# SP项目下一步完善工作计划

## 说明

本计划用于指导 SP 项目在“结构化编码、状态位、open-items 记忆机制”收口后的下一步完善。

本计划由 Codex 根据当前项目状态整理，并已吸收 Claude Opus 4.7 的审查意见。后续新版 Spec Kit 迁移或 SP 机制继续增强时，应先复用本计划中的边界规则，再根据真实项目反馈补充。

当前已经确定的基本规则：

- 主坐标用于稳定定位，例如 `FEAT01.WS02.ACC01`。
- 副标签用于关联，例如 `API-APPROVE`、`ACC-DECISION-SUCCESS`。
- 状态位只做搜索入口，例如 `@t0` 表示需要验证，`@r0` 表示存在未关闭风险或 blocker。
- todo、risk、blocker 的完整原因、影响、负责人、回退建议和关闭条件，进入 `memory/open-items.md`。
- Low/Medium 的 `Question` / `Todo` 可以保持轻量；`Risk`、`Blocker`、High 严重性或影响范围、验收、发布、回滚、安全、实现信心的事项必须使用完整记录。
- `memory/index.md` 负责把模型路由到正确 memory 文件，不让模型每次全量重读。
- workflow YAML 采用开放 schema：未知字段只警告、不阻断、不假装理解；真正结构错误仍失败。
- CodeGraph 这类代码知识图谱只作为设计参考或可选外部助手，不进入 SP 主安装链。SP 默认仍使用 Markdown memory、trace-index、open-items、worksets 和轻量检查，避免引入 SQLite、Tree-sitter、MCP server 或 watcher 造成跨平台不稳定。

## 当前收口状态

截至当前版本，以下内容已经落地：

- `open-items.md` 已区分轻量项和高影响项。Low/Medium 的 `Question` / `Todo` 可轻量记录；`Risk`、`Blocker`、High 严重性或影响关键交付面的事项必须补全 owner、影响范围、回退/降级、关闭条件、刷新时间和 trace/source 回链。
- `check-sp-memory.sh` 和 `check-sp-memory.ps1` 已加入轻量检查。轻量项缺少 trace/source 回链只给 WARN，高影响项缺少回链给 ERROR。
- workflow YAML 校验已改为开放式。未知字段会输出 warning 并继续执行，避免未来扩展或模型友好元数据直接造成安装/运行中断。
- Codex 安装烟测已增加 `/sp.*` 用户调用形式检查，并已确认核心 skill 目录也必须使用 `sp.*`，不能再把 `sp-*` 当作内部细节。
- 已完成 CodeGraph 调研并形成 `docs/reference/codegraph-memory-research.md`。结论是吸收“查询优先、关系优先、影响半径、上下文预算、新鲜度降级”这些控制思想，但不把 CodeGraph 运行时纳入核心机制。
- `docs/reference/sp-project-methodology.md` 已固化 CodeGraph 借鉴边界：先从 memory、trace、workset、open-items 进入；只按直接相邻关系扩展上下文；触及 API、UI、表、权限、事件、验收或关键测试时留下简短 `Impact-Radius Evidence`；CodeGraph 只能作为可选辅助，不能成为 source of truth，也不能阻断 `/sp.*` 主流程。

## CodeGraph 借鉴边界

为什么做：

CodeGraph 的价值在于把代码库预先整理成节点、关系和影响路径，让 agent 不必反复全仓搜索。这个方向和 SP 的 memory 目标一致：减少重复读取、降低 token 浪费、让模型先从稳定入口进入当前任务。

但 SP 当前的稳定性目标是尽量贴近 upstream Spec Kit 的安装和运行机制。如果把 SQLite、Tree-sitter、MCP server 或实时 watcher 放进主链路，会增加环境依赖和故障面，反而破坏“稳健、低 token、少人工介入”的目标。

因此本项目采用“借鉴思想，不引入重运行时”的路线。

可吸收的部分：

- 查询优先：先读 project/feature memory，再按 trace 和 workset 展开。
- 关系优先：优先使用稳定坐标、trace anchor、affected docs，而不是从零推理关系。
- 影响半径：修改 API、UI、表、权限、事件、验收或测试前，先确认相关 flow、screen、contract、table、permission、acceptance、tests 是否受影响。
- 上下文预算：从最小读集开始，有证据再扩一层，不默认全量读取。
- 新鲜度降级：memory 或辅助检查过期时，向上回到正确 `sp.*` 阶段，不让辅助机制把主流程卡死。

不纳入主链路的部分：

- 不要求安装 SQLite 图数据库。
- 不要求安装 Tree-sitter 解析器。
- 不要求启动 MCP server。
- 不要求实时文件 watcher。
- 不把 `trace-index.md` 改造成复杂图数据库或强 schema。

可选增强方向：

- 如果用户项目已经安装 CodeGraph，可在实现阶段把它作为可选查询工具，用来辅助判断代码影响半径。
- 如果 CodeGraph 不存在，SP 必须正常回退到默认的 memory、trace、grep/read 和测试路径。
- 任何可选工具输出都只能作为证据来源之一，不能替代 `sp.analyze`、`sp.gate`、测试和 source docs。

验收标准：

- 默认安装不依赖 CodeGraph。
- 命令模板能表达“先查 memory/trace，再扩上下文”的规则。
- 实现前能提示模型做影响半径检查，但不会强制引入新工具。
- CodeGraph 相关内容能在参考文档中找到，且不会和主安装机制混在一起。
- 方法论文档能说明“查询优先、关系优先”和“影响半径只看直接相邻关系”的默认执行边界。

## 近期必须做

### 1. 一次性收口 feature 初始化模板与记忆回链规则

为什么做：

新 feature 初始化出来的模板质量，决定后续 `sp.analyze`、`sp.gate` 和实现阶段是否会反复补洞。现在 `open-items.md` 已经有 `Anchor`、`Tags`、`Close Condition`，下一步不是把 `trace-index.md` 做成大而全数据库，也不是在模板里预置假 `OPEN-*` / `RISK-*`，而是让真实未决项一出现就能形成可搜索、可验证的单向回链。

这里要坚持一个边界：`open-items.md` 负责记录 todo、risk、blocker 的完整上下文；`trace-index.md` 负责记录流程、界面、接口、表和验收的 trace 链。两者通过稳定坐标和 source docs 关联，不在 trace 里再维护一份风险反向列。

要改哪些位置：

- `templates/project/.specify/templates/feature/memory/open-items.md`
- `templates/project/.specify/templates/feature/memory/trace-index.md`
- `templates/project/.specify/templates/feature/memory/worksets/`
- `docs/reference/sp-project-methodology.md`

建议改法：

- 不在 `trace-index.md` 中新增 `Open Items` / `Risk` 反向列，避免 trace-index 变成大而全数据库。
- `open-items.md` 的 `Anchor` 必须优先使用固定框架坐标，或使用已经能在 `trace-index.md`、source docs 中解释的稳定锚点。
- 明确定义“回链成立”：`open-items.Anchor` 能命中 `trace-index.md` 中至少一个 cell，或 `open-items.Affected Docs` 能命中 `trace-index.md` 的 `Expand Docs` 中至少一个文件。
- 初始化模板中的 `open-items.md` 默认保持空表，只提供字段、创建规则、提醒维度和条件风险规则。
- Low/Medium 的局部 `Question` / `Todo` 可以轻量记录，避免把小问题都变成填表负担。
- `Risk`、`Blocker`、High 严重性或影响范围、验收、发布、回滚、安全、实现信心的事项必须完整记录。
- 只有当前 feature 有真实证据时，才创建 `OPEN-*`、`RISK-*`、`Blocker` 或 `Todo` 行。
- 提醒维度放在方法论和命令检查规则里，不作为默认未决项写入 feature memory。

验收标准：

- 新 feature 初始化后，`open-items.md` 不包含默认 `OPEN-*` 或 `RISK-*` 业务行。
- 当真实 `RISK-*` 或 `OPEN-*` 被创建后，能找到它影响的 workset、source docs、acceptance 和关闭条件。
- 当真实 `@r0` 被写入后，能进入 `open-items.md`，再进入对应 trace row 或 affected source docs。
- 新项目执行 feature 初始化后，`memory/index.md` 能引导模型进入最小上下文。
- 真实 open item 与 `trace-index.md`、workset 文件或 affected source docs 之间没有断链。
- `sp.analyze` 能发现“有风险但没有 trace 回链”的问题。
- `sp.analyze` 的 FAIL 主要来自真实业务缺口，而不是模板自相矛盾。

风险：

- 模板不能太满。默认内容越多，越容易误导具体项目。应保留结构、规则和提醒维度，不替用户发明业务事实。
- trace-index 不要承担风险台账职责。它只需要能被 open-items 的 anchor 或 affected docs 搜到。

### 2. 增加 `@t0` / `@r0` 的轻量检查

为什么做：

状态位的价值在于可搜索、可检查。如果只有方法论，没有检查规则，后续模型仍可能写了 `@r0` 但没有对应 `RISK-*`。

要改哪些位置：

- `templates/commands/analyze.md`
- `templates/commands/gate.md`
- 已新增轻量测试和 `check-sp-memory` 检查；后续仍不要做重型 schema。

建议改法：

- `sp.analyze` 检查：行内有 `@r0` 时，必须能在 `memory/open-items.md` 找到对应 `RISK-*` 或 blocker。
- `sp.analyze` 检查：复杂 `@t0` 必须能找到 `OPEN-*` 或 `RISK-*`。
- 轻量 Low/Medium `Question` / `Todo` 缺少 trace/source 回链只提示 WARN；高影响项缺少回链必须报 ERROR。
- `sp.gate` 检查：未关闭 `@r0` 不能直接 PASS，除非风险已被明确接受并有关闭或豁免依据。
- “复杂 `@t0`”的判定标准直接沿用方法论：影响范围不清、需要后续动作、需要人工决策、影响验收、影响发布或需要回退建议时，必须进入 `memory/open-items.md`。

验收标准：

- 构造一个缺失 `RISK-*` 的 `@r0` 示例，`sp.analyze` 应报告 FAIL 或 blocking finding。
- 构造一个未关闭 `RISK-*` 示例，`sp.gate` 不应轻易 PASS。

风险：

- 检查不要过度严格。简单临时备注不应强制进入 open-items，只有影响范围不清、需要后续动作、影响验收或发布的事项才强制登记。

### 3. 明确 `sp.gate` 的 open-items 准入判定

为什么做：

`sp.gate` 当前的问题不是完全不读 `open-items.md`，而是缺少足够明确的判定规则。模型读到了风险，但如果不知道 `Blocker=Open` 或 `Risk=Open` 应该怎样影响 verdict，就可能继续给出不稳的 PASS。

要改哪些位置：

- `templates/project/.specify/templates/feature/memory/open-items.md`
- `templates/project/.specify/templates/feature/memory/index.md`
- `templates/commands/gate.md`

建议改法：

- `Blocker` 状态为 `Open` 时，默认不能 PASS。
- `Risk` 状态为 `Open` 时，必须有接受理由、降级理由或明确回退方案，才可有条件通过。
- `Todo` 如果影响验收、发布、数据迁移或安全合规，也不能被忽略。
- 被接受的风险必须保留 owner、revisit anchor、trace registration、impact scope、rollback/degrade path 和 close condition。
- 如果未决项的结论会导致继续前必须重写 `spec.md`、`plan.md` 或 `tasks.md`，`sp.gate` 不能 PASS。

验收标准：

- open blocker 存在时，gate 输出 FAIL 或 CONDITIONAL，不应 PASS。
- 被接受的风险必须有 owner、revisit anchor、trace registration、impact scope、rollback/degrade path 和 close condition。
- gate 输出能说明 verdict 受到哪些真实 `OPEN-*`、`RISK-*` 或 blocker 影响。

风险：

- gate 不能变成机械阻断。某些风险可以被接受，但必须写清楚为什么接受。

## 中期应该做

### 4. 让 `sp.analyze` 对 memory 断链做差异化检查

为什么做：

`sp.analyze` 已经有项目级路由、feature 路由和 source docs 的读取顺序。下一步不应该重复写一份泛泛的读取规则，而是补它当前缺少的差异化检查：open-items 是否闭环、状态位是否能追到记录、memory stale 时应该回到哪个 `sp.*` 阶段。

要改哪些位置：

- `templates/commands/analyze.md`
- `templates/project/.specify/templates/feature/memory/index.md`
- `docs/reference/sp-project-methodology.md`

建议改法：

- 对 `open-items.md` 增加专项检查：未关闭风险、缺关闭条件、缺 trace 回链、过期刷新时间。
- 把 `@t0/@r0` 检查写成 analyze 的固定 checklist。
- 检查 memory stale 时，输出应回到哪个 `sp.*` 阶段，例如 `sp.specify`、`sp.plan`、`sp.tasks` 或 `sp.gate`。
- 检查 `open-items.Anchor` 是否能命中 `trace-index.md` 或 affected source docs。

验收标准：

- `sp.analyze` 输出的问题能追溯到具体文件和具体锚点。
- 不因为空项目或无 active feature 误扫全仓。
- 发现 memory stale 时，能标记 stale 并给出下一步应回到哪个 `sp.*` 阶段。

风险：

- 不要让 analyze 变成万能审计器。它应聚焦文档系统强度，不替代实现测试。

### 5. 增加实现后的 memory 回写闭环

为什么做：

SP 的目标不是只把设计写清楚，还要避免实现阶段把 memory 变成旧缓存。编码后如果 API、表、UI、验收路径或风险状态变化了，但 `trace-index.md`、`open-items.md`、stable memory 不更新，下一轮模型会继续按旧事实工作。

要改哪些位置：

- `templates/commands/implement.md`
- `templates/commands/tasks.md`
- `templates/project/.specify/templates/feature/memory/open-items.md`
- `templates/project/.specify/templates/feature/memory/trace-index.md`
- `docs/reference/sp-project-methodology.md`

建议改法：

- 实现阶段如果改了 API、表、UI 字段、事件顺序、权限规则或验收方式，必须更新对应 trace 或 source docs。
- 关闭 risk、todo 或 blocker 时，必须更新 `open-items.md` 的 `Status`、`Last Refresh` 和 `Close Condition`。
- `sp.tasks` 拆任务时应保留 workset 和 acceptance 回链，避免实现任务脱离 memory。
- `sp.gate` 在下一轮入口处反向校验：实现已完成但 memory 未刷新时，不应直接 PASS。

验收标准：

- 完成一个会改 API 或表的任务后，trace/source docs 有对应更新或明确说明无需更新。
- 关闭一个 `RISK-*` 后，open-items 中能看到关闭依据和刷新时间。
- `sp.gate` 能发现“实现已变但 memory 未同步”的记忆债务。

风险：

- 不要要求每个小代码改动都重写文档。只有稳定事实、接口契约、数据结构、验收路径、风险状态变化时，才必须回写。

### 6. 建立上下文窗口预算规则

为什么做：

SP 的目标之一是降低 token 消耗。memory 机制如果不配合上下文预算，模型仍可能把所有文件都读一遍。

要改哪些位置：

- `docs/reference/sp-project-methodology.md`
- `templates/commands/*.md`
- `templates/project/.specify/templates/feature/memory/index.md`

建议改法：

- 每个命令都先读 routing 文件，不直接全量读 source docs。
- 只有当前 workset 和当前 trace 相关的文件进入上下文。
- 如果发现上下文不够，先扩展一层，不一次性扩展全部。
- `sp.analyze` 这类审计型命令可以输出“本次实际读取了哪些文件”，便于复核 token 是否浪费。
- 普通执行型命令默认不输出读取清单，除非用户要求 debug，避免输出噪音稀释注意力。

验收标准：

- 一个典型 feature 分析不需要读取所有 `ui/*`、`delivery/*`、`flows/*`。
- 审计型命令能解释为什么读取这些文件。

风险：

- 上下文过小会漏信息。规则应强调“最小但充分”，不是盲目少读。

## 长期产品化

### 7. 把轻量检查脚本化

为什么做：

当规则稳定后，可以用脚本减少模型重复计算，避免每次靠自然语言重新检查。不要过早脚本化；脚本应等规则在真实 feature 中被反复验证后再引入。

要改哪些位置：

- 可考虑新增 `.specify/scripts/` 下的轻量检查脚本。
- 或加入现有测试体系。

脚本化触发条件：

- 同一套规则连续两个真实迭代没有变化。
- 人工或模型反复漏掉同一类断链问题。
- 同一个 feature 内同类检查被重复执行 3 次以上。

未来脚本约束：

- 只读、幂等，不替模型自动改业务内容。
- 不依赖复杂外部工具。
- 失败信息必须指出具体文件、行或锚点。

建议检查项：

- 主坐标重复。
- `@r0` 无对应 `RISK-*` 或 blocker。
- 复杂 `@t0` 无对应 `OPEN-*`。
- open item 缺 `Anchor`、`Close Condition`、`Affected Docs`。
- open item 的 `Anchor` 或 `Affected Docs` 无法命中 trace/source docs。

验收标准：

- 脚本能在新项目中运行，不依赖复杂外部工具。
- 脚本失败信息能指出具体文件和行。

风险：

- 不要过早引入复杂 schema 和强校验。先把最常见的断链问题查出来即可。

### 8. 形成 feature memory 事实缺口清单

为什么做：

不同项目不需要同样重的文档系统。与其引入 Level 1/2/3 这类容易形式主义的等级，不如让 `sp.analyze` 直接列出当前 feature 缺什么。事实缺口比等级标签更可执行。

建议输出：

- 是否存在 open-items 但缺 trace/source 回链。
- 是否存在 `@r0` 但缺 `RISK-*` 或 blocker。
- 是否存在复杂 `@t0` 但缺 `OPEN-*`。
- 是否存在 `Blocker=Open` 但 gate 仍准备 PASS。
- 是否存在实现变更后 memory 未回写。

验收标准：

- 用户能知道下一步补什么能提升自动化可靠性。
- 输出是事实列表，不引入抽象等级。

风险：

- 缺口清单不要变成冗长报告。只列影响后续自动化的 blocking 或 high-value gaps。

### 9. 谨慎引入 schema 或 registry

为什么做：

未来可能需要 `status-schema.yaml` 或 `coding-registry.md`，但现在直接引入会增加维护负担。

建议路线：

- 先用 Markdown 表承载规则。
- 只有当多个真实项目反复出现同类断链，才抽象成 schema。
- schema 只固化稳定规则，不固化具体业务内容。

验收标准：

- 引入 schema 前，有明确的重复痛点和脚本消费场景。
- schema 不要求用户重复填写同一事实。

风险：

- 过早产品化会让 SP 变重，违背降低 token 和降低人为介入的目标。

### 10. Workflow YAML 保持开放式扩展

为什么做：

workflow YAML 未来可能承载更多路由、审计、模型提示或执行元数据。如果 parser 对未知字段直接失败，每次新增字段都可能变成安装或运行阻断；如果 parser 静默吞掉未知字段，模型和维护者又会误以为这些字段已经生效。

当前策略：

- 未知 top-level、workflow metadata、input 或 step 字段只输出 warning，不阻断运行。
- parser 不解释未知字段，也不声称它们生效。
- `workflow.id`、版本号、step 类型、`steps` 结构等核心结构错误仍然失败。

验收标准：

- 新增一个未来扩展字段时，`workflow run` / `workflow add` 能提示 warning 并继续。
- 结构错误仍能阻断，避免无效 workflow 被当成成功执行。

风险：

- warning 不能变成噪音。后续如果某类字段已经成为正式能力，应加入已知字段表，而不是长期依赖 unknown warning。

## 总体验收标准

本阶段完善完成后，应达到以下效果：

- 模型能从 `memory/index.md` 快速进入正确上下文。
- `open-items.md` 能承载 todo、risk、blocker 的完整信息。
- `@t0/@r0` 能作为轻量搜索入口，而不是事实正文。
- `open-items.md` 能通过 anchor 或 affected docs 连接到 trace/source docs。
- `sp.analyze` 能发现文档系统断链和 stale memory。
- `sp.gate` 能用 open items 判断是否允许进入下一阶段。
- 实现阶段能把稳定事实变化回写到 memory 和 source docs。
- 新 feature 初始化后，不会因为模板自相矛盾导致无意义 FAIL。
- 规则保持轻量，不把项目变成填表工程。

## 推荐执行顺序

1. 先一次性把 feature 初始化模板和 open-items 回链规则做对。
2. 再把 `@t0/@r0` 与回链检查写进 `sp.analyze`。
3. 然后把 blocker/risk 准入写进 `sp.gate`。
4. 接着补 `sp.implement` / `sp.tasks` 的 memory 回写闭环。
5. 最后考虑轻量脚本化检查和事实缺口清单。

这条顺序的原因很简单：先保证记忆链不断，再让命令使用记忆，最后才自动化检查。不要反过来先写工具，再发现文档结构不稳定。

## Claude Opus 4.7 整体复核记录（2026-05-22）

本节为 Claude Opus 4.7 对当前项目的整体只读复核结果，由 Codex 根据 Claude CLI 输出追加到本文档。Claude 未直接修改项目文件。

### 结论

通过，有少量普通改进项。当前方法论规则已经落入关键命令模板、feature memory 模板和回归测试；没有发现必须修复项或严重风险。

Claude 认为当前 `git status` 处于一次大规模 upstream 重建迁移状态：旧 SP fork 文件大量标记为删除，新 spec-kit v0.8.11 骨架大量未跟踪。这个状态需要后续提交整理，但它本身符合当前迁移过程，不视为方法论落地风险。

### 已确认正常的部分

- `memory/index.md`、`memory/open-items.md`、`memory/trace-index.md` 的职责划分清楚。`open-items.md` 承载 question、todo、risk、blocker 的原因、影响、回退和关闭条件；`trace-index.md` 只做流程、界面、接口、数据、验收等 trace 路由，不反向维护风险台账。
- `open-items.md` 默认空表合法，不预置假的 `OPEN-*` 或 `RISK-*` 行。这能避免新 feature 一初始化就因为模板自带假风险而误导 `sp.analyze`。
- `@t0` 和 `@r0` 已经作为轻量状态入口写入 `sp.analyze`、`sp.gate` 和 memory 模板。复杂 `@t0` 或任何 `@r0` 都应能追到 `memory/open-items.md` 中的真实条目。
- 上下文预算规则已经进入 `sp.analyze`、`sp.bundle`、`sp.flow`、`sp.gate`、`sp.plan`、`sp.tasks`、`sp.ui`，并有 `tests/test_sp_methodology_templates.py` 兜底。
- 向上兜底规则已经进入 `sp.plan`、`sp.tasks`、`sp.implement` 等关键路径，并要求记录 source layer、target layer、next `sp.*` step 和 writeback 要求。
- 复杂区域拆分/提升阈值在 `sp.plan`、`sp.tasks`、`sp.analyze` 中口径基本一致，避免模型因为“文件多”或“技术难”就过度拆分。
- 用户可见命令形式保持 `/sp.*`。测试已经禁止模板中出现 `/sp-`，核心 skill 目录也应使用 `sp.*`，避免宿主暴露第二套 `sp-*` 命令面。
- `sp.gate` 没有抢二层职责。API、表、事件、迁移等二层复杂度信号留给 `sp.plan` 或 `sp.analyze` 处理，避免第一层 gate 过度设计。
- `sp.implement` 已经具备 acceptance-first、本层根因检查、两次失败后上移一层、memory/source-doc writeback 等执行纪律。

### 发现的问题

未发现必须修复项。

普通改进项如下。

1. `tests/test_sp_methodology_templates.py` 的 open-items 读取测试没有覆盖 `sp.implement` 和 `sp.analyze`。

影响：这两个模板正文已经读取或检查 `memory/open-items.md`，但测试没有把它们钉住。后续如果有人误删这部分规则，当前测试不一定能及时发现。

建议：把 `implement` 至少加入 `test_risk_sensitive_commands_read_open_items_before_deciding`；如果希望更严格，也可以把 `analyze` 加入同一测试。

2. `src/specify_cli/integrations/claude/__init__.py` 中 `_render_skill` / `_build_skill_fm` 可能是遗留死代码。

影响：当前 Claude 安装路径走 `SkillsIntegration.setup()`，实际 skill 目录命名由 `skill_directory_name()` 决定，built-in 命令使用 `sp.<name>/SKILL.md`。但 `_render_skill` 内部仍写死 `speckit-<name>` 风格。如果未来有人重新调用这段遗留方法，可能造成 Claude skill 命名分裂。

建议：后续检查这两个方法是否还有调用方。若无调用方，删除；若保留，则改成使用统一的命名函数，不要写死 `speckit-`。

3. `sp.gate` 输出格式可以更明确。

影响：`sp.gate` 已经要求更新 `gate.md`，但没有定义最小字段。如果模型自由发挥，可能出现 verdict 清楚但受影响 `OPEN-*` / `RISK-*`、复审锚点、关闭条件不够稳定的情况。

建议：给 `gate.md` 增加轻量 minimal schema，例如 verdict、blocking items、accepted risks、fallback target、revisit anchor、next step。不要做重型表格，只约束必要字段。

4. 复杂区域拆分/提升阈值缺少一致性测试。

影响：`sp.plan`、`sp.tasks`、`sp.analyze` 目前阈值口径一致，但后续修改其中一个模板时，可能出现三处规则漂移。

建议：增加一条轻量回归测试，检查关键阈值短语在三处同时存在，至少覆盖 `3+ roles`、`4+ user paths`、`5+ artifact categories`、`12+ trace anchors`、`8+ core docs` 这些稳定信号。

### 暂不建议做的事项

- 不建议现在把所有未跟踪和删除文件直接一次性 `git add`。当前仓库仍处于 upstream 骨架重建后的大迁移状态，应该先确认提交边界，再分组提交，避免旧 fork 资料和新骨架混在一个难审查的大提交里。
- 不建议给所有任务都加 fallback metadata。当前规则只要求高风险任务携带兜底信息，这是对上下文噪音的必要控制。
- 不建议把 risk、blocker、todo 状态列加回 `trace-index.md`。那会让 trace 表变成风险台账，破坏 `open-items.md` 和 `trace-index.md` 的职责分离。
- 不建议为了简化而删除 `sp.analyze` 的项目级 routing 协调。stale routing 是此前已经出现过的问题，保留协调逻辑可以避免模型从错误 feature 或错误阶段进入。

### 证据

- 命令模板：`templates/commands/analyze.md`、`templates/commands/gate.md`、`templates/commands/plan.md`、`templates/commands/tasks.md`、`templates/commands/implement.md`。
- 记忆模板：`templates/project/.specify/templates/feature/memory/index.md`、`templates/project/.specify/templates/feature/memory/open-items.md`、`templates/project/.specify/templates/feature/memory/trace-index.md`。
- 测试文件：`tests/test_sp_methodology_templates.py`，覆盖 open-items 读取、向上兜底、`/sp.*` 命令形式、open-items 与 trace-index 职责分离、上下文预算规则。
- 集成代码：`src/specify_cli/integrations/base.py`、`src/specify_cli/integrations/codex/__init__.py`、`src/specify_cli/integrations/claude/__init__.py`。

### Codex 复核补充

Codex 对 Claude 的普通改进项做了二次核对：

- `ARGUMENT_HINTS` 中的 `checklist` 和 `taskstoissues` 不是问题。当前 `templates/commands/checklist.md` 和 `templates/commands/taskstoissues.md` 均存在，对应字典项是有效的。
- `_render_skill` / `_build_skill_fm` 的遗留风险成立。当前未发现它们参与主安装路径，但内部写死 `speckit-` 与 built-in 使用 `sp.` 的方向不一致，建议后续作为清理项处理。
- `sp.implement` / `sp.analyze` 的 open-items 测试覆盖建议成立。它不会影响运行时，但能降低后续模板回退风险。
