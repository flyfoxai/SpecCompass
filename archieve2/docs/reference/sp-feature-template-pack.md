# `sp` Feature 模板包设计

> 目标：定义 `specs/<feature>/` 下各文档与展示文件的标准模板，作为后续 fork 原版 `Spec Kit` 时的模板层输入。

## 1. 总体目录

推荐 future feature 继续沿用：

```text
specs/<feature>/
├── spec.md
├── clarifications.md
├── clarify-log.md
├── gate.md
├── bundle.md
├── plan.md
├── tasks.md
├── analysis.md
├── memory/
│   ├── index.md
│   ├── stable-context.md
│   ├── open-items.md
│   ├── trace-index.md
│   └── worksets/
│       ├── index.md
│       └── ws-*.md
├── flows/
│   ├── index.md
│   ├── main-flow.mmd
│   ├── sequence.mmd
│   └── state.mmd
├── ui/
│   ├── index.md
│   ├── screen-map.md
│   ├── screen-*.md
│   └── jsonforms/
│       ├── schema.json
│       ├── uischema.json
│       └── data.example.json
└── delivery/
    ├── 01-prd.md
    ├── 02-screen-to-delivery-map.md
    ├── 03-use-case-matrix.md
    ├── 04-domain-model.md
    ├── 05-data-entity-catalog.md
    ├── 06-table-index.md
    ├── 07-api-contracts.md
    ├── 08-permissions-matrix.md
    ├── 09-events-and-side-effects.md
    ├── 10-non-functional-requirements.md
    ├── 11-module-boundaries.md
    ├── 12-test-and-acceptance.md
    └── tables/
        └── table-*.md
```

新增 `memory/` 的原因：

- 为大 feature 提供默认阅读入口
- 把稳定结论、开放问题和追踪链压缩保存
- 为有限上下文 agent 提供局部 `workset` 工作面

## 2. 第一层模板

## 2.0 `memory/*`

用途：

- 作为 feature 级外部记忆层

固定职责：

- `memory/index.md`：默认阅读入口、当前状态、推荐阅读顺序、问题路由表
- `memory/stable-context.md`：稳定背景压缩层和快速查表层
- `memory/open-items.md`：开放问题、风险、阻塞与回退建议过滤层
- `memory/trace-index.md`：高价值追踪链总索引和反查层
- `memory/worksets/index.md`：局部工作面清单与选择器
- `memory/worksets/ws-*.md`：单个局部工作面说明书与最小阅读集

写作规则：

- `memory/*` 不能替代源文档正文
- 只保留对后续步骤有复用价值的压缩信息
- 所有 memory 条目都应尽量引用稳定编号
- memory 首屏优先放查询入口，不优先放长段总结
- 尽量用表格承载角色、对象、阶段、风险和 workset 的查找关系
- workset 必须按局部业务闭环切分，而不是按“所有 API”或“所有表”这类技术维度粗暴切分
- 当 feature 规模较小，可少量 workset；当规模扩大，必须显式拆出多个 `ws-*.md`
- `memory/index.md` 首屏必须先放“问题到文件 / workset”路由表，再放摘要
- `memory/worksets/index.md` 首屏必须先放“问题类型 / 关键词 / 推荐 workset / 最小阅读集”选择表
- 每个 `ws-*.md` 开头都必须先给出“适用问题 / 纳入范围 / 不纳入范围 / 最小阅读集”

## 2.0.1 规模触发器与拆分硬约束

以下规则用于避免 feature 在规模扩大后继续用小项目写法硬撑。

- 若 feature 仍处于小规模：
  - `screens <= 8`
  - `flows <= 8`
  - `tables <= 15`
  - 允许只建立少量 workset
- 只要满足以下任一条件，就必须至少拆成 `2` 个 `ws-*.md`：
  - `screens >= 12`
  - `flows >= 12`
  - `tables >= 20`
  - 已出现两个以上明显子主题或子场景
