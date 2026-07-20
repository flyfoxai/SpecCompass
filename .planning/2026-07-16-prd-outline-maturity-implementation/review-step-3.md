# Medium Step 3 Review: `/sp.prd` Writeback Loop

Date: 2026-07-16

## Scope

- Explicit Discovery response-package consumption
- Append-before-regeneration ledger durability and replay handling
- Provenance tags, stable delta anchors, supersession, and target placement
- Paired PRD/Outline replacement, rollback, and same-feature serialization

## Claude Review

Initial result: `NEEDS_CHANGES`

Accepted finding:

1. The first stale-lock recovery design restored a mismatched recovery claim
   with POSIX `rename`. That operation could overwrite a recovery claim created
   by a newer owner. Recovery was redesigned to avoid quarantine/rename
   takeover entirely.

Final behavior:

- The main writeback lock and recovery claim both carry unique `lock_id`
  values.
- A stale main lock is recovered only after exclusive recovery-claim
  acquisition and an identity recheck.
- Cleanup preserves any main or recovery lock whose `lock_id` changed.
- A dead process that left both locks fails closed. An operator must verify no
  writeback is running, remove only the recovery claim, and retry.
- An orphan recovery claim with no old main lock is removed only after a fresh
  main lock has been acquired.

Final recheck: `PASS`

## Gemini Review

Initial result: `NEEDS_CHANGES`

Gemini raised six possible issues. Codex checked each one against the approved
durability, replay, provenance, and recovery contracts. Suggestions that would
weaken append-only history, pending-response retry, or the explicit
fail-closed boundary were rejected. The valid hardening already present in the
current implementation was retained and covered by focused tests.

Final recheck of the current code: `PASS`

## Codex Review

Initial result: `NEEDS_CHANGES`

Accepted corrections and coverage:

1. Consumption now requires exactly one `intent-delta` anchor in the current
   formal PRD; substring presence is insufficient.
2. `supersedes_delta_id` can reference only an earlier event already consumed
   by the current formal PRD, never a ledger-only pending event.
3. Both permitted `exclude` reference forms are validated.
4. Backup cleanup after both formal files are replaced is warning-only and
   cannot trigger destructive rollback.
5. Recovery tests cover active writers, one recovery claimant, dead main plus
   dead recovery fail-closed behavior, manual recovery, orphan cleanup, and
   replacement-owner preservation.

Final result: `PASS`

## Verification

```text
uv run pytest -q \
  tests/test_outline_discovery_writeback.py \
  tests/test_review_launcher.py \
  tests/test_sp_methodology_templates.py
237 passed in 9.38s
```

`node --check` for `apply-outline-discovery.mjs`, Python compilation for the
focused test, and `git diff --check` all exited with status 0.
