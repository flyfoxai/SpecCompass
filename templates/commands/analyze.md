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
2. Initialize analysis context.
   - Read project-level `.specify/memory/*` routing files first.
   - Reconcile project-level routing against `feature-map.md`, `specs/*/memory/index.md`, and the current workspace before deciding that no active feature exists.
   - Read feature-level `memory/*` routing files next.
   - Read the first-layer and second-layer core outputs needed to prove the current analysis question; expand further only when a gap, stale route, or contradiction requires evidence.
   - Keep a short internal read-set note for each finding: routing file, memory file, or source document that supports it. Output the read set only when it explains a failure, stale route, or requested audit detail.
3. Run the lightweight memory check when available.
   - Prefer the script matching the installed script family:
     - Bash: `.specify/scripts/bash/check-sp-memory.sh --json`
     - PowerShell: `.specify/scripts/powershell/check-sp-memory.ps1 -Json`
   - In command frontmatter, keep `scripts/...` because Specify CLI maps template script references into the installed project. In command body or manual model execution, `.specify/scripts/...` is the expected installed-project location. In a source checkout of this repository, `scripts/...` may be used only as a development fallback when `.specify/scripts/...` is absent.
   - Treat this as mechanical evidence only. It checks open-item fields, open blocker/risk visibility, trace links, and obvious `@t0` / `@r0` drift; it does not replace document analysis.
   - `ERROR` findings block PASS until fixed or routed upward with a clear next `/sp.*` step.
   - `WARN` findings do not automatically block PASS; confirm them against the current read set and record the decision when relevant.
