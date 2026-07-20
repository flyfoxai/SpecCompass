# PRD Outline 三级成熟度初步方案

> 状态：三模型两轮研讨后的初步方案，等待用户评审。本文件只描述设计，不表示功能已经实现。

## 1. 结论先行

推荐采用“**共享界面、分离契约、增量回写**”方案：

- 把用户所说的一级、二级、三级定义为 Outline 的成熟过程，而不是 Markdown 标题层级。
- 一级、二级使用共享预览器的 `discovery` 模式，提供 2-4 个业务候选、推荐理由和自由输入；按钮只能是“保存并继续完善”，不能产生 `/sp.specify` 授权。
- 三级使用现有预览器的 `confirmation` 模式，继续执行 Review Data ID、Outline Digest、Source Authority IDs 绑定的正式确认。
- 发现界面下载结构化响应包；下一次 `/sp.prd` 显式消费该包，追加到可追踪的意图账本，再由模型更新 `prd.md` 和 `spec-outline.md`。
- 用户输入与模型候选通过稳定 `delta_id` 保留来源。用户新写内容标为 `[src:user]`；用户接受模型候选标为 `[src:user-confirmed]`；未接受候选始终是 `[src:ai-proposed]`。
- Constitution 只约束和检查三级生成，不能替代目标用户、业务目标、产品定位、范围等产品事实。

## 2. 设计目标与边界

本方案解决一个现实问题：用户第一次调用 `/sp.prd` 时，提供的材料可能只能表达一个模糊想法，不足以直接形成当前要求的完整 PRD 和稳定 Outline。

目标：

1. 允许 `/sp.prd` 从很少的信息开始，而不是假装信息已经完整。
2. 在一级、二级让用户通过候选选择和直接输入深度参与产品定义。
3. 在三级使用模型能力补齐结构、覆盖和治理检查，同时守住产品事实边界。
4. 保留现有正式 Outline 图形确认和 `/sp.specify` 硬门禁。
5. 所有用户选择、修改和排除都有来源和操作记录，可在会话中断后恢复。

非目标：

- 不让 Outline 取代 `/sp.specify`、Flow、UI、API、数据库或实现计划。
- 不在第一版加入拖拽、需求依赖图、多人协同或复杂富文本编辑。
- 不让浏览器 localStorage、下载动作或发现响应包直接成为授权证据。
- 不用脚本对 Markdown 做脆弱的字符串拼接。

## 3. 术语与两个正交维度

界面继续显示“一级、二级、三级”，机器字段使用：

```text
outline_maturity = explore | frame | specify_ready
```

它回答“产品大纲成熟到哪一步”。现有 `Outline Decision` 回答“现在为什么能或不能进入下一命令”。二者必须正交，不能用同一个字段表达。

| Outline 成熟度 | 中文显示 | 常见 Outline Decision | 交互模式 |
|---|---|---|---|
| `explore` | 一级：方向探索 | `NEEDS_PRD` | `discovery` |
| `frame` | 二级：框架收敛 | `NEEDS_PRD`、`NEEDS_CLARIFY` 或 `NEEDS_DECISION` | `discovery` |
| `specify_ready` | 三级：完整大纲 | `AWAITING_OUTLINE_CONFIRMATION`，确认后为 `READY_FOR_SPECIFY` | `confirmation` |

`review_level`、`confirmation_priority` 和 `outline_maturity` 不能混用：前两个属于单个确认点，后者属于整个 Outline 的成熟度。

## 4. 三级定义

### 4.1 一级：方向探索 `explore`

适用情况：用户只有一句想法、零散材料，或者目标、用户、问题三者仍无法连成明确关系。

最小输入：

- 至少一条来自用户或已有文档的产品意图；
- 可以缺少明确用户、范围和能力框架；
- 模型不得把空缺自行写成事实。

模型输出：

- 对当前理解的简短复述；
- 每个关键问题 2-4 个候选方向，并说明推荐项及理由；
- 候选重点覆盖产品目标、目标用户/角色、核心问题和明显边界；
- 所有候选都标记为 `[src:ai-proposed]`。

用户参与：

- 接受一个候选；
- 编辑候选后采用；
- 直接新增自己的目标、用户或业务背景；
- 排除不适用的方向；
- 可以选择“以上都不合适”并只提交自定义内容。

退出条件：

- 至少有一个用户确认的战略目标；
- 至少有一个用户确认的目标用户或角色；
- 核心问题可以用一句话说清；
- 主要分叉已经选择或明确记录为开放项。

未满足时继续停留在 `explore + NEEDS_PRD`，不能进入正式确认。

### 4.2 二级：框架收敛 `frame`

适用情况：方向已经成立，但范围、能力切片、首个交付切片或关键业务规则仍不稳定。

