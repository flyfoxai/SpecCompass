# Claude First-Pass Review Feedback

Revise your first proposal using the original `model-brief.md` and this review. Return a complete replacement Chinese Markdown plan. Do not call tools or edit files.

## What to keep

- Keep priority independent from `review_level`.
- Keep deterministic rejection in the validator and model-side re-ranking/downgrade before validation.
- Keep a dedicated outline renderer inside shared review infrastructure, digest-bound confirmation evidence, and the intent/coverage/scope/readiness visual structure.

## Required corrections

1. `min(floor(N*10%), 3)` gives a budget of zero for every small review. Use a practical formula based only on actionable confirmation nodes that permits zero actual critical labels but permits one truly critical point in a small review. Remove the redundant absolute ceiling.
2. Tighten critical qualification. “Cross-team” and “architecture lock” alone are too broad. Critical should require concrete severe impact plus no safe reversible/default path. Explain model-side ranking and downgrade.
3. Resolve the contradiction between your opening “validator auto-downgrades” and later “validator rejects”. The validator must never mutate input; only generation re-ranks/downgrades.
4. Define field applicability and migration precisely. JSON Schema defaults and validator assumptions are not data migration. Use a schema-version/loader compatibility path; new payloads must be strict.
5. Do not leave outline readiness in an implicit/soft gate. Choose an explicit `AWAITING_OUTLINE_CONFIRMATION` readiness state or an orthogonal confirmation-state field and explain why. A semantically complete but unconfirmed outline is not `NEEDS_DECISION` and not yet `READY_FOR_SPECIFY` under the new contract.
6. Legacy outlines need a bounded migration rule, not a permanent warning-only bypass. Define what happens on first `/sp.prd` refresh and how `/sp.specify` recognizes legacy vs new-contract outlines.
7. Clarify that critical items are excluded from all bulk “按推荐保存” operations and require individual confirmation. Important/normal can preserve current scoped behavior.
8. Use accurate repository paths: `schemas/flow-review-data.schema.json`, `schemas/ui-review-data.schema.json`, `scripts/validate-review-data.mjs`, `scripts/serve-review.mjs`, `renderer/scripts/data-loader.js`, `renderer/scripts/confirmation-package.js`, `renderer/speccompass-review-renderer.html`, and command files `templates/commands/prd.md` / `specify.md`. Propose exact outline artifact paths.
9. Make all three options viable: minimal advisory compatibility, balanced gated shared-renderer evolution, and generic review-platform refactor. Do not use a knowingly semantically broken derived-field option as a primary alternative.
10. Digest the canonical decision inputs, including outline plus declared source snapshot/authority metadata, with deterministic normalization. Pure formatting-only changes should not require re-confirmation if canonical content is unchanged.
