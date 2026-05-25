#!/bin/sh

set -eu

SCRIPT_DIR=""
SOURCE_ROOT=""
SOURCE_MODE=""
ARCHIVE_URL="${SP_INSTALL_ARCHIVE_URL:-}"
TARGET_DIR="${SP_INSTALL_TARGET_DIR:-.}"
AUTO_YES="${SP_INSTALL_AUTO_YES:-0}"
AI_TARGET="${SP_INSTALL_AI:-}"
INSTALL_CODEX_PROMPTS=0
AI_SKILLS_REQUESTED="${SP_INSTALL_AI_SKILLS:-0}"
INSTALL_CLAUDE_COMMANDS=0
DOWNLOAD_DIR=""
DETECTED_CODEX_HOME="${CODEX_HOME:-}"
RESOLVED_CODEX_HOME=""
RESOLVED_CODEX_SKILLS_DIR=""
RESOLVED_CODEX_PROMPTS_DIR=""
RESOLVED_CODEX_COMMANDS_DIR=""
INSTALLED_CODEX_PROMPTS=""
INSTALLED_CODEX_PROMPTS_JSON=""
INSTALLED_CODEX_COMMANDS=""
INSTALLED_CODEX_COMMANDS_JSON=""
REMOVED_LEGACY_CODEX_SKILLS=""
REMOVED_LEGACY_CODEX_SKILLS_JSON=""
REMOVED_LEGACY_CODEX_PROMPTS=""
REMOVED_LEGACY_CODEX_PROMPTS_JSON=""
REMOVED_LEGACY_CODEX_COMMANDS=""
REMOVED_LEGACY_CODEX_COMMANDS_JSON=""
RESOLVED_CLAUDE_COMMANDS_DIR=""
INSTALLED_COMMANDS=""
INSTALLED_COMMANDS_JSON=""

cleanup() {
  if [ -n "$DOWNLOAD_DIR" ] && [ -d "$DOWNLOAD_DIR" ]; then
    rm -rf "$DOWNLOAD_DIR"
  fi
}

trap cleanup EXIT INT TERM

usage() {
  cat <<'EOF'
Usage:
  sh scripts/install.sh [target_dir]
  sh scripts/install.sh --yes [target_dir]
  sh scripts/install.sh --archive-url <tar.gz-url> [target_dir]
  sh scripts/install.sh --ai codex [target_dir]
  sh scripts/install.sh --ai claude [target_dir]

Behavior:
  - If target_dir is omitted, install into the current directory.
  - Prompts for confirmation before writing files unless --yes is used.
  - macOS/Linux local mode copies assets from the current repository.
  - curl|sh mode requires --archive-url or SP_INSTALL_ARCHIVE_URL.
  - Remote mode can also use SP_INSTALL_TARGET_DIR and SP_INSTALL_AUTO_YES.
  - --ai codex installs pre-rendered Codex Desktop /prompts:sp.* prompts and a compatibility commands mirror.
  - --ai claude installs /sp.* slash commands into .claude/commands in the target project.
  - --ai-skills is deprecated, ignored, and kept only as a compatibility no-op for Codex mode.
EOF
}

is_yes_value() {
  case "${1:-}" in
    1|y|Y|yes|YES|true|TRUE)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

abs_path() {
  if [ "$1" = "." ]; then
    pwd
  else
    (
      cd "$1" 2>/dev/null && pwd
    )
  fi
}

legacy_codex_skill_slugs() {
  cat <<'EOF'
sp-constitution
sp-specify
sp-clarify
sp-flow
sp-ui
sp-gate
sp-bundle
sp-plan
sp-tasks
sp-analyze
EOF
}

sp_command_files() {
  cat <<'EOF'
sp.constitution.md
sp.specify.md
sp.clarify.md
sp.flow.md
sp.ui.md
sp.gate.md
sp.bundle.md
sp.plan.md
sp.tasks.md
sp.analyze.md
EOF
}

