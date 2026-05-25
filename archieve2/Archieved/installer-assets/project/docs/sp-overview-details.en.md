# `sp` Detailed Overview

## What Problems This Solves

- Real projects contain many unresolved route, flow, and UI decisions between the initial request and final implementation.
- Models have limited context and no durable memory, so repeated reasoning and drift are common.
- As projects grow, models start missing key information or reading the wrong area.

`sp` does not ask the model to read the whole project every time. It builds the skeleton first and then advances through local worksets.

## Core Mechanisms

### Two-Layer Progression

- Layer 1: business clarification
- Layer 2: delivery design

### Unified Clarify Entry

`sp.clarify` handles `CF-SPEC`, `CF-FLOW`, and `CF-UI` as a single clarification system.

It prefers single-choice, multi-choice, and optional note formats to reduce ambiguity.

### Query-First Memory

Two fixed memory layers:

- Project level: `.specify/memory/*`
- Feature level: `specs/<feature>/memory/*`

Memory does not replace source-of-truth docs. It handles routing, compression, and filtering.

### Worksets

After `sp.plan`, the feature should be split into bounded local work areas so the model can stay focused.

### Clarification Propagation Closure

Once a clarification answer becomes stable, update the `Source Of Truth` first, then sync `Required Sync Files`, and treat unsynced memory as stale.

## Expected Outcomes

- Clearer reading entry points at every step
- Fewer repeated inferences
- Safer local progression for large features
- Better consistency across model handoffs

## Best Fit

Best for medium or growing business systems with many screens, flows, and data objects, especially when the team wants a documentation backbone for later automation.

Less useful for very small tools with only a few pages and simple rules.

## Suggested Reading Order

1. `docs/sp-command-spec.md`
2. `docs/sp-context-memory-architecture.md`
3. `.specify/memory/constitution.md`
4. `.specify/memory/project-index.md`
5. Start the first feature with `sp.specify`

## Codex Notes

- Codex Desktop prompts use `/prompts:sp.*`
- `/sp.*` does not belong to Codex
- To place Codex prompts into the Codex directories, installation must be run in Codex mode; the installer writes to `CODEX_HOME/prompts` first and mirrors into `CODEX_HOME/commands`
- Codex installation removes legacy `/prompts:speckit.*` files from both `prompts` and `commands`, plus any leftover `sp-*` skill directories