- 只要满足以下任一条件，就应视为“接近中型规模”，必须执行中型项目写法：
  - `screens >= 20`
  - `flows >= 20`
  - `tables >= 40`
  - 已跨两个以上业务域
- 接近中型规模后，必须同时满足：
  - `screen-map.md` 增加模块列并按模块分组
  - `flows/index.md` 增加按域或子主题的索引表
  - `delivery/07-api-contracts.md` 首屏增加按主题分组的接口索引
  - `delivery/06-table-index.md` 首屏增加按模块或主实体分组的索引
  - `memory/worksets/index.md` 必须给出关键词路由、相邻 workset 和窗口建议
  - `analysis.md` 必须执行中型项目冒烟检查
- 若规模达到或接近 `50` 个界面、`50` 条流程、`100` 张表，则必须视为中型项目工作负载：
  - 不允许单文件堆叠式正文承担全量说明
  - 不允许只保留一个总 workset
  - `plan.md` 必须明确写出范围拆分理由和 workset 拆分理由
  - `analysis.md` 必须记录抽样范围、关键样本和 verdict 影响

## 2.0.2 ID 设计与自然语言映射

用途：

- 让模型快速识别“这是一个稳定对象”
- 让局部修改能准确打到 flow 或 ui 的目标点
- 让自然语言描述能反查回唯一 ID

固定规则：

- ID 必须使用大写前缀和连字符
- 前缀必须直接表达对象类型，例如 `FLOW-*`、`STEP-*`、`SCREEN-*`、`ACTION-*`
- 中间段必须表达 feature、业务域或主题归属
- 末段优先采用稳定语义段或定宽序号
- 同类对象在同一 feature 内不混用多种写法

推荐分层：

- 粗粒度对象：`ROLE-*`、`OBJ-*`、`RULE-*`、`STATE-*`、`STAGE-*`、`FLOW-*`、`SCREEN-*`
- 细粒度对象：`STEP-*`、`DEC-*`、`EX-*`、`SECTION-*`、`ACTION-*`、`FIELD-*`

为了支持自然语言映射，凡是允许被提问、被修改、被追踪的对象，建议表格中尽量同时提供：

- `ID`
- `Canonical Name`
- `Alias Keywords`
- `Owner ID`
- `Source Rules / Source Flows / Source Screens`

建议同时约束后续修改句式：

- 更新类：`把 <Target ID> 的 <属性> 改成 <新值>`
- 删除类：`删除 <Target ID>，并把 <影响对象> 并入 <目标对象>`
- 移动类：`把 <Target ID> 从 <旧 Owner ID> 移到 <新 Owner ID>`
- 拆分类：`把 <Target ID> 拆成 <新 Target ID A> 和 <新 Target ID B>`
- 合并类：`把 <Target ID A> 和 <Target ID B> 合并为 <新 Target ID>`

自然语言映射时，推荐优先按以下顺序反查：

1. 对象类型前缀
2. `Canonical Name`
3. `Alias Keywords`
4. `Owner ID`
5. `Source Rules / Source Flows / Source Screens`

## 2.1 `spec.md`

用途：

- 记录 feature 的基线需求

必备章节：

- Feature 名称
- 背景与目标
- 核心角色
- 范围内
- 范围外
- 成功标准
- 待澄清项

写作规则：

- 只写 what / why
- 不写 how
- 若输入同时包含方案设想，要单独放进“待确认或备注”，不能写成既定方案
- 若 feature 已有跨文档编号约定，应从这里开始建立 `ROLE-*`、`OBJ-*`、`RULE-*` 等基础编号

## 2.2 `clarifications.md`

用途：

- 补齐 `spec.md` 中尚未稳定的业务细节

必备章节：

- 角色补充
- 核心对象补充
- 业务框架
- 规则清单
- 默认值与覆盖关系
- 分支与异常
- 边界条件
- 待确认问题
- 验收样例

写作规则：

