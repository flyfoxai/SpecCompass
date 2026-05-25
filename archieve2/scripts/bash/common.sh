#!/usr/bin/env bash
# Common functions and variables for all scripts

# Find repository root by searching upward for .specify directory
# This is the primary marker for spec-kit projects
find_specify_root() {
    local dir="${1:-$(pwd)}"
    # Normalize to absolute path to prevent infinite loop with relative paths
    # Use -- to handle paths starting with - (e.g., -P, -L)
    dir="$(cd -- "$dir" 2>/dev/null && pwd)" || return 1
    local prev_dir=""
    while true; do
        if [ -d "$dir/.specify" ]; then
            echo "$dir"
            return 0
        fi
        # Stop if we've reached filesystem root or dirname stops changing
        if [ "$dir" = "/" ] || [ "$dir" = "$prev_dir" ]; then
            break
        fi
        prev_dir="$dir"
        dir="$(dirname "$dir")"
    done
    return 1
}

# Get repository root, prioritizing .specify directory over git
# This prevents using a parent git repo when spec-kit is initialized in a subdirectory
get_repo_root() {
    # First, look for .specify directory (spec-kit's own marker)
    local specify_root
    if specify_root=$(find_specify_root); then
        echo "$specify_root"
        return
    fi

    # Fallback to git if no .specify found
    if git rev-parse --show-toplevel >/dev/null 2>&1; then
        git rev-parse --show-toplevel
        return
    fi

    # Final fallback to script location for non-git repos
    local script_dir="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    (cd "$script_dir/../../.." && pwd)
}

