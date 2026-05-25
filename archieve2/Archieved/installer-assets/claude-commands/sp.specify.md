# /sp.specify

Use this command when the user wants to create or refresh the baseline requirement document for the active feature.

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

- Create the first baseline requirement document for the active feature.
- Capture what the feature is and why it matters.

## Read First

- Read `.specify/memory/constitution.md`.
- Read `.specify/memory/project-index.md` if it exists.
- Read the user request, related notes, and any existing docs for the active feature.

## Do

- Write `spec.md` for the active feature.
- Capture business objective, target users or roles, in-scope items, out-of-scope items, and success criteria.
- Keep the language requirement-focused and business-focused.
- Separate user goals from solution ideas if both appear in the input.
- Register the active feature in `.specify/memory/feature-map.md`.
- Refresh `.specify/memory/active-context.md` so later agents can route into this feature quickly.
- Initialize feature-level memory entry files if missing.

## Do Not

- Do not write code, architecture, database, API, framework, or deployment design.
- Do not silently convert assumptions into decisions.

## Output

- Create or update `specs/<feature>/spec.md`
- Create or update `.specify/memory/feature-map.md`
- Create or update `.specify/memory/active-context.md`
- Create or update `specs/<feature>/memory/index.md`
- Create or update `specs/<feature>/memory/stable-context.md`
- Create or update `specs/<feature>/memory/open-items.md`

## Check Before Finish

- Confirm the document explains what and why, not production delivery details.
- Confirm scope boundaries and non-goals are visible.
- Confirm unresolved areas are marked instead of guessed.

## Next

- Suggest `/sp.clarify`.
