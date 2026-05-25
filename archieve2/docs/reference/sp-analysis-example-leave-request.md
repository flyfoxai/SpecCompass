# `sp.analyze` 输出示例：考勤请假申请

> 这是一个示例成品，用来说明 `sp.analyze` 在文档阶段结束时，`analysis.md` 应该长成什么样。
>
> 这不是当前仓库中的真实 feature 结果，而是一份面向模板设计的参考样例。

# Cross-Document Analysis

## Final Verdict

| Verdict | Allow Auto-Implementation | Reason |
| --- | --- | --- |
| `PASS WITH RISKS` | `Yes, controlled only` | 主链路已经具备 `SCREEN -> UC -> API -> TABLE -> ACC` 回链，但审批副作用和部分验收前置数据仍需补强，不适合低人工介入的一次性自动实现。 |

## Passed Items

- `SCREEN-LEAVE-APPLY`、`SCREEN-LEAVE-APPROVAL`、`UC-LEAVE-SUBMIT`、`API-LEAVE-CREATE`、`TABLE-LEAVE_REQUEST`、`ACC-LEAVE-APPROVE-SUCCESS` 已形成主链路回链
- `delivery/07-api-contracts.md` 已明确关键写接口的方法、路径、字段、错误码和幂等要求
- `delivery/tables/table-leave-request.md` 已明确关键字段、唯一约束、索引、删除策略和审计字段
- `delivery/08-permissions-matrix.md` 已明确 `ROLE-EMPLOYEE` 与 `ROLE-MANAGER` 的页面动作边界
- `tasks.md` 已把主任务绑定到 `SCREEN-* / API-* / TABLE-* / ACC-*`

## Risks

- 审批通过后的通知、余额占用和审计虽已单独成文，但幂等键和补偿顺序还不够硬
- 驳回与撤回链路的验收前置数据不够完整，自动生成测试时容易出现样例漂移
- 半天请假与跨时区日期边界虽然已提到，但字段级存储约束仍需补一轮

## Blockers

- No material blockers

## Summary

该 feature 的文档体系已经足够支撑受控的后续自动开发，尤其适合按模块、按链路逐步推进。

当前不宜直接判为 `PASS`，原因不是主线缺失，而是高风险副作用和验收精度还存在局部缺口。

## Findings

- 主流程文档与关键页面映射一致，未发现明显断链
- 页面与接口之间的动作绑定已建立，但边界场景的反馈状态仍不均匀
- 表规格和接口规格已经能支撑数据库迁移与接口骨架生成
- 权限矩阵已覆盖主角色，但代理审批等扩展场景仍未展开
- 验收文档已覆盖主链路，但异常链路样本不够密

## Impact

- 当前可以进入受控自动开发，但应优先限定在主链路和核心写接口
- 若直接放开审批异常流和撤回流，最可能出现的是副作用漏处理和验收样本不足
- 若先补齐副作用顺序和异常验收项，后续 verdict 可提升到 `PASS`

## Evidence

- `Archieved/project-root/specs/attendance-leave/ui/screen-leave-apply.md`
- `Archieved/project-root/specs/attendance-leave/ui/screen-leave-approval.md`
- `Archieved/project-root/specs/attendance-leave/delivery/07-api-contracts.md`
- `Archieved/project-root/specs/attendance-leave/delivery/08-permissions-matrix.md`
- `Archieved/project-root/specs/attendance-leave/delivery/09-events-and-side-effects.md`
- `Archieved/project-root/specs/attendance-leave/delivery/12-test-and-acceptance.md`
- `Archieved/project-root/specs/attendance-leave/tasks.md`

## Gap Categories

| Gap ID | Category | Severity | Description | Impact Scope | Evidence | Suggested Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| `GAP-SE-001` | `Side-Effect` | `Medium` | 审批通过后通知、余额占用、审计日志已定义触发源，但补偿顺序和幂等键说明仍不完整。 | `API-LEAVE-APPROVE`, `TABLE-LEAVE_APPROVAL`, `ACC-LEAVE-APPROVE-SUCCESS` | `delivery/09-events-and-side-effects.md` | 回退到 `sp.plan`，补齐副作用顺序、幂等键、失败处理和补偿策略。 |
| `GAP-AC-002` | `Acceptance` | `Medium` | 驳回、撤回、跨时区边界的验收前置数据和异常结果不够明确。 | `SCREEN-LEAVE-APPROVAL`, `API-LEAVE-REJECT`, `ACC-*` | `delivery/12-test-and-acceptance.md` | 回退到 `sp.plan` 或 `sp.tasks`，补齐异常链路验收样本和前置数据。 |
| `GAP-DA-003` | `Data` | `Low` | 半天请假和跨时区日期边界已被提及，但开始时间、结束时间、时区字段映射仍可再精确。 | `TABLE-LEAVE_REQUEST`, `API-LEAVE-CREATE` | `delivery/tables/table-leave-request.md`, `delivery/07-api-contracts.md` | 回退到 `sp.plan`，补充字段格式、时区约束和状态映射。 |

## Medium-Project Smoke Test

### Scope

- 审核考勤请假模块是否具备中型项目自动开发的最小稳定性
- 覆盖申请、审批、详情、列表、通知、余额、审计七个关键子域

### Sampling Summary

| Domain | Total | Sampled | Critical Included | Result |
| --- | --- | --- | --- | --- |
| `flows` | `18` | `11` | `Yes` | `Pass` |
| `screens` | `22` | `12` | `Yes` | `Pass With Risks` |
| `apis` | `16` | `9` | `Yes` | `Pass` |
| `tables` | `14` | `8` | `Yes` | `Pass With Risks` |
| `acceptance` | `24` | `12` | `Yes` | `Pass With Risks` |

### Findings

- 主链路样本覆盖完整，关键入口页、审批页、详情页、写接口和核心表均已纳入
- 抽样中未发现 `High` 级断链
- 风险主要集中在异常链路验收密度和副作用补偿规则
- 当前结构已经满足“分模块、分链路推进”的文档要求

### Verdict Impact

- 这轮冒烟支持 `PASS WITH RISKS`
- 若抽样中发现 `SCREEN -> UC -> API -> TABLE` 任一处断链，当前 verdict 应降为 `BLOCKED`
- 若补齐 `GAP-SE-001` 与 `GAP-AC-002`，当前 verdict 可复核提升为 `PASS`

## Suggested Rollback Step

1. 先回到 `sp.plan`，补齐副作用顺序、幂等键、失败处理和异常验收样本。
2. 再回到 `sp.tasks`，把补强项绑定到 `API-LEAVE-APPROVE`、`TABLE-LEAVE_REQUEST` 和相关 `ACC-*`。
3. 完成后重新执行 `sp.analyze`。

## Auto-Development Minimum Check

- `SCREEN-*`、`UC-*`、`API-*`、`TABLE-*`、`ACC-*` 已建立主链路回链
- UI、API、Data、Permission、Side-Effect、Acceptance 六类精度均已有文档落位
- 当前仍有 `Medium` 级缺口，因此仅满足“受控自动开发最低标准”

## End-Of-Stage Decision

- 文档阶段可以结束
- 后续只建议进入受控、分模块的自动开发
- 不建议直接进入低人工介入的一次性全量自动实现
