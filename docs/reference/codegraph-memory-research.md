# CodeGraph 对 SP Memory 的借鉴评估

日期：2026-05-23

本文记录 Codex 与 Gemini 对 [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) 的调研结论，重点判断它对 SP memory、trace、open-items 和上下文窗口管理是否有借鉴价值。

## 调研范围

Codex 阅读了 CodeGraph 当前 `main` 的以下本地文件：

- `README.md`
- `src/types.ts`
- `src/db/schema.sql`
- `src/context/index.ts`
- `src/graph/queries.ts`
- `src/graph/traversal.ts`
- `src/sync/index.ts`
- `src/sync/watcher.ts`
- `src/search/query-parser.ts`
- `src/installer/instructions-template.ts`

Gemini 基于上述摘录进行了离线复核，结果保存于 `/tmp/sp_gemini_codegraph_research.txt`。

## CodeGraph 的核心思想

CodeGraph 不是普通 memory 文档，而是一个本地代码知识图谱。

它把代码解析成节点和边：

- 节点包括 file、module、class、function、method、route、component 等。
- 边包括 contains、calls、imports、exports、extends、implements、references、type_of、returns 等。
- 每个节点有稳定 `id`、`qualifiedName`、`filePath`、行号、签名、docstring 和更新时间。

它的上下文构建流程也很清晰：

1. 先解析任务输入。
2. 用精确符号搜索和文本搜索找到入口点。
3. 从入口点按图关系展开。
4. 只抽取少量关键代码块。
5. 按预算输出给 agent。

默认预算非常克制：`maxNodes=20`、`maxCodeBlocks=5`、`maxCodeBlockSize=1500`、`searchLimit=3`、`traversalDepth=1`。

## 对 SP 最有价值的借鉴

### 1. 查询优先，而不是全文重读

CodeGraph 的思想是：先找到入口点，再沿关系展开，不要一上来全仓搜索和大段读取。

SP 可以借鉴这个原则，但不需要引入 AST 图数据库。SP 已经有 `memory/index.md`、`trace-index.md`、`open-items.md`、worksets 和 source docs，可以把它们当成轻量索引。

落地方式：

- 命令先读 routing 和 feature memory。
- 从 `trace-index.md` 找到相关 workset、界面、接口、表、验收路径。
- 只展开当前任务需要的 source docs。
- 发现缺口再扩大读取范围，而不是默认读完整 feature 树。

### 2. 稳定节点和关系类型

CodeGraph 用 node/edge 明确表达“谁包含谁、谁调用谁、谁引用谁、谁会受影响”。

SP 可以用更轻的 Markdown 方式表达类似关系：

- `FEAT01.WS02.API02` 这类稳定坐标是轻量 node。
- `trace-index.md` 中的 flow、screen、api、table、permission、acceptance 关系是轻量 edge。
- `open-items.md` 的 `Anchor` 和 `Affected Docs` 是风险或 todo 回链。

这能降低模型重复推理成本。模型不用每次重新猜“这个接口对应哪个界面和验收路径”，而是先从 trace 关系进入。

### 3. 影响半径先行

CodeGraph 有 `impact` 查询，先判断改一个节点会影响哪些调用者、依赖方和相关文件。

SP 可以把这个思想用于文档和实现阶段：

- 修改 API 前，先看对应 screen、table、permission、acceptance、tests。
- 修改 UI 前，先看对应 flow、field、validation、permission、acceptance。
- 关闭风险前，先确认 affected docs 和 trace anchor 都已同步。

这不需要复杂算法，先做成命令规则和轻量检查即可。

### 4. 上下文预算是硬纪律

CodeGraph 默认限制搜索入口、遍历深度、节点数和代码块大小。这个思想和 SP 当前方法论一致：上下文窗口是工程资源，不是无限缓存。

SP 应继续坚持：

- 先小范围读取。
- 有证据再扩展。
- 大 feature 拆成 workset。
- 过大的 workset 提升为子 feature。
- 不把 open-items、trace、stable-context 写成大而全数据库。

### 5. 新鲜度和降级策略

CodeGraph 通过 watcher、manual sync、git hook 等方式处理索引新鲜度，而且 watcher 失败不会直接 crash。

SP 的轻量版本应该是：

- 不引入实时 watcher。
- 用 `sp.analyze`、`sp.gate`、`check-sp-memory` 做阶段性新鲜度检查。
- 发现 memory stale 时，向上回到正确的 `sp.*` 阶段。
- 不能因为辅助检查失败导致主流程无意义中断；应报告证据并给出下一步。

## 不建议现在引入的内容

### 1. 不建议把 SQLite / Tree-sitter / MCP 图数据库放进 SP 主链路

原因很直接：它会显著增加安装依赖、跨平台失败点和维护成本。

SP 当前的目标是尽量保持 upstream Spec Kit 的安装和运行机制稳定。把 CodeGraph 的完整运行时塞进主机制，会破坏这个目标。

### 2. 不建议引入实时文件监听

文件监听在 macOS、Windows、Linux、WSL、Docker、远程盘上的行为差异很大。CodeGraph 自己也有 watcher 禁用和降级逻辑。

SP 更适合阶段性检查，而不是常驻监听。

### 3. 不建议把 trace-index 做成复杂图数据库

trace-index 的价值是模型可读、可搜索、可手工维护。如果为了模拟 CodeGraph 把它做成复杂 schema，反而会增加 token 和维护成本。

## Gemini 的独立意见

Gemini 的主要判断：