# Get current branch, with fallback for non-git repositories
get_current_branch() {
    # First check if SPECIFY_FEATURE environment variable is set
    if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
        echo "$SPECIFY_FEATURE"
        return
    fi

    # Then check git if available at the spec-kit root (not parent)
    local repo_root=$(get_repo_root)
    if has_git; then
        git -C "$repo_root" rev-parse --abbrev-ref HEAD
        return
    fi

    # For non-git repos, try to find the latest feature directory
    local specs_dir="$repo_root/specs"

    if [[ -d "$specs_dir" ]]; then
        local latest_feature=""
        local highest=0
        local latest_timestamp=""

        for dir in "$specs_dir"/*; do
            if [[ -d "$dir" ]]; then
                local dirname=$(basename "$dir")
                if [[ "$dirname" =~ ^([0-9]{8}-[0-9]{6})- ]]; then
                    # Timestamp-based branch: compare lexicographically
                    local ts="${BASH_REMATCH[1]}"
                    if [[ "$ts" > "$latest_timestamp" ]]; then
                        latest_timestamp="$ts"
                        latest_feature=$dirname
                    fi
                elif [[ "$dirname" =~ ^([0-9]{3,})- ]]; then
                    local number=${BASH_REMATCH[1]}
                    number=$((10#$number))
                    if [[ "$number" -gt "$highest" ]]; then
                        highest=$number
                        # Only update if no timestamp branch found yet
                        if [[ -z "$latest_timestamp" ]]; then
                            latest_feature=$dirname
                        fi
                    fi
                fi
            fi
        done

        if [[ -n "$latest_feature" ]]; then
            echo "$latest_feature"
            return
        fi
    fi

    echo "main"  # Final fallback
}

# Check if we have git available at the spec-kit root level
# Returns true only if git is installed and the repo root is inside a git work tree
# Handles both regular repos (.git directory) and worktrees/submodules (.git file)
has_git() {
    # First check if git command is available (before calling get_repo_root which may use git)
    command -v git >/dev/null 2>&1 || return 1
    local repo_root=$(get_repo_root)
    # Check if .git exists (directory or file for worktrees/submodules)
    [ -e "$repo_root/.git" ] || return 1
    # Verify it's actually a valid git work tree
    git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

check_feature_branch() {
    local branch="$1"
    local has_git_repo="$2"

    # For non-git repos, we can't enforce branch naming but still provide output
    if [[ "$has_git_repo" != "true" ]]; then
        echo "[specify] Warning: Git repository not detected; skipped branch validation" >&2
        return 0
    fi

    # Accept sequential prefix (3+ digits) but exclude malformed timestamps
    # Malformed: 7-or-8 digit date + 6-digit time with no trailing slug (e.g. "2026031-143022" or "20260319-143022")
    local is_sequential=false
    if [[ "$branch" =~ ^[0-9]{3,}- ]] && [[ ! "$branch" =~ ^[0-9]{7}-[0-9]{6}- ]] && [[ ! "$branch" =~ ^[0-9]{7,8}-[0-9]{6}$ ]]; then
        is_sequential=true
    fi
    if [[ "$is_sequential" != "true" ]] && [[ ! "$branch" =~ ^[0-9]{8}-[0-9]{6}- ]]; then
        echo "ERROR: Not on a feature branch. Current branch: $branch" >&2
        echo "Feature branches should be named like: 001-feature-name, 1234-feature-name, or 20260319-143022-feature-name" >&2
        return 1
    fi

    return 0
}

get_feature_dir() { echo "$1/specs/$2"; }

# Find feature directory by numeric prefix instead of exact branch match
# This allows multiple branches to work on the same spec (e.g., 004-fix-bug, 004-add-feature)
find_feature_dir_by_prefix() {
    local repo_root="$1"
    local branch_name="$2"
    local specs_dir="$repo_root/specs"

    # Extract prefix from branch (e.g., "004" from "004-whatever" or "20260319-143022" from timestamp branches)
    local prefix=""
    if [[ "$branch_name" =~ ^([0-9]{8}-[0-9]{6})- ]]; then
        prefix="${BASH_REMATCH[1]}"
    elif [[ "$branch_name" =~ ^([0-9]{3,})- ]]; then
        prefix="${BASH_REMATCH[1]}"
    else
        # If branch doesn't have a recognized prefix, fall back to exact match
        echo "$specs_dir/$branch_name"
        return
    fi

    # Search for directories in specs/ that start with this prefix
    local matches=()
    if [[ -d "$specs_dir" ]]; then
        for dir in "$specs_dir"/"$prefix"-*; do
            if [[ -d "$dir" ]]; then
                matches+=("$(basename "$dir")")
            fi
        done
    fi

    # Handle results
    if [[ ${#matches[@]} -eq 0 ]]; then
        # No match found - return the branch name path (will fail later with clear error)
        echo "$specs_dir/$branch_name"
    elif [[ ${#matches[@]} -eq 1 ]]; then
        # Exactly one match - perfect!
        echo "$specs_dir/${matches[0]}"
    else
        # Multiple matches - this shouldn't happen with proper naming convention
        echo "ERROR: Multiple spec directories found with prefix '$prefix': ${matches[*]}" >&2
        echo "Please ensure only one spec directory exists per prefix." >&2
        return 1
    fi
}

get_feature_paths() {
    local repo_root=$(get_repo_root)
    local current_branch=$(get_current_branch)
    local has_git_repo="false"

    if has_git; then
        has_git_repo="true"
    fi

    # Resolve feature directory.  Priority:
    #   1. SPECIFY_FEATURE_DIRECTORY env var (explicit override)
    #   2. .specify/feature.json "feature_directory" key (persisted by /speckit.specify)
    #   3. Branch-name-based prefix lookup (legacy fallback)
    local feature_dir
    if [[ -n "${SPECIFY_FEATURE_DIRECTORY:-}" ]]; then
        feature_dir="$SPECIFY_FEATURE_DIRECTORY"
        # Normalize relative paths to absolute under repo root
        [[ "$feature_dir" != /* ]] && feature_dir="$repo_root/$feature_dir"
    elif [[ -f "$repo_root/.specify/feature.json" ]]; then
        local _fd
        if command -v jq >/dev/null 2>&1; then
            _fd=$(jq -r '.feature_directory // empty' "$repo_root/.specify/feature.json" 2>/dev/null)
        elif command -v python3 >/dev/null 2>&1; then
            # Fallback: use Python to parse JSON so pretty-printed/multi-line files work
            _fd=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(d.get('feature_directory',''))" "$repo_root/.specify/feature.json" 2>/dev/null)
        else
            # Last resort: single-line grep fallback (won't work on multi-line JSON)
            _fd=$(grep -o '"feature_directory"[[:space:]]*:[[:space:]]*"[^"]*"' "$repo_root/.specify/feature.json" 2>/dev/null | sed 's/.*"\([^"]*\)"$/\1/')
        fi
        if [[ -n "$_fd" ]]; then
            feature_dir="$_fd"
            # Normalize relative paths to absolute under repo root
            [[ "$feature_dir" != /* ]] && feature_dir="$repo_root/$feature_dir"
        elif ! feature_dir=$(find_feature_dir_by_prefix "$repo_root" "$current_branch"); then
            echo "ERROR: Failed to resolve feature directory" >&2
            return 1
        fi
    elif ! feature_dir=$(find_feature_dir_by_prefix "$repo_root" "$current_branch"); then
        echo "ERROR: Failed to resolve feature directory" >&2
        return 1
    fi

    # Use printf '%q' to safely quote values, preventing shell injection
    # via crafted branch names or paths containing special characters
    printf 'REPO_ROOT=%q\n' "$repo_root"
    printf 'CURRENT_BRANCH=%q\n' "$current_branch"
    printf 'HAS_GIT=%q\n' "$has_git_repo"
    printf 'FEATURE_DIR=%q\n' "$feature_dir"
    printf 'FEATURE_SPEC=%q\n' "$feature_dir/spec.md"
    printf 'IMPL_PLAN=%q\n' "$feature_dir/plan.md"
    printf 'TASKS=%q\n' "$feature_dir/tasks.md"
    printf 'RESEARCH=%q\n' "$feature_dir/research.md"
    printf 'DATA_MODEL=%q\n' "$feature_dir/data-model.md"
    printf 'QUICKSTART=%q\n' "$feature_dir/quickstart.md"
    printf 'CONTRACTS_DIR=%q\n' "$feature_dir/contracts"
}

# Check if jq is available for safe JSON construction
has_jq() {
    command -v jq >/dev/null 2>&1
}

# Escape a string for safe embedding in a JSON value (fallback when jq is unavailable).
# Handles backslash, double-quote, and JSON-required control character escapes (RFC 8259).
json_escape() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\t'/\\t}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\b'/\\b}"
    s="${s//$'\f'/\\f}"
    # Escape any remaining U+0001-U+001F control characters as \uXXXX.
    # (U+0000/NUL cannot appear in bash strings and is excluded.)
    # LC_ALL=C ensures ${#s} counts bytes and ${s:$i:1} yields single bytes,
    # so multi-byte UTF-8 sequences (first byte >= 0xC0) pass through intact.
    local LC_ALL=C
    local i char code
    for (( i=0; i<${#s}; i++ )); do
        char="${s:$i:1}"
        printf -v code '%d' "'$char" 2>/dev/null || code=256
        if (( code >= 1 && code <= 31 )); then
            printf '\\u%04x' "$code"
        else
            printf '%s' "$char"
        fi
    done
}

check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }

# Resolve a template name to a file path using the priority stack:
#   1. .specify/templates/overrides/
#   2. .specify/presets/<preset-id>/templates/ (sorted by priority from .registry)
#   3. .specify/extensions/<ext-id>/templates/
#   4. .specify/templates/ (core)
resolve_template() {
    local template_name="$1"
    local repo_root="$2"
    local base="$repo_root/.specify/templates"

    # Priority 1: Project overrides
    local override="$base/overrides/${template_name}.md"
    [ -f "$override" ] && echo "$override" && return 0

    # Priority 2: Installed presets (sorted by priority from .registry)
    local presets_dir="$repo_root/.specify/presets"
    if [ -d "$presets_dir" ]; then
        local registry_file="$presets_dir/.registry"
        if [ -f "$registry_file" ] && command -v python3 >/dev/null 2>&1; then
            # Read preset IDs sorted by priority (lower number = higher precedence).
            # The python3 call is wrapped in an if-condition so that set -e does not
            # abort the function when python3 exits non-zero (e.g. invalid JSON).
            local sorted_presets=""
            if sorted_presets=$(SPECKIT_REGISTRY="$registry_file" python3 -c "
import json, sys, os
try:
    with open(os.environ['SPECKIT_REGISTRY']) as f:
        data = json.load(f)
    presets = data.get('presets', {})
    for pid, meta in sorted(presets.items(), key=lambda x: x[1].get('priority', 10)):
        print(pid)
except Exception:
    sys.exit(1)
" 2>/dev/null); then
                if [ -n "$sorted_presets" ]; then
                    # python3 succeeded and returned preset IDs — search in priority order
                    while IFS= read -r preset_id; do
                        local candidate="$presets_dir/$preset_id/templates/${template_name}.md"
                        [ -f "$candidate" ] && echo "$candidate" && return 0
                    done <<< "$sorted_presets"
                fi
                # python3 succeeded but registry has no presets — nothing to search
            else
                # python3 failed (missing, or registry parse error) — fall back to unordered directory scan
                for preset in "$presets_dir"/*/; do
                    [ -d "$preset" ] || continue
                    local candidate="$preset/templates/${template_name}.md"
                    [ -f "$candidate" ] && echo "$candidate" && return 0
                done
            fi
        else
            # Fallback: alphabetical directory order (no python3 available)
            for preset in "$presets_dir"/*/; do
                [ -d "$preset" ] || continue
                local candidate="$preset/templates/${template_name}.md"
                [ -f "$candidate" ] && echo "$candidate" && return 0
            done
        fi
    fi

    # Priority 3: Extension-provided templates
    local ext_dir="$repo_root/.specify/extensions"
    if [ -d "$ext_dir" ]; then
        for ext in "$ext_dir"/*/; do
            [ -d "$ext" ] || continue
            # Skip hidden directories (e.g. .backup, .cache)
            case "$(basename "$ext")" in .*) continue;; esac
            local candidate="$ext/templates/${template_name}.md"
            [ -f "$candidate" ] && echo "$candidate" && return 0
        done
    fi

    # Priority 4: Core templates
    local core="$base/${template_name}.md"
    [ -f "$core" ] && echo "$core" && return 0

    # Template not found in any location.
    # Return 1 so callers can distinguish "not found" from "found".
    # Callers running under set -e should use: TEMPLATE=$(resolve_template ...) || true
    return 1
}

