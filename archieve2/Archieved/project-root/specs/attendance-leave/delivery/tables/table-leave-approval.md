# TABLE-LEAVE_APPROVAL

## Purpose

记录审批动作与审批意见。

## Fields

| Field | Type | Required | Nullable | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| `approval_id` | `uuid` | Yes | No | None | 主键 |
| `request_id` | `uuid` | Yes | No | None | 关联 `TABLE-LEAVE_REQUEST` |
| `decision` | `varchar(16)` | Yes | No | None | `approve` or `reject` |
| `comment` | `varchar(500)` | No | Yes | None | 驳回时必填 |
| `acted_by` | `uuid` | Yes | No | None | 审批人 |
| `acted_at` | `timestamptz` | Yes | No | `now()` | 操作时间 |
| `created_at` | `timestamptz` | Yes | No | `now()` | 审计字段 |

## Constraints

- 主键：`approval_id`
- 外键：`request_id` -> `leave_request.request_id`
- 索引：
  - `idx_leave_approval_request_id`
  - `idx_leave_approval_acted_by`

## Delete Policy

- 不允许删除审批记录
