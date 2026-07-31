"""Process-level tests for the self-contained SpecCompass review server."""

from __future__ import annotations

import http.client
import hashlib
import json
import os
import queue
import shutil
import signal
import socket
import subprocess
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

import pytest
import yaml
from typer.testing import CliRunner

from specify_cli import app


PROJECT_ROOT = Path(__file__).resolve().parent.parent
REVIEW_LAUNCHER = (
    PROJECT_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "review"
    / "scripts"
    / "serve-review.mjs"
)
ADOPTION_BOOTSTRAP = REVIEW_LAUNCHER.parent / "bootstrap-outline-boundaries.mjs"
ADOPTION_PREPARE = REVIEW_LAUNCHER.parent / "prepare-outline-boundary-adoption.mjs"
CONFIRMATION_PACKAGE = (
    PROJECT_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "review"
    / "renderer"
    / "scripts"
    / "confirmation-package.js"
)
DISCOVERY_RESPONSE_PACKAGE = (
    PROJECT_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "review"
    / "renderer"
    / "scripts"
    / "discovery-response-package.js"
)
WRITEBACK_CLIENT = (
    PROJECT_ROOT
    / "templates"
    / "project"
    / ".specify"
    / "review"
    / "renderer"
    / "scripts"
    / "writeback-client.js"
)

DISCOVERY_DISTRIBUTION_ASSETS = (
    Path("renderer/scripts/discovery-response-package.js"),
    Path("renderer/scripts/outline-discovery-renderer.js"),
    Path("schemas/outline-discovery-data.schema.json"),
    Path("schemas/outline-discovery-response.schema.json"),
    Path("schemas/outline-intent-ledger.schema.json"),
    Path("schemas/outline-boundaries.schema.json"),
    Path("schemas/outline-boundaries-adoption.schema.json"),
    Path("schemas/outline-draft-reset.schema.json"),
    Path("schemas/outline-adjustment-impact-preview.schema.json"),
    Path("schemas/outline-boundary-consumption-event.schema.json"),
    Path("schemas/outline-boundary-decision.schema.json"),
    Path("schemas/outline-boundary-writeback-event.schema.json"),
    Path("schemas/outline-transition-event.schema.json"),
    Path("schemas/outline-transition-evidence.schema.json"),
    Path("schemas/outline-transition-inventory.schema.json"),
    Path("schemas/outline-transition-proposal.schema.json"),
    Path("schemas/outline-transition-rollback.schema.json"),
    Path("schemas/outline-transition-staging-manifest.schema.json"),
    Path("schemas/outline-transition-staging-plan.schema.json"),
    Path("schemas/outline-transition-publication.schema.json"),
    Path("schemas/outline-transition-validation-report.schema.json"),
    Path("schemas/review-index.schema.json"),
    Path("scripts/apply-outline-discovery.mjs"),
    Path("scripts/activate-outline-baseline.mjs"),
    Path("scripts/activate-outline-boundary-adoption.mjs"),
    Path("scripts/advance-outline-transition.mjs"),
    Path("scripts/bootstrap-outline-boundaries.mjs"),
    Path("scripts/check-outline-boundary-gate.mjs"),
    Path("scripts/discard-outline-draft.mjs"),
    Path("scripts/reset-command-artifacts.mjs"),
    Path("scripts/migrate-review-index.mjs"),
    Path("scripts/outline-adoption-lib.mjs"),
    Path("scripts/outline-boundaries-lib.mjs"),
    Path("scripts/outline-draft-reset-lib.mjs"),
    Path("scripts/outline-adjustment-lib.mjs"),
    Path("scripts/outline-transition-artifact-lib.mjs"),
    Path("scripts/outline-transition-lock-lib.mjs"),
    Path("scripts/outline-transition-lock.mjs"),
    Path("scripts/outline-transition-workflow-lib.mjs"),
    Path("scripts/prepare-outline-adjustment.mjs"),
    Path("scripts/prepare-outline-boundary-adoption.mjs"),
    Path("scripts/prepare-outline-transition-artifacts.mjs"),
    Path("scripts/publish-outline-transition-artifacts.mjs"),
    Path("scripts/rollback-outline-transition.mjs"),
    Path("scripts/review-data-id.mjs"),
    Path("scripts/scan-outline-transition-impact.mjs"),
    Path("scripts/start-outline-transition.mjs"),
    Path("scripts/sync-review-index.mjs"),
    Path("scripts/validate-outline-boundaries.mjs"),
    Path("scripts/validate-outline-draft-reset.mjs"),
    Path("scripts/validate-review-index.mjs"),
)


REVIEW_DATA_PATHS = {
    "flow": "flows/review/flow-review-data.json",
    "ui": "ui/review/ui-review-data.json",
    "outline": "prd/review/outline-review-data.json",
    "outline-discovery": "prd/review/outline-discovery-data.json",
}


class ReviewProject:
    def __init__(self, root: Path, launcher: Path, feature: str) -> None:
        self.root = root
        self.launcher = launcher
        self.feature = feature

    def data_path(self, review_type: str) -> Path:
        return self.root / "specs" / self.feature / REVIEW_DATA_PATHS[review_type]


