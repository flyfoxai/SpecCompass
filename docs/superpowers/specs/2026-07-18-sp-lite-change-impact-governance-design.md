# SP Lite 变化影响分级管控设计

**Status:** approved

**Date:** 2026-07-18

**Applies to:** SP Lite global governance v2

**Related:** `2026-07-18-sp-lite-mechanism-design.md`, `2026-07-18-sp-lite-command-design.md`

## 决策摘要

SP Lite 不再把“全局输入签名发生变化”等同于“全部证据失效”。全局快照继续负责完整发现变化，但是否暂停由确定性的影响分级器决定：

- 会破坏当前范围、共享合同、历史证据或累计回归的变化硬阻塞。
- 可能相关但无法确定的变化暂停并交给用户确认。
- 已证明无关的变化只记录提示；生成物和临时文件直接忽略。

因此，V2 采用“全局发现 + 影响分级 + 人工兜底”，而不是“全仓库单一哈希 + 任意变化硬阻塞”。全局路线、唯一 owner、人工硬门、历史覆盖账本和回归要求保持不变。

## 背景

V1 状态检查器把 Git HEAD、所有受 Git 管理或未忽略的文件路径以及文件内容哈希组成清单，再计算 `Global Input Signature`。记录值与当前值不同即返回 `STALE_EVIDENCE`。

这种方式有两个问题：

1. Bash 使用字节序排列 Git 路径，PowerShell 解码后使用 Unicode 字符序排列。包含非 ASCII 路径时，两端可能为同一项目生成不同清单和签名。
2. 单一签名只能说明“某处变化了”，不能说明变化是否影响当前 Lite。无关文档、实验文件或正交模块变化也会让当前轮次停止。

第一个问题属于跨平台确定性缺陷；第二个问题属于治理粒度不足。只修排序能恢复 CI，但不能让机制长期可用。

## 目标

- 相同 Git 状态和文件内容在 Bash、PowerShell、Linux、macOS 和 Windows 上产生相同快照。
- 每次变化都能解释为具体路径、变化类型、影响范围和处理理由。
- 无关变化不阻塞当前 Lite，模糊变化由人决定，高风险变化不能被自动放行。
- 当前轮次与历史轮次、共享合同、Outline 覆盖和回归证据仍接受全局检查。
- V1 项目可以安全迁移，不能通过简单替换签名掩盖真实变化。

## 非目标

- 不在首个 V2 版本引入通用 AST 或 AI 语义判定器。
- 不根据目录距离简单推断业务依赖。
- 不让模型自动接受风险或跨越人工确认门。
- 不用变化分级替代测试、Gate、Analyze 或 owner artifact readiness。

## 评审过的方案

### 方案 A：继续使用全仓库单一签名

统一路径排序和编码即可解决 CI，改动最小，漏报风险低。但它仍然不能解释变化，也不能区分当前轮次与无关文件，误阻塞会持续发生。

### 方案 B：只签名当前 Working Set

只检查 Included Outline Anchors、Allowed Write Set 和直接依赖，误阻塞少，实现成本适中。但如果依赖闭包不完整，可能漏掉共享接口、数据模型、权限或配置变化。

### 方案 C：通用语义或 AST 签名

可以忽略注释和格式化，理论上误报最低。但仓库可能同时包含代码、Markdown、YAML、JSON、图片和脚本，不存在统一可靠的语义解析方式。首版采用它会增加不可解释的漏报。

### 采用方案：全局快照与影响分级组合

保留完整快照用于发现和审计，另外维护当前轮次范围、依赖和共享合同集合。变化发生时先生成明确 delta，再根据规则分级。这样既不会失去全局视角，也不会让无关变化阻塞当前轮次。

Claude 的评审更偏向保留结构化全局清单和双签名，Gemini 更偏向 Working Set 与依赖图。组合方案吸收两者共同认可的部分，但不采用“任何 HEAD 变化都硬阻塞”或首版通用 AST 判断。

## 架构

### 1. 规范化全局快照

快照必须包含算法版本、代码基线和路径级条目。它用于发现变化，不直接决定路由。

规范化规则如下：

