<div align="center">
  <h1>SpecCompass</h1>
  <p><em>面向 AI 编程 Agent 的规格驱动开发：实现前先由人确认。</em></p>
</div>

SpecCompass 基于 [GitHub Spec Kit](https://github.com/github/spec-kit) 增强，把产品意图、规格、实现和验证连成一条可控流程。英文说明见 [README.md](./README.md)。

## 核心能力

- **PRD Outline 确认**：`/sp.prd` 用分阶段思维导图展示全局和业务分支，并在节点上提供候选与自由输入；纲要成熟后，必须完成正式图形确认才能进入 `/sp.specify`。
- **Flow 和 UI 确认**：`/sp.flow`、`/sp.ui` 提供可视化确认页。确认项分为“非常重要、重要、普通”三档；非常重要项会控制数量，并且必须逐项确认。
- **受控交付**：规划、分析、准入、实现和验证都以已确认的范围和证据为依据。

常用流程：

```text
/sp.prd -> /sp.specify -> /sp.flow -> /sp.ui
        -> /sp.bundle -> /sp.plan -> /sp.tasks
        -> /sp.analyze -> /sp.gate -> /sp.implement
```

不知道下一步做什么时，使用 `/sp.route`。

## 安装

```bash
uv tool install specify-cli --force \
  --from git+https://github.com/flyfoxai/SpecCompass.git

specify init my-project --integration codex
cd my-project
specify check
```

已有项目只升级命令行工具还不够，因为旧模板已经复制进项目，不会自动变化。先提交本地修改，再到项目根目录刷新受管理的模板：

```bash
specify init . --integration codex --force
```

请把 `codex` 换成实际使用的集成。在支持斜杠命令的宿主中使用 `/sp.*`，在 Codex 中使用 `$sp-*` skills。

详细规则见 [SP 项目方法论](./docs/reference/sp-project-methodology.md)。许可证见 [LICENSE](./LICENSE)。
