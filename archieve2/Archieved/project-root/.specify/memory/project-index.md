# Project Memory Index

## Question Routing Matrix

| If The Question Is About... | Keywords | Recommended Feature | Read First | Next Hop |
| --- | --- | --- | --- | --- |
| project rules, phase boundaries, what is forbidden now | constitution, boundary, phase, scope, implement | project-level | `constitution.md` | `docs/sp-command-spec.md` |
| Windows installer, Codex skills, `$sp-*`, `CODEX_HOME`, starter pack vs Codex integration | codex, windows, installer, skills, CODEX_HOME, ai-skills, sp-* | `codex-skills-installation` | `active-context.md` | `specs/codex-skills-installation/memory/index.md` |
| which feature to enter, what to read first, current smallest work area | active feature, read order, workset, smallest context | `codex-skills-installation` | `active-context.md` | `specs/codex-skills-installation/memory/index.md` |
| overall feature stage, gate verdict, readiness, workset count | stage, verdict, readiness, gate, analyze | `codex-skills-installation` | `feature-map.md` | `specs/codex-skills-installation/analysis.md` |
| shared object, business domain, cross-feature consistency | domain, object, shared rule, ownership | `attendance-leave` | `domain-map.md` | `specs/attendance-leave/memory/stable-context.md` |
| repeated high-risk topics, rollback entry, where drift may happen | hotspot, risk, rollback, drift | `attendance-leave` | `hotspots.md` | `specs/attendance-leave/memory/open-items.md` |
| whether the sample pack proves query-first routing | sample pack, memory pack, routing example | `attendance-leave` | `specs/attendance-leave/memory/index.md` | `specs/attendance-leave/bundle.md` |

## Current Snapshot

| Key | Value |
| --- | --- |
| Project | `speckit-layered` |
| Stage | document-stage framework design |
| Active Feature | `codex-skills-installation` |
| Primary Workset | `none` |
| Latest Gate | `Not Run` |
| Latest Analysis | `FAIL` |
| Refresh Date | `2026-04-06` |

## Current Minimum Read Set

| Order | File | Why It Is In The Minimum Set |
| --- | --- | --- |
| 1 | `project-index.md` | first-hop routing |
| 2 | `active-context.md` | current feature and workset selection |
| 3 | `specs/codex-skills-installation/memory/index.md` | feature-level routing |
| 4 | `specs/codex-skills-installation/spec.md` | baseline requirement and success criteria |
| 5 | `specs/codex-skills-installation/analysis.md` | current verdict and rollback entry |

## Current Focus

| Topic | Recommended Entry | Why Now |
| --- | --- | --- |
| Windows Codex installer regression | `specs/codex-skills-installation/spec.md` | current user evidence needs a stable feature entry |
| current verdict and rollback | `specs/codex-skills-installation/analysis.md` | clarifies why the feature is not yet automation-ready |
| query-first memory route for the new feature | `specs/codex-skills-installation/memory/index.md` | gives later agents a bounded read set |

## Latest Summary

- Project-level and feature-level memory layers are defined for both the sample feature and the new Codex installer feature.
- The active feature has shifted to the Windows Codex installer regression so later agents do not route into the unrelated sample feature by default.
- The new feature currently records baseline requirements and analysis only; readiness remains blocked on later document steps.
