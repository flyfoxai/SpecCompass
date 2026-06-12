# `sp` Command Specification

## 1. Purpose

This document explains what the `sp` command family is responsible for in the current project template.

Its role is not to replace the command templates themselves. It acts as the stable human-readable contract for:

- command naming
- workflow boundaries
- document outputs
- memory update responsibilities
- the allowed differences from upstream `Spec Kit`

## 2. Current Scope

The current `sp` workflow is documentation-first, but it is no longer documentation-only. The business and delivery documents remain the source of control; implementation is allowed only as a downstream, bounded phase after `plan.md` records implementation readiness and `tasks.md` produces executable `Mode: impl` task packets.

The main stage chain is:

1. `sp.constitution`
2. `[optional] sp.prd`
3. `sp.specify`
4. `sp.clarify`
5. `sp.flow`
6. `sp.ui`
7. `sp.gate`
8. `sp.bundle`
9. `sp.plan`
10. `sp.tasks`
11. `sp.analyze`
12. `sp.gate`
13. `sp.implement`
14. `sp.analyze`
15. `sp.gate`

`sp.prd` is an optional upstream discovery step. It may collect raw intent,
strategic goals, product positioning, business goals, capability maps,
candidate requirements, rejected ideas, open questions, and flow/UI/data/risk
seeds, but it does not create stable requirements. Stable requirements still
enter the workflow through `sp.specify` and `spec.md`.

When `sp.prd` is used, requirement growth should be top-down and
product-oriented: strategic goal, product positioning, business goals, target
users, capability map, problem domains, scenarios, scope boundaries, main
flows, key branches, acceptance seeds, risks, and then local details.
User-provided details may be kept, but they must attach to a parent strategic
goal, capability, flow, UI surface, data object, or acceptance boundary; orphan
details stay as candidates, seeds, or open items. The detail boundary is
`ready for sp.specify`, not `ready for implementation`.
`prd.md` must not replace `sp.flow`, `sp.ui`, `sp.plan`, or `sp.tasks`, and
should not default to full UI element inventories, state machines, APIs,
database schemas, code paths, test commands, or implementation tasks.

`sp.prd` and `sp.constitution` have different goals. `sp.prd` owns product or
feature discovery. `sp.constitution` owns durable project governance: long-term
principles, engineering discipline, phase boundaries, validation requirements,
risk gates, memory rules, and human-decision rules. Governance-like material
found during PRD discovery should be written as a `Constitution Candidate` in
`.specify/memory/constitution.md` with source feature, source tag, impact,
status, and next route. Candidates do not override formal constitution rules
until `sp.constitution` explicitly confirms, merges, rewrites, or promotes
them. If `prd.md` conflicts with a formal constitution rule, the formal
constitution wins and the safe route is `sp.clarify` or a human decision.
The `Constitution Candidates` section is the primary landing zone for governance
candidates. `prd.md` may keep source notes or handoff summaries, but it should
not force later commands to re-read the full PRD to rediscover the same
candidate. `sp.prd` may only append or update the candidate section; it must not
edit formal constitution rules, phase boundaries, validation requirements, or
governance text outside that section. Record a candidate only when it may recur
across features or affects safety, compliance, irreversible action, real
money/data risk, long-term engineering discipline, validation gates, or
human-decision rules. Single-feature local risks, local TODOs, and ordinary
requirement tradeoffs belong in PRD, feature memory, or `open-items.md`.
Candidate status values are fixed: `proposed`, `under-review`, `promoted`,
`rejected`, `merged`.

The active command set also includes `sp.checklist` for quality checklists. Issue-export helpers such as `sp.taskstoissues` may exist in the broader template tree, but they are integration helpers rather than required SP stage steps.

The code-stage contract is controlled by five commands:

- `sp.plan` is the single source of truth for `Implementation Readiness`.
- `sp.tasks` consumes readiness and creates `Mode: doc` or `Mode: impl` task packets.
- `sp.implement` executes only authorized `Mode: impl` tasks.
- `sp.analyze` diagnoses readiness, task packets, trace, memory, and implementation evidence.
- `sp.gate` consumes analysis and current decisive evidence to return `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION`.

