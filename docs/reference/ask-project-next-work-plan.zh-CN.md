# ASK 项目下一步工作建议方案

## 结论

ASK 项目不应马上批量重建所有 feature，也不应直接进入 `/sp.implement`。正确路线是：

1. 先刷新 ASK 当前安装的 SP 命令机制，使其和 `speckit-layered` 当前模板一致。
2. 选一个代表性 feature 做完整迁移样本，建议选 `124-migration-remediation`。
3. 用样本验证 PRD、spec-outline、Stage Readiness、open-items、analyze、gate 的新链路。
4. 样本通过后，再分批修复其他 feature。

理由：ASK 当前已有 30 个 `spec.md`，但没有 `prd.md` 和 `spec-outline.md`。如果直接批量重写，很容易制造更多文档产物，却不能解决“下一步不明确”和“阶段状态不可信”的根问题。

## 当前判断

### 1. ASK 的 SP 命令机制需要先升级

ASK 当前 `.gemini/commands/sp.specify.toml` 是旧逻辑。它把 `/sp.specify` 当作需求入口和 PRD-like refinement，并明确不建议 `/sp.prd`。

这和当前新版机制不一致。新版机制要求：

- 新 feature 或重要需求变化先走 `/sp.prd`。
- `prd.md` 记录上游需求、候选项、拒绝项、开放问题。
- `spec-outline.md` 判断是否 `READY_FOR_SPECIFY`。
- `/sp.specify` 只把已确认、可稳定化的内容写入 `spec.md`。
- 后续阶段通过 Stage Readiness 判断是否能进入 flow、plan、tasks、analyze 或 gate。

因此 ASK 的第一步不是修某个 feature 文档，而是刷新命令机制。

### 2. ASK 不应直接跑 `/sp.implement`

`124-migration-remediation` 当前被描述为文档治理 feature，并且 OPEN-002 仍是 Monitoring。含义是：运行时、集成、E2E、性能证据尚未完整补齐。

这不阻塞 `/sp.analyze PASS`，但阻止把它说成“运行证据已补齐”，也不授权生产代码实现。

明确禁止：

```text
/sp.implement 124-migration-remediation
```

除非后续 `/sp.gate` 明确写出：

```text
NEXT_ALLOWED_STAGE: implement
IMPLEMENT_AUTHORIZED: yes
```

否则不要实现。

### 3. “是否需要 gate”不应交给人工判断

对 `124-migration-remediation`，当前明确建议是：

```text
/sp.gate 124-migration-remediation
```

原因：

- `/sp.analyze PASS` 只说明文档分析链路通过。
- OPEN-002 仍是 Monitoring，说明证据状态不是 complete。
- 需要 `/sp.gate` 给出阶段准入结论：继续治理、补证据、条件通过，还是阻塞。

这不是“如果你需要阶段入口判断”。这是当前状态下的默认下一步。

## 推荐执行方案

### 阶段 0：冻结误操作

目标：避免旧机制继续生成不一致产物。

立即规则：

- 暂停 ASK 内所有 `/sp.implement`。
- 暂停批量重跑 30 个 feature。
- 暂停新增 governance/flow 可视化产物，除非它们是某个阻塞项的直接证据。
- 所有新 SP 输出必须包含明确 `NEXT_ACTION` 和 `NEXT_COMMAND`。

完成标准：

- 团队认可当前只做机制刷新和样本迁移。
- 后续命令不再使用“如果需要阶段入口判断”这类模糊建议。

### 阶段 1：刷新 ASK 的 SP 安装机制

目标：让 ASK 项目的 Gemini 命令和当前 `speckit-layered` 模板一致。

建议动作：

```text
在 /Users/hula/Projects/ASK 中刷新 Gemini 集成命令。
```

执行前应先做备份或 git diff 检查，避免覆盖 ASK 中未提交的人工修改。

完成标准：

- `.gemini/commands/sp.specify.toml` 不再包含“Do not add or suggest a separate /sp.prd command”。
- `/sp.specify` 包含 `prd.md`、`spec-outline.md`、`READY_FOR_SPECIFY`、Stage Readiness 相关规则。
- `/sp.analyze`、`/sp.gate`、`/sp.specify` 都有统一 Next contract。
- 旧的 `Suggest /sp.clarify` 单行下一步不再作为最终输出规则。

