---
description: Verify whether the full document system is strong enough for later automation.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before analysis)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_analyze` key.
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

# sp.analyze

## Outline

Goal: Verify whether the active document system is actually strong enough for later automation, not merely complete on paper.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Treat project-level `.specify/memory/*` files as routing hints, not unquestionable truth, until they match feature-level memory and current source documents.
- If project-level routing says no active feature but exactly one `specs/*/memory/index.md` exists, use that feature as the active analysis target.
- If project-level routing conflicts with feature-level memory, `feature-map.md`, or current source docs, mark the project-level routing as stale and continue from the freshest feature-level entry.
- If multiple feature candidates exist, resolve them with `feature-map.md`, explicit user target, branch or environment feature selection, and current stage evidence before asking for clarification.
- Do not report missing feature context until this routing reconciliation step has failed.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.

Execution flow:

1. Run `{SCRIPT}` from repo root once and parse the active feature routing and document availability.
2. Initialize analysis context.
   - Read project-level `.specify/memory/*` routing files first.
   - Reconcile project-level routing against `feature-map.md`, `specs/*/memory/index.md`, and the current workspace before deciding that no active feature exists.
   - Read feature-level `memory/*` routing files next.
   - Read first-layer and second-layer core outputs for the active feature.
3. Perform the analysis pass.
   - Detect whether project-level routing is stale, contradictory, or incomplete before using it as the active-feature decision.
   - When routing is stale but a single feature-level route is clear, continue the analysis on that feature and record the stale project-level memory as a finding to refresh.
   - Check consistency across `spec.md`, `clarifications.md`, `flows/*`, `ui/*`, `gate.md`, `bundle.md`, `plan.md`, `delivery/*`, and `tasks.md`.
   - Verify coverage of IDs, owners, states, screens, APIs, tables, permissions, and acceptance paths.
   - Report conflicts, stale memory, missing links, and weak spots explicitly.
4. Record the result.
   - Create or update `specs/<feature>/analysis.md`.
   - Refresh related `memory/*` entries when findings change routing or stable context.
5. Validate before finishing.
   - Confirm findings are evidence-based and traceable to current documents.
   - Confirm PASS or FAIL is justified explicitly.
   - Confirm the next blocking actions are clear.

## Output

- Create or update `specs/<feature>/analysis.md`
- Refresh related `memory/*` entries when findings change routing or stable context

## Key Rules

- Do not invent missing facts.
- Do not mark PASS when major gaps, stale memory, or missing smoke checks remain.
- Expand to source documents only for the current target area.
- Keep findings evidence-based and routing-aware.

## Post-Execution Checks

**Check for extension hooks (after analysis)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_analyze` key.
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

- If PASS, the document set is ready for later implementation work outside this workflow.
- If FAIL, point to the exact `sp.*` step that must be revisited.
