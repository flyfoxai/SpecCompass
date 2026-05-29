"""Codex CLI integration — upstream-style skills-based agent.

Codex installs the executable skill packages under
``.agents/skills/<skill-name>/SKILL.md`` and also writes project-local prompt
companions under ``.codex/prompts/sp.<name>.md`` plus a project-local Codex
plugin marketplace. The marketplace manifest lives under
``.agents/plugins/marketplace.json`` and points at ``plugins/sp/`` from the
project root. These files target ``/prompt::sp.<name>``, but actual slash-menu
visibility depends on the current Codex client and must be verified in the UI.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from specify_cli.command_names import (
    CORE_COMMAND_STEMS,
    command_filename_base,
    skill_directory_variants,
)

from ..base import IntegrationOption, SkillsIntegration
from ..manifest import IntegrationManifest

# Note injected into hook sections so Codex maps dot-notation command names
# from extension metadata to the hyphenated skill names it uses internally.
_HOOK_COMMAND_NOTE = (
    "- When constructing Codex prompt commands from hook command names, "
    "core SP prompt/plugin entries target `/prompt::sp.<name>`; verify actual "
    "slash-menu visibility in the current Codex client. "
    "For extension hooks, replace dots (`.`) with hyphens (`-`) when resolving "
    "the skill directory, for example `speckit.git.commit` -> `speckit-git-commit`.\n"
)

_CODEX_PLUGIN_NAME = "sp"
_CODEX_PLUGIN_AUTHOR = "flyfoxai"
_CODEX_LOCAL_MARKETPLACE_PREFIX = "sp-local"


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

    def companion_command_dirs(self, project_root: Path) -> tuple[Path, ...]:
        """Install Codex prompt files that target /prompt::sp.* entries."""
        return (project_root / ".codex" / "prompts",)

    @staticmethod
    def _safe_marketplace_fragment(value: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
        return normalized[:32].strip("-") or "project"

    @classmethod
    def codex_plugin_source_root(cls, project_root: Path) -> Path:
        """Return the Codex marketplace source root for project-local SP.

        Codex resolves `.agents/plugins/marketplace.json` relative to the
        marketplace root passed to `codex plugin marketplace add`. For a
        project-local marketplace, that root is the project root itself, while
        plugin entries use `source.path: ./plugins/sp`.
        """
        return project_root

    @classmethod
    def codex_plugin_commands_dir(cls, project_root: Path) -> Path:
        return cls.codex_plugin_source_root(project_root) / "plugins" / _CODEX_PLUGIN_NAME / "commands"

    @classmethod
    def codex_plugin_manifest_path(cls, project_root: Path) -> Path:
        return cls.codex_plugin_source_root(project_root) / "plugins" / _CODEX_PLUGIN_NAME / ".codex-plugin" / "plugin.json"

    @classmethod
    def codex_marketplace_path(cls, project_root: Path) -> Path:
        return project_root / ".agents" / "plugins" / "marketplace.json"

    @classmethod
    def codex_registration_report_path(cls, project_root: Path) -> Path:
        return project_root / ".agents" / "plugins" / "CODEX_PLUGIN_REGISTRATION.md"

    @classmethod
    def codex_marketplace_name(cls, project_root: Path) -> str:
        root = project_root.resolve()
        project = cls._safe_marketplace_fragment(root.name)
        digest = hashlib.sha1(str(root).encode("utf-8")).hexdigest()[:8]
        return f"sp-local-{project}-{digest}"

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
        """Insert a Codex prompt/skill naming note before hook output instructions."""
        if "core SP prompt/plugin entries target `/prompt::sp.<name>`" in content:
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

        Current Codex support keeps executable skills in `.agents/skills` and
        visible prompt entries in `.codex/prompts/sp.*.md`. Older experiments
        also wrote `.codex/commands`, hyphenated prompt files, legacy speckit
        prompt files, and `.codex/skills`; leaving those files can expose stale
        or duplicate command names.
        """
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
                for prefix in ("sp-", "speckit.", "speckit-"):
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
            CodexIntegration.codex_plugin_commands_dir(project_root),
            project_root / ".agents" / "plugins" / "plugins" / _CODEX_PLUGIN_NAME / "commands",
        ):
            if plugin_commands.is_dir():
                for stem in sorted(CORE_COMMAND_STEMS):
                    for prefix in ("sp-", "speckit.", "speckit-"):
                        stale_file = plugin_commands / f"{prefix}{stem}.md"
                        if stale_file.is_file():
                            stale_file.unlink()

        stale_nested_plugin = project_root / ".agents" / "plugins" / "plugins" / _CODEX_PLUGIN_NAME
        if stale_nested_plugin.is_dir():
            shutil.rmtree(stale_nested_plugin)
            parent = stale_nested_plugin.parent
            marketplace_dir = project_root / ".agents" / "plugins"
            while parent != marketplace_dir:
                try:
                    parent.rmdir()
                except OSError:
                    break
                parent = parent.parent

    def _plugin_json(self) -> str:
        try:
            from specify_cli import get_speckit_version

            version = get_speckit_version()
        except Exception:
            version = "unknown"
        if not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", version):
            version = "0.0.0"

        data = {
            "name": _CODEX_PLUGIN_NAME,
            "version": version,
            "description": "SP spec-driven development commands for Codex.",
            "author": {"name": _CODEX_PLUGIN_AUTHOR},
            "license": "MIT",
            "keywords": ["spec-driven-development", "sp", "spec-kit"],
            "commands": "./commands/",
            "interface": {
                "displayName": "SP",
                "shortDescription": "SP spec-driven development commands",
                "longDescription": (
                    "Project specification, planning, task, implementation, analysis, "
                    "gate, memory, and UI workflow commands."
                ),
                "developerName": _CODEX_PLUGIN_AUTHOR,
                "category": "Coding",
                "capabilities": ["Read", "Write"],
            },
        }
        return json.dumps(data, indent=2) + "\n"

    @staticmethod
    def _marketplace_json(marketplace_name: str) -> str:
        data = {
            "name": marketplace_name,
            "interface": {"displayName": "SP Local"},
            "plugins": [
                {
                    "name": _CODEX_PLUGIN_NAME,
                    "source": {
                        "source": "local",
                        "path": f"./plugins/{_CODEX_PLUGIN_NAME}",
                    },
                    "policy": {
                        "installation": "AVAILABLE",
                        "authentication": "ON_USE",
                    },
                    "category": "Coding",
                }
            ],
        }
        return json.dumps(data, indent=2) + "\n"

    def install_codex_plugin_files(
        self,
        project_root: Path,
        manifest: IntegrationManifest,
        *,
        script_type: str,
        arg_placeholder: str,
    ) -> list[Path]:
        """Install the Codex plugin layer that targets /prompt::sp.* commands."""
        templates = self.list_command_templates()
        if not templates:
            return []

        project_root_resolved = project_root.resolve()
        plugin_root = self.codex_plugin_source_root(project_root).resolve()
        try:
            plugin_root.relative_to(project_root_resolved)
        except ValueError as exc:
            raise ValueError(
                f"Codex plugin destination {plugin_root} escapes "
                f"project root {project_root_resolved}"
            ) from exc

        created: list[Path] = []
        commands_dir = self.codex_plugin_commands_dir(project_root)
        commands_dir.mkdir(parents=True, exist_ok=True)

        for src_file in templates:
            raw = src_file.read_text(encoding="utf-8")
            processed = self.process_template(
                raw,
                self.key,
                script_type,
                arg_placeholder,
                context_file=self.context_file or "",
            )
            dst_file = self.write_file_and_record(
                processed,
                commands_dir / f"{command_filename_base(src_file.stem)}.md",
                project_root,
                manifest,
            )
            created.append(dst_file)

        plugin_manifest = self.write_file_and_record(
            self._plugin_json(),
            self.codex_plugin_manifest_path(project_root),
            project_root,
            manifest,
        )
        created.append(plugin_manifest)

        marketplace_name = self.codex_marketplace_name(project_root)
        marketplace = self.write_file_and_record(
            self._marketplace_json(marketplace_name),
            self.codex_marketplace_path(project_root),
            project_root,
            manifest,
        )
        created.append(marketplace)

        return created

    def _register_codex_plugin(self, project_root: Path, marketplace_name: str) -> tuple[bool, str]:
        codex = shutil.which("codex")
        source_root = self.codex_plugin_source_root(project_root).resolve()
        add_marketplace = f"codex plugin marketplace add {source_root}"
        add_plugin = f"codex plugin add {_CODEX_PLUGIN_NAME}@{marketplace_name}"
        if not codex:
            return False, (
                "Codex CLI was not found, so SP could not auto-register the plugin.\n\n"
                f"Run manually after installing Codex:\n\n```bash\n{add_marketplace}\n{add_plugin}\n```\n"
            )

        commands = [
            [codex, "plugin", "marketplace", "add", str(source_root)],
            [codex, "plugin", "add", f"{_CODEX_PLUGIN_NAME}@{marketplace_name}"],
        ]
        outputs: list[str] = []
        cleanup_success, cleanup_output = self._remove_old_codex_local_registrations(
            codex,
            keep_marketplace=marketplace_name,
        )
        if cleanup_output:
            outputs.append(cleanup_output)
        if not cleanup_success:
            details = "\n".join(outputs).strip()
            if details:
                details = f"\n\nCodex output:\n\n```text\n{details}\n```"
            return False, (
                "Codex plugin files were installed, but old SP local plugin "
                "registrations could not be cleaned safely.\n\n"
                f"Run manually:\n\n```bash\n{add_marketplace}\n{add_plugin}\n```"
                f"{details}\n"
            )
        for command in commands:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=60,
            )
            stdout = result.stdout.strip()
            stderr = result.stderr.strip()
            if stdout:
                outputs.append(stdout)
            if stderr:
                outputs.append(stderr)
            if result.returncode != 0:
                details = "\n".join(outputs).strip()
                if details:
                    details = f"\n\nCodex output:\n\n```text\n{details}\n```"
                return False, (
                    "Codex plugin files were installed, but auto-registration failed.\n\n"
                    f"Run manually:\n\n```bash\n{add_marketplace}\n{add_plugin}\n```"
                    f"{details}\n"
                )

        maintenance = ""
        if cleanup_output:
            maintenance = f"\nCodex maintenance:\n\n```text\n{cleanup_output}\n```\n\n"

        return True, (
            "Codex plugin auto-registration completed.\n\n"
            f"Registered marketplace: `{marketplace_name}`\n\n"
            f"{maintenance}"
            "SP prompt/plugin files target `/prompt::sp.*`. Restart or refresh Codex "
            "and verify slash-menu visibility in the client UI.\n"
        )

    @staticmethod
    def _remove_old_codex_local_registrations(
        codex: str,
        *,
        keep_marketplace: str,
    ) -> tuple[bool, str]:
        """Remove stale SP local marketplaces before registering this project.

        Codex plugin registration is global. Leaving multiple SP-generated
        local marketplaces enabled can expose duplicate or stale `/prompt::sp.*`
        commands. This cleanup is deliberately narrow: it only targets
        marketplace names generated by this integration (`sp-local*`) and never
        removes unrelated user plugins or marketplaces.
        """
        result = subprocess.run(
            [codex, "plugin", "marketplace", "list"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        output = "\n".join(
            part.strip()
            for part in (result.stdout, result.stderr)
            if part and part.strip()
        )
        if result.returncode != 0:
            return False, output

        removed: list[str] = []
        details: list[str] = []
        for line in result.stdout.splitlines():
            fields = line.split(None, 1)
            if len(fields) != 2:
                continue
            name, path_text = fields
            if name == keep_marketplace:
                continue
            if name != _CODEX_LOCAL_MARKETPLACE_PREFIX and not name.startswith(
                f"{_CODEX_LOCAL_MARKETPLACE_PREFIX}-"
            ):
                continue

            marketplace_root = Path(path_text)
            if not marketplace_root.exists():
                pass
            else:
                # Avoid touching a user-created marketplace that happens to share
                # the prefix unless it has the SP plugin marker we generate.
                manifest = (
                    marketplace_root
                    / "plugins"
                    / _CODEX_PLUGIN_NAME
                    / ".codex-plugin"
                    / "plugin.json"
                )
                if not manifest.is_file():
                    continue

            for command in (
                [codex, "plugin", "remove", f"{_CODEX_PLUGIN_NAME}@{name}"],
                [codex, "plugin", "marketplace", "remove", name],
            ):
                cleanup = subprocess.run(
                    command,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                cleanup_output = "\n".join(
                    part.strip()
                    for part in (cleanup.stdout, cleanup.stderr)
                    if part and part.strip()
                )
                if cleanup_output:
                    details.append(cleanup_output)
                if cleanup.returncode != 0:
                    return False, "\n".join(details).strip()
            removed.append(name)

        if removed:
            details.append(
                "Removed stale SP local Codex marketplaces: " + ", ".join(removed)
            )
        return True, "\n".join(details).strip()

    def write_codex_registration_report(
        self,
        project_root: Path,
        manifest: IntegrationManifest,
        *,
        register_agent_tools: bool,
    ) -> Path:
        marketplace_name = self.codex_marketplace_name(project_root)
        source_root = self.codex_plugin_source_root(project_root).resolve()
        add_marketplace = f"codex plugin marketplace add {source_root}"
        add_plugin = f"codex plugin add {_CODEX_PLUGIN_NAME}@{marketplace_name}"

        if register_agent_tools:
            success, details = self._register_codex_plugin(project_root, marketplace_name)
            status = "registered" if success else "manual-registration-required"
        else:
            status = "manual-registration-required"
            details = (
                "SP installed Codex plugin files but skipped auto-registration because "
                "`--ignore-agent-tools` was used or setup was invoked without an explicit "
                "registration request.\n\n"
                f"Run manually:\n\n```bash\n{add_marketplace}\n{add_plugin}\n```\n"
            )

        content = (
            "# Codex Plugin Registration\n\n"
            f"Status: `{status}`\n\n"
            f"Marketplace name: `{marketplace_name}`\n\n"
            f"Marketplace source root: `{source_root}`\n\n"
            f"{details}"
            "\nAfter registration, restart or refresh Codex and verify whether the "
            "current client exposes `/prompt::sp.*` in the slash menu. File "
            "generation and plugin registration alone do not prove UI visibility.\n"
        )
        return self.write_file_and_record(
            content,
            self.codex_registration_report_path(project_root),
            project_root,
            manifest,
        )

    def setup(
        self,
        project_root: Path,
        manifest: IntegrationManifest,
        parsed_options: dict[str, Any] | None = None,
        **opts: Any,
    ) -> list[Path]:
        """Install Codex skills and apply Codex-specific prompt naming guidance."""
        self._remove_obsolete_project_local_codex_surfaces(project_root)
        created = super().setup(project_root, manifest, parsed_options, **opts)

        script_type = opts.get("script_type", "sh")
        arg_placeholder = (
            self.registrar_config.get("args", "$ARGUMENTS")
            if self.registrar_config
            else "$ARGUMENTS"
        )
        created.extend(
            self.install_codex_plugin_files(
                project_root,
                manifest,
                script_type=script_type,
                arg_placeholder=arg_placeholder,
            )
        )

        register_agent_tools = bool(opts.get("register_agent_tools", False))
        created.append(
            self.write_codex_registration_report(
                project_root,
                manifest,
                register_agent_tools=register_agent_tools,
            )
        )

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
