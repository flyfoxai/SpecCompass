# PRD Outline Maturity Implementation Plan

> **Status:** Complete
> **Approved design:** `.planning/2026-07-16-prd-outline-levels-workshop/initial-proposal.md`

## Goal

Implement the approved three-level PRD Outline workflow without weakening the
existing schema-v2 Outline confirmation gate or the Flow/UI confirmation
priority behavior already present on this branch.

The implementation must make `explore` and `frame` useful, recoverable product
discovery stages, while reserving `specify_ready` for the existing digest-bound
formal confirmation contract.

## Non-negotiable contracts

- `outline_maturity` is exactly `explore | frame | specify_ready` and is
  independent from `Outline Decision`, `review_level`, and
  `confirmation_priority`.
- Discovery uses a distinct data schema, response package, intent ledger, and
  renderer module. A discovery artifact must never be accepted as a formal
  confirmation artifact, or vice versa.
- Discovery never authorizes `/sp.specify` and never advances an Outline to
  `AWAITING_OUTLINE_CONFIRMATION` or `READY_FOR_SPECIFY` by itself.
- Accepted candidates become `[src:user-confirmed]`; new user text becomes
  `[src:user]`; unaccepted candidates remain `[src:ai-proposed]`.
- Every consumed discovery delta is traceable through a stable
  `<!-- intent-delta:<id> -->` anchor.
- The intent ledger is append-only. Correction or reversal is represented by a
  later event, not mutation of an accepted event.
- Constitution content constrains Stage 3 but cannot invent product facts.
- Existing schema-v2 Outline confirmation identity, digest, source-authority,
  and legacy compatibility behavior remains intact.

## Medium Step 1: Contracts and documentation

### Tests first

Extend `tests/test_sp_methodology_templates.py` with failing assertions that
require:

- the three maturity values and their stage semantics;
- separate discovery and confirmation contracts;
- the four discovery/ledger artifact paths;
- the five explicit delta operations;
- provenance tags and stable delta anchors;
- discovery's hard prohibition on authorization states;
- template-refresh wording for already initialized target projects.

### Implementation

Update the maintained methodology and command documentation:

- `docs/reference/sp-project-methodology.md`
- `docs/reference/sp-flow-ui-confirmation-review-design.zh-CN.md`
- `templates/project/docs/reference/sp-command-spec.md`
- `templates/commands/prd.md`
- `templates/project/.specify/review/renderer/README.md`
- `templates/skills/speccompass-review-data/SKILL.md`

Keep agent-facing command/template instructions in English and methodology
notes in Chinese according to `DEVELOPMENT.md`.

### Review checkpoint

Run the focused methodology tests. Ask Claude and Gemini to review the exact
Step 1 diff for contract gaps and contradictions. Codex adjudicates all
findings, applies valid corrections, reruns tests, and records the result under
`.planning/2026-07-16-prd-outline-maturity-implementation/review-step-1.md`.

## Medium Step 2: Discovery schemas and renderer

### Tests first

Add failing tests for schema distribution, valid/invalid discovery data,
response packages, append-only ledger records, launcher routing, package type
separation, required 2-4 candidates, recommendation metadata,
none-of-the-above, free input, and all five operations.

### Implementation

Add:

- `outline-discovery-data.schema.json`
- `outline-discovery-response.schema.json`
- `outline-intent-ledger.schema.json`
- `outline-discovery-renderer.js`
- `discovery-response-package.js`

Extend the existing renderer shell, loader, validator, state store, feature
navigation, review rail, HTML entrypoint, styles, launcher, and validation
script only as needed. Preserve the current visual system and formal Outline
renderer. The discovery primary action is `Save and continue refinement`, and
the page continuously states that it does not authorize `/sp.specify`.

### Review checkpoint

Run schema/launcher/package tests plus browser checks at desktop and mobile
sizes. Ask Claude and Gemini to review the Step 2 diff and captured behavior.
Codex validates findings against the authorization boundary, fixes accepted
issues, reruns tests, and records the result in `review-step-2.md`.

## Medium Step 3: `/sp.prd` writeback loop

### Tests first

Add failing command-contract and deterministic validation tests requiring:

- explicit response-package input;
- feature, response, candidate, target, operation, and duplicate-delta checks;
- append-only ledger behavior;
- temporary regeneration before replacing PRD/Outline files;
- exact source tags and delta anchors;
- fail-closed handling of unknown, repeated, missing, or misplaced deltas;
- correct maturity transitions and readiness separation.

### Implementation

Teach `/sp.prd` to generate discovery data, consume a named response package,
validate it, append valid events to the ledger, regenerate into temporary
outputs, verify provenance, and only then replace `prd.md` and
`spec-outline.md`. Add deterministic helper scripts only where identity and
placement checks can be reliable; semantic rewriting remains model-owned.

### Review checkpoint

Run all PRD, validation, and memory tests. Ask Claude and Gemini to review the
Step 3 diff for data loss, replay, provenance, and state-transition defects.
Codex adjudicates and fixes findings, reruns tests, and records the result in
`review-step-3.md`.

## Medium Step 4: Compatibility and end-to-end verification

### Tests and checks

- Prove schema-v2 formal Outline confirmation remains unchanged.
- Prove discovery and confirmation packages cannot cross-consume.
- Verify Flow/UI critical/important/normal behavior still passes.
- Test initialized-project distribution and force-refresh behavior.
- Run the relevant full test suite and `git diff --check`.
- Launch the real renderer with example data and use Playwright to exercise
  candidate selection, none-of-the-above, free input, operation selection,
  download, and formal Outline confirmation at desktop and mobile sizes.

### Review checkpoint

Ask Claude and Gemini for a final repository-level review of the complete diff
and test evidence. Codex performs the final contract audit, applies valid fixes,
reruns verification, and records `review-step-4.md`.

## Completion criteria

The work is complete only when all four medium steps have passed their focused
tests and three-model review checkpoints, discovery has a tested end-to-end
response-to-ledger-to-writeback contract, browser behavior has been exercised,
and no existing formal confirmation or Flow/UI priority test regresses.
