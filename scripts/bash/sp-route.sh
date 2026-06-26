#!/usr/bin/env bash

# Deterministic Spec Kit route discovery.
#
# This script reads explicit project/feature state and returns the next safe
# /sp.* command as JSON. It does not execute the returned command.

set -euo pipefail

JSON_MODE=false

for arg in "$@"; do
    case "$arg" in
        --json)
            JSON_MODE=true
            ;;
        --help|-h)
            cat << 'EOF'
Usage: sp-route.sh [OPTIONS]

OPTIONS:
  --json       Output route payload as JSON
  --help, -h   Show this help message
EOF
            exit 0
            ;;
        *)
            echo "ERROR: Unknown option '$arg'. Use --help for usage information." >&2
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

repo_root=$(get_repo_root)

json_array() {
    if (($# == 0)); then
        printf '[]'
        return
    fi

    local first=true
    printf '['
    for item in "$@"; do
        if $first; then
            first=false
        else
            printf ','
        fi
        printf '"%s"' "$(json_escape "$item")"
    done
    printf ']'
}

json_object_artifacts() {
    printf '{'
    printf '"prd":%s,' "$1"
    printf '"spec":%s,' "$2"
    printf '"flows":%s,' "$3"
    printf '"ui":%s,' "$4"
    printf '"bundle":%s,' "$5"
    printf '"plan":%s,' "$6"
    printf '"tasks":%s,' "$7"
    printf '"analysis":%s,' "$8"
    printf '"gate":%s,' "$9"
    printf '"openItems":%s' "${10}"
    printf '}'
}

empty_artifacts='{"prd":false,"spec":false,"flows":false,"ui":false,"bundle":false,"plan":false,"tasks":false,"analysis":false,"gate":false,"openItems":false}'

emit_json() {
    local status="$1"
    local next="$2"
    local reason="$3"
    local active_feature="$4"
    local feature_dir="$5"
    local artifacts_json="$6"
    local missing_json="$7"
    local blockers_json="$8"
    local confidence="$9"
    local continue_allowed="${10:-true}"
    local blocker_type="${11:-NONE}"
    local blocker_route="${12:-$next}"
    local loop_detected="${13:-false}"
    local loop_signature="${14:-}"
    local loop_route="${15:-$next}"

    printf '{'
    printf '"schema":"speckit.route.v1",'
    printf '"status":"%s",' "$(json_escape "$status")"
    printf '"next":"%s",' "$(json_escape "$next")"
    printf '"reason":"%s",' "$(json_escape "$reason")"
    printf '"activeFeature":"%s",' "$(json_escape "$active_feature")"
    printf '"featureDir":"%s",' "$(json_escape "$feature_dir")"
    printf '"artifacts":%s,' "$artifacts_json"
    printf '"missing":%s,' "$missing_json"
    printf '"blockers":%s,' "$blockers_json"
    printf '"confidence":"%s",' "$(json_escape "$confidence")"
    printf '"autoExecute":false,'
    printf '"continueAllowed":%s,' "$continue_allowed"
    printf '"blockerType":"%s",' "$(json_escape "$blocker_type")"
    printf '"blockerRoute":"%s",' "$(json_escape "$blocker_route")"
    printf '"loopDetected":%s,' "$loop_detected"
    printf '"loopSignature":"%s",' "$(json_escape "$loop_signature")"
    printf '"loopRoute":"%s"' "$(json_escape "$loop_route")"
    printf '}\n'
}

emit_route() {
    if $JSON_MODE; then
        emit_json "$@"
    else
        printf 'Status: %s\nNext: %s\nReason: %s\n' "$1" "$2" "$3"
    fi
}

read_feature_pointer() {
    local feature_json="$repo_root/.specify/feature.json"
    [[ -f "$feature_json" ]] || return 1

    local feature_dir=""
    if command -v jq >/dev/null 2>&1; then
        feature_dir=$(jq -r '.feature_directory // empty' "$feature_json" 2>/dev/null || true)
    elif command -v python3 >/dev/null 2>&1; then
        feature_dir=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('feature_directory',''))" "$feature_json" 2>/dev/null || true)
    else
        feature_dir=$(grep -o '"feature_directory"[[:space:]]*:[[:space:]]*"[^"]*"' "$feature_json" 2>/dev/null | sed 's/.*"\([^"]*\)"$/\1/' || true)
    fi

    [[ -n "$feature_dir" ]] || return 1
    [[ "$feature_dir" != /* ]] && feature_dir="$repo_root/$feature_dir"
    printf '%s\n' "$feature_dir"
}

find_explicit_feature_dir() {
    if [[ -n "${SPECIFY_FEATURE_DIRECTORY:-}" ]]; then
        local feature_dir="$SPECIFY_FEATURE_DIRECTORY"
        [[ "$feature_dir" != /* ]] && feature_dir="$repo_root/$feature_dir"
        printf '%s\n' "$feature_dir"
        return 0
    fi

    if read_feature_pointer; then
        return 0
    fi

    return 1
}

has_seed_marker() {
    local path="$1"
    [[ -f "$path" ]] || return 1
    grep -Eq 'SP_STAGE_SEED:' "$path"
}

has_ready_marker() {
    local path="$1"
    local marker="$2"
    [[ -f "$path" ]] || return 1
    grep -Eq "(^|[[:space:]])${marker}($|[[:space:]])" "$path"
}

has_analysis_pass_marker() {
    local path="$1"
    [[ -f "$path" ]] || return 1
    grep -Eiq '^[[:space:]]*(Diagnostic[[:space:]]+)?Verdict[[:space:]]*:[[:space:]]*PASS[[:space:]]*$|^[[:space:]]*SP_STATUS[[:space:]]*:[[:space:]]*PASS[[:space:]]*$|^[[:space:]]*PASS[[:space:]]*$' "$path"
}

has_gate_pass_verdict() {
    local path="$1"
    [[ -f "$path" ]] || return 1
    grep -Eiq '^[[:space:]]*Verdict[[:space:]]*:[[:space:]]*PASS[[:space:]]*$' "$path"
}

dir_has_files() {
    local path="$1"
    [[ -d "$path" ]] || return 1
    [[ -n "$(find "$path" -maxdepth 1 -type f -print -quit 2>/dev/null)" ]]
}

open_items_have_blockers() {
    local path="$1"
    [[ -f "$path" ]] || return 1
    grep -Eiq 'Status:[[:space:]]*(BLOCKED|NEEDS_DECISION)|\b(Blocker|BLOCKED|NEEDS_DECISION)\b' "$path"
}

extract_open_items_blocker_route() {
    local path="$1"
    [[ -f "$path" ]] || return 1

    local route=""
    route=$(grep -Eim1 '(^|[[:space:]-])(Owner Route|Next Route|Blocker Route|Next /sp\.\* route):[[:space:]]*/sp\.[A-Za-z0-9._-]+' "$path" \
        | sed -E 's/.*:[[:space:]]*(\/sp\.[A-Za-z0-9._-]+).*/\1/' || true)

    [[ -n "$route" ]] || return 1
    printf '%s\n' "$route"
}

classify_open_items_blocker() {
    local path="$1"
    [[ -f "$path" ]] || return 1

    if grep -Eiq 'Blocker Type:[[:space:]]*(HUMAN_DECISION|BUSINESS_DECISION|NEEDS_DECISION)|Status:[[:space:]]*NEEDS_DECISION|\b(NEEDS_DECISION|risk acceptance|human choice|human decision|owner decision|manual decision)\b' "$path"; then
        printf 'HUMAN_DECISION\n'
        return 0
    fi

    if grep -Eiq 'Blocker Type:[[:space:]]*(UPSTREAM_DOC_GAP|SOURCE_AUTHORITY_GAP|MISSING_ARTIFACT|WEAK_ARTIFACT)|Missing/Weak Artifact:|Owner Route:[[:space:]]*/sp\.(prd|specify|flow|ui|bundle|plan|tasks)|Next Route:[[:space:]]*/sp\.(prd|specify|flow|ui|bundle|plan|tasks)' "$path"; then
        printf 'UPSTREAM_DOC_GAP\n'
        return 0
    fi

    printf 'UNKNOWN_BLOCKER\n'
}

fallback_log_has_repeated_signature() {
    local path="$1"
    [[ -f "$path" ]] || return 1

    awk -F'|' '
        function trim(value) {
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
            return value
        }
        BEGIN {
            sig_col = 0
            route_col = 0
            detected_signature = ""
            detected_route = ""
        }
        /^[[:space:]]*\|/ {
            if (sig_col == 0) {
                for (i = 1; i <= NF; i++) {
                    cell = tolower(trim($i))
                    if (cell == "failure signature" || cell == "blocker-signature") {
                        sig_col = i
                    }
                    if (cell == "next-route" || cell == "next route") {
                        route_col = i
                    }
                }
                next
            }
            if ($0 ~ /^[[:space:]]*\|[[:space:]-]+\|/) {
                next
            }
            signature = trim($sig_col)
            route = route_col ? trim($route_col) : ""
            if (signature == "" || signature == "failure signature" || signature == "blocker-signature") {
                next
            }
            key = signature SUBSEP route
            counts[key]++
            if (counts[key] >= 2) {
                detected_signature = signature
                detected_route = route
                print detected_signature "\t" detected_route
                found = 1
                exit 0
            }
        }
        END {
            if (!found) {
                exit 1
            }
        }
    ' "$path"
}

feature_dir=""
if feature_dir=$(find_explicit_feature_dir); then
    :
else
    mapfile -t candidates < <(find "$repo_root/specs" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)
    if ((${#candidates[@]} > 1)); then
        emit_route "NEEDS_DECISION" "/sp.clarify" "multiple-feature-candidates" "" "" "$empty_artifacts" "$(json_array)" "$(json_array "${candidates[@]}")" "low" "false" "HUMAN_DECISION" "/sp.clarify"
        exit 0
    fi
    if ((${#candidates[@]} == 1)); then
        feature_dir="${candidates[0]}"
    else
        emit_route "NEEDS_PRD" "/sp.prd" "no-active-feature" "" "" "$empty_artifacts" "$(json_array "feature")" "$(json_array)" "high"
        exit 0
    fi
fi

if [[ ! -d "$feature_dir" ]]; then
    emit_route "NEEDS_PRD" "/sp.prd" "feature-directory-missing" "" "$feature_dir" "$empty_artifacts" "$(json_array "feature")" "$(json_array)" "high"
    exit 0
fi

active_feature=$(basename "$feature_dir")

prd_exists=false
spec_exists=false
flows_exists=false
ui_exists=false
bundle_exists=false
plan_exists=false
tasks_exists=false
analysis_exists=false
gate_exists=false
open_items_exists=false

[[ -f "$feature_dir/prd.md" ]] && prd_exists=true
[[ -f "$feature_dir/spec.md" ]] && spec_exists=true
dir_has_files "$feature_dir/flows" && flows_exists=true
dir_has_files "$feature_dir/ui" && ui_exists=true
[[ -f "$feature_dir/bundle.md" ]] && bundle_exists=true
[[ -f "$feature_dir/plan.md" ]] && plan_exists=true
[[ -f "$feature_dir/tasks.md" ]] && tasks_exists=true
[[ -f "$feature_dir/analysis.md" ]] && analysis_exists=true
[[ -f "$feature_dir/gate.md" ]] && gate_exists=true
[[ -f "$feature_dir/memory/open-items.md" ]] && open_items_exists=true

artifacts=$(json_object_artifacts "$prd_exists" "$spec_exists" "$flows_exists" "$ui_exists" "$bundle_exists" "$plan_exists" "$tasks_exists" "$analysis_exists" "$gate_exists" "$open_items_exists")

if [[ "$prd_exists" != true ]] || has_seed_marker "$feature_dir/prd.md"; then
    emit_route "NEEDS_PRD" "/sp.prd" "missing-prd" "$active_feature" "$feature_dir" "$artifacts" "$(json_array "prd.md")" "$(json_array)" "high"
    exit 0
fi

if [[ "$spec_exists" == true ]] && has_seed_marker "$feature_dir/spec.md"; then
    emit_route "NEEDS_SPECIFY" "/sp.specify" "seed-spec" "$active_feature" "$feature_dir" "$artifacts" "$(json_array)" "$(json_array "spec.md")" "high"
    exit 0
fi

if [[ "$spec_exists" != true ]]; then
    emit_route "NEEDS_SPECIFY" "/sp.specify" "missing-spec" "$active_feature" "$feature_dir" "$artifacts" "$(json_array "spec.md")" "$(json_array)" "high"
    exit 0
fi

if [[ "$flows_exists" != true ]] || has_seed_marker "$feature_dir/flows/index.md"; then
    emit_route "NEEDS_FLOW" "/sp.flow" "missing-flows" "$active_feature" "$feature_dir" "$artifacts" "$(json_array "flows/")" "$(json_array)" "high"
    exit 0
fi

if [[ "$ui_exists" != true ]] || has_seed_marker "$feature_dir/ui/index.md"; then
    emit_route "NEEDS_UI" "/sp.ui" "missing-ui" "$active_feature" "$feature_dir" "$artifacts" "$(json_array "ui/")" "$(json_array)" "high"
    exit 0
fi

if [[ "$bundle_exists" != true ]] || has_seed_marker "$feature_dir/bundle.md"; then
    emit_route "NEEDS_BUNDLE" "/sp.bundle" "missing-bundle" "$active_feature" "$feature_dir" "$artifacts" "$(json_array "bundle.md")" "$(json_array)" "high"
    exit 0
fi

if [[ "$plan_exists" != true ]] || has_seed_marker "$feature_dir/plan.md"; then
    emit_route "NEEDS_PLAN" "/sp.plan" "missing-plan" "$active_feature" "$feature_dir" "$artifacts" "$(json_array "plan.md")" "$(json_array)" "high"
    exit 0
fi

if [[ "$tasks_exists" != true ]] || has_seed_marker "$feature_dir/tasks.md"; then
    emit_route "NEEDS_TASKS" "/sp.tasks" "missing-tasks" "$active_feature" "$feature_dir" "$artifacts" "$(json_array "tasks.md")" "$(json_array)" "high"
    exit 0
fi

if loop_match=$(fallback_log_has_repeated_signature "$feature_dir/memory/fallback-log.md"); then
    loop_signature="${loop_match%%$'\t'*}"
    loop_route="${loop_match#*$'\t'}"
    [[ "$loop_route" == "$loop_signature" ]] && loop_route="/sp.clarify"
    emit_route "BLOCKED" "/sp.clarify" "fallback-loop-detected" "$active_feature" "$feature_dir" "$artifacts" "$(json_array)" "$(json_array "memory/fallback-log.md")" "high" "false" "REPEATED_FALLBACK" "/sp.clarify" "true" "$loop_signature" "$loop_route"
    exit 0
fi

if open_items_have_blockers "$feature_dir/memory/open-items.md"; then
    blocker_type=$(classify_open_items_blocker "$feature_dir/memory/open-items.md")
    blocker_route="/sp.clarify"
    continue_allowed=false

    if [[ "$blocker_type" == "UPSTREAM_DOC_GAP" ]]; then
        if extracted_route=$(extract_open_items_blocker_route "$feature_dir/memory/open-items.md"); then
            blocker_route="$extracted_route"
        else
            blocker_route="/sp.clarify"
            blocker_type="UNKNOWN_BLOCKER"
        fi
    fi

    if [[ "$blocker_type" == "UPSTREAM_DOC_GAP" && "$blocker_route" != "/sp.clarify" ]]; then
        continue_allowed=true
    fi

    emit_route "BLOCKED" "$blocker_route" "open-items-blocked" "$active_feature" "$feature_dir" "$artifacts" "$(json_array)" "$(json_array "memory/open-items.md")" "high" "$continue_allowed" "$blocker_type" "$blocker_route"
    exit 0
fi

if ! has_ready_marker "$feature_dir/plan.md" "READY_FOR_TASKS"; then
    emit_route "NEEDS_PLAN" "/sp.plan" "plan-readiness-missing" "$active_feature" "$feature_dir" "$artifacts" "$(json_array)" "$(json_array "plan.md")" "medium"
    exit 0
fi

if [[ "$analysis_exists" != true ]] || has_seed_marker "$feature_dir/analysis.md"; then
    emit_route "NEEDS_ANALYZE" "/sp.analyze" "missing-analysis" "$active_feature" "$feature_dir" "$artifacts" "$(json_array "analysis.md")" "$(json_array)" "high"
    exit 0
fi

if ! has_analysis_pass_marker "$feature_dir/analysis.md"; then
    emit_route "NEEDS_ANALYZE" "/sp.analyze" "analysis-not-pass" "$active_feature" "$feature_dir" "$artifacts" "$(json_array)" "$(json_array "analysis.md")" "high"
    exit 0
fi

if [[ "$gate_exists" != true ]] || has_seed_marker "$feature_dir/gate.md"; then
    emit_route "NEEDS_GATE" "/sp.gate" "missing-gate" "$active_feature" "$feature_dir" "$artifacts" "$(json_array "gate.md")" "$(json_array)" "high"
    exit 0
fi

if ! has_gate_pass_verdict "$feature_dir/gate.md"; then
    emit_route "NEEDS_GATE" "/sp.gate" "gate-not-pass" "$active_feature" "$feature_dir" "$artifacts" "$(json_array)" "$(json_array "gate.md")" "high"
    exit 0
fi

emit_route "READY_FOR_IMPLEMENT" "/sp.implement" "gate-authorized-implement" "$active_feature" "$feature_dir" "$artifacts" "$(json_array)" "$(json_array)" "high"
