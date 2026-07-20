# Upgrade Guide

> You have SpecCompass installed and want to upgrade to the latest version to get new features, bug fixes, or updated agent commands and skills. This guide covers both upgrading the CLI tool and updating your project files.

---

## Quick Reference

| What to Upgrade | Command | When to Use |
|----------------|---------|-------------|
| **CLI Tool Only** | `uv tool install specify-cli --force --from git+https://github.com/flyfoxai/SpecCompass.git@vX.Y.Z` | Get latest CLI features without touching project files |
| **Project Files** | `specify init --here --force --integration <your-agent>` | Update agent commands or skills, templates, and scripts in your project |
| **Both** | Run CLI upgrade, then project update | Recommended for major version updates |

---

## Part 1: Upgrade the CLI Tool

The CLI tool (`specify`) is separate from your project files. Upgrade it to get the latest features and bug fixes.

### If you installed with `uv tool install`

Upgrade to a specific SP fork release when releases are available:

```bash
uv tool install specify-cli --force --from git+https://github.com/flyfoxai/SpecCompass.git@vX.Y.Z
```

### If you use one-shot `uvx` commands

Specify the desired release tag:

```bash
uvx --from git+https://github.com/flyfoxai/SpecCompass.git@vX.Y.Z specify init --here --integration codex
```

### Verify the upgrade

```bash
specify check
```

This shows installed tools and confirms the CLI is working.

---

## Part 2: Updating Project Files

When SpecCompass releases new features (like new agent commands, skills, or updated templates), you need to refresh your project's SpecCompass files.

### Regenerating active PRD Outline Discovery files

Outline Discovery schema v3 adds source-backed business context and read-only Constitution context. Existing v1/v2 Discovery responses and intent ledgers are deliberately not rewritten or accepted as v3 because they do not contain the new evidence fields.

Before continuing an active `/sp.prd` session after upgrading:

1. Archive the existing `specs/<feature>/prd/review/outline-discovery-*.json` files and `specs/<feature>/prd/review/outline-intent-ledger.json` so the prior decisions remain auditable.
2. Refresh the installed project templates with the command below.
3. Run `/sp.prd` again to regenerate schema v3 Discovery data, then re-confirm the relevant choices.

Do not change only the `schema_version` number in an old file. That would label incomplete v1/v2 data as v3 without adding the required business evidence.

### source_capability_coverage field (v0.11.4+)

Starting from v0.11.4, `outline-discovery-data.json` requires a
`source_capability_coverage` array in `business_context`. Previously generated
files will fail the updated validator.

To update: archive the existing `specs/<feature>/prd/review/outline-discovery-*.json`
files and re-run `/sp.prd` to regenerate with the new field.

This is a breaking schema change — the validator rejects files that are missing
`source_capability_coverage` or that have density-merge boilerplate in visible copy.

### What gets updated?

Running `specify init --here --force` will update:

- ✅ **Agent command or skill files** (`.claude/commands/`, `.github/prompts/`, `.agents/skills/`, etc.)
- ✅ **Script files** (`.specify/scripts/`)
- ✅ **Template files** (`.specify/templates/`)
- ✅ **Shared memory files** (`.specify/memory/`) - **⚠️ See warnings below**

### What stays safe?

These files are **never touched** by the upgrade—the template packages don't even contain them:

- ✅ **Your specifications** (`specs/001-my-feature/spec.md`, etc.) - **CONFIRMED SAFE**
- ✅ **Your implementation plans** (`specs/001-my-feature/plan.md`, `tasks.md`, etc.) - **CONFIRMED SAFE**
- ✅ **Your source code** - **CONFIRMED SAFE**
- ✅ **Your git history** - **CONFIRMED SAFE**

The `specs/` directory is completely excluded from template packages and will never be modified during upgrades.

### Migrating existing projects to code-continuation packets

Projects created before the code-continuation rules do **not** need to be rebuilt. Keep existing `specs/`, source code, tests, and git history as they are. After upgrading the CLI and refreshing project files, apply the new fields only to future code-stage work where they matter.

Use the normal project refresh command:

