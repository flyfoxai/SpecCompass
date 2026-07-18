# SP Lite Global Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/sp.lite` as a resumable, human-selected, globally governed coordinator that advances one minimal validation round through existing SP owner commands without duplicating or contradicting the global roadmap.

**Architecture:** `specs/<feature>/lite.md` is the only durable Lite authority. Paired Bash and PowerShell inspectors read that file plus current SP artifacts and emit one `speckit.lite.route.v1` JSON decision; `/sp.lite` owns candidate selection and dispatch policy, while existing commands continue to own their artifacts. A thin `speckit-lite` workflow re-enters `/sp.lite` for durable-state recovery instead of duplicating its state machine.

**Tech Stack:** Python 3.11+, pytest, Bash, PowerShell 7, Markdown command/templates, YAML workflow definitions, JSON workflow catalog.

## Global Constraints

- Preserve full SP behavior when `specs/<feature>/lite.md` has no active round.
- Require an explicit human direction selection for every new Lite round.
- Re-read persisted evidence before each dispatch; dispatch at most one owner command per state inspection.
- Record each completed stage's 64-character before-dispatch signature in `Stage Source Signatures`; require owner evidence to match the active round, stage, included Outline anchors, and signature.
- Require current-round human confirmation for Flow/UI, human approval for Plan, explicit `NOT_REQUIRED_CONFIRMED` for Flow/UI skips, immutable round/stage Gate and Analyze snapshots, and non-empty implementation completion evidence.
- Check the confirmed Outline, historical rounds, shared contracts, open decisions, code baseline, write scopes, and historical regressions before candidate generation and downstream routing.
- Treat `independent` as independent from a prior round only; every Lite direction must still map to confirmed Outline anchors.
- Never interpret `implemented`, `verified`, and `supported` as equivalent states.
- Never equate `READY_FOR_BUSINESS_VALIDATION` or `OUTLINE_COMPLETE_VIA_LITE` with production readiness.
- Keep paired English/Chinese user documentation aligned; keep agent command templates in English.
- Do not modify `.planning/.active_plan`, revert unrelated files, commit, or push.

## File Structure

- `src/specify_cli/command_names.py`: recognizes `lite` as a built-in SP command.
- `src/specify_cli/integrations/claude/__init__.py`: supplies Claude's argument hint for `/sp.lite`.
- `templates/project/.specify/templates/feature/lite.md`: canonical seeded Lite state, round ledger, coverage ledger, and global-control contract.
- `scripts/bash/sp-lite-state.sh`: deterministic POSIX-side Lite route inspector.
- `scripts/powershell/sp-lite-state.ps1`: behaviorally equivalent PowerShell inspector.
- `templates/commands/lite.md`: user-facing coordinator prompt and dispatch/stop contract.
- `templates/commands/{flow,ui,gate,bundle,plan,tasks,analyze,implement}.md`: active Lite scope and global-control consumption rules.
- `workflows/speckit-lite/workflow.yml`: resumable Lite entry workflow.
- `workflows/catalog.json` and `pyproject.toml`: discovery and wheel packaging for the Lite workflow.
- `docs/quickstart.md`, `docs/quickstart.zh-CN.md`, `docs/reference/speckit-command-usage.md`, `docs/reference/speckit-command-usage.zh-CN.md`: paired user guidance.
- `tests/test_sp_lite.py`: route inspector, template, state, and Bash/PowerShell parity tests.
- `tests/test_sp_methodology_templates.py`: downstream command contract tests.
- `tests/test_workflows.py`: workflow and catalog tests.
- `tests/integrations/test_integration_{codex,claude}.py`: installation/naming tests.

---

### Task 1: Register and install the Lite command

**Files:**
- Modify: `src/specify_cli/command_names.py`
- Modify: `src/specify_cli/integrations/claude/__init__.py`
- Test: `tests/integrations/test_integration_codex.py`
- Test: `tests/integrations/test_integration_claude.py`

**Interfaces:**
- Consumes: existing `CORE_COMMAND_STEMS`, `skill_directory_name()`, and `ARGUMENT_HINTS` behavior.
- Produces: canonical `sp.lite` command identity and `sp-lite/SKILL.md` installation path.

- [ ] Write failing assertions that `lite` is a core stem, Codex installs `sp-lite/SKILL.md`, and Claude exposes the hint `Feature, round action, or Lite validation direction`.
- [ ] Run `pytest tests/integrations/test_integration_codex.py tests/integrations/test_integration_claude.py -q` and confirm failure is caused by the absent stem/template/hint.
- [ ] Add `"lite"` to `CORE_COMMAND_STEMS` and the exact hint to `ARGUMENT_HINTS`.
- [ ] Re-run the two integration files after `templates/commands/lite.md` exists in Task 4; until then, run the focused naming assertions only.

