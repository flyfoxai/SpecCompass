"""Regression tests for the lightweight SP memory checker."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from tests.conftest import requires_bash


PROJECT_ROOT = Path(__file__).resolve().parent.parent
BASH_CHECK = PROJECT_ROOT / "scripts" / "bash" / "check-sp-memory.sh"
POWERSHELL_CHECK = PROJECT_ROOT / "scripts" / "powershell" / "check-sp-memory.ps1"
OUTLINE_DIGEST = (
    PROJECT_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "review"
    / "scripts"
    / "outline-digest.mjs"
)
REVIEW_DATA_ID = (
    PROJECT_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "review"
    / "scripts"
    / "review-data-id.mjs"
)


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
    close_evidence: str = "",
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
- Close Evidence: {close_evidence}
- Last Refresh: {last_refresh}
- Status: {status}
"""


def _feature(tmp_path: Path) -> Path:
    feature = tmp_path / "specs" / "demo-feature"
    (feature / "memory").mkdir(parents=True)
    (feature / "ui").mkdir(parents=True)
    (feature / "memory" / "trace-index.md").write_text(TRACE_INDEX, encoding="utf-8")
    (feature / "memory" / "open-items.md").write_text(OPEN_ITEMS_EMPTY, encoding="utf-8")
    (feature / "spec.md").write_text("# Demo spec\n", encoding="utf-8")
    (feature / "plan.md").write_text("# Demo plan\n", encoding="utf-8")
    (feature / "ui" / "screen-primary.md").write_text("# Primary screen\n", encoding="utf-8")
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


def _assert_checker_payload_shape(payload: dict, *, needs_human_review: bool):
    assert isinstance(payload["status"], str)
    assert isinstance(payload["errorCount"], int)
    assert isinstance(payload["warningCount"], int)
    assert isinstance(payload["needsHumanReview"], bool)
    assert payload["needsHumanReview"] is needs_human_review
    assert isinstance(payload["findings"], list)


def _assert_bash_powershell_consistent(feature: Path, *, needs_human_review: bool):
    bash_payload = _run_bash(feature)
    _assert_checker_payload_shape(bash_payload, needs_human_review=needs_human_review)

    if not shutil.which("pwsh"):
        return bash_payload, None

    powershell_payload = _run_powershell(feature)
    _assert_checker_payload_shape(powershell_payload, needs_human_review=needs_human_review)
    assert powershell_payload["status"] == bash_payload["status"]
    assert powershell_payload["errorCount"] == bash_payload["errorCount"]
    assert powershell_payload["warningCount"] == bash_payload["warningCount"]
    assert [finding["code"] for finding in powershell_payload["findings"]] == [
        finding["code"] for finding in bash_payload["findings"]
    ]
    return bash_payload, powershell_payload


def _compute_outline_digest(outline: Path, authority_ids: list[str]) -> str:
    if not shutil.which("node"):
        pytest.skip("node is required for outline confirmation digest tests")
    result = subprocess.run(
        ["node", OUTLINE_DIGEST, outline, *authority_ids],
        check=True,
        text=True,
        capture_output=True,
    )
    return result.stdout.strip()


def _compute_review_data_id(review_data: Path) -> str:
    if not shutil.which("node"):
        pytest.skip("node is required for review-data identity tests")
    result = subprocess.run(
        ["node", REVIEW_DATA_ID, review_data],
        check=True,
        text=True,
        capture_output=True,
    )
    return result.stdout.strip()


