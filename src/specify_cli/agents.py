"""
Agent Command Registrar for Spec Kit

Shared infrastructure for registering commands with AI agents.
Used by both the extension system and the preset system to write
command files into agent-specific directories in the correct format.
"""

from pathlib import Path
from typing import Dict, List, Any

import platform
import re
from copy import deepcopy
import yaml

from specify_cli.command_names import (
    canonical_command_id,
    command_filename_base,
    command_title_text,
    core_command_stem,
    skill_directory_name,
)


def _build_agent_configs() -> dict[str, Any]:
    """Derive CommandRegistrar.AGENT_CONFIGS from INTEGRATION_REGISTRY."""
    from specify_cli.integrations import INTEGRATION_REGISTRY

    configs: dict[str, dict[str, Any]] = {}
    for key, integration in INTEGRATION_REGISTRY.items():
        if key == "generic":
            continue
        if integration.registrar_config:
            configs[key] = dict(integration.registrar_config)
    return configs


class CommandRegistrar:
    """Handles registration of commands with AI agents.

    Supports writing command files in Markdown or TOML format to the
    appropriate agent directory, with correct argument placeholders
    and companion files (e.g. Copilot .prompt.md).
    """

    # Derived from INTEGRATION_REGISTRY — single source of truth.
    # Populated lazily via _ensure_configs() on first use.
    AGENT_CONFIGS: dict[str, dict[str, Any]] = {}
    _configs_loaded: bool = False

    def __init__(self) -> None:
        self._ensure_configs()

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        cls._ensure_configs()

    @classmethod
    def _ensure_configs(cls) -> None:
        if not cls._configs_loaded:
            try:
                cls.AGENT_CONFIGS = _build_agent_configs()
                cls._configs_loaded = True
            except ImportError:
                pass  # Circular import during module init; retry on next access

    @staticmethod
    def parse_frontmatter(content: str) -> tuple[dict, str]:
        """Parse YAML frontmatter from Markdown content.

        Args:
            content: Markdown content with YAML frontmatter

        Returns:
            Tuple of (frontmatter_dict, body_content)
        """
        if not content.startswith("---"):
            return {}, content

        # Find second ---
        end_marker = content.find("---", 3)
        if end_marker == -1:
            return {}, content

        frontmatter_str = content[3:end_marker].strip()
        body = content[end_marker + 3 :].strip()

        try:
            frontmatter = yaml.safe_load(frontmatter_str) or {}
        except yaml.YAMLError:
            frontmatter = {}

        if not isinstance(frontmatter, dict):
            frontmatter = {}

        return frontmatter, body

    @staticmethod
    def render_frontmatter(fm: dict) -> str:
        """Render frontmatter dictionary as YAML.

        Args:
            fm: Frontmatter dictionary

        Returns:
            YAML-formatted frontmatter with delimiters
        """
        if not fm:
            return ""

        yaml_str = yaml.dump(
            fm,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
            width=10**6,
        )
        return f"---\n{yaml_str}---\n"

    def _adjust_script_paths(self, frontmatter: dict) -> dict:
        """Normalize script paths in frontmatter to generated project locations.

        Rewrites known repo-relative and top-level script paths under the
        ``scripts`` key (for example ``../../scripts/``,
        ``../../templates/``, ``../../memory/``, ``scripts/``, ``templates/``, and
        project-level ``memory/`` references) to the ``.specify/...`` paths used
        in generated projects.

        Args:
            frontmatter: Frontmatter dictionary

        Returns:
            Modified frontmatter with normalized project paths
        """
        frontmatter = deepcopy(frontmatter)

        for script_key in ("scripts", "agent_scripts"):
            scripts = frontmatter.get(script_key)
            if not isinstance(scripts, dict):
                continue
            for key, script_path in scripts.items():
                if isinstance(script_path, str):
                    scripts[key] = self.rewrite_project_relative_paths(script_path)
        return frontmatter

    @staticmethod
    def rewrite_project_relative_paths(text: str) -> str:
        """Rewrite repo-relative paths to their generated project locations."""
        if not isinstance(text, str) or not text:
            return text

        for old, new in (
            ("../../memory/", ".specify/memory/"),
            ("../../scripts/", ".specify/scripts/"),
            ("../../templates/", ".specify/templates/"),
        ):
            text = text.replace(old, new)

        # Only rewrite top-level style references so extension-local paths like
        # ".specify/extensions/<ext>/scripts/..." remain intact. Bare memory
        # paths are deliberately limited to project-level memory files; feature
        # commands use memory/open-items.md and memory/trace-index.md to mean
        # specs/<feature>/memory/*, and rewriting those would route the agent to
        # the wrong document.
        project_memory_names = (
            "constitution",
            "project-index",
            "feature-map",
            "domain-map",
            "active-context",
            "hotspots",
        )
        project_memory_pattern = "|".join(re.escape(name) for name in project_memory_names)
        text = re.sub(
            rf'(^|[\s`"\'(])(?:\.?/)?memory/({project_memory_pattern}\.md\b)',
            r"\1.specify/memory/\2",
            text,
        )
        text = re.sub(r'(^|[\s`"\'(])(?:\.?/)?scripts/', r"\1.specify/scripts/", text)
        text = re.sub(
            r'(^|[\s`"\'(])(?:\.?/)?templates/', r"\1.specify/templates/", text
        )

        return text.replace(".specify/.specify/", ".specify/").replace(
            ".specify.specify/", ".specify/"
        )

    def render_markdown_command(
        self, frontmatter: dict, body: str, source_id: str, context_note: str = None
    ) -> str:
        """Render command in Markdown format.

        Args:
            frontmatter: Command frontmatter
            body: Command body content
            source_id: Source identifier (extension or preset ID)
            context_note: Custom context comment (default: <!-- Source: {source_id} -->)

        Returns:
            Formatted Markdown command file content
        """
        if context_note is None:
            context_note = f"\n<!-- Source: {source_id} -->\n"
        return self.render_frontmatter(frontmatter) + "\n" + context_note + body

    def render_toml_command(self, frontmatter: dict, body: str, source_id: str) -> str:
        """Render command in TOML format.

        Args:
            frontmatter: Command frontmatter
            body: Command body content
            source_id: Source identifier (extension or preset ID)

        Returns:
            Formatted TOML command file content
        """
        toml_lines = []

        if "description" in frontmatter:
            toml_lines.append(
                f"description = {self._render_basic_toml_string(frontmatter['description'])}"
            )
            toml_lines.append("")

        toml_lines.append(f"# Source: {source_id}")
        toml_lines.append("")

        # Keep TOML output valid even when body contains triple-quote delimiters.
        # Prefer multiline forms, then fall back to escaped basic string.
        if '"""' not in body:
            toml_lines.append('prompt = """')
            toml_lines.append(body)
            toml_lines.append('"""')
        elif "'''" not in body:
            toml_lines.append("prompt = '''")
            toml_lines.append(body)
            toml_lines.append("'''")
        else:
            toml_lines.append(f"prompt = {self._render_basic_toml_string(body)}")

        return "\n".join(toml_lines)

    @staticmethod
    def _render_basic_toml_string(value: str) -> str:
        """Render *value* as a TOML basic string literal."""
        escaped = (
            value.replace("\\", "\\\\")
            .replace('"', '\\"')
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
        )
        return f'"{escaped}"'

    def render_yaml_command(
        self,
        frontmatter: dict,
        body: str,
        source_id: str,
        cmd_name: str = "",
    ) -> str:
        """Render command in YAML recipe format for Goose.

        Args:
            frontmatter: Command frontmatter
            body: Command body content
            source_id: Source identifier (extension or preset ID)
            cmd_name: Command name used as title fallback

        Returns:
            Formatted YAML recipe file content
        """
        from specify_cli.integrations.base import YamlIntegration

        title = frontmatter.get("title", "") or frontmatter.get("name", "")
        if not isinstance(title, str):
            title = str(title) if title is not None else ""
        if not title and cmd_name:
            title = YamlIntegration._human_title(cmd_name)
        if not title and source_id:
            title = YamlIntegration._human_title(Path(str(source_id)).stem)
        if not title:
            title = "Command"

        description = frontmatter.get("description", "")
        if not isinstance(description, str):
            description = str(description) if description is not None else ""
        return YamlIntegration._render_yaml(title, description, body, source_id)

    def render_skill_command(
        self,
        agent_name: str,
        skill_name: str,
        frontmatter: dict,
        body: str,
        source_id: str,
        source_file: str,
        project_root: Path,
    ) -> str:
        """Render a command override as a SKILL.md file.

        SKILL-target agents should receive the same skills-oriented
        frontmatter shape used elsewhere in the project instead of the
        original command frontmatter.

        Technical debt note:
        Spec-kit currently has multiple SKILL.md generators (template packaging,
        init-time conversion, and extension/preset overrides). Keep the skill
        frontmatter keys aligned (name/description/compatibility/metadata, with
        metadata.author and metadata.source subkeys) to avoid drift across agents.
        """
        if not isinstance(frontmatter, dict):
            frontmatter = {}

        preserved_frontmatter = deepcopy(frontmatter)
        if agent_name in {"codex", "kimi"}:
            body = self.resolve_skill_placeholders(
                agent_name, frontmatter, body, project_root
            )
            preserved_frontmatter = self._filter_skill_frontmatter_variants(
                preserved_frontmatter, project_root
            )

        description = frontmatter.get(
            "description", f"Spec-kit workflow command: {skill_name}"
        )
        skill_frontmatter = self.build_skill_frontmatter(
            agent_name,
            skill_name,
            description,
            f"{source_id}:{source_file}",
            original_frontmatter=preserved_frontmatter,
        )
        return self.render_frontmatter(skill_frontmatter) + "\n" + body

    @staticmethod
    def build_skill_frontmatter(
        agent_name: str,
        skill_name: str,
        description: str,
        source: str,
        original_frontmatter: dict | None = None,
    ) -> dict:
        """Build consistent SKILL.md frontmatter across all skill generators."""
        skill_frontmatter = {
            "name": skill_name,
            "description": description,
            "compatibility": "Requires spec-kit project structure with .specify/ directory",
            "metadata": {
                "author": "github-spec-kit",
                "source": source,
            },
        }
        if isinstance(original_frontmatter, dict):
            for key in ("scripts", "agent_scripts", "handoffs"):
                value = original_frontmatter.get(key)
                if value:
                    resolved_value = CommandRegistrar._resolve_frontmatter_placeholders(
                        deepcopy(value), agent_name
                    )
                    if key == "handoffs":
                        resolved_value = CommandRegistrar._normalize_handoffs(
                            resolved_value
                        )
                    skill_frontmatter[key] = resolved_value
        return skill_frontmatter

    @staticmethod
    def _normalize_handoffs(value: Any) -> Any:
        """Normalize preserved handoff targets to canonical command ids."""
        if isinstance(value, list):
            return [CommandRegistrar._normalize_handoffs(item) for item in value]
        if isinstance(value, dict):
            normalized = {}
            for key, item in value.items():
                if key == "agent" and isinstance(item, str):
                    normalized[key] = canonical_command_id(item)
                else:
                    normalized[key] = CommandRegistrar._normalize_handoffs(item)
            return normalized
        return value

    @staticmethod
    def _resolve_frontmatter_placeholders(value: Any, agent_name: str) -> Any:
        """Resolve agent placeholders inside preserved skill frontmatter."""
        if isinstance(value, str):
            return CommandRegistrar.rewrite_project_relative_paths(
                value.replace("__AGENT__", agent_name).replace("{ARGS}", "$ARGUMENTS")
            )
        if isinstance(value, list):
            return [
                CommandRegistrar._resolve_frontmatter_placeholders(item, agent_name)
                for item in value
            ]
        if isinstance(value, dict):
            return {
                key: CommandRegistrar._resolve_frontmatter_placeholders(item, agent_name)
                for key, item in value.items()
            }
        return value

    @staticmethod
    def _select_skill_script_variant(
        scripts: dict[str, Any],
        agent_scripts: dict[str, Any],
        project_root: Path,
    ) -> str | None:
        """Choose the script variant a generated skill should preserve/use."""
        try:
            from . import load_init_options
        except ImportError:
            load_init_options = None

        init_opts: dict[str, Any] = {}
        if load_init_options is not None:
            payload = load_init_options(project_root)
            if isinstance(payload, dict):
                init_opts = payload

        script_variant = init_opts.get("script")
        if script_variant in {"sh", "ps"}:
            return script_variant

        fallback_order: list[str] = []
        default_variant = "ps" if platform.system().lower().startswith("win") else "sh"
        secondary_variant = "sh" if default_variant == "ps" else "ps"

        if default_variant in scripts or default_variant in agent_scripts:
            fallback_order.append(default_variant)
        if secondary_variant in scripts or secondary_variant in agent_scripts:
            fallback_order.append(secondary_variant)

        for key in scripts:
            if key not in fallback_order:
                fallback_order.append(key)
        for key in agent_scripts:
            if key not in fallback_order:
                fallback_order.append(key)

        return fallback_order[0] if fallback_order else None

    @classmethod
    def _filter_skill_frontmatter_variants(
        cls, frontmatter: dict[str, Any], project_root: Path
    ) -> dict[str, Any]:
        """Keep only the selected script variant in preserved skill frontmatter."""
        scripts = frontmatter.get("scripts", {}) or {}
        agent_scripts = frontmatter.get("agent_scripts", {}) or {}
        if not isinstance(scripts, dict):
            scripts = {}
        if not isinstance(agent_scripts, dict):
            agent_scripts = {}

        script_variant = cls._select_skill_script_variant(
            scripts, agent_scripts, project_root
        )
        if script_variant is None:
            return frontmatter

        filtered = deepcopy(frontmatter)
        if isinstance(filtered.get("scripts"), dict):
            filtered["scripts"] = {
                script_variant: filtered["scripts"][script_variant]
            } if script_variant in filtered["scripts"] else {}
        if isinstance(filtered.get("agent_scripts"), dict):
            filtered["agent_scripts"] = {
                script_variant: filtered["agent_scripts"][script_variant]
            } if script_variant in filtered["agent_scripts"] else {}
        return filtered

    @staticmethod
    def resolve_skill_placeholders(
        agent_name: str,
        frontmatter: dict,
        body: str,
        project_root: Path,
        *,
        context_file: str | None = None,
    ) -> str:
        """Resolve script placeholders for skills-backed agents."""
        if not isinstance(frontmatter, dict):
            frontmatter = {}

        scripts = frontmatter.get("scripts", {}) or {}
        agent_scripts = frontmatter.get("agent_scripts", {}) or {}
        if not isinstance(scripts, dict):
            scripts = {}
        if not isinstance(agent_scripts, dict):
            agent_scripts = {}

        try:
            from . import load_init_options
        except ImportError:
            load_init_options = None

        init_opts: dict[str, Any] = {}
        if load_init_options is not None:
            payload = load_init_options(project_root)
            if isinstance(payload, dict):
                init_opts = payload

        if "{SCRIPT}" in body:
            body = body.replace(
                "{SCRIPT}",
                "the frontmatter-declared prerequisite script result",
            )
        if "{AGENT_SCRIPT}" in body:
            body = body.replace(
                "{AGENT_SCRIPT}",
                "the frontmatter-declared agent-context refresh hook",
            )

        body = body.replace("{ARGS}", "$ARGUMENTS").replace("__AGENT__", agent_name)
        resolved_context_file = context_file
        if resolved_context_file is None:
            resolved_context_file = init_opts.get("context_file") or ""

        body = body.replace("__CONTEXT_FILE__", resolved_context_file)
        return CommandRegistrar.rewrite_project_relative_paths(body)

    def _convert_argument_placeholder(
        self, content: str, from_placeholder: str, to_placeholder: str
    ) -> str:
        """Convert argument placeholder format.

        Args:
            content: Command content
            from_placeholder: Source placeholder (e.g., "$ARGUMENTS")
            to_placeholder: Target placeholder (e.g., "{{args}}")

        Returns:
            Content with converted placeholders
        """
        return content.replace(from_placeholder, to_placeholder)

    @staticmethod
    def _compute_output_name(
        agent_name: str, cmd_name: str, agent_config: Dict[str, Any]
    ) -> str:
        """Compute the on-disk command or skill name for an agent."""
        if agent_config["extension"] != "/SKILL.md":
            return command_filename_base(cmd_name)

        return skill_directory_name(cmd_name)

    @staticmethod
    def _resolve_registration_target(
        agent_name: str,
        cmd_name: str,
        agent_config: Dict[str, Any],
        project_root: Path,
    ) -> tuple[Dict[str, Any], Path, str]:
        """Return the effective config, output dir, and basename for a command.

        Claude core commands are user-visible slash commands, not skills. Core
        preset/extension overrides must therefore land in `.claude/commands`
        as dotted `sp.*.md` files; otherwise they are written to
        `.claude/skills/sp-*` and later removed by Claude's stale-skill cleanup.
        Extension commands keep the normal skills path.
        """
        if agent_name == "claude" and core_command_stem(cmd_name) is not None:
            effective_config = dict(agent_config)
            effective_config["dir"] = ".claude/commands"
            effective_config["format"] = "markdown"
            effective_config["extension"] = ".md"
            return (
                effective_config,
                project_root / effective_config["dir"],
                command_filename_base(cmd_name),
            )

        return (
            agent_config,
            project_root / agent_config["dir"],
            CommandRegistrar._compute_output_name(agent_name, cmd_name, agent_config),
        )

    @staticmethod
    def _agent_detection_dirs(
        agent_name: str,
        agent_config: Dict[str, Any],
        project_root: Path,
    ) -> tuple[Path, ...]:
        """Return directories that prove an agent integration is installed."""
        dirs = [project_root / agent_config["dir"]]
        if agent_name == "claude":
            dirs.append(project_root / ".claude" / "commands")
        return tuple(dict.fromkeys(dirs))

    def register_commands(
        self,
        agent_name: str,
        commands: List[Dict[str, Any]],
        source_id: str,
        source_dir: Path,
        project_root: Path,
        context_note: str = None,
    ) -> List[str]:
        """Register commands for a specific agent.

        Args:
            agent_name: Agent name (claude, gemini, copilot, etc.)
            commands: List of command info dicts with 'name', 'file', and optional 'aliases'
            source_id: Identifier of the source (extension or preset ID)
            source_dir: Directory containing command source files
            project_root: Path to project root
            context_note: Custom context comment for markdown output

        Returns:
            List of registered command names

        Raises:
            ValueError: If agent is not supported
        """
        self._ensure_configs()
        if agent_name not in self.AGENT_CONFIGS:
            raise ValueError(f"Unsupported agent: {agent_name}")

        agent_config = self.AGENT_CONFIGS[agent_name]

        registered = []

        for cmd_info in commands:
            cmd_name = cmd_info["name"]
            cmd_file = cmd_info["file"]

            source_file = source_dir / cmd_file
            if not source_file.exists():
                continue

            content = source_file.read_text(encoding="utf-8")
            frontmatter, body = self.parse_frontmatter(content)

            frontmatter = self._adjust_script_paths(frontmatter)

            for key in agent_config.get("strip_frontmatter_keys", []):
                frontmatter.pop(key, None)

            if agent_config.get("inject_name") and not frontmatter.get("name"):
                # Use custom name formatter if provided (e.g., Forge's hyphenated format)
                format_name = agent_config.get("format_name")
                frontmatter["name"] = format_name(cmd_name) if format_name else cmd_name

            body = self._convert_argument_placeholder(
                body, "$ARGUMENTS", agent_config["args"]
            )

            effective_config, commands_dir, output_name = self._resolve_registration_target(
                agent_name, cmd_name, agent_config, project_root
            )
            commands_dir.mkdir(parents=True, exist_ok=True)

            if effective_config["extension"] == "/SKILL.md":
                output = self.render_skill_command(
                    agent_name,
                    output_name,
                    frontmatter,
                    body,
                    source_id,
                    cmd_file,
                    project_root,
                )
            elif effective_config["format"] == "markdown":
                output = self.render_markdown_command(
                    frontmatter, body, source_id, context_note
                )
            elif effective_config["format"] == "toml":
                output = self.render_toml_command(frontmatter, body, source_id)
            elif effective_config["format"] == "yaml":
                output = self.render_yaml_command(
                    frontmatter, body, source_id, cmd_name
                )
            else:
                raise ValueError(f"Unsupported format: {effective_config['format']}")

            dest_file = commands_dir / f"{output_name}{effective_config['extension']}"
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            dest_file.write_text(output, encoding="utf-8")

            if agent_name == "copilot":
                self.write_copilot_prompt(project_root, cmd_name)

            registered.append(cmd_name)

            for alias in cmd_info.get("aliases", []):
                (
                    alias_effective_config,
                    alias_commands_dir,
                    alias_output_name,
                ) = self._resolve_registration_target(
                    agent_name, alias, agent_config, project_root
                )
                alias_commands_dir.mkdir(parents=True, exist_ok=True)

                # For agents with inject_name, render with alias-specific frontmatter
                if agent_config.get("inject_name"):
                    alias_frontmatter = deepcopy(frontmatter)
                    # Use custom name formatter if provided (e.g., Forge's hyphenated format)
                    format_name = agent_config.get("format_name")
                    alias_frontmatter["name"] = (
                        format_name(alias) if format_name else alias
                    )

                    if alias_effective_config["extension"] == "/SKILL.md":
                        alias_output = self.render_skill_command(
                            agent_name,
                            alias_output_name,
                            alias_frontmatter,
                            body,
                            source_id,
                            cmd_file,
                            project_root,
                        )
                    elif alias_effective_config["format"] == "markdown":
                        alias_output = self.render_markdown_command(
                            alias_frontmatter, body, source_id, context_note
                        )
                    elif alias_effective_config["format"] == "toml":
                        alias_output = self.render_toml_command(
                            alias_frontmatter, body, source_id
                        )
                    elif alias_effective_config["format"] == "yaml":
                        alias_output = self.render_yaml_command(
                            alias_frontmatter, body, source_id, alias
                        )
                    else:
                        raise ValueError(
                            f"Unsupported format: {alias_effective_config['format']}"
                        )
                else:
                    # Render against the alias target, because Claude core aliases
                    # can use `.claude/commands/*.md` while extension commands use
                    # `.claude/skills/*/SKILL.md`.
                    if alias_effective_config["extension"] == "/SKILL.md":
                        alias_output = self.render_skill_command(
                            agent_name,
                            alias_output_name,
                            frontmatter,
                            body,
                            source_id,
                            cmd_file,
                            project_root,
                        )
                    elif alias_effective_config["format"] == "markdown":
                        alias_output = self.render_markdown_command(
                            frontmatter, body, source_id, context_note
                        )
                    elif alias_effective_config["format"] == "toml":
                        alias_output = self.render_toml_command(
                            frontmatter, body, source_id
                        )
                    elif alias_effective_config["format"] == "yaml":
                        alias_output = self.render_yaml_command(
                            frontmatter, body, source_id, alias
                        )
                    else:
                        raise ValueError(
                            f"Unsupported format: {alias_effective_config['format']}"
                        )

                alias_file = (
                    alias_commands_dir
                    / f"{alias_output_name}{alias_effective_config['extension']}"
                )
                try:
                    alias_file.resolve().relative_to(alias_commands_dir.resolve())
                except ValueError:
                    raise ValueError(
                        f"Alias output path escapes commands directory: {alias_file!r}"
                    )
                alias_file.parent.mkdir(parents=True, exist_ok=True)
                alias_file.write_text(alias_output, encoding="utf-8")
                if agent_name == "copilot":
                    self.write_copilot_prompt(project_root, alias)
                registered.append(alias)

        return registered

    @staticmethod
    def write_copilot_prompt(project_root: Path, cmd_name: str) -> None:
        """Generate a companion .prompt.md file for a Copilot agent command.

        Args:
            project_root: Path to project root
            cmd_name: Command name (e.g. 'speckit.my-ext.example')
        """
        prompts_dir = project_root / ".github" / "prompts"
        prompts_dir.mkdir(parents=True, exist_ok=True)
        agent_name = canonical_command_id(cmd_name)
        prompt_file = prompts_dir / f"{agent_name}.prompt.md"
        prompt_file.write_text(f"---\nagent: {agent_name}\n---\n", encoding="utf-8")

    def register_commands_for_all_agents(
        self,
        commands: List[Dict[str, Any]],
        source_id: str,
        source_dir: Path,
        project_root: Path,
        context_note: str = None,
    ) -> Dict[str, List[str]]:
        """Register commands for all detected agents in the project.

        Args:
            commands: List of command info dicts
            source_id: Identifier of the source (extension or preset ID)
            source_dir: Directory containing command source files
            project_root: Path to project root
            context_note: Custom context comment for markdown output

        Returns:
            Dictionary mapping agent names to list of registered commands
        """
        results = {}

        self._ensure_configs()
        for agent_name, agent_config in self.AGENT_CONFIGS.items():
            if any(
                agent_dir.exists()
                for agent_dir in self._agent_detection_dirs(
                    agent_name, agent_config, project_root
                )
            ):
                try:
                    registered = self.register_commands(
                        agent_name,
                        commands,
                        source_id,
                        source_dir,
                        project_root,
                        context_note=context_note,
                    )
                    if registered:
                        results[agent_name] = registered
                except ValueError:
                    continue

        return results

    def unregister_commands(
        self, registered_commands: Dict[str, List[str]], project_root: Path
    ) -> None:
        """Remove previously registered command files from agent directories.

        Args:
            registered_commands: Dict mapping agent names to command name lists
            project_root: Path to project root
        """
        self._ensure_configs()
        for agent_name, cmd_names in registered_commands.items():
            if agent_name not in self.AGENT_CONFIGS:
                continue

            agent_config = self.AGENT_CONFIGS[agent_name]

            for cmd_name in cmd_names:
                effective_config, commands_dir, output_name = self._resolve_registration_target(
                    agent_name, cmd_name, agent_config, project_root
                )
                cmd_file = commands_dir / f"{output_name}{effective_config['extension']}"
                if cmd_file.exists():
                    cmd_file.unlink()
                    # For SKILL.md agents each command lives in its own subdirectory
                    # (e.g. .agents/skills/speckit-ext-cmd/SKILL.md). Remove the
                    # parent dir when it becomes empty to avoid orphaned directories.
                    parent = cmd_file.parent
                    if parent != commands_dir and parent.exists():
                        try:
                            parent.rmdir()  # no-op if dir still has other files
                        except OSError:
                            pass

                if agent_name == "copilot":
                    prompt_file = (
                        project_root / ".github" / "prompts" / f"{cmd_name}.prompt.md"
                    )
                    if prompt_file.exists():
                        prompt_file.unlink()


# Populate AGENT_CONFIGS after class definition.
# Catches ImportError from circular imports during module loading;
# _configs_loaded stays False so the next explicit access retries.
try:
    CommandRegistrar._ensure_configs()
except ImportError:
    pass
