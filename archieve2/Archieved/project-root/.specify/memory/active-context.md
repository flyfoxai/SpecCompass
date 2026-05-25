# Active Context

## Current Goal And Minimum Read Set

| Key | Value |
| --- | --- |
| Current Goal | turn the Windows Codex installer regression into a stable, query-first feature entry with explicit success and failure criteria |
| Active Feature | `codex-skills-installation` |
| Primary Workset | `none` |
| Highest Risk | readiness drift between current implementation evidence and incomplete feature-level docs |
| No-Go Boundary | do not enter production implementation and do not pretend the feature is automation-ready before clarify and gate are complete |
| Refresh Date | `2026-04-06` |
| Refresh Basis | `.specify/memory/project-index.md`, `specs/codex-skills-installation/memory/index.md`, `specs/codex-skills-installation/memory/open-items.md` |
| Source Of Truth | `.specify/memory/project-index.md`, `specs/codex-skills-installation/memory/index.md`, `specs/codex-skills-installation/spec.md` |
| Required Sync Files | `.specify/memory/feature-map.md`, `specs/codex-skills-installation/memory/index.md`, `specs/codex-skills-installation/memory/open-items.md` |
| Stale Trigger | installer mode policy changes, trigger wording changes, Windows fallback changes, minimum read set changes |

## Minimum Read Set

| Order | File | Why It Is Required |
| --- | --- | --- |
| 1 | `.specify/memory/project-index.md` | confirms project-level route |
| 2 | `.specify/memory/active-context.md` | confirms current smallest useful read set |
| 3 | `specs/codex-skills-installation/memory/index.md` | selects the active feature route |
| 4 | `specs/codex-skills-installation/spec.md` | captures the baseline requirement and success criteria |
| 5 | `specs/codex-skills-installation/analysis.md` | exposes current verdict, missing inputs, and rollback |

## Workset Routing

| If You Need To... | Choose | Why |
| --- | --- | --- |
| review the baseline requirement and current verdict | `none` | this feature is not split into worksets yet |
| revisit installer entry policy or trigger wording | `none` | current gaps are policy-level and cross-document |
| plan Windows regression coverage | `none` | requires later `sp.plan`, not a current workset |

## Forced Clarify Flush Checkpoints

| When | Why |
| --- | --- |
| before `sp.gate` | route-level questions must not stay hidden in batch queues |
| before `sp.bundle` | stable bundle must not carry unresolved route conflicts |
| before `sp.plan` | delivery design must inherit a stable business frame |

## Current Highest-Risk Area

| Priority | Topic | Entry |
| --- | --- | --- |
| `High` | readiness drift between implementation evidence and feature docs | `specs/codex-skills-installation/analysis.md` |
| `High` | installer entry strategy and trigger wording drift | `specs/codex-skills-installation/memory/open-items.md` |
