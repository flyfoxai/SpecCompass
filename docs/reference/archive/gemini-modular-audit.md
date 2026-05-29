# Gemini 模块化审计管理文档

日期：2026-05-23

本文用于管理本轮 Gemini 模块化审计结果。审计范围不包含 `Archieved/`、`archieve2/` 等归档目录。

历史口径：用户可见核心命令必须保持 `/sp.*`，例如 `/sp.specify`、`/sp.plan`、`/sp.analyze`。当时曾考虑为 Codex 额外生成 prompt/plugin 入口，但后续已废弃该方向。当前 Codex 按 upstream skills 机制安装到 `.agents/skills/sp-<name>/SKILL.md`，并通过 `$` 或 `/skills` 选择 `sp-*` skill。Claude 安装到 `.claude/commands/sp.<name>.md`，并显示为 `/sp.<name>`。不要把 Codex 的 on-disk `sp-<name>` 技能包目录当成 slash 调用语法。extension / preset 命名空间继续使用 upstream 风格的 `speckit.<extension>.<command>`。

## Gemini 调用记录

| 模块 | 原始输出 |
| --- | --- |
| 命名与用户文档 | `/tmp/sp_gemini_audit_naming.json` |
| 安装与宿主集成 | `/tmp/sp_gemini_audit_install.json` |
| Catalog / fork 闭环 | `/tmp/sp_gemini_audit_catalog.json` |
| Memory / 方法论 | `/tmp/sp_gemini_audit_memory.json` |
| 测试与发布 | `/tmp/sp_gemini_audit_tests.json` |
| 命令模板 | `/tmp/sp_gemini_audit_commands.json` |
| Feature 模板 | `/tmp/sp_gemini_audit_feature_templates.json` |
| 脚本运行时 | `/tmp/sp_gemini_audit_runtime.json` |
| 跨模块综合复核 | `/tmp/sp_gemini_audit_synthesis.json` |
| 命令 name / hook YAML 追问 | `/tmp/sp_gemini_followup_name_yaml.json` |
| 修复后复核与 YAML 方案追问 | `/tmp/sp_gemini_recheck_after_tests.txt` |

## 已收口结论

### 1. 核心命令命名

Gemini 与 Codex 一致认为：用户文档、命令输出和 next-step 提示里，核心生命周期命令应写成 `/sp.*`，不能继续写 `/speckit.*`，也不能为了 skills 目录而改成 `/sp-*`。

处理结论：

- 核心命令：`/sp.specify`、`/sp.plan`、`/sp.tasks`、`/sp.analyze` 等。
- Codex skills 物理目录：`.agents/skills/sp-plan/SKILL.md` 等；当前不再生成 prompt/plugin 入口，使用 `$` 或 `/skills` 选择 skill。
- Claude 命令文件：`.claude/commands/sp.plan.md` 等；用户可见为 `/sp.plan`。
- extension 命令：继续使用 `/speckit.<extension>.<command>`。

### 2. `SKILL.md` frontmatter `name`

更新结论：真实 ASK 安装检查证明，旧 `.codex/*` 面和 Claude core skills 会造成缺失、重复或旧命令显示；但 Codex 的 upstream 正确机制仍是 `.agents/skills/<skill-name>/SKILL.md`。SP 只把 upstream 的 `speckit-<name>` 改为 `sp-<name>`，不把 Codex on-disk 目录改成 dotted `sp.<name>`。

Codex 判断：原先“核心 skill 目录也必须使用 `sp.*`”属于历史误判，已废弃。当前修复方向是：Codex 保持 upstream-style `.agents/skills/sp-<name>/SKILL.md` 作为 executable skill package，不再生成 prompt/plugin 命令面。Claude 保持 `.claude/commands/sp.<name>.md`，并清理 `.claude/skills` 下的 core variants；旧 `.codex/commands`、旧 `.codex/skills`、`.codex/prompts/sp*.md`、`.codex/prompts/speckit*.md`、`plugins/sp/` 和 `.agents/plugins/marketplace.json` 都作为 stale residue 清理。

### 3. Hook YAML 结构

