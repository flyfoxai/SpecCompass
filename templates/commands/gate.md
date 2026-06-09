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
- Default to an incremental gate path: consume current `analysis.md`, verify decisive evidence, open blockers/risks, changed or stale items, and current checks needed for the gate mode. Expand into broader analyze-like checks only when analysis is missing, stale, contradictory, or too narrow to justify the gate decision.
- Read the first-layer outputs needed for this gate decision. Expand further only when a gap, stale route, or contradiction requires evidence.
- Use incremental review order before expanding to a full audit:
  - recently changed tasks, anchors, source docs, trace rows, and open-items
  - open `Todo`, `Risk`, `Blocker`, `Decision`, `@t0`, `@r0`, stale, or unchecked items
  - direct dependencies, direct acceptance paths, direct tests, and directly related source docs for those changed or open items
- Do not deep recheck a completed category or workset when current evidence exists, no direct upstream contract dependency changed, no open item reopened, and no mechanical check failed. Perform a light consistency check and cite the existing evidence instead.
- Deep recheck completed areas only when directly related source docs, public API contracts, data structures, permissions, acceptance paths, critical test evidence, routing, direct upstream contract dependencies, or related risks changed, or when the user requests a full audit.
- Treat incremental review as a document-read optimization, not a verification downgrade. If the current task directly changed or affected dependencies, public contracts, data, permissions, acceptance paths, or critical tests, require local affected test/check/manual verification evidence when feasible. Route only broader regression or locally infeasible checks to CI/full verification.
- Run the lightweight memory check when available:
  - Bash: `.specify/scripts/bash/check-sp-memory.sh --json`
  - PowerShell: `.specify/scripts/powershell/check-sp-memory.ps1 -Json`
  - In command frontmatter, keep `scripts/...` because Specify CLI maps template script references into the installed project. In command body or manual model execution, `.specify/scripts/...` is the expected installed-project location. In a source checkout of this repository, `scripts/...` may be used only as a development fallback when `.specify/scripts/...` is absent.
  - Use it as mechanical evidence for open-item fields, open blockers/risks, trace links, and obvious `@t0` / `@r0` drift.
  - `ERROR` findings block PASS until fixed or routed upward with a clear next `/sp.*` step.
  - `WARN` findings do not automatically block PASS; confirm them against the current read set and record the decision when relevant.

## Do

