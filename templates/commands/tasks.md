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
2. Load the smallest useful task-generation context:
   - `specs/<feature>/memory/index.md`
   - `specs/<feature>/memory/worksets/index.md`
   - `specs/<feature>/memory/open-items.md`
   - `specs/<feature>/memory/trace-index.md` when present
   - `specs/<feature>/plan.md`
   - `specs/<feature>/delivery/*`
3. Generate or refresh `specs/<feature>/tasks.md`.
   - Remove the `SP_STAGE_SEED: tasks` marker once tasks are generated from the active plan instead of the initialization scaffold.
   - Keep `tasks.md` upstream-shaped: phases, task IDs, dependencies, parallel markers, and concrete file paths should remain easy for implementation agents to execute.
   - Add SP metadata only where it improves execution: workset, acceptance, trace, open-item, and memory/source-doc writeback anchors.
   - Break the delivery plan into explicit tasks tied to worksets and acceptance.
   - Every task or task group MUST declare `Mode: doc` or `Mode: impl`.
   - Missing mode defaults to `Mode: doc`; `/sp.implement` must not execute it as production code.
   - Generate `Mode: impl` tasks only for worksets that `plan.md` `Implementation Readiness` marks ready or conditionally ready with explicit close conditions.
   - `Mode: doc` tasks may modify specs, flow, UI, delivery docs, memory, trace, open-items, analysis, or gate outputs. They must not modify production code.
   - `Mode: impl` tasks must include enough task-packet fields to execute without hidden chat context:
     - `Readiness Source`: the `plan.md` `Implementation Readiness` workset row or condition being consumed
     - `Allowed Write Set`: files, directories, tests, configs, or docs the task may modify
     - `Required Checks`: tests, build, lint, typecheck, script, or manual verification route
     - `Trace Anchors`: relevant `FLOW`, `UI`, `API`, `TABLE`, `PERM`, `EVENT`, `ACC`, `CODE`, or `TEST` anchors
     - `Task Packet Defaults`: compressed effective defaults for `Forbidden Write Set`, `Fallback Route`, `Writeback Rule`, `Required Evidence`, and rollback/degrade handling
     - `Gate / Evidence Expectation`: whether the task needs later `/sp.analyze`, `/sp.gate`, review, or human decision before the workset can advance
   - Use formal `CODE` and `TEST` trace fields or rows for high-risk boundary objects and acceptance-critical tests. Ordinary internal helpers, private functions, pure style components, and local glue code do not require `CODE` anchors unless they become stable cross-document objects.
   - If `Allowed Write Set` is insufficient, do not auto-expand it. Return `NEEDS_PLAN` when the workset/code boundary is wrong or missing; return `NEEDS_TASKS` when the task split or packet fields are incomplete.
   - Keep task ownership, dependency order, and output targets visible.
   - Keep doc tasks executable as documentation work and implementation tasks executable as bounded code work.
   - Preserve workset, acceptance, and trace anchors in task text when they already exist.
   - Add explicit documentation-memory follow-up tasks when task generation changes API contracts, table definitions, UI fields, event ordering, permissions, acceptance paths, risk status, or source-of-truth documents.
   - For tasks touching API contracts, UI fields, table/data structures, permissions, events, acceptance behavior, or tests, include enough trace/workset context for the implementer to perform an impact-radius check before editing.
   - For high-impact tasks, include a concise disturbance prediction so implementation does not discover direct neighbors too late:
     - affected anchors or source docs
     - expected adjacent UI/API/data/permission/event/acceptance/test surfaces
     - required verification or manual check path
     - memory/source-doc writeback target when the task changes stable facts or closes risks
   - If `memory/open-items.md` contains open `Todo`, `Risk`, or `Blocker` entries that affect task execution, include a task or dependency that resolves, accepts, or revisits each affected item.
   - If implementation and review/human decision can be separated, create separate tasks instead of making an implementation task depend on an unavailable human decision. The implementation task closes after its own verification passes; the review or decision task remains open until the review or decision is actually recorded.
   - For tasks that need human decision, risk acceptance, split approval, or downgraded verification, write the task so the model can route to `/sp.clarify` for a decision package and ask in plain language with background, impact, 2-4 options, tradeoffs, recommendation, and next `/sp.*` route. Do not let a task treat the model recommendation as the final decision.
   - For tasks that modify existing code, include a bounded test-read expectation: directly related, failing, same-name, adjacent, or contract-bearing tests should be checked before implementation; indirect tests can start from signatures or failure output.
   - If a workset is too large by the project methodology's complex-part signals, create a split/promote task instead of generating oversized implementation tasks. Use the same threshold as `sp.plan`: any hard signal, or at least three warning signals.
   - Treat near-threshold split signals as an observation band, not an automatic block: create a task or note that records the candidate split, risk, and revisit point. Only require a decision task when there is a confirmed split dispute, hard trigger, repeated failure, irreversible risk, risk acceptance, compliance/data decision, or explicit user request for split approval.
   - In headless or non-interactive execution, observation-band work should shrink into sequential, verifiable local tasks inside the current workset instead of one oversized task. If a hard trigger exists or the shrunken scope still repeatedly fails, route to `NEEDS_DECISION` or `BLOCKED` instead of expanding context.
   - For parallel `[P]` tasks, keep implementation scopes independent and avoid assigning simultaneous writes to shared memory files. If multiple parallel tasks affect `tasks.md`, `memory/open-items.md`, `memory/trace-index.md`, workset routing, or broad status summaries, add a serialized closeout task to merge those updates after worker evidence is collected.
   - When a task is intended for a parallel worker, name the disjoint write set and mark shared memory files as read-only for that worker. Shared memory updates should be returned as evidence or proposed changes and merged by the serialized closeout task.
   - For tasks intended for multi-agent execution, make the task boundary readable from `tasks.md` without relying on chat history, but avoid bloating the task file. For `[P]` worker tasks, explicitly name `Allowed Write Set` and `Required Checks`; use global defaults for read set and forbidden shared files unless the task needs an exception.
   - Do not mark global registry-like files as parallel by default. Treat package manifests, lockfiles, route registries, shared constants, database schemas, permission matrices, global config, cross-module contracts, migration scripts, event bus registries, and core type definitions as serialized work unless the plan proves the write impact is isolated.
   - When a parallel worker needs to change shared memory, task state, trace, or routing, create a follow-up closeout task owned by one coordinator. The worker task should output evidence and proposed updates, not apply shared-state changes directly.
   - Add fallback metadata only to high-risk tasks: tasks touching external dependencies, contracts, migrations, permissions, `@r0`, acceptance gaps, release/rollback risk, or unresolved human/product decisions. Ordinary tasks should not carry fallback boilerplate.
   - For those high-risk tasks, include the fallback target, trigger condition, and writeback requirement in the task text.
   - If a task cannot be made executable without changing upstream documents, stop task expansion for that area and record the exact fallback target: `/sp.plan`, `/sp.bundle`, `/sp.flow`, `/sp.ui`, `/sp.clarify`, `/sp.specify`, or a human macro decision.
