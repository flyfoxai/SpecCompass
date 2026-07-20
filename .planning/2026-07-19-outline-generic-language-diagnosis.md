# PRD Outline Level 1 套话问题诊断

## 问题描述

用户反馈：运行 `prd` 命令后，生成的 outline 里面 Level 1 出现的都是一些套话，不是符合项目实际情况的话语。

## 根本原因分析

经过检查 `templates/commands/prd.md` 和相关规划文档，我发现了以下几个导致套话问题的根源：

### 1. **Stage A 能力提取不充分**

**问题位置**: `prd.md` 第 174-179 行

**问题表现**:
- Stage A 要求提取 `capability_atoms`（能力原子），但这个过程是"工作上下文中的推理合同"，不会序列化到最终 JSON 中
- 模型可能在还没有真正提取具体业务对象、动作、结果之前，就急于生成地图标题和摘要
- 提示词说"Do not draft map titles, summaries, candidate projects, or generic overview copy before Stage A is complete"，但没有强制要求先输出能力覆盖表的验证步骤

**为什么会产生套话**:
当模型跳过或草率完成 Stage A 时，它缺乏具体的业务语义锚点，只能用通用词汇填充：
- "当前理解"、"全局认知"、"项目概览" 等元认知表达
- "处理业务对象"、"形成业务闭环"、"保障系统稳定" 等空洞动词
- 没有具体的 `business_objects`、`operations`、`outcomes` 来支撑业务地图

### 2. **跨领域替换测试（Cross-domain Substitution Test）执行不彻底**

**问题位置**: `prd.md` 第 188 行

**测试定义**:
> Apply a cross-domain substitution test: if a sentence could move unchanged between two unrelated domains after only replacing the product name, it is generic boilerplate and must be replaced with source-backed terminology or an explicit evidence gap.

**为什么失败**:
- 这个测试要求在 Stage C（语义质量门禁）和最终的可见文案清理阶段都执行
- 但这是一个**隐式判断规则**，没有显式的验证步骤或失败时的回退机制
- 模型可能自认为通过了测试，但实际上生成的内容仍然是通用的

**套话案例**:
```
❌ "先确认产品目标和核心用户，不在本轮假定完整范围"
   → 可以用在任何产品，没有领域特异性

❌ "通过少量高价值候选和用户直接输入，把模糊想法收敛为可继续完善的产品大纲"
   → 这是描述 PRD 过程本身，不是目标业务系统

✅ "通过实时市场数据和策略信号，生成风险评估结果并提交订单到交易所"
   → 有具体的业务对象（市场数据、策略信号、订单）和动作（评估、提交）
```

### 3. **Stage C 质量门禁的软失败模式**

**问题位置**: `prd.md` 第 186-188 行

**现状**:
```
- If Stage C fails, re-extract or regroup once. 
- If it still fails, remain in `explore` and expose the exact missing evidence...
- Never fill a title, summary, candidate, recommendation, or question with process commentary or generic prose
```

**问题**:
- "re-extract or regroup once" 只允许重试一次
- 如果两次都失败，要求"remain in `explore` and expose the exact missing evidence"
- 但实际执行中，模型可能：
  1. 误判自己通过了 Stage C
  2. 或者在第二次重试时降低标准，用套话"勉强通过"
  3. 没有显式的"我正在重新提取"的状态标记

### 4. **禁用词列表不足以防止抽象化**

**问题位置**: `prd.md` 第 183、187、188 行

**现有机制**:
- 明确禁用了实现层词汇：API, service, engine, adapter, database, queue, UI, BI, center/中心, hub/枢纽, platform/平台...
- 明确禁用了元认知表达："current understanding", "global cognition", "project overview"...
- 要求拒绝空洞动词：manage, handle, support, organize, build, optimize, coordinate, ensure...

**为什么仍然不够**:
1. **组合绕过**: "策略管理中心" → 禁用了"中心"，但模型可能用"策略处理模块"
2. **限定词伪装**: "handle business objects" 被禁止，但 "handle risk assessment business logic" 看起来有限定词，实际仍然空洞
3. **过程导向替代**: 不说"管理"，改说"确认产品目标和核心用户" —— 这仍然是 PRD 过程，不是业务系统

