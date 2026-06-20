# SP 机制改进和完善建议

## 结论

当前 SP 机制需要补强。核心问题不是某一次回答措辞不够好，而是命令输出契约、阶段准入定义、上下文预算和项目安装版本之间缺少硬约束，导致模型容易输出“看似谨慎、实际不可执行”的下一步建议。

典型坏例是：

```text
下一步只有在你需要阶段入口判断时才跑：
/sp.gate 124-migration-remediation
不要跑 /sp.implement。
```

这类输出的问题是，它把“是否需要阶段入口判断”的职责重新交还给人工，却没有告诉用户如何判断、默认应该做什么、什么状态禁止继续、什么证据会改变判断。SP 命令必须避免这种模糊条件句。

## 外部复核取舍

本方案已让 Claude 和 Gemini 分别给出补充建议，并做了取舍：

- Claude 的有效建议：增加项目级扫描、主线选择、优先级排序、token 预算和切换成本提示。这部分适合纳入 SP 机制。
- Gemini 的有效建议：先判断项目目标、当前阶段、核心主线、阻塞类型和资源约束；执行时采用“唯一下一帧动作”。这部分适合改写成 SP 文档治理语言。
- 不采纳的建议：直接新增 `/sp.project` 作为新入口。当前仓库已经有 `/sp.route`，更稳的方案是把入口拆成三种清晰模式：`/sp.route` 做已有主线的轻量 Warm Route，`/sp.route y` 保持原有“安全时继续下一步”的语义，`/sp.route all` 作为显式全局扫描和项目接手方向判断入口。

## 必须修正的问题

### 0. 项目接手必须先做方向判断

SP 机制必须解决一个前置问题：拿到项目后不能“看到什么做什么”。否则模型会在大量 specs、flow、analysis、governance 文档之间游走，消耗 token 但无法形成推进主线。

项目接手后的第一步必须是方向判断，而不是修某个文件。方向判断只回答五个问题：

1. **项目当前目标是什么**：MVP、迁移修复、治理补强、运行证据补齐、实现交付，还是问题排查。
2. **当前处于哪个阶段**：PRD、spec、flow、ui、plan、tasks、analyze、gate、implement、governance。
3. **当前主线是什么**：本轮只推进一个主线，例如“修复 ASK 的 SP 安装漂移并以 124 作为样本迁移”。
4. **主要阻塞类型是什么**：安装/命令漂移、缺 PRD、缺 outline、缺 source evidence、缺 memory 回链、open item 未关闭、运行证据不足、人工决策缺失。
5. **先后顺序是什么**：先修会影响后续判断的机制问题，再修代表 feature，再批量迁移；不能反过来。

方向判断输出必须包含：

```text
PROJECT_GOAL: <当前项目目标>
CURRENT_STAGE: <当前阶段>
PRIMARY_THEME: <本轮唯一主线>
ROOT_BLOCKER_FAMILY: <根阻塞类型>
FIRST_FIX: <必须先解决的问题>
DEFERRED_WORK: <明确延后的问题>
READ_SET: <本轮已经读取或建议读取的最小集合>
PRIORITY_CLASS: P0 | P1 | P2 | P3 | P4 | P5
NEXT_ACTION: <唯一下一步动作>
NEXT_COMMAND: </sp.route、/sp.analyze、/sp.gate 或 None>
WHY_THIS_NEXT: <为什么这是下一步>
DO_NOT_RUN: <明确禁止的命令>
```

如果无法判断项目目标或主线，必须停止并返回 `SP_STATUS: NEEDS_DECISION`。不能用“我先看看某个 feature”来替代方向判断。

### 0.1 项目级读取顺序必须固定

项目接手扫描必须先读最小路由集合，不允许全量展开。

固定顺序：

1. 先读项目入口：`README`、`.specify/memory/project-index.md`、`.specify/memory/active-context.md`、`.specify/memory/feature-map.md`、`/sp.route` 可用输出。
2. 再读候选 feature 的 `memory/index.md`、`memory/open-items.md`、Stage Readiness。
3. 只对主线候选展开 `prd.md`、`spec-outline.md`、`spec.md`、`analysis.md` 或 `gate.md`。
4. 不默认读取所有 flow、UI、governance、archive、历史分析文件。