```bash
specify init --here --force --integration <your-agent>
```

Then update active implementation tasks when they are high-risk or continue existing code. A `Mode: impl` task packet should include:

- `Read Set`: the smallest memory, source-doc, code, and test files to read before editing
- `Dependencies Checked`: direct dependencies, routes, contracts, schemas, permissions, tests, or workset neighbors to check
- `Reverse Trace Checked`: reference/search evidence before delete, move, rename, public behavior, schema, permission, route, event, or acceptance changes
- `Expected Delta`: the intended behavior, contract, data, test, or internal change
- `Delta Summary`: the closeout note with files changed, anchors affected, checks run, remaining gaps, and evidence
- `Proposed Updates`: shared-memory, trace, task-state, source-doc, or open-item updates proposed for coordinator closeout

For low-risk local tasks, do not add boilerplate. Use an explicit reason instead, for example:

```text
N/A - low-risk local task; no delete/move/rename, public behavior, schema, permission, route, event, acceptance, or shared-registry change.
```

If fields are missing or empty, do not treat the task as ready by default:

- Recoverable task-packet gap: route to `/sp.tasks`.
- Missing code boundary, write set, dependency surface, or implementation readiness: route to `/sp.plan`.
- Missing human product, risk, compliance, rollback, split, or scope choice: route to `/sp.clarify` or return `NEEDS_DECISION`.
- Missing implementation context that cannot be recovered from routed files: return `NEEDS_CONTEXT` from the task or implementation layer.

### Update command

Run this inside your project directory:

```bash
specify init --here --force --integration <your-agent>
```

Replace `<your-agent>` with your AI coding agent. Refer to this list of [Supported AI Coding Agent Integrations](reference/integrations.md)

**Example:**

```bash
specify init --here --force --integration codex
```

### Understanding the `--force` flag

Without `--force`, the CLI warns you and asks for confirmation:

```text
Warning: Current directory is not empty (25 items)
Template files will be merged with existing content and may overwrite existing files
Proceed? [y/N]
```

With `--force`, it skips the confirmation and proceeds immediately.

**Important: Your `specs/` directory is always safe.** The `--force` flag only affects template files (commands, scripts, templates, memory). Your feature specifications, plans, and tasks in `specs/` are never included in upgrade packages and cannot be overwritten.

---

## ⚠️ Important Warnings

### 1. Constitution file will be overwritten

**Known issue:** `specify init --here --force` currently overwrites `.specify/memory/constitution.md` with the default template, erasing any customizations you made.

**Workaround:**

```bash
# 1. Back up your constitution before upgrading
cp .specify/memory/constitution.md .specify/memory/constitution-backup.md

# 2. Run the upgrade
specify init --here --force --integration codex

# 3. Restore your customized constitution
mv .specify/memory/constitution-backup.md .specify/memory/constitution.md
```

Or use git to restore it:

```bash
# After upgrade, restore from git history
git restore .specify/memory/constitution.md
```

### 2. Custom template modifications

If you customized any templates in `.specify/templates/`, the upgrade will overwrite them. Back them up first:

```bash
# Back up custom templates
cp -r .specify/templates .specify/templates-backup

# After upgrade, merge your changes back manually
```

### 3. Duplicate slash commands (IDE-based agents)

Some IDE-based agents (like Kilo Code, Windsurf) may show **duplicate slash commands** after upgrading—both old and new versions appear.

**Solution:** Manually delete the old command files from your agent's folder.

**Example for Kilo Code:**

```bash
# Navigate to the agent's commands folder
cd .kilocode/rules/

# List files and identify duplicates
ls -la

# Delete old versions (example filenames - yours may differ)
rm sp.specify-old.md
rm sp.plan-v1.md
```

Restart your IDE to refresh the command list.

---

## Common Scenarios

### Scenario 1: "I just want new commands or skills"

```bash
# Upgrade CLI (if using persistent install)
uv tool install specify-cli --force --from git+https://github.com/flyfoxai/SpecCompass.git

# Update project files to get new commands
specify init --here --force --integration codex

# Restore your constitution if customized
git restore .specify/memory/constitution.md
```

