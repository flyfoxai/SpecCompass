# `sp` Context Memory Architecture

## 1. Purpose

The `sp` workflow adds a memory layer so the model does not need to re-read or re-derive the whole feature on every step.

This memory layer is meant to reduce token waste, reduce drift, and make bounded local work possible.

## 2. Core Principle

Memory is a routing and compression layer.

It is not the final source of truth.

Source-of-truth documents still include the active feature documents such as:

- `spec.md`
- `clarifications.md`
- `flows/*`
- `ui/*`
- `gate.md`
- `bundle.md`
- `plan.md`
- `delivery/*`
- `tasks.md`
- `analysis.md`

Memory exists to answer one question quickly:

"What is the smallest correct set of files I should read next?"

## 3. Two Memory Layers

### 3.1 Project-Level Memory

Project-level memory lives under `.specify/memory/`.

Its job is to answer:

- which feature is active
- which domain or hotspot matters
- what the current smallest read set should be
- where the first routing jump should go

The current baseline uses:

- `constitution.md`
- `project-index.md`
- `feature-map.md`
- `domain-map.md`
- `active-context.md`
- `hotspots.md`

### 3.2 Feature-Level Memory

Feature-level memory lives under `specs/<feature>/memory/`.

Its job is to answer:

- which local area is relevant
- which workset should own the next action
- which facts are already stable
- which open items or stale areas still block reuse

The current intended structure includes:

- `index.md`
- `stable-context.md`
- `open-items.md`
- `trace-index.md`
- `worksets/index.md`
- `worksets/ws-*.md`

## 4. Query-First Routing

The memory system is designed around query-first routing.

That means a command should try to route first and expand second.

Default sequence:

1. read `.specify/memory/project-index.md`
2. read `.specify/memory/active-context.md`
3. choose the active feature
4. read `specs/<feature>/memory/index.md`
5. read only the needed local memory files
6. expand into source documents only for the active target area

This avoids whole-project re-scans when the task only touches one feature or one workset.

The same rule applies to project intake direction judgment. `/sp.route all` is
the explicit global scan entry. Ordinary `/sp.route` and `/sp.route y` use Warm
Route when a reliable `PRIMARY_THEME`, active feature, or feature memory already
exists. Warm Route should not repeat global intake; it reads only the active
mainline's route evidence, feature memory, open items, Stage Readiness, and the
smallest source set needed for the next command.

When `/sp.route all` is used, or when no reliable mainline exists, the agent
must choose one single mainline before spending tokens on deep feature work. The
intake output should include `PROJECT_GOAL`, `CURRENT_STAGE`, `PRIMARY_THEME`,
`ROOT_BLOCKER_FAMILY`, `FIRST_FIX`, `DEFERRED_WORK`, `READ_SET`,
`PRIORITY_CLASS`, `NEXT_COMMAND`, and `DO_NOT_RUN`.

The intake read order is:

