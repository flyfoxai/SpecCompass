# OpenSpecs SP

[中文](./README.md)

OpenSpecs SP is a Spec-Driven Development toolkit based on [GitHub Spec Kit](https://github.com/github/spec-kit). This repository currently uses Spec Kit `v0.8.11` as the mechanism baseline. It keeps the upstream install framework, CLI shape, integration model, and script structure, while changing the command content, document structure, and context-management layer.

## Upstream Source

The upstream project is GitHub Spec Kit:

```text
https://github.com/github/spec-kit
```

OpenSpecs SP is not a rewrite. It keeps the upstream “bottle” and replaces the workflow “content” with a version designed for stronger automation. The goal is to reuse the stable upstream mechanism instead of inventing a fragile parallel framework.

## Why Change It

Spec Kit already connects specification, planning, tasks, and implementation. For larger projects and long-running agent work, SP adds structure to reduce common failure points:

- Documents need clearer layers and ownership so the model does not read everything at once.
- Flow, UI, delivery, gate, and analysis information should be explicit instead of repeatedly inferred.
- Project-level and feature-level memory should preserve routing context across multiple agent turns.
- The workflow should support lower token cost, less repeated reasoning, fewer mistakes, and more autonomous development.

## Advantages

- Upstream-compatible install mechanism: still uses `specify init`, integration registry, shared scripts, and packaged templates.
- Shorter built-in command names: user-facing built-in calls use `sp.*`; `sp-*` is only an internal skill package/directory name for skills hosts.
- Richer feature structure: adds stronger `flow`, `ui`, `delivery`, `gate`, and `analysis` surfaces.
- More stable context: adds project memory, feature memory, routing, and hotspots files so agents can locate relevant context first.
- Stronger automation checks: `sp.analyze` verifies whether the document system is ready for later automation, not just whether files exist.

## Install And Use

Install [uv](https://docs.astral.sh/uv/) first.

Install the CLI from the user fork branch:

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/openSpecs.git@codex/sp-v0.8.11-rebase --force
```

Initialize a new project with the host you actually use:

```bash
specify init my-project --integration codex
cd my-project
```

Claude and Copilot are also available:

```bash
specify init my-project --integration claude
specify init my-project --integration copilot
```

After entering the project, call commands from your AI host. User-visible commands always use dotted names:

```text
/sp.constitution
/sp.specify
/sp.clarify
/sp.plan
/sp.flow
/sp.ui
/sp.tasks
/sp.gate
/sp.analyze
/sp.bundle
/sp.implement
/sp.checklist
/sp.taskstoissues
```

In skills-based hosts such as Codex and Claude, use `/sp.*` calls too. The installed `sp-*` names are internal skill package names, not commands users should type manually.

### Command Reference

| Command | Purpose |
|---|---|
| `/sp.constitution` | Establish or refresh project principles, constraints, and long-term working rules. |
| `/sp.specify` | Create or refresh the baseline feature specification and feature routing. |
| `/sp.clarify` | Ask high-impact clarification questions before planning to reduce ambiguity. |
| `/sp.plan` | Convert validated requirements into a delivery plan, design outputs, and worksets. |
| `/sp.flow` | Model business flows, states, branches, and sequence paths. |
| `/sp.ui` | Model screens, interactions, form data, and UI-to-delivery relationships. |
| `/sp.tasks` | Convert worksets, deliverables, and acceptance points into executable tasks. |
| `/sp.gate` | Run a stage gate decision on document quality before moving forward. |
| `/sp.analyze` | Check cross-document consistency, gaps, and automation readiness. |
| `/sp.bundle` | Package stable document conclusions for implementation or review. |
| `/sp.implement` | Execute implementation work after documents and tasks are ready. |
| `/sp.checklist` | Generate or check a quality checklist for the current feature. |
| `/sp.taskstoissues` | Convert tasks into dependency-ordered GitHub issues. |

### Recommended Workflow

```text
/sp.constitution -> /sp.specify -> /sp.clarify -> /sp.plan -> /sp.flow + /sp.ui -> /sp.tasks -> /sp.gate -> /sp.analyze -> /sp.implement
```

Notes:

- `/sp.clarify` is optional, but should run when requirements are unclear.
- `/sp.flow` and `/sp.ui` are used when the feature has meaningful business flow or UI complexity.
- `/sp.bundle` is usually run after documents are stable and before implementation or review handoff.
- `/sp.checklist` and `/sp.taskstoissues` are helper commands; use them when your team needs them.

## Notes

This project should continue tracking upstream Spec Kit mechanism changes where possible. The intended boundary is simple: keep installation and host integration close to upstream; put SP-specific improvements into command content, template quality, memory routing, and automation workflow.
