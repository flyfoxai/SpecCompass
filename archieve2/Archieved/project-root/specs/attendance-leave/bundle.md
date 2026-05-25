# Business Bundle

## Feature Summary

本 feature 建立员工请假申请到主管审批完成的业务主线，并将后续交付需要的页面、规则、状态、异常和开放问题整理为可交接的业务包。

## Business Framework Snapshot

### Mainline Stages

1. 员工准备申请
2. 员工提交并进入待审批
3. 主管审批或驳回
4. 系统执行结果联动
5. 相关角色查看结果与轨迹

### Stage Boundaries

- 申请与提交阶段由 `ROLE-EMPLOYEE` 主导
- 审批决策阶段由 `ROLE-MANAGER` 主导
- 联动处理阶段由 `ROLE-SYSTEM` 主导
- 全局查看和例外处理由 `ROLE-HR` 补充，但不替代主管正常审批

### Object Backbone

- `OBJ-LEAVE-REQUEST` 是贯穿主线的核心对象
- `OBJ-LEAVE-APPROVAL` 承载主管决策记录
- `OBJ-LEAVE-BALANCE` 承载额度判断与结果联动
- `OBJ-NOTIFICATION` 承载待办与结果通知

### Top-Level Decision Points

- 提交前资料是否完整且时间合法
- 余额与时间冲突是否允许提交
- 审批人是否具备处理范围
- 审批结果是否触发补偿链路

### In-Scope And Deferred Boundaries

- 当前纳入：申请、提交、列表、详情、撤回、主管审批、通知
- 当前延期：代理审批、多级会签、附件上传、排班联动、薪资联动

## Query Entry Points

| User Phrase | Target ID | Main Doc | Expand Doc |
| --- | --- | --- | --- |
| 申请页提交按钮 | `ACTION-LEAVE-APPLY-020` | `ui/screen-leave-apply.md` | `memory/trace-index.md` |
| 申请页保存草稿按钮 | `ACTION-LEAVE-APPLY-010` | `ui/screen-leave-apply.md` | `memory/stable-context.md` |
| 列表页筛选区 | `SECTION-LEAVE-LIST-010` | `ui/screen-leave-list.md` | `ui/index.md` |
| 列表页结果区 | `SECTION-LEAVE-LIST-020` | `ui/screen-leave-list.md` | `memory/trace-index.md` |
| 详情页撤回按钮 | `ACTION-LEAVE-DETAIL-010` | `ui/screen-leave-detail.md` | `memory/trace-index.md` |
| 审批页通过按钮 | `ACTION-LEAVE-APPROVAL-010` | `ui/screen-leave-approval.md` | `memory/trace-index.md` |
| 审批页驳回原因框 | `FIELD-LEAVE-APPROVAL-010` | `ui/screen-leave-approval.md` | `memory/stable-context.md` |
| 提交请假申请步骤 | `STEP-LEAVE-040` | `flows/index.md` | `flows/sequence.mmd` |
| 审批结果判断点 | `DEC-LEAVE-090` | `flows/index.md` | `flows/state.mmd` |
| 审批副作用失败异常 | `EX-LEAVE-111` | `flows/index.md` | `flows/main-flow.mmd` |

## Stable Items

- 角色边界已固定为 `ROLE-EMPLOYEE`、`ROLE-MANAGER`、`ROLE-HR`、`ROLE-SYSTEM`
- 主链路固定为申请、提交、审批、通知
- 关键规则已固定到 `RULE-LEAVE-001` 至 `RULE-LEAVE-010`
- 关键页面已固定到 `SCREEN-LEAVE-APPLY`、`SCREEN-LEAVE-LIST`、`SCREEN-LEAVE-DETAIL`、`SCREEN-LEAVE-APPROVAL`

## Risks

- 审批通过后的副作用顺序和幂等策略还未完全硬化
- 跨时区和半天请假的数据精度仍需在第二层再细化
- 代理审批不纳入当前版本，后续扩展时需单独成文

## Open Questions

- 通知失败是同步暴露还是后台补偿
- 余额预占是在审批通过时还是提交时发生

## Handoff To Layer 2

- 第二层需要把 `SCREEN -> UC -> API -> TABLE -> ACC` 链路显式建立
- 第二层需要单独写权限矩阵、副作用、逐表规格、验收入口
- 第二层不得重写业务主线，只能细化成交付对象
