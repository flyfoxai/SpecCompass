# OpenSpecs (Speckit Layered): A Layered Documentation Workflow Built on Spec Kit

`sp` is a layered documentation mechanism adapted from the original `Spec Kit` approach.

Its goal is not to let a model jump directly from a raw request to production code. Instead, it first turns a project into a queryable, traceable, progressively refined document skeleton so the model can work on only the local area it needs, while stable intermediate conclusions are preserved and reused.

This repository currently covers the documentation phase only. The workflow ends at `sp.analyze`. `sp.implement` can be treated as a later implementation-stage entry, but it is outside the scope of this starter pack.

## What Problems This Mechanism Solves

Between an initial request and a final implementation, there are usually three real problems:

- Requirements are incomplete, so route decisions, boundary decisions, UI decisions, and flow decisions keep surfacing along the way.
- Models do not have durable memory and have limited context windows, so the same question gets re-reasoned repeatedly, wasting tokens and creating inconsistent conclusions.
- Once a project becomes large, for example `50` screens, `50` flows, and `100` tables, the model can easily drift because it cannot read everything, remember everything, or find the right entry point.

`sp` does not try to make the model read the whole project every time. It builds the skeleton first, then lets the model move through local worksets.

## What It Is, and What It Is Not

What it is:

- A documentation-first project workflow
- An intermediate constraint system designed for large models
- A layered workflow adapted from the command-oriented `Spec Kit` style
- A documentation framework intended to support later automation

What it is not:

- Not a code generator in the current phase
- Not a black box that turns one PRD into a complete system
- Not a one-off prompt pattern meant only for small tasks

## Core Mechanisms

### 1. Two-Layer Document Progression

The first layer is the business clarification layer. It answers:

- What exactly is being built
- Why it exists
- What the business mainline looks like
- What the role, rule, and capability boundaries are
- Which questions are already stable and which are still open

The second layer is the delivery design layer. It answers:

- How stable business conclusions become deliverable structures
- How screens, flows, use cases, APIs, tables, and acceptance items trace to one another
- How to split the work into worksets so the model can stay local

## 2. A Unified Clarify Entry Point

`sp.clarify` is the single clarification command. It does not split into external commands such as `cf_spec`, `cf_flow`, or `cf_ui`.

Internally it can handle three categories:

- `CF-SPEC`
- `CF-FLOW`
- `CF-UI`

Its job is not to ask random questions. Its job is to turn decisions that affect route, scope, flow branching, screen responsibility, or field constraints into clarification records that can be replayed, propagated, and traced.

Default answer forms are:

- Single choice
- Multi choice
- Optional note when needed

This reduces ambiguity and lowers the chance of user typos or model misinterpretation.

## 3. Query-First Memory

This is the most important part of the mechanism.

`sp` does not rely on source documents alone. It adds two memory layers:

- Project level: `.specify/memory/*`
- Feature level: `specs/<feature>/memory/*`

The memory layer is not the source of truth. The source of truth still lives in documents such as `spec.md`, `clarifications.md`, `flows/*`, `ui/*`, `plan.md`, `delivery/*`, `tasks.md`, and `analysis.md`.

The memory layer has three jobs:

- Route first: which feature and which workset should be opened now
- Compress first: which conclusions are already stable and should not be re-derived
- Filter first: which items are still open, which areas are stale, and which chains are high risk

In other words, the model queries for an entry point first and reads source docs second.

## 4. Worksets as Local Work Surfaces

Once a project grows, the model should not keep carrying the whole feature.

That is why `sp.plan` must split work into multiple `ws-*.md` files. Each workset should cover one relatively closed local area, for example:

- One main screen and its related flows
- One approval chain
- One tightly connected set of APIs and tables
- One high-risk side-effect area

That allows the model to work with only the minimum reading set for the current workset instead of loading the full feature context every time.

## 5. Clarification Propagation Closure

Clarification does not end when the question is answered.

Once `sp.clarify` produces a stable answer, it must:

1. Update the `Source Of Truth`
2. List the `Required Sync Files`
3. Check whether propagation is complete
4. Treat related memory as stale until sync is done

This prevents a situation where `spec.md` changes but `flow`, `ui`, `plan`, or `memory` does not, leaving the project docs in conflict.

