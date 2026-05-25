#!/usr/bin/env bash

# Lightweight SP memory consistency checker.
#
# This script intentionally performs only mechanical checks:
# - open blocker visibility
# - required open-items fields
# - open-items -> trace/source link presence
# - obvious @r0/@t0 status tag drift
#
# It does not perform semantic quality review. That remains the job of
# /sp.analyze and /sp.gate.

set -e

JSON_MODE=false
FAIL_ON_ERROR=false
FEATURE_DIR_OVERRIDE=""

usage() {
    cat << 'EOF'
Usage: check-sp-memory.sh [OPTIONS]

Lightweight checks for SP feature memory link integrity.

OPTIONS:
  --json                  Output JSON
  --feature-dir <path>    Check a specific feature directory
  --fail-on-error         Exit 1 when errors are found
  --help, -h              Show this help message

EXAMPLES:
  ./check-sp-memory.sh --json --feature-dir specs/my-feature
  ./check-sp-memory.sh --json --fail-on-error
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)
            JSON_MODE=true
            shift
            ;;
        --feature-dir)
            FEATURE_DIR_OVERRIDE="${2:-}"
            if [[ -z "$FEATURE_DIR_OVERRIDE" ]]; then
                echo "ERROR: --feature-dir requires a path" >&2
                exit 2
            fi
            shift 2
            ;;
        --fail-on-error)
            FAIL_ON_ERROR=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "ERROR: Unknown option '$1'. Use --help for usage information." >&2
            exit 2
            ;;
    esac
done

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMON_SH="$SCRIPT_DIR/common.sh"
if [[ ! -f "$COMMON_SH" ]]; then
    REPO_ROOT="${REPO_ROOT:-}"
    if [[ -z "$REPO_ROOT" ]]; then
        search_root="$SCRIPT_DIR"
        while [[ "$search_root" != "/" ]]; do
            if [[ -d "$search_root/.specify" || -d "$search_root/scripts" ]]; then
                REPO_ROOT="$search_root"
                break
            fi
            search_root="$(dirname "$search_root")"
        done
    fi
    for candidate in \
        "${REPO_ROOT:+$REPO_ROOT/.specify/scripts/bash/common.sh}" \
        "${REPO_ROOT:+$REPO_ROOT/scripts/bash/common.sh}"; do
        if [[ -n "$candidate" && -f "$candidate" ]]; then
            COMMON_SH="$candidate"
            break
        fi
    done
fi

if [[ -f "$COMMON_SH" ]]; then
    # shellcheck source=/dev/null
    source "$COMMON_SH"
fi

if ! declare -F json_escape >/dev/null 2>&1; then
    json_escape() {
        local value="${1:-}"
        value="${value//\\/\\\\}"
        value="${value//\"/\\\"}"
        value="${value//$'\n'/\\n}"
        value="${value//$'\r'/\\r}"
        value="${value//$'\t'/\\t}"
        printf '%s' "$value"
    }
fi

trim() {
    local value="${1:-}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "$value"
}

clean_cell() {
    local value
    value="$(trim "${1:-}")"
    value="${value//\`/}"
    value="$(printf '%s' "$value" | sed -E 's/\[([^][]+)\]\([^)]+\)/\1/g')"
    printf '%s' "$(trim "$value")"
}

is_empty_value() {
    local value
    value="$(clean_cell "${1:-}")"
    case "${value,,}" in
        ""|"-"|"n/a"|"na"|"none"|"tbd")
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

is_markdown_table_separator() {
    local value
    value="$(trim "${1:-}")"
    value="${value//|/}"
    value="${value//:/}"
    value="${value//-/}"
    value="${value// /}"
    [[ -z "$value" ]]
}

should_skip_open_items_row() {
    local non_empty=0
    local joined=""
    local cell
    local clean
    local lower

    for cell in "$@"; do
        clean="$(clean_cell "$cell")"
        lower="${clean,,}"
        joined="${joined}|${lower}"
        if ! is_empty_value "$clean"; then
            non_empty=$((non_empty + 1))
        fi
    done

    [[ $non_empty -eq 0 ]] && return 0

    local first="${1:-}"
    local second="${2:-}"
    first="$(clean_cell "$first")"
    second="$(clean_cell "$second")"
    first="${first,,}"
    second="${second,,}"

    case "$first" in
        "item id"|"id"|"open item"|"open id")
            [[ -z "$second" || "$second" == "type" ]] && return 0
            ;;
    esac

    if [[ "$joined" == *"|type"* && "$joined" == *"|status"* ]] && \
       [[ "$joined" == *"|item id"* || "$joined" == *"|id"* || "$joined" == *"|open item"* ]]; then
        return 0
    fi

    return 1
}

