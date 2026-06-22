---
description: Organize delivery design outputs, code landing boundaries, and implementation readiness.
handoffs:
  - label: Create Tasks
    agent: sp.tasks
    prompt: Bind worksets, deliverables, code landing boundaries, and acceptance items into executable doc or implementation tasks.
    send: true
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-bundle
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireBundle
agent_scripts:
  sh: scripts/bash/update-agent-context.sh __AGENT__
  ps: scripts/powershell/update-agent-context.ps1 -AgentType __AGENT__
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before planning)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_plan` key.
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

# /sp.plan

## Outline

Goal: Organize delivery design outputs, code landing boundaries, and implementation readiness while preserving traceability back to the first-layer business documents.

Global rules:
- Stay within planning work only: this command may plan code landing, test strategy, and implementation readiness, but it must not edit production code.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Manage context as an engineering budget: start from routing, bundle, trace, and open items; expand only to the workset or source documents needed for the current planning decision.

Execution flow:

1. Run `{SCRIPT}` from repo root once and parse the returned JSON for current feature routing.
2. Run Stage Entry Preflight before delivery planning.
   - Confirm routing identifies one active feature and the required `bundle.md` is current enough for planning.
   - Check whether user input changes product goal, requirements, acceptance, flow, UI, workset boundary, architecture boundary, or implementation-readiness expectations. Route upstream before planning if the change belongs to PRD/spec/clarify/flow/ui.
   - Confirm upstream flow and UI contracts needed by the requested workset are present or explicitly tracked as open items. If delivery planning would have to invent flow state, UI behavior, data binding, permission, acceptance, or source facts, stop and route to `/sp.flow`, `/sp.ui`, `/sp.specify`, or `/sp.clarify`.
   - Confirm flow/UI batch confirmation is complete before treating those artifacts as planning input. If flow or UI readiness is `WAITING_FOR_BATCH_REVIEW`, partial, rejected, stale, or missing batch confirmation evidence, stop and route to the relevant `/sp.flow` or `/sp.ui` batch review path instead of creating implementation readiness.
   - If preflight fails, report `Missing/Weak Artifact`, `Blocker Type`, `Root Layer`, `Owner Route`, `Why current command cannot continue`, `Next /sp.* route`, and `Writeback Target`. Do not create implementation readiness from missing or generic upstream facts.
3. Load the smallest useful planning context:
   - `.specify/memory/feature-map.md`
   - `specs/<feature>/memory/index.md`
   - `specs/<feature>/memory/stable-context.md`
   - `specs/<feature>/memory/open-items.md`
   - `specs/<feature>/memory/trace-index.md` when present
   - `specs/<feature>/bundle.md`
   - the constitution rules that constrain delivery design
4. Produce or refresh the delivery design outputs.
   - Define the delivery design objects and workset structure.
   - Keep relationships among flows, screens, data, APIs, permissions, and acceptance explicit.
   - Treat unchecked `/sp.flow` and `/sp.ui` outputs as draft facts. They may guide planning discussion, but they cannot create implementation readiness. Any workset, API, data, permission, event, or acceptance decision that depends on an unchecked draft or `WAITING_FOR_BATCH_REVIEW` batch must cite the draft status and create or preserve an open item until the relevant batch is confirmed and `/sp.analyze`, `/sp.gate`, or equivalent evidence checks it.
   - Preserve `FLOW` as the main relation axis: delivery objects should trace back to `FLOW` coordinates, source documents, or open-item evidence instead of inventing independent UI/API/data behavior.
   - Before finalizing worksets, check that critical flow steps have enough port contract evidence for delivery planning: input, permission or precondition, action, output or side effect, target state, failure path, and verification route. Missing pieces should trigger fallback to `/sp.flow`, `/sp.ui`, `/sp.specify`, `/sp.clarify`, or a human macro decision.
   - Split the feature into bounded work areas when the scope justifies it.
   - Assess whether any work area is too large for a stable workset before writing the final plan.
   - Predict direct disturbances for high-impact delivery changes before finalizing worksets:
     - public API/schema, permissions, data migration, core UI fields, events/side effects, external dependencies, critical acceptance, and critical tests
     - for each relevant disturbance, name candidate affected anchors or documents and the verification path that `sp.tasks` or implementation must preserve
     - keep this to direct neighbors; do not turn planning into full-repo impact analysis unless the evidence requires it
   - Treat complexity as needing split/promotion review only when evidence is strong:
     - any hard signal: distinct external system, release cadence, permission/data model, independent migration, irreversible data/security/compliance/rollback risk, or 2+ blocking open items affecting acceptance/release/rollback/security
     - or at least three warning signals: 3+ roles, 4+ user paths, 5+ artifact categories across UI/API/data/permissions/events/migration/external systems, 12+ trace anchors, 8+ core docs needed for one workset, or implementation expected across 8+ major files or 4+ module boundaries
   - Treat near-threshold complexity as an observation band, not an automatic split. Record the candidate split and risk, but wait for stronger evidence or user confirmation before creating sub-features or sub-projects.
   - Recommend the smallest safe promotion level and ask for confirmation before creating sub-features or sub-projects:
     - isolated workset group when the area remains inside the same feature and release target
     - sub-feature when it has an independent user goal, acceptance loop, or task plan
     - sub-project when it has an independent lifecycle, external system, release cadence, permission/data model, or repo-level impact
   - When a complex area is confirmed for promotion, record only the contract required for that level:
     - isolated workset group: goal, boundary, acceptance, writeback path
     - sub-feature: inputs/constraints, outputs, impact scope, invariants, acceptance, writeback path
     - sub-project: full parent-child contract, integration checks, rollback strategy, and human decision points
   - If planning cannot safely close at the current layer after bounded evidence review, fall back upward instead of guessing:
     - bundle or first-layer package is incomplete -> revisit `/sp.bundle`
     - business scope, flow, or UI source is inconsistent -> revisit `/sp.specify`, `/sp.clarify`, `/sp.flow`, or `/sp.ui`
     - product tradeoff or acceptance boundary is missing -> ask for a human macro decision
   - Record the source layer, reason, target layer, exact next `/sp.*` step, and memory/source-doc writeback requirement for every fallback.
   - Produce the code-stage landing plan needed for later implementation without writing code:
     - `Source Layout`: target modules, directories, or key files by workset
     - `Runtime Commands`: install, test, build, lint, typecheck, and local smoke commands when known
     - `Code Mapping`: workset/flow/UI/API/data/permission/event/acceptance anchors to module, directory, boundary object, or key-file level
     - `Test Mapping`: acceptance-critical tests, contract tests, UI interaction checks, or manual verification paths
     - `TDD-aware task shaping`:
       - For acceptance-critical behavior, create or identify the proving test/check before the implementation task when feasible.
       - If no automated test is practical, record the manual verification path and why automated coverage is not being added in this task.
       - A core behavior change without a test/check path is not implementation-ready unless the exception is explicitly tracked.
     - `Dependency Surface`: direct imports, routes, contracts, schemas, permissions, events, global registries, and related tests that implementation tasks must check before editing or closeout
     - `Reverse Trace Expectation`: when delete, move, rename, public behavior, schema, permission, route, event, or acceptance changes are allowed, name the required reverse lookup/search evidence
     - `Workset Code Boundary`: allowed code/test/config areas and forbidden/shared areas for implementation tasks
     - `Global Registry Risk`: package manifests, lockfiles, route registries, schemas, permission matrices, global config, cross-module contracts, migrations, event bus registries, or other shared files that require serialized ownership
     - `Implementation Readiness`: the single source of truth for whether each workset can produce `Mode: impl` tasks
   - Keep `Code Mapping` at module, directory, boundary-object, or key-file level unless a high-risk public API, permission rule, data migration, event boundary, or core acceptance test already needs a stable `CODE` or `TEST` anchor. Do not invent function-level trace before implementation evidence exists.
   - When implementation readiness is blocked, record the exact reason and fallback route: `/sp.specify`, `/sp.clarify`, `/sp.flow`, `/sp.ui`, `/sp.bundle`, `/sp.plan`, `/sp.tasks`, or human macro decision.
   - For complex blockers that affect code boundaries, worksets, runtime commands, implementation readiness, or architecture route, record a planner-owned blocker handoff instead of leaving a broad note:
     - `Blocker ID`
     - `Failure Signature` using `<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>`
     - `Root Layer`
     - `Disconfirming Evidence` when retrying
     - smallest solvable unit
     - `Next Route`
     - `Writeback Target`
   - If a planning blocker reaches `NEEDS_DECISION`, freeze downstream work for the same `Blocker ID` until the human-selected decision is written back to the source doc, task, or `memory/open-items.md`. A model recommendation is not enough.
   - If planning sees a repeated fallback signature, append or propose a `fallback-log` entry or `promote-candidate: <Failure Signature>` for `/sp.analyze` or `/sp.gate` to promote. Do not directly create, merge, close, or promote `memory/open-items.md` blocker state from `/sp.plan`.
   - File-backed Evidence:
     - Prefer existing feature artifacts for evidence writeback. Use task notes/status for task-local checks, `memory/open-items.md` for unresolved risk/blockers, `memory/fallback-log.md` for repeated failure signatures, and trace/stable memory only for stable source-backed facts.
     - Do not create a new evidence artifact by default. Add one only when the project explicitly adopts it.
5. Refresh workset and routing memory.
   - Create or update `specs/<feature>/plan.md`
   - Create or update `specs/<feature>/memory/worksets/index.md`
   - Create or update `specs/<feature>/memory/worksets/ws-*.md`
   - Refresh `specs/<feature>/memory/index.md`
   - Refresh `.specify/memory/feature-map.md` when workset routing changes materially
6. Update agent-facing context if supported by the host.
   - Use `__CONTEXT_FILE__` as the host-specific context file when it exists.
   - Run `{AGENT_SCRIPT}` when the environment supports agent context refresh.
   - Preserve manual additions and avoid overwriting unrelated context.
7. Validate before finishing.
   - Confirm worksets are bounded and actionable.
   - Confirm major delivery objects and relationships are visible.
   - Confirm routing memory points to the current primary workset.
   - Confirm `Implementation Readiness` is present in `plan.md` and is not contradicted by open blockers, missing code landing boundaries, missing validation commands, or missing source contracts.
   - Confirm code-stage planning includes the dependency surface and reverse-trace expectation needed for `/sp.tasks` to generate bounded implementation packets without broad rereading.

## Output

- Create or update `specs/<feature>/plan.md`
- Create or update `specs/<feature>/memory/worksets/index.md`
- Create or update `specs/<feature>/memory/worksets/ws-*.md`
- Refresh `specs/<feature>/memory/index.md`
- Refresh `.specify/memory/feature-map.md` when workset routing changes materially

## Key Rules

- Do not write production code here.
- Do not generate executable implementation tasks here. Record implementation readiness and code landing boundaries so `/sp.tasks` can generate `Mode: impl` tasks later.
- Do not collapse multiple independent work areas into one vague workset.
- Do not keep an oversized area inside one workset when it already exceeds the model's stable context window; recommend splitting or promotion with an explicit parent-child contract, then get confirmation before creating sub-features or sub-projects.
- Do not over-split ordinary work. Promote only when complexity blocks stable understanding, verification, or execution.
- Do not promote solely because a document is long or many files exist. Require observable complexity signals and choose the smallest safe level.
- Do not promote just because implementation is technically hard when the scope and contracts are clear. Split tasks or add tests first.
- Do not oscillate around split thresholds. Near-threshold complexity should be recorded as an observation item; confirmed splits should not be auto-merged without a new explicit decision.
- Do not lose traceability back to first-layer sources.
- Do not treat unchecked flow or UI draft facts as stable workset, delivery, risk-closure, or implementation basis.
- Keep planning constrained to the active feature and workset area.
- Do not continue splitting delivery tasks when the safe next action is to repair first-layer source documents or ask for a macro decision.
- Do not let `tasks.md`, `analysis.md`, or `gate.md` invent a separate implementation-readiness source. `plan.md` `Implementation Readiness` is the authority; other commands consume, diagnose, or decide from it.

## Post-Execution Checks

**Check for extension hooks (after planning)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_plan` key.
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

End every run with a concrete closeout recommendation. Do not only say whether `/sp.tasks` is possible. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.

Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, plan Implementation Readiness, workset boundaries, and this planning evidence. If split, promotion, ownership, allowed write set, or human-decision evidence is unresolved, recommend `/sp.clarify`, `/sp.plan`, or the exact owner route instead of `/sp.tasks`.

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

- Recommend `/sp.tasks <feature>` only when workset boundaries, implementation readiness, allowed write sets, required checks, and split/promotion decisions are confirmed or explicitly non-blocking.
- If the plan proposes a workset split, sub-feature promotion, sub-project promotion, near-threshold split decision, major ownership boundary, or implementation-readiness downgrade that needs human acceptance, recommend `/sp.clarify <feature>` or another `/sp.plan <feature>` pass with the exact decision prompt.
- When workset split, sub-feature promotion, sub-project promotion, ownership boundary, or readiness downgrade is unresolved, do not suggest `/sp.tasks` as the immediate next step; end with an explicit confirmation prompt and the owner route.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
