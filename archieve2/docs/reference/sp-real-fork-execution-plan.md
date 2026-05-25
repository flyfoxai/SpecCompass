# `sp` 真实 Fork 执行方案

> 目标：当真正 fork 原版 `Spec Kit` 时，按尽量小的偏移完成 `sp` 文档工作流改造，并保留后续同步上游的能力。
>
> 状态说明：这是一份历史执行方案草稿。凡是文中仍提到旧的 Codex prompt 写法或旧分发链，均只代表当时的迁移设想，不代表当前仓库已落地机制。当前真实机制请以 `docs/installation.md`、`docs/reference/sp-agent-install-strategy.md` 和 `src/specify_cli/integrations/*` 为准。

## 1. 边界

这份文档只定义真实 fork 时的执行顺序，不在当前仓库直接创建 `.specify/` 或修改 upstream 代码。

当前阶段仍然是：

- 文档设计阶段
- 以原版 `Spec Kit` 为基线
- 文档工作流以 `sp.analyze` 作为结束点

## 2. 总体原则

真实 fork 时，应坚持以下原则：

- 尽量不改 `specify` CLI 入口
- 尽量不改 active feature 识别机制
- 尽量不改上游目录骨架
- 优先改模板层，而不是重写脚本框架
- agent 兼容矩阵尽量跟随 upstream
- 所有 agent 的命令正文语义保持一致

## 3. 开工前基线冻结

开始改造前，先在 fork 仓库里冻结一份 upstream 快照。

至少记录：

- upstream 仓库地址
- fork 基于的 commit / tag
- 快照日期
- 当时的 `README`
- 当时的 `AGENT_CONFIG`
- 当时的模板目录布局
- 当时的脚本目录布局

必须额外冻结的内容：

- upstream 支持的 agent 列表
- 每个 agent 的准确 `--ai` 标识
- 哪些 agent 使用 slash command
- 哪些 agent 使用 skills
- generic 模式的参数要求

说明：

- 当前文档里出现的部分 `--ai` 示例值只是设计期示意
- 真实 fork 时必须以上游快照中的 `AGENT_CONFIG` 为准

## 4. 执行阶段

## 4.1 阶段 0：建立 fork 工作分支

目标：

- 先把上游原始结构完整保留
- 在独立分支上做 `sp` 改造

建议动作：

- 创建 fork
- 拉取 upstream 默认分支
- 新建 `sp-doc-workflow` 之类的改造分支
- 记录快照信息到 `docs/` 或 `notes/`

完成标准：

- 能清楚回答“这次改造基于哪个 upstream 版本”

## 4.2 阶段 1：先改项目级 memory 与 constitution

目标：

- 先固定业务边界和工作原则
- 让所有后续命令都建立在同一套约束上

优先改动：

- `.specify/memory/constitution.md`
- `.specify/memory/project-index.md`
- `.specify/memory/feature-map.md`
- `.specify/memory/domain-map.md`
- `.specify/memory/active-context.md`
- `.specify/memory/hotspots.md`

写入重点：

- 两层推进原则
- 项目级第一跳路由
- 当前 feature / workset 最小阅读集
- 当前阶段只做文档工作
- `flow` 固定用 `Mermaid`
- `ui` 固定用 `Markdown + JSON Forms`
- `plan / tasks / analyze` 在当前方案中仍是文档工作
- 文档阶段不默认绑定任何实现框架

完成标准：

- 上游 agent 读取项目级 memory 后，不会把当前流程误判成“直接写代码”
- 上游 agent 能先定位到正确 feature，再定位到正确 workset

## 4.3 阶段 2：替换命令命名与命令语义

目标：

- 把上游命令族映射成 `sp` 命令族
- 保留原版逐步提示的优势

优先改动：

- slash command 模板
- skills 模板
- 命令帮助文本

命令范围：

- `sp.constitution`
- `sp.specify`
- `sp.clarify`
- `sp.flow`
- `sp.ui`
- `sp.gate`
- `sp.bundle`
- `sp.plan`
- `sp.tasks`
- `sp.analyze`

兼容处理：

- 原版 `checklist` 的校验职责迁入 `sp.gate`
- 如有必要保留 `sp.checklist -> sp.gate`

完成标准：

- 每个命令都固定包含 `Purpose / Read First / Do / Do Not / Output / Check Before Finish / Next`

## 4.4 阶段 3：改 agent 模板分发层

目标：

- 保留上游多 agent 写入机制
- 不把 fork 收缩成只支持少数 agent

优先改动：

- 各 agent 的命令模板目录
- skills 与 slash command 的分发逻辑
- generic agent 的目录写入逻辑

执行要求：

