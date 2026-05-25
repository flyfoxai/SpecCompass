---
description: Package the stable first-layer conclusions for second-layer delivery design.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-spec
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec
---

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding.

# sp.bundle

Use this command when the user wants to package the stable first-layer conclusions for second-layer delivery design.

Global rules:
- Stay within documentation work only.
- Reuse existing project context and active feature state.
- Do not write production code.
- If `.specify/memory/project-index.md` exists, read it first and use it as the project routing entry.
- If `.specify/memory/active-context.md` exists, use it to pick the current smallest useful read set.
- If `specs/<feature>/memory/index.md` exists, read it first and use it as the feature routing entry.
- Expand to source documents only for the current target area.
- If required inputs are missing or unstable, stop and report the gap explicitly.
- User-facing next-step commands must use `/sp.*` form. Treat `sp-*` only as an internal skill directory detail.
- Do not compress away open risks, blockers, stale memory, or validation gaps.
- Manage context as an engineering budget: start from routing, stable context, gate, and open items; expand to flow or UI source docs only when the bundle needs that evidence.

## Purpose

- Compress the stable first-layer conclusions into a package the second layer can consume directly.

## Read First

- Read `.specify/memory/active-context.md`, `specs/<feature>/memory/index.md`, `specs/<feature>/memory/stable-context.md`, and `specs/<feature>/memory/open-items.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, `specs/<feature>/flows/*`, `specs/<feature>/ui/*`, and `specs/<feature>/gate.md`.

## Do

- Summarize the stable feature context that the delivery layer needs.
- Remove the `SP_STAGE_SEED: bundle` marker once `bundle.md` contains a real feature-specific first-layer package.
- Call out unresolved constraints or carry-forward risks explicitly.
- Keep the package concise, query-friendly, and traceable back to first-layer sources.
- Refresh active context and feature memory so later steps can route into the correct delivery work.
- Include carry-forward `memory/open-items.md` entries that affect delivery planning, testing, rollback, permissions, data, or release decisions.
- Preserve stable coordinates and trace anchors so `/sp.plan` can split worksets without re-reading every first-layer document.
- If the first-layer source set cannot be safely bundled, record the exact fallback target (`/sp.specify`, `/sp.clarify`, `/sp.flow`, `/sp.ui`, or `/sp.gate`) instead of smoothing over the gap.

## Do Not

- Do not invent delivery design that is not already implied by first-layer outputs.
- Do not leave `SP_STAGE_SEED: bundle` in a completed bundle; that marker means the file is still an initialization scaffold.
- Do not hide remaining risks.
- Do not duplicate large source documents verbatim.
- Do not mark first-layer conclusions as stable when `gate.md`, trace, or open-items still shows a blocker.

## Output

- Create or update `specs/<feature>/bundle.md`
- Refresh `.specify/memory/active-context.md`
- Refresh `specs/<feature>/memory/stable-context.md`
- Refresh `specs/<feature>/memory/index.md`

## Check Before Finish

- Confirm the package is sufficient for delivery-layer entry without rereading everything.
- Confirm unresolved items are clearly marked.
- Confirm the bundle only reflects stable first-layer conclusions.
- Confirm stale memory or unresolved blockers are carried forward with the exact next `sp.*` revisit step.

## Next

- Suggest `/sp.plan`.
