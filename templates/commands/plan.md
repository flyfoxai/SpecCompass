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

# /sp.plan

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
- User-facing next-step commands must use `/sp.*` form. Treat `sp-*` as legacy core naming that must not be suggested.
- Manage context as an engineering budget: start from routing, bundle, trace, and open items; expand only to the workset or source documents needed for the current planning decision.

Execution flow:

1. Run `{SCRIPT}` from repo root once and parse the returned JSON for current feature routing.
2. Load the smallest useful planning context:
   - `.specify/memory/feature-map.md`
   - `specs/<feature>/memory/index.md`
   - `specs/<feature>/memory/stable-context.md`
   - `specs/<feature>/memory/open-items.md`
   - `specs/<feature>/memory/trace-index.md` when present
   - `specs/<feature>/bundle.md`
   - the constitution rules that constrain delivery design
3. Produce or refresh the delivery design outputs.
   - Define the delivery design objects and workset structure.
   - Keep relationships among flows, screens, data, APIs, permissions, and acceptance explicit.
   - Split the feature into bounded work areas when the scope justifies it.
   - Assess whether any work area is too large for a stable workset before writing the final plan.
   - Predict direct disturbances for high-impact delivery changes before finalizing worksets:
     - public API/schema, permissions, data migration, core UI fields, events/side effects, external dependencies, critical acceptance, and critical tests
     - for each relevant disturbance, name candidate affected anchors or documents and the verification path that `sp.tasks` or implementation must preserve
     - keep this to direct neighbors; do not turn planning into full-repo impact analysis unless the evidence requires it
   - Treat complexity as needing split/promotion review only when evidence is strong:
     - any hard signal: distinct external system, release cadence, permission/data model, independent migration, irreversible data/security/compliance/rollback risk, or 2+ blocking open items affecting acceptance/release/rollback/security
     - or at least three warning signals: 3+ roles, 4+ user paths, 5+ artifact categories across UI/API/data/permissions/events/migration/external systems, 12+ trace anchors, 8+ core docs needed for one workset, or implementation expected across 8+ major files or 4+ module boundaries
   - Treat near-threshold complexity as an observation band, not an automatic split. Record the candidate split and risk, but wait for stronger evidence or user confirmation before creating sub-features or sub-projects.
   - Recommend the smallest safe promotion level and ask for confirmation before creating sub-features or sub-projects:
     - isolated workset group when the area remains inside the same feature and release target
     - sub-feature when it has an independent user goal, acceptance loop, or task plan
     - sub-project when it has an independent lifecycle, external system, release cadence, permission/data model, or repo-level impact
   - When a complex area is confirmed for promotion, record only the contract required for that level:
     - isolated workset group: goal, boundary, acceptance, writeback path
     - sub-feature: inputs/constraints, outputs, impact scope, invariants, acceptance, writeback path
     - sub-project: full parent-child contract, integration checks, rollback strategy, and human decision points
   - If planning cannot safely close at the current layer after bounded evidence review, fall back upward instead of guessing:
     - bundle or first-layer package is incomplete -> revisit `/sp.bundle`
     - business scope, flow, or UI source is inconsistent -> revisit `/sp.specify`, `/sp.clarify`, `/sp.flow`, or `/sp.ui`
     - product tradeoff or acceptance boundary is missing -> ask for a human macro decision
   - Record the source layer, reason, target layer, exact next `/sp.*` step, and memory/source-doc writeback requirement for every fallback.
4. Refresh workset and routing memory.
   - Create or update `specs/<feature>/plan.md`
   - Create or update `specs/<feature>/memory/worksets/index.md`
   - Create or update `specs/<feature>/memory/worksets/ws-*.md`
   - Refresh `specs/<feature>/memory/index.md`
   - Refresh `.specify/memory/feature-map.md` when workset routing changes materially
5. Update agent-facing context if supported by the host.
   - Use `__CONTEXT_FILE__` as the host-specific context file when it exists.
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
- Do not keep an oversized area inside one workset when it already exceeds the model's stable context window; recommend splitting or promotion with an explicit parent-child contract, then get confirmation before creating sub-features or sub-projects.
- Do not over-split ordinary work. Promote only when complexity blocks stable understanding, verification, or execution.
- Do not promote solely because a document is long or many files exist. Require observable complexity signals and choose the smallest safe level.
- Do not promote just because implementation is technically hard when the scope and contracts are clear. Split tasks or add tests first.
- Do not oscillate around split thresholds. Near-threshold complexity should be recorded as an observation item; confirmed splits should not be auto-merged without a new explicit decision.
- Do not lose traceability back to first-layer sources.
- Keep planning constrained to the active feature and workset area.
- Do not continue splitting delivery tasks when the safe next action is to repair first-layer source documents or ask for a macro decision.

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

- Suggest `/sp.tasks`.
