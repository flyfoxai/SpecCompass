#!/usr/bin/env bash

# Update agent context files with information from plan.md
#
# This script maintains AI agent context files by parsing feature specifications
# and updating agent-specific configuration files with project information.

set -e
set -u
set -o pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

_paths_output=$(get_feature_paths) || { echo "ERROR: Failed to resolve feature paths" >&2; exit 1; }
eval "$_paths_output"
unset _paths_output

NEW_PLAN="$IMPL_PLAN"
AGENT_TYPE="${1:-}"

CLAUDE_FILE="$REPO_ROOT/CLAUDE.md"
GEMINI_FILE="$REPO_ROOT/GEMINI.md"
COPILOT_FILE="$REPO_ROOT/.github/copilot-instructions.md"
CURSOR_FILE="$REPO_ROOT/.cursor/rules/specify-rules.mdc"
QWEN_FILE="$REPO_ROOT/QWEN.md"
AGENTS_FILE="$REPO_ROOT/AGENTS.md"
WINDSURF_FILE="$REPO_ROOT/.windsurf/rules/specify-rules.md"
JUNIE_FILE="$REPO_ROOT/.junie/AGENTS.md"
KILOCODE_FILE="$REPO_ROOT/.kilocode/rules/specify-rules.md"
AUGGIE_FILE="$REPO_ROOT/.augment/rules/specify-rules.md"
ROO_FILE="$REPO_ROOT/.roo/rules/specify-rules.md"
CODEBUDDY_FILE="$REPO_ROOT/CODEBUDDY.md"
QODER_FILE="$REPO_ROOT/QODER.md"
AMP_FILE="$AGENTS_FILE"
SHAI_FILE="$REPO_ROOT/SHAI.md"
TABNINE_FILE="$REPO_ROOT/TABNINE.md"
KIRO_FILE="$AGENTS_FILE"
AGY_FILE="$REPO_ROOT/.agent/rules/specify-rules.md"
BOB_FILE="$AGENTS_FILE"
VIBE_FILE="$REPO_ROOT/.vibe/agents/specify-agents.md"
KIMI_FILE="$REPO_ROOT/KIMI.md"
TRAE_FILE="$REPO_ROOT/.trae/rules/project_rules.md"
IFLOW_FILE="$REPO_ROOT/IFLOW.md"
FORGE_FILE="$AGENTS_FILE"

TEMPLATE_FILE="$REPO_ROOT/.specify/templates/agent-file-template.md"

NEW_LANG=""
NEW_FRAMEWORK=""
NEW_DB=""
NEW_PROJECT_TYPE=""

log_info() { echo "INFO: $1"; }
log_success() { echo "✓ $1"; }
log_error() { echo "ERROR: $1" >&2; }
log_warning() { echo "WARNING: $1" >&2; }

_CLEANUP_FILES=()
cleanup() {
    local exit_code=$?
    trap - EXIT INT TERM
    if [ ${#_CLEANUP_FILES[@]} -gt 0 ]; then
        for f in "${_CLEANUP_FILES[@]}"; do
            rm -f "$f" "$f.bak" "$f.tmp"
        done
    fi
    exit $exit_code
}
trap cleanup EXIT INT TERM

validate_environment() {
    if [[ -z "$CURRENT_BRANCH" ]]; then
        log_error "Unable to determine current feature"
        if [[ "$HAS_GIT" == "true" ]]; then
            log_info "Make sure you're on a feature branch"
        else
            log_info "Set SPECIFY_FEATURE environment variable or create a feature first"
        fi
        exit 1
    fi

    if [[ ! -f "$NEW_PLAN" ]]; then
        log_error "No plan.md found at $NEW_PLAN"
        log_info "Make sure you're working on a feature with a corresponding spec directory"
        if [[ "$HAS_GIT" != "true" ]]; then
            log_info "Use: export SPECIFY_FEATURE=your-feature-name or create a new feature first"
        fi
        exit 1
    fi

    if [[ ! -f "$TEMPLATE_FILE" ]]; then
        log_warning "Template file not found at $TEMPLATE_FILE"
        log_warning "Creating new agent files will fail"
    fi
}

extract_plan_field() {
    local field_pattern="$1"
    local plan_file="$2"

    grep "^\*\*${field_pattern}\*\*: " "$plan_file" 2>/dev/null | \
        head -1 | \
        sed "s|^\*\*${field_pattern}\*\*: ||" | \
        sed 's/^[ \t]*//;s/[ \t]*$//' | \
        grep -v "NEEDS CLARIFICATION" | \
        grep -v "^N/A$" || echo ""
}

parse_plan_data() {
    local plan_file="$1"

    if [[ ! -f "$plan_file" ]]; then
        log_error "Plan file not found: $plan_file"
        return 1
    fi
    if [[ ! -r "$plan_file" ]]; then
        log_error "Plan file is not readable: $plan_file"
        return 1
    fi

    log_info "Parsing plan data from $plan_file"

    NEW_LANG=$(extract_plan_field "Language/Version" "$plan_file")
    NEW_FRAMEWORK=$(extract_plan_field "Primary Dependencies" "$plan_file")
    NEW_DB=$(extract_plan_field "Storage" "$plan_file")
    NEW_PROJECT_TYPE=$(extract_plan_field "Project Type" "$plan_file")

    [[ -n "$NEW_LANG" ]] && log_info "Found language: $NEW_LANG" || log_warning "No language information found in plan"
    [[ -n "$NEW_FRAMEWORK" ]] && log_info "Found framework: $NEW_FRAMEWORK"
    [[ -n "$NEW_DB" && "$NEW_DB" != "N/A" ]] && log_info "Found database: $NEW_DB"
    [[ -n "$NEW_PROJECT_TYPE" ]] && log_info "Found project type: $NEW_PROJECT_TYPE"
}

format_technology_stack() {
    local lang="$1"
    local framework="$2"
    local parts=()

    [[ -n "$lang" && "$lang" != "NEEDS CLARIFICATION" ]] && parts+=("$lang")
    [[ -n "$framework" && "$framework" != "NEEDS CLARIFICATION" && "$framework" != "N/A" ]] && parts+=("$framework")

    if [[ ${#parts[@]} -eq 0 ]]; then
        echo ""
    elif [[ ${#parts[@]} -eq 1 ]]; then
        echo "${parts[0]}"
    else
        echo "${parts[*]}" | sed 's/ / + /g'
    fi
}

project_structure() {
    local project_type="$1"
    if echo "$project_type" | grep -qi "web"; then
        cat <<'EOF'
backend/
frontend/
tests/
EOF
    else
        cat <<'EOF'
src/
tests/
EOF
    fi
}

commands_for_language() {
    local lang="$1"
    case "$lang" in
        *Python*) echo "cd src; pytest; ruff check ." ;;
        *Rust*) echo "cargo test; cargo clippy" ;;
        *JavaScript*|*TypeScript*) echo "npm test; npm run lint" ;;
        *) echo "# Add commands for $lang" ;;
    esac
}

language_conventions() {
    local lang="$1"
    if [[ -n "$lang" ]]; then
        echo "$lang: Follow standard conventions"
    else
        echo "General: Follow standard conventions"
    fi
}

ensure_agent_file() {
    local target_file="$1"
    local project_name="$2"
    local date_string="$3"

    if [[ -f "$target_file" ]]; then
        return 0
    fi
    if [[ ! -f "$TEMPLATE_FILE" ]]; then
        log_warning "Cannot create $target_file because template file is missing"
        return 1
    fi

    mkdir -p "$(dirname "$target_file")"
    local stack structure commands conventions
    stack="$(format_technology_stack "$NEW_LANG" "$NEW_FRAMEWORK")"
    structure="$(project_structure "$NEW_PROJECT_TYPE")"
    commands="$(commands_for_language "$NEW_LANG")"
    conventions="$(language_conventions "$NEW_LANG")"

    sed \
        -e "s|{{PROJECT_NAME}}|$(json_escape_file_token "$project_name")|g" \
        -e "s|{{DATE}}|$(json_escape_file_token "$date_string")|g" \
        -e "s|{{TECH_STACK}}|$(json_escape_file_token "$stack")|g" \
        -e "s|{{PROJECT_STRUCTURE}}|$(json_escape_file_token "$structure")|g" \
        -e "s|{{COMMANDS}}|$(json_escape_file_token "$commands")|g" \
        -e "s|{{CONVENTIONS}}|$(json_escape_file_token "$conventions")|g" \
        "$TEMPLATE_FILE" > "$target_file"

    log_success "Created agent file: $target_file"
}

update_recent_changes() {
    local target_file="$1"
    local project_name="$2"
    local date_string="$3"
    local temp_file="$target_file.tmp"
    _CLEANUP_FILES+=("$temp_file")

    local stack structure commands conventions
    stack="$(format_technology_stack "$NEW_LANG" "$NEW_FRAMEWORK")"
    structure="$(project_structure "$NEW_PROJECT_TYPE")"
    commands="$(commands_for_language "$NEW_LANG")"
    conventions="$(language_conventions "$NEW_LANG")"

    awk -v project_name="$project_name" \
        -v date_string="$date_string" \
        -v stack="$stack" \
        -v structure="$structure" \
        -v commands="$commands" \
        -v conventions="$conventions" '
BEGIN { in_recent = 0 }
{
    if ($0 ~ /^## Recent Changes$/) {
        print $0
        getline
        print $0
        print "- " date_string ": Updated for feature " project_name "."
        in_recent = 1
        next
    }
    if (in_recent && $0 ~ /^## /) {
        in_recent = 0
    }
    if (!in_recent) {
        print $0
    }
}' "$target_file" > "$temp_file"

    mv "$temp_file" "$target_file"
}

update_agent_file() {
    local agent_label="$1"
    local target_file="$2"
    local project_name="$3"
    local date_string="$4"

    if [[ ! -f "$target_file" ]]; then
        ensure_agent_file "$target_file" "$project_name" "$date_string" || return 1
    fi

    update_recent_changes "$target_file" "$project_name" "$date_string"
    log_success "Updated $agent_label context: $target_file"
}

update_target_agent() {
    local agent_key="$1"
    local project_name="$2"
    local date_string="$3"

    case "$agent_key" in
        claude) update_agent_file "Claude" "$CLAUDE_FILE" "$project_name" "$date_string" ;;
        gemini) update_agent_file "Gemini" "$GEMINI_FILE" "$project_name" "$date_string" ;;
        copilot) update_agent_file "Copilot" "$COPILOT_FILE" "$project_name" "$date_string" ;;
        cursor-agent) update_agent_file "Cursor" "$CURSOR_FILE" "$project_name" "$date_string" ;;
        qwen) update_agent_file "Qwen" "$QWEN_FILE" "$project_name" "$date_string" ;;
        codex|amp|kiro-cli|bob|forge) update_agent_file "$agent_key" "$AGENTS_FILE" "$project_name" "$date_string" ;;
        windsurf) update_agent_file "Windsurf" "$WINDSURF_FILE" "$project_name" "$date_string" ;;
        junie) update_agent_file "Junie" "$JUNIE_FILE" "$project_name" "$date_string" ;;
        kilocode) update_agent_file "Kilo Code" "$KILOCODE_FILE" "$project_name" "$date_string" ;;
        auggie) update_agent_file "Auggie" "$AUGGIE_FILE" "$project_name" "$date_string" ;;
        roo) update_agent_file "Roo" "$ROO_FILE" "$project_name" "$date_string" ;;
        codebuddy) update_agent_file "CodeBuddy" "$CODEBUDDY_FILE" "$project_name" "$date_string" ;;
        shai) update_agent_file "SHAI" "$SHAI_FILE" "$project_name" "$date_string" ;;
        tabnine) update_agent_file "Tabnine" "$TABNINE_FILE" "$project_name" "$date_string" ;;
        agy) update_agent_file "Agy" "$AGY_FILE" "$project_name" "$date_string" ;;
        vibe) update_agent_file "Vibe" "$VIBE_FILE" "$project_name" "$date_string" ;;
        qodercli) update_agent_file "Qoder CLI" "$QODER_FILE" "$project_name" "$date_string" ;;
        kimi) update_agent_file "Kimi" "$KIMI_FILE" "$project_name" "$date_string" ;;
        trae) update_agent_file "Trae" "$TRAE_FILE" "$project_name" "$date_string" ;;
        pi) update_agent_file "Pi" "$AGENTS_FILE" "$project_name" "$date_string" ;;
        iflow) update_agent_file "iFlow" "$IFLOW_FILE" "$project_name" "$date_string" ;;
        generic)
            log_warning "Generic agent has no dedicated context target"
            ;;
        *)
            log_warning "Unknown agent type: $agent_key"
            ;;
    esac
}

