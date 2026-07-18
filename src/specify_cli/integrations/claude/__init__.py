"""Claude Code integration."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import re

import yaml

from specify_cli.command_names import CORE_COMMAND_STEMS, skill_directory_variants

from ..base import SkillsIntegration
from ..manifest import IntegrationManifest

# Note injected into hook sections so Claude keeps SP user-facing commands
# dotted while still resolving extension hooks through skill directory names.
_HOOK_COMMAND_NOTE = (
    "- When constructing user-facing slash commands from hook command names, "
    "use `/sp.*` for core SP commands. For extension hook skill lookup only, "
    "resolve the hook through the integration naming helper. Do not present "
    "internal skill directory names as user-facing slash commands.\n"
)

# Mapping of command template stem → argument-hint text shown inline
# when a user invokes the slash command in Claude Code.
ARGUMENT_HINTS: dict[str, str] = {
    "specify": "Describe the feature you want to specify",
    "prd": "Optional product discovery or PRD shaping brief",
    "route": "Optional routing context or feature directory to inspect",
    "lite": "Feature, round action, or Lite validation direction",
    "plan": "Optional guidance for the planning phase",
    "tasks": "Optional task generation constraints",
    "implement": "Optional implementation guidance or task filter",
    "analyze": "Optional focus areas for analysis",
    "bundle": "Optional bundling scope or carry-forward focus",
    "clarify": "Optional areas to clarify in the spec",
    "constitution": "Principles or values for the project constitution",
    "flow": "Optional journey, branch, or state-machine focus",
    "gate": "Optional readiness focus or risk area to evaluate",
    "ui": "Optional screen area or interaction flow to refine",
    "checklist": "Domain or focus area for the checklist",
    "taskstoissues": "Optional filter or label for GitHub issues",
}


class ClaudeIntegration(SkillsIntegration):
    """Integration for Claude Code project slash commands."""

    key = "claude"
    config = {
        "name": "Claude Code",
        "folder": ".claude/",
        "commands_subdir": "skills",
        "install_url": "https://docs.anthropic.com/en/docs/claude-code/setup",
        "requires_cli": True,
    }
    registrar_config = {
        "dir": ".claude/skills",
        "format": "markdown",
        "args": "$ARGUMENTS",
        "extension": "/SKILL.md",
    }
    context_file = "CLAUDE.md"

    def companion_command_dirs(self, project_root: Path) -> tuple[Path, ...]:
        """Install user-visible dotted slash commands for Claude Code."""
        return (project_root / ".claude" / "commands",)

    def _remove_core_skill_dirs(self, project_root: Path) -> None:
        """Remove core command skills that Claude also exposes as slash commands."""
        skills_dir = self.skills_dest(project_root)
        if not skills_dir.is_dir():
            return
        import shutil

        for stem in sorted(CORE_COMMAND_STEMS):
            for skill_name in skill_directory_variants(stem):
                skill_dir = skills_dir / skill_name
                if skill_dir.is_dir():
                    shutil.rmtree(skill_dir)

    @staticmethod
    def inject_argument_hint(content: str, hint: str) -> str:
        """Insert ``argument-hint`` after ``description`` in YAML frontmatter.

        Re-renders the frontmatter instead of doing line-based insertion so
        multiline YAML scalars remain valid.
        """
        lines = content.splitlines(keepends=True)
        delimiter_indexes = [
            idx for idx, line in enumerate(lines) if line.rstrip("\n\r") == "---"
        ]
        if len(delimiter_indexes) < 2 or delimiter_indexes[0] != 0:
            return content

        start, end = delimiter_indexes[0], delimiter_indexes[1]
        frontmatter_text = "".join(lines[start + 1 : end])
        body = "".join(lines[end + 1 :])

        frontmatter = yaml.safe_load(frontmatter_text) or {}
        if not isinstance(frontmatter, dict):
            return content
        if "argument-hint" in frontmatter:
            return content

        rendered_frontmatter: dict[str, Any] = {}
        inserted = False
        for key, value in frontmatter.items():
            rendered_frontmatter[key] = value
            if key == "description":
                rendered_frontmatter["argument-hint"] = hint
                inserted = True
        if not inserted:
            rendered_frontmatter["argument-hint"] = hint

        eol = "\n"
        if lines[0].endswith("\r\n"):
            eol = "\r\n"

        frontmatter_dump = yaml.safe_dump(
            rendered_frontmatter,
            sort_keys=False,
            allow_unicode=True,
            width=10**6,
        ).strip()
        return f"---{eol}{frontmatter_dump}{eol}---{eol}{body.lstrip(chr(10)).lstrip(chr(13))}"

    @staticmethod
    def _inject_frontmatter_flag(content: str, key: str, value: str = "true") -> str:
        """Insert ``key: value`` before the closing ``---`` if not already present."""
        lines = content.splitlines(keepends=True)

        # Pre-scan: bail out if already present in frontmatter
        dash_count = 0
        for line in lines:
            stripped = line.rstrip("\n\r")
            if stripped == "---":
                dash_count += 1
                if dash_count == 2:
                    break
                continue
            if dash_count == 1 and stripped.startswith(f"{key}:"):
                return content

        # Inject before the closing --- of frontmatter
        out: list[str] = []
        dash_count = 0
        injected = False
        for line in lines:
            stripped = line.rstrip("\n\r")
            if stripped == "---":
                dash_count += 1
                if dash_count == 2 and not injected:
                    if line.endswith("\r\n"):
                        eol = "\r\n"
                    elif line.endswith("\n"):
                        eol = "\n"
                    else:
                        eol = ""
                    out.append(f"{key}: {value}{eol}")
                    injected = True
            out.append(line)
        return "".join(out)

    @staticmethod
    def _remove_frontmatter_key(content: str, key: str) -> str:
        """Remove a top-level YAML frontmatter key if present."""
        lines = content.splitlines(keepends=True)
        delimiter_indexes = [
            idx for idx, line in enumerate(lines) if line.rstrip("\n\r") == "---"
        ]
        if len(delimiter_indexes) < 2 or delimiter_indexes[0] != 0:
            return content

        start, end = delimiter_indexes[0], delimiter_indexes[1]
        updated = (
            lines[: start + 1]
            + [
                line
                for line in lines[start + 1 : end]
                if not line.lstrip().startswith(f"{key}:")
            ]
            + lines[end:]
        )
        return "".join(updated)

    @staticmethod
    def _inject_hook_command_note(content: str) -> str:
        """Insert a dot-to-hyphen note before each hook output instruction.

        Targets the line ``- For each executable hook, output the following``
        and inserts the note on the line before it, matching its indentation.
        Skips if the note is already present.
        """
        if "extension hook skill lookup" in content:
            return content

        def repl(m: re.Match[str]) -> str:
            indent = m.group(1)
            instruction = m.group(2)
            eol = m.group(3)
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

    def post_process_skill_content(
        self,
        content: str,
        *,
        user_invocable: bool = True,
    ) -> str:
        """Inject Claude-specific frontmatter flags and hook notes."""
        if user_invocable:
            updated = self._inject_frontmatter_flag(content, "user-invocable")
        else:
            updated = self._remove_frontmatter_key(content, "user-invocable")
        updated = self._inject_frontmatter_flag(updated, "disable-model-invocation", "false")
        updated = self._inject_hook_command_note(updated)
        return updated

    def setup(
        self,
        project_root: Path,
        manifest: IntegrationManifest,
        parsed_options: dict[str, Any] | None = None,
        **opts: Any,
    ) -> list[Path]:
        """Install Claude Code core commands as a single user-visible command surface."""
        script_type = opts.get("script_type", "sh")
        arg_placeholder = (
            self.registrar_config.get("args", "$ARGUMENTS")
            if self.registrar_config
            else "$ARGUMENTS"
        )

        created = self.install_companion_markdown_commands(
            project_root,
            manifest,
            script_type=script_type,
            arg_placeholder=arg_placeholder,
        )

        commands_dir = (project_root / ".claude" / "commands").resolve()
        for path in created:
            try:
                path.resolve().relative_to(commands_dir)
            except ValueError:
                continue
            if path.suffix != ".md":
                continue

            content = path.read_text(encoding="utf-8")
            updated = self.post_process_skill_content(content, user_invocable=True)
            stem = path.stem.removeprefix("sp.")
            hint = ARGUMENT_HINTS.get(stem, "")
            if hint:
                updated = self.inject_argument_hint(updated, hint)
            if updated != content:
                path.write_text(updated, encoding="utf-8")
                self.record_file_in_manifest(path, project_root, manifest)

        self._remove_core_skill_dirs(project_root)
        created.extend(self.install_bundled_helper_skills(project_root, manifest))
        created.extend(self.install_scripts(project_root, manifest))
        ctx_path = self.upsert_context_section(project_root)
        if ctx_path is not None:
            self.record_file_in_manifest(ctx_path, project_root, manifest)

        return created
