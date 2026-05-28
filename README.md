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

SP is packaged as a standalone enhanced edition. Users install and use this fork directly; no separate upstream alignment step is required.

## What SP Adds

- Upstream-style `specify init`, templates, scripts, and agent integrations.
- User-facing core commands use the `sp.*` namespace, for example `/sp.specify`, `/sp.plan`, and `/sp.analyze`.
- Codex installs executable skills in `.agents/skills/sp-*/SKILL.md`, prompt companions in `.codex/prompts/sp.*.md`, and a project-local plugin marketplace under `.agents/plugins/`; `/prompt::sp.*` visibility depends on the current Codex client and must be verified in the real slash menu.
- Claude and markdown-style hosts expose direct slash commands such as `/sp.analyze` through their normal command directories.
- Layered artifacts for flow, UI, delivery, memory, trace, open items, and gates.
- Stable coding and anchor rules for features, worksets, UI, APIs, risks, tests, and trace links, so the model can search and update related content without rereading everything.
- Project memory for active context, feature map, hotspots, open items, and trace index, with rules for when to write back and when to avoid repeated checks.
- Stronger `/sp.analyze`, `/sp.gate`, and `/sp.implement` rules for evidence checks, risk closure, fallback routing, headless failure reports, and memory updates.
- Guardrails for unclear or conflicting requirements: ask for a decision, route back to the right `/sp.*` phase, and avoid guessing through business contradictions.
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

For Codex, `specify init . --integration codex` attempts to register the project-local SP plugin automatically. If you used `--ignore-agent-tools` or registration failed, read `.agents/plugins/CODEX_PLUGIN_REGISTRATION.md` and run the two commands shown there. After registration, restart or refresh Codex and verify whether your client exposes `/prompt::sp.*` in the slash menu.

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

SP comes from [github/spec-kit](https://github.com/github/spec-kit) and keeps its proven installation and workflow style where practical. For users, this repository is the install target: install SP, initialize a project, and run `/sp.*` commands directly.

## License

This project follows the upstream Spec Kit license. See [LICENSE](./LICENSE).
