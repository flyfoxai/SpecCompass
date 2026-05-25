# TABLE-LEAVE_BALANCE_LEDGER

## Purpose

记录审批通过后的余额预占或扣减流水。

## Fields

| Field | Type | Required | Nullable | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| `ledger_id` | `uuid` | Yes | No | None | 主键 |
| `employee_id` | `uuid` | Yes | No | None | 员工 |
| `leave_type` | `varchar(32)` | Yes | No | None | 假种 |
| `delta_hours` | `numeric(8,2)` | Yes | No | None | 变更小时数 |
| `change_type` | `varchar(32)` | Yes | No | None | `reserve` or `release` |
| `source_request_id` | `uuid` | Yes | No | None | 来源申请 |
| `created_at` | `timestamptz` | Yes | No | `now()` | 审计字段 |

## Constraints

- 主键：`ledger_id`
- 索引：
  - `idx_leave_balance_ledger_employee_type`
  - `idx_leave_balance_ledger_source_request`

## Delete Policy

- 不允许物理删除
- 若补偿发生，新增反向流水，不修改原流水
