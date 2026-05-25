# Tasks
<!-- SP_STAGE_SEED: tasks -->

## Task Matrix

| Task ID | Workset | Deliverable | Acceptance Anchor | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `TASK-001` | `WS-PRIMARY-JOURNEY` | baseline primary journey docs | `ACC-PRIMARY-SUCCESS` | `Seeded` | split further during `sp.tasks` |
| `TASK-002` | `WS-DECISION-AND-APPROVAL` | decision and permission docs | `ACC-DECISION-SUCCESS` | `Seeded` | keep bounded |
| `TASK-003` | `WS-QUERY-AND-FOLLOWUP` | query/detail/follow-up docs | `ACC-QUERY-VIEW` | `Seeded` | keep independent |
| `TASK-004` | `WS-SIDE-EFFECTS` | side-effect and compensation docs | `ACC-SIDE-EFFECT-STABLE` | `Seeded` | isolate high-risk work |

## Notes

- Treat this file as execution binding, not design brainstorming.
- Each executable task should stay bound to a workset, acceptance anchor, and verification path.
- If a task carries non-trivial `@t0` or `@r1`, the corresponding detail should exist in `memory/open-items.md`.
- If a task is too broad to verify in one focused pass, split it before execution rather than relying on model memory.
