# PRD Outline Level 1 套话问题修复工作方案

## 修复目标

在现有 v0.11.2 原子优先规则的基础上，增加语义具体性检查，防止生成通用套话。

## 修复范围

### Phase 1: 验证器增强（高优先级）

**文件**: `templates/project/.specify/review/scripts/validate-review-data.mjs`

**目标**: 在现有结构检查的基础上，增加 `capability_atom` 和 `business_context` 的语义具体性检查。

#### 1.1 添加通用词汇检测模式

在文件开头的常量定义区域（约 455-510 行附近），添加：

```javascript
// 通用能力原子标签模式（不允许）
const vagueCapabilityAtomPatterns = [
  // 空洞动词 + 泛化名词
  /^处理[^的]*$/,
  /^管理[^的]*$/,
  /^执行[^的]*$/,
  /^维护[^的]*$/,
  /^组织[^的]*$/,
  /^协调[^的]*$/,
  /^handle\s+[a-z\s]+$/i,
  /^manage\s+[a-z\s]+$/i,
  /^execute\s+[a-z\s]+$/i,
  /^process\s+[a-z\s]+$/i,
  
  // 元认知表达
  /业务对象|业务处理|业务流程|业务逻辑/,
  /系统功能|系统能力|系统模块/,
  /数据处理|数据管理|数据维护/,
  
  // 过于泛化的名词（没有具体领域含义）
  /^[^具体领域词汇]{0,6}(中心|平台|系统|模块|服务|引擎)$/,
];

// 通用状态描述模式（不允许）
const vagueStatePatterns = [
  /^[^→>]{0,10}状态$/,           // 只说"状态"，没有具体内容
  /^业务状态$/,
  /^数据状态$/,
  /^系统状态$/,
  /^state$/i,
  /^business\s+state$/i,
  /^data\s+state$/i,
];

// 通用触发器描述模式（不允许）
const vagueTriggerPatterns = [
  /^用户操作$/,
  /^业务事件$/,
  /^系统事件$/,
  /^外部触发$/,
  /^user\s+action$/i,
  /^business\s+event$/i,
  /^system\s+event$/i,
];

// 通用交接描述模式（不允许）
const vagueHandoffPatterns = [
  /^传递给下游$/,
  /^发送给.*系统$/,
  /^推送给.*模块$/,
  /^pass\s+to\s+downstream$/i,
  /^send\s+to\s+[a-z\s]+system$/i,
];

// 通用业务对象描述模式（不允许）
const vagueBusinessObjectPatterns = [
  /^数据$/,
  /^信息$/,
  /^对象$/,
  /^实体$/,
  /^业务数据$/,
  /^业务对象$/,
  /^data$/i,
  /^information$/i,
  /^object$/i,
  /^entity$/i,
];
```

#### 1.2 添加语义具体性验证函数

在现有验证函数区域（约 410-450 行附近），添加：

