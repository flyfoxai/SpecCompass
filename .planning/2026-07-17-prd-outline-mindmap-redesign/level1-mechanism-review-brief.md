# Level 1 Outline 业务语义生成机制审查

你是 SP（Spec-Driven Development）方法与生成合同审查者。请只分析，不修改文件。目标是优化 `/sp.prd` 的 Level 1 Outline Discovery，使它稳定生成具体的“业务能力全景图”，而不是抽象的 PRD 目录或方法论说明。

## 用户反馈

当前 XMind 风格交互和密度基本合格，但内容过于务虚。用户希望第一屏直接看见这个项目实际要做什么，例如行情/数据留存、交易策略、订单与风险控制、交易执行、订单/成交/持仓/资金事实、监控审计，而不是“产品方向、使用者、核心问题、全局约束”或“根节点保持稳定”之类说明。

一个符合预期的示例结构是：

```text
A 股 QMT 受控交易核心闭环
├─ 数据与策略输入
│  ├─ 行情数据留存、质量与可信度
│  └─ 策略信号与订单意图
├─ 交易控制与执行
│  ├─ 人工与策略统一交易入口
│  ├─ 订单校验与风险控制
│  └─ QMT 接入、执行与异常恢复
├─ 事实与运行保障
│  ├─ 订单、成交、持仓和资金事实
│  ├─ 对账与状态恢复
│  └─ 监控、应急、配置与审计
└─ 全局门禁与约束
```

根节点摘要应描述真实闭环，例如：“行情数据和策略信号形成交易意图，经订单与风险控制后通过 QMT 执行；订单、成交、持仓和资金结果被持续留存、对账和监控，真实交易受独立门禁约束。”

## 已核实的现状

1. `templates/commands/constitution.md` 已声明：`/sp.constitution` 只负责项目级长期治理、工程纪律、阶段边界、验证要求、风险门禁和人工决策规则；禁止创建产品场景、screen、flow branch、capability map、feature scope 或 implementation plan。
2. `templates/commands/prd.md` 声明：`/sp.prd` 负责某个产品/feature 的战略目标、产品定位、业务目标、用户、能力地图、问题域、场景、流程种子、范围和验收种子；PRD 发现的跨 feature 治理内容只能成为 Constitution Candidate。
3. Level 1=`explore` 当前最低成熟条件是确认目标、至少一个用户/角色、清晰核心问题。Level 2=`frame` 确认范围、非目标、首个切片、场景、验收意图、来源和高影响业务规则。Level 3 才由模型按 Constitution 做覆盖检查和正式确认。
4. `/sp.prd` 当前要求 exactly one `overview` map、至少一个 `branch` map、exactly one `global_constraints` map，并绑定 questions 到 `outline_node_id`。
5. 当前 schema/validator 能强制：每图最多 18 节点、最多 3 层、每父节点最多 4 子节点、8 节点以上单层不超过 60%；拓扑、枚举、引用、child map link 和 global constraint affected nodes 正确。
6. 当前 validator 不检查：根节点是否描述真实产品；总图一级分支是否为端到端业务能力；节点是否含业务对象、业务动作、业务结果；是否把“产品目标/目标用户/核心问题”等 PRD 章节当成一级主干；摘要是否为界面方法论套话。
7. `outline-discovery-data.json` 是可刷新候选，Discovery 不授权 `/sp.specify`；用户选择写入 append-only intent ledger。`[src:ai-proposed]` 不能自动成为事实。
8. Constitution 只能约束已确认业务事实，不能虚构目标用户、业务目标、能力、业务规则和范围。

## 请独立回答

1. 根因是否准确？还缺哪些机制层原因？
2. 如何重新定义 Constitution、PRD 和 Level 1 Outline 的输入/输出职责，避免职责混淆？
3. 设计一个可执行的生成流水线：从用户输入、PRD/source/已有 outline 中抽取什么中间事实，如何组成业务主干，何时拆图，如何绑定问题。
4. 信息不足时如何处理？哪些内容允许 `[src:ai-proposed]` 候选，哪些必须追问或阻断，不能用 Constitution 猜测？
5. 应增加哪些 schema 字段、确定性 validator 规则、模型语义自检和 renderer 文案约束？区分机器能可靠检查与只能由模型检查的部分。
6. 给出 2-3 种改造方案及取舍，明确推荐方案和最小可实施变更清单。
7. 指出可能的过度约束、误伤和回归风险，并给出测试重点。

请用中文输出，务必具体到规则、字段或验证条件；不要只说“优化提示词”“加强业务理解”。
