# Flow-UI 约束框架吸收方案

## 1. 目标

本方案记录 SP/SpecCompass 后续吸收 Flow-UI 约束框架的设计思路。

这里的 `flow` 是业务流程，不是页面跳转图；`ui` 是界面结构，不是单纯视觉稿。两者要共同服务一个目标：

> 在已经有 PRD/specify 需求的前提下，让 AI 能稳定推理“业务、流程、界面、功能、代码、测试”之间的关系，尽量自动补齐内容；但遇到高风险、不确定、冲突的信息时，必须回到 clarify/specify/plan 进行确认，不能靠猜。

本方案不是要引入重型建模工具，也不是要求每个项目维护复杂图数据库。它的重点是把现有 SP 的 memory、trace、flow、ui、analyze、gate 机制补强成一套可追踪、可检查、可纠偏的轻量工程控制系统。

## 2. 核心结论

建议吸收 Flow-UI 的约束思想，但不要照搬重型 IFML、状态机 JSON、图数据库或全量代码图。

推荐采用：

- `flow` 是关系主轴，负责贯穿业务动作、数据、界面、代码和测试。
- `flow` 负责业务流程、状态、事件、分支、失败路径和界面契约。
- `ui` 在 `flow` 之后运行，消费 flow 的界面契约，收集指定界面的关键元素，并把它们合理拼装成界面。
- 编码体系不另起一套，必须复用 SP 既有 `FEATxx.WSxx.TYPExx` 主坐标、副标签、trace-index 和 open-items 机制。
- 在关系上，`FLOW` 是树干；在编码上，`FLOW`、`UI`、`API`、`TABLE`、`ACC`、`CODE` 仍是同一 workset 下的平级主坐标，通过 trace-index 建立主从关系。
- 代码区可以被 trace 到，但不要求每行代码都打标。只标关键模块、入口、接口、测试和强副作用代码区。
- analyze/gate 要检查断链、冲突和高风险缺口；能自动补齐的补齐，不能安全判断的转 clarify/specify/plan。

一句话：

> Flow 是业务控制主线，UI 是部分流程节点的呈现和交互实现，代码是事件、状态迁移、数据副作用和验收的落地区域。

## 3. 开源与工程参考

本次调研的重点不是找一个可以直接复制的项目，而是找可借鉴的机制。GitHub 和开源生态里已经有不少相关方向，但它们通常各自解决一段问题：IFML 解决交互流建模，XState 解决状态和事件迁移，GraphWalker 解决基于模型的路径测试，JSON Forms 解决数据 schema 到 UI schema 的表单约束。没有一个项目能直接替代 SP 的“需求、流程、界面、代码、测试、memory、gate”全链路机制。

### 3.1 IFML

IFML 是 OMG 的 Interaction Flow Modeling Language。它关注前端的 view container、view component、事件、数据绑定、业务动作、控制逻辑以及不同架构层之间的控制和数据分布。官方说明强调 IFML 用来表达前端内容、界面组合、用户交互和控制行为，并且可以把 UI 描述连接到业务逻辑、数据结构和后端服务。

可借鉴点：

- UI 不应孤立存在，界面组件要绑定到业务流程中的数据对象、事件和业务动作。
- 前端交互流需要围绕业务流程表达控制逻辑和数据流。
- UI、业务动作和数据之间要通过流程主轴建立明确关系。

不建议照搬：

- 不引入完整 IFML 元模型。
- 不要求模型维护复杂图形化建模文件。
- 不把 SP 变成模型驱动开发工具。

### 3.2 XState / Statecharts

XState 使用事件驱动、状态机、状态图和 actor 模型来表达复杂应用逻辑。它的价值在于把状态、事件、guard、action、transition 明确化。Statecharts/XState 的核心思想是：事件触发迁移，guard 决定迁移是否成立，action/effect 在迁移中执行。

可借鉴点：

- 流程应围绕 `state -> event -> guard/effect -> target state` 建模。
- 错误路径、并发状态、嵌套状态不能只靠自然语言带过。
- UI action 不应该直接改业务事实，而应该触发事件。

不建议照搬：

