# Level 1 串行语义编译流程修复方案

## 背景与问题根因

当前 `/sp.prd` Level 1 产出套话或过度聚合的根本原因不是模型能力不足，而是 SP 机制把下列本应串行的任务压缩进同一次 prompt 生成：

1. 读取源材料、提取业务能力语义
2. 编排 XMind 候选项目结构
3. 压缩成可渲染的图（受 density_budget 约束）
4. 生成用户可点击的 Discovery 问题
5. 输出满足 JSON schema 的完整 artifact
6. 维护 readiness/route 状态机

这导致模型被诱导为"先产出紧凑可渲染的三分候选，再让 atom/chain/project 内部自洽"。展示约束实际上污染了语义提取。

## 核心修复原则

1. **内容生成阶段单独运行**：Stage A（源能力提取）不能出现 map、density、question、candidate project 等任何展示词。
2. **串行冻结**：后一阶段只能引用已冻结的前一阶段产物，不能回头改写语义。
3. **展示只能组织，不能合并**：密度约束只能增加地图，不能减少能力原子数量。
4. **合并只能来自用户 Discovery 确认**：模型初始生成禁止任何 merge disposition。

---

## Phase 1 — Schema 扩展

### 目标
在 `outline-discovery-data.schema.json` 中新增 `source_capability_coverage` 字段，强制要求模型序列化源材料识别的每个可独立验收业务能力。

### 修改文件
`templates/project/.specify/review/schemas/outline-discovery-data.schema.json`

### 工作细节

#### 1.1 在 `business_context` 的 required 列表中增加 `source_capability_coverage`

当前 required:
```json
"required": [
  "product_subject", "business_objects", "operations", "outcomes",
  "capability_atoms", "business_chains", "evidence_gaps"
]
```

修改后 required:
```json
"required": [
  "product_subject", "business_objects", "operations", "outcomes",
  "source_capability_coverage",
  "capability_atoms", "business_chains", "evidence_gaps"
]
```

#### 1.2 在 `business_context.properties` 中增加 `source_capability_coverage` 字段定义

```json
"source_capability_coverage": {
  "type": "array",
  "minItems": 1,
  "items": {"$ref": "#/$defs/source_capability_entry"}
}
```

#### 1.3 在 `$defs` 中增加 `source_capability_entry` 定义

```json
"source_capability_entry": {
  "type": "object",
  "additionalProperties": false,
  "required": [
    "source_capability_id", "label", "trigger_or_input",
    "owned_state", "observable_outcome",
    "disposition", "source_refs"
  ],
  "properties": {
    "source_capability_id": {"type": "string", "minLength": 1},
    "label": {"type": "string", "minLength": 4},
    "trigger_or_input": {"type": "string", "minLength": 8},
    "owned_state": {"type": "string", "minLength": 10},
    "observable_outcome": {"type": "string", "minLength": 10},
    "independent_acceptance_reason": {"type": "string"},
    "disposition": {
      "type": "string",
      "enum": ["atom", "evidence_gap", "excluded_by_source"]
    },
    "capability_atom_ref": {"type": "string", "minLength": 1},
    "evidence_gap_ref": {"type": "string", "minLength": 1},
    "source_refs": {
      "type": "array", "minItems": 1,
      "items": {"type": "string", "minLength": 1}
    }
  },
  "allOf": [
    {
      "if": {"properties": {"disposition": {"const": "atom"}}},
      "then": {"required": ["capability_atom_ref"]}
    },
    {
      "if": {"properties": {"disposition": {"const": "evidence_gap"}}},
      "then": {"required": ["evidence_gap_ref"]}
    }
  ]
}
```

注意：`disposition` 仅允许 `atom | evidence_gap | excluded_by_source`。不允许 `user_confirmed_merge`，因为初始 explore 阶段用户尚未确认合并。

#### 1.4 新增 value_stream map_kind

当前 `maps[].map_kind` enum 为：`["overview", "branch", "global_constraints"]`

需要增加 `"value_stream"` 值：

```json
"map_kind": {
  "enum": ["overview", "branch", "global_constraints", "value_stream"]
}
```

`value_stream` map 是展示分组容器，Overview 链接到它，它再链接到各 branch map。它本身不持有 `capability_atom`，只起分组作用。Validator 中的 `isLevelOneProjectLink` 判断必须排除 `value_stream` map 下的节点（见 Phase 2 的 2.5）。

