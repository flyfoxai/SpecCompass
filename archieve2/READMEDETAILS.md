# OpenSpecs (Speckit Layered): 基于 Spec Kit 的分层文档工作流

`sp` 是一个基于原版 `Spec Kit` 思路重构的分层文档机制。

它的目标不是让大模型从一段需求直接跳到代码，而是先把项目拆成一套可查询、可回链、可逐步收敛的文档骨架，让模型在有限上下文里只处理当前那一小块工作，同时把已经稳定的中间结论沉淀下来，避免后面反复重想、反复漂移。

当前仓库只覆盖文档阶段，工作流在 `sp.analyze` 结束。`sp.implement` 可视为后续规划中的实现阶段入口，但不属于当前这份文档阶段 starter pack。

## 这套机制解决什么问题

原始需求和最终实现之间，通常会有三个真实问题：

- 需求不完整，路线问题、边界问题、界面问题、流程问题会在中途不断冒出来。
- 大模型没有长期记忆，上下文窗口又有限，导致同一个问题会被重复推理，既浪费 token，也容易前后不一致。
- 项目一旦变大，比如 `50` 个界面、`50` 条流程、`100` 张表，模型很容易因为读不全、记不住、找不到入口而跑偏。

`sp` 的做法不是让模型一次看完整个项目，而是先搭骨架，再让模型按局部 workset 逐块推进。

## 它是什么，不是什么

它是什么：

- 是一套文档优先的项目推进机制
- 是一套面向大模型的中间态约束系统
- 是一套基于 `Spec Kit` 命令式工作方式改造出来的分层工作流
- 是一套为后续自动化实现打基础的文档框架

它不是什么：

- 不是当前阶段的代码生成器
- 不是“写一份 PRD 就自动出系统”的黑盒
- 不是只适合小需求的一次性提示词

## 核心机制

### 1. 两层文档推进

第一层是业务澄清层，回答：

- 这个东西到底要做什么
- 为什么做
- 业务主线怎么走
- 角色边界、规则边界、能力边界是什么
- 哪些问题已经稳定，哪些还没定

第二层是交付设计层，回答：

- 第一层稳定下来的业务，如何转成可交付的结构
- 页面、流程、用例、接口、数据表、验收之间如何追踪
- 该怎么拆 workset，才能让模型局部工作

## 2. 统一澄清入口

`sp.clarify` 是统一澄清命令，不再拆成 `cf_spec`、`cf_flow`、`cf_ui` 这类外部命令。

它内部可以处理三类问题：

- `CF-SPEC`
- `CF-FLOW`
- `CF-UI`

它的作用不是随便问问题，而是把那些会影响路线、范围、流程分支、页面责任、字段约束的事项，变成可回放、可传播、可追踪的澄清记录。

默认优先：

- 单选题
- 多选题
- 必要时附加备注

这样做的目的，是尽量减少模糊回答，降低用户输错和模型误解的概率。

## 3. Query-First Memory

这是这套机制最关键的部分。

`sp` 不是只靠正文文档推进，还固定引入两层记忆层：

- 项目级：`.specify/memory/*`
- feature 级：`specs/<feature>/memory/*`

记忆层不是事实源，事实源仍然是 `spec.md`、`clarifications.md`、`flows/*`、`ui/*`、`plan.md`、`delivery/*`、`tasks.md`、`analysis.md` 这些正文文件。

记忆层负责三件事：

- 先路由：现在应该去哪个 feature，看哪个 workset
- 先压缩：哪些结论已经稳定，不要再重推
- 先过滤：哪些问题还开放，哪些地方 stale，哪些链路风险最高

换句话说，模型先查入口，再读正文，而不是每次从头翻全项目。

## 4. Workset 局部工作面

当项目规模变大后，不能让模型一直背着整个 feature。

所以 `sp.plan` 之后必须把工作拆成多个 `ws-*.md`，每个 workset 只覆盖一个相对闭合的小区域，比如：

- 一个主界面及其相关流程
- 一个审批链路
- 一组高关联接口和表
- 一个高风险副作用区域

这样模型只需要带着当前 workset 的最小阅读集工作，不需要把全部上下文塞进一轮对话。

## 5. 澄清传播闭环

澄清不是“问完就完了”。

`sp.clarify` 一旦得到稳定答案，就必须：

1. 先更新 `Source Of Truth`
2. 再列出 `Required Sync Files`
3. 再检查传播是否完成
4. 没同步完就把相关 memory 视为 stale

这样可以避免一个结论改了 `spec.md`，但没改 `flow`、`ui`、`plan`、`memory`，最后整个项目文档互相打架。

## 6. 尽量保持与原版 Spec Kit 一致