### 5. **优先级倒置：密度预算 vs 业务完整性**

**问题位置**: `prd.md` 第 195 行

```
density_budget: 
  max_visible_nodes_per_map: 18
  max_depth: 3
  max_children_per_node: 4
  layer_balance_min_nodes: 8
  max_layer_share: 0.6
```

**冲突**:
- 提示词说"Density is a presentation constraint... do not reduce the candidate count or merge capability atoms to make a map fit"
- 但实际生成时，模型可能为了满足密度预算而：
  1. 过早概括，用抽象词汇代替具体业务术语
  2. 合并本该独立的能力原子
  3. 用一个"杂项桶"（如"数据、配置与风险"）来压缩节点数

### 6. **Level 1 原子拆分合同执行不力**

**问题位置**: `prd.md` 第 174-179 行（Stage A/B），以及规划文档中的最新修复

**最新规则**（来自 `.planning/2026-07-19-prd-prompt-live-test/findings.md`）:
> Approved repair: initial Level 1 Discovery is atom-first. One source-backed responsibility atom owns one trigger/input, one state, one independently accepted result, and one handoff; it maps one-to-one to one business chain and one candidate project.

**问题**:
- 这个"原子优先"规则是**最近（2026-07-19）才加强的**
- 在此之前，模型可以把多个独立业务能力合并成一个"核心闭环"
- 即使现在有了规则，模型仍然可能：
  1. 提取原子时就已经过度抽象
  2. 在 capability_atoms 列表中用通用描述代替具体业务事实
  3. 跳过能力覆盖表的详细构建，直接生成候选项目

## 具体失败案例重现

假设用户输入："我们需要一个交易系统"

### 套话模式的生成路径：

1. **Stage A 草率执行**:
   ```
   product_subject: "交易系统"
   business_objects: ["交易", "订单", "用户"]  // 太泛化
   operations: ["处理", "管理", "执行"]  // 空洞动词
   outcomes: ["成功", "失败"]  // 没有业务含义
   capability_atoms: [
     "处理交易请求",  // ❌ 没说什么交易，如何处理
     "管理订单状态",  // ❌ 空洞动词
     "执行风控检查"   // ❌ 什么风控，检查什么
   ]
   ```

2. **Stage B 生成通用候选**:
   ```
   候选项目:
   - "核心交易处理" // ❌ 什么是核心？处理什么？
   - "订单管理中心" // ❌ 禁用词"中心"，且"管理"空洞
   - "风险控制平台" // ❌ 禁用词"平台"，且没说控制什么风险
   ```

3. **Stage C 误判通过**:
   - 模型自检："我有业务对象（交易、订单）、动作（处理、管理）、结果（成功）"
   - 但实际上：
     - ❌ 跨领域测试失败：这些词可以用在任何系统
     - ❌ 没有具体的业务状态：订单的什么状态？从哪到哪？
     - ❌ 没有独立可验证的结果：什么叫"成功"？谁验收？

### 正确的生成路径应该是：

1. **Stage A 充分提取**:
   ```
   product_subject: "股票程序化交易执行系统"
   business_objects: [
     "市场实时行情（价格、成交量、tick数据）",
     "交易策略信号（买入/卖出触发条件）",
     "风险评估结果（仓位限制、止损触发）",
     "订单执行记录（提交时间、成交确认、滑点）",
     "交易所回执（成交通知、拒单原因）"
   ]
   operations: [
     "采集券商接口的实时行情推送",
     "根据策略模型生成交易信号",
     "计算当前仓位的风险敞口",
     "向交易所提交限价/市价订单",
     "接收并核对交易所成交回执"
   ]
   outcomes: [
     "行情数据缓存更新完成，延迟 < 100ms",
     "策略信号生成，包含目标价、数量、方向",
     "风险评估通过/拒绝，附带拒绝原因",
     "订单已提交到交易所，获得订单号",
     "成交确认已记录，实际成交价与预期偏差已计算"
   ]
   capability_atoms: [
     atom_1: {
       label: "实时行情数据采集",
       trigger: "券商推送新tick",
       owned_state: "最新市场价格快照",
       operation: "解析推送、更新缓存、触发策略检查",
       primary_outcome: "行情数据可用于策略计算",
       downstream_handoff: "推送行情事件给策略引擎"
     },
     atom_2: {
       label: "交易策略信号生成",
       trigger: "行情变化事件",
       owned_state: "策略持仓意图（目标仓位、价格）",
       operation: "执行策略算法、生成买卖信号",
       primary_outcome: "策略信号已生成，包含方向和目标",
       downstream_handoff: "发送信号给风控评估"
     },
     // ... 每个原子都有具体的业务语义
   ]
   ```

