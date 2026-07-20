# PRD Prompt Live Test

## Goal

Execute the current `/sp.prd` Level 1 contract against the supplied A-share QMT case, identify reproducible generation failures, and implement the scoped prompt/schema/validator fixes that prevent mixed-responsibility candidates.

## Scope

- Test the current working-tree prompt, not a released or installed older template.
- Compare Claude, Gemini, and Codex semantic results where the local CLIs return usable output.
- Separate prompt-quality defects, deterministic-validation gaps, renderer visibility, and stale-template deployment.
- Modify only the PRD contract, outline-discovery schema/validators, and focused regression tests needed to enforce business ownership.

## Phases

| Phase | Status | Evidence |
|---|---|---|
| 1. Capture current contract and test fixture | complete | Current `prd.md` Level 1 rules and QMT input recorded in the live prompt |
| 2. Execute model calls | complete | Claude produced six focused candidates; Gemini produced four candidates and merged normal fact capture with interruption recovery |
| 3. Apply semantic gate | complete | Root cause isolated: project-to-chain cardinality can be satisfied after the model first defines an impure multi-outcome chain |
| 4. Add failing chain-purity regressions | complete | All three fixtures were accepted by the old validator and failed their assertions, proving the gaps |
| 5. Implement chain-purity contract | complete | Prompt, schema, CLI validator, and browser validator require explicit chain ownership and one primary result |
| 6. Add atom-first one-to-one regressions | complete | Eight focused assertions failed because the old validator accepted one-chain/multi-atom, atom/chain mismatch, orphan chain, cross-project candidate, and missing prompt-contract cases |
| 7. Implement atom-first generation and validation | complete | Prompt, schema, CLI validator, browser validator, and maintained docs prohibit automatic Level 1 merging |
| 8. Re-run model and repository verification | complete | Claude and Gemini each produced six atom/chain/project triples; 195 methodology tests and 44 Codex integration tests pass; validator syntax, schema JSON, and diff checks pass |
| 9. Align release metadata and concise READMEs | complete | Release policy test failed on both stale SP Lite assertions, then passed 6/6 after workflow metadata changed; both README capability lines remain concise and aligned |
| 10. Run final verification and multi-model review | complete | `uv run pytest`: 2039 passed, 58 skipped; Node syntax, schema JSON, and diff checks passed; Gemini found no Critical/High issue; Codex rejected Claude's two validator findings after line-by-line parity verification |
| 11. Commit, push, merge, and publish v0.11.2 | complete | PR #16 and release PR #17 merged; all release-PR checks passed; v0.11.2 is published and `main` now carries `0.11.3.dev0`. The current tag-based release workflow intentionally creates no attached assets, matching the repository's recent release history. |

## Errors

| Error | Attempt | Resolution |
|---|---:|---|
| Full prompt was interpolated inside a shell double-quoted argument, so Markdown backticks triggered zsh command substitution before either model ran | 1 | Encode the prompt before shell transport and decode it into one quoted argument |
| First live-test notes incorrectly recorded Claude as refusing the prompt | 1 | Corrected after the safely transported full prompt returned six usable Claude candidates |
| Active-plan ID was initially treated as a complete directory path during session recovery | 1 | Resolve it as `.planning/<active-plan-id>/` before reading or updating plan files |
| `pytest` was not available on the shell PATH during focused verification | 1 | Use the repository virtual environment through `uv run pytest` |
| The full command template begins with YAML `---`, so both local CLIs parsed the prompt value as another option and exited before model invocation | 1 | Prefix the transported prompt with a plain sentence while leaving the contract and fixture bytes otherwise unchanged |
| The planning skill's `check-complete.sh` only recognises heading-style phases and reported `0/0` for this table-style plan | 1 | Verify the phase-status column directly; all eight rows are `complete` and none are `in_progress` or `pending` |
| Gemini's first repository-reading review repeatedly requested unavailable internal shell/agent tools | 1 | Pipe the complete scoped diff to Gemini stdin and prohibit tool calls; the clean review returned `NO_CRITICAL_HIGH_FINDINGS` |
| Claude reported browser-validator parity gaps using incorrect code locations | 1 | Codex inspected the active runtime validator and confirmed chain-kind pairing at lines 240-266 and atom-to-chain semantic equality at lines 268-294 already enforce both claims |
