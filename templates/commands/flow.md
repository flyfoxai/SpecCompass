---
description: Define or refresh the business flow documents for the active feature.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-spec
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# /sp.flow

Use this command when the user wants to define or refresh the business flow documents for the active feature.

## Subject Scope

The output of this command always describes the **target business application**
being specified and built in this project. "The active feature" means a feature
of that application, not a feature of SP, SpecCompass, Spec Kit, or this
methodology.

This command must never produce flow diagrams or written flow descriptions for
SP's own command processing, routing logic, memory operations, preflight checks,
gate decisions, or methodology stages. SP commands, SP memory paths, and SP
execution rules are operational context for running this command; they are not
business flow content.

If any flow node, decision, event, state, actor, or diagram label describes a
`/sp.*` command, an SP memory file, a preflight step, a workset-management step,
or SP's own internal processing, stop immediately. Treat it as a
subject-confusion error, discard the affected output, and return a
`SUBJECT_CONFUSION` blocker with the required `spec.md` read target and next
`/sp.flow` route. Do not regenerate in the same run.

For `ui` type flow steps, the UI contract describes what target end users need
to input, trigger, see, confirm, or recover from in order to complete a target
business step. It is not a workflow monitoring panel, method walkthrough,
process visualization, SP command dashboard, or flow diagram rendered as UI.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- The subject of all output artifacts is the target business application. SP commands, SP memory paths, and SP processing rules are operational context only; they must not become flow content.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Keep trace coordinates stable and searchable. Put unresolved flow risks or blockers in `memory/open-items.md`.
- Treat newly generated or refreshed flow outputs as draft facts until checked by `/sp.analyze`, `/sp.gate`, or equivalent evidence. Draft flow facts may guide discussion, but they must not close risks, support PASS, or replace stable source facts.
- Manage context as an engineering budget: start from routing, spec, clarifications, and open items; expand only to the flow source documents needed for the current branch or state decision.
- Treat data-linkage as a direct-neighbor constraint. When a flow step changes state, data, permission, event, persistence, side effect, or acceptance meaning, check the directly related UI contract, API/data contract, permission rule, test or verification path, trace entry, and open item before treating the flow as stable.
- Keep diagrams reviewable before asking for approval. A single reviewable flow diagram should normally contain no more than 12 business nodes. At 10-12 nodes, prefer a summary diagram plus subflows. Above 12 business nodes, split into subflows before asking for approval. The overview diagram should show only major stages, cross-subflow handoffs, and unresolved blockers; each child subflow should have one responsibility and its own visible review labels.
- Use a top-down main-trunk layout for Mermaid or other renderable flow
  diagrams: keep the source-backed happy path vertical and centered, expand
  exception, rollback, blocked, and recovery paths sideways, avoid crossing
  connectors, and do not add decorative symmetry nodes. Separate stable node
  IDs from visible business labels; visible labels should be concise target
  domain labels that humans can cite in feedback.
- Classify visual review into three tiers before promoting flow artifacts:
  - **No confirmation required**: trivial label, copy, formatting, or docs-only refresh; no new or changed flow semantics; no new nodes, branches, states, permissions, exceptions, or downstream readiness impact; and no visual artifact requires a direction choice. Record why confirmation was not required.
  - **Recommended confirmation**: small non-critical additions or readability/layout changes, including 1-2 non-critical nodes, branches, or labels, where source backing is clear and downstream readiness is not affected. The run may continue as a draft or with a warning, but must state what the user should review by visible label.
  - **Required confirmation**: first-time stable flow generation, major branch/state/permission/exception changes, 3 or more new flow nodes, explicit review requests, unclear user approval of the direction, model-inferred flow content that would be used beyond draft, or any change affecting stable memory, stable trace, gate PASS evidence, implementation readiness, or `READY_FOR_UI`. In those cases, end with a draft result and ask the user to confirm or request changes by visible label before promotion.
