# Cross-Document Analysis

## Final Verdict

| Verdict | Allow Later Automation | Reason |
| --- | --- | --- |
| `PASS WITH FOLLOW-UP` | `Yes, with narrow scope` | 当前仓库已经完成 prompt-only 收敛，安装器、README 与兼容文档不再把 Codex skills 当成现行机制；剩余问题主要是历史命名和后续文档精简，不再是运行链路阻塞。 |

## Passed Items

- 当前仓库文档已把 Codex 触发方式统一为 `/prompts:sp.*`
- 当前 `scripts/install.ps1` 与 `scripts/install.sh` 都按 prompts + commands mirror 工作
- 当前安装器会清理遗留 `speckit.*` prompt/command 文件
- 当前安装器会清理遗留 `sp-*` skills 目录，但不再安装新的 skills
- 当前 manifest 结构已记录 `codexPromptsDir`、`codexCommandsDir`、安装列表与清理结果
- 当前仓库已删除 `installer-assets/codex-skills/` 的分发内容

## Findings

- 原先把 Codex 集成建立在 skills 分发之上，会把安装、发现、宿主兼容和排障链路同时复杂化
- 现在真正承载 `sp.*` 语义的是 prompt 文件和项目资产层，不是 skills 包装
- 只保留 legacy skills cleanup，既能兼容旧环境，也不会继续扩大当前机制表面积

## Remaining Follow-Up

- feature 目录名 `codex-skills-installation` 仍然带有历史命名色彩，但内容已转为 prompt-only 背景说明
- `--ai-skills` / `-AiSkills` 目前仍保留为兼容空操作，后续可以择机彻底移除
- 仍建议补一份面向 Windows 的专门 smoke checklist，降低 Codex 回归成本

## Summary

当前仓库已经不再依赖 Codex skills 才能使用 `sp.*`。真正稳定的方案是：

- 项目资产层承载 workflow 内容
- `CODEX_HOME/prompts` 承载 Codex 可见入口
- `CODEX_HOME/commands` 作为兼容镜像
- `CODEX_HOME/skills/sp-*` 只作为历史残留清理目标

因此，这个 feature 现在应被理解为“完成了从 skills 假设迁移到 prompt-only 的收口”。

## Evidence

- `README.md`
- `README.en.md`
- `docs/reference/sp-installation-and-agent-compatibility.md`
- `docs/reference/sp-agent-validation-matrix.md`
- `scripts/install.ps1`
- `scripts/install.sh`

## Suggested Rollback Step

如果后续又出现 Codex 相关漂移，优先回到：

1. `docs/reference/sp-installation-and-agent-compatibility.md`
2. `scripts/install.ps1`
3. `scripts/install.sh`
4. 当前 feature 的 `memory/stable-context.md`