#### 1.5 修改 `outline_maturity` 的描述注释

在 schema 的 `$comment` 或文档字符串中注明：
- `explore` 阶段禁止 `user_confirmed_merge` disposition
- 此字段在 schema v3 中增加（本次修改不改 schema_version，作为 v3 的向后兼容增量）

---

## Phase 2 — Validator 扩展

### 目标
在 `validate-review-data.mjs` 中增加四类硬规则：
1. Source capability coverage 完整性（一对一覆盖）
2. 初始 explore 禁止 merge disposition
3. Atom 粒度过粗检测
4. 密度合并话术扫描

### 修改文件
`templates/project/.specify/review/scripts/validate-review-data.mjs`

### 工作细节

#### 2.1 新增 `validateSourceCapabilityCoverage` 函数

在 `validateOutlineDiscoveryBusinessContext` 函数内，原子验证循环之后添加：

```javascript
function validateSourceCapabilityCoverage(data) {
  const context = data.business_context;
  const coverage = context?.source_capability_coverage;
  
  if (!Array.isArray(coverage) || coverage.length === 0) {
    fail("business_context.source_capability_coverage must be a non-empty array");
    return;
  }
  
  const atomsById = new Map(
    (context?.capability_atoms ?? []).map(a => [a?.atom_id, a])
  );
  const evidenceGapIds = new Set(
    (context?.evidence_gaps ?? []).map(g => g?.gap_id)
  );
  
  const atomRefCounts = new Map();
  const coverageIds = new Set();
  
  for (const [index, entry] of coverage.entries()) {
    const entryLabel = `source_capability_coverage[${index}]`;
    
    // ID uniqueness
    if (!entry?.source_capability_id?.trim()) {
      fail(`${entryLabel}: source_capability_id is required`);
    } else {
      if (coverageIds.has(entry.source_capability_id)) {
        fail(`${entryLabel}: duplicate source_capability_id ${entry.source_capability_id}`);
      }
      coverageIds.add(entry.source_capability_id);
    }
    
    // Disposition validation
    const allowedDispositions = new Set(["atom", "evidence_gap", "excluded_by_source"]);
    if (!allowedDispositions.has(entry?.disposition)) {
      fail(`${entryLabel}: disposition must be one of atom, evidence_gap, excluded_by_source`);
    }
    
    // Note: disposition "user_confirmed_merge" is excluded from the schema enum
    // so this case is handled by JSON Schema validation before reaching this code.
    // It is listed here only to document intent for future schema extensions.
    if (entry?.disposition === "user_confirmed_merge") {
      fail(`${entryLabel}: disposition user_confirmed_merge is not allowed in initial explore; merging requires a validated Discovery response`);
    }
    
    // atom disposition: must have capability_atom_ref pointing to a real atom
    if (entry?.disposition === "atom") {
      if (!entry?.capability_atom_ref) {
        fail(`${entryLabel}: disposition=atom requires capability_atom_ref`);
      } else if (!atomsById.has(entry.capability_atom_ref)) {
        fail(`${entryLabel}: capability_atom_ref ${entry.capability_atom_ref} does not reference a known capability atom`);
      } else {
        // Count how many coverage entries point to this atom
        atomRefCounts.set(
          entry.capability_atom_ref,
          (atomRefCounts.get(entry.capability_atom_ref) ?? 0) + 1
        );
      }
    }
    
    // evidence_gap disposition: must have evidence_gap_ref
    if (entry?.disposition === "evidence_gap") {
      if (!entry?.evidence_gap_ref) {
        fail(`${entryLabel}: disposition=evidence_gap requires evidence_gap_ref`);
      } else if (!evidenceGapIds.has(entry.evidence_gap_ref)) {
        fail(`${entryLabel}: evidence_gap_ref ${entry.evidence_gap_ref} does not reference a known evidence gap`);
      }
    }
  }
  
  // Each atom may be referenced by at most one source capability (one-to-one rule)
  if (data.outline_maturity === "explore") {
    for (const [atomId, count] of atomRefCounts.entries()) {
      if (count > 1) {
        fail(`capability atom ${atomId} is referenced by ${count} source capabilities; initial Level 1 requires one-to-one coverage — each source capability must map to its own atom`);
      }
    }
    
    // Each atom must be covered by exactly one source capability entry
    for (const [atomId] of atomsById.entries()) {
      if (!atomRefCounts.has(atomId)) {
        fail(`capability atom ${atomId} has no matching source_capability_coverage entry; every atom must trace back to a source capability`);
      }
    }
  }
}
```

