---
description: Decide whether the current SP stage is stable enough to move forward.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-spec
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

## Pre-Execution Checks

**Check for extension hooks (before gate)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_gate` key.
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

    Wait for the result of the hook command before proceeding to the gate decision.
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

# /sp.gate

Use this command when the user wants to decide whether the current SP stage is stable enough to move forward.

Global rules:
- Stay within gate-decision work only: this command may decide business, delivery, implementation-readiness, or implementation-regression passage, but it must not edit production code.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Manage context as an engineering budget: start from routing, gate inputs, latest analysis, and open items; expand only to the source documents needed to decide `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION`.

## Purpose

- Decide whether the current stage is stable enough to move forward.
- Supported gate modes:
  - `Business Gate`: first-layer scope, clarification, flow, UI, acceptance stability.
  - `Delivery Gate`: bundle, worksets, trace, and planning stability.
  - `Implementation Readiness Gate`: whether `plan.md` `Implementation Readiness` and `tasks.md` packets allow safe `Mode: impl` execution.
  - `Implementation Regression Gate`: whether implemented changes have current, independently checkable evidence for the next stage.

## Read First

- Read `.specify/memory/project-index.md`, `specs/<feature>/memory/index.md`, and `specs/<feature>/memory/open-items.md`.
- Read the latest `specs/<feature>/analysis.md` when present. Use it as diagnostic evidence; do not silently recompute the whole analysis unless the gate evidence is stale, contradictory, or missing.
- Default to an incremental gate path: consume current `analysis.md`, reuse its `Memory Check Summary` when it is current, verify decisive evidence, open blockers/risks, changed or stale items, and current checks needed for the gate mode. Do not expand into broad analyze-like checks; if the missing evidence cannot be checked as one small decisive gate question, return the next `/sp.analyze` route.
- Read the first-layer outputs needed for this gate decision. Expand further only when a gap, stale route, or contradiction requires evidence.

## Stage Entry Preflight

- Confirm routing identifies one active feature and the requested gate mode can be decided from current upstream evidence.
- Confirm required gate inputs exist for the requested mode: source docs for Business Gate, bundle/plan/task evidence for Delivery or Implementation Readiness Gate, and current implementation/check evidence for Implementation Regression Gate.
- Check whether user input changes requirements, acceptance, flow, UI, plan, tasks, implementation boundary, risk acceptance, or verification standard. If so, old gate evidence is stale; stop and route to the owner command before deciding PASS.
- If `analysis.md` is missing, stale, contradictory, too narrow, lacks a current `Memory Check Summary`, or depends on unchecked draft facts, route to `/sp.analyze` unless the gate can decide a smaller current `FAIL`, `BLOCKED`, or `NEEDS_DECISION` directly.
- Use a bounded evidence loop: decide one smallest gate question per round, record the decisive evidence or missing evidence, and stop with `BLOCKED` or `NEEDS_DECISION` when the same `Failure Signature` or `blocker-signature` repeats twice without new evidence, a smaller unit, or a changed owner route.
- Debug Evidence Loop:
  - Reproduce or locate the failure evidence.
  - State the current hypothesis and the smallest check that can disconfirm it.
  - Apply the smallest gate finding or route decision only after the check points to a cause.
  - A second attempt on the same Failure Signature must cite disconfirming evidence from the first attempt.
  - Two attempts without new evidence stop local repair and route upward.
- If preflight fails, report `Missing/Weak Artifact`, `Blocker Type`, `Root Layer`, `Owner Route`, `Why current command cannot continue`, `Next /sp.* route`, and `Writeback Target`. Do not treat command success, generated docs, or exit code 0 as business PASS.
- Use incremental review order before expanding to a full audit:
  - if implementation evidence or worker handoff exists, review `Delta Summary` first, then current diff, then task packet, then trace/open-items, then necessary source code
  - recently changed tasks, anchors, source docs, trace rows, and open-items
  - open `Todo`, `Risk`, `Blocker`, `Decision`, `@t0`, `@r0`, stale, or unchecked items
  - direct dependencies, direct acceptance paths, direct tests, and directly related source docs for those changed or open items
- Do not deep recheck a completed category or workset when current evidence exists, no direct upstream contract dependency changed, no open item reopened, and no mechanical check failed. Perform a light consistency check and cite the existing evidence instead.
- Deep recheck completed areas only when directly related source docs, public API contracts, data structures, permissions, acceptance paths, critical test evidence, routing, direct upstream contract dependencies, or related risks changed, or when the user requests a full audit.
- Treat incremental review as a document-read optimization, not a verification downgrade. If the current task directly changed or affected dependencies, public contracts, data, permissions, acceptance paths, or critical tests, require local affected test/check/manual verification evidence when feasible. Route only broader regression or locally infeasible checks to CI/full verification.
- Reuse the latest `analysis.md` `Memory Check Summary` when it is current for the same feature/workset, gate mode, source snapshot/evidence signature label, and open-items state. The summary should include run_id or timestamp, gate modes covered, result status, `needsHumanReview`, ERROR/WARN counts, and decisive finding IDs. Run the lightweight memory check only when the summary is missing, stale, contradicted by current evidence, the requested gate mode is not covered, or needed to decide one whitelisted small gate question:
  - Bash: `.specify/scripts/bash/check-sp-memory.sh --json`
  - PowerShell: `.specify/scripts/powershell/check-sp-memory.ps1 -Json`
  - In command frontmatter, keep `scripts/...` because Specify CLI maps template script references into the installed project. In command body or manual model execution, `.specify/scripts/...` is the expected installed-project location. In a source checkout of this repository, `scripts/...` may be used only as a development fallback when `.specify/scripts/...` is absent.
  - Use it as mechanical evidence for open-item fields, open blockers/risks, trace links, trace `Expand Docs` file liveness, obvious `@t0` / `@r0` drift, and obvious flow/ui subject-confusion control-plane terms.
  - `ERROR` findings block PASS until fixed or routed upward with a clear next `/sp.*` step.
  - `WARN` findings do not automatically block PASS; confirm them against the current read set and record the decision when relevant.
  - If the lightweight memory check sets `needsHumanReview=true`, treat it as a machine-readable review hint. It does not auto-fail, but a headless or non-interactive gate must either cite a readable decision record or return `NEEDS_DECISION`/`BLOCKED` instead of granting PASS.

## Gate Small-Check Whitelist

`/sp.gate` may decide a small direct `FAIL`, `BLOCKED`, or `NEEDS_DECISION` without rerunning `/sp.analyze` only for:

- routing correctness
- open blocker or high-risk open-item existence
- required `Stage Readiness` state
- required `Evidence Signature` or source snapshot presence
- required decision-record presence
- direct evidence explicitly named by the current gate mode

If the gate would need to rediscover Flow-UI relation integrity, orphan anchors, port contracts, source authority, implementation readiness, broad trace consistency, or semantic business correctness, return the next `/sp.analyze` or owner-command route instead of doing the audit inside `/sp.gate`.

## Do

- Evaluate whether the feature has enough stable scope, flow, UI, and clarification coverage.
- Identify blocking gaps, conflicts, stale memory, and revisit steps.
- Use current `analysis.md` as the normal source for detailed flow/UI/trace diagnostics. Do not redo the full `/sp.analyze` relation audit by default.
- Perform only a decisive evidence check by default: current verdict, unresolved blockers/high risks, stale analysis signals, failed checks, task/readiness contradictions, and direct evidence for the gate mode.
- Verify Flow-UI relation integrity only at the gate-decision level. If current `analysis.md` already shows critical flow port-contract gaps, broken Flow-UI links, unsupported Process Visualization UI, subject-scope integrity failures, or `SUBJECT_CONFUSION`, those findings cannot support PASS. If the gate would need to rediscover them from scratch, route to `/sp.analyze`.
- Check detailed FLOW node, Flow-UI, orphan anchor, or coordinate-depth evidence only when it is the decisive gate question already covered by current `analysis.md`, or when one small direct check can decide `FAIL`, `BLOCKED`, or `NEEDS_DECISION`. If the gate would need to re-audit flow/UI relation integrity, port contracts, orphan anchors, coordinate depth, or broad trace consistency, return `/sp.analyze` instead of doing a full audit inside `/sp.gate`.
- When checking Flow-UI evidence, also verify subject-scope integrity. Flow/UI artifacts must model the target business application, not SP, SpecCompass, Spec Kit, command execution, memory management, preflight, gate, task routing, or methodology stages. Wrong-subject artifacts are `SUBJECT_CONFUSION` blockers.
- Keep coordinate-depth evidence shallow when it is decisive for the gate: stable public coordinates should look like `FEATxx.WSxx.TYPExx`; deep micro IDs such as `FLOW01.STEP04` or `UI03.BTN05` should not become stable public coordinates unless `/sp.analyze` has current evidence that a recurring cross-document object truly needs promotion.
- Verify Stage Readiness before using flow/UI artifacts as gate evidence: stable flow requires upstream `READY_FOR_FLOW`; stable UI requires upstream `READY_FOR_UI`; downstream planning evidence requires UI `READY_FOR_PLAN`. Missing, stale, mismatched, `SP_STAGE_SEED`, generic-template, `DRAFT_ONLY`, `WAITING_FOR_BATCH_REVIEW`, `NEEDS_CLARIFY`, `NEEDS_DECISION`, or `BLOCKED` readiness blocks PASS and routes to the owner command.
- When flow/UI uses `confirm_strategy: batch`, require `Batch ID`, `Batch Scope`, `Batch Review Status`, and the relevant confirmation document (`flow-confirmation.md` or `ui-confirmation.md`) before PASS. Review manifests, screenshots, HTML local state, or browser state are auxiliary review evidence only and cannot replace the authorization document. `WAITING_FOR_BATCH_REVIEW`, `NEEDS_REVISION`, stale status, consumed `needs_decision_items`, or consumed `unresolved_decision_items` cannot support PASS, CONDITIONAL, risk closure, trace closure, or implementation readiness unless the unresolved part has been explicitly split into a child batch and dependencies are recorded.
- Stage Readiness should include `Based On` plus `Source Snapshot` or `Evidence Signature`. Minimum signature fields are `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Do not use file mtime or raw hash as a hard gate. If the signature is missing, stale, or mismatched, block PASS only when the mismatch affects stage entry, PASS evidence, risk closure, trace closure, or implementation readiness; otherwise record it as a warning with a memory/source refresh route.
- Block PASS when human-confirmed markers such as `[src:user-confirmed]`, `USER_CONFIRMED`, or `VERIFIED_BY_HUMAN` are used as evidence but have no nearby traceable decision record. Route to `/sp.clarify` or keep the item open.
- Block PASS when UI artifacts are unsupported Process Visualization UI: flow step progress views, state transition timelines, processing dashboards, workflow node activation panels, or flow diagrams used as UI without explicit `spec.md` requirements and business-role/data/permission/acceptance binding.
- Treat unchecked outputs from `/sp.flow`, `/sp.ui`, and `/sp.plan` as draft facts. They may explain current direction but cannot support PASS, close a risk, or replace stable source evidence until analyzed or otherwise verified.
- Block PASS when stable flow/UI evidence lacks source provenance such as `[SRC:SPEC-*]`, `[SRC:CLARIFY-*]`, `[SRC:FLOW-*]`, or an explicit `OPEN-*`. `[INFER:DRAFT]` and `Source: model-inferred` can support draft review only; they cannot support PASS, stage readiness, risk closure, trace closure, or implementation readiness.
- Draft-safety checks are not PASS evidence. A bounded check that a draft did not rewrite memory, close risks, or claim readiness may support continued drafting, but it must not be promoted into gate PASS, `Stage Readiness`, risk closure, or implementation readiness.
- Treat `OWNER_REVIEW_REQUIRED_MISSING` from the lightweight memory check as a candidate warning. It becomes blocking only when current evidence shows the stage decision depends on high-risk scope, source rebase, governance, compliance, real money/data, irreversible action, or owner acceptance that has not been recorded. If the checker reports `needsHumanReview=true` and the gate cannot find a decision record, route to `/sp.clarify` in headless runs.
- Treat command success, generated documents, and exit code 0 as tool evidence only. They do not prove business PASS without acceptance, trace, open-item, data-linkage, code/test evidence, and a gate verdict.
- Summarize the current error signals before deciding: open `Blocker`, high-impact open `Risk`, non-trivial `@t0`, `@r0`, unresolved references, stale memory, trace/acceptance breaks, blocking placeholders, and failed checks. This is a lightweight stability panel, not a heavy score.
- Identify whether the current layer is the wrong place to continue. If safe progress requires moving upward to spec, plan, tasks, or human decision, record the fallback target and block unconditional PASS.
- For `Implementation Readiness Gate`, verify that `plan.md` `Implementation Readiness` is the source of truth and that `tasks.md` only consumes it. If readiness is missing, stale, or contradicted by open blockers, missing runtime commands, missing code/test mapping, or incomplete workset code boundaries, return `BLOCKED` or `NEEDS_DECISION` with the next `/sp.plan` route.
- Do not create a second Implementation Readiness fact in `gate.md`. Quote or reference the current `plan.md` readiness row and record only the gate decision, evidence, conditions, blockers, and next route.
- For `Implementation Readiness Gate`, verify every proposed `Mode: impl` task has `Allowed Write Set`, `Required Checks`, effective defaults, and trace anchors or explicit no-trace reason. Missing task packet fields route to `/sp.tasks`; missing code boundary routes to `/sp.plan`.
- For `Implementation Readiness Gate`, verify high-risk or code-continuation `Mode: impl` tasks also have `Read Set`, `Dependencies Checked`, `Reverse Trace Checked`, `Expected Delta`, `Delta Summary`, and `Proposed Updates`, or a clear no-applicable reason. Missing continuation fields route to `/sp.tasks` unless `plan.md` is missing the code-boundary or dependency surface, in which case route to `/sp.plan`.
- For `Implementation Regression Gate`, treat `/sp.implement` evidence as audit input, not release evidence. Rerun or independently check critical tests/build/lint/typecheck/manual verification when feasible before PASS.
- Completion Evidence Contract:
  - Before accepting a selected implementation task or workset as complete, name the task/workset, checks actually run, result summary, unchecked scope, and remaining route.
  - If a required check was not run, require the reason and keep the task, risk, or gate item open unless an explicit accepted decision allows the downgrade.
  - Do not use model confidence, broad prose, or old check output as completion evidence.
