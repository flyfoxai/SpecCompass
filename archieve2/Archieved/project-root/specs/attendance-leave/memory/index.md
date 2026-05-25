# Feature Memory Index

## Question Routing Matrix

| If You Need To... | Read First | Then Expand Only If Needed | Primary Workset |
| --- | --- | --- | --- |
| confirm stable scope, actors, stages, and objects | `memory/stable-context.md` | `bundle.md` | none |
| find unresolved risks or rollback advice | `memory/open-items.md` | `analysis.md`, `delivery/09-events-and-side-effects.md`, `delivery/12-test-and-acceptance.md` | `WS-LEAVE-SIDE-EFFECTS` |
| trace a screen, API, table, or acceptance item across docs | `memory/trace-index.md` | the listed source docs in the matching trace row | depends on the matched trace |
| pick the smallest bounded work area | `memory/worksets/index.md` | the selected `ws-*.md` | the selected workset |
| refine employee submit behavior | `memory/worksets/ws-leave-employee-submit.md` | `ui/screen-leave-apply.md`, `delivery/07-api-contracts.md` | `WS-LEAVE-EMPLOYEE-SUBMIT` |
| refine manager approve or reject behavior | `memory/worksets/ws-leave-manager-approval.md` | `ui/screen-leave-approval.md`, `delivery/07-api-contracts.md` | `WS-LEAVE-MANAGER-APPROVAL` |
| refine list, detail, or withdraw behavior | `memory/worksets/ws-leave-query-withdraw.md` | `ui/screen-leave-list.md`, `ui/screen-leave-detail.md` | `WS-LEAVE-QUERY-WITHDRAW` |
| refine approval side effects or compensation | `memory/worksets/ws-leave-side-effects.md` | `delivery/09-events-and-side-effects.md`, `analysis.md` | `WS-LEAVE-SIDE-EFFECTS` |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Feature | `attendance-leave` |
| Stage | document stage complete, now optimized for localized planning and review |
| Latest Gate | `PASS WITH OPEN QUESTIONS` |
| Latest Analysis | `PASS WITH RISKS` |
| Refresh Date | `2026-04-02` |
| Refresh Basis | `gate.md`, `bundle.md`, `analysis.md`, `memory/worksets/*` |
| Source Of Truth | `spec.md`, `clarifications.md`, `gate.md`, `bundle.md`, `analysis.md` |
| Required Sync Files | `memory/stable-context.md`, `memory/open-items.md`, `memory/trace-index.md`, `memory/worksets/index.md`, `memory/worksets/ws-*.md`, `.specify/memory/active-context.md` |
| Stale Trigger | `clarify-log.md` has non-closed propagation, workset split changes, gate or analysis verdict changes |

## Recommended Read Order

1. `memory/index.md`
2. `memory/stable-context.md`
3. `memory/open-items.md`
4. `memory/worksets/index.md`
5. the target `ws-*.md`
6. `memory/trace-index.md` only when cross-doc tracing is needed
7. only the source docs named by that workset or trace row

## Hotspots

| Hotspot | Why It Matters | Where To Start |
| --- | --- | --- |
| approval side effects | highest current automation risk | `WS-LEAVE-SIDE-EFFECTS` |
| timezone precision | affects UI, API, and table alignment | `OPEN-LEAVE-003`, `WS-LEAVE-EMPLOYEE-SUBMIT` |
| reject and withdraw acceptance density | affects later low-supervision confidence | `RISK-LEAVE-002`, `WS-LEAVE-QUERY-WITHDRAW` |

## Stable Context Entry

| Topic | What Is Already Stable | Start Here |
| --- | --- | --- |
| business backbone | first-layer business framework is fixed | `memory/stable-context.md` |
| role and stage model | actors, stages, and object backbone are stable | `memory/stable-context.md` |
| second-layer handoff | stable delivery anchors exist | `bundle.md` |

## Trace Entry

| Chain | Best Entry | Main Workset |
| --- | --- | --- |
| submit mainline | `TRACE-LEAVE-001` | `WS-LEAVE-EMPLOYEE-SUBMIT` |
| approve mainline | `TRACE-LEAVE-002` | `WS-LEAVE-MANAGER-APPROVAL`, `WS-LEAVE-SIDE-EFFECTS` |
| withdraw mainline | `TRACE-LEAVE-004` | `WS-LEAVE-QUERY-WITHDRAW` |

## Workset Entry

| Workset | Use It When... | Avoid It When... |
| --- | --- | --- |
| `WS-LEAVE-EMPLOYEE-SUBMIT` | the issue is about apply fields, submit validation, draft, or create API | the issue is about approval or notifications |
| `WS-LEAVE-MANAGER-APPROVAL` | the issue is about approve, reject, scope, or manager permissions | the issue is about downstream compensation ordering |
| `WS-LEAVE-QUERY-WITHDRAW` | the issue is about list, detail, visibility, or withdraw | the issue is about create validation or approval internals |
| `WS-LEAVE-SIDE-EFFECTS` | the issue is about post-approval events, balance, notification, or compensation | the issue is only about page fields or list UI |

## Open Items Entry

| Priority | Current Focus | Start Here |
| --- | --- | --- |
| `High` | side-effect order and compensation semantics | `RISK-LEAVE-001`, `OPEN-LEAVE-002` |
| `High` | timezone and field precision | `OPEN-LEAVE-003`, `RISK-LEAVE-003` |
| `Medium` | reject and withdraw acceptance density | `RISK-LEAVE-002` |

## Latest Gate

- Gate verdict: `PASS WITH OPEN QUESTIONS`
- Gate conclusion: first-layer documents are sufficient to enter layer 2

## Latest Analysis

- Analysis verdict: `PASS WITH RISKS`
- Current rollback focus: `sp.plan` for side effects and timezone precision, `sp.tasks` for acceptance density