2. **Stage B 生成具体候选**:
   ```
   候选项目:
   - "市场行情数据采集与分发"
     owned: 券商接口接入、tick数据解析、行情快照存储
     outcome: 策略和监控可用的实时价格数据
     handoff: 推送行情事件给策略引擎和监控面板
     
   - "交易策略信号生成"
     owned: 策略模型执行、信号计算、持仓意图管理
     outcome: 可执行的买卖信号（品种、方向、价格、数量）
     handoff: 发送信号给风控评估
     
   - "风险评估与订单把关"
     owned: 仓位限制检查、止损触发判断、合规规则验证
     outcome: 信号通过/拒绝决策，拒绝时附带原因
     handoff: 通过的信号发送给订单执行
   ```

3. **Stage C 真正通过**:
   - ✅ 跨领域测试：这些词无法用在电商、CRM、内容管理系统
   - ✅ 有具体状态：行情快照、持仓意图、通过/拒绝决策
   - ✅ 有独立可验证结果：数据延迟、信号质量、拒单率

## 现有机制的缺陷总结

| 机制 | 意图 | 为什么不够 | 症状 |
|------|------|------------|------|
| Stage A 能力覆盖表 | 先提取再生成 | 覆盖表是隐式的，没有序列化验证 | 模型跳过详细提取，直接写通用候选 |
| 跨领域替换测试 | 识别通用套话 | 依赖模型自判，没有外部验证器 | 模型误认为通过，实际上仍是套话 |
| Stage C 质量门禁 | 最后一道防线 | 只允许重试一次，软失败模式 | 第二次重试时降低标准 |
| 禁用词列表 | 屏蔽常见套话 | 可以用同义词或组合绕过 | "管理" → "处理"，"中心" → "模块" |
| 密度预算 | 保持可读性 | 与业务完整性冲突时，模型倾向于概括 | 用抽象词压缩节点 |
| 原子优先规则 | 防止过度聚合 | 刚刚加强（2026-07-19），执行不稳定 | 仍然产生"核心闭环"式的大候选 |

## 建议的修复方向

### 短期修复（提示词调整）

1. **强制 Stage A 可见化**:
   ```
   Before Stage B, you MUST output (in your internal reasoning or a commented section):
   - 3-5 concrete business_objects with their states
   - 3-5 operations with specific inputs/outputs
   - 3-5 outcomes with measurable criteria
   
   If you cannot list these with domain-specific terms, STOP and set status to NEEDS_PRD.
   ```

2. **显式跨领域测试检查点**:
   ```
   After generating each candidate title/summary, append in comments:
   <!-- Cross-domain test:
   - Domain A (current): [交易系统] → "实时行情数据采集与分发"
   - Domain B (test): [电商系统] → ❌ 不适用，因为电商没有"行情"和"tick数据"
   - Verdict: ✅ PASS
   -->
   ```

3. **Stage C 重试状态标记**:
   ```
   <!-- Stage C Attempt 1: FAIL
   Reason: candidate "核心交易处理" uses generic verb "处理"
   Action: Re-extracting with focus on specific operations
   -->
   
   <!-- Stage C Attempt 2: PASS
   Revised to: "订单提交与成交确认" with concrete operations
   -->
   ```

### 中期修复（验证器增强）

1. **添加术语具体性评分**:
   - 在 `validate-review-data.mjs` 中添加 NLP 检查
   - 对每个候选标题/摘要计算"通用词比例"
   - 超过阈值时拒绝整个 payload

2. **强制原子字段序列化**:
   - 将 `capability_atoms` 从"工作上下文"变成 schema v4 的必需字段
   - 要求每个原子必须有 `trigger_kind`, `owned_state`, `primary_outcome_ref`
   - 验证器检查原子 ↔ 链 ↔ 候选的一对一映射

