<div align="center">
    <h1>SpecCompass</h1>
    <h3><em>Spec-Driven Development for AI coding agents, with layered planning, memory, and verification.</em></h3>
</div>

SpecCompass is an enhanced fork of [github/spec-kit](https://github.com/github/spec-kit) for **AI-assisted Spec-Driven Development** with coding agents such as Codex, Claude, and Gemini. It keeps the proven Spec Kit installation and integration mechanics, while adding layered planning, project memory, context-window management, traceability, implementation readiness, verification discipline, and safer fallback rules for complex software projects.

The principle is simple: keep the proven upstream Spec Kit "bottle" as intact as possible, including the directory skeleton, template shell, CLI installation flow, integration framework, and script entry points. SP changes the "water" inside that bottle by adding richer content for complex projects and AI-assisted development.

Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

![SpecCompass command responsibility map](./docs/assets/speccompass-command-map-en.svg)

![SpecCompass layered process](./docs/assets/speccompass-layered-flow-en.svg)

## Why This Fork Exists

Upstream Spec Kit has a stable installation and runtime mechanism. In larger AI coding projects, however, plain `spec`, `plan`, and `tasks` can still be too thin when the model must coordinate requirements, architecture, UI, APIs, data, tests, and delivery evidence across many files.

Common problems SP tries to reduce:

- The model loses context, rereads too much, or misses important facts.
- Requirements, UI, workflows, APIs, tables, permissions, and acceptance checks drift apart.
- Risks, blockers, and pending decisions do not have a stable place to live.
- Stale documents can mislead the model into continuing down the wrong path.
- Large features are not split early enough, so the agent's attention window becomes overloaded.
- Failed checks, unclear requirements, or conflicting decisions can push an agent into repeated guessing instead of a controlled recovery route.

SP is packaged as a standalone enhanced edition. Users install and use this fork directly; no separate upstream alignment step is required.

It is designed for developers who want a more controlled AI software engineering workflow: use specs to define intent, use plans and tasks to constrain implementation, use memory and trace files to reduce repeated context loading, and use analyze/gate commands to catch drift before code changes continue.

SP is **documentation-first, not documentation-only**. The document chain is used to control the code stage. Code work starts only after the plan has an explicit `Implementation Readiness` source, tasks declare executable `Mode: impl` packets, and implementation has bounded write areas and verification commands.

In practice, `Mode: doc` tasks are used for specification, flow, UI, planning, memory, trace, analysis, and gate work. `Mode: impl` tasks appear only when a workset is ready or conditionally ready for code work. The task packet defines the `Allowed Write Set` and `Required Checks`; `/sp.implement` consumes that packet instead of guessing what files it may change.

## Methodology

SP treats AI development as an engineering control loop, not a one-shot prompt. The goal is to give the agent enough context to work accurately, but not so much that the context window becomes noisy or expensive.

The main methodology is documented in [SP Project Methodology](./docs/reference/sp-project-methodology.md). Mandatory 0-to-1 product intake, PRD handling, blocker closeout, code continuation, and multi-agent rules are consolidated there. In short:

- Start from the trunk: clarify goals, scope, success criteria, constraints, and the active feature before expanding into implementation details.
- Start new feature work with `/sp.prd`. It can be short for clear requests, but it must capture upstream intent, source tags, and PRD-to-spec outline readiness before `/sp.specify`; `prd.md` is not a stable fact source.
- Resume existing work with `/sp.route` first. It emits `speckit.route.v1` JSON and only recommends the next command by default; use `/sp.route y` when you want the agent to continue only if `continueAllowed` is true.
- Keep context small but sufficient: route through project memory, feature memory, worksets, trace files, and directly related source docs before reading the whole repository.
- Use stable anchors and searchable IDs for features, worksets, UI, APIs, risks, tests, and acceptance paths, so later agents can find related content without recomputing the whole project.
- Continue existing code from memory first: read feature/workset memory, trace/open-items, and the task `Read Set` before expanding to source files.
- Track unresolved work explicitly in `memory/open-items.md`, including risks, blockers, decisions, owners, close conditions, and revisit points.
- Use blocker closeout when clearing blockers: `open-items.md` remains the source of truth, while `/sp.analyze` and `/sp.gate` require item-by-item evidence instead of accepting progress summaries.
- Make readiness checkable with lightweight evidence signatures: record source files, anchors, open-item state, visual/human review status, and current checks; human-confirmed facts need a traceable decision record, not model prose.
- Require current completion evidence before claiming work is done: name the task or workset, list checks actually run, summarize results, call out unchecked scope, and route remaining work explicitly.
- Shape code tasks around evidence: reuse task notes, open items, fallback logs, and trace/memory before creating new artifacts; for acceptance-critical behavior, identify the proving test or manual verification path before implementation.
- Debug by evidence, not repetition: reproduce or locate the failure, state a falsifiable hypothesis, apply the smallest root-cause fix, and route upward after repeated attempts without new evidence.
- Treat review feedback as a routed decision: classify material items as `valid`, `invalid`, `needs-info`, or `accepted-risk` before closing analyze/gate work.
- Use lightweight impact-radius checks before changing APIs, permissions, data, event flows, UI contracts, or core tests.
- Use reverse-trace checks before delete, move, rename, public behavior, schema, permission, route, event, or acceptance changes, so normal code is not damaged while fixing a local problem.
- Treat `plan.md` `Implementation Readiness` as the single source of truth for code-stage entry. Other commands may consume, diagnose, or gate it, but should not invent a second readiness fact.
- Separate documentation tasks from implementation tasks with `Mode: doc` and `Mode: impl`; `/sp.implement` may write code only for authorized `Mode: impl` tasks.
- Review implementation deltas first: `Delta Summary`, current diff, task packet, trace/open-items, and only then necessary source code.
- Let `/sp.analyze` find drift and `/sp.gate` decide phase readiness; do not let the model mark risky or unclear states as PASS without evidence.
- Route failures upward instead of guessing: clarify requirements, repair specs, adjust plans, split oversized worksets, or ask the user for a decision with clear options.
- Borrow CodeGraph-style ideas such as stable nodes, explicit relationships, and impact queries as lightweight methodology, without making a heavy code graph runtime a default dependency.

## How The Mechanism Works

SpecCompass keeps the workflow readable for humans and predictable for agents:

- New feature work starts with `/sp.prd`. Clear requirements use a lean PRD; unclear 0-to-1 ideas use a fuller interview-style PRD. `/sp.specify` consumes PRD and outline readiness instead of bypassing them.
- Existing work should resume through `/sp.route`. The route script stays pure and emits `speckit.route.v1`; the command template may dispatch the next `/sp.*` command only from explicit `/sp.route y`, only when `continueAllowed` is true, and never through `REPEATED_FALLBACK`, human decisions, or unknown blockers recorded through `fallback-log.md`.
- Stable requirements enter through `/sp.specify`. New or changed requirements are checked for conflicts instead of being silently merged into stale specs.
- When intent is unclear, `/sp.clarify` asks focused questions with plain-language options and records the decision so later agents do not need to rediscover it.
- `/sp.plan` defines the technical route, worksets, impact radius, agent boundaries, source layout, runtime commands, code/test mapping, and `Implementation Readiness` before code changes begin.
- `/sp.flow` is the backbone. Business flows connect process nodes to UI screens, events, API calls, data objects, tests, and code anchors. Flow design prioritizes business fit first, then the simplest sufficient flow, single-purpose rules, loose coupling, and split points for actors, states, permissions, exceptions, and verification.
- `/sp.flow` now uses structured review data and the fixed SpecCompass review renderer for confirmation. When review is needed, the command writes `specs/<feature>/flows/review/flow-review-data.json`, shows short business/architecture flow diagrams, node-level decision points, recommended options, and a right-side feedback/confirmation rail. Browser choices are drafts until the confirmation summary is written to `flow-confirmation.md`, which is the downstream authorization evidence.
- `/sp.ui` runs after confirmed flow: it collects the elements needed by each screen and turns process-bound elements into a coherent interface. UI planning stays lightweight across three dimensions: visual style, layout/display efficiency, and workflow ergonomics.
- `/sp.ui` now uses independent UI review data instead of reusing flow nodes. When review is needed, the command writes `specs/<feature>/ui/review/ui-review-data.json` for screens, regions, components, states, and visible decisions, then renders it through the same SpecCompass confirmation surface with Huashu design rules and the right-side confirmation rail. UI choices become stable implementation input only after they are written to `ui-confirmation.md`.
- `/sp.tasks` keeps implementation small. It consumes `Implementation Readiness` and creates `Mode: doc` or `Mode: impl` task packets with clear scope, expected evidence, `Allowed Write Set`, `Required Checks`, `Read Set`, dependency checks, reverse-trace requirements, expected delta, and proposed shared updates.
- `/sp.implement` writes code only for selected `Mode: impl` tasks. It checks `Allowed Write Set`, required checks, trace anchors, task context, dependency surface, and reverse-trace evidence before risky edits, then records verification evidence and a `Delta Summary`.
- `/sp.analyze` and `/sp.gate` close the loop: they detect drift, broken trace links, stale context, unresolved risks, readiness contradictions, weak task packets, and phase-readiness failures.
- When blockers are being cleared, `/sp.analyze` produces a blocker closeout diagnosis and `/sp.gate` decides whether the remaining state is `PASS`, `CONDITIONAL`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION`.
- Lightweight scripts can check structural evidence such as trace/open-item links, evidence-signature fields, and unsupported human-confirmation markers. They are guardrails, not business proof; analyze/gate still decide semantic readiness from source docs, tests, and decisions.
- For controlled multi-agent work, one coordinator assigns eligible worksets, workers stay inside declared write boundaries, workers submit `Delta Summary` and `Proposed Updates`, failures fall back to single-agent recovery, and analyze/gate reconcile outputs before the project moves on.

The intended result is not heavier ceremony. The intended result is fewer dead ends: when the agent cannot proceed safely, it moves upward to the right phase, explains the situation, and asks for a decision instead of inventing one.

## Why `/sp.implement` Matters

`/sp.implement` is not just a command that writes code. Its value is that it turns code generation into a bounded, auditable engineering step:

- It prevents the agent from treating a broad feature as permission to edit the whole repository. Each implementation run should start from a selected `Mode: impl` task, an `Allowed Write Set`, and required checks.
- It connects code changes back to requirement, flow, UI, API, data, test, and workset anchors, so later requirement changes can find affected files and later code changes can find related product context.
- It reduces accidental deletion, rename, or cross-module edits by requiring impact-radius and reverse-trace checks before high-risk changes.
- It supports safe continuation of existing work: the task packet names the smallest `Read Set`, direct dependencies to check, expected delta, and reverse-trace evidence, so a later model can resume without rereading the whole repository.
- It keeps implementation small enough for the model to stay accurate: one task or task group at a time, with explicit dependencies and verification evidence.
- It records what changed through a `Delta Summary`: expected delta, files changed, anchors affected, dependency checks, reverse-trace result, checks run, proposed updates, and remaining gaps. If implementation cannot proceed safely, it falls back to `/sp.tasks`, `/sp.plan`, `/sp.specify`, or `/sp.clarify` instead of guessing through the problem.

## What SP Adds

- Upstream-style `specify init`, templates, scripts, and agent integrations.
- User-facing core commands use the `sp.*` namespace, for example `/sp.specify`, `/sp.plan`, and `/sp.analyze`.
- `/sp.route` provides a safe resume entry. It reports the next command from explicit project state; `/sp.route y` may continue only when the route JSON allows it. `NEEDS_DECISION`, `HUMAN_DECISION`, `UNKNOWN_BLOCKER`, and `REPEATED_FALLBACK` route to `/sp.clarify` or the owner decision path instead of auto-continuing.
- Codex uses skills as the stable entry point. It installs executable skills in `.agents/skills/sp-*/SKILL.md`; users can invoke them explicitly with `$sp-*` or `/skills`, and Codex may also invoke a matching skill from natural-language requests when the task matches the skill description.
- Claude and markdown-style hosts expose direct slash commands such as `/sp.analyze` through their normal command directories.
- Mandatory PRD intake with `/sp.prd` for new feature work. PRD output stays in `specs/<feature>/prd.md`, uses source tags such as `[src:user]` and `[src:ai-proposed]`, writes PRD-to-spec outline readiness to `specs/<feature>/spec-outline.md`, and hands confirmed intent to `/sp.specify` instead of bypassing it.
- Layered artifacts for flow, UI, delivery, memory, trace, open items, and gates.
- Flow-first relationship management: business process nodes become the preferred link between requirements, UI, actions, API, data, tests, and code.
- Stable coding and anchor rules for features, worksets, UI, APIs, risks, tests, and trace links, so the model can search and update related content without rereading everything.
- Controlled code-stage handoff: `plan.md` owns `Implementation Readiness`; `tasks.md` emits `Mode: doc` or `Mode: impl` task packets; `/sp.implement` executes only authorized implementation tasks.
- Bounded implementation safety: `Allowed Write Set`, `Required Checks`, effective defaults, delete/move/rename scans, and `CODE` / `TEST` trace rules for high-risk boundaries and acceptance-critical tests.
- Code-continuation task packets: `Read Set`, `Dependencies Checked`, `Reverse Trace Checked`, `Expected Delta`, `Delta Summary`, and `Proposed Updates` make resuming, reviewing, and coordinating implementation cheaper and safer.
- Project memory for active context, feature map, hotspots, open items, and trace index, with rules for when to write back and when to avoid repeated checks.
- Context-budget rules that favor current worksets, direct dependencies, related tests, and trace links before broad repository reads.
- Impact-radius discipline for high-risk changes, including APIs, permissions, data migrations, event flows, UI contracts, and core tests.
- Stronger `/sp.analyze`, `/sp.gate`, and `/sp.implement` rules for evidence checks, risk closure, fallback routing, headless failure reports, and memory updates. `/sp.analyze` uses `PASS`, `FAIL`, `BLOCKED`, or `NEEDS_DECISION`; `/sp.gate` uses `PASS`, `FAIL`, `CONDITIONAL`, `BLOCKED`, or `NEEDS_DECISION`. `CONDITIONAL` is gate-only and means the next stage depends on named conditions that must be closed or explicitly accepted.
- Completion, debugging, and review closeout rules that favor current evidence over model confidence, old check output, progress summaries, or repeated repair attempts.
- Lightweight UI and flow planning rules that improve design quality and business-flow clarity without making Figma, media generation, crawling, or a full design-system workflow mandatory.
- Blocker closeout discipline: blockers and high-risk items are closed one by one as `RESOLVED`, `OPEN`, `DEFERRED_WITH_OWNER`, or `INVALID_OR_STALE`; progress percentages and broad status reports cannot replace close evidence.
- Guardrails for unclear or conflicting requirements: ask for a decision, route back to the right `/sp.*` phase, and avoid guessing through business contradictions.
- Better support for splitting complex domains before the model context becomes too large.
- Controlled multi-agent coordination: use parallel workers only where cost/benefit is clear, write sets are isolated, shared state is serialized, and stale, failed, unverifiable, or out-of-bounds results can fall back to single-agent recovery.

## Install

Install the SP fork:

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/SpecCompass.git
```

Upgrade an existing installation:

```bash
uv tool install specify-cli --force --from git+https://github.com/flyfoxai/SpecCompass.git
```

Verify:

```bash
specify version
specify check
```

## Use With Codex

Create a new project:

```bash
specify init my-project --integration codex
cd my-project
```

Initialize an existing project:

```bash
cd /path/to/your/project
specify init . --integration codex
```

If the current environment does not have the target agent CLI installed, or you only want to install the templates first:

```bash
specify init . --integration codex --ignore-agent-tools
```

For Codex, do not use slash-menu visibility for `/sp.*` as the install success criterion. Current Codex versions use skills as the stable entry point instead of project-local `/sp.*` slash commands.

In Codex, invoke SP skills explicitly by typing `$sp-<command>` or by running `/skills` and choosing `sp-<command>`. Codex may also invoke a matching skill from a natural-language request when the task matches the skill description, but explicit skill invocation is recommended for deterministic SP workflow stages.

Common SP skills:

```text
$sp-route
$sp-specify
$sp-prd
$sp-plan
$sp-tasks
$sp-analyze
$sp-implement
$sp-gate
$sp-ui
```

Installation acceptance checks:

```bash
specify version
specify check
test -d .agents/skills
test -f .agents/skills/sp-prd/SKILL.md
test -f .agents/skills/sp-plan/SKILL.md
test -f .agents/skills/sp-analyze/SKILL.md
```

If an older project already contains `.codex/prompts/sp.*`, `.codex/commands`, `plugins/sp/`, `.agents/plugins/marketplace.json`, or other old Codex prompt/plugin/command residue from an experimental SP install, rerun `specify init . --integration codex` to refresh the integration. Current Codex support keeps the skills and removes obsolete command surfaces.

## Core Commands

| Command | Purpose |
| --- | --- |
| `/sp.constitution` or `$sp-constitution` in Codex | Create or update project principles, engineering constraints, and governance rules |
| `/sp.route` or `$sp-route` in Codex | Inspect current project state and recommend the next safe `/sp.*` command; `/sp.route y` may continue only when `speckit.route.v1` has `continueAllowed: true` |
| `/sp.prd` or `$sp-prd` in Codex | Mandatory upstream PRD intake for new feature work; produces draft intent and outline readiness for `/sp.specify` |
| `/sp.specify` or `$sp-specify` in Codex | Create a feature specification: what to build and why |
| `/sp.clarify` or `$sp-clarify` in Codex | Clarify unclear requirements and record decisions |
| `/sp.plan` or `$sp-plan` in Codex | Create the technical plan, architecture choices, source layout, code/test mapping, and implementation readiness |
| `/sp.flow` or `$sp-flow` in Codex | Create or refresh business/architecture flows, structured `flow-review-data.json`, fixed SpecCompass review pages, recommended node choices, and `flow-confirmation.md` authorization evidence |
| `/sp.ui` or `$sp-ui` in Codex | Create or refresh screen maps, UI review data, Huashu-style previews, component/region decisions, right-rail confirmations, and `ui-confirmation.md` authorization evidence |
| `/sp.tasks` or `$sp-tasks` in Codex | Break the plan into `Mode: doc` or `Mode: impl` task packets with boundaries and checks |
| `/sp.analyze` or `$sp-analyze` in Codex | Check consistency, readiness, task packets, trace, evidence, and drift across the feature |
| `/sp.gate` or `$sp-gate` in Codex | Decide whether the current stage can safely move forward |
| `/sp.implement` or `$sp-implement` in Codex | Execute selected `Mode: impl` tasks within allowed write boundaries and record verification evidence |
| `/sp.bundle` or `$sp-bundle` in Codex | Package the current feature documents for review or delivery |
| `/sp.checklist` or `$sp-checklist` in Codex | Generate quality checklists for the current feature |

## Relationship With Upstream

SP comes from [github/spec-kit](https://github.com/github/spec-kit) and keeps its proven installation and workflow style where practical. For users, this repository is the install target: install SP, initialize a project, then use the host-appropriate SP entry point: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or matching natural-language requests.

## License

This project follows the upstream Spec Kit license. See [LICENSE](./LICENSE).
