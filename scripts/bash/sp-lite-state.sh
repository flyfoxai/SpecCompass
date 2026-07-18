#!/usr/bin/env bash

# Deterministic SP Lite lifecycle and global-governance routing.
# Reads durable project evidence and emits one route. It never executes it.

set -euo pipefail

JSON_MODE=false
SIGNATURE_MODE=false
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --signature) SIGNATURE_MODE=true ;;
        --help|-h)
            printf '%s\n' 'Usage: sp-lite-state.sh [--json | --signature]'
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
computed_input_signature=""
recorded_input_signature=""

json_array_from_csv() {
    local raw="${1:-}"
    raw="$(printf '%s' "$raw" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
    if [[ -z "$raw" || "$raw" == "None" || "$raw" == "none" || "$raw" == "[]" ]]; then
        printf '[]'
        return
    fi

    local first=true item
    printf '['
    while IFS= read -r item; do
        item="$(printf '%s' "$item" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
        [[ -n "$item" ]] || continue
        if $first; then first=false; else printf ','; fi
        printf '"%s"' "$(json_escape "$item")"
    done < <(printf '%s\n' "$raw" | tr ',' '\n')
    printf ']'
}

emit_route() {
    local status="$1" next="$2" reason="$3" active_feature="$4" feature_dir="$5"
    local active_round="$6" round_state="$7" global_control="$8"
    local continue_allowed="$9" requires_human="${10}" blocker_type="${11}"
    local blocker_route="${12}" reuse_refs="${13}" conflict_refs="${14}"
    local stale_refs="${15}" regression_failures="${16}"

    if ! $JSON_MODE; then
        printf 'Status: %s\nNext: %s\nReason: %s\n' "$status" "$next" "$reason"
        return
    fi

    printf '{'
    printf '"schema":"speckit.lite.route.v1",'
    printf '"status":"%s",' "$(json_escape "$status")"
    printf '"next":"%s",' "$(json_escape "$next")"
    printf '"reason":"%s",' "$(json_escape "$reason")"
    printf '"activeFeature":"%s",' "$(json_escape "$active_feature")"
    printf '"featureDir":"%s",' "$(json_escape "$feature_dir")"
    printf '"activeRound":"%s",' "$(json_escape "$active_round")"
    printf '"activeRoundState":"%s",' "$(json_escape "$round_state")"
    printf '"globalControl":"%s",' "$(json_escape "$global_control")"
    printf '"globalInputSignature":"%s",' "$(json_escape "$recorded_input_signature")"
    printf '"currentInputSignature":"%s",' "$(json_escape "$computed_input_signature")"
    printf '"continueAllowed":%s,' "$continue_allowed"
    printf '"requiresHuman":%s,' "$requires_human"
    printf '"blockerType":"%s",' "$(json_escape "$blocker_type")"
    printf '"blockerRoute":"%s",' "$(json_escape "$blocker_route")"
    printf '"reuseRefs":%s,' "$(json_array_from_csv "$reuse_refs")"
    printf '"conflictRefs":%s,' "$(json_array_from_csv "$conflict_refs")"
    printf '"staleRefs":%s,' "$(json_array_from_csv "$stale_refs")"
    printf '"regressionFailures":%s' "$(json_array_from_csv "$regression_failures")"
    printf '}\n'
}

