---
description: Create a plan and store it in plan.md.
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. Read `.specify/feature.json` to get the feature directory path.

2. **Load context**: `.specify/memory/constitution.md` and `<feature_directory>/spec.md`.

3. Create an implementation plan and store it in `<feature_directory>/plan.md`.
   - Technical context: tech stack, dependencies, project structure
   - Design decisions, architecture, file structure
   - Source layout, runtime commands, code mapping, test mapping, and workset code boundary when implementation is expected
   - Global Registry Risk for package manifests, lockfiles, route registries, schemas, permissions, global config, cross-module contracts, migrations, event registries, and other shared files that require serialized ownership
   - `Implementation Readiness`: the single source of truth for whether each workset can later produce `Mode: impl` tasks
   - Keep code mapping at module, directory, boundary-object, or key-file level until implementation evidence exists; only high-risk public APIs, permissions, migrations, events, or acceptance-critical tests need early `CODE` / `TEST` anchors
   - For complex blockers, record `Blocker ID`, `Failure Signature` using `<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>`, `Root Layer`, `Disconfirming Evidence` when retrying, smallest solvable unit, `Next Route`, and `Writeback Target`
   - If a planning blocker reaches `NEEDS_DECISION`, freeze downstream work for the same blocker until the human-selected decision is written back to the source doc, task, or `memory/open-items.md`
   - If repeated fallback is visible, append or propose `fallback-log` or `promote-candidate: <Failure Signature>` for `/sp.analyze` or `/sp.gate`; do not directly promote `memory/open-items.md` blocker state from `/sp.plan`

Do not write production code in this command. Do not generate executable implementation tasks here; `/sp.tasks` consumes `Implementation Readiness`.
