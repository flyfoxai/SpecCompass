---
description: "Execute selected Mode: impl tasks from tasks.md following the implementation plan"
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
---

# /sp.implement

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before implementation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_implement` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    
    Wait for the result of the hook command before proceeding to the Outline.
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Outline

1. Run `{SCRIPT}` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Check checklists status** (if FEATURE_DIR/checklists/ exists):
   - Scan all checklist files in the checklists/ directory
   - For each checklist, count:
     - Total items: All lines matching `- [ ]` or `- [X]` or `- [x]`
     - Completed items: Lines matching `- [X]` or `- [x]`
     - Incomplete items: Lines matching `- [ ]`
   - Create a status table:

     ```text
     | Checklist | Total | Completed | Incomplete | Status |
     |-----------|-------|-----------|------------|--------|
     | ux.md     | 12    | 12        | 0          | ✓ PASS |
     | test.md   | 8     | 5         | 3          | ✗ FAIL |
     | security.md | 6   | 6         | 0          | ✓ PASS |
     ```

   - Calculate overall status:
     - **PASS**: All checklists have 0 incomplete items
     - **FAIL**: One or more checklists have incomplete items

   - **If any checklist is incomplete**:
     - Display the table with incomplete item counts
     - In interactive runs, ask: "Some checklists are incomplete. Do you want to proceed with implementation anyway? (yes/no)"
     - If user says "no" or "wait" or "stop", halt execution
     - If user says "yes" or "proceed" or "continue", proceed to step 3
     - In headless or non-interactive runs, do not wait forever and do not invent approval. Return `NEEDS_DECISION` with the checklist table, background, impact, 2-4 options, recommendation, and the next `/sp.*` route. End the output with `SP_EXIT_CODE: 1` as a machine-readable blocker marker; if the host supports process exit control, also terminate with a non-zero exit status so CI or automated runners cannot continue as if implementation succeeded.

   - **If all checklists are complete**:
     - Display the table showing all checklists passed
     - Automatically proceed to step 3

3. Load and analyze the implementation context:
   - **REQUIRED**: Read tasks.md for the task list, then select only the requested `Mode: impl` task or task group for this run. If the user did not name a task, pick the next unblocked `Mode: impl` task that is ready under dependency order.
   - **REQUIRED**: Read plan.md for tech stack, architecture, and file structure
   - **REQUIRED**: Read `plan.md` `Implementation Readiness`; it is the single source of truth for whether a workset can enter implementation.
   - **IF EXISTS**: Read `FEATURE_DIR/memory/index.md` first to choose the smallest sufficient workset context
   - **IF EXISTS**: Read `FEATURE_DIR/memory/open-items.md` for unresolved risks, blockers, todos, rollback advice, and close conditions affecting the selected task
   - **IF EXISTS**: Read `FEATURE_DIR/memory/trace-index.md` for trace anchors only when the task touches flow, UI, API, table, acceptance, permission, event, or test behavior
   - **IF EXISTS**: Read data-model.md for entities and relationships
   - **IF EXISTS**: Read contracts/ for API specifications and test requirements
   - **IF EXISTS**: Read research.md for technical decisions and constraints
   - **IF EXISTS**: Read quickstart.md for integration scenarios

4. **Project Setup Verification**:
   - Create or verify ignore files when project setup, tooling, detected technology, packaging, or generated-output paths changed, or when required ignore files are missing. Do not rewrite ignore files on every implementation run just to restate unchanged patterns.

   **Detection & Creation Logic**:
   - Check if the following command succeeds to determine if the repository is a git repo (create/verify .gitignore if so):

     ```sh
     git rev-parse --git-dir 2>/dev/null
     ```

   - Check if Dockerfile* exists or Docker in plan.md → create/verify .dockerignore
   - Check if .eslintrc* exists → create/verify .eslintignore
   - Check if eslint.config.* exists → ensure the config's `ignores` entries cover required patterns
   - Check if .prettierrc* exists → create/verify .prettierignore
   - Check if .npmrc or package.json exists → create/verify .npmignore (if publishing)
   - Check if terraform files (*.tf) exist → create/verify .terraformignore
   - Check if .helmignore needed (helm charts present) → create/verify .helmignore

   **If ignore file already exists**: Verify it contains essential patterns, append missing critical patterns only
   **If ignore file missing**: Create with full pattern set for detected technology

   **Common Patterns by Technology** (from plan.md tech stack):
   - **Node.js/JavaScript/TypeScript**: `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`
   - **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`, `*.egg-info/`
   - **Java**: `target/`, `*.class`, `*.jar`, `.gradle/`, `build/`
   - **C#/.NET**: `bin/`, `obj/`, `*.user`, `*.suo`, `packages/`
   - **Go**: `*.exe`, `*.test`, `vendor/`, `*.out`
   - **Ruby**: `.bundle/`, `log/`, `tmp/`, `*.gem`, `vendor/bundle/`
   - **PHP**: `vendor/`, `*.log`, `*.cache`, `*.env`
   - **Rust**: `target/`, `debug/`, `release/`, `*.rs.bk`, `*.rlib`, `*.prof*`, `.idea/`, `*.log`, `.env*`
   - **Kotlin**: `build/`, `out/`, `.gradle/`, `.idea/`, `*.class`, `*.jar`, `*.iml`, `*.log`, `.env*`
   - **C++**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.so`, `*.a`, `*.exe`, `*.dll`, `.idea/`, `*.log`, `.env*`
   - **C**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.a`, `*.so`, `*.exe`, `*.dll`, `autom4te.cache/`, `config.status`, `config.log`, `.idea/`, `*.log`, `.env*`
   - **Swift**: `.build/`, `DerivedData/`, `*.swiftpm/`, `Packages/`
   - **R**: `.Rproj.user/`, `.Rhistory`, `.RData`, `.Ruserdata`, `*.Rproj`, `packrat/`, `renv/`
   - **Universal**: `.DS_Store`, `Thumbs.db`, `*.tmp`, `*.swp`, `.vscode/`, `.idea/`

   **Tool-Specific Patterns**:
   - **Docker**: `node_modules/`, `.git/`, `Dockerfile*`, `.dockerignore`, `*.log*`, `.env*`, `coverage/`
   - **ESLint**: `node_modules/`, `dist/`, `build/`, `coverage/`, `*.min.js`
   - **Prettier**: `node_modules/`, `dist/`, `build/`, `coverage/`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
   - **Terraform**: `.terraform/`, `*.tfstate*`, `*.tfvars`, `.terraform.lock.hcl`
   - **Kubernetes/k8s**: `*.secret.yaml`, `secrets/`, `.kube/`, `kubeconfig*`, `*.key`, `*.crt`