```javascript
/**
 * 检查文本是否为通用套话（跨领域替换测试的简化版）
 * @param {string} text - 要检查的文本
 * @param {Array<RegExp>} patterns - 通用模式列表
 * @returns {boolean} - 如果匹配任何通用模式则返回 true
 */
function isGenericBoilerplate(text, patterns) {
  const normalized = compactText(text);
  return patterns.some((pattern) => pattern.test(normalized));
}

/**
 * 验证 capability_atom 的语义具体性
 * @param {string} atomLabel - 用于错误消息的标签
 * @param {object} atom - capability_atom 对象
 */
function validateCapabilityAtomSemantics(atomLabel, atom) {
  // 检查 label 具体性
  if (isGenericBoilerplate(atom.label, vagueCapabilityAtomPatterns)) {
    fail(`${atomLabel}: label is too generic; name the concrete business object, specific action, and observable result (e.g., "采集券商实时行情推送" not "处理市场数据")`);
  }
  
  // 检查 owned_state 具体性
  const state = compactText(atom.owned_state);
  if (state.length < 10) {
    fail(`${atomLabel}: owned_state is too short; describe the concrete business state with key attributes (at least 10 chars)`);
  }
  if (isGenericBoilerplate(state, vagueStatePatterns)) {
    fail(`${atomLabel}: owned_state is too generic; describe a concrete state transition or business fact (e.g., "待支付订单 → 已确认订单" not "订单状态")`);
  }
  
  // 检查 trigger_or_input 具体性
  const trigger = compactText(atom.trigger_or_input);
  if (trigger.length < 8) {
    fail(`${atomLabel}: trigger_or_input is too short; name the concrete trigger source and event (at least 8 chars)`);
  }
  if (isGenericBoilerplate(trigger, vagueTriggerPatterns)) {
    fail(`${atomLabel}: trigger_or_input is too generic; name the specific business event or external system (e.g., "券商推送新tick数据" not "业务事件")`);
  }
  
  // 检查 downstream_handoff 具体性
  const handoff = compactText(atom.downstream_handoff);
  if (handoff.length < 10) {
    fail(`${atomLabel}: downstream_handoff is too short; describe what is handed off and to whom (at least 10 chars)`);
  }
  if (isGenericBoilerplate(handoff, vagueHandoffPatterns)) {
    fail(`${atomLabel}: downstream_handoff is too generic; name the specific business fact/command/event and target responsibility (e.g., "推送行情事件给策略引擎，包含价格和成交量" not "传递给下游系统")`);
  }
}

/**
 * 验证 business_object 的语义具体性
 * @param {string} objectLabel - 用于错误消息的标签
 * @param {object} businessObject - business_object 对象
 */
function validateBusinessObjectSemantics(objectLabel, businessObject) {
  const label = compactText(businessObject.label);
  
  // 检查是否过于泛化
  if (isGenericBoilerplate(label, vagueBusinessObjectPatterns)) {
    fail(`${objectLabel}: label is too generic; name the concrete business entity with key attributes (e.g., "待支付订单（金额、收货地址、支付截止时间）" not "订单")`);
  }
  
  // 检查最小长度（避免单个词）
  if (label.length < 4) {
    fail(`${objectLabel}: label is too short; provide a descriptive business object name with context (at least 4 chars)`);
  }
}

/**
 * 验证 business_operation 的语义具体性
 * @param {string} operationLabel - 用于错误消息的标签
 * @param {object} operation - business_operation 对象
 */
function validateBusinessOperationSemantics(operationLabel, operation) {
  const label = compactText(operation.label);
  
  // 检查空洞动词
  const emptyVerbs = ['处理', '管理', '维护', '执行', '组织', '协调', 'handle', 'manage', 'process', 'execute', 'maintain'];
  const startsWithEmptyVerb = emptyVerbs.some(verb => label.startsWith(verb) || label.toLowerCase().startsWith(verb));
  
  if (startsWithEmptyVerb && label.length < 15) {
    fail(`${operationLabel}: label uses a generic verb without qualification; describe the specific input, action, and output (e.g., "解析券商推送的tick数据并更新价格缓存" not "处理市场数据")`);
  }
  
  // 检查最小长度
  if (label.length < 8) {
    fail(`${operationLabel}: label is too short; describe what happens, to what, and why (at least 8 chars)`);
  }
}

/**
 * 验证 business_outcome 的语义具体性
 * @param {string} outcomeLabel - 用于错误消息的标签
 * @param {object} outcome - business_outcome 对象
 */
function validateBusinessOutcomeSemantics(outcomeLabel, outcome) {
  const label = compactText(outcome.label);
  
  // 检查是否只是抽象成功/失败
  const abstractOutcomes = ['成功', '失败', '完成', '错误', 'success', 'failure', 'complete', 'error', 'done'];
  if (abstractOutcomes.includes(label.toLowerCase())) {
    fail(`${outcomeLabel}: label is too abstract; describe the concrete observable result with measurable criteria (e.g., "行情数据已更新，延迟 < 100ms" not "成功")`);
  }
  
  // 检查最小长度
  if (label.length < 10) {
    fail(`${outcomeLabel}: label is too short; describe what changed, what can be verified, and by whom (at least 10 chars)`);
  }
}
```

#### 1.3 在现有验证流程中调用新函数

