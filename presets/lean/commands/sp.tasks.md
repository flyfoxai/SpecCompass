---
description: Create the tasks needed for implementation and store them in tasks.md.
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. Read `.specify/feature.json` to get the feature directory path.

2. **Load context**: `.specify/memory/constitution.md` and `<feature_directory>/spec.md` and `<feature_directory>/plan.md`.

3. Create dependency-ordered implementation tasks and store them in `<feature_directory>/tasks.md`.
   - Every task uses a checklist header: `- [ ] [TaskID] Description with file path`
   - Add nested task-packet bullets under the checklist header when the task needs `Mode`, `Allowed Write Set`, `Required Checks`, `Trace Anchors`, or effective defaults
   - Organized by phase: setup, foundational, user stories in priority order, polish
   - Every task or task group declares `Mode: doc` or `Mode: impl`; missing mode defaults to `Mode: doc`
   - Generate `Mode: impl` tasks only when `plan.md` `Implementation Readiness` marks the workset ready
   - Each `Mode: impl` task includes readiness source, `Allowed Write Set`, `Required Checks`, trace anchors or explicit no-trace reason, gate/evidence expectation, and compressed effective defaults for `Forbidden Write Set`, `Fallback Route`, `Writeback Rule`, `Required Evidence`, and rollback/degrade handling
   - Use formal `CODE` and `TEST` trace only for high-risk boundary objects and acceptance-critical tests; ordinary internal helpers do not require anchors
   - If the write boundary is missing, return `NEEDS_PLAN`; if task packet fields are incomplete, return `NEEDS_TASKS`; if required context is missing and cannot be recovered from routed files, return `NEEDS_CONTEXT`

Do not write production code in this command.