main() {
    validate_environment
    parse_plan_data "$NEW_PLAN"

    local project_name date_string
    project_name="$(basename "$REPO_ROOT")"
    date_string="$(date +%Y-%m-%d)"

    if [[ -n "$AGENT_TYPE" ]]; then
        update_target_agent "$AGENT_TYPE" "$project_name" "$date_string"
        return
    fi

    local existing_targets=()
    [[ -f "$CLAUDE_FILE" ]] && existing_targets+=("claude")
    [[ -f "$GEMINI_FILE" ]] && existing_targets+=("gemini")
    [[ -f "$COPILOT_FILE" ]] && existing_targets+=("copilot")
    [[ -f "$CURSOR_FILE" ]] && existing_targets+=("cursor-agent")
    [[ -f "$QWEN_FILE" ]] && existing_targets+=("qwen")
    [[ -f "$WINDSURF_FILE" ]] && existing_targets+=("windsurf")
    [[ -f "$JUNIE_FILE" ]] && existing_targets+=("junie")
    [[ -f "$KILOCODE_FILE" ]] && existing_targets+=("kilocode")
    [[ -f "$AUGGIE_FILE" ]] && existing_targets+=("auggie")
    [[ -f "$ROO_FILE" ]] && existing_targets+=("roo")
    [[ -f "$CODEBUDDY_FILE" ]] && existing_targets+=("codebuddy")
    [[ -f "$QODER_FILE" ]] && existing_targets+=("qodercli")
    [[ -f "$SHAI_FILE" ]] && existing_targets+=("shai")
    [[ -f "$TABNINE_FILE" ]] && existing_targets+=("tabnine")
    [[ -f "$AGY_FILE" ]] && existing_targets+=("agy")
    [[ -f "$VIBE_FILE" ]] && existing_targets+=("vibe")
    [[ -f "$KIMI_FILE" ]] && existing_targets+=("kimi")
    [[ -f "$TRAE_FILE" ]] && existing_targets+=("trae")
    [[ -f "$IFLOW_FILE" ]] && existing_targets+=("iflow")
    [[ -f "$AGENTS_FILE" ]] && existing_targets+=("codex")

    if [[ ${#existing_targets[@]} -eq 0 ]]; then
        existing_targets=("claude")
    fi

    for target in "${existing_targets[@]}"; do
        update_target_agent "$target" "$project_name" "$date_string"
    done
}

main "$@"