在 `validateOutlineDiscoveryBusinessContext` 函数中（约 1800-1950 行），找到对应的验证循环，添加语义检查调用：

**位置 1**: 在 business_objects 验证循环中（约 1850 行附近）：
```javascript
for (const [index, obj] of objects.values.entries()) {
  if (!String(obj?.object_id || "").trim() || !String(obj?.label || "").trim()) {
    fail(`business_object[${index}] fields are required`);
  }
  if (objectIds.has(obj.object_id)) fail(`duplicate business object_id ${obj.object_id}`);
  objectIds.add(obj.object_id);
  
  // 新增：语义具体性检查
  validateBusinessObjectSemantics(`business_object[${index}]`, obj);
}
```

**位置 2**: 在 operations 验证循环中（约 1860 行附近）：
```javascript
for (const [index, op] of operations.values.entries()) {
  if (!String(op?.operation_id || "").trim() || !String(op?.label || "").trim()) {
    fail(`business_operation[${index}] fields are required`);
  }
  if (operationIds.has(op.operation_id)) fail(`duplicate operation_id ${op.operation_id}`);
  operationIds.add(op.operation_id);
  
  // 新增：语义具体性检查
  validateBusinessOperationSemantics(`business_operation[${index}]`, op);
}
```

**位置 3**: 在 outcomes 验证循环中（约 1870 行附近）：
```javascript
for (const [index, outcome] of outcomes.values.entries()) {
  if (!String(outcome?.outcome_id || "").trim() || !String(outcome?.label || "").trim()) {
    fail(`business_outcome[${index}] fields are required`);
  }
  if (outcomeIds.has(outcome.outcome_id)) fail(`duplicate outcome_id ${outcome.outcome_id}`);
  outcomeIds.add(outcome.outcome_id);
  
  // 新增：语义具体性检查
  validateBusinessOutcomeSemantics(`business_outcome[${index}]`, outcome);
}
```

**位置 4**: 在 capability_atoms 验证循环中（约 1897 行附近），在现有检查之后添加：
```javascript
for (const [index, atom] of atoms.values.entries()) {
  // ... 现有的结构检查 ...
  
  // 新增：在所有结构检查通过后，检查语义具体性
  validateCapabilityAtomSemantics(`capability_atom[${index}]`, atom);
}
```

### Phase 2: 提示词增强（中优先级）

**文件**: `templates/commands/prd.md`

**目标**: 在 Stage A/C 中增加显式的语义检查要求。

#### 2.1 增强 Stage A 要求（第 175 行附近）

在现有 Stage A 段落后添加：

```markdown
   - Before compiling any map, build a capability coverage table with the real `product_subject`, `business_objects`, `operations`, `outcomes`, `capability_atoms`, `business_chains`, and `evidence_gaps`. A `capability_atom` is the smallest source-backed statement of what the product stores, creates, changes, decides, controls, exchanges, delivers, or verifies. Each complete business chain must connect a trigger or input, at least one business object and starting state, an operation or control, and a resulting state or observable outcome, with `source_refs`. Serialize every atom into `business_context.capability_atoms` with `atom_id`, `label`, `trigger_kind`, `trigger_or_input`, `owned_state`, object/action/outcome references, `primary_outcome_ref`, `downstream_handoff`, exactly one Level 1 `business_chain_ref`, and source evidence. Classify `trigger_kind` from the actual source trigger as `business_event`, `exception_or_interruption`, or `governance_change`; never choose it to make a preferred grouping pass. In Level 1, one atom must contribute to exactly one independently accepted outcome. Allocate every source-backed capability atom exactly once through the `capability_atom_refs` of one Overview business `map_link`; cross-cutting constraints are owned once in `global_constraints` and reference affected nodes without duplicating capability ownership. Do not erase an atom through summarization. The allocation table and Stage C check results remain private compilation work: never serialize or narrate the table itself, stage labels, quality checklist, or self-review in visible copy.
   - Extract all capability atoms as a flat list before creating any chain, project title, map, or question. Do not let an end-to-end story demote an independently accepted state change into an internal step. The initial Level 1 compilation is strictly one capability atom, one business chain, and one candidate project. The atom and chain must carry identical `trigger_kind`, `trigger_or_input`, `owned_state`, `primary_outcome_ref`, and `downstream_handoff` values. The initial compiler must not merge atoms during initial Level 1 generation, even when they are sequential, share a business object or store, run in one process, or contribute to one later terminal result.
   - **Stage A semantic quality gate**: after extracting capability atoms, apply these specificity checks before proceeding to Stage B. Each `business_object` must name a concrete business entity with key attributes, not just a category word like "数据" or "订单" without context. Each `operation` must describe a specific input, transformation, and output, not just an empty verb like "处理" or "manage". Each `outcome` must state an observable result with measurable criteria, not just "成功" or "完成". Each `capability_atom.label` must name the concrete business responsibility with domain terminology that cannot be reused across unrelated domains. Each `owned_state` must describe a specific business state or state transition with key fields, not just "业务状态" or "数据状态". Each `trigger_or_input` must identify the originating system, role, or event type, not just "业务事件" or "用户操作". Each `downstream_handoff` must name the exchanged business fact, command, or event and the receiving responsibility, not just "传递给下游" or "发送给系统". If any atom, object, operation, or outcome fails this check, re-extract with focus on source-backed domain terminology before attempting Stage B. Do not proceed to map generation with generic placeholders.
```