## 3. Command Naming

The visible step names stay in the `sp` namespace.

The canonical user-facing command identity is:

- `/sp.<command>`

Typical examples:

- `/sp.specify`
- `/sp.plan`
- `/sp.analyze`

Skills integrations keep the upstream physical package shape. Current Codex uses skills as the stable entry point instead of project-local `/sp.*` slash commands: invoke `$sp-specify`, `$sp-plan`, `$sp-tasks`, `$sp-analyze`, `$sp-implement`, `$sp-gate`, or `$sp-ui`; run `/skills` and choose the matching `sp-*` skill; or ask in natural language when the task matches the skill description. Explicit `$sp-*` or `/skills` invocation is recommended for deterministic SP workflow stages, and `/sp.*` slash-menu visibility is not the Codex install success criterion.

## 4. What Must Stay Aligned With Upstream

The current fork tries to stay close to upstream `Spec Kit` in mechanism shape:

- command templates live under `templates/commands/`
- templates use frontmatter metadata such as `description`, `scripts`, `handoffs`, and `agent_scripts`
- templates keep the `## User Input` block and `$ARGUMENTS`
- initialization is expected to happen through `specify init`
- platform shell selection still follows upstream `sh` and `ps` conventions
- project assets still center around `.specify/`, `templates/`, `scripts/`, and `specs/`

This is the "same bottle" part.

## 5. What Is Intentionally Different From Upstream

The fork changes the workflow content, not only the wording.

Allowed content-level differences include:

- added layered steps such as `flow`, `ui`, `gate`, and `bundle`
- a stronger documentation-first boundary before implementation
- controlled code-stage handoff through `Implementation Readiness`, `Mode: impl` task packets, allowed write sets, required checks, and implementation evidence
- feature memory and workset routing requirements
- richer analysis expectations
- `sp.analyze` being allowed to write `analysis.md` and refresh related memory when findings require it

This means behavior can differ while the outer mechanism still tracks upstream closely.

## 6. Standard Command Shell

The current command templates follow a stable outer structure:

1. frontmatter metadata
2. `## User Input`
3. optional pre-execution hook instructions
4. command title such as `# sp.specify`
5. `## Outline`
6. explicit goal, rules, execution flow, outputs, and completion checks

In practical terms, each command should make the model do four things clearly:

- read the right routing files first
- stay inside the current phase boundary
- update only the artifacts owned by the step
- expose missing inputs instead of inventing facts

Every command should also preserve the SP stability rules:

- use the smallest sufficient read set before expanding context
- prefer memory-first continuation: project memory, feature memory, workset memory, trace/open-items, task `Read Set`, then direct source or test files
- write real unresolved issues to `memory/open-items.md`
- keep trace coordinates searchable and stable
- fall back upward one layer after bounded local evidence shows the current layer cannot solve the issue
- ask the user only for macro decisions that cannot be resolved from current project evidence

## 7. Output Contract

### 7.1 Project-Level Outputs

Project-level routing and memory live under `.specify/`.

The current baseline expects:

- `.specify/memory/constitution.md`
- `.specify/memory/project-index.md`
- `.specify/memory/feature-map.md`
- `.specify/memory/domain-map.md`
- `.specify/memory/active-context.md`
- `.specify/memory/hotspots.md`

### 7.2 Feature-Level Outputs

Feature work lives under `specs/<feature>/`.

The full `sp` document system may include:

- `spec.md`
- `clarifications.md`
- `clarify-log.md`
- `gate.md`
- `bundle.md`
- `plan.md`
- `tasks.md`
- `analysis.md`
- `flows/*`
- `ui/*`
- `delivery/*`
- `memory/*`

Not every file is seeded up front by the template root. Some are created or expanded by later commands.

## 8. Command Responsibilities

### `sp.constitution`

- establish the project-level rules
- create the first routing layer
- define what must not be skipped later
- own durable governance rather than feature PRD discovery
- preserve and normalize `Constitution Candidate` rows discovered by PRD or clarification work, without promoting them to formal rules unless explicitly confirmed
- keep `Constitution Candidates` as the primary candidate landing zone, with fixed status values and a strength threshold that keeps local feature risks out of global governance

