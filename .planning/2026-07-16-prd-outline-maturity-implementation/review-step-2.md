# Medium Step 2 Review: Discovery Schemas and Renderer

Date: 2026-07-16

## Scope

- Discovery data, response, and append-only intent-ledger schemas
- Discovery renderer, state recovery, navigation, and download package
- Browser and CLI fail-closed validation
- Launcher routing and Discovery/formal-confirmation type isolation

## Claude Review

Final result: `PASS`

Checked:

- Exactly one recommended candidate for each single-choice question
- Operation-specific response and ledger fields
- Empty `exclude.value` with exactly one candidate or target reference
- Discovery non-authorization and `/sp.prd` return route
- Discovery/formal-confirmation package isolation

## Gemini Review

Final result: `PASS`

The first two attempts were not counted: one used an unavailable tool and one
ended with `INVALID_STREAM` and an empty response. The accepted review received
the relevant files through stdin, made zero tool calls, and returned `PASS`.

## Codex Review

Initial result: `NEEDS_CHANGES`

Accepted findings and corrections:

1. `recommended_candidate_ids` allowed multiple entries despite single-choice
   semantics. Schema, browser validation, CLI validation, and tests now require
   exactly one candidate.
2. The response contract allowed `exclude.value` to be empty while the ledger
   validator required every event value to be non-empty. The ledger schema and
   CLI validator now use operation-specific rules: `exclude` may have an empty
   explanation but must reference exactly one candidate or target; all content
   operations still require a non-empty value.

Final result: `PASS`

## Browser Evidence

- Exercised the installed-template Discovery renderer at desktop and 390px
  mobile widths.
- Verified candidate selection, direct input, response download, CLI response
  validation, feature navigation, and leave warnings for non-empty drafts.
- Evidence is under `output/playwright/outline-discovery-step2-*.png`.

## Verification

```text
uv run pytest -q tests/test_review_launcher.py tests/test_sp_methodology_templates.py
200 passed in 7.41s
```

`git diff --check` also exited with status 0.