- 可借鉴：上下文预算管道、agent 行为指令、基于 git hook 或手动命令的轻量一致性检查。
- 不建议引入：AST 解析、SQLite 知识图谱、实时 watcher、复杂图遍历。
- 需要验证：过强的“禁止 grep/read”会不会让模型在需要全局信息时上下文不足；静态预算阈值是否会截断关键上下文。
- 推荐顺序：先优化 agent 指令模板，再引入上下文预算，再考虑轻量一致性检查。

Codex 对 Gemini 意见的判断：

- 同意“不引入重运行时”的结论。
- 同意“预算和查询优先”是最适合 SP 当前阶段的借鉴点。
- 对“禁止 grep/read”需要收窄。SP 不应禁止搜索，而是要求先读 routing/memory；当 memory 不足、过期或冲突时，可以有证据地扩展搜索。
- 对“git hook”保持谨慎。它可以作为可选增强，不应成为安装后的强制路径，避免破坏 upstream-like 稳定机制。

## 推荐落地顺序

### 第一步：文档和命令规则先吸收

把 CodeGraph 的思想翻译成 SP 已有规则：

- 查询优先：先 memory，再 source docs。
- 关系优先：先 trace anchor，再全文搜索。
- 影响半径：修改前看相关 flow、UI、API、table、permission、acceptance、tests。
- 预算优先：超过当前 workset 能承载的范围时拆分或上移。

这一步风险最低，符合 SP 当前机制。

### 第二步：轻量检查继续补强

在现有 `check-sp-memory` 基础上，逐步增加稳定规则：

- 主坐标重复。
- `@r0` 无 open risk。
- 复杂 `@t0` 无 open item。
- open-items 缺 trace/source 回链。
- gate PASS 但仍存在 open blocker。

这些检查已经有部分落地，后续只应小步增加。

### 第三步：可选外部集成，而不是主机制依赖

如果未来用户项目本身安装了 CodeGraph，可以把它作为可选辅助工具：

- 在实现阶段用 CodeGraph 查代码影响半径。
- 在大型代码库中用 CodeGraph 替代低效 grep/read 循环。
- 但 SP 安装、命令模板、memory 文件不应依赖 `.codegraph/` 必然存在。

## 结论

CodeGraph 对 SP 的主要价值不是“复制它的技术栈”，而是借鉴它的控制思想：

- 先查索引，再扩上下文。
- 用稳定 ID 和关系减少重复推理。
- 修改前先看影响半径。
- 输出上下文必须有预算。
- 新鲜度检查要有降级路线，不能无意义中断。

当前建议：只把这些思想吸收到 SP memory 方法论、命令规则和轻量检查里。不要在本轮把 CodeGraph 运行时纳入 SP 主安装链。

## Gemini 后续复核记录

Gemini 对本次落地改动的总体判断是：方向合理，边界克制，符合“借鉴 CodeGraph 控制思想，不引入重运行时”的原则。

Gemini 认可的证据：

- 计划文档已经明确不要求 SQLite、Tree-sitter、MCP server 或实时 watcher。
- `sp.implement` 已经写明 CodeGraph 只能作为可选辅助证据，必须能回退到 SP memory、source docs、search 和 tests。
- `sp.tasks` 要求任务生成阶段提供足够 trace/workset 上下文，避免实现阶段隐藏影响分析。

Gemini 提出的建议中，Codex 采纳了两点：

- 在 `sp.implement` 中增加简短 `Impact-Radius Evidence` 留痕要求。触发影响半径检查的任务，需要列出直接相关的 trace/workset anchors、source docs 和 tests，或说明未发现直接相邻影响。
- 在 `trace-index.md` 模板中增加说明：如果目标项目已经安装外部 CodeGraph，可作为影响分析的可选辅助证据，但不能要求它存在，也不能把其数据库或 watcher 状态当作 feature source of truth。

Gemini 有一处事实误判：

- 它认为 `tests/test_sp_methodology_templates.py` 没有把 `implement` 纳入 open-items 读取测试。实际当前 `test_risk_sensitive_commands_read_open_items_before_deciding` 已经包含 `implement`，并且新增测试也钉住了影响半径规则和 CodeGraph 非必需依赖。

Codex 对 Gemini 建议的边界处理：

- 不要求每个小修改都输出影响半径报告，只在 API、UI 字段、表/数据结构、权限、事件、验收或测试等关键变更触发。
- 影响半径默认只看直接相邻关系，不做多跳图遍历，避免增加 token 和推理负担。
- 不把 CodeGraph 写入安装依赖、强校验项或默认工作流，只保留为可选工具和设计参考。

## 方法论文档落地记录

Codex 已将本调研结论同步到 `docs/reference/sp-project-methodology.md`：

- 在上下文管理模型中新增“查询优先，关系优先”：先读 project/feature memory、trace-index、worksets、open-items，再按直接关系展开。
- 在编码防遗忘规则中新增影响半径检查：触及 API、UI、table、permission、event、acceptance 或关键测试时，先检查直接相邻的 flow、screen、contract、table、permission、acceptance、test、open item 和风险锚点。
- 要求影响半径检查只留下简短 `Impact-Radius Evidence`，不把安全检查变成长报告。
- 明确 CodeGraph 或类似工具只能作为可选辅助；工具不可用、过期或输出不一致时，回退到 memory、source docs、文本搜索和测试证据。
- 明确不把 `trace-index.md` 改造成图数据库，不让外部 CodeGraph 成为 source of truth。
