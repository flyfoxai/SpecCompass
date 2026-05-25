# Data Entity Catalog

| Object ID | Table | Description | Key Fields |
| --- | --- | --- | --- |
| `OBJ-LEAVE-REQUEST` | `TABLE-LEAVE_REQUEST` | 请假主单 | `request_id`, `employee_id`, `manager_id`, `leave_type`, `start_at`, `end_at`, `status` |
| `OBJ-LEAVE-APPROVAL` | `TABLE-LEAVE_APPROVAL` | 审批动作记录 | `approval_id`, `request_id`, `decision`, `comment`, `acted_by`, `acted_at` |
| `OBJ-LEAVE-BALANCE` | `TABLE-LEAVE_BALANCE_LEDGER` | 余额变更流水 | `ledger_id`, `employee_id`, `leave_type`, `delta_hours`, `source_request_id`, `change_type` |

## Tracking Notes

- `API-LEAVE-CREATE` 写入 `TABLE-LEAVE_REQUEST`
- `API-LEAVE-APPROVE` 同时更新 `TABLE-LEAVE_REQUEST` 并写入 `TABLE-LEAVE_APPROVAL`
- 审批通过后事件驱动写入 `TABLE-LEAVE_BALANCE_LEDGER`
