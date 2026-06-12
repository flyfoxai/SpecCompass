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
   - Treat `memory/open-items.md` as current-state truth for blockers, risks, decisions, and close conditions. Treat trace as relation/history lookup.
   - For unresolved, high-risk, or repeated blockers, include `Blocker ID`, `Failure Signature`, `Root Layer`, `Disconfirming Evidence`, smallest solvable unit, verification path, `Writeback Target`, and next route. Use `<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>` when possible.
   - Keep `Root Layer` and next route consistent. Include `data` as a valid root layer for schema, migration, fixture data shape, compatibility, data contract, or initialization issues.
   - Before a second same-signature attempt, require concrete `Disconfirming Evidence`. If missing, return `BLOCKED` instead of repeating the route.
   - Promote repeated, stage-blocking, decision-bound, data/permission/security/release/rollback, worktree-cleanup fallback-log entries, or `promote-candidate` notes into `memory/open-items.md`; if already promoted, cite the existing open item ID instead of duplicating it, otherwise mark the fallback entry as `promoted`.
   - If `NEEDS_DECISION` is diagnosed, downstream work for the same blocker remains frozen until the human-selected decision is written back to the source doc, task, or `memory/open-items.md`.

4. If the verdict is not `PASS`, include the exact next `/sp.*` route and whether the fix belongs in `/sp.plan`, `/sp.tasks`, `/sp.implement`, `/sp.analyze`, `/sp.gate`, or a human decision.

Do not write production code in this command. Do not invent readiness outside `plan.md`.
