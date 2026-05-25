# `sp` 文档阶段封板验收清单

> 目标：在当前仓库不进入真实 fork、不进入实现阶段的前提下，为文档阶段提供一份可执行的最终封板检查表。

## 1. 适用范围

本清单用于检查：

- 文档阶段是否已经形成完整方法论
- 样例链路是否已经从第一层走到第二层
- 当前仓库是否还存在会误导后续 fork 的结构性歧义

本清单不用于检查：

- upstream 真实 fork 是否已落地
- CLI 代码是否已改造
- 生产代码是否已实现

## 2. 架构封板

- [x] 顶层架构已固定为两层，没有第三个顶层层级
- [x] 第一层职责、第二层职责已经分别成文
- [x] `sp.implement` 未被纳入当前阶段
- [x] `flow`、`ui`、`gate`、`bundle` 已纳入命令规范

## 3. 命令封板

- [x] 当前命令集已固定为 `sp.constitution` 到 `sp.analyze`
- [x] `specify init` 与 `specify check` 的保留原则已成文
- [x] slash command 与 skills 两类触发方式已成文
- [x] `sp` 与 upstream `speckit` 的命令映射已成文

## 4. Agent 兼容封板

- [x] Codex、Claude、Gemini、Kiro、Windsurf、generic 等兼容范围已覆盖
- [x] `--ai-skills` 兼容空操作与 generic 模式约束已成文
- [x] 文档明确区分“上游现状”与“当前 `sp` 映射”

## 5. 模板与产物封板

- [x] 命令模板正文骨架已固定
- [x] `specs/<feature>/` 标准目录已固定
- [x] 第一层模板已覆盖 `spec / clarify / flow / ui / gate / bundle`
- [x] 第二层模板已覆盖 `plan / tasks / analysis / delivery/*`
- [x] `analysis.md` 固定结构与 gap category 已固定

## 6. 自动开发前置封板

- [x] 自动开发就绪度评估文档已成文
- [x] 自动开发最小补充规格已成文
- [x] 自动开发通过线已成文
- [x] 中型项目冒烟测试规范已成文

## 7. 样例封板

- [x] 已存在一套完整 `specs/<feature>/` 样例链路
- [x] 样例至少覆盖 `spec -> clarify -> flow -> ui -> gate -> bundle -> plan -> tasks -> analyze`
- [x] 样例已包含 `delivery/*` 关键文件
- [x] 样例已建立 `SCREEN -> UC -> API -> TABLE -> ACC` 主链路

## 8. 术语与边界清理

- [x] 没有把内部三段式、四段式表达误写成项目顶层架构
- [x] 已明确放弃 `PlantUML Salt`
- [x] 已明确放弃 `@rjsf/core`
- [x] 没有把未来真实 fork 执行动作误写成当前仓库已完成事项

## 9. 记忆层与上下文封板

- [x] 已形成项目级 `.specify/memory/*` 与 feature 级 `memory/*` 两层记忆结构
- [x] query-first 首屏结构已成文，不再允许 memory 退化成长摘要
- [x] 项目级第一跳路由与 feature 级 workset 路由已分别成文
- [x] 小 / 中 / 大窗口的文件预算已成文
- [x] `active-context.md` 的最小阅读集约束已成文
- [x] 默认只进入 `1` 个 active feature 和 `1` 个主 workset 的规则已成文
- [x] 已成文规定 fresh memory 优先复用，稳定结论不得重复推理
- [x] 已成文规定 stale memory、检索失败与最小回读集的处理规则
- [x] 已成文规定 `clarify` 结论必须按 source-of-truth 和 required-sync-files 传播

## 10. 中型项目封板

- [x] workset 拆分触发器已成文
- [x] 接近中型规模触发器已成文
- [x] 中型项目工作负载定义已成文
- [x] 中型项目下的分组索引要求已成文
- [x] `plan.md` 的范围拆分理由和 workset 拆分理由要求已成文
- [x] `analysis.md` 的冒烟检查与 `PASS` 限制已成文