- 先写业务框架，再写细项规则与异常
- 每条规则应有适用范围
- 冲突规则应标记优先级
- 待确认问题不可混入已决规则
- 关键角色、对象、规则、状态应写入稳定编号
- 只保留已经稳定的业务结论
- 若结论来自澄清提问，可在条目中保留 `CF-SPEC / CF-FLOW / CF-UI` 标签，但不展开完整问答过程

业务框架章节至少应包含：

- 主线阶段划分
- 阶段责任边界
- 核心对象流转骨架
- 关键判断点
- 当前纳入与延期能力边界

推荐固定子章节顺序：

1. `Mainline Stages`
2. `Stage Responsibility Boundaries`
3. `Object Flow Backbone`
4. `Top-Level Decision Points`
5. `Capability Boundaries`

## 2.2.1 `clarify-log.md`

用途：

- 记录 `sp.clarify` 的问题历史、候选项、用户答案和影响范围

必备章节：

- 问题索引表
- 单题记录块

写作规则：

- 只记录澄清过程，不替代 `clarifications.md` 的稳定结论层
- 问题分类只允许 `CF-SPEC`、`CF-FLOW`、`CF-UI`
- 提问模式只允许 `Immediate`、`Batch`
- 题型默认只允许 `Single Select`、`Multi Select`
- 可附带 `Optional Remarks`
- 候选项必须位于当前 feature 和当前框架范围内
- 若候选项之间存在潜在冲突，应退回更宏观的问题重新提问
- 若结论已经稳定，应在记录中指向对应的 `clarifications.md`、`flows/*`、`ui/*` 或 `memory/*`
- 若问题来自后续 `flow` 或 `ui` 修改，还必须记录 `Target Type`、`Target ID`、`Canonical Name`、`Alias Keywords`、`Owner ID`、`Operation`、`Affected IDs`、`Affected Documents`、`Need Back-Propagation`

## 2.2.2 `flows/index.md`

用途：

- 作为 flow 资产的总入口和定向修改索引

固定要求：

- 首屏至少提供 `Flow ID`、`Canonical Name`、`Alias Keywords`、`Owner Stage`、`Key Step IDs`
- 若存在多个主流程或子流程，应在这里先分组，再下钻到具体图文件
- 后续如果要调整某个流程片段，应优先从这里反查到 `FLOW-*` 与 `STEP-*`

## 2.3 `flows/main-flow.mmd`

用途：

- 表达主流程与关键判断

固定要求：

- 使用 `flowchart`
- 起点和终点必须明确
- 主路径必须闭环
- 关键分支必须显式命名
- 关键节点应尽量在标签中直接带出 `STEP-*`、`DEC-*`、`EX-*`

## 2.4 `flows/sequence.mmd`

用途：

- 表达角色与系统的关键交互顺序

固定要求：

- 使用 `sequenceDiagram`
- actor 和 participant 命名必须与文档一致
- 只保留对业务判断有价值的交互

## 2.5 `flows/state.mmd`

用途：

- 表达状态切换与触发条件

固定要求：

- 使用 `stateDiagram-v2`
- 状态名必须可回链到业务规则
- 每条迁移必须有触发条件

## 2.6 `ui/index.md`

用途：

- 作为页面资产的总入口和模块级总览

固定要求：

- 首屏至少提供 `Screen ID`、`Canonical Name`、`Alias Keywords`、`Module`、`Linked Flows`、`Key Action IDs`
- 若页面较多，应先给模块索引，再给页面索引
- 后续如果要调整某个区块或动作，应先从这里反查到目标 `SCREEN-*`

## 2.7 `ui/screen-map.md`

用途：

- 定义页面或视图的总清单与关系

必备章节：

- 页面清单表
- 页面进入方式
- 页面间跳转关系
- 每页对应的业务目标

推荐表头：

| Screen ID | Canonical Name | Alias Keywords | Module | 角色 | 目标 | 进入方式 | 上游流程 | Key Action IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

