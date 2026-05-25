# Table Index

| Table ID | Table Name | Purpose | Source APIs |
| --- | --- | --- | --- |
| `TABLE-LEAVE_REQUEST` | `leave_request` | 存储请假主单与主状态 | `API-LEAVE-DRAFT-SAVE`, `API-LEAVE-CREATE`, `API-LEAVE-WITHDRAW`, `API-LEAVE-APPROVE`, `API-LEAVE-REJECT` |
| `TABLE-LEAVE_APPROVAL` | `leave_approval` | 存储审批动作与审批意见 | `API-LEAVE-APPROVE`, `API-LEAVE-REJECT` |
| `TABLE-LEAVE_BALANCE_LEDGER` | `leave_balance_ledger` | 存储审批通过后的余额变更流水 | `API-LEAVE-APPROVE` |
