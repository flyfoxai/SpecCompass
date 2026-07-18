"""Tests for the globally governed SP Lite coordinator contract."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

import pytest

from tests.conftest import requires_bash


REPO_ROOT = Path(__file__).resolve().parent.parent
BASH_LITE_STATE = REPO_ROOT / "scripts" / "bash" / "sp-lite-state.sh"
POWERSHELL_LITE_STATE = REPO_ROOT / "scripts" / "powershell" / "sp-lite-state.ps1"
LITE_TEMPLATE = (
    REPO_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "templates"
    / "feature"
    / "lite.md"
)
LITE_COMMAND = REPO_ROOT / "templates" / "commands" / "lite.md"
README_EN = REPO_ROOT / "README.md"
README_ZH = REPO_ROOT / "README.zh-CN.md"
LITE_OWNER_COMMANDS = (
    "prd",
    "specify",
    "flow",
    "ui",
    "gate",
    "bundle",
    "plan",
    "tasks",
    "analyze",
    "implement",
)
EVIDENCE_SIGNATURE = "a" * 64


def _init_project(tmp_path: Path, feature: str = "001-demo") -> tuple[Path, Path]:
    project = tmp_path / "project"
    feature_dir = project / "specs" / feature
    (project / ".specify" / "memory").mkdir(parents=True)
    feature_dir.mkdir(parents=True)
    (project / ".specify" / "feature.json").write_text(
        json.dumps({"feature_directory": f"specs/{feature}"}),
        encoding="utf-8",
    )
    return project, feature_dir


def _write_foundation(feature_dir: Path) -> None:
    (feature_dir / "prd.md").write_text("Status: READY_FOR_SPECIFY\n", encoding="utf-8")
    (feature_dir / "spec-outline.md").write_text(
        "Outline Decision: READY_FOR_SPECIFY\nEvidence Signature: outline-v1\n",
        encoding="utf-8",
    )
    (feature_dir / "spec.md").write_text("Status: READY_FOR_FLOW\n", encoding="utf-8")


def _write_prd_outline(feature_dir: Path) -> None:
    (feature_dir / "prd.md").write_text("Status: READY_FOR_SPECIFY\n", encoding="utf-8")
    (feature_dir / "spec-outline.md").write_text(
        "Outline Decision: READY_FOR_SPECIFY\nEvidence Signature: outline-v1\n",
        encoding="utf-8",
    )


def _lite_state(
    *,
    state: str = "NEEDS_FLOW",
    active_round: str = "LITE-R001",
    human_selection: str = "CONFIRMED",
    round_state: str = "READY_FOR_LITE_FLOW_UI",
    global_status: str = "CLEAR",
    global_input: str = "AUTO",
    current_input: str = "AUTO",
    blocker_route: str = "None",
    reuse_refs: str = "None",
    conflict_refs: str = "None",
    stale_refs: str = "None",
    regression_failures: str = "None",
    completed_stages: str = "SPECIFY",
    skipped_stages: str = "None",
    stage_evidence_refs: str = "SPECIFY=spec.md",
    stage_source_signatures: str = "AUTO",
    stage_validation_signatures: str = "AUTO",
    stage_skip_reasons: str = "None",
    stage_skip_confirmations: str = "None",
    completion_evidence: str = "None",
) -> str:
    if stage_source_signatures == "AUTO":
        stage_source_signatures = _stage_source_signatures()
    if stage_validation_signatures == "AUTO":
        stages = [
            stage.strip()
            for value in (completed_stages, skipped_stages)
            if value not in ("", "None")
            for stage in value.split(",")
            if stage.strip()
        ]
        stage_validation_signatures = ",".join(
            f"{stage}=VALIDATION_AUTO" for stage in stages
        )
    return f"""# SP Lite

## Lite Control

- Schema: speckit.lite.orchestrator.v1
- Feature: 001-demo
- Active Round: {active_round}
- State: {state}
- Active Round State: {round_state}
- Next Required Command: None
- Human Direction Selection: {human_selection}
- Orchestration Run ID: None
- Orchestration Status: IDLE
- Orchestration Started At: None
- Orchestration Current Stage: None

## Global Control

- Global Status: {global_status}
- Global Input Signature: {global_input}
- Current Input Signature: {current_input}
- Outline Signature: outline-v1
- Code Baseline: commit-abc
- Reuse Refs: {reuse_refs}
- Conflict Refs: {conflict_refs}
- Stale Refs: {stale_refs}
- Regression Failures: {regression_failures}
- Blocker Route: {blocker_route}
- Global Reason: test-fixture

## Active Round Scope