这套机制不是另起炉灶，而是尽量借用原版 `Spec Kit` 的工作方式。

保留的核心点：

- 继续使用 `specify init`
- 继续使用 `specify check`
- 继续沿用 `specs/<feature>/` 目录
- 继续沿用 active feature 检测方式
- 继续沿用多 agent 适配思路

主要改造点：

- 命令前缀从 `speckit` 改成 `sp`
- 在 `specify / clarify / plan / tasks / analyze` 中间插入 `flow / ui / gate / bundle`
- 把 `plan / tasks / analyze` 也明确纳入文档阶段
- 本阶段工作流在 `sp.analyze` 结束

## 机制特点

- 自上而下：先需求和边界，再业务骨架，再流程和界面，再交付设计，再一致性分析。
- 先宏观后微观：先问路线问题，再问局部实现问题。
- 统一澄清：不把 spec、flow、ui 的冲突拆成多套问答系统。
- 记忆优先：先看记忆层是否已有稳定结论，再决定要不要回读正文。
- 禁止重复推理：稳定结论一旦 fresh，就默认复用。
- 局部推进：通过 workset 让模型只处理局部区域。
- 编号回链：用 `FLOW-*`、`SCREEN-*`、`API-*`、`TABLE-*`、`ACC-*` 这类 ID 建立追踪。
- 跨文档同步：澄清变更必须带传播状态，不能只改一处。
- 中型项目导向：不是只针对几个页面的小功能，而是按中型项目负载来约束结构。

## 预期达成效果

这套机制要达成的，不是“文档写得漂亮”，而是下面这些结果：

- 大模型每一步都有更明确的阅读入口，不容易一上来读偏。
- 已经稳定的结论可以沉淀下来，减少重复推理带来的 token 浪费。
- 同一个问题不会在不同步骤里反复得到不同答案，降低冲突处理成本。
- 当界面、流程、表越来越多时，项目仍然能按 workset 局部推进。
- 后续如果进入自动开发阶段，模型可以只拿到当前那一小块所需上下文，而不是整个项目全集。
- 团队成员或不同模型接手时，有更强的回放性和一致性。

## 相比原版工作流的优势

如果只看文档阶段，`sp` 相比直接沿用原版思路，主要多了这些能力：

- 多了明确的两层分工，不再把所有事情压在一条线里。
- 多了 `flow` 和 `ui` 这两个独立步骤，流程和界面不再被挤在澄清或计划里。
- 多了 `gate` 和 `bundle`，第一层是否过关、如何向第二层交接，不再靠隐含理解。
- 多了 query-first memory，项目级和 feature 级都有默认入口。
- 多了 workset 拆分机制，更适合有限上下文模型。
- 多了澄清传播闭环，减少“改了一处、漏了多处”的文档漂移。
- 多了中型项目规模触发器，不让结构在项目变大后失控。

## 适用情况

适合：

- 需求复杂、边界多、流程多、界面多的业务系统
- 需要多人协作或多模型接力的项目
- 希望为后续自动开发打基础的项目
- 中型项目，或未来会长成中型项目的项目
- 对一致性、可回放、可追踪要求较高的项目

尤其适合这类项目规模：

- 约 `10+` 个以上界面
- 约 `10+` 条以上流程
- 约 `20+` 张以上表，且还会继续增长

更适合接近这种负载的项目：

- `50` 个界面左右
- `50` 条流程左右
- `100` 张表左右

## 不太适合的情况

- 只有一两个页面、几条简单规则的小工具
- 需求已经极其稳定，不需要复杂澄清和追踪
- 团队只想尽快手工开发，不打算沉淀自动化文档骨架
- 当前完全不关心一致性、追踪和后续模型接力

## 整体流程，说人话

如果你要开始一个项目，建议这样理解：

1. 先用 `sp.constitution` 定规矩。
目的：把整个项目的边界、工作流规则、记忆层规则先定下来，避免后面每一步各想各的。

2. 再用 `sp.specify` 把原始需求写成 feature 规格。
目的：先把“做什么、不做什么、谁参与、成功标准是什么”说清楚。

3. 接着用 `sp.clarify` 把路线问题问清楚。
目的：把会影响方向、范围、主线、界面责任、流程分支的问题尽早定下来。

4. 用 `sp.flow` 把业务流程画出来。
目的：把阶段顺序、分支、异常、状态流转固定下来。

5. 用 `sp.ui` 把界面结构定出来。
目的：把页面、页面责任、关键动作、字段约束、页面之间关系固定下来。

6. 用 `sp.gate` 做第一层闸门检查。
目的：判断业务层是不是已经足够稳定，能不能进入下一层。

7. 用 `sp.bundle` 做交接包。
目的：把第一层的稳定结论压缩成第二层可直接接手的入口包。

