# Automation Readiness Analysis

## Verdict

- Current Verdict: `Pending Analysis`
- Feature: `__FEATURE_BRANCH__`
- Review Date: `__FEATURE_DATE__`
- Meaning: initialization state only. It is not a blocker until `/sp.analyze` records evidence.
- Allowed final verdicts: `PASS`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION`.

## What To Check

| Check Area | Current Status | Primary Evidence |
| --- | --- | --- |
| routing and memory | `Pending` | `memory/index.md`, `memory/open-items.md`, `memory/trace-index.md` |
| implementation readiness authority | `Pending` | `plan.md` `Implementation Readiness` |
| task mode integrity | `Pending` | `tasks.md` `Mode: doc` / `Mode: impl` fields |
| implementation task packets | `Pending` | `Allowed Write Set`, `Required Checks`, effective defaults |
| CODE/TEST trace | `Pending` | high-risk boundary `CODE` rows and acceptance-critical `TEST` rows |
| trace warning escalation | `Pending` | task evidence, analysis findings, or `memory/open-items.md` |

## Blocking Actions

- List the exact `/sp.*` step to revisit when the verdict is not `PASS`.
- Treat stale memory, missing trace links, unowned blockers, missing smoke checks, and unresolved high-impact risks as evidence for `FAIL`, `BLOCKED`, or `NEEDS_DECISION` depending on whether repair is local, automatic progress is unsafe, or human choice is required.
- Treat missing `plan.md` `Implementation Readiness` for implementation tasks as a `/sp.plan` fallback.
- Treat missing `Mode: impl` packet fields as a `/sp.tasks` fallback.
- Treat high-risk missing `CODE` trace or acceptance-critical missing `TEST` trace as blocking unless tracked in `memory/open-items.md`.
- Treat ordinary trace warnings as warnings only while they do not affect acceptance, tests, release, rollback, or human decisions; escalate unresolved cross-stage warnings to blockers.
- If the issue cannot be repaired in analysis, fall back upward to the owning document step instead of inventing missing facts.
- Add check rows only after real analysis evidence exists. Do not keep scaffold reminders as findings.