- Evaluate whether the feature has enough stable scope, flow, UI, and clarification coverage.
- Identify blocking gaps, conflicts, stale memory, and revisit steps.
- Use current `analysis.md` as the normal source for detailed flow/UI/trace diagnostics. Do not redo the full `/sp.analyze` relation audit by default.
- Perform only a decisive evidence check by default: current verdict, unresolved blockers/high risks, stale analysis signals, failed checks, task/readiness contradictions, and direct evidence for the gate mode.
- Expand into detailed FLOW node, Flow-UI, orphan anchor, or coordinate-depth checks only when `analysis.md` is missing, stale, contradicted by current evidence, or does not cover the gate's blocking question. In that fallback path, Verify Flow-UI relation integrity, critical flow port-contract gaps, and shallow public coordinates such as `FEATxx.WSxx.TYPExx` or `FEAT01.WS02.UI03`; deep local IDs such as `FLOW01.STEP04` or `UI03.BTN05` should not appear as stable public coordinates unless intentionally promoted. If this expansion is needed and cannot stay small, return the next `/sp.analyze` route instead of doing a full audit inside `/sp.gate`.
- Treat unchecked outputs from `/sp.flow`, `/sp.ui`, and `/sp.plan` as draft facts. They may explain current direction but cannot support PASS, close a risk, or replace stable source evidence until analyzed or otherwise verified.
- Summarize the current error signals before deciding: open `Blocker`, high-impact open `Risk`, non-trivial `@t0`, `@r0`, unresolved references, stale memory, trace/acceptance breaks, blocking placeholders, and failed checks. This is a lightweight stability panel, not a heavy score.
- Identify whether the current layer is the wrong place to continue. If safe progress requires moving upward to spec, plan, tasks, or human decision, record the fallback target and block unconditional PASS.
- For `Implementation Readiness Gate`, verify that `plan.md` `Implementation Readiness` is the source of truth and that `tasks.md` only consumes it. If readiness is missing, stale, or contradicted by open blockers, missing runtime commands, missing code/test mapping, or incomplete workset code boundaries, return `BLOCKED` or `NEEDS_DECISION` with the next `/sp.plan` route.
- Do not create a second Implementation Readiness fact in `gate.md`. Quote or reference the current `plan.md` readiness row and record only the gate decision, evidence, conditions, blockers, and next route.
- For `Implementation Readiness Gate`, verify every proposed `Mode: impl` task has `Allowed Write Set`, `Required Checks`, effective defaults, and trace anchors or explicit no-trace reason. Missing task packet fields route to `/sp.tasks`; missing code boundary routes to `/sp.plan`.
- For `Implementation Regression Gate`, treat `/sp.implement` evidence as audit input, not release evidence. Rerun or independently check critical tests/build/lint/typecheck/manual verification when feasible before PASS.
- For `Implementation Regression Gate`, block PASS when high-risk boundary `CODE` trace or acceptance-critical `TEST` trace is missing without an open item, or when a normal trace warning has crossed the stage unresolved.
- Apply the soft issue boundary before PASS or CONDITIONAL: only low-risk warnings that do not affect routing, contracts, tests, acceptance, trace, `Blocker`, or high-impact `Risk` may proceed as warnings. Test/build/check failure, route error, acceptance break, critical trace break, open `Blocker`, or high-impact `Risk` without required fields blocks PASS.
- Route upgraded issues with this if-then order:
  - if the upgraded issue is a repairable evidence, consistency, task-packet, or verification gap, return `FAIL` and route to `/sp.analyze`, `/sp.tasks`, or `/sp.plan` as the nearest owner
  - if the upgraded issue is missing scope, acceptance, flow, UI behavior, or user intent, return `BLOCKED` or `NEEDS_DECISION` and route to `/sp.clarify`
  - if the upgraded issue is missing code boundary, runtime command, workset split, or implementation readiness, return `BLOCKED` and route to `/sp.plan`
  - if the upgraded issue is risk acceptance, compliance/data choice, rollback/degrade choice, disputed split, irreversible action, or hard-gate override, return `NEEDS_DECISION` and route to `/sp.clarify` for a decision package
