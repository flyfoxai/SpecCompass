---
description: Shape the mandatory upstream PRD intake before stable feature specification.
handoffs:
  - label: Stabilize Feature Spec
    agent: sp.specify
    prompt: Convert confirmed PRD intent into the stable feature specification.
    send: true
  - label: Resolve Product Decisions
    agent: sp.clarify
    prompt: Resolve high-impact product or scope decisions discovered during PRD work.
    send: true
  - label: Review Governance Candidates
    agent: sp.constitution
    prompt: Review governance candidates discovered during PRD work.
    send: true
scripts:
  sh: scripts/bash/check-prerequisites.sh --json
  ps: scripts/powershell/check-prerequisites.ps1 -Json
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Active Lite Round

Before normal execution, check `specs/<feature>/lite.md`. If it is absent or
has no active selected round, preserve the full SP behavior of this command.
For an active round, run the platform-appropriate installed `sp-lite-state`
script with JSON output and accept only schema `speckit.lite.route.v1`. Read its
`Active Round`, `Included Outline Anchors`, `Deferred Outline Anchors`, `Reuse Refs`,
`Allowed Write Set`, `Required Historical Regressions`, `Global Status`, and
`Blocker Route` before writing PRD artifacts.

Normal Lite PRD work is authorized only when the fresh payload has
`globalControl=CLEAR`, `continueAllowed=true`, and `next="/sp.prd"`. On any
other normal route, stop without writing and return its `next`. A non-`CLEAR`
route is resolution-only: proceed only when `Blocker Route` is `/sp.prd` and
the human explicitly invoked that repair route. Limit that repair to the named
conflict, stale, or regression references and the `Allowed Write Set`; do not
advance the Lite lifecycle or clear coordinator state yourself. Return
`/sp.lite sync` so the coordinator can recompute global control. All other
non-`CLEAR` routes stop without writing.

Within authorized scope, work only on the included anchors, never absorb
deferred anchors, and reuse cited prior evidence. The confirmed Outline remains
the project completion boundary regardless of the current Lite scope. Before
returning a completed Lite-scoped PRD stage, publish round evidence in `prd.md`
with these exact fields: `Lite Round`, `Lite Stage`, `Included Outline Anchors`,
and `Source Signature`, using stage `PRD` and the before-dispatch signature
supplied by the coordinator.

## Pre-Execution Checks