read_feature_pointer() {
    local feature_json="$repo_root/.specify/feature.json" feature_dir=""
    [[ -f "$feature_json" ]] || return 1
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

resolve_feature_dir() {
    if [[ -n "${SPECIFY_FEATURE_DIRECTORY:-}" ]]; then
        local explicit="$SPECIFY_FEATURE_DIRECTORY"
        [[ "$explicit" != /* ]] && explicit="$repo_root/$explicit"
        printf '%s\n' "$explicit"
        return
    fi
    if read_feature_pointer; then return; fi

    local candidates=()
    while IFS= read -r candidate; do candidates+=("$candidate"); done < <(find "$repo_root/specs" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)
    if ((${#candidates[@]} == 1)); then printf '%s\n' "${candidates[0]}"; return; fi
    return 1
}

field_value() {
    local file="$1" label="$2"
    awk -v label="$label" '
        index($0, "- " label ":") == 1 {
            value = substr($0, length(label) + 4)
            sub(/^[[:space:]]+/, "", value)
            sub(/[[:space:]]+$/, "", value)
            print value
            exit
        }
    ' "$file"
}

sha256_stream() {
    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 | awk '{print $1}'
    elif command -v sha256sum >/dev/null 2>&1; then
        sha256sum | awk '{print $1}'
    else
        openssl dgst -sha256 | awk '{print $NF}'
    fi
}

sha256_file() {
    local file="$1"
    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file" | awk '{print $1}'
    elif command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | awk '{print $1}'
    else
        openssl dgst -sha256 "$file" | awk '{print $NF}'
    fi
}

signature_excluded() {
    local relative="$1" lite_relative="$2"
    [[ "$relative" == "$lite_relative" ]] && return 0
    case "$relative" in
        .git/*|.venv/*|node_modules/*|dist/*|build/*|output/*|\
        .pytest_cache/*|.mypy_cache/*|.ruff_cache/*|__pycache__/*|*/__pycache__/*|\
        .specify/workflows/runs/*)
            return 0 ;;
    esac
    return 1
}

compute_input_signature() {
    local root="$1" dir="$2" lite_relative="" relative file digest head
    local manifest
    manifest=$(mktemp)

    if [[ "$dir" == "$root"/* ]]; then
        lite_relative="${dir#"$root"/}/lite.md"
    fi

    if git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        head=$(git -C "$root" rev-parse HEAD 2>/dev/null || printf 'NO_HEAD')
        printf 'HEAD\t%s\n' "$head" >> "$manifest"
        while IFS= read -r -d '' relative; do
            signature_excluded "$relative" "$lite_relative" && continue
            file="$root/$relative"
            [[ -f "$file" ]] || continue
            digest=$(sha256_file "$file")
            printf '%s\t%s\n' "$relative" "$digest" >> "$manifest"
        done < <(git -C "$root" ls-files -co --exclude-standard -z | LC_ALL=C sort -z)
    else
        while IFS= read -r -d '' file; do
            relative="${file#"$root"/}"
            signature_excluded "$relative" "$lite_relative" && continue
            digest=$(sha256_file "$file")
            printf '%s\t%s\n' "$relative" "$digest" >> "$manifest"
        done < <(find "$root" -type f -print0 2>/dev/null | LC_ALL=C sort -z)
    fi

    sha256_stream < "$manifest"
    rm -f "$manifest"
}

prd_outline_ready() {
    local dir="$1"
    [[ -f "$dir/prd.md" && -f "$dir/spec-outline.md" ]] || return 1
    ! grep -Eq 'SP_STAGE_SEED:' "$dir/prd.md" "$dir/spec-outline.md" 2>/dev/null
}

spec_ready() {
    local dir="$1"
    [[ -f "$dir/spec.md" ]] || return 1
    ! grep -Eq 'SP_STAGE_SEED:' "$dir/spec.md" 2>/dev/null
}

feature_dir=""
if ! feature_dir=$(resolve_feature_dir) || [[ ! -d "$feature_dir" ]]; then
    emit_route "NEEDS_FOUNDATION" "/sp.prd" "no-active-feature" "" "$feature_dir" "None" "NOT_STARTED" "STALE_EVIDENCE" false true "MISSING_FOUNDATION" "/sp.prd" "None" "None" "feature" "None"
    exit 0
fi
active_feature=$(basename "$feature_dir")

computed_input_signature=$(compute_input_signature "$repo_root" "$feature_dir")
if $SIGNATURE_MODE; then
    printf '%s\n' "$computed_input_signature"
    exit 0
fi

if ! prd_outline_ready "$feature_dir"; then
    emit_route "NEEDS_FOUNDATION" "/sp.prd" "foundation-incomplete" "$active_feature" "$feature_dir" "None" "NOT_STARTED" "CLEAR" true false "MISSING_FOUNDATION" "/sp.prd" "None" "None" "None" "None"
    exit 0
fi

if ! spec_ready "$feature_dir"; then
    emit_route "NEEDS_SPEC" "/sp.specify" "spec-missing-or-seed" "$active_feature" "$feature_dir" "None" "NOT_STARTED" "CLEAR" true false "MISSING_SPEC" "/sp.specify" "None" "None" "None" "None"
    exit 0
fi

lite_file="$feature_dir/lite.md"
if [[ ! -f "$lite_file" ]] || grep -Eq 'SP_STAGE_SEED:[[:space:]]*lite' "$lite_file"; then
    emit_route "NEEDS_CANDIDATES" "/sp.lite" "human-direction-selection-required" "$active_feature" "$feature_dir" "None" "NOT_STARTED" "CLEAR" false true "HUMAN_SELECTION" "/sp.lite" "None" "None" "None" "None"
    exit 0
fi

state=$(field_value "$lite_file" "State")
active_round=$(field_value "$lite_file" "Active Round")
round_state=$(field_value "$lite_file" "Active Round State")
human_selection=$(field_value "$lite_file" "Human Direction Selection")
global_status=$(field_value "$lite_file" "Global Status")
global_input=$(field_value "$lite_file" "Global Input Signature")
recorded_input_signature="$global_input"
current_input="$computed_input_signature"
reuse_refs=$(field_value "$lite_file" "Reuse Refs")
conflict_refs=$(field_value "$lite_file" "Conflict Refs")
stale_refs=$(field_value "$lite_file" "Stale Refs")
regression_failures=$(field_value "$lite_file" "Regression Failures")
blocker_route=$(field_value "$lite_file" "Blocker Route")
selected_candidate=$(field_value "$lite_file" "Selected Candidate")
included_anchors=$(field_value "$lite_file" "Included Outline Anchors")
allowed_write_set=$(field_value "$lite_file" "Allowed Write Set")
completed_stages=$(field_value "$lite_file" "Completed Owner Stages")
skipped_stages=$(field_value "$lite_file" "Skipped Owner Stages")
stage_evidence_refs=$(field_value "$lite_file" "Stage Evidence Refs")
stage_source_signatures=$(field_value "$lite_file" "Stage Source Signatures")
stage_skip_reasons=$(field_value "$lite_file" "Stage Skip Reasons")
stage_skip_confirmations=$(field_value "$lite_file" "Stage Skip Confirmations")
completion_evidence=$(field_value "$lite_file" "Completion Evidence")

[[ -n "$state" ]] || state="NEEDS_CANDIDATES"
[[ -n "$active_round" ]] || active_round="None"
[[ -n "$round_state" ]] || round_state="NOT_STARTED"
[[ -n "$global_status" ]] || global_status="STALE_EVIDENCE"
[[ "$blocker_route" =~ ^/sp\.[A-Za-z0-9._-]+$ ]] || blocker_route="/sp.lite"

has_refs() {
    local value="${1:-}"
    [[ -n "$value" && "$value" != "None" && "$value" != "none" && "$value" != "[]" ]]
}

if [[ -n "$global_input" && "$global_input" != "None" && "$global_input" != "$current_input" ]]; then
    global_status="STALE_EVIDENCE"
    [[ -n "$stale_refs" && "$stale_refs" != "None" ]] || stale_refs="global-input-signature"
    emit_route "$state" "/sp.lite" "global-input-signature-changed" "$active_feature" "$feature_dir" "$active_round" "$round_state" "$global_status" false true "STALE_EVIDENCE" "/sp.lite" "$reuse_refs" "$conflict_refs" "$stale_refs" "$regression_failures"
    exit 0
fi

csv_has_token() {
    local csv="${1:-}" wanted="$2" item
    while IFS= read -r item; do
        item="$(printf '%s' "$item" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
        [[ "$item" == "$wanted" ]] && return 0
    done < <(printf '%s\n' "$csv" | tr ',' '\n')
    return 1
}

stage_ref() {
    local stage="$1" default_ref="$2" entry
    while IFS= read -r entry; do
        entry="$(printf '%s' "$entry" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
        if [[ "$entry" == "$stage="* ]]; then
            printf '%s\n' "${entry#*=}"
            return
        fi
    done < <(printf '%s\n' "$stage_evidence_refs" | tr ',' '\n')
    printf '%s\n' "$default_ref"
}

stage_source_signature() {
    local stage="$1" entry value
    while IFS= read -r entry; do
        entry="$(printf '%s' "$entry" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
        if [[ "$entry" == "$stage="* ]]; then
            value="${entry#*=}"
            [[ "$value" =~ ^[0-9a-fA-F]{64}$ ]] || return 1
            printf '%s\n' "$value"
            return
        fi
    done < <(printf '%s\n' "$stage_source_signatures" | tr ',' '\n')
    return 1
}

evidence_field_value() {
    local file="$1" label="$2"
    awk -v label="$label" '
        {
            line = $0
            sub(/^[[:space:]]+/, "", line)
            sub(/^-[[:space:]]*/, "", line)
            prefix = label ":"
            if (index(line, prefix) == 1) {
                value = substr(line, length(prefix) + 1)
                sub(/^[[:space:]]+/, "", value)
                sub(/[[:space:]]+$/, "", value)
                print value
                exit
            }
        }
    ' "$file"
}

round_stage_evidence_valid() {
    local stage="$1" evidence_file="$2" expected_signature
    expected_signature=$(stage_source_signature "$stage") || return 1
    [[ "$(evidence_field_value "$evidence_file" "Lite Round")" == "$active_round" ]] || return 1
    [[ "$(evidence_field_value "$evidence_file" "Lite Stage")" == "$stage" ]] || return 1
    [[ "$(evidence_field_value "$evidence_file" "Source Signature")" == "$expected_signature" ]] || return 1
    [[ "$(evidence_field_value "$evidence_file" "Included Outline Anchors")" == "$included_anchors" ]] || return 1

    case "$stage" in
        FLOW|UI)
            [[ "$(evidence_field_value "$evidence_file" "Human Confirmation")" == "CONFIRMED" ]] || return 1
            ;;
        PLAN)
            [[ "$(evidence_field_value "$evidence_file" "Human Approval")" == "CONFIRMED" ]] || return 1
            ;;
    esac
}

