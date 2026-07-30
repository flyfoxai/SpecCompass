from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPT = (
    PROJECT_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "review"
    / "scripts"
    / "reset-command-artifacts.mjs"
)


def _run(
    *arguments: str | Path,
    cwd: Path,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(SCRIPT), *(str(argument) for argument in arguments)],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
        env={**os.environ, **(env or {})},
    )


def _feature(tmp_path: Path, name: str = "001-demo") -> Path:
    feature = tmp_path / "specs" / name
    feature.mkdir(parents=True)
    (feature / "prd.md").write_text("# Requirement facts\n", encoding="utf-8")
    (feature / "spec.md").write_text("# Stable spec\n", encoding="utf-8")
    return feature


def _inspect(command: str, feature: Path, cwd: Path) -> dict:
    result = _run("inspect", command, feature, cwd=cwd)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def test_prd_reset_clears_only_outline_owned_artifacts(tmp_path: Path):
    feature = _feature(tmp_path)
    (feature / "spec-outline.md").write_text("# Old Outline\n", encoding="utf-8")
    review = feature / "prd" / "review"
    review.mkdir(parents=True)
    (review / "outline-review-data.json").write_text("{}\n", encoding="utf-8")
    (review / "outline-draft-reset.json").write_text("keep reset metadata\n", encoding="utf-8")
    (feature / "outline-boundaries-adoption.json").write_text("keep boundary candidate\n", encoding="utf-8")
    flow = feature / "flows" / "main.mmd"
    flow.parent.mkdir()
    flow.write_text("flowchart TD\n", encoding="utf-8")
    code = feature / "src" / "service.ts"
    code.parent.mkdir()
    code.write_text("export const stable = true;\n", encoding="utf-8")

    inspection = _inspect("prd", feature, tmp_path)
    assert inspection["state"] == "CLEAR_AND_REGENERATE"
    assert {Path(item["ref"]).name for item in inspection["generated_artifacts"]} == {
        "spec-outline.md",
        "outline-review-data.json",
    }

    applied = _run(
        "apply",
        "prd",
        feature,
        "--mode",
        "clear",
        "--inventory-digest",
        inspection["inventory_digest"],
        cwd=tmp_path,
    )
    assert applied.returncode == 0, applied.stderr
    assert not (feature / "spec-outline.md").exists()
    assert not (review / "outline-review-data.json").exists()
    assert (feature / "prd.md").exists()
    assert (feature / "spec.md").exists()
    assert flow.exists()
    assert code.exists()
    assert (review / "outline-draft-reset.json").exists()
    assert (feature / "outline-boundaries-adoption.json").exists()


def test_confirmed_records_require_explicit_clear_or_preserve(tmp_path: Path):
    feature = _feature(tmp_path)
    review = feature / "ui" / "review"
    review.mkdir(parents=True)
    confirmation = review / "ui-confirmation.md"
    confirmation.write_text(
        "---\n"
        "document_type: sp_human_confirmation\n"
        "confirmed_by:\n"
        "  type: human\n"
        "human_confirmation: CONFIRMED\n"
        "---\n",
        encoding="utf-8",
    )
    (feature / "ui" / "screen-main.md").write_text("# Old screen\n", encoding="utf-8")
    inspection = _inspect("ui", feature, tmp_path)
    assert inspection["state"] == "CONFIRMED_RECORDS_REQUIRE_CHOICE"
    assert inspection["confirmed_records"][0]["status"] == "CONFIRMED"

    rejected = _run(
        "apply",
        "ui",
        feature,
        "--mode",
        "clear",
        "--inventory-digest",
        inspection["inventory_digest"],
        cwd=tmp_path,
    )
    assert rejected.returncode == 1
    assert "--ack-confirmed" in rejected.stderr
    assert confirmation.exists()

    cleared = _run(
        "apply",
        "ui",
        feature,
        "--mode",
        "clear",
        "--inventory-digest",
        inspection["inventory_digest"],
        "--ack-confirmed",
        cwd=tmp_path,
    )
    assert cleared.returncode == 0, cleared.stderr
    assert not confirmation.exists()
    assert not (feature / "ui" / "screen-main.md").exists()
    assert _inspect("ui", feature, tmp_path)["state"] == "NO_GENERATED_ARTIFACTS"


def test_preserve_mode_archives_confirmation_as_non_authoritative(tmp_path: Path):
    feature = _feature(tmp_path)
    review = feature / "flows" / "review"
    review.mkdir(parents=True)
    confirmation = review / "flow-confirmation.md"
    confirmation.write_text(
        "---\n"
        "document_type: sp_human_confirmation\n"
        "confirmed_by:\n"
        "  type: human\n"
        "human_confirmation: SCOPED_CONFIRMATION\n"
        "---\n",
        encoding="utf-8",
    )
    (feature / "flows" / "main.mmd").write_text("flowchart TD\n", encoding="utf-8")
    inspection = _inspect("flow", feature, tmp_path)

    preserved = _run(
        "apply",
        "flow",
        feature,
        "--mode",
        "preserve-confirmed",
        "--inventory-digest",
        inspection["inventory_digest"],
        cwd=tmp_path,
    )
    assert preserved.returncode == 0, preserved.stderr
    payload = json.loads(preserved.stdout)
    manifest_path = tmp_path / payload["preserved_confirmation_manifest"]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["authority"] == "NON_AUTHORITATIVE_REREVIEW_INPUT"
    assert manifest["records"][0]["status"] == "SCOPED_CONFIRMATION"
    assert not confirmation.exists()
    assert not (feature / "flows" / "main.mmd").exists()
    archived = tmp_path / manifest["records"][0]["archived_ref"]
    assert archived.exists()

    next_inspection = _inspect("flow", feature, tmp_path)
    assert next_inspection["state"] == "NO_GENERATED_ARTIFACTS"


