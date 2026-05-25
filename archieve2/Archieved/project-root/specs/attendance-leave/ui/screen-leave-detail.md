# SCREEN-LEAVE-DETAIL

## Screen Metadata

| Key | Value |
| --- | --- |
| Screen ID | `SCREEN-LEAVE-DETAIL` |
| Canonical Name | 请假详情页 |
| Alias Keywords | 申请详情页, 审批轨迹页, 结果页 |
| Module | `MODULE-LEAVE-REQUEST` |
| Linked Flows | `FLOW-LEAVE-001`, `FLOW-LEAVE-STATE-001` |
| Owner ID | `STAGE-LEAVE-05` |

## Page Goal

查看单条请假申请详情、审批历史和撤回入口。

## Roles

- `ROLE-EMPLOYEE`
- `ROLE-MANAGER`
- `ROLE-HR`

## Entry Condition

- 从列表或审批待办进入
- 已拿到目标申请编号

## Leave Condition

- 执行 `ACTION-LEAVE-DETAIL-010` 成功后停留当前页并刷新为 `STATE-REQUEST-WITHDRAWN`
- 执行 `ACTION-LEAVE-DETAIL-020` 后跳转 `SCREEN-LEAVE-APPROVAL`

## Page States

| State | Meaning |
| --- | --- |
| 初始态 | 显示详情骨架 |
| 加载态 | 详情加载中 |
| 空态 | 申请不存在或已删除 |
| 错误态 | 读取失败 |
| 无权限态 | 超出数据范围 |

## Section Catalog

| Section ID | Canonical Name | Alias Keywords | Owner ID | Goal |
| --- | --- | --- | --- | --- |
| `SECTION-LEAVE-DETAIL-010` | 申请信息区 | 详情摘要区, 基础信息区, 主信息区 | `SCREEN-LEAVE-DETAIL` | 展示请假单核心信息 |
| `SECTION-LEAVE-DETAIL-020` | 审批历史区 | 审批轨迹区, 历史区, 记录区 | `SCREEN-LEAVE-DETAIL` | 展示主管审批历史 |
| `SECTION-LEAVE-DETAIL-030` | 规则说明区 | 状态说明区, 提示区, 规则提示区 | `SCREEN-LEAVE-DETAIL` | 提示当前状态可执行边界 |
| `SECTION-LEAVE-DETAIL-040` | 操作区 | 按钮区, 撤回区, 跳转审批区 | `SCREEN-LEAVE-DETAIL` | 承载撤回和审批跳转动作 |

## Field Catalog

| Field ID | Canonical Name | Alias Keywords | Owner ID | Data Binding | Visibility And Editability |
| --- | --- | --- | --- | --- | --- |
| `FIELD-LEAVE-DETAIL-010` | 申请编号字段 | 单号字段, requestId, 申请单号 | `SECTION-LEAVE-DETAIL-010` | request.id | 只读 |
| `FIELD-LEAVE-DETAIL-020` | 请假时间字段 | 起止时间, 时间摘要, 时间区间 | `SECTION-LEAVE-DETAIL-010` | request.startAt/endAt | 只读 |
| `FIELD-LEAVE-DETAIL-030` | 当前状态字段 | 状态标签, 当前状态, status badge | `SECTION-LEAVE-DETAIL-010` | request.state | 只读 |
| `FIELD-LEAVE-DETAIL-040` | 审批轨迹字段 | 审批历史列表, 审批记录, 时间线 | `SECTION-LEAVE-DETAIL-020` | approval history | 只读 |

## Action Catalog

| Action ID | Canonical Name | Alias Keywords | Owner ID | Use Case | API | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `ACTION-LEAVE-DETAIL-010` | 撤回申请动作 | 撤回按钮, 取消申请, withdraw action | `SECTION-LEAVE-DETAIL-040` | `UC-LEAVE-WITHDRAW` | `API-LEAVE-WITHDRAW` | 更新为 `STATE-REQUEST-WITHDRAWN` |
| `ACTION-LEAVE-DETAIL-020` | 去审批动作 | 审批入口按钮, 去处理按钮, 跳审批页 | `SECTION-LEAVE-DETAIL-040` | none | none | 跳转 `SCREEN-LEAVE-APPROVAL` |

## Interface Bindings

- 页面加载和 `ACTION-LEAVE-LIST-020` 均依赖 `API-LEAVE-DETAIL`
- `ACTION-LEAVE-DETAIL-010` 绑定 `API-LEAVE-WITHDRAW`

## Business Rules

- 详情字段全部只读
- 仅 `ROLE-EMPLOYEE` 且状态为 `STATE-REQUEST-PENDING` 时显示 `ACTION-LEAVE-DETAIL-010`
- 仅 `ROLE-MANAGER` 且当前人是审批人时显示 `ACTION-LEAVE-DETAIL-020`

## Exceptions And Feedback

- 撤回成功后列表与详情状态同步刷新
- 无权限时提示“仅申请人本人可撤回”
- 超出审批范围时隐藏 `ACTION-LEAVE-DETAIL-020`
