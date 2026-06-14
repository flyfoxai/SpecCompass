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

# /sp.bundle

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
- User-facing next-step commands must use the host-appropriate form: `/sp.*` on slash-command hosts, or Codex skills via `$sp-*`, `/skills`, or a matching natural-language request.
- Do not compress away open risks, blockers, stale memory, or validation gaps.
- Manage context as an engineering budget: start from routing, stable context, gate, and open items; expand to flow or UI source docs only when the bundle needs that evidence.
- Do not treat command success, generated documents, or exit code 0 as business PASS. The bundle is only a delivery input package; business PASS still depends on acceptance, trace, open-items, data-linkage, code/test evidence when in scope, and gate verdict.

## Purpose

- Compress the stable first-layer conclusions into a package the second layer can consume directly.

## Read First

- Read `.specify/memory/active-context.md`, `specs/<feature>/memory/index.md`, `specs/<feature>/memory/stable-context.md`, and `specs/<feature>/memory/open-items.md`.
- Read `specs/<feature>/spec.md`, `specs/<feature>/clarifications.md`, `specs/<feature>/flows/*`, `specs/<feature>/ui/*`, and `specs/<feature>/gate.md`.

## Stage Entry Preflight

- Confirm routing identifies one active feature and `spec.md` is current enough to package stable first-layer conclusions.
- Check whether user input changes product goal, source authority, requirements, acceptance, scope, flow, UI, risk acceptance, or verification standard. If so, stop bundling and route to `/sp.prd`, `/sp.specify`, `/sp.clarify`, `/sp.flow`, or `/sp.ui` before creating or refreshing `bundle.md`.
- Confirm first-layer outputs are not only generic templates, stale drafts, unconfirmed visual-review outputs, or unchecked draft facts being used as stable delivery input.
- Confirm open blockers, high-impact risks, stale routing, and unresolved first-layer decisions are either explicitly carried forward or routed to their owner command before the bundle is treated as usable by `/sp.plan`.
- If preflight fails, report `Missing/Weak Artifact`, `Blocker Type`, `Root Layer`, `Owner Route`, `Why current command cannot continue`, `Next /sp.* route`, and `Writeback Target`. Do not create a bundle that makes missing or contradictory first-layer facts look stable.

## Do

- Summarize the stable feature context that the delivery layer needs.
- Remove the `SP_STAGE_SEED: bundle` marker once `bundle.md` contains a real feature-specific first-layer package.
- Call out unresolved constraints or carry-forward risks explicitly.
- Keep the package concise, query-friendly, and traceable back to first-layer sources.
- Refresh active context and feature memory so later steps can route into the correct delivery work.
- Include carry-forward `memory/open-items.md` entries that affect delivery planning, testing, rollback, permissions, data, or release decisions.
- Preserve stable coordinates and trace anchors so `/sp.plan` can split worksets without re-reading every first-layer document.
- Preserve direct-neighbor data-linkage constraints that affect UI, API, data, permission, acceptance, tests, rollback, release, or human decisions. If the relationship is unresolved, carry it forward as an open item instead of packaging it as stable context.
- If the first-layer source set cannot be safely bundled, record the exact fallback target (`/sp.specify`, `/sp.clarify`, `/sp.flow`, `/sp.ui`, or `/sp.gate`) instead of smoothing over the gap.

## Do Not

- Do not invent delivery design that is not already implied by first-layer outputs.
- Do not leave `SP_STAGE_SEED: bundle` in a completed bundle; that marker means the file is still an initialization scaffold.
- Do not hide remaining risks.
- Do not duplicate large source documents verbatim.
- Do not mark first-layer conclusions as stable when `gate.md`, trace, or open-items still shows a blocker.
- Do not convert unchecked draft flow/UI/plan outputs into stable delivery input just because they are bundled.

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
- Confirm any unresolved direct-neighbor data-linkage, acceptance, permission, rollback, release, or human-decision gap is carried forward rather than hidden.

## Next

- Suggest `/sp.plan`.