5. Parse tasks.md structure and extract:
   - **Task phases**: Setup, Tests, Core, Integration, Polish
   - **Task dependencies**: Sequential vs parallel execution rules
   - **Task mode**: `Mode: impl` tasks are executable by this command; missing mode or `Mode: doc` tasks are not production-code tasks and must be routed back to `/sp.tasks` or executed by the appropriate document command.
   - **Task details**: ID, description, file paths, parallel markers [P], `Allowed Write Set`, `Required Checks`, trace anchors, and effective defaults
   - **Execution flow**: Order and dependency requirements
   - **Task packet defaults**: Confirm the selected task exposes compressed effective defaults for `Forbidden Write Set`, `Fallback Route`, `Writeback Rule`, and `Required Evidence`, or points to a small stable defaults file that was read before editing.
   - If a selected implementation task lacks `Mode: impl`, stop and return `NEEDS_TASKS` with the task ID, why it cannot be executed as code, and the next `/sp.tasks` route.
   - If `plan.md` does not mark the task's workset implementation-ready, stop and return `NEEDS_PLAN` or `NEEDS_DECISION` with the blocking readiness evidence and next route.
   - If required task context is missing and cannot be recovered from routed files, stop and return `NEEDS_CONTEXT` with the missing context, files checked, and next route.

