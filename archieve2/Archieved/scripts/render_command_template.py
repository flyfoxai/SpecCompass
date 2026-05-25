#!/usr/bin/env python3

"""Render shared command templates into host-specific command files.

Archived historical helper from the pre-alignment custom distribution chain.
It is retained only for reference and is no longer part of the active install
mechanism.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


def extract_script_command(content: str, block_name: str, script_type: str) -> str:
    pattern = re.compile(rf"^\s*{re.escape(script_type)}:\s*(.+)$")
    in_block = False

    for line in content.splitlines():
        if line.strip() == f"{block_name}:":
            in_block = True
            continue
        if in_block and line and not line[0].isspace():
            in_block = False
        if in_block:
            match = pattern.match(line)
            if match:
                return match.group(1).strip()

    return ""


def strip_frontmatter_script_sections(content: str) -> str:
    lines = content.splitlines(keepends=True)
    output_lines: list[str] = []
    in_frontmatter = False
    skip_section = False
    dash_count = 0

    for line in lines:
        stripped = line.rstrip("\r\n")
        if stripped == "---":
            dash_count += 1
            if dash_count == 1:
                in_frontmatter = True
            else:
                in_frontmatter = False
            skip_section = False
            output_lines.append(line)
            continue

        if in_frontmatter:
            if stripped in ("scripts:", "agent_scripts:"):
                skip_section = True
                continue
            if skip_section:
                if line[:1].isspace():
                    continue
                skip_section = False

        output_lines.append(line)

    return "".join(output_lines)


def rewrite_project_relative_paths(text: str) -> str:
    for old, new in (
        ("../../memory/", ".specify/memory/"),
        ("../../scripts/", ".specify/scripts/"),
        ("../../templates/", ".specify/templates/"),
    ):
        text = text.replace(old, new)

    text = re.sub(r'(^|[\s`"\'(])(?:\.?/)?memory/', r"\1.specify/memory/", text)
    text = re.sub(r'(^|[\s`"\'(])(?:\.?/)?scripts/', r"\1.specify/scripts/", text)
    text = re.sub(r'(^|[\s`"\'(])(?:\.?/)?templates/', r"\1.specify/templates/", text)
    return text.replace(".specify/.specify/", ".specify/").replace(".specify.specify/", ".specify/")


def process_template(
    content: str,
    agent_name: str,
    script_type: str,
    arg_placeholder: str,
) -> str:
    script_command = extract_script_command(content, "scripts", script_type)
    if script_command:
        content = content.replace("{SCRIPT}", script_command)

    agent_script_command = extract_script_command(content, "agent_scripts", script_type)
    if agent_script_command:
        content = content.replace("{AGENT_SCRIPT}", agent_script_command)

    content = strip_frontmatter_script_sections(content)
    content = content.replace("{ARGS}", arg_placeholder)
    content = content.replace("__AGENT__", agent_name)
    content = rewrite_project_relative_paths(content)
    return content


def render_claude_content(content: str) -> str:
    lines = content.splitlines()
    rendered_lines: list[str] = []
    line_index = 0

    if lines and lines[0] == "---":
        line_index = 1
        while line_index < len(lines) and lines[line_index] != "---":
            line_index += 1
        if line_index < len(lines):
            line_index += 1

    skip_user_input = False
    for line in lines[line_index:]:
        if skip_user_input:
            if "consider the user input before proceeding" in line:
                skip_user_input = False
            continue

        if line.strip() == "## User Input":
            skip_user_input = True
            continue

        if line.startswith("# /prompts:sp."):
            line = line.replace("# /prompts:", "# /", 1)

        rendered_lines.append(line)

    while rendered_lines and not rendered_lines[0].strip():
        rendered_lines.pop(0)

    output = "\n".join(rendered_lines)
    if content.endswith("\n"):
        output += "\n"
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--host", choices=("codex", "claude"), required=True)
    parser.add_argument("--script-type", choices=("sh", "ps"), required=True)
    parser.add_argument("--agent-name", required=True)
    parser.add_argument("--arg-placeholder", default="$ARGUMENTS")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = Path(args.input)
    target = Path(args.output)

    raw_content = source.read_text(encoding="utf-8")
    processed = process_template(
        raw_content,
        agent_name=args.agent_name,
        script_type=args.script_type,
        arg_placeholder=args.arg_placeholder,
    )

    if args.host == "claude":
        processed = render_claude_content(processed)

    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(processed.replace("\r\n", "\n"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