- Selected Candidate: CANDIDATE-A
- Selection Record: user-confirmed
- Included Outline Anchors: OUTLINE-001
- Deferred Outline Anchors: OUTLINE-002
- Business Validation Question: Does the prototype validate the workflow?
- Minimal Prototype Boundary: OUTLINE-001 only
- Reuse Plan: None
- Shared Contract Impact: None
- Allowed Write Set: src/demo.py,tests/test_demo.py
- Required Historical Regressions: LITE-R000:smoke
- Completion Evidence: {completion_evidence}
- Completed Owner Stages: {completed_stages}
- Skipped Owner Stages: {skipped_stages}
- Stage Evidence Refs: {stage_evidence_refs}
- Stage Source Signatures: {stage_source_signatures}
- Stage Validation Signatures: {stage_validation_signatures}
- Stage Skip Reasons: {stage_skip_reasons}
- Stage Skip Confirmations: {stage_skip_confirmations}
"""


def _write_owner_evidence(feature_dir: Path) -> None:
    (feature_dir / "flows").mkdir(exist_ok=True)
    (feature_dir / "ui").mkdir(exist_ok=True)
    (feature_dir / "lite-evidence" / "LITE-R001").mkdir(parents=True, exist_ok=True)
    evidence = {
        "flows/index.md": (
            "Lite Round: LITE-R001\nLite Stage: FLOW\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "Included Outline Anchors: OUTLINE-001\n"
            "Human Confirmation: CONFIRMED\nStatus: READY_FOR_UI\n"
        ),
        "ui/index.md": (
            "Lite Round: LITE-R001\nLite Stage: UI\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "Included Outline Anchors: OUTLINE-001\n"
            "Human Confirmation: CONFIRMED\nStatus: READY_FOR_PLAN\n"
        ),
        "gate.md": "- Current Verdict: `PASS`\n",
        "bundle.md": (
            "Lite Round: LITE-R001\nLite Stage: BUNDLE\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "Included Outline Anchors: OUTLINE-001\nBundle evidence\n"
        ),
        "plan.md": (
            "Lite Round: LITE-R001\nLite Stage: PLAN\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "Included Outline Anchors: OUTLINE-001\n"
            "Human Approval: CONFIRMED\nImplementation Readiness: READY\n"
        ),
        "tasks.md": (
            "Lite Round: LITE-R001\nLite Stage: TASKS\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "Included Outline Anchors: OUTLINE-001\nMode: impl\n"
        ),
        "analysis.md": "- Current Verdict: `PASS`\n",
        "lite-evidence/LITE-R001/business-gate.md": (
            "Lite Round: LITE-R001\n"
            "Lite Stage: BUSINESS_GATE\n"
            "Included Outline Anchors: OUTLINE-001\n"
            "Gate Mode: Business\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "- Current Verdict: `PASS`\n"
        ),
        "lite-evidence/LITE-R001/pre-impl-analysis.md": (
            "Lite Round: LITE-R001\n"
            "Lite Stage: PRE_IMPL_ANALYZE\n"
            "Included Outline Anchors: OUTLINE-001\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "- Current Verdict: `PASS`\n"
        ),
        "lite-evidence/LITE-R001/pre-impl-gate.md": (
            "Lite Round: LITE-R001\n"
            "Lite Stage: PRE_IMPL_GATE\n"
            "Included Outline Anchors: OUTLINE-001\n"
            "Gate Mode: Implementation Readiness\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "- Current Verdict: `PASS`\n"
        ),
        "lite-evidence/LITE-R001/final-analysis.md": (
            "Lite Round: LITE-R001\n"
            "Lite Stage: FINAL_ANALYZE\n"
            "Included Outline Anchors: OUTLINE-001\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "- Current Verdict: `PASS`\n"
        ),
        "lite-evidence/LITE-R001/final-gate.md": (
            "Lite Round: LITE-R001\n"
            "Lite Stage: FINAL_GATE\n"
            "Included Outline Anchors: OUTLINE-001\n"
            "Gate Mode: Implementation Regression\n"
            f"Source Signature: {EVIDENCE_SIGNATURE}\n"
            "- Current Verdict: `PASS`\n"
        ),
    }
    for relative_path, content in evidence.items():
        (feature_dir / relative_path).write_text(content, encoding="utf-8")


def _stage_evidence_refs() -> str:
    return (
        "SPECIFY=spec.md,FLOW=flows/index.md,UI=ui/index.md,"
        "BUSINESS_GATE=lite-evidence/LITE-R001/business-gate.md,"
        "BUNDLE=bundle.md,PLAN=plan.md,TASKS=tasks.md,"
        "PRE_IMPL_ANALYZE=lite-evidence/LITE-R001/pre-impl-analysis.md,"
        "PRE_IMPL_GATE=lite-evidence/LITE-R001/pre-impl-gate.md,"
        "FINAL_ANALYZE=lite-evidence/LITE-R001/final-analysis.md,"
        "FINAL_GATE=lite-evidence/LITE-R001/final-gate.md"
    )


def _stage_source_signatures() -> str:
    return ",".join(
        f"{stage}={EVIDENCE_SIGNATURE}"
        for stage in (
            "FLOW",
            "UI",
            "BUSINESS_GATE",
            "BUNDLE",
            "PLAN",
            "TASKS",
            "PRE_IMPL_ANALYZE",
            "PRE_IMPL_GATE",
            "IMPLEMENT",
            "FINAL_ANALYZE",
            "FINAL_GATE",
        )
    )


def _resolve_auto_signatures(project: Path) -> None:
    lite_file = next((project / "specs").glob("*/lite.md"), None)
    if lite_file is None:
        return
    content = lite_file.read_text(encoding="utf-8")
    if "Global Input Signature: AUTO" in content or "=VALIDATION_AUTO" in content:
        signature = _current_signature(project)
        content = content.replace(
            "Global Input Signature: AUTO",
            f"Global Input Signature: {signature}",
        )
        content = content.replace(
            "Current Input Signature: AUTO",
            f"Current Input Signature: {signature}",
        )
        content = content.replace("=VALIDATION_AUTO", f"={signature}")
        lite_file.write_text(content, encoding="utf-8")


def _run_bash(project: Path) -> dict:
    _resolve_auto_signatures(project)
    result = subprocess.run(
        ["bash", str(BASH_LITE_STATE), "--json"],
        cwd=project,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.fail(
            f"sp-lite-state.sh failed ({result.returncode})\n"
            f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    return json.loads(result.stdout)


def _current_signature(project: Path) -> str:
    result = subprocess.run(
        ["bash", str(BASH_LITE_STATE), "--signature"],
        cwd=project,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.fail(
            f"sp-lite-state.sh --signature failed ({result.returncode})\n"
            f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    return result.stdout.strip()


def _expected_non_git_signature(project: Path) -> str:
    entries = []
    for path in project.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(project).as_posix()
        path_hex = relative.encode("utf-8").hex()
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        entries.append(f"PATH\t{path_hex}\t{digest}\n")
    manifest = "".join(sorted(entries)).encode("utf-8")
    return hashlib.sha256(manifest).hexdigest()


def _expected_git_signature(project: Path) -> str:
    result = subprocess.run(
        ["git", "-C", str(project), "ls-files", "-co", "--exclude-standard", "-z"],
        capture_output=True,
        check=True,
    )
    entries = []
    for raw_relative in result.stdout.split(b"\0"):
        if not raw_relative:
            continue
        relative = raw_relative.decode("utf-8", errors="strict")
        path = project / relative
        if not path.is_file():
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        entries.append(f"PATH\t{raw_relative.hex()}\t{digest}\n")

    head_result = subprocess.run(
        ["git", "-C", str(project), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
    )
    head = head_result.stdout.strip() if head_result.returncode == 0 else "NO_HEAD"
    manifest = f"HEAD\t{head}\n{''.join(sorted(entries))}".encode()
    return hashlib.sha256(manifest).hexdigest()


def _write_non_ascii_git_signature_fixture(
    project: Path, *, committed: bool = False
) -> None:
    subprocess.run(["git", "init", "-q"], cwd=project, check=True)
    localized_paths = (
        "验证/最小原型.txt",
        "検証/試作.txt",
        "검증/원형.txt",
        "emoji/原型-🧪.txt",
        "unicode/e\u0301.txt",
        "spaces/a b.txt",
        "controls/a\tb.txt",
    )
    for index, relative in enumerate(reversed(localized_paths)):
        localized = project / relative
        localized.parent.mkdir(parents=True, exist_ok=True)
        localized.write_text(f"业务验证-{index}\n", encoding="utf-8")
    if committed:
        subprocess.run(["git", "add", "--all"], cwd=project, check=True)
        subprocess.run(
            [
                "git",
                "-c",
                "user.name=SP Lite Tests",
                "-c",
                "user.email=sp-lite-tests@example.invalid",
                "commit",
                "-qm",
                "test fixture",
            ],
            cwd=project,
            check=True,
        )


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


def _run_powershell(project: Path) -> dict:
    if not _has_powershell():
        pytest.skip("PowerShell not available")
    _resolve_auto_signatures(project)
    result = subprocess.run(
        ["pwsh", "-NoProfile", "-File", str(POWERSHELL_LITE_STATE), "-Json"],
        cwd=project,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def _current_powershell_signature(project: Path) -> str:
    if not _has_powershell():
        pytest.skip("PowerShell not available")
    result = subprocess.run(
        ["pwsh", "-NoProfile", "-File", str(POWERSHELL_LITE_STATE), "-Signature"],
        cwd=project,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.fail(
            f"sp-lite-state.ps1 -Signature failed ({result.returncode})\n"
            f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    return result.stdout.strip()


def _assert_schema(payload: dict) -> None:
    assert payload["schema"] == "speckit.lite.route.v1"
    assert payload["next"].startswith("/sp.")
    assert payload["blockerRoute"].startswith("/sp.")
    assert isinstance(payload["continueAllowed"], bool)
    assert isinstance(payload["requiresHuman"], bool)
    assert payload["globalControl"] in {
        "CLEAR",
        "REUSE_REQUIRED",
        "RECONCILE_REQUIRED",
        "STALE_EVIDENCE",
        "REGRESSION_BLOCKED",
    }
    for key in ("reuseRefs", "conflictRefs", "staleRefs", "regressionFailures"):
        assert isinstance(payload[key], list)


@requires_bash
def test_lite_state_routes_foundation_before_candidates(tmp_path):
    project, feature_dir = _init_project(tmp_path)

    payload = _run_bash(project)
    _assert_schema(payload)
    assert payload["status"] == "NEEDS_FOUNDATION"
    assert payload["next"] == "/sp.prd"

    _write_foundation(feature_dir)
    payload = _run_bash(project)
    assert payload["status"] == "NEEDS_CANDIDATES"
    assert payload["next"] == "/sp.lite"
    assert payload["requiresHuman"] is True
    assert payload["continueAllowed"] is False


@requires_bash
def test_lite_state_auto_dispatches_prd_for_an_active_incomplete_feature(tmp_path):
    project, _ = _init_project(tmp_path)

    payload = _run_bash(project)

    assert payload["status"] == "NEEDS_FOUNDATION"
    assert payload["next"] == "/sp.prd"
    assert payload["globalControl"] == "CLEAR"
    assert payload["staleRefs"] == []
    assert payload["continueAllowed"] is True
    assert payload["requiresHuman"] is False


@requires_bash
def test_lite_state_routes_to_specify_when_prd_and_outline_are_ready(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_prd_outline(feature_dir)

    payload = _run_bash(project)

    assert payload["status"] == "NEEDS_SPEC"
    assert payload["next"] == "/sp.specify"
    assert payload["reason"] == "spec-missing-or-seed"
    assert payload["globalControl"] == "CLEAR"
    assert payload["staleRefs"] == []
    assert payload["continueAllowed"] is True
    assert payload["requiresHuman"] is False


@requires_bash
def test_lite_state_maps_lifecycle_to_one_owner_command(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(_lite_state(), encoding="utf-8")

    payload = _run_bash(project)

    _assert_schema(payload)
    assert payload["status"] == "NEEDS_FLOW"
    assert payload["next"] == "/sp.flow"
    assert payload["continueAllowed"] is True
    assert payload["requiresHuman"] is False
    assert payload["activeRound"] == "LITE-R001"


@requires_bash
@pytest.mark.parametrize(
    ("state", "completed_stages", "expected_next", "requires_human"),
    [
        ("NEEDS_BUSINESS_GATE", "SPECIFY,FLOW,UI", "/sp.gate", False),
        ("NEEDS_BUNDLE", "SPECIFY,FLOW,UI,BUSINESS_GATE", "/sp.bundle", False),
        ("NEEDS_PLAN", "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE", "/sp.plan", False),
        ("NEEDS_TASKS", "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN", "/sp.tasks", False),
        (
            "NEEDS_PRE_IMPL_ANALYZE",
            "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN,TASKS",
            "/sp.analyze",
            False,
        ),
        (
            "NEEDS_PRE_IMPL_GATE",
            "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN,TASKS,PRE_IMPL_ANALYZE",
            "/sp.gate",
            False,
        ),
        (
            "NEEDS_IMPLEMENT",
            "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN,TASKS,PRE_IMPL_ANALYZE,PRE_IMPL_GATE",
            "/sp.implement",
            False,
        ),
        (
            "NEEDS_FINAL_ANALYZE",
            "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN,TASKS,PRE_IMPL_ANALYZE,PRE_IMPL_GATE,IMPLEMENT",
            "/sp.analyze",
            False,
        ),
        (
            "NEEDS_FINAL_GATE",
            "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN,TASKS,PRE_IMPL_ANALYZE,PRE_IMPL_GATE,IMPLEMENT,FINAL_ANALYZE",
            "/sp.gate",
            False,
        ),
        (
            "READY_FOR_BUSINESS_VALIDATION",
            "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN,TASKS,PRE_IMPL_ANALYZE,PRE_IMPL_GATE,IMPLEMENT,FINAL_ANALYZE,FINAL_GATE",
            "/sp.lite",
            True,
        ),
    ],
)
def test_lite_state_routes_every_gate_and_analysis_checkpoint(
    tmp_path,
    state,
    completed_stages,
    expected_next,
    requires_human,
):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    _write_owner_evidence(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state=state,
            completed_stages=completed_stages,
            stage_evidence_refs=_stage_evidence_refs(),
            completion_evidence="src/demo.py,tests/test_demo.py",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["status"] == state
    assert payload["next"] == expected_next
    assert payload["continueAllowed"] is (not requires_human)
    assert payload["requiresHuman"] is requires_human


@requires_bash
def test_ready_for_business_validation_requires_final_gate_evidence(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    _write_owner_evidence(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state="READY_FOR_BUSINESS_VALIDATION",
            completed_stages="SPECIFY,FLOW,UI",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["next"] == "/sp.lite"
    assert payload["blockerType"] == "INVALID_STAGE_EVIDENCE"
    assert payload["reason"] == "prior-owner-evidence-incomplete"


@requires_bash
@pytest.mark.parametrize(
    ("state", "completed_stages", "evidence_file", "old_line", "new_line"),
    [
        (
            "NEEDS_UI",
            "SPECIFY,FLOW",
            "flows/index.md",
            "Lite Round: LITE-R001",
            "Lite Round: LITE-R000",
        ),
        (
            "NEEDS_BUSINESS_GATE",
            "SPECIFY,FLOW,UI",
            "ui/index.md",
            "Included Outline Anchors: OUTLINE-001",
            "Included Outline Anchors: OUTLINE-999",
        ),
        (
            "NEEDS_TASKS",
            "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN",
            "plan.md",
            "Human Approval: CONFIRMED",
            "Human Approval: REQUIRED",
        ),
    ],
)
def test_lite_state_rejects_owner_evidence_not_bound_to_current_round(
    tmp_path,
    state,
    completed_stages,
    evidence_file,
    old_line,
    new_line,
):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    _write_owner_evidence(feature_dir)
    path = feature_dir / evidence_file
    path.write_text(
        path.read_text(encoding="utf-8").replace(old_line, new_line),
        encoding="utf-8",
    )
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state=state,
            completed_stages=completed_stages,
            stage_evidence_refs=_stage_evidence_refs(),
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["next"] == "/sp.lite"
    assert payload["blockerType"] == "INVALID_STAGE_EVIDENCE"
    assert payload["continueAllowed"] is False


@requires_bash
def test_lite_state_rejects_flow_ui_skip_without_human_confirmation(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state="NEEDS_BUSINESS_GATE",
            completed_stages="SPECIFY",
            skipped_stages="FLOW,UI",
            stage_skip_reasons="FLOW=no process delta;UI=no user interface",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["next"] == "/sp.lite"
    assert payload["blockerType"] == "INVALID_STAGE_EVIDENCE"
    assert payload["continueAllowed"] is False


@requires_bash
def test_lite_state_accepts_human_confirmed_flow_ui_skip(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state="NEEDS_BUSINESS_GATE",
            completed_stages="SPECIFY",
            skipped_stages="FLOW,UI",
            stage_skip_reasons="FLOW=no process delta;UI=no user interface",
            stage_skip_confirmations=(
                "FLOW=NOT_REQUIRED_CONFIRMED;UI=NOT_REQUIRED_CONFIRMED"
            ),
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["next"] == "/sp.gate"
    assert payload["continueAllowed"] is True


@requires_bash
def test_lite_state_rejects_snapshot_signature_not_in_round_ledger(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    _write_owner_evidence(feature_dir)
    evidence = feature_dir / "lite-evidence/LITE-R001/business-gate.md"
    evidence.write_text(
        evidence.read_text(encoding="utf-8").replace(
            EVIDENCE_SIGNATURE,
            "b" * 64,
        ),
        encoding="utf-8",
    )
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state="NEEDS_BUNDLE",
            completed_stages="SPECIFY,FLOW,UI,BUSINESS_GATE",
            stage_evidence_refs=_stage_evidence_refs(),
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["next"] == "/sp.lite"
    assert payload["blockerType"] == "INVALID_STAGE_EVIDENCE"
    assert payload["continueAllowed"] is False


@requires_bash
def test_lite_state_rejects_protected_evidence_on_an_old_validation_baseline(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    _write_owner_evidence(feature_dir)
    old_signature = "c" * 64
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state="NEEDS_BUNDLE",
            completed_stages="SPECIFY,FLOW,UI,BUSINESS_GATE",
            stage_evidence_refs=_stage_evidence_refs(),
            stage_validation_signatures=",".join(
                f"{stage}={old_signature}"
                for stage in ("SPECIFY", "FLOW", "UI", "BUSINESS_GATE")
            ),
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["next"] == "/sp.lite"
    assert payload["blockerType"] == "INVALID_STAGE_EVIDENCE"
    assert payload["continueAllowed"] is False


@requires_bash
@pytest.mark.parametrize(
    ("state", "completed_stages", "evidence_file"),
    [
        (
            "NEEDS_BUNDLE",
            "SPECIFY,FLOW,UI,BUSINESS_GATE",
            "lite-evidence/LITE-R001/business-gate.md",
        ),
        (
            "NEEDS_PRE_IMPL_GATE",
            "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN,TASKS,PRE_IMPL_ANALYZE",
            "lite-evidence/LITE-R001/pre-impl-analysis.md",
        ),
    ],
)
def test_non_verdict_pass_text_does_not_satisfy_owner_evidence(
    tmp_path,
    state,
    completed_stages,
    evidence_file,
):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    _write_owner_evidence(feature_dir)
    evidence_path = feature_dir / evidence_file
    evidence_path.write_text(
        evidence_path.read_text(encoding="utf-8").replace(
            "- Current Verdict: `PASS`",
            "- Current Verdict: `FAIL`\nPrior round: PASS",
        ),
        encoding="utf-8",
    )
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state=state,
            completed_stages=completed_stages,
            stage_evidence_refs=_stage_evidence_refs(),
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["next"] == "/sp.lite"
    assert payload["continueAllowed"] is False
    assert payload["blockerType"] == "INVALID_STAGE_EVIDENCE"


@requires_bash
def test_lite_state_rejects_shared_gate_and_analysis_evidence_refs(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    _write_owner_evidence(feature_dir)
    shared = feature_dir / "lite-evidence" / "LITE-R001" / "shared-pass.md"
    shared.write_text(
        "Lite Round: LITE-R001\n"
        "Lite Stage: BUSINESS_GATE\n"
        "Gate Mode: Business\n"
        "Source Signature: shared-v1\n"
        "Current Verdict: PASS\n",
        encoding="utf-8",
    )
    refs = (
        "SPECIFY=spec.md,FLOW=flows/index.md,UI=ui/index.md,"
        "BUSINESS_GATE=lite-evidence/LITE-R001/shared-pass.md,"
        "BUNDLE=bundle.md,PLAN=plan.md,TASKS=tasks.md,"
        "PRE_IMPL_ANALYZE=lite-evidence/LITE-R001/shared-pass.md,"
        "PRE_IMPL_GATE=lite-evidence/LITE-R001/shared-pass.md,"
        "FINAL_ANALYZE=lite-evidence/LITE-R001/shared-pass.md,"
        "FINAL_GATE=lite-evidence/LITE-R001/shared-pass.md"
    )
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state="READY_FOR_BUSINESS_VALIDATION",
            completed_stages=(
                "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN,TASKS,"
                "PRE_IMPL_ANALYZE,PRE_IMPL_GATE,IMPLEMENT,FINAL_ANALYZE,FINAL_GATE"
            ),
            stage_evidence_refs=refs,
            completion_evidence="src/demo.py,tests/test_demo.py",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["blockerType"] == "INVALID_STAGE_EVIDENCE"
    assert payload["continueAllowed"] is False


@requires_bash
@pytest.mark.parametrize(
    ("stage", "replacement"),
    [
        ("PRE_IMPL_GATE", "Gate Mode: Business"),
        ("FINAL_ANALYZE", "Lite Round: LITE-R002"),
        ("FINAL_GATE", "Lite Stage: PRE_IMPL_GATE"),
    ],
)
def test_lite_state_rejects_snapshot_with_wrong_round_stage_or_gate_mode(
    tmp_path,
    stage,
    replacement,
):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    _write_owner_evidence(feature_dir)
    ref = next(
        entry.split("=", 1)[1]
        for entry in _stage_evidence_refs().split(",")
        if entry.startswith(f"{stage}=")
    )
    path = feature_dir / ref
    lines = path.read_text(encoding="utf-8").splitlines()
    key = replacement.split(":", 1)[0]
    path.write_text(
        "\n".join(replacement if line.startswith(f"{key}:") else line for line in lines) + "\n",
        encoding="utf-8",
    )
    (feature_dir / "lite.md").write_text(
        _lite_state(
            state="READY_FOR_BUSINESS_VALIDATION",
            completed_stages=(
                "SPECIFY,FLOW,UI,BUSINESS_GATE,BUNDLE,PLAN,TASKS,"
                "PRE_IMPL_ANALYZE,PRE_IMPL_GATE,IMPLEMENT,FINAL_ANALYZE,FINAL_GATE"
            ),
            stage_evidence_refs=_stage_evidence_refs(),
            completion_evidence="src/demo.py,tests/test_demo.py",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["blockerType"] == "INVALID_STAGE_EVIDENCE"
    assert payload["continueAllowed"] is False


@requires_bash
@pytest.mark.parametrize(
    ("active_round", "human_selection"),
    [("None", "REQUIRED"), ("LITE-R001", "REQUIRED")],
)
def test_lite_state_never_dispatches_without_a_confirmed_active_round(
    tmp_path,
    active_round,
    human_selection,
):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(
            active_round=active_round,
            human_selection=human_selection,
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["next"] == "/sp.lite"
    assert payload["continueAllowed"] is False
    assert payload["requiresHuman"] is True
    assert payload["blockerType"] == "INVALID_LITE_AUTHORIZATION"


@pytest.mark.parametrize(
    ("global_status", "kwargs", "expected_route", "expected_blocker"),
    [
        (
            "REUSE_REQUIRED",
            {"reuse_refs": "LITE-R000:A-001"},
            "/sp.lite",
            "DUPLICATE_SCOPE",
        ),
        (
            "RECONCILE_REQUIRED",
            {"conflict_refs": "API-01", "blocker_route": "/sp.plan"},
            "/sp.plan",
            "GLOBAL_CONFLICT",
        ),
        (
            "STALE_EVIDENCE",
            {"stale_refs": "spec-outline.md"},
            "/sp.lite",
            "STALE_EVIDENCE",
        ),
        (
            "REGRESSION_BLOCKED",
            {"regression_failures": "LITE-R000:smoke", "blocker_route": "/sp.tasks"},
            "/sp.tasks",
            "HISTORY_REGRESSION",
        ),
    ],
)
@requires_bash
def test_global_control_blocks_lifecycle_route(
    tmp_path,
    global_status,
    kwargs,
    expected_route,
    expected_blocker,
):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(global_status=global_status, **kwargs),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["globalControl"] == global_status
    assert payload["next"] == expected_route
    assert payload["blockerType"] == expected_blocker
    assert payload["continueAllowed"] is False
    assert payload["requiresHuman"] is True


@requires_bash
def test_old_clear_is_stale_when_global_input_changes(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(global_input="global-v1", current_input="global-v2"),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["globalControl"] == "STALE_EVIDENCE"
    assert payload["next"] == "/sp.lite"
    assert payload["reason"] == "global-input-signature-changed"
    assert payload["continueAllowed"] is False


@requires_bash
def test_old_clear_is_stale_when_an_external_global_input_changes(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    signature = _current_signature(project)
    (feature_dir / "lite.md").write_text(
        _lite_state(global_input=signature, current_input=signature),
        encoding="utf-8",
    )

    initial = _run_bash(project)
    assert initial["continueAllowed"] is True

    (feature_dir / "prd.md").write_text(
        "Status: READY_FOR_SPECIFY\nBusiness scope: externally changed\n",
        encoding="utf-8",
    )
    payload = _run_bash(project)

    assert payload["globalControl"] == "STALE_EVIDENCE"
    assert payload["next"] == "/sp.lite"
    assert payload["reason"] == "global-input-signature-changed"
    assert payload["currentInputSignature"] != signature
    assert "global-input-signature" in payload["staleRefs"]


@requires_bash
def test_lifecycle_state_cannot_jump_without_prior_owner_evidence(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(state="NEEDS_IMPLEMENT"),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["next"] == "/sp.lite"
    assert payload["continueAllowed"] is False
    assert payload["requiresHuman"] is True
    assert payload["blockerType"] == "INVALID_STAGE_EVIDENCE"
    assert payload["reason"] == "prior-owner-evidence-incomplete"


@requires_bash
def test_conflict_refs_take_precedence_over_reuse_status(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(
            global_status="REUSE_REQUIRED",
            reuse_refs="LITE-R000:A-001",
            conflict_refs="API-01",
            blocker_route="/sp.plan",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["globalControl"] == "RECONCILE_REQUIRED"
    assert payload["next"] == "/sp.plan"
    assert payload["blockerType"] == "GLOBAL_CONFLICT"
    assert payload["continueAllowed"] is False


@requires_bash
def test_regression_failures_cannot_be_hidden_by_clear_status(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(
            global_status="CLEAR",
            regression_failures="LITE-R000:smoke",
            blocker_route="/sp.tasks",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["globalControl"] == "REGRESSION_BLOCKED"
    assert payload["next"] == "/sp.tasks"
    assert payload["blockerType"] == "HISTORY_REGRESSION"
    assert payload["continueAllowed"] is False


@requires_bash
def test_bash_and_powershell_lite_state_parity(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(
            global_status="RECONCILE_REQUIRED",
            conflict_refs="API-01,DATA-02",
            blocker_route="/sp.plan",
        ),
        encoding="utf-8",
    )

    assert _run_powershell(project) == _run_bash(project)


@requires_bash
def test_bash_signature_ignores_top_level_python_cache(tmp_path):
    project, _ = _init_project(tmp_path)
    before = _current_signature(project)

    cache_dir = project / "__pycache__"
    cache_dir.mkdir()
    (cache_dir / "generated.pyc").write_bytes(b"generated cache")

    assert _current_signature(project) == before


@requires_bash
def test_bash_non_git_signature_matches_the_utf8_hex_manifest_contract(tmp_path):
    project, _ = _init_project(tmp_path)
    paths = (
        project / "验证" / "原型-🧪.txt",
        project / ".hidden" / "验证.txt",
        project / "controls" / "line\nbreak.txt",
        project / "literal\\backslash.txt",
    )
    for index, path in enumerate(paths):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"payload-{index}\n", encoding="utf-8")

    assert _current_signature(project) == _expected_non_git_signature(project)


@requires_bash
@pytest.mark.parametrize("committed", [False, True])
def test_bash_git_signature_matches_the_utf8_hex_manifest_contract(
    tmp_path, committed
):
    project, _ = _init_project(tmp_path)
    _write_non_ascii_git_signature_fixture(project, committed=committed)

    expected_signature = _expected_git_signature(project)
    assert _current_signature(project) == expected_signature


@pytest.mark.parametrize("committed", [False, True])
def test_powershell_git_signature_matches_the_utf8_hex_manifest_contract(
    tmp_path, committed
):
    project, _ = _init_project(tmp_path)
    _write_non_ascii_git_signature_fixture(project, committed=committed)

    expected_signature = _expected_git_signature(project)
    assert _current_powershell_signature(project) == expected_signature


def test_powershell_non_git_signature_matches_the_utf8_hex_manifest_contract(tmp_path):
    project, _ = _init_project(tmp_path)

    paths = [project / ".hidden" / "验证.txt"]
    if os.name != "nt":
        paths.append(project / "literal\\backslash.txt")

    for index, path in enumerate(paths):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"hidden-payload-{index}\n", encoding="utf-8")

    expected_signature = _expected_non_git_signature(project)
    assert _current_powershell_signature(project) == expected_signature


@requires_bash
def test_lowercase_global_status_is_invalid_instead_of_platform_dependent(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(global_status="clear"),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["globalControl"] == "STALE_EVIDENCE"
    assert payload["reason"] == "global-control-invalid"
    assert payload["continueAllowed"] is False

    powershell_source = POWERSHELL_LITE_STATE.read_text(encoding="utf-8")
    assert "switch -CaseSensitive ($globalStatus)" in powershell_source
    assert "switch -CaseSensitive ($state)" in powershell_source
    assert "$activeRound -cnotmatch '^LITE-R[0-9]{3,}$'" in powershell_source
    assert "$_ -cin @('READY_FOR_BUSINESS_VALIDATION'" in powershell_source


@requires_bash
def test_round_complete_is_rejected_as_an_unknown_lifecycle_state(tmp_path):
    project, feature_dir = _init_project(tmp_path)
    _write_foundation(feature_dir)
    (feature_dir / "lite.md").write_text(
        _lite_state(state="ROUND_COMPLETE"),
        encoding="utf-8",
    )

    payload = _run_bash(project)

    assert payload["blockerType"] == "INVALID_LITE_STATE"
    assert payload["reason"] == "unknown-lite-state"
    assert payload["requiresHuman"] is True


def test_lite_artifact_template_separates_round_coverage_and_global_control():
    content = LITE_TEMPLATE.read_text(encoding="utf-8")

    for token in (
        "SP_STAGE_SEED: lite",
        "## Lite Control",
        "## Global Control",
        "## Candidate Set",
        "## Round Ledger",
        "## Outline Coverage Ledger",
        "Scope Status",
        "Delivery Status",
        "Evidence Status",
        "Global Input Signature",
        "Current Input Signature",
        "Regression Failures",
        "Completed Owner Stages",
        "Skipped Owner Stages",
        "Stage Evidence Refs",
        "Stage Source Signatures",
        "Stage Validation Signatures",
        "Stage Skip Reasons",
        "Stage Skip Confirmations",
        "Schema: speckit.lite.orchestrator.v1",
        "Orchestration Run ID",
        "Orchestration Status: IDLE",
        "Orchestration Started At",
        "Orchestration Current Stage",
    ):
        assert token in content

    assert "Global Status: CLEAR" in content
    assert "Stale Refs: None" in content


def test_lite_owner_commands_read_the_persisted_active_round_field():
    for command in LITE_OWNER_COMMANDS:
        content = (REPO_ROOT / "templates" / "commands" / f"{command}.md").read_text(encoding="utf-8")
        assert "`Active Round`" in content, command
        assert "read its `Lite Round`" not in content, command


def test_lite_owner_commands_publish_round_scoped_evidence_contract():
    contents = {
        command: (REPO_ROOT / "templates" / "commands" / f"{command}.md").read_text(
            encoding="utf-8"
        )
        for command in LITE_OWNER_COMMANDS
        if command != "specify"
    }

    for command, content in contents.items():
        for token in (
            "`Lite Round`",
            "`Lite Stage`",
            "`Included Outline Anchors`",
            "`Source Signature`",
        ):
            assert token in content, (command, token)

    assert "`Human Confirmation: CONFIRMED`" in contents["flow"]
    assert "`Human Confirmation: CONFIRMED`" in contents["ui"]
    assert "`Human Approval: CONFIRMED`" in contents["plan"]
    assert "`lite-evidence/<LITE-RNNN>/`" in contents["gate"]
    assert "`Gate Mode`" in contents["gate"]
    assert "`lite-evidence/<LITE-RNNN>/`" in contents["analyze"]
    assert "`Completion Evidence`" in contents["implement"]


def test_lite_command_uses_deterministic_global_route_and_human_selection():
    content = LITE_COMMAND.read_text(encoding="utf-8")

    for token in (
        "sp-lite-state",
        "speckit.lite.route.v1",
        "2-3 materially different candidates",
        "must not select a direction for the user",
        "confirmed Outline",
        "historical Lite rounds",
        "shared interfaces, data models, and permissions",
        "Allowed Write Set",
        "execute exactly one owner command",
        "REUSE_REQUIRED",
        "RECONCILE_REQUIRED",
        "STALE_EVIDENCE",
        "REGRESSION_BLOCKED",
        "NEEDS_BUSINESS_GATE",
        "NEEDS_PRE_IMPL_ANALYZE",
        "NEEDS_PRE_IMPL_GATE",
        "NEEDS_FINAL_ANALYZE",
        "NEEDS_FINAL_GATE",
        "READY_FOR_BUSINESS_VALIDATION",
        "OUTLINE_COMPLETE_VIA_LITE",
        "NEXT_COMMAND_EXEC",
        "acquire the orchestration lease",
        "refuse concurrent mutation",
        "explicit human-confirmed takeover",
        "release the lease",
        "Stage Validation Signatures",
        "impact-reconciled",
    ):
        assert token in content

    assert "ROUND_COMPLETE" not in content
    assert "EXECUTE_COMMAND: /sp.<owner>" in content
    assert "globalControl=CLEAR" in content
    assert "continueAllowed=true" in content
    assert "requiresHuman=false" in content


def test_lite_command_never_creates_an_outline_unmapped_independent_round():
    content = LITE_COMMAND.read_text(encoding="utf-8")

    assert "cannot be mapped to confirmed Outline anchors" in content
    assert "return to `/sp.prd` or `/sp.clarify`" in content
    assert "must not create a Lite round" in content
    assert "or explicitly recorded as an independent branch" not in content


def test_powershell_source_enforces_the_round_evidence_ledger():
    content = POWERSHELL_LITE_STATE.read_text(encoding="utf-8")

    for token in (
        "Stage Source Signatures",
        "Stage Validation Signatures",
        "Stage Skip Confirmations",
        "Test-RoundStageEvidence",
        "NOT_REQUIRED_CONFIRMED",
        "Included Outline Anchors",
        "Human Confirmation",
        "Human Approval",
    ):
        assert token in content

    assert "ls-files -co --exclude-standard -z" in content
    assert "[char]0" in content
    assert "ROUND_COMPLETE" not in content


def test_bilingual_readmes_publish_the_lite_entry_point():
    english = README_EN.read_text(encoding="utf-8")
    chinese = README_ZH.read_text(encoding="utf-8")

    for content in (english, chinese):
        assert "/sp.lite" in content
        assert "2-3" in content
        assert "Outline" in content
