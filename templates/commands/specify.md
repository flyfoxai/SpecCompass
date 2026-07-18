---
description: Create or refresh the baseline requirement document for the active feature.
handoffs:
  - label: Resolve Business Clarifications
    agent: sp.clarify
    prompt: Resolve high-impact business clarifications for the active feature.
    send: true
  - label: Build Business Flow
    agent: sp.flow
    prompt: Design the stabilized business flow for the active feature.
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

## Active Lite Round

Before normal execution, check `specs/<feature>/lite.md`. If it is absent or
has no active selected round, preserve the full SP behavior of this command.
For an active round, run the platform-appropriate installed `sp-lite-state`
script with JSON output and accept only schema `speckit.lite.route.v1`. Read its
`Active Round`, `Included Outline Anchors`, `Deferred Outline Anchors`, `Reuse Refs`,
`Allowed Write Set`, `Required Historical Regressions`, `Global Status`, and
`Blocker Route` before writing specification artifacts.

Normal Lite specification work is authorized only when the fresh payload has
`globalControl=CLEAR`, `continueAllowed=true`, and `next="/sp.specify"`. On any
other normal route, stop without writing and return its `next`. A non-`CLEAR`
route is resolution-only: proceed only when `Blocker Route` is `/sp.specify`
and the human explicitly invoked that repair route. Limit that repair to the
named conflict, stale, or regression references and the `Allowed Write Set`;
do not advance the Lite lifecycle or clear coordinator state yourself. Return
`/sp.lite sync` so the coordinator can recompute global control. All other
non-`CLEAR` routes stop without writing.

Within authorized scope, specify only included anchors, never absorb deferred
anchors, and reuse cited prior evidence. The confirmed Outline remains the
project completion boundary regardless of the current Lite scope.

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
- Treat `/sp.specify` as the stable requirement intake and baseline specification point. `/sp.prd` is the mandatory upstream requirement intake for new feature work; `prd.md` is only an upstream draft, and confirmed content becomes stable only when carried into `spec.md`.
- Treat work as new feature work when `spec.md` is missing, `spec.md` still contains `SP_STAGE_SEED: spec`, the user introduces a new capability direction, or the request changes business scope, target role, workflow, acceptance boundary, release scope, or source authority enough to invalidate the current spec. Minor edits inside an already stable feature may reuse the current `spec.md`, but important requirement changes must route through `/sp.prd`.
- Minor edits are limited to local wording fixes, naming clarification, duplicate cleanup, or recording already confirmed detail when they do not change target users, business scope, core flow, acceptance boundary, source authority, risk level, data, permissions, compliance, or release scope.
- Important requirement changes include new capability direction, new role or permission, new business flow or branch, changed acceptance criteria, release scope change, source rebase, risk/compliance/real-money/real-data impact, or any change that invalidates current `spec.md` scope. Route these to `/sp.prd`.
- If `specs/<feature>/prd.md` is missing for a new feature, capability direction, or important requirement change, stop and route to `/sp.prd` instead of creating a stable spec directly.
- If `specs/<feature>/spec-outline.md` is missing or not `READY_FOR_SPECIFY`, stop and route to the owner stage named by the outline status: `/sp.prd`, `/sp.clarify`, source recovery, or feature split confirmation.
- Treat `AWAITING_OUTLINE_CONFIRMATION` as a hard stop owned by `/sp.prd`. Browser state, localStorage, preview completion, or download alone is not authorization; only a fresh `specs/<feature>/prd/review/outline-confirmation.md` bound to the current `outline-review-data.json`, `Outline Digest`, and `Source Authority IDs` may authorize stabilization.
- If `prd.md` is empty, template-only, only section headings, or still dominated by `SP_STAGE_SEED`, `[src:ai-proposed]`, `[uncertain:*]`, missing source authority, or unresolved outline blockers, treat it as not ready. Return `SP_STATUS: NEEDS_PRD` unless a current `spec-outline.md` supplies a more specific non-ready status, suggest the upstream route, end with `SP_EXIT_CODE: 1`, and stop.
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
   - `specs/<feature>/prd.md` for upstream intent, candidate requirements, rejected ideas, open questions, and Handoff To Specify
   - `specs/<feature>/spec-outline.md` for PRD-to-spec readiness, feature slices, and specification scope
   - the user request, active notes, and any existing feature docs relevant to this feature
   - If `prd.md` or `spec-outline.md` is missing for new feature work, do not infer around the gap. Return `SP_STATUS: NEEDS_PRD`, explain the missing upstream intake, suggest `/sp.prd`, end with `SP_EXIT_CODE: 1`, and stop.
   - If `prd.md` is template-only or lacks confirmed strategic goal, target users/roles, scope, source authority, and acceptance intent, return `SP_STATUS: NEEDS_PRD`, suggest `/sp.prd`, end with `SP_EXIT_CODE: 1`, and stop.
   - If `spec-outline.md` status is not `READY_FOR_SPECIFY`, return that status with the next safe route, end with `SP_EXIT_CODE: 1`, and stop.
   - If the status is `AWAITING_OUTLINE_CONFIRMATION`, report `OUTLINE_CONFIRMATION_PENDING`, route to `/sp.prd` to finish or consume the graphical review package, end with `SP_EXIT_CODE: 1`, and stop.
   - For a new-contract `READY_FOR_SPECIFY` outline, run the host-appropriate `check-sp-memory` script before writing `spec.md`. Require complete `Outline Confirmation` metadata plus `specs/<feature>/prd/review/outline-review-data.json` and `specs/<feature>/prd/review/outline-confirmation.md`. The checker must recompute the Review Data ID from the complete current review JSON; that ID, the canonical `Outline Digest`, and normalized `Source Authority IDs` must agree across all three artifacts. Human and batch status must be confirmed; needs-decision, unresolved, draft-excluded, and revision-request lists must be empty.
   - Treat `OUTLINE_CONFIRMATION_MISSING`, `OUTLINE_CONFIRMATION_STALE`, `OUTLINE_CONFIRMATION_IDENTITY_MISMATCH`, `OUTLINE_CONFIRMATION_AUTHORITY_MISMATCH`, or `OUTLINE_CONFIRMATION_UNRESOLVED` as hard failures. Do not repair the evidence in `/sp.specify`; return to `/sp.prd`, end with `SP_EXIT_CODE: 1`, and stop.
   - A legacy `READY_FOR_SPECIFY` outline without an `Outline Confirmation` block remains consumable for one minor-release compatibility window only. Surface `LEGACY_OUTLINE_CONFIRMATION_DEPRECATED`, and require the next `/sp.prd` refresh to generate the graphical review contract. Do not extend this exception to a malformed or stale new-contract outline.
   - If `spec-outline.md` is `READY_FOR_SPECIFY`, still check its `Based On`, `Source Snapshot` or `Source Authority Summary`, `Status History`, `Outline Decision`, and `Handoff To Specify` against the current `prd.md`. If the outline references stale PRD intent, missing/rebased sources, unresolved decisions, or a different feature boundary, do not stabilize `spec.md`; return the specific non-ready route (`NEEDS_PRD`, `NEEDS_SOURCE`, `NEEDS_CLARIFY`, `NEEDS_DECISION`, `SPLIT_REQUIRED`, or `BLOCKED`) and send the work back to `/sp.prd` or `/sp.clarify` for refresh.
   - If `spec-outline.md` is `READY_FOR_SPECIFY` but its `Outline Decision` or `Handoff To Specify` requires owner review for high-risk, source rebase, scope split, governance, real money/data, compliance, or irreversible-impact work, stop and request the owner review before stabilizing the spec.
