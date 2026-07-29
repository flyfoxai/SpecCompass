from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = PROJECT_ROOT / "templates" / "project" / ".specify" / "review" / "scripts"
RESET = SCRIPTS / "discard-outline-draft.mjs"
RESET_VALIDATOR = SCRIPTS / "validate-outline-draft-reset.mjs"
GATE = SCRIPTS / "check-outline-boundary-gate.mjs"


def _run(script: Path, *arguments: str | Path, cwd: Path):
    return subprocess.run(
        ["node", str(script), *(str(argument) for argument in arguments)],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
    )


def _entry(
    order: int,
    code: str,
    feature: str,
    title: str,
    parent: str | None,
    sibling_order: int,
) -> dict:
    return {
        "order": order,
        "feature_code": code,
        "feature": feature,
        "title": title,
        "parent_feature": parent,
        "sibling_order": sibling_order,
        "boundary_source": {
            "kind": "root" if parent is None else "subproject_handoff",
            "handoff_ref": None if parent is None else f"specs/{feature}/prd.md#handoff",
            "rationale": "Draft project boundary awaiting first authoritative adoption.",
        },
        "outline_alignment": {
            "status": "one_to_one",
            "outline_node_refs": [f"draft-node-{code}"],
            "rationale": "Non-authoritative draft mapping.",
        },
        "has_flow_review": True,
        "has_ui_review": True,
        "has_outline_review": True,
        "has_outline_discovery": True,
    }


def _project(tmp_path: Path) -> dict[str, Path]:
    specs = tmp_path / "specs"
    root = specs / "000-root"
    child = specs / "001-child"
    for feature in (root, child):
        review = feature / "prd" / "review"
        review.mkdir(parents=True)
        (feature / "prd.md").write_text(
            f"# {feature.name} PRD\n\n## handoff\n\nAuthoritative requirement facts.\n",
            encoding="utf-8",
        )
        (feature / "spec-outline.md").write_text(
            f"# {feature.name} draft Outline\n\nStatus: AWAITING_OUTLINE_CONFIRMATION\n",
            encoding="utf-8",
        )
        (feature / "spec.md").write_text("# Preserved spec\n", encoding="utf-8")
        (feature / "flow.md").write_text("# Preserved flow\n", encoding="utf-8")
        (feature / "ui.md").write_text("# Preserved UI\n", encoding="utf-8")
        (feature / "tasks.md").write_text("# Preserved tasks\n", encoding="utf-8")
        (feature / "implementation.ts").write_text("export const preserved = true;\n", encoding="utf-8")
        (review / "outline-review-data.json").write_text("{}\n", encoding="utf-8")
        (review / "outline-confirmation.md").write_text("human_confirmation: CONFIRMED\n", encoding="utf-8")
        (review / "outline-discovery-data.json").write_text("{}\n", encoding="utf-8")
        (review / "outline-discovery-response-pending.json").write_text("{}\n", encoding="utf-8")
        (review / "outline-intent-ledger.json").write_text("{}\n", encoding="utf-8")

    consumed = child / "prd" / "review" / "history" / "consumed"
    consumed.mkdir(parents=True)
    (consumed / "outline-discovery-response-old.json").write_text("{}\n", encoding="utf-8")
    (consumed / "unrelated-review.json").write_text("{\"keep\": true}\n", encoding="utf-8")

    drafts = root / "boundary-adjustments" / "drafts" / "proposal-old"
    drafts.mkdir(parents=True)
    (drafts / "proposal.json").write_text("{}\n", encoding="utf-8")
    (drafts / "decision.json").write_text("{}\n", encoding="utf-8")
    (root / "outline-boundaries-adoption.json").write_text("{}\n", encoding="utf-8")

    index = {
        "schema_version": 2,
        "project": "Draft project",
        "updated_at": "2026-07-29",
        "hierarchy": {"mode": "explicit", "root_feature": "000-root"},
        "features": [
            _entry(1, "000", "000-root", "Root", None, 0),
            _entry(2, "001", "001-child", "Child", "000-root", 1),
        ],
    }
    index_path = specs / "review-index.json"
    index_path.write_text(json.dumps(index, indent=2), encoding="utf-8")
    return {
        "root": root,
        "child": child,
        "index": index_path,
        "boundaries": root / "outline-boundaries.json",
        "plan": root / "prd" / "review" / "outline-draft-reset-plan.json",
        "receipt": root / "prd" / "review" / "outline-draft-reset.json",
    }


