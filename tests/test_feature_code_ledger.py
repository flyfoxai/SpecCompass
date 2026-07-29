"""Regression tests for repository-wide, non-reusable SP feature codes."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
REVIEW_SCRIPTS = PROJECT_ROOT / "templates" / "project" / ".specify" / "review" / "scripts"
MANAGER = REVIEW_SCRIPTS / "manage-feature-codes.mjs"
TRANSITION_START = REVIEW_SCRIPTS / "start-outline-transition.mjs"
TRANSITION_PREPARE = REVIEW_SCRIPTS / "prepare-outline-adjustment.mjs"
TRANSITION_SCAN = REVIEW_SCRIPTS / "scan-outline-transition-impact.mjs"
TRANSITION_ADVANCE = REVIEW_SCRIPTS / "advance-outline-transition.mjs"
BASELINE_ACTIVATOR = REVIEW_SCRIPTS / "activate-outline-baseline.mjs"
LEASE_CLAIM_LIB = REVIEW_SCRIPTS / "lease-claim-lib.mjs"
CREATE_FEATURE_BASH = PROJECT_ROOT / "scripts" / "bash" / "create-new-feature.sh"
CREATE_FEATURE_POWERSHELL = PROJECT_ROOT / "scripts" / "powershell" / "create-new-feature.ps1"


def _digest(value: dict, field: str) -> str:
    payload = {key: item for key, item in value.items() if key != field}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _reviewed_transition_inputs(boundaries: Path, proposal: dict, cwd: Path) -> tuple[Path, Path, Path]:
    proposal_id = proposal["baseline_id"]
    draft = boundaries.parent / "boundary-adjustments" / "drafts" / proposal_id
    draft.mkdir(parents=True, exist_ok=True)
    proposal_path = draft / "proposal.json"
    preview_path = draft / "impact-preview.json"
    decision_path = draft / "decision.json"
    proposal = {**proposal, "created_at": _now()}
    proposal["decision_ref"] = str(decision_path.relative_to(cwd)).replace("\\", "/")
    proposal_path.write_text(json.dumps(proposal), encoding="utf-8")
    prepared = subprocess.run(
        ["node", str(TRANSITION_PREPARE), str(boundaries), str(proposal_path), str(preview_path)],
        cwd=cwd, text=True, capture_output=True, check=False,
    )
    assert prepared.returncode == 0, prepared.stderr
    preview = json.loads(preview_path.read_text(encoding="utf-8"))
    recorded_at = _now()
    receipt_id = hashlib.sha256(f"{preview['proposal_digest']}:{recorded_at}".encode()).hexdigest()
    decision = {
        "schema_version": 1,
        "decision": "CONFIRMED",
        "proposal_id": proposal_id,
        "proposal_digest": preview["proposal_digest"],
        "base_baseline_id": preview["base_baseline_id"],
        "base_baseline_digest": preview["base_baseline_digest"],
        "impact_preview_digest": preview["impact_preview_digest"],
        "initiated_by": "user",
        "change_class": preview["change_class"],
        "affected_feature_codes": preview["affected_feature_codes"],
        "reviewer_note": "Confirmed through the bound test review session.",
        "confirmed_by": {"type": "human", "display_name": "test-reviewer"},
        "source": {
            "kind": "speccompass_loopback_writer",
            "writeback_request_id": f"request-{receipt_id[:12]}",
            "review_session_id": "feature-code-ledger-session",
            "review_data_id": f"feature-code-{proposal_id}",
            "recorded_at": recorded_at,
        },
        "receipt": {"receipt_id": receipt_id, "status": "ISSUED_ONCE"},
        "decision_digest": "",
    }
    decision["decision_digest"] = _digest(decision, "decision_digest")
    decision_path.write_text(json.dumps(decision), encoding="utf-8")
    event = {
        "schema_version": 1,
        "event_type": "HUMAN_DECISION_RECORDED",
        "writeback_request_id": decision["source"]["writeback_request_id"],
        "review_session_id": decision["source"]["review_session_id"],
        "review_data_id": decision["source"]["review_data_id"],
        "proposal_id": proposal_id,
        "proposal_digest": decision["proposal_digest"],
        "base_baseline_id": decision["base_baseline_id"],
        "base_baseline_digest": decision["base_baseline_digest"],
        "impact_preview_digest": decision["impact_preview_digest"],
        "receipt_id": receipt_id,
        "decision": "CONFIRMED",
        "decision_digest": decision["decision_digest"],
        "recorded_at": recorded_at,
    }
    ledger = boundaries.parent / "boundary-adjustments" / "writeback-ledger.jsonl"
    with ledger.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event) + "\n")
    return proposal_path, preview_path, decision_path


def _aligned_document(*, timestamp_code: bool = False) -> dict:
    root_code = "20260728-120000" if timestamp_code else "000"
    root_feature = f"{root_code}-root"
    baseline = {
        "baseline_id": "baseline-001",
        "baseline_digest": "",
        "created_at": "2026-07-28T10:00:00.000Z",
        "created_by": "test-suite",
        "decision_ref": f"specs/{root_feature}/prd.md#decision-001",
        "project_boundaries": [
            {
                "order": 1,
                "feature_code": root_code,
                "feature": root_feature,
                "title": "Root",
                "parent_feature_code": None,
                "sibling_order": 0,
                "outline_node_id": f"boundary-{root_code}",
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Root boundary."},
                "lifecycle": "active",
                "predecessor_codes": [],
            }
        ],
        "tombstones": [],
    }
    baseline["baseline_digest"] = _digest(baseline, "baseline_digest")
    return {
        "schema_version": 1,
        "root_feature": root_feature,
        "updated_at": "2026-07-28T10:00:00.000Z",
        "transition_state": "ALIGNED",
        "current_baseline": baseline,
        "proposed_baseline": None,
        "transition": None,
    }


def _write_project(tmp_path: Path, document: dict | None = None) -> tuple[Path, Path, Path]:
    document = document or _aligned_document()
    specs = tmp_path / "specs"
    root = specs / document["root_feature"]
    root.mkdir(parents=True)
    boundaries = root / "outline-boundaries.json"
    ledger = specs / "feature-code-ledger.json"
    journal = root / "outline-transition.jsonl"
    boundaries.write_text(json.dumps(document), encoding="utf-8")
    return boundaries, ledger, journal


def _run(*args: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(MANAGER), *args],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
    )


def _reserve(
    ledger: Path,
    boundaries: Path,
    *,
    proposal: str,
    slug: str,
    cwd: Path,
) -> subprocess.CompletedProcess[str]:
    return _run(
        "reserve",
        str(ledger),
        str(boundaries),
        "--slug",
        slug,
        "--proposal",
        proposal,
        "--reason",
        f"Reserve {slug} for review.",
        cwd=cwd,
    )


def test_feature_code_reservation_expands_past_999_and_never_reuses_void_code(tmp_path: Path):
    boundaries, ledger, _ = _write_project(tmp_path)
    (tmp_path / "specs" / "999-observed").mkdir()

    first = _reserve(ledger, boundaries, proposal="baseline-002", slug="first-child", cwd=tmp_path)
    assert first.returncode == 0, first.stderr
    first_entry = json.loads(first.stdout)
    assert first_entry["feature_code"] == "1000"

    repeated = _reserve(ledger, boundaries, proposal="baseline-002", slug="first-child", cwd=tmp_path)
    assert repeated.returncode == 0, repeated.stderr
    assert json.loads(repeated.stdout)["allocation_id"] == first_entry["allocation_id"]

    voided = _run(
        "void",
        str(ledger),
        "--proposal",
        "baseline-002",
        "--reason",
        "The reviewed candidate was rejected.",
        cwd=tmp_path,
    )
    assert voided.returncode == 0, voided.stderr
    (tmp_path / "specs" / "999-observed").rmdir()

    second = _reserve(ledger, boundaries, proposal="baseline-003", slug="second-child", cwd=tmp_path)
    assert second.returncode == 0, second.stderr
    assert json.loads(second.stdout)["feature_code"] == "1001"
    stored = json.loads(ledger.read_text(encoding="utf-8"))
    statuses = {entry["feature_code"]: entry["status"] for entry in stored["entries"]}
    assert statuses["000"] == "active"
    assert statuses["1000"] == "void"
    assert statuses["1001"] == "reserved"
    validated = _run("validate", str(ledger), cwd=tmp_path)
    assert validated.returncode == 0, validated.stderr


def test_concurrent_reservations_are_unique_and_lock_conflicts_are_retryable(tmp_path: Path):
    boundaries, ledger, _ = _write_project(tmp_path)
    commands = [
        [
            "node", str(MANAGER), "reserve", str(ledger), str(boundaries),
            "--slug", slug, "--proposal", proposal, "--reason", f"Reserve {slug}.",
        ]
        for proposal, slug in (("baseline-002", "alpha"), ("baseline-003", "beta"))
    ]
    processes = [
        subprocess.Popen(command, cwd=tmp_path, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        for command in commands
    ]
    results = [process.communicate(timeout=10) + (process.returncode,) for process in processes]
    for index, (stdout, stderr, returncode) in enumerate(results):
        if returncode == 0:
            continue
        assert "owns the feature-code ledger lock" in stderr
        retry = subprocess.run(commands[index], cwd=tmp_path, text=True, capture_output=True, check=False)
        assert retry.returncode == 0, retry.stderr

    stored = json.loads(ledger.read_text(encoding="utf-8"))
    reserved = [entry for entry in stored["entries"] if entry["status"] == "reserved"]
    assert len(reserved) == 2
    assert len({entry["feature_code"] for entry in reserved}) == 2
    assert {entry["proposal_id"] for entry in reserved} == {"baseline-002", "baseline-003"}


def test_expired_lease_recovery_has_one_winner_and_orphaned_recovery_fails_closed(tmp_path: Path):
    lock_path = tmp_path / "feature-code.lock"
    recovery_path = Path(f"{lock_path}.recovery")
    lock_path.write_text(
        json.dumps(
            {
                "owner_id": "expired-owner",
                "created_at": "2000-01-01T00:00:00.000Z",
                "heartbeat_at": "2000-01-01T00:00:00.000Z",
                "lease_expires_at": "2000-01-01T00:00:01.000Z",
            }
        ),
        encoding="utf-8",
    )
    script = f"""