legacy_codex_command_files() {
  cat <<'EOF'
speckit.constitution.md
speckit.specify.md
speckit.clarify.md
speckit.checklist.md
speckit.plan.md
speckit.tasks.md
speckit.analyze.md
speckit.implement.md
speckit.taskstoissues.md
EOF
}

download_archive() {
  if [ -z "$ARCHIVE_URL" ]; then
    echo "error: no local source found and no archive URL was provided." >&2
    echo "hint: use --archive-url <tar.gz-url> when running through curl|sh." >&2
    exit 1
  fi

  if command -v curl >/dev/null 2>&1; then
    :
  elif command -v wget >/dev/null 2>&1; then
    :
  else
    echo "error: curl or wget is required to download the install archive." >&2
    exit 1
  fi

  DOWNLOAD_DIR="$(mktemp -d)"
  ARCHIVE_PATH="$DOWNLOAD_DIR/sp-install.tar.gz"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$ARCHIVE_URL" -o "$ARCHIVE_PATH"
  else
    wget -qO "$ARCHIVE_PATH" "$ARCHIVE_URL"
  fi

  tar -xzf "$ARCHIVE_PATH" -C "$DOWNLOAD_DIR"

  if [ -d "$DOWNLOAD_DIR/docs" ] && [ -d "$DOWNLOAD_DIR/installer-assets" ]; then
    SOURCE_ROOT="$DOWNLOAD_DIR"
    return
  fi

  for candidate in "$DOWNLOAD_DIR"/*; do
    if [ -d "$candidate/docs" ] && [ -d "$candidate/installer-assets" ]; then
      SOURCE_ROOT="$candidate"
      return
    fi
  done

  echo "error: downloaded archive does not contain the expected sp asset layout." >&2
  exit 1
}

count_existing_targets() {
  count=0
  for rel in \
    "docs" \
    "layer-1-business-clarification" \
    "layer-2-delivery" \
    ".specify/memory" \
    "specs" \
    ".sp/install-manifest.json" \
    "docs/sp-overview.zh-CN.md" \
    "docs/sp-overview-details.zh-CN.md" \
    "docs/sp-overview.en.md" \
    "docs/sp-overview-details.en.md"
  do
    if [ -e "$TARGET_ABS/$rel" ]; then
      count=$((count + 1))
    fi
  done
  echo "$count"
}

copy_tree() {
  src="$1"
  dest="$2"
  mkdir -p "$dest"
  cp -R "$src"/. "$dest"/
}

resolve_codex_paths() {
  if [ -n "${DETECTED_CODEX_HOME:-}" ]; then
    RESOLVED_CODEX_HOME="$DETECTED_CODEX_HOME"
  else
    if [ -z "${HOME:-}" ]; then
      echo "error: Codex prompt installation failed: unable to resolve home directory for default ~/.codex fallback." >&2
      exit 1
    fi
    RESOLVED_CODEX_HOME="$HOME/.codex"
  fi

  RESOLVED_CODEX_SKILLS_DIR="$RESOLVED_CODEX_HOME/skills"
  RESOLVED_CODEX_PROMPTS_DIR="$RESOLVED_CODEX_HOME/prompts"
  RESOLVED_CODEX_COMMANDS_DIR="$RESOLVED_CODEX_HOME/commands"

  if [ -z "$RESOLVED_CODEX_HOME" ]; then
    echo "error: Codex prompt installation failed: resolved Codex home directory missing or empty." >&2
    exit 1
  fi
}

remove_legacy_codex_skills() {
  REMOVED_LEGACY_CODEX_SKILLS=""
  REMOVED_LEGACY_CODEX_SKILLS_JSON=""

  if [ -z "$RESOLVED_CODEX_SKILLS_DIR" ] || [ ! -d "$RESOLVED_CODEX_SKILLS_DIR" ]; then
    return 0
  fi

  for slug in $(legacy_codex_skill_slugs); do
    legacy_skill_dir="$RESOLVED_CODEX_SKILLS_DIR/$slug"
    if [ -d "$legacy_skill_dir" ]; then
      rm -rf "$legacy_skill_dir"
      if [ -d "$legacy_skill_dir" ]; then
        echo "error: Codex prompt installation failed: unable to remove legacy skill $slug from $RESOLVED_CODEX_SKILLS_DIR" >&2
        exit 1
      fi
      if [ -n "$REMOVED_LEGACY_CODEX_SKILLS" ]; then
        REMOVED_LEGACY_CODEX_SKILLS="$REMOVED_LEGACY_CODEX_SKILLS
$slug"
        REMOVED_LEGACY_CODEX_SKILLS_JSON="$REMOVED_LEGACY_CODEX_SKILLS_JSON, \"$slug\""
      else
        REMOVED_LEGACY_CODEX_SKILLS="$slug"
        REMOVED_LEGACY_CODEX_SKILLS_JSON="\"$slug\""
      fi
    fi
  done
}

install_codex_commands() {
  COMMAND_SOURCE_ROOT="$SOURCE_ROOT/installer-assets/codex-prompts"
  if [ ! -d "$COMMAND_SOURCE_ROOT" ]; then
    echo "error: Codex Desktop prompt installation failed: missing installer-assets/codex-prompts in source." >&2
    exit 1
  fi

  if ! mkdir -p "$RESOLVED_CODEX_PROMPTS_DIR"; then
    echo "error: Codex Desktop prompt installation failed: resolved prompts directory missing or unwritable: $RESOLVED_CODEX_PROMPTS_DIR" >&2
    exit 1
  fi

  if ! mkdir -p "$RESOLVED_CODEX_COMMANDS_DIR"; then
    echo "error: Codex Desktop prompt installation failed: compatibility commands directory missing or unwritable: $RESOLVED_CODEX_COMMANDS_DIR" >&2
    exit 1
  fi

  INSTALLED_CODEX_PROMPTS=""
  INSTALLED_CODEX_PROMPTS_JSON=""
  INSTALLED_CODEX_COMMANDS=""
  INSTALLED_CODEX_COMMANDS_JSON=""
  REMOVED_LEGACY_CODEX_SKILLS=""
  REMOVED_LEGACY_CODEX_SKILLS_JSON=""
  REMOVED_LEGACY_CODEX_PROMPTS=""
  REMOVED_LEGACY_CODEX_PROMPTS_JSON=""
  REMOVED_LEGACY_CODEX_COMMANDS=""
  REMOVED_LEGACY_CODEX_COMMANDS_JSON=""

  remove_legacy_codex_skills

  for filename in $(legacy_codex_command_files); do
    legacy_name="${filename%.md}"
    legacy_prompt_path="$RESOLVED_CODEX_PROMPTS_DIR/$filename"
    if [ -f "$legacy_prompt_path" ]; then
      rm -f "$legacy_prompt_path"
      if [ -f "$legacy_prompt_path" ]; then
        echo "error: Codex Desktop prompt installation failed: unable to remove legacy command $legacy_name from $RESOLVED_CODEX_PROMPTS_DIR" >&2
        exit 1
      fi
      if [ -n "$REMOVED_LEGACY_CODEX_PROMPTS" ]; then
        REMOVED_LEGACY_CODEX_PROMPTS="$REMOVED_LEGACY_CODEX_PROMPTS
$legacy_name"
        REMOVED_LEGACY_CODEX_PROMPTS_JSON="$REMOVED_LEGACY_CODEX_PROMPTS_JSON, \"$legacy_name\""
      else
        REMOVED_LEGACY_CODEX_PROMPTS="$legacy_name"
        REMOVED_LEGACY_CODEX_PROMPTS_JSON="\"$legacy_name\""
      fi
    fi

    legacy_command_path="$RESOLVED_CODEX_COMMANDS_DIR/$filename"
    if [ -f "$legacy_command_path" ]; then
      rm -f "$legacy_command_path"
      if [ -f "$legacy_command_path" ]; then
        echo "error: Codex Desktop prompt installation failed: unable to remove legacy command $legacy_name from $RESOLVED_CODEX_COMMANDS_DIR" >&2
        exit 1
      fi
      if [ -n "$REMOVED_LEGACY_CODEX_COMMANDS" ]; then
        REMOVED_LEGACY_CODEX_COMMANDS="$REMOVED_LEGACY_CODEX_COMMANDS
$legacy_name"
        REMOVED_LEGACY_CODEX_COMMANDS_JSON="$REMOVED_LEGACY_CODEX_COMMANDS_JSON, \"$legacy_name\""
      else
        REMOVED_LEGACY_CODEX_COMMANDS="$legacy_name"
        REMOVED_LEGACY_CODEX_COMMANDS_JSON="\"$legacy_name\""
      fi
    fi
  done

  for filename in $(sp_command_files); do
    src="$COMMAND_SOURCE_ROOT/$filename"
    prompt_dest="$RESOLVED_CODEX_PROMPTS_DIR/$filename"
    command_dest="$RESOLVED_CODEX_COMMANDS_DIR/$filename"
    command_name="${filename%.md}"

    if [ ! -f "$src" ]; then
      echo "error: Codex Desktop prompt installation failed: missing source command file for $command_name" >&2
      exit 1
    fi

    if ! cp "$src" "$prompt_dest"; then
      echo "error: Codex Desktop prompt installation failed: failed to write $command_name into $RESOLVED_CODEX_PROMPTS_DIR" >&2
      exit 1
    fi

    if [ ! -f "$prompt_dest" ]; then
      echo "error: Codex Desktop prompt installation failed: failed to write $command_name into $RESOLVED_CODEX_PROMPTS_DIR" >&2
      exit 1
    fi

    if ! cp "$src" "$command_dest"; then
      echo "error: Codex Desktop prompt installation failed: failed to mirror $command_name into $RESOLVED_CODEX_COMMANDS_DIR" >&2
      exit 1
    fi

    if [ ! -f "$command_dest" ]; then
      echo "error: Codex Desktop prompt installation failed: failed to mirror $command_name into $RESOLVED_CODEX_COMMANDS_DIR" >&2
      exit 1
    fi

    if [ -n "$INSTALLED_CODEX_PROMPTS" ]; then
      INSTALLED_CODEX_PROMPTS="$INSTALLED_CODEX_PROMPTS
$command_name"
      INSTALLED_CODEX_PROMPTS_JSON="$INSTALLED_CODEX_PROMPTS_JSON, \"$command_name\""
    else
      INSTALLED_CODEX_PROMPTS="$command_name"
      INSTALLED_CODEX_PROMPTS_JSON="\"$command_name\""
    fi

    if [ -n "$INSTALLED_CODEX_COMMANDS" ]; then
      INSTALLED_CODEX_COMMANDS="$INSTALLED_CODEX_COMMANDS
$command_name"
      INSTALLED_CODEX_COMMANDS_JSON="$INSTALLED_CODEX_COMMANDS_JSON, \"$command_name\""
    else
      INSTALLED_CODEX_COMMANDS="$command_name"
      INSTALLED_CODEX_COMMANDS_JSON="\"$command_name\""
    fi
  done

  if [ -z "$INSTALLED_CODEX_PROMPTS" ]; then
    echo "error: Codex Desktop prompt installation failed: no /prompts:sp.* commands were written to $RESOLVED_CODEX_PROMPTS_DIR" >&2
    exit 1
  fi

  if [ -z "$INSTALLED_CODEX_COMMANDS" ]; then
    echo "error: Codex Desktop prompt installation failed: no mirrored /prompts:sp.* commands were written to $RESOLVED_CODEX_COMMANDS_DIR" >&2
    exit 1
  fi
}

install_claude_commands() {
  COMMAND_SOURCE_ROOT="$SOURCE_ROOT/installer-assets/claude-commands"
  if [ ! -d "$COMMAND_SOURCE_ROOT" ]; then
    echo "error: Claude command installation failed: missing installer-assets/claude-commands in source." >&2
    exit 1
  fi

  RESOLVED_CLAUDE_COMMANDS_DIR="$TARGET_ABS/.claude/commands"

  if ! mkdir -p "$RESOLVED_CLAUDE_COMMANDS_DIR"; then
    echo "error: Claude command installation failed: unable to create $RESOLVED_CLAUDE_COMMANDS_DIR" >&2
    exit 1
  fi

  INSTALLED_COMMANDS=""
  INSTALLED_COMMANDS_JSON=""

  for filename in $(sp_command_files); do
    src="$COMMAND_SOURCE_ROOT/$filename"
    dest="$RESOLVED_CLAUDE_COMMANDS_DIR/$filename"
    command_name="${filename%.md}"

    if [ ! -f "$src" ]; then
      echo "error: Claude command installation failed: missing source command file for $command_name" >&2
      exit 1
    fi

    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"

    if [ ! -f "$dest" ]; then
      echo "error: Claude command installation failed: failed to write $command_name into $RESOLVED_CLAUDE_COMMANDS_DIR" >&2
      exit 1
    fi

    if [ -n "$INSTALLED_COMMANDS" ]; then
      INSTALLED_COMMANDS="$INSTALLED_COMMANDS
$command_name"
      INSTALLED_COMMANDS_JSON="$INSTALLED_COMMANDS_JSON, \"$command_name\""
    else
      INSTALLED_COMMANDS="$command_name"
      INSTALLED_COMMANDS_JSON="\"$command_name\""
    fi
  done

  if [ -z "$INSTALLED_COMMANDS" ]; then
    echo "error: Claude command installation failed: no /sp.* commands were written to $RESOLVED_CLAUDE_COMMANDS_DIR" >&2
    exit 1
  fi
}

write_install_manifest() {
  version="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$SOURCE_ROOT/package.json" | head -n 1)"
  if [ -z "$version" ]; then
    version="unknown"
  fi

  mkdir -p "$TARGET_ABS/.sp"

  {
    echo "{"
    echo "  \"name\": \"sp-document-workflow\","
    echo "  \"version\": \"$version\","
    echo "  \"installedAt\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\","
    echo "  \"sourceMode\": \"$SOURCE_MODE\","
    echo "  \"targetDir\": \"$TARGET_ABS\""
    if [ -n "$AI_TARGET" ]; then
      echo "  ,\"ai\": \"$AI_TARGET\""
    fi
    if [ "$INSTALL_CODEX_PROMPTS" -eq 1 ]; then
      echo "  ,\"detectedCodexHome\": \"${DETECTED_CODEX_HOME:-}\""
      echo "  ,\"codexHome\": \"$RESOLVED_CODEX_HOME\""
      echo "  ,\"codexPromptsDir\": \"$RESOLVED_CODEX_PROMPTS_DIR\""
      echo "  ,\"codexCommandsDir\": \"$RESOLVED_CODEX_COMMANDS_DIR\""
      echo "  ,\"installedCodexPrompts\": [$INSTALLED_CODEX_PROMPTS_JSON]"
      echo "  ,\"installedCodexCommands\": [$INSTALLED_CODEX_COMMANDS_JSON]"
      if [ -n "$REMOVED_LEGACY_CODEX_SKILLS_JSON" ]; then
        echo "  ,\"removedLegacyCodexSkills\": [$REMOVED_LEGACY_CODEX_SKILLS_JSON]"
      fi
      if [ -n "$REMOVED_LEGACY_CODEX_PROMPTS_JSON" ]; then
        echo "  ,\"removedLegacyCodexPrompts\": [$REMOVED_LEGACY_CODEX_PROMPTS_JSON]"
      fi
      if [ -n "$REMOVED_LEGACY_CODEX_COMMANDS_JSON" ]; then
        echo "  ,\"removedLegacyCodexCommands\": [$REMOVED_LEGACY_CODEX_COMMANDS_JSON]"
      fi
    fi
    if [ "$INSTALL_CLAUDE_COMMANDS" -eq 1 ]; then
      echo "  ,\"claudeCommandsDir\": \"$RESOLVED_CLAUDE_COMMANDS_DIR\""
      echo "  ,\"installedCommands\": [$INSTALLED_COMMANDS_JSON]"
    fi
    echo "}"
  } >"$TARGET_ABS/.sp/install-manifest.json"
}

confirm_install() {
  if [ "$AUTO_YES" -eq 1 ]; then
    return 0
  fi

  if ! { exec 3<>/dev/tty; } 2>/dev/null; then
    echo "error: interactive confirmation requires a terminal." >&2
    echo "hint: rerun with --yes (or SP_INSTALL_AUTO_YES=1) for non-interactive install." >&2
    exit 1
  fi

  cat <<EOF >&3
sp installer is about to write the document-stage starter pack.

Target directory:
  $TARGET_ABS

This will install or refresh:
  - docs/sp-*.md and overview docs
  - layer-1-business-clarification/
  - layer-2-delivery/
  - .specify/memory/
  - specs/
  - .sp/install-manifest.json
EOF

  if [ "$INSTALL_CODEX_PROMPTS" -eq 1 ]; then
    cat <<EOF >&3
  - Codex Desktop prompts: $(printf '%s' "$INSTALLED_CODEX_COMMAND_NAMES_PREVIEW")

Codex integration:
  detected CODEX_HOME: ${DETECTED_CODEX_HOME:-<empty>}
  resolved Codex home: $RESOLVED_CODEX_HOME
  legacy skills directory (cleanup only): $RESOLVED_CODEX_SKILLS_DIR
  resolved prompts directory: $RESOLVED_CODEX_PROMPTS_DIR
  compatibility commands directory: $RESOLVED_CODEX_COMMANDS_DIR
EOF
  fi

  if [ "$INSTALL_CLAUDE_COMMANDS" -eq 1 ]; then
    cat <<EOF >&3
  - Claude commands: $(printf '%s' "$INSTALLED_COMMAND_NAMES_PREVIEW")

Claude integration:
  target commands directory: $RESOLVED_CLAUDE_COMMANDS_DIR
EOF
  fi

  cat <<EOF >&3

Managed paths that already exist:
  $EXISTING_COUNT

Unrelated files will not be deleted.
Continue? [y/N]:
EOF

  IFS= read -r answer <&3 || answer=""
  exec 3>&-
  exec 3<&-
  case "$answer" in
    y|Y|yes|YES)
      ;;
    *)
      echo "Installation cancelled." >&2
      exit 1
      ;;
  esac
}

if is_yes_value "$AUTO_YES"; then
  AUTO_YES=1
else
  AUTO_YES=0
fi

if is_yes_value "$AI_SKILLS_REQUESTED"; then
  AI_SKILLS_REQUESTED=1
else
  AI_SKILLS_REQUESTED=0
fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    --yes|-y)
      AUTO_YES=1
      shift
      ;;
    --archive-url)
      if [ "$#" -lt 2 ]; then
        echo "error: --archive-url requires a value." >&2
        exit 1
      fi
      ARCHIVE_URL="$2"
      shift 2
      ;;
    --ai)
      if [ "$#" -lt 2 ]; then
        echo "error: --ai requires a value." >&2
        exit 1
      fi
      AI_TARGET="$2"
      shift 2
      ;;
    --ai-skills)
      AI_SKILLS_REQUESTED=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    -*)
      echo "error: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      TARGET_DIR="$1"
      shift
      ;;
  esac
done

if [ -n "${0:-}" ]; then
  case "$0" in
    */*)
      SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
      ;;
  esac
