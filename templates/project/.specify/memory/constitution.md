# `sp` Project Constitution

## Query-First Defaults

| Rule | Default |
| --- | --- |
| Project Entry | `project-index.md` |
| Feature Entry | `specs/<feature>/memory/index.md` |
| Default Active Feature Count | `1` |
| Default Primary Workset Count | `1` |
| Project Minimum Read Set | up to `5` files |
| Current Phase Ceiling | `sp.analyze` |

## Scope

- This project uses the `sp` layered document workflow.
- The default initial stage covers documentation only until an implementation stage is explicitly entered.
- `sp.implement` is allowed only after `tasks.md` exists, the active feature is clear, and the command's implementation verification rules can be followed.

## Layer Rules

- Layer 1 covers business clarification:
  - `sp.specify`
  - `sp.clarify`
  - `sp.flow`
  - `sp.ui`
  - `sp.gate`
  - `sp.bundle`
- Layer 2 covers delivery design documentation:
  - `sp.plan`
  - `sp.tasks`
  - `sp.analyze`

## Hard Boundaries

- Do not write production code during documentation-only commands. Production code changes belong under `sp.implement` or another explicit implementation route with task and verification evidence.
- Do not turn unresolved questions into fixed implementation commitments.
- Do not add a separate `sp.prd` route. `sp.specify` owns requirement intake, PRD-like refinement, conflict checks, and baseline `spec.md` creation.
- `sp.clarify` resolves ambiguity; it must not silently expand scope. If clarification reveals a new independent business goal, role, workflow, acceptance boundary, or release scope, record `NEW_FEATURE_DETECTED` and route back to `sp.specify` or ask the user to explicitly approve expanding the current feature.
- Do not skip `sp.gate` before entering second-layer work.
- Treat `sp.analyze` as diagnostic readiness analysis, not as authorization to skip required gate, task, or implementation checks.

## Representation Rules

- Flow documentation uses Mermaid.
- UI documentation uses Markdown plus JSON Forms when needed.
- Stable facts, rules, screens, APIs, tables, and acceptance anchors should use stable IDs.

## Memory Rules

- Project-level routing lives in `.specify/memory/*`.
- Feature-level routing lives in `specs/<feature>/memory/*`.
- Read project memory before deciding which feature to expand.
- Read feature memory before expanding source docs.
- Memory files must prioritize routing tables, lookup tables, and hotspots over long narrative text.
- Batch clarification queues must be queryable by topic, not buried in narrative text.
- Treat memory as routing and compression, not the final source of truth. When memory conflicts with source documents, verify against the source documents and refresh stale memory before finishing.
- Record real unresolved questions, todos, risks, blockers, rollback advice, and close conditions in `specs/<feature>/memory/open-items.md`. Do not create fake default `OPEN01` or `RISK01` rows.
- Keep trace links in `specs/<feature>/memory/trace-index.md`. Do not turn the trace index into a risk ledger.
- Do not close `@t0`, `@r0`, `OPEN`, `RISK`, trace gaps, or stale memory from model confidence alone. Require current source-doc, code, test/check, explicit human-decision, or documented non-automatable verification evidence before writing a more optimistic memory state.

## Context Control Rules

- The default target is the smallest sufficient read set, not full-project scanning.
- Before execution, identify the current level: project, feature, workset, or file.
- For feature work, include related business flow, UI, API, data, permissions, tests, and risks when they affect the current task.
- If the required context cannot be identified, stop and report the missing route instead of guessing.
- After changing stable facts, refresh the impacted source document and memory entry so the next run does not depend on chat history.

## Fallback Rules

- If a local task fails after bounded evidence-based attempts, move up one level instead of continuing to guess.
- Default upward route: implementation -> `tasks.md` -> `plan.md` -> `spec.md` / flows / ui / bundle -> constitution or user decision.
- After the first failed local attempt, make the second attempt change hypothesis or evidence. Record the failed assumption, the evidence that disproved it, and what the next attempt will do differently.
- Before fallback from implementation, inspect current changes and separate stable edits, failed attempts, unverified edits, and user-owned edits. Do not use destructive cleanup without explicit user approval.
- If the failure comes from unclear scope, conflicting docs, missing acceptance, or confused user intent, run or suggest `sp.clarify` first to restate the question, decision points, and next route. `sp.clarify` is a non-linear clarification route, not a normal upward layer; write its result back to the failed layer or a higher source doc/memory entry before continuing.
- Ask the user only for macro decisions: business scope, priority, success criteria, compliance, destructive changes, data risk, or long-term tradeoff.
- Do not treat ordinary uncertainty, insufficient reading, or locally verifiable errors as a user decision requirement.
- Record fallback evidence: failed layer, attempted evidence, why the current layer cannot solve it, next `sp.*` step.
- Same failure signature at the same layer gets at most two evidence-based attempts. If the same workset bounces between two layers beyond that threshold, stop automatic progress and return `NEEDS_DECISION` or `BLOCKED` with the failure chain, attempted routes, options, recommendation, and next `sp.*` route.

