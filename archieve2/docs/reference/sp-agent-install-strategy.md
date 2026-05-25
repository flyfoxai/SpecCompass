# `sp` Agent 安装策略

> 本文描述当前仓库已经采用的真实安装机制：根安装脚本只是上游风格包装层，实际集成由本仓内 `specify init` 完成。

## 1. 核心原则

`sp` 的安装现在分成两层：

1. 安装项目内 starter pack
2. 按 `--ai` 安装项目内 agent integration

两层都落在目标项目内部，不再依赖旧的全局命令目录分发链。

## 2. 统一语义与宿主触发

规范步骤语义仍然统一为：

- `sp.constitution`
- `sp.specify`
- `sp.clarify`
- `sp.flow`
- `sp.ui`
- `sp.gate`
- `sp.bundle`
- `sp.plan`
- `sp.tasks`
- `sp.analyze`

不同宿主只改变调用外形：

- Codex: `$sp-specify`
- Claude: `/sp-specify`
- 传统 slash-command 宿主: `/sp.specify`

因此模板正文里应优先引用 `sp.*` 语义，而不是把某个宿主的触发语法硬编码成规范本体。

## 3. 真源与安装入口

当前真源如下：

- `templates/commands/`: 共享命令模板真源
- `templates/project/`: 共享项目资产真源
- `src/specify_cli/`: upstream 风格 CLI 与 integration 实现
- `scripts/install.sh`
- `scripts/install.ps1`

当前根安装脚本的职责很窄：

- 解析少量通用参数
- 解析本地源码树或远程归档
- 调用本仓 `specify init`

也就是说，根安装脚本本身不再承担旧版“渲染模板并手工写入全局命令目录”的工作。

## 4. 当前真实落位

### 4.1 不带 `--ai`

只安装项目内 starter pack。

典型结果：

- `.specify/memory/`
- `.specify/scripts/`
- `.specify/templates/`
- `specs/`
- 项目文档与模板骨架

### 4.2 `--ai codex`

当前 Codex 是 skills integration，而不是 prompts integration。

真实落位：

- `.agents/skills/sp-*/SKILL.md`

真实触发形式：

- `$sp-specify`
- `$sp-plan`
- `$sp-analyze`

附加特征：

- `--skills` 是 Codex integration 的默认行为
- `--ai-skills` 现在只是兼容入口，不是必需前提
- 相关安装记录写入 `.specify/integrations/codex.manifest.json`

### 4.3 `--ai claude`

当前 Claude 也是 skills integration。

真实落位：

- `.claude/skills/sp-*/SKILL.md`

真实触发形式：

- `/sp-specify`
- `/sp-plan`
- `/sp-analyze`

附加特征：

- Claude skill frontmatter 会补入 `user-invocable: true`
- 还会补入 `disable-model-invocation: true`
- 可选补入 `argument-hint`
- 相关安装记录写入 `.specify/integrations/claude.manifest.json`

### 4.4 `--ai copilot`

Copilot 仍然是 command/prompt 双文件模式。

真实落位：

- `.github/agents/sp.*.agent.md`
- `.github/prompts/sp.*.prompt.md`

## 5. 成功条件

某个 agent 安装成功，至少应满足：

1. `scripts/install.sh` 或 `scripts/install.ps1` 成功进入 `specify init`
2. 目标项目写入了 starter-pack 基础资产
3. 目标 agent 的实际目录出现了对应集成文件
4. `.specify/integrations/*.manifest.json` 记录了这些文件
5. 安装输出给出的触发示例与该宿主真实触发形式一致

示例：

- Codex 不应再显示旧的 prompt-path 示例
- Claude 不应再显示 `/sp.specify`
- 当前正确示例分别是 `$sp-specify` 与 `/sp-specify`

## 6. 当前推荐验证方法

安装后至少复查：

- Codex: `.agents/skills/sp-specify/SKILL.md`
- Claude: `.claude/skills/sp-specify/SKILL.md`
- Copilot: `.github/agents/sp.specify.agent.md`
- Shared: `.specify/integrations/sp.manifest.json`

如果这些路径不存在，就不能把安装判为成功。

## 7. 与旧机制的边界

以下旧产物类型现在只应被视为历史方案或错误预期：

- 旧的全局 Codex prompt 目录
- 旧的全局 Codex command 镜像目录
- 旧的 Claude commands 目录
- 现已归档到 `Archieved/scripts/render_command_template.py` 的旧自定义分发链

这些路径不再是当前仓库的主动安装目标。

## 8. 结论

当前 `sp` 的安装策略已经回到更接近 upstream 的形式：

- 入口是 `specify init`
- 真正的宿主集成由 integration 层决定
- 产物默认落在目标项目内部
- `sp` 与 upstream 的主要差异应保留在命令内容，而不是自定义分发框架