- slash command agent 使用 `/sp.*`
- skills 型 agent 按宿主目录写入
- Codex 使用 `$sp-*`，并落位到 `.agents/skills/sp-*/SKILL.md`
- Claude 使用 `/sp-*`，并落位到 `.claude/skills/sp-*/SKILL.md`
- 其他 skills agent 也按 upstream 对应方式适配
- generic 继续支持 `--ai generic --ai-commands-dir <path>`

完成标准：

- 同一条业务命令在不同 agent 上只变触发语法，不变工作逻辑

## 4.5 阶段 4：补 feature 文档模板

目标：

- 在不破坏 `specs/<feature>/` 心智模型的前提下，补齐第一层和第二层文档骨架

优先改动：

- `.specify/templates/spec.md`
- `.specify/templates/plan.md`
- `.specify/templates/tasks.md`
- 新增文档模板与生成片段

建议补入：

- `clarifications.md`
- `gate.md`
- `bundle.md`
- `analysis.md`
  - 固定输出 `PASS / PASS WITH RISKS / BLOCKED`
  - 固定输出缺口分类表，便于对比不同 feature 的自动开发准备度
- `flows/main-flow.mmd`
- `flows/sequence.mmd`
- `flows/state.mmd`
- `ui/screen-map.md`
- `ui/screen-*.md`
- `ui/jsonforms/schema.json`
- `ui/jsonforms/uischema.json`
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

完成标准：

- `sp` 命令输出能稳定落到 `specs/<feature>/` 下的新旧模板组合中
- `analysis.md` 的最终结论和缺口分类结构在所有 agent 上保持一致

## 4.6 阶段 5：扩脚本，不重写脚本框架

目标：

- 尽量复用上游脚本能力
- 只补新增文档路径支持

优先改动：

- feature 定位脚本
- 模板拷贝脚本
- 初始化辅助脚本
- `sh` / `ps` 双脚本

扩展点：

- `clarifications.md`
- `gate.md`
- `bundle.md`
- `analysis.md`
- `flows/`
- `ui/`
- `delivery/`
- `delivery/tables/`

不要做的事：

- 不要为了支持新命令而重写整套初始化流程
- 不要提前改成实现导向脚本

完成标准：

- macOS / Linux / Windows 三套路径都能生成同一组第一层与第二层文档骨架

## 4.7 阶段 6：改安装、检查、升级文案

目标：

- 对外体验继续维持原版心智模型

优先改动：

- 安装说明
- `specify init` 说明
- `specify check` 说明
- 升级说明

要求：

- 用户仍主要执行 `specify init`
- `specify check` 继续作为检查入口
- 文档明确说明 slash command 与 skills 的不同触发方式
- 文档明确说明升级后哪些 agent 需要 reload / restart

完成标准：

- 使用者能按原版习惯完成初始化，不需要学习一套全新的 CLI

## 4.8 阶段 7：执行 agent 验证矩阵

目标：

- 在真正发布前验证多 agent 接入没有退化

至少覆盖：

- Claude Code
- Codex CLI
- Gemini CLI
- Kiro CLI
- Windsurf
- Roo Code
- Kilo Code
- Antigravity (`agy`)
- generic bring-your-own agent

验证内容：

- `specify init` 是否成功
- 命令是否写到正确目录
- 触发语法是否正确
- active feature 是否正常识别
- `sp.specify` 到 `sp.analyze` 是否都能运行
- 输出文件是否落到预期路径
- `analysis.md` 是否固定输出最终结论表和缺口分类表

执行基线：

- 参考 [reference/sp-agent-validation-matrix.md](sp-agent-validation-matrix.md)

## 4.9 阶段 8：发布最小可用版本

目标：

- 先发一个文档工作流可用版

发布范围建议：

- constitution
- `sp.constitution`
- `sp.specify`
- `sp.clarify`
- `sp.flow`
- `sp.ui`
- `sp.gate`
- `sp.bundle`
- `sp.plan`
- `sp.tasks`
- `sp.analyze`

## 5. 每轮提交建议

为了降低 fork 漂移，建议按下面顺序分提交：

1. memory / constitution
2. 命令模板重命名与正文替换
3. 新命令模板增加
4. feature 文档模板扩展
5. 脚本层路径补丁
6. 安装与升级文档
7. agent 验证记录

这样做的好处：

- 回滚边界清楚
- 更容易对比 upstream 变化
- 后续合并上游时冲突更小

## 6. 退出条件

只有同时满足以下条件，才算真实 fork 的文档阶段改造完成：

- `sp` 命令体系已替换完成
- 多 agent 模板分发已验证
- `specs/<feature>/` 输出骨架已验证
- `plan / tasks / analyze` 已被证明仍然属于文档流程
- `analysis.md` 的固定 verdict 和 gap 分类结构已验证
- macOS / Linux / Windows 至少各有一条初始化链路可复现
