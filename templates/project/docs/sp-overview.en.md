# `SpecCompass`

`sp` is a layered, documentation-first workflow adapted from `Spec Kit`.
The framework step names stay in `sp.*`; each agent only changes how those steps are triggered.

Its goal is not to jump straight to code. It first builds a queryable, traceable, incremental documentation skeleton so a model can work on one bounded area at a time under limited context.

The current workflow is documentation-first, not documentation-only. Implementation is allowed only as a downstream, bounded phase after `plan.md` records `Implementation Readiness` and `tasks.md` produces executable `Mode: impl` task packets.

`sp.prd` is mandatory for new feature work. Clear requests can use a lean PRD, but they still need upstream intent, source tags, and PRD-to-spec outline readiness before `sp.specify`.

## Core Ideas

- Two layers: business clarification first, delivery design second.
- Mandatory PRD intake: `sp.prd` grows product intent into a draft and records outline readiness, but `prd.md` is not a stable fact source.
- Unified clarify: `sp.clarify` handles high-impact spec, flow, and UI decisions.
- Query-first memory: check project-level and feature-level memory before expanding source docs.
- Worksets: split large features into local work areas.
- Code continuation packets: implementation tasks name the smallest `Read Set`, direct dependency checks, reverse-trace needs, expected delta, `Delta Summary`, and proposed shared updates.
- Delta-first review: after implementation, review `Delta Summary` and current diff before rereading wider source context.
- Clarification propagation: once a decision changes, all affected docs and memory must be synced.

## Basic Flow

1. `sp.constitution`
2. `sp.prd`
3. `sp.specify`
4. `sp.clarify`
5. `sp.flow`
6. `sp.ui`
7. `sp.gate`
8. `sp.bundle`
9. `sp.plan`
10. `sp.tasks`
11. `sp.analyze`
12. `sp.gate`
13. `sp.implement`
14. `sp.analyze`
15. `sp.gate`

## Trigger Forms

- User-facing commands use the unified `sp.*` namespace on slash-command hosts. Claude-style hosts expose direct `/sp.*` commands.
- Codex uses skills as the stable entry point instead of project-local `/sp.*` slash commands: invoke `$sp-prd`, `$sp-specify`, `$sp-plan`, `$sp-tasks`, `$sp-analyze`, `$sp-implement`, `$sp-gate`, or `$sp-ui`; run `/skills` and choose the matching `sp-*` skill; or ask in natural language when the task matches the skill description.
- Skills hosts keep upstream-style on-disk skill packages such as `sp-specify/SKILL.md`; in Codex, prefer explicit `$sp-*` or `/skills` invocation for deterministic SP workflow stages rather than expecting `/sp.*` slash commands.
- The active installer writes host integration files into the target project, not into archived global prompt directories

## Code Stage Discipline

- `sp.plan` owns `Implementation Readiness`, code/test mapping, dependency surface, and reverse-trace expectations.
- `Stage Readiness` should carry an evidence signature: source files, anchors, open-item state, visual/human review status, and current checks. Human-confirmed facts need a traceable decision record.
- `sp.flow` runs before `sp.ui`; first-time, high-risk, or large flow/UI changes should end as reviewable drafts with visible labels until the user confirms or selects a repair option.
- `sp.tasks` turns ready worksets into `Mode: impl` task packets with `Allowed Write Set`, `Required Checks`, `Read Set`, dependency checks, reverse-trace checks, expected delta, and proposed updates.
- `sp.implement` starts from memory and the task packet, edits only the selected authorized task, and fills `Delta Summary` before claiming completion.
- `sp.analyze` and `sp.gate` review implementation work delta-first: `Delta Summary`, current diff, task packet, trace/open-items, then necessary source code.
- Lightweight scripts check structure and links, but they do not prove business semantics. Use analyze/gate to decide semantic readiness from source docs, evidence, and decisions.
- Multi-agent workers should keep shared memory read-only unless assigned as coordinator; proposed shared updates are merged serially.

## Read Next

- Detailed overview: `docs/sp-overview-details.en.md`
- Command spec: `docs/reference/sp-command-spec.md`
- Memory architecture: `docs/reference/sp-context-memory-architecture.md`
- Installation and compatibility: `docs/reference/sp-installation-and-agent-compatibility.md`