- When confirmation is recommended or required, show a concise Chinese flow
  review summary before asking the user to confirm. Do not only write "please
  confirm". The summary must let the user understand what they are confirming
  without opening every source file: business goal, source basis from PRD/spec
  or clarifications, actors, main flow stages, decisions, exception/recovery
  paths, state changes, UI contracts, system/external steps, draft or inferred
  parts, files to review, and visible labels to reference in feedback.
- If the flow draft contains a human decision point, explain the background in
  plain Chinese, give 2-3 options, describe each option's impact, give a
  recommendation, and state the reason. Keep the flow in `DRAFT_ONLY`,
  `NEEDS_DECISION`, or `BLOCKED` until the user confirms or chooses a repair
  option.
- Default human confirmation strategy is `confirm_strategy: batch`. For a
  multi-module, multi-workset, or dependency-domain flow generation, generate or
  refresh all in-scope flow drafts first, add them to the batch review manifest,
  and set flow readiness to `WAITING_FOR_BATCH_REVIEW` until the user completes
  the batch confirmation. Do not interrupt the user for per-module confirmation
  unless the user selected `confirm_strategy: rolling`, the current run is a
  small hotfix, a core dependency must be locked before the rest, the batch is
  too large for one review, or reviewer availability requires a split. In those
  cases, record the downgrade reason and use `hybrid` or `rolling`.
- Batch confirmation must preserve human context: one flow batch should include
  `Batch ID`, `Batch Scope`, `Included Items`, `Excluded Items`, `Source
  Snapshot` or `Evidence Signature`, `Review Owner`, `Batch Review Status`,
  `Scoped Approval Policy`, and `Fallback Strategy`. Scoped approval does not
  unlock `READY_FOR_UI` unless failed/deferred items are explicitly split into
  a child batch and dependency impact is recorded.
- Scoped approval does not authorize the full batch. A `SCOPED_CONFIRMATION` result must
  name confirmed items, deferred or rejected items, child batch IDs, dependency
  impact, and the next owner route. Downstream stages may consume only the
  confirmed scope when unresolved items are isolated and do not affect the
  requested downstream work.
- Batch-related notifications must use a stable field shape when they are shown
  in command output or review pages: `NOTIFY_TYPE`, `MESSAGE`, `WHY_NOW`,
  `IMPACT`, `REQUIRED_ACTION`, `BLOCKS_STAGE`, `NEXT_COMMAND`, `DO_NOT_RUN`,
  and `WRITE_BACK`. Use `INFO` when first explaining the batch-first strategy,
  `AUTH` when a batch is ready for confirmation, `STALE` when source changes
  invalidate a prior confirmation, and `BLOCK` when a downstream command would
  bypass required confirmation.
- For explicit `--auto` runs, only the visual review gate may be skipped. State why it was skipped, what changed, which tier would otherwise apply, and whether the result is still draft or ready for the next step.
- `--auto` may skip only the visual review gate; it must never skip Subject Scope, business domain anchor, Stage Entry Preflight, subject-confusion checks, batch confirmation, confirmation-document writeback, stale checks, owner approval, or authorization scope checks. If the current scope requires batch confirmation, `--auto` must still write `WAITING_FOR_BATCH_REVIEW` and request human authorization.

## Confirmation Document Schema

`specs/<feature>/flows/review/flow-confirmation.md` is the SP workflow authorization record for a confirmed flow batch. It must be Markdown with machine-readable frontmatter:

