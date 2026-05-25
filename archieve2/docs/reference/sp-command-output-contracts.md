# `sp` 命令产物契约

> 目标：把每个 `sp` 命令的输入、输出、阻塞条件和完成定义写成统一契约，便于真实 fork 时直接变成模板约束与验收标准。

## 1. 适用范围

这份契约覆盖当前文档工作流中的全部命令：

- `sp.constitution`
- `sp.specify`
- `sp.clarify`
- `sp.flow`
- `sp.ui`
- `sp.gate`
- `sp.bundle`
- `sp.plan`
- `sp.tasks`
- `sp.analyze`

所有 agent 必须遵守同一份契约。

## 2. 全局契约

每条命令都必须满足：

- 如果 `.specify/memory/project-index.md` 已存在，必须先读它，再决定进入哪个 feature
- 如果 `.specify/memory/active-context.md` 已存在，必须结合它决定当前最小阅读集
- 如果 `memory/index.md` 已存在，必须先读它，再决定展开哪些源文档
- 若项目级 `.specify/memory/*` 与 feature 级 `memory/*`、`feature-map.md` 或当前正文状态冲突，必须先做 freshness 与路由一致性判断，不能把项目级入口直接当成最终真相
- 若项目级入口仍写着 `No active feature`，但当前工作区内只有一个明确存在的 `specs/*/memory/index.md`，应直接把该 feature 作为当前目标，并把项目级入口标记为 stale
- 只有在项目级与 feature 级路由对齐失败、且无法从 `feature-map.md`、分支上下文、`SPECIFY_FEATURE` 或用户明确目标中确定唯一 feature 时，才允许报告“缺少 feature 上下文”
- 在展开源文档前，必须先判断当前 memory 是否 fresh，是否已足够回答本步问题
- 先读前序产物，再决定是否扩写
- 输出必须落到约定路径
- 输入不足时必须停止并显式报缺口
- 不得把未确认信息伪装成稳定结论
- 不得产出生产代码
- 必须尽量使用稳定编号而不是模糊自然语言引用
- 稳定编号必须使用可扫读的类型前缀，优先采用 `TYPE-DOMAIN-NNN` 或 `TYPE-SLUG` 形态
- 凡是会被回链、修改或提问指向的对象，必须尽量同时提供 `ID / Canonical Name / Alias Keywords / Owner ID`
- 必须建立跨文档回链关系
- 当界面、流程、接口或表数量过大时，必须按模块或业务域拆分文件
- 如果本步修改了稳定结论、开放问题、追踪链或局部工作面，必须同步刷新对应 `memory/*`
- 若稳定事实已存在于 fresh `memory/*`，不得再次从原始需求或正文重新推理同一结论
- 若 memory 缺失、stale 或检索歧义，允许回读最小源文档集，但必须在本步结束前回写对应 memory
- `memory/*` 首屏如果不能直接回答“现在先读什么”，则视为不合格
- `.specify/memory/active-context.md` 给出的项目级最小阅读集默认不超过 `5` 个文件
- 小窗口 agent 首轮默认不超过 `7` 个文件，中窗口默认不超过 `9` 个文件，大窗口默认不超过 `12` 个文件
- 默认先路由到 `1` 个 active feature，再路由到 `1` 个主 workset
- 若 `screens >= 12`、`flows >= 12`、`tables >= 20`，或已出现两个以上明显子主题，则 `sp.plan` 至少拆成 `2` 个 `ws-*.md`
- 若 `screens >= 20`、`flows >= 20`、`tables >= 40`，或已跨两个以上业务域，则视为“接近中型规模”
- 若规模达到或接近 `50` 个界面、`50` 条流程、`100` 张表，则视为中型项目工作负载，不得用单一总 workset 维持

两层 `memory/*` 的统一约束：