- Git 仓库以 Git 的 NUL 分隔路径输出为来源，保留原始路径字节进行排序，不得先按平台字符串规则排序。
- 路径按无符号字节字典序排列；签名输入使用固定二进制格式：算法版本、基线、条目数量以及每个字段都以固定字节序的长度前缀编码，再拼接原始字节。签名不得经过平台文本编码、换行转换或 BOM，也不能依赖制表符和换行符分隔任意文件名。
- 内容使用 SHA-256；算法名称和版本写入状态，防止新旧实现把不可比较的签名当成同一种签名。
- 已忽略的生成目录、缓存和运行输出不进入治理快照。
- 非 Git 仓库使用相同的路径字节规范和排除策略，但明确记录 `baseline_type: filesystem`。

可选的调试清单使用 Base64 表示路径字节，便于在不损失信息的情况下比较 Bash 与 PowerShell 结果。

### 2. 变化 delta

检查器比较记录快照与当前快照，输出路径级变化：

```yaml
changes:
  - path: src/example.py
    kind: modified
    old_digest: <sha256>
    new_digest: <sha256>
    matched_scopes: [active_write_set, direct_dependency]
    impact: blocking
    reason: active-round-input-changed
```

`kind` 至少支持 `added`、`modified`、`deleted`、`renamed` 和 `mode_changed`。重命名可以由 Git diff 辅助识别，但即使退化为删除加新增，也不能漏掉影响判断。

### 3. 治理范围

影响分级器读取以下集合：

- `governance_sources`：PRD、确认版 Outline、Spec、`lite.md` 的受控状态、开放决定。
- `active_work_set`：当前轮次允许读取、修改和验证的文件。
- `allowed_write_set`：当前 owner 明确授权写入的路径。
- `dependency_set`：当前工作集的直接依赖和显式声明的关键间接依赖。
- `shared_contracts`：API、数据模型、权限、事件、配置和跨轮次共享事实源。
- `protected_evidence`：已关闭轮次的不可变 Gate、Analyze、确认和验证快照。
- `historical_regression_set`：仍有效历史轮次要求持续通过的代码与检查。
- `excluded_paths`：生成物、缓存、日志和运行输出。

这些集合必须由 owner artifact、Plan、Tasks、代码依赖和项目配置共同提供，并在 feature 级持久化。每轮先合并当前范围与仍有效历史轮次的治理范围；模型只能建议追加。缩小范围必须给出具体条目和理由，经人工确认后记录确认人和时间，并立即触发一次完整全局检查，不能通过开启新轮次或重新生成依赖集合静默移除共享合同、受保护证据或历史回归范围。

### 4. 影响等级

#### `BLOCKING`

以下变化必须停止自动推进：

- 当前轮次包含的 PRD、Outline 或 Spec 语义发生变化。
- `active_work_set`、`allowed_write_set` 或其确定依赖在调度后被外部修改。
- API、数据模型、权限、事件格式、关键配置或其他共享合同变化。
- 已关闭轮次的受保护证据被改写或删除。
- 历史回归集合失败，或变化使已验证 anchor 失效。
- 两个活动工作占用重叠写集合，存在覆盖或平行实现风险。
- Git 基线无法比较，例如记录基线已不在当前历史中，且无法构造可靠 delta。

冲突类变化映射为 `RECONCILE_REQUIRED`，来源或依赖失效映射为 `STALE_EVIDENCE`，历史回归失败映射为 `REGRESSION_BLOCKED`。状态检查器必须给出唯一 `blocker_route`。

#### `IMPACT_REVIEW_REQUIRED`

以下变化不能自动判定安全，必须向用户展示影响包：

- 新文件可能扩展当前模块、依赖或业务范围。
- 相邻模块、测试、配置或间接依赖变化，但现有依赖集合无法证明相关或无关。
- Git 提交、合并或 rebase 改变基线，但实际 delta 可计算且未直接命中硬阻塞规则。
- 规则版本升级后，旧快照无法直接解释为新快照。

用户可以选择：同步并继续、返回指定 owner 协调、扩大当前依赖范围，或暂停本轮。确认必须记录变化清单、选择、理由和确认人；不能只把新签名覆盖到 `lite.md`。

#### `NOTICE`

已经证明与当前轮次、共享合同和历史回归无关的变化不阻塞。例如另一独立模块的实现或无关说明文档变化。检查器仍记录摘要，方便后续轮次重新计算全局关系。

#### `IGNORED`

缓存、构建输出、日志、编辑器临时文件和已配置的运行输出不进入快照，也不产生提示。排除规则必须版本化并在项目内可检查，不能依赖每台机器的隐式全局配置。

