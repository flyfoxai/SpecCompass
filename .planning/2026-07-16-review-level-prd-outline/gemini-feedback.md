# Gemini First-Pass Review Feedback

Revise your first proposal using the original `model-brief.md` and the following review. Return a replacement Chinese Markdown plan, not a commentary on the feedback. Do not use tools or edit files.

## What to keep

- Keep importance independent from `review_level`.
- Keep outline confirmation as a real gate and keep the confirmation document as the authorization source.
- Keep the hybrid intent hierarchy and readiness/risk view.

## Required corrections

1. Your scarcity formula said `10% or 3, take the larger`, which permits too many critical points in large reviews. Use a concrete hard budget that takes the stricter bound, allows zero critical points, and states what happens when the generated data exceeds it.
2. The deterministic validator must reject over-budget data; it must not silently mutate or downgrade the input. Ranking and downgrade happen in model generation before validation. Define qualifying critical criteria and a downgrade rule.
3. JSON Schema `default` does not migrate JSON payloads. Define explicit schema versioning/loader migration and clarify whether priority applies only to actionable confirmation nodes or all nodes.
4. Do not say `src/specify_cli/` owns the launcher/loader. The relevant files are under `templates/project/.specify/review/`; command contracts are under `templates/commands/`. Give exact likely paths for outline review data and confirmation evidence.
5. A gated outline needs explicit readiness semantics. Do not mislabel a semantically complete outline as `NEEDS_DECISION`; choose and justify either a new `AWAITING_OUTLINE_CONFIRMATION` state or a separate orthogonal confirmation state. Define how `/sp.prd` promotes it and how `/sp.specify` checks it.
6. Bind confirmation to a deterministic digest of the current outline/source snapshot. State how stale confirmation is detected and how legacy `READY_FOR_SPECIFY` outlines migrate without abruptly breaking existing projects.
7. Your option B intentionally corrupts `review_level`, making it a weak strawman. Provide three technically viable options: minimal compatible extension, balanced shared-renderer evolution, and larger generic review-platform refactor. Compare trade-offs and recommend one.
8. Correct the phase/file plan to include schema, `validate-review-data.mjs`, `serve-review.mjs`, `data-loader.js`, the HTML shell, dedicated outline renderer, `confirmation-package.js`, `/sp.prd`, `/sp.specify`, shared bash/PowerShell gates if applicable, documentation, and focused tests.
9. Clarify that a warning is insufficient for a hard budget and that percentages must use confirmable/actionable nodes, not every informational node.