3. Produce or refresh `specs/<feature>/spec.md`.
   - Remove the `SP_STAGE_SEED: spec` marker once the file contains real feature-specific requirements.
   - Capture business objective, target roles, in-scope items, out-of-scope items, success criteria, and any stable assumptions that must remain visible.
   - Keep the document requirement-focused and business-focused.
   - Separate user goals from solution ideas when both appear in the input.
   - When using `prd.md`, carry only `[src:user]`, `[src:user-confirmed]`, or otherwise explicitly confirmed material into stable requirements. Do not treat `[src:ai-proposed]`, `[uncertain:assumed]`, or `[uncertain:proposed]` as stable facts.
   - Do not create `[src:user-confirmed]` by model judgment. Confirmed source tags require a traceable `Decision Record`, `Decision ID`, `clarifications.md`, `clarify-log.md`, or equivalent captured user choice; otherwise keep the item as `NEEDS_USER_CONFIRMATION`, `NEEDS_DECISION`, or open.
   - Check requirement conflicts before stabilizing text:
     - conflicting user intent
     - contradictory acceptance criteria
     - scope expansion that changes the current feature boundary
     - a new independent business goal, role, workflow, or acceptance boundary
   - If the conflict is unclear user intent, record it in `specs/<feature>/memory/open-items.md`, return `NEEDS_DECISION` when it blocks safe continuation, and suggest `/sp.clarify`.
   - If the input is clearly a new independent feature or scope fork, do not absorb it into the current feature. Route back to `/sp.prd` or `/sp.clarify` to confirm feature split and outline readiness before any new `/sp.specify` stabilization.
   - When asking the user, use plain language: explain the background, future impact, 2-4 options, tradeoffs, recommendation, and next `/sp.*` route.
   - Mark unresolved items explicitly instead of guessing.
