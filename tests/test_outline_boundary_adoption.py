from __future__ import annotations

import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = PROJECT_ROOT / "templates" / "project" / ".specify" / "review" / "scripts"
BOOTSTRAP = SCRIPTS / "bootstrap-outline-boundaries.mjs"
PREPARE = SCRIPTS / "prepare-outline-boundary-adoption.mjs"
ACTIVATE = SCRIPTS / "activate-outline-boundary-adoption.mjs"
GATE = SCRIPTS / "check-outline-boundary-gate.mjs"


def _digest(value: dict, field: str | None = None) -> str:
    payload = {key: item for key, item in value.items() if key != field}
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _review_data_id(value: object) -> str:
    canonical = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    hash_value = 2166136261
    for character in canonical:
        code_point = ord(character)
        units = (code_point,) if code_point <= 0xFFFF else (
            0xD800 + ((code_point - 0x10000) >> 10),
            0xDC00 + ((code_point - 0x10000) & 0x3FF),
        )
        for unit in units:
            hash_value ^= unit
            hash_value = (hash_value * 16777619) & 0xFFFFFFFF
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    if hash_value == 0:
        return "0"
    encoded = ""
    while hash_value:
        hash_value, remainder = divmod(hash_value, 36)
        encoded = alphabet[remainder] + encoded
    return encoded


def _run(script: Path, *arguments: Path | str, cwd: Path, env: dict[str, str] | None = None):
    return subprocess.run(
        ["node", str(script), *(str(argument) for argument in arguments)],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
        env={**os.environ, **(env or {})},
    )


def _project(tmp_path: Path) -> dict[str, Path | dict]:
    specs = tmp_path / "specs"
    root = specs / "000-root"
    root.mkdir(parents=True)
    (root / "prd.md").write_text("# Root PRD\n\n## Adoption rollback\n", encoding="utf-8")
    (root / "spec-outline.md").write_text("# Root Outline\n\n- boundary-root\n", encoding="utf-8")
    review_data = {"schema_version": 2, "review_type": "outline", "project": {"feature": "000-root"}}
    review_data_path = root / "prd" / "review" / "outline-review-data.json"
    review_data_path.parent.mkdir(parents=True)
    review_data_path.write_text(json.dumps(review_data), encoding="utf-8")
    index = {
        "schema_version": 2,
        "project": "Legacy project",
        "updated_at": "2026-07-29",
        "hierarchy": {"mode": "explicit", "root_feature": "000-root"},
        "features": [
            {
                "order": 1,
                "feature_code": "000",
                "feature": "000-root",
                "title": "Legacy project",
                "parent_feature": None,
                "sibling_order": 0,
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Existing root project."},
                "outline_alignment": {
                    "status": "one_to_one",
                    "outline_node_refs": ["boundary-root"],
                    "rationale": "Existing root Outline node.",
                },
                "has_flow_review": False,
                "has_ui_review": False,
                "has_outline_review": True,
                "has_outline_discovery": False,
            }
        ],
    }
    index_path = specs / "review-index.json"
    index_path.write_text(json.dumps(index), encoding="utf-8")
    report_path = root / "outline-boundaries-adoption.json"
    bootstrapped = _run(BOOTSTRAP, index_path, report_path, "--root", "000-root", cwd=tmp_path)
    assert bootstrapped.returncode == 0, bootstrapped.stderr

    proposal_id = "baseline-adoption-001"
    draft = root / "boundary-adjustments" / "drafts" / proposal_id
    draft.mkdir(parents=True)
    proposal_path = draft / "proposal.json"
    preview_path = draft / "impact-preview.json"
    decision_path = draft / "decision.json"
    proposal_input = {
        "schema_version": 1,
        "base_baseline_id": None,
        "base_baseline_digest": None,
        "baseline_id": proposal_id,
        "created_at": _now(),
        "created_by": "model:adoption-review",
        "decision_ref": f"specs/000-root/boundary-adjustments/drafts/{proposal_id}/decision.json",
        "change_reason": "Adopt the reviewed current project shape without restructuring it.",
        "rollback_ref": "specs/000-root/prd.md#adoption-rollback",
        "project_boundaries": [
            {
                "order": 1,
                "feature_code": "000",
                "feature": "000-root",
                "title": "Legacy project",
                "parent_feature_code": None,
                "sibling_order": 0,
                "outline_node_id": "boundary-root",
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Existing root project."},
                "lifecycle": "active",
                "predecessor_codes": [],
            }
        ],
        "tombstones": [],
    }
    proposal_path.write_text(json.dumps(proposal_input), encoding="utf-8")
    boundaries_path = root / "outline-boundaries.json"
    prepared = _run(PREPARE, index_path, report_path, boundaries_path, proposal_path, preview_path, cwd=tmp_path)
    assert prepared.returncode == 0, prepared.stderr
    return {
        "root": root,
        "index": index_path,
        "report": report_path,
        "boundaries": boundaries_path,
        "proposal": proposal_path,
        "preview": preview_path,
        "decision": decision_path,
        "journal": root / "outline-transition.jsonl",
        "writer_ledger": root / "boundary-adjustments" / "writeback-ledger.jsonl",
        "consumed_ledger": root / "boundary-adjustments" / "consumed-decisions.jsonl",
        "proposal_input": proposal_input,
        "review_data": review_data_path,
    }


