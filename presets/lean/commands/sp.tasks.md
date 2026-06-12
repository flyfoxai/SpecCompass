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
   - For high-risk or code-continuation tasks, include `Read Set`, `Dependencies Checked`, `Reverse Trace Checked`, `Expected Delta`, `Delta Summary`, and `Proposed Updates`, or state `N/A - <reason>` when a field is not applicable; empty fields are not evidence
   - Use memory-first routing for continuation work: feature memory, workset memory, trace/open-items, then the smallest direct source/test files
   - Use formal `CODE` and `TEST` trace only for high-risk boundary objects and acceptance-critical tests; ordinary internal helpers do not require anchors
   - If the write boundary is missing, return `NEEDS_PLAN`; if task packet fields are incomplete, return `NEEDS_TASKS`; if required context is missing and cannot be recovered from routed files, return `NEEDS_CONTEXT`
   - For blocker-derived tasks, include `Blocker ID`, `Failure Signature`, `Root Layer`, `Disconfirming Evidence` when retrying, smallest solvable unit, verification path, `Writeback Target`, and next route
   - Use failure signatures like `<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>` and keep `Root Layer` consistent with the next route; include `data` as a valid root layer for schema, migration, fixture data shape, compatibility, data contract, or initialization issues
   - If a blocker task cannot name its smallest solvable unit, verification path, or writeback target, route to `/sp.analyze`, `/sp.plan`, `/sp.clarify`, or `/sp.gate` instead of generating implementation work
   - If a task is blocked by `NEEDS_DECISION`, do not make it executable until the human-selected decision is written back to the source doc, task, or `memory/open-items.md`
   - If repeated fallback is visible, append or propose `fallback-log` or `promote-candidate: <Failure Signature>` for `/sp.analyze` or `/sp.gate`; do not directly create, merge, close, or promote `memory/open-items.md` blocker state from `/sp.tasks`

Do not write production code in this command.