- `.specify/memory/*` 与 `specs/<feature>/memory/*` 都是默认阅读入口，不替代源文档事实
- 两层 `memory/*` 都必须优先服务查询，首屏优先放路由、查表、热点和过滤结构
- `.specify/memory/project-index.md` 必须提供项目级问题路由矩阵
- `.specify/memory/feature-map.md` 必须提供可扫读的 feature 阶段 / 入口 / workset 摘要表
- `.specify/memory/domain-map.md` 必须提供域与共享对象的快速反查
- `.specify/memory/active-context.md` 必须提供当前推荐 feature、推荐 workset 与最小阅读顺序
- `.specify/memory/hotspots.md` 必须提供跨 feature 热点过滤视图
- `memory/index.md` 必须说明当前 feature 的推荐阅读顺序，并提供问题到文件 / workset 的路由表
- `memory/stable-context.md` 只保留稳定背景，不混入开放问题，且必须提供角色 / 对象 / 阶段等快速查表
- `memory/open-items.md` 只保留待确认项、风险项、阻塞项和回退建议，且必须支持按严重度、状态、所属域或 workset 快速过滤
- `memory/trace-index.md` 只保留高价值追踪链，不复制整份正文，且必须支持从 `SCREEN-*`、`API-*`、`TABLE-*`、`ACC-*` 反查
- `memory/worksets/*` 必须按局部闭环切分，不能把整个 feature 装进单一 workset
- `memory/worksets/index.md` 必须写明“何时选择哪个 workset”
- 每个 `ws-*.md` 必须写明最小阅读集、适用问题和局部边界
- 接近中型规模后，`screen-map.md`、`flows/index.md`、`delivery/07-api-contracts.md`、`delivery/06-table-index.md` 首屏都必须提供分组索引
- 达到中型项目工作负载后，`plan.md` 必须记录范围拆分理由和 workset 拆分理由
- 达到中型项目工作负载后，`analysis.md` 未记录冒烟范围、关键样本和 verdict 影响时，不得判定 `PASS`
- `clarify-log.md` 中凡是会引起跨文档变更的记录，必须写明 `Source Of Truth`、`Required Sync Files`、`Propagation Status`、`Propagation Check`
- 只要存在未完成传播的澄清项，相关 memory 必须视为 stale，`sp.gate`、`sp.bundle`、`sp.plan`、`sp.analyze` 不得把它当作稳定前提

## 3. 单命令契约

## 3.1 `sp.constitution`

输入：

- 项目 README
- 既有 constitution 或团队规则
- 分层工作流规则

输出：

- `.specify/memory/constitution.md`
- `.specify/memory/project-index.md`
- `.specify/memory/feature-map.md`
- `.specify/memory/domain-map.md`
- `.specify/memory/active-context.md`
- `.specify/memory/hotspots.md`

阻塞条件：

- 项目原则来源完全缺失
- 团队规则互相冲突且无法消解

完成定义：

- 已明确两层文档边界
- 已明确 `flow` / `ui` 展示框架
- 已明确文档工作流在 `sp.analyze` 结束

## 3.2 `sp.specify`

输入：

- 原始需求描述
- 当前项目 constitution
- active feature 上下文

输出：

- `specs/<feature>/spec.md`
- `.specify/memory/feature-map.md`
- `.specify/memory/active-context.md`
- `specs/<feature>/memory/index.md`
- `specs/<feature>/memory/stable-context.md`
- `specs/<feature>/memory/open-items.md`

阻塞条件：

- feature 名称或 active feature 无法确定
- 需求目标无法从输入中抽取

完成定义：

- `spec.md` 说明了目标、范围、角色、成功标准、非目标
- 文档仍然停留在 what / why
- 未决问题没有被硬写成结论
- 项目级 `feature-map.md` 已注册当前 feature
- 项目级 `active-context.md` 已能把当前 feature 作为入口路由
- `memory/index.md` 已建立默认阅读入口
- `memory/stable-context.md` 已记录初始稳定背景
- `memory/open-items.md` 已记录当前待确认问题
- 初始 memory 已包含 freshness 信息与第一版最小阅读集

## 3.3 `sp.clarify`

输入：

- `spec.md`
- `clarifications.md`
- `clarify-log.md`
- 当前问题来源文档（可来自 `flows/*` 或 `ui/*`）
- 用户追加说明
- 既有澄清记录

输出：

- 视影响范围更新后的 `spec.md`
- 视影响范围更新后的 `specs/<feature>/clarifications.md`
- `specs/<feature>/clarify-log.md`
- `specs/<feature>/memory/stable-context.md`
- `specs/<feature>/memory/open-items.md`
- `specs/<feature>/memory/trace-index.md`

阻塞条件：

- `spec.md` 缺失
- 关键规则没有任何输入来源
- 当前问题无法被安全归类为 `CF-SPEC`、`CF-FLOW` 或 `CF-UI`
- 无法构造不会引入未来冲突的候选选项，且也未回退到更宏观的问题

完成定义：

