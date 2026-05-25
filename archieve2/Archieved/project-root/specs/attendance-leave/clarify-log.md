# Clarify Log

## Question Index

| Question ID | Category | Mode | Queue Topic | Source Step | Status | Impact Scope | Propagation Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Q-LEAVE-001` | `CF-SPEC` | `Immediate` | `approval-scope` | `sp.clarify` | Closed | 主线能力边界、审批路线 | `In Sync` |
| `Q-LEAVE-002` | `CF-FLOW` | `Immediate` | `submit-and-approval-branching` | `sp.flow` | Closed | 提交流程校验点、审批后联动 | `In Sync` |
| `Q-LEAVE-003` | `CF-UI` | `Batch` | `screen-structure-and-targeting` | `sp.ui` | Closed | 申请页与审批页的关键动作和字段约束 | `In Sync` |

## Question Record Template

### `Q-LEAVE-001`

#### Category

`CF-SPEC`

#### Mode

`Immediate`

#### Question Type

`Single Select`

#### Source Step

`sp.clarify`

#### Trigger Reason

原始需求未明确当前版本是否纳入多级审批、代理审批等扩展路线。

#### Queue Topic

`approval-scope`

#### Queue Reason

这是路线级问题，必须优先定案，不能留到后续批量处理。

#### Queue Size

`1`

#### Flush Trigger

`Immediate`

#### Latest Safe Step

`sp.clarify`

#### Why This Matters

如果路线不先定，后续流程和页面会反复被重写。

#### Target Type

`Capability Boundary`

#### Target ID

`OBJ-LEAVE-REQUEST`

#### Canonical Name

请假审批能力边界

#### Alias Keywords

单级审批, 多级审批, 代理审批, 会签

#### Owner ID

`FLOW-LEAVE-001`

#### Allowed Options

- A. 当前阶段只支持单级直属主管审批
- B. 当前阶段支持多级审批
- C. 当前阶段支持代理审批

#### Operation

`Update`

#### Source Of Truth

`clarifications.md`

#### Selected Answer

A. 当前阶段只支持单级直属主管审批

#### Optional Remarks

多级审批、代理审批保留到后续阶段，不进入当前文档基线。

#### Impact Scope

业务框架、主流程、审批页面

#### Affected Documents

`clarifications.md`, `flows/*`, `ui/screen-leave-approval.md`, `memory/stable-context.md`

#### Required Sync Files

`clarifications.md`, `flows/index.md`, `flows/main-flow.mmd`, `ui/screen-leave-approval.md`, `memory/stable-context.md`, `memory/open-items.md`

#### Affected IDs

`FLOW-LEAVE-001`, `SCREEN-LEAVE-APPROVAL`, `RULE-LEAVE-005`

#### Need Back-Propagation

`Yes`

#### Target Resolution

- `User Phrase`: 审批能力边界
- `Resolved Target`: `OBJ-LEAVE-REQUEST`
- `Resolution Basis`: canonical name + business scope + owner flow

#### Propagation Status

`In Sync`

#### Propagation Check

- Updated: `clarifications.md`, `flows/index.md`, `flows/main-flow.mmd`, `ui/screen-leave-approval.md`, `memory/stable-context.md`, `memory/open-items.md`
- Pending: none
- Notes: 单级审批边界已同步到流程、页面和稳定记忆层

#### Status

Closed

#### Revisit Condition

当项目纳入多级审批或代理审批时重新打开。

### `Q-LEAVE-002`

#### Category

`CF-FLOW`

#### Mode

`Immediate`

#### Question Type

`Multi Select`

#### Source Step

`sp.flow`

#### Trigger Reason

提交流程和审批流程缺少明确的判断节点与异常回路，后续无法定向修改。

#### Queue Topic

`submit-and-approval-branching`

#### Queue Reason

该问题直接影响流程主链和后续 trace 命中，需立即处理。

#### Queue Size

`1`

#### Flush Trigger

`Immediate`

#### Latest Safe Step

`sp.flow`

#### Why This Matters

没有 `STEP-* / DEC-* / EX-*`，模型只能靠图上位置猜“第二个判断框”。

#### Target Type

`Flow`

#### Target ID

`FLOW-LEAVE-001`

#### Canonical Name

请假申请主流程

#### Alias Keywords

请假提交流程, 请假审批主线, 请假主流程

#### Owner ID

`STAGE-LEAVE-01`, `STAGE-LEAVE-02`, `STAGE-LEAVE-03`, `STAGE-LEAVE-04`

#### Allowed Options

- A. 提交前显式拆出表单校验判断点
- B. 提交前显式拆出余额与冲突校验判断点
- C. 审批后显式拆出副作用联动步骤

#### Operation

`Split`

#### Source Of Truth

`flows/index.md`

#### Selected Answer

A, B, C

#### Optional Remarks

异常分支应保留回退路径，不得直接吞掉错误。

#### Impact Scope

主流程图、时序图、追踪索引

#### Affected Documents

`flows/index.md`, `flows/main-flow.mmd`, `flows/sequence.mmd`, `memory/trace-index.md`

#### Required Sync Files

`flows/index.md`, `flows/main-flow.mmd`, `flows/sequence.mmd`, `memory/trace-index.md`, `memory/stable-context.md`

#### Affected IDs

`FLOW-LEAVE-001`, `STEP-LEAVE-010`, `DEC-LEAVE-020`, `DEC-LEAVE-030`, `EX-LEAVE-021`, `EX-LEAVE-031`, `STEP-LEAVE-040`, `STEP-LEAVE-110`

#### Need Back-Propagation

`Yes`

#### Target Resolution

- `User Phrase`: 提交流程里的判断点和异常回路
- `Resolved Target`: `FLOW-LEAVE-001`
- `Resolution Basis`: canonical flow name + stage ownership + key step aliases

#### Propagation Status

`In Sync`

#### Propagation Check

- Updated: `flows/index.md`, `flows/main-flow.mmd`, `flows/sequence.mmd`, `memory/trace-index.md`, `memory/stable-context.md`
- Pending: none
- Notes: 新增的 `STEP-* / DEC-* / EX-*` 已能被 trace 反查

#### Status

Closed

#### Revisit Condition

当提交流程加入附件、排班或薪资联动等新判断点时重新打开。

### `Q-LEAVE-003`

#### Category

`CF-UI`

#### Mode

`Batch`

#### Question Type

`Multi Select`

#### Source Step

`sp.ui`

#### Trigger Reason

页面卡片只有自然语言段落，缺少区块、动作、字段级编号，后续改 UI 易误改。

#### Queue Topic

`screen-structure-and-targeting`

#### Queue Reason

同主题问题可以集中处理，但在进入后续 gate 前必须完成一次冲刷。

#### Queue Size

`3`

#### Flush Trigger

`Before Gate`

#### Latest Safe Step

`sp.ui`

#### Why This Matters

如果不先把页面对象编号化，`sp.clarify` 无法精确指向“申请页提交按钮”或“审批页驳回原因框”。

#### Target Type

`UI`

#### Target ID

`SCREEN-LEAVE-APPLY`

#### Canonical Name

请假申请页

#### Alias Keywords

我要请假页, 请假填写页, 申请页

#### Owner ID

`FLOW-LEAVE-001`

#### Allowed Options

- A. 为申请页补 `SECTION-*` 和 `FIELD-*`
- B. 为审批页补 `ACTION-*` 和约束字段
- C. 为 `screen-map` 暴露关键动作编号

#### Operation

`Add`

#### Source Of Truth

`ui/screen-map.md`

#### Selected Answer

A, B, C

#### Optional Remarks

详情页和列表页也按同一口径补齐，避免只有关键页有编号。

#### Impact Scope

页面卡片、screen map、trace index

#### Affected Documents

`ui/index.md`, `ui/screen-map.md`, `ui/screen-leave-apply.md`, `ui/screen-leave-list.md`, `ui/screen-leave-detail.md`, `ui/screen-leave-approval.md`, `memory/trace-index.md`

#### Required Sync Files

`ui/index.md`, `ui/screen-map.md`, `ui/screen-leave-apply.md`, `ui/screen-leave-list.md`, `ui/screen-leave-detail.md`, `ui/screen-leave-approval.md`, `memory/trace-index.md`, `memory/stable-context.md`, `memory/worksets/index.md`

#### Affected IDs

`SCREEN-LEAVE-APPLY`, `SECTION-LEAVE-APPLY-010`, `FIELD-LEAVE-APPLY-050`, `ACTION-LEAVE-APPLY-020`, `SCREEN-LEAVE-LIST`, `ACTION-LEAVE-LIST-010`, `SCREEN-LEAVE-DETAIL`, `ACTION-LEAVE-DETAIL-010`, `SCREEN-LEAVE-APPROVAL`, `FIELD-LEAVE-APPROVAL-010`, `ACTION-LEAVE-APPROVAL-020`

#### Need Back-Propagation

`Yes`

#### Target Resolution

- `User Phrase`: 申请页提交按钮、审批页驳回原因框、列表页筛选区
- `Resolved Target`: `SCREEN-LEAVE-APPLY`, `SCREEN-LEAVE-APPROVAL`, `SCREEN-LEAVE-LIST`
- `Resolution Basis`: canonical screen name + alias keywords + owner flow

#### Propagation Status

`In Sync`

#### Propagation Check

- Updated: `ui/index.md`, `ui/screen-map.md`, `ui/screen-leave-apply.md`, `ui/screen-leave-list.md`, `ui/screen-leave-detail.md`, `ui/screen-leave-approval.md`, `memory/trace-index.md`, `memory/stable-context.md`, `memory/worksets/index.md`
- Pending: none
- Notes: UI 编号结构已进入 trace 与 workset 入口，后续可按 ID 定向修改

#### Status

Closed

#### Revisit Condition

当页面结构发生模块级改造或新增审批子页面时重新打开。
