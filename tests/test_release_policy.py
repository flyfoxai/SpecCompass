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

    assert "## Outline review: consistent cross-map branches" in release_workflow
    assert "projects each linked child map's root-level nodes" in release_workflow
    assert "connects to its owning second-level map link" in release_workflow
    assert "Collision-safe preview keys" in release_workflow
    assert "clicking a preview opens the detail map" in release_workflow
    assert "rejects map links that mix local children with child-map content" in release_workflow
    assert "projected counts, connector ownership, empty maps, and detail-map selection" in release_workflow
    assert "Existing projects must refresh their installed templates" in release_workflow
    assert "docs/reference/sp-project-methodology.md" not in release_workflow
    assert "## What's Changed" not in release_workflow
    assert "COMMITS=$(git log" not in release_workflow
    assert r"- The overview third column projects" in release_workflow


def test_release_changelog_summary_matches_cross_map_outline_focus():
    """The generated changelog should lead with the cross-map Outline fix."""
    trigger_workflow = (PROJECT_ROOT / ".github" / "workflows" / "release-trigger.yml").read_text(
        encoding="utf-8"
    )

    assert "Aligned Outline overview previews and connectors" in trigger_workflow
    assert "linked child map" in trigger_workflow
    assert "overview counts and detail-map root children remain consistent" in trigger_workflow


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