- Apply oscillation protection: if the same failure signature has already appeared twice at the same layer, or the same workset is bouncing between two layers without new evidence, return `NEEDS_DECISION` or `BLOCKED` with the failure chain, attempted routes, options, recommendation, and next `/sp.*` route.
- Use `specs/<feature>/memory/fallback-log.md` when present to detect cross-command loops. If the same workset or anchor has already bounced through the recommended fallback route without new evidence, do not grant PASS or repeat the same route; return `BLOCKED` or `NEEDS_DECISION` with the failure chain and options.
- When the gate sends work upward because of repeated failure, append or propose a fallback-log entry with workset or anchor, command, failure signature, failed evidence, attempted routes, next recommended route, and this run's timestamp or run label.
- When multi-agent work occurred, verify coordinator closeout before PASS or CONDITIONAL: all worker handoffs are present, intentionally deferred, or marked stale/abandoned with task state reopened; write-set violations are resolved; shared memory/task/trace/routing updates were merged serially; global registry-like changes were handled by one owner; and merged-state checks ran where worker outputs can interact.
- Identify only business-layer complexity that is already visible before delivery planning: independent user goals, 3+ roles, 4+ user paths, external systems, separate release/compliance constraints, or blockers that prevent stable scope. Do not decide API/table/event/migration-based promotion at gate; leave those delivery-layer signals for `sp.plan` or `sp.analyze`.
- Treat gate complexity as a pre-planning business signal only. Delivery-level split signals such as API, table, event, migration, code-boundary, or test-boundary complexity remain owned by `sp.plan`, `sp.tasks`, and `sp.analyze` using the shared complex-part threshold.
- Evaluate `specs/<feature>/memory/open-items.md` before deciding:
  - `Blocker` with `Status=Open` prevents PASS.
  - `Risk` with `Status=Open` prevents unconditional PASS unless the gate records an explicit human accept/defer/degrade decision, owner, revisit anchor or next `sp.*` step, trace registration, impact scope, rollback/degrade path, and close condition.
  - `Todo` with `Status=Open` cannot be ignored when it affects acceptance, release, data migration, security/compliance, rollback, or implementation confidence.
  - Any unresolved item prevents PASS when its answer would require rewriting `spec.md`, `plan.md`, or `tasks.md` before the current stage can continue.
  - `@r0` in any current read-set document must resolve to an open `Risk` or `Blocker` entry.
  - Non-trivial `@t0` must resolve to a `Question`, `Todo`, or `Risk` entry when it affects scope, acceptance, release, rollback, human decision, or follow-up work.
  - Closing, deleting, or downgrading `Blocker`, high-impact `Risk`, or `@r0` must have current verification evidence, a traceable code/doc change, rollback/degrade path, or explicit human acceptance. If diff evidence is available, check that the state change and its evidence changed together.
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
- Do not mark PASS when a critical flow step is missing node type, port contract coverage, failure path, or verification route unless the gap is explicitly tracked in `memory/open-items.md` and the verdict is FAIL or CONDITIONAL with a safe next route.
- Do not mark PASS when Flow-UI relation integrity is broken: `ui` type steps without UI coordinate or open item, orphan screens/actions without business source, UI actions inventing unsupported events or side effects, or acceptance paths without flow/UI/API/data/test evidence.
- Do not mark PASS when unchecked draft facts from `/sp.flow`, `/sp.ui`, or `/sp.plan` are being used as stable memory, risk-closure evidence, trace closure, or stage-entry evidence.
- Do not let this run's post-verdict writeback prove this run's PASS. Gate updates to routing, status, open-items, or memory must be supported by current inputs, current checks, upstream source documents, current code/test evidence, current analysis, or explicit human decisions.
- Do not mark PASS after multi-agent work when worker handoffs are unresolved, a stale or abandoned worker has no discard/defer/reassign decision, a critical worker branch/report is unmerged, a forbidden write violation remains, shared memory or trace was edited by multiple workers without coordinator closeout, or merged-state verification is missing.
- Do not mark PASS solely because a risk is known. Known risk still needs owner, explicit human acceptance/defer decision, trace registration, impact scope, rollback/degrade path, close condition, and revisit anchor.
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
- Confirm each upward fallback decision names the source layer, target layer, and next `sp.*` step.
- Confirm critical flow port-contract gaps and Flow-UI relation breaks are either closed with evidence or visible in `memory/open-items.md`.
- Confirm no unchecked draft flow, UI, or plan fact is being used as PASS evidence.
- If multi-agent work occurred, confirm coordinator closeout is complete: handoffs reviewed, diffs merged serially, shared memory/task/trace/routing updates reconciled, conflicts recorded, and required merged-state checks run.
- If the gate detects business-layer signals that may require splitting, record them as a recommendation for `sp.plan`; do not decide delivery-layer promotion granularity at gate.
- Confirm open items are still visible after the gate decision.
- Confirm every open risk or conditional pass cites the affected `OPEN-*` or `RISK-*` item, close condition, and revisit step.

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

- If `PASS`, suggest the next stage command, normally `/sp.bundle` for a business gate or the appropriate downstream `/sp.*` route for later gate modes.
- If `FAIL`, point back to the required earlier step.
- If `CONDITIONAL`, point to the exact next safe `/sp.*` route or human decision named in `Next Step`. Do not suggest the downstream stage until the condition is closed or explicitly accepted.
- If `BLOCKED` or `NEEDS_DECISION`, include the failure-site or decision summary. When human input is required, route to `/sp.clarify` to generate or complete the decision package unless a current package and human-selected decision record already exists; include 2-4 options, the recommendation, and the exact next `/sp.*` route without treating the recommendation as the final decision.
