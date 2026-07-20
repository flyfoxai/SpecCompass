# Final Synthesis: Review Priorities and PRD Outline Visual Confirmation

## Recommendation

Choose **Option B: balanced shared-renderer evolution**.

It keeps the existing Flow/UI architecture, adds one orthogonal priority dimension, and introduces Outline as a third review type with a dedicated visualization and the same authorization discipline. It avoids both a weak advisory-only review and a broad generic-platform rewrite.

## Final Contract Decisions

### 1. Three confirmation priorities

- Add `confirmation_priority` with machine values `critical`, `important`, and `normal`; display labels are `非常重要`, `重要`, and `普通`.
- Keep existing `review_level` unchanged. `review_level` answers what kind of review/obligation a node has; `confirmation_priority` answers how much human attention an actionable decision deserves.
- In schema v2, `confirmation_priority` is required only when the node is confirmable under the existing decision predicate (`human_judgment` / `must_confirm` / options or recommended option). Informational nodes omit it and are not counted.
- A `critical` node also requires `critical_basis` and a concrete `priority_reason`.

Critical qualification requires both:

1. A concrete severe impact: irreversible/high-cost loss, real money or sensitive data, safety/compliance exposure, or a source/scope boundary error that invalidates downstream specification.
2. No safe reversible path or evidence-backed default that the model can apply without owner judgment.

Scarcity budget for `N` confirmable nodes:

```text
cap = N == 0 ? 0 : min(3, max(1, ceil(N / 10)))
```

- The cap is an upper bound, not a quota; zero critical nodes is valid and preferred when no point qualifies.
- The generator ranks candidates by impact, irreversibility, and lack of a safe default, keeps only the strongest qualifying points, and downgrades the rest to `important` before validation.
- `validate-review-data.mjs` rejects over-budget payloads and never mutates them.
- Critical nodes are excluded from every bulk "按推荐保存" scope and require individual confirmation. Important and normal nodes retain current view/module/requirement bulk behavior without overwriting saved choices or drafts.
- The rail shows three counts and filters. Priority is rendered as a badge/order/focus channel; existing `review_level` colors and labels remain semantically unchanged.

### 2. PRD Outline graphical confirmation

Add `review_type: "outline"` as a third review type owned by `/sp.prd`.

Recommended artifacts:

```text
specs/<feature>/spec-outline.md
specs/<feature>/prd/review/outline-review-data.json
specs/<feature>/prd/review/outline-confirmation.md
```

The browser downloads `outline-confirmation-package-*.json`; an agent writes its verified contents to the Markdown target. Browser/localStorage state and review JSON remain non-authoritative.

The outline renderer has three coordinated views:

1. **Intent Map**: strategic goal -> users/roles -> problem domains -> capability slices.
2. **Scope & First Slice**: in-scope/non-goals, core-scenario and acceptance-seed coverage, recommended first slice.
3. **Readiness & Authority**: source authority/status badges, risks/open items, blockers, owner-review prompts, current next route.

The outline schema forbids detailed flow steps, UI screens, APIs, database models, implementation tasks, and solution-level nodes. It borrows Impact Mapping's traceable intent chain, OST's outcome/opportunity logic, and story mapping's scope/slice view without copying their downstream solution detail.

### 3. Readiness and authorization state

Add `AWAITING_OUTLINE_CONFIRMATION`.

- `/sp.prd` first computes the existing semantic readiness. If content would otherwise be ready, it generates/refreshes outline review data and sets `AWAITING_OUTLINE_CONFIRMATION`.
- A verified confirmation package with all required/critical points resolved and a matching digest allows `/sp.prd` to write `outline-confirmation.md` and promote the outline to `READY_FOR_SPECIFY`.
- If substantive outline or source-authority content changes, confirmation becomes stale and state returns to `AWAITING_OUTLINE_CONFIRMATION`.
- If evidence quality regresses, the state can move from awaiting confirmation to the appropriate existing `NEEDS_*`, `SPLIT_REQUIRED`, or `BLOCKED` state; awaiting is not a one-way corridor.
- `/sp.specify` requires both `READY_FOR_SPECIFY` and fresh outline confirmation for new-contract outlines.

Use a deterministic SHA-256 digest produced by a script, not by model prose. Hash normalized `spec-outline.md` bytes (normalize line endings and trailing whitespace) plus a stable serialization of the declared source snapshot/authority identifiers. The confirmation package stores the digest and review-data identity; writeback verifies both.

Legacy compatibility is bounded:

- Existing `READY_FOR_SPECIFY` outlines without an outline-review contract marker continue to work during one minor-release compatibility window with a deprecation warning.
- Their first `/sp.prd` refresh opts them into schema v2, generates review data, and moves them to `AWAITING_OUTLINE_CONFIRMATION`.
- New-contract outlines never receive a warning-only bypass.

## Three Options

| Option | Design | Strength | Main cost/risk |
|---|---|---|---|
| A. Minimal compatible extension | Add explicit priority to Flow/UI; map outline into the existing generic node layout; keep readiness plus a separate confirmation-state marker | Lowest migration cost; viable for a quick release | Outline semantics are squeezed into Flow/UI structures; two interacting state dimensions are easier to drift |
| **B. Shared-renderer evolution** | Schema v2 priority; third `outline` type; dedicated outline schema/renderer; explicit awaiting state; shared rail/package/launcher | Best balance of correctness, UX consistency, and contained change | Requires deliberate three-type branching and migration tests |
| C. Generic review platform | Introduce review-type registry, common protocol, plugin validators/renderers, then migrate Flow/UI/Outline | Best if 3+ more review types are already planned | Largest blast radius and highest regression/over-abstraction risk now |

