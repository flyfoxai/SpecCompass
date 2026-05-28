# Gate Decision

## Verdict

- Current Verdict: `Not Run`
- Feature: `__FEATURE_BRANCH__`
- Last Reviewed: `__FEATURE_DATE__`

`Not Run` is the initialization state only. Do not treat it as a blocker until
`/sp.gate` has reviewed real feature evidence.

## Evidence

- Source documents or memory entries reviewed: _Not reviewed yet._
- Memory check evidence: _Not run yet._

## Entry Checks

| Check | Status | Evidence |
| --- | --- | --- |
| _Add a real gate check after review._ |  |  |

## Blocking Gaps

- Record only explicit blockers.
- If there are no blockers, state that clearly.
- Register any blocker that affects scope, release, rollback, safety, data, permissions, or acceptance in `memory/open-items.md`.
- Do not pass the gate while a blocking `@r0` or unresolved high-impact `@t0` remains without owner, impact, rollback or degrade path, and close condition.

## Accepted Risks

- `None`
- If `/sp.gate` accepts or defers a risk, record owner, impact scope, rollback or degrade path, close condition, and revisit anchor.

## Fallback

- If the first layer is not stable enough, name the exact `/sp.*` step to revisit.
- Prefer one-level fallback: flow or UI gap -> `/sp.flow` or `/sp.ui`; business ambiguity -> `/sp.clarify`; scope conflict -> `/sp.specify`.

## Next Step

- `None`
- After review, name the next safe `/sp.*` command or the required human decision.
