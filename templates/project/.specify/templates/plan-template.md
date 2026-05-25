# Delivery Plan

## Scope

This planning pass converts `__FEATURE_TITLE__` into delivery-ready documentation while keeping the source requirement anchored in `spec.md`.

Current feature statement:

- `__FEATURE_DESCRIPTION__`

## Phases

1. stabilize the feature trace from spec to screens, APIs, tables, and acceptance paths
2. split the feature into bounded worksets that can be refined independently
3. make side effects, permissions, and ownership explicit
4. leave the feature ready for `sp.tasks` and later analysis

## Key Trace Chain

- `spec.md -> flows/* -> ui/* -> delivery/* -> tasks.md -> analysis.md`
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

## Memory Entry

- project route: `.specify/memory/project-index.md`
- feature route: `memory/index.md`
- bounded work area: `memory/worksets/index.md`

## Risks Carried Forward

- routing can go stale if worksets or stage outputs change without refreshing memory
- acceptance paths become weak if screens, APIs, and tables are named but not linked
- side effects are automation-sensitive and should be called out early when present

## Auto-Development Readiness

This file is only the delivery-planning layer. The feature is ready for later automation only after `tasks.md`, `analysis.md`, and project-level memory stay aligned.
