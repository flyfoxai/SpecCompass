#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
SOURCE_ROOT=""
ARCHIVE_URL="${SP_INSTALL_ARCHIVE_URL:-}"
TARGET_DIR="${SP_INSTALL_TARGET_DIR:-}"
AUTO_YES="${SP_INSTALL_AUTO_YES:-0}"
AI_TARGET="${SP_INSTALL_AI:-}"
SCRIPT_TYPE="${SP_INSTALL_SCRIPT_TYPE:-}"
AI_SKILLS="${SP_INSTALL_AI_SKILLS:-0}"
IGNORE_AGENT_TOOLS="${SP_INSTALL_IGNORE_AGENT_TOOLS:-0}"
NO_GIT="${SP_INSTALL_NO_GIT:-0}"
PRESET_ID="${SP_INSTALL_PRESET:-}"
BRANCH_NUMBERING="${SP_INSTALL_BRANCH_NUMBERING:-}"
INTEGRATION_TARGET="${SP_INSTALL_INTEGRATION:-}"
INTEGRATION_OPTIONS="${SP_INSTALL_INTEGRATION_OPTIONS:-}"
AI_COMMANDS_DIR="${SP_INSTALL_AI_COMMANDS_DIR:-}"
DOWNLOAD_DIR=""
PYCACHE_DIR=""

cleanup() {
  if [ -n "$DOWNLOAD_DIR" ] && [ -d "$DOWNLOAD_DIR" ]; then
    rm -rf "$DOWNLOAD_DIR"
  fi
  if [ -n "$PYCACHE_DIR" ] && [ -d "$PYCACHE_DIR" ]; then
    rm -rf "$PYCACHE_DIR"
  fi
}

trap cleanup EXIT INT TERM

usage() {
  cat <<'EOF'
Usage:
  sh scripts/install.sh [target_dir]
  sh scripts/install.sh --yes [target_dir]
  sh scripts/install.sh --ai codex [target_dir]
  sh scripts/install.sh --ai claude [target_dir]
  sh scripts/install.sh --archive-url <tar.gz-url> [target_dir]

Behavior:
  - This wrapper now delegates to the upstream-style local CLI: `specify init`.
  - If target_dir is omitted, initialization runs in the current directory (`specify init --here`).
  - `--yes` maps to `specify init --force`.
  - `--archive-url` is only used when the local repository source tree is unavailable.
  - Legacy global Codex prompt mirroring is no longer the primary install path.
  - Active integration output is project-local and handled by `src/specify_cli`.
EOF
}

