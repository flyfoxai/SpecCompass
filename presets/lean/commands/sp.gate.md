---
description: Decide whether the current lean SP stage can move forward.
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. Read `.specify/feature.json` to get the feature directory path.

2. **Load context**: `.specify/memory/constitution.md`, `<feature_directory>/analysis.md` when present, `<feature_directory>/plan.md`, `<feature_directory>/tasks.md`, and feature memory/open-items when present.

3. Decide the current gate mode and write `<feature_directory>/gate.md`.
   - Gate mode is one of `Business`, `Delivery`, `Implementation Readiness`, or `Implementation Regression`.
   - Verdict must be exactly one of `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION`.
   - Consume `analysis.md` as diagnostic evidence when present; do not redo full analysis unless the evidence is missing, stale, or contradictory.
   - Use the incremental gate path first: verify decisive evidence, open blockers/risks, changed or stale items, and current checks needed for this gate mode before expanding to broader analyze-like checks.
   - For Implementation Readiness, verify that `plan.md` `Implementation Readiness` is the source of truth and that `tasks.md` only consumes it.
   - Do not create a second readiness fact in `gate.md`; cite the current `plan.md` readiness row and record only the gate decision, evidence, conditions, blockers, and next route.
   - Block or route back to `/sp.plan` when readiness, source layout, runtime commands, code/test mapping, or workset code boundaries are missing or contradicted.
   - Block or route back to `/sp.tasks` when `Mode: impl` task packets lack `Allowed Write Set`, `Required Checks`, effective defaults, or trace anchors/no-trace reason.
   - For Implementation Regression, treat `/sp.implement` evidence as audit input and prefer current rerunnable tests/build/lint/typecheck/manual verification before `PASS`.
   - Do not pass when high-risk boundary `CODE` trace or acceptance-critical `TEST` trace is missing without an open item, or when an unresolved trace warning now affects acceptance, tests, release, rollback, or human decisions.
   - `PASS with warning` is not a valid gate verdict. Use `PASS` with warnings recorded separately, or `CONDITIONAL` when the next stage depends on a named condition.

4. If the verdict is not `PASS`, include blocking items, options when human input is required, recommendation, and the exact next `/sp.*` route.

Do not write production code in this command. Do not invent readiness outside `plan.md`.
