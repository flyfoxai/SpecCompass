# `sp` 与原版 `Spec Kit` 的 Agent 对齐说明

> 目标：确保 `sp` 的 agent 兼容范围尽量看齐原版 `Spec Kit`，而不是只覆盖少数常见 agent。
>
> 状态说明：这份文档主要记录对齐原则和历史分析。当前真实集成代码已经收敛为 project-local integrations；若个别段落仍引用旧的 Codex prompt 方案，应以当前集成代码和安装文档为准。

## 1. 对齐原则

`sp` 是基于原版 `Spec Kit` 的 fork 设计，不应在 agent 兼容面上明显退化。

因此这里采用以下原则：

- `sp` 的 agent 兼容范围应尽量跟随原版上游
- 不应只围绕 Claude、Codex、Gemini 设计
- 如果原版已支持某 agent，`sp` 应优先复用其接入方式
- 若 `sp` 自身新增 `flow / ui / gate / bundle` 命令，也应按原版的 agent 分发方式扩展出去
- agent 支持矩阵的真正来源应以上游 `README` / `AGENT_CONFIG` 为准，而不是本地手写小名单

## 2. 上游快照

按官方 `github/spec-kit` README 当前内容，作为 2026-03-31 的快照，原版已明确支持以下 agent：

- Qoder CLI
- Kiro CLI
- Amp
- Auggie CLI
- Claude Code
- CodeBuddy CLI
- Codex CLI
- Cursor
- Gemini CLI
- GitHub Copilot
- IBM Bob
- Jules
- Kilo Code
- opencode
- Pi Coding Agent
- Qwen Code
- Roo Code
- SHAI (OVHcloud)
- Tabnine CLI
- Mistral Vibe
- Kimi Code
- iFlow CLI
- Windsurf
- Junie
- Antigravity (`agy`)
- Trae
- Generic bring-your-own agent

说明：

- 这里的“快照日期”是 2026-03-31
- 后续若上游支持矩阵变化，应以最新上游为准

## 3. 关键上游约束

从上游官方说明里，当前至少有这些关键约束：

- Codex CLI 需要 `--ai-skills`
- Antigravity (`agy`) 也需要 `--ai-skills`
- 上游 Codex skills 模式使用 `$speckit-*`
- 当前仓库保留这些事实作为上游背景；在本仓当前实现里，Codex 也已经收敛为 project-local skills 集成
- 原版支持 `--ai generic --ai-commands-dir <path>` 的通用接入方式
- `specify check` 会按上游 `AGENT_CONFIG` 检查已配置的 CLI agent

这意味着 `sp` 在 fork 设计时不应做这些错误假设：

- 错误假设一：只要外形像 skills，就等于已经完整对齐 upstream 机制
- 错误假设二：只有固定少数 agent 需要被支持
- 错误假设三：不支持官方 generic agent 入口

## 4. `sp` 的对齐策略

## 4.1 第一原则

`sp` 应尽量继承原版的 agent 支持面，而不是重新发明一套更窄的兼容矩阵。

## 4.2 命令语义

不论 agent 类型如何，`sp` 的命令正文语义应保持一致：

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

## 4.3 触发方式

按上游当前实践，至少分成三类：

### A. slash command 类

示例：

- Claude Code
- Cursor
- Gemini CLI
- GitHub Copilot
- Kiro CLI
- Kilo Code
- Roo Code
- Windsurf
- Junie
- Trae

`sp` 对应策略：

- 使用 `/sp.*`
- 沿用各 agent 原有命令目录习惯

### B. project-local skills 类

示例：

- Codex CLI
- Antigravity (`agy`)
- Claude Code

`sp` 对应策略：

- 对当前 fork，Codex 使用 `.agents/skills/sp-*/SKILL.md`
- Claude 使用 `.claude/skills/sp-*/SKILL.md`
- Codex 常见触发形式为 `$sp-*`
- Claude 常见触发形式为 `/sp-*`
- 其他需要 skills 的 agent 也应尽量沿用上游 integration 方式适配

### C. generic bring-your-own 类

示例：

- 任何原版未内置、但支持自定义命令目录的 agent

`sp` 对应策略：

- 保留 `--ai generic --ai-commands-dir <path>` 能力
- `sp` 命令模板应可被 generic 目录直接消费

## 5. 当前阶段的设计结论

在当前“只做文档工作流”的阶段，至少要把下面几点写入规范：

- `sp` 的 agent 支持范围应尽量对齐上游
- 文档中应显式包含 Kiro CLI、Gemini CLI、Windsurf、Junie、Trae、Kilo Code 等，不应遗漏
- 文档中应显式保留 generic agent 支持
- 文档中应显式说明 skills 类 agent 不只 Codex 一个

## 6. 后续实施建议

当进入真实 fork 实施阶段时，应按下面顺序验证：

1. 先验证 Claude Code
2. 再验证 Codex CLI
3. 再验证 Gemini CLI
4. 再验证 Kiro CLI
5. 再验证 Windsurf / Roo Code / Kilo Code 这一类 IDE-based agent
6. 最后验证 generic agent 入口

## 7. 官方来源

本页结论主要参考以下官方来源：

- 原版 README 的 Supported AI Agents 与 CLI 参数说明
- 原版 Upgrade Guide 的 agent-specific 注意事项
