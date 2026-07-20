# Findings & Decisions

## Requirements
- Support useful Outline generation even when the initial `/sp.prd` input is too sparse for today's complete framework.
- Introduce two or three progressive Outline levels; working assumption is three maturity levels.
- Levels 1 and 2 require deep user participation, with selectable options and direct text input that can expand business requirements.
- Level 3 may be generated substantially by the model under project constitution constraints.
- Use Claude, Gemini, and Codex to produce and review an initial proposal.

## Research Findings
- Current `/sp.prd` creates a stable Outline only when goal, users, scope, capability map, and source authority are already sufficiently clear.
- Current graphical Outline review has three fixed views: `intent_map`, `scope_slice`, and `readiness_authority`.
- Current node schema supports 2-4 options, a recommendation, and reviewer notes/drafts, but does not define typed free-text requirement additions or writeback provenance.
- Current readiness has `AWAITING_OUTLINE_CONFIRMATION` and `READY_FOR_SPECIFY`, but no explicit progressive Outline maturity field.
- Current `/sp.prd` may only append/update constitution candidates; it cannot rewrite formal constitution rules.
- The existing design treats `[src:ai-proposed]` as non-authoritative and requires explicit confirmation before downstream use.
- The prior three-model synthesis chose shared-renderer evolution, digest-bound authorization, and an explicit awaiting-confirmation state; this new proposal should extend rather than replace those contracts.

## First-Round Model Proposals

### Claude
- Calls Stage 1/2 collaborative product discovery, not confirmation or authorization.
- Recommends `intake_stage: 1|2|3`, orthogonal to current readiness.
- Keeps Stage 1/2 in conversational `/sp.prd`; only Stage 3 uses the graphical renderer.
- Maps Stage 1/2 to `NEEDS_PRD`; Stage 3 can enter `AWAITING_OUTLINE_CONFIRMATION`.
- Warns that constitution rules cannot supply target users, product positioning, goals, or other missing business facts.

### Gemini
- Recommends three maturity stages: Direction, Framework, and Specification.
- Supports Stage 1/2 options, free text, edits, and removals in the graphical UI.
- Recommends a structured `user_intent_deltas` package: the CLI should feed deltas back to the model for provenance-aware document regeneration, not perform brittle Markdown text merging.
- Preserves Stage 3 as the digest-bound formal confirmation gate.
- Warns against turning constitution governance rules into invented product behavior.

### Codex Review
- Claude draws the discovery/authorization boundary correctly, but pure chat does not satisfy the requested visual option-and-input experience.
- Gemini satisfies the UI requirement, but reusing `AWAITING_OUTLINE_CONFIRMATION` during Stage 1/2 would conflate discovery maturity with formal authorization readiness.
- The shared renderer can support two explicit contracts: `discovery` for Stage 1/2 and `confirmation` for Stage 3. They need different actions, packages, labels, and state transitions.
- Model-assisted regeneration is preferable to raw Markdown merge, but model output must be validated against a deterministic delta ledger so provenance cannot depend on prompt compliance alone.

## Second-Round Review Outcomes

- Claude accepted shared-renderer dual modes after the interface requirement was made explicit. It added the useful constraint that discovery candidates need a distinct schema kind because the current option type has authorization/routing semantics.
- Gemini accepted the same architecture and proposed a narrow UI first slice. Its suggestion to defer per-delta provenance validation was rejected because tag-count checks cannot identify omitted or mismatched user input.
- Both models assumed or implied that the browser could persist the repository ledger. The synthesis corrects this: the browser downloads a non-authoritative response package, and `/sp.prd` validates and persists it.
- The current formal Outline schema requires digest identity, source authorities, and confirmation-oriented views. A separate discovery schema is safer than making those fields optional behind a mode switch.
- Stable hidden delta anchors allow deterministic identity/provenance checks without claiming deterministic semantic equivalence.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Separate `outline_level` from readiness status | Maturity and authorization answer different questions and should not be conflated. |
| Preserve source/provenance on user free-text additions | Direct input becomes new evidence only after explicit user submission and writeback. |
| Prefer `outline_maturity` over `outline_level` or `review_level` | It describes progressive completeness without colliding with review priority or Markdown heading depth. |
| Keep a shared renderer shell but use separate data contracts | UI reuse does not require weakening formal confirmation data requirements. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
- `templates/commands/prd.md`
- `templates/project/.specify/review/schemas/outline-review-data.schema.json`
- `templates/project/.specify/review/renderer/scripts/outline-preview-renderer.js`
- `.planning/2026-07-16-review-level-prd-outline/synthesis.md`
