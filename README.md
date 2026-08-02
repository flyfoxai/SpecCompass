<div align="center">
  <h1>SpecCompass</h1>
  <p><em>Spec-driven development for AI coding agents, with human confirmation before implementation.</em></p>
</div>

SpecCompass extends [GitHub Spec Kit](https://github.com/github/spec-kit) with a controlled path from product intent to verified implementation. Chinese documentation: [README.zh-CN.md](./README.zh-CN.md).

## Core capabilities

- **PRD Outline review**: `/sp.prd` turns source-backed business capabilities into a mind map of independently verifiable candidate subprojects, with node choices, free-text input, and read-only Constitution context; a mature outline requires visual confirmation before `/sp.specify`. The `000-*` Portfolio root owns PRD, Outline, constraints, and handoffs only; implementation children use explicit `001+` boundaries.
- **SP Lite validation**: `/sp.lite` offers 2-3 human-selected directions, then delivers the smallest runnable prototype under one global Outline roadmap. Later rounds may extend earlier work or cover an independent Outline branch without duplicating or contradicting prior delivery.
- **Flow and UI review**: `/sp.flow` and `/sp.ui` provide visual confirmation pages. Decisions are ranked `critical`, `important`, or `normal`; critical items are limited and always confirmed individually.
- **Explicit review acceptance**: after inspecting a current Outline, Flow, or UI review, `/sp.accept <outline|flow|ui> <feature> [--advance]` accepts the current recommendations, writes the formal confirmation, and optionally advances only after the owning stage passes its readiness checks.
- **Controlled delivery**: planning, analysis, gates, implementation, and verification stay linked to confirmed scope and evidence.

Typical workflow:

```text
000-* /sp.prd -> Outline confirmation -> 001+ /sp.specify -> /sp.flow -> /sp.ui
        -> /sp.bundle -> /sp.plan -> /sp.tasks
        -> /sp.analyze -> /sp.gate -> /sp.implement
```

Use `/sp.route` when the next step is unclear.

For rapid business validation, run `/sp.lite` after the PRD and Outline are
confirmed. Run it again after each validation round to select the next increment.

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
