# Findings

## Repository Shape

- Built-in agent commands originate in `templates/commands/*.md` and are
  transformed by each integration.
- Project-owned stable artifacts originate in
  `templates/project/.specify/templates/feature/`.
- The built-in full workflow is `workflows/speckit/workflow.yml`; built-in
  workflow discovery uses `workflows/catalog.json`.
- Existing tests cover command text contracts, integration installation,
  workflow parsing/execution, and project methodology templates.
- No Lite command, Lite feature template, Lite workflow, or Lite runtime helper
  currently exists.
- `src/specify_cli/command_names.py::CORE_COMMAND_STEMS` must include `lite` so
  every integration emits the canonical `sp.lite` / `sp-lite` names.
- Command templates are discovered automatically from `templates/commands`, so
  no second command registry is needed.
- `/sp.route` already uses paired Bash and PowerShell scripts to produce
  deterministic JSON before the command prompt decides whether dispatch is
  allowed. Lite should reuse this boundary with its own state/global-governance
  helper rather than infer routing from prose.
- Source-checkout scripts under `scripts/` are copied into initialized projects;
  the packaged wheel also builds a `core_pack`, so packaging tests and build
  configuration must be checked before adding new scripts/templates.
- Workflow command steps dispatch one installed command and capture its exit
  status, but they do not own durable domain state. Lite workflow recovery must
  therefore re-enter `/sp.lite`, which re-reads `lite.md` and the deterministic
  state payload before choosing another owner command.
- Workflow schema validation is intentionally open and supports ordinary
  command, gate, conditional, and loop steps. The Lite workflow can remain a
  thin wrapper around `/sp.lite`; embedding the full state machine in YAML would
  create a second authority and is intentionally excluded.

## Approved Architecture

- `/sp.lite` owns candidate generation, human selection, round lifecycle,
  reconciliation, and deterministic route output.
- Existing SP commands continue to own PRD, Spec, Flow, UI, Gate, Bundle, Plan,
  Tasks, Analyze, and Implement artifacts.
- `specs/<feature>/lite.md` is the single Lite state contract.
- A workflow wrapper may dispatch one permitted owner command at a time but
  cannot replace persisted Lite and owner evidence.

## New Global Governance Requirement

Every candidate and every automatic dispatch must be checked against the full
confirmed Outline and accumulated delivery state, not just the selected round.
The check must identify duplicate anchor coverage, contradicting requirements
or decisions, incompatible shared interfaces/data models, stale dependencies,
overlapping write scopes, and regressions against validated historical rounds.
The coordinator must reuse compatible prior work, merge duplicate scope, or
pause with an owner route instead of generating parallel contradictory work.

The deterministic contract will distinguish at least these governance results:

- `CLEAR`: no detected global conflict; the next owner route may proceed.
- `REUSE_REQUIRED`: the selected anchor is already covered and must reference
  the prior round or implementation instead of creating a parallel artifact.
- `RECONCILE_REQUIRED`: requirements, decisions, interfaces, data models,
  permissions, or write scopes conflict and an explicit owner command must
  reconcile them before continuation.
- `STALE_EVIDENCE`: an upstream signature changed after the current round was
  selected or validated; the owning SP stage must refresh its evidence.
- `REGRESSION_BLOCKED`: the proposed/current implementation breaks a previously
  validated Lite round; implementation cannot advance until repaired.

## Owner Command Enforcement

- All eight downstream owners preserve their existing full-SP behavior when no
  Lite round is active.
- An active round is a hard entry gate: owners read the included/deferred
  Outline anchors, reuse references, allowed write set, historical regressions,
  global status, and blocker route before mutating their artifacts.
- Flow/UI own round-scoped confirmation evidence; Plan/Tasks own round-labelled
  write boundaries; Analyze/Gate own cumulative historical regression checks;
  Implement owns both a real executable delta and regression-failure blocking.
- The confirmed Outline remains the global completion boundary, so a locally
  successful round cannot be mistaken for completion of the whole project.

## Workflow And Documentation Surfaces

- The full bundled workflow is a long hard-coded SP chain, but Lite must be a
  single `sp.lite` re-entry step so persisted `lite.md` and human gates remain
  authoritative.
- `workflows/catalog.json` currently exposes only `speckit`; `pyproject.toml`
  force-includes only `workflows/speckit`, so both discovery and wheel mapping
  need an explicit `speckit-lite` entry.
- The maintained user docs are not four paired files as initially assumed:
  `docs/quickstart.md` is English and
  `docs/reference/speckit-command-usage.md` is the existing Chinese command
  reference. There are no `.zh-CN.md` counterparts at those paths. Lite usage
  should be aligned across these two maintained surfaces without creating
  duplicate full documents solely for this change.
- Workflow schema validation accepts a single ordinary command step and
  optional string inputs, so no workflow-engine change is needed. The resume
  behavior can stay entirely in the `sp.lite` prompt and persisted `lite.md`.
- `pyproject.toml` defines pytest and Hatch wheel packaging but no repository
  Ruff, MyPy, Pyright, Black, lint, or type-check configuration. The relevant
  non-test checks for this change are script parsing, wheel content, Markdown
  whitespace, and scoped contract scans.
- PowerShell is unavailable on this macOS host; paired behavior remains covered
  by source assertions while executable PowerShell parity is explicitly
  skipped. Bash parsing is available and passes.

## Final Review Blockers

- Ordinary owner evidence is only checked for file existence and stage markers;
  it is not bound to the active Lite round, included Outline anchors, or a
  ledgered source signature. Historical evidence can therefore satisfy a new
  round.
- FLOW/UI skip entries require a reason but no durable human confirmation, so
  the coordinator can bypass a required human decision.
- Protected Gate/Analyze snapshots require a non-empty signature but do not
  compare it with the current round ledger, so stale snapshots can advance.
- A custom candidate may be independent from prior rounds, but it must still
  map to confirmed Outline anchors. The current command text incorrectly
  permits an Outline-unmapped independent round.

The root cause is one missing round-scoped evidence contract. The durable Lite
ledger must bind each stage to the active round, selected anchors, source
signature, and any required human approval; both route inspectors and prompt
templates must consume the same fields.

## Final Review Repairs

- Every completed owner stage now has a 64-character before-dispatch entry in
  `Stage Source Signatures`.
- Flow, UI, Bundle, Plan, and Tasks evidence is valid only when its round,
  stage, included Outline anchors, and source signature match the active ledger.
- Flow/UI require current-round human confirmation; Plan requires current-round
  human approval. A Flow/UI skip requires both a concrete reason and
  `NOT_REQUIRED_CONFIRMED`.
- Gate and Analyze PASS evidence is an immutable, stage-specific snapshot under
  the active round. Its source signature and anchors must match the ledger.
- Implement requires a ledgered source signature plus non-empty completion
  evidence.
- Independent rounds remain independent only from earlier rounds; they cannot
  be created unless the selected direction maps to confirmed Outline anchors.
