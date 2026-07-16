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
2. `sp.prd`
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

`sp.prd` is the mandatory upstream requirement intake for every new feature,
capability direction, and important requirement change. Simple requests may use
a short PRD, but they must not skip the PRD stage. It may collect raw intent,
strategic goals, product positioning, business goals, capability maps,
candidate requirements, rejected ideas, open questions, and flow/UI/data/risk
seeds, but it does not create stable requirements. Stable requirements still
enter the workflow through `sp.specify` and `spec.md`.

Requirement growth in `sp.prd` should be top-down and product-oriented:
strategic goal, product positioning, business goals, target users, capability
map, problem domains, scenarios, scope boundaries, main flows, key branches,
acceptance seeds, risks, and then local details.
User-provided details may be kept, but they must attach to a parent strategic
goal, capability, flow, UI surface, data object, or acceptance boundary; orphan
details stay as candidates, seeds, or open items. The detail boundary is
`ready for sp.specify`, not `ready for implementation`.
`prd.md` must not replace `sp.flow`, `sp.ui`, `sp.plan`, or `sp.tasks`, and
should not default to full UI element inventories, state machines, APIs,
database schemas, code paths, test commands, or implementation tasks.
Lean PRD is allowed only when the user already provides a clear goal, users,
scope, and basic acceptance intent. It must still keep strategic goal, target
users, core scenarios, scope/non-goals, acceptance seeds, risks/open questions,
and handoff. 0-to-1 ideas, unclear scope, multi-capability requests,
governance impact, high risk, or source conflict require the full PRD shape.
Lean PRD still has a minimum substance bar: one clear strategic goal, at least
one target user or role, at least one bounded core scenario, explicit
scope/non-goals, acceptance seeds, and at least one open question or risk when
anything material remains uncertain. If those anchors are missing, use
`NEEDS_PRD` or `NEEDS_CLARIFY` instead of treating the PRD as sufficient.

`sp.prd` must end with PRD-to-spec outline readiness. If the PRD has clear
strategic goal, users, scope, capability map, and source authority, create or
refresh `specs/<feature>/spec-outline.md` with
`AWAITING_OUTLINE_CONFIRMATION`. Generate
`specs/<feature>/prd/review/outline-review-data.json`, record its Review Data
ID (computed from the complete JSON by
`.specify/review/scripts/review-data-id.mjs`), `Outline Digest`, and
`Source Authority IDs` in an `Outline Confirmation`
block, and launch the fixed renderer with
`node .specify/review/scripts/serve-review.mjs --outline <feature>`. Browser
state, localStorage, preview completion, and download alone never authorize
`sp.specify`. The downloaded package must be validated and written back as
`specs/<feature>/prd/review/outline-confirmation.md`; only a package bound to
the current review-data identity, canonical digest, and source authority, with
no needs-decision, unresolved, draft-excluded, or revision-request records, may
promote the outline to `READY_FOR_SPECIFY`. If the PRD
still has key `[src:ai-proposed]`, `[uncertain:*]`, scope conflict, missing
source authority, or unclear feature boundary, do not create a stable outline;
append an `Outline Decision` to `prd.md` and route to `sp.clarify`, another
`sp.prd` pass, source recovery, or feature split. If the feature directory is
clear, also create or refresh a blocking `spec-outline.md` with the same
`Outline Decision` so `sp.specify`, mechanical checks, and later agents read one
predictable blocker entry point. If information is insufficient but the feature
directory is clear, a blocking `spec-outline.md` is allowed, but its status must
be only `NEEDS_PRD`, `NEEDS_CLARIFY`, `NEEDS_SOURCE`, `SPLIT_REQUIRED`,
`NEEDS_DECISION`, or `BLOCKED`, never `READY_FOR_SPECIFY`.
`spec-outline.md` is a lightweight bridge into `sp.specify`; it must not become
flow, UI, API, database, plan, tasks, or implementation design. `sp.outline` or
PRD-embedded outline logic must not replace `sp.specify`; it only decides
whether `sp.specify` may start.

Before formal Outline confirmation, `sp.prd` must record the orthogonal
`outline_maturity` field in `spec-outline.md`. Its only values are `explore`,
`frame`, and `specify_ready`. `explore` is Level 1 direction discovery with
deep user participation in goals, users, and the core problem. `frame` is Level
2 convergence with deep user participation in scope, non-goals, first slice,
scenarios, and high-impact business rules. `specify_ready` is Level 3, where
confirmed product facts are structurally completed and checked against the
Constitution. `frame` requires a confirmed goal, at least one confirmed user or
role, and a clear core problem. `specify_ready` additionally requires stable,
source-backed Level 2 boundaries. Regress from `frame` to `explore` when the
confirmed goal, user/role, or core problem is withdrawn, replaced, or
contradicted. Regress from `specify_ready` to `frame` when scope, non-goals,
first slice, core scenarios, high-impact business rules, acceptance intent, or
source authority changes materially; regress further when the Level 1 minimum
is no longer confirmed. The Constitution must not invent target users, product
goals, business rules, or scope. Maturity is independent from readiness,
`review_level`, and `confirmation_priority`.

Level 1 and Level 2 use `interaction_mode: discovery`; Level 3 uses
`interaction_mode: confirmation`. Discovery writes
`specs/<feature>/prd/review/outline-discovery-data.json`, offers 2-4 candidates
with a recommendation, none of the above, and free-form input, and downloads an
`outline-discovery-response-*.json` package. The five explicit operations are
`confirm_candidate`, `add`, `replace`, `exclude`, and `context_note`.
Discovery must never advance the Outline to `AWAITING_OUTLINE_CONFIRMATION` or
`READY_FOR_SPECIFY` and never authorizes `sp.specify`.

`sp.prd` explicitly consumes a named discovery response, validates feature and
response identities, schema version, candidate and target references, allowed
operations, and duplicate delta IDs, then appends accepted events to
`specs/<feature>/prd/review/outline-intent-ledger.json`. The ledger is
append-only; replacement, correction, or reversal is a later event whose
`supersedes_delta_id` references an earlier accepted event that is already
consumed by the current formal PRD, not a ledger-only pending event; that event remains
auditable. Missing or duplicate formal PRD anchors, unsupported schema upgrades
or downgrades, forward references, and cycles fail closed.
Regenerate PRD and Outline into temporary outputs, then fail closed unless every
consumed delta appears in the intended section with a stable
`<!-- intent-delta:<id> -->` anchor and the correct provenance:
`[src:user]` for new user text, `[src:user-confirmed]` for an accepted candidate,
and `[src:ai-proposed]` for unaccepted candidates. Discovery schemas, response
packages, and ledgers must not accept or emit the formal
`outline-review-data.json` confirmation contract, and the formal confirmation
consumer must not accept discovery artifacts. Level 3 review data is compiled
one way by `sp.prd` from validated ledger state plus the current PRD/Outline; it
is not produced by a confirmation consumer reading a discovery package.
Existing replaceable PRD entries use `<!-- intent-target:<id> -->`; replacement
and exclusion blocks use `<!-- intent-ref:<delta-id>:<target-or-candidate-id> -->`.
Apply a named response with
`node .specify/review/scripts/apply-outline-discovery.mjs --response <response-package> --prd-temp specs/<feature>/prd.md.tmp --outline-temp specs/<feature>/spec-outline.md.tmp`.
The helper records valid new events before temporary-document validation. If
validation fails, the formal PRD and Outline stay unchanged and those events
remain pending; retry the same response after regenerating the temporary files.
It serializes each feature with
`specs/<feature>/prd/review/.outline-discovery-writeback.lock`. If an active
process owns the lock, wait for that writeback to finish before retrying. A
dead owner's stale lock is recovered only while the helper owns the exclusive
`.outline-discovery-writeback.recovery.lock` claim and after it rechecks the
main lock identity. Both locks carry unique ownership IDs; cleanup must not
remove a lock that has changed owners. If a dead process left both locks, fail
closed and preserve them until an operator verifies that no writeback is
running and removes only the recovery claim. If the old main lock is already
absent, remove an orphaned recovery claim only after acquiring a fresh main
lock.

