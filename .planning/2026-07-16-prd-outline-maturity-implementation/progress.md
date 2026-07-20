# Progress Log

## 2026-07-16

- User approved the three-level Outline proposal and requested documentation
  plus implementation.
- Confirmed the current branch already contains the Flow/UI priority and formal
  Outline confirmation work that this change must preserve.
- Created the implementation plan and started Medium Step 1.
- Completed Medium Step 1 contracts and documentation using red-green TDD.
- Added explicit maturity upgrade/regression rules, one-way Level 3 compilation,
  append-only supersede auditing, fail-closed schema/helper behavior, repeated
  validation recovery, and installed-template refresh guidance.
- Completed the Step 1 Claude/Gemini/Codex review. Claude's accepted findings
  and Gemini's hardening suggestions were applied; final Claude and Gemini
  results were both `PASS`.
- Verified `tests/test_sp_methodology_templates.py`: 155 passed.
- Started Medium Step 2: Discovery schemas and renderer.
- Step 2 focused tests currently pass: `197 passed` across methodology and
  launcher tests after fixing the shared Outline review fixture directory.
- Prepared an isolated installed-template fixture under `output/playwright/`
  and validated its Discovery data successfully.
- Playwright wrapper invocation failed once because the global wrapper script
  is not executable (`permission denied`); browser checks continue by running
  the same wrapper explicitly with `bash`, without changing global skill files.
- Browser acceptance identified Step 2 hardening work before review: Discovery
  feature navigation, mobile banner wrapping, package/schema alignment,
  single-choice semantics, operation-field normalization, Discovery draft
  leave warnings, and stronger browser-side fail-closed validation.
- Applied the Step 2 hardening and verified the real renderer at desktop and
  390px mobile widths. Non-empty undownloaded drafts trigger navigation and
  `beforeunload` warnings; a successful download clears the warning, and the
  downloaded response passes the CLI validator.
- The only browser console error was a missing `favicon.ico`; it does not affect
  the Discovery workflow. Screenshots are stored under `output/playwright/`.
- A prior bare `pytest` invocation was not the repository runtime and is not
  accepted as evidence. All recorded verification uses `uv run pytest`.
- One Gemini Step 2 review attempt failed because the model called an unavailable
  `run_shell_command` tool and returned an empty response. It is invalid and
  must be rerun; Claude review remains pending.
- Closed two Step 2 contract gaps found by Codex review: single-choice Discovery
  questions now require exactly one recommended candidate, and intent-ledger
  events now validate fields by operation so `exclude` may carry an empty value
  while still requiring exactly one candidate or target reference.
- Reverified the Step 2 focused suite: `200 passed`; `git diff --check` exited 0.
- Completed the Step 2 three-model checkpoint. Claude returned `PASS`. Gemini's
  accepted zero-tool stdin review returned `PASS`; earlier empty/error attempts
  remain explicitly excluded. Codex rechecked the corrected contracts and
  returned `PASS`.
- Started Medium Step 3: `/sp.prd` response consumption, append-only ledger, and
  atomic writeback.
- Added the deterministic `apply-outline-discovery.mjs` writeback helper and
  focused response/ledger/writeback tests. The helper validates response and
  source identity, operations, candidates, targets, provenance, supersession,
  maturity, and non-authorization before replacing formal documents.
- Preserved the approved pending-retry boundary: valid events are appended
  before temporary-document validation; failed temporary output leaves formal
  documents unchanged and can retry the same response without duplicating the
  ledger event.
- Hardened Step 3 after Codex self-review: malformed source/ledger contracts and
  conflicting provenance tags now fail closed, while backup cleanup failure
  after a successful document-pair replacement only warns and cannot trigger a
  destructive rollback.
- Focused Step 3 test result after hardening: `25 passed`.
- Added review-driven coverage for both `exclude` reference forms, rejection of
  superseding ledger-only pending events, and rejection of duplicated historical
  `intent-delta` anchors.
- The new duplicate-anchor test first failed as expected because consumed-event
  detection used substring presence. Changed it to require exactly one anchor
  in the current formal PRD. A follow-up run exposed only an intentional error
  message compatibility assertion; retained the existing "earlier accepted
  event" phrase while clarifying that it must be consumed by the current formal
  PRD.
- Clarified repository and installed-template documentation: a
  `supersedes_delta_id` may reference only an event already consumed by the
  current formal PRD, never a ledger-only pending event.
- Focused Step 3 test result after the correction: `30 passed`.
- The first 230-test Step 3 checkpoint then found one documentation-contract
  assertion requiring the established phrase "must reference an earlier
  accepted event". Kept that phrase and added the stricter current-formal-PRD
  consumption qualifier instead of weakening the test.
- Completed the Step 3 three-model checkpoint. Claude identified a real stale
  recovery-claim overwrite race in the initial quarantine/rename design; the
  final protocol uses identity-bearing main and recovery locks, performs an
  ownership recheck, preserves replacement owners, and fails closed when a
  dead process left both locks.
- Gemini's final current-code recheck returned `PASS`. Earlier suggestions that
  contradicted append-only durability, pending retry, or fail-closed recovery
  were rejected after contract-level review.
- Codex's final Step 3 audit returned `PASS`. The combined focused verification
  completed with `237 passed`; JavaScript syntax, Python compilation, and
  `git diff --check` also exited 0.
- Started Medium Step 4 compatibility and end-to-end verification.
- Exercised the installed-template renderer at desktop and mobile sizes for
  Discovery and formal Outline confirmation. Downloaded packages independently
  passed schema and identity validation; the only console message was a
  non-blocking missing `favicon.ico` request.
- Claude's final review found two valid gaps: critical qualification fields
  were browser-enforced but not schema-enforced, and digest representations
  were inconsistent across boundaries. Added schema conditionals and aligned
  digest input acceptance while canonicalizing confirmation-package output.
  Claude's recheck returned `PASS`.
- Gemini completed its review after local proxy retries. Codex rejected its
  stale digest finding and findings that conflated non-authorizing Discovery
  with formal `specify_ready` confirmation or transient page filters with
  persisted review state. No additional production change was required.
- Final focused verification first exposed an old test coupled to the position
  of an `allOf` schema branch. Updated it to locate the must-confirm condition
  by semantics; the focused result is `321 passed, 22 skipped`.
- Completed Medium Step 4 and its three-model review. Full verification is
  `1920 passed, 54 skipped`; JavaScript syntax, JSON parsing, and
  `git diff --check` all pass.
