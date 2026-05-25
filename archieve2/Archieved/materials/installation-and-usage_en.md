# Installation & Usage Guide

This tutorial will guide you on how to install the OpenSpecs (Speckit Layered) framework and its corresponding Agent instruction set into your existing project, and run your first workflow.

## 1. System Requirements
*   **macOS / Linux**: Requires the `sh` runtime environment, typically built-in.
*   **Windows**: Requires PowerShell (`ps1`) and allowing script execution (`ExecutionPolicy Bypass`).

## 2. One-Click Installation Commands

To enable your AI Agent to recognize and execute `sp.*` workflows, we provide automated installation scripts.
During installation, you need to specify the primary AI Agent platform you use (`claude` or `codex`), and the installer will automatically adapt the command generation logic.

### Option A: Install for Claude Code (or Agents supporting Slash Commands)
This mode generates slash command documents in the format `/sp.*` within your project, allowing Agents like Claude to fetch and execute them as shortcuts.

**Mac/Linux:**
```bash
sh scripts/install.sh --ai claude ./your-project-path
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude .\your-project-path
```

### Option B: Install for Codex CLI (Skills Mode)
This mode not only generates framework assets in the project but also **defaults** to writing the `sp-*` skill pack directly to Codex's local Skills directory.
It automatically detects the environment variable `CODEX_HOME`. If not set, it defaults to `%USERPROFILE%\.codex\skills` (Windows) or `~/.codex/skills` (Mac/Linux).

**Mac/Linux:**
```bash
sh scripts/install.sh --ai codex ./your-project-path

# Remote one-command install
SP_INSTALL_AI=codex curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project-path
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\your-project-path

# Remote one-command install
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project-path"; $env:SP_INSTALL_AI="codex"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex
```

If you do not pass `--ai codex` or `SP_INSTALL_AI=codex`, the installer only writes the starter pack and does not install `sp-*` skills into Codex.

---

## 3. What Happens After Installation?

Upon successful installation, the following core directories will be generated in your target project's root:

*   `.specify/memory/`: This is the framework's **memory routing pool** (including `project-index.md`, etc.). AI will always read here first before working to acquire the current context.
*   `specs/`: This is where **specific business requirements** and process documents are stored.

## 4. Start Your First Workflow

Now, you can summon your AI Agent and begin true "Document-Driven Development."

Suppose you want to add a "Leave Approval" module to your project:

**If you use Claude Code:**
Summon Claude Code in the terminal and type:
```text
/sp.specify I want to develop a leave approval module, including employee application and manager approval features.
```

**If you use Codex:**
Summon Codex and type:
```text
/prompts:sp.specify I want to develop a leave approval module, including employee application and manager approval features.
```

### Expected AI Response:
The AI will **absolutely not** generate code for you immediately.
It will adhere to the framework's constraints, start reading `.specify/memory` to build context, and then create a new feature directory under `specs/` (e.g., `specs/leave-approval/`).
It will help you outline `spec.md` (the baseline requirement) and guide you to the next step (usually prompting you to execute `sp.clarify` to resolve any logical ambiguities it finds).

Follow the AI's guidance, step by step through `sp.clarify`, `sp.flow`, `sp.plan` to complete the business architecture, and *then* proceed to final coding!
