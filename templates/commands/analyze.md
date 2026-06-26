---
description: Verify whether the full document system is strong enough for later automation.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-spec --require-flow --require-ui --require-bundle --require-plan --require-tasks --include-tasks
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec -RequireFlow -RequireUi -RequireBundle -RequirePlan -RequireTasks -IncludeTasks
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

# /sp.analyze

## Outline

Goal: Verify whether the active document system is actually strong enough for later automation, not merely complete on paper.

Global rules:
- Stay within diagnostic work only: this command may inspect documents, memory, trace, task packets, and current code/test evidence, but it must not edit production code.
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
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Manage context as an engineering budget: start from routing and memory, expand one layer at a time, and read only the source documents needed to prove or disprove the current finding.

Execution flow:

1. Run `{SCRIPT}` from repo root once and parse the active feature routing and document availability.
2. Run Stage Entry Preflight before broad analysis.
   - Confirm the active feature route is current enough to identify one target feature or workset.
   - Confirm `spec.md`, `flows/*`, `ui/*`, `bundle.md`, `plan.md`, and `tasks.md` exist and are not only initialization scaffolds, generic templates, or unchecked draft facts being used as stable evidence.
   - Confirm open blockers, high-impact risks, stale routing, and unresolved decisions do not already make the requested analysis impossible at this layer.
   - If user input changes product goal, requirements, acceptance, flow, UI, workset, task packet, implementation boundary, risk acceptance, or verification standard, stop normal analysis and route to the upstream owner command before diagnosing downstream artifacts.
   - Use a bounded evidence loop: handle one smallest solvable unit per round, record the evidence or missing evidence, and stop with `BLOCKED` or `NEEDS_DECISION` when the same `Failure Signature` or `blocker-signature` appears twice at this layer without new evidence, a smaller unit, or a changed owner route.
   - Debug Evidence Loop:
     - Reproduce or locate the failure evidence.
     - State the current hypothesis and the smallest check that can disconfirm it.
     - Apply the smallest root-cause finding or routing repair only after the check points to a cause.
     - A second attempt on the same Failure Signature must cite disconfirming evidence from the first attempt.
     - Two attempts without new evidence stop local repair and route upward.
   - If preflight fails, output `Missing/Weak Artifact`, `Blocker Type`, `Root Layer`, `Owner Route`, `Why current command cannot continue`, `Next /sp.* route`, and `Writeback Target`. Use `FAIL` for repairable upstream evidence gaps, `BLOCKED` when safe automatic progress is impossible, and `NEEDS_DECISION` when the missing input is a human choice. Do not auto-create missing upstream documents from `/sp.analyze`.
3. Initialize analysis context.
   - Read project-level `.specify/memory/*` routing files first.
   - Reconcile project-level routing against `feature-map.md`, `specs/*/memory/index.md`, and the current workspace before deciding that no active feature exists.
   - Read feature-level `memory/*` routing files next.
   - Read the first-layer and second-layer core outputs needed to prove the current analysis question; expand further only when a gap, stale route, or contradiction requires evidence.
   - Keep a short internal read-set note for each finding: routing file, memory file, or source document that supports it. Output the read set only when it explains a failure, stale route, or requested audit detail.
4. Run the lightweight memory check when available.
   - Prefer the script matching the installed script family:
     - Bash: `.specify/scripts/bash/check-sp-memory.sh --json`
     - PowerShell: `.specify/scripts/powershell/check-sp-memory.ps1 -Json`
   - In command frontmatter, keep `scripts/...` because Specify CLI maps template script references into the installed project. In command body or manual model execution, `.specify/scripts/...` is the expected installed-project location. In a source checkout of this repository, `scripts/...` may be used only as a development fallback when `.specify/scripts/...` is absent.
   - Treat this as mechanical evidence only. It checks open-item fields, open blocker/risk visibility, trace links, trace `Expand Docs` file liveness, obvious `@t0` / `@r0` drift, and obvious flow/ui subject-confusion control-plane terms; it does not replace document analysis.
   - `ERROR` findings block PASS until fixed or routed upward with a clear next `/sp.*` step.
     - `WARN` findings do not automatically block PASS; confirm them against the current read set and record the decision when relevant.
     - If the lightweight memory check sets `needsHumanReview=true`, treat it as a machine-readable review hint. It does not auto-fail, but in headless or non-interactive runs it must be resolved by a readable decision record or by routing to `/sp.clarify` before downstream PASS is claimed. If no readable decision record exists, return `NEEDS_DECISION` or `BLOCKED` and end the output with `SP_EXIT_CODE: 1` so automated runners cannot treat the diagnostic as a successful PASS.
   - Treat stale routing as a memory health preflight, not a normal warning. If project memory says bootstrap/no active feature while current specs, branch, user target, or feature memory indicate active work, classify it as `ROUTING_STALE`, choose the freshest bounded route if safe, and record the memory refresh target. If multiple active candidates remain, return `BLOCKED` or `NEEDS_DECISION` before broad analysis.
   - Record a compact `Memory Check Summary` in `analysis.md`: command used, run_id or timestamp, feature/workset, gate modes covered, source snapshot or evidence signature label, open-items state, result status, `needsHumanReview`, ERROR count, WARN count, and decisive finding IDs or `none`. This lets `/sp.gate` reuse current mechanical evidence instead of rerunning the same check by default.
