---
description: Resolve high-impact business clarification questions for the active feature.
handoffs:
  - label: Build Delivery Plan
    agent: sp.plan
    prompt: Organize delivery design outputs and worksets for the active feature.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-spec
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before clarification)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_clarify` key.
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null or empty, treat the hook as executable.
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the host hook executor.
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```text
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```text
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the Outline.
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

# /sp.clarify

## Outline

Goal: Resolve high-impact business clarification questions for the active feature and encode the resulting decisions back into the documentation set without drifting into delivery design.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Do not ask the user for locally verifiable facts before checking the bounded source set.
- Record durable unresolved items in `memory/open-items.md`; do not bury them only in narrative clarification text.

Execution flow:

1. Run `{SCRIPT}` from repo root once and parse the routing result.
   - Abort if the active feature spec does not exist and instruct the user to run `/sp.specify` first.
2. Read the smallest useful context set:
   - `specs/<feature>/memory/index.md`
   - `specs/<feature>/memory/open-items.md`
   - `specs/<feature>/spec.md`
   - `specs/<feature>/clarifications.md` and `specs/<feature>/clarify-log.md` when present
   - the current source area only if the issue comes from `flows/*` or `ui/*`
3. Build a prioritized clarification queue.
   - Classify each item as `CF-SPEC`, `CF-FLOW`, or `CF-UI`.
   - Ask route-level questions before local detail questions.
   - Treat route-changing questions as immediate.
   - Batch only low-risk local questions when doing so does not hide material ambiguity.
   - Separate macro decisions that require the user from local gaps that can be resolved by reading existing docs.
   - For risk acceptance, requirement conflict, disputed split, verification downgrade, rollback choice, compliance/data choice, or other macro decisions, generate a structured decision package instead of making the decision yourself.
   - A decision package must include: background, confirmed evidence, impact, 2-4 options, tradeoffs for each option, recommendation, and the next `/sp.*` route.
   - The model recommendation is not the formal decision. Wait for the user to choose an option or provide a revised option before recording a stable decision.
   - If clarification reveals a new independent business goal, role, workflow, acceptance boundary, or release scope, return `NEW_FEATURE_DETECTED` instead of silently expanding the current feature.
   - For `NEW_FEATURE_DETECTED`, explain the background, impact, 2-4 options, recommendation, and next `/sp.specify` route. Ask the user to choose whether to create a new feature or deliberately expand the current one.
4. Resolve and record decisions.
   - Remove the `SP_STAGE_SEED: clarifications` marker once `clarifications.md` contains real feature-specific decisions, questions, or explicitly unresolved items.
   - Distinguish `Decision Package` from `Decision Record`: the package is the model-generated options and recommendation awaiting human choice; the record is the human-selected choice captured after the user answers.
   - Record the question, user-selected answer, impact, affected documents or memory, close condition, and revisit condition explicitly.
   - If the user changes the proposed option, record the user's revised choice rather than rewriting it as the original recommendation.
   - After the user chooses, write the selected decision back to the source doc, affected task, or `memory/open-items.md` named by the decision package. The `NEEDS_DECISION` freeze for the same `Blocker ID` is lifted only after this writeback is complete.
   - If writeback cannot be completed, keep the blocker open in `memory/open-items.md` with written targets, missing targets, reason, close condition, and next route. A recommendation or chat answer alone is not enough to resume downstream work.
   - Update `Stage Readiness` only after the human-selected `Decision Record` is written back to every required source doc, affected task, or memory target.
   - If the decision resolves flow-blocking ambiguity and all remaining requirement evidence is stable, set or preserve `READY_FOR_FLOW`; otherwise keep `NEEDS_CLARIFY`, `NEEDS_DECISION`, `BLOCKED`, or `DRAFT_ONLY` with the exact next owner route.
   - A model recommendation, unselected option, or answer that has not been written back must not unlock `READY_FOR_FLOW`, `READY_FOR_UI`, `READY_FOR_PLAN`, gate PASS, stable trace, or implementation readiness.
   - If the clarified area still depends on `Source: model-inferred`, `[INFER:DRAFT]`, `[src:ai-proposed]`, or other unconfirmed candidate material, keep the affected readiness as `DRAFT_ONLY`, `NEEDS_CLARIFY`, or `NEEDS_DECISION` instead of promoting it.
   - Update `spec.md` only where clarification stabilizes the baseline requirement.
   - Keep unresolved items visible instead of forcing closure.
   - For unresolved high-impact items, update `memory/open-items.md` with owner or revisit step, impact area, affected docs or trace anchor, and close condition.
   - If no human choice is available, do not convert the recommendation into a decision; keep the item unresolved in `memory/open-items.md`, return `NEEDS_DECISION`, and include `SP_EXIT_CODE: 1` in headless or non-interactive output.
5. Refresh memory and routing where necessary.
   - Update `specs/<feature>/clarifications.md`
   - Update `specs/<feature>/clarify-log.md`
   - Refresh `specs/<feature>/memory/stable-context.md`
   - Refresh `specs/<feature>/memory/open-items.md`
   - Refresh `specs/<feature>/memory/index.md` when routing changes
6. Validate before finishing.
   - Confirm every conclusion is traceable to a question and answer.
   - Confirm unresolved items remain visible.
   - Confirm downstream files that depend on the clarification are named explicitly.
   - Confirm no unresolved business decision was silently converted into a stable assumption.
   - Confirm every resolved `NEEDS_DECISION` item has a human-selected decision record and completed writeback to the source doc, task, or `memory/open-items.md`.
   - Confirm `Stage Readiness` was updated only when the human-selected decision record and writeback are complete; otherwise keep `NEEDS_DECISION` and route to `/sp.clarify`.

## Output

- Create or update `specs/<feature>/clarifications.md`
- Create or update `specs/<feature>/clarify-log.md`
- Update `specs/<feature>/spec.md` only where clarification changes baseline requirements
- Refresh `specs/<feature>/memory/stable-context.md`
- Refresh `specs/<feature>/memory/open-items.md`
- Refresh `specs/<feature>/memory/index.md` when routing changes

## Key Rules

- Do not jump into process diagrams, UI design, or delivery design.
- Do not leave `SP_STAGE_SEED: clarifications` in a completed clarification file; that marker means the file is still an initialization scaffold.
- Do not hide rule conflicts.
- Do not silently expand feature scope while resolving ambiguity.
- If a clarification answer is actually a new feature request, stop absorbing it, record `NEW_FEATURE_DETECTED`, and route back to `/sp.specify`.
- Do not convert weak evidence into fixed decisions.
- Do not convert a model recommendation into a final decision. Human choice is required before a decision can be recorded as stable.
- Do not lift `NEEDS_DECISION` for a blocker until the human-selected decision is written back to the relevant source doc, task, or `memory/open-items.md`.
- Do not promote downstream readiness from `/sp.clarify` unless the selected decision is written back and the target readiness criteria are explicitly satisfied.
- Keep the clarification set focused on material downstream impact.
- If two evidence-based clarification attempts cannot close the issue, fall back upward to `/sp.specify` or the relevant user macro decision instead of continuing to guess.

## Post-Execution Checks

**Check for extension hooks (after clarification)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_clarify` key.
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null or empty, treat the hook as executable.
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the host hook executor.
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```text
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```text
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Next

- Suggest `/sp.flow` or `/sp.ui`, depending on what the clarification unlocked.