补充要求：

- 每一页都必须有稳定 `SCREEN-*` 编号
- 关键页面动作应先在 map 中暴露 `ACTION-*`
- 当页面超过 `10` 个时，应增加模块列或分组列
- 当页面达到 `20` 个及以上时，必须按模块分组维护，并在首屏提供“模块 / 页面数 / 关键页面 / 入口文件”索引表

## 2.8 `ui/screen-*.md`

用途：

- 记录单页级别的业务卡片

必备章节：

- 页面编号
- 页面名称
- 页面目标
- 适用角色
- 进入条件
- 页面状态
- 页面区块
- 关键动作
- 接口绑定
- 业务规则
- 异常提示
- 离开条件

写作规则：

- 页面区块先于组件
- 规则和异常必须能回链业务澄清结果
- 不写前端框架实现细节
- 页面动作应尽量映射到 `UC-*` 或 `RULE-*`
- 页面状态至少覆盖初始态、加载态、空态、错误态、无权限态
- 关键动作应尽量映射到 `UC-*` 与 `API-*`
- 需要显式写出区块或字段的显隐条件、可编辑条件和提交反馈
- 页面卡片中应显式列出 `SECTION-*`、`ACTION-*`、`FIELD-*` 清单
- 每个低层对象都应尽量提供 `Canonical Name`、`Alias Keywords` 与 `Owner ID`

## 2.9 `ui/jsonforms/schema.json`

用途：

- 定义配置页或表单页的数据结构

固定要求：

- 只为配置页和表单页生成
- 字段命名应与业务对象一致
- 必填、枚举、默认值要明确

## 2.10 `ui/jsonforms/uischema.json`

用途：

- 定义表单展示结构

固定要求：

- 分组逻辑应贴近业务分类
- 不把视觉实现细节写成框架代码
- 控件顺序应服务业务阅读顺序

## 2.11 `ui/jsonforms/data.example.json`

用途：

- 提供一份可读的示例数据

固定要求：

- 示例值必须可理解
- 至少体现一组默认值或常见组合

## 2.12 `gate.md`

用途：

- 给出第一层是否通过的判断

必备章节：

- 结论
- 业务框架检查
- 通过项
- 开放问题
- 阻塞项
- 回退建议

结论值限定：

- `PASS`
- `PASS WITH OPEN QUESTIONS`
- `BLOCKED`

业务框架检查至少覆盖：

- `clarifications.md` 中已存在明确业务框架
- 固定子章节顺序完整
- 在不先读流程图和页面卡片的前提下，仍可自上而下解释业务主线

## 2.13 `bundle.md`

用途：

- 将第一层产物打包为交接文档

必备章节：

- Feature 目标摘要
- 业务框架快照
- 角色与对象摘要
- 关键流程摘要
- 关键规则摘要
- 页面清单摘要
- 定向修改查询入口
- 已稳定项
- 风险项
- 阻塞项
- 第二层接手注意事项

业务框架快照推荐固定子章节顺序：

1. `Mainline Stages`
2. `Stage Boundaries`
3. `Object Backbone`
4. `Top-Level Decision Points`
5. `In-Scope And Deferred Boundaries`

`定向修改查询入口` 建议至少提供：

- 常见自然语言到 `Target ID` 的映射示例
- 关键 `FLOW-* / STEP-* / DEC-* / EX-*` 的查询入口
- 关键 `SCREEN-* / SECTION-* / ACTION-* / FIELD-*` 的查询入口
- 进入 `trace-index.md` 与 `stable-context.md` 的最短跳转路径

## 3. 第二层模板

## 3.1 `plan.md`

用途：

- 把第一层结果转为交付设计结构

必备章节：

- 交付目标
- 范围拆分
- 页面到交付对象映射
- 模块边界
- 数据对象与数据流
- 外部依赖
- 验收入口
- 自动开发就绪结论

写作规则：

