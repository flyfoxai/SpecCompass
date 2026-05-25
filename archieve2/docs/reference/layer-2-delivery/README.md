# 第二层：交付设计层

这一层只在第一层业务澄清稳定之后启动。

## 目标

把第一层已经稳定的业务结果，转成交付设计文档和一致性约束。

这一层的具体框架定义见：

- `../layered-business-framework.md`
- `../sp-auto-development-readiness.md`
- `../sp-auto-development-passline.md`

## 负责内容

- PRD 收敛
- 页面与交互映射
- 模块边界
- 数据对象与契约
- 任务拆解
- 验收标准
- 跨文档一致性分析

其中三个关键文档的角色应固定：

- `plan.md`：第二层总索引、范围说明和自动开发就绪结论
- `tasks.md`：文档阶段任务拆解，并为每个任务标记主要追踪对象
- `analysis.md`：跨产物一致性检查，并以固定 verdict 与 gap category 结构判断是否达到自动开发最低补充规格

## 推荐输出

建议第二层至少固定产出以下内容：

- `plan.md`
- `delivery/01-prd.md`
- `delivery/02-screen-to-delivery-map.md`
- `delivery/03-use-case-matrix.md`
- `delivery/04-domain-model.md`
- `delivery/05-data-entity-catalog.md`
- `delivery/06-table-index.md`
- `delivery/tables/table-*.md`
- `delivery/07-api-contracts.md`
- `delivery/08-permissions-matrix.md`
- `delivery/09-events-and-side-effects.md`
- `delivery/10-non-functional-requirements.md`
- `delivery/11-module-boundaries.md`
- `delivery/12-test-and-acceptance.md`
- `tasks.md`
- `analysis.md`

## 不应跳过的前提

进入这一层前，应先确认：

- 主流程已经稳定
- 异常流程和边界条件已补齐
- 核心规则没有明显冲突
- 页面清单和配置项分类已明确
- 待确认问题已经降到可接受范围

## 与第一层的关系

- 第一层负责“讲清楚”
- 第二层负责“组织成交付文档”

如果第一层仍然存在大量待确认项，第二层不应直接启动。

## 面向自动开发的额外要求

如果第二层产物要继续作为自动开发输入，还必须额外满足：

- 页面、用例、接口、表、验收项之间可以回链
- 关键数据库表具备逐表规格
- 权限矩阵和副作用规则已单独成文
- 性能、并发、时区、审计等非功能约束已单独成文
- 页面文档写明页面状态、显隐条件、字段可编辑条件和关键动作绑定
- API 文档写明字段约束、错误码、幂等要求和权限前提
- 表级文档写明字段约束、删除策略和状态字段映射
- 验收文档写明前置数据以及与页面、接口、表的回链关系
- `analysis.md` 最终必须落在 `PASS`、`PASS WITH RISKS` 或 `BLOCKED`