6. Execute implementation following the selected task plan:
   - **Selected-scope execution**: Execute only the selected `Mode: impl` task or task group for this run. Do not treat `/sp.implement` as permission to finish every task in `tasks.md` unless the user explicitly requested full remaining implementation and every included task is independently ready.
   - **Phase-by-phase execution**: Complete each selected phase before moving to the next
   - **Respect dependencies**: Run sequential tasks in order, parallel tasks [P] can run together  
   - **Follow TDD approach**: Execute test tasks before their corresponding implementation tasks
   - **Acceptance-first when feasible**: Before changing implementation, identify the failing or missing test, checklist item, or acceptance path that will prove the task is complete. If no automated test is practical, write down the manual verification path before coding.
   - Before modifying existing code, inspect directly related tests, failing tests, same-name or adjacent tests, or at least their test names and contract-bearing assertions. For indirect impact tests, read signatures and scope first, then expand only when evidence requires it.
   - **Impact-radius check**: Before changing APIs, UI fields, table/data structures, permissions, events, acceptance behavior, or tests, use `FEATURE_DIR/memory/trace-index.md`, `FEATURE_DIR/memory/open-items.md`, and the selected workset to identify the affected flow, screen, contract, table, permission, acceptance, and test surface. If an optional code graph such as CodeGraph is already installed in the target project, it may be used as supporting evidence; never require it and always fall back to SP memory, source docs, search, and tests.
   - **Allowed write boundary**: Before the first edit, confirm every target file is inside the task's `Allowed Write Set`. If the set is insufficient, do not auto-expand it. Return `NEEDS_PLAN` when the code boundary or workset is wrong; return `NEEDS_TASKS` when the task packet or split is incomplete; return `NEEDS_CONTEXT` when required context is missing and cannot be recovered from routed files. Keep valid local evidence, but do not continue by guessing permission.
   - **CODE/TEST trace discipline**: High-risk boundary objects and acceptance-critical tests must have formal `CODE` or `TEST` trace entries, fields, or proposed updates. Ordinary internal helpers, private functions, pure style components, and local glue code do not require `CODE` anchors unless they become stable cross-document objects.
   - For tasks that trigger the impact-radius check, write a concise `Impact-Radius Plan` before the first relevant change. Name expected anchors, direct source docs or files to check, and intended verification. Keep it in the task execution output or the relevant `tasks.md` task note. Do not write `Impact-Radius Evidence` until after the actual check or verification runs. If tests, checks, static review, or manual verification fail, Evidence must record the failure output, affected scope, and next route; it must not say PASS, verified, or close the task/risk. The plan and evidence may be recorded in one execution turn, but do not present after-the-fact planning as a pre-change safety check, and do not issue parallel tool calls that can modify target files before the plan note is recorded.
   - Low-risk small edits may use a fast path: when impact is clear, normally one file or one local behavior, and no architecture/dependency/data/permission/acceptance change is involved, write a brief pre-change plan, edit, then record current verification evidence. Do not use the fast path for high-impact or unclear tasks.
   - **File-based coordination**: Tasks affecting the same files must run sequentially
   - **Shared memory coordination**: Parallel tasks [P] may implement independent files or scopes concurrently, but shared writeback must be serialized or batched. Do not let parallel workers simultaneously edit `tasks.md`, `FEATURE_DIR/memory/open-items.md`, `FEATURE_DIR/memory/trace-index.md`, workset routing, or broad status summaries. Each worker should report evidence and requested memory changes; one owner step merges shared memory and task-state updates.
   - **Parallel agent boundaries**: When delegating parallel work, state each worker's disjoint write set and mark shared memory files as read-only for that worker. Workers should return evidence and proposed shared-memory updates, not apply those shared updates directly.
   - **Worker mode**: If this run is acting as a worker, subagent, or delegated multi-agent task, execute only the assigned task or workset. Treat `tasks.md`, feature memory, trace files, workset routing, global status summaries, and coordinator-owned files as read-only unless the task explicitly names them in `Allowed Write Set`.
   - **Missing boundary fallback**: If a delegated task does not state `Allowed Write Set` or required checks, do not infer broad permission. Ask the coordinator or fall back to sequential execution before editing. Use global defaults for read set, forbidden shared files, and handoff fields unless the task says otherwise.
   - **Forbidden write violation**: If worker-mode changes need to touch `Forbidden Write Set` or shared-state files, stop before expanding the change. Keep valid local-scope work separate, report the needed shared/global change as proposed coordinator work, and do not claim completion. If unauthorized diffs already exist, report them and recommend reverting the forbidden part, rerunning the worker, or converting the task to serial closeout.
   - **Global registry files**: Changes to package manifests, lockfiles, route registries, shared constants, database schemas, permission matrices, global config, cross-module contracts, migrations, event bus registries, and core type definitions should be serial or coordinator-closeout work unless the task explicitly proves isolated impact.
   - **Worker handoff**: A delegated worker must return a concise handoff instead of editing shared memory directly. Include task/workset, branch or worktree, allowed write set, files changed, anchors affected, inputs read, checks run, result, evidence, proposed shared-memory updates, open items or risks, and merge notes.
   - **Validation checkpoints**: Verify each phase completion before proceeding
   - **Phase review**: At the end of each phase or workset, compare completed changes against `tasks.md`, `plan.md`, relevant memory, and verification evidence before moving on.
   - **Fail fast**: If build, compile, test, lint, checklist, or prerequisite checks fail, stop expanding scope and fix or report the failure before continuing.
   - **Soft issue boundary**: Only low-risk warnings that do not affect routing, contracts, tests, acceptance, trace, `Blocker`, or high-impact `Risk` may proceed as soft issues. Build/test/lint/check failures, route errors, acceptance breaks, critical trace breaks, open `Blocker`, or high-impact `Risk` without required fields are not soft issues.
   - **Root-cause before fallback**: Before escalating upward, perform one bounded current-layer diagnosis or fix attempt when safe.
   - Minimum standard: read the task plus directly related source/docs, reproduce or locate the failure evidence, state at least one concrete hypothesis, and verify it with a test, check, file comparison, or document evidence.
   - After the first failed attempt on the same task, acceptance item, or file area, perform a short differential diagnosis before the second attempt:
     - failed assumption: what the first attempt believed
     - disconfirming evidence: what output, file, test, or document showed it was wrong or incomplete
     - changed plan: what hypothesis, file set, or verification path will be different in the second attempt
     - do not repeat the same fix with only wording changes
   - Record what was tried, what evidence failed, and why the current layer cannot solve it.
   - Same failure signature at the same implementation layer gets at most two evidence-based attempts. If the same workset bounces between implementation, tasks, plan, or spec layers beyond that threshold, stop automatic progress and return `NEEDS_DECISION` or `BLOCKED` with the failure chain, attempted routes, options, recommendation, and next `/sp.*` route.
   - Skip the local attempt only for data loss, security, permission, compliance, irreversible migration, or clearly missing human/product decision risk, and name the missing decision.
   - Do not treat ordinary uncertainty, incomplete reading, or a locally verifiable issue as a missing human decision.
   - Business contradictions, incompatible requirements, or unclear user intent cannot be solved with implementation hacks. Route unclear intent to `/sp.clarify`; route baseline requirement changes or new independent features to `/sp.specify`; route workset or technical-route changes to `/sp.plan`.
   - Before fallback, inspect current changes and classify stable edits, failed attempts, unverified edits, and user-owned edits. Do not run destructive cleanup commands unless the user explicitly approves them.
   - In headless automation, prefer pre-run isolation such as a temp workspace, CI workspace, temp branch, or `git worktree`. CI runners should discard the temporary branch, directory, or worktree created for the task when isolated work fails, instead of doing partial reset in a user workspace. Record dirty files before high-risk work. If failed changes overlap user-owned dirty files or require destructive cleanup, return `BLOCKED` with background, impact, 2-4 options, recommendation, and next `/sp.*` route instead of auto-resetting.
   - Before returning `BLOCKED` in headless automation, output a failure-site report: changed files, failed command/check result, current judgment, why automatic recovery is unsafe, and next `/sp.*` route. Save or attach the report as a CI artifact when supported.
   - If the implementation state is chaotic because scope, acceptance, source docs, or user intent is unclear, run or suggest `/sp.clarify` first to restate the question, decision points, and next route before continuing implementation. Treat `/sp.clarify` as a non-linear clarification route, then write the clarified result back to the current task/source doc/memory before continuing.
   - **Upward fallback**: If the failure cannot be solved safely at the implementation layer, move up to the nearest layer that can solve it instead of guessing:
     - task description still cannot be reduced to one executable change after reading `tasks.md` and `plan.md` -> revisit `tasks.md`
     - task dependency or workset boundary problem -> revisit `plan.md`
     - missing acceptance, UI/API/data/permission contract, or business conflict -> revisit `spec.md`, flows, UI, delivery, or bundle docs
     - unresolved project principle or product tradeoff -> ask for human decision
   - When using fallback, record the source layer, reason, target layer, exact next `sp.*` step, and whether any changed fact must be written back to memory or source docs.
   - **Trace-aware execution**: Preserve existing stable anchors in code comments, tests, or docs where the project already uses them. Do not invent new anchors unless source docs or memory are also updated.
   - **Delete/move/rename safety**: Before deleting, moving, or renaming code, tests, routes, schemas, permissions, migrations, events, or public UI/API objects, perform a lightweight reference scan even when no trace row exists. Check direct text references, imports, calls, routes, tests, same-directory references, and registered contracts as applicable. If references exist but the safe impact is unclear, stop and route to `/sp.plan` or `/sp.tasks`.
   - **Soft-delete lifecycle**: If safe removal requires temporary compatibility, tombstone, or soft-delete behavior, create or propose an open item with object, reason, affected trace, cleanup trigger or deadline, verification requirement, owner or next route. Do not leave "clean up later" as an untracked note.
   - **Subagent discipline**: Use subagents only when cross-module scope, parallel investigation, context pressure, or an explicit analysis recommendation justifies delegation. Do not spawn subagents for routine single-file execution.

