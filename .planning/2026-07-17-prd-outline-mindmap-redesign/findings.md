# Findings

## 当前实现

- `outline_maturity` 已分为 `explore | frame | specify_ready`，与单个确认点优先级正交。
- 一级、二级当前以 question group + 2-4 candidates + free input 的逐题卡片形式呈现。
- 三级当前固定为 `intent_map`、`scope_slice`、`readiness_authority` 三视图正式确认。
- Discovery 与 confirmation 使用不同 schema、响应包和授权边界；这一安全边界应保留。
- 现有写回以稳定 candidate/target/delta ID 和 append-only ledger 追踪来源，可扩展为节点绑定，不宜推倒重建。

## 用户指出的核心缺陷

- 当前界面先展示问题，不能先形成项目全局认知。
- 选项缺少明确的空间归属，应从具体业务分支发起并回写到该分支。
- 政策、合规、平台原则等横切全局的议题不应被硬塞入某个业务分支，应形成独立全局决策层。
- 一个画布不足时需要拆图，但拆分不能让用户失去全局位置和跨图关联。

## 初步设计方向

- 把稳定 `outline_node_id` 作为导图、候选问题、用户 delta 和正式确认之间的共同定位键。
- 以“全局总图 + 可下钻分图”替代无边界的大画布；总图保留目标、用户、能力域、范围、首切片和全局约束。
- 普通决策挂在分支节点，横切政策决策挂在单独的“全局约束/政策与治理”根分支，并显示其影响节点集合。
- 右侧决策面板继续承担候选、推荐、自由输入和操作语义，导图承担全局理解与定位，两者职责分开。

## 三模型共识

- 采用轻量拓扑增强，不采用图数据库、不支持 `.xmind` 专有文件。
- 使用全局总图 + 可下钻分图；复杂度控制必须是确定性规则。
- 普通候选必须显式绑定稳定节点，不能从文案或标题猜测。
- 政策/合规使用独立的全局约束分支，并通过影响节点引用表达横切作用。
- 保留现有 append-only ledger、来源标签、Discovery 非授权边界和三级 digest-bound 正式确认。
- 延后拖拽重排、自由布局、图片/XMind 导出和多人协作。

## 需要裁决的分歧

- 正式确认粒度：采用 Codex/Gemini 的整份 Outline 单一授权；不采用 Claude 的节点级或横切议题独立授权。
- MVS schema：采用 Codex 的最小显式节点 ID 扩展；不采用 Gemini 的纯 UI 推断，因为无法稳定校验问题与分支绑定。
- 横切写回：记录一个权威决策和 `affected_node_ids` 引用；不向每个业务节点复制相同 context note。

## 用户确认后的实施裁决

- Discovery 数据升级到 schema v2，显式增加 `density_budget`、`maps`、`outline_nodes` 和问题级 `outline_node_id`；不从标题或 DOM 位置推断绑定。
- 固定预算为 18 节点、3 层、4 个直接子节点、8 节点起启用 60% 单层占比上限。阈值由 Schema 固定，生成者不能自行放宽。
- 旧 schema v1 响应不静默升级；刷新模板后重新生成 discovery data。已有 v1 ledger 可由写回工具保留为 legacy event，新事件必须带节点 ID。
- 总图、业务分图和全局约束图是同一 review data 的多个语义视图，不改变 Discovery 非授权边界，也不改变三级整份 Outline 的正式确认。

## Level 1 业务语义机制复查（2026-07-18）

- 现有 Constitution/PRD 命令边界已经明确：Constitution 管项目级长期治理；PRD 管 feature 的目标、用户、能力、场景与范围。
- 现有 `/sp.prd` 要求全局总图、业务分图和全局约束图，但没有规定 Level 1 总图的一级主干必须是端到端业务能力，也没有规定如何从 PRD 证据抽取业务对象、动作、结果和闭环。
- 当前 schema 与 validator 主要验证图拓扑、密度、枚举、节点引用和全局约束影响范围；它们无法拒绝“产品目标/目标用户/核心问题/全局约束”这类结构合规但业务空泛的总图。
- renderer 的固定说明也可能把方法论语言带回首屏；业务摘要应来自数据合同，交互说明应降为帮助信息或移除。
- 优化重点应是新增可执行的“业务主干抽取 -> 证据追踪 -> 语义校验 -> 降级/追问”链条，而不是让 Constitution 替 PRD 补业务事实。
- 用户确认采用内嵌 `business_context` 的两阶段方案，并要求在 `/sp.prd` 中展示 Constitution 内容。
- Constitution 展示采用独立只读快照：只显示与当前 feature 明确相关的条款、来源和适用状态；不复制为业务链证据，不提供 Discovery 写回目标。
- 因为业务语义和只读治理快照改变了 Discovery 的含义，数据、响应和 ledger 升级到 v3；不对历史 v2 静默升级。
