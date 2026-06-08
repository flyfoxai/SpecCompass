# SP项目下一步完善工作计划

## 说明

本文件记录 SP 在结构化编码、状态位、open-items 记忆机制、上下文预算、稳健兜底和 CodeGraph 借鉴边界上的收口状态。它不是旧待办堆积表，而是后续升级 Spec Kit 基线、迁移 SP 增强能力、检查新版本回归时的工作指南。

本文件由 Codex 根据当前仓库状态整理，并吸收 Claude Opus 4.7 与 Gemini 多轮复核意见。后续如果新版 Spec Kit 发布，应先保持 upstream 安装和集成框架稳定，再迁移本文件列出的 SP 内容增强。

## 固化规则

- 支持 slash 命令的宿主，用户可见命令统一写 `/sp.*`，例如 `/sp.specify`、`/sp.plan`、`/sp.analyze`。
- Codex 的稳定用户入口是 skills：输入 `$`、运行 `/skills` 选择 `sp-*` skill，或提出匹配 skill description 的自然语言请求。不要把 `/sp.*` 是否出现在 Codex slash menu 里作为安装成功标准。
- Codex project-local prompt/plugin 命令面已废弃，不再作为当前目标产物。旧实验版留下的 `.codex/prompts/sp.*`、`plugins/sp/` 和 `.agents/plugins/marketplace.json` 应在安装时清理，避免误导用户和模型。
- 主坐标用于稳定定位，例如 `FEAT01.WS02.ACC01`。坐标发布后不因为排序、插入、删除而重排。
- 副标签用于关联，例如 `API-APPROVE`、`ACC-DECISION-SUCCESS`。副标签服务搜索，不替代主坐标。
- 状态位只做搜索入口。`@t0` 表示需要验证或待确认；`@r0` 表示存在未关闭风险或 blocker。旧的 `@r1` 不再使用。
- todo、risk、blocker 的完整原因、影响、负责人、回退建议、关闭条件和刷新时间进入 `memory/open-items.md`。
- Low/Medium 的局部 `Question` / `Todo` 可以轻量记录；`Risk`、`Blocker`、High 严重性或影响范围、验收、发布、回滚、安全、实现信心的事项必须完整记录。
- `memory/index.md` 负责把模型路由到正确 memory 文件，不让模型每次全量重读。
- `trace-index.md` 只做流程、界面、接口、数据、验收、workset、source docs 的 trace 路由，不反向维护风险台账。
- workflow YAML 采用开放 schema：未知字段只警告、不阻断、不假装理解；核心结构错误仍失败。
- CodeGraph 只作为设计参考或可选外部助手，不进入 SP 主安装链。默认安装不得依赖 SQLite、Tree-sitter、MCP server 或 watcher。

## 已完成收口

### 1. Feature 初始化模板与记忆回链

已完成。

- `memory/open-items.md` 默认空表合法，不预置假的 `OPEN-*` 或 `RISK-*` 业务行。
- `open-items.md` 与 `trace-index.md` 职责分离：open-items 存完整未决信息，trace-index 存跨文档定位关系。
- `open-items.Anchor` 必须优先使用稳定坐标或 trace/source anchor；否则 `Affected Docs` 应能命中 trace 行的 `Expand Docs`。
- 真实 `Risk`、`Blocker`、High 严重性或影响关键交付面的事项必须有 owner、影响范围、回退/降级、关闭条件、刷新时间和 trace/source 回链。
- feature 模板已经统一使用 `@r0` 作为未关闭风险状态，不再使用旧 `@r1`。

验收方式：

- 新 feature 初始化后，`open-items.md` 不包含默认业务风险。
- 写入真实 `@r0` 时，能进入 `memory/open-items.md` 并追到 trace row 或 affected source docs。
- `tests/test_sp_methodology_templates.py` 固化了 open-items 与 trace-index 职责边界，并禁止 feature 模板回退到 `@r1`。

### 2. `@t0` / `@r0` 轻量检查

已完成。

- `sp.analyze` 和 `sp.gate` 已接入 `check-sp-memory.sh --json` / `check-sp-memory.ps1 -Json`。
- `ERROR` 会阻断 PASS；`WARN` 不自动阻断，但必须记录判断理由。
- 非平凡 `@t0` 必须能追到 `OPEN-*`、`RISK-*` 或 blocker。
- `@r0` 必须能追到 `RISK-*` 或 blocker。
- Low/Medium 局部 `Question` / `Todo` 的 trace/source 回链缺失可以是 WARN；高影响项缺回链是 ERROR。

验收方式：

- `tests/test_sp_memory_check.py` 覆盖轻量项、高影响项、状态位断链和 warning/error 差异。
- `tests/test_sp_methodology_templates.py` 覆盖 analyze/gate 对轻量检查器的调用规则。

### 3. `sp.gate` 准入判定

已完成。

