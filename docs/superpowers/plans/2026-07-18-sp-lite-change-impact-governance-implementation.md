# SP Lite Change Impact Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 先修复 SP Lite V1 的跨平台签名确定性并发布 `v0.11.0`，再以可迁移、可审计的方式实现按路径影响分级的 V2 全局治理。

**Architecture:** V1 保持现有 `speckit.lite.route.v1` 路由语义，只把 Bash 与 PowerShell 的路径规范化统一为 UTF-8 字节的小写十六进制表示。V2 另行引入版本化快照、治理范围、路径级 delta 和规则驱动分类器，通过 V1/V2 双读建立基线，最后再把 V2 设为新项目默认值。

**Tech Stack:** Bash 5、PowerShell 7、Python 3.11+、pytest、Markdown 命令模板、JSON/YAML 状态证据、GitHub Actions。

## Global Constraints

- `v0.11.0` 修复 V1 签名规范化和阶段验证新鲜度，不增加 V2 状态，也不改变现有路由优先级。
- Git 路径以 NUL 分隔读取；规范化路径使用原始 UTF-8 字节的小写十六进制表示，并按该 ASCII 表示进行 ordinal 排序。
- 签名清单固定使用 UTF-8 无 BOM 和 LF；不得依赖平台默认编码或换行。
- V2 必须保留全局发现能力，但只有 `BLOCKING` 才硬阻塞，`IMPACT_REVIEW_REQUIRED` 必须等待与精确变化签名绑定的人工决定。
- V2 治理范围只能追加；缩小范围需要记录具体条目、理由、确认人和时间，并立即重新执行完整检查。
- 只有 `/sp.lite sync` 可以在修复后重新计算证据并清除 blocker。
- Git HEAD 只是可比较基线；只有基线不可比较或实际 delta 命中阻塞规则时才阻塞。
- 保持 Bash 与 PowerShell 行为对等；所有状态和迁移路径都必须有跨平台测试。
- 保持英文/中文用户文档同步；命令模板继续使用英文，机制和设计说明使用中文。
- 不修改 `.planning/`、`output/` 或 `docs/examples/review/` 下未跟踪的实验文件。

## File Structure

- `scripts/bash/sp-lite-state.sh`: V1 规范化签名，并在 V2 阶段读取快照/分类结果。
- `scripts/powershell/sp-lite-state.ps1`: 与 Bash 逐字节对等的签名和路由实现。
- `tests/test_sp_lite.py`: V1 回归、特殊路径矩阵、V2 分类和迁移测试。
- `templates/project/.specify/templates/feature/lite.md`: V1 阶段验证基线；V2 `global_control` 摘要、治理范围签名和迁移审计字段。
- `scripts/bash/sp-lite-impact.sh`: V2 Bash 快照、delta 和影响分类入口。
- `scripts/powershell/sp-lite-impact.ps1`: V2 PowerShell 对等入口。
- `templates/commands/lite.md`: `IMPACT_REVIEW_REQUIRED` 选择、repair mode 和 `/sp.lite sync` 合同。
- `docs/quickstart.md`、`docs/quickstart.zh-CN.md`: 用户可见的影响确认与迁移说明。
- `docs/reference/speckit-command-usage.md`、`docs/reference/speckit-command-usage.zh-CN.md`: `/sp.lite sync` 和影响分级参考。

---

### Task 1: 修复 V1 跨平台签名确定性

**Files:**

- Modify: `tests/test_sp_lite.py`
- Modify: `scripts/bash/sp-lite-state.sh`
- Modify: `scripts/powershell/sp-lite-state.ps1`

**Interfaces:**

- Consumes: `git ls-files -co --exclude-standard -z` 或非 Git 文件枚举。
- Produces: 两个平台完全相同的 64 位 SHA-256 `Global Input Signature`，现有路由 JSON 不变。