### 阶段 2：选 `124-migration-remediation` 做样本迁移

目标：用一个真实 feature 验证新机制，而不是一次性修 30 个。

建议样本：

```text
124-migration-remediation
```

选择原因：

- 它已经暴露出明确状态：`BLOCKED`、缺第二层 artifacts、缺 feature memory 或任务证据。
- 它包含 OPEN-002 Monitoring 这类典型“不阻塞 analyze，但阻止运行证据完整声明”的问题。
- 它适合作为 analyze → gate 边界的回归样本。

完成标准：

- 存在 `specs/124-migration-remediation/prd.md`。
- 存在 `specs/124-migration-remediation/spec-outline.md`。
- `spec-outline.md` 明确是否 `READY_FOR_SPECIFY`。
- `spec.md` 包含 Stage Readiness。
- `memory/open-items.md` 中 OPEN-002 有 owner、影响、关闭条件、证据路径和下一次刷新条件。
- `/sp.analyze 124-migration-remediation` 输出明确下一步。
- `/sp.gate 124-migration-remediation` 给出 PASS、CONDITIONAL_PASS 或 BLOCKED，不把判断交给人工。

### 阶段 3：对 `124` 运行 gate，取得阶段准入结论

目标：把“当前该做什么”变成机器输出的明确结论。

建议命令：

```text
/sp.gate 124-migration-remediation
```

期望输出必须包含：

```text
SP_STATUS: PASS | CONDITIONAL_PASS | BLOCKED
NEXT_ACTION: <明确动作>
NEXT_COMMAND: <唯一首选命令或 None>
DO_NOT_RUN: /sp.implement 或 None
CAN_CONTINUE: yes | no
```

可能结果：

- `BLOCKED`：先补 OPEN-002 或缺失 memory/trace/tasks 证据。
- `CONDITIONAL_PASS`：允许进入某个非实现阶段，但必须保留 Monitoring 风险。
- `PASS`：只说明 gate 通过；仍需看 `NEXT_ALLOWED_STAGE` 是否允许 implement。

如果 gate 没有明确 `NEXT_ACTION`，则 gate 输出不合格，应修 SP 命令模板，而不是让人工解释。

### 阶段 4：形成迁移模板，再分批修复其他 feature

目标：把 `124` 的修复路径变成可复用模式。

建议分批：

1. 阻塞型 feature：已有 `BLOCKED`、缺 memory、缺 tasks、缺 source evidence。
2. governance-only feature：如 `001-top-level-baseline`、`021-cross-cutting-baseline`，明确保持非 implement-ready。
3. 业务 feature：需要补 PRD、outline、Stage Readiness 后再进入 analyze/gate。
4. flow-heavy feature：先确认 flow 是否有对应需求和证据，不要只补图。

每批完成标准：

- 不以 `spec.md` 存在作为完成标准。
- 不以 flow 图存在作为完成标准。
- 不以 `Open Issue Codes: None` 作为完成标准。
- 以 Stage Readiness、open-items 关闭条件、analyze/gate 明确结论作为完成标准。

## 是否应该重建 SP 机制文档

建议：要重建，但不要先重写所有业务 feature。

优先级如下：

1. 先重建/刷新 SP 机制文档和命令模板。
2. 再修 `124-migration-remediation` 作为样本。
3. 再制定 ASK 全量 feature 迁移清单。
4. 最后按批次修复各阶段文件。

不建议：

- 直接批量生成 30 个 `prd.md`。
- 直接批量生成 30 个 `spec-outline.md`。
- 直接把现有 `spec.md` 包装成 READY。
- 直接跑 `/sp.implement`。

## ASK 的下一条明确建议

当前下一步不是实现，也不是批量修所有 feature。

明确下一步：

```text
刷新 ASK 项目的 SP/Gemini 命令安装，使其采用当前 speckit-layered 的新版 PRD、spec-outline、Stage Readiness 和统一 Next contract。
```

刷新后第一条业务验证命令：

```text
/sp.gate 124-migration-remediation
```

如果刷新前就必须继续处理 `124`，则只允许做文档治理修复：

```text
补齐 124 的 prd.md、spec-outline.md、Stage Readiness 和 OPEN-002 证据关闭条件。
```

禁止动作：

```text
/sp.implement 124-migration-remediation
```

直到 gate 明确授权实现。
