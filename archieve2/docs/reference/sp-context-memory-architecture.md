# `sp` 上下文记忆架构

> 目标：在不新增命令的前提下，为 `sp` 文档工作流补上一层可持续刷新的中间态记忆，降低重复推理成本，并提升跨步骤一致性。

## 1. 问题定义

当前 `sp` 文档链已经具备一定压缩能力：

- `clarifications.md` 压缩了需求澄清后的业务信息
- `gate.md` 压缩了第一层是否可继续推进的判断
- `bundle.md` 压缩了第二层接手所需的稳定业务摘要
- `plan.md` 压缩了第二层的交付对象关系

但这还不足以支撑中型项目的长期稳定推进。

当 feature 规模扩大到几十个页面、几十条流程、上百张表时，会出现三个典型问题：

- 后续步骤仍然需要频繁回读大量原始文档，重复消耗上下文窗口
- 同一问题在不同步骤中被反复重新判断，结论容易漂移
- agent 很难只聚焦局部工作区域，容易把全量上下文重新带入

因此，现有文档链需要补一层“默认阅读入口”，把稳定结论、开放问题、追踪索引和局部工作面单独保存下来。

## 2. 设计目标

这层记忆架构必须同时满足：

- 不改变现有命令集合
- 不替代源文档，只做压缩与路由
- 让查询先于阅读，先定位，再展开
- 让 agent 先读小文档，再按需回读源文档
- 让不同上下文窗口大小都能有对应的最小工作集
- 让大型 feature 可以按局部 workset 拆开推进
- 让不同命令对同一稳定事实尽量复用同一表述

## 3. 基本原则

## 3.1 源文档仍然是事实源

以下文档仍然是正式事实源：

- `spec.md`
- `clarifications.md`
- `flows/*`
- `ui/*`
- `gate.md`
- `bundle.md`
- `plan.md`
- `delivery/*`
- `tasks.md`
- `analysis.md`

这些文档决定“项目真正写了什么”。

## 3.2 `memory/*` 是默认入口，不是替代正文

`memory/*` 的职责不是重新发明一套正文，而是：

- 汇总稳定事实
- 指向开放问题
- 记录跨文档追踪线
- 帮 agent 快速定位应该只读哪一小块

## 3.3 记忆层必须优先服务查询

对人可读还不够，`memory/*` 还必须对 agent 可快速检索。

因此每个 memory 文件都应优先回答：

- 如果我要判断某个问题，应该先读哪个文件
- 如果我要处理某个对象、页面、接口或规则，应该先落到哪个 workset
- 如果当前问题未稳定，我应该立刻看到哪些开放项和风险项
- 如果当前上下文窗口很小，我最少应该带哪些文件

推荐统一做法：

- 尽量用稳定 ID，而不是模糊自然语言
- 尽量用表格而不是长段落
- 同一对象在不同 memory 文件中保持同名同 ID
- 先给“问题到入口”的路由，再给正文摘要
- 每个文件都写清最近刷新来源或 freshness 提示

因此，推荐规则是：

- 写结论时，以源文档为准
- 开始新步骤时，先读 `memory/index.md`
- 只有在当前目标区域需要更高精度时，才展开对应源文档

## 3.4 查询优先的固定排版

为了让 agent 能在有限窗口内稳定命中入口，memory 文件的首屏排版也应固定。

- `memory/index.md`
  - 第一块必须是“问题类型 / 关键词 / 推荐文件 / 推荐 workset / 下一跳”路由表
  - 第二块才是当前状态摘要
- `stable-context.md`
  - 第一块必须是角色、对象、阶段或判断点的快速表格
  - 不应以长段背景介绍开头
- `open-items.md`
  - 第一块必须是按严重度、状态、域、workset 可过滤的问题表
  - 不应把风险埋在叙述段落里
- `trace-index.md`
  - 第一块必须是按 `SCREEN-* / API-* / TABLE-* / ACC-*` 反查的快捷索引
  - 追踪链正文放在索引之后
- `worksets/index.md`
  - 第一块必须是“适用问题 / 关键词 / 推荐 workset / 最小阅读集 / 相邻 workset”选择表
- `ws-*.md`
  - 第一块必须是“适用问题 / 纳入范围 / 不纳入范围 / 最小阅读集 / 完成判据”

如果首屏不能直接回答“现在先读什么”，则视为查询结构不合格。

## 3.5 稳定结论禁止重复推理

