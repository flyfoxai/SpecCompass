# Domain Model

## Core Aggregates

- `OBJ-LEAVE-REQUEST`
  - 负责请假主状态
  - 持有假种、起止时间、原因、申请人、审批人
- `OBJ-LEAVE-APPROVAL`
  - 负责审批动作留痕
  - 持有决策、意见、处理人、处理时间
- `OBJ-LEAVE-BALANCE`
  - 负责额度查询和预占
- `OBJ-NOTIFICATION`
  - 负责审批结果通知

## Main Relationships

- `OBJ-LEAVE-REQUEST 1 -> N OBJ-LEAVE-APPROVAL`
- `OBJ-LEAVE-REQUEST N -> 1 OBJ-LEAVE-BALANCE`
- `OBJ-LEAVE-REQUEST 1 -> N OBJ-NOTIFICATION`

## Status Owner

- 申请状态由 `OBJ-LEAVE-REQUEST` 持有
- 审批动作由 `OBJ-LEAVE-APPROVAL` 补充，不重复持有主状态
