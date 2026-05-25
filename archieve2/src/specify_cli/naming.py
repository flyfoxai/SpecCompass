"""Shared naming helpers for the OpenSpecs command and skill surfaces."""

from __future__ import annotations

CANONICAL_COMMAND_NAMESPACE = "sp"
LEGACY_COMMAND_NAMESPACE = "speckit"

CANONICAL_SKILL_PREFIX = "sp-"
LEGACY_SKILL_PREFIX = "speckit-"
LEGACY_SKILL_DOT_PREFIX = "speckit."

KNOWN_COMMAND_PREFIXES = (
    f"{CANONICAL_COMMAND_NAMESPACE}.",
    f"{LEGACY_COMMAND_NAMESPACE}.",
)

KNOWN_SKILL_PREFIXES = (
    CANONICAL_SKILL_PREFIX,
    LEGACY_SKILL_PREFIX,
    LEGACY_SKILL_DOT_PREFIX,
)


def split_command_id(command_id: str) -> tuple[str, str]:
    """Split a command id into ``(namespace, short_name)``."""
    if not isinstance(command_id, str):
        return "", ""

    value = command_id.strip()
    for prefix in KNOWN_COMMAND_PREFIXES:
        if value.startswith(prefix):
            return prefix[:-1], value[len(prefix) :]
    return "", value


def strip_command_namespace(command_id: str) -> str:
    """Return a command id without the leading namespace."""
    return split_command_id(command_id)[1]


def has_known_command_namespace(command_id: str) -> bool:
    """Return ``True`` when *command_id* uses a known namespace."""
    namespace, _ = split_command_id(command_id)
    return bool(namespace)


def canonical_command_id(command_id: str) -> str:
    """Return the canonical ``sp.*`` command id."""
    short_name = strip_command_namespace(command_id)
    return f"{CANONICAL_COMMAND_NAMESPACE}.{short_name}" if short_name else CANONICAL_COMMAND_NAMESPACE


def canonical_command_filename(template_name: str, suffix: str = ".md") -> str:
    """Return a canonical on-disk command filename."""
    return f"{canonical_command_id(template_name)}{suffix}"


def strip_skill_prefix(skill_name: str) -> str:
    """Return a skill directory name without the host-specific prefix."""
    if not isinstance(skill_name, str):
        return ""

    value = skill_name.strip()
    for prefix in KNOWN_SKILL_PREFIXES:
        if value.startswith(prefix):
            return value[len(prefix) :]
    return value


def canonical_skill_name(command_id: str) -> str:
    """Return the canonical ``sp-*`` skill directory name."""
    short_name = strip_command_namespace(command_id)
    if not short_name:
        short_name = strip_skill_prefix(command_id)
    short_name = short_name.replace(".", "-")
    return f"{CANONICAL_SKILL_PREFIX}{short_name}" if short_name else CANONICAL_SKILL_PREFIX.rstrip("-")


def legacy_skill_name(command_id: str) -> str:
    """Return the legacy ``speckit-*`` skill directory name."""
    short_name = strip_command_namespace(command_id)
    if not short_name:
        short_name = strip_skill_prefix(command_id)
    short_name = short_name.replace(".", "-")
    return f"{LEGACY_SKILL_PREFIX}{short_name}" if short_name else LEGACY_SKILL_PREFIX.rstrip("-")