### `sp.specify`

- create or refresh the baseline feature requirement document
- register the feature in project routing
- initialize the feature memory entry point

### `sp.clarify`

- resolve high-impact business ambiguities
- record answers and propagation obligations
- turn unresolved ambiguity into explicit tracked items
- generate a structured `Decision Package` when the next safe step depends on
  human scope, risk, compliance, rollback, split, or verification choice
  with these required fields: background, confirmed evidence, impact, 2-4
  options, tradeoffs, recommendation, and next `/sp.*` route
- record a `Decision Record` only after the user selects an option or gives a
  revised option; it must capture the selected choice, impact scope, writeback
  targets, close condition, revisit condition, and next command. The model recommendation is not the final decision.

### `sp.flow`

- express the business and state transitions clearly
- connect major steps and decision points back to stable IDs
- make the flow the main relation axis for business, UI, API, data, acceptance, tests, and code
- give critical steps a lightweight port contract: input, precondition or permission, action, output or side effect, target state, failure path, and verification evidence
- mark new or refreshed flow outputs as draft facts until `sp.analyze`, `sp.gate`, or equivalent evidence checks them
- check direct-neighbor data-linkage when flow changes affect state, data, permission, events, persistence, side effects, acceptance, tests, rollback, release, or human decisions
- route unresolved flow/data-linkage gaps to `open-items.md` and the closest owner command instead of inventing transitions

### `sp.ui`

- define screen structure, user actions, and interface-level responsibilities
- connect screens back to clarified business intent
- bind screens, fields, and actions to flow steps, business events, data objects, permissions, API contracts, acceptance paths, or open items
- avoid inventing business events, state transitions, permissions, side effects, or validation rules from UI convenience alone
- mark new or refreshed UI outputs as draft facts until `sp.analyze`, `sp.gate`, or equivalent evidence checks them
- check direct-neighbor data-linkage when UI changes affect fields, actions, validation, permissions, API parameters, screen states, tests, acceptance, rollback, release, or human decisions
- route unresolved UI business meaning to `sp.flow`, `sp.specify`, or `sp.clarify`; do not let UI absorb the missing business rule

### `sp.gate`

- decide whether the current stage is strong enough to continue
- support Business, Delivery, Implementation Readiness, and Implementation Regression gate modes
- consume the latest `analysis.md` or equivalent diagnostics when present instead of recomputing all analysis by default
- surface blockers, risks, stale information, trace gaps, readiness gaps, and verification gaps
- refuse `PASS` or `CONDITIONAL` when a high-impact blocker is still too broad to execute or verify
- return `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION` with evidence and the next `/sp.*` route
- block unconditional PASS when critical flow port contracts are missing, Flow-UI relations are broken, unchecked draft flow/UI/plan facts are being used as stable evidence, implementation readiness is missing or contradicted, implementation task packets are incomplete, or implementation evidence cannot be independently checked when required
- identify only pre-planning business complexity at the gate; delivery-level split signals remain owned by `sp.plan`, `sp.tasks`, and `sp.analyze`

### `sp.bundle`

- compress the stable first-layer conclusions for the delivery layer
- prepare the second layer to inherit the right facts instead of re-deriving them
- carry forward open risks, blockers, stale memory, direct-neighbor data-linkage gaps, rollback/release constraints, and human-decision points instead of hiding them in a summary
- never convert unchecked draft flow/UI/plan outputs into stable delivery input just because the bundle command succeeded

### `sp.plan`

- organize delivery design outputs
- split the feature into worksets
- define Source Layout, Runtime Commands, Code Mapping, Test Mapping, and Workset Code Boundary when implementation may follow
- define `Dependency Surface` and `Reverse Trace Expectation` when implementation may touch existing code, public behavior, schemas, permissions, routes, events, acceptance paths, or shared registries
- maintain `Implementation Readiness` as the single source of truth for whether each workset may produce `Mode: impl` tasks
- keep code mapping at module, directory, boundary-object, or key-file level unless high-risk public APIs, permissions, migrations, event boundaries, or acceptance-critical tests require stable CODE/TEST anchors
- make later reading smaller and more local