#### 2.2 在 `validateOutlineDiscoveryBusinessContext` 中调用

在原有 atom 验证循环之后，`evidence_gaps` 验证之前，插入调用：

```javascript
validateSourceCapabilityCoverage(data);
```

#### 2.3 新增密度合并话术扫描

在 validator 文件顶部常量区，新增：

```javascript
// 密度合并话术黑名单 - 初始 Level 1 禁止出现
const densityMergeBoilerplateFragments = [
  "为满足 level 1 图的可读密度",
  "为满足level1图的可读密度",
  "为保持图形可读",
  "为满足密度预算",
  "为满足可读密度",
  "当前只提出三个候选",
  "当前只提出两个候选",
  "当前只提出四个候选",
  "压缩为三个候选",
  "合并为三个分支",
  "压缩候选数量",
  "reduce candidate count",
  "for readability",
  "for density budget",
  "to keep the map readable",
  "reduced for density",
  "merged for density",
  "limited to three candidates",
];

function hasDensityMergeBoilerplate(text) {
  const normalized = (text || "").toLowerCase().replace(/\s+/g, " ");
  return densityMergeBoilerplateFragments.some(fragment =>
    normalized.includes(fragment.toLowerCase())
  );
}
```

在 Discovery 验证主函数中，扫描全部 visible copy 字段：

```javascript
function validateOutlineDiscoveryNoDensityMerge(data) {
  const fieldsToCheck = [
    data?.project?.current_understanding,
    data?.project?.discovery_goal,
    ...(data?.maps ?? []).map(m => m?.summary),
    ...(data?.outline_nodes ?? []).map(n => n?.summary),
    ...(data?.question_groups ?? []).flatMap(qg =>
      (qg?.questions ?? []).flatMap(q => [
        q?.prompt,
        q?.context,
        ...(q?.candidates ?? []).map(c => c?.value),
        ...(q?.candidates ?? []).map(c => c?.rationale),
        q?.recommendation_reason
      ])
    )
  ].filter(Boolean);
  
  for (const field of fieldsToCheck) {
    if (hasDensityMergeBoilerplate(field)) {
      fail(`visible copy contains density-merge boilerplate; density constraints may only add maps, never reduce or merge capability atoms. Offending text: "${field.substring(0, 120)}..."`);
    }
  }
}
```

在 `validateOutlineDiscovery` 主函数中调用：

```javascript
validateOutlineDiscoveryNoDensityMerge(data);
```

#### 2.4 新增 Atom 粒度过粗警告

在 atom 验证循环中，如果 atom 同时满足以下条件，emit warning（不 fail，避免误杀）：
- `operation_refs.length > 1`
- `object_refs.length > 1`  
- `label` 包含聚合词（闭环/治理/观测/平台/能力体系/核心链路）
- `outline_maturity === "explore"`

```javascript
const aggregateAtomLabelWarnings = [
  "闭环", "治理", "观测", "平台", "能力体系", "核心链路",
  "core loop", "governance", "observability platform"
];

function warnIfAtomTooCoarse(atomLabel, atom, data) {
  if (data.outline_maturity !== "explore") return;
  const hasMultipleOps = (atom.operation_refs?.length ?? 0) > 1;
  const hasMultipleObjs = (atom.object_refs?.length ?? 0) > 1;
  const labelHasAggregateWord = aggregateAtomLabelWarnings.some(w =>
    (atom.label ?? "").toLowerCase().includes(w.toLowerCase())
  );
  if (hasMultipleOps && hasMultipleObjs && labelHasAggregateWord) {
    warn(`${atomLabel}: label "${atom.label}" with multiple operations and objects looks like a pre-merged capability group; consider splitting into separate atoms for each independently verifiable responsibility`);
  }
}
```

在 atom 验证循环末尾调用：
```javascript
warnIfAtomTooCoarse(`capability_atom[${index}]`, atom, data);
```

#### 2.5 新增 value_stream map 的 isLevelOneProjectLink 排除逻辑