def _plan(paths: dict[str, Path], cwd: Path) -> dict:
    result = _run(
        RESET,
        "plan",
        paths["index"],
        paths["boundaries"],
        paths["plan"],
        "--root",
        "000-root",
        cwd=cwd,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(paths["plan"].read_text(encoding="utf-8"))


def _apply(paths: dict[str, Path], plan: dict, cwd: Path):
    return _run(
        RESET,
        "apply",
        paths["index"],
        paths["boundaries"],
        paths["plan"],
        "--plan-digest",
        plan["plan_digest"],
        cwd=cwd,
    )


def _reset_plan_digest(plan: dict) -> str:
    payload = {key: value for key, value in plan.items() if key != "plan_digest"}
    canonical = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def test_reset_plan_is_non_destructive_and_apply_preserves_product_artifacts(tmp_path: Path):
    paths = _project(tmp_path)
    plan = _plan(paths, tmp_path)

    assert (paths["root"] / "spec-outline.md").exists()
    assert (paths["child"] / "prd" / "review" / "outline-confirmation.md").exists()
    assert not paths["receipt"].exists()
    assert [source["prd_ref"] for source in plan["source_containers"]] == [
        "specs/000-root/prd.md",
        "specs/001-child/prd.md",
    ]
    assert all("prd.md" != Path(entry["source_ref"]).name for entry in plan["archive_entries"])
    valid_plan = _run(RESET_VALIDATOR, paths["plan"], cwd=tmp_path)
    assert valid_plan.returncode == 0, valid_plan.stderr

    applied = _apply(paths, plan, tmp_path)
    assert applied.returncode == 0, applied.stderr
    receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
    assert receipt["state"] == "APPLIED_AWAITING_REGENERATION"
    assert receipt["next_command"].startswith("/sp.prd 000-root --regenerate-outline-draft")
    valid_receipt = _run(RESET_VALIDATOR, paths["receipt"], cwd=tmp_path)
    assert valid_receipt.returncode == 0, valid_receipt.stderr

    for feature in (paths["root"], paths["child"]):
        assert (feature / "prd.md").exists()
        assert (feature / "spec.md").exists()
        assert (feature / "flow.md").exists()
        assert (feature / "ui.md").exists()
        assert (feature / "tasks.md").exists()
        assert (feature / "implementation.ts").exists()
        assert not (feature / "spec-outline.md").exists()
        assert not (feature / "prd" / "review" / "outline-review-data.json").exists()
        assert not (feature / "prd" / "review" / "outline-confirmation.md").exists()

    assert (paths["child"] / "prd" / "review" / "history" / "consumed" / "unrelated-review.json").exists()
    consumed_response = "specs/001-child/prd/review/history/consumed/outline-discovery-response-old.json"
    assert not (tmp_path / consumed_response).exists()
    consumed_archive = next(
        entry["archive_ref"] for entry in receipt["archived_entries"] if entry["source_ref"] == consumed_response
    )
    assert (tmp_path / consumed_archive).exists()
    assert "Authoritative requirement facts" in (paths["child"] / "prd.md").read_text(encoding="utf-8")
    for entry in receipt["archived_entries"]:
        assert not (tmp_path / entry["source_ref"]).exists()
        assert (tmp_path / entry["archive_ref"]).exists()

    index = json.loads(paths["index"].read_text(encoding="utf-8"))
    assert index["hierarchy"] == {"mode": "flat", "root_feature": None}
    assert all(item["parent_feature"] is None and item["sibling_order"] == 0 for item in index["features"])
    assert all(item["outline_alignment"]["status"] == "not_mapped" for item in index["features"])
    assert all(not item["has_outline_review"] and not item["has_outline_discovery"] for item in index["features"])
    assert all(item["has_flow_review"] and item["has_ui_review"] for item in index["features"])

    replay = _apply(paths, plan, tmp_path)
    assert replay.returncode == 0, replay.stderr
    assert json.loads(replay.stdout)["receipt_digest"] == receipt["receipt_digest"]

    gate = _run(GATE, paths["boundaries"], paths["index"], "--feature", "001-child", cwd=tmp_path)
    assert gate.returncode == 1
    blocked = json.loads(gate.stdout)
    assert blocked["block_reason"] == "OUTLINE_DRAFT_REGENERATION_REQUIRED"
    assert blocked["repair_command_exec"] == receipt["next_command"]


def test_reset_rejects_authoritative_baseline_before_planning(tmp_path: Path):
    paths = _project(tmp_path)
    paths["boundaries"].write_text("{}\n", encoding="utf-8")
    result = _run(
        RESET,
        "plan",
        paths["index"],
        paths["boundaries"],
        paths["plan"],
        "--root",
        "000-root",
        cwd=tmp_path,
    )
    assert result.returncode != 0
    assert "allowed only before the first authoritative baseline" in result.stderr
    assert (paths["root"] / "spec-outline.md").exists()


def test_reset_rejects_preserved_source_drift_without_archiving(tmp_path: Path):
    paths = _project(tmp_path)
    plan = _plan(paths, tmp_path)
    implementation = paths["child"] / "implementation.ts"
    implementation.write_text("export const preserved = 'changed';\n", encoding="utf-8")

    result = _apply(paths, plan, tmp_path)
    assert result.returncode != 0
    assert "inventory changed" in result.stderr
    assert not paths["receipt"].exists()
    assert (paths["root"] / "spec-outline.md").exists()
    assert (paths["child"] / "prd" / "review" / "outline-confirmation.md").exists()


def test_reset_rejects_tampered_plan_digest(tmp_path: Path):
    paths = _project(tmp_path)
    plan = _plan(paths, tmp_path)
    plan["archive_entries"][0]["source_ref"] = "specs/000-root/prd.md"
    paths["plan"].write_text(json.dumps(plan), encoding="utf-8")

    validation = _run(RESET_VALIDATOR, paths["plan"], cwd=tmp_path)
    assert validation.returncode != 0
    assert "plan digest does not match" in validation.stderr
    result = _apply(paths, plan, tmp_path)
    assert result.returncode != 0
    assert (paths["root"] / "prd.md").exists()
    assert (paths["root"] / "spec-outline.md").exists()


def test_reset_rejects_preserved_code_even_when_plan_digest_is_recomputed(tmp_path: Path):
    paths = _project(tmp_path)
    plan = _plan(paths, tmp_path)
    implementation = paths["child"] / "implementation.ts"
    source_ref = "specs/001-child/implementation.ts"
    plan["archive_entries"].append(
        {
            "source_ref": source_ref,
            "source_digest": hashlib.sha256(implementation.read_bytes()).hexdigest(),
            "archive_ref": f'{plan["archive_root"]}/{source_ref}',
        }
    )
    plan["plan_digest"] = _reset_plan_digest(plan)
    paths["plan"].write_text(json.dumps(plan), encoding="utf-8")

    result = _apply(paths, plan, tmp_path)
    assert result.returncode != 0
    assert "preserved artifact" in result.stderr
    assert implementation.exists()
    assert (paths["root"] / "spec-outline.md").exists()
    assert not paths["receipt"].exists()


def test_reset_resumes_when_one_planned_file_was_already_archived(tmp_path: Path):
    paths = _project(tmp_path)
    plan = _plan(paths, tmp_path)
    first = plan["archive_entries"][0]
    source = tmp_path / first["source_ref"]
    archived = tmp_path / first["archive_ref"]
    archived.parent.mkdir(parents=True)
    source.rename(archived)

    result = _apply(paths, plan, tmp_path)
    assert result.returncode == 0, result.stderr
    assert paths["receipt"].exists()
    assert not source.exists()
    assert archived.exists()


def test_reset_rejects_active_transition_artifacts(tmp_path: Path):
    paths = _project(tmp_path)
    transition = paths["root"] / "boundary-adjustments" / "transitions" / "active" / "inventory.json"
    transition.parent.mkdir(parents=True)
    transition.write_text("{}\n", encoding="utf-8")

    result = _run(
        RESET,
        "plan",
        paths["index"],
        paths["boundaries"],
        paths["plan"],
        "--root",
        "000-root",
        cwd=tmp_path,
    )
    assert result.returncode != 0
    assert "Active or recoverable boundary transitions exists" in result.stderr


@pytest.mark.skipif(not hasattr(os, "symlink"), reason="symlinks unavailable")
def test_reset_rejects_symlinks_in_preserved_source_containers(tmp_path: Path):
    paths = _project(tmp_path)
    target = tmp_path / "outside.txt"
    target.write_text("outside\n", encoding="utf-8")
    link = paths["child"] / "linked-code.ts"
    try:
        link.symlink_to(target)
    except OSError as error:
        pytest.skip(f"symlink creation unavailable: {error}")

    result = _run(
        RESET,
        "plan",
        paths["index"],
        paths["boundaries"],
        paths["plan"],
        "--root",
        "000-root",
        cwd=tmp_path,
    )
    assert result.returncode != 0
    assert "Symbolic links are not accepted" in result.stderr


@pytest.mark.skipif(not hasattr(os, "link"), reason="hard links unavailable")
def test_reset_rejects_hard_link_aliases_without_archiving_code(tmp_path: Path):
    paths = _project(tmp_path)
    outline = paths["child"] / "spec-outline.md"
    implementation = paths["child"] / "implementation.ts"
    outline.unlink()
    try:
        os.link(implementation, outline)
    except OSError as error:
        pytest.skip(f"hard-link creation unavailable: {error}")

    result = _run(
        RESET,
        "plan",
        paths["index"],
        paths["boundaries"],
        paths["plan"],
        "--root",
        "000-root",
        cwd=tmp_path,
    )
    assert result.returncode != 0
    assert "Hard-linked files are not accepted" in result.stderr
    assert implementation.exists()
    assert implementation.read_text(encoding="utf-8") == "export const preserved = true;\n"
    assert not paths["plan"].exists()


def test_reset_operates_from_repository_path_containing_spaces(tmp_path: Path):
    project = tmp_path / "project with spaces"
    project.mkdir()
    paths = _project(project)
    plan = _plan(paths, project)
    result = _apply(paths, plan, project)
    assert result.returncode == 0, result.stderr
    assert paths["receipt"].exists()


@pytest.mark.skipif(not hasattr(os, "symlink"), reason="symlinks unavailable")
def test_reset_rejects_symlinked_archive_root_without_moving_sources(tmp_path: Path):
    paths = _project(tmp_path)
    plan = _plan(paths, tmp_path)
    outside = tmp_path / "outside-archive"
    outside.mkdir()
    archive_root = tmp_path / plan["archive_root"]
    archive_root.parent.mkdir(parents=True, exist_ok=True)
    try:
        archive_root.symlink_to(outside, target_is_directory=True)
    except OSError as error:
        pytest.skip(f"symlink creation unavailable: {error}")

    result = _apply(paths, plan, tmp_path)
    assert result.returncode != 0
    assert "Symbolic links are not accepted" in result.stderr or "real directory" in result.stderr
    assert not any(outside.iterdir())
    assert (paths["root"] / "spec-outline.md").exists()
    assert (paths["child"] / "implementation.ts").exists()
    assert not paths["receipt"].exists()


def test_reset_contract_is_documented_across_command_skill_and_reference_surfaces():
    command = (PROJECT_ROOT / "templates" / "commands" / "prd.md").read_text(encoding="utf-8")
    skill = (PROJECT_ROOT / "templates" / "skills" / "speccompass-review-data" / "SKILL.md").read_text(
        encoding="utf-8"
    )
    references = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (
            PROJECT_ROOT / "docs" / "reference" / "speccompass-product-requirements.zh-CN.md",
            PROJECT_ROOT / "docs" / "reference" / "sp-outline-boundary-adjustment-workflow.zh-CN.md",
            PROJECT_ROOT / "docs" / "reference" / "sp-project-methodology.md",
            PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md",
        )
    )

    for surface in (command, skill, references):
        assert "--discard-outline-draft" in surface
        assert "--regenerate-outline-draft" in surface
    for surface in (command, skill):
        assert "outline-draft-reset.json" in surface
        assert "code" in surface.lower()
        assert "delete" in surface.lower()
    assert "draft-project-" in command
    assert "draft-project-*" in skill
    assert "outline-draft-reset.json" in references
    assert "draft-project-*" in references
    assert "不能自动删除代码" in references