def _write_outline_confirmation_contract(
    feature: Path,
    *,
    status: str = "READY_FOR_SPECIFY",
    review_data_id: str | None = None,
    confirmation_review_data_id: str | None = None,
    authority_ids: list[str] | None = None,
    confirmation_authority_ids: list[str] | None = None,
    stale_digest: bool = False,
    write_confirmation: bool = True,
    unresolved_items: list[str] | None = None,
    draft_items: list[str] | None = None,
) -> str:
    authority_ids = authority_ids or ["prd-v3", "product-brief-v2"]
    confirmation_authority_ids = confirmation_authority_ids or authority_ids
    review_dir = feature / "prd" / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    outline = feature / "spec-outline.md"
    feature_name = feature.name
    digest_placeholder = "0" * 64
    review_id_placeholder = "REVIEW_DATA_ID_PLACEHOLDER"
    outline_template = f"""# Spec Outline

## Outline Decision

- Status: {status}
- Based On: `prd.md`, `sources/product-brief.md`
- Source Snapshot: prd.md sha256:abc123
- Next Route: {'/sp.specify' if status == 'READY_FOR_SPECIFY' else '/sp.prd'}

## Outline Confirmation

- Contract Version: 1
- Review Data: specs/{feature_name}/prd/review/outline-review-data.json
- Review Data ID: {review_id_placeholder}
- Outline Digest: {digest_placeholder}
- Source Authority IDs: [{', '.join(authority_ids)}]
- Confirmation: specs/{feature_name}/prd/review/outline-confirmation.md

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-07-16T09:00:00Z | AWAITING_OUTLINE_CONFIRMATION | none | /sp.prd | Review generated |
"""
    outline.write_text(outline_template, encoding="utf-8")
    current_digest = _compute_outline_digest(outline, authority_ids)
    recorded_digest = "f" * 64 if stale_digest else current_digest
    outline.write_text(outline_template.replace(digest_placeholder, recorded_digest), encoding="utf-8")

    review_file = review_dir / "outline-review-data.json"
    review_file.write_text(
        json.dumps(
            {
                "schema_version": 2,
                "review_type": "outline",
                "artifact_path": f"specs/{feature_name}/prd/review/outline-review-data.json",
                "outline_source_path": f"specs/{feature_name}/spec-outline.md",
                "outline_digest": recorded_digest,
                "source_authority_ids": authority_ids,
                "batch_id": "outline-review-v1",
            }
        ),
        encoding="utf-8",
    )
    effective_review_data_id = review_data_id or _compute_review_data_id(review_file)
    outline.write_text(
        outline.read_text(encoding="utf-8").replace(review_id_placeholder, effective_review_data_id),
        encoding="utf-8",
    )

    if write_confirmation:
        confirmation_id = confirmation_review_data_id or effective_review_data_id
        unresolved_items = unresolved_items or []
        draft_items = draft_items or []
        (review_dir / "outline-confirmation.md").write_text(
            f"""---
document_type: sp_human_confirmation
command: /sp.prd
feature: {feature_name}
schema_version: 1
review_type: outline
review_data_artifact: specs/{feature_name}/prd/review/outline-review-data.json
review_data_id: {confirmation_id}
outline_digest: {recorded_digest}
source_authority_ids: [{', '.join(confirmation_authority_ids)}]
batch_review_status: CONFIRMED
human_confirmation: CONFIRMED
needs_decision_items: []
unresolved_decision_items: [{', '.join(unresolved_items)}]
draft_excluded_items: [{', '.join(draft_items)}]
revision_requests: []
---

# Outline Confirmation

Verified from the downloaded confirmation package and written back by `/sp.prd`.
""",
            encoding="utf-8",
        )
    return current_digest


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
def test_generic_anchor_does_not_resolve_by_trace_substring(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-003G",
            "Question",
            anchor="TRACE",
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
def test_partial_trace_anchor_does_not_resolve_by_prefix(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-003P",
            "Question",
            anchor="TRACE-00",
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
            close_evidence="Endpoint decision accepted by owner",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


@requires_bash
def test_closed_high_impact_open_item_requires_close_evidence(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "RISK-001",
            "Risk",
            tags="`@r0`",
            rollback="Disable rollout",
            close_condition="Risk accepted or verified",
            description="Audit evidence missing",
            impact_area="Security",
            status="Closed",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OPEN_ITEM_CLOSE_EVIDENCE_MISSING" for f in payload["findings"])


@requires_bash
def test_block_format_tags_participate_in_high_impact_detection(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        """# Open Items

## Items

### RISK-003

- Type: Risk
- Severity: Medium
- Domain: Security
- Workset: WS-01
- Anchor: `TRACE-001`
- Tags: `@r0`
- Owner: Lead
- Description: Block-format risk should be treated as high impact.
- Impact Area: Security
- Affected Docs: `spec.md`
- Suggested Rollback: Disable rollout
- Close Condition: Risk accepted or verified
- Close Evidence: Security owner accepted the residual risk
- Last Refresh: 2026-06-15
- Status: Closed
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OPEN_ITEM_CLOSE_EVIDENCE_MISSING" for f in payload["findings"])


@requires_bash
def test_closed_high_impact_open_item_with_close_evidence_passes(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "RISK-002",
            "Risk",
            tags="`@r0`",
            rollback="Disable rollout",
            close_condition="Risk accepted or verified",
            close_evidence="Security owner accepted the residual risk on 2026-06-15",
            description="Audit evidence reviewed",
            impact_area="Security",
            status="Closed",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


@requires_bash
def test_closed_low_item_with_metadata_and_author_is_not_high_impact(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-LOW-001",
            "Todo",
            severity="Low",
            description="Update metadata and author display label",
            impact_area="Content",
            rollback="-",
            close_condition="-",
            status="Closed",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OPEN_ITEM_CLOSE_EVIDENCE_MISSING" for f in payload["findings"])


@requires_bash
def test_open_items_table_columns_are_parsed_by_header(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        """# Open Items

## Items

| Status | Close Evidence | Type | ID | Impact Area | Description | Severity | Affected Docs | Anchor | Tags | Owner | Suggested Rollback | Close Condition | Last Refresh |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Closed | Security owner accepted residual risk | Risk | RISK-REORDER-001 | Security | Audit proof reviewed | High | `spec.md` | `TRACE-001` | `@r0` | Lead | Disable rollout | Risk accepted | 2026-06-15 |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


@requires_bash
def test_open_items_data_row_starting_with_header_words_is_not_skipped(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        """# Open Items

## Items

| Item ID | Type | Severity | Anchor | Owner | Description | Impact Area | Affected Docs | Suggested Rollback | Close Condition | Last Refresh | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ID-ROW-001 | Typewriter blocker note | High | `TRACE-001` | Lead | Status review still incomplete | Security | `spec.md` | Stop rollout | | 2026-06-15 | Status open |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OPEN_ITEM_REQUIRED_FIELD_MISSING" for f in payload["findings"])


@requires_bash
def test_open_items_header_detection_trims_and_lowercases_cells(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        """# Open Items

## Items

|  `ID`  |  TYPE  |  Status  |
| --- | --- | --- |
| | | |
""",
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


@requires_bash
def test_trace_expand_docs_must_reference_existing_feature_file(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "trace-index.md").write_text(
        """# Trace Index

| Trace ID | Coordinate | Expand Docs |
| --- | --- | --- |
| `TRACE-404` | `FEAT01.WS01.ACC01` | `spec.md`, `flows/missing-flow.md` |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "TRACE_EXPAND_DOC_MISSING" for f in payload["findings"])


@requires_bash
def test_trace_expand_docs_column_is_found_by_header(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "trace-index.md").write_text(
        """# Trace Index

| Trace ID | Coordinate | Owner | Status | Expand Docs |
| --- | --- | --- | --- | --- |
| `TRACE-001` | `FEAT01.WS01.ACC01` | Team | Stable | `spec.md`, `ui/screen-primary.md` |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


@requires_bash
def test_closed_medium_security_item_requires_close_evidence(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "SEC-001",
            "Todo",
            severity="Medium",
            description="Security audit proof was missing",
            impact_area="Security",
            status="Resolved",
        ),
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OPEN_ITEM_CLOSE_EVIDENCE_MISSING" for f in payload["findings"])


@requires_bash
def test_flow_artifact_with_sp_control_plane_term_blocks_pass(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "flows").mkdir()
    (feature / "flows" / "index.md").write_text(
        "# Flow\n\nUser runs /sp.gate and then checks memory/index.md.\n",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(
        f["code"] == "SUBJECT_CONFUSION_CONTROL_PLANE_TERM" and f["nextStep"] == "/sp.flow"
        for f in payload["findings"]
    )


@requires_bash
def test_ui_artifact_with_process_control_word_is_not_hard_subject_confusion(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "ui" / "screen-primary.md").write_text(
        "# Review screen\n\nShow Allowed Write Set and Required Checks to the operator.\n",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "SUBJECT_CONFUSION_CONTROL_PLANE_TERM" for f in payload["findings"])


@requires_bash
def test_meta_product_flow_with_business_anchor_allows_control_plane_terms(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec.md").write_text(
        "# Demo spec\n\nProduct Domain: developer tool for SP workflow teams.\n",
        encoding="utf-8",
    )
    (feature / "flows").mkdir()
    (feature / "flows" / "index.md").write_text(
        "# Flow\n\nRole: Release owner uses /sp.gate for acceptance review. Source anchor: REQ-001.\n",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "SUBJECT_CONFUSION_CONTROL_PLANE_TERM" for f in payload["findings"])


@requires_bash
def test_meta_product_flow_without_business_anchor_still_blocks(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec.md").write_text(
        "# Demo spec\n\nProduct Domain: developer tool for SP workflow teams.\n",
        encoding="utf-8",
    )
    (feature / "flows").mkdir()
    (feature / "flows" / "index.md").write_text(
        "# Flow\n\nRun /sp.gate and update memory/index.md.\n",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "SUBJECT_CONFUSION_CONTROL_PLANE_TERM" for f in payload["findings"])


@requires_bash
def test_spec_outline_repeated_blocker_signature_blocks_pass(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | No source found |
| 2026-06-15T10:30:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | Reworded no source found |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(
        f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" and f["nextStep"] == "/sp.clarify"
        for f in payload["findings"]
    )


@requires_bash
def test_spec_outline_list_style_repeated_blocker_signature_blocks_pass(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

- timestamp/run-id: 2026-06-15T10:00:00Z
  status: NEEDS_SOURCE
  blocker-signature: missing-source:legacy-prd
  next-route: /sp.clarify
  evidence-summary: No source found
- timestamp/run-id: 2026-06-15T10:30:00Z
  status: NEEDS_SOURCE
  blocker-signature: missing-source:legacy-prd
  next-route: /sp.clarify
  evidence-summary: Reworded no source found
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(
        f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE"
        and "memory/open-items.md" in f["message"]
        and "existing blocker record" in f["message"]
        for f in payload["findings"]
    )


@requires_bash
def test_spec_outline_list_style_plus_and_star_repeated_blocker_signature_blocks_pass(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

* timestamp/run-id: 2026-06-15T10:00:00Z
  status: NEEDS_SOURCE
  blocker-signature: missing-source:legacy-prd
  next-route: /sp.clarify
  evidence-summary: No source found
+ timestamp/run-id: 2026-06-15T10:30:00Z
  status: NEEDS_SOURCE
  blocker-signature: missing-source:legacy-prd
  next-route: /sp.clarify
  evidence-summary: Reworded no source found
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_spec_outline_deeper_status_history_heading_is_checked(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

### Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | No source found |
| 2026-06-15T10:30:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | Reworded no source found |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_spec_outline_h1_and_indented_status_history_heading_is_checked(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

   # Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | No source found |
| 2026-06-15T10:30:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | Reworded no source found |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_spec_outline_data_row_containing_blocker_signature_text_is_not_skipped(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | No source found |
| 2026-06-15T10:30:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | Reworded note mentions blocker-signature text but adds no evidence |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_repeated_outline_signature_with_real_new_evidence_passes(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | No source found |
| 2026-06-15T10:30:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | Source recovered and linked |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_repeated_outline_signature_with_user_confirmed_missing_source_counts_as_evidence(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | No source found |
| 2026-06-15T10:30:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | User confirmed no source exists and approved rebase |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_repeated_outline_signature_with_negated_new_evidence_still_blocks(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | No source found |
| 2026-06-15T10:30:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | Not user confirmed; still no source recovered |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_repeated_outline_signature_outside_status_history_is_ignored(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | No source found |
| 2026-06-15T10:30:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | Reworded no source found |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_outline_current_awaiting_ignores_historical_ready_state(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: AWAITING_OUTLINE_CONFIRMATION
- Next Route: /sp.prd

## Outline Confirmation

- Contract Version: 1
- Review Data: specs/demo-feature/prd/review/outline-review-data.json

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-07-15T10:00:00Z | READY_FOR_SPECIFY | none | /sp.specify | Legacy ready state |
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)
    codes = [finding["code"] for finding in payload["findings"]]

    assert payload["status"] == "FAIL"
    assert codes == ["OUTLINE_CONFIRMATION_PENDING"]
    assert "OUTLINE_SOURCE_SNAPSHOT_MISSING" not in codes
    assert "OWNER_REVIEW_REQUIRED_MISSING" not in codes


@requires_bash
def test_outline_current_ready_uses_decision_not_historical_awaiting(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Next Route: /sp.specify

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-07-15T10:00:00Z | AWAITING_OUTLINE_CONFIRMATION | none | /sp.prd | Awaited confirmation |
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)
    codes = [finding["code"] for finding in payload["findings"]]

    assert payload["status"] == "WARN"
    assert "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED" in codes
    assert "OUTLINE_SOURCE_SNAPSHOT_MISSING" in codes
    assert "OUTLINE_CONFIRMATION_PENDING" not in codes


@requires_bash
def test_outline_status_words_in_prose_and_fence_are_ignored(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

This example mentions READY_FOR_SPECIFY but is not the current decision.

```markdown
## Outline Decision
- Status: READY_FOR_SPECIFY
```
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "PASS"
    assert not any(f["code"].startswith("OUTLINE_CONFIRMATION_") for f in payload["findings"])
    assert not any(f["code"] == "OUTLINE_SOURCE_SNAPSHOT_MISSING" for f in payload["findings"])


@requires_bash
def test_bold_status_in_numbered_outline_decision_is_current_state(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## 2. Outline Decision

- **Status**: READY_FOR_SPECIFY
- **Based On**: `prd.md`
- **Source Snapshot**: prd.md sha256:abc123
- **Next Route**: /sp.specify
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "WARN"
    assert [f["code"] for f in payload["findings"]] == [
        "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED"
    ]


@requires_bash
def test_new_contract_outline_with_multiple_decision_sections_fails_closed(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: AWAITING_OUTLINE_CONFIRMATION

## Outline Confirmation

- Contract Version: 1
- Review Data: specs/demo-feature/prd/review/outline-review-data.json

## 3. Outline Decision

- Status: READY_FOR_SPECIFY
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "FAIL"
    assert [f["code"] for f in payload["findings"]] == [
        "OUTLINE_DECISION_STATUS_AMBIGUOUS"
    ]


@requires_bash
def test_new_contract_outline_without_current_status_fails_closed(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Next Route: /sp.prd

## Outline Confirmation

- Contract Version: 1
- Review Data: specs/demo-feature/prd/review/outline-review-data.json
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "FAIL"
    assert [f["code"] for f in payload["findings"]] == [
        "OUTLINE_DECISION_STATUS_MISSING"
    ]


@requires_bash
def test_legacy_ready_outline_warns_during_compatibility_window(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`
- Source Snapshot: prd.md sha256:abc123
- Next Route: /sp.specify
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "WARN"
    assert [f["code"] for f in payload["findings"]] == [
        "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED"
    ]


@requires_bash
def test_new_contract_ready_outline_without_confirmation_fails(tmp_path: Path):
    feature = _feature(tmp_path)
    _write_outline_confirmation_contract(feature, write_confirmation=False)

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "FAIL"
    assert [f["code"] for f in payload["findings"]] == [
        "OUTLINE_CONFIRMATION_MISSING"
    ]


@requires_bash
def test_new_contract_ready_outline_with_fresh_confirmation_passes(tmp_path: Path):
    feature = _feature(tmp_path)
    _write_outline_confirmation_contract(feature)

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


@requires_bash
def test_outline_confirmation_fields_outside_frontmatter_cannot_authorize(tmp_path: Path):
    feature = _feature(tmp_path)
    _write_outline_confirmation_contract(feature)
    review_data = json.loads(
        (feature / "prd" / "review" / "outline-review-data.json").read_text(encoding="utf-8")
    )
    confirmation = feature / "prd" / "review" / "outline-confirmation.md"
    confirmation.write_text(
        f"""---
document_type: sp_human_confirmation
command: /sp.prd
feature: {feature.name}
schema_version: 1
review_type: outline
---

# Outline Confirmation

The following body text is descriptive and must not be parsed as authorization metadata.

review_data_artifact: {review_data['artifact_path']}
review_data_id: outline-review-data-v1
outline_digest: {review_data['outline_digest']}
source_authority_ids: [{', '.join(review_data['source_authority_ids'])}]
batch_review_status: CONFIRMED
human_confirmation: CONFIRMED
needs_decision_items: []
unresolved_decision_items: []
draft_excluded_items: []
revision_requests: []
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "FAIL"
    assert [finding["code"] for finding in payload["findings"]] == [
        "OUTLINE_CONFIRMATION_MISSING"
    ]


@requires_bash
def test_new_contract_ready_outline_with_stale_digest_fails(tmp_path: Path):
    feature = _feature(tmp_path)
    _write_outline_confirmation_contract(feature, stale_digest=True)

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "FAIL"
    assert [f["code"] for f in payload["findings"]] == [
        "OUTLINE_CONFIRMATION_STALE"
    ]


@requires_bash
def test_new_contract_ready_outline_with_review_identity_mismatch_fails(tmp_path: Path):
    feature = _feature(tmp_path)
    _write_outline_confirmation_contract(
        feature,
        confirmation_review_data_id="different-review-data",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "FAIL"
    assert [f["code"] for f in payload["findings"]] == [
        "OUTLINE_CONFIRMATION_IDENTITY_MISMATCH"
    ]


@requires_bash
def test_new_contract_ready_outline_with_tampered_review_data_fails(tmp_path: Path):
    feature = _feature(tmp_path)
    _write_outline_confirmation_contract(feature)
    review_file = feature / "prd" / "review" / "outline-review-data.json"
    review_data = json.loads(review_file.read_text(encoding="utf-8"))
    review_data["batch_id"] = "tampered-after-confirmation"
    review_file.write_text(json.dumps(review_data), encoding="utf-8")

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "FAIL"
    assert [f["code"] for f in payload["findings"]] == [
        "OUTLINE_CONFIRMATION_IDENTITY_MISMATCH"
    ]


@requires_bash
def test_new_contract_ready_outline_with_authority_mismatch_fails(tmp_path: Path):
    feature = _feature(tmp_path)
    _write_outline_confirmation_contract(
        feature,
        confirmation_authority_ids=["prd-v3", "different-brief"],
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "FAIL"
    assert [f["code"] for f in payload["findings"]] == [
        "OUTLINE_CONFIRMATION_AUTHORITY_MISMATCH"
    ]


@requires_bash
@pytest.mark.parametrize(
    ("unresolved_items", "draft_items"),
    [(["DEC-001"], []), ([], ["DRAFT-001"])],
)
def test_new_contract_ready_outline_with_unresolved_or_draft_records_fails(
    tmp_path: Path,
    unresolved_items: list[str],
    draft_items: list[str],
):
    feature = _feature(tmp_path)
    _write_outline_confirmation_contract(
        feature,
        unresolved_items=unresolved_items,
        draft_items=draft_items,
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "FAIL"
    assert [f["code"] for f in payload["findings"]] == [
        "OUTLINE_CONFIRMATION_UNRESOLVED"
    ]


@requires_bash
@pytest.mark.parametrize(
    "status",
    [
        "NEEDS_PRD",
        "NEEDS_CLARIFY",
        "NEEDS_SOURCE",
        "SPLIT_REQUIRED",
        "NEEDS_DECISION",
        "BLOCKED",
    ],
)
def test_new_contract_non_ready_outline_preserves_existing_route_without_gate_noise(
    tmp_path: Path,
    status: str,
):
    feature = _feature(tmp_path)
    _write_outline_confirmation_contract(feature, status=status, write_confirmation=False)

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "PASS"
    assert not any(f["code"].startswith("OUTLINE_CONFIRMATION_") for f in payload["findings"])


@requires_bash
def test_ready_outline_with_high_risk_signal_warns_when_owner_review_missing(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Scope: source rebase required for tenant RBAC and audit evidence.
- Next Route: /sp.specify
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(
        f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" and f["severity"] == "WARN"
        for f in payload["findings"]
    )


@requires_bash
def test_ready_outline_with_owner_review_block_does_not_warn(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Authority Summary: user-provided product brief reviewed on 2026-06-15
- Scope: source rebase required for tenant RBAC and audit evidence.

## Owner Review Required

- Risk Type: source rebase
- Review Focus: confirm source authority
- Impact If Approved: proceed to specify
- Impact If Rejected: recover source first
- Recommended Choice: approve rebase
- Confirm To Proceed: pending
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED" for f in payload["findings"])
    assert not any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


@requires_bash
def test_ready_outline_with_deeper_owner_review_heading_does_not_warn(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Authority Summary: user-provided product brief reviewed on 2026-06-15
- Scope: source rebase required for tenant RBAC and audit evidence.

### Owner Review Required

- Risk Type: source rebase
- Review Focus: confirm source authority
- Impact If Approved: proceed to specify
- Impact If Rejected: recover source first
- Recommended Choice: approve rebase
- Confirm To Proceed: pending
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED" for f in payload["findings"])
    assert not any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


@requires_bash
def test_ready_outline_with_h1_indented_owner_review_heading_does_not_warn(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Authority Summary: user-provided product brief reviewed on 2026-06-15
- Scope: source rebase required for tenant RBAC and audit evidence.

   # Owner Review Required

- Risk Type: source rebase
- Review Focus: confirm source authority
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED" for f in payload["findings"])
    assert not any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


@requires_bash
def test_ready_outline_with_negated_owner_review_text_still_warns(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Scope: source rebase required for tenant RBAC and audit evidence.
- Next Route: /sp.specify
- Note: There is no Owner Review Required block yet.
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


@requires_bash
def test_ready_outline_without_high_risk_signal_does_not_warn(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Snapshot: prd.md sha256:abc123
- Scope: update dashboard copy and empty-state wording.
- Next Route: /sp.specify
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED" for f in payload["findings"])
    assert not any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


@requires_bash
def test_ready_outline_missing_source_snapshot_warns(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Scope: update dashboard copy and empty-state wording.
- Next Route: /sp.specify
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(
        f["code"] == "OUTLINE_SOURCE_SNAPSHOT_MISSING" and f["severity"] == "WARN"
        for f in payload["findings"]
    )


@requires_bash
def test_ready_outline_with_source_snapshot_does_not_warn(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Snapshot: prd.md sha256:abc123; sources/product-brief.md sha256:def456
- Scope: update dashboard copy and empty-state wording.
- Next Route: /sp.specify
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED" for f in payload["findings"])
    assert not any(f["code"] == "OUTLINE_SOURCE_SNAPSHOT_MISSING" for f in payload["findings"])


@requires_bash
def test_valid_evidence_signature_has_machine_readable_human_review_flag_false(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "plan.md").write_text(
        """# Demo Plan

## Stage Readiness

### Evidence Signature

- Sources: `spec.md`
- Anchors: `TRACE-001`
- Open Items: none open
- Visual/Human Review: not applicable for backend-only change
- Checks: /sp.analyze current PASS evidence
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "EVIDENCE_SIGNATURE_FIELD_MISSING" for f in payload["findings"])


@requires_bash
def test_missing_evidence_signature_fields_warns_without_human_review_flag(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "plan.md").write_text(
        """# Demo Plan

## Stage Readiness

### Evidence Signature

- Sources: `spec.md`
- Checks: /sp.analyze current PASS evidence
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "EVIDENCE_SIGNATURE_FIELD_MISSING" for f in payload["findings"])


@requires_bash
def test_unbacked_user_confirmed_marker_sets_human_review_flag(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "clarifications.md").write_text(
        "Risk acceptance was approved. [src:user-confirmed]\n",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=True)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "HUMAN_CONFIRMATION_EVIDENCE_MISSING" for f in payload["findings"])


@requires_bash
def test_user_confirmed_marker_with_decision_record_does_not_set_human_review_flag(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "clarifications.md").write_text(
        """# Clarifications

- Decision ID: DEC-001
- Confirmed By: product owner
- Decision Record: Owner accepts the rollback tradeoff. [src:user-confirmed]
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=False)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "HUMAN_CONFIRMATION_EVIDENCE_MISSING" for f in payload["findings"])


@requires_bash
def test_owner_review_missing_sets_human_review_flag(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Authority Summary: user-provided source reviewed
- Scope: source rebase required for tenant RBAC and audit evidence.
- Next Route: /sp.specify
""",
        encoding="utf-8",
    )

    payload, _ = _assert_bash_powershell_consistent(feature, needs_human_review=True)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


@requires_bash
def test_list_style_repeated_outline_signature_with_bold_fields_is_detected(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

- **status**: NEEDS_SOURCE
  **blocker-signature**: missing-source:legacy-prd
  **next-route**: /sp.clarify
  **evidence-summary**: No source found
- **status**: NEEDS_SOURCE
  **blocker-signature**: missing-source:legacy-prd
  **next-route**: /sp.clarify
  **evidence-summary**: Same source gap still unresolved
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_repeated_outline_signature_with_decision_package_writeback_counts_as_evidence(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_CLARIFY | scope-split:admin-vs-tenant | /sp.clarify | Need owner split |
| 2026-06-15T10:30:00Z | NEEDS_CLARIFY | scope-split:admin-vs-tenant | /sp.clarify | Decision package recorded and open-items updated |
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


@requires_bash
def test_numbered_owner_review_heading_suppresses_warning(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Authority Summary: user-provided product brief reviewed on 2026-06-15
- Scope: source rebase required for tenant RBAC and audit evidence.

## 1. Owner Review Required - Source Rebase

- Risk Type: source rebase
- Review Focus: confirm source authority
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED" for f in payload["findings"])
    assert not any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


@requires_bash
def test_business_artifact_can_mention_spec_tool_names_without_hard_control_plane_hit(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "flows").mkdir()
    (feature / "flows" / "index.md").write_text(
        "# Flow\n\nUser compares Spec Kit imports with another specification tool.\n",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "SUBJECT_CONFUSION_CONTROL_PLANE_TERM" for f in payload["findings"])


def test_powershell_checker_matches_bash_shape_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert payload["featureDir"] == str(feature)
    assert payload["findings"] == []


def test_powershell_checker_empty_table_skeleton_passes_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(OPEN_ITEMS_EMPTY_TABLE_VARIANT, encoding="utf-8")
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


def test_powershell_checker_detects_r0_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec.md").write_text("Payment rollback gap @r0\n", encoding="utf-8")
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "R0_WITHOUT_OPEN_RISK" for f in payload["findings"])


def test_powershell_checker_resolves_markdown_link_anchor_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

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
            close_evidence="Endpoint decision accepted by owner",
        ),
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert payload["findings"] == []


def test_powershell_checker_rejects_generic_anchor_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-003GP",
            "Question",
            anchor="TRACE",
            affected_docs="`missing.md`",
            rollback="Keep old endpoint",
            close_condition="Endpoint decided",
            description="Unknown endpoint",
            impact_area="API",
        ),
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OPEN_ITEM_TRACE_LINK_MISSING" for f in payload["findings"])


def test_powershell_checker_rejects_partial_trace_anchor_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        _open_item_block(
            "OPEN-003PP",
            "Question",
            anchor="TRACE-00",
            affected_docs="`missing.md`",
            rollback="Keep old endpoint",
            close_condition="Endpoint decided",
            description="Unknown endpoint",
            impact_area="API",
        ),
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OPEN_ITEM_TRACE_LINK_MISSING" for f in payload["findings"])


def test_powershell_checker_block_format_tags_participate_in_high_impact_detection(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        """# Open Items

## Items

### RISK-003

- Type: Risk
- Severity: Medium
- Domain: Security
- Workset: WS-01
- Anchor: `TRACE-001`
- Tags: `@r0`
- Owner: Lead
- Description: Block-format risk should be treated as high impact.
- Impact Area: Security
- Affected Docs: `spec.md`
- Suggested Rollback: Disable rollout
- Close Condition: Risk accepted or verified
- Close Evidence: Security owner accepted the residual risk
- Last Refresh: 2026-06-15
- Status: Closed
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OPEN_ITEM_CLOSE_EVIDENCE_MISSING" for f in payload["findings"])


def test_powershell_checker_parses_indented_star_open_item_fields_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "memory" / "open-items.md").write_text(
        """# Open Items

## Items

### RISK-004

  * Type: Risk
  * Severity: High
  * Anchor: `TRACE-001`
  * Owner: Lead
  * Description: Indented star bullets should parse as open-item fields.
  * Impact Area: Security
  * Affected Docs: `spec.md`
  * Suggested Rollback: Disable rollout
  * Close Condition: Risk accepted or verified
  * Last Refresh: 2026-06-15
  * Status: Open
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert not any(f["code"] == "OPEN_ITEM_REQUIRED_FIELD_MISSING" for f in payload["findings"])


def test_powershell_checker_detects_missing_trace_expand_doc_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "memory" / "trace-index.md").write_text(
        """# Trace Index

| Trace ID | Coordinate | Expand Docs |
| --- | --- | --- |
| `TRACE-404` | `FEAT01.WS01.ACC01` | `spec.md`, `flows/missing-flow.md` |
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "TRACE_EXPAND_DOC_MISSING" for f in payload["findings"])


def test_powershell_checker_detects_subject_confusion_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "flows").mkdir()
    (feature / "flows" / "index.md").write_text(
        "# Flow\n\nOperator opens /sp.analyze and updates trace-index.md.\n",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "SUBJECT_CONFUSION_CONTROL_PLANE_TERM" for f in payload["findings"])


def test_powershell_checker_allows_sp_like_url_in_business_artifact_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "flows").mkdir()
    (feature / "flows" / "index.md").write_text(
        "# Flow\n\nUser downloads a report from https://example.com/sp.api/report.\n",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "SUBJECT_CONFUSION_CONTROL_PLANE_TERM" for f in payload["findings"])


def test_powershell_checker_detects_repeated_outline_signature_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_CLARIFY | scope-split:admin-vs-tenant | /sp.clarify | Need owner split |
| 2026-06-15T10:30:00Z | NEEDS_CLARIFY | scope-split:admin-vs-tenant | /sp.clarify | Same split still unclear |
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


def test_powershell_checker_detects_list_style_repeated_outline_signature_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

- timestamp/run-id: 2026-06-15T10:00:00Z
  status: NEEDS_CLARIFY
  blocker-signature: scope-split:admin-vs-tenant
  next-route: /sp.clarify
  evidence-summary: Need owner split
- timestamp/run-id: 2026-06-15T10:30:00Z
  status: NEEDS_CLARIFY
  blocker-signature: scope-split:admin-vs-tenant
  next-route: /sp.clarify
  evidence-summary: Same split still unclear
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


def test_powershell_checker_repeated_outline_signature_with_negated_new_evidence_still_blocks_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

| Timestamp | Status | blocker-signature | next-route | evidence-summary |
| --- | --- | --- | --- | --- |
| 2026-06-15T10:00:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | No source found |
| 2026-06-15T10:30:00Z | NEEDS_SOURCE | missing-source:legacy-prd | /sp.clarify | Not user confirmed; still no source recovered |
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


def test_powershell_checker_warns_for_missing_owner_review_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Scope: payment source rebase requires risk acceptance.
- Next Route: /sp.specify
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


def test_powershell_checker_warns_for_negated_owner_review_text_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Scope: payment source rebase requires risk acceptance.
- Next Route: /sp.specify
- Note: There is no Owner Review Required block yet.
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


def test_powershell_checker_deeper_owner_review_heading_suppresses_warning_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Authority Summary: user-provided product brief reviewed on 2026-06-15
- Scope: payment source rebase requires risk acceptance.
- Next Route: /sp.specify

#### Owner Review Required

- Risk Type: source rebase
- Review Focus: confirm source authority
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


def test_powershell_checker_warns_for_missing_outline_source_snapshot_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Scope: update dashboard copy and empty-state wording.
- Next Route: /sp.specify
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "OUTLINE_SOURCE_SNAPSHOT_MISSING" for f in payload["findings"])


def test_powershell_checker_source_snapshot_suppresses_warning_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Snapshot: prd.md sha256:abc123; sources/product-brief.md sha256:def456
- Scope: update dashboard copy and empty-state wording.
- Next Route: /sp.specify
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OUTLINE_SOURCE_SNAPSHOT_MISSING" for f in payload["findings"])


def test_powershell_checker_bold_outline_fields_are_parsed_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Status History

- **status**: NEEDS_SOURCE
  **blocker-signature**: missing-source:legacy-prd
  **next-route**: /sp.clarify
  **evidence-summary**: No source found
- **status**: NEEDS_SOURCE
  **blocker-signature**: missing-source:legacy-prd
  **next-route**: /sp.clarify
  **evidence-summary**: Same source gap still unresolved
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "FAIL"
    assert any(f["code"] == "OUTLINE_REPEATED_BLOCKER_SIGNATURE" for f in payload["findings"])


def test_powershell_checker_numbered_owner_review_heading_suppresses_warning_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")

    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text(
        """# Spec Outline

## Outline Decision

- Status: READY_FOR_SPECIFY
- Based On: `prd.md`, `sources/product-brief.md`
- Source Authority Summary: user-provided product brief reviewed on 2026-06-15
- Scope: payment source rebase requires risk acceptance.
- Next Route: /sp.specify

## 1. Owner Review Required - Source Rebase

- Risk Type: source rebase
- Review Focus: confirm source authority
""",
        encoding="utf-8",
    )
    payload = _run_powershell(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "OWNER_REVIEW_REQUIRED_MISSING" for f in payload["findings"])


def test_powershell_checker_handles_single_line_markdown_files_when_available(tmp_path: Path):
    if not shutil.which("pwsh"):
        pytest.skip("pwsh not available")
    feature = _feature(tmp_path)
    (feature / "single-line.md").write_text("Evidence Signature:", encoding="utf-8")

    payload = _run_powershell(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "EVIDENCE_SIGNATURE_FIELD_MISSING" for f in payload["findings"])


def test_command_templates_reference_lightweight_memory_check():
    commands_dir = PROJECT_ROOT / "templates" / "commands"
    for command in ("analyze", "gate"):
        content = (commands_dir / f"{command}.md").read_text(encoding="utf-8")
        assert "check-sp-memory.sh --json" in content
        assert "check-sp-memory.ps1 -Json" in content
        assert "`ERROR` findings block PASS" in content
        assert "`WARN` findings do not automatically block PASS" in content


@requires_bash
def test_evidence_signature_missing_minimum_fields_warns(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "index.md").write_text(
        """# Memory

## Stage Readiness

Evidence Signature:
- Sources: `spec.md`
- Checks: current analyze report
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(f["code"] == "EVIDENCE_SIGNATURE_FIELD_MISSING" for f in payload["findings"])


@requires_bash
def test_evidence_signature_with_minimum_fields_passes(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "index.md").write_text(
        """# Memory

## Stage Readiness

Evidence Signature:
- Sources: `spec.md`, `flows/index.md`
- Anchors: `FEAT01.WS01.ACC01`, `TRACE-001`
- Open Items: no open blockers; `memory/open-items.md` checked
- Visual Review: not required for this documentation-only update
- Checks: `check-sp-memory.sh --json` PASS
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "EVIDENCE_SIGNATURE_FIELD_MISSING" for f in payload["findings"])


@requires_bash
def test_evidence_signature_with_fields_after_fourteen_lines_passes(tmp_path: Path):
    feature = _feature(tmp_path)
    filler = "\n".join(f"- Context filler {i}" for i in range(1, 18))
    (feature / "memory" / "index.md").write_text(
        f"""# Memory

## Stage Readiness

Evidence Signature:
{filler}
- Sources: `spec.md`, `flows/index.md`
- Anchors: `FEAT01.WS01.ACC01`, `TRACE-001`
- Open Items: no open blockers; `memory/open-items.md` checked
- Visual Review: not required for this documentation-only update
- Checks: `check-sp-memory.sh --json` PASS

## Next Section

- Not part of the evidence signature.
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "EVIDENCE_SIGNATURE_FIELD_MISSING" for f in payload["findings"])


@requires_bash
def test_evidence_signature_ignores_headings_inside_fenced_code_blocks(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "memory" / "index.md").write_text(
        """# Memory

## Stage Readiness

Evidence Signature:
```text
# This is a code comment, not a new markdown section.
```
- Sources: `spec.md`, `flows/index.md`
- Anchors: `FEAT01.WS01.ACC01`, `TRACE-001`
- Open Items: no open blockers; `memory/open-items.md` checked
- Visual Review: not required for this documentation-only update
- Checks: `check-sp-memory.sh --json` PASS
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "EVIDENCE_SIGNATURE_FIELD_MISSING" for f in payload["findings"])


@requires_bash
def test_unbacked_user_confirmed_marker_warns(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec.md").write_text(
        "# Spec\n\n- Requirement: Use export approval. [src:user-confirmed]\n",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "WARN"
    assert any(
        f["code"] == "HUMAN_CONFIRMATION_EVIDENCE_MISSING"
        and "candidate WARN" in f["message"]
        and "cross-file handoff" in f["message"]
        for f in payload["findings"]
    )


@requires_bash
def test_user_confirmed_marker_with_decision_record_passes(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec.md").write_text(
        """# Spec

## Decision Record

- Decision ID: DEC-001
- Human Decision: user selected export approval.
- Requirement: Use export approval. [src:user-confirmed]
""",
        encoding="utf-8",
    )

    payload = _run_bash(feature)

    assert payload["status"] == "PASS"
    assert not any(f["code"] == "HUMAN_CONFIRMATION_EVIDENCE_MISSING" for f in payload["findings"])