#### 2.2 增强 Stage C 检查（第 188 行附近）

在现有 Stage C 段落中，将这一句：

```markdown
   - Run a final visible-copy sanitization pass over map titles, summaries, nodes, questions, candidates, recommendations, and the user-facing response. Every visible business statement must include a source-backed domain object, a domain action or control, and a resulting state, observable outcome, or named handoff; a title may use a concise object-action phrase when its linked node supplies the result. Reject empty verbs or nouns such as manage, handle, support, organize, build, optimize, coordinate, ensure, capability, solution, or stability when they are not qualified by those domain facts. Apply a cross-domain substitution test: if a sentence could move unchanged between two unrelated domains after only replacing the product name, it is generic boilerplate and must be replaced with source-backed terminology or an explicit evidence gap. Remove any mention of Stage A/B/C, coverage tables, quality checks, self-review, permission to create files, feature-directory creation, SP routing, renderer behavior, or how the answer was generated; do not announce that sanitization occurred. A formally named external product may remain only as a dependency or handoff endpoint. Re-run Stage C after sanitization and do not emit the response if the visible text still violates this rule.
```

替换为：

```markdown
   - Run a final visible-copy sanitization pass over map titles, summaries, nodes, questions, candidates, recommendations, and the user-facing response. Every visible business statement must include a source-backed domain object, a domain action or control, and a resulting state, observable outcome, or named handoff; a title may use a concise object-action phrase when its linked node supplies the result. Reject empty verbs or nouns such as manage, handle, support, organize, build, optimize, coordinate, ensure, capability, solution, or stability when they are not qualified by those domain facts. Apply a cross-domain substitution test: if a sentence could move unchanged between two unrelated domains after only replacing the product name, it is generic boilerplate and must be replaced with source-backed terminology or an explicit evidence gap. Specifically test each candidate title, atom label, and summary by mentally replacing the product name with an unrelated domain (e.g., replace "交易系统" with "电商系统" or "内容管理系统"); if the text still makes sense without any other changes, it fails the test and must be rewritten with domain-specific terminology. Remove any mention of Stage A/B/C, coverage tables, quality checks, self-review, permission to create files, feature-directory creation, SP routing, renderer behavior, or how the answer was generated; do not announce that sanitization occurred. A formally named external product may remain only as a dependency or handoff endpoint. Re-run Stage C after sanitization and do not emit the response if the visible text still violates this rule.
```

### Phase 3: 回归测试（必需）

**目标**: 确保新增的语义检查不会误杀合法的业务描述。

#### 3.1 创建测试文件

**文件**: `tests/fixtures/outline-discovery-semantic-quality/`

创建以下测试 fixtures：