def test_pending_outline_response_is_protected_human_input(tmp_path: Path):
    feature = _feature(tmp_path)
    review = feature / "prd" / "review"
    review.mkdir(parents=True)
    (review / "outline-discovery-response-pending.json").write_text(
        json.dumps({"response": "keep candidate"}), encoding="utf-8"
    )
    inspection = _inspect("prd", feature, tmp_path)
    assert inspection["state"] == "CONFIRMED_RECORDS_REQUIRE_CHOICE"
    assert inspection["confirmed_records"][0]["status"] == "RECORDED_HUMAN_INPUT"


def test_reset_rejects_inventory_drift(tmp_path: Path):
    feature = _feature(tmp_path)
    flow = feature / "flows" / "main.mmd"
    flow.parent.mkdir()
    flow.write_text("flowchart TD\n", encoding="utf-8")
    inspection = _inspect("flow", feature, tmp_path)
    flow.write_text("flowchart LR\n", encoding="utf-8")

    result = _run(
        "apply",
        "flow",
        feature,
        "--mode",
        "clear",
        "--inventory-digest",
        inspection["inventory_digest"],
        cwd=tmp_path,
    )
    assert result.returncode == 1
    assert "changed after inspection" in result.stderr
    assert flow.exists()


def test_interrupted_reset_resumes_from_digest_bound_recovery_plan(tmp_path: Path):
    feature = _feature(tmp_path)
    flows = feature / "flows"
    flows.mkdir()
    (flows / "index.md").write_text("# Old flow index\n", encoding="utf-8")
    (flows / "main.mmd").write_text("flowchart TD\n", encoding="utf-8")
    inspection = _inspect("flow", feature, tmp_path)
    arguments = (
        "apply",
        "flow",
        feature,
        "--mode",
        "clear",
        "--inventory-digest",
        inspection["inventory_digest"],
    )

    interrupted = _run(
        *arguments,
        cwd=tmp_path,
        env={"SPECCOMPASS_FAULT_AFTER_COMMAND_ARTIFACT_MOVE": "1"},
    )
    assert interrupted.returncode == 1
    reset_root = (
        flows
        / "review"
        / "history"
        / "regeneration-resets"
        / inspection["inventory_digest"]
    )
    assert (reset_root / "reset-plan.json").exists()
    assert not (reset_root / "reset-receipt.json").exists()
    assert len(list((reset_root / "files").iterdir())) == 1

    resumed = _run(*arguments, cwd=tmp_path)
    assert resumed.returncode == 0, resumed.stderr
    assert not (flows / "index.md").exists()
    assert not (flows / "main.mmd").exists()
    assert (reset_root / "reset-receipt.json").exists()
    assert not (reset_root / "files").exists()

    repeated = _run(*arguments, cwd=tmp_path)
    assert repeated.returncode == 0, repeated.stderr
    assert json.loads(repeated.stdout)["source_inventory_digest"] == inspection["inventory_digest"]


def test_tampered_recovery_plan_cannot_expand_reset_scope(tmp_path: Path):
    feature = _feature(tmp_path)
    flow = feature / "flows" / "main.mmd"
    flow.parent.mkdir()
    flow.write_text("flowchart TD\n", encoding="utf-8")
    protected = feature / "prd.md"
    inspection = _inspect("flow", feature, tmp_path)
    arguments = (
        "apply",
        "flow",
        feature,
        "--mode",
        "clear",
        "--inventory-digest",
        inspection["inventory_digest"],
    )
    interrupted = _run(
        *arguments,
        cwd=tmp_path,
        env={"SPECCOMPASS_FAULT_AFTER_COMMAND_ARTIFACT_MOVE": "1"},
    )
    assert interrupted.returncode == 1

    reset_root = (
        feature
        / "flows"
        / "review"
        / "history"
        / "regeneration-resets"
        / inspection["inventory_digest"]
    )
    plan_path = reset_root / "reset-plan.json"
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    plan["artifacts"][0]["ref"] = f"specs/{feature.name}/prd.md"
    plan_path.write_text(json.dumps(plan), encoding="utf-8")

    rejected = _run(*arguments, cwd=tmp_path)
    assert rejected.returncode == 1
    assert "recovery plan is invalid" in rejected.stderr
    assert protected.read_text(encoding="utf-8") == "# Requirement facts\n"


def test_reset_rejects_symlinked_generated_output(tmp_path: Path):
    feature = _feature(tmp_path)
    flows = feature / "flows"
    flows.mkdir()
    link = flows / "linked-prd.md"
    try:
        link.symlink_to(feature / "prd.md")
    except OSError as error:
        pytest.skip(f"symlink creation unavailable: {error}")

    result = _run("inspect", "flow", feature, cwd=tmp_path)
    assert result.returncode == 1
    assert "Symbolic links are not allowed" in result.stderr
    assert (feature / "prd.md").read_text(encoding="utf-8") == "# Requirement facts\n"


def test_reset_rejects_hard_linked_generated_output(tmp_path: Path):
    feature = _feature(tmp_path)
    flows = feature / "flows"
    flows.mkdir()
    linked = flows / "linked-prd.md"
    try:
        os.link(feature / "prd.md", linked)
    except OSError as error:
        pytest.skip(f"hard-link creation unavailable: {error}")

    result = _run("inspect", "flow", feature, cwd=tmp_path)
    assert result.returncode == 1
    assert "Hard-linked generated output is not safe to reset" in result.stderr
    assert linked.read_text(encoding="utf-8") == "# Requirement facts\n"
    assert (feature / "prd.md").read_text(encoding="utf-8") == "# Requirement facts\n"
