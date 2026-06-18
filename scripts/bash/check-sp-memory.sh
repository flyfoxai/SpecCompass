#!/usr/bin/env bash

# Lightweight SP memory consistency checker.
#
# This script intentionally performs only mechanical checks:
# - open blocker visibility
# - required open-items fields
# - close evidence for closed high-impact open-items
# - open-items -> trace/source link presence
# - flow/ui subject confusion by obvious SP control-plane terms
# - trace Expand Docs file liveness
# - repeated spec-outline blocker signature without new route/evidence
# - high-risk READY_FOR_SPECIFY outline missing owner review as WARN
# - minimum Evidence Signature shape and unbacked human-confirmation markers
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

to_lower() {
    printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]'
}

clean_cell() {
    local value
    value="$(trim "${1:-}")"
    value="${value//\`/}"
    value="$(printf '%s' "$value" | sed -E 's/\[([^][]+)\]\([^)]+\)/\1/g')"
    value="$(printf '%s' "$value" | sed -E 's/(^|[[:space:]])\*\*([^*]+)\*\*/\1\2/g; s/(^|[[:space:]])__([^_]+)__/\1\2/g; s/(^|[[:space:]])\*([^*]+)\*/\1\2/g; s/(^|[[:space:]])_([^_]+)_/\1\2/g')"
    printf '%s' "$(trim "$value")"
}

is_empty_value() {
    local value
    value="$(clean_cell "${1:-}")"
    case "$(to_lower "$value")" in
        ""|"-"|"n/a"|"na"|"none"|"tbd")
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

contains_high_impact_signal() {
    local value="${1:-}"
    local lower="$(to_lower "$value")"
    [[ "$lower" =~ (^|[^[:alnum:]_])(scope|acceptance|release|rollback|security|compliance|privacy|permission|auth|authentication|authorization|audit|data|migration|irreversible|tenant|rbac|payment|billing|production|prod)([^[:alnum:]_]|$) ]] || \
        [[ "$lower" =~ real[[:space:]_-]*(money|data) ]] || \
        [[ "$lower" =~ implementation[[:space:]_-]*confidence ]] || \
        [[ "$lower" =~ human[[:space:]_-]*(decision|approval|acceptance) ]] || \
        [[ "$lower" =~ owner[[:space:]_-]*(decision|approval) ]] || \
        [[ "$lower" =~ risk[[:space:]_-]*acceptance ]]
}

contains_new_evidence_signal() {
    local value="${1:-}"
    local lower="$(to_lower "$value")"
    if [[ "$lower" =~ (not|without|missing|unresolved|still)[[:space:]_-]+.*(user|owner)[[:space:]_-]*(confirmed|confirmation|approved|accepted|selected|decided|decision) ]] || \
        [[ "$lower" =~ (no|not|without|missing|unresolved|still)[[:space:]_-]+.*(source[[:space:]_-]*(recovered|restored|attached|linked)|evidence[[:space:]_-]*(added|recorded|linked)|decision[[:space:]_-]*(recorded|accepted|approved)|decision[[:space:]_-]*package[[:space:]_-]*(written|recorded)|open[[:space:]_-]*items?[[:space:]_-]*(updated|closed|written|recorded)|memory[[:space:]_-]*(updated|written|recorded)|split[[:space:]_-]*(confirmed|completed|created|approved)|verification[[:space:]_-]*(passed|evidence|recorded)|test[[:space:]_-]*(passed|evidence)) ]] || \
        [[ "$lower" =~ (source|evidence|decision|decision[[:space:]_-]*package|open[[:space:]_-]*items?|memory|split|verification|test)[[:space:]_-]+(missing|absent|unresolved|not[[:space:]_-]*found) ]]; then
        return 1
    fi
    if [[ "$lower" =~ (user[[:space:]_-]*(confirmed|confirmation|approved|accepted|selected|decided)|owner[[:space:]_-]*(confirmed|approved|accepted|selected|decided|decision)|source[[:space:]_-]*(recovered|restored|attached|linked)|recovered[[:space:]_-]*source|explicit[[:space:]_-]*rebase|rebase[[:space:]_-]*(approved|decision|accepted)|split[[:space:]_-]*(confirmed|completed|created|approved)|feature[[:space:]_-]*split[[:space:]_-]*(confirmed|completed|created|approved)|risk[[:space:]_-]*(accepted|approved|decision)|compliance[[:space:]_-]*(approved|decision)|verification[[:space:]_-]*(passed|evidence|recorded)|test[[:space:]_-]*(passed|evidence)|evidence[[:space:]_-]*(added|recorded|linked)|decision[[:space:]_-]*(recorded|accepted|approved)|decision[[:space:]_-]*package[[:space:]_-]*(written|recorded|linked)|open[[:space:]_-]*items?[[:space:]_-]*(updated|closed|written|recorded)|memory[[:space:]_-]*(updated|written|recorded)|writeback[[:space:]_-]*(completed|recorded|done)|written[[:space:]_-]*(to|back[[:space:]_-]*to)[[:space:]_-]*(memory|open[[:space:]_-]*items?)) ]]; then
        return 0
    fi
    return 1
}

