# Feature Memory Index

## Question Routing Matrix

| If You Need To... | Read First | Then Expand Only If Needed | Primary Workset |
| --- | --- | --- | --- |
| confirm stable scope, actors, stages, and objects | `memory/stable-context.md` | `bundle.md` | none |
| find unresolved risks or rollback advice | `memory/open-items.md` | `analysis.md`, `delivery/09-events-and-side-effects.md`, `delivery/12-test-and-acceptance.md` | `WS-SIDE-EFFECTS` |
| trace a screen, API, table, or acceptance item across docs | `memory/trace-index.md` | the listed source docs in the matching trace row | depends on the matched trace |
| pick the smallest bounded work area | `memory/worksets/index.md` | the selected `ws-*.md` | the selected workset |
| refine the primary user journey | `memory/worksets/ws-primary-journey.md` | `ui/screen-primary.md`, `delivery/07-api-contracts.md` | `WS-PRIMARY-JOURNEY` |
| refine decision, review, or approval behavior | `memory/worksets/ws-decision-and-approval.md` | `ui/screen-review.md`, `delivery/08-permissions-matrix.md` | `WS-DECISION-AND-APPROVAL` |
| refine list, detail, or follow-up behavior | `memory/worksets/ws-query-and-followup.md` | `ui/screen-list.md`, `ui/screen-detail.md` | `WS-QUERY-AND-FOLLOWUP` |
| refine downstream events or compensation | `memory/worksets/ws-side-effects.md` | `delivery/09-events-and-side-effects.md`, `analysis.md` | `WS-SIDE-EFFECTS` |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Feature | `__FEATURE_BRANCH__` |
| Stage | initial feature scaffold instantiated from project template root |
| Latest Gate | `Pending Review` |
| Latest Analysis | `Pending Analysis` |
| Refresh Date | `__FEATURE_DATE__` |
| Source Of Truth | `spec.md`, `clarifications.md`, `gate.md`, `bundle.md`, `analysis.md` |
| Required Sync Files | `memory/stable-context.md`, `memory/open-items.md`, `memory/trace-index.md`, `memory/worksets/index.md`, `memory/worksets/ws-*.md`, `.specify/memory/active-context.md` |
| Stale Trigger | any change to workset split, gate verdict, analysis verdict, or trace anchors |

## Recommended Read Order

1. `memory/index.md`
2. `memory/stable-context.md`
3. `memory/open-items.md`
4. `memory/worksets/index.md`
5. the target `ws-*.md`
6. `memory/trace-index.md` only when cross-doc tracing is needed
7. only the source docs named by that workset or trace row