- 不要求所有项目使用 XState。
- 不强制生成可执行状态机。
- 不让 flow 阶段直接规划具体按钮布局。

### 3.3 GraphWalker / Model-Based Testing

GraphWalker 是开源 model-based testing 工具。它的模型由 vertex 和 edge 这类图元素组成，用图来驱动或生成测试路径。

可借鉴点：

- 业务流程图不仅用于说明，也可以用于覆盖率和路径检查。
- analyze/gate 可以检查主路径、关键分支、错误路径是否有验收或测试证据。
- 流程节点和边如果没有测试覆盖，就能形成明确风险。

不建议照搬：

- 不默认生成测试遍历器。
- 不要求所有节点都有自动化测试。
- 对小项目只做主路径和高风险路径检查。

### 3.4 JSON Forms / Schema-to-UI

JSON Forms 的核心思想是用 JSON Schema 描述数据结构和校验，用 UI schema 描述呈现。它的 UI schema 负责描述表单布局和展示组织方式，避免把数据结构和 UI 排版混在一起。

可借鉴点：

- 字段类型、必填、枚举、格式、业务校验应尽量来自 schema 或字段约束，不应由 UI 文档随手发明。
- UI 负责组织字段和交互，不应重复定义业务校验真相。

不建议照搬：

- 不强制项目使用 JSON Schema。
- 不追求全量自动生成 UI。
- 只吸收“字段约束来源必须清楚”这个控制原则。

### 3.5 Cucumber / BDD

Cucumber 强调用普通语言写可读测试场景，让需求、验收和实现之间建立沟通桥梁。

可借鉴点：

- 关键 use case 应能追到 acceptance/test。
- 测试描述应能反向定位需求、流程节点、事件或 UI 动作。
- 对 AI 来说，测试是反馈信号，不只是最后验证。

不建议照搬：

- 不强制使用 Gherkin。
- 不要求所有项目写 BDD feature 文件。
- 只吸收“需求到验收的可读映射”。

### 3.6 GitHub 调研结论

从 GitHub/开源生态看，已经有人分别做了这些局部能力：

- 用 IFML/WebML 体系表达界面交互流、页面组件、事件和后端动作。
- 用 XState/statecharts 表达状态、事件、guard、effect 和迁移。
- 用 GraphWalker 这类 model-based testing 工具从流程图生成测试路径。
- 用 JSON Forms / react-jsonschema-form 这类 schema-to-UI 工具把字段约束和 UI schema 分开。
- 用 BDD/Cucumber 把业务场景、验收和测试连接起来。

但这些工具大多是“专门工具”，不是 SP 这种面向 AI agent 的全流程工程控制框架。SP 应借鉴它们的控制思想，不应直接引入它们的文件格式或运行时依赖。

推荐吸收的内容：

- 从 IFML 借鉴“UI 组件必须绑定数据、事件、业务动作和控制流”。
- 从 XState 借鉴“业务状态变化必须由事件、guard、effect 和 target state 表达”。
- 从 GraphWalker 借鉴“流程路径可以用于覆盖率和 gate 检查”。
- 从 JSON Forms 借鉴“字段约束来源应来自 schema/业务规则，UI 只组织呈现”。
- 从 BDD 借鉴“关键业务路径要能追到验收和测试证据”。

不建议吸收的内容：

- 不把 SP 改成 IFML 建模工具。
- 不强制项目使用 XState。
- 不默认生成 GraphWalker 模型或遍历器。
- 不强制所有表单都改成 JSON Schema 驱动。
- 不强制所有验收都写 Gherkin。

参考入口：

- OMG IFML specification: https://www.omg.org/spec/IFML/
- XState transitions documentation: https://stately.ai/docs/transitions
- GraphWalker project and docs: https://graphwalker.github.io/
- JSON Forms UI schema docs: https://jsonforms.io/docs/uischema/

## 4. 软件工程和控制论视角

从软件工程角度看，这套机制解决的是 traceability、separation of concerns、state consistency、testability。

从工程控制论角度看，它应该形成闭环：