找到 validator 里的 `isLevelOneProjectLink` 判断逻辑，增加条件：parent map 必须是 `"overview"` 类型，而不是 `"value_stream"` 类型，才算 Level 1 project link。

```javascript
// value_stream map 不要求 root node 直接绑定 capability_atom
// 它只是展示分组容器，其子节点（branch map links）才持有 atom
function isLevelOneProjectLink(node, mapsById) {
  const parentMap = mapsById.get(node?.map_id);
  if (!parentMap) return false;
  // Only overview maps can host Level 1 project links
  // value_stream maps are grouping containers, not project-link parents
  if (parentMap.map_kind !== "overview") return false;
  return node?.node_kind === "project_link";
}
```

---

## Phase 3 — Prompt 修复（prd.md）

### 目标
改变 Stage A 的职责描述，使模型在源能力提取阶段完全不接触展示约束。增加串行顺序保证条款和密度误用失败规则。

### 修改文件
`templates/commands/prd.md`

### 工作细节

#### 3.0 删除 Stage A 中的"never serialize coverage table"矛盾规则

当前第 175 行末尾有这句话：
"The allocation table and Stage C check results remain private compilation work: never serialize or narrate the table itself, stage labels, quality checklist, or self-review in visible copy."

这条规则原本是指"Stage C 检查结果不暴露在 visible copy 里"，但会被模型误解为 coverage table 也不应该序列化。

必须把这句话修改为：
"Stage C check results and quality checklist remain private compilation work: never serialize stage labels, quality checklist, or self-review in visible copy. The capability coverage table is NOT private — serialize every source-backed capability atom into `business_context.source_capability_coverage` as required in this Stage."

（更简洁的改法：删除"The allocation table and"这几个字，只保留"Stage C check results remain private compilation work..."。）

修改后的规则必须明确：`source_capability_coverage` 必须序列化到 JSON；只有 Stage C 的质量检查过程本身不对外暴露。

#### 3.1 Stage A 开头增加展示隔离声明

在 `Stage A - extract source-backed capability atoms` 段落最开头（第 174 行附近），插入：

```
   - **Stage A isolation rule**: During Stage A, presentation constraints do not exist. Ignore map readability, density budget, overview layout, renderer node limits, question count, and branch grouping. These constraints are strictly Stage B/C concerns. Complete Stage A fully before reading any density or map requirements.
```

#### 3.2 Stage A 增加 source_capability_coverage 序列化要求

在现有的能力原子序列化要求之后，增加段落：

```
   - Before serializing any capability atom, first build `business_context.source_capability_coverage` as a flat list of every source-backed independently verifiable business capability identified in the source materials. Each entry must record `source_capability_id`, `label`, `trigger_or_input`, `owned_state`, `observable_outcome`, `independent_acceptance_reason`, `disposition`, and `source_refs`. Assign `disposition: "atom"` and a `capability_atom_ref` for each capability that will become an atom; assign `disposition: "evidence_gap"` with an `evidence_gap_ref` for capabilities blocked by missing evidence; assign `disposition: "excluded_by_source"` only when the source itself explicitly excludes the capability. Do not assign `disposition: "user_confirmed_merge"` in initial generation — merging is a user decision available only after a validated Discovery response is consumed. If source text names N independently verifiable business areas, `source_capability_coverage` must have at least N entries.
```

#### 3.3 强化"密度不能减少候选"为失败规则

找到现有的段落（第 196 行附近）：

```
   - Density is a presentation constraint: add overview, value-stream, or continuation maps as needed, but do not reduce the candidate count or merge capability atoms to make a map fit.
```

替换为：

```
   - **Density hard rule**: density_budget is a presentation constraint that applies only during map compilation (Stage B). It must not influence source capability extraction or atom generation (Stage A). If density limits would be exceeded, add overview, value-stream, or continuation maps; never reduce candidate count, merge capability atoms, or summarize source capabilities to fit a map. If the output text says candidate count was reduced, merged, grouped, or limited for readability, density, graph clarity, or map size, that output is invalid and Stage A must be re-run. Do not write phrases such as "为满足密度只提出三个候选" or "reduced to three candidates for readability".
```

#### 3.4 Stage B 开头增加"只能引用已冻结的 source_capability_coverage"要求

在 `Stage B - propose candidate subprojects` 段落开头插入：

