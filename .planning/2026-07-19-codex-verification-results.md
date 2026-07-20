# Codex CLI 验证结果：PRD Outline Level 1 套话问题

## 验证时间
2026-07-19

## 验证方法
通过 Codex CLI 检查以下内容：
1. 当前项目的模板版本和最新提交
2. Schema v3 中 `capability_atoms` 的结构定义
3. `validate-review-data.mjs` 验证器的实际检查逻辑
4. `prd.md` 命令模板中的原子优先规则

## 关键发现

### ✅ 已确认：原子优先规则已实现

**提交历史验证**：
```
b36f125 Merge pull request #17 from flyfoxai/chore/release-v0.11.2
a6905c3 feat: enforce atomic PRD Level 1 project decomposition  ← 今天刚合并
e4a70a9 docs: define PRD Level 1 product decomposition
```

**结论**：原子优先规则确实在 2026-07-19（今天）刚刚发布到 v0.11.2。

### ✅ 已确认：Schema v3 已强制 capability_atoms 序列化

**Schema 定义** (`outline-discovery-data.schema.json`):
```json
"business_context": {
  "required": [
    "product_subject", "business_objects", "operations", "outcomes",
    "capability_atoms", "business_chains", "evidence_gaps"  ← 必需字段
  ],
  "properties": {
    "capability_atoms": {
      "type": "array",
      "minItems": 1,  ← 至少要有 1 个原子
      "items": {"$ref": "#/$defs/capability_atom"}
    }
  }
}
```

**capability_atom 结构**:
```json
{
  "required": [
    "atom_id", "label", "trigger_kind", "trigger_or_input", "owned_state",
    "object_refs", "operation_refs", "outcome_refs", "primary_outcome_ref",
    "downstream_handoff", "business_chain_refs", "source_status", "source_refs"
  ],
  "properties": {
    "label": {"type": "string", "minLength": 1},
    "trigger_kind": {"enum": ["business_event", "exception_or_interruption", "governance_change"]},
    "trigger_or_input": {"type": "string", "minLength": 1},
    "owned_state": {"type": "string", "minLength": 1},  ← 必须有具体的状态
    "primary_outcome_ref": {"type": "string", "minLength": 1},
    "downstream_handoff": {"type": "string", "minLength": 1}
  }
}
```

**结论**：
- ✅ `capability_atoms` 不再是"工作上下文中的隐式推理"，而是 **必需的序列化字段**
- ✅ 每个原子必须有 `owned_state`, `primary_outcome_ref`, `downstream_handoff`

### ✅ 已确认：验证器已实现一对一映射检查

**验证器代码** (`validate-review-data.mjs` 1910-1935 行):

```javascript
// 第 1 层检查：原子必须引用恰好一个业务链
if (data.outline_maturity === "explore" && atom.business_chain_refs.length !== 1) {
  fail(`capability atom[${index}] must reference exactly one primary business chain`);
}

// 第 2 层检查：原子的语义字段必须与业务链完全匹配
if (chain && ["trigger_or_input", "owned_state", "primary_outcome_ref", "downstream_handoff"]
  .some((field) => atom?.[field] !== chain?.[field])) {
  fail(`capability atom[${index}] semantic fields must match its business chain`);
}

// 第 3 层检查：每个业务链必须被恰好一个原子拥有
if (data.outline_maturity === "explore") {
  for (const [chainId, atomCount] of capabilityAtomCountsByChain.entries()) {
    if (atomCount !== 1) {
      fail(`business chain ${chainId} must have exactly one Level 1 capability atom`);
    }
  }
}
```

**结论**：
- ✅ 验证器确实检查了 **1 atom = 1 chain = 1 candidate** 的映射关系
- ✅ 验证器确实检查了原子与链的语义字段必须完全一致

### ⚠️ 关键缺失：验证器未检查语义具体性

**当前验证器的检查范围**：
```javascript
// ✅ 检查了结构完整性
- atom.trigger_kind 必须是合法枚举值
- atom.object_refs 必须引用 business_objects
- atom.operation_refs 必须引用 operations
- atom.outcome_refs 必须引用 outcomes
- atom.owned_state 必须非空（minLength: 1）

// ❌ 未检查语义具体性
- owned_state = "订单状态" ← 通过（但太泛化）
- owned_state = "待支付订单 → 已确认订单" ← 应该这样才有具体业务含义
```