require_value() {
  if [ $# -lt 2 ] || [ -z "${2:-}" ]; then
    echo "error: missing value for $1" >&2
    exit 1
  fi
}

resolve_source_root() {
  local_root=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
  if [ -f "$local_root/pyproject.toml" ] && [ -d "$local_root/src/specify_cli" ]; then
    SOURCE_ROOT="$local_root"
    return
  fi

  if [ -z "$ARCHIVE_URL" ]; then
    echo "error: unable to resolve local source root and no --archive-url was provided." >&2
    exit 1
  fi

  if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    echo "error: curl or wget is required to download the install archive." >&2
    exit 1
  fi

  DOWNLOAD_DIR=$(mktemp -d "${TMPDIR:-/tmp}/sp-install.XXXXXX")
  archive_path="$DOWNLOAD_DIR/sp-install.tar.gz"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$ARCHIVE_URL" -o "$archive_path"
  else
    wget -qO "$archive_path" "$ARCHIVE_URL"
  fi

  tar -xzf "$archive_path" -C "$DOWNLOAD_DIR"

  if [ -f "$DOWNLOAD_DIR/pyproject.toml" ] && [ -d "$DOWNLOAD_DIR/src/specify_cli" ]; then
    SOURCE_ROOT="$DOWNLOAD_DIR"
    return
  fi

  for candidate in "$DOWNLOAD_DIR"/*; do
    if [ -f "$candidate/pyproject.toml" ] && [ -d "$candidate/src/specify_cli" ]; then
      SOURCE_ROOT="$candidate"
      return
    fi
  done

  echo "error: downloaded archive does not contain a runnable specify-cli source tree." >&2
  exit 1
}

run_specify() {
  PYCACHE_DIR=$(mktemp -d "${TMPDIR:-/tmp}/specify-pyc.XXXXXX")

  if command -v uv >/dev/null 2>&1; then
    PYTHONPYCACHEPREFIX="$PYCACHE_DIR" uv run --project "$SOURCE_ROOT" specify "$@"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    PYTHONPATH="$SOURCE_ROOT/src${PYTHONPATH:+:$PYTHONPATH}" \
    PYTHONPYCACHEPREFIX="$PYCACHE_DIR" \
    python3 -m specify_cli "$@"
    return
  fi

  if command -v python >/dev/null 2>&1; then
    PYTHONPATH="$SOURCE_ROOT/src${PYTHONPATH:+:$PYTHONPATH}" \
    PYTHONPYCACHEPREFIX="$PYCACHE_DIR" \
    python -m specify_cli "$@"
    return
  fi

  echo "error: uv, python3, or python is required to run specify init." >&2
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --yes)
      AUTO_YES=1
      ;;
    --archive-url)
      require_value "$1" "${2:-}"
      ARCHIVE_URL="$2"
      shift
      ;;
    --ai)
      require_value "$1" "${2:-}"
      AI_TARGET="$2"
      shift
      ;;
    --script)
      require_value "$1" "${2:-}"
      SCRIPT_TYPE="$2"
      shift
      ;;
    --ai-skills)
      AI_SKILLS=1
      ;;
    --ignore-agent-tools)
      IGNORE_AGENT_TOOLS=1
      ;;
    --no-git)
      NO_GIT=1
      ;;
    --preset)
      require_value "$1" "${2:-}"
      PRESET_ID="$2"
      shift
      ;;
    --branch-numbering)
      require_value "$1" "${2:-}"
      BRANCH_NUMBERING="$2"
      shift
      ;;
    --integration)
      require_value "$1" "${2:-}"
      INTEGRATION_TARGET="$2"
      shift
      ;;
    --integration-options)
      require_value "$1" "${2:-}"
      INTEGRATION_OPTIONS="$2"
      shift
      ;;
    --ai-commands-dir)
      require_value "$1" "${2:-}"
      AI_COMMANDS_DIR="$2"
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "error: unsupported option: $1" >&2
      echo "hint: use 'specify init --help' for the full upstream CLI surface." >&2
      exit 1
      ;;
    *)
      if [ -n "$TARGET_DIR" ]; then
        echo "error: multiple target directories supplied: '$TARGET_DIR' and '$1'" >&2
        exit 1
      fi
      TARGET_DIR="$1"
      ;;
  esac
  shift
done

if [ $# -gt 0 ]; then
  echo "error: unsupported trailing arguments: $*" >&2
  exit 1
fi

resolve_source_root

set -- init

if [ -n "$AI_TARGET" ]; then
  set -- "$@" --ai "$AI_TARGET"
fi
if [ -n "$SCRIPT_TYPE" ]; then
  set -- "$@" --script "$SCRIPT_TYPE"
fi
if [ "$AI_SKILLS" = "1" ]; then
  set -- "$@" --ai-skills
fi
if [ "$IGNORE_AGENT_TOOLS" = "1" ]; then
  set -- "$@" --ignore-agent-tools
fi
if [ "$NO_GIT" = "1" ]; then
  set -- "$@" --no-git
fi
if [ -n "$PRESET_ID" ]; then
  set -- "$@" --preset "$PRESET_ID"
fi
if [ -n "$BRANCH_NUMBERING" ]; then
  set -- "$@" --branch-numbering "$BRANCH_NUMBERING"
fi
if [ -n "$INTEGRATION_TARGET" ]; then
  set -- "$@" --integration "$INTEGRATION_TARGET"
fi
if [ -n "$INTEGRATION_OPTIONS" ]; then
  set -- "$@" --integration-options "$INTEGRATION_OPTIONS"
fi
if [ -n "$AI_COMMANDS_DIR" ]; then
  set -- "$@" --ai-commands-dir "$AI_COMMANDS_DIR"
fi
if [ "$AUTO_YES" = "1" ]; then
  set -- "$@" --force
fi

if [ -z "$TARGET_DIR" ] || [ "$TARGET_DIR" = "." ]; then
  set -- "$@" --here
else
  set -- "$@" "$TARGET_DIR"
fi

run_specify "$@"
