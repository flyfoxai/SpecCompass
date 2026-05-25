# SCREEN-LEAVE-APPLY

## Screen Metadata

| Key | Value |
| --- | --- |
| Screen ID | `SCREEN-LEAVE-APPLY` |
| Canonical Name | 请假申请页 |
| Alias Keywords | 我要请假页, 请假填写页, 申请页 |
| Module | `MODULE-LEAVE-REQUEST` |
| Linked Flows | `FLOW-LEAVE-001`, `FLOW-LEAVE-STATE-001` |
| Owner ID | `STAGE-LEAVE-01` |

## Page Goal

员工创建、保存和提交请假申请。

## Roles

- `ROLE-EMPLOYEE`

## Entry Condition

- 员工拥有请假入口权限
- 已完成登录
- 当前申请处于新建或草稿态

## Leave Condition

- 执行 `ACTION-LEAVE-APPLY-010` 后停留当前页并保留 `STATE-REQUEST-DRAFT`
- 执行 `ACTION-LEAVE-APPLY-020` 成功后跳转 `SCREEN-LEAVE-DETAIL`
- 无权限或数据异常时退出到上级菜单或错误页

## Page States

| State | Meaning |
| --- | --- |
| 初始态 | 显示空表单或最近一次草稿 |
| 加载态 | 读取假种、余额与冲突信息 |
| 空态 | 无草稿时显示默认空表单 |
| 错误态 | 假种或余额获取失败 |
| 无权限态 | 入口被禁用或返回权限不足 |

## Section Catalog

| Section ID | Canonical Name | Alias Keywords | Owner ID | Goal |
| --- | --- | --- | --- | --- |
| `SECTION-LEAVE-APPLY-010` | 申请基础信息区 | 基础信息区, 时间区, 假种区 | `SCREEN-LEAVE-APPLY` | 收集假种、时间与时长基础数据 |
| `SECTION-LEAVE-APPLY-020` | 原因说明区 | 原因区, 备注区, 请假原因区 | `SCREEN-LEAVE-APPLY` | 收集请假原因说明 |
| `SECTION-LEAVE-APPLY-030` | 规则提示区 | 提示区, 余额区, 冲突提示区 | `SCREEN-LEAVE-APPLY` | 展示余额、半天限制、冲突提示 |
| `SECTION-LEAVE-APPLY-040` | 操作区 | 按钮区, 提交区, 保存区 | `SCREEN-LEAVE-APPLY` | 承载保存和提交动作 |

## Field Catalog

| Field ID | Canonical Name | Alias Keywords | Owner ID | Data Binding | Visibility And Editability |
| --- | --- | --- | --- | --- | --- |
| `FIELD-LEAVE-APPLY-010` | 请假类型字段 | 假种字段, leaveType, 类型下拉 | `SECTION-LEAVE-APPLY-010` | `leaveType` | 草稿态可编辑；决定余额提示是否显示 |
| `FIELD-LEAVE-APPLY-020` | 开始时间字段 | 开始日期字段, startAt, 起始时间 | `SECTION-LEAVE-APPLY-010` | `startAt` | 草稿态可编辑；参与时间合法性校验 |
| `FIELD-LEAVE-APPLY-030` | 结束时间字段 | 结束日期字段, endAt, 截止时间 | `SECTION-LEAVE-APPLY-010` | `endAt` | 草稿态可编辑；参与时间合法性校验 |
| `FIELD-LEAVE-APPLY-040` | 半天开关字段 | 半天字段, halfDay, 上午下午开关 | `SECTION-LEAVE-APPLY-010` | `halfDay` | 仅单日申请时显示；草稿态可编辑 |
| `FIELD-LEAVE-APPLY-050` | 请假原因字段 | 原因文本框, reason, 说明输入框 | `SECTION-LEAVE-APPLY-020` | `reason` | 草稿态可编辑；提交前必填 |
| `FIELD-LEAVE-APPLY-060` | 可用余额提示字段 | 余额提示, 年假余额, 剩余额度 | `SECTION-LEAVE-APPLY-030` | derived from leave balance | 只读；仅 `leaveType = annual` 时显示 |
| `FIELD-LEAVE-APPLY-070` | 冲突提示字段 | 冲突提示, 时间冲突提示, 重叠提示 | `SECTION-LEAVE-APPLY-030` | derived from conflict check | 只读；发现冲突时显示 |

## Action Catalog

| Action ID | Canonical Name | Alias Keywords | Owner ID | Use Case | API | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `ACTION-LEAVE-APPLY-010` | 保存草稿动作 | 保存按钮, 暂存动作, 草稿保存 | `SECTION-LEAVE-APPLY-040` | `UC-LEAVE-SAVE-DRAFT` | `API-LEAVE-DRAFT-SAVE` | 保存 `STATE-REQUEST-DRAFT` |
| `ACTION-LEAVE-APPLY-020` | 提交申请动作 | 提交按钮, 送审按钮, 发起申请 | `SECTION-LEAVE-APPLY-040` | `UC-LEAVE-SUBMIT` | `API-LEAVE-CREATE` | 创建 `STATE-REQUEST-PENDING` |

## Interface Bindings

- `ACTION-LEAVE-APPLY-010` 绑定 `API-LEAVE-DRAFT-SAVE`
- `ACTION-LEAVE-APPLY-020` 绑定 `API-LEAVE-CREATE`
- `FIELD-LEAVE-APPLY-010` 到 `FIELD-LEAVE-APPLY-050` 对应 `ui/jsonforms/schema.json`

## Business Rules

- `RULE-LEAVE-001`：`FIELD-LEAVE-APPLY-010`、`FIELD-LEAVE-APPLY-020`、`FIELD-LEAVE-APPLY-030`、`FIELD-LEAVE-APPLY-050` 必填
- `RULE-LEAVE-002`：`FIELD-LEAVE-APPLY-020` 必须早于 `FIELD-LEAVE-APPLY-030`
- `RULE-LEAVE-003`：`FIELD-LEAVE-APPLY-060` 显示的年假余额必须足够
- `RULE-LEAVE-008`：`FIELD-LEAVE-APPLY-040` 仅允许单日申请启用
- `RULE-LEAVE-009`：`FIELD-LEAVE-APPLY-070` 指示的时间冲突不得被忽略

## Exceptions And Feedback

- `EX-LEAVE-021`：基础校验失败时停留当前页，并高亮 `FIELD-LEAVE-APPLY-010` 到 `FIELD-LEAVE-APPLY-050` 的问题字段
- `EX-LEAVE-031`：余额不足或时间冲突时，在 `SECTION-LEAVE-APPLY-030` 展示可操作提示
- `ACTION-LEAVE-APPLY-010` 成功后提示“草稿已保存”
- `ACTION-LEAVE-APPLY-020` 成功后跳转 `SCREEN-LEAVE-DETAIL`