### Task 2: Define the durable Lite state and deterministic route schema

**Files:**
- Create: `templates/project/.specify/templates/feature/lite.md`
- Create: `scripts/bash/sp-lite-state.sh`
- Create: `scripts/powershell/sp-lite-state.ps1`
- Create: `tests/test_sp_lite.py`

**Interfaces:**
- Consumes: explicit feature pointer precedence used by `sp-route`, stable readiness markers from current SP artifacts, and fixed Markdown data fields in `lite.md`.
- Produces: `speckit.lite.route.v1` JSON with `status`, `next`, `reason`, `activeFeature`, `featureDir`, `activeRound`, `activeRoundState`, `globalControl`, `continueAllowed`, `requiresHuman`, `blockerType`, `blockerRoute`, `reuseRefs`, `conflictRefs`, `staleRefs`, and `regressionFailures`.

- [ ] Write tests for no active feature, missing PRD/Outline, no `lite.md`, awaiting selection, normal owner routing, `REUSE_REQUIRED`, `RECONCILE_REQUIRED`, `STALE_EVIDENCE`, `REGRESSION_BLOCKED`, completed round/new candidates, and Bash/PowerShell parity.
- [ ] Run `pytest tests/test_sp_lite.py -q` and confirm it fails because the scripts and template do not exist.
- [ ] Add the seeded `lite.md` with `SP_STAGE_SEED: lite`, a fixed `## Lite Control` field block, candidate/round/coverage ledgers, and `## Global Control` evidence fields.
- [ ] Implement both inspectors so feature discovery is deterministic, seed content never counts as initialized state, non-`CLEAR` governance always sets `continueAllowed=false`, and every result contains at most one owner route.
- [ ] Run `pytest tests/test_sp_lite.py -q`; when PowerShell is unavailable, verify Bash coverage passes and parity is explicitly skipped.

### Task 3: Enforce global governance semantics in the route inspector

**Files:**
- Modify: `scripts/bash/sp-lite-state.sh`
- Modify: `scripts/powershell/sp-lite-state.ps1`
- Modify: `tests/test_sp_lite.py`

**Interfaces:**
- Consumes: `Global Status`, `Global Input Signature`, `Current Input Signature`, `Reuse Refs`, `Conflict Refs`, `Stale Refs`, `Regression Failures`, and `Blocker Route` fields from `lite.md`.
- Produces: deterministic precedence `STALE_EVIDENCE` -> `RECONCILE_REQUIRED` -> `REGRESSION_BLOCKED` -> `REUSE_REQUIRED` -> lifecycle route.

- [ ] Add failing precedence tests showing stale source evidence cannot be hidden by reuse, conflicts cannot be bypassed by a lifecycle `next`, and regression failures block final validation.
- [ ] Run the new tests and confirm the inspector returns the lifecycle route incorrectly before implementation.
- [ ] Implement the precedence table, validate `/sp.*` blocker routes, require a real delta before clearing reuse, and reject an old `CLEAR` when current and checked input signatures differ.
- [ ] Re-run `pytest tests/test_sp_lite.py -q` and inspect the complete JSON payloads in assertion failures before adjusting code.

### Task 4: Add the `/sp.lite` coordinator contract

**Files:**
- Create: `templates/commands/lite.md`
- Modify: `tests/test_sp_lite.py`
- Modify: `tests/test_sp_methodology_templates.py`

**Interfaces:**
- Consumes: `{SCRIPT}` transformed into `sp-lite-state.sh --json` or PowerShell equivalent, `$ARGUMENTS`, and `speckit.lite.route.v1`.
- Produces: candidate A/B/C presentation, explicit human selection, one-owner dispatch, persistent evidence re-check, and structured `NEXT_COMMAND_EXEC` closeout.

- [ ] Add failing template assertions for the deterministic script call, human selection prohibition, 2-3 candidates, custom direction mapping, global-roadmap read set, one-command dispatch limit, non-`CLEAR` stop rules, and multi-round resume behavior.
- [ ] Run `pytest tests/test_sp_lite.py tests/test_sp_methodology_templates.py -q` and confirm only the absent Lite contract assertions fail.
- [ ] Implement `lite.md` command content in English, including `init/next/select/evaluate/sync/stop/promote/complete`, candidate generation rules, the hard human gates, dispatch re-inspection loop, and structured closeout fields.
- [ ] Re-run the focused tests and the Codex/Claude integration tests from Task 1.

### Task 5: Make owner commands consume active Lite scope

