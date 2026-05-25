# Upstream `spec-kit` to `sp` File Mapping

> Baseline upstream snapshot: `github/spec-kit` `main` at commit `cdbea09e1a00b0899148e82a4c366bed7482065f` (`2026-04-10`).

## 1. Count Summary

| Scope | Upstream | Current `sp` repo | Notes |
| --- | ---: | ---: | --- |
| Total files | `281` | `438` | Local repo now contains every upstream file path plus local `sp` additions and archived history |
| Shared file paths | `281` | `281` | Upstream path coverage is now complete |
| Upstream-only file paths | `0` | n/a | No remaining missing upstream files |
| Local-only file paths | n/a | `157` | `sp` workflow additions, installer entry points, archived legacy assets, archived examples, and local policy files |
| Shared file paths with different content | n/a | `15` | These are intentional `sp` content substitutions or local repo policy files |

## 2. Repository-Level Alignment Status

The repository is no longer in the earlier "partial shell alignment" state.

Current reality:

1. Every upstream file path exists in this repo.
2. All previously missing upstream product directories have been imported:
   `.devcontainer/`, `.github/`, `extensions/`, `media/`, `newsletters/`, `presets/`, `src/`, `tests/`
3. All previously missing upstream root files and helper layers have been imported:
   `.gitattributes`, `.markdownlint-cli2.jsonc`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`,
   `DEVELOPMENT.md`, `LICENSE`, `SECURITY.md`, `SUPPORT.md`, `TESTING.md`, `pyproject.toml`,
   `spec-driven.md`, `spec-kit.code-workspace`, `scripts/bash/*`, `scripts/powershell/*`,
   `templates/*-template.md`, `templates/vscode-settings.json`

So the remaining gap is no longer "missing upstream structure".

The remaining gap is:

- same-path content differences
- local-only `sp` extensions
- local installer/distribution layers

## 3. Top-Level Folder Mapping

Active top-level alignment is now tighter than before:

- upstream active top-level directories: `12`
- current active top-level directories: `14`
- current-only active directories: `.claude/`, `Archieved/`
- repo-root `specs/` samples have been moved to `Archieved/project-root/specs/`
- shipped target-project `specs/` still comes from `templates/project/specs/`

| Upstream path | `sp` path | Status | Notes |
| --- | --- | --- | --- |
| `.devcontainer/` | `.devcontainer/` | `imported-1:1` | Upstream development container files copied in |
| `.github/` | `.github/` | `imported-1:1` | Upstream automation/policy files copied in |
| `docs/` | `docs/` | `same-path, content-diff` | Upstream root docs shell is now structurally mirrored; `sp` detail docs now live under `docs/reference/` |
| `extensions/` | `extensions/` | `imported-1:1` | Upstream extension docs and catalogs copied in |
| `media/` | `media/` | `imported-1:1` | Upstream media assets copied in |
| `newsletters/` | `newsletters/` | `imported-1:1` | Upstream newsletter files copied in |
| `presets/` | `presets/` | `imported-1:1` | Upstream preset docs and catalogs copied in |
| `scripts/` | `scripts/` | `aligned-plus-local-installer` | Upstream `bash/` and `powershell/` helper chains imported; local installer entry points remain |
| `src/` | `src/` | `imported-1:1` | Upstream Python CLI source copied in |
| `templates/` | `templates/` | `aligned-plus-local-project-assets` | Upstream template roots and commands imported; local `templates/project/` retained |
| `tests/` | `tests/` | `imported-1:1` | Upstream test suite copied in |

## 4. Shared-Path Content Differences

Structural parity is complete, but these shared paths still differ in content from upstream:

| Path | Why it differs |
| --- | --- |
| `AGENTS.md` | Local repo contributor routing includes `sp`-specific guidance |
| `README.md` | Local project positioning differs from upstream product copy |
| `docs/README.md` | Rewritten to explain the `sp` docs shell |
| `docs/docfx.json` | Adjusted for local docs set |
| `docs/index.md` | Rewritten for `sp` docs home |
| `docs/installation.md` | Rewritten for starter-pack installation |
| `docs/local-development.md` | Rewritten for this repo's maintenance model |
| `docs/quickstart.md` | Rewritten for `sp` workflow onboarding |
| `docs/upgrade.md` | Rewritten for local upgrade story |
| `templates/commands/analyze.md` | Same shell family, but `sp.analyze` contract differs from upstream analyze |
| `templates/commands/clarify.md` | `sp` content |
| `templates/commands/constitution.md` | `sp` content |
| `templates/commands/plan.md` | `sp` content |
| `templates/commands/specify.md` | `sp` content |
| `templates/commands/tasks.md` | `sp` content |

This is the real remaining mechanical-alignment boundary.

## 5. Templates Mapping

### 5.1 Upstream command files now present

| Upstream file | Local status | Notes |
| --- | --- | --- |
| `templates/commands/analyze.md` | `same-path, content-diff` | `sp.analyze` semantics differ |
| `templates/commands/checklist.md` | `same-path, identical` | Imported upstream file |
| `templates/commands/clarify.md` | `same-path, content-diff` | `sp` semantics |
| `templates/commands/constitution.md` | `same-path, content-diff` | `sp` semantics |
| `templates/commands/implement.md` | `same-path, identical` | Imported upstream file |
| `templates/commands/plan.md` | `same-path, content-diff` | `sp` semantics |
| `templates/commands/specify.md` | `same-path, content-diff` | `sp` semantics |
| `templates/commands/tasks.md` | `same-path, content-diff` | `sp` semantics |
| `templates/commands/taskstoissues.md` | `same-path, identical` | Imported upstream file |

### 5.2 Local-only command additions

| Local file | Upstream equivalent | Status | Notes |
| --- | --- | --- | --- |
| `templates/commands/flow.md` | none | `added` | `sp` first-layer flow modeling |
| `templates/commands/ui.md` | none | `added` | `sp` first-layer UI modeling |
| `templates/commands/gate.md` | partial `checklist.md` overlap | `added` | Explicit document-stage gate |
| `templates/commands/bundle.md` | none | `added` | Bridge from business clarification into delivery design |

### 5.3 Template-root files

| Upstream file | Local status | Notes |
| --- | --- | --- |
| `templates/agent-file-template.md` | `same-path, identical` | Imported |
| `templates/checklist-template.md` | `same-path, identical` | Imported |
| `templates/constitution-template.md` | `same-path, identical` | Imported |
| `templates/plan-template.md` | `same-path, identical` | Imported |
| `templates/spec-template.md` | `same-path, identical` | Imported |
| `templates/tasks-template.md` | `same-path, identical` | Imported |
| `templates/vscode-settings.json` | `same-path, identical` | Imported |
| `templates/project/` | local-only | Retained as starter-pack install payload |

## 6. Scripts Mapping

| Upstream file | Local status | Notes |
| --- | --- | --- |
| `scripts/bash/check-prerequisites.sh` | `same-path, identical` | Imported |
| `scripts/bash/common.sh` | `same-path, identical` | Imported |
| `scripts/bash/create-new-feature.sh` | `same-path, identical` | Imported |
| `scripts/bash/setup-plan.sh` | `same-path, identical` | Imported |
| `scripts/bash/update-agent-context.sh` | `same-path, identical` | Imported |
| `scripts/powershell/check-prerequisites.ps1` | `same-path, identical` | Imported |
| `scripts/powershell/common.ps1` | `same-path, identical` | Imported |
| `scripts/powershell/create-new-feature.ps1` | `same-path, identical` | Imported |
| `scripts/powershell/setup-plan.ps1` | `same-path, identical` | Imported |
| `scripts/powershell/update-agent-context.ps1` | `same-path, identical` | Imported |
| `scripts/install.sh` | local-only | Starter-pack installer entry point |
| `scripts/install.ps1` | local-only | Windows starter-pack installer entry point |

Current installer/runtime alignment status:

- `scripts/install.sh` and `scripts/install.ps1` are now thin wrappers over the local `specify init` entrypoint
- host integration output is project-local and emitted by `src/specify_cli/integrations/*`
- shared helper chains are recorded in `.specify/integrations/sp.manifest.json`
- agent-specific outputs are recorded in their own `.specify/integrations/*.manifest.json` files

## 7. Docs Mapping

| Upstream docs file | Local status | Notes |
| --- | --- | --- |
| `docs/README.md` | `same-path, content-diff` | Upstream shell retained, local content |
| `docs/index.md` | `same-path, content-diff` | Upstream shell retained, local content |
| `docs/installation.md` | `same-path, content-diff` | Upstream shell retained, local content |
| `docs/quickstart.md` | `same-path, content-diff` | Upstream shell retained, local content |
| `docs/local-development.md` | `same-path, content-diff` | Upstream shell retained, local content |
| `docs/upgrade.md` | `same-path, content-diff` | Upstream shell retained, local content |
| `docs/toc.yml` | `same-path, identical` | Upstream docs TOC structure retained |
| `docs/docfx.json` | `same-path, content-diff` | Local docs build config |
| `docs/.gitignore` | `same-path, identical` | Matches upstream |
| `docs/reference/*.md` | local-only | `sp` design, mapping, migration, and mechanism references |

## 8. Why Local Files Still Exceed Upstream

The extra `157` local-only files are not random. They fall into stable buckets:

1. Local workflow assets:
   `templates/project/` including shipped `.specify/memory/` and target-project `specs/` seed
2. Local workflow commands:
   `flow`, `ui`, `gate`, `bundle`
3. Local installer/distribution assets:
   `scripts/install.sh`, `scripts/install.ps1`
4. Local documentation and migration analysis:
   `docs/reference/`
5. Archived pre-migration structure:
   `Archieved/installer-assets/`, `Archieved/scripts/`
6. Archived historical workflow content and pre-migration layout:
   `Archieved/`, including `Archieved/project-root/specs/`
7. Local alternate readmes and authoring assets:
   `README.en.md`, `READMEDETAILS*.md`, `.claude/`, `package.json`

Archived helper note:

- `Archieved/scripts/render_command_template.py` is retained only as a historical artifact from the
  pre-alignment custom renderer chain and is no longer part of the active `scripts/` mechanism.

## 9. Current Remediation Conclusion

The previous conclusion "the repo still lacks major upstream folders and framework files" is no longer true.

The current conclusion is:

- file-path-level mechanical alignment with upstream is complete
- the remaining non-equivalence is now concentrated in:
  - `sp`-specific content substitutions on shared paths
  - local-only starter-pack/install/memory/spec assets
  - repository policy files intentionally tuned for this fork

So if the next step is to get even closer to upstream, the work should focus on:

1. whether any of the remaining `15` shared-path content diffs should be reduced further
2. whether any local-only additions should move behind stricter packaging boundaries
3. command-level runtime validation, especially empty-project and missing-prerequisite blocking behavior
4. obtaining fresh Windows / PowerShell smoke evidence for the aligned installer path
