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

# /sp.constitution

## Outline

Goal: Establish or refresh the long-term project constitution for the layered `sp` workflow, and keep project-level routing memory aligned with the resulting governance.

Command boundary:
- `/sp.constitution` owns project-wide governance: durable principles, engineering discipline, phase boundaries, validation requirements, risk gates, memory rules, and human-decision rules.
- `/sp.constitution` does not own feature PRD discovery. Do not create product scenarios, screen lists, flow branches, capability maps, feature scope, or implementation plans here.
- `/sp.prd` is mandatory for new feature work, capability directions, and important requirement changes. Simple requests may use a short PRD, but they must not skip the PRD intake.
- `/sp.prd` may discover governance-like material while exploring a product or feature. Treat that material as `Constitution Candidate` until this command confirms, merges, rewrites, or promotes it.
- `Constitution Candidates` in `.specify/memory/constitution.md` are the primary landing zone for governance candidates. `prd.md` may keep source notes or handoff summaries, but do not re-extract the same candidate repeatedly from a full PRD.
- Existing formal constitution rules outrank PRD drafts and constitution candidates. If a PRD draft conflicts with a formal rule, route to `/sp.clarify` or require explicit human decision before changing the formal rule.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.
- Governance changes that affect phase boundaries, validation discipline, human-decision rules, data-linkage, direct-neighbor checks, risk acceptance, or business PASS criteria must include a human decision package unless they are already explicitly confirmed by the current constitution or project owner.

Execution flow:

1. Read the current project context.
   - Read the current README and any existing constitution or team principles.
   - Read the layered workflow rules and command spec if they already exist.
   - Read `.specify/memory/project-index.md` and `.specify/memory/active-context.md` when present.
   - Read existing `Constitution Candidates` in `.specify/memory/constitution.md`.
   - If the active feature has `specs/<feature>/prd.md`, do not read the full PRD by default. Search for `Constitution Candidates`, `Handoff To Constitution`, or explicit governance-candidate anchors first, then read only those nearby sections when the candidate table is missing, stale, or explicitly points back to PRD source notes.