### 5. Git HEAD 的语义

Git HEAD 是快照的来源基线，不是独立的硬阻塞条件。Lite 实现、测试和提交本身会正常推进 HEAD，如果每次提交都阻塞，机制无法连续运行。

HEAD 变化后必须计算实际 delta：命中硬阻塞范围则阻塞；仅命中可确认范围则人工决定；已证明无关则记录并继续。只有历史不可比较、基线丢失或工作内容可能被覆盖时，HEAD 变化本身才升级为硬阻塞。

## 路由规则

V2 在现有全局治理状态中增加 `IMPACT_REVIEW_REQUIRED`：

| 影响结果 | `global_control.status` | 自动继续 | 处理方式 |
|---|---|---:|---|
| 无变化或仅 `NOTICE`/`IGNORED` | `CLEAR` | 是 | 记录摘要并调度唯一 owner |
| 已存在可复用实现 | `REUSE_REQUIRED` | 否 | 收缩为真实 delta |
| 影响不确定 | `IMPACT_REVIEW_REQUIRED` | 否 | 展示变化和选项，等待人工确认 |
| 事实或写集合冲突 | `RECONCILE_REQUIRED` | 否 | 返回拥有该事实的 owner |
| 来源或依赖失效 | `STALE_EVIDENCE` | 否 | `/sp.lite sync` 生成影响报告 |
| 历史回归失败 | `REGRESSION_BLOCKED` | 否 | 返回 plan/tasks/implement owner |

自然语言协调器不能把 `BLOCKING` 降级为提示，也不能把 `IMPACT_REVIEW_REQUIRED` 自动写成 `CLEAR`。

## 状态合同

建议将 `global_control` 升级为：

```yaml
global_control:
  schema: speckit.lite.global-control.v2
  status: CLEAR
  checked_at: <timestamp>
  snapshot_algorithm: git-path-bytes-sha256-v2
  snapshot_signature: <sha256>
  baseline_type: git
  baseline_revision: <git-commit>
  policy_version: speckit.lite.impact-policy.v1
  scope_signatures:
    governance_sources: <sha256>
    active_work_set: <sha256>
    dependency_set: <sha256>
    shared_contracts: <sha256>
    protected_evidence: <sha256>
    historical_regression_set: <sha256>
  change_summary:
    blocking: []
    review_required: []
    notices: []
  review_decision:
    status: NOT_REQUIRED
    confirmed_by: null
    confirmed_at: null
    accepted_change_signature: null
    reason: null
  repair_mode:
    active: false
    owner: null
    blocker_refs: []
    allowed_write_set_signature: null
    dispatch_id: null
  blocker_route: null
```

详细路径清单可以保存到轮次证据目录，`lite.md` 只保存摘要、签名和引用，避免状态文件无限增长。

受限修复 owner 只能追加与 `dispatch_id`、`blocker_refs` 和已签名 Allowed Write Set 对应的修复证据，不能修改 `global_control.status`、清除 blocker 或推进正常阶段。协调器在修复前后比较受控字段和实际文件 delta；发现越权修改时恢复为原阻塞状态并进入 `RECONCILE_REQUIRED`。只有 `/sp.lite sync` 重新读取证据、重算快照和影响等级后可以写回 `CLEAR`。

## 人工影响确认

当状态为 `IMPACT_REVIEW_REQUIRED` 时，界面必须用普通语言回答四件事：

1. 哪些文件或事实发生了变化。
2. 为什么系统认为它们可能影响当前轮次。
3. 继续执行可能覆盖或误用什么内容。
4. 用户可以选择继续、同步、协调还是暂停。

确认只覆盖当前 `accepted_change_signature`。之后又出现任何变化时，旧确认立即失效。业务方向选择、Flow/UI 确认、Plan 批准、风险接受和业务验证结论仍是独立人工门，影响确认不能代替它们。

## 迁移与发布顺序

### 阶段 1：V1 确定性修复

当前重要版本先统一 Bash 与 PowerShell 的规范化清单算法，补齐非 ASCII 路径测试。该修复不改变现有路由语义，避免在修复 CI 时同时引入新的治理状态。

### 阶段 2：V2 双读迁移

