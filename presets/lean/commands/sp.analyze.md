---
description: Diagnose readiness, task packets, trace, and implementation evidence.
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. Read `.specify/feature.json` to get the feature directory path.

2. **Load context**: `.specify/memory/constitution.md`, `<feature_directory>/spec.md`, `<feature_directory>/plan.md`, `<feature_directory>/tasks.md`, and feature memory when present.

3. Diagnose the current state and write `<feature_directory>/analysis.md`.
   - Verdict must be one of `PASS`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION`.
   - `NEEDS_CONTEXT` is not an `/sp.analyze` verdict; missing required context should be reported as `BLOCKED`, or `NEEDS_DECISION` when it requires human choice.
   - If low-risk warnings remain, keep the formal verdict as `PASS` and record warnings separately; do not write `PASS with warning` as the verdict value.
   - Check that `plan.md` `Implementation Readiness` exists when `Mode: impl` tasks are present; diagnose it but do not replace it as the source of truth.
   - If `tasks.md` contradicts `plan.md` `Implementation Readiness`, set the diagnostic verdict to `FAIL` and route to `/sp.plan`; use `BLOCKED` for missing or unevaluable readiness, and `NEEDS_DECISION` when human choice is required.
   - Check every task or task group has `Mode: doc` or `Mode: impl`; missing mode defaults to `Mode: doc`.
   - Check every `Mode: impl` task has `Allowed Write Set`, `Required Checks`, trace anchors or explicit no-trace reason, and visible effective defaults.
   - If a task is in `NEEDS_CONTEXT` state, treat it as a task-packet gap: route to `/sp.tasks` when existing documents can recover the missing context, to `/sp.plan` for workset or code-boundary gaps, or to `NEEDS_DECISION` when human input is required.
   - Check high-risk boundary `CODE` trace and acceptance-critical `TEST` trace, or a tracked open item explaining the gap.
   - Treat implementation evidence as audit input; rerunnable tests/build/lint/typecheck/manual checks should be current or have an explicit alternative evidence note.
   - Ordinary trace warnings may proceed only when recorded in task evidence, analysis, or open-items; unresolved cross-stage warnings or warnings affecting acceptance, tests, release, rollback, or human decisions become blockers.

4. If the verdict is not `PASS`, include the exact next `/sp.*` route and whether the fix belongs in `/sp.plan`, `/sp.tasks`, `/sp.implement`, `/sp.analyze`, `/sp.gate`, or a human decision.

Do not write production code in this command. Do not invent readiness outside `plan.md`.
