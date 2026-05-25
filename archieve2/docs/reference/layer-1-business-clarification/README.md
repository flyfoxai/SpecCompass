# 第一层：业务澄清层

这是 `Speckit 分层项目` 的第一层，用来在进入交付设计文档之前，先把业务逻辑本身梳理清楚。

它解决的问题不是“界面怎么画”或“代码怎么写”，而是以下这些更容易被大模型跳过的核心问题：

- 这件事到底要解决什么业务问题
- 谁在参与，谁有决策权，谁只是被动接受结果
- 主流程是什么，哪些分支必须补齐
- 异常流程、边界条件、冲突规则是什么
- 哪些内容已经明确，哪些仍然是待确认事项

## 适用场景

- 需求刚出现，信息零散，还不适合直接进入开发
- 大模型容易“野蛮生长”，需要被强制约束在业务分析步骤中
- 团队需要先统一业务口径，再进入 PRD、原型和任务文档整理
- 一个功能涉及全局配置、项目配置、例外规则、权限或状态切换

## 本层目标

第一层只做三件事：

1. 把业务问题讲清楚
2. 把决策点、规则和边界补齐
3. 产出可以交给第二层继续落地的结构化结果

第一层不会直接输出：

- UI 设计稿
- 技术架构方案
- 数据库设计
- 完整开发任务拆解

这些属于第二层。

## 推荐工作流

1. 先阅读 [模板](./templates/business-clarification-template.md)
2. 再使用 [引导提示词](./prompts/business-facilitator-system-prompt.md) 驱动大模型逐段澄清
3. 用 [澄清闸门清单](./checklists/clarification-gate.md) 判断是否允许进入下一层
4. 参考 [示例](./examples/codex-config-manager-example.md) 对照输出质量
5. 如果需要把业务界面结构化为可验证原型，优先阅读 [JSON Forms 选型与落地](./docs/json-forms-selection.md)

## 当前目录结构

```text
layer-1-business-clarification/
├── docs/
│   ├── json-forms-selection.md
│   └── visual-business-with-mcp.md
├── README.md
├── checklists/
│   └── clarification-gate.md
├── examples/
│   └── codex-config-manager-example.md
├── package.json
├── prompts/
│   └── business-facilitator-system-prompt.md
└── templates/
    ├── business-clarification-template.md
    ├── business-visualization-template.md
    ├── json-forms-config-data.example.json
    ├── json-forms-config-schema.template.json
    └── json-forms-config-uischema.template.json
```

## 输出要求

本层产出应尽量满足以下特征：

- 结构化：不是大段散文，而是清晰分块
- 可追问：每块内容都能继续追问细节
- 可验证：规则、状态、例外要能判断对错
- 可交接：别人接手后能继续推进，而不是重新猜需求

## 与第二层的边界

第一层产物一旦稳定，第二层才开始接手，第二层可继续做：

- PRD 整理
- 页面与交互方案
- 技术架构设计
- 开发任务拆解
- 测试用例与验收方案

如果第一层还有大量“待确认”，就不应该直接跳到第二层。

## 当前默认选型

- 业务流程表达默认使用 `Markdown + Mermaid`
- 表单型业务界面和配置页原型默认使用 `JSON Forms`
- 第一层输出统一按分层业务逻辑框架组织
