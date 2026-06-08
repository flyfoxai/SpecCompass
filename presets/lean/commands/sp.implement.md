---
description: "Execute selected Mode: impl tasks from tasks.md."
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. Read `.specify/feature.json` to get the feature directory path.

2. **Load context**: `.specify/memory/constitution.md` and `<feature_directory>/spec.md` and `<feature_directory>/plan.md` and `<feature_directory>/tasks.md`.

3. **Execute selected tasks** in order:
   - Execute only tasks marked `Mode: impl`; missing mode or `Mode: doc` is not a production-code task
   - If the user did not name a task, pick the next unblocked `Mode: impl` task under dependency order; do not execute every remaining task unless explicitly requested and each included task is ready
   - Before editing, confirm `plan.md` `Implementation Readiness`, `Allowed Write Set`, `Required Checks`, trace anchors or explicit no-trace reason, and task-packet effective defaults
   - If `Allowed Write Set` is insufficient, do not auto-expand it; return `NEEDS_PLAN` for code-boundary problems, `NEEDS_TASKS` for incomplete task packets, `NEEDS_CONTEXT` for missing required context that cannot be recovered from routed files, or `NEEDS_DECISION` for human product/risk/compliance choices
   - Preserve or propose `CODE` / `TEST` trace for high-risk boundary objects and acceptance-critical tests
   - Before delete, move, or rename, perform a lightweight reference scan using trace, search, imports/calls/routes/tests as applicable
   - If safe removal needs compatibility, tombstone, or soft-delete behavior, record an open item with owner or next route, cleanup trigger, verification requirement, and affected trace
   - Complete each task before moving to the next
   - Mark completed tasks by changing `- [ ]` to `- [x]` in `<feature_directory>/tasks.md`
   - Halt on failure and report the issue

4. **Validate**: Verify selected tasks completed in this run and the implementation matches the relevant spec slice.
   - Record current test/build/lint/typecheck/manual verification evidence
   - Update task state and directly affected open-items or trace only when evidence exists
   - Treat implementation evidence as task audit evidence; later `/sp.analyze` or `/sp.gate` may independently recheck it