最小输入：

- 一级退出条件已经满足；
- 已有可追溯的目标、用户和问题描述；
- 允许存在范围冲突和待选择候选。

模型输出：

- 问题域与能力切片；
- in-scope、non-goals 和推荐首切片；
- 核心业务场景及验收意图；
- 来源权威摘要、风险和开放项；
- 每个真正需要用户判断的问题提供 2-4 个候选，不为凑数制造伪选项。

用户参与：

- 选择或改写范围与首切片；
- 直接补充、修改或排除业务需求；
- 处理来源冲突、业务规则和高影响开放项；
- 对模型无法判断的事项明确“本轮不决定”，并留下责任人或下一路线。

退出条件：

- 目标、用户、核心问题和首切片已确认；
- in-scope 与 non-goals 不冲突；
- 至少一个核心场景和验收意图可供 `/sp.specify` 展开；
- 来源权威清楚；
- 不存在会改变产品方向、范围或高风险业务规则的未决项。

不满足时保持 `frame`，并按问题性质使用 `NEEDS_PRD`、`NEEDS_CLARIFY` 或 `NEEDS_DECISION`。

### 4.3 三级：完整大纲 `specify_ready`

适用情况：产品事实和边界已经足够稳定，模型可以在不虚构业务事实的前提下完成结构化 Outline。

模型可自动完成：

- 把已确认事实组织成意图地图、范围与首切片、就绪度与来源权威三种视图；
- 根据已确认场景补齐结构性覆盖检查和验收种子候选；
- 根据 Constitution 检查违反治理规则的地方；
- 把无法安全推导的事项列为风险或开放项，而不是偷偷补成事实。

模型不得自动完成：

- 发明目标用户、业务目标、商业规则、产品定位或发布范围；
- 因 Constitution 提到安全、审计或审批，就假定当前业务一定需要某个具体功能；
- 把 `[src:ai-proposed]` 当作已有用户结论；
- 生成 Flow、UI、API、数据库或实现任务。

退出条件分两步：

1. 语义条件满足后，生成正式 review data，状态进入 `AWAITING_OUTLINE_CONFIRMATION`。
2. 用户完成图形确认，`/sp.prd` 验证当前 Review Data ID、Outline Digest、Source Authority IDs 和全部决定，写入 `outline-confirmation.md` 后，才能进入 `READY_FOR_SPECIFY`。

## 5. 状态流转

```text
NEEDS_PRD
  -> explore / discovery
  -> 用户保存发现响应包
  -> /sp.prd 验证并消费 delta
  -> 仍为 explore，或达到条件后进入 frame

frame / discovery
  -> 用户反复选择、补充、修改、排除
  -> /sp.prd 更新 PRD 与阻断型 Outline
  -> NEEDS_PRD | NEEDS_CLARIFY | NEEDS_DECISION

二级退出条件全部满足
  -> specify_ready
  -> 生成正式 Outline review data
  -> AWAITING_OUTLINE_CONFIRMATION

正式确认包身份与内容验证通过
  -> 写 outline-confirmation.md
  -> READY_FOR_SPECIFY
  -> /sp.specify
```

任何新证据、范围变化或来源变化都可以让 `specify_ready` 回退到 `frame`。成熟度不是只能单向增加的进度条。

## 6. Stage 1/2 界面契约

### 6.1 明确区分发现与授权

`discovery` 页面必须持续显示“正在完善产品大纲，本页不会授权 `/sp.specify`”。主按钮使用“保存并继续完善”，禁止出现“批准”“签发”“确认进入开发”等授权性文案。

`confirmation` 页面继续使用现有正式确认语义。两个模式使用同一套导航、视觉基础和无障碍组件，但使用不同 schema、数据包格式、主动作和状态机。

### 6.2 候选问题结构

每个需要用户参与的问题包含：

- 问题背景；
- 2-4 个 `candidate`，不是现有带 `next_exit` 的确认 `option`；
- 单选或多选规则；
- 模型推荐项和推荐理由；
- “以上都不适用”；
- 自由输入区。

一次只集中处理少量高价值问题组，避免把整个 PRD 变成长表单。

### 6.3 自由输入必须带操作语义

用户提交文本时要明确它的作用：

| 操作 | 含义 | 写回来源 |
|---|---|---|
| `confirm_candidate` | 原样接受模型候选 | `[src:user-confirmed]` |
| `add` | 新增用户自己的业务信息 | `[src:user]` |
| `replace` | 用用户文本替换某个候选或已有条目 | `[src:user]`，同时引用被替换项 |
| `exclude` | 明确排除候选或已有范围 | 只写决策账本；必要时进入 non-goals |
| `context_note` | 补充背景，但暂不提升为需求 | `[src:user]`，保持非需求语义 |