## 11. 当前结论

只有当以下两项同时满足，当前仓库才可视为文档阶段封板：

- 上述检查项不存在结构性缺口
- 后续剩余工作只属于真实 fork 落地或实现阶段，不再属于文档设计阶段

## 12. 封板前实操冒烟

以下检查不是概念性判断，而是封板前必须能跑通的最小人工核验。

### 12.1 项目级记忆层冒烟

- [x] 打开 `.specify/memory/project-index.md`，首屏能直接回答“我现在先读什么”
- [x] 打开 `.specify/memory/active-context.md`，能直接看到当前 active feature、主 workset、最小阅读集、禁止越界范围
- [x] 打开 `.specify/memory/feature-map.md`，能直接看到 feature 当前阶段、verdict、主入口、主 workset
- [x] 打开 `.specify/memory/domain-map.md`，能从对象或规则反查到 feature 与入口
- [x] 打开 `.specify/memory/hotspots.md`，能直接找到最高风险项和建议回退步骤

### 12.2 `sp.clarify` 冒烟

- [x] 文档已明确 `CF-SPEC / CF-FLOW / CF-UI` 三类问题
- [x] 文档已明确 `Immediate / Batch` 判定边界
- [x] 文档已明确批量问题按 `Queue Topic` 分组，而不是按文档顺序堆积
- [x] 文档已明确批量冲刷条件：主题累计、重复回退、进入 `sp.gate` / `sp.bundle` / `sp.plan` 前检查
- [x] 文档已明确 `flow / ui` 调整前必须先解析到唯一 `Target ID`
- [x] `clarify-log.md` 模板已覆盖 `Queue Topic`、`Flush Trigger`、`Target Resolution`、`Source Of Truth`、`Required Sync Files`、`Propagation Status`、`Propagation Check` 等关键字段

### 12.3 样例链路冒烟

- [x] 样例 feature 已覆盖 `spec -> clarify -> flow -> ui -> gate -> bundle -> plan -> tasks -> analyze`
- [x] 样例 feature 已覆盖 `memory/index.md`、`memory/stable-context.md`、`memory/open-items.md`、`memory/trace-index.md`、`memory/worksets/*`
- [x] 样例 feature 已能从自然语言短语反查到 `FLOW-* / SCREEN-* / ACTION-* / FIELD-*` 等稳定 ID
- [x] 样例 feature 已能从风险项反查到主 workset 和建议回退步骤

### 12.4 上下文预算冒烟

- [x] 项目级最小阅读集已控制在 `5` 个文件以内
- [x] 默认只进入 `1` 个 active feature 和 `1` 个主 workset
- [x] query-first 入口已能避免 agent 默认全量扫描 `specs/*`

### 12.5 token 节省与传播闭环冒烟

- [x] 文档已明确：若稳定结论已存在于 fresh memory，则后续步骤不得重复推理
- [x] 文档已明确：若 memory stale、缺失或命中歧义，只允许回读当前目标的最小源文档集
- [x] 文档已明确：`sp.gate`、`sp.bundle`、`sp.plan`、`sp.analyze` 必须检查 stale memory 与未完成传播
- [x] 文档已明确：`sp.clarify` 要先更新 `Source Of Truth`，再刷新 `Required Sync Files`
- [x] 文档已明确：传播未完成的问题不得标记为 `Closed`

## 13. 当前结论

按当前仓库状态，文档阶段设计工作已达到封板标准。

这句话的含义是：

- 文档方法论、命令规范、样例链路、记忆层、上下文预算约束都已经形成闭环
- 本轮剩余工作不再是“继续设计文档体系”，而是把这些文档真实迁入 upstream fork 结构并接入命令模板

## 14. 仍未完成但不属于本轮文档设计的工作

以下事项仍然未做，但它们不再属于本轮文档设计缺口：

- upstream 真实 fork 落地
- 把当前文档规范迁入 upstream 命令模板与目录结构
- CLI / slash command / skills 实际包装改造
- 未来 `sp.implement` 及实现阶段接入
