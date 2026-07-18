# PRD Level 1 Business Context Design

## 目标

让 `/sp.prd` 的 Level 1 首屏稳定回答“这个产品实际做什么”，先从证据中提取业务对象、动作、结果和业务链，再生成业务能力思维导图。同时在 PRD 审核界面展示当前 Constitution 的适用条款，但保持只读，且不得用这些条款推导产品能力。

## 职责边界

- `/sp.constitution` 负责项目级长期治理，包括工程原则、质量门禁、验证要求、风险接受和人工决策规则。
- `/sp.prd` 负责产品目标、用户、业务对象、业务动作、业务结果、能力范围、场景和验收意图。
- Level 1 是 PRD 的业务能力发现视图，不是 PRD 章节目录，也不是实现架构图。
- Constitution 只以只读快照进入独立的全局治理约束区域。PRD 不得修改 Constitution，不得把 Constitution 作为业务对象、动作、结果或能力的证据。
- Constitution 中没有与当前 feature 明确相关的条款时，界面显示未识别到适用条款，不生成占位治理规则。

## 两阶段生成合同

### 阶段一：业务语义提取

`/sp.prd` 从用户输入、当前 PRD、正式来源、现有 Outline 和 intent ledger 提取 `business_context`：

- `product_subject`：产品或能力的真实业务主语。
- `business_objects`：被创建、读取、改变、决策或交付的业务对象。
- `operations`：系统或角色对业务对象执行的动作。
- `outcomes`：动作产生的业务结果、状态或可核验事实。
- `business_chains`：由触发/输入、动作/控制和结果/事实组成的端到端链条。
- `evidence_gaps`：阻止业务链成为已确认事实的缺口。

每个语义条目沿用 `source_status`，并用 `source_refs` 指向 `source_snapshot` 中的来源。模型补充只能是 `ai-proposed`，不得无声升级为事实。

### 阶段二：业务导图编译

- Overview 根节点使用产品或业务闭环名称，摘要说明触发或输入、核心处理和业务结果。
- Overview 的直接子节点只能是业务 branch map link，以及最多一个 global constraints map link。
- 业务主干按业务内聚性聚合，最多三个；“目标、用户、问题、范围”不能作为一级业务主干。
- 每个业务主干必须引用至少一条 `business_chain`。详细能力进入 branch map，并继续遵守既有密度预算。
- Constitution 条款只出现在 global constraints map，并通过 `affected_node_ids` 说明影响哪些业务节点。
- `ai-proposed` 业务节点必须绑定至少一个确认问题；信息不足时保留候选和缺口，不用方法论文字填空。
- 每个候选都必须通过 `business_chain_refs` 引用业务链，包括推荐项；这样推荐依据可被 schema、CLI、浏览器和写回器共同校验。

## Constitution 只读展示合同

Discovery 数据新增 `constitution_snapshot`：

- `source_path`：通常为 `.specify/memory/constitution.md`。
- `availability`：`available` 或 `missing`。
- `display_mode`：固定为 `read_only`。
- `application_scope`：固定为 `governance_only`。
- `clauses`：与当前 feature 明确相关的条款标题、摘要、来源锚点和适用状态。

条款节点必须引用 `constitution_snapshot.clauses[].clause_id`。条款没有明确影响对象时可以展示，但不能伪造 `affected_node_ids`；全局约束节点若声明影响范围，引用必须指向业务 branch 节点。任何 Discovery response 都不能以 Constitution 条款为写回目标。

## 成熟度与失败行为

- `explore` 仍要求用户深度参与，但进入 `frame` 除目标、角色和核心问题外，还要求至少一条由用户确认或正式文档支持的完整业务链。
- 连续两次仍无法从现有证据形成具体业务主干时，返回 `NEEDS_PRD` 或 `NEEDS_DECISION`，并把缺口绑定到对应候选节点。
- 删除 Constitution 输入后，业务能力图仍必须能够从 PRD、用户输入和正式业务来源成立。

## 数据版本与兼容性

Outline Discovery data、response 和 intent ledger 从 schema v2 升级到 v3。v2 数据不静默升级；目标项目刷新当前分支模板后重新生成 Discovery 数据。正式 Outline confirmation 的 schema 版本不随本次改造变化。

## Renderer

- 首屏显示真实项目名称和业务闭环摘要，不显示“Level 1 全局认知”“项目全局思维导图”等通用正文。
- 业务图仍是主视图；Constitution 条款在独立只读区域展示来源和适用状态，不提供选择、编辑或写回控件。
- 交互说明降为帮助信息，不占用项目业务摘要。
- 来源状态以低干扰标识呈现，不在业务标题前增加技术分类标签。

## 验证

- 正确交易闭环样例必须通过。
- 以目标、用户、问题为 Overview 一级主干的样例必须失败。
- 缺少对象、动作、结果、来源或业务链引用的样例必须失败。
- `ai-proposed` 业务节点没有绑定问题时必须失败。
- Constitution 被用作业务链唯一证据时必须失败。
- Constitution 只读条款存在、缺失及非法写回分别覆盖测试。
- 运行 schema、Node 校验器、浏览器运行时校验器、写回校验器和 renderer smoke test。