4. Perform the analysis pass.
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
     - critical flow steps have a node type: `ui`, `system`, `external`, `scheduled`, `manual`, or `none_ui`
     - critical flow steps have a lightweight port contract: input, precondition or permission, business action, output or side effect, target state, failure path, and verification or acceptance evidence
     - `ui` type flow steps link to at least one UI coordinate or an explicit open item
     - screens and critical UI actions trace back to a flow step, business event, data object, permission, API contract, acceptance path, or open item
     - UI-created actions do not invent business events, state transitions, side effects, permissions, or validation rules that are absent from `spec.md`, clarifications, flows, API/data docs, or open items
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
   - For early flow/UI work before `tasks.md` exists, equivalent current evidence means a bounded check that confirms the draft has source backing, did not rewrite stable memory, did not close risks, did not support PASS, and either has trace/open-item routing or stays labeled as draft. This is a draft-safety check, not a full implementation-readiness analysis.
   - Check coordinate depth. Main coordinates should stay at `FEATxx.WSxx.TYPExx`; deep micro IDs such as `FLOW01.STEP04`, `UI03.BTN05`, or `API02.FIELD03` should not appear as stable public coordinates unless a recurring cross-document object has been intentionally promoted.
   - Check feature memory link integrity:
     - Treat an empty `specs/<feature>/memory/open-items.md` table as valid when no real unresolved feature issue is present.
     - Before accepting an empty open-items table, scan the current read set for unresolved scope, acceptance, permissions, data, API, UI, event/side-effect, rollback, release, security/compliance, migration, external dependency, and test-evidence gaps.
     - If `specs/<feature>/memory/open-items.md` exists, `Risk`, `Blocker`, High severity items, and broader-impact items must have `Anchor`, `Affected Docs`, `Close Condition`, `Last Refresh`, `Status`, and the required owner/impact/rollback fields.
     - Low or Medium local `Question` and `Todo` items may stay lightweight when they do not affect scope, acceptance, release, rollback, security, or implementation confidence; they still need enough location, status, and next-action detail for a later command to find and close them.
     - An open-item link is valid when its `Anchor` appears in `specs/<feature>/memory/trace-index.md` or one of its `Affected Docs` appears in a related trace row's `Expand Docs`.
     - If `@r0` appears in the current read set, confirm `specs/<feature>/memory/open-items.md` has a matching open `Risk` or `Blocker`. Otherwise report a blocking memory gap.
     - If non-trivial `@t0` appears in the current read set, confirm `specs/<feature>/memory/open-items.md` has a matching `Question`, `Todo`, or `Risk`. Treat `@t0` as non-trivial when it affects scope, acceptance, release, rollback, human decision, or follow-up work.
     - If `Blocker`, high-impact `Risk`, or `@r0` was closed, deleted, or downgraded in the current read set or diff evidence, confirm the close evidence is present: current verification, traceable code/doc change, rollback/degrade path, or explicit human acceptance.
     - If an open item cannot be traced through `Anchor` or `Affected Docs`, report it as a memory/trace break rather than guessing the missing link.
   - Report feature-memory fact gaps directly. Do not invent abstract quality levels; list the missing files, anchors, close conditions, stale entries, or unresolved items that block later automation.
   - Check whether recent failures are being handled at the wrong layer. Use observable signals: repeated failure on the same task/acceptance/file area, implementation touching spec boundaries, unresolved task dependencies, missing acceptance, or contradictions across spec/plan/tasks/source docs.
   - Check document-stage code boundary:
     - document-stage closeout must not depend on unauthorized `src/`, `scripts/`, config, generated-code, schema, test-asset, or fixture artifacts
     - required code artifacts discovered during document work must appear as a next-stage `Mode: impl` code handoff packet with target file, reason, related anchor, `Allowed Write Set`, `Required Checks`, verification, writeback target, and next route
     - command success, generated documents, or exit code 0 are not business PASS when business acceptance, trace, open-items, data-linkage, code/test evidence, or gate verdict is still missing
   - Check multi-agent merge integrity when worker handoffs, subagent reports, parallel task notes, temp branches, or worktree evidence are present:
     - every worker report names task/workset, allowed write set, files changed, inputs read, checks run, result, evidence, proposed shared-memory updates, open items, and merge notes
     - no worker changed `Forbidden Write Set`, coordinator-owned shared memory, trace, routing, broad status summaries, or global registry-like files without explicit permission
     - parallel write sets do not overlap unless a serialized closeout merged and verified the overlap
     - proposed updates to `tasks.md`, `memory/open-items.md`, `memory/trace-index.md`, workset routing, and broad status summaries have been merged by one owner step or remain visibly open
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
   - Treat `Delta Summary` as the first implementation review surface, not as proof by itself. Confirm it against diff, selected task packet, direct trace/open-items, and necessary source/test evidence before it supports diagnostic PASS.
   - Do not mark PASS when delete, move, rename, public behavior, schema, permission, route, event, or acceptance changes lack `Reverse Trace Checked`, reverse-trace/search evidence, or a tracked open item.
   - Apply oscillation protection: if the same failure signature has already appeared twice at the same layer, or the same workset is bouncing between two layers without new evidence, return `NEEDS_DECISION` or `BLOCKED` with the failure chain, attempted routes, options, recommendation, and next `/sp.*` route.
   - When repeated failures or upward fallback are detected, read `specs/<feature>/memory/fallback-log.md` if it exists. If the current finding matches a recent failure signature and no new evidence changed the route, report `BLOCKED` or `NEEDS_DECISION` instead of re-auditing the same loop.
   - If analysis discovers a new repeated-failure route, append or propose a concise fallback-log entry with workset or anchor, command, failure signature, failed evidence, attempted routes, next recommended route, and this run's timestamp or run label.
   - Promote fallback-log entries or `promote-candidate` notes to `specs/<feature>/memory/open-items.md` when the same failure signature appears twice in the same workset, the fallback blocks stage entry, or the issue involves human decision, data migration, permissions, security, release, rollback, or worktree cleanup. If the signature was already promoted, cite the existing open item ID instead of creating a duplicate; otherwise mark the fallback-log entry as `promoted` and cite the open item ID so fallback-log does not become a second truth source.
   - If the evidence shows the current layer is the wrong place to continue, do not keep auditing lower-level files. Record the source layer, target layer, reason, and exact next `/sp.*` step.
5. Record the result.
   - Create or update `specs/<feature>/analysis.md`.
   - Refresh related feature memory entries under `specs/<feature>/memory/*` when findings change routing, stable context, open-item status, or trace links.
   - When an area is accepted as already completed and evidence remains current, record only the light-check result or cite the existing evidence. Do not rewrite broad memory just to repeat unchanged facts.