前端不能根据文字猜测操作类型。用户选择操作类型后才可提交。

## 7. 发现响应包与意图账本

浏览器不直接写仓库。它下载 `outline-discovery-response-*.json`；用户在下一次 `/sp.prd` 中显式提供该文件，命令验证后追加到仓库内的账本。

建议产物：

```text
specs/<feature>/prd/review/outline-discovery-data.json
specs/<feature>/prd/review/outline-intent-ledger.json
```

前者由模型生成，可在每轮刷新；后者是逻辑追加式的用户决策记录，已存在事件不能原地改写。撤销通过新事件引用旧 `delta_id`。

最小账本事件：

```json
{
  "delta_id": "delta-<stable-id>",
  "response_id": "response-<stable-id>",
  "maturity": "explore",
  "target_kind": "goal|user|problem|scope|non_goal|scenario|acceptance_seed|risk|context",
  "operation": "confirm_candidate|add|replace|exclude|context_note",
  "candidate_id": "candidate-id-or-null",
  "target_id": "existing-item-id-or-null",
  "value": "用户确认或输入的内容",
  "source_tag": "user|user-confirmed",
  "recorded_at": "ISO-8601"
}
```

消费规则：

1. 校验 feature、response identity、候选 ID、允许操作、目标类型和重复 `delta_id`。
2. 把有效事件追加到账本；未知候选、越权目标或重复事件失败关闭。
3. 用旧 PRD、旧 Outline、来源材料和“当前有效 delta 集”让模型生成临时新文档。
4. 每个被消费的 delta 在文档中写入来源标签和稳定隐藏锚点，例如 `<!-- intent-delta:delta-123 -->`。
5. 确定性检查 delta ID、来源标签、目标章节和排除关系。缺失或错配时不覆盖旧文档，账本保留为待处理，用户无需重复输入。
6. 通过后再替换文档并刷新成熟度与 Outline Decision。

确定性检查只能证明身份、位置和来源没有丢失，不能证明模型改写后的语义百分之百等价；语义仍由下一轮发现界面或最终确认检查。本方案不声称用简单脚本完成 NLP 等价判断。

## 8. Constitution 的使用边界

| 可以做 | 不可以做 |
|---|---|
| 检查已确认范围是否违反项目原则 | 用原则推断一个从未出现的目标用户 |
| 为已确认的高风险业务动作提出治理检查 | 因存在安全原则就发明审批功能 |
| 根据明确规则补充结构性验收种子候选 | 把候选直接写成用户已确认需求 |
| 把冲突写成 risk/open item 并请求决定 | 静默修改用户范围来迎合 Constitution |
| 修剪明显越过 Outline 边界的内容 | 生成 Flow、UI、API 或实现设计 |

当 Constitution 与用户输入冲突时，模型应保留两边来源，设置 `NEEDS_CLARIFY` 或 `NEEDS_DECISION`，不能自行裁决产品事实。

## 9. Artifact、Schema 与 Renderer 变化

推荐把发现数据和正式确认数据分成两个 schema，而不是让当前正式 schema 的 digest、source authority 和三视图要求变成可选项：

```text
outline-discovery-data.schema.json   # explore/frame 候选和输入提示
outline-review-data.schema.json      # specify_ready 正式确认，保持强约束
outline-discovery-response.schema.json
outline-intent-ledger.schema.json
```

Renderer 继续共享现有 shell，但路由到两个明确处理器：

- `outline-discovery-renderer.js`：候选、自由输入、操作类型、响应包下载；
- `outline-preview-renderer.js`：保留当前正式三视图和确认点；
- `confirmation-package.js`：不承担 discovery 包职责，避免把非授权输入包装成确认包；
- 新增独立的 `discovery-response-package.js`。

Schema 版本策略：

- 当前 schema v2 Outline 数据继续按正式 confirmation 读取；
- 新版本数据必须显式声明 `interaction_mode`，不能仅因字段缺失就默认授权模式；
- discovery 响应永远不能被 confirmation package 消费器接受；反向亦然。

## 10. 三个实现选项

| 选项 | 做法 | 优点 | 主要问题 |
|---|---|---|---|
| A. 纯对话式发现 | 一级、二级只在聊天中问答；三级才打开图形确认 | 修改量最小，来源容易记录 | 不满足用户期望的可选项与直接输入界面，长内容难比较 |
| **B. 共享界面、分离契约** | 同一 review shell；discovery 和 confirmation 使用不同 schema、包和动作；delta 由 `/sp.prd` 消费 | 同时满足体验、来源追踪和授权隔离；可复用现有基础设施 | 需要新增发现数据、包验证和账本消费链路 |
| C. 独立 PRD Wizard | 新建专用多步产品发现应用，三级再跳回现有 renderer | 最自由，未来可支持复杂访谈 | 两套前端、状态和无障碍体系，第一版成本与漂移风险最高 |

