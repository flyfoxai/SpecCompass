# Upgrade Guide

> You already have OpenSpecs starter-pack files in a project and want to refresh them without
> damaging feature work under `specs/`.

---

## Quick Reference

| What to Upgrade | Command | When to Use |
|----------------|---------|-------------|
| **Starter-Pack Files** | `sh scripts/install.sh --yes --ai <host> ./your-project` | Refresh commands, project docs, memory, and shipped helper files |
| **Codex Host Wiring** | `sh scripts/install.sh --yes --ai codex ./your-project` | Reinstall project-local Codex skills |
| **Claude Host Wiring** | `sh scripts/install.sh --yes --ai claude ./your-project` | Reinstall project-local Claude skills |

## Safe Upgrade Boundary

The intended upgrade surface is:

- command templates
- project docs shipped by the starter pack
- `.specify/memory/*`
- bundled helper scripts

The `specs/` directory is user work and should not be treated as replaceable starter-pack content.

## Part 1: Update Project Files

When the starter pack changes its commands, scripts, or memory shell, re-run the installer into the
same target project.

## Recommended Upgrade Flow

### 1. Back up local customizations

If the target project has local edits in starter-pack files, commit or back them up first.

### 2. Re-run installation into the existing project

```bash
sh scripts/install.sh --yes --ai codex ./your-project
```

or:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Yes -Ai codex .\your-project
```

### 3. Verify agent outputs

- check `.agents/skills` when using Codex mode
- check `.claude/skills` when using Claude mode
- check `.github/agents` and `.github/prompts` when using Copilot mode

### 4. Re-check memory and overview docs

If the project has heavily customized memory routing, review `.specify/memory/constitution.md` and related routing docs after upgrade.

## What Gets Updated

Re-running the installer updates the starter-pack surface:

- `docs/`
- `.specify/memory/`
- project helper scripts
- host command surfaces derived from `templates/commands/`

## What Stays Safe

These areas are not supposed to be treated as replaceable starter-pack assets:

- `specs/<feature>/spec.md`
- `specs/<feature>/plan.md`
- `specs/<feature>/tasks.md`
- `specs/<feature>/analysis.md`
- source code in the target repository

## Important Warnings

### 1. Local starter-pack customizations can still be replaced

If you hand-edited starter-pack-owned files in `docs/`, `.specify/memory/`, or shipped scripts,
the reinstall can overwrite them. Back them up first.

### 2. Host mismatch causes confusing results

If you upgrade a Codex project without `--ai codex`, the project files refresh but the Codex skill
integration does not. The same applies to Claude or Copilot integration output.

### 3. Host integration state is project-local

Do not verify upgrades by checking old global directories. The active install path now writes host
integration files inside the target project and records them in `.specify/integrations/*.manifest.json`.

## Common Scenarios

### Scenario 1: Refresh only starter-pack files

```bash
sh scripts/install.sh --yes ./your-project
```

### Scenario 2: Refresh project plus Codex host files

```bash
sh scripts/install.sh --yes --ai codex ./your-project
```

### Scenario 3: Refresh project plus Claude host files

```bash
sh scripts/install.sh --yes --ai claude ./your-project
```

### Scenario 4: You customized memory routing heavily

Back up `.specify/memory/`, upgrade, then manually reconcile the customized routing against the
new starter-pack shell.

## Related Detail

- [Template File Manifest](reference/sp-template-file-manifest.md)
- [Project Memory Architecture](reference/sp-project-memory-architecture.md)
- [Feature Template Pack](reference/sp-feature-template-pack.md)