### Scenario 2: "I customized templates and constitution"

```bash
# 1. Back up customizations
cp .specify/memory/constitution.md /tmp/constitution-backup.md
cp -r .specify/templates /tmp/templates-backup

# 2. Upgrade CLI
uv tool install specify-cli --force --from git+https://github.com/flyfoxai/SpecCompass.git

# 3. Update project
specify init --here --force --integration codex

# 4. Restore customizations
mv /tmp/constitution-backup.md .specify/memory/constitution.md
# Manually merge template changes if needed
```

### Scenario 3: "I see duplicate slash commands in my IDE"

This happens with IDE-based agents (Kilo Code, Windsurf, Roo Code, etc.).

```bash
# Find the agent folder (example: .kilocode/rules/)
cd .kilocode/rules/

# List all files
ls -la

# Delete old command files
rm speckit.old-command-name.md

# Restart your IDE
```

### Scenario 4: "I'm working on a project without Git"

If you initialized your project with `--no-git`, you can still upgrade:

```bash
# Manually back up files you customized
cp .specify/memory/constitution.md /tmp/constitution-backup.md

# Run upgrade
specify init --here --force --integration codex --no-git

# Restore customizations
mv /tmp/constitution-backup.md .specify/memory/constitution.md
```

The `--no-git` flag skips git initialization but doesn't affect file updates.

---

## Using `--no-git` Flag

The `--no-git` flag tells SpecCompass to **skip git repository initialization**. This is useful when:

- You manage version control differently (Mercurial, SVN, etc.)
- Your project is part of a larger monorepo with existing git setup
- You're experimenting and don't want version control yet

**During initial setup:**

```bash
specify init my-project --integration codex --no-git
```

**During upgrade:**

```bash
specify init --here --force --integration codex --no-git
```

### What `--no-git` does NOT do

❌ Does NOT prevent file updates
❌ Does NOT skip slash command installation
❌ Does NOT affect template merging

It **only** skips running `git init` and creating the initial commit.

### Working without Git

If you use `--no-git`, you'll need to manage feature directories manually:

**Set the `SPECIFY_FEATURE` environment variable** before using planning commands:

```bash
# Bash/Zsh
export SPECIFY_FEATURE="001-my-feature"

# PowerShell
$env:SPECIFY_FEATURE = "001-my-feature"
```

This tells SpecCompass which feature directory to use when creating specs, plans, and tasks.

**Why this matters:** Without git, SpecCompass can't detect your current branch name to determine the active feature. The environment variable provides that context manually.

---

## Troubleshooting

### "Slash commands not showing up after upgrade"

**Cause:** Agent didn't reload the command files.

**Fix:**

1. **Restart your IDE/editor** completely (not just reload window)
2. **For CLI-based agents**, verify files exist:

   ```bash
   ls -la .claude/commands/      # Claude Code
   ls -la .gemini/commands/      # Gemini
   ls -la .cursor/skills/      # Cursor
   ls -la .pi/prompts/           # Pi Coding Agent
   ```

3. **Check agent-specific setup:**
   - Codex requires `CODEX_HOME` environment variable
   - Some agents need workspace restart or cache clearing

### "I lost my constitution customizations"

**Fix:** Restore from git or backup:

```bash
# If you committed before upgrading
git restore .specify/memory/constitution.md

# If you backed up manually
cp /tmp/constitution-backup.md .specify/memory/constitution.md
```

**Prevention:** Always commit or back up `constitution.md` before upgrading.

### "Warning: Current directory is not empty"

**Full warning message:**

```text
Warning: Current directory is not empty (25 items)
Template files will be merged with existing content and may overwrite existing files
Do you want to continue? [y/N]
```

**What this means:**

This warning appears when you run `specify init --here` (or `specify init .`) in a directory that already has files. It's telling you:

1. **The directory has existing content** - In the example, 25 files/folders
2. **Files will be merged** - New template files will be added alongside your existing files
3. **Some files may be overwritten** - If you already have SpecCompass files (`.claude/`, `.specify/`, etc.), they'll be replaced with the new versions

