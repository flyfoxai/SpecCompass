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

# sp.clarify

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

Execution flow:

1. Run `{SCRIPT}` from repo root once and parse the routing result.
   - Abort if the active feature spec does not exist and instruct the user to run `sp.specify` first.
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
4. Resolve and record decisions.
   - Record the question, answer, impact, and revisit condition explicitly.
   - Update `spec.md` only where clarification stabilizes the baseline requirement.
   - Keep unresolved items visible instead of forcing closure.
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

## Output

- Create or update `specs/<feature>/clarifications.md`
- Create or update `specs/<feature>/clarify-log.md`
- Update `specs/<feature>/spec.md` only where clarification changes baseline requirements
- Refresh `specs/<feature>/memory/stable-context.md`
- Refresh `specs/<feature>/memory/open-items.md`
- Refresh `specs/<feature>/memory/index.md` when routing changes

## Key Rules

- Do not jump into process diagrams, UI design, or delivery design.
- Do not hide rule conflicts.
- Do not convert weak evidence into fixed decisions.
- Keep the clarification set focused on material downstream impact.

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

- Suggest `sp.flow` or `sp.ui`, depending on what the clarification unlocked.