## Phased Implementation Plan

### Phase 1: Contract and tests first

- Add v2 fixtures and failing tests for field orthogonality, critical budget boundaries (`N=0,1,10,11,20,21`), critical qualification metadata, no validator mutation, and critical exclusion from bulk actions.
- Add outline fixtures for allowed intent/scope/readiness content and forbidden Flow/UI/implementation detail.
- Define the new readiness transition matrix and legacy marker before renderer work.

### Phase 2: Flow/UI priority

- Update `templates/project/.specify/review/schemas/flow-review-data.schema.json` and `ui-review-data.schema.json` for schema v2.
- Update `templates/project/.specify/review/scripts/validate-review-data.mjs` for v1 read compatibility, v2 strict validation, actionable-node counting, critical basis, and hard cap.
- Update `templates/commands/flow.md` and `templates/commands/ui.md` generation rules with ranking/downgrade criteria.
- Update `renderer/scripts/data-validator.js`, `review-rail.js`, `state-store.js`, the HTML shell, and review CSS for labels, sorting, filters, counts, identity, and bulk exclusion.
- Normalize legacy v1 payloads in memory in `renderer/scripts/data-loader.js`; never rewrite the source file silently.

### Phase 3: Outline review type and visualization

- Add `templates/project/.specify/review/schemas/outline-review-data.schema.json`.
- Add `renderer/scripts/outline-preview-renderer.js` and route the shared shell by review type.
- Extend `scripts/validate-review-data.mjs`, `scripts/serve-review.mjs`, `renderer/scripts/data-validator.js`, `data-loader.js`, `feature-nav.js`, `state-store.js`, and `speccompass-review-renderer.html` for `outline` / `--outline` / `?outline=<feature>`.
- Add a deterministic outline digest helper under `templates/project/.specify/review/scripts/` and validate safe repo-relative paths.
- Extend `renderer/scripts/confirmation-package.js` and `review-rail.js` for outline package metadata, target-path allow-listing, fallback summary, multipart merge rules, and stale digest handling.

### Phase 4: PRD workflow and downstream gate

- Update `templates/commands/prd.md` to generate review data only after semantic outline completeness, launch the review, consume confirmation packages, and manage `AWAITING_OUTLINE_CONFIRMATION` transitions.
- Update `templates/commands/specify.md` to require fresh authorization for new-contract outlines.
- Update `templates/project/.specify/memory/constitution.md`, the shared methodology/command specifications, and the bash/PowerShell `check-sp-memory` implementations with the new state and stale/missing confirmation findings.
- Preserve existing repeated-blocker, source recovery, feature split, owner review, and `NEEDS_*` behavior.

### Phase 5: Regression, examples, and docs

- Extend `tests/test_sp_methodology_templates.py` for schemas, validator, launcher, loader, rail, package split/merge, safe paths, and all three review types.
- Extend `tests/test_sp_memory_check.py` and bash/PowerShell parity tests for state transitions, digest mismatch, legacy compatibility, and hard gate behavior.
- Add a maintained outline review example without modifying existing user experiment files.
- Update `docs/reference/sp-flow-ui-confirmation-review-design.zh-CN.md` or replace it with a broader maintained review-design note, plus command/methodology docs. Follow `DEVELOPMENT.md`: methodology/design notes default to Chinese; update paired public English/Chinese docs where counterparts exist.

## Acceptance Criteria

1. `review_level` behavior and vocabulary are unchanged in existing Flow/UI fixtures.
2. New v2 confirmable nodes without `confirmation_priority` fail; informational nodes are not included in priority counts.
3. Critical count may be zero, never exceeds the deterministic cap, and over-budget input fails without file mutation.
4. Bulk recommendation never resolves or changes a critical node.
5. `/sp.prd` can generate and launch an outline review using the shared localhost renderer.
6. Outline visualization contains intent, scope/coverage, readiness, authority, and first-slice information but no downstream design detail.
7. Downloaded/browser state alone never authorizes progression; only a complete Markdown confirmation document with matching digest does.
8. New-contract outlines cannot enter `/sp.specify` while pending, stale, incomplete, or unresolved.
9. Legacy outlines have a documented, time-bounded compatibility path and are opted into the new gate on refresh.
10. Bash and PowerShell checks, renderer tests, schema tests, and existing Flow/UI regressions remain in parity.

## Model Review Record

- **Gemini first pass**: chose an orthogonal importance field and gated outline review, but used the looser threshold bound, proposed validator mutation, relied on schema defaults for migration, and left readiness/files vague.
- **Gemini revision**: accepted non-mutating validation, shared-renderer Option B, digest staleness, migration, and better option framing; its small-review formula still yielded a zero cap and it retained an implicit waiting state, so those parts were rejected.
- **Claude first pass**: chose the same core direction and proposed useful intent/coverage/scope panels; its small-review formula, critical criteria, readiness/migration, paths, and bulk-critical behavior were incomplete.
- **Claude revision**: accepted explicit awaiting state, critical bulk exclusion, versioned migration, canonical digest, and exact infrastructure areas; its lack of an absolute critical cap and some artifact/schema choices were corrected in this synthesis.
- **Codex independent proposal**: supplied the orthogonal field, absolute scarcity cap, dedicated outline review type, explicit waiting state, digest-bound authorization, and shared-renderer recommendation before reading the other model outputs.

External sources used: Impact Mapping (`https://www.impactmapping.org/drawing.html`), Product Talk Opportunity Solution Tree (`https://www.producttalk.org/glossary-discovery-opportunity-solution-tree/`), and Featmap user story mapping (`https://github.com/amborle/featmap`).
