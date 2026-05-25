# `speckit-layered`

`sp` is a layered documentation workflow adapted from `Spec Kit`.
The framework step names stay in `sp.*`; each agent only changes how those steps are triggered.

Its goal is not to jump straight to code. It first builds a queryable, traceable, incremental documentation skeleton so a model can work on one bounded area at a time under limited context.

The current phase covers documentation only. The workflow ends at `sp.analyze` and does not include implementation.

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

## Trigger Forms

- Codex Desktop prompts use `/prompts:sp.*`
- Slash-command agents use `/sp.*`
- `/prompts:sp.*` files are written into the Codex directories only when Codex mode is enabled during installation; the installer also removes legacy `sp-*` skill directories

## Read Next

- Detailed overview: `docs/sp-overview-details.en.md`
- Command spec: `docs/sp-command-spec.md`
- Memory architecture: `docs/sp-context-memory-architecture.md`
- Installation and compatibility: `docs/sp-installation-and-agent-compatibility.md`
