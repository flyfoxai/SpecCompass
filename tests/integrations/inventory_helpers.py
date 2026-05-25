from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_ROOT = REPO_ROOT / "templates"
COMMAND_TEMPLATES_DIR = TEMPLATES_ROOT / "commands"
PROJECT_TEMPLATE_ROOT = TEMPLATES_ROOT / "project"
SUPPORT_SCRIPTS_ROOT = REPO_ROOT / "scripts"


def command_stems() -> list[str]:
    return sorted(path.stem for path in COMMAND_TEMPLATES_DIR.glob("*.md"))


def root_template_files() -> list[str]:
    return sorted(
        f".specify/templates/{path.name}"
        for path in TEMPLATES_ROOT.glob("*.md")
        if path.is_file()
    )


def project_template_files() -> list[str]:
    return sorted(
        path.relative_to(PROJECT_TEMPLATE_ROOT).as_posix()
        for path in PROJECT_TEMPLATE_ROOT.rglob("*")
        if path.is_file()
    )


def support_script_files(script_variant: str) -> list[str]:
    subdir = "bash" if script_variant == "sh" else "powershell"
    return sorted(
        f".specify/scripts/{subdir}/{path.name}"
        for path in (SUPPORT_SCRIPTS_ROOT / subdir).iterdir()
        if path.is_file()
    )


def shared_init_files(
    *,
    integration_key: str,
    script_variant: str,
    context_file: str | None,
) -> list[str]:
    files = [
        ".specify/init-options.json",
        ".specify/integration.json",
        f".specify/integrations/{integration_key}.manifest.json",
        ".specify/integrations/speckit.manifest.json",
        ".specify/workflows/speckit/workflow.yml",
        ".specify/workflows/workflow-registry.json",
    ]
    files.extend(root_template_files())
    files.extend(project_template_files())
    files.extend(support_script_files(script_variant))
    if context_file:
        files.append(context_file)
    return sorted(set(files))
