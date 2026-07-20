# SP Lite Iterative Validation Review Brief

Review `/Users/hula/Projects/speckit-layered` in read-only mode. Do not modify files.

## Existing Direction

SP Lite preserves the normal PRD, Outline Discovery, source traceability, and human confirmation. It selects a limited business-validation slice, produces only the flow/UI detail needed for that slice, and then moves quickly through the existing plan, tasks, and implement artifacts. A proposed `specs/<feature>/lite.md` is the single Lite state contract; a proposed `sp.lite` command owns the Lite lifecycle; existing artifacts remain authoritative rather than creating `lite-plan.md` or `lite-tasks.md`.

## New User Requirements

1. Before building a Lite prototype, the system must present multiple validation directions and let a human choose the direction.
2. Lite is iterative, not one-shot. A later Lite round can add functionality on top of an earlier prototype.
3. A later round can also pursue an Outline branch unrelated to prior Lite rounds.
4. Repeated Lite rounds may eventually complete the entire project, provided all confirmed Outline scope is covered.

## Required Review

Propose a concrete refinement covering:

1. The unit and identity of a Lite round, including immutable history versus mutable current state.
2. How to produce two or three human-selectable validation directions and what the selection gate records.
3. How a new round chooses among extending an earlier round, starting an independent Outline branch, revising a disproved direction, or closing remaining coverage gaps.
4. How dependencies between rounds and artifacts are represented without forcing a linear sequence.
5. A coverage ledger tied to stable PRD/Outline/spec anchors, including states for unplanned, selected, implemented, validated, deferred, changed, invalidated, and superseded scope.
6. Completion criteria for both a Lite round and the whole confirmed Outline. Distinguish implementation coverage, validation evidence, and full-SP readiness.
7. What happens when PRD/Outline changes invalidate earlier rounds.
8. How flow, UI, plan, tasks, and implementation should be regenerated or incrementally updated per round without creating parallel sources of truth.
9. Necessary commands, `lite.md` schema sections, readiness states, gates, tests, and migration behavior.
10. Dangerous shortcuts or ambiguities in the proposed iterative model.

Return a concise but concrete Chinese design review. Prefer repository-compatible mechanisms. Explicitly state which decisions must remain human-controlled.
