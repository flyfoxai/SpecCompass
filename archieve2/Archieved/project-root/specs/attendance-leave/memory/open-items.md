# Open Items

| Item ID | Type | Severity | Domain | Workset | Description | Impact Area | Affected Docs | Suggested Rollback | Last Refresh | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OPEN-LEAVE-001` | `Question` | `Low` | approval scope | `WS-LEAVE-MANAGER-APPROVAL` | Proxy approval stays out of current scope, but the future extension shape is still undecided. | approval extension boundary | `clarifications.md`, `bundle.md` | keep current scope, revisit in a future feature | `2026-04-01` | `Deferred` |
| `OPEN-LEAVE-002` | `Question` | `High` | side effects | `WS-LEAVE-SIDE-EFFECTS` | Whether notification failure is surfaced immediately or handled only by compensation remains open. | side effects, UX feedback | `clarifications.md`, `delivery/09-events-and-side-effects.md` | `sp.plan` | `2026-04-01` | `Open` |
| `OPEN-LEAVE-003` | `Question` | `High` | API and data precision | `WS-LEAVE-EMPLOYEE-SUBMIT` | Timezone storage and response-field precision still needs second-layer hardening. | API, data | `clarifications.md`, `delivery/07-api-contracts.md`, `delivery/tables/table-leave-request.md` | `sp.plan` | `2026-04-01` | `Open` |
| `RISK-LEAVE-001` | `Risk` | `High` | side effects | `WS-LEAVE-SIDE-EFFECTS` | Side-effect order and compensation rules after approval are not yet rigid enough for low-supervision automation. | approval side effects | `analysis.md`, `delivery/09-events-and-side-effects.md` | `sp.plan` | `2026-04-01` | `Open` |
| `RISK-LEAVE-002` | `Risk` | `Medium` | acceptance density | `WS-LEAVE-QUERY-WITHDRAW` | Reject and withdraw acceptance prerequisites are still too light for stronger auto-development confidence. | acceptance density | `analysis.md`, `delivery/12-test-and-acceptance.md` | `sp.tasks` | `2026-04-01` | `Open` |
| `RISK-LEAVE-003` | `Risk` | `High` | API, data, UI validation | `WS-LEAVE-EMPLOYEE-SUBMIT` | Half-day and cross-day constraints are defined, but still rely on consistent API and data-field interpretation. | API, data, UI validation | `clarifications.md`, `delivery/07-api-contracts.md` | `sp.plan` | `2026-04-01` | `Open` |
| `BLOCK-LEAVE-000` | `Blocker` | `None` | none | none | No material blockers at the current document stage. | none | `gate.md` | none | `2026-04-01` | `Closed` |

## Filter Views

| If You Are Working On... | Read These IDs First | Main Workset | Main Rollback |
| --- | --- | --- | --- |
| approval side effects, balance, notification | `OPEN-LEAVE-002`, `RISK-LEAVE-001` | `WS-LEAVE-SIDE-EFFECTS` | `sp.plan` |
| create API, time fields, half-day rules | `OPEN-LEAVE-003`, `RISK-LEAVE-003` | `WS-LEAVE-EMPLOYEE-SUBMIT` | `sp.plan` |
| reject or withdraw acceptance coverage | `RISK-LEAVE-002` | `WS-LEAVE-QUERY-WITHDRAW` | `sp.tasks` |
| future approval extension scope | `OPEN-LEAVE-001` | `WS-LEAVE-MANAGER-APPROVAL` | future feature |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Open Questions | `3` |
| Risks | `3` |
| Blockers | `0 active` |
| Highest Priority Domain | approval side effects and API/data precision |
| Refresh Date | `2026-04-02` |
| Refresh Basis | `clarifications.md`, `gate.md`, `analysis.md`, `clarify-log.md` |
| Source Of Truth | `clarifications.md`, `gate.md`, `plan.md`, `tasks.md`, `analysis.md`, `clarify-log.md` |
| Required Sync Files | `memory/index.md`, `memory/stable-context.md`, `memory/worksets/index.md`, `memory/worksets/ws-*.md`, `.specify/memory/active-context.md` |
| Stale Trigger | risk status changes, rollback step changes, clarify propagation not in sync, new blocker appears |
