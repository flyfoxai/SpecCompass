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
- Classify visual review into three tiers before promoting flow artifacts:
  - **No confirmation required**: trivial label, copy, formatting, or docs-only refresh; no new or changed flow semantics; no new nodes, branches, states, permissions, exceptions, or downstream readiness impact; and no visual artifact requires a direction choice. Record why confirmation was not required.
  - **Recommended confirmation**: small non-critical additions or readability/layout changes, including 1-2 non-critical nodes, branches, or labels, where source backing is clear and downstream readiness is not affected. The run may continue as a draft or with a warning, but must state what the user should review by visible label.
  - **Required confirmation**: first-time stable flow generation, major branch/state/permission/exception changes, 3 or more new flow nodes, explicit review requests, unclear user approval of the direction, model-inferred flow content that would be used beyond draft, or any change affecting stable memory, stable trace, gate PASS evidence, implementation readiness, or `READY_FOR_UI`. In those cases, end with a draft result and ask the user to confirm or request changes by visible label before promotion.
- For explicit `--auto` runs, only the visual review gate may be skipped. State why it was skipped, what changed, which tier would otherwise apply, and whether the result is still draft or ready for the next step.
- `--auto` may skip only the visual review gate; it must never skip Subject Scope, business domain anchor, Stage Entry Preflight, or subject-confusion checks.

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
- If an earlier flow draft is still waiting for confirmation and the user moves to a downstream command or a new topic, remind the user that the draft is not stable and ask whether to continue review, abandon the draft, or start the new task.
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
- Do not suggest `/sp.ui`, `/sp.plan`, or `/sp.gate` as if the flow is stable when the current run requires visual review and the user has not confirmed the draft.

## Output

- Create or update `specs/<feature>/flows/index.md`
- Create or update `specs/<feature>/flows/*.mmd`
- Refresh `specs/<feature>/memory/stable-context.md` only when source-backed or checked flow facts changed, or when routing changed. Draft inferences stay in `flows/*` or `memory/open-items.md`.
- Refresh `specs/<feature>/memory/trace-index.md` only when stable trace links changed. Draft links stay in `flows/*` or `memory/open-items.md` until checked.
- Refresh `specs/<feature>/memory/index.md` if routing changes
- Write or refresh flow `Stage Readiness` in `specs/<feature>/flows/index.md` or `specs/<feature>/memory/index.md`: include `Stage`, `Status`, `Based On`, `Source Snapshot` or `Evidence Signature`, `Unresolved Blockers`, `Needs Decision`, `Inferred/Draft Items`, `Next Allowed Stage`, and `Writeback Target`. The signature must include `Sources`, `Anchors`, `Open Items`, `Visual/Human Review`, and `Checks`. Use `READY_FOR_UI` only when the source-backed flow, port contracts, UI contracts, provenance, visual-review status, and open blockers are clean; otherwise use `DRAFT_ONLY`, `NEEDS_DECISION`, or `BLOCKED` with the next owner route.

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
- Run a subject-confusion scan: confirm no flow node, actor, event, state, decision, diagram label, or written flow description uses `/sp.*`, `sp.*`, `memory/index.md`, `trace-index.md`, `open-items.md`, or `SUBJECT_CONFUSION` as business content. Treat broader terms such as `preflight`, `Allowed Write Set`, `Required Checks`, or `NEEDS_DECISION` as contextual analyze/gate findings, not automatic mechanical failures. If clear control-plane content is found, stop, discard the affected flow content, and return a `SUBJECT_CONFUSION` blocker with the exact `specs/<feature>/spec.md` read target and next `/sp.flow` route. Do not regenerate in the same run.
- Confirm draft assumptions are labeled or routed to `memory/open-items.md` instead of being promoted to stable memory.
- Confirm any open branch, state conflict, or unresolved exception is registered in `memory/open-items.md`.
- Confirm whether the visual review gate was required, skipped, or already satisfied. If required and not satisfied, confirm the flow remains a draft and is not promoted to stable memory or stable trace.
- Confirm flow `Stage Readiness` is not `READY_FOR_UI` when source provenance is missing, draft inference is used as stable evidence, visual review is still required, `SP_STAGE_SEED` remains, or high-impact open items remain.

## Next

- Suggest `/sp.ui` or `/sp.gate` only when flow `Stage Readiness` is `READY_FOR_UI`; otherwise suggest `/sp.flow`, `/sp.clarify`, or `/sp.specify` with the exact blocker route.
- End with a visual review prompt when renderable text diagrams, exported
  images, or flow previews exist. Tell the user:
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
- If visual review is required, do not present `/sp.ui` or `/sp.gate` as the
  immediate next step until the user confirms the flow draft or selects a
  repair option.