记忆层的核心价值不是“多写一份摘要”，而是把已经稳定的中间结论固化下来，避免后续步骤再次花 token 重建。

因此以下信息一旦已进入新鲜的 `memory/*`，后续步骤默认不得重新推理：

- 当前 feature 的 in-scope / out-of-scope 边界
- 角色边界、owner 边界和主责任阶段
- 业务主线阶段顺序与对象流转骨架
- 已确认的顶层判断点与能力边界
- 已稳定的 `FLOW-*`、`SCREEN-*`、`UC-*`、`API-*`、`TABLE-*`、`ACC-*` 对应关系
- 已确认的 workset 划分、主入口和最小阅读集
- 已经通过 `sp.clarify` 定案的问题结论

执行规则：

- 若新鲜 memory 已存在对应稳定事实，应先复用该结论，而不是重新从原始需求推导
- 若怀疑 memory 与正文不一致，应先做 freshness 检查，而不是直接改写结论
- 只有在 memory 缺失、过期、或已被明确判定为失真时，才允许回读源文档重新判断

否则会同时造成两类浪费：

- 重复推理带来的 token 浪费
- 相同问题多次推理但得到不同答案，后续又要花 token 处理冲突

## 3.6 freshness 与 stale 判定

为了让 agent 知道“该复用还是该重算”，每个高价值 memory 文件都必须显式给出 freshness 信息。

最低要求：

- 记录最近刷新日期
- 记录刷新依据或上游来源
- 记录当前是否存在已知 stale 风险
- 记录如果源文档变化，哪些 memory 需要跟着刷新

推荐字段：

- `Refresh Date`
- `Refresh Basis`
- `Source Of Truth`
- `Required Sync Files`
- `Stale Trigger`

判定原则：

- 若 memory 的刷新依据仍覆盖当前正文版本，视为 fresh
- 若正文已修改，但 memory 未跟着更新，视为 stale
- 若 `clarify-log.md` 已记录需回写，但传播未完成，相关 memory 视为 stale
- 若索引仍能命中对象，但命中后发现 owner、阶段、链路已变，视为 stale

只要被判为 stale，就不能继续把它当作稳定前提直接复用。

## 3.7 检索失败与回退规则

为了避免检索偏差引发的重复推理，memory 查询还必须定义“什么叫没找到”和“没找到后怎么办”。

以下任一情况都算检索失败：

- 自然语言短语无法稳定映射到唯一 `Target ID`
- `memory/index.md` 无法把问题路由到唯一 feature 或唯一主 workset
- `trace-index.md` 无法从目标 `SCREEN-* / API-* / TABLE-* / ACC-*` 反查到主链
- `open-items.md`、`stable-context.md` 中存在互相冲突的同类结论
- 命中对象后发现其 owner、范围或影响文档不完整

检索失败后的动作顺序：

1. 标记当前命中失败类型，是缺失、过期还是歧义。
2. 只展开与当前问题最相关的最小源文档集，不恢复全量扫描。
3. 在正文中确认结论后，回写对应 `memory/*`。
4. 若问题来自澄清变更，再同步 `clarify-log.md` 的传播状态。

如果只读正文、不回写 memory，下一个步骤仍会再次失败，token 消耗不会下降。

## 4. 推荐目录结构

每个 feature 在现有目录下补充：

```text
specs/<feature>/
├── memory/
│   ├── index.md
│   ├── stable-context.md
│   ├── open-items.md
│   ├── trace-index.md
│   └── worksets/
│       ├── index.md
│       └── ws-*.md
```

## 5. 记忆文件职责

## 5.1 `memory/index.md`

用途：

- 作为 feature 的默认阅读入口
- 说明当前 feature 的阅读顺序和局部切入点

至少应包含：

- feature 当前状态摘要
- freshness 提示
- 推荐先读哪些 memory 文件
- 问题到文件 / workset 的路由表
- 当前最新 gate / analysis 结论
- 当前存在的 workset 清单
- 热点风险和高影响链路
- 主要追踪主链示例
- 当前最小阅读集
- 当前主要 `Stale Trigger`

它回答的问题是：

- 我现在应该先读什么
- 我这一步应该落在哪个局部区域
- 哪些问题已稳定，哪些还未稳定

## 5.2 `memory/stable-context.md`

用途：

- 保存不应在后续步骤反复重推的稳定背景

建议收纳：

