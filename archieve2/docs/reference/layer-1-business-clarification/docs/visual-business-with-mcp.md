# 业务层可视化方案：MCP + 文字优先图表化表达

## 1. 目标

这个方案解决的是第一层“业务澄清层”里的一个空缺：

- 业务逻辑已经被拆出来了，但还不够直观
- 需要把业务流程、角色互动、状态流转、界面结构以更容易检查的方式展示出来
- 又不希望一上来就依赖复杂渲染器或高保真界面设计

因此本方案采用：

- `MCP` 负责承载可发现、可调用、可追问的业务上下文
- `Markdown + Mermaid + 结构化文本` 负责承载“看得懂”的业务展示
- 第一阶段先不追求渲染效果，只保证主线业务清晰、结构稳定、后续可扩展

## 2. 调研结论

### 2.1 MCP 适合做“业务上下文中台”，不适合直接充当图形渲染器

根据 MCP 官方资料：

- `Resources` 适合暴露业务文档、流程定义、界面说明等上下文资源
- `Prompts` 适合暴露“生成主流程”“检查规则冲突”“补齐异常流程”这类用户显式触发的业务提示模板
- `Tools` 适合做自动分析、生成、校验、导出
- `Roots` 适合表达当前业务分析关联的项目根目录或资料目录
- `Sampling` 适合让服务端在某一步需要模型补全时请求模型生成，但仍保持用户可审查

结论：

- `MCP` 应作为“业务资产交换层”
- 图、表、界面草图应作为 `MCP` 中暴露出来的资源结果
- 不应把第一阶段做成“先有可视化引擎，再塞业务”

### 2.2 文字优先的图表方案，Mermaid 最适合第一层

官方资料表明 Mermaid 原生支持：

- `flowchart` 流程图
- `sequenceDiagram` 时序图
- `stateDiagram` 状态图
- `journey` 用户旅程图
- `architecture` 架构关系图

它的优势是：

- 文本即可表达
- 大模型更容易稳定生成
- 人工也容易审阅和修改
- 未来若需要渲染，可以直接挂到 WebView、文档站或编辑器中

结论：

- 第一层默认图表格式使用 `Mermaid`
- 不要求首阶段必须渲染
- 要求所有图都保留文本源码，方便追问和版本管理

### 2.3 BPMN 和 Structurizr 可以作为补充，不应成为第一阶段默认

调研结果显示：

- `bpmn-js` 很适合标准 BPMN 2.0 流程建模，但其主要载体是 BPMN XML，建模成本更高
- `Structurizr DSL` 更适合系统边界、容器关系、架构说明，不是业务澄清层的第一优先

结论：

- 第一阶段以 `Mermaid + Markdown` 为主
- 当业务跨角色审批、网关分支、多人协作极复杂时，可加 BPMN 作为“升级表达”
- Structurizr 更适合第二层或第二层之后的架构表达

## 3. 总体设计

### 3.1 核心原则

第一层里，任何“直观展示”都必须服务于业务主线，而不是服务于视觉效果。

这里说的不是项目顶层分层，而是第一层内部的三段式表达：

1. `业务事实层`
   - 角色、对象、规则、流程、状态、边界条件
2. `结构化展示层`
   - Mermaid 图
   - 屏幕说明卡片
   - 决策表和规则表
3. `MCP 接入层`
   - 用 Resources/Prompts/Tools 暴露这些内容

### 3.2 业务产物包

建议第一层每个需求最终产出一个“业务产物包”，结构如下：

```text
feature-name/
├── 01-business-summary.md
├── 02-actors-and-objects.md
├── 03-rules-and-decisions.md
├── 04-flows/
│   ├── main-flow.mmd
│   ├── sequence.mmd
│   └── state.mmd
├── 05-screens/
│   ├── screen-map.md
│   ├── screen-01-overview.md
│   └── screen-02-detail.md
└── 06-mcp/
    ├── resource-index.md
    ├── prompt-catalog.md
    └── tool-catalog.md
```

这不是技术实现目录，而是业务澄清目录。

## 4. MCP 如何接入业务层

### 4.1 Resources

`Resources` 用于暴露稳定业务资产，建议至少包括：

- `business://summary`
- `business://actors`
- `business://rules`
- `business://flows/main`
- `business://flows/sequence`
- `business://flows/state`
- `business://screens/map`
- `business://screens/{screenId}`

这样做的好处是：

- 用户可以像浏览资源树一样查看业务资产
- 模型也可以基于这些资源做后续澄清
- 界面可以天然做成左侧目录 + 右侧详情

### 4.2 Prompts

