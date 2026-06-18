---
description: Bind worksets, deliverables, code boundaries, and acceptance items into executable doc or implementation tasks.
handoffs:
  - label: Analyze Document Set
    agent: sp.analyze
    prompt: Verify whether the full document system is strong enough for later automation.
    send: true
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-plan
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequirePlan
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before tasks generation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_tasks` key.
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

# /sp.tasks

## Outline

Goal: Bind worksets, deliverables, ownership, code boundaries, and acceptance items into executable doc or implementation tasks that remain traceable to the active feature plan.

Global rules:
- Stay within task-generation work only: this command may create `Mode: doc` and `Mode: impl` tasks, but it must not edit production code.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Manage context as an engineering budget: start from routing, plan, worksets, trace, and open items; expand only to the delivery docs needed to make executable tasks.

Execution flow:

1. Run `{SCRIPT}` from repo root once and parse the active feature routing.
2. Run Stage Entry Preflight before task generation.
   - Confirm routing identifies one active feature/workset and `plan.md` is current enough to generate tasks.
   - Confirm `plan.md` contains usable worksets and `Implementation Readiness` for any `Mode: impl` task that may be generated.
   - Check whether user input changes product goal, requirements, acceptance, flow, UI, workset split, code boundary, allowed write set, required checks, or parallel boundary. Route to the owner command before generating tasks if the change belongs upstream.
   - If task generation would need to invent readiness, code landing, runtime commands, allowed write sets, source facts, or human decisions, stop and route to `/sp.plan`, `/sp.flow`, `/sp.ui`, `/sp.specify`, or `/sp.clarify`.
   - If preflight fails, report `Missing/Weak Artifact`, `Blocker Type`, `Root Layer`, `Owner Route`, `Why current command cannot continue`, `Next /sp.* route`, and `Writeback Target`.
3. Load the smallest useful task-generation context:
   - `specs/<feature>/memory/index.md`
   - `specs/<feature>/memory/worksets/index.md`
   - `specs/<feature>/memory/open-items.md`
   - `specs/<feature>/memory/trace-index.md` when present
   - `specs/<feature>/plan.md`
   - `specs/<feature>/delivery/*`
4. Generate or refresh `specs/<feature>/tasks.md`.
   - Remove the `SP_STAGE_SEED: tasks` marker once tasks are generated from the active plan instead of the initialization scaffold.
   - Keep `tasks.md` upstream-shaped: phases, task IDs, dependencies, parallel markers, and concrete file paths should remain easy for implementation agents to execute.
   - Add SP metadata only where it improves execution: workset, acceptance, trace, open-item, and memory/source-doc writeback anchors.
   - Break the delivery plan into explicit tasks tied to worksets and acceptance.
   - Every task or task group MUST declare `Mode: doc` or `Mode: impl`.
   - Missing mode defaults to `Mode: doc`; `/sp.implement` must not execute it as production code.
   - Generate `Mode: impl` tasks only for worksets that `plan.md` `Implementation Readiness` marks ready or conditionally ready with explicit close conditions.
   - `Mode: doc` tasks may modify specs, flow, UI, delivery docs, memory, trace, open-items, analysis, or gate outputs. They must not modify production code.
   - If document-stage work discovers required `src/`, `scripts/`, config, generated-code, schema, test-asset, or fixture changes, create a next-stage `Mode: impl` code handoff packet instead of letting the doc task write or commit those files.
   - A code handoff packet must name the target file or directory, reason, related `FLOW`/`UI`/`API`/`TABLE`/`PERM`/`EVENT`/`ACC` anchor, `Allowed Write Set`, `Required Checks`, expected verification, writeback target, and next `/sp.implement` or `/sp.plan` route.
   - If unauthorized code artifacts already exist from exploratory document-stage work, do not stage them with document outcomes. Convert them into a code handoff packet, isolate them for the next implementation task, or ask for a cleanup decision when safe handling is unclear.
   - `Mode: impl` tasks must include enough task-packet fields to execute without hidden chat context:
     - `Readiness Source`: the `plan.md` `Implementation Readiness` workset row or condition being consumed
     - `Allowed Write Set`: files, directories, tests, configs, or docs the task may modify
     - `Required Checks`: tests, build, lint, typecheck, script, or manual verification route
     - `Trace Anchors`: relevant `FLOW`, `UI`, `API`, `TABLE`, `PERM`, `EVENT`, `ACC`, `CODE`, or `TEST` anchors
     - `Read Set`: the smallest memory, source-doc, code, and test files the implementer should read before editing
     - `Dependencies Checked`: direct dependencies, imports, routes, contracts, data objects, permissions, tests, or workset neighbors that must be checked before closeout
     - `Reverse Trace Checked`: required reverse lookup/search evidence before delete, move, rename, public behavior, schema, permission, route, event, or acceptance changes
     - `Expected Delta`: the intended user-visible, contract, data, test, or internal behavior change in one concise statement
     - `Delta Summary`: the closeout note the implementer must fill with files changed, anchors affected, checks run, and remaining gaps
     - `Proposed Updates`: shared-memory, trace, task-state, source-doc, or open-item updates the implementer proposes when direct writeback is not allowed
     - `Task Packet Defaults`: compressed effective defaults for `Forbidden Write Set`, `Fallback Route`, `Writeback Rule`, `Required Evidence`, and rollback/degrade handling
     - `Gate / Evidence Expectation`: whether the task needs later `/sp.analyze`, `/sp.gate`, review, or human decision before the workset can advance
   - Use formal `CODE` and `TEST` trace fields or rows for high-risk boundary objects and acceptance-critical tests. Ordinary internal helpers, private functions, pure style components, and local glue code do not require `CODE` anchors unless they become stable cross-document objects.
   - If `Allowed Write Set` is insufficient, do not auto-expand it. Return `NEEDS_PLAN` when the workset/code boundary is wrong or missing; return `NEEDS_TASKS` when the task split or packet fields are incomplete.
   - Keep task ownership, dependency order, and output targets visible.
   - Keep doc tasks executable as documentation work and implementation tasks executable as bounded code work.
   - Preserve workset, acceptance, and trace anchors in task text when they already exist.
   - Add explicit documentation-memory follow-up tasks when task generation changes API contracts, table definitions, UI fields, event ordering, permissions, acceptance paths, risk status, or source-of-truth documents.
   - For tasks touching API contracts, UI fields, table/data structures, permissions, events, acceptance behavior, or tests, include enough trace/workset context for the implementer to perform an impact-radius check before editing.
   - Treat data-linkage as a task trigger: when a data object, table, field, state, event, permission, persistence behavior, API contract, UI field, or test semantic changes, add direct-neighbor checks for the related flow node, UI surface, API, permission rule, side effect, acceptance path, tests, trace row, or open item.
   - For high-impact tasks, include a concise disturbance prediction so implementation does not discover direct neighbors too late:
     - affected anchors or source docs
     - expected adjacent UI/API/data/permission/event/acceptance/test surfaces
     - required verification or manual check path
     - memory/source-doc writeback target when the task changes stable facts or closes risks
   - If `memory/open-items.md` contains open `Todo`, `Risk`, or `Blocker` entries that affect task execution, include a task or dependency that resolves, accepts, or revisits each affected item.
   - For broad blocker cleanup, split each affected blocker into the smallest solvable unit: an executable task, decision task, verification task, or memory/trace closeout task. Each split task should name `Blocker ID`, `Failure Signature`, symptom/evidence, `Root Layer`, `Disconfirming Evidence` when retrying, verification path, `Writeback Target`, and next route when it cannot be completed locally.
   - Classify blocker-derived tasks with `Blocker Type`: `INFO_GAP`, `SOURCE_AUTHORITY_GAP`, `UPSTREAM_DOC_GAP`, `CODE_TEST_ONLY`, `EXECUTION_INFRA`, `GENERIC_ARTIFACT`, `BUSINESS_DECISION`, `ROUTING_STALE`, or `SCOPE_CONFLICT`.
   - Convert `INFO_GAP` into bounded reading/writeback tasks; convert `SOURCE_AUTHORITY_GAP` into source recovery or `/sp.specify` rebase tasks; convert `UPSTREAM_DOC_GAP`, `GENERIC_ARTIFACT`, `ROUTING_STALE`, and `SCOPE_CONFLICT` into owner-command tasks rather than implementation tasks.
   - Convert `CODE_TEST_ONLY` into `Mode: impl` handoff only when `plan.md` `Implementation Readiness` supports it and the task can state target files, allowed write set, required checks, trace anchors, verification, writeback target, and next route.
   - Do not convert `BUSINESS_DECISION` into executable implementation work before a human-selected decision is written back. Generate a `/sp.clarify` decision task with background, impact, 2-4 options, recommendation, and next route.
   - Do not convert `EXECUTION_INFRA` into feature implementation work unless the task is explicitly a runner, wrapper, host, CLI, permission, or tooling fix with its own write boundary and checks.
   - When the same `Failure Signature` appears across many modules, generate one root-cause analyze/gate/tasking item or `promote-candidate` instead of repetitive per-module tasks.
   - Use this `Failure Signature` shape when possible: `<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>`. Keep it stable enough for `/sp.analyze` and `/sp.gate` to detect repeated loops.
   - Keep `Root Layer` and next route consistent. If a task routes away from the root layer's normal owner, write the reason and risk instead of turning every blocker into implementation work.
   - If a blocker task cannot name the smallest solvable unit, verification path, or writeback target, do not generate a local implementation task. Route to `/sp.analyze`, `/sp.plan`, `/sp.clarify`, or `/sp.gate` as the owner command.
   - If a blocker comes from a `fallback-log` repeated signature, create a task, fallback-log note, or `promote-candidate: <Failure Signature>` for `/sp.analyze` or `/sp.gate` to promote. Do not directly create, merge, close, or promote `memory/open-items.md` blocker state from `/sp.tasks`.
   - If implementation and review/human decision can be separated, create separate tasks instead of making an implementation task depend on an unavailable human decision. The implementation task closes after its own verification passes; the review or decision task remains open until the review or decision is actually recorded.
   - For tasks that need human decision, risk acceptance, split approval, or downgraded verification, write the task so the model can route to `/sp.clarify` for a decision package and ask in plain language with background, impact, 2-4 options, tradeoffs, recommendation, and next `/sp.*` route. Do not let a task treat the model recommendation as the final decision.
   - If an item is in `NEEDS_DECISION`, freeze downstream tasks for the same `Blocker ID` until the human-selected decision is written back to the source doc, task, or `memory/open-items.md`.
   - For tasks that modify existing code, include a bounded test-read expectation: directly related, failing, same-name, adjacent, or contract-bearing tests should be checked before implementation; indirect tests can start from signatures or failure output.
   - If a workset is too large by the project methodology's complex-part signals, create a split/promote task instead of generating oversized implementation tasks. Use the same threshold as `sp.plan`: any hard signal, or at least three warning signals.
   - Treat near-threshold split signals as an observation band, not an automatic block: create a task or note that records the candidate split, risk, and revisit point. Only require a decision task when there is a confirmed split dispute, hard trigger, repeated failure, irreversible risk, risk acceptance, compliance/data decision, or explicit user request for split approval.
   - In headless or non-interactive execution, observation-band work should shrink into sequential, verifiable local tasks inside the current workset instead of one oversized task. If a hard trigger exists or the shrunken scope still repeatedly fails, route to `NEEDS_DECISION` or `BLOCKED` instead of expanding context.
   - For parallel `[P]` tasks, keep implementation scopes independent and avoid assigning simultaneous writes to shared memory files. If multiple parallel tasks affect `tasks.md`, `memory/open-items.md`, `memory/trace-index.md`, workset routing, or broad status summaries, add a serialized closeout task to merge those updates after worker evidence is collected.
   - When a task is intended for a parallel worker, name the disjoint write set and mark shared memory files as read-only for that worker. Shared memory updates should be returned as evidence or proposed changes and merged by the serialized closeout task.
   - For tasks intended for multi-agent execution, make the task boundary readable from `tasks.md` without relying on chat history, but avoid bloating the task file. For `[P]` worker tasks, explicitly name `Allowed Write Set` and `Required Checks`; use global defaults for read set and forbidden shared files unless the task needs an exception.
   - For code tasks that continue existing work, prefer a memory-first task packet: start from feature memory, workset memory, trace/open-items, and the task's `Read Set`; expand to source code only along direct dependencies, failing checks, or reverse-trace needs.
   - Do not mark global registry-like files as parallel by default. Treat package manifests, lockfiles, route registries, shared constants, database schemas, permission matrices, global config, cross-module contracts, migration scripts, event bus registries, and core type definitions as serialized work unless the plan proves the write impact is isolated.
   - When a parallel worker needs to change shared memory, task state, trace, or routing, create a follow-up closeout task owned by one coordinator. The worker task should output evidence and proposed updates, not apply shared-state changes directly.
   - Add fallback metadata only to high-risk tasks: tasks touching external dependencies, contracts, migrations, permissions, `@r0`, acceptance gaps, release/rollback risk, or unresolved human/product decisions. Ordinary tasks should not carry fallback boilerplate.
   - For those high-risk tasks, include the fallback target, trigger condition, and writeback requirement in the task text.
   - If a task cannot be made executable without changing upstream documents, stop task expansion for that area and record the exact fallback target: `/sp.plan`, `/sp.bundle`, `/sp.flow`, `/sp.ui`, `/sp.clarify`, `/sp.specify`, or a human macro decision.
5. Refresh memory if task grouping changes routing.
   - Refresh `specs/<feature>/memory/worksets/index.md`
   - Refresh `specs/<feature>/memory/worksets/ws-*.md` where needed
   - Refresh `specs/<feature>/memory/open-items.md` when task generation maps, defers, splits, or introduces unresolved work. Do not close blockers from `/sp.tasks`; closure requires implementation, evidence, or owner-command writeback.
   - Refresh `specs/<feature>/memory/trace-index.md` when tasks add, remove, or rename stable anchors.
   - Refresh `specs/<feature>/memory/index.md`
6. Validate before finishing.
   - Confirm every major task maps back to a workset or delivery artifact.
   - Confirm dependencies and acceptance hooks are explicit.
   - Confirm the active local work area can be discovered from memory.
   - Confirm each task that changes a stable fact has a memory/source-doc writeback path.
   - Confirm `[P]` or multi-agent tasks declare allowed write boundaries and required checks, and explicitly document any exception to the default read set, forbidden shared files, or expected handoff output.
   - Confirm tasks touching global registry-like files are serialized or have an explicit isolation reason.
   - Confirm no task requires a hidden context set larger than its workset can safely hold.
   - Confirm every `Mode: impl` task has a readiness source, `Allowed Write Set`, `Required Checks`, trace anchors or explicit no-trace reason, effective defaults, and gate/evidence expectation visible in the task packet.
   - Confirm high-risk or code-continuation `Mode: impl` tasks include `Read Set`, `Dependencies Checked`, `Reverse Trace Checked`, `Expected Delta`, `Delta Summary`, and `Proposed Updates`, or an explicit `N/A - <reason>` when a field is not applicable. Empty fields are not evidence.
   - Confirm no `Mode: impl` task was generated from a workset that lacks `plan.md` `Implementation Readiness`.
   - Confirm blocker-derived tasks include `Blocker ID`, `Blocker Type`, `Failure Signature`, `Root Layer`, `Disconfirming Evidence` when retrying, and `Writeback Target`.
   - Confirm `BUSINESS_DECISION` and unresolved `SCOPE_CONFLICT` items are routed to `/sp.clarify`, not hidden inside implementation work.
   - Confirm `EXECUTION_INFRA` items are isolated from business feature tasks unless the task is explicitly about fixing execution infrastructure.
   - Confirm unresolved `NEEDS_DECISION` items are not converted into executable implementation tasks before the human-selected decision is written back.

## Output

- Create or update `specs/<feature>/tasks.md`
- Refresh `specs/<feature>/memory/worksets/index.md`
- Refresh `specs/<feature>/memory/worksets/ws-*.md` where needed
- Refresh `specs/<feature>/memory/open-items.md` if task generation maps, defers, splits, or introduces unresolved work
- Refresh `specs/<feature>/memory/trace-index.md` if task generation adds, removes, or renames stable anchors
- Refresh `specs/<feature>/memory/index.md`

## Key Rules

- Do not write production code.
- Do not create `Mode: impl` tasks that are disconnected from `plan.md` implementation readiness, workset boundaries, trace anchors, validation paths, evidence expectations, or rollback/degrade handling for risky work.
- Do not leave `SP_STAGE_SEED: tasks` in a completed task file; that marker means the file is still an initialization scaffold.
- Do not leave dependencies implicit.
- Do not merge unrelated worksets into one task bucket without justification.
- Do not generate tasks that require a model to hold an oversized context window. Split, sequence, or promote the work area first.
- Do not add fallback metadata to every task. Use it only where risk evidence justifies the extra context.
- Keep task outputs anchored to documentation artifacts.
- Do not drop `OPEN-*`, `RISK-*`, `@t0`, or `@r0` context during task generation; either resolve it, keep it visible, or point to the revisit step.
- Do not create implementation tasks that can change contracts, data, UI, permissions, acceptance, or risk state without a matching documentation or memory writeback task.
- Do not let a parallel task rely on implicit ownership. If the allowed write set or required checks cannot be stated, make the task sequential.
- Do not create implementation tasks that require hidden impact analysis. The task should point to the trace/workset context needed to check affected flows, screens, contracts, tables, permissions, acceptance, and tests.
- Do not create implementation tasks that require hidden continuation context. The task should state the minimum `Read Set`, expected dependency checks, reverse-trace needs, and expected delta so a later model can resume without rereading the whole feature.
- Do not create high-impact tasks without naming the expected direct disturbance surface and verification path.
- Do not keep generating local tasks when the next safe step is to revisit an upstream `sp.*` command.
- Do not auto-expand `Allowed Write Set` during task generation to make an implementation task look executable. Route boundary gaps to `NEEDS_PLAN`; route incomplete packets to `NEEDS_TASKS`.
- Do not treat fallback-log, task notes, or model recommendations as stable blocker truth. Current blocker state belongs in `memory/open-items.md`; trace-index is relation/history lookup.
- Do not generate a blocker cleanup task that lacks `Blocker ID`, `Blocker Type`, `Failure Signature`, `Root Layer`, verification path, and `Writeback Target`.
- Do not generate repetitive per-module tasks for a shared root failure signature; group the root cause and route it once unless new evidence proves the modules need separate repairs.

## Post-Execution Checks

**Check for extension hooks (after tasks generation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_tasks` key.
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

- If `BUSINESS_DECISION`, unresolved `SCOPE_CONFLICT`, unresolved `NEEDS_DECISION`, risk-acceptance, split-approval, verification-downgrade, or other human-review tasks exist, do not suggest `/sp.implement` or `/sp.analyze` as the immediate next step for those items. End with an explicit decision prompt and route to `/sp.clarify` or the named owner command before implementation.
- Suggest `/sp.analyze` only when generated tasks are executable or reviewable without hidden human decisions, and every blocked item has a clear fallback route.