7. Implementation execution rules:
   - **Setup first**: Initialize project structure, dependencies, configuration
   - **Tests before code**: If you need to write tests for contracts, entities, and integration scenarios
   - **Core development**: Implement models, services, CLI commands, endpoints
   - **Integration work**: Database connections, middleware, logging, external services
   - **Polish and validation**: Unit tests, performance optimization, documentation

8. Progress tracking and error handling:
   - Report progress after each completed task
   - Halt execution if any non-parallel task fails
   - For parallel tasks [P], continue with successful tasks, report failed ones
   - For parallel tasks [P], merge shared task-state, open-items, trace, and workset updates in one serialized closeout step after collecting worker evidence.
   - Provide clear error messages with context for debugging
   - Suggest next steps if implementation cannot proceed
   - For tasks that triggered the impact-radius check, include one concise `Impact-Radius Evidence` note after the actual check or verification. Name affected trace/workset anchors, checked source docs/files, verification result, and open items, or state that no direct adjacent impact was found. If the check fails, preserve the failure as open evidence with the next route; do not rewrite it as success. Keep this to direct neighbors; do not expand into multi-hop graph analysis unless current evidence requires it. Do not write impact-radius notes as production code comments; update memory, trace, open-items, or source-of-truth docs only when stable facts, risks, or open items changed.
   - Treat normal trace gaps as warnings only when they do not affect acceptance, tests, release, rollback, or human decisions. Record the warning in task evidence, analysis, or open-items. If the same trace warning crosses the stage unresolved or starts affecting acceptance/test/release/rollback/decision, escalate it to blocker or `NEEDS_DECISION`.
   - Do not keep retrying the same local fix when the evidence shows the task, plan, or spec is wrong. Two failed attempts on the same task, acceptance item, or file area are enough evidence to escalate one layer upward by default. Jump multiple layers only when at least two escalation triggers are present, or when there is unsafe data/permission/security/compliance risk or a clearly missing human decision.
   - **IMPORTANT** For every task whose own completion conditions are met, update the task state in the same execution:
     - if `tasks.md` uses checklist tasks, mark the task off as `[X]` only after its required implementation, verification, review, or decision condition is satisfied
     - if `tasks.md` uses a Task Matrix, update the task's `Status` column to the agreed completed value such as `Completed` or `Verified`, and record evidence in `Notes` or the task evidence field
     - record the current verification or review evidence required by that task
     - close or adjust directly affected `@t0`, `@r0`, `OPEN`, or `RISK` state only when evidence or an explicit accepted decision exists
     - when closing, deleting, or downgrading `Blocker`, high-impact `Risk`, or `@r0`, record the current evidence, traceable code/doc change, rollback/degrade path, or explicit human acceptance that justifies it
     - do not close these states from model confidence alone; if evidence is missing, keep the item open and record the next verification route
     - if review, acceptance, or human decision is part of the same task and is still pending, keep the task visibly open with owner/close condition/next revisit step instead of marking final closure
     - if review, acceptance, or human decision is a separate follow-up item, close the verified implementation task and keep that follow-up item open in `FEATURE_DIR/memory/open-items.md` or the appropriate task
     - when a task closes a category, workset, or phase area, leave enough evidence for later incremental checks: affected anchor, verification result, and any remaining exception or open item
     - do not rewrite broad memory files only to restate unchanged facts; update feature memory/source docs only for direct fact, route, risk, trace, or open-item changes
     - low-risk same-context tasks completed in one execution turn may batch their task-state and evidence writeback at turn closeout, but do not defer that closure to a later `/sp.analyze`, `/sp.gate`, or future model run
   - Do not defer ordinary task-state closure to `sp.analyze` or `sp.gate`. Those commands verify and correct drift; they are not the normal substitute for per-task completion writeback.