1. project entry and routing evidence: `README`, `.specify/memory/project-index.md`, `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, and `/sp.route` output when available
2. candidate feature memory: `specs/<feature>/memory/index.md`, `memory/open-items.md`, and Stage Readiness
3. source documents only for the selected `PRIMARY_THEME`

The stable rule phrase is: do not deep-read every feature. This also means do
not deep-read all flow/UI files, governance diagrams, archives, or historical
analyses during intake. If many features exist, report
the candidate distribution, choose or request one `PRIMARY_THEME`, and place the
rest in `DEFERRED_WORK`. Broad scans are allowed only after a concrete owner
route explains why the smaller `READ_SET` is insufficient.

For code-continuation work, the same rule applies before source reading:

1. feature memory and workset memory
2. `trace-index.md` and `open-items.md`
3. the task packet `Read Set`
4. directly named source and test files
5. direct dependencies, failing checks, or reverse-trace evidence only when needed

This is a routing rule, not a permission to skip verification. If the task
changes public behavior, contracts, data, permissions, events, routes,
acceptance, or critical tests, the direct affected checks still need current
evidence.

## 5. Stable Context vs Open Items

The memory layer separates stable facts from unstable questions on purpose.

### `stable-context.md`

Should contain facts that later steps should normally reuse instead of re-deriving:

- stable scope boundaries
- key actors and owners
- confirmed stage ordering
- durable object relationships
- settled high-level business rules

### `open-items.md`

Should contain what is still unresolved or risky:

- open clarifications
- blocked areas
- stale propagation
- conflict flags
- recommended fallback or revisit step

If a fact is still disputed, it belongs in `open-items.md`, not in the stable layer.

`open-items.md` is also the home for non-trivial todos, risks, blockers, rollback advice, and close conditions. Inline status tags such as `@t0` or `@r0` are only search signals. If a status needs an owner, impact, rollback path, or close condition, the full record belongs in `open-items.md`.

Not every item needs the same weight. Low or Medium `Question` and `Todo` items may stay lightweight when they are local and do not affect scope, acceptance, release, rollback, security, or implementation confidence. `Risk`, `Blocker`, High severity items, and any item with broader impact need the full record: owner, impact area, rollback or degradation path, close condition, last refresh, and a trace/source link.

Lightweight items still need enough location, status, and next-action detail for a later command to find and close them. Full field validation is required for `Risk`, `Blocker`, High severity items, and broader-impact items; local low-risk Question/Todo records can stay compact.

`open-items.md` is the current-state source of truth for unresolved blockers, risks, decisions, and close conditions. Analysis reports, gate reports, fallback logs, task notes, worklogs, and model recommendations may discover or project blocker state, but they do not become a second ledger.

When a command finds blocker signals scattered in `analysis.md`, `plan.md`, checklists, worklogs, runner output, or archived notes, it should do one of three things:

- promote the signal into `open-items.md` when it is still real and stage-blocking
- cite an existing open item when the same `Failure Signature` is already tracked
- mark the signal stale or invalid with evidence when it no longer applies

Use a stable blocker type when promoting or refreshing an entry: `INFO_GAP`, `SOURCE_AUTHORITY_GAP`, `UPSTREAM_DOC_GAP`, `CODE_TEST_ONLY`, `EXECUTION_INFRA`, `GENERIC_ARTIFACT`, `BUSINESS_DECISION`, `ROUTING_STALE`, or `SCOPE_CONFLICT`.

Execution-infrastructure failures should normally stay in `fallback-log.md` or a failure-site report until they affect a required gate evidence path. If a required check cannot run because of wrapper, host, timeout, empty-response, exit-143, CLI, permission, or network failure, the gate cannot use the missing check as PASS evidence; promote or link the execution issue only when it blocks stage entry. `fallback-log.md` is bounded loop evidence: keep at most 10 active entries, promote repeated or stage-blocking signatures to `open-items.md`, and leave only a promoted/stale reference after promotion so it cannot become a second truth source.

## 6. Trace Index and Worksets

### `trace-index.md`

This file exists so the model can jump across documents through stable IDs instead of re-inventing the chain each time.

Typical chains include:

- `FLOW-*`
- `SCREEN-*`
- `UC-*`
- `API-*`
- `TABLE-*`
- `ACC-*`

The file should support both forward tracing and reverse lookup.

The trace index should stay a lookup table, not a risk ledger. It may include stable coordinates such as `FEAT01.WS02.API02`, source anchors, worksets, and expand docs. Risk state and todo details should point back through `open-items.md`.

`Expand Docs` entries are live navigation targets, not decorative summaries. Local file paths in stable trace rows should exist inside the feature directory. If a path is missing, treat it as `TRACE_EXPAND_DOC_MISSING`: restore the source, correct the trace, demote the row back to draft/open item status, or hand it off to the next implementation package.

For business features, flow should normally be the main relation axis. UI, API, TABLE, CODE, TEST, EVENT, PERM, and ACC entries should trace to a `FLOW` coordinate, a source document, or an explicit `open-items.md` entry. This does not mean every UI field becomes a flow node. It means important interface, data, and code objects should remain explainable from the business process they serve.

Recommended relation fields are lightweight and searchable:

- `Type`: FLOW, UI, API, TABLE, CODE, TEST, EVENT, PERM, ACC
- `Coordinate`: stable ID such as `FEAT01.WS02.UI03`
- `Qualified Name`: optional semantic alias such as `attendance.leave::UI.APPROVE`
- `Relation`: `uses`, `calls`, `persists_to`, `verifies`, `guards`, `blocks`, `depends_on`, or another simple verb
- `Expand Docs`: direct documents or source files to read next

Critical flow steps should expose a lightweight port contract in the source flow document or trace notes: input, precondition or permission, business action, output or side effect, target state, failure path, and verification evidence. If any part is unknown and important, put it in `open-items.md`.

New or refreshed outputs from `sp.flow`, `sp.ui`, and `sp.plan` are draft facts until checked by `sp.analyze`, `sp.gate`, or equivalent current evidence. Draft facts may route the next read set, but they must not close risks, rewrite stable context, or support PASS.

Flow and UI outputs must describe the target business system, not SP's control plane. Lightweight checks should flag obvious control-plane leakage in `flows/*` and `ui/*`, including `/sp.*`, `memory/index.md`, `trace-index.md`, `open-items.md`, or `SUBJECT_CONFUSION`, as `SUBJECT_CONFUSION_CONTROL_PLANE_TERM`. Terms such as `preflight`, `Allowed Write Set`, `Required Checks`, and `NEEDS_DECISION` can be legitimate product vocabulary in workflow, compliance, operations, or developer-tool products and should be resolved by `/sp.analyze` or `/sp.gate`, not treated as automatic mechanical hard errors.

Before `tasks.md` exists, equivalent current evidence means a bounded draft-safety check: source backing is visible, stable memory was not overwritten, risks were not closed, PASS was not claimed from the draft, and trace/open-item routing exists or the output remains explicitly draft.

Recommended coordinate rules:

- Use stable searchable coordinates for important objects, for example `FEAT01.WS02.UI03`, `FEAT01.WS02.API02`, or `FEAT01.WS03.ACC01`.
- Keep the main coordinate stable after it is assigned.
- Keep public coordinates shallow. Prefer `FEAT01.WS02.UI03` plus local labels such as `Action: submit` over deep public IDs such as `UI03.BTN05` unless the detail recurs across documents and needs promotion.
- Use short status tags only when they help search or stage checks, for example `@t0` for missing validation evidence and `@r0` for open risk.
- Do not add status tags by default. One object should normally have no more than two status tags.
- A non-trivial `@r0` should resolve to a `RISK-*` row in `open-items.md`; a non-trivial `@t0` should resolve to an `OPEN-*` or `RISK-*` row.

### `worksets/*`

Worksets are the local working surfaces for a larger feature.

They matter when:

- the feature is too broad for one prompt window
- different sub-areas need different local read sets
- the model must stay inside one bounded slice

Each workset should make four things obvious:

- what is in scope
- what is out of scope
- what the minimum read set is
- what counts as done for that slice

## 7. Code Delta And Review Memory

The memory layer should help reviewers avoid full re-reading after code work.

For implementation tasks that modify existing code, task packets should expose
the minimum continuation fields:

- `Read Set`
- `Dependencies Checked`
- `Reverse Trace Checked`
- `Expected Delta`
- `Delta Summary`
- `Proposed Updates`

`Delta Summary` is not stable memory by itself. It is an execution closeout note
that helps `/sp.analyze`, `/sp.gate`, a human reviewer, or a coordinator start
from the actual change. Stable facts from the delta should be written back only
when source docs, trace, open-items, task state, or feature memory truly changed.

Recommended review order after implementation is:

1. `Delta Summary`
2. current diff
3. selected task packet
4. direct trace/open-items
5. necessary source code and tests

This keeps review bounded while still checking the actual evidence. If the delta
summary does not match the diff or required checks, trust the current files and
verification output, not the summary.

## 8. Freshness and Stale Detection

The memory system only saves tokens if it stays fresh enough to trust for routing.

Memory should be treated as stale when:

- source documents changed but memory was not synced
- project-level routing points to the wrong feature
- project-level memory says no active feature while feature-level memory, specs, branch, or user target clearly indicates active work
- trace links no longer match the current feature docs
- a clarification changed but the downstream sync never finished
- repeated blocker signals exist outside `open-items.md` without promotion, closure, or stale marking

When stale memory is found, the command should:

1. mark the stale area explicitly
2. expand only the smallest relevant source set
3. refresh the affected memory files before finishing
4. if the stale route changes the active feature or owner command, stop broad execution and route to the owner command before continuing

If the command cannot repair the stale route locally, it should fall back upward by one layer instead of guessing. Typical fallback is: workset route -> feature plan -> first-layer docs -> project constitution or user decision.

Ask the user only when the missing decision is genuinely macro-level: business scope, priority, success criteria, destructive change, compliance, data risk, or long-term tradeoff. Ordinary uncertainty should first be resolved by reading the bounded source set.

Batch retry protection also belongs to memory. `fallback-log.md` records repeated failure signatures, attempted routes, and next suggested routes; `open-items.md` records the promoted current blocker. When the same signature appears across many modules, commands should group it into one root blocker family instead of creating repetitive per-module tasks or rerunning the same batch without new evidence. A current `analysis.md` should include a compact memory-check summary so `sp.gate` can consume the evidence instead of rerunning the same mechanical check by default.

## 9. Clarification Propagation

`sp.clarify` is not just a Q and A record.

It is also the trigger for downstream sync.

Once a clarification becomes stable, the correct order is:

1. update the source-of-truth document first
2. update the required synced documents
3. refresh the impacted memory files
4. close the clarification only after propagation is done

If propagation is incomplete, the affected memory must be treated as stale.

## 10. No-Reinfer Rule

The memory architecture exists to stop repeated inference on already-settled topics.

If a stable conclusion is already fresh and queryable in memory, later steps should normally reuse it rather than rebuild it from scratch.

Re-inference is justified only when:

- the memory entry is missing
- the memory entry is stale
- the target cannot be mapped cleanly
- the source-of-truth document changed

If a command does re-derive something, it should write the refreshed conclusion back into memory before finishing.

## 11. Template Seed vs Runtime Expansion

The template project seeds the memory system, but it does not fully populate every feature-level file up front.

In practice:

- project-level memory files are present in the template root
- feature-level memory is initialized and expanded by the `sp` commands
- later commands enrich `trace-index.md`, `worksets/*`, and related routing material as the feature matures

This is expected. A partially seeded tree is not a bug by itself.

The real quality bar is whether the commands keep the memory layer synchronized as work progresses.

## 12. Minimum Read-Set Goal

The whole architecture is aimed at shrinking default context.

A healthy run should usually be able to answer:

- which feature is active
- which workset is relevant
- which 3 to 7 files should be read first

If the system keeps forcing full rescans, then the memory layer exists on paper but is not doing its job.

## 13. Complex Part Promotion

A large feature should not be forced through one oversized context window.

When one part has independent release risk, external systems, a separate permission or data model, irreversible migration, or multiple open blockers that affect release, rollback, safety, or compliance, `sp.plan` should consider promoting it to a workset group, sub-feature, or sub-project.

Soft warning signs include many roles, many user paths, too many concern types in one workset, a trace map that no longer fits a focused read set, or a workset that needs too many files before safe execution.

Promotion is not automatic. If the scope is clear and the difficulty is mainly implementation detail, prefer smaller tasks and stronger tests before creating a separate sub-feature.

## 14. Why This Reference Exists

This file gives the project template a stable explanation of the memory model that the overview docs can point to.

When routing rules, freshness checks, or workset expectations change, this reference should be updated along with the command templates and seeded memory files.
