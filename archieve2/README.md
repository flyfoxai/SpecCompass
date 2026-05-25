<div align="center">
    <img src="./media/logo_large.webp" alt="OpenSpecs Logo" width="200" height="200"/>
    <h1>OpenSpecs</h1>
    <h3><em>Keep the upstream bottle. Improve the workflow content.</em></h3>
</div>

<p align="center">
    <strong>A mechanically upstream-aligned Spec Kit fork that keeps the layout, template shell, and installer framing close to <code>github/spec-kit</code> while replacing the active workflow semantics with layered <code>sp.*</code> document-stage commands.</strong>
</p>

---

## Table of Contents

- [What is OpenSpecs?](#what-is-openspecs)
- [Get Started](#get-started)
- [Supported AI Hosts](#supported-ai-hosts)
- [Core Philosophy](#core-philosophy)
- [Development Phases](#development-phases)
- [Learn More](#learn-more)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## What is OpenSpecs?

OpenSpecs is a forked workflow built on top of the Spec Kit mechanism frame. The project keeps the
upstream directory layout, command-template shell, helper-script framing, and installation model
where practical, but replaces the active workflow content with a layered `sp.*` process.

Instead of letting the model jump from one short prompt directly into production code, OpenSpecs
forces a documentation-first path:

- first define the business requirement and boundaries
- then resolve clarifications and first-layer review artifacts
- then organize delivery design and worksets
- then analyze whether the document system is strong enough for later automation

The current repository is intentionally narrower than upstream Spec Kit:

- it focuses on documentation-stage workflow outputs
- it stops at `sp.analyze`
- it does not treat production code generation as the active repository promise

## Get Started

### 1. Install the starter pack

Install the starter pack into a target project:

```bash
sh scripts/install.sh ./your-project
sh scripts/install.sh --ai codex ./your-project
sh scripts/install.sh --ai claude ./your-project
```

On Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 .\your-project
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\your-project
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude .\your-project
```

For remote archive installs:

```bash
curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project
SP_INSTALL_AI=codex curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project
```

### 2. Establish project principles

Use the trigger form that matches the installed host integration to define project-level rules,
routing discipline, and documentation boundaries.

Examples:

- Codex: `$sp-constitution`
- Claude: `/sp-constitution`
- slash-command hosts: `/sp.constitution`

### 3. Create the spec

Use the installed `sp` command or skill to capture the business requirement and scope.

Examples:

- Codex: `$sp-specify Build a leave request workflow for employees and managers. Focus on business rules, approval paths, and success criteria.`
- Claude: `/sp-specify Build a leave request workflow for employees and managers. Focus on business rules, approval paths, and success criteria.`
- slash-command hosts: `/sp.specify Build a leave request workflow for employees and managers. Focus on business rules, approval paths, and success criteria.`

### 4. Build the document set

Use `sp.clarify`, `sp.flow`, `sp.ui`, `sp.gate`, and `sp.bundle` to complete the first-layer
business document set and prepare the delivery handoff.

### 5. Build the delivery plan

Use `sp.plan` and `sp.tasks` to create worksets, relationships, and executable documentation tasks.

### 6. Analyze the document system

Use the installed `sp.analyze` entry to decide whether the full document system is strong enough
for later automation.

## Supported AI Hosts

OpenSpecs keeps `sp.*` as the workflow identifier while changing only the host trigger surface:

- Codex installs project-local skills into `.agents/skills/sp-*/SKILL.md` and uses `$sp-*`
- Claude installs project-local skills into `.claude/skills/sp-*/SKILL.md` and uses `/sp-*`
- Copilot installs `.github/agents/sp.*.agent.md` plus companion `.github/prompts/sp.*.prompt.md`
- hostless install remains available when you only want the project starter-pack files

Quick verification:

```bash
find ./your-project/.agents/skills -maxdepth 2 -name SKILL.md
find ./your-project/.claude/skills -maxdepth 2 -name SKILL.md
find ./your-project/.github/agents -maxdepth 1 -name 'sp.*.agent.md'
```

## Core Philosophy

OpenSpecs is organized around these principles:

- **Keep the upstream bottle where possible** so directory layout, template placement, and install behavior remain predictable
- **Keep `sp` as the workflow content layer** so the main differences live in staged document semantics rather than packaging inventions
- **Prefer routing and memory discipline** over broad document or source sweeps
- **Reduce mechanism drift before adding new content ideas**

## Development Phases

| Phase | Focus | Key Activities |
|-------|-------|----------------|
| **Project Routing** | Establish project-level rules | Define constitution, project memory, and active context |
| **Business Clarification** | Specify what and why | Create `spec.md`, clarify scope, model flows, model UI, and gate quality |
| **Delivery Design** | Organize how the documents connect | Bundle artifacts, split worksets, define plan, and generate tasks |
| **Document Analysis** | Validate readiness | Reconcile routing, analyze traceability, and decide PASS or FAIL |

## Learn More

- [Documentation Home](./docs/index.md)
- [Installation Guide](./docs/installation.md)
- [Quick Start Guide](./docs/quickstart.md)
- [Upgrade Guide](./docs/upgrade.md)
- [Mechanism Alignment Plan](./docs/reference/sp-upstream-mechanism-alignment.md)
- [Upstream File Mapping](./docs/reference/upstream-sp-file-mapping.md)
- [Chinese Detailed Guide](./READMEDETAILS.md)
- [English Summary](./README.en.md)

## Troubleshooting

- If Codex skills do not appear, verify the target project contains `.agents/skills/` and re-run `sh scripts/install.sh --yes --ai codex ./your-project`
- If Claude skills still show older content, re-run `sh scripts/install.sh --yes --ai claude ./your-project`
- If you are changing mechanism files, compare against the upstream snapshot before assuming memory docs are current

## License

This repository follows the same license surface shipped in the upstream-aligned root metadata.