- 目标：PRD/specify 定义业务目标、边界、角色、验收。
- 控制对象：flow、ui、delivery、code、test 这些逐步展开的工程产物。
- 传感器：analyze 检查断链、冲突、缺口、漂移。
- 控制器：gate 判断能否进入下一阶段。
- 执行器：specify、clarify、flow、ui、plan、implement 根据反馈修正产物。
- 反馈：测试结果、人工决策、open-items、trace-index 回写。
- 兜底：无法局部修复时向上回到更高层路线，避免在错误细节里继续消耗 token。

核心控制原则：

- 先确定主干，再展开枝叶。
- 每添加一个关键节点、事件、界面元素或代码区，都要有对应的来源和验证方式。
- 小问题可以局部修，大问题要回到上层命令。
- 不清楚的业务意图必须问人，不能让模型用技术实现掩盖业务矛盾。
- 已经完成且经过检查的大类，不应被反复重检；只细查最近变化和受影响链路。

## 5. 从 PRD 到代码的可推理链路

推荐 SP 固化以 `FLOW` 为主轴的链路。下面的“需求、用例、流程步骤、业务事件、状态迁移”是分析概念，不一定都要成为独立编码类型：

```text
Requirement
  -> Use Case
    -> FLOW
      -> Flow Step
        -> Business State / Decision / System Step / External Step
          -> Business Event
            -> State Transition
              -> Data / API / Side Effect
                -> Code Area
                  -> Acceptance / Test
```

如果节点需要界面，再进入 UI 链：

```text
Flow Step / Business State / Business Event
  -> Screen
    -> UI Element
      -> UI Action / Field / Permission / Error Message
        -> Business Event / Field Rule / Guard
```

落到 SP 现有编码时，不应把这些概念全部展开成深层 ID。默认主坐标仍使用现有方法论中的 `FEATxx.WSxx.TYPExx`：

```text
FEAT01.WS02.FLOW01
FEAT01.WS02.UI03
FEAT01.WS02.API02
FEAT01.WS02.TABLE01
FEAT01.WS02.ACC04
```

关系表达应放在 `trace-index.md` 中：

```text
FEAT01.WS02.UI03 serves FEAT01.WS02.FLOW01
FEAT01.WS02.API02 transitions FEAT01.WS02.FLOW01
FEAT01.WS02.TABLE01 mutated_by FEAT01.WS02.API02
FEAT01.WS02.ACC04 verifies FEAT01.WS02.FLOW01
```

说人话：流程是业务树干，但编码不要写成树干下面无限套枝叶。枝叶用 trace 关系挂到流程上。

反向追踪应成立：

```text
TEST FAILURE
  -> ASSERTION
    -> CODE AREA
      -> API / DATA / EVENT
        -> TRANSITION
          -> Flow Step
            -> FLOW
              -> Use Case
                -> Requirement
```

这条链路的目的不是把文档写复杂，而是让 AI 在修改任何一段内容时能回答：

- 这个需求对应哪些流程？
- 这个流程有哪些节点和分支？
- 哪些节点需要界面？
- 这个界面上应该有哪些关键元素？
- 这些元素触发什么事件？
- 事件改变什么状态、数据或外部系统？
- 代码应该落在哪些区域？
- 哪些验收和测试能证明它正确？

## 6. 编码体系设计

### 6.1 是否需要引入流程主轴

需要。

理由：

- 没有稳定编码，AI 很难在长上下文中准确定位同一个业务对象。
- 没有编码，trace-index 无法稳定表达关系。
- 没有编码，analyze/gate 很难检查“谁断链了”。
- 对复杂项目，编码能让模型快速知道某个内容属于哪个需求、哪个流程、哪个界面、哪个代码区。

但这里不是新增一套 Flow-UI 编码体系，而是把 `FLOW` 提升为现有 SP 编码体系里的关系主轴。

不建议把所有编码都写成很长的全路径，例如到处复制：

```text
FEAT01.UC02.FLOW01.NODE03.SCREEN02.ELEM04
```

这种方式看似完整，实际容易造成写放大和断链，也会和现有方法论“主坐标最多 2-3 层”的规则冲突。更稳的做法是：

