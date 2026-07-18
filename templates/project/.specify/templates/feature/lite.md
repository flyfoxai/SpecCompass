<!-- SP_STAGE_SEED: lite -->
# SP Lite

## Lite Control

- Schema: speckit.lite.orchestrator.v1
- Feature: [feature-name]
- Active Round: None
- State: NEEDS_CANDIDATES
- Active Round State: NOT_STARTED
- Next Required Command: /sp.lite
- Human Direction Selection: REQUIRED
- Orchestration Run ID: None
- Orchestration Status: IDLE
- Orchestration Started At: None
- Orchestration Current Stage: None

## Global Control

- Global Status: CLEAR
- Global Input Signature: None
- Current Input Signature: None
- Outline Signature: None
- Code Baseline: None
- Reuse Refs: None
- Conflict Refs: None
- Stale Refs: None
- Regression Failures: None
- Blocker Route: /sp.lite
- Global Reason: The first /sp.lite run must recompute and persist the global signature before selecting a round.

The seed is intentionally idle. The first `/sp.lite` run recomputes the input
signature with the installed state script and persists it as both `Global Input
Signature` and `Current Input Signature` before candidate generation or owner
dispatch.

## Candidate Set

Create 2-3 materially different validation candidates from uncovered confirmed
Outline anchors. A candidate is not authorized until a human selects, modifies,
or replaces it.

| Candidate | Outline Anchors | Business Hypothesis | Minimal Prototype | Reuse | Dependencies | Allowed Write Set | Deferred | Global Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| None | None | None | None | None | None | None | None | NOT_CHECKED | DRAFT |

## Active Round Scope

- Selected Candidate: None
- Selection Record: None
- Included Outline Anchors: None
- Deferred Outline Anchors: None
- Business Validation Question: None
- Minimal Prototype Boundary: None
- Reuse Plan: None
- Shared Contract Impact: None
- Allowed Write Set: None
- Required Historical Regressions: None
- Completion Evidence: None
- Completed Owner Stages: None
- Skipped Owner Stages: None
- Stage Evidence Refs: None
- Stage Source Signatures: None
- Stage Validation Signatures: None
- Stage Skip Reasons: None
- Stage Skip Confirmations: None

Every completed owner stage records the 64-character source signature that
authorized its execution. Flow, UI, Bundle, Plan, and Tasks artifacts also
record the exact Lite Round, Lite Stage, Included Outline Anchors, and matching
Source Signature; Flow/UI record Human Confirmation and Plan records Human
Approval. A skipped Flow/UI stage requires a concrete reason plus
`NOT_REQUIRED_CONFIRMED` in Stage Skip Confirmations.

`Stage Validation Signatures` records the latest impact-reconciled global input
signature for every completed or explicitly skipped stage. A sync may advance a
stage to the new signature only after confirming the change does not invalidate
that stage. Affected stages lose their completion/skip entry and must run again;
the original source signature and immutable evidence are never rewritten.

Gate and Analyze stages use immutable, round-scoped snapshots in
`lite-evidence/<LITE-RNNN>/`. Each snapshot records its Lite Round, Lite Stage,
Included Outline Anchors, matching source signature, independent PASS verdict,
and Gate Mode where applicable.
Mutable `gate.md` and `analysis.md` files are not valid snapshot references.

## Round Ledger

Scope Status, Delivery Status, and Evidence Status are separate facts. An
implemented round is not automatically validated, and a validated prototype is
not automatically production-ready.

| Round | Parent/Baseline | Outline Anchors | Scope Status | Delivery Status | Evidence Status | Global Signature | Result | Follow-up |
|---|---|---|---|---|---|---|---|---|
| None | None | None | NOT_STARTED | NOT_STARTED | NOT_CHECKED | None | None | None |

## Outline Coverage Ledger

The confirmed Outline remains the completion boundary across cumulative and
independent Lite rounds.

| Outline Anchor | Owning Round | Scope Status | Delivery Status | Evidence Status | Reuse/Conflict Refs | Notes |
|---|---|---|---|---|---|---|
| None | None | UNCOVERED | NOT_STARTED | NOT_CHECKED | None | None |

## Decision And Reconciliation Log

| ID | Round | Type | Affected Anchors/Contracts | Decision | Owner Route | Evidence | Status |
|---|---|---|---|---|---|---|---|
| None | None | None | None | None | None | None | None |
