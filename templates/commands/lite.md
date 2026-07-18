---
description: Run one human-selected, globally governed SP Lite validation round.
scripts:
  sh: scripts/bash/sp-lite-state.sh --json
  ps: scripts/powershell/sp-lite-state.ps1 -Json
---

## User Input

```text
$ARGUMENTS
```

# /sp.lite

## Purpose

Deliver the smallest useful business-validation prototype while preserving the
confirmed Outline as the global roadmap. Lite shortens the selected round; it
does not weaken source authority, human confirmation, shared contracts, or the
eventual requirement to cover the whole Outline.

## Durable Authority

- `specs/<feature>/lite.md` is the durable Lite authority.
- Existing owner commands continue to own PRD, spec, flow, UI, bundle, plan,
  tasks, analysis, gate, and implementation evidence.
- Run `{SCRIPT}` at entry and after every owner command. Accept only schema
  `speckit.lite.route.v1`; do not infer a route when the payload is invalid.
- Read the confirmed Outline, historical Lite rounds, current code baseline,
  open decisions, shared interfaces, data models, and permissions before
  proposing or dispatching work.

## Actions

Interpret `$ARGUMENTS` as one of: `init`, `next`, `select`, `evaluate`, `sync`,
`stop`, `promote`, or `complete`. A free-form value may identify a feature or a
custom Lite validation direction. When intent is ambiguous, remain at the human
selection gate.

## Orchestration Lease

Before mutating `lite.md` or dispatching an owner, acquire the orchestration lease
for this feature. Atomically change an `IDLE` lease to `ACTIVE`, write a
unique `Orchestration Run ID`, the start time, and the current stage. If a
different active run owns the lease, refuse concurrent mutation and stop
without changing round or owner evidence. A stale lease may be replaced only
after explicit human-confirmed takeover; takeover preserves the active round,
ledger, lifecycle state, and completed evidence and records the takeover in the
decision log.

Keep the lease while this invocation is advancing its one-owner loop. On a
human gate, requested stop, evaluation close, normal completion, or terminal
error, release the lease by returning the orchestration fields to `IDLE` and
`None`. Never abandon an `ACTIVE` lease on an ordinary return path.

## New Round Selection

Generate candidates only when the route reports `NEEDS_CANDIDATES`, or after a
human `evaluate` action has recorded the prior round as `EVALUATED` then
`CLOSED` and explicitly chosen to begin another round. At a completed
business-validation gate:

1. Reconcile Outline coverage, previous rounds, current implementation, shared
   contracts, dependencies, open decisions, regressions, and the proposed
   Allowed Write Set.
2. Present 2-3 materially different candidates. Each candidate must name its
   business hypothesis, included Outline anchors, reusable prior evidence,
   minimal prototype boundary, deferred anchors, dependencies, Allowed Write
   Set, validation evidence, expected cost, and global-conflict risk.
3. The agent must not select a direction for the user. Ask the user to select,
   modify, combine, or replace a candidate. A custom direction must be mapped
   back to confirmed Outline anchors. If it cannot be mapped to confirmed Outline anchors,
   return to `/sp.prd` or `/sp.clarify` and must not create a Lite round. An independent
   round is independent only from a prior round; it
   still covers confirmed Outline anchors.
4. Persist a new round only after explicit human selection. Give it a stable
   `LITE-RNNN` id, baseline/parent, included and deferred anchors, current input
   signature, regression set, and Allowed Write Set.

## Global Control Gate

Before candidate presentation and before every dispatch, recompute the global
input signature and update `## Global Control`:

- `CLEAR`: the unique lifecycle owner may run.
- `REUSE_REQUIRED`: stop creating parallel work; link or extend the compatible
  prior round/implementation and obtain a real delta before continuing.
- `RECONCILE_REQUIRED`: stop and dispatch only the named owner route to resolve
  conflicting requirements, decisions, interfaces, data, permissions, or write
  scopes.
- `STALE_EVIDENCE`: stop and refresh the owner evidence whose signature changed.
- `REGRESSION_BLOCKED`: stop implementation or validation until all historical
  Lite regression failures are repaired.

Any non-`CLEAR` result sets `continueAllowed=false`. Never bypass it because the
round is small, independent, already implemented, or close to completion.
Non-`CLEAR` routes are never dispatched automatically. When `Blocker Route`
names an owner command, present that exact repair route for human invocation;
the owner may change only the named conflict, stale, or regression evidence
inside the Allowed Write Set and must return `/sp.lite sync`. Only `/sp.lite`
may then recompute and clear the coordinator state. A blocker owner must not run
normal lifecycle work while global control remains non-`CLEAR`.

## One-Owner Dispatch Loop

Only when the same fresh route has `globalControl=CLEAR`,
`continueAllowed=true`, and `requiresHuman=false`, execute exactly one owner command
from `next`.
Pass the active round id, included/deferred anchors, reuse references, Allowed
Write Set, current global signature, and required historical regressions. Wait
for the owner result, and verify that every changed path is an expected owner
output inside the Allowed Write Set. If any unexplained path changed, stop with
`STALE_EVIDENCE`; do not bless it by replacing the signature. For an expected
owner delta, persist the completed or explicitly skipped owner stage, its
evidence reference, the 64-character before-dispatch source signature in
`Stage Source Signatures`, and any Flow/UI skip reason and human confirmation
in `lite.md`; then recompute the
signature with `sp-lite-state.sh --signature` from `scripts/bash`, or
`sp-lite-state.ps1 -Signature` from `scripts/powershell`, and set both Global
Input Signature and Current Input Signature to that value. Rerun `{SCRIPT}`
only after this reconciliation, and only then decide whether another command is
allowed. Do not precompute or emit a chain of owner commands.