- open `Blocker` 默认不能 PASS。
- open `Risk` 只有在有接受理由、降级理由或明确回退方案时，才可有条件通过。
- 影响验收、发布、数据迁移、安全合规的 `Todo` 不能被忽略。
- 被接受的风险必须记录 owner、revisit anchor、trace registration、impact scope、rollback/degrade path 和 close condition。
- `gate.md` 初始化模板已经提供最小结构：Verdict、Evidence、Blocking Gaps、Accepted Risks、Fallback、Next Step。

验收方式：

- `tests/test_sp_methodology_templates.py::test_gate_template_preserves_minimal_verdict_schema` 固化 gate 输出结构。

### 4. `sp.analyze` memory 断链检查

已完成。

- analyze 固定检查 open-items、状态位、stale memory、trace/source 回链。
- 发现 memory stale 时，应说明回到哪个 `/sp.*` 阶段，而不是让模型原地猜。
- analyze 聚焦文档系统强度，不替代实现测试。

验收方式：

- analyze 模板和 memory checker 测试共同覆盖。
- 仍需通过真实 feature 继续观察输出质量，避免报告过长。

### 5. 实现后的 memory 回写闭环

已完成。

- `/sp.implement` 要求实现改变 API、表、UI 字段、事件顺序、权限规则或验收方式时，同步更新 trace/source docs。
- 关闭 risk、todo 或 blocker 时，必须更新 `open-items.md` 的 `Status`、`Last Refresh` 和 `Close Condition`。
- 普通任务只有在本任务实现、验证、复核或决策条件满足后才能标完成。
- 低风险、同上下文小任务允许在同一回合末批量回写，但不能拖到下一次模型调用再猜。
- 并行任务可以并行读和实现，但共享 memory 写入必须串行或由一个收口步骤合并。

验收方式：

- `tests/test_sp_methodology_templates.py` 覆盖 fast path、批量回写、共享写入串行化、失败不能伪造 evidence。

### 6. 上下文窗口预算规则

已完成。

- 命令先读 routing 文件，不默认全量读 source docs。
- 只把当前 workset、当前 trace 和直接相邻关系纳入上下文。
- 上下文不足时先扩一层，不一次性扩全仓。
- 审计型命令可以说明读取范围；普通执行命令默认不输出长读取清单，避免噪音。
- 规则强调“最小但充分”，不是盲目少读。

验收方式：

- `tests/test_sp_methodology_templates.py::test_context_budget_rule_is_present_in_state_advancing_commands` 覆盖关键命令。

### 7. 轻量检查脚本化

已完成第一阶段。

- `check-sp-memory.sh` 和 `check-sp-memory.ps1` 已进入仓库脚本源，并由安装器按 `--script sh|ps` 选择性复制到目标项目的 `.specify/scripts/bash/` 或 `.specify/scripts/powershell/`。正常非 force 安装不会同时复制两套脚本族；这是对齐 upstream 的行为，不是缺失。
- 检查器只读、幂等，不替模型自动改业务内容。
- 当前检查范围控制在高价值断链：状态位、open item 高影响字段、trace/source 回链。
- 脚本输出区分 WARN 和 ERROR，避免把所有小问题都变成硬阻断。

后续观察：

- 如果真实项目连续出现新的重复漏检，再扩展检查项。
- 不要过早引入复杂 schema 或强制 registry。

### 8. Feature memory 事实缺口清单

已完成方法和命令层落地。

- analyze/gate 应输出当前 feature 缺什么，而不是给抽象等级。
- 事实缺口包括：open-items 缺 trace/source 回链、`@r0` 缺风险记录、非平凡 `@t0` 缺 open item、open blocker 与 gate PASS 冲突、实现变更后 memory 未回写。
- 输出应聚焦 blocking 或 high-value gaps，不做冗长报告。

### 9. Schema / registry 引入边界

已决策为暂不引入重 schema。

- 先用 Markdown 表承载规则。
- 只有多个真实项目反复出现同类断链，并且已有脚本消费场景，才考虑抽象为 schema。
- schema 只固化稳定规则，不固化具体业务内容。

### 10. Workflow YAML 开放式扩展

已完成。

- 未知 top-level、workflow metadata、input 或 step 字段只输出 warning，不阻断运行。
- parser 不解释未知字段，也不声称它们生效。
- `workflow.id`、版本号、step 类型、`steps` 结构等核心结构错误仍失败。

## CodeGraph 借鉴边界

已完成。

CodeGraph 的价值是把代码库整理成节点、关系和影响路径，让 agent 不必反复全仓搜索。SP 吸收的是控制思想，不引入它的重运行时。

SP 已吸收的部分：

- 查询优先：先读 project/feature memory，再按 trace 和 workset 展开。
- 关系优先：优先使用稳定坐标、trace anchor、affected docs，而不是从零推理关系。
- 影响半径：修改 API、UI、表、权限、事件、验收或测试前，先确认相关 flow、screen、contract、table、permission、acceptance、tests 是否受影响。
- 上下文预算：从最小读集开始，有证据再扩一层。
- 新鲜度降级：memory 或辅助检查过期时，向上回到正确 `/sp.*` 阶段。