- For `Implementation Regression Gate`, block PASS when high-risk boundary `CODE` trace or acceptance-critical `TEST` trace is missing without an open item, or when a normal trace warning has crossed the stage unresolved.
- For `Implementation Regression Gate`, treat `Delta Summary` as the first review surface and verify it against current diff, task packet, direct trace/open-items, and required checks before PASS.
- Block PASS when delete, move, rename, public behavior, schema, permission, route, event, or acceptance changes lack reverse-trace/search evidence or an explicit open item that explains the missing evidence.
- Block PASS when a document-stage closeout depends on unauthorized `src/`, `scripts/`, config, generated-code, schema, test-asset, or fixture artifacts. Required code work must be represented as a next-stage `Mode: impl` code handoff packet with target file, reason, anchor, `Allowed Write Set`, `Required Checks`, verification, writeback target, and next route.
- Block PASS when direct-neighbor data-linkage relations are missing for changes to data objects, tables, fields, states, permissions, events, persistence behavior, UI fields, API contracts, acceptance paths, or tests, and the missing relation affects acceptance, tests, release, rollback, permissions, data safety, or human decisions.
- Apply the soft issue boundary before PASS or CONDITIONAL: only low-risk warnings that do not affect routing, contracts, tests, acceptance, trace, `Blocker`, or high-impact `Risk` may proceed as warnings. Test/build/check failure, route error, acceptance break, critical trace break, open `Blocker`, or high-impact `Risk` without required fields blocks PASS.
- Apply Blocker Closeout Mode before PASS or CONDITIONAL when blocker cleanup is requested or when open `Blocker` / high-impact `Risk` items exist:
  - Treat `specs/<feature>/memory/open-items.md` as the single source of truth. `gate.md` may include a `Blocker Closeout` section, but it is only the gate decision's report projection.
  - Treat `specs/<feature>/memory/trace-index.md` as relation/history lookup only. If trace and open-items disagree about current blocker or decision state, use open-items as current-state truth and require trace refresh as a writeback item.
  - Block PASS when stable trace `Expand Docs` references missing local files. Missing trace targets are not proof that the object is gone; they require trace correction, source restoration, or a next-stage handoff/open item.
  - Consume current `/sp.analyze` closeout diagnostics when available; otherwise check the decisive blocker evidence directly without doing a full analysis rerun.
  - Confirm each real blocker has a `Blocker Type`: `INFO_GAP`, `SOURCE_AUTHORITY_GAP`, `UPSTREAM_DOC_GAP`, `CODE_TEST_ONLY`, `EXECUTION_INFRA`, `GENERIC_ARTIFACT`, `SUBJECT_CONFUSION`, `BUSINESS_DECISION`, `ROUTING_STALE`, or `SCOPE_CONFLICT`.
  - Use `SUBJECT_CONFUSION` when flow/UI output models SP's own command interface, workflow stages, memory operations, routing, gates, or methodology mechanics instead of the target business application.
  - Treat `ROUTING_STALE`, unresolved `SOURCE_AUTHORITY_GAP`, unresolved `GENERIC_ARTIFACT`, unresolved `BUSINESS_DECISION`, and unresolved `SCOPE_CONFLICT` as hard blockers for PASS. Use `FAIL` when a normal upstream command can repair it, `BLOCKED` when safe automatic progress is impossible, and `NEEDS_DECISION` when human choice is required.
  - Treat `CODE_TEST_ONLY` as a stage-boundary result: document gates may close only if the required code/test work is represented as a next-stage `Mode: impl` handoff with allowed write set, checks, trace anchor, writeback target, and next route.
  - Treat `EXECUTION_INFRA` separately from business defects. It does not rewrite requirements, but PASS is forbidden when the failed execution is the required evidence for this gate.
  - Confirm unresolved or repeatedly failing items have a lightweight `Blocker Breakdown`: `Blocker ID`, `Failure Signature`, symptom, evidence, root layer, `Disconfirming Evidence` when retrying, smallest solvable unit, repair strategy, verification, `Writeback Target`, and next route.
  - Confirm `Root Layer` and `Next Route` are consistent. If they are not, require the reason and risk before allowing `CONDITIONAL`; otherwise return `FAIL`, `BLOCKED`, or `NEEDS_DECISION`.
  - If a blocker remains too broad to execute or verify, do not grant PASS or CONDITIONAL. Return `FAIL` when it can be repaired by a normal upstream command, `BLOCKED` when safe automatic progress is impossible, or `NEEDS_DECISION` when human choice is required.
  - Per-item closeout states are limited to `RESOLVED`, `OPEN`, `DEFERRED_WITH_OWNER`, or `INVALID_OR_STALE`.
  - Remaining `OPEN` items map to `FAIL` when repairable by a normal upstream command, `BLOCKED` when safe automatic progress is impossible, or `NEEDS_DECISION` when a human choice is required.
  - `DEFERRED_WITH_OWNER` can support `CONDITIONAL` only when explicit acceptance/defer evidence, real owner, impact scope, rollback/degrade path, close condition, and revisit anchor are present.
  - Progress percentages, status briefs, or broad prose cannot replace blocker-by-blocker closeout evidence.
  - If any `Writeback Target` from blocker closeout is incomplete, do not grant PASS. Either finish the writeback or keep a `memory/open-items.md` blocker that names written targets, missing targets, reason, and next route.
  - If unresolved `NEEDS_DECISION` freeze exists for the same blocker, do not grant PASS or advance the stage. A model recommendation is not enough; the human-selected decision must be written back to the source doc, task, or `memory/open-items.md`.
