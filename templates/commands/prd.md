---
description: Shape the mandatory upstream PRD intake before stable feature specification.
handoffs:
  - label: Stabilize Feature Spec
    agent: sp.specify
    prompt: Convert confirmed PRD intent into the stable feature specification.
    send: true
  - label: Resolve Product Decisions
    agent: sp.clarify
    prompt: Resolve high-impact product or scope decisions discovered during PRD work.
    send: true
  - label: Review Governance Candidates
    agent: sp.constitution
    prompt: Review governance candidates discovered during PRD work.
    send: true
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

Goal: Create or refresh the mandatory upstream PRD intake for every new feature, capability direction, or important requirement change, while keeping `/sp.specify` as the stable requirement intake and baseline specification point.

Global rules:
- Stay within product discovery and documentation work only.
- `/sp.prd` is the mandatory upstream requirement intake. Simple requests may use a short PRD, but new feature work must not skip this stage.
- `prd.md` is not a stable fact source. It informs `/sp.specify`, but confirmed requirements become stable only after they are carried into `spec.md`.
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
4. Choose the PRD depth before writing.
   - Lean PRD: use this when the user already provides a clear goal, target users, scope, and basic acceptance intent. Keep the PRD short, but still include: `Strategic Goal`, `Target Users and Roles`, `Core Scenarios`, `Scope and Non-Goals`, `Acceptance Seeds`, `Risks and Open Questions`, and `Handoff To Specify`.
   - Full PRD: use this for 0-to-1 ideas, unclear scope, multiple capability directions, governance implications, high-risk domains, or conflicting source material. Use the full section set below.
   - When unsure, prefer a lean PRD plus explicit open items instead of expanding into speculative detail.
   - Lean PRD still needs enough substance to stand on its own. At minimum it must contain one clear strategic goal, at least one target user or role, at least one bounded core scenario, explicit scope/non-goals, acceptance seeds, and at least one open question or risk when anything material is still uncertain. If those anchors are missing, treat the intake as `NEEDS_PRD` or `NEEDS_CLARIFY` instead of pretending the PRD is already sufficient.
5. Create or refresh `specs/<feature>/prd.md`.
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
6. Create or refresh `specs/<feature>/spec-outline.md` readiness.
   - The outline is a lightweight bridge from PRD to `/sp.specify`; it must not become flow, UI, API, database, plan, tasks, or implementation design.
   - Always read the existing `specs/<feature>/spec-outline.md` first if it exists, then refresh its status from the current `prd.md` instead of preserving stale readiness.
   - Include only the minimal structure needed for `/sp.specify`: feature name, PRD source, `Source Authority Summary`, strategic goal, target users/roles, problem domains, capability slices, scope/non-goals, core scenarios, acceptance seed groups, risk/open-item summary, and recommended first slice.
   - `Source Authority Summary` must list stable sources, candidate-only sources, archived or missing sources, source rebase decisions, and what `/sp.specify` may safely consume. Keep it lightweight; do not copy the full PRD or build a heavy source map.
   - Mark every section with source status: `[src:user]`, `[src:doc]`, `[src:user-confirmed]`, `[src:ai-proposed]`, or unresolved.
   - If the PRD has a clear strategic goal, users, scope, capability map, and source authority, automatically create or refresh `specs/<feature>/spec-outline.md`.
   - If the PRD still has key `[src:ai-proposed]`, `[uncertain:*]`, scope conflict, missing source authority, or unclear feature boundary, do not create a stable outline. Add an `Outline Decision` section at the end of `prd.md` that explains the blocker and names the next route: `/sp.clarify`, another `/sp.prd` pass, source recovery, or feature split. If the feature directory is clear, also create or refresh a blocking `spec-outline.md` with the same `Outline Decision` so `/sp.specify`, mechanical checks, and later agents read the current blocker from one predictable entry point.
   - If information is insufficient but the feature directory is clear, you may create a blocking `spec-outline.md`; its status must be only `NEEDS_PRD`, `NEEDS_CLARIFY`, `NEEDS_SOURCE`, `SPLIT_REQUIRED`, `NEEDS_DECISION`, or `BLOCKED`, never `READY_FOR_SPECIFY`.
   - Set one readiness status:
     - `READY_FOR_SPECIFY`: enough confirmed or source-backed intent exists for `/sp.specify`.
     - `NEEDS_PRD`: more human product intent is needed before a useful outline can exist.
     - `NEEDS_CLARIFY`: a focused human decision blocks stable specification.
     - `NEEDS_SOURCE`: required source authority is missing or stale.
     - `SPLIT_REQUIRED`: the PRD contains multiple independent feature directions that should be separated before specification.
     - `NEEDS_DECISION`: a human product, risk, source-rebase, split, or acceptance choice blocks stable specification.
     - `BLOCKED`: safe automatic progress is not possible.
   - Do not use `[src:ai-proposed]` as the decisive reason for `READY_FOR_SPECIFY`; unresolved high-impact source, scope, risk, or acceptance gaps must route to a non-ready status.
   - `/sp.outline` or PRD-embedded outline logic must not replace `/sp.specify`; it only decides whether `/sp.specify` may start.
   - Status transitions must be evidence-based:
     - `NEEDS_PRD` -> `READY_FOR_SPECIFY` only when the PRD now contains enough confirmed strategic goal, user, scope, scenario, and acceptance intent.
     - `NEEDS_CLARIFY` -> `READY_FOR_SPECIFY` only when the blocking human decision is recorded in `prd.md` or `clarifications.md`.
     - `NEEDS_SOURCE` -> `READY_FOR_SPECIFY` only when the PRD cites the recovered source or records an explicit user-approved rebase away from the missing source.
     - `SPLIT_REQUIRED` -> `READY_FOR_SPECIFY` only after the user confirms the current feature boundary is single-purpose, or after the split creates separate feature directories.
     - `NEEDS_DECISION` -> `READY_FOR_SPECIFY` only after the selected human decision is written back to `prd.md`, `clarifications.md`, or `spec-outline.md`.
     - `BLOCKED` -> any other status only when the `Handoff To Specify` explains the blocker resolution and remaining risks.
   - Maintain a lightweight `Status History` in `spec-outline.md` only for status changes, blocker resolution, source rebase, feature split, or owner review. Do not copy the full reasoning transcript into the outline.
   - Each `Status History` entry must include `timestamp/run-id`, `status`, `blocker-signature`, `next-route`, and `evidence-summary`.
   - Use a stable short `blocker-signature` such as `missing-source:legacy-prd` or `scope-split:admin-vs-tenant` so later runs can detect the same unresolved blocker without rereading every source.
   - If the same `blocker-signature`, same outline status, and same `next-route` appear in two consecutive refreshes without new evidence, stop rewriting the same content. Escalate to `BLOCKED` or `NEEDS_DECISION`, output a plain-language decision package with background, impact, 2-4 options, recommendation, and next command, then route to `/sp.clarify`, source recovery, owner decision, or feature split.
   - When escalating a repeated blocker, write the decision package back into the current feature docs so later runs can reuse one stable entry point. The stable writeback target is `specs/<feature>/memory/open-items.md`; if `prd.md` or `spec-outline.md` already carries the blocker decision, keep the same `blocker-signature` and route there instead of inventing a new one.
   - New evidence means only user confirmation, recovered source, explicit rebase decision, feature split result, risk/compliance/owner decision, or document evidence that can change readiness. Rewording, template completion, and model re-summarization do not count.
   - For high-risk, 0-to-1 product direction, scope split, source rebase, governance candidate, real money/data, compliance, or irreversible-impact cases, `READY_FOR_SPECIFY` still requires an explicit `Owner Review Required` prompt in `Outline Decision` or `Handoff To Specify` before suggesting `/sp.specify`.
   - The `Owner Review Required` block must include `Risk Type`, `Review Focus`, `Impact If Approved`, `Impact If Rejected`, `Recommended Choice`, and `Confirm To Proceed`.