## Complexity Split Rules

- If one feature part becomes too large for one workset, discuss split during `sp.plan` before implementation.
- Hard split triggers include independent release rhythm, external system, permission/data model, irreversible migration, or open blockers that affect release, rollback, safety, or compliance.
- Soft split triggers require multiple signals such as many roles, many user paths, more than five concern types, too many trace anchors, or a read set that no longer fits one focused model window.
- Near-threshold split signals enter an observation band first: record the candidate split and risk, but do not create sub-features or sub-projects without stronger evidence or human confirmation. Once a split is confirmed, do not auto-merge it just because one metric later drops slightly.
- Observation band alone is not a hard gate. It records and prepares a split option; it should not block headless or non-interactive runs unless there is a confirmed split dispute, hard trigger, repeated failure, irreversible risk, risk acceptance, compliance/data decision, or explicit user request for a split decision.
- In headless runs, do not use observation band as permission to force an oversized task through one context. Shrink the current workset into sequential, verifiable local steps without changing feature structure. If a hard trigger exists or the shrunken scope still fails repeatedly, fail fast with `NEEDS_DECISION` or `BLOCKED`.
- Split only when complexity harms understanding, verification, or execution stability. Do not split just because a document is long.
- Split signals trigger a recommendation and human confirmation in `sp.plan`; do not automatically create sub-features or sub-projects.

## Error Signal Rules

- Treat open `Blocker`, high-impact open `Risk`, non-trivial `@t0`, `@r0`, unresolved references, stale memory, trace breaks, acceptance breaks, blocking placeholders, and failed checks as control error signals.
- `sp.analyze` and `sp.gate` should summarize these signals before PASS/FAIL/CONDITIONAL decisions.
- A PASS cannot hide increasing critical error signals behind prose. If critical signals increase, record why, impact, and the next safe `/sp.*` route.

## Coordinate And Status Rules

- Use stable searchable coordinates for important anchors, for example `FEAT01.WS02.API02`.
- Main coordinates identify stable objects; do not rewrite them for status changes.
- Use short searchable status tags only when needed, for example `@t0` for missing validation evidence and `@r0` for open risk.
- Keep status tags in `tasks.md`, `memory/trace-index.md`, `memory/open-items.md`, or phase reports. Source-of-truth documents keep stable anchors, stable facts, and acceptance evidence; do not write mutable status tags such as `@t0` or `@r0` into production code comments, test names, or source specification text.
- Status value `1` means the normal acceptable state and is usually implicit. Do not write normal or closed status tags everywhere unless a phase check explicitly needs that statistic.
- Start with at most two status tags per object. If more are needed, split the object or move details into `open-items.md`.
- Any `@r0` must have a matching `RISK01`-style row in `open-items.md`. A non-trivial `@t0` must have a matching `OPEN01` or `RISK01`-style row when it affects scope, acceptance, release, rollback, human decision, or follow-up work. Trivial `@t0` is only for local copy, format, low-risk UI polish, or immediately checkable reminders that do not affect those areas.
- Published coordinates must not be renumbered for cosmetic continuity. If an object is inserted, deleted, or retired, preserve old coordinates and use the next available coordinate or a semantic alias.
- Open risk cannot be self-approved by the model. Conditional risk acceptance requires explicit human decision, owner, impact scope, rollback or degrade path, close condition, and revisit anchor.
- Closing, deleting, or downgrading `Blocker`, high-impact `Risk`, or `@r0` requires current evidence, a traceable code/doc change, or explicit human acceptance. If diff evidence is available, verify that the state change and its evidence changed together.
- Task completion is the normal time to update task checkbox, current verification evidence, and directly affected status/open-item state. Mark a task complete only when that task's own completion conditions are met. If review or human decision is part of the same task, keep it open until review passes or the decision is recorded; if review or decision is separate, close the verified implementation task and keep the review/decision item visibly open with owner, close condition, and next review step.
- Parallel `[P]` tasks may implement independent files or scopes concurrently, but shared writeback must be serialized or batched. Do not let parallel agents simultaneously edit `tasks.md`, `memory/open-items.md`, `memory/trace-index.md`, workset routing, or broad status summaries; collect their evidence and merge shared memory in one owner step.
- Parallel agent prompts must state the disjoint write set and shared read-only files. Agents should return evidence and requested shared-memory changes instead of editing shared memory directly.

## Evidence Rules

