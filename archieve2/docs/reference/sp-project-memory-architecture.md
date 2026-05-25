# `sp` 项目级记忆架构

> 目标：在 feature 级 `memory/*` 之外，再补一层项目级 `.specify/memory/*`，让 agent 在跨 feature、跨域、跨阶段场景下也能先定位再展开。

## 1. 为什么还需要项目级记忆层

feature 级 `memory/*` 解决的是：

- 单个 feature 内的稳定事实复用
- 单个 feature 内的局部 workset 路由
- 单个 feature 内的追踪链压缩

但当项目进入中型规模后，还会出现另一类问题：

- agent 不知道当前应该看哪个 feature
- agent 不知道多个 feature 之间谁已进入哪个阶段
- agent 不知道共享对象、共享规则、共享风险落在哪些 feature
- agent 每次都要先扫描 `specs/*` 才能找到当前入口

因此需要在 `.specify/memory/` 下增加项目级入口层。

## 2. 定位原则

项目级记忆层与 feature 级记忆层职责不同：

- `.specify/memory/*` 负责项目范围的路由、索引和当前工作上下文
- `specs/<feature>/memory/*` 负责单个 feature 的局部稳定事实和 workset

推荐读取顺序：

1. `.specify/memory/project-index.md`
2. `.specify/memory/active-context.md`
3. 目标 feature 的 `memory/index.md`
4. 目标 `ws-*.md`
5. 必要源文档

结论：

- 项目级记忆层先决定“去哪”
- feature 级记忆层再决定“读什么”

## 3. 推荐文件结构

```text
.specify/
└── memory/
    ├── constitution.md
    ├── project-index.md
    ├── feature-map.md
    ├── domain-map.md
    ├── active-context.md
    └── hotspots.md
```

## 4. 各文件职责

## 4.1 `constitution.md`

职责：

- 固化项目级工作原则
- 固化两层分层边界
- 固化记忆层优先级和刷新规则

回答的问题：

- 这个项目的文档工作规则是什么
- 哪些行为越界
- agent 开始前必须遵守哪些全局约束

## 4.2 `project-index.md`

职责：

- 作为整个项目的默认阅读入口
- 提供“问题到文件 / feature / 域”的第一跳路由

至少应包含：

- 项目当前阶段摘要
- 问题路由矩阵
- 当前 active feature
- 当前热点域
- 最近 gate / analyze 结论摘要

回答的问题：

- 我现在先读哪个 feature
- 我的问题属于哪个域或哪个 feature
- 我应该先去项目级索引，还是直接进入某个 feature

## 4.3 `feature-map.md`

职责：

- 列出所有 feature 的当前阶段、状态和主要入口

至少应包含：

- feature 名称
- 所属域
- 当前阶段
- 最新 gate / analysis 结果
- 主要入口文件
- 当前 workset 数量

回答的问题：

- 这个项目现在有哪些 feature
- 哪个 feature 已经准备好继续推进
- 哪个 feature 还停在前序阶段

## 4.4 `domain-map.md`

职责：

- 列出项目级业务域、共享对象和共享规则

至少应包含：

- 域名
- 关联 feature
- 核心对象
- 共享规则或共享边界
- 推荐入口

回答的问题：

- 这个问题属于哪个业务域
- 某个对象横跨哪些 feature
- 跨 feature 的一致性应该先看哪里

## 4.5 `active-context.md`

职责：

- 保存当前最值得优先进入的工作上下文

至少应包含：

- 当前 active feature
- 当前推荐 workset
- 当前主要风险
- 当前推荐阅读顺序

回答的问题：

- 在有限上下文下，我现在最该带哪一组文档
- 如果马上开工，我应该从哪个 workset 进入

## 4.6 `hotspots.md`

职责：

- 保存项目级高风险项、高漂移项和高复用项

至少应包含：

- 热点 ID
- 类型
- 影响域
- 影响 feature
- 推荐入口
- 建议回退步骤

回答的问题：

- 哪些问题会跨 feature 反复出现
- 哪些地方最容易造成自动开发漂移

## 5. 刷新职责

不新增命令，只扩展现有命令的项目级刷新职责。

- `sp.constitution`
  - 初始化 `constitution.md`
  - 初始化 `project-index.md`
  - 初始化 `feature-map.md`
  - 初始化 `domain-map.md`
  - 初始化 `active-context.md`
  - 初始化 `hotspots.md`
- `sp.specify`
  - 把当前 feature 注册进 `feature-map.md`
  - 刷新 `active-context.md`
- `sp.gate`
  - 把 gate 结果同步进 `feature-map.md` 与 `project-index.md`
- `sp.bundle`
  - 刷新 `active-context.md` 的推荐阅读顺序
- `sp.plan`
  - 把 workset 数量和主要 workset 同步进 `feature-map.md`
- `sp.analyze`
  - 把高优先级风险同步进 `hotspots.md`
  - 把最新 readiness 结论同步进 `feature-map.md` 和 `project-index.md`

## 6. 查询优先约束

项目级记忆层也必须优先服务查询：

- `project-index.md` 首屏必须是问题路由矩阵
- `feature-map.md` 必须是可扫读表格，而不是段落
- `domain-map.md` 必须支持按域和对象快速反查
- `active-context.md` 必须让小窗口 agent 一眼看到当前最小工作集
- `hotspots.md` 必须能按优先级和影响范围快速过滤

如果项目级记忆层只是“项目简介”，那就还没有达到应有价值。

## 6.1 固定首屏结构

为了让项目级记忆层真正承担第一跳路由，首屏结构应固定。

- `project-index.md`
  - 第一块必须是“问题类型 / 关键词 / 推荐 feature / 推荐文件 / 下一跳”路由表
  - 第二块才是项目阶段摘要
- `feature-map.md`
  - 第一块必须是“feature / 域 / 当前阶段 / 最新 verdict / 主入口 / 主 workset”总表
  - 不应以自然语言项目介绍开头
- `domain-map.md`
  - 第一块必须是“对象 / 规则 / 所属域 / 关联 feature / 推荐入口”反查表
- `active-context.md`
  - 第一块必须是“当前目标 / 最小阅读集 / 推荐 workset / 当前风险 / 禁止越界范围”表
- `hotspots.md`
  - 第一块必须是“热点 ID / 类型 / 严重度 / 影响域 / 推荐入口 / 回退步骤”过滤表

如果项目级 memory 首屏不能回答“先去哪个 feature”，则视为路由失败。

## 6.2 小窗口入口约束

项目级记忆层需要直接服务小窗口模型，因此还应满足：

- `active-context.md` 必须给出单轮建议阅读集，默认不超过 `5` 个文件
- `project-index.md` 路由后，默认只推荐进入 `1` 个 active feature
- `feature-map.md` 必须显式标出当前主 workset 或推荐入口
- 若当前没有明确 active feature，必须显式写 `No active feature`，不能留白

如果这些约束缺失，agent 仍会回到全项目扫描，失去项目级记忆层的意义。

## 7. 结论

对大型文档工作流来说，只做 feature 级 memory 还不够。

完整骨架应分成两层：

- `.specify/memory/*` 提供项目级第一跳路由
- `specs/<feature>/memory/*` 提供 feature 级局部工作路由

这样 agent 才能先在项目级找到正确 feature，再在 feature 级找到正确 workset。
