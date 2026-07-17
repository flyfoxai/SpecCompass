# /sp.flow 与 /sp.ui 可点击确认界面调研与设计建议

日期：2026-06-21

更新记录：

- 2026-06-21：新增统一确认页模板、Tiffany blue 视觉规范、前端框架选型调研与推荐架构。
- 2026-06-21：补充统一用户信息提示机制，覆盖确认顺序、stale 传播、Stage Readiness、open-items、NEXT_COMMAND 和跨模块提醒。
- 2026-06-21：根据 Gemini/Claude 复核意见补充静态页面工程边界、确认写回模式、授权 schema、source hash 校验、提示去重、门禁例外和跨依赖 stale 传播规则。
- 2026-07-16：确认页扩展为 Flow/UI/PRD Outline 三种类型；新增确认优先级、Outline 图形确认、摘要身份绑定和 `/sp.specify` 门禁。本节后文的历史方案保留为演进记录，当前合同以第 17 节为准。

## 1. 背景与目标

本次调研的目标，是为 `/sp.flow` 和 `/sp.ui` 增加一个更明确的人工确认过程：

- `/sp.flow` 在生成或刷新业务流程后，额外生成一个可点击的流程确认页面，展示当前模块的具体处理流程，并允许用户逐项确认、退回或补充意见。
- `/sp.ui` 在生成或刷新 UI 结构后，额外生成一个可点击的 UI 确认页面，展示对应模块的 UI 界面；在条件允许时，尽量展示该模块涉及的全部前端页面，让用户看到整体项目界面全貌。
- 人工确认结果必须写入文本确认文档。该文档具备授权意义，表示后续可以按确认内容进入计划、实现或开发。
- 如果 UI 依赖尚未进入实现阶段的框架、组件库或设计系统，模型可以基于已知框架特征生成近似展示，但必须主动提取框架特征、标注偏差和不确定项，不能把推断内容当成稳定事实。
- 确认界面采用左右分区：左侧为主要流程图或 UI 预览，右侧为一条从上到下的窄确认栏，承载意见输入、逐项确认按钮、全局确认状态和导出确认文档入口。

本文件是调研和设计建议，不直接修改命令模板。

## 2. 调研方式

本次按用户要求安排了三方协作：

- Claude：侧重 Spec Kit/SP 机制、阶段门禁、确认文档结构、主题混淆风险。
- Gemini：侧重同类产品模式、可视化交互、前端预览和工程取舍。
- Codex：负责读取本仓库现状、补充 GitHub/网页检索、汇总为本设计文档。

第二轮围绕“统一确认页模板、右侧确认栏风格、Tiffany blue 主色、前端框架选型”继续调研：

- Gemini 已返回完整建议，重点推荐“重骨架、轻生成”的 React + Vite 预设骨架方案：统一页面外壳和右侧确认栏由模板承担，模型只生成结构化 JSON 或局部内容。
- Claude 调用超过 3 分钟后仍停留在工具使用阶段，最终被中断；本轮未获得可用 Claude 文本结论。本文档中的 SP 机制建议基于第一轮 Claude 结果、本仓库模板现状和 Codex 机制分析继续完善。

第三轮围绕“这些机制应在何时、以什么形式提示和告知用户”继续调研：

- Gemini 建议按紧急程度建立 `BLOCKER`、`ACTION/AUTHORIZATION`、`WARNING`、`STATUS`、`CONTEXT` 五类提示，并在命令初始化、执行中、阶段边界和命令收尾分别触发；同时强调差异化提醒、聚合提醒和已阅消化，避免提示疲劳。
- Claude 建议建立机器可读的 `NOTIFY_TYPE` 字段体系，覆盖 `BLOCK`、`AUTH`、`WARN`、`STALE`、`READINESS`、`INFO`、`NEXT`，并为每条提示绑定 `TRIGGER_CMD`、`REQUIRED_ACTION`、`BLOCKS_STAGE`、`NEXT_COMMAND` 和 `WRITE_BACK`。
- Codex 对照本仓库现有 `Stage Entry Preflight`、`Blocker Triage Matrix`、`Human Confirmation`、`memory/open-items.md`、`NEXT_COMMAND`、`DO_NOT_RUN`、flow/ui 主体混淆和视觉审查规则，建议把提示机制做成现有 SP 规则的统一表达层，而不是新增一套独立状态系统。

第四轮围绕“方案可实施性和授权严谨性”进行复核：

- Gemini 指出：本地 `file://` 页面不能可靠 fetch 外部 JSON；静态 HTML 也不能直接写回仓库文件。首阶段应采用单文件 HTML 内联数据，或通过本地服务/CLI writer 完成写回；同时应避免每次运行 `npm install` 或 `vite build`。
- Claude 指出：授权记录需要结构化确认人、owner approval、确认粒度、工具版本、偏差项、撤销/重确认规则；stale 检测需要 source snapshot/hash、Stage Entry Preflight 校验、语义影响分级和跨依赖传播。
- Codex 汇总结论：MVP 必须先把工程边界写清楚，再谈模板框架；确认文档应作为 git 跟踪的授权证据，`*-review.html` 和辅助数据默认视为可再生成的审查视图产物，需单独定义跟踪策略。

互联网检索方面，`agent-reach` skill 已按要求启用，但本机当前 shell 中 `agent-reach` 命令不可用，执行 `agent-reach doctor --json` 返回 `command not found`。因此本次降级使用 GitHub CLI 与网页搜索：

- `gh search repos "visual workflow builder" --sort stars --limit 8`
- `gh search repos "React Flow workflow" --sort stars --limit 8`
- `gh search repos "storybook ui review" --sort stars --limit 8`
- `gh search repos "json forms ui schema" --sort stars --limit 8`
- `gh repo view n8n-io/n8n`
- `gh repo view xyflow/xyflow`
- `gh repo view storybookjs/storybook`
- `gh repo view bpmn-io/bpmn-js`
- `gh repo view eclipsesource/jsonforms`
- `gh repo view vitejs/vite`
- `gh repo view preactjs/preact`
- `gh repo view lit/lit`
- `gh repo view sveltejs/svelte`
- `gh repo view vuejs/core`
- `gh repo view alpinejs/alpine`
- `gh repo view mermaid-js/mermaid`
- `gh repo view tailwindlabs/tailwindcss`
- `gh repo view shadcn-ui/ui`

补充网页来源：

