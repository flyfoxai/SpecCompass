---
description: Determine the next safe Spec Kit command from explicit project state.
scripts:
  sh: scripts/bash/sp-route.sh --json
  ps: scripts/powershell/sp-route.ps1 -Json
---

## User Input

```text
$ARGUMENTS
```

# /sp.route

## Outline

Goal: Inspect explicit Spec Kit project state and report the next safe `/sp.*`
route. By default this command reports a Warm Route for the active mainline;
with explicit `/sp.route y` input it may hand off to the recommended command
when the route JSON says continuation is safe. With explicit `/sp.route all`,
it performs a Cold Start / Global Scan for project intake direction judgment.

Rules:
- Run `{SCRIPT}` from the repository root and parse the JSON result.
- Treat the script output as deterministic routing evidence, not a prompt for
  freeform inference.
- Preserve script purity: the shell/PowerShell route scripts only emit JSON and
  never execute slash commands.
- Preserve `/sp.route y` behavior: `y` means continue to the next safe command
  when `continueAllowed` is `true`; it does not request a global scan.
- Only `/sp.route all` may perform a global scan unless explicit route evidence
  shows that no active mainline exists.
- Project Intake Direction Judgment is the Cold Start / Global Scan mode. It
  identifies the current project goal, current stage, single mainline, root
  blocker family, first fix, deferred work, and smallest useful read set.
- Warm Route mode is the default for ordinary `/sp.route` and `/sp.route y`.
  If `activeFeature`, feature memory, or a current `PRIMARY_THEME` is already
  reliable, do not repeat the project intake scan. Read only the active
  mainline's route evidence, memory index, open items, Stage Readiness, and the
  smallest source set needed to explain the next command.
- Cold Start / Global Scan mode is used only for `/sp.route all`, missing or
  stale active mainline, or a user request to reassess project direction. Route
  first and expand second: read project-level route/memory/index evidence
  before feature docs, and do not deep-read every feature. If many features
  exist, report the distribution and one candidate mainline instead of spending
  tokens on all `prd.md`, `flow.md`, `ui.md`, `analysis.md`, or archive files.
- Do not auto-execute: downstream dispatch is allowed only by this command
  template in explicit `y` mode after the route payload permits it.
- Default mode: if the user input does not contain the standalone word `y`,
  do not execute the returned `next` command.
- Global scan mode: if the user input contains the standalone word `all`, do
  not execute the returned `next` command even if the input also contains `y`.
  Global scan is diagnostic and must end with a recommendation only.
- Resume mode: if the user input contains the standalone word `y`,
  inspect `continueAllowed`, `status`, `next`, `blockerType`, and
  `blockerRoute` before emitting any downstream command.
- Treat `loopDetected: true`, `blockerType: REPEATED_FALLBACK`, or reason
  `fallback-loop-detected` as a circuit breaker from
  `memory/fallback-log.md`: do not dispatch the repeated route again. Report
  `loopSignature`, `loopRoute`, the attempted route, and route to
  `/sp.clarify` or the named owner decision package.
- Do not continue when `status` is `NEEDS_DECISION`, or when `blockerType` is
  `HUMAN_DECISION`, `UNKNOWN_BLOCKER`, or `REPEATED_FALLBACK`. Report the
  decision context and route to `/sp.clarify`; if the host supports command
  dispatch, emit
  `EXECUTE_COMMAND: sp.clarify` only to generate or complete the decision
  package, not to bypass the human decision.
- For `BLOCKED` with `blockerType: UPSTREAM_DOC_GAP`, continue only when
  `continueAllowed` is `true` and `blockerRoute` is a concrete non-clarify
  `/sp.*` route. Emit `EXECUTE_COMMAND` for that owner route.
- For non-blocked routes such as `NEEDS_PRD`, `NEEDS_SPECIFY`, `NEEDS_FLOW`,
  `NEEDS_UI`, `NEEDS_BUNDLE`, `NEEDS_PLAN`, `NEEDS_TASKS`, and
  `READY_FOR_IMPLEMENT`, continue only when `continueAllowed` is `true`.
- If `status` is `NEEDS_DECISION`, `NEEDS_PRD`, `NEEDS_SPECIFY`,
  `NEEDS_FLOW`, `NEEDS_UI`, `NEEDS_BUNDLE`, `NEEDS_PLAN`, `NEEDS_TASKS`, or
  `BLOCKED`, report the status, reason, missing artifacts, blockers, and next
  route.