- Route upgraded issues with this if-then order:
  - if the upgraded issue is a repairable evidence, consistency, task-packet, or verification gap, return `FAIL` and route to `/sp.analyze`, `/sp.tasks`, or `/sp.plan` as the nearest owner
  - if the upgraded issue is missing scope, acceptance, flow, UI behavior, or user intent, return `BLOCKED` or `NEEDS_DECISION` and route to `/sp.clarify`
  - if the upgraded issue is missing code boundary, runtime command, workset split, or implementation readiness, return `BLOCKED` and route to `/sp.plan`
  - if the upgraded issue is risk acceptance, compliance/data choice, rollback/degrade choice, disputed split, irreversible action, or hard-gate override, return `NEEDS_DECISION` and route to `/sp.clarify` for a decision package
- Apply oscillation protection: if the same failure signature has already appeared twice at the same layer, or the same workset is bouncing between two layers without new evidence, return `NEEDS_DECISION` or `BLOCKED` with the failure chain, attempted routes, options, recommendation, and next `/sp.*` route.
- Use `specs/<feature>/memory/fallback-log.md` when present to detect cross-command loops. If the same workset or anchor has already bounced through the recommended fallback route without new evidence, do not grant PASS or repeat the same route; return `BLOCKED` or `NEEDS_DECISION` with the failure chain and options.
- When the gate sends work upward because of repeated failure, append or propose a fallback-log entry with workset or anchor, command, failure signature, failed evidence, attempted routes, next recommended route, and this run's timestamp or run label.
  Promote repeated, stage-blocking, decision-bound, data/permission/security/release/rollback, or worktree-cleanup fallback entries or `promote-candidate` notes into `memory/open-items.md`; if the signature was already promoted, cite the existing open item ID instead of creating a duplicate, otherwise mark the fallback-log entry as `promoted` with the open item ID.
