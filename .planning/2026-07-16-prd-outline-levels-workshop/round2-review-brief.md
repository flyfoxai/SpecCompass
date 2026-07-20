# Round 2 Review Brief

Revise your first-round PRD Outline maturity proposal after considering the following Codex review. Return a concise, repository-grounded response in Chinese. Do not edit files.

## Fixed Requirements

- Stage 1 and Stage 2 require deep user participation.
- Their experience must provide 2-4 selectable candidates and direct user input that can add, modify, extend, or exclude business requirements.
- Stage 3 may use model capability and constitution constraints to complete a specify-ready outline, but it still requires the existing digest-bound graphical confirmation.
- `[src:ai-proposed]` content is never automatically confirmed.
- Constitution constrains generation; it cannot invent goals, users, positioning, scope, or other product facts.

## Existing Contracts

- Readiness states include `NEEDS_PRD`, `NEEDS_CLARIFY`, `AWAITING_OUTLINE_CONFIRMATION`, and `READY_FOR_SPECIFY`.
- The current renderer creates a final confirmation package tied to Review Data ID, Outline Digest, and Source Authority IDs.
- Existing review option nodes carry routing/decision semantics and must not be silently reused for business-intake candidates.

## Codex Review

1. Use `outline_maturity: explore | frame | specify_ready` rather than `review_level` or a bare numeric level.
2. Stage 1/2 are discovery interactions, not authorization. Do not place them in `AWAITING_OUTLINE_CONFIRMATION`; keep an appropriate blocking readiness such as `NEEDS_PRD` or `NEEDS_CLARIFY` until semantic inputs are sufficient.
3. A pure chat-only design does not fully meet the user's requested interface. Evaluate a shared renderer with two explicit modes:
   - `discovery`: Stage 1/2, candidates plus free input, action is "保存并继续完善", emits an intent-delta package, never authorizes `/sp.specify`.
   - `confirmation`: Stage 3, immutable digest-bound review, action is formal confirmation.
4. Do not hard-merge Markdown. Preserve a deterministic append-only delta ledger, then let the model regenerate documents from the old documents plus accepted deltas. Validate that every delta is represented with `[src:user]` or `[src:user-confirmed]`; unmatched deltas fail closed.
5. Clarify minimum inputs, outputs, exit criteria, state transitions, artifact/schema changes, migration compatibility, and acceptance tests.

## Requested Revision

- State what you changed after the review.
- Challenge any review point you still disagree with and explain why.
- Give one recommended architecture, not a menu of vague possibilities.
- Identify the smallest viable first implementation slice and what should explicitly be deferred.