Gemini 追问复核意见：extension hook YAML 不建议拆成很多小文件；更适合保留单个开放 schema，稳定核心字段，未知字段忽略或保留。

Codex 判断：同意。这样更接近 upstream，升级成本低，也能避免每加一个 hook 字段就改解析器。后续如需脚本化 hook 发现，应做成开放字段解析，而不是硬编码所有字段。

落地边界：

- 使用单个开放 YAML schema，不拆成 `manifest.yml`、`hooks.yml`、`commands.yml` 等多个同步文件。
- 解析器只依赖稳定核心字段，例如 `schema_version`、`id`、`name`、`commands`、`hooks`、`scripts`。
- 新增字段默认允许存在；旧解析器应忽略或原样保留未知字段，不能因为未知字段直接中断安装或执行。
- 合并策略必须保守：稳定核心字段按明确规则覆盖；未知字段默认不深度合并，除非该字段在 schema 文档中声明了可合并语义。出现同名未知字段冲突时，应保留来源更明确的一侧并记录 warning，不能静默拼接出不可解释结果。
- 文件大小要有软上限：YAML 应只保存运行所需配置，不承载长篇说明、生成结果或日志。超过软上限时应提示把说明移到文档，把大块数据移到独立资源，避免后续命令加载配置时浪费 token 或挤占上下文窗口。
- 如果未来需要把 hook 解析脚本化，脚本应读取稳定字段并保留扩展空间，不能把每个业务字段都写死进程序。
- 只有当单个 YAML 文件已经过大、反复引发冲突，或某一类配置具备独立生命周期时，才重新评估拆分文件。

## 已执行修复

### A. 命名与用户文档

状态：已修复。

修复内容：

- 将用户文档和扩展文档中表示核心生命周期的 `/speckit.specify`、`/speckit.plan`、`/speckit.tasks`、`/speckit.implement` 改为 `/sp.specify`、`/sp.plan`、`/sp.tasks`、`/sp.implement`。
- 保留 extension 自身命令，例如 `/speckit.jira.specstoissues`、`/speckit.git.feature`。
- 保留历史迁移、fixture、upstream 对比语境中的 `speckit.*`。

### B. Claude hook note

状态：已修复。

修复内容：

- 旧说明“replace dots with hyphens”已收窄。
- 新规则明确：核心用户命令仍使用 `/sp.*`；只有 extension hook skill lookup 才把 `speckit.<extension>.<command>` 映射到 hyphenated skill 目录形式。

### C. Catalog / fork 闭环

状态：已修复。

修复内容：

- 运行时默认 catalog URL 改为 `flyfoxai/SpecPilot`。
- 内置 catalog 文件的 `catalog_url` 改为 fork raw URL。
- 内置 extension / preset 的 `repository` 改为 fork 仓库。
- 增加回归测试，禁止运行时默认 catalog 指向 `github/spec-kit`。

说明：README、文档中说明“项目来源于 github/spec-kit”的链接可以保留，因为那是来源归因，不是运行时下载源。

### D. Kimi legacy 迁移

状态：已修复。

修复内容：

- 旧核心 dotted skill 目录，例如 `speckit.plan`，迁移到当前 integration 的规范目录；Codex core 为 `sp-plan`，Kimi/其他 skills integration 按各自命名 helper 处理。
- 旧 extension dotted skill 目录继续迁移到 `speckit-*`。
- 测试已更新，避免 `speckit-plan`、`sp-plan` 与 `sp.plan` 并存。

### E. Open Items 结构

状态：已修复。

修复内容：

- `open-items.md` 已从 15 列宽表改为模型友好的标题块结构，例如 `### OPEN-001`。
- Bash / PowerShell 检查脚本兼容新 block 格式，也兼容旧表格格式。
- 测试已覆盖新格式解析，降低模型维护宽表和 `|` 错列风险。

### F. Feature 模板默认业务数据

状态：已修复。

修复内容：

- `clarifications.md`、`analysis.md`、`gate.md` 清理默认业务事实。
- `gate.md` 的初始化 verdict 改为 `Not Run`，并说明这只是初始化状态，不代表真实 blocker。
- `stable-context.md`、`trace-index.md`、worksets 清理审批、角色、副作用等伪业务示例，保留空骨架和使用说明。