推荐 B。它比纯聊天更符合本次需求，又不需要先建设一套独立产品发现平台。

## 11. 最小可用实施切片

第一切片必须打通一次真正可恢复的 discovery 闭环，而不是只展示一个不能消费的表单：

1. 在 `spec-outline.md` 增加 `Outline Maturity`，在 `/sp.prd` 中定义三级进入和退出条件。
2. 新增 discovery data/response/ledger schema，先覆盖一个通用候选问题组、2-4 个候选和五种输入操作。
3. 在共享 shell 中增加 discovery renderer，下载非授权响应包。
4. `/sp.prd` 能显式读取响应包，验证并追加账本。
5. 模型从有效 delta 更新临时 PRD/Outline；脚本检查 delta 锚点、来源标签和目标章节后再落盘。
6. 自动化测试证明 discovery 不会生成 confirmation package，也不会把状态推进到 `AWAITING_OUTLINE_CONFIRMATION` 或 `READY_FOR_SPECIFY`。
7. 保持当前三级 confirmation 全流程回归通过。

后续切片再增加：

- 二级专用的范围/首切片/来源冲突问题组；
- 多轮问题排序、断点恢复提示和账本撤销界面；
- 更丰富的差异预览；
- 多人审批、拖拽排序和跨需求依赖图。

## 12. 迁移与兼容

- 已安装旧模板的目标项目不会自动获得这套能力；功能实现后，需要刷新项目模板才会出现新的命令、schema 和 renderer 文件。
- 现有 schema v2 正式 Outline review data 和 confirmation package 保持原契约，不做静默改写。
- 新 discovery 契约采用新的 format/版本标识，验证器按白名单路由。
- 旧的 `READY_FOR_SPECIFY` 兼容策略继续遵守上一轮 Outline 确认方案，本方案不另开绕过门禁的后门。
- 账本、响应包或临时输出损坏时失败关闭，保留最后一份有效 PRD/Outline。

## 13. 验收标准

1. 一句模糊产品想法可以生成一级 discovery 页面，而不会被包装成完整 PRD。
2. 每个关键问题显示 2-4 个候选、推荐理由、“以上都不适用”和自由输入。
3. 用户可以明确执行接受、新增、替换、排除和补充背景五种操作。
4. discovery 页面和响应包没有任何 `/sp.specify` 授权效果。
5. 用户新输入写回为 `[src:user]`，接受模型候选写回为 `[src:user-confirmed]`，并能由 `delta_id` 追溯。
6. 未消费、重复、伪造或目标不合法的 delta 不会改写 PRD。
7. 一级未满足退出条件时不会进入二级；二级存在高影响开放项时不会进入三级。
8. Constitution 不会被用于虚构用户、目标、业务规则或具体功能。
9. 三级仍需当前 digest-bound 图形确认才能进入 `READY_FOR_SPECIFY`。
10. 现有 Flow/UI 三档确认优先级和正式 Outline confirmation 测试不回归。

## 14. 三模型评审记录

### Claude

第一轮强调 Stage 1/2 是产品发现而非授权，建议保持在聊天中。收到审核反馈后，接受共享 renderer 双模式，并明确提出业务 `candidate` 不能复用当前带路由语义的 `option`。其“账本必须进入仓库可追踪路径”被采纳；“首批只写账本、以后再消费”被否决，因为那不是可用闭环。

### Gemini

第一轮推荐“意图收集 + 模型重新生成”，反对脚本硬合并 Markdown。第二轮接受成熟度与 readiness 分离、双模式 renderer 和最小 UI。其“V1 只检查 `[src:user]` 标签数量、延后逐条校验”被否决；数量检查无法证明具体输入没有丢失或错配。

### Codex

综合采用共享 renderer，但进一步把 discovery 与 confirmation 分成独立 schema 和 package，避免削弱现有正式确认 schema。补充了浏览器下载包、`/sp.prd` 显式消费、稳定 delta 锚点和临时输出失败关闭机制，并把最小切片定义为端到端可恢复闭环。

## 15. 建议本轮确认的三个决定

1. 是否同意三级机器枚举使用 `explore | frame | specify_ready`。
2. 是否同意推荐方案 B：共享界面，但 discovery 与 confirmation 使用独立 schema 和数据包。
3. 是否同意第一实现切片必须包含“响应包 -> 账本 -> 模型更新 -> provenance 校验”的完整闭环，而不是只先做展示界面。

这三个决定确认后，再进入代码实施计划；未确认前不修改运行代码。