def _write_human_decision(paths: dict[str, Path | dict]) -> dict:
    proposal_input = paths["proposal_input"]
    assert isinstance(proposal_input, dict)
    proposal = {
        "baseline_id": proposal_input["baseline_id"],
        "proposal_digest": "",
        "base_baseline_id": None,
        "base_baseline_digest": None,
        "created_at": proposal_input["created_at"],
        "created_by": proposal_input["created_by"],
        "decision_ref": proposal_input["decision_ref"],
        "change_reason": proposal_input["change_reason"],
        "project_boundaries": proposal_input["project_boundaries"],
        "tombstones": [],
    }
    proposal["proposal_digest"] = _digest(proposal, "proposal_digest")
    preview_path = paths["preview"]
    assert isinstance(preview_path, Path)
    preview = json.loads(preview_path.read_text(encoding="utf-8"))
    recorded_at = _now()
    receipt_id = hashlib.sha256(f"{proposal['proposal_digest']}:{recorded_at}".encode()).hexdigest()
    decision = {
        "schema_version": 1,
        "operation": "ADOPTION",
        "decision": "CONFIRMED",
        "proposal_id": proposal["baseline_id"],
        "proposal_digest": proposal["proposal_digest"],
        "base_baseline_id": None,
        "base_baseline_digest": None,
        "impact_preview_digest": preview["impact_preview_digest"],
        "initiated_by": "model",
        "change_class": "ADOPTION",
        "affected_feature_codes": ["000"],
        "reviewer_note": "Confirm the current project shape.",
        "confirmed_by": {"type": "human", "display_name": "test-reviewer"},
        "source": {
            "kind": "speccompass_loopback_writer",
            "writeback_request_id": f"request-{receipt_id[:12]}",
            "review_session_id": "session-adoption-001",
            "review_data_id": _review_data_id(
                json.loads(Path(paths["review_data"]).read_text(encoding="utf-8"))
            ),
            "recorded_at": recorded_at,
        },
        "receipt": {"receipt_id": receipt_id, "status": "ISSUED_ONCE"},
        "decision_digest": "",
    }
    decision["decision_digest"] = _digest(decision, "decision_digest")
    decision_path = paths["decision"]
    assert isinstance(decision_path, Path)
    decision_path.write_text(json.dumps(decision), encoding="utf-8")
    event = {
        "schema_version": 1,
        "operation": "ADOPTION",
        "event_type": "HUMAN_DECISION_RECORDED",
        "writeback_request_id": decision["source"]["writeback_request_id"],
        "review_session_id": decision["source"]["review_session_id"],
        "review_data_id": decision["source"]["review_data_id"],
        "proposal_id": decision["proposal_id"],
        "proposal_digest": decision["proposal_digest"],
        "base_baseline_id": None,
        "base_baseline_digest": None,
        "impact_preview_digest": decision["impact_preview_digest"],
        "receipt_id": receipt_id,
        "decision": "CONFIRMED",
        "decision_digest": decision["decision_digest"],
        "recorded_at": recorded_at,
    }
    writer_ledger = paths["writer_ledger"]
    assert isinstance(writer_ledger, Path)
    writer_ledger.write_text(json.dumps(event) + "\n", encoding="utf-8")
    return decision


def _activate(paths: dict[str, Path | dict], cwd: Path, env: dict[str, str] | None = None):
    return _run(
        ACTIVATE,
        paths["index"], paths["report"], paths["boundaries"], paths["proposal"],
        paths["preview"], paths["decision"], paths["journal"],
        cwd=cwd,
        env=env,
    )


def test_missing_boundary_gate_routes_to_explicit_adoption(tmp_path: Path):
    paths = _project(tmp_path)
    gate = _run(GATE, paths["boundaries"], paths["index"], "--feature", "000-root", cwd=tmp_path)
    assert gate.returncode == 1
    payload = json.loads(gate.stdout)
    assert payload["transition_state"] == "LEGACY_ADOPTION_REQUIRED"
    assert payload["repair_command_exec"] == "/sp.prd 000-root --adopt-outline-boundaries"
    assert not Path(paths["boundaries"]).exists()


