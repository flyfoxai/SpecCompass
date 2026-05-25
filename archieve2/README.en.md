# OpenSpecs (Speckit Layered)

`sp` is a layered documentation workflow adapted from `Spec Kit`.
The framework step names stay in `sp.*`; each agent only changes how those steps are triggered.

Upstream original repository: `https://github.com/github/spec-kit`

Its goal is not to jump straight from a raw request to code. It first turns a project into a queryable, traceable, incremental documentation skeleton so a model can work on one local area at a time under limited context.

The current phase covers documentation only. The workflow ends at `sp.analyze`. A later implementation-stage step such as `sp.implement` is intentionally out of scope for this repository.

## What It Solves

- Real projects contain many unresolved decisions between initial requirements and final implementation.
- Models have limited context and no durable memory, which causes repeated reasoning and drift.
- As scope grows, models start missing important information or reading the wrong area.

`sp` addresses this with layered documents, a unified clarify step, a memory layer, and workset-based decomposition.

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

## Install Into a Project Directory

This repository already includes installer scripts for the documentation-stage starter pack.

Local repository install:

```bash
sh scripts/install.sh
sh scripts/install.sh ./your-project
sh scripts/install.sh --ai codex ./your-project
sh scripts/install.sh --ai claude ./your-project
```

Remote one-command install:

```bash
# Starter pack only
curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project

# Starter pack + Codex integration
SP_INSTALL_AI=codex curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project
```

These examples use the live `main` branch archive for convenience. For stable installs, replace the archive URL with a release or tag archive URL that matches the version you want to pin.

Windows local install:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 .\your-project
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\your-project
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude .\your-project
```

Windows remote one-command install:

```powershell
# Starter pack only
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex

# Starter pack + Codex integration
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; $env:SP_INSTALL_AI="codex"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex
```

The same recommendation applies on Windows: `main.zip` is the moving branch example, while release or tag archives are better for reproducible installs.

If no directory is provided, installation defaults to the current directory. Confirmation is required by default unless `--yes`, `-Yes`, or an explicit environment override is used.

Host integration notes:

- `sp.specify` and `sp.analyze` are workflow step names, not hardcoded host syntax
- Codex installs project-local skills into `.agents/skills/sp-*/SKILL.md` and uses `$sp-*`
- Claude installs project-local skills into `.claude/skills/sp-*/SKILL.md` and uses `/sp-*`
- Slash-command hosts continue to use `/sp.*`
- Starter-pack-only installs do not add host integration files
- `--ai codex` and `SP_INSTALL_AI=codex` delegate to `specify init` and install Codex skills plus `.specify/integrations/codex.manifest.json`
- `--ai claude` and `SP_INSTALL_AI=claude` install Claude skills plus `.specify/integrations/claude.manifest.json`

Quick post-install checks:

```bash
find ./your-project/.agents/skills -maxdepth 2 -name SKILL.md
find ./your-project/.claude/skills -maxdepth 2 -name SKILL.md
find ./your-project/.github/agents -maxdepth 1 -name 'sp.*.agent.md'
```

```powershell
Get-ChildItem .\your-project\.agents\skills -Recurse -Filter SKILL.md
Get-ChildItem .\your-project\.claude\skills -Recurse -Filter SKILL.md
Get-ChildItem .\your-project\.github\agents -Filter "sp.*.agent.md"
```

## Best Fit

Best for medium or growing business systems with many screens, flows, and data objects, especially when the team wants a stable document backbone for later automation.

Less useful for very small tools with only a few pages and simple rules.

## Read More

- Chinese short version: [README.md](README.md)
- Chinese detailed version: [READMEDETAILS.md](READMEDETAILS.md)
- English detailed version: [READMEDETAILS.en.md](READMEDETAILS.en.md)
- Installation strategy target doc: [docs/reference/sp-agent-install-strategy.md](docs/reference/sp-agent-install-strategy.md)