如果项目有很多 feature，首次扫描只允许输出分布和候选主线，不允许逐个深读。示例：

```text
TOTAL_FEATURES: 30
READ_SET: project-index, active-context, feature-map, candidate memory indexes
PRIMARY_THEME: 修复 SP 安装漂移并以 124-migration-remediation 做样本迁移
FIRST_FIX: 刷新 ASK 的 Gemini SP 命令模板
DEFERRED_WORK: 其他 29 个 feature 的 PRD/outline 批量修复
NEXT_COMMAND: None
DO_NOT_RUN: /sp.implement
```

项目接手扫描的显式入口是：

```text
/sp.route all
```

普通 `/sp.route` 不应默认全局扫描。它只在已有主线时读取当前 active feature、route/memory、open-items 和 Stage Readiness，输出下一步建议。`/sp.route y` 保持原语义：只有 route JSON 的 `continueAllowed` 为 `true` 且停止规则允许时，才继续下一条正确命令；它不是全局扫描入口。

### 0.2 主线选择规则

SP 必须每轮只选择一个主线。主线不是“当前打开的文件”，而是当前最能减少不确定性、解除阻塞或产生阶段推进的工作主题。

主线选择优先级：

1. **机制漂移优先**：如果项目安装命令、模板、路由规则和当前 SP 机制不一致，先修机制漂移。否则后续产物会继续不一致。
2. **根阻塞优先**：如果多个 feature 都被同一类问题阻塞，先解决根阻塞，不逐个 feature 重复修。
3. **阶段准入优先**：如果 analyze 已 PASS 但是否能进入下一阶段不明确，下一步是 gate 或补 gate 所需证据。
4. **代表样本优先**：如果需要迁移多个 feature，先选一个高信息量样本打通全链路，再复制模式。
5. **业务价值优先**：如果多个候选都可推进，选择用户目标、项目记忆或发布路径中价值最高的。
6. **低切换成本优先**：价值相近时，选择所需上下文最少、最接近关闭状态的主线。

禁止的主线选择方式：

- 不能因为某个 feature 文档最多就优先推进。
- 不能因为某个文件刚被修改就优先推进。
- 不能把 governance 图、flow 图数量当作完成度。
- 不能同时推进多个无依赖关系的 feature。
- 不能在主线未关闭前随意切换到“顺手看到”的问题。

### 0.3 SP 优先级梯队

项目级优先级必须按以下梯队判断：

| 梯队 | 类型 | 默认动作 |
|---|---|---|
| P0 | SP 安装、命令、模板、路由漂移 | 先修机制，不继续产出 feature 文档 |
| P1 | 阶段阻塞：缺 PRD、缺 outline、缺 source authority、缺人工决策 | 回到 owner stage，不向下游推进 |
| P2 | 主线 feature 的 readiness 缺口：Stage Readiness、open-items、trace/memory 断链 | 修主线样本，不批量展开 |
| P3 | gate/analyze 边界问题：analyze PASS 但 gate 未判断，Monitoring 未关闭 | 跑 gate 或补 gate 所需证据 |
| P4 | 运行时、集成、E2E、性能证据补齐 | 只在 feature 已授权进入对应阶段后补 |
| P5 | flow/UI/governance 可视化、格式整理、重构 | 主线闭环后再做 |

输出下一步时必须说明当前属于哪个梯队。示例：

```text
PRIORITY_CLASS: P0
NEXT_ACTION: 先刷新 ASK 的 SP/Gemini 命令安装。
WHY_THIS_NEXT: 当前安装模板仍是旧机制，继续修 feature 会产生不一致文档。
DEFERRED_WORK: 124 的 gate、其他 feature 的 PRD/outline 批量迁移。
```

### 0.4 切换主线必须显式说明成本

当用户或模型准备从当前主线切换到另一个 feature，必须先输出切换成本：

```text
CURRENT_THEME: 124-migration-remediation 样本迁移
REQUESTED_THEME: 108-export-pipeline-delivery
SWITCH_COST: 需要重新读取 108 的 memory/spec/analysis/gate，上下文预算增加。
RISK: 124 的迁移规则尚未验证，切换会导致模式未固化。
RECOMMENDATION: 继续完成 124 的 gate 样本，再切换。
NEXT_COMMAND: /sp.gate 124-migration-remediation
```