> 主体对象继续使用 `FEATxx.WSxx.TYPExx` 主坐标，流程关系放在 trace-index 的 `Relation` 中表达。

### 6.2 和现有 SP 编码机制合并

推荐继续使用现有基础类型，并按需启用少量流程相关类型：

```text
FLOW    业务流程
UI      界面或交互锚点
API     接口
TABLE   表、集合或核心数据结构
CODE    代码区
ACC     验收
TEST    测试
EVENT   事件、消息或副作用，可选启用
PERM    权限规则，可选启用
JOB     后台任务，可选启用
```

不建议默认新增独立的 `NODE`、`TRN`、`ELEM` 编码类型。

原因：

- `NODE`、`TRN`、`ELEM` 数量容易膨胀，会让模型维护负担显著增加。
- 现有方法论已经禁止把按钮、字段、流程内部细步写成更深层主坐标。
- 大多数项目只需要把 UI/API/TABLE/ACC/CODE 挂到 FLOW 上，就能满足定位和检查。

推荐主坐标示例：

```text
FEAT01.WS02.FLOW01
FEAT01.WS02.UI03
FEAT01.WS02.API02
FEAT01.WS02.TABLE01
FEAT01.WS02.ACC04
FEAT01.WS02.CODE01
```

流程内部的节点、分支、事件和迁移可以写在 flow 文档的表格里，用局部编号或语义名表达，例如 `Step 3`、`Decision: approver rejects`、`Event: approve_submitted`。只有当某个事件、消息或副作用需要跨文档、跨模块反复追踪时，才升级为 `EVENT01` 这类正式锚点。

### 6.3 语义别名

数字编码适合定位，但不适合人和模型理解业务语义。建议每个关键对象可选维护语义别名：

```text
FEAT01.WS02.FLOW01
Alias: leave.approval::manager_review
```

作用：

- 编号用于稳定定位。
- 语义别名用于业务搜索。
- 后续代码、测试、文档可以同时搜编号和业务名。

### 6.4 代码区编码

代码区不建议细到每个函数都强制编码。推荐只在关键区域建立 trace：

```text
FEAT01.WS02.CODE01 -> src/modules/approval/service.*
FEAT01.WS02.CODE02 -> src/modules/approval/api.*
FEAT01.WS02.CODE03 -> src/modules/approval/ui/*
FEAT01.WS02.CODE04 -> tests/approval/*
```

可选代码注释：

```text
@sp-trace FEAT01.WS02.FLOW01
@sp-code FEAT01.WS02.CODE01
```

规则：

- 关键 API、强副作用服务、状态迁移处理器、核心 UI action、关键测试建议打标。
- 普通样式、纯展示组件、低风险辅助函数不强制打标。
- 如果项目已有模块边界和测试命名，可以优先用路径和测试名承载 trace，不强行加注释。

## 7. Flow 与 UI 的职责边界

### 7.1 `/sp.flow` 负责什么

`/sp.flow` 负责业务流程搭建，输出流程模型和界面契约。它是后续 UI、API、TABLE、CODE、ACC 的主轴入口。

它应该定义：

- 业务流程属于哪个 REQ/UC。
- 流程属于哪个 `FEATxx.WSxx.FLOWxx`。
- 流程有哪些关键步骤、状态、分支和业务动作。
- 每个关键步骤的业务含义、节点类型、输入、输出、角色。
- 每个关键步骤允许哪些事件或业务动作。
- 每个业务动作的 guard、effect、target state、失败路径。
- 哪些关键步骤需要界面参与。
- 需要界面的步骤对 UI 提出什么契约：需要收集什么字段、展示什么业务事实、允许触发哪些事件、有哪些权限和错误状态。
- 流程如何连接到 UI/API/TABLE/CODE/ACC 的 trace 关系。

它不应该做：

- 不设计具体 screen 布局。
- 不决定按钮放左边还是右边。
- 不发明具体视觉组件。
- 不把 UI convenience 当成新业务分支。
- 不给每个按钮、字段、内部小步骤分配深层主坐标。

说人话：

