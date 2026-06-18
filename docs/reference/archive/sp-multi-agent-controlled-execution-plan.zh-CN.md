# SP 多 Agent 受控执行实施记录

日期：2026-06-18

## 结论

本轮多 agent 方法论更新按“部分做”落地：先完成方法论、命令模板和模板测试层面的受控执行契约；不实现 workflow engine 真并发；默认仍采用单 agent 串行执行；多 agent 只作为满足硬闸门后的受控优化。

核心判断：

- 值得做的是受控协议、handoff、fallback、gate 审查和机械测试锚点。
- 暂不值得做的是自动并发调度、复杂冲突合并、worker 自主写共享状态。
- 如果多 agent 批次出现越界、冲突、失败、过期、不可验证或依赖闭包不成立，必须冻结批次并转入单 agent 串行恢复。

## 调研与复核

Codex 读取了本机 multi-agent 相关 skills、SP 命令模板、workflow 文档和既有方法论文档，并分别安排 Gemini 与 Claude 进行方案设计、性价比评估和最终复核。

复核结论一致：

- Gemini：建议“部分做”，阶段 1/2 有性价比，阶段 3 真并发暂缓；外部 CLI/API 的 `fetch failed`、超时、空输出和不可复现结果必须作为正式兜底触发条件。
- Claude：建议“部分做”，当前仓库事实支持模板/方法论收敛和只读校验锚点，不支持直接宣称 `fan-out/fan-in` 是可靠并发执行器。
- Codex 审核：采纳保守路线，把 multi-agent 定位为 controlled execution，而不是 autonomous execution。

## 已实施范围

本次已经修改方法论、项目模板和模板测试，形成阶段 1 的稳定基线，并为阶段 2 的只读校验保留 canonical anchors。

已落地的关键更新：

- 在 `templates/project/docs/reference/sp-command-spec.md` 增加 `## 10.3 Controlled Multi-Agent Execution`，作为受控多 agent 的 canonical contract。
- 在 `## 10.4 Stage Evidence And Mechanical Guardrails` 中承接其他阶段证据和机械 guardrails，避免把无关规则塞进 §10.3。
- 在 `/sp.tasks` 明确 `[P]` 只表示受控执行资格，不是默认并行。
- 在 `/sp.implement` 明确 worker 只能在 `Allowed Write Set` 内工作，不能直接写 shared truth files，必须返回 canonical handoff。
- 在 `/sp.analyze` 和 `/sp.gate` 强化 multi-agent closeout、fallback report、dependency closure 和 PASS 阻断规则。
- 在 `docs/reference/sp-project-methodology.md` 和 workflow/overview 文档中说明：当前 workflow `fan-out/fan-in` 不能被宣传为可靠真并发；真并发属于未来阶段。
- 在 `tests/test_sp_methodology_templates.py` 增加 canonical schema/token 顺序检查，防止模板和方法论继续发明第二套字段名。

## Canonical Contract

受控多 agent 的唯一 canonical contract 位于 `templates/project/docs/reference/sp-command-spec.md` §10.3。其他文档和模板可以保留运行时必要摘录，但不得创建第二套状态、字段或含义。

### Hard Gates

任务只有在全部硬闸门通过时，才允许进入多 agent 受控执行：

- `Allowed Write Set` 明确、狭窄，并且与同批其他 worker 不相交。
- `Required Checks` 明确，可重跑，或有具名手工验证路线。
- 依赖已经满足，不依赖其他 worker 尚未合并的输出。
- shared truth files 对 worker 只读。
- global registry-like files 默认不由 worker 拥有。
- coordinator 在派发前具备 baseline snapshot、branch/worktree/ref、clean-state record 或等价证据。

任一闸门无法检查时，默认串行。解析不确定不是通过条件。

### Worker Handoff

worker handoff 必须按顺序使用以下字段：

- `Task / Workset`
- `Status`
- `Execution Environment`
- `Allowed Write Set`
- `Actual Files Changed`
- `Anchors Affected`
- `Inputs Read`
- `Checks Run`
- `Result`
- `Evidence`
- `Proposed Shared Updates`
- `Open Items / Risks`
- `Merge Notes`

coordinator 必须比对 `Allowed Write Set` 与 `Actual Files Changed`，检查 forbidden writes，处理 `Proposed Shared Updates` 冲突，并在必要时运行 merged-state checks。worker 自报成功不是完成证据。

### Worker Status

worker 状态枚举固定为：

- `ACCEPTABLE_LOCAL`
- `NEEDS_SINGLE_AGENT_REVIEW`
- `REJECTED_BOUNDARY_VIOLATION`
- `STALE`
- `FAILED_CHECKS`