protected_stage_basename() {
    case "$1" in
        BUSINESS_GATE) printf '%s\n' 'business-gate.md' ;;
        PRE_IMPL_ANALYZE) printf '%s\n' 'pre-impl-analysis.md' ;;
        PRE_IMPL_GATE) printf '%s\n' 'pre-impl-gate.md' ;;
        FINAL_ANALYZE) printf '%s\n' 'final-analysis.md' ;;
        FINAL_GATE) printf '%s\n' 'final-gate.md' ;;
        *) return 1 ;;
    esac
}

protected_stage_gate_mode() {
    case "$1" in
        BUSINESS_GATE) printf '%s\n' 'Business' ;;
        PRE_IMPL_GATE) printf '%s\n' 'Implementation Readiness' ;;
        FINAL_GATE) printf '%s\n' 'Implementation Regression' ;;
        *) return 1 ;;
    esac
}

protected_stage_evidence_valid() {
    local stage="$1" ref="$2" basename expected_ref other other_ref gate_mode evidence_file
    basename=$(protected_stage_basename "$stage") || return 1
    expected_ref="lite-evidence/$active_round/$basename"
    [[ "$ref" == "$expected_ref" ]] || return 1

    for other in BUSINESS_GATE PRE_IMPL_ANALYZE PRE_IMPL_GATE FINAL_ANALYZE FINAL_GATE; do
        [[ "$other" == "$stage" ]] && continue
        other_ref=$(stage_ref "$other" "")
        [[ -z "$other_ref" || "$other_ref" != "$ref" ]] || return 1
    done

    evidence_file="$feature_dir/$ref"
    round_stage_evidence_valid "$stage" "$evidence_file" || return 1

    if gate_mode=$(protected_stage_gate_mode "$stage"); then
        grep -Eq "^[[:space:]]*(-[[:space:]]*)?Gate Mode:[[:space:]]*$gate_mode[[:space:]]*$" "$evidence_file" || return 1
    fi
}