- If `status` is `READY_FOR_IMPLEMENT`, report the active feature and next
  route. Execute `/sp.implement` only in explicit `y` mode and only when
  `continueAllowed` is `true`.
- Preserve the JSON fields `schema`, `status`, `next`, `reason`,
  `activeFeature`, `featureDir`, `artifacts`, `missing`, `blockers`,
  `confidence`, `autoExecute`, `continueAllowed`, `blockerType`,
  `blockerRoute`, `loopDetected`, `loopSignature`, and `loopRoute` when
  relaying machine-readable output.
- If project goal, active feature/mainline, or root blocker family cannot be
  determined from explicit state, return `NEEDS_DECISION` in the explanation,
  route to `/sp.clarify`, and do not guess by deep-reading arbitrary feature
  documents.
- The final recommendation must contain one single preferred next command.
  Alternatives may be described as deferred work, but `NEXT_COMMAND` must not
  make the user choose between multiple routes.
- Do not stop at problem reporting. Even when the previous step is complete,
  blocked, or needs a human decision, give 2-4 plain-language options, mark one
  recommended option, explain why, and then provide one concrete next step.
  The user should not have to infer what "stage entry judgment", "monitoring",
  or "readiness gap" means before they can act.
- Options and `WHY_RECOMMENDED` must be grounded in the route JSON plus global
  SP evidence listed in `READ_SET`: project memory, `.specify/memory/active-context.md`,
  `.specify/memory/feature-map.md`, feature `memory/index.md`,
  `memory/open-items.md`, and Stage Readiness. Do not recommend a direction
  from only the current file or local context. If that evidence is missing,
  stale, or conflicting, recommend `/sp.route all`, `/sp.clarify`, or the
  smallest evidence-repair action instead of guessing.
- Write each option in this fixed prefix format:
  `OPTION_A: [CMD: </sp.* or None>] <plain-language action and impact>`.
  `RECOMMENDED_OPTION` must point to a non-None option. `MY_RECOMMENDATION`
  must name the same option letter, and `NEXT_COMMAND_EXEC` must match the
  command in the recommended option.
- When `USER_DECISION_NEEDED: yes`, `status: NEEDS_DECISION`, or
  `blockerType: HUMAN_DECISION`, the recommended option may only complete the
  decision package, run `/sp.clarify`, or gather the smallest missing evidence.
  It must not recommend a substantive downstream route that bypasses the human
  decision.
- `USER_DECISION_NEEDED` is a human closeout label only. It must mirror the
  route JSON stop state; it is not an automation control field. Machine
  continuation is still governed only by JSON `continueAllowed` and
  `autoExecute`.
- Say the recommendation in plain Chinese. After choosing `RECOMMENDED_OPTION`,
  make `NEXT_COMMAND` a single copy-pasteable line that starts with the slash
  command and continues with a Chinese prompt. The prompt must tell the next
  command what to focus on, what boundary or gate risk to recheck, and which
  global SP evidence or memory files to respect. Keep the parseable slash
  command alone in `NEXT_COMMAND_EXEC`. Keep `NEXT_COMMAND_ID` as a legacy
  alias only when an older prompt requires it.
- When naming a feature, module, or numbered mainline such as
  `110-template-library-template-application`, include a brief Chinese summary
  of what it mainly does. Base the summary on `READ_SET`, feature memory, PRD,
  outline, or Stage Readiness evidence. If the role is not confirmed, say that
  the role is not confirmed and route to evidence repair instead of inventing
  the description.
- Multi-agent coordinators such as Hermes, OpenClaw, CrewAI, or LangGraph must
  not shell-execute the human `NEXT_COMMAND` line. They should dispatch from the
  route JSON (`next`, `blockerRoute`, `continueAllowed`, `autoExecute`) or from
  `NEXT_COMMAND_EXEC`, then pass the Chinese guidance in `NEXT_COMMAND` as
  worker prompt/context. Shared project memory writes must be serialized by one
  coordinator; worker agents treat `.specify/memory/*` and
  `specs/<feature>/memory/*` as read-only unless their task packet explicitly
  grants a write boundary.
