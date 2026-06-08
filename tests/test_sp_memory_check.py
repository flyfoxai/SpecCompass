"""Regression tests for the lightweight SP memory checker."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from tests.conftest import requires_bash


PROJECT_ROOT = Path(__file__).resolve().parent.parent
BASH_CHECK = PROJECT_ROOT / "scripts" / "bash" / "check-sp-memory.sh"
POWERSHELL_CHECK = PROJECT_ROOT / "scripts" / "powershell" / "check-sp-memory.ps1"


TRACE_INDEX = """# Trace Index

| Trace ID | Coordinate | Expand Docs |
| --- | --- | --- |
| `TRACE-001` | `FEAT01.WS01.ACC01` | `spec.md`, `plan.md`, `ui/screen-primary.md` |
"""

OPEN_ITEMS_EMPTY = """# Open Items

## Items

No open items yet.
"""

OPEN_ITEMS_EMPTY_TABLE = """# Open Items

## Items

| Item ID | Type | Severity | Domain | Workset | Anchor | Tags | Owner | Description | Impact Area | Affected Docs | Suggested Rollback | Close Condition | Last Refresh | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
"""

OPEN_ITEMS_EMPTY_TABLE_VARIANT = """# Open Items

## Items

| ID | Type | Status |
| -- | -- | -- |
| | | |
"""


def _open_item_block(
    item_id: str,
    item_type: str,
    *,
    severity: str = "High",
    anchor: str = "`TRACE-001`",
    owner: str = "Lead",
    impact_area: str = "Acceptance",
    affected_docs: str = "`spec.md`",
    rollback: str = "Stop rollout",
    close_condition: str = "Decision recorded",
    last_refresh: str = "2026-05-22",
    status: str = "Open",
    description: str = "Needs decision",
    tags: str = "`@t0`",
) -> str:
    return f"""# Open Items

## Items

### {item_id}

