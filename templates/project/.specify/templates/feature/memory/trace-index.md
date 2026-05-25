# Trace Index

## Query Shortcuts

| If You Need To... | Start With | Then Expand | Primary Workset |
| --- | --- | --- | --- |
| _Add real shortcuts after trace chains exist._ |  |  |  |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Refresh Date | `__FEATURE_DATE__` |
| Source Of Truth | `flows/*`, `ui/*`, `delivery/07-api-contracts.md`, `delivery/tables/*`, `delivery/12-test-and-acceptance.md` |
| Required Sync Files | `memory/index.md`, `memory/stable-context.md`, `memory/open-items.md`, `memory/worksets/index.md`, `memory/worksets/ws-*.md`, `clarify-log.md` |
| Stale Trigger | flow node IDs, screen IDs, API anchors, or table anchors change |

## Link Rules

- `Trace ID` and `Coordinate` are stable lookup keys.
- `memory/open-items.md` may point here through its `Anchor` column or through files listed in `Affected Docs`.
- A link is valid when `open-items.Anchor` matches any cell in this table, or at least one `Affected Docs` file matches a file in `Expand Docs`.
- Do not add risk or open-item status columns here. Keep risk, blocker, todo, rollback, and close-condition details in `memory/open-items.md`.
- If the target project already has an external code graph such as CodeGraph, it may be used as optional supporting evidence for impact analysis. Do not require it, and do not treat its database or watcher state as part of this feature's source of truth.
- Suggested trace IDs: `TRACE-001`, `TRACE-002`, ...
- Suggested coordinates: `FEAT01.WS01.ACC01`, `FEAT01.WS02.ACC01`, ...

## Key Trace Chains

| Trace ID | Coordinate | Flow | Screen | Use Case | API | Table | Acceptance | Workset | Expand Docs | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _Add a real trace chain after evidence exists._ |  |  |  |  |  |  |  |  |  |  |