> flow 阶段要告诉 UI“这里需要用户做什么、能触发什么业务事件、需要什么数据和权限”，但不要提前替 UI 画页面。

### 7.2 `/sp.ui` 负责什么

`/sp.ui` 在 `/sp.flow` 之后运行，负责把 flow 的界面契约落成界面结构。

它应该定义：

- 指定 screen 服务哪些流程步骤、业务状态或业务事件。
- screen 上有哪些关键元素，并用局部元素 ID 或语义名登记。
- 每个关键元素的类型、业务含义、来源流程步骤、绑定事件或字段、权限、必填条件。
- screen 如何通过 trace 绑定到 `FEATxx.WSxx.FLOWxx`。
- 一个 screen 被多个流程复用时，不同入口和状态下的动作差异。
- 表单字段如何分组、显示、校验和提交。
- 错误、loading、empty、success、confirm 等状态如何呈现。

它不应该做：

- 不改变业务状态机。
- 不新增业务事件，除非回到 `/sp.flow` 或 `/sp.specify` 确认。
- 不发明权限规则。
- 不用 UI 体验理由绕过业务 guard。

说人话：

> ui 阶段要把“业务需要用户做的事”组织成合理界面，但不能擅自创造新的业务规则。

### 7.3 业务流程状态和 UI 本地状态的边界

`FLOW` 只记录会影响业务事实、数据状态、权限判断、外部系统、验收路径或 API 交互的事件和状态变化。

以下内容应进入 `FLOW`：

- 审批通过、驳回、撤回、提交、取消、支付、退款、发货、归档等业务动作。
- 影响数据库、消息、外部系统、权限或审计记录的事件。
- 会改变验收结果的状态迁移和失败路径。
- 需要人工决策、补偿、重试或回滚的异常流程。

以下内容默认只属于 `UI`：

- hover、focus、展开/折叠、tab 切换、局部 loading、弹层开关。
- 不改变业务事实的本地表单红字、前端排版、动效和视觉状态。
- 纯展示组件内部状态。

如果一个 UI 本地状态会影响提交、权限、数据合法性或验收，它就不再只是 UI 细节，必须回到 `FLOW` 或 `specify/clarify` 确认其业务含义。

## 8. Flow Node 和 Screen 的对应关系

真实项目里，一个界面可能服务多个流程，一个流程节点也可能不需要界面。

推荐规则：

- 每个关键流程步骤必须声明类型：`ui`、`system`、`external`、`scheduled`、`manual`、`none_ui`。
- `ui` 类型步骤必须绑定至少一个 UI 主坐标，除非明确记录为暂缓并进入 open-items。
- `system`、`external`、`scheduled`、`manual`、`none_ui` 不要求绑定 UI，但要说明输入、输出、触发方式和验收证据。
- 一个 UI 主坐标可以服务多个流程步骤，但必须列出每个步骤下可见元素和可触发事件的差异。
- 不允许出现没有 FLOW 来源的孤儿 UI。
- 流程步骤可以有局部编号，但默认不升级成全局主坐标。

推荐流程步骤表：

```text
| Step | Meaning | Type | Actor | Input | Output | Events | Related UI | Side Effects | Acceptance |
|---|---|---|---|---|---|---|---|---|---|
| S03 | manager reviews leave request | ui | manager | request detail | decision | approve, reject | FEAT01.WS02.UI03 | update request status | FEAT01.WS02.ACC02 |
```

推荐 SCREEN 元素表：

```text
| Element ID | Type | Meaning | Source Step | Event / Field | Permission | Required | Notes |
|---|---|---|---|---|---|---|---|
| E01 | button | approve | S03 | approve | manager | yes | strong side effect |
| E02 | button | reject | S03 | reject | manager | yes | reason required |
| E03 | field | reject reason | S03 | reject_reason | manager | conditional | required on reject |
```

关键判断：

- 不是所有视觉元素都要进入全局编码。
- 影响流程、数据、权限、验收、提交、导航、错误处理的元素必须出现在 UI 元素表中。
- 只有跨文档反复追踪的关键元素，才考虑用副标签或语义名登记；默认不新增全局 `ELEM` 主坐标。
- 纯装饰、低风险排版、无业务影响的视觉细节可以不登记。

