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

## Active Lite Round

Before normal execution, check `specs/<feature>/lite.md`. If it is absent or
has no active selected round, preserve the full SP behavior of this command.
If a round is active, read its `Active Round`, `Included Outline Anchors`,
`Deferred Outline Anchors`, `Reuse Refs`, `Allowed Write Set`, `Required
Historical Regressions`, `Global Status`, and `Blocker Route` before packaging
delivery evidence. Run the platform-appropriate installed `sp-lite-state`
script with JSON output and accept only schema `speckit.lite.route.v1`.

Normal Lite bundle work is authorized only when the fresh payload has
`globalControl=CLEAR`, `continueAllowed=true`, and `next="/sp.bundle"`. On any
other normal route, stop without writing and return its `next`. A non-`CLEAR`
route is resolution-only: proceed only when `Blocker Route` is `/sp.bundle` and
the human explicitly invoked that repair route. Limit that repair to the named
conflict, stale, or regression references and the `Allowed Write Set`; do not
advance the Lite lifecycle or clear coordinator state yourself. Return
`/sp.lite sync` so the coordinator can recompute global control. All other
non-`CLEAR` routes stop without writing.

Package only the included anchors, never pull deferred anchors into the round,
and reuse cited prior evidence instead of recreating it. The confirmed Outline
remains the project completion boundary regardless of the current Lite scope.

Before returning a completed Lite stage, publish round evidence in `bundle.md`
with these exact fields: `Lite Round`, `Lite Stage`, `Included Outline Anchors`,
and `Source Signature`. Set the stage to `BUNDLE` and use the before-dispatch
signature supplied by the coordinator. Do not reuse another round's bundle
evidence even when its content is otherwise reusable.

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
- Confirm first-layer outputs are not only generic templates (for example still containing `SP_STAGE_SEED`), `DRAFT_ONLY` outputs, stale drafts, unconfirmed visual-review outputs, or unchecked draft facts being used as stable delivery input.
- Confirm open blockers, high-impact risks, stale routing, and unresolved first-layer decisions are either explicitly carried forward or routed to their owner command before the bundle is treated as usable by `/sp.plan`.
- If preflight fails, report `Missing/Weak Artifact`, `Blocker Type`, `Root Layer`, `Owner Route`, `Why current command cannot continue`, `Next /sp.* route`, and `Writeback Target`. Do not create a bundle that makes missing or contradictory first-layer facts look stable. In headless or non-interactive runs, end the output with `SP_EXIT_CODE: 1`; if the host supports process exit control, also terminate with a non-zero exit status so automated runners cannot treat bundle preflight failure as success.

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

End every run with a concrete closeout recommendation. Do not stop at "bundle complete" or only say "Suggest `/sp.plan`". Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.

Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, Stage Readiness, and this bundle evidence. If first-layer evidence is missing, stale, or conflicting, recommend the exact owner route (`/sp.specify`, `/sp.clarify`, `/sp.flow`, `/sp.ui`, or `/sp.gate`) instead of `/sp.plan`.

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

- Recommend `/sp.plan <feature>` only when the bundle carries stable first-layer conclusions and no open blocker prevents delivery planning.
- Recommend the exact first-layer owner route when bundle preflight found stale, draft, or contradictory source evidence.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.
