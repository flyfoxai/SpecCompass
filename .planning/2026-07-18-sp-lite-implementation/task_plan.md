# SP Lite Implementation

## Goal

Implement `/sp.lite` as a state-aware, globally governed SP coordinator that
offers a human-selected validation direction for each round, advances the
selected scope through existing SP owner commands, resumes safely, and supports
multiple cumulative or independent rounds until the confirmed Outline is
complete.

## Phases

- [x] Restore the approved mechanism and command designs.
- [x] Map command registration, project templates, workflow installation, and test contracts.
- [x] Amend the design with deterministic global-roadmap governance.
- [x] Write and self-review the detailed implementation plan.
- [x] Implement the Lite artifact template and `/sp.lite` command contract with tests.
- [x] Integrate global governance into downstream owner-command contracts with tests.
- [x] Add the Lite workflow and catalog/documentation surfaces with tests.
- [x] Run focused and full verification, review the diff, and document results.
- [x] Add regression tests for final review blockers and repair the evidence contract.
- [ ] Re-run multi-engine review and fresh full/package verification.
- [ ] Commit, merge the feature PR into `main`, and verify CI.
- [ ] Publish `v0.11.0`, merge the release version PR, and verify final repository state.

## Constraints

- Preserve full SP behavior for features without an active Lite round.
- Keep `lite.md` and existing owner artifacts as the durable business authority;
  workflow state is execution state only.
- Require human selection for every new Lite round and preserve all existing
  human confirmation gates.
- Before candidate selection and every automatic dispatch, compare the active
  round against the global Outline, historical rounds, shared dependencies,
  current code baseline, and open decisions.
- Block or reroute duplicate work, contradictory scope, conflicting interfaces,
  stale evidence, and incompatible implementation plans.
- Do not modify `.planning/.active_plan`.
- Preserve unrelated user changes and do not commit without explicit approval.

## Errors

| Error | Attempt | Resolution |
|---|---:|---|
| None | 0 | Not applicable |
| `pytest` not found on shell PATH | 1 | Use `.venv/bin/pytest` for repository tests. |
| Multi-file owner template patch used a shared trailing heading that differed in `gate.md` | 1 | Reapplied with each file's unique user-input sentence as the insertion anchor. |
| Methodology regression found `lite.md` missing the ordinary-command `## Next` closeout contract | 1 | Traced the glob-based test and added the standard option/recommendation/final-copy-box contract to Lite. |
| Final Codex review found four High evidence/governance bypasses | 1 | Reopened implementation; add failing tests before synchronizing Bash, PowerShell, command, artifact, and specs. |
| Review agent accidentally edited two working-tree files | 1 | Confirmed provenance with the agent and restored only those files to their staged baseline. |
| Focused contract rerun found two phrases split across Markdown/PowerShell argument construction | 1 | Kept the required phrases contiguous and made the NUL-safe Git argument string drive the PowerShell process invocation. |
| Lease contract phrase was split by Markdown wrapping | 1 | Kept `acquire the orchestration lease` contiguous and verified the targeted regression. |
