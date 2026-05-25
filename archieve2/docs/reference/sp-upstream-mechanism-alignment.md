# 向 Upstream 机制对齐：`sp` 仓库整体重构工作方案

> 状态更新：本文最初是一份迁移计划。当前仓库已经完成第一轮目录、安装入口与 project-local integrations 收敛；文中尚未改写的“将要/后续”表述，应优先理解为审计清单或历史迁移语境，而不是当前待实现机制。

> 目标：让当前仓库在机制层尽可能与 upstream `github/spec-kit` 保持一致，只在 `sp` 的业务内容和流程增强上保留差异。

---

## 1. 调整目标

这次调整不再继续修补当前自定义分发体系，而是把重心切换为：

1. 以 upstream 当前 `main` 作为唯一机制基线
2. 尽可能对齐 upstream 的目录结构、模板外壳、脚本钩子、安装框架
3. 将 `sp` 的差异尽量限制在命令正文和流程语义层
4. 在新机制跑通前，保留必要兼容层，避免一次性硬切

可简单概括为：

- 瓶子尽量换回 upstream 那只
- 里面装 `sp` 的内容
- 先完成迁移，再逐步移除旧结构

---

## 2. 总原则

### 2.1 机制优先

优先对齐以下部分：

- 源目录组织
- 模板源位置
- 命令外壳格式
- `scripts` / `handoffs` / 前置校验机制
- 初始化或安装的分发路径

### 2.2 内容差异后置

允许保留 `sp` 的业务增强，例如：

- `sp.flow`
- `sp.ui`
- `sp.gate`
- `sp.bundle`

但这些增强必须建立在 upstream 风格机制之上，而不是继续发明独立的宿主控制方式。

### 2.3 不再长期依赖当前自定义分发结构

迁移前的旧分发目录是：

- `installer-assets/claude-commands/`
- `installer-assets/codex-prompts/`

已在迁移后归档到 `Archieved/installer-assets/`，不再视为长期唯一真源。

### 2.4 区分唯一真源与宿主分发产物

需要明确区分两层：

- canonical source：与 upstream 风格对齐的模板源、脚本源、命令壳定义
- host-specific generated artifacts：面向 Claude、Codex 等宿主的最终落地产物

这意味着：

- 可以保留迁移前目录到 `Archieved/installer-assets/` 作为历史分发产物
- 但它们不应继续承担长期编辑入口和机制定义职责
- 后续所有机制判断，应优先回到新的 upstream 风格真源，而不是直接把宿主产物当机制本体

### 2.5 Guardrail 层级

为避免再次退化成“只靠 prompt 自觉”，需要明确 guardrail 的优先级：

1. 机制层：目录结构、命令壳、`scripts`、`handoffs`、前置检查
2. 轻量检查层：安装器校验、路径检测、阶段产物存在性判断
3. 提示词层：正文中的约束、停止条件、范围限制

要求：

- prompt defense 可以增强稳定性，但不能替代机制层 guardrail
- 只迁 frontmatter、不迁脚本与前置控制，不算真正完成 upstream 机制对齐
- 若宿主环境无法承载某些 upstream 脚本，应先定义等价的轻量机制替代，再退回提示词层兜底

### 2.6 先跑通，再退役

不采用一次性大爆炸重构。顺序必须是：

1. 建立新真源
2. 让新链路可安装、可验证
3. 保留兼容层过渡
4. 最后移除旧结构

---

## 3. 计划范围

本次重构覆盖四个层面：

1. 文件夹结构
2. 模板文件结构
3. 脚本钩子与前置控制
4. 安装与初始化框架

本次重构不直接做的事：

- 不在本阶段扩展生产代码生成能力
- 不在未验证前删除全部旧入口
- 不凭猜测复制所谓 upstream 机制

---

## 4. 目标结果

重构完成后，仓库应达到以下状态：

- 机制层与 upstream 保持高度一致
- `sp` 的差异主要体现在正文内容、阶段命名和流程增强
- 新模板源目录成为唯一机制真源
- 宿主目录中的最终文件被明确降级为分发产物或兼容层
- 安装器从新真源分发，而不是继续把旧兼容目录当源头
- Claude、Codex、generic 等宿主适配方式明确
- 空项目、缺前置产物、阶段未完成时能可靠阻断
- 当前频繁出现的不稳定执行问题显著收敛

---

## 5. 分阶段工作方案

## 5.0 当前映射整改状态

基于 upstream `main` 快照与当前仓库的逐项对比，本轮已经从“仅壳层对齐”推进到“全仓文件路径补齐”：

