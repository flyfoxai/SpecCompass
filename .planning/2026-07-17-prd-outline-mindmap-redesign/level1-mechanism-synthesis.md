# Level 1 Outline 业务能力生成机制优化汇总

## 目标

让 `/sp.prd` 的 Level 1 第一屏回答“这个产品实际做什么”，并且每个业务能力都可回溯到用户、正式文档、已确认选择或明确的模型候选。Constitution 只提供跨 feature 的治理约束，不能替 PRD 生成业务事实。

## 推荐方案：两阶段业务语义合同

### 1. 职责边界

- Constitution：正式长期治理、工程纪律、阶段门禁、验证要求、风险接受和人工决策规则。只进入独立全局约束图或 Level 3 覆盖检查。
- PRD：产品目标、角色、业务对象、业务动作、业务结果、能力范围、场景、验收意图和来源权威。
- Level 1：PRD 的业务能力发现视图；不是 PRD 章节目录，也不负责实现架构。
- Level 2：围绕 Level 1 业务节点收敛范围、场景、规则、首切片和验收边界。
- Level 3：整理已确认业务事实，并用 Constitution 检查治理覆盖；不能借 Constitution 新造产品能力。

### 2. 生成流水线

1. 读取用户输入、当前 PRD、现有 outline、正式 source 和 intent ledger；Constitution 单独读取为治理输入。
2. 生成内嵌 `business_context` 中间结构：产品主语、业务对象、业务动作、业务结果、角色/触发、外部依赖、证据引用和缺口。
3. 至少形成一条 `trigger/input -> action/control -> outcome/fact` 候选业务链。信息不足时允许模型提出业务能力候选，但必须保持 `ai-proposed` 并绑定确认问题。
4. 按业务内聚性聚合为最多三个 overview 业务主干，再保留一个全局约束入口，以满足根节点最多四个直接子节点。不得按 PRD 章节聚合。
5. 每个主干用真实业务对象和动作命名；详细能力进入第二层或 branch map。超过密度预算时按业务域拆图。
6. 根节点摘要由结构化业务链生成，必须说明业务输入/触发、核心处理和业务结果；运行保障只在有来源或候选标记时出现。
7. 未确认能力、范围、外部依赖和规则全部绑定到对应 `outline_node_id`；跨分支治理规则进入 global constraints map 并引用受影响业务节点。
8. 运行确定性 validator 和模型语义自检；连续两次仍无法形成具体业务主干时返回 `NEEDS_PRD`/`NEEDS_DECISION`，不再用方法论节点填空。

### 3. 建议的数据合同

- 顶层新增 `business_context`：`product_subject`、`objects[]`、`operations[]`、`outcomes[]`、`business_chains[]`、`evidence_gaps[]`。
- 对象、操作、结果和链条都带 `source_status` 与 `source_refs[]`；引用必须存在于 `source_snapshot`。
- overview 的根节点新增或关联 `business_chain_refs[]`；每个业务 map link/主干节点新增 `business_chain_refs[]`。
- 沿用现有 `node_kind` 和 `source_status`，避免重复增加 `semantic_type`/`src`。
- `global_constraints` 保持独立合同；其节点只能引用 Constitution、正式 source 或明确候选，不能成为业务能力证据。

### 4. 确定性质量门禁

- overview 根节点下只能出现业务 branch map link 和一个 global constraints map link；`goal`、`role`、`problem`、`scope` 不能成为第一层主干。
- 每个业务主干至少引用一条业务链；链条必须有具名对象、动作和结果，且至少一个来源引用。
- `ai-proposed` 的业务节点必须绑定至少一个该节点的问题，不能无声进入下一成熟度。
- 业务 branch map 不能只有 root 或方法论节点；至少包含一个具名业务能力节点，或者明确的待确认候选节点。
- global constraint 不能被引用为业务链的唯一能力来源。
- overview/map/node 的摘要不得复用 renderer 操作说明；只对完整元标题做窄匹配，不做全局关键词封杀。
- Level 1 进入 `frame` 除现有目标、角色、核心问题外，还要求至少一条由用户确认或正式 source 支持的业务链。

### 5. 模型语义自检

- 根节点测试：陌生读者能否说出系统接收/触发什么、做什么、产生什么业务结果？
- 主干测试：一级分支是在说“系统要做的事”，还是“描述系统的角度”？后者必须重构。
- 证据测试：逐节点区分 confirmed/doc/user-confirmed/ai-proposed，不能把行业常识写成事实。
- 闭环测试：是否存在只有输入和策略、没有业务结果或事实状态的断链？缺口应变成节点问题。
- Constitution 隔离测试：删除 Constitution 输入后，业务能力图仍应由 PRD/source 成立；Constitution 只影响约束图和覆盖结论。

### 6. Renderer 调整

- `project.current_understanding`、map summary、root summary 均展示真实业务内容。
- 删除“根节点保持稳定，分支节点承载业务语义”等固定正文；交互方法进入可折叠帮助或无障碍说明。
- `ai-proposed`、用户确认、正式文档来源使用低干扰视觉状态，不在标题前堆技术标签。
- 首屏标题使用实际项目/业务闭环名，不使用“Level 1 全局认知”“项目全局思维导图”等通用标题。

## 备选方案

1. 提示词和少量元话术校验：改动最小，但复杂输入仍会退化，适合临时止血。
2. 两阶段业务语义合同（推荐）：在现有 Discovery JSON 中保存结构化中间事实，兼顾可验证性、来源追踪和改造成本。
3. 独立 Business Inventory 编译器与持久化产物：长期可复用性最高，但引入新文件、迁移和同步责任，当前阶段成本过高。

## 实施顺序

1. 先为错误的抽象 overview、正确交易闭环、极稀疏输入、跨领域输入和 Constitution 污染建立失败测试。
2. 更新 `/sp.prd` 和方法论文档，加入两阶段生成与职责隔离规则。
3. 升级 Discovery schema/validator，加入 business context、证据引用和业务链门禁。
4. 清理 renderer 固定元文案并显示业务摘要/来源状态。
5. 做模板安装后的 stockprofits 端到端再生成测试，确认首屏得到业务能力图且所有候选问题绑定正确。
