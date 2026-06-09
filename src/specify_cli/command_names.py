"""Shared command naming helpers.

Core SP commands use the dotted ``sp.*`` runtime names. Skills hosts keep
the upstream hyphenated on-disk package shape and expose those skills through
their own prompt/slash namespace. Extension commands keep the upstream
``speckit.<ext>.<cmd>`` namespace.
"""

from __future__ import annotations

from collections.abc import Iterable

CORE_COMMAND_STEMS = frozenset(
    {
        "analyze",
        "bundle",
        "checklist",
        "clarify",
        "constitution",
        "flow",
        "gate",
        "implement",
        "plan",
        "prd",
        "specify",
        "tasks",
        "taskstoissues",
        "ui",
    }
)


def _strip_invocation_prefix(command_name: str) -> str:
    value = command_name.strip()
    if value.startswith("/skill:"):
        value = value[len("/skill:") :]
    if value.startswith("/") or value.startswith("$"):
        value = value[1:]
    return value


def core_command_stem(command_name: str) -> str | None:
    """Return the core command stem if *command_name* is a core command."""
    value = _strip_invocation_prefix(command_name)
    if not value:
        return None

    if value in CORE_COMMAND_STEMS:
        return value

    if value.startswith("sp."):
        stem = value[len("sp.") :]
        return stem if stem in CORE_COMMAND_STEMS else None

    if value.startswith("speckit."):
        stem = value[len("speckit.") :]
        return stem if stem in CORE_COMMAND_STEMS else None

    if value.startswith("sp-"):
        stem = value[len("sp-") :]
        return stem if stem in CORE_COMMAND_STEMS else None

    if value.startswith("speckit-"):
        stem = value[len("speckit-") :]
        return stem if stem in CORE_COMMAND_STEMS else None

    return None


def is_core_command_name(command_name: str) -> bool:
    return core_command_stem(command_name) is not None


def canonical_command_id(command_name: str) -> str:
    """Return the canonical dotted command id for *command_name*."""
    value = _strip_invocation_prefix(command_name)
    if not value:
        return value

    stem = core_command_stem(value)
    if stem is not None:
        return f"sp.{stem}"

    if value.startswith("speckit-"):
        suffix = value[len("speckit-") :]
        if suffix:
            return f"speckit.{suffix.replace('-', '.')}"

    return value


def command_filename_base(command_name: str) -> str:
    """Return the on-disk dotted basename for markdown/TOML/YAML commands."""
    return canonical_command_id(command_name)


def slash_command_name(command_name: str, separator: str = ".") -> str:
    """Return the slash-command name without the leading slash."""
    value = canonical_command_id(command_name)
    if separator == ".":
        return value
    return value.replace(".", separator)


def skill_directory_name(command_name: str) -> str:
    """Return the canonical skill directory / skill invocation basename."""
    stem = core_command_stem(command_name)
    if stem is not None:
        return f"sp-{stem}"

    value = canonical_command_id(command_name)
    if value.startswith("speckit."):
        return f"speckit-{value[len('speckit.'):].replace('.', '-')}"
    if value.startswith("sp."):
        return value
    if value.startswith("speckit-") or value.startswith("sp-"):
        return value
    return f"speckit-{value.replace('.', '-')}"


def skill_directory_variants(command_name: str) -> tuple[str, ...]:
    """Return canonical and legacy skill directory names for *command_name*."""
    modern = skill_directory_name(command_name)
    value = canonical_command_id(command_name)

    variants: list[str] = [modern]
    if value.startswith("sp."):
        stem = value[len("sp.") :]
        variants.extend([f"sp.{stem}", f"speckit-{stem}", f"speckit.{stem}"])
    elif value.startswith("speckit."):
        suffix = value[len("speckit.") :]
        variants.append(f"speckit.{suffix}")

    return tuple(dict.fromkeys(variants))


def command_title_text(command_name: str) -> str:
    """Return a human-friendly command title."""
    value = canonical_command_id(command_name)
    if value.startswith("sp."):
        value = value[len("sp.") :]
    elif value.startswith("speckit."):
        value = value[len("speckit.") :]
    return value.replace(".", " ").replace("-", " ").title()


def skill_basename_stem(skill_name: str) -> str:
    """Return the stem portion used for skill hints / restore lookups."""
    value = _strip_invocation_prefix(skill_name)
    for prefix in ("sp-", "sp.", "speckit-", "speckit."):
        if value.startswith(prefix):
            return value[len(prefix) :]
    return value


def iter_skill_directory_variants(command_names: Iterable[str]) -> tuple[str, ...]:
    """Flatten skill directory variants for a list of command names."""
    flattened: list[str] = []
    for command_name in command_names:
        flattened.extend(skill_directory_variants(command_name))
    return tuple(dict.fromkeys(flattened))