- `docs/` 根目录文件树现已与 upstream 一致
- 原先散落在 `docs/` 根层的 `sp` 设计文档已迁入 `docs/reference/`
- upstream 缺失的根级文件、产品目录、测试目录、模板骨架、脚本链均已补齐到当前仓库
- upstream 与 `sp` 的正式映射表已单列在 [upstream-sp-file-mapping.md](upstream-sp-file-mapping.md)

这一轮整改现在已经解决的是：

- 根层 `docs/` 结构与 upstream 明显不一致
- 旧设计文档和入口文档混在同一层
- upstream `src/`、`tests/`、`presets/`、`extensions/` 等目录缺失
- upstream 根级模板骨架文件缺失
- upstream Bash / PowerShell 辅助脚本链缺失
- 缺少可执行的 upstream-to-sp 文件映射基线

当前还没有解决、也是后续真正要收敛的点变成了：

- 同路径文件内容仍有 `sp` 化偏离
- 本仓仍保留大量本地扩展目录与安装分发资产
- 安装器尚未真正消费更多 upstream 运行时链条

最新一次共享路径复核结果为：

- upstream 共享路径总数仍为 `281`
- 同路径内容差异已收敛到 `15` 个文件
- 已不再存在 `.gitignore`、`docs/.gitignore`、`docs/toc.yml` 这类纯壳层差异
- 剩余差异已集中在 `README`、核心 docs 页面、`docs/docfx.json`、以及 `templates/commands/{constitution,specify,clarify,plan,tasks,analyze}.md`

这意味着当前的主要工作重点，已经从“补路径、补目录、补脚手架”切换为：

- 继续压缩共享路径上的可机械收敛内容差异
- 明确保留哪些 `sp` 契约差异不应再向 upstream 生硬回退
- 让状态文档始终反映当前真实差异面，而不是停留在早期整改阶段

其中最新进展是：

- `templates/commands/{constitution,specify,clarify,plan,tasks,analyze}.md`
  已补回更接近 upstream 的命令壳结构
- 这些命令现已重新具备 upstream 风格的 frontmatter、pre/post hook 段、阶段化 outline
- 但其正文契约仍保留 `sp` 的分层文档语义与写入型输出，不会回退成 upstream 原始业务含义

因此，当前状态应表述为：

- 已完成“文件路径级”的全仓机械补齐
- 尚未完成“共享路径内容级”的全量等同
- 尚未完成“运行机制级”的全量复用

## 5.1 阶段一：锁定 upstream 真实机制基线

### 目标

把“要对齐的 upstream 机制”锁死，避免边做边猜。

### 要做的事

1. 确认 upstream 当前 `main` 的真实模板源目录、脚本目录和初始化入口
2. 提取命令模板的共有外壳字段
3. 提取 Bash / PowerShell 两条脚本链路
4. 明确哪些机制必须照抄，哪些只是内容层示例

### 产出

- 一份 upstream 机制基线清单
- 一份本仓库与 upstream 的差异表
- 一份命令映射前置草案

### 状态

`已完成`

### 验收

- 关键结论都能回链到 upstream 当前文件
- 不再依赖推测出来的 upstream 目录结构

## 5.2 阶段二：定义目标目录结构

### 目标

先定义未来仓库长什么样，再做文件迁移。

### 要做的事

1. 设计与 upstream 一致或高度接近的源码目录树
2. 明确模板源、脚本源、安装入口、文档目录各自归属
3. 定义哪些旧目录是兼容层，哪些目录会成为正式真源

### 产出

- 目标目录树说明
- 当前目录到目标目录的迁移表

### 状态

`已完成（目录树已补齐，仍需继续收敛真源边界）`

### 验收

- 每个现有目录都有明确去向
- 不再允许双主源长期并存

### 额外注意事项

- `docs/` 根层优先承载 upstream 风格入口文档
- 大量 `sp` 设计稿、机制稿、对比稿不再继续堆在 `docs/` 根层
- 这类细节文档统一下沉到 `docs/reference/`
- 仓库根目录不再保留 active `specs/` 样例；历史样例统一归档到 `Archieved/project-root/specs/`
- 安装后目标项目需要的 `specs/` 入口继续由 `templates/project/specs/` 提供
- 若未来继续补充方法论文档，也应优先判断它属于入口页还是 reference 资料，避免再次把根层写散

## 5.3 阶段三：建立 `sp.*` 与 upstream 命令壳的映射关系