```yaml
document_type: sp_human_confirmation
command: /sp.flow
feature: <feature>
schema_version: 1
review_artifact: specs/<feature>/flows/review/flow-review.html
review_artifact_mode: single-file-static | local-writer | server-preview | markdown-only
confirm_strategy: batch | hybrid | rolling
batch_id: <Batch ID from the review manifest>
batch_scope: <confirmed flow scope>
batch_review_status: CONFIRMED | SCOPED_CONFIRMATION | REJECTED | STALE | REVOKED
source_artifacts_snapshot:
  - path: specs/<feature>/spec.md
    digest: sha256:<...> | not-computed
    semantic_scope: [requirements, acceptance, flow]
    anchors: [<stable-heading-or-id>]
source_hash_verified: MATCH | STALE | NOT_CHECKED
confirmed_by:
  name: <human name or role>
  email: <optional>
  role: owner | reviewer | stakeholder
  confirmed_at: <ISO-8601 or run label>
owner_approval:
  required: true | false
  status: APPROVED | PENDING | NOT_REQUIRED
human_confirmation: CONFIRMED | NEEDS_REVISION | REJECTED | SCOPED_CONFIRMATION | STALE | REVOKED
authorization_scope: READY_FOR_UI | BLOCKED | <narrow confirmed scope>
confirmed_items: [<FLOW labels or IDs>]
deferred_items: [<FLOW labels or IDs>]
rejected_items: [<FLOW labels or IDs>]
child_batches:
  - batch_id: <child-batch-id>
    status: pending | confirmed | rejected | stale
    dependency_impact: <what remains blocked>
items_with_deviation:
  - id: <item-id>
    severity: deviation-minor | deviation-moderate | deviation-critical
    note: <deviation or inference note>
reservations: [<explicit reservations>]
revocation:
  status: active | revoked | superseded
  revoked_by: <name-or-None>
  revoked_at: <ISO-8601-or-None>
```

Do not promote flow `Stage Readiness` to `READY_FOR_UI` until this document
exists, has `human_confirmation: CONFIRMED`, has owner approval when required,
covers the requested authorization scope, and is not stale. Review manifests,
HTML local state, screenshots, or browser localStorage are review aids; they are
not authorization evidence until written to `flow-confirmation.md`.

## Purpose

- Lock stage order, branching, exception handling, and state progression.

## Read First

- Read `specs/<feature>/memory/index.md`.
- Read `specs/<feature>/memory/open-items.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, and rule lists that affect the target flow.

> Operational checks only: this section verifies SP inputs and routing needed to
> run the command. It does not describe the subject matter that the output should
> model.

## Stage Entry Preflight

- Confirm routing identifies one active feature and `spec.md` is current enough to define flow facts.
- Confirm upstream `Stage Readiness` is present in `spec.md` or `specs/<feature>/memory/index.md`, has `Status: READY_FOR_FLOW`, and includes a usable `Based On` plus `Source Snapshot` or `Evidence Signature`.
- Confirm the upstream `Source Snapshot` or `Evidence Signature` includes at least `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Missing fields are warnings for `/sp.analyze`, but they block stable flow generation when they prevent proving stage entry, risk closure, trace closure, or downstream readiness.
- If `Source Snapshot` or `Evidence Signature` is absent, treat the upstream readiness as not stable enough for stable flow generation. Route back to `/sp.specify` or the command that owns the readiness to refresh it; if all source evidence is visible and only the signature formatting is missing, refresh the readiness in that owner stage before continuing.
- If upstream readiness is missing, `SP_STAGE_SEED`, `NEEDS_CLARIFY`, `NEEDS_DECISION`, `BLOCKED`, `DRAFT_ONLY`, stale, contradicted by high-impact `memory/open-items.md`, or based only on `Source: model-inferred` / `[INFER:DRAFT]`, stop before generating flow artifacts and route to `/sp.specify` or `/sp.clarify`.
- Confirm the business domain before generating flow nodes: state the target business domain, product, user role, and feature being modeled. If this cannot be stated from `spec.md`, stop with `Blocker Type: SUBJECT_CONFUSION` or `UPSTREAM_DOC_GAP` and route to `/sp.specify` or `/sp.clarify`.
- Confirm the active flow request is for the target business product, not SP, SpecCompass, Spec Kit, command execution, memory management, preflight, gate, task routing, or methodology visualization. If the requested or inferred flow subject is the SP mechanism itself, stop with `Blocker Type: SUBJECT_CONFUSION`.
- Check whether user input changes product goal, source authority, requirements, acceptance, business rules, or scope boundary. If so, stop flow work and route to `/sp.prd`, `/sp.specify`, or `/sp.clarify` before creating or refreshing flow artifacts.
- Check whether the requested flow decision depends on unresolved user intent, conflicting requirements, risk acceptance, verification downgrade, permission ownership, or irreversible tradeoff. If so, route to `/sp.clarify` with the decision options instead of inventing the transition.
- Confirm existing flow artifacts are not only generic templates, stale drafts, or unconfirmed visual-review outputs being used as stable facts. If they are, keep the result draft or route to the owner command before promoting memory or trace.
- Confirm whether the current run belongs to an existing flow batch or starts a
  new one. If an existing `WAITING_FOR_BATCH_REVIEW` flow batch covers the same
  scope, update that batch instead of creating independent per-module
  confirmations. If source changes make the batch baseline stale, mark the batch
  stale and route to the owner refresh before adding more downstream evidence.