- Do not add a second auto-continue field. Machine continuation is governed by
  the JSON fields `autoExecute` and `continueAllowed`; the human explanation may
  restate the stop reason, but it must not introduce another continuation key.
- If the user asks to switch from one mainline to another, or route evidence
  suggests changing `PRIMARY_THEME`, report switch cost before changing the
  mainline unless the current mainline is already closed or invalid.

## Resume Dispatch

When explicit `y` mode is active and dispatch is allowed:

1. Convert the route path to the command id by removing the leading slash:
   `/sp.flow` -> `sp.flow`.
2. Emit:

   ```text
   EXECUTE_COMMAND: sp.<name>
   EXECUTE_COMMAND_INVOCATION: /sp.<name>
   ```

3. Wait for the downstream command result before claiming progress.

If dispatch is not allowed, output the route payload, the stop reason, and the
next manual action. Do not guess around `NEEDS_DECISION`, `HUMAN_DECISION`, or
`UNKNOWN_BLOCKER`.

If `all` mode is active, do not emit `EXECUTE_COMMAND`. `/sp.route all` is for
global scan and project direction reassessment only.

## Output

Return the route payload and a concise human-readable explanation. In default
mode, do not run the downstream command. In explicit `y` mode, emit the
downstream `EXECUTE_COMMAND` only when the route payload permits it.

The human-readable explanation must end with this contract:

```text
## Project Direction

PROJECT_GOAL: <current project goal or NEEDS_DECISION>
CURRENT_STAGE: <prd|specify|clarify|flow|ui|bundle|plan|tasks|analyze|gate|implement|governance|unknown>
PRIMARY_THEME: <single mainline for this turn>
PRIMARY_THEME_SUMMARY: <1-3 short Chinese sentences explaining what the feature/module mainly does, based on READ_SET; if unconfirmed, say 未确认>
ROOT_BLOCKER_FAMILY: <root blocker family or None>
FIRST_FIX: <first problem to solve before broader work>
DEFERRED_WORK: <work explicitly postponed>
READ_SET: <smallest project/feature evidence set used or recommended>
PRIORITY_CLASS: P0 | P1 | P2 | P3 | P4 | P5

## Options

OPTION_A: [CMD: </sp.* or None>] <plain-language action and impact>
OPTION_B: [CMD: </sp.* or None>] <plain-language action and impact>
OPTION_C: [CMD: </sp.* or None>] <third action and impact; use [CMD: None] None if there is no third option>
OPTION_D: [CMD: </sp.* or None>] <fourth action and impact; use [CMD: None] None if there is no fourth option>
RECOMMENDED_OPTION: A | B | C | D
WHY_RECOMMENDED: <why this option is safest or most useful now, citing READ_SET evidence>
USER_DECISION_NEEDED: yes | no
MY_RECOMMENDATION: 我的推荐：选 <A|B|C|D>：<用中文说明推荐对象和理由>

## Next Step

NEXT_ACTION: <one concrete action; do not write "if needed" or "consider">
NEXT_COMMAND_EXEC: </sp.* or None>
NEXT_COMMAND_ID: </sp.* or None; legacy alias of NEXT_COMMAND_EXEC>
NEXT_COMMAND: </sp.* 加中文提示词的一整行；必须能一次复制粘贴执行；如果 NEXT_COMMAND_EXEC 为 None 则写 None>
WHY_THIS_NEXT: <why this is the next safe step>
DO_NOT_RUN: <commands that would be unsafe now, or None>
```

Options are not allowed to be vague restatements such as "continue if needed".
Each option must say what happens if the user chooses it and must start with
`[CMD: ...]`. If there is only one safe action, still provide at least two
options by naming the safe action and one or more explicitly rejected
alternatives with their consequences. Example: `OPTION_B: [CMD: None] Run
/sp.implement now; rejected because gate has not authorized implementation.`
If `OPTION_C` or `OPTION_D` is `[CMD: None] None`, `RECOMMENDED_OPTION` must not
point to that option.

The recommendation must be evidence-backed, not guessed. `OPTION_*` and
`WHY_RECOMMENDED` must stay within the global SP evidence named in `READ_SET`,
including route JSON, project memory, active-context, feature-map, feature
memory/index, open-items.md, and Stage Readiness. If that evidence does not
support a real direction, set `USER_DECISION_NEEDED: yes`, recommend
`/sp.clarify` or `/sp.route all`, and do not route to downstream production or
stage work. `USER_DECISION_NEEDED` must not conflict with the route JSON: if the
JSON says `status: NEEDS_DECISION` or `blockerType: HUMAN_DECISION`, this field
is `yes`; otherwise it is `no` unless the explanation is explicitly requesting a
new human choice.

