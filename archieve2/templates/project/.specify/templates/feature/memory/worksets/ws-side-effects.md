# Workset: WS-SIDE-EFFECTS

## Scope

- Own downstream events, notification, audit, compensation, and idempotency handling.
- Treat this as the highest-risk workset for later automation.

## Read Set

1. `memory/stable-context.md`
2. `memory/open-items.md`
3. `memory/trace-index.md`
4. `delivery/09-events-and-side-effects.md`
5. `analysis.md`

## Owned Anchors

- APIs: `API-APPROVE`
- Tables: `TABLE-SIDE_EFFECT_LEDGER`
- Acceptance: `ACC-SIDE-EFFECT-STABLE`

## Exit Checks

- Event order is explicit.
- Compensation or rollback behavior is visible.
- Open risks remain listed rather than guessed away.