9. Completion validation:
   - Verify all selected required tasks for this run are completed; do not require unrelated future tasks to be closed before reporting the current run result.
   - Check that implemented features match the original specification
   - Validate that tests pass and coverage meets requirements
   - Confirm the implementation follows the technical plan
   - Confirm memory/source-doc writeback is complete when stable facts changed:
     - API contracts, table/data structures, UI fields, permissions, events, acceptance paths, or rollback behavior changed
     - `Risk`, `Todo`, or `Blocker` status changed
     - new evidence closes `@t0` validation gaps or changes `@r0` risk status
     - high-risk boundary `CODE` or acceptance-critical `TEST` trace was added, removed, renamed, or discovered missing
   - Confirm each task completed in this run has its checkbox/status updated and has current evidence recorded. If a review-dependent task cannot be closed yet, confirm the open state and close condition are recorded instead.
   - When writeback is required, update the appropriate source doc and feature memory (`FEATURE_DIR/memory/open-items.md`, `FEATURE_DIR/memory/trace-index.md`, `FEATURE_DIR/memory/worksets/*`, or `FEATURE_DIR/memory/stable-context.md`) before claiming completion.
   - If writeback cannot be completed because the fact is still unstable, leave or create an `OPEN01` or `RISK01`-style entry with owner, affected docs, rollback advice, close condition, and next revisit step.
   - Confirm incremental maintenance is possible after this run: recently changed tasks and anchors are visible, still-open items remain open, and completed verified areas do not require a future model to reread the whole feature just to know what changed.
   - Confirm incremental reading did not downgrade verification. If the task directly changed or affected dependencies, public contracts, data, permissions, acceptance paths, or critical tests, run the local affected tests/checks/manual verification when feasible and record evidence. Use CI/full verification only for broader regression, environment-limited checks, or areas not directly changed by this task.
   - Do not self-approve conditional risk acceptance. If a risk must remain open while work proceeds, ask the user for the decision and record the accepted scope, owner, revisit anchor, rollback or degrade path, and close condition.
   - Do not claim PASS from prose alone when mechanical evidence is available. Current test/build/lint/check results, existing active feature paths, required source docs, trace links, and open blockers/high risks override subjective confidence.
   - In headless or non-interactive runs, do not invent human approval. If the next safe step needs risk acceptance, disputed split, compliance/data decision, irreversible action, or hard-gate override, return `NEEDS_DECISION` or `BLOCKED` with background, impact, 2-4 options, recommendation, and the next `/sp.*` route. End the output with `SP_EXIT_CODE: 1`; if the host supports process exit control, also terminate with a non-zero exit status.
   - When asking for human input, use plain language: explain the background, impact, 2-4 viable options, tradeoffs, your recommendation, and the next `/sp.*` route.
   - Report final status with summary of completed work
   - Do not output a full file-read list by default. Include read-set details only when the user asks for debug/audit detail or when a failure needs that evidence.

Note: This command assumes a complete task breakdown exists in tasks.md. If tasks are incomplete or missing, suggest running `/sp.tasks` first to regenerate the task list.

10. **Check for extension hooks**: After completion validation, check if `.specify/extensions.yml` exists in the project root.
    - If it exists, read it and look for entries under the `hooks.after_implement` key
    - If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
    - Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
    - For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
      - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
      - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
    - For each executable hook, output the following based on its `optional` flag:
      - **Optional hook** (`optional: true`):
        ```
        ## Extension Hooks

        **Optional Hook**: {extension}
        Command: `/{command}`
        Description: {description}

        Prompt: {prompt}
        To execute: `/{command}`
        ```
      - **Mandatory hook** (`optional: false`):
        ```
        ## Extension Hooks

        **Automatic Hook**: {extension}
        Executing: `/{command}`
        EXECUTE_COMMAND: {command}
        ```
    - If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently
