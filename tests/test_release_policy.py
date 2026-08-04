"""Repository release policy regression tests."""

from __future__ import annotations

import re
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python < 3.11 compatibility
    import tomli as tomllib


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_project_version_matches_latest_changelog_entry():
    """The project version should match the release or its next development cycle."""
    pyproject = tomllib.loads((PROJECT_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    version = pyproject["project"]["version"]

    changelog = (PROJECT_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    latest_entry = re.search(r"^## \[([0-9]+\.[0-9]+\.[0-9]+)\]", changelog, re.MULTILINE)

    assert latest_entry is not None
    latest_version = latest_entry.group(1)
    major, minor, patch = (int(part) for part in latest_version.split("."))
    next_dev_version = f"{major}.{minor}.{patch + 1}.dev0"

    assert version in {latest_version, next_dev_version}


def test_release_notes_publish_user_facing_release_theme():
    """GitHub Release notes should describe evidence-driven Outline boundaries."""
    release_workflow = (PROJECT_ROOT / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")

    assert "## Evidence-driven recursive Outline boundaries" in release_workflow
    assert r"\`/sp.prd\` rereads" in release_workflow
    assert "repository's default" in release_workflow
    assert r"\`prd/\` source root" in release_workflow
    assert "Capability atoms prove source coverage and unique ownership" in release_workflow
    assert "their count does not determine how many child projects" in release_workflow
    assert "complexity reduction, stable handoffs, coordination cost" in release_workflow
    assert "a split signal, not an automatic boundary" in release_workflow
    assert r"A reasoned \`ai-proposed\` grouping can enter Discovery" in release_workflow
    assert r"An \`unresolved\` grouping cannot masquerade" in release_workflow
    assert "no fixed child count, preferred range" in release_workflow
    assert "Schema, CLI, and browser validation remain strict" in release_workflow
    assert "remain human-confirmed through the owning Web Discovery page" in release_workflow
    assert "Existing projects must refresh their installed templates" in release_workflow
    assert "docs/reference/sp-project-methodology.md" not in release_workflow
    assert "## What's Changed" not in release_workflow
    assert "COMMITS=$(git log" not in release_workflow
    assert "specify init . --integration <agent> --force" in release_workflow


def test_release_changelog_summary_matches_outline_boundary_focus():
    """The generated changelog should lead with evidence-driven boundary selection."""
    trigger_workflow = (PROJECT_ROOT / ".github" / "workflows" / "release-trigger.yml").read_text(
        encoding="utf-8"
    )

    assert "evidence-driven recursive Outline boundaries" in trigger_workflow
    assert "capability atoms prove source coverage without setting project count" in trigger_workflow
    assert "models compare complexity reduction with coordination cost" in trigger_workflow
    assert "reasoned project partitions remain human-confirmed through Discovery" in trigger_workflow


def test_release_trigger_rejects_non_incrementing_manual_versions():
    """Manual release versions must be greater than the latest release tag."""
    trigger_workflow = (PROJECT_ROOT / ".github" / "workflows" / "release-trigger.yml").read_text(
        encoding="utf-8"
    )

    strict_tag_filter = (
        "git tag -l 'v*' --sort=-version:refname | "
        "grep -E '^v[0-9]+\\.[0-9]+\\.[0-9]+$' | head -n 1"
    )
    assert f"LATEST_TAG=$({strict_tag_filter})" in trigger_workflow
    assert f"PREVIOUS_TAG=$({strict_tag_filter})" in trigger_workflow
    assert trigger_workflow.count(strict_tag_filter) == 2
    assert "sort -V" in trigger_workflow
    assert "must be greater than latest tag" in trigger_workflow
    assert "Auto-incremented version" in trigger_workflow


def test_release_trigger_only_runs_from_main():
    """A release tag must never be created from a feature branch checkout."""
    trigger_workflow = (PROJECT_ROOT / ".github" / "workflows" / "release-trigger.yml").read_text(
        encoding="utf-8"
    )

    assert 'if [[ "${GITHUB_REF}" != "refs/heads/main" ]]' in trigger_workflow
    assert "Re-run this workflow from main" in trigger_workflow


def test_release_process_documents_policy():
    """The human release guide should mirror the enforced workflow policy."""
    release_process = (PROJECT_ROOT / ".github" / "workflows" / "RELEASE-PROCESS.md").read_text(
        encoding="utf-8"
    )

    assert "Every release must bump the public version above the latest `v*` tag" in release_process
    assert "Manual versions must be strictly greater than the latest release tag" in release_process
    assert "GitHub Release notes publish the current user-facing release focus" in release_process
    assert "Methodology documents are supporting references" in release_process