resolve_template_tree_root() {
    local tree_name="$1"
    local repo_root="$2"
    local base="$repo_root/.specify/templates"

    local override="$base/overrides/$tree_name"
    [ -d "$override" ] && echo "$override" && return 0

    local presets_dir="$repo_root/.specify/presets"
    if [ -d "$presets_dir" ]; then
        local registry_file="$presets_dir/.registry"
        if [ -f "$registry_file" ] && command -v python3 >/dev/null 2>&1; then
            local sorted_presets=""
            if sorted_presets=$(SPECKIT_REGISTRY="$registry_file" python3 -c "
import json, sys, os
try:
    with open(os.environ['SPECKIT_REGISTRY']) as f:
        data = json.load(f)
    presets = data.get('presets', {})
    for pid, meta in sorted(presets.items(), key=lambda x: x[1].get('priority', 10)):
        print(pid)
except Exception:
    sys.exit(1)
" 2>/dev/null); then
                if [ -n "$sorted_presets" ]; then
                    while IFS= read -r preset_id; do
                        local candidate="$presets_dir/$preset_id/templates/$tree_name"
                        [ -d "$candidate" ] && echo "$candidate" && return 0
                    done <<< "$sorted_presets"
                fi
            else
                for preset in "$presets_dir"/*/; do
                    [ -d "$preset" ] || continue
                    local candidate="$preset/templates/$tree_name"
                    [ -d "$candidate" ] && echo "$candidate" && return 0
                done
            fi
        else
            for preset in "$presets_dir"/*/; do
                [ -d "$preset" ] || continue
                local candidate="$preset/templates/$tree_name"
                [ -d "$candidate" ] && echo "$candidate" && return 0
            done
        fi
    fi

    local ext_dir="$repo_root/.specify/extensions"
    if [ -d "$ext_dir" ]; then
        for ext in "$ext_dir"/*/; do
            [ -d "$ext" ] || continue
            case "$(basename "$ext")" in .*) continue;; esac
            local candidate="$ext/templates/$tree_name"
            [ -d "$candidate" ] && echo "$candidate" && return 0
        done
    fi

    local core="$base/$tree_name"
    [ -d "$core" ] && echo "$core" && return 0
    return 1
}

feature_slug_from_branch() {
    local branch_name="$1"
    local slug="$branch_name"
    slug="${slug##*/}"
    slug="$(echo "$slug" | sed -E 's/^[0-9]{8}-[0-9]{6}-//; s/^[0-9]{3,}-//')"
    if [ -z "$slug" ]; then
        slug="$(basename "$branch_name")"
    fi
    echo "$slug"
}

