# Screen Map

## Screen Catalog

| Screen ID | Canonical Name | Alias Keywords | Module | Roles | Goal | Entry | Upstream Flow | Key Action IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SCREEN-LEAVE-APPLY` | 请假申请页 | 我要请假页, 请假填写页, 申请页 | `MODULE-LEAVE-REQUEST` | `ROLE-EMPLOYEE` | 创建或编辑请假申请 | 菜单“我要请假” | `FLOW-LEAVE-001` | `ACTION-LEAVE-APPLY-010`, `ACTION-LEAVE-APPLY-020` |
| `SCREEN-LEAVE-LIST` | 请假记录页 | 请假列表页, 记录页, 查询页 | `MODULE-LEAVE-REQUEST` | `ROLE-EMPLOYEE`, `ROLE-HR` | 查看申请列表和状态 | 菜单“请假记录” | `FLOW-LEAVE-001` | `ACTION-LEAVE-LIST-010`, `ACTION-LEAVE-LIST-020`, `ACTION-LEAVE-LIST-030` |
| `SCREEN-LEAVE-DETAIL` | 请假详情页 | 申请详情页, 审批轨迹页, 结果页 | `MODULE-LEAVE-REQUEST` | `ROLE-EMPLOYEE`, `ROLE-MANAGER`, `ROLE-HR` | 查看申请详情与审批轨迹 | 列表页、审批待办进入 | `FLOW-LEAVE-001` | `ACTION-LEAVE-DETAIL-010`, `ACTION-LEAVE-DETAIL-020` |
| `SCREEN-LEAVE-APPROVAL` | 请假审批页 | 待审批页, 主管审批页, 审批处理页 | `MODULE-LEAVE-REQUEST` | `ROLE-MANAGER` | 审批或驳回待审申请 | 审批待办、详情页跳转进入 | `FLOW-LEAVE-001` | `ACTION-LEAVE-APPROVAL-010`, `ACTION-LEAVE-APPROVAL-020` |

## Navigation Notes

- `SCREEN-LEAVE-APPLY` 提交后跳转 `SCREEN-LEAVE-DETAIL`
- `SCREEN-LEAVE-LIST` 通过 `ACTION-LEAVE-LIST-020` 进入 `SCREEN-LEAVE-DETAIL`
- `SCREEN-LEAVE-DETAIL` 在审批人视角可通过 `ACTION-LEAVE-DETAIL-020` 进入 `SCREEN-LEAVE-APPROVAL`
- `SCREEN-LEAVE-APPROVAL` 完成审批后返回待办列表或详情页结果态