7. Handle constitution-related findings without mixing command ownership.
   - Governance-like material belongs in `.specify/memory/constitution.md` as a `Constitution Candidate` when it may apply across features or affects safety, compliance, irreversible operations, real money, real data, long-term engineering discipline, verification gates, or human decision rules.
   - `/sp.prd` may only append or update the `Constitution Candidates` section.
   - It must not rewrite formal constitution rules, stage boundaries, validation discipline, or project governance text.
   - Candidate status values are fixed: `proposed`, `under-review`, `promoted`, `rejected`, `merged`.
   - Candidates do not override formal constitution rules.
   - Single-feature local risks, todos, and requirement tradeoffs belong in `prd.md`, feature memory, or `open-items.md`, not the constitution candidate section.
8. Refresh lightweight memory only when it prevents later rediscovery.
   - Create or update `specs/<feature>/memory/open-items.md` for unresolved high-impact questions, risks, blockers, or decisions.
   - Do not duplicate the full PRD into memory.
   - Record only routing summaries, open decisions, PRD path, outline path, outline readiness status, and stable handoff pointers.
9. Validate before finishing.
   - Confirm the PRD remains upstream draft material.
   - Confirm all AI-proposed material is labeled.
   - Confirm confirmed user choices are distinguishable from candidates.
   - Confirm no implementation details were introduced.
   - Confirm unresolved product boundary or scope fork questions were not turned into guessed features.
   - Confirm `Outline Decision` exists in `prd.md` when a stable outline cannot be produced.
   - Confirm `spec-outline.md` exists when enough information is available, or when the feature directory is clear enough to hold a blocking outline.
   - Confirm `Outline Decision` records readiness and route when the outline is not `READY_FOR_SPECIFY`.
   - Confirm any blocking `spec-outline.md` repeats the same `Outline Decision` as `prd.md` and uses only `NEEDS_PRD`, `NEEDS_CLARIFY`, `NEEDS_SOURCE`, `SPLIT_REQUIRED`, `NEEDS_DECISION`, or `BLOCKED`.
   - Confirm `Handoff To Specify` summarizes what `/sp.specify` should stabilize when ready; when not ready, it must point to the same next route as `Outline Decision` and must not create a second conflicting decision.
   - Confirm repeated blockers are compared by `blocker-signature`, status, and `next-route`, not by rewritten prose.
   - Confirm owner review prompts use the fixed `Owner Review Required` fields when risk or governance conditions apply.