- When multi-agent work occurred, verify coordinator closeout before PASS or CONDITIONAL using the canonical hard gates, worker handoff fields, worker status enum, dependency closure, fallback report fields, shared truth files, and global registry-like files from `sp-command-spec.md` §10.3: missing delegation justification is recorded as a process warning; pre-dispatch baseline evidence such as current git `HEAD`, branch/worktree ref, clean-state record, or equivalent evidence exists when worker diffs are merged; all worker handoffs are present, intentionally deferred, or marked stale/abandoned with task state reopened; write-set violations are resolved; conflicting Proposed Updates targeting the same anchor, open-item, task, or registry field are identified and resolved; shared memory/task/trace/routing updates were merged serially; global registry-like changes were handled by one owner; accepted worker results have dependency closure; fallback cleanup isolated or removed unverified/unauthorized diffs from the accepted recovery path when fallback occurred; and merged-state checks ran where worker outputs can interact.
- When observable worker/coordinator evidence shows that any worker failed, timed out, returned empty/unverifiable output, touched forbidden files, overlapped another worker, or depended on a worker that does not satisfy all dependency-closure requirements (merged, independently verifiable, and classified `ACCEPTABLE_LOCAL`), require a fallback report before PASS or CONDITIONAL. The report must state `Fallback Reason`, `affected worker classifications`, `changed files`, `evidence kept`, `discarded/deferred results`, `single-agent recovery route`, and `next /sp.* step`, and must be persisted in a task note for task-local fallback or coordinator closeout output for batch-level fallback; fallback-log entries are additional loop evidence only when loop protection is required.
- Review Feedback Handling:
  - Classify each material review item as `valid`, `invalid`, `needs-info`, or `accepted-risk`.
  - `valid`: name the required fix, owner route, and verification.
  - `invalid`: cite code, source docs, tests, or current evidence; do not reject by assertion.
  - `needs-info`: name the missing fact and next route.
  - `accepted-risk`: require explicit human acceptance, impact scope, rollback/degrade path, owner, and revisit condition.
