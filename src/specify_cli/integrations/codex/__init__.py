"""Codex CLI integration — upstream-style skills-based agent.

Codex installs executable skill packages under
``.agents/skills/<skill-name>/SKILL.md``. Current Codex releases use skills as
the stable entry point; project-local prompt/plugin command surfaces are not
installed because custom slash commands and custom prompts are deprecated.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path
from typing import Any

from specify_cli.command_names import (
    CORE_COMMAND_STEMS,
    skill_directory_variants,
)

from ..base import IntegrationOption, SkillsIntegration
from ..manifest import IntegrationManifest

# Note injected into hook sections so Codex maps dot-notation hook names from
# extension metadata to the hyphenated skill directories it uses internally.
_HOOK_COMMAND_NOTE = (
    "- Codex uses skills as the stable entry point. Resolve core SP commands "
    "through the `sp-<name>` skill directory, for example `sp.plan` -> "
    "`sp-plan`. For extension hooks, replace dots (`.`) with hyphens (`-`) "
    "when resolving the skill directory, for example `speckit.git.commit` -> "
    "`speckit-git-commit`.\n"
)


class CodexIntegration(SkillsIntegration):
    """Integration for OpenAI Codex CLI."""

    key = "codex"
    config = {
        "name": "Codex CLI",
        "folder": ".agents/",
        "commands_subdir": "skills",
        "install_url": "https://github.com/openai/codex",
        "requires_cli": True,
    }
    registrar_config = {
        "dir": ".agents/skills",
        "format": "markdown",
        "args": "$ARGUMENTS",
        "extension": "/SKILL.md",
    }
    context_file = "AGENTS.md"
    multi_install_safe = True

    def build_exec_args(
        self,
        prompt: str,
        *,
        model: str | None = None,
        output_json: bool = True,
    ) -> list[str] | None:
        # Codex uses ``codex exec "prompt"`` for non-interactive mode.
        args: list[str] = ["codex", "exec", prompt]
        if model:
            args.extend(["--model", model])
        if output_json:
            args.append("--json")
        return args

    @classmethod
    def options(cls) -> list[IntegrationOption]:
        return [
            IntegrationOption(
                "--skills",
                is_flag=True,
                default=True,
                help="Install as agent skills (default for Codex)",
            ),
        ]

    @staticmethod
    def _inject_hook_command_note(content: str) -> str:
        """Insert a Codex skill naming note before hook output instructions."""
        if "Codex uses skills as the stable entry point" in content:
            return content

        def repl(m: re.Match[str]) -> str:
            indent = m.group(1)
            instruction = m.group(2)
            eol = m.group(3) or "\n"
            return (
                indent
                + _HOOK_COMMAND_NOTE.rstrip("\n")
                + eol
                + indent
                + instruction
                + eol
            )

        return re.sub(
            r"(?m)^(\s*)(- For each executable hook, output the following[^\r\n]*)(\r\n|\n|$)",
            repl,
            content,
        )

    def post_process_skill_content(self, content: str) -> str:
        """Inject Codex-specific hook naming guidance."""
        return self._inject_hook_command_note(content)

    @staticmethod
    def _remove_obsolete_project_local_codex_surfaces(project_root: Path) -> None:
        """Remove old project-local Codex command surfaces.

        Current Codex support keeps executable skills in `.agents/skills`.
        Older experiments also wrote `.codex/commands`, `.codex/prompts`,
        `.codex/skills`, and project-local plugin files; leaving those files can
        expose stale or duplicate command names.
        """
        def remove_empty_parents(path: Path, stop_at: Path) -> None:
            parent = path.parent
            while parent != stop_at and parent.is_dir():
                try:
                    parent.rmdir()
                except OSError:
                    break
                parent = parent.parent

        commands_dir = project_root / ".codex" / "commands"
        if commands_dir.is_dir():
            for stem in sorted(CORE_COMMAND_STEMS):
                for prefix in ("sp.", "sp-", "speckit.", "speckit-"):
                    stale_file = commands_dir / f"{prefix}{stem}.md"
                    if stale_file.is_file():
                        stale_file.unlink()

        prompts_dir = project_root / ".codex" / "prompts"
        if prompts_dir.is_dir():
            for stem in sorted(CORE_COMMAND_STEMS):
                for prefix in ("sp.", "sp-", "speckit.", "speckit-"):
                    stale_file = prompts_dir / f"{prefix}{stem}.md"
                    if stale_file.is_file():
                        stale_file.unlink()

        skills_dir = project_root / ".codex" / "skills"
        if skills_dir.is_dir():
            for stem in sorted(CORE_COMMAND_STEMS):
                for skill_name in skill_directory_variants(stem):
                    stale_dir = skills_dir / skill_name
                    if stale_dir.is_dir():
                        shutil.rmtree(stale_dir)

        for plugin_commands in (
            project_root / "plugins" / "sp" / "commands",
            project_root / ".agents" / "plugins" / "plugins" / "sp" / "commands",
        ):
            if plugin_commands.is_dir():
                for stem in sorted(CORE_COMMAND_STEMS):
                    for prefix in ("sp.", "sp-", "speckit.", "speckit-"):
                        stale_file = plugin_commands / f"{prefix}{stem}.md"
                        if stale_file.is_file():
                            stale_file.unlink()

        stale_top_level_plugin = project_root / "plugins" / "sp"
        if stale_top_level_plugin.is_dir():
            shutil.rmtree(stale_top_level_plugin)
            remove_empty_parents(stale_top_level_plugin, project_root)

        stale_nested_plugin = project_root / ".agents" / "plugins" / "plugins" / "sp"
        if stale_nested_plugin.is_dir():
            shutil.rmtree(stale_nested_plugin)
            remove_empty_parents(
                stale_nested_plugin,
                project_root / ".agents" / "plugins",
            )

        for stale_file in (
            project_root / ".agents" / "plugins" / "marketplace.json",
            project_root / ".agents" / "plugins" / "CODEX_PLUGIN_REGISTRATION.md",
        ):
            if stale_file.is_file():
                stale_file.unlink()

        nested_plugins_dir = project_root / ".agents" / "plugins" / "plugins"
        if nested_plugins_dir.is_dir():
            try:
                nested_plugins_dir.rmdir()
            except OSError:
                pass

    def setup(
        self,
        project_root: Path,
        manifest: IntegrationManifest,
        parsed_options: dict[str, Any] | None = None,
        **opts: Any,
    ) -> list[Path]:
        """Install Codex skills and apply Codex-specific skill naming guidance."""
        self._remove_obsolete_project_local_codex_surfaces(project_root)
        created = super().setup(project_root, manifest, parsed_options, **opts)
        skills_dir = self.skills_dest(project_root).resolve()
        for path in created:
            try:
                path.resolve().relative_to(skills_dir)
            except ValueError:
                continue
            if path.name != "SKILL.md":
                continue

            content = path.read_text(encoding="utf-8")
            updated = self.post_process_skill_content(content)
            if updated != content:
                path.write_text(updated, encoding="utf-8")
                self.record_file_in_manifest(path, project_root, manifest)

        return created
