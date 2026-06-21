---
description: Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts.
tools: ['github/github-mcp-server/issue_write']
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
---

# /sp.taskstoissues

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## SP Boundary And Safety Rules

- This is an export helper, not a planning or implementation command. It may create GitHub issues only from already valid `tasks.md` content; it must not repair task packets, infer missing scope, expand work boundaries, or treat issue creation as business PASS.
- Command success, created issues, or exit code 0 only prove issue export happened. They do not prove acceptance, trace, open-items, data-linkage, implementation readiness, code/test evidence, or gate PASS.
- Before creating issues, verify that each exported task preserves the SP execution contract: `Mode: doc` or `Mode: impl`, source anchor or no-trace reason, owner/workset, allowed write boundary when code is in scope, required checks, open-item or blocker status, and next route when incomplete.
- Do not export tasks that are blocked by unresolved `memory/open-items.md` items, missing task packet fields, ambiguous repository target, missing GitHub remote, stale feature routing, or human decisions. Stop and route to `/sp.tasks`, `/sp.plan`, `/sp.clarify`, `/sp.analyze`, or `/sp.gate` instead.
- If task scope, repository target, labels, assignees, milestone, or issue grouping cannot be derived safely, return `NEEDS_DECISION` with background, impact, 2-4 options, recommendation, and the next `/sp.*` route. Do not create issues in a best-guess repository or with best-guess scope.

## Pre-Execution Checks

**Check for extension hooks (before tasks-to-issues conversion)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_taskstoissues` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the Outline.
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Next

End every run with a concrete closeout recommendation. Do not only say that issues were created or skipped. Give 2-3 options, choose one, explain why, and provide a one-line copy-pasteable `NEXT_COMMAND`.

Before choosing the recommendation, reconcile `.specify/memory/active-context.md`, `.specify/memory/feature-map.md`, feature `memory/index.md`, feature `memory/open-items.md`, exported issue evidence, task export readiness, and this command evidence. If task packets, allowed write sets, required checks, remote identity, or blockers are unresolved, recommend `/sp.tasks`, `/sp.plan`, `/sp.clarify`, or the exact owner route instead of issue export or implementation.

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
- Recommend `/sp.analyze <feature>` after successful issue export only when tasks remain reviewable and no hidden human decision blocks the next diagnostic check.
- Recommend `/sp.tasks`, `/sp.plan`, `/sp.clarify`, or the exact owner route when export readiness is blocked.
- Keep `NEXT_COMMAND_EXEC` as the pure slash command. `NEXT_COMMAND` must be the same command plus the Chinese prompt in one line. Do not split the prompt into a separate field. After the recommendation fields, finish the entire response with a final `text` fenced code block that contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, `MY_RECOMMENDATION`, `NEXT_COMMAND_EXEC`, `WHY_THIS_NEXT`, `DO_NOT_RUN`, labels, or explanations inside that final copy box. If `NEXT_COMMAND_EXEC` is `None`, the final copy box contains only `None`.

## Outline

1. Run `{SCRIPT}` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. From the executed script, extract the path to **tasks**.
1. Read `specs/<feature>/memory/open-items.md` when present. If unresolved blockers, high risks, human decisions, stale routing, or code-stage boundary issues affect the task export, stop and route to the owner `/sp.*` command instead of creating issues.
1. Validate that the selected tasks are export-ready: no incomplete `Mode: impl` task packet, no missing allowed write set for code tasks, no missing required checks, no unresolved source anchor or no-trace reason, and no blocker that would make the issue misleading.
1. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

> [!CAUTION]
> ONLY PROCEED IF THE TASKS ARE EXPORT-READY UNDER THE SP CONTRACT ABOVE. IF NOT, RETURN THE EXACT FALLBACK ROUTE AND DO NOT CREATE ISSUES.

1. For each task in the list, use the GitHub MCP server to create a new issue in the repository that is representative of the Git remote.

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL

For each created issue, preserve enough SP context for a later agent to execute or review without guessing: feature, workset, task ID, Mode, source anchor or no-trace reason, dependencies, allowed write set when relevant, required checks, open-item links, and next `/sp.*` route for incomplete or blocked tasks.

## Post-Execution Checks

**Check for extension hooks (after tasks-to-issues conversion)**:
Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_taskstoissues` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently
