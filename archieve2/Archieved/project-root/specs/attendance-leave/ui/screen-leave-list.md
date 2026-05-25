# SCREEN-LEAVE-LIST

## Screen Metadata

| Key | Value |
| --- | --- |
| Screen ID | `SCREEN-LEAVE-LIST` |
| Canonical Name | 请假记录页 |
| Alias Keywords | 请假列表页, 记录页, 查询页 |
| Module | `MODULE-LEAVE-REQUEST` |
| Linked Flows | `FLOW-LEAVE-001`, `FLOW-LEAVE-STATE-001` |
| Owner ID | `STAGE-LEAVE-05` |

## Page Goal

查看本人或授权范围内的请假记录，并进入详情。

## Roles

- `ROLE-EMPLOYEE`
- `ROLE-HR`

## Entry Condition

- 从“请假记录”菜单进入
- 角色具备记录查看权限

## Leave Condition

- 执行 `ACTION-LEAVE-LIST-020` 后跳转 `SCREEN-LEAVE-DETAIL`
- 执行 `ACTION-LEAVE-LIST-030` 后跳转 `SCREEN-LEAVE-APPLY`

## Page States

| State | Meaning |
| --- | --- |
| 初始态 | 显示最近申请记录 |
| 加载态 | 查询中 |
| 空态 | 暂无记录 |
| 错误态 | 查询失败 |
| 无权限态 | 当前角色无查看权限 |

## Section Catalog

| Section ID | Canonical Name | Alias Keywords | Owner ID | Goal |
| --- | --- | --- | --- | --- |
| `SECTION-LEAVE-LIST-010` | 记录筛选区 | 筛选区, 查询条件区, 顶部过滤区 | `SCREEN-LEAVE-LIST` | 提供状态、假种、时间范围筛选 |
| `SECTION-LEAVE-LIST-020` | 记录列表区 | 列表区, 表格区, 结果区 | `SCREEN-LEAVE-LIST` | 展示申请记录分页结果 |
| `SECTION-LEAVE-LIST-030` | 列表操作区 | 行操作区, 详情入口区, 二次发起区 | `SCREEN-LEAVE-LIST` | 承载详情查看和重新申请入口 |

## Field Catalog

| Field ID | Canonical Name | Alias Keywords | Owner ID | Data Binding | Visibility And Editability |
| --- | --- | --- | --- | --- | --- |
| `FIELD-LEAVE-LIST-010` | 状态筛选字段 | 状态过滤, statusFilter, 状态下拉 | `SECTION-LEAVE-LIST-010` | query.status | 仅查询条件可编辑 |
| `FIELD-LEAVE-LIST-020` | 假种筛选字段 | 假种过滤, leaveTypeFilter, 类型筛选 | `SECTION-LEAVE-LIST-010` | query.leaveType | 仅查询条件可编辑 |
| `FIELD-LEAVE-LIST-030` | 时间范围筛选字段 | 时间过滤, dateRangeFilter, 日期范围 | `SECTION-LEAVE-LIST-010` | query.dateRange | 仅查询条件可编辑 |
| `FIELD-LEAVE-LIST-040` | 记录摘要列 | 列表行摘要, 申请编号列, 结果行 | `SECTION-LEAVE-LIST-020` | list rows | 只读；根据角色控制可见范围 |

## Action Catalog

| Action ID | Canonical Name | Alias Keywords | Owner ID | Use Case | API | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `ACTION-LEAVE-LIST-010` | 查询记录动作 | 查询按钮, 筛选按钮, 刷新列表 | `SECTION-LEAVE-LIST-010` | `UC-LEAVE-LIST-QUERY` | `API-LEAVE-LIST` | 返回分页列表 |
| `ACTION-LEAVE-LIST-020` | 查看详情动作 | 详情按钮, 打开详情, 查看申请 | `SECTION-LEAVE-LIST-030` | `UC-LEAVE-DETAIL-VIEW` | `API-LEAVE-DETAIL` | 跳转 `SCREEN-LEAVE-DETAIL` |
| `ACTION-LEAVE-LIST-030` | 重新申请动作 | 再次申请, 新建申请, 去申请页 | `SECTION-LEAVE-LIST-030` | none | none | 跳转 `SCREEN-LEAVE-APPLY` |

## Interface Bindings

- `ACTION-LEAVE-LIST-010` 绑定 `API-LEAVE-LIST`
- `ACTION-LEAVE-LIST-020` 进入详情前读取 `API-LEAVE-DETAIL`

## Business Rules

- `ROLE-EMPLOYEE` 仅查看本人记录
- `ROLE-HR` 可查看全局记录，但默认按组织筛选
- 列表页所有结果字段只读，不允许直接编辑记录

## Exceptions And Feedback

- 查询失败时在 `SECTION-LEAVE-LIST-020` 给出重试提示
- 无记录时保留 `ACTION-LEAVE-LIST-030` 作为新申请入口