feature_title_from_branch() {
    local slug
    slug="$(feature_slug_from_branch "$1")"
    echo "$slug" | tr '-' ' ' | awk '{ for (i = 1; i <= NF; i++) $i = toupper(substr($i,1,1)) substr($i,2); print }'
}

normalize_feature_description() {
    local description="$1"
    description="$(printf '%s' "$description" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//')"
    if [ -z "$description" ]; then
        description="$(feature_title_from_branch "$2")"
    fi
    printf '%s' "$description"
}

json_escape_file_token() {
    printf '%s' "$1" | sed -e 's/[\\/&|]/\\&/g'
}

write_feature_context() {
    local repo_root="$1"
    local feature_dir="$2"
    local rel_feature_dir="${feature_dir#$repo_root/}"
    local feature_json="$repo_root/.specify/feature.json"

    mkdir -p "$(dirname "$feature_json")"
    printf '{\n  "feature_directory": "%s"\n}\n' "$(json_escape "$rel_feature_dir")" > "$feature_json"
}

render_feature_template() {
    local src_path="$1"
    local branch_name="$2"
    local feature_dir="$3"
    local feature_description="$4"
    local feature_slug feature_title feature_date feature_relpath
    feature_slug="$(feature_slug_from_branch "$branch_name")"
    feature_title="$(feature_title_from_branch "$branch_name")"
    feature_date="$(date +%Y-%m-%d)"
    feature_relpath="${feature_dir#$(get_repo_root)/}"
    feature_description="$(normalize_feature_description "$feature_description" "$branch_name")"

    sed \
        -e "s|__FEATURE_BRANCH__|$(json_escape_file_token "$branch_name")|g" \
        -e "s|__FEATURE_SLUG__|$(json_escape_file_token "$feature_slug")|g" \
        -e "s|__FEATURE_TITLE__|$(json_escape_file_token "$feature_title")|g" \
        -e "s|__FEATURE_DATE__|$(json_escape_file_token "$feature_date")|g" \
        -e "s|__FEATURE_PATH__|$(json_escape_file_token "$feature_relpath")|g" \
        -e "s|__FEATURE_DESCRIPTION__|$(json_escape_file_token "$feature_description")|g" \
        "$src_path"
}