import {{ readFile }} from "node:fs/promises";
import {{ acquireLeaseClaim, releaseLeaseClaim }} from {json.dumps(LEASE_CLAIM_LIB.as_uri())};
const lockPath = {json.dumps(str(lock_path))};
const options = {{
  label: "Concurrent test claim",
  leaseMilliseconds: 5000,
  heartbeatMilliseconds: 1000,
  retryDelays: [0],
  activeMessage: "Concurrent test claim is active."
}};
const attempts = await Promise.allSettled([
  acquireLeaseClaim(lockPath, options),
  acquireLeaseClaim(lockPath, options)
]);
const winners = attempts.filter((item) => item.status === "fulfilled");
if (winners.length !== 1) throw new Error(`expected one recovery winner, got ${{winners.length}}`);
const stored = JSON.parse(await readFile(lockPath, "utf8"));
if (stored.owner_id !== winners[0].value.claim.owner_id) throw new Error("winner does not own the main claim");
await releaseLeaseClaim(winners[0].value);
console.log(JSON.stringify({{
  winners: winners.length,
  loser: attempts.find((item) => item.status === "rejected")?.reason?.message
}}));
"""
    result = subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert payload["winners"] == 1
    assert "recovery" in payload["loser"] or "active" in payload["loser"]
    assert not lock_path.exists()
    assert not recovery_path.exists()

    lock_path.write_text(
        json.dumps(
            {
                "owner_id": "another-expired-owner",
                "created_at": "2000-01-01T00:00:00.000Z",
                "lease_expires_at": "2000-01-01T00:00:01.000Z",
            }
        ),
        encoding="utf-8",
    )
    recovery_path.write_text(
        json.dumps(
            {
                "owner_id": "orphaned-recovery-owner",
                "created_at": "2000-01-01T00:00:00.000Z",
                "lease_expires_at": "2000-01-01T00:00:01.000Z",
            }
        ),
        encoding="utf-8",
    )
    blocked_script = f"""