fi

if [ -n "$SCRIPT_DIR" ] && [ -d "$SCRIPT_DIR/../docs" ] && [ -d "$SCRIPT_DIR/../installer-assets" ]; then
  SOURCE_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
  SOURCE_MODE="local"
else
  download_archive
  SOURCE_MODE="archive"
fi

if [ -n "$AI_TARGET" ] && [ "$AI_TARGET" != "codex" ] && [ "$AI_TARGET" != "claude" ]; then
  echo "error: this installer currently supports only --ai codex and --ai claude." >&2
  exit 1
fi

if [ "$AI_TARGET" = "codex" ]; then
  INSTALL_CODEX_PROMPTS=1
fi

if [ "$AI_TARGET" = "claude" ]; then
  INSTALL_CLAUDE_COMMANDS=1
fi

if [ "$AI_SKILLS_REQUESTED" -eq 1 ] && [ "$AI_TARGET" != "codex" ]; then
  echo "error: --ai-skills currently requires --ai codex." >&2
  exit 1
fi

if [ "$AI_SKILLS_REQUESTED" -eq 1 ]; then
  echo "warning: --ai-skills is deprecated and ignored. Codex now installs /prompts:sp.* only." >&2
fi

if [ "$INSTALL_CODEX_PROMPTS" -eq 1 ]; then
  resolve_codex_paths
  INSTALLED_CODEX_COMMAND_NAMES_PREVIEW="$(printf '%s' "$(sp_command_files)" | sed 's/\.md$//g' | tr '\n' ' ' | sed 's/[[:space:]][[:space:]]*/ /g; s/[[:space:]]$//')"