instantiate_template_file() {
    local src_path="$1"
    local dst_path="$2"
    local branch_name="$3"
    local feature_dir="$4"
    local feature_description="$5"

    [ -f "$src_path" ] || return 0
    mkdir -p "$(dirname "$dst_path")"
    render_feature_template "$src_path" "$branch_name" "$feature_dir" "$feature_description" > "$dst_path"
}

instantiate_template_tree() {
    local template_root="$1"
    local target_root="$2"
    local branch_name="$3"
    local feature_description="$4"

    [ -d "$template_root" ] || return 0

    while IFS= read -r -d '' src_path; do
        local rel_path dst_path
        rel_path="${src_path#$template_root/}"
        dst_path="$target_root/$rel_path"
        [ -e "$dst_path" ] && continue
        instantiate_template_file "$src_path" "$dst_path" "$branch_name" "$target_root" "$feature_description"
    done < <(find "$template_root" -type f -print0)
}

resolve_active_feature_name() {
    local repo_root="$1"
    local explicit_feature_dir="${2:-}"
    local feature_name=""

    if [ -n "$explicit_feature_dir" ] && [ -d "$explicit_feature_dir" ]; then
        feature_name="$(basename "$explicit_feature_dir")"
    elif [ -f "$repo_root/.specify/feature.json" ]; then
        local configured_dir=""
        if command -v jq >/dev/null 2>&1; then
            configured_dir="$(jq -r '.feature_directory // empty' "$repo_root/.specify/feature.json" 2>/dev/null)"
        elif command -v python3 >/dev/null 2>&1; then
            configured_dir="$(python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(d.get('feature_directory',''))" "$repo_root/.specify/feature.json" 2>/dev/null)"
        fi
        if [ -n "$configured_dir" ]; then
            configured_dir="${configured_dir##*/}"
            feature_name="$configured_dir"
        fi
    fi

    if [ -z "$feature_name" ] && [ -d "$repo_root/specs" ]; then
        local discovered
        discovered="$(find "$repo_root/specs" -mindepth 1 -maxdepth 1 -type d | sort)"
        local count
        count="$(printf '%s\n' "$discovered" | sed '/^$/d' | wc -l | tr -d ' ')"
        if [ "$count" = "1" ]; then
            feature_name="$(basename "$(printf '%s\n' "$discovered" | sed '/^$/d')")"
        fi
    fi

    printf '%s' "$feature_name"
}