**Check for extension hooks (before PRD discovery)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_prd` key.
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

# /sp.prd

## Outline

Goal: Create or refresh the mandatory upstream PRD intake for every new feature, capability direction, or important requirement change, while keeping `/sp.specify` as the stable requirement intake and baseline specification point.

Global rules:
- Stay within product discovery and documentation work only.
- `/sp.prd` is the mandatory upstream requirement intake. Simple requests may use a short PRD, but new feature work must not skip this stage.
- `prd.md` is not a stable fact source. It informs `/sp.specify`, but confirmed requirements become stable only after they are carried into `spec.md`.
- Use top-down requirement growth for the PRD interview, but never copy interview headings such as goals, users, problems, scope, or process into the visible Level 1 business map. Extract domain objects, actions, controls, outcomes, and boundaries before naming map branches.
- Use source tags on material content: `[src:user]`, `[src:doc]`, `[src:ai-proposed]`, `[src:user-confirmed]`.
- Use uncertainty tags when needed: `[uncertain:tbd]`, `[uncertain:assumed]`, `[uncertain:proposed]`.
- Do not write code, API routes, database schemas, framework choices, file paths, test commands, or implementation tasks.
- Do not convert `[src:ai-proposed]` ideas into confirmed requirements without user confirmation.
- If a decision is needed, generate a plain-language decision package with background, confirmed evidence, impact, 2-4 options, tradeoffs, recommendation, and next `/sp.*` route.
- In headless or non-interactive runs, do not guess unclear product direction, feature boundary, human risk acceptance, or governance tradeoffs. Return `SP_STATUS: NEEDS_DECISION`, include the decision package, end with `SP_EXIT_CODE: 1`, and stop.
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.

Execution flow:

1. Locate the intended feature area.
   - If `.specify/memory/project-index.md` exists, read it first for project routing.
   - If `.specify/memory/active-context.md` exists, use it to avoid reading unrelated project content.
   - If the target feature already exists, use `specs/<feature>/prd.md` as the PRD draft location.
   - If no feature directory exists but the user intent is clear enough to name a feature, create `specs/<feature>/` and initialize `prd.md`.
   - If even the feature boundary is unclear, ask for the macro product direction or feature boundary before writing a PRD draft.
   - In headless or non-interactive mode, do not create a guessed feature directory from unclear intent. Output a decision package with `SP_STATUS: NEEDS_DECISION`, end with `SP_EXIT_CODE: 1`, and stop.
2. Collect information through a human-friendly PRD interview structure.
   - Strategic goal: what larger product or business outcome is being pursued.
   - Product positioning: what this product or capability is, and what it is not.
   - Business goals: measurable outcomes or operational improvements.
   - Target users and roles: who uses it, who approves it, who is affected.
   - Problem domains: what problems must be solved to satisfy the goals.
   - Core scenarios: where and when the product is used.
   - Capability map: source-backed business objects, actions, controls, and outcomes grouped by cohesive product responsibility, not by PRD section headings.
   - Main flows and key branches: business flow seeds, not final flow specs.
   - Scope and non-goals: MVP boundary, excluded ideas, and why.
   - Acceptance seeds: early success checks that `/sp.specify` can stabilize later.
   - Risks and open questions: safety, data, compliance, cost, rollback, or delivery uncertainty.
3. Use model capability to grow requirements safely.
   - Preserve the user's concrete domain nouns, verbs, outcomes, root name, and explicit Level 1 structure before expanding or regrouping anything.
   - Propose candidate capabilities, branches, non-goals, acceptance seeds, and risks only as `[src:ai-proposed]`.
   - Compare candidates by user value, risk, cost, dependency, reversibility, and scope impact.
   - Keep rejected ideas and reasons visible so later agents do not propose them again.
   - Keep local details under their parent goal, scenario, flow, UI seed, or acceptance seed.
   - If a local detail has no parent, place it under `Open Questions`, `Candidate Requirements`, or `UI Surface Seeds`.
4. Choose the PRD depth before writing.
   - Lean PRD: use this when the user already provides a clear goal, target users, scope, and basic acceptance intent. Keep the PRD short, but still include: `Strategic Goal`, `Target Users and Roles`, `Core Scenarios`, `Scope and Non-Goals`, `Acceptance Seeds`, `Risks and Open Questions`, and `Handoff To Specify`.
   - Full PRD: use this for 0-to-1 ideas, unclear scope, multiple capability directions, governance implications, high-risk domains, or conflicting source material. Use the full section set below.
   - When unsure, prefer a lean PRD plus explicit open items instead of expanding into speculative detail.
   - Lean PRD still needs enough substance to stand on its own. At minimum it must contain one clear strategic goal, at least one target user or role, at least one bounded core scenario, explicit scope/non-goals, acceptance seeds, and at least one open question or risk when anything material is still uncertain. If those anchors are missing, treat the intake as `NEEDS_PRD` or `NEEDS_CLARIFY` instead of pretending the PRD is already sufficient.
5. Create or refresh `specs/<feature>/prd.md`.
   - Recommended sections:
     - `Strategic Goal`
     - `Product Positioning`
     - `Business Goals`
     - `Target Users and Roles`
     - `Problem Domains`
     - `Capability Map`
     - `Core Scenarios`
     - `Main Flow Seeds`
     - `Key Branch Seeds`
     - `Scope and Non-Goals`
     - `Acceptance Seeds`
     - `Candidate Requirements`
     - `Rejected Ideas`
     - `UI Surface Seeds`
     - `Data and Policy Seeds`
     - `Risks and Open Questions`
     - `Constitution Candidates`
     - `Handoff To Specify`
   - The detail boundary is: enough for `/sp.specify` to create a stable spec, not enough to skip `/sp.specify`, `/sp.flow`, `/sp.ui`, `/sp.plan`, or `/sp.tasks`.
   - The handoff result is `ready for /sp.specify`, never `ready for implementation`.
6. Create or refresh `specs/<feature>/spec-outline.md` readiness.
   - The outline is a lightweight bridge from PRD to `/sp.specify`; it must not become flow, UI, API, database, plan, tasks, or implementation design.
   - Always read the existing `specs/<feature>/spec-outline.md` first if it exists, then refresh its status from the current `prd.md` instead of preserving stale readiness.
   - Record `Outline Maturity` independently from `Outline Decision`, `review_level`, and `confirmation_priority`. Its exact machine values are `outline_maturity: explore | frame | specify_ready`; maturity may regress when product intent, scope, or source authority changes.
   - `explore` is Level 1 portfolio-boundary discovery. Level 1 owns portfolio decomposition: identify whether the parent product should remain one product or become several independently understandable child projects, and obtain deep user participation in that boundary decision. Before proposing boundaries, record a source-backed or explicitly unresolved product subject, at least one named role with a domain action, and the failing or changing business object, operation, or result; a non-empty goal/user/problem sentence alone is not a pass condition. Remain in Level 1 until every source-backed capability has an explicit owner or disposition and all candidate boundaries are resolved by a validated user response as confirmed, merged, split, deferred, excluded, retained in the parent, or recorded as an evidence gap.
   - `frame` is Level 2 child-project convergence. Level 2 owns child-project framing: for a retained one-product decision, frame that product from the confirmed parent PRD, accepted intent-ledger events that target the confirmed retained-product scope, inherited constraints, and their source authorities; Level 1 decomposition events remain authoritative boundary history but are not child-scope facts. For a decomposed parent, consume exactly one confirmed `Subproject Handoff`, its referenced sources, inherited constraints, and accepted child-local deltas. Define only that product or child's scope, non-goals, first slice, actors, business chains, acceptance intent, source authority, high-impact rules, exceptions, and named handoffs. Level 2 must not reopen the full portfolio decomposition merely because sibling projects exchange data or run in one topology. Enter it only after Level 1 records a confirmed single-project decision or a confirmed child handoff; remain there until the framed product has at least one user-confirmed or formal-source chain from trigger and starting state through business action/control to resulting state or observable outcome, and every first-slice boundary or blocking rule has a source, a user decision, or an explicit unresolved field.
   - `specify_ready` is Level 3 formal Outline preparation. Level 3 is a source-preserving compilation: compile the current confirmed PRD, consumed intent-ledger events, confirmed child framing, and source authorities into `spec-outline.md` and `outline-review-data.json` without discovering new product content. It may reorder and summarize for display only when every formal item keeps an identity and provenance link to its confirmed source. It must not create, merge, split, or reinterpret business facts, erase confirmed differences between child projects, promote `[src:ai-proposed]` material, or use the Constitution to infer, complete, or decide product content. It must not invent target users, product goals, business rules, or scope. Constitution content remains display-only here; route formal governance decisions to `/sp.constitution`.
   - Reassess maturity after every accepted delta or source-authority change and fall back to the narrowest affected level. From `specify_ready`, return to `frame` when the framed product's scope, first slice, chain, rule, acceptance outcome, handoff, or source authority is missing or contradicted. From `frame`, return the whole product to `explore` only when the retain-one-product decision is reversed or the complete portfolio identity or ownership model is contradicted. When a conflict affects one named handoff or the ownership of one capability between confirmed children, keep every unaffected child stable, mark only the affected boundary or pair of boundaries unresolved, and route only those boundaries for Level 1 resolution; never reopen every candidate or silently merge children in Level 2. Wording, ordering, formatting, and source-preserving summaries do not change maturity by themselves.
   - Compile Level 1 Discovery in three explicit stages. Do not draft map titles, summaries, candidate projects, or generic overview copy before Stage A is complete. Level 2 uses its separate child-framing compiler below; do not rerun Level 1 decomposition inside Level 2.
   - **Stage A - extract source-backed capability atoms**: derive `business_context` only from the user input, current PRD, accepted intent-ledger events, and formal business sources. Apply this precedence: the user's current explicit product root and corrections; accepted user decisions already in the PRD or ledger; current formal product sources; the user's unconfirmed split or Level 1 proposal; then unconfirmed model proposals. When sources conflict, the higher-precedence source wins. Preserve an explicit business-oriented root or Level 1 proposal and do not rename it merely to satisfy map density. If a user-proposed split is implementation-oriented or fails the product-boundary quality gate, do not silently replace it and do not canonize it: show the original proposal beside one source-backed business alternative and ask the concrete boundary decision.
   - **Stage A isolation rule**: During Stage A, presentation constraints do not exist. Ignore map readability, density budget, overview layout, renderer node limits, question count, and branch grouping. These constraints are strictly Stage B/C concerns. Complete Stage A fully — including `source_capability_coverage` serialization — before reading any density or map requirements.
   - Before compiling any map, build a capability coverage table with the real `product_subject`, `business_objects`, `operations`, `outcomes`, `capability_atoms`, `business_chains`, and `evidence_gaps`. A `capability_atom` is the smallest source-backed statement of what the product stores, creates, changes, decides, controls, exchanges, delivers, or verifies. Each complete business chain must connect a trigger or input, at least one business object and starting state, an operation or control, and a resulting state or observable outcome, with `source_refs`. Serialize every atom into `business_context.capability_atoms` with `atom_id`, `label`, `trigger_kind`, `trigger_or_input`, `owned_state`, object/action/outcome references, `primary_outcome_ref`, `downstream_handoff`, exactly one Level 1 `business_chain_ref`, and source evidence. Classify `trigger_kind` from the actual source trigger as `business_event`, `exception_or_interruption`, or `governance_change`; never choose it to make a preferred grouping pass. In Level 1, one atom must contribute to exactly one independently accepted outcome. Allocate every source-backed capability atom exactly once through the `capability_atom_refs` of one Overview business `map_link`; cross-cutting constraints are owned once in `global_constraints` and reference affected nodes without duplicating capability ownership. Do not erase an atom through summarization. Stage C check results and quality checklist remain private compilation work: never serialize stage labels, quality checklist, or self-review in visible copy. The source_capability_coverage serialized in this Stage is NOT private — it is a required JSON field in business_context.
   - Before serializing any capability atom, first build `business_context.source_capability_coverage` as a flat list of every independently verifiable business capability identified in the source materials. Each entry must record `source_capability_id`, `label`, `trigger_or_input`, `owned_state`, `observable_outcome`, `independent_acceptance_reason`, `disposition`, and `source_refs`. Assign `disposition: "atom"` and a `capability_atom_ref` for each capability that will become an atom; assign `disposition: "evidence_gap"` with an `evidence_gap_ref` for capabilities blocked by missing evidence; assign `disposition: "excluded_by_source"` only when the source itself explicitly excludes the capability. Do not assign `disposition: "user_confirmed_merge"` in initial generation — merging is a user decision available only after a validated Discovery response is consumed. If source text names N independently verifiable business areas, `source_capability_coverage` must have at least N entries.
   - Extract all capability atoms as a flat list before creating any chain, project title, map, or question. Do not let an end-to-end story demote an independently accepted state change into an internal step. The initial Level 1 compilation is strictly one capability atom, one business chain, and one candidate project. The atom and chain must carry identical `trigger_kind`, `trigger_or_input`, `owned_state`, `primary_outcome_ref`, and `downstream_handoff` values. The initial compiler must not merge atoms during initial Level 1 generation, even when they are sequential, share a business object or store, run in one process, or contribute to one later terminal result.
   - **Stage A semantic quality gate**: after extracting capability atoms, apply these specificity checks before proceeding to Stage B. Each `business_object` must name a concrete business entity with key attributes, not just a category word like "数据" or "订单" without context. Each `operation` must describe a specific input, transformation, and output, not just an empty verb like "处理" or "manage". Each `outcome` must state an observable result with measurable criteria, not just "成功" or "完成". Each `capability_atom.label` must name the concrete business responsibility with domain terminology that cannot be reused across unrelated domains. Each `owned_state` must describe a specific business state or state transition with key fields, not just "业务状态" or "数据状态". Each `trigger_or_input` must identify the originating system, role, or event type, not just "业务事件" or "用户操作". Each `downstream_handoff` must name the exchanged business fact, command, or event and the receiving responsibility, not just "传递给下游" or "发送给系统". If any atom, object, operation, or outcome fails this check, re-extract with focus on source-backed domain terminology before attempting Stage B. Do not proceed to map generation with generic placeholders.
   - **Stage B - propose candidate subprojects and compile business maps**: Stage B may only compile maps and candidate boundaries from the `source_capability_coverage` produced in Stage A. It must not create new source capabilities, merge source capabilities without a user-confirmed delta, or re-interpret coverage entries. Presentation concerns (map layout, density, question grouping) are first permitted in Stage B; they must not alter any `source_capability_coverage` entry or any `capability_atom`. compile each capability atom into its own independently verifiable business chain and its own Level 1 candidate project before considering any boundary change. Serialize each chain with `chain_kind` (`primary`, `recovery`, or `governance`), its actual `trigger_kind`, one `owned_state`, exactly one Level 1 `primary_outcome_ref`, and one concrete `downstream_handoff`. `primary` pairs with `business_event`, `recovery` with `exception_or_interruption`, and `governance` with `governance_change`. Every Overview business `map_link` must reference exactly one `business_chain_ref` and exactly one `capability_atom_ref`; the atom must name that chain and carry the same trigger/input, owned state, primary outcome, and downstream handoff. Each candidate must declare one business goal; one independently verifiable business outcome; its uniquely owned business state, business objects, rules, and decisions; its single included capability atom; upstream inputs; downstream outputs; commands, events, or facts exchanged with named neighbors; source references; and the exact unresolved boundary, if any. A candidate passes only when its result can fail or be accepted independently of a sibling's private implementation and the sibling interaction is expressible through the declared business handoff. The complete set must cover the source-backed lifecycle without overlapping ownership or orphaned operations.
   - Merging is a user decision option, never an initial compiler action. Only after the atomic map exists may a question bound to one concrete candidate branch offer merging that atom into one named neighboring project, with the revised owned state, result, and handoff shown explicitly. Until the user confirms that option through a validated Discovery response, preserve both atoms, chains, and projects separately.
   - Treat a candidate title that joins noun lists, distinct state transitions, or separately testable verbs with punctuation or words such as “and” as a split alarm. Inspect the referenced atoms and outcomes instead of accepting the title as proof of cohesion. Keep the responsibilities together only when they operate on one owned business state, start from the same trigger kind, close the same primary chain, and produce one independently accepted result; otherwise split them or leave the exact ownership choice unresolved in `explore`. Normal fact capture and interruption recovery remain separate chains even when they read or repair the same business object. Parameter or rule change governance remains separate from the governed transaction chain when it has its own change trigger, approval result, or audit outcome.
   - Decomposition is a required analysis, not a split quota. Do not impose a fixed project count. When the target is already single-purpose, a split cannot produce independently verifiable value, or candidate projects require each other's private internals and no stable business fact, command, event, or decision contract can separate them, recommend retaining one project and state the business reason. Do not invent input-only projects, generic platform buckets, or mixed-responsibility containers merely to display loose coupling.
   - Product decomposition is independent from runtime topology. Low latency, shared storage, sequential processing, or deployment convenience alone must not justify retaining or merging one product; record them as delivery risks and decide the product boundary from business responsibility and independently verifiable outcomes. Transactional consistency or bidirectional business exchange requires classification: when imposed by an external business obligation such as regulation, contract, or multi-party legal duty, preserve it as a business invariant and show the affected ownership and handoff; when it exists only to simplify an internal implementation, record it as a delivery risk. Candidate projects may remain in one process, repository, database, or deployment. Never use runtime topology as an advantage, disadvantage, option-comparison dimension, recommendation reason, or maturity plan in a user-visible product-boundary decision. Likewise, do not split by frontend, backend, database, API, adapter, engine, message queue, repository, deployment process, team name, or another implementation layer. Team ownership may corroborate an already valid business boundary but cannot create one. A capability that cannot close an independent business outcome remains inside its owning subproject.
   - When a user-proposed business split is source-backed and every candidate passes the product-boundary gate, make confirmation of that split the default recommendation. Do not reopen a generic “one product versus several projects” choice because the candidates form a sequence or share a runtime. Ask only about a specific responsibility that may need to merge, split, defer, or change hands. If the split fails, identify the exact candidate and missing outcome or contract; never replace a concrete boundary defect with architecture trade-off prose.
   - Product-visible titles, summaries, owned capabilities, outcomes, handoffs, recommendations, and questions must use business objects and domain actions. Generic implementation components such as API, service, engine, adapter, database, queue, UI, or BI are not business capabilities and must be removed from visible copy. A candidate-project title whose distinguishing noun is only a generic container or implementation label, including center/中心, hub/枢纽, platform/平台, engine/引擎, service/服务, system/系统, module/模块, workbench/工作台, network/网络, API/接口, adapter/适配器, database/数据库, queue/队列, UI/界面, or BI/报表, is a warning signal, not a boundary decision. Evaluate the candidate from its owned state, independent outcome, capability allocation, and handoff contract; reject or regroup the boundary when those fail, and otherwise rename only the user-visible candidate label. Prefixing a domain word does not cure a missing boundary. This warning does not alter a formal product root or a formally named external system; those may retain their source names, but an external system may appear only as a business dependency or handoff endpoint, not as the reason for a project boundary.
   - Name the Overview root after the real product portfolio, business system, or controlled business loop. Each business `branch` map link represents one candidate subproject; its branch map must show the independent goal, owned capabilities, observable outcomes, boundary, and business handoffs. Candidate count follows evidence and business boundaries. When one Overview cannot show all candidates within the density budget, introduce additional value-stream maps and place candidate projects below them; never merge projects, abbreviate away business meaning, or create a miscellaneous bucket to fit the budget. When the total capability atom count exceeds the Overview density budget, do not merge atoms. Instead, introduce value-stream grouping maps (`map_kind: "value_stream"`) between the Overview and the branch maps. The Overview links to value-stream maps; each value-stream map links to the individual candidate branch maps. This preserves full atom count while keeping each individual map within density limits. Value-stream nodes in the Overview are not Level 1 project boundary candidates and must not carry `capability_atom_refs`.
   - Put permissions, business approvals, audit, irreversible-operation controls, emergency stops, external dependencies, and human fallback rules that affect multiple candidate projects in the `global_constraints` map. A rule affecting only one candidate stays on that branch. Constitution clauses remain outside these business maps in `constitution_snapshot`.
   - **Stage C - run the semantic quality gate**: before writing `outline-discovery-data.json`, verify capability allocation, candidate independence, responsibility purity, loose coupling through explicit business contracts, full business-lifecycle coverage, preservation of source terminology, the correct product subject, decision quality, implementation-language removal, and private-reasoning non-disclosure. Reject a map when an atom has no disposition or multiple owners; one Level 1 chain contains multiple independently accepted outcomes, trigger kinds, or owned business states; two chains claim the same primary outcome; a candidate lacks owned business state or an independently testable result; a handoff names no exchanged business fact/command/event/decision; two projects depend on each other's private internals; or an unresolved boundary is hidden. Also reject maps that replace domain language with abstractions or implementation components, describe SP/document workflow instead of the target product, expose Stage A/C work, or ask mechanical keep/remove questions instead of real boundary decisions.
   - If Stage C fails, re-extract or regroup once. If it still fails, remain in `explore` and expose the exact missing evidence, outcome, ownership boundary, or handoff as a user decision. Never fill a title, summary, candidate, recommendation, or question with process commentary or generic prose such as “current understanding”, “global cognition”, “project overview”, “review the direction before details”, “keep the root stable”, “handle business objects”, “form a business loop”, or “ensure system stability”. Visible copy must name the domain object, action or control, and observable result. Prompt instructions, renderer behavior, maturity names, and SP routing are not product content.
   - Run a final visible-copy sanitization pass over map titles, summaries, nodes, questions, candidates, recommendations, and the user-facing response. Every visible business statement must include a source-backed domain object, a domain action or control, and a resulting state, observable outcome, or named handoff; a title may use a concise object-action phrase when its linked node supplies the result. Reject empty verbs or nouns such as manage, handle, support, organize, build, optimize, coordinate, ensure, capability, solution, or stability when they are not qualified by those domain facts. Apply a cross-domain substitution test: if a sentence could move unchanged between two unrelated domains after only replacing the product name, it is generic boilerplate and must be replaced with source-backed terminology or an explicit evidence gap. Specifically test each candidate title, atom label, and summary by mentally replacing the product name with an unrelated domain (e.g., replace "交易系统" with "电商系统" or "内容管理系统"); if the text still makes sense without any other changes, it fails the test and must be rewritten with domain-specific terminology. Remove any mention of Stage A/B/C, coverage tables, quality checks, self-review, permission to create files, feature-directory creation, SP routing, renderer behavior, or how the answer was generated; do not announce that sanitization occurred. A formally named external product may remain only as a dependency or handoff endpoint. Re-run Stage C after sanitization and do not emit the response if the visible text still violates this rule.
   - **Level 2 child-framing compiler**: when Level 1 retained one product, read only the confirmed parent PRD, accepted intent-ledger events that target the confirmed retained-product scope, inherited global constraints, and their source authorities; do not reinterpret Level 1 decomposition history as child-scope facts. When Level 1 decomposed the parent, read only the selected confirmed `Subproject Handoff`, inherited global constraints, sources referenced by that handoff, and accepted child-local deltas. Build branch maps around concrete business chains rather than rerunning candidate-project grouping. Each first-slice chain must identify the actor or external trigger, input, business object and starting state, operation or control, resulting state or observable outcome, exception/failure path, source refs, and named upstream/downstream handoff. Apply the cross-domain substitution test to every chain: reject generic verbs or nouns such as handle or manage unless source-backed domain facts qualify them. An `[src:ai-proposed]` chain may remain visible as a candidate but cannot satisfy the Level 2 pass gate. If a local detail is missing, ask on that product branch. If evidence contradicts ownership, keep unaffected siblings stable, mark only the affected named boundary or pair of boundaries unresolved, and route only those boundaries to Level 1 instead of reopening every candidate or silently merging children in Level 2.
   - Read `.specify/memory/constitution.md` separately and emit `constitution_snapshot` with `display_mode: read_only` and `application_scope: governance_only`. Include only clauses explicitly applicable to the current feature, with their source anchors and affected business node IDs when known. If the file or applicable clauses are missing, display that state instead of inventing rules.
   - `/sp.prd` must not use Constitution content as business evidence, must not create discovery questions from Constitution clauses, must not use clauses as recommendation sources, must not write Constitution clauses into the PRD, and must not target Constitution clauses with discovery deltas. Removing `constitution_snapshot` must not change `business_context` or the business capability maps.
   - For `explore` and `frame`, generate `specs/<feature>/prd/review/outline-discovery-data.json` with `interaction_mode: discovery`. Present the current product understanding as XMind-style maps, not as a long outline or a flat question list.
   - Always provide exactly one `overview` map, at least one business `branch` map, and exactly one `global_constraints` map. The overview shows the project-wide structure and uses `map_link` nodes to enter each child map. Split additional business domains into separate branch maps when one map cannot stay readable.
   - Give every map and outline node a stable `map_id` or `node_id`; preserve an ID across refreshes while the same semantic map or node still exists. Each map has one root, every non-root node has a parent in the same map, and every child map is linked exactly once from its parent map.
   - Keep information density moderate and distributed across layers. Emit the fixed `density_budget`: `max_visible_nodes_per_map: 18`, `max_depth: 3`, `max_children_per_node: 4`, `layer_balance_min_nodes: 8`, and `max_layer_share: 0.6`. When a map has 8 or more nodes, no single layer may contain more than 60% of them. If any limit would be exceeded, rebalance or split the content into another business map instead of compressing one layer. Density is a presentation constraint: add overview, value-stream, or continuation maps as needed, but do not reduce the candidate count or merge capability atoms to make a map fit. **Density hard rule**: density_budget is a presentation constraint that applies only during map compilation (Stage B onward). It must not influence source capability extraction or atom generation (Stage A). If density limits would be exceeded, add value-stream grouping maps between Overview and branch maps; never reduce candidate count, merge capability atoms, or summarize source capabilities to fit a map. If the output says candidate count was reduced, merged, grouped, or limited for readability, density, graph clarity, or map size, that output is invalid and Stage A must be re-run. Do not write phrases such as "为满足密度只提出三个候选" or "当前只提出三个候选项目边界" anywhere in the artifact.
   - Bind every discovery question to one concrete `outline_node_id`. The selected node is the unit of discussion: its 2-4 business `candidates`, single recommendation with a reason, none of the above path, and free-form input must resolve or extend that branch. For a candidate subproject, meaningful choices include keeping it independent, merging it into a named neighbor with a revised responsibility, splitting a named responsibility further, deferring it, or excluding it; do not generate options merely to reach a count. At Level 1 every option must include exactly one `business_chain_ref` and exactly one `capability_atom_ref`; that atom must be the atom owned by the selected candidate project's Overview `map_link`. A recommendation without this business evidence is invalid. Do not place branch-specific choices in an unrelated global list, and do not reuse formal confirmation `options` or their routing semantics.
   - Put policy, compliance, audit, permission, security, and other cross-cutting rules that affect multiple branches in the `global_constraints` map. Each such constraint must list the affected business `node_id` values so the interface can show its project-wide impact. A rule that only affects one branch stays on that branch.
   - Level 1 and Level 2 maps expose the decisions that need deep user participation. Level 3 may organize confirmed material and check product-structure completeness, but it must not infer from the Constitution, invent business facts, or hide unresolved Level 1/2 choices inside generated detail. The Constitution snapshot stays read-only and display-only at every PRD maturity level.
   - Whenever `outline-discovery-data.json` is created or refreshed, update the matching entry in `specs/review-index.json` with `has_outline_discovery: true`. Preserve its `order`, title, and all other review flags. Set the flag to false only when the artifact is intentionally removed or invalidated; do not infer it from Outline confirmation readiness.
   - Discovery input must use an explicit operation: `confirm_candidate`, `add`, `replace`, `exclude`, or `context_note`. The browser downloads `outline-discovery-response-*.json`; it does not write repository files.
   - A discovery response must never advance the Outline to `AWAITING_OUTLINE_CONFIRMATION` or `READY_FOR_SPECIFY`. Browser state, localStorage, preview completion, and discovery download are non-authoritative and must not authorize `/sp.specify`.
   - When the user explicitly supplies a discovery response file to `/sp.prd`, validate its format, feature, response identity, source discovery-data identity, maturity, candidate IDs, target IDs/kinds, operation/value combinations, and unique `delta_id` values. If the schema version is unsupported, do not guess or silently upcast it, and do not downgrade it to an incompatible earlier contract. Fail closed on unknown, repeated, mismatched, or cross-feature data.
   - Append valid events to `specs/<feature>/prd/review/outline-intent-ledger.json`. The ledger is append-only: never mutate an accepted event. A replacement, exclusion, correction, or reversal is a new delta whose `supersedes_delta_id` must reference an earlier accepted event that is already consumed by the current formal PRD, not a ledger-only pending event; the superseded event must remain auditable in the append-only ledger. Reject missing or duplicate formal PRD anchors. Reject forward references and cycles.
   - Regenerate `prd.md` and `spec-outline.md` into temporary outputs before replacing the current files. New user text is `[src:user]`; accepted AI candidates are `[src:user-confirmed]`; unaccepted candidates remain `[src:ai-proposed]`. Every consumed delta must appear in its intended section with a stable `<!-- intent-delta:<id> -->` anchor.
   - Deterministically verify delta IDs, source tags, target sections, and exclusion/replacement references before replacing either document. If the validator or helper is missing, crashes, or returns an invalid result, fail closed. If any consumed delta is missing or misplaced, keep the last valid PRD/Outline and retain the ledger event as pending rather than asking the user to enter it again.
   - Mark existing PRD entries that may be replaced or excluded with stable `<!-- intent-target:<id> -->` anchors. In each regenerated delta block, add `<!-- intent-ref:<delta-id>:<target-or-candidate-id> -->` for `replace` and `exclude`, so the helper can verify the exact referenced entry without interpreting prose.
   - After producing `specs/<feature>/prd.md.tmp` and `specs/<feature>/spec-outline.md.tmp`, run `node .specify/review/scripts/apply-outline-discovery.mjs --response <response-package> --prd-temp specs/<feature>/prd.md.tmp --outline-temp specs/<feature>/spec-outline.md.tmp`. The helper appends new ledger events before validating temporary documents; a validation failure leaves the formal documents unchanged and keeps matching events pending so the same response can be retried. A delta becomes consumed only when its `intent-delta` anchor is present in the formal PRD. The helper serializes each feature with `specs/<feature>/prd/review/.outline-discovery-writeback.lock`: if an active process owns the lock, stop and retry after it finishes. Recover a dead owner's stale lock only after acquiring the exclusive `.outline-discovery-writeback.recovery.lock` claim and rechecking that the main lock still has the observed identity. Both locks carry unique ownership IDs and cleanup must preserve any lock whose ownership has changed. If a dead process left both locks, fail closed and preserve them until an operator verifies that no writeback is running and removes only the recovery claim; an orphaned recovery claim with no old main lock is removed only after a fresh main lock is acquired.
   - If temporary document validation fails on two consecutive regeneration attempts with no new evidence, stop regenerating. Set the blocking Outline status to `NEEDS_DECISION`, retain the failed deltas and diagnostics, and offer a correction or superseding discovery event so the user can resolve the conflict without rewriting ledger history. When a valid correction, reversal, or other new evidence is accepted, reset the consecutive-failure count before the next regeneration attempt.
   - Discovery only collects decomposition intent. After a validated response confirms the project boundaries, record a `Project Decomposition` section in the parent PRD and generate one `Subproject Handoff` for each confirmed independent child. Each handoff must include a stable ID, single business goal, target users or roles, owned capabilities and business objects, scope and non-goals, upstream inputs, downstream outputs, inherited global business gates, source references, and unresolved questions.
   - Level 1 must not create child feature directories, choose child delivery order, or authorize specification. Once decomposition is confirmed, the parent product must not continue to `/sp.specify` as one parent product. Each confirmed child enters its own feature directory and its own `/sp.prd` and Outline confirmation before `/sp.specify`. If the user confirms retaining one project, record that decision and its independence rationale instead of fabricating child handoffs.
   - Candidate-boundary questions at `explore` or `frame` belong in `outline-discovery-data.json` and the graphical Discovery response. Do not route them to `/sp.clarify` merely because the split is unconfirmed, high-impact, or marked `SPLIT_REQUIRED`/`NEEDS_DECISION`. After creating or refreshing Discovery, direct the user to review that artifact; use `NEXT_COMMAND_EXEC: None` until the downloaded response exists, then consume that response in the next `/sp.prd` run. Reserve `/sp.clarify` for a focused decision that cannot be represented by the existing Level 1/2 node-bound Discovery contract.
   - Keep discovery and confirmation contracts separate. `outline-discovery-data.json`, `outline-discovery-response-*.json`, and `outline-intent-ledger.json` must not be consumed as `outline-review-data.json` or a confirmation package, and the discovery consumer must not accept formal confirmation data.
   - Producing Level 3 `outline-review-data.json` from the validated ledger and current PRD/Outline is a model-owned compilation step inside `/sp.prd`, not cross-consumption by the confirmation package parser. The compiler reads accepted ledger state and emits a new formal review artifact; confirmation consumers continue to reject discovery packages.
   - Include only the minimal structure needed for `/sp.specify`: feature name, PRD source, `Source Authority Summary`, strategic goal, target users/roles, problem domains, capability slices, scope/non-goals, core scenarios, acceptance seed groups, risk/open-item summary, and recommended first slice.
   - `Source Authority Summary` must list stable sources, candidate-only sources, archived or missing sources, source rebase decisions, and what `/sp.specify` may safely consume. Keep it lightweight; do not copy the full PRD or build a heavy source map.
   - Mark every section with source status: `[src:user]`, `[src:doc]`, `[src:user-confirmed]`, `[src:ai-proposed]`, or unresolved.
   - If the PRD has a clear strategic goal, users, scope, capability map, and source authority, automatically create or refresh `specs/<feature>/spec-outline.md`, but set the current `Outline Decision` to `AWAITING_OUTLINE_CONFIRMATION` until the graphical review is freshly confirmed.
   - If the PRD still has key `[src:ai-proposed]`, `[uncertain:*]`, scope conflict, missing source authority, or unclear feature boundary, do not create a stable outline. Add an `Outline Decision` section at the end of `prd.md` that explains the blocker and names exactly one route. Use Level 1/2 graphical Discovery with `NEXT_COMMAND_EXEC: None` for any candidate project boundary, ownership, merge, split, defer, or exclusion choice that the node-bound contract can express. Otherwise choose another `/sp.prd` pass, source recovery, feature split execution after boundary confirmation, or `/sp.clarify` only for a focused non-boundary decision that Discovery cannot express. If the feature directory is clear, also create or refresh a blocking `spec-outline.md` with the same `Outline Decision` so `/sp.specify`, mechanical checks, and later agents read the current blocker from one predictable entry point.
   - If information is insufficient but the feature directory is clear, you may create a blocking `spec-outline.md`; its status must be only `NEEDS_PRD`, `NEEDS_CLARIFY`, `NEEDS_SOURCE`, `SPLIT_REQUIRED`, `NEEDS_DECISION`, or `BLOCKED`, never `READY_FOR_SPECIFY`.
   - Set one readiness status:
     - `AWAITING_OUTLINE_CONFIRMATION`: enough confirmed or source-backed intent exists, but the current outline still needs graphical human confirmation inside `/sp.prd`.
     - `READY_FOR_SPECIFY`: the semantic readiness checks pass and a fresh, identity-bound `outline-confirmation.md` authorizes the current outline.
     - `NEEDS_PRD`: more human product intent is needed before a useful outline can exist.
     - `NEEDS_CLARIFY`: a focused human decision blocks stable specification.
     - `NEEDS_SOURCE`: required source authority is missing or stale.
     - `SPLIT_REQUIRED`: the PRD contains multiple independent feature directions that should be separated before specification.
     - `NEEDS_DECISION`: a human product, risk, source-rebase, split, or acceptance choice blocks stable specification.
     - `BLOCKED`: safe automatic progress is not possible.
   - Do not use `[src:ai-proposed]` as the decisive reason for `READY_FOR_SPECIFY`; unresolved high-impact source, scope, risk, or acceptance gaps must route to a non-ready status.
   - `/sp.outline` or PRD-embedded outline logic must not replace `/sp.specify`; it only decides whether `/sp.specify` may start.
   - Status transitions must be evidence-based:
     - `NEEDS_PRD` -> `READY_FOR_SPECIFY` only when the PRD now contains enough confirmed strategic goal, user, scope, scenario, and acceptance intent.
     - `NEEDS_CLARIFY` -> `READY_FOR_SPECIFY` only when the blocking human decision is recorded in `prd.md` or `clarifications.md`.
     - `NEEDS_SOURCE` -> `READY_FOR_SPECIFY` only when the PRD cites the recovered source or records an explicit user-approved rebase away from the missing source.
     - `SPLIT_REQUIRED` -> `READY_FOR_SPECIFY` only after the user confirms the current feature boundary is single-purpose, or after the split creates separate feature directories.
     - `NEEDS_DECISION` -> `READY_FOR_SPECIFY` only after the selected human decision is written back to `prd.md`, `clarifications.md`, or `spec-outline.md`.
     - `BLOCKED` -> any other status only when the `Handoff To Specify` explains the blocker resolution and remaining risks.
   - Maintain a lightweight `Status History` in `spec-outline.md` only for status changes, blocker resolution, source rebase, feature split, or owner review. Do not copy the full reasoning transcript into the outline.
   - Each `Status History` entry must include `timestamp/run-id`, `status`, `blocker-signature`, `next-route`, and `evidence-summary`.
   - Use a stable short `blocker-signature` such as `missing-source:legacy-prd` or `scope-split:admin-vs-tenant` so later runs can detect the same unresolved blocker without rereading every source.
   - If the same `blocker-signature`, same outline status, and same `next-route` appear in two consecutive refreshes without new evidence, stop rewriting the same content. Escalate to `BLOCKED` or `NEEDS_DECISION`, output a plain-language decision package with background, impact, 2-4 options, recommendation, and next command, and classify the blocker before choosing its route. A Level 1/2 project-boundary or capability-ownership blocker stays in graphical Discovery with `NEXT_COMMAND_EXEC: None`; otherwise route to `/sp.clarify` only for a focused non-boundary decision the Discovery contract cannot express, or route to source recovery, owner decision, or feature split after its boundary is confirmed.
   - When escalating a repeated blocker, write the decision package back into the current feature docs so later runs can reuse one stable entry point. The stable writeback target is `specs/<feature>/memory/open-items.md`; if `prd.md` or `spec-outline.md` already carries the blocker decision, keep the same `blocker-signature` and route there instead of inventing a new one.
   - New evidence means only user confirmation, recovered source, explicit rebase decision, feature split result, risk/compliance/owner decision, or document evidence that can change readiness. Rewording, template completion, and model re-summarization do not count.
   - For high-risk, 0-to-1 product direction, scope split, source rebase, governance candidate, real money/data, compliance, or irreversible-impact cases, `READY_FOR_SPECIFY` still requires an explicit `Owner Review Required` prompt in `Outline Decision` or `Handoff To Specify` before suggesting `/sp.specify`.
   - The `Owner Review Required` block must include `Risk Type`, `Review Focus`, `Impact If Approved`, `Impact If Rejected`, `Recommended Choice`, and `Confirm To Proceed`.
7. Generate and consume the graphical Outline confirmation.
   - Before generation, verify that the installed discovery schemas, renderer modules, or launcher support are present. If installed discovery schemas, renderer modules, or launcher support are missing, explain that already initialized projects do not receive new template assets automatically and tell the user to run `specify init --force` from the target project before retrying.
   - Generate `specs/<feature>/prd/review/outline-review-data.json` from the current `spec-outline.md` using the installed Outline schema. Keep the three bounded views focused on product intent, scope/coverage, and readiness; do not introduce Flow, UI, API, database, or implementation design.
   - Give every review generation a stable Review Data ID. After writing the complete review JSON, compute it with `.specify/review/scripts/review-data-id.mjs`; never invent or preserve the ID after changing any review field. Compute the canonical Outline digest separately with `.specify/review/scripts/outline-digest.mjs`, passing the exact source authority IDs, and record an `Outline Confirmation` block in `spec-outline.md` with `Contract Version`, `Review Data`, `Review Data ID`, `Outline Digest`, `Source Authority IDs`, and `Confirmation`.
   - Validate the data, then launch the fixed renderer with `node .specify/review/scripts/serve-review.mjs --outline <feature>` and relay its verified loopback URL. If a browser cannot be launched, provide the URL and keep the status pending.
   - Browser state, localStorage, preview completion, or download alone never authorizes `/sp.specify`. The user or agent must consume the downloaded confirmation package, recompute the Review Data ID from the current complete `outline-review-data.json` with `.specify/review/scripts/review-data-id.mjs`, validate that the recomputed value matches both `spec-outline.md` and the package, then validate the Outline Digest and Source Authority IDs and confirm that needs-decision, unresolved, draft-excluded, and revision-request lists are all empty. If the helper or current JSON is unavailable or invalid, fail closed and keep the outline pending.
   - Write the verified package to the git-trackable `specs/<feature>/prd/review/outline-confirmation.md`. Only then change the current decision from `AWAITING_OUTLINE_CONFIRMATION` to `READY_FOR_SPECIFY`, set the next route to `/sp.specify`, and append the transition to `Status History`.
   - Any change to the digest-bearing outline content or Source Authority IDs invalidates the old confirmation. Regenerate the review, return to `AWAITING_OUTLINE_CONFIRMATION`, and require fresh confirmation rather than editing identity fields to match.
8. Handle constitution-related findings without mixing command ownership.
   - Governance-like material belongs in `.specify/memory/constitution.md` as a `Constitution Candidate` when it may apply across features or affects safety, compliance, irreversible operations, real money, real data, long-term engineering discipline, verification gates, or human decision rules.
   - `/sp.prd` may only append or update the `Constitution Candidates` section.
   - It must not rewrite formal constitution rules, stage boundaries, validation discipline, or project governance text.
   - Candidate status values are fixed: `proposed`, `under-review`, `promoted`, `rejected`, `merged`.
   - Candidates do not override formal constitution rules.
   - Single-feature local risks, todos, and requirement tradeoffs belong in `prd.md`, feature memory, or `open-items.md`, not the constitution candidate section.
9. Refresh lightweight memory only when it prevents later rediscovery.
   - Create or update `specs/<feature>/memory/open-items.md` for unresolved high-impact questions, risks, blockers, or decisions.
   - Do not duplicate the full PRD into memory.
   - Record only routing summaries, open decisions, PRD path, outline path, outline readiness status, and stable handoff pointers.
10. Validate before finishing.
   - Confirm the PRD remains upstream draft material.
   - Confirm all AI-proposed material is labeled.
   - Confirm confirmed user choices are distinguishable from candidates.
   - Confirm no implementation details were introduced.
   - Confirm unresolved product boundary or scope fork questions were not turned into guessed features.
   - Confirm `Outline Decision` exists in `prd.md` when a stable outline cannot be produced.
   - Confirm `spec-outline.md` exists when enough information is available, or when the feature directory is clear enough to hold a blocking outline.
   - Confirm `Outline Decision` records readiness and route when the outline is not `READY_FOR_SPECIFY`.
   - Confirm any blocking `spec-outline.md` repeats the same `Outline Decision` as `prd.md` and uses only `NEEDS_PRD`, `NEEDS_CLARIFY`, `NEEDS_SOURCE`, `SPLIT_REQUIRED`, `NEEDS_DECISION`, or `BLOCKED`.
   - Confirm `Handoff To Specify` summarizes what `/sp.specify` should stabilize when ready; when not ready, it must point to the same next route as `Outline Decision` and must not create a second conflicting decision.
   - Confirm repeated blockers are compared by `blocker-signature`, status, and `next-route`, not by rewritten prose.
   - Confirm owner review prompts use the fixed `Owner Review Required` fields when risk or governance conditions apply.
   - Confirm semantically ready outlines remain `AWAITING_OUTLINE_CONFIRMATION` until the current confirmation package is validated and written to `outline-confirmation.md`.
   - Confirm the Review Data ID is recomputed from the current complete JSON and that it, `Outline Digest`, and `Source Authority IDs` agree across `spec-outline.md`, `outline-review-data.json`, and `outline-confirmation.md` before setting `READY_FOR_SPECIFY`.

## Output

- Create or update `specs/<feature>/prd.md`
- Create or update `specs/<feature>/spec-outline.md` with readiness status, or report why the outline cannot safely be created
- Create or update `specs/<feature>/prd/review/outline-review-data.json` and, only after verified package consumption, `specs/<feature>/prd/review/outline-confirmation.md`
- Optionally append or update `.specify/memory/constitution.md` `Constitution Candidates`
- Optionally update `specs/<feature>/memory/open-items.md` for high-impact unresolved items
- Optionally update `specs/<feature>/memory/index.md` only for routing to the PRD draft

## Key Rules

- `prd.md` is only an upstream draft and not a stable fact source.
- Do not skip `/sp.prd` for new feature work. Keep it lean for clear requirements rather than bypassing it.
- Do not let `spec-outline.md` replace `/sp.specify`, `/sp.flow`, `/sp.ui`, `/sp.plan`, or `/sp.tasks`.
- Do not mark a blocking `spec-outline.md` as `READY_FOR_SPECIFY`.
- Do not treat browser state, localStorage, preview completion, or a downloaded file by itself as authorization.
- Do not omit `Outline Decision` when key PRD uncertainty blocks stable outline readiness.
- Do not leave a clear feature directory without a blocking `spec-outline.md` when downstream commands need a predictable blocker entry point.
- Do not loop on the same unchanged outline blocker; escalate to `BLOCKED` or `NEEDS_DECISION`.
- Do not move high-risk or source-rebase outlines downstream without an explicit owner review prompt.
- Do not let PRD detail grow into implementation design.
- Do not promote `[src:ai-proposed]` content without user confirmation.
- Do not treat candidate subprojects as approved boundaries before a validated user response records `Project Decomposition`.
- Do not send a confirmed decomposed parent product to `/sp.specify`; use each `Subproject Handoff` to start the child-level PRD and Outline process.
- Do not bypass `/sp.specify`. Stable requirements still belong in `spec.md`.
- Do not rewrite formal constitution content from `/sp.prd`; use `Constitution Candidates` only.
- If PRD discovery finds a new independent business goal, role, workflow, acceptance boundary, release scope, or scope fork, do not route directly to `/sp.specify`. At Level 1/2, encode product-boundary choices in graphical Discovery and wait for its response; otherwise keep or set `spec-outline.md` to `SPLIT_REQUIRED`, `NEEDS_CLARIFY`, `NEEDS_SOURCE`, `NEEDS_DECISION`, or `BLOCKED`, then route to another `/sp.prd` pass, source recovery, owner decision, feature split confirmation, or `/sp.clarify` only when the decision cannot be represented by Discovery.
- If PRD discovery finds unclear product intent, risk acceptance, governance tradeoff, or another high-impact human choice, first classify whether it changes a Level 1/2 project boundary or capability ownership. If it does, encode the choice in graphical Discovery and keep `NEXT_COMMAND_EXEC: None`; otherwise route the focused non-boundary choice to `/sp.clarify` with a plain-language decision package when the node-bound Discovery contract cannot express it.

## Next

End every run with a concrete closeout recommendation. Do not only list readiness branches. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.

Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, PRD evidence, `spec-outline.md` readiness, and unresolved candidate requirements. If source authority, split, or human choice evidence is missing, classify missing split or human-choice evidence before recommending a route: keep Level 1/2 boundary and ownership choices in graphical Discovery with `NEXT_COMMAND_EXEC: None`; use `/sp.clarify` only for focused non-boundary decisions Discovery cannot express; otherwise recommend `/sp.prd`, source recovery, or `/sp.constitution` instead of `/sp.specify`.

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

- If `spec-outline.md` is `READY_FOR_SPECIFY`, recommend `/sp.specify <feature>` with a prompt naming the PRD evidence and boundary checks to preserve.
- If readiness is `NEEDS_PRD`, recommend another `/sp.prd <feature>` pass with the missing interview/source areas.
- If readiness is `NEEDS_SOURCE`, recommend source recovery or explicit rebase decision before `/sp.specify`.
- If readiness is `SPLIT_REQUIRED` or candidate project boundaries remain unresolved at Level 1/2, generate or refresh graphical Discovery and recommend reviewing it with `NEXT_COMMAND_EXEC: None`; do not recommend `/sp.clarify` for the same boundary choice.
- If governance candidates block feature specification, recommend `/sp.constitution`.
- If PRD contains `[src:ai-proposed]`, `[uncertain:*]`, or unconfirmed candidate requirements, classify the unresolved item before routing. A Level 1/2 project-boundary or ownership choice stays in graphical Discovery with `NEXT_COMMAND_EXEC: None`. Recommend `/sp.clarify` only for a focused non-boundary decision that the node-bound Discovery contract cannot express; otherwise recommend another `/sp.prd` pass or source recovery.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
