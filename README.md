<div align="center">
  <h1>SpecCompass</h1>
  <p><em>Spec-driven development for AI coding agents, with human confirmation before implementation.</em></p>
</div>

SpecCompass extends [GitHub Spec Kit](https://github.com/github/spec-kit) with a controlled path from product intent to verified implementation. Chinese documentation: [README.zh-CN.md](./README.zh-CN.md).

## Core capabilities

- **PRD Outline review**: `/sp.prd` builds the outline in stages. Early stages present 2-4 candidates, a recommendation, and free-text input; a mature outline requires formal visual confirmation before `/sp.specify`.
- **Flow and UI review**: `/sp.flow` and `/sp.ui` provide visual confirmation pages. Decisions are ranked `critical`, `important`, or `normal`; critical items are limited and always confirmed individually.
- **Controlled delivery**: planning, analysis, gates, implementation, and verification stay linked to confirmed scope and evidence.

Typical workflow:

```text
/sp.prd -> /sp.specify -> /sp.flow -> /sp.ui
        -> /sp.bundle -> /sp.plan -> /sp.tasks
        -> /sp.analyze -> /sp.gate -> /sp.implement
```

Use `/sp.route` when the next step is unclear.

## Install

```bash
uv tool install specify-cli --force \
  --from git+https://github.com/flyfoxai/SpecCompass.git

specify init my-project --integration codex
cd my-project
specify check
```

For an existing project, upgrading the CLI does not update the templates already copied into that project. Commit local changes, then refresh the managed templates from the project root:

```bash
specify init . --integration codex --force
```

Replace `codex` with your integration. Use `/sp.*` commands on slash-command hosts and `$sp-*` skills in Codex.

Detailed rules: [SP Project Methodology](./docs/reference/sp-project-methodology.md). License: [LICENSE](./LICENSE).