Downstream stabilization requires `specs/<feature>/spec-outline.md` with `READY_FOR_SPECIFY`;
an awaiting, blocked, missing, or stale Outline never authorizes `sp.specify`.
`spec-outline.md` must include a lightweight `Source Authority Summary` listing
stable sources, candidate-only sources, archived or missing sources, source
rebase decisions, and what `sp.specify` may safely consume. Do not copy the full
PRD or build a heavy source map in the outline.
Before `sp.specify` consumes a `READY_FOR_SPECIFY` outline, it must check the
outline's `Based On`, `Source Snapshot` or `Source Authority Summary`,
`Status History`, `Outline Decision`, and `Handoff To Specify` against the
current `prd.md`, source authority, feature boundary, and human decision
records. Do not use file mtime or raw hashes as hard gates. Missing, stale, or
mismatched outline evidence routes back to `sp.prd`, `sp.clarify`, source
recovery, or feature split confirmation before `spec.md` is stabilized.
For the new confirmation contract, the gate must recompute the Review Data ID
from the current complete JSON with `.specify/review/scripts/review-data-id.mjs`.
The canonical identity recursively sorts object keys, preserves array order, and
covers every review field. Missing helpers or JSON, missing confirmation, stale
digest, review identity mismatch, source-authority mismatch, or unresolved review
records are hard failures owned by `sp.prd`. Legacy `READY_FOR_SPECIFY` outlines without an
`Outline Confirmation` block remain warning-only for one minor-release
compatibility window; the next `sp.prd` refresh must generate the graphical
confirmation contract.
Existing `spec-outline.md` status is not static. Each `sp.prd` refresh must
re-read the current PRD, source evidence, and existing outline, then recompute
readiness from current evidence. `NEEDS_PRD` may upgrade only after product
intent is sufficient; `NEEDS_CLARIFY` only after the blocking decision is
recorded; `NEEDS_SOURCE` only after source recovery or explicit user-approved
rebase; `SPLIT_REQUIRED` only after the user confirms a single feature boundary
or the split is created; `NEEDS_DECISION` only after the selected human decision
is written back; `BLOCKED` only after the handoff explains how the blocker was
resolved. `Outline Decision` owns readiness and next route;
`Handoff To Specify` summarizes downstream input for `sp.specify`. They may
reference each other, but must not contain conflicting next routes.

`spec-outline.md` should keep a lightweight `Status History` only for status
changes, blocker resolution, source rebase, feature split, or owner review.
Each entry must include `timestamp/run-id`, `status`, `blocker-signature`,
`next-route`, and `evidence-summary`. The `blocker-signature` should be a
stable short phrase such as `missing-source:legacy-prd` or
`scope-split:admin-vs-tenant`. If the same `blocker-signature`, same outline
status, and same `next-route` repeat twice without new evidence, stop
regenerating the same PRD/outline content and escalate to `BLOCKED` or
`NEEDS_DECISION` with a plain-language decision package. New evidence means
user confirmation, recovered source, explicit rebase decision, feature split
result, risk/compliance/owner decision, or document evidence that can change
readiness; rewording, template completion, and model re-summarization do not
count. Route to `sp.clarify`, source recovery, owner decision, or feature split
instead of spending more tokens on unchanged text.
Repeated-blocker decision packages must be written back to a stable location.
The default writeback target is `specs/<feature>/memory/open-items.md`; if the
blocker is already recorded in `prd.md` or `spec-outline.md`, keep the same
`blocker-signature` and next route there instead of creating a second thread.

High-risk, 0-to-1 product direction, scope split, source rebase, governance
candidate, real money/data, compliance, or irreversible-impact outlines need an
explicit `Owner Review Required` prompt in `Outline Decision` or
`Handoff To Specify` before downstream movement, even when the outline is
otherwise `READY_FOR_SPECIFY`. The fixed fields are `Risk Type`,
`Review Focus`, `Impact If Approved`, `Impact If Rejected`,
`Recommended Choice`, and `Confirm To Proceed`.

For `sp.specify`, treat work as new feature work when `spec.md` is missing,
`spec.md` still contains `SP_STAGE_SEED: spec`, the user introduces a new
capability direction, or the request changes business scope, target role,
workflow, acceptance boundary, release scope, or source authority enough to
invalidate the current spec. Minor edits inside a stable feature may reuse the
current `spec.md`; important requirement changes must route through `sp.prd`.
Minor edits are limited to local wording fixes, naming clarification, duplicate
cleanup, or recording already confirmed detail when they do not change target
users, business scope, core flow, acceptance boundary, source authority, risk
level, data, permissions, compliance, or release scope. Important requirement
changes include new capability direction, new role or permission, new business
flow or branch, changed acceptance criteria, release scope change, source
rebase, risk/compliance/real-money/real-data impact, or any change that
invalidates current `spec.md` scope.

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
- write or refresh a lightweight `Stage Readiness` block for the feature. It
  may unlock `READY_FOR_FLOW` only when stable requirement evidence is enough
  for business-flow design; otherwise use `NEEDS_CLARIFY`, `NEEDS_DECISION`,
  `BLOCKED`, or `DRAFT_ONLY` and route to the owner command.

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
- update `Stage Readiness` only after the human-selected decision is written
  back to the named source document, task, or memory file. A recommendation or
  uncommitted chat answer must keep `NEEDS_DECISION`.

### `sp.flow`

- require upstream `Stage Readiness: READY_FOR_FLOW` before generating stable
  flow artifacts. Missing readiness, `SP_STAGE_SEED`, `NEEDS_CLARIFY`,
  `NEEDS_DECISION`, `BLOCKED`, high-impact open items, generic templates, or a
  stale/spec-conflicting source must stop the run and route to `/sp.specify` or
  `/sp.clarify`.
