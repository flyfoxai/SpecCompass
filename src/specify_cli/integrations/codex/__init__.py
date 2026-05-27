"""Codex CLI integration — skills-based agent.

Codex installs core SP commands as ``.agents/skills/sp.<name>/SKILL.md`` and
mirrors them into ``.codex/skills/sp.<name>/SKILL.md`` for Codex Desktop.
Extension and preset commands keep the upstream ``speckit-.../SKILL.md``
namespace. Commands are deprecated; ``--skills`` defaults to ``True``.
"""

from __future__ import annotations

from pathlib import Path

from ..base import IntegrationOption, SkillsIntegration


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

    def companion_skill_dirs(self, project_root: Path) -> tuple[Path, ...]:
        """Mirror skills into Codex Desktop's project-local discovery path."""
        return (project_root / ".codex" / "skills",)

    def companion_command_dirs(self, project_root: Path) -> tuple[Path, ...]:
        """Install user-visible dotted slash commands for Codex."""
        return (
            project_root / ".codex" / "commands",
            project_root / ".codex" / "prompts",
        )

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