### 目标

解决 upstream 命令体系与 `sp` 命令体系不完全相同的问题。

### 要做的事

1. 为每个 `sp.*` 指定其继承的 upstream 机制壳
2. 区分“可直接继承”的命令与“新增扩展命令”
3. 明确每个命令的输入、输出、是否写文件、是否只读
4. 标记与 upstream 的有意偏离点

### 产出

- `sp.* -> upstream` 壳继承关系表
- 命令契约差异表

### 状态

`已完成首轮映射，并已完成核心命令壳回贴；后续只需继续收敛命令契约差异`

### 验收

- 每个 `sp.*` 都有清晰的机制来源
- 不再出现“先写正文、后补机制”的做法

## 5.4 阶段四：迁移模板源文件

### 目标

建立新的唯一模板真源。

### 要做的事

1. 新建 upstream 风格模板源目录
2. 把可直接照抄的 upstream 模板先迁入
3. 为 `sp.*` 建立新的模板文件
4. 在机制壳保持稳定的前提下替换为 `sp` 正文
5. 为不同宿主保留必要适配，并把宿主差异限制在安装时的稳定渲染层

### 规则

- `templates/commands/` 保持为唯一 canonical 命令真源
- canonical 模板以 Codex 可直接消费的结构化壳为基础
- Claude 的纯文本 `/sp.*` 作为安装产物稳定渲染，不再单独维护第二套正文真源
- 不再让 Codex 从 Claude 正文动态转译
- 若迁移期仍保留旧分发目录，其角色应明确标注为 generated/distribution artifacts，而不是 canonical source

### 状态

`已完成首轮结构迁移`

### 验收

- 新模板源可独立作为安装来源
- 旧模板目录不再承担新增开发

## 5.5 阶段五：迁移脚本钩子与前置控制

### 目标

把真正影响稳定性的机制迁回来，而不仅仅是 frontmatter 外形。

### 要做的事

1. 对齐 upstream 的脚本目录布局
2. 引入 upstream 风格的前置检查脚本
3. 为 `sp` 的文档路径和命令名做必要适配
4. 补齐空项目、缺关键输入、阶段未完成时的阻断逻辑
5. 确保 Bash 与 PowerShell 两条链路对齐

### 重点

这是本次重构的核心阶段。只迁模板、不迁脚本，收益会非常有限。

同时需要遵守 guardrail 层级：

- 第一优先是 upstream 风格机制壳与前置检查
- 第二优先是轻量、可跨宿主解释的检查
- 第三优先才是正文中的防呆提示

若某些 upstream 脚本在受限宿主下不能直接照搬，必须记录“哪一层 guardrail 用什么替代”，而不是直接删掉该控制点。

### 状态

`已完成首轮机制整合，待补命令级阻断验证`

说明：

- `templates/commands/` 已成为共享命令真源
- `scripts/install.sh` 与 `scripts/install.ps1` 已收敛为 upstream 风格 wrapper，统一委托本仓 `specify init`
- 安装器已把 upstream 风格 Bash / PowerShell 辅助链复制到目标项目 `.specify/scripts/{bash,powershell}`
- 安装器已把 upstream 根级模板骨架复制到目标项目 `.specify/templates`
- 仍需补充的是命令级阻断行为验证，尤其是 `sp.analyze` 在空项目和前置缺失场景下的实际停止证据

### 验收

- `sp.analyze` 在空项目或前置缺失时能明确阻断
- 不再依赖模型自行到处扫描再决定是否继续
- Windows 和 POSIX 行为都可解释、可验证

## 5.6 阶段六：重构安装与初始化框架

### 目标

让安装方式也尽量回归 upstream 工作方式。

### 要做的事

1. 研究 upstream 当前 init / install 的最小必要机制
2. 决定是直接复用，还是保留一个轻量包装层
3. 重构 `scripts/install.sh` 与 `scripts/install.ps1`
4. 让安装器从新模板真源分发
5. 将旧 `installer-assets/*` 迁入 `Archieved/installer-assets/`，明确降级为历史归档

### 实施建议

- 第一版先完成“新真源 + 现有安装器适配”
- 第二版再进一步逼近 upstream init 体验
- 不建议一开始就同时彻底推翻模板和安装器

### 状态

`已完成首轮安装器机制对齐`

说明：

