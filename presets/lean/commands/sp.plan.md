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

Do not write production code in this command. Do not generate executable implementation tasks here; `/sp.tasks` consumes `Implementation Readiness`.
