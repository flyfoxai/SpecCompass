# `sp` Agent 验证矩阵

> 目标：为真实 fork 后的验证提供一份统一基线，确保 `sp` 的兼容面尽量看齐 upstream，而不是只验证两三个常见 agent。

## 1. 使用规则

这份矩阵用于真实 fork 后的验证，不是当前仓库的实现结果。

使用时必须遵守：

- 先冻结 upstream 快照
- 先读取当时的 `AGENT_CONFIG`
- 所有 `--ai` 标识以上游快照为准
- 文中如果出现 `<agent-id-from-upstream>`，表示必须替换为快照里的准确值

## 2. 统一验证范围

所有 agent 至少要验证这组命令：

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

## 3. 验证前置检查

每个 agent 开始前都先检查：

- `specify` CLI 可用
- 对应 agent CLI 可用
- 当前平台脚本类型正确
- 工作区已初始化
- 升级后是否需要 reload / restart
- 目标项目中的 agent integration 目录是否已写入
- `.specify/integrations/*.manifest.json` 是否反映真实安装结果

## 4. 核心矩阵

| Agent | 类型 | 初始化命令模式 | 触发方式 | 安装落位 | 刷新要求 | 核心检查点 |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Code | skills | `specify init . --ai claude --script <sh-or-ps>` | `/sp-*` | `.claude/skills/sp-*/SKILL.md` | 通常需要刷新工作区 | skill 可见、frontmatter 含 `user-invocable: true`、输出落到 `specs/<feature>/` |
| Codex CLI / Desktop | skills | `specify init . --ai codex --script <sh-or-ps>` | `$sp-*` | `.agents/skills/sp-*/SKILL.md` | 通常需要 reload workspace | skill 可见、`--skills` 为默认模式、输出落到 `specs/<feature>/` |
| Gemini CLI | slash command | `specify init . --ai <agent-id-from-upstream> --script <sh-or-ps>` | `/sp.*` | Gemini 命令目录 | 通常需要刷新命令缓存 | slash command 可见、文档输出完整 |
| Kiro CLI | slash command | `specify init . --ai <agent-id-from-upstream> --script <sh-or-ps>` | `/sp.*` | Kiro 命令目录 | 通常需要刷新工作区 | 命令目录写入正确、`sp.flow` 和 `sp.ui` 可触发 |
| Windsurf | slash command | `specify init . --ai <agent-id-from-upstream> --script <sh-or-ps>` | `/sp.*` | Windsurf 命令目录 | 通常需要 reload | 命令注册成功、`sp.gate` 和 `sp.bundle` 输出正确 |
| Roo Code | slash command | `specify init . --ai <agent-id-from-upstream> --script <sh-or-ps>` | `/sp.*` | Roo Code 命令目录 | 通常需要 reload | 命令可见、第二层文档命令仍不写代码 |
| Kilo Code | slash command | `specify init . --ai <agent-id-from-upstream> --script <sh-or-ps>` | `/sp.*` | Kilo Code 命令目录 | 通常需要 reload | `sp.plan / sp.tasks / sp.analyze` 输出符合文档边界 |
| Generic | generic | `specify init . --ai generic --ai-commands-dir <path> --script <sh-or-ps>` | 由宿主 agent 决定 | 用户指定目录 | 由宿主 agent 决定 | 模板可被外部目录直接消费，不依赖厂商专属逻辑 |

## 5. 单 agent 验证步骤

每验证一个 agent，建议固定执行：

1. 运行 `specify init`
2. 运行 `specify check`
3. 确认命令文件已写到正确目录
4. 刷新或重启对应 agent
5. 依次触发 `sp.specify -> sp.clarify -> sp.flow -> sp.ui -> sp.gate -> sp.bundle`
6. 再触发 `sp.plan -> sp.tasks -> sp.analyze`
7. 检查 `specs/<feature>/` 输出是否齐全
8. 检查 `analysis.md` 是否固定输出 verdict 表和 gap category 表

## 6. 输出核对清单

每个 agent 至少核对以下输出：

- `spec.md`
- `clarifications.md`
- `gate.md`
- `bundle.md`
- `plan.md`
- `tasks.md`
- `analysis.md`
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

其中 `analysis.md` 还必须额外核对：

- 最终结论只能是 `PASS`、`PASS WITH RISKS` 或 `BLOCKED`
- verdict 表必须包含 `Verdict / Allow Auto-Implementation / Reason`
- gap category 表必须包含 `Gap ID / Category / Severity / Description / Impact Scope / Evidence / Suggested Rollback`
- `Category` 只能使用 `UI / API / Data / Permission / Side-Effect / Acceptance`
- `Severity` 只能使用 `High / Medium / Low`

## 7. 失败分类

验证失败时，建议按下面几类记录：

- 初始化失败
- 命令未写入
- 触发语法错误
- 命令正文缺块
- active feature 识别失败
- 输出路径错误
- 文档越界进入实现
- `analysis.md` 结构缺失或枚举不合法
- 平台脚本错误
- agent reload 后仍不可见

## 8. 验证记录模板

建议真实 fork 后，为每个 agent 记录一份结果：

```md
# <Agent Name>

## Upstream Snapshot

## Platform

## Init Command

## Install Target

## Trigger Check

## Output Check

## Analysis Structure Check

## Reload Requirement

## Issues

## Verdict
```

## 9. 通过标准

只有满足以下条件，某个 agent 才算通过：

- `specify init` 成功
- `specify check` 无关键错误
- `sp` 命令可见且可触发
- 第一层与第二层文档都能生成
- 没有命令越界进入实现
- 输出文件路径与模板骨架一致
- `analysis.md` 的固定结构、枚举和值域完全符合规范
