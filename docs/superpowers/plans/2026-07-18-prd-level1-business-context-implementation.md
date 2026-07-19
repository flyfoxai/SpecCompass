# PRD Level 1 Product Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/sp.prd` Level 1 extract source-backed business capabilities, propose cohesive candidate subprojects for large products, and reject generic process copy before emitting Discovery data.

**Architecture:** Keep Outline Discovery schema v3, renderer, response, ledger, and writeback unchanged. Strengthen the model-facing command contract, mirror the same responsibilities in maintained methodology and usage docs, and verify that every installed `sp-prd/SKILL.md` carries the contract. Use deterministic prompt-contract tests plus cross-industry Claude/Gemini evaluations because product decomposition quality itself is model-semantic, not a new runtime API.

**Tech Stack:** Markdown command templates, Python 3.11, pytest, existing integration template compiler, local Claude Code CLI, local Gemini TTK CLI.

## Global Constraints

- Scope is only the `/sp.prd` Level 1 generation chain; do not change `/sp.flow`, `/sp.ui`, schema v3, renderer, response, ledger, or writeback behavior.
- `/sp.constitution` owns durable governance; `/sp.prd` displays `constitution_snapshot` read-only and never uses it as product evidence.
- QMT is an evaluation fixture only and must not appear in the production command or maintained usage contract.
- Decomposition is a required analysis, not a quota: retain a single project when splitting cannot produce independently verifiable business outcomes.
- Candidate subprojects are proposals until the user confirms them; Level 1 never creates feature directories or authorizes `/sp.specify`.
- Confirmed child projects receive `Subproject Handoff` contracts and later enter their own feature directory and `/sp.prd` process.
- Preserve all unrelated worktree files and changes.
- Each medium phase requires Claude and Gemini review plus Codex adjudication.

---

### Task 1: Prompt Contract Tests

**Files:**
- Modify: `tests/test_sp_methodology_templates.py`
- Modify: `tests/integrations/test_integration_codex.py`

**Interfaces:**
- Consumes: `templates/commands/prd.md` and the normal Codex integration installer.
- Produces: assertions for the three-stage Level 1 contract and installed `sp-prd/SKILL.md` parity.

- [x] **Step 1: Extend the Level 1 contract test before changing production text**

  Require all four maintained surfaces to describe capability atoms, candidate subprojects, independently verifiable outcomes, business input/output contracts, anti-technical-layer splitting, semantic quality gates, and `Subproject Handoff`. Require the production command to state that user-supplied root/Level 1 structure outranks model regrouping and that no fixed split count applies.

- [x] **Step 2: Add an installation test before changing production text**

  Install Codex into `tmp_path`, read `.agents/skills/sp-prd/SKILL.md`, and assert it contains `Stage C - run the semantic quality gate`, `candidate subprojects`, `Subproject Handoff`, and Constitution evidence isolation while containing neither `QMT` nor a fixed `up to three` branch rule.

- [x] **Step 3: Run RED verification**

  Run:

  ```bash
  .venv/bin/pytest -q tests/test_sp_methodology_templates.py::test_prd_level_one_uses_business_semantics_and_keeps_constitution_read_only tests/integrations/test_integration_codex.py::TestCodexIntegration::test_codex_installs_prd_level_one_product_decomposition_contract -vv
  ```

  Expected: both tests fail because the current template still has a two-stage, maximum-three capability-branch contract and no confirmed decomposition handoff.

### Task 2: Model-Facing `/sp.prd` Mechanism

**Files:**
- Modify: `templates/commands/prd.md`

**Interfaces:**
- Consumes: existing schema v3 fields `business_context`, maps, questions, response operations, and `constitution_snapshot`.
- Produces: Stage A capability coverage, Stage B candidate project decomposition/map compilation, Stage C semantic quality gate, and post-confirmation handoffs without protocol changes.

- [x] **Step 1: Implement Stage A source priority and capability coverage**

  Add source precedence, preserve explicit user root/Level 1 structures, extract `capability_atoms`, and require every formal-source capability to land in a business object, operation, outcome, chain, candidate project, global business constraint, or explicit evidence gap.

- [x] **Step 2: Implement Stage B decomposition rules**

  Group capability atoms by independent product value, cohesive responsibility, owned objects/rules/state, observable outcome, and small business contracts. Explicitly reject frontend/backend/database/team/repository splits, empty input-only projects, miscellaneous buckets, forced project counts, and assumed service/repository equivalence.