contains_owner_review_outline_signal() {
    local value="${1:-}"
    local lower="$(to_lower "$value")"
    [[ "$lower" =~ source[[:space:]_-]*rebase ]] || \
        [[ "$lower" =~ rebase[[:space:]_-]*(decision|approved|accepted|required) ]] || \
        [[ "$lower" =~ (governance|constitution[[:space:]_-]*candidate|0[[:space:]_-]*to[[:space:]_-]*1|zero[[:space:]_-]*to[[:space:]_-]*one|new[[:space:]_-]*product) ]] || \
        [[ "$lower" =~ real[[:space:]_-]*(money|data) ]] || \
        [[ "$lower" =~ (^|[^[:alnum:]_])(compliance|privacy|security|audit|tenant|rbac|payment|billing|irreversible)([^[:alnum:]_]|$) ]] || \
        [[ "$lower" =~ risk[[:space:]_-]*(acceptance|decision|approved|accepted) ]] || \
        [[ "$lower" =~ scope[[:space:]_-]*(split|conflict) ]] || \
        [[ "$lower" =~ split[[:space:]_-]*(feature|required|decision|approved|accepted) ]]
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

normalize_doc_path() {
    local value
    value="$(trim "${1:-}")"
    value="${value//\`/}"
    local markdown_link_regex='\[[^][]+\]\(([^)]+)\)'
    if [[ "$value" =~ $markdown_link_regex ]]; then
        value="${BASH_REMATCH[1]}"
    fi
    value="${value%%#*}"
    value="$(trim "$value")"
    value="${value#./}"
    printf '%s' "$value"
}

is_local_doc_reference() {
    local value
    value="$(normalize_doc_path "${1:-}")"
    [[ -z "$value" ]] && return 1
    case "$(to_lower "$value")" in
        "-"|"n/a"|"na"|"none"|"tbd"|http://*|https://*|mailto:*|"#"*|"<"*|*"*"*|*"|"*)
            return 1
            ;;
    esac
    [[ "$value" == */* || "$value" =~ \.(md|mmd|json|yaml|yml|toml|txt|ts|tsx|js|jsx|py|go|rs|sh|ps1|sql|svg)$ ]]
}

resolve_feature_doc_path() {
    local value
    value="$(normalize_doc_path "${1:-}")"
    if [[ "$value" = /* ]]; then
        printf '%s' "$value"
    else
        printf '%s/%s' "$FEATURE_DIR" "$value"
    fi
}

open_items_row_has_header_columns() {
    local has_id=false
    local has_type=false
    local has_status=false
    local cell
    local clean
    local lower

    for cell in "$@"; do
        clean="$(clean_cell "$cell")"
        lower="$(to_lower "$clean")"
        case "$lower" in
            "item id"|"id"|"open item"|"open id")
                has_id=true
                ;;
            "type"|"item type")
                has_type=true
                ;;
            "status")
                has_status=true
                ;;
        esac
    done

    $has_id && $has_type && $has_status
}

should_skip_open_items_row() {
    local non_empty=0
    local cell
    local clean
    local lower
    local lower_cells=()

    for cell in "$@"; do
        clean="$(clean_cell "$cell")"
        lower="$(to_lower "$clean")"
        lower_cells+=("$lower")
        if ! is_empty_value "$clean"; then
            non_empty=$((non_empty + 1))
        fi
    done

    [[ $non_empty -eq 0 ]] && return 0

    local first="${1:-}"
    local second="${2:-}"
    first="$(clean_cell "$first")"
    second="$(clean_cell "$second")"
    first="$(to_lower "$first")"
    second="$(to_lower "$second")"

    case "$first" in
        "item id"|"id"|"open item"|"open id")
            [[ -z "$second" || "$second" == "type" ]] && return 0
            ;;
    esac

    if open_items_row_has_header_columns "$@"; then
        return 0
    fi

    return 1
}

open_item_header_index() {
    local header_line="${1:-}"
    shift
    [[ -z "$header_line" ]] && return 1

    local row="${header_line#|}"
    row="${row%|}"
    local headers
    IFS='|' read -ra headers <<< "$row"

    local i header alias
    for i in "${!headers[@]}"; do
        header="$(clean_cell "${headers[$i]}")"
        header="$(to_lower "$header")"
        for alias in "$@"; do
            if [[ "$header" == "$(to_lower "$alias")" ]]; then
                printf '%s' "$i"
                return 0
            fi
        done
    done
    return 1
}

open_item_cell() {
    local header_line="${1:-}"
    local fallback_index="$2"
    local aliases="$3"
    shift 3

    local index=""
    local alias_array
    IFS=',' read -ra alias_array <<< "$aliases"
    index="$(open_item_header_index "$header_line" "${alias_array[@]}" 2>/dev/null || true)"
    if [[ -z "$index" ]]; then
        index="$fallback_index"
    fi
    printf '%s' "${cols[$index]:-}"
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
        printf '{"status":"WARN","featureDir":"%s","errorCount":0,"warningCount":1,"needsHumanReview":false,"findings":[{"severity":"WARN","code":"NO_ACTIVE_FEATURE","message":"No active feature directory was found. Run /sp.prd first.","file":"","nextStep":"/sp.prd"}]}\n' "$(json_escape "$FEATURE_DIR")"
    else
        echo "WARN NO_ACTIVE_FEATURE: No active feature directory was found. Next step: /sp.prd"
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
FINDING_DELIM=$'\034'

add_finding() {
    local severity="$1"
    local code="$2"
    local message="$3"
    local file="${4:-}"
    local next_step="${5:-}"
    findings+=("$severity$FINDING_DELIM$code$FINDING_DELIM$message$FINDING_DELIM$file$FINDING_DELIM$next_step")
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
    local close_evidence="${13:-}"
    local tags="${14:-}"

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
    close_evidence="$(clean_cell "$close_evidence")"
    tags="$(clean_cell "$tags")"

    local type_lower="$(to_lower "$item_type")"
    local severity_lower="$(to_lower "$severity")"
    local status_lower="$(to_lower "$status")"
    local is_heavy=false

    case "$type_lower:$severity_lower" in
        risk:*|blocker:*|*:high)
            is_heavy=true
            ;;
    esac
    if contains_high_impact_signal "$impact_area $description $tags $affected_docs $rollback $close_condition"; then
        is_heavy=true
    fi

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

    if [[ "$is_heavy" == true ]] && [[ "$status_lower" == *"closed"* || "$status_lower" == *"resolved"* || "$status_lower" == *"verified"* || "$status_lower" == *"accepted"* || "$status_lower" == *"deferred"* || "$status_lower" == *"done"* || "$status_lower" == *"downgraded"* || "$status_lower" == *"invalid"* ]]; then
        if is_empty_value "$close_evidence"; then
            add_finding "ERROR" "OPEN_ITEM_CLOSE_EVIDENCE_MISSING" "$item_id is a closed/resolved high-impact item without Close Evidence. No Self-Pass: closure needs current verification, traceable source change, rollback/degrade evidence, or explicit human acceptance." "$OPEN_ITEMS" "/sp.analyze"
        fi
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
        "${block_status:-}" \
        "${block_close_evidence:-}" \
        "${block_tags:-}"

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
    block_close_evidence=""
    block_last_refresh=""
    block_status=""
    block_tags=""
}

trace_token_exists() {
    local token="$1"
    local escaped

    [[ "$token" =~ ^[A-Z][A-Z0-9_-]*-[0-9]+$ || "$token" =~ ^[A-Z]+[0-9]+(\.[A-Z]+[0-9]+)+$ ]] || return 1
    escaped="$(printf '%s' "$token" | sed -E 's/[][(){}.^$*+?|\\]/\\&/g')"
    grep -Eq "(^|[^A-Za-z0-9_.-])${escaped}([^A-Za-z0-9_.-]|$)" <<< "$TRACE_TEXT"
}

valid_open_item_link() {
    local anchor="$1"
    local affected_docs="$2"

    if [[ -z "$TRACE_TEXT" ]]; then
        return 1
    fi

    if ! is_empty_value "$anchor" && trace_token_exists "$anchor"; then
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

check_trace_expand_docs_liveness() {
    [[ -f "$TRACE_INDEX" ]] || return 0

    local expand_docs_index=""
    local line
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ "$line" == \|* ]] || continue
        is_markdown_table_separator "$line" && continue

        local row
        row="${line#|}"
        row="${row%|}"
        IFS='|' read -ra cols <<< "$row"
        local first
        first="$(clean_cell "${cols[0]:-}")"
        if [[ "$(to_lower "$first")" == "trace id" || "$(to_lower "$first")" == "id" ]]; then
            expand_docs_index=""
            local i header
            for i in "${!cols[@]}"; do
                header="$(clean_cell "${cols[$i]}")"
                if [[ "$(to_lower "$header")" == "expand docs" || "$(to_lower "$header")" == "expand doc" || "$(to_lower "$header")" == "expand documents" ]]; then
                    expand_docs_index="$i"
                    break
                fi
            done
            if [[ -z "$expand_docs_index" ]]; then
                if [[ ${#cols[@]} -gt 2 ]]; then
                    expand_docs_index=2
                else
                    add_finding "ERROR" "TRACE_EXPAND_DOC_COLUMN_MISSING" "trace-index.md table is missing an Expand Docs column." "$TRACE_INDEX" "/sp.analyze"
                fi
            fi
            continue
        fi

        case "$(to_lower "$first")" in
            "example"*|"sample"*)
                continue
                ;;
        esac

        if [[ -z "$expand_docs_index" ]]; then
            if [[ ${#cols[@]} -gt 2 ]]; then
                expand_docs_index=2
            else
                continue
            fi
        fi

        local expand_docs="${cols[$expand_docs_index]:-}"
        [[ -n "$expand_docs" ]] || continue

        IFS=',' read -ra docs <<< "$expand_docs"
        local doc
        for doc in "${docs[@]}"; do
            doc="$(normalize_doc_path "$doc")"
            is_empty_value "$doc" && continue
            is_local_doc_reference "$doc" || continue
            local resolved
            resolved="$(resolve_feature_doc_path "$doc")"
            if [[ ! -e "$resolved" ]]; then
                add_finding "ERROR" "TRACE_EXPAND_DOC_MISSING" "trace-index.md references missing Expand Docs file: $doc." "$TRACE_INDEX" "/sp.analyze"
            fi
        done
    done < "$TRACE_INDEX"
}

check_subject_confusion_artifacts() {
    local rel_root="$1"
    local next_step="$2"
    local scan_dir="$FEATURE_DIR/$rel_root"
    [[ -d "$scan_dir" ]] || return 0

    local pattern='(/sp\.|(^|[^A-Za-z0-9_-])sp\.[A-Za-z0-9_-]+|memory/index\.md|trace-index\.md|open-items\.md|SUBJECT_CONFUSION)'
    local spec_text=""
    if [[ -f "$FEATURE_DIR/spec.md" ]]; then
        spec_text="$(cat "$FEATURE_DIR/spec.md")"
    fi
    local spec_lower="$(to_lower "$spec_text")"
    local allows_control_plane_terms=false
    if [[ "$spec_lower" =~ (product[[:space:]_-]*(domain|type)|target[[:space:]_-]*(product|domain)|business[[:space:]_-]*domain).*(sp|speccompass|spec[[:space:]_-]*kit|ai[[:space:]_-]*agent|developer[[:space:]_-]*tool|cli|workflow[[:space:]_-]*tool|specification[[:space:]_-]*tool|process[[:space:]_-]*tool) ]]; then
        allows_control_plane_terms=true
    fi
    local hit
    while IFS= read -r hit || [[ -n "$hit" ]]; do
        [[ -n "$hit" ]] || continue
        local hit_file="${hit%%:*}"
        if $allows_control_plane_terms; then
            local content
            content="$(cat "$hit_file" 2>/dev/null || true)"
            local content_lower="$(to_lower "$content")"
            if [[ "$content_lower" =~ (source[[:space:]_-]*(anchor|business|spec|requirement)|business[[:space:]_-]*(domain|anchor)|product[[:space:]_-]*(domain|anchor)|trace[[:space:]_-]*id|coordinate|role|user|acceptance) ]]; then
                continue
            fi
        fi
        local message="Found likely SP control-plane term in $rel_root artifact. Flow/UI outputs must model the target business system, not SP execution mechanics."
        add_finding "ERROR" "SUBJECT_CONFUSION_CONTROL_PLANE_TERM" "$message" "$hit_file" "$next_step"
    done < <(grep -RInE "$pattern" "$scan_dir" --include='*.md' --include='*.mmd' --include='*.json' --include='*.yaml' --include='*.yml' 2>/dev/null || true)
}

extract_outline_field() {
    local line="$1"
    local field="$2"
    local header_line="${3:-}"
    local value=""
    local normalized_line
    normalized_line="$(clean_cell "$line")"

    if [[ "$line" == \|* ]]; then
        local row="${line#|}"
        row="${row%|}"
        IFS='|' read -ra cols <<< "$row"
        local index=""
        if [[ -n "$header_line" ]]; then
            local header_row="${header_line#|}"
            header_row="${header_row%|}"
            local headers
            IFS='|' read -ra headers <<< "$header_row"
            local i header_clean
            for i in "${!headers[@]}"; do
                header_clean="$(clean_cell "${headers[$i]}")"
                if [[ "$(to_lower "$header_clean")" == "$field" ]]; then
                    index="$i"
                    break
                fi
            done
        fi
        if [[ -z "$index" ]]; then
            case "$field" in
                status) index=1 ;;
                blocker-signature) index=2 ;;
                next-route) index=3 ;;
                evidence-summary) index=4 ;;
            esac
        fi
        value="${cols[$index]:-}"
    elif [[ "$normalized_line" =~ (^|[[:space:];,-])${field}[[:space:]]*[:=][[:space:]]*([^;|,]+) ]]; then
        value="${BASH_REMATCH[2]}"
    fi

    clean_cell "$value"
}

outline_table_row_has_header() {
    local line="$1"
    local expected_header="$2"
    [[ "$line" == \|* ]] || return 1

    local row="${line#|}"
    row="${row%|}"
    local cells
    IFS='|' read -ra cells <<< "$row"

    local cell clean lower
    for cell in "${cells[@]}"; do
        clean="$(clean_cell "$cell")"
        lower="$(to_lower "$clean")"
        if [[ "$lower" == "$expected_header" ]]; then
            return 0
        fi
    done
    return 1
}

outline_status_history_entry() {
    local outline="$1"
    local status="$2"
    local signature="$3"
    local next_route="$4"
    local evidence_summary="$5"

    status="$(clean_cell "$status")"
    signature="$(clean_cell "$signature")"
    next_route="$(clean_cell "$next_route")"
    evidence_summary="$(clean_cell "$evidence_summary")"

    local status_lower="$(to_lower "$status")"
    if [[ -z "$status_lower" ]]; then
        return 0
    fi
    case "$status_lower" in
        "status"|"ready_for_specify")
            ORB_previous_key=""
            return 0
            ;;
    esac
    if is_empty_value "$signature" || [[ "$(to_lower "$signature")" == "blocker-signature" ]]; then
        return 0
    fi

    local key="${status}|${signature}|${next_route}"
    local has_new_evidence=false
    if contains_new_evidence_signal "$evidence_summary"; then
        has_new_evidence=true
    fi
    if [[ "$key" == "$ORB_previous_key" && "$has_new_evidence" == false && "$ORB_previous_had_new_evidence" == false ]]; then
        add_finding "ERROR" "OUTLINE_REPEATED_BLOCKER_SIGNATURE" "spec-outline.md repeats the same status, blocker-signature, and next-route without visible new evidence: $signature. Write the decision package back to memory/open-items.md or the existing blocker record, then route to /sp.clarify, source recovery, owner decision, or feature split." "$outline" "/sp.clarify"
        ORB_found_repeated=true
        return 0
    fi
    ORB_previous_key="$key"
    ORB_previous_had_new_evidence="$has_new_evidence"
}

check_outline_repeated_blocker_signature() {
    local outline="$FEATURE_DIR/spec-outline.md"
    [[ -f "$outline" ]] || return 0

    local in_status_history=false
    local header_line=""
    ORB_previous_key=""
    ORB_previous_had_new_evidence=false
    ORB_found_repeated=false
    local list_status=""
    local list_signature=""
    local list_next_route=""
    local list_evidence_summary=""
    local in_list_entry=false
    local line
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ "$line" =~ ^[[:space:]]{0,3}#{1,6}[[:space:]]+ ]]; then
            if $in_list_entry; then
                outline_status_history_entry "$outline" "$list_status" "$list_signature" "$list_next_route" "$list_evidence_summary"
                $ORB_found_repeated && break
                in_list_entry=false
                list_status=""
                list_signature=""
                list_next_route=""
                list_evidence_summary=""
            fi
            if [[ "$(to_lower "$line")" == *"status history"* ]]; then
                in_status_history=true
                header_line=""
                ORB_previous_key=""
                ORB_previous_had_new_evidence=false
            elif $in_status_history; then
                break
            fi
            continue
        fi
        $in_status_history || continue
        is_markdown_table_separator "$line" && continue

        if [[ "$line" =~ ^[[:space:]]*[-*+][[:space:]]+ ]]; then
            if $in_list_entry; then
                outline_status_history_entry "$outline" "$list_status" "$list_signature" "$list_next_route" "$list_evidence_summary"
                $ORB_found_repeated && break
            fi
            in_list_entry=true
            list_status=""
            list_signature=""
            list_next_route=""
            list_evidence_summary=""
        fi

        if $in_list_entry && [[ "$line" != \|* ]]; then
            local list_value
            list_value="$(extract_outline_field "$line" "status" "")"
            [[ -n "$list_value" ]] && list_status="$list_value"
            list_value="$(extract_outline_field "$line" "blocker-signature" "")"
            [[ -n "$list_value" ]] && list_signature="$list_value"
            list_value="$(extract_outline_field "$line" "next-route" "")"
            [[ -n "$list_value" ]] && list_next_route="$list_value"
            list_value="$(extract_outline_field "$line" "evidence-summary" "")"
            [[ -n "$list_value" ]] && list_evidence_summary="$list_value"
            continue
        fi

        [[ "$line" == *"blocker-signature"* || "$line" == \|* ]] || continue

        if $in_list_entry; then
            outline_status_history_entry "$outline" "$list_status" "$list_signature" "$list_next_route" "$list_evidence_summary"
            $ORB_found_repeated && break
            in_list_entry=false
            list_status=""
            list_signature=""
            list_next_route=""
            list_evidence_summary=""
        fi

        if outline_table_row_has_header "$line" "blocker-signature"; then
            header_line="$line"
            continue
        fi

        local status signature next_route evidence_summary
        status="$(extract_outline_field "$line" "status" "$header_line")"
        signature="$(extract_outline_field "$line" "blocker-signature" "$header_line")"
        next_route="$(extract_outline_field "$line" "next-route" "$header_line")"
        evidence_summary="$(extract_outline_field "$line" "evidence-summary" "$header_line")"

        outline_status_history_entry "$outline" "$status" "$signature" "$next_route" "$evidence_summary"
        $ORB_found_repeated && break
    done < "$outline"

    if ! $ORB_found_repeated && $in_list_entry; then
        outline_status_history_entry "$outline" "$list_status" "$list_signature" "$list_next_route" "$list_evidence_summary"
    fi
}

check_ready_outline_source_snapshot() {
    local outline="$FEATURE_DIR/spec-outline.md"
    [[ -f "$outline" ]] || return 0

    local outline_text outline_lower
    outline_text="$(cat "$outline")"
    outline_lower="$(to_lower "$outline_text")"

    [[ "$outline_lower" == *"ready_for_specify"* ]] || return 0
    [[ "$outline_lower" == *"based on"* ]] || {
        add_finding "WARN" "OUTLINE_SOURCE_SNAPSHOT_MISSING" "spec-outline.md is READY_FOR_SPECIFY but does not include the minimum source freshness fields. Add Based On plus Source Snapshot, Source Authority Summary, or Evidence Signature so /sp.specify can verify what evidence the outline was derived from." "$outline" "/sp.prd"
        return 0
    }
    if [[ "$outline_lower" != *"source snapshot"* && "$outline_lower" != *"source authority summary"* && "$outline_lower" != *"evidence signature"* ]]; then
        add_finding "WARN" "OUTLINE_SOURCE_SNAPSHOT_MISSING" "spec-outline.md is READY_FOR_SPECIFY but does not include the minimum source freshness fields. Add Based On plus Source Snapshot, Source Authority Summary, or Evidence Signature so /sp.specify can verify what evidence the outline was derived from." "$outline" "/sp.prd"
    fi
}

check_outline_owner_review_required() {
    local outline="$FEATURE_DIR/spec-outline.md"
    [[ -f "$outline" ]] || return 0

    local outline_text
    outline_text="$(cat "$outline")"
    local outline_lower="$(to_lower "$outline_text")"

    [[ "$outline_lower" == *"ready_for_specify"* ]] || return 0
    if grep -qiE '^[[:space:]]{0,3}#{1,6}[[:space:]]+([0-9]+[.)][[:space:]]+)?owner review required([[:space:]:：-].*)?$' "$outline"; then
        return 0
    fi

    if contains_owner_review_outline_signal "$outline_text"; then
        add_finding "WARN" "OWNER_REVIEW_REQUIRED_MISSING" "spec-outline.md is READY_FOR_SPECIFY and contains high-risk or owner-decision signals, but no Owner Review Required block. This is a candidate warning; /sp.analyze or /sp.gate should decide whether owner confirmation is required before promotion." "$outline" "/sp.clarify"
    fi
}

check_evidence_signature_blocks() {
    local hit hit_file line_no block lower

    while IFS= read -r hit || [[ -n "$hit" ]]; do
        [[ -n "$hit" ]] || continue
        hit_file="${hit%%:*}"
        line_no="${hit#*:}"
        line_no="${line_no%%:*}"
        block="$(awk -v start="$line_no" '
            NR < start { next }
            NR == start { print; count = 1; next }
            count >= 50 { exit }
            /^[[:space:]]{0,3}```/ || /^[[:space:]]{0,3}~~~/ {
                in_fence = !in_fence
                print
                count++
                next
            }
            !in_fence && /^[[:space:]]{0,3}#{1,6}[[:space:]]+/ { exit }
            { print; count++ }
        ' "$hit_file" 2>/dev/null || true)"
        lower="$(to_lower "$block")"

        if [[ ! "$lower" =~ (source|sources|source[[:space:]_-]*docs|source[[:space:]_-]*files) ]]; then
            add_finding "WARN" "EVIDENCE_SIGNATURE_FIELD_MISSING" "Evidence Signature is missing source files/docs. Minimum fields: sources, anchors, open-items, visual review, checks." "$hit_file" "/sp.analyze"
        fi
        if [[ ! "$lower" =~ (anchor|anchors|key[[:space:]_-]*anchors|coordinate|trace) ]]; then
            add_finding "WARN" "EVIDENCE_SIGNATURE_FIELD_MISSING" "Evidence Signature is missing key anchors or trace coordinates." "$hit_file" "/sp.analyze"
        fi
        if [[ ! "$lower" =~ (open[[:space:]_-]*items|open_items|blockers|risks) ]]; then
            add_finding "WARN" "EVIDENCE_SIGNATURE_FIELD_MISSING" "Evidence Signature is missing open-items/blocker state." "$hit_file" "/sp.analyze"
        fi
        if [[ ! "$lower" =~ (visual[[:space:]_-]*review|visual_review|human[[:space:]_-]*review|review[[:space:]_-]*status) ]]; then
            add_finding "WARN" "EVIDENCE_SIGNATURE_FIELD_MISSING" "Evidence Signature is missing visual/human review status." "$hit_file" "/sp.analyze"
        fi
        if [[ ! "$lower" =~ (check|checks|validation|evidence[[:space:]_-]*record|test|gate|analyze) ]]; then
            add_finding "WARN" "EVIDENCE_SIGNATURE_FIELD_MISSING" "Evidence Signature is missing check or validation evidence." "$hit_file" "/sp.analyze"
        fi
    done < <(grep -RInE '^[[:space:]>#*-]*(Evidence Signature|evidence_signature)[[:space:]:]*$' "$FEATURE_DIR" --include='*.md' 2>/dev/null || true)
}

check_unbacked_human_confirmation_markers() {
    local hit hit_file line_no block lower

    while IFS= read -r hit || [[ -n "$hit" ]]; do
        [[ -n "$hit" ]] || continue
        hit_file="${hit%%:*}"
        line_no="${hit#*:}"
        line_no="${line_no%%:*}"
        block="$(sed -n "$((line_no > 6 ? line_no - 6 : 1)),$((line_no + 6))p" "$hit_file" 2>/dev/null || true)"
        lower="$(to_lower "$block")"

        if [[ "$lower" =~ (decision[[:space:]_-]*record|decision[[:space:]_-]*id|clarification[[:space:]_-]*id|confirmed[[:space:]_-]*by|confirmed_by_decision|clarifications\.md|clarify-log|human_decision|human[[:space:]_-]*decision|owner[[:space:]_-]*decision|user[[:space:]_-]*decision|decision[[:space:]_-]*package) ]]; then
            continue
        fi

        add_finding "WARN" "HUMAN_CONFIRMATION_EVIDENCE_MISSING" "Human-confirmation marker is not backed by a nearby decision record in the local scan window. This is a candidate WARN because a valid decision record may live in clarifications.md, clarify-log.md, or another cross-file handoff." "$hit_file" "/sp.clarify"
    done < <(grep -RInE '(\[src:user-confirmed\]|user-confirmed|USER_CONFIRMED|VERIFIED_BY_HUMAN|VERIFIED-BY-HUMAN|confirmed_by_user)' "$FEATURE_DIR" --include='*.md' 2>/dev/null || true)
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
    block_tags=""
    open_items_header_line=""

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
            case "$(to_lower "$field_name")" in
                type) block_type="$field_value" ;;
                severity) block_severity="$field_value" ;;
                anchor) block_anchor="$field_value" ;;
                owner) block_owner="$field_value" ;;
                description) block_description="$field_value" ;;
                "impact area") block_impact_area="$field_value" ;;
                "affected docs") block_affected_docs="$field_value" ;;
                "suggested rollback") block_rollback="$field_value" ;;
                "close condition") block_close_condition="$field_value" ;;
                "close evidence") block_close_evidence="$field_value" ;;
                "last refresh") block_last_refresh="$field_value" ;;
                tags) block_tags="$field_value" ;;
                status) block_status="$field_value" ;;
            esac
            continue
        fi

        [[ "$line" == \|* ]] || continue
        is_markdown_table_separator "$line" && continue

        row="${line#|}"
        row="${row%|}"
        IFS='|' read -ra cols <<< "$row"
        if should_skip_open_items_row "${cols[@]}"; then
            if open_items_row_has_header_columns "${cols[@]}"; then
                open_items_header_line="$line"
            fi
            continue
        fi

        process_open_item \
            "$(open_item_cell "$open_items_header_line" 0 "item id,id,open item,open id")" \
            "$(open_item_cell "$open_items_header_line" 1 "type,item type")" \
            "$(open_item_cell "$open_items_header_line" 2 "severity")" \
            "$(open_item_cell "$open_items_header_line" 5 "anchor,trace anchor,source anchor")" \
            "$(open_item_cell "$open_items_header_line" 7 "owner")" \
            "$(open_item_cell "$open_items_header_line" 8 "description,summary")" \
            "$(open_item_cell "$open_items_header_line" 9 "impact area,impact")" \
            "$(open_item_cell "$open_items_header_line" 10 "affected docs,affected documents,docs")" \
            "$(open_item_cell "$open_items_header_line" 11 "suggested rollback,rollback")" \
            "$(open_item_cell "$open_items_header_line" 12 "close condition,closure condition")" \
            "$(open_item_cell "$open_items_header_line" 13 "last refresh,last refreshed,updated")" \
            "$(open_item_cell "$open_items_header_line" 14 "status")" \
            "$(open_item_cell "$open_items_header_line" 15 "close evidence,closure evidence,evidence")" \
            "$(open_item_cell "$open_items_header_line" 6 "tags,tag")"
    done < "$OPEN_ITEMS"
    flush_open_item_block
fi

check_trace_expand_docs_liveness
check_subject_confusion_artifacts "flows" "/sp.flow"
check_subject_confusion_artifacts "ui" "/sp.ui"
check_outline_repeated_blocker_signature
check_ready_outline_source_snapshot
check_outline_owner_review_required
check_evidence_signature_blocks
check_unbacked_human_confirmation_markers

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
    line_lower="$(to_lower "$line_text")"

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

needs_human_review=false
for finding in "${findings[@]}"; do
    IFS="$FINDING_DELIM" read -r _severity code _message _file _next_step <<< "$finding"
    case "$code" in
        OWNER_REVIEW_REQUIRED_MISSING|HUMAN_CONFIRMATION_EVIDENCE_MISSING)
            needs_human_review=true
            break
            ;;
    esac
done

if $JSON_MODE; then
    printf '{"status":"%s","featureDir":"%s","errorCount":%d,"warningCount":%d,"needsHumanReview":%s,"findings":[' \
        "$status" "$(json_escape "$FEATURE_DIR")" "$error_count" "$warning_count" "$needs_human_review"
    first=true
    for finding in "${findings[@]}"; do
        IFS="$FINDING_DELIM" read -r severity code message file next_step <<< "$finding"
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
    echo "SP memory check: $status ($error_count errors, $warning_count warnings, needsHumanReview=$needs_human_review)"
    for finding in "${findings[@]}"; do
        IFS="$FINDING_DELIM" read -r severity code message file next_step <<< "$finding"
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