stage_skip_has_reason() {
    local stage="$1" entry
    while IFS= read -r entry; do
        entry="$(printf '%s' "$entry" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
        [[ "$entry" == "$stage="?* ]] && return 0
    done < <(printf '%s\n' "$stage_skip_reasons" | tr ';' '\n')
    return 1
}

stage_skip_is_confirmed() {
    local stage="$1" entry
    while IFS= read -r entry; do
        entry="$(printf '%s' "$entry" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
        [[ "$entry" == "$stage=NOT_REQUIRED_CONFIRMED" ]] && return 0
    done < <(printf '%s\n' "$stage_skip_confirmations" | tr ';' '\n')
    return 1
}

stage_evidence_valid() {
    local stage="$1" default_ref="$2" marker="$3" ref evidence_file
    if csv_has_token "$skipped_stages" "$stage"; then
        [[ "$stage" == "FLOW" || "$stage" == "UI" ]] &&
            stage_skip_has_reason "$stage" && stage_skip_is_confirmed "$stage"
        return
    fi
    csv_has_token "$completed_stages" "$stage" || return 1
    if [[ "$stage" == "IMPLEMENT" ]]; then
        stage_source_signature "$stage" >/dev/null && has_refs "$completion_evidence"
        return
    fi
    ref=$(stage_ref "$stage" "$default_ref")
    [[ -n "$ref" && "$ref" != /* && "$ref" != *".."* ]] || return 1
    evidence_file="$feature_dir/$ref"
    [[ -f "$evidence_file" ]] || return 1
    ! grep -Eq 'SP_STAGE_SEED:' "$evidence_file" 2>/dev/null || return 1
    if protected_stage_basename "$stage" >/dev/null 2>&1; then
        protected_stage_evidence_valid "$stage" "$ref" || return 1
    elif [[ "$stage" != "SPECIFY" ]]; then
        round_stage_evidence_valid "$stage" "$evidence_file" || return 1
    fi
    [[ -z "$marker" ]] || grep -Eqi "$marker" "$evidence_file"
}

prior_stage_evidence_valid() {
    local requested="$1"
    local pass_verdict='^[[:space:]]*(-[[:space:]]*)?(Current[[:space:]]+)?Verdict[[:space:]]*:[[:space:]]*`?PASS`?[[:space:]]*$'
    stage_evidence_valid "SPECIFY" "spec.md" 'READY_FOR_FLOW' || return 1
    [[ "$requested" == "NEEDS_FLOW" ]] && return 0
    stage_evidence_valid "FLOW" "flows/index.md" 'READY_FOR_UI' || return 1
    [[ "$requested" == "NEEDS_UI" ]] && return 0
    stage_evidence_valid "UI" "ui/index.md" 'READY_FOR_PLAN' || return 1
    [[ "$requested" == "NEEDS_BUSINESS_GATE" ]] && return 0
    stage_evidence_valid "BUSINESS_GATE" "" "$pass_verdict" || return 1
    [[ "$requested" == "NEEDS_BUNDLE" ]] && return 0
    stage_evidence_valid "BUNDLE" "bundle.md" '' || return 1
    [[ "$requested" == "NEEDS_PLAN" ]] && return 0
    stage_evidence_valid "PLAN" "plan.md" 'Implementation Readiness' || return 1
    [[ "$requested" == "NEEDS_TASKS" ]] && return 0
    stage_evidence_valid "TASKS" "tasks.md" 'Mode:[[:space:]]*impl' || return 1
    [[ "$requested" == "NEEDS_PRE_IMPL_ANALYZE" ]] && return 0
    stage_evidence_valid "PRE_IMPL_ANALYZE" "" "$pass_verdict" || return 1
    [[ "$requested" == "NEEDS_PRE_IMPL_GATE" ]] && return 0
    stage_evidence_valid "PRE_IMPL_GATE" "" "$pass_verdict" || return 1
    [[ "$requested" == "NEEDS_IMPLEMENT" ]] && return 0
    stage_evidence_valid "IMPLEMENT" "" "" || return 1
    [[ "$requested" == "NEEDS_FINAL_ANALYZE" ]] && return 0
    stage_evidence_valid "FINAL_ANALYZE" "" "$pass_verdict" || return 1
    [[ "$requested" == "NEEDS_FINAL_GATE" ]] && return 0
    stage_evidence_valid "FINAL_GATE" "" "$pass_verdict" || return 1
}

if [[ "$global_status" == "STALE_EVIDENCE" ]] || has_refs "$stale_refs"; then
    emit_route "$state" "$blocker_route" "global-evidence-stale" "$active_feature" "$feature_dir" "$active_round" "$round_state" "STALE_EVIDENCE" false true "STALE_EVIDENCE" "$blocker_route" "$reuse_refs" "$conflict_refs" "$stale_refs" "$regression_failures"
    exit 0
fi
if [[ "$global_status" == "RECONCILE_REQUIRED" ]] || has_refs "$conflict_refs"; then
    emit_route "$state" "$blocker_route" "global-reconciliation-required" "$active_feature" "$feature_dir" "$active_round" "$round_state" "RECONCILE_REQUIRED" false true "GLOBAL_CONFLICT" "$blocker_route" "$reuse_refs" "$conflict_refs" "$stale_refs" "$regression_failures"
    exit 0
fi
if [[ "$global_status" == "REGRESSION_BLOCKED" ]] || has_refs "$regression_failures"; then
    emit_route "$state" "$blocker_route" "historical-regression-blocked" "$active_feature" "$feature_dir" "$active_round" "$round_state" "REGRESSION_BLOCKED" false true "HISTORY_REGRESSION" "$blocker_route" "$reuse_refs" "$conflict_refs" "$stale_refs" "$regression_failures"
    exit 0
fi

case "$global_status" in
    REUSE_REQUIRED)
        emit_route "$state" "/sp.lite" "duplicate-scope-requires-reuse" "$active_feature" "$feature_dir" "$active_round" "$round_state" "$global_status" false true "DUPLICATE_SCOPE" "/sp.lite" "$reuse_refs" "$conflict_refs" "$stale_refs" "$regression_failures"
        exit 0 ;;
    CLEAR) ;;
    *)
        emit_route "$state" "/sp.lite" "global-control-invalid" "$active_feature" "$feature_dir" "$active_round" "$round_state" "STALE_EVIDENCE" false true "STALE_EVIDENCE" "/sp.lite" "$reuse_refs" "$conflict_refs" "$stale_refs" "$regression_failures"
        exit 0 ;;
esac

case "$state" in
    NEEDS_SPECIFY|NEEDS_FLOW|NEEDS_UI|NEEDS_BUSINESS_GATE|NEEDS_BUNDLE|NEEDS_PLAN|NEEDS_TASKS|NEEDS_PRE_IMPL_ANALYZE|NEEDS_PRE_IMPL_GATE|NEEDS_IMPLEMENT|NEEDS_FINAL_ANALYZE|NEEDS_FINAL_GATE|READY_FOR_BUSINESS_VALIDATION)
        if [[ ! "$active_round" =~ ^LITE-R[0-9]{3,}$ ]] ||
           [[ "$human_selection" != "CONFIRMED" ]] ||
           ! has_refs "$selected_candidate" ||
           ! has_refs "$included_anchors" ||
           ! has_refs "$allowed_write_set"; then
            emit_route "$state" "/sp.lite" "active-round-authorization-incomplete" "$active_feature" "$feature_dir" "$active_round" "$round_state" "CLEAR" false true "INVALID_LITE_AUTHORIZATION" "/sp.lite" "$reuse_refs" "$conflict_refs" "$stale_refs" "$regression_failures"
            exit 0
        fi
        if [[ "$state" != "NEEDS_SPECIFY" ]] && ! prior_stage_evidence_valid "$state"; then
            emit_route "$state" "/sp.lite" "prior-owner-evidence-incomplete" "$active_feature" "$feature_dir" "$active_round" "$round_state" "CLEAR" false true "INVALID_STAGE_EVIDENCE" "/sp.lite" "$reuse_refs" "$conflict_refs" "$stale_refs" "$regression_failures"
            exit 0
        fi
        ;;
esac

next="/sp.lite"
continue_allowed=true
requires_human=false
blocker_type="NONE"
reason="lite-lifecycle-route"
case "$state" in
    NEEDS_SPECIFY) next="/sp.specify" ;;
    NEEDS_FLOW) next="/sp.flow" ;;
    NEEDS_UI) next="/sp.ui" ;;
    NEEDS_BUSINESS_GATE) next="/sp.gate" ;;
    NEEDS_BUNDLE) next="/sp.bundle" ;;
    NEEDS_PLAN) next="/sp.plan" ;;
    NEEDS_TASKS) next="/sp.tasks" ;;
    NEEDS_PRE_IMPL_ANALYZE) next="/sp.analyze" ;;
    NEEDS_PRE_IMPL_GATE) next="/sp.gate" ;;
    NEEDS_IMPLEMENT) next="/sp.implement" ;;
    NEEDS_FINAL_ANALYZE) next="/sp.analyze" ;;
    NEEDS_FINAL_GATE) next="/sp.gate" ;;
    READY_FOR_BUSINESS_VALIDATION|NEEDS_CANDIDATES|OUTLINE_COMPLETE_VIA_LITE)
        continue_allowed=false
        requires_human=true
        blocker_type="HUMAN_SELECTION"
        reason="human-lite-decision-required"
        ;;
    *)
        continue_allowed=false
        requires_human=true
        blocker_type="INVALID_LITE_STATE"
        reason="unknown-lite-state"
        ;;
esac

emit_route "$state" "$next" "$reason" "$active_feature" "$feature_dir" "$active_round" "$round_state" "CLEAR" "$continue_allowed" "$requires_human" "$blocker_type" "$next" "$reuse_refs" "$conflict_refs" "$stale_refs" "$regression_failures"
