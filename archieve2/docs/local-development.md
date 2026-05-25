# Local Development Guide

This guide shows how to iterate on the OpenSpecs starter pack locally without changing the install
contract or drifting away from the current upstream-alignment target.

> The root installers now delegate to the local upstream-style CLI path (`specify init`). Treat the
> wrappers and `src/specify_cli/` as one install mechanism, not as competing systems.

## 1. Clone and Switch Branches

```bash
git clone https://github.com/flyfoxai/openSpecs.git
cd openSpecs
git checkout -b your-branch
```

## 2. Run the Active Maintenance Surface Directly

The fastest feedback loop is to run the root installers, which in turn invoke the local
`specify init` path:

```bash
sh -n scripts/install.sh
sh scripts/install.sh --help
sh scripts/install.sh --yes --ai codex /tmp/sp-project
sh scripts/install.sh --yes --ai claude /tmp/sp-project-claude
sh scripts/install.sh --yes --ai copilot /tmp/sp-project-copilot
```

If PowerShell is available:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex .\tmp-project
```

## 3. Edit the Real Maintenance Surface

The highest-value local edit targets are:

- `templates/commands/`
- `templates/project/`
- `scripts/install.sh`
- `scripts/install.ps1`
- `docs/`

Avoid treating archived legacy assets as the active source of truth.

## 4. Verify Installed Outputs

After each meaningful change, inspect the produced outputs:

- Codex install writes `.agents/skills/sp-*/SKILL.md`
- Claude install writes `.claude/skills/sp-*/SKILL.md`
- Copilot install writes `.github/agents/sp.*.agent.md` and `.github/prompts/sp.*.prompt.md`
- `.specify/integrations/sp.manifest.json` reflects the shared project outputs

## 5. Compare Against Upstream When Mechanism Work Is In Scope

If your change touches command shells, scripts, or layout, compare against the upstream snapshot
rather than against memory alone:

```bash
git diff --stat
```

Use the local reference docs when deciding whether a remaining difference is intentional:

- `docs/reference/sp-upstream-mechanism-alignment.md`
- `docs/reference/upstream-sp-file-mapping.md`

## 6. Test the Docs Shell When Needed

If a change touches docs structure or DocFX config:

```bash
cd docs
docfx docfx.json --serve
```

## 7. Testing Script Permission and Install Logic

After meaningful installer changes, confirm the intended outputs rather than relying on prompt
wording alone:

- syntax-check `scripts/install.sh`
- verify `--help`
- run both Codex and Claude smoke installs
- inspect `.agents/skills`, `.claude/skills`, `.github/agents`, `.github/prompts`, and `.specify/integrations/*.manifest.json`

## 8. Rapid Verification Summary

| Action | Command |
|--------|---------|
| Shell syntax check | `sh -n scripts/install.sh` |
| Installer help | `sh scripts/install.sh --help` |
| Codex smoke install | `sh scripts/install.sh --yes --ai codex /tmp/sp-project` |
| Claude smoke install | `sh scripts/install.sh --yes --ai claude /tmp/sp-project-claude` |
| Copilot smoke install | `sh scripts/install.sh --yes --ai copilot /tmp/sp-project-copilot` |
| Scope check | `git diff --stat` |

## 9. Important Constraints

- root installers remain the supported entrypoint, but they now delegate to the upstream-style Python CLI path
- project templates still live under `templates/project/`
- detailed design references live under `docs/reference/`
- mechanism alignment should prefer upstream shell reuse over new local abstractions

## 10. Common Issues

| Symptom | Fix |
|---------|-----|
| Codex skills do not appear | Check `.agents/skills`, then reload the host workspace |
| Claude skills still show old content | Re-run install with `--yes --ai claude` |
| Copilot prompts are missing | Check `.github/agents` and `.github/prompts`, then reload VS Code |
| Mapping docs seem stale | Recompute against `/tmp/spec-kit-upstream` before editing references |

## 11. Next Steps

- Re-run the smoke installs after each shell or command-template change
- Keep docs, installers, and command templates in sync
- Record intentional remaining differences in the reference mapping docs