4. Refresh memory if task grouping changes routing.
   - Refresh `specs/<feature>/memory/worksets/index.md`
   - Refresh `specs/<feature>/memory/worksets/ws-*.md` where needed
   - Refresh `specs/<feature>/memory/open-items.md` when tasks close, defer, split, or introduce unresolved work.
   - Refresh `specs/<feature>/memory/trace-index.md` when tasks add, remove, or rename stable anchors.
   - Refresh `specs/<feature>/memory/index.md`
5. Validate before finishing.
   - Confirm every major task maps back to a workset or delivery artifact.
   - Confirm dependencies and acceptance hooks are explicit.
   - Confirm the active local work area can be discovered from memory.
   - Confirm each task that changes a stable fact has a memory/source-doc writeback path.
   - Confirm `[P]` or multi-agent tasks declare allowed write boundaries and required checks, and explicitly document any exception to the default read set, forbidden shared files, or expected handoff output.
   - Confirm tasks touching global registry-like files are serialized or have an explicit isolation reason.
   - Confirm no task requires a hidden context set larger than its workset can safely hold.
   - Confirm every `Mode: impl` task has a readiness source, `Allowed Write Set`, `Required Checks`, trace anchors or explicit no-trace reason, effective defaults, and gate/evidence expectation visible in the task packet.
   - Confirm no `Mode: impl` task was generated from a workset that lacks `plan.md` `Implementation Readiness`.

## Output

- Create or update `specs/<feature>/tasks.md`
- Refresh `specs/<feature>/memory/worksets/index.md`
- Refresh `specs/<feature>/memory/worksets/ws-*.md` where needed
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
- Do not create high-impact tasks without naming the expected direct disturbance surface and verification path.
- Do not keep generating local tasks when the next safe step is to revisit an upstream `sp.*` command.
- Do not auto-expand `Allowed Write Set` during task generation to make an implementation task look executable. Route boundary gaps to `NEEDS_PLAN`; route incomplete packets to `NEEDS_TASKS`.

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

- Suggest `/sp.analyze`.
