# Progress

## 2026-07-18

- User approved the `/sp.lite` design and requested implementation.
- User added a global-roadmap governance requirement to prevent conflicts,
  duplicate work, and contradictions across Lite rounds and the wider project.
- Read the required writing-plans and persistent-planning guidance.
- Confirmed the repository currently has no Lite implementation and identified
  the command templates, project artifact templates, workflow catalog, and
  test suites as the initial integration surfaces.
- Confirmed core command naming requires an explicit `lite` stem while command
  template installation itself is directory-driven.
- Chose paired deterministic Lite state scripts, following `/sp.route`, as the
  enforcement point for global roadmap checks and the unique next owner route.
- Restored session context and confirmed the current branch and untracked user
  files; no existing implementation files have been changed.
- Confirmed workflow command steps are dispatch-only and cannot be the durable
  Lite authority. The Lite workflow will re-enter `/sp.lite`, while `lite.md`
  plus owner artifacts remain authoritative.
- Defined the initial global-governance outcome classes: clear, reuse required,
  reconcile required, stale evidence, and regression blocked.
- Amended both approved design documents with deterministic global-roadmap
  inputs, outcome precedence, invalidation, blocker routing, and regression
  semantics.
- Wrote and self-reviewed
  `docs/superpowers/plans/2026-07-18-sp-lite-implementation.md`; placeholder and
  schema consistency scans passed.
- Chose in-place execution on `codex/prd-mindmap-outline` because the current
  untracked design context must remain available and no commit was authorized.
- Next: write failing registration and Lite route tests before implementation.
- Added the first RED suite for Lite registration, durable state, global-control
  blocking, stale-signature invalidation, platform parity, and command/template
  contracts.
- The first test invocation failed before collection because `pytest` is not on
  the shell PATH. Re-ran with `.venv/bin/pytest`; observed the expected 11 Lite
  failures, with 75 related tests passing and 1 PowerShell test skipped.
- Added the `lite` core command stem and Claude argument hint as the first
  minimal GREEN implementation step.
- Added the Lite artifact, command contract, and paired route inspectors.
  `bash -n` passed and the first focused GREEN run reported 86 passed and 1
  skipped (PowerShell unavailable).
- Started the next RED cycle for global precedence and active-Lite owner-command
  consumption.
- Re-ran the second RED cycle: conflict/reuse and regression/CLEAR precedence
  tests passed after the paired script fix; nine owner-template assertions
  failed for the expected missing contracts.
- Added `Active Lite Round` entry contracts to Flow, UI, Gate, Bundle, Plan,
  Tasks, Analyze, and Implement, including the owner-specific confirmation,
  write-set, historical-regression, and real-delta responsibilities.
- The first multi-file patch did not apply because `gate.md` has no immediate
  `/sp.gate` heading after user input. Reapplied against per-file user-input
  anchors without changing the intended content.
- Focused global governance and owner-contract verification now reports
  11 passed.
- Next: add RED tests for the thin Lite workflow, catalog discovery, and wheel
  packaging, then implement those surfaces and paired user documentation.
- Inspected the workflow/catalog/package and documentation surfaces. Confirmed
  the Lite workflow should contain one `sp.lite` step and that the repository's
  maintained English/Chinese guidance lives in `quickstart.md` and the Chinese
  `speckit-command-usage.md`, rather than the initially planned `.zh-CN.md`
  counterparts.
- Added three RED workflow/publication/documentation tests and observed the
  expected missing file, missing catalog entry, and missing user guidance
  failures.
- Added `workflows/speckit-lite/workflow.yml` as a single-command resumable
  entry, registered it in the built-in catalog and wheel mapping, and documented
  first/subsequent rounds plus global governance in the maintained English and
  Chinese user guides.
- The focused workflow/publication/documentation cycle now reports 3 passed.
- Next: run all scoped Lite, integration, workflow, and methodology regressions,
  then the full repository suite and diff/package checks.
- Scoped Lite/integration/workflow verification reported 218 passed and 1
  skipped.