- express the business and state transitions clearly
- connect major steps and decision points back to stable IDs
- make the flow the main relation axis for business, UI, API, data, acceptance, tests, and code
- decompose the flow top-down before diagramming: business goal, actors,
  lifecycle states, mainline stages, decision points, exception/recovery paths,
  non-UI/system/external steps, UI contracts, and verification evidence
- use bounded model inference when the source is coarse but the business domain,
  user role, business goal, and feature boundary are clear; inferred flow
  details must be marked `Source: model-inferred` or linked to `OPEN-*`, remain
  draft, and never create new business rules, permission boundaries,
  compliance/data-retention rules, irreversible actions, settlement/pricing
  rules, or acceptance downgrades
- mark inferred flow rows with `Source: model-inferred` or `[INFER:DRAFT]`.
  Inferred content cannot support `READY_FOR_UI`, stable trace, risk closure,
  gate PASS, or implementation readiness until confirmed or checked.
- give critical steps a lightweight port contract: input, precondition or permission, action, output or side effect, target state, failure path, and verification evidence
- prefer renderable text diagrams such as Mermaid, PlantUML, or Graphviz over
  bitmap images, and make rendered/exported flow visuals reviewable with visible
  labels such as `FLOW A1`, `FLOW A1-3`, `DEC D2`, `ERR E1`, or `EXT X1`
- close with a visual review prompt when text diagrams, previews, or exported
  flow images exist: tell the user which files to review, which viewer to use,
  and how to request changes by visible label before regenerating visuals
- when visual confirmation is recommended or required, show a concise Chinese
  flow review summary before asking for confirmation. The summary must explain
  the PRD/spec/clarification basis, business goal, actors, main flow stages,
  decisions, exception/recovery paths, state changes, system/external steps, UI
  contracts, draft or inferred parts, review files/previews, and visible labels
  such as `FLOW A1-3`, `DEC D2`, or `ERR E1`. Do not only say "please confirm".
- classify flow visual review into three tiers before promotion:
  **No confirmation required** for trivial label, copy, formatting, or docs-only
  refreshes with no semantic, node, branch, state, permission, exception, or
  downstream readiness impact; **Recommended confirmation** for small
  non-critical additions or readability/layout changes with clear source
  backing and no downstream readiness impact; **Required confirmation** for
  first-time stable flow generation, major branch/state/permission/exception
  changes, 3 or more new flow nodes, explicit review requests, unclear user
  approval, model-inferred flow content that would be used beyond draft, or any
  change affecting stable memory, stable trace, gate PASS evidence,
  implementation readiness, or `READY_FOR_UI`
- when confirmation is required and not satisfied, the flow remains a draft and
  must not become stable memory, stable trace, gate PASS evidence, or
  implementation readiness input. When confirmation is not required or skipped
  by explicit `--auto`, state why, what changed, which tier would otherwise
  apply, and whether the result is still draft or ready for the next step
- `--auto` may skip only the visual review gate; it must never skip subject
  scope, business domain anchor, stage entry preflight, or subject-confusion
  checks
- offer 2-3 options with impact, recommendation, and next command when multiple
  flow repairs are reasonable; do not silently choose for the user
- offer 2-3 options with impact, recommendation, and next command when coarse
  input admits multiple valid flow patterns; do not silently choose a materially
  different business process for the user
- mark new or refreshed flow outputs as draft facts until `sp.analyze`, `sp.gate`, or equivalent evidence checks them
- check direct-neighbor data-linkage when flow changes affect state, data, permission, events, persistence, side effects, acceptance, tests, rollback, release, or human decisions
- route unresolved flow/data-linkage gaps to `open-items.md` and the closest owner command instead of inventing transitions
- finish by writing flow `Stage Readiness`: `READY_FOR_UI` only when required
  flow facts, UI contracts, source provenance, visual-review status, and open
  blockers are clean; otherwise use `DRAFT_ONLY`, `NEEDS_DECISION`, or
  `BLOCKED` and do not present `/sp.ui` as the immediate next step.

### `sp.ui`

- define screen structure, user actions, and interface-level responsibilities
- run after `sp.flow` and consume its flow contract. It requires flow
  `Stage Readiness: READY_FOR_UI` before generating stable UI artifacts. If the
  required flow output is missing, generic, stale, unconfirmed, or not
  `READY_FOR_UI`, route back to `sp.flow`; if the UI depends on an unconfirmed
  flow draft, keep the UI draft or register an open item
- connect screens back to clarified business intent
- decompose UI top-down before writing screen files: user roles, task entry
  points, screen map, per-screen purpose, sections, fields, actions, states,
  validation, permissions, feedback, error/recovery behavior, and verification
  evidence
- use bounded model inference when the flow contract and business domain are
  clear but UI information is coarse; inferred UI details must be marked
  `Source: model-inferred` or linked to `OPEN-*`, remain draft, and never create
  new business events, permissions, validation rules, compliance/data-retention
  behavior, irreversible actions, settlement/pricing behavior, or acceptance
  downgrades
- mark inferred UI rows with `Source: model-inferred` or `[INFER:DRAFT]`.
  Inferred UI cannot support `READY_FOR_PLAN`, stable trace, risk closure,
  gate PASS, or implementation readiness until confirmed or checked.
- bind screens, fields, and actions to flow steps, business events, data objects, permissions, API contracts, acceptance paths, or open items
- prefer structured UI documents, JSON Forms, HTML/CSS prototypes, or Storybook
  stories over bitmap images, and make rendered/exported UI visuals reviewable
  with visible labels such as `SCREEN S1`, `SECTION S1.2`, `FIELD F3`,
  `ACTION A2`, or `STATE ST4`
- close with a visual review prompt when UI documents, wireframes, JSON Forms
  assets, prototypes, previews, or exported images exist: tell the user which
  files to review, which viewer to use, and how to request changes by visible
  label before regenerating visuals
- when visual confirmation is recommended or required, show a concise Chinese
  UI review summary before asking for confirmation. The summary must explain
  the PRD/spec basis, consumed flow steps or events, why the current layout was
  chosen, layout structure, screens/sections, buttons and effects, fields and
  validation sources, images/previews, charts/tables and data sources,
  permissions/states, draft or inferred parts, review files/previews, and
  visible labels such as `SCREEN S1`, `SECTION S1.2`, `ACTION A2`, or
  `FIELD F3`. Do not only say "please confirm the UI draft".
- classify UI visual review into three tiers before promotion:
  **No confirmation required** for trivial copy, label, formatting, or docs-only
  refreshes with no new or changed screens, actions, fields, states,
  permissions, data binding, validation, or downstream readiness impact;
  **Recommended confirmation** for small non-critical organization,
  readability, or layout changes with clear flow/source backing and no critical
  flow, data, permission, or acceptance-path impact; **Required confirmation**
  for first-time stable UI generation, major screen/action/field/permission/data
  binding changes, 3 or more new screens or critical actions, explicit review
  requests, unclear user approval, Process Visualization UI risk,
  model-inferred UI content that would be used beyond draft, or any change
  affecting stable memory, stable trace, gate PASS evidence, implementation
  readiness, or `READY_FOR_PLAN`