推荐 UI 契约映射表：

```text
| UI Anchor | Element | Source Flow Step | Flow Event | Expected API / Effect | Data Object | Evidence |
|---|---|---|---|---|---|---|
| FEAT01.WS02.UI03 | E01 approve button | S03 | approve | FEAT01.WS02.API02 updates request status | FEAT01.WS02.TABLE01.status | FEAT01.WS02.ACC02 |
```

这个表的作用是防止 UI 漂移：界面元素不是凭感觉出现，而是能回到流程步骤、业务事件、数据对象和验收证据。

## 9. Trace Index 作为轻量图

不建议默认新增复杂图数据库。现阶段使用 `memory/trace-index.md` 或 feature 内 trace 文件承载轻量关系图即可。

对小项目，单个 `memory/trace-index.md` 足够。对超大项目，如果 trace 表已经大到模型每次读取都明显分散注意力，应按 workset、模块或子 feature 分治，例如保留总索引 `memory/trace-index.md`，再拆出 `memory/trace-index-WS02.md` 或 feature 内局部 trace 文件。总索引只保留主锚点、所属 workset、直接相邻文档和分片位置；细节放到分片里。

分治规则：

- 小项目不要提前拆，避免增加文件跳转成本。
- 中大型项目优先按 `WSxx` 拆，而不是按 UI/API/TABLE 类型拆，因为 workset 更贴近业务闭环。
- 总索引必须能把 `FLOW` 找到对应分片，否则分片会变成新的孤岛。
- analyze/gate 只需要读取当前 workset 和直接相邻分片；发现跨 workset 影响时再扩一层。

推荐关系动词：

```text
serves
requires
triggers
transitions_to
calls
persists_to
reads_from
guards
verifies
blocks
depends_on
implemented_by
tested_by
```

推荐 trace 行：

```text
FEAT01.WS02.FLOW01 contains step S03
FEAT01.WS02.UI03 serves FEAT01.WS02.FLOW01
FEAT01.WS02.UI03 action approve triggers FEAT01.WS02.API02
FEAT01.WS02.API02 transitions FEAT01.WS02.FLOW01
FEAT01.WS02.API02 implemented_by FEAT01.WS02.CODE01
FEAT01.WS02.API02 persists_to FEAT01.WS02.TABLE01.status
FEAT01.WS02.ACC02 verifies FEAT01.WS02.FLOW01
FEAT01.WS02.TEST01 verifies FEAT01.WS02.ACC02
```

这个 trace 的价值：

- 所有关键内容都能挂到流程主轴上。
- 模型可以快速定位影响面。
- analyze/gate 可以检查断链。
- 代码审查可以知道改某个服务会影响哪个流程。
- 测试失败可以反向追到需求。

## 10. AI 可以推理什么，必须问什么

### 10.1 可以推理的内容

AI 可以在低风险、来源明确时补齐：

- 根据已有 FLOW 步骤和事件补充 UI 元素清单初稿。
- 根据字段约束生成表单布局建议。
- 根据状态迁移补充 loading/success/error UI 状态。
- 根据 API contract 补充普通错误提示。
- 根据 trace 中已有关系补充测试覆盖建议。

前提：

- 上游业务规则明确。
- 不改变验收。
- 不新增权限。
- 不新增强副作用。
- 不改变数据事实。

### 10.2 必须问人的内容

以下情况不能猜：

- 用户意图不清或需求前后冲突。
- 一个 UI action 可能对应不同业务含义。
- 分支条件来自业务规则但 PRD 没写清。
- 权限、角色、租户隔离、审批责任不清。
- 错误路径涉及重试、撤销、补偿、人工介入。
- 字段校验影响业务合法性，而不是纯前端体验。
- flow 和 UI 对状态理解不一致。
- 代码实现需要改变既有架构边界。

问人时必须说清：

- 背景是什么。
- 冲突或缺口在哪里。
- 如果继续猜，会带来什么风险。
- 给出 2-4 个选项。
- 推荐一个选项，并说明原因。

