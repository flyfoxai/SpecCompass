# PRD Level 1 Business Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/sp.prd` compile Level 1 maps from source-backed business semantics and show applicable Constitution clauses as read-only governance context.

**Architecture:** Upgrade Outline Discovery to schema v3 with an embedded `business_context` and a separate read-only `constitution_snapshot`. Enforce the contract consistently in the JSON schema, Node validators, writeback consumer, and browser runtime before changing renderer copy and documentation.

**Tech Stack:** Markdown command templates, JSON Schema 2020-12, Node.js ES modules, browser JavaScript, Python pytest.

## Global Constraints

- Constitution governs project-wide rules; PRD owns product facts and business capabilities.
- Constitution content is display-only in `/sp.prd` and cannot be a business-chain source or writeback target.
- Outline Discovery v2 is not silently upgraded to v3.
- Existing density, stable-node, append-only ledger, and non-authorizing Discovery contracts remain in force.
- Each medium phase requires independent Claude and Gemini review plus Codex adjudication.

---

### Task 1: Contract Tests

**Files:**
- Modify: `tests/test_sp_methodology_templates.py`
- Modify: `tests/test_outline_discovery_writeback.py`

**Interfaces:**
- Produces: executable examples of `business_context`, `constitution_snapshot`, business-chain node references, and schema v3 response/ledger packages.

- [ ] Add schema assertions and validator failure cases for abstract Overview spines, incomplete business chains, missing evidence, unbound AI proposals, Constitution evidence leakage, and mutable Constitution display data.
- [ ] Run the focused tests and confirm they fail for missing v3 behavior.

### Task 2: Data Contract And Deterministic Validators

**Files:**
- Modify: `templates/project/.specify/review/schemas/outline-discovery-data.schema.json`
- Modify: `templates/project/.specify/review/schemas/outline-discovery-response.schema.json`
- Modify: `templates/project/.specify/review/schemas/outline-intent-ledger.schema.json`
- Modify: `templates/project/.specify/review/scripts/validate-review-data.mjs`
- Modify: `templates/project/.specify/review/scripts/apply-outline-discovery.mjs`
- Modify: `templates/project/.specify/review/renderer/scripts/data-validator.js`

**Interfaces:**
- Consumes: Task 1 samples.
- Produces: schema v3 validation for `business_context`, `constitution_snapshot`, `business_chain_refs`, source integrity, overview topology, and question binding.

- [ ] Implement the minimal schema v3 fields and cross-reference checks in all three deterministic validation paths.
- [ ] Reject v2 response/writeback packages without implicit conversion.
- [ ] Run focused schema and writeback tests until green.
- [ ] Ask Claude and Gemini to review Task 1-2 changes; fix accepted Critical/Important findings.

### Task 3: PRD Generation Mechanism And Methodology

**Files:**
- Modify: `templates/commands/prd.md`
- Modify: `docs/reference/sp-project-methodology.md`
- Modify: `templates/project/docs/reference/sp-command-spec.md`
- Modify: `templates/project/docs/reference/speckit-command-usage.md`

**Interfaces:**
- Consumes: schema v3 contract from Task 2.
- Produces: two-stage extraction and map compilation instructions with Constitution isolation and maturity gates.

- [ ] Add tests that require the two-stage business extraction, business-chain maturity gate, Constitution read-only display, and failure behavior.
- [ ] Update the command and maintained methodology documents in their authoritative languages.
- [ ] Run methodology contract tests until green.
- [ ] Ask Claude and Gemini to review Task 3; fix accepted Critical/Important findings.

### Task 4: Renderer

**Files:**
- Modify: `templates/project/.specify/review/renderer/scripts/outline-discovery-renderer.js`
- Modify: relevant renderer stylesheet under `templates/project/.specify/review/renderer/styles/`
- Modify: `tests/test_sp_methodology_templates.py`

**Interfaces:**
- Consumes: validated `business_context` and `constitution_snapshot`.
- Produces: business-first title/summary and a read-only Constitution clause panel without response controls.

- [ ] Add renderer tests for business-first copy and read-only Constitution display.
- [ ] Remove fixed methodological body copy and render source-backed business context.
- [ ] Render available or missing Constitution state without creating selectable questions.
- [ ] Run renderer and browser smoke tests until green.
- [ ] Ask Claude and Gemini to review Task 4; fix accepted Critical/Important findings.

### Task 5: Distribution And End-To-End Verification

**Files:**
- Modify only generated/distribution assertions required by existing template tests.

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: a refreshable project template whose `/sp.prd` Level 1 artifact passes every validation path.

- [ ] Run focused pytest, full methodology tests, writeback tests, Node syntax checks, and template distribution tests.
- [ ] Generate or validate a representative trading-project Discovery artifact and confirm its Overview uses concrete business capability branches.
- [ ] Run final Claude, Gemini, and Codex code review; resolve all accepted Critical/Important findings.
- [ ] Record exact verification output and remaining risks without committing or releasing unless separately requested.
