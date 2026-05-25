#!/bin/sh

set -eu

OUTPUT_JSON=0
PATHS_ONLY=0
REQUIRE_SPEC=0
REQUIRE_BUNDLE=0
REQUIRE_PLAN=0
REQUIRE_TASKS=0
INCLUDE_TASKS=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --json)
      OUTPUT_JSON=1
      ;;
    --paths-only)
      PATHS_ONLY=1
      ;;
    --require-spec)
      REQUIRE_SPEC=1
      ;;
    --require-bundle)
      REQUIRE_BUNDLE=1
      ;;
    --require-plan)
      REQUIRE_PLAN=1
      ;;
    --require-tasks)
      REQUIRE_TASKS=1
      ;;
    --include-tasks)
      INCLUDE_TASKS=1
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

PROJECT_ROOT="$(pwd)"
ACTIVE_CONTEXT_PATH=".specify/memory/active-context.md"
PROJECT_INDEX_PATH=".specify/memory/project-index.md"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

find_feature_from_active_context() {
  if [ ! -f "$ACTIVE_CONTEXT_PATH" ]; then
    return 0
  fi

  sed -n 's#.*specs/\([^/]*\)/.*#\1#p' "$ACTIVE_CONTEXT_PATH" | head -n 1
}

find_single_feature() {
  if [ ! -d "specs" ]; then
    return 0
  fi

  matches="$(find specs -type f -path 'specs/*/memory/index.md' 2>/dev/null | sed 's#^specs/\([^/]*\)/memory/index\.md$#\1#' | sort | uniq)"
  count="$(printf '%s\n' "$matches" | sed '/^$/d' | wc -l | tr -d ' ')"

  if [ "$count" = "1" ]; then
    printf '%s\n' "$matches" | sed '/^$/d'
  fi
}

ACTIVE_FEATURE="$(find_feature_from_active_context || true)"
if [ -z "$ACTIVE_FEATURE" ]; then
  ACTIVE_FEATURE="$(find_single_feature || true)"
fi

FEATURE_DIR=""
SPEC_PATH=""
BUNDLE_PATH=""
PLAN_PATH=""
TASKS_PATH=""

if [ -n "$ACTIVE_FEATURE" ]; then
  FEATURE_DIR="specs/$ACTIVE_FEATURE"
  SPEC_PATH="$FEATURE_DIR/spec.md"
  BUNDLE_PATH="$FEATURE_DIR/bundle.md"
  PLAN_PATH="$FEATURE_DIR/plan.md"
  TASKS_PATH="$FEATURE_DIR/tasks.md"
fi

missing=""

require_path() {
  label="$1"
  path="$2"

  if [ -z "$path" ] || [ ! -f "$path" ]; then
    if [ -n "$missing" ]; then
      missing="$missing,$label"
    else
      missing="$label"
    fi
  fi
}

if [ "$REQUIRE_SPEC" -eq 1 ]; then
  require_path "spec" "$SPEC_PATH"
fi

if [ "$REQUIRE_BUNDLE" -eq 1 ]; then
  require_path "bundle" "$BUNDLE_PATH"
fi

if [ "$REQUIRE_PLAN" -eq 1 ]; then
  require_path "plan" "$PLAN_PATH"
fi

if [ "$REQUIRE_TASKS" -eq 1 ]; then
  require_path "tasks" "$TASKS_PATH"
fi

if [ "$OUTPUT_JSON" -eq 1 ]; then
  printf '{\n'
  printf '  "projectRoot": "%s",\n' "$(json_escape "$PROJECT_ROOT")"
  printf '  "activeFeature": "%s",\n' "$(json_escape "$ACTIVE_FEATURE")"
  printf '  "featureDir": "%s",\n' "$(json_escape "$FEATURE_DIR")"
  printf '  "projectIndexPath": "%s",\n' "$(json_escape "$PROJECT_INDEX_PATH")"
  printf '  "activeContextPath": "%s",\n' "$(json_escape "$ACTIVE_CONTEXT_PATH")"
  printf '  "specPath": "%s",\n' "$(json_escape "$SPEC_PATH")"
  printf '  "bundlePath": "%s",\n' "$(json_escape "$BUNDLE_PATH")"
  printf '  "planPath": "%s",\n' "$(json_escape "$PLAN_PATH")"
  if [ "$INCLUDE_TASKS" -eq 1 ]; then
    printf '  "tasksPath": "%s",\n' "$(json_escape "$TASKS_PATH")"
  else
    printf '  "tasksPath": "",\n'
  fi
  printf '  "missing": [%s]\n' "$(printf '%s' "$missing" | awk -F',' 'BEGIN { first = 1 } { for (i = 1; i <= NF; i++) if ($i != "") { if (!first) printf ", "; printf "\"%s\"", $i; first = 0 } }')"
  printf '}\n'
elif [ "$PATHS_ONLY" -eq 1 ]; then
  printf 'PROJECT_ROOT=%s\n' "$PROJECT_ROOT"
  printf 'ACTIVE_FEATURE=%s\n' "$ACTIVE_FEATURE"
  printf 'FEATURE_DIR=%s\n' "$FEATURE_DIR"
  printf 'SPEC_PATH=%s\n' "$SPEC_PATH"
  printf 'BUNDLE_PATH=%s\n' "$BUNDLE_PATH"
  printf 'PLAN_PATH=%s\n' "$PLAN_PATH"
  if [ "$INCLUDE_TASKS" -eq 1 ]; then
    printf 'TASKS_PATH=%s\n' "$TASKS_PATH"
  fi
else
  echo "Project root: $PROJECT_ROOT"
  echo "Active feature: ${ACTIVE_FEATURE:-<unresolved>}"
  if [ -n "$FEATURE_DIR" ]; then
    echo "Feature directory: $FEATURE_DIR"
  fi
fi

if [ -n "$missing" ]; then
  echo "Missing required stage outputs: $missing" >&2
  exit 1
fi
