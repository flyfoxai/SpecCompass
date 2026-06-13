# Automation Readiness Analysis

## Verdict

- Current Verdict: `Pending Analysis`
- Feature: `__FEATURE_BRANCH__`
- Review Date: `__FEATURE_DATE__`
- Meaning: initialization state only. It is not a blocker until `/sp.analyze` records evidence.
- Allowed final verdicts: `PASS`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION`.

## What To Check

| Check Area | Current Status | Primary Evidence |
| --- | --- | --- |
| routing and memory | `Pending` | `memory/index.md`, `memory/open-items.md`, `memory/trace-index.md` |
| implementation readiness authority | `Pending` | `plan.md` `Implementation Readiness` |
| task mode integrity | `Pending` | `tasks.md` `Mode: doc` / `Mode: impl` fields |
| implementation task packets | `Pending` | `Allowed Write Set`, `Required Checks`, effective defaults |
| CODE/TEST trace | `Pending` | high-risk boundary `CODE` rows and acceptance-critical `TEST` rows |
| trace warning escalation | `Pending` | task evidence, analysis findings, or `memory/open-items.md` |
| data-linkage constraints | `Pending` | direct-neighbor flow/UI/API/data/permission/event/acceptance/test/trace/open-item relations |
| document/code boundary | `Pending` | document-stage outputs, unauthorized code artifacts, and any `Mode: impl` code handoff packet |
| business PASS evidence | `Pending` | acceptance, trace, open-items, data-linkage, code/test evidence when in scope, and gate route |
| blocker classification | `Pending` | `Blocker Type`, root layer, owner route, and open-items writeback |

## Blocking Actions

- Treat `memory/open-items.md` as the current-state truth source for blockers, risks, decisions, and close conditions. Treat `memory/trace-index.md` as relation/history lookup; if they disagree, use open-items until trace is refreshed.
- List the exact `/sp.*` step to revisit when the verdict is not `PASS`.
- Treat stale memory, missing trace links, unowned blockers, missing smoke checks, and unresolved high-impact risks as evidence for `FAIL`, `BLOCKED`, or `NEEDS_DECISION` depending on whether repair is local, automatic progress is unsafe, or human choice is required.
- Classify each real blocker before retrying: `INFO_GAP`, `SOURCE_AUTHORITY_GAP`, `UPSTREAM_DOC_GAP`, `CODE_TEST_ONLY`, `EXECUTION_INFRA`, `GENERIC_ARTIFACT`, `BUSINESS_DECISION`, `ROUTING_STALE`, or `SCOPE_CONFLICT`.
- Treat stale project/feature routing as `ROUTING_STALE` and repair or route it before broad analysis.
- Treat generic template artifacts without concrete business behavior, source anchors, relation chains, or acceptance evidence as `GENERIC_ARTIFACT`; they cannot support PASS.
- Treat wrapper, timeout, empty-response, exit-143, host, CLI, permission, or network failures as `EXECUTION_INFRA`. Isolate them from business requirements, but do not claim PASS if required evidence depends on the failed execution.
- Treat missing `plan.md` `Implementation Readiness` for implementation tasks as a `/sp.plan` fallback.
- Treat missing `Mode: impl` packet fields as a `/sp.tasks` fallback.
- Treat high-risk missing `CODE` trace or acceptance-critical missing `TEST` trace as blocking unless tracked in `memory/open-items.md`.
- Treat ordinary trace warnings as warnings only while they do not affect acceptance, tests, release, rollback, or human decisions; escalate unresolved cross-stage warnings to blockers.
- Treat missing direct-neighbor data-linkage as blocking when it affects acceptance, tests, release, rollback, permissions, data safety, or human decisions.
- Treat command success, generated documents, and exit code 0 as tool evidence only. They are not business PASS without acceptance, trace, open-item, data-linkage, code/test evidence when in scope, and gate verdict.
- Treat document-stage code discoveries as next-stage `Mode: impl` code handoff packets. Do not let document closeout depend on unauthorized `src/`, `scripts/`, config, generated-code, schema, test-asset, or fixture artifacts.
- If the issue cannot be repaired in analysis, fall back upward to the owning document step instead of inventing missing facts.
- Add check rows only after real analysis evidence exists. Do not keep scaffold reminders as findings.

## Blocker Breakdown

Use this section only for unresolved, high-impact, broad, or repeatedly failing blockers. Keep `memory/open-items.md` as the stable truth source; this section is a report projection.

| Blocker ID | Blocker Type | Failure Signature | Symptom | Evidence | Root Layer | Disconfirming Evidence | Smallest Solvable Unit | Strategy | Verification | Writeback Target | Next Route |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _Add after real analysis evidence exists._ |  |  |  |  |  |  |  |  |  |  |  |

Use failure signatures like `<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>`. Valid root layers include `prd`, `spec`, `clarify`, `flow`, `ui`, `data`, `plan`, `tasks`, `implement`, `verify`, `memory`, `external`, and `human-decision`. Before a second same-signature attempt, fill `Disconfirming Evidence` with the concrete output, file, check, or document evidence that changed the hypothesis.

If blocker routing reaches `NEEDS_DECISION`, downstream work for the same blocker remains frozen until the human-selected decision is written back to the source doc, task, or `memory/open-items.md`. If a `Writeback Target` is incomplete, keep a writeback-incomplete blocker in `memory/open-items.md` instead of claiming PASS.

Only `/sp.analyze` and `/sp.gate` promote fallback-log or `promote-candidate` entries into `memory/open-items.md`. If the same failure signature was already promoted, cite the existing open item ID instead of creating a duplicate.

When the same failure signature appears across many modules, group it as one root blocker family instead of repeating per-module reruns. Command success, generated documents, status summaries, and exit code 0 are not business PASS.