- 已将问题归类为 `CF-SPEC`、`CF-FLOW` 或 `CF-UI`
- 已判断问题属于 `Immediate` 还是 `Batch`
- 会改变路线、范围、主线阶段、主页面结构或当前步骤可继续性的题目，已被归为 `Immediate`
- 仅局部、可延后、可同主题合并的问题，才被归为 `Batch`
- 角色、对象、业务框架、规则、边界、异常、样例已补齐到可复核程度
- 开放问题单独列出
- 与 `spec.md` 保持一致
- 已为关键角色、对象、规则、状态建立稳定编号
- 已显式写出业务主线阶段、角色责任边界、对象流转骨架和关键判断点
- 业务框架已按固定顺序写出 `Mainline Stages / Stage Responsibility Boundaries / Object Flow Backbone / Top-Level Decision Points / Capability Boundaries`
- 高影响、阻塞型问题已立即提问，不阻塞的局部问题已进入批量队列
- 批量队列已按 `Queue Topic` 分组，而不是按文档顺序堆积
- 同主题达到 `3` 个问题、同一 workset 连续两轮回退，或即将进入 `sp.gate` / `sp.bundle` / `sp.plan` 前，已执行冲刷检查
- 问题默认采用单选题或多选题，只有在必要时才附带可选备注
- 候选选项保持互斥或可组合，不包含隐性冲突项
- 若低层问题无法形成安全选项，已回退到更宏观的路线问题
- `clarifications.md` 只保留稳定结论，`clarify-log.md` 已记录问题来源、候选项、最终答案、影响范围和回看条件
- 若问题来自 `flow` 或 `ui` 调整，`clarify-log.md` 已记录 `Target ID`、`Operation`、`Affected IDs`、`Affected Documents` 和是否需要反向回写
- `Immediate` 记录已完整保存为可回放的问题包；`Batch` 记录已保存 `Queue Topic`、`Queue Size`、`Flush Trigger`、`Latest Safe Step`
- 已为每条需传播的记录补齐 `Source Of Truth`、`Required Sync Files`、`Propagation Status`、`Propagation Check`
- 若传播未完成，问题状态未被错误标为 `Closed`
- `stable-context.md` 已同步业务主线与稳定边界
- `open-items.md` 已同步开放问题和风险状态
- `trace-index.md` 已初始化关键追踪入口

## 3.4 `sp.flow`

输入：

- `spec.md`
- `clarifications.md`

输出：

- `specs/<feature>/flows/index.md`
- `specs/<feature>/flows/main-flow.mmd`
- `specs/<feature>/flows/sequence.mmd`
- `specs/<feature>/flows/state.mmd`
- 必要时补充 `specs/<feature>/flows/flow-*.mmd`
- `specs/<feature>/memory/trace-index.md`

阻塞条件：

- 规则和状态仍然明显不稳定
- 主流程无法闭环

完成定义：

- 三张图均可读取
- 名称体系一致
- 缺口以备注形式暴露，没有被猜测补全
- 关键流程具备 `FLOW-*` 标识并能回链到规则与页面
- 关键流程节点已继续下钻到 `STEP-*`、`DEC-*`、`EX-*`
- `flows/index.md` 已为主要流程记录 `Canonical Name`、`Alias Keywords` 和 `Owner Stage`
- `trace-index.md` 已同步关键流程主链
- 若已接近中型规模，`flows/index.md` 首屏已提供按域或子主题分组的索引表
- 若流程变更打破既有 target 映射，`clarify-log.md` 与 `trace-index.md` 已同步刷新，旧索引未继续保留为 fresh

## 3.5 `sp.ui`

输入：

- `spec.md`
- `clarifications.md`
- `flows/*`

输出：

- `specs/<feature>/ui/index.md`
- `specs/<feature>/ui/screen-map.md`
- `specs/<feature>/ui/screen-*.md`
- `specs/<feature>/ui/jsonforms/schema.json`
- `specs/<feature>/ui/jsonforms/uischema.json`
- `specs/<feature>/ui/jsonforms/data.example.json`
- `specs/<feature>/memory/trace-index.md`

阻塞条件：

- 页面清单无法从流程回链
- 表单字段没有规则依据

完成定义：

- 页面清单与流程可回链
- 页面卡片说明了入口、动作、规则、异常
- 页面状态至少覆盖初始、加载、空、错误、无权限
- 关键动作已能映射到 `UC-*`，必要时映射到 `API-*`
- JSON Forms 只用于配置页和表单页
- 每个页面具备稳定 `SCREEN-*` 标识
- 关键页面结构已继续下钻到 `SECTION-*`、`ACTION-*`、`FIELD-*`
- `screen-map.md` 已为主要页面记录 `Canonical Name`、`Alias Keywords` 和 `Key Action IDs`
- `trace-index.md` 已同步关键页面链路与主要动作映射
- 若页面达到 `20` 个及以上，`screen-map.md` 首屏已提供“模块 / 页面数 / 关键页面 / 入口文件”索引表
- 若页面结构变更影响 `Target ID`、`Owner ID` 或 workset 入口，相关 `memory/*` 与 `clarify-log.md` 已同步刷新