FEATURE_DIR="$FEATURE_DIR_OVERRIDE"
if [[ -z "$FEATURE_DIR" ]]; then
    if ! declare -F get_feature_paths >/dev/null 2>&1; then
        echo "ERROR: common.sh is required when --feature-dir is not provided" >&2
        exit 2
    fi
    _paths_output=$(get_feature_paths) || { echo "ERROR: Failed to resolve feature paths" >&2; exit 2; }
    eval "$_paths_output"
    unset _paths_output
fi

if [[ -z "$FEATURE_DIR" || ! -d "$FEATURE_DIR" ]]; then
    if $JSON_MODE; then
        printf '{"status":"WARN","featureDir":"%s","errorCount":0,"warningCount":1,"findings":[{"severity":"WARN","code":"NO_ACTIVE_FEATURE","message":"No active feature directory was found. Run /sp.specify first.","file":"","nextStep":"/sp.specify"}]}\n' "$(json_escape "$FEATURE_DIR")"
    else
        echo "WARN NO_ACTIVE_FEATURE: No active feature directory was found. Next step: /sp.specify"
    fi
    exit 0
fi

OPEN_ITEMS="$FEATURE_DIR/memory/open-items.md"
TRACE_INDEX="$FEATURE_DIR/memory/trace-index.md"
TRACE_TEXT=""
if [[ -f "$TRACE_INDEX" ]]; then
    TRACE_TEXT="$(cat "$TRACE_INDEX")"
fi

findings=()
error_count=0
warning_count=0
open_risk_or_blocker_count=0
open_question_todo_risk_count=0

add_finding() {
    local severity="$1"
    local code="$2"
    local message="$3"
    local file="${4:-}"
    local next_step="${5:-}"
    findings+=("$severity|$code|$message|$file|$next_step")
    if [[ "$severity" == "ERROR" ]]; then
        error_count=$((error_count + 1))
    else
        warning_count=$((warning_count + 1))
    fi
}

process_open_item() {
    local item_id="$1"
    local item_type="$2"
    local severity="$3"
    local anchor="$4"
    local owner="$5"
    local description="$6"
    local impact_area="$7"
    local affected_docs="$8"
    local rollback="$9"
    local close_condition="${10}"
    local last_refresh="${11}"
    local status="${12}"

    item_id="$(clean_cell "$item_id")"
    [[ -z "$item_id" ]] && return 0

    item_type="$(clean_cell "$item_type")"
    severity="$(clean_cell "$severity")"
    anchor="$(clean_cell "$anchor")"
    owner="$(clean_cell "$owner")"
    description="$(clean_cell "$description")"
    impact_area="$(clean_cell "$impact_area")"
    affected_docs="$(clean_cell "$affected_docs")"
    rollback="$(clean_cell "$rollback")"
    close_condition="$(clean_cell "$close_condition")"
    last_refresh="$(clean_cell "$last_refresh")"
    status="$(clean_cell "$status")"

    local type_lower="${item_type,,}"
    local severity_lower="${severity,,}"
    local status_lower="${status,,}"
    local is_heavy=false

    case "$type_lower:$severity_lower" in
        risk:*|blocker:*|*:high)
            is_heavy=true
            ;;
    esac

    if [[ "$status_lower" == *"open"* ]]; then
        case "$type_lower" in
            risk|blocker)
                open_risk_or_blocker_count=$((open_risk_or_blocker_count + 1))
                ;;
        esac
        case "$type_lower" in
            question|todo|risk)
                open_question_todo_risk_count=$((open_question_todo_risk_count + 1))
                ;;
        esac
    fi

    for required in "Type:$item_type" "Status:$status"; do
        required_name="${required%%:*}"
        required_value="${required#*:}"
        if is_empty_value "$required_value"; then
            add_finding "ERROR" "OPEN_ITEM_REQUIRED_FIELD_MISSING" "$item_id is missing required field: $required_name." "$OPEN_ITEMS" "/sp.analyze"
        fi
    done

    for recommended in "Severity:$severity" "Description:$description"; do
        recommended_name="${recommended%%:*}"
        recommended_value="${recommended#*:}"
        if is_empty_value "$recommended_value"; then
            add_finding "WARN" "OPEN_ITEM_RECOMMENDED_FIELD_MISSING" "$item_id is missing recommended field: $recommended_name." "$OPEN_ITEMS" "/sp.analyze"
        fi
    done

    if $is_heavy; then
        for required in "Close Condition:$close_condition" "Last Refresh:$last_refresh"; do
            required_name="${required%%:*}"
            required_value="${required#*:}"
            if is_empty_value "$required_value"; then
                add_finding "ERROR" "OPEN_ITEM_REQUIRED_FIELD_MISSING" "$item_id is missing required field for high-impact items: $required_name." "$OPEN_ITEMS" "/sp.analyze"
            fi
        done
    fi

    if [[ "$type_lower" == "blocker" && "$status_lower" == *"open"* ]]; then
        add_finding "ERROR" "OPEN_BLOCKER" "$item_id is an open blocker; PASS is not safe until it is closed or routed upward." "$OPEN_ITEMS" "/sp.gate"
    fi

    if [[ "$is_heavy" == true && "$status_lower" == *"open"* ]]; then
        for required in "Owner:$owner" "Impact Area:$impact_area" "Suggested Rollback:$rollback" "Close Condition:$close_condition"; do
            required_name="${required%%:*}"
            required_value="${required#*:}"
            if is_empty_value "$required_value"; then
                add_finding "ERROR" "OPEN_RISK_REQUIRED_FIELD_MISSING" "$item_id is an open high-impact item missing conditional-pass field: $required_name." "$OPEN_ITEMS" "/sp.gate"
            fi
        done
    fi

    if ! valid_open_item_link "$anchor" "$affected_docs"; then
        if $is_heavy; then
            add_finding "ERROR" "OPEN_ITEM_TRACE_LINK_MISSING" "$item_id cannot be linked through Anchor or Affected Docs to memory/trace-index.md." "$OPEN_ITEMS" "/sp.analyze"
        else
            add_finding "WARN" "OPEN_ITEM_TRACE_LINK_MISSING" "$item_id has no trace/source link. This is allowed for lightweight Question/Todo items, but should be linked if it affects scope, acceptance, release, rollback, or implementation confidence." "$OPEN_ITEMS" "/sp.analyze"
        fi
    fi
}