- when confirmation is required and not satisfied, the UI remains a draft and
  must not become stable memory, stable trace, gate PASS evidence, or
  implementation readiness input. When confirmation is not required or skipped
  by explicit `--auto`, state why, what changed, which tier would otherwise
  apply, and whether the result is still draft or ready for the next step
- if a flow or UI review summary contains a human decision point, explain the
  real business background or real screen/interaction background in plain
  Chinese. Flow `must_confirm` nodes use 2-4 options; a source-backed,
  mutually exclusive binary Flow decision must include
  `options_count_rationale` explaining why no third executable exit exists. UI
  `must_confirm` nodes require 3-4 options; only an ordinary, non-
  `must_confirm` low-risk UI judgment may use 2, and it must include
  `options_count_rationale`. In both cases, describe what the reviewer chooses the model to do
  or change next, describe each option's concrete consequence and downstream
  impact on scope, schedule, risk, UI/flow, plan, tasks, implementation,
  acceptance tests, or delivery, name the recommended option and why it is
  safest, and keep the artifact in `DRAFT_ONLY`, `NEEDS_DECISION`, or `BLOCKED`
  until the user confirms or selects a repair option.
- `--auto` may skip only the visual review gate; it must never skip subject
  scope, business domain anchor, stage entry preflight, subject-confusion
  checks, or Process Visualization UI checks
- offer 2-3 options with impact, recommendation, and next command when multiple
  UI layouts, interaction models, or information architecture repairs are
  reasonable; do not silently choose for the user
- offer 2-3 options with impact, recommendation, and next command when coarse
  input admits multiple valid UI patterns; do not silently choose a materially
  different interaction model for the user
- avoid inventing business events, state transitions, permissions, side effects, or validation rules from UI convenience alone
- mark new or refreshed UI outputs as draft facts until `sp.analyze`, `sp.gate`, or equivalent evidence checks them
- finish by writing UI `Stage Readiness`: `READY_FOR_PLAN` only when required
  screens/actions/fields have flow provenance, draft inference is not promoted,
  visual review is satisfied or safely skipped, and open blockers are clean;
  otherwise use `DRAFT_ONLY`, `NEEDS_DECISION`, or `BLOCKED` and do not present
  `/sp.gate` as the immediate next step.
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
- treat parallel `[P]` as controlled execution, not the default; only mark a task `[P]` when the allowed write set is narrow, required checks are visible, dependencies are already satisfied, and same-batch `[P]` write sets do not overlap
- refuse unsafe `[P]` before dispatch: missing or broad write set, missing checks, parser uncertainty, shared truth writes, global registry-like files, or dependency ambiguity should produce a sequential task or route to `/sp.plan` / `/sp.tasks`
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
- use multi-agent workers only when delegation is explicitly justified by independent worksets, disjoint write sets, or context pressure; routine single-file or tightly coupled changes stay single-agent sequential
- when acting as coordinator, require baseline evidence before dispatch, collect worker handoffs before merge, and downgrade to single-agent sequential recovery when a worker is stale, unverifiable, out of bounds, or conflicts with another worker
- when acting as worker, treat shared truth files and global registry-like files as read-only unless explicitly assigned; return proposed updates rather than editing coordinator-owned state

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
- record a compact `Memory Check Summary` in `analysis.md` when the lightweight memory check runs, so `sp.gate` can reuse current mechanical evidence instead of rerunning it by default
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

If there is no reliable active feature, the command should stop with a clear next step, usually `/sp.prd` for a new feature or major product change. Only route to `/sp.specify` when a PRD and outline readiness already identify the feature boundary.

For day-to-day resume, `sp.route` is the lightweight entry point. It emits `speckit.route.v1` JSON from explicit project state and only recommends the next `/sp.*` command by default. `/sp.route y` keeps the existing resume behavior: it may dispatch the next correct command only when the JSON says `continueAllowed=true` and the stop rules permit continuation. `/sp.route y` is not a global scan request.

`/sp.route all` is the explicit global scan mode for project intake direction judgment. Project intake direction judgment is the stable phrase for the cold-start reassessment that identifies `PROJECT_GOAL`, `CURRENT_STAGE`, `PRIMARY_THEME`, `PRIMARY_THEME_SUMMARY`, `ROOT_BLOCKER_FAMILY`, `FIRST_FIX`, `DEFERRED_WORK`, `READ_SET`, `PRIORITY_CLASS`, `OPTION_A`, `OPTION_B`, `OPTION_C`, `OPTION_D`, `RECOMMENDED_OPTION`, `WHY_RECOMMENDED`, `USER_DECISION_NEEDED`, `MY_RECOMMENDATION`, `NEXT_ACTION`, `NEXT_COMMAND_EXEC`, `NEXT_COMMAND_ID`, `NEXT_COMMAND`, `WHY_THIS_NEXT`, and `DO_NOT_RUN`. Do not add a second auto-continue field: machine continuation is governed by JSON `autoExecute` and `continueAllowed`.

Warm Route is the default for ordinary `/sp.route` and `/sp.route y`. If `activeFeature`, feature memory, or a current `PRIMARY_THEME` is reliable, the command should not repeat the project intake direction judgment. It should read only the active mainline's route evidence, memory index, open items, Stage Readiness, and smallest source set needed to explain the next command. The route output must choose one single mainline and one single preferred next command; alternatives belong in `OPTION_A`..`OPTION_D` and `DEFERRED_WORK`, not in `NEXT_COMMAND`.

The route closeout must not merely say that the previous step is complete or list unresolved problems. It must give 2-4 plain-language options, explain the impact of each option, mark one `RECOMMENDED_OPTION`, explain `WHY_RECOMMENDED`, and then collapse the recommendation into one concrete `NEXT_ACTION` and one `NEXT_COMMAND`. If only one action is safe, the options should still include rejected alternatives and their consequences, for example that `/sp.implement` is rejected because gate has not authorized implementation. Avoid internal phrasing such as "stage entry judgment" without translating it into what the user should do next.

The recommendation must say the next step in plain Chinese. `MY_RECOMMENDATION` should use a direct sentence such as `我的推荐：选 A：110-template-library-template-application`, followed by the reason. Keep `NEXT_COMMAND_EXEC` as the pure slash command for parsing, keep `NEXT_COMMAND_ID` only as a legacy alias with the same value, and make `NEXT_COMMAND` the one-line copy-pasteable command: the slash command followed by the Chinese instruction. The instruction must tell the next command what to focus on, which boundary or gate risk to recheck, and which global SP evidence or memory files to respect. For example: `NEXT_COMMAND_EXEC: /sp.analyze 110-template-library-template-application`, `NEXT_COMMAND_ID: /sp.analyze 110-template-library-template-application`, and `NEXT_COMMAND: /sp.analyze 110-template-library-template-application 请重点关注 template application 的 Stage Readiness、open-items.md 中未关闭事项，以及是否存在越过 analyze/gate 边界的问题。请基于 active-context、feature-map 和该 feature 的 memory/index.md 重新判断，不能把运行时或实现证据当成已授权实现。`

