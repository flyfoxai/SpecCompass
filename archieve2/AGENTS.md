# Repository Guidelines

## Project Structure & Module Organization
This repository is a documentation-first starter pack for the `sp.*` workflow.

- `docs/`: upstream-style docs entry shell at the root, with detailed design and mapping references under `docs/reference/`.
- `src/specify_cli/`: imported upstream product CLI source, kept for structure and mechanism alignment reference.
- `tests/`: imported upstream test suite and integration coverage.
- `presets/` and `extensions/`: imported upstream preset and extension surfaces.
- `media/` and `newsletters/`: imported upstream product assets and content.
- `templates/commands/`: canonical command templates, kept in Codex-structured form and rendered per host at install time.
- `templates/project/`: project files copied into target projects, including `.specify/memory/`, overview docs, and lightweight prerequisite scripts.
- `Archieved/installer-assets/`: archived pre-migration distribution layout preserved for reference.
- `scripts/install.sh` and `scripts/install.ps1`: the main installer entry points.
- `scripts/bash/` and `scripts/powershell/`: imported upstream helper chains retained for mechanism alignment.

## Build, Test, and Development Commands
There is no app build pipeline in the root package. Use these commands during maintenance:

- `sh -n scripts/install.sh`: syntax-check the POSIX installer.
- `sh scripts/install.sh --help`: verify CLI help text and flags.
- `sh scripts/install.sh --yes --ai codex /tmp/sp-project`: smoke-test Codex installation.
- `sh scripts/install.sh --yes --ai copilot /tmp/sp-project-copilot`: smoke-test Copilot installation.
- `git diff --stat`: review change scope before commit.

If PowerShell is available, validate Windows behavior with:

- `powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\tmp-project`

## Coding Style & Naming Conventions
- Use ASCII unless a file already contains Chinese copy that should remain bilingual.
- Keep shell scripts POSIX-compatible; avoid Bash-only features in `scripts/install.sh`.
- Keep PowerShell changes aligned with shell behavior and output.
- Use existing naming patterns: `sp.<step>.md` for prompts and Markdown docs.
- Prefer short, direct documentation edits over marketing-style copy.

## Testing Guidelines
- Treat installer smoke tests as the primary verification gate.
- For Codex changes, verify `.agents/skills/sp-*/SKILL.md`.
- For Claude changes, verify `.claude/skills/sp-*/SKILL.md`.
- For Copilot changes, verify both `.github/agents/` and `.github/prompts/`.
- Check `.specify/integrations/*.manifest.json` for the expected installed paths.

## Commit & Pull Request Guidelines
- Follow the existing history: concise imperative subjects such as `fix codex desktop prompt install targets` or `docs(install): clarify codex remote install`.
- Keep commits scoped to one concern: installer logic, docs, or asset templates.
- PRs should describe user-visible behavior changes, list verification commands run, and mention any platform gaps not tested.

## Contributor Notes
- Do not change trigger semantics casually: Codex uses `$sp-*`, Claude uses `/sp-*`, and traditional slash-command hosts use `/sp.*`.
- When updating installation behavior, keep `install.sh`, `install.ps1`, and affected docs in sync.
- Codex and Claude `sp-*` skills are the active project-local packaging path under the current upstream-style integration system.