fi

if [ "$INSTALL_CLAUDE_COMMANDS" -eq 1 ]; then
  RESOLVED_CLAUDE_COMMANDS_DIR="$TARGET_DIR/.claude/commands"
  INSTALLED_COMMAND_NAMES_PREVIEW="$(printf '%s' "$(sp_command_files)" | sed 's/\.md$//g' | tr '\n' ' ' | sed 's/[[:space:]][[:space:]]*/ /g; s/[[:space:]]$//')"
fi

mkdir -p "$TARGET_DIR"
TARGET_ABS="$(abs_path "$TARGET_DIR")"
if [ "$INSTALL_CLAUDE_COMMANDS" -eq 1 ]; then
  RESOLVED_CLAUDE_COMMANDS_DIR="$TARGET_ABS/.claude/commands"
fi
EXISTING_COUNT="$(count_existing_targets)"
confirm_install

copy_tree "$SOURCE_ROOT/docs" "$TARGET_ABS/docs"
copy_tree "$SOURCE_ROOT/installer-assets/project/docs" "$TARGET_ABS/docs"
copy_tree "$SOURCE_ROOT/layer-1-business-clarification" "$TARGET_ABS/layer-1-business-clarification"
copy_tree "$SOURCE_ROOT/layer-2-delivery" "$TARGET_ABS/layer-2-delivery"
copy_tree "$SOURCE_ROOT/installer-assets/project/.specify/memory" "$TARGET_ABS/.specify/memory"
mkdir -p "$TARGET_ABS/specs"