**3.1.1 合法案例** - `valid-specific-trading.json`:
```json
{
  "business_context": {
    "business_objects": [
      {
        "object_id": "obj_001",
        "label": "实时市场行情（价格、成交量、tick时间戳）",
        "source_status": "user",
        "source_refs": ["prd"]
      }
    ],
    "operations": [
      {
        "operation_id": "op_001",
        "label": "解析券商推送的tick数据并更新内存价格缓存",
        "source_status": "user",
        "source_refs": ["prd"]
      }
    ],
    "outcomes": [
      {
        "outcome_id": "out_001",
        "label": "行情数据已更新到缓存，策略引擎可读取，延迟 < 100ms",
        "source_status": "user",
        "source_refs": ["prd"]
      }
    ],
    "capability_atoms": [
      {
        "atom_id": "atom_001",
        "label": "采集券商实时行情推送",
        "trigger_kind": "business_event",
        "trigger_or_input": "券商接口推送新tick数据",
        "owned_state": "最新市场价格快照（包含价格、成交量、时间戳）",
        "object_refs": ["obj_001"],
        "operation_refs": ["op_001"],
        "outcome_refs": ["out_001"],
        "primary_outcome_ref": "out_001",
        "downstream_handoff": "推送行情变化事件给策略引擎，包含品种代码和最新价格",
        "business_chain_refs": ["chain_001"],
        "source_status": "user",
        "source_refs": ["prd"]
      }
    ]
  }
}
```

**3.1.2 套话案例** - `invalid-generic-boilerplate.json`:
```json
{
  "business_context": {
    "business_objects": [
      {
        "object_id": "obj_001",
        "label": "数据",
        "source_status": "user",
        "source_refs": ["prd"]
      }
    ],
    "operations": [
      {
        "operation_id": "op_001",
        "label": "处理",
        "source_status": "user",
        "source_refs": ["prd"]
      }
    ],
    "outcomes": [
      {
        "outcome_id": "out_001",
        "label": "成功",
        "source_status": "user",
        "source_refs": ["prd"]
      }
    ],
    "capability_atoms": [
      {
        "atom_id": "atom_001",
        "label": "处理业务对象",
        "trigger_kind": "business_event",
        "trigger_or_input": "业务事件",
        "owned_state": "业务状态",
        "object_refs": ["obj_001"],
        "operation_refs": ["op_001"],
        "outcome_refs": ["out_001"],
        "primary_outcome_ref": "out_001",
        "downstream_handoff": "传递给下游",
        "business_chain_refs": ["chain_001"],
        "source_status": "user",
        "source_refs": ["prd"]
      }
    ]
  }
}
```

#### 3.2 更新测试脚本

**文件**: `tests/test_sp_methodology_templates.py`

添加新的测试函数：

```python
def test_outline_discovery_semantic_quality():
    """Test that validator rejects generic boilerplate in capability atoms"""
    
    # 测试合法的具体描述应该通过
    valid_fixture = "tests/fixtures/outline-discovery-semantic-quality/valid-specific-trading.json"
    result = subprocess.run(
        ["node", "templates/project/.specify/review/scripts/validate-review-data.mjs", valid_fixture],
        capture_output=True,
        text=True
    )
    assert result.returncode == 0, f"Valid specific descriptions should pass: {result.stderr}"
    
    # 测试套话应该被拒绝
    invalid_fixture = "tests/fixtures/outline-discovery-semantic-quality/invalid-generic-boilerplate.json"
    result = subprocess.run(
        ["node", "templates/project/.specify/review/scripts/validate-review-data.mjs", invalid_fixture],
        capture_output=True,
        text=True
    )
    assert result.returncode != 0, "Generic boilerplate should be rejected"
    
    # 检查错误消息是否包含预期的语义检查失败
    error_output = result.stderr.lower()
    assert "too generic" in error_output or "too short" in error_output or "too abstract" in error_output, \
        f"Error should mention semantic quality issue: {result.stderr}"
```

### Phase 4: 文档更新（低优先级）

**文件**: `docs/reference/sp-project-methodology.md`

在 PRD Level 1 部分添加语义质量要求的说明。

## 实施顺序

