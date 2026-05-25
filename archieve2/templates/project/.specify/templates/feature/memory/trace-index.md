# Trace Index

## Query Shortcuts

| If You Need To... | Start With | Then Expand | Primary Workset |
| --- | --- | --- | --- |
| trace the primary submit journey | `TRACE-001` | `ui/screen-primary.md`, `delivery/07-api-contracts.md` | `WS-PRIMARY-JOURNEY` |
| trace the review or approval journey | `TRACE-002` | `ui/screen-review.md`, `delivery/08-permissions-matrix.md` | `WS-DECISION-AND-APPROVAL` |
| trace list, detail, or follow-up behavior | `TRACE-003` | `ui/screen-list.md`, `ui/screen-detail.md` | `WS-QUERY-AND-FOLLOWUP` |
| trace side-effect handling | `TRACE-004` | `delivery/09-events-and-side-effects.md`, `analysis.md` | `WS-SIDE-EFFECTS` |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Refresh Date | `__FEATURE_DATE__` |
| Source Of Truth | `flows/*`, `ui/*`, `delivery/07-api-contracts.md`, `delivery/tables/*`, `delivery/12-test-and-acceptance.md` |
| Required Sync Files | `memory/index.md`, `memory/stable-context.md`, `memory/worksets/index.md`, `memory/worksets/ws-*.md`, `clarify-log.md` |
| Stale Trigger | flow node IDs, screen IDs, API anchors, or table anchors change |

## Key Trace Chains

| Trace ID | Flow | Screen | Use Case | API | Table | Acceptance | Workset | Expand Docs | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TRACE-001` | `FLOW-001` | `SCREEN-PRIMARY` | `UC-PRIMARY-SUBMIT` | `API-CREATE` | `TABLE-PRIMARY_RECORD` | `ACC-PRIMARY-SUCCESS` | `WS-PRIMARY-JOURNEY` | `ui/screen-primary.md`, `delivery/07-api-contracts.md`, `delivery/tables/table-primary-record.md` | primary mainline |
| `TRACE-002` | `FLOW-001` | `SCREEN-REVIEW` | `UC-DECISION` | `API-APPROVE`, `API-REJECT` | `TABLE-PRIMARY_RECORD`, `TABLE-DECISION_RECORD` | `ACC-DECISION-SUCCESS` | `WS-DECISION-AND-APPROVAL` | `ui/screen-review.md`, `delivery/08-permissions-matrix.md` | review and permission chain |
| `TRACE-003` | `FLOW-001` | `SCREEN-LIST`, `SCREEN-DETAIL` | `UC-QUERY-VIEW` | `API-LIST`, `API-DETAIL` | `TABLE-PRIMARY_RECORD` | `ACC-QUERY-VIEW` | `WS-QUERY-AND-FOLLOWUP` | `ui/screen-list.md`, `ui/screen-detail.md` | query and follow-up chain |
| `TRACE-004` | `FLOW-001` | `SCREEN-REVIEW`, `SCREEN-DETAIL` | `UC-SIDE-EFFECT-STABILITY` | `API-APPROVE` | `TABLE-SIDE_EFFECT_LEDGER` | `ACC-SIDE-EFFECT-STABLE` | `WS-SIDE-EFFECTS` | `delivery/09-events-and-side-effects.md`, `delivery/tables/table-side-effect-ledger.md` | downstream and compensation chain |