- 当前安装器已经从本仓源码树委托 `specify init` 运行
- Claude / Codex 集成都由 `src/specify_cli/integrations/*` 决定，而不是根安装脚本手工渲染
- 目标项目现在会安装 `.specify/scripts/` 与 `.specify/templates/`，不再只落地 memory 和文档
- install manifest 已显式记录共享 starter-pack 产物与各 agent 产物
- 当前剩余缺口主要是 Windows / PowerShell 冒烟证据，而不是安装框架本身仍停留在旧结构

### 验收

- 新安装器只依赖新真源
- Claude / Codex 链路都可完成冒烟安装

## 5.7 阶段七：建立兼容层与退役策略

### 目标

避免迁移期间影响现有使用者和现有文档。

### 要做的事

1. 明确旧目录保留多久
2. 为旧目录加 Deprecated 标记
3. 如有需要，为旧入口保留只读兼容或转发
4. 约定何时彻底移除旧结构

### 验收

- 迁移窗口清晰
- 用户不会突然失去现有入口
- 仓库内部不会继续误把旧目录当真源

## 5.8 阶段八：同步文档与规范

### 目标

避免“代码已迁移，文档还在讲旧机制”。

### 要做的事

同步更新至少以下文件：

- `README.md`
- `README.en.md`
- `AGENTS.md`
- 安装策略文档
- 模板清单文档
- 相关 spec / analysis / memory 文档

### 验收

- 所有文档统一表达新真源位置
- 所有文档统一表达安装分发路径
- 所有文档能明确说明哪些偏离 upstream 是有意设计

## 5.9 阶段九：全量验证与验收

### 目标

把“更稳定”变成证据，而不是感觉。

### 必须验证

- `sh -n scripts/install.sh`
- `sh scripts/install.sh --help`
- Claude 安装冒烟
- Codex 安装冒烟
- PowerShell 安装冒烟
- 空项目执行 `sp.analyze`
- 缺少前置产物时的阻断行为
- 模板落地内容与真源是否一致
- 不再残留旧 `speckit.*` 或错误 skill 依赖

### 当前验证状态

- `sh -n scripts/install.sh`：已通过
- `sh scripts/install.sh --help`：已通过
- Claude 安装冒烟：已通过
  - 已确认 Claude 产物落在 `.claude/skills/sp-*/SKILL.md`
  - 已确认 `user-invocable: true` 与 `disable-model-invocation: true` 会被注入
  - 已确认命令正文中的脚本路径改写到 `.specify/scripts/...`
- Codex 安装冒烟：已通过
  - 已确认 Codex 产物落在 `.agents/skills/sp-*/SKILL.md`
  - 已确认 Codex integration 默认走 skills 模式
  - 已确认命令正文中的脚本路径改写到 `.specify/scripts/...`
- PowerShell 安装冒烟：当前环境未完成
  - 这台机器当前没有 `pwsh` 或 `powershell` 可执行入口，尚无新的 Windows 实测证据
- 空项目执行 `sp.analyze`：未完成完整宿主端到端验证
  - 但其前置脚本链已完成最小阻断验证：在新安装的空项目中运行 `./.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` 会返回 `EXIT=1`
- 缺少前置产物时的阻断行为：已完成脚本级验证
  - 空项目会返回 `missing: ["tasks"]`，并输出 `Missing required stage outputs: tasks`
- 模板落地内容与真源一致性：已完成 Claude / Codex `sp.plan` 抽样验证
- 旧 `speckit.*` 与历史 prompt/command 残留清理：Codex 安装链已继续执行 legacy 清理；未发现需要恢复的全局分发路径

### 核心验收项

- 证明当前高频出错命令在新机制下明显收敛
- 证明宿主差异不再污染模板真源

## 5.10 当前三类遗留问题的专项修复方案

### 背景

在完成目录、安装框架、共享路径补齐之后，当前剩余问题已经从“路径缺失”转为“机制仍未完全收口”：

1. skill 安装链仍把 `scripts:` / `agent_scripts:` 主要折叠进正文，让模型代行宿主控制
2. feature 初始化内容虽然齐全，但 `spec.md`、`plan.md`、`tasks.md`、`memory/*` 仍偏 scaffold，占位感过强
3. project-level memory 在 feature 创建和 plan 初始化后未主动同步，导致 `.specify/memory/*` 容易滞后

这三类问题需要作为并行设计、顺序落地的专项修复，而不是继续只做文档壳层微调。

### 修复目标

- 让 skill 安装结果重新保留 upstream 风格 frontmatter 元数据，而不是只把控制信息埋进正文
- 让新 feature 在刚初始化完成时，就具备可继续工作的 `spec` / `plan` / `tasks` / `memory` 基础，而不是等待后续命令大量返工
- 让 project-level memory 在 create feature / setup plan 这些生命周期步骤中主动刷新，减少 `sp.analyze` 才被动纠错的情况

