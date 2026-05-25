# Events And Side Effects

## EVT-LEAVE-APPROVED

- Trigger Source: `API-LEAVE-APPROVE`
- Trigger Condition: 主管审批通过成功
- Downstream Actions:
  - 写入 `TABLE-LEAVE_BALANCE_LEDGER`
  - 生成审批通过通知
  - 写入审计日志
- Execution Mode: 异步
- Idempotency Key: `requestId + approved`
- Failure Handling:
  - 记录补偿任务
  - 不回滚主审批交易

## EVT-LEAVE-REJECTED

- Trigger Source: `API-LEAVE-REJECT`
- Trigger Condition: 主管驳回成功
- Downstream Actions:
  - 生成驳回通知
  - 写入审计日志
- Execution Mode: 异步
- Idempotency Key: `requestId + rejected`

## Known Gaps

- 当前已定义触发源和下游动作，但补偿顺序仍可再硬化
- 通知失败是否重试三次后转人工仍待补充
