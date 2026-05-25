# Trace Index

## Query Shortcuts

| If You Need To... | Start With | Then Expand | Primary Workset |
| --- | --- | --- | --- |
| trace employee submit | `TRACE-LEAVE-001` | `ui/screen-leave-apply.md`, `delivery/07-api-contracts.md` | `WS-LEAVE-EMPLOYEE-SUBMIT` |
| trace manager approve | `TRACE-LEAVE-002` | `ui/screen-leave-approval.md`, `delivery/09-events-and-side-effects.md` | `WS-LEAVE-MANAGER-APPROVAL`, `WS-LEAVE-SIDE-EFFECTS` |
| trace manager reject | `TRACE-LEAVE-003` | `ui/screen-leave-approval.md`, `delivery/12-test-and-acceptance.md` | `WS-LEAVE-MANAGER-APPROVAL` |
| trace query or withdraw | `TRACE-LEAVE-004`, `TRACE-LEAVE-005` | `ui/screen-leave-detail.md`, `ui/screen-leave-list.md` | `WS-LEAVE-QUERY-WITHDRAW` |
| trace approval side effects | `TRACE-LEAVE-002`, `RULE-LEAVE-006` | `delivery/09-events-and-side-effects.md`, `analysis.md` | `WS-LEAVE-SIDE-EFFECTS` |
| trace submit button or reason field | `ACTION-LEAVE-APPLY-020`, `FIELD-LEAVE-APPLY-050` | `TRACE-LEAVE-001`, `ui/screen-leave-apply.md` | `WS-LEAVE-EMPLOYEE-SUBMIT` |
| trace reject button or reject reason | `ACTION-LEAVE-APPROVAL-020`, `FIELD-LEAVE-APPROVAL-010` | `TRACE-LEAVE-003`, `ui/screen-leave-approval.md` | `WS-LEAVE-MANAGER-APPROVAL` |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Refresh Date | `2026-04-02` |
| Refresh Basis | `flows/index.md`, `flows/main-flow.mmd`, `flows/sequence.mmd`, `ui/screen-map.md`, `delivery/07-api-contracts.md`, `delivery/tables/*`, `clarify-log.md` |
| Source Of Truth | `flows/*`, `ui/*`, `delivery/07-api-contracts.md`, `delivery/tables/*`, `delivery/12-test-and-acceptance.md` |
| Required Sync Files | `memory/index.md`, `memory/stable-context.md`, `memory/worksets/index.md`, `memory/worksets/ws-*.md`, `clarify-log.md` |
| Stale Trigger | flow node ids change, screen ids change, api or table mapping changes, clarify propagation not in sync |

## Key Trace Chains

| Trace ID | Flow | Screen | Use Case | API | Table | Acceptance | Workset | Expand Docs | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TRACE-LEAVE-001` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-APPLY` | `UC-LEAVE-SUBMIT` | `API-LEAVE-CREATE` | `TABLE-LEAVE_REQUEST` | `ACC-LEAVE-SUBMIT-SUCCESS` | `WS-LEAVE-EMPLOYEE-SUBMIT` | `ui/screen-leave-apply.md`, `delivery/07-api-contracts.md`, `delivery/tables/table-leave-request.md` | employee submit mainline |
| `TRACE-LEAVE-002` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-APPROVAL` | `UC-LEAVE-APPROVE` | `API-LEAVE-APPROVE` | `TABLE-LEAVE_REQUEST`, `TABLE-LEAVE_APPROVAL`, `TABLE-LEAVE_BALANCE_LEDGER` | `ACC-LEAVE-APPROVE-SUCCESS` | `WS-LEAVE-MANAGER-APPROVAL`, `WS-LEAVE-SIDE-EFFECTS` | `ui/screen-leave-approval.md`, `delivery/09-events-and-side-effects.md` | manager approve mainline plus side effects |
| `TRACE-LEAVE-003` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-APPROVAL` | `UC-LEAVE-REJECT` | `API-LEAVE-REJECT` | `TABLE-LEAVE_REQUEST`, `TABLE-LEAVE_APPROVAL` | `ACC-LEAVE-REJECT-REASON` | `WS-LEAVE-MANAGER-APPROVAL` | `ui/screen-leave-approval.md`, `delivery/12-test-and-acceptance.md` | reject reason constraint |
| `TRACE-LEAVE-004` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-DETAIL` | `UC-LEAVE-WITHDRAW` | `API-LEAVE-WITHDRAW` | `TABLE-LEAVE_REQUEST` | `ACC-LEAVE-WITHDRAW-SUCCESS` | `WS-LEAVE-QUERY-WITHDRAW` | `ui/screen-leave-detail.md`, `delivery/07-api-contracts.md` | employee withdraw path |
| `TRACE-LEAVE-005` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-LIST` | `UC-LEAVE-LIST-QUERY` | `API-LEAVE-LIST` | `TABLE-LEAVE_REQUEST` | `ACC-LEAVE-LIST-VIEW` | `WS-LEAVE-QUERY-WITHDRAW` | `ui/screen-leave-list.md`, `delivery/07-api-contracts.md` | query and visibility path |

