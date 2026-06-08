# Gate Decision

## Verdict

- Current Verdict: `Not Run`
- Gate Mode: `Not Selected`
- Feature: `__FEATURE_BRANCH__`
- Last Reviewed: `__FEATURE_DATE__`
- Allowed final verdicts: `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION`.

`Not Run` is the initialization state only. Do not treat it as a blocker until
`/sp.gate` has reviewed real feature evidence.

## Evidence

- Source documents or memory entries reviewed: _Not reviewed yet._
- Latest analysis evidence: _Not reviewed yet._
- Memory check evidence: _Not run yet._

## Entry Checks

| Check | Status | Evidence |
| --- | --- | --- |
| _Add a real gate check after review._ |  |  |

Suggested gate modes:

- `Business Gate`: scope, clarification, flow, UI, and acceptance stability.
- `Delivery Gate`: bundle, worksets, trace, and planning stability.
- `Implementation Readiness Gate`: `plan.md` `Implementation Readiness`, code/test mapping, runtime commands, write boundaries, and `Mode: impl` task packets.
- `Implementation Regression Gate`: implementation evidence, independently checkable tests/build/lint/typecheck/manual checks, and unresolved trace warnings.

## Blocking Gaps

- Record only explicit blockers.
- If there are no blockers, state that clearly.
- Register any blocker that affects scope, release, rollback, safety, data, permissions, or acceptance in `memory/open-items.md`.
- Do not pass the gate while a blocking `@r0` or unresolved high-impact `@t0` remains without owner, impact, rollback or degrade path, and close condition.
- Do not pass an Implementation Readiness Gate if `plan.md` `Implementation Readiness` is missing, stale, or contradicted by open blockers, missing runtime commands, missing code/test mapping, or incomplete workset code boundaries.
- Do not pass an Implementation Readiness Gate if `Mode: impl` tasks lack `Allowed Write Set`, `Required Checks`, effective defaults, or trace anchors/no-trace reason.
- Do not pass an Implementation Regression Gate from `/sp.implement` prose alone when tests, build, lint, typecheck, or critical manual checks are available to rerun or independently verify.
- Do not pass when high-risk boundary `CODE` trace or acceptance-critical `TEST` trace is missing without an open item, or when a normal trace warning has crossed the stage unresolved.

## Accepted Risks

- `None`
- If `/sp.gate` accepts or defers a risk, record owner, impact scope, rollback or degrade path, close condition, and revisit anchor.

## Fallback

- If the first layer is not stable enough, name the exact `/sp.*` step to revisit.
- Prefer one-level fallback: flow or UI gap -> `/sp.flow` or `/sp.ui`; business ambiguity -> `/sp.clarify`; scope conflict -> `/sp.specify`.
- For implementation readiness gaps, prefer `/sp.plan` when boundaries/readiness are wrong and `/sp.tasks` when task packets are incomplete.
- For stale diagnostics, prefer `/sp.analyze` before recomputing the whole gate.

## Next Step

- `None`
- After review, name the next safe `/sp.*` command or the required human decision.
