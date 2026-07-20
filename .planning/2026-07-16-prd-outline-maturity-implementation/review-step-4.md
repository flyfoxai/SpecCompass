# Medium Step 4 Review: Compatibility and End-to-End Verification

Date: 2026-07-16

## Scope

- Flow/UI `critical | important | normal` qualification and browser controls
- Level 1/2 Outline Discovery browser workflow and response package
- Level 3 formal Outline confirmation identity and authorization boundary
- Installed-template distribution, compatibility, and full-suite regression

## Browser Acceptance

The installed-template fixture was exercised at desktop and mobile sizes for
both Outline Discovery and formal Outline confirmation. The Discovery path
covered candidate selection, none-of-the-above, direct input, operation
selection, download, reload, and draft-leave protection. The formal path
covered priority controls and digest-bound confirmation-package download.

Downloaded Discovery and confirmation packages were independently validated
against their schemas and identity contracts. The only browser console message
was a non-blocking missing `favicon.ico` request.

Evidence:

- `output/playwright/.playwright-cli/page-2026-07-16T10-04-36-466Z.png`
- `output/playwright/.playwright-cli/page-2026-07-16T10-05-12-729Z.png`
- `.playwright-cli/page-2026-07-16T10-06-34-685Z.png`
- `.playwright-cli/page-2026-07-16T10-07-53-688Z.png`

## Claude Review

Initial result: `NEEDS_CHANGES`

Accepted findings:

1. The Flow, UI, and Outline schemas did not conditionally require both
   `critical_basis` and `priority_reason` for `confirmation_priority: critical`.
2. Outline digest handling differed across schema, CLI, browser validation,
   and confirmation-package construction.

Applied corrections:

- All three formal review schemas now require the two qualification fields for
  every critical node.
- The accepted input contract is a 64-hex SHA-256 digest with an optional
  `sha256:` prefix and case-insensitive hex. Confirmation packages strip the
  prefix and emit canonical lowercase 64-hex output.

Final recheck: `PASS`

## Gemini Review

Result: `FINDINGS_REVIEWED`

Gemini completed a read-only repository review after transient local proxy
retries. Codex checked every finding against the current code and contracts:

1. The claim that Discovery writeback lacks formal Outline fingerprints was
   rejected. Discovery is intentionally non-authorizing and fixed to
   `authorization_effect: none`; `review_data_id`, `outline_digest`, and
   `source_authority_ids` bind the separate formal confirmation generated only
   at `specify_ready`.
2. The digest-regex mismatch was stale. Current browser validation accepts the
   optional prefix and either hex case, while package construction strips the
   prefix and canonicalizes to lowercase.
3. Priority-filter reset during previous/next requirement navigation is the
   documented page-navigation behavior: switching requirements loads a new
   page and a new review artifact rather than preserving transient view state.
4. Legacy schema-v1 normalization to `normal` and unresolved critical draft
   counting were confirmed as intentional compatibility and fail-closed
   behavior.

No Gemini finding required an additional production change.

## Codex Review

Final result: `PASS`

Codex accepted Claude's two contract gaps, rejected the non-reproducible or
contract-conflicting findings above, and found one test-coupling regression
during final verification. The old schema test assumed the must-confirm branch
was always `allOf[0]`; it now locates that branch by its condition, preserving
the Flow/UI option-count assertions without depending on JSON array order.

## Verification

```text
uv run pytest -q \
  tests/test_sp_methodology_templates.py \
  tests/test_review_launcher.py \
  tests/test_outline_discovery_writeback.py \
  tests/test_sp_memory_check.py
321 passed, 22 skipped in 53.84s

uv run pytest -q
1920 passed, 54 skipped in 113.66s
```

`node --check` passed for every JavaScript and MJS file under the installed
review template. `jq empty` passed for all review schemas and JSON examples.
`git diff --check` exited with status 0.
