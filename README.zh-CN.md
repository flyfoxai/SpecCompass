<div align="center">
    <img src="./media/logo_large.webp" alt="Spec Kit Logo" width="200" height="200"/>
    <h1>Spec Kit SP</h1>
    <h3><em>保留原版机制，增强分层规划、记忆和验证。</em></h3>
</div>

Spec Kit SP 是基于 [github/spec-kit](https://github.com/github/spec-kit) 的增强版。

我们的原则很简单：尽量保留原版 Spec Kit 已经验证稳定的“瓶子”，包括目录骨架、模板外壳、CLI 安装流程、integration 框架和脚本入口；只替换里面的“水”，让它更适合复杂项目和大模型协作。

英文版说明见 [README.md](./README.md)。

## 为什么要改

原版 Spec Kit 的安装和运行机制很稳定，但在复杂项目里，单靠 spec、plan、tasks 往往不够。

SP 主要想解决这些问题：

- 上下文太大，模型容易读漏、读重。
- 需求、界面、流程、接口、表、权限、验收容易脱节。
- 风险、待办、阻塞项没有固定位置，下一轮容易忘。
- 文档过期后，模型还可能继续沿着旧路线执行。

SP 是可以单独安装和使用的增强版。用户不需要再手动下载原版，也不需要自己做“对齐原版”的操作。

## 修改后的优势

- 仍然使用 upstream 风格的 `specify init`、模板、脚本和 agent integration。
- 用户可见命令统一使用 `/sp.*`，例如 `/sp.specify`、`/sp.plan`、`/sp.analyze`。
- Codex、Claude 等 skills 宿主的核心命令 skill 也使用点号目录，例如 `sp.analyze/SKILL.md`，所以用户看到和输入的仍是 `/sp.analyze`。Codex 会同时安装 `.agents/skills/sp.*` 和 `.codex/skills/sp.*`，兼容 CLI 与桌面端发现路径。
- 新增 flow、ui、delivery、memory、trace、open-items 等分层文档，帮助模型按最小上下文工作。
- 增加稳定编码和锚点规则，用来标记 feature、workset、UI、API、风险、测试和 trace 关系，方便模型快速搜索和定位关联内容。
- 增加项目级 memory，包括 active context、feature map、hotspots、open items、trace index，减少重复读取和重复判断。
- 明确什么时候必须回写状态，什么时候不要重复检查，降低 token 浪费。
- `/sp.analyze`、`/sp.gate`、`/sp.implement` 加强了证据检查、风险闭环、向上兜底、headless 失败报告和实现后回写。
- 对需求不清、需求冲突、阶段走错的情况，要求模型回到合适的 `/sp.*` 阶段，必要时给用户可选方案，而不是继续猜。
- 对大型项目可以提前拆分复杂子域，避免一次任务过大导致注意力失焦。

## 安装

安装到本机工具链：

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/openSpecs.git
```

升级已有安装：

```bash
uv tool install specify-cli --force --from git+https://github.com/flyfoxai/openSpecs.git
```

检查安装：

```bash
specify version
specify check
```

## 在 Codex 项目中使用

新建项目：

```bash
specify init my-project --integration codex
cd my-project
```

已有项目：

```bash
cd /path/to/your/project
specify init . --integration codex
```

如果当前环境没有目标 agent CLI，或者只想先装模板：

```bash
specify init . --integration codex --ignore-agent-tools
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `/sp.constitution` | 建立或更新项目原则、工程约束和治理规则 |
| `/sp.specify` | 创建 feature 规格，说明要做什么、为什么做 |
| `/sp.clarify` | 对不清楚的需求做结构化澄清 |
| `/sp.plan` | 生成技术方案、架构选择和实施计划 |
| `/sp.flow` | 生成或刷新业务流程、状态流、时序流 |
| `/sp.ui` | 生成或刷新界面、页面映射、表单和交互说明 |
| `/sp.tasks` | 把方案拆成可执行任务 |
| `/sp.analyze` | 检查 spec、plan、tasks、flow、ui、delivery、memory 是否一致和完整 |
| `/sp.gate` | 判断当前文档状态是否可以继续进入下一阶段 |
| `/sp.implement` | 按任务执行实现，并要求验证和必要的 memory 回写 |
| `/sp.bundle` | 打包当前 feature 的交付文档 |
| `/sp.checklist` | 生成质量检查清单 |

## 和原版的关系

SP 来源于 [github/spec-kit](https://github.com/github/spec-kit)，并尽量保留原版稳定的安装和工作流风格。对用户来说，这个仓库就是安装目标：安装 SP，初始化项目，然后直接使用 `/sp.*` 命令即可。

## 许可证

本项目遵循原版 Spec Kit 的许可证。见 [LICENSE](./LICENSE)。