**What gets overwritten:**

Only SpecCompass infrastructure files:

- Agent command files (`.claude/commands/`, `.github/prompts/`, etc.)
- Scripts in `.specify/scripts/`
- Templates in `.specify/templates/`
- Memory files in `.specify/memory/` (including constitution)

**What stays untouched:**

- Your `specs/` directory (specifications, plans, tasks)
- Your source code files
- Your `.git/` directory and git history
- Any other files not part of SpecCompass templates

**How to respond:**

- **Type `y` and press Enter** - Proceed with the merge (recommended if upgrading)
- **Type `n` and press Enter** - Cancel the operation
- **Use `--force` flag** - Skip this confirmation entirely:

  ```bash
  specify init --here --force --integration codex
  ```

**When you see this warning:**

- ✅ **Expected** when upgrading an existing SpecCompass project
- ✅ **Expected** when adding SpecCompass to an existing codebase
- ⚠️ **Unexpected** if you thought you were creating a new project in an empty directory

**Prevention tip:** Before upgrading, commit or back up your `.specify/memory/constitution.md` if you customized it.

### "CLI upgrade doesn't seem to work"

Verify the installation:

```bash
# Check installed tools
uv tool list

# Should show specify-cli

# Verify path
which specify

# Should point to the uv tool installation directory
```

If not found, reinstall:

```bash
uv tool uninstall specify-cli
uv tool install specify-cli --from git+https://github.com/flyfoxai/SpecCompass.git
```

### "Do I need to run specify every time I open my project?"

**Short answer:** No, you only run `specify init` once per project (or when upgrading).

**Explanation:**

The `specify` CLI tool is used for:

- **Initial setup:** `specify init` to bootstrap SpecCompass in your project
- **Upgrades:** `specify init --here --force` to update templates and commands
- **Diagnostics:** `specify check` to verify tool installation

Once you've run `specify init`, the SP commands or skills are **permanently installed** in your project's agent folder (`.claude/`, `.github/prompts/`, `.pi/prompts/`, `.agents/skills/`, etc.). Slash-command hosts use entries like `/sp.specify` and `/sp.plan`; Codex uses skills such as `$sp-specify` and `$sp-plan` through `$`, `/skills`, or matching natural-language requests. Your AI coding agent reads these files directly—no need to run `specify` again.

**If your agent isn't recognizing SP commands or skills:**

1. **Verify command files exist:**

   ```bash
   # For GitHub Copilot
   ls -la .github/prompts/

   # For Claude
   ls -la .claude/commands/

   # For Pi
   ls -la .pi/prompts/

   # For Codex
   ls -la .agents/skills/
   ```

2. **Restart your IDE/editor completely** (not just reload window)

3. **Check you're in the correct directory** where you ran `specify init`

4. **For Codex**, do not use `/sp.*` slash-menu visibility as the success check. Type `$sp-*` or run `/skills` and select the matching `sp-*` skill; natural-language requests may also invoke a matching skill, but explicit invocation is the deterministic check.

5. **For some agents**, you may need to reload the workspace or clear cache

**Related issue:** If Copilot can't open local files or uses PowerShell commands unexpectedly, this is typically an IDE context issue, not related to `specify`. Try:

- Restarting VS Code
- Checking file permissions
- Ensuring the workspace folder is properly opened

---

## Version Compatibility

SpecCompass follows semantic versioning for major releases. The CLI and project files are designed to be compatible within the same major version.

**Best practice:** Keep both CLI and project files in sync by upgrading both together during major version changes.

---

## Next Steps

After upgrading:

- **Test new commands or skills:** Run `/sp.constitution` on slash-command hosts, or `$sp-constitution` in Codex, to verify everything works
- **Review release notes:** Check the fork release notes for SP changes, and compare upstream [github/spec-kit](https://github.com/github/spec-kit) when rebasing to a newer upstream baseline
- **Update workflows:** If new commands were added, update your team's development workflows
- **Check documentation:** Visit [github.io/spec-kit](https://github.github.io/spec-kit/) for updated guides