- [ ] **Step 1: 扩充失败测试**

  在 `tests/test_sp_lite.py` 中把非 ASCII 用例扩为中文、日文、韩文、Emoji、组合字符、空格和制表符，并增加文件创建顺序相反但签名相同的断言：

  ```python
  names = (
      "验证/最小原型.txt",
      "検証/試作.txt",
      "검증/원형.txt",
      "emoji/原型-🧪.txt",
      "unicode/e\u0301.txt",
      "spaces/a b.txt",
      "controls/a\tb.txt",
  )
  for index, name in enumerate(reversed(names)):
      path = project / name
      path.parent.mkdir(parents=True, exist_ok=True)
      path.write_text(f"payload-{index}\n", encoding="utf-8")
  assert _current_powershell_signature(project) == _current_signature(project)
  ```

- [ ] **Step 2: 验证 RED**

  Run: `.venv/bin/pytest -q tests/test_sp_lite.py::test_bash_and_powershell_lite_state_parity tests/test_sp_lite.py::test_bash_and_powershell_signatures_match_for_non_ascii_git_paths -vv`

  Expected: 在装有 PowerShell 的 Linux CI 上两个测试因签名不同失败；无 PowerShell 的本机明确 skip，而不是误报通过。

- [ ] **Step 3: 实现 Bash 规范化路径**

  在 `sp-lite-state.sh` 中增加只处理路径字节的 helper，并让 Git/文件系统分支都输出 `PATH<TAB>hex<TAB>digest<LF>`：

  ```bash
  path_to_hex() {
      LC_ALL=C od -An -v -tx1 | tr -d ' \n'
  }

  path_hex=$(printf '%s' "$relative" | path_to_hex)
  printf 'PATH\t%s\t%s\n' "$path_hex" "$digest" >> "$manifest"
  ```

  收集 `path_hex<TAB>relative<NUL>` 记录并按 `path_hex` 的 ASCII 字节序排序后再计算文件摘要；`HEAD<TAB><revision><LF>` 保持固定格式。

- [ ] **Step 4: 实现 PowerShell 对等规范化**

  在 `sp-lite-state.ps1` 中用严格 UTF-8 编码获得路径字节并转为小写十六进制，构造与 Bash 相同的清单行：

  ```powershell
  function Convert-PathToHex([string]$Path) {
      $bytes = [Text.UTF8Encoding]::new($false, $true).GetBytes($Path)
      return -join ($bytes | ForEach-Object { $_.ToString('x2') })
  }

  $entries = @($relativePaths | ForEach-Object {
      [pscustomobject]@{ Relative = $_; PathHex = Convert-PathToHex $_ }
  } | Sort-Object PathHex -CaseSensitive)
  $lines.Add("PATH`t$($entry.PathHex)`t$(Get-FileSha256 $path)")
  ```

- [ ] **Step 5: 验证 GREEN 和回归**

  Run: `.venv/bin/pytest -q tests/test_sp_lite.py -vv`

  Expected: 所有 SP Lite 测试通过；本机无 PowerShell 时 parity 用例明确 skipped。

  Run: `.venv/bin/pytest -q`

  Expected: `0 failed`。

- [ ] **Step 6: 多模型代码复审后提交**

  Claude 与 Gemini 分别检查未提交 diff，重点确认逐字节确定性、特殊文件名、V1 路由不变和 Windows 兼容性。修复所有 Critical/High finding，再提交：

  ```bash
  git add scripts/bash/sp-lite-state.sh scripts/powershell/sp-lite-state.ps1 tests/test_sp_lite.py docs/superpowers/plans/2026-07-18-sp-lite-change-impact-governance-implementation.md
  git commit -m "fix: make SP Lite signatures cross-platform deterministic"
  ```

### Task 2: 建立 V2 版本化快照和路径级 delta

**Files:**

- Create: `scripts/bash/sp-lite-impact.sh`
- Create: `scripts/powershell/sp-lite-impact.ps1`
- Modify: `tests/test_sp_lite.py`
- Modify: `templates/project/.specify/templates/feature/lite.md`

**Interfaces:**