不纳入主链路的部分：

- 不要求安装 SQLite 图数据库。
- 不要求安装 Tree-sitter 解析器。
- 不要求启动 MCP server。
- 不要求实时文件 watcher。
- 不把 `trace-index.md` 改造成复杂图数据库或强 schema。

## 仍需人工或真实客户端验证的部分

### Codex skills-first 入口

当前代码应生成 `.agents/skills/sp-*/SKILL.md`。这里是 Codex 安装机制层面的目标产物。

根据当前 Codex 维护者在 openai/codex issue 中的公开说明，custom slash commands 和 custom prompts 已经废弃，推荐迁移到 skills。因此 SP 对 Codex 的主路径应回到 skills-first：用户输入 `$`、运行 `/skills` 选择 `sp-specify`、`sp-plan`、`sp-tasks`、`sp-analyze`、`sp-implement`、`sp-gate`、`sp-ui` 等 skill，或提出匹配 skill description 的自然语言请求。

`.codex/prompts/sp.*.md` 和 `plugins/sp/commands/sp.*.md` 不再生成。未来如果 Codex 官方重新提供稳定 prompt/plugin 接口，应作为新功能重新设计和实测，而不是保留当前误导性兼容层。

处理原则：

- 文档必须把 Codex 主入口写成 `$sp-*` skills、`/skills` 选择对应 skill，或匹配 skill description 的自然语言请求。
- 安装验收不能要求 slash menu 显示 `/sp.*`。

当前代码验收边界：

- `.agents/skills/sp-*/SKILL.md` 必须完整生成。
- `.codex/prompts/sp.*.md`、`.agents/plugins/marketplace.json`、`plugins/sp/.codex-plugin/plugin.json` 不应生成；如旧项目已有，应被清理。
- slash menu 不显示 `/sp.*` 不应被判定为安装失败。

### 真实业务项目反馈

当前规则已经覆盖方法论、模板、命令和测试，但真实项目仍可能暴露输出过长、检查过严或 memory 回写负担偏高的问题。

处理原则：

- 小项目应走轻量路径，不强制填完整风险台账。
- 大项目按阈值建议拆分，但拆分建议需要人工确认。
- 发现局部复杂度过高时，优先缩小 workset 或向上回到 `/sp.plan`，不要让模型在小层级里硬猜。

## Claude Opus 4.7 复核项处理状态

Claude 曾提出 4 个普通改进项。当前处理状态如下：

- open-items 读取测试未覆盖 `sp.implement` 和 `sp.analyze`：已完成，测试已覆盖 analyze、implement 和其他关键状态推进命令。
- Claude integration 旧 `_render_skill` / `_build_skill_fm` 风险：已复核，当前文件中不存在这些方法，属于过期风险记录。
- `sp.gate` 输出格式不够明确：已完成，feature `gate.md` 模板已加入最小 verdict schema，并有测试覆盖。
- 复杂区域拆分/提升阈值缺少一致性测试：已完成，测试覆盖 analyze、plan、tasks 的关键阈值短语。

## 后续升级流程

未来升级新版 Spec Kit 时，建议按这个顺序执行：

1. 拉取干净 upstream 基线，先确认 upstream 安装、集成注册、命令渲染和脚本入口是否变化。
2. 迁移 SP 命名规则：slash 命令类宿主使用 `/sp.*`；Codex 使用 `$sp-*` skills、`/skills` 或匹配的自然语言请求；extension/preset 允许保留 upstream 兼容命名空间。
3. 迁移 SP 内容增强：feature memory、open-items、trace-index、worksets、上下文预算、稳健兜底、需求冲突处理、headless 失败报告。
4. 迁移轻量检查：`check-sp-memory`、workflow YAML 开放校验、相关测试。
5. 运行集成测试和真实安装烟测：Claude、Gemini、Codex 的安装产物分别检查；Codex 以 skills 可用和安装产物完整为验收，不以 slash UI 显示为验收。
6. 更新本文档，把已完成、仍需真实验证、暂不引入的内容重新分清。

## 当前验收标准

- 新 feature 初始化后不会自带虚假风险或虚假 open item。
- `@t0/@r0` 能作为轻量搜索入口，完整事实进入 `memory/open-items.md`。
- `open-items.md` 能通过 anchor 或 affected docs 连接到 trace/source docs。
- `/sp.analyze` 能发现 memory 断链、stale memory 和状态位缺口。
- `/sp.gate` 能用 open items 判断是否允许进入下一阶段。
- `/sp.implement` 能在稳定事实变化后回写 memory 和 source docs。
- 上下文管理遵循“最小但充分”，不会默认全仓读取。
- CodeGraph 相关内容只作为参考和可选辅助，不影响默认安装成功。
- 规则保持轻量，不把项目变成填表工程。
