# Clarifications

## Roles

| ID | Role | Responsibility | Restriction |
| --- | --- | --- | --- |
| `ROLE-EMPLOYEE` | 员工 | 创建、保存、提交、查看、撤回自己的请假申请 | 只能操作本人数据 |
| `ROLE-MANAGER` | 直属主管 | 审批、驳回本部门员工待审申请 | 不能审批自己发起的申请 |
| `ROLE-HR` | 人事 | 查看全局记录、处理余额修正、配置假种规则 | 不能越过审批链直接通过申请 |
| `ROLE-SYSTEM` | 系统任务 | 预占余额、发送通知、记录审计日志 | 只能由事件触发 |

## Business Objects

| ID | Object | Description | Key Fields |
| --- | --- | --- | --- |
| `OBJ-LEAVE-REQUEST` | 请假申请单 | 员工发起的请假业务对象 | `requestId`, `leaveType`, `startAt`, `endAt`, `reason`, `status` |
| `OBJ-LEAVE-APPROVAL` | 审批记录 | 主管对申请执行的审批动作 | `approvalId`, `requestId`, `decision`, `comment`, `actedAt` |
| `OBJ-LEAVE-BALANCE` | 假期余额 | 员工在假种维度下的可用额度 | `employeeId`, `leaveType`, `availableHours`, `reservedHours` |
| `OBJ-NOTIFICATION` | 通知记录 | 审批结果与待办消息 | `notificationId`, `receiverId`, `templateCode`, `status` |

## Business Framework

### Mainline Stages

1. 员工创建或编辑请假申请
2. 员工提交申请并进入待审批
3. 主管基于规则执行审批或驳回
4. 系统根据审批结果执行余额、通知、审计等联动
5. 员工与相关角色查看最终结果和轨迹

### Stage Responsibility Boundaries

| Stage | Owner | Participants | Boundary |
| --- | --- | --- | --- |
| 申请准备 | `ROLE-EMPLOYEE` | `ROLE-SYSTEM` | 只允许处理本人申请，不进入审批判断 |
| 提交校验 | `ROLE-EMPLOYEE` | `ROLE-SYSTEM` | 只校验提交资格、时间冲突和余额前提 |
| 审批决策 | `ROLE-MANAGER` | `ROLE-SYSTEM` | 主管只处理本管理范围内的待审批申请 |
| 结果联动 | `ROLE-SYSTEM` | `ROLE-MANAGER`, `ROLE-EMPLOYEE` | 系统负责通知、审计和余额落账，不改变审批责任归属 |
| 结果查看 | `ROLE-EMPLOYEE`, `ROLE-MANAGER`, `ROLE-HR` | `ROLE-SYSTEM` | 不重新触发审批主线，只提供查询、撤回或审计查看 |

### Object Flow Backbone

- `OBJ-LEAVE-REQUEST` 是主对象，沿 `DRAFT -> PENDING -> APPROVED / REJECTED / WITHDRAWN` 流转
- `OBJ-LEAVE-APPROVAL` 只在主管执行审批动作时产生
- `OBJ-LEAVE-BALANCE` 在提交资格判断和审批通过后联动
- `OBJ-NOTIFICATION` 在待审批生成、审批通过、审批驳回等节点触发

### Top-Level Decision Points

- 是否满足提交前必填与时间合法性
- 是否满足余额与时间冲突校验
- 当前申请是否处于允许撤回或审批的状态
- 当前操作人是否具备对应范围内的审批权限
- 审批结果是通过还是驳回，以及是否需要补偿处理

### Capability Boundaries

- 当前纳入：申请、提交、列表、详情、撤回、单级主管审批、结果通知
- 当前延期：代理审批、多级会签、附件上传、排班联动、薪资联动

## Rules