if [ "$INSTALL_CODEX_PROMPTS" -eq 1 ]; then
  install_codex_commands
fi

if [ "$INSTALL_CLAUDE_COMMANDS" -eq 1 ]; then
  install_claude_commands
fi

write_install_manifest

echo "sp document-stage starter pack installed to:"
echo "  $TARGET_ABS"

if [ "$INSTALL_CODEX_PROMPTS" -eq 1 ]; then
  echo
  echo "Codex integration:"
  echo "  detected CODEX_HOME: ${DETECTED_CODEX_HOME:-<empty>}"
  echo "  resolved Codex home: $RESOLVED_CODEX_HOME"
  echo "  legacy skills directory (cleanup only): $RESOLVED_CODEX_SKILLS_DIR"
  echo "  resolved prompts directory: $RESOLVED_CODEX_PROMPTS_DIR"
  echo "  compatibility commands directory: $RESOLVED_CODEX_COMMANDS_DIR"
  echo "  installed /prompts:sp.* prompts:"
  printf '%s\n' "$INSTALLED_CODEX_PROMPTS" | while IFS= read -r command_name; do
    [ -n "$command_name" ] || continue
    echo "    - /prompts:$command_name"
  done
  echo "  mirrored /prompts:sp.* commands:"
  printf '%s\n' "$INSTALLED_CODEX_COMMANDS" | while IFS= read -r command_name; do
    [ -n "$command_name" ] || continue
    echo "    - /prompts:$command_name"
  done
  if [ -n "$REMOVED_LEGACY_CODEX_SKILLS" ]; then
    echo "  removed legacy sp-* skills:"
    printf '%s\n' "$REMOVED_LEGACY_CODEX_SKILLS" | while IFS= read -r skill_name; do
      [ -n "$skill_name" ] || continue
      echo "    - $skill_name"
    done
  fi
  if [ -n "$REMOVED_LEGACY_CODEX_PROMPTS" ]; then
    echo "  removed legacy /prompts:speckit.* prompts:"
    printf '%s\n' "$REMOVED_LEGACY_CODEX_PROMPTS" | while IFS= read -r command_name; do
      [ -n "$command_name" ] || continue
      echo "    - /prompts:$command_name"
    done
  fi
  if [ -n "$REMOVED_LEGACY_CODEX_COMMANDS" ]; then
    echo "  removed legacy /prompts:speckit.* mirrored commands:"
    printf '%s\n' "$REMOVED_LEGACY_CODEX_COMMANDS" | while IFS= read -r command_name; do
      [ -n "$command_name" ] || continue
      echo "    - /prompts:$command_name"
    done
  fi
  echo
  echo "Codex trigger examples:"
  echo "  /prompts:sp.specify"
  echo "  /prompts:sp.analyze"
  echo "  reload the Codex workspace if the new prompts do not appear immediately"