## 6. Stay Close to the Original Spec Kit

This mechanism does not try to replace the original style completely. It tries to stay close to `Spec Kit` where possible.

Key things it keeps:

- `specify init`
- `specify check`
- The `specs/<feature>/` structure
- Active feature detection
- The multi-agent adaptation approach

Main changes:

- The external command prefix changes from `speckit` to `sp`
- `flow`, `ui`, `gate`, and `bundle` are inserted between `specify / clarify / plan / tasks / analyze`
- `plan / tasks / analyze` are explicitly treated as documentation-stage work
- The current workflow ends at `sp.analyze`

## Key Characteristics

- Top-down progression: requirement and boundaries first, then business structure, then flows and UI, then delivery design, then consistency analysis.
- Macro before micro: route questions first, local detail questions later.
- Unified clarification: spec, flow, and UI conflicts do not become separate question systems.
- Memory-first reuse: check whether stable conclusions already exist before reopening source docs.
- No repeated inference: once a stable conclusion is fresh, reuse it by default.
- Local progression: worksets keep the model focused on a small area.
- ID-based traceability: use IDs such as `FLOW-*`, `SCREEN-*`, `API-*`, `TABLE-*`, and `ACC-*`.
- Cross-document sync: a clarified change must carry propagation state.
- Medium-project orientation: the structure is designed for larger business systems, not just tiny features.

## Expected Outcomes

The goal is not merely to produce nicer documents. The mechanism is meant to achieve the following:

- Each step gives the model a clearer reading entry point.
- Stable conclusions are preserved and reused, reducing repeated reasoning.
- The same question is less likely to receive different answers in different steps.
- As screens, flows, and tables increase, the project can still progress workset by workset.
- If the project later enters an automated build phase, the model can focus on only the local area it needs.
- Team members and different models can hand off work more consistently.

## Advantages Compared With the Original Workflow

If we focus on the documentation phase, `sp` adds several capabilities on top of the original flow:

- A clearer two-layer split instead of pushing everything through one track
- Separate `flow` and `ui` steps so process and interface design are not squeezed into clarification or planning
- `gate` and `bundle` so first-layer completion and second-layer handoff are explicit
- Query-first memory at both the project and feature levels
- Workset decomposition for limited-context models
- Clarification propagation closure to reduce document drift
- Medium-project scale triggers so structure does not collapse as size grows

## When It Fits

Good fit:

- Business systems with complex requirements, many boundaries, many flows, and many screens
- Projects that require multi-person or multi-model collaboration
- Projects that want a document backbone for later automated development
- Medium projects, or projects likely to grow into medium projects
- Projects that care about consistency, replayability, and traceability

Especially suitable around this scale:

- `10+` screens
- `10+` flows
- `20+` tables, with more expected

Even more suitable near this workload:

- Around `50` screens
- Around `50` flows
- Around `100` tables

## When It Does Not Fit Well

- Tiny tools with only one or two screens and a few simple rules
- Projects whose requirements are already fully stable
- Teams that only want to hand-code quickly and do not want a long-lived documentation backbone
- Projects that do not care about consistency, traceability, or later model handoff

## The Workflow in Plain Language

If you start a project with this system, the flow is:

1. Start with `sp.constitution`.
Purpose: define project rules, boundaries, and memory rules up front so every later step does not invent its own logic.

2. Use `sp.specify` to turn the raw requirement into a feature specification.
Purpose: make clear what is in scope, what is out of scope, who is involved, and what success means.

3. Use `sp.clarify` to resolve route-level questions.
Purpose: settle decisions that affect direction, scope, mainline stages, UI responsibility, and flow branching.

4. Use `sp.flow` to fix the business flows.
Purpose: lock stage order, branching, exception handling, and state progression.

5. Use `sp.ui` to fix the interface structure.
Purpose: lock screens, screen responsibilities, key actions, field constraints, and screen relationships.

6. Use `sp.gate` as the first-layer checkpoint.
Purpose: decide whether the business layer is stable enough to move forward.

7. Use `sp.bundle` as the handoff pack.
Purpose: compress the stable first-layer conclusions into a package the second layer can consume directly.

8. Use `sp.plan` for delivery design.
Purpose: organize the relationships among screens, flows, APIs, tables, permissions, and acceptance, and split them into worksets.

