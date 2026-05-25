"""Helpers for deriving expected integration install inventories from repo assets."""

from pathlib import Path

from specify_cli.naming import canonical_command_filename, canonical_skill_name


PROJECT_ROOT = Path(__file__).resolve().parents[2]
COMMAND_STEMS = sorted(
    path.stem for path in (PROJECT_ROOT / "templates" / "commands").glob("*.md")
)


def _repo_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


def shared_template_files() -> list[str]:
    """Files copied from top-level templates/ into target .specify/templates/."""
    templates_root = PROJECT_ROOT / "templates"
    files: list[str] = []
    for path in _repo_files(templates_root):
        rel_parts = path.relative_to(templates_root).parts
        if path.name == "vscode-settings.json":
            continue
        if any(part.startswith(".") for part in rel_parts):
            continue
        if rel_parts[0] in {"commands", "project"}:
            continue
        files.append(".specify/templates/" + Path(*rel_parts).as_posix())
    return files


def shared_script_files(script_variant: str) -> list[str]:
    """Files copied from scripts/<variant>/ into target .specify/scripts/<variant>/."""
    script_dir = "bash" if script_variant == "sh" else "powershell"
    root = PROJECT_ROOT / "scripts" / script_dir
    return [
        f".specify/scripts/{script_dir}/" + path.relative_to(root).as_posix()
        for path in _repo_files(root)
    ]


def project_asset_files() -> list[str]:
    """Files copied from templates/project/ into the target project root."""
    root = PROJECT_ROOT / "templates" / "project"
    return [path.relative_to(root).as_posix() for path in _repo_files(root)]


def integration_support_files(integration_key: str, script_variant: str) -> list[str]:
    # Multiple install phases can target the same destination path
    # (for example shared template roots overridden by project assets).
    # The on-disk inventory is therefore the unique final path set.
    return sorted(set([
        ".specify/init-options.json",
        ".specify/integration.json",
        f".specify/integrations/{integration_key}.manifest.json",
        f".specify/integrations/{integration_key}/scripts/update-context.ps1",
        f".specify/integrations/{integration_key}/scripts/update-context.sh",
        ".specify/integrations/sp.manifest.json",
        *shared_script_files(script_variant),
        *shared_template_files(),
        *project_asset_files(),
    ]))


def markdown_command_files(registrar_dir: str) -> list[str]:
    return [f"{registrar_dir}/{canonical_command_filename(stem)}" for stem in COMMAND_STEMS]


def toml_command_files(registrar_dir: str) -> list[str]:
    return [f"{registrar_dir}/{canonical_command_filename(stem, '.toml')}" for stem in COMMAND_STEMS]


def skill_command_files(skills_dir: str) -> list[str]:
    return [f"{skills_dir}/{canonical_skill_name(stem)}/SKILL.md" for stem in COMMAND_STEMS]


def copilot_command_files() -> list[str]:
    files: list[str] = []
    for stem in COMMAND_STEMS:
        files.append(f".github/agents/{canonical_command_filename(stem, '.agent.md')}")
        files.append(f".github/prompts/{canonical_command_filename(stem, '.prompt.md')}")
    files.append(".vscode/settings.json")
    return files