8. 用 `sp.plan` 做第二层交付设计。
目的：把页面、流程、接口、表、权限、验收等关系整理出来，并拆成 workset。

9. 用 `sp.tasks` 做任务拆解。
目的：把 workset、对象、交付项、验收项绑定起来，形成可执行清单。

10. 最后用 `sp.analyze` 做一致性分析和冒烟判断。
目的：检查这套文档是否真的足够支撑后续自动化工作，而不是表面完整。

补充一点：

- `sp.clarify` 不只执行一次。
- 如果在 `sp.flow` 或 `sp.ui` 里发现高影响分歧，可以回到 `sp.clarify`。
- 如果某个澄清答案会影响多个文件，就必须走传播闭环。

## 简单用法

当前仓库仍然不是完整发布的真实 fork CLI，但已经可以把文档阶段 starter pack 安装到指定项目目录里。

所以“简单用法”分两层看：

### 1. 当前仓库怎么用

先安装文档阶段 starter pack：

本地仓库执行：

```bash
sh scripts/install.sh
sh scripts/install.sh ./your-project
```

远程一条命令：

```bash
# 默认仅安装 starter pack
curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project

# 安装 starter pack + Codex integration
SP_INSTALL_AI=codex curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project
```

说明：

- 上述远程示例默认跟随 `main` 分支，便于快速试用
- 如果你要稳定安装到某个固定版本，建议把 `--archive-url` 换成指定 tag 或 release 的压缩包链接

Windows 本地执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 .\your-project
```

Windows 远程一条命令：

```powershell
# 默认仅安装 starter pack
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex

# 安装 starter pack + Codex integration
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; $env:SP_INSTALL_AI="codex"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex
```

说明：

- Windows 远程示例同样默认跟随 `main.zip`
- 若要锁定版本，请改成明确 tag / release 的 zip 地址

说明：

- 不传目录时默认安装到当前目录
- 安装前默认要求确认
- `curl | sh` 场景支持通过 `--archive-url` 与可选目标目录传参
- `irm | iex` 场景通过 `SP_INSTALL_ARCHIVE_URL`、`SP_INSTALL_TARGET_DIR`、`SP_INSTALL_AI`、`SP_INSTALL_AUTO_YES` 传参
- 不带 `--ai` 时，安装器只落地 starter pack，不会安装任何宿主集成

如果当前要给 Codex 或 Claude 安装宿主集成，需要显式启用对应模式：

```bash
sh scripts/install.sh --ai codex ./your-project
sh scripts/install.sh --ai claude ./your-project
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\your-project
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude .\your-project
```

当前仓库里的 starter pack 安装器会把根安装脚本当作 upstream 风格包装层，然后委托本仓 `specify init` 完成实际分发。当前真实宿主落位是：

- `--ai codex` / `SP_INSTALL_AI=codex`
  - 写入 `.agents/skills/sp-*/SKILL.md`
  - 触发形式是 `$sp-*`
  - 记录写入 `.specify/integrations/codex.manifest.json`
- `--ai claude` / `SP_INSTALL_AI=claude`
  - 写入 `.claude/skills/sp-*/SKILL.md`
  - 触发形式是 `/sp-*`
  - 记录写入 `.specify/integrations/claude.manifest.json`
- `--ai copilot`
  - 写入 `.github/agents/sp.*.agent.md`
  - 写入 `.github/prompts/sp.*.prompt.md`
- 共享 starter pack 记录写入 `.specify/integrations/sp.manifest.json`

安装后也建议快速自检：

```bash
find ./your-project/.agents/skills -maxdepth 2 -name SKILL.md
find ./your-project/.claude/skills -maxdepth 2 -name SKILL.md
find ./your-project/.github/agents -maxdepth 1 -name 'sp.*.agent.md'
```

```powershell
Get-ChildItem .\your-project\.agents\skills -Recurse -Filter SKILL.md
Get-ChildItem .\your-project\.claude\skills -Recurse -Filter SKILL.md
Get-ChildItem .\your-project\.github\agents -Filter "sp.*.agent.md"
```

安装完成后，你可以直接用这套文档规范和样例推进设计工作：

- 先阅读根 README 和 `docs/`
- 参考 `Archieved/project-root/specs/attendance-leave/` 归档样例看完整链路
- 按 `sp.constitution -> sp.specify -> sp.clarify -> sp.flow -> sp.ui -> sp.gate -> sp.bundle -> sp.plan -> sp.tasks -> sp.analyze` 的顺序组织你的 feature 文档

重点入口：

- 机制总规范：`docs/reference/sp-command-spec.md`
- 记忆层规范：`docs/reference/sp-context-memory-architecture.md`
- 命令产物契约：`docs/reference/sp-command-output-contracts.md`
- 模板清单：`docs/reference/sp-template-file-manifest.md`
- 样例链路：`Archieved/project-root/specs/attendance-leave/`

### 2. 未来真实 fork 后怎么用

真实 fork 落地时，仍然尽量沿用原版安装和初始化方式：

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify init . --ai codex
specify check
```