- Identify only business-layer complexity that is already visible before delivery planning: independent user goals, 3+ roles, 4+ user paths, external systems, separate release/compliance constraints, or blockers that prevent stable scope. Do not decide API/table/event/migration-based promotion at gate; leave those delivery-layer signals for `sp.plan` or `sp.analyze`.
- Treat gate complexity as a pre-planning business signal only. Delivery-level split signals such as API, table, event, migration, code-boundary, or test-boundary complexity remain owned by `sp.plan`, `sp.tasks`, and `sp.analyze` using the shared complex-part threshold.
- Evaluate `specs/<feature>/memory/open-items.md` before deciding:
  - `Blocker` with `Status=Open` prevents PASS.
  - `Risk` with `Status=Open` prevents unconditional PASS unless the gate records an explicit human accept/defer/degrade decision, owner, revisit anchor or next `sp.*` step, trace registration, impact scope, rollback/degrade path, and close condition.
  - `Todo` with `Status=Open` cannot be ignored when it affects acceptance, release, data migration, security/compliance, rollback, or implementation confidence.
  - Any unresolved item prevents PASS when its answer would require rewriting `spec.md`, `plan.md`, or `tasks.md` before the current stage can continue.
  - `@r0` in any current read-set document must resolve to an open `Risk` or `Blocker` entry.
  - Non-trivial `@t0` must resolve to a `Question`, `Todo`, or `Risk` entry when it affects scope, acceptance, release, rollback, human decision, or follow-up work.
  - Closing, deleting, accepting, deferring, downgrading, or invalidating `Risk`, `Blocker`, High severity item, broader-impact item, or `@r0` must have `Close Evidence` in `memory/open-items.md`: current verification evidence, a traceable code/doc change, rollback/degrade path, or explicit human acceptance. If diff evidence is available, check that the state change and its evidence changed together.
