# SP Lite Design Review Brief

You are reviewing the repository at `/Users/hula/Projects/speckit-layered` in read-only mode. Do not modify files.

## User Intent

Design an `SP Lite` mechanism. It must still generate the normal SP PRD and outline content. After that it should avoid fully elaborating all business flow and UI. Instead it should select the smallest useful validation slice, build a runnable minimum prototype quickly for business validation, then move rapidly through plan, tasks, and code implementation.

The desired result is not merely fewer documents. It is a controlled validation track that answers the highest-value business uncertainty with the least implementation effort.

## Current Repository Facts

- The full workflow is defined in `workflows/speckit/workflow.yml` and currently runs PRD/outline review, specify, flow, UI, gates, bundle, plan, tasks, analysis, implementation, and final gates.
- Core command contracts are in `templates/commands/prd.md`, `specify.md`, `flow.md`, `ui.md`, `plan.md`, `tasks.md`, and `implement.md`.
- Recent work makes PRD outline discovery, source authority, stable IDs, and human confirmation deliberate safety boundaries. Lite should preserve them.
- `sp.tasks` currently blocks implementation task generation when required flow/UI batches are not fully confirmed.
- The workflow engine supports gates, conditionals, switches, loops, commands, prompts, and shell steps under `src/specify_cli/workflows/`.
- Presets can replace command/template files. `presets/lean/` is currently a minimal prompt preset, but it predates or omits the newer PRD/outline and staged flow/UI confirmation semantics. Do not assume it already solves SP Lite.
- Full SP behavior must remain unchanged by default.

## Working Assumption

Treat Lite as feature-level opt-in, with a possible project default, so full and Lite features can coexist. Call out if you strongly disagree.

## Required Review

Propose a repository-grounded mechanism covering:

1. The semantic definition of SP Lite and what it must never claim.
2. How it selects the minimum validation slice from the confirmed PRD/outline. Give deterministic selection criteria and human decision points.
3. The minimum flow and UI artifacts still required for that slice, and what is intentionally deferred.
4. The exact new or changed artifacts and readiness states needed to prevent partial Lite evidence from being mistaken for full delivery readiness.
5. The command and workflow shape. Compare at least two options such as a new `sp.lite` command, a mode on existing commands, a workflow-only profile, or a preset.
6. How plan, tasks, and implement should consume Lite scope and enforce bounded writes/tests.
7. The validation feedback loop and promotion path: expand Lite, pivot, stop, or promote to full SP.
8. Compatibility, migration, testing, and rollout risks.
9. A phased implementation plan sized for this repository.

Return a concise but concrete design review in Chinese. Lead with your recommendation, identify any dangerous shortcuts, and cite repository paths where useful.