## 3.6 `sp.gate`

输入：

- 第一层全部产物

输出：

- `specs/<feature>/gate.md`
- `.specify/memory/project-index.md`
- `.specify/memory/feature-map.md`
- `specs/<feature>/memory/index.md`
- `specs/<feature>/memory/open-items.md`

阻塞条件：

- 前序产物缺失严重
- 无法形成明确结论

完成定义：

- 有明确 verdict
- 已先检查业务框架是否存在于 `clarifications.md`
- 已检查业务框架是否按固定顺序写出 `Mainline Stages / Stage Responsibility Boundaries / Object Flow Backbone / Top-Level Decision Points / Capability Boundaries`
- `gate.md` 已记录业务框架检查结果，再进入流程、规则、页面等细项判断
- 每个风险或阻塞项都有证据
- 明确指出是进入 `sp.bundle` 还是回退前序步骤
- 项目级 `project-index.md` 已同步最新 gate 摘要
- 项目级 `feature-map.md` 已同步 feature 当前 gate 状态
- `memory/index.md` 已同步当前 gate 状态
- `open-items.md` 已同步风险项、阻塞项和回退建议
- 已检查并显式指出是否存在 stale memory、断链索引或未完成传播的澄清项

## 3.7 `sp.bundle`

输入：

- `spec.md`
- `clarifications.md`
- `flows/*`
- `ui/*`
- `gate.md`

输出：

- `specs/<feature>/bundle.md`
- `.specify/memory/active-context.md`
- `specs/<feature>/memory/index.md`
- `specs/<feature>/memory/stable-context.md`

阻塞条件：

- `gate.md` 结论为 `BLOCKED`
- 稳定信息与未决问题无法分离

完成定义：

- bundle 可以独立说明 feature 的业务主线
- bundle 可以独立说明 feature 的业务框架
- 稳定项、风险项、阻塞项分开呈现
- 第二层无需重新猜业务背景
- 第二层无需重新猜业务阶段划分、角色边界和对象主骨架
- 业务框架快照已按固定顺序写出 `Mainline Stages / Stage Boundaries / Object Backbone / Top-Level Decision Points / In-Scope And Deferred Boundaries`
- 项目级 `active-context.md` 已同步第二层推荐阅读顺序
- `stable-context.md` 已刷新为第二层默认入口所需的稳定背景
- `memory/index.md` 已写明第二层推荐阅读顺序
- 已把第二层后续会反复用到的稳定结论压缩进 memory，而不是要求 `sp.plan` 再次自行总结

## 3.8 `sp.plan`

输入：

- `bundle.md`
- constitution 中关于第二层的约束

输出：

- `specs/<feature>/plan.md`
- `.specify/memory/feature-map.md`
- `specs/<feature>/memory/index.md`
- `specs/<feature>/memory/trace-index.md`
- `specs/<feature>/memory/worksets/index.md`
- `specs/<feature>/memory/worksets/ws-*.md`
- `specs/<feature>/delivery/01-prd.md`
- `specs/<feature>/delivery/02-screen-to-delivery-map.md`
- `specs/<feature>/delivery/03-use-case-matrix.md`
- `specs/<feature>/delivery/04-domain-model.md`
- `specs/<feature>/delivery/05-data-entity-catalog.md`
- `specs/<feature>/delivery/06-table-index.md`
- `specs/<feature>/delivery/tables/table-*.md`
- `specs/<feature>/delivery/07-api-contracts.md`
- `specs/<feature>/delivery/08-permissions-matrix.md`
- `specs/<feature>/delivery/09-events-and-side-effects.md`
- `specs/<feature>/delivery/10-non-functional-requirements.md`
- `specs/<feature>/delivery/11-module-boundaries.md`
- `specs/<feature>/delivery/12-test-and-acceptance.md`

阻塞条件：

- `bundle.md` 缺失
- 第一层稳定信息不足以形成交付范围

完成定义：