- Record a clear `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION` result with evidence.
- Treat `/sp.gate` as the stage-entry decision point. It may use `/sp.analyze` diagnostics as evidence, but it must make its own `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION` judgment.
- Do not fully redo `/sp.analyze` by default. Consume current analysis, verify decisive evidence, and make the stage decision. If analysis is missing or stale, return the next `/sp.analyze` route unless the gate can decide from smaller current evidence.
- `PASS with warning` is not a valid gate verdict. Low-risk warnings may be recorded under Evidence, Accepted Risks, or Blocking Items as applicable, but the formal gate verdict must remain one of the five gate values.
- Use mechanical evidence when available: active feature path exists, required source docs have no blocking placeholders, critical trace/source links resolve, relevant checks have current results, and open blockers/high risks are not explained away by prose.
- In headless or non-interactive runs, do not invent human approval. Return `NEEDS_DECISION` or `BLOCKED` when the result depends on human risk acceptance, disputed split, compliance/data decision, irreversible action, or hard-gate override. End the output with `SP_EXIT_CODE: 1` as a machine-readable blocker marker; if the host supports process exit control, also terminate with a non-zero exit status so automated runners cannot treat the gate as a successful PASS.
- Before returning `BLOCKED` in headless automation, include a failure-site report with changed files, failed command/check result, current judgment, why automatic recovery is unsafe, and next `/sp.*` route.
- When human input is needed, explain the background, impact, 2-4 viable options, tradeoffs, recommendation, and next `/sp.*` route in plain language.
- Refresh project and feature routing memory if gate results change the active focus or risk surface.

## Do Not