- [n8n](https://github.com/n8n-io/n8n)：可视化工作流自动化平台，强调可视化构建与自托管工作流。
- [xyflow / React Flow](https://github.com/xyflow/xyflow)：用于构建节点式 UI、流程图和交互式编辑器的 React/Svelte 开源库。
- [Storybook](https://github.com/storybookjs/storybook)：用于隔离构建、文档化和测试 UI 组件与页面的前端工作台。
- [bpmn-js](https://github.com/bpmn-io/bpmn-js)：BPMN 2.0 图渲染和 Web 建模工具包。
- [JSON Forms](https://github.com/eclipsesource/jsonforms)：基于 JSON Schema 的表单生成方案，支持 React、Angular、Vue。
- [Vite](https://vite.dev/guide/static-deploy.html)：支持构建到 `dist` 并作为静态站点部署或本地预览。
- [Preact](https://preactjs.com/)：React API 接近、体积很小，可用于轻量交互页。
- [Lit](https://lit.dev/docs/)：用于构建轻量 Web Components，强调跨框架复用。
- [Vue](https://vuejs.org/guide/introduction.html)：渐进式框架，可无构建增强静态 HTML，也可构建 SPA/SSG。
- [Alpine.js](https://alpinejs.dev/)：通过 HTML 标记直接组合轻量行为，适合无构建小交互。

## 3. 本仓库现状

当前 `/sp.flow` 与 `/sp.ui` 模板已经具备“视觉/人工审查”门槛，但确认过程仍以文本提示为主。

已有能力：

- `/sp.flow` 会对视觉审查分级：无需确认、建议确认、必须确认。
- `/sp.flow` 要求在建议或必须确认时输出中文流程审查摘要，说明设计依据、业务目标、参与角色、主流程、决策点、异常恢复、状态变化、UI 契约、系统/外部步骤、草稿或推理项和待确认问题。
- `/sp.ui` 也有类似的视觉审查分级，并要求中文 UI 审查摘要。
- 两个命令都已经强调：未确认的草稿不能作为稳定事实进入后续阶段，不能支撑 gate PASS、稳定 memory/trace 或实现准备。
- 两个命令都有强主题边界：命令输出必须描述目标业务应用，不能把 SP 自己的命令、内存、阶段、门禁或处理逻辑生成为业务流程/UI。

缺口：

- 没有可点击的确认页面。
- 没有右侧固定确认栏。
- 没有逐项状态模型，例如 pending、confirmed、modified、rejected、deferred。
- 没有把用户确认与反馈稳定写入授权性文本确认文档的规范。
- 没有明确要求后续阶段读取并校验确认文档。
- 没有定义确认页面作为“SP 工具产物”时如何避免与目标产品 UI 发生主题混淆。

## 4. 同类实践启发

### 4.1 可视化工作流：n8n

n8n 的核心启发是：流程确认最好不是只看文字，而是让用户在可视化画布上看到节点、分支、连接和每个步骤的含义。对 `/sp.flow` 来说，这支持“左侧流程画布 + 右侧逐项确认”的形态。

但 SP 不应直接复制 n8n 的执行器能力。这里需要的是需求确认视图，不是可执行自动化平台。首阶段应避免把 `/sp.flow` 做成真正的流程编排器。

### 4.2 节点式流程图：xyflow / React Flow

xyflow 的启发是：当流程节点需要点击、选中、查看详情、逐项确认时，节点式 UI 比静态图片更合适。它适合后续增强版实现。

首阶段不建议立即引入 React Flow 作为必需依赖。更稳妥的路径是先生成自包含 HTML，并以 Mermaid 或结构化 JSON 驱动简单交互；当确认页面需要拖拽、节点编辑、复杂缩放和大量节点交互时，再升级到 React Flow。

### 4.3 UI 工作台：Storybook

Storybook 的启发是：UI 审查需要在隔离环境中展示页面、组件、状态和交互，而不是只写屏幕说明。对 `/sp.ui` 来说，最接近的目标是生成“可浏览的页面目录 + 页面预览 + 状态切换 + 右侧确认栏”。

但在 implement 阶段之前，项目依赖、真实组件、真实路由和设计系统可能尚未可用。因此 `/sp.ui` 生成的确认页面必须标注其性质：这是 UI 规格预览，不是最终生产实现。

### 4.4 标准流程建模：bpmn-js

bpmn-js 的启发是：复杂审批、跨角色协作、网关、事件和异常流可以用更标准的流程语义表达。对普通 `/sp.flow`，Mermaid 足够轻量；对强流程治理场景，可以将 BPMN 作为升级表达。

默认不建议把 BPMN 作为第一阶段标准，因为 BPMN XML 建模成本较高，会增加命令输出复杂度。

### 4.5 Schema 驱动表单：JSON Forms

本仓库归档文档已经建议在配置页、表单页、业务后台页中优先考虑 JSON Forms。JSON Forms 的启发是：确认栏本身也可以被结构化数据驱动，尤其适合“字段、状态、反馈、确认人、时间、偏差说明”的稳定采集。

`/sp.ui` 如果已经生成 JSON Schema/UI Schema，则确认页面可直接复用这些结构渲染预览；如果尚未进入实现阶段，也可以用 UI schema 样式的中间结构作为模型友好的预览输入。

### 4.6 前端框架补充调研

第二轮调研重点比较了 React + Vite、Preact、Lit/Web Components、Svelte、Vue、Alpine/HTMX、纯 HTML、Storybook、React Flow、Mermaid、JSON Forms 等组合。

关键判断：

| 方案 | 优点 | 风险 | 适合程度 |
|---|---|---|---|
| React + Vite | 生态成熟，模型生成稳定，兼容 React Flow、JSON Forms、Storybook、shadcn/ui，静态构建清晰 | 需要 Node 构建和依赖缓存 | 推荐主路径 |
| Preact + Vite | 更轻，React API 接近，可降低产物体积 | 与 React Flow、JSON Forms 等生态兼容要额外验证 | 轻量备选 |
| Lit/Web Components | 跨框架复用强，适合把确认栏做成 Web Component | 模型生成稳定性弱于 React，复杂状态管理成本更高 | 模板组件备选 |
| Vue/Svelte | 体验成熟，静态构建可行 | 与 React Flow、JSON Forms 的直接生态弱于 React | 项目已有该栈时可选 |
| Alpine + 静态 HTML | 极轻，无构建，适合简单点击与表单 | 复杂流程图、页面状态、JSON Forms/React Flow 集成弱 | 最小降级方案 |
| Storybook | 适合 UI 组件和页面状态审查 | 过重，不适合作为 specification 阶段默认依赖 | 后续增强 |
| React Flow | 节点式流程交互强 | 首阶段引入会增加复杂度 | 复杂 flow 增强 |
| Mermaid | 文本稳定、模型友好、易版本管理 | 交互能力有限 | flow 首阶段默认 |
| JSON Forms | Schema 驱动、验证清晰 | 更适合表单/配置类 UI，不适合所有页面 | ui 表单类增强 |

推荐结论：

- 主路径采用 `React + Vite` 作为确认页模板工程。
- 采用“重骨架、轻生成”机制：模板工程内置统一页面外壳、右侧确认栏、Tiffany blue token、按钮/输入/状态组件、导出确认文档逻辑；模型只输出 `flow-review-data.json` 或 `ui-review-data.json`，以及少量受约束的页面描述，不直接生成完整前端应用。
- 首阶段仍允许生成自包含静态 HTML；但中长期应提供一个可复用模板工程，以减少重复 HTML、样式漂移和模型生成错误。
- 静态 HTML 的 MVP 应优先采用“预编译模板 + 运行时数据内联注入”。命令不应在每次运行时安装依赖或重新构建前端工程；`npm install`/`vite build` 应只发生在模板开发、发布或显式刷新模板包时。
- 如果页面以 `file://` 方式直接打开，不能假设浏览器可以稳定读取相邻的 `flow-review-data.json` 或 `ui-review-data.json`。此时应把 review data 内联到 HTML 的 `<script type="application/json">` 中，或改用本地 server 模式。
- 如果用户环境不允许安装依赖，降级到 Alpine + 本地化 Mermaid 的单文件 HTML。

重要边界：

- 上述框架选择只约束 SP 确认页模板工程，属于 SpecCompass/SP 工具层，不等同于 PRD 中目标产品的前端技术栈。
- PRD 或目标产品的前端框架选择，应优先考虑真实 UI 开发需要：业务页面复杂度、团队既有技术栈、组件库、运行环境、性能、可访问性、部署方式和长期维护成本。
- 如果 PRD 已明确要求 Vue、Svelte、原生 Web Components、服务端渲染、移动端框架或其他技术栈，`/sp.ui` 的目标产品 UI 规格应服从 PRD；React + Vite 确认页只能作为审查外壳或近似预览层。
- 如果确认页模板使用的框架不能准确表达 PRD 要求的 UI 能力，应及时标注偏差，并转向更符合 PRD 的预览方式，例如接入真实项目 dev server、Storybook、目标框架 adapter，或在确认文档中把该项列为 `Needs implementation check`。
- 前端展示页面的设计必须接入 `huashu-design` skill。React + Vite 是确认页工具层默认方案，负责承载、构建和交互；`huashu-design` 负责前端展示页面的设计规范、视觉组织和页面体验判断。两者不是替代关系。
- 如果当前宿主没有提供 `huashu-design` skill，应在确认页和确认文档中记录 `Design Skill: huashu-design missing`，并把视觉结果标记为非授权草稿或带偏差的近似预览，等待用户安装/启用 skill 或明确接受降级。
- `huashu-design` 同时作用于三类界面：SpecCompass 确认页、业务 UI 预览、业务前端实现。确认页必须使用统一 Tiffany blue 模板和右侧确认栏；业务 UI 预览默认以 `huashu-design` 为设计权威；业务前端实现则把确认过的设计要求转成 theme token、CSS 变量、组件样式、布局规则和验收检查。
- 如果 PRD 或目标产品已确认设计系统与 `huashu-design` 冲突，业务前端实现应服从 PRD 或产品设计系统，但必须记录 `brand_override`、偏差项、原因和影响范围。前端框架只是承载方式，不能替代设计权威。
- 右侧确认栏只属于确认页。approve/defer/reject 控件、反馈输入、授权写回 UI 和 SpecCompass 控制面标签不得进入业务前端实现，除非目标产品明确要求类似业务审批侧栏，并且该侧栏已按业务权限、数据和验收重新建模。

## 5. 统一确认页模板规范

所有 `/sp.flow` 与 `/sp.ui` 确认页面都应采用同一套模板，而不是分别生成风格不同的页面。

### 5.1 模板职责

统一模板负责：

- 页面顶部机制说明。
- 页面标题、副标题、feature/workset 元数据。
- 左侧主内容布局容器。
- 右侧窄确认栏。
- 确认状态机。
- 意见输入。
- 生成 Markdown 确认文档。
- Tiffany blue 主题 token。
- 主题混淆提示和 SP 工具产物标记。

命令只负责提供数据：

- `/sp.flow` 提供 flow 节点、分支、异常、状态、UI 契约和来源。
- `/sp.ui` 提供 screen map、屏幕、区域、字段、动作、状态、框架推断和来源。

首阶段模板必须明确两种运行模式：

- `single-file-static`：生成一个可本地打开的 `*-review.html`，review data 内联在 HTML 中；页面只能生成或下载/复制 Markdown，不能直接修改仓库里的 `*-confirmation.md`。
- `local-writer`：由 CLI 或本地 server 提供写回端点，确认页把确认结果提交给 writer，由 writer 写入 `*-confirmation.md`；该模式需要显式启动，不应伪装成普通静态 HTML。

因此，文案中应避免说“点击后直接写入确认文档”，除非实际启用了 `local-writer`。默认应表述为“生成确认文档内容，并由命令或用户保存到指定文件”。

### 5.2 顶部区域

顶部区域建议固定三层：

```text
┌────────────────────────────────────────────────────────────┐
│ SpecCompass Review Gate                                    │
│ 本页面是 SP 工具确认页，用于审查规格草稿，不是目标产品 UI。  │
├────────────────────────────────────────────────────────────┤
│ <页面标题>                                                   │
│ <feature / command / stage / readiness / source snapshot>   │
└────────────────────────────────────────────────────────────┘
```

标题规则：

- `/sp.flow`：`流程确认：<feature 或模块名>`
- `/sp.ui`：`界面确认：<feature 或模块名>`
- 项目级 UI 全貌：`项目界面全貌确认：<project>`

顶部必须展示：

- command：`/sp.flow` 或 `/sp.ui`
- stage：`flow` 或 `ui`
- feature/workset
- review status
- source snapshot 或 evidence signature 摘要
- 明确标记：`SP TOOLING ARTIFACT - NOT TARGET PRODUCT UI`

### 5.3 右侧确认栏视觉规范

右侧确认栏作为全局固定区域，应在 flow 与 ui 页面完全一致。

建议尺寸：

- 桌面宽度：`320px` 到 `380px`，最大不超过视口 `28%`。
- 最小可读宽度：`300px`。
- 移动端：转为底部抽屉或全屏确认面板。

结构：

```text
确认栏
├── 当前选中项
├── 来源与偏差标签
├── 状态选择
├── 人工意见输入
├── 当前项确认按钮
├── 全局进度
├── 未解决项
└── 导出/复制确认文档
```

交互规则：

- 选中左侧节点、屏幕、字段或动作时，确认栏显示当前项详情。
- 右侧状态选择必须始终可见。
- 意见输入框高度建议 `120px` 到 `180px`，允许多行。
- 全局确认按钮放在确认栏底部，视觉上固定。
- 对 `model-inferred`、`framework-inferred`、`deviation` 项显示 Tiffany blue 之外的警示色，不用主色掩盖风险。

### 5.4 Tiffany blue 视觉 token

用户指定 Tiffany blue 作为主要配色。建议使用克制的操作型配色，不做大面积纯色背景。

推荐 token：

| Token | 色值 | 用途 |
|---|---|---|
| `--spc-tiffany-500` | `#0ABAB5` | 主按钮、选中边框、关键进度 |
| `--spc-tiffany-600` | `#079E9A` | 主按钮 hover、active |
| `--spc-tiffany-100` | `#DDF8F6` | 轻背景、选中项浅底 |
| `--spc-ink-900` | `#142322` | 标题和正文主色 |
| `--spc-ink-600` | `#5C6F6D` | 次级说明 |
| `--spc-surface` | `#FFFFFF` | 面板背景 |
| `--spc-canvas` | `#F6FAF9` | 页面背景 |
| `--spc-border` | `#D7E6E4` | 分割线 |
| `--spc-warning` | `#B7791F` | 推断/偏差提示 |
| `--spc-danger` | `#C2413A` | 拒绝/阻断 |

使用规则：

- Tiffany blue 只用于确认动作、选中态、进度和少量重点节点。
- 页面主体保持浅灰白和墨绿色文本，避免整页变成单一蓝绿色。
- 右侧确认栏使用白底、浅边框、Tiffany blue 顶部细线或按钮强调。
- 拒绝、阻断、偏差不能使用 Tiffany blue，必须使用警示/危险色。

### 5.5 统一模板文件建议

建议后续新增模板目录：

```text
templates/review/
├── README.md
├── package.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── review-shell.tsx
│   ├── review-rail.tsx
│   ├── flow-review-view.tsx
│   ├── ui-review-view.tsx
│   ├── confirmation-markdown.ts
│   ├── review-state.ts
│   └── styles.css
└── fixtures/
    ├── flow-review-data.example.json
    └── ui-review-data.example.json
```

命令输出时复制或引用该模板，并写入：

- `specs/<feature>/flows/review/flow-review-data.json`
- `specs/<feature>/ui/review/ui-review-data.json`

模板工程读取数据后生成统一确认页面。

产物跟踪建议：

- `flow-confirmation.md`、`ui-confirmation.md` 是授权证据，默认应进入 git 跟踪。
- `flow-review.html`、`ui-review.html` 是审查视图产物，可按项目策略选择跟踪或忽略；如果可由模板和数据稳定再生成，建议加入 `.gitignore`。
- `flow-review-data.json`、`ui-review-data.json` 是中间数据。若确认文档已包含 source snapshot、确认项和用户反馈，可忽略；若后续命令需要读取结构化确认项，则应跟踪或生成同名机器索引。
- 无论 review HTML 是否跟踪，确认文档必须能独立解释授权范围、来源快照、确认人、偏差项和未解决项。

## 6. 核心设计结论

建议把确认机制定义为“SP 工具产物”，而不是目标业务应用的一部分。

也就是说，`flow-review.html` 和 `ui-review.html` 是为了帮助用户审查 SP 生成的规格草稿。它们可以展示目标业务应用的流程和 UI，但它们自身不是目标产品功能，不能被 `/sp.flow` 或 `/sp.ui` 误认为目标产品需求。

建议新增三类产物：

```text
specs/<feature>/
├── flows/
│   ├── index.md
│   ├── *.mmd
│   └── review/
│       ├── flow-review.html
│       ├── flow-review-data.json
│       └── flow-confirmation.md
└── ui/
    ├── index.md
    ├── screen-map.md
    ├── screen-*.md
    └── review/
        ├── ui-review.html
        ├── ui-review-data.json
        └── ui-confirmation.md
```

首阶段的推荐边界：

- 生成静态、自包含、可本地打开的 HTML。
- 不依赖 CDN，不要求项目 dev server。
- 右侧确认栏把用户反馈整理成 Markdown 确认文档，可复制、下载，或交给显式启用的 local writer 写入。
- SP 后续阶段读取 `*-confirmation.md`，而不是信任浏览器状态。
- 以后再增加真实写回、签名、哈希校验或集成式 WebView。

## 7. `/sp.flow` 确认页面设计

### 6.1 页面布局

建议布局：

```text
┌─────────────────────────────────────────────┬──────────────┐
│ 流程主视图                                   │ 确认栏        │
│                                             │              │
│ - Mermaid/节点图                             │ 当前选中项    │
│ - 主流程、分支、异常、外部系统步骤             │ 状态选择      │
│ - 可点击 FLOW/DEC/ERR/EXT 标签                │ 意见输入      │
│ - 节点详情浮层或下方面板                      │ 确认按钮      │
│                                             │ 导出确认文档  │
└─────────────────────────────────────────────┴──────────────┘
```

右侧确认栏应窄而稳定，建议宽度为桌面视口的 20%-28%，移动端可以转为底部抽屉。

### 6.2 可确认对象

`/sp.flow` 的确认对象不宜细到每个视觉像素，而应围绕业务语义：

- 主流程阶段：`FLOW A1`
- 关键步骤：`FLOW A1-3`
- 决策点：`DEC D2`
- 异常/恢复路径：`ERR E1`
- 外部系统或人工步骤：`EXT X1`
- 状态变化：`STATE S2`
- UI 契约：`UI-CONTRACT U1`

每个对象需要有稳定字段：

| 字段 | 含义 |
|---|---|
| `id` | 稳定确认 ID，例如 `FLOW-A1-3` |
| `visible_label` | 页面中可见标签，例如 `FLOW A1-3` |
| `title` | 人类可读名称 |
| `type` | flow、decision、exception、external、state、ui_contract |
| `source` | spec、clarification、flow、model-inferred、open-item |
| `business_meaning` | 用户正在确认的业务含义 |
| `related_refs` | 关联 spec、flow、UI、API、data、test 引用 |
| `inference_level` | source-backed、bounded-inference、draft |
| `deviation_note` | 偏差、不确定性或待确认事项 |

### 6.3 交互状态

建议确认状态：

- `pending`：未处理。
- `confirmed`：确认无修改。
- `modified`：原则确认，但需要按意见修改。
- `rejected`：不接受，需要重新生成或回到澄清。
- `deferred`：暂缓确认，不能作为后续稳定授权依据。

规则：

- `modified`、`rejected`、`deferred` 必须填写反馈意见。
- `model-inferred` 或 `[INFER:DRAFT]` 对象必须显式确认，不能被“全选确认”静默带过。
- 全局确认按钮只有在所有必需项均为 `confirmed` 或有可处理的 `modified` 时可用。
- 若存在 `rejected` 或关键 `deferred`，`Stage Readiness` 不能进入 `READY_FOR_UI`。

## 8. `/sp.ui` 确认页面设计

### 7.1 页面布局

`/sp.ui` 的确认页面建议是“页面地图 + 页面预览 + 元素确认栏”。

```text
┌─────────────────────────────────────────────┬──────────────┐
│ UI 主视图                                    │ 确认栏        │
│                                             │              │
│ - 页面地图 / 导航                             │ 当前屏幕      │
│ - 当前页面静态预览                            │ 当前元素      │
│ - 屏幕、区域、字段、按钮、状态标签              │ 状态选择      │
│ - 框架推断与偏差标识                          │ 意见输入      │
│                                             │ 导出确认文档  │
└─────────────────────────────────────────────┴──────────────┘
```

首阶段可以生成静态 HTML 页面。若项目已有设计系统、组件库、CSS 框架或 JSON Forms 结构，确认页面应尽量提取并模拟其可观察特征：

- 布局密度。
- 表单组织方式。
- 按钮层级。
- 表格/列表样式。
- 导航结构。
- 字体、颜色、间距和表面处理。
- 常见状态：empty、loading、error、success、disabled、permission-denied。

### 7.2 可确认对象

`/sp.ui` 的确认对象建议包括：

- 屏幕：`SCREEN S1`
- 区域：`SECTION S1.2`
- 字段：`FIELD F3`
- 操作：`ACTION A2`
- 状态：`STATE ST4`
- 页面关系：`NAV N1`
- 数据展示：`TABLE T1`、`CHART C1`
- 权限状态：`PERM P1`
- 推断的框架特征：`FRAMEWORK FX1`

每个对象应绑定来源：

- flow step 或 UI contract。
- spec/clarification。
- 数据对象/API/权限规则。
- model-inferred。
- framework-inferred。
- open item。

### 7.3 全项目页面全貌

用户提出“最好能在 ui 界面的时候，生成所有的前端页面”。建议把它拆成两级：

- 当前模块必需：必须展示当前 feature/workset 的所有相关页面和关键状态。
- 项目全貌可选：当 `screen-map.md`、项目路由、历史 UI 文档或已有前端代码足够时，生成项目级页面地图；缺证据时只生成“已知页面 + 未确认页面占位”，不要虚构完整应用。

推荐输出：

```text
specs/<feature>/ui/review/ui-review-data.json
{
  "feature": "...",
  "scope": "feature | project-overview",
  "screens": [...],
  "known_project_pages": [...],
  "inferred_project_pages": [...],
  "missing_evidence": [...],
  "framework_profile": {...}
}
```

### 7.4 框架依赖与偏差标注

当页面依赖尚未实现的框架或组件库时，确认页面必须显示偏差提示：

- `Source: framework-inferred`：基于框架文档、已有代码或项目约定推断。
- `Deviation: visual approximation`：视觉近似，不代表最终组件完全一致。
- `Needs implementation check`：进入 implement 后需要用真实组件重渲染或截图复核。

偏差需要分级，避免所有近似都被同等看待：

| 等级 | 含义 | 门禁影响 |
|---|---|---|
| `deviation-minor` | 间距、圆角、轻微色值、图标替代等不影响业务判断的视觉差异 | 可继续，写入确认文档 |
| `deviation-moderate` | 组件行为、响应式布局、表单校验、复杂状态展示可能与真实框架不同 | 可进入下一步，但需在 plan/implement 前复核 |
| `deviation-critical` | 权限、数据可见性、关键交互、流程副作用或核心组件能力无法准确表达 | 阻断稳定授权，需回到 `/sp.ui`、真实框架预览或实现前 spike |

确认文档中应单独列出这些偏差项，避免用户误以为已经确认了最终像素级实现。

## 9. 确认文档规范

确认文档建议保持 Markdown，因为它可读、可 diff、可被后续命令读取。

推荐文件：

- `specs/<feature>/flows/review/flow-confirmation.md`
- `specs/<feature>/ui/review/ui-confirmation.md`

推荐结构：

```markdown
---
document_type: sp_human_confirmation
command: /sp.flow
feature: <feature>
schema_version: 1
tool_version: sp-review-template@1
review_artifact: specs/<feature>/flows/review/flow-review.html
review_artifact_mode: single-file-static | local-writer | server-preview
source_artifacts:
  - specs/<feature>/spec.md
  - specs/<feature>/flows/index.md
source_artifacts_snapshot:
  - path: specs/<feature>/spec.md
    digest: sha256:<...>
    semantic_scope:
      - requirements
      - acceptance
    anchors:
      - <heading-or-stable-id>
source_hash_verified: MATCH | STALE | NOT_CHECKED
confirmation_granularity: all-items | critical-items-only | selected-items
confirmed_by:
  name: <本地用户或手工填写>
  email: <optional>
  role: owner | reviewer | stakeholder
  confirmed_at: <ISO-8601 或 None>
reviewers:
  - name: <name>
    role: reviewer
    status: approved | commented | requested_changes
owner_approval:
  required: true
  status: APPROVED | PENDING | NOT_REQUIRED
human_confirmation: CONFIRMED | NEEDS_REVISION | REJECTED | SCOPED_CONFIRMATION | STALE | REVOKED
authorization_scope: <允许后续进入的阶段>
items_with_deviation:
  - id: <item-id>
    severity: deviation-minor | deviation-moderate | deviation-critical
    note: <偏差说明>
reservations:
  - <确认保留意见>
revocation:
  status: active | revoked | superseded
  revoked_by: <name-or-None>
  revoked_at: <ISO-8601-or-None>
---

# 人工确认记录

## 授权声明

我确认本文档列出的流程/UI 项已按对应状态完成审查。状态为 `confirmed` 的项目允许作为后续 `/sp.ui`、`/sp.plan`、实现或 gate 判断的输入；状态为 `modified` 的项目必须先按意见修订；状态为 `rejected` 或关键 `deferred` 的项目不得作为稳定开发依据。

## 确认项

| ID | 可见标签 | 类型 | 名称 | 状态 | 用户意见 | 来源 | 偏差/推断 |
|---|---|---|---|---|---|---|---|
| FLOW-A1 | FLOW A1 | flow | 主流程 | confirmed |  | spec |  |

## 全局反馈

<用户输入>

## 未解决项

<open items>

## 偏差与保留意见

<items_with_deviation / reservations>

## 下游授权

- Next allowed stage: READY_FOR_UI | READY_FOR_PLAN | BLOCKED
- Required repairs before next stage: ...
```

### 9.1 授权意义

确认文档的授权意义不是法律电子签名，而是 SP 工作流内的开发授权证据：

- 后续命令可以读取该文档判断是否允许进入下一阶段。
- `Stage Readiness` 的 `Visual/Human Review` 字段必须引用该文档。
- 如果源文件在确认后变化，确认文档应被标记为 stale，需要重新确认。
- `confirmed_by` 代表本次授权责任主体；当 owner approval required 时，普通 reviewer 的 approved 不等同于 owner 授权。
- 如果确认被撤销、上游语义变化或偏差升级，应把 `human_confirmation` 改为 `REVOKED` 或 `STALE`，并要求重新确认；不能在旧确认文档上静默覆盖授权结论。

确认写回模式：

- 静态单文件模式：确认页生成 Markdown 文本，用户或 CLI 把内容保存到指定 `*-confirmation.md`。页面应显示目标路径和“该文件需要进入 git 跟踪”的提示。
- 本地 writer 模式：确认页通过本地端点提交确认结果，由命令写入文件，并在完成后输出实际写入路径和 source hash。
- 无论哪种模式，后续阶段只信任仓库中的 `*-confirmation.md`，不信任浏览器 localStorage、临时 DOM 状态或未保存的下载内容。

### 9.2 机器可读增强

后续可增加同名 JSON：

- `flow-confirmation.json`
- `ui-confirmation.json`

但首阶段不建议只写 JSON。确认记录应以 Markdown 为主，JSON 作为可选机器索引。

## 10. Stage Readiness 集成

建议在 `Stage Readiness` 中增加或规范以下字段：

```text
Human Confirmation: PENDING | CONFIRMED | NEEDS_REVISION | REJECTED | NOT_REQUIRED
Confirmation Artifact: specs/<feature>/flows/review/flow-confirmation.md
Confirmed At: <ISO-8601 或 None>
Confirmed Source Hash: sha256:<...> | None
Source Hash Verified: MATCH | STALE | NOT_CHECKED
Confirmation Scope: flow | ui | project-ui-overview
Depends On: <upstream feature/domain/artifact list or None>
Dependency Confirmation: MATCH | WARN | BLOCK | NOT_CHECKED
Unconfirmed Critical Items: <列表或 None>
```

流程阶段建议：

- `/sp.flow` 若要求批量确认且确认未完成，则保持 `WAITING_FOR_BATCH_REVIEW`；若确认项本身需要人工取舍或无法安全推进，则使用 `NEEDS_DECISION` 或 `BLOCKED`。确认前不能写 `READY_FOR_UI`。
- `/sp.flow` 确认完成且无关键未解决项，才允许 `READY_FOR_UI`。
- `/sp.ui` 若要求批量确认且确认未完成，则保持 `WAITING_FOR_BATCH_REVIEW`；若确认项本身需要人工取舍或无法安全推进，则使用 `NEEDS_DECISION` 或 `BLOCKED`。确认前不能写 `READY_FOR_PLAN`。
- `/sp.ui` 确认完成且无关键未解决项，才允许 `READY_FOR_PLAN`。

Stage Entry Preflight 需要执行确认校验：

- 读取 `Confirmation Artifact`，校验 `human_confirmation`、`owner_approval.status`、`authorization_scope` 和 `confirmation_granularity`。
- 计算或读取 `source_artifacts_snapshot` 的 digest，并写入 `Source Hash Verified: MATCH | STALE | NOT_CHECKED`。
- 如果上游依赖在 `Depends On` 中，先检查依赖的确认状态和 source hash；上游变化影响当前业务语义时写 `Dependency Confirmation: BLOCK`，只影响展示或非关键说明时写 `WARN`。
- 只有语义性变化触发确认 stale。格式化、拼写、注释、无业务含义的描述修正不应自动废弃授权，但可记录为 `NOT_CHECKED` 或低风险 `WARN`。

## 11. 统一用户提示机制

统一提示机制的目标，是把“为什么现在不能继续”“为什么要先确认 flow”“哪些确认已经 stale”“下一步该运行什么命令”等信息，在恰当时机用同一套结构告知用户。它不是新的事实源，事实仍然来自 source docs、`Stage Readiness`、`memory/open-items.md`、确认文档、analysis/gate 证据和命令收尾。

### 11.1 提示类型

建议采用七类提示：

| 类型 | 含义 | 是否阻断 | 典型场景 |
|---|---|---:|---|
| `BLOCK` | 当前命令不能安全继续 | 是 | flow 未确认却运行 `/sp.ui`；UI 未确认却运行 `/sp.plan`；open blocker 未关闭 |
| `AUTH` | 需要人工确认或授权 | 是，直到确认完成 | flow review、UI review、风险接受、验证降级 |
| `STALE` | 上游证据变化导致下游确认或 readiness 过期 | 视影响而定 | `spec.md` 变化后原 `flow-confirmation.md` 失效 |
| `WARN` | 可以继续，但存在需看见的风险或偏差 | 否 | `framework-inferred`、低风险 trace 缺口、Monitoring open item |
| `READINESS` | 阶段状态发生转换 | 否 | `READY_FOR_UI` 解锁、gate PASS、readiness 退回 |
| `INFO` | 机制说明或上下文告知 | 否 | 首次说明“依赖域内先确认 flow baseline，再确认 UI” |
| `NEXT` | 命令收尾下一步 | 否 | `NEXT_COMMAND`、`DO_NOT_RUN`、推荐选项 |

### 11.2 提示字段契约

每条重要提示都应能映射为机器可读字段。面向人的输出可以更简洁，但内部字段应稳定：

```text
NOTIFY_TYPE: BLOCK | AUTH | STALE | WARN | READINESS | INFO | NEXT
NOTIFY_ID: <type>-<feature-or-domain>-<stable-signature>
TRIGGER_CMD: /sp.route | /sp.specify | /sp.clarify | /sp.flow | /sp.ui | /sp.analyze | /sp.gate | /sp.plan | /sp.tasks | /sp.implement | system
SEVERITY: critical | high | medium | low
AFFECTED_SCOPE: <feature / dependency-domain / module / artifact>
ARTIFACT: <受影响文件或 None>
STATE_HASH: <condition hash 或 None>
SEMANTIC_IMPACT: none | visual-only | copy-only | business-flow | data-contract | permission | side-effect | unknown
MESSAGE: <一句话说明发生了什么>
WHY_NOW: <为什么此刻提示>
IMPACT: <继续或忽略的影响>
REQUIRED_ACTION: <必须做什么；无需操作时写 None>
BLOCKS_STAGE: <READY_FOR_UI / READY_FOR_PLAN / READY_FOR_TASKS / READY_FOR_IMPLEMENT / None>
NEXT_COMMAND: </sp.* ... 或 None>
DO_NOT_RUN: <当前不应运行的命令或 None>
WRITE_BACK: <写回目标和字段>
```

确认页右侧栏可以用同一字段生成窄栏提示卡：顶部显示 `MESSAGE`，中部显示 `IMPACT` 和 `REQUIRED_ACTION`，底部显示确认按钮、意见输入和 `NEXT_COMMAND`。

### 11.3 触发时机

提示应绑定命令生命周期，而不是随机插入长解释：

- 命令入口：运行 Stage Entry Preflight 后提示 `BLOCK`、`STALE`、关键 `WARN` 和首次 `INFO`。例如 `/sp.ui` 入口发现 flow baseline 未确认，应立即停止并说明原因。
- 生成确认页前：提示确认页性质、授权意义、SP 工具产物声明、框架推断偏差和需要人工看的标签。
- 到达阶段边界：`/sp.flow` 完成后触发 `AUTH`，要求确认 flow；`/sp.ui` 完成后触发 `AUTH`，要求确认 UI。
- 用户反馈改变上游事实时：如果 UI 意见提出新增业务流程、权限、状态转换、异常恢复或副作用，应提示“这不是 UI 层可吸收修改”，并路由回 `/sp.flow`、`/sp.specify` 或 `/sp.clarify`。
- stale 检测时：源文档、flow、UI、open-items 或确认文档之间不再匹配时，提示 root stale，并折叠下游派生 stale。
- analyze/gate 时：缺少人工确认证据、Evidence Signature、open-items 字段、trace 证据或 owner review 时，按现有规则输出 `WARN`、`BLOCK` 或 `NEEDS_DECISION`。
- 命令收尾：始终输出 `NEXT`，包含 2-3 个选项、推荐项、`NEXT_COMMAND` 和 `DO_NOT_RUN`；最终复制框只放一个可复制命令。

### 11.4 Flow/UI 确认顺序提示

默认提示策略应明确但不过度重复。确认顺序采用 batch-first human review：系统可以分模块、分页面、分命令逐步生成草稿，但人工确认默认集中发生，先集中确认当前 feature、workset 组或依赖域内所有 flow，再集中确认所有 UI。

- 首次进入某依赖域的 `/sp.flow` 或 `/sp.ui` 时，用 `INFO` 提示：默认 `confirm_strategy: batch`，原因是集中确认能减少跨天/跨周重复会议和上下文遗忘；如果当前范围不适合批量确认，系统会提示降级为 `hybrid` 或 `rolling` 的理由。
- `/sp.flow` 批次产出后，用 `AUTH` 提示：当前 flow batch 仍是待授权输入，确认完成前不能解锁稳定 UI。`Stage Readiness.Status` 应写为 `WAITING_FOR_BATCH_REVIEW`，并记录 `Batch ID`、`Batch Scope`、`Batch Review Status` 和确认页路径。
- `/sp.ui` 入口若 flow batch 未确认，用 `BLOCK` 提示：`flow-confirmation.md` 不存在、状态非 `CONFIRMED`、`Stage Readiness.Status` 为 `WAITING_FOR_BATCH_REVIEW`，或 `Stage Readiness.Human Confirmation` 非稳定状态，下一步应回到 `/sp.flow` 或 flow 确认页。
- `/sp.ui` 批次产出后，用 `AUTH` 提示：当前 UI batch 仍是待授权输入，确认完成前不能解锁 `READY_FOR_PLAN`。`Stage Readiness.Status` 应写为 `WAITING_FOR_BATCH_REVIEW`，并记录 `Batch ID`、`Batch Scope`、`Batch Review Status` 和确认页路径。
- 如果 flow 修改后已有 UI 确认失效，用 `STALE` 提示：UI 确认依赖的 flow baseline 已变化，需要重新生成或重新确认 UI。root stale 未解除时，下游派生 stale 折叠为“等待上游 flow batch 重新确认”。

批量确认策略字段：

```yaml
confirm_strategy: batch | hybrid | rolling
default_confirm_strategy: batch
batch_review_status: draft | waiting_for_batch_review | confirmed | partial | rejected | stale
```

降级触发条件应显式提示并写回：

- 强跨模块依赖要求先锁定核心流程。
- 核心流程仍处于探索状态，批量确认会掩盖关键方向选择。
- batch 范围超过人工可理解上限，需要按依赖域拆成子 batch。
- reviewer 群体无法参与同一次确认窗口，必须按职责拆分。
- 确认期间上游 source 发生语义变化，原 batch baseline stale。
- 当前只是小型 hotfix，完整 batch 成本明显高于收益。

部分确认默认不能直接授权下游。未通过项要么拆成独立子 batch 并更新依赖关系，要么保持整体 batch 为 `WAITING_FOR_BATCH_REVIEW` / `NEEDS_DECISION`。

允许有限例外，但必须显式记录：

- `visual-only` UI 调整：仅涉及间距、颜色、图标替换、布局密度等，不改变流程、权限、数据契约、状态转换或副作用。
- `global-style` 或 accessibility refactor：全局样式、可访问性标签、对比度、键盘焦点等，不改变业务语义。
- `copy-only` 文案调整：不改变承诺、验收标准、错误恢复、权限或合规含义。

例外不能绕过记录。`/sp.ui` 必须在确认文档或 Stage Readiness 中写入 exemption reason、affected scope、review owner 和后续复核点；如果后续发现影响业务语义，应立即升级为 `STALE` 或 `BLOCK`。

建议的阻断提示示例：

```text
NOTIFY_TYPE: BLOCK
MESSAGE: flow baseline 尚未完成用户确认，当前不能生成稳定 UI。
IMPACT: 如果跳过确认，UI 可能把未授权流程当成开发依据。
REQUIRED_ACTION: 打开 flow-review.html 完成确认，并写入 flow-confirmation.md。
BLOCKS_STAGE: READY_FOR_UI
NEXT_COMMAND: /sp.flow <feature> 请重新生成或补齐 flow 确认页，并输出 flow-confirmation.md
DO_NOT_RUN: /sp.ui, /sp.plan, /sp.implement
WRITE_BACK: Stage Readiness -> Human Confirmation: BLOCKED
```

### 11.5 Stale 传播与折叠

stale 提示必须指向根因，而不是让用户面对一串派生错误：

```text
spec.md 变更
  -> STALE: flow-confirmation.md
  -> STALE: ui-confirmation.md
  -> BLOCK: READY_FOR_PLAN
```

根 stale 未解除时，下游提示折叠成一句“等待上游 flow confirmation 重新确认”。只有当根 stale 已解除、下游仍有独立问题时，才展开下游提示。

写回建议：

- `flow-confirmation.md` 或 `ui-confirmation.md`：标记 `human_confirmation: STALE` 或增加 `stale_reason`、`stale_source`。
- `Stage Readiness`：写 `Human Confirmation: STALE`、`Next Allowed Stage: BLOCKED`、`Writeback Target`。
- `memory/open-items.md`：只有 stale 影响验收、实现准入、风险关闭或人工决策时，才登记为 open item；普通短期刷新不应制造长期噪音。

stale 检测算法建议：

1. 在确认文档写入 `source_artifacts_snapshot`，至少包含路径、digest、关键 anchors 和 semantic scope。
2. 每次 Stage Entry Preflight 重新计算 source digest，并先判断是否为语义性变化。
3. 对格式、空白、注释、无业务含义的 typo 修正，默认不升级为 `STALE`；可保留 `Source Hash Verified: NOT_CHECKED` 或 `WARN`。
4. 对需求、流程分支、权限、状态、副作用、数据契约、验收标准和关键 UI contract 的变化，标记对应确认 stale。
5. 对跨依赖域变化，根据影响分级：影响当前确认授权范围时 `BLOCK`，只影响参考展示或非关键上下文时 `WARN`。

### 11.6 与现有模块的接入

| 模块 | 应提示的内容 | 写回位置 |
|---|---|---|
| `/sp.route` | 主线不明、stale route、当前不要运行的下游命令、唯一 `NEXT_COMMAND` | route JSON、`.specify/memory/active-context.md` |
| `/sp.specify` | source authority 缺口、需求变更、范围冲突、需要回写的稳定事实 | `spec.md`、`memory/open-items.md`、Stage Readiness |
| `/sp.clarify` | 人工决策包、候选方案、影响范围、选择后的决策记录 | `clarifications.md`、`clarify-log.md`、`memory/open-items.md` |
| `/sp.flow` | flow baseline 策略、确认页生成、主流程/异常/状态变化确认、UI 不能提前吸收流程变化 | `flows/review/*`、`flow-confirmation.md`、Stage Readiness |
| `/sp.ui` | 上游 flow 未确认、框架推断偏差、UI 反馈越过 UI 边界、页面全貌证据缺口 | `ui/review/*`、`ui-confirmation.md`、Stage Readiness |
| `/sp.analyze` | Evidence Signature 缺失、human confirmation 证据缺失、subject confusion、trace/open-items 断链 | `analysis.md`、`memory/open-items.md` |
| `/sp.gate` | PASS/FAIL/BLOCKED/NEEDS_DECISION 原因、open blocker、required checks、可否进入下一阶段 | `gate.md`、Stage Readiness |
| `/sp.plan` | UI 未确认、readiness 不足、架构边界或依赖域未闭合 | `plan.md`、Stage Readiness |
| `/sp.tasks` | task packet 字段缺失、Allowed Write Set 不完整、required checks 不足 | `tasks.md`、`memory/open-items.md` |
| `/sp.implement` | 未授权 write set、上游确认 stale、实现中发现上游缺口需停止回退 | task 证据、`memory/open-items.md`、实现报告 |
| `/sp.bundle`、`/sp.checklist`、`/sp.constitution` | 旁路命令不能授予业务 PASS；发现高影响缺口时提示回主链路 | bundle/checklist/governance 输出、`memory/open-items.md` |

### 11.7 降噪规则

提示机制必须避免把用户淹没在重复提醒中：

- 同一 `NOTIFY_ID` 在状态未变化前只完整提示一次；后续只显示短摘要。
- 同一 artifact 已有 `BLOCK` 或高优先级 `WARN` 时，压制普通 `INFO`。
- 多个同源 stale 合并为一个 root stale，加受影响范围列表。
- `READINESS` 只在状态转换时输出，不在每次命令里重复说明稳定状态。
- 低风险 `WARN` 不改变 `NEXT_COMMAND`，但需要在摘要中列明数量和写回位置。
- 同一 warning 跨阶段仍未处理，或开始影响验收、发布、回滚、安全、数据、实现准入或人工决策时，升级为 `BLOCK` 并写入 `memory/open-items.md`。
- 机制性说明只在首次进入依赖域或状态变化时完整展示；用户已经确认过的机制说明不重复展开。

`NOTIFY_ID` 生成规则：

```text
<type>-<feature-or-domain>-<artifact-path-slug>-<condition-hash>
```

其中 `condition-hash` 基于提示类型、artifact、severity、semantic impact、root cause 和 required action 计算。状态未变化的定义是：同一 artifact、同一 root condition、同一 severity、同一 `STATE_HASH`。活跃提示状态可写入当前 feature 的 active context 或 Stage Readiness 摘要，不建议新建第二套长期 ledger；长期 blocker 仍进入 `memory/open-items.md`。

### 11.8 收尾输出接入

现有 `/sp.*` 命令收尾契约应作为统一提示机制的最终出口。所有命令仍按既有格式输出：

```text
OPTION_A: [CMD: </sp.* 或 None>] <动作和影响>
OPTION_B: [CMD: </sp.* 或 None>] <动作和影响>
OPTION_C: [CMD: </sp.* 或 None>] <没有第三个有效选项时写 [CMD: None] None>
RECOMMENDED_OPTION: A | B | C
MY_RECOMMENDATION: 我的推荐：选 <A|B|C>：<推荐对象和理由>
NEXT_ACTION: <唯一下一步动作>
NEXT_COMMAND_EXEC: </sp.* 或 None>
NEXT_COMMAND_ID: </sp.* 或 None>
NEXT_COMMAND: </sp.* 加中文提示词的一整行，必须能一次复制粘贴执行>
WHY_THIS_NEXT: <为什么这是正确方向>
DO_NOT_RUN: <当前不要运行的命令或 None>
```

新增提示机制只要求在这个收尾块前增加“活跃提示摘要”。如果存在 `BLOCK`，`NEXT_COMMAND` 必须指向解除阻断的 owner route，`DO_NOT_RUN` 必须列出当前容易误跑的下游命令。

## 12. 主题混淆防护

新增确认页面会带来一个重要风险：确认页面本身看起来像“流程 UI”或“SP UI”，容易触发本仓库已重点防范的主题混淆。

建议明确分层：

- `flows/index.md` 和 `ui/index.md` 仍然只描述目标业务应用。
- `flows/review/flow-review.html` 和 `ui/review/ui-review.html` 是 SP 工具产物。
- 确认页面可以展示目标业务应用的流程或 UI，但页面外壳、右侧确认栏、导出按钮、确认状态等不应写入目标业务应用的流程/UI 规格。
- 在 HTML 顶部注释中写明：`SP TOOLING ARTIFACT - NOT TARGET PRODUCT UI`。
- 在确认文档 frontmatter 中写明 `document_type: sp_human_confirmation`。

这样可以保留现有 `/sp.flow`、`/sp.ui` 的主体边界，同时满足用户需要的可点击确认体验。

## 13. 最小落地路径

建议分三步实施。

### 第一步：文本确认文档与门禁

先不生成复杂 UI，只扩展命令模板：

- 明确 `flow-confirmation.md` / `ui-confirmation.md` 格式。
- 明确默认 `confirm_strategy: batch`、batch review manifest、`WAITING_FOR_BATCH_REVIEW` 状态和降级策略。
- 要求确认结果写入 Stage Readiness。
- 要求确认文档记录 `confirmed_by`、`owner_approval`、`confirmation_granularity`、`tool_version`、`source_artifacts_snapshot` 和偏差项。
- 引入统一提示字段契约和活跃提示摘要。
- 后续阶段校验确认状态。
- 确认未完成时，不允许进入 `READY_FOR_UI` 或 `READY_FOR_PLAN`。

优点：风险低，快速建立授权链路。

### 第二步：统一模板骨架

新增统一确认页模板骨架：

- 固化顶部机制说明、页面标题、Tiffany blue token 和右侧确认栏。
- 固化确认状态机和 Markdown 导出逻辑。
- 固化 `BLOCK`、`AUTH`、`STALE`、`WARN` 的右侧栏提示样式。
- 固化 flow/ui 两类主内容插槽。
- 默认生成单文件 HTML 并内联 review data；只有在 server/local-writer 模式下才要求页面读取外部 `*-review-data.json`。
- 模板作为预编译资产复用，命令只注入运行时数据，避免每次运行安装依赖或构建前端工程。

优点：统一风格，降低模型生成错误，避免每个命令输出各自发明 UI。

### 第三步：React + Vite 确认页实现

采用 React + Vite 实现模板工程：

- 默认用 Mermaid 渲染 flow。
- 用轻量 React 组件渲染 UI preview。
- 对表单/配置类页面可接入 JSON Forms。
- 对复杂节点交互可后续接入 React Flow。
- 构建后输出可复用静态模板资产；命令运行时把 review data 注入为单文件 HTML，或在本地 server 模式下引用外部数据。

优点：交互能力足够，生态完整，后续可升级到 Storybook/React Flow/JSON Forms。

### 第四步：增强渲染与真实框架对齐

按场景升级：

- 流程复杂时引入 React Flow 或 BPMN。
- UI 已有组件库时引入 Storybook 或项目 dev server 截图。
- 表单/配置页使用 JSON Forms 渲染。
- 增加 source hash、stale 检测、自动写回和截图验证。
- 增加 `NOTIFY_ID` 去重、root stale 折叠和活跃提示持久化。

优点：逐步提高真实性和自动化程度，但不会阻塞首阶段。

## 14. 验收标准建议

`/sp.flow` 验收标准：

- 生成 `flows/review/flow-review.html` 和 `flows/review/flow-review-data.json`。
- 默认生成或刷新 flow batch review manifest；多模块/多 workset 场景默认集中确认，而不是逐模块打断用户。
- 单张可审核流程图通常不超过 12 个业务节点；10-12 个节点时优先拆成 overview 加子流程；超过 12 个业务节点时必须先拆成子流程，再请求用户确认。
- 流程图采用自上而下的主干优先布局：主成功路径纵向居中，异常、驳回、补偿、回滚、阻塞和恢复路径侧向展开，避免交叉线和无业务意义的对称节点。
- overview 图只展示主阶段、子流程交接、跨角色交接和未解决 blocker；每个子流程保持单一职责、清楚输入输出边界和可见 review 标签。
- `Stage Readiness` 记录 `Confirm Strategy`、`Batch ID`、`Batch Scope`、`Batch Review Status`；确认前状态为 `WAITING_FOR_BATCH_REVIEW`。
- 使用统一确认页模板，而不是命令临时生成不同风格页面。
- 顶部展示 SpecCompass 机制确认说明、页面标题、feature、command、stage 和 SP 工具产物声明。
- 页面左侧能看到所有必须确认的流程标签。
- 页面右侧能对每个流程项选择状态并填写意见。
- 页面右侧反馈确认栏是合格条件；缺失右侧栏时，review artifact 不得作为授权证据。
- 阻塞、待决策和 stale 状态必须同时出现在图和右侧确认栏；`Pending Decisions` 非空、决策无默认路径或分支出口未定义时，不允许 `READY_FOR_UI`。
- 右侧确认栏使用统一 Tiffany blue 主题 token 和统一布局。
- `modified`、`rejected`、`deferred` 无意见时不能完成全局确认。
- 能生成或导出 `flow-confirmation.md`。
- `flow-confirmation.md` 包含确认人、owner approval、确认粒度、source snapshot/hash、偏差项和授权范围。
- 静态模式下 review data 内联到 HTML；若使用外部 JSON，必须说明需要本地 server。
- 确认文档作为授权证据进入 git 跟踪；review HTML/辅助 JSON 的跟踪或忽略策略明确。
- `Stage Readiness` 引用确认文档，并根据确认状态决定是否允许 `READY_FOR_UI`。
- 只有 flow batch 确认完成且未 stale 时，才允许 `READY_FOR_UI`。
- `Stage Readiness` 写入 `Source Hash Verified` 和 `Depends On` 校验结果。
- 输出 `AUTH` 或 `READINESS` 提示，说明确认状态、写回目标和下一步命令。
- 当源文档发生语义性变化导致 flow 确认过期时，输出 root `STALE`，并阻断 `READY_FOR_UI`；非语义格式变化不应自动废弃授权。

`/sp.ui` 验收标准：

- 生成 `ui/review/ui-review.html` 和 `ui/review/ui-review-data.json`。
- 默认生成或刷新 UI batch review manifest；多模块/多页面场景默认集中确认，而不是逐页面打断用户。
- `Stage Readiness` 记录 `Confirm Strategy`、`Batch ID`、`Batch Scope`、`Batch Review Status`；确认前状态为 `WAITING_FOR_BATCH_REVIEW`。
- 使用统一确认页模板，而不是命令临时生成不同风格页面。
- 顶部展示 SpecCompass 机制确认说明、页面标题、feature、command、stage 和 SP 工具产物声明。
- 页面能展示当前模块的页面地图和关键页面预览。
- 若证据足够，展示项目级页面全貌；证据不足时明确标注缺口。
- 所有屏幕、区域、字段、操作和关键状态有可见确认标签。
- 框架推断和视觉偏差有清晰标识。
- 框架偏差按 `deviation-minor`、`deviation-moderate`、`deviation-critical` 分级，并写入确认文档。
- 右侧确认栏使用统一 Tiffany blue 主题 token 和统一布局。
- 能生成或导出 `ui-confirmation.md`。
- `ui-confirmation.md` 包含确认人、owner approval、确认粒度、source snapshot/hash、偏差项、例外理由和授权范围。
- `Stage Readiness` 引用确认文档，并根据确认状态决定是否允许 `READY_FOR_PLAN`。
- 只有 UI batch 确认完成且未 stale 时，才允许 `READY_FOR_PLAN`。
- `/sp.ui` 启动前检查 flow baseline 确认；未确认时输出 `BLOCK` 并给出 owner route。
- `visual-only`、`global-style`、`copy-only` 例外必须记录 affected scope、review owner 和复核点，不能静默绕过 flow baseline。
- UI 反馈涉及业务流程、状态、权限或副作用变化时，提示回到 `/sp.flow`、`/sp.specify` 或 `/sp.clarify`。

统一提示机制验收标准：

- 每条阻断或授权提示至少包含 `NOTIFY_TYPE`、`MESSAGE`、`IMPACT`、`REQUIRED_ACTION`、`NEXT_COMMAND`、`DO_NOT_RUN` 和 `WRITE_BACK`。
- `NOTIFY_ID` 按 type、scope、artifact 和 condition hash 生成，状态未变化时只显示摘要。
- `memory/open-items.md` 仍是 blocker、risk、decision 和 close condition 的稳定事实源，不生成第二套长期台账。
- `NEXT_COMMAND` 只有一个，并且不能越过当前 `BLOCK` 指向更下游阶段。
- 重复提示按 `NOTIFY_ID` 降噪；root stale 未解除前，下游 stale 折叠。
- `INFO` 机制说明只在首次进入依赖域或状态变化时完整显示。
- 下游命令看到 `WAITING_FOR_BATCH_REVIEW` 时必须输出 `BLOCK` 或 owner route，不得推荐越过批量确认的 `/sp.ui`、`/sp.plan` 或 `/sp.implement`。

## 15. 推荐方案

推荐采用“batch-first human review + 统一 React + Vite 确认页模板 + Markdown 授权记录 + Stage Readiness 门禁”的方案。

理由：

- 与现有 SP 文档驱动机制一致，同时允许引入可控的前端模板工程提升展示质量。
- 默认批量确认更贴近人工协作现实：业务 owner、设计师和技术 owner 可以集中完成 flow 会议，再集中完成 UI 会议，减少分散确认造成的记忆断裂和重复沟通。
- 能直接满足用户提出的统一模板、页面标题、机制说明、点击确认、意见输入、右侧确认栏、Tiffany blue 主色和授权性文本记录。
- 能把“先批量确认 flow，再批量确认 UI”、stale 传播、人工授权、阻断原因和下一步命令转化为稳定、低噪、可写回的提示。
- React + Vite 与 Mermaid、React Flow、JSON Forms、Storybook、shadcn/ui 的集成路径最顺，模型生成稳定性也最高。
- “重骨架、轻生成”可以避免模型每次写完整页面，只要求它生成结构化 review data。
- 可以最大限度避免主题混淆：确认页面是 SP 工具产物，目标业务规格仍保持纯净。
- 后续可以自然升级到 React Flow、Storybook、JSON Forms 或真实项目 dev server，而不推翻第一阶段结构。

但需要明确：React + Vite 是确认页工具层默认方案，不是目标产品 UI 框架默认方案。PRD 确定前端框架时，应先看 `/sp.ui` 中目标业务界面的真实需求和 PRD 约束；如果 React + Vite 不能满足目标产品要求，应及时转向 PRD 所需框架，并把确认页中的框架近似或偏差写入确认文档。

不推荐首阶段直接把 Storybook 或 React Flow 作为硬依赖。原因是当前命令仍处于 specification 阶段，过早绑定复杂运行时会增加失败面，也会让“确认规格”与“实现原型”边界变模糊。React Flow、Storybook、JSON Forms 应作为按需增强，而不是所有确认页的最低要求。

降级方案：

- 无 Node/依赖环境时，生成 Alpine + Mermaid 的单文件 HTML。
- 项目已有 Vue/Svelte 技术栈时，可以在实现阶段增加适配器，但确认页模板默认仍保持独立。
- 若未来希望确认栏跨多个宿主复用，可把右侧确认栏抽成 Lit/Web Component。

## 16. 后续实施建议

下一步可以把本设计拆成模板改造任务：

1. 修改 `/sp.flow` 模板：新增 batch review manifest、确认产物、确认文档 schema、`Confirm Strategy`、`Batch ID`、`Batch Scope`、`Batch Review Status`、未确认阻断规则，以及 `AUTH`、`STALE`、`READINESS` 提示。
2. 修改 `/sp.ui` 模板：新增 UI batch review manifest、页面全貌策略、框架推断偏差标注、确认文档 schema，以及 flow batch preflight `BLOCK`。
3. 修改 `/sp.plan`、`/sp.tasks`、`/sp.implement` 的 Stage Entry Preflight：读取确认文档和 Stage Readiness，发现 `WAITING_FOR_BATCH_REVIEW`、stale 或未授权时按统一提示输出 owner route。
4. 修改 `/sp.analyze`、`/sp.gate`：把 batch confirmation、human confirmation、Evidence Signature、open-items、subject confusion 和 stale findings 归一到 `BLOCK`、`WARN`、`STALE`、`READINESS`。
5. 新增 `templates/review/`：存放 React + Vite 统一确认页模板骨架、Tiffany blue token、右侧确认栏组件、提示卡组件和 example data，并支持单文件静态注入。
6. 增加测试：验证模板包含确认产物路径、授权声明、右侧确认栏要求、Stage Readiness 确认字段、source hash、owner approval、统一模板引用、提示字段契约、NEXT_COMMAND/DO_NOT_RUN 和主题混淆防护。
7. 增加降级路径：当依赖不可用时输出单文件静态 HTML，并保持相同数据 schema、确认文档 schema 和提示字段 schema。
8. 增加 `.gitignore` 或文档规则：明确确认文档默认跟踪，review HTML 和辅助 JSON 按可再生成程度选择跟踪或忽略。

本次建议先落地统一模板工程和文档约束，再决定 React Flow、Storybook、JSON Forms 等增强能力的触发条件。

## 17. 2026-07-16 当前合同：确认优先级与 PRD Outline 图形确认

本轮采用共享 renderer 的平衡演进方案。Flow、UI 与 Outline 共用加载、右侧确认栏、草稿状态和确认包基础设施，但各自保留独立 schema、数据路径、可视化语义和写回目标。Outline 是 `/sp.prd` 内部阶段，不新增强制 `/sp.outline` 命令，也不替代 `/sp.specify`。

### 17.1 三种确认优先级

新生成的 schema v2 actionable node 使用 `confirmation_priority`：

- `critical` / 非常重要：错误决定会造成严重、难以撤回的影响，而且没有安全默认值或可逆路径。
- `important` / 重要：会明显影响范围、体验、成本或验收，但存在受控修正路径。
- `normal` / 普通：仍需人工确认，但风险和返工半径较小。

优先级与 `review_level` 正交：前者决定人工注意力，后者继续表达原有审核义务。信息节点不填写优先级。`critical` 节点必须同时提供 `critical_basis` 和 `priority_reason`，且数量上限为：

```text
N == 0 ? 0 : min(3, max(1, ceil(N / 10)))
```

上限不是配额；没有真正符合条件的事项时应保持为零。生成器先按严重影响、不可逆性和安全默认路径缺失程度排序，把超额候选降为 `important`。校验器只拒绝，不修改输入。`critical` 必须逐项确认，不参与当前视图、模块、需求或下载前预填中的任何批量推荐操作。

### 17.2 Outline 三个图形视图

`/sp.prd` 在语义内容本可进入详细规格时，生成：

```text
specs/<feature>/spec-outline.md
specs/<feature>/prd/review/outline-review-data.json
specs/<feature>/prd/review/outline-confirmation.md
```

Outline review data 的 `review_type` 为 `outline`、`schema_version` 为 `2`，全文件必须且只能各有一个：

1. `intent_map`：产品意图 -> 用户/角色 -> 问题切片 -> 能力边界。
2. `scope_slice`：本期范围、明确非目标、场景与验收种子、推荐首切片。
3. `readiness_authority`：来源权威、风险、开放项、阻断项和下一路由。

Outline 只确认产品意图、范围和进入规格前的就绪度。数据中禁止出现详细流程步骤、UI 页面或组件、API、数据库模型、实现任务和方案级设计，避免在纲要阶段提前固化下游解法。

交互入口为：

```bash
node .specify/review/scripts/serve-review.mjs --outline <feature>
```

launcher 只接受一个 review mode，并返回带 `?outline=<feature>` 的 `127.0.0.1` 地址。`specs/review-index.json` 使用 `has_outline_review` 表示当前需求是否已有 Outline 确认数据。

### 17.3 状态、摘要和授权边界

语义上已就绪但尚未完成图形确认的 Outline 使用 `AWAITING_OUTLINE_CONFIRMATION`。摘要由脚本对规范化的 `spec-outline.md` 内容和排序后的来源权威 ID 计算 SHA-256，不能由模型自行描述。确认包及最终 Markdown 确认文档必须绑定：

- 当前 `outline_digest`；
- 完整 `source_authority_ids`；
- 当前 review-data identity；
- 全部必要确认记录和所有分包身份字段。

review-data identity 必须在完整 JSON 写入后由 `.specify/review/scripts/review-data-id.mjs` 计算。浏览器使用相同的递归键排序序列化和标识算法；下游门禁从当前文件重算，因此 option 文案、视图内容、优先级或其他 review 字段发生变化都会使旧确认失效，不能只保留原 ID 绕过重新确认。

浏览器 `localStorage`、JSON review data 和下载到本地的确认包都不构成授权。只有写入目标路径、内容完整且身份匹配的 `outline-confirmation.md` 才能让 `/sp.prd` 把状态提升为 `READY_FOR_SPECIFY`。Outline 或来源权威发生实质变化后，旧确认立即 stale。`/sp.specify` 对新合同 Outline 必须拒绝 pending、missing、invalid、incomplete、stale 或 identity mismatch；旧的无合同标记 Outline 仅在一个小版本兼容窗口内告警放行，并在下一次 `/sp.prd` 刷新时进入新合同。

### 17.4 PRD Outline 三级成熟度与双模式界面

Outline 的完整程度使用独立字段 `outline_maturity = explore | frame | specify_ready`。`explore` 是一级方向探索，`frame` 是二级框架收敛，`specify_ready` 是三级完整大纲；它们不是 Markdown 标题深度，也不是 Flow/UI/Outline 单个确认点的 `review_level` 或 `confirmation_priority`。一级和二级允许成熟度随新证据前进或回退，只有三级可以进入正式 confirmation。

共享 renderer 增加两种严格隔离的 `interaction_mode`：

- `discovery` 读取 `outline-discovery-data.json`，先展示 XMind 风格导图，再展示当前节点的 2-4 个业务候选、推荐理由、“以上都不适用”和自由输入，下载 `outline-discovery-response-*.json`。它只用于完善意图，不能授权 `/sp.specify`。
- `confirmation` 读取现有 `outline-review-data.json`，继续使用 Review Data ID、Outline Digest、Source Authority IDs 和三视图正式确认合同。

Discovery 的地图结构固定分为一张全局总图、一张或多张业务分图、一张全局约束/治理图。总图通过分图入口建立项目全貌；业务分图承载具体业务分支；影响多个业务分支的政策、合规、审计、权限和安全规则放入全局约束图，并通过受影响节点 ID 反向标出覆盖范围。每张图和每个节点使用稳定 ID，每个问题必须绑定一个节点；用户点击节点后，右侧只显示该节点的问题，分支选项不得脱离上下文进入全局问题池。

信息密度使用固定预算约束：单图最多 18 个可见节点、最多 3 层、单节点最多 4 个直接子节点；单图达到 8 个节点后，任一层最多占全部节点的 60%。renderer 根据实际层数分配画布列宽，生成端在超限前重排或拆分业务分图，从数据和显示两端共同避免一层过密、其他层空置。一级和二级保留用户深度参与的判断；三级由模型按 Constitution 检查结构与治理覆盖，但不得生成未经确认的业务事实。

Discovery 的响应由 `/sp.prd` 校验后进入 append-only 的 `outline-intent-ledger.json`。操作固定为 `confirm_candidate`、`add`、`replace`、`exclude`、`context_note`；用户新输入写回为 `[src:user]`，接受候选写回为 `[src:user-confirmed]`，未接受候选保持 `[src:ai-proposed]`，并以 `<!-- intent-delta:<id> -->` 追踪。可替换条目使用 `<!-- intent-target:<id> -->`，替换或排除结果使用 `<!-- intent-ref:<delta-id>:<target-or-candidate-id> -->`，避免 helper 猜测自然语言指向。

`/sp.prd` 先生成 `prd.md.tmp` 和 `spec-outline.md.tmp`，再调用 `node .specify/review/scripts/apply-outline-discovery.mjs --response <response-package> --prd-temp specs/<feature>/prd.md.tmp --outline-temp specs/<feature>/spec-outline.md.tmp`。helper 对有效事件先做 append-only 入账，再验证临时文档；验证失败不覆盖正式 PRD/Outline，事件保留为 pending，修正临时文档后允许用同一响应重试且不重复入账。只有对应 `intent-delta` 在当前正式 PRD 中恰好出现一次，事件才成为 consumed，之后的同 ID 重放必须拒绝；`supersedes_delta_id` 只能引用这种已消费事件，不能引用只入账但仍为 pending 的事件。helper 以 `specs/<feature>/prd/review/.outline-discovery-writeback.lock` 保证同一 feature 只有一个写回进程：active process 持锁时拒绝并发写回；回收进程退出后遗留的 stale lock 前，必须先独占 `.outline-discovery-writeback.recovery.lock` 并复核主锁身份。两个锁都带唯一所有权 ID，清理时不得删除已经换主的锁；如果死进程同时遗留两个锁，helper 失败关闭并保留现场，操作者确认没有写回进程后只删除恢复声明再重试。旧主锁已不存在时，helper 可在取得新主锁后清理孤立恢复声明。两份正式文档作为一组替换，任一替换失败都恢复旧版本；替换完成后的备份清理失败只告警，不得反向破坏已经提交的新文档。Discovery 与 confirmation 使用不同 schema 和数据包，任何一方都不能接受另一方的产物。
