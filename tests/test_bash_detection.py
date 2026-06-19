"""Tests for cross-platform bash availability detection."""

from __future__ import annotations

import tests.conftest as shared


class _RunResult:
    def __init__(self, returncode: int = 0, stdout: str = "") -> None:
        self.returncode = returncode
        self.stdout = stdout


def test_windows_bash_detection_rejects_wsl_launcher_without_distro(monkeypatch):
    def fake_run(command, **_kwargs):
        if command == ["bash", "-c", "echo ok"]:
            return _RunResult(returncode=1, stdout="")
        raise AssertionError(command)

    monkeypatch.delenv("SPECKIT_TEST_BASH", raising=False)
    monkeypatch.setattr(shared.shutil, "which", lambda _name: "C:/Windows/System32/bash.exe")
    monkeypatch.setattr(shared.subprocess, "run", fake_run)

    assert shared._has_working_bash() is False


def test_windows_bash_detection_rejects_wsl_or_wsl2_kernel(monkeypatch):
    def fake_run(command, **_kwargs):
        if command == ["bash", "-c", "echo ok"]:
            return _RunResult(stdout="ok\n")
        if command == ["bash", "-c", "uname -s"]:
            return _RunResult(stdout="Linux\n")
        raise AssertionError(command)

    monkeypatch.delenv("SPECKIT_TEST_BASH", raising=False)
    monkeypatch.setattr(shared.sys, "platform", "win32")
    monkeypatch.setattr(shared.shutil, "which", lambda _name: "C:/Windows/System32/bash.exe")
    monkeypatch.setattr(shared.subprocess, "run", fake_run)

    assert shared._has_working_bash() is False


def test_windows_bash_detection_accepts_native_msys_bash(monkeypatch):
    def fake_run(command, **_kwargs):
        if command == ["bash", "-c", "echo ok"]:
            return _RunResult(stdout="ok\n")
        if command == ["bash", "-c", "uname -s"]:
            return _RunResult(stdout="MINGW64_NT-10.0\n")
        raise AssertionError(command)

    monkeypatch.delenv("SPECKIT_TEST_BASH", raising=False)
    monkeypatch.setattr(shared.sys, "platform", "win32")
    monkeypatch.setattr(shared.shutil, "which", lambda _name: "C:/Program Files/Git/bin/bash.exe")
    monkeypatch.setattr(shared.subprocess, "run", fake_run)

    assert shared._has_working_bash() is True