- 读取 V1 `Global Input Signature`，同时生成 V2 快照和影响报告。
- 只有 V1 签名匹配当前 V1 算法、治理范围完整，并且同次 V2 分级结果为 `CLEAR` 或仅包含 `NOTICE`/`IGNORED` 时，才可建立 V2 基线。
- 若 V1 签名不匹配，不得静默升级；返回影响报告并要求同步或人工确认。
- 即使 V1 签名匹配，只要 V2 发现 `BLOCKING` 或 `IMPACT_REVIEW_REQUIRED`，也不得自动迁移；必须先按 V2 影响包完成同步或人工处理。
- 一旦写入 V2 状态，后续只使用 V2 路由，保留 V1 签名作为迁移审计字段。

### 阶段 3：V2 默认启用

所有新项目直接使用 V2。旧项目完成一次成功同步后移除 V1 双读逻辑。迁移不能修改已关闭轮次的历史证据。

## 错误处理

- 无法读取路径、计算内容哈希或比较基线时采取保守策略，进入 `IMPACT_REVIEW_REQUIRED`；若目标位于硬阻塞范围则进入 `STALE_EVIDENCE`。
- 影响规则自身无效或版本未知时停止自动推进，不能回退到“全部放行”。
- 同一变化签名经人工确认后可以继续；签名变化后必须重新判断。
- 分类结果必须包含命中的规则和证据引用，禁止只返回模型自然语言结论。

## 测试矩阵

### 快照确定性

- Bash 与 PowerShell 对 ASCII、中文、日文、韩文、Emoji、组合字符、空格、制表符和换行文件名产生相同签名。
- Linux、macOS 和 Windows 对完全相同的原始签名输入生成逐字节相同的二进制清单和签名，不受 CRLF、BOM 或平台默认编码影响。
- tracked、untracked、ignored、删除、重命名、文件模式和非 Git 仓库行为一致。
- Linux、macOS、Windows 以及大小写敏感和不敏感文件系统上的结果符合合同。

### 影响分级

- 无关文档和正交模块变化为 `NOTICE`，仍可继续当前 owner。
- 生成物和缓存变化为 `IGNORED`。
- 当前写集合、直接依赖、共享合同和治理来源变化硬阻塞。
- 模糊的新增文件或间接依赖变化进入 `IMPACT_REVIEW_REQUIRED`。
- 受保护证据变化、写集合重叠和历史回归失败不能被人工影响确认绕过。

### 迁移与恢复

- V1 无变化项目建立 V2 基线后保持原路由。
- V1 有变化项目不能通过升级算法自动清除 stale。
- V1 签名匹配但 V2 检出 blocking 或 review-required delta 时不能建立 V2 基线。
- 人工确认只对完全相同的变化签名有效。
- 暂停、重启和跨平台恢复后得到同一影响结果和唯一下一 owner。

### 多轮全局治理

- `extend`、`independent`、`revise` 和 `coverage` 轮次都读取当前 Outline 和历史回归集合。
- 独立轮次的无关业务变化可以放行，但共享合同变化仍硬阻塞。
- 已覆盖 anchor 不重复实现，已关闭证据不被新轮次改写。
- 新轮次不能静默缩小 feature 级共享合同、受保护证据或历史回归范围。
- 旧轮证据改写 round ID 或内容后会因内容哈希、时间和来源签名不匹配而被拒绝。
- 多轮累计完成门仍以确认版 Outline 的逐项覆盖为准。

## 不可牺牲的治理底线

1. 系统必须完整发现变化，灵活性只影响路由，不允许通过缩小扫描范围隐藏变化。
2. 当前写集合、共享合同、受保护证据和历史回归问题不能自动放行。
3. 不确定影响必须由人决定，模型不能代表用户接受风险。
4. 人工确认必须绑定具体变化签名，不能永久关闭某类检查。
5. 每次只能返回一个 owner route，受限修复不能顺便推进正常阶段。
6. 多轮历史、覆盖账本和确认版 Outline 始终是项目完成判断的全局依据。
7. 原型可运行、测试通过或某轮关闭都不等于业务验证完成或生产就绪。

## 自审结论

本设计没有改变 SP Lite 的业务目标或人工硬门，只改变“发现变化后如何决定是否暂停”。V1 确定性修复与 V2 行为升级被明确拆分，避免发布热修复扩大行为范围。所有新增状态都有唯一处理路径，人工确认有可失效的绑定签名，旧项目迁移不会自动清除真实 stale。
