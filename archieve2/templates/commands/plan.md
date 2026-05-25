---
description: Organize delivery design outputs and split the feature into worksets.
handoffs:
  - label: Create Tasks
    agent: sp.tasks
    prompt: Bind worksets, deliverables, and acceptance items into an executable documentation task set.
    send: true
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-bundle
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireBundle
agent_scripts:
  sh: scripts/bash/update-agent-context.sh __AGENT__
  ps: scripts/powershell/update-agent-context.ps1 -AgentType __AGENT__
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before planning)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_plan` key.
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

# sp.plan

## Outline

Goal: Organize delivery design outputs and split the active feature into bounded worksets while preserving traceability back to the first-layer business documents.

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

1. Run `{SCRIPT}` from repo root once and parse the returned JSON for current feature routing.
2. Load the smallest useful planning context:
   - `.specify/memory/feature-map.md`
   - `specs/<feature>/memory/index.md`
   - `specs/<feature>/memory/stable-context.md`
   - `specs/<feature>/memory/trace-index.md` when present
   - `specs/<feature>/bundle.md`
   - the constitution rules that constrain delivery design
3. Produce or refresh the delivery design outputs.
   - Define the delivery design objects and workset structure.
   - Keep relationships among flows, screens, data, APIs, permissions, and acceptance explicit.
   - Split the feature into bounded work areas when the scope justifies it.
4. Refresh workset and routing memory.
   - Create or update `specs/<feature>/plan.md`
   - Create or update `specs/<feature>/memory/worksets/index.md`
   - Create or update `specs/<feature>/memory/worksets/ws-*.md`
   - Refresh `specs/<feature>/memory/index.md`
   - Refresh `.specify/memory/feature-map.md` when workset routing changes materially
5. Update agent-facing context if supported by the host.
   - Run `{AGENT_SCRIPT}` when the environment supports agent context refresh.
   - Preserve manual additions and avoid overwriting unrelated context.
6. Validate before finishing.
   - Confirm worksets are bounded and actionable.
   - Confirm major delivery objects and relationships are visible.
   - Confirm routing memory points to the current primary workset.

## Output

- Create or update `specs/<feature>/plan.md`
- Create or update `specs/<feature>/memory/worksets/index.md`
- Create or update `specs/<feature>/memory/worksets/ws-*.md`
- Refresh `specs/<feature>/memory/index.md`
- Refresh `.specify/memory/feature-map.md` when workset routing changes materially

## Key Rules

- Do not write production code or implementation tasks here.
- Do not collapse multiple independent work areas into one vague workset.
- Do not lose traceability back to first-layer sources.
- Keep planning constrained to the active feature and workset area.

## Post-Execution Checks

**Check for extension hooks (after planning)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_plan` key.
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

- Suggest `sp.tasks`.
