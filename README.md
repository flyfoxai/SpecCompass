<div align="center">
    <img src="./media/logo_large.webp" alt="Spec Kit Logo" width="200" height="200"/>
    <h1>Spec Kit SP</h1>
    <h3><em>Spec Kit mechanics with stronger layered planning, memory, and verification.</em></h3>
</div>

Spec Kit SP is an enhanced fork of [github/spec-kit](https://github.com/github/spec-kit).

The principle is simple: keep the proven upstream Spec Kit "bottle" as intact as possible, including the directory skeleton, template shell, CLI installation flow, integration framework, and script entry points. SP changes the "water" inside that bottle by adding richer content for complex projects and AI-assisted development.

Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

## Why This Fork Exists

Upstream Spec Kit has a stable installation and runtime mechanism. In larger AI-assisted projects, however, plain `spec`, `plan`, and `tasks` can still be too thin.

Common problems SP tries to reduce:

- The model loses context, rereads too much, or misses important facts.
- Requirements, UI, workflows, APIs, tables, permissions, and acceptance checks drift apart.
- Risks, blockers, and pending decisions do not have a stable place to live.
- Stale documents can mislead the model into continuing down the wrong path.

SP does not try to replace upstream Spec Kit. It keeps the upstream mechanism and strengthens the content, memory routing, and verification discipline.

## What SP Adds

- Upstream-style `specify init`, templates, scripts, and agent integrations.
- User-facing core commands use `/sp.*`, for example `/sp.specify`, `/sp.plan`, and `/sp.analyze`.
- Skills-based agents such as Codex and Claude may store command files internally as `sp-<command>/SKILL.md`, but users should invoke the workflow as `/sp.*`.
- Layered artifacts for flow, UI, delivery, memory, trace, open items, and gates.
- Stronger `/sp.analyze`, `/sp.gate`, and `/sp.implement` rules for evidence checks, risk closure, fallback routing, and memory updates.
- Better support for splitting complex domains before the model context becomes too large.

## Install

Install the SP fork:

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/openSpecs.git
```

Upgrade an existing installation:

```bash
uv tool install specify-cli --force --from git+https://github.com/flyfoxai/openSpecs.git
```

Verify:

```bash
specify version
specify check
```

## Use With Codex

Create a new project:

```bash
specify init my-project --integration codex
cd my-project
```

Initialize an existing project:

```bash
cd /path/to/your/project
specify init . --integration codex
```

If the current environment does not have the target agent CLI installed, or you only want to install the templates first:

```bash
specify init . --integration codex --ignore-agent-tools
```

## Core Commands

| Command | Purpose |
| --- | --- |
| `/sp.constitution` | Create or update project principles, engineering constraints, and governance rules |
| `/sp.specify` | Create a feature specification: what to build and why |
| `/sp.clarify` | Clarify unclear requirements and record decisions |
| `/sp.plan` | Create the technical plan, architecture choices, and implementation route |
| `/sp.flow` | Create or refresh business flows, state flows, and sequence flows |
| `/sp.ui` | Create or refresh screens, screen maps, forms, and interaction notes |
| `/sp.tasks` | Break the plan into executable tasks |
| `/sp.analyze` | Check consistency and completeness across specs, plans, tasks, flow, UI, delivery, and memory |
| `/sp.gate` | Decide whether the current state can safely move to the next phase |
| `/sp.implement` | Execute tasks with verification and necessary memory updates |
| `/sp.bundle` | Package the current feature documents for review or delivery |
| `/sp.checklist` | Generate quality checklists for the current feature |

## Relationship With Upstream

Upstream [github/spec-kit](https://github.com/github/spec-kit) remains the baseline. Future upgrades should first align the upstream mechanism, then migrate SP's content improvements on top. This reduces drift in installation paths, host command behavior, script entry points, and template structure.

## License

This project follows the upstream Spec Kit license. See [LICENSE](./LICENSE).