## 11. Analyze / Gate 检查规则

### 11.1 `/sp.analyze`

`/sp.analyze` 是传感器，重点发现漂移和断链。

建议检查：

- `WORKSET_WITHOUT_FLOW_WHEN_BUSINESS_PROCESS_EXISTS`
- `FLOW_STEP_WITHOUT_TYPE`
- `BUSINESS_BRANCH_WITHOUT_REASON`
- `BUSINESS_EVENT_MIXED_WITH_PURE_UI_STATE`
- `UI_STEP_WITHOUT_UI_ANCHOR`
- `UI_WITHOUT_FLOW_SOURCE`
- `UI_ELEMENT_WITHOUT_FLOW_STEP_EVENT_OR_FIELD`
- `UI_ACTION_WITHOUT_EVENT`
- `EVENT_WITHOUT_FLOW_EFFECT_OR_API`
- `TRANSITION_WITHOUT_GUARD_WHEN_CONDITIONAL`
- `SIDE_EFFECT_WITHOUT_DATA_OR_API`
- `EXTERNAL_CALL_WITHOUT_FAILURE_PATH`
- `PERMISSION_GUARD_WITHOUT_UI_RULE`
- `API_WITHOUT_CODE_AREA`
- `UI_API_TABLE_ACC_NOT_BOUND_TO_FLOW`
- `CRITICAL_PATH_WITHOUT_ACCEPTANCE`
- `ACCEPTANCE_WITHOUT_TEST_OR_MANUAL_EVIDENCE`

严重性建议：

- 影响路由、权限、验收、强副作用、数据一致性的断链为 ERROR。
- 展示类、低风险说明缺失为 WARN。
- 纯格式问题为 INFO。

### 11.2 `/sp.gate`

`/sp.gate` 是门禁，决定能否进入下一阶段。

不能 PASS 的情况：

- 主流程没有 initial/terminal/error 处理。
- 关键流程步骤没有类型或业务含义。
- 业务分支没有业务原因。
- 纯 UI 本地状态被写成业务流程状态，或业务状态变化被藏在 UI 细节里。
- `ui` 类型步骤没有 UI 主坐标，且没有 open-item 或人工决策。
- 关键 UI action 没有 EVENT。
- EVENT 没有 flow effect、API 或状态变化说明。
- 强副作用没有数据/API/失败路径。
- 权限 guard 和 UI 可见/可编辑规则冲突。
- UI/API/TABLE/ACC/CODE 无法追到相关 FLOW。
- 主路径没有 acceptance/test/manual evidence。

可以带着走的 soft issue：

- 不影响业务主干的展示文案待优化。
- 低风险空态说明不完整。
- 非关键视觉元素未编码。
- 可在实现阶段自然补齐的局部 UI 排版细节。

## 12. 失败、纠偏和兜底

当发现问题时，优先按层级回退：

- UI 元素缺失但 flow 契约清楚：回 `/sp.ui`。
- event/transition 缺失：回 `/sp.flow`。
- 分支业务原因不清：回 `/sp.clarify`。
- 需求本身冲突：回 `/sp.specify` 修正需求。
- workset、架构边界、代码区切分不清：回 `/sp.plan`。
- 已经影响阶段准入：`/sp.gate` 输出 `FAIL` 或 `NEEDS_DECISION`。

震荡保护：

- 同一失败签名在同一层最多修两次。
- 同一 workset 在两个层级之间反复往返超过阈值，必须输出 `NEEDS_DECISION`。
- 进入 `BLOCKED` 前必须写失败现场：改了哪些文件、失败检查是什么、为什么不能自动恢复、下一步路线是什么。

## 13. 落地顺序

### P0：先固化方法论和命令边界

- 把本方案纳入方法论文档。
- 更新 `/sp.flow`：明确 flow 只输出流程模型和界面契约，不直接设计 UI 布局。
- 更新 `/sp.ui`：明确 ui 消费 flow 契约，负责 screen 和 element 拼装。
- 固化“业务流程状态和纯 UI 本地状态”的边界，避免 flow 被视觉细节污染。
- 更新 `/sp.analyze` 和 `/sp.gate`：加入 Flow-UI 断链检查。