9. Use `sp.tasks` for task decomposition.
Purpose: bind worksets, objects, deliverables, and acceptance items into an executable document set.

10. Use `sp.analyze` for consistency analysis and smoke checking.
Purpose: verify whether the document system is actually strong enough for later automation, rather than only looking complete on paper.

One extra rule:

- `sp.clarify` is not a one-time step.
- If `sp.flow` or `sp.ui` exposes a high-impact conflict, go back to `sp.clarify`.
- If a clarification answer affects multiple files, it must go through the propagation closure.

## Simple Usage

This repository is still not a fully released forked CLI product, but it can already install the documentation-stage starter pack into a target project directory.

So simple usage should be understood in two layers.

### 1. How to use this repository now

Install the documentation-stage starter pack first.

Run from the local repository:

```bash
sh scripts/install.sh
sh scripts/install.sh ./your-project
```

Remote one-command install:

```bash
# Starter pack only
curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project

# Starter pack + Codex integration
SP_INSTALL_AI=codex curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project
```

Notes:

- These remote examples intentionally use the moving `main` branch for convenience
- For stable installs, replace `--archive-url` with a release or tag archive URL that pins the exact version you want

Windows local execution:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 .\your-project
```

Windows remote one-command install:

```powershell
# Starter pack only
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex

# Starter pack + Codex integration
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; $env:SP_INSTALL_AI="codex"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex
```

Notes:

- The Windows remote examples also follow `main.zip` by default
- Use a tag or release archive URL instead when you need reproducible installs

Notes:

- If no directory is passed, installation defaults to the current directory
- Confirmation is required by default
- `curl | sh` mode accepts `--archive-url` and an optional target directory
- `irm | iex` mode uses `SP_INSTALL_ARCHIVE_URL`, `SP_INSTALL_TARGET_DIR`, `SP_INSTALL_AI`, and `SP_INSTALL_AUTO_YES`
- Without `--ai`, the installer only writes the starter pack and does not install any host integration

If you want to install Codex or Claude integration, enable the host explicitly:

```bash
sh scripts/install.sh --ai codex ./your-project
sh scripts/install.sh --ai claude ./your-project
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\your-project
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude .\your-project
```

The current starter-pack installer treats the root install scripts as thin upstream-style wrappers and delegates the real distribution work to this repository's `specify init`. The active host outputs are:

- `--ai codex` / `SP_INSTALL_AI=codex`
  - writes `.agents/skills/sp-*/SKILL.md`
  - uses `$sp-*`
  - records installation in `.specify/integrations/codex.manifest.json`
- `--ai claude` / `SP_INSTALL_AI=claude`
  - writes `.claude/skills/sp-*/SKILL.md`
  - uses `/sp-*`
  - records installation in `.specify/integrations/claude.manifest.json`
- `--ai copilot`
  - writes `.github/agents/sp.*.agent.md`
  - writes `.github/prompts/sp.*.prompt.md`
- shared starter-pack infrastructure is recorded in `.specify/integrations/sp.manifest.json`

Recommended quick checks after installation:

```bash
find ./your-project/.agents/skills -maxdepth 2 -name SKILL.md
find ./your-project/.claude/skills -maxdepth 2 -name SKILL.md
find ./your-project/.github/agents -maxdepth 1 -name 'sp.*.agent.md'
```

```powershell
Get-ChildItem .\your-project\.agents\skills -Recurse -Filter SKILL.md
Get-ChildItem .\your-project\.claude\skills -Recurse -Filter SKILL.md
Get-ChildItem .\your-project\.github\agents -Filter "sp.*.agent.md"
```

After installation, you can already use the documentation rules and examples directly:

- Read the root README files and the `docs/` directory
- Use `Archieved/project-root/specs/attendance-leave/` as the archived full example chain
- Organize your feature documents in this order:
  `sp.constitution -> sp.specify -> sp.clarify -> sp.flow -> sp.ui -> sp.gate -> sp.bundle -> sp.plan -> sp.tasks -> sp.analyze`

Key entry points:

- Main mechanism spec: `docs/reference/sp-command-spec.md`
- Memory architecture: `docs/reference/sp-context-memory-architecture.md`
- Command output contracts: `docs/reference/sp-command-output-contracts.md`
- Template manifest: `docs/reference/sp-template-file-manifest.md`
- Example chain: `Archieved/project-root/specs/attendance-leave/`

### 2. How it should be used after a real fork

After a real fork, the installation and initialization flow should still stay close to the original:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify init . --ai codex
specify check
```