- Full methodology verification exposed one compatibility failure: the new
  ordinary `lite.md` command was included by the global closeout-contract glob
  but lacked `## Next`. Root cause was an omitted cross-command convention, not
  a route-inspector defect; added the standard evidence-backed options,
  recommendation fields, and final copy-box rules.
- The first closeout fix still failed one literal-token assertion because
  Markdown wrapping split `Do not split the prompt into a separate field` over
  two lines. Kept the required sentence contiguous without changing behavior.
- The closeout focused test passed, followed by 180/180 methodology template
  tests.
- Full repository verification reported 1979 passed and 55 skipped in 122.80s.
- `git diff --check` and `bash -n scripts/bash/sp-lite-state.sh` passed. No
  configured lint/type checker was found. PowerShell is not installed, and the
  venv lacks the `build` module; use available `uv build` for wheel validation.
- Multi-model review found three governance gaps: owner commands could bypass
  the coordinator route, blocker-owner repairs could deadlock on non-`CLEAR`
  state, and PowerShell comparisons did not consistently match Bash casing.
  Tightened every Lite-aware owner contract so normal work requires the exact
  fresh `CLEAR` route, while a human-invoked named blocker owner may perform
  only the bounded repair and must return to `/sp.lite sync` without clearing
  global state itself.
- Added the previously missing `/sp.specify` Lite gate and strengthened both
  route inspectors to reject incomplete active-round authorization: malformed
  round IDs, unconfirmed direction, or empty candidate, anchor, and write-set
  fields now return to the coordinator.
- Aligned PowerShell lifecycle, terminal-state, route, signature, and global
  status comparisons with Bash using case-sensitive operators. PowerShell is
  unavailable on this host, so executable parity remains skipped; source-level
  contract tests cover the platform-specific operators and branches.
- Final focused verification reported 195 passed and 1 skipped. Final full
  repository verification reported 1983 passed and 55 skipped in 116.89s.
  `bash -n` and `git diff --check` passed.
- `uv build --wheel` produced
  `specify_cli-0.10.35.dev0-py3-none-any.whl`; archive inspection confirmed the
  Lite command, Bash and PowerShell route inspectors, project artifact template,
  and `speckit-lite` workflow are all packaged.
- User requested merging to the primary branch and publishing the important
  `0.11.0` release.
- A final independent Codex review reproduced four High blockers: cross-round
  owner evidence reuse, unconfirmed FLOW/UI skips, stale protected snapshots,
  and Outline-unmapped independent candidates. Commit, merge, and release are
  paused until these are fixed and reverified.
- The review agent confirmed two unstaged experimental edits were accidental;
  restored only `scripts/bash/sp-lite-state.sh` and `tests/test_sp_lite.py` to
  their staged baseline, preserving all user-owned untracked files.
- Added RED regressions for cross-round evidence reuse, unconfirmed Flow/UI
  skips, stale Gate/Analyze snapshots, and Outline-unmapped independent rounds;
  then implemented matching Bash, PowerShell, owner-template, coordinator, and
  seeded-artifact contracts.
- Focused SP Lite verification after the repair reported 45 passed and 1
  skipped; the final owner publication contract test reported 1 passed.
- Synchronized the command design, mechanism design, and implementation plan
  with the final round/stage/anchor/signature evidence model. Fresh full,
  packaging, and multi-model verification remains pending before commit.
- Added RED regressions for the final review gaps: top-level Python cache
  exclusion, non-ASCII Git path parity, rejection of the undocumented
  `ROUND_COMPLETE` lifecycle state, orchestration lease fields and behavior,
  PRD owner routing, and Codex Lite workflow support.
- Repaired the paired signature inspectors, seeded orchestrator state,
  `/sp.lite` lease and dispatch contract, `/sp.prd` active-round guard, bundled
  workflow integration list, and paired English/Chinese command examples.
- The first focused rerun exposed two static-contract line-shape failures and
  one lease phrase split; normalized those literals without changing behavior.
  The specific lease contract regression now passes. A fresh complete focused
  run and broader verification remain pending.