除非用户明确确认切换，否则 SP 不应静默切换主线。

### 1. 下一步建议不能再使用模糊触发条件

禁止把下一步写成以下形式：

- “如果你需要阶段入口判断……”
- “必要时运行……”
- “可考虑运行……”
- “视情况继续……”
- “如果要进入下一阶段……”

这些表达会制造新问题：用户必须先理解一个没有定义的概念，才能知道下一步是什么。

应改为默认动作 + 触发解释：

```text
下一步建议：运行 /sp.gate 124-migration-remediation。
原因：当前 /sp.analyze 已 PASS，但 OPEN-002 仍是 Monitoring，说明运行时、集成、E2E、性能证据还不是完整证明。/sp.gate 的职责是判断当前文档状态是否允许进入下一阶段，或明确仍停留在治理/证据补齐阶段。
禁止动作：不要运行 /sp.implement，因为该 feature 当前仍是文档治理状态，未授权生产代码实现。
```

如果命令不建议继续，也必须明确说：

```text
下一步建议：暂停 SP 阶段推进，先补 OPEN-002 的证据。
建议命令：无。
原因：缺少运行时/集成/E2E/性能证据，继续 gate 也只能得到条件通过或阻塞结论。
```

### 2. 每个 SP 命令必须有统一收尾契约

所有 `/sp.*` 命令和自由格式 SP 分析都必须以固定结构结束：

```text
## 当前状态

SP_STATUS: PASS | CONDITIONAL_PASS | NEEDS_PRD | NEEDS_SOURCE | NEEDS_CLARIFY | NEEDS_DECISION | BLOCKED | STOP
SP_STAGE: prd | specify | clarify | plan | tasks | analyze | gate | implement | governance
FEATURE: <feature-id>
CAN_CONTINUE: yes | no

## 问题 / 阻塞

- <没有问题时写：None>
- <有问题时必须写清影响、证据、关闭条件>

## 下一步建议

NEXT_ACTION: <一句明确动作，不使用“如果需要”>
NEXT_COMMAND: </sp.xxx feature-id 或 None>
WHY_THIS_NEXT: <为什么这是下一步>
DO_NOT_RUN: <明确禁止的命令或 None>
```

其中：

- `NEXT_ACTION` 必须是确定动作，不能是条件句。
- `NEXT_COMMAND` 只能有一个首选命令；备选命令放到说明里，不得让用户自己判断主路线。
- `DO_NOT_RUN` 必须在存在误用风险时填写，例如文档治理 feature 禁止 `/sp.implement`。
- 不再新增第二套继续字段。命令是否可以自动衔接，只看 route JSON 的 `autoExecute` 和 `continueAllowed`，以及宿主命令模板的停止规则；面向人的输出只说明 `CAN_CONTINUE` 和阻塞原因。

### 3. “阶段入口判断”必须被替换为用户可理解的动作

不要直接对用户说“阶段入口判断”。这是内部概念。

应改成：

```text
/sp.gate 的作用：检查当前 feature 是否允许进入下一阶段，并给出 PASS、CONDITIONAL_PASS 或 BLOCKED。
本次为什么需要 gate：/sp.analyze 只证明文档链路通过，不证明运行证据完整，也不授权实现。
```

用户不应承担解释内部术语的负担。命令输出必须把术语翻译成动作、原因和结果。

### 4. `/sp.analyze` 与 `/sp.gate` 的职责边界必须固定

建议固化为：

- `/sp.analyze`：检查文档链路、memory、trace、open-items 和治理一致性。
- `/sp.gate`：判断是否允许进入下一阶段，或明确阻塞原因。
- `/sp.implement`：只在 gate 明确允许实现时使用。

因此 `/sp.analyze PASS` 不能被表述为“可以实现”。它最多说明分析通过。下一步应由 gate 或明确的证据补齐动作决定。

### 5. 安装模板漂移必须成为检查项

