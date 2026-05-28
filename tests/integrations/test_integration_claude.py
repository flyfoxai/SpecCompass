"""Tests for ClaudeIntegration."""

import json
import os
from pathlib import Path
from unittest.mock import patch

import yaml

from specify_cli.command_names import CORE_COMMAND_STEMS, skill_directory_name
from specify_cli.integrations import INTEGRATION_REGISTRY, get_integration
from specify_cli.integrations.base import IntegrationBase
from specify_cli.integrations.claude import ARGUMENT_HINTS
from specify_cli.integrations.manifest import IntegrationManifest


class TestClaudeIntegration:
    def test_registered(self):
        assert "claude" in INTEGRATION_REGISTRY
        assert get_integration("claude") is not None

    def test_is_base_integration(self):
        assert isinstance(get_integration("claude"), IntegrationBase)

    def test_config_uses_skills(self):
        integration = get_integration("claude")
        assert integration.config["folder"] == ".claude/"
        assert integration.config["commands_subdir"] == "skills"

    def test_registrar_config_uses_skill_layout(self):
        integration = get_integration("claude")
        assert integration.registrar_config["dir"] == ".claude/skills"
        assert integration.registrar_config["format"] == "markdown"
        assert integration.registrar_config["args"] == "$ARGUMENTS"
        assert integration.registrar_config["extension"] == "/SKILL.md"

    def test_context_file(self):
        integration = get_integration("claude")
        assert integration.context_file == "CLAUDE.md"

    def test_setup_creates_command_files(self, tmp_path):
        integration = get_integration("claude")
        manifest = IntegrationManifest("claude", tmp_path)
        created = integration.setup(tmp_path, manifest, script_type="sh")

        command_files = [path for path in created if path.suffix == ".md"]
        assert command_files

        commands_dir = tmp_path / ".claude" / "commands"
        assert commands_dir.is_dir()

        plan_command = commands_dir / "sp.plan.md"
        assert plan_command.exists()

        content = plan_command.read_text(encoding="utf-8")
        assert "{SCRIPT}" not in content
        assert "{ARGS}" not in content
        assert "__AGENT__" not in content

        parts = content.split("---", 2)
        parsed = yaml.safe_load(parts[1])
        assert parsed["description"]
        assert parsed["user-invocable"] is True
        assert parsed["disable-model-invocation"] is False
        assert parsed["argument-hint"] == ARGUMENT_HINTS["plan"]

    def test_core_claude_commands_use_sp_prefix_and_no_core_skills(self, tmp_path):
        integration = get_integration("claude")
        manifest = IntegrationManifest("claude", tmp_path)
        integration.setup(tmp_path, manifest, script_type="sh")

        commands_dir = tmp_path / ".claude" / "commands"
        assert (commands_dir / "sp.plan.md").exists()
        assert (commands_dir / "sp.analyze.md").exists()
        assert not (commands_dir / "speckit.plan.md").exists()
        assert not (commands_dir / "speckit.analyze.md").exists()

        skills_dir = tmp_path / ".claude" / "skills"
        assert not (skills_dir / "sp-plan" / "SKILL.md").exists()
        assert not (skills_dir / "sp-analyze" / "SKILL.md").exists()
        assert not (skills_dir / "sp.plan" / "SKILL.md").exists()
        assert not (skills_dir / "sp.analyze" / "SKILL.md").exists()
        assert not (skills_dir / "speckit-plan" / "SKILL.md").exists()
        assert not (skills_dir / "speckit-analyze" / "SKILL.md").exists()

    def test_setup_removes_preexisting_core_skill_variants(self, tmp_path):
        integration = get_integration("claude")
        skills_dir = tmp_path / ".claude" / "skills"
        for name in ("sp-plan", "sp.plan", "speckit-plan", "speckit.plan"):
            skill_file = skills_dir / name / "SKILL.md"
            skill_file.parent.mkdir(parents=True, exist_ok=True)
            skill_file.write_text("stale core skill\n", encoding="utf-8")

        extension_skill = skills_dir / "speckit-git-commit" / "SKILL.md"
        extension_skill.parent.mkdir(parents=True, exist_ok=True)
        extension_skill.write_text("extension skill\n", encoding="utf-8")

        manifest = IntegrationManifest("claude", tmp_path)
        integration.setup(tmp_path, manifest, script_type="sh")

        for name in ("sp-plan", "sp.plan", "speckit-plan", "speckit.plan"):
            assert not (skills_dir / name).exists()
        assert extension_skill.exists()

    def test_setup_upserts_context_section(self, tmp_path):
        integration = get_integration("claude")
        manifest = IntegrationManifest("claude", tmp_path)
        integration.setup(tmp_path, manifest, script_type="sh")

        ctx_path = tmp_path / integration.context_file
        assert ctx_path.exists()
        content = ctx_path.read_text(encoding="utf-8")
        assert "<!-- SPECKIT START -->" in content
        assert "<!-- SPECKIT END -->" in content
        assert "read the current plan" in content

    def test_ai_flag_auto_promotes_and_enables_skills(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "claude-promote"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(
                app,
                [
                    "init",
                    "--here",
                    "--ai",
                    "claude",
                    "--script",
                    "sh",
                    "--no-git",
                    "--ignore-agent-tools",
                ],
                catch_exceptions=False,
            )
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, result.output
        assert (project / ".claude" / "commands" / "sp.plan.md").exists()
        assert not (project / ".claude" / "skills" / skill_directory_name("plan") / "SKILL.md").exists()
        assert not (project / ".claude" / "commands" / "speckit.plan.md").exists()

        init_options = json.loads(
            (project / ".specify" / "init-options.json").read_text(encoding="utf-8")
        )
        assert init_options["ai"] == "claude"
        assert init_options["ai_skills"] is True
        assert init_options["integration"] == "claude"

    def test_integration_flag_creates_command_files(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "claude-integration"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(
                app,
                [
                    "init",
                    "--here",
                    "--integration",
                    "claude",
                    "--script",
                    "sh",
                    "--no-git",
                    "--ignore-agent-tools",
                ],
                catch_exceptions=False,
            )
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, result.output
        assert (project / ".claude" / "commands" / "sp.specify.md").exists()
        assert not (project / ".claude" / "skills" / skill_directory_name("specify") / "SKILL.md").exists()
        assert (project / ".specify" / "integrations" / "claude.manifest.json").exists()

    def test_interactive_claude_selection_uses_integration_path(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "claude-interactive"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            with patch("specify_cli.select_with_arrows", return_value="claude"):
                result = runner.invoke(
                    app,
                    [
                        "init",
                        "--here",
                        "--script",
                        "sh",
                        "--no-git",
                        "--ignore-agent-tools",
                    ],
                    catch_exceptions=False,
                )
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, result.output
        assert (project / ".specify" / "integration.json").exists()
        assert (project / ".specify" / "integrations" / "claude.manifest.json").exists()

        command_file = project / ".claude" / "commands" / "sp.plan.md"
        assert command_file.exists()
        command_content = command_file.read_text(encoding="utf-8")
        assert "user-invocable: true" in command_content
        assert "disable-model-invocation: false" in command_content
        assert not (project / ".claude" / "skills" / skill_directory_name("plan") / "SKILL.md").exists()

        init_options = json.loads(
            (project / ".specify" / "init-options.json").read_text(encoding="utf-8")
        )
        assert init_options["ai"] == "claude"
        assert init_options["ai_skills"] is True
        assert init_options["integration"] == "claude"

    def test_claude_init_remains_usable_when_converter_fails(self, tmp_path):
        """Claude init should succeed even without install_ai_skills."""
        from typer.testing import CliRunner
        from specify_cli import app

        runner = CliRunner()
        target = tmp_path / "fail-proj"

        result = runner.invoke(
            app,
            ["init", str(target), "--ai", "claude", "--script", "sh", "--no-git", "--ignore-agent-tools"],
        )

        assert result.exit_code == 0
        assert (target / ".claude" / "commands" / "sp.specify.md").exists()
        assert not (target / ".claude" / "skills" / skill_directory_name("specify") / "SKILL.md").exists()

    def test_claude_hooks_render_skill_invocation(self, tmp_path):
        from specify_cli.extensions import HookExecutor

        project = tmp_path / "claude-hooks"
        project.mkdir()
        init_options = project / ".specify" / "init-options.json"
        init_options.parent.mkdir(parents=True, exist_ok=True)
        init_options.write_text(json.dumps({"ai": "claude", "ai_skills": True}))

        hook_executor = HookExecutor(project)
        message = hook_executor.format_hook_message(
            "before_plan",
            [
                {
                    "extension": "test-ext",
                    "command": "sp.plan",
                    "optional": False,
                }
            ],
        )

        assert "Executing: `/sp.plan`" in message
        assert "EXECUTE_COMMAND: sp.plan" in message
        assert "EXECUTE_COMMAND_INVOCATION: /sp.plan" in message

    def test_claude_preset_creates_new_skill_without_commands_dir(self, tmp_path):
        from specify_cli import save_init_options
        from specify_cli.presets import PresetManager

        project = tmp_path / "claude-preset-skill"
        project.mkdir()
        save_init_options(project, {"ai": "claude", "ai_skills": True, "script": "sh"})

        skills_dir = project / ".claude" / "skills"
        skills_dir.mkdir(parents=True, exist_ok=True)

        preset_dir = tmp_path / "claude-skill-command"
        preset_dir.mkdir()
        (preset_dir / "commands").mkdir()
        (preset_dir / "commands" / "speckit.research.md").write_text(
            "---\n"
            "description: Research workflow\n"
            "---\n\n"
            "preset:claude-skill-command\n"
        )
        manifest_data = {
            "schema_version": "1.0",
            "preset": {
                "id": "claude-skill-command",
                "name": "Claude Skill Command",
                "version": "1.0.0",
                "description": "Test",
            },
            "requires": {"speckit_version": ">=0.1.0"},
            "provides": {
                "templates": [
                    {
                        "type": "command",
                        "name": "speckit.research",
                        "file": "commands/speckit.research.md",
                    }
                ]
            },
        }
        with open(preset_dir / "preset.yml", "w") as f:
            yaml.dump(manifest_data, f)

        manager = PresetManager(project)
        manager.install_from_directory(preset_dir, "0.1.5")

        skill_file = skills_dir / "speckit-research" / "SKILL.md"
        assert skill_file.exists()
        content = skill_file.read_text(encoding="utf-8")
        assert "preset:claude-skill-command" in content
        assert "name: speckit-research" in content
        assert "user-invocable: true" in content
        assert "disable-model-invocation: false" in content
        parsed = yaml.safe_load(content.split("---", 2)[1])
        assert "argument-hint" not in parsed

        metadata = manager.registry.get("claude-skill-command")
        assert "speckit-research" in metadata.get("registered_skills", [])


class TestClaudeArgumentHints:
    """Verify that argument-hint frontmatter is injected for Claude commands."""

    def test_all_commands_have_hints(self, tmp_path):
        """Every generated command file must contain an argument-hint line."""
        i = get_integration("claude")
        m = IntegrationManifest("claude", tmp_path)
        created = i.setup(tmp_path, m, script_type="sh")
        command_files = [f for f in created if f.parent.name == "commands" and f.suffix == ".md"]
        assert len(command_files) > 0
        for f in command_files:
            content = f.read_text(encoding="utf-8")
            assert "argument-hint:" in content, (
                f"{f.name} is missing argument-hint frontmatter"
            )

    def test_argument_hints_match_core_command_stems(self):
        """Claude hints should stay aligned with the bundled core command set."""
        assert set(ARGUMENT_HINTS) == set(CORE_COMMAND_STEMS)

    def test_hints_match_expected_values(self, tmp_path):
        """Each skill's argument-hint must match the expected text."""
        i = get_integration("claude")
        m = IntegrationManifest("claude", tmp_path)
        created = i.setup(tmp_path, m, script_type="sh")
        command_files = [f for f in created if f.parent.name == "commands" and f.suffix == ".md"]
        for f in command_files:
            stem = f.stem.removeprefix("sp.")
            expected_hint = ARGUMENT_HINTS.get(stem)
            assert expected_hint is not None, (
                f"No expected hint defined for command '{stem}'"
            )
            content = f.read_text(encoding="utf-8")
            parts = content.split("---", 2)
            assert len(parts) >= 3, f"No frontmatter in {f.name}"
            parsed = yaml.safe_load(parts[1])
            assert parsed["argument-hint"] == expected_hint, (
                f"{f.name}: expected hint '{expected_hint}' "
                f"but found {parsed.get('argument-hint')!r}"
            )

    def test_hint_is_inside_frontmatter(self, tmp_path):
        """argument-hint must appear between the --- delimiters, not in the body."""
        i = get_integration("claude")
        m = IntegrationManifest("claude", tmp_path)
        created = i.setup(tmp_path, m, script_type="sh")
        command_files = [f for f in created if f.parent.name == "commands" and f.suffix == ".md"]
        for f in command_files:
            content = f.read_text(encoding="utf-8")
            parts = content.split("---", 2)
            assert len(parts) >= 3, f"No frontmatter in {f.name}"
            frontmatter = parts[1]
            body = parts[2]
            assert "argument-hint:" in frontmatter, (
                f"{f.name}: argument-hint not in frontmatter section"
            )
            assert "argument-hint:" not in body, (
                f"{f.name}: argument-hint leaked into body"
            )

    def test_hint_appears_after_description(self, tmp_path):
        """argument-hint must immediately follow the description line."""
        i = get_integration("claude")
        m = IntegrationManifest("claude", tmp_path)
        created = i.setup(tmp_path, m, script_type="sh")
        command_files = [f for f in created if f.parent.name == "commands" and f.suffix == ".md"]
        for f in command_files:
            content = f.read_text(encoding="utf-8")
            lines = content.splitlines()
            found_description = False
            for idx, line in enumerate(lines):
                if line.startswith("description:"):
                    found_description = True
                    assert idx + 1 < len(lines), (
                        f"{f.name}: description is last line"
                    )
                    assert lines[idx + 1].startswith("argument-hint:"), (
                        f"{f.name}: argument-hint does not follow description"
                    )
                    break
            assert found_description, (
                f"{f.name}: no description: line found in output"
            )

    def test_inject_argument_hint_only_in_frontmatter(self):
        """inject_argument_hint must not modify description: lines in the body."""
        from specify_cli.integrations.claude import ClaudeIntegration

        content = (
            "---\n"
            "description: My command\n"
            "---\n"
            "\n"
            "description: this is body text\n"
        )
        result = ClaudeIntegration.inject_argument_hint(content, "Test hint")
        lines = result.splitlines()
        hint_count = sum(1 for ln in lines if ln.startswith("argument-hint:"))
        assert hint_count == 1, (
            f"Expected exactly 1 argument-hint line, found {hint_count}"
        )

    def test_inject_argument_hint_skips_if_already_present(self):
        """inject_argument_hint must not duplicate if argument-hint already exists."""
        from specify_cli.integrations.claude import ClaudeIntegration

        content = (
            "---\n"
            "description: My command\n"
            'argument-hint: "Existing hint"\n'
            "---\n"
            "\n"
            "Body text\n"
        )
        result = ClaudeIntegration.inject_argument_hint(content, "New hint")
        assert result == content, "Content should be unchanged when hint already exists"
        lines = result.splitlines()
        hint_count = sum(1 for ln in lines if ln.startswith("argument-hint:"))
        assert hint_count == 1


class TestClaudeDisableModelInvocation:
    """Verify disable-model-invocation is false for Claude commands."""

    def test_setup_sets_disable_model_invocation_false(self, tmp_path):
        """Generated command files must have disable-model-invocation: false."""
        i = get_integration("claude")
        m = IntegrationManifest("claude", tmp_path)
        created = i.setup(tmp_path, m, script_type="sh")
        command_files = [f for f in created if f.parent.name == "commands" and f.suffix == ".md"]
        assert len(command_files) > 0
        for f in command_files:
            content = f.read_text(encoding="utf-8")
            parts = content.split("---", 2)
            parsed = yaml.safe_load(parts[1])
            assert parsed["disable-model-invocation"] is False, (
                f"{f.name}: expected disable-model-invocation: false"
            )

    def test_disable_model_invocation_not_true(self, tmp_path):
        """No Claude command should have disable-model-invocation: true."""
        i = get_integration("claude")
        m = IntegrationManifest("claude", tmp_path)
        created = i.setup(tmp_path, m, script_type="sh")
        for f in created:
            if f.parent.name != "commands" or f.suffix != ".md":
                continue
            content = f.read_text(encoding="utf-8")
            assert "disable-model-invocation: true" not in content, (
                f"{f.name}: must not have disable-model-invocation: true"
            )

    def test_non_claude_agents_lack_disable_model_invocation(self, tmp_path):
        """Non-Claude skill agents should not get disable-model-invocation."""
        from specify_cli.agents import CommandRegistrar

        fm = CommandRegistrar.build_skill_frontmatter(
            "codex", "speckit-plan", "desc", "templates/commands/plan.md"
        )
        assert "disable-model-invocation" not in fm
        assert "user-invocable" not in fm

    def test_non_claude_post_process_is_identity(self, tmp_path):
        """Non-Claude integrations should not modify skill content."""
        codex = get_integration("codex")
        if codex is None:
            return  # codex not registered in this build
        content = "---\nname: test\n---\nBody"
        assert codex.post_process_skill_content(content) == content


class TestClaudeHookCommandNote:
    """Verify dot-to-hyphen normalization note is injected in hook sections."""

    def test_hook_note_injected_in_commands_with_hooks(self, tmp_path):
        """Every command generated from a hook template should get the normalization note."""
        i = get_integration("claude")
        m = IntegrationManifest("claude", tmp_path)
        i.setup(tmp_path, m, script_type="sh")

        commands_dir = Path(__file__).resolve().parents[2] / "templates" / "commands"
        hook_templates = [
            command_file.stem
            for command_file in commands_dir.glob("*.md")
            if "- For each executable hook, output the following" in command_file.read_text(encoding="utf-8")
        ]
        assert hook_templates

        for stem in hook_templates:
            command_file = tmp_path / ".claude" / "commands" / f"sp.{stem}.md"
            assert command_file.exists()
            content = command_file.read_text(encoding="utf-8")
            assert "extension hook skill lookup" in content, (
                f"sp.{stem}.md should have extension hook skill lookup note"
            )
            assert "/speckit-git-commit" not in content

    def test_hook_note_not_in_skills_without_hooks(self, tmp_path):
        """Skills without hook sections should not get the note."""
        from specify_cli.integrations.claude import ClaudeIntegration

        content = "---\nname: test\ndescription: test\n---\n\nNo hooks here.\n"
        result = ClaudeIntegration._inject_hook_command_note(content)
        assert "extension hook skill lookup" not in result

    def test_hook_note_idempotent(self, tmp_path):
        """Injecting the note twice should not duplicate it."""
        from specify_cli.integrations.claude import ClaudeIntegration

        content = (
            "---\nname: test\n---\n\n"
            "- For each executable hook, output the following based on its flag:\n"
        )
        once = ClaudeIntegration._inject_hook_command_note(content)
        twice = ClaudeIntegration._inject_hook_command_note(once)
        assert once == twice, "Hook note injection should be idempotent"

    def test_hook_note_preserves_indentation(self, tmp_path):
        """The injected note should match the indentation of the target line."""
        from specify_cli.integrations.claude import ClaudeIntegration

        content = (
            "---\nname: test\n---\n\n"
            "   - For each executable hook, output the following\n"
        )
        result = ClaudeIntegration._inject_hook_command_note(content)
        lines = result.splitlines()
        note_line = [l for l in lines if "extension hook skill lookup" in l][0]
        assert note_line.startswith("   "), "Note should preserve indentation"

    def test_post_process_injects_invocable_claude_flags_by_default(self):
        """post_process_skill_content keeps extension/preset skills user-invocable."""
        i = get_integration("claude")
        content = (
            "---\nname: test\ndescription: test\n---\n\n"
            "- For each executable hook, output the following\n"
        )
        result = i.post_process_skill_content(content)
        assert "user-invocable: true" in result
        assert "disable-model-invocation: false" in result
        assert "extension hook skill lookup" in result
        assert "use `/sp.*` for core SP commands" in result
        assert "/speckit-git-commit" not in result

    def test_post_process_can_hide_core_skills_from_claude_slash_menu(self):
        """Core SP skills should be hidden when companion sp.* commands exist."""
        i = get_integration("claude")
        content = (
            "---\nname: sp.plan\ndescription: test\nuser-invocable: true\n---\n\n"
            "Body\n"
        )
        result = i.post_process_skill_content(content, user_invocable=False)
        parsed = yaml.safe_load(result.split("---", 2)[1])
        assert "user-invocable" not in parsed
        assert parsed["disable-model-invocation"] is False
