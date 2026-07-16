"""Deterministic writeback tests for PRD Outline discovery responses."""

from __future__ import annotations

import json
import shutil
import subprocess
import time
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parent.parent
WRITEBACK_HELPER = (
    PROJECT_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "review"
    / "scripts"
    / "apply-outline-discovery.mjs"
)
RESPONSE_SCHEMA = (
    PROJECT_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "review"
    / "schemas"
    / "outline-discovery-response.schema.json"
)


def _write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _discovery_data(feature: str = "001-outline") -> dict:
    return {
        "schema_version": 1,
        "review_type": "outline_discovery",
        "interaction_mode": "discovery",
        "artifact_path": f"specs/{feature}/prd/review/outline-discovery-data.json",
        "outline_maturity": "explore",
        "batch_id": "batch-001",
        "project": {
            "name": "Outline workshop",
            "feature": feature,
            "current_understanding": "The product direction still needs confirmation.",
            "discovery_goal": "Confirm the primary product goal.",
        },
        "source_snapshot": [
            {"path": f"specs/{feature}/prd.md", "source_type": "prd"},
        ],
        "question_groups": [
            {
                "id": "direction",
                "title": "Direction",
                "summary": "Confirm the product direction.",
                "questions": [
                    {
                        "id": "goal-question",
                        "target_kind": "goal",
                        "prompt": "What should this product achieve first?",
                        "context": "The current goal is not yet stable.",
                        "selection_mode": "single",
                        "candidates": [
                            {
                                "id": "goal-quality",
                                "label": "Improve input quality",
                                "value": "Confirm product facts before detailed specification.",
                                "rationale": "Missing facts currently cause rework.",
                            },
                            {
                                "id": "goal-speed",
                                "label": "Improve throughput",
                                "value": "Shorten the time needed to organize requirements.",
                                "rationale": "Useful when the product direction is already stable.",
                            },
                        ],
                        "recommended_candidate_ids": ["goal-quality"],
                        "recommendation_reason": "Confirming facts reduces downstream rework.",
                        "allow_none_of_the_above": True,
                        "free_input": {
                            "enabled": True,
                            "label": "Add or revise the goal",
                            "allowed_operations": [
                                "confirm_candidate",
                                "add",
                                "replace",
                                "exclude",
                                "context_note",
                            ],
                        },
                    }
                ],
            }
        ],
        "authorization_effect": "none",
        "next_route": "/sp.prd",
    }


def _response(feature: str = "001-outline") -> dict:
    value = "Confirm product facts before detailed specification."
    return {
        "schema_version": 1,
        "format": "speccompass-outline-discovery-response",
        "response_id": "response-001",
        "review_type": "outline_discovery",
        "batch_id": "batch-001",
        "feature": feature,
        "outline_maturity": "explore",
        "source_review_data": f"specs/{feature}/prd/review/outline-discovery-data.json",
        "authorization_effect": "none",
        "next_route": "/sp.prd",
        "generated_at": "2026-07-16T08:00:00.000Z",
        "deltas": [
            {
                "delta_id": "delta-001",
                "question_id": "goal-question",
                "target_kind": "goal",
                "operation": "confirm_candidate",
                "candidate_id": "goal-quality",
                "target_id": None,
                "value": value,
                "source_tag": "user-confirmed",
                "none_of_the_above": False,
                "supersedes_delta_id": None,
            }
        ],
    }


def _current_prd() -> str:
    return """# PRD: Outline workshop

## Strategic Goal

<!-- intent-target:goal-primary -->
- The primary goal is still open. [src:user]

## Target Users and Roles

- Product owner. [src:user]
"""


def _temporary_prd(
    *,
    heading: str = "Strategic Goal",
    source_tag: str = "user-confirmed",
    include_reference: str | None = None,
    value: str = "Confirm product facts before detailed specification.",
) -> str:
    reference = f"<!-- intent-ref:delta-001:{include_reference} -->\n" if include_reference else ""
    return f"""# PRD: Outline workshop

## {heading}

<!-- intent-target:goal-primary -->
<!-- intent-delta:delta-001 -->
{reference}- {value} [src:{source_tag}]

## Target Users and Roles

- Product owner. [src:user]
"""


def _outline(maturity: str = "explore", status: str = "NEEDS_PRD") -> str:
    return f"""# Spec Outline: 001-outline

outline_maturity: {maturity}

## Outline Decision

- Status: {status}
- Next Route: /sp.prd
"""


