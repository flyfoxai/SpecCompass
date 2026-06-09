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

# /sp.specify

## Outline

Goal: Create or refresh the baseline requirement document for the active feature while preserving the layered `sp` workflow boundary between business requirements and later delivery design.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- Treat `/sp.specify` as the stable requirement intake and baseline specification point. `/sp.prd` may exist as an optional upstream discovery step for unclear 0-to-1 needs, but `prd.md` is only an upstream draft; do not treat it as stable fact unless confirmed content is carried into `spec.md`.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Use stable searchable coordinates for important anchors when they first become clear; do not invent coordinates for unclear objects.
- Put real unresolved questions, todos, risks, blockers, rollback advice, and close conditions in `memory/open-items.md`.
- Do not stabilize `[src:ai-proposed]`, `[uncertain:assumed]`, or `[uncertain:proposed]` PRD material into `spec.md` without explicit user confirmation. Keep it as candidate/open item or route to `/sp.clarify`.

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
   - `specs/<feature>/prd.md` when it exists and the current work needs upstream intent, candidate requirements, rejected ideas, open questions, or Handoff To Specify
   - the user request, active notes, and any existing feature docs relevant to this feature
3. Produce or refresh `specs/<feature>/spec.md`.
   - Remove the `SP_STAGE_SEED: spec` marker once the file contains real feature-specific requirements.
   - Capture business objective, target roles, in-scope items, out-of-scope items, success criteria, and any stable assumptions that must remain visible.
   - Keep the document requirement-focused and business-focused.
   - Separate user goals from solution ideas when both appear in the input.
   - When using `prd.md`, carry only `[src:user]`, `[src:user-confirmed]`, or otherwise explicitly confirmed material into stable requirements. Do not treat `[src:ai-proposed]`, `[uncertain:assumed]`, or `[uncertain:proposed]` as stable facts.
   - Check requirement conflicts before stabilizing text:
     - conflicting user intent
     - contradictory acceptance criteria
     - scope expansion that changes the current feature boundary
     - a new independent business goal, role, workflow, or acceptance boundary
   - If the conflict is unclear user intent, record it in `specs/<feature>/memory/open-items.md`, return `NEEDS_DECISION` when it blocks safe continuation, and suggest `/sp.clarify`.
   - If the input is clearly a new independent feature, do not absorb it into the current feature. Create or route a new feature through `/sp.specify`, or ask the user to choose between expanding the current feature and creating a new one.
   - When asking the user, use plain language: explain the background, future impact, 2-4 options, tradeoffs, recommendation, and next `/sp.*` route.
   - Mark unresolved items explicitly instead of guessing.
4. Refresh routing and memory artifacts to keep later commands discoverable.
   - Update `.specify/memory/feature-map.md`
   - Update `.specify/memory/active-context.md`
   - Create or update `specs/<feature>/memory/index.md`
   - Create or update `specs/<feature>/memory/stable-context.md`
   - Create or update `specs/<feature>/memory/open-items.md`
   - Initialize trace and workset memory only with evidence-backed anchors. Empty tables are valid when no stable anchors exist yet.
5. Validate before finishing.
   - Confirm the document explains what and why, not production delivery details.
   - Confirm scope boundaries and non-goals are visible.
   - Confirm unresolved areas remain marked instead of being silently converted into decisions.
   - Confirm any non-trivial unresolved item has owner or revisit condition, impact, affected docs or anchor, and close condition.
   - Confirm no unconfirmed `[src:ai-proposed]`, `[uncertain:assumed]`, or `[uncertain:proposed]` PRD material entered `spec.md` as stable requirement text.

## Output

- Create or update `specs/<feature>/spec.md`
- Create or update `.specify/memory/feature-map.md`
- Create or update `.specify/memory/active-context.md`
- Create or update `specs/<feature>/memory/index.md`
- Create or update `specs/<feature>/memory/stable-context.md`
- Create or update `specs/<feature>/memory/open-items.md`

## Key Rules

- Do not write code, architecture, database, API, framework, or deployment design.
- Do not leave `SP_STAGE_SEED: spec` in a completed `spec.md`; that marker means the file is still an initialization scaffold.
- Do not silently convert assumptions into fixed decisions.
- Do not promote AI-proposed PRD material into stable specification text without user confirmation.
- Do not merge incompatible requirements to make the spec look complete.
- Do not let `/sp.clarify` become the hidden entry point for new features. New feature intake belongs in `/sp.specify`; `/sp.clarify` only resolves ambiguity or records the decision to route back.
- Expand into source documents only for the current target area.
- Prefer the freshest feature-level memory when project-level routing is stale.
- Do not create placeholder risks or fake open items. `memory/open-items.md` may stay empty until evidence exists.
- If feature creation cannot be resolved from user input, script output, or existing routing, stop and ask for the macro decision instead of guessing a feature name.

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

- Suggest `/sp.clarify`.