ASK 当前安装的 `.gemini/commands/sp.specify.toml` 仍是旧版本：它把 `/sp.specify` 当作 PRD-like 入口，并明确不建议 `/sp.prd`。这和当前 `speckit-layered` 的新版 PRD → spec-outline → specify 机制冲突。

需要增加一个安装/升级检查：

```text
sp doctor 或安装后校验必须检查：
- 已安装命令是否包含 /sp.prd 路由规则
- /sp.specify 是否检查 prd.md
- /sp.specify 是否检查 spec-outline.md
- 输出是否包含统一 Next contract
- 旧版 “Suggest /sp.clarify” 是否仍存在
```

如果检查失败，应该输出：

```text
SP_STATUS: BLOCKED
NEXT_ACTION: 先刷新本项目 SP 命令安装，不要继续修 feature 文档。
NEXT_COMMAND: specify init . --integration gemini --force
WHY_THIS_NEXT: 当前项目安装模板落后于机制定义，继续运行旧命令会产生不一致产物。
```

### 6. token 消耗必须进入机制约束

最新 ask 记录显示，即使没有工具调用，也可能消耗约 12K input tokens。SP 机制必须把上下文预算作为硬规则，而不是建议。

建议规则：

- 每个命令先读 route/memory index，不默认展开全目录。
- 如果读取超过当前 feature 的直接 workset，必须说明扩展原因。
- 不允许把大量 flow、governance、archive 文档作为默认上下文。
- 输出不应附带长篇读取清单；只报告影响判断的证据。
- 当 token 消耗高但没有实质推进时，命令应返回 `SP_STATUS: STOP`，建议先收缩上下文。
- 接手项目时必须先输出 `PRIMARY_THEME` 和 `READ_SET`，再读取深层 feature 文档。
- 当请求会跨多个 feature 展开时，必须先选择一个代表样本；不允许一次性深读所有 feature。

### 7. 进度判断必须从“产物数量”转向“阶段状态”

ASK 已有大量 `spec.md`、analysis、flow 和 governance 文档，但这不等于阶段推进完成。

SP 机制应明确：

- 产物存在不等于 PASS。
- `Open Issue Codes: None` 不等于 implement-ready。
- governance-clean 不等于 runtime evidence complete。
- analyze PASS 不等于 gate PASS。
- gate PASS 不等于授权实现，除非 gate 明确写出 next allowed stage 是 implement。

## 建议落地顺序

1. 先增加项目接手方向判断契约：`PROJECT_GOAL`、`PRIMARY_THEME`、`ROOT_BLOCKER_FAMILY`、`FIRST_FIX`、`DEFERRED_WORK`。
2. 再改命令输出契约，强制所有 SP 命令有统一收尾。
3. 强化 `/sp.route` 三种模式：默认 `/sp.route` 做 Warm Route，`/sp.route y` 保持安全继续，`/sp.route all` 做项目级全局扫描并先输出主线和优先级，再推荐 feature 级命令。
4. 再改 `/sp.analyze`、`/sp.gate`、`/sp.specify` 的 Next 规则，禁止模糊条件句。
5. 增加安装漂移检查，识别项目里仍在使用旧命令模板的情况。
6. 增加上下文预算规则，把高 token 低进展作为机制缺陷处理。
7. 用 ASK 的 `124-migration-remediation` 做真实回归样本，验证新输出是否能让用户不用再判断“我是否需要阶段入口判断”。
8. 样本验证后，再按阻塞类型分批迁移其他 feature。

## 验收标准

一个 SP 命令输出只有满足以下条件，才算合格：

- 项目接手时先给出方向判断和唯一主线，而不是直接深读某个 feature。
- 用户可以直接知道下一条命令是什么。
- 用户可以直接知道为什么是这条命令。
- 用户可以直接知道哪些命令不能跑。
- 用户不需要理解内部术语才能继续。
- 如果不能继续，输出必须说明缺什么证据、谁来补、补完后跑什么。
- 如果输出缺少 `NEXT_ACTION` 或 `NEXT_COMMAND`，视为不合格输出。
- 如果输出缺少 `PRIMARY_THEME`、`FIRST_FIX` 或 `DEFERRED_WORK`，不能算完成项目接手判断。
- 如果模型跨 feature 切换但没有说明切换成本，视为不合格输出。
