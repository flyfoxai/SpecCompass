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

    assert "## Direct browser review write-back" in release_workflow
    assert "Flow, UI, PRD Outline, and Outline Discovery reviews can write" in release_workflow
    assert "Write-back is mechanical persistence only" in release_workflow
    assert "stable request IDs, idempotent replay, cross-process locking" in release_workflow
    assert "across macOS, Linux, and Windows" in release_workflow
    assert "fail closed instead of offering an unsafe fallback package" in release_workflow
    assert "Fallback downloads appear only for explicitly recoverable" in release_workflow
    assert "revision_requests.target_ref" in release_workflow
    assert "all four write-back routes, conflicts, retries" in release_workflow
    assert "Existing projects must refresh their installed templates" in release_workflow
    assert "docs/reference/sp-project-methodology.md" not in release_workflow
    assert "## What's Changed" not in release_workflow
    assert "COMMITS=$(git log" not in release_workflow
    assert r"- Flow, UI, PRD Outline, and Outline Discovery reviews" in release_workflow


def test_release_changelog_summary_matches_direct_writeback_focus():
    """The generated changelog should lead with direct browser write-back."""
    trigger_workflow = (PROJECT_ROOT / ".github" / "workflows" / "release-trigger.yml").read_text(
        encoding="utf-8"
    )

    assert "Added direct browser write-back" in trigger_workflow
    assert "Flow, UI, PRD Outline, and Outline Discovery" in trigger_workflow
    assert "conflict-safe persistence" in trigger_workflow
    assert "targeted follow-up regeneration" in trigger_workflow


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
