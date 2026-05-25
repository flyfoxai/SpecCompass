# WS-LEAVE-QUERY-WITHDRAW Query And Withdraw Path

## Fast Entry

| Use This Workset When... | Keywords | Context Budget | Start Here |
| --- | --- | --- | --- |
| the question is about list, detail, role-based visibility, withdraw, or final status display | list, detail, visibility, withdraw, pending, read-only | small | `TRACE-LEAVE-004`, `TRACE-LEAVE-005`, `RULE-LEAVE-004` |

## Minimum Read Set

1. `memory/stable-context.md`
2. `memory/open-items.md` for `RISK-LEAVE-002`
3. `memory/trace-index.md` for `TRACE-LEAVE-004` and `TRACE-LEAVE-005`
4. `ui/screen-leave-list.md`
5. `ui/screen-leave-detail.md`

## Goal

Keep the read-path and withdraw-path small enough that an agent can refine list/detail behavior without carrying approval internals.

## In Scope

- `SCREEN-LEAVE-LIST`
- `SCREEN-LEAVE-DETAIL`
- `UC-LEAVE-LIST-QUERY`
- `UC-LEAVE-DETAIL-VIEW`
- `UC-LEAVE-WITHDRAW`
- `API-LEAVE-LIST`
- `API-LEAVE-DETAIL`
- `API-LEAVE-WITHDRAW`
- `RULE-LEAVE-004`, `RULE-LEAVE-010`

## Out Of Scope

- request creation validation internals
- manager approve or reject decision behavior
- approval-side compensation sequence

## Key Trace Chains

| Trace ID | Why It Matters |
| --- | --- |
| `TRACE-LEAVE-004` | withdraw path from detail view back to request state |
| `TRACE-LEAVE-005` | list query and visibility path |

## Required Source Docs

| Priority | Doc |
| --- | --- |
| `P1` | `ui/screen-leave-list.md` |
| `P1` | `ui/screen-leave-detail.md` |
| `P1` | `delivery/07-api-contracts.md` |
| `P2` | `delivery/12-test-and-acceptance.md` |
| `P2` | `delivery/03-use-case-matrix.md` |
| `P3` | `clarifications.md`, `delivery/02-screen-to-delivery-map.md` |

## Stable Facts

| Fact ID | Statement |
| --- | --- |
| `FACT-LEAVE-QW-001` | detail view is shared by employee, manager, and HR with role-based visibility |
| `FACT-LEAVE-QW-002` | withdraw is allowed only for own pending requests |
| `FACT-LEAVE-QW-003` | approved and rejected requests are read-only |

## Open Items

| Item ID | Why It Matters |
| --- | --- |
| `RISK-LEAVE-002` | reject and withdraw acceptance prerequisites are still too light |
| `OPEN-LEAVE-001` | future approval-extension scope can later affect cross-role visibility expectations |

## Adjacent Dependencies

| Dependency Type | Workset | Relationship |
| --- | --- | --- |
| upstream | `WS-LEAVE-EMPLOYEE-SUBMIT` | reads request objects created during submit |
| upstream | `WS-LEAVE-MANAGER-APPROVAL` | reflects approval and rejection outcomes in list and detail |

## Completion Signals

- list and detail entry conditions remain aligned with permissions
- withdraw state precondition is consistent in page, API, and acceptance docs
- query result visibility does not contradict role boundaries