def _prepare_project(tmp_path: Path) -> dict[str, Path]:
    feature = tmp_path / "specs" / "001-outline"
    review = feature / "prd" / "review"
    review.mkdir(parents=True)
    paths = {
        "source": review / "outline-discovery-data.json",
        "response": review / "outline-discovery-response-test.json",
        "ledger": review / "outline-intent-ledger.json",
        "prd": feature / "prd.md",
        "outline": feature / "spec-outline.md",
        "prd_temp": feature / "prd.md.tmp",
        "outline_temp": feature / "spec-outline.md.tmp",
    }
    _write_json(paths["source"], _discovery_data())
    _write_json(paths["response"], _response())
    paths["prd"].write_text(_current_prd(), encoding="utf-8")
    paths["outline"].write_text(_outline(), encoding="utf-8")
    paths["prd_temp"].write_text(_temporary_prd(), encoding="utf-8")
    paths["outline_temp"].write_text(_outline(), encoding="utf-8")
    return paths


def _run_writeback(
    tmp_path: Path,
    paths: dict[str, Path],
    *,
    node_import: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    command = _writeback_command(tmp_path, paths, node_import=node_import)
    return subprocess.run(
        command,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )


def _writeback_command(
    tmp_path: Path,
    paths: dict[str, Path],
    *,
    node_import: Path | None = None,
) -> list[str]:
    if shutil.which("node") is None:
        pytest.skip("node is required for Outline discovery writeback tests")
    command = ["node"]
    if node_import is not None:
        command.extend(["--import", node_import.resolve().as_uri()])
    command.extend(
        [
            str(WRITEBACK_HELPER),
            "--response",
            str(paths["response"].relative_to(tmp_path)),
            "--prd-temp",
            str(paths["prd_temp"].relative_to(tmp_path)),
            "--outline-temp",
            str(paths["outline_temp"].relative_to(tmp_path)),
        ]
    )
    return command


def _output(result: subprocess.CompletedProcess[str]) -> str:
    return f"{result.stdout}\n{result.stderr}"


def test_writeback_command_uses_file_url_for_node_import(tmp_path):
    paths = _prepare_project(tmp_path)
    preload = tmp_path / "preload.mjs"

    command = _writeback_command(tmp_path, paths, node_import=preload)

    import_index = command.index("--import")
    assert command[import_index + 1].startswith("file:")
    assert command[import_index + 1] == preload.resolve().as_uri()


def test_outline_discovery_writeback_appends_ledger_and_replaces_both_documents(tmp_path):
    paths = _prepare_project(tmp_path)

    result = _run_writeback(tmp_path, paths)

    assert result.returncode == 0, _output(result)
    ledger = json.loads(paths["ledger"].read_text(encoding="utf-8"))
    assert ledger == {
        "schema_version": 1,
        "format": "speccompass-outline-intent-ledger",
        "feature": "001-outline",
        "events": [
            {
                "delta_id": "delta-001",
                "response_id": "response-001",
                "maturity": "explore",
                "target_kind": "goal",
                "operation": "confirm_candidate",
                "candidate_id": "goal-quality",
                "target_id": None,
                "value": "Confirm product facts before detailed specification.",
                "source_tag": "user-confirmed",
                "recorded_at": "2026-07-16T08:00:00.000Z",
                "supersedes_delta_id": None,
            }
        ],
    }
    assert paths["prd"].read_text(encoding="utf-8") == _temporary_prd()
    assert paths["outline"].read_text(encoding="utf-8") == _outline()
    assert not paths["prd_temp"].exists()
    assert not paths["outline_temp"].exists()


def test_invalid_temporary_output_keeps_documents_and_pending_event_can_retry(tmp_path):
    paths = _prepare_project(tmp_path)
    original_prd = paths["prd"].read_text(encoding="utf-8")
    original_outline = paths["outline"].read_text(encoding="utf-8")
    paths["prd_temp"].write_text(_temporary_prd(source_tag="user"), encoding="utf-8")

    failed = _run_writeback(tmp_path, paths)

    assert failed.returncode != 0
    assert "source tag" in _output(failed).lower()
    assert paths["prd"].read_text(encoding="utf-8") == original_prd
    assert paths["outline"].read_text(encoding="utf-8") == original_outline
    ledger = json.loads(paths["ledger"].read_text(encoding="utf-8"))
    assert [event["delta_id"] for event in ledger["events"]] == ["delta-001"]


def test_pending_retry_ignores_json_object_key_order(tmp_path):
    paths = _prepare_project(tmp_path)
    paths["prd_temp"].write_text(_temporary_prd(source_tag="user"), encoding="utf-8")
    failed = _run_writeback(tmp_path, paths)
    assert failed.returncode != 0

    ledger = json.loads(paths["ledger"].read_text(encoding="utf-8"))
    ledger["events"][0] = dict(reversed(list(ledger["events"][0].items())))
    _write_json(paths["ledger"], ledger)
    paths["prd_temp"].write_text(_temporary_prd(), encoding="utf-8")

    retried = _run_writeback(tmp_path, paths)

    assert retried.returncode == 0, _output(retried)
    assert len(json.loads(paths["ledger"].read_text(encoding="utf-8"))["events"]) == 1


def test_backup_cleanup_failure_keeps_committed_document_pair(tmp_path):
    paths = _prepare_project(tmp_path)
    preload = tmp_path / "fail-second-backup-unlink.mjs"
    preload.write_text(
        """import fs from "node:fs/promises";
const unlink = fs.unlink.bind(fs);
let backupUnlinks = 0;
fs.unlink = async (filePath) => {
  if (String(filePath).includes(".backup-")) {
    backupUnlinks += 1;
    if (backupUnlinks === 2) throw new Error("injected backup cleanup failure");
  }
  return unlink(filePath);
};
""",
        encoding="utf-8",
    )

    result = _run_writeback(tmp_path, paths, node_import=preload)

    assert result.returncode == 0, _output(result)
    assert "backup cleanup warning" in result.stderr.lower()
    assert paths["prd"].read_text(encoding="utf-8") == _temporary_prd()
    assert paths["outline"].read_text(encoding="utf-8") == _outline()
    assert not paths["prd_temp"].exists()
    assert not paths["outline_temp"].exists()
    assert len(list(paths["outline"].parent.glob("*.backup-*"))) == 1


def test_concurrent_writeback_for_same_feature_is_rejected(tmp_path):
    paths = _prepare_project(tmp_path)
    entered = tmp_path / "first-writeback-entered"
    release = tmp_path / "release-first-writeback"
    preload = tmp_path / "pause-after-lock.mjs"
    preload.write_text(
        f'''import fs from "node:fs/promises";
const originalReadFile = fs.readFile.bind(fs);
let paused = false;
fs.readFile = async (filePath, ...args) => {{
  if (!paused && String(filePath).endsWith("outline-discovery-data.json")) {{
    paused = true;
    await fs.writeFile({json.dumps(str(entered))}, "entered", "utf8");
    while (true) {{
      try {{
        await fs.access({json.dumps(str(release))});
        break;
      }} catch {{
        await new Promise((resolve) => setTimeout(resolve, 10));
      }}
    }}
  }}
  return originalReadFile(filePath, ...args);
}};
''',
        encoding="utf-8",
    )
    first = subprocess.Popen(
        _writeback_command(tmp_path, paths, node_import=preload),
        cwd=tmp_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        deadline = time.monotonic() + 5
        while not entered.exists() and first.poll() is None and time.monotonic() < deadline:
            time.sleep(0.01)
        assert entered.exists(), first.communicate(timeout=1)

        second = _run_writeback(tmp_path, paths)

        assert second.returncode != 0
        assert "writeback lock" in _output(second).lower()
    finally:
        release.write_text("release", encoding="utf-8")
        stdout, stderr = first.communicate(timeout=5)

    assert first.returncode == 0, f"{stdout}\n{stderr}"
    assert not (paths["ledger"].parent / ".outline-discovery-writeback.lock").exists()


def test_stale_writeback_lock_from_dead_process_is_recovered(tmp_path):
    paths = _prepare_project(tmp_path)
    exited = subprocess.Popen(["node", "-e", ""], cwd=tmp_path)
    exited.wait(timeout=5)
    lock_path = paths["ledger"].parent / ".outline-discovery-writeback.lock"
    _write_json(
        lock_path,
        {
            "schema_version": 1,
            "feature": "001-outline",
            "pid": exited.pid,
            "acquired_at": "2026-07-16T08:00:00.000Z",
        },
    )

    result = _run_writeback(tmp_path, paths)

    assert result.returncode == 0, _output(result)
    assert not lock_path.exists()


def test_only_one_process_can_claim_stale_lock_recovery(tmp_path):
    paths = _prepare_project(tmp_path)
    exited = subprocess.Popen(["node", "-e", ""], cwd=tmp_path)
    exited.wait(timeout=5)
    lock_path = paths["ledger"].parent / ".outline-discovery-writeback.lock"
    recovery_path = paths["ledger"].parent / ".outline-discovery-writeback.recovery.lock"
    _write_json(
        lock_path,
        {
            "schema_version": 1,
            "feature": "001-outline",
            "pid": exited.pid,
            "acquired_at": "2026-07-16T08:00:00.000Z",
        },
    )
    recovery_claimed = tmp_path / "recovery-claimed"
    release_recovery = tmp_path / "release-recovery"
    preload = tmp_path / "pause-after-recovery-claim.mjs"
    preload.write_text(
        f'''import fs from "node:fs/promises";
const originalOpen = fs.open.bind(fs);
let paused = false;
fs.open = async (filePath, ...args) => {{
  const handle = await originalOpen(filePath, ...args);
  if (!paused && String(filePath) === {json.dumps(str(recovery_path))}) {{
    paused = true;
    await fs.writeFile({json.dumps(str(recovery_claimed))}, "claimed", "utf8");
    while (true) {{
      try {{
        await fs.access({json.dumps(str(release_recovery))});
        break;
      }} catch {{
        await new Promise((resolve) => setTimeout(resolve, 10));
      }}
    }}
  }}
  return handle;
}};
''',
        encoding="utf-8",
    )
    first = subprocess.Popen(
        _writeback_command(tmp_path, paths, node_import=preload),
        cwd=tmp_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        deadline = time.monotonic() + 5
        while not recovery_claimed.exists() and first.poll() is None and time.monotonic() < deadline:
            time.sleep(0.01)
        assert recovery_claimed.exists(), first.communicate(timeout=1)

        second = _run_writeback(tmp_path, paths)

        assert second.returncode != 0
        assert "recovery" in _output(second).lower()
        assert lock_path.exists()
        assert recovery_path.exists()
    finally:
        release_recovery.write_text("release", encoding="utf-8")
        stdout, stderr = first.communicate(timeout=5)

    assert first.returncode == 0, f"{stdout}\n{stderr}"
    assert not lock_path.exists()
    assert not recovery_path.exists()


def test_dead_recovery_claim_with_stale_main_lock_fails_closed(tmp_path):
    paths = _prepare_project(tmp_path)
    exited = subprocess.Popen(["node", "-e", ""], cwd=tmp_path)
    exited.wait(timeout=5)
    review = paths["ledger"].parent
    _write_json(
        review / ".outline-discovery-writeback.lock",
        {
            "schema_version": 1,
            "feature": "001-outline",
            "pid": exited.pid,
            "acquired_at": "2026-07-16T08:00:00.000Z",
            "lock_id": "dead-main-lock",
        },
    )
    _write_json(
        review / ".outline-discovery-writeback.recovery.lock",
        {
            "schema_version": 1,
            "feature": "001-outline",
            "pid": exited.pid,
            "acquired_at": "2026-07-16T08:00:00.000Z",
            "lock_id": "dead-recovery-claim",
        },
    )

    blocked = _run_writeback(tmp_path, paths)

    assert blocked.returncode != 0
    assert "stale-lock recovery claim was left by dead process" in _output(blocked)
    assert (review / ".outline-discovery-writeback.lock").exists()
    assert (review / ".outline-discovery-writeback.recovery.lock").exists()

    (review / ".outline-discovery-writeback.recovery.lock").unlink()
    retried = _run_writeback(tmp_path, paths)

    assert retried.returncode == 0, _output(retried)
    assert not list(review.glob(".outline-discovery-writeback*.lock*"))


def test_dead_recovery_claim_is_cleaned_after_fresh_main_lock_is_acquired(tmp_path):
    paths = _prepare_project(tmp_path)
    exited = subprocess.Popen(["node", "-e", ""], cwd=tmp_path)
    exited.wait(timeout=5)
    recovery_path = paths["ledger"].parent / ".outline-discovery-writeback.recovery.lock"
    _write_json(
        recovery_path,
        {
            "schema_version": 1,
            "feature": "001-outline",
            "pid": exited.pid,
            "acquired_at": "2026-07-16T08:00:00.000Z",
            "lock_id": "dead-recovery-claim",
        },
    )

    result = _run_writeback(tmp_path, paths)

    assert result.returncode == 0, _output(result)
    assert not recovery_path.exists()


def test_lock_release_preserves_a_replacement_owner(tmp_path):
    paths = _prepare_project(tmp_path)
    lock_path = paths["ledger"].parent / ".outline-discovery-writeback.lock"
    preload = tmp_path / "replace-lock-owner.mjs"
    preload.write_text(
        f'''import fs from "node:fs/promises";
const originalReadFile = fs.readFile.bind(fs);
let replaced = false;
fs.readFile = async (filePath, ...args) => {{
  if (!replaced && String(filePath).endsWith("outline-discovery-data.json")) {{
    replaced = true;
    await fs.writeFile({json.dumps(str(lock_path))}, JSON.stringify({{
      schema_version: 1,
      feature: "001-outline",
      pid: process.pid,
      acquired_at: new Date().toISOString(),
      lock_id: "replacement-owner"
    }}, null, 2) + "\\n", "utf8");
  }}
  return originalReadFile(filePath, ...args);
}};
''',
        encoding="utf-8",
    )

    result = _run_writeback(tmp_path, paths, node_import=preload)

    assert result.returncode == 0, _output(result)
    assert "ownership changed" in result.stderr.lower()
    assert json.loads(lock_path.read_text(encoding="utf-8"))["lock_id"] == "replacement-owner"


def test_second_document_replacement_failure_restores_pair_and_preserves_temps(tmp_path):
    paths = _prepare_project(tmp_path)
    original_prd = paths["prd"].read_text(encoding="utf-8")
    original_outline = paths["outline"].read_text(encoding="utf-8")
    preload = tmp_path / "fail-outline-replacement.mjs"
    preload.write_text(
        f'''import fs from "node:fs/promises";
const originalRename = fs.rename.bind(fs);
fs.rename = async (source, destination) => {{
  if (String(source) === {json.dumps(str(paths["outline_temp"]))}) {{
    throw new Error("injected outline replacement failure");
  }}
  return originalRename(source, destination);
}};
''',
        encoding="utf-8",
    )

    result = _run_writeback(tmp_path, paths, node_import=preload)

    assert result.returncode != 0
    assert "both formal documents were restored" in _output(result)
    assert paths["prd"].read_text(encoding="utf-8") == original_prd
    assert paths["outline"].read_text(encoding="utf-8") == original_outline
    assert paths["prd_temp"].read_text(encoding="utf-8") == _temporary_prd()
    assert paths["outline_temp"].read_text(encoding="utf-8") == _outline()


def test_writeback_rejects_malformed_existing_ledger_event(tmp_path):
    paths = _prepare_project(tmp_path)
    malformed_event = {
        "delta_id": "delta-prior",
        "supersedes_delta_id": None,
    }
    _write_json(
        paths["ledger"],
        {
            "schema_version": 1,
            "format": "speccompass-outline-intent-ledger",
            "feature": "001-outline",
            "events": [malformed_event],
        },
    )

    result = _run_writeback(tmp_path, paths)

    assert result.returncode != 0
    assert "response_id" in _output(result)
    assert paths["prd"].read_text(encoding="utf-8") == _current_prd()
    assert json.loads(paths["ledger"].read_text(encoding="utf-8"))["events"] == [malformed_event]


@pytest.mark.parametrize("source_mutation", ["candidate_count", "allowed_operations"])
def test_writeback_rejects_malformed_discovery_source_contract(tmp_path, source_mutation):
    paths = _prepare_project(tmp_path)
    source = json.loads(paths["source"].read_text(encoding="utf-8"))
    question = source["question_groups"][0]["questions"][0]
    if source_mutation == "candidate_count":
        question["candidates"] = question["candidates"][:1]
    else:
        question["free_input"]["allowed_operations"] = ["confirm_candidate", "add"]
    _write_json(paths["source"], source)

    result = _run_writeback(tmp_path, paths)

    assert result.returncode != 0
    assert not paths["ledger"].exists()
    assert paths["prd"].read_text(encoding="utf-8") == _current_prd()


def test_writeback_rejects_conflicting_source_tags_in_temporary_delta_block(tmp_path):
    paths = _prepare_project(tmp_path)
    paths["prd_temp"].write_text(
        _temporary_prd().replace(
            "[src:user-confirmed]",
            "[src:user-confirmed] [src:user]",
        ),
        encoding="utf-8",
    )

    result = _run_writeback(tmp_path, paths)

    assert result.returncode != 0
    assert "source tag" in _output(result).lower()
    assert paths["prd"].read_text(encoding="utf-8") == _current_prd()

    paths["prd_temp"].write_text(_temporary_prd(), encoding="utf-8")
    succeeded = _run_writeback(tmp_path, paths)

    assert succeeded.returncode == 0, _output(succeeded)
    ledger = json.loads(paths["ledger"].read_text(encoding="utf-8"))
    assert [event["delta_id"] for event in ledger["events"]] == ["delta-001"]


@pytest.mark.parametrize(
    ("mutate", "expected"),
    (
        (lambda response, source: response.__setitem__("schema_version", 2), "schema_version"),
        (lambda response, source: response.__setitem__("feature", "002-other"), "feature"),
        (lambda response, source: response.__setitem__("batch_id", "other-batch"), "batch_id"),
        (lambda response, source: response.__setitem__("outline_maturity", "frame"), "maturity"),
        (
            lambda response, source: response["deltas"][0].__setitem__("question_id", "unknown-question"),
            "question_id",
        ),
        (
            lambda response, source: response["deltas"][0].__setitem__("candidate_id", "unknown-candidate"),
            "candidate_id",
        ),
        (
            lambda response, source: response["deltas"][0].__setitem__("target_kind", "scope"),
            "target_kind",
        ),
    ),
)
def test_writeback_rejects_response_identity_and_source_mismatches(tmp_path, mutate, expected):
    paths = _prepare_project(tmp_path)
    response = json.loads(paths["response"].read_text(encoding="utf-8"))
    source = json.loads(paths["source"].read_text(encoding="utf-8"))
    mutate(response, source)
    _write_json(paths["response"], response)
    _write_json(paths["source"], source)

    result = _run_writeback(tmp_path, paths)

    assert result.returncode != 0
    assert expected in _output(result)
    assert not paths["ledger"].exists()
    assert paths["prd"].read_text(encoding="utf-8") == _current_prd()


def test_writeback_rejects_formal_outline_confirmation_package(tmp_path):
    paths = _prepare_project(tmp_path)
    formal_confirmation = {
        "format": "speccompass-confirmation-package",
        "version": 1,
        "schema_version": 2,
        "review_type": "outline",
        "batch_id": "outline-confirmation-001",
        "review_data_id": "outline-review-data-v1",
        "outline_digest": "a" * 64,
        "source_authority_ids": ["prd-v3"],
        "source_review_data": "specs/001-outline/prd/review/outline-review-data.json",
        "target_path": "specs/001-outline/prd/review/outline-confirmation.md",
        "records": [],
    }
    _write_json(paths["response"], formal_confirmation)

    result = _run_writeback(tmp_path, paths)

    assert result.returncode != 0
    assert "schema" in _output(result).lower() or "format" in _output(result).lower()
    assert not paths["ledger"].exists()
    assert paths["prd"].read_text(encoding="utf-8") == _current_prd()
    assert paths["outline"].read_text(encoding="utf-8") == _outline()


@pytest.mark.parametrize(
    ("prd_temp", "outline_temp", "expected"),
    (
        (_temporary_prd(heading="Business Goals"), _outline(), "intended section"),
        (_temporary_prd(value="Changed model wording"), _outline(), "exact delta value"),
        (_temporary_prd(), _outline(maturity="frame"), "outline_maturity"),
        (_temporary_prd(), _outline(status="AWAITING_OUTLINE_CONFIRMATION"), "non-authorizing"),
        (_temporary_prd(), _outline(status="READY_FOR_SPECIFY"), "non-authorizing"),
    ),
)
def test_writeback_rejects_misplaced_or_authorizing_temporary_documents(
    tmp_path, prd_temp, outline_temp, expected
):
    paths = _prepare_project(tmp_path)
    paths["prd_temp"].write_text(prd_temp, encoding="utf-8")
    paths["outline_temp"].write_text(outline_temp, encoding="utf-8")

    result = _run_writeback(tmp_path, paths)

    assert result.returncode != 0
    assert expected in _output(result)
    assert paths["prd"].read_text(encoding="utf-8") == _current_prd()
    assert paths["outline"].read_text(encoding="utf-8") == _outline()


def test_writeback_rejects_replay_after_delta_is_present_in_formal_prd(tmp_path):
    paths = _prepare_project(tmp_path)
    first = _run_writeback(tmp_path, paths)
    assert first.returncode == 0, _output(first)
    paths["prd_temp"].write_text(_temporary_prd(), encoding="utf-8")
    paths["outline_temp"].write_text(_outline(), encoding="utf-8")

    replay = _run_writeback(tmp_path, paths)

    assert replay.returncode != 0
    assert "already consumed" in _output(replay)
    ledger = json.loads(paths["ledger"].read_text(encoding="utf-8"))
    assert len(ledger["events"]) == 1


def test_replace_requires_existing_target_reference_and_accepted_superseded_event(tmp_path):
    paths = _prepare_project(tmp_path)
    prior_event = {
        "delta_id": "delta-prior",
        "response_id": "response-prior",
        "maturity": "explore",
        "target_kind": "goal",
        "operation": "add",
        "candidate_id": None,
        "target_id": None,
        "value": "The previous confirmed goal.",
        "source_tag": "user",
        "recorded_at": "2026-07-15T08:00:00.000Z",
        "supersedes_delta_id": None,
    }
    _write_json(
        paths["ledger"],
        {
            "schema_version": 1,
            "format": "speccompass-outline-intent-ledger",
            "feature": "001-outline",
            "events": [prior_event],
        },
    )
    paths["prd"].write_text(
        _current_prd().replace(
            "<!-- intent-target:goal-primary -->",
            "<!-- intent-target:goal-primary -->\n<!-- intent-delta:delta-prior -->",
        ),
        encoding="utf-8",
    )
    response = _response()
    response["deltas"][0].update(
        {
            "operation": "replace",
            "candidate_id": None,
            "target_id": "goal-primary",
            "value": "Use the revised product goal.",
            "source_tag": "user",
            "supersedes_delta_id": "delta-prior",
        }
    )
    _write_json(paths["response"], response)
    paths["prd_temp"].write_text(
        _temporary_prd(
            source_tag="user",
            include_reference="goal-primary",
            value="Use the revised product goal.",
        ),
        encoding="utf-8",
    )

    accepted = _run_writeback(tmp_path, paths)

    assert accepted.returncode == 0, _output(accepted)
    ledger = json.loads(paths["ledger"].read_text(encoding="utf-8"))
    assert [event["delta_id"] for event in ledger["events"]] == ["delta-prior", "delta-001"]
    assert ledger["events"][1]["supersedes_delta_id"] == "delta-prior"


@pytest.mark.parametrize(
    ("candidate_id", "target_id", "reference_id"),
    (
        ("goal-quality", None, "goal-quality"),
        (None, "goal-primary", "goal-primary"),
    ),
)
def test_exclude_requires_exact_candidate_or_target_reference(
    tmp_path, candidate_id, target_id, reference_id
):
    paths = _prepare_project(tmp_path)
    response = _response()
    response["deltas"][0].update(
        {
            "operation": "exclude",
            "candidate_id": candidate_id,
            "target_id": target_id,
            "value": "",
            "source_tag": "user",
        }
    )
    _write_json(paths["response"], response)
    paths["prd_temp"].write_text(
        _temporary_prd(
            source_tag="user",
            include_reference=reference_id,
            value="Candidate or target excluded.",
        ),
        encoding="utf-8",
    )

    result = _run_writeback(tmp_path, paths)

    assert result.returncode == 0, _output(result)
    event = json.loads(paths["ledger"].read_text(encoding="utf-8"))["events"][0]
    assert event["candidate_id"] == candidate_id
    assert event["target_id"] == target_id


def test_supersede_rejects_prior_event_that_is_still_pending(tmp_path):
    paths = _prepare_project(tmp_path)
    prior_event = {
        "delta_id": "delta-prior",
        "response_id": "response-prior",
        "maturity": "explore",
        "target_kind": "goal",
        "operation": "add",
        "candidate_id": None,
        "target_id": None,
        "value": "Pending goal.",
        "source_tag": "user",
        "recorded_at": "2026-07-15T08:00:00.000Z",
        "supersedes_delta_id": None,
    }
    _write_json(
        paths["ledger"],
        {
            "schema_version": 1,
            "format": "speccompass-outline-intent-ledger",
            "feature": "001-outline",
            "events": [prior_event],
        },
    )
    response = _response()
    response["deltas"][0].update(
        {
            "operation": "replace",
            "candidate_id": None,
            "target_id": "goal-primary",
            "value": "Use the revised product goal.",
            "source_tag": "user",
            "supersedes_delta_id": "delta-prior",
        }
    )
    _write_json(paths["response"], response)
    paths["prd_temp"].write_text(
        _temporary_prd(
            source_tag="user",
            include_reference="goal-primary",
            value="Use the revised product goal.",
        ),
        encoding="utf-8",
    )

    result = _run_writeback(tmp_path, paths)

    assert result.returncode != 0
    assert "earlier accepted event" in _output(result)
    assert json.loads(paths["ledger"].read_text(encoding="utf-8"))["events"] == [prior_event]


def test_supersede_rejects_duplicate_prior_delta_anchors(tmp_path):
    paths = _prepare_project(tmp_path)
    prior_event = {
        "delta_id": "delta-prior",
        "response_id": "response-prior",
        "maturity": "explore",
        "target_kind": "goal",
        "operation": "add",
        "candidate_id": None,
        "target_id": None,
        "value": "Ambiguous prior goal.",
        "source_tag": "user",
        "recorded_at": "2026-07-15T08:00:00.000Z",
        "supersedes_delta_id": None,
    }
    _write_json(
        paths["ledger"],
        {
            "schema_version": 1,
            "format": "speccompass-outline-intent-ledger",
            "feature": "001-outline",
            "events": [prior_event],
        },
    )
    paths["prd"].write_text(
        _current_prd().replace(
            "<!-- intent-target:goal-primary -->",
            "<!-- intent-target:goal-primary -->\n<!-- intent-delta:delta-prior -->\n<!-- intent-delta:delta-prior -->",
        ),
        encoding="utf-8",
    )
    response = _response()
    response["deltas"][0].update(
        {
            "operation": "replace",
            "candidate_id": None,
            "target_id": "goal-primary",
            "value": "Use the revised product goal.",
            "source_tag": "user",
            "supersedes_delta_id": "delta-prior",
        }
    )
    _write_json(paths["response"], response)
    paths["prd_temp"].write_text(
        _temporary_prd(
            source_tag="user",
            include_reference="goal-primary",
            value="Use the revised product goal.",
        ),
        encoding="utf-8",
    )

    result = _run_writeback(tmp_path, paths)

    assert result.returncode != 0
    assert "earlier accepted event" in _output(result)


@pytest.mark.parametrize(
    ("target_id", "supersedes_delta_id", "expected"),
    (
        ("unknown-target", None, "target_id"),
        ("goal-primary", "unknown-delta", "supersedes_delta_id"),
    ),
)
def test_replace_rejects_unknown_target_or_superseded_delta(
    tmp_path, target_id, supersedes_delta_id, expected
):
    paths = _prepare_project(tmp_path)
    response = _response()
    response["deltas"][0].update(
        {
            "operation": "replace",
            "candidate_id": None,
            "target_id": target_id,
            "value": "Use the revised product goal.",
            "source_tag": "user",
            "supersedes_delta_id": supersedes_delta_id,
        }
    )
    _write_json(paths["response"], response)
    paths["prd_temp"].write_text(
        _temporary_prd(
            source_tag="user",
            include_reference=target_id,
            value="Use the revised product goal.",
        ),
        encoding="utf-8",
    )

    result = _run_writeback(tmp_path, paths)

    assert result.returncode != 0
    assert expected in _output(result)
    assert not paths["ledger"].exists()


def test_response_schema_and_renderer_expose_supersession_without_guessing_it():
    schema = json.loads(RESPONSE_SCHEMA.read_text(encoding="utf-8"))
    delta = schema["$defs"]["delta"]
    assert "supersedes_delta_id" in delta["required"]
    assert delta["properties"]["supersedes_delta_id"]["type"] == ["string", "null"]

    package = (
        PROJECT_ROOT
        / "templates"
        / "project"
        / ".specify"
        / "review"
        / "renderer"
        / "scripts"
        / "discovery-response-package.js"
    ).read_text(encoding="utf-8")
    assert "supersedes_delta_id: null" in package


def test_prd_writeback_helper_contract_is_documented_for_installed_projects():
    prd = (PROJECT_ROOT / "templates" / "commands" / "prd.md").read_text(encoding="utf-8")
    command_spec = (
        PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md"
    ).read_text(encoding="utf-8")
    renderer_readme = (
        PROJECT_ROOT / "templates" / "project" / ".specify" / "review" / "renderer" / "README.md"
    ).read_text(encoding="utf-8")
    review_skill = (
        PROJECT_ROOT / "templates" / "skills" / "speccompass-review-data" / "SKILL.md"
    ).read_text(encoding="utf-8")
    command = "apply-outline-discovery.mjs --response"
    for content in (prd, command_spec, renderer_readme, review_skill):
        assert command in content
        assert "intent-target:" in content
        assert "intent-ref:" in content
        assert "pending" in content.lower()
        assert ".outline-discovery-writeback.lock" in content
        assert "active" in content.lower()
        assert "process" in content.lower()
        assert "stale" in content.lower()