其中 `ACCEPTABLE_LOCAL` 只表示局部结果可被 coordinator 进一步摄取，不等于整批 PASS。

### Dependency Closure

依赖结果只有在所有依赖 worker 都已经合并、可独立验证，并被分类为 `ACCEPTABLE_LOCAL` 时才可接受。

`No failure signal is not completion evidence`：没有看到失败信号不等于完成。coordinator 仍必须验证 handoff 字段、实际 diff、required checks 和 dependency closure。

### Fallback Report

触发兜底后，批次关闭前必须产出 fallback report。字段顺序固定为：

- `Fallback Reason`
- `affected worker classifications`
- `changed files`
- `evidence kept`
- `discarded/deferred results`
- `single-agent recovery route`
- `next /sp.* step`

缺少 fallback report 时，`/sp.analyze` 和 `/sp.gate` 不得把该批次作为 PASS 或 CONDITIONAL 的依据。

### Shared Truth Files

shared truth files 对普通 worker 默认只读：

- `tasks.md`
- feature memory
- trace/open-items
- workset routing
- analysis
- gate
- broad status summaries

### Global Registry-Like Files

global registry-like files 默认串行处理：

- package manifests
- lockfiles
- route registries
- shared constants
- database schemas
- permission matrices
- global config
- cross-module contracts
- migrations
- event bus registries
- core type definitions

## 兜底策略

多 agent 实施必须优先保住可验证性，而不是保住并行形态。任何异常都先冻结批次，停止继续派发和合并未验证输出。

兜底触发条件包括：

- worker 实际修改文件超出 `Allowed Write Set`。
- 同批 worker 的 `Actual Files Changed` 重叠。
- worker 直接修改 shared truth files。
- worker 修改 global registry-like files，且未被指定为串行 closeout owner。
- handoff 缺关键字段或证据。
- required checks、merged-state checks 或 coordinator diff 审查失败。
- `Proposed Shared Updates` 指向同一 trace anchor、open item、task state、registry field 或 source fact，且语义冲突。
- worker stale、超时、CLI/API 失败、输出为空、模型降级后不可复现。
- coordinator 无法区分 worker diff、用户已有改动和失败尝试。

冻结后按顺序处理：

1. 收集 handoff、diff、执行环境、检查输出和失败原因。
2. 按 canonical worker status enum 分类所有 worker。
3. 把 shared truth 和 global registry 改动视为未授权，除非它们属于明确的串行 closeout owner。
4. 只保留可独立验证、未越界、未冲突的 `ACCEPTABLE_LOCAL` 局部结果。
5. 对其余结果使用 `NEEDS_SINGLE_AGENT_REVIEW`、`REJECTED_BOUNDARY_VIOLATION`、`STALE` 或 `FAILED_CHECKS` 路线处理。
6. 生成 fallback report，并把剩余工作拆回单 agent 串行恢复。

禁止在兜底阶段用破坏性 git 命令清理现场，除非用户明确批准。无法安全区分用户改动和 worker 改动时，停止自动清理并给出选项。

## 阶段路线

### 阶段 1：已完成

方法论、模板和测试层收敛已经完成。当前重点是让 `/sp.tasks`、`/sp.implement`、`/sp.analyze`、`/sp.gate` 在受控多 agent 场景下使用统一字段、状态和 fallback 规则。

### 阶段 2：后续可做

阶段 2 是只读静态校验，不负责启动 worker。可考虑增加校验入口或增强现有检查，用于阻断明显不安全的 `[P]` 任务：

- `[P]` task 缺 `Allowed Write Set` 或 `Required Checks`。
- 同批写集相交。
- 写集过宽或解析不确定。
- 命中 shared truth files 或 global registry-like files。
- handoff 的 `Actual Files Changed` 越出声明写集。
- fallback report 缺字段或状态枚举不合法。

阶段 2 的原则是窄而硬：能确定则阻断，无法解析则降级串行，不做语义猜测。

### 阶段 3：暂缓

workflow engine 真并发暂不实施。只有阶段 1/2 跑稳、项目出现明确吞吐瓶颈，并且愿意完整投入以下能力时，才重新评估：

- bounded concurrency
- worker isolation
- timeout/stale handling
- blocking fan-in
- structured result collection
- actual diff conflict detection
- single-agent recovery plan

在这些能力缺失前，不应宣称 SP 支持可靠并发实现。

## 最终判断

受控多 agent 值得“部分做”。本次已经完成最有性价比的一层：canonical methodology、runtime template contract 和模板测试。它能降低误派发、越界写、虚假成功和 `fan-out` 误解风险，同时避免引入复杂运行时并发机制。

后续如果继续扩展，应先增强 canonical schema 或机械校验锚点，减少规则重复；不要直接跳到 engine 真并发。