2. Write or refresh `.specify/memory/constitution.md`.
   - State that this project uses a layered, documentation-first workflow.
   - Make the documentation-first boundary explicit: implementation is allowed only as a downstream, bounded phase after `plan.md` records `Implementation Readiness` and `tasks.md` produces executable `Mode: impl` task packets.
   - State that flow assets use Mermaid and UI documentation uses Markdown plus JSON Forms.
   - State that `sp.prd` is the mandatory upstream requirement intake and must end with PRD-to-spec outline readiness before `sp.specify` stabilizes requirements.
   - State that second-layer work and implementation-stage work start only after the relevant gate/readiness evidence passes.
   - State that the controlled implementation chain is `sp.plan -> sp.tasks -> sp.implement -> sp.analyze -> sp.gate`.
   - Preserve compatibility with upstream Spec Kit mechanism where practical.
   - Include context control rules: choose the smallest sufficient read set, include related flow/UI/API/data/permissions/tests/risks when they affect the task, and refresh memory after stable facts change.
   - Include fallback rules: after bounded evidence-based attempts, move up one layer instead of guessing; inspect unstable implementation changes before fallback; use `sp.clarify` as a non-linear clarification route when confusion comes from unclear scope, conflicting docs, missing acceptance, or unclear user intent, then write the clarified result back before continuing.
   - Include complex blocker rules: diagnose root layer before fallback, split broad blockers into the smallest solvable unit, require `Blocker ID`, stable failure signature, disconfirming evidence before repeated attempts, verification path, and writeback target for high-risk or repeated blockers.
   - Include decision-freeze rules: ask humans only after bounded rule/source/test diagnosis shows a true macro choice; when `NEEDS_DECISION` is reached, downstream work for the same blocker freezes until the human-selected decision is written back to the source doc, task, or `memory/open-items.md`.
   - Include complexity split rules: split signals are raised during `sp.plan`, explained in plain language, and confirmed by the user before creating sub-features or sub-projects.
   - Include coordinate and status rules: stable anchors are not rewritten for status; `@t0` marks missing validation evidence; `@r0` marks open risk; status `1` is usually implicit and should not be written everywhere; mutable status tags belong in tasks, memory, or phase reports, not source-of-truth specification text, production code comments, or test names.
   - Include open item rules: real questions, todos, risks, blockers, rollback advice, and close conditions belong in `memory/open-items.md`; do not initialize fake default `OPEN01` or `RISK01` rows.
   - Include risk acceptance rules: the model cannot self-approve conditional risk acceptance; open risks require owner, impact scope, rollback/degrade path, close condition, revisit anchor, and explicit human decision when work proceeds despite risk.
   - Include evidence rules: high-impact implementation changes use `Impact-Radius Plan` before changes and `Impact-Radius Evidence` after verification; both can happen in one execution turn, but the plan must precede the change and evidence must follow actual verification; keep these notes in task output, task notes, phase output, or gate/analyze reports rather than production code comments; PASS requires fresh current-run or current-source evidence, not memory alone, and mechanical evidence overrides prose confidence.
   - Include business PASS rules: command success, generated documents, created issues, exit code 0, or refreshed memory do not equal business PASS. PASS still depends on acceptance, trace, open-items, data-linkage, current code/test or equivalent evidence when in scope, and gate verdict.
   - Include data-linkage rules: when flow, UI, API, data, permission, acceptance, tests, rollback, release, or human-decision meaning changes, check direct neighbors first and route unresolved gaps to open-items or the owner command instead of inventing a stable relation.
   - Include headless rules: non-interactive runs may carry soft issues forward, but manual decisions, hard gates, risk acceptance, disputed splits, compliance/data risk, or irreversible actions must return `NEEDS_DECISION` or `BLOCKED` instead of faking approval.
   - Include blocker truth-source rules: current blocker, risk, decision, and close-condition state belongs in `memory/open-items.md`; `trace-index.md` is relation/history lookup, and fallback-log only prevents repeated loops unless promoted into open-items.
   - Preserve and normalize `Constitution Candidates`: merge duplicates, keep their ID/source feature/source tag/candidate rule/impact/status/next route, and do not promote them to formal rules without explicit confirmation or strong project-wide evidence.
   - Use only these candidate status values: `proposed`, `under-review`, `promoted`, `rejected`, `merged`.
   - Apply the candidate strength threshold: keep a governance candidate only when it may recur across features or affects safety, compliance, irreversible action, real money/data risk, long-term engineering discipline, validation gates, or human-decision rules. Single-feature local risks, local TODOs, and ordinary requirement tradeoffs belong in PRD, feature memory, or `open-items.md`.
   - If a candidate is promoted, record the promotion reason and update or close the candidate instead of leaving contradictory duplicate text.
   - Keep the active `Constitution Candidates` list concise. Once a candidate is `promoted`, `merged`, or `rejected`, remove it from the active candidate table or archive it outside the active table after recording the decision summary, so processed candidates do not keep consuming future context.
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
   - Confirm any promoted governance change that affects human-decision rules, data-linkage, direct-neighbor checks, risk acceptance, or business PASS criteria has an explicit owner decision or source-backed reason.
   - Confirm blocker/root-cause governance covers root-cause-first routing, smallest solvable units, decision freeze, and writeback completeness.

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
- Do not let the constitution imply that models may bypass unresolved `NEEDS_DECISION`, risk acceptance, destructive cleanup, or incompatible requirements by continuing lower-layer implementation.

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

End every run with a concrete closeout recommendation. Do not only say "Suggest `/sp.specify`". Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.

Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, project constitution/governance memory, current governance evidence, and any affected feature memory/open-items. If governance scope is unclear or conflicts with active feature evidence, recommend `/sp.route all`, `/sp.clarify`, or another `/sp.constitution` pass instead of feature work.

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

- Recommend `/sp.specify <feature>` only when the governance update cleanly enables feature specification.
- Recommend `/sp.route all` when the governance change affects project direction or multiple features and the active mainline is no longer reliable.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