5. Perform the analysis pass.
   - Detect whether project-level routing is stale, contradictory, or incomplete before using it as the active-feature decision.
   - When routing is stale but a single feature-level route is clear, continue the analysis on that feature and record the stale project-level memory as a finding to refresh.
   - Build a lightweight error-signal panel before the final PASS/FAIL decision:
     - open `Blocker`
     - high-impact open `Risk`
     - non-trivial `@t0`
     - `@r0`
     - unresolved references
     - stale memory
     - trace or acceptance breaks
     - blocking placeholders
     - failed checks
   - The panel is a routing and stability aid, not a heavy scoring system. State whether critical signals are reducing, unchanged, or increasing when prior evidence exists.
   - Use incremental review order before expanding to a full audit:
     - if implementation evidence or worker handoff exists, review `Delta Summary` first, then current diff, then task packet, then trace/open-items, then necessary source code
     - recently changed tasks, anchors, source docs, trace rows, and open-items
     - open `Todo`, `Risk`, `Blocker`, `Decision`, `@t0`, `@r0`, stale, or unchecked items
     - direct dependencies, direct acceptance paths, direct tests, and directly related source docs for those changed or open items
   - Do not deep recheck a completed category or workset when current evidence exists, no direct upstream contract dependency changed, no open item reopened, and no mechanical check failed. Perform a light consistency check and cite the existing evidence instead.
   - Deep recheck completed areas only when directly related source docs, public API contracts, data structures, permissions, acceptance paths, critical test evidence, routing, direct upstream contract dependencies, or related risks changed, or when the user requests a full audit.
   - Treat incremental review as a document-read optimization, not a verification downgrade. If the current task directly changed or affected dependencies, public contracts, data, permissions, acceptance paths, or critical tests, require local affected test/check/manual verification evidence when feasible. Route only broader regression or locally infeasible checks to CI/full verification.
   - Check consistency across `spec.md`, `clarifications.md`, `flows/*`, `ui/*`, `gate.md`, `bundle.md`, `plan.md`, `delivery/*`, and `tasks.md`.
   - Check implementation readiness without replacing its source of truth:
     - `plan.md` `Implementation Readiness` exists when implementation tasks are present
     - each ready workset has source layout, runtime commands, code mapping, test mapping, and workset code boundary evidence
     - `tasks.md` consumes readiness instead of inventing a conflicting readiness conclusion
     - route readiness findings with this if-then order:
       - if `tasks.md` contradicts `plan.md` `Implementation Readiness`, set the diagnostic verdict to `FAIL` and route to `/sp.plan`
       - if readiness is missing, stale, or cannot be safely evaluated from current documents, set `BLOCKED` and route to `/sp.plan` with the missing evidence
       - if the readiness gap depends on human product, risk, compliance, rollback, or scope choice, set `NEEDS_DECISION` and route to `/sp.clarify` for a decision package before returning to `/sp.plan`
       - otherwise report the conflict as stale or contradictory readiness and route to `/sp.plan`
   - Check task mode integrity:
     - every task or task group declares `Mode: doc` or `Mode: impl`, or missing mode is treated as `Mode: doc`
     - no `Mode: doc` task asks `/sp.implement` to write production code
     - every `Mode: impl` task has `Allowed Write Set`, `Required Checks`, trace anchors or explicit no-trace reason, and visible effective defaults
     - high-risk or code-continuation `Mode: impl` tasks have `Read Set`, `Dependencies Checked`, `Reverse Trace Checked`, `Expected Delta`, `Delta Summary`, and `Proposed Updates`, or a clear no-applicable reason
     - incomplete implementation packets route to `NEEDS_TASKS`; missing or wrong code boundary routes to `NEEDS_PLAN`
     - if a task is in `NEEDS_CONTEXT` state, treat it as a task-packet gap: route to `/sp.tasks` when the missing context can be recovered from existing documents, route to `/sp.plan` when the missing context is a workset or code-boundary problem, or return `NEEDS_DECISION` when human input is required
   - Verify coverage of IDs, owners, states, screens, APIs, tables, permissions, and acceptance paths.
   - Check Flow-UI relation integrity:
     - `sp.flow` artifacts that are treated as stable have upstream `Stage Readiness: READY_FOR_FLOW` from `spec.md` or feature memory
     - `sp.ui` artifacts that are treated as stable have upstream flow `Stage Readiness: READY_FOR_UI` from `flows/index.md` or feature memory
     - current UI artifacts that support downstream planning have UI `Stage Readiness: READY_FOR_PLAN`
     - missing, stale, mismatched, generic-template, `SP_STAGE_SEED`, `DRAFT_ONLY`, `WAITING_FOR_BATCH_REVIEW`, `NEEDS_CLARIFY`, `NEEDS_DECISION`, or `BLOCKED` readiness prevents diagnostic PASS and routes to the owner command
     - flow/UI readiness that uses `confirm_strategy: batch` must include `Batch ID`, `Batch Scope`, `Batch Review Status`, and the relevant confirmation document (`flow-confirmation.md` or `ui-confirmation.md`); review manifests, screenshots, HTML local state, or browser state are auxiliary review evidence only and cannot replace the authorization document. `WAITING_FOR_BATCH_REVIEW`, `NEEDS_REVISION`, stale status, consumed `needs_decision_items`, or consumed `unresolved_decision_items` cannot support diagnostic PASS, downstream readiness, risk closure, trace closure, or implementation readiness
     - readiness should include lightweight `Based On` plus `Source Snapshot` or `Evidence Signature`; minimum signature fields are `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`; do not use file mtime or raw hash as a hard gate because copy, Git, formatting, and regeneration noise can produce false stale signals
     - if the snapshot/signature does not match current source, trace, open-items, visual review, or gate/analyze evidence, report a stale/mismatch finding with the owner route; block diagnostic PASS when the mismatch affects stage entry, risk closure, trace closure, or implementation readiness
     - if confirmed human markers such as `[src:user-confirmed]`, `USER_CONFIRMED`, or `VERIFIED_BY_HUMAN` have no nearby decision record, report a finding and route to `/sp.clarify`; model-generated prose cannot prove human confirmation
     - critical flow steps have a node type: `ui`, `system`, `external`, `scheduled`, `manual`, or `none_ui`
     - critical flow steps have a lightweight port contract: input, precondition or permission, business action, output or side effect, target state, failure path, and verification or acceptance evidence
     - `ui` type flow steps link to at least one UI coordinate or an explicit open item
     - screens and critical UI actions trace back to a flow step, business event, data object, permission, API contract, acceptance path, or open item
     - UI-created actions do not invent business events, state transitions, side effects, permissions, or validation rules that are absent from `spec.md`, clarifications, flows, API/data docs, or open items
   - Check subject-scope integrity:
     - flow and UI artifacts model the target business application, not SP, SpecCompass, Spec Kit, command execution, memory management, preflight, gate, task routing, or methodology stages
     - classify any wrong-subject flow/UI output as `SUBJECT_CONFUSION`, with `Root Layer` set to `flow` or `ui` and owner route `/sp.flow` or `/sp.ui` after mandatory `spec.md` re-read
     - `SUBJECT_CONFUSION` is never a soft issue and must block diagnostic PASS because it is a direction error that propagates to downstream commands
   - Check Process Visualization UI:
     - UI screens must enable or inspect target business operations for target users; they must not primarily display workflow progress, flow step progress bars, state transition timelines, processing dashboards, workflow node activation panels, or flow diagrams as UI
     - allow Process Visualization UI only when `spec.md` explicitly requires workflow monitoring, process audit, orchestration, or operational status viewing as a product feature, and only when it is bound to business roles, data, permissions, and acceptance paths
     - classify unsupported Process Visualization UI as `SUBJECT_CONFUSION` or `GENERIC_ARTIFACT` and route to `/sp.ui` or `/sp.flow`
   - Check data-linkage constraints:
     - data object, table, field, state, permission, event, or persistence changes identify directly related UI fields, API contracts, permission rules, emitted side effects, acceptance paths, tests, trace rows, or open items
     - UI field, API parameter, permission behavior, or test-semantic changes identify the related flow node and data object
     - missing direct-neighbor relations are repaired in trace/source docs, routed to `memory/open-items.md`, or reported as blockers when they affect acceptance, tests, release, rollback, permissions, data safety, or human decisions
   - Check orphan relation objects. UI, API, TABLE, CODE, ACC, TEST, EVENT, and PERM anchors that belong to a business capability should trace to a `FLOW` coordinate, source document, or explicit open item.
   - Check `CODE` and `TEST` trace at the lightweight level:
     - high-risk public API handlers, permission rules, data migrations, event boundaries, core UI actions, and acceptance-critical tests should have formal `CODE` or `TEST` trace rows/fields or a tracked open item
     - ordinary private helpers and local glue code do not require anchors unless they became stable cross-document objects
     - trace rows pointing to missing files, renamed tests, or absent anchors are findings
     - normal trace warnings must be visible in task evidence, analysis, or `memory/open-items.md`; warnings that cross a stage unresolved or affect acceptance, tests, release, rollback, or human decisions become blockers
   - Check draft facts. Newly generated or refreshed outputs from `/sp.flow`, `/sp.ui`, or `/sp.plan` are draft facts until checked by `/sp.analyze`, `/sp.gate`, or equivalent current evidence. Draft facts cannot close risks, update stable trace conclusions, support PASS, or act as the sole implementation basis.
   - Check provenance of stable flow/UI facts. Stable flow nodes, decisions, events, UI contracts, screens, fields, actions, and states need source provenance such as `[SRC:SPEC-*]`, `[SRC:CLARIFY-*]`, `[SRC:FLOW-*]`, or an explicit `OPEN-*`. `[INFER:DRAFT]` and `Source: model-inferred` may appear only as draft proposal evidence and cannot support diagnostic PASS, readiness, risk closure, trace closure, or implementation readiness.
   - For early flow/UI work before `tasks.md` exists, equivalent current evidence means a bounded check that confirms the draft has source backing, did not rewrite stable memory, did not close risks, did not support PASS, and either has trace/open-item routing or stays labeled as draft. This is a draft-safety check only; it is not a PASS, not `Stage Readiness`, not gate evidence, and not full implementation-readiness analysis.
   - If the current question is only whether the latest summary is still reusable, do a summary-first check: compare feature/workset, gate mode, source snapshot/evidence signature label, and open-items state before rereading source docs. If those match and no decisive finding changed, reuse the summary instead of redoing the whole analysis.
   - Check coordinate depth. Main coordinates should stay at `FEATxx.WSxx.TYPExx`; deep micro IDs such as `FLOW01.STEP04`, `UI03.BTN05`, or `API02.FIELD03` should not appear as stable public coordinates unless a recurring cross-document object has been intentionally promoted.
   - Check feature memory link integrity:
   - Treat an empty `specs/<feature>/memory/open-items.md` table as valid when no real unresolved feature issue is present.
     - Before accepting an empty open-items table, scan the current read set for unresolved scope, acceptance, permissions, data, API, UI, event/side-effect, rollback, release, security/compliance, migration, external dependency, and test-evidence gaps only on the first analysis pass, when there is no current analysis/gate evidence, or when the current change directly touches those dimensions.
     - If `specs/<feature>/memory/open-items.md` exists, `Risk`, `Blocker`, High severity items, and broader-impact items must have `Anchor`, `Affected Docs`, `Close Condition`, `Last Refresh`, `Status`, and the required owner/impact/rollback fields.
     - Low or Medium local `Question` and `Todo` items may stay lightweight when they do not affect scope, acceptance, release, rollback, security, or implementation confidence; they still need enough location, status, and next-action detail for a later command to find and close them.
     - An open-item link is valid when its `Anchor` appears in `specs/<feature>/memory/trace-index.md` or one of its `Affected Docs` appears in a related trace row's `Expand Docs`.
     - Each local file path in a stable trace row's `Expand Docs` must exist in the feature directory. Missing files are `TRACE_EXPAND_DOC_MISSING` and block PASS until the trace is corrected, the file is restored, or the row is moved back to draft/open-item status.
     - If `@r0` appears in the current read set, confirm `specs/<feature>/memory/open-items.md` has a matching open `Risk` or `Blocker`. Otherwise report a blocking memory gap.
     - If non-trivial `@t0` appears in the current read set, confirm `specs/<feature>/memory/open-items.md` has a matching `Question`, `Todo`, or `Risk`. Treat `@t0` as non-trivial when it affects scope, acceptance, release, rollback, human decision, or follow-up work.
     - If a `Risk`, `Blocker`, High severity item, broader-impact item, or `@r0` was closed, deleted, accepted, deferred, downgraded, or invalidated in the current read set or diff evidence, confirm `Close Evidence` is present in `memory/open-items.md`: current verification, traceable code/doc change, rollback/degrade path, or explicit human acceptance.
     - If an open item cannot be traced through `Anchor` or `Affected Docs`, report it as a memory/trace break rather than guessing the missing link.
     - If the lightweight memory check reports `SUBJECT_CONFUSION_CONTROL_PLANE_TERM`, treat it as a hard subject-scope finding for the affected `flows/*` or `ui/*` artifact. Re-read `spec.md` and the relevant source docs before routing to `/sp.flow` or `/sp.ui`; do not reinterpret SP control-plane artifacts as business evidence. The only exception is the same narrow meta-product case the mechanical checker already applies: `spec.md` explicitly defines the target product as an SP/AI/developer/workflow/specification/process tool and the artifact has business-domain, role, source, acceptance, coordinate, or trace anchors. If the checker already emitted the finding, do not override it by prose alone.
     - If the lightweight memory check reports `OWNER_REVIEW_REQUIRED_MISSING`, treat it as a candidate warning, not an automatic diagnostic failure. Re-read `spec-outline.md`, PRD/source authority, and current risks; escalate to `NEEDS_DECISION` only when the outline actually depends on high-risk scope, source rebase, governance, compliance, real money/data, irreversible action, or owner acceptance. If `needsHumanReview=true` and no readable decision record exists, route to `/sp.clarify` in headless runs instead of assuming the warning is harmless.
   - Report feature-memory fact gaps directly. Do not invent abstract quality levels; list the missing files, anchors, close conditions, stale entries, or unresolved items that block later automation.
   - Check whether recent failures are being handled at the wrong layer. Use observable signals: repeated failure on the same task/acceptance/file area, implementation touching spec boundaries, unresolved task dependencies, missing acceptance, or contradictions across spec/plan/tasks/source docs.
   - Classify blockers before recommending retries or repairs:
     - `INFO_GAP`: resolve by bounded reading, summarization, or writeback from existing docs.
     - `SOURCE_AUTHORITY_GAP`: missing or stale PRD/user/legacy/external/source authority; route to source recovery or `/sp.specify` rebase instead of treating tests as a substitute.
     - `UPSTREAM_DOC_GAP`: source docs, flow, UI, bundle, plan, or tasks are incomplete or contradictory; route to the owner command.
     - `CODE_TEST_ONLY`: document inputs are sufficient, but evidence belongs to code/test/manual verification; require `Mode: impl` handoff rather than blocking document closeout.
     - `EXECUTION_INFRA`: timeout, empty response, exit 143, wrapper, host, CLI, permission, or network failure; isolate in fallback-log/failure-site reporting and block PASS only when required evidence depends on it.
     - `GENERIC_ARTIFACT`: flow/UI/delivery/task output is generic template language without concrete business behavior, source anchor, relation chain, or acceptance evidence; route to PRD/spec/flow/UI/plan and do not use it as PASS evidence.
     - `SUBJECT_CONFUSION`: flow/UI output models SP's own command interface, workflow stages, memory operations, routing, gates, or methodology mechanics instead of the target business application; route to `/sp.flow` or `/sp.ui` after re-reading `spec.md` and the relevant source documents.
     - `BUSINESS_DECISION`: risk acceptance, scope tradeoff, compliance, security, tenant isolation, delete/recovery, audit, rollback, or verification downgrade; return `NEEDS_DECISION` and route to `/sp.clarify`.
     - `ROUTING_STALE`: project memory, feature memory, workspace, or command target disagree; repair routing before continuing.
     - `SCOPE_CONFLICT`: requirements or acceptance conflict; route to `/sp.clarify`, then `/sp.specify` or `/sp.plan`.
   - For each real blocker, include `Blocker Type`, `Root Layer`, `Failure Signature`, smallest solvable unit, owner route, verification path, and `Writeback Target`. If one of these cannot be named, return `BLOCKED` or `NEEDS_DECISION` instead of recommending broad implementation.
   - Promote scattered blocker signals from analysis, plan, checklists, worklogs, runner output, or stale status summaries into `memory/open-items.md` when they are still real and stage-blocking. If the same `Failure Signature` is already tracked, cite the existing open item; if it is stale, mark it `INVALID_OR_STALE` with evidence.
   - Detect batch-run anti-loops. When the same `Failure Signature` appears across many modules, group it into one root blocker family and recommend the owner route once; do not propose repeated per-module reruns without new evidence.
   - Check document-stage code boundary:
     - document-stage closeout must not depend on unauthorized `src/`, `scripts/`, config, generated-code, schema, test-asset, or fixture artifacts
     - required code artifacts discovered during document work must appear as a next-stage `Mode: impl` code handoff packet with target file, reason, related anchor, `Allowed Write Set`, `Required Checks`, verification, writeback target, and next route
     - command success, generated documents, or exit code 0 are not business PASS when business acceptance, trace, open-items, data-linkage, code/test evidence, or gate verdict is still missing
   - Check multi-agent merge integrity when worker handoffs, subagent reports, parallel task notes, temp branches, or worktree evidence are present. Use the canonical worker handoff fields, worker status enum, dependency closure, fallback report fields, shared truth files, and global registry-like files from `sp-command-spec.md` §10.3:
     - multi-agent execution was justified by independent worksets, disjoint write sets, or context pressure; otherwise report unnecessary delegation as a process warning and check whether sequential recovery is needed
     - a baseline snapshot, clean-state record, current git `HEAD`, branch/worktree ref, or equivalent pre-dispatch evidence exists when worker diffs are being merged
     - every worker report names `Task / Workset`, `Status`, `Execution Environment`, `Allowed Write Set`, `Actual Files Changed`, `Anchors Affected`, `Inputs Read`, `Checks Run`, `Result`, `Evidence`, `Proposed Shared Updates`, `Open Items / Risks`, and `Merge Notes`
     - no worker changed `Forbidden Write Set`, coordinator-owned shared memory, trace, routing, broad status summaries, or global registry-like files without explicit permission
     - parallel write sets do not overlap unless a serialized closeout merged and verified the overlap
     - worker states are classified when anything went wrong: `ACCEPTABLE_LOCAL`, `NEEDS_SINGLE_AGENT_REVIEW`, `REJECTED_BOUNDARY_VIOLATION`, `STALE`, or `FAILED_CHECKS`
     - accepted worker outputs have dependency closure; a dependent result is acceptable only when every dependency is a merged, independently verifiable `ACCEPTABLE_LOCAL` worker
     - fallback output exists when any worker is stale, failed, unverifiable, out of bounds, conflicting, or dependent on a worker that does not satisfy all dependency-closure requirements (merged, independently verifiable, and classified `ACCEPTABLE_LOCAL`); missing fallback output blocks PASS
     - fallback recovery isolated or cleaned unverified and unauthorized worker diffs from the accepted recovery path, or recorded why cleanup is unsafe and routed to `BLOCKED`/`NEEDS_DECISION`
     - fallback reports use the canonical fields `Fallback Reason`, `affected worker classifications`, `changed files`, `evidence kept`, `discarded/deferred results`, `single-agent recovery route`, and `next /sp.* step`, and are persisted in a task note for task-local fallback or coordinator closeout output for batch-level fallback; fallback-log entries are additional loop evidence only when loop protection is required
     - proposed updates to `tasks.md`, `memory/open-items.md`, `memory/trace-index.md`, workset routing, and broad status summaries have been merged by one owner step or remain visibly open
     - check for conflicting Proposed Updates across multiple workers targeting the same anchor, open-item ID, task state, or global registry field; semantic conflicts between proposed changes must be identified before PASS
     - worker outputs do not contradict each other across UI actions, API contracts, data models, permissions, events, acceptance paths, trace anchors, or memory state
     - merged-state checks ran after integration when worker changes can interact
     - stale or abandoned workers, branches, or worktrees are identified; missing handoffs default to open/unassigned task state unless the coordinator has reliable evidence to accept or intentionally defer them
   - Check whether any workset is too large for stable automation. Flag areas only when evidence is strong:
     - any hard signal: distinct external system, release cadence, permission/data model, independent migration, irreversible data/security/compliance/rollback risk, or 2+ blocking open items affecting acceptance/release/rollback/security
     - or at least three warning signals: 3+ roles, 4+ user paths, 5+ artifact categories across UI/API/data/permissions/events/migration/external systems, 12+ trace anchors, 8+ core docs needed for one workset, or implementation expected across 8+ major files or 4+ module boundaries
   - Report conflicts, stale memory, missing links, and weak spots explicitly.
   - Apply the soft issue boundary before PASS: only low-risk warnings that do not affect routing, contracts, tests, acceptance, trace, `Blocker`, or high-impact `Risk` may proceed as warnings. Test/build/check failure, route error, acceptance break, critical trace break, open `Blocker`, or high-impact `Risk` without required fields blocks PASS.
   - Apply Blocker Closeout Mode when the user asks to solve/clear blockers, or when open `Blocker` / high-impact `Risk` items are discovered:
     - Treat `specs/<feature>/memory/open-items.md` as the single source of truth for unresolved blockers, risks, decisions, and close conditions. Do not create a second persistent blocker ledger.
     - Treat `specs/<feature>/memory/trace-index.md` as relation/history lookup only. If open-items and trace disagree about current blocker state, open-items wins until trace is refreshed.
     - Use a `Blocker Closeout` section in `analysis.md` as a report projection only.
     - For each relevant item, record source ID or origin, current evidence, action taken or required action, verification result, final item state, open-items update, and next `/sp.*` route.
     - For unresolved or repeatedly failing items, add a lightweight `Blocker Breakdown`: `Blocker ID`, `Failure Signature`, symptom, evidence, root layer (`prd`, `spec`, `clarify`, `flow`, `ui`, `data`, `plan`, `tasks`, `implement`, `verify`, `memory`, `external`, or `human-decision`), `Disconfirming Evidence`, smallest solvable unit, repair strategy, verification, `Writeback Target`, and next route.
     - Use this `Failure Signature` shape when possible: `<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>`. Keep it stable enough to detect repeated loops.
     - `Root Layer` and `Next Route` must agree. If routing differs from the root layer's normal owner, write the reason and risk instead of silently routing everything to implementation.
     - Before a second attempt on the same failure signature, require `Disconfirming Evidence`: the concrete output, file, test, or document evidence proving the first assumption was wrong or incomplete. If this field is empty, stop with `BLOCKED` instead of repeating the attempt.
     - If the item cannot be reduced to a smallest solvable unit, return `BLOCKED` or `NEEDS_DECISION` instead of continuing broad analysis. Route human choices to `/sp.clarify` or ask directly in plain language with background, impact, 2-4 options, recommendation, and next `/sp.*` route.
     - If unsure whether the lightweight blocker path applies, use the full blocker breakdown rather than summarizing the issue broadly.
     - Per-item states are limited to `RESOLVED`, `OPEN`, `DEFERRED_WITH_OWNER`, or `INVALID_OR_STALE`.
     - Do not mark diagnostic `PASS` from progress percentages, status summaries, or broad prose while any unresolved `OPEN` blocker remains.
     - Map remaining `OPEN` items to `FAIL` when repairable at the current layer, `BLOCKED` when safe automatic progress is impossible, or `NEEDS_DECISION` when a human choice is required.
     - High-risk `DEFERRED_WITH_OWNER` items cannot support `PASS` unless they have explicit acceptance or defer evidence, owner, impact scope, rollback/degrade path, close condition, and revisit anchor.
     - `/sp.analyze` may diagnose `NEEDS_DECISION`, but it cannot advance, close, or downgrade that decision without a human-selected decision record already written back to the source doc, task, or `memory/open-items.md`.
   - Treat implementation evidence as audit input, not final release evidence. Worker or `/sp.implement` self-reports must be checked against current files, current task state, and rerunnable checks when feasible before they support diagnostic PASS.
   - Completion Evidence Contract:
     - Before accepting a selected implementation task as complete, name the task/workset, checks actually run, result summary, unchecked scope, and remaining route.
     - If a required check was not run, require the reason and keep the task, risk, or gate item open unless an explicit accepted decision allows the downgrade.
     - Do not use model confidence, broad prose, or old check output as completion evidence.
   - Treat `Delta Summary` as the first implementation review surface, not as proof by itself. Confirm it against diff, selected task packet, direct trace/open-items, and necessary source/test evidence before it supports diagnostic PASS.
   - Do not mark PASS when delete, move, rename, public behavior, schema, permission, route, event, or acceptance changes lack `Reverse Trace Checked`, reverse-trace/search evidence, or a tracked open item.
   - Apply oscillation protection: if the same failure signature has already appeared twice at the same layer, or the same workset is bouncing between two layers without new evidence, return `NEEDS_DECISION` or `BLOCKED` with the failure chain, attempted routes, options, recommendation, and next `/sp.*` route.
   - When repeated failures or upward fallback are detected, read `specs/<feature>/memory/fallback-log.md` if it exists. If the current finding matches a recent failure signature and no new evidence changed the route, report `BLOCKED` or `NEEDS_DECISION` instead of re-auditing the same loop.
   - If analysis discovers a new repeated-failure route, append or propose a concise fallback-log entry with workset or anchor, command, failure signature, failed evidence, attempted routes, next recommended route, and this run's timestamp or run label.
   - Promote fallback-log entries or `promote-candidate` notes to `specs/<feature>/memory/open-items.md` when the same failure signature appears twice in the same workset, the fallback blocks stage entry, or the issue involves human decision, data migration, permissions, security, release, rollback, or worktree cleanup. If the signature was already promoted, cite the existing open item ID instead of creating a duplicate; otherwise mark the fallback-log entry as `promoted` and cite the open item ID so fallback-log does not become a second truth source.
   - Review Feedback Handling:
     - Classify each material review item as `valid`, `invalid`, `needs-info`, or `accepted-risk`.
     - `valid`: name the required fix, owner route, and verification.
     - `invalid`: cite code, source docs, tests, or current evidence; do not reject by assertion.
     - `needs-info`: name the missing fact and next route.
     - `accepted-risk`: require explicit human acceptance, impact scope, rollback/degrade path, owner, and revisit condition.
   - If the evidence shows the current layer is the wrong place to continue, do not keep auditing lower-level files. Record the source layer, target layer, reason, and exact next `/sp.*` step.
