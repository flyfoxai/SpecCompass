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
route. By default this command only reports the route; with explicit
`/sp.route y` input it may hand off to the recommended command when the route
JSON says continuation is safe.

Rules:
- Run `{SCRIPT}` from the repository root and parse the JSON result.
- Treat the script output as deterministic routing evidence, not a prompt for
  freeform inference.
- Preserve script purity: the shell/PowerShell route scripts only emit JSON and
  never execute slash commands.
- Do not auto-execute: downstream dispatch is allowed only by this command
  template in explicit `y` mode after the route payload permits it.
- Default mode: if the user input does not contain the standalone word `y`,
  do not execute the returned `next` command.
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

## Output

Return the route payload and a concise human-readable explanation. In default
mode, do not run the downstream command. In explicit `y` mode, emit the
downstream `EXECUTE_COMMAND` only when the route payload permits it.
