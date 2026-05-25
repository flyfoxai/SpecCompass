# Non-Functional Requirements

## Performance

- 列表页查询在常规分页条件下目标响应时间小于 `2s`
- 审批提交目标响应时间小于 `1s`

## Consistency

- 审批主交易与审批记录必须同事务提交
- 副作用允许异步，但必须有补偿记录

## Audit

- 所有审批动作必须落审计日志
- 关键状态变更必须保留时间与操作者

## Timezone

- 存储统一使用 `timestamptz`
- 页面展示按申请人所属组织时区
- 跨时区边界仍需在后续补更硬的字段说明