feature_stage_label() {
    local feature_dir="$1"
    if [ -f "$feature_dir/tasks.md" ]; then
        printf 'tasks prepared'
    elif [ -f "$feature_dir/plan.md" ]; then
        printf 'planning ready'
    elif [ -f "$feature_dir/bundle.md" ]; then
        printf 'bundle ready'
    elif [ -f "$feature_dir/gate.md" ]; then
        printf 'gate documented'
    elif [ -f "$feature_dir/clarifications.md" ]; then
        printf 'clarified'
    elif [ -f "$feature_dir/spec.md" ]; then
        printf 'specified'
    else
        printf 'scaffolded'
    fi
}

feature_status_verdict() {
    local file_path="$1"
    local default_value="$2"
    if [ ! -f "$file_path" ]; then
        printf '%s' "$default_value"
        return
    fi

    local verdict_line verdict_value
    verdict_line="$(grep -m1 'Current Verdict:' "$file_path" 2>/dev/null || true)"
    if [ -n "$verdict_line" ]; then
        verdict_value="$(printf '%s\n' "$verdict_line" | sed -E 's/^[[:space:]-]*Current Verdict:[[:space:]]*`?([^`]+)`?[[:space:]]*$/\1/')"
        if [ -n "$verdict_value" ] && [ "$verdict_value" != "$verdict_line" ]; then
            printf '%s' "$verdict_value"
            return
        fi
    fi

    if grep -Eq '\bFAIL\b' "$file_path"; then
        printf 'FAIL'
    elif grep -Eq '\bPASS\b' "$file_path"; then
        printf 'PASS'
    else
        printf 'recorded'
    fi
}

feature_primary_workset() {
    local feature_dir="$1"
    local first_workset=""
    if [ -d "$feature_dir/memory/worksets" ]; then
        first_workset="$(find "$feature_dir/memory/worksets" -maxdepth 1 -type f -name 'ws-*.md' | sort | head -n 1)"
    fi
    if [ -n "$first_workset" ]; then
        basename "$first_workset" .md
    else
        printf 'not selected'
    fi
}

