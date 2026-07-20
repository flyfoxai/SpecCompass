# Codex Independent Proposal

This proposal was recorded before reading Claude or Gemini's output.

## Core design

1. Keep `review_level` unchanged and add `confirmation_priority` only to actionable confirmation nodes, with machine values `critical`, `important`, and `normal`; informational nodes omit it. The UI maps these to `非常重要`, `重要`, and `普通`.
2. Require `priority_reason` and a constrained `critical_basis` for `critical`. Qualifying bases are irreversible/high-cost impact, real money or sensitive data, compliance/safety, product or scope boundary that blocks all downstream work, and absence of a safe reversible default.
3. Enforce scarcity deterministically per review batch: zero is valid; otherwise `critical_count <= min(3, max(1, ceil(confirmable_count / 8)))`, and at most one critical point per module/view. When the cap is exceeded, generation must re-rank and downgrade the lower-impact points; it must not invent a cap bypass. If more decisions are truly critical, split the review batch or feature boundary.
4. Render critical points first in the rail, expose three counts and filters, and keep colors/labels for `review_level` as a separate visual channel. Bulk-recommendation behavior remains scoped and must not overwrite saved choices or drafts.
5. Add `outline` as a third review type inside `/sp.prd`, reusing the shared shell, state store, rail, package splitter, and localhost launcher, but using a dedicated outline preview renderer and schema.
6. The outline preview has three coordinated views: Product Intent Map (goal -> roles -> problem domains -> capability slices), Scope & First Slice (in/out/non-goals and slice coverage), and Readiness & Authority (source-status coverage, blockers, risks, acceptance seeds, recommended next route). It explicitly forbids detailed process steps, screens, APIs, data models, tasks, and implementation nodes.
7. Make visual confirmation a real gate. Add `AWAITING_OUTLINE_CONFIRMATION` rather than abusing `NEEDS_DECISION`. A semantically ready outline enters that state, emits review data, and becomes `READY_FOR_SPECIFY` only after an `outline-confirmation.md` package matching the current outline/source digest is written back and consumed by `/sp.prd`.
8. Preserve authorization separation: browser state and `outline-review-data.json` are drafts; only the confirmation document authorizes promotion. `/sp.specify` checks status, confirmation state, and digest freshness.

## Recommended artifact layout

- Source outline: `specs/<feature>/spec-outline.md`
- Review data: `specs/<feature>/prd/review/outline-review-data.json`
- Authorization evidence: `specs/<feature>/prd/review/outline-confirmation.md`
- New schema: `templates/project/.specify/review/schemas/outline-review-data.schema.json`
- New renderer module: `templates/project/.specify/review/renderer/scripts/outline-preview-renderer.js`

`prd/review` keeps ownership with `/sp.prd` while avoiding a misleading claim that the root outline is a detailed design artifact.

## Compatibility

- Bump review schema version and accept legacy Flow/UI payloads through an explicit loader migration; new generation must emit the priority field.
- Existing `READY_FOR_SPECIFY` outlines without outline-review metadata remain consumable for one compatibility window. The next `/sp.prd` refresh opts them into the new gate and digest contract.
- Existing Flow/UI confirmation documents remain valid; priority is presentation and triage metadata, not a change to previously authorized choices.

## Main risk

The strict formula may be too aggressive for unusually large cross-module batches. Validate it with fixture distributions before implementation; keep the invariant of no arbitrary override and prefer batch/feature splitting over diluting `非常重要`.
