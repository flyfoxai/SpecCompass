# Findings

## Repository Evidence

- The full workflow currently runs `prd -> outline review -> specify -> flow -> UI -> gate -> bundle -> plan -> tasks -> analyze -> gate -> implement`.
- `sp.specify` requires a confirmed `spec-outline.md` and produces `READY_FOR_FLOW`; later commands currently assume full flow/UI confirmation before implementation tasks.
- The repository already has two relevant composition layers: workflows orchestrate command sequences; presets replace command/template behavior.
- The existing `lean` preset is a prompt-minimal replacement set, not a business-validation mechanism. It omits the new PRD/outline, flow/UI confirmation, and readiness semantics needed by SP Lite.
- Workflow steps support gates and conditional branching, so Lite can be introduced without duplicating the workflow engine.
- Recent PRD outline work deliberately strengthens source authority and human confirmation. SP Lite should consume that contract rather than bypass it.

## Working Hypothesis

SP Lite should be a first-class validation track with explicit scope and evidence, not a relaxed version of full readiness. It should choose one validation slice, model only the flow/UI required for that slice, generate a prototype-oriented plan/tasks packet, and write validation results back before deciding whether to expand, pivot, stop, or promote into full SP.

## Claude Proposal

- Add a dedicated Lite workflow while letting the existing flow, UI, plan, tasks, and implement commands consume a Lite scope.
- Persist the selected validation boundary and promotion state.
- Support expand, pivot, stop, and promote decisions after validation.
- Use narrow implementation scope and write permissions.

Codex review:

- Accept the dedicated workflow, persisted scope, narrow authorization, and post-validation lifecycle.
- Reject workflow inheritance because the current workflow engine does not provide it.
- Reject treating hard-coded behavior, reduced error handling, or reduced testing as general Lite permissions. Lite narrows scope; it does not lower correctness for that scope.
- Consolidate the suggested boundary and promotion files into one authoritative Lite contract.

## Gemini Proposal

- Preserve PRD and outline gates, then choose a high-uncertainty, low-cost happy-path slice.
- Limit flow and UI work to what is needed for the validation, followed by a narrow plan, tasks list, and smoke test.
- Add Lite implementation readiness and the same expand, pivot, stop, and promote lifecycle.

Codex review:

- Accept the end-to-end validation slice, explicit Lite readiness, smoke evidence, and lifecycle.
- Reject separate lite-plan and lite-tasks artifacts because they create parallel sources of truth and migration work during promotion.
- Do not automatically exclude permissions, external integrations, compliance, money, or real data merely because they are complex; they may be the assumption that needs validation. Use a sandbox, mock, or blocker when risk requires it.
- Treat a feature branch or feature flag as risk-dependent guidance rather than a universal Lite requirement.

## Codex Synthesis

Use three layers:

1. A single `specs/<feature>/lite.md` contract owns the validation hypothesis, candidate slices, selected included/deferred anchors, evidence signals, lifecycle state, and decision history.
2. A new `sp.lite` command owns selection, review, activation, evaluation, expansion, pivot, promotion, and stopping. Existing commands continue to own their existing artifacts and read the active Lite scope.
3. A dedicated Lite workflow provides convenient orchestration but is not the state authority. It should spell out its steps directly instead of depending on workflow inheritance.

Reuse the existing `SCOPED_CONFIRMATION`, authorization scope, workset, implementation readiness, allowed write set, and required checks mechanisms. Do not create a second confirmation vocabulary or parallel `lite-plan.md` / `lite-tasks.md` files.

The slice selector should optimize business-learning value per time and implementation cost, not simply choose the easiest feature. It must return two or three candidates, recommend one, and require human confirmation. Every candidate must be traceable to confirmed PRD/outline anchors, form a runnable end-to-end loop, produce observable business evidence, and have an explicit deferred boundary.

## Iterative Lite Refinement

The user confirmed that Lite must be iterative: every round offers human-selectable directions; later rounds may extend prior prototypes or cover unrelated Outline branches; repeated rounds may complete the entire confirmed Outline.

Second-round Claude and Gemini reviews agree on explicit round identity, human selection, non-linear dependencies, and an Outline coverage ledger. Codex refinements:

- Allow one active round per feature while preserving a non-linear historical dependency graph.
- Separate scope selection, delivery progress, and validation evidence instead of overloading one ledger state.
- Do not mark rejected candidates as deferred; only an explicit human deferral changes scope state.
- Keep current Flow/UI/Plan/Tasks as the authoritative artifacts. Per-round review batches may exist, but no parallel canonical Lite artifacts.
- Do not use percentage thresholds or `superseded` entries to claim project completion. Every required anchor in the current confirmed Outline must meet the cumulative completion gate.
- Permit completion entirely through repeated Lite rounds with `OUTLINE_COMPLETE_VIA_LITE`; keep production readiness as a separate gate.

## `/sp.lite` Command Orchestration Evidence

- Workflow runs persist their own step index and results, but the current
  nested-step resume model re-runs the parent control-flow step. This makes a
  large nested switch/loop a weak authority for long-lived Lite business state.
- Command dispatch captures exit status, but streamed command output is not a
  reliable structured state contract. A successful process exit also does not
  prove SP readiness or business PASS.
- The existing route contract already separates deterministic JSON routing
  from human-facing recommendations and uses `EXECUTE_COMMAND` only when
  continuation is explicitly allowed. `/sp.lite` should extend this pattern
  with a Lite-specific deterministic controller instead of parsing prose.
- Gate steps currently support fixed options only. They cannot safely collect
  a dynamically generated custom validation direction, so candidate selection
  must remain owned by `/sp.lite` and persisted in `lite.md`.
- The full SP order is `prd -> outline confirmation -> specify -> flow -> flow
  confirmation -> ui -> ui confirmation -> gate -> bundle -> plan -> plan
  approval -> tasks -> analyze -> gate -> implement -> analyze -> gate`.
  Lite should preserve this order while scoping every downstream stage to the
  active round.
- Existing Flow/UI scoped confirmation and Plan/Tasks/Implement write-boundary
  contracts are suitable for Lite if the authorization scope exactly matches
  the active round and unresolved child-batch items are isolated.
- The safest design is a hybrid state-aware coordinator: `/sp.lite` owns
  candidate selection and orchestration state; a deterministic Lite status
  helper decides the next owner command; existing commands continue to own
  their artifacts; an optional workflow wrapper provides CLI execution and
  resume convenience but is not the business-state authority.
- The command design must keep round lifecycle state separate from coordinator
  route state. Closing a historical round can immediately route the feature to
  `NEEDS_CANDIDATES` in the same invocation when the human decision is to keep
  using Lite; `stop`, `promote`, and `complete` instead enter explicit terminal
  states.
