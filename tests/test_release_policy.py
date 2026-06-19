"""Repository release policy regression tests."""

from __future__ import annotations

import re
import tomllib
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_project_version_matches_latest_changelog_entry():
    """The checked-in public version should have a matching top changelog entry."""
    pyproject = tomllib.loads((PROJECT_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    version = pyproject["project"]["version"]

    changelog = (PROJECT_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    latest_entry = re.search(r"^## \[([0-9]+\.[0-9]+\.[0-9]+)\]", changelog, re.MULTILINE)

    assert latest_entry is not None
    assert latest_entry.group(1) == version


def test_release_notes_publish_main_methodology_only():
    """GitHub Release notes should not promote commit lists as release themes."""
    release_workflow = (PROJECT_ROOT / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")

    assert "## SP Main Methodology" in release_workflow
    assert "docs/reference/sp-project-methodology.md" in release_workflow
    assert "Release notes intentionally summarize the main methodology only" in release_workflow
    assert "CHANGELOG.md" in release_workflow
    assert "`CHANGELOG.md`" not in release_workflow
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
    assert "GitHub Release notes publish only the maintained main SP methodology entry point" in release_process
