# Tasks
<!-- SP_STAGE_SEED: tasks -->

## Task Matrix

| Task ID | Mode | Workset | Deliverable | Acceptance Anchor | Readiness Source | Allowed Write Set | Required Checks | Trace Anchors | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TASK-001` | `doc` | `WS-PRIMARY-JOURNEY` | baseline primary journey docs | `ACC-PRIMARY-SUCCESS` | n/a | docs and feature memory only | document consistency check | `FLOW/UI/ACC` as available | `Seeded` | split further during `sp.tasks` |
| `TASK-002` | `doc` | `WS-DECISION-AND-APPROVAL` | decision and permission docs | `ACC-DECISION-SUCCESS` | n/a | docs and feature memory only | permission/acceptance review | `PERM/ACC` as available | `Seeded` | keep bounded |
| `TASK-003` | `doc` | `WS-QUERY-AND-FOLLOWUP` | query/detail/follow-up docs | `ACC-QUERY-VIEW` | n/a | docs and feature memory only | flow/UI consistency check | `FLOW/UI/ACC` as available | `Seeded` | keep independent |
| `TASK-004` | `doc` | `WS-SIDE-EFFECTS` | side-effect and compensation docs | `ACC-SIDE-EFFECT-STABLE` | n/a | docs and feature memory only | side-effect/risk review | `EVENT/RISK/ACC` as available | `Seeded` | isolate high-risk work |

## Task Packet Defaults

Use these defaults unless a generated task explicitly overrides them.

| Field | Default |
| --- | --- |
| Forbidden Write Set | shared truth files unless explicitly allowed: `tasks.md`, `memory/open-items.md`, `memory/trace-index.md`, `memory/worksets/*`, `memory/stable-context.md`, feature routing, stable summaries, `analysis.md`, `gate.md`, `<feature>/workers/*` cleanup or lifecycle decisions, package manifests, lockfiles, schemas, migrations, permissions, and global registries |
| Fallback Route | `NEEDS_TASKS` for incomplete task packets; `NEEDS_PLAN` for missing code/workset boundaries; `NEEDS_CONTEXT` for missing required context that cannot be recovered from routed files; `NEEDS_DECISION` for human product/risk/compliance choices |
| Writeback Rule | workers propose shared-memory updates; coordinator or serial closeout merges them |
| Required Evidence | current command/check/manual-verification result, affected anchors, changed files, and remaining open items |
| Gate / Evidence Expectation | record whether later `/sp.analyze`, `/sp.gate`, review, or human decision is required before the workset can advance |
| Rollback / Degrade Handling | use the relevant risk/open item rollback or degradation note for high-risk tasks; state `not applicable` for low-risk local tasks |
| Code Handoff Packet | when document-stage work discovers required `src/`, `scripts/`, config, generated-code, schema, test-asset, or fixture changes, record target, reason, related anchor, `Allowed Write Set`, `Required Checks`, expected verification, writeback target, and next route instead of committing those artifacts as document work |
| Data-Linkage Check | when a task changes data, UI, API, permissions, events, acceptance, or tests, check direct-neighbor flow, data object, UI surface, API contract, permission rule, side effect, tests, trace row, and open item before closeout |

## Notes

- Treat this file as execution binding, not design brainstorming.
- Each executable task should stay bound to a workset, acceptance anchor, verification path, and mode.
- `Mode: doc` can update documents, memory, trace, open-items, analysis, or gate outputs. It cannot write production code.
- `Mode: impl` can be generated only from `plan.md` `Implementation Readiness`, and must include readiness source, `Allowed Write Set`, `Required Checks`, trace anchors or explicit no-trace reason, visible effective defaults, and gate/evidence expectation.
- Missing mode defaults to `Mode: doc`; `/sp.implement` must not execute it as production code.
- High-risk boundary objects and acceptance-critical tests should use formal `CODE` and `TEST` trace entries or proposed updates. Ordinary internal helpers do not need anchors unless they become stable cross-document objects.
- If `Allowed Write Set` is insufficient, do not expand it during implementation. Return `NEEDS_PLAN` for boundary/readiness problems, `NEEDS_TASKS` for incomplete task packet/split problems, or `NEEDS_CONTEXT` for missing required context that cannot be recovered from routed files.
- Document-stage tasks must not stage or commit unauthorized `src/`, `scripts/`, config, generated-code, schema, test-asset, or fixture artifacts. Convert required code work into a next-stage `Mode: impl` code handoff packet.
- Do not treat command success, generated documents, or exit code 0 as business PASS. Business PASS still requires acceptance, trace, open-item, data-linkage, code/test evidence when in scope, and gate verdict.
- If a task carries non-trivial `@t0` or `@r0`, the corresponding detail should exist in `memory/open-items.md`.
- If a blocker or broad cleanup task is too large to verify in one focused pass, split it into a smallest solvable unit with symptom, evidence, root layer, verification path, writeback target, and next route.
- If a task is too broad to verify in one focused pass, split it before execution rather than relying on model memory.
- Worker task packets and handoffs belong outside `memory/`, normally under `<feature>/workers/`. They are execution artifacts, not stable memory; memory recall should exclude them unless the coordinator is explicitly merging or auditing worker evidence.
