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
- Shorter built-in command names: `sp.*` for slash/dot hosts and `sp-*` for skills hosts.
- Richer feature structure: adds stronger `flow`, `ui`, `delivery`, `gate`, and `analysis` surfaces.
- More stable context: adds project memory, feature memory, routing, and hotspots files so agents can locate relevant context first.
- Stronger automation checks: `sp.analyze` verifies whether the document system is ready for later automation, not just whether files exist.

## Install And Use

Install [uv](https://docs.astral.sh/uv/) first.

Install from the user fork branch:

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/openSpecs.git@codex/sp-v0.8.11-rebase --force
```

Initialize a new project:

```bash
specify init my-project --integration codex
cd my-project
```

For Claude:

```bash
specify init my-project --integration claude
cd my-project
```

Common commands:

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
```

In skills-based hosts such as Codex and Claude, commands usually appear in hyphen form:

```text
$sp-constitution
$sp-specify
$sp-plan
$sp-tasks
$sp-analyze
$sp-implement
```

Recommended workflow:

```text
sp.constitution -> sp.specify -> sp.clarify -> sp.plan -> sp.flow/ui -> sp.tasks -> sp.gate -> sp.analyze -> sp.implement
```

## Notes

This project should continue tracking upstream Spec Kit mechanism changes where possible. The intended boundary is simple: keep installation and host integration close to upstream; put SP-specific improvements into command content, template quality, memory routing, and automation workflow.