## Rule Links

| Rule ID | Flows | Screens | APIs | Tables | Notes |
| --- | --- | --- | --- | --- | --- |
| `RULE-LEAVE-001` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-APPLY` | `API-LEAVE-CREATE` | `TABLE-LEAVE_REQUEST` | required submission fields |
| `RULE-LEAVE-003` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-APPLY` | `API-LEAVE-CREATE` | `TABLE-LEAVE_BALANCE_LEDGER` | annual leave balance gate |
| `RULE-LEAVE-004` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-DETAIL` | `API-LEAVE-WITHDRAW`, `API-LEAVE-DETAIL` | `TABLE-LEAVE_REQUEST` | editable and withdrawable states |
| `RULE-LEAVE-005` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-APPROVAL` | `API-LEAVE-APPROVE`, `API-LEAVE-REJECT` | `TABLE-LEAVE_REQUEST` | approval scope restriction |
| `RULE-LEAVE-006` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-APPROVAL` | `API-LEAVE-APPROVE` | `TABLE-LEAVE_APPROVAL`, `TABLE-LEAVE_BALANCE_LEDGER` | approval side effects |
| `RULE-LEAVE-007` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-APPROVAL` | `API-LEAVE-REJECT` | `TABLE-LEAVE_APPROVAL` | reject reason required |
| `RULE-LEAVE-009` | `FLOW-LEAVE-001` | `SCREEN-LEAVE-APPLY` | `API-LEAVE-CREATE` | `TABLE-LEAVE_REQUEST` | time-conflict prevention |

## Reverse Lookup