`MY_RECOMMENDATION`, `RECOMMENDED_OPTION`, and `NEXT_COMMAND_EXEC` must be
consistent. For example, if `RECOMMENDED_OPTION: A`, then
`MY_RECOMMENDATION` must say `选 A`, `OPTION_A` must have the same executable
command as `NEXT_COMMAND_EXEC`, and `NEXT_COMMAND` must start with that same
command.

`NEXT_COMMAND` must be specific enough to guide the next command without
requiring the user to restate the route analysis. It should be one line, start
with the exact slash command, then include the Chinese guidance. It should name
the feature/mainline when known. Automation must never treat this whole line as
a shell command; use route JSON or `NEXT_COMMAND_EXEC` for dispatch and pass the
remaining Chinese guidance as task context. Example:

```text
OPTION_A: [CMD: /sp.analyze 110-template-library-template-application] 继续复核该模板应用样本的 analyze 证据；影响是先把 gate 前边界确认清楚。
OPTION_B: [CMD: None] 现在运行 /sp.implement；不推荐，因为该 feature 仍是文档治理，未授权生产实现。
RECOMMENDED_OPTION: A
MY_RECOMMENDATION: 我的推荐：选 A：110-template-library-template-application。它最接近当前主线，且 gate 前还需要复核 analyze 证据。
PRIMARY_THEME_SUMMARY: 110-template-library-template-application 主要用于验证模板库模板在实际 feature 中的应用链路。当前应把它当作模板机制落地样本，而不是生产实现任务。
NEXT_COMMAND_EXEC: /sp.analyze 110-template-library-template-application
NEXT_COMMAND_ID: /sp.analyze 110-template-library-template-application
NEXT_COMMAND: /sp.analyze 110-template-library-template-application 请先用几句话说明 110-template-library-template-application 的主要作用：它是模板库模板在实际 feature 中的应用链路样本，用来检查模板机制是否能被正确落地。请重点关注 template application 的 Stage Readiness、open-items.md 中未关闭事项，以及是否存在越过 analyze/gate 边界的问题。请基于 active-context、feature-map 和该 feature 的 memory/index.md 重新判断，不能把运行时或实现证据当成已授权实现。
```

For multi-agent frameworks, use this mapping:

- Hermes/OpenClaw coordinator: run `/sp.route` or `/sp.route all`, choose the
  recommended route from JSON or `NEXT_COMMAND_EXEC`, and assign one worker with
  `NEXT_COMMAND` as prompt context.
- CrewAI: represent `/sp.route` as the manager/planner task; specialized agents
  receive read-only `READ_SET` evidence and propose memory changes instead of
  writing global memory directly.
- LangGraph: model route JSON as state, use conditional edges from `status`,
  `next`, and `blockerRoute`, and serialize memory update nodes after reviewer
  approval.

If the recommendation changes the current mainline, add this switch-cost block
before `## Next Step`:

```text
## Theme Switch Cost

CURRENT_THEME: <current mainline or None>
REQUESTED_THEME: <new requested or recommended mainline>
SWITCH_COST: <extra read set, delayed closure, or verification cost>
RISK: <risk introduced by switching now>
RECOMMENDATION: <continue current theme, switch, or request decision>
NEXT_COMMAND: </sp.* or None>
```

Use these priority classes:

- `P0`: SP installation, command template, route, or mechanism drift. Fix the
  mechanism before producing more feature documents.
- `P1`: stage blocker such as missing PRD, outline, source authority, or human
  decision. Route to the owner stage.
- `P2`: active mainline readiness gap such as Stage Readiness, open-items,
  trace, or memory linkage. Fix the mainline sample before batch work.
- `P3`: analyze/gate boundary gap, such as analyze PASS but missing gate
  decision or unresolved Monitoring evidence.
- `P4`: runtime, integration, E2E, or performance evidence; only pursue after
  the feature is authorized for that phase.
- `P5`: flow/UI/governance visualization, formatting, cleanup, or refactor;
  defer until the mainline is closed.