### G. PowerShell 文本输出

状态：已修复。

修复内容：

- 移除 `check-prerequisites.ps1` 文本模式下吞掉 `Test-FileExists` / `Test-DirHasFiles` 输出的 `Out-Null`。
- JSON 模式仍保持机器可读输出。

### H. 复核后低风险收口

状态：已修复。

修复内容：

- Gemini 复核未发现必须修复项。
- `tests/integrations/test_integration_catalog.py` 的默认 descriptor 样例改为 `sp.specify`，并保留单独 legacy 用例证明 `speckit.specify` 仍可兼容读取。
- 运行时 catalog 示例链接从 upstream `github/spec-kit` 改为当前 fork `flyfoxai/SpecPilot`，避免二次开发者照示例接回 upstream。
- `open-items.md` 的末尾说明从“empty table”改为“empty items section”，与当前模型友好的 block 结构一致。
- `.devcontainer/devcontainer.json` 的 Copilot prompt recommendation 从旧核心名 `speckit.*` 改为 `sp.*`。
- 开放 YAML schema 决策补充了未知字段冲突合并策略和文件大小软上限，避免“开放”变成不可控膨胀。

说明：README、installation、upgrade、quickstart 等文件中用于来源归因或 upstream 对比的 `github/spec-kit` 链接继续保留，不属于运行时下载源。

## 仍需观察或后续优化

### 1. 真实宿主对 `SKILL.md name` 的处理

状态：已由 ASK 真实安装检查触发修正。

背景：Codex 的 upstream 正常路径就是 hyphenated skill package；SP 额外生成 prompt/plugin 入口尝试进入 prompt namespace。问题不在 `.agents/skills/sp-*` 本身，而在旧 `.codex/*` 面、Claude core skills、以及文档把 on-disk 目录误写成用户调用语法或把 UI 显示当成安装器可保证结果。

建议：Codex core skill 目录和 frontmatter name 使用 `sp-<name>`；安装 refresh 清理旧 `.codex/*` core surfaces 和 Claude `.claude/skills` core variants。Forge 由于宿主要求 hyphenated frontmatter，继续保留 integration-specific `sp-*` name，但其命令文件仍是 `sp.*.md`。

### 2. Extension hook 解析脚本化

背景：Gemini 认为多个命令模板里让模型手工解析 hook YAML 会增加 token 消耗和跑偏风险。

影响：当前机制能工作，但复杂 extension 多了以后，模型读 YAML、过滤 enabled、处理 optional 的成本会变高。

建议：中期优化。不要本轮硬改成封闭解析器；已决策采用单个开放 YAML schema，脚本只读取稳定字段，未知字段忽略或原样保留。

### 3. 跨平台脚本契约对比

背景：PowerShell 文本输出问题已修，但 Bash / PowerShell 的 JSON 字段、错误信息和 edge case 还需要长期保持一致。

影响：如果不加契约测试，未来 Windows 和 Unix 行为可能再次分叉。

建议：后续为 `check-sp-memory` 和 `check-prerequisites` 增加 Bash / PowerShell JSON 契约对比测试。

### 4. Release workflow

背景：Gemini 提醒 `.github/workflows/` 可能仍保留 upstream release 假设。

影响：如果 fork 还没准备发布 PyPI / GitHub Release，自动发布 workflow 可能因 secret 或权限失败。

建议：发布前单独检查 release workflow。未准备发布前，禁用高风险自动发布，或者改为手动触发。

## 暂不建议修改的内容

- 不建议把用户入口改成 `/sp-*`。这和当前项目决策冲突。
- 不建议批量替换所有 `speckit.*`。extension / preset 命名空间、历史迁移、fixture、upstream 对比文档中可以保留。
- 不建议移动 `spec-template.md` 和 `plan-template.md` 到 feature 目录，仅凭静态审计不足以证明 upstream-like 路径错误。
- 不建议删除归档目录。归档目录不参与本轮机制对齐。
