# PRD Level Contract Hardening

## Goal

Make `/sp.prd` generate domain-specific Level 1 project boundaries, Level 2 child-project business frames, and Level 3 source-preserving formal outlines without generic reusable filler.

## Scope

- Update the model-facing PRD command and maintained methodology/usage surfaces.
- Add prompt-contract and installed-skill regression tests.
- Keep schema, renderer, ledger, writeback, flow, UI, and Constitution ownership unchanged.
- Preserve all unrelated worktree changes.

## Phases

| Phase | Status | Exit evidence |
|---|---|---|
| 1. Contract tests | complete | Focused tests fail on missing Level 1/2/3 requirements |
| 2. Level 1/2 implementation | complete | Focused tests pass and Claude/Gemini review is adjudicated |
| 3. Level 3 and docs alignment | complete | All maintained surfaces carry the same contract |
| 4. Final review and verification | complete | 288 relevant tests pass; Claude and Gemini report no unresolved Critical/Important finding |

## Decisions

- Level 1 owns portfolio decomposition and confirmation of project boundaries.
- Level 2 owns one confirmed child's business chain and first delivery slice, or the confirmed retained product when Level 1 decides not to split.
- Level 3 compiles confirmed evidence into formal review artifacts without discovering new business facts.
- Container-word detection is a warning signal; boundary acceptance depends on owned state, outcome, handoff, coverage, and decision closure.
- Transactional consistency may be a business invariant when imposed by regulation, contract, or multi-party legal duty; implementation-only consistency remains a delivery risk.

## Errors

| Error | Attempt | Resolution |
|---|---:|---|
| Gemini review returned an empty response after calling an unavailable shell tool | 1 | Passed the actual diff directly in a no-tools retry; Gemini returned one actionable Important finding. |
| Final Gemini routing review could not read the workspace because its internal shell tool was unavailable | 1 | Supplied the final routing rules and assertions directly; Gemini completed with no Critical/Important finding. |
| Final Claude review treated semantic arrow summaries as literal test strings | 1 | Supplied the real Python assertions and matching production text; Claude withdrew both findings and returned no Critical/Important finding. |