### `sp.tasks`

- bind worksets and deliverables into executable `Mode: doc` or `Mode: impl` tasks
- consume `plan.md` `Implementation Readiness`; do not invent a separate readiness source
- default missing mode to `Mode: doc`
- create `Mode: impl` task packets only when readiness supports implementation
- include `Allowed Write Set`, `Required Checks`, trace anchors or explicit no-trace reason, and visible effective defaults for implementation tasks
- include continuation fields for high-risk or code-continuation tasks: `Read Set`, `Dependencies Checked`, `Reverse Trace Checked`, `Expected Delta`, `Delta Summary`, and `Proposed Updates`, or a clear `N/A - <reason>` no-applicable reason; empty fields are not evidence
- split broad blocker cleanup into the smallest executable task, decision task, verification task, or memory/trace closeout task
- keep task boundaries aligned with the workset split

### `sp.implement`

- execute only selected `Mode: impl` tasks with sufficient task-packet fields
- confirm `plan.md` readiness, `Allowed Write Set`, `Required Checks`, trace anchors, open items, and effective defaults before editing
- use memory-first routing before reading code broadly: feature memory, workset memory, trace/open-items, task `Read Set`, direct source/test files, then dependency expansion only when evidence requires it
- check direct dependencies and reverse trace before risky code changes, especially delete, move, rename, public behavior, schema, permission, route, event, or acceptance changes
- fill a `Delta Summary` for code-continuation or high-risk tasks so reviewers can start from the actual change instead of rereading the whole feature
- refuse to auto-expand write boundaries; return `NEEDS_PLAN` for wrong code/workset boundaries, `NEEDS_TASKS` for incomplete task packets, and `NEEDS_CONTEXT` for missing required context that cannot be recovered from routed files
- reduce blocker, repeated-failure, or broad "solve blockers" requests to one smallest solvable unit before editing; route upward or to human decision when that cannot be done safely
- preserve CODE/TEST trace discipline for high-risk boundaries and acceptance-critical tests
- perform lightweight reference scans before deleting, moving, or renaming code, tests, routes, schemas, permissions, migrations, events, or public UI/API objects
- record verification evidence, task state, proposed trace updates, and open-item changes before claiming completion

### `sp.checklist`

- generate focused quality checklists for requirements, design, implementation readiness, or review contexts
- keep checklist items tied to source documents and acceptance expectations
- treat checklist output as requirement-quality evidence, not business PASS
- route high-impact ambiguity, conflict, missing acceptance, Flow-UI/data-linkage gaps, blockers, or human choices to `sp.clarify`, `sp.specify`, `sp.flow`, `sp.ui`, `sp.plan`, `sp.tasks`, `sp.analyze`, or `sp.gate` instead of resolving them inside the checklist

### `sp.taskstoissues`

- act only as an issue-export helper; it is not a required SP stage step and must not repair planning or implementation gaps
- export only tasks that preserve the SP task contract: `Mode`, source anchor or no-trace reason, workset or owner, dependencies, allowed write set when relevant, required checks, open-item or blocker status, and next route when incomplete
- stop before creating issues when the GitHub remote is ambiguous, selected tasks are incomplete, open blockers affect export, feature routing is stale, or a human decision is required
- created issues do not prove business PASS; they only prove task export happened

### `sp.analyze`

- test whether the whole document and implementation-evidence system is automation-ready
- verify consistency across the routed source set
- diagnose `Implementation Readiness`, task mode integrity, implementation task packets, CODE/TEST trace, trace warning escalation, and implementation evidence without replacing `plan.md` as the readiness source
- review implementation evidence delta-first when available: `Delta Summary`, current diff, task packet, trace/open-items, then necessary source code
- fail explicitly when memory is stale, coverage is weak, smoke checks are missing, task packets are incomplete, or high-risk trace/evidence gaps are untracked
- detect Flow-UI relation breaks, orphan UI/API/data/CODE/TEST anchors, missing port-contract fields, and unchecked draft facts being promoted to stable memory
- decompose unresolved or repeatedly failing blockers by root layer and smallest solvable unit before recommending implementation or gate PASS