After the structured recommendation fields, the final copy box must appear at the very bottom of the response. It must be the last `text` fenced code block and contain only the `NEXT_COMMAND` value itself: no `NEXT_COMMAND:` label, no `OPTION_A/B/C/D`, no `MY_RECOMMENDATION`, no `NEXT_COMMAND_EXEC`, no `WHY_THIS_NEXT`, no `DO_NOT_RUN`, and no explanatory text. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.

When the route names a numbered feature, module, or mainline such as `110-template-library-template-application`, it must include a brief Chinese `PRIMARY_THEME_SUMMARY` explaining what it mainly does and why it matters to the current route. The summary must be based on `READ_SET`, feature memory, PRD, outline, or Stage Readiness evidence. If the role is not confirmed, write that it is not confirmed and recommend evidence repair or `/sp.route all` instead of inventing a description. The one-line `NEXT_COMMAND` should also ask the next command to restate that module role before doing detailed analysis, so the user can perform a quick subjective check without interrupting execution.

Route options and `WHY_RECOMMENDED` must be grounded in the route JSON plus global SP evidence listed in `READ_SET`: project memory, `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, `memory/open-items.md`, and Stage Readiness. They must not be guessed from only the current file or local context. If the evidence is missing, stale, or conflicting, the recommended option should be `/sp.route all`, `/sp.clarify`, or the smallest memory/evidence repair step, not downstream stage or production work. When `USER_DECISION_NEEDED: yes`, `NEEDS_DECISION`, or `HUMAN_DECISION` applies, `RECOMMENDED_OPTION` may only complete the decision package, run `/sp.clarify`, or gather the smallest missing evidence; it must not bypass the human decision.

Each route option must start with a machine-readable command prefix: `OPTION_A: [CMD: </sp.* or None>] <plain-language action and impact>`. `RECOMMENDED_OPTION` must point to a non-None option, `MY_RECOMMENDATION` must name the same letter, and `NEXT_COMMAND_EXEC` must match the `[CMD: ...]` command in the recommended option. `USER_DECISION_NEEDED` is a human explanation label only; it must mirror the JSON stop state and must not become a third continuation system.

`NEXT_COMMAND` is the human copy-paste line, not a shell-safe automation command. Multi-agent orchestrators such as Hermes, OpenClaw, CrewAI, and LangGraph must dispatch only from route JSON (`next`, `blockerRoute`, `continueAllowed`, `autoExecute`) or `NEXT_COMMAND_EXEC`, then pass the Chinese guidance in `NEXT_COMMAND` as worker prompt/context. For multi-agent operation, use a single coordinator to own route decisions and serialize writes to `.specify/memory/*` and `specs/<feature>/memory/*`; worker agents should treat memory as read-only unless their task packet explicitly grants a write boundary. In CrewAI, model `/sp.route` as the manager/planner task. In LangGraph, model route JSON as graph state and use conditional edges from `status`, `next`, and `blockerRoute`. In Hermes/OpenClaw, run `/sp.route` at the coordinator layer and hand one recommended command plus its Chinese prompt to one worker at a time.

The project intake direction judgment must route first and expand second. It should read project memory and route evidence before feature documents, then inspect candidate feature `memory/index.md`, `memory/open-items.md`, and Stage Readiness. The stable rule phrase is: do not deep-read every feature. That also means do not deep-read all flow/UI documents, governance diagrams, archives, or historical analyses during first contact. If there are many candidate features, report the distribution, pick or request one `PRIMARY_THEME`, and keep the remaining work in `DEFERRED_WORK`.

Priority classes are fixed: `P0` for SP installation, command template, route, or mechanism drift; `P1` for stage blockers such as missing PRD, outline, source authority, or human decision; `P2` for active mainline readiness gaps such as Stage Readiness, open-items, trace, or memory linkage; `P3` for analyze/gate boundary gaps such as analyze PASS without a gate decision or unresolved Monitoring evidence; `P4` for runtime, integration, E2E, or performance evidence after the phase is authorized; `P5` for flow/UI/governance visualization, formatting, cleanup, or refactor after the mainline is closed.

When switching mainlines, include a switch-cost explanation before changing `PRIMARY_THEME`: `CURRENT_THEME`, `REQUESTED_THEME`, `SWITCH_COST`, `RISK`, `RECOMMENDATION`, and `NEXT_COMMAND`. If the current mainline is not closed or invalid, request user confirmation or route to `/sp.clarify` before switching.

The route scripts must keep `autoExecute=false` and must not execute downstream commands. Only explicit `/sp.route y` may let the command template dispatch the next route, and only when `continueAllowed` is true. `NEEDS_DECISION`, `HUMAN_DECISION`, `UNKNOWN_BLOCKER`, `REPEATED_FALLBACK`, and `fallback-loop-detected` must stop automatic continuation and route to `/sp.clarify` or the owner decision path. `/sp.route all` never dispatches downstream commands; it reports the global scan and recommended route only. Repeated loop evidence comes from `fallback-log.md`; do not re-dispatch the same failed route.

### 9.1 Command-Wide Closeout Recommendation

`/sp.route` owns route selection, but ordinary `/sp.*` commands must still finish with a concrete next-step recommendation. Every successful, conditional, blocked, or decision-needed closeout for `/sp.prd`, `/sp.specify`, `/sp.clarify`, `/sp.flow`, `/sp.ui`, `/sp.bundle`, `/sp.plan`, `/sp.tasks`, `/sp.analyze`, `/sp.gate`, `/sp.checklist`, `/sp.taskstoissues`, `/sp.implement`, and `/sp.constitution` must include a `## Next` section with options, a recommendation, and one copy-pasteable next command.

The closeout must not merely say the command is complete, list problems, or tell the user to decide whether a stage-entry judgment is needed. It must translate the current evidence into plain Chinese options and one recommended action. Use this exact field contract:

```text
OPTION_A: [CMD: </sp.* or None>] <plain-language action and impact>
OPTION_B: [CMD: </sp.* or None>] <plain-language action and impact>
OPTION_C: [CMD: </sp.* or None>] <write [CMD: None] None when there is no third valid option>
RECOMMENDED_OPTION: A | B | C
MY_RECOMMENDATION: 我的推荐：选 <A|B|C>：<用中文说明推荐对象和理由>
NEXT_ACTION: <one concrete next action; do not write "if needed">
NEXT_COMMAND_EXEC: </sp.* or None>
NEXT_COMMAND_ID: </sp.* or None; legacy alias of NEXT_COMMAND_EXEC>
NEXT_COMMAND: </sp.* plus Chinese prompt in one line; must be copy-pasteable in one pass; write None only when NEXT_COMMAND_EXEC is None>
WHY_THIS_NEXT: <why this is the correct direction, grounded in project/feature memory, open-items, Stage Readiness, and this command's evidence>
DO_NOT_RUN: <commands that would be unsafe now, or None>
```

`NEXT_COMMAND_EXEC` is the machine entry and must contain only the executable slash command or `None`. `NEXT_COMMAND` is the human copy-paste line: the slash command followed by the Chinese instruction in the same line. Do not split the Chinese prompt into any separate prompt field. Multi-agent orchestrators such as Hermes, OpenClaw, CrewAI, and LangGraph must dispatch from route JSON or `NEXT_COMMAND_EXEC`, then pass the full `NEXT_COMMAND` as worker prompt/context.

The final copy box must be separate from the structured field block. Put options, recommendation, rationale, machine fields, and `DO_NOT_RUN` before the copy box. End the response with one final `text` fenced code block that contains only the command line from `NEXT_COMMAND`, without the `NEXT_COMMAND:` prefix. This keeps the human action one-copy, one-paste.

Ordinary command recommendations must be globally grounded. Before choosing `RECOMMENDED_OPTION`, use the smallest relevant read set from `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, `memory/open-items.md`, Stage Readiness, and the current command evidence. If those sources are missing, stale, or conflicting, recommend `/sp.route all`, `/sp.clarify`, or the smallest owner route instead of a downstream command.

When a closeout names a numbered feature, module, or mainline such as `110-template-library-template-application`, include a brief Chinese description of what it mainly does and why it matters to the recommendation. Base the description on feature memory, PRD, outline, Stage Readiness, or this command's read set. If the role is not confirmed, say it is not confirmed and recommend evidence repair or `/sp.route all` instead of inventing a description.

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
- do not present workflow `fan-out` / `fan-in` as reliable true concurrency; current workflow execution is sequential, and multi-agent parallelism is a methodology-level controlled handoff unless a future engine explicitly provides isolation, timeouts, conflict detection, result collection, and single-agent recovery

## 10.0 Stage Entry Preflight

Every downstream command must run a lightweight Stage Entry Preflight before broad reading, analysis, task generation, gate decisions, or implementation edits. This is not a workflow engine and must not rerun the whole upstream chain. It only decides whether the current command has enough current upstream evidence to continue safely.

The preflight checks:

- active feature routing is current enough to identify one target feature or workset
- required upstream artifacts exist for the command
- required artifacts are not obviously initialization scaffolds, generic templates, or draft-only outputs being used as stable facts
- open blockers, high-impact risks, stale routing, and unresolved decisions do not block this command's correctness
- user input does not introduce a requirement, scope, flow, UI, plan, task, or implementation-boundary change that belongs to an upstream owner

If the current command cannot continue safely, stop early and report:

- `Missing/Weak Artifact`
- `Blocker Type`
- `Root Layer`
- `Owner Route`
- `Why current command cannot continue`
- `Next /sp.* route`
- `Writeback Target`

Requirement-change routing is mandatory:

- product goal, user, positioning, PRD, or source-authority changes route to `/sp.prd` or `/sp.specify`
- requirement, acceptance, business-rule, or scope changes route to `/sp.specify`
- unclear intent, conflict, risk acceptance, verification downgrade, or irreversible tradeoff routes to `/sp.clarify`
- flow, state, branch, permission, exception, or non-UI process changes route to `/sp.flow`
- screen, action, field, data binding, or interaction changes route to `/sp.ui`
- workset, code landing, runtime command, dependency surface, readiness, or architecture-boundary changes route to `/sp.plan`
- task packet, split, allowed write set, required checks, or parallel boundary changes route to `/sp.tasks`
- implementation that discovers upstream gaps must stop, preserve valid local evidence, and route to the upstream owner instead of guessing

Low-risk wording changes may continue only when they do not alter stable business facts, trace, acceptance, flow, UI, planning, tasks, implementation boundaries, or gate evidence. Do not auto-create missing upstream documents from a downstream command just to satisfy preflight.

## 10.1 Blocker Triage Matrix

Before retrying, broadening scope, or recommending implementation, commands must classify each real blocker. `memory/open-items.md` is the single stable truth source for blockers, risks, decisions, and close conditions; reports, fallback logs, task notes, and model recommendations are projections or candidate sources only.

Use these blocker types:

- `INFO_GAP`: the answer exists in current documents but needs bounded reading, summarization, or writeback.
- `SOURCE_AUTHORITY_GAP`: PRD, user source, legacy authority, external authority, or source-of-truth evidence is missing, stale, or unavailable. Restore the source or route to `/sp.specify` for an explicit rebase; tests cannot replace source authority.
- `UPSTREAM_DOC_GAP`: `spec.md`, flow, UI, bundle, plan, or tasks are incomplete or contradictory. Route to the owner command instead of coding around the gap.
- `CODE_TEST_ONLY`: documentation is sufficient, but the remaining evidence can only be produced by code, tests, runtime checks, or manual verification. Create a `Mode: impl` handoff packet rather than blocking document closeout.
- `EXECUTION_INFRA`: host, wrapper, timeout, empty response, exit 143, CLI, permission, or network failure. Isolate it in fallback-log or failure-site reporting. It blocks PASS only when required evidence depends on the failed execution.
- `GENERIC_ARTIFACT`: output is template-like and lacks specific business behavior, source anchors, flow/UI/data/API relations, or acceptance evidence. Route back to PRD/spec/flow/UI/plan; it cannot support PASS.
- `SUBJECT_CONFUSION`: flow/UI output models SP commands, memory, preflight, gate, task routing, methodology stages, or process-display panels as the target business system. Stop generation, discard the affected draft, route to `/sp.flow` or `/sp.ui`, and require the next run to re-read `spec.md` and relevant source docs before regenerating.
- `BUSINESS_DECISION`: security, tenant isolation, delete/recovery, audit, compliance, risk acceptance, scope tradeoff, or verification downgrade requires a human choice. Route to `/sp.clarify` for a Decision Package.
- `ROUTING_STALE`: project memory, feature memory, current workspace, or command target disagree. Repair routing before continuing.
- `SCOPE_CONFLICT`: requirements, goals, acceptance, or feature boundaries conflict. Route to `/sp.clarify`, then `/sp.specify` or `/sp.plan` as needed.

Each blocker breakdown should include: `Blocker ID`, `Blocker Type`, `Failure Signature`, symptom/evidence, `Root Layer`, impact area, smallest solvable unit, owner route, verification path, `Writeback Target`, and human decision status when applicable.

Document-stage and code-stage boundaries are mandatory:

- Document-stage commands may update source docs, memory, trace, open-items, analysis, gate, and task packets. They must not commit unauthorized `src/`, `scripts`, config, schema, fixture, generated-code, or test-asset changes as document closeout.
- If document-stage work discovers code or test assets that must be created, record a `Mode: impl` handoff with target file, reason, related anchor, `Allowed Write Set`, `Required Checks`, verification, writeback target, and next route.
- A successful command, generated document, runner exit 0, progress percentage, or status brief is not business PASS. PASS requires current acceptance, trace, open-item, data-linkage, code/test evidence when applicable, and gate verdict.

Batch retries must be circuit-broken. When the same `Failure Signature` appears across multiple modules or the same workset repeatedly bounces between layers, group it as one root blocker family, promote it to `memory/open-items.md` when stage-blocking, and stop broad reruns until the root owner route has new evidence. `memory/fallback-log.md` is bounded loop evidence, not a blocker ledger: keep at most 10 active entries, promote repeated or stage-blocking signatures to `open-items.md`, and keep only promoted/stale references after promotion.

Historical references to old command names or archived upstream material are not automatically blockers. They block only when they affect active routing, user guidance, command invocation, generated artifacts, evidence interpretation, or current PASS/gate decisions.

## 10.2 Bounded Evidence Loop And No Self-Pass

SP commands must not use infinite loops or model-managed persistence as a success mechanism. The loop rule is bounded and evidence-based: each round handles one smallest solvable unit and must either produce new evidence, shrink the blocker, change the owner route, or stop.

Each bounded round records only lightweight state:

- workset or anchor
- smallest current issue
- new or current evidence
- `Failure Signature` or `blocker-signature`
- next owner route
- whether `/sp.clarify` or direct human decision is required

If the same `Failure Signature` or `blocker-signature` appears twice at the same layer without new evidence, a smaller unit, or a changed owner route, stop automatic progress and return `BLOCKED` or `NEEDS_DECISION`. Do not rerun the same command, regenerate the same artifact, or broaden edits to make the loop look productive.

No Self-Pass is mandatory. A model statement, generated file, runner exit 0, progress percentage, or command success does not prove completion. Completion claims need current evidence appropriate to the phase:

- code phase: test, lint, typecheck, build, runtime/manual verification, or a clear infeasible-check reason with next route
- document phase: source authority, `Stage Readiness`, trace/data linkage, open-items, visual/human review status, and analyze/gate evidence
- blocker closure: `memory/open-items.md` `Close Evidence`, such as current verification, traceable source/code change, rollback/degrade evidence, or explicit human acceptance

Closing is stricter than creating. A `Risk`, `Blocker`, High severity item, or any item affecting scope, acceptance, release, rollback, security, privacy, permission, authentication, audit, compliance, data, migration, tenant isolation, RBAC, payment, billing, production, real money, real data, implementation confidence, irreversible action, owner decision, or human decision must not be marked `Closed`, `Resolved`, `Verified`, `Accepted`, `Deferred`, `Downgraded`, or `Invalid` unless `Close Evidence` is present. Without close evidence, keep the item open/monitoring or return `FAIL`, `BLOCKED`, or `NEEDS_DECISION`.

## 10.3 Controlled Multi-Agent Execution

SP supports cautious multi-agent coordination as an optimization, not as a default execution model. The safe baseline remains single-agent sequential execution. Command templates should keep runtime-critical instructions visible, but the shared vocabulary below is the canonical contract for multi-agent eligibility, handoff, fallback, and gate review. Keep full runtime copies only where a command must decide or execute immediately: `/sp.tasks`, `/sp.implement`, `/sp.analyze`, and `/sp.gate`. Other docs and commands should cite this section instead of inventing another schema.

### Canonical hard gates

A task may be delegated to a parallel worker only when all hard gates pass:

- `Allowed Write Set` is explicit, narrow, and disjoint from every other same-batch worker
- `Required Checks` are explicit and can be rerun or replaced by a named manual verification route
- dependencies are already satisfied; no worker relies on another worker's unmerged output
- shared truth files are read-only for workers
- global registry-like files are not worker-owned by default
- the coordinator has a baseline snapshot, branch/worktree/ref, clean-state record, or equivalent evidence before dispatch

If any hard gate cannot be checked, choose sequential execution. Parser uncertainty is not a pass condition.

### Canonical worker handoff fields

Worker handoff must use these canonical field labels in order:

- `Task / Workset`
- `Status`
- `Execution Environment`
- `Allowed Write Set`
- `Actual Files Changed`
- `Anchors Affected`
- `Inputs Read`
- `Checks Run`
- `Result`
- `Evidence`
- `Proposed Shared Updates`
- `Open Items / Risks`
- `Merge Notes`

`Status` must use one of the canonical worker status values below. Coordinator closeout must compare declared and actual write sets, check forbidden writes, resolve proposed-update conflicts, run merged-state checks when outputs can interact, and only then update shared truth. In a git-tracked repo, the pre-dispatch `HEAD` or named branch/worktree ref plus the current diff can satisfy the baseline requirement; require a separate clean-state record only when VCS evidence is unavailable or ambiguous.

### Canonical worker status enum

When multi-agent execution fails based on observable evidence from worker handoffs, command output, branches/worktrees, current diffs, or coordinator records, freeze the batch instead of expanding it: stop dispatching new worker work, stop merging unverified worker output, classify all worker results, preserve evidence, and recover remaining or unclear work sequentially. Worker status values are:

- `ACCEPTABLE_LOCAL`
- `NEEDS_SINGLE_AGENT_REVIEW`
- `REJECTED_BOUNDARY_VIOLATION`
- `STALE`
- `FAILED_CHECKS`

### Canonical dependency closure

A dependent result is acceptable only when every dependency satisfies all dependency-closure requirements: merged, independently verifiable, and classified `ACCEPTABLE_LOCAL`. No failure signal is not completion evidence: the coordinator must still verify the declared handoff fields, actual diff, required checks, and dependency closure before treating a worker result as acceptable. Before ingesting acceptable results, use the baseline evidence to isolate or clean unverified and unauthorized diffs from the recovery path; if cleanup would touch user-owned changes or require destructive commands without approval, stop with `BLOCKED`/`NEEDS_DECISION` and present cleanup options. Downgrade every unclear, needs-review, out-of-bounds, stale, failed, unmerged, unverifiable, conflicting, or non-acceptable dependency to single-agent sequential recovery.

### Canonical fallback report fields

A fallback report is required before the batch can be considered closed; missing fallback output blocks `/sp.analyze` and `/sp.gate`. Use these canonical fields in order:

- `Fallback Reason`
- `affected worker classifications`
- `changed files`
- `evidence kept`
- `discarded/deferred results`
- `single-agent recovery route`
- `next /sp.* step`

Persist task-local fallback in the relevant `tasks.md` task note; persist batch-level fallback in the coordinator closeout output. If the failure caused upward fallback, repeated a previous signature, blocked stage entry, involved human/data/permission/security/release/rollback/worktree cleanup risk, or needs cross-command loop protection, also append or propose a concise entry in `specs/<feature>/memory/fallback-log.md`. `fallback-log.md` is loop evidence only; unresolved blocker truth still belongs in `memory/open-items.md`.

### Canonical shared truth files

Shared truth files are read-only for workers unless explicitly assigned to the coordinator or serialized closeout owner:

- `tasks.md`
- feature memory
- trace/open-items
- workset routing
- analysis
- gate
- broad status summaries

### Canonical global registry-like files

Global registry-like files are serialized by default and should not be worker-owned unless the plan proves isolated impact and one owner handles merge verification:

- package manifests
- lockfiles
- route registries
- shared constants
- database schemas
- permission matrices
- global config
- cross-module contracts
- migrations
- event bus registries
- core type definitions

## 10.4 Stage Evidence And Mechanical Guardrails

Trace `Expand Docs` checks must locate the column by header, not by a fixed column index. If the trace table later adds owner, status, workset, or route columns before `Expand Docs`, mechanical checks must still validate the real `Expand Docs` cells and report missing local files as `TRACE_EXPAND_DOC_MISSING`.

Flow/UI artifacts must model the target business system, not SP's own control plane. `sp.flow` should describe business roles, process nodes, data states, branches, and exceptions. `sp.ui` should describe business screens, fields, actions, feedback, and states. Do not present `/sp.*` commands, `trace-index.md`, `open-items.md`, gates, memory operations, `Allowed Write Set`, or `Required Checks` as the product flow/UI unless the target product is explicitly SP/SpecCompass/Spec Kit, an AI agent, developer tool, CLI, workflow tool, specification tool, or process tool. Even in that meta-product exception, the artifact must include visible source, business-domain, role, acceptance, coordinate, or trace anchors that prove the control-plane terms are part of the target product rather than a subject-confusion artifact.

Mechanical subject-confusion checks should stay narrow. They should hard-fail only obvious SP control-plane markers such as `/sp.*`, `sp.*`, `memory/index.md`, `trace-index.md`, `open-items.md`, and `SUBJECT_CONFUSION` in flow/UI artifacts. The hard-fail has a narrow meta-product exception only when `spec.md` explicitly defines the target product as an SP/AI/developer/workflow/specification/process tool and the artifact also carries business-domain, role, source, acceptance, coordinate, or trace anchors. Terms such as `preflight`, `Allowed Write Set`, `Required Checks`, and `NEEDS_DECISION` can be legitimate product vocabulary in workflow, compliance, operations, or developer-tool products; treat them as contextual `/sp.analyze` or `/sp.gate` findings, not automatic mechanical errors.

`Stage Readiness` should include lightweight `Based On` plus `Source Snapshot` or `Evidence Signature`. These fields identify the source docs, key anchors, open-item state, visual/human review, and analyze/gate evidence that the readiness relies on. Minimum `Evidence Signature` fields are: `Sources` (source files/docs), `Anchors` (key coordinates, trace, or business anchors), `Open Items` (open-items/blocker/risk state), `Visual/Human Review` (review status or explicit not-applicable reason), and `Checks` (current analyze/gate/test/script/validation evidence). Prefer the same field names and one bullet or YAML-like field per item so scripts and downstream commands can compare the signature without rereading every source document. Stage-specific fields may be added under a local section such as `Stage Specific`, but the five base fields should stay stable. Missing snapshot/signature means the readiness is not a stable downstream entry proof; route back to the owner command to refresh it before generating stable downstream artifacts. If the current evidence is visible and the gap is only formatting, the owner command may refresh the signature and continue. Do not use file mtime or raw file hash as a hard gate because Git operations, copying, formatting, and regeneration can create false stale signals. `check-sp-memory` reports a `READY_FOR_SPECIFY` outline without `Based On` plus `Source Snapshot`, `Source Authority Summary`, or `Evidence Signature` as `WARN`, not as semantic failure. `/sp.analyze` should warn on missing, stale, or mismatched signatures and provide the owner route. `/sp.gate` should block only when the mismatch affects stage entry, PASS evidence, risk closure, trace closure, or implementation readiness.

Human confirmation markers must not be model self-certification. A model may write `PENDING_USER_CONFIRMATION`, `NEEDS_USER_CONFIRMATION`, or `NEEDS_DECISION`, but `[src:user-confirmed]`, `USER_CONFIRMED`, `VERIFIED_BY_HUMAN`, or equivalent confirmed status requires a traceable decision record such as `Decision Record`, `Decision ID`, `clarifications.md`, `clarify-log.md`, or an equivalent captured user choice. The lightweight script only checks nearby evidence, so `HUMAN_CONFIRMATION_EVIDENCE_MISSING` is a candidate `WARN` that can false-positive when the valid decision record is cross-file. `/sp.analyze` and `/sp.gate` must inspect referenced decision records before deciding whether the item is blocking. Without a valid record, route to `/sp.clarify` or keep the item open.

When the lightweight checker emits JSON, `needsHumanReview=true` means at least one candidate human-review warning was found, such as a missing owner review block or an unbacked human-confirmation marker. This is machine-consumable routing evidence, not a new hard gate. Headless runners and downstream commands must either cite an existing decision record or route to `/sp.clarify`, `NEEDS_DECISION`, or `BLOCKED`; they must not silently treat human-review warnings as ordinary low-risk warnings.

Mechanical checks are guardrails, not semantic proof. The lightweight memory check can warn on missing signature fields, broken trace/open-items links, unsupported human-confirmation markers, subject confusion, and obvious self-pass patterns. It cannot prove that the business behavior is correct; `/sp.analyze` and `/sp.gate` still need to inspect source docs, trace, open-items, code/test evidence, and human decisions before claiming PASS. To avoid duplicate work, `/sp.analyze` should record the current memory-check summary in `analysis.md`, and `/sp.gate` should reuse it when the feature, evidence signature/source snapshot, open-items state, and gate mode still match. The summary should include `run_id` or timestamp, feature/workset, gate modes covered, source snapshot or evidence signature label, open-items state, result status, `needsHumanReview`, ERROR/WARN counts, and decisive finding IDs. If the summary is missing or stale, route to `/sp.analyze` unless one small direct check can decide `FAIL`, `BLOCKED`, or `NEEDS_DECISION`.

`/sp.gate` small direct checks are intentionally narrow. Gate may decide without rerunning `/sp.analyze` only for routing correctness, open blocker/risk existence, required `Stage Readiness` state, required `Evidence Signature`/source snapshot presence, existing decision-record presence, and direct evidence explicitly named by the current gate mode. Broad Flow-UI relation audits, orphan-anchor discovery, port-contract reconstruction, source-authority rebuilds, implementation-readiness reconstruction, or semantic business review belong to `/sp.analyze` or the owner command.

Draft-safety checks are not downstream PASS. A bounded check that a draft flow/UI/plan has source backing, did not rewrite stable memory, did not close risks, and remains routed through trace/open-items can support continued drafting, but it cannot become `Stage Readiness`, gate PASS, risk closure, trace closure, or implementation-readiness evidence.

High-risk `READY_FOR_SPECIFY` outlines should include an `Owner Review Required` block when they involve source rebase, governance, compliance, real money/data, irreversible action, risk acceptance, scope split, or other owner decisions. Mechanical checks may report missing owner review as `WARN` or candidate evidence only. `/sp.analyze` and `/sp.gate` decide whether it is actually blocking by reading the outline, PRD/source authority, current risks, and decision records.

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

Low or Medium `Question` and `Todo` items may stay lightweight when they are local and do not affect scope, acceptance, release, rollback, security, or implementation confidence. `Risk`, `Blocker`, High severity items, and any broader-impact item must use the full `open-items.md` record with owner, impact, rollback or degradation path, close condition, refresh date, trace/source link, and close evidence when no longer open.

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
