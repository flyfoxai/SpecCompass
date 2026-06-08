# Delivery Plan

## Scope

This planning pass converts `__FEATURE_TITLE__` into delivery-ready documentation while keeping the source requirement anchored in `spec.md`.

Current feature statement:

- `__FEATURE_DESCRIPTION__`

## Phases

1. stabilize the feature trace from spec to screens, APIs, tables, and acceptance paths
2. split the feature into bounded worksets that can be refined independently
3. make side effects, permissions, and ownership explicit
4. define source layout, validation commands, and code/test landing boundaries
5. leave the feature ready for `sp.tasks` and later analysis

## Key Trace Chain

- `spec.md -> flows/* -> ui/* -> delivery/* -> plan.md -> tasks.md -> analysis.md`
- implementation trace extends this chain with stable `CODE` and `TEST` entries only where they add durable value
- keep every major design object attached to a visible acceptance path

## Delivery Objects

- `flows/` for user journeys, sequence, and state transitions
- `ui/` for screen map, primary interaction, detail/list/review surfaces, and form structure
- `delivery/` for scope, tables, APIs, permissions, events, module boundaries, and acceptance
- `memory/` for routing, trace, open items, and workset-local context

## Workset Strategy

- isolate the primary journey into one bounded workset
- separate review or approval behavior if it introduces different roles or permissions
- separate query/detail/follow-up behavior when it can evolve independently
- isolate side effects and compensation logic when failure handling matters

## Source Layout

| Workset | Source Area | Boundary Object / Key File | Notes |
| --- | --- | --- | --- |
| `WS-PRIMARY-JOURNEY` | _TBD_ | _TBD_ | keep at module, directory, boundary-object, or key-file level until implementation evidence exists |

## Runtime Commands

| Purpose | Command | Evidence Required |
| --- | --- | --- |
| install/setup | _TBD_ | command exists or explicit not applicable |
| unit/integration tests | _TBD_ | required for `Mode: impl` tasks when feasible |
| build/lint/typecheck | _TBD_ | required when supported by the project |
| smoke/manual verification | _TBD_ | required when automation is unavailable |

## Code Mapping

| Workset | Flow/UI/API/Data/Perm/Event/ACC Anchor | Source Boundary | CODE Trace Needed? |
| --- | --- | --- | --- |
| `WS-PRIMARY-JOURNEY` | _TBD_ | _TBD_ | `Yes` only for high-risk boundary objects |

## Test Mapping

| Acceptance / Risk Anchor | Test Path or Manual Check | TEST Trace Needed? |
| --- | --- | --- |
| `ACC-PRIMARY-SUCCESS` | _TBD_ | `Yes` for acceptance-critical tests |

## Workset Code Boundary

| Workset | Allowed Write Set | Forbidden / Shared Write Set | Serial Closeout Needed? |
| --- | --- | --- | --- |
| `WS-PRIMARY-JOURNEY` | _TBD_ | `tasks.md`, `memory/open-items.md`, `memory/trace-index.md`, routing files, and global registries unless explicitly allowed | _TBD_ |

## Global Registry Risk

| Registry / Shared File | Affected Workset | Risk | Owner / Serial Step | Verification |
| --- | --- | --- | --- | --- |
| package manifests, lockfiles, route registries, schemas, permission matrices, global config, cross-module contracts, migrations, or event registries | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Implementation Readiness

`Implementation Readiness` is the single source of truth for whether `/sp.tasks`
may generate `Mode: impl` tasks. `/sp.analyze` diagnoses this section and
`/sp.gate` decides stage passage; they should not invent a separate readiness
source.

| Workset | Readiness | Missing Evidence / Blocker | Next Route |
| --- | --- | --- | --- |
| `WS-PRIMARY-JOURNEY` | `Not Ready` | source layout, runtime commands, code mapping, test mapping, and write boundary must be confirmed | `/sp.plan` |

## Memory Entry

- project route: `.specify/memory/project-index.md`
- feature route: `memory/index.md`
- bounded work area: `memory/worksets/index.md`

## Risks Carried Forward

- routing can go stale if worksets or stage outputs change without refreshing memory
- acceptance paths become weak if screens, APIs, and tables are named but not linked
- side effects are automation-sensitive and should be called out early when present

## Auto-Development Readiness

This file is the delivery-planning and implementation-readiness layer. The
feature is ready for later implementation only after `Implementation Readiness`,
`tasks.md`, `analysis.md`, gate evidence, and project-level memory stay aligned.