- If the source information is coarse but the business domain, user role, business goal, and feature boundary are clear, continue only by creating a bounded draft decomposition. Use common business-flow patterns to fill likely missing steps, mark each inferred step as `Source: model-inferred`, and keep it draft until user review or later analyze/gate checks. If the coarse source hides a business choice, security/permission rule, compliance rule, irreversible transition, pricing/settlement rule, or acceptance meaning, stop and route to `/sp.clarify` or `/sp.specify` instead of inferring it.
- If preflight fails, report `Missing/Weak Artifact`, `Blocker Type`, `Root Layer`, `Owner Route`, `Why current command cannot continue`, `Next /sp.* route`, and `Writeback Target`. Do not generate flow documents from missing or contradictory requirement facts just to satisfy downstream commands.

## Do

- Before generating any flow node, write a one-sentence business domain anchor that names the target product, target user, target business operation, and source requirement. Put this anchor visibly near the top of `flows/index.md` or the command summary, and use it to keep all flow nodes, labels, events, and UI contracts inside the business domain.
- Decompose the flow top-down before writing diagrams: business goal, actors, lifecycle states, mainline stages, decision points, exception/recovery paths, non-UI/system/external steps, UI contracts, and verification evidence.
- Flow Design Principles:
  - Business fit is the first constraint. A flow step, branch, state, exception, or handoff is valid only when it serves a source-backed business requirement, acceptance path, permission rule, data/state transition, recovery need, audit need, or user outcome.
  - Prefer the simplest sufficient flow. Do not add stages, approvals, confirmations, retries, states, actors, diagrams, or subflows unless they change business correctness, risk control, recovery, auditability, verification, or user outcome.
  - Keep flow units single-purpose and loosely coupled. Each subflow should have one business responsibility, clear entry/exit conditions, explicit inputs/outputs, and minimal assumptions about neighboring subflows.
  - Split when a branch has its own actor, lifecycle state, permission boundary, exception policy, verification path, or independent review value. Keep it inline only when splitting would hide a simple local decision.
  - When multiple valid flow shapes exist, offer 2-3 options with business impact and recommend the simplest one that satisfies the source requirements.
  - Do not optimize for diagram elegance over business truth. Do not merge distinct business responsibilities just to make one diagram shorter, and do not create new nodes for symmetry or decoration.