- feature 目标摘要
- 角色与责任骨架表
- 业务主线阶段表
- 对象流转主骨架表
- 顶层判断点索引
- 已确认边界
- 第二层稳定交付骨架
- 关键稳定事实编号
- 每条稳定事实的来源或刷新依据

它回答的问题是：

- 哪些结论已经可以视为稳定前提
- 后续文档不应再重新发明哪些基本事实

## 5.3 `memory/open-items.md`

用途：

- 保存仍然开放、阻塞或需回退处理的问题

建议收纳：

- `OPEN-*`
- `RISK-*`
- `BLOCK-*`
- 严重度
- 所属域
- 每项问题影响的 workset 或文档范围
- 推荐回退步骤
- 最后确认日期或刷新来源
- 可快速过滤的状态视图
- 与对应 `clarify-log.md` 记录的关联

它回答的问题是：

- 当前还不能假定哪些内容已稳定
- 继续推进时有哪些明确风险

## 5.4 `memory/trace-index.md`

用途：

- 保存高价值追踪链，不让 agent 每次重新拼装

建议收纳：

- `FLOW-* -> SCREEN-* -> UC-* -> API-* -> TABLE-* -> ACC-*`
- 关键规则到页面、接口、数据对象的映射
- 关键事件、副作用和权限映射
- 按 `SCREEN-*`、`API-*`、`TABLE-*`、`ACC-*` 反查的快捷索引
- 关键对象所属 workset 与回写入口

它回答的问题是：

- 当前 feature 的关键链路如何跨文档连接
- 某个局部对象向上和向下分别关联什么

## 5.5 `memory/worksets/index.md`

用途：

- 管理 workset 拆分策略和阅读入口

建议收纳：

- 全部 workset 列表
- 选择某个 workset 的条件
- 每个 workset 的业务范围
- 关联页面、流程、接口、表、验收项
- 相邻 workset 与共享对象
- 建议适用的上下文窗口大小
- 常见关键词或问题到 workset 的映射

它回答的问题是：

- 这个 feature 当前被拆成了哪些局部工作面
- 某个 agent 这次应当只接管哪一块

## 5.6 `memory/worksets/ws-*.md`

用途：

- 为单个局部区域提供可直接开工的最小上下文包

每个 workset 至少应包含：

- 快速进入说明
- workset 目标
- 纳入范围
- 不纳入范围
- 关键追踪链
- 必读源文档
- 已稳定事实
- 当前开放问题
- 相邻依赖
- 完成判据
- 对应 `clarify` 主题或高风险传播点

它回答的问题是：

- 如果我只做这一小块，我最少要读什么
- 如果我带宽很小，我先读哪三样
- 我不能越界到哪里
- 我交付完成时要满足什么

## 6. 命令对记忆层的更新职责

不新增命令，而是把维护职责分给现有命令。

## 6.1 `sp.specify`

负责：

- 初始化 `memory/index.md`
- 初始化 `memory/stable-context.md`
- 初始化 `memory/open-items.md`

此时的重点不是写全，而是先建立 feature 级默认入口。
同时要初始化 freshness 字段与第一版最小阅读集，避免后续步骤重新扫描整个 feature。

## 6.2 `sp.clarify`

负责：

- 维护 `clarify-log.md`
- 刷新 `stable-context.md`
- 刷新 `open-items.md`
- 初始化或刷新 `trace-index.md`

此时应把业务主线、对象骨架、规则边界固化成后续可复用的稳定摘要。
同时要建立初步“问题到入口”的查询骨架，而不是只补自然语言总结。
若问题来自 `flow` 或 `ui`，也应按 `CF-FLOW`、`CF-UI` 分类记录。
高影响问题应按 `Immediate` 立即发问，其余问题可按 `Batch` 集中处理。
若澄清结论影响多个文档，还必须先更新事实源，再按 `Required Sync Files` 回写所有受影响 memory。

## 6.3 `sp.flow`

负责：

- 为 `trace-index.md` 补充 `FLOW-*` 主链
- 将流程编号回链到规则、页面和状态
- 为后续反查索引准备稳定编号
- 若发现旧链路失效，必须标记 stale 并刷新索引，而不是继续保留旧链

## 6.4 `sp.ui`

负责：

- 为 `trace-index.md` 补充 `SCREEN-*`、`UC-*`、`API-*` 主链
- 将页面局部规则与关键动作映射加入工作索引
- 强化 screen、action、API 到 workset 的可路由性
- 若页面结构变更影响 `Target ID` 或 owner，必须同步刷新 `stable-context.md` 或 `worksets/*`

