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
2. `sp.specify`
3. `sp.clarify`
4. `sp.flow`
5. `sp.ui`
6. `sp.gate`
7. `sp.bundle`
8. `sp.plan`
9. `sp.tasks`
10. `sp.analyze`
11. `sp.gate`
12. `sp.implement`
13. `sp.analyze`
14. `sp.gate`

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

### `sp.specify`

- create or refresh the baseline feature requirement document
- register the feature in project routing
- initialize the feature memory entry point

### `sp.clarify`

- resolve high-impact business ambiguities
- record answers and propagation obligations
- turn unresolved ambiguity into explicit tracked items

### `sp.flow`

- express the business and state transitions clearly
- connect major steps and decision points back to stable IDs
- make the flow the main relation axis for business, UI, API, data, acceptance, tests, and code
- give critical steps a lightweight port contract: input, precondition or permission, action, output or side effect, target state, failure path, and verification evidence
- mark new or refreshed flow outputs as draft facts until `sp.analyze`, `sp.gate`, or equivalent evidence checks them

### `sp.ui`

- define screen structure, user actions, and interface-level responsibilities
- connect screens back to clarified business intent
- bind screens, fields, and actions to flow steps, business events, data objects, permissions, API contracts, acceptance paths, or open items
- avoid inventing business events, state transitions, permissions, side effects, or validation rules from UI convenience alone
- mark new or refreshed UI outputs as draft facts until `sp.analyze`, `sp.gate`, or equivalent evidence checks them

### `sp.gate`

- decide whether the current stage is strong enough to continue
- support Business, Delivery, Implementation Readiness, and Implementation Regression gate modes
- consume the latest `analysis.md` or equivalent diagnostics when present instead of recomputing all analysis by default
- surface blockers, risks, stale information, trace gaps, readiness gaps, and verification gaps
- return `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION` with evidence and the next `/sp.*` route
- block unconditional PASS when critical flow port contracts are missing, Flow-UI relations are broken, unchecked draft flow/UI/plan facts are being used as stable evidence, implementation readiness is missing or contradicted, implementation task packets are incomplete, or implementation evidence cannot be independently checked when required
- identify only pre-planning business complexity at the gate; delivery-level split signals remain owned by `sp.plan`, `sp.tasks`, and `sp.analyze`

### `sp.bundle`

- compress the stable first-layer conclusions for the delivery layer
- prepare the second layer to inherit the right facts instead of re-deriving them

### `sp.plan`

- organize delivery design outputs
- split the feature into worksets
- define Source Layout, Runtime Commands, Code Mapping, Test Mapping, and Workset Code Boundary when implementation may follow
- maintain `Implementation Readiness` as the single source of truth for whether each workset may produce `Mode: impl` tasks
- keep code mapping at module, directory, boundary-object, or key-file level unless high-risk public APIs, permissions, migrations, event boundaries, or acceptance-critical tests require stable CODE/TEST anchors
- make later reading smaller and more local

### `sp.tasks`

- bind worksets and deliverables into executable `Mode: doc` or `Mode: impl` tasks
- consume `plan.md` `Implementation Readiness`; do not invent a separate readiness source
- default missing mode to `Mode: doc`
- create `Mode: impl` task packets only when readiness supports implementation
- include `Allowed Write Set`, `Required Checks`, trace anchors or explicit no-trace reason, and visible effective defaults for implementation tasks
- keep task boundaries aligned with the workset split

### `sp.implement`

- execute only selected `Mode: impl` tasks with sufficient task-packet fields
- confirm `plan.md` readiness, `Allowed Write Set`, `Required Checks`, trace anchors, open items, and effective defaults before editing
- refuse to auto-expand write boundaries; return `NEEDS_PLAN` for wrong code/workset boundaries, `NEEDS_TASKS` for incomplete task packets, and `NEEDS_CONTEXT` for missing required context that cannot be recovered from routed files
- preserve CODE/TEST trace discipline for high-risk boundaries and acceptance-critical tests
- perform lightweight reference scans before deleting, moving, or renaming code, tests, routes, schemas, permissions, migrations, events, or public UI/API objects
- record verification evidence, task state, proposed trace updates, and open-item changes before claiming completion

### `sp.checklist`

- generate focused quality checklists for requirements, design, implementation readiness, or review contexts
- keep checklist items tied to source documents and acceptance expectations

### `sp.analyze`

- test whether the whole document and implementation-evidence system is automation-ready
- verify consistency across the routed source set
- diagnose `Implementation Readiness`, task mode integrity, implementation task packets, CODE/TEST trace, trace warning escalation, and implementation evidence without replacing `plan.md` as the readiness source
- fail explicitly when memory is stale, coverage is weak, smoke checks are missing, task packets are incomplete, or high-risk trace/evidence gaps are untracked
- detect Flow-UI relation breaks, orphan UI/API/data/CODE/TEST anchors, missing port-contract fields, and unchecked draft facts being promoted to stable memory

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
- do not auto-expand `Allowed Write Set`; route wrong boundaries to `NEEDS_PLAN`, incomplete packets to `NEEDS_TASKS`, and unrecoverable missing context to `NEEDS_CONTEXT`
- do not turn ordinary local uncertainty into a user decision request before checking the bounded evidence
- do not mark a blocker or high-impact risk as PASS without owner, impact, rollback or degrade path, and close condition
- do not treat implementation self-reports as release evidence without rerunnable checks or explicit alternative evidence when checks cannot run

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

## 14. PASS / FAIL / BLOCKED Expectations

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

## 15. Why This Reference Exists

This file exists so overview documents can point to a stable explanation of the `sp` command contract without forcing readers to open every command template one by one.

When command templates evolve, this reference should be updated to match the current mechanism and output contract.
