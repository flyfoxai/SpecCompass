# Medium Step 1 Review: Contracts and Documentation

Date: 2026-07-16

## Scope

- Three-level `outline_maturity` contract
- Discovery/confirmation authorization boundary
- Response, ledger, temporary writeback, and Level 3 compilation chain
- Failure-closed recovery and installed-template refresh guidance

## Claude Review

Initial result: `NEEDS_CHANGES`

Accepted findings:

1. The installed English command spec needed explicit `frame -> explore` and
   `specify_ready -> frame` triggers. Added.
2. The review-data skill needed the Discovery primary action and persistent
   non-authorization message. Added.
3. The review-data skill needed the two-attempt recovery route and immutable
   supersede contract. Added.
4. The renderer README needed to identify the response package as a browser
   download supplied explicitly to `/sp.prd`, not a repository path. Added.

Rejected finding:

- Claude reported that the Chinese methodology lacked the installed-project
  refresh route. The current file already stated that initialized projects do
  not receive new templates automatically and must use `specify init --force`,
  so no duplicate paragraph was added.

Final recheck: `PASS`

## Gemini Review

Final result: `PASS`

Accepted hardening suggestions:

1. `supersedes_delta_id` must reference an earlier accepted event; forward
   references and cycles fail closed.
2. Valid new evidence resets the consecutive-regeneration-failure count.
3. Unsupported schema versions cannot be silently upgraded or downgraded to an
   incompatible contract.

Already satisfied:

- Direct regression from `specify_ready` to `explore` is already covered when
  the Level 1 minimum becomes unconfirmed, so no duplicate transition was
  added.

## Codex Review

Result: `PASS`

Checked:

- Maturity remains independent from readiness and confirmation priority.
- Discovery cannot authorize `/sp.specify` or enter confirmation/ready states.
- Discovery and confirmation schemas, packages, parsers, and state machines are
  mutually isolated.
- Accepted deltas remain auditable through provenance tags, stable anchors, and
  immutable ledger history.
- Missing helpers, invalid versions, repeated validation failures, and missing
  installed assets all have explicit fail-closed recovery routes.

## Verification

```text
.venv/bin/pytest -q tests/test_sp_methodology_templates.py
155 passed in 4.61s
```

`git diff --check` also passed for all Step 1 files.