elif [ "$INSTALL_CLAUDE_COMMANDS" -eq 1 ]; then
  echo
  echo "Claude integration:"
  echo "  target commands directory: $RESOLVED_CLAUDE_COMMANDS_DIR"
  echo "  installed /sp.* commands:"
  printf '%s\n' "$INSTALLED_COMMANDS" | while IFS= read -r command_name; do
    [ -n "$command_name" ] || continue
    echo "    - /$command_name"
  done
  echo
  echo "Claude trigger examples:"
  echo "  /sp.specify"
  echo "  /sp.analyze"
  echo "  reload the Claude workspace if the new commands do not appear immediately"
else
  echo
  echo "No agent integration was installed."
  echo "To install Codex prompts, rerun with:"
  echo "  sh scripts/install.sh --ai codex ${TARGET_DIR}"
  echo "To install Claude slash commands, rerun with:"
  echo "  sh scripts/install.sh --ai claude ${TARGET_DIR}"
fi

echo
echo "Trigger conventions:"
echo "  - Codex Desktop prompts use /prompts:sp.*"
echo "  - slash-command agents use /sp.*"
echo
echo "Recommended next steps:"
echo "  1. Read docs/sp-overview.zh-CN.md or docs/sp-overview.en.md"
echo "  2. Review .specify/memory/constitution.md"
if [ "$INSTALL_CODEX_PROMPTS" -eq 1 ]; then
  echo "  3. Reload Codex, then start with /prompts:sp.specify"
elif [ "$INSTALL_CLAUDE_COMMANDS" -eq 1 ]; then
  echo "  3. Reload Claude, then start with /sp.specify"
else
  echo "  3. Install an agent integration, then start with /prompts:sp.specify or /sp.specify"
fi
