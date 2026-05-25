# OpenSpecs (Speckit Layered)

`sp` (OpenSpecs) is a **Document-Stage Framework** adapted from `Spec Kit`.

Upstream repository: [github/spec-kit](https://github.com/github/spec-kit)

Its goal is not to let Large Language Models (LLMs) jump directly from a "one-line requirement" to "generating code." Instead, it forces the AI to establish a queryable, traceback-enabled "document skeleton" covering requirements, business flows, UI, and delivery design through standardized steps *before* writing any code. 
This effectively prevents LLMs from experiencing "architecture collapse" and "hallucination loops" in complex projects.

> **Note:** Currently, the framework primarily covers the "documentation phase." The workflow ends at `sp.analyze` and does not yet include automated implementation (`sp.implement`).

---

## 🎯 Core Mechanisms: What Problems Does It Solve?

AI-assisted programming usually faces three major pain points:
1. **Ambiguity Traps**: Unclarified routing, boundary, and data decisions between requirements and implementation cause models to guess blindly.
2. **Memory Fragmentation**: LLMs have limited context windows and no long-term memory, leading to repeated reasoning and logical inconsistencies.
3. **Context Explosion**: As a project grows (dozens of tables and APIs), reading the entire codebase leads to token explosion and attention drift.

**OpenSpecs' Solution:**

### 1. Two-Layer Document Workflow
*   **Layer 1: Business & Analysis**
    *   Defines "what to do," "why," and "business mainlines and boundaries."
    *   Includes: `sp.specify` -> `sp.clarify` -> `sp.flow` -> `sp.ui` -> `sp.gate` -> `sp.bundle`
*   **Layer 2: Delivery & Design**
    *   Defines "how to implement," "mapping use cases to data tables," and "how to breakdown tasks."
    *   Includes: `sp.plan` -> `sp.tasks` -> `sp.analyze`

### 2. Unified Clarification & Propagation Loop
*   **`sp.clarify`**: The single entry point for clarification throughout the workflow. Models must ask questions using single/multiple-choice formats to reduce vague answers.
*   **Forced Sync Loop**: Once a clarification conclusion changes, all associated documents and memory layers must be synchronized according to the `Required Sync Files`, otherwise they are marked as Stale.

### 3. Query-First Context Memory
Breaks the "full read" habit by establishing strict context indexing:
*   **Project-level routing**: `.specify/memory/*`
*   **Feature-level routing**: `specs/<feature>/memory/*`
*   When a model intervenes, it must **first read the index -> find the current Feature -> extract the "Minimum Read Set" of the current Workset**, drastically reducing useless token consumption.

### 4. Localized Workset
At the `sp.plan` stage, massive systems are forced into multiple localized `ws-*.md` (Worksets). Each time the model works, it only carries the context of the current closed-loop area (e.g., an approval chain, a group of highly correlated data tables).

### 5. Decoupling Step Semantics from Platform Triggers (Agent Agnostic)
No matter which AI platform you use, the underlying engineering standard is always `sp.*`:
*   **Claude Code, etc. (Slash Command)** trigger format: `/sp.specify`
*   **Codex Desktop (Prompts)** trigger format: `/prompts:sp.specify`

---

## 🚀 Install to Your Project

We provide an automated installation script (Starter Pack) so you can quickly inject this mechanism into existing business codebases.

### macOS / Linux Local Install
```bash
# Default installation
sh scripts/install.sh ./your-project

# Install for Codex (Installs `/prompts:sp.*`)
sh scripts/install.sh --ai codex ./your-project

# Install for Claude (Auto-generates /sp.* commands)
sh scripts/install.sh --ai claude ./your-project
```

### Windows Local Install (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 .\your-project

# Install for Codex
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\your-project
```

### Remote One-Line Install (No clone required)
**Mac/Linux:**
```bash
# Starter pack only
curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project

# Starter pack + Codex integration
SP_INSTALL_AI=codex curl -fsSL https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.sh | sh -s -- --archive-url https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.tar.gz ./your-project
```
**Windows:**
```powershell
# Starter pack only
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex

# Starter pack + Codex integration
$env:SP_INSTALL_ARCHIVE_URL="https://github.com/flyfoxai/openSpecs/archive/refs/heads/main.zip"; $env:SP_INSTALL_TARGET_DIR="C:\path\to\your-project"; $env:SP_INSTALL_AI="codex"; irm https://raw.githubusercontent.com/flyfoxai/openSpecs/main/scripts/install.ps1 | iex
```

> *Note: Default install only writes the starter pack. Only in Codex mode (`--ai codex` or `SP_INSTALL_AI=codex`) will the installer resolve `CODEX_HOME`, write `/prompts:sp.*` into `.codex/prompts`, mirror them into `.codex/commands`, and clean any legacy `sp-*` skills if they still exist.*

---

## 📦 Suitable Scenarios

*   **Highly Recommended**: Medium to large business projects with complex requirements, multiple workflows, numerous interfaces, and data tables, anticipating future "AI automated pipelines."
*   **Not Recommended**: Simple, one-off toy demos with minimal rules.

## 📖 Detailed Documentation Guide

Want to learn more about the details behind this mechanism? Please refer to the following advanced documents:

*   **Chinese Detailed Guide**: [READMEDETAILS.md](READMEDETAILS.md)
*   **English Detailed Guide**: [READMEDETAILS.en.md](READMEDETAILS.en.md)
*   **Installation Strategy & Design Rationale**: [reference/sp-agent-install-strategy.md](reference/sp-agent-install-strategy.md)