- When inputs are too brief, use bounded model inference to avoid an under-designed flow. Safe inferred details include common lifecycle stages, request/review/approve/reject/cancel/retry/audit patterns, empty or failure branches, timeout/retry behavior, notification or audit side effects, and verification checkpoints. Unsafe inferred details include new business rules, authority boundaries, pricing/settlement, data-retention/compliance, irreversible deletion, tenant/security permissions, or acceptance downgrades.
- Label inferred flow content clearly with `Source: model-inferred` or `OPEN-*` references. Inferred content may shape a review draft, but it must not close risks, replace user decisions, or become stable memory/trace until confirmed or checked.
- Use `[SRC:SPEC-*]`, `[SRC:CLARIFY-*]`, `[SRC:FLOW-*]`, `OPEN-*`, `Source: model-inferred`, or `[INFER:DRAFT]` markers for stable or draft flow rows so provenance is visible. Stable flow facts need source-backed provenance; `[INFER:DRAFT]` and `Source: model-inferred` are never stable evidence by themselves.
- If the coarse input admits multiple valid flow patterns, provide 2-3 design options with impact, recommendation, and next `/sp.clarify` or `/sp.flow` route. Do not silently choose a materially different business process for the user.
- Define the business mainline stages and actor boundaries.
- Capture state progression, branches, exceptions, defaults, and overrides.
- For each critical flow step, record the node type: `ui`, `system`, `external`, `scheduled`, `manual`, or `none_ui`.
- For each critical flow step, record a lightweight port contract: input, precondition or permission, business action, output or side effect, target state, failure path, and verification or acceptance evidence.
- For `ui` type steps, record only the business UI contract: fields to collect, business facts to show, end-user actions allowed, permissions, and error states. Leave layout and composition to `/sp.ui`. Wrong: "Display flow progress: Step 1 -> Step 2 -> Step 3". Right: "Collect approval reason and attachments, show request summary, allow submit/cancel for the submitter role, and show validation errors."
- For non-UI steps, record the trigger, required input, side effect, failure path, and verification route. Do not force a screen binding when no screen is needed.
- Keep Mermaid flow assets and supporting Markdown in sync.
- Prefer renderable text diagrams such as Mermaid, PlantUML, or Graphviz over
  bitmap images. When a rendered diagram, exported image, or preview is produced
  from those sources, make the review labels visible in the diagram, such as
  `FLOW A1`, `FLOW A1-3`, `DEC D2`, `ERR E1`, or `EXT X1`. Keep a mapping from
  each visible review label to the source anchor, name, business meaning, and
  related UI/API/data/test references.
- Use stable IDs for states, actions, decisions, and exceptions when practical. Keep the main coordinate at `FEATxx.WSxx.TYPExx`; use local labels such as `Step 1`, `Decision: reject`, or `Event: approve_submitted` for internal flow details instead of deep micro IDs.
- Refresh trace and memory files when flow changes alter stable facts or routing. If the change is only a draft inference, keep it in `flows/*` or `memory/open-items.md` until checked.
- Mark non-trivial missing validation evidence with `@t0` only when it can be resolved through trace or open-items.
- If one flow area is too large for one focused read set, recommend a workset split for `/sp.plan` instead of hiding complexity in one diagram.
- If branch, state, or exception behavior cannot be resolved after bounded evidence review, fall back to `/sp.clarify` or `/sp.specify` instead of inventing the transition.
- If a direct-neighbor data-linkage gap affects acceptance, tests, release, rollback, permissions, data safety, or human decisions, register it in `memory/open-items.md` and route to `/sp.clarify`, `/sp.specify`, `/sp.ui`, `/sp.plan`, or `/sp.gate` rather than smoothing it over in the flow diagram.
- If the same flow issue has multiple reasonable repairs, offer 2-3 options with impact, recommendation, and next command instead of choosing silently.
- If an earlier flow batch is still waiting for confirmation and the user moves
  to a downstream command or a new topic, remind the user that the batch is not
  stable, name the affected `Batch ID` and `Batch Scope`, and recommend returning
  to the batch review page. Do not suggest `/sp.ui`, `/sp.plan`, or `/sp.gate`
  until the batch is confirmed or explicitly split.
- After drafting but before writing files, run a subject-confusion scan. If any draft flow node, label, event, or UI contract primarily describes SP mechanics, command stages, routing, memory operations, or a process-display UI instead of the target business domain, discard the affected draft before file write, stop execution, and return a `SUBJECT_CONFUSION` blocker that instructs the next run to regenerate from `spec.md`.
- If the same feature or workset hits `SUBJECT_CONFUSION` twice for the same business-domain boundary, stop retrying and route to `/sp.clarify` with 2-3 boundary choices for the user to decide.

## Do Not

