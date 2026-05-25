# Permissions Matrix

| Role | Screen | Action | Data Scope | Allow | Notes |
| --- | --- | --- | --- | --- | --- |
| `ROLE-EMPLOYEE` | `SCREEN-LEAVE-APPLY` | 创建、保存、提交 | 本人 | Yes | 草稿和提交受规则校验 |
| `ROLE-EMPLOYEE` | `SCREEN-LEAVE-DETAIL` | 撤回 | 本人且 `pending` | Yes | 已通过与已驳回不可撤回 |
| `ROLE-EMPLOYEE` | `SCREEN-LEAVE-APPROVAL` | 审批 | None | No | 无审批权限 |
| `ROLE-MANAGER` | `SCREEN-LEAVE-APPROVAL` | 通过、驳回 | 本部门待审批 | Yes | 受 `RULE-LEAVE-005` 约束 |
| `ROLE-MANAGER` | `SCREEN-LEAVE-DETAIL` | 查看 | 本部门申请 | Yes | 不允许撤回本人以外申请 |
| `ROLE-HR` | `SCREEN-LEAVE-LIST` | 查看全局 | 组织范围 | Yes | 用于审核与排查 |
| `ROLE-HR` | `SCREEN-LEAVE-APPROVAL` | 正常审批 | None | No | 例外流程不在本范围 |

## Field-Level Notes

- 驳回意见字段只有 `ROLE-MANAGER` 可编辑
- 申请页字段仅 `ROLE-EMPLOYEE` 在草稿态可编辑
- 详情页全部字段只读