- 仍然是文档，不是代码设计实现
- 每个交付对象都应回链 `bundle.md`
- `plan.md` 只承担第二层总索引，不承载全部细节正文
- 必须明确第二层是否已经达到可自动开发的最小规格
- 必须建立 `memory/worksets/index.md`
- 必须把第二层拆成可局部推进的 `ws-*.md`
- 必须写明当前 feature 属于小规模、接近中型规模还是中型项目工作负载
- 若已进入接近中型规模，必须单列“范围拆分理由”和“workset 拆分理由”
- 每个 workset 必须能映射到明确的页面群、流程群、接口主题或数据对象群，而不是抽象描述

## 3.2 `tasks.md`

用途：

- 对 `plan.md` 做任务拆解

必备章节：

- 任务分组
- 前置依赖
- 可并行项
- 阶段检查点
- 验收映射
- 追踪对象

推荐表头：

| 任务 ID | 任务名称 | 来源计划项 | 追踪对象 | 前置依赖 | 可并行 | 完成判据 |
| --- | --- | --- | --- | --- | --- | --- |

补充要求：

- 每个任务应能映射到一个主要 workset
- 当一个任务跨多个 workset 时，应显式指出主次关系，避免后续 agent 无边界扩张

## 3.3 `delivery/01-prd.md`

用途：

- 收敛 feature 的交付范围与版本边界

必备章节：

- 目标版本
- 范围内
- 范围外
- 里程碑
- 风险摘要

## 3.4 `delivery/02-screen-to-delivery-map.md`

用途：

- 说明每个页面最终交给哪些交付对象处理

推荐表头：

| Screen ID | 页面 | 模块 | 用例 | 接口 | 数据对象 | 验收项 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 3.5 `delivery/03-use-case-matrix.md`

用途：

- 把页面动作沉淀成可执行用例矩阵

推荐表头：

| Use Case ID | 来源页面 | 触发动作 | 前置条件 | 主结果 | 异常结果 | 相关规则 | 相关 API |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 3.6 `delivery/04-domain-model.md`

用途：

- 汇总领域实体、关系、生命周期和主责任边界

必备章节：

- 实体清单
- 关系图
- 生命周期
- 聚合边界

## 3.7 `delivery/05-data-entity-catalog.md`

用途：

- 为实体和字段命名建立统一字典

推荐表头：

| Object ID | 名称 | 说明 | 关键字段 | 字段类型提示 | 来源规则 | 下游表 |
| --- | --- | --- | --- | --- | --- | --- |

## 3.8 `delivery/06-table-index.md`

用途：

- 管理数据库表级规格入口

推荐表头：

| Table ID | 表名 | 所属模块 | 主实体 | 读写接口 | 生命周期 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |

## 3.9 `delivery/tables/table-*.md`

用途：

- 逐表描述字段、约束和生命周期

必备章节：

- Table ID
- 表用途
- 字段清单
- 主键与唯一约束
- 索引
- 外键与关联
- 写入来源
- 读取场景
- 审计字段
- 保留与归档要求
- 软删除或硬删除策略
- 状态字段映射

字段清单至少应包含：

- 字段名
- 类型与长度
- 是否必填
- 默认值
- 是否可空
- 说明

## 3.10 `delivery/07-api-contracts.md`

用途：

- 描述请求、响应、错误和幂等要求

推荐表头：

| API ID | 用途 | 方法 | 路径 | 请求体 | 响应体 | 错误码 | 幂等要求 | 权限前提 | 副作用 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

补充要求：

- 请求体与响应体至少应明确字段类型、必填、可空、枚举、默认值
- 需要明确分页、排序、过滤等列表接口约束
- 需要明确状态前提与权限前提
- 当接口达到 `20` 个及以上时，首屏必须先给出“主题 / API 数量 / 关键写接口 / 外部依赖”索引表

## 3.11 `delivery/08-permissions-matrix.md`

用途：

