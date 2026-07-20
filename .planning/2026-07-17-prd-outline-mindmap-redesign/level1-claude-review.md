# Claude Review: Level 1 业务语义机制

## 主要结论

- 根因是从原始输入直接生成导图，缺少“业务对象、动作、结果、系统边界”的中间抽取步骤。
- 当前 Level 1 完成条件只验证目标、角色和核心问题，容易反向诱导模型生成“目标/用户/问题”目录。
- 根节点没有闭环语义合同，validator 也不检查输入、处理、输出和运行保障是否形成完整业务链。
- 推荐两阶段生成：先形成结构化 Business Context Inventory，再聚合业务操作簇并构造导图。
- AI 候选必须显式标记并绑定问题；Constitution 不得补业务目标、角色、能力或范围。

## Codex 裁决

- 采纳“两阶段抽取再构图”和“候选必须绑定问题”。
- 不把 `input/processing/output/governance` 四象限强制成所有项目的固定根结构；它只适合作为闭环自检维度。
- 不新增与现有 `source_status` 重复的 `src` 字段。
- 不接受依靠固定动词正则判断闭环；应以结构化业务链字段为主，语言规则只作窄范围保护。
- 保留独立 `global_constraints` map。Level 1 可以只有来自正式 Constitution/source 的适用约束，不能为了填满地图编造约束。
