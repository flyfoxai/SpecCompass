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
   - Record `Outline Maturity` independently from `Outline Decision`, `review_level`, and `confirmation_priority`. Its exact machine values are `outline_maturity: explore | frame | specify_ready`; maturity may regress when product intent, scope, or source authority changes.
   - `explore` is Level 1 direction discovery. Keep it until the PRD has a confirmed goal, at least one confirmed user or role, and a clear core problem. The user must deeply participate; do not fabricate missing product facts.
   - `frame` is Level 2 convergence. Enter it only after the Level 1 minimum is confirmed; remain there while scope, non-goals, first slice, core scenarios, acceptance intent, source authority, or high-impact business rules are unstable.
   - `specify_ready` is Level 3 structural completion. Enter it only when the Level 1 minimum and the Level 2 product boundary are confirmed and source-backed enough for formal graphical confirmation. The model may organize confirmed facts and use the Constitution for coverage and governance checks, but it must not invent target users, product goals, business rules, or scope.
   - Reassess maturity after every accepted delta or source-authority change: regress from `frame` to `explore` when the confirmed goal, user/role, or core problem is withdrawn, replaced, or becomes contradictory; regress from `specify_ready` to `frame` when scope, non-goals, first slice, core scenario, high-impact rule, acceptance intent, or source authority changes materially; regress further to `explore` if the Level 1 minimum is no longer confirmed.
   - For `explore` and `frame`, generate `specs/<feature>/prd/review/outline-discovery-data.json` with `interaction_mode: discovery`. Present the current product understanding as XMind-style maps, not as a long outline or a flat question list.
   - Always provide exactly one `overview` map, at least one business `branch` map, and exactly one `global_constraints` map. The overview shows the project-wide structure and uses `map_link` nodes to enter each child map. Split additional business domains into separate branch maps when one map cannot stay readable.
   - Give every map and outline node a stable `map_id` or `node_id`; preserve an ID across refreshes while the same semantic map or node still exists. Each map has one root, every non-root node has a parent in the same map, and every child map is linked exactly once from its parent map.
   - Keep information density moderate and distributed across layers. Emit the fixed `density_budget`: `max_visible_nodes_per_map: 18`, `max_depth: 3`, `max_children_per_node: 4`, `layer_balance_min_nodes: 8`, and `max_layer_share: 0.6`. When a map has 8 or more nodes, no single layer may contain more than 60% of them. If any limit would be exceeded, rebalance or split the content into another business map instead of compressing one layer.
   - Bind every discovery question to one concrete `outline_node_id`. The selected node is the unit of discussion: its 2-4 business `candidates`, single recommendation with a reason, none of the above path, and free-form input must resolve or extend that branch. Do not place branch-specific choices in an unrelated global list, and do not reuse formal confirmation `options` or their routing semantics.
   - Put policy, compliance, audit, permission, security, and other cross-cutting rules that affect multiple branches in the `global_constraints` map. Each such constraint must list the affected business `node_id` values so the interface can show its project-wide impact. A rule that only affects one branch stays on that branch.
   - Level 1 and Level 2 maps expose the decisions that need deep user participation. Level 3 may organize confirmed material and use the Constitution to check structural and governance coverage, but it must not invent business facts or hide unresolved Level 1/2 choices inside generated detail.
   - Whenever `outline-discovery-data.json` is created or refreshed, update the matching entry in `specs/review-index.json` with `has_outline_discovery: true`. Preserve its `order`, title, and all other review flags. Set the flag to false only when the artifact is intentionally removed or invalidated; do not infer it from Outline confirmation readiness.
   - Discovery input must use an explicit operation: `confirm_candidate`, `add`, `replace`, `exclude`, or `context_note`. The browser downloads `outline-discovery-response-*.json`; it does not write repository files.
   - A discovery response must never advance the Outline to `AWAITING_OUTLINE_CONFIRMATION` or `READY_FOR_SPECIFY`. Browser state, localStorage, preview completion, and discovery download are non-authoritative and must not authorize `/sp.specify`.
   - When the user explicitly supplies a discovery response file to `/sp.prd`, validate its format, feature, response identity, source discovery-data identity, maturity, candidate IDs, target IDs/kinds, operation/value combinations, and unique `delta_id` values. If the schema version is unsupported, do not guess or silently upcast it, and do not downgrade it to an incompatible earlier contract. Fail closed on unknown, repeated, mismatched, or cross-feature data.
   - Append valid events to `specs/<feature>/prd/review/outline-intent-ledger.json`. The ledger is append-only: never mutate an accepted event. A replacement, exclusion, correction, or reversal is a new delta whose `supersedes_delta_id` must reference an earlier accepted event that is already consumed by the current formal PRD, not a ledger-only pending event; the superseded event must remain auditable in the append-only ledger. Reject missing or duplicate formal PRD anchors. Reject forward references and cycles.
   - Regenerate `prd.md` and `spec-outline.md` into temporary outputs before replacing the current files. New user text is `[src:user]`; accepted AI candidates are `[src:user-confirmed]`; unaccepted candidates remain `[src:ai-proposed]`. Every consumed delta must appear in its intended section with a stable `<!-- intent-delta:<id> -->` anchor.
   - Deterministically verify delta IDs, source tags, target sections, and exclusion/replacement references before replacing either document. If the validator or helper is missing, crashes, or returns an invalid result, fail closed. If any consumed delta is missing or misplaced, keep the last valid PRD/Outline and retain the ledger event as pending rather than asking the user to enter it again.
   - Mark existing PRD entries that may be replaced or excluded with stable `<!-- intent-target:<id> -->` anchors. In each regenerated delta block, add `<!-- intent-ref:<delta-id>:<target-or-candidate-id> -->` for `replace` and `exclude`, so the helper can verify the exact referenced entry without interpreting prose.
   - After producing `specs/<feature>/prd.md.tmp` and `specs/<feature>/spec-outline.md.tmp`, run `node .specify/review/scripts/apply-outline-discovery.mjs --response <response-package> --prd-temp specs/<feature>/prd.md.tmp --outline-temp specs/<feature>/spec-outline.md.tmp`. The helper appends new ledger events before validating temporary documents; a validation failure leaves the formal documents unchanged and keeps matching events pending so the same response can be retried. A delta becomes consumed only when its `intent-delta` anchor is present in the formal PRD. The helper serializes each feature with `specs/<feature>/prd/review/.outline-discovery-writeback.lock`: if an active process owns the lock, stop and retry after it finishes. Recover a dead owner's stale lock only after acquiring the exclusive `.outline-discovery-writeback.recovery.lock` claim and rechecking that the main lock still has the observed identity. Both locks carry unique ownership IDs and cleanup must preserve any lock whose ownership has changed. If a dead process left both locks, fail closed and preserve them until an operator verifies that no writeback is running and removes only the recovery claim; an orphaned recovery claim with no old main lock is removed only after a fresh main lock is acquired.
   - If temporary document validation fails on two consecutive regeneration attempts with no new evidence, stop regenerating. Set the blocking Outline status to `NEEDS_DECISION`, retain the failed deltas and diagnostics, and offer a correction or superseding discovery event so the user can resolve the conflict without rewriting ledger history. When a valid correction, reversal, or other new evidence is accepted, reset the consecutive-failure count before the next regeneration attempt.
   - Keep discovery and confirmation contracts separate. `outline-discovery-data.json`, `outline-discovery-response-*.json`, and `outline-intent-ledger.json` must not be consumed as `outline-review-data.json` or a confirmation package, and the discovery consumer must not accept formal confirmation data.
   - Producing Level 3 `outline-review-data.json` from the validated ledger and current PRD/Outline is a model-owned compilation step inside `/sp.prd`, not cross-consumption by the confirmation package parser. The compiler reads accepted ledger state and emits a new formal review artifact; confirmation consumers continue to reject discovery packages.
   - Include only the minimal structure needed for `/sp.specify`: feature name, PRD source, `Source Authority Summary`, strategic goal, target users/roles, problem domains, capability slices, scope/non-goals, core scenarios, acceptance seed groups, risk/open-item summary, and recommended first slice.
   - `Source Authority Summary` must list stable sources, candidate-only sources, archived or missing sources, source rebase decisions, and what `/sp.specify` may safely consume. Keep it lightweight; do not copy the full PRD or build a heavy source map.
   - Mark every section with source status: `[src:user]`, `[src:doc]`, `[src:user-confirmed]`, `[src:ai-proposed]`, or unresolved.
   - If the PRD has a clear strategic goal, users, scope, capability map, and source authority, automatically create or refresh `specs/<feature>/spec-outline.md`, but set the current `Outline Decision` to `AWAITING_OUTLINE_CONFIRMATION` until the graphical review is freshly confirmed.
   - If the PRD still has key `[src:ai-proposed]`, `[uncertain:*]`, scope conflict, missing source authority, or unclear feature boundary, do not create a stable outline. Add an `Outline Decision` section at the end of `prd.md` that explains the blocker and names the next route: `/sp.clarify`, another `/sp.prd` pass, source recovery, or feature split. If the feature directory is clear, also create or refresh a blocking `spec-outline.md` with the same `Outline Decision` so `/sp.specify`, mechanical checks, and later agents read the current blocker from one predictable entry point.
   - If information is insufficient but the feature directory is clear, you may create a blocking `spec-outline.md`; its status must be only `NEEDS_PRD`, `NEEDS_CLARIFY`, `NEEDS_SOURCE`, `SPLIT_REQUIRED`, `NEEDS_DECISION`, or `BLOCKED`, never `READY_FOR_SPECIFY`.
   - Set one readiness status:
     - `AWAITING_OUTLINE_CONFIRMATION`: enough confirmed or source-backed intent exists, but the current outline still needs graphical human confirmation inside `/sp.prd`.
     - `READY_FOR_SPECIFY`: the semantic readiness checks pass and a fresh, identity-bound `outline-confirmation.md` authorizes the current outline.
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
7. Generate and consume the graphical Outline confirmation.
   - Before generation, verify that the installed discovery schemas, renderer modules, or launcher support are present. If installed discovery schemas, renderer modules, or launcher support are missing, explain that already initialized projects do not receive new template assets automatically and tell the user to run `specify init --force` from the target project before retrying.
   - Generate `specs/<feature>/prd/review/outline-review-data.json` from the current `spec-outline.md` using the installed Outline schema. Keep the three bounded views focused on product intent, scope/coverage, and readiness; do not introduce Flow, UI, API, database, or implementation design.
   - Give every review generation a stable Review Data ID. After writing the complete review JSON, compute it with `.specify/review/scripts/review-data-id.mjs`; never invent or preserve the ID after changing any review field. Compute the canonical Outline digest separately with `.specify/review/scripts/outline-digest.mjs`, passing the exact source authority IDs, and record an `Outline Confirmation` block in `spec-outline.md` with `Contract Version`, `Review Data`, `Review Data ID`, `Outline Digest`, `Source Authority IDs`, and `Confirmation`.
   - Validate the data, then launch the fixed renderer with `node .specify/review/scripts/serve-review.mjs --outline <feature>` and relay its verified loopback URL. If a browser cannot be launched, provide the URL and keep the status pending.
   - Browser state, localStorage, preview completion, or download alone never authorizes `/sp.specify`. The user or agent must consume the downloaded confirmation package, recompute the Review Data ID from the current complete `outline-review-data.json` with `.specify/review/scripts/review-data-id.mjs`, validate that the recomputed value matches both `spec-outline.md` and the package, then validate the Outline Digest and Source Authority IDs and confirm that needs-decision, unresolved, draft-excluded, and revision-request lists are all empty. If the helper or current JSON is unavailable or invalid, fail closed and keep the outline pending.
   - Write the verified package to the git-trackable `specs/<feature>/prd/review/outline-confirmation.md`. Only then change the current decision from `AWAITING_OUTLINE_CONFIRMATION` to `READY_FOR_SPECIFY`, set the next route to `/sp.specify`, and append the transition to `Status History`.
   - Any change to the digest-bearing outline content or Source Authority IDs invalidates the old confirmation. Regenerate the review, return to `AWAITING_OUTLINE_CONFIRMATION`, and require fresh confirmation rather than editing identity fields to match.
