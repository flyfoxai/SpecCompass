"""Tests for CodexIntegration."""

import subprocess

from specify_cli.command_names import skill_directory_name

from .test_integration_base_skills import SkillsIntegrationTests


class TestCodexIntegration(SkillsIntegrationTests):
    KEY = "codex"
    FOLDER = ".agents/"
    COMMANDS_SUBDIR = "skills"
    REGISTRAR_DIR = ".agents/skills"
    CONTEXT_FILE = "AGENTS.md"

    def _expected_files(self, script_variant: str) -> list[str]:
        files = super()._expected_files(script_variant)
        for command in self._SKILL_COMMANDS:
            files.append(f".agents/plugins/plugins/sp/commands/sp.{command}.md")
        files.extend(
            [
                ".agents/plugins/marketplace.json",
                ".agents/plugins/CODEX_PLUGIN_REGISTRATION.md",
                ".agents/plugins/plugins/sp/.codex-plugin/plugin.json",
            ]
        )
        return sorted(files)

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
        assert "/prompt::sp.<name>" in content
        assert "verify actual slash-menu visibility" in content
        prompt_file = tmp_path / ".codex" / "prompts" / "sp.analyze.md"
        assert prompt_file.exists()
        prompt_content = prompt_file.read_text(encoding="utf-8")
        assert "# /sp.analyze" in prompt_content
        assert "{SCRIPT}" not in prompt_content
        assert "{ARGS}" not in prompt_content
        assert "__AGENT__" not in prompt_content
        plugin_command = tmp_path / ".agents" / "plugins" / "plugins" / "sp" / "commands" / "sp.analyze.md"
        assert plugin_command.exists()
        plugin_content = plugin_command.read_text(encoding="utf-8")
        assert "# /sp.analyze" in plugin_content
        assert "{SCRIPT}" not in plugin_content
        assert "{ARGS}" not in plugin_content
        assert "__AGENT__" not in plugin_content
        assert (tmp_path / ".agents" / "plugins" / "plugins" / "sp" / ".codex-plugin" / "plugin.json").exists()
        marketplace = tmp_path / ".agents" / "plugins" / "marketplace.json"
        assert marketplace.exists()
        assert "sp-local-" in marketplace.read_text(encoding="utf-8")
        report = tmp_path / ".agents" / "plugins" / "CODEX_PLUGIN_REGISTRATION.md"
        assert report.exists()
        report_content = report.read_text(encoding="utf-8")
        assert "manual-registration-required" in report_content
        assert "Run manually:" in report_content
        assert not (tmp_path / ".codex" / "skills" / "sp.analyze" / "SKILL.md").exists()
        assert not (tmp_path / ".codex" / "commands" / "sp.analyze.md").exists()
        assert not (tmp_path / ".codex" / "skills" / "speckit-analyze").exists()
        assert not (tmp_path / ".codex" / "commands" / "speckit.analyze.md").exists()
        assert not (tmp_path / ".codex" / "prompts" / "speckit.analyze.md").exists()

    def test_codex_setup_removes_obsolete_project_local_codex_surfaces(self, tmp_path):
        from specify_cli.integrations import get_integration
        from specify_cli.integrations.manifest import IntegrationManifest

        stale_files = [
            tmp_path / ".codex" / "commands" / "sp.plan.md",
            tmp_path / ".codex" / "commands" / "sp-plan.md",
            tmp_path / ".codex" / "commands" / "speckit.plan.md",
            tmp_path / ".codex" / "prompts" / "sp-plan.md",
            tmp_path / ".codex" / "prompts" / "speckit.plan.md",
            tmp_path / ".codex" / "prompts" / "speckit-plan.md",
            tmp_path / ".agents" / "plugins" / "plugins" / "sp" / "commands" / "sp-plan.md",
            tmp_path / ".agents" / "plugins" / "plugins" / "sp" / "commands" / "speckit.plan.md",
            tmp_path / ".agents" / "plugins" / "plugins" / "sp" / "commands" / "speckit-plan.md",
            tmp_path / ".agents" / "plugins" / ".agents" / "plugins" / "marketplace.json",
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

        generated_prompt = tmp_path / ".codex" / "prompts" / "sp.plan.md"
        assert generated_prompt.exists()
        assert "# /sp.plan" in generated_prompt.read_text(encoding="utf-8")

        for path in stale_files:
            assert not path.exists(), f"stale Codex file survived: {path}"
        for stale_skill in stale_skill_dirs:
            assert not stale_skill.exists()
        assert foreign.exists()

    def test_codex_registration_removes_only_stale_sp_local_marketplaces(self, tmp_path, monkeypatch):
        from specify_cli.integrations import get_integration

        old_root = tmp_path / "old-sp"
        old_manifest = old_root / "plugins" / "sp" / ".codex-plugin" / "plugin.json"
        old_manifest.parent.mkdir(parents=True)
        old_manifest.write_text('{"name": "sp"}\n', encoding="utf-8")

        foreign_root = tmp_path / "foreign"
        foreign_root.mkdir()

        calls: list[list[str]] = []

        def fake_run(command, capture_output=True, text=True, timeout=60):
            calls.append(command)
            if command[1:] == ["plugin", "marketplace", "list"]:
                return subprocess.CompletedProcess(
                    command,
                    0,
                    stdout=(
                        f"sp-local-old\t{old_root}\n"
                        f"sp-local-current\t{tmp_path / 'current'}\n"
                        f"sp-local-foreign\t{foreign_root}\n"
                        f"other-market\t{tmp_path / 'other'}\n"
                    ),
                    stderr="",
                )
            return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

        monkeypatch.setattr("specify_cli.integrations.codex.subprocess.run", fake_run)
        monkeypatch.setattr("specify_cli.integrations.codex.shutil.which", lambda name: "/usr/bin/codex")

        success, details = get_integration("codex")._register_codex_plugin(
            tmp_path / "current",
            "sp-local-current",
        )

        assert success
        assert "sp-local-old" in details
        assert "target `/prompt::sp.*`" in details
        assert "verify slash-menu visibility" in details
        assert ["/usr/bin/codex", "plugin", "remove", "sp@sp-local-old"] in calls
        assert ["/usr/bin/codex", "plugin", "marketplace", "remove", "sp-local-old"] in calls
        assert ["/usr/bin/codex", "plugin", "remove", "sp@sp-local-current"] not in calls
        assert ["/usr/bin/codex", "plugin", "remove", "sp@sp-local-foreign"] not in calls
        assert ["/usr/bin/codex", "plugin", "marketplace", "remove", "other-market"] not in calls
        assert [
            "/usr/bin/codex",
            "plugin",
            "marketplace",
            "add",
            str((tmp_path / "current" / ".agents" / "plugins").resolve()),
        ] in calls
        assert ["/usr/bin/codex", "plugin", "add", "sp@sp-local-current"] in calls

    def test_codex_registration_removes_broken_stale_sp_local_marketplace(self, tmp_path, monkeypatch):
        from specify_cli.integrations import get_integration

        calls: list[list[str]] = []
        missing_root = tmp_path / "missing-sp"

        def fake_run(command, capture_output=True, text=True, timeout=60):
            calls.append(command)
            if command[1:] == ["plugin", "marketplace", "list"]:
                return subprocess.CompletedProcess(
                    command,
                    0,
                    stdout=f"sp-local-broken\t{missing_root}\n",
                    stderr="",
                )
            return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

        monkeypatch.setattr("specify_cli.integrations.codex.subprocess.run", fake_run)
        monkeypatch.setattr("specify_cli.integrations.codex.shutil.which", lambda name: "/usr/bin/codex")

        success, details = get_integration("codex")._register_codex_plugin(
            tmp_path / "current",
            "sp-local-current",
        )

        assert success
        assert "sp-local-broken" in details
        assert ["/usr/bin/codex", "plugin", "remove", "sp@sp-local-broken"] in calls
        assert ["/usr/bin/codex", "plugin", "marketplace", "remove", "sp-local-broken"] in calls


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
        assert (target / ".agents" / "plugins" / "plugins" / "sp" / "commands" / "sp.plan.md").exists()
        assert (target / ".agents" / "plugins" / "marketplace.json").exists()
        report = target / ".agents" / "plugins" / "CODEX_PLUGIN_REGISTRATION.md"
        assert report.exists()
        assert "manual-registration-required" in report.read_text(encoding="utf-8")