3. **跨领域测试自动化**:
   - 提供一个"反例领域库"（电商、CRM、内容管理、IoT...）
   - 验证器尝试将候选标题套用到反例领域
   - 如果语义仍然通顺，标记为通用套话

### 长期修复（架构改进）

1. **分离提取与生成阶段**:
   - Stage A 单独运行，生成可审计的 `capability-extraction.json`
   - 用户或验证器确认提取质量后，才进入 Stage B
   - 提取结果成为不可篡改的输入

2. **引入领域本体库**:
   - 为常见领域（交易、电商、内容、企业软件）提供参考本体
   - 模型生成时可以参考，但不能直接复制
   - 验证器检查生成内容是否比参考本体更具体

3. **用户反馈循环**:
   - 在 Discovery 界面中加入"套话举报"按钮
   - 收集用户标记的套话案例，作为反例训练数据
   - 定期更新禁用词列表和验证规则

## 为什么最近的修复还不够

从 `.planning/2026-07-19-prd-prompt-live-test/` 可以看到，团队刚刚（2026-07-19）完成了"原子优先"规则的加强：

> Approved repair: initial Level 1 Discovery is atom-first. One source-backed responsibility atom owns one trigger/input, one state, one independently accepted result, and one handoff; it maps one-to-one to one business chain and one candidate project.

**这个修复的局限**:
1. **只解决了聚合问题**：防止把 5 个能力合并成 1 个"核心闭环"
2. **没有解决抽象化问题**：原子本身仍然可以是"处理业务对象"
3. **验证器滞后**：CLI 和浏览器验证器还没有完全实现新的一对一检查（从 progress.md 看，第 8 阶段刚完成）

**为什么用户仍然看到套话**:
- 如果用户的项目是在 2026-07-19 之前初始化的，模板可能是旧版本
- 即使拿到了最新模板，模型执行新规则时仍可能在 Stage A 提取阶段产生通用原子
- 验证器虽然检查了原子数量和映射关系，但**没有检查原子的语义具体性**

## 对用户的诊断建议

1. **检查模板版本**:
   ```bash
   specify check
   # 查看是否 >= 0.11.2（包含最新原子优先规则）
   ```

2. **刷新项目模板**:
   ```bash
   specify init --here --force --integration codex
   ```

3. **重新运行 PRD**:
   ```bash
   /sp.prd <feature>
   ```
   并在输入中**明确提供**:
   - 具体的业务对象及其状态（不要只说"订单"，说"待支付订单 → 已确认订单"）
   - 具体的动作及其输入输出（不要只说"处理"，说"接收支付回调 → 更新订单状态 → 发送发货通知"）
   - 具体的可验证结果（不要只说"成功"，说"发货通知已送达物流系统，获得物流单号"）

4. **检查生成的 `outline-discovery-data.json`**:
   - 查看 `business_context.capability_atoms`（如果有的话）
   - 检查每个原子是否有具体的 `trigger_or_input`, `owned_state`, `primary_outcome_ref`
   - 对每个候选项目标题做"跨领域测试"：能否用在电商/CRM/内容系统？

5. **如果仍然是套话**:
   - 在 Discovery 响应中选择 `context_note`，明确指出哪些是套话
   - 提供具体的业务术语替换建议
   - 或者回到 `/sp.prd`，补充更详细的业务背景

## 结论

**套话问题的本质**：
- 不是提示词缺少禁用规则（已经很详细了）
- 而是**提取阶段（Stage A）质量不足 + 质量门禁（Stage C）执行不力**

**关键缺失**：
- Stage A 的能力覆盖表是隐式的，没有强制序列化和外部验证
- 跨领域替换测试依赖模型自判，没有自动化验证器
- 即使有原子优先规则，原子本身的语义具体性没有被检查

**修复优先级**：
1. ⚡ 立即：升级到 0.11.2，刷新模板
2. 🔧 短期：在提示词中加入 Stage A 可见化要求和显式检查点
3. 🏗️ 中期：增强验证器，检查术语具体性和原子语义质量
4. 🌐 长期：分离提取与生成，引入领域本体库和用户反馈循环
