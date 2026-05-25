# /sp.gate

Use this command when the user wants to decide whether the first-layer business clarification set is stable enough to move forward.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.

## Purpose

- Decide whether the business layer is stable enough to move forward.

## Read First

- Read `.specify/memory/project-index.md`, `specs/<feature>/memory/index.md`, and `specs/<feature>/memory/open-items.md`.
- Read all first-layer outputs for the active feature.

## Do

- Evaluate whether the feature has enough stable scope, flow, UI, and clarification coverage.
- Identify blocking gaps, conflicts, stale memory, and revisit steps.
- Record a clear PASS, FAIL, or conditional result with evidence.
- Refresh project and feature routing memory if gate results change the active focus or risk surface.

## Do Not

- Do not hide blockers behind optimistic language.
- Do not mark PASS when major route decisions remain open.
- Do not drift into second-layer delivery design.

## Output

- Create or update `specs/<feature>/gate.md`
- Refresh `.specify/memory/feature-map.md` when status changes
- Refresh `.specify/memory/active-context.md` when focus changes
- Refresh `specs/<feature>/memory/open-items.md`
- Refresh `specs/<feature>/memory/index.md`

## Check Before Finish

- Confirm the decision is explicit and evidence-based.
- Confirm each blocker points to the exact `sp.*` step that must be revisited.
- Confirm open items are still visible after the gate decision.

## Next

- If PASS, suggest `/sp.bundle`.
- If FAIL, point back to the required earlier step.