import {{ acquireLeaseClaim }} from {json.dumps(LEASE_CLAIM_LIB.as_uri())};
try {{
  await acquireLeaseClaim({json.dumps(str(lock_path))}, {{
    label: "Orphan test claim", leaseMilliseconds: 5000, heartbeatMilliseconds: 1000
  }});
  throw new Error("orphaned recovery claim was accepted");
}} catch (error) {{
  if (!error.message.includes("recovery claim already exists")) throw error;
  console.log(error.message);
}}
"""
    blocked = subprocess.run(
        ["node", "--input-type=module", "--eval", blocked_script],
        text=True,
        capture_output=True,
        check=False,
    )
    assert blocked.returncode == 0, blocked.stderr
    assert "remove only the orphaned recovery claim" in blocked.stdout
    assert json.loads(lock_path.read_text(encoding="utf-8"))["owner_id"] == "another-expired-owner"
    assert recovery_path.exists()


def test_incomplete_lease_claims_fail_closed_without_takeover(tmp_path: Path):
    lock_path = tmp_path / "incomplete.lock"
    recovery_path = Path(f"{lock_path}.recovery")
    lock_path.write_text("", encoding="utf-8")
    script = f"""
import {{ acquireLeaseClaim }} from {json.dumps(LEASE_CLAIM_LIB.as_uri())};
try {{
  await acquireLeaseClaim({json.dumps(str(lock_path))}, {{
    label: "Incomplete test claim", leaseMilliseconds: 5000, heartbeatMilliseconds: 1000
  }});
  throw new Error("incomplete main claim was accepted");
}} catch (error) {{
  if (!error.message.includes("unreadable or only partially written")) throw error;
  console.log(error.message);
}}
"""
    blocked = subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        text=True,
        capture_output=True,
        check=False,
    )
    assert blocked.returncode == 0, blocked.stderr
    assert "preserve it for manual inspection" in blocked.stdout
    assert lock_path.exists()
    assert not recovery_path.exists()

    lock_path.write_text(
        json.dumps(
            {
                "owner_id": "expired-owner",
                "created_at": "2000-01-01T00:00:00.000Z",
                "lease_expires_at": "2000-01-01T00:00:01.000Z",
            }
        ),
        encoding="utf-8",
    )
    recovery_path.write_text("", encoding="utf-8")
    recovery_blocked = subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        text=True,
        capture_output=True,
        check=False,
    )
    assert recovery_blocked.returncode == 0, recovery_blocked.stderr
    assert "recovery claim" in recovery_blocked.stdout
    assert json.loads(lock_path.read_text(encoding="utf-8"))["owner_id"] == "expired-owner"
    assert recovery_path.exists()


def test_lease_release_retries_transient_windows_errors_and_reports_permanent_failure(tmp_path: Path):
    transient_path = tmp_path / "transient.lock"
    script = f"""