## 9. Read-Order Contract

The current commands are not allowed to jump directly into a full scan when routing files already exist.

Default read order:

1. `.specify/memory/project-index.md`
2. `.specify/memory/active-context.md`
3. `specs/<feature>/memory/index.md`
4. only then the smallest useful source documents for the active area

If the project-level route is stale, the command should mark it stale and continue from the freshest feature-level evidence.

If there is no reliable active feature, the command should stop with a clear next step, usually `/sp.specify`, instead of inventing a feature from a branch name or empty directory.

## 10. Boundary Rules

All current `sp` commands should preserve these rules unless a later product decision changes them explicitly:

- stay within the command's phase boundary
- do not write production code from documentation, planning, task-generation, analysis, gate, bundle, flow, UI, clarify, specify, constitution, or checklist commands
- let `sp.implement` write code only for authorized `Mode: impl` tasks with current readiness, allowed write boundaries, and required checks
- do not invent missing facts, readiness, task packet fields, trace anchors, or human decisions
- do not silently ignore stale routing
- do not treat memory as a replacement for source-of-truth documents or current code/test evidence
- do not redo full-project reading when a smaller routed read set is enough
- do not force reviewers to rediscover implementation intent when `Delta Summary`, task packet, and direct trace evidence are available
- do not auto-expand `Allowed Write Set`; route wrong boundaries to `NEEDS_PLAN`, incomplete packets to `NEEDS_TASKS`, and unrecoverable missing context to `NEEDS_CONTEXT`
- do not turn ordinary local uncertainty into a user decision request before checking the bounded evidence
- do not continue broad execution when a blocker cannot be reduced to a smallest solvable unit
- do not mark a blocker or high-impact risk as PASS without owner, impact, rollback or degrade path, and close condition
- do not treat implementation self-reports as release evidence without rerunnable checks or explicit alternative evidence when checks cannot run
- do not treat command success, generated documents, or exit code 0 as business PASS; business PASS still requires acceptance, trace, open-item, data-linkage, code/test evidence, and gate verdict
- do not stage or commit unauthorized `src/`, `scripts/`, config, generated-code, schema, or test assets during document-stage closeout; turn required code work into a `Mode: impl` code handoff packet instead

## 11. Coordinates, Status, And Open Items

Stable coordinates are part of the command contract because they reduce repeated inference.

Commands should preserve or create coordinates for important anchors when practical:

- feature and workset anchors such as `FEAT01.WS02`
- flow, UI, API, data, permission, event, and acceptance anchors such as `FEAT01.WS02.API02`
- source anchors such as `FLOW-*`, `SCREEN-*`, `API-*`, `TABLE-*`, and `ACC-*`

Status tags are short search signals, not full records:

- `@t0` means validation evidence is missing or insufficient
- `@r0` means an open risk exists
- non-trivial `@r0` must point to `memory/open-items.md`
- non-trivial `@t0` should point to `memory/open-items.md`

Low or Medium `Question` and `Todo` items may stay lightweight when they are local and do not affect scope, acceptance, release, rollback, security, or implementation confidence. `Risk`, `Blocker`, High severity items, and any broader-impact item must use the full `open-items.md` record with owner, impact, rollback or degradation path, close condition, refresh date, and trace/source link.

Lightweight does not mean invisible. A local low-risk `Question` or `Todo` still needs enough location, status, and next-action detail for a later command to find it. Full field validation applies to `Risk`, `Blocker`, High severity items, and any item that affects scope, acceptance, release, rollback, security, or implementation confidence.

## 12. Flow, UI, And Draft Fact Contract

For business features, `FLOW` is the preferred relation axis. UI, API, TABLE, CODE, TEST, EVENT, PERM, and ACC anchors should normally trace to a `FLOW` coordinate, a source document, or an explicit `open-items.md` entry.

Critical flow steps should carry a lightweight port contract:

- input
- precondition or permission
- business action
- output or side effect
- target state
- failure path
- verification or acceptance evidence