8. Handle constitution-related findings without mixing command ownership.
   - Governance-like material belongs in `.specify/memory/constitution.md` as a `Constitution Candidate` when it may apply across features or affects safety, compliance, irreversible operations, real money, real data, long-term engineering discipline, verification gates, or human decision rules.
   - `/sp.prd` may only append or update the `Constitution Candidates` section.
   - It must not rewrite formal constitution rules, stage boundaries, validation discipline, or project governance text.
   - Candidate status values are fixed: `proposed`, `under-review`, `promoted`, `rejected`, `merged`.
   - Candidates do not override formal constitution rules.
   - Single-feature local risks, todos, and requirement tradeoffs belong in `prd.md`, feature memory, or `open-items.md`, not the constitution candidate section.
9. Refresh lightweight memory only when it prevents later rediscovery.
   - Create or update `specs/<feature>/memory/open-items.md` for unresolved high-impact questions, risks, blockers, or decisions.
   - Do not duplicate the full PRD into memory.
   - Record only routing summaries, open decisions, PRD path, outline path, outline readiness status, and stable handoff pointers.
10. Validate before finishing.
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
   - Confirm semantically ready outlines remain `AWAITING_OUTLINE_CONFIRMATION` until the current confirmation package is validated and written to `outline-confirmation.md`.
   - Confirm the Review Data ID is recomputed from the current complete JSON and that it, `Outline Digest`, and `Source Authority IDs` agree across `spec-outline.md`, `outline-review-data.json`, and `outline-confirmation.md` before setting `READY_FOR_SPECIFY`.

## Output

- Create or update `specs/<feature>/prd.md`
- Create or update `specs/<feature>/spec-outline.md` with readiness status, or report why the outline cannot safely be created
- Create or update `specs/<feature>/prd/review/outline-review-data.json` and, only after verified package consumption, `specs/<feature>/prd/review/outline-confirmation.md`
- Optionally append or update `.specify/memory/constitution.md` `Constitution Candidates`
- Optionally update `specs/<feature>/memory/open-items.md` for high-impact unresolved items
- Optionally update `specs/<feature>/memory/index.md` only for routing to the PRD draft

## Key Rules

- `prd.md` is only an upstream draft and not a stable fact source.
- Do not skip `/sp.prd` for new feature work. Keep it lean for clear requirements rather than bypassing it.
- Do not let `spec-outline.md` replace `/sp.specify`, `/sp.flow`, `/sp.ui`, `/sp.plan`, or `/sp.tasks`.
- Do not mark a blocking `spec-outline.md` as `READY_FOR_SPECIFY`.
- Do not treat browser state, localStorage, preview completion, or a downloaded file by itself as authorization.
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
