# 安装与使用教程

本教程将引导你如何将 OpenSpecs (Speckit Layered) 框架以及对应的 Agent 指令集安装到你现有的项目中，并跑通第一个工作流。

## 1. 系统要求
*   **macOS / Linux**: 支持 `sh` 运行环境，通常系统自带。
*   **Windows**: 支持 PowerShell (`ps1`)，需要允许脚本执行 (`ExecutionPolicy Bypass`)。

## 2. 一键安装命令

为了使 AI Agent 能够识别并执行 `sp.*` 工作流，我们提供了自动化的安装脚本。
安装时，你需要指定你主要使用的 AI Agent 平台（`claude` 或 `codex`），安装器会自动适配不同的命令生成逻辑。

### 方案 A：为 Claude Code (或支持 Slash Command 的 Agent) 安装
该模式会在你的项目中生成支持 `/sp.*` 格式的斜杠命令文档，供 Claude 等 Agent 抓取并作为快捷指令执行。

**Mac/Linux:**
```bash
sh scripts/install.sh --ai claude ./your-project-path
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude .\your-project-path
```

### 方案 B：为 Codex CLI 安装 (Skills 模式)
该模式不仅会在项目中生成框架资产，还会**默认**将 `sp-*` 技能包直接写入 Codex 的本地 Skills 目录。
它会自动检测环境变量 `CODEX_HOME`，如果未设置，将默认写入 `%USERPROFILE%\.codex\skills` (Windows) 或 `~/.codex/skills` (Mac/Linux)。

**Mac/Linux:**
```bash
sh scripts/install.sh --ai codex ./your-project-path

# 远程一条命令
SP_INSTALL_AI=codex curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project-path
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\your-project-path

# 远程一条命令
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project-path"; $env:SP_INSTALL_AI="codex"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex
```

如果你不传 `--ai codex` 或 `SP_INSTALL_AI=codex`，安装器只会安装 starter pack，不会把 `sp-*` skills 写入 Codex。

---

## 3. 安装后发生了什么？

安装成功后，你的目标项目根目录下会生成以下核心目录：

*   `.specify/memory/`：这是框架的**记忆路由池**（包含 `project-index.md` 等），AI 每次工作前都会先读取这里，获取当前的上下文。
*   `specs/`：这是存放**具体业务需求**和过程文档的地方。

## 4. 启动你的第一个工作流

现在，你可以唤起你的 AI Agent，开始真正的“文档驱动开发”了。

假设你想给项目添加一个“请假审批”模块：

**如果你使用 Claude Code：**
在终端唤起 Claude Code，输入：
```text
/sp.specify 我想开发一个请假审批模块，包含员工申请和主管审批功能。
```

**如果你使用 Codex：**
在终端唤起 Codex，输入：
```text
/prompts:sp.specify 我想开发一个请假审批模块，包含员工申请和主管审批功能。
```

### AI 的响应预期：
AI **绝对不会**立刻给你生成代码。
它会遵守框架的约束，开始读取 `.specify/memory` 建立上下文，然后在 `specs/` 目录下创建一个新的特性目录（比如 `specs/leave-approval/`）。
它会帮你梳理出 `spec.md` (需求基线)，然后引导你进入下一步骤（通常是提示你执行 `sp.clarify` 来消除它发现的逻辑歧义）。

跟随 AI 的指引，一步步通过 `sp.clarify`, `sp.flow`, `sp.plan` 补齐业务架构，再进入最终的代码编写吧！