import {{ unlink }} from "node:fs/promises";
import {{ acquireLeaseClaim, releaseLeaseClaim }} from {json.dumps(LEASE_CLAIM_LIB.as_uri())};
const path = {json.dumps(str(transient_path))};
const handle = await acquireLeaseClaim(path, {{
  label: "Windows retry claim", leaseMilliseconds: 5000, heartbeatMilliseconds: 1000
}});
let attempts = 0;
await releaseLeaseClaim(handle, {{
  unlinkOperation: async (target) => {{
    attempts += 1;
    if (attempts < 3) {{ const error = new Error("busy"); error.code = "EPERM"; throw error; }}
    await unlink(target);
  }}
}});
console.log(JSON.stringify({{ attempts }}));
"""
    transient = subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        text=True,
        capture_output=True,
        check=False,
    )
    assert transient.returncode == 0, transient.stderr
    assert json.loads(transient.stdout)["attempts"] == 3
    assert not transient_path.exists()

    permanent_path = tmp_path / "permanent.lock"
    permanent_script = f"""
import {{ acquireLeaseClaim, releaseLeaseClaim }} from {json.dumps(LEASE_CLAIM_LIB.as_uri())};
const path = {json.dumps(str(permanent_path))};
const handle = await acquireLeaseClaim(path, {{
  label: "Permanent failure claim", leaseMilliseconds: 5000, heartbeatMilliseconds: 1000
}});
try {{
  await releaseLeaseClaim(handle, {{
    unlinkOperation: async () => {{ const error = new Error("busy"); error.code = "EACCES"; throw error; }}
  }});
  throw new Error("permanent release failure was hidden");
}} catch (error) {{
  if (!error.message.includes("could not be removed")) throw error;
  console.log(error.message);
}}
"""
    permanent = subprocess.run(
        ["node", "--input-type=module", "--eval", permanent_script],
        text=True,
        capture_output=True,
        check=False,
    )
    assert permanent.returncode == 0, permanent.stderr
    assert "EACCES" in permanent.stdout
    assert permanent_path.exists()


def test_historical_timestamp_code_can_be_adopted_but_new_reservation_is_sequential(tmp_path: Path):
    boundaries, ledger, _ = _write_project(tmp_path, _aligned_document(timestamp_code=True))
    initialized = _run("init", str(ledger), str(boundaries), cwd=tmp_path)
    assert initialized.returncode == 0, initialized.stderr
    reservation = _reserve(ledger, boundaries, proposal="baseline-002", slug="new-child", cwd=tmp_path)
    assert reservation.returncode == 0, reservation.stderr
    assert json.loads(reservation.stdout)["feature_code"] == "001"
    stored = json.loads(ledger.read_text(encoding="utf-8"))
    assert {entry["feature_code"]: entry["status"] for entry in stored["entries"]} == {
        "20260728-120000": "active",
        "001": "reserved",
    }


def test_transition_start_rejects_unreserved_new_code_and_activates_reserved_code(tmp_path: Path):
    boundaries, ledger, journal = _write_project(tmp_path)
    document = json.loads(boundaries.read_text(encoding="utf-8"))
    current = document["current_baseline"]

    def proposal(code: str, feature: str) -> dict:
        child = {
            "order": 2,
            "feature_code": code,
            "feature": feature,
            "title": "Child",
            "parent_feature_code": "000",
            "sibling_order": 1,
            "outline_node_id": f"boundary-{code}",
            "boundary_source": {
                "kind": "subproject_handoff",
                "handoff_ref": "specs/000-root/prd.md#handoff-child",
                "rationale": "Confirmed child boundary.",
            },
            "lifecycle": "active",
            "predecessor_codes": [],
        }
        return {
            "schema_version": 1,
            "base_baseline_id": current["baseline_id"],
            "base_baseline_digest": current["baseline_digest"],
            "baseline_id": "baseline-002",
            "created_by": "test-suite",
            "change_reason": "Add one confirmed child boundary.",
            "rollback_ref": "specs/000-root/outline-transition.jsonl#transition-002",
            "project_boundaries": [*current["project_boundaries"], child],
            "tombstones": [],
        }

    unreserved_draft = boundaries.parent / "boundary-adjustments" / "drafts" / "baseline-002"
    unreserved_draft.mkdir(parents=True)
    unreserved_proposal = proposal("002", "002-child") | {
        "created_at": _now(),
        "decision_ref": "specs/000-root/boundary-adjustments/drafts/baseline-002/decision.json",
    }
    unreserved_path = unreserved_draft / "proposal.json"
    unreserved_preview = unreserved_draft / "impact-preview.json"
    unreserved_path.write_text(json.dumps(unreserved_proposal), encoding="utf-8")
    rejected = subprocess.run(
        ["node", str(TRANSITION_PREPARE), str(boundaries), str(unreserved_path), str(unreserved_preview)],
        cwd=tmp_path, text=True, capture_output=True, check=False,
    )
    assert rejected.returncode != 0
    assert "has no active reservation" in rejected.stderr
    assert json.loads(boundaries.read_text(encoding="utf-8"))["transition_state"] == "ALIGNED"

    reserved = _reserve(ledger, boundaries, proposal="baseline-002", slug="child", cwd=tmp_path)
    assert reserved.returncode == 0, reserved.stderr
    entry = json.loads(reserved.stdout)
    proposal_path, preview_path, decision_path = _reviewed_transition_inputs(
        boundaries, proposal(entry["feature_code"], entry["feature"]), tmp_path
    )
    started = subprocess.run(
        [
            "node", str(TRANSITION_START), str(boundaries), str(proposal_path),
            str(preview_path), str(decision_path), str(journal),
        ],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert started.returncode == 0, started.stderr
    transition_id = json.loads(started.stdout)["transition_id"]
    stored_entry = next(
        item for item in json.loads(ledger.read_text(encoding="utf-8"))["entries"]
        if item["feature_code"] == entry["feature_code"]
    )
    assert stored_entry["status"] == "reserved"
    assert stored_entry["transition_id"] == transition_id

    transition_dir = boundaries.parent / "boundary-adjustments" / "transitions" / transition_id
    transition_dir.mkdir(parents=True)
    inventory_path = transition_dir / "inventory.json"
    scanned = subprocess.run(
        ["node", str(TRANSITION_SCAN), str(boundaries), str(inventory_path)],
        cwd=tmp_path, text=True, capture_output=True, check=False,
    )
    assert scanned.returncode == 0, scanned.stderr
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    active = json.loads(boundaries.read_text(encoding="utf-8"))
    verified_at = _now()
    evidence = {
        "schema_version": 1,
        "transition_id": transition_id,
        "transition_revision": active["transition"]["transition_revision"],
        "proposal_digest": active["proposed_baseline"]["proposal_digest"],
        "inventory_digest": inventory["inventory_digest"],
        "artifact_reassignments": [
            {
                "artifact_type": item["artifact_type"],
                "artifact_ref": item["artifact_ref"],
                "disposition": "shared",
                "target_feature_code": None,
                "reason": "Existing root artifact remains owned by the root project.",
            }
            for item in inventory["artifacts"]
        ],
        "impact_assessments": [
            {
                "artifact_type": item["artifact_type"],
                "artifact_ref": item["artifact_ref"],
                "outcome": "UNCHANGED_WITH_EVIDENCE",
                "evidence": [{
                    "evidence_type": "hash_match",
                    "ref": item["artifact_ref"],
                    "source_digest": item["source_digest"],
                    "verified_at": verified_at,
                    "verifier": "test-suite",
                    "result": "matched",
                }],
            }
            for item in inventory["artifacts"]
        ],
    }
    evidence_path = transition_dir / "evidence.json"
    report_path = transition_dir / "validation-report.json"
    evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
    advanced = subprocess.run(
        [
            "node", str(TRANSITION_ADVANCE), "validate", str(boundaries), str(journal),
            "--inventory", str(inventory_path), "--evidence", str(evidence_path),
            "--report", str(report_path),
        ],
        cwd=tmp_path, text=True, capture_output=True, check=False,
    )
    assert advanced.returncode == 0, advanced.stderr
    review_index = tmp_path / "specs" / "review-index.json"
    activated = subprocess.run(
        [
            "node", str(BASELINE_ACTIVATOR), str(boundaries), str(review_index), str(journal),
            "--inventory", str(inventory_path), "--report", str(report_path),
        ],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert activated.returncode == 0, activated.stderr
    final = json.loads(boundaries.read_text(encoding="utf-8"))
    assert final["transition_state"] == "ALIGNED"
    assert {item["feature_code"] for item in final["current_baseline"]["project_boundaries"]} == {"000", entry["feature_code"]}
    active_entry = next(
        item for item in json.loads(ledger.read_text(encoding="utf-8"))["entries"]
        if item["feature_code"] == entry["feature_code"]
    )
    assert active_entry["status"] == "active"
    assert active_entry["transition_id"] == transition_id


def test_ledger_digest_and_closed_fields_fail_validation(tmp_path: Path):
    boundaries, ledger, _ = _write_project(tmp_path)
    initialized = _run("init", str(ledger), str(boundaries), cwd=tmp_path)
    assert initialized.returncode == 0, initialized.stderr
    malformed = json.loads(ledger.read_text(encoding="utf-8"))
    malformed["unexpected"] = True
    ledger.write_text(json.dumps(malformed), encoding="utf-8")
    rejected = _run("validate", str(ledger), cwd=tmp_path)
    assert rejected.returncode != 0
    assert "unsupported fields: unexpected" in rejected.stderr


def test_create_feature_consumes_only_an_active_ledger_code(tmp_path: Path):
    boundaries, ledger, _ = _write_project(tmp_path)
    script_dir = tmp_path / ".specify" / "scripts" / "bash"
    review_dir = tmp_path / ".specify" / "review" / "scripts"
    script_dir.mkdir(parents=True)
    review_dir.mkdir(parents=True)
    shutil.copy2(CREATE_FEATURE_BASH, script_dir / "create-new-feature.sh")
    shutil.copy2(PROJECT_ROOT / "scripts" / "bash" / "common.sh", script_dir / "common.sh")
    for source in (
        REVIEW_SCRIPTS / "manage-feature-codes.mjs",
        REVIEW_SCRIPTS / "feature-code-ledger-lib.mjs",
        REVIEW_SCRIPTS / "lease-claim-lib.mjs",
        REVIEW_SCRIPTS / "outline-boundaries-lib.mjs",
    ):
        shutil.copy2(source, review_dir / source.name)

    reserved = _reserve(ledger, boundaries, proposal="baseline-002", slug="child", cwd=tmp_path)
    assert reserved.returncode == 0, reserved.stderr
    entry = json.loads(reserved.stdout)
    command = ["bash", str(script_dir / "create-new-feature.sh"), "--dry-run", "--json", "--short-name", "child"]

    missing_number = subprocess.run([*command, "Child feature"], cwd=tmp_path, text=True, capture_output=True, check=False)
    assert missing_number.returncode != 0
    assert "--number is required" in missing_number.stderr
    timestamp = subprocess.run([*command, "--timestamp", "Child feature"], cwd=tmp_path, text=True, capture_output=True, check=False)
    assert timestamp.returncode != 0
    assert "Timestamp numbering is not allowed" in timestamp.stderr
    reserved_only = subprocess.run(
        [*command, "--number", entry["feature_code"], "Child feature"],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert reserved_only.returncode != 0
    assert "is not authorized" in reserved_only.stderr

    document = json.loads(boundaries.read_text(encoding="utf-8"))
    child = {
        "order": 2,
        "feature_code": entry["feature_code"],
        "feature": entry["feature"],
        "title": "Child",
        "parent_feature_code": "000",
        "sibling_order": 1,
        "outline_node_id": f"boundary-{entry['feature_code']}",
        "boundary_source": {
            "kind": "subproject_handoff",
            "handoff_ref": "specs/000-root/prd.md#handoff-child",
            "rationale": "Confirmed child boundary.",
        },
        "lifecycle": "active",
        "predecessor_codes": [],
    }
    document["current_baseline"]["project_boundaries"].append(child)
    document["current_baseline"]["baseline_digest"] = _digest(document["current_baseline"], "baseline_digest")
    boundaries.write_text(json.dumps(document), encoding="utf-8")
    reconciled = _run("reconcile", str(ledger), str(boundaries), cwd=tmp_path)
    assert reconciled.returncode == 0, reconciled.stderr

    authorized = subprocess.run(
        [*command, "--number", entry["feature_code"], "Child feature"],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert authorized.returncode == 0, authorized.stderr
    assert json.loads(authorized.stdout)["FEATURE_NUM"] == entry["feature_code"]
    wrong_code = subprocess.run(
        [*command, "--number", "002", "Child feature"],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert wrong_code.returncode != 0
    assert "is not authorized" in wrong_code.stderr


def test_bash_and_powershell_creation_scripts_share_ledger_guard_contract():
    bash = CREATE_FEATURE_BASH.read_text(encoding="utf-8")
    powershell = CREATE_FEATURE_POWERSHELL.read_text(encoding="utf-8")
    for token in ("feature-code-ledger.json", "manage-feature-codes.mjs", "authorize-create"):
        assert token in bash
        assert token in powershell
    assert "--number is required" in bash
    assert "-Number is required" in powershell
