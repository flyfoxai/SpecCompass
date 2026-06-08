# `SpecCompass`

`sp` is a layered, documentation-first workflow adapted from `Spec Kit`.
The framework step names stay in `sp.*`; each agent only changes how those steps are triggered.

Its goal is not to jump straight to code. It first builds a queryable, traceable, incremental documentation skeleton so a model can work on one bounded area at a time under limited context.

The current workflow is documentation-first, not documentation-only. Implementation is allowed only as a downstream, bounded phase after `plan.md` records `Implementation Readiness` and `tasks.md` produces executable `Mode: impl` task packets.

## Core Ideas

- Two layers: business clarification first, delivery design second.
- Unified clarify: `sp.clarify` handles high-impact spec, flow, and UI decisions.
- Query-first memory: check project-level and feature-level memory before expanding source docs.
- Worksets: split large features into local work areas.
- Clarification propagation: once a decision changes, all affected docs and memory must be synced.

## Basic Flow

1. `sp.constitution`
2. `sp.specify`
3. `sp.clarify`
4. `sp.flow`
5. `sp.ui`
6. `sp.gate`
7. `sp.bundle`
8. `sp.plan`
9. `sp.tasks`
10. `sp.analyze`
11. `sp.gate`
12. `sp.implement`
13. `sp.analyze`
14. `sp.gate`

## Trigger Forms

- User-facing commands use the unified `sp.*` namespace on slash-command hosts. Claude-style hosts expose direct `/sp.*` commands.
- Codex uses skills as the stable entry point instead of project-local `/sp.*` slash commands: invoke `$sp-specify`, `$sp-plan`, `$sp-tasks`, `$sp-analyze`, `$sp-implement`, `$sp-gate`, or `$sp-ui`; run `/skills` and choose the matching `sp-*` skill; or ask in natural language when the task matches the skill description.
- Skills hosts keep upstream-style on-disk skill packages such as `sp-specify/SKILL.md`; in Codex, prefer explicit `$sp-*` or `/skills` invocation for deterministic SP workflow stages rather than expecting `/sp.*` slash commands.
- The active installer writes host integration files into the target project, not into archived global prompt directories

## Read Next

- Detailed overview: `docs/sp-overview-details.en.md`
- Command spec: `docs/reference/sp-command-spec.md`
- Memory architecture: `docs/reference/sp-context-memory-architecture.md`
- Installation and compatibility: `docs/reference/sp-installation-and-agent-compatibility.md`