@pytest.fixture
def review_project(tmp_path: Path) -> ReviewProject:
    feature = "001-generic-review"
    launcher = tmp_path / ".specify" / "review" / "scripts" / "serve-review.mjs"
    launcher.parent.mkdir(parents=True)
    if REVIEW_LAUNCHER.exists():
        shutil.copy2(REVIEW_LAUNCHER, launcher)
    for dependency in (
        "outline-adoption-lib.mjs",
        "outline-adjustment-lib.mjs",
        "outline-boundaries-lib.mjs",
        "outline-transition-workflow-lib.mjs",
        "validate-review-index.mjs",
    ):
        shutil.copy2(REVIEW_LAUNCHER.parent / dependency, launcher.parent / dependency)

    renderer = (
        tmp_path
        / ".specify"
        / "review"
        / "renderer"
        / "speccompass-review-renderer.html"
    )
    renderer.parent.mkdir(parents=True)
    renderer.write_text(
        "<!doctype html><html><head><link rel=\"stylesheet\" href=\"styles/review.css\"></head>"
        "<body><script src=\"scripts/review.js\"></script></body></html>",
        encoding="utf-8",
    )
    (renderer.parent / "styles").mkdir()
    (renderer.parent / "styles" / "review.css").write_text("body { color: #111; }", encoding="utf-8")
    (renderer.parent / "scripts").mkdir()
    (renderer.parent / "scripts" / "review.js").write_text("window.reviewReady = true;", encoding="utf-8")
    (renderer.parent / "icons.svg").write_text("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>", encoding="utf-8")
    (renderer.parent / "pixel.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    (renderer.parent / "font.woff2").write_bytes(b"wOF2")
    (renderer.parent / "notes.txt").write_text("review notes", encoding="utf-8")

    project = ReviewProject(tmp_path, launcher, feature)
    common = {
        "confirm_strategy": "batch",
        "batch_id": "REVIEW-BATCH-001",
        "project": {
            "name": "Review fixture",
            "feature": feature,
            "business_overview": "A realistic business overview for local review writer tests.",
            "review_goal": "Verify one source-backed decision and preserve its reviewer feedback.",
        },
        "source_snapshot": [{"path": f"specs/{feature}/spec.md", "anchors": ["FR-001"]}],
    }
    for review_type in ("flow", "ui", "outline"):
        data_path = project.data_path(review_type)
        data_path.parent.mkdir(parents=True, exist_ok=True)
        item_key = {"flow": "diagrams", "ui": "screens", "outline": "views"}[review_type]
        item = {
            "id": f"{review_type}-item-1",
            "title": f"{review_type.title()} item",
            "summary": "One review item with a stable decision target.",
            "nodes": [
                {
                    "id": "node-1",
                    "label": "Choose the supported route",
                    "options": [
                        {"id": "OPTION_A", "label": "Use the supported route", "next_exit": "continue"},
                        {"id": "OPTION_B", "label": "Request a revision", "next_exit": "needs-decision:owner"},
                    ],
                }
            ],
        }
        if review_type == "outline":
            item.update({"source_path": f"specs/{feature}/spec-outline.md", "view_type": "intent_map"})
        payload = {
            **common,
            "schema_version": 2,
            "review_type": review_type,
            "artifact_path": f"specs/{feature}/{REVIEW_DATA_PATHS[review_type]}",
            "modules": [
                {
                    "id": "module-1",
                    "title": "Primary module",
                    "summary": "The primary module used by the local writer test fixture.",
                    item_key: [item],
                }
            ],
        }
        if review_type == "outline":
            payload.update(
                {
                    "outline_source_path": f"specs/{feature}/spec-outline.md",
                    "outline_digest": "a" * 64,
                    "source_authority_ids": ["prd-v3"],
                }
            )
        data_path.write_text(
            json.dumps(payload),
            encoding="utf-8",
        )

    discovery_path = project.data_path("outline-discovery")
    discovery_path.parent.mkdir(parents=True, exist_ok=True)
    discovery_path.write_text(
        json.dumps(
            {
                "schema_version": 3,
                "review_type": "outline_discovery",
                "interaction_mode": "discovery",
                "artifact_path": f"specs/{feature}/{REVIEW_DATA_PATHS['outline-discovery']}",
                "outline_maturity": "explore",
                "batch_id": "DISCOVERY-BATCH-001",
                "authorization_effect": "none",
                "next_route": "/sp.prd",
                "project": common["project"],
                "source_snapshot": common["source_snapshot"],
                "question_groups": [
                    {
                        "id": "group-1",
                        "questions": [
                            {
                                "id": "question-1",
                                "outline_node_id": "outline-node-1",
                                "target_kind": "goal",
                                "allow_none_of_the_above": True,
                                "free_input": {
                                    "enabled": True,
                                    "allowed_operations": [
                                        "confirm_candidate",
                                        "add",
                                        "replace",
                                        "exclude",
                                        "context_note",
                                    ],
                                },
                                "candidates": [
                                    {"id": "candidate-1", "value": "Keep the source-backed goal"},
                                    {"id": "candidate-2", "value": "Use a narrower goal"},
                                ],
                            }
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    return project


def _launcher_command(project: ReviewProject, review_type: str = "flow", *extra: str) -> list[str]:
    return ["node", str(project.launcher), f"--{review_type}", project.feature, *extra]


def _wait_for_ready_url(process: subprocess.Popen[str], timeout: float = 8.0) -> str:
    assert process.stdout is not None
    lines: queue.Queue[str | None] = queue.Queue()

    def read_stdout() -> None:
        try:
            for line in process.stdout:
                lines.put(line)
        finally:
            lines.put(None)

    threading.Thread(target=read_stdout, daemon=True).start()
    deadline = time.monotonic() + timeout
    output: list[str] = []
    while time.monotonic() < deadline:
        try:
            remaining = max(0.0, deadline - time.monotonic())
            line = lines.get(timeout=min(0.1, remaining))
        except queue.Empty:
            continue

        if line is None:
            try:
                process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                pytest.fail(
                    "launcher output closed before readiness while process was still running\n"
                    f"output: {''.join(output)}"
                )
            pytest.fail(
                f"launcher exited before readiness ({process.returncode})\n"
                f"output: {''.join(output)}"
            )

        output.append(line)
        if line.startswith("SPECCOMPASS_REVIEW_URL="):
            return line.strip().split("=", 1)[1]

    pytest.fail(f"launcher did not become ready\noutput: {''.join(output)}")


@contextmanager
def _running_launcher(project: ReviewProject, review_type: str = "flow", host: str | None = None):
    extra = ["--host", host] if host else []
    process = subprocess.Popen(
        _launcher_command(project, review_type, *extra),
        cwd=project.root,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
    )
    try:
        yield process, _wait_for_ready_url(process)
    finally:
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=5)


def _http_request(url: str, method: str = "GET"):
    return urlopen(Request(url, method=method), timeout=3)


def _connection_for(url: str) -> tuple[http.client.HTTPConnection, str]:
    parsed = urlsplit(url)
    connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=3)
    path = parsed.path + (f"?{parsed.query}" if parsed.query else "")
    return connection, path


def _review_data_id(value: object) -> str:
    def canonicalize(item: object) -> object:
        if isinstance(item, list):
            return [canonicalize(entry) for entry in item]
        if isinstance(item, dict):
            return {key: canonicalize(item[key]) for key in sorted(item)}
        return item

    text = json.dumps(canonicalize(value), ensure_ascii=False, separators=(",", ":"))
    hash_value = 2166136261
    for character in text:
        code_point = ord(character)
        if code_point <= 0xFFFF:
            units = (code_point,)
        else:
            adjusted = code_point - 0x10000
            units = (0xD800 + (adjusted >> 10), 0xDC00 + (adjusted & 0x3FF))
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


def _contract_digest(value: dict[str, object], digest_field: str) -> str:
    payload = {key: item for key, item in value.items() if key != digest_field}
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _browser_normalized_review_data(value: dict[str, object]) -> dict[str, object]:
    normalized = json.loads(json.dumps(value))
    if normalized.get("schema_version") != 1 or normalized.get("review_type") not in {"flow", "ui"}:
        return normalized
    item_key = "screens" if normalized["review_type"] == "ui" else "diagrams"
    for module in normalized.get("modules", []):
        for item in module.get(item_key, []):
            for node in item.get("nodes", []):
                if node.get("recommended_option") or node.get("options") or node.get("review_level") == "must_confirm":
                    node["confirmation_priority"] = "normal"
    return normalized


def _writer_config(ready_url: str) -> tuple[str, dict[str, object]]:
    parsed = urlsplit(ready_url)
    origin = f"http://{parsed.hostname}:{parsed.port}"
    with _http_request(f"{origin}/__speccompass/writeback-config") as response:
        return origin, json.loads(response.read())


def _post_writeback(
    origin: str,
    config: dict[str, object],
    payload: object,
    *,
    token: str | None = None,
    request_origin: str | None = None,
    content_type: str = "application/json",
) -> tuple[int, bytes]:
    parsed = urlsplit(origin)
    if isinstance(payload, dict):
        payload.setdefault("expected_target_version", config["target_version"])
    body = json.dumps(payload).encode("utf-8")
    connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=5)
    headers = {
        "Content-Type": content_type,
        "Origin": request_origin if request_origin is not None else origin,
        "X-SpecCompass-Writeback-Token": token if token is not None else str(config["token"]),
    }
    connection.request("POST", str(config["endpoint"]), body=body, headers=headers)
    response = connection.getresponse()
    response_body = response.read()
    status = response.status
    connection.close()
    return status, response_body


def _confirmation_payload(project: ReviewProject, review_type: str = "flow") -> dict[str, object]:
    review_data = _browser_normalized_review_data(
        json.loads(project.data_path(review_type).read_text(encoding="utf-8"))
    )
    source_path = f"specs/{project.feature}/{REVIEW_DATA_PATHS[review_type]}"
    target_path = {
        "flow": f"specs/{project.feature}/flows/review/flow-confirmation.md",
        "ui": f"specs/{project.feature}/ui/review/ui-confirmation.md",
        "outline": f"specs/{project.feature}/prd/review/outline-confirmation.md",
    }[review_type]
    item_id = f"{review_type}-item-1"
    record = {
        "target_ref": f"module-1:{item_id}:node-1",
        "target_label": "Primary module / item / node",
        "module_id": "module-1",
        "module_title": "Primary module",
        "item_id": item_id,
        "node_id": "node-1",
        "bucket": "decision_recorded_items",
        "status": "SAVED_RECOMMENDED",
        "authorization_state": "AUTHORIZED",
        "is_authorized_decision": True,
        "selected_option": "OPTION_A",
        "next_exit": "continue",
        "revision_request": None,
    }
    part = {
        "format": "speccompass-confirmation-package",
        "version": 1,
        "schema_version": review_data["schema_version"],
        "review_type": review_type,
        "package_session_id": "session-001",
        "batch_id": review_data["batch_id"],
        "review_data_id": _review_data_id(review_data),
        "source_review_data": source_path,
        "target_path": target_path,
        "total_record_count": 1,
        "part_count": 1,
        "part_index": 1,
        "part_record_count": 1,
        "modules": [{"module_id": "module-1", "module_title": "Primary module", "records": [record]}],
    }
    if review_type == "outline":
        part.update(
            {
                "outline_digest": review_data["outline_digest"],
                "source_authority_ids": review_data["source_authority_ids"],
            }
        )
    return {"kind": "confirmation", "review_data_id": _review_data_id(review_data), "parts": [part]}


def _discovery_payload(project: ReviewProject) -> dict[str, object]:
    review_data = json.loads(project.data_path("outline-discovery").read_text(encoding="utf-8"))
    response = {
        "schema_version": 3,
        "format": "speccompass-outline-discovery-response",
        "response_id": "discovery-response-001",
        "review_type": "outline_discovery",
        "batch_id": review_data["batch_id"],
        "feature": project.feature,
        "outline_maturity": review_data["outline_maturity"],
        "source_review_data": f"specs/{project.feature}/{REVIEW_DATA_PATHS['outline-discovery']}",
        "authorization_effect": "none",
        "next_route": "/sp.prd",
        "generated_at": "2026-07-25T00:00:00Z",
        "deltas": [
            {
                "delta_id": "discovery-response-001-delta-001",
                "question_id": "question-1",
                "outline_node_id": "outline-node-1",
                "target_kind": "goal",
                "operation": "confirm_candidate",
                "candidate_id": "candidate-1",
                "target_id": None,
                "value": "Keep the source-backed goal",
                "source_tag": "user-confirmed",
                "none_of_the_above": False,
                "supersedes_delta_id": None,
            }
        ],
    }
    return {"kind": "outline_discovery", "review_data_id": _review_data_id(review_data), "response": response}


def test_launcher_template_exists():
    assert REVIEW_LAUNCHER.is_file()


def test_launcher_is_distributed_and_force_refresh_preserves_project_content(tmp_path: Path):
    project = tmp_path / "generated-project"
    runner = CliRunner()
    init_args = [
        "init",
        str(project),
        "--ai",
        "claude",
        "--ignore-agent-tools",
        "--no-git",
        "--script",
        "sh",
    ]

    first_init = runner.invoke(app, init_args)
    assert first_init.exit_code == 0, first_init.output

    installed_launcher = project / ".specify" / "review" / "scripts" / "serve-review.mjs"
    assert installed_launcher.read_bytes() == REVIEW_LAUNCHER.read_bytes()

    source_review_root = PROJECT_ROOT / "templates" / "project" / ".specify" / "review"
    installed_review_root = project / ".specify" / "review"
    for relative_path in DISCOVERY_DISTRIBUTION_ASSETS:
        assert (installed_review_root / relative_path).read_bytes() == (
            source_review_root / relative_path
        ).read_bytes()

    installed_launcher.write_text("// stale launcher\n", encoding="utf-8")
    for relative_path in DISCOVERY_DISTRIBUTION_ASSETS:
        (installed_review_root / relative_path).write_text(
            "stale Discovery asset\n",
            encoding="utf-8",
        )
    project_marker = project / "specs" / "001-existing" / "project-marker.txt"
    project_marker.parent.mkdir(parents=True)
    project_marker.write_text("keep project content\n", encoding="utf-8")

    refreshed = runner.invoke(app, [*init_args, "--force"])
    assert refreshed.exit_code == 0, refreshed.output
    assert installed_launcher.read_bytes() == REVIEW_LAUNCHER.read_bytes()
    for relative_path in DISCOVERY_DISTRIBUTION_ASSETS:
        assert (installed_review_root / relative_path).read_bytes() == (
            source_review_root / relative_path
        ).read_bytes()
    assert project_marker.read_text(encoding="utf-8") == "keep project content\n"


@pytest.mark.parametrize(
    "args",
    (
        (),
        ("--flow", "feature", "--ui", "feature"),
        ("--flow", "feature", "--outline", "feature"),
        ("--ui", "feature", "--outline", "feature"),
        ("--flow", "feature", "--ui", "feature", "--outline", "feature"),
        ("--outline", "feature", "--outline-discovery", "feature"),
        ("--flow", "../feature"),
        ("--flow", ".hidden"),
        ("--flow", "feature..next"),
        ("--flow", "feature", "--port", "-1"),
        ("--flow", "feature", "--port", "65536"),
        ("--flow", "feature", "--port", "1.5"),
        ("--unknown", "feature"),
    ),
)
def test_launcher_rejects_invalid_arguments(review_project: ReviewProject, args: tuple[str, ...]):
    result = subprocess.run(
        ["node", str(review_project.launcher), *args],
        cwd=review_project.root,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
    )

    assert result.returncode != 0
    assert "SPECCOMPASS_REVIEW_URL=" not in result.stdout


@pytest.mark.parametrize("review_type", ("flow", "ui", "outline", "outline-discovery"))
@pytest.mark.parametrize("missing", ("renderer", "data"))
def test_launcher_does_not_become_ready_when_required_file_is_missing(
    review_project: ReviewProject, missing: str, review_type: str
):
    if missing == "renderer":
        (
            review_project.root
            / ".specify"
            / "review"
            / "renderer"
            / "speccompass-review-renderer.html"
        ).unlink()
    else:
        review_project.data_path(review_type).unlink()

    result = subprocess.run(
        _launcher_command(review_project, review_type),
        cwd=review_project.root,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
        timeout=10,
    )

    assert result.returncode != 0
    assert "SPECCOMPASS_REVIEW_URL=" not in result.stdout


@pytest.mark.parametrize("review_type", ("flow", "ui", "outline", "outline-discovery"))
def test_launcher_emits_matching_url_after_http_self_checks(
    review_project: ReviewProject, review_type: str
):
    with _running_launcher(review_project, review_type) as (process, ready_url):
        parsed = urlsplit(ready_url)
        assert process.poll() is None
        assert parsed.scheme == "http"
        assert parsed.hostname == "127.0.0.1"
        assert parsed.port and parsed.port > 0
        assert parsed.path == "/.specify/review/renderer/speccompass-review-renderer.html"
        assert parsed.query == f"{review_type}={review_project.feature}"
        with _http_request(ready_url) as response:
            assert response.status == 200
        data_url = (
            f"http://127.0.0.1:{parsed.port}/specs/{review_project.feature}/"
            + REVIEW_DATA_PATHS[review_type]
        )
        with _http_request(data_url) as response:
            assert response.status == 200


def test_launcher_accepts_explicit_loopback_host(review_project: ReviewProject):
    with _running_launcher(review_project, host="127.0.0.1") as (_, ready_url):
        assert urlsplit(ready_url).hostname == "127.0.0.1"


def test_launcher_accepts_explicit_private_lan_host_when_address_is_available(
    review_project: ReviewProject,
):
    probe = socket.socket()
    try:
        probe.bind(("10.0.0.209", 0))
    except OSError:
        pytest.skip("10.0.0.209 is not assigned on this test host")
    finally:
        probe.close()

    with _running_launcher(review_project, host="10.0.0.209") as (process, ready_url):
        parsed = urlsplit(ready_url)
        assert parsed.hostname == "10.0.0.209"
        assert process.poll() is None
        with _http_request(ready_url) as response:
            assert response.status == 200
        origin, config = _writer_config(ready_url)
        status, body = _post_writeback(origin, config, _confirmation_payload(review_project))
        assert status == 200, body.decode("utf-8")
        assert (
            review_project.root
            / "specs"
            / review_project.feature
            / "flows"
            / "review"
            / "flow-confirmation.md"
        ).is_file()


@pytest.mark.parametrize("host", ("0.0.0.0", "8.8.8.8", "172.15.0.1", "192.167.1.1", "localhost"))
def test_launcher_rejects_non_private_host(review_project: ReviewProject, host: str):
    result = subprocess.run(
        _launcher_command(review_project, "flow", "--host", host),
        cwd=review_project.root,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
        timeout=10,
    )
    assert result.returncode != 0
    assert "RFC1918" in (result.stdout + result.stderr)
    assert "SPECCOMPASS_REVIEW_URL=" not in result.stdout


def test_confirmation_package_rejects_unknown_type_and_repeats_outline_identity():
    if shutil.which("node") is None:
        pytest.skip("node is required for confirmation package tests")

    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(CONFIRMATION_PACKAGE))}, "utf8");
const context = {{ window: {{}}, console, TextEncoder }};
vm.createContext(context);
vm.runInContext(source, context);
const api = context.window.SpecCompassConfirmationPackage;

for (const reviewType of ["unknown", "", null]) {{
  try {{
    api.splitConfirmationPackage({{ review_type: reviewType, modules: [] }});
    throw new Error(`unsupported review type was accepted: ${{reviewType}}`);
  }} catch (error) {{
    if (!String(error.message || error).includes("review_type")) throw error;
  }}
}}

const normalizedDigestParts = api.splitConfirmationPackage({{
  review_type: "outline",
  schema_version: 2,
  review_data_id: "outline-review-data-v1",
  outline_digest: "sha256:" + "A".repeat(64),
  source_authority_ids: ["prd-v3"],
  source_review_data: "specs/001-test/prd/review/outline-review-data.json",
  modules: []
}});
if (normalizedDigestParts.length !== 1 || normalizedDigestParts[0].outline_digest !== {json.dumps("a" * 64)}) {{
  throw new Error("outline digest was not normalized to canonical lowercase hex");
}}

try {{
  api.splitConfirmationPackage({{
    review_type: "outline",
    schema_version: 2,
    review_data_id: "outline-review-data-v1",
    outline_digest: {json.dumps("a" * 64)},
    source_authority_ids: ["prd-v3"],
    source_review_data: "specs/001-test/prd/review/outline-review-data.json",
    target_path: "specs/001-test/flows/review/flow-confirmation.md",
    modules: []
  }});
  throw new Error("outline package accepted a Flow confirmation target");
}} catch (error) {{
  if (!String(error.message || error).includes("target_path")) throw error;
}}

const records = Array.from({{ length: 35 }}, (_, index) => ({{
  target_ref: `outline-view:node-${{index}}`,
  target_label: `Outline decision ${{index}}`,
  selected_option: "OPTION_A",
  reviewer_note: "identity-preserving package content ".repeat(90)
}}));
const parts = api.splitConfirmationPackage({{
  review_type: "outline",
  schema_version: 2,
  batch_id: "OUTLINE-BATCH-TEST",
  review_data_id: "outline-review-data-v1",
  outline_digest: {json.dumps("a" * 64)},
  source_authority_ids: ["prd-v3", "research-v2"],
  source_review_data: "specs/001-test/prd/review/outline-review-data.json",
  modules: [{{ module_id: "outline", module_title: "Outline", records }}]
}}, 30000);
if (parts.length < 2) throw new Error("expected an outline multipart package");
for (const part of parts) {{
  if (part.version !== 1) throw new Error("confirmation package format version changed");
  if (part.schema_version !== 2) throw new Error("review data schema version was lost");
  if (part.review_type !== "outline") throw new Error("outline review type was lost");
  if (part.review_data_id !== "outline-review-data-v1") throw new Error("review_data_id was not repeated");
  if (part.outline_digest !== {json.dumps("a" * 64)}) throw new Error("outline_digest was not repeated");
  if (JSON.stringify(part.source_authority_ids) !== JSON.stringify(["prd-v3", "research-v2"])) {{
    throw new Error("source_authority_ids were not repeated");
  }}
  if (part.target_path !== "specs/001-test/prd/review/outline-confirmation.md") {{
    throw new Error(`bad outline target: ${{part.target_path}}`);
  }}
}}
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        cwd=PROJECT_ROOT,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


def test_discovery_and_confirmation_packages_are_type_isolated_and_non_authorizing():
    if shutil.which("node") is None:
        pytest.skip("node is required for response package tests")

    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const confirmationSource = fs.readFileSync({json.dumps(str(CONFIRMATION_PACKAGE))}, "utf8");
const discoverySource = fs.readFileSync({json.dumps(str(DISCOVERY_RESPONSE_PACKAGE))}, "utf8");
const context = {{ window: {{}}, console, TextEncoder }};
vm.createContext(context);
vm.runInContext(confirmationSource, context);
vm.runInContext(discoverySource, context);
const confirmation = context.window.SpecCompassConfirmationPackage;
const discovery = context.window.SpecCompassDiscoveryResponsePackage;

try {{
  confirmation.splitConfirmationPackage({{ review_type: "outline_discovery", modules: [] }});
  throw new Error("confirmation package accepted discovery data");
}} catch (error) {{
  if (!String(error.message || error).includes("review_type")) throw error;
}}

const reviewData = {{
  schema_version: 3,
  review_type: "outline_discovery",
  interaction_mode: "discovery",
  artifact_path: "specs/001-test/prd/review/outline-discovery-data.json",
  outline_maturity: "explore",
  batch_id: "DISCOVERY-001",
  authorization_effect: "none",
  next_route: "/sp.prd",
  project: {{ feature: "001-test" }},
  question_groups: [{{
    id: "group-1",
    map_id: "map-branch",
    questions: Array.from({{ length: 5 }}, (_, index) => ({{
      id: `question-${{index + 1}}`,
      outline_node_id: `node-${{index + 1}}`,
      target_kind: ["goal", "user", "problem", "scope", "context"][index],
      selection_mode: "single",
      allow_none_of_the_above: true,
      free_input: {{ enabled: true, allowed_operations: ["confirm_candidate", "add", "replace", "exclude", "context_note"] }},
      candidates: [
        {{ id: `candidate-${{index + 1}}-a`, value: `候选 ${{index + 1}}A` }},
        {{ id: `candidate-${{index + 1}}-b`, value: `候选 ${{index + 1}}B` }}
      ],
      recommended_candidate_ids: [`candidate-${{index + 1}}-a`],
      recommendation_reason: "当前来源支持先选择候选 A 继续收敛。"
    }}))
  }}]
}};

try {{
  discovery.buildDiscoveryResponse({{ review_data: {{ ...reviewData, review_type: "outline" }}, responses: [] }});
  throw new Error("discovery package accepted confirmation data");
}} catch (error) {{
  if (!String(error.message || error).includes("outline_discovery")) throw error;
}}

try {{
  discovery.buildDiscoveryResponse({{ review_data: reviewData, responses: [] }});
  throw new Error("empty discovery response was accepted");
}} catch (error) {{
  if (!String(error.message || error).includes("at least one")) throw error;
}}

const operations = ["confirm_candidate", "add", "replace", "exclude", "context_note"];
const responses = operations.map((operation, index) => ({{
  question_id: `question-${{index + 1}}`,
  operation,
  candidate_id: operation === "confirm_candidate" || operation === "exclude" ? `candidate-${{index + 1}}-a` : null,
  target_id: operation === "replace" ? "existing-scope" : null,
  value: operation === "confirm_candidate" ? "" : `用户输入 ${{index + 1}}`,
  none_of_the_above: operation === "add"
}}));
const response = discovery.buildDiscoveryResponse({{ review_data: reviewData, responses }});
if (response.format !== "speccompass-outline-discovery-response") throw new Error("wrong discovery format");
if (response.authorization_effect !== "none") throw new Error("discovery became authorizing");
if (response.next_route !== "/sp.prd") throw new Error("wrong discovery next route");
if (response.deltas.length !== 5) throw new Error("five operations were not preserved");
if (JSON.stringify(response.deltas.map((delta) => delta.operation)) !== JSON.stringify(operations)) {{
  throw new Error("operation order or identity changed");
}}
if (response.deltas[0].source_tag !== "user-confirmed") throw new Error("confirmed candidate provenance was lost");
if (response.deltas.slice(1).some((delta) => delta.source_tag !== "user")) throw new Error("user provenance was lost");
if (!response.deltas[1].none_of_the_above) throw new Error("none-of-the-above was lost");

const fallbackData = structuredClone(reviewData);
delete fallbackData.question_groups[0].questions[4].target_kind;
const fallback = discovery.buildDiscoveryResponse({{
  review_data: fallbackData,
  responses: [responses[4]]
}});
if (fallback.deltas[0].target_kind !== "context") throw new Error("target_kind fallback was not applied");

for (const [label, invalidResponse] of [
  ["confirm-none", {{ ...responses[0], none_of_the_above: true }}],
  ["add-candidate", {{ ...responses[1], candidate_id: "candidate-2-a" }}],
  ["replace-without-target", {{ ...responses[2], target_id: null }}],
  ["exclude-two-targets", {{ ...responses[3], target_id: "existing-scope" }}],
  ["context-with-target", {{ ...responses[4], target_id: "existing-context" }}]
]) {{
  try {{
    discovery.buildDiscoveryResponse({{ review_data: reviewData, responses: [invalidResponse] }});
    throw new Error(`${{label}} was accepted`);
  }} catch (error) {{
    if (!String(error.message || error).includes("operation")) throw error;
  }}
}}

try {{
  discovery.buildDiscoveryResponse({{
    review_data: reviewData,
    responses: [{{ question_id: "question-1", operation: "confirm_candidate", candidate_id: "unknown" }}]
  }});
  throw new Error("unknown candidate was accepted");
}} catch (error) {{
  if (!String(error.message || error).includes("candidate_id")) throw error;
}}
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        cwd=PROJECT_ROOT,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


@pytest.mark.parametrize("review_type", ("flow", "ui", "outline"))
def test_local_writer_records_confirmation_at_fixed_target(
    review_project: ReviewProject, review_type: str
):
    target = review_project.root / {
        "flow": f"specs/{review_project.feature}/flows/review/flow-confirmation.md",
        "ui": f"specs/{review_project.feature}/ui/review/ui-confirmation.md",
        "outline": f"specs/{review_project.feature}/prd/review/outline-confirmation.md",
    }[review_type]
    target.write_text("old confirmation\n", encoding="utf-8")
    with _running_launcher(review_project, review_type) as (_, ready_url):
        origin, config = _writer_config(ready_url)
        assert config["review_type"] == review_type
        assert str(config["target_path"]).startswith(f"specs/{review_project.feature}/")

        assert target == review_project.root / str(config["target_path"])
        status, body = _post_writeback(origin, config, _confirmation_payload(review_project, review_type))

        assert status == 200, body.decode("utf-8")
        result = json.loads(body)
        assert result["target_path"] == config["target_path"]
        owning_command = {"flow": "/sp.flow", "ui": "/sp.ui", "outline": "/sp.prd"}[review_type]
        assert result["next_command"] == f"{owning_command} {review_project.feature} --consume-review-confirmation"
        confirmation = target.read_text(encoding="utf-8")
        assert "No model interpretation was performed during writeback." in confirmation
        assert "--consume-review-confirmation" in confirmation
        assert "without clearing or regenerating" in confirmation
        frontmatter = yaml.safe_load(confirmation.split("---", 2)[1])
        assert frontmatter["human_confirmation"] == "CONFIRMED"
        assert frontmatter["review_data_identity_verified"] == "MATCH"
        assert frontmatter["source_hash_verified"] == "NOT_CHECKED"
        assert frontmatter["authorization_scope"] == {
            "flow": "READY_FOR_UI",
            "ui": "READY_FOR_PLAN",
            "outline": "READY_FOR_SPECIFY",
        }[review_type]
        assert frontmatter["decision_records"][0]["selected_option"] == "OPTION_A"
        assert not list(target.parent.glob(f"{target.name}.tmp-*"))
        assert not target.with_name(f"{target.name}.speccompass-writeback.lock").exists()


def test_outline_boundary_writer_injects_identity_receipt_and_append_only_ledger(review_project: ReviewProject):
    feature = review_project.feature
    feature_root = review_project.root / "specs" / feature
    proposal_id = "baseline-002"
    draft = feature_root / "boundary-adjustments" / "drafts" / proposal_id
    draft.mkdir(parents=True)
    boundary = {
        "order": 1,
        "feature_code": "001",
        "feature": feature,
        "title": "Review fixture",
        "parent_feature_code": None,
        "sibling_order": 0,
        "outline_node_id": "boundary-001",
        "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Fixture root."},
        "lifecycle": "active",
        "predecessor_codes": [],
    }
    baseline = {
        "baseline_id": "baseline-001",
        "baseline_digest": "",
        "created_at": "2026-07-28T00:00:00.000Z",
        "created_by": "test-suite",
        "decision_ref": f"specs/{feature}/prd.md#decision-001",
        "project_boundaries": [boundary],
        "tombstones": [],
    }
    baseline["baseline_digest"] = _contract_digest(baseline, "baseline_digest")
    boundaries = {
        "schema_version": 1,
        "root_feature": feature,
        "updated_at": "2026-07-28T00:00:00.000Z",
        "transition_state": "ALIGNED",
        "current_baseline": baseline,
        "proposed_baseline": None,
        "transition": None,
    }
    (feature_root / "outline-boundaries.json").write_text(json.dumps(boundaries), encoding="utf-8")
    decision_ref = f"specs/{feature}/boundary-adjustments/drafts/{proposal_id}/decision.json"
    proposed_boundary = json.loads(json.dumps(boundary))
    proposed_boundary["title"] = "Review fixture renamed"
    proposal_input = {
        "schema_version": 1,
        "base_baseline_id": baseline["baseline_id"],
        "base_baseline_digest": baseline["baseline_digest"],
        "baseline_id": proposal_id,
        "created_at": "2026-07-28T01:00:00.000Z",
        "created_by": "test-suite",
        "decision_ref": decision_ref,
        "change_reason": "Confirm a reviewed metadata adjustment.",
        "rollback_ref": f"specs/{feature}/prd.md#rollback-002",
        "project_boundaries": [proposed_boundary],
        "tombstones": [],
    }
    (draft / "proposal.json").write_text(json.dumps(proposal_input), encoding="utf-8")
    proposal = {
        "baseline_id": proposal_id,
        "proposal_digest": "",
        "base_baseline_id": baseline["baseline_id"],
        "base_baseline_digest": baseline["baseline_digest"],
        "created_at": proposal_input["created_at"],
        "created_by": proposal_input["created_by"],
        "decision_ref": decision_ref,
        "change_reason": proposal_input["change_reason"],
        "project_boundaries": [proposed_boundary],
        "tombstones": [],
    }
    proposal["proposal_digest"] = _contract_digest(proposal, "proposal_digest")
    preview = {
        "schema_version": 1,
        "proposal_id": proposal_id,
        "proposal_digest": proposal["proposal_digest"],
        "base_baseline_id": baseline["baseline_id"],
        "base_baseline_digest": baseline["baseline_digest"],
        "generated_at": "2026-07-28T01:01:00.000Z",
        "change_class": "METADATA",
        "affected_feature_codes": ["001"],
        "artifact_inventory_digest": _contract_digest({"artifacts": [], "digest": ""}, "digest"),
        "artifacts": [],
        "impact_preview_digest": "",
    }
    preview["impact_preview_digest"] = _contract_digest(preview, "impact_preview_digest")
    (draft / "impact-preview.json").write_text(json.dumps(preview), encoding="utf-8")

    review_data = json.loads(review_project.data_path("outline").read_text(encoding="utf-8"))
    node = review_data["modules"][0]["views"][0]["nodes"][0]
    node.update(
        {
            "review_level": "must_confirm",
            "confirmation_priority": "critical",
            "options": [
                {"id": "OPTION_A", "label": "Confirm", "next_exit": "confirm-outline-boundary-adjustment"},
                {"id": "OPTION_B", "label": "Revise", "next_exit": "needs-decision:revise-outline-boundary-adjustment"},
                {"id": "OPTION_C", "label": "Reject", "next_exit": "reject-outline-boundary-adjustment"},
            ],
        }
    )
    target_ref = "module-1:outline-item-1:node-1"
    review_data["boundary_adjustment"] = {
        "proposal_id": proposal_id,
        "proposal_digest": proposal["proposal_digest"],
        "base_baseline_id": baseline["baseline_id"],
        "base_baseline_digest": baseline["baseline_digest"],
        "impact_preview_digest": preview["impact_preview_digest"],
        "initiated_by": "model",
        "change_class": "METADATA",
        "affected_feature_codes": ["001"],
        "proposal_path": f"specs/{feature}/boundary-adjustments/drafts/{proposal_id}/proposal.json",
        "impact_preview_path": f"specs/{feature}/boundary-adjustments/drafts/{proposal_id}/impact-preview.json",
        "decision_path": decision_ref,
        "writer_ledger_path": f"specs/{feature}/boundary-adjustments/writeback-ledger.jsonl",
        "decision_target_ref": target_ref,
    }
    review_project.data_path("outline").write_text(json.dumps(review_data), encoding="utf-8")

    with _running_launcher(review_project, "outline") as (_, ready_url):
        origin, config = _writer_config(ready_url)
        assert config["authorization_mode"] == "outline_boundary_human_decision"
        assert config["target_path"] == decision_ref
        assert config["fallback_authorizes_transition"] is False
        payload = _confirmation_payload(review_project, "outline")
        payload["parts"][0]["target_path"] = decision_ref
        status, body = _post_writeback(origin, config, payload)
        assert status == 200, body.decode("utf-8")
        result = json.loads(body)
        assert result["decision"] == "CONFIRMED"
        assert result["fallback_authorizes_transition"] is False
        replay_status, replay_body = _post_writeback(origin, config, payload)
        assert replay_status == 200, replay_body.decode("utf-8")
        assert json.loads(replay_body)["idempotent_replay"] is True
        conflicting = json.loads(json.dumps(payload))
        conflicting["parts"][0]["modules"][0]["records"][0]["revision_request"] = "conflicting replay"
        conflict_status, conflict_body = _post_writeback(origin, config, conflicting)
        assert conflict_status == 409
        assert json.loads(conflict_body)["error"]["code"] == "REQUEST_ID_REUSED"

    decision = json.loads((draft / "decision.json").read_text(encoding="utf-8"))
    assert decision["confirmed_by"]["type"] == "human"
    assert decision["source"]["kind"] == "speccompass_loopback_writer"
    assert decision["source"]["review_data_id"] == _review_data_id(review_data)
    assert len(decision["receipt"]["receipt_id"]) == 64
    assert decision["decision_digest"] == _contract_digest(decision, "decision_digest")
    ledger = (feature_root / "boundary-adjustments" / "writeback-ledger.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(ledger) == 1
    event = json.loads(ledger[0])
    assert event["receipt_id"] == decision["receipt"]["receipt_id"]
    assert event["decision_digest"] == decision["decision_digest"]


def test_outline_boundary_adoption_uses_same_human_loopback_writer(review_project: ReviewProject):
    feature = review_project.feature
    feature_root = review_project.root / "specs" / feature
    (feature_root / "prd.md").write_text("# Existing PRD\n", encoding="utf-8")
    (feature_root / "spec-outline.md").write_text("# Existing Outline\n\n- boundary-root\n", encoding="utf-8")
    index = {
        "schema_version": 2,
        "project": "Review fixture",
        "updated_at": "2026-07-29",
        "hierarchy": {"mode": "explicit", "root_feature": feature},
        "features": [
            {
                "order": 1,
                "feature_code": "001",
                "feature": feature,
                "title": "Review fixture",
                "parent_feature": None,
                "sibling_order": 0,
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Existing project root."},
                "outline_alignment": {
                    "status": "one_to_one",
                    "outline_node_refs": ["boundary-root"],
                    "rationale": "Existing Outline mapping.",
                },
                "has_flow_review": False,
                "has_ui_review": False,
                "has_outline_review": True,
                "has_outline_discovery": False,
            }
        ],
    }
    index_path = review_project.root / "specs" / "review-index.json"
    index_path.write_text(json.dumps(index), encoding="utf-8")
    report_path = feature_root / "outline-boundaries-adoption.json"
    bootstrap = subprocess.run(
        ["node", str(ADOPTION_BOOTSTRAP), str(index_path), str(report_path), "--root", feature],
        cwd=review_project.root,
        text=True,
        capture_output=True,
        check=False,
    )
    assert bootstrap.returncode == 0, bootstrap.stderr

    proposal_id = "baseline-adoption-review"
    draft = feature_root / "boundary-adjustments" / "drafts" / proposal_id
    draft.mkdir(parents=True)
    decision_ref = f"specs/{feature}/boundary-adjustments/drafts/{proposal_id}/decision.json"
    proposal_input = {
        "schema_version": 1,
        "base_baseline_id": None,
        "base_baseline_digest": None,
        "baseline_id": proposal_id,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "created_by": "model:adoption-review",
        "decision_ref": decision_ref,
        "change_reason": "Adopt the existing reviewed project shape.",
        "rollback_ref": f"specs/{feature}/prd.md#adoption",
        "project_boundaries": [
            {
                "order": 1,
                "feature_code": "001",
                "feature": feature,
                "title": "Review fixture",
                "parent_feature_code": None,
                "sibling_order": 0,
                "outline_node_id": "boundary-root",
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Existing project root."},
                "lifecycle": "active",
                "predecessor_codes": [],
            }
        ],
        "tombstones": [],
    }
    proposal_path = draft / "proposal.json"
    preview_path = draft / "impact-preview.json"
    proposal_path.write_text(json.dumps(proposal_input), encoding="utf-8")
    prepared = subprocess.run(
        [
            "node", str(ADOPTION_PREPARE), str(index_path), str(report_path),
            str(feature_root / "outline-boundaries.json"), str(proposal_path), str(preview_path),
        ],
        cwd=review_project.root,
        text=True,
        capture_output=True,
        check=False,
    )
    assert prepared.returncode == 0, prepared.stderr
    preview = json.loads(preview_path.read_text(encoding="utf-8"))
    proposal = {
        "baseline_id": proposal_id,
        "proposal_digest": "",
        "base_baseline_id": None,
        "base_baseline_digest": None,
        "created_at": proposal_input["created_at"],
        "created_by": proposal_input["created_by"],
        "decision_ref": decision_ref,
        "change_reason": proposal_input["change_reason"],
        "project_boundaries": proposal_input["project_boundaries"],
        "tombstones": [],
    }
    proposal["proposal_digest"] = _contract_digest(proposal, "proposal_digest")
    review_data = json.loads(review_project.data_path("outline").read_text(encoding="utf-8"))
    node = review_data["modules"][0]["views"][0]["nodes"][0]
    node.update(
        {
            "review_level": "must_confirm",
            "confirmation_priority": "critical",
            "options": [
                {"id": "OPTION_A", "label": "Confirm", "next_exit": "confirm-outline-boundary-adoption"},
                {"id": "OPTION_B", "label": "Revise", "next_exit": "needs-decision:revise-outline-boundary-adoption"},
                {"id": "OPTION_C", "label": "Reject", "next_exit": "reject-outline-boundary-adoption"},
            ],
        }
    )
    review_data["boundary_adjustment"] = {
        "operation": "ADOPTION",
        "proposal_id": proposal_id,
        "proposal_digest": proposal["proposal_digest"],
        "base_baseline_id": None,
        "base_baseline_digest": None,
        "impact_preview_digest": preview["impact_preview_digest"],
        "initiated_by": "model",
        "change_class": "ADOPTION",
        "affected_feature_codes": ["001"],
        "proposal_path": f"specs/{feature}/boundary-adjustments/drafts/{proposal_id}/proposal.json",
        "impact_preview_path": f"specs/{feature}/boundary-adjustments/drafts/{proposal_id}/impact-preview.json",
        "decision_path": decision_ref,
        "writer_ledger_path": f"specs/{feature}/boundary-adjustments/writeback-ledger.jsonl",
        "decision_target_ref": "module-1:outline-item-1:node-1",
    }
    review_project.data_path("outline").write_text(json.dumps(review_data), encoding="utf-8")

    with _running_launcher(review_project, "outline") as (_, ready_url):
        origin, config = _writer_config(ready_url)
        assert config["authorization_mode"] == "outline_boundary_human_decision"
        payload = _confirmation_payload(review_project, "outline")
        payload["parts"][0]["target_path"] = decision_ref
        status, body = _post_writeback(origin, config, payload)
        assert status == 200, body.decode("utf-8")
        result = json.loads(body)
        assert result["next_command"] == f"/sp.prd {feature} --adopt-outline-boundaries --consume-outline-decision {proposal_id}"

    decision = json.loads((draft / "decision.json").read_text(encoding="utf-8"))
    assert decision["operation"] == "ADOPTION"
    assert decision["base_baseline_id"] is None
    assert decision["base_baseline_digest"] is None
    assert decision["confirmed_by"]["type"] == "human"
    event = json.loads((feature_root / "boundary-adjustments" / "writeback-ledger.jsonl").read_text(encoding="utf-8"))
    assert event["operation"] == "ADOPTION"
    assert event["receipt_id"] == decision["receipt"]["receipt_id"]


def test_local_writer_config_exposes_version_and_runtime_limits(review_project: ReviewProject):
    with _running_launcher(review_project) as (_, ready_url):
        _, config = _writer_config(ready_url)

    assert config["target_version"] == "missing"
    assert config["request_timeout_ms"] == 30_000
    assert config["minimum_node_major"] == 18


def test_writeback_client_recovers_config_and_bounds_retries():
    node_program = f"""
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync({json.dumps(str(WRITEBACK_CLIENT))}, "utf8");

function response(status, body) {{
  const text = JSON.stringify(body);
  return {{ ok: status >= 200 && status < 300, status, text: async () => text, json: async () => body }};
}}

function client(fetchImpl) {{
  const context = {{
    AbortController,
    Date,
    Error,
    JSON,
    Math,
    Promise,
    Uint8Array,
    console,
    fetch: fetchImpl,
    window: {{
      clearTimeout,
      crypto: {{ randomUUID: () => "stable-request-id" }},
      setTimeout: (callback) => setTimeout(callback, 0)
    }}
  }};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.SpecCompassWriteback;
}}

(async () => {{
  let configCalls = 0;
  const recovering = client(async () => {{
    configCalls += 1;
    if (configCalls === 1) return response(503, {{ error: {{ code: "CONFIG_BUSY", message: "busy", retryable: true }} }});
    return response(200, {{ endpoint: "/write", token: "token", target_version: "missing" }});
  }});
  try {{ await recovering.loadConfig(); throw new Error("first config load unexpectedly succeeded"); }} catch (error) {{
    if (error.code !== "CONFIG_BUSY") throw error;
  }}
  await recovering.loadConfig();
  if (configCalls !== 2) throw new Error(`config promise was not reset: ${{configCalls}}`);

  let postCalls = 0;
  const requestIds = [];
  const retrying = client(async (url, options = {{}}) => {{
    if (!options.method || options.method === "GET") return response(200, {{ endpoint: "/write", token: "token", target_version: "missing" }});
    postCalls += 1;
    requestIds.push(JSON.parse(options.body).request_id);
    if (postCalls < 3) return response(503, {{ error: {{ code: "WRITE_BUSY", message: "busy", retryable: true, allow_fallback: true }} }});
    return response(200, {{ ok: true, target_version: "sha256:new", target_path: "confirmation.md" }});
  }});
  const payload = {{ kind: "confirmation" }};
  await retrying.submit(payload);
  if (postCalls !== 3 || new Set(requestIds).size !== 1 || requestIds[0] !== "stable-request-id") {{
    throw new Error("retry count or request identity is unstable");
  }}
  const followup = {{ kind: "confirmation" }};
  await retrying.submit(followup);
  if (followup.expected_target_version !== "sha256:new") throw new Error("target version was not advanced after success");

  let conflictPosts = 0;
  const conflicting = client(async (url, options = {{}}) => {{
    if (!options.method || options.method === "GET") return response(200, {{ endpoint: "/write", token: "token", target_version: "missing" }});
    conflictPosts += 1;
    return response(409, {{ error: {{ code: "WRITEBACK_TARGET_CHANGED", message: "changed", retryable: false, allow_fallback: false, recovery_action: "reload_review" }} }});
  }});
  try {{ await conflicting.submit({{ kind: "confirmation" }}); throw new Error("conflict unexpectedly succeeded"); }} catch (error) {{
    if (error.code !== "WRITEBACK_TARGET_CHANGED" || error.allowFallback || error.recoveryAction !== "reload_review") throw error;
  }}
  if (conflictPosts !== 1) throw new Error(`conflict was retried ${{conflictPosts}} times`);

  let networkPosts = 0;
  const offline = client(async (url, options = {{}}) => {{
    if (!options.method || options.method === "GET") return response(200, {{ endpoint: "/write", token: "token", target_version: "missing" }});
    networkPosts += 1;
    throw new Error("offline");
  }});
  try {{ await offline.submit({{ kind: "confirmation" }}); throw new Error("network failure unexpectedly succeeded"); }} catch (error) {{
    if (error.code !== "WRITEBACK_NETWORK_ERROR" || !error.allowFallback || error.attempts !== 3) throw error;
  }}
  if (networkPosts !== 3) throw new Error(`network failure used ${{networkPosts}} attempts`);
}})().catch((error) => {{ console.error(error); process.exitCode = 1; }});
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        cwd=PROJECT_ROOT,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


def test_local_writer_replays_identical_request_idempotently(review_project: ReviewProject):
    payload = _confirmation_payload(review_project)
    payload["request_id"] = "confirmation-idempotency-001"
    with _running_launcher(review_project) as (_, ready_url):
        origin, config = _writer_config(ready_url)
        first_status, first_body = _post_writeback(origin, config, payload)
        second_status, second_body = _post_writeback(origin, config, payload)

    assert first_status == second_status == 200
    assert json.loads(second_body)["idempotent_replay"] is True
    assert json.loads(first_body)["target_version"] == json.loads(second_body)["target_version"]


def test_local_writer_rejects_request_id_reuse_with_different_content(review_project: ReviewProject):
    first_payload = _confirmation_payload(review_project)
    first_payload["request_id"] = "confirmation-id-reuse-001"
    second_payload = json.loads(json.dumps(first_payload))
    second_payload["unused_difference"] = "different"
    with _running_launcher(review_project) as (_, ready_url):
        origin, config = _writer_config(ready_url)
        first_status, _ = _post_writeback(origin, config, first_payload)
        second_status, second_body = _post_writeback(origin, config, second_payload)

    error = json.loads(second_body)["error"]
    assert first_status == 200
    assert second_status == 409
    assert error == {
        "code": "REQUEST_ID_REUSED",
        "message": "The writeback request ID was reused with different content.",
        "retryable": False,
        "allow_fallback": False,
        "recovery_action": "reload_review",
    }


def test_local_writer_preserves_target_changed_after_page_load(review_project: ReviewProject):
    payload = _confirmation_payload(review_project)
    with _running_launcher(review_project) as (_, ready_url):
        origin, config = _writer_config(ready_url)
        target = review_project.root / str(config["target_path"])
        target.write_text("external edit must survive\n", encoding="utf-8")
        status, body = _post_writeback(origin, config, payload)

    error = json.loads(body)["error"]
    assert status == 409
    assert error["code"] == "WRITEBACK_TARGET_CHANGED"
    assert error["retryable"] is False
    assert error["allow_fallback"] is False
    assert target.read_text(encoding="utf-8") == "external edit must survive\n"


def test_local_writer_deduplicates_concurrent_identical_posts(review_project: ReviewProject):
    base_payload = _confirmation_payload(review_project)
    base_payload["request_id"] = "confirmation-concurrent-001"
    with _running_launcher(review_project) as (_, ready_url):
        origin, config = _writer_config(ready_url)
        barrier = threading.Barrier(3)
        results: list[tuple[int, bytes]] = []

        def post() -> None:
            payload = json.loads(json.dumps(base_payload))
            barrier.wait()
            results.append(_post_writeback(origin, config, payload))

        threads = [threading.Thread(target=post) for _ in range(2)]
        for thread in threads:
            thread.start()
        barrier.wait()
        for thread in threads:
            thread.join(timeout=5)

    assert len(results) == 2
    assert [status for status, _ in results] == [200, 200]
    bodies = [json.loads(body) for _, body in results]
    assert any(body.get("idempotent_replay") is True for body in bodies)


def test_cross_process_writers_serialize_and_reject_stale_target(review_project: ReviewProject):
    with _running_launcher(review_project) as (_, first_url), _running_launcher(review_project) as (_, second_url):
        first_origin, first_config = _writer_config(first_url)
        second_origin, second_config = _writer_config(second_url)
        first_payload = _confirmation_payload(review_project)
        first_payload["request_id"] = "cross-process-001"
        second_payload = _confirmation_payload(review_project)
        second_payload["request_id"] = "cross-process-002"
        barrier = threading.Barrier(3)
        results: list[tuple[int, bytes]] = []

        def post(origin: str, config: dict[str, object], payload: dict[str, object]) -> None:
            barrier.wait()
            results.append(_post_writeback(origin, config, payload))

        threads = [
            threading.Thread(target=post, args=(first_origin, first_config, first_payload)),
            threading.Thread(target=post, args=(second_origin, second_config, second_payload)),
        ]
        for thread in threads:
            thread.start()
        barrier.wait()
        for thread in threads:
            thread.join(timeout=5)

    assert len(results) == 2
    assert sorted(status for status, _ in results) == [200, 409]
    rejected = json.loads(next(body for status, body in results if status == 409))["error"]
    assert rejected["code"] == "WRITEBACK_TARGET_CHANGED"
    assert rejected["allow_fallback"] is False


def test_local_writer_accepts_browser_normalized_schema_v1_identity(review_project: ReviewProject):
    data_path = review_project.data_path("flow")
    review_data = json.loads(data_path.read_text(encoding="utf-8"))
    review_data["schema_version"] = 1
    data_path.write_text(json.dumps(review_data), encoding="utf-8")

    with _running_launcher(review_project, "flow") as (_, ready_url):
        origin, config = _writer_config(ready_url)
        status, body = _post_writeback(origin, config, _confirmation_payload(review_project))

    assert status == 200, body.decode("utf-8")


def test_local_writer_records_revision_request_without_authorizing(review_project: ReviewProject):
    payload = _confirmation_payload(review_project)
    record = payload["parts"][0]["modules"][0]["records"][0]
    record.update(
        {
            "bucket": "needs_decision_items",
            "status": "SAVED_SUBMITTED",
            "authorization_state": "NOT_AUTHORIZED",
            "is_authorized_decision": False,
            "selected_option": "OPTION_B",
            "next_exit": "needs-decision:owner",
            "revision_request": {
                "target_ref": "module-1:flow-item-1:node-1",
                "target_label": "Primary module / Flow item / Choose the supported route",
                "review_type": "flow",
                "change_type": "MODIFY_BRANCH",
                "selected_option": "OPTION_B",
                "reviewer_note": "Route this case through a manual approval step.",
                "expected_model_action": "Revise only this branch and its direct neighbors.",
                "next_exit": "needs-decision:owner",
            },
        }
    )

    with _running_launcher(review_project) as (_, ready_url):
        origin, config = _writer_config(ready_url)
        status, body = _post_writeback(origin, config, payload)
        assert status == 200, body.decode("utf-8")
        confirmation = review_project.root / str(config["target_path"])
        confirmation_text = confirmation.read_text(encoding="utf-8")
        frontmatter = yaml.safe_load(confirmation_text.split("---", 2)[1])
        assert frontmatter["human_confirmation"] == "NEEDS_REVISION"
        assert frontmatter["authorization_scope"] == "BLOCKED"
        assert frontmatter["owner_approval"]["status"] == "PENDING"
        assert frontmatter["revision_requests"][0]["target_ref"] == "module-1:flow-item-1:node-1"
        assert json.loads(body)["next_command"] == f"/sp.flow {review_project.feature}"
        assert "preserve this record" in confirmation_text
        assert "clear all prior generated output" in confirmation_text


def test_local_writer_records_discovery_response_at_pending_path(review_project: ReviewProject):
    with _running_launcher(review_project, "outline-discovery") as (_, ready_url):
        origin, config = _writer_config(ready_url)
        status, body = _post_writeback(origin, config, _discovery_payload(review_project))

        assert status == 200, body.decode("utf-8")
        result = json.loads(body)
        assert result["authorization_effect"] == "none"
        assert result["next_command"] == f"/sp.prd {review_project.feature}"
        assert result["target_path"].endswith("outline-discovery-response-pending.json")
        saved = json.loads((review_project.root / result["target_path"]).read_text(encoding="utf-8"))
        assert saved == _discovery_payload(review_project)["response"]


@pytest.mark.parametrize(
    ("override", "expected_status"),
    (
        ({"token": "wrong-token"}, 403),
        ({"request_origin": "http://127.0.0.1:1"}, 403),
        ({"content_type": "text/plain"}, 415),
    ),
)
def test_local_writer_rejects_missing_capability_or_wrong_origin_and_type(
    review_project: ReviewProject, override: dict[str, str], expected_status: int
):
    with _running_launcher(review_project) as (_, ready_url):
        origin, config = _writer_config(ready_url)
        status, _ = _post_writeback(origin, config, _confirmation_payload(review_project), **override)
        assert status == expected_status
        assert not (review_project.root / str(config["target_path"])).exists()


@pytest.mark.parametrize(
    "mutate",
    (
        lambda payload: payload.update(review_data_id="stale"),
        lambda payload: payload["parts"][0].update(target_path="specs/other/unsafe.md"),
        lambda payload: payload["parts"][0].update(batch_id="OTHER-BATCH"),
        lambda payload: payload["parts"][0]["modules"][0]["records"][0].update(selected_option="UNKNOWN"),
        lambda payload: payload["parts"][0]["modules"][0]["records"][0].update(target_ref="module-1:flow-item-1:unknown"),
        lambda payload: payload["parts"][0].update(part_count=2),
    ),
)
def test_local_writer_rejects_stale_misdirected_or_incomplete_confirmation(
    review_project: ReviewProject, mutate
):
    payload = _confirmation_payload(review_project)
    mutate(payload)
    with _running_launcher(review_project) as (_, ready_url):
        origin, config = _writer_config(ready_url)
        status, _ = _post_writeback(origin, config, payload)
        assert status in {400, 409}
        assert not (review_project.root / str(config["target_path"])).exists()


def test_local_writer_rejects_invalid_discovery_delta(review_project: ReviewProject):
    payload = _discovery_payload(review_project)
    payload["response"]["deltas"][0]["candidate_id"] = "unknown-candidate"
    with _running_launcher(review_project, "outline-discovery") as (_, ready_url):
        origin, config = _writer_config(ready_url)
        status, body = _post_writeback(origin, config, payload)
        assert status == 400
        error = json.loads(body)["error"]
        assert error["code"] == "INVALID_DISCOVERY_DELTA"
        assert error["retryable"] is False
        assert error["allow_fallback"] is False
        assert not (review_project.root / str(config["target_path"])).exists()


def test_local_writer_enforces_request_size_limit(review_project: ReviewProject):
    payload = _confirmation_payload(review_project)
    payload["unused_padding"] = "x" * 2_000_000
    with _running_launcher(review_project) as (_, ready_url):
        origin, config = _writer_config(ready_url)
        status, body = _post_writeback(origin, config, payload)
        assert status == 413
        error = json.loads(body)["error"]
        assert error["code"] == "WRITEBACK_PAYLOAD_TOO_LARGE"
        assert error["retryable"] is False
        assert error["allow_fallback"] is True
        assert not (review_project.root / str(config["target_path"])).exists()


@pytest.mark.parametrize(
    ("relative_path", "content_type"),
    (
        ("speccompass-review-renderer.html", "text/html; charset=utf-8"),
        ("styles/review.css", "text/css; charset=utf-8"),
        ("scripts/review.js", "text/javascript; charset=utf-8"),
        ("icons.svg", "image/svg+xml"),
        ("pixel.png", "image/png"),
        ("font.woff2", "font/woff2"),
        ("notes.txt", "text/plain; charset=utf-8"),
    ),
)
def test_launcher_serves_assets_with_explicit_mime_and_security_headers(
    review_project: ReviewProject, relative_path: str, content_type: str
):
    with _running_launcher(review_project) as (_, ready_url):
        parsed = urlsplit(ready_url)
        asset_url = f"http://127.0.0.1:{parsed.port}/.specify/review/renderer/{relative_path}"
        with _http_request(asset_url) as response:
            assert response.status == 200
            assert response.headers["Content-Type"] == content_type
            assert response.headers["Cache-Control"] == "no-store"
            assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_launcher_head_matches_get_headers_without_body(review_project: ReviewProject):
    with _running_launcher(review_project) as (_, ready_url):
        with _http_request(ready_url) as get_response:
            get_body = get_response.read()
            get_headers = dict(get_response.headers)
        with _http_request(ready_url, method="HEAD") as head_response:
            head_body = head_response.read()
            head_headers = dict(head_response.headers)

        assert head_response.status == get_response.status == 200
        assert head_headers["Content-Type"] == get_headers["Content-Type"]
        assert head_headers["Content-Length"] == str(len(get_body))
        assert head_body == b""


def test_launcher_rejects_wrong_host_and_unsupported_method(review_project: ReviewProject):
    with _running_launcher(review_project) as (_, ready_url):
        connection, path = _connection_for(ready_url)
        connection.request("GET", path, headers={"Host": "localhost"})
        wrong_host = connection.getresponse()
        wrong_host.read()
        assert wrong_host.status == 403
        connection.close()

        connection, path = _connection_for(ready_url)
        connection.request("POST", path)
        unsupported = connection.getresponse()
        unsupported.read()
        assert unsupported.status == 405
        assert unsupported.getheader("Allow") == "GET, HEAD"
        connection.close()


def test_launcher_blocks_traversal_and_symlink_escape(review_project: ReviewProject, tmp_path: Path):
    outside = tmp_path.parent / f"{tmp_path.name}-outside.txt"
    outside.write_text("outside secret", encoding="utf-8")
    symlink = review_project.root / "linked-secret.txt"
    try:
        symlink.symlink_to(outside)
    except OSError as error:
        pytest.skip(f"symlink unavailable: {error}")

    with _running_launcher(review_project) as (_, ready_url):
        parsed = urlsplit(ready_url)
        for raw_path in ("/%2e%2e/outside.txt", "/linked-secret.txt"):
            connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=3)
            connection.request("GET", raw_path)
            response = connection.getresponse()
            body = response.read()
            connection.close()
            assert response.status in {403, 404}
            assert b"outside secret" not in body


def test_launcher_does_not_serve_unrelated_project_files(review_project: ReviewProject):
    secret = review_project.root / "project-secret.txt"
    secret.write_text("not review data", encoding="utf-8")

    with _running_launcher(review_project) as (_, ready_url):
        parsed = urlsplit(ready_url)
        connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=3)
        connection.request("GET", "/project-secret.txt")
        response = connection.getresponse()
        body = response.read()
        connection.close()

        assert response.status == 403
        assert b"not review data" not in body


def test_launcher_serves_same_type_review_data_for_feature_navigation(review_project: ReviewProject):
    other_feature = "002-other-review"
    other_data = review_project.root / "specs" / other_feature / REVIEW_DATA_PATHS["flow"]
    other_data.parent.mkdir(parents=True)
    other_data.write_text("{}", encoding="utf-8")

    with _running_launcher(review_project) as (_, ready_url):
        parsed = urlsplit(ready_url)
        other_url = f"http://{parsed.hostname}:{parsed.port}/specs/{other_feature}/{REVIEW_DATA_PATHS['flow']}"
        with _http_request(other_url) as response:
            assert response.status == 200

        wrong_type_url = f"http://{parsed.hostname}:{parsed.port}/specs/{review_project.feature}/{REVIEW_DATA_PATHS['ui']}"
        connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=3)
        connection.request("GET", urlsplit(wrong_type_url).path)
        response = connection.getresponse()
        response.read()
        connection.close()
        assert response.status == 403


def test_launcher_sigterm_stops_server_and_releases_port(review_project: ReviewProject):
    process = subprocess.Popen(
        _launcher_command(review_project),
        cwd=review_project.root,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
    )
    ready_url = _wait_for_ready_url(process)
    parsed = urlsplit(ready_url)
    assert parsed.port

    os.kill(process.pid, signal.SIGTERM)
    process.wait(timeout=5)

    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", parsed.port)) != 0:
                break
        time.sleep(0.05)
    else:
        pytest.fail("launcher port remained open after SIGTERM")

    # On Windows this checks port release after forced termination only:
    # os.kill(..., SIGTERM) calls TerminateProcess with SIGTERM's integer
    # value (15), so the process exits with code 15 and Node's graceful-
    # shutdown handler is not exercised.
    expected_returncode = signal.SIGTERM if os.name == "nt" else 0
    assert process.returncode == expected_returncode