- Type: {item_type}
- Severity: {severity}
- Domain: Scope
- Workset: WS-01
- Anchor: {anchor}
- Tags: {tags}
- Owner: {owner}
- Description: {description}
- Impact Area: {impact_area}
- Affected Docs: {affected_docs}
- Suggested Rollback: {rollback}
- Close Condition: {close_condition}
- Last Refresh: {last_refresh}
- Status: {status}
"""


def _feature(tmp_path: Path) -> Path:
    feature = tmp_path / "specs" / "demo-feature"
    (feature / "memory").mkdir(parents=True)
    (feature / "memory" / "trace-index.md").write_text(TRACE_INDEX, encoding="utf-8")
    (feature / "memory" / "open-items.md").write_text(OPEN_ITEMS_EMPTY, encoding="utf-8")
    return feature


def _bash_path(path: Path) -> str:
    return path.as_posix()


def _run_bash(feature: Path, *extra: str) -> dict:
    result = subprocess.run(
        ["bash", _bash_path(BASH_CHECK), "--json", "--feature-dir", _bash_path(feature), *extra],
        check=True,
        text=True,
        capture_output=True,
    )
    return json.loads(result.stdout)


def _run_powershell(feature: Path) -> dict:
    result = subprocess.run(
        [
            "pwsh",
            "-NoProfile",
            "-Command",
            (
                "$ErrorActionPreference='Stop'; "
                f"try {{ & '{POWERSHELL_CHECK}' -Json -FeatureDir '{feature}' }} "
                "catch { Write-Error ($_.Exception.Message + \"`n\" + $_.ScriptStackTrace); exit 1 }"
            ),
        ],
        text=True,
        capture_output=True,
    )
    assert result.returncode == 0, (
        f"PowerShell memory check failed with exit code {result.returncode}\n"
        f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
    )
    return json.loads(result.stdout)


@requires_bash
def test_empty_open_items_table_passes(tmp_path: Path):
    feature = _feature(tmp_path)

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert payload["errorCount"] == 0
    assert payload["warningCount"] == 0


@requires_bash
def test_empty_open_items_markdown_table_skeleton_passes(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(OPEN_ITEMS_EMPTY_TABLE, encoding="utf-8")

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert payload["errorCount"] == 0
    assert payload["warningCount"] == 0


@requires_bash
def test_empty_open_items_table_variant_passes(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(OPEN_ITEMS_EMPTY_TABLE_VARIANT, encoding="utf-8")

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert payload["errorCount"] == 0
    assert payload["warningCount"] == 0


@requires_bash
def test_open_blocker_blocks_pass(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block("OPEN-001", "Blocker", tags="`@r0`"),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OPEN_BLOCKER" and f["nextStep"] == "/sp.gate" for f in payload["findings"])


@requires_bash
def test_low_medium_question_todo_can_stay_lightweight(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-002",
            "Todo",
            severity="Low",
            anchor="-",
            affected_docs="-",
            rollback="-",
            close_condition="-",
            last_refresh="-",
            description="Missing copy",
            impact_area="UI",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert payload["errorCount"] == 0
    assert any(f["code"] == "OPEN_ITEM_TRACE_LINK_MISSING" for f in payload["findings"])


@requires_bash
def test_high_impact_open_items_require_full_fields(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-002H",
            "Todo",
            severity="High",
            anchor="-",
            affected_docs="-",
            rollback="-",
            close_condition="-",
            last_refresh="-",
            description="Missing release decision",
            impact_area="Release",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OPEN_ITEM_REQUIRED_FIELD_MISSING" for f in payload["findings"])
    assert any(f["code"] == "OPEN_ITEM_TRACE_LINK_MISSING" for f in payload["findings"])


@requires_bash
def test_open_item_must_link_to_trace_index(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-003",
            "Question",
            anchor="`TRACE-999`",
            affected_docs="`missing.md`",
            rollback="Keep old endpoint",
            close_condition="Endpoint decided",
            description="Unknown endpoint",
            impact_area="API",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OPEN_ITEM_TRACE_LINK_MISSING" for f in payload["findings"])


@requires_bash
def test_markdown_link_anchor_resolves_to_trace_index(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-003L",
            "Question",
            anchor="[TRACE-001](memory/trace-index.md)",
            affected_docs="[spec.md](../spec.md)",
            rollback="Keep old endpoint",
            close_condition="Endpoint decided",
            description="Unknown endpoint",
            impact_area="API",
            status="Closed",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


@requires_bash
def test_r0_source_tag_requires_open_risk_or_blocker(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec.md").write_text("Payment rollback gap @r0\n", encoding="utf-8")

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "R0_WITHOUT_OPEN_RISK" for f in payload["findings"])


@requires_bash
def test_t0_source_tag_warns_without_open_item(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec.md").write_text("Copy decision pending @t0\n", encoding="utf-8")

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "T0_WITHOUT_OPEN_ITEM" for f in payload["findings"])


def test_powershell_checker_matches_bash_shape_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        return

    feature = _feature(tmp_path)
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert payload["featureDir"] == str(feature)
    assert payload["findings"] == []


def test_powershell_checker_empty_table_skeleton_passes_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        return

    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(OPEN_ITEMS_EMPTY_TABLE_VARIANT, encoding="utf-8")
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


def test_powershell_checker_detects_r0_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        return

    feature = _feature(tmp_path)
    (feature / "spec.md").write_text("Payment rollback gap @r0\n", encoding="utf-8")
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "R0_WITHOUT_OPEN_RISK" for f in payload["findings"])


def test_powershell_checker_resolves_markdown_link_anchor_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        return

    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-003LP",
            "Question",
            anchor="[TRACE-001](memory/trace-index.md)",
            affected_docs="[spec.md](../spec.md)",
            rollback="Keep old endpoint",
            close_condition="Endpoint decided",
            description="Unknown endpoint",
            impact_area="API",
            status="Closed",
        ),
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


def test_command_templates_reference_lightweight_memory_check():
    commands_dir = PROJECT_ROOT / "templates" / "commands"
    for command in ("analyze", "gate"):
        content = (commands_dir / f"{command}.md").read_text(encoding="utf-8")
        assert "check-sp-memory.sh --json" in content
        assert "check-sp-memory.ps1 -Json" in content
        assert "`ERROR` findings block PASS" in content
        assert "`WARN` findings do not automatically block PASS" in content
