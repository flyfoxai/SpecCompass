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


class ReviewProject:
    def __init__(self, root: Path, launcher: Path, feature: str) -> None:
        self.root = root
        self.launcher = launcher
        self.feature = feature

    def data_path(self, review_type: str) -> Path:
        if review_type == "flow":
            return self.root / "specs" / self.feature / "flows" / "review" / "flow-review-data.json"
        return self.root / "specs" / self.feature / "ui" / "review" / "ui-review-data.json"


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
    for review_type in ("flow", "ui"):
        data_path = project.data_path(review_type)
        data_path.parent.mkdir(parents=True)
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

    installed_launcher.write_text("// stale launcher\n", encoding="utf-8")
    project_marker = project / "specs" / "001-existing" / "project-marker.txt"
    project_marker.parent.mkdir(parents=True)
    project_marker.write_text("keep project content\n", encoding="utf-8")

    refreshed = runner.invoke(app, [*init_args, "--force"])
    assert refreshed.exit_code == 0, refreshed.output
    assert installed_launcher.read_bytes() == REVIEW_LAUNCHER.read_bytes()
    assert project_marker.read_text(encoding="utf-8") == "keep project content\n"


@pytest.mark.parametrize(
    "args",
    (
        (),
        ("--flow", "feature", "--ui", "feature"),
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


@pytest.mark.parametrize("missing", ("renderer", "data"))
def test_launcher_does_not_become_ready_when_required_file_is_missing(
    review_project: ReviewProject, missing: str
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
        review_project.data_path("flow").unlink()

    result = subprocess.run(
        _launcher_command(review_project),
        cwd=review_project.root,
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
        timeout=10,
    )

    assert result.returncode != 0
    assert "SPECCOMPASS_REVIEW_URL=" not in result.stdout


@pytest.mark.parametrize("review_type", ("flow", "ui"))
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
            + ("flows/review/flow-review-data.json" if review_type == "flow" else "ui/review/ui-review-data.json")
        )
        with _http_request(data_url) as response:
            assert response.status == 200


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

    assert process.returncode == 0