- Consumes: Git 基线、当前工作树、版本化排除规则和 feature 级治理范围。
- Produces: `speckit.lite.snapshot.v2` 与 `speckit.lite.delta.v1`，包含 `added`、`modified`、`deleted`、`renamed`、`mode_changed`。

- [ ] **Step 1: 写快照确定性失败测试**

  覆盖 tracked/untracked/ignored、特殊路径、删除、重命名、mode change、非 Git 仓库、LF/BOM 和 Bash/PowerShell 对等；断言调试清单中的路径使用 Base64 或十六进制，不损失原始字节。

- [ ] **Step 2: 运行新测试确认因 V2 脚本和 schema 缺失而失败**

  Run: `.venv/bin/pytest -q tests/test_sp_lite.py -k 'snapshot_v2 or delta_v1' -vv`

  Expected: FAIL，错误指向缺失的 V2 入口或 `speckit.lite.snapshot.v2`。

- [ ] **Step 3: 实现二进制快照合同**

  固定字段顺序为算法版本、baseline type、baseline revision、entry count，以及每个路径、mode、digest 的大端 32 位长度前缀和值；输出 JSON 仅用于审计，签名直接基于二进制清单。

- [ ] **Step 4: 实现 delta 比较**

  以路径字节为 key 比较记录快照和当前快照；Git 可用时读取 rename/mode 信息，无法证明 rename 时保守输出 delete+add，不能漏掉变化。

- [ ] **Step 5: 运行聚焦和完整测试**

  Run: `.venv/bin/pytest -q tests/test_sp_lite.py -k 'snapshot_v2 or delta_v1' -vv`

  Expected: PASS。

### Task 3: 实现治理范围和规则驱动影响分类

**Files:**

- Modify: `scripts/bash/sp-lite-impact.sh`
- Modify: `scripts/powershell/sp-lite-impact.ps1`
- Modify: `tests/test_sp_lite.py`
- Modify: `templates/project/.specify/templates/feature/lite.md`

**Interfaces:**

- Consumes: `governance_sources`、`active_work_set`、`allowed_write_set`、`dependency_set`、`shared_contracts`、`protected_evidence`、`historical_regression_set`、`excluded_paths`。
- Produces: 每条 change 的 `matched_scopes`、`impact`、`reason`、`rule_id`，以及唯一 `blocker_route`。

- [ ] **Step 1: 写分类表失败测试**

  分别验证治理源、活动写集合、共享合同、受保护证据、历史回归和重叠写集合为 `BLOCKING`；相邻未知依赖和可比较 HEAD 变化为 `IMPACT_REVIEW_REQUIRED`；已证明无关为 `NOTICE`；排除路径为 `IGNORED`。

- [ ] **Step 2: 写范围不可静默缩小失败测试**

  删除任一已持久化共享合同或历史回归范围时，若没有条目级人工确认，断言分类器返回 `RECONCILE_REQUIRED`。

- [ ] **Step 3: 运行测试确认当前全仓单签名行为无法满足分级合同**

  Run: `.venv/bin/pytest -q tests/test_sp_lite.py -k 'impact_classification or governance_scope' -vv`

  Expected: FAIL，缺少分类字段或错误地把无关变化硬阻塞。

- [ ] **Step 4: 实现静态规则表和确定性优先级**

  使用可检查的规则 ID，不允许模型自由改写等级；优先级固定为 `BLOCKING > IMPACT_REVIEW_REQUIRED > NOTICE > IGNORED`，冲突、陈旧证据、历史回归分别映射到已有唯一 owner route。

- [ ] **Step 5: 验证分类和范围持久化**

  Run: `.venv/bin/pytest -q tests/test_sp_lite.py -k 'impact_classification or governance_scope' -vv`

  Expected: PASS。

### Task 4: 增加双读迁移、人工影响确认和 repair mode

**Files:**

