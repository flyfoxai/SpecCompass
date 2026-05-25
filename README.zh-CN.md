# Spec Kit SP

Spec Kit SP 是基于 [github/spec-kit](https://github.com/github/spec-kit) 的增强版本。

本项目的原则是：尽量保留原版 Spec Kit 已经验证稳定的“瓶子”，也就是目录骨架、模板外壳、CLI 安装流程、integration 框架和脚本入口；只把里面的“水”换成更适合复杂项目和大模型协作的 SP 内容。

## 为什么要改

原版 Spec Kit 的安装和运行机制很稳定，但复杂项目里只靠 spec、plan、tasks 往往不够。大模型容易出现几个问题：

- 上下文窗口不够，读太多文件会浪费 token，读太少又会漏事实。
- 需求、界面、流程、接口、表、权限、验收之间的关系容易断。
- 风险、待办、阻塞项没有稳定位置，下一轮模型可能忘记。
- 文档过期后，模型可能继续往下做，导致连续出错。

SP 的目标不是推翻原版，而是在原版机制上加强文档深度、上下文路由、记忆管理和验证纪律。

## 修改后的优势

- 仍然使用 upstream 风格的 `specify init`、模板、脚本和 agent integration。
- 核心命令统一使用 `/sp.*`，例如 `/sp.specify`、`/sp.plan`、`/sp.analyze`。
- Codex、Claude 等 skills 宿主内部可能安装为 `sp-<command>/SKILL.md`，但用户使用时仍按 `/sp.*` 理解和调用。
- 新增 flow、ui、delivery、memory、trace、open-items 等分层文档，帮助模型按最小上下文工作。
- `sp.analyze`、`sp.gate`、`sp.implement` 加强了证据检查、风险闭环、向上兜底和实现后回写。
- 对大型项目可以提前拆分复杂子域，避免单次任务过大导致模型注意力失焦。

## 安装

推荐安装到本机工具链：

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/openSpecs.git
```

如果已经安装过旧版本：

```bash
uv tool install specify-cli --force --from git+https://github.com/flyfoxai/openSpecs.git
```

检查安装：

```bash
specify version
specify check
```

## 在 Codex 项目中使用

新项目：

```bash
specify init my-project --integration codex
cd my-project
```

已有项目：

```bash
cd /path/to/your/project
specify init . --integration codex
```

如果当前环境没有安装对应 agent CLI，或者只想先安装模板，可以跳过工具检查：

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

原版 Spec Kit 是基线，SP 是增强 fork。未来升级时，应先对齐原版的机制框架，再迁移 SP 的内容增强，避免安装路径、宿主命令、脚本入口和模板结构再次漂移。

