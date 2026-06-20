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
ROOT_BLOCKER_FAMILY: <root blocker family or None>
FIRST_FIX: <first problem to solve before broader work>
DEFERRED_WORK: <work explicitly postponed>
READ_SET: <smallest project/feature evidence set used or recommended>
PRIORITY_CLASS: P0 | P1 | P2 | P3 | P4 | P5

## Next Step

NEXT_ACTION: <one concrete action; do not write "if needed" or "consider">
NEXT_COMMAND: </sp.* or None>
WHY_THIS_NEXT: <why this is the next safe step>
DO_NOT_RUN: <commands that would be unsafe now, or None>
```

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
