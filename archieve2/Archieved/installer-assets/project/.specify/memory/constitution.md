# `sp` Project Constitution

## Query-First Defaults

| Rule | Default |
| --- | --- |
| Project Entry | `project-index.md` |
| Feature Entry | `specs/<feature>/memory/index.md` |
| Default Active Feature Count | `1` |
| Default Primary Workset Count | `1` |
| Project Minimum Read Set | up to `5` files |
| Current Phase Ceiling | `sp.analyze` |

## Scope

- This project uses the `sp` layered document workflow.
- The current stage covers documentation only.
- `sp.implement` is not part of the current phase.

## Layer Rules

- Layer 1 covers business clarification:
  - `sp.specify`
  - `sp.clarify`
  - `sp.flow`
  - `sp.ui`
  - `sp.gate`
  - `sp.bundle`
- Layer 2 covers delivery design documentation:
  - `sp.plan`
  - `sp.tasks`
  - `sp.analyze`

## Hard Boundaries

- Do not write production code in this phase.
- Do not turn unresolved questions into fixed implementation commitments.
- Do not skip `sp.gate` before entering second-layer work.
- The document workflow ends at `sp.analyze`.

## Representation Rules

- Flow documentation uses Mermaid.
- UI documentation uses Markdown plus JSON Forms when needed.
- Stable facts, rules, screens, APIs, tables, and acceptance anchors should use stable IDs.

## Memory Rules

- Project-level routing lives in `.specify/memory/*`.
- Feature-level routing lives in `specs/<feature>/memory/*`.
- Read project memory before deciding which feature to expand.
- Read feature memory before expanding source docs.
- Memory files must prioritize routing tables, lookup tables, and hotspots over long narrative text.
- Batch clarification queues must be queryable by topic, not buried in narrative text.

## Refresh Rules

- `sp.constitution` initializes the full project memory layer.
- `sp.specify` refreshes `feature-map.md` and `active-context.md`.
- `sp.gate` refreshes project-level verdict visibility.
- `sp.bundle` refreshes the minimum read set and current recommended workset.
- `sp.plan` refreshes workset counts and primary workset routing.
- `sp.analyze` refreshes project hotspots and latest readiness summary.

## Compatibility Rules

- Keep compatibility with the original Spec Kit workflow where practical.
- Preserve active feature detection from Git branch or `SPECIFY_FEATURE`.
- Preserve cross-platform behavior for macOS, Linux, and Windows.
- Preserve broad agent compatibility across slash-command agents and skills-style agents.
