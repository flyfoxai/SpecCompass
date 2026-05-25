# UI Index

## Module Index

| Module | Screens | Linked Flows | Notes |
| --- | --- | --- | --- |
| `MODULE-LEAVE-REQUEST` | `SCREEN-LEAVE-APPLY`, `SCREEN-LEAVE-LIST`, `SCREEN-LEAVE-DETAIL`, `SCREEN-LEAVE-APPROVAL` | `FLOW-LEAVE-001`, `FLOW-LEAVE-STATE-001` | 覆盖申请、查询、详情、审批四类页面资产 |

## Screen Catalog

| Screen ID | Canonical Name | Alias Keywords | Linked Flows | Key Action IDs | Notes |
| --- | --- | --- | --- | --- | --- |
| `SCREEN-LEAVE-APPLY` | 请假申请页 | 我要请假页, 请假填写页, 申请页 | `FLOW-LEAVE-001`, `FLOW-LEAVE-STATE-001` | `ACTION-LEAVE-APPLY-010`, `ACTION-LEAVE-APPLY-020` | 员工发起、保存、提交入口 |
| `SCREEN-LEAVE-LIST` | 请假记录页 | 请假列表页, 记录页, 查询页 | `FLOW-LEAVE-001`, `FLOW-LEAVE-STATE-001` | `ACTION-LEAVE-LIST-010`, `ACTION-LEAVE-LIST-020`, `ACTION-LEAVE-LIST-030` | 查询、筛选、进入详情 |
| `SCREEN-LEAVE-DETAIL` | 请假详情页 | 申请详情页, 审批轨迹页, 结果页 | `FLOW-LEAVE-001`, `FLOW-LEAVE-STATE-001` | `ACTION-LEAVE-DETAIL-010`, `ACTION-LEAVE-DETAIL-020` | 查看状态、撤回、跳转审批 |
| `SCREEN-LEAVE-APPROVAL` | 请假审批页 | 待审批页, 主管审批页, 审批处理页 | `FLOW-LEAVE-001`, `FLOW-LEAVE-STATE-001` | `ACTION-LEAVE-APPROVAL-010`, `ACTION-LEAVE-APPROVAL-020` | 主管通过或驳回申请 |

## Mapping Notes

- `SCREEN-LEAVE-APPLY` 负责 `UC-LEAVE-SAVE-DRAFT`、`UC-LEAVE-SUBMIT`
- `SCREEN-LEAVE-LIST` 负责 `UC-LEAVE-LIST-QUERY` 与详情入口分发
- `SCREEN-LEAVE-DETAIL` 负责 `UC-LEAVE-DETAIL-VIEW`、`UC-LEAVE-WITHDRAW`
- `SCREEN-LEAVE-APPROVAL` 负责 `UC-LEAVE-APPROVE`、`UC-LEAVE-REJECT`

## Query Guidance

- 如果用户说“申请页提交按钮”或“我要请假页送审动作”，先定位 `ACTION-LEAVE-APPLY-020`
- 如果用户说“审批页驳回原因框”，先定位 `FIELD-LEAVE-APPROVAL-010`
- 如果用户说“列表页筛选区”，先定位 `SECTION-LEAVE-LIST-010`
- 如果用户说“详情页撤回按钮”，先定位 `ACTION-LEAVE-DETAIL-010`

## JSON Forms Scope

- 当前只对 `SCREEN-LEAVE-APPLY` 生成 `JSON Forms` 样例
- `FIELD-LEAVE-APPLY-010` 到 `FIELD-LEAVE-APPLY-050` 与 `ui/jsonforms/*` 的数据结构直接对应
- 列表页、详情页、审批页保持文档卡片表达，不伪装为表单型原型