6. Record the result.
   - Create or update `specs/<feature>/analysis.md`.
   - Refresh related feature memory entries under `specs/<feature>/memory/*` when findings change routing, stable context, open-item status, or trace links.
   - When an area is accepted as already completed and evidence remains current, record only the light-check result or cite the existing evidence. Do not rewrite broad memory just to repeat unchanged facts.
7. Validate before finishing.
   - Confirm findings are evidence-based and traceable to current documents.
   - Confirm the diagnostic verdict is one of `PASS`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION` and is justified explicitly for analysis readiness only. This verdict does not replace `/sp.gate` stage-entry judgment.
   - Confirm missing required context is reported as `BLOCKED` with context details and the next `/sp.*` route, or `NEEDS_DECISION` when the missing context requires human choice. `NEEDS_CONTEXT` is an implementation/task fallback route, not a valid `/sp.analyze` verdict.
   - Confirm every `BLOCKED`, `NEEDS_DECISION`, `NEEDS_PLAN`, `NEEDS_TASKS`, `NEEDS_CONTEXT`, `DEFERRED_WITH_OWNER`, `FAIL`, non-ready `Stage Readiness`, unresolved blocker, rejected finding, blocked task, blocked workset, or human-decision route has a `Status Reason` of 10-30 Chinese characters (or equivalent short English phrase for English-language projects) directly after the status. The reason must name root cause and impact, not just say `blocked` or `missing info`.
   - Confirm the next blocking actions are clear.
   - Run the `Finish Quality Gate` before closeout:
     ```yaml
     Finish Quality Gate:
       model_fixable_issues: none | present
       human_blockers: none | present
       self_fix_rounds: 0-3
       quality_result: QUALITY_PASSED | CONTINUE_FIXING | HUMAN_BLOCKED | EXHAUSTED_BLOCKED
       evidence: <analysis findings, memory checks, current documents, and routing checks>
     ```
     Do not stop to report while model-fixable quality issues remain. Continue fixing analysis output gaps, missing evidence, missing `Status Reason`, unclassified blockers, stale owner routes, invalid verdict wording, incomplete blocker breakdowns, or report/writeback inconsistencies until `QUALITY_PASSED`, `HUMAN_BLOCKED`, or `EXHAUSTED_BLOCKED`. If the remaining gap is a human input or decision blocker such as risk acceptance, disputed split, source rebase choice, compliance/data choice, or verification downgrade, return `HUMAN_BLOCKED` with a 10-30 Chinese characters (or equivalent short English phrase for English-language projects) `Status Reason`, background, impact, options, recommendation, and owner route. CONTINUE_FIXING is an internal loop state; do not use it as the final output status of this command. If three self-fix rounds cannot resolve the same diagnostic quality issue, return `EXHAUSTED_BLOCKED` with the failure signature and next route.

## Output

- Create or update `specs/<feature>/analysis.md`
  - Include `Verdict`: `PASS`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION`.
  - If the analysis passes with low-risk warnings, write the formal `Verdict` as `PASS` and record the warnings separately. `PASS with warning` may be used only as prose in the report, not as the machine-readable verdict value.
  - Include `Memory Check Summary`: command used, timestamp or run label, feature/workset, gate modes covered, source snapshot or evidence signature label, open-items state, result status, `needsHumanReview`, ERROR count, WARN count, and decisive finding IDs or `none`.
  - Include evidence, findings, warnings, blockers, trace gaps, readiness/task-packet diagnostics, and the exact next `/sp.*` route when the verdict is not `PASS`.
  - Include `Blocker Closeout` when blocker cleanup is requested or relevant open blockers/high risks are found. This section must be a projection from `memory/open-items.md`, not a new source of truth.
