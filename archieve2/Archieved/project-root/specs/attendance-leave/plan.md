# Delivery Plan

## Scope

本阶段把请假申请业务包转换成第二层交付设计文档，覆盖申请、列表、详情、审批、余额、副作用和验收入口。

## Phases

1. 固化页面到用例映射
2. 固化接口、数据对象和逐表规格
3. 固化权限矩阵、副作用和非功能约束
4. 固化验收入口和任务拆解

## Key Trace Chain

- `SCREEN-LEAVE-APPLY -> UC-LEAVE-SUBMIT -> API-LEAVE-CREATE -> TABLE-LEAVE_REQUEST -> ACC-LEAVE-SUBMIT-SUCCESS`
- `SCREEN-LEAVE-APPROVAL -> UC-LEAVE-APPROVE -> API-LEAVE-APPROVE -> TABLE-LEAVE_APPROVAL -> ACC-LEAVE-APPROVE-SUCCESS`
- `SCREEN-LEAVE-DETAIL -> UC-LEAVE-WITHDRAW -> API-LEAVE-WITHDRAW -> TABLE-LEAVE_REQUEST -> ACC-LEAVE-WITHDRAW-SUCCESS`

## Delivery Objects

- 页面映射：`delivery/02-screen-to-delivery-map.md`
- 用例矩阵：`delivery/03-use-case-matrix.md`
- 数据对象：`delivery/05-data-entity-catalog.md`
- 表规格：`delivery/06-table-index.md` 与 `delivery/tables/*`
- 接口契约：`delivery/07-api-contracts.md`
- 权限矩阵：`delivery/08-permissions-matrix.md`
- 副作用：`delivery/09-events-and-side-effects.md`
- 验收：`delivery/12-test-and-acceptance.md`

## Workset Strategy

- `WS-LEAVE-EMPLOYEE-SUBMIT`：聚焦申请页、草稿、提交与主单字段
- `WS-LEAVE-MANAGER-APPROVAL`：聚焦审批页、通过、驳回与审批记录
- `WS-LEAVE-QUERY-WITHDRAW`：聚焦列表、详情、撤回与查询权限
- `WS-LEAVE-SIDE-EFFECTS`：聚焦审批后副作用、余额流水、通知与补偿

## Memory Entry

- 默认阅读入口：`memory/index.md`
- 稳定背景：`memory/stable-context.md`
- 关键追踪链：`memory/trace-index.md`
- 局部工作面：`memory/worksets/index.md`

## Risks Carried Forward

- `RISK-PLAN-001`：审批通过副作用顺序与补偿仍需细化
- `RISK-PLAN-002`：跨时区字段约束需要落到 API 与表规格

## Auto-Development Readiness

当前计划已具备继续细化为自动开发输入的结构，但最终是否通过要以 `analysis.md` 为准。