UI is a projection of flow and data, not an independent source of business behavior. A screen, field, or action should be tied to a flow step, business event, data object, permission, API contract, acceptance path, or open item. If UI work discovers a new business event, state transition, validation rule, or side effect, the correct route is back to `sp.flow`, `sp.specify`, or `sp.clarify`.

Data linkage is a first-class impact trigger. When a data object, table, field, state, event, permission, or persistence meaning changes, check the directly related UI fields, API contracts, permission rules, emitted side effects, acceptance paths, tests, and trace/open item entries. When UI fields, API parameters, permission behavior, or test semantics change, check the related flow node and data object. Keep this to direct neighbors by default; do not turn it into multi-hop graph maintenance unless evidence requires it.

Relationship verbs carry constraints. Use stable verbs such as `guards`, `persists_to`, `reads`, `writes`, `emits`, `verifies`, `depends_on`, and `blocks` when they affect impact radius. Missing relations should be repaired in trace/source docs, routed to `open-items.md`, or treated as blockers when they affect acceptance, tests, release, rollback, permissions, data safety, or human decisions.

Outputs from `sp.flow`, `sp.ui`, and `sp.plan` are draft facts until checked by `sp.analyze`, `sp.gate`, or equivalent current evidence. Draft facts may guide the next discussion, but they must not close risks, update stable trace conclusions, support PASS, or become the sole implementation basis.

When `tasks.md` does not exist yet, equivalent current evidence is a bounded draft-safety check: the output has source backing, did not overwrite stable memory, did not close risks, did not support PASS, and has trace/open-item routing or remains labeled as draft. This check does not replace full `sp.analyze`, `sp.gate`, or `plan.md` `Implementation Readiness`.

Keep public coordinates shallow and stable. The main coordinate should usually look like `FEAT01.WS02.UI03`, not `FLOW01.STEP04.BUTTON02.FIELD07`. Use local labels for internal details, and promote a detail to a stable coordinate only when it recurs across documents.

## 13. Workflow YAML Extension Boundary

Workflow YAML should stay open enough for future `Spec Kit` and SP extensions.

Unknown top-level, workflow metadata, input, or step fields should warn but not block execution. The CLI may preserve those fields for future tooling, but it must not silently pretend to understand them.

This rule gives SP two benefits:

- small future workflow extensions do not break older projects immediately
- model-facing workflow files can carry extra routing or audit metadata without forcing every parser update to become a breaking change

Known structural errors still fail validation, for example missing `workflow.id`, invalid step type, invalid semantic version, or malformed `steps`.

Keep todo, risk, blocker, rollback, impact, owner, and close-condition details in `memory/open-items.md`. Keep lookup chains in `memory/trace-index.md`.

For unresolved, high-impact, broad, or repeatedly failing blockers, commands
should use a lightweight `Blocker Breakdown` before executing or passing a
gate. The minimum fields are symptom, current evidence, root layer, smallest
solvable unit, repair strategy, verification, writeback target, and next
`/sp.*` route. Root layer should use the existing workflow layers: `prd`,
`spec`, `clarify`, `flow`, `ui`, `plan`, `tasks`, `implement`, `verify`,
`memory`, `external`, or `human-decision`.

`memory/open-items.md` remains the single stable truth source for blockers.
`analysis.md`, `gate.md`, task notes, or command output may include blocker
breakdowns and closeout reports, but those are report projections, not a second
persistent blocker ledger. Low-risk local warnings do not need the full
breakdown unless they begin to affect scope, acceptance, release, rollback,
security, implementation confidence, or human decision.

Keep cross-command fallback attempts in `specs/<feature>/memory/fallback-log.md`
when repeated failures or upward routes occur. The fallback log is not a new
truth source; it is a lightweight anti-oscillation ledger so later commands can
recognize the same workset, failure signature, attempted routes, evidence, and
next recommended step without rediscovering the loop.

## 14. Code Continuation And Delta Review Contract

When implementation continues existing code, SP should reduce token waste by
making the intended change and its direct impact explicit.

`sp.plan` should name the code-stage `Dependency Surface` and `Reverse Trace
Expectation` at module, directory, boundary-object, key-file, or shared-registry
level. It should not try to build a full AST graph or function-level inventory
unless a high-risk public boundary already needs a stable `CODE` or `TEST`
anchor.