- Refresh related feature memory entries under `specs/<feature>/memory/*` when findings change routing or stable context

## Key Rules

- Do not invent missing facts.
- Diagnostic verdicts here are `PASS`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION`: they mean the document, memory, trace, readiness, task-packet, and implementation-evidence analysis passed, failed, blocked automatic progress, or requires a human decision. They are not the final stage gate.
- `NEEDS_CONTEXT` is not a diagnostic verdict for `/sp.analyze`. If the missing context can be recovered by a task or implementation worker, route there; if it cannot be recovered safely here, use `BLOCKED`, or `NEEDS_DECISION` when a human choice is required.
- A task-level `NEEDS_CONTEXT` result is diagnostic evidence, not an analyze verdict. Report it as a task-packet or planning gap with the exact `/sp.tasks`, `/sp.plan`, or human-decision route.
- Do not mark PASS when major gaps, stale memory, or missing smoke checks remain.
- Do not mark PASS when open `Blocker` items remain.
- Do not mark PASS when a real blocker is unclassified, missing `Blocker Type`, missing owner route, or not written back/promoted/cited in `memory/open-items.md` when it affects stage entry.
- Do not mark PASS when project/feature routing is stale and the active target cannot be safely reconciled from current memory and source documents.
- Do not mark PASS when generic template artifacts are the only evidence for flow, UI, delivery, implementation readiness, or acceptance coverage.
- Do not mark PASS when required `Stage Readiness` is missing, stale, mismatched, or contradicted by current evidence.
- Do not mark PASS when required flow/UI batch confirmation is still `WAITING_FOR_BATCH_REVIEW`, `NEEDS_REVISION`, stale, or contains consumed `needs_decision_items` / `unresolved_decision_items`.
- Do not mark PASS when `/sp.flow` ran or produced stable flow facts without upstream `READY_FOR_FLOW`.
- Do not mark PASS when `/sp.ui` ran or produced stable UI facts without upstream `READY_FOR_UI`.
- Do not mark PASS when stable flow/UI facts lack source provenance, or when `[INFER:DRAFT]` / `Source: model-inferred` is used as stable evidence.
- Do not mark PASS when a required live check is blocked by `EXECUTION_INFRA`; isolate the execution issue, but do not turn the missing evidence into business PASS.
- Do not mark PASS from broad batch reruns when the same failure signature is repeating without new disconfirming evidence or owner-route repair.
- Do not treat blocker closeout as complete until each relevant item is `RESOLVED`, `INVALID_OR_STALE`, or explicitly accepted as `DEFERRED_WITH_OWNER` with owner, impact scope, rollback/degrade path, close condition, and revisit anchor.
- Do not replace blocker closeout with a progress report, percentage, or natural-language summary. Close or route each blocker one by one.
- Do not keep large unresolved blockers as broad themes. Split them into smallest solvable units, or route to `/sp.clarify` / direct human decision when the split depends on product, risk, compliance, rollback, scope, or verification choice.
- Do not mark PASS when critical flow steps are missing node type, port contract coverage, failure path, or verification route unless the missing part is explicitly routed through `memory/open-items.md`.
- Do not mark PASS when Flow-UI relation integrity is broken: `ui` type steps without UI coordinate or open item, orphan screens/actions without business source, UI actions inventing unsupported events or side effects, or acceptance paths without flow/UI/API/data/test evidence.
- Do not mark PASS when flow or UI artifacts contain `SUBJECT_CONFUSION`: screens, actions, fields, flow nodes, labels, or descriptions that model SP's own command interface, workflow stages, memory operations, routing, gates, or methodology mechanics instead of the target business application.
- Do not mark PASS when UI artifacts are unsupported Process Visualization UI: flow step progress views, state transition timelines, processing dashboards, workflow node activation panels, or flow diagrams used as UI without explicit product requirements and business-role/data/permission/acceptance binding.
- Do not mark PASS when unchecked draft facts from `/sp.flow`, `/sp.ui`, or `/sp.plan` are being used as stable memory, risk-closure evidence, trace closure, or stage-entry evidence.
- Do not mark PASS when `Mode: impl` tasks lack `Allowed Write Set`, `Required Checks`, task-packet effective defaults, or readiness from `plan.md`.
- Do not mark PASS when document-stage closeout depends on unauthorized code artifacts instead of a `Mode: impl` code handoff packet.
- Do not mark PASS from model prose, generated documents, command success, runner exit 0, or progress percentages. PASS needs current evidence appropriate to the phase, and high-impact blocker/risk closure needs `Close Evidence`.
- Do not mark PASS when direct data-linkage relations among flow, UI, API, permissions, events, acceptance, tests, trace, and open items are missing and affect acceptance, tests, release, rollback, permissions, data safety, or human decisions.
- Do not mark PASS when high-risk boundary `CODE` trace or acceptance-critical `TEST` trace is missing without a tracked open item, or when a normal trace warning has crossed the stage unresolved.
- Do not mark PASS solely from worker or implementation prose. Use current files and rerunnable checks when feasible.
- Do not mark PASS from a `Delta Summary` alone. It must match the current diff, task packet, direct trace/open-items, and required checks.
- Do not let this run's post-verdict writeback prove this run's PASS. Routing, status, open-items, or memory updates made by `/sp.analyze` must be supported by current inputs, current checks, upstream source documents, current code/test evidence, or explicit human decisions.
- Do not mark PASS when multi-agent work has unresolved worker handoffs, stale workers without a discard/defer decision, unmerged critical branches or reports, write-set overlap without closeout evidence, forbidden write violations, conflicting Proposed Shared Updates, or missing merged-state verification.
- Do not mark PASS when multi-agent fallback was triggered but no fallback report exists, worker states are unclassified, baseline evidence is missing, accepted worker outputs lack dependency closure, or unresolved worker results were silently folded into stable memory/trace/tasks/gate evidence.
- Do not mark PASS when open `Risk` items affect acceptance, release, data, security, rollback, or implementation confidence unless the analysis records owner, explicit human acceptance/defer decision, revisit anchor or exact next `sp.*` step, trace registration, impact scope, rollback/degrade path, and close condition.
- Low/Medium risks that do not block the next stage may receive diagnostic PASS with warning only when they are tracked in `specs/<feature>/memory/open-items.md` or the report, have owner, close condition, and revisit anchor, and do not require rewriting `spec.md`, `plan.md`, or `tasks.md` before safe continuation.
- When using diagnostic PASS with warning, keep the formal verdict field as `PASS`; warnings belong in findings, evidence, or open-items.
- Soft issues may be warnings only when they do not affect routing, contracts, tests, acceptance, trace, open `Blocker`, or high-impact `Risk`. Failed tests/build/checks, route errors, acceptance breaks, critical trace breaks, and high-risk items missing required fields are blockers, not warnings.
- Do not mark PASS when the next safe action requires upward fallback but the target layer, reason, and next `sp.*` step are not recorded.
- Do not mark PASS when an oversized workset must be promoted or split before reliable automation can continue.
- Do not mark PASS by prose alone when critical error signals are increasing. Record why they increased, whether they are acceptable warnings or blockers, and the next safe `/sp.*` route.
- Use mechanical evidence when available: active feature path exists, required source docs have no blocking placeholders, critical trace/source links resolve, relevant checks have current results, and open blockers/high risks are not explained away by prose.
- In headless or non-interactive runs, do not invent human approval. Return `NEEDS_DECISION` or `BLOCKED` when the result depends on human risk acceptance, disputed split, compliance/data decision, irreversible action, or hard-gate override. End the output with `SP_EXIT_CODE: 1` as a machine-readable blocker marker; if the host supports process exit control, also terminate with a non-zero exit status so automated runners cannot treat the diagnostic as a successful PASS.
- Before returning `BLOCKED` in headless automation, include a failure-site report with changed files, failed command/check result, current judgment, why automatic recovery is unsafe, and next `/sp.*` route.
- When human input is needed, explain the background, impact, 2-4 viable options, tradeoffs, recommendation, and next `/sp.*` route in plain language.
- Do not treat reminder dimensions as open items by themselves. Create or require `OPEN-*` / `RISK-*` entries only when current feature evidence shows a real unresolved issue.
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

End every run with a concrete closeout recommendation. Do not stop at "analysis complete", do not only list problems, and do not use vague phrasing such as "if a stage-entry decision is required". Give the user an answer in plain Chinese.

Before choosing the recommendation, reconcile the smallest relevant global state: `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, Stage Readiness, and this analysis evidence. If those sources are missing, stale, or conflicting, recommend `/sp.route all`, `/sp.clarify`, or the exact owner route instead of downstream work.

If the closeout names a numbered feature, module, or mainline such as `110-template-library-template-application`, include 1-3 short Chinese sentences explaining what it mainly does and why it matters. Base the description on memory, PRD, outline, Stage Readiness, or analysis evidence. If the role is not confirmed, say it is not confirmed and route to evidence repair or `/sp.route all`.

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

- If `PASS`, prefer `/sp.gate <feature>` when gate has not made the stage decision yet; say plainly that analyze is diagnostic evidence and does not authorize implementation.
- If `FAIL`, choose the exact owner route that repairs the failed source layer.
- If `BLOCKED`, include the failure-site report and recommend the smallest safe owner route.
- If `NEEDS_DECISION`, recommend `/sp.clarify <feature>` unless a current decision package and human-selected decision record already exists.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