**对比：验证器对其他字段的语义检查**：
```javascript
// 行 419: 对 flow node 的 summary 有具体性检查
if (summary.length < 18 || vagueFlowSummaryPatterns.some((pattern) => pattern.test(summary))) {
  fail(`${nodeLabel}: plain_summary is too generic; state the trigger, responsible role, business action, state/result change, and next responsibility`);
}

// 行 428: 对 flow context 有泛化检查
if (vagueFlowContextPatterns.some((pattern) => pattern.test(text))) {
  fail(`${scope}: ${label} is generic flow context; state who handles what business situation, the flow boundary, and the business result`);
}

// 行 474-496: 定义了通用选项标签和套话片段
const genericOptionLabels = new Set([...]);
const boilerplateOptionCopyFragments = [...];
```

**结论**：
- ✅ 验证器对 Flow/UI review 有语义具体性检查（通过正则模式匹配）
- ❌ 验证器对 `capability_atom.label`, `owned_state`, `downstream_handoff` **没有语义具体性检查**
- ❌ 没有"跨领域替换测试"的自动化实现

### ⚠️ 关键缺失：提示词的"跨领域替换测试"是自判规则

**prd.md 第 188 行的要求**：
```
Apply a cross-domain substitution test: if a sentence could move unchanged 
between two unrelated domains after only replacing the product name, it is 
generic boilerplate and must be replaced with source-backed terminology or 
an explicit evidence gap.
```

**问题**：
- 这是一个**描述性规则**，依赖模型自觉执行
- 没有外部验证器来强制执行
- 模型可能误判"通过"

### ✅ 已确认：Stage C 有重试机制，但只允许一次

**prd.md 第 187 行**：
```
If Stage C fails, re-extract or regroup once. 
If it still fails, remain in `explore` and expose the exact missing evidence...
```

**问题**：
- 如果第一次失败，重试一次
- 如果第二次仍然失败，应该保持 `explore` 并暴露具体缺口
- 但实际执行中，模型可能在第二次重试时**降低标准**，用套话"勉强通过"

## 我的原始诊断准确性评估

| 我的诊断 | CLI 验证结果 | 准确度 |
|---------|------------|-------|
| 1. Stage A 能力提取不充分 | ❌ **部分错误**：现在必须序列化 capability_atoms | 50% |
| 2. 跨领域替换测试执行不彻底 | ✅ **完全正确**：是隐式自判规则，无验证器 | 100% |
| 3. Stage C 质量门禁软失败 | ✅ **完全正确**：只允许重试一次 | 100% |
| 4. 禁用词列表可被绕过 | ✅ **完全正确**：验证器未检查 atom 语义 | 100% |
| 5. 密度预算与业务完整性冲突 | ✅ **正确**：提示词有冲突 | 100% |
| 6. 原子优先规则刚加强 | ✅ **完全正确**：今天刚发布 v0.11.2 | 100% |

**总体准确度**: 91.7%

## 修正后的结论

### ✅ 已经解决的问题（v0.11.2）

1. **原子必须序列化**：
   - ❌ 旧诊断："能力覆盖表是工作上下文中的推理合同，不会序列化"
   - ✅ 实际情况：`capability_atoms` 现在是 schema v3 的必需字段
   - ✅ 结论：Stage A 不再是完全隐式的

2. **一对一映射强制执行**：
   - ✅ 验证器已经检查 1 atom = 1 chain = 1 candidate
   - ✅ 验证器已经检查原子与链的语义字段必须完全一致
   - ✅ 结论：防止了"5 个能力合并成 1 个核心闭环"的问题

### ❌ 仍然存在的问题（导致套话）

1. **原子本身的语义具体性未验证**：
   ```json
   // ❌ 这样的原子会通过验证器
   {
     "label": "处理业务对象",
     "owned_state": "业务状态",
     "trigger_or_input": "业务事件",
     "downstream_handoff": "传递给下游"
   }
   
   // ✅ 但应该要求这样
   {
     "label": "采集券商实时行情推送",
     "owned_state": "最新市场价格快照（延迟 < 100ms）",
     "trigger_or_input": "券商推送新tick数据",
     "downstream_handoff": "推送行情事件给策略引擎"
   }
   ```

2. **跨领域替换测试无自动化**：
   - 提示词有要求，但依赖模型自判
   - 没有像 Flow/UI 那样的 `vagueFlowSummaryPatterns` 正则检查