Command trigger conventions:

- Codex: `$sp-specify`
- Claude: `/sp-specify`
- Traditional slash-command hosts: `/sp.specify`

These forms must stay separate:

- `$sp-*` belongs to Codex skills
- `/sp-*` belongs to Claude skills
- `/sp.*` belongs to traditional slash-command hosts
- Codex examples must not be written in the old prompt-path form

The same pattern applies to the other commands:

- `$sp-constitution` / `/sp-constitution` / `/sp.constitution`
- `$sp-clarify` / `/sp-clarify` / `/sp.clarify`
- `$sp-flow` / `/sp-flow` / `/sp.flow`
- `$sp-ui` / `/sp-ui` / `/sp.ui`
- `$sp-gate` / `/sp-gate` / `/sp.gate`
- `$sp-bundle` / `/sp-bundle` / `/sp.bundle`
- `$sp-plan` / `/sp-plan` / `/sp.plan`
- `$sp-tasks` / `/sp-tasks` / `/sp.tasks`
- `$sp-analyze` / `/sp-analyze` / `/sp.analyze`

Cross-platform compatibility principles:

- Cover macOS, Linux, and Windows
- Windows defaults to `ps`
- macOS and Linux default to `sh`
- Agent coverage should stay as close as possible to the original `Spec Kit`

## Which Step Maintains the Memory Layer

The memory layer is not maintained in only one step.

It is a continuous mechanism:

- `sp.constitution` initializes project-level memory
- `sp.specify` initializes feature-level memory
- `sp.clarify` refreshes stable facts, open items, and trace entry points
- `sp.flow` and `sp.ui` refresh flow and UI-related traceability
- `sp.gate`, `sp.bundle`, `sp.plan`, and `sp.analyze` all check whether memory is stale

`sp.bundle` does not replace memory. It compresses stable first-layer conclusions into a second-layer handoff package and refreshes project-level active context.

## Why This Can Reduce Token Consumption

This mechanism does not save tokens by writing fewer documents. It aims to save tokens by reducing repeated reasoning.

The main sources are:

- Once stable conclusions enter memory, later steps reuse them by default.
- New steps route through project-level and feature-level memory before opening source docs.
- The second layer works through local worksets instead of forcing the model to carry the full feature.
- `sp.clarify` front-loads high-impact questions and batches smaller recurring questions when appropriate.

It does not guarantee zero extra token cost, because the documentation layer itself is more complete. The goal is to spend tokens on new information, not on rebuilding conclusions that were already established.

## What Is Already Achieved

What this repository has already completed is the standardized design of the documentation phase, including:

- The command chain is fixed
- The two memory layers are fixed
- The clarification mechanism is fixed
- The workset mechanism is fixed
- Medium-project scale triggers are fixed
- The sample feature covers the full chain from `spec` to `analysis`

What is not done yet:

- A real fork on top of the upstream repository
- Actual command-template installation into agent command directories with validation
- The design and implementation of `sp.implement`

## Current Phase Boundary

This repository should currently be understood as:

- A documentation-stage workflow design repository
- A specification repository before the real fork
- A base repository for validating layered structure, memory, clarification propagation, and medium-project fitness

It should not be understood as:

- A fully released installable product
- A complete end-to-end system including code generation

## Key Document Entry Points

- `docs/reference/sp-command-spec.md`
- `docs/reference/sp-context-memory-architecture.md`
- `docs/reference/sp-command-output-contracts.md`
- `docs/reference/sp-template-file-manifest.md`
- `docs/reference/sp-installation-and-agent-compatibility.md`
- `docs/reference/sp-document-stage-closeout-checklist.md`
- `docs/reference/sp-medium-project-smoke-test.md`
- `Archieved/project-root/specs/attendance-leave/`

## One-Sentence Summary

`sp` is trying to do one practical thing: give large models a stable, queryable, replayable, locally navigable document skeleton first, so they can work on one small area at a time instead of repeatedly restarting from a messy requirement.