命令触发方式约定为：

- Codex：`$sp-specify`
- Claude：`/sp-specify`
- 传统 slash-command 宿主：`/sp.specify`

必须明确区分：

- `$sp-*` 属于 Codex skills
- `/sp-*` 属于 Claude skills
- `/sp.*` 属于传统 slash-command 宿主
- 不应再把 Codex 示例写成旧的 prompt-path 形式

其他命令同理：

- `$sp-constitution` / `/sp-constitution` / `/sp.constitution`
- `$sp-clarify` / `/sp-clarify` / `/sp.clarify`
- `$sp-flow` / `/sp-flow` / `/sp.flow`
- `$sp-ui` / `/sp-ui` / `/sp.ui`
- `$sp-gate` / `/sp-gate` / `/sp.gate`
- `$sp-bundle` / `/sp-bundle` / `/sp.bundle`
- `$sp-plan` / `/sp-plan` / `/sp.plan`
- `$sp-tasks` / `/sp-tasks` / `/sp.tasks`
- `$sp-analyze` / `/sp-analyze` / `/sp.analyze`

跨平台兼容原则：

- macOS、Linux、Windows 都要覆盖
- Windows 默认 `ps`
- macOS / Linux 默认 `sh`
- agent 兼容范围尽量看齐原版 `Spec Kit`

## 记忆层在哪一步梳理

不是只有一步才做记忆层。

记忆层是贯穿式机制：

- `sp.constitution` 初始化项目级记忆层
- `sp.specify` 初始化 feature 级记忆层
- `sp.clarify` 刷新稳定事实、开放问题、追踪入口
- `sp.flow`、`sp.ui` 刷新流程和界面相关追踪
- `sp.gate`、`sp.bundle`、`sp.plan`、`sp.analyze` 都要检查 memory 是否 stale

其中 `sp.bundle` 的作用不是代替 memory，而是把第一层已经稳定的结论打成第二层好接手的压缩包，并推动项目级活跃上下文更新。

## 为什么它有机会降低 token 消耗

这套机制并不是靠“少写文档”来省 token，而是靠“少做重复推理”来省 token。

主要来源有四个：

- 已稳定结论进入 memory 后，后续步骤默认直接复用。
- 新步骤先走项目级和 feature 级路由，而不是回读全量正文。
- 第二层通过 workset 局部推进，不要求模型一直背整包上下文。
- `sp.clarify` 把高影响问题尽量前置，把反复卡住的小问题做批量冲刷，减少多轮往返。

它不能保证没有额外 token 开销，因为文档层本身更完整了；但它的目标是把 token 花在新增信息上，而不是花在反复重建已经知道的东西上。

## 这套机制当前达到什么程度

当前仓库已经完成的是文档阶段的规范化设计，重点包括：

- 命令链路已经固定
- 两层记忆层已经固定
- 澄清机制已经固定
- workset 机制已经固定
- 中型项目规模触发器已经固定
- 样例 feature 已经覆盖从 `spec` 到 `analysis` 的完整链路

当前还没有做的是：

- 基于原版仓库的真实 fork 落地
- 实际命令模板写入各 agent 命令目录并验证
- `sp.implement` 阶段设计和实现

## 当前阶段边界

请把当前仓库理解为：

- 一个文档阶段工作流设计仓库
- 一个真实 fork 前的规范沉淀仓库
- 一个用于验证分层机制、记忆层、澄清传播和中型项目适配能力的基础仓库

不要把它理解成：

- 已可直接安装发布的完整产品
- 已包含代码生成阶段的全流程系统

## 关键文档入口

- `docs/reference/sp-command-spec.md`
- `docs/reference/sp-context-memory-architecture.md`
- `docs/reference/sp-command-output-contracts.md`
- `docs/reference/sp-template-file-manifest.md`
- `docs/reference/sp-installation-and-agent-compatibility.md`
- `docs/reference/sp-document-stage-closeout-checklist.md`
- `docs/reference/sp-medium-project-smoke-test.md`
- `Archieved/project-root/specs/attendance-leave/`

## 一句话总结

`sp` 想做的事情很简单：先给大模型搭一副足够稳定、可查询、可回放、可局部推进的文档骨架，再让它在有限上下文里干局部工作，而不是每次都从混乱需求重新开始。
