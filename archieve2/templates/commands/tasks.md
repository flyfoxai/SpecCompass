---
description: Bind worksets, deliverables, and acceptance items into an executable documentation task set.
handoffs:
  - label: Analyze Document Set
    agent: sp.analyze
    prompt: Verify whether the full document system is strong enough for later automation.
    send: true
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-plan
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequirePlan
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before tasks generation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_tasks` key.
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

# sp.tasks

## Outline

Goal: Bind worksets, deliverables, ownership, and acceptance items into an executable documentation task set that remains traceable to the active feature plan.

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

1. Run `{SCRIPT}` from repo root once and parse the active feature routing.
2. Load the smallest useful task-generation context:
   - `specs/<feature>/memory/index.md`
   - `specs/<feature>/memory/worksets/index.md`
   - `specs/<feature>/plan.md`
   - `specs/<feature>/delivery/*`
3. Generate or refresh `specs/<feature>/tasks.md`.
   - Break the delivery plan into explicit documentation tasks tied to worksets and acceptance.
   - Keep task ownership, dependency order, and output targets visible.
   - Keep the task set executable as documentation work, not production implementation.
4. Refresh memory if task grouping changes routing.
   - Refresh `specs/<feature>/memory/worksets/index.md`
   - Refresh `specs/<feature>/memory/worksets/ws-*.md` where needed
   - Refresh `specs/<feature>/memory/index.md`
5. Validate before finishing.
   - Confirm every major task maps back to a workset or delivery artifact.
   - Confirm dependencies and acceptance hooks are explicit.
   - Confirm the active local work area can be discovered from memory.

## Output

- Create or update `specs/<feature>/tasks.md`
- Refresh `specs/<feature>/memory/worksets/index.md`
- Refresh `specs/<feature>/memory/worksets/ws-*.md` where needed
- Refresh `specs/<feature>/memory/index.md`

## Key Rules

- Do not write production code tasks that are disconnected from the document outputs.
- Do not leave dependencies implicit.
- Do not merge unrelated worksets into one task bucket without justification.
- Keep task outputs anchored to documentation artifacts.

## Post-Execution Checks

**Check for extension hooks (after tasks generation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_tasks` key.
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

- Suggest `sp.analyze`.