- Do not drift into UI screen design.
- Do not write delivery-layer implementation details.
- Do not leave missing branch handling implicit.
- Do not produce flow nodes, diagrams, actors, events, states, decisions, or written descriptions that represent SP's own command processing, routing, memory operations, preflight checks, gate decisions, workset management, or methodology stages.
- Do not use `/sp.*` commands, `spec.md`, `memory/index.md`, `trace-index.md`, `open-items.md`, `preflight`, `workset`, `gate`, or other SP-internal terms as business flow nodes unless the target product itself explicitly contains those user-facing concepts.
- Do not define `ui` type steps as workflow monitoring panels, process visualization views, state transition timelines, or flow diagrams as UI. They must describe target end-user business inputs, actions, visible business facts, permissions, and error states.
- Do not invent exception handling or state transitions that are not supported by `spec.md` or clarifications.
- Do not use deep default IDs such as `FLOW01.STEP04`, `UI03.BTN05`, or `API02.FIELD03` as stable public coordinates unless a recurring cross-document object truly needs promotion.
- Do not write draft flow assumptions into `memory/stable-context.md` or use them to close `OPEN-*`, `RISK-*`, `@t0`, or `@r0`.
- Do not suggest `/sp.ui`, `/sp.plan`, or `/sp.gate` as if the flow is stable when the current run requires batch confirmation or visual review and the user has not confirmed the draft.

## Output

- Create or update `specs/<feature>/flows/index.md`
- Create or update `specs/<feature>/flows/*.mmd`
- Create or update `specs/<feature>/flows/review/flow-review-batch.md` or an
  equivalent batch review manifest when confirmation is recommended or required.
- Create or update `specs/<feature>/flows/review/flow-review.html` and
  review-data artifacts when the unified confirmation page is available.
- After the user completes batch confirmation, write or update
  `specs/<feature>/flows/review/flow-confirmation.md` using the Confirmation
  Document Schema above. This Markdown file is the authorization evidence
  downstream commands must read before treating flow artifacts as stable input.
- When generating `flow-review.html`, use the unified confirmation template:
  a header titled `SpecCompass — <project> / <feature>` with a short
  specCompass mechanism note and page title, a main review area with labeled
  flow diagrams or tables, and a narrow right confirmation sidebar. The right feedback rail is mandatory; if it is missing, the review artifact is invalid
  and cannot authorize downstream work. The sidebar should be approximately
  280-320px wide, use Tiffany Blue `#0ABAB5` as the primary color, and include
  batch summary, selected item details, status banner, feedback textarea,
  per-item approve/defer/reject/block controls, a Pending Decisions list,
  blocker/stale list, and a batch confirmation action. The page must show where
  `flow-confirmation.md` will be written. If HTML review is unavailable, the
  Markdown batch review manifest must expose the same fields.
