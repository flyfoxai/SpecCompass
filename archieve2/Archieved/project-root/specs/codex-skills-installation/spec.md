# Codex Prompt Installation Cleanup

## Background

`2026-04-06` 的 Windows 复测曾暴露一个关键问题：早期 fork 一度把 Codex 集成理解成 `sp-*` skills 安装，但用户真实可见、可触发的入口并不稳定，最终把排障链路拉得过长。

当前仓库已经收敛到更简单的策略：

- slash-command agents 使用 `/sp.*`
- Codex Desktop 使用 `/prompts:sp.*`
- `CODEX_HOME/prompts` 是主安装目录
- `CODEX_HOME/commands` 作为兼容镜像目录
- 遗留 `CODEX_HOME/skills/sp-*` 只做清理，不再作为现行分发方式

因此，这个 feature 的目标不再是“让 Codex skills 正常安装”，而是把仓库、安装器和说明文档统一到 prompt-only 策略，并清掉旧 skills 包装带来的歧义。

## Goals

- 明确区分 starter pack 安装和 Codex prompt 集成安装
- 当用户选择 Codex 模式时，把 `sp.*` 写入 Codex Desktop prompts，并同步镜像到 commands
- 清理遗留的 `sp-*` skills 目录和 `speckit.*` 旧命令文件
- 让安装成功条件、manifest 字段、trigger 示例和 next steps 与 prompt-only 策略一致
- 避免文档继续把用户引回 `$sp-*` 或 skills 路径

## In Scope

- `scripts/install.ps1` 和 `scripts/install.sh` 的 Codex 模式行为
- `--ai codex` 的 prompts/commands 写入、清理和失败判定
- `--ai-skills` / `-AiSkills` 兼容空操作文案
- `CODEX_HOME` 与默认 `.codex` 目录解析
- README、兼容文档、概览文档与 feature memory 的同步更新

## Out Of Scope

- 重新分发或恢复 `installer-assets/codex-skills`
- 为 Codex 增加 `$sp-*` 作为当前推荐入口
- 改变 `sp.*` 文档工作流本身的阶段语义
- 与安装器无关的生产实现

## Roles

- `ROLE-USER`：执行安装并根据输出判断 Codex 是否已经可见 `/prompts:sp.*`
- `ROLE-INSTALLER`：复制 starter pack、安装 prompts/commands、清理旧产物、失败时直接报错
- `ROLE-CODEX`：从 prompts/commands 发现 `sp.*` prompt 文件，并通过 `/prompts:sp.*` 触发
- `ROLE-MAINTAINER`：保持脚本、README、兼容文档和验证矩阵一致

## Success Criteria

- starter-pack-only 模式必须明确说明未安装任何 agent 集成
- Codex 模式必须在 `-Ai codex` / `--ai codex` 下默认安装 prompts，并镜像到 commands
- `-AiSkills` / `--ai-skills` 仅作为兼容空操作保留，不再触发 skills 安装
- 当 `CODEX_HOME` 为空时，必须回退到默认 `.codex` 目录
- 最终 prompts 目录必须解析为 `<codex_home>/prompts`
- 最终 commands 目录必须解析为 `<codex_home>/commands`
- 若发现遗留 `sp-*` skills，安装器必须清理并记录
- 若发现遗留 `speckit.*` prompt/command 文件，安装器必须清理并记录
- Codex 模式下，只有在项目资产、prompts 和 commands 都实际写出后，安装才算成功
- 安装器必须输出 `/prompts:sp.specify`、`/prompts:sp.analyze` 等正确触发示例
- manifest 必须记录 `codexPromptsDir`、`codexCommandsDir`、安装列表与遗留清理结果

## Non-Goals

- 把历史 `skills` 目录残留视为当前机制的一部分
- 继续使用含糊文案，让用户自行猜测应该测试 `/sp.*`、`$sp-*` 还是 `/prompts:sp.*`
- 允许只写 starter pack 或只写 commands 时仍显示 Codex 集成成功

## Evidence Snapshot

- 当前 README 与兼容文档把 Codex 入口统一定义为 `/prompts:sp.*`
- 当前安装脚本会写入 `CODEX_HOME/prompts` 并同步镜像到 `CODEX_HOME/commands`
- 当前安装脚本会清理旧 `speckit.*` prompt/command 文件
- 当前安装脚本会清理遗留 `CODEX_HOME/skills/sp-*`
- 当前仓库已删除 `installer-assets/codex-skills/` 下的分发内容

## Open Clarification Items

- 是否需要在后续版本里彻底移除 `--ai-skills` / `-AiSkills` 兼容参数
- 是否需要补一份面向 Windows 的专门 smoke checklist，降低 Codex 回归成本