## 6.5 `sp.gate`

负责：

- 在 `memory/index.md` 中刷新当前 gate 状态
- 在 `open-items.md` 中刷新阻塞项、风险项和回退建议
- 检查当前 memory 是否存在 stale 索引、断链或未完成传播

## 6.6 `sp.bundle`

负责：

- 把第一层稳定信息再压缩进 `stable-context.md`
- 把第二层接手的推荐阅读顺序写入 `memory/index.md`
- 把已确认可复用的稳定结论从“正文里有”提升到“memory 可查”

## 6.7 `sp.plan`

负责：

- 初始化 `memory/worksets/index.md`
- 建立 `memory/worksets/ws-*.md`
- 把第二层交付对象按局部工作面拆开
- 让 workset 成为默认局部工作入口，而不是仅仅列清单
- 为每个 workset 补齐最小阅读集、相邻依赖和主要传播风险

## 6.8 `sp.tasks`

负责：

- 把任务映射回具体 workset
- 明确每个任务的主追踪对象和局部边界
- 避免任务层重新创造一套与 workset 脱节的切分方式
- 若任务拆分暴露出 workset 过粗或过期，应反向标记并刷新 `worksets/*`

## 6.9 `sp.analyze`

负责：

- 检查 memory 文件是否过期
- 检查 workset 是否仍能代表当前源文档结构
- 指出哪些 workset 已失真、过粗或缺关键追踪链
- 检查当前记忆层是否仍然足以支持快速查询
- 检查是否存在“本可复用但被重复推理”的稳定结论
- 检查 `clarify` 回写是否出现部分文件已改、部分文件未改的传播断裂

## 6.10 查询效率硬约束

只要 feature 已进入 `sp.clarify` 之后的阶段，就应满足以下最小查询要求：

- `memory/index.md` 中必须存在“问题到文件 / workset”的路由表
- `stable-context.md` 中必须存在按角色、对象、阶段或判断点组织的快速表格
- `open-items.md` 中必须能按严重度、状态、所属域或 workset 过滤
- `trace-index.md` 中必须支持从 `SCREEN-*`、`API-*`、`TABLE-*`、`ACC-*` 反查
- `worksets/index.md` 中必须写明“什么时候选这个 workset”
- 每个 `ws-*.md` 中必须写明最小阅读集和适用问题类型

如果这些结构不存在，那么 memory 虽然“可读”，但还不算“可查询”。

## 6.11 规模触发器与 workset 下限

记忆层不是可选优化，而是规模化后的硬约束。

- 若 feature 满足以下任一条件：
  - `screens >= 12`
  - `flows >= 12`
  - `tables >= 20`
  - 已出现两个以上子主题
  - 则 `memory/worksets/` 下至少应存在 `2` 个 `ws-*.md`
- 若 feature 满足以下任一条件：
  - `screens >= 20`
  - `flows >= 20`
  - `tables >= 40`
  - 已跨两个以上业务域
  - 则应视为接近中型规模，`worksets/index.md` 必须包含关键词路由、窗口建议和相邻 workset 说明
- 若 feature 达到或接近 `50` 个界面、`50` 条流程、`100` 张表：
  - 不允许只有一个总 workset
  - 不允许 `memory/index.md` 只写摘要不写路由
  - 不允许 `trace-index.md` 缺少反查表
  - 不允许 `ws-*.md` 缺少最小阅读集

若以上任一条不满足，`sp.analyze` 应记为结构性缺口。

## 6.12 `sp.clarify` 的传播闭环

`sp.clarify` 不只是提问记录，它还是跨文档变更的传播总线。

每次澄清形成稳定答案后，应按以下顺序落地：

1. 确认本次答案的 `Source Of Truth` 是哪份正文文档。
2. 先更新该事实源。
3. 再按 `Required Sync Files` 刷新所有受影响文档。
4. 最后刷新对应 `memory/*`、`clarify-log.md` 的传播状态与检查结果。

推荐最小传播矩阵：

- 影响需求边界、业务框架、规则边界：
  - 先改 `spec.md` 或 `clarifications.md`
  - 再改 `memory/stable-context.md`、`memory/open-items.md`
- 影响流程主链、步骤、判断点、异常回路：
  - 先改 `flows/*`
  - 再改 `memory/trace-index.md`、必要时改 `memory/stable-context.md`
