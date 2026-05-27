"""Tests for CodexIntegration."""

from specify_cli.command_names import skill_directory_name

from .test_integration_base_skills import SkillsIntegrationTests


class TestCodexIntegration(SkillsIntegrationTests):
    KEY = "codex"
    FOLDER = ".agents/"
    COMMANDS_SUBDIR = "skills"
    REGISTRAR_DIR = ".agents/skills"
    CONTEXT_FILE = "AGENTS.md"

    def test_codex_installs_user_visible_sp_dot_commands(self, tmp_path):
        from specify_cli.integrations import get_integration
        from specify_cli.integrations.manifest import IntegrationManifest

        integration = get_integration("codex")
        manifest = IntegrationManifest("codex", tmp_path)
        integration.setup(tmp_path, manifest, script_type="sh")

        assert (tmp_path / ".agents" / "skills" / "sp.analyze" / "SKILL.md").exists()
        assert (tmp_path / ".codex" / "skills" / "sp.analyze" / "SKILL.md").exists()
        assert (tmp_path / ".codex" / "commands" / "sp.analyze.md").exists()
        assert (tmp_path / ".codex" / "prompts" / "sp.analyze.md").exists()
        assert not (tmp_path / ".codex" / "skills" / "sp-analyze").exists()
        assert not (tmp_path / ".codex" / "skills" / "speckit-analyze").exists()
        assert not (tmp_path / ".codex" / "commands" / "speckit.analyze.md").exists()
        assert not (tmp_path / ".codex" / "prompts" / "speckit.analyze.md").exists()


class TestCodexAutoPromote:
    """--ai codex auto-promotes to integration path."""

    def test_ai_codex_without_ai_skills_auto_promotes(self, tmp_path):
        """--ai codex should work the same as --integration codex."""
        from typer.testing import CliRunner
        from specify_cli import app

        runner = CliRunner()
        target = tmp_path / "test-proj"
        result = runner.invoke(app, ["init", str(target), "--ai", "codex", "--no-git", "--ignore-agent-tools", "--script", "sh"])

        assert result.exit_code == 0, f"init --ai codex failed: {result.output}"
        assert (target / ".agents" / "skills" / skill_directory_name("plan") / "SKILL.md").exists()
        assert (target / ".codex" / "skills" / skill_directory_name("plan") / "SKILL.md").exists()
