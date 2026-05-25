# WS-LEAVE-MANAGER-APPROVAL Manager Approval Path

## Fast Entry

| Use This Workset When... | Keywords | Context Budget | Start Here |
| --- | --- | --- | --- |
| the question is about approve, reject, manager scope, reject reason, or approval permissions | approve, reject, scope, reason, permission, approval | small | `TRACE-LEAVE-002`, `TRACE-LEAVE-003`, `RULE-LEAVE-005`, `RULE-LEAVE-007` |

## Minimum Read Set

1. `memory/stable-context.md`
2. `memory/open-items.md` for `OPEN-LEAVE-002`
3. `memory/trace-index.md` for `TRACE-LEAVE-002` and `TRACE-LEAVE-003`
4. `ui/screen-leave-approval.md`
5. `delivery/07-api-contracts.md`

## Goal

Localize the manager decision area so approval and reject work can be refined without reopening unrelated screens.

## In Scope

- `SCREEN-LEAVE-APPROVAL`
- `UC-LEAVE-APPROVE`
- `UC-LEAVE-REJECT`
- `API-LEAVE-APPROVE`
- `API-LEAVE-REJECT`
- `TABLE-LEAVE_APPROVAL`
- `RULE-LEAVE-005`, `RULE-LEAVE-006`, `RULE-LEAVE-007`

## Out Of Scope

- employee submission fields
- full side-effect compensation design beyond the approval handoff
- global HR exception workflows

## Key Trace Chains

| Trace ID | Why It Matters |
| --- | --- |
| `TRACE-LEAVE-002` | approval path and handoff to downstream effects |
| `TRACE-LEAVE-003` | reject path and reject reason enforcement |

## Required Source Docs

| Priority | Doc |
| --- | --- |
| `P1` | `ui/screen-leave-approval.md` |
| `P1` | `delivery/07-api-contracts.md` |
| `P1` | `delivery/tables/table-leave-approval.md` |
| `P2` | `delivery/03-use-case-matrix.md` |
| `P2` | `delivery/12-test-and-acceptance.md` |
| `P3` | `clarifications.md`, `delivery/02-screen-to-delivery-map.md` |

## Stable Facts

| Fact ID | Statement |
| --- | --- |
| `FACT-LEAVE-MGR-001` | only managers with owned scope may act |
| `FACT-LEAVE-MGR-002` | reject requires comment |
| `FACT-LEAVE-MGR-003` | approve creates approval record and triggers downstream side effects |

## Open Items

| Item ID | Why It Matters |
| --- | --- |
| `RISK-LEAVE-001` | approval outcome is stable, but downstream order is not rigid enough |
| `OPEN-LEAVE-002` | notification failure semantics affect approve-result handling |

## Adjacent Dependencies

| Dependency Type | Workset | Relationship |
| --- | --- | --- |
| upstream | `WS-LEAVE-EMPLOYEE-SUBMIT` | consumes requests created by employee submit |
| downstream | `WS-LEAVE-SIDE-EFFECTS` | approve path hands off downstream event pressure |
| downstream | `WS-LEAVE-QUERY-WITHDRAW` | rejection and approval results become visible in query and detail paths |

## Completion Signals

- approval page actions, permissions, and API preconditions remain aligned
- reject reason rule is enforced consistently in page, API, and acceptance
- manager-owned scope check is explicit in both permission and API docs
