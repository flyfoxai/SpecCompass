# Open Items

| Item ID | Type | Severity | Domain | Workset | Description | Impact Area | Affected Docs | Suggested Rollback | Last Refresh | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OPEN-CODEX-002` | `Question` | `Medium` | compatibility | none | `--ai-skills` / `-AiSkills` 何时彻底移除，而不是继续保留为空操作。 | installer UX, docs | `spec.md`, installer docs | `sp.clarify` | `2026-04-13` | `Open` |
| `RISK-CODEX-001` | `Risk` | `Medium` | historical naming | none | feature 目录名仍是 `codex-skills-installation`，容易让维护者误以为 skills 仍是现行方案。 | maintainer understanding | `analysis.md`, `memory/*` | `sp.gate` | `2026-04-13` | `Open` |
| `RISK-CODEX-002` | `Risk` | `Medium` | docs drift | none | 如果 README、兼容文档和安装脚本的 trigger 文案再次漂移，用户仍可能回到错误的旧路径。 | user testing path | `analysis.md`, `README.md`, `docs/*` | `sp.gate` | `2026-04-13` | `Open` |
| `RISK-CODEX-003` | `Risk` | `Low` | regression coverage | none | 当前已完成 prompt-only 收敛，但仍建议补一份 Windows smoke checklist。 | regression verification | `analysis.md` | `sp.plan` | `2026-04-13` | `Open` |

## Filter Views

| If You Are Working On... | Read These IDs First | Main Workset | Main Rollback |
| --- | --- | --- | --- |
| 安装器命名清晰度 | `RISK-CODEX-001` | none | `sp.gate` |
| 兼容参数收缩 | `OPEN-CODEX-002` | none | `sp.clarify` |
| trigger 与文案一致性 | `RISK-CODEX-002` | none | `sp.gate` |
| Windows 回归覆盖 | `RISK-CODEX-003` | none | `sp.plan` |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Open Questions | `1` |
| Risks | `3` |
| Blockers | `0 active` |
| Highest Priority Domain | compatibility shrink and docs drift |
| Refresh Date | `2026-04-13` |
| Refresh Basis | `spec.md`, `analysis.md`, current installer evidence |
| Source Of Truth | `spec.md`, `analysis.md` |
| Required Sync Files | `memory/index.md`, `memory/stable-context.md`, `.specify/memory/active-context.md`, `.specify/memory/feature-map.md` |
| Stale Trigger | installer mode policy changes, trigger policy changes, compatibility parameter removal |