sync_project_memory() {
    local repo_root="$1"
    local explicit_feature_dir="${2:-}"
    local memory_dir="$repo_root/.specify/memory"
    local project_name refresh_date active_feature active_feature_dir active_workset active_stage latest_gate latest_analysis
    local feature_rows=""
    local feature_count=0

    mkdir -p "$memory_dir"
    project_name="$(basename "$repo_root")"
    refresh_date="$(date +%Y-%m-%d)"
    active_feature="$(resolve_active_feature_name "$repo_root" "$explicit_feature_dir")"
    if [ -n "$active_feature" ] && [ -d "$repo_root/specs/$active_feature" ]; then
        active_feature_dir="$repo_root/specs/$active_feature"
    else
        active_feature=""
        active_feature_dir=""
    fi

    if [ -d "$repo_root/specs" ]; then
        while IFS= read -r feature_dir; do
            [ -n "$feature_dir" ] || continue
            local feature_name stage gate analysis workset entry
            feature_name="$(basename "$feature_dir")"
            stage="$(feature_stage_label "$feature_dir")"
            gate="$(feature_status_verdict "$feature_dir/gate.md" "n/a")"
            analysis="$(feature_status_verdict "$feature_dir/analysis.md" "n/a")"
            workset="$(feature_primary_workset "$feature_dir")"
            entry="specs/$feature_name/memory/index.md"
            feature_rows="${feature_rows}| \`$feature_name\` | n/a | $stage | $gate | $analysis | \`$entry\` | \`$workset\` |\n"
            feature_count=$((feature_count + 1))
        done < <(find "$repo_root/specs" -mindepth 1 -maxdepth 1 -type d | sort)
    fi

    if [ "$feature_count" -eq 0 ]; then
        feature_rows='| no feature yet | n/a | not started | n/a | n/a | create with `sp.specify` | n/a |'
    fi

    if [ -n "$active_feature_dir" ]; then
        active_workset="$(feature_primary_workset "$active_feature_dir")"
        active_stage="$(feature_stage_label "$active_feature_dir")"
        latest_gate="$(feature_status_verdict "$active_feature_dir/gate.md" "not available")"
        latest_analysis="$(feature_status_verdict "$active_feature_dir/analysis.md" "not available")"
    else
        active_workset="not selected"
        active_stage="document-stage framework bootstrapped"
        latest_gate="not available"
        latest_analysis="not available"
    fi

    cat > "$memory_dir/project-index.md" <<EOF
# Project Memory Index

## Question Routing Matrix

| If The Question Is About... | Keywords | Recommended Feature | Read First | Next Hop |
| --- | --- | --- | --- | --- |
| project rules, phase boundaries, what is forbidden now | constitution, boundary, phase, scope, implement | project-level | \`constitution.md\` | update the project-level memory files |
| which feature to enter, what to read first, current smallest work area | active feature, read order, workset, smallest context | ${active_feature:-select from feature-map} | \`active-context.md\` | enter the routed feature memory index |
| overall feature stage, gate verdict, readiness, workset count | stage, verdict, readiness, gate, analyze | feature-level | \`feature-map.md\` | inspect the matching feature row |
| shared object, business domain, cross-feature consistency | domain, object, shared rule, ownership | project-level | \`domain-map.md\` | register shared objects and domains |
| repeated high-risk topics, rollback entry, where drift may happen | hotspot, risk, rollback, drift | project-level | \`hotspots.md\` | refresh after the next analysis |

## Current Snapshot

| Key | Value |
| --- | --- |
| Project | \`$project_name\` |
| Stage | $active_stage |
| Active Feature | ${active_feature:+\`$active_feature\`}$( [ -z "$active_feature" ] && printf 'not selected' ) |
| Primary Workset | \`$active_workset\` |
| Latest Gate | $latest_gate |
| Latest Analysis | $latest_analysis |
| Refresh Date | \`$refresh_date\` |

## Current Minimum Read Set

| Order | File | Why It Is In The Minimum Set |
| --- | --- | --- |
| 1 | \`project-index.md\` | first-hop routing |
| 2 | \`constitution.md\` | confirms phase boundary and workflow rules |
| 3 | \`active-context.md\` | confirms the active feature and read set |
| 4 | \`feature-map.md\` | shows every known feature and stage |
| 5 | \`domain-map.md\` | shows shared objects and domains |

## Current Focus

| Topic | Recommended Entry | Why Now |
| --- | --- | --- |
| active feature routing | \`active-context.md\` | keeps the next read bounded |
| feature inventory and stage checks | \`feature-map.md\` | keeps stage and verdict drift visible |
| project boundary alignment | \`constitution.md\` | preserves workflow rules before deeper work |

## Latest Summary

- Project-level memory was refreshed from the current workspace state.
- Active feature: ${active_feature:+\`$active_feature\`}$( [ -z "$active_feature" ] && printf 'not selected' ).
- Primary workset: \`$active_workset\`.
- Feature count: \`$feature_count\`.
EOF

    if [ -n "$active_feature_dir" ]; then
        cat > "$memory_dir/active-context.md" <<EOF
# Active Context

## Current Goal And Minimum Read Set

| Key | Value |
| --- | --- |
| Current Goal | keep \`$active_feature\` aligned for the next \`sp.*\` step |
| Active Feature | \`$active_feature\` |
| Primary Workset | \`$active_workset\` |
| Highest Risk | project-level routing drifting away from \`specs/$active_feature/\` |
| No-Go Boundary | do not leave documentation work and do not skip the routed minimum set |
| Refresh Date | \`$refresh_date\` |
| Refresh Basis | \`.specify/feature.json\`, \`feature-map.md\`, workspace files |
| Source Of Truth | \`specs/$active_feature/memory/index.md\`, \`specs/$active_feature/spec.md\`, \`specs/$active_feature/plan.md\` |
| Required Sync Files | \`project-index.md\`, \`feature-map.md\`, \`specs/$active_feature/memory/index.md\` |
| Stale Trigger | active feature changes, workset changes, or stage files change |

## Minimum Read Set

| Order | File | Why It Is Required |
| --- | --- | --- |
| 1 | \`.specify/memory/project-index.md\` | confirms project-level route |
| 2 | \`.specify/memory/constitution.md\` | confirms workflow and phase boundary |
| 3 | \`.specify/memory/feature-map.md\` | confirms feature registration state |
| 4 | \`specs/$active_feature/memory/index.md\` | enters the active feature routing layer |
| 5 | \`specs/$active_feature/memory/worksets/$active_workset.md\` | narrows to the current bounded work area |

## Workset Routing

| If You Need To... | Choose | Why |
| --- | --- | --- |
| refresh feature-level routing | \`specs/$active_feature/memory/index.md\` | it is the entry point for this feature |
| work inside the current bounded area | \`specs/$active_feature/memory/worksets/$active_workset.md\` | it is the current smallest useful read set |
| verify stage readiness | \`specs/$active_feature/plan.md\` | it reflects the current delivery stage |

## Current Highest-Risk Area

| Priority | Topic | Entry |
| --- | --- | --- |
| \`High\` | project-level routing falling behind feature-level reality | \`specs/$active_feature/memory/index.md\` |
EOF
    else
        cat > "$memory_dir/active-context.md" <<EOF
# Active Context

## Current Goal And Minimum Read Set

| Key | Value |
| --- | --- |
| Current Goal | choose the active feature before deeper document work |
| Active Feature | not selected |
| Primary Workset | not selected |
| Highest Risk | entering deep design with no routed feature |
| No-Go Boundary | do not enter implementation and do not invent an active feature |
| Refresh Date | \`$refresh_date\` |
| Refresh Basis | \`project-index.md\`, \`feature-map.md\`, workspace files |
| Source Of Truth | \`project-index.md\`, \`feature-map.md\` |
| Required Sync Files | \`project-index.md\`, \`feature-map.md\` |
| Stale Trigger | feature selection changes or the first feature is created |

## Minimum Read Set

| Order | File | Why It Is Required |
| --- | --- | --- |
| 1 | \`.specify/memory/project-index.md\` | confirms project-level route |
| 2 | \`.specify/memory/constitution.md\` | confirms workflow and phase boundary |
| 3 | \`.specify/memory/feature-map.md\` | confirms the available feature set |

## Workset Routing

| If You Need To... | Choose | Why |
| --- | --- | --- |
| choose a feature | \`feature-map.md\` | it lists the available feature entries |
| validate project boundaries | \`constitution.md\` | project rules should remain stable first |

## Current Highest-Risk Area

| Priority | Topic | Entry |
| --- | --- | --- |
| \`High\` | feature routing not selected yet | start with \`sp.specify\` or select a feature from \`feature-map.md\` |
EOF
    fi

    cat > "$memory_dir/feature-map.md" <<EOF
# Feature Map

## Feature Summary Table

| Feature | Domain | Current Stage | Latest Gate | Latest Analysis | Primary Entry | Primary Workset |
| --- | --- | --- | --- | --- | --- | --- |
$(printf '%b' "$feature_rows")

## Notes

- Refresh this table whenever feature routing, stage, or workset selection changes.
- Do not let \`active-context.md\` point to a feature that is not registered here.
- Treat the workspace files as the current source of truth when stale routing is detected.
EOF
}
