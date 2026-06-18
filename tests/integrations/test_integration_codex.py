"""Tests for CodexIntegration."""

from specify_cli.command_names import skill_directory_name

from .test_integration_base_skills import SkillsIntegrationTests


class TestCodexIntegration(SkillsIntegrationTests):
    KEY = "codex"
    FOLDER = ".agents/"
    COMMANDS_SUBDIR = "skills"
    REGISTRAR_DIR = ".agents/skills"
    CONTEXT_FILE = "AGENTS.md"

    def _expected_files(self, script_variant: str) -> list[str]:
        return super()._expected_files(script_variant)

    def test_codex_installs_user_visible_sp_dot_commands(self, tmp_path):
        from specify_cli.integrations import get_integration
        from specify_cli.integrations.manifest import IntegrationManifest

        integration = get_integration("codex")
        manifest = IntegrationManifest("codex", tmp_path)
        integration.setup(tmp_path, manifest, script_type="sh")

        skill_file = tmp_path / ".agents" / "skills" / "sp-analyze" / "SKILL.md"
        assert skill_file.exists()
        content = skill_file.read_text(encoding="utf-8")
        assert "name: sp-analyze" in content
        assert "Codex uses skills as the stable entry point" in content
        assert "/prompt::sp" not in content
        assert not (tmp_path / ".codex" / "prompts" / "sp.analyze.md").exists()
        assert not (tmp_path / "plugins" / "sp" / "commands" / "sp.analyze.md").exists()
        assert not (tmp_path / "plugins" / "sp" / ".codex-plugin" / "plugin.json").exists()
        assert not (tmp_path / ".agents" / "plugins" / "marketplace.json").exists()
        assert not (tmp_path / ".agents" / "plugins" / "CODEX_PLUGIN_REGISTRATION.md").exists()
        assert not (tmp_path / ".codex" / "skills" / "sp.analyze" / "SKILL.md").exists()
        assert not (tmp_path / ".codex" / "commands" / "sp.analyze.md").exists()
        assert not (tmp_path / ".codex" / "skills" / "speckit-analyze").exists()
        assert not (tmp_path / ".codex" / "commands" / "speckit.analyze.md").exists()
        assert not (tmp_path / ".codex" / "prompts" / "speckit.analyze.md").exists()

    def test_codex_installs_route_skill_as_thin_script_wrapper(self, tmp_path):
        from specify_cli.integrations import get_integration
        from specify_cli.integrations.manifest import IntegrationManifest

        integration = get_integration("codex")
        manifest = IntegrationManifest("codex", tmp_path)
        integration.setup(tmp_path, manifest, script_type="sh")

        skill_file = tmp_path / ".agents" / "skills" / "sp-route" / "SKILL.md"
        assert skill_file.exists()
        content = skill_file.read_text(encoding="utf-8")
        assert "name: sp-route" in content
        assert "sp-route.sh --json" in content
        assert "deterministic" in content
        assert "Do not auto-execute" in content

    def test_codex_setup_removes_obsolete_project_local_codex_surfaces(self, tmp_path):
        from specify_cli.integrations import get_integration
        from specify_cli.integrations.manifest import IntegrationManifest

        stale_files = [
            tmp_path / ".codex" / "commands" / "sp.plan.md",
            tmp_path / ".codex" / "commands" / "sp-plan.md",
            tmp_path / ".codex" / "commands" / "speckit.plan.md",
            tmp_path / ".codex" / "prompts" / "sp.plan.md",
            tmp_path / ".codex" / "prompts" / "sp-plan.md",
            tmp_path / ".codex" / "prompts" / "speckit.plan.md",
            tmp_path / ".codex" / "prompts" / "speckit-plan.md",
            tmp_path / "plugins" / "sp" / "commands" / "sp.plan.md",
            tmp_path / "plugins" / "sp" / "commands" / "sp-plan.md",
            tmp_path / "plugins" / "sp" / "commands" / "speckit.plan.md",
            tmp_path / "plugins" / "sp" / "commands" / "speckit-plan.md",
            tmp_path / ".agents" / "plugins" / "plugins" / "sp" / "commands" / "sp.plan.md",
            tmp_path / ".agents" / "plugins" / "plugins" / "sp" / "commands" / "sp-plan.md",
            tmp_path / ".agents" / "plugins" / "plugins" / "sp" / "commands" / "speckit.plan.md",
            tmp_path / ".agents" / "plugins" / "plugins" / "sp" / "commands" / "speckit-plan.md",
        ]
        for path in stale_files:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("stale generated command\n", encoding="utf-8")

        stale_skill_dirs = [
            tmp_path / ".codex" / "skills" / "sp.plan",
            tmp_path / ".codex" / "skills" / "sp-plan",
            tmp_path / ".codex" / "skills" / "speckit-plan",
            tmp_path / ".agents" / "skills" / "sp.plan",
            tmp_path / ".agents" / "skills" / "speckit-plan",
            tmp_path / ".agents" / "skills" / "speckit.plan",
        ]
        for stale_skill in stale_skill_dirs:
            (stale_skill / "SKILL.md").parent.mkdir(parents=True, exist_ok=True)
            (stale_skill / "SKILL.md").write_text("stale generated skill\n", encoding="utf-8")
        foreign = tmp_path / ".codex" / "skills" / "my-skill" / "SKILL.md"
        foreign.parent.mkdir(parents=True, exist_ok=True)
        foreign.write_text("user skill\n", encoding="utf-8")

        integration = get_integration("codex")
        integration.setup(tmp_path, IntegrationManifest("codex", tmp_path), script_type="sh")

        for path in stale_files:
            assert not path.exists(), f"stale Codex file survived: {path}"
        for stale_skill in stale_skill_dirs:
            assert not stale_skill.exists()
        assert foreign.exists()


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
        assert not (target / ".codex" / "prompts" / "sp.plan.md").exists()
        assert not (target / "plugins" / "sp" / "commands" / "sp.plan.md").exists()
        assert not (target / ".agents" / "plugins" / "marketplace.json").exists()
        assert not (target / ".agents" / "plugins" / "CODEX_PLUGIN_REGISTRATION.md").exists()
