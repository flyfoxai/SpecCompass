"""Process-level tests for the self-contained SpecCompass review server."""

from __future__ import annotations

import http.client
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
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

import pytest
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

DISCOVERY_DISTRIBUTION_ASSETS = (
    Path("renderer/scripts/discovery-response-package.js"),
    Path("renderer/scripts/outline-discovery-renderer.js"),
    Path("schemas/outline-discovery-data.schema.json"),
    Path("schemas/outline-discovery-response.schema.json"),
    Path("schemas/outline-intent-ledger.schema.json"),
    Path("scripts/apply-outline-discovery.mjs"),
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

    payload = {"schema_version": 1, "review_type": "flow", "modules": []}
    project = ReviewProject(tmp_path, launcher, feature)
    for review_type in ("flow", "ui", "outline", "outline-discovery"):
        data_path = project.data_path(review_type)
        data_path.parent.mkdir(parents=True, exist_ok=True)
        data_path.write_text(
            json.dumps({**payload, "review_type": review_type}),
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
def _running_launcher(project: ReviewProject, review_type: str = "flow"):
    process = subprocess.Popen(
        _launcher_command(project, review_type),
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
  schema_version: 2,
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