flush_open_item_block() {
    [[ -n "${block_item_id:-}" ]] || return 0
    process_open_item \
        "$block_item_id" \
        "${block_type:-}" \
        "${block_severity:-}" \
        "${block_anchor:-}" \
        "${block_owner:-}" \
        "${block_description:-}" \
        "${block_impact_area:-}" \
        "${block_affected_docs:-}" \
        "${block_rollback:-}" \
        "${block_close_condition:-}" \
        "${block_last_refresh:-}" \
        "${block_status:-}"

    block_item_id=""
    block_type=""
    block_severity=""
    block_anchor=""
    block_owner=""
    block_description=""
    block_impact_area=""
    block_affected_docs=""
    block_rollback=""
    block_close_condition=""
    block_last_refresh=""
    block_status=""
}

valid_open_item_link() {
    local anchor="$1"
    local affected_docs="$2"

    if [[ -z "$TRACE_TEXT" ]]; then
        return 1
    fi

    if ! is_empty_value "$anchor" && grep -Fq -- "$anchor" <<< "$TRACE_TEXT"; then
        return 0
    fi

    IFS=',' read -ra docs <<< "$affected_docs"
    for doc in "${docs[@]}"; do
        doc="$(clean_cell "$doc")"
        if ! is_empty_value "$doc" && grep -Fq -- "$doc" <<< "$TRACE_TEXT"; then
            return 0
        fi
    done

    return 1
}

if [[ ! -f "$OPEN_ITEMS" ]]; then
    add_finding "WARN" "OPEN_ITEMS_MISSING" "memory/open-items.md is missing; risk and blocker details cannot be checked." "$OPEN_ITEMS" "/sp.analyze"