## Output

- Create or update `specs/<feature>/prd.md`
- Create or update `specs/<feature>/spec-outline.md` with readiness status, or report why the outline cannot safely be created
- Optionally append or update `.specify/memory/constitution.md` `Constitution Candidates`
- Optionally update `specs/<feature>/memory/open-items.md` for high-impact unresolved items
- Optionally update `specs/<feature>/memory/index.md` only for routing to the PRD draft

## Key Rules

- `prd.md` is only an upstream draft and not a stable fact source.
- Do not skip `/sp.prd` for new feature work. Keep it lean for clear requirements rather than bypassing it.
- Do not let `spec-outline.md` replace `/sp.specify`, `/sp.flow`, `/sp.ui`, `/sp.plan`, or `/sp.tasks`.
- Do not mark a blocking `spec-outline.md` as `READY_FOR_SPECIFY`.
- Do not omit `Outline Decision` when key PRD uncertainty blocks stable outline readiness.
- Do not leave a clear feature directory without a blocking `spec-outline.md` when downstream commands need a predictable blocker entry point.
- Do not loop on the same unchanged outline blocker; escalate to `BLOCKED` or `NEEDS_DECISION`.
- Do not move high-risk or source-rebase outlines downstream without an explicit owner review prompt.
- Do not let PRD detail grow into implementation design.
- Do not promote `[src:ai-proposed]` content without user confirmation.
- Do not bypass `/sp.specify`. Stable requirements still belong in `spec.md`.
- Do not rewrite formal constitution content from `/sp.prd`; use `Constitution Candidates` only.
- If PRD discovery finds a new independent business goal, role, workflow, acceptance boundary, release scope, or scope fork, do not route directly to `/sp.specify`. Keep or set `spec-outline.md` to `SPLIT_REQUIRED`, `NEEDS_CLARIFY`, `NEEDS_SOURCE`, `NEEDS_DECISION`, or `BLOCKED`, then output a plain-language decision package and route to `/sp.clarify`, another `/sp.prd` pass, source recovery, owner decision, or feature split confirmation until the outline can legitimately become `READY_FOR_SPECIFY`.
- If PRD discovery finds unclear product intent, risk acceptance, governance tradeoff, or another high-impact human choice, route to `/sp.clarify` with a plain-language decision package.

## Next

End every run with a concrete closeout recommendation. Do not only list readiness branches. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.

Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, PRD evidence, `spec-outline.md` readiness, and unresolved candidate requirements. If source authority, split, or human choice evidence is missing, recommend `/sp.prd`, `/sp.clarify`, or `/sp.constitution` instead of `/sp.specify`.

If the closeout names a numbered feature, module, or mainline such as `110-template-library-template-application`, include 1-3 short Chinese sentences explaining what it mainly does and why it matters. If the role is not confirmed by current evidence, say it is not confirmed and recommend evidence repair or `/sp.route all`.

Use this exact closeout shape:

```text
OPTION_A: [CMD: </sp.* or None>] <plain-language action and impact>
OPTION_B: [CMD: </sp.* or None>] <plain-language action and impact>
OPTION_C: [CMD: </sp.* or None>] <write [CMD: None] None when there is no third valid option>
RECOMMENDED_OPTION: A | B | C
MY_RECOMMENDATION: 我的推荐：选 <A|B|C>：<用中文说明推荐对象和理由>
NEXT_ACTION: <one concrete next action; do not write "if needed">
NEXT_COMMAND_EXEC: </sp.* or None>
NEXT_COMMAND_ID: </sp.* or None; legacy alias of NEXT_COMMAND_EXEC>
NEXT_COMMAND: </sp.* 加中文提示词的一整行；必须能一次复制粘贴执行；如果 NEXT_COMMAND_EXEC 为 None 则写 None>
WHY_THIS_NEXT: <why this is the correct direction, grounded in global/feature memory, open-items, Stage Readiness, and this command evidence>
DO_NOT_RUN: <commands that would be unsafe now, or None>
```

Command-specific guidance:

- If `spec-outline.md` is `READY_FOR_SPECIFY`, recommend `/sp.specify <feature>` with a prompt naming the PRD evidence and boundary checks to preserve.
- If readiness is `NEEDS_PRD`, recommend another `/sp.prd <feature>` pass with the missing interview/source areas.
- If readiness is `NEEDS_SOURCE`, recommend source recovery or explicit rebase decision before `/sp.specify`.
- If readiness is `SPLIT_REQUIRED` or major choices remain unresolved, recommend `/sp.clarify <feature>`.
- If governance candidates block feature specification, recommend `/sp.constitution`.
- If PRD contains `[src:ai-proposed]`, `[uncertain:*]`, or unconfirmed candidate requirements, end with an explicit review prompt that asks whether the next safe route is `/sp.clarify`.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
