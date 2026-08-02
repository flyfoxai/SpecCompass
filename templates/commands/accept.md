---
description: Accept all current recommended review options, save the formal confirmation, and optionally advance.
scripts:
  sh: node .specify/review/scripts/serve-review.mjs
  ps: node .specify/review/scripts/serve-review.mjs
---

## User Input

```text
$ARGUMENTS
```

# /sp.accept

Use this explicit authorization command after the current Outline, Flow, or UI
review data has been generated. It accepts every current `recommended_option`,
writes the fixed formal confirmation document, and can continue through the
owning stage consumer to that stage's normal successor.

## Syntax

```text
/sp.accept <outline|flow|ui> <feature> [--advance]
```

`outline` means the formal Outline confirmation inside `/sp.prd`; Outline
Discovery is not eligible because it records source deltas rather than a batch
confirmation. The default saves the confirmation and stops. `--advance` means
save, consume the confirmation through the owning command, and then dispatch the
normal successor.

## Mechanical Acceptance

1. Parse exactly one review stage, one explicit feature, and optional
   `--advance`. Reject missing, duplicate, or unknown arguments.
2. Run the matching headless writer from the repository root:

   ```text
   {SCRIPT} --<outline|flow|ui> <feature> --accept-recommended [--accept-advance]
   ```

   Append the internal `--accept-advance` audit marker if and only if the user
   supplied `/sp.accept ... --advance`. The writer never dispatches the next
   command itself.

3. Parse the single JSON result. Require `ok: true`,
   `accepted_mode: explicit_recommended_command`, the expected fixed target,
   and this consume command mapping:

   - `outline` -> `/sp.prd <feature> --consume-review-confirmation`
   - `flow` -> `/sp.flow <feature> --consume-review-confirmation`
   - `ui` -> `/sp.ui <feature> --consume-review-confirmation`

The writer re-reads and validates current review data while holding the target
write lock. It accepts only options named by `recommended_option`, rejects a
recommended exit that still starts with `needs-decision`, records every target,
and atomically writes the fixed `*-confirmation.md`. An explicit `/sp.accept`
invocation also authorizes ordinary `critical` recommendations one by one and
records their count. It never authorizes an Outline boundary adjustment or
adoption review; those keep their dedicated digest-bound owner decision.

Do not modify review data, synthesize missing recommendations, reinterpret
options, or fall back to browser localStorage. Validation failure, stale data,
a missing recommendation, an unresolved recommended exit, a dedicated Outline
boundary decision, or a write conflict stops the command without advancing.

## Advance

Without `--advance`, return the writer result and its exact consume command.

With `--advance`, emit the consume command first and wait for its result:

```text
EXECUTE_COMMAND: sp.<prd|flow|ui>
EXECUTE_COMMAND_INVOCATION: /sp.<prd|flow|ui> <feature> --consume-review-confirmation
```

The owning command must recompute identity, validate the formal confirmation,
and update Stage Readiness. If it fails, stops, requests a decision, or does
not reach its documented ready state, stop. Do not dispatch a successor.

Before selecting the successor for `outline`, resolve whether the accepted
feature is the explicit Portfolio root from its `000-*` identity,
`specs/review-index.json`, or `outline-boundaries.json`. A root Outline is
successfully consumed when `/sp.prd` confirms the current decomposition and
handoffs; it must never be required or allowed to reach implementation
`READY_FOR_SPECIFY` itself.

After successful consumption, dispatch exactly one normal successor:

- root `outline` -> `EXECUTE_COMMAND: sp.route` with
  `EXECUTE_COMMAND_INVOCATION: /sp.route all`; use the route result to select an
  explicit `001+` implementation child, never `/sp.specify <root-feature>`
- non-root `outline` -> `EXECUTE_COMMAND: sp.specify` with
  `EXECUTE_COMMAND_INVOCATION: /sp.specify <feature>`
- `flow` -> `EXECUTE_COMMAND: sp.ui` with
  `EXECUTE_COMMAND_INVOCATION: /sp.ui <feature>`
- `ui` -> `EXECUTE_COMMAND: sp.gate` with
  `EXECUTE_COMMAND_INVOCATION: /sp.gate <feature>`

Wait for the successor result before claiming that the next stage started or
completed. `/sp.accept` never dispatches `/sp.implement` and never skips gate,
readiness, open-item, source, or identity checks.

## Output

Report the review type, feature, confirmation path, accepted recommended count,
accepted critical count, consume result, whether `--advance` was requested, and
the successor result when one was dispatched. On failure, report the exact
failed gate and the safe retry or owner route.

## Next

```text
OPTION_A: [CMD: /sp.accept <outline|flow|ui> <feature> --advance] 消费当前确认并推进一个明确的下一阶段。
OPTION_B: [CMD: /sp.accept <outline|flow|ui> <feature>] 只保存确认，暂不调度下一阶段。
OPTION_C: [CMD: None] 发现缺推荐、未决出口或专用边界决策时，先回到所属 owner 命令修复。
RECOMMENDED_OPTION: A
MY_RECOMMENDATION: 我的推荐：选 A：确认文档已经显式授权且阶段消费通过后，再推进唯一下一阶段。
NEXT_ACTION: 按本次结果执行消费命令，并只在消费成功后执行映射的 successor。
NEXT_COMMAND_EXEC: <writer 返回的 consume 或 successor 命令；失败时 None>
NEXT_COMMAND_ID: <与 NEXT_COMMAND_EXEC 相同；无安全命令时 None>
NEXT_COMMAND: <writer 返回的精确命令加中文上下文；无安全命令时 None>
WHY_THIS_NEXT: 保持 review identity、owner approval、Stage Readiness 和下游 gate 的连续校验。
DO_NOT_RUN: 在 writer 或消费失败时不要直接运行 successor 或 /sp.implement。
```

`NEXT_COMMAND` 必须是一整行 copy-pasteable 命令；Do not split the prompt into a separate field. The final `text` fenced code block contains only the `NEXT_COMMAND` value. Do not put `OPTION_A/B/C`, labels, or explanations inside that final copy box.

最终输出的最后一个 `text` fenced code block 只能包含 `NEXT_COMMAND` 值本身：

```text
<NEXT_COMMAND>
```