### 工作流 A：skill 安装链机制修复

#### 目标

把当前 “skill 仅同形，不同核” 的状态修正为：

- `SKILL.md` frontmatter 保留 `scripts`、`agent_scripts`、`handoffs` 等命令级控制元数据
- 正文不再依赖把这些 frontmatter 信息整体吃掉后才可运行
- 对 extension / preset / core command 三条 skill 生成路径统一处理，避免再次分叉

#### 具体动作

1. 调整 `SkillsIntegration.setup()`：
   - 不再使用会剥离 `scripts` 区块的旧处理路径直接生成最终 skill
   - 改为解析原 frontmatter，保留命令元数据，再叠加 skill 必需字段
2. 调整 `CommandRegistrar.build_skill_frontmatter()`：
   - 从“只生成 skill 自有字段”升级为“skill 自有字段 + 保留的命令元数据”
3. 调整 `register_commands()`、preset skill 覆盖、extension skill 生成：
   - 三处统一为同一套 frontmatter 保留策略
4. 调整 core command 模板正文：
   - 把 `Run {SCRIPT}` 这类强绑定正文调用，改成“使用 frontmatter 中声明的 preflight / agent script”这一类宿主优先表达
   - 仍保留对旧 extension/preset 命令中 `{SCRIPT}` / `{AGENT_SCRIPT}` 占位符的兼容替换，作为回退层，而非主机制

#### 验收标准

- 新安装的 Codex / Claude skill frontmatter 中可直接看到 `scripts:` 等元数据
- core `sp.*` 命令正文不再以“先把脚本命令展开进正文”为主机制
- extension / preset 生成的 skill 仍保持可用，不因兼容修复而失效

#### 当前实现状态

- `src/specify_cli/agents.py` 已支持在 `SKILL.md` frontmatter 中保留 `scripts`、`agent_scripts`、`handoffs`
- 保留下来的 skill frontmatter 控制字段现已额外做占位符归一化，`agent_scripts` 中的 `__AGENT__` 不再泄漏到最终安装产物
- `src/specify_cli/integrations/base.py`、`extensions.py`、`presets.py` 三条 skill 生成路径已统一到同一 frontmatter 保留策略
- skill 正文中的 `{SCRIPT}` / `{AGENT_SCRIPT}` 已改为宿主优先描述，不再把真实脚本命令整体折进正文
- 剩余边界：是否由宿主直接消费这些 frontmatter 字段，仍取决于目标宿主能力；本仓当前已做到安装产物保留 upstream 风格控制元数据

### 工作流 B：feature 模板根与初始化质量修复

#### 目标

把当前“结构在、内容空”的 feature 初始化，提升为“刚创建即可进入下游命令”的实用模板。

#### 具体动作

1. 在 `templates/project/.specify/templates/` 补回真正参与初始化解析的模板根：
   - `spec-template.md`
   - `plan-template.md`
2. 将归档样例 `attendance-leave` 中可泛化的结构提炼为通用模板：
   - `tasks.md`
   - `memory/index.md`
   - `memory/stable-context.md`
   - `memory/open-items.md`
   - `memory/trace-index.md`
   - `memory/worksets/index.md`
   - `memory/worksets/ws-*.md`
3. 补齐被 trace / workset 引用但当前模板树缺失的文件：
   - `delivery/tables/*`
   - workset 子树
4. 保证 create feature / setup plan 后，新 feature 至少具备：
   - 可读的 `spec.md`
   - 可读的 `plan.md`
   - 可追踪的 `tasks.md`
   - 可路由的 `memory/*`

#### 验收标准

- 新 feature 初始化后不再出现 `spec.md` / `plan.md` 缺失或空文件回退
- `memory/index.md` 引用的 worksets / tables 在模板树中真实存在
- `sp.analyze` 的 FAIL 只应主要指向真实文档质量问题，而不是模板自身缺项或大面积占位文本

#### 当前实现状态

- `templates/project/.specify/templates/spec-template.md` 与 `plan-template.md` 已恢复为 project 模板根的真实初始化入口
- feature 模板树已补齐 `tasks.md`、`memory/*`、`delivery/tables/*`、`ui/*`、`flows/*`
- 初始化文案已从负向 scaffold 状态调整为中性基线，避免 `FAIL UNTIL REVIEWED`、`TBD`、`placeholder` 这类字样在新 feature 刚创建时就污染分析结论
- 剩余边界：模板仍是可继续细化的通用骨架，不会替代后续 `sp.specify`、`sp.plan`、`sp.tasks` 的内容深化