```
   - Stage B may only compile maps and candidate boundaries from the `source_capability_coverage` produced in Stage A. It must not create new capabilities, merge source capabilities without a user-confirmed delta, or re-interpret coverage entries. Presentation concerns (map layout, density, question grouping) are first permitted in Stage B; they must not alter any `source_capability_coverage` entry or any `capability_atom`.
```

#### 3.5 value-stream map 作为密度溢出路径

在地图布局要求附近（第 185 行），把现有的一句话扩展：

```
   - When the total capability atom count exceeds the Overview density budget, do not merge atoms. Instead, introduce value-stream grouping maps between the Overview and the branch maps. The Overview links to value-stream maps; each value-stream map links to the individual candidate branch maps. This preserves full atom count while keeping each individual map within density limits.
```

---

## Phase 4 — 测试回归

### 目标
确保新规则：(a) 不误杀合法的具体描述；(b) 能正确拒绝密度合并和 coverage 缺失；(c) 已有的 195 个测试全部通过。

### 修改/新增文件

- `tests/fixtures/source-capability-coverage/valid-full-coverage.json` — 合法 fixture（6 个源能力 → 6 个 atom）
- `tests/fixtures/source-capability-coverage/invalid-density-merge.json` — 密度合并话术 fixture
- `tests/fixtures/source-capability-coverage/invalid-multi-ref.json` — 两个源能力指向同一 atom
- `tests/fixtures/source-capability-coverage/invalid-missing-coverage.json` — atom 没有 coverage 记录
- `tests/test_sp_methodology_templates.py` — 新增测试函数

### 工作细节

#### 4.1 合法 Fixture：`valid-full-coverage.json`

必须是完整的 schema v3 outline-discovery-data.json，包含：
- 6 个 `source_capability_coverage` 条目，每个 disposition=atom，指向唯一 atom
- 6 个 `capability_atoms`，每个只被一个 coverage 引用
- 6 个 `business_chains`，每链 1 atom 1 chain
- 以下 map 拓扑（修正版，包含 value_stream 分层）：
  - MAP-OVERVIEW（overview）
  - MAP-VS-TRADING（value_stream，Overview 下的贸易入口分组）
  - MAP-VS-TRUST（value_stream，Overview 下的可信底座分组）
  - MAP-EXEC-MANUAL（branch，VS-TRADING 下）
  - MAP-EXEC-STRATEGY（branch，VS-TRADING 下）
  - MAP-EXEC-GATEWAY（branch，VS-TRADING 下）
  - MAP-TRUST-FACTS（branch，VS-TRUST 下）
  - MAP-TRUST-MARKET（branch，VS-TRUST 下）
  - MAP-TRUST-OBS（branch，VS-TRUST 下）
  - MAP-CONSTRAINTS（global_constraints）
- 每个 branch map 对应一个 atom，共 6 个 atom，每个 atom 有唯一 source_capability_coverage 引用
- value_stream map 不持有 atom，只起分组作用
- 所有必需字段完整
- 应通过 validator，不报错也不报警告

#### 4.2 无效 Fixture：`invalid-density-merge.json`

完整的 schema v3 artifact，但在 `project.current_understanding` 或某个 map summary 中包含：

```json
"current_understanding": "材料中可独立验收的六个业务区，为满足 Level 1 图的可读密度，当前只提出三个候选项目边界。"
```

应该 fail，错误消息包含 "density-merge boilerplate"。

#### 4.3 无效 Fixture：`invalid-multi-ref.json`

两个 source_capability_coverage 条目都指向同一个 `capability_atom_ref: "ATOM-001"`：

```json
[
  {"source_capability_id": "SRC-001", "disposition": "atom", "capability_atom_ref": "ATOM-001"},
  {"source_capability_id": "SRC-002", "disposition": "atom", "capability_atom_ref": "ATOM-001"}
]
```

应该 fail，错误消息包含 "referenced by 2 source capabilities"。

#### 4.4 无效 Fixture：`invalid-missing-coverage.json`

有 3 个 atom，但 source_capability_coverage 只有 2 条（少了一个 atom 的 coverage）。

应该 fail，错误消息包含 "has no matching source_capability_coverage entry"。

#### 4.5 测试函数（新增到 test_sp_methodology_templates.py）

