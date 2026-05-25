# TABLE-LEAVE_REQUEST

## Purpose

存储请假申请主单和状态。

## Fields

| Field | Type | Required | Nullable | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| `request_id` | `uuid` | Yes | No | None | 主键 |
| `employee_id` | `uuid` | Yes | No | None | 申请人 |
| `manager_id` | `uuid` | Yes | No | None | 审批人 |
| `leave_type` | `varchar(32)` | Yes | No | None | 假种 |
| `start_at` | `timestamptz` | Yes | No | None | 开始时间 |
| `end_at` | `timestamptz` | Yes | No | None | 结束时间 |
| `half_day` | `boolean` | Yes | No | `false` | 半天标记 |
| `reason` | `varchar(500)` | Yes | No | None | 请假原因 |
| `status` | `varchar(32)` | Yes | No | `draft` | 状态映射 `STATE-REQUEST-*` |
| `withdrawn_at` | `timestamptz` | No | Yes | None | 撤回时间 |
| `created_at` | `timestamptz` | Yes | No | `now()` | 审计字段 |
| `updated_at` | `timestamptz` | Yes | No | `now()` | 审计字段 |

## Constraints

- 主键：`request_id`
- 唯一约束：无全局唯一业务键，冲突依赖接口规则校验
- 索引：
  - `idx_leave_request_employee_status`
  - `idx_leave_request_manager_status`
  - `idx_leave_request_time_range`

## Delete Policy

- 逻辑删除不启用
- 草稿允许物理删除
- 已提交及之后状态不得物理删除

## State Mapping

- `draft` -> `STATE-REQUEST-DRAFT`
- `pending` -> `STATE-REQUEST-PENDING`
- `approved` -> `STATE-REQUEST-APPROVED`
- `rejected` -> `STATE-REQUEST-REJECTED`
- `withdrawn` -> `STATE-REQUEST-WITHDRAWN`
