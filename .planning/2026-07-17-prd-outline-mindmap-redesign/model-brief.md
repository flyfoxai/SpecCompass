# PRD Outline XMind 式导图调整评审简报

你正在评审 SpecCompass 的 `/sp.prd` Outline 交互调整。请只分析和提出方案，不编辑文件。用中文，控制在 1800 字以内，结论必须具体、可落地。

## 用户要求

当前 Outline 的展示方式不妥。应通过类似 XMind 的思维导图展示项目全局；一个导图显示不全时可以拆成多个导图。选项应基于导图中的某个分支；政策性、合规性或其他影响全局的内容，可以单独拉出进行选择。

## 当前实现合同

1. Outline 成熟度是 `explore | frame | specify_ready`。
2. 一级、二级使用 Discovery：每个问题 2-4 个候选、推荐理由、“以上都不适用”和自由输入；响应写入 append-only intent ledger，但不能授权 `/sp.specify`。
3. 三级使用 Formal Confirmation：当前是 `intent_map`、`scope_slice`、`readiness_authority` 三视图；确认绑定 Review Data ID、Outline Digest、Source Authority IDs。
4. `[src:ai-proposed]` 不能自动成为事实；用户新增为 `[src:user]`，接受候选为 `[src:user-confirmed]`。
5. 当前候选和写回已有稳定 question/candidate/target/delta ID，以及 `confirm_candidate | add | replace | exclude | context_note` 操作。
6. 浏览器不直接写仓库，下载响应包后由下一次 `/sp.prd` 验证消费。

## 请重点回答

1. 你怎样理解用户真正要解决的问题？哪些是视觉问题，哪些是信息架构或决策合同问题？
2. 给出 2-3 个可实施架构选项，说明取舍并明确推荐一个。
3. 推荐方案中：
   - 全局总图和多个分图按什么规则拆分、如何导航？
   - 普通分支选项如何绑定节点并回写？
   - 政策/合规/平台原则等横切议题如何单列，同时表达影响范围？
   - 一级、二级、三级分别展示什么、允许什么操作？
   - schema 最少需要新增哪些稳定字段？
   - 如何保留现有 ledger、来源标签、digest 和正式确认边界？
4. 指出最危险的 5 个失败模式及对应约束。
5. 给出最小可实施切片、明确延后项和验收标准。

不要建议直接读写 XMind 专有文件；“XMind 式”指树形思维导图交互。不要把 Flow、UI、API、数据库或实现任务塞入 Outline。