`Prompts` 适合暴露标准化业务动作，而不是自由聊天。建议至少有：

- `clarify-main-flow`
- `find-missing-branches`
- `check-rule-conflicts`
- `generate-screen-outline`
- `summarize-scope-overrides`

这些 Prompt 不应该直接产出代码，而应产出：

- 缺失项清单
- Mermaid 文本
- 屏幕说明稿
- 待确认问题列表

### 4.3 Tools

`Tools` 用于做可重复执行的业务处理动作，建议第一阶段只做轻量工具：

- `build_mermaid_flow`
  - 输入：主线流程文本
  - 输出：Mermaid flowchart
- `build_state_diagram`
  - 输入：状态表
  - 输出：Mermaid stateDiagram
- `extract_screen_map`
  - 输入：业务流程和角色
  - 输出：界面清单与入口关系
- `validate_business_bundle`
  - 输入：业务产物包
  - 输出：缺失项、冲突项、阻塞项
- `list_project_roots`
  - 输入：当前分析对象
  - 输出：业务关联目录

### 4.4 Roots

`Roots` 很适合表达“当前业务是围绕哪些项目目录展开”的问题。

这与用户之前的诉求是兼容的：

- 用户级目录可作为一个 root
- 项目总目录可作为一个 root
- 某个特定项目也可单独作为一个 root

这样，业务层不只是知道“需求描述”，还知道“这些需求对应哪些真实项目空间”。

### 4.5 Sampling

如果后续希望业务层具备“自动补图”和“自动补说明”的能力，可在服务端需要时调用 `Sampling`：

- 根据已有规则，补出主流程图
- 根据界面清单，补出文字版页面结构
- 根据主流程与规则，自动提出待确认问题

但第一阶段要注意：

- Sampling 只能作为辅助
- 不能让它绕过人工审查
- 生成结果必须回写成文本资产，供人复核

## 5. 图表接入方案

### 5.1 主流程图

主流程图默认使用 `Mermaid flowchart`。

适用内容：

- 正常路径
- 核心分支
- 关键判断节点
- 成功与失败出口

适合第一层的原因：

- 最容易被非技术人员读懂
- 文本维护成本低
- 可以很早介入需求阶段

建议规则：

- 一张图只表达一个主线主题
- 节点数量先控制在 12 到 18 个以内
- 超出后拆成“主流程 + 子流程”

### 5.2 角色时序图

角色互动适合用 `Mermaid sequenceDiagram`。

适用内容：

- 用户、系统、配置源、外部服务之间的交互先后顺序
- 哪一步是读取，哪一步是校验，哪一步是写回

它特别适合处理：

- “用户看到什么”
- “系统什么时候校验”
- “配置冲突在何时被发现”

### 5.3 状态图

状态流转适合用 `Mermaid stateDiagram`。

适用内容：

- 草稿、已确认、已保存、冲突、失效等状态
- 某个配置或业务对象在不同动作下如何变化

### 5.4 用户旅程图

如果希望强调“人”的视角，可补一个 `Mermaid journey`。

适用内容：

- 用户从进入系统到完成目标的阶段
- 哪些阶段信息不足
- 哪些阶段需要系统辅助解释

### 5.5 什么时候用 BPMN

只有出现以下情况之一，才建议升级到 BPMN：

- 多角色审批链非常复杂
- 网关分支很多
- 需要和已有 BPMN 流程资产对齐
- 需要更标准的业务流程交付格式

否则，第一层继续用 Mermaid 即可。

## 6. 业务界面如何先用文字展示

第一阶段不追求视觉稿，而是输出“文字化界面规格”。

建议采用“界面清单 + 单页卡片”两级结构。

### 6.1 界面清单

先列清楚有哪些界面，不进入视觉细节：

| 页面 | 作用 | 谁会进入 | 入口 | 关键输出 |
| --- | --- | --- | --- | --- |
| 配置目录页 | 展示用户级和项目级配置入口 | 用户 | 打开应用 | 进入某个配置范围 |
| 配置详情页 | 展示和编辑具体配置项 | 用户 | 选择目录后进入 | 修改配置项 |
| 规则冲突页 | 展示全局与项目级冲突 | 用户 | 保存前或校验时 | 决定覆盖策略 |

### 6.2 单页卡片格式

每个页面用同一种文字卡片来表达。

推荐结构：

