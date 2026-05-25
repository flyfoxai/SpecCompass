---
description: Establish or refresh the project constitution for the sp workflow.
handoffs:
  - label: Build Specification
    agent: sp.specify
    prompt: Create or refresh the baseline requirement document for the active feature.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before constitution update)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_constitution` key.
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

# sp.constitution

## Outline

Goal: Establish or refresh the project constitution for the layered `sp` workflow, and keep project-level routing memory aligned with the resulting governance.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.

Execution flow:

1. Read the current project context.
   - Read the current README and any existing constitution or team principles.
   - Read the layered workflow rules and command spec if they already exist.
   - Read `.specify/memory/project-index.md` and `.specify/memory/active-context.md` when present.
2. Write or refresh `.specify/memory/constitution.md`.
   - State that this project uses a layered document workflow.
   - Make the documentation-only boundary explicit for the current stage.
   - State that flow assets use Mermaid and UI documentation uses Markdown plus JSON Forms.
   - State that second-layer work starts only after the relevant gate passes.
   - State that the current document workflow stops at `sp.analyze`.
   - Preserve compatibility with upstream Spec Kit mechanism where practical.
3. Refresh project-level routing memory so the constitution and routing agree.
   - Update `.specify/memory/project-index.md`
   - Update `.specify/memory/feature-map.md`
   - Update `.specify/memory/domain-map.md`
   - Update `.specify/memory/active-context.md`
   - Update `.specify/memory/hotspots.md`
4. Validate before finishing.
   - Confirm the constitution clearly defines what is allowed and blocked in this stage.
   - Confirm cross-platform and cross-agent compatibility principles are stated.
   - Confirm routing memory no longer contradicts the constitution.

## Output

- Create or update `.specify/memory/constitution.md`
- Create or update `.specify/memory/project-index.md`
- Create or update `.specify/memory/feature-map.md`
- Create or update `.specify/memory/domain-map.md`
- Create or update `.specify/memory/active-context.md`
- Create or update `.specify/memory/hotspots.md`

## Key Rules

- Do not start writing feature documents here.
- Do not define production code standards here.
- Do not leave stage boundaries ambiguous.

## Post-Execution Checks

**Check for extension hooks (after constitution update)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_constitution` key.
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

- Suggest `sp.specify`.