6. Validate before finishing.
   - Confirm findings are evidence-based and traceable to current documents.
   - Confirm the diagnostic verdict is one of `PASS`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION` and is justified explicitly for analysis readiness only. This verdict does not replace `/sp.gate` stage-entry judgment.
   - Confirm missing required context is reported as `BLOCKED` with context details and the next `/sp.*` route, or `NEEDS_DECISION` when the missing context requires human choice. `NEEDS_CONTEXT` is an implementation/task fallback route, not a valid `/sp.analyze` verdict.
   - Confirm the next blocking actions are clear.

## Output

- Create or update `specs/<feature>/analysis.md`
  - Include `Verdict`: `PASS`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION`.
  - If the analysis passes with low-risk warnings, write the formal `Verdict` as `PASS` and record the warnings separately. `PASS with warning` may be used only as prose in the report, not as the machine-readable verdict value.
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
- Do not treat blocker closeout as complete until each relevant item is `RESOLVED`, `INVALID_OR_STALE`, or explicitly accepted as `DEFERRED_WITH_OWNER` with owner, impact scope, rollback/degrade path, close condition, and revisit anchor.
- Do not replace blocker closeout with a progress report, percentage, or natural-language summary. Close or route each blocker one by one.
- Do not keep large unresolved blockers as broad themes. Split them into smallest solvable units, or route to `/sp.clarify` / direct human decision when the split depends on product, risk, compliance, rollback, scope, or verification choice.
- Do not mark PASS when critical flow steps are missing node type, port contract coverage, failure path, or verification route unless the missing part is explicitly routed through `memory/open-items.md`.
- Do not mark PASS when Flow-UI relation integrity is broken: `ui` type steps without UI coordinate or open item, orphan screens/actions without business source, UI actions inventing unsupported events or side effects, or acceptance paths without flow/UI/API/data/test evidence.
- Do not mark PASS when unchecked draft facts from `/sp.flow`, `/sp.ui`, or `/sp.plan` are being used as stable memory, risk-closure evidence, trace closure, or stage-entry evidence.
- Do not mark PASS when `Mode: impl` tasks lack `Allowed Write Set`, `Required Checks`, task-packet effective defaults, or readiness from `plan.md`.
- Do not mark PASS when document-stage closeout depends on unauthorized code artifacts instead of a `Mode: impl` code handoff packet.
- Do not mark PASS when direct data-linkage relations among flow, UI, API, permissions, events, acceptance, tests, trace, and open items are missing and affect acceptance, tests, release, rollback, permissions, data safety, or human decisions.
- Do not mark PASS when high-risk boundary `CODE` trace or acceptance-critical `TEST` trace is missing without a tracked open item, or when a normal trace warning has crossed the stage unresolved.
- Do not mark PASS solely from worker or implementation prose. Use current files and rerunnable checks when feasible.
- Do not mark PASS from a `Delta Summary` alone. It must match the current diff, task packet, direct trace/open-items, and required checks.
- Do not let this run's post-verdict writeback prove this run's PASS. Routing, status, open-items, or memory updates made by `/sp.analyze` must be supported by current inputs, current checks, upstream source documents, current code/test evidence, or explicit human decisions.
- Do not mark PASS when multi-agent work has unresolved worker handoffs, stale workers without a discard/defer decision, unmerged critical branches or reports, write-set overlap without closeout evidence, forbidden write violations, conflicting proposed memory updates, or missing merged-state verification.
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

- If `PASS`, the document/readiness/task-packet/evidence set is diagnostically ready for the relevant next step; use `/sp.gate` when a stage-entry decision is required.
- If `FAIL`, point to the exact `sp.*` step that must be revisited.
- If `BLOCKED`, include the failure-site report and the exact next `/sp.*` route.
- If `NEEDS_DECISION`, route to `/sp.clarify` to generate or complete the decision package unless a current package and human-selected decision record already exists. Explain the background, impact, 2-4 options, recommendation, and next `/sp.*` route; do not treat the model recommendation as the final decision.
