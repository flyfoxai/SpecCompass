# Workset: WS-SIDE-EFFECTS

Coordinate: `FEAT01.WS04`

This is a placeholder workset. Keep it only if the feature has real downstream
events, audit, notification, compensation, integration, or rollback behavior.

## Scope

- Add the exact scope of this bounded downstream or reliability area.
- Treat unresolved rollback, idempotency, or safety gaps as open items.

## Read Set

1. `memory/stable-context.md`
2. `memory/open-items.md`
3. `memory/trace-index.md`
4. Add only the flow, delivery, table, and analysis files needed for this workset.

## Owned Anchors

- Coordinate: `FEAT01.WS04.ACC01`
- APIs:
- Tables:
- Acceptance:

## Exit Checks

- Event order or external dependency order is explicit when applicable.
- Compensation, rollback, or degrade behavior is visible when applicable.
- Open risks remain listed rather than guessed away.