**Files:**
- Modify: `templates/commands/flow.md`
- Modify: `templates/commands/ui.md`
- Modify: `templates/commands/gate.md`
- Modify: `templates/commands/bundle.md`
- Modify: `templates/commands/plan.md`
- Modify: `templates/commands/tasks.md`
- Modify: `templates/commands/analyze.md`
- Modify: `templates/commands/implement.md`
- Test: `tests/test_sp_methodology_templates.py`

**Interfaces:**
- Consumes: an active `lite.md` round's included/deferred anchors, global-control result, scoped confirmations, regression set, and round ID.
- Produces: owner artifacts limited to the authorized round while preserving unchanged full-SP behavior when no active round exists.

- [ ] Add failing parameterized tests requiring all eight commands to read active Lite state, stop on non-`CLEAR` governance, avoid deferred anchors, reuse prior evidence, and preserve the global Outline as the completion boundary.
- [ ] Add owner-specific failures: Flow/UI must write round-scoped confirmations; Plan/Tasks must label worksets/tasks with `Lite Round`; Analyze/Gate must check cumulative regressions; Implement must enforce real delta and history regression checks.
- [ ] Add failures proving owner evidence cannot be reused across rounds: Flow/UI/Bundle/Plan/Tasks bind round, stage, anchors, and source signature; Flow/UI require current confirmation; Plan requires current approval; Gate/Analyze snapshots are immutable and stage-specific; Implement requires a matching signature and non-empty completion evidence.
- [ ] Run the focused methodology tests and confirm the expected contract strings are absent.
- [ ] Add one compact `Active Lite Round` section to each command, with owner-specific rules and no duplicate Lite state machine.
- [ ] Re-run focused tests and then all `tests/test_sp_methodology_templates.py`.

### Task 6: Add the Lite workflow and paired usage documentation

**Files:**
- Create: `workflows/speckit-lite/workflow.yml`
- Modify: `workflows/catalog.json`
- Modify: `pyproject.toml`
- Modify: `tests/test_workflows.py`
- Modify: `docs/quickstart.md`
- Modify: `docs/quickstart.zh-CN.md`
- Modify: `docs/reference/speckit-command-usage.md`
- Modify: `docs/reference/speckit-command-usage.zh-CN.md`

**Interfaces:**
- Consumes: installed `sp.lite` command and existing workflow command-step dispatch.
- Produces: catalog entry `speckit-lite`, wheel artifact mapping, and documented first/subsequent-round usage.

- [ ] Add failing workflow tests asserting a valid `speckit-lite` workflow starts and resumes through `sp.lite`, does not hard-code downstream owner order, and is listed/packaged.
- [ ] Run `pytest tests/test_workflows.py -q` and confirm failures are due to missing workflow/catalog/package entries.
- [ ] Add a thin workflow with `spec`, `integration`, and optional `feature` inputs and one `sp.lite` command step whose prompt says to re-read persisted state and stop at human gates.
- [ ] Add aligned English/Chinese guidance explaining selection, cumulative/independent rounds, global governance, resume, business validation, and completion semantics.
- [ ] Re-run workflow tests and scan paired headings and examples for drift.

### Task 7: Verify behavior and review the complete change

**Files:**
- Modify: `.planning/2026-07-18-sp-lite-implementation/{task_plan.md,findings.md,progress.md}`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: fresh verification evidence and a requirement-to-evidence handoff.

- [ ] Run `pytest tests/test_sp_lite.py tests/integrations/test_integration_codex.py tests/integrations/test_integration_claude.py tests/test_workflows.py -q`.
- [ ] Run `pytest tests/test_sp_methodology_templates.py -q`.
- [ ] Run the repository's configured lint/type checks discovered from `pyproject.toml`; if none cover Markdown/scripts, run `bash -n scripts/bash/sp-lite-state.sh` and PowerShell parse validation when `pwsh` exists.
- [ ] Run `pytest -q` for the full regression suite and record exact pass/fail/skip totals.
- [ ] Inspect `git diff --check`, `git diff --stat`, and the scoped diff; verify no unrelated file was reverted and no `READY_FOR_PRODUCTION` claim was introduced.
- [ ] Update persistent planning files with files changed, exact verification commands, errors, and remaining risks.

## Self-Review

- Spec coverage: every lifecycle, human gate, cumulative/independent round, global-conflict class, owner scope consumer, workflow, packaging, and documentation requirement maps to a task above.
- Placeholder scan: the plan contains no deferred implementation placeholders; angle-bracket values appear only where they are literal persisted schema examples, not missing instructions.
- Type consistency: both platform scripts emit `speckit.lite.route.v1`; template and tests consume the same camelCase JSON keys; durable Markdown fields remain separate from route JSON fields.
- Scope control: no workflow-engine refactor, new authoritative artifact family, concurrent active rounds, or production-readiness behavior is included.
