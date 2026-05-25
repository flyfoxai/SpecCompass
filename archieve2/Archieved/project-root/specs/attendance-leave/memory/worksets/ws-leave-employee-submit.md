# WS-LEAVE-EMPLOYEE-SUBMIT Employee Submit Path

## Fast Entry

| Use This Workset When... | Keywords | Context Budget | Start Here |
| --- | --- | --- | --- |
| the question is about employee apply fields, draft, submit validation, time range, or create payload | apply, draft, submit, balance, half-day, conflict, timezone | small | `TRACE-LEAVE-001`, `RULE-LEAVE-001`, `RULE-LEAVE-003`, `RULE-LEAVE-009` |

## Minimum Read Set

1. `memory/stable-context.md`
2. `memory/open-items.md` for `OPEN-LEAVE-003` and `RISK-LEAVE-003`
3. `memory/trace-index.md` for `TRACE-LEAVE-001`
4. `ui/screen-leave-apply.md`
5. `delivery/07-api-contracts.md`

## Goal

Keep the employee-side apply and submit path stable enough that later agents can work without reading the whole feature.

## In Scope

- `SCREEN-LEAVE-APPLY`
- `UC-LEAVE-SAVE-DRAFT`
- `UC-LEAVE-SUBMIT`
- `API-LEAVE-DRAFT-SAVE`
- `API-LEAVE-CREATE`
- `TABLE-LEAVE_REQUEST`
- `RULE-LEAVE-001`, `RULE-LEAVE-002`, `RULE-LEAVE-003`, `RULE-LEAVE-008`, `RULE-LEAVE-009`

## Out Of Scope

- manager approval decision logic
- approval side-effect ordering
- list and detail read-path behavior except where submit result routes into them

## Key Trace Chains

| Trace ID | Why It Matters |
| --- | --- |
| `TRACE-LEAVE-001` | main submit chain from apply screen to request table and acceptance |

## Required Source Docs

| Priority | Doc |
| --- | --- |
| `P1` | `ui/screen-leave-apply.md` |
| `P1` | `delivery/07-api-contracts.md` |
| `P1` | `delivery/tables/table-leave-request.md` |
| `P2` | `delivery/03-use-case-matrix.md` |
| `P2` | `delivery/12-test-and-acceptance.md` |
| `P3` | `spec.md`, `clarifications.md` |

## Stable Facts

| Fact ID | Statement |
| --- | --- |
| `FACT-LEAVE-EMP-001` | employee submit mainline is already fixed |
| `FACT-LEAVE-EMP-002` | draft and submit are separate actions |
| `FACT-LEAVE-EMP-003` | annual leave submit is blocked when balance is insufficient |
| `FACT-LEAVE-EMP-004` | half-day leave cannot be cross-day in current scope |

## Open Items

| Item ID | Why It Matters |
| --- | --- |
| `OPEN-LEAVE-003` | timezone storage and field precision are still under-specified |
| `RISK-LEAVE-003` | UI, API, and table interpretation can drift on half-day and cross-day rules |

## Adjacent Dependencies

| Dependency Type | Workset | Relationship |
| --- | --- | --- |
| downstream | `WS-LEAVE-MANAGER-APPROVAL` | successful submit creates requests for later approval |
| downstream | `WS-LEAVE-QUERY-WITHDRAW` | created requests must remain queryable and withdrawable when pending |

## Completion Signals

- apply page fields, visibility, and validation rules are mutually aligned
- submit API validation and request-table fields do not drift
- acceptance for submit success remains fully traceable