### 工作流 C：project-level memory 主动同步修复

#### 目标

把 project memory 从“初始化后静态存在”修复为“关键生命周期节点自动刷新”。

#### 具体动作

1. 在 Bash `common.sh` 增加 project memory 同步函数：
   - 刷新 `.specify/memory/project-index.md`
   - 刷新 `.specify/memory/active-context.md`
   - 刷新 `.specify/memory/feature-map.md`
2. 在 PowerShell `common.ps1` 提供同等能力
3. 在以下生命周期脚本中接入同步：
   - `create-new-feature.sh` / `.ps1`
   - `setup-plan.sh` / `.ps1`
4. 同步逻辑优先依据：
   - `feature.json`
   - 当前 feature 目录实际存在情况
   - `spec.md` / `gate.md` / `bundle.md` / `plan.md` / `tasks.md` / `analysis.md` 的阶段证据
   - feature-level memory 是否存在与是否已进入 workset 拆分

#### 验收标准

- 新建 feature 后，project-level memory 不再继续写 “not selected”
- 运行 setup-plan 后，`feature-map.md` 能体现 stage 已进入 plan/todo 相关阶段
- `sp.analyze` 仍保留 stale routing 检测能力，但不再承担大量常规同步工作

#### 当前实现状态

- Bash 与 PowerShell 公共脚本层都已加入 `sync_project_memory` 能力
- `create-new-feature` 与 `setup-plan` 在完成模板实例化后都会主动刷新 `.specify/memory/project-index.md`、`active-context.md`、`feature-map.md`
- 当前已把“project memory 初始化后长期静态不变”的问题收敛到生命周期内自动同步
- 剩余边界：Windows 链路目前仅完成代码级对齐，尚未在本机做 PowerShell 实测

### 当前回归证据

- Codex skill 集成测试已通过：
  - `tests/integrations/test_integration_codex.py -k 'preserves_command_frontmatter_controls or templates_are_processed'`
- Claude skill 集成测试已通过：
  - `tests/integrations/test_integration_claude.py -k 'setup_creates_skill_files or claude_hooks_render_skill_invocation'`
- CLI / 模板根回归已通过：
  - `tests/integrations/test_cli.py -k 'integration_copilot_creates_files or shared_infra_skips_existing_files or feature_tree_bootstraps_from_project_template_root'`
- 安装后 POSIX 冒烟已通过：
  - `specify init --ai codex` 生成的 `sp-analyze` skill 已保留 `scripts:` frontmatter 且正文不再泄漏 `{SCRIPT}`
  - 在目标项目根目录执行 `create-new-feature.sh` 与 `setup-plan.sh` 后，`.specify/memory/project-index.md`、`feature-map.md`、`specs/<feature>/memory/index.md` 已自动同步到最新状态

说明：

- 生命周期脚本仍要求在目标项目根目录执行；这与 upstream 风格工作方式一致
- Windows / PowerShell 目前仍缺本机冒烟证据，因此整体迁移还不能宣称“全平台完全收口”

### 执行顺序

本轮修复按以下顺序推进：

1. 先修机制核心：skill frontmatter 与命令壳
2. 再修模板初始化质量：spec/plan/memory/worksets/tables
3. 再修生命周期同步：project memory 自动刷新
4. 最后做安装、集成、脚本与命令级回归

### 本轮额外注意事项

- 不回退 `sp.analyze` 的写入型语义；这是内容差异，不属于机制错误
- 不把“prompt 中补一句防呆”误当成机制修复完成
- 对 skill 链的修复必须同时覆盖 core、extension、preset 三种写入路径
- 对 feature 模板的修复必须保证 shell 与 PowerShell 初始化路径等价
- 验证必须至少覆盖：安装结果、生成后的 `SKILL.md` frontmatter、feature 初始化后的文件树、project memory 同步结果

---

## 6. 工作包拆分

为降低风险，建议拆成四个工作包推进。

### `WP1` 基线研究与目录设计

内容：

- upstream 机制基线清单
- 目标目录树
- 当前目录到目标目录映射表
- `sp.*` 到 upstream 壳的初版继承关系

### `WP2` 模板与脚本迁移

内容：

- 新模板真源目录建立
- upstream 机制壳迁入
- `sp.*` 正文适配
- Bash / PowerShell 钩子对齐
- upstream 缺失目录与根级文件机械导入