| Lookup Type | ID | Primary Trace | Primary Workset | Expand Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| `Screen` | `SCREEN-LEAVE-APPLY` | `TRACE-LEAVE-001` | `WS-LEAVE-EMPLOYEE-SUBMIT` | `ui/screen-leave-apply.md` | submit entry |
| `Screen` | `SCREEN-LEAVE-APPROVAL` | `TRACE-LEAVE-002`, `TRACE-LEAVE-003` | `WS-LEAVE-MANAGER-APPROVAL` | `ui/screen-leave-approval.md` | decision entry |
| `Screen` | `SCREEN-LEAVE-LIST` | `TRACE-LEAVE-005` | `WS-LEAVE-QUERY-WITHDRAW` | `ui/screen-leave-list.md` | query entry |
| `Screen` | `SCREEN-LEAVE-DETAIL` | `TRACE-LEAVE-004` | `WS-LEAVE-QUERY-WITHDRAW` | `ui/screen-leave-detail.md` | withdraw and result visibility |
| `Action` | `ACTION-LEAVE-APPLY-020` | `TRACE-LEAVE-001` | `WS-LEAVE-EMPLOYEE-SUBMIT` | `ui/screen-leave-apply.md` | submit button on apply page |
| `Action` | `ACTION-LEAVE-APPROVAL-010` | `TRACE-LEAVE-002` | `WS-LEAVE-MANAGER-APPROVAL`, `WS-LEAVE-SIDE-EFFECTS` | `ui/screen-leave-approval.md` | approve button on approval page |
| `Action` | `ACTION-LEAVE-APPROVAL-020` | `TRACE-LEAVE-003` | `WS-LEAVE-MANAGER-APPROVAL` | `ui/screen-leave-approval.md` | reject button on approval page |
| `Action` | `ACTION-LEAVE-DETAIL-010` | `TRACE-LEAVE-004` | `WS-LEAVE-QUERY-WITHDRAW` | `ui/screen-leave-detail.md` | withdraw button on detail page |
| `Action` | `ACTION-LEAVE-LIST-010` | `TRACE-LEAVE-005` | `WS-LEAVE-QUERY-WITHDRAW` | `ui/screen-leave-list.md` | query action on list page |
| `Field` | `FIELD-LEAVE-APPLY-050` | `TRACE-LEAVE-001` | `WS-LEAVE-EMPLOYEE-SUBMIT` | `ui/screen-leave-apply.md` | leave reason input |
| `Field` | `FIELD-LEAVE-APPROVAL-010` | `TRACE-LEAVE-003` | `WS-LEAVE-MANAGER-APPROVAL` | `ui/screen-leave-approval.md` | reject reason or approval comment |
| `Flow Node` | `STEP-LEAVE-040` | `TRACE-LEAVE-001` | `WS-LEAVE-EMPLOYEE-SUBMIT` | `flows/index.md`, `flows/main-flow.mmd` | submit request node |
| `Flow Node` | `STEP-LEAVE-080` | `TRACE-LEAVE-002`, `TRACE-LEAVE-003` | `WS-LEAVE-MANAGER-APPROVAL` | `flows/index.md`, `flows/main-flow.mmd` | enter approval branch |
| `Flow Node` | `STEP-LEAVE-110` | `TRACE-LEAVE-002` | `WS-LEAVE-SIDE-EFFECTS` | `flows/index.md`, `delivery/09-events-and-side-effects.md` | post-approval linkage |
| `API` | `API-LEAVE-CREATE` | `TRACE-LEAVE-001` | `WS-LEAVE-EMPLOYEE-SUBMIT` | `delivery/07-api-contracts.md` | create request |
| `API` | `API-LEAVE-APPROVE` | `TRACE-LEAVE-002` | `WS-LEAVE-MANAGER-APPROVAL`, `WS-LEAVE-SIDE-EFFECTS` | `delivery/07-api-contracts.md`, `delivery/09-events-and-side-effects.md` | approval plus downstream effects |
| `API` | `API-LEAVE-REJECT` | `TRACE-LEAVE-003` | `WS-LEAVE-MANAGER-APPROVAL` | `delivery/07-api-contracts.md` | reject reason enforcement |
| `API` | `API-LEAVE-WITHDRAW` | `TRACE-LEAVE-004` | `WS-LEAVE-QUERY-WITHDRAW` | `delivery/07-api-contracts.md` | withdraw path |
| `API` | `API-LEAVE-LIST` | `TRACE-LEAVE-005` | `WS-LEAVE-QUERY-WITHDRAW` | `delivery/07-api-contracts.md` | list visibility |
| `Table` | `TABLE-LEAVE_REQUEST` | `TRACE-LEAVE-001`, `TRACE-LEAVE-004`, `TRACE-LEAVE-005` | `WS-LEAVE-EMPLOYEE-SUBMIT`, `WS-LEAVE-QUERY-WITHDRAW` | `delivery/tables/table-leave-request.md` | main request object |
| `Table` | `TABLE-LEAVE_APPROVAL` | `TRACE-LEAVE-002`, `TRACE-LEAVE-003` | `WS-LEAVE-MANAGER-APPROVAL` | `delivery/tables/table-leave-approval.md` | manager decision record |
| `Table` | `TABLE-LEAVE_BALANCE_LEDGER` | `TRACE-LEAVE-002` | `WS-LEAVE-SIDE-EFFECTS` | `delivery/tables/table-leave-balance-ledger.md` | downstream balance linkage |
| `Acceptance` | `ACC-LEAVE-SUBMIT-SUCCESS` | `TRACE-LEAVE-001` | `WS-LEAVE-EMPLOYEE-SUBMIT` | `delivery/12-test-and-acceptance.md` | submit acceptance anchor |
| `Acceptance` | `ACC-LEAVE-APPROVE-SUCCESS` | `TRACE-LEAVE-002` | `WS-LEAVE-MANAGER-APPROVAL`, `WS-LEAVE-SIDE-EFFECTS` | `delivery/12-test-and-acceptance.md` | approval acceptance anchor |
| `Acceptance` | `ACC-LEAVE-REJECT-REASON` | `TRACE-LEAVE-003` | `WS-LEAVE-MANAGER-APPROVAL` | `delivery/12-test-and-acceptance.md` | reject reason anchor |
| `Acceptance` | `ACC-LEAVE-WITHDRAW-SUCCESS` | `TRACE-LEAVE-004` | `WS-LEAVE-QUERY-WITHDRAW` | `delivery/12-test-and-acceptance.md` | withdraw acceptance anchor |
| `Acceptance` | `ACC-LEAVE-LIST-VIEW` | `TRACE-LEAVE-005` | `WS-LEAVE-QUERY-WITHDRAW` | `delivery/12-test-and-acceptance.md` | list acceptance anchor |
