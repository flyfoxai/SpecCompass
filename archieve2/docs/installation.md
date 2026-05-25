# Installation Guide

## Prerequisites

- **macOS/Linux** or **Windows PowerShell**
- AI coding host if you want command integration:
  Codex, Claude Code, Copilot, or local-only starter-pack use
- [Git](https://git-scm.com/downloads) if you want normal repo-based upgrade and diff workflows

## Installation

### Initialize a Local Project

The easiest way to get started is to install the starter pack into a target project directory:

```bash
sh scripts/install.sh ./your-project
```

Or install into the current directory:

```bash
sh scripts/install.sh .
```

### Specify AI Host

You can proactively specify the target host during installation:

```bash
sh scripts/install.sh --ai codex ./your-project
sh scripts/install.sh --ai claude ./your-project
```

On Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\your-project
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude .\your-project
```

### Specify Script Type (Shell vs PowerShell)

The repository keeps both POSIX shell (`.sh`) and PowerShell (`.ps1`) installer entry points.

Auto behavior:

- macOS/Linux default: `sh`
- Windows default: `ps1`
- choose the host with `--ai <host>` when command installation is needed

### Remote One-Command Installation

For archive-based remote installs, pass the archive URL through the installer entry point.

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project
SP_INSTALL_AI=codex curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project
```

Windows PowerShell:

```powershell
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; $env:SP_INSTALL_AI="codex"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex
```

### Ignore Host Selection

If you only want starter-pack files without installing host commands, omit `--ai` entirely:

```bash
sh scripts/install.sh ./your-project
```

## What Gets Installed

The root installer is now a thin wrapper over the local `specify init` CLI path. It installs a
documentation-stage starter pack plus optional project-local host integration:

- project docs under `docs/`
- memory routing files under `.specify/memory/`
- lightweight prerequisite scripts under `.specify/scripts/`
- template support files under `.specify/templates/`
- feature workspace skeletons under `specs/`
- optional agent integration manifests under `.specify/integrations/`

## Host Integration Rules

- `--ai codex` installs project-local skills under `.agents/skills/sp-*/SKILL.md`
- `--ai claude` installs project-local skills under `.claude/skills/sp-*/SKILL.md`
- `--ai copilot` installs `.github/agents/sp.*.agent.md` plus `.github/prompts/sp.*.prompt.md`
- shared starter-pack infrastructure is tracked in `.specify/integrations/sp.manifest.json`

## Verification

After installation, you should see the following integration surfaces in the target project:

- Codex: `.agents/skills/sp-specify/SKILL.md`, `.agents/skills/sp-plan/SKILL.md`, `.agents/skills/sp-tasks/SKILL.md`
- Claude: `.claude/skills/sp-specify/SKILL.md`, `.claude/skills/sp-plan/SKILL.md`, `.claude/skills/sp-tasks/SKILL.md`
- Copilot: `.github/agents/sp.specify.agent.md`, `.github/prompts/sp.specify.prompt.md`

You should also verify that:

- `.specify/memory/` exists in the target project
- `specs/` exists in the target project
- `.specify/integrations/sp.manifest.json` reflects the shared starter-pack paths

## Troubleshooting

### Remote install or host mismatch

If remote installation works but commands or skills do not appear in the host:

- verify the target project contains the expected integration directory
- reload the host workspace after installation
- re-run the installer with `--yes --ai <host>` to refresh the project-local integration files

### Existing project upgrade

If the target directory already contains starter-pack files, re-run the installer into that same
project. The intended replaceable surface is starter-pack content, not user work in `specs/`.

### Legacy host output assumptions

If you still expect the old global command directories, re-check the current mechanism first. The
active integration path is now project-local and driven by `specify init`, not by the archived
custom renderer chain.

## Related Detail

- [Installation Strategy](reference/sp-agent-install-strategy.md)
- [Installation and Agent Compatibility](reference/sp-installation-and-agent-compatibility.md)
- [Mechanism Alignment Plan](reference/sp-upstream-mechanism-alignment.md)