- [x] **Step 3: Implement Stage C quality gate and anti-boilerplate**

  Require coverage, independence, responsibility purity, loose coupling, lifecycle coverage, terminology fidelity, correct product subject, and real decision quality. On failure, regroup once; if still invalid, remain `explore` and expose a concrete evidence or boundary gap. Ban process/UI copy and generic phrases from product-visible titles, summaries, candidates, and questions while requiring object-action-result wording.

- [x] **Step 4: Implement decision and handoff behavior**

  Use existing candidate operations for independent-project, merge, split, defer, and exclude decisions. After validated user confirmation, record `Project Decomposition` and generate one `Subproject Handoff` per confirmed child; do not create directories or continue the parent product as one giant `/sp.specify` input.

- [x] **Step 5: Run GREEN verification**

  Re-run the focused tests from Task 1 and confirm they pass.

- [x] **Step 6: Run medium-phase review**

  Ask Claude and Gemini to compare `templates/commands/prd.md` with the approved design for cross-industry applicability, Constitution separation, protocol compatibility, and prompt leakage. Codex accepts only concrete Critical/Important findings, applies fixes, and reruns focused tests.

### Task 3: Maintained Methodology And Usage Surfaces

**Files:**
- Modify: `docs/reference/sp-project-methodology.md`
- Modify: `templates/project/docs/reference/sp-command-spec.md`
- Modify: `templates/project/docs/reference/speckit-command-usage.md`

**Interfaces:**
- Consumes: Task 2 command contract.
- Produces: aligned Chinese methodology/usage guidance and English agent command specification.

- [x] **Step 1: Replace obsolete two-stage and maximum-three wording**

  Describe three-stage extraction, decomposition, and quality validation. Make Level 1 a product-portfolio/subproject decision surface rather than a generic capability directory.

- [x] **Step 2: Document responsibility boundaries and confirmed handoff**

  State that Constitution remains display-only, candidate projects need user confirmation, confirmed children receive handoffs, and the parent cannot bypass child-level PRD/Outline confirmation.

- [x] **Step 3: Remove misleading boilerplate**

  Remove wording that encourages goals/users/problems/methodology as visible map branches, fixed branch quotas, or technical architecture decomposition. Keep concise examples domain-neutral.

- [x] **Step 4: Verify maintained surfaces and installation**

  Run:

  ```bash
  .venv/bin/pytest -q tests/test_sp_methodology_templates.py tests/integrations/test_integration_codex.py -k 'prd or level_one or installs_prd' -vv
  ```

- [x] **Step 5: Run medium-phase review**

  Ask Claude and Gemini to review documentation alignment, ambiguous wording, optional filler, and cross-industry applicability. Codex adjudicates findings and reruns the focused suite.

### Task 4: Semantic Regression And Final Verification

**Files:**
- Modify only tests or docs when a concrete review finding proves a missing contract.

**Interfaces:**
- Consumes: final command template and maintained docs.
- Produces: evidence that the mechanism guides trading and non-trading products without hard-coded domain answers.

- [x] **Step 1: Run three isolated model evaluations**

  Provide the installed-equivalent `/sp.prd` Level 1 contract plus source briefs for: A-share QMT controlled trading, a content publishing product, and an enterprise approval product. Require each reviewer to return the product root, candidate child projects, owned capabilities/outcomes, handoff contracts, global business constraints, and any reason to retain one project.

- [x] **Step 2: Evaluate outputs against the semantic gate**

  Confirm that QMT retains data/strategy, controlled execution, and transaction-fact/operations responsibilities; non-trading cases use their own domain language; no case uses goals/users/problems, SP workflow, or frontend/backend/database as Level 1 projects; and no case splits only to meet a count.

- [x] **Step 3: Run full relevant regression**

  Run:

  ```bash
  .venv/bin/pytest -q tests/test_sp_methodology_templates.py tests/test_outline_discovery_writeback.py tests/integrations/test_integration_codex.py
  git diff --check
  ```

- [x] **Step 4: Run final multi-model code review**

  Give Claude and Gemini the approved design, final diff, and verification evidence. Resolve accepted Critical/Important findings, rerun affected tests, and perform a final Codex review for scope creep, prompt leakage, stale two-stage/fixed-count wording, and unrelated-file changes.

- [x] **Step 5: Record completion without release side effects**

  Report exact test totals, model-evaluation findings, changed files, and residual limitations. Do not bump version, push, or publish a release unless the user separately requests it.

### Task 5: Harden The Level 1/2/3 Generation Contracts