- 明确角色、动作、数据范围和审批权限

推荐表头：

| Role ID | 动作 | 资源范围 | 条件 | 是否允许 | 页面显隐 | 字段可编辑 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 3.12 `delivery/09-events-and-side-effects.md`

用途：

- 沉淀通知、审计、余额变更、异步处理等副作用

推荐表头：

| Event ID | 触发源 | 触发条件 | 下游动作 | 同步/异步 | 幂等键 | 重试或补偿 | 失败处理 |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 3.13 `delivery/10-non-functional-requirements.md`

用途：

- 记录性能、并发、时区、审计、保留、导出等约束

必备章节：

- 性能约束
- 并发与幂等
- 时区与时间规则
- 审计与追踪
- 数据保留
- 导入导出
- 排序与分页约束

## 3.14 `delivery/11-module-boundaries.md`

用途：

- 划定模块职责、拥有边界和外部依赖

推荐表头：

| Module ID | 模块 | 负责内容 | 不负责内容 | 依赖对象 | 对外接口 |
| --- | --- | --- | --- | --- | --- |

## 3.15 `delivery/12-test-and-acceptance.md`

用途：

- 将验收样例转成可执行测试入口

推荐表头：

| Acceptance ID | 来源规则 | 来源页面 | 来源接口 | 来源表 | 前置数据 | 测试目标 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 3.16 `analysis.md`

用途：

- 检查第一层、第二层和 memory 层之间是否一致

必备章节：

- 总结论
- 通过项
- 风险项
- 阻塞项
- 发现摘要
- 关键裂缝
- 影响说明
- 证据位置
- 缺口分类
- 自动开发最低标准判断
- 中型项目冒烟测试
- 建议回退步骤
- 是否允许结束文档阶段

补充要求：

- 必须判断 `memory/*` 是否已经失真或过期
- 必须判断 `worksets/*` 是否仍然代表合理的局部工作面
- 如果 workset 过粗、缺失关键追踪链或与正文脱节，必须记为结构性缺口

推荐表头：

`总结论`

| Verdict | Allow Auto-Implementation | Reason |
| --- | --- | --- |

`缺口分类`

| Gap ID | Category | Severity | Description | Impact Scope | Evidence | Suggested Rollback |
| --- | --- | --- | --- | --- | --- | --- |

固定要求：

- `Category` 只允许使用 `UI / API / Data / Permission / Side-Effect / Acceptance`
- `Severity` 只允许使用 `High / Medium / Low`
- 至少有一行总结论
- 若不存在缺口，也应显式写 `No material gaps`
- 若 feature 已达到中型项目规模，应补写冒烟范围、抽样统计和 verdict 影响
- 若 feature 已进入接近中型规模，应显式判断拆分结构、查询结构和 workset 路由是否仍有效
- 若 feature 已达到中型项目工作负载，未执行冒烟检查则不得判 `PASS`

参考成品示例：

- [reference/sp-analysis-example-leave-request.md](sp-analysis-example-leave-request.md)

## 4. 模板生成顺序建议

推荐由命令驱动模板产出：

1. `sp.specify` 生成 `spec.md`
2. `sp.clarify` 补齐 `spec.md`、`clarifications.md` 并维护 `clarify-log.md`
3. `sp.flow` 生成 `flows/*`
4. `sp.ui` 生成 `ui/*`
5. `sp.gate` 生成 `gate.md`
6. `sp.bundle` 生成 `bundle.md`
7. `sp.plan` 生成 `plan.md` 与 `delivery/*`
8. `sp.tasks` 生成 `tasks.md`
9. `sp.analyze` 生成 `analysis.md`

## 5. 与原版 fork 的关系

这套模板包的设计原则是：

- 尽量不破坏原版 `spec.md / plan.md / tasks.md` 的根骨架
- 将 `flow / ui / gate / bundle / analysis` 作为增量补强
- 让模板层承担大部分分层改造，而不是重写整个 CLI