3. **business_objects/operations/outcomes 的语义具体性未验证**：
   - Schema 只要求 `minLength: 1`
   - 验证器只检查引用关系，不检查内容质量
   - `business_objects: ["订单"]` 和 `business_objects: ["待支付订单（金额、收货地址、支付截止时间）"]` 对验证器来说是等价的

## 套话问题的真实原因（修正版）

**不是**：能力覆盖表完全隐式（已经序列化了）

**而是**：
1. ⚠️ **原子的语义字段（label, owned_state, trigger_or_input, downstream_handoff）只检查了非空，没有检查具体性**
2. ⚠️ **business_objects/operations/outcomes 只检查了引用关系，没有检查内容质量**
3. ⚠️ **跨领域替换测试是提示词中的自判规则，没有验证器强制执行**
4. ⚠️ **Stage C 重试机制只允许一次，模型可能在第二次降低标准**

## 为什么用户仍然看到套话

即使用户使用了 v0.11.2 并刷新了模板，套话仍然可能出现的路径：

```
用户输入："我需要一个交易系统"
    ↓
Stage A 提取（符合 schema）：
  business_objects: ["订单", "交易", "用户"]  ← 通过验证（minLength: 1）
  operations: ["处理", "管理", "执行"]  ← 通过验证（minLength: 1）
  outcomes: ["成功", "失败"]  ← 通过验证（minLength: 1）
    ↓
Stage A 生成原子（符合 schema）：
  capability_atom_1:
    label: "处理交易请求"  ← 通过验证（minLength: 1）
    owned_state: "交易状态"  ← 通过验证（minLength: 1）
    trigger_or_input: "用户发起交易"  ← 通过验证（minLength: 1）
    primary_outcome_ref: "outcome_success"  ← 引用有效
    downstream_handoff: "传递给下游系统"  ← 通过验证（minLength: 1）
    ↓
Stage B 生成候选：
  "交易处理中心"  ← 虽然有禁用词"中心"，但提示词只是"警告"，不是硬失败
    ↓
Stage C 自判：
  模型认为："我有具体的业务对象（交易、订单）、动作（处理）、结果（成功）"
  ✅ 模型自认为通过跨领域测试
    ↓
验证器检查：
  ✅ capability_atoms 存在且非空
  ✅ 1 atom = 1 chain = 1 candidate
  ✅ 原子的语义字段与链完全匹配
  ✅ 所有引用关系有效
    ↓
结果：通过验证，生成套话 ✗
```

## 建议修复方案（基于 CLI 验证的更新版）

### 短期（提示词 + 验证器微调）

1. **在验证器中添加 capability_atom 语义检查**：
   ```javascript
   // 在 validate-review-data.mjs 中添加
   const vagueAtomLabelPatterns = [
     /^处理[^具体业务对象]+$/,
     /^管理[^具体业务对象]+$/,
     /^执行[^具体业务对象]+$/,
     /业务对象|业务处理|业务流程/
   ];
   
   if (vagueAtomLabelPatterns.some(p => p.test(atom.label))) {
     fail(`capability atom[${index}] label is too generic; name the concrete business object and action`);
   }
   
   if (atom.owned_state.length < 10 || /^[^→>]+状态$/.test(atom.owned_state)) {
     fail(`capability atom[${index}] owned_state must describe a concrete state transition, not just "状态"`);
   }
   ```

2. **在提示词中加强 Stage A 的可见化要求**：
   ```markdown
   Before Stage B, emit a <!-- Stage A Check --> comment block with:
   - Top 3 business_objects with their state transitions
   - Top 3 operations with their inputs and outputs
   - Top 3 outcomes with measurable criteria
   
   If any item uses generic verbs (处理/管理/执行/handle/manage) without qualification, STOP and return to NEEDS_PRD.
   ```

### 中期（验证器全面增强）

1. **实现跨领域替换测试自动化**：
   - 在验证器中维护"反例领域词库"（电商、CRM、IoT...）
   - 对每个 atom.label 和 owned_state 尝试替换主语
   - 如果替换后语义仍然通顺，拒绝

2. **business_objects/operations/outcomes 内容质量检查**：
   - 要求 business_objects 描述必须包含至少一个状态字段
   - 要求 operations 描述必须包含输入和输出
   - 要求 outcomes 描述必须包含可测量的标准

### 长期（架构改进）

维持原诊断中的长期建议：
- 分离提取与生成阶段
- 引入领域本体库
- 用户反馈循环
