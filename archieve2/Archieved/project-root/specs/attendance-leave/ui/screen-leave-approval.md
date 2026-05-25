# SCREEN-LEAVE-APPROVAL

## Screen Metadata

| Key | Value |
| --- | --- |
| Screen ID | `SCREEN-LEAVE-APPROVAL` |
| Canonical Name | 请假审批页 |
| Alias Keywords | 待审批页, 主管审批页, 审批处理页 |
| Module | `MODULE-LEAVE-REQUEST` |
| Linked Flows | `FLOW-LEAVE-001`, `FLOW-LEAVE-STATE-001` |
| Owner ID | `STAGE-LEAVE-03` |

## Page Goal

主管查看待审批申请并执行通过或驳回。

## Roles

- `ROLE-MANAGER`

## Entry Condition

- 从审批待办或详情页进入
- 申请状态为 `STATE-REQUEST-PENDING`

## Leave Condition

- 执行 `ACTION-LEAVE-APPROVAL-010` 成功后离开当前页并返回结果页或待办列表
- 执行 `ACTION-LEAVE-APPROVAL-020` 成功后离开当前页并返回结果页或待办列表
- 无权限时停留当前页且禁止提交

## Page States

| State | Meaning |
| --- | --- |
| 初始态 | 显示待审批详情 |
| 加载态 | 加载申请与余额信息 |
| 空态 | 待办不存在 |
| 错误态 | 审批提交失败 |
| 无权限态 | 不在审批范围内 |

## Section Catalog

| Section ID | Canonical Name | Alias Keywords | Owner ID | Goal |
| --- | --- | --- | --- | --- |
| `SECTION-LEAVE-APPROVAL-010` | 申请摘要区 | 待审摘要区, 申请概览区, 审批对象区 | `SCREEN-LEAVE-APPROVAL` | 展示当前待审申请核心信息 |
| `SECTION-LEAVE-APPROVAL-020` | 余额与规则提示区 | 余额区, 规则提示区, 风险提示区 | `SCREEN-LEAVE-APPROVAL` | 展示余额与审批边界 |
| `SECTION-LEAVE-APPROVAL-030` | 审批意见区 | 审批备注区, 驳回原因区, 意见输入区 | `SCREEN-LEAVE-APPROVAL` | 承载审批意见输入 |
| `SECTION-LEAVE-APPROVAL-040` | 操作区 | 审批按钮区, 决策区, 提交区 | `SCREEN-LEAVE-APPROVAL` | 承载通过和驳回动作 |

## Field Catalog

| Field ID | Canonical Name | Alias Keywords | Owner ID | Data Binding | Visibility And Editability |
| --- | --- | --- | --- | --- | --- |
| `FIELD-LEAVE-APPROVAL-010` | 审批意见字段 | 驳回原因框, 审批备注框, approval comment | `SECTION-LEAVE-APPROVAL-030` | approval.comment | 审批时可编辑；驳回时必填 |
| `FIELD-LEAVE-APPROVAL-020` | 余额摘要字段 | 余额信息, 剩余额度, balance summary | `SECTION-LEAVE-APPROVAL-020` | leave balance snapshot | 只读 |
| `FIELD-LEAVE-APPROVAL-030` | 待审申请摘要字段 | 审批对象摘要, 待审单概览, request summary | `SECTION-LEAVE-APPROVAL-010` | request summary | 只读 |

## Action Catalog

| Action ID | Canonical Name | Alias Keywords | Owner ID | Use Case | API | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `ACTION-LEAVE-APPROVAL-010` | 通过申请动作 | 通过按钮, 同意按钮, approve action | `SECTION-LEAVE-APPROVAL-040` | `UC-LEAVE-APPROVE` | `API-LEAVE-APPROVE` | 更新为 `STATE-REQUEST-APPROVED` |
| `ACTION-LEAVE-APPROVAL-020` | 驳回申请动作 | 驳回按钮, 拒绝按钮, reject action | `SECTION-LEAVE-APPROVAL-040` | `UC-LEAVE-REJECT` | `API-LEAVE-REJECT` | 更新为 `STATE-REQUEST-REJECTED` |

## Interface Bindings

- `ACTION-LEAVE-APPROVAL-010` 绑定 `API-LEAVE-APPROVE`
- `ACTION-LEAVE-APPROVAL-020` 绑定 `API-LEAVE-REJECT`
- `FIELD-LEAVE-APPROVAL-020` 来源于审批前余额快照

## Business Rules

- `RULE-LEAVE-005`：主管必须在管理范围内，否则禁用 `ACTION-LEAVE-APPROVAL-010` 和 `ACTION-LEAVE-APPROVAL-020`
- `RULE-LEAVE-007`：`FIELD-LEAVE-APPROVAL-010` 在驳回时必填
- 余额信息只读展示，不允许在审批页修改

## Exceptions And Feedback

- 审批成功后返回待办列表或详情结果页
- 驳回成功后写入驳回原因并通知申请人
- 权限不足时直接阻止提交
