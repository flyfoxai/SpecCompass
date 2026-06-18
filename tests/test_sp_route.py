"""Tests for deterministic SP route discovery scripts."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

from tests.conftest import requires_bash


REPO_ROOT = Path(__file__).resolve().parent.parent
BASH_ROUTE = REPO_ROOT / "scripts" / "bash" / "sp-route.sh"
POWERSHELL_ROUTE = REPO_ROOT / "scripts" / "powershell" / "sp-route.ps1"


def _init_project(tmp_path: Path) -> Path:
    project = tmp_path / "project"
    (project / ".specify" / "memory").mkdir(parents=True)
    (project / "specs").mkdir()
    return project


def _write_feature(project: Path, name: str, files: dict[str, str]) -> Path:
    feature_dir = project / "specs" / name
    feature_dir.mkdir(parents=True)
    for rel, content in files.items():
        path = feature_dir / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return feature_dir


def _write_feature_pointer(project: Path, feature: str) -> None:
    (project / ".specify" / "feature.json").write_text(
        json.dumps({"feature_directory": f"specs/{feature}"}),
        encoding="utf-8",
    )


def _run_bash(project: Path) -> dict:
    bash_route = str(BASH_ROUTE).replace("\\", "/")
    result = subprocess.run(
        ["bash", bash_route, "--json"],
        cwd=project,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.fail(
            "sp-route.sh failed\n"
            f"exit code: {result.returncode}\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )
    return json.loads(result.stdout)


def _run_powershell(project: Path) -> dict:
    if not _has_powershell():
        pytest.skip("PowerShell not available")
    result = subprocess.run(
        ["pwsh", "-NoProfile", "-File", str(POWERSHELL_ROUTE), "-Json"],
        cwd=project,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def _has_powershell() -> bool:
    try:
        result = subprocess.run(
            ["pwsh", "-NoProfile", "-Command", "'ok'"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    return result.returncode == 0


def _assert_route_schema(payload: dict) -> None:
    for key in (
        "schema",
        "status",
        "next",
        "reason",
        "activeFeature",
        "featureDir",
        "artifacts",
        "missing",
        "blockers",
        "confidence",
        "autoExecute",
        "continueAllowed",
        "blockerType",
        "blockerRoute",
        "loopDetected",
        "loopSignature",
        "loopRoute",
    ):
        assert key in payload
    assert payload["schema"] == "speckit.route.v1"
    assert payload["autoExecute"] is False
    assert payload["next"].startswith("/sp.")
    assert isinstance(payload["continueAllowed"], bool)
    assert isinstance(payload["blockerType"], str)
    assert payload["blockerRoute"].startswith("/sp.")
    assert isinstance(payload["loopDetected"], bool)
    assert isinstance(payload["loopSignature"], str)
    assert payload["loopRoute"].startswith("/sp.")
    assert isinstance(payload["artifacts"], dict)
    assert isinstance(payload["missing"], list)
    assert isinstance(payload["blockers"], list)


@requires_bash
def test_route_reports_no_active_feature(tmp_path):
    project = _init_project(tmp_path)

    payload = _run_bash(project)

    _assert_route_schema(payload)
    assert payload["status"] == "NEEDS_PRD"
    assert payload["next"] == "/sp.prd"
    assert payload["reason"] == "no-active-feature"
    assert payload["activeFeature"] == ""


@requires_bash
def test_route_detects_missing_artifact_progression(tmp_path):
    project = _init_project(tmp_path)
    _write_feature_pointer(project, "001-demo")
    _write_feature(project, "001-demo", {})

    payload = _run_bash(project)
    assert payload["status"] == "NEEDS_PRD"
    assert payload["next"] == "/sp.prd"
    assert "prd.md" in payload["missing"]

    (project / "specs" / "001-demo" / "prd.md").write_text(
        "Status: READY_FOR_SPECIFY\n",
        encoding="utf-8",
    )
    payload = _run_bash(project)
    assert payload["status"] == "NEEDS_SPECIFY"
    assert payload["next"] == "/sp.specify"
    assert "spec.md" in payload["missing"]

    (project / "specs" / "001-demo" / "spec.md").write_text(
        "Stage Readiness\nStatus: READY_FOR_FLOW\n",
        encoding="utf-8",
    )
    payload = _run_bash(project)
    assert payload["status"] == "NEEDS_FLOW"
    assert payload["next"] == "/sp.flow"
    assert "flows/" in payload["missing"]


@requires_bash
def test_route_reports_blocked_open_items(tmp_path):
    project = _init_project(tmp_path)
    _write_feature_pointer(project, "001-demo")
    _write_feature(
        project,
        "001-demo",
        {
            "prd.md": "Status: READY_FOR_SPECIFY\n",
            "spec.md": "Status: READY_FOR_FLOW\n",
            "flows/index.md": "Status: READY_FOR_UI\n",
            "ui/index.md": "Status: READY_FOR_PLAN\n",
            "bundle.md": "Status: READY_FOR_PLAN\n",
            "plan.md": "Implementation Readiness: READY_FOR_TASKS\n",
            "tasks.md": "- [ ] T001 Do work\n",
            "memory/open-items.md": "### OPEN-001\nStatus: BLOCKED\n",
        },
    )

    payload = _run_bash(project)

    assert payload["status"] == "BLOCKED"
    assert payload["next"] == "/sp.clarify"
    assert payload["continueAllowed"] is False
    assert payload["blockerType"] == "UNKNOWN_BLOCKER"
    assert payload["blockerRoute"] == "/sp.clarify"
    assert payload["blockers"]


@requires_bash
def test_route_classifies_human_decision_blocker(tmp_path):
    project = _init_project(tmp_path)
    _write_feature_pointer(project, "001-demo")
    _write_feature(
        project,
        "001-demo",
        {
            "prd.md": "Status: READY_FOR_SPECIFY\n",
            "spec.md": "Status: READY_FOR_FLOW\n",
            "flows/index.md": "Status: READY_FOR_UI\n",
            "ui/index.md": "Status: READY_FOR_PLAN\n",
            "bundle.md": "Status: READY_FOR_PLAN\n",
            "plan.md": "Implementation Readiness: READY_FOR_TASKS\n",
            "tasks.md": "- [ ] T001 Do work\n",
            "memory/open-items.md": (
                "### OPEN-001\n"
                "- Type: Blocker\n"
                "- Status: NEEDS_DECISION\n"
                "- Blocker Type: HUMAN_DECISION\n"
                "- Owner Route: /sp.clarify\n"
            ),
        },
    )

    payload = _run_bash(project)

    assert payload["status"] == "BLOCKED"
    assert payload["next"] == "/sp.clarify"
    assert payload["continueAllowed"] is False
    assert payload["blockerType"] == "HUMAN_DECISION"
    assert payload["blockerRoute"] == "/sp.clarify"


@requires_bash
def test_route_classifies_upstream_doc_gap_blocker(tmp_path):
    project = _init_project(tmp_path)
    _write_feature_pointer(project, "001-demo")
    _write_feature(
        project,
        "001-demo",
        {
            "prd.md": "Status: READY_FOR_SPECIFY\n",
            "spec.md": "Status: READY_FOR_FLOW\n",
            "flows/index.md": "Status: READY_FOR_UI\n",
            "ui/index.md": "Status: READY_FOR_PLAN\n",
            "bundle.md": "Status: READY_FOR_PLAN\n",
            "plan.md": "Implementation Readiness: READY_FOR_TASKS\n",
            "tasks.md": "- [ ] T001 Do work\n",
            "memory/open-items.md": (
                "### OPEN-001\n"
                "- Type: Blocker\n"
                "- Status: BLOCKED\n"
                "- Blocker Type: UPSTREAM_DOC_GAP\n"
                "- Missing/Weak Artifact: flows/index.md\n"
                "- Owner Route: /sp.flow\n"
            ),
        },
    )

    payload = _run_bash(project)

    assert payload["status"] == "BLOCKED"
    assert payload["next"] == "/sp.flow"
    assert payload["continueAllowed"] is True
    assert payload["blockerType"] == "UPSTREAM_DOC_GAP"
    assert payload["blockerRoute"] == "/sp.flow"


@requires_bash
def test_route_stops_repeated_fallback_loop_before_auto_continue(tmp_path):
    project = _init_project(tmp_path)
    _write_feature_pointer(project, "001-demo")
    _write_feature(
        project,
        "001-demo",
        {
            "prd.md": "Status: READY_FOR_SPECIFY\n",
            "spec.md": "Status: READY_FOR_FLOW\n",
            "flows/index.md": "Status: READY_FOR_UI\n",
            "ui/index.md": "Status: READY_FOR_PLAN\n",
            "bundle.md": "Status: READY_FOR_PLAN\n",
            "plan.md": "Implementation Readiness: READY_FOR_TASKS\n",
            "tasks.md": "- [ ] T001 Do work\n",
            "memory/open-items.md": "Start empty\n",
            "memory/fallback-log.md": (
                "| Timestamp | Status | Failure Signature | next-route | evidence-summary |\n"
                "| --- | --- | --- | --- | --- |\n"
                "| 2026-06-15T10:00:00Z | BLOCKED | flow::sp.ui::checkout::missing-port | /sp.flow | no new evidence |\n"
                "| 2026-06-15T10:30:00Z | BLOCKED | flow::sp.ui::checkout::missing-port | /sp.flow | still no new evidence |\n"
            ),
        },
    )

    payload = _run_bash(project)

    assert payload["status"] == "BLOCKED"
    assert payload["next"] == "/sp.clarify"
    assert payload["reason"] == "fallback-loop-detected"
    assert payload["continueAllowed"] is False
    assert payload["blockerType"] == "REPEATED_FALLBACK"
    assert payload["blockerRoute"] == "/sp.clarify"
    assert payload["loopDetected"] is True
    assert payload["loopSignature"] == "flow::sp.ui::checkout::missing-port"
    assert payload["loopRoute"] == "/sp.flow"
    assert "memory/fallback-log.md" in payload["blockers"]


@requires_bash
def test_route_reports_ready_for_implement(tmp_path):
    project = _init_project(tmp_path)
    _write_feature_pointer(project, "001-demo")
    _write_feature(
        project,
        "001-demo",
        {
            "prd.md": "Status: READY_FOR_SPECIFY\n",
            "spec.md": "Status: READY_FOR_FLOW\n",
            "flows/index.md": "Status: READY_FOR_UI\n",
            "ui/index.md": "Status: READY_FOR_PLAN\n",
            "bundle.md": "Status: READY_FOR_PLAN\n",
            "plan.md": "Implementation Readiness: READY_FOR_TASKS\n",
            "tasks.md": "- [ ] T001 Do work\n",
            "memory/open-items.md": "Start empty\n",
        },
    )

    payload = _run_bash(project)

    assert payload["status"] == "READY_FOR_IMPLEMENT"
    assert payload["next"] == "/sp.implement"
    assert payload["confidence"] == "high"


@requires_bash
def test_route_reports_multi_feature_ambiguity(tmp_path):
    project = _init_project(tmp_path)
    _write_feature(project, "001-one", {"prd.md": "Status: READY_FOR_SPECIFY\n"})
    _write_feature(project, "002-two", {"prd.md": "Status: READY_FOR_SPECIFY\n"})
    env = os.environ.copy()
    env.pop("SPECIFY_FEATURE", None)
    env.pop("SPECIFY_FEATURE_DIRECTORY", None)

    result = subprocess.run(
        ["bash", str(BASH_ROUTE).replace("\\", "/"), "--json"],
        cwd=project,
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.fail(
            "sp-route.sh failed\n"
            f"exit code: {result.returncode}\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )
    payload = json.loads(result.stdout)

    assert payload["status"] == "NEEDS_DECISION"
    assert payload["next"] == "/sp.clarify"
    assert payload["reason"] == "multiple-feature-candidates"
    assert payload["continueAllowed"] is False
    assert payload["blockerType"] == "HUMAN_DECISION"
    assert payload["blockerRoute"] == "/sp.clarify"


@requires_bash
def test_route_detects_seed_artifacts(tmp_path):
    project = _init_project(tmp_path)
    _write_feature_pointer(project, "001-demo")
    _write_feature(
        project,
        "001-demo",
        {
            "prd.md": "Status: READY_FOR_SPECIFY\n",
            "spec.md": "SP_STAGE_SEED: spec\n",
        },
    )

    payload = _run_bash(project)

    assert payload["status"] == "NEEDS_SPECIFY"
    assert payload["next"] == "/sp.specify"
    assert "spec.md" in payload["blockers"]


def test_bash_and_powershell_route_parity_for_ready_feature(tmp_path):
    project = _init_project(tmp_path)
    _write_feature_pointer(project, "001-demo")
    _write_feature(
        project,
        "001-demo",
        {
            "prd.md": "Status: READY_FOR_SPECIFY\n",
            "spec.md": "Status: READY_FOR_FLOW\n",
            "flows/index.md": "Status: READY_FOR_UI\n",
            "ui/index.md": "Status: READY_FOR_PLAN\n",
            "bundle.md": "Status: READY_FOR_PLAN\n",
            "plan.md": "Implementation Readiness: READY_FOR_TASKS\n",
            "tasks.md": "- [ ] T001 Do work\n",
            "memory/open-items.md": "Start empty\n",
        },
    )

    bash_payload = _run_bash(project)
    powershell_payload = _run_powershell(project)

    assert powershell_payload == bash_payload


def test_route_template_supports_explicit_resume_trigger_y():
    template = (REPO_ROOT / "templates" / "commands" / "route.md").read_text(encoding="utf-8")

    assert "/sp.route y" in template
    assert "standalone word `y`" in template
    assert "continueAllowed" in template
    assert "blockerType" in template
    assert "blockerRoute" in template
    assert "EXECUTE_COMMAND" in template
    assert "NEEDS_DECISION" in template
    assert "HUMAN_DECISION" in template
    assert "loopDetected" in template
    assert "REPEATED_FALLBACK" in template
    assert "fallback-log.md" in template
