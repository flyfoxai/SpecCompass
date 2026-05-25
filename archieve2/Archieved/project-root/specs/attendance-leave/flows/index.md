# Flows Index

## Flow Catalog

| Flow ID | Canonical Name | Alias Keywords | Owner Stage | Key Step IDs | Source Rules | Source Screens | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FLOW-LEAVE-001` | 请假申请主流程 | 请假主流程, 提交审批主线 | `STAGE-LEAVE-01`, `STAGE-LEAVE-02`, `STAGE-LEAVE-03`, `STAGE-LEAVE-04` | `STEP-LEAVE-010`, `STEP-LEAVE-040`, `STEP-LEAVE-080`, `STEP-LEAVE-110` | `RULE-LEAVE-001`, `RULE-LEAVE-002`, `RULE-LEAVE-003`, `RULE-LEAVE-005`, `RULE-LEAVE-006`, `RULE-LEAVE-007`, `RULE-LEAVE-009` | `SCREEN-LEAVE-APPLY`, `SCREEN-LEAVE-DETAIL`, `SCREEN-LEAVE-APPROVAL` | 覆盖提交、审批、驳回与结果联动 |
| `FLOW-LEAVE-SEQ-001` | 请假交互时序 | 提交审批时序, 员工主管交互 | `STAGE-LEAVE-01`, `STAGE-LEAVE-03`, `STAGE-LEAVE-04` | `STEP-LEAVE-040`, `STEP-LEAVE-100`, `STEP-LEAVE-140` | `RULE-LEAVE-006`, `RULE-LEAVE-007` | `SCREEN-LEAVE-APPLY`, `SCREEN-LEAVE-APPROVAL` | 强调 actor 与 system 交互顺序 |
| `FLOW-LEAVE-STATE-001` | 请假状态流转 | 请求状态机, 申请状态主线 | `STAGE-LEAVE-01`, `STAGE-LEAVE-02`, `STAGE-LEAVE-03` | `STATE-REQUEST-DRAFT`, `STATE-REQUEST-PENDING`, `STATE-REQUEST-APPROVED`, `STATE-REQUEST-REJECTED`, `STATE-REQUEST-WITHDRAWN` | `RULE-LEAVE-004` | `SCREEN-LEAVE-APPLY`, `SCREEN-LEAVE-DETAIL`, `SCREEN-LEAVE-APPROVAL` | 只表达状态与触发动作 |

## Key Node Lookup

| Node ID | Canonical Name | Alias Keywords | Parent Flow | Type | Notes |
| --- | --- | --- | --- | --- | --- |
| `STEP-LEAVE-010` | 打开申请页 | 进入申请页, 开始填写 | `FLOW-LEAVE-001` | Step | 进入 `SCREEN-LEAVE-APPLY` |
| `DEC-LEAVE-020` | 表单必填与时间合法性判断 | 基础校验, 提交前字段校验 | `FLOW-LEAVE-001` | Decision | 对应 `RULE-LEAVE-001`, `RULE-LEAVE-002`, `RULE-LEAVE-008` |
| `EX-LEAVE-021` | 基础校验失败 | 必填错误, 时间错误 | `FLOW-LEAVE-001` | Exception | 返回申请页继续编辑 |
| `DEC-LEAVE-030` | 余额与冲突校验判断 | 余额判断, 时间冲突判断 | `FLOW-LEAVE-001` | Decision | 对应 `RULE-LEAVE-003`, `RULE-LEAVE-009` |
| `EX-LEAVE-031` | 余额或冲突校验失败 | 余额不足, 时间冲突 | `FLOW-LEAVE-001` | Exception | 返回申请页继续编辑 |
| `STEP-LEAVE-040` | 提交请假申请 | 点击提交, 送审 | `FLOW-LEAVE-001` | Step | 触发 `UC-LEAVE-SUBMIT` |
| `STEP-LEAVE-080` | 进入审批判断 | 打开审批页, 开始审批 | `FLOW-LEAVE-001` | Step | 进入 `SCREEN-LEAVE-APPROVAL` |
| `DEC-LEAVE-090` | 审批结果判断 | 通过还是驳回 | `FLOW-LEAVE-001` | Decision | 分出 approve / reject |
| `STEP-LEAVE-110` | 审批通过后联动 | 审批后副作用, 通过后处理 | `FLOW-LEAVE-001` | Step | 通知、审计、余额落账 |
| `EX-LEAVE-111` | 审批副作用失败 | 通知失败, 落账失败 | `FLOW-LEAVE-001` | Exception | 主交易保留成功并记录补偿 |
