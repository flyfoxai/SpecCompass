# Test And Acceptance

## ACC-LEAVE-SUBMIT-SUCCESS

- Goal: 验证员工成功提交请假申请
- Preconditions:
  - 员工有足够年假余额
  - 起止时间不冲突
- Steps:
  1. 打开 `SCREEN-LEAVE-APPLY`
  2. 填写合法数据并提交
- Expected:
  - 调用 `API-LEAVE-CREATE`
  - 写入 `TABLE-LEAVE_REQUEST`
  - 状态为 `pending`
- Trace:
  - `SCREEN-LEAVE-APPLY`
  - `API-LEAVE-CREATE`
  - `TABLE-LEAVE_REQUEST`
  - `RULE-LEAVE-001`

## ACC-LEAVE-APPROVE-SUCCESS

- Goal: 验证主管通过申请
- Preconditions:
  - 存在一条 `pending` 申请
  - 当前主管有审批范围
- Steps:
  1. 打开 `SCREEN-LEAVE-APPROVAL`
  2. 点击通过
- Expected:
  - 调用 `API-LEAVE-APPROVE`
  - 更新 `TABLE-LEAVE_REQUEST.status = approved`
  - 写入 `TABLE-LEAVE_APPROVAL`
  - 产生 `EVT-LEAVE-APPROVED`
- Trace:
  - `SCREEN-LEAVE-APPROVAL`
  - `API-LEAVE-APPROVE`
  - `TABLE-LEAVE_REQUEST`
  - `TABLE-LEAVE_APPROVAL`
  - `RULE-LEAVE-006`

## ACC-LEAVE-REJECT-REASON

- Goal: 验证驳回原因必填
- Preconditions:
  - 主管打开待审批申请
- Steps:
  1. 在 `SCREEN-LEAVE-APPROVAL` 点击驳回
  2. 不填写驳回原因
- Expected:
  - 前端阻止提交
  - 不调用 `API-LEAVE-REJECT`
- Trace:
  - `SCREEN-LEAVE-APPROVAL`
  - `RULE-LEAVE-007`

## ACC-LEAVE-WITHDRAW-SUCCESS

- Goal: 验证员工撤回待审批申请
- Preconditions:
  - 本人存在一条 `pending` 申请
- Steps:
  1. 打开 `SCREEN-LEAVE-DETAIL`
  2. 点击撤回
- Expected:
  - 调用 `API-LEAVE-WITHDRAW`
  - 更新 `TABLE-LEAVE_REQUEST.status = withdrawn`
- Trace:
  - `SCREEN-LEAVE-DETAIL`
  - `API-LEAVE-WITHDRAW`
  - `TABLE-LEAVE_REQUEST`
  - `RULE-LEAVE-004`

## ACC-LEAVE-LIST-VIEW

- Goal: 验证员工查看请假记录列表
- Preconditions:
  - 本人存在至少一条请假记录
- Steps:
  1. 打开 `SCREEN-LEAVE-LIST`
  2. 按状态筛选 `pending`
- Expected:
  - 调用 `API-LEAVE-LIST`
  - 返回仅本人可见记录
- Trace:
  - `SCREEN-LEAVE-LIST`
  - `API-LEAVE-LIST`
  - `TABLE-LEAVE_REQUEST`