- For high-impact implementation changes, record `Impact-Radius Plan` before changing files and `Impact-Radius Evidence` after verification.
- During planning and task generation, predict direct disturbances for high-impact changes: public API/schema, permissions, data migration, core UI fields, events/side effects, external dependencies, critical acceptance, and critical tests should name candidate affected anchors and verification paths.
- `Impact-Radius Plan` and `Impact-Radius Evidence` may be recorded in one execution turn, but the plan must be written before the relevant change and evidence only after the actual check or verification. If checks fail, Evidence records the failure, affected scope, and next route; it must not say PASS or verified. Do not issue parallel tool calls that can modify target files before the plan note is recorded.
- The plan states expected anchors, direct read set, and intended verification. Evidence states actual checks, actual verification result, and any open item.
- Keep impact-radius notes in task execution output, `tasks.md` task notes, phase output, or gate/analyze reports. Do not write them as production code comments. Only update memory or source docs when stable facts, risks, or open items changed.
- Fresh evidence must come from the current run or from a clearly cited current source file. Do not claim PASS from memory alone.
- PASS must respect mechanical evidence when available: active feature exists, required source docs have no blocking placeholders, critical trace/source links resolve, relevant checks have current results, and open blockers or unresolved high risks are not explained away by prose.
- In headless or non-interactive runs, do not fake human approval. Soft issues may be recorded and carried forward; manual decisions, hard gates, risk acceptance, disputed splits, compliance/data risk, or irreversible changes must return `NEEDS_DECISION` or `BLOCKED` with background, impact, options, recommendation, and next `sp.*` route. End the output with `SP_EXIT_CODE: 1` as a machine-readable blocker marker; if the host supports process exit control or an equivalent blocking status, use it so CI or automated runners cannot continue as if the command succeeded.
- Prefer isolation for headless automation: temp workspace, CI workspace, temp branch, or `git worktree`. CI runners should discard the temporary branch, directory, or worktree created for the task when isolated work fails, instead of doing partial reset in a user workspace. Record dirty files before high-risk work. If failed changes overlap user-owned dirty files or require destructive cleanup, return `BLOCKED` with background, impact, 2-4 options, recommendation, and next route instead of auto-resetting.
- Before returning `BLOCKED` in headless automation, include a failure-site report: changed files, failed command or check result, current judgment, why automatic recovery is unsafe, and the next `/sp.*` route. Save it as a CI artifact when the host supports artifacts.
- Soft issues are only low-risk warnings that do not affect routing, contracts, tests, acceptance, trace, `Blocker`, or high-impact `Risk`. Build/test/check failure, route error, acceptance break, critical trace break, open `Blocker`, or high-impact `Risk` without required fields cannot be treated as a soft issue.
- Before modifying existing code, inspect directly related tests, failing tests, adjacent/same-name tests, or at least their contract-bearing names/assertion summaries. Do not read every test by default, but do not ignore tests that define the changed behavior.
- Low-risk small edits may use a fast path: concise pre-change plan, direct edit, current verification evidence. Do not rewrite this as after-the-fact planning.

## Incremental Maintenance Rules

- Task completion is the normal time to update the task checkbox, current verification evidence, and directly affected status/open-item/trace state.
- Keep rechecks incremental. `sp.analyze` and `sp.gate` should inspect recently changed tasks, changed anchors, open risks/blockers/todos/decisions, stale or unchecked items, and direct dependencies first.
- Do not deep recheck a completed category or workset when it has current evidence, no reopened open item, no failed check, and no changed direct upstream contract dependency. Perform only a light consistency check unless the user asks for a full audit.
- Reopen or deep recheck a completed area when directly related source docs, public API contracts, data structures, permissions, acceptance paths, critical test evidence, routing, direct upstream contract dependencies, or related risks changed.
- This is not permission to skip evidence. It is a scope rule: focus detailed review on recent, open, stale, failed, or dependency-affected work.
- Incremental reading does not downgrade verification. When the current task directly changes or affects dependencies, public contracts, data, permissions, acceptance paths, or critical tests, run the local affected tests/checks/manual verification when feasible and record evidence. CI/full verification may cover broader regression or checks that cannot run locally, but it must not replace feasible local verification for the directly changed path.

## Command Naming Rules

- User-facing command form is `/sp.<command>`, for example `/sp.analyze`. Use this form when telling a user what to run next.
- Internal agent identifiers, phase names, and responsibility labels may use `sp.<command>` without slash because they are not user invocation syntax.
- Machine hook fields may keep command values without slash, for example `EXECUTE_COMMAND: {command}`; user-facing hook display should show `/{command}`.
- Internal skill directories such as `sp-analyze/SKILL.md` are installation details, not user invocation syntax.
- In memory text, use `sp.<command>` as the phase or responsibility name. Use command placeholders only for direct user action instructions that must render differently by host.

## Refresh Rules

- `sp.constitution` initializes the full project memory layer.
- `sp.specify` refreshes `feature-map.md` and `active-context.md`.
- `sp.gate` refreshes project-level verdict visibility.
- `sp.bundle` refreshes the minimum read set and current recommended workset.
- `sp.plan` refreshes workset counts and primary workset routing.
- `sp.analyze` refreshes project hotspots and latest readiness summary.

## Compatibility Rules

- Keep compatibility with the original Spec Kit workflow where practical.
- Preserve active feature detection from Git branch or `SPECIFY_FEATURE`.
- Preserve cross-platform behavior for macOS, Linux, and Windows.
- Preserve broad agent compatibility across slash-command agents and skills-style agents.
