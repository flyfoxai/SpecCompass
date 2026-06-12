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

Standard checks to consider when in scope:

- acceptance, trace, open-items, data-linkage, code/test evidence, and gate mode evidence before business PASS
- direct-neighbor relations across flow, UI, API, data, permissions, events, acceptance, tests, trace, and open items
- document-stage closeout did not stage or commit unauthorized `src/`, `scripts/`, config, generated-code, schema, test-asset, or fixture artifacts
- required code artifacts discovered during document work are represented as next-stage `Mode: impl` code handoff packets

Suggested gate modes:

- `Business Gate`: scope, clarification, flow, UI, and acceptance stability.
- `Delivery Gate`: bundle, worksets, trace, and planning stability.
- `Implementation Readiness Gate`: `plan.md` `Implementation Readiness`, code/test mapping, runtime commands, write boundaries, and `Mode: impl` task packets.
- `Implementation Regression Gate`: implementation evidence, independently checkable tests/build/lint/typecheck/manual checks, and unresolved trace warnings.

## Blocking Gaps

- Record only explicit blockers.
- If there are no blockers, state that clearly.
- Treat `memory/open-items.md` as current-state truth for blockers, risks, decisions, and close conditions. Treat `memory/trace-index.md` as relation/history lookup; refresh trace when it disagrees with open-items.
- Register any blocker that affects scope, release, rollback, safety, data, permissions, or acceptance in `memory/open-items.md`.
- Do not pass the gate while a blocking `@r0` or unresolved high-impact `@t0` remains without owner, impact, rollback or degrade path, and close condition.
- Do not pass an Implementation Readiness Gate if `plan.md` `Implementation Readiness` is missing, stale, or contradicted by open blockers, missing runtime commands, missing code/test mapping, or incomplete workset code boundaries.
- Do not pass an Implementation Readiness Gate if `Mode: impl` tasks lack `Allowed Write Set`, `Required Checks`, effective defaults, or trace anchors/no-trace reason.
- Do not pass an Implementation Regression Gate from `/sp.implement` prose alone when tests, build, lint, typecheck, or critical manual checks are available to rerun or independently verify.
- Do not pass when high-risk boundary `CODE` trace or acceptance-critical `TEST` trace is missing without an open item, or when a normal trace warning has crossed the stage unresolved.
- Do not pass when command success, generated documents, or exit code 0 are the only evidence. They are tool evidence, not business PASS.
- Do not pass when direct-neighbor data-linkage gaps affect acceptance, tests, release, rollback, permissions, data safety, or human decisions.
- Do not pass when document-stage work depends on unauthorized code artifacts instead of a `Mode: impl` code handoff packet.
- Do not pass when a broad blocker has no smallest solvable unit, owner route, verification path, or human decision route.
- Do not pass when blocker closeout has incomplete `Writeback Target` updates; either finish writeback or keep a writeback-incomplete blocker in `memory/open-items.md`.
- Do not pass or advance the stage while a same-blocker `NEEDS_DECISION` freeze remains unresolved. The human-selected decision must be written back to the source doc, task, or `memory/open-items.md`; a model recommendation is not enough.
- Promote blocking fallback-log or `promote-candidate` entries only here or in `/sp.analyze`. If the same failure signature was already promoted, cite the existing open item ID instead of creating a duplicate.

## Accepted Risks

- `None`
- If `/sp.gate` accepts or defers a risk, record owner, impact scope, rollback or degrade path, close condition, and revisit anchor.

## Fallback

- If the first layer is not stable enough, name the exact `/sp.*` step to revisit.
- Prefer one-level fallback: flow or UI gap -> `/sp.flow` or `/sp.ui`; business ambiguity -> `/sp.clarify`; scope conflict -> `/sp.specify`.
- For implementation readiness gaps, prefer `/sp.plan` when boundaries/readiness are wrong and `/sp.tasks` when task packets are incomplete.
- For stale diagnostics, prefer `/sp.analyze` before recomputing the whole gate.
- For blockers that cannot be split safely, return `BLOCKED` or `NEEDS_DECISION` and route to `/sp.clarify` or a direct human decision package with background, impact, 2-4 options, recommendation, and next `/sp.*` route.

## Next Step

- `None`
- After review, name the next safe `/sp.*` command or the required human decision.