### P1：强化 trace-index

- 增加 Flow-UI 关系动词表。
- 增加 `FLOW/UI/API/TABLE/CODE/ACC/TEST` 围绕 flow 主轴的示例。
- 增加 UI 契约映射表，让 UI 元素能回到流程步骤、事件、数据和验收。
- 增加超大项目 trace 分治规则，避免单个 trace-index 过大。
- 要求新增关键流程、界面、接口、数据对象、代码区或验收路径时同步 trace。

### P2：观察是否需要轻量脚本

如果实际项目反复出现断链，再扩展轻量检查脚本。

脚本只检查高价值规则：

- action 是否有 event。
- event 是否有 flow effect、API 或状态变化。
- ui 类型流程步骤是否有 UI 主坐标。
- strong side effect 是否有 data/API/error path。
- acceptance 是否能追到 test 或人工证据。
- UI/API/TABLE/ACC/CODE 是否能追到 FLOW。

### P3：暂缓重型自动化

暂不默认引入：

- 全量 JSON graph。
- 强制 XState/IFML 导出。
- Tree-sitter 全仓代码图。
- 图数据库。
- 每个函数强制 trace 注释。

如果未来有真实脚本消费场景，再考虑机器可读 graph。

## 14. 对 Gemini 意见的吸收与保留

Gemini 的主要意见：

- 支持引入编码，但反对过深层级编码。
- 建议严格区分 flow 的业务状态机职责和 ui 的呈现职责。
- 建议 UI action 通过 event 与 flow 连接。
- 建议 analyze/gate 检查悬空节点、无失败路径、权限不清等问题。
- 建议不要让 flow 阶段直接设计具体 UI 元素。
- 同意流程作为关系主轴，但建议在 ID 体系上继续保持 `FEATxx.WSxx.TYPExx` 平级主坐标。
- 反对默认新增 `NODE/EVENT/TRN/ELEM` 等微观全局编码，建议只在确有跨文档追踪价值时启用。
- 强调 `FLOW` 不应收纳纯 UI 本地状态；hover、展开、tab 切换等只能留在 UI 文档。
- 建议超大项目按 workset 对 trace-index 分治，避免单表过大影响模型注意力。

本方案吸收：

- 使用现有 `FEATxx.WSxx.TYPExx` 主坐标 + trace 表，而不是到处复制超长 ID。
- 让 UI/API/TABLE/CODE/ACC 尽量绑定到 FLOW 主轴上。
- flow 阶段定义界面契约，不做布局设计。
- ui 阶段消费契约并组织 screen/elements。
- action -> event -> transition -> data/API/code/test 成为主链路。
- 区分业务流程状态和 UI 本地状态，防止过度文档化。
- 在复杂项目中允许 trace-index 按 workset 分片，但保留总索引。
- 强化 analyze/gate 的断链检查和人工决策边界。

本方案保留的 SP 取向：

- 不引入强 DSL。
- 不强制 JSON graph。
- 不要求所有项目都上状态机框架。
- 保持小项目轻量，大项目按复杂度逐步增强。

## 15. 最终建议

值得当前项目吸收的不是某个开源项目的代码，而是四个控制思想：

- 用状态、事件、迁移约束流程。
- 用界面契约连接 flow 和 ui。
- 用 trace 关系连接需求、流程、界面、代码和测试。
- 用 analyze/gate 形成反馈和门禁，发现不确定就回 clarify/specify，而不是让模型猜。

最小可落地版本：

- `/sp.flow` 输出 `FLOW / Step / Event / Effect / UI Contract`。
- `/sp.ui` 输出 `UI / Element Table / Action / Field / Permission`，并回链到 FLOW。
- `trace-index.md` 记录 `FLOW -> UI/API/TABLE/CODE/ACC/TEST` 的关系。
- `/sp.analyze` 找断链。
- `/sp.gate` 阻断高风险缺口。

这样能在不显著增加文档负担的前提下，让 AI 更稳定地从 PRD 推理到流程、界面、功能、代码和测试。