4. Write or refresh the feature `Stage Readiness` block in `specs/<feature>/spec.md` or `specs/<feature>/memory/index.md`.
   - Required fields: `Stage`, `Status`, `Based On`, `Source Snapshot` or `Evidence Signature`, `Unresolved Blockers`, `Needs Decision`, `Inferred/Draft Items`, `Next Allowed Stage`, and `Writeback Target`.
   - `Source Snapshot` / `Evidence Signature` should list the current source docs, critical anchors, open-item state, visual/human review status, and review/evidence records used for readiness. Minimum fields: `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Do not use file mtime or raw hash as a hard gate; later `/sp.analyze` should warn on missing/stale/mismatch, and `/sp.gate` should block only when the mismatch affects stage entry, PASS, risk closure, or implementation readiness.
   - Use `Status: READY_FOR_FLOW` only when stable requirement evidence defines the business goal, target users, feature scope, core acceptance, major constraints, and no unresolved flow-blocking ambiguity remains.
   - Use `Status: NEEDS_CLARIFY` when the missing information can be resolved by focused clarification.
   - Use `Status: NEEDS_DECISION` when the next safe step depends on human scope, risk, compliance, rollback, split, verification, or product-choice decision.
   - Use `Status: BLOCKED` when safe automatic progress is impossible from current documents.
   - Use `Status: DRAFT_ONLY` when the spec still depends on `Source: model-inferred`, `[INFER:DRAFT]`, `[src:ai-proposed]`, `[uncertain:assumed]`, or unconfirmed source material.
   - Do not use command success, file existence, generated prose, or model confidence as readiness evidence.
5. Refresh routing and memory artifacts to keep later commands discoverable.
   - Update `.specify/memory/feature-map.md`
   - Update `.specify/memory/active-context.md`
   - Create or update `specs/<feature>/memory/index.md`
   - Create or update `specs/<feature>/memory/stable-context.md`
   - Create or update `specs/<feature>/memory/open-items.md`
   - Initialize trace and workset memory only with evidence-backed anchors. Empty tables are valid when no stable anchors exist yet.
6. Validate before finishing.
   - Confirm the document explains what and why, not production delivery details.
   - Confirm scope boundaries and non-goals are visible.
   - Confirm unresolved areas remain marked instead of being silently converted into decisions.
   - Confirm any non-trivial unresolved item has owner or revisit condition, impact, affected docs or anchor, and close condition.
   - Confirm no unconfirmed `[src:ai-proposed]`, `[uncertain:assumed]`, or `[uncertain:proposed]` PRD material entered `spec.md` as stable requirement text.
   - Confirm `Stage Readiness` is present and that `READY_FOR_FLOW` is not set when flow-blocking ambiguity, conflict, draft inference, `SP_STAGE_SEED`, or high-impact open items remain.

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
- Do not treat new feature work as a minor edit just because a feature directory exists.
- Do not silently convert assumptions into fixed decisions.
- Do not promote AI-proposed PRD material into stable specification text without user confirmation.
- Do not treat browser state, localStorage, preview completion, or download alone as Outline authorization; require the current git-trackable `outline-confirmation.md`.
- Do not merge incompatible requirements to make the spec look complete.
- Do not let `/sp.clarify` become the hidden entry point for new features. New feature intake belongs in `/sp.specify`; `/sp.clarify` only resolves ambiguity or records the decision to route back.
- Expand into source documents only for the current target area.
- Prefer the freshest feature-level memory when project-level routing is stale.
- Do not create placeholder risks or fake open items. `memory/open-items.md` may stay empty until evidence exists.
- If feature creation cannot be resolved from user input, script output, or existing routing, stop and ask for the macro decision instead of guessing a feature name.
- Do not suggest `/sp.flow` as the immediate next step unless `Stage Readiness` is `READY_FOR_FLOW`; otherwise suggest `/sp.clarify`, `/sp.specify`, or the exact owner route.

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

End every run with a concrete closeout recommendation. Do not only list possible readiness branches. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.

Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, `spec.md` readiness, upstream PRD evidence, and this specification evidence. If scope, acceptance, roles, permissions, data meaning, or flow behavior still depends on unconfirmed input, recommend `/sp.clarify`, `/sp.specify`, or the exact owner route instead of `/sp.flow`.

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

- If `Stage Readiness` is `READY_FOR_FLOW`, recommend `/sp.flow <feature>` with a prompt naming the stable requirements and boundary checks.
- If `Stage Readiness` is `READY_FOR_FLOW`, suggest `/sp.flow` only after unconfirmed items are absent or explicitly handled.
- When confirmation gaps remain, do not suggest `/sp.flow`.
- If readiness is `DRAFT_ONLY`, `NEEDS_DECISION`, `BLOCKED`, or otherwise not ready, recommend `/sp.clarify`, `/sp.specify`, or the exact owner route and name the blocker in plain Chinese.
- If `spec.md` or upstream `prd.md` still contains `[src:ai-proposed]`, `[uncertain:*]`, `Source: model-inferred`, `[INFER:DRAFT]`, unconfirmed candidate requirements, or unresolved open items affecting downstream work, recommend `/sp.clarify <feature>` or a focused `/sp.specify <feature>` repair.
- If user confirmation is still needed, end with an explicit review prompt that asks the user to confirm, reject, or revise the named items.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