1. ✅ **Phase 1.1**: 添加通用词汇检测模式（10 分钟）
2. ✅ **Phase 1.2**: 添加语义具体性验证函数（20 分钟）
3. ✅ **Phase 1.3**: 在现有验证流程中调用新函数（15 分钟）
4. ✅ **Phase 3.1**: 创建测试 fixtures（15 分钟）
5. ✅ **Phase 3.2**: 运行回归测试，验证不会误杀（10 分钟）
6. ✅ **Phase 2.1**: 增强提示词 Stage A 要求（10 分钟）
7. ✅ **Phase 2.2**: 增强提示词 Stage C 检查（5 分钟）
8. ✅ **Phase 3.2**: 更新测试脚本（可选，如果时间允许）
9. ✅ **Phase 4**: 文档更新（可选，如果时间允许）

**预计总时间**: 1-1.5 小时（核心功能）

## 验收标准

### 必须通过的测试

1. **现有回归测试全部通过**：
   ```bash
   uv run pytest tests/test_sp_methodology_templates.py -q
   # 应该看到 195 passed（或更多）
   ```

2. **验证器能拒绝套话**：
   ```bash
   node templates/project/.specify/review/scripts/validate-review-data.mjs \
     tests/fixtures/outline-discovery-semantic-quality/invalid-generic-boilerplate.json
   # 应该返回非 0 退出码，错误消息包含 "too generic"
   ```

3. **验证器能接受具体描述**：
   ```bash
   node templates/project/.specify/review/scripts/validate-review-data.mjs \
     tests/fixtures/outline-discovery-semantic-quality/valid-specific-trading.json
   # 应该返回 0 退出码
   ```

4. **JavaScript 语法检查**：
   ```bash
   node --check templates/project/.specify/review/scripts/validate-review-data.mjs
   # 应该没有输出，退出码为 0
   ```

### 可选的端到端测试

如果时间允许，运行完整的 PRD 生成测试：

```bash
# 在一个测试项目中运行
/sp.prd test-feature
```

预期结果：
- 如果 PRD 输入很泛化，生成的 `outline-discovery-data.json` 应该包含具体的业务描述
- 如果模型仍然生成套话，验证器应该拒绝这个 JSON

## 风险和缓解措施

### 风险 1: 误杀合法的业务描述

**缓解**：
- 模式匹配要足够宽松，只拒绝明显的套话
- `owned_state` 最小长度设为 10 字符（允许短但具体的描述，如"已支付订单"）
- 通过回归测试验证不会误杀

### 风险 2: 不同语言（中文/英文）的模式覆盖不全

**缓解**：
- 在模式中同时包含中英文套话
- 使用通用的语义特征（如"只有动词+名词，长度 < X"）而不是穷举所有可能的套话

### 风险 3: 验证器过于严格，导致正常 PRD 无法通过

**缓解**：
- 从最明显的套话开始（"处理业务对象"、"业务状态"）
- 逐步收紧，观察实际使用情况
- 保留提示词中的"重试一次"机制，给模型改正机会

## 交付物检查清单

- [ ] `templates/project/.specify/review/scripts/validate-review-data.mjs` 已更新
- [ ] `templates/commands/prd.md` 已更新
- [ ] `tests/fixtures/outline-discovery-semantic-quality/valid-specific-trading.json` 已创建
- [ ] `tests/fixtures/outline-discovery-semantic-quality/invalid-generic-boilerplate.json` 已创建
- [ ] 现有回归测试全部通过
- [ ] 新的语义质量测试通过
- [ ] JavaScript 语法检查通过
- [ ] Git commit message 遵循项目规范

## 提交消息模板

```
feat(prd): add semantic quality checks for capability atoms

Prevent generic boilerplate in outline discovery by validating:
- capability_atom labels, owned_state, triggers, and handoffs
- business_objects, operations, and outcomes descriptions

Validator now rejects:
- Empty verbs without qualification (处理/管理/handle/manage)
- Generic state descriptions (业务状态/state)
- Abstract outcomes (成功/failure)
- Vague handoffs (传递给下游/pass to downstream)

Enhances Stage A and Stage C in prd.md template with explicit
cross-domain substitution test guidance.

Relates-to: #套话问题诊断 2026-07-19

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
