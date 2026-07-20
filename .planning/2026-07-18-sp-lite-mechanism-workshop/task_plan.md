# SP Lite Mechanism Workshop

## Goal

Design an opt-in SP Lite mechanism that preserves PRD and outline quality, selects the smallest business-validation slice, minimizes flow/UI work, and accelerates plan, tasks, and implementation without weakening traceability or confusing Lite validation with full delivery readiness.

## Phases

- [x] Inspect the current PRD, outline, flow, UI, plan, tasks, workflow, and preset mechanisms.
- [x] Collect independent Claude and Gemini proposals from the same repository-grounded brief.
- [x] Produce the Codex review, compare alternatives, and recommend one design.
- [x] Present the design for user review before any implementation work.
- [x] Collect second-round Claude and Gemini reviews for human-selected, iterative Lite rounds.
- [x] Synthesize the iterative coverage and branching design.
- [x] Write and self-review the formal Chinese design document.
- [x] Inspect workflow resume, gate, switch, loop, and command-dispatch semantics for `/sp.lite` orchestration.
- [x] Define the `/sp.lite` command state machine, owner-command sequence, human gates, retry rules, and resume contract.
- [x] Write and self-review the formal `/sp.lite` command design document.

## Constraints

- Keep full SP behavior unchanged by default.
- Treat Lite as feature-level opt-in, with an optional project default, unless the user chooses otherwise.
- Preserve current PRD outline discovery and confirmation authority.
- Do not claim full flow/UI completeness from a deliberately partial validation slice.
- Do not modify product code or maintained documentation before design approval.

## Errors

- Initial reads used file-style paths for workflow step modules, but the
  implementation uses package `__init__.py` files. Re-read the correct paths;
  no design evidence was lost.