`sp.tasks` should turn that planning context into a task packet. For high-risk
or code-continuation `Mode: impl` tasks, the packet should include:

- `Read Set`: the smallest memory, source-doc, code, and test files to read
  before editing
- `Dependencies Checked`: direct dependencies, imports, routes, contracts,
  schemas, permissions, events, tests, or workset neighbors to check
- `Reverse Trace Checked`: reference/search evidence required before delete,
  move, rename, public behavior, schema, permission, route, event, or
  acceptance changes
- `Expected Delta`: the intended change in one concise statement
- `Delta Summary`: the closeout note that records files changed, anchors
  affected, checks run, dependency/reverse-trace evidence, proposed updates, and
  remaining gaps
- `Proposed Updates`: shared-memory, trace, source-doc, task-state, or open-item
  updates that a worker proposes when direct writeback is not allowed

`sp.implement` should consume this packet instead of rediscovering context from
scratch. It starts from memory and the task `Read Set`, expands through direct
dependencies or failing evidence, performs required reverse-trace checks before
risky changes, and fills the `Delta Summary` before claiming completion.

`sp.analyze` and `sp.gate` should review implementation work delta-first when
evidence exists: `Delta Summary` -> current diff -> task packet ->
trace/open-items -> necessary source code. The `Delta Summary` is a review
surface, not proof by itself. It must match current files, current task state,
direct trace/open-items, and required checks before it can support PASS.

## 15. PASS / FAIL / BLOCKED Expectations

`sp.analyze` and related review-style steps must remain evidence-based.

A diagnostic `PASS` is only justified when:

- routing is coherent
- the active feature is identifiable
- core documents are present and cross-consistent
- readiness and task packets are coherent when implementation is in scope
- traceability is good enough for later automation or bounded implementation
- stale memory, missing smoke checks, and major coverage gaps are not left open

If those conditions are not met, the correct diagnostic result is `FAIL`,
`BLOCKED`, or `NEEDS_DECISION` with the exact blocking step to revisit.
Use `FAIL` for a repairable evidence or consistency failure, `BLOCKED` when
safe automatic progress is no longer possible, and `NEEDS_DECISION` when the
next step depends on human product, risk, compliance, rollback, or scope choice.

Missing required context should normally be reported as `BLOCKED` with context
details and the next `/sp.*` route, or `NEEDS_DECISION` when the missing context
requires human choice. `NEEDS_CONTEXT` remains an implementation/task fallback
route, not an `/sp.analyze` verdict.

When a verdict depends on human judgment, route to `/sp.clarify` unless a
current decision package and human-selected decision record already exists.
The package must explain the background, confirmed evidence, impact, 2-4
options, tradeoffs, recommendation, and next `/sp.*` route. The decision record
must capture the user's selected or revised choice, impact scope, writeback
targets, close condition, revisit condition, and next command.

When `sp.analyze` has only low-risk warnings, the formal verdict field remains
`PASS`; warning details belong in findings, evidence, or `memory/open-items.md`.
`PASS with warning` is prose, not a machine-readable verdict value.

`sp.analyze` and `sp.gate` may update routing, status, open-items, and memory,
but post-verdict writeback from the same run must not be the primary evidence
for that run's `PASS`. `PASS` evidence must come from current inputs, check
results, upstream source documents, current code/test evidence, or explicit
human decisions.

`sp.gate` uses the formal stage verdict set: `PASS`, `FAIL`, `CONDITIONAL`,
`BLOCKED`, or `NEEDS_DECISION`. If gate evidence lacks required context, the gate
should explain the missing context in evidence and normally return `BLOCKED` or
`NEEDS_DECISION`, not invent a separate gate verdict.

`CONDITIONAL` is a gate-only verdict for named conditions that must be closed or
explicitly accepted before the downstream stage is suggested. `PASS with warning`
is not a valid gate verdict.

## 16. Why This Reference Exists

This file exists so overview documents can point to a stable explanation of the `sp` command contract without forcing readers to open every command template one by one.

When command templates evolve, this reference should be updated to match the current mechanism and output contract.