- Refresh `specs/<feature>/memory/stable-context.md` only when source-backed or checked flow facts changed, or when routing changed. Draft inferences stay in `flows/*` or `memory/open-items.md`.
- Refresh `specs/<feature>/memory/trace-index.md` only when stable trace links changed. Draft links stay in `flows/*` or `memory/open-items.md` until checked.
- Refresh `specs/<feature>/memory/index.md` if routing changes
- Write or refresh flow `Stage Readiness` in `specs/<feature>/flows/index.md` or `specs/<feature>/memory/index.md`: include `Stage`, `Status`, `Based On`, `Source Snapshot` or `Evidence Signature`, `Confirm Strategy`, `Batch ID`, `Batch Scope`, `Batch Review Status`, `Unresolved Blockers`, `Needs Decision`, `Inferred/Draft Items`, `Next Allowed Stage`, and `Writeback Target`. The signature must include `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Use `WAITING_FOR_BATCH_REVIEW` when the batch is generated but not confirmed. Use `READY_FOR_UI` only when the source-backed flow, port contracts, UI contracts, provenance, batch or visual-review status, and open blockers are clean; otherwise use `DRAFT_ONLY`, `NEEDS_DECISION`, or `BLOCKED` with the next owner route.
- Add `Status Reason` to every blocked or non-ready item in the diagram, table, review rail, manifest, open item, or Stage Readiness. The reason must be 10-30 Chinese characters (or equivalent short English phrase for English-language projects), explain the root cause and impact, and sit directly after statuses such as `BLOCKED`, `NEEDS_DECISION`, `WAITING_FOR_BATCH_REVIEW`, `DRAFT_ONLY`, `STALE`, or `REJECTED`.

## Check Before Finish

- Confirm the mainline and exception paths are both visible.
- Confirm every non-trivial node, branch, state, exception, handoff, and subflow exists for a business reason, not diagram symmetry.
- Confirm the mainline is the shortest source-backed path that satisfies acceptance, permissions, state progression, and recovery needs.
- Confirm each subflow has one responsibility, clear input/output boundaries, and no hidden dependency on neighboring subflows.
- Confirm split/inline decisions are recorded when a branch is large, cross-actor, permissioned, independently verifiable, or exception-heavy.
- Confirm simplification did not remove required permissions, auditability, recovery, verification evidence, or source-backed exception handling.
- Confirm the flow is not under-decomposed: it covers business goal, actors, mainline stages, decisions, exceptions, state changes, non-UI/system steps, UI contracts, and verification evidence, or records explicit open items for missing parts.
- Confirm any `Source: model-inferred` flow content is marked as draft, traceable to the source requirement, and not promoted to stable memory/trace without confirmation or current evidence.
- Confirm every stable flow node, decision, event, state, UI contract, and exception path has provenance such as `[SRC:SPEC-*]`, `[SRC:CLARIFY-*]`, `[SRC:FLOW-*]`, or an explicit `OPEN-*`; `[INFER:DRAFT]` and `Source: model-inferred` do not qualify as stable provenance.
- Confirm state transitions are consistent with the clarified business rules.
- Confirm every critical flow step has node type and port contract coverage, or an explicit `OPEN-*` / `RISK-*` item.
- Confirm every `ui` type step links to a UI contract or an open item, and every non-UI step has a trigger and verification route.
- Confirm direct-neighbor data-linkage checks are visible for any step that changes state, data, permission, event, persistence, side effect, or acceptance meaning.
- Confirm every Mermaid artifact matches the written description.
- Confirm flow visuals or renderable Mermaid files show human-review labels and
  that each label maps back to a structured source row or anchor.
- Confirm every reviewable diagram obeys the node budget: no more than 12
  business nodes per diagram unless a written exception is justified, 10-12
  nodes are reviewed for summary-plus-subflows splitting, and anything above 12
  business nodes is split before approval is requested.
- Confirm every renderable flow diagram uses a top-down main-trunk layout with
  the mainline centered, exceptions/recovery/blockers side-expanded, stable IDs
  separated from concise visible business labels, and no unnecessary crossing
  lines.
- Confirm blocked, pending decision, and stale statuses are visible both in the
  diagram or table and in the right feedback rail. A non-empty Pending Decisions
  list, any decision node missing an explicit default path, or any undefined branch exit must keep `Stage Readiness.Status` as `NEEDS_DECISION` or
  `BLOCKED`, not `READY_FOR_UI`. Confirm every decision node has an explicit default path before promotion.
- Run a subject-confusion scan: confirm no flow node, actor, event, state, decision, diagram label, or written flow description uses `/sp.*`, `sp.*`, `memory/index.md`, `trace-index.md`, `open-items.md`, or `SUBJECT_CONFUSION` as business content. Treat broader terms such as `preflight`, `Allowed Write Set`, `Required Checks`, or `NEEDS_DECISION` as contextual analyze/gate findings, not automatic mechanical failures. If clear control-plane content is found, stop, discard the affected flow content, and return a `SUBJECT_CONFUSION` blocker with the exact `specs/<feature>/spec.md` read target and next `/sp.flow` route. Do not regenerate in the same run.
- Confirm draft assumptions are labeled or routed to `memory/open-items.md` instead of being promoted to stable memory.
- Confirm any open branch, state conflict, or unresolved exception is registered in `memory/open-items.md`.
- Confirm whether the visual review gate was required, skipped, or already satisfied. If required and not satisfied, confirm the flow remains a draft and is not promoted to stable memory or stable trace.
- Confirm whether the default batch confirmation applies. If it applies and is
  not complete, confirm `Stage Readiness.Status` is `WAITING_FOR_BATCH_REVIEW`,
  the batch manifest lists all in-scope flow items, and downstream commands are
  blocked until confirmation or explicit batch split.
- Confirm flow `Stage Readiness` is not `READY_FOR_UI` when source provenance is missing, draft inference is used as stable evidence, batch/visual review is still required, `SP_STAGE_SEED` remains, or high-impact open items remain.
- Run the `Finish Quality Gate` before closeout:
  ```yaml
  Finish Quality Gate:
    model_fixable_issues: none | present
    human_blockers: none | present
    self_fix_rounds: 0-3
    quality_result: QUALITY_PASSED | CONTINUE_FIXING | HUMAN_BLOCKED | EXHAUSTED_BLOCKED
    evidence: <current checks, files, diagram labels, review artifacts, and blocker routes>
  ```
  Do not stop to report while model-fixable quality issues remain. Continue fixing incomplete port contracts, unreadable diagrams, missing right feedback rail, missing `Status Reason`, malformed review manifests, missing source labels, or flow/UI contract gaps until `QUALITY_PASSED`, `HUMAN_BLOCKED`, or `EXHAUSTED_BLOCKED`. If the remaining issue needs human input, source authority, or a decision, return `HUMAN_BLOCKED` with a 10-30 Chinese characters (or equivalent short English phrase for English-language projects) `Status Reason`, background, impact, options, recommendation, and owner route. CONTINUE_FIXING is an internal loop state; do not use it as the final output status of this command. If three self-fix rounds cannot resolve the same issue, return `EXHAUSTED_BLOCKED` with the failure signature and next route.

## Next

- End every run with a concrete closeout recommendation. Do not only list possible next commands. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.
- Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, flow `Stage Readiness`, and this flow evidence. If flow readiness is missing or blocked, recommend `/sp.flow`, `/sp.clarify`, or `/sp.specify` with the exact blocker route instead of downstream work.
- If the closeout names a numbered feature, module, or mainline such as `110-template-library-template-application`, include 1-3 short Chinese sentences explaining what it mainly does and why it matters. If the role is not confirmed by current evidence, say it is not confirmed and recommend evidence repair or `/sp.route all`.
- Use this exact closeout shape:

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
- Recommend `/sp.ui <feature>` or `/sp.gate <feature>` only when flow `Stage Readiness` is `READY_FOR_UI`; if the status is `WAITING_FOR_BATCH_REVIEW`, recommend the flow batch review/confirmation route and list `/sp.ui`, `/sp.plan`, and `/sp.implement` under `DO_NOT_RUN`.
- Suggest `/sp.ui` or `/sp.gate` only when flow `Stage Readiness` is `READY_FOR_UI`.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
- End with a visual review prompt and batch confirmation prompt when renderable text diagrams, exported
  images, or flow previews exist. Tell the user:
  - a short Chinese flow review summary before the confirmation request:
    `设计依据` from PRD/spec/clarifications, `业务目标`, `参与角色`,
    `主流程`, `决策点`, `异常/恢复`, `状态变化`, `UI 契约`,
    `系统/外部步骤`, `草稿或推理项`, and `需要确认的问题`;
  - flow visuals are ready for review, or only structured flow files are ready
    if no preview/export was generated;
  - which files to review, such as `specs/<feature>/flows/*.mmd`;
  - which viewer to use, such as GitHub Markdown preview, VS Code Mermaid
    preview, Mermaid Live Editor, mermaid-cli, PlantUML, or Graphviz depending
    on the file format;
  - that requested changes should reference visible labels or names, for
    example: "Please adjust FLOW A1-3 branch handling so rejected approvals go
    to manual review instead of direct failure";
  - that visual changes must be written back to structured flow files before
    diagrams, exports, or previews are regenerated.
- If batch confirmation or visual review is required, do not present `/sp.ui` or `/sp.gate` as the immediate next step until the user confirms the flow draft
  or selects a repair option.
  The immediate recommendation should be the confirmation/repair action, with a
  copy-pasteable `/sp.flow <feature>` command that tells the next run exactly
  which visible flow/decision/exception labels to confirm or revise.