```text
页面名：配置详情页
页面目标：查看并编辑指定范围内的 Codex 配置
适用角色：普通用户 / 项目管理员
进入条件：用户已选择某个配置目录

页面区块：
1. 顶部范围信息
   - 显示当前是用户级还是项目级
   - 显示当前项目名称或目录路径

2. 配置项列表
   - 每行格式：
     配置项名 | 当前值 | 是否已写入 | 作用域
   - 第二行小字：
     该项的简洁说明

3. 作用域控制区
   - 可指定全局 / 非全局
   - 非全局时显示项目选择器

4. 保存区
   - 保存
   - 重置
   - 查看变更摘要

页面动作：
- 修改配置项值
- 勾选是否写入 TOML
- 切换作用域
- 保存

页面规则：
- 必选项默认勾选且不可取消
- 支持枚举的项优先使用下拉或单选
- 自定义模型名称允许输入文本
- 非全局配置必须指定目标项目

异常提示：
- TOML 解析失败
- 值不合法
- 路径不存在
```

这个结构的关键点是：

- 它已经足够接近真实页面
- 但又不会把团队带偏到视觉细节
- 大模型和人都容易继续补充

如果某个页面已经从“文字卡片”进入“可验证原型”阶段，则当前默认转入 `JSON Forms` 表达：

- `JSON Schema` 负责字段约束
- `UI Schema` 负责分类和布局
- `Categorization` 负责左侧窄标签
- 具体选型结论见 `docs/json-forms-selection.md`

## 7. 推荐的数据表达方式

为了让业务层结果既可读又可后续接入 MCP，建议采用以下搭配：

- 叙述说明：`Markdown`
- 规则表和界面清单：`Markdown Table`
- 图表源码：`Mermaid`
- 可枚举字段和元数据：`YAML` 或 `JSON`

也就是说，第一层不是单文档，而是“多文件但轻结构”的表达。

## 8. 推荐实施顺序

### 第一步

先补一份“业务可视化模板”，让每个需求都必须补：

- 主流程图
- 时序图
- 状态图
- 界面清单
- 页面文字卡片
- MCP 资源目录

### 第二步

把这些内容作为 `MCP resources` 暴露出来，让模型和用户都能稳定读取。

### 第三步

再补轻量 `prompts` 和 `tools`：

- 补图
- 查漏
- 校验规则冲突
- 生成界面文字说明

### 第四步

最后才考虑是否加入真正渲染：

- Mermaid 预览
- BPMN 渲染
- 页面草图预览

## 9. 推荐方案结论

如果只看第一层，推荐组合如下：

- 主框架：`Markdown + Mermaid + MCP`
- 表单型业务界面原型：`JSON Forms`
- MCP 职责：承载业务资源、提示模板、分析工具和目录边界
- 图表默认格式：`Mermaid`
- 标准可视化内容：主流程图、时序图、状态图、界面清单、页面文字卡片
- BPMN：作为复杂流程的补充方案，不做第一阶段默认
- Structurizr：留给第二层做架构表达，不放在第一层核心路径

## 10. 建议你下一步直接补的内容

如果继续做，我建议按这个顺序进入落地：

1. 新增“业务可视化模板”
2. 用当前 `Codex 配置管理` 需求填一份完整示例
3. 再定义 `MCP resource / prompt / tool` 的最小目录
4. 最后再决定是否做图形渲染

## 11. 参考资料

- MCP 官方文档 `Resources`
  - https://modelcontextprotocol.io/docs/concepts/resources
- MCP 官方文档 `Tools`
  - https://modelcontextprotocol.io/docs/concepts/tools
- MCP 官方文档 `Roots`
  - https://modelcontextprotocol.io/docs/concepts/roots
- MCP 官方文档 `Sampling`
  - https://modelcontextprotocol.io/docs/concepts/sampling
- MCP 官方规范 `Prompts`
  - https://modelcontextprotocol.io/specification/2025-06-18/server/prompts
- MCP 官方 GitHub 仓库
  - https://github.com/modelcontextprotocol/modelcontextprotocol
- MCP 官方 TypeScript SDK
  - https://github.com/modelcontextprotocol/typescript-sdk
- Mermaid 官方流程图文档
  - https://mermaid.js.org/syntax/flowchart
- Mermaid 官方时序图文档
  - https://mermaid.js.org/syntax/sequenceDiagram
- Mermaid 官方状态图文档
  - https://mermaid.js.org/syntax/stateDiagram
- Mermaid 官方用户旅程图文档
  - https://mermaid.js.org/syntax/userJourney
- Mermaid 官方架构图文档
  - https://mermaid.js.org/syntax/architecture
- bpmn-js 官方 GitHub 仓库
  - https://github.com/bpmn-io/bpmn-js
- Structurizr DSL 官方文档
  - https://docs.structurizr.com/dsl
- GitHub Spec Kit
  - https://github.com/github/spec-kit