**Files:**
- Modify: `templates/commands/prd.md`
- Modify: `docs/reference/sp-project-methodology.md`
- Modify: `templates/project/docs/reference/sp-command-spec.md`
- Modify: `templates/project/docs/reference/speckit-command-usage.md`
- Modify: `tests/test_sp_methodology_templates.py`
- Modify: `tests/integrations/test_integration_codex.py`

**Interfaces:**
- Consumes: the existing Outline Discovery schema, intent ledger, subproject handoff, and Level 3 confirmation compiler.
- Produces: separate executable contracts for portfolio decomposition, child-project framing, and source-preserving formal compilation without changing the wire protocol.

- [x] **Step 1: Write failing contract tests**

  Require Level 1 to allocate every source-backed capability exactly once or record a cross-cutting constraint/evidence gap, require each candidate to declare owned business state and an explicit handoff, and require all boundary choices to close before Level 2. Require Level 2 to operate on one confirmed `Subproject Handoff` and complete a trigger-to-outcome business chain without reopening the whole portfolio. Require Level 3 to preserve source identity, add no business facts, and fall back to the narrowest affected level.

- [x] **Step 2: Verify the tests fail for the missing contracts**

  Run the focused methodology and Codex installation tests and confirm failures identify the absent Level 1/2/3 wording rather than unrelated setup errors.

- [x] **Step 3: Implement the three distinct contracts**

  Replace the shared Level 1/2 Stage A/B/C wording with a Level 1 decomposition compiler, a Level 2 child-project framing compiler, and a Level 3 source-preserving formal compiler. Replace subjective gates such as `clear`, `stable`, and `source-backed enough` with field-level evidence and decision-closure requirements.

- [x] **Step 4: Implement semantic anti-boilerplate and boundary corrections**

  Require visible business copy to include a source-backed domain object, a domain action/control, and an observable result/state/handoff. Add the cross-domain substitution rejection test, demote container-word detection to a warning signal, and treat transactional consistency or bidirectional exchange as business constraints when imposed by an external obligation.

- [x] **Step 5: Run Level 1 and Level 2 multi-model review**

  Give Claude and Gemini the actual diff and ask them to find cross-domain loopholes, forced choices, boundary regressions, or Constitution leakage. Codex adjudicates findings, applies only concrete corrections, and reruns focused tests.

- [x] **Step 6: Align Level 3 and maintained documentation**

  Synchronize the formal compilation, fallback, source-traceability, and Constitution display-only rules across the command, methodology, command specification, and user usage reference.

- [x] **Step 7: Run final multi-model review and verification**

  Ask Claude and Gemini to audit the final diff against the approved contract, resolve Critical/Important findings, run focused and full relevant tests plus `git diff --check`, and report without committing, versioning, pushing, or releasing.

## Errors Encountered

| Error | Attempt | Resolution |
|---|---:|---|
| Claude and Gemini CLI parsed a prompt beginning with the template's `---` frontmatter as an option; Claude returned `unknown option` and Gemini reported a missing `-p` argument. | 1 | Prefix the evaluation payload with ordinary text before the template so the prompt cannot begin with a dash. No model evaluation occurred in the failed attempt. |
| Gemini's first content-publishing regression read the production template but returned an empty response after transient `fetch failed` errors. | 1 | Re-ran the same regression with a shorter prompt. Gemini generated `内容生产`, `内容审核`, `多渠道发布`, and `内容效果归集`, with no generic container title. |
| Gemini's first final-review session could read files but lacked the requested shell tool and therefore could not obtain `git diff`. | 1 | Supplied the complete target diff directly as escaped prompt text. Gemini reviewed 25,777 input tokens and returned `无 Critical/Important 问题`. |
| The first direct-diff retry used unsafe shell quoting, so Markdown backticks were interpreted by zsh and the command exited before Gemini ran. | 1 | Re-ran with strict single-quote escaping. No repository files or external state were changed by the failed invocation. |
| Claude's final routing review found broad `/sp.clarify` fallbacks in repeated-blocker, high-impact-choice, and closeout rules after the first 288-test pass. | 1 | Added a failing routing assertion, classified each unresolved item before routing, kept Level 1/2 boundary and ownership choices in graphical Discovery, and reran the 288-test suite successfully. |
| Gemini's final routing review could not access the repository because its internal shell tool was unavailable. | 1 | Passed the corrected routing rules and test assertions directly in a no-tools prompt; Gemini returned `无 Critical/Important`. |
| Claude read two arrow-form semantic summaries as literal test assertion strings. | 1 | Supplied the real passing Python assertions and matching production text; Claude withdrew both findings and returned `无 Critical/Important`. |