- Modify: `scripts/bash/sp-lite-state.sh`
- Modify: `scripts/powershell/sp-lite-state.ps1`
- Modify: `templates/commands/lite.md`
- Modify: `templates/project/.specify/templates/feature/lite.md`
- Modify: `tests/test_sp_lite.py`
- Modify: `tests/test_sp_methodology_templates.py`

**Interfaces:**

- Consumes: V1 签名、V2 snapshot/delta/classification、人工决定和 repair dispatch evidence。
- Produces: `speckit.lite.global-control.v2`，新增 `IMPACT_REVIEW_REQUIRED`，并保证只有 `/sp.lite sync` 可以清除 blocker。

- [ ] **Step 1: 写 V1/V2 双读迁移失败测试**

  覆盖 V1 匹配且 V2 CLEAR、V1 不匹配、V2 BLOCKING、V2 REVIEW_REQUIRED 和已完成迁移五条路径；断言任何不确定情况都不能静默覆盖旧签名。

- [ ] **Step 2: 写精确变化签名确认失败测试**

  人工确认必须保存 `accepted_change_signature`、选择、理由、确认人和时间；修改任一文件使变化签名改变后，旧确认立即无效。

- [ ] **Step 3: 写 repair mode 权限失败测试**

  受限 owner 只能写入签名后的 Allowed Write Set 和 blocker evidence；直接改 `global_control.status` 或越权路径时返回 `RECONCILE_REQUIRED`，只有 `/sp.lite sync` 重算后可恢复 `CLEAR`。

- [ ] **Step 4: 实现双读、影响选择和 repair lease**

  `/sp.lite` 用普通语言列出变化、可能影响、覆盖风险和“继续/同步/协调/暂停”四类选择；每次只调度一个 owner，返回后重新读取持久化证据和当前签名。

- [ ] **Step 5: 运行 Lite 和命令合同测试**

  Run: `.venv/bin/pytest -q tests/test_sp_lite.py tests/test_sp_methodology_templates.py -vv`

  Expected: PASS。

### Task 5: 文档、发布和 V2 默认切换

**Files:**

- Modify: `docs/quickstart.md`
- Modify: `docs/quickstart.zh-CN.md`
- Modify: `docs/reference/speckit-command-usage.md`
- Modify: `docs/reference/speckit-command-usage.zh-CN.md`
- Modify: `CHANGELOG.md`
- Modify: `src/specify_cli/__init__.py`

**Interfaces:**

- Consumes: 通过迁移矩阵验证的 V2 实现和发布工作流。
- Produces: `v0.11.0` V1 确定性发布、后续 V2 迁移说明，以及验证完成后的 V2 默认启用版本。

- [ ] **Step 1: 发布 `v0.11.0`**

  在 Task 1 全量测试、双模型复审和 PR CI 全绿后合并 PR；按 `.github/workflows/RELEASE-PROCESS.md` 将版本置为 `0.11.0`、创建 tag/release，并把 `main` 推进到 `0.11.1.dev0`。

- [ ] **Step 2: 更新成对用户文档**

  英文和中文同时说明：全局变化不会一律阻塞、`IMPACT_REVIEW_REQUIRED` 的四类选择、确认只对当前变化签名有效、`/sp.lite sync` 的职责和旧项目迁移行为。

- [ ] **Step 3: 验证 V2 发布候选**

  Run: `.venv/bin/pytest -q`

  Expected: `0 failed`。

  Run: `npx --yes markdownlint-cli2 README.md README.zh-CN.md docs/quickstart.md docs/quickstart.zh-CN.md docs/reference/speckit-command-usage.md docs/reference/speckit-command-usage.zh-CN.md docs/superpowers/specs/2026-07-18-sp-lite-*.md docs/superpowers/plans/2026-07-18-sp-lite-*.md`

  Expected: `0 error(s)`。

- [ ] **Step 4: 双模型最终评审和默认切换**

  Claude 与 Gemini 都没有 Critical/High finding，Linux/macOS/Windows CI 全绿，且至少一个 V1 fixture 完成双读迁移后，才移除新项目的 V1 默认路径；历史证据继续保留 V1 审计字段。