Gate and Analyze owners may overwrite their normal `gate.md` and `analysis.md`
outputs, so they are never durable Lite stage evidence by themselves. After a
PASS result, the coordinator must capture a stage-specific snapshot under
`specs/<feature>/lite-evidence/<LITE-RNNN>/`: `business-gate.md`, `pre-impl-analysis.md`,
`pre-impl-gate.md`, `final-analysis.md`, or `final-gate.md`. Prepend exact
`Lite Round`, `Lite Stage`, `Included Outline Anchors`, and `Source Signature`
fields; the signature must exactly match that stage's ledger entry. Gate
snapshots also record `Gate Mode` as `Business`, `Implementation Readiness`, or
`Implementation Regression`. Preserve the owner's independent PASS verdict in
the snapshot and write that unique path to `Stage Evidence Refs`. Never reuse a
snapshot across stages or rounds, and never use the mutable owner artifact as a
fallback.

Normal lifecycle ownership and persisted route states are:

`/sp.prd` -> `/sp.specify` -> `/sp.flow` -> `/sp.ui` ->
`NEEDS_BUSINESS_GATE` (`/sp.gate`) -> `/sp.bundle` -> `/sp.plan` ->
`/sp.tasks` -> `NEEDS_PRE_IMPL_ANALYZE` (`/sp.analyze`) ->
`NEEDS_PRE_IMPL_GATE` (`/sp.gate`) -> `/sp.implement` ->
`NEEDS_FINAL_ANALYZE` (`/sp.analyze`) -> `NEEDS_FINAL_GATE` (`/sp.gate`).

After implementation, persist `IMPLEMENT` in `Completed Owner Stages` and a
non-empty `Completion Evidence` reference before entering final analysis. The
coordinator may enter `READY_FOR_BUSINESS_VALIDATION` only after the final
analysis and final gate both have PASS evidence.

The route may skip Flow or UI work that is outside the chosen minimal prototype,
but only after a human confirms it is not required. `lite.md` must record the
skipped stage, a concrete skip reason, `STAGE=NOT_REQUIRED_CONFIRMED` in `Stage
Skip Confirmations`, the deferred anchors, and a global check showing that no
shared contract or later round is contradicted. Gate, bundle, plan, tasks,
analyze, and implementation cannot be skipped by editing the lifecycle state.

Flow, UI, Bundle, Plan, and Tasks owner artifacts must record the exact active
`Lite Round`, `Lite Stage`, `Included Outline Anchors`, and before-dispatch
`Source Signature`. Flow and UI additionally record `Human Confirmation:
CONFIRMED`; Plan records `Human Approval: CONFIRMED`. The coordinator must not
advance when any field is missing or differs from the active round ledger.

At `READY_FOR_BUSINESS_VALIDATION`, stop for the human business result. Record
validated, invalidated, inconclusive, or revised evidence separately from code
delivery. A successful round may open another candidate set. After multiple
rounds, emit `OUTLINE_COMPLETE_VIA_LITE` only when every confirmed Outline
anchor has sufficient delivery and evidence coverage and no global blocker is
open. Neither status means production readiness.

## Output

Always close with:

```text
LITE_FEATURE: <feature>
LITE_ROUND: <LITE-RNNN or None>
LITE_STATE: <state>
GLOBAL_CONTROL: <CLEAR|REUSE_REQUIRED|RECONCILE_REQUIRED|STALE_EVIDENCE|REGRESSION_BLOCKED>
HUMAN_SELECTION_REQUIRED: yes | no
NEXT_COMMAND_EXEC: </sp.* or None>
STOP_REASON: <reason or None>
```

Emit `EXECUTE_COMMAND: /sp.<owner>` only for the single `NEXT_COMMAND_EXEC` whose
fresh route payload has `globalControl=CLEAR`, `continueAllowed=true`, and
`requiresHuman=false`.

## Next

End every run with 2-3 evidence-backed options and one concrete recommendation.
Candidate-selection options must preserve the user's choice: describe the
business validation direction and impact without selecting it on the user's
behalf. For an active round, base the recommendation only on the fresh Lite
route, global-control evidence, confirmed Outline, round ledger, open items,
and the last owner result.

Use this exact closeout shape after the Lite output fields:

```text
OPTION_A: [CMD: </sp.lite, /sp.* owner, or None>] <plain-language action and impact>
OPTION_B: [CMD: </sp.lite, /sp.* owner, or None>] <plain-language action and impact>
OPTION_C: [CMD: </sp.lite, /sp.* owner, or None>] <write [CMD: None] None when there is no third valid option>
RECOMMENDED_OPTION: A | B | C
MY_RECOMMENDATION: <state which option is safest and why; at a human direction gate, recommend making a choice without choosing the direction>
NEXT_ACTION: <one concrete next action>
NEXT_COMMAND_EXEC: </sp.lite, /sp.* owner, or None>
NEXT_COMMAND_ID: </sp.lite, /sp.* owner, or None; legacy alias of NEXT_COMMAND_EXEC>
NEXT_COMMAND: <one copy-pasteable command and prompt line, or None>
WHY_THIS_NEXT: <reason grounded in current Lite and global evidence>
DO_NOT_RUN: <unsafe commands, or None>
```

Keep `NEXT_COMMAND_EXEC` as the executable command identity and keep
`NEXT_COMMAND` as one complete copy-pasteable line. Do not split the prompt into a separate field.
Finish the response with a final `text` fenced code block
that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`,
`MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels,
or explanations inside that final copy box. When `NEXT_COMMAND_EXEC` is `None`,
that final copy box contains only `None`.
