# Stable Context

## Freshness And Sync

| Key | Value |
| --- | --- |
| Feature | `codex-skills-installation` |
| Status | historical skills path retired; prompt-only Codex integration is current |
| Refresh Date | `2026-04-12` |
| Refresh Basis | `spec.md`, `analysis.md`, `README.md`, `scripts/install.ps1`, `scripts/install.sh` |
| Source Of Truth | `spec.md`, `analysis.md`, installer scripts, compatibility docs |
| Required Sync Files | `memory/index.md`, `memory/open-items.md`, `.specify/memory/active-context.md`, `.specify/memory/feature-map.md` |
| Stale Trigger | Codex trigger form changes, install mode changes, manifest field changes, legacy cleanup policy changes |

## Role Lookup

| Role ID | Core Actions | Main Artifact | Notes |
| --- | --- | --- | --- |
| `ROLE-USER` | run installer, inspect output, trigger prompts | `scripts/install.ps1`, `README.md` | should not infer readiness from starter-pack-only output |
| `ROLE-INSTALLER` | copy assets, validate mode, write prompts and mirrored commands, clean legacy outputs | `scripts/install.ps1`, `scripts/install.sh` | owns success criteria |
| `ROLE-CODEX` | discover `sp.*` from prompts/commands | resolved Codex prompt directories | trigger form is `/prompts:sp.*` |
| `ROLE-MAINTAINER` | keep scripts, docs, and validation matrix aligned | `docs/*`, `README*` | owns drift prevention |

## Install Mode Lookup

| Mode ID | Mode | Required Flags | Expected Outcome | Wrong Assumption To Avoid |
| --- | --- | --- | --- | --- |
| `MODE-SP-ONLY` | starter pack only | none | project docs, layers, `.specify/memory`, `specs`, manifest | do not treat this as Codex integration |
| `MODE-CODEX` | starter pack plus Codex prompts | `-Ai codex` or `--ai codex` (`-AiSkills` / `--ai-skills` only as compatibility alias) | project assets plus `sp.*` prompts in prompts and commands mirror | do not route back to legacy skills |

## Trigger Lookup

| Target | Trigger Form | Stable Rule |
| --- | --- | --- |
| Codex Desktop | `/prompts:sp.*` | current supported Codex trigger |
| slash-command agents | `/sp.*` | not a Codex trigger form |

## Path Resolution Lookup

| Rule ID | Condition | Expected Resolution |
| --- | --- | --- |
| `PATH-CODEX-001` | `CODEX_HOME` is set | use `CODEX_HOME` as Codex home |
| `PATH-CODEX-002` | `CODEX_HOME` is empty on Windows | fall back to `%USERPROFILE%\.codex` |
| `PATH-CODEX-003` | Codex home resolved | prompts directory is `<codex_home>/prompts` |
| `PATH-CODEX-004` | Codex home resolved | commands mirror directory is `<codex_home>/commands` |
| `PATH-CODEX-005` | legacy skills directory exists | clean `sp-*` entries if present |
| `PATH-CODEX-006` | prompts or commands unresolved or unwritable | fail installation loudly |

## Stable Decisions

| Decision ID | Question | Stable Answer | Primary Evidence |
| --- | --- | --- | --- |
| `DEC-CODEX-001` | should Codex be tested with `/prompts:sp.*` | yes | README, compatibility docs, installer output |
| `DEC-CODEX-002` | is manifest-only output enough to claim Codex success | no; prompts and commands must actually be written | `spec.md`, current installer logic |
| `DEC-CODEX-003` | should legacy `sp-*` skills remain installable | no; only cleanup remains | current installer logic and repo asset cleanup |

## Acceptance Anchors

| Anchor ID | What Must Be True |
| --- | --- |
| `ACC-CODEX-001` | starter-pack-only output clearly says no agent integration was installed |
| `ACC-CODEX-002` | Codex mode output shows detected `CODEX_HOME`, resolved Codex home, prompts dir, and commands dir |
| `ACC-CODEX-003` | Codex mode writes one or more `/prompts:sp.*` files into prompts and commands |
| `ACC-CODEX-004` | Codex mode prints `/prompts:sp.specify` and `/prompts:sp.analyze` examples |
| `ACC-CODEX-005` | unresolved or unwritable prompt directories cause failure, not silent success |
| `ACC-CODEX-006` | legacy `sp-*` skills are removed only as cleanup, not installed as a runtime dependency |
