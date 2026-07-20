# Model Planning Brief

You are planning only. Do not edit repository files and do not propose implementation code.

## User goals

1. Flow and UI confirmation points need three importance levels: `非常重要`, `重要`, and `普通`. `非常重要` must remain scarce. The model should minimize it and make genuinely critical human decisions stand out.
2. The PRD outline phase inside `/sp.prd` needs a graphical confirmation experience comparable to Flow/UI review.
3. Produce three implementation options, recommend one, and give a repository-grounded phased plan.

## Repository facts

- Flow/UI use one fixed renderer under `templates/project/.specify/review/renderer/`, separate JSON schemas, and `validate-review-data.mjs`. Commands generate review JSON, not page code.
- Existing `review_level` has six semantic values: `must_confirm`, `recommended`, `uncertain`, `key_step`, `verified`, and `system_arch`. It controls obligation/state meaning, labels, colors, counters, and renderer behavior. Importance must not accidentally erase these semantics.
- Browser state is not authorization. A downloaded package or fallback summary must be written into `flow-confirmation.md` or `ui-confirmation.md` before downstream stages may treat choices as authorized.
- Bulk recommendation scopes are current view, current module, and current requirement; saved choices and drafts are preserved.
- Current loader/launcher/validator/confirmation package are explicitly limited to `flow` and `ui`; adding outline touches all of them plus tests and documentation.
- `/sp.prd` creates `specs/<feature>/prd.md` and a lightweight `specs/<feature>/spec-outline.md` bridge to `/sp.specify`. Outline must not become Flow, UI, API, database, plan, task, or implementation design.
- Outline content is limited to feature/source authority, strategic goal, users/roles, problem domains, capability slices, scope/non-goals, core scenarios, acceptance seed groups, risk/open-item summary, and recommended first slice.
- Current readiness values are `READY_FOR_SPECIFY`, `NEEDS_PRD`, `NEEDS_CLARIFY`, `NEEDS_SOURCE`, `SPLIT_REQUIRED`, `NEEDS_DECISION`, and `BLOCKED`. Status transitions require new evidence; repeated unchanged blocker signatures escalate. High-risk ready cases require explicit owner review.
- Tests are concentrated in `tests/test_sp_methodology_templates.py`, with outline gate checks also in `tests/test_sp_memory_check.py` and shared shell/PowerShell checkers.

## External evidence

- Impact Mapping (`impactmapping.org/drawing.html`) visualizes Goal -> Actors -> Impacts -> Deliverables and is explicitly intended to expose scope and assumptions. Adaptation must stop at capability slices to avoid solution/design drift.
- Product Talk's Opportunity Solution Tree uses Desired Outcome -> Opportunity Space -> Solution Space -> Assumption Tests. For this outline boundary, only outcome/opportunity logic is safe; solution/tests can exceed stage ownership.
- Featmap (`github.com/amborle/featmap`) represents user story mapping: product overview, goals/tasks, valuable slices/releases, prioritization. Useful for scope and first-slice views, but detailed tasks/stories would overlap `/sp.specify` or `/sp.flow`.
- There is no single mature PRD-specific diagram standard. A hybrid intent map plus coverage/readiness view is better grounded than copying one framework wholesale.

## Questions your plan must answer

- Is importance an independent field or derived from existing fields? Define machine values, applicability, compatibility, and legacy migration.
- Give a deterministic scarcity rule for `非常重要`, not just prompt wording. Define qualifying criteria, budget/cap, downgrade behavior, visual hierarchy, counts, filtering, and tests.
- Decide whether outline review is advisory or a gate. If gated, define readiness semantics without misusing an existing state, confirmation staleness/source hashing, and backwards compatibility.
- Define the outline visual information architecture without drifting into detailed Flow/UI/implementation design.
- Name likely artifact paths, schema/validator/launcher/loader/renderer/confirmation-package/writeback changes, command and downstream gate changes, documentation, and tests.
- Preserve the rule that review data is not authorization.
- Compare three options by correctness, migration cost, UX, long-term maintainability, and risk. Recommend one.

Return concise Chinese Markdown with: core decisions, three options and recommendation, data/validation design, outline visualization and workflow, phased file-level plan, compatibility, tests/acceptance criteria, and unresolved decisions.