- Do not hide blockers behind optimistic language.
- Do not mark PASS when major route decisions remain open.
- Do not mark PASS when an open blocker remains.
- Do not mark PASS when any stage-blocking issue lacks a blocker classification, owner route, smallest solvable unit, or writeback target.
- Do not mark PASS when stale routing leaves the active feature, workset, or owner command ambiguous.
- Do not mark PASS when source authority is missing and the gate relies on tests, generated summaries, or model confidence as a substitute.
- Do not mark PASS when generic template artifacts are being used as evidence for specific business flow, UI, delivery, task, or acceptance behavior.
- Do not mark PASS when required `Stage Readiness` is missing, stale, mismatched, or contradicted by current evidence.
- Do not mark PASS when required flow/UI batch confirmation is still `WAITING_FOR_BATCH_REVIEW`, `NEEDS_REVISION`, stale, or contains consumed `needs_decision_items` / `unresolved_decision_items`.
- Do not mark PASS when required `Stage Readiness` lacks a current `Source Snapshot` or `Evidence Signature` and the missing signature prevents proving stage entry, risk closure, trace closure, or implementation readiness.
- Do not mark PASS when `/sp.flow` ran or produced stable flow facts without upstream `READY_FOR_FLOW`.
- Do not mark PASS when `/sp.ui` ran or produced stable UI facts without upstream `READY_FOR_UI`.
- Do not mark PASS when a human decision is required but no human-selected decision record has been written back.
- Do not mark PASS when execution infrastructure failure prevents required evidence from being produced. Record it as `EXECUTION_INFRA`, include the failure-site report, and return `BLOCKED` or `FAIL` as appropriate.
- Do not mark PASS after broad/batch reruns when the same failure signature is repeating and the root blocker family has not been repaired or routed.
- Do not mark PASS when a critical flow step is missing node type, port contract coverage, failure path, or verification route unless the gap is explicitly tracked in `memory/open-items.md` and the verdict is FAIL or CONDITIONAL with a safe next route.
- Do not mark PASS when Flow-UI relation integrity is broken: `ui` type steps without UI coordinate or open item, orphan screens/actions without business source, UI actions inventing unsupported events or side effects, or acceptance paths without flow/UI/API/data/test evidence.
- Do not mark PASS when `ui/*` or `flows/*` artifacts contain `SUBJECT_CONFUSION`: screens, actions, fields, flow nodes, labels, or descriptions that model SP's own command interface, workflow stages, memory operations, routing, gates, or methodology mechanics instead of the target business application.
- Do not mark PASS when UI/screens primarily visualize process, workflow, state progression, or flow diagrams instead of supporting target business operations, unless that product capability is explicitly required by `spec.md` and backed by flow, role, data, permission, and acceptance evidence.
- Do not mark PASS when unchecked draft facts from `/sp.flow`, `/sp.ui`, or `/sp.plan` are being used as stable memory, risk-closure evidence, trace closure, or stage-entry evidence.
- Do not mark PASS when `[INFER:DRAFT]` or `Source: model-inferred` is being used as stable flow/UI evidence, stage readiness evidence, risk closure, trace closure, or implementation readiness evidence.
- Do not mark PASS when document-stage work committed or relies on unauthorized code artifacts instead of handing them off as `Mode: impl` work.
- Do not mark PASS from command success, generated documents, status summaries, or exit code 0 when business evidence is still missing.
- Do not mark PASS from model prose, generated documents, command success, runner exit 0, or progress percentages. PASS needs current evidence appropriate to the gate mode, and high-impact blocker/risk closure needs `Close Evidence`.
- Do not let this run's post-verdict writeback prove this run's PASS. Gate updates to routing, status, open-items, or memory must be supported by current inputs, current checks, upstream source documents, current code/test evidence, current analysis, or explicit human decisions.
- Do not mark PASS after multi-agent work when worker handoffs are unresolved, a stale or abandoned worker has no discard/defer/reassign decision, a critical worker branch/report is unmerged, a forbidden write violation remains, shared memory or trace was edited by multiple workers without coordinator closeout, conflicting Proposed Updates targeting the same object remain unresolved, or merged-state verification is missing.
- Do not mark PASS after multi-agent fallback when the fallback report is missing, worker states are unclassified, baseline evidence is missing, dependency closure for accepted local results is unproven, or unverifiable worker work was folded into stable memory/trace/tasks/gate evidence.
- Do not mark PASS solely because a risk is known. Known risk still needs owner, explicit human acceptance/defer decision, trace registration, impact scope, rollback/degrade path, close condition, and revisit anchor.
- Do not mark PASS from `Delta Summary` alone. It must be checked against current diff, selected task packet, direct trace/open-items, and required verification evidence.
- Do not mark PASS when a remaining open item would force `spec.md`, `plan.md`, or `tasks.md` to be rewritten before safe continuation.
- Do not mark PASS when the feature needs upward fallback or complex-part promotion and the next layer/next `sp.*` step is not explicit.
- Do not mark PASS by prose alone when critical error signals are increasing or unresolved. Either close them with evidence, accept/defer them with explicit human decision where allowed, or return `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION` with the next safe route.
- Do not treat build/test/check failures, route errors, acceptance breaks, critical trace breaks, open blockers, or high-impact risks missing required fields as soft issues.
- Do not drift into second-layer delivery design, implementation planning, or code writing. Route missing planning to `/sp.plan`, missing task packets to `/sp.tasks`, missing diagnostics to `/sp.analyze`, and unclear business intent to `/sp.clarify`.

## Output

- Create or update `specs/<feature>/gate.md`
  - Include `Gate Mode`: Business, Delivery, Implementation Readiness, or Implementation Regression.
  - Include `Verdict`: `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION`.
  - Include `Evidence`: source documents or memory entries that justify the verdict.
  - For Implementation Readiness Gate, cite `plan.md` `Implementation Readiness` as the source of truth instead of restating a separate readiness conclusion.
  - Include `Blocker Closeout` when blocker cleanup is requested or when unresolved blockers/high risks affect the decision.
  - Include `Blocking Items`: relevant `OPEN-*`, `RISK-*`, blocker, or `None`.
  - Include `Error Signals`: current blocker/risk/validation/stale-memory/trace-break summary and whether critical signals are reducing, unchanged, or increasing when prior evidence exists.
  - Include `Accepted Risks`: accepted or deferred risks with owner, impact scope, rollback/degrade path, close condition, and revisit anchor, or `None`.
  - Include `Fallback Target`: exact upstream layer and next `/sp.*` step when safe progress requires fallback, or `None`.
  - Include `Next Step`: the next safe command or human decision.
- Refresh `.specify/memory/feature-map.md` when status changes
- Refresh `.specify/memory/active-context.md` when focus changes
- Refresh `specs/<feature>/memory/open-items.md`
- Refresh `specs/<feature>/memory/index.md`

## Check Before Finish