新增一个测试类，使用 `subprocess` 直接调用 Node.js validator（与现有测试保持一致，不使用不存在的 `run_validator` helper）：

```python
class TestSourceCapabilityCoverage:
    def test_valid_full_coverage_passes(self, tmp_path):
        """Valid fixture with 6 source capabilities and 6 atoms should pass validation"""
        fixture_path = Path("tests/fixtures/source-capability-coverage/valid-full-coverage.json")
        result = subprocess.run(
            ["node", "templates/project/.specify/review/scripts/validate-review-data.mjs",
             str(fixture_path)],
            capture_output=True, text=True, cwd=str(Path(__file__).parent.parent)
        )
        assert result.returncode == 0, f"Valid coverage should pass:\n{result.stderr}"

    def test_density_merge_boilerplate_rejected(self):
        """Fixture with density-merge boilerplate should be rejected"""
        fixture_path = Path("tests/fixtures/source-capability-coverage/invalid-density-merge.json")
        result = subprocess.run(
            ["node", "templates/project/.specify/review/scripts/validate-review-data.mjs",
             str(fixture_path)],
            capture_output=True, text=True, cwd=str(Path(__file__).parent.parent)
        )
        assert result.returncode != 0, "Density merge boilerplate should be rejected"
        combined = (result.stdout + result.stderr).lower()
        assert "density" in combined or "boilerplate" in combined, \
            f"Error should mention density/boilerplate:\n{result.stderr}"

    def test_multi_source_same_atom_rejected(self):
        """Two source capabilities pointing to same atom should be rejected"""
        fixture_path = Path("tests/fixtures/source-capability-coverage/invalid-multi-ref.json")
        result = subprocess.run(
            ["node", "templates/project/.specify/review/scripts/validate-review-data.mjs",
             str(fixture_path)],
            capture_output=True, text=True, cwd=str(Path(__file__).parent.parent)
        )
        assert result.returncode != 0, "Multi-ref should be rejected"

    def test_atom_without_coverage_rejected(self):
        """Atom with no matching coverage entry should be rejected"""
        fixture_path = Path("tests/fixtures/source-capability-coverage/invalid-missing-coverage.json")
        result = subprocess.run(
            ["node", "templates/project/.specify/review/scripts/validate-review-data.mjs",
             str(fixture_path)],
            capture_output=True, text=True, cwd=str(Path(__file__).parent.parent)
        )
        assert result.returncode != 0, "Missing coverage should be rejected"
```

---

## Phase 5 — 向后兼容迁移

### 目标
既有项目（如 stockprofits 001-phase-one-core-loop）中已存在的 `outline-discovery-data.json` 不包含 `source_capability_coverage`，需要说明迁移方式。

### 工作细节

#### 5.1 不强制旧文件立即修改

`source_capability_coverage` 作为 schema v3 增量字段，建议在 `outline-discovery-data.schema.json` 中标注。

旧文件在下次 `/sp.prd` 运行时自动重新生成，新生成的版本必须包含该字段。

不需要手动迁移。

#### 5.2 docs/upgrade.md 追加说明

在 `## Regenerating active PRD Outline Discovery files` 章节后追加：

```markdown
### source_capability_coverage field (v0.11.4+)

Starting from v0.11.4, `outline-discovery-data.json` includes a required
`source_capability_coverage` array. Previously generated files will fail
the new validator.

To update: archive the existing `outline-discovery-*.json` files and re-run
`/sp.prd` to regenerate with the new field.
```

---

## 交付物检查清单

- [ ] `outline-discovery-data.schema.json`: 增加 `source_capability_coverage` 字段定义和 `source_capability_entry` $def
- [ ] `validate-review-data.mjs`: 增加 `validateSourceCapabilityCoverage` 函数、密度合并话术扫描、粒度过粗 warning
- [ ] `templates/commands/prd.md`: 增加 Stage A 隔离声明、`source_capability_coverage` 序列化要求、密度硬规则、Stage B 约束
- [ ] `tests/fixtures/source-capability-coverage/valid-full-coverage.json`: 完整合法 fixture（6 个 atom）
- [ ] `tests/fixtures/source-capability-coverage/invalid-density-merge.json`: 密度合并话术 fixture
- [ ] `tests/fixtures/source-capability-coverage/invalid-multi-ref.json`: 双重 coverage 引用 fixture
- [ ] `tests/fixtures/source-capability-coverage/invalid-missing-coverage.json`: atom 无 coverage fixture
- [ ] `tests/test_sp_methodology_templates.py`: 新增测试函数
- [ ] `docs/upgrade.md`: 追加迁移说明
- [ ] 【范围外，需后续处理】templates/project/.specify/review/renderer/scripts/data-validator.js：
  浏览器端 validator 尚未感知 source_capability_coverage。本次方案只修改 Node.js 端 validator。
  浏览器端不强制，但未来应补充一致性检查。请在 docs/ 里记录此 follow-up。
