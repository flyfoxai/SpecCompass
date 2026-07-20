"""Tests for CodexIntegration."""

from specify_cli.command_names import CORE_COMMAND_STEMS, skill_directory_name

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

    def test_codex_installs_lite_as_a_core_skill(self, tmp_path):
        from specify_cli.integrations import get_integration
        from specify_cli.integrations.manifest import IntegrationManifest

        assert "lite" in CORE_COMMAND_STEMS
        integration = get_integration("codex")
        manifest = IntegrationManifest("codex", tmp_path)
        integration.setup(tmp_path, manifest, script_type="sh")

        skill_file = tmp_path / ".agents" / "skills" / "sp-lite" / "SKILL.md"
        assert skill_file.exists()
        assert "sp-lite-state.sh --json" in skill_file.read_text(encoding="utf-8")

    def test_codex_installs_prd_level_one_product_decomposition_contract(self, tmp_path):
        from specify_cli.integrations import get_integration
        from specify_cli.integrations.manifest import IntegrationManifest

        integration = get_integration("codex")
        manifest = IntegrationManifest("codex", tmp_path)
        integration.setup(tmp_path, manifest, script_type="sh")

        skill_file = tmp_path / ".agents" / "skills" / skill_directory_name("prd") / "SKILL.md"
        assert skill_file.exists()
        content = skill_file.read_text(encoding="utf-8")
        assert "Stage C - run the semantic quality gate" in content
        assert "candidate subprojects" in content
        assert "Subproject Handoff" in content
        assert "Product decomposition is independent from runtime topology" in content
        assert "Transactional consistency or bidirectional business exchange requires classification" in content
        assert "regulation, contract, or multi-party legal duty" in content
        assert "published service commitment" not in content
        assert "Never use runtime topology as an advantage, disadvantage, option-comparison dimension" in content
        assert "make confirmation of that split the default recommendation" in content
        assert "private compilation work" in content
        assert "source_capability_coverage serialized in this Stage is NOT private" in content
        assert "Generic implementation components" in content
        assert "final visible-copy sanitization pass" in content
        assert "do not announce that sanitization occurred" in content
        assert "Do not route them to `/sp.clarify` merely because the split is unconfirmed" in content
        assert "use `NEXT_COMMAND_EXEC: None` until the downloaded response exists" in content
        assert "do not silently replace it and do not canonize it" in content
        assert "show the original proposal beside one source-backed business alternative" in content
        assert "must not use Constitution content as business evidence" in content
        assert "Level 1 owns portfolio decomposition" in content
        assert "Allocate every source-backed capability atom exactly once" in content
        assert "one capability atom, one business chain, and one candidate project" in content
        assert "must not merge atoms during initial Level 1 generation" in content
        assert "Merging is a user decision option" in content
        assert "normal fact capture and interruption recovery remain separate chains" in content.lower()
        assert "parameter or rule change governance remains separate" in content.lower()
        assert "primary_outcome_ref" in content
        assert "trigger_kind" in content
        assert "Level 2 owns child-project framing" in content
        assert "for a retained one-product decision" in content
        assert "confirmed parent PRD" in content
        assert "target the confirmed retained-product scope" in content
        assert "silently merge children in Level 2" in content
        assert "exactly one confirmed `Subproject Handoff`" in content
        assert "Level 3 is a source-preserving compilation" in content
        assert "must not create, merge, split, or reinterpret business facts" in content
        assert "cross-domain substitution test" in content
        assert "Apply the cross-domain substitution test to every chain" in content
        assert "warning signal, not a boundary decision" in content
        assert "external business obligation" in content
        assert "QMT" not in content
        assert "up to three cohesive business capability branches" not in content

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
