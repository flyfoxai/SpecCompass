---
description: Create or refresh the baseline requirement document for the active feature.
handoffs:
  - label: Resolve Business Clarifications
    agent: sp.clarify
    prompt: Resolve high-impact business clarifications for the active feature.
    send: true
  - label: Build Delivery Plan
    agent: sp.plan
    prompt: Organize delivery design outputs and worksets for the active feature.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json
  ps: scripts/powershell/check-prerequisites.ps1 -Json
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before specification)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_specify` key.
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

# sp.specify

## Outline

Goal: Create or refresh the baseline requirement document for the active feature while preserving the layered `sp` workflow boundary between business requirements and later delivery design.

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

1. Run `{SCRIPT}` from repo root once and parse the returned JSON for current routing context.
   - Reconcile the script result with `.specify/memory/project-index.md`, `.specify/memory/active-context.md`, and existing `specs/*/memory/index.md` entries before deciding whether the feature already exists.
   - If project-level routing says there is no active feature but a single feature-level route is clearly active, treat the project memory as stale, continue with the freshest feature route, and record the stale routing for refresh.
   - If the user is clearly creating a new feature, create a new `specs/<feature>/` directory and initialize feature memory entry files.
2. Read only the smallest useful context set:
   - `.specify/memory/constitution.md`
   - `.specify/memory/project-index.md` when present
   - `.specify/memory/feature-map.md` and `.specify/memory/active-context.md` when present
   - `specs/<feature>/memory/index.md` when present
   - the user request, active notes, and any existing feature docs relevant to this feature
3. Produce or refresh `specs/<feature>/spec.md`.
   - Capture business objective, target roles, in-scope items, out-of-scope items, success criteria, and any stable assumptions that must remain visible.
   - Keep the document requirement-focused and business-focused.
   - Separate user goals from solution ideas when both appear in the input.
   - Mark unresolved items explicitly instead of guessing.
4. Refresh routing and memory artifacts to keep later commands discoverable.
   - Update `.specify/memory/feature-map.md`
   - Update `.specify/memory/active-context.md`
   - Create or update `specs/<feature>/memory/index.md`
   - Create or update `specs/<feature>/memory/stable-context.md`
   - Create or update `specs/<feature>/memory/open-items.md`
5. Validate before finishing.
   - Confirm the document explains what and why, not production delivery details.
   - Confirm scope boundaries and non-goals are visible.
   - Confirm unresolved areas remain marked instead of being silently converted into decisions.

## Output

- Create or update `specs/<feature>/spec.md`
- Create or update `.specify/memory/feature-map.md`
- Create or update `.specify/memory/active-context.md`
- Create or update `specs/<feature>/memory/index.md`
- Create or update `specs/<feature>/memory/stable-context.md`
- Create or update `specs/<feature>/memory/open-items.md`

## Key Rules

- Do not write code, architecture, database, API, framework, or deployment design.
- Do not silently convert assumptions into fixed decisions.
- Expand into source documents only for the current target area.
- Prefer the freshest feature-level memory when project-level routing is stale.

## Post-Execution Checks

**Check for extension hooks (after specification)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_specify` key.
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

- Suggest `sp.clarify`.