- [ ] 所有现有测试（195个）通过
- [ ] JavaScript 语法检查通过
- [ ] JSON schema 检查通过

## 审核修正记录

- **v2 修正** (2026-07-20)：解决 Codex 审核发现的 3 个阻塞性问题：
  1. Phase 3.0：明确删除/修改 prd.md 第 175 行"never serialize"矛盾句
  2. Phase 1.4 + Phase 4.1：新增 value_stream map_kind，修正 fixture 拓扑为 6 branch maps
  3. Phase 4.5：修正测试函数使用 subprocess 调用而非不存在的 run_validator
- 同步修复：密度话术扫描增加 q?.prompt 字段；移除 user_confirmed_merge 死代码；补充 data-validator.js 范围外说明
- 审核结论更新为：**PASS_WITH_NOTES**（所有阻塞性问题已在方案层面解决）

```bash
# 1. JS 语法检查
node --check templates/project/.specify/review/scripts/validate-review-data.mjs

# 2. Schema 语法检查
node -e "require('./templates/project/.specify/review/schemas/outline-discovery-data.schema.json')"

# 3. 现有回归测试全部通过
uv run pytest tests/test_sp_methodology_templates.py -q

# 4. 密度合并话术被拒绝
node templates/project/.specify/review/scripts/validate-review-data.mjs \
  tests/fixtures/source-capability-coverage/invalid-density-merge.json
# 预期：非 0 退出码，stderr 包含 "density-merge boilerplate"

# 5. Multi-ref 被拒绝
node templates/project/.specify/review/scripts/validate-review-data.mjs \
  tests/fixtures/source-capability-coverage/invalid-multi-ref.json
# 预期：非 0 退出码

# 6. Missing coverage 被拒绝
node templates/project/.specify/review/scripts/validate-review-data.mjs \
  tests/fixtures/source-capability-coverage/invalid-missing-coverage.json
# 预期：非 0 退出码

# 7. 合法完整 fixture 通过
node templates/project/.specify/review/scripts/validate-review-data.mjs \
  tests/fixtures/source-capability-coverage/valid-full-coverage.json
# 预期：0 退出码
```

## 版本和提交

- 目标版本：`v0.11.4`（基于当前 `0.11.3.dev0` → `0.11.4`）
- 分支命名：`codex/level1-source-coverage-contract`
- commit message 模板：

```
feat(prd): enforce source capability coverage in Level 1 Discovery

Add source_capability_coverage contract to prevent model from pre-merging
source capabilities for density/readability reasons:

- schema: source_capability_coverage required field in business_context
- validator: one source capability → one atom (one-to-one coverage rule)
- validator: density-merge boilerplate detection and hard fail
- validator: atom-too-coarse warning for aggregated labels
- prd.md: Stage A isolation rule (no presentation constraints during extraction)
- prd.md: density hard rule (density may only add maps, never reduce atoms)
- prd.md: Stage B constraint (may not alter source_capability_coverage)
- tests: 4 new fixtures and test assertions

Fixes: pre-merged capability groups like "交易命令与执行闭环" that aggregate
multiple independently verifiable source capabilities into one atom.

All existing regression tests pass.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

请注意：这个文档写完后，后续步骤是：
1. Codex 对此方案进行技术审核（检查方案是否有逻辑漏洞、遗漏或冲突）
2. 审核通过后，分拆为以下独立任务并行执行：
   - Task A：Phase 1（Schema 扩展）+ Phase 4 的 fixture 文件创建
   - Task B：Phase 2（Validator 扩展）
   - Task C：Phase 3（Prompt 修复）
   - Task D：Phase 4 测试函数 + Phase 5 文档
   最后串行跑回归验证后提交。