### `WP3` 安装器与兼容层改造

内容：

- 安装器改为从新真源分发
- 旧目录降级为兼容层
- 明确退役策略

### `WP4` 文档同步与全量验证

内容：

- 统一文档口径
- 本地与跨宿主冒烟
- 阻断与空项目测试
- 最终收尾

---

## 7. 风险与控制策略

### 主要风险

1. 再次误判 upstream 当前真实机制
2. 新旧结构并存时出现双主源
3. `sp` 新增命令找不到合适的 upstream 壳
4. PowerShell 链路补不齐
5. 安装器切换过早导致现有流程中断

### 控制方式

1. 所有迁移先做映射表，再改文件
2. 所有新目录先定义唯一真源，再允许安装器依赖
3. 所有旧目录先标记兼容，再决定删除
4. 所有 Windows 结论都必须有实际验证
5. 不以“理论上等价”代替验证证据

---

## 8. 基于当前对比的迁移注意事项

### 8.0 当前阶段的新增判断

在完成本轮全仓机械补齐之后，后续判断标准必须更新：

- 不要再把“缺少 upstream 目录或文件”当成主要问题
- 当前主要问题已经转移为“共享路径内容是否还过度偏离 upstream”
- 当前主要风险已经转移为“导入了 upstream 结构，但本地安装和执行仍只使用部分链路”

这意味着：

- 后续整改不能再只列缺目录清单
- 必须开始逐项审视那批仍与 upstream 内容不同的共享路径文件
- 必须明确哪些 local-only 目录是长期保留，哪些只是历史或分发边界

以下注意事项来自本仓库当前 `sp` 机制与 upstream `github/spec-kit` 的逐项对比，属于执行本次迁移时必须持续检查的约束。

### 8.1 不要把分发产物继续当真源

迁移前，仓库的实际工作重心曾落在：

- `installer-assets/claude-commands/`
- `installer-assets/codex-prompts/`

迁移后，这两类目录已经归档到 `Archieved/installer-assets/`。从迁移原则看，它们最多只能作为：

- generated artifacts
- distribution artifacts
- compatibility layer

注意：

- 不要继续在这些目录上直接演进机制
- 不要让安装器长期从“宿主产物目录”反向定义机制
- 一旦新真源建立，所有机制判断、模板维护、脚本挂接都必须优先回到 upstream 风格源目录

### 8.2 不要只对齐 frontmatter 外形

当前 `sp` 的 Codex 模板已经有：

- `description`
- `## User Input`
- `$ARGUMENTS`

但这还不是 upstream 的完整命令机制。

注意：

- upstream 的差异不只在 Markdown 外壳，还在 `scripts`、`handoffs`、`agent_scripts`、feature 解析与上下文更新链
- 如果只把模板头部做得像 upstream，而不补脚本和前置控制，当前不稳定问题大概率仍会保留
- 迁移验收时，必须把“命令壳字段是否补齐”和“控制链是否补齐”分开检查

补充：

- 现在 `scripts/bash/*` 与 `scripts/powershell/*` 已经回到仓库中
- 下一步要检查的是哪些链路真的被当前 `sp` 安装与执行机制消费
- 否则会出现“文件已对齐，运行时仍未对齐”的假性完成

### 8.3 不要让 memory 继续替代底层机制

当前 `sp` 的 memory 系统很强，已经承担了：

- 项目路由
- 当前 feature 选择
- workset 选择
- 最小读集裁剪
- 风险与回滚入口

这套能力本身应该保留，但注意：

- memory 应是对机制的增强，不应继续替代 upstream 的 feature resolution、handoff、脚本前置检查
- 不能因为 memory 足够详细，就放弃对 `.specify/scripts`、命令前置校验、宿主控制字段的迁回
- 后续设计中要明确：哪些决策由脚本和壳负责，哪些决策由 memory 提示加速

### 8.4 不要模糊“内容增强”和“机制漂移”的边界

本次对比已经表明：

- `sp.flow`
- `sp.ui`
- `sp.gate`
- `sp.bundle`
- 更细的 `delivery/*`
- 更丰富的 `analysis.md` 与 `memory/*`

这些多数属于内容增强，不必回退。

真正要收敛的是：

- 目录结构
- 模板源位置
- 命令壳字段
- 脚本钩子
- 安装入口与宿主分发方式

注意：