| ID | Rule | Scope | Priority | Notes |
| --- | --- | --- | --- | --- |
| `RULE-LEAVE-001` | 员工提交前必须选择假种、开始时间、结束时间、请假原因。 | 申请页 | High | 缺一项不得提交 |
| `RULE-LEAVE-002` | 开始时间必须早于结束时间。 | 申请页、接口 | High | 同日半天场景除外 |
| `RULE-LEAVE-003` | `leaveType = annual` 时，提交前可用余额必须足够。 | 提交、审批 | High | 余额不足直接阻止 |
| `RULE-LEAVE-004` | 草稿状态允许编辑与删除；待审批状态允许撤回；已通过和已驳回状态只读。 | 页面、接口 | High | 角色边界固定 |
| `RULE-LEAVE-005` | 主管只能处理自己管理范围内的待审批申请。 | 审批页、接口 | High | 需要组织范围校验 |
| `RULE-LEAVE-006` | 审批通过后必须生成审批记录、更新申请状态、写入余额预占和通知事件。 | 审批接口 | High | 属于关键副作用 |
| `RULE-LEAVE-007` | 驳回必须填写驳回原因。 | 审批页、接口 | High | 原因长度最少 5 字 |
| `RULE-LEAVE-008` | 半天请假只允许单日申请。 | 申请页、接口 | Medium | 当前不支持跨天半天 |
| `RULE-LEAVE-009` | 同一员工在时间区间重叠的已提交申请不得重复提交。 | 接口、数据层 | High | 需要冲突校验 |
| `RULE-LEAVE-010` | HR 可查看所有申请，但不能替主管执行正常审批。 | 详情页、权限矩阵 | Medium | 例外流程另行处理 |

## Defaults And Overrides

- `STATE-REQUEST-DRAFT` 为新建默认状态
- 默认审批人为员工直属主管
- 余额计算默认以小时为单位
- 若假种要求附件但当前 feature 未纳入附件上传，则在申请页显式提示“当前版本不支持”

## Branches And Exceptions

### Branches

- `FLOW-BR-001`：员工保存草稿，不立即提交
- `FLOW-BR-002`：员工在主管审批前主动撤回
- `FLOW-BR-003`：主管驳回后员工重新发起新申请

### Exceptions

- `EX-LEAVE-001`：余额不足，阻止提交并提示剩余额度
- `EX-LEAVE-002`：审批对象不在主管范围内，返回无权限
- `EX-LEAVE-003`：申请时间区间冲突，阻止提交
- `EX-LEAVE-004`：审批副作用执行失败，主交易保留成功状态并记录待补偿事件

## Boundary Conditions

- 最小申请时长为 `0.5` 天
- 半天申请必须同日开始和结束
- 跨天申请必须提供完整起止时间
- 原因长度上限 `500` 字
- 已撤回申请不可再次提交，只能复制重建
- 跨时区申请当前按申请人所在组织时区展示，但存储精度仍需在第二层补硬

## States

| ID | Meaning |
| --- | --- |
| `STATE-REQUEST-DRAFT` | 草稿 |
| `STATE-REQUEST-PENDING` | 待审批 |
| `STATE-REQUEST-APPROVED` | 已通过 |
| `STATE-REQUEST-REJECTED` | 已驳回 |
| `STATE-REQUEST-WITHDRAWN` | 已撤回 |

## Open Questions

- 代理主管是否沿用同一审批页，还是独立代理审批页
- 通知失败是否允许页面立即提示，还是只进入后台补偿
- 余额预占是在提交时发生还是审批通过时发生，当前按审批通过时发生

## Acceptance Examples

### ACC-LEAVE-SUBMIT-SUCCESS

- Given：员工余额充足，开始时间早于结束时间
- When：员工在申请页提交年假申请
- Then：系统创建 `STATE-REQUEST-PENDING` 的申请单，并生成待审批待办

### ACC-LEAVE-REJECT-REASON

- Given：主管打开待审批申请
- When：主管点击驳回但未填写驳回原因
- Then：页面阻止提交并提示必须填写驳回原因

### ACC-LEAVE-WITHDRAW-SUCCESS

- Given：员工存在一条 `STATE-REQUEST-PENDING` 的本人申请
- When：员工在详情页执行撤回
- Then：申请状态更新为 `STATE-REQUEST-WITHDRAWN`，列表与详情同步刷新
