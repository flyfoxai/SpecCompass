# Development Notes

Spec Kit is a toolkit for spec-driven development. At its core, it is a coordinated set of prompts, templates, scripts, and CLI/integration assets that define and deliver a spec-driven workflow for AI coding agents. This document is a starting point for people modifying Spec Kit itself, with a compact orientation to the key project documents and repository organization.

**Essential project documents:**

| Document                                                   | Role                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [README.md](README.md)                                     | Primary user-facing overview of Spec Kit and its workflow.                            |
| [DEVELOPMENT.md](DEVELOPMENT.md)                           | This document.                                                                        |
| [spec-driven.md](spec-driven.md)                           | End-to-end explanation of the Spec-Driven Development workflow supported by Spec Kit. |
| [RELEASE-PROCESS.md](.github/workflows/RELEASE-PROCESS.md) | Release workflow, versioning rules, and changelog generation process.                 |
| [docs/index.md](docs/index.md)                             | Entry point to the `docs/` documentation set.                                         |
| [CONTRIBUTING.md](CONTRIBUTING.md)                         | Contribution process, review expectations, testing, and required development practices. |

**Main repository components:**

| Directory          | Role                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `templates/`       | Prompt assets and templates that define the core workflow behavior and generated artifacts. |
| `scripts/`         | Supporting scripts used by the workflow, setup, and repository tooling.                     |
| `src/specify_cli/` | Python source for the `specify` CLI, including agent-specific assets.                       |
| `extensions/`      | Extension-related docs, catalogs, and supporting assets.                                    |
| `presets/`         | Preset-related docs, catalogs, and supporting assets.                                       |

## Documentation Language Policy

Choose the document language by audience and execution role:

- User-facing entry, installation, quickstart, upgrade, migration, and public positioning docs should stay bilingual where practical. At minimum, keep `README.md` and `README.zh-CN.md` aligned on core capabilities, command entry points, version notes, and install verification.
- SP methodology, research, design decision, and complex mechanism notes should default to Chinese unless they are explicitly intended for external/global users.
- Agent command templates, skills, execution prompts, and scaffolded model instructions should default to English unless a preset or localized document intentionally targets Chinese users.
- Archive, historical, external research, and one-off audit materials should preserve their original language. Do not rewrite them only for language consistency; extract stable conclusions into the target document language instead.

For this policy, external/user-facing docs are normally linked from the public README, docs index, release notes, installation/upgrade/migration guides, or integration guides. "Bilingual where practical" means that when an existing English/Chinese counterpart exists and the change affects installation, command entry points, capabilities, versions, or verification, update both language versions in the same change; if that is not practical, leave an explicit follow-up note.
