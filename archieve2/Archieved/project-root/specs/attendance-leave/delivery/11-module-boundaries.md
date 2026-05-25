# Module Boundaries

| Module ID | Module | Responsibility | Includes |
| --- | --- | --- | --- |
| `MOD-LEAVE-UI` | 请假前台模块 | 页面展示、表单校验、状态反馈 | `SCREEN-LEAVE-*` |
| `MOD-LEAVE-API` | 请假应用服务模块 | 请求校验、状态迁移、权限校验 | `API-LEAVE-*` |
| `MOD-LEAVE-DATA` | 请假数据模块 | 表读写、索引、状态映射 | `TABLE-LEAVE_*` |
| `MOD-LEAVE-EVENT` | 请假事件模块 | 通知、余额流水、审计 | `EVT-LEAVE-*` |

## Boundary Rules

- UI 只负责页面状态与输入校验，不持久化业务状态
- API 模块负责业务规则落地与权限校验
- Event 模块不反向修改 UI 行为，只消费审批结果
