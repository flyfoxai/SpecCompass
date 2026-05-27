# `sp` Installation and Agent Compatibility

## 1. Purpose

This document explains how the current `sp` template is expected to be installed and how it maps onto different agent hosts.

The main rule is simple:

- keep the installation mechanism as close to upstream `Spec Kit` as practical
- keep the visible workflow content in the `sp` namespace

## 2. Baseline Installation Shape

The current project is aligned to the upstream `specify` initialization model, not to a custom one-off pack installer.

That means the normal entry point is still:

- install or invoke `specify`
- run `specify init`
- choose the target agent integration
- let the integration write host-specific command or skill files into the target project

Typical forms:

```bash
uv tool install specify-cli --from git+https://github.com/flyfoxai/openSpecs.git
specify init . --integration <agent>
specify check
```

Or one-shot:

```bash
uvx --from git+https://github.com/flyfoxai/openSpecs.git specify init . --integration <agent>
```

On non-empty directories, upstream-style `--force` behavior still matters:

```bash
specify init . --force --integration <agent>
```

## 3. Shell Selection

The project still follows upstream platform shell conventions:

- `sh` on macOS and Linux
- `ps` on Windows

The command templates keep `scripts:` frontmatter for both variants so the host can resolve the correct platform path.

## 4. User-Facing Trigger Form

The user-facing workflow is always the same `sp` step set.

Use the canonical `/sp.*` form in user instructions and model-facing next steps:

- `/sp.specify`
- `/sp.plan`
- `/sp.analyze`

### 4.1 Internal Skill Directories

Some hosts install local skill-like directories such as:

- `.agents/skills/sp.specify/SKILL.md`
- `.codex/skills/sp.specify/SKILL.md`
- `.claude/skills/sp.specify/SKILL.md`

Those dotted skill names intentionally match the user-facing `/sp.*` command form. Treat legacy `sp-*` core skill names as stale installation residue.

## 5. Project-Local Integration Files

The current mechanism favors project-local integration assets over old global prompt mirrors.

That means:

- the generated project should carry the integration files it needs
- the active agent should read from the project-local installed commands or skills
- success should not depend on separately maintaining a global `sp` prompt pack

This matters because project-local assets are easier to version, inspect, and refresh together with the template.

## 6. What "Compatible With Upstream" Means Here

Compatibility does not mean every `sp` command must behave identically to upstream `speckit.*`.

It means the outer installation and integration mechanism stays close in form:

- same general repo layout
- same template-driven install path
- same integration registry model
- same shell-script dispatch pattern
- same host-specific rendering idea

Within that bottle, `sp` is allowed to carry richer documentation logic.

Examples of allowed content differences:

- added layered steps
- stronger memory routing rules
- analysis that writes `analysis.md`
- expanded documentation outputs

## 7. Supported Agent Principle

The fork should follow the current upstream integration matrix as the baseline.

In practice, that means:

- do not invent an unrelated agent ID system
- reuse the upstream integration model where possible
- let each integration render the same `sp` intent into the host format it expects

If upstream adds or changes integrations, the fork should prefer following that structure rather than maintaining a separate parallel mechanism.

## 8. What Must Work After Install

A successful install is not just "files were copied somewhere."

At minimum, the installed project should be able to do the following:

- open the project in the chosen host
- discover the installed `sp` commands or skills
- run `/sp.specify`, `/sp.plan`, `/sp.analyze`, and the rest of the active path
- resolve the platform script hooks from the project root
- keep `.specify/`, `templates/`, `scripts/`, and `specs/` in a coherent state

If the host cannot trigger the command, or the command cannot resolve its project-local scripts and routing files, the installation is not functionally complete.

## 9. Global Skills vs Project Mechanism

The intended mechanism should not require unrelated global skills to make `sp` work.

Global skills may still exist in the user environment, but the project should not depend on them for normal `sp` execution.

The correct model is:

- project-local installation provides the working `sp` entry points
- host-global assets are optional background environment, not the runtime dependency chain

## 10. Recommended Verification After Install

After installation, the practical checks are:

1. run `specify check`
2. confirm the target project contains the expected `.specify/`, `templates/`, and integration outputs
3. open the chosen host in the target project
4. trigger a real `sp` command such as `sp.specify` or `sp.analyze`
5. confirm the command resolves routing and scripts from the project root

This is the level that proves the mechanism is actually usable, not just structurally similar.

## 11. Refresh and Upgrade Expectations

Because the mechanism is project-local and template-driven, upgrades should be handled by re-running the upstream-shaped initialization path rather than by manual file surgery.

Typical expectation:

```bash
specify init --here --force --integration <agent>
```

Feature outputs under `specs/` should be protected as user work, while managed template and integration assets can be refreshed.

## 12. Why This Reference Exists

This file exists so the template overview docs can link to one clear explanation of:

- how `sp` is supposed to be installed
- what "same mechanism as upstream" means in practice
- what counts as a real post-install success condition