else
    block_item_id=""
    block_type=""
    block_anchor=""
    block_owner=""
    block_impact_area=""
    block_affected_docs=""
    block_rollback=""
    block_close_condition=""
    block_last_refresh=""
    block_status=""

    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ "$line" == "### "* ]]; then
            flush_open_item_block
            block_item_id="$(clean_cell "${line#\### }")"
            continue
        fi

        if [[ -n "$block_item_id" && "$line" == "- "*:* ]]; then
            field="${line#- }"
            field_name="$(clean_cell "${field%%:*}")"
            field_value="$(clean_cell "${field#*:}")"
            case "${field_name,,}" in
                type) block_type="$field_value" ;;
                severity) block_severity="$field_value" ;;
                anchor) block_anchor="$field_value" ;;
                owner) block_owner="$field_value" ;;
                description) block_description="$field_value" ;;
                "impact area") block_impact_area="$field_value" ;;
                "affected docs") block_affected_docs="$field_value" ;;
                "suggested rollback") block_rollback="$field_value" ;;
                "close condition") block_close_condition="$field_value" ;;
                "last refresh") block_last_refresh="$field_value" ;;
                status) block_status="$field_value" ;;
            esac
            continue
        fi

        [[ "$line" == \|* ]] || continue
        is_markdown_table_separator "$line" && continue

        row="${line#|}"
        row="${row%|}"
        IFS='|' read -ra cols <<< "$row"
        should_skip_open_items_row "${cols[@]}" && continue

        process_open_item \
            "${cols[0]:-}" \
            "${cols[1]:-}" \
            "${cols[2]:-}" \
            "${cols[5]:-}" \
            "${cols[7]:-}" \
            "${cols[8]:-}" \
            "${cols[9]:-}" \
            "${cols[10]:-}" \
            "${cols[11]:-}" \
            "${cols[12]:-}" \
            "${cols[13]:-}" \
            "${cols[14]:-}"
    done < "$OPEN_ITEMS"
    flush_open_item_block
fi

candidate_r0=0
candidate_t0=0
while IFS= read -r hit || [[ -n "$hit" ]]; do
    hit_file="${hit%%:*}"
    rel="${hit_file#"$FEATURE_DIR"/}"
    case "$rel" in
        memory/open-items.md|memory/index.md|memory/trace-index.md|memory/stable-context.md|memory/worksets/*)
            continue
            ;;
    esac

    line_text="${hit#*:}"
    line_text="${line_text#*:}"
    line_lower="${line_text,,}"

    case "$line_lower" in
        *"non-trivial"*|*"inline tag"*|*"status tag"*|*"for example"*|*"such as"*|*"example"*|*"when "*|*"if "*|*"should"*|*"must"*|*"means"*|*"use short"*|*"create a"*|*"do not"*|*"only when"*)
            continue
            ;;
    esac

    [[ "$line_text" == *"@r0"* ]] && candidate_r0=$((candidate_r0 + 1))
    [[ "$line_text" == *"@t0"* ]] && candidate_t0=$((candidate_t0 + 1))
done < <(grep -RInE '@r0|@t0' "$FEATURE_DIR" --include='*.md' 2>/dev/null || true)

if [[ $candidate_r0 -gt 0 && $open_risk_or_blocker_count -eq 0 ]]; then
    add_finding "ERROR" "R0_WITHOUT_OPEN_RISK" "Found candidate @r0 status tags but no open Risk or Blocker row in memory/open-items.md." "$FEATURE_DIR" "/sp.analyze"
fi

if [[ $candidate_t0 -gt 0 && $open_question_todo_risk_count -eq 0 ]]; then
    add_finding "WARN" "T0_WITHOUT_OPEN_ITEM" "Found candidate @t0 status tags but no open Question, Todo, or Risk row in memory/open-items.md. Confirm whether the gap is trivial." "$FEATURE_DIR" "/sp.analyze"
fi

status="PASS"
if [[ $error_count -gt 0 ]]; then
    status="FAIL"
elif [[ $warning_count -gt 0 ]]; then
    status="WARN"
fi

if $JSON_MODE; then
    printf '{"status":"%s","featureDir":"%s","errorCount":%d,"warningCount":%d,"findings":[' \
        "$status" "$(json_escape "$FEATURE_DIR")" "$error_count" "$warning_count"
    first=true
    for finding in "${findings[@]}"; do
        IFS='|' read -r severity code message file next_step <<< "$finding"
        if $first; then
            first=false
        else
            printf ','
        fi
        printf '{"severity":"%s","code":"%s","message":"%s","file":"%s","nextStep":"%s"}' \
            "$(json_escape "$severity")" "$(json_escape "$code")" "$(json_escape "$message")" "$(json_escape "$file")" "$(json_escape "$next_step")"
    done
    printf ']}\n'
else
    echo "SP memory check: $status ($error_count errors, $warning_count warnings)"
    for finding in "${findings[@]}"; do
        IFS='|' read -r severity code message file next_step <<< "$finding"
        printf '%s %s: %s' "$severity" "$code" "$message"
        [[ -n "$file" ]] && printf ' [%s]' "$file"
        [[ -n "$next_step" ]] && printf ' Next: %s' "$next_step"
        printf '\n'
    done
fi

if $FAIL_ON_ERROR && [[ $error_count -gt 0 ]]; then
    exit 1
fi

exit 0
