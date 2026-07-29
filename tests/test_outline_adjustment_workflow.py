"""End-to-end tests for human-authorized Outline boundary adjustments."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
REVIEW = PROJECT_ROOT / "templates" / "project" / ".specify" / "review"
SCRIPTS = REVIEW / "scripts"
PREPARE = SCRIPTS / "prepare-outline-adjustment.mjs"
START = SCRIPTS / "start-outline-transition.mjs"
SCAN = SCRIPTS / "scan-outline-transition-impact.mjs"
ADVANCE = SCRIPTS / "advance-outline-transition.mjs"
ACTIVATE = SCRIPTS / "activate-outline-baseline.mjs"
PREPARE_ARTIFACTS = SCRIPTS / "prepare-outline-transition-artifacts.mjs"
PUBLISH_ARTIFACTS = SCRIPTS / "publish-outline-transition-artifacts.mjs"
ROLLBACK = SCRIPTS / "rollback-outline-transition.mjs"
SYNC = SCRIPTS / "sync-review-index.mjs"
VALIDATE = SCRIPTS / "validate-outline-boundaries.mjs"


def _digest(value: dict, digest_field: str) -> str:
    payload = {key: item for key, item in value.items() if key != digest_field}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _run(*args: object, cwd: Path, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", *(str(arg) for arg in args)],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
        env=env,
    )


def _aligned_document() -> dict:
    baseline = {
        "baseline_id": "baseline-001",
        "baseline_digest": "",
        "created_at": "2026-07-28T00:00:00.000Z",
        "created_by": "test-suite",
        "decision_ref": "specs/000-root/prd.md#decision-001",
        "project_boundaries": [
            {
                "order": 1,
                "feature_code": "000",
                "feature": "000-root",
                "title": "Root",
                "parent_feature_code": None,
                "sibling_order": 0,
                "outline_node_id": "boundary-000",
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Root boundary."},
                "lifecycle": "active",
                "predecessor_codes": [],
            },
            {
                "order": 2,
                "feature_code": "001",
                "feature": "001-child",
                "title": "Child",
                "parent_feature_code": "000",
                "sibling_order": 1,
                "outline_node_id": "boundary-001",
                "boundary_source": {
                    "kind": "subproject_handoff",
                    "handoff_ref": "specs/000-root/prd.md#handoff-001",
                    "rationale": "Confirmed child boundary.",
                },
                "lifecycle": "active",
                "predecessor_codes": [],
            },
        ],
        "tombstones": [],
    }
    baseline["baseline_digest"] = _digest(baseline, "baseline_digest")
    return {
        "schema_version": 1,
        "root_feature": "000-root",
        "updated_at": "2026-07-28T00:00:00.000Z",
        "transition_state": "ALIGNED",
        "current_baseline": baseline,
        "proposed_baseline": None,
        "transition": None,
    }


def _project(tmp_path: Path, *, change_class: str, physical_move: bool = False) -> dict[str, Path]:
    specs = tmp_path / "specs"
    root = specs / "000-root"
    child = specs / "001-child"
    root.mkdir(parents=True)
    child.mkdir(parents=True)
    (root / "prd.md").write_text("# Root PRD\n", encoding="utf-8")
    (root / "spec-outline.md").write_text("# Root Outline\n", encoding="utf-8")
    (child / "spec.md").write_text("# Child Spec\n", encoding="utf-8")
    boundaries = root / "outline-boundaries.json"
    index = specs / "review-index.json"
    journal = root / "outline-transition.jsonl"
    document = _aligned_document()
    boundaries.write_text(json.dumps(document), encoding="utf-8")
    synced = _run(SYNC, boundaries, index, cwd=tmp_path)
    assert synced.returncode == 0, synced.stderr

    proposal_id = "baseline-002"
    draft = root / "boundary-adjustments" / "drafts" / proposal_id
    draft.mkdir(parents=True)
    proposal_path = draft / "proposal.json"
    preview_path = draft / "impact-preview.json"
    decision_path = draft / "decision.json"
    proposed_boundaries = json.loads(json.dumps(document["current_baseline"]["project_boundaries"]))
    if change_class == "METADATA":
        proposed_boundaries[1]["title"] = "Child renamed"
    else:
        proposed_boundaries[1]["boundary_source"]["rationale"] = "Reviewed responsibility remains with the child project."
        if physical_move:
            proposed_boundaries[1]["feature"] = "001-child-v2"
    proposal = {
        "schema_version": 1,
        "base_baseline_id": document["current_baseline"]["baseline_id"],
        "base_baseline_digest": document["current_baseline"]["baseline_digest"],
        "baseline_id": proposal_id,
        "created_at": _now(),
        "created_by": "test-suite",
        "decision_ref": f"specs/000-root/boundary-adjustments/drafts/{proposal_id}/decision.json",
        "change_reason": f"Exercise the {change_class} adjustment path.",
        "rollback_ref": "specs/000-root/prd.md#rollback-002",
        "project_boundaries": proposed_boundaries,
        "tombstones": [],
    }
    proposal_path.write_text(json.dumps(proposal), encoding="utf-8")
    prepared = _run(PREPARE, boundaries, proposal_path, preview_path, cwd=tmp_path)
    assert prepared.returncode == 0, prepared.stderr
    payload = json.loads(prepared.stdout)
    assert payload["change_class"] == change_class
    assert payload["transition_started"] is False
    assert json.loads(boundaries.read_text(encoding="utf-8"))["transition_state"] == "ALIGNED"
    return {
        "root": root,
        "boundaries": boundaries,
        "index": index,
        "journal": journal,
        "proposal": proposal_path,
        "preview": preview_path,
        "decision": decision_path,
        "writer_ledger": root / "boundary-adjustments" / "writeback-ledger.jsonl",
        "consumed_ledger": root / "boundary-adjustments" / "consumed-decisions.jsonl",
    }


def _write_decision(paths: dict[str, Path], *, include_writer_event: bool = True) -> dict:
    proposal_input = json.loads(paths["proposal"].read_text(encoding="utf-8"))
    preview = json.loads(paths["preview"].read_text(encoding="utf-8"))
    recorded_at = _now()
    decision = {
        "schema_version": 1,
        "decision": "CONFIRMED",
        "proposal_id": proposal_input["baseline_id"],
        "proposal_digest": preview["proposal_digest"],
        "base_baseline_id": preview["base_baseline_id"],
        "base_baseline_digest": preview["base_baseline_digest"],
        "impact_preview_digest": preview["impact_preview_digest"],
        "initiated_by": "model",
        "change_class": preview["change_class"],
        "affected_feature_codes": preview["affected_feature_codes"],
        "reviewer_note": "Reviewed in the bound local page.",
        "confirmed_by": {"type": "human", "display_name": "local-reviewer"},
        "source": {
            "kind": "speccompass_loopback_writer",
            "writeback_request_id": "writeback-request-001",
            "review_session_id": "review-session-001",
            "review_data_id": "review-data-001",
            "recorded_at": recorded_at,
        },
        "receipt": {"receipt_id": "f" * 64, "status": "ISSUED_ONCE"},
        "decision_digest": "",
    }
    decision["decision_digest"] = _digest(decision, "decision_digest")
    paths["decision"].write_text(json.dumps(decision), encoding="utf-8")
    if include_writer_event:
        event = {
            "schema_version": 1,
            "event_type": "HUMAN_DECISION_RECORDED",
            "writeback_request_id": decision["source"]["writeback_request_id"],
            "review_session_id": decision["source"]["review_session_id"],
            "review_data_id": decision["source"]["review_data_id"],
            "proposal_id": decision["proposal_id"],
            "proposal_digest": decision["proposal_digest"],
            "base_baseline_id": decision["base_baseline_id"],
            "base_baseline_digest": decision["base_baseline_digest"],
            "impact_preview_digest": decision["impact_preview_digest"],
            "receipt_id": decision["receipt"]["receipt_id"],
            "decision": decision["decision"],
            "decision_digest": decision["decision_digest"],
            "recorded_at": recorded_at,
        }
        paths["writer_ledger"].write_text(json.dumps(event) + "\n", encoding="utf-8")
    return decision


def _start(paths: dict[str, Path], tmp_path: Path, *, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return _run(
        START,
        paths["boundaries"],
        paths["proposal"],
        paths["preview"],
        paths["decision"],
        paths["journal"],
        cwd=tmp_path,
        env=env,
    )


def test_metadata_adjustment_requires_writer_ledger_and_consumes_receipt_once(tmp_path: Path):
    paths = _project(tmp_path, change_class="METADATA")
    _write_decision(paths, include_writer_event=False)
    forged = _start(paths, tmp_path)
    assert forged.returncode != 0
    assert "writer-ledger" in forged.stderr
    assert json.loads(paths["boundaries"].read_text(encoding="utf-8"))["transition_state"] == "ALIGNED"

    _write_decision(paths)
    started = _start(paths, tmp_path)
    assert started.returncode == 0, started.stderr
    result = json.loads(started.stdout)
    assert result["change_class"] == "METADATA"
    assert result["state"] == "ALIGNED"
    activated = json.loads(paths["boundaries"].read_text(encoding="utf-8"))
    assert activated["current_baseline"]["project_boundaries"][1]["title"] == "Child renamed"
    assert len(paths["consumed_ledger"].read_text(encoding="utf-8").splitlines()) == 1
    assert not list(paths["root"].glob(".outline-boundaries.json*.lock*"))

    replay = _start(paths, tmp_path)
    assert replay.returncode == 0, replay.stderr
    assert json.loads(replay.stdout)["idempotent_recovery"] is True
    assert len(paths["consumed_ledger"].read_text(encoding="utf-8").splitlines()) == 1


def test_stale_impact_preview_does_not_freeze_daily_work(tmp_path: Path):
    paths = _project(tmp_path, change_class="STRUCTURAL")
    _write_decision(paths)
    (paths["root"] / "prd.md").write_text("# Root PRD changed after review\n", encoding="utf-8")
    rejected = _start(paths, tmp_path)
    assert rejected.returncode != 0
    assert "Impact preview is stale" in rejected.stderr
    assert json.loads(paths["boundaries"].read_text(encoding="utf-8"))["transition_state"] == "ALIGNED"
    assert not paths["consumed_ledger"].exists()


def test_concurrent_start_recovery_consumes_one_receipt_for_one_transition(tmp_path: Path):
    paths = _project(tmp_path, change_class="STRUCTURAL")
    decision = _write_decision(paths)
    current = json.loads(paths["boundaries"].read_text(encoding="utf-8"))["current_baseline"]
    start_claim = paths["root"] / ".outline-boundaries.json.start.lock"
    recovery_claim = Path(f"{start_claim}.recovery")
    start_claim.write_text(
        json.dumps(
            {
                "owner_id": "expired-start-owner",
                "base_baseline_digest": current["baseline_digest"],
                "created_at": "2000-01-01T00:00:00.000Z",
                "heartbeat_at": "2000-01-01T00:00:00.000Z",
                "lease_expires_at": "2000-01-01T00:05:00.000Z",
            }
        ),
        encoding="utf-8",
    )
    command = [
        "node",
        str(START),
        str(paths["boundaries"]),
        str(paths["proposal"]),
        str(paths["preview"]),
        str(paths["decision"]),
        str(paths["journal"]),
    ]
    processes = [
        subprocess.Popen(command, cwd=tmp_path, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        for _ in range(2)
    ]
    results = [process.communicate(timeout=15) + (process.returncode,) for process in processes]
    assert any(returncode == 0 for _, _, returncode in results), results
    for stdout, stderr, returncode in results:
        if returncode == 0:
            assert json.loads(stdout)["state"] == "OUTLINE_CHANGE_APPROVED"
        else:
            assert "starting an Outline transition" in stderr or "recovery" in stderr

    final = json.loads(paths["boundaries"].read_text(encoding="utf-8"))
    assert final["transition_state"] == "OUTLINE_CHANGE_APPROVED"
    consumed = [json.loads(line) for line in paths["consumed_ledger"].read_text(encoding="utf-8").splitlines()]
    assert len(consumed) == 1
    assert consumed[0]["receipt_id"] == decision["receipt"]["receipt_id"]
    assert consumed[0]["transition_id"] == final["transition"]["transition_id"]
    assert not start_claim.exists()
    assert not recovery_claim.exists()


def test_structural_transition_uses_inventory_driven_skips_and_short_locks(tmp_path: Path):
    paths = _project(tmp_path, change_class="STRUCTURAL")
    _write_decision(paths)
    started = _start(paths, tmp_path)
    assert started.returncode == 0, started.stderr
    active = json.loads(paths["boundaries"].read_text(encoding="utf-8"))
    assert active["transition_state"] == "OUTLINE_CHANGE_APPROVED"
    assert active["transition"]["lock"] is None

    inventory_path = paths["root"] / "boundary-adjustments" / "transitions" / active["transition"]["transition_id"] / "inventory.json"
    inventory_path.parent.mkdir(parents=True)
    scanned = _run(SCAN, paths["boundaries"], inventory_path, cwd=tmp_path)
    assert scanned.returncode == 0, scanned.stderr
    assert not (paths["root"] / ".outline-boundaries.json.transition.lock").exists()
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    assert {item["artifact_type"] for item in inventory["artifacts"]} == {"prd", "outline", "spec"}

    verified_at = _now()
    evidence_path = inventory_path.with_name("evidence.json")
    evidence = {
        "schema_version": 1,
        "transition_id": active["transition"]["transition_id"],
        "transition_revision": 1,
        "proposal_digest": active["proposed_baseline"]["proposal_digest"],
        "inventory_digest": inventory["inventory_digest"],
        "artifact_reassignments": [
            {
                "artifact_type": item["artifact_type"],
                "artifact_ref": item["artifact_ref"],
                "disposition": "shared",
                "target_feature_code": None,
                "reason": "The reviewed boundary rationale does not move artifact ownership.",
            }
            for item in inventory["artifacts"]
        ],
        "impact_assessments": [
            {
                "artifact_type": item["artifact_type"],
                "artifact_ref": item["artifact_ref"],
                "outcome": "UNCHANGED_WITH_EVIDENCE",
                "evidence": [
                    {
                        "evidence_type": "hash_match",
                        "ref": item["artifact_ref"],
                        "source_digest": item["source_digest"],
                        "verified_at": verified_at,
                        "verifier": "test-suite",
                        "result": "matched",
                    }
                ],
            }
            for item in inventory["artifacts"]
        ],
    }
    evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
    report_path = inventory_path.with_name("validation-report.json")
    validated = _run(
        ADVANCE,
        "validate",
        paths["boundaries"],
        paths["journal"],
        "--inventory",
        inventory_path,
        "--evidence",
        evidence_path,
        "--report",
        report_path,
        cwd=tmp_path,
    )
    assert validated.returncode == 0, validated.stderr
    report = json.loads(report_path.read_text(encoding="utf-8"))
    statuses = {check["check_id"]: check["status"] for check in report["checks"]}
    assert statuses == {
        "project_restructure": "skipped",
        "flow": "skipped",
        "ui": "skipped",
        "cross_artifact": "executed",
    }
    validated_doc = json.loads(paths["boundaries"].read_text(encoding="utf-8"))
    assert validated_doc["transition_state"] == "CROSS_ARTIFACT_VALIDATED"
    assert validated_doc["transition"]["lock"] is None
    assert not (paths["root"] / ".outline-boundaries.json.transition.lock").exists()

    revalidated = _run(
        ADVANCE,
        "validate",
        paths["boundaries"],
        paths["journal"],
        "--inventory",
        inventory_path,
        "--evidence",
        evidence_path,
        "--report",
        report_path,
        cwd=tmp_path,
    )
    assert revalidated.returncode == 0, revalidated.stderr
    latest_report = json.loads(report_path.read_text(encoding="utf-8"))
    revalidated_doc = json.loads(paths["boundaries"].read_text(encoding="utf-8"))
    assert f"validation-report:{latest_report['report_digest']}" in revalidated_doc["transition"]["completed_steps"]

    activated = _run(
        ACTIVATE,
        paths["boundaries"],
        paths["index"],
        paths["journal"],
        "--inventory",
        inventory_path,
        "--report",
        report_path,
        cwd=tmp_path,
    )
    assert activated.returncode == 0, activated.stderr
    final = json.loads(paths["boundaries"].read_text(encoding="utf-8"))
    assert final["transition_state"] == "ALIGNED"
    assert final["current_baseline"]["baseline_id"] == "baseline-002"
    assert not list(paths["root"].glob(".outline-boundaries.json*.lock*"))
    contract = _run(VALIDATE, paths["boundaries"], cwd=tmp_path)
    assert contract.returncode == 0, contract.stderr


def test_metadata_start_recovers_after_receipt_consumption_fault(tmp_path: Path):
    paths = _project(tmp_path, change_class="METADATA")
    _write_decision(paths)
    interrupted = _start(
        paths,
        tmp_path,
        env={**os.environ, "SPECCOMPASS_FAULT_AFTER_DECISION_CONSUME": "1"},
    )
    assert interrupted.returncode != 0
    assert json.loads(paths["boundaries"].read_text(encoding="utf-8"))["transition_state"] == "OUTLINE_CHANGE_PROPOSED"
    assert len(paths["consumed_ledger"].read_text(encoding="utf-8").splitlines()) == 1
    assert not (paths["root"] / ".outline-boundaries.json.start.lock").exists()

    recovered = _start(paths, tmp_path)
    assert recovered.returncode == 0, recovered.stderr
    assert json.loads(recovered.stdout)["idempotent_recovery"] is True
    assert json.loads(paths["boundaries"].read_text(encoding="utf-8"))["transition_state"] == "ALIGNED"
    assert len(paths["consumed_ledger"].read_text(encoding="utf-8").splitlines()) == 1


def _prepare_physical_move_staging(tmp_path: Path) -> dict[str, object]:
    paths = _project(tmp_path, change_class="STRUCTURAL", physical_move=True)
    _write_decision(paths)
    started = _start(paths, tmp_path)
    assert started.returncode == 0, started.stderr
    active = json.loads(paths["boundaries"].read_text(encoding="utf-8"))
    transition_id = active["transition"]["transition_id"]
    transition_dir = paths["root"] / "boundary-adjustments" / "transitions" / transition_id
    transition_dir.mkdir(parents=True)
    inventory_path = transition_dir / "inventory.json"
    scanned = _run(SCAN, paths["boundaries"], inventory_path, cwd=tmp_path)
    assert scanned.returncode == 0, scanned.stderr
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    source_ref = "specs/001-child/spec.md"
    verified_at = _now()
    evidence = {
        "schema_version": 1,
        "transition_id": transition_id,
        "transition_revision": active["transition"]["transition_revision"],
        "proposal_digest": active["proposed_baseline"]["proposal_digest"],
        "inventory_digest": inventory["inventory_digest"],
        "artifact_reassignments": [],
        "impact_assessments": [],
    }
    for item in inventory["artifacts"]:
        moving = item["artifact_ref"] == source_ref
        evidence["artifact_reassignments"].append(
            {
                "artifact_type": item["artifact_type"],
                "artifact_ref": item["artifact_ref"],
                "disposition": "successor" if moving else "shared",
                "target_feature_code": "001" if moving else None,
                "reason": "Move the child specification with its renamed project." if moving else "Artifact remains unchanged.",
            }
        )
        evidence["impact_assessments"].append(
            {
                "artifact_type": item["artifact_type"],
                "artifact_ref": item["artifact_ref"],
                "outcome": "MIGRATE" if moving else "UNCHANGED_WITH_EVIDENCE",
                "evidence": [] if moving else [
                    {
                        "evidence_type": "hash_match",
                        "ref": item["artifact_ref"],
                        "source_digest": item["source_digest"],
                        "verified_at": verified_at,
                        "verifier": "test-suite",
                        "result": "matched",
                    }
                ],
            }
        )
    evidence_path = transition_dir / "evidence.json"
    evidence_path.write_text(json.dumps(evidence), encoding="utf-8")

    staging_root = paths["root"] / "boundary-adjustments" / "staging" / transition_id
    staged_path = staging_root / "outputs" / "spec.md"
    staged_path.parent.mkdir(parents=True)
    staged_path.write_text("# Child Spec migrated\n", encoding="utf-8")
    staging_ref = str(staging_root.relative_to(tmp_path)).replace("\\", "/")
    plan_path = staging_root / "plan.json"
    plan = {
        "schema_version": 1,
        "transition_id": transition_id,
        "inventory_digest": inventory["inventory_digest"],
        "staging_root": staging_ref,
        "operations": [
            {
                "artifact_type": "spec",
                "source_artifact_ref": source_ref,
                "operation": "move",
                "target_artifact_ref": "specs/001-child-v2/spec.md",
                "target_feature_code": "001",
                "staged_artifact_ref": str(staged_path.relative_to(tmp_path)).replace("\\", "/"),
            }
        ],
    }
    plan_path.write_text(json.dumps(plan), encoding="utf-8")
    prepared = _run(
        PREPARE_ARTIFACTS,
        paths["boundaries"],
        inventory_path,
        evidence_path,
        plan_path,
        paths["journal"],
        cwd=tmp_path,
    )
    assert prepared.returncode == 0, prepared.stderr
    staged_document = json.loads(paths["boundaries"].read_text(encoding="utf-8"))
    assert staged_document["transition_state"] == "PROJECT_RESTRUCTURE_STAGED"
    manifest_path = staging_root / "manifest.json"
    publication_path = staging_root / "publication-receipt.json"
    return {
        "paths": paths,
        "active": active,
        "inventory_path": inventory_path,
        "evidence_path": evidence_path,
        "manifest_path": manifest_path,
        "publication_path": publication_path,
        "source_ref": source_ref,
    }


def test_physical_move_uses_manifest_replay_and_three_phase_publication(tmp_path: Path):
    prepared_move = _prepare_physical_move_staging(tmp_path)
    paths = prepared_move["paths"]
    inventory_path = prepared_move["inventory_path"]
    evidence_path = prepared_move["evidence_path"]
    manifest_path = prepared_move["manifest_path"]
    publication_path = prepared_move["publication_path"]
    source_ref = prepared_move["source_ref"]
    assert isinstance(paths, dict)
    assert isinstance(inventory_path, Path)
    assert isinstance(evidence_path, Path)
    assert isinstance(manifest_path, Path)
    assert isinstance(publication_path, Path)
    assert isinstance(source_ref, str)

    report_path = inventory_path.with_name("validation-report.json")
    validated = _run(
        ADVANCE,
        "validate",
        paths["boundaries"],
        paths["journal"],
        "--inventory",
        inventory_path,
        "--evidence",
        evidence_path,
        "--report",
        report_path,
        "--manifest",
        manifest_path,
        cwd=tmp_path,
    )
    assert validated.returncode == 0, validated.stderr
    assert json.loads(paths["boundaries"].read_text(encoding="utf-8"))["transition_state"] == "CROSS_ARTIFACT_VALIDATED"

    live_target = tmp_path / "specs/001-child-v2/spec.md"
    live_target.parent.mkdir(parents=True)
    live_target.write_text("# Child Spec migrated\n", encoding="utf-8")
    preexisting = _run(PUBLISH_ARTIFACTS, paths["boundaries"], paths["journal"], cwd=tmp_path)
    assert preexisting.returncode != 0
    assert "already exists before this transition" in preexisting.stderr
    assert json.loads(publication_path.read_text(encoding="utf-8"))["completed_operations"] == []
    live_target.unlink()

    interrupted = _run(
        PUBLISH_ARTIFACTS,
        paths["boundaries"],
        paths["journal"],
        cwd=tmp_path,
        env={**os.environ, "SPECCOMPASS_FAULT_AFTER_ARTIFACT_OPERATION": "1"},
    )
    assert interrupted.returncode != 0
    partial = json.loads(publication_path.read_text(encoding="utf-8"))
    assert partial["phase"] == "STAGED"
    assert partial["completed_operations"] == ["op-0001"]
    assert not (tmp_path / source_ref).exists()
    assert (tmp_path / "specs/001-child-v2/spec.md").read_text(encoding="utf-8") == "# Child Spec migrated\n"

    published = _run(PUBLISH_ARTIFACTS, paths["boundaries"], paths["journal"], cwd=tmp_path)
    assert published.returncode == 0, published.stderr
    assert json.loads(publication_path.read_text(encoding="utf-8"))["phase"] == "ARTIFACTS_PUBLISHED"

    activated = _run(
        ACTIVATE,
        paths["boundaries"],
        paths["index"],
        paths["journal"],
        "--inventory",
        inventory_path,
        "--report",
        report_path,
        "--manifest",
        manifest_path,
        "--publication",
        publication_path,
        cwd=tmp_path,
    )
    assert activated.returncode == 0, activated.stderr
    final = json.loads(paths["boundaries"].read_text(encoding="utf-8"))
    child = next(item for item in final["current_baseline"]["project_boundaries"] if item["feature_code"] == "001")
    assert child["feature"] == "001-child-v2"
    assert json.loads(publication_path.read_text(encoding="utf-8"))["phase"] == "BASELINE_COMMITTED"
    steps = [json.loads(line)["step"] for line in paths["journal"].read_text(encoding="utf-8").splitlines()]
    assert "artifact-staging-manifest-created" in steps
    assert "artifacts-published" in steps
    assert "outline-boundaries-commit-point" in steps


def test_physical_staging_rolls_back_before_publish_and_refuses_after_live_write(tmp_path: Path):
    staged = _prepare_physical_move_staging(tmp_path / "staged")
    staged_paths = staged["paths"]
    staged_active = staged["active"]
    assert isinstance(staged_paths, dict)
    assert isinstance(staged_active, dict)
    proof = {
        "schema_version": 1,
        "transition_id": staged_active["transition"]["transition_id"],
        "transition_revision": staged_active["transition"]["transition_revision"],
        "proposal_digest": staged_active["proposed_baseline"]["proposal_digest"],
        "rollback_ref": staged_active["transition"]["rollback_ref"],
        "generated_at": _now(),
        "staging_disposition": "preserved_isolated",
        "live_writes": [],
        "verification_refs": ["specs/000-root/prd.md"],
        "reason": "Withdraw the staged proposal before any live artifact write.",
    }
    proof_path = tmp_path / "staged" / "rollback-proof.json"
    proof_path.write_text(json.dumps(proof), encoding="utf-8")
    rolled_back = _run(
        ROLLBACK,
        staged_paths["boundaries"],
        staged_paths["index"],
        staged_paths["journal"],
        proof_path,
        cwd=tmp_path / "staged",
    )
    assert rolled_back.returncode == 0, rolled_back.stderr
    assert json.loads(staged_paths["boundaries"].read_text(encoding="utf-8"))["transition_state"] == "ALIGNED"
    assert (tmp_path / "staged" / "specs/001-child/spec.md").exists()
    assert not (tmp_path / "staged" / "specs/001-child-v2/spec.md").exists()

    published = _prepare_physical_move_staging(tmp_path / "published")
    published_paths = published["paths"]
    published_active = published["active"]
    published_inventory = published["inventory_path"]
    published_evidence = published["evidence_path"]
    published_manifest = published["manifest_path"]
    assert isinstance(published_paths, dict)
    assert isinstance(published_active, dict)
    assert isinstance(published_inventory, Path)
    assert isinstance(published_evidence, Path)
    assert isinstance(published_manifest, Path)
    report_path = published_inventory.with_name("validation-report.json")
    validated = _run(
        ADVANCE,
        "validate",
        published_paths["boundaries"],
        published_paths["journal"],
        "--inventory",
        published_inventory,
        "--evidence",
        published_evidence,
        "--report",
        report_path,
        "--manifest",
        published_manifest,
        cwd=tmp_path / "published",
    )
    assert validated.returncode == 0, validated.stderr
    live_write = _run(
        PUBLISH_ARTIFACTS,
        published_paths["boundaries"],
        published_paths["journal"],
        cwd=tmp_path / "published",
    )
    assert live_write.returncode == 0, live_write.stderr

    published_proof = {
        "schema_version": 1,
        "transition_id": published_active["transition"]["transition_id"],
        "transition_revision": published_active["transition"]["transition_revision"],
        "proposal_digest": published_active["proposed_baseline"]["proposal_digest"],
        "rollback_ref": published_active["transition"]["rollback_ref"],
        "generated_at": _now(),
        "staging_disposition": "preserved_isolated",
        "live_writes": [],
        "verification_refs": ["specs/000-root/prd.md"],
        "reason": "This rollback must be rejected after publication.",
    }
    published_proof_path = tmp_path / "published" / "rollback-proof.json"
    published_proof_path.write_text(json.dumps(published_proof), encoding="utf-8")
    rejected = _run(
        ROLLBACK,
        published_paths["boundaries"],
        published_paths["index"],
        published_paths["journal"],
        published_proof_path,
        cwd=tmp_path / "published",
    )
    assert rejected.returncode != 0
    assert "Published artifact writes cannot use pre-commit rollback" in rejected.stderr
    assert json.loads(published_paths["boundaries"].read_text(encoding="utf-8"))["transition_state"] == "CROSS_ARTIFACT_VALIDATED"
