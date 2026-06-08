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
- For business features, prefer `FLOW` as the relation axis. UI, API, TABLE, CODE, TEST, EVENT, PERM, and ACC entries should normally trace to a `FLOW` coordinate, a source document, or an explicit open item.
- Critical flow steps should expose a lightweight port contract in the source flow document or trace notes: input, precondition or permission, business action, output or side effect, target state, failure path, and verification or acceptance evidence.
- Outputs newly created or refreshed by `sp.flow`, `sp.ui`, or `sp.plan` are draft facts until checked by `sp.analyze`, `sp.gate`, or equivalent current evidence. Before `tasks.md` exists, equivalent current evidence is only a bounded draft-safety check: source backing is visible, stable memory was not overwritten, risks were not closed, PASS was not claimed from the draft, and trace/open-item routing exists or the output remains explicitly draft. Draft facts may route reading, but must not close risks, rewrite stable conclusions, or support PASS.
- Keep public coordinates shallow and stable, for example `FEAT01.WS02.UI03`. Use local labels for details such as `Action: submit` or `Field: email`; do not default to deep IDs such as `UI03.BTN05` or `FLOW01.STEP04`.
- Optional semantic aliases can help search, for example `attendance.leave::UI.APPROVE`.
- Recommended relation verbs: `uses`, `calls`, `persists_to`, `verifies`, `guards`, `blocks`, `depends_on`.
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
