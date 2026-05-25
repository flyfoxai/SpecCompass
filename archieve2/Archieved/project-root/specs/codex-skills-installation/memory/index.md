# Feature Memory Index

## Question Routing Matrix

| If You Need To... | Read First | Then Expand Only If Needed | Primary Workset |
| --- | --- | --- | --- |
| 确认这个 feature 现在到底解决什么 | `memory/stable-context.md` | `spec.md` | none |
| 查当前 prompt-only 收口结论 | `analysis.md` | `memory/open-items.md` | none |
| 看安装器已经覆盖哪些 Codex 集成要求 | `spec.md` | `scripts/install.ps1`, `scripts/install.sh`, `README.md` | none |
| 看尚未完全收口的兼容问题 | `memory/open-items.md` | `analysis.md` | none |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Feature | `codex-skills-installation` |
| Stage | prompt-only cleanup recorded |
| Latest Gate | `Not Run` |
| Latest Analysis | `PASS WITH FOLLOW-UP` |
| Refresh Date | `2026-04-12` |
| Refresh Basis | `spec.md`, `analysis.md`, current installer and doc cleanup |
| Source Of Truth | `spec.md`, `analysis.md`, current installer scripts and docs |
| Required Sync Files | `memory/stable-context.md`, `memory/open-items.md`, `.specify/memory/feature-map.md`, `.specify/memory/active-context.md` |
| Stale Trigger | installer entry policy changes, Codex trigger wording changes, legacy cleanup policy changes |

## Recommended Read Order

1. `memory/index.md`
2. `memory/stable-context.md`
3. `spec.md`
4. `analysis.md`
5. `memory/open-items.md`

## Hotspots

| Hotspot | Why It Matters | Where To Start |
| --- | --- | --- |
| prompts vs commands consistency | directly determines Codex visibility and discoverability | `memory/stable-context.md` |
| legacy cleanup wording | causes false expectations if docs drift from installer behavior | `spec.md`, `analysis.md` |
| compatibility parameter drift | keeps old skills mental model alive longer than necessary | `memory/open-items.md` |

## Open Items Entry

| Priority | Current Focus | Start Here |
| --- | --- | --- |
| `Medium` | compatibility shrink and naming cleanup | `memory/open-items.md` |