- 影响页面结构、动作、字段、页面 owner：
  - 先改 `ui/*`
  - 再改 `memory/trace-index.md`、必要时改 `memory/stable-context.md`、`worksets/*`
- 影响 workset 划分、主入口或最小阅读集：
  - 先改 `plan.md` 或 `memory/worksets/*`
  - 再改 `memory/index.md`、`.specify/memory/active-context.md`

传播未完成时：

- 对应问题不得标记为 `Closed`
- 相关 memory 不得标记为 fresh
- `sp.gate`、`sp.bundle`、`sp.plan` 前都应优先暴露该问题

## 6.13 token 节省视角下的最低合格线

如果记忆层要真正降低 token 消耗，而不是只增加文档数量，则至少要满足：

- 稳定结论已经进入可查询的 `memory/*`
- 新步骤默认先读 memory，再决定是否读正文
- 目标对象可以通过 ID、Canonical Name、Alias、Owner 快速命中
- `clarify` 结论一旦定案，相关正文和 memory 会一起刷新
- stale 和记忆缺失会在 `sp.gate` 或 `sp.analyze` 中被显式抓出

缺少以上任意一项，后续步骤仍会回到“重新阅读、重新判断、重新冲突处理”的高 token 状态。

## 7. 上下文窗口使用策略

不同模型窗口大小不同，工作集也应不同。

## 7.1 小窗口策略

适用于只能带较少上下文的 agent。

推荐阅读顺序：

1. `.specify/memory/project-index.md`
2. `.specify/memory/active-context.md`
3. `memory/index.md`
4. `memory/stable-context.md`
5. `memory/open-items.md`
6. 当前目标 `ws-*.md`
7. 当前要编辑的目标文档

规则：

- 首轮默认不超过 `7` 个文件
- 默认不回读全量 `delivery/*`
- 只允许带 `1` 个主 workset
- 首轮最多只展开 `1` 个源文档
- 若项目级记忆层不存在，可跳过前两项，但不能跳过 feature 级 `memory/index.md`

## 7.2 中窗口策略

适用于能承载一个局部领域的 agent。

推荐阅读顺序：

1. 小窗口全部内容
2. `memory/trace-index.md`
3. 当前 workset 关联的 1 到 2 个相邻源文档

规则：

- 单轮默认不超过 `9` 个文件
- 以 workset 为中心展开
- 允许带 `1` 个主 workset 和 `1` 个相邻 workset
- 不把整个 feature 全量重新装入上下文

## 7.3 大窗口策略

适用于 `sp.gate`、`sp.bundle`、`sp.analyze` 这类横向检查步骤。

推荐阅读顺序：

1. 先读全部 memory 入口
2. 再展开需要抽样的源文档
3. 最后回读证据最强的正文区域

规则：

- 单轮默认不超过 `12` 个文件
- 即便窗口足够大，也先走 memory，再走源文档
- 允许做跨 workset 抽样，但不得把全 feature 全量装入同一轮上下文
- 避免因为“看得下”就放弃压缩层

## 8. Workset 切分规则

workset 的目标不是机械按文件切，而是按局部业务闭环切。

推荐优先按以下维度切分：

- 一个角色主任务闭环
- 一个页面群闭环
- 一个审批或状态推进闭环
- 一个查询与变更闭环
- 一个副作用或通知闭环

不推荐的切法：

- 只按文档类型切，例如“所有 API 一个 workset”
- 只按技术层切，例如“所有表一个 workset”
- 把全 feature 塞进一个超大 workset

一个合格 workset 应满足：

- 局部目标清晰
- 能独立核对完成判据
- 有明确上游输入和下游影响
- 能被不同 agent 单独接手而不必全量回读

## 9. 一致性收益

补上这层架构后，`sp` 会获得三类直接收益：

- 降低重复推理：稳定事实不必在每一步重建
- 降低漂移风险：后续步骤优先继承已有稳定表述
- 降低单次上下文负担：agent 只读当前 workset 和必要回链

这正对应大型项目下的大模型工作方式：

- `sp` 提供骨架
- `memory/*` 提供外部记忆
- `worksets/*` 提供局部施工面
- 模型只在有限上下文中完成局部编织

## 10. 结论

对 `sp` 而言，真正可扩展的不是“让模型一次看更多”，而是：

- 先把稳定上下文存下来
- 再把局部工作面切出来
- 最后让 agent 只带当前需要的最小工作集

因此，本方案不是给 `sp` 新增一套命令，而是给现有命令补上统一维护的外部记忆层。
