# Cross-Document Analysis

## Final Verdict

| Verdict | Allow Auto-Implementation | Reason |
| --- | --- | --- |
| `PASS WITH RISKS` | `Yes, controlled only` | 主链路已经具备 `SCREEN -> UC -> API -> TABLE -> ACC` 回链，但审批副作用补偿顺序与跨时区字段精度仍需补强，不适合低人工介入的一次性自动实现。 |

## Passed Items

- `SCREEN-LEAVE-APPLY`、`UC-LEAVE-SUBMIT`、`API-LEAVE-CREATE`、`TABLE-LEAVE_REQUEST`、`ACC-LEAVE-SUBMIT-SUCCESS` 已形成完整主链路
- `delivery/07-api-contracts.md` 已明确关键写接口的方法、路径、请求字段、错误码和幂等要求
- `delivery/tables/table-leave-request.md` 已明确关键字段、唯一约束、索引、删除策略和审计字段
- `delivery/08-permissions-matrix.md` 已明确 `ROLE-EMPLOYEE` 与 `ROLE-MANAGER` 的页面和动作边界
- `tasks.md` 已把主任务绑定到 `SCREEN-* / API-* / TABLE-* / ACC-*`
- `memory/index.md`、`stable-context.md`、`open-items.md`、`trace-index.md` 已建立默认阅读入口和压缩上下文
- `memory/worksets/*` 已将 feature 拆成四个局部工作面

## Risks

- 审批通过后的通知、余额预占和审计虽已单独成文，但补偿顺序还不够硬
- 跨时区日期边界已被记录，但存储和响应字段的统一约束仍可再补一轮
- 驳回与撤回的验收前置数据仍偏简化

## Blockers

- No material blockers

## Summary

该样例已经足够展示文档阶段从第一层到第二层的完整链路，也足够支撑受控自动开发的前置输入。

当前不宜直接判为 `PASS`，原因不是主线缺失，而是高风险副作用和边界精度仍存在局部缺口。

## Findings

- 页面、用例、接口和表之间已建立显式追踪链
- 第一层开放问题没有被伪装成稳定结论
- 第二层已经把权限、副作用、验收、逐表规格单独成文
- 异常链路和扩展场景仍留有进一步细化空间

## Impact

- 当前可以作为仓库内完整样例，也可以作为受控自动开发输入
- 若直接放开审批异常流和跨时区边界实现，最可能出现副作用漏处理和字段解释漂移
- 先补副作用顺序和时区字段定义后，verdict 可复核提升为 `PASS`

## Evidence

- `specs/attendance-leave/ui/screen-leave-apply.md`
- `specs/attendance-leave/ui/screen-leave-approval.md`
- `specs/attendance-leave/delivery/07-api-contracts.md`
- `specs/attendance-leave/delivery/08-permissions-matrix.md`
- `specs/attendance-leave/delivery/09-events-and-side-effects.md`
- `specs/attendance-leave/delivery/12-test-and-acceptance.md`
- `specs/attendance-leave/tasks.md`

## Gap Categories

| Gap ID | Category | Severity | Description | Impact Scope | Evidence | Suggested Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| `GAP-SE-001` | `Side-Effect` | `Medium` | 审批通过后通知、余额预占、审计日志已定义触发源，但补偿顺序说明仍不完整。 | `API-LEAVE-APPROVE`, `TABLE-LEAVE_APPROVAL`, `ACC-LEAVE-APPROVE-SUCCESS` | `delivery/09-events-and-side-effects.md` | 回退到 `sp.plan`，补齐副作用顺序、失败处理和补偿策略。 |
| `GAP-DA-002` | `Data` | `Low` | 跨时区日期边界已被提及，但开始时间、结束时间、时区字段映射仍可再精确。 | `TABLE-LEAVE_REQUEST`, `API-LEAVE-CREATE` | `delivery/tables/table-leave-request.md`, `delivery/07-api-contracts.md` | 回退到 `sp.plan`，补充字段格式、时区约束和状态映射。 |
| `GAP-AC-003` | `Acceptance` | `Medium` | 驳回和撤回链路的验收前置数据仍偏简化。 | `SCREEN-LEAVE-APPROVAL`, `API-LEAVE-REJECT`, `ACC-*` | `delivery/12-test-and-acceptance.md` | 回退到 `sp.tasks`，补齐异常链路验收样本和前置数据。 |

## Medium-Project Smoke Test

### Scope

- 审核考勤请假模块是否具备中型项目自动开发的最小稳定性
- 覆盖申请、审批、详情、列表、通知、余额、审计七个关键子域

### Sampling Summary

| Domain | Total | Sampled | Critical Included | Result |
| --- | --- | --- | --- | --- |
| `flows` | `8` | `3` | `Yes` | `Pass` |
| `screens` | `4` | `4` | `Yes` | `Pass With Risks` |
| `apis` | `6` | `4` | `Yes` | `Pass` |
| `tables` | `3` | `3` | `Yes` | `Pass With Risks` |
| `acceptance` | `4` | `4` | `Yes` | `Pass With Risks` |

### Findings

- 主链路样本覆盖完整，关键入口页、审批页、写接口和核心表均已纳入
- 抽样中未发现 `High` 级断链
- 风险主要集中在副作用补偿规则和异常验收密度

### Verdict Impact

- 这轮冒烟支持 `PASS WITH RISKS`
- 若补齐 `GAP-SE-001` 与 `GAP-AC-003`，当前 verdict 可复核提升为 `PASS`

## Suggested Rollback Step

1. 先回到 `sp.plan`，补齐副作用顺序、时区字段定义和失败处理。
2. 再回到 `sp.tasks`，把补强项绑定到 `API-LEAVE-APPROVE`、`TABLE-LEAVE_REQUEST` 和相关 `ACC-*`。
3. 完成后重新执行 `sp.analyze`。

## Auto-Development Minimum Check

- `SCREEN-*`、`UC-*`、`API-*`、`TABLE-*`、`ACC-*` 已建立主链路回链
- UI、API、Data、Permission、Side-Effect、Acceptance 六类精度均已有文档落位
- 当前仍有 `Medium` 级缺口，因此仅满足“受控自动开发最低标准”

## Memory Freshness Check

- `memory/index.md` 与当前 `gate.md`、`analysis.md` 结论一致
- `memory/stable-context.md` 与 `bundle.md` 的主线、角色边界和对象骨架一致
- `memory/open-items.md` 已同步第一层开放问题与 `analysis.md` 风险项
- `memory/trace-index.md` 已覆盖主 submit、approve、reject、withdraw、query 链路
- 当前未发现 memory 与正文冲突，但若后续补强副作用或时区字段，必须同步刷新 `open-items.md`、`trace-index.md` 和相关 workset

## Workset Validity Check

- `WS-LEAVE-EMPLOYEE-SUBMIT`、`WS-LEAVE-MANAGER-APPROVAL`、`WS-LEAVE-QUERY-WITHDRAW`、`WS-LEAVE-SIDE-EFFECTS` 切分边界清晰
- 每个高价值任务都能映射到至少一个主要 workset
- `WS-LEAVE-SIDE-EFFECTS` 已单独隔离最高风险区域，适合作为后续重点补强入口
- 当前未发现“全 feature 塞入单一 workset”的过粗切法
- 若后续增加代理审批或多级会签，应新增 workset，而不是继续塞进现有审批 workset

## End-Of-Stage Decision

- 文档阶段可以结束
- 后续只建议进入受控、分模块的自动开发
- 不建议直接进入低人工介入的一次性全量自动实现
