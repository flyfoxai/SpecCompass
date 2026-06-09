---
description: Shape an optional upstream PRD draft before stable feature specification.
handoffs:
  - label: Stabilize Feature Spec
    agent: sp.specify
    prompt: Convert confirmed PRD intent into the stable feature specification.
  - label: Resolve Product Decisions
    agent: sp.clarify
    prompt: Resolve high-impact product or scope decisions discovered during PRD work.
  - label: Review Governance Candidates
    agent: sp.constitution
    prompt: Review governance candidates discovered during PRD work.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before PRD discovery)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_prd` key.
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

# /sp.prd

## Outline

Goal: Create or refresh an optional upstream PRD draft for unclear 0-to-1 product ideas, while keeping `/sp.specify` as the stable requirement intake and baseline specification point.

Global rules:
- Stay within product discovery and documentation work only.
- `/sp.prd` is optional upstream discovery, not a required stage.
- `prd.md` is not a stable fact source. It may inform `/sp.specify`, but confirmed requirements become stable only after they are carried into `spec.md`.
- Use top-down requirement growth: strategic goal, product positioning, business goals, target users, capability map, problem domains, core scenarios, main flows, key branches, acceptance seeds, risks and open items, then local details.
- Use source tags on material content: `[src:user]`, `[src:doc]`, `[src:ai-proposed]`, `[src:user-confirmed]`.
- Use uncertainty tags when needed: `[uncertain:tbd]`, `[uncertain:assumed]`, `[uncertain:proposed]`.
- Do not write code, API routes, database schemas, framework choices, file paths, test commands, or implementation tasks.
- Do not convert `[src:ai-proposed]` ideas into confirmed requirements without user confirmation.
- If a decision is needed, generate a plain-language decision package with background, confirmed evidence, impact, 2-4 options, tradeoffs, recommendation, and next `/sp.*` route.
- In headless or non-interactive runs, do not guess unclear product direction, feature boundary, human risk acceptance, or governance tradeoffs. Return `SP_STATUS: NEEDS_DECISION`, include the decision package, end with `SP_EXIT_CODE: 1`, and stop.
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.

Execution flow:

1. Locate the intended feature area.
   - If `.specify/memory/project-index.md` exists, read it first for project routing.
   - If `.specify/memory/active-context.md` exists, use it to avoid reading unrelated project content.
   - If the target feature already exists, use `specs/<feature>/prd.md` as the PRD draft location.
   - If no feature directory exists but the user intent is clear enough to name a feature, create `specs/<feature>/` and initialize `prd.md`.
   - If even the feature boundary is unclear, ask for the macro product direction or feature boundary before writing a PRD draft.
   - In headless or non-interactive mode, do not create a guessed feature directory from unclear intent. Output a decision package with `SP_STATUS: NEEDS_DECISION`, end with `SP_EXIT_CODE: 1`, and stop.
2. Collect information through a human-friendly PRD interview structure.
   - Strategic goal: what larger product or business outcome is being pursued.
   - Product positioning: what this product or capability is, and what it is not.
   - Business goals: measurable outcomes or operational improvements.
   - Target users and roles: who uses it, who approves it, who is affected.
   - Problem domains: what problems must be solved to satisfy the goals.
   - Core scenarios: where and when the product is used.
   - Capability map: candidate capabilities grouped under business goals.
   - Main flows and key branches: business flow seeds, not final flow specs.
   - Scope and non-goals: MVP boundary, excluded ideas, and why.
   - Acceptance seeds: early success checks that `/sp.specify` can stabilize later.
   - Risks and open questions: safety, data, compliance, cost, rollback, or delivery uncertainty.
3. Use model capability to grow requirements safely.
   - Summarize the user's language before expanding it.
   - Propose candidate capabilities, branches, non-goals, acceptance seeds, and risks only as `[src:ai-proposed]`.
   - Compare candidates by user value, risk, cost, dependency, reversibility, and scope impact.
   - Keep rejected ideas and reasons visible so later agents do not propose them again.
   - Keep local details under their parent goal, scenario, flow, UI seed, or acceptance seed.
   - If a local detail has no parent, place it under `Open Questions`, `Candidate Requirements`, or `UI Surface Seeds`.
4. Create or refresh `specs/<feature>/prd.md`.
   - Recommended sections:
     - `Strategic Goal`
     - `Product Positioning`
     - `Business Goals`
     - `Target Users and Roles`
     - `Problem Domains`
     - `Capability Map`
     - `Core Scenarios`
     - `Main Flow Seeds`
     - `Key Branch Seeds`
     - `Scope and Non-Goals`
     - `Acceptance Seeds`
     - `Candidate Requirements`
     - `Rejected Ideas`
     - `UI Surface Seeds`
     - `Data and Policy Seeds`
     - `Risks and Open Questions`
     - `Constitution Candidates`
     - `Handoff To Specify`
   - The detail boundary is: enough for `/sp.specify` to create a stable spec, not enough to skip `/sp.specify`, `/sp.flow`, `/sp.ui`, `/sp.plan`, or `/sp.tasks`.
   - The handoff result is `ready for /sp.specify`, never `ready for implementation`.
5. Handle constitution-related findings without mixing command ownership.
   - Governance-like material belongs in `.specify/memory/constitution.md` as a `Constitution Candidate` when it may apply across features or affects safety, compliance, irreversible operations, real money, real data, long-term engineering discipline, verification gates, or human decision rules.
   - `/sp.prd` may only append or update the `Constitution Candidates` section.
   - It must not rewrite formal constitution rules, stage boundaries, validation discipline, or project governance text.
   - Candidate status values are fixed: `proposed`, `under-review`, `promoted`, `rejected`, `merged`.
   - Candidates do not override formal constitution rules.
   - Single-feature local risks, todos, and requirement tradeoffs belong in `prd.md`, feature memory, or `open-items.md`, not the constitution candidate section.
6. Refresh lightweight memory only when it prevents later rediscovery.
   - Create or update `specs/<feature>/memory/open-items.md` for unresolved high-impact questions, risks, blockers, or decisions.
   - Do not duplicate the full PRD into memory.
   - Record only routing summaries, open decisions, and stable handoff pointers.
7. Validate before finishing.
   - Confirm the PRD remains upstream draft material.
   - Confirm all AI-proposed material is labeled.
   - Confirm confirmed user choices are distinguishable from candidates.
   - Confirm no implementation details were introduced.
   - Confirm unresolved product boundary or scope fork questions were not turned into guessed features.
   - Confirm `Handoff To Specify` names what `/sp.specify` should stabilize and what still needs `/sp.clarify`.

## Output

- Create or update `specs/<feature>/prd.md`
- Optionally append or update `.specify/memory/constitution.md` `Constitution Candidates`
- Optionally update `specs/<feature>/memory/open-items.md` for high-impact unresolved items
- Optionally update `specs/<feature>/memory/index.md` only for routing to the PRD draft

## Key Rules

- `prd.md` is only an upstream draft and not a stable fact source.
- Do not make `/sp.prd` mandatory for clear requirements.
- Do not let PRD detail grow into implementation design.
- Do not promote `[src:ai-proposed]` content without user confirmation.
- Do not bypass `/sp.specify`. Stable requirements still belong in `spec.md`.
- Do not rewrite formal constitution content from `/sp.prd`; use `Constitution Candidates` only.
- If PRD discovery finds a new independent business goal, role, workflow, acceptance boundary, release scope, or scope fork, route to `/sp.specify` with a plain-language decision package.
- If PRD discovery finds unclear product intent, risk acceptance, governance tradeoff, or another high-impact human choice, route to `/sp.clarify` with a plain-language decision package.

## Next

- If enough intent is confirmed, suggest `/sp.specify`.
- If major user choices remain unresolved, suggest `/sp.clarify`.
- If governance candidates were collected, suggest `/sp.constitution`.
