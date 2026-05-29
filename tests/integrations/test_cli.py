"""Tests for --integration flag on specify init (CLI-level)."""

import json
import os

import yaml

from specify_cli.command_names import command_filename_base, skill_directory_name
from tests.conftest import strip_ansi


def _normalize_cli_output(output: str) -> str:
    output = strip_ansi(output)
    output = " ".join(output.split())
    return output.strip()


class TestInitIntegrationFlag:
    def test_integration_and_ai_mutually_exclusive(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app
        runner = CliRunner()
        result = runner.invoke(app, [
            "init", str(tmp_path / "test-project"), "--ai", "claude", "--integration", "copilot",
        ])
        assert result.exit_code != 0
        assert "mutually exclusive" in result.output

    def test_unknown_integration_rejected(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app
        runner = CliRunner()
        result = runner.invoke(app, [
            "init", str(tmp_path / "test-project"), "--integration", "nonexistent",
        ])
        assert result.exit_code != 0
        assert "Unknown integration" in result.output

    def test_integration_copilot_creates_files(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app
        runner = CliRunner()
        project = tmp_path / "int-test"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            result = runner.invoke(app, [
                "init", "--here", "--integration", "copilot", "--script", "sh", "--no-git",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)
        assert result.exit_code == 0, f"init failed: {result.output}"
        assert (project / ".github" / "agents" / f"{command_filename_base('plan')}.agent.md").exists()
        assert (project / ".github" / "prompts" / f"{command_filename_base('plan')}.prompt.md").exists()
        assert (project / ".specify" / "scripts" / "bash" / "common.sh").exists()

        data = json.loads((project / ".specify" / "integration.json").read_text(encoding="utf-8"))
        assert data["integration"] == "copilot"

        opts = json.loads((project / ".specify" / "init-options.json").read_text(encoding="utf-8"))
        assert opts["integration"] == "copilot"
        assert opts["context_file"] == ".github/copilot-instructions.md"

        assert (project / ".specify" / "integrations" / "copilot.manifest.json").exists()

        # Context section should be upserted into the copilot instructions file
        ctx_file = project / ".github" / "copilot-instructions.md"
        assert ctx_file.exists()
        ctx_content = ctx_file.read_text(encoding="utf-8")
        assert "<!-- SPECKIT START -->" in ctx_content
        assert "<!-- SPECKIT END -->" in ctx_content

        shared_manifest = project / ".specify" / "integrations" / "speckit.manifest.json"
        assert shared_manifest.exists()

    def test_integration_codex_here_smoke_uses_skills_only(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app

        runner = CliRunner()
        project = tmp_path / "codex-smoke"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            result = runner.invoke(app, [
                "init",
                "--here",
                "--integration",
                "codex",
                "--script",
                "sh",
                "--no-git",
                "--ignore-agent-tools",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        normalized_output = _normalize_cli_output(result.output)
        assert result.exit_code == 0, result.output
        assert "SP skills were installed to" in normalized_output
        assert ".agents/skills" in normalized_output
        assert "$sp-specify" in normalized_output
        assert "$sp-plan" in normalized_output
        assert "$sp-analyze" in normalized_output
        assert "/prompt::sp" not in normalized_output
        assert "slash-menu visibility" not in normalized_output
        assert "/sp-" not in normalized_output

        for command in ("specify", "plan", "analyze"):
            skill_file = project / ".agents" / "skills" / skill_directory_name(command) / "SKILL.md"
            assert skill_file.exists()
            assert "/sp-" not in skill_file.read_text(encoding="utf-8")

        assert not (project / ".codex" / "prompts" / "sp.analyze.md").exists()
        assert not (project / "plugins" / "sp" / "commands" / "sp.analyze.md").exists()
        assert not (project / ".agents" / "plugins" / "marketplace.json").exists()
        assert (project / ".specify" / "memory" / "constitution.md").exists()
        assert (project / ".specify" / "templates" / "feature" / "memory" / "open-items.md").exists()
        assert (project / ".specify" / "templates" / "feature" / "memory" / "trace-index.md").exists()

    def test_ai_copilot_auto_promotes(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app
        project = tmp_path / "promote-test"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init", "--here", "--ai", "copilot", "--script", "sh", "--no-git",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)
        assert result.exit_code == 0
        assert (project / ".github" / "agents" / f"{command_filename_base('plan')}.agent.md").exists()

    def test_ai_emits_deprecation_warning_with_integration_replacement(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "warn-ai"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init", "--here", "--ai", "copilot", "--script", "sh", "--no-git",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        normalized_output = _normalize_cli_output(result.output)
        assert result.exit_code == 0, result.output
        assert "Deprecation Warning" in normalized_output
        assert "--ai" in normalized_output
        assert "deprecated" in normalized_output
        assert "no longer be available" in normalized_output
        assert "1.0.0" in normalized_output
        assert "--integration copilot" in normalized_output
        assert normalized_output.index("Deprecation Warning") < normalized_output.index("Next Steps")
        assert (project / ".github" / "agents" / f"{command_filename_base('plan')}.agent.md").exists()

    def test_ai_generic_warning_suggests_integration_options_equivalent(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "warn-generic"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init", "--here", "--ai", "generic", "--ai-commands-dir", ".myagent/commands",
                "--script", "sh", "--no-git",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        normalized_output = _normalize_cli_output(result.output)
        assert result.exit_code == 0, result.output
        assert "Deprecation Warning" in normalized_output
        assert "--integration generic" in normalized_output
        assert "--integration-options" in normalized_output
        assert ".myagent/commands" in normalized_output
        assert normalized_output.index("Deprecation Warning") < normalized_output.index("Next Steps")
        assert (project / ".myagent" / "commands" / f"{command_filename_base('plan')}.md").exists()

    def test_ai_claude_here_preserves_preexisting_commands(self, tmp_path):
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "claude-here-existing"
        project.mkdir()
        legacy_skill = project / ".claude" / "skills" / skill_directory_name("specify") / "SKILL.md"
        legacy_skill.parent.mkdir(parents=True)
        legacy_skill.write_text("# preexisting skill command\n", encoding="utf-8")

        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init", "--here", "--force", "--ai", "claude", "--ai-skills", "--script", "sh", "--no-git", "--ignore-agent-tools",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, result.output
        command_file = project / ".claude" / "commands" / "sp.specify.md"
        assert command_file.exists()
        assert not legacy_skill.exists()
        assert "sp.specify" in command_file.read_text(encoding="utf-8")
        assert (project / ".claude" / "commands" / "sp.plan.md").exists()

    def test_shared_infra_force_refreshes_existing_framework_files(self, tmp_path):
        """--force refreshes pre-existing SP framework files."""
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "skip-test"
        project.mkdir()

        # Pre-create a shared script with custom content
        scripts_dir = project / ".specify" / "scripts" / "bash"
        scripts_dir.mkdir(parents=True)
        custom_content = "# stale common.sh\n"
        (scripts_dir / "common.sh").write_text(custom_content, encoding="utf-8")
        powershell_dir = project / ".specify" / "scripts" / "powershell"
        powershell_dir.mkdir(parents=True)
        stale_powershell = (
            'Write-Output "Run /speckit.specify first"\n'
            'Write-Output "Run /speckit.plan first"\n'
            'Write-Output "Run /speckit.tasks first"\n'
        )
        (powershell_dir / "check-prerequisites.ps1").write_text(
            stale_powershell,
            encoding="utf-8",
        )

        # Pre-create a shared template with custom content
        templates_dir = project / ".specify" / "templates"
        templates_dir.mkdir(parents=True)
        custom_template = "# stale spec-template\n/sp-tasks\n/speckit.plan\n"
        (templates_dir / "spec-template.md").write_text(custom_template, encoding="utf-8")

        memory_dir = project / ".specify" / "memory"
        memory_dir.mkdir(parents=True)
        memory_file = memory_dir / "project-index.md"
        memory_file.write_text(
            "# Project Memory\n\nBusiness-specific content stays.\nUse /sp-specify, /sp-plan, and /speckit.analyze.\n",
            encoding="utf-8",
        )

        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init", "--here", "--force",
                "--integration", "copilot",
                "--script", "sh",
                "--no-git",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0

        # Framework files should be refreshed by explicit --force.
        common = (scripts_dir / "common.sh").read_text(encoding="utf-8")
        spec_template = (templates_dir / "spec-template.md").read_text(encoding="utf-8")
        powershell_prereqs = (powershell_dir / "check-prerequisites.ps1").read_text(
            encoding="utf-8"
        )
        assert common != custom_content
        assert spec_template != custom_template
        assert powershell_prereqs != stale_powershell
        assert "/sp-tasks" not in spec_template
        assert "/speckit.plan" not in spec_template
        assert "/speckit.specify" not in powershell_prereqs
        assert "/speckit.plan" not in powershell_prereqs
        assert "/speckit.tasks" not in powershell_prereqs
        memory_content = memory_file.read_text(encoding="utf-8")
        assert "Business-specific content stays." in memory_content
        assert "/sp.specify" in memory_content
        assert "/sp.plan" in memory_content
        assert "/sp.analyze" in memory_content
        assert "/sp-specify" not in memory_content
        assert "/speckit.analyze" not in memory_content

        # Other shared files should still be installed
        assert (scripts_dir / "setup-plan.sh").exists()
        assert (templates_dir / "plan-template.md").exists()

    def test_normal_init_cleans_legacy_core_commands_across_existing_hosts(self, tmp_path):
        """Normal init removes obsolete command surfaces without touching project content."""
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "multi-host-cleanup"
        project.mkdir()

        stale_files = [
            project / ".claude" / "commands" / "speckit.plan.md",
            project / ".claude" / "commands" / "sp-plan.md",
            project / ".codex" / "commands" / "sp-plan.md",
            project / ".codex" / "prompts" / "sp-plan.md",
            project / ".gemini" / "commands" / "sp-plan.toml",
            project / ".github" / "agents" / "sp-plan.agent.md",
            project / ".github" / "prompts" / "sp-plan.prompt.md",
        ]
        for path in stale_files:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("legacy command surface\n", encoding="utf-8")

        legacy_skill_files = [
            project / ".agents" / "skills" / "sp.plan" / "SKILL.md",
            project / ".agents" / "skills" / "speckit-plan" / "SKILL.md",
            project / ".agents" / "skills" / "speckit.plan" / "SKILL.md",
            project / ".codex" / "skills" / "sp.plan" / "SKILL.md",
            project / ".codex" / "skills" / "sp-plan" / "SKILL.md",
            project / ".codex" / "skills" / "speckit-plan" / "SKILL.md",
            project / ".codex" / "skills" / "speckit.plan" / "SKILL.md",
        ]
        for legacy_skill in legacy_skill_files:
            legacy_skill.parent.mkdir(parents=True, exist_ok=True)
            legacy_skill.write_text("legacy skill\n", encoding="utf-8")
        extension_skill = project / ".agents" / "skills" / "speckit-git-commit" / "SKILL.md"
        extension_skill.parent.mkdir(parents=True, exist_ok=True)
        extension_skill.write_text("extension skill\n", encoding="utf-8")

        for business_path in [
            project / "prd" / "sp-plan.md",
            project / "specs" / "speckit.plan.md",
            project / "SDDspecs" / "sp-plan.toml",
        ]:
            business_path.parent.mkdir(parents=True, exist_ok=True)
            business_path.write_text("business content\n", encoding="utf-8")

        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init",
                "--here",
                "--integration",
                "codex",
                "--script",
                "sh",
                "--no-git",
                "--ignore-agent-tools",
            ], input="y\n", catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, result.output

        for path in stale_files:
            assert not path.exists(), f"stale command survived: {path}"
        for legacy_skill in legacy_skill_files:
            assert not legacy_skill.parent.exists()
        assert extension_skill.exists()
        assert (project / ".agents" / "skills" / skill_directory_name("plan") / "SKILL.md").exists()
        assert not (project / ".codex" / "skills" / skill_directory_name("plan") / "SKILL.md").exists()
        assert not (project / ".codex" / "commands" / "sp.plan.md").exists()
        assert not (project / ".codex" / "prompts" / "sp.plan.md").exists()
        assert not (project / "plugins" / "sp" / "commands" / "sp.plan.md").exists()
        assert not (project / ".agents" / "plugins" / "marketplace.json").exists()

        assert (project / "prd" / "sp-plan.md").read_text(encoding="utf-8") == "business content\n"
        assert (project / "specs" / "speckit.plan.md").read_text(encoding="utf-8") == "business content\n"
        assert (project / "SDDspecs" / "sp-plan.toml").read_text(encoding="utf-8") == "business content\n"

    def test_normal_init_cleans_claude_core_skill_duplicates_but_preserves_extensions(self, tmp_path):
        """Re-init removes Claude core skill duplicates without touching extension skills."""
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "claude-cleanup"
        project.mkdir()

        skills_dir = project / ".claude" / "skills"
        for name in ("sp-plan", "sp.plan", "speckit-plan", "speckit.plan"):
            skill_file = skills_dir / name / "SKILL.md"
            skill_file.parent.mkdir(parents=True, exist_ok=True)
            skill_file.write_text("stale core skill\n", encoding="utf-8")
        extension_skill = skills_dir / "speckit-git-commit" / "SKILL.md"
        extension_skill.parent.mkdir(parents=True, exist_ok=True)
        extension_skill.write_text("extension skill\n", encoding="utf-8")

        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init",
                "--here",
                "--integration",
                "claude",
                "--script",
                "sh",
                "--no-git",
                "--ignore-agent-tools",
            ], input="y\n", catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, result.output
        for name in ("sp-plan", "sp.plan", "speckit-plan", "speckit.plan"):
            assert not (skills_dir / name).exists()
        assert extension_skill.exists()
        assert (project / ".claude" / "commands" / "sp.plan.md").exists()
        assert not (project / ".claude" / "commands" / "speckit.plan.md").exists()

    def test_normal_init_cleans_obsolete_codex_dirs_without_removing_agents_skills(self, tmp_path):
        """Codex keeps skills and removes obsolete prompt/plugin command entries."""
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "codex-cleanup"
        project.mkdir()

        obsolete_codex_skill = project / ".codex" / "skills" / "sp-plan" / "SKILL.md"
        obsolete_codex_skill.parent.mkdir(parents=True, exist_ok=True)
        obsolete_codex_skill.write_text("obsolete codex skill\n", encoding="utf-8")
        obsolete_codex_command = project / ".codex" / "commands" / "sp.plan.md"
        obsolete_codex_command.parent.mkdir(parents=True, exist_ok=True)
        obsolete_codex_command.write_text("obsolete codex command\n", encoding="utf-8")

        valid_agent_skill = project / ".agents" / "skills" / "sp-plan" / "SKILL.md"
        valid_agent_skill.parent.mkdir(parents=True, exist_ok=True)
        valid_agent_skill.write_text("valid current skill\n", encoding="utf-8")

        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init",
                "--here",
                "--integration",
                "codex",
                "--script",
                "sh",
                "--no-git",
                "--ignore-agent-tools",
            ], input="y\n", catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, result.output
        assert not obsolete_codex_skill.parent.exists()
        assert not obsolete_codex_command.exists()
        assert valid_agent_skill.exists()
        assert "name: sp-plan" in valid_agent_skill.read_text(encoding="utf-8")
        assert not (project / ".codex" / "prompts" / "sp.plan.md").exists()
        assert not (project / "plugins" / "sp" / "commands" / "sp.plan.md").exists()
        assert not (project / ".agents" / "plugins" / "marketplace.json").exists()

    def test_shared_infra_preserves_existing_files_without_force(self, tmp_path):
        """A normal install still preserves pre-existing shared files."""
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "preserve-test"
        project.mkdir()

        scripts_dir = project / ".specify" / "scripts" / "bash"
        scripts_dir.mkdir(parents=True)
        custom_content = "# user-modified common.sh\n"
        (scripts_dir / "common.sh").write_text(custom_content, encoding="utf-8")

        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init", "--here",
                "--integration", "copilot",
                "--script", "sh",
                "--no-git",
            ], input="y\n", catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0
        assert (scripts_dir / "common.sh").read_text(encoding="utf-8") == custom_content


class TestForceExistingDirectory:
    """Tests for --force merging into an existing named directory."""

    def test_force_merges_into_existing_dir(self, tmp_path):
        """specify init <dir> --force succeeds when the directory already exists."""
        from typer.testing import CliRunner
        from specify_cli import app

        target = tmp_path / "existing-proj"
        target.mkdir()
        # Place a pre-existing file to verify it survives the merge
        marker = target / "user-file.txt"
        marker.write_text("keep me", encoding="utf-8")

        runner = CliRunner()
        result = runner.invoke(app, [
            "init", str(target), "--integration", "copilot", "--force",
            "--no-git", "--script", "sh",
        ], catch_exceptions=False)

        assert result.exit_code == 0, f"init --force failed: {result.output}"

        # Pre-existing file should survive
        assert marker.read_text(encoding="utf-8") == "keep me"

        # Spec Kit files should be installed
        assert (target / ".specify" / "init-options.json").exists()
        assert (target / ".specify" / "templates" / "spec-template.md").exists()

    def test_without_force_errors_on_existing_dir(self, tmp_path):
        """specify init <dir> without --force errors when directory exists."""
        from typer.testing import CliRunner
        from specify_cli import app

        target = tmp_path / "existing-proj"
        target.mkdir()

        runner = CliRunner()
        result = runner.invoke(app, [
            "init", str(target), "--integration", "copilot",
            "--no-git", "--script", "sh",
        ], catch_exceptions=False)

        assert result.exit_code == 1
        assert "already exists" in result.output


class TestGitInitializationDoesNotAutoInstallExtension:
    """Tests for git initialization without default extension command pollution."""

    def test_git_init_does_not_auto_install_extension(self, tmp_path):
        """Without --no-git, init may create a repo but does not install git extension."""
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "git-auto"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init", "--here", "--ai", "claude", "--script", "sh",
                "--ignore-agent-tools",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, f"init failed: {result.output}"

        # Bundled git extension is available for manual install, but should not
        # be registered by default because it exposes speckit-git-* menu items.
        ext_dir = project / ".specify" / "extensions" / "git"
        assert not ext_dir.exists(), "git extension should not be installed by default"

        extensions_yml = project / ".specify" / "extensions.yml"
        assert not extensions_yml.exists(), "extensions.yml should not be created by default"

    def test_no_git_skips_extension(self, tmp_path):
        """With --no-git, git repo init and git extension install are skipped."""
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "no-git"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init", "--here", "--ai", "claude", "--script", "sh",
                "--no-git", "--ignore-agent-tools",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, f"init failed: {result.output}"

        # Git extension should NOT be installed
        ext_dir = project / ".specify" / "extensions" / "git"
        assert not ext_dir.exists(), "git extension should not be installed with --no-git"

    def test_git_extension_commands_not_registered_by_default(self, tmp_path):
        """Default init should not register speckit-git-* slash-menu commands."""
        from typer.testing import CliRunner
        from specify_cli import app

        project = tmp_path / "git-cmds"
        project.mkdir()
        old_cwd = os.getcwd()
        try:
            os.chdir(project)
            runner = CliRunner()
            result = runner.invoke(app, [
                "init", "--here", "--ai", "claude", "--script", "sh",
                "--ignore-agent-tools",
            ], catch_exceptions=False)
        finally:
            os.chdir(old_cwd)

        assert result.exit_code == 0, f"init failed: {result.output}"

        # Core SP commands are installed, extension commands are not.
        claude_commands = project / ".claude" / "commands"
        assert claude_commands.exists(), "Claude commands directory was not created"
        assert (claude_commands / "sp.plan.md").exists()
        git_commands = [f for f in claude_commands.iterdir() if f.name.startswith("speckit.git.")]
        assert len(git_commands) == 0, "git extension commands should not be registered by default"
        claude_skills = project / ".claude" / "skills"
        if claude_skills.exists():
            git_skills = [f for f in claude_skills.iterdir() if f.name.startswith("speckit-git-")]
            assert len(git_skills) == 0, "git extension commands should not be registered by default"
