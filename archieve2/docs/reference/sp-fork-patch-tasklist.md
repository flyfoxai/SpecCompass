# `sp` Fork Patch 任务单

> 目标：把真实 fork upstream 时要改的内容拆成 patch 级任务，避免真正落仓时再从头判断。

## 1. 使用方式

这份任务单服务于真实 fork 阶段。

执行原则：

- 一次只做一类 patch
- 每类 patch 完成后立即验证
- 优先改模板和文档，最后再补脚本

## 2. Patch 分组

## Patch 01: 冻结 upstream 基线

目标：

- 记录本次 fork 的准确 upstream 版本

动作：

- 记录 upstream commit / tag
- 复制当时 `README`
- 复制当时 `AGENT_CONFIG`
- 记录模板目录和脚本目录布局

完成标准：

- 可以精确回答 agent 列表、agent id 和命令落位

## Patch 02: 更新项目级 memory 与 constitution

目标：

- 把文档工作流边界和项目级路由写进 memory

动作：

- 更新 `.specify/memory/constitution.md`
- 初始化 `.specify/memory/project-index.md`
- 初始化 `.specify/memory/feature-map.md`
- 初始化 `.specify/memory/domain-map.md`
- 初始化 `.specify/memory/active-context.md`
- 初始化 `.specify/memory/hotspots.md`
- 写入两层文档原则
- 写入项目级第一跳路由规则
- 写入 `sp.analyze` 为文档结束点
- 写入 `Mermaid` 和 `JSON Forms` 约束

完成标准：

- agent 读取项目级 memory 后，不会把本工作流理解成默认写代码
- agent 能从项目级入口快速路由到正确 feature

## Patch 03: 替换命令名称

目标：

- 从 `speckit.*` 切换到 `sp.*`

动作：

- 替换 slash command 模板文件名
- 替换 skills 模板文件名
- 处理 `sp.checklist -> sp.gate` 兼容别名

完成标准：

- `sp.constitution` 到 `sp.analyze` 全部可见

## Patch 04: 替换命令正文

目标：

- 把命令正文从上游默认语义切换成当前文档工作流语义

动作：

- 套用 [sp-command-template-drafts.md](sp-command-template-drafts.md)
- 套用 [sp-command-output-contracts.md](sp-command-output-contracts.md)
- 确保每条命令都有 `Purpose / Read First / Do / Do Not / Output / Check Before Finish / Next`
- 确保 `sp.analyze` 固定输出最终结论和缺口分类，不保留自由散文式结束方式

完成标准：

- 不同 agent 之间只有触发语法不同，正文逻辑一致

## Patch 05: 增补 feature 模板

目标：

- 把新的文档骨架补到 `specs/<feature>/`

动作：

- 保留 `spec.md / plan.md / tasks.md`
- 增加 `clarifications.md / gate.md / bundle.md / analysis.md`
- 增加 `flows/`
- 增加 `ui/`
- 增加 `delivery/` 与 `delivery/tables/`
- 给 `analysis.md` 模板补入固定 verdict 表和 gap category 表

完成标准：

- active feature 下能创建完整的第一层与第二层文档骨架

## Patch 06: 扩展脚本路径支持

目标：

- 让初始化和模板写入支持新增产物路径

动作：

- 扩展 feature 路径创建逻辑
- 扩展模板复制逻辑
- 保持 `sh` / `ps` 双脚本
- 让 `sp.plan` 支持一次生成 `plan.md` 与 `delivery/*`

完成标准：

- 三个平台都能落同一组文档文件，并保持第二层多文件输出一致

## Patch 07: 更新安装与升级文案

目标：

- 保持原版使用心智

动作：

- 更新 README
- 更新 init / check / upgrade 说明
- 补 reload / refresh 提示

完成标准：

- 用户仍以 `specify init` 和 `specify check` 为主入口

## Patch 08: 执行多 agent 验证

目标：

- 验证兼容面没有退化

动作：

- 按 [sp-agent-validation-matrix.md](sp-agent-validation-matrix.md) 执行
- 至少验证 Claude、Codex、Gemini CLI、Kiro CLI、Windsurf、Roo、Kilo、agy、generic

完成标准：

- 命令可见
- 命令可触发
- 输出路径正确
- 文档阶段能在 `sp.analyze` 结束
- `analysis.md` 结构与枚举值符合统一规范

## 3. 提交建议

建议按以下顺序提交：

1. 基线冻结
2. constitution / memory
3. 命令名与命令正文
4. feature 模板
5. 脚本补丁
6. 文档与安装说明
7. agent 验证记录

## 4. 最终验收

真实 fork 可以进入试运行，至少要满足：

- `sp` 命令族完整
- 两层文档产物可生成
- 多 agent 写入可用
- `specify check` 能覆盖基本环境检查
- 文档工作流不依赖任何单一实现框架
- `analysis.md` 已被验证为固定收口文档，而不是自由总结页