- Confirm the decision is explicit and evidence-based.
- Confirm each blocker points to the exact `sp.*` step that must be revisited.
- Confirm blocker closeout does not create a second persistent ledger beside `memory/open-items.md`.
- Confirm each blocker has `Blocker Type`, `Root Layer`, `Failure Signature`, smallest solvable unit, owner route, verification path, and `Writeback Target`.
- Confirm every `FAIL`, `CONDITIONAL`, `BLOCKED`, `NEEDS_DECISION`, `NEEDS_PLAN`, `NEEDS_TASKS`, `NEEDS_CONTEXT`, `DEFERRED_WITH_OWNER`, non-ready `Stage Readiness`, unresolved blocker, rejected gate condition, blocked task, blocked workset, or human-decision route has a `Status Reason` of 10-30 Chinese characters (or equivalent short English phrase for English-language projects) directly after the status. The reason must explain root cause and impact, not merely restate that the item is blocked.
- Confirm `CODE_TEST_ONLY` items discovered during document-stage work are represented as `Mode: impl` handoff packets instead of unauthorized code artifacts.
- Confirm `EXECUTION_INFRA` items are isolated from business requirements and are promoted to open-items only when they block stage evidence.
- Confirm every blocker/high-risk item relevant to this gate has one of `RESOLVED`, `OPEN`, `DEFERRED_WITH_OWNER`, or `INVALID_OR_STALE`.
- Confirm each upward fallback decision names the source layer, target layer, and next `sp.*` step.
- Confirm blocker writeback is complete. If not, the gate result cannot be PASS and must leave a writeback-incomplete open item.
- Confirm no unresolved `NEEDS_DECISION` freeze remains without a human-selected decision record written back to source docs, tasks, or `memory/open-items.md`.
- Confirm critical flow port-contract gaps and Flow-UI relation breaks are either closed with evidence or visible in `memory/open-items.md`.
- Confirm data-linkage gaps across flow, UI, API, data, permissions, events, acceptance, tests, trace, and open items are closed, tracked, or blocking with a next route.
- Confirm document-stage outputs did not stage/commit unauthorized code artifacts, and any required code artifacts are represented as `Mode: impl` handoff packets.
- Confirm no unchecked draft flow, UI, or plan fact is being used as PASS evidence.
- If multi-agent work occurred, confirm coordinator closeout is complete: handoffs reviewed, baseline evidence checked, diffs merged serially, shared memory/task/trace/routing updates reconciled, conflicts recorded, dependency closure checked for accepted results, fallback report recorded when needed, and required merged-state checks run.
- If the gate detects business-layer signals that may require splitting, record them as a recommendation for `sp.plan`; do not decide delivery-layer promotion granularity at gate.
- Confirm open items are still visible after the gate decision.
- Confirm every open risk or conditional pass cites the affected `OPEN-*` or `RISK-*` item, close condition, and revisit step.
- Run the `Finish Quality Gate` before closeout:
  ```yaml
  Finish Quality Gate:
    model_fixable_issues: none | present
    human_blockers: none | present
    self_fix_rounds: 0-3
    quality_result: QUALITY_PASSED | CONTINUE_FIXING | HUMAN_BLOCKED | EXHAUSTED_BLOCKED
    evidence: <gate inputs, analysis freshness, blocker state, and decisive checks>
  ```
  Do not stop to report while model-fixable quality issues remain. Continue fixing missing gate evidence, stale analysis routing, missing `Status Reason`, incomplete blocker closeout, invalid verdict wording, missing `Next Step`, missing affected open-item IDs, or contradictory gate output until `QUALITY_PASSED`, `HUMAN_BLOCKED`, or `EXHAUSTED_BLOCKED`. If the remaining gap is a human input or decision blocker such as risk acceptance, hard-gate override, disputed split, irreversible action, compliance/data choice, or verification downgrade, return `HUMAN_BLOCKED` with a 10-30 Chinese characters (or equivalent short English phrase for English-language projects) `Status Reason`, background, impact, options, recommendation, and owner route. CONTINUE_FIXING is an internal loop state; do not use it as the final output status of this command. If three self-fix rounds cannot resolve the same gate quality issue, return `EXHAUSTED_BLOCKED` with the failure signature and next route.

## Post-Execution Checks

**Check for extension hooks (after gate)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_gate` key.
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

End every run with a concrete closeout recommendation. Do not only say that the gate passed, failed, or is conditional. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.

Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, gate verdict, Stage Readiness, and this gate evidence. If gate evidence is missing, stale, or conflicting, recommend `/sp.analyze`, `/sp.clarify`, or the exact owner route instead of downstream work.

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

- If `PASS`, recommend the next authorized stage command, normally `/sp.bundle <feature>` for a business gate or the appropriate downstream `/sp.*` route for later gate modes.
- If `FAIL`, recommend the required earlier owner step.
- If `CONDITIONAL`, recommend the exact safe route named in `Next Step`; do not recommend the downstream stage until the condition is closed or explicitly accepted.
- If `BLOCKED` or `NEEDS_DECISION`, include the failure-site or decision summary and recommend `/sp.clarify <feature>` unless a current package and human-selected decision record already exists.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
