# WS-LEAVE-SIDE-EFFECTS Approval Side Effects

## Fast Entry

| Use This Workset When... | Keywords | Context Budget | Start Here |
| --- | --- | --- | --- |
| the question is about post-approval balance updates, notification dispatch, audit trail, compensation, or idempotency | side effects, notification, compensation, ledger, idempotency, approval event | medium | `TRACE-LEAVE-002`, `RULE-LEAVE-006`, `RISK-LEAVE-001` |

## Minimum Read Set

1. `memory/stable-context.md`
2. `memory/open-items.md` for `OPEN-LEAVE-002` and `RISK-LEAVE-001`
3. `memory/trace-index.md` for `TRACE-LEAVE-002`
4. `delivery/09-events-and-side-effects.md`
5. `analysis.md`

## Goal

Isolate the highest-risk part of the feature so side-effect and compensation refinements do not force a full-document reread.

## In Scope

- approval downstream event chain
- balance ledger linkage
- notification linkage
- audit and compensation entry
- `API-LEAVE-APPROVE`
- `TABLE-LEAVE_BALANCE_LEDGER`
- `RULE-LEAVE-006`
- `ACC-LEAVE-APPROVE-SUCCESS`

## Out Of Scope

- employee page-field validation
- reject reason UI behavior
- query page navigation details

## Key Trace Chains

| Trace ID | Why It Matters |
| --- | --- |
| `TRACE-LEAVE-002` | approval success is the single entry to the downstream event chain |

## Required Source Docs

| Priority | Doc |
| --- | --- |
| `P1` | `delivery/09-events-and-side-effects.md` |
| `P1` | `analysis.md` |
| `P1` | `delivery/07-api-contracts.md` |
| `P2` | `delivery/10-non-functional-requirements.md` |
| `P2` | `delivery/12-test-and-acceptance.md` |
| `P3` | `bundle.md`, `plan.md` |

## Stable Facts

| Fact ID | Statement |
| --- | --- |
| `FACT-LEAVE-SE-001` | approval success must create approval record |
| `FACT-LEAVE-SE-002` | approval success must update request status |
| `FACT-LEAVE-SE-003` | approval success must produce downstream side-effect handling |

## Open Items

| Item ID | Why It Matters |
| --- | --- |
| `RISK-LEAVE-001` | side-effect order is still under-specified and this remains the highest-risk local area |
| `OPEN-LEAVE-002` | compensation and notification failure semantics remain open |

## Adjacent Dependencies

| Dependency Type | Workset Or Doc | Relationship |
| --- | --- | --- |
| upstream | `WS-LEAVE-MANAGER-APPROVAL` | depends on approval decision output |
| downstream | `analysis.md` | directly influences final automation confidence level |

## Completion Signals

- side-effect order is explicit
- idempotency key and failure handling are explicit
- acceptance and event docs reflect the same downstream sequence