- 迁移过程中不能把“内容和 upstream 不同”误判为必须删除
- 也不能把“壳子和安装方式不同”误判为只是内容个性化
- 每个差异都应在映射表中标注为“内容增强”或“机制漂移”

### 8.5 先定义命令契约，再迁移命令正文

当前 `sp.*` 与 upstream 的命令契约并不完全一致，例如：

- `sp.analyze` 允许写 `analysis.md` 和 memory
- upstream `analyze` 当前是只读检查型命令

这类差异未必必须消除，但必须先显式建模。

注意：

- 每个 `sp.*` 都要先定义：输入、输出、是否写文件、是否只读、前置条件、失败阻断方式
- 在“壳继承关系表”完成前，不要批量迁正文
- 若一个 `sp.*` 继承 upstream 壳但改动了命令契约，必须在文档中记录为有意偏离，而不是默认视为兼容

### 8.6 安装机制对齐时，不要忽略宿主差异

当前 `sp` 对宿主采取的是：

- Claude：project-local skills
- Codex：project-local skills
- Copilot：agent/prompt 双文件
- 根安装器：委托 `specify init` 写入目标目录

而 upstream 在宿主支持、初始化入口、Codex 集成方式上并不与当前仓库完全一致。

注意：

- “尽量对齐 upstream”不等于忽略宿主差异
- 需要先确认 upstream 当前 `main` 的真实宿主入口，再决定哪些部分照搬，哪些部分保留适配层
- 迁移中若必须保留 Claude/Codex 差异，应把差异限制在生成产物层，而不是再次扩散到真源机制层

### 8.7 脚本迁移必须同时考虑 POSIX、PowerShell、受限宿主

当前问题历史已经证明，单靠 prompt 或单靠某一宿主下的脚本成功并不够。

注意：

- 所有关键前置控制都要明确其 POSIX 版本与 PowerShell 版本
- 若某个 upstream 脚本在受限宿主中无法直接使用，必须声明等价替代层，而不能静默省略
- 不能只验证 macOS/Linux 成功就宣布机制迁移完成

### 8.8 兼容层可以保留，但必须带退役条件

迁移期允许保留旧目录和旧入口，但不能无限期共存。

注意：

- 每个兼容层都要写清楚保留原因、依赖方、退役条件、计划删除时机
- 文档中要明确“谁是真源，谁只是分发结果”
- 避免再次出现“双主源并存，维护者各改各的”状态

补充：

- `Archieved/` 目录已经承担历史保留角色
- 这意味着后续若继续保留历史结构，不应再赋予其机制职责
- 兼容层的存在理由要比以前更严格

### 8.9 验证必须覆盖“机制是否收敛”，而不只是“文件是否存在”

本次迁移目标是收敛机制不稳定，而不是仅让安装成功。

注意：

- 验证项不能只看文件有没有被复制出来
- 必须检查空项目阻断、缺前置产物阻断、feature 解析、宿主触发入口、memory 同步链是否正常
- 要把“当前高频错误是否收敛”作为最终验收项，而不是附带观察项

---

## 9. 里程碑与决策点

### 里程碑 M1

完成 `WP1`，输出：

- upstream 机制基线清单
- 目标目录树
- 命令壳映射表

状态：`已完成`

这是整个重构是否继续推进的第一决策点。

### 里程碑 M2

完成 `WP2`，新模板真源与脚本链路可独立运行。

状态：`已完成文件路径补齐，未完成运行机制替代`

这是新机制是否具备替代旧机制能力的第二决策点。

### 里程碑 M3

完成 `WP3`，安装器已切换到新真源，兼容层仍存在。

状态：`进行中`

这是是否进入旧结构退役准备期的第三决策点。

### 里程碑 M4

完成 `WP4`，所有核心验证通过。

这是是否正式宣布迁移完成的最终决策点。

---

## 10. 当前建议的执行顺序

建议严格按以下顺序推进：

1. 锁定 upstream 机制基线
2. 定义目标目录树
3. 建立 `sp.*` 壳继承关系表
4. 建立新模板真源目录
5. 迁移脚本钩子
6. 重构安装器
7. 建立兼容层
8. 同步文档
9. 执行全量验证
10. 再决定是否移除旧结构

---

## 11. 下一步

下一步不应立刻开始大面积改文件，而应先完成 `WP1`。

`WP1` 的最小交付物必须包括：

1. upstream 机制基线清单
2. 当前仓库到目标结构的迁移映射表
3. `sp.*` 到 upstream 命令壳的继承关系表

只有这三项明确后，后续重构才不会继续依赖猜测。