def test_adoption_requires_writer_ledger_then_activates_once_and_preserves_sources(tmp_path: Path):
    paths = _project(tmp_path)
    root = paths["root"]
    assert isinstance(root, Path)
    source_snapshot = {
        path.relative_to(root): path.read_bytes()
        for path in [root / "prd.md", root / "spec-outline.md"]
    }
    _write_human_decision(paths)
    writer_ledger = paths["writer_ledger"]
    assert isinstance(writer_ledger, Path)
    ledger_content = writer_ledger.read_text(encoding="utf-8")
    writer_ledger.unlink()
    rejected = _activate(paths, tmp_path)
    assert rejected.returncode != 0
    assert "writer-ledger" in rejected.stderr
    assert not Path(paths["boundaries"]).exists()
    writer_ledger.write_text(ledger_content, encoding="utf-8")

    activated = _activate(paths, tmp_path)
    assert activated.returncode == 0, activated.stderr
    boundary_document = json.loads(Path(paths["boundaries"]).read_text(encoding="utf-8"))
    assert boundary_document["transition_state"] == "ALIGNED"
    assert boundary_document["current_baseline"]["baseline_id"] == "baseline-adoption-001"
    assert (tmp_path / "specs" / "feature-code-ledger.json").exists()
    for relative_path, content in source_snapshot.items():
        assert (root / relative_path).read_bytes() == content

    review_data_path = Path(paths["review_data"])
    review_data = json.loads(review_data_path.read_text(encoding="utf-8"))
    review_data["ordinary_prd_refresh_after_commit"] = True
    review_data_path.write_text(json.dumps(review_data), encoding="utf-8")
    replay = _activate(paths, tmp_path)
    assert replay.returncode == 0, replay.stderr
    assert json.loads(replay.stdout)["idempotent_recovery"] is True
    consumed = Path(paths["consumed_ledger"]).read_text(encoding="utf-8").splitlines()
    journal = Path(paths["journal"]).read_text(encoding="utf-8").splitlines()
    assert len(consumed) == 1
    assert len(journal) == 1
    gate = _run(GATE, paths["boundaries"], paths["index"], "--feature", "000-root", cwd=tmp_path)
    assert gate.returncode == 0, gate.stdout + gate.stderr


def test_adoption_rejects_stale_artifacts_and_recovers_after_commit_fault(tmp_path: Path):
    stale_paths = _project(tmp_path / "stale")
    _write_human_decision(stale_paths)
    stale_root = stale_paths["root"]
    assert isinstance(stale_root, Path)
    (stale_root / "prd.md").write_text("# Changed after review\n", encoding="utf-8")
    stale = _activate(stale_paths, tmp_path / "stale")
    assert stale.returncode != 0
    assert "stale" in stale.stderr.lower() or "changed" in stale.stderr.lower()
    assert not Path(stale_paths["boundaries"]).exists()

    recovery_paths = _project(tmp_path / "recovery")
    _write_human_decision(recovery_paths)
    failed = _activate(recovery_paths, tmp_path / "recovery", {"SPECCOMPASS_FAULT_AFTER_ADOPTION_COMMIT": "1"})
    assert failed.returncode != 0
    assert Path(recovery_paths["boundaries"]).exists()
    recovered = _activate(recovery_paths, tmp_path / "recovery")
    assert recovered.returncode == 0, recovered.stderr
    assert json.loads(recovered.stdout)["idempotent_recovery"] is True


def test_adoption_rejects_stale_review_identity_and_missing_outline_node(tmp_path: Path):
    review_paths = _project(tmp_path / "review-stale")
    _write_human_decision(review_paths)
    review_data_path = Path(review_paths["review_data"])
    review_data = json.loads(review_data_path.read_text(encoding="utf-8"))
    review_data["changed_after_confirmation"] = True
    review_data_path.write_text(json.dumps(review_data), encoding="utf-8")
    stale_review = _activate(review_paths, tmp_path / "review-stale")
    assert stale_review.returncode != 0
    assert "review data changed" in stale_review.stderr.lower()
    assert not Path(review_paths["boundaries"]).exists()

    outline_paths = _project(tmp_path / "outline-missing")
    outline_root = Path(outline_paths["root"])
    (outline_root / "spec-outline.md").unlink()
    prepared = _run(
        PREPARE,
        outline_paths["index"], outline_paths["report"], outline_paths["boundaries"],
        outline_paths["proposal"], outline_paths["preview"],
        cwd=tmp_path / "outline-missing",
    )
    assert prepared.returncode != 0
    assert "not present in current prd/outline sources" in prepared.stderr.lower()
    assert not Path(outline_paths["boundaries"]).exists()


def test_concurrent_adoption_commits_one_baseline_and_one_receipt(tmp_path: Path):
    paths = _project(tmp_path)
    _write_human_decision(paths)
    command = [
        "node", str(ACTIVATE), str(paths["index"]), str(paths["report"]), str(paths["boundaries"]),
        str(paths["proposal"]), str(paths["preview"]), str(paths["decision"]), str(paths["journal"]),
    ]
    first = subprocess.Popen(command, cwd=tmp_path, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    second = subprocess.Popen(command, cwd=tmp_path, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    first_output = first.communicate(timeout=15)
    second_output = second.communicate(timeout=15)
    assert first.returncode == 0 or second.returncode == 0, first_output + second_output
    final = _activate(paths, tmp_path)
    assert final.returncode == 0, final.stderr
    assert len(Path(paths["consumed_ledger"]).read_text(encoding="utf-8").splitlines()) == 1
    assert len(Path(paths["journal"]).read_text(encoding="utf-8").splitlines()) == 1
    assert json.loads(Path(paths["boundaries"]).read_text(encoding="utf-8"))["transition_state"] == "ALIGNED"
