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
    """GitHub Release notes should not publish methodology as the default theme."""
    release_workflow = (PROJECT_ROOT / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")

    assert "## PRD Outline and Review Priorities" in release_workflow
    assert "`/sp.prd` now develops Outline maturity in stages" in release_workflow
    assert "visual, identity-bound confirmation before `/sp.specify`" in release_workflow
    assert "`critical`, `important`, and `normal` priorities" in release_workflow
    assert "must be confirmed individually" in release_workflow
    assert "Existing projects must refresh their installed templates" in release_workflow
    assert "docs/reference/sp-project-methodology.md" not in release_workflow
    assert "## What's Changed" not in release_workflow
    assert "COMMITS=$(git log" not in release_workflow


def test_release_trigger_rejects_non_incrementing_manual_versions():
    """Manual release versions must be greater than the latest release tag."""
    trigger_workflow = (PROJECT_ROOT / ".github" / "workflows" / "release-trigger.yml").read_text(
        encoding="utf-8"
    )

    assert "LATEST_TAG=$(git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-version:refname | head -n 1)" in trigger_workflow
    assert "sort -V" in trigger_workflow
    assert "must be greater than latest tag" in trigger_workflow
    assert "Auto-incremented version" in trigger_workflow


def test_release_process_documents_policy():
    """The human release guide should mirror the enforced workflow policy."""
    release_process = (PROJECT_ROOT / ".github" / "workflows" / "RELEASE-PROCESS.md").read_text(
        encoding="utf-8"
    )

    assert "Every release must bump the public version above the latest `v*` tag" in release_process
    assert "Manual versions must be strictly greater than the latest release tag" in release_process
    assert "GitHub Release notes publish the current user-facing release focus" in release_process
    assert "Methodology documents are supporting references" in release_process