- `plan.md` 包含范围、阶段、页面映射、模块边界、数据对象、依赖与验收入口
- 每个交付对象都能回链到 `bundle.md`
- 页面、用例、接口、表、权限、验收之间的关键回链已经建立
- API、表、权限、副作用、验收文档已具备后续自动开发所需的最小结构化字段
- `memory/worksets/index.md` 已建立 feature 的局部工作面清单
- 已按局部闭环创建 `ws-*.md`
- workset 已明确主要追踪链、边界和完成判据
- workset 已能支持按问题类型、对象类型或上下文预算快速选取
- 项目级 `feature-map.md` 已同步主要入口和 workset 数量
- 若达到拆分触发器，至少存在 `2` 个 `ws-*.md`
- 若已接近中型规模，`screen-map.md`、`flows/index.md`、`delivery/07-api-contracts.md`、`delivery/06-table-index.md` 首屏都已补齐分组索引
- 若已达到中型项目工作负载，`plan.md` 已明确写出范围拆分理由和 workset 拆分理由
- `memory/worksets/*` 已记录最小阅读集、相邻依赖和主要传播风险，避免任务和分析阶段重复重建上下文

## 3.9 `sp.tasks`

输入：

- `plan.md`
- `delivery/*`

输出：

- `specs/<feature>/tasks.md`
- `specs/<feature>/memory/index.md`
- `specs/<feature>/memory/worksets/index.md`
- `specs/<feature>/memory/worksets/ws-*.md`

阻塞条件：

- `plan.md` 没有形成可拆分对象

完成定义：

- 任务已分组
- 依赖和并行关系已标注
- 每个任务都有完成判据或验收映射
- 关键任务已能回链到 `SCREEN-*`、`API-*`、`TABLE-*`、`ACC-*`
- 每个任务都能明确指出主要追踪对象
- 每个任务都已绑定主要 workset
- `memory/worksets/*` 已同步任务入口和局部依赖
- 从任务出发可以快速反查主要 workset，而不必重读整份 `plan.md`
- 若任务拆分暴露出旧 workset 失真，已明确要求回写 `memory/worksets/*`

## 3.10 `sp.analyze`

输入：

- 第一层与第二层全部核心产物
- 第一层与第二层之间的追踪关系

输出：

- `specs/<feature>/analysis.md`
- `.specify/memory/project-index.md`
- `.specify/memory/feature-map.md`
- `.specify/memory/hotspots.md`

阻塞条件：

- 前序文档缺失，无法做交叉验证

完成定义：

- 明确指出断裂、冲突、缺口和影响
- 每个发现都带证据和建议回退步骤
- 明确指出是否已达到中型项目自动开发的最小规格要求
- 若 feature 已达到中型项目规模，明确记录冒烟范围、抽样范围和抽样结论
- 明确指出缺口属于 UI、API、数据、权限、副作用还是验收精度
- 最终结论明确落在 `PASS`、`PASS WITH RISKS` 或 `BLOCKED`
- 最终结论和缺口分类已按固定结构输出，便于不同 feature 横向比较
- 如果没有重大问题，明确标记文档阶段完成
- 已明确指出 `memory/*` 是否新鲜、是否存在过期索引
- 已明确指出是否存在“本可直接复用却被重复推理”的稳定结论
- 已明确指出 `worksets/*` 是否过粗、缺失或与当前正文脱节
- 已明确指出 `clarify-log.md` 是否存在未完成传播、部分回写或 source-of-truth 漏改
- 项目级 `hotspots.md` 已同步高优先级风险
- 项目级 `project-index.md` 与 `feature-map.md` 已同步最新 readiness 结论
- 若已接近中型规模，已显式判断拆分结构、查询结构和 workset 路由是否仍有效
- 若已达到中型项目工作负载，已记录冒烟范围、关键样本、抽样结论和 verdict 影响，且未执行冒烟检查时不得判 `PASS`

## 4. 统一回退规则

如果某条命令被阻塞，建议回退如下：

| 当前命令 | 优先回退 |
| --- | --- |
| `sp.specify` | `sp.constitution` 或补原始需求 |
| `sp.clarify` | `sp.specify` |
| `sp.flow` | `sp.clarify` |
| `sp.ui` | `sp.flow` 或 `sp.clarify` |
| `sp.gate` | 缺口所在步骤 |
| `sp.bundle` | `sp.gate` |
| `sp.plan` | `sp.bundle` |
| `sp.tasks` | `sp.plan` |
| `sp.analyze` | 发现问题对应的最近一步 |

## 5. 通过标准

只有满足以下条件，才算单个 feature 的文档工作流完成：

- 第一层和第二层文档已生成
- `gate.md` 有明确结论
- `bundle.md` 可独立交接
- `analysis.md` 没有未处理的重大裂缝
- `memory/index.md` 已可作为默认阅读入口
- `memory/worksets/*` 已能支撑局部 workset 级推进
- 项目级 `.specify/memory/*` 已能先定位 feature，再定位 workset
- 文档规模接近中型项目时，仍能在预算窗口内找到最小阅读集
- 已不存在未完成传播却仍被当作 fresh 复用的澄清结论
