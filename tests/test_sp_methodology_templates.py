"""Regression tests for SP methodology rules embedded in command templates."""

import hashlib
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import pytest
import yaml


PROJECT_ROOT = Path(__file__).resolve().parent.parent
COMMANDS_DIR = PROJECT_ROOT / "templates" / "commands"
FEATURE_MEMORY_DIR = PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "memory"
FEATURE_TEMPLATE_DIR = PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature"
PROJECT_MEMORY_DIR = PROJECT_ROOT / "templates" / "project" / ".specify" / "memory"
METHODOLOGY_DOC = PROJECT_ROOT / "docs" / "reference" / "sp-project-methodology.md"
PRODUCT_PRD = PROJECT_ROOT / "docs" / "reference" / "speccompass-product-requirements.zh-CN.md"
REVIEW_ROOT = PROJECT_ROOT / "templates" / "project" / ".specify" / "review"
FLOW_REVIEW_SCHEMA = REVIEW_ROOT / "schemas" / "flow-review-data.schema.json"
UI_REVIEW_SCHEMA = REVIEW_ROOT / "schemas" / "ui-review-data.schema.json"
OUTLINE_REVIEW_SCHEMA = REVIEW_ROOT / "schemas" / "outline-review-data.schema.json"
OUTLINE_DISCOVERY_SCHEMA = REVIEW_ROOT / "schemas" / "outline-discovery-data.schema.json"
OUTLINE_DISCOVERY_RESPONSE_SCHEMA = REVIEW_ROOT / "schemas" / "outline-discovery-response.schema.json"
OUTLINE_INTENT_LEDGER_SCHEMA = REVIEW_ROOT / "schemas" / "outline-intent-ledger.schema.json"
REVIEW_INDEX_SCHEMA = REVIEW_ROOT / "schemas" / "review-index.schema.json"
OUTLINE_BOUNDARIES_SCHEMA = REVIEW_ROOT / "schemas" / "outline-boundaries.schema.json"
OUTLINE_BOUNDARIES_ADOPTION_SCHEMA = REVIEW_ROOT / "schemas" / "outline-boundaries-adoption.schema.json"
OUTLINE_DRAFT_RESET_SCHEMA = REVIEW_ROOT / "schemas" / "outline-draft-reset.schema.json"
FEATURE_CODE_LEDGER_SCHEMA = REVIEW_ROOT / "schemas" / "feature-code-ledger.schema.json"
REVIEW_DATA_VALIDATOR = REVIEW_ROOT / "scripts" / "validate-review-data.mjs"
REVIEW_INDEX_VALIDATOR = REVIEW_ROOT / "scripts" / "validate-review-index.mjs"
REVIEW_INDEX_MIGRATOR = REVIEW_ROOT / "scripts" / "migrate-review-index.mjs"
OUTLINE_BOUNDARIES_VALIDATOR = REVIEW_ROOT / "scripts" / "validate-outline-boundaries.mjs"
OUTLINE_BOUNDARIES_SYNC = REVIEW_ROOT / "scripts" / "sync-review-index.mjs"
OUTLINE_BOUNDARIES_BOOTSTRAP = REVIEW_ROOT / "scripts" / "bootstrap-outline-boundaries.mjs"
OUTLINE_BOUNDARIES_LIB = REVIEW_ROOT / "scripts" / "outline-boundaries-lib.mjs"
FEATURE_CODE_LEDGER_LIB = REVIEW_ROOT / "scripts" / "feature-code-ledger-lib.mjs"
FEATURE_CODE_MANAGER = REVIEW_ROOT / "scripts" / "manage-feature-codes.mjs"
OUTLINE_TRANSITION_LOCK = REVIEW_ROOT / "scripts" / "outline-transition-lock.mjs"
OUTLINE_BASELINE_ACTIVATOR = REVIEW_ROOT / "scripts" / "activate-outline-baseline.mjs"
OUTLINE_BOUNDARY_GATE = REVIEW_ROOT / "scripts" / "check-outline-boundary-gate.mjs"
OUTLINE_DRAFT_RESET = REVIEW_ROOT / "scripts" / "discard-outline-draft.mjs"
OUTLINE_DRAFT_RESET_VALIDATOR = REVIEW_ROOT / "scripts" / "validate-outline-draft-reset.mjs"
OUTLINE_TRANSITION_START = REVIEW_ROOT / "scripts" / "start-outline-transition.mjs"
OUTLINE_ADJUSTMENT_PREPARE = REVIEW_ROOT / "scripts" / "prepare-outline-adjustment.mjs"
OUTLINE_TRANSITION_SCAN = REVIEW_ROOT / "scripts" / "scan-outline-transition-impact.mjs"
OUTLINE_TRANSITION_ADVANCE = REVIEW_ROOT / "scripts" / "advance-outline-transition.mjs"
OUTLINE_TRANSITION_ROLLBACK = REVIEW_ROOT / "scripts" / "rollback-outline-transition.mjs"
OUTLINE_ARTIFACT_PREPARE = REVIEW_ROOT / "scripts" / "prepare-outline-transition-artifacts.mjs"
OUTLINE_ARTIFACT_PUBLISH = REVIEW_ROOT / "scripts" / "publish-outline-transition-artifacts.mjs"
OUTLINE_DIGEST = REVIEW_ROOT / "scripts" / "outline-digest.mjs"
REVIEW_DATA_ID = REVIEW_ROOT / "scripts" / "review-data-id.mjs"
REVIEW_PAGE_RENDERER = REVIEW_ROOT / "renderer" / "speccompass-review-renderer.html"
RENDERER_README = REVIEW_ROOT / "renderer" / "README.md"
REVIEW_INDEX_TEMPLATE = PROJECT_ROOT / "templates" / "project" / "specs" / "review-index.json"
REVIEW_RENDERER_STYLE_FILES = (
    REVIEW_ROOT / "renderer" / "styles" / "tokens.css",
    REVIEW_ROOT / "renderer" / "styles" / "layout.css",
    REVIEW_ROOT / "renderer" / "styles" / "review-ui.css",
)
REVIEW_RENDERER_SCRIPT_FILES = (
    REVIEW_ROOT / "renderer" / "scripts" / "theme-toggle.js",
    REVIEW_ROOT / "renderer" / "scripts" / "simple-overlays.js",
    REVIEW_ROOT / "renderer" / "scripts" / "state-store.js",
    REVIEW_ROOT / "renderer" / "scripts" / "data-validator.js",
    REVIEW_ROOT / "renderer" / "scripts" / "confirmation-package.js",
    REVIEW_ROOT / "renderer" / "scripts" / "discovery-response-package.js",
    REVIEW_ROOT / "renderer" / "scripts" / "writeback-client.js",
    REVIEW_ROOT / "renderer" / "scripts" / "ui-preview-renderer.js",
    REVIEW_ROOT / "renderer" / "scripts" / "outline-discovery-renderer.js",
    REVIEW_ROOT / "renderer" / "scripts" / "outline-preview-renderer.js",
    REVIEW_ROOT / "renderer" / "scripts" / "review-rail.js",
    REVIEW_ROOT / "renderer" / "scripts" / "right-rail-resizer.js",
    REVIEW_ROOT / "renderer" / "scripts" / "feature-nav.js",
    REVIEW_ROOT / "renderer" / "scripts" / "data-loader.js",
)
REVIEW_DATA_SKILL = PROJECT_ROOT / "templates" / "skills" / "speccompass-review-data" / "SKILL.md"
BASH_PREREQ = PROJECT_ROOT / "scripts" / "bash" / "check-prerequisites.sh"
POWERSHELL_PREREQ = PROJECT_ROOT / "scripts" / "powershell" / "check-prerequisites.ps1"
TEMPLATE_BASH_PREREQ = PROJECT_ROOT / "templates" / "project" / "scripts" / "bash" / "check-prerequisites.sh"
TEMPLATE_POWERSHELL_PREREQ = (
    PROJECT_ROOT / "templates" / "project" / "scripts" / "powershell" / "check-prerequisites.ps1"
)
COMMAND_SPEC = PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md"
CONTEXT_MEMORY_ARCHITECTURE = (
    PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-context-memory-architecture.md"
)
COMMAND_USAGE_DOC = PROJECT_ROOT / "docs" / "reference" / "speckit-command-usage.md"
TEMPLATE_COMMAND_USAGE_DOC = (
    PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "speckit-command-usage.md"
)
SP_IMPROVEMENT_RECOMMENDATIONS = PROJECT_ROOT / "docs" / "reference" / "sp-mechanism-improvement-recommendations.zh-CN.md"
ASK_NEXT_WORK_PLAN = PROJECT_ROOT / "docs" / "reference" / "ask-project-next-work-plan.zh-CN.md"
ARCHIVE_MULTI_AGENT_PLAN = PROJECT_ROOT / "docs" / "reference" / "archive" / "sp-multi-agent-controlled-execution-plan.zh-CN.md"

MULTI_AGENT_WORKER_STATES = (
    "ACCEPTABLE_LOCAL",
    "NEEDS_SINGLE_AGENT_REVIEW",
    "REJECTED_BOUNDARY_VIOLATION",
    "STALE",
    "FAILED_CHECKS",
)
MULTI_AGENT_FALLBACK_FIELDS = (
    "Fallback Reason",
    "affected worker classifications",
    "changed files",
    "evidence kept",
    "discarded/deferred results",
    "single-agent recovery route",
    "next /sp.* step",
)
MULTI_AGENT_HANDOFF_FIELDS = (
    "Task / Workset",
    "Status",
    "Execution Environment",
    "Allowed Write Set",
    "Actual Files Changed",
    "Anchors Affected",
    "Inputs Read",
    "Checks Run",
    "Result",
    "Evidence",
    "Proposed Shared Updates",
    "Open Items / Risks",
    "Merge Notes",
)
MULTI_AGENT_SHARED_TRUTH_FILES = (
    "tasks.md",
    "feature memory",
    "trace/open-items",
    "workset routing",
    "analysis",
    "gate",
    "broad status summaries",
)
MULTI_AGENT_GLOBAL_REGISTRY_FILES = (
    "package manifests",
    "lockfiles",
    "route registries",
    "shared constants",
    "database schemas",
    "permission matrices",
    "global config",
    "cross-module contracts",
    "migrations",
    "event bus registries",
    "core type definitions",
)


def _command(name: str) -> str:
    return (COMMANDS_DIR / f"{name}.md").read_text(encoding="utf-8")


def _contract_digest(value: dict, digest_field: str) -> str:
    payload = {key: item for key, item in value.items() if key != digest_field}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _aligned_boundaries_document() -> dict:
    baseline = {
        "baseline_id": "baseline-001",
        "baseline_digest": "",
        "created_at": "2026-07-27T10:00:00.000Z",
        "created_by": "test-suite",
        "decision_ref": "specs/000-root/prd.md#decision-001",
        "project_boundaries": [
            {
                "order": 1,
                "feature_code": "000",
                "feature": "000-root",
                "title": "Root",
                "parent_feature_code": None,
                "sibling_order": 0,
                "outline_node_id": "boundary-000",
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Root boundary."},
                "lifecycle": "active",
                "predecessor_codes": [],
            },
            {
                "order": 2,
                "feature_code": "001",
                "feature": "001-child",
                "title": "Child",
                "parent_feature_code": "000",
                "sibling_order": 1,
                "outline_node_id": "boundary-001",
                "boundary_source": {
                    "kind": "subproject_handoff",
                    "handoff_ref": "specs/000-root/prd.md#handoff-001",
                    "rationale": "Confirmed child boundary.",
                },
                "lifecycle": "active",
                "predecessor_codes": [],
            },
        ],
        "tombstones": [],
    }
    baseline["baseline_digest"] = _contract_digest(baseline, "baseline_digest")
    return {
        "schema_version": 1,
        "root_feature": "000-root",
        "updated_at": "2026-07-27T10:00:00.000Z",
        "transition_state": "ALIGNED",
        "current_baseline": baseline,
        "proposed_baseline": None,
        "transition": None,
    }


def _transitioning_boundaries_document() -> dict:
    document = _aligned_boundaries_document()
    current = document["current_baseline"]
    proposal = {
        "baseline_id": "baseline-002",
        "proposal_digest": "",
        "base_baseline_id": current["baseline_id"],
        "base_baseline_digest": current["baseline_digest"],
        "created_at": "2026-07-27T11:00:00.000Z",
        "created_by": "test-suite",
        "decision_ref": "specs/000-root/prd.md#decision-002",
        "change_reason": "Confirm a reviewed boundary-title adjustment.",
        "project_boundaries": json.loads(json.dumps(current["project_boundaries"])),
        "tombstones": [],
    }
    proposal["project_boundaries"][1]["title"] = "Child v2"
    proposal["proposal_digest"] = _contract_digest(proposal, "proposal_digest")
    document.update(
        {
            "updated_at": "2026-07-27T11:00:00.000Z",
            "transition_state": "CROSS_ARTIFACT_VALIDATED",
            "proposed_baseline": proposal,
            "transition": {
                "transition_id": "transition-002",
                "transition_revision": 1,
                "base_baseline_id": current["baseline_id"],
                "base_baseline_digest": current["baseline_digest"],
                "proposal_digest": proposal["proposal_digest"],
                "started_at": "2026-07-27T11:00:00.000Z",
                "updated_at": "2026-07-27T11:00:00.000Z",
                "lock": None,
                "artifact_reassignments": [],
                "impact_assessments": [],
                "completed_steps": ["human-approved", "flow-ui-validated", "cross-artifact-validated"],
                "next_action": "Activate the approved baseline.",
                "rollback_ref": "specs/000-root/outline-transition.jsonl#transition-002",
            },
        }
    )
    return document


def test_product_prd_is_authoritative_and_matches_current_review_baseline():
    prd = PRODUCT_PRD.read_text(encoding="utf-8")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")
    review_skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")

    for token in (
        "current_baseline",
        "proposed_baseline",
        "ALIGNED_NEW_BASELINE",
        "outline-boundaries.json",
        "outline_node_id",
        "UNCHANGED_WITH_EVIDENCE",
        "artifact_reassignment",
        "base_baseline_digest",
        "LEGACY_ADOPTION_REQUIRED",
        "repair_command_exec",
        "追加式迁移日志",
        "唯一写入事实源",
        "写入项目",
        "不调用模型",
        "加载 Flow",
        "运行分析",
        "feature-code-ledger.json",
        "reserved",
        "void",
        "1000",
    ):
        assert token in prd

    for content, label in (
        (methodology, "methodology"),
        (_command("prd"), "prd command"),
        (_command("flow"), "flow command"),
        (_command("ui"), "ui command"),
        (command_spec, "command spec"),
        (review_skill, "review-data skill"),
    ):
        assert "one_to_one" in content, label
        assert "transition" in content or "暂态" in content, label
        assert "outline_node_id" in content, label

    for command_name in ("prd", "specify", "flow", "ui", "bundle", "plan", "tasks", "analyze", "gate", "implement"):
        content = _command(command_name)
        assert "check-outline-boundary-gate.mjs" in content, command_name
        assert "speccompass.outline-boundary-gate.v1" in content, command_name
        assert "repair_command_exec" in content, command_name
        assert "derived" in content and "review-index.json" in content, command_name
        assert f"--stage {command_name}" in content, command_name

    assert "start-outline-transition.mjs" in _command("prd")
    for command_name in ("prd", "flow", "ui"):
        content = _command(command_name)
        assert "reset-command-artifacts.mjs inspect" in content
        assert "--consume-review-confirmation" in content
        assert "--intent regenerate" in content
        assert "CONFIRMED_RECORDS_REQUIRE_CHOICE" in content
        assert "preserve-confirmed" in content
        assert "--ack-confirmed" in content
        assert "non-blocking" in content
    assert "--stage <prd|flow|ui>" in review_skill
    assert "The explicit Portfolio root must always keep `has_flow_review: false`" in review_skill
    assert "never silently delete them" in review_skill
    assert "Never recommend or invoke" in _command("prd")
    assert "manage-feature-codes.mjs reserve" in _command("prd")
    assert "create-new-feature.sh --number" in _command("specify")
    assert "rollback-outline-transition.mjs" in _command("prd")
    assert "scan-outline-transition-impact.mjs" in _command("plan")
    assert "prepare-outline-transition-artifacts.mjs" in _command("plan")
    assert "shared evidence" in _command("flow")
    assert "shared evidence" in _command("ui")
    assert "advance-outline-transition.mjs validate" in _command("gate")
    assert "publish-outline-transition-artifacts.mjs" in _command("prd")
    assert "inventory digest" in _command("tasks")
    for token in (
        "start-outline-transition.mjs",
        "scan-outline-transition-impact.mjs",
        "advance-outline-transition.mjs",
        "rollback-outline-transition.mjs",
        "manage-feature-codes.mjs",
        "prepare-outline-boundary-adoption.mjs",
        "activate-outline-boundary-adoption.mjs",
        "do not call a model",
    ):
        assert token in review_skill


def _review_renderer_bundle() -> str:
    renderer_parts = [REVIEW_PAGE_RENDERER.read_text(encoding="utf-8")]
    renderer_parts.extend(path.read_text(encoding="utf-8") for path in REVIEW_RENDERER_STYLE_FILES)
    renderer_parts.extend(path.read_text(encoding="utf-8") for path in REVIEW_RENDERER_SCRIPT_FILES)
    return "\n".join(renderer_parts)


def _paragraph_containing(content: str, needle: str) -> str:
    for paragraph in content.split("\n\n"):
        if needle in paragraph:
            return paragraph
    return ""


def _section_between(content: str, start_heading: str, next_heading: str) -> str:
    start = content.index(start_heading)
    end = content.index(next_heading, start)
    return content[start:end]


def _assert_tokens_in_order(content: str, tokens: tuple[str, ...]) -> None:
    cursor = 0
    for token in tokens:
        position = content.find(token, cursor)
        assert position >= 0, token
        cursor = position + len(token)


def _fenced_block_containing(content: str, needle: str) -> str:
    needle_position = content.index(needle)
    start = content.rfind("```", 0, needle_position)
    end = content.index("```", needle_position)
    return content[start : end + 3]


def test_review_data_tests_do_not_depend_on_external_demo_projects():
    """Review renderer contracts must be tested from repository assets only."""
    checked_texts = [Path(__file__).read_text(encoding="utf-8")]
    if REVIEW_ROOT.exists():
        checked_texts.extend(
            path.read_text(encoding="utf-8")
            for path in REVIEW_ROOT.rglob("*")
            if path.is_file() and path.suffix in {".md", ".html", ".json", ".mjs", ".js", ".css"}
        )
    test_source = "\n".join(checked_texts)
    external_demo_root = "/Users/hula/workspace" + "/ASK"
    external_demo_symbol = "ASK_" + "FLOW_REVIEW"

    assert external_demo_root not in test_source
    assert external_demo_symbol not in test_source


def test_risk_sensitive_commands_read_open_items_before_deciding():
    """Commands that can advance state should load open-items before judging stability."""
    for command in ("analyze", "bundle", "flow", "gate", "implement", "plan", "tasks", "ui"):
        content = _command(command)

        assert "memory/open-items.md" in content, command


@pytest.mark.parametrize(
    "command",
    (
        "specify",
        "flow",
        "ui",
        "gate",
        "bundle",
        "plan",
        "tasks",
        "analyze",
        "implement",
    ),
)
def test_owner_commands_enforce_active_lite_round_scope(command):
    content = _command(command)

    for token in (
        "## Active Lite Round",
        "specs/<feature>/lite.md",
        "Global Status",
        "CLEAR",
        "Included Outline Anchors",
        "Deferred Outline Anchors",
        "Reuse Refs",
        "confirmed Outline",
        "sp-lite-state",
        "continueAllowed=true",
        f"next=\"/sp.{command}\"",
        f"Blocker Route` is `/sp.{command}`",
        "/sp.lite sync",
    ):
        assert token in content, f"{command} missing {token}"


def test_lite_owner_commands_keep_owner_specific_evidence():
    flow = _command("flow")
    ui = _command("ui")
    plan = _command("plan")
    tasks = _command("tasks")
    analyze = _command("analyze")
    gate = _command("gate")
    implement = _command("implement")

    for content, command in ((flow, "flow"), (ui, "ui")):
        assert "Lite Round" in content, command
        assert "SCOPED_CONFIRMATION" in content, command

    for content, command in ((plan, "plan"), (tasks, "tasks")):
        assert "Lite Round" in content, command
        assert "Allowed Write Set" in content, command

    for content, command in ((analyze, "analyze"), (gate, "gate")):
        assert "Required Historical Regressions" in content, command

    assert "real delta" in implement
    assert "Regression Failures" in implement


def test_planning_and_execution_commands_preserve_upward_fallback_rules():
    """Planning/task/implementation templates should not force local work when upstream docs are wrong."""
    expectations = {
        "plan": ("/sp.bundle", "/sp.specify", "/sp.clarify", "/sp.flow", "/sp.ui"),
        "tasks": ("/sp.plan", "/sp.bundle", "/sp.flow", "/sp.ui", "/sp.clarify", "/sp.specify"),
        "implement": ("/sp.tasks",),
    }

    for command, required_refs in expectations.items():
        content = _command(command)
        assert "fallback" in content.lower(), command
        for required_ref in required_refs:
            assert required_ref in content, f"{command} missing {required_ref}"


def test_commands_use_user_facing_dot_form_for_sp_commands():
    """Templates should avoid legacy /sp-* slash form while allowing Codex $sp-* skills."""
    for command_file in COMMANDS_DIR.glob("*.md"):
        content = command_file.read_text(encoding="utf-8")
        body = content.split("---", 2)[-1]
        assert "/sp-" not in body, command_file.name


def test_route_continue_resume_entry_is_documented():
    """Detailed usage docs should explain the resume path and its stop rules."""
    usage_docs = [
        PROJECT_ROOT / "docs" / "quickstart.md",
        PROJECT_ROOT / "docs" / "reference" / "sp-project-methodology.md",
        PROJECT_ROOT / "docs" / "reference" / "speckit-command-usage.md",
        PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md",
        PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "speckit-command-usage.md",
    ]

    for path in usage_docs:
        content = path.read_text(encoding="utf-8")
        assert "/sp.route y" in content, path
        assert "speckit.route.v1" in content, path
        assert "continueAllowed" in content, path
        assert "fallback-log.md" in content, path
        assert "REPEATED_FALLBACK" in content, path
        assert "/sp.clarify" in content, path

    workflows = (PROJECT_ROOT / "docs" / "reference" / "workflows.md").read_text(encoding="utf-8")
    assert "/sp.route y" in workflows
    assert "resume entry" in workflows


def test_root_readmes_stay_concise_and_cover_core_onboarding():
    """Root READMEs should remain short while preserving the essential user path."""
    readme_en = (PROJECT_ROOT / "README.md").read_text(encoding="utf-8")
    readme_zh = (PROJECT_ROOT / "README.zh-CN.md").read_text(encoding="utf-8")

    for content, label in ((readme_en, "README.md"), (readme_zh, "README.zh-CN.md")):
        assert len(content.splitlines()) <= 50, label
        assert "/sp.prd" in content, label
        assert "/sp.flow" in content, label
        assert "/sp.ui" in content, label
        assert "specify init . --integration codex --force" in content, label

    assert "critical" in readme_en
    assert "SP Project Methodology" in readme_en
    assert "非常重要" in readme_zh
    assert "SP 项目方法论" in readme_zh


def _minimal_flow_review_data_with_node(node: dict) -> dict:
    return {
        "schema_version": 1,
        "review_type": "flow",
        "artifact_path": "specs/example/flows/review/flow-review-data.json",
        "confirm_strategy": "batch",
        "batch_id": "FLOW-BATCH-TEST",
        "project": {
            "name": "Example",
            "feature": "survey-publish",
            "business_overview": "运营人员检查问卷发布前的业务条件，避免不完整问卷被直接发布。",
            "review_goal": "确认问卷发布前的门槛和责任清楚，避免页面、开发和验收按猜测推进。",
        },
        "source_snapshot": [
            {
                "path": "specs/example/spec.md",
                "anchors": ["问卷发布"],
                "semantic_scope": ["requirements", "flow"],
            }
        ],
        "modules": [
            {
                "id": "survey",
                "title": "问卷管理",
                "summary": "运营人员在这里决定问卷是否能进入发布。",
                "review_layer": "business",
                "diagrams": [
                    {
                        "id": "publish-main",
                        "title": "问卷发布判断",
                        "summary": "这张图看问卷发布前哪些业务条件需要人工拍板。",
                        "source_path": "specs/example/flows/publish-main.mmd",
                        "item_type": "flowchart",
                        "nodes": [node],
                        "edges": [],
                    }
                ],
            }
        ],
    }


def test_review_data_validator_rejects_lazy_must_confirm_options(tmp_path):
    """Must-confirm options must be real decision exits, not polished boilerplate."""
    lazy_node = {
        "id": "survey-publish-DEC1",
        "label": "确认问卷发布规则",
        "plain_summary": "请判断问卷发布规则是否可以进入下一步。",
        "review_layer": "business",
        "review_level": "must_confirm",
        "owner": "产品经理",
        "node_kind": "human_judgment",
        "source_ref": "specs/example/spec.md#问卷发布",
        "decision_background": "问卷发布会把内容真正交给填写人，发布前门槛不清楚会直接影响运营和数据结果。",
        "decision_summary": "现在要决定发布前必须检查哪些信息，避免开发团队按猜测做校验。",
        "recommended_option": "OPTION_A",
        "options": [
            {
                "id": "OPTION_A",
                "label": "保留问卷发布路径",
                "benefit": "当前问卷发布的主流程已经能覆盖运营发布前的大部分常见情况。",
                "cost": "如果规则漏掉关键门槛，上线后可能需要补校验和补测试。",
                "consequence": "后续继续整理问卷发布流程，并把相关页面和测试用例接着补齐。",
                "recommendation_reason": "当前依据和风险边界看起来正确，可按推荐保留。",
                "next_exit": "continue-survey-publish",
                "recommended": True,
            },
            {
                "id": "OPTION_B",
                "label": "补充问卷发布规则",
                "benefit": "产品经理先把缺失条件补清，后续流程、页面和验收不会按错误门槛继续推进。",
                "cost": "会延后页面和测试拆分，但可以避免团队按错误门槛实现。",
                "consequence": "后续先暂停问卷发布流程，等相关规则补充后再继续整理。",
                "next_exit": "needs-decision:product-owner",
            },
            {
                "id": "OPTION_C",
                "label": "调整问卷发布范围",
                "benefit": "主发布流程可以继续，只把需要修正的边界单独改掉，减少整体返工。",
                "cost": "需要重新检查受影响的页面文案和验收用例。",
                "consequence": "后续对问卷发布流程做局部调整，并继续推进页面和测试用例。",
                "next_exit": "revise-local-and-continue",
            },
        ],
    }
    review_data = _minimal_flow_review_data_with_node(lazy_node)
    review_data_path = tmp_path / "lazy-flow-review-data.json"
    review_data_path.write_text(json.dumps(review_data, ensure_ascii=False), encoding="utf-8")

    result = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(review_data_path)],
        cwd=PROJECT_ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )

    assert result.returncode == 1
    stderr = result.stderr
    assert "option OPTION_A must say who continues the work" in stderr
    assert "option labels must not start with generic verbs" in stderr
    assert "recommended option must explain why it is preferred" in stderr


def test_project_intake_direction_judgment_is_methodology_contract():
    """Project intake should choose one mainline before spending tokens on deep feature work."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")

    for token in (
        "项目接手方向判断",
        "不能“看到什么做什么”",
        "PROJECT_GOAL",
        "CURRENT_STAGE",
        "PRIMARY_THEME",
        "PRIMARY_THEME_SUMMARY",
        "ROOT_BLOCKER_FAMILY",
        "FIRST_FIX",
        "DEFERRED_WORK",
        "READ_SET",
        "PRIORITY_CLASS",
        "NEXT_COMMAND",
        "DO_NOT_RUN",
        "切换成本",
        "唯一下一步动作",
    ):
        assert token in methodology

    _assert_tokens_in_order(
        methodology,
        (
            "P0",
            "SP 安装、命令、模板、路由漂移",
            "P1",
            "阶段阻塞",
            "P2",
            "主线 feature 的 readiness 缺口",
            "P3",
            "gate/analyze 边界问题",
            "P4",
            "运行时、集成、E2E、性能证据补齐",
            "P5",
            "flow/UI/governance 可视化、格式整理、重构",
        ),
    )


def test_route_template_outputs_project_direction_and_single_next_action():
    """The route command should return concrete project direction, not vague conditional advice."""
    route = _command("route")

    for token in (
        "Project Intake Direction Judgment",
        "`/sp.route y`",
        "`/sp.route all`",
        "Warm Route",
        "Cold Start / Global Scan",
        "do not deep-read every feature",
        "PROJECT_GOAL",
        "CURRENT_STAGE",
        "PRIMARY_THEME",
        "ROOT_BLOCKER_FAMILY",
        "FIRST_FIX",
        "DEFERRED_WORK",
        "READ_SET",
        "PRIORITY_CLASS",
        "OPTION_A",
        "OPTION_B",
        "OPTION_C",
        "OPTION_D",
        "RECOMMENDED_OPTION",
        "WHY_RECOMMENDED",
        "USER_DECISION_NEEDED",
        "MY_RECOMMENDATION",
        "NEXT_ACTION",
        "NEXT_COMMAND_EXEC",
        "NEXT_COMMAND_ID",
        "NEXT_COMMAND",
        "WHY_THIS_NEXT",
        "DO_NOT_RUN",
        "NEEDS_DECISION",
        "CURRENT_THEME",
        "REQUESTED_THEME",
        "SWITCH_COST",
        "RECOMMENDATION",
        "single preferred next command",
    ):
        assert token in route

    assert "Preserve `/sp.route y` behavior" in route
    assert "Only `/sp.route all` may perform a global scan" in route
    assert "Do not add a second auto-continue field" in route
    assert "continueAllowed" in route
    assert "autoExecute" in route
    assert "AUTO_CONTINUE" not in route


def test_route_output_contract_has_structured_fields():
    """The route output contract should be a parseable fenced block, not scattered keywords."""
    route = _command("route")
    block = _fenced_block_containing(route, "PROJECT_GOAL")

    _assert_tokens_in_order(
        block,
        (
            "PROJECT_GOAL:",
            "CURRENT_STAGE:",
            "PRIMARY_THEME:",
            "PRIMARY_THEME_SUMMARY:",
            "ROOT_BLOCKER_FAMILY:",
            "FIRST_FIX:",
            "DEFERRED_WORK:",
            "READ_SET:",
            "PRIORITY_CLASS:",
            "OPTION_A:",
            "OPTION_B:",
            "OPTION_C:",
            "OPTION_D:",
            "RECOMMENDED_OPTION:",
            "WHY_RECOMMENDED:",
            "USER_DECISION_NEEDED:",
            "MY_RECOMMENDATION:",
            "NEXT_ACTION:",
            "NEXT_COMMAND_EXEC:",
            "NEXT_COMMAND_ID:",
            "NEXT_COMMAND:",
            "WHY_THIS_NEXT:",
            "DO_NOT_RUN:",
        ),
    )

    switch_block = _fenced_block_containing(route, "CURRENT_THEME")
    for field in ("CURRENT_THEME:", "REQUESTED_THEME:", "SWITCH_COST:", "RISK:", "RECOMMENDATION:", "NEXT_COMMAND:"):
        assert field in switch_block


def test_route_closeout_must_offer_options_and_recommendation():
    """Route output should give answers, not only problems or opaque internal terms."""
    route = _command("route")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")

    for content, label in (
        (route, "route-template"),
        (methodology, "methodology"),
        (command_spec, "command-spec"),
    ):
        for token in (
            "2-4",
            "OPTION_A",
            "OPTION_B",
            "OPTION_C",
            "OPTION_D",
            "RECOMMENDED_OPTION",
            "WHY_RECOMMENDED",
            "USER_DECISION_NEEDED",
            "PRIMARY_THEME_SUMMARY",
            "MY_RECOMMENDATION",
            "NEXT_ACTION",
            "NEXT_COMMAND_EXEC",
            "NEXT_COMMAND_ID",
            "NEXT_COMMAND",
        ):
            assert token in content, f"{label} missing {token}"

    assert "Do not stop at problem reporting" in route
    assert "stage entry judgment" in route
    assert "plain-language options" in route
    assert "route JSON plus global" in route
    assert "READ_SET" in route
    assert "active-context" in route
    assert "feature-map" in route
    assert "open-items.md" in route
    assert "Stage Readiness" in route
    assert "Do not recommend a direction" in route
    assert "USER_DECISION_NEEDED: yes" in route
    assert "HUMAN_DECISION" in route
    assert "must not recommend a substantive downstream route" in route
    assert "USER_DECISION_NEEDED` is a human closeout label only" in route
    assert "Say the recommendation in plain Chinese" in route
    assert "single copy-pasteable line" in route
    assert "final `text` fenced code block" in route
    assert "contains only the" in route
    assert "`NEXT_COMMAND` value" in route
    assert "no `NEXT_COMMAND:` prefix" in route
    assert "no `OPTION_*`" in route
    assert "final copy box at the very bottom" in route
    assert "NEXT_COMMAND_EXEC" in route
    assert "NEXT_COMMAND_ID" in route
    assert "NEXT_COMMAND" in route
    assert "[CMD:" in route
    assert "RECOMMENDED_OPTION` must point to a non-None option" in route
    assert "NEXT_COMMAND_EXEC` must match" in route
    assert "must never treat this whole line as" in route
    assert "Hermes" in route
    assert "OpenClaw" in route
    assert "CrewAI" in route
    assert "LangGraph" in route
    assert "Shared project memory writes must be serialized" in route
    assert "我的推荐：选" in route
    assert "brief Chinese summary" in route
    assert "what it mainly does" in route
    assert "role is not confirmed" in route
    assert "PRIMARY_THEME_SUMMARY" in route
    assert "模板库模板在实际 feature 中的应用链路样本" in route
    assert (
        "NEXT_COMMAND: /sp.analyze 110-template-library-template-application "
        "请先用几句话说明 110-template-library-template-application 的主要作用"
    ) in route
    assert (
        "OPTION_A: [CMD: /sp.analyze 110-template-library-template-application]"
    ) in route
    assert "OPTION_B: [CMD: None] 现在运行 /sp.implement" in methodology
    assert "NEXT_COMMAND_EXEC: /sp.analyze 110-template-library-template-application" in methodology
    assert "越过 analyze/gate 边界" in route
    assert "只说“上一步已完成”" in methodology
    assert "把判断结果说成人话" in methodology
    assert "推荐必须说人话" in methodology
    assert "我的推荐：选 A" in methodology
    assert "一整行可以直接复制粘贴执行的命令" in methodology
    assert "最终复制框必须放在整个回复最底部" in methodology
    assert "里面只能放 `NEXT_COMMAND` 的值本身" in methodology
    assert "不要带 `NEXT_COMMAND:` 标签" in methodology
    assert "用户可以直接复制最后一个代码块启动下一步" in methodology
    assert "slash 命令 + 中文提示词" in methodology
    assert "人类入口和机器入口" in methodology
    assert "不能让 worker 自己从长中文句子里猜命令" in methodology
    assert "每个选项必须以 `[CMD: ...]` 开头" in methodology
    assert "自动继续仍然只看 route JSON 的 `continueAllowed` 和 `autoExecute`" in methodology
    assert "顺手给出简短中文介绍" in methodology
    assert "帮助用户做主观检查" in methodology
    assert "作用未确认" in methodology
    assert "不能根据名字编造作用" in methodology
    assert "要重新检查哪些阶段边界或 gate 风险" in methodology
    assert "不能只根据当前文件、局部上下文或模型直觉生成" in methodology
    assert "全局 SP 证据" in methodology
    assert "`OPTION_A` 到 `OPTION_D`" in methodology
    assert "`.specify/memory/active-context.md`" in methodology
    assert "`.specify/memory/feature-map.md`" in methodology
    assert "`memory/open-items.md`" in methodology
    assert "Stage Readiness" in methodology
    assert "不能推荐下游实质推进命令来绕过人工决策" in methodology
    assert "一个 coordinator，多个只读 worker，集中写 memory" in methodology
    assert "Hermes/OpenClaw" in methodology
    assert "CrewAI" in methodology
    assert "LangGraph" in methodology
    assert "不应让多个 worker 并发写 active-context" in methodology
    assert "must not merely say that the previous step is complete" in command_spec
    assert "Avoid internal phrasing such as \"stage entry judgment\"" in command_spec
    assert "route JSON plus global SP evidence" in command_spec
    assert "The recommendation must say the next step in plain Chinese" in command_spec
    assert "one-line copy-pasteable command" in command_spec
    assert "final copy box must appear at the very bottom" in command_spec
    assert "contain only the `NEXT_COMMAND` value itself" in command_spec
    assert "no `NEXT_COMMAND:` label" in command_spec
    assert "one-copy, one-paste" in command_spec
    assert "`NEXT_COMMAND_EXEC`" in command_spec
    assert "`NEXT_COMMAND_ID`" in command_spec
    assert "`NEXT_COMMAND`" in command_spec
    assert "`NEXT_COMMAND` is the human copy-paste line" in command_spec
    assert "must dispatch only from route JSON" in command_spec
    assert "or `NEXT_COMMAND_EXEC`" in command_spec
    assert "worker prompt/context" in command_spec
    assert "serialize writes to `.specify/memory/*`" in command_spec
    assert "Hermes" in command_spec
    assert "OpenClaw" in command_spec
    assert "CrewAI" in command_spec
    assert "LangGraph" in command_spec
    assert "OPTION_A: [CMD: </sp.* or None>]" in command_spec
    assert "`USER_DECISION_NEEDED` is a human explanation label only" in command_spec
    assert "`PRIMARY_THEME_SUMMARY`" in command_spec
    assert "brief Chinese `PRIMARY_THEME_SUMMARY`" in command_spec
    assert "quick subjective check" in command_spec
    assert "instead of inventing a description" in command_spec
    assert "我的推荐：选 A：110-template-library-template-application" in command_spec
    assert "They must not be guessed from only the current file or local context" in command_spec
    assert "`OPTION_A`..`OPTION_D`" in command_spec
    assert "`HUMAN_DECISION`" in command_spec
    assert "must not bypass the human decision" in command_spec


def test_non_route_commands_have_closeout_recommendation_contract():
    """Every ordinary SP command should finish with a concrete recommended next step."""
    required_tokens = (
        "## Next",
        "OPTION_A:",
        "OPTION_B:",
        "OPTION_C:",
        "RECOMMENDED_OPTION:",
        "MY_RECOMMENDATION:",
        "NEXT_ACTION:",
        "NEXT_COMMAND_EXEC:",
        "NEXT_COMMAND_ID:",
        "NEXT_COMMAND:",
        "WHY_THIS_NEXT:",
        "DO_NOT_RUN:",
        "Do not split the prompt into a separate field",
        "final `text` fenced code block",
        "contains only the `NEXT_COMMAND` value",
        "Do not put `OPTION_A/B/C`",
        "inside that final copy box",
    )
    forbidden_prompt_field = "NEXT_COMMAND" + "_PROMPT"

    for command_file in sorted(COMMANDS_DIR.glob("*.md")):
        if command_file.name == "route.md":
            continue

        content = command_file.read_text(encoding="utf-8")
        for token in required_tokens:
            assert token in content, f"{command_file.name} missing {token}"
        assert (
            "copy-pasteable" in content or "复制粘贴" in content
        ), f"{command_file.name} missing copy-paste guidance"
        assert forbidden_prompt_field not in content, command_file.name


def test_accept_routes_portfolio_root_outline_to_child_selection():
    """Accepting a root Outline must not dispatch specification on feature 000."""
    accept = _command("accept")
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    usage = (PROJECT_ROOT / "docs" / "reference" / "speckit-command-usage.md").read_text(encoding="utf-8")

    for content in (accept, command_spec, methodology, usage):
        assert "/sp.route all" in content
        assert "001+" in content
        assert "/sp.specify 000-*" in content or "/sp.specify <root-feature>" in content
    assert "root `outline`" in accept
    assert "non-root `outline`" in accept


def test_closeout_recommendation_docs_cover_ordinary_commands():
    """Methodology and installed docs should define ordinary command closeout behavior."""
    docs = {
        "methodology": METHODOLOGY_DOC.read_text(encoding="utf-8"),
        "command-spec": COMMAND_SPEC.read_text(encoding="utf-8"),
        "root-usage": COMMAND_USAGE_DOC.read_text(encoding="utf-8"),
        "template-usage": TEMPLATE_COMMAND_USAGE_DOC.read_text(encoding="utf-8"),
        "improvement-recommendations": SP_IMPROVEMENT_RECOMMENDATIONS.read_text(encoding="utf-8"),
    }
    forbidden_prompt_field = "NEXT_COMMAND" + "_PROMPT"

    for label, content in docs.items():
        assert forbidden_prompt_field not in content, label
        assert "NEXT_COMMAND_EXEC" in content, label
        assert "NEXT_COMMAND" in content, label
        assert "OPTION_A" in content, label
        assert "MY_RECOMMENDATION" in content, label
        assert "最终复制框" in content or "final copy box" in content, label
        assert "NEXT_COMMAND` 的值本身" in content or "NEXT_COMMAND` value itself" in content, label
        assert "NEXT_COMMAND:" in content, label

    assert "普通命令收尾推荐契约" in docs["methodology"]
    assert "Command-Wide Closeout Recommendation" in docs["command-spec"]
    assert "SP 命令收尾推荐" in docs["root-usage"]
    assert "SP 命令收尾推荐" in docs["template-usage"]


def test_command_spec_and_memory_architecture_define_project_intake_scan():
    """Installed project docs should teach agents how to route before broad reading."""
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")
    memory_architecture = CONTEXT_MEMORY_ARCHITECTURE.read_text(encoding="utf-8")

    for content, label in ((command_spec, "command-spec"), (memory_architecture, "context-memory")):
        assert "project intake direction judgment" in content, label
        assert "/sp.route all" in content, label
        assert "Warm Route" in content, label
        assert "PRIMARY_THEME" in content, label
        assert "ROOT_BLOCKER_FAMILY" in content, label
        assert "READ_SET" in content, label
        assert "DEFERRED_WORK" in content, label
        assert "do not deep-read every feature" in content, label
        assert "single mainline" in content, label


def test_route_usage_docs_keep_global_scan_and_resume_modes_aligned():
    """Root and installed usage docs should not drift on /sp.route modes."""
    docs = {
        "root-usage": COMMAND_USAGE_DOC.read_text(encoding="utf-8"),
        "template-usage": TEMPLATE_COMMAND_USAGE_DOC.read_text(encoding="utf-8"),
    }

    for label, content in docs.items():
        for token in (
            "/sp.route",
            "Warm Route",
            "speckit.route.v1",
            "autoExecute",
            "continueAllowed",
            "PROJECT_GOAL",
            "PRIMARY_THEME",
            "/sp.route all",
            "项目接手方向判断",
            "NEEDS_DECISION",
            "/sp.route y",
            "语义保持不变",
            "不是全局扫描",
            "REPEATED_FALLBACK",
            "fallback-loop-detected",
        ):
            assert token in content, f"{label} missing {token}"


def test_sp_recommendation_docs_do_not_reintroduce_auto_continue_field():
    """Recommendation docs should use CAN_CONTINUE and JSON route fields, not a second continuation key."""
    docs = {
        "methodology": METHODOLOGY_DOC.read_text(encoding="utf-8"),
        "improvement-recommendations": SP_IMPROVEMENT_RECOMMENDATIONS.read_text(encoding="utf-8"),
        "ask-next-work-plan": ASK_NEXT_WORK_PLAN.read_text(encoding="utf-8"),
    }

    for label, content in docs.items():
        assert "AUTO_CONTINUE" not in content, label
        assert "CAN_CONTINUE" in content, label

    improvement = docs["improvement-recommendations"]
    assert "/sp.route all" in improvement
    assert "/sp.route y" in improvement
    assert "autoExecute" in improvement
    assert "continueAllowed" in improvement


def test_priority_classes_are_consistent_across_route_contract_docs():
    """P0-P5 classes should stay aligned across methodology, route, and installed command spec."""
    docs = {
        "methodology": METHODOLOGY_DOC.read_text(encoding="utf-8"),
        "route": _command("route"),
        "command-spec": COMMAND_SPEC.read_text(encoding="utf-8"),
    }

    expectations = {
        "P0": ("机制漂移", "mechanism drift"),
        "P1": ("阶段阻塞", "stage blocker"),
        "P2": ("readiness", "open-items"),
        "P3": ("gate/analyze", "analyze/gate"),
        "P4": ("E2E", "performance"),
        "P5": ("flow/UI/governance", "formatting"),
    }

    for label, content in docs.items():
        for priority, phrases in expectations.items():
            assert priority in content, f"{label} missing {priority}"
            assert any(phrase in content for phrase in phrases), f"{label} missing {priority} meaning"


def test_prd_template_has_prerequisite_scripts_and_upstream_handoffs():
    """PRD entry should validate prerequisites and hand off to the correct upstream owners."""
    prd = _command("prd")

    assert "scripts:" in prd
    assert "check-prerequisites.sh --json --paths-only" in prd
    assert "check-prerequisites.ps1 -Json -PathsOnly" in prd
    assert "agent: sp.specify" in prd
    assert "agent: sp.clarify" in prd
    assert "agent: sp.constitution" in prd
    assert "agent: sp.plan" not in prd


def test_upstream_prd_and_specify_prerequisites_do_not_require_plan():
    """Commands upstream of planning must only resolve paths, never require plan.md."""
    for command in ("prd", "specify"):
        frontmatter = yaml.safe_load(_command(command).split("---", 2)[1])
        scripts = frontmatter["scripts"]

        assert scripts["sh"].endswith("--json --paths-only"), command
        assert scripts["ps"].endswith("-Json -PathsOnly"), command
        assert "require-plan" not in scripts["sh"].lower(), command
        assert "requireplan" not in scripts["ps"].lower(), command


def test_specify_and_clarify_handoffs_route_to_flow_not_plan():
    """Specify/clarify should advance to business flow, not jump directly to delivery planning."""
    for command in ("specify", "clarify"):
        content = _command(command)
        frontmatter = yaml.safe_load(content.split("---", 2)[1])
        handoffs = frontmatter.get("handoffs", [])

        agents = {item.get("agent") for item in handoffs if isinstance(item, dict)}
        assert "sp.flow" in agents, command
        assert "sp.plan" not in agents, command


def test_memory_templates_keep_open_items_and_trace_responsibilities_separate():
    """Open items carry risk detail while trace remains a lightweight lookup index."""
    open_items = (FEATURE_MEMORY_DIR / "open-items.md").read_text(encoding="utf-8")
    trace_index = (FEATURE_MEMORY_DIR / "trace-index.md").read_text(encoding="utf-8")

    assert "Start empty" in open_items
    assert "Do not add default `OPEN-*` or `RISK-*` blocks" in open_items
    assert "### OPEN-001" in open_items
    assert "Do not add risk or open-item status columns here" in trace_index
    assert "`memory/open-items.md` may point here" in trace_index


def test_analyze_records_memory_summary_and_gate_reuses_it():
    """Analyze should cache mechanical evidence so gate avoids duplicate broad checks."""
    analyze = _command("analyze")
    gate = _command("gate")

    assert "Memory Check Summary" in analyze
    assert "command used" in analyze
    assert "feature/workset" in analyze
    assert "needsHumanReview" in analyze
    assert "gate modes covered" in analyze
    assert "source snapshot or evidence signature label" in analyze
    assert "open-items state" in analyze
    assert "ERROR count" in analyze
    assert "WARN count" in analyze

    assert "Memory Check Summary" in gate
    assert "Do not fully redo `/sp.analyze` by default" in gate
    assert "Run the lightweight memory check only when the summary is missing" in gate
    assert "return the next `/sp.analyze` route" in gate


def test_tasks_template_includes_mode_and_task_packet_fields():
    """The starter tasks template should reflect the current doc/impl packet contract."""
    tasks_template = (PROJECT_ROOT / "templates" / "tasks-template.md").read_text(encoding="utf-8")

    assert "## Format: `[ID] [Mode] [P?] [Story] Description`" in tasks_template
    for field in (
        "Mode: `doc`",
        "Mode: `impl`",
        "Allowed Write Set",
        "Required Checks",
        "Task Packet Defaults",
        "Proposed Updates",
        "Read Set",
    ):
        assert field in tasks_template


def test_feature_templates_use_r0_as_open_risk_signal():
    """Feature scaffolds should not drift back to the old @r1 risk marker."""
    for template_file in FEATURE_TEMPLATE_DIR.rglob("*.md"):
        content = template_file.read_text(encoding="utf-8")
        assert "@r1" not in content, template_file

    open_items = (FEATURE_MEMORY_DIR / "open-items.md").read_text(encoding="utf-8")
    memory_index = (FEATURE_MEMORY_DIR / "index.md").read_text(encoding="utf-8")
    gate_template = (FEATURE_TEMPLATE_DIR / "gate.md").read_text(encoding="utf-8")
    tasks_template = (FEATURE_TEMPLATE_DIR / "tasks.md").read_text(encoding="utf-8")

    assert "@r0" in open_items
    assert "@r0" in memory_index
    assert "@r0" in gate_template
    assert "@r0" in tasks_template


def test_context_budget_rule_is_present_in_state_advancing_commands():
    """State-advancing SP commands should explicitly constrain context expansion."""
    for command in ("analyze", "bundle", "flow", "gate", "plan", "tasks", "ui"):
        content = _command(command)
        assert "Manage context as an engineering budget" in content, command


def test_implementation_path_requires_impact_radius_check_without_codegraph_dependency():
    """Implementation guidance should borrow graph-style impact checks without requiring CodeGraph."""
    implement = _command("implement")
    tasks = _command("tasks")

    assert "Impact-radius check" in implement
    assert "memory/trace-index.md" in implement
    assert "memory/open-items.md" in implement
    assert "CodeGraph" in implement
    assert "never require it" in implement
    assert "fall back to SP memory, source docs, search, and tests" in implement
    assert "Impact-Radius Evidence" in implement
    assert "direct neighbors" in implement

    assert "impact-radius check" in tasks
    assert "hidden impact analysis" in tasks

    trace_index = (FEATURE_MEMORY_DIR / "trace-index.md").read_text(encoding="utf-8")
    assert "external code graph such as CodeGraph" in trace_index
    assert "Do not require it" in trace_index
    assert "source of truth" in trace_index


def test_methodology_records_codegraph_boundaries_and_impact_radius_limits():
    """The methodology doc should preserve CodeGraph as optional guidance, not a runtime dependency."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")

    assert "查询优先，关系优先" in methodology
    assert "只展开一层直接关系" in methodology
    assert "影响半径检查" in methodology
    assert "Impact-Radius Evidence" in methodology
    assert "直接相邻关系" in methodology
    assert "不能替代源文档" in methodology
    assert "不能成为必需依赖" in methodology
    assert "不把 `trace-index.md` 改造成图数据库" in methodology
    assert "不让外部 CodeGraph 成为 source of truth" in methodology


def test_analyze_and_gate_use_lightweight_memory_checker():
    """Analyze/gate should use the mechanical memory checker without making warnings fatal."""
    for command in ("analyze", "gate"):
        content = _command(command)
        assert "check-sp-memory.sh --json" in content, command
        assert "check-sp-memory.ps1 -Json" in content, command
        assert "`ERROR` findings block PASS" in content, command
        assert "`WARN` findings do not automatically block PASS" in content, command


def test_analyze_readiness_conflicts_and_needs_context_routes_are_explicit():
    """Analyze should diagnose readiness contradictions and task-level NEEDS_CONTEXT without expanding verdicts."""
    analyze = _command("analyze")

    assert "tasks.md` contradicts `plan.md` `Implementation Readiness" in analyze
    assert "set the diagnostic verdict to `FAIL` and route to `/sp.plan`" in analyze
    assert "A task-level `NEEDS_CONTEXT` result is diagnostic evidence" in analyze
    assert "not an analyze verdict" in analyze
    assert "task-packet or planning gap" in analyze
    assert "`/sp.tasks`, `/sp.plan`, or human-decision route" in analyze


def test_complex_part_thresholds_stay_aligned_across_commands():
    """Analyze, plan, and tasks must agree on split/promotion thresholds."""
    analyze = _command("analyze")
    plan = _command("plan")
    tasks = _command("tasks")

    threshold_phrases = (
        "distinct external system",
        "release cadence",
        "permission/data model",
        "independent migration",
        "irreversible data/security/compliance/rollback risk",
        "2+ blocking open items",
        "3+ roles",
        "4+ user paths",
        "5+ artifact categories",
        "12+ trace anchors",
        "8+ core docs",
        "8+ major files",
        "4+ module boundaries",
    )

    for phrase in threshold_phrases:
        assert phrase in analyze, f"analyze missing {phrase}"
        assert phrase in plan, f"plan missing {phrase}"

    assert "Use the same threshold as `sp.plan`" in tasks
    assert "any hard signal, or at least three warning signals" in tasks


def test_gate_template_preserves_minimal_verdict_schema():
    """The generated gate.md scaffold should match /sp.gate's required output fields."""
    gate_template = (FEATURE_TEMPLATE_DIR / "gate.md").read_text(encoding="utf-8")

    for heading in (
        "## Verdict",
        "## Evidence",
        "## Blocking Gaps",
        "## Accepted Risks",
        "## Fallback",
        "## Next Step",
    ):
        assert heading in gate_template

    assert "Not Run" in gate_template
    assert "owner, impact scope, rollback or degrade path, close condition, and revisit anchor" in gate_template
    assert "next safe `/sp.*` command" in gate_template


def test_methodology_and_constitution_preserve_stable_coordinate_rules():
    """Published coordinates should remain stable instead of being renumbered for cosmetics."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")

    assert "不因中间插入、删除或排序调整而重排" in methodology
    assert "不是自动重排理由" in methodology
    assert "语义别名" in methodology
    assert "Published coordinates must not be renumbered" in constitution


def test_risk_closure_requires_evidence_across_methodology_and_commands():
    """Closing or downgrading blockers/high risks should require evidence, not model confidence."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    analyze = _command("analyze")
    gate = _command("gate")
    implement = _command("implement")

    for content, label in (
        (methodology, "methodology"),
        (constitution, "constitution"),
        (analyze, "analyze"),
        (gate, "gate"),
        (implement, "implement"),
    ):
        assert "Blocker" in content, label
        assert "Risk" in content, label
        assert "evidence" in content.lower() or "证据" in content, label

    assert "降级、删除或关闭 `Blocker`" in methodology
    assert "Closing, deleting, accepting, deferring, downgrading, or invalidating `Blocker`" in constitution
    assert "Closing, deleting, accepting, deferring, downgrading, or invalidating `Risk`, `Blocker`" in gate
    assert "closed, deleted, accepted, deferred, downgraded, or invalidated" in analyze
    assert "closing, deleting, accepting, deferring, downgrading, or invalidating `Risk`, `Blocker`" in implement
    assert "Close Evidence" in constitution
    assert "Close Evidence" in gate
    assert "Close Evidence" in analyze
    assert "Close Evidence" in implement
    for content, label in ((methodology, "methodology"), (analyze, "analyze"), (gate, "gate"), (implement, "implement")):
        assert "High severity" in content or "High` 严重级别" in content, label
        assert "broader-impact" in content or "影响范围、验收、发布、回滚" in content, label
        assert "@r0" in content, label
    assert "隐私、权限、认证、审计、合规、数据、迁移、租户隔离、RBAC" in methodology


def test_blocker_closeout_uses_open_items_without_new_ledger():
    """Blocker cleanup should be item-by-item closeout, not a progress summary or second ledger."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    analyze = _command("analyze")
    gate = _command("gate")
    implement = _command("implement")

    for content, label in (
        (methodology, "methodology"),
        (analyze, "analyze"),
        (gate, "gate"),
    ):
        assert "Blocker Closeout" in content or "阻塞闭环模式" in content, label
        assert "memory/open-items.md" in content, label
        assert "single source of truth" in content or "唯一稳定事实源" in content or "唯一事实源" in content, label
        for state in ("RESOLVED", "OPEN", "DEFERRED_WITH_OWNER", "INVALID_OR_STALE"):
            assert state in content, f"{label} missing {state}"

    assert "Do not create a second persistent blocker ledger" in analyze
    assert "does not create a second persistent ledger" in gate
    assert "progress percentages" in analyze
    assert "Progress percentages" in gate
    assert "does not own the full Blocker Closeout ledger" in implement
    assert "route unresolved or cross-layer blocker closeout to `/sp.analyze`, `/sp.gate`, or `/sp.clarify`" in implement


def test_complex_blockers_require_root_layer_and_smallest_solvable_unit():
    """Complex blockers should be decomposed before execution or routed to human decision."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    analyze = _command("analyze")
    gate = _command("gate")
    implement = _command("implement")
    tasks = _command("tasks")

    for content, label in (
        (methodology, "methodology"),
        (command_spec, "command-spec"),
        (analyze, "analyze"),
        (gate, "gate"),
        (implement, "implement"),
        (tasks, "tasks"),
    ):
        assert "root layer" in content.lower() or "根因层级" in content, label
        assert "smallest solvable unit" in content.lower() or "最小可解决单元" in content, label
        assert "/sp.clarify" in content, label

    assert "memory/open-items.md" in methodology
    assert "唯一稳定事实源" in methodology
    assert "single stable truth source for blockers" in command_spec
    assert "Blocker Breakdown" in command_spec
    assert "do not grant PASS or CONDITIONAL" in gate
    assert "instead of editing broadly" in implement


def test_headless_and_human_decision_rules_offer_safe_options():
    """Headless runs should fail safe, and human decisions should be asked in plain-language options."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    clarify = _command("clarify")
    implement = _command("implement")

    assert "headless 自动化要优先靠隔离" in methodology
    assert "丢弃本次任务创建的临时分支、临时目录或 worktree" in methodology
    assert "2-4 个选项" in methodology
    assert "决策包" in methodology
    assert "推荐不等于正式决策" in methodology
    assert "Decision Package" in clarify
    assert "Decision Record" in clarify
    assert "human-selected choice" in clarify
    assert "return `NEEDS_DECISION`" in clarify
    assert "SP_EXIT_CODE: 1" in clarify
    assert "model recommendation is not the final decision" in command_spec
    assert "Decision Package" in command_spec
    assert "Decision Record" in command_spec
    command_spec_package = _paragraph_containing(command_spec, "Decision Package")
    command_spec_record = _paragraph_containing(command_spec, "Decision Record")
    clarify_package = _paragraph_containing(clarify, "A decision package must include")
    clarify_no_choice = _paragraph_containing(clarify, "If no human choice is available")
    for field in (
        "background",
        "confirmed evidence",
        "impact",
        "2-4",
        "options",
        "tradeoffs",
        "recommendation",
        "next `/sp.*` route",
        "selected choice",
        "writeback",
        "close condition",
        "revisit condition",
    ):
        assert field in command_spec, field
    for field in (
        "background",
        "confirmed evidence",
        "impact",
        "2-4",
        "options",
        "tradeoffs",
        "recommendation",
        "next `/sp.*` route",
    ):
        assert field in command_spec_package, field
        assert field in clarify_package, field
    for field in ("selected choice", "writeback", "close condition", "revisit condition", "next command"):
        assert field in command_spec_record, field
    assert "NEEDS_DECISION" in clarify_no_choice
    assert "SP_EXIT_CODE: 1" in clarify_no_choice
    assert "Prefer isolation for headless automation" in constitution
    assert "discard the temporary branch, directory, or worktree" in constitution
    assert "discard the temporary branch, directory, or worktree" in implement

    for command in ("analyze", "gate", "implement", "tasks"):
        content = _command(command)
        assert "2-4" in content, command
        assert "recommendation" in content.lower() or "推荐" in content, command
        assert "/sp.clarify" in content, command
        assert "decision package" in content.lower(), command

    for command in ("analyze", "gate", "implement"):
        content = _command(command)
        headless_path = _paragraph_containing(content, "headless or non-interactive runs")
        assert "SP_EXIT_CODE: 1" in content, command
        assert "do not invent" in content.lower(), command
        assert "NEEDS_DECISION" in headless_path, command
        assert "SP_EXIT_CODE: 1" in headless_path, command


def test_observation_band_does_not_become_headless_hard_gate():
    """Near-threshold split signals should advise and record, not block by themselves."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    tasks = _command("tasks")

    assert "拆分观察带不是硬门禁" in methodology
    assert "不应在 headless 或非交互运行中单独阻断流程" in methodology
    assert "Observation band alone is not a hard gate" in constitution
    assert "Shrink the current workset into sequential, verifiable local steps" in constitution
    assert "Treat near-threshold split signals as an observation band" in tasks
    assert "not an automatic block" in tasks
    assert "shrink into sequential, verifiable local tasks" in tasks


def test_parallel_tasks_serialize_shared_memory_writeback():
    """Parallel implementation can run independently, but shared state updates need one owner."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    implement = _command("implement")
    tasks = _command("tasks")

    assert "共享状态写入" in methodology
    assert "必须串行更新，或者由一个收口步骤统一批量合并" in methodology
    assert "docs/reference/sp-command-spec.md` §10.3" in constitution
    assert "read-only shared truth files" in constitution
    assert "serial shared-truth updates" in constitution
    assert "fallback report" in constitution
    assert "Shared memory coordination" in implement
    assert "Parallel agent boundaries" in implement
    assert "one owner step merges shared memory" in implement
    assert "serialized closeout task" in tasks
    assert "mark shared memory files as read-only" in tasks


def test_low_risk_same_context_tasks_can_batch_writeback_without_deferring_to_later_runs():
    """Batching is allowed inside one execution turn, not as a reason to leave state stale."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    implement = _command("implement")

    assert "低风险、同上下文小任务" in methodology
    assert "回合末一次性批量写回" in methodology
    assert "不能拖到后续 `/sp.analyze`、`/sp.gate` 或下一次模型调用再猜" in methodology
    assert "low-risk same-context tasks" in implement
    assert "batch their task-state and evidence writeback at turn closeout" in implement


def test_implementation_fast_path_and_test_read_boundaries_are_documented():
    """Implementation should read related tests without forcing all tests or heavyweight plans."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    implement = _command("implement")
    tasks = _command("tasks")

    assert "直接相关测试" in methodology
    assert "低风险小改可以走轻量快通道" in methodology
    assert "Before modifying existing code, inspect directly related tests" in constitution
    assert "Low-risk small edits may use a fast path" in constitution
    assert "Before modifying existing code, inspect directly related tests" in implement
    assert "Low-risk small edits may use a fast path" in implement
    assert "bounded test-read expectation" in tasks


def test_implement_supports_checklist_and_task_matrix_completion_styles():
    """Implement should close tasks according to the task format instead of forcing checklist syntax."""
    implement = _command("implement")

    assert "if `tasks.md` uses checklist tasks" in implement
    assert "mark the task off as `[X]`" in implement
    assert "if `tasks.md` uses a Task Matrix" in implement
    assert "update the task's `Status` column" in implement
    assert "such as `Completed` or `Verified`" in implement
    assert "record evidence in `Notes` or the task evidence field" in implement


def test_impact_radius_evidence_cannot_be_written_before_verification_or_hide_failure():
    """Impact-radius evidence should be tied to current verification, not optimistic prose."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    implement = _command("implement")

    assert "不能写成 PASS 或“已验证”" in methodology
    assert "Evidence 的写入时机必须晚于实际检查" in methodology
    assert "If checks fail, Evidence records the failure" in constitution
    assert "must not say PASS or verified" in constitution
    assert "must not say PASS, verified, or close the task/risk" in implement
    assert "do not rewrite it as success" in implement


def test_open_items_validation_allows_lightweight_local_questions_and_todos():
    """Open-item validation should stay strict for risks but lightweight for harmless local items."""
    analyze = _command("analyze")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    memory_arch = (
        PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-context-memory-architecture.md"
    ).read_text(encoding="utf-8")

    for content, label in (
        (analyze, "analyze"),
        (command_spec, "command_spec"),
        (memory_arch, "memory_arch"),
    ):
        assert "Low or Medium" in content, label
        assert "`Question` and `Todo`" in content, label
        assert "may stay lightweight" in content, label
        assert "do not affect scope, acceptance, release, rollback, security, or implementation confidence" in content, label
        assert "`Risk`, `Blocker`, High severity items" in content, label
        assert "broader-impact" in content or "broader impact" in content, label


def test_post_verdict_writeback_cannot_self_prove_pass():
    """Analyze/gate writeback may update memory but cannot be the evidence for the same PASS."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )

    for content, label in (
        (_command("analyze"), "analyze"),
        (_command("gate"), "gate"),
        (command_spec, "command_spec"),
    ):
        assert "post-verdict writeback" in content, label
        assert "must not" in content, label
        assert "prove this run's PASS" in content or "primary evidence" in content, label

    assert "post-verdict writeback" in command_spec
    assert "current inputs" in command_spec
    assert "current code/test evidence" in command_spec
    assert "不能用本轮判定后的写回反过来证明本轮 PASS" in methodology


def test_completion_evidence_contract_is_enforced_by_implementation_analysis_and_gate():
    """Implementation, analysis, and gate should require current completion evidence."""
    for command in ("implement", "analyze", "gate"):
        content = _command(command)
        assert "Completion Evidence Contract" in content, command
        assert "checks actually run" in content, command
        assert "unchecked scope" in content, command
        assert "old check output" in content, command
        assert "model confidence" in content, command


def test_blocked_reason_and_finish_quality_gate_are_formalized():
    """Non-ready states need short reasons, and commands must self-fix solvable quality gaps."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")

    for token in (
        "阻塞短原因与收尾质量门禁",
        "Status Reason",
        "10-30 个中文字符",
        "Finish Quality Gate",
        "model_fixable_issues",
        "human_blockers",
        "self_fix_rounds: 0-3",
        "初始为 `0`",
        "QUALITY_PASSED",
        "CONTINUE_FIXING",
        "内部循环控制状态",
        "HUMAN_BLOCKED",
        "EXHAUSTED_BLOCKED",
        "NEEDS_PLAN",
        "NEEDS_TASKS",
        "NEEDS_CONTEXT",
        "DEFERRED_WITH_OWNER",
        "英文项目可以写等价长度的短英文短语",
        "不得用禁用检查、删除测试、`@ts-ignore`、降低验收或隐藏失败来制造通过",
    ):
        assert token in methodology

    for command in ("flow", "ui", "plan", "tasks", "implement", "analyze", "gate"):
        content = _command(command)
        assert "Finish Quality Gate" in content, command
        assert "Status Reason" in content, command
        assert "10-30 Chinese characters" in content, command
        assert "equivalent short English phrase" in content, command
        assert "model_fixable_issues" in content, command
        assert "human_blockers" in content, command
        assert "self_fix_rounds: 0-3" in content, command
        assert "quality_result: QUALITY_PASSED | CONTINUE_FIXING | HUMAN_BLOCKED | EXHAUSTED_BLOCKED" in content, command
        assert "quality_result: PASS |" not in content, command
        assert "CONTINUE_FIXING is an internal loop state" in content, command
        assert "CONTINUE_FIXING" in content, command
        assert "HUMAN_BLOCKED" in content, command
        assert "EXHAUSTED_BLOCKED" in content, command
        assert "Do not stop to report while model-fixable quality issues remain" in content, command

    flow = _command("flow")
    ui = _command("ui")
    for content, label in ((flow, "flow"), (ui, "ui")):
        assert "right feedback rail" in content, label
        for token in ("diagram", "review rail", "manifest", "open item", "Stage Readiness", "Status Reason"):
            assert token in content, label
        assert "Stage Readiness.Status" in content, label

    for command in ("plan", "tasks"):
        content = _command(command)
        assert "blocked workset" in content, command
        assert "blocked task" in content, command

    for command in ("implement", "analyze", "gate"):
        content = _command(command)
        assert "quality_result" in content, command
        assert "human input or decision blocker" in content, command
        for state in ("NEEDS_PLAN", "NEEDS_TASKS", "NEEDS_CONTEXT", "DEFERRED_WITH_OWNER"):
            assert state in content, command


def test_tdd_and_file_backed_evidence_rules_shape_plan_tasks_implementation():
    """Planning/task/implementation guidance should prefer existing artifacts and test-first shaping."""
    for command in ("plan", "tasks", "implement"):
        content = _command(command)
        assert "File-backed Evidence" in content, command
        assert "Do not create a new evidence artifact by default" in content, command
        assert "TDD-aware task shaping" in content, command
        assert "acceptance-critical behavior" in content, command
        assert "manual verification path" in content, command


def test_debug_evidence_loop_and_review_feedback_handling_are_present():
    """Repeated repair and review feedback should be evidence-routed, not assertion-routed."""
    for command in ("implement", "analyze", "gate"):
        content = _command(command)
        assert "Debug Evidence Loop" in content, command
        assert "smallest check that can disconfirm" in content, command
        assert "Two attempts without new evidence" in content, command

    for command in ("analyze", "gate"):
        content = _command(command)
        assert "Review Feedback Handling" in content, command
        for classification in ("valid", "invalid", "needs-info", "accepted-risk"):
            assert classification in content, f"{command} missing {classification}"


def test_flow_ui_methodology_absorbs_lightweight_planning_and_business_flow_principles():
    """Flow/UI should absorb only the lightweight, relevant design methodology."""
    ui = _command("ui")
    flow = _command("flow")

    assert "Lightweight UI Planning" in ui
    assert "Visual Style" in ui
    assert "Layout & Display Efficiency" in ui
    assert "Workflow Ergonomics" in ui
    assert "2-3 short questions" in ui
    assert "Do not turn UI planning into a full design-system" in ui

    assert "Flow Design Principles" in flow
    assert "Business fit is the first constraint" in flow
    assert "simplest sufficient flow" in flow
    assert "single-purpose" in flow
    assert "loosely coupled" in flow
    assert "diagram elegance" in flow


def test_extension_guide_includes_command_template_quality_checklist():
    """Extension authors should inherit the same lightweight command-template constraints."""
    guide = (PROJECT_ROOT / "extensions" / "EXTENSION-DEVELOPMENT-GUIDE.md").read_text(encoding="utf-8")

    assert "Command Template Quality Checklist" in guide
    assert "Completion or PASS criteria require current evidence" in guide
    assert "Runtime commands are inferred from project configuration" in guide
    assert "Human decisions, risk acceptance, and verification downgrades are routed explicitly" in guide


def test_early_flow_ui_equivalent_evidence_is_bounded_draft_safety_only():
    """Equivalent evidence before tasks.md should not become a hidden implementation-readiness gate."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    analyze = _command("analyze")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    memory_arch = (
        PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-context-memory-architecture.md"
    ).read_text(encoding="utf-8")
    trace_index = (FEATURE_MEMORY_DIR / "trace-index.md").read_text(encoding="utf-8")

    for content, label in (
        (methodology, "methodology"),
        (analyze, "analyze"),
        (command_spec, "command_spec"),
        (memory_arch, "memory_arch"),
        (trace_index, "trace_index"),
    ):
        assert "equivalent current evidence" in content or "等价轻量检查" in content, label
        assert "draft-safety check" in content or "草稿" in content, label
        assert "did not close risks" in content or "risks were not closed" in content or "没有关闭风险" in content, label
        assert "did not support PASS" in content or "PASS was not claimed" in content or "没有" in content and "PASS" in content, label

    for content, label in (
        (methodology, "methodology"),
        (analyze, "analyze"),
        (command_spec, "command_spec"),
    ):
        assert "Implementation Readiness" in content, label


def test_t0_rules_distinguish_non_trivial_blockers_from_trivial_reminders():
    """Only non-trivial @t0 should require open-items and block PASS."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")

    assert "非平凡 `@t0` 断链" in methodology
    assert "平凡 `@t0`" in methodology
    assert "局部文案、格式、低风险 UI 微调" in methodology
    assert "A non-trivial `@t0` must have a matching" in constitution
    assert "Trivial `@t0` is only for local copy" in constitution


def test_gate_complexity_only_covers_pre_planning_business_signals():
    """Gate should not usurp plan/tasks/analyze ownership of delivery-level split signals."""
    gate = _command("gate")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )

    assert "business-layer complexity" in gate
    assert "already visible before delivery planning" in gate
    assert "Do not decide API/table/event/migration-based promotion at gate" in gate
    assert "Delivery-level split signals" in gate
    assert "remain owned by `sp.plan`, `sp.tasks`, and `sp.analyze`" in gate
    assert "pre-planning business complexity" in command_spec
    assert "delivery-level split signals remain owned by `sp.plan`, `sp.tasks`, and `sp.analyze`" in command_spec


def test_prd_is_requirement_source_container_but_specify_remains_stable_spec_entry():
    """Confirmed PRD facts must survive Outline work without replacing /sp.specify."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    prd = _command("prd")
    specify = _command("specify")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )

    assert "`/sp.prd` 是所有新 feature、能力方向和重要需求变更的强制上游入口" in methodology
    assert "简单需求可以走精简 PRD，但不能跳过 PRD" in methodology
    assert "精简 PRD 只适用于用户已经给出清楚目标、用户、范围和基本验收意图" in methodology
    assert "Lean PRD 也不能只剩目录" in methodology
    assert "至少要有一个清晰战略目标、一个目标用户或角色、一个有边界的核心场景" in methodology
    assert "0 到 1 想法、范围不清、多能力方向、治理影响、高风险或 source 冲突必须走完整 PRD" in methodology
    assert "`prd.md` 是需求来源容器" in methodology
    assert "是 Outline 不得丢失的需求事实" in methodology
    assert "`[src:ai-proposed]`、`[uncertain:*]` 等明确候选不是事实" in methodology
    assert "`/sp.specify` 仍是稳定规格入口" in methodology
    assert "自上而下的需求生长" in methodology
    assert "战略目标、产品定位、业务目标、目标用户和能力版图" in methodology
    assert "足够交给 `/sp.specify` 提炼稳定规格" in methodology
    assert "不能默认输出完整界面元素清单" in methodology
    assert "PRD-to-spec outline readiness" in methodology
    assert "specs/<feature>/spec-outline.md" in methodology
    assert "`Source Authority Summary`" in methodology
    assert "稳定 source、候选 source、归档或缺失 source" in methodology
    assert "`/sp.specify` 可以安全消费哪些来源" in methodology
    assert "`/sp.specify` 消费 outline 前必须做轻量 freshness/source snapshot 检查" in methodology
    assert "不要用文件 `mtime` 或原始 hash 做硬门禁" in methodology
    assert "还应同步创建或刷新阻断型 `specs/<feature>/spec-outline.md`" in methodology
    assert "从单一入口读到当前阻断原因" in methodology
    assert "READY_FOR_SPECIFY" in methodology
    assert "Outline Decision" in methodology
    assert "[uncertain:*]" in methodology
    assert "范围冲突" in methodology
    assert "source 缺失" in methodology
    assert "NEEDS_PRD" in methodology
    assert "NEEDS_CLARIFY" in methodology
    assert "NEEDS_SOURCE" in methodology
    assert "SPLIT_REQUIRED" in methodology
    assert "`NEEDS_DECISION` 用于已经具备候选方向但必须由人工选择" in methodology
    assert "人类选择写回 `prd.md`、`clarifications.md` 或 `spec-outline.md`" in methodology
    assert "`/sp.outline` 或 PRD 内置 outline 逻辑不能替代 `/sp.specify`" in methodology
    assert "每次 `/sp.prd` 刷新时都应重读当前 PRD、source 和已有 outline" in methodology
    assert "`NEEDS_SOURCE` 才能解除" in methodology
    assert "`Outline Decision` 只负责 readiness、blocker、next route" in methodology
    assert "`Handoff To Specify` 只负责在 ready 时摘要 `/sp.specify` 应稳定化的输入" in methodology
    assert "`Status History`" in methodology
    assert "`timestamp/run-id`" in methodology
    assert "`blocker-signature`" in methodology
    assert "`evidence-summary`" in methodology
    assert "`新证据` 只包括用户确认、source 恢复、明确 rebase 决策" in methodology
    assert "同一 `blocker-signature`、同一 outline 状态、同一 `next-route` 连续两次刷新" in methodology
    assert "升级为 `BLOCKED` 或 `NEEDS_DECISION`" in methodology
    assert "重复 blocker 的决策包必须写回可复用的位置" in methodology
    assert "默认写到 `specs/<feature>/memory/open-items.md`" in methodology
    assert "`Owner Review Required`" in methodology
    assert "`Risk Type`" in methodology
    assert "`Confirm To Proceed`" in methodology
    assert "轻量小改只限于" in methodology
    assert "重要需求变更，必须回到 `/sp.prd`" in methodology
    assert "高风险、0 到 1 新产品方向、范围拆分、source rebase、治理候选" in methodology
    assert "`/sp.constitution` 面向整个项目" in methodology
    assert "候选治理区" in methodology
    assert "不能直接修改正式 constitution 正文" in methodology
    assert "候选状态只使用固定枚举" in methodology
    assert "单 feature 局部风险" in methodology
    assert "`sp.prd` is the mandatory upstream requirement intake" in constitution
    assert "Simple requests may use a short PRD, but they must not skip PRD" in constitution
    assert "PRD-to-spec outline readiness" in constitution
    assert "Constitution Candidates" in constitution
    assert "Candidates do not override formal constitution rules" in constitution
    assert "may only append or update the `Constitution Candidates` section" in constitution
    assert "Candidate strength threshold" in constitution
    assert "Status values are fixed" in constitution
    assert "Keep the active candidate table concise" in constitution
    assert "stable implementation-facing specification compiler and baseline specification point" in specify
    assert "`/sp.prd` is the mandatory upstream requirement intake" in specify
    assert "Treat work as new feature work when `spec.md` is missing" in specify
    assert "`spec.md` still contains `SP_STAGE_SEED: spec`" in specify
    assert "new capability direction" in specify
    assert "changes business scope, target role, workflow, acceptance boundary" in specify
    assert "Minor edits are limited to local wording fixes" in specify
    assert "Important requirement changes include new capability direction" in specify
    assert "Route these to `/sp.prd`" in specify
    assert "If `specs/<feature>/prd.md` is missing" in specify
    assert "If `specs/<feature>/spec-outline.md` is missing or not `READY_FOR_SPECIFY`" in specify
    assert "check its `Based On`, `Source Snapshot` or `Source Authority Summary`" in specify
    assert "references stale PRD intent, missing/rebased sources, unresolved decisions" in specify
    assert "SP_STATUS: NEEDS_PRD" in specify
    assert "requires owner review" in specify
    assert "`prd.md` is the requirement-source container" in specify
    assert "User-confirmed, formally sourced, and consumed-decision content is requirement fact" in specify
    assert "`/sp.specify` carries only eligible facts into `spec.md`" in specify
    assert "Do not stabilize `[src:ai-proposed]`" in specify
    assert "Do not treat `[src:ai-proposed]`" in specify
    assert "without user confirmation" in specify
    assert "# /sp.prd" in prd
    assert "hooks.before_prd" in prd
    assert "sp.constitution" in prd
    assert "mandatory upstream requirement intake" in prd
    assert "`prd.md` is the requirement-source container" in prd
    assert "User-confirmed, formally sourced, or consumed-decision content is a requirement fact" in prd
    assert "top-down requirement growth" in prd
    assert "Choose the PRD depth before writing" in prd
    assert "Lean PRD" in prd
    assert "Full PRD" in prd
    assert "When unsure, prefer a lean PRD plus explicit open items" in prd
    assert "Lean PRD still needs enough substance to stand on its own" in prd
    assert "one clear strategic goal, at least one target user or role" in prd
    assert "specs/<feature>/spec-outline.md" in prd
    assert "`Source Authority Summary`" in prd
    assert "stable sources, candidate-only sources, archived or missing sources" in prd
    assert "what `/sp.specify` may safely consume" in prd
    assert "blocking `spec-outline.md` with the same `Outline Decision`" in prd
    assert "READY_FOR_SPECIFY" in prd
    assert "Outline Decision" in prd
    assert "[uncertain:*]" in prd
    assert "scope conflict" in prd
    assert "missing source authority" in prd
    assert "NEEDS_PRD" in prd
    assert "NEEDS_CLARIFY" in prd
    assert "NEEDS_SOURCE" in prd
    assert "SPLIT_REQUIRED" in prd
    assert "NEEDS_DECISION" in prd
    assert "never `READY_FOR_SPECIFY`" in prd
    assert "/sp.outline" in prd
    assert "must not replace `/sp.specify`" in prd
    assert "Always read the existing `specs/<feature>/spec-outline.md` first" in prd
    assert "`NEEDS_SOURCE` -> `READY_FOR_SPECIFY` only when the PRD cites the recovered source" in prd
    assert "`SPLIT_REQUIRED` -> `READY_FOR_SPECIFY` only after the user confirms" in prd
    assert "`NEEDS_DECISION` -> `READY_FOR_SPECIFY` only after the selected human decision is written back" in prd
    assert "Maintain a lightweight `Status History`" in prd
    assert "`timestamp/run-id`, `status`, `blocker-signature`, `next-route`, and `evidence-summary`" in prd
    assert "stable short `blocker-signature`" in prd
    assert "same `blocker-signature`, same outline status, and same `next-route`" in prd
    assert "same `blocker-signature`, same outline status, and same `next-route`" in prd
    assert "New evidence means only user confirmation, recovered source, explicit rebase decision" in prd
    assert "Escalate to `BLOCKED` or `NEEDS_DECISION`" in prd
    assert "write the decision package back into the current feature docs" in prd
    assert "stable writeback target is `specs/<feature>/memory/open-items.md`" in prd
    assert "explicit owner review prompt" in prd
    assert "`Owner Review Required` prompt" in prd
    assert "`Risk Type`, `Review Focus`, `Impact If Approved`, `Impact If Rejected`" in prd
    assert "must not create a second conflicting decision" in prd
    assert "[src:ai-proposed]" in prd


def test_prd_outline_graphical_confirmation_is_a_fresh_authorization_gate():
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    prd = _command("prd")
    specify = _command("specify")
    command_spec = (
        PROJECT_ROOT
        / "templates"
        / "project"
        / "docs"
        / "reference"
        / "sp-command-spec.md"
    ).read_text(encoding="utf-8")

    for content in (methodology, constitution, prd, specify, command_spec):
        assert "AWAITING_OUTLINE_CONFIRMATION" in content
        assert "outline-review-data.json" in content
        assert "outline-confirmation.md" in content
        assert "Outline Digest" in content
        assert "Source Authority IDs" in content

    assert "serve-review.mjs --outline" in prd
    assert "OUTLINE_CONFIRMATION_PENDING" in specify
    assert "OUTLINE_CONFIRMATION_STALE" in specify
    assert "LEGACY_OUTLINE_CONFIRMATION_DEPRECATED" in specify

    for content in (methodology, constitution, prd, specify, command_spec):
        lowered = content.lower()
        assert "localstorage" in lowered
        assert "download" in lowered
        assert "authoriz" in lowered or "授权" in content
    assert "SP_STATUS: NEEDS_DECISION" in prd
    assert "SP_EXIT_CODE: 1" in prd
    assert "ready for /sp.specify" in prd
    assert "Constitution Candidates" in prd
    assert "may only append or update" in prd
    assert "Candidate status values are fixed" in prd
    assert "Do not rewrite formal constitution content" in prd
    assert "new independent business goal, role, workflow, acceptance boundary, release scope, or scope fork" in prd
    assert "do not route directly to `/sp.specify`" in prd
    assert "encode product-boundary choices in graphical Discovery" in prd
    assert "classify the blocker before choosing its route" in prd
    assert "changes a project boundary or capability ownership at any tree depth" in prd
    assert "classify missing split or human-choice evidence before recommending a route" in prd
    assert "unresolved product boundary or scope fork questions were not turned into guessed features" in prd
    assert "Requirement growth in `sp.prd` should be top-down" in command_spec
    assert "strategic goal, product positioning, business goals" in command_spec
    assert "capability map" in command_spec
    assert "Lean PRD is allowed only when the user already provides" in command_spec
    assert "Lean PRD still has a minimum substance bar" in command_spec
    assert "one clear strategic goal, at least" in command_spec
    assert "0-to-1 ideas, unclear scope, multi-capability requests" in command_spec
    assert "`sp.prd` is the mandatory upstream requirement intake" in command_spec
    assert "Simple requests may use" in command_spec
    assert "PRD-to-spec outline readiness" in command_spec
    assert "`specs/<feature>/spec-outline.md` with `READY_FOR_SPECIFY`" in command_spec
    assert "blocking `spec-outline.md` with the same" in command_spec
    assert "predictable blocker entry point" in command_spec
    assert "`Source Authority Summary`" in command_spec
    assert "stable sources, candidate-only sources, archived or missing sources" in command_spec
    assert "what `sp.specify` may safely consume" in command_spec
    assert "Before `sp.specify` consumes a `READY_FOR_SPECIFY` outline" in command_spec
    assert "Do not use file mtime or raw hashes as hard gates" in command_spec
    assert "Outline Decision" in command_spec
    assert "[uncertain:*]" in command_spec
    assert "scope conflict" in command_spec
    assert "missing" in command_spec and "source" in command_spec
    assert "NEEDS_PRD" in command_spec
    assert "NEEDS_CLARIFY" in command_spec
    assert "NEEDS_SOURCE" in command_spec
    assert "SPLIT_REQUIRED" in command_spec
    assert "NEEDS_DECISION" in command_spec
    assert "never `READY_FOR_SPECIFY`" in command_spec
    assert "sp.outline" in command_spec
    assert "must not replace `sp.specify`" in command_spec
    assert "Existing `spec-outline.md` status is not static" in command_spec
    assert "`NEEDS_SOURCE` only after source recovery" in command_spec
    assert "`NEEDS_DECISION` only after the selected human decision" in command_spec
    assert "`Outline Decision` owns readiness and next route" in command_spec
    assert "`Handoff To Specify` summarizes downstream input" in command_spec
    assert "lightweight `Status History`" in command_spec
    assert "`timestamp/run-id`, `status`, `blocker-signature`" in command_spec
    assert "New evidence means" in command_spec
    assert "user confirmation" in command_spec
    assert "explicit rebase decision" in command_spec
    assert "same `blocker-signature`, same outline" in command_spec
    assert "Repeated-blocker decision packages must be written back" in command_spec
    assert "default writeback target is `specs/<feature>/memory/open-items.md`" in command_spec
    assert "Trace `Expand Docs` checks must locate the column by header" in command_spec
    assert "Flow/UI artifacts must model the target business system" in command_spec
    assert "privacy, permission, authentication, audit, compliance, data, migration, tenant isolation, RBAC" in command_spec
    assert "High-risk, 0-to-1 product direction, scope split, source rebase" in command_spec
    assert "explicit `Owner Review Required` prompt" in command_spec
    assert "`Risk Type`" in command_spec
    assert "`Confirm To Proceed`" in command_spec
    assert "For `sp.specify`, treat work as new feature work" in command_spec
    assert "`spec.md` still contains `SP_STAGE_SEED: spec`" in command_spec
    assert "Minor edits are limited to local wording fixes" in command_spec
    assert "Important requirement" in command_spec
    assert "new capability direction" in command_spec
    assert "new role or permission" in command_spec
    assert "The detail boundary is" in command_spec
    assert "`ready for sp.specify`" in command_spec
    assert "`ready for implementation`" in command_spec
    assert "Governance-like material" in command_spec
    assert "found during PRD discovery" in command_spec
    assert "Candidates do not override formal constitution rules" in command_spec
    assert "primary landing zone for governance" in command_spec
    assert "may only append or update the candidate section" in command_spec
    assert "Candidate status values are fixed" in command_spec
    assert "Single-feature local risks" in command_spec
    assert "proposed" in command_spec
    assert "under-review" in command_spec
    assert "promoted" in command_spec
    assert "rejected" in command_spec
    assert "merged" in command_spec
    assert "conflicting user intent" in specify
    assert "contradictory acceptance criteria" in specify
    assert "NEEDS_DECISION" in specify
    assert "/sp.clarify" in specify


def test_prd_outline_maturity_discovery_contract_is_documented_across_templates():
    """Recursive discovery must stay distinct from terminal authorization."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    design = (
        PROJECT_ROOT
        / "docs"
        / "reference"
        / "sp-flow-ui-confirmation-review-design.zh-CN.md"
    ).read_text(encoding="utf-8")
    prd = _command("prd")
    command_spec = (
        PROJECT_ROOT
        / "templates"
        / "project"
        / "docs"
        / "reference"
        / "sp-command-spec.md"
    ).read_text(encoding="utf-8")
    renderer_readme = (
        REVIEW_ROOT / "renderer" / "README.md"
    ).read_text(encoding="utf-8")
    review_skill = (
        PROJECT_ROOT
        / "templates"
        / "skills"
        / "speccompass-review-data"
        / "SKILL.md"
    ).read_text(encoding="utf-8")

    maintained_contracts = (
        methodology,
        design,
        prd,
        command_spec,
        renderer_readme,
        review_skill,
    )
    for content in maintained_contracts:
        assert "outline_maturity" in content
        assert "explore" in content
        assert "frame" in content
        assert "specify_ready" in content
        assert "discovery" in content
        assert "confirmation" in content

    artifact_paths = (
        "outline-discovery-data.json",
        "outline-discovery-response",
        "outline-intent-ledger.json",
        "outline-review-data.json",
    )
    for content in (methodology, prd, command_spec, renderer_readme, review_skill):
        for artifact in artifact_paths:
            assert artifact in content

    operations = (
        "confirm_candidate",
        "add",
        "replace",
        "exclude",
        "context_note",
    )
    for content in (methodology, prd, command_spec, review_skill):
        for operation in operations:
            assert operation in content

    for content in (methodology, prd, command_spec, review_skill):
        assert "[src:user]" in content
        assert "[src:user-confirmed]" in content
        assert "[src:ai-proposed]" in content
        assert "intent-delta:" in content
    assert "Outline Maturity" in prd
    assert "2-4" in prd
    assert "none of the above" in prd.lower()
    assert "free-form" in prd.lower()
    assert "must never advance" in prd
    assert "`AWAITING_OUTLINE_CONFIRMATION` or `READY_FOR_SPECIFY`" in prd
    assert "append-only" in prd
    assert "temporary" in prd
    assert "fail closed" in prd.lower()
    assert "must not invent target users, product goals, business rules, or scope" in prd
    assert "recursively decomposes the current Outline unit at any project depth" in prd
    assert "unique top unit and retains its own business goal" in prd
    assert "formally confirmed `terminal` unit" in prd
    assert "schema version 6" in prd
    assert "complete `decomposition_window`" in prd
    assert "model-owned compilation step" in prd
    assert "not cross-consumption by the confirmation package parser" in prd
    assert "validator or helper is missing, crashes, or returns an invalid result" in prd
    assert "two consecutive regeneration attempts" in prd
    assert "supersedes_delta_id" in prd
    assert "must remain auditable in the append-only ledger" in prd
    assert "schema version is unsupported" in prd
    assert "XMind-style maps" in prd
    assert "exactly one `overview` map" in prd
    assert "at least one business `branch` map" in prd
    assert "exactly one `global_constraints` map" in prd
    assert "one concrete `outline_node_id`" in prd
    assert "max_visible_nodes_per_map: 18" in prd
    assert "max_depth: 3" in prd
    assert "`max_depth: 3` is a presentation-window limit" in prd
    assert "Window boundary-note rule" in prd
    assert "atom/chain allocation" in prd
    assert "Every visible boundary note needs valid `source_refs`" in prd
    assert "deprecated `density_budget.max_children_per_node`" in prd
    assert "max_layer_share: 0.6" in prd
    assert "affected business `node_id` values" in prd

    for content in (methodology, design):
        assert "XMind 风格" in content
        assert "全局约束" in content
        assert "稳定 ID" in content
        assert "最多 18 个可见节点" in content
        assert "最多 3 层" in content
        assert "60%" in content
    assert "当前展开根" in methodology
    assert "不设固定子单元数量" in methodology
    assert "全局总图" in design
    assert "最多 4 个直接子节点" in design
    assert "直接子单元" in methodology
    assert "业务分图" in design
    assert "do not guess or silently upcast it" in prd
    assert "do not downgrade it to an incompatible earlier contract" in prd
    assert "must reference an earlier accepted event" in prd
    assert "Reject forward references and cycles" in prd
    assert "reset the consecutive-failure count" in prd
    assert "installed discovery schemas, renderer modules, or launcher support are missing" in prd
    assert "specify init --force" in prd

    assert "`explore` 表示当前展开窗口仍在做项目单元拆分" in methodology
    assert "`frame` 表示一个已确认的终端单元" in methodology
    assert "`specify_ready` 表示来源保真的正式编译" in methodology
    assert "不存在固定的“一级/二级/三级项目”语义" in methodology
    assert "不能授权 `/sp.specify`" in methodology
    assert "从账本生成正式 review data 是 `/sp.prd` 的单向编译步骤" in methodology
    assert "不是 confirmation consumer 读取 discovery package" in methodology
    assert "连续两次临时文档验证失败" in methodology

    assert "interaction_mode" in renderer_readme
    assert "写入项目" in renderer_readme
    assert "does not authorize `/sp.specify`" in renderer_readme
    assert "must not accept" in renderer_readme

    assert "specify init --force" in renderer_readme
    assert "already initialized" in renderer_readme
    assert "do not receive new templates automatically" in renderer_readme


def test_prd_recursive_outline_uses_business_semantics_and_keeps_constitution_read_only():
    """Every recursive window compiles business evidence instead of generic copy."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    prd = _command("prd")
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")
    command_spec_text = " ".join(command_spec.split())
    usage = (
        PROJECT_ROOT
        / "templates"
        / "project"
        / "docs"
        / "reference"
        / "speckit-command-usage.md"
    ).read_text(encoding="utf-8")

    for content in (methodology, prd, command_spec, usage):
        assert "business_context" in content
        assert "product_subject" in content
        assert "business_objects" in content
        assert "operations" in content
        assert "outcomes" in content
        assert "business_chains" in content
        assert "constitution_snapshot" in content
        assert "read_only" in content
        assert "governance_only" in content

    assert "Stage A - extract source-backed capability atoms" in prd
    assert "Stage B - recursively propose child Outline units and compile the current window" in prd
    assert "Stage C - run the semantic quality gate" in prd
    assert "capability_atoms" in prd
    assert "Each atom has exactly one matching business chain" in prd
    assert "may belong to only one direct child" in prd
    assert "grouping_basis" in prd
    assert "decomposition_basis" in prd
    assert "terminal_basis" in prd
    assert "Direct children must be non-overlapping and exactly cover their parent" in prd
    assert "root_project_depth: 0" in prd
    assert "generated_depth: 1" in prd
    assert "frontend, backend, database" in prd
    assert "Do not impose a fixed unit count" in prd
    assert "Project Decomposition" in prd
    assert "Subproject Handoff" in prd
    assert "Product decomposition is independent from runtime topology" in prd
    assert "Transactional consistency or bidirectional business exchange requires classification" in prd
    assert "regulation, contract, or multi-party legal duty" in prd
    assert "published service commitment" not in prd
    assert "Never use runtime topology as an advantage, disadvantage, option-comparison dimension" in prd
    assert "make confirmation of that split the default recommendation" in prd
    assert "Stage C results remain private" in prd
    assert "`source_capability_coverage` remains required JSON evidence" in prd
    assert "Generic implementation components" in prd
    assert "is a warning signal, not a boundary decision" in prd
    assert "center/中心" in prd
    assert "Prefixing a domain word" in prd
    assert "formal product root" in prd
    assert "final visible-copy sanitization pass" in prd
    assert "do not announce that sanitization occurred" in prd
    assert "Do not route them to `/sp.clarify` merely because the split is unconfirmed" in prd
    assert "use `NEXT_COMMAND_EXEC: None` until the page writes the pending response" in prd
    assert "`business_chains`" in prd
    assert "one matching business chain" in prd
    assert "must not use Constitution content as business evidence" in prd
    assert "must not create discovery questions from Constitution clauses" in prd
    assert "must not write Constitution clauses into the PRD" in prd
    assert "must not target Constitution clauses with discovery deltas" in prd
    assert "Direct children must be non-overlapping" in command_spec
    assert "Every Outline unit retains its own" in command_spec_text
    assert "business_goal" in command_spec
    assert "Subproject Handoff" in command_spec
    assert "final visible-copy sanitization pass" in command_spec_text
    assert "Do not announce that sanitization occurred" in command_spec_text
    assert "Constitution is displayed only as a read-only governance snapshot" in command_spec
    assert "三阶段" in methodology
    assert "能力原子" in methodology
    assert "一个能力原子只归属一个直接子单元" in methodology
    assert "能力原子负责来源覆盖，不负责决定项目数量" in methodology
    assert "目标仍是功能单一、松散耦合" in methodology
    assert "grouping_basis" in methodology
    assert "decomposition_basis" in methodology
    assert "terminal_basis" in methodology
    assert "不设固定子单元数量、偏好区间、一个原子一个项目的映射或整棵树的最大深度" in methodology
    assert "`000-*` 是唯一树根" in methodology
    assert "只用于内部编译" in methodology
    assert "不能仅因为拆分未确认" in methodology
    assert "跨领域替换测试" in methodology
    assert "完整业务链" in methodology


def test_layered_design_sources_parent_child_focus_and_decision_authority_are_documented():
    product_prd = PRODUCT_PRD.read_text(encoding="utf-8")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    prd = _command("prd")
    flow = _command("flow")
    ui = _command("ui")
    plan = _command("plan")
    tasks = _command("tasks")
    implement = _command("implement")
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")

    assert "默认业务资料根是仓库根目录 `prd/`" in product_prd
    assert "人工可以为当前仓库或当前运行明确指定一个或多个其他资料目录" in product_prd
    assert "`000-*` 是唯一顶级 Outline 单元，但不是空壳协调器" in product_prd
    assert "整个过程不设固定项目数量，也不追求越细越好" in product_prd
    assert "Outline 的树深和一次生成窗口分开管理" in product_prd
    assert "直接子单元必须不重叠且完整覆盖父单元" in product_prd
    assert "Outline、Flow、UI 已有的图形审核" in product_prd
    assert "Plan、Tasks 和 Implement 在已确认 Outline、Flow、UI 框架内提高模型自主性" in product_prd

    assert "仓库根 `prd/` 是默认业务资料根" in methodology
    assert "Outline 读取 PRD 资料；Flow 读取 PRD 资料和已确认 Outline；UI 读取 PRD 资料、已确认 Outline 和已确认 Flow" in methodology
    assert "父子核对检查方向、范围、责任、结果、交接、来源和全局约束" in methodology

    assert "repository-root `prd/` directory is the default business-source corpus" in prd
    assert "Parent-child reconciliation checks direction, scope, ownership, outcomes, handoffs" in prd
    assert "A multi-atom unit requires `grouping_basis`" in prd
    assert "The grouping authority may be `doc`, `user`, `user-confirmed`, or `ai-proposed`" in prd
    assert "`unresolved` cannot authorize a grouped child" in prd
    assert "Mark a unit `expanded` only when `decomposition_basis`" in prd
    assert "Mark it `terminal` only when `terminal_basis`" in prd

    assert "Stable Flow input is `PRD sources + confirmed Outline + stable Spec/clarifications`" in flow
    assert "Flow Web review" in flow
    assert "Stable UI input is `PRD sources + confirmed Outline + confirmed Flow" in ui
    assert "UI Web review" in ui
    assert "make reversible technical" in plan
    assert "choices autonomously inside those contracts" in plan
    assert "derive reversible task decomposition" in tasks
    assert "make reversible code-level choices" in implement

    assert "The layered input contract is: Outline reads PRD sources" in command_spec
    assert "multi-atom unit carries" in command_spec
    assert "`grouping_basis`" in command_spec
    assert "Its authority may be `ai-proposed`" in command_spec
    assert "automatically better" in command_spec
    assert "Only a formally confirmed terminal unit may enter `frame`" in command_spec


def test_prd_recursive_outline_windows_have_non_overlapping_executable_contracts():
    """Tree depth, generation windows, and maturity have distinct contracts."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    prd = _command("prd")
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")
    usage = (
        PROJECT_ROOT
        / "templates"
        / "project"
        / "docs"
        / "reference"
        / "speckit-command-usage.md"
    ).read_text(encoding="utf-8")

    assert "Outline Maturity` independently from project-tree depth" in prd
    assert "`explore` recursively decomposes the current Outline unit" in prd
    assert "never an empty coordinator placeholder" in prd
    assert "`frame` writes detailed business Outline" in prd
    assert "generates no new project levels" in prd
    assert "New Outline Discovery data MUST use schema version 6" in prd
    assert "The `000-*` decompose window MUST have" in prd
    assert "A non-root decompose window normally has `generated_depth: 2` or `3`" in prd
    assert "Never generate filler nodes" in prd
    assert "Do not create a whole tree in one invocation" in prd
    assert "every business node below a branch map's structural root MUST correspond" in prd
    assert "generate such functional detail only in the later `detail` window" in prd
    assert "source-preserving formal Outline preparation" in prd
    assert "without discovering, merging, splitting, or reinterpreting business facts" in prd

    assert "cross-domain substitution test" in prd
    assert "source-backed domain object" in prd
    assert "warning signal, not a boundary decision" in prd
    assert "external business obligation" in prd

    assert "Maturity is not project-tree depth" in command_spec
    assert "unique `000-*` top unit generates exactly one descendant level" in command_spec
    assert "ordinary non-root `decompose` window normally generates two or three" in command_spec
    assert "three-layer capacity is only a" in command_spec

    assert "项目树深度、review level" in methodology
    assert "第一次窗口只生成一个直接后代层" in methodology
    assert "未登记的目标、能力、验收和其他详细说明不能伪装" in methodology
    assert "三层仅是界面显示窗口" in usage
    assert "普通说明节点不是下一级项目" in usage
    for content in (methodology, usage):
        assert "terminal" in content
        assert "跨领域替换测试" in content
    assert "只读治理快照" in methodology
    assert "直接子单元" in usage
    assert "不能因共享页面、数据库、运行时、阶段或团队而合并" in usage
    assert "Subproject Handoff" in usage
    assert "不能仅因为拆分未确认" in usage
    assert "可见文本清洗" in usage

    for content in (prd, command_spec, usage):
        assert "QMT" not in content
        assert "up to three cohesive business capability branches" not in content


def test_task_packet_defaults_protect_shared_truth_and_worker_artifact_boundaries():
    """Scaffolded task packets should not let workers rewrite shared truth by default."""
    tasks_template = (FEATURE_TEMPLATE_DIR / "tasks.md").read_text(encoding="utf-8")

    for phrase in (
        "memory/worksets/*",
        "memory/stable-context.md",
        "analysis.md",
        "gate.md",
        "<feature>/workers/*",
        "execution artifacts, not stable memory",
        "memory recall should exclude them",
    ):
        assert phrase in tasks_template


def test_clarify_routes_new_feature_back_to_specify():
    """Clarification can resolve ambiguity but must not silently absorb new features."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    clarify = _command("clarify")

    assert "NEW_FEATURE_DETECTED" in methodology
    assert "NEW_FEATURE_DETECTED" in constitution
    assert "NEW_FEATURE_DETECTED" in clarify
    assert "new independent business goal" in clarify
    assert "/sp.specify" in clarify
    assert "Do not silently expand feature scope" in clarify


def test_soft_issue_boundary_blocks_hard_failures():
    """Soft issues cannot cover routing, contract, test, acceptance, trace, blocker, or high-risk failures."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")

    for content, label in (
        (methodology, "methodology"),
        (constitution, "constitution"),
        (_command("implement"), "implement"),
        (_command("analyze"), "analyze"),
        (_command("gate"), "gate"),
    ):
        assert "Soft issue" in content or "soft issue" in content or "soft issues" in content, label
        assert "routing" in content or "路由" in content, label
        assert "acceptance" in content or "验收" in content, label
        assert "trace" in content, label
        assert "Blocker" in content, label
        assert "Risk" in content, label


def test_oscillation_protection_and_headless_failure_report_are_documented():
    """Repeated failure loops should stop, and headless BLOCKED reports need enough recovery context."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")

    for content, label in (
        (methodology, "methodology"),
        (constitution, "constitution"),
        (_command("implement"), "implement"),
        (_command("analyze"), "analyze"),
        (_command("gate"), "gate"),
    ):
        assert "same failure signature" in content.lower() or "同一失败签名" in content, label
        assert "NEEDS_DECISION" in content, label
        assert "BLOCKED" in content, label
        assert "failure-site report" in content or "失败现场报告" in content, label
        assert "changed files" in content or "改了哪些文件" in content, label
        assert "failed command" in content or "失败命令" in content, label
        assert "automatic recovery is unsafe" in content or "自动恢复不安全" in content, label
        assert "SP_EXIT_CODE: 1" in content, label


def test_flow_ui_methodology_is_enforced_by_command_templates_and_seed_memory():
    """Flow/UI methodology should be executable command discipline, not only reference prose."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    flow = _command("flow")
    ui = _command("ui")
    analyze = _command("analyze")
    gate = _command("gate")
    plan = _command("plan")
    tasks = _command("tasks")
    implement = _command("implement")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    memory_arch = (
        PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-context-memory-architecture.md"
    ).read_text(encoding="utf-8")
    trace_index = (FEATURE_MEMORY_DIR / "trace-index.md").read_text(encoding="utf-8")
    open_items = (FEATURE_MEMORY_DIR / "open-items.md").read_text(encoding="utf-8")

    for content, label in (
        (methodology, "methodology"),
        (constitution, "constitution"),
        (flow, "flow"),
        (ui, "ui"),
        (analyze, "analyze"),
        (gate, "gate"),
        (plan, "plan"),
        (command_spec, "command_spec"),
        (memory_arch, "memory_arch"),
        (trace_index, "trace_index"),
    ):
        assert "draft facts" in content or "草稿" in content, label
        assert "port contract" in content or "端口契约" in content, label
        assert "FLOW" in content, label

    assert "input, precondition or permission, business action, output or side effect, target state, failure path" in flow
    assert "node type: `ui`, `system`, `external`, `scheduled`, `manual`, or `none_ui`" in flow
    assert "fields to collect, business facts to show, end-user actions allowed, permissions, and error states" in flow
    assert "business domain anchor" in flow
    assert "Put this anchor visibly near the top of `flows/index.md`" in flow
    assert "not a workflow monitoring panel" in flow
    assert "Wrong: \"Display flow progress" in flow
    assert "Classify visual review into three tiers" in flow
    assert "**No confirmation required**" in flow
    assert "**Recommended confirmation**" in flow
    assert "**Required confirmation**" in flow
    assert "first-time stable flow generation" in flow
    assert "3 or more new flow nodes" in flow
    assert "single reviewable flow diagram should normally contain 5-7 business nodes" in flow
    assert "8 or more business nodes" in flow
    assert "10 or more business nodes" in flow
    assert "complex-flow exception reason" in flow
    assert "low-risk linear exception" in flow
    assert "no high-risk decision, permission, irreversible result, external dependency, or exception branch" in flow
    assert "collapsible segment checklist" in flow
    assert "Do not merge real business steps just to satisfy the 5-7 node budget" in flow
    assert "trigger" in flow and "responsible" in flow and "state/result" in flow
    assert "outgoing edge" in flow and "business condition" in flow
    assert "preconditions" in flow
    assert "postconditions" in flow
    assert "segment-by-segment review order" in flow
    assert "top-down main-trunk layout" in flow
    assert "fixed SpecCompass review renderer is not Mermaid-based" in flow
    assert "native SVG/DAG layout" in flow
    assert "font size between 16px and 18px" in flow
    assert "useMaxWidth: false" in flow
    assert "nodeSpacing" in flow
    assert "rankSpacing" in flow
    assert "left module navigation scrolls independently" in flow
    assert "center diagram area and right confirmation rail scroll as one review workspace" in flow
    assert "no sticky/max-height clipping" in flow
    assert "project business overview / 项目整体业务地图" in flow
    assert "module summary / 模块简介" in flow
    assert "per-flow summary" in flow
    assert "right feedback rail is mandatory" in flow
    assert "per-node decision options" in flow
    assert "must_confirm" in flow and "3-4" in flow
    assert "ordinary human-judgment nodes default to 3" in flow or "普通人工判断默认 3 项" in flow
    assert "options_count_rationale" in flow
    assert "`OPTION_A`/`OPTION_B`/`OPTION_C`/`OPTION_D` choices" in flow
    assert "recommended_option" in flow
    assert "next_exit" in flow
    assert "confirmation of selected option" in flow
    assert "per-node approve/defer/reject/block controls" not in flow
    assert "per-node feedback input" in flow
    assert "English label glossary" in flow
    assert "blocked, pending decision, and stale statuses" in flow
    assert "Pending Decisions" in flow
    assert "decision node has an explicit default path" in flow
    assert "undefined branch exit" in flow
    assert "which tier would otherwise apply" in flow
    assert "`--auto` may skip only the visual review gate" in flow
    assert "concise Chinese flow" in flow
    assert "Do not only write \"please" in flow
    assert "business goal" in flow
    assert "main flow stages" in flow
    assert "exception/recovery" in flow
    assert "state changes" in flow
    assert "visible labels to reference in feedback" in flow
    assert "tiered decision options" in flow
    assert "real business background" in flow
    assert "what the reviewer chooses the model to do next" in flow
    assert "downstream impact on scope, schedule, risk, UI, plan, tasks, implementation, or tests" in flow
    assert "why the recommended option is safest" in flow
    assert "multiple reasonable repairs" in flow
    assert "not present `/sp.ui` or `/sp.gate` as the" in flow
    assert "immediate next step" in flow

    assert "Bind each screen to the flow step" in ui
    assert "Bind each critical UI action to an allowed business event or flow effect" in ui
    assert "must not invent business validation" in ui
    assert "`/sp.ui` must consume `/sp.flow` outputs" in ui
    assert "Business UI vs Process Visualization UI" in ui
    assert "target end users complete target business operations" in ui
    assert "flow step progress bars" in ui
    assert "state transition timelines" in ui
    assert "unless `spec.md` explicitly requires" in ui
    assert "business domain anchor" in ui
    assert "Put this anchor visibly near the top of `ui/index.md`" in ui
    assert "huashu-design" in ui
    assert "frontend display pages" in ui
    assert "If the host does not provide the `huashu-design` skill" in ui
    assert "design_authority: huashu-design" in ui
    assert "business-production" in ui
    assert "implementation_design_requirements" in ui
    assert "do not use SpecCompass review confirmation rail in business UI" in ui
    assert "unconfirmed flow draft" in ui
    assert "Classify visual review into three tiers" in ui
    assert "**No confirmation required**" in ui
    assert "**Recommended confirmation**" in ui
    assert "**Required confirmation**" in ui
    assert "3 or more new screens or critical actions" in ui
    assert "Process Visualization UI risk" in ui
    assert "`--auto` may skip only the visual review gate" in ui
    assert "concise Chinese UI" in ui
    assert "Do not only write \"please" in ui
    assert "design basis from PRD/spec and flow steps" in ui
    assert "layout structure" in ui
    assert "actions and their" in ui
    assert "effects, fields and validation sources" in ui
    assert "images/previews" in ui
    assert "charts/tables and" in ui
    assert "data sources, permissions/states" in ui
    assert "visible labels to reference in feedback" in ui
    assert "tiered decision options" in ui
    assert "real screen or interaction background" in ui
    assert "what the reviewer chooses the model to change next" in ui
    assert "downstream impact on screen scope, interaction risk, implementation, acceptance tests, or delivery schedule" in ui
    assert "why the recommended UI option is safest" in ui
    assert "multiple reasonable layouts" in ui
    assert "not present `/sp.gate` as the immediate next" in ui

    assert "Check Flow-UI relation integrity" in analyze
    assert "Check subject-scope integrity" in analyze
    assert "Check Process Visualization UI" in analyze
    assert "SUBJECT_CONFUSION" in analyze
    assert "Check orphan relation objects" in analyze
    assert "Check draft facts" in analyze

    assert "Verify Flow-UI relation integrity" in gate
    assert "subject-scope integrity" in gate
    assert "SUBJECT_CONFUSION" in gate
    assert "unsupported Process Visualization UI" in gate
    assert "cannot support PASS" in gate
    assert "critical flow port-contract gaps" in gate

    assert "Treat unchecked `/sp.flow` and `/sp.ui` outputs as draft facts" in plan
    assert "Preserve `FLOW` as the main relation axis" in plan
    assert "Frontend Design Authority" in plan
    assert "framework implements design; framework does not replace design authority" in plan

    assert "Design Constraint" in tasks
    assert "apply_review_rail" in tasks

    assert "Frontend Design Authority" in implement
    assert "ui-confirmation.md" in implement
    assert "right confirmation rail" in implement

    assert "单张可审核流程图通常控制在 5-7 个业务节点" in methodology
    assert "8 个及以上业务节点" in methodology
    assert "10 个及以上业务节点" in methodology
    assert "复杂流程例外理由" in methodology
    assert "低风险线性例外" in methodology
    assert "不包含高风险判断、权限、不可逆结果、外部依赖或异常分支" in methodology
    assert "分段折叠清单" in methodology
    assert "不能为了满足 5-7 个节点预算而被粗暴合并" in methodology
    assert "前置依赖" in methodology
    assert "后置输出" in methodology
    assert "分段审核顺序" in methodology
    assert "自上而下的主干优先布局" in methodology
    assert "固定 SpecCompass review renderer 不是 Mermaid renderer" in methodology
    assert "原生 SVG/DAG 布局" in methodology
    assert "字体控制在 16px 到 18px" in methodology
    assert "useMaxWidth: false" in methodology
    assert "nodeSpacing" in methodology
    assert "rankSpacing" in methodology
    assert "左侧模块导航独立滚动" in methodology
    assert "中间图形区和右侧确认栏作为同一个审核工作区滚动" in methodology
    assert "禁止 sticky/max-height 裁剪右栏控件" in methodology
    assert "右侧反馈确认栏是 flow 确认页的合格条件" in methodology
    assert "索引预览不能替代具体图的授权" in methodology
    assert "不表示 flow 图不需要审核" in methodology
    assert "逐节点决策选项卡" in methodology
    assert "每个需要人工判断的节点" in methodology
    assert "2-4 个可执行选项" in methodology or ("must_confirm" in methodology and "3-4 个可执行选项" in methodology)
    assert "推荐选项" in methodology
    assert "后续出口" in methodology
    assert "逐节点 approve/defer/reject/block 控件" not in methodology
    assert "逐节点反馈输入框" in methodology
    assert "英文标签说明" in methodology
    assert "阻塞、待决策和 stale 状态必须同时出现在图和右侧确认栏" in methodology
    assert "前端展示页面的设计必须使用 `huashu-design` skill" in methodology
    assert "宿主没有提供 `huashu-design` skill" in methodology
    assert "后期前端开发" in methodology
    assert "PRD" in methodology and "覆盖" in methodology and "偏差" in methodology
    assert "右侧确认栏" in methodology and "业务前端" in methodology

    review_design = (PROJECT_ROOT / "docs" / "reference" / "sp-flow-ui-confirmation-review-design.zh-CN.md").read_text(
        encoding="utf-8"
    )
    assert "huashu-design" in review_design
    assert "前端展示页面" in review_design
    assert "确认页工具层默认方案" in review_design
    assert "业务前端实现" in review_design
    assert "右侧确认栏只属于确认页" in review_design

    assert "classify flow visual review into three tiers before promotion" in command_spec
    assert "show a concise Chinese" in command_spec
    assert "flow review summary before asking for confirmation" in command_spec
    assert "UI review summary before asking for confirmation" in command_spec
    assert "charts/tables and data sources" in command_spec
    assert "if a flow or UI review summary contains a human decision point" in command_spec
    assert "**No confirmation required** for trivial label" in command_spec
    assert "**Recommended confirmation** for small" in command_spec
    assert "**Required confirmation** for" in command_spec
    assert "run after `sp.flow` and consume its flow contract" in command_spec
    assert "classify UI visual review into three tiers before promotion" in command_spec
    assert "Process Visualization UI risk" in command_spec
    assert "state why, what changed, which tier would otherwise" in command_spec
    assert "UI is a projection of flow" in command_spec
    assert "New or refreshed outputs from `sp.flow`, `sp.ui`, and `sp.plan` are draft facts" in memory_arch
    assert "Recommended relation verbs" in trace_index
    assert "UI screen, field, or action cannot trace" in open_items


def test_flow_ui_coarse_inputs_use_bounded_inference_and_decision_options():
    """Flow/UI should be rich enough for design while keeping inferred content draft and bounded."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    flow = _command("flow")
    ui = _command("ui")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )

    for content, label in (
        (methodology, "methodology"),
        (flow, "flow"),
        (ui, "ui"),
        (command_spec, "command_spec"),
    ):
        assert "Source: model-inferred" in content, label
        assert "OPEN-*" in content, label
        assert "2-3" in content, label
        assert "recommendation" in content.lower() or "推荐方案" in content, label
        assert "/sp.clarify" in content, label
        assert "draft" in content.lower() or "草稿" in content, label
        assert "acceptance downgrade" in content.lower() or "验收降级" in content, label
        assert "irreversible" in content.lower() or "不可逆" in content, label

    assert "Decompose the flow top-down before writing diagrams" in flow
    assert "business goal, actors, lifecycle states, mainline stages, decision points" in flow
    assert "If the source information is coarse" in flow
    assert "Safe inferred details include common lifecycle stages" in flow
    assert "Unsafe inferred details include new business rules" in flow
    assert "not promoted to stable memory/trace" in flow
    assert "not under-decomposed" in flow

    assert "Decompose UI top-down before writing screen files" in ui
    assert "user roles, task entry points, screen map" in ui
    assert "If the flow contract and business domain are clear but UI information is coarse" in ui
    assert "Safe inferred details include standard create/view/edit/review/result screens" in ui
    assert "Unsafe inferred details include new business events" in ui
    assert "not promoted to stable memory/trace" in ui
    assert "not under-decomposed" in ui

    assert "自上而下" in methodology
    assert "受控推理" in methodology
    assert "不能直接关闭风险" in methodology


def test_stage_readiness_gates_flow_ui_and_blocks_inferred_pass():
    """Flow/UI must consume explicit upstream readiness and keep inferred facts draft."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    specify = _command("specify")
    clarify = _command("clarify")
    flow = _command("flow")
    ui = _command("ui")
    analyze = _command("analyze")
    gate = _command("gate")

    for content, label in (
        (methodology, "methodology"),
        (command_spec, "command_spec"),
        (analyze, "analyze"),
        (gate, "gate"),
    ):
        assert "Stage Readiness" in content, label
        assert "READY_FOR_FLOW" in content, label
        assert "READY_FOR_UI" in content, label
        assert "READY_FOR_PLAN" in content, label
        assert "NEEDS_DECISION" in content, label
        assert "DRAFT_ONLY" in content, label
        assert "Source: model-inferred" in content, label
        assert "[INFER:DRAFT]" in content, label
        assert "Source Snapshot" in content, label
        assert "Evidence Signature" in content, label

    for content, label in (
        (specify, "specify"),
        (clarify, "clarify"),
        (flow, "flow"),
        (ui, "ui"),
    ):
        assert "Stage Readiness" in content, label
        assert "NEEDS_DECISION" in content, label
        assert "DRAFT_ONLY" in content, label
        assert "Source: model-inferred" in content, label
        assert "[INFER:DRAFT]" in content, label
        assert "Source Snapshot" in content, label
        assert "Evidence Signature" in content, label

    assert "Status: READY_FOR_FLOW" in specify
    assert "Do not use file mtime or raw hash as a hard gate" in specify
    assert "Status: NEEDS_CLARIFY" in specify
    assert "Do not suggest `/sp.flow`" in specify

    assert "human-selected `Decision Record`" in clarify
    assert "A model recommendation" in clarify
    assert "must not unlock `READY_FOR_FLOW`" in clarify

    assert "Status: READY_FOR_FLOW" in flow
    assert "treat the upstream readiness as not stable enough for stable flow generation" in flow
    assert "only the signature formatting is missing" in flow
    assert "stop before generating flow artifacts" in flow
    assert "READY_FOR_UI" in flow
    assert "Suggest `/sp.ui` or `/sp.gate` only when flow `Stage Readiness` is `READY_FOR_UI`" in flow
    assert "[SRC:SPEC-*]" in flow
    assert "do not qualify as stable provenance" in flow

    assert "Status: READY_FOR_UI" in ui
    assert "treat the flow readiness as not stable enough for stable UI generation" in ui
    assert "only the signature formatting is missing" in ui
    assert "stop before generating stable UI artifacts" in ui
    assert "READY_FOR_PLAN" in ui
    assert "Suggest `/sp.gate` only when UI `Stage Readiness` is `READY_FOR_PLAN`" in ui
    assert "[SRC:FLOW-*]" in ui
    assert "do not qualify as stable provenance" in ui

    for content, label in ((analyze, "analyze"), (gate, "gate")):
        assert "Do not mark PASS when required `Stage Readiness` is missing" in content, label
        assert "without upstream `READY_FOR_FLOW`" in content, label
        assert "without upstream `READY_FOR_UI`" in content, label
        assert "Source Snapshot" in content, label
        assert "Evidence Signature" in content, label
        assert "`Source: model-inferred` is used as stable evidence" in content or "Source: model-inferred` is being used as stable" in content, label
    assert "不能静默选择" in methodology
    assert "不要用文件 `mtime` 或原始 hash 当硬门禁" in methodology
    assert "不能把它当作稳定准入凭证" in methodology
    assert "缺口只是格式遗漏" in methodology
    assert "decompose the flow top-down" in command_spec
    assert "use bounded model inference" in command_spec
    assert "decompose UI top-down" in command_spec
    assert "Missing snapshot/signature means the readiness is not a stable downstream entry proof" in command_spec
    assert "Do not use file mtime or raw file hash as a hard gate" in command_spec


def test_stage_entry_preflight_routes_missing_or_changed_upstream_work():
    """Downstream commands should stop early when prior SP stages are absent, weak, or invalidated."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    bash_prereq = BASH_PREREQ.read_text(encoding="utf-8")
    powershell_prereq = POWERSHELL_PREREQ.read_text(encoding="utf-8")
    template_bash_prereq = TEMPLATE_BASH_PREREQ.read_text(encoding="utf-8")
    template_powershell_prereq = TEMPLATE_POWERSHELL_PREREQ.read_text(encoding="utf-8")

    for command in ("bundle", "flow", "ui", "plan", "tasks", "analyze", "gate", "implement"):
        content = _command(command)
        assert "Stage Entry Preflight" in content, command
        assert "Missing/Weak Artifact" in content, command
        assert "Blocker Type" in content, command
        assert "Root Layer" in content, command
        assert "Owner Route" in content, command
        assert "Why current command cannot continue" in content, command
        assert "Next /sp.* route" in content, command
        assert "Writeback Target" in content, command

    analyze = _command("analyze")
    ui = _command("ui")

    assert "--require-flow" in analyze
    assert "--require-ui" in analyze
    assert "-RequireFlow" in analyze
    assert "-RequireUi" in analyze
    assert "--require-flow" in ui
    assert "-RequireFlow" in ui

    for content, label in ((bash_prereq, "bash"), (template_bash_prereq, "template_bash")):
        assert "--require-flow" in content, label
        assert "--require-ui" in content, label

    for content, label in (
        (powershell_prereq, "powershell"),
        (template_powershell_prereq, "template_powershell"),
    ):
        assert "-RequireFlow" in content, label
        assert "-RequireUi" in content, label

    for content, label in (
        (bash_prereq, "bash"),
        (powershell_prereq, "powershell"),
        (template_bash_prereq, "template_bash"),
        (template_powershell_prereq, "template_powershell"),
    ):
        assert "Run /sp.flow first" in content, label
        assert "Run /sp.ui first" in content, label
        assert "flows/" in content, label
        assert "ui/" in content, label

    for content, label in ((methodology, "methodology"), (command_spec, "command_spec")):
        assert "Stage Entry Preflight" in content or "阶段入口准入检查" in content, label
        assert "SUBJECT_CONFUSION" in content, label
        assert "--auto" in content, label
        assert "/sp.prd" in content, label
        assert "/sp.specify" in content, label
        assert "/sp.clarify" in content, label
        assert "/sp.flow" in content, label
        assert "/sp.ui" in content, label
        assert "/sp.plan" in content, label
        assert "/sp.tasks" in content, label
        assert "Do not auto-create missing upstream documents" in content or "不要自动生成缺失的上游文档" in content, label


def test_document_stage_code_artifacts_require_mode_impl_handoff():
    """Doc-stage closeout should not smuggle code artifacts into a document result."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    tasks = _command("tasks")
    analyze = _command("analyze")
    gate = _command("gate")
    implement = _command("implement")

    for content, label in (
        (methodology, "methodology"),
        (command_spec, "command_spec"),
        (tasks, "tasks"),
        (analyze, "analyze"),
        (gate, "gate"),
        (implement, "implement"),
    ):
        assert "Mode: impl" in content, label
        assert "code handoff" in content or "代码包交接" in content or "实现交接包" in content, label
        assert "Allowed Write Set" in content, label
        assert "Required Checks" in content, label

    for content, label in (
        (methodology, "methodology"),
        (command_spec, "command_spec"),
        (tasks, "tasks"),
        (analyze, "analyze"),
        (gate, "gate"),
    ):
        assert "unauthorized" in content or "未经授权" in content, label
        assert "src/" in content, label
        assert "scripts/" in content, label
        assert "stage" in content or "commit" in content or "提交" in content, label


def test_data_linkage_and_business_pass_constraints_are_enforced():
    """Data/flow/UI/API/test linkage should constrain PASS decisions."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    tasks = _command("tasks")
    analyze = _command("analyze")
    gate = _command("gate")
    implement = _command("implement")

    for content, label in (
        (methodology, "methodology"),
        (command_spec, "command_spec"),
        (tasks, "tasks"),
        (analyze, "analyze"),
        (gate, "gate"),
        (implement, "implement"),
    ):
        assert "data-linkage" in content or "数据联动" in content, label
        assert "direct neighbor" in content or "直接相邻" in content or "direct-neighbor" in content, label
        assert "UI" in content and "API" in content and "permission" in content.lower(), label
        assert "acceptance" in content.lower() or "验收" in content, label
        assert "tests" in content.lower() or "测试" in content, label

    for content, label in (
        (methodology, "methodology"),
        (command_spec, "command_spec"),
        (analyze, "analyze"),
        (gate, "gate"),
    ):
        assert "command success" in content or "命令运行成功" in content, label
        assert "exit code 0" in content or "退出 0" in content, label
        assert "business PASS" in content or "业务 PASS" in content, label


def test_side_entry_commands_preserve_fallback_and_export_safety():
    """Side-entry helpers should not bypass SP routing, open-items, or PASS rules."""
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    bundle = _command("bundle")
    checklist = _command("checklist")
    taskstoissues = _command("taskstoissues")
    constitution = _command("constitution")

    for content, label in (
        (bundle, "bundle"),
        (checklist, "checklist"),
        (taskstoissues, "taskstoissues"),
        (constitution, "constitution"),
        (command_spec, "command_spec"),
    ):
        assert "business PASS" in content, label

    assert "direct-neighbor data-linkage" in bundle
    assert "unchecked draft flow/UI/plan outputs" in bundle
    assert "memory/open-items.md" in bundle

    assert "high-impact ambiguity" in checklist
    assert "Flow-UI/data-linkage gap" in checklist
    assert "memory/open-items.md" in checklist
    assert "NEEDS_DECISION" in checklist
    assert "/sp.clarify" in checklist

    assert "export-ready" in taskstoissues
    assert "Mode: doc` or `Mode: impl" in taskstoissues
    assert "allowed write" in taskstoissues.lower()
    assert "required checks" in taskstoissues.lower()
    assert "Do not export tasks" in taskstoissues
    assert "NEEDS_DECISION" in taskstoissues

    assert "direct-neighbor checks" in constitution
    assert "human decision package" in constitution

    assert "### `sp.taskstoissues`" in command_spec
    assert "created issues do not prove business PASS" in command_spec


def test_project_scaffold_carries_linkage_and_closeout_slots():
    """Installed feature templates should have places to record linkage and closeout evidence."""
    scaffold_tasks = (PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "tasks.md").read_text(
        encoding="utf-8"
    )
    scaffold_analysis = (
        PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "analysis.md"
    ).read_text(encoding="utf-8")
    scaffold_gate = (PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "gate.md").read_text(
        encoding="utf-8"
    )

    for content, label in (
        (scaffold_tasks, "scaffold_tasks"),
        (scaffold_analysis, "scaffold_analysis"),
        (scaffold_gate, "scaffold_gate"),
    ):
        assert "data-linkage" in content or "Data-Linkage" in content, label
        assert "direct-neighbor" in content or "direct neighbor" in content, label
        assert "code handoff" in content, label
        assert "business PASS" in content, label

    assert "Blocker Breakdown" in scaffold_analysis
    assert "smallest solvable unit" in scaffold_gate.lower()


def test_flow_ui_rules_avoid_deep_public_coordinates_by_default():
    """The new relation model should not introduce CodeGraph-style deep public IDs by default."""
    flow = _command("flow")
    ui = _command("ui")
    analyze = _command("analyze")
    gate = _command("gate")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    trace_index = (FEATURE_MEMORY_DIR / "trace-index.md").read_text(encoding="utf-8")

    for content, label in (
        (flow, "flow"),
        (ui, "ui"),
        (analyze, "analyze"),
        (gate, "gate"),
        (constitution, "constitution"),
        (trace_index, "trace_index"),
    ):
        assert "FEATxx.WSxx.TYPExx" in content or "FEAT01.WS02.UI03" in content, label
        assert "FLOW01.STEP04" in content, label
        assert "UI03.BTN05" in content, label

    assert "unless a recurring cross-document object truly needs promotion" in flow
    assert "unless a recurring cross-document object truly needs promotion" in ui
    assert "should not appear as stable public coordinates unless" in analyze


def test_blocker_root_cause_loop_control_and_decision_freeze_are_enforced():
    """Complex blocker handling should be executable, not only described in the methodology doc."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    analyze = _command("analyze")
    gate = _command("gate")
    plan = _command("plan")
    implement = _command("implement")
    tasks = _command("tasks")
    clarify = _command("clarify")
    constitution = _command("constitution")
    scaffold_analysis = (
        PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "analysis.md"
    ).read_text(encoding="utf-8")
    scaffold_gate = (PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "gate.md").read_text(
        encoding="utf-8"
    )
    scaffold_tasks = (PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "tasks.md").read_text(
        encoding="utf-8"
    )
    scaffold_constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    lean_plan = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.plan.md").read_text(encoding="utf-8")
    lean_clarify = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.clarify.md").read_text(encoding="utf-8")
    lean_analyze = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.analyze.md").read_text(encoding="utf-8")
    lean_gate = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.gate.md").read_text(encoding="utf-8")
    lean_tasks = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.tasks.md").read_text(encoding="utf-8")
    lean_implement = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.implement.md").read_text(encoding="utf-8")

    blocker_packet_files = {
        "methodology": methodology,
        "analyze": analyze,
        "gate": gate,
        "plan": plan,
        "implement": implement,
        "tasks": tasks,
        "scaffold_analysis": scaffold_analysis,
        "scaffold_tasks": scaffold_tasks,
        "lean_plan": lean_plan,
        "lean_analyze": lean_analyze,
        "lean_gate": lean_gate,
        "lean_tasks": lean_tasks,
        "lean_implement": lean_implement,
    }
    for label, content in blocker_packet_files.items():
        for field in ("Blocker ID", "Failure Signature", "Root Layer", "Disconfirming Evidence", "Writeback Target"):
            assert field in content, f"{label} missing {field}"
        assert "smallest solvable unit" in content.lower() or "Smallest Solvable Unit" in content, label

    for label, content in (
        ("methodology", methodology),
        ("analyze", analyze),
        ("plan", plan),
        ("implement", implement),
        ("scaffold_analysis", scaffold_analysis),
        ("scaffold_tasks", scaffold_tasks),
        ("lean_analyze", lean_analyze),
        ("lean_gate", lean_gate),
        ("lean_tasks", lean_tasks),
        ("lean_implement", lean_implement),
    ):
        assert "<Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>" in content, label
        assert "`data`" in content or "data" in content, label

    for label, content in (
        ("analyze", analyze),
        ("gate", gate),
        ("implement", implement),
        ("lean_analyze", lean_analyze),
        ("lean_gate", lean_gate),
        ("lean_implement", lean_implement),
    ):
        assert "fallback-log" in content, label
        assert "memory/open-items.md" in content, label

    for label, content in (
        ("analyze", analyze),
        ("gate", gate),
        ("lean_analyze", lean_analyze),
        ("lean_gate", lean_gate),
    ):
        assert "promoted" in content, label

    for label, content in (
        ("analyze", analyze),
        ("gate", gate),
        ("scaffold_analysis", scaffold_analysis),
        ("scaffold_gate", scaffold_gate),
        ("lean_analyze", lean_analyze),
        ("lean_gate", lean_gate),
    ):
        assert "open-items" in content, label
        assert "trace" in content, label
        assert "relation/history" in content or "relation/history lookup" in content, label

    for label, content in (
        ("methodology", methodology),
        ("analyze", analyze),
        ("gate", gate),
        ("plan", plan),
        ("implement", implement),
        ("tasks", tasks),
        ("clarify", clarify),
        ("constitution", constitution),
        ("scaffold_analysis", scaffold_analysis),
        ("scaffold_gate", scaffold_gate),
        ("scaffold_tasks", scaffold_tasks),
        ("scaffold_constitution", scaffold_constitution),
        ("lean_plan", lean_plan),
        ("lean_clarify", lean_clarify),
        ("lean_analyze", lean_analyze),
        ("lean_gate", lean_gate),
        ("lean_tasks", lean_tasks),
        ("lean_implement", lean_implement),
    ):
        assert "NEEDS_DECISION" in content, label
        assert "written back" in content or "writeback" in content or "回写" in content, label
        assert "human-selected" in content or "用户已经选择" in content or "人" in content, label

    for label, content in (
        ("plan", plan),
        ("lean_plan", lean_plan),
    ):
        assert "Failure Signature" in content, label
        assert "Root Layer" in content, label
        assert "Next Route" in content, label
        assert "Writeback Target" in content, label
        assert "NEEDS_DECISION" in content, label

    for label, content in (
        ("tasks", tasks),
        ("implement", implement),
        ("scaffold_tasks", scaffold_tasks),
        ("lean_tasks", lean_tasks),
        ("lean_implement", lean_implement),
    ):
        assert "promote-candidate" in content or "append fallback-log" in content, label
        assert "do not directly" in content.lower(), label

    for label, content in (
        ("analyze", analyze),
        ("gate", gate),
        ("scaffold_analysis", scaffold_analysis),
        ("scaffold_gate", scaffold_gate),
        ("lean_analyze", lean_analyze),
        ("lean_gate", lean_gate),
    ):
        assert "already promoted" in content or "existing open item" in content, label

    assert "fixture 数据形状" in methodology
    assert "fixture/script syntax" in lean_implement or "fixture/script syntax" in implement
    assert "sp.clarify" in (PROJECT_ROOT / "presets" / "lean" / "preset.yml").read_text(encoding="utf-8")

    for label, content in (
        ("gate", gate),
        ("scaffold_gate", scaffold_gate),
        ("lean_gate", lean_gate),
    ):
        assert "Writeback Target" in content or "writeback" in content, label
        assert "PASS" in content, label
        assert "Do not pass" in content or "do not grant PASS" in content, label


def test_blocker_triage_matrix_prevents_stage_boundary_confusion():
    """Blockers should be classified before retry, tasking, gate PASS, or human decision routing."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    memory_arch = (
        PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-context-memory-architecture.md"
    ).read_text(encoding="utf-8")
    analyze = _command("analyze")
    gate = _command("gate")
    tasks = _command("tasks")
    scaffold_analysis = (
        PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "analysis.md"
    ).read_text(encoding="utf-8")
    scaffold_gate = (PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "gate.md").read_text(
        encoding="utf-8"
    )
    scaffold_tasks = (PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "tasks.md").read_text(
        encoding="utf-8"
    )

    triage_docs = {
        "methodology": methodology,
        "command_spec": command_spec,
        "memory_arch": memory_arch,
        "analyze": analyze,
        "gate": gate,
        "tasks": tasks,
        "scaffold_analysis": scaffold_analysis,
        "scaffold_gate": scaffold_gate,
        "scaffold_tasks": scaffold_tasks,
    }
    for label, content in triage_docs.items():
        for blocker_type in (
            "INFO_GAP",
            "SOURCE_AUTHORITY_GAP",
            "UPSTREAM_DOC_GAP",
            "CODE_TEST_ONLY",
            "EXECUTION_INFRA",
            "GENERIC_ARTIFACT",
            "BUSINESS_DECISION",
            "ROUTING_STALE",
            "SCOPE_CONFLICT",
        ):
            assert blocker_type in content, f"{label} missing {blocker_type}"

    for label, content in (
        ("methodology", methodology),
        ("command_spec", command_spec),
        ("analyze", analyze),
        ("gate", gate),
        ("tasks", tasks),
    ):
        assert "Blocker Type" in content, label
        assert "memory/open-items.md" in content, label
        assert "Mode: impl" in content, label

    assert "not business PASS" in command_spec
    assert "not business PASS" in analyze
    assert "command success" in scaffold_tasks and "business PASS" in scaffold_tasks
    assert "broad/batch reruns" in gate
    assert "root blocker family" in command_spec
    assert "root blocker family" in scaffold_analysis
    assert "stale routing" in analyze.lower()
    assert "generic template artifacts" in gate.lower()
    assert "required evidence depends" in command_spec
    assert "not automatically blockers" in command_spec


def test_code_continuation_task_packets_are_executable_and_reviewable():
    """Code continuation rules should be present in main, lean, scaffold, and reference docs."""
    tasks = _command("tasks")
    implement = _command("implement")
    analyze = _command("analyze")
    gate = _command("gate")
    plan = _command("plan")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    memory_arch = (
        PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-context-memory-architecture.md"
    ).read_text(encoding="utf-8")
    scaffold_tasks = (FEATURE_TEMPLATE_DIR / "tasks.md").read_text(encoding="utf-8")
    lean_tasks = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.tasks.md").read_text(encoding="utf-8")
    lean_implement = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.implement.md").read_text(
        encoding="utf-8"
    )
    lean_analyze = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.analyze.md").read_text(encoding="utf-8")
    lean_gate = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.gate.md").read_text(encoding="utf-8")

    continuation_fields = (
        "Read Set",
        "Dependencies Checked",
        "Reverse Trace Checked",
        "Expected Delta",
        "Delta Summary",
        "Proposed Updates",
    )

    for content, label in (
        (tasks, "tasks"),
        (implement, "implement"),
        (analyze, "analyze"),
        (gate, "gate"),
        (command_spec, "command_spec"),
        (methodology, "methodology"),
        (memory_arch, "memory_arch"),
        (scaffold_tasks, "scaffold_tasks"),
        (lean_tasks, "lean_tasks"),
        (lean_implement, "lean_implement"),
        (lean_analyze, "lean_analyze"),
        (lean_gate, "lean_gate"),
    ):
        for field in continuation_fields:
            assert field in content, f"{label} missing {field}"

    assert "Dependency Surface" in plan
    assert "Reverse Trace Expectation" in plan
    assert "Dependency Surface" in command_spec
    assert "Reverse Trace Expectation" in command_spec
    assert "memory-first continuation" in implement.lower()
    assert "Memory-first continuation" in implement
    assert "memory-first routing" in lean_implement
    assert "source code only through direct dependencies" in implement
    assert "expand only from direct evidence" in scaffold_tasks


def test_delta_first_review_order_prevents_full_reaudit_by_default():
    """Analyze/gate and detailed docs should review deltas before broad source reads."""
    overview_en = (PROJECT_ROOT / "templates" / "project" / "docs" / "sp-overview.en.md").read_text(encoding="utf-8")
    overview_zh = (
        PROJECT_ROOT / "templates" / "project" / "docs" / "sp-overview.zh-CN.md"
    ).read_text(encoding="utf-8")
    details_en = (
        PROJECT_ROOT / "templates" / "project" / "docs" / "sp-overview-details.en.md"
    ).read_text(encoding="utf-8")
    details_zh = (
        PROJECT_ROOT / "templates" / "project" / "docs" / "sp-overview-details.zh-CN.md"
    ).read_text(encoding="utf-8")

    for content, label in (
        (_command("analyze"), "analyze"),
        (_command("gate"), "gate"),
        ((PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.analyze.md").read_text(encoding="utf-8"), "lean_analyze"),
        ((PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.gate.md").read_text(encoding="utf-8"), "lean_gate"),
    ):
        assert "Delta Summary" in content, label
        assert "current diff" in content, label
        assert "task packet" in content, label
        assert "trace/open-items" in content, label
        assert "necessary source code" in content, label
        assert "Delta Summary" in content and (
            "not as proof" in content
            or "not treat `Delta Summary` as proof" in content
            or "Delta Summary` alone" in content
        ), label

    for content, label in (
        (overview_en, "sp-overview.en.md"),
        (overview_zh, "sp-overview.zh-CN.md"),
        (details_en, "sp-overview-details.en.md"),
        (details_zh, "sp-overview-details.zh-CN.md"),
    ):
        assert "Delta Summary" in content, label
        assert "diff" in content, label
        assert "trace" in content, label
        assert "Read Set" in content, label


def test_reverse_trace_and_proposed_updates_support_safe_multi_agent_continuation():
    """Implementation and worker handoff rules should avoid destructive edits and shared-state races."""
    implement = _command("implement")
    tasks = _command("tasks")
    gate = _command("gate")
    analyze = _command("analyze")

    for content, label in (
        (implement, "implement"),
        (tasks, "tasks"),
        (gate, "gate"),
        (analyze, "analyze"),
    ):
        assert "delete, move, rename" in content, label
        assert "public behavior" in content, label
        assert "schema" in content, label
        assert "permission" in content, label
        assert "route" in content, label
        assert "event" in content, label
        assert "acceptance" in content, label
        assert "reverse-trace" in content.lower() or "Reverse Trace" in content, label

    assert "Proposed Updates" in implement
    assert "coordinator closeout" in implement


def test_multi_agent_proposed_update_conflicts_block_analyze_and_gate_pass():
    """Analyze/gate should catch conflicting worker updates before stage PASS."""
    analyze = _command("analyze")
    gate = _command("gate")

    assert "conflicting Proposed Updates across multiple workers" in analyze
    assert "same anchor, open-item ID, task state, or global registry field" in analyze
    assert "semantic conflicts between proposed changes must be identified before PASS" in analyze
    assert "conflicting Proposed Updates targeting the same anchor, open-item, task, or registry field" in gate
    assert "conflicting Proposed Updates targeting the same object remain unresolved" in gate


def test_multi_agent_control_contract_has_canonical_runtime_anchors():
    """Shared multi-agent vocabulary should be canonical without hiding runtime-critical rules."""
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")
    archive_multi_agent_plan = ARCHIVE_MULTI_AGENT_PLAN.read_text(encoding="utf-8")
    methodology = (PROJECT_ROOT / "docs" / "reference" / "sp-project-methodology.md").read_text(
        encoding="utf-8"
    )
    tasks_template = (PROJECT_ROOT / "templates" / "tasks-template.md").read_text(encoding="utf-8")
    tasks = _command("tasks")
    implement = _command("implement")
    analyze = _command("analyze")
    gate = _command("gate")
    multi_agent_section = _section_between(
        command_spec,
        "## 10.3 Controlled Multi-Agent Execution",
        "## 10.4 Stage Evidence And Mechanical Guardrails",
    )
    archive_canonical_contract = _section_between(
        archive_multi_agent_plan,
        "## Canonical Contract",
        "## 兜底策略",
    )

    for heading in (
        "Canonical hard gates",
        "Canonical worker handoff fields",
        "Canonical worker status enum",
        "Canonical dependency closure",
        "Canonical fallback report fields",
        "Canonical shared truth files",
        "Canonical global registry-like files",
    ):
        assert heading in command_spec
        assert heading in multi_agent_section

    for token in (
        *MULTI_AGENT_WORKER_STATES,
        *MULTI_AGENT_FALLBACK_FIELDS,
        *MULTI_AGENT_HANDOFF_FIELDS,
        *MULTI_AGENT_SHARED_TRUTH_FILES,
        *MULTI_AGENT_GLOBAL_REGISTRY_FILES,
        "dependency closure",
        "single-agent sequential recovery",
    ):
        assert token in multi_agent_section

    _assert_tokens_in_order(multi_agent_section, MULTI_AGENT_HANDOFF_FIELDS)
    _assert_tokens_in_order(archive_canonical_contract, MULTI_AGENT_HANDOFF_FIELDS)
    _assert_tokens_in_order(multi_agent_section, MULTI_AGENT_WORKER_STATES)
    _assert_tokens_in_order(multi_agent_section, MULTI_AGENT_FALLBACK_FIELDS)
    _assert_tokens_in_order(multi_agent_section, MULTI_AGENT_SHARED_TRUTH_FILES)
    _assert_tokens_in_order(multi_agent_section, MULTI_AGENT_GLOBAL_REGISTRY_FILES)
    assert "Keep full runtime copies only where a command must decide or execute immediately" in multi_agent_section
    assert "`/sp.tasks`, `/sp.implement`, `/sp.analyze`, and `/sp.gate`" in multi_agent_section
    assert "No failure signal is not completion evidence" in multi_agent_section

    assert "Trace `Expand Docs` checks" not in multi_agent_section
    assert "[P] tasks = different files, no dependencies" not in tasks_template
    no_legacy_status_files = [
        PROJECT_ROOT / "docs" / "reference" / "sp-project-methodology.md",
        PROJECT_ROOT / "docs" / "reference" / "workflows.md",
        PROJECT_ROOT / "templates" / "tasks-template.md",
        PROJECT_ROOT / "templates" / "project" / ".specify" / "memory" / "constitution.md",
        COMMAND_SPEC,
        *sorted((PROJECT_ROOT / "templates" / "commands").glob("*.md")),
        *sorted((PROJECT_ROOT / "templates" / "project" / "docs").glob("sp-overview*.md")),
    ]
    for path in no_legacy_status_files:
        content = path.read_text(encoding="utf-8")
        for old_status in (
            "BLOCKED_BY_GLOBAL",
            "PARTIAL",
            "Status: SUCCESS | FAILED",
            "Proposed Shared Memory Updates",
            "proposed shared-memory",
            "Key Inputs Read",
            "Tests / Checks Run",
        ):
            assert old_status not in content, path

    for token in (
        "Allowed Write Set",
        "Required Checks",
        "shared truth",
        "global registry-like",
        "coordinator closeout",
        "fallback report",
    ):
        assert token in tasks_template
        assert token in tasks

    for token in (
        *MULTI_AGENT_WORKER_STATES,
        "Worker handoff",
        "single-agent sequential recovery",
        "dependency-closure requirements",
        "Fallback Reason",
        "next /sp.* step",
    ):
        assert token in implement

    for token in MULTI_AGENT_WORKER_STATES:
        assert token in analyze
        assert token in implement

    analyze_handoff_check = _paragraph_containing(analyze, "every worker report names")
    implement_handoff_rule = _paragraph_containing(implement, "**Worker handoff**")
    _assert_tokens_in_order(analyze_handoff_check, MULTI_AGENT_HANDOFF_FIELDS)
    _assert_tokens_in_order(implement_handoff_rule, MULTI_AGENT_HANDOFF_FIELDS)

    for token in MULTI_AGENT_FALLBACK_FIELDS:
        assert token in analyze
        assert token in gate

    assert "dependency closure" in analyze
    assert "dependency closure" in gate
    assert "global registry-like" in analyze
    assert "global registry-like" in gate

    for content in (tasks_template, tasks, implement, analyze, gate):
        assert "sp-command-spec.md` §10.3" in content

    for token in MULTI_AGENT_WORKER_STATES:
        assert token in methodology

    methodology_handoff_block = _fenced_block_containing(methodology, "## Agent Handoff")
    _assert_tokens_in_order(methodology_handoff_block, MULTI_AGENT_HANDOFF_FIELDS)


def test_code_continuation_missing_or_empty_fields_have_safe_routes():
    """Empty continuation fields should not pass; missing context must route to the nearest owner."""
    tasks = _command("tasks")
    implement = _command("implement")
    analyze = _command("analyze")
    gate = _command("gate")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    lean_tasks = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.tasks.md").read_text(encoding="utf-8")
    lean_implement = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.implement.md").read_text(
        encoding="utf-8"
    )
    lean_analyze = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.analyze.md").read_text(encoding="utf-8")
    lean_gate = (PROJECT_ROOT / "presets" / "lean" / "commands" / "sp.gate.md").read_text(encoding="utf-8")

    for content, label in (
        (tasks, "tasks"),
        (command_spec, "command_spec"),
        (lean_tasks, "lean_tasks"),
    ):
        assert "N/A - <reason>" in content, label
        assert "Empty fields are not evidence" in content or "empty fields are not evidence" in content, label

    assert "NEEDS_PLAN" in implement
    assert "NEEDS_TASKS" in implement
    assert "NEEDS_CONTEXT" in implement
    assert "cannot be recovered from routed files" in implement
    assert "NEEDS_CONTEXT" in lean_implement

    assert "Missing continuation fields route to `/sp.tasks`" in gate
    assert "missing the code-boundary or dependency surface" in gate
    assert "route to `/sp.plan`" in gate
    assert "route back to `/sp.tasks`" in lean_gate

    assert "incomplete implementation packets route to `NEEDS_TASKS`" in analyze
    assert "route to `/sp.tasks`" in analyze
    assert "route to `/sp.plan`" in analyze
    assert "NEEDS_CONTEXT` is not a diagnostic verdict" in analyze
    assert "clear no-applicable reason" in lean_analyze


def test_upgrade_docs_and_changelog_explain_code_continuation_migration():
    """Old projects should get a safe migration path for code-continuation task packets."""
    upgrade = (PROJECT_ROOT / "docs" / "upgrade.md").read_text(encoding="utf-8")
    changelog = (PROJECT_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")

    for content, label in ((upgrade, "upgrade"), (changelog, "changelog")):
        assert "code-continuation" in content, label
        assert "Read Set" in content, label
        assert "Dependencies Checked" in content, label
        assert "Reverse Trace Checked" in content, label
        assert "Expected Delta" in content, label
        assert "Delta Summary" in content, label
        assert "Proposed Updates" in content, label

    assert "do **not** need to be rebuilt" in upgrade
    assert "N/A - low-risk local task" in upgrade
    assert "route to `/sp.tasks`" in upgrade
    assert "route to `/sp.plan`" in upgrade
    assert "route to `/sp.clarify`" in upgrade
    assert "NEEDS_DECISION" in upgrade
    assert "NEEDS_CONTEXT" in upgrade


def test_flow_ui_subject_scope_prevents_sp_mechanism_outputs():
    """Flow/UI outputs should model the target product, not SP's own process."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    flow = _command("flow")
    ui = _command("ui")

    for content, label in ((flow, "flow"), (ui, "ui")):
        assert "Subject Scope" in content, label
        assert "target business application" in content, label
        assert "operational context" in content, label
        assert "subject-confusion" in content, label
        assert "business domain" in content, label
        assert "SUBJECT_CONFUSION" in content, label
        assert "preflight" in content, label
        assert "workset" in content, label
        assert "`/sp.*`" in content, label
        assert "discard the affected" in content, label
        assert "Do not regenerate in the same run" in content, label
        assert "hits `SUBJECT_CONFUSION` twice" in content, label

    assert "must never produce flow diagrams" in flow
    assert "SP's own command processing" in flow
    assert "as business flow nodes" in flow
    assert "Run a subject-confusion scan" in flow
    assert "workflow monitoring panel" in flow
    assert "process visualization" in flow

    assert "must never produce UI designs" in ui
    assert "SP's own command interface" in ui
    assert "as screen subjects" in ui
    assert "Run a subject-confusion scan" in ui
    assert "Business UI means" in ui
    assert "Process Visualization UI means" in ui
    assert "flow step progress" in ui
    assert "state transition timeline" in ui
    assert "target business operations" in ui

    assert "建模主体永远是目标业务系统" in methodology
    assert "业务域" in methodology
    assert "流程展示型 UI" in methodology
    assert "SUBJECT_CONFUSION" in methodology
    assert "meta-product 场景保留窄例外" in methodology
    assert "规格说明目标产品确实是开发者/工作流/规格工具" in methodology
    assert "业务域、角色、source、验收、坐标或 trace 锚点" in methodology
    assert "`preflight`、`Allowed Write Set`、`Required Checks`、`NEEDS_DECISION` 等词可能是目标业务系统里的合法文案" in methodology
    assert "不能成为业务流程节点、界面、字段、按钮、用户路径或图中标签" in methodology
    assert "主体混淆" in methodology
    assert "不要在同一轮里继续重生成" in methodology
    assert "业务域锚点应作为可见内容" in methodology
    assert "连续两次因为同一业务边界触发 `SUBJECT_CONFUSION`" in methodology
    assert "`--auto` 只能跳过视觉确认" in methodology
    assert "The hard-fail has a narrow meta-product exception" in command_spec
    assert "business-domain, role, source, acceptance, coordinate, or trace anchors" in command_spec
    assert "Terms such as `preflight`, `Allowed Write Set`, `Required Checks`, and `NEEDS_DECISION`" in command_spec


def test_flow_ui_subject_confusion_blocks_analyze_and_gate_pass():
    """Analyze/Gate must hard-block wrong-subject or process-display UI artifacts."""
    analyze = _command("analyze")
    gate = _command("gate")

    for content, label in ((analyze, "analyze"), (gate, "gate")):
        assert "SUBJECT_CONFUSION" in content, label
        assert "Do not mark PASS" in content or "Block PASS" in content, label
        assert "target business application" in content, label
        assert "workflow stages" in content, label
        assert "flow step progress" in content, label
        assert "state transition timeline" in content, label
        assert "processing dashboard" in content, label
        assert "business-role/data/permission/acceptance" in content, label


def test_stage_next_prompts_require_human_confirmation_when_needed():
    """Stage closeout prompts should stop for user review before unstable facts advance."""
    prd = _command("prd")
    specify = _command("specify")
    plan = _command("plan")
    tasks = _command("tasks")

    assert "classify the unresolved item before routing" in prd
    assert "[src:ai-proposed]" in prd
    assert "[uncertain:*]" in prd
    assert "unconfirmed candidate requirements" in prd
    assert "stays in graphical Discovery with `NEXT_COMMAND_EXEC: None`" in prd
    assert "focused non-boundary decision that the node-bound Discovery contract cannot express" in prd

    assert "If `Stage Readiness` is `READY_FOR_FLOW`, suggest `/sp.flow`" in specify
    assert "do not suggest `/sp.flow`" in specify
    assert "end with an explicit review prompt" in specify
    assert "confirm, reject, or revise the named items" in specify

    assert "workset split" in plan
    assert "sub-feature promotion" in plan
    assert "sub-project promotion" in plan
    assert "do not suggest `/sp.tasks` as the immediate next step" in plan
    assert "explicit confirmation prompt" in plan

    assert "BUSINESS_DECISION" in tasks
    assert "unresolved `SCOPE_CONFLICT`" in tasks
    assert "do not suggest `/sp.implement` or `/sp.analyze`" in tasks
    assert "route to `/sp.clarify`" in tasks


def test_flow_ui_next_prompts_require_visual_review_before_downstream():
    """Flow/UI should visibly prompt users to review diagrams or UI artifacts before promotion."""
    flow = _command("flow")
    ui = _command("ui")

    assert "End with a visual review prompt" in flow
    assert "short Chinese flow review summary" in flow
    assert "`设计依据` from PRD/spec/clarifications" in flow
    assert "`主流程`" in flow
    assert "`决策点`" in flow
    assert "`异常/恢复`" in flow
    assert "flow visuals are ready for review" in flow
    assert "which files to review" in flow
    assert "which viewer to use" in flow
    assert "FLOW A1-3 branch handling" in flow
    assert "do not present `/sp.ui` or `/sp.gate`" in flow

    assert "End with a visual review prompt" in ui
    assert "short Chinese UI review summary" in ui
    assert "`设计依据` from PRD/spec and flow" in ui
    assert "`布局结构`" in ui
    assert "`动作按钮`" in ui
    assert "`图表/表格和数据源`" in ui
    assert "UI visuals are ready for review" in ui
    assert "which files to review" in ui
    assert "which viewer to use" in ui
    assert "ACTION A2 on SCREEN S1" in ui
    assert "do not present `/sp.gate` as the immediate next" in ui


def test_flow_methodology_requires_human_focused_review_page_contract():
    """Flow methodology should keep confirmation pages compact and review-efficient."""
    flow = _command("flow")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")

    for content, label in ((flow, "flow command"), (methodology, "methodology")):
        assert "project business overview" in content or "项目整体业务地图" in content, label
        assert "module summary" in content or "模块简介" in content, label
        assert "per-flow summary" in content or "流程简介" in content, label
        assert "fullscreen" in content or "全屏" in content, label
        assert "bulk approve" in content or "全部通过" in content, label
        assert "bulk block" in content or "全部阻塞" in content, label
        assert "selected diagram, subflow, or node" in content or "选中的图、子流程或节点" in content, label
        assert "selected node should focus the right rail on that single checkpoint" in content or "右侧节点栏只显示该确认点" in content, label
        assert "待处理必审" in content, label
        assert "total must-confirm" in content or "总必审" in content, label
        assert "recommended nodes are not included in the red must-confirm pending count" in content or "建议确认不计入红色待处理必审" in content, label
        assert "必须审核总数" not in content, label
        assert "实时" in content or "real-time" in content, label
        assert "red marker" in content or "红色标记" in content, label
        assert "内部右上角" in content or "inside the node" in content, label
        assert "选中态" in content or "selected state" in content, label
        assert "悬浮提示" in content or "tooltip" in content or "popover" in content, label
        assert "同一信息" in content or "duplicate" in content, label
        assert "collapsible" in content or "折叠" in content, label
        assert "node feedback is collapsed by default" in content or "节点反馈默认折叠" in content, label
        assert "current-flow bulk" in content or "当前流程批量" in content, label
        assert "当前流程批量（current-flow bulk）通过、阻塞" not in content, label
        assert "current-flow bulk recommended-option" in content or "当前流程批量按推荐确认" in content, label
        assert "current visible flow or node only" in content or "只保存当前可见流程或节点" in content, label
        assert "ask how many unfinished visible items remain before bulk saving recommendations" in content or "批量按推荐保存前提示当前可见未完成数量" in content, label
        assert "index preview" in content or "索引预览" in content, label
        assert "NOT_APPLICABLE_FOR_UI" in content, label
        assert "5-7" in content, label
        assert "8 or more" in content or "8 个及以上" in content, label
        assert "10 or more" in content or "10 个及以上" in content, label
        assert "complex-flow exception reason" in content or "复杂流程例外理由" in content, label
        assert "low-risk linear exception" in content or "低风险线性例外" in content, label
        assert "collapsible segment checklist" in content or "分段折叠清单" in content, label
        assert "disable" in content or "禁用" in content, label
        assert "default path" in content or "默认路径" in content, label
        assert "human-readable" in content or "人话" in content, label
        assert "业务层面" in content, label
        assert "系统/架构层面" in content, label
        assert "产品经理" in content, label
        assert "系统负责人" in content, label
        assert "6 类" in content or "six" in content.lower(), label
        assert "必须确认" in content, label
        assert "建议确认" in content, label
        assert "存疑" in content, label
        assert "关键环节" in content, label
        assert "已验证" in content, label
        assert "系统/架构确认" in content, label
        assert "已 PRD 验证" in content, label
        assert "已 spec 验证" in content, label
        assert "同一颜色" in content or "same color" in content.lower(), label
        assert "默认短句" in content or "default compact" in content, label
        assert "请判断" in content, label
        assert "推荐方案" in content or "recommended option" in content, label
        assert "业务决策卡" in content or "business decision card" in content, label
        assert "业务决策卡只能作为内部概念" in content or "business decision card is an internal concept" in content, label
        assert "默认层不得显示可见标题“业务决策卡”" in content or "must not display the visible title" in content, label
        assert "5 秒" in content or "5-second" in content, label
        assert "首屏无技术" in content or "technical-free first screen" in content, label
        assert "卡片头部元信息" in content or "card header metadata" in content, label
        assert "紧凑单行" in content or "compact single line" in content, label
        assert "卡片正文三行" in content or "three body rows" in content, label
        assert "不得拆成字段表行" in content or "must not be split into field-table rows" in content, label
        assert "依据位置" in content, label
        assert "字段表" in content or "field table" in content, label
        assert "一句业务判断" in content or "one business decision" in content, label
        assert "决策卡" in content or "decision card" in content, label
        assert "白名单" in content or "may show only" in content, label
        assert "separate 这是什么 / 要决定什么 / 怎么选 rows do not appear in the default layer" in content or "不要把 `这是什么`、`要决定什么`、`怎么选` 三段问答平铺在默认层" in content, label
        assert "折叠详情" in content or "collapsible supporting" in content, label
        assert "关联业务" in content, label
        assert "为什么存在" in content, label
        assert "需要判断什么" in content, label
        assert "不需要确认" in content or "不需要管什么" in content, label
        assert "模块简介" in content, label
        assert "流程简介" in content, label
        assert "业务对象" in content, label
        assert "角色" in content, label
        assert "当前图职责" in content or "处理范围" in content, label
        assert "文件名、节点数、节点预算" in content or "file name, node count, and node budget" in content, label
        assert "只能进入折叠追溯" in content or "belong only in folded trace details" in content, label
        assert "业务快照" in content or "business snapshot" in content, label
        assert "1-2 句" in content or "1-2 sentences" in content, label
        assert "不复述方法论" in content or "must not restate methodology" in content, label
        assert "谁在什么场景处理什么" in content or "who handles what in which business scenario" in content, label
        assert "不得直接拼接" in content or "must not directly concatenate" in content, label
        assert "`businessObject`" in content, label
        assert "`roles`" in content, label
        assert "`flowResponsibility`" in content, label
        assert "业务场景" in content or "business scenario" in content, label
        assert "当前模块 + 业务对象" in content or "current module + business object" in content, label
        assert (
            "说明当前业务如何处理" in content
            or "说明当前业务怎样被处理" in content
            or "explain how the current business is handled" in content
        ), label
        assert "生成阶段" in content or "generation stage" in content, label
        assert "审核页不是文案清洗器" in content or "review page is not a copy cleanup layer" in content, label
        assert "不能先生成技术话术再依赖页面翻译" in content or "must not generate technical wording first" in content, label
        assert "业务模块默认文案不得套用系统/架构兜底" in content, label
        assert "系统/架构话术只能用于" in content, label
        assert "精确业务语境匹配" in content or "specific business-context matching" in content, label
        assert "通知/模板/开发者门户/API Key/AI" in content, label
        assert "主业务路径、关键判断、异常分支和完成条件" not in content, label
        assert "泛化套话" in content or "generic boilerplate" in content, label
        assert "long node labels" in content or "长节点标签" in content, label
        assert "wrap" in content or "换行" in content, label
        assert "two-way linkage" in content or "双向联动" in content, label
        assert "clicking a node card" in content or "点击右侧节点卡" in content, label
        assert "clicking a diagram node" in content or "点击流程图节点" in content, label
        assert "data-addressable" in content or "数据" in content or "stable node ID" in content, label
        assert "Enter/Space" in content or "renderer README" in content or "renderer-specific mechanics" in content, label
        assert "NOT_APPLICABLE_FOR_UI" in content and ("still show" in content or "主视图必须显示" in content), label
        assert "deferred_items:" not in content, label
        assert "rejected_items:" not in content, label
        assert "failed/deferred items" not in content, label
        assert "deferred or rejected items" not in content, label
        assert "owner_approval:" in content, label
        assert "status: CONFIRMED | PENDING | NOT_REQUIRED" in content, label
        assert "human_confirmation: CONFIRMED | NEEDS_REVISION | SCOPED_CONFIRMATION | STALE | REVOKED" in content, label
        assert "confirmed_items: [<flow/file-level labels or IDs authorized without node-level choice>]" in content, label
        assert "needs_decision_items:" in content, label
        assert "OPTION_B" in content and "needs_decision_items" in content, label
        assert "unresolved_decision_items:" in content, label
        assert "decision_recorded_items:" in content, label
        assert "OPTION_A/C/D" in content and "decision_recorded_items" in content, label
        assert (
            "OPTION_B" in content
            and (
                ("never counts as" in content and "confirmed" in content)
                or "不能被统计为已确认" in content
            )
        ), label

    for content, label in ((methodology, "methodology"), (renderer_readme, "renderer README")):
        assert "aria-pressed" in content, label
        assert 'role="button"' in content, label
        assert 'tabindex="0"' in content, label
        assert "Enter/Space" in content, label

    for content, label in ((methodology, "methodology"), (renderer_readme, "renderer README")):
        assert "推荐选项点击即保存" in content or "recommended-option click saves immediately" in content, label
        assert "重新选择" in content or "reselect" in content, label
        assert "非推荐选项" in content or "non-recommended option" in content, label
        assert "审核意见" in content or "review note" in content, label
        assert "提交选择" in content or "submit choice" in content, label
        assert "草稿不能进入 `decision_records`" in content or "draft choices must not enter `decision_records`" in content, label
        assert "MISSING | DRAFT | SAVED_RECOMMENDED | SAVED_SUBMITTED" in content, label
        assert "重新选择清空正式选择和草稿，回到未选择" in content or "reselect clears saved selection" in content, label
        assert "draft_excluded_items:" in content, label
        assert "DRAFT nodes must be listed only in `draft_excluded_items`" in content or "待提交草稿节点只能进入 `draft_excluded_items`" in content or "仍处于 `DRAFT` 的待提交草稿只能进入 `draft_excluded_items`" in content or "DRAFT 状态 / nodes in DRAFT state 的待提交草稿只能进入 `draft_excluded_items`" in content, label
        assert "ordinary unresolved" in content or "普通 unresolved" in content or "普通未处理决策" in content, label
        assert "写入项目" in content or "write to project" in content, label
        assert "download fallback" in content or "下载确认包降级" in content, label
        assert "复制摘要" in content or "copy-summary" in content, label
        assert "离开页面" in content or "beforeunload" in content or "navigation/close" in content, label
        assert "草稿不具备授权意义" in content or "draft choices do not authorize" in content, label
        assert "批量按推荐确认不能覆盖" in content or "bulk recommended-option must not overwrite" in content, label
        assert "跳过" in content and ("草稿" in content or "draft" in content), label
        assert "输入框下方" in content or "under the input" in content or "textarea" in content, label
        assert "即时可见反馈" in content or "immediate visible feedback" in content, label
        assert "needs-decision exit" in content or "以 `needs-decision` 开头" in content, label
        assert "nodes in DRAFT state" in content or "DRAFT 状态" in content, label
        assert "nodes with no selected option" in content or "没有选择" in content, label
        assert "Reset controls clear only the current view's browser local state back to MISSING" in content or "重置动作只清除当前视图 localStorage 中的临时选择" in content, label

    assert "Node option interaction must be explicit" not in flow
    assert "MISSING | DRAFT | SAVED_RECOMMENDED | SAVED_SUBMITTED" not in flow
    assert "beforeunload" not in flow
    assert "copy-summary" not in flow
    assert "Node-level option actions must update only" not in flow


def test_flow_ui_review_data_renderer_contract_is_fixed_and_schema_bound():
    """Flow/UI commands should fill structured review data instead of rewriting page code."""
    flow = _command("flow")
    ui = _command("ui")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")
    review_index_template = json.loads(REVIEW_INDEX_TEMPLATE.read_text(encoding="utf-8"))

    for content, label in (
        (flow, "flow command"),
        (ui, "ui command"),
        (methodology, "methodology"),
        (skill, "review-data skill"),
    ):
        assert "speccompass-review-data" in content, label
        assert "structured review data" in content or "结构化 review data" in content, label
        assert "fixed renderer" in content or "固定 renderer" in content, label
        assert ".specify/review/renderer/speccompass-review-renderer.html" in content, label
        assert "renderer directory" in content or "renderer 目录" in content or "多文件固定基础设施" in content, label
        assert "validate-review-data.mjs" in content, label
        assert "schema" in content.lower() or "Schema" in content, label
        assert "普通 `/sp.flow`、`/sp.ui`" in content or "normal `/sp.flow` and `/sp.ui`" in content, label
        assert "不得修改 renderer" in content or "must not edit the renderer" in content, label
        assert "校验失败" in content or "validation fails" in content, label
        assert "不能收尾" in content or "must not finish" in content, label
        assert "不能提升 readiness" in content or "must not promote readiness" in content, label

    assert "specs/<feature>/flows/review/flow-review-data.json" in flow
    assert "flow-review-data.schema.json" in flow
    assert "specs/<feature>/ui/review/ui-review-data.json" in ui
    assert "ui-review-data.schema.json" in ui
    for content, label in ((flow, "flow command"), (ui, "ui command"), (skill, "review-data skill"), (renderer_readme, "renderer README"), (methodology, "methodology")):
        assert "specs/review-index.json" in content, label
        assert "has_flow_review" in content, label
        assert "has_ui_review" in content, label
    assert "上一需求" in renderer_readme and "下一需求" in renderer_readme
    assert "上一业务模块" in renderer_readme and "下一业务模块" in renderer_readme
    assert review_index_template["schema_version"] == 2
    assert isinstance(review_index_template["features"], list)
    assert review_index_template["features"] == []
    assert review_index_template["hierarchy"] == {"mode": "flat", "root_feature": None}
    assert {"schema_version", "project", "updated_at", "hierarchy", "features"} <= set(review_index_template)
    assert REVIEW_INDEX_SCHEMA.is_file()
    assert REVIEW_INDEX_VALIDATOR.is_file()
    assert REVIEW_INDEX_MIGRATOR.is_file()
    assert FEATURE_CODE_LEDGER_SCHEMA.is_file()
    assert FEATURE_CODE_LEDGER_LIB.is_file()
    assert FEATURE_CODE_MANAGER.is_file()
    for content, label in ((flow, "flow"), (ui, "ui"), (skill, "skill"), (renderer_readme, "renderer README"), (methodology, "methodology")):
        assert "migrate-review-index.mjs" in content, label
        assert "validate-review-index.mjs" in content, label
        assert "parent_feature" in content, label
        assert "sibling_order" in content, label
        assert "outline_alignment" in content, label
    assert "不要虚构" in flow or "do not invent" in flow
    assert "不要虚构" in ui or "do not invent" in ui
    assert "2-4\n  `OPTION_A`/`OPTION_B`/`OPTION_C`/`OPTION_D` choices" not in flow
    assert "2-4\n  `OPTION_A`/`OPTION_B`/`OPTION_C`/`OPTION_D` choices" not in ui
    assert "ordinary human-judgment nodes default to 3 options" in flow
    assert "ordinary human-judgment nodes default to 3 options" in ui
    assert "只填数据" in skill or "fill only" in skill
    assert "说人话" in skill
    assert "不要编写 HTML/CSS/JS" in skill or "Do not write HTML/CSS/JS" in skill
    assert "must_confirm" in skill and "3-4" in skill and "recommended_option" in skill
    assert "ordinary human-judgment nodes default to 3 options" in skill
    assert "options_count_rationale" in skill
    assert "real business background" in skill
    assert "what happens after selection" in skill
    assert "downstream impact" in skill
    assert "why this option is recommended" in skill
    assert "可执行出口" in skill or "actionable exit" in skill
    assert "5-7" in skill and "8+" in skill and "10+" in skill
    assert "localStorage" in renderer_readme
    assert "授权" in renderer_readme or "authorization" in renderer_readme
    assert "huashu-design" in renderer_readme
    assert "OPTION_B.next_exit" in skill
    assert "needs-decision" in skill
    assert "confirmed_items" in skill and "decision_recorded_items" in skill
    assert "最小完整 JSON" in skill or "Minimal complete JSON" in skill
    assert "There is no manual JSON selector" in renderer_readme
    assert "Loading is exclusively" in renderer_readme
    assert "flow-confirmation.md" in renderer_readme
    assert "ui-confirmation.md" in renderer_readme
    assert "DO NOT EDIT in normal /sp.flow or /sp.ui runs" in renderer_readme
    assert "fixed shared infrastructure for both flow and UI review" in renderer_readme
    assert "multi-file fixed infrastructure" in renderer_readme or "多文件固定基础设施" in renderer_readme
    assert "normal `/sp.flow` and `/sp.ui` commands still only fill structured review data" in renderer_readme
    assert "native SVG/DAG flow diagram" in renderer_readme
    assert "fixed renderer is not Mermaid-based" in renderer_readme
    assert "no complex animation" in renderer_readme or "不使用复杂动画" in renderer_readme
    assert "plain text markers" in renderer_readme or "纯文本标注" in renderer_readme
    assert "position, size, click choices, right rail, persistence, and summary" in renderer_readme
    assert "Renderer changes require a separate implementation task with tests" in renderer_readme
    assert "Prohibited in /sp.flow and /sp.ui runs" in renderer_readme
    assert "Do not edit `.specify/review/renderer/speccompass-review-renderer.html`" in renderer_readme
    assert "Do not add or modify CSS classes" in renderer_readme
    assert "Do not add or modify JavaScript functions" in renderer_readme
    assert "Do not change the interaction state machine" in renderer_readme
    assert "Every option requires" in skill
    assert "`benefit` (required)" in skill
    assert "`cost` (required)" in skill
    assert "`consequence` (required)" in skill
    assert "`recommendation_reason`" in skill
    assert "`next_exit` (required)" in skill


def test_review_renderer_displays_decision_background_and_tradeoff_option_copy():
    """The right rail should show decision context and option tradeoffs first."""
    renderer = _review_renderer_bundle()

    for token in (
        "option-detail-list",
        "option-detail-label",
        "option-detail-value",
        "背景信息",
        "决策摘要",
        "收益",
        "代价",
        "推荐理由",
        "node.decision_background",
        "node.decision_summary",
        "option.benefit",
        "option.cost",
        "option.recommendation_reason",
        "option.consequence",
        "option.next_exit",
    ):
        assert token in renderer, token


def test_review_renderer_warns_legacy_option_fields_are_read_only():
    """The browser-side validator should warn when old option fields appear in hand-edited data."""
    renderer = _review_renderer_bundle()

    for token in (
        "when_to_choose",
        "project_impact",
        "legacy option field",
        "旧字段",
        "只兼容读取",
        "benefit/cost/recommendation_reason",
    ):
        assert token in renderer, token


def test_review_renderer_option_choices_use_full_width_readable_cards():
    """Long plain-language options should render as full-width cards, not hidden strips."""
    renderer = _review_renderer_bundle()

    for token in (
        ".option-row",
        "flex-direction: column",
        "overflow: visible",
        "box-sizing: border-box",
        "width: 100%",
        "max-width: 100%",
        "white-space: normal",
    ):
        assert token in renderer, token

    for forbidden in (
        "flex: 0 0 clamp(260px, 86vw, 340px)",
        "max-width: calc(100vw - 42px)",
        "scroll-snap-type: x proximity",
    ):
        assert forbidden not in renderer, forbidden


def test_review_option_plain_language_rules_are_documented_in_primary_guidance():
    """Commands and the data skill should reject lazy option writing."""
    flow = _command("flow")
    ui = _command("ui")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")

    for content, label in (
        (flow, "flow command"),
        (ui, "ui command"),
        (methodology, "methodology"),
        (skill, "review-data skill"),
    ):
        assert "背景信息" in content, label
        assert "决策摘要" in content, label
        assert "收益" in content, label
        assert "代价" in content, label
        assert "推荐理由" in content, label
        assert "consequence" in content and "next_exit" in content, label
        assert "谁继续处理" in content, label
        assert "不选推荐" in content, label
        assert "真实差异" in content, label
        assert "范围决策" in content, label
        assert "门禁决策" in content, label
        assert "降级决策" in content, label
        assert "技术词" in content and ("解释" in content or "中文说明" in content), label
        assert "模板句" in content or "stock phrase" in content or "boilerplate" in content, label
        assert "validate-review-data.mjs" in content, label
        assert "needs-decision 选项必须说清缺什么、谁拍板、哪些下游工作暂停" in content, label
        assert "split-flow 选项必须说清拆成哪些子流程" in content, label
        assert "推荐项必须说明为什么比更慢、更重或更保守的替代方案更适合" in content, label
        assert "执行字段" in content or "execution field" in content, label


def test_review_option_plain_language_rules_preserve_facts_and_reject_fabrication():
    """The embedded plain-language guidance should not trade correctness for smoother copy."""
    flow = _command("flow")
    ui = _command("ui")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    compact_skill = " ".join(skill.split())

    for token in (
        "Preserve facts before making copy smoother",
        "先保真再说人话",
        "Do not invent facts",
        "不要为了凑选项编",
        "Use real subjects and real actions",
        "真主语真动作",
        "`options_count_rationale`",
    ):
        assert token in skill, token

    for protected_token in (
        "`node.id`",
        "`change_type`",
        "`next_exit`",
        "`source_ref`",
        "schema field names",
        "enum values",
        "trace IDs",
    ):
        assert protected_token in compact_skill, protected_token

    for content, label in ((flow, "flow command"), (ui, "ui command")):
        assert "canonical option-writing rule lives in the `speccompass-review-data`" in content, label
        assert "anti-fabrication" in content, label
        assert "`node.id`" in content and "`change_type`" in content and "`next_exit`" in content, label
        assert "`source_ref`" in content and "schema" in content and "enum" in content and "trace IDs" in content, label
        assert "do not invent extra exits" in content, label
        assert "`options_count_rationale`" in content, label


def test_review_option_generation_rules_cannot_be_replaced_by_hand_edited_examples():
    """Improving example data is not a substitute for fixing the SP generation path."""
    flow = _command("flow")
    ui = _command("ui")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")

    for content, label in (
        (flow, "flow command"),
        (ui, "ui command"),
        (methodology, "methodology"),
        (skill, "review-data skill"),
    ):
        assert "example data must not replace generation rules" in content, label
        assert "实验数据不能替代生成规则" in content, label
        assert "flow-review-data.json" in content, label
        assert "ui-review-data.json" in content, label
        assert "validate-review-data.mjs" in content, label


def test_flow_ui_review_feedback_exports_revision_requests_without_direct_editing():
    """Review pages should collect model-actionable revision requests instead of editing designs directly."""
    flow = _command("flow")
    ui = _command("ui")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")
    renderer = _review_renderer_bundle()

    for content, label in (
        (flow, "flow command"),
        (ui, "ui command"),
        (methodology, "methodology"),
        (skill, "review-data skill"),
        (renderer_readme, "renderer README"),
    ):
        assert "revision_requests" in content, label
        assert "review data 是待审内容" in content or "review data is draft review content" in content, label
        assert "confirmation document" in content or "确认文档" in content, label
        assert "自然语言修改意见" in content or "natural-language revision" in content, label
        assert "不是编辑器" in content or "not an editor" in content, label
        assert "不直接修改 flow 或 UI 设计" in content or "does not directly edit flow or UI design" in content, label

    for content, label in ((flow, "flow command"), (skill, "review-data skill"), (renderer_readme, "renderer README")):
        for token in (
            "ADD_NODE",
            "DELETE_NODE",
            "MODIFY_NODE",
            "MODIFY_BRANCH",
            "ADD_EXCEPTION_PATH",
            "SPLIT_SUBFLOW",
            "MERGE_SIMPLIFY",
            "ADD_ENTRY_EXIT",
        ):
            assert token in content, (label, token)

    for content, label in ((ui, "ui command"), (skill, "review-data skill"), (renderer_readme, "renderer README")):
        for token in (
            "ADD_SCREEN",
            "DELETE_SCREEN",
            "MODIFY_SCREEN_STRUCTURE",
            "ADD_REGION",
            "MODIFY_REGION_LAYOUT",
            "ADD_COMPONENT",
            "DELETE_COMPONENT",
            "MODIFY_FIELD_ACTION_COPY",
            "ADD_STATE",
            "MODIFY_INTERACTION",
            "ADD_PERMISSION_DISPLAY",
        ):
            assert token in content, (label, token)

    for token in (
        "changeTypeOptions",
        "flowChangeTypes",
        "uiChangeTypes",
        "change_type",
        "revision_requests",
        "buildRevisionRequest",
        "isSubmittedRevisionRequest",
        "saved.option !== node.recommended_option",
        "expected_model_action",
        "target_ref",
        "target_label",
        "reviewer_note",
        "summaryText",
        "summaryScalar",
        "JSON.stringify(summaryText(value))",
        "replace(/\\s+/g, \" \")",
    ):
        assert token in renderer, token


def test_review_pages_use_short_url_parameters_as_primary_entry():
    """Flow/UI/Outline review should open the renderer and auto-load data from short URL params."""
    flow = _command("flow")
    ui = _command("ui")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")
    data_loader = (REVIEW_ROOT / "renderer" / "scripts" / "data-loader.js").read_text(encoding="utf-8")

    assert ".specify/review/renderer/speccompass-review-renderer.html?flow=<feature>" in flow
    assert ".specify/review/renderer/speccompass-review-renderer.html?ui=<feature>" in ui
    assert "flow-review-batch.md` 作为主入口" in flow or "flow-review-batch.md` as the primary entry" in flow
    assert "ui-review-batch.md` 作为主入口" in ui or "ui-review-batch.md` as the primary entry" in ui
    assert "备用" in _paragraph_containing(flow, "flow-review-batch.md")
    assert "备用" in _paragraph_containing(ui, "ui-review-batch.md")

    for content, label in (
        (skill, "review-data skill"),
        (methodology, "methodology"),
        (renderer_readme, "renderer readme"),
    ):
        assert ".specify/review/renderer/speccompass-review-renderer.html?flow=<feature>" in content, label
        assert ".specify/review/renderer/speccompass-review-renderer.html?ui=<feature>" in content, label
        assert "短参数" in content or "short URL" in content, label
        assert "fallback" in content.lower() or "兜底" in content, label

    assert "URLSearchParams(window.location.search)" in data_loader
    assert 'params.get("flow")' in data_loader
    assert 'params.get("ui")' in data_loader
    assert 'params.get("outline")' in data_loader
    assert "URL 只能包含 flow、ui 或 outline 其中一个短参数" in data_loader
    assert "validateFeatureId" in data_loader
    assert "includes(\"..\")" in data_loader
    assert "new URL(relativePath, window.location.href)" in data_loader
    assert "../../../specs/${encodeURIComponent(feature)}/flows/review/flow-review-data.json" in data_loader
    assert "../../../specs/${encodeURIComponent(feature)}/ui/review/ui-review-data.json" in data_loader
    assert "../../../specs/${encodeURIComponent(feature)}/prd/review/outline-review-data.json" in data_loader
    assert "window.location.protocol === \"http:\"" in data_loader
    assert "isAllowedReviewHost(window.location.hostname)" in data_loader
    assert "serve-review.mjs" in data_loader
    assert "path.sep" not in data_loader
    assert "\\\\" not in data_loader


def test_review_renderer_exposes_view_module_and_requirement_recommendation_scopes():
    """Recommendation completion should expose three precise, independently bound scopes."""
    renderer_entry = REVIEW_PAGE_RENDERER.read_text(encoding="utf-8")
    data_loader = (REVIEW_ROOT / "renderer" / "scripts" / "data-loader.js").read_text(encoding="utf-8")

    for button_id, label in (
        ("bulk-view-recommended", "当前视图按推荐保存"),
        ("bulk-module-recommended", "当前模块按推荐保存"),
        ("bulk-requirement-recommended", "当前需求按推荐保存"),
    ):
        assert f'id="{button_id}"' in renderer_entry
        assert label in renderer_entry
        assert f'$("{button_id}").addEventListener' in data_loader

    assert 'runRecommendationCompletion(currentItemNodes(), "当前视图")' in data_loader
    assert 'runRecommendationCompletion(currentModuleNodes(), "当前模块")' in data_loader
    assert 'runRecommendationCompletion(allNodes().map(({ node }) => node), "当前需求")' in data_loader


def test_review_recommendation_scope_current_view_includes_all_item_nodes_when_node_selected():
    """The view scope should not collapse to the focused node in the current item."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer state tests")

    script = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(script))}, "utf8");
const context = {{
  window: {{ SpecCompassDom: {{}} }},
  console,
  reviewData: {{
    review_type: "flow",
    modules: [{{
      id: "module-a",
      diagrams: [
        {{ id: "flow-a1", nodes: [{{ id: "a-1" }}, {{ id: "a-2" }}] }},
        {{ id: "flow-a2", nodes: [{{ id: "a-3" }}] }}
      ]
    }}]
  }},
  selectedModuleIndex: 0,
  selectedItemIndex: 0,
  selectedNodeId: "a-1",
  STORAGE_PREFIX: "test:",
  localStorage: {{}},
  state: {{}},
  create: () => ({{}}),
  requiresNodeDecision: () => true
}};
vm.createContext(context);
vm.runInContext(source, context);
const ids = context.currentItemNodes().map((node) => node.id);
if (JSON.stringify(ids) !== JSON.stringify(["a-1", "a-2"])) {{
  throw new Error(`unexpected view nodes: ${{JSON.stringify(ids)}}`);
}}
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


def test_review_display_ordinals_use_semantic_hierarchy_for_flow_and_ui():
    """Flow and UI review pages should share module.item.node option coordinates."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer state tests")

    script = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(script))}, "utf8");
function assertEqual(actual, expected, label) {{
  if (actual !== expected) throw new Error(`${{label}}: expected ${{expected}}, got ${{actual}}`);
}}
function runCase(reviewType, collectionKey) {{
  const firstItem = {{ id: `${{reviewType}}-a1`, nodes: [{{ id: "n1" }}, {{ id: "n2" }}] }};
  const secondItem = {{ id: `${{reviewType}}-a2`, nodes: [{{ id: "n3" }}] }};
  const moduleA = {{ id: "module-a", [collectionKey]: [firstItem, secondItem] }};
  const moduleB = {{ id: "module-b", [collectionKey]: [{{ id: `${{reviewType}}-b1`, nodes: [{{ id: "n4" }}] }}] }};
  const context = {{
    window: {{ SpecCompassDom: {{}} }},
    console,
    reviewData: {{ review_type: reviewType, modules: [moduleA, moduleB] }},
    selectedModuleIndex: 0,
    selectedItemIndex: 0,
    STORAGE_PREFIX: "test:",
    localStorage: {{}},
    state: {{}},
    create: () => ({{}}),
    requiresNodeDecision: () => true
  }};
  vm.createContext(context);
  vm.runInContext(source, context);
  assertEqual(context.reviewModuleDisplayOrdinal(moduleA, 0), "01", `${{reviewType}} module A`);
  assertEqual(context.reviewModuleDisplayOrdinal(moduleB, 1), "02", `${{reviewType}} module B`);
  assertEqual(context.reviewItemDisplayOrdinal(firstItem, moduleA, 0), "01.1", `${{reviewType}} first item`);
  assertEqual(context.reviewItemDisplayOrdinal(secondItem, moduleA, 1), "01.2", `${{reviewType}} second item`);
  assertEqual(context.reviewNodeDisplayOrdinal(firstItem.nodes[0], firstItem, moduleA), "01.1.1", `${{reviewType}} first node`);
  assertEqual(context.reviewNodeDisplayOrdinal(firstItem.nodes[1], firstItem, moduleA), "01.1.2", `${{reviewType}} second node`);
  assertEqual(context.reviewOptionDisplayOrdinal("01.1.1", 0), "01.1.1-O1", `${{reviewType}} first option`);
}}
runCase("flow", "diagrams");
runCase("ui", "screens");
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


def test_review_recommendation_scope_current_module_flattens_only_that_module():
    """The module scope should include every item in the selected module and nothing else."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer state tests")

    script = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(script))}, "utf8");
const context = {{
  window: {{ SpecCompassDom: {{}} }},
  console,
  reviewData: {{
    review_type: "flow",
    modules: [
      {{ id: "module-a", diagrams: [{{ id: "flow-a", nodes: [{{ id: "a-1" }}] }}] }},
      {{
        id: "module-b",
        diagrams: [
          {{ id: "flow-b1", nodes: [{{ id: "b-1" }}, {{ id: "b-2" }}] }},
          {{ id: "flow-b2", nodes: [{{ id: "b-3" }}] }}
        ]
      }}
    ]
  }},
  selectedModuleIndex: 1,
  selectedItemIndex: 0,
  selectedNodeId: "b-1",
  STORAGE_PREFIX: "test:",
  localStorage: {{}},
  state: {{}},
  create: () => ({{}}),
  requiresNodeDecision: () => true
}};
vm.createContext(context);
vm.runInContext(source, context);
const ids = context.currentModuleNodes().map((node) => node.id);
if (JSON.stringify(ids) !== JSON.stringify(["b-1", "b-2", "b-3"])) {{
  throw new Error(`unexpected module nodes: ${{JSON.stringify(ids)}}`);
}}
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


def test_review_renderer_transport_gate_allows_explicit_private_lan_before_accepting_data():
    """Only loopback/private LAN HTTP origins pass the launcher transport gate."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer transport tests")

    script = REVIEW_ROOT / "renderer" / "scripts" / "data-loader.js"
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(script))}, "utf8");
const controlIds = ["download-package", "copy-summary"];

function evaluate(protocol, hostname, shouldBlock) {{
  const controls = Object.fromEntries(controlIds.map((id) => [id, {{
    disabled: false,
    addEventListener: () => undefined,
    classList: {{ toggle: () => undefined }}
  }}]));
  controls["show-all"] = {{ addEventListener: () => undefined }};
  controls["bulk-view-recommended"] = {{ addEventListener: () => undefined }};
  controls["bulk-module-recommended"] = {{ addEventListener: () => undefined }};
  controls["bulk-requirement-recommended"] = {{ addEventListener: () => undefined }};
  controls["bulk-all-recommended"] = {{ addEventListener: () => undefined }};
  controls["bulk-recommended"] = {{ addEventListener: () => undefined }};
  controls["reset-visible"] = {{ addEventListener: () => undefined }};
  controls["priority-filters"] = {{ addEventListener: () => undefined }};
  controls["live-status"] = {{ textContent: "", classList: {{ toggle: () => undefined }} }};
  let accepted = 0;
  const context = {{
    window: {{
      location: {{ protocol, hostname, search: "" }},
      addEventListener: () => undefined,
      confirm: () => true
    }},
    console,
    URL,
    URLSearchParams,
    reviewData: {{ review_type: "flow" }},
    $: (id) => controls[id],
    acceptReviewData: () => {{ accepted += 1; }},
    setStatus: (message) => {{ controls["live-status"].textContent = message; }},
    downloadConfirmationPackage: () => undefined,
    copySummary: () => undefined,
    hasDrafts: () => false,
    hasUnexportedSavedChoices: () => false
  }};
  vm.createContext(context);
  vm.runInContext(source, context);
  if (accepted !== 0) {{
    throw new Error(`${{protocol}}//${{hostname}} accepted ${{accepted}} review payloads`);
  }}
  if (shouldBlock) {{
    for (const id of controlIds) {{
      if (!controls[id].disabled) throw new Error(`${{id}} was not disabled for ${{protocol}}//${{hostname}}`);
    }}
    if (!controls["live-status"].textContent.includes("serve-review.mjs")) {{
      throw new Error("blocked transport did not identify the required launcher");
    }}
  }} else if (!controls["live-status"].textContent.includes("SPECCOMPASS_REVIEW_URL")) {{
    throw new Error("supported transport without a bound URL did not fail closed");
  }}
}}

evaluate("file:", "", true);
evaluate("http:", "localhost", true);
evaluate("https:", "127.0.0.1", true);
evaluate("http:", "8.8.8.8", true);
evaluate("http:", "127.0.0.1", false);
evaluate("http:", "10.0.0.209", false);
evaluate("http:", "172.16.1.20", false);
evaluate("http:", "192.168.1.20", false);
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


def test_review_confirmation_legacy_vocabulary_is_compatibly_migrated():
    """New docs should explain old approval words without letting new outputs write them."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    flow = _command("flow")
    ui = _command("ui")

    for content, label in (
        (methodology, "methodology"),
        (flow, "flow command"),
        (ui, "ui command"),
    ):
        assert "legacy" in content.lower() or "历史" in content or "旧" in content, label
        assert "`APPROVED`" in content and "`CONFIRMED`" in content, label
        assert "`REJECTED`" in content and "`NEEDS_REVISION`" in content, label
        assert "new write" in content.lower() or "新写入" in content or "新生成" in content, label


def test_downstream_commands_use_current_confirmation_decision_vocabulary():
    """Downstream stages should consume the current flow/UI confirmation contract."""
    for command in ("analyze", "gate", "implement", "plan", "tasks"):
        content = _command(command)
        flow_ui_blocks = [
            block
            for block in re.split(r"\n\s*\n", content)
            if (
                "flow/UI" in block
                or "Flow/UI" in block
                or "flow confirmation" in block
                or "UI confirmation" in block
                or "batch confirmation" in block
                or "SCOPED_CONFIRMATION" in block
            )
        ]
        flow_ui_contract = "\n\n".join(flow_ui_blocks)

        if command in {"implement", "tasks"}:
            assert "owner approval is `CONFIRMED` or `NOT_REQUIRED`" in content, command
        assert (
            "needs-decision" in flow_ui_contract
            or "needs_decision_items" in flow_ui_contract
            or "unresolved" in flow_ui_contract
            or "unresolved_decision_items" in flow_ui_contract
        ), command
        assert "needs revision" in flow_ui_contract or "NEEDS_REVISION" in flow_ui_contract, command
        assert "deferred or rejected items" not in flow_ui_contract, command
        assert "deferred or rejected siblings" not in flow_ui_contract, command
        assert "partial, rejected" not in flow_ui_contract, command
        assert "partial, `rejected`" not in flow_ui_contract, command
        assert "owner approval is `APPROVED`" not in flow_ui_contract, command
        assert "approve/defer/reject controls" not in content, command


def test_review_display_theme_follows_system_then_persists_manual_choice():
    """Display theme should initialize before paint without entering review state."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer theme tests")

    script = REVIEW_ROOT / "renderer" / "scripts" / "theme-toggle.js"
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(script))}, "utf8");

function runCase(stored, prefersDark, storageThrows = false) {{
  let button = null;
  let onReady = null;
  const writes = [];
  const root = {{ dataset: {{}} }};
  const icon = {{ textContent: "" }};
  const attrs = {{}};
  const handlers = {{}};
  const storage = {{
    getItem: () => {{
      if (storageThrows) throw new Error("storage unavailable");
      return stored;
    }},
    setItem: (key, value) => {{
      if (storageThrows) throw new Error("storage unavailable");
      writes.push([key, value]);
    }}
  }};
  const document = {{
    documentElement: root,
    readyState: "loading",
    getElementById: () => button,
    addEventListener: (type, handler) => {{
      if (type === "DOMContentLoaded") onReady = handler;
    }}
  }};
  const context = {{
    window: {{
      localStorage: storage,
      matchMedia: () => ({{ matches: prefersDark }})
    }},
    document,
    console
  }};
  vm.createContext(context);
  vm.runInContext(source, context);
  button = {{
    setAttribute: (name, value) => {{ attrs[name] = value; }},
    querySelector: () => icon,
    addEventListener: (type, handler) => {{ handlers[type] = handler; }}
  }};
  onReady();
  return {{
    attrs,
    icon,
    root,
    writes,
    click: () => handlers.click()
  }};
}}

const storedLight = runCase("light", true);
if (storedLight.root.dataset.theme !== "light") throw new Error("stored light theme did not win");
if (storedLight.attrs["aria-pressed"] !== "false") throw new Error("light aria state is incorrect");
if (storedLight.attrs["aria-label"] !== "切换到深色模式") throw new Error("light action label is incorrect");
if (storedLight.icon.textContent !== "☾") throw new Error("light icon is incorrect");
storedLight.click();
if (storedLight.root.dataset.theme !== "dark") throw new Error("click did not switch to dark");
if (storedLight.attrs["title"] !== "切换到浅色模式") throw new Error("dark title is incorrect");
if (storedLight.icon.textContent !== "☀") throw new Error("dark icon is incorrect");
if (JSON.stringify(storedLight.writes) !== JSON.stringify([["speccompass-review:display-theme", "dark"]])) {{
  throw new Error("manual theme was not persisted");
}}

const systemDark = runCase("invalid", true);
if (systemDark.root.dataset.theme !== "dark") throw new Error("system dark theme was ignored");

const unavailableStorage = runCase(null, false, true);
if (unavailableStorage.root.dataset.theme !== "light") throw new Error("storage failure blocked startup");
unavailableStorage.click();
if (unavailableStorage.root.dataset.theme !== "dark") throw new Error("storage failure blocked switching");
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


def test_review_data_template_assets_exist_and_describe_reusable_renderer_contract():
    """Project templates should ship the reusable SpecCompass review data toolchain."""
    for path in (
        FLOW_REVIEW_SCHEMA,
        UI_REVIEW_SCHEMA,
        REVIEW_DATA_VALIDATOR,
        REVIEW_PAGE_RENDERER,
        RENDERER_README,
        REVIEW_DATA_SKILL,
        *REVIEW_RENDERER_STYLE_FILES,
        *REVIEW_RENDERER_SCRIPT_FILES,
    ):
        assert path.exists(), path

    flow_schema = json.loads(FLOW_REVIEW_SCHEMA.read_text(encoding="utf-8"))
    ui_schema = json.loads(UI_REVIEW_SCHEMA.read_text(encoding="utf-8"))
    validator = REVIEW_DATA_VALIDATOR.read_text(encoding="utf-8")
    renderer_entry = REVIEW_PAGE_RENDERER.read_text(encoding="utf-8")
    renderer = _review_renderer_bundle()

    assert flow_schema["properties"]["review_type"]["const"] == "flow"
    assert ui_schema["properties"]["review_type"]["const"] == "ui"
    assert "review_goal" in flow_schema["properties"]["project"]["required"]
    assert flow_schema["properties"]["project"]["properties"]["business_overview"]["minLength"] == 18
    assert flow_schema["properties"]["project"]["properties"]["review_goal"]["minLength"] == 18
    def must_confirm_options(schema: dict) -> dict:
        branch = next(
            item
            for item in schema["$defs"]["node"]["allOf"]
            if item.get("if", {}).get("properties", {}).get("review_level")
            == {"const": "must_confirm"}
        )
        return branch["then"]["properties"]["options"]

    flow_node_options = must_confirm_options(flow_schema)
    ui_node_options = must_confirm_options(ui_schema)
    assert flow_node_options["minItems"] == 2
    assert ui_node_options["minItems"] == 3
    for schema, label in ((flow_schema, "flow"), (ui_schema, "ui")):
        properties = json.dumps(schema, ensure_ascii=False)
        assert schema["properties"]["schema_version"] == {"type": "integer", "enum": [1, 2]}, label
        assert schema["additionalProperties"] is False, label
        assert schema["properties"]["project"]["additionalProperties"] is False, label
        assert schema["properties"]["source_snapshot"]["items"]["additionalProperties"] is False, label
        assert schema["$defs"]["module"]["additionalProperties"] is False, label
        assert schema["$defs"]["review_item"]["additionalProperties"] is False, label
        assert schema["$defs"]["node"]["additionalProperties"] is False, label
        assert schema["$defs"]["option"]["additionalProperties"] is False, label
        assert schema["$defs"]["edge"]["additionalProperties"] is False, label
        assert "OPTION_B.next_exit must start with 'needs-decision'" in properties, label
        assert '"maxItems": 2' in properties and '"options_count_rationale"' in properties, label
        for token in (
            "batch_id",
            "confirm_strategy",
            "project",
            "modules",
            "review_level",
            "recommended_option",
            "decision_background",
            "decision_summary",
            "benefit",
            "cost",
            "recommendation_reason",
            "consequence",
            "next_exit",
            "human_judgment",
            "must_confirm",
            "system_arch",
        ):
            assert token in properties, (label, token)
        option_required = schema["$defs"]["option"]["required"]
        assert "benefit" in option_required, label
        assert "cost" in option_required, label
        assert "consequence" in option_required, label
        assert "options_count_rationale" in schema["$defs"]["node"]["properties"], label

    for token in (
        "allowedReviewLevels",
        "allowedNodeKinds",
        "allowedFlowItemTypes",
        "allowedUiItemTypes",
        "duplicate node id",
        "recommended_option",
        "decision_background",
        "decision_summary",
        "benefit",
        "cost",
        "recommendation_reason",
        "consequence",
        "must_confirm nodes require 3-4 options",
        "ordinary human-judgment nodes default to 3 options",
        "options_count_rationale",
        "label is too generic; name the real business action",
        "boilerplate option copy",
        "option benefit must name a concrete upside",
        "option cost must name a concrete tradeoff",
        "actionable exit",
        "10+ business nodes",
        "complex_flow_exception",
        "low_risk_linear_exception",
        "OPTION_B",
        "OPTION_B.next_exit must start with needs-decision",
        "needs-decision",
        "APPROVED",
        "REJECTED",
        "对象类型",
        "Top Level Baseline",
        "关联业务",
        "为什么存在",
        "需要判断什么",
        "不需要管什么",
        "审核人要看什么",
        "forbidden review-data key",
        "forbiddenReviewDataValuePatterns",
        "forbidden page code in review-data value",
        "business nodes",
        "node ids must be global within review data",
    ):
        assert token in validator

    assert "SpecCompass" in renderer
    assert "#0ABAB5" in renderer
    assert ':root[data-theme="dark"]' in renderer
    assert "color-scheme: light" in renderer
    assert "color-scheme: dark" in renderer
    assert 'id="theme-toggle"' in renderer_entry
    assert "speccompass-review:display-theme" in renderer
    assert (
        "must not enter a confirmation or discovery response package"
        in RENDERER_README.read_text(encoding="utf-8")
    )
    assert "right-rail" in renderer
    assert renderer_entry.lstrip().lower().startswith("<!doctype html>")
    assert '<html lang="zh-CN">' in renderer_entry
    assert "<body>" in renderer_entry and "</body>" in renderer_entry and "</html>" in renderer_entry
    assert renderer_entry.index("<body>") < renderer_entry.index("</body>") < renderer_entry.index("</html>")
    assert "<style>" not in renderer_entry and "</style>" not in renderer_entry
    assert "type=\"module\"" not in renderer_entry
    for path in REVIEW_RENDERER_STYLE_FILES:
        relative_path = path.relative_to(REVIEW_PAGE_RENDERER.parent).as_posix()
        assert re.search(rf'href="{re.escape(relative_path)}(?:\?[^"]*)?"', renderer_entry)
    theme_script = REVIEW_RENDERER_SCRIPT_FILES[0]
    for path in REVIEW_RENDERER_SCRIPT_FILES:
        relative_path = path.relative_to(REVIEW_PAGE_RENDERER.parent).as_posix()
        if path == theme_script:
            assert re.search(rf'<script src="{re.escape(relative_path)}(?:\?[^"]*)?"></script>', renderer_entry)
            assert renderer_entry.index(relative_path) < renderer_entry.index("styles/tokens.css")
        else:
            assert re.search(rf'defer src="{re.escape(relative_path)}(?:\?[^"]*)?"', renderer_entry)
    assert renderer_entry.count("<script") == len(REVIEW_RENDERER_SCRIPT_FILES)
    assert "localStorage" in renderer
    assert "flow-review-data.json" in renderer
    assert "ui-review-data.json" in renderer
    assert "window.SPECCOMPASS_REVIEW_DATA" not in renderer
    assert "SUPPORTED_SCHEMA_VERSION" in renderer
    assert "draft_excluded_items" in renderer
    assert "decision_records" in renderer
    assert "needs_decision_items" in renderer
    assert "unresolved_decision_items" in renderer
    assert "beforeunload" in renderer
    assert "reviewDataIdentifier" in renderer
    assert "source_snapshot" in renderer
    assert "summaryFingerprint" in renderer
    assert "copied_fingerprint" in renderer
    assert "runtimeValidateReviewData" in renderer
    assert "runtimeErrors" in renderer
    assert "rejectReviewData" in renderer
    assert "重复 node id 会导致本地选择串到其他确认点" in renderer
    for option_field in (
        "decision_background",
        "decision_summary",
        "benefit",
        "cost",
        "recommendation_reason",
        "when_to_choose",
        "consequence",
        "project_impact",
        "next_exit",
    ):
        assert option_field in renderer
    assert "review data 结构存在阻断问题" in renderer
    assert "authorization-steps" in renderer
    assert "review-index.json" in renderer
    assert "../../../specs/review-index.json" in renderer
    assert "URLSearchParams" in renderer
    assert "has_flow_review" in renderer
    assert "has_ui_review" in renderer
    assert "待生成" in renderer
    assert "上一需求" in renderer and "下一需求" in renderer
    assert "需求 0/0" in renderer
    assert 'id="feature-nav"' in renderer
    assert 'id="prev-feature"' in renderer
    assert 'id="feature-position"' in renderer
    assert 'id="next-feature"' in renderer
    assert 'id="feature-nav-note"' in renderer
    assert "当前页面有本地选择或尚未写回的确认结果" in renderer
    assert 'id="prev-module"' in renderer
    assert 'id="next-module"' in renderer
    assert 'id="module-position"' in renderer
    assert "goToModule" in renderer
    assert "上一业务模块" in renderer and "下一业务模块" in renderer
    assert "业务模块 0/0" in renderer
    assert 'setAttribute("role", "tablist")' in renderer
    assert 'setAttribute("role", "tab")' in renderer
    assert "待处理" in renderer
    assert "diagram-tab-pending" in renderer
    assert "height: 100vh" in renderer
    assert "--right-rail-width" in renderer
    assert "speccompass-review:right-rail-width" in renderer
    assert 'id="right-rail-resizer"' in renderer
    assert 'aria-label="调整右侧确认栏宽度"' in renderer
    assert "right-rail-resizer.js" in renderer_entry
    assert "pointerdown" in renderer
    assert "pointermove" in renderer
    assert "col-resize" in renderer
    assert ".right-rail .option-detail-value" in renderer
    assert "font-size: 13px" in renderer
    assert ".right-rail .option-detail-label" in renderer
    assert "font-size: 12px" in renderer
    assert "本地选择" in renderer and "本地写回" in renderer and "回到 Codex" in renderer
    assert "localStorageAvailable" in renderer
    assert "storageStatusWarning" in renderer
    assert "review_data_id" in renderer
    assert "for hand-edited JSON" in renderer or "数据提示" in renderer
    assert "pendingFocusNodeId" in renderer
    assert "nodeState(node.id).draft_option" in renderer
    assert "button.innerHTML =" not in renderer
    assert "card.innerHTML =" not in renderer
    assert "option.innerHTML =" not in renderer
    assert "innerHTML =" not in renderer
    assert "complex animation" in renderer or "复杂动画" in renderer or "No complex animation" in renderer
    assert "动态效果用文字标注" in renderer or "plain text markers" in renderer
    assert "SpecCompassOverlay" in renderer
    assert "SpecCompassDom" in renderer
    assert "window.SpecCompassDom" in renderer
    assert "window.SpecCompassDom.appendText = appendText" in renderer
    assert "showInfoDialog" in renderer
    assert "speccompass-dialog" in renderer
    assert "returnFocusTo" in renderer
    simple_overlays = (REVIEW_ROOT / "renderer" / "scripts" / "simple-overlays.js").read_text(encoding="utf-8")
    assert "appendText(" not in simple_overlays
    assert "只用于说明和预览" in renderer
    assert "max-height: calc(100vh - 48px)" in renderer
    assert "overflow-y: auto" in renderer
    assert "overflow-wrap: anywhere" in renderer
    assert "dialog.innerHTML" not in renderer
    assert "用于推荐/非推荐选择" not in renderer
    assert "无需人工操作" in renderer
    assert "option recommended" in renderer
    assert "为什么这样建议" in renderer
    assert "ui-component resolved" in renderer
    assert ".ui-component.has-decision:hover" in renderer
    assert ".ui-component.resolved.has-decision:hover" in renderer
    assert ".ui-component.selected.has-decision:hover" in renderer
    assert ".option.recommended" in renderer
    assert ".option.recommended:hover" in renderer
    assert ".option:active" in renderer
    assert "button.primary:hover" in renderer
    assert "isNeedsDecisionExit" in renderer
    assert "startsWith(\"needs-decision\")" in renderer
    assert "saved.option === \"OPTION_B\" && isNeedsDecisionExit(option)" not in renderer
    assert "isNeedsDecisionExit(option)" in renderer
    assert "saved.option === node.recommended_option" in renderer
    assert "requiresNodeDecision(node)" in renderer
    assert "skippedMissingRecommendation" in renderer
    assert "pendingRecommended" in renderer
    assert "建议确认不计入红色待处理必审" in renderer
    assert "当前视图按推荐保存" in renderer
    assert "当前模块按推荐保存" in renderer
    assert "当前需求按推荐保存" in renderer
    assert 'id="bulk-view-recommended"' in renderer
    assert 'id="bulk-module-recommended"' in renderer
    assert 'id="bulk-requirement-recommended"' in renderer
    assert "summarizeRecommendationCompletion" in renderer
    assert "applyRecommendedToMissing" in renderer
    assert "allNodes().map" in renderer
    assert 'runRecommendationCompletion(currentItemNodes(), "当前视图")' in renderer
    assert 'runRecommendationCompletion(currentModuleNodes(), "当前模块")' in renderer
    assert 'runRecommendationCompletion(allNodes().map(({ node }) => node), "当前需求")' in renderer
    assert "if (!saveState())" in renderer
    assert "snapshotReviewState" in renderer
    assert "restoreReviewState" in renderer
    assert "result.previousState" in renderer
    assert "已写入 ${result.target_path}，但浏览器未能记录本地状态" in renderer
    assert "剩余未选项" in renderer
    assert "缺少推荐选项" in renderer
    assert "不会覆盖已有选择或草稿" in renderer
    assert "window.confirm" in renderer
    assert "还有" in renderer and "未完成" in renderer and "是否都按推荐设置进行保存" in renderer

    for content, label in (
        (_command("flow"), "flow command"),
        (_command("ui"), "ui command"),
        (METHODOLOGY_DOC.read_text(encoding="utf-8"), "methodology"),
    ):
        assert 'batch_scope: "<' in content, label

    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")
    for content, label in ((skill, "review-data skill"), (renderer_readme, "renderer README")):
        assert "node.id" in content, label
        assert "globally unique" in content, label
        assert "browser" in content and "state" in content, label
        assert "review data version" in content or "source snapshot" in content, label
        assert "schema_notes" in content and "trace_notes" in content, label
        assert "HTML" in content and "CSS" in content and "JavaScript" in content, label
        assert "SVG" in content, label
        assert "system/architecture support concern" in content, label
        assert "split it into two" in content, label
        assert "product manager's decision" in content or "product reviewer owns" in content, label
        assert "technical owner" in content or "architecture owner" in content or "system or architecture owner" in content, label
        assert "renderer directory" in content or "renderer 目录" in content or "多文件固定基础设施" in content, label
        assert "only write" in content or "只填" in content, label
        assert "flow-review-data.json" in content and "ui-review-data.json" in content, label

    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    for content, label in ((methodology, "methodology"), (renderer_readme, "renderer README")):
        assert "native `<dialog>`" in content, label
        assert "only for explanation or preview" in content or "只用于说明或预览" in content, label
        assert "must not carry recommendation choices" in content or "不得承载推荐/非推荐选择" in content or "不承载选择" in content, label

    assert "style\\s*=" in validator
    assert "data\\s*:\\s*text\\/html" in validator
    assert "img" in validator and "table" in validator

    assert "clipboard call fails" in renderer_readme
    assert "not authorization" in renderer_readme
    assert "must still run `validate-review-data.mjs`" in renderer_readme
    assert "native `<dialog>`" in renderer_readme
    assert "説明" not in renderer_readme
    assert "`当前需求按推荐保存` covers every module and item" in renderer_readme
    assert "only `MISSING`" in renderer_readme
    assert re.search(r"without a valid recommendation\s+remain", renderer_readme)
    assert "only for explanation or preview" in renderer_readme or "只用于说明或预览" in renderer_readme
    assert "must not carry recommendation choices" in renderer_readme or "不得承载推荐/非推荐选择" in renderer_readme


def test_review_index_v2_validates_explicit_lineage_and_outline_projection(tmp_path: Path):
    """Feature codes never imply hierarchy; the explicit SP lineage must be coherent."""
    valid_index = {
        "schema_version": 2,
        "project": "demo",
        "updated_at": "2026-07-27",
        "hierarchy": {"mode": "explicit", "root_feature": "000-product-root"},
        "features": [
            {
                "order": 1,
                "feature_code": "000",
                "feature": "000-product-root",
                "title": "Product root",
                "parent_feature": None,
                "sibling_order": 0,
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Portfolio root."},
                "outline_alignment": {"status": "not_mapped", "outline_node_refs": [], "rationale": "Owns the top Outline."},
                "has_flow_review": False,
                "has_ui_review": False,
                "has_outline_review": False,
                "has_outline_discovery": True,
            },
            {
                "order": 2,
                "feature_code": "001",
                "feature": "001-first-child",
                "title": "First child",
                "parent_feature": "000-product-root",
                "sibling_order": 1,
                "boundary_source": {
                    "kind": "subproject_handoff",
                    "handoff_ref": "specs/000-product-root/prd.md#HANDOFF-001",
                    "rationale": "Confirmed SP delivery boundary.",
                },
                "outline_alignment": {
                    "status": "one_to_one",
                    "outline_node_refs": ["specs/000-product-root/prd/review/outline-discovery-data.json#NODE-001"],
                    "rationale": "The confirmed child matches one proposal node.",
                },
                "has_flow_review": True,
                "has_ui_review": True,
                "has_outline_review": True,
                "has_outline_discovery": False,
            },
        ],
    }

    def validate(data: dict) -> subprocess.CompletedProcess[str]:
        index_path = tmp_path / "review-index.json"
        index_path.write_text(json.dumps(data), encoding="utf-8")
        return subprocess.run(
            ["node", str(REVIEW_INDEX_VALIDATOR), str(index_path)],
            cwd=tmp_path,
            text=True,
            capture_output=True,
            check=False,
        )

    result = validate(valid_index)
    assert result.returncode == 0, result.stderr
    assert "hierarchy=explicit" in result.stdout

    missing_parent = json.loads(json.dumps(valid_index))
    missing_parent["features"][1]["parent_feature"] = "000-missing-root"
    result = validate(missing_parent)
    assert result.returncode != 0
    assert "missing parent_feature" in result.stderr

    inferred_only = json.loads(json.dumps(valid_index))
    inferred_only["features"][1]["parent_feature"] = None
    inferred_only["features"][1]["sibling_order"] = 0
    inferred_only["features"][1]["boundary_source"] = {
        "kind": "standalone",
        "handoff_ref": None,
        "rationale": "Number only.",
    }
    result = validate(inferred_only)
    assert result.returncode != 0
    assert "confirmed subproject_handoff" in result.stderr

    duplicate_sibling = json.loads(json.dumps(valid_index))
    duplicate_sibling["features"].append({
        **json.loads(json.dumps(valid_index["features"][1])),
        "order": 3,
        "feature_code": "002",
        "feature": "002-second-child",
        "outline_alignment": {
            "status": "one_to_one",
            "outline_node_refs": ["specs/000-product-root/prd/review/outline-discovery-data.json#NODE-002"],
            "rationale": "Second proposal node.",
        },
    })
    result = validate(duplicate_sibling)
    assert result.returncode != 0
    assert "sibling_order 1 is duplicated" in result.stderr

    invalid_split = json.loads(json.dumps(valid_index))
    invalid_split["features"][1]["outline_alignment"]["status"] = "split"
    result = validate(invalid_split)
    assert result.returncode != 0
    assert "marked split but maps to only one feature" in result.stderr

    invalid_merged = json.loads(json.dumps(valid_index))
    invalid_merged["features"][1]["outline_alignment"]["status"] = "merged"
    result = validate(invalid_merged)
    assert result.returncode != 0
    assert "merged alignment requires at least two outline refs" in result.stderr

    duplicate_one_to_one = json.loads(json.dumps(valid_index))
    duplicate_one_to_one["features"].append({
        **json.loads(json.dumps(valid_index["features"][1])),
        "order": 3,
        "feature_code": "002",
        "feature": "002-second-child",
        "sibling_order": 2,
    })
    result = validate(duplicate_one_to_one)
    assert result.returncode != 0
    assert "cannot be one_to_one because it maps to multiple features" in result.stderr

    valid_split = json.loads(json.dumps(duplicate_one_to_one))
    valid_split["features"][1]["outline_alignment"]["status"] = "split"
    valid_split["features"][2]["outline_alignment"]["status"] = "split"
    result = validate(valid_split)
    assert result.returncode == 0, result.stderr


def test_review_index_v1_migration_is_deterministic_and_fail_closed(tmp_path: Path):
    """Legacy flat indexes migrate mechanically without inventing hierarchy."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review-index migration tests")

    legacy = {
        "schema_version": 1,
        "project": "legacy-demo",
        "updated_at": "2026-07-27",
        "features": [
            {
                "order": 2,
                "feature": "20260727-123456-second",
                "title": "Second",
                "has_flow_review": False,
                "has_ui_review": True,
                "has_outline_review": False,
                "has_outline_discovery": False,
            },
            {
                "order": 1,
                "feature": "001-first",
                "title": "First",
                "has_flow_review": True,
                "has_ui_review": False,
                "has_outline_review": True,
                "has_outline_discovery": True,
            },
        ],
    }
    index_path = tmp_path / "review-index.json"
    source = json.dumps(legacy, ensure_ascii=False, indent=2) + "\n"
    index_path.write_text(source, encoding="utf-8")
    index_path.chmod(0o640)

    result = subprocess.run(
        ["node", str(REVIEW_INDEX_MIGRATOR), str(index_path)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    migrated = json.loads(index_path.read_text(encoding="utf-8"))
    assert migrated["schema_version"] == 2
    assert migrated["hierarchy"] == {"mode": "flat", "root_feature": None}
    assert [entry["feature_code"] for entry in migrated["features"]] == ["20260727-123456", "001"]
    assert all(entry["parent_feature"] is None for entry in migrated["features"])
    assert all(entry["sibling_order"] == 0 for entry in migrated["features"])
    assert all(entry["boundary_source"]["kind"] == "standalone" for entry in migrated["features"])
    assert all(entry["outline_alignment"]["status"] == "not_mapped" for entry in migrated["features"])
    assert (tmp_path / "review-index.json.v1.backup.json").read_text(encoding="utf-8") == source
    if os.name != "nt":
        assert index_path.stat().st_mode & 0o777 == 0o640

    validation = subprocess.run(
        ["node", str(REVIEW_INDEX_VALIDATOR), str(index_path)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert validation.returncode == 0, validation.stderr
    migrated_source = index_path.read_text(encoding="utf-8")
    second_run = subprocess.run(
        ["node", str(REVIEW_INDEX_MIGRATOR), str(index_path)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert second_run.returncode == 0
    assert "already uses schema v2" in second_run.stdout
    assert index_path.read_text(encoding="utf-8") == migrated_source

    invalid_path = tmp_path / "invalid-review-index.json"
    invalid_legacy = json.loads(json.dumps(legacy))
    invalid_legacy["features"][0]["feature"] = "missing-code"
    invalid_source = json.dumps(invalid_legacy, indent=2) + "\n"
    invalid_path.write_text(invalid_source, encoding="utf-8")
    rejected = subprocess.run(
        ["node", str(REVIEW_INDEX_MIGRATOR), str(invalid_path)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert rejected.returncode != 0
    assert "will not invent one" in rejected.stderr
    assert invalid_path.read_text(encoding="utf-8") == invalid_source
    assert not (tmp_path / "invalid-review-index.json.v1.backup.json").exists()


def test_review_index_validator_rejects_additional_properties_at_every_object_level(tmp_path: Path):
    """The hand-written validator must enforce the same closed objects as the JSON schema."""
    valid = {
        "schema_version": 2,
        "project": "Demo",
        "updated_at": "2026-07-27",
        "hierarchy": {"mode": "explicit", "root_feature": "000-root"},
        "features": [
            {
                "order": 1,
                "feature_code": "000",
                "feature": "000-root",
                "title": "Root",
                "parent_feature": None,
                "sibling_order": 0,
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Root."},
                "outline_alignment": {"status": "one_to_one", "outline_node_refs": ["boundary-000"], "rationale": "Aligned."},
                "has_flow_review": False,
                "has_ui_review": False,
                "has_outline_review": True,
                "has_outline_discovery": False,
            }
        ],
    }

    def validate(data: dict) -> subprocess.CompletedProcess[str]:
        path = tmp_path / "review-index.json"
        path.write_text(json.dumps(data), encoding="utf-8")
        return subprocess.run(["node", str(REVIEW_INDEX_VALIDATOR), str(path)], text=True, capture_output=True, check=False)

    for mutate, label in (
        (lambda data: data.update({"unexpected": True}), "review-index"),
        (lambda data: data["hierarchy"].update({"unexpected": True}), "hierarchy"),
        (lambda data: data["features"][0].update({"unexpected": True}), "features[0]"),
        (lambda data: data["features"][0]["boundary_source"].update({"unexpected": True}), "boundary_source"),
        (lambda data: data["features"][0]["outline_alignment"].update({"unexpected": True}), "outline_alignment"),
    ):
        candidate = json.loads(json.dumps(valid))
        mutate(candidate)
        result = validate(candidate)
        assert result.returncode != 0, label
        assert "unsupported fields" in result.stderr, label


def test_outline_boundaries_contract_validates_digest_state_and_closed_fields(tmp_path: Path):
    document = _aligned_boundaries_document()
    path = tmp_path / "outline-boundaries.json"

    def validate(data: dict) -> subprocess.CompletedProcess[str]:
        path.write_text(json.dumps(data), encoding="utf-8")
        return subprocess.run(["node", str(OUTLINE_BOUNDARIES_VALIDATOR), str(path)], text=True, capture_output=True, check=False)

    result = validate(document)
    assert result.returncode == 0, result.stderr
    assert "state=ALIGNED" in result.stdout

    bad_digest = json.loads(json.dumps(document))
    bad_digest["current_baseline"]["project_boundaries"][1]["title"] = "Changed without digest"
    result = validate(bad_digest)
    assert result.returncode != 0
    assert "baseline_digest does not match" in result.stderr

    event_as_state = json.loads(json.dumps(document))
    event_as_state["transition_state"] = "ALIGNED_NEW_BASELINE"
    result = validate(event_as_state)
    assert result.returncode != 0
    assert "event, not a state" in result.stderr

    unexpected = json.loads(json.dumps(document))
    unexpected["current_baseline"]["project_boundaries"][0]["unexpected"] = True
    result = validate(unexpected)
    assert result.returncode != 0
    assert "unsupported fields" in result.stderr

    non_portfolio_root = json.loads(json.dumps(document))
    non_portfolio_root["current_baseline"]["project_boundaries"][0]["feature_code"] = "999"
    non_portfolio_root["current_baseline"]["project_boundaries"][1]["parent_feature_code"] = "999"
    non_portfolio_root["current_baseline"]["baseline_digest"] = _contract_digest(
        non_portfolio_root["current_baseline"], "baseline_digest"
    )
    result = validate(non_portfolio_root)
    assert result.returncode != 0
    assert "root_feature must use feature_code 000" in result.stderr

    unsafe_ref = json.loads(json.dumps(document))
    unsafe_ref["current_baseline"]["decision_ref"] = "C:\\outside\\decision.md"
    unsafe_ref["current_baseline"]["baseline_digest"] = _contract_digest(
        unsafe_ref["current_baseline"], "baseline_digest"
    )
    result = validate(unsafe_ref)
    assert result.returncode != 0
    assert "decision_ref is unsafe" in result.stderr

    duplicate_refs = _transitioning_boundaries_document()
    duplicate_refs["transition"]["artifact_reassignments"] = [
        {
            "artifact_type": "spec",
            "artifact_ref": ref,
            "disposition": "shared",
            "target_feature_code": None,
            "reason": "Test normalized duplicate rejection.",
        }
        for ref in ("specs/001-child/spec.md", "SPECS/001-CHILD/SPEC.MD")
    ]
    result = validate(duplicate_refs)
    assert result.returncode != 0
    assert "duplicates another reassignment after path normalization" in result.stderr

    stale_evidence = _transitioning_boundaries_document()
    stale_evidence["transition"]["impact_assessments"] = [
        {
            "artifact_type": "flow",
            "artifact_ref": "specs/001-child/flows/main.md",
            "outcome": "UNCHANGED_WITH_EVIDENCE",
            "evidence": [
                {
                    "evidence_type": "hash_match",
                    "ref": "specs/001-child/flows/main.md",
                    "source_digest": "0" * 64,
                    "verified_at": "2026-07-27T10:59:59.000Z",
                    "verifier": "test-suite",
                    "result": "matched",
                }
            ],
        }
    ]
    result = validate(stale_evidence)
    assert result.returncode != 0
    assert "predates the proposed baseline" in result.stderr


def test_review_index_is_derived_from_aligned_outline_boundaries(tmp_path: Path):
    boundaries_path = tmp_path / "outline-boundaries.json"
    index_path = tmp_path / "review-index.json"
    boundaries_path.write_text(json.dumps(_aligned_boundaries_document()), encoding="utf-8")
    index_path.write_text(
        json.dumps(
            {
                "schema_version": 2,
                "project": "Old title",
                "updated_at": "2026-07-26",
                "hierarchy": {"mode": "flat", "root_feature": None},
                "features": [
                    {
                        "order": 9,
                        "feature_code": "001",
                        "feature": "001-child",
                        "title": "Old child",
                        "parent_feature": None,
                        "sibling_order": 0,
                        "boundary_source": {"kind": "standalone", "handoff_ref": None, "rationale": "Old."},
                        "outline_alignment": {"status": "not_mapped", "outline_node_refs": [], "rationale": "Old."},
                        "has_flow_review": True,
                        "has_ui_review": False,
                        "has_outline_review": False,
                        "has_outline_discovery": True,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    index_path.chmod(0o640)

    result = subprocess.run(
        ["node", str(OUTLINE_BOUNDARIES_SYNC), str(boundaries_path), str(index_path)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    synced = json.loads(index_path.read_text(encoding="utf-8"))
    assert synced["project"] == "Root"
    assert synced["hierarchy"] == {"mode": "explicit", "root_feature": "000-root"}
    assert [entry["feature_code"] for entry in synced["features"]] == ["000", "001"]
    assert synced["features"][1]["parent_feature"] == "000-root"
    assert synced["features"][1]["has_flow_review"] is True
    assert synced["features"][1]["has_outline_discovery"] is True
    assert synced["features"][0]["has_flow_review"] is False
    if os.name != "nt":
        assert index_path.stat().st_mode & 0o777 == 0o640

    check = subprocess.run(
        ["node", str(OUTLINE_BOUNDARIES_SYNC), str(boundaries_path), str(index_path), "--check"],
        text=True,
        capture_output=True,
        check=False,
    )
    assert check.returncode == 0, check.stderr
    synced["features"][1]["parent_feature"] = None
    index_path.write_text(json.dumps(synced), encoding="utf-8")
    rejected = subprocess.run(
        ["node", str(OUTLINE_BOUNDARIES_SYNC), str(boundaries_path), str(index_path), "--check"],
        text=True,
        capture_output=True,
        check=False,
    )
    assert rejected.returncode != 0
    assert "do not match outline-boundaries" in rejected.stderr


def test_review_index_rejects_flow_or_ui_review_on_portfolio_root(tmp_path: Path):
    index = {
        "schema_version": 2,
        "project": "Root",
        "updated_at": "2026-07-27",
        "hierarchy": {"mode": "explicit", "root_feature": "000-root"},
        "features": [
            {
                "order": 1,
                "feature_code": "000",
                "feature": "000-root",
                "title": "Root",
                "parent_feature": None,
                "sibling_order": 0,
                "boundary_source": {"kind": "root", "handoff_ref": None, "rationale": "Root."},
                "outline_alignment": {"status": "one_to_one", "outline_node_refs": ["boundary-000"], "rationale": "Aligned."},
                "has_flow_review": True,
                "has_ui_review": False,
                "has_outline_review": True,
                "has_outline_discovery": False,
            },
            {
                "order": 2,
                "feature_code": "001",
                "feature": "001-child",
                "title": "Child",
                "parent_feature": "000-root",
                "sibling_order": 1,
                "boundary_source": {"kind": "subproject_handoff", "handoff_ref": "specs/000-root/prd.md#handoff-001", "rationale": "Child."},
                "outline_alignment": {"status": "one_to_one", "outline_node_refs": ["boundary-001"], "rationale": "Aligned."},
                "has_flow_review": False,
                "has_ui_review": False,
                "has_outline_review": False,
                "has_outline_discovery": False,
            },
        ],
    }
    index_path = tmp_path / "review-index.json"
    index_path.write_text(json.dumps(index), encoding="utf-8")
    result = subprocess.run(["node", str(REVIEW_INDEX_VALIDATOR), str(index_path)], text=True, capture_output=True, check=False)
    assert result.returncode != 0
    assert "portfolio-only" in result.stderr


def test_legacy_boundary_bootstrap_produces_non_authoritative_candidate(tmp_path: Path):
    specs = tmp_path / "specs"
    specs.mkdir()
    for feature in ("000-root", "001-child"):
        (specs / feature).mkdir()
    index_path = specs / "review-index.json"
    output_path = specs / "outline-boundaries-adoption.json"
    index_path.write_text(
        json.dumps(
            {
                "schema_version": 2,
                "project": "Legacy",
                "updated_at": "2026-07-27",
                "hierarchy": {"mode": "flat", "root_feature": None},
                "features": [
                    {
                        "order": order,
                        "feature_code": code,
                        "feature": feature,
                        "title": title,
                        "parent_feature": None,
                        "sibling_order": 0,
                        "boundary_source": {"kind": "standalone", "handoff_ref": None, "rationale": "Legacy."},
                        "outline_alignment": {"status": "not_mapped", "outline_node_refs": [], "rationale": "Legacy."},
                        "has_flow_review": False,
                        "has_ui_review": False,
                        "has_outline_review": False,
                        "has_outline_discovery": False,
                    }
                    for order, code, feature, title in (
                        (1, "000", "000-root", "Root"),
                        (2, "001", "001-child", "Child"),
                    )
                ],
            }
        ),
        encoding="utf-8",
    )
    result = subprocess.run(
        ["node", str(OUTLINE_BOUNDARIES_BOOTSTRAP), str(index_path), str(output_path), "--root", "000-root"],
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    candidate = json.loads(output_path.read_text(encoding="utf-8"))
    assert candidate["status"] == "NEEDS_HUMAN_CONFIRMATION"
    assert candidate["root_feature"] == "000-root"
    assert {issue["code"] for issue in candidate["issues"]} == {"parent_unconfirmed", "outline_alignment_unconfirmed"}
    assert all(item["source_status"] == "unmapped" for item in candidate["candidates"])


def _run_transition_lock(boundaries_path: Path, action: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(OUTLINE_TRANSITION_LOCK), action, str(boundaries_path)],
        text=True, capture_output=True, check=False,
    )


def test_outline_transition_lock_enforces_ownership_and_lease_recovery(tmp_path: Path):
    boundaries_path = tmp_path / "outline-boundaries.json"
    boundaries_path.write_text(json.dumps(_transitioning_boundaries_document()), encoding="utf-8")
    lock_path = tmp_path / ".outline-boundaries.json.transition.lock"

    module_uri = (REVIEW_ROOT / "scripts" / "outline-transition-lock-lib.mjs").as_uri()
    exercised = subprocess.run(
        [
            "node", "--input-type=module", "--eval",
            (
                f'import {{ acquireTransitionCommandLock, heartbeatTransitionCommandLock, '
                f'releaseTransitionCommandLock }} from "{module_uri}"; '
                f'const lock = await acquireTransitionCommandLock({json.dumps(str(boundaries_path))}); '
                'const renewed = await heartbeatTransitionCommandLock(lock); '
                'console.log(JSON.stringify({owner_id: lock.ownerId, renewed_owner: renewed.owner_id})); '
                'await releaseTransitionCommandLock(lock);'
            ),
        ],
        text=True, capture_output=True, check=False,
    )
    assert exercised.returncode == 0, exercised.stderr
    result = json.loads(exercised.stdout)
    assert result["owner_id"] == result["renewed_owner"]
    assert not lock_path.exists()
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition"]["lock"] is None

    owner = "expired-owner"
    renewed = {
        "owner_id": owner,
        "transition_id": "transition-002",
        "transition_revision": 1,
        "baseline_digest": json.loads(boundaries_path.read_text(encoding="utf-8"))["current_baseline"]["baseline_digest"],
        "pid": 999999,
        "created_at": "2000-01-01T00:00:00.000Z",
        "heartbeat_at": "2000-01-01T00:00:00.000Z",
        "lease_expires_at": "2000-01-01T00:05:00.000Z",
        "lease_seconds": 300,
        "heartbeat_seconds": 30,
    }

    lock_path.write_text(json.dumps(renewed), encoding="utf-8")
    document = json.loads(boundaries_path.read_text(encoding="utf-8"))
    document["transition"]["lock"] = renewed
    boundaries_path.write_text(json.dumps(document), encoding="utf-8")

    recovered = _run_transition_lock(boundaries_path, "recover")
    assert recovered.returncode == 0, recovered.stderr
    assert "released the maintenance command lock" in recovered.stdout
    assert not lock_path.exists()
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition"]["lock"] is None
    assert not (tmp_path / ".outline-boundaries.json.transition.lock.recovery").exists()


def test_outline_baseline_activation_uses_last_commit_point_and_is_retryable(tmp_path: Path):
    boundaries_path, index_path, journal_path = _start_outline_transition(tmp_path)
    inventory_path, report_path = _validate_unchanged_outline_transition(
        tmp_path, boundaries_path, journal_path
    )
    root = boundaries_path.parent
    transition_id = json.loads(boundaries_path.read_text(encoding="utf-8"))["transition"]["transition_id"]

    command = [
        "node",
        str(OUTLINE_BASELINE_ACTIVATOR),
        str(boundaries_path),
        str(index_path),
        str(journal_path),
        "--inventory",
        str(inventory_path),
        "--report",
        str(report_path),
    ]
    failed = subprocess.run(
        command,
        text=True,
        capture_output=True,
        check=False,
        env={**os.environ, "SPECCOMPASS_FAULT_AFTER_INDEX_SYNC": "1"},
    )
    assert failed.returncode != 0
    assert "Injected failure" in failed.stderr
    before_commit = json.loads(boundaries_path.read_text(encoding="utf-8"))
    assert before_commit["transition_state"] == "CROSS_ARTIFACT_VALIDATED"
    assert before_commit["current_baseline"]["baseline_id"] == "baseline-001"
    assert before_commit["proposed_baseline"]["baseline_id"] == "baseline-002"
    staged_path = root / f".outline-boundaries.json.{transition_id}.staged.json"
    assert staged_path.exists()
    assert not (root / ".outline-boundaries.json.transition.lock").exists()

    committed_not_finalized = subprocess.run(
        command,
        text=True,
        capture_output=True,
        check=False,
        env={**os.environ, "SPECCOMPASS_FAULT_AFTER_BOUNDARY_COMMIT": "1"},
    )
    assert committed_not_finalized.returncode != 0
    assert "after the authoritative commit point" in committed_not_finalized.stderr
    committed = json.loads(boundaries_path.read_text(encoding="utf-8"))
    assert committed["transition_state"] == "ALIGNED"
    assert any(
        json.loads(line)["event_type"] == "BASELINE_ACTIVATION_PREPARED"
        for line in journal_path.read_text(encoding="utf-8").splitlines()
    )
    assert not (root / ".outline-boundaries.json.transition.lock").exists()

    succeeded = subprocess.run(command, text=True, capture_output=True, check=False)
    assert succeeded.returncode == 0, succeeded.stderr
    assert "Finalized committed" in succeeded.stdout
    activated = json.loads(boundaries_path.read_text(encoding="utf-8"))
    assert activated["transition_state"] == "ALIGNED"
    assert activated["current_baseline"]["baseline_id"] == "baseline-002"
    assert activated["current_baseline"]["project_boundaries"][1]["boundary_source"]["rationale"] == (
        "Reviewed child responsibility remains explicit."
    )
    assert activated["proposed_baseline"] is None
    assert activated["transition"] is None
    validation = subprocess.run(
        ["node", str(OUTLINE_BOUNDARIES_VALIDATOR), str(boundaries_path)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert validation.returncode == 0, validation.stderr
    synced = json.loads(index_path.read_text(encoding="utf-8"))
    assert [feature["feature_code"] for feature in synced["features"]] == ["000", "001"]
    assert synced["features"][1]["title"] == "Child"
    events = [json.loads(line) for line in journal_path.read_text(encoding="utf-8").splitlines()]
    assert [event["event_type"] for event in events][-2:] == ["BASELINE_ACTIVATION_PREPARED", "ALIGNED_NEW_BASELINE"]
    assert not staged_path.exists()
    assert not (root / ".outline-boundaries.json.transition.lock").exists()


def test_outline_boundary_gate_returns_one_shared_machine_contract(tmp_path: Path):
    root = tmp_path / "specs" / "000-root"
    root.mkdir(parents=True)
    boundaries_path = root / "outline-boundaries.json"
    index_path = tmp_path / "specs" / "review-index.json"
    boundaries_path.write_text(json.dumps(_aligned_boundaries_document()), encoding="utf-8")
    synced = subprocess.run(
        ["node", str(OUTLINE_BOUNDARIES_SYNC), str(boundaries_path), str(index_path)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert synced.returncode == 0, synced.stderr

    base_command = ["node", str(OUTLINE_BOUNDARY_GATE), str(boundaries_path), str(index_path)]
    command = [*base_command, "--feature", "001-child", "--stage", "specify"]
    allowed = subprocess.run(command, text=True, capture_output=True, check=False)
    assert allowed.returncode == 0, allowed.stderr
    payload = json.loads(allowed.stdout)
    assert payload["schema"] == "speccompass.outline-boundary-gate.v1"
    assert payload["allowed"] is True
    assert payload["current_baseline_id"] == "baseline-001"
    without_feature = subprocess.run(base_command, text=True, capture_output=True, check=False)
    assert without_feature.returncode == 0, without_feature.stderr
    assert json.loads(without_feature.stdout)["feature"] is None

    without_stage = subprocess.run(
        [*base_command, "--feature", "001-child"],
        text=True,
        capture_output=True,
        check=False,
    )
    assert without_stage.returncode == 2
    assert "--stage" in without_stage.stderr

    recovery_claim = root / ".outline-boundaries.json.start.lock.recovery"
    recovery_claim.write_text("{}", encoding="utf-8")
    recovering = subprocess.run(command, text=True, capture_output=True, check=False)
    assert recovering.returncode == 1
    recovery_payload = json.loads(recovering.stdout)
    assert recovery_payload["block_reason"] == "OUTLINE_BOUNDARY_COMMAND_ACTIVE"
    assert str(recovery_claim.resolve()) in recovery_payload["evidence_refs"]
    recovery_claim.unlink()

    index = json.loads(index_path.read_text(encoding="utf-8"))
    index["features"][1]["title"] = "Drifted"
    index_path.write_text(json.dumps(index), encoding="utf-8")
    mismatched = subprocess.run(command, text=True, capture_output=True, check=False)
    assert mismatched.returncode == 1
    mismatch_payload = json.loads(mismatched.stdout)
    assert mismatch_payload["block_reason"] == "DERIVED_REVIEW_INDEX_MISMATCH"
    assert mismatch_payload["repair_command_exec"].startswith("node .specify/review/scripts/sync-review-index.mjs")

    boundaries_path.write_text(json.dumps(_transitioning_boundaries_document()), encoding="utf-8")
    transitioning = subprocess.run(command, text=True, capture_output=True, check=False)
    assert transitioning.returncode == 1
    transition_payload = json.loads(transitioning.stdout)
    assert transition_payload["transition_state"] == "CROSS_ARTIFACT_VALIDATED"
    assert transition_payload["repair_command_exec"] == "/sp.prd 000-root --resume-outline-transition --transition transition-002"
    transitioning_regeneration = subprocess.run(
        [*command, "--intent", "regenerate"],
        text=True,
        capture_output=True,
        check=False,
    )
    assert transitioning_regeneration.returncode == 1
    assert json.loads(transitioning_regeneration.stdout)["block_reason"] == "OUTLINE_BOUNDARY_TRANSITION_ACTIVE"

    boundaries_path.unlink()
    missing = subprocess.run(command, text=True, capture_output=True, check=False)
    assert missing.returncode == 1
    missing_payload = json.loads(missing.stdout)
    assert missing_payload["block_reason"] == "AUTHORITATIVE_BOUNDARIES_MISSING"
    assert missing_payload["transition_state"] == "LEGACY_ADOPTION_REQUIRED"

    regeneration = subprocess.run(
        [*command, "--intent", "regenerate"],
        text=True,
        capture_output=True,
        check=False,
    )
    assert regeneration.returncode == 0, regeneration.stderr
    regeneration_payload = json.loads(regeneration.stdout)
    assert regeneration_payload["allowed"] is True
    assert regeneration_payload["authority_status"] == "UNREGISTERED"
    assert regeneration_payload["advisories"][0]["blocks_regeneration"] is False


@pytest.mark.parametrize("stage", ("specify", "flow", "ui", "bundle", "plan", "tasks", "analyze", "gate", "implement"))
def test_portfolio_root_is_not_an_implementation_target(tmp_path: Path, stage: str):
    root = tmp_path / "specs" / "000-root"
    root.mkdir(parents=True)
    boundaries_path = root / "outline-boundaries.json"
    index_path = tmp_path / "specs" / "review-index.json"
    boundaries_path.write_text(json.dumps(_aligned_boundaries_document()), encoding="utf-8")
    synced = subprocess.run(
        ["node", str(OUTLINE_BOUNDARIES_SYNC), str(boundaries_path), str(index_path)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert synced.returncode == 0, synced.stderr

    result = subprocess.run(
        [
            "node", str(OUTLINE_BOUNDARY_GATE), str(boundaries_path), str(index_path),
            "--feature", "000-root", "--stage", stage,
        ],
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 1, result.stderr
    payload = json.loads(result.stdout)
    assert payload["schema"] == "speccompass.outline-boundary-gate.v1"
    assert payload["allowed"] is False
    assert payload["block_reason"] == "PORTFOLIO_ROOT_NOT_IMPLEMENTATION_TARGET"
    assert payload["feature"] == "000-root"
    assert payload["stage"] == stage
    assert payload["implementation_features"] == ["001-child"]


@pytest.mark.parametrize(
    ("root_directory", "requested_feature"),
    (("000-root", "000-root"), ("legacy-root", "000-root")),
)
def test_unregistered_portfolio_root_is_blocked_before_implementation_advisory(
    tmp_path: Path,
    root_directory: str,
    requested_feature: str,
):
    root = tmp_path / "specs" / root_directory
    root.mkdir(parents=True)
    boundaries_path = root / "outline-boundaries.json"
    index_path = tmp_path / "specs" / "review-index.json"
    result = subprocess.run(
        [
            "node", str(OUTLINE_BOUNDARY_GATE), str(boundaries_path), str(index_path),
            "--feature", requested_feature, "--intent", "regenerate", "--stage", "flow",
        ],
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 1, result.stderr
    assert json.loads(result.stdout)["block_reason"] == "PORTFOLIO_ROOT_NOT_IMPLEMENTATION_TARGET"


def _write_reviewed_outline_adjustment(
    tmp_path: Path,
    boundaries_path: Path,
    proposal: dict,
) -> tuple[Path, Path, Path]:
    proposal_id = proposal["baseline_id"]
    draft = boundaries_path.parent / "boundary-adjustments" / "drafts" / proposal_id
    draft.mkdir(parents=True, exist_ok=True)
    proposal_path = draft / "proposal.json"
    preview_path = draft / "impact-preview.json"
    decision_path = draft / "decision.json"
    proposal = {**proposal, "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
    proposal["decision_ref"] = str(decision_path.relative_to(tmp_path)).replace("\\", "/")
    proposal_path.write_text(json.dumps(proposal), encoding="utf-8")
    prepared = subprocess.run(
        ["node", str(OUTLINE_ADJUSTMENT_PREPARE), str(boundaries_path), str(proposal_path), str(preview_path)],
        cwd=tmp_path, text=True, capture_output=True, check=False,
    )
    assert prepared.returncode == 0, prepared.stderr
    preview = json.loads(preview_path.read_text(encoding="utf-8"))
    recorded_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    receipt_id = hashlib.sha256(f"{preview['proposal_digest']}:{recorded_at}".encode()).hexdigest()
    decision = {
        "schema_version": 1,
        "decision": "CONFIRMED",
        "proposal_id": proposal_id,
        "proposal_digest": preview["proposal_digest"],
        "base_baseline_id": preview["base_baseline_id"],
        "base_baseline_digest": preview["base_baseline_digest"],
        "impact_preview_digest": preview["impact_preview_digest"],
        "initiated_by": "model",
        "change_class": preview["change_class"],
        "affected_feature_codes": preview["affected_feature_codes"],
        "reviewer_note": "Confirmed through the bound local review page.",
        "confirmed_by": {"type": "human", "display_name": "test-reviewer"},
        "source": {
            "kind": "speccompass_loopback_writer",
            "writeback_request_id": f"request-{receipt_id[:12]}",
            "review_session_id": f"session-{proposal_id}",
            "review_data_id": f"review-{proposal_id}",
            "recorded_at": recorded_at,
        },
        "receipt": {"receipt_id": receipt_id, "status": "ISSUED_ONCE"},
        "decision_digest": "",
    }
    decision["decision_digest"] = _contract_digest(decision, "decision_digest")
    decision_path.write_text(json.dumps(decision), encoding="utf-8")
    event = {
        "schema_version": 1,
        "event_type": "HUMAN_DECISION_RECORDED",
        "writeback_request_id": decision["source"]["writeback_request_id"],
        "review_session_id": decision["source"]["review_session_id"],
        "review_data_id": decision["source"]["review_data_id"],
        "proposal_id": proposal_id,
        "proposal_digest": decision["proposal_digest"],
        "base_baseline_id": decision["base_baseline_id"],
        "base_baseline_digest": decision["base_baseline_digest"],
        "impact_preview_digest": decision["impact_preview_digest"],
        "receipt_id": receipt_id,
        "decision": decision["decision"],
        "decision_digest": decision["decision_digest"],
        "recorded_at": recorded_at,
    }
    ledger = boundaries_path.parent / "boundary-adjustments" / "writeback-ledger.jsonl"
    with ledger.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event) + "\n")
    return proposal_path, preview_path, decision_path


def _write_outline_transition_project(tmp_path: Path) -> tuple[Path, Path, Path, Path, Path, Path]:
    specs = tmp_path / "specs"
    root = specs / "000-root"
    child = specs / "001-child"
    (root / "ui").mkdir(parents=True)
    (child / "flows").mkdir(parents=True)
    (root / "prd.md").write_text("# Root PRD\n", encoding="utf-8")
    (root / "ui" / "main.md").write_text("# Root UI\n", encoding="utf-8")
    (child / "spec.md").write_text("# Child Spec\n", encoding="utf-8")
    (child / "flows" / "main.md").write_text("# Child Flow\n", encoding="utf-8")
    boundaries_path = root / "outline-boundaries.json"
    index_path = specs / "review-index.json"
    journal_path = root / "outline-transition.jsonl"
    document = _aligned_boundaries_document()
    boundaries_path.write_text(json.dumps(document), encoding="utf-8")
    synced = subprocess.run(
        ["node", str(OUTLINE_BOUNDARIES_SYNC), str(boundaries_path), str(index_path)],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert synced.returncode == 0, synced.stderr
    proposed_boundaries = json.loads(json.dumps(document["current_baseline"]["project_boundaries"]))
    proposed_boundaries[1]["boundary_source"]["rationale"] = "Reviewed child responsibility remains explicit."
    proposal = {
        "schema_version": 1,
        "base_baseline_id": document["current_baseline"]["baseline_id"],
        "base_baseline_digest": document["current_baseline"]["baseline_digest"],
        "baseline_id": "baseline-002",
        "created_by": "test-suite",
        "change_reason": "Reviewed structural boundary responsibility change.",
        "rollback_ref": "specs/000-root/prd.md#rollback-002",
        "project_boundaries": proposed_boundaries,
        "tombstones": [],
    }
    proposal_path, preview_path, decision_path = _write_reviewed_outline_adjustment(
        tmp_path, boundaries_path, proposal
    )
    return boundaries_path, index_path, journal_path, proposal_path, preview_path, decision_path


def _start_outline_transition(tmp_path: Path) -> tuple[Path, Path, Path]:
    boundaries_path, index_path, journal_path, proposal_path, preview_path, decision_path = _write_outline_transition_project(tmp_path)
    started = subprocess.run(
        [
            "node", str(OUTLINE_TRANSITION_START), str(boundaries_path), str(proposal_path),
            str(preview_path), str(decision_path), str(journal_path),
        ],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert started.returncode == 0, started.stderr
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition_state"] == "OUTLINE_CHANGE_APPROVED"
    return boundaries_path, index_path, journal_path


def _validate_unchanged_outline_transition(
    tmp_path: Path,
    boundaries_path: Path,
    journal_path: Path,
) -> tuple[Path, Path]:
    inventory_path = tmp_path / "activation-inventory.json"
    evidence_path = tmp_path / "activation-evidence.json"
    report_path = tmp_path / "activation-report.json"
    scanned = subprocess.run(
        ["node", str(OUTLINE_TRANSITION_SCAN), str(boundaries_path), str(inventory_path)],
        cwd=tmp_path, text=True, capture_output=True, check=False,
    )
    assert scanned.returncode == 0, scanned.stderr
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    active = json.loads(boundaries_path.read_text(encoding="utf-8"))
    verified_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    evidence = {
        "schema_version": 1,
        "transition_id": active["transition"]["transition_id"],
        "transition_revision": active["transition"]["transition_revision"],
        "proposal_digest": active["proposed_baseline"]["proposal_digest"],
        "inventory_digest": inventory["inventory_digest"],
        "artifact_reassignments": [
            {
                "artifact_type": item["artifact_type"], "artifact_ref": item["artifact_ref"],
                "disposition": "shared", "target_feature_code": None,
                "reason": "Artifact ownership and content remain unchanged.",
            }
            for item in inventory["artifacts"]
        ],
        "impact_assessments": [
            {
                "artifact_type": item["artifact_type"], "artifact_ref": item["artifact_ref"],
                "outcome": "UNCHANGED_WITH_EVIDENCE",
                "evidence": [{
                    "evidence_type": "hash_match", "ref": item["artifact_ref"],
                    "source_digest": item["source_digest"], "verified_at": verified_at,
                    "verifier": "test-suite", "result": "matched",
                }],
            }
            for item in inventory["artifacts"]
        ],
    }
    evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
    validated = subprocess.run(
        [
            "node", str(OUTLINE_TRANSITION_ADVANCE), "validate", str(boundaries_path), str(journal_path),
            "--inventory", str(inventory_path), "--evidence", str(evidence_path),
            "--report", str(report_path),
        ],
        cwd=tmp_path, text=True, capture_output=True, check=False,
    )
    assert validated.returncode == 0, validated.stderr
    return inventory_path, report_path


def test_outline_transition_workflow_scans_advances_and_activates(tmp_path: Path):
    boundaries_path, index_path, journal_path = _start_outline_transition(tmp_path)
    blocked = subprocess.run(
        [
            "node", str(OUTLINE_TRANSITION_ADVANCE), "block", str(boundaries_path), str(journal_path),
            "--reason", "Temporary evidence service outage.",
        ],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert blocked.returncode == 0, blocked.stderr
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition_state"] == "MIGRATION_BLOCKED"
    resumed = subprocess.run(
        ["node", str(OUTLINE_TRANSITION_ADVANCE), "resume", str(boundaries_path), str(journal_path)],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert resumed.returncode == 0, resumed.stderr
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition_state"] == "OUTLINE_CHANGE_APPROVED"

    inventory_path = tmp_path / "inventory.json"
    if os.name != "nt":
        unsafe_link = tmp_path / "specs" / "000-root" / "ui" / "linked.md"
        unsafe_link.symlink_to(tmp_path / "specs" / "000-root" / "prd.md")
        unsafe_scan = subprocess.run(
            ["node", str(OUTLINE_TRANSITION_SCAN), str(boundaries_path), str(inventory_path)],
            cwd=tmp_path,
            text=True,
            capture_output=True,
            check=False,
        )
        assert unsafe_scan.returncode != 0
        assert "Symbolic links are not accepted" in unsafe_scan.stderr
        unsafe_link.unlink()
    scanned = subprocess.run(
        ["node", str(OUTLINE_TRANSITION_SCAN), str(boundaries_path), str(inventory_path)],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert scanned.returncode == 0, scanned.stderr
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    assert {item["artifact_type"] for item in inventory["artifacts"]} >= {"prd", "spec", "flow", "ui"}
    assert len(inventory["artifacts"]) == 4

    active = json.loads(boundaries_path.read_text(encoding="utf-8"))
    verified_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    evidence_path = tmp_path / "evidence.json"
    evidence_path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "transition_id": active["transition"]["transition_id"],
                "transition_revision": active["transition"]["transition_revision"],
                "proposal_digest": active["proposed_baseline"]["proposal_digest"],
                "inventory_digest": inventory["inventory_digest"],
                "artifact_reassignments": [
                    {
                        "artifact_type": item["artifact_type"],
                        "artifact_ref": item["artifact_ref"],
                        "disposition": "shared",
                        "target_feature_code": None,
                        "reason": "The reviewed title adjustment preserves artifact ownership.",
                    }
                    for item in inventory["artifacts"]
                ],
                "impact_assessments": [
                    {
                        "artifact_type": item["artifact_type"],
                        "artifact_ref": item["artifact_ref"],
                        "outcome": "UNCHANGED_WITH_EVIDENCE",
                        "evidence": [
                            {
                                "evidence_type": "hash_match",
                                "ref": item["artifact_ref"],
                                "source_digest": item["source_digest"],
                                "verified_at": verified_at,
                                "verifier": "test-suite",
                                "result": "matched",
                            }
                        ],
                    }
                    for item in inventory["artifacts"]
                ],
            }
        ),
        encoding="utf-8",
    )

    incomplete = json.loads(evidence_path.read_text(encoding="utf-8"))
    incomplete["artifact_reassignments"].pop()
    incomplete_path = tmp_path / "incomplete-evidence.json"
    incomplete_path.write_text(json.dumps(incomplete), encoding="utf-8")
    report_path = tmp_path / "validation-report.json"
    rejected_validation = subprocess.run(
        [
            "node", str(OUTLINE_TRANSITION_ADVANCE), "validate", str(boundaries_path), str(journal_path),
            "--inventory", str(inventory_path), "--evidence", str(incomplete_path),
            "--report", str(report_path),
        ],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert rejected_validation.returncode != 0
    assert "missing 1 inventoried artifact" in rejected_validation.stderr
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition_state"] == "OUTLINE_CHANGE_APPROVED"

    def validate() -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                "node", str(OUTLINE_TRANSITION_ADVANCE), "validate", str(boundaries_path), str(journal_path),
                "--inventory", str(inventory_path), "--evidence", str(evidence_path),
                "--report", str(report_path),
            ],
            cwd=tmp_path,
            text=True,
            capture_output=True,
            check=False,
        )

    child_spec = tmp_path / "specs" / "001-child" / "spec.md"
    original_spec = child_spec.read_text(encoding="utf-8")
    child_spec.write_text("# Changed after inventory\n", encoding="utf-8")
    stale_validation = validate()
    assert stale_validation.returncode != 0
    assert "changed after inventory creation" in stale_validation.stderr
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition_state"] == "OUTLINE_CHANGE_APPROVED"
    child_spec.write_text(original_spec, encoding="utf-8")
    cross = validate()
    assert cross.returncode == 0, cross.stderr
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition_state"] == "CROSS_ARTIFACT_VALIDATED"

    activated = subprocess.run(
        [
            "node", str(OUTLINE_BASELINE_ACTIVATOR), str(boundaries_path), str(index_path), str(journal_path),
            "--inventory", str(inventory_path), "--report", str(report_path),
        ],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert activated.returncode == 0, activated.stderr
    final = json.loads(boundaries_path.read_text(encoding="utf-8"))
    assert final["transition_state"] == "ALIGNED"
    assert final["current_baseline"]["baseline_id"] == "baseline-002"
    event_steps = [json.loads(line)["step"] for line in journal_path.read_text(encoding="utf-8").splitlines()]
    for required_step in (
        "proposal-created", "decision-consumed", "outline-change-approved", "migration-blocked",
        "migration-resumed-for-fresh-validation", "inventory-driven-validation-completed",
        "derived-files-before-commit", "outline-boundaries-commit-point",
    ):
        assert required_step in event_steps


def test_outline_activation_records_stale_base_as_migration_blocked(tmp_path: Path):
    root = tmp_path / "specs" / "000-root"
    root.mkdir(parents=True)
    boundaries_path = root / "outline-boundaries.json"
    index_path = tmp_path / "specs" / "review-index.json"
    journal_path = root / "outline-transition.jsonl"
    boundaries_path.write_text(json.dumps(_transitioning_boundaries_document()), encoding="utf-8")
    document = json.loads(boundaries_path.read_text(encoding="utf-8"))
    document["current_baseline"]["baseline_id"] = "baseline-concurrent"
    document["current_baseline"]["decision_ref"] = "specs/000-root/prd.md#concurrent-baseline"
    document["current_baseline"]["baseline_digest"] = _contract_digest(
        document["current_baseline"], "baseline_digest"
    )
    boundaries_path.write_text(json.dumps(document), encoding="utf-8")
    result = subprocess.run(
        [
            "node", str(OUTLINE_BASELINE_ACTIVATOR), str(boundaries_path), str(index_path), str(journal_path),
            "--inventory", str(tmp_path / "unused-inventory.json"),
            "--report", str(tmp_path / "unused-report.json"),
        ],
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode != 0
    assert "entered MIGRATION_BLOCKED" in result.stderr
    blocked = json.loads(boundaries_path.read_text(encoding="utf-8"))
    assert blocked["transition_state"] == "MIGRATION_BLOCKED"
    assert "cas-conflict" in blocked["transition"]["completed_steps"]
    validation = subprocess.run(
        ["node", str(OUTLINE_BOUNDARIES_VALIDATOR), str(boundaries_path)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert validation.returncode == 0, validation.stderr
    assert json.loads(journal_path.read_text(encoding="utf-8"))["event_type"] == "MIGRATION_BLOCKED"
    lock_path = root / ".outline-boundaries.json.transition.lock"
    expired_lock = {
        "owner_id": "expired-stale-base-owner",
        "transition_id": blocked["transition"]["transition_id"],
        "transition_revision": blocked["transition"]["transition_revision"],
        "baseline_digest": blocked["transition"]["base_baseline_digest"],
        "pid": 999999,
        "created_at": "2000-01-01T00:00:00.000Z",
        "heartbeat_at": "2000-01-01T00:00:00.000Z",
        "lease_expires_at": "2000-01-01T00:05:00.000Z",
        "lease_seconds": 300,
        "heartbeat_seconds": 30,
    }
    lock_path.write_text(json.dumps(expired_lock), encoding="utf-8")
    blocked["transition"]["lock"] = expired_lock
    boundaries_path.write_text(json.dumps(blocked), encoding="utf-8")
    recovered = _run_transition_lock(boundaries_path, "recover")
    assert recovered.returncode == 0, recovered.stderr


def test_outline_transition_start_is_cas_bound_idempotent_and_single_proposal(tmp_path: Path):
    boundaries_path, _, journal_path, proposal_path, preview_path, decision_path = _write_outline_transition_project(tmp_path)
    current = json.loads(boundaries_path.read_text(encoding="utf-8"))["current_baseline"]
    competing_boundaries = json.loads(json.dumps(current["project_boundaries"]))
    competing_boundaries[1]["boundary_source"]["rationale"] = "A different reviewed structural proposal."
    competing_path, competing_preview, competing_decision = _write_reviewed_outline_adjustment(
        tmp_path,
        boundaries_path,
        {
            "schema_version": 1,
            "base_baseline_id": current["baseline_id"],
            "base_baseline_digest": current["baseline_digest"],
            "baseline_id": "baseline-003",
            "created_by": "test-suite",
            "change_reason": "Competing reviewed structural change.",
            "rollback_ref": "specs/000-root/prd.md#rollback-003",
            "project_boundaries": competing_boundaries,
            "tombstones": [],
        },
    )
    command = [
        "node", str(OUTLINE_TRANSITION_START), str(boundaries_path), str(proposal_path),
        str(preview_path), str(decision_path), str(journal_path),
    ]
    first = subprocess.run(command, cwd=tmp_path, text=True, capture_output=True, check=False)
    assert first.returncode == 0, first.stderr
    transition_id = json.loads(first.stdout)["transition_id"]
    second = subprocess.run(command, cwd=tmp_path, text=True, capture_output=True, check=False)
    assert second.returncode == 0, second.stderr
    assert transition_id in second.stdout
    events = [json.loads(line) for line in journal_path.read_text(encoding="utf-8").splitlines()]
    assert len([event for event in events if event["event_type"] == "TRANSITION_STARTED"]) == 1
    assert not (boundaries_path.parent / ".outline-boundaries.json.start.lock").exists()

    rejected = subprocess.run(
        [
            "node", str(OUTLINE_TRANSITION_START), str(boundaries_path), str(competing_path),
            str(competing_preview), str(competing_decision), str(journal_path),
        ],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )
    assert rejected.returncode != 0
    assert "Only one active proposal is allowed" in rejected.stderr
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["proposed_baseline"]["baseline_id"] == "baseline-002"


def test_outline_transition_rollback_requires_proof_and_recovers_after_commit_fault(tmp_path: Path):
    boundaries_path, index_path, journal_path = _start_outline_transition(tmp_path)
    active = json.loads(boundaries_path.read_text(encoding="utf-8"))
    proof_path = tmp_path / "rollback.json"
    proof = {
        "schema_version": 1,
        "transition_id": active["transition"]["transition_id"],
        "transition_revision": active["transition"]["transition_revision"],
        "proposal_digest": active["proposed_baseline"]["proposal_digest"],
        "rollback_ref": active["transition"]["rollback_ref"],
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "staging_disposition": "preserved_isolated",
        "live_writes": ["must-block"],
        "verification_refs": ["specs/000-root/prd.md"],
        "reason": "Withdraw the unactivated proposal.",
    }
    proof_path.write_text(json.dumps(proof), encoding="utf-8")
    command = [
        "node", str(OUTLINE_TRANSITION_ROLLBACK), str(boundaries_path), str(index_path),
        str(journal_path), str(proof_path),
    ]
    rejected = subprocess.run(command, cwd=tmp_path, text=True, capture_output=True, check=False)
    assert rejected.returncode != 0
    assert "reports live writes" in rejected.stderr
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition_state"] == "OUTLINE_CHANGE_APPROVED"

    proof["live_writes"] = []
    proof_path.write_text(json.dumps(proof), encoding="utf-8")
    interrupted = subprocess.run(
        command,
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
        env={**os.environ, "SPECCOMPASS_FAULT_AFTER_ROLLBACK_COMMIT": "1"},
    )
    assert interrupted.returncode != 0
    assert json.loads(boundaries_path.read_text(encoding="utf-8"))["transition_state"] == "ALIGNED"
    assert [json.loads(line)["step"] for line in journal_path.read_text(encoding="utf-8").splitlines()][-1] == "rollback-prepared"

    recovered = subprocess.run(command, cwd=tmp_path, text=True, capture_output=True, check=False)
    assert recovered.returncode == 0, recovered.stderr
    assert "Finalized pre-commit rollback" in recovered.stdout
    assert [json.loads(line)["step"] for line in journal_path.read_text(encoding="utf-8").splitlines()][-1] == "rollback-completed"
    assert not (boundaries_path.parent / ".outline-boundaries.json.transition.lock").exists()


def test_review_renderer_has_no_manual_data_import_controls():
    """The bound launcher URL is the only review-data loading path."""
    entry = REVIEW_PAGE_RENDERER.read_text(encoding="utf-8")
    loader = (REVIEW_ROOT / "renderer" / "scripts" / "data-loader.js").read_text(encoding="utf-8")
    overlays = (REVIEW_ROOT / "renderer" / "scripts" / "simple-overlays.js").read_text(encoding="utf-8")

    for obsolete_id in ("load-flow", "load-ui", "load-outline", "load-outline-discovery", "file-input"):
        assert f'id="{obsolete_id}"' not in entry
        assert f'"{obsolete_id}"' not in loader
    assert "loadDefault" not in loader
    assert "DEFAULT_DATA_FILES" not in overlays
    assert "SPECCOMPASS_REVIEW_DATA" not in overlays
    assert "手动选择 JSON" not in loader
    assert "SPECCOMPASS_REVIEW_URL" in loader


def test_ui_command_flattens_short_analysis_action_categories():
    """Small action sets share one page; tabs remain reserved for real views."""
    ui = _command("ui")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")

    assert "运行分析" in ui and "category tab layer" in ui
    assert "responsive, scannable page region" in ui
    assert "Three analysis types that only start jobs are flat actions" in ui
    assert re.search(r"five filters that\s+share one result table are also flat controls", ui)
    assert re.search(r"persistent chart, table, and export state may use tabs", ui)
    assert "短分类动作直接平铺" in methodology
    assert "5 个共享同一结果表的过滤维度也不使用标签页" in methodology
    assert "few analysis types must expose those types as one responsive" in command_spec
    assert "tabs are reserved for categories" in command_spec


def test_feature_navigation_uses_explicit_tree_order_and_code_path(tmp_path: Path):
    """Renderer navigation must follow parent/sibling order instead of numeric inference."""
    script_path = tmp_path / "feature-nav-contract.cjs"
    script_path.write_text(
        f"""
const fs = require("fs");
const elements = new Map();
function element(id) {{
  if (!elements.has(id)) elements.set(id, {{ id, dataset: {{}}, disabled: false, textContent: "", addEventListener() {{}}, removeAttribute() {{}} }});
  return elements.get(id);
}}
global.window = {{ location: {{ search: "", href: "http://127.0.0.1/review.html" }} }};
global.document = {{ getElementById: element }};
eval(fs.readFileSync({json.dumps(str(REVIEW_ROOT / "renderer" / "scripts" / "feature-nav.js"))}, "utf8"));
const index = {{
  schema_version: 2,
  project: "Demo",
  updated_at: "2026-07-27",
  hierarchy: {{ mode: "explicit", root_feature: "000-root" }},
  features: [
    {{ order: 1, feature_code: "000", feature: "000-root", title: "Root", parent_feature: null, sibling_order: 0,
       boundary_source: {{ kind: "root", handoff_ref: null, rationale: "Root" }},
       outline_alignment: {{ status: "one_to_one", outline_node_refs: ["boundary-000"], rationale: "Aligned" }},
       has_flow_review: false, has_ui_review: false, has_outline_review: true, has_outline_discovery: false }},
    {{ order: 2, feature_code: "001", feature: "001-later", title: "Later", parent_feature: "000-root", sibling_order: 2,
       boundary_source: {{ kind: "subproject_handoff", handoff_ref: "prd.md#001", rationale: "Confirmed" }},
       outline_alignment: {{ status: "one_to_one", outline_node_refs: ["boundary-001"], rationale: "Aligned" }},
       has_flow_review: false, has_ui_review: false, has_outline_review: true, has_outline_discovery: false }},
    {{ order: 3, feature_code: "002", feature: "002-first", title: "First", parent_feature: "000-root", sibling_order: 1,
       boundary_source: {{ kind: "subproject_handoff", handoff_ref: "prd.md#002", rationale: "Confirmed" }},
       outline_alignment: {{ status: "one_to_one", outline_node_refs: ["boundary-002"], rationale: "Aligned" }},
       has_flow_review: false, has_ui_review: false, has_outline_review: true, has_outline_discovery: false }}
  ]
}};
const normalized = window.SpecCompassFeatureNav.normalizeFeatureIndex(index);
const order = normalized.features.map((entry) => entry.feature).join(",");
if (order !== "000-root,002-first,001-later") throw new Error(`wrong tree order: ${{order}}`);
const path = window.SpecCompassFeatureNav.featurePath(normalized.byFeature.get("001-later"), normalized.byFeature);
if (path !== "000 › 001") throw new Error(`wrong code path: ${{path}}`);
index.features[2].sibling_order = 2;
let rejected = false;
try {{ window.SpecCompassFeatureNav.normalizeFeatureIndex(index); }} catch (error) {{ rejected = error.message.includes("重复 sibling_order"); }}
if (!rejected) throw new Error("duplicate sibling order was not rejected");

index.features[2].sibling_order = 1;
const multipleRoots = JSON.parse(JSON.stringify(index));
multipleRoots.features[1].parent_feature = null;
multipleRoots.features[1].sibling_order = 0;
rejected = false;
try {{ window.SpecCompassFeatureNav.normalizeFeatureIndex(multipleRoots); }} catch (error) {{ rejected = error.message.includes("没有继承到根需求") || error.message.includes("Subproject Handoff"); }}
if (!rejected) throw new Error("an undeclared second root was not rejected");

const cycle = JSON.parse(JSON.stringify(index));
cycle.features[1].parent_feature = "002-first";
cycle.features[1].sibling_order = 1;
cycle.features[2].parent_feature = "001-later";
cycle.features[2].sibling_order = 1;
rejected = false;
try {{ window.SpecCompassFeatureNav.normalizeFeatureIndex(cycle); }} catch (error) {{ rejected = error.message.includes("循环"); }}
if (!rejected) throw new Error("a parent cycle was not rejected");

const legacy = window.SpecCompassFeatureNav.normalizeFeatureIndex({{
  schema_version: 1,
  project: "Legacy",
  updated_at: "2026-07-27",
  features: [
    {{ order: 2, feature: "20260727-123456-second", title: "Second", has_flow_review: false, has_ui_review: false, has_outline_review: false, has_outline_discovery: false }},
    {{ order: 1, feature: "001-first", title: "First", has_flow_review: false, has_ui_review: false, has_outline_review: false, has_outline_discovery: false }}
  ]
}});
if (!legacy.isLegacy || legacy.features.map((entry) => entry.feature).join(",") !== "001-first,20260727-123456-second") {{
  throw new Error("schema-v1 flat navigation fallback failed");
}}
if (legacy.features[1].feature_code !== "20260727-123456") throw new Error("legacy timestamp code was truncated");
console.log("feature navigation hierarchy valid");
""",
        encoding="utf-8",
    )
    result = subprocess.run(["node", str(script_path)], text=True, capture_output=True, check=False)
    assert result.returncode == 0, result.stderr
    assert "feature navigation hierarchy valid" in result.stdout


def test_ui_review_data_has_independent_screen_contract():
    """UI review data should describe screens, not reuse flow diagrams with renamed keys."""
    ui_schema = json.loads(UI_REVIEW_SCHEMA.read_text(encoding="utf-8"))
    schema_text = json.dumps(ui_schema, ensure_ascii=False)
    validator = REVIEW_DATA_VALIDATOR.read_text(encoding="utf-8")
    renderer = _review_renderer_bundle()
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    ui_command = _command("ui")

    review_item = ui_schema["$defs"]["review_item"]
    for field in (
        "business_context",
        "primary_users",
        "entry_scenarios",
        "user_goal",
        "user_outcome",
        "flow_refs",
        "screen_layout",
        "screen_regions",
    ):
        assert field in review_item["required"]
    assert "screen_region" in ui_schema["$defs"]
    assert "ui_component" in ui_schema["$defs"]
    assert "ui_component_display" in ui_schema["$defs"]
    assert "ui_state" in ui_schema["$defs"]
    assert "components" in ui_schema["$defs"]["screen_region"]["required"]
    assert "source_ref" in ui_schema["$defs"]["screen_region"]["required"]
    assert {
        "value",
        "placeholder",
        "helper_text",
        "options",
        "columns",
        "rows",
        "button_variant",
        "badge_tone",
    } <= set(ui_schema["$defs"]["ui_component_display"]["properties"])
    assert "dynamic_marker" in schema_text
    assert "future_behavior_note" in schema_text

    for token in (
        "allowedUiLayouts",
        "allowedUiComponentKinds",
        "allowedUiRegionPositions",
        "screen_regions",
        "components",
        "states",
        "dynamic_marker",
        "duplicate component id",
        "validateUiScreenContext",
        "vague UI context copy",
        "generic user wording",
        "UI review data requires screen_regions",
        "UI review data must describe UI screen regions/components; optional states may add screen-state notes, but review nodes alone are not enough",
    ):
        assert token in validator

    for token in (
        "renderUiScreen",
        "ui-screen-preview",
        "ui-region",
        "ui-component",
        "ui-state-note",
        "dynamic marker",
        "功能说明",
        "这个界面为什么存在",
        "业务流程依据（仅用于追溯，不是界面内容）",
    ):
        assert token in renderer

    for content, label in ((skill, "skill"), (methodology, "methodology"), (ui_command, "ui command")):
        assert "UI review data is not flow review data" in content or "UI 审核数据不是 flow 审核数据" in content, label
        assert "screen_regions" in content and "components" in content and "states" in content, label
        assert "screen layout" in content or "屏幕布局" in content, label
        assert "dynamic marker" in content or "动态标注" in content or "纯文本标注" in content, label
        assert "decision options require deeper reasoning" in content or "决策选项需要深度推理" in content, label
        assert "decision_background" in content, label
        assert "decision_summary" in content, label
        for field in (
            "business_context",
            "primary_users",
            "entry_scenarios",
            "user_goal",
            "user_outcome",
            "flow_refs",
        ):
            assert field in content, f"{label} missing {field}"


def _review_validator_sample(review_type: str, *, node_count: int = 3, include_exception: bool = True) -> dict:
    if review_type == "flow":
        artifact = "specs/example/flows/review/flow-review-data.json"
        items_key = "diagrams"
        item_type = "flowchart"
    else:
        artifact = "specs/example/ui/review/ui-review-data.json"
        items_key = "screens"
        item_type = "screen"

    nodes = []
    for index in range(1, node_count + 1):
        node_id = f"N{index}"
        nodes.append(
            {
                "id": node_id,
                "label": f"审核业务信息 {index}",
                "plain_summary": f"请判断第 {index} 个业务环节是否能作为问卷发布门槛；现在不拍板，后续页面、开发和验收都会按猜测推进。",
                "decision_background": f"第 {index} 个发布门槛会决定问卷能不能交给填写人；如果这里含糊，运营可能在目标人群或截止时间没准备好时就发布。",
                "decision_summary": f"现在要拍板第 {index} 个发布门槛按什么规则进入后续流程，避免 UI、任务和验收按模型猜测继续。",
                "review_layer": "business",
                "review_level": "must_confirm" if index == 1 else "verified",
                "owner": "产品经理" if index == 1 else "无需产品确认",
                "node_kind": "human_judgment" if index == 1 else "flow",
                "source_ref": "specs/example/spec.md#business",
                "options": [
                    {
                        "id": "OPTION_A",
                        "label": "按问卷发布检查继续",
                        "benefit": "问卷发布页、开发任务和验收测试可以继续推进，运营也能按标题、目标人群和截止时间三项检查减少误发布。",
                        "cost": "一期要实现发布前校验和缺失提示，开发范围会比直接放行略多。",
                        "consequence": "模型把这些检查写入发布流程，开发团队按这个门槛拆页面和任务。",
                        "recommendation_reason": "这条路能覆盖当前 PRD 已写清的主要风险，比先暂停更快，也比只做最小校验更不容易让运营误发问卷。",
                        "next_exit": "continue",
                        "recommended": True,
                    },
                    {
                        "id": "OPTION_B",
                        "label": "先补齐发布门槛再设计",
                        "benefit": "产品经理能先补清问卷类型、必填信息和例外情况，后续规则更稳，不容易做完再推翻。",
                        "cost": "发布页面和相关开发任务会暂停，问卷发布能力的排期会后移。",
                        "consequence": "该节点下游的发布页面和开发任务先暂停，等待产品经理补充门槛。",
                        "next_exit": "needs-decision",
                    },
                    {
                        "id": "OPTION_C",
                        "label": "只改截止时间边界后继续",
                        "benefit": "主流程不用停，只把截止时间是否必填这类边界补清，UI 和任务仍能按主路径推进。",
                        "cost": "如果后面发现目标人群或发布对象也需要调整，还要再补一轮规则和测试。",
                        "consequence": "模型只调整当前节点的检查项，再交给设计团队和开发团队按主流程推进。",
                        "next_exit": "revise-local-and-continue",
                    },
                ],
                "recommended_option": "OPTION_A",
            }
        )

    edges = [
        {
            "from": f"N{index}",
            "to": f"N{index + 1}",
            **({"label": "发布门槛已确认，进入后续发布检查"} if review_type == "flow" else {}),
        }
        for index in range(1, node_count)
    ]
    item = {
        "id": "D1" if review_type == "flow" else "S1",
        "title": "问卷发布确认" if review_type == "flow" else "问卷发布页面",
        "summary": "产品经理检查问卷从编辑到发布的关键选择。",
        "source_path": "specs/example/flows/publish.mmd" if review_type == "flow" else "specs/example/ui/publish.md",
        "item_type": item_type,
        "nodes": nodes,
        "edges": edges,
    }
    if review_type == "ui":
        item.update(
            {
                "business_context": "运营人员准备发布问卷时，需要在同一页面确认发布范围和关键条件，避免把未完成的问卷交给填写人。",
                "primary_users": ["问卷运营人员"],
                "entry_scenarios": ["问卷内容编辑完成，运营人员准备检查并执行发布时进入。"],
                "user_goal": "核对问卷标题、目标人群和截止时间，并完成发布前确认。",
                "user_outcome": "问卷按确认的范围发布，运营人员能继续查看触达和回收情况。",
                "flow_refs": ["specs/example/flows/publish.mmd#发布前检查"],
                "screen_layout": "form",
                "screen_regions": [
                    {
                        "id": "publish-form",
                        "title": "发布信息区",
                        "purpose": "让运营人员检查问卷发布前必须填写的信息。",
                        "position": "main",
                        "source_ref": "specs/example/spec.md#问卷发布",
                        "components": [
                            {
                                "id": "publish-title",
                                "kind": "input",
                                "label": "问卷标题",
                                "purpose": "填写用户看到的问卷名称。",
                                "source_ref": "specs/example/spec.md#问卷发布",
                                "display": {
                                    "placeholder": "请输入问卷标题",
                                    "helper_text": "填写用户看到的问卷名称。",
                                },
                            },
                            {
                                "id": "publish-button",
                                "kind": "button",
                                "label": "发布问卷",
                                "purpose": "确认信息无误后进入发布。",
                                "source_ref": "specs/example/spec.md#问卷发布",
                                "action_ref": "DEC1",
                                "display": {"button_variant": "primary"},
                            },
                        ],
                    }
                ],
                "states": [
                    {
                        "id": "publish-count",
                        "label": "预计触达人数",
                        "state_type": "dynamic_marker",
                        "plain_note": "此处数字未来会自动更新。",
                        "source_ref": "specs/example/spec.md#问卷发布",
                    }
                ],
            }
        )
    if include_exception:
        item["complex_flow_exception"] = "该演示样例用于校验 10+ 节点例外，按线性清单逐段审核。"

    return {
        "schema_version": 1,
        "review_type": review_type,
        "artifact_path": artifact,
        "confirm_strategy": "batch",
        "batch_id": "BATCH-001",
        "project": {
            "name": "Example",
            "feature": "example-feature",
            "business_overview": "问卷团队确认发布前后的业务规则和界面入口。",
            "review_goal": "确认问卷发布流程的关键选择有明确责任和结果，避免后续实现误解业务规则。",
        },
        "source_snapshot": [
            {
                "path": "specs/example/spec.md",
                "anchors": ["业务规则"],
                "semantic_scope": ["requirements"],
            }
        ],
        "modules": [
            {
                "id": "survey",
                "title": "问卷管理",
                "summary": "运营人员在这里配置、审核并发布问卷。",
                items_key: [item],
            }
        ],
    }


def _priority_review_validator_sample(
    review_type: str,
    *,
    node_count: int = 3,
    critical_indexes: tuple[int, ...] = (),
) -> dict:
    sample = _review_validator_sample(review_type, node_count=node_count)
    sample["schema_version"] = 2
    items_key = "diagrams" if review_type == "flow" else "screens"
    nodes = sample["modules"][0][items_key][0]["nodes"]
    for index, node in enumerate(nodes, start=1):
        node["confirmation_priority"] = "critical" if index in critical_indexes else "normal"
        if index in critical_indexes:
            node["critical_basis"] = "错误确认会让真实敏感数据被不可逆地发布给错误对象，且当前没有安全默认值或可撤销路径。"
            node["priority_reason"] = "必须由产品负责人逐项确认发布对象边界，否则后续页面、开发与验收都会继承错误的数据权限。"
    return sample


def _outline_review_validator_sample() -> dict:
    def node(node_id: str, label: str) -> dict:
        return {
            "id": node_id,
            "label": label,
            "plain_summary": "产品负责人需要确认该纲要判断，避免范围或来源边界错误传入后续规格。",
            "decision_background": "现有来源能够支持候选结论，但该结论会改变后续规格的范围和验收覆盖。",
            "decision_summary": "确认当前纲要判断是否足以作为后续规格阶段的输入边界。",
            "action_prompt": "请选择保留当前建议，或要求补充证据后再次刷新纲要。",
            "review_layer": "business",
            "review_level": "must_confirm",
            "confirmation_priority": "important",
            "owner": "product-owner",
            "node_kind": "human_judgment",
            "source_ref": "specs/001-outline/spec-outline.md#Outline Decision",
            "options": [
                {
                    "id": "OPTION_A",
                    "label": "保留当前纲要判断",
                    "benefit": "保持当前范围并让后续规格围绕已覆盖的用户问题继续收敛。",
                    "cost": "产品负责人需要接受当前来源留下的低风险假设并持续跟踪。",
                    "recommendation_reason": "当前来源权威且核心场景已有验收种子，继续推进的返工风险较低。",
                    "consequence": "确认结果会写入纲要确认文档，并允许后续规格消费当前边界。",
                    "next_exit": "record-outline-confirmation-and-return-to-prd",
                    "recommended": True,
                },
                {
                    "id": "OPTION_B",
                    "label": "补充证据后重新确认",
                    "benefit": "在进入规格前补齐来源缺口，减少范围判断依赖未验证假设。",
                    "cost": "需要暂停规格并由来源负责人补充材料，当前交付会延后。",
                    "consequence": "纲要保持等待确认状态，补充来源后重新生成图形确认数据。",
                    "next_exit": "needs-decision:refresh-outline-evidence",
                },
            ],
            "options_count_rationale": "当前判断只有保留边界或补充来源两条互斥出口，不存在第三条可执行路径。",
            "recommended_option": "OPTION_A",
        }

    views = [
        {
            "id": "intent",
            "title": "意图地图",
            "summary": "连接产品目标、实际角色、问题切片与候选能力边界。",
            "source_path": "specs/001-outline/spec-outline.md",
            "view_type": "intent_map",
            "intent": "让产品团队在进入规格前确认目标、真实用户与问题边界一致。",
            "users": ["产品负责人", "需求分析人员"],
            "problem_slices": ["来源分散导致规格范围容易偏离真实业务目标"],
            "capability_slices": ["形成可追溯且可确认的规格输入边界"],
            "nodes": [node("OUTLINE-INTENT", "确认产品意图与首要问题边界")],
        },
        {
            "id": "scope",
            "title": "范围与首切片",
            "summary": "并列展示本期范围、非目标、场景覆盖和推荐首个切片。",
            "source_path": "specs/001-outline/spec-outline.md",
            "view_type": "scope_slice",
            "in_scope": ["纲要意图、范围和验收覆盖确认"],
            "non_goals": ["不在纲要阶段设计页面、接口或实现任务"],
            "scenario_coverage": [
                {
                    "scenario": "产品负责人检查首切片是否覆盖核心用户问题",
                    "acceptance_seeds": ["能够追溯到权威来源并明确一期边界"],
                }
            ],
            "recommended_first_slice": "先确认核心角色、主要问题和一期验收边界，再进入详细规格。",
            "nodes": [node("OUTLINE-SCOPE", "确认一期范围与推荐首切片")],
        },
        {
            "id": "readiness",
            "title": "就绪度与来源权威",
            "summary": "展示来源权威、风险、开放项、阻断项和下一条工作路由。",
            "source_path": "specs/001-outline/spec-outline.md",
            "view_type": "readiness_authority",
            "source_authorities": [
                {
                    "id": "prd-v3",
                    "path": "specs/001-outline/prd.md",
                    "status": "authoritative",
                    "scope": "product intent and scope",
                }
            ],
            "risks": ["低风险来源假设需要在详细规格中保持可追溯"],
            "open_items": [],
            "blockers": [],
            "next_route": "/sp.prd consume outline confirmation package",
            "nodes": [node("OUTLINE-READY", "确认来源权威与下一路由")],
        },
    ]
    return {
        "schema_version": 2,
        "review_type": "outline",
        "artifact_path": "specs/001-outline/prd/review/outline-review-data.json",
        "outline_source_path": "specs/001-outline/spec-outline.md",
        "outline_digest": "a" * 64,
        "source_authority_ids": ["prd-v3"],
        "confirm_strategy": "batch",
        "batch_id": "OUTLINE-001",
        "project": {
            "name": "Outline Example",
            "feature": "001-outline",
            "business_overview": "产品团队需要在详细规格前确认产品意图、范围、来源权威和首个交付切片。",
            "review_goal": "只确认纲要级边界和就绪度，不提前设计流程、界面、接口、数据库或实现任务。",
        },
        "source_snapshot": [
            {
                "path": "specs/001-outline/prd.md",
                "anchors": ["Product Intent", "Scope"],
                "semantic_scope": ["intent", "scope", "acceptance-seeds"],
            }
        ],
        "modules": [
            {
                "id": "feature-outline",
                "title": "功能纲要",
                "summary": "对进入详细规格前必须稳定的产品判断进行一次集中确认。",
                "views": views,
            }
        ],
    }


def _outline_discovery_validator_sample() -> dict:
    return {
        "schema_version": 3,
        "review_type": "outline_discovery",
        "interaction_mode": "discovery",
        "artifact_path": "specs/001-outline/prd/review/outline-discovery-data.json",
        "outline_maturity": "explore",
        "batch_id": "DISCOVERY-001",
        "project": {
            "name": "量化交易工作台",
            "feature": "001-outline",
            "current_understanding": "系统接收行情和账户数据，生成交易意图，并在风险检查通过后形成可执行订单。",
            "discovery_goal": "确认数据、策略和风险控制组成的首期业务闭环。",
        },
        "source_snapshot": [
            {
                "path": "specs/001-outline/prd.md",
                "source_type": "user_document",
                "anchors": ["Core Trading Loop"],
            }
        ],
        "business_context": {
            "product_subject": {
                "label": "量化交易工作台",
                "summary": "把市场与账户数据转化为经过风险约束的交易订单。",
                "source_status": "user",
                "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
            },
            "business_objects": [
                {
                    "object_id": "object-market-account-data",
                    "label": "行情与账户数据",
                    "summary": "策略判断和风险检查所依赖的业务事实。",
                    "source_status": "doc",
                    "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
                },
                {
                    "object_id": "object-order",
                    "label": "交易订单",
                    "summary": "通过策略判断和风险检查后形成的执行对象。",
                    "source_status": "doc",
                    "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
                },
            ],
            "operations": [
                {
                    "operation_id": "operation-store-data",
                    "label": "存储并更新交易数据",
                    "summary": "持续保存行情、持仓和资金状态。",
                    "object_refs": ["object-market-account-data"],
                    "source_status": "doc",
                    "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
                },
                {
                    "operation_id": "operation-decide-order",
                    "label": "生成策略信号并执行风险检查",
                    "summary": "依据最新数据产生交易意图，并检查仓位、损失和资金限制。",
                    "object_refs": ["object-market-account-data", "object-order"],
                    "source_status": "user-confirmed",
                    "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
                },
            ],
            "outcomes": [
                {
                    "outcome_id": "outcome-controlled-order",
                    "label": "形成受控订单",
                    "summary": "合规交易意图被转换为可执行订单，超限意图被阻断并留下原因。",
                    "source_status": "user-confirmed",
                    "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
                }
            ],
            "capability_atoms": [
                {
                    "atom_id": "atom-controlled-order",
                    "label": "把行情与账户变化转化为受控订单",
                    "trigger_kind": "business_event",
                    "trigger_or_input": "新行情、持仓或资金变化到达",
                    "owned_state": "经过风险约束、等待执行的交易订单",
                    "object_refs": ["object-market-account-data", "object-order"],
                    "operation_refs": ["operation-store-data", "operation-decide-order"],
                    "outcome_refs": ["outcome-controlled-order"],
                    "primary_outcome_ref": "outcome-controlled-order",
                    "downstream_handoff": "向订单执行责任交付可执行订单或风险阻断事实",
                    "business_chain_refs": ["chain-trading-loop"],
                    "source_status": "user-confirmed",
                    "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
                }
            ],
            "source_capability_coverage": [
                {
                    "source_capability_id": "source-controlled-order",
                    "label": "把行情与账户变化转化为受控订单",
                    "trigger_or_input": "新行情、持仓或资金变化到达",
                    "owned_state": "经过风险约束、等待执行的交易订单",
                    "observable_outcome": "合规交易意图被转换为可执行订单，超限意图被阻断并留下原因。",
                    "independent_acceptance_reason": "该能力有独立触发、独立状态所有权和可核验的受控订单结果。",
                    "disposition": "atom",
                    "capability_atom_ref": "atom-controlled-order",
                    "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
                }
            ],
            "business_chains": [
                {
                    "chain_id": "chain-trading-loop",
                    "label": "从交易数据到受控订单",
                    "chain_kind": "primary",
                    "trigger_kind": "business_event",
                    "trigger_or_input": "新行情、持仓或资金变化到达",
                    "owned_state": "经过风险约束、等待执行的交易订单",
                    "object_refs": ["object-market-account-data", "object-order"],
                    "operation_refs": ["operation-store-data", "operation-decide-order"],
                    "outcome_refs": ["outcome-controlled-order"],
                    "primary_outcome_ref": "outcome-controlled-order",
                    "downstream_handoff": "向订单执行责任交付可执行订单或风险阻断事实",
                    "source_status": "user-confirmed",
                    "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
                }
            ],
            "evidence_gaps": [],
        },
        "constitution_snapshot": {
            "source_path": ".specify/memory/constitution.md",
            "availability": "available",
            "display_mode": "read_only",
            "application_scope": "governance_only",
            "clauses": [
                {
                    "clause_id": "constitution-risk-review",
                    "title": "高风险决策需要人工确认",
                    "summary": "可能扩大交易风险的规则变更必须由责任人确认。",
                    "source_anchor": "Risk Governance",
                    "applicability_status": "applicable",
                }
            ],
        },
        "density_budget": {
            "max_visible_nodes_per_map": 18,
            "max_depth": 3,
            "layer_balance_min_nodes": 8,
            "max_layer_share": 0.6,
        },
        "maps": [
            {
                "map_id": "map-overview",
                "title": "量化交易业务全景",
                "summary": "从交易数据进入，到风险受控订单形成。",
                "map_kind": "overview",
                "root_node_id": "node-project",
                "parent_map_id": None,
            },
            {
                "map_id": "map-trading-loop",
                "title": "交易闭环",
                "summary": "下钻查看数据存储、策略决策和风险控制。",
                "map_kind": "branch",
                "root_node_id": "node-trading-root",
                "parent_map_id": "map-overview",
            },
            {
                "map_id": "map-governance",
                "title": "全局约束与治理",
                "summary": "集中呈现影响多个业务分支的规则。",
                "map_kind": "global_constraints",
                "root_node_id": "node-governance-root",
                "parent_map_id": "map-overview",
            },
        ],
        "outline_nodes": [
            {"node_id": "node-project", "parent_node_id": None, "map_id": "map-overview", "node_kind": "root", "label": "量化交易工作台", "summary": "把行情和账户变化转化为经过风险约束的交易订单。", "source_status": "user", "business_chain_refs": ["chain-trading-loop"]},
            {"node_id": "node-trading-entry", "parent_node_id": "node-project", "map_id": "map-overview", "node_kind": "map_link", "label": "交易闭环", "summary": "进入数据、策略和风险控制业务分图。", "source_status": "user-confirmed", "child_map_id": "map-trading-loop", "business_chain_refs": ["chain-trading-loop"], "capability_atom_refs": ["atom-controlled-order"]},
            {"node_id": "node-governance-entry", "parent_node_id": "node-project", "map_id": "map-overview", "node_kind": "map_link", "label": "全局治理约束", "summary": "查看对交易业务生效的项目原则。", "source_status": "doc", "child_map_id": "map-governance"},
            {"node_id": "node-trading-root", "parent_node_id": None, "map_id": "map-trading-loop", "node_kind": "root", "label": "从交易数据到受控订单", "summary": "接收数据，产生交易意图，风险放行后形成订单。", "source_status": "user-confirmed", "business_chain_refs": ["chain-trading-loop"]},
            {"node_id": "node-data", "parent_node_id": "node-trading-root", "map_id": "map-trading-loop", "node_kind": "capability", "label": "交易数据存储", "summary": "保存并更新行情、资金和持仓事实。", "source_status": "doc", "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"], "business_chain_refs": ["chain-trading-loop"]},
            {"node_id": "node-strategy-risk", "parent_node_id": "node-trading-root", "map_id": "map-trading-loop", "node_kind": "capability", "label": "策略与风险决策", "summary": "生成交易意图，并按仓位、损失和资金限制决定放行或阻断。", "source_status": "ai-proposed", "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"], "business_chain_refs": ["chain-trading-loop"]},
            {"node_id": "node-order", "parent_node_id": "node-trading-root", "map_id": "map-trading-loop", "node_kind": "acceptance", "label": "受控订单结果", "summary": "输出可执行订单，或记录风险阻断原因。", "source_status": "user-confirmed", "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"], "business_chain_refs": ["chain-trading-loop"]},
            {"node_id": "node-governance-root", "parent_node_id": None, "map_id": "map-governance", "node_kind": "root", "label": "全局约束与治理", "summary": "只保留横切规则。", "source_status": "doc"},
            {"node_id": "node-constitution-rule", "parent_node_id": "node-governance-root", "map_id": "map-governance", "node_kind": "constraint", "label": "高风险决策需要人工确认", "summary": "扩大交易风险的规则变更必须由责任人确认。", "source_status": "doc", "affected_node_ids": ["node-strategy-risk"], "constitution_clause_refs": ["constitution-risk-review"]},
        ],
        "question_groups": [
            {
                "id": "direction",
                "title": "策略与风险边界",
                "summary": "确认首期由系统覆盖的策略和风险决策范围。",
                "map_id": "map-trading-loop",
                "questions": [
                    {
                        "id": "strategy-risk-scope",
                        "outline_node_id": "node-strategy-risk",
                        "target_kind": "goal",
                        "prompt": "首期策略与风险控制应该覆盖到什么程度？",
                        "context": "业务闭环已经明确，但策略类型和自动放行边界仍需用户确认。",
                        "selection_mode": "single",
                        "candidates": [
                            {
                                "id": "risk-basic",
                                "label": "单策略加基础风控",
                                "detail": "该项目独立拥有策略执行与风险检查能力，交付经过仓位与资金限制验证的受控订单结果。",
                                "value": "首期支持一个交易策略，并在仓位、资金和单笔损失检查通过后生成订单。",
                                "rationale": "可以用最小闭环验证数据、策略、风险和订单之间的业务关系。",
                                "business_chain_refs": ["chain-trading-loop"],
                                "capability_atom_refs": ["atom-controlled-order"],
                            },
                            {
                                "id": "risk-multi",
                                "label": "多策略加组合风控",
                                "detail": "该项目独立拥有多策略协调与组合风险评估能力，交付按组合敞口统一控制的订单结果。",
                                "value": "首期同时运行多个策略，并按组合敞口和回撤统一决定订单是否放行。",
                                "rationale": "覆盖更完整，但需要更多策略冲突和组合风险事实。",
                                "business_chain_refs": ["chain-trading-loop"],
                                "capability_atom_refs": ["atom-controlled-order"],
                            },
                        ],
                        "recommended_candidate_ids": ["risk-basic"],
                        "recommendation_reason": "单策略基础风控已经形成可核验业务闭环，且不会提前假定组合管理能力。",
                        "allow_none_of_the_above": True,
                        "free_input": {
                            "enabled": True,
                            "label": "补充或改写策略与风险边界",
                            "allowed_operations": [
                                "confirm_candidate",
                                "add",
                                "replace",
                                "exclude",
                                "context_note",
                            ],
                        },
                    }
                ],
            }
        ],
        "authorization_effect": "none",
        "next_route": "/sp.prd",
    }


def _outline_discovery_v4_root_sample() -> dict:
    sample = _outline_discovery_validator_sample()
    sample = json.loads(json.dumps(sample).replace("001-outline", "000-outline"))
    sample["schema_version"] = 4
    source_ref = "specs/000-outline/prd.md#Core Trading Loop"
    detail_node_ids = {"node-data", "node-strategy-risk", "node-order"}
    sample["outline_nodes"] = [
        node for node in sample["outline_nodes"] if node["node_id"] not in detail_node_ids
    ]
    constraint = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-constitution-rule")
    constraint["affected_node_ids"] = ["node-trading-root"]
    sample["question_groups"][0]["map_id"] = "map-overview"
    sample["question_groups"][0]["questions"][0]["outline_node_id"] = "node-trading-entry"
    sample["decomposition_window"] = {
        "expansion_root_node_id": "node-project",
        "root_project_feature": "000-outline",
        "root_project_depth": 0,
        "generation_mode": "decompose",
        "generated_depth": 1,
        "depth_decision_reason": "顶级 Outline 本轮只确认直接业务子单元，后续细节分别在子单元自己的窗口继续生成。",
        "parent_path": [],
        "units": [
            {
                "unit_id": "unit-root",
                "outline_node_id": "node-project",
                "parent_unit_id": None,
                "project_depth": 0,
                "decomposition_state": "expanded",
                "business_goal": "把市场与账户变化组织为风险受控且可以独立核验的量化交易业务结果。",
                "overall_outcome": "产品形成从交易事实进入到受控订单交付的完整顶级业务责任和结果边界。",
                "capability_atom_refs": ["atom-controlled-order"],
                "business_chain_refs": ["chain-trading-loop"],
                "source_status": "user-confirmed",
                "source_refs": [source_ref],
                "decomposition_basis": {
                    "complexity_reduction": "把顶级交易目标交给直接业务单元后，后续模型只需处理该单元拥有的状态和验收结果。",
                    "child_boundary_summary": "直接子单元拥有从行情和账户变化到受控订单形成的完整业务责任。",
                    "coordination_cost": "父级只保留全局约束和命名交接，子单元通过稳定订单事实与其他责任协作。",
                    "source_status": "doc",
                    "source_refs": [source_ref],
                },
            },
            {
                "unit_id": "unit-trading-loop",
                "outline_node_id": "node-trading-entry",
                "parent_unit_id": "unit-root",
                "project_depth": 1,
                "decomposition_state": "terminal",
                "business_goal": "接收行情和账户变化，形成经过策略判断与风险约束的可执行交易订单。",
                "overall_outcome": "合规意图形成可执行订单，超限意图形成带原因的风险阻断事实。",
                "capability_atom_refs": ["atom-controlled-order"],
                "business_chain_refs": ["chain-trading-loop"],
                "source_status": "user-confirmed",
                "source_refs": [source_ref],
                "terminal_basis": {
                    "indivisible_business_goal": "该单元围绕一个从市场变化到受控订单结果的连续业务目标完成验收。",
                    "split_complexity_cost": "继续拆分会增加策略决定与风险结果之间的交接和重复状态管理成本。",
                    "manageable_implementation_scope": "当前范围只包含一个触发、一个受控订单状态和一个可观察结果，模型可以独立实现。",
                    "source_status": "doc",
                    "source_refs": [source_ref],
                },
            },
        ],
        "frontier_unit_ids": [],
        "terminal_unit_ids": ["unit-trading-loop"],
    }
    return sample


def _outline_discovery_v5_root_sample() -> dict:
    sample = _outline_discovery_v4_root_sample()
    sample["schema_version"] = 5
    source_path = "specs/000-outline/prd.md"
    sample["source_inventory"] = {
        "roots": [
            {
                "path": source_path,
                "root_kind": "file",
                "source_origin": "feature-prd",
            }
        ],
        "entries": [
            {
                "path": source_path,
                "disposition": "used",
                "rationale": "该功能 PRD 定义当前交易能力、业务状态、责任所有者、生命周期和验收结果。",
            }
        ],
    }
    context = sample["business_context"]
    context["responsibility_owners"] = [
        {
            "owner_id": "owner-trading-control",
            "label": "交易控制责任",
            "accountability": "负责把市场与账户变化裁定为经过风险约束的订单结果。",
            "source_status": "user-confirmed",
            "source_refs": ["specs/000-outline/prd.md#Core Trading Loop"],
        }
    ]
    context["business_lifecycles"] = [
        {
            "lifecycle_id": "lifecycle-controlled-order",
            "label": "受控订单形成生命周期",
            "trigger_or_input": "新行情、持仓或资金变化到达",
            "completion_condition": "形成可执行订单或带原因的风险阻断事实。",
            "source_status": "user-confirmed",
            "source_refs": ["specs/000-outline/prd.md#Core Trading Loop"],
        }
    ]
    context["business_states"] = [
        {
            "state_id": "state-controlled-order",
            "label": "经过风险约束、等待执行的交易订单",
            "responsibility_owner_ref": "owner-trading-control",
            "lifecycle_ref": "lifecycle-controlled-order",
            "acceptance_outcome_ref": "outcome-controlled-order",
            "source_status": "user-confirmed",
            "source_refs": ["specs/000-outline/prd.md#Core Trading Loop"],
        }
    ]
    atom = context["capability_atoms"][0]
    chain = context["business_chains"][0]
    atom["owned_state_refs"] = ["state-controlled-order"]
    chain["owned_state_refs"] = ["state-controlled-order"]
    coverage = context["source_capability_coverage"][0]
    coverage.update(
        {
            "business_state_ref": "state-controlled-order",
            "responsibility_owner_ref": "owner-trading-control",
            "lifecycle_ref": "lifecycle-controlled-order",
        }
    )
    return sample


def _v5_separation_test() -> dict:
    return {
        "alternative_groups": [
            {
                "group_id": "group-order-result",
                "business_responsibility": "独立形成经过风险约束并可继续执行的交易订单结果。",
                "capability_atom_refs": ["atom-controlled-order"],
            },
            {
                "group_id": "group-risk-decision",
                "business_responsibility": "独立裁定交易意图并交付可追溯的放行或阻断决定。",
                "capability_atom_refs": ["atom-risk-decision"],
            },
        ],
        "stable_handoffs": [
            {
                "from_group_id": "group-risk-decision",
                "to_group_id": "group-order-result",
                "business_fact": "交付风险放行决定或带原因的阻断事实",
            }
        ],
        "duplicated_state_refs": [],
        "keep_together_complexity": "保留共同父级时模型同时维护两个状态，但共享同一交易控制责任与订单形成生命周期。",
        "split_coordination_cost": "拆分后需要新增风险决定到订单结果的可靠业务交接，并分别维护失败恢复验收。",
        "decision_reason": "当前共同责任和生命周期使合并后的模型上下文小于新增交接与重复恢复验收成本。",
    }


def _outline_discovery_v5_multi_atom_child_sample() -> dict:
    sample = _outline_discovery_v4_multi_atom_child_sample(grouping_authority="ai-proposed")
    base = _outline_discovery_v5_root_sample()
    sample["schema_version"] = 5
    sample["source_inventory"] = base["source_inventory"]
    context = sample["business_context"]
    context["responsibility_owners"] = base["business_context"]["responsibility_owners"]
    context["business_lifecycles"] = base["business_context"]["business_lifecycles"]
    context["business_states"] = base["business_context"]["business_states"] + [
        {
            "state_id": "state-risk-decision",
            "label": "已经过风险规则裁定的交易意图",
            "responsibility_owner_ref": "owner-trading-control",
            "lifecycle_ref": "lifecycle-controlled-order",
            "acceptance_outcome_ref": "outcome-risk-decision",
            "source_status": "doc",
            "source_refs": ["specs/000-outline/prd.md#Core Trading Loop"],
        }
    ]
    atoms = {atom["atom_id"]: atom for atom in context["capability_atoms"]}
    chains = {chain["chain_id"]: chain for chain in context["business_chains"]}
    atoms["atom-controlled-order"]["owned_state_refs"] = ["state-controlled-order"]
    chains["chain-trading-loop"]["owned_state_refs"] = ["state-controlled-order"]
    atoms["atom-risk-decision"]["owned_state_refs"] = ["state-risk-decision"]
    chains["chain-risk-decision"]["owned_state_refs"] = ["state-risk-decision"]
    coverage_by_atom = {
        item.get("capability_atom_ref"): item
        for item in context["source_capability_coverage"]
    }
    coverage_by_atom["atom-controlled-order"].update(
        {
            "business_state_ref": "state-controlled-order",
            "responsibility_owner_ref": "owner-trading-control",
            "lifecycle_ref": "lifecycle-controlled-order",
        }
    )
    coverage_by_atom["atom-risk-decision"].update(
        {
            "business_state_ref": "state-risk-decision",
            "responsibility_owner_ref": "owner-trading-control",
            "lifecycle_ref": "lifecycle-controlled-order",
        }
    )
    for unit in sample["decomposition_window"]["units"]:
        if len(unit["capability_atom_refs"]) < 2:
            continue
        unit["grouping_basis"] = {
            "authority": "ai-proposed",
            "shared_business_goal": "风险裁定和订单形成共同完成从交易意图到受控订单结果的单一业务目标。",
            "shared_responsibility_owner_ref": "owner-trading-control",
            "shared_lifecycle_ref": "lifecycle-controlled-order",
            "parent_cohesion": "分开后必须新增风险决定交接、失败恢复和两边一致性验收，超过当前共同状态的维护成本。",
            "separation_test": _v5_separation_test(),
            "source_refs": unit["source_refs"],
        }
    return sample


def _outline_discovery_v5_non_root_multi_atom_sample() -> dict:
    sample = json.loads(
        json.dumps(_outline_discovery_v5_multi_atom_child_sample()).replace("000-outline", "001-outline")
    )
    window = sample["decomposition_window"]
    window["root_project_depth"] = 1
    window["parent_path"] = [
        {"unit_id": "unit-portfolio", "label": "量化交易工作台", "project_depth": 0}
    ]
    for unit in window["units"]:
        unit["project_depth"] += 1
    return sample


def _outline_discovery_v6_multi_atom_child_sample() -> dict:
    """Latest positive fixture: every generated merge has source-backed coupling evidence."""
    sample = _outline_discovery_v5_multi_atom_child_sample()
    sample["schema_version"] = 6
    context = sample["business_context"]
    for coverage in context["source_capability_coverage"]:
        coverage["source_status"] = coverage.get("source_status", "doc")
        coverage["independent_acceptance_reason"] = "该能力拥有独立输入、状态变化、验收结果和后续业务交接，可以单独核对完成。"
    inventory_entry = sample["source_inventory"]["entries"][0]
    inventory_entry["evidence_refs"] = [
        {"entity_kind": "source_capability", "entity_id": "source-controlled-order"},
        {"entity_kind": "source_capability", "entity_id": "source-risk-decision"},
        {"entity_kind": "business_state", "entity_id": "state-controlled-order"},
        {"entity_kind": "business_state", "entity_id": "state-risk-decision"},
    ]
    risk_atom = next(atom for atom in context["capability_atoms"] if atom["atom_id"] == "atom-risk-decision")
    child = next(
        unit
        for unit in sample["decomposition_window"]["units"]
        if len(unit["capability_atom_refs"]) > 1
        and unit["project_depth"] > sample["decomposition_window"]["root_project_depth"]
    )
    child["grouping_basis"]["coupling_invariants"] = [
        {
            "invariant_id": "invariant-risk-order-acceptance",
            "invariant_kind": "atomic_acceptance",
            "business_rule": "风险放行决定必须在订单形成前保持同一笔意图的可追溯关联，两个结果共同完成受控订单验收。",
            "capability_atom_refs": ["atom-risk-decision", "atom-controlled-order"],
            "source_status": "doc",
            "source_refs": ["specs/000-outline/prd.md#Core Trading Loop"],
        }
    ]
    handoff = child["grouping_basis"]["separation_test"]["stable_handoffs"][0]
    handoff.update({
        "from_atom_ref": "atom-risk-decision",
        "to_atom_ref": "atom-controlled-order",
        "business_fact": risk_atom["downstream_handoff"],
        "source_status": "doc",
        "source_refs": ["specs/000-outline/prd.md#Core Trading Loop"],
    })
    for unit in sample["decomposition_window"]["units"]:
        if len(unit.get("capability_atom_refs", [])) < 2:
            continue
        root_handoff = unit["grouping_basis"]["separation_test"]["stable_handoffs"][0]
        root_handoff.update({
            "from_atom_ref": "atom-risk-decision",
            "to_atom_ref": "atom-controlled-order",
            "business_fact": risk_atom["downstream_handoff"],
            "source_status": "doc",
            "source_refs": ["specs/000-outline/prd.md#Core Trading Loop"],
        })
    return sample


def _outline_discovery_v4_non_root_sample() -> dict:
    sample = json.loads(json.dumps(_outline_discovery_v4_root_sample()).replace("000-outline", "001-outline"))
    source_ref = "specs/001-outline/prd.md#Core Trading Loop"
    detail_source = _outline_discovery_validator_sample()
    detail_node = json.loads(json.dumps(next(
        node for node in detail_source["outline_nodes"] if node["node_id"] == "node-data"
    )))
    sample["outline_nodes"].append(detail_node)
    root, child = sample["decomposition_window"]["units"]
    root.update({"unit_id": "unit-current", "project_depth": 1})
    child.update({
        "unit_id": "unit-child",
        "parent_unit_id": "unit-current",
        "project_depth": 2,
        "decomposition_state": "expanded",
        "decomposition_basis": {
            "complexity_reduction": "把订单形成责任继续聚焦到策略与风险结果后，单个模型上下文只维护一种业务状态。",
            "child_boundary_summary": "下一层只拥有交易意图裁定和受控订单结果之间的业务责任。",
            "coordination_cost": "子层通过风险决定和订单事实交接，不读取相邻责任的内部实现。",
            "source_status": "doc",
            "source_refs": [source_ref],
        },
    })
    child.pop("terminal_basis")
    sample["decomposition_window"].update({
        "root_project_feature": "001-outline",
        "root_project_depth": 1,
        "generated_depth": 2,
        "depth_decision_reason": "当前普通单元仍包含可继续聚焦的业务责任，本轮生成两层即可在界面中完整判断其末端。",
        "parent_path": [{"unit_id": "unit-portfolio", "label": "量化交易工作台", "project_depth": 0}],
        "units": [
            root,
            child,
            {
                "unit_id": "unit-leaf",
                "outline_node_id": "node-data",
                "parent_unit_id": "unit-child",
                "project_depth": 3,
                "decomposition_state": "terminal",
                "business_goal": "根据行情和账户事实裁定交易意图，并输出经过风险约束的订单结果。",
                "overall_outcome": "交易意图得到可执行订单或带明确原因的阻断事实，能够独立验收。",
                "capability_atom_refs": ["atom-controlled-order"],
                "business_chain_refs": ["chain-trading-loop"],
                "source_status": "user-confirmed",
                "source_refs": [source_ref],
                "terminal_basis": {
                    "indivisible_business_goal": "该叶子只负责一次交易意图裁定和一个受控订单结果，业务目标已经单一。",
                    "split_complexity_cost": "继续拆会把一次裁定拆成相互等待的状态和人工交接，增加管理复杂度。",
                    "manageable_implementation_scope": "单一触发、单一状态和单一结果已足够小，适合模型独立生成详细功能和代码。",
                    "source_status": "doc",
                    "source_refs": [source_ref],
                },
            },
        ],
        "frontier_unit_ids": [],
        "terminal_unit_ids": ["unit-leaf"],
    })
    return sample


def _add_second_atom_to_current_level_one_project(sample: dict) -> None:
    """Add a second atom/chain pair owned by the existing direct project."""
    source_ref = "specs/001-outline/prd.md#Core Trading Loop"
    sample["business_context"]["outcomes"].append(
        {
            "outcome_id": "outcome-risk-decision",
            "label": "形成风险放行决定",
            "summary": "交易意图被明确放行或阻断，并记录可追溯原因。",
            "source_status": "doc",
            "source_refs": [source_ref],
        }
    )
    sample["business_context"]["business_chains"].append(
        {
            "chain_id": "chain-risk-decision",
            "label": "交易意图风险放行",
            "chain_kind": "primary",
            "trigger_kind": "business_event",
            "trigger_or_input": "交易意图进入风险审核",
            "owned_state": "已经过风险规则裁定的交易意图",
            "object_refs": ["object-market-account-data", "object-order"],
            "operation_refs": ["operation-decide-order"],
            "outcome_refs": ["outcome-risk-decision"],
            "primary_outcome_ref": "outcome-risk-decision",
            "downstream_handoff": "向订单执行责任交付放行决定或阻断事实",
            "source_status": "doc",
            "source_refs": [source_ref],
        }
    )
    sample["business_context"]["capability_atoms"].append(
        {
            "atom_id": "atom-risk-decision",
            "label": "裁定交易意图是否放行",
            "trigger_kind": "business_event",
            "trigger_or_input": "交易意图进入风险审核",
            "owned_state": "已经过风险规则裁定的交易意图",
            "object_refs": ["object-market-account-data", "object-order"],
            "operation_refs": ["operation-decide-order"],
            "outcome_refs": ["outcome-risk-decision"],
            "primary_outcome_ref": "outcome-risk-decision",
            "downstream_handoff": "向订单执行责任交付放行决定或阻断事实",
            "business_chain_refs": ["chain-risk-decision"],
            "source_status": "doc",
            "source_refs": [source_ref],
        }
    )
    sample["business_context"]["source_capability_coverage"].append(
        {
            "source_capability_id": "source-risk-decision",
            "label": "裁定交易意图是否放行",
            "trigger_or_input": "交易意图进入风险审核",
            "owned_state": "已经过风险规则裁定的交易意图",
            "observable_outcome": "形成可追溯的风险放行决定或阻断事实。",
            "independent_acceptance_reason": "风险裁定有独立输入、状态和可核验结果。",
            "disposition": "atom",
            "capability_atom_ref": "atom-risk-decision",
            "source_refs": [source_ref],
        }
    )
    sample["outline_nodes"][0]["business_chain_refs"].append("chain-risk-decision")
    project = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    project["business_chain_refs"].append("chain-risk-decision")
    project["capability_atom_refs"].append("atom-risk-decision")
    project["aggregation_basis"] = {
        "authority": "doc",
        "shared_business_goal": "两个能力共同完成从交易意图到受控订单的单一业务目标。",
        "shared_lifecycle_or_owner": "同一交易控制责任在订单形成生命周期内持续拥有两项业务状态。",
        "split_acceptance_harm": "拆开后风险决定与订单结果无法通过独立业务交接完成整体业务验收。",
        "source_refs": [source_ref],
    }
    branch_root = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-root")
    branch_root["business_chain_refs"].append("chain-risk-decision")
    for candidate in sample["question_groups"][0]["questions"][0]["candidates"]:
        candidate["business_chain_refs"].append("chain-risk-decision")
        candidate["capability_atom_refs"].append("atom-risk-decision")


def _outline_discovery_v4_multi_atom_child_sample(
    *,
    grouping_authority: str = "doc",
    child_source_status: str = "user-confirmed",
) -> dict:
    sample = _outline_discovery_v4_root_sample()
    _add_second_atom_to_current_level_one_project(sample)
    sample = json.loads(json.dumps(sample).replace("specs/001-outline", "specs/000-outline"))

    project = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    project.pop("aggregation_basis")
    root, child = sample["decomposition_window"]["units"]
    for unit in (root, child):
        unit["capability_atom_refs"].append("atom-risk-decision")
        unit["business_chain_refs"].append("chain-risk-decision")
    root["grouping_basis"] = {
        "authority": "ai-proposed",
        "shared_business_goal": "当前展开根统一承载交易意图、风险决定和受控订单结果的既定业务范围。",
        "shared_lifecycle_or_owner": "顶层交易范围覆盖从意图进入到订单结果形成的完整业务生命周期。",
        "parent_cohesion": "展开根只是当前已选择的分析范围，不代表把后代能力预先合并为一个项目。",
        "source_refs": root["source_refs"],
    }
    child["grouping_basis"] = {
        "authority": grouping_authority,
        "shared_business_goal": "风险裁定和订单形成共同完成从交易意图到受控订单结果的单一业务目标。",
        "shared_lifecycle_or_owner": "同一交易控制责任在订单形成生命周期内持续拥有风险决定和订单结果。",
        "parent_cohesion": "拆开后风险决定与订单结果无法通过稳定业务交接完成当前整体业务验收。",
        "source_refs": child["source_refs"],
    }
    child["source_status"] = child_source_status
    return sample


def _outline_intent_ledger_sample() -> dict:
    return {
        "schema_version": 3,
        "format": "speccompass-outline-intent-ledger",
        "feature": "001-outline",
        "events": [
            {
                "delta_id": "delta-001",
                "response_id": "response-001",
                "maturity": "explore",
                "outline_node_id": "node-input",
                "target_kind": "goal",
                "operation": "confirm_candidate",
                "candidate_id": "goal-quality",
                "target_id": None,
                "value": "让产品负责人在进入详细规格前补齐真实目标、用户和核心问题。",
                "source_tag": "user-confirmed",
                "recorded_at": "2026-07-16T08:00:00.000Z",
                "supersedes_delta_id": None,
            },
            {
                "delta_id": "delta-002",
                "response_id": "response-002",
                "maturity": "frame",
                "outline_node_id": "node-input",
                "target_kind": "goal",
                "operation": "replace",
                "candidate_id": None,
                "target_id": "goal-primary",
                "value": "先确认产品事实，再在稳定框架上提高整理效率。",
                "source_tag": "user",
                "recorded_at": "2026-07-16T08:30:00.000Z",
                "supersedes_delta_id": "delta-001",
            },
        ],
    }


def test_outline_review_schema_and_validator_enforce_three_view_contract(tmp_path):
    assert OUTLINE_REVIEW_SCHEMA.is_file()
    schema = json.loads(OUTLINE_REVIEW_SCHEMA.read_text(encoding="utf-8"))
    assert schema["properties"]["review_type"]["const"] == "outline"
    assert schema["properties"]["schema_version"] == {"const": 2}
    assert schema["$defs"]["view"]["properties"]["view_type"]["enum"] == [
        "intent_map",
        "scope_slice",
        "readiness_authority",
    ]

    sample = _outline_review_validator_sample()
    accepted = _run_review_validator(sample, tmp_path / "outline-valid.json")
    assert accepted.returncode == 0, _review_validator_output(accepted)

    for label, mutate in (
        ("missing", lambda views: views.pop()),
        ("duplicate", lambda views: views.__setitem__(2, {**views[2], "view_type": "scope_slice"})),
        ("extra", lambda views: views.append({**views[0], "id": "extra"})),
    ):
        invalid = _outline_review_validator_sample()
        mutate(invalid["modules"][0]["views"])
        result = _run_review_validator(invalid, tmp_path / f"outline-{label}.json")
        assert result.returncode != 0, label
        assert "exactly once" in _review_validator_output(result)


def test_outline_review_validator_accepts_explicit_legacy_adoption_identity(tmp_path):
    sample = _outline_review_validator_sample()
    sample["boundary_adjustment"] = {
        "operation": "ADOPTION",
        "proposal_id": "baseline-adoption-001",
        "proposal_digest": "a" * 64,
        "base_baseline_id": None,
        "base_baseline_digest": None,
        "impact_preview_digest": "b" * 64,
        "initiated_by": "model",
        "change_class": "ADOPTION",
        "affected_feature_codes": ["001"],
        "proposal_path": "specs/001-outline/boundary-adjustments/drafts/baseline-adoption-001/proposal.json",
        "impact_preview_path": "specs/001-outline/boundary-adjustments/drafts/baseline-adoption-001/impact-preview.json",
        "decision_path": "specs/001-outline/boundary-adjustments/drafts/baseline-adoption-001/decision.json",
        "writer_ledger_path": "specs/001-outline/boundary-adjustments/writeback-ledger.jsonl",
        "decision_target_ref": "feature-outline:intent:OUTLINE-INTENT",
    }
    accepted = _run_review_validator(sample, tmp_path / "outline-adoption-valid.json")
    assert accepted.returncode == 0, _review_validator_output(accepted)

    invalid = json.loads(json.dumps(sample))
    invalid["boundary_adjustment"]["base_baseline_id"] = "baseline-existing"
    rejected = _run_review_validator(invalid, tmp_path / "outline-adoption-invalid.json")
    assert rejected.returncode != 0
    assert "null base identity" in _review_validator_output(rejected)


def test_outline_discovery_schemas_keep_discovery_non_authorizing_and_structured(tmp_path):
    for path in (
        OUTLINE_DISCOVERY_SCHEMA,
        OUTLINE_DISCOVERY_RESPONSE_SCHEMA,
        OUTLINE_INTENT_LEDGER_SCHEMA,
    ):
        assert path.is_file(), path

    discovery = json.loads(OUTLINE_DISCOVERY_SCHEMA.read_text(encoding="utf-8"))
    assert discovery["properties"]["schema_version"] == {"const": 6}
    assert discovery["properties"]["review_type"] == {"const": "outline_discovery"}
    assert discovery["properties"]["interaction_mode"] == {"const": "discovery"}
    assert discovery["properties"]["outline_maturity"]["enum"] == ["explore", "frame"]
    assert discovery["properties"]["authorization_effect"] == {"const": "none"}
    assert {
        "decomposition_window",
        "source_inventory",
        "business_context",
        "constitution_snapshot",
        "density_budget",
        "maps",
        "outline_nodes",
    } <= set(discovery["required"])
    assert "capability_atoms" in discovery["properties"]["business_context"]["required"]
    assert {
        "responsibility_owners",
        "business_lifecycles",
        "business_states",
    } <= set(discovery["properties"]["business_context"]["required"])
    assert "trigger_kind" in discovery["$defs"]["capability_atom"]["required"]
    assert discovery["$defs"]["capability_atom"]["properties"]["trigger_kind"]["enum"] == [
        "business_event",
        "exception_or_interruption",
        "governance_change",
    ]
    assert {
        "trigger_or_input",
        "owned_state",
        "primary_outcome_ref",
        "downstream_handoff",
    } <= set(discovery["$defs"]["capability_atom"]["required"])
    assert {
        "chain_kind",
        "trigger_kind",
        "owned_state",
        "primary_outcome_ref",
        "downstream_handoff",
    } <= set(discovery["$defs"]["business_chain"]["required"])
    assert discovery["properties"]["constitution_snapshot"]["properties"]["display_mode"] == {"const": "read_only"}
    assert discovery["properties"]["constitution_snapshot"]["properties"]["application_scope"] == {"const": "governance_only"}
    constitution_path = discovery["properties"]["constitution_snapshot"]["properties"]["source_path"]
    assert constitution_path["pattern"] == r"^(?!/)(?![A-Za-z]:/)(?!\.\.?(?:/|$))(?!.*\/\.\.?(?:/|$))(?!.*//)[^/]+(?:/[^/]+)*$"
    assert "business_chain_refs" in discovery["$defs"]["outline_node"]["properties"]
    assert "capability_atom_refs" in discovery["$defs"]["outline_node"]["properties"]
    assert "aggregation_basis" not in discovery["$defs"]["outline_node"]["properties"]
    decomposition_window = discovery["$defs"]["decomposition_window"]
    assert set(decomposition_window["required"]) == {
        "expansion_root_node_id",
        "root_project_feature",
        "root_project_depth",
        "generation_mode",
        "generated_depth",
        "depth_decision_reason",
        "parent_path",
        "units",
        "frontier_unit_ids",
        "terminal_unit_ids",
    }
    outline_unit = discovery["$defs"]["outline_unit"]
    assert {
        "unit_id",
        "outline_node_id",
        "parent_unit_id",
        "project_depth",
        "decomposition_state",
        "business_goal",
        "overall_outcome",
        "capability_atom_refs",
        "business_chain_refs",
        "source_status",
        "source_refs",
    } <= set(outline_unit["required"])
    grouping_basis = discovery["$defs"]["grouping_basis"]
    assert set(grouping_basis["required"]) == {
        "authority",
        "shared_business_goal",
        "shared_responsibility_owner_ref",
        "shared_lifecycle_ref",
        "parent_cohesion",
        "separation_test",
        "source_refs",
    }
    assert grouping_basis["properties"]["authority"]["enum"] == [
        "user",
        "user-confirmed",
        "doc",
        "ai-proposed",
        "unresolved",
    ]
    assert grouping_basis["properties"]["parent_cohesion"]["minLength"] == 20
    assert "decomposition_basis" in discovery["$defs"]
    assert "terminal_basis" in discovery["$defs"]
    assert "constitution_clause_refs" in discovery["$defs"]["outline_node"]["properties"]
    assert discovery["properties"]["density_budget"]["properties"] == {
        "max_visible_nodes_per_map": {"const": 18},
        "max_depth": {"const": 3},
        "layer_balance_min_nodes": {"const": 8},
        "max_layer_share": {"const": 0.6},
    }
    question = discovery["$defs"]["question"]
    assert "outline_node_id" in question["required"]
    assert question["properties"]["selection_mode"] == {"const": "single"}
    assert question["properties"]["candidates"]["minItems"] == 2
    assert question["properties"]["candidates"]["maxItems"] == 4
    assert "business_chain_refs" in discovery["$defs"]["candidate"]["required"]
    assert "capability_atom_refs" in discovery["$defs"]["candidate"]["required"]
    assert question["properties"]["recommended_candidate_ids"]["minItems"] == 1
    assert question["properties"]["recommended_candidate_ids"]["maxItems"] == 1
    assert {
        "recommended_candidate_ids",
        "recommendation_reason",
        "allow_none_of_the_above",
        "free_input",
    } <= set(question["required"])
    assert question["properties"]["allow_none_of_the_above"] == {"const": True}
    operations = question["properties"]["free_input"]["properties"]["allowed_operations"]
    assert operations["minItems"] == operations["maxItems"] == 5
    assert set(operations["items"]["enum"]) == {
        "confirm_candidate",
        "add",
        "replace",
        "exclude",
        "context_note",
    }

    response = json.loads(OUTLINE_DISCOVERY_RESPONSE_SCHEMA.read_text(encoding="utf-8"))
    assert response["properties"]["schema_version"] == {"enum": [3, 4, 5, 6]}
    assert response["properties"]["format"] == {"const": "speccompass-outline-discovery-response"}
    assert response["properties"]["authorization_effect"] == {"const": "none"}
    assert response["properties"]["next_route"] == {"const": "/sp.prd"}
    assert response["$defs"]["delta"]["properties"]["operation"]["enum"] == [
        "confirm_candidate",
        "add",
        "replace",
        "exclude",
        "context_note",
    ]
    assert "outline_node_id" in response["$defs"]["delta"]["required"]
    response_package = (
        REVIEW_ROOT / "renderer" / "scripts" / "discovery-response-package.js"
    ).read_text(encoding="utf-8")
    assert "schema_version: reviewData.schema_version" in response_package
    simple_overlays = (
        REVIEW_ROOT / "renderer" / "scripts" / "simple-overlays.js"
    ).read_text(encoding="utf-8")
    assert "new Set([1, 2, 3, 4, 5, 6])" in simple_overlays

    ledger = json.loads(OUTLINE_INTENT_LEDGER_SCHEMA.read_text(encoding="utf-8"))
    assert ledger["properties"]["schema_version"] == {"const": 3}
    assert ledger["properties"]["format"] == {"const": "speccompass-outline-intent-ledger"}
    assert ledger["properties"]["events"]["items"]["$ref"] == "#/$defs/event"
    assert "supersedes_delta_id" in ledger["$defs"]["event"]["properties"]
    assert "outline_node_id" in ledger["$defs"]["event"]["required"]

    accepted = _run_review_validator(_outline_discovery_validator_sample(), tmp_path / "discovery-valid.json")
    assert accepted.returncode == 0, _review_validator_output(accepted)


def test_outline_discovery_v4_accepts_top_level_one_layer_window(tmp_path):
    result = _run_review_validator(
        _outline_discovery_v4_root_sample(),
        tmp_path / "discovery-v4-root-valid.json",
    )
    assert result.returncode == 0, _review_validator_output(result)
    assert "compatibility validation only" in _review_validator_output(result)


def test_outline_discovery_v5_accepts_complete_source_state_and_separation_evidence(tmp_path):
    result = _run_review_validator(
        _outline_discovery_v5_multi_atom_child_sample(),
        tmp_path / "discovery-v5-valid.json",
    )
    assert result.returncode == 0, _review_validator_output(result)


def test_outline_discovery_v6_accepts_source_backed_coupling_contract(tmp_path):
    result = _run_review_validator(
        _outline_discovery_v6_multi_atom_child_sample(),
        tmp_path / "discovery-v6-valid.json",
    )
    assert result.returncode == 0, _review_validator_output(result)


def test_outline_discovery_v6_rejects_used_source_without_structured_evidence(tmp_path):
    sample = _outline_discovery_v6_multi_atom_child_sample()
    sample["source_inventory"]["entries"][0].pop("evidence_refs")
    result = _run_review_validator(sample, tmp_path / "discovery-v6-no-evidence.json")
    assert result.returncode != 0
    assert "evidence_refs" in _review_validator_output(result)


def test_outline_discovery_v6_rejects_group_without_cross_partition_invariant(tmp_path):
    sample = _outline_discovery_v6_multi_atom_child_sample()
    child = next(
        unit
        for unit in sample["decomposition_window"]["units"]
        if unit["project_depth"] > sample["decomposition_window"]["root_project_depth"]
        and len(unit["capability_atom_refs"]) > 1
    )
    child["grouping_basis"].pop("coupling_invariants")
    result = _run_review_validator(sample, tmp_path / "discovery-v6-no-invariant.json")
    assert result.returncode != 0
    assert "coupling_invariants" in _review_validator_output(result)


def test_outline_discovery_v6_rejects_inconsistent_handoff_atom_direction(tmp_path):
    sample = _outline_discovery_v6_multi_atom_child_sample()
    child = next(
        unit
        for unit in sample["decomposition_window"]["units"]
        if unit["project_depth"] > sample["decomposition_window"]["root_project_depth"]
        and len(unit["capability_atom_refs"]) > 1
    )
    child["grouping_basis"]["separation_test"]["stable_handoffs"][0]["to_atom_ref"] = "atom-risk-decision"
    result = _run_review_validator(sample, tmp_path / "discovery-v6-wrong-handoff.json")
    assert result.returncode != 0
    assert "atom direction" in _review_validator_output(result)


def test_outline_discovery_v6_rejects_compound_capability_atom(tmp_path):
    sample = _outline_discovery_v6_multi_atom_child_sample()
    atom = next(atom for atom in sample["business_context"]["capability_atoms"] if atom["atom_id"] == "atom-controlled-order")
    atom["label"] = "订单、成交与持仓风险保护"
    atom["owned_state"] = "订单、成交与持仓风险状态"
    coverage = next(item for item in sample["business_context"]["source_capability_coverage"] if item["capability_atom_ref"] == atom["atom_id"])
    coverage["label"] = atom["label"]
    coverage["owned_state"] = atom["owned_state"]
    result = _run_review_validator(sample, tmp_path / "discovery-v6-compound-atom.json")
    assert result.returncode != 0
    assert "enumerate multiple responsibilities" in _review_validator_output(result)


def test_outline_discovery_rejects_feature_prd_proposal_authority_laundering(tmp_path):
    sample = _outline_discovery_v5_root_sample()
    project_root = tmp_path / "project"
    feature_prd = project_root / "specs" / "000-outline" / "prd.md"
    feature_prd.parent.mkdir(parents=True)
    feature_prd.write_text(
        "# PRD\n\n## Core Trading Loop\n\n正式交易事实。[src:doc]\n\n"
        "## Proposed Owner\n\n模型建议由宽泛交易负责人统一拥有。[src:ai-proposed]\n",
        encoding="utf-8",
    )
    sample["source_snapshot"][0]["anchors"].append("Proposed Owner")
    owner = sample["business_context"]["responsibility_owners"][0]
    owner["source_status"] = "doc"
    owner["source_refs"] = ["specs/000-outline/prd.md#Proposed Owner"]
    review_path = project_root / sample["artifact_path"]
    review_path.parent.mkdir(parents=True, exist_ok=True)
    review_path.write_text(json.dumps(sample, ensure_ascii=False), encoding="utf-8")

    result = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(review_path)],
        cwd=project_root,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )

    assert result.returncode != 0
    output = _review_validator_output(result)
    assert "contains [src:ai-proposed]" in output
    assert "responsibility_owners" in output


def test_outline_discovery_v5_requires_source_inventory(tmp_path):
    sample = _outline_discovery_v5_root_sample()
    sample.pop("source_inventory")
    result = _run_review_validator(sample, tmp_path / "discovery-v5-no-inventory.json")
    assert result.returncode != 0
    assert "schema_version 5 or later requires source_inventory" in _review_validator_output(result)


def test_outline_discovery_v5_rejects_atom_with_multiple_owned_states(tmp_path):
    sample = _outline_discovery_v5_multi_atom_child_sample()
    atom = next(atom for atom in sample["business_context"]["capability_atoms"] if atom["atom_id"] == "atom-controlled-order")
    atom["owned_state_refs"] = ["state-controlled-order", "state-risk-decision"]
    result = _run_review_validator(sample, tmp_path / "discovery-v5-mixed-state-atom.json")
    assert result.returncode != 0
    assert "must reference exactly one business_state" in _review_validator_output(result)


def test_outline_discovery_v5_rejects_group_without_shared_owner_or_lifecycle(tmp_path):
    sample = _outline_discovery_v5_multi_atom_child_sample()
    context = sample["business_context"]
    context["responsibility_owners"].append(
        {
            "owner_id": "owner-risk-review",
            "label": "风险审核责任",
            "accountability": "独立裁定交易意图是否满足风险规则并记录拒绝原因。",
            "source_status": "doc",
            "source_refs": ["specs/000-outline/prd.md#Core Trading Loop"],
        }
    )
    context["business_lifecycles"].append(
        {
            "lifecycle_id": "lifecycle-risk-review",
            "label": "交易意图风险审核生命周期",
            "trigger_or_input": "交易意图进入独立风险审核",
            "completion_condition": "形成可追溯的风险放行决定或阻断事实。",
            "source_status": "doc",
            "source_refs": ["specs/000-outline/prd.md#Core Trading Loop"],
        }
    )
    risk_state = next(state for state in context["business_states"] if state["state_id"] == "state-risk-decision")
    risk_state["responsibility_owner_ref"] = "owner-risk-review"
    risk_state["lifecycle_ref"] = "lifecycle-risk-review"
    coverage = next(item for item in context["source_capability_coverage"] if item["capability_atom_ref"] == "atom-risk-decision")
    coverage["responsibility_owner_ref"] = "owner-risk-review"
    coverage["lifecycle_ref"] = "lifecycle-risk-review"
    result = _run_review_validator(sample, tmp_path / "discovery-v5-no-shared-boundary.json")
    assert result.returncode != 0
    assert "must be shared by every grouped atom" in _review_validator_output(result)


def test_outline_discovery_v5_rejects_incomplete_separation_partition(tmp_path):
    sample = _outline_discovery_v5_multi_atom_child_sample()
    child = sample["decomposition_window"]["units"][1]
    groups = child["grouping_basis"]["separation_test"]["alternative_groups"]
    groups[1]["capability_atom_refs"] = ["atom-controlled-order"]
    result = _run_review_validator(sample, tmp_path / "discovery-v5-incomplete-separation.json")
    assert result.returncode != 0
    assert "must partition every grouped atom exactly once" in _review_validator_output(result)


def test_outline_discovery_v5_rejects_incomplete_source_capability_coverage(tmp_path):
    def duplicate_id(sample):
        duplicate = json.loads(json.dumps(sample["business_context"]["source_capability_coverage"][0]))
        sample["business_context"]["source_capability_coverage"].append(duplicate)

    def unknown_evidence_gap(sample):
        coverage = sample["business_context"]["source_capability_coverage"][0]
        coverage["disposition"] = "evidence_gap"
        coverage["evidence_gap_ref"] = "gap-missing"
        for key in ("capability_atom_ref", "business_state_ref", "responsibility_owner_ref", "lifecycle_ref"):
            coverage.pop(key, None)

    cases = (
        ("duplicate-id", duplicate_id, "duplicate source_capability_id"),
        (
            "unknown-source-ref",
            lambda sample: sample["business_context"]["source_capability_coverage"][0].update(
                {"source_refs": ["specs/000-outline/missing.md#Unknown"]}
            ),
            "source_refs must reference source_snapshot and its declared anchors",
        ),
        ("unknown-gap", unknown_evidence_gap, "does not reference a known evidence gap"),
    )
    for name, mutate, expected in cases:
        sample = _outline_discovery_v5_root_sample()
        mutate(sample)
        result = _run_review_validator(sample, tmp_path / f"discovery-v5-coverage-{name}.json")
        assert result.returncode != 0, name
        assert expected in _review_validator_output(result), name


def test_outline_discovery_v5_requires_exact_atom_coverage_at_frame_maturity(tmp_path):
    sample = _outline_discovery_v5_root_sample()
    sample["outline_maturity"] = "frame"
    duplicate = json.loads(json.dumps(sample["business_context"]["source_capability_coverage"][0]))
    duplicate["source_capability_id"] = "source-controlled-order-duplicate"
    sample["business_context"]["source_capability_coverage"].append(duplicate)

    result = _run_review_validator(sample, tmp_path / "discovery-v5-frame-duplicate-coverage.json")

    assert result.returncode != 0
    assert "every v5 atom requires exactly one source capability coverage entry" in _review_validator_output(result)


def test_outline_discovery_v5_requires_handoffs_for_every_non_root_multi_atom_unit(tmp_path):
    child_sample = _outline_discovery_v5_multi_atom_child_sample()
    child_sample["decomposition_window"]["units"][1]["grouping_basis"]["separation_test"]["stable_handoffs"] = []
    child_result = _run_review_validator(child_sample, tmp_path / "discovery-v5-child-no-handoff.json")
    assert child_result.returncode != 0
    assert "at least one stable business handoff" in _review_validator_output(child_result)

    top_level_sample = _outline_discovery_v5_multi_atom_child_sample()
    top_level_sample["decomposition_window"]["units"][0]["grouping_basis"]["separation_test"]["stable_handoffs"] = []
    top_level_result = _run_review_validator(top_level_sample, tmp_path / "discovery-v5-root-no-handoff.json")
    assert top_level_result.returncode == 0, _review_validator_output(top_level_result)

    nested_sample = _outline_discovery_v5_non_root_multi_atom_sample()
    window = nested_sample["decomposition_window"]
    window["units"][0]["grouping_basis"]["separation_test"]["stable_handoffs"] = []
    nested_result = _run_review_validator(nested_sample, tmp_path / "discovery-v5-nested-root-no-handoff.json")
    assert nested_result.returncode != 0
    assert "at least one stable business handoff" in _review_validator_output(nested_result)


def test_outline_discovery_v5_duplicate_source_must_point_directly_to_canonical_entry(tmp_path):
    sample = _outline_discovery_v5_root_sample()
    sample["source_inventory"]["roots"].append(
        {"path": "prd", "root_kind": "directory", "source_origin": "human-specified"}
    )
    sample["source_inventory"]["entries"].extend(
        [
            {
                "path": "prd/canonical.md",
                "disposition": "reviewed_no_capability",
                "rationale": "该文件已完整检查，内容与当前业务边界无关，可作为重复文件的规范来源。",
            },
            {
                "path": "prd/duplicate-a.md",
                "disposition": "duplicate",
                "rationale": "该文件与已检查的规范来源逐段一致，不产生新的业务能力或约束。",
                "duplicate_of": "prd/canonical.md",
            },
        ]
    )
    valid_result = _run_review_validator(sample, tmp_path / "discovery-v5-direct-duplicate.json")
    assert valid_result.returncode == 0, _review_validator_output(valid_result)

    chained = json.loads(json.dumps(sample))
    chained["source_inventory"]["entries"].append(
        {
            "path": "prd/duplicate-b.md",
            "disposition": "duplicate",
            "rationale": "该文件虽然内容重复，但这里故意指向另一个重复项以验证链式引用会被拒绝。",
            "duplicate_of": "prd/duplicate-a.md",
        }
    )
    chained_result = _run_review_validator(chained, tmp_path / "discovery-v5-chained-duplicate.json")
    assert chained_result.returncode != 0
    assert "must point directly to a used or reviewed_no_capability entry" in _review_validator_output(chained_result)


def test_outline_discovery_v5_normalizes_inventory_paths_in_evidence_gaps(tmp_path):
    sample = _outline_discovery_v5_root_sample()
    sample["source_inventory"]["roots"].append(
        {"path": "prd", "root_kind": "directory", "source_origin": "human-specified"}
    )
    sample["source_inventory"]["entries"].append(
        {
            "path": "prd/unreadable.md",
            "disposition": "unreadable",
            "rationale": "该文件当前无法读取，必须保留证据缺口并等待人工恢复来源后重新分析。",
            "evidence_gap_ref": "gap-unreadable-source",
        }
    )
    sample["business_context"]["evidence_gaps"].append(
        {
            "gap_id": "gap-unreadable-source",
            "summary": "等待恢复无法读取的业务来源文件。",
            "source_inventory_refs": ["prd\\unreadable.md"],
        }
    )

    result = _run_review_validator(sample, tmp_path / "discovery-v5-normalized-gap-path.json")

    assert result.returncode == 0, _review_validator_output(result)


def test_outline_discovery_v5_rejects_density_merge_reason_inside_grouping_basis(tmp_path):
    sample = _outline_discovery_v5_multi_atom_child_sample()
    sample["decomposition_window"]["units"][1]["grouping_basis"]["separation_test"]["decision_reason"] = (
        "为满足密度预算，当前只提出三个候选并把独立能力合并为一个分支。"
    )

    result = _run_review_validator(sample, tmp_path / "discovery-v5-density-in-grouping.json")

    assert result.returncode != 0
    assert "density-merge boilerplate" in _review_validator_output(result)


def test_outline_discovery_v5_cli_rejects_file_omitted_from_effective_source_root(tmp_path):
    sample = _outline_discovery_v5_root_sample()
    project_root = tmp_path / "project"
    source_dir = project_root / "prd"
    source_dir.mkdir(parents=True)
    (source_dir / "included.md").write_text("# Included\n", encoding="utf-8")
    (source_dir / "omitted.md").write_text("# Omitted\n", encoding="utf-8")
    feature_prd = project_root / "specs" / "000-outline" / "prd.md"
    feature_prd.parent.mkdir(parents=True)
    feature_prd.write_text("# PRD\n\n## Core Trading Loop\n\n受控交易闭环。\n", encoding="utf-8")
    sample["source_inventory"]["roots"].insert(
        0,
        {"path": "prd", "root_kind": "directory", "source_origin": "default-prd"},
    )
    sample["source_inventory"]["entries"].insert(
        0,
        {
            "path": "prd/included.md",
            "disposition": "reviewed_no_capability",
            "rationale": "该文件只有测试标题，不包含当前产品范围内可形成业务能力的事实。",
        },
    )
    review_path = project_root / sample["artifact_path"]
    review_path.parent.mkdir(parents=True)
    review_path.write_text(json.dumps(sample, ensure_ascii=False), encoding="utf-8")
    result = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(review_path)],
        cwd=project_root,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )
    assert result.returncode != 0
    assert "source_inventory omitted file from effective source roots: prd/omitted.md" in _review_validator_output(result)


def test_outline_discovery_v4_accepts_documented_multi_atom_child(tmp_path):
    result = _run_review_validator(
        _outline_discovery_v4_multi_atom_child_sample(),
        tmp_path / "discovery-v4-documented-grouping.json",
    )
    assert result.returncode == 0, _review_validator_output(result)


def test_outline_discovery_v4_accepts_reasoned_model_multi_atom_child(tmp_path):
    sample = _outline_discovery_v4_multi_atom_child_sample(grouping_authority="ai-proposed")
    result = _run_review_validator(sample, tmp_path / "discovery-v4-ai-grouping.json")
    assert result.returncode == 0, _review_validator_output(result)

    sample = _outline_discovery_v4_multi_atom_child_sample(child_source_status="ai-proposed")
    result = _run_review_validator(sample, tmp_path / "discovery-v4-ai-grouped-unit.json")
    assert result.returncode == 0, _review_validator_output(result)


def test_outline_discovery_v4_rejects_unresolved_multi_atom_child(tmp_path):
    sample = _outline_discovery_v4_multi_atom_child_sample(grouping_authority="unresolved")
    result = _run_review_validator(sample, tmp_path / "discovery-v4-unresolved-grouping.json")
    assert result.returncode != 0
    assert "grouping_basis" in _review_validator_output(result)


def test_outline_discovery_v4_accepts_non_root_two_layer_window(tmp_path):
    result = _run_review_validator(
        _outline_discovery_v4_non_root_sample(),
        tmp_path / "discovery-v4-non-root-valid.json",
    )
    assert result.returncode == 0, _review_validator_output(result)


def test_outline_discovery_v4_rejects_top_level_grandchildren(tmp_path):
    sample = _outline_discovery_v4_root_sample()
    window = sample["decomposition_window"]
    child = window["units"][1]
    child["decomposition_state"] = "expanded"
    child["decomposition_basis"] = json.loads(json.dumps(window["units"][0]["decomposition_basis"]))
    child.pop("terminal_basis")
    leaf = json.loads(json.dumps(child))
    leaf.update(
        {
            "unit_id": "unit-grandchild",
            "outline_node_id": "node-trading-root",
            "parent_unit_id": child["unit_id"],
            "project_depth": 2,
            "decomposition_state": "terminal",
            "terminal_basis": json.loads(json.dumps(_outline_discovery_v4_non_root_sample()["decomposition_window"]["units"][-1]["terminal_basis"])),
        }
    )
    leaf.pop("decomposition_basis")
    window["units"].append(leaf)
    window["generated_depth"] = 2
    window["terminal_unit_ids"] = [leaf["unit_id"]]

    result = _run_review_validator(sample, tmp_path / "discovery-v4-root-too-deep.json")
    assert result.returncode != 0
    assert "000 top Outline unit must generate exactly one direct descendant level" in _review_validator_output(result)


def test_outline_discovery_v4_rejects_short_non_root_window_with_frontier(tmp_path):
    sample = _outline_discovery_v4_non_root_sample()
    window = sample["decomposition_window"]
    window["units"] = window["units"][:2]
    child = window["units"][1]
    child["decomposition_state"] = "frontier"
    child.pop("decomposition_basis")
    window["generated_depth"] = 1
    window["frontier_unit_ids"] = [child["unit_id"]]
    window["terminal_unit_ids"] = []

    result = _run_review_validator(sample, tmp_path / "discovery-v4-non-root-too-shallow.json")
    assert result.returncode != 0
    assert "must generate two or three levels unless every branch terminates earlier" in _review_validator_output(result)


def test_outline_discovery_v4_allows_early_stop_when_current_root_is_terminal(tmp_path):
    sample = _outline_discovery_v4_non_root_sample()
    window = sample["decomposition_window"]
    root = window["units"][0]
    root["decomposition_state"] = "terminal"
    root["terminal_basis"] = json.loads(json.dumps(window["units"][-1]["terminal_basis"]))
    root.pop("decomposition_basis")
    window["units"] = [root]
    window["generated_depth"] = 0
    window["frontier_unit_ids"] = []
    window["terminal_unit_ids"] = [root["unit_id"]]
    sample["outline_nodes"] = [
        node for node in sample["outline_nodes"] if node["node_id"] != "node-data"
    ]

    result = _run_review_validator(sample, tmp_path / "discovery-v4-early-terminal.json")
    assert result.returncode == 0, _review_validator_output(result)


@pytest.mark.parametrize(
    ("mutation", "expected"),
    [
        (
            lambda sample: sample["decomposition_window"]["units"][0].update({"business_goal": ""}),
            "business_goal is required",
        ),
        (
            lambda sample: sample["decomposition_window"]["units"][1].pop("terminal_basis"),
            "terminal_basis is required",
        ),
    ],
)
def test_outline_discovery_v4_requires_unit_content_and_state_basis(tmp_path, mutation, expected):
    sample = _outline_discovery_v4_root_sample()
    mutation(sample)
    result = _run_review_validator(sample, tmp_path / f"discovery-v4-required-{expected.split()[0]}.json")
    assert result.returncode != 0
    assert expected in _review_validator_output(result)


def test_outline_discovery_v4_rejects_frontier_with_premature_terminal_basis(tmp_path):
    sample = _outline_discovery_v4_root_sample()
    window = sample["decomposition_window"]
    child = window["units"][1]
    child["decomposition_state"] = "frontier"
    window["frontier_unit_ids"] = [child["unit_id"]]
    window["terminal_unit_ids"] = []

    result = _run_review_validator(sample, tmp_path / "discovery-v4-frontier-basis.json")
    assert result.returncode != 0
    assert "frontier units must not claim a decomposition or terminal decision" in _review_validator_output(result)


def test_outline_discovery_v4_rejects_overlapping_sibling_coverage(tmp_path):
    sample = _outline_discovery_v4_root_sample()
    window = sample["decomposition_window"]
    sibling = json.loads(json.dumps(window["units"][1]))
    sibling.update({"unit_id": "unit-overlap", "outline_node_id": "node-trading-root"})
    window["units"].append(sibling)
    window["terminal_unit_ids"].append(sibling["unit_id"])

    result = _run_review_validator(sample, tmp_path / "discovery-v4-overlap.json")
    assert result.returncode != 0
    assert "must not overlap capability atom" in _review_validator_output(result)


def test_outline_discovery_v4_requires_grouping_basis_for_multi_atom_unit(tmp_path):
    sample = _outline_discovery_v4_root_sample()
    _add_second_atom_to_current_level_one_project(sample)
    project_link = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    project_link.pop("aggregation_basis")
    for unit in sample["decomposition_window"]["units"]:
        unit["capability_atom_refs"].append("atom-risk-decision")
        unit["business_chain_refs"].append("chain-risk-decision")

    result = _run_review_validator(sample, tmp_path / "discovery-v4-missing-grouping.json")
    assert result.returncode != 0
    assert "grouping_basis is required" in _review_validator_output(result)


def test_outline_discovery_v4_accepts_detail_only_for_confirmed_terminal(tmp_path):
    sample = _outline_discovery_v4_non_root_sample()
    window = sample["decomposition_window"]
    root = json.loads(json.dumps(window["units"][-1]))
    root["parent_unit_id"] = None
    window.update(
        {
            "expansion_root_node_id": root["outline_node_id"],
            "root_project_depth": 3,
            "generation_mode": "detail",
            "generated_depth": 0,
            "parent_path": [
                {"unit_id": "unit-portfolio", "label": "量化交易工作台", "project_depth": 0},
                {"unit_id": "unit-current", "label": "交易闭环", "project_depth": 1},
                {"unit_id": "unit-child", "label": "交易意图裁定", "project_depth": 2},
            ],
            "units": [root],
            "frontier_unit_ids": [],
            "terminal_unit_ids": [root["unit_id"]],
        }
    )
    sample["outline_maturity"] = "frame"

    accepted = _run_review_validator(sample, tmp_path / "discovery-v4-detail-valid.json")
    assert accepted.returncode == 0, _review_validator_output(accepted)

    sample["decomposition_window"]["units"][0]["terminal_basis"]["source_status"] = "ai-proposed"
    rejected = _run_review_validator(sample, tmp_path / "discovery-v4-detail-unconfirmed.json")
    assert rejected.returncode != 0
    assert "detail framing requires a documented or human-confirmed terminal_basis" in _review_validator_output(rejected)


def test_outline_discovery_v4_rejects_unit_source_ref_outside_snapshot(tmp_path):
    sample = _outline_discovery_v4_root_sample()
    sample["decomposition_window"]["units"][1]["source_refs"] = [
        "specs/000-outline/prd.md#Missing Heading"
    ]
    result = _run_review_validator(sample, tmp_path / "discovery-v4-invalid-source-ref.json")
    assert result.returncode != 0
    assert "source_refs must reference source_snapshot and its declared anchors" in _review_validator_output(result)


def test_outline_discovery_v4_rejects_detail_nodes_hidden_in_decompose_maps(tmp_path):
    sample = _outline_discovery_v4_root_sample()
    source = _outline_discovery_validator_sample()
    detail_node = json.loads(json.dumps(next(
        node for node in source["outline_nodes"] if node["node_id"] == "node-data"
    )).replace("001-outline", "000-outline"))
    sample["outline_nodes"].append(detail_node)

    result = _run_review_validator(sample, tmp_path / "discovery-v4-hidden-detail.json")
    assert result.returncode != 0
    assert "move detail node node-data to the terminal unit's detail window" in _review_validator_output(result)


def test_outline_discovery_v4_rejects_cycles_and_browser_duplicate_window_ids(tmp_path):
    sample = _outline_discovery_v4_root_sample()
    root, child = sample["decomposition_window"]["units"]
    root["parent_unit_id"] = child["unit_id"]
    root["project_depth"] = 2
    child["parent_unit_id"] = root["unit_id"]
    child["project_depth"] = 3
    result = _run_review_validator(sample, tmp_path / "discovery-v4-cycle.json")
    assert result.returncode != 0
    assert "must not contain parent cycles" in _review_validator_output(result)

    if shutil.which("node") is None:
        pytest.skip("node is required for renderer runtime tests")
    overlays = REVIEW_ROOT / "renderer" / "scripts" / "simple-overlays.js"
    state_store = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    data_validator = REVIEW_ROOT / "renderer" / "scripts" / "data-validator.js"
    valid_sample = _outline_discovery_v4_root_sample()
    documented_grouping = _outline_discovery_v4_multi_atom_child_sample()
    model_grouping = _outline_discovery_v4_multi_atom_child_sample(grouping_authority="ai-proposed")
    unresolved_grouping = _outline_discovery_v4_multi_atom_child_sample(grouping_authority="unresolved")
    v5_grouping = _outline_discovery_v5_multi_atom_child_sample()
    nested_v5_grouping = _outline_discovery_v5_non_root_multi_atom_sample()
    detail_source = _outline_discovery_validator_sample()
    forbidden_detail = json.loads(json.dumps(next(
        node for node in detail_source["outline_nodes"] if node["node_id"] == "node-data"
    )).replace("001-outline", "000-outline"))
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = [
  {json.dumps(str(overlays))},
  {json.dumps(str(state_store))},
  {json.dumps(str(data_validator))}
].map((path) => fs.readFileSync(path, "utf8")).join(String.fromCharCode(10));
const context = {{
  window: {{ SpecCompassDom: {{}} }},
  localStorage: {{ setItem: () => undefined, removeItem: () => undefined, getItem: () => null }},
  console
}};
vm.createContext(context);
vm.runInContext(source, context);
const valid = {json.dumps(valid_sample, ensure_ascii=False)};
if (context.validateReviewData(valid) !== "") throw new Error("valid v4 discovery rejected");
const documentedGrouping = {json.dumps(documented_grouping, ensure_ascii=False)};
if (context.validateReviewData(documentedGrouping) !== "") throw new Error("documented grouping rejected");
const modelGrouping = {json.dumps(model_grouping, ensure_ascii=False)};
if (context.validateReviewData(modelGrouping) !== "") throw new Error("reasoned model grouping rejected");
const unresolvedGrouping = {json.dumps(unresolved_grouping, ensure_ascii=False)};
const groupingError = context.validateReviewData(unresolvedGrouping);
if (!groupingError.includes("unresolved") || !groupingError.includes("Web Discovery")) {{
  throw new Error("unresolved multi-atom grouping was not rejected: " + groupingError);
}}
const v5Grouping = {json.dumps(v5_grouping, ensure_ascii=False)};
const nestedV5Grouping = {json.dumps(nested_v5_grouping, ensure_ascii=False)};
const v5Error = context.validateReviewData(v5Grouping);
if (v5Error !== "") throw new Error("valid v5 discovery rejected: " + v5Error);
const unanchoredFeatureAuthority = structuredClone(v5Grouping);
unanchoredFeatureAuthority.business_context.responsibility_owners[0].source_refs = ["specs/000-outline/prd.md"];
const unanchoredFeatureAuthorityError = context.validateReviewData(unanchoredFeatureAuthority);
if (!unanchoredFeatureAuthorityError.includes("feature PRD")) throw new Error("unanchored feature PRD authority was not rejected: " + unanchoredFeatureAuthorityError);
const v6Grouping = {json.dumps(_outline_discovery_v6_multi_atom_child_sample(), ensure_ascii=False)};
const v6Error = context.validateReviewData(v6Grouping);
if (v6Error !== "") throw new Error("valid v6 discovery rejected: " + v6Error);
const v6NoEvidence = structuredClone(v6Grouping);
v6NoEvidence.source_inventory.entries[0].evidence_refs = [];
const v6NoEvidenceError = context.validateReviewData(v6NoEvidence);
if (!v6NoEvidenceError.includes("evidence_refs")) throw new Error("v6 source evidence omission was not rejected: " + v6NoEvidenceError);
const v6NoInvariant = structuredClone(v6Grouping);
const v6GroupedChild = v6NoInvariant.decomposition_window.units.find((unit) =>
  unit.project_depth > v6NoInvariant.decomposition_window.root_project_depth && unit.capability_atom_refs.length > 1
);
if (!v6GroupedChild) throw new Error("v6 fixture is missing a generated grouped child");
v6GroupedChild.grouping_basis.coupling_invariants = [];
const v6NoInvariantError = context.validateReviewData(v6NoInvariant);
if (!v6NoInvariantError.includes("耦合不变量")) throw new Error("v6 missing coupling invariant was not rejected: " + v6NoInvariantError);
const incompleteV5 = structuredClone(v5Grouping);
incompleteV5.decomposition_window.units[1].grouping_basis.separation_test.alternative_groups[1].capability_atom_refs = ["atom-controlled-order"];
const incompleteV5Error = context.validateReviewData(incompleteV5);
if (!incompleteV5Error.includes("完整且不重叠")) throw new Error("incomplete v5 separation was not rejected: " + incompleteV5Error);
const missingInventoryV5 = structuredClone(v5Grouping);
missingInventoryV5.source_inventory.entries = [];
const missingInventoryError = context.validateReviewData(missingInventoryV5);
if (!missingInventoryError.includes("来源清单")) throw new Error("missing v5 source inventory was not rejected: " + missingInventoryError);
const duplicateCoverageId = structuredClone(v5Grouping);
duplicateCoverageId.business_context.source_capability_coverage[1].source_capability_id = duplicateCoverageId.business_context.source_capability_coverage[0].source_capability_id;
const duplicateCoverageIdError = context.validateReviewData(duplicateCoverageId);
if (!duplicateCoverageIdError.includes("覆盖 ID")) throw new Error("duplicate source capability ID was not rejected: " + duplicateCoverageIdError);
const invalidCoverageDisposition = structuredClone(v5Grouping);
invalidCoverageDisposition.business_context.source_capability_coverage[0].disposition = "merged";
const invalidCoverageDispositionError = context.validateReviewData(invalidCoverageDisposition);
if (!invalidCoverageDispositionError.includes("处置类型")) throw new Error("invalid source capability disposition was not rejected: " + invalidCoverageDispositionError);
const missingAtomCoverage = structuredClone(v5Grouping);
missingAtomCoverage.business_context.source_capability_coverage.pop();
const missingAtomCoverageError = context.validateReviewData(missingAtomCoverage);
if (!missingAtomCoverageError.includes("必须且只能")) throw new Error("missing atom coverage was not rejected: " + missingAtomCoverageError);
const duplicateAtomCoverage = structuredClone(v5Grouping);
const duplicateAtomEntry = duplicateAtomCoverage.business_context.source_capability_coverage[1];
duplicateAtomEntry.capability_atom_ref = "atom-controlled-order";
duplicateAtomEntry.business_state_ref = "state-controlled-order";
const duplicateAtomCoverageError = context.validateReviewData(duplicateAtomCoverage);
if (!duplicateAtomCoverageError.includes("必须且只能")) throw new Error("duplicate atom coverage was not rejected: " + duplicateAtomCoverageError);
const unknownGapCoverage = structuredClone(v5Grouping);
const unknownGapEntry = unknownGapCoverage.business_context.source_capability_coverage[0];
unknownGapEntry.disposition = "evidence_gap";
unknownGapEntry.evidence_gap_ref = "gap-missing";
delete unknownGapEntry.capability_atom_ref;
delete unknownGapEntry.business_state_ref;
delete unknownGapEntry.responsibility_owner_ref;
delete unknownGapEntry.lifecycle_ref;
const unknownGapCoverageError = context.validateReviewData(unknownGapCoverage);
if (!unknownGapCoverageError.includes("现有证据缺口")) throw new Error("unknown evidence gap coverage was not rejected: " + unknownGapCoverageError);
const badCoverageSource = structuredClone(v5Grouping);
badCoverageSource.business_context.source_capability_coverage[0].source_refs = ["specs/000-outline/missing.md#Unknown"];
const badCoverageSourceError = context.validateReviewData(badCoverageSource);
if (!badCoverageSourceError.includes("来源快照")) throw new Error("bad coverage source ref was not rejected: " + badCoverageSourceError);
const densityInGrouping = structuredClone(v5Grouping);
densityInGrouping.decomposition_window.units[1].grouping_basis.separation_test.decision_reason = "为满足密度预算，当前只提出三个候选并把独立能力合并为一个分支。";
const densityInGroupingError = context.validateReviewData(densityInGrouping);
if (!densityInGroupingError.includes("界面密度")) throw new Error("density merge in grouping evidence was not rejected: " + densityInGroupingError);
const childWithoutHandoff = structuredClone(v5Grouping);
childWithoutHandoff.decomposition_window.units[1].grouping_basis.separation_test.stable_handoffs = [];
const childWithoutHandoffError = context.validateReviewData(childWithoutHandoff);
if (!childWithoutHandoffError.includes("至少声明一个")) throw new Error("non-root child without handoff was not rejected: " + childWithoutHandoffError);
const topRootWithoutHandoff = structuredClone(v5Grouping);
topRootWithoutHandoff.decomposition_window.units[0].grouping_basis.separation_test.stable_handoffs = [];
const topRootWithoutHandoffError = context.validateReviewData(topRootWithoutHandoff);
if (topRootWithoutHandoffError !== "") throw new Error("top-level expansion root without handoff was rejected: " + topRootWithoutHandoffError);
const nestedRootWithoutHandoff = structuredClone(nestedV5Grouping);
nestedRootWithoutHandoff.decomposition_window.units[0].grouping_basis.separation_test.stable_handoffs = [];
const nestedRootWithoutHandoffError = context.validateReviewData(nestedRootWithoutHandoff);
if (!nestedRootWithoutHandoffError.includes("至少声明一个")) throw new Error("non-root expansion root without handoff was not rejected: " + nestedRootWithoutHandoffError);
const chainedDuplicate = structuredClone(v5Grouping);
chainedDuplicate.source_inventory.roots.push({{path: "prd", root_kind: "directory", source_origin: "human-specified"}});
chainedDuplicate.source_inventory.entries.push(
  {{path: "prd/duplicate-a.md", disposition: "duplicate", rationale: "该文件与功能 PRD 内容一致，用于验证规范来源直接引用规则。", duplicate_of: "specs/000-outline/prd.md"}},
  {{path: "prd/duplicate-b.md", disposition: "duplicate", rationale: "该文件故意指向另一个重复来源，用于验证链式重复引用会被拒绝。", duplicate_of: "prd/duplicate-a.md"}}
);
const chainedDuplicateError = context.validateReviewData(chainedDuplicate);
if (!chainedDuplicateError.includes("直接指向")) throw new Error("chained duplicate source was not rejected: " + chainedDuplicateError);
const duplicateIds = structuredClone(valid);
duplicateIds.decomposition_window.terminal_unit_ids.push("unit-trading-loop");
const duplicateError = context.validateReviewData(duplicateIds);
if (!duplicateError.includes("重复")) throw new Error("duplicate window ID was not rejected: " + duplicateError);
const cyclic = structuredClone(valid);
const units = cyclic.decomposition_window.units;
units[0].parent_unit_id = units[1].unit_id;
units[0].project_depth = 2;
units[1].parent_unit_id = units[0].unit_id;
units[1].project_depth = 3;
const cycleError = context.validateReviewData(cyclic);
if (!cycleError.includes("循环")) throw new Error("parent cycle was not rejected: " + cycleError);
const hiddenDetail = structuredClone(valid);
hiddenDetail.outline_nodes.push({json.dumps(forbidden_detail, ensure_ascii=False)});
const detailError = context.validateReviewData(hiddenDetail);
if (!detailError.includes("detail")) throw new Error("decompose detail node was not rejected: " + detailError);
"""
    browser = subprocess.run(["node", "-e", node_program], capture_output=True, text=True, check=False)
    assert browser.returncode == 0, browser.stderr or browser.stdout


def test_outline_discovery_rejects_generic_two_node_branch_skeleton(tmp_path):
    sample = _outline_discovery_validator_sample()
    sample["outline_nodes"] = [
        node for node in sample["outline_nodes"] if node["node_id"] != "node-data"
    ]
    scenario = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-strategy-risk")
    scenario.update(
        {
            "node_kind": "scenario",
            "label": "独立业务触发与状态",
            "summary": "触发：人工命令到达；候选拥有对应状态并保留异常处置。",
        }
    )
    acceptance = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-order")
    acceptance.update(
        {
            "label": "可观察交付结果",
            "summary": "可拒绝、可恢复、可审计的交易结果。",
        }
    )

    result = _run_review_validator(sample, tmp_path / "discovery-generic-two-node-branch.json")

    assert result.returncode != 0
    output = _review_validator_output(result)
    assert "generic two-node skeleton" in output
    assert "not a child-count limit" in output


def test_outline_discovery_schema_allows_branch_node_source_refs():
    schema = json.loads(OUTLINE_DISCOVERY_SCHEMA.read_text(encoding="utf-8"))
    source_refs = schema["$defs"]["outline_node"]["properties"]["source_refs"]
    assert source_refs["minItems"] == 1
    assert source_refs["uniqueItems"] is True


def test_outline_discovery_cli_verifies_canonical_feature_maturity_and_markdown_anchors(tmp_path):
    sample = _outline_discovery_validator_sample()
    project_root = tmp_path / "project"
    review_path = project_root / sample["artifact_path"]
    review_path.parent.mkdir(parents=True)
    (project_root / "specs" / "review-index.json").write_text(
        json.dumps({"features": [{"feature": "001-outline", "feature_code": "001"}]}),
        encoding="utf-8",
    )
    prd_path = project_root / "specs" / "001-outline" / "prd.md"
    prd_path.write_text(
        "# PRD\n\n| Outline Maturity | `explore` |\n\n## Core Trading Loop\n\n交易闭环。\n",
        encoding="utf-8",
    )
    (project_root / "specs" / "001-outline" / "spec-outline.md").write_text(
        "# Outline\n\n| Outline Maturity | `explore` |\n| Review Level | Level 1 portfolio-boundary discovery |\n",
        encoding="utf-8",
    )

    review_path.write_text(json.dumps(sample, ensure_ascii=False), encoding="utf-8")
    accepted = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(review_path)],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert accepted.returncode == 0, _review_validator_output(accepted)

    invalid_anchor = json.loads(json.dumps(sample))
    invalid_anchor["source_snapshot"][0]["anchors"] = ["Missing Heading"]
    review_path.write_text(json.dumps(invalid_anchor, ensure_ascii=False), encoding="utf-8")
    rejected_anchor = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(review_path)],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert rejected_anchor.returncode != 0
    assert "source anchor does not exist" in _review_validator_output(rejected_anchor)

    invalid_maturity = json.loads(json.dumps(sample))
    invalid_maturity["outline_maturity"] = "frame"
    review_path.write_text(json.dumps(invalid_maturity, ensure_ascii=False), encoding="utf-8")
    rejected_maturity = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(review_path)],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert rejected_maturity.returncode != 0
    assert "Level 1 portfolio-boundary discovery must use outline_maturity explore" in _review_validator_output(rejected_maturity)

    prd_path.write_text(
        "# PRD\n\n| Outline Maturity | `explore` |\n\n## Core Trading Loop\n\n交易闭环。[src:ai-proposed]\n",
        encoding="utf-8",
    )
    review_path.write_text(json.dumps(sample, ensure_ascii=False), encoding="utf-8")
    promoted_proposal = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(review_path)],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert promoted_proposal.returncode != 0
    assert "referenced Markdown section contains [src:ai-proposed]" in _review_validator_output(promoted_proposal)


def test_outline_discovery_structure_repair_projects_existing_facts_into_child_maps(tmp_path):
    sample = _outline_discovery_validator_sample()
    sample["outline_maturity"] = "frame"
    sample["maps"].insert(
        1,
        {
            "map_id": "map-domain",
            "title": "错误中间责任域",
            "summary": "旧数据为了密度增加的中间分组。",
            "map_kind": "branch",
            "root_node_id": "node-domain-root",
            "parent_map_id": "map-overview",
        },
    )
    trading_map = next(map_ for map_ in sample["maps"] if map_["map_id"] == "map-trading-loop")
    trading_map["parent_map_id"] = "map-domain"
    trading_entry = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    trading_entry["map_id"] = "map-domain"
    trading_entry["parent_node_id"] = "node-domain-root"
    sample["outline_nodes"].extend(
        [
            {"node_id": "node-domain-root", "parent_node_id": None, "map_id": "map-domain", "node_kind": "root", "label": "错误中间责任域", "summary": "旧数据的中间分组根。", "source_status": "doc", "business_chain_refs": ["chain-trading-loop"]},
            {"node_id": "node-domain-entry", "parent_node_id": "node-project", "map_id": "map-overview", "node_kind": "map_link", "label": "错误中间责任域", "summary": "进入错误中间责任域。", "source_status": "doc", "child_map_id": "map-domain", "business_chain_refs": ["chain-trading-loop"]},
        ]
    )
    for node in sample["outline_nodes"]:
        if node["node_id"] in {"node-data", "node-strategy-risk", "node-order"}:
            node["map_id"] = "map-domain"
            node["parent_node_id"] = "node-trading-entry"

    review_path = tmp_path / "outline-discovery-data.json"
    review_path.write_text(json.dumps(sample, ensure_ascii=False), encoding="utf-8")
    repair_script = REVIEW_ROOT / "scripts" / "repair-outline-discovery-structure.mjs"
    repaired = subprocess.run(
        ["node", str(repair_script), str(review_path), "--level-one", "--write"],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert repaired.returncode == 0, repaired.stderr or repaired.stdout

    result = json.loads(review_path.read_text(encoding="utf-8"))
    assert result["outline_maturity"] == "explore"
    assert "map-domain" not in {map_["map_id"] for map_ in result["maps"]}
    repaired_entry = next(node for node in result["outline_nodes"] if node["node_id"] == "node-trading-entry")
    assert repaired_entry["map_id"] == "map-overview"
    assert repaired_entry["parent_node_id"] == "node-project"
    assert not [node for node in result["outline_nodes"] if node["parent_node_id"] == "node-trading-entry"]
    branch_facts = [
        node for node in result["outline_nodes"]
        if node["map_id"] == "map-trading-loop" and node["parent_node_id"] == "node-trading-root"
    ]
    assert {node["node_kind"] for node in branch_facts} >= {"capability", "acceptance"}
    assert not any(node["label"].startswith("Trigger/input:") for node in branch_facts)
    accepted = _run_review_validator(result, tmp_path / "repaired-outline.json")
    assert accepted.returncode == 0, _review_validator_output(accepted)

    first_repair = review_path.read_text(encoding="utf-8")
    repaired_again = subprocess.run(
        ["node", str(repair_script), str(review_path), "--level-one", "--write"],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert repaired_again.returncode == 0, repaired_again.stderr or repaired_again.stdout
    assert review_path.read_text(encoding="utf-8") == first_repair

    sample["question_groups"][0]["map_id"] = "map-overview"
    sample["question_groups"][0]["questions"][0]["outline_node_id"] = "node-domain-entry"
    protected_path = tmp_path / "protected-grouping-outline.json"
    protected_source = json.dumps(sample, ensure_ascii=False)
    protected_path.write_text(protected_source, encoding="utf-8")
    protected_repair = subprocess.run(
        ["node", str(repair_script), str(protected_path), "--level-one", "--write"],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert protected_repair.returncode != 0
    assert "refuses to remove grouping nodes referenced by questions or constraints" in (protected_repair.stderr or protected_repair.stdout)
    assert protected_path.read_text(encoding="utf-8") == protected_source


def test_outline_discovery_structure_repair_restores_source_when_validation_fails(tmp_path):
    sample = _outline_discovery_validator_sample()
    next(node for node in sample["outline_nodes"] if node["node_id"] == "node-constitution-rule")["affected_node_ids"] = ["node-missing"]
    review_path = tmp_path / "outline-discovery-data.json"
    original = json.dumps(sample, ensure_ascii=False)
    review_path.write_text(original, encoding="utf-8")

    repair_script = REVIEW_ROOT / "scripts" / "repair-outline-discovery-structure.mjs"
    repaired = subprocess.run(
        ["node", str(repair_script), str(review_path), "--level-one", "--write"],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )

    assert repaired.returncode != 0
    assert "original file was restored" in (repaired.stderr or repaired.stdout)
    assert review_path.read_text(encoding="utf-8") == original


def test_outline_discovery_accepts_evidence_backed_multiple_atom_project(tmp_path):
    """A direct project may aggregate atoms only with formal business evidence."""
    sample = _outline_discovery_validator_sample()
    _add_second_atom_to_current_level_one_project(sample)

    result = _run_review_validator(sample, tmp_path / "discovery-multi-atom-project.json")

    assert result.returncode == 0, _review_validator_output(result)


def test_outline_discovery_rejects_multiple_atom_project_without_aggregation_basis(tmp_path):
    sample = _outline_discovery_validator_sample()
    _add_second_atom_to_current_level_one_project(sample)
    project = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    del project["aggregation_basis"]

    result = _run_review_validator(sample, tmp_path / "discovery-multi-atom-without-basis.json")

    assert result.returncode != 0
    assert "groups multiple capability atoms without a documented or human-supplied aggregation_basis" in _review_validator_output(result)


def test_outline_discovery_rejects_ai_proposed_multi_atom_aggregation(tmp_path):
    sample = _outline_discovery_validator_sample()
    _add_second_atom_to_current_level_one_project(sample)
    project = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    project["aggregation_basis"]["authority"] = "ai-proposed"

    result = _run_review_validator(sample, tmp_path / "discovery-ai-proposed-aggregation.json")

    assert result.returncode != 0
    assert "aggregation_basis.authority must be doc, user, or user-confirmed" in _review_validator_output(result)


def test_outline_discovery_rejects_multi_atom_project_with_ai_proposed_status(tmp_path):
    sample = _outline_discovery_validator_sample()
    _add_second_atom_to_current_level_one_project(sample)
    project = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    project["source_status"] = "ai-proposed"

    result = _run_review_validator(sample, tmp_path / "discovery-ai-proposed-project-status.json")

    assert result.returncode != 0
    assert "requires documented or human-supplied source_status" in _review_validator_output(result)


def test_outline_discovery_rejects_multi_atom_aggregation_with_unknown_source(tmp_path):
    sample = _outline_discovery_validator_sample()
    _add_second_atom_to_current_level_one_project(sample)
    project = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    project["aggregation_basis"]["source_refs"] = ["specs/001-outline/prd.md#Missing Aggregation Decision"]

    result = _run_review_validator(sample, tmp_path / "discovery-aggregation-unknown-source.json")

    assert result.returncode != 0
    assert "aggregation_basis: source_refs must reference source_snapshot and its declared anchors" in _review_validator_output(result)


def test_outline_discovery_rejects_aggregation_basis_on_single_atom_project(tmp_path):
    sample = _outline_discovery_validator_sample()
    project = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    project["aggregation_basis"] = {
        "authority": "doc",
        "shared_business_goal": "这个单一能力已经独立完成受控订单形成的完整业务目标。",
        "shared_lifecycle_or_owner": "同一交易控制责任独立拥有该能力对应的完整业务生命周期。",
        "split_acceptance_harm": "当前只有一个能力原子，因此不存在需要说明的跨原子拆分影响。",
        "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
    }

    result = _run_review_validator(sample, tmp_path / "discovery-single-atom-with-basis.json")

    assert result.returncode != 0
    assert "must not declare aggregation_basis when it owns one capability atom" in _review_validator_output(result)


def test_outline_discovery_rejects_project_chain_set_that_does_not_match_owned_atoms(tmp_path):
    sample = _outline_discovery_validator_sample()
    _add_second_atom_to_current_level_one_project(sample)
    project = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    project["business_chain_refs"].remove("chain-risk-decision")

    result = _run_review_validator(sample, tmp_path / "discovery-project-chain-set-mismatch.json")

    assert result.returncode != 0
    assert "business_chain_refs must equal the chains referenced by its capability_atom_refs" in _review_validator_output(result)


def test_outline_discovery_rejects_level_one_chain_with_multiple_independent_outcomes(tmp_path):
    """A chain cannot make multiple acceptance results look like one project boundary."""
    sample = _outline_discovery_validator_sample()
    sample["business_context"]["outcomes"].append(
        {
            "outcome_id": "outcome-recovered-facts",
            "label": "恢复后交易事实一致",
            "summary": "中断后的订单、成交和持仓重新核对并形成可追溯一致状态。",
            "source_status": "doc",
            "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
        }
    )
    sample["business_context"]["business_chains"][0]["outcome_refs"].append("outcome-recovered-facts")

    result = _run_review_validator(sample, tmp_path / "discovery-multiple-chain-outcomes.json")

    assert result.returncode != 0
    assert "exactly one independently accepted outcome" in _review_validator_output(result)


def test_outline_discovery_rejects_level_one_atom_whose_trigger_kind_differs_from_its_chain(tmp_path):
    """Normal processing and interruption recovery cannot share a chain through a generic label."""
    sample = _outline_discovery_validator_sample()
    chain = sample["business_context"]["business_chains"][0]
    chain.update(
        {
            "chain_kind": "primary",
            "trigger_kind": "business_event",
            "owned_state": "经过风险约束、等待执行的交易订单",
            "primary_outcome_ref": "outcome-controlled-order",
            "downstream_handoff": "向订单执行责任交付可执行订单或风险阻断事实",
        }
    )
    sample["business_context"]["capability_atoms"][0]["trigger_kind"] = "exception_or_interruption"

    result = _run_review_validator(sample, tmp_path / "discovery-mixed-trigger-chain.json")

    assert result.returncode != 0
    assert "trigger_kind must match its business chain" in _review_validator_output(result)


def test_outline_discovery_rejects_level_one_chain_with_multiple_capability_atoms(tmp_path):
    """Initial Level 1 generation cannot hide two responsibilities inside one chain."""
    sample = _outline_discovery_validator_sample()
    second_atom = {
        **sample["business_context"]["capability_atoms"][0],
        "atom_id": "atom-broker-fact-update",
        "label": "接收券商回报并更新交易事实",
        "owned_state": "已按券商回报更新的订单与成交事实",
        "primary_outcome_ref": "outcome-controlled-order",
        "downstream_handoff": "向运行核对责任交付已确认的订单与成交事实",
    }
    sample["business_context"]["capability_atoms"].append(second_atom)
    project = next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry")
    project["capability_atom_refs"].append(second_atom["atom_id"])

    result = _run_review_validator(sample, tmp_path / "discovery-multiple-atoms-per-chain.json")

    assert result.returncode != 0
    assert "exactly one Level 1 capability atom" in _review_validator_output(result)


@pytest.mark.parametrize(
    ("field", "wrong_value"),
    (
        ("trigger_or_input", "人工修改参数"),
        ("owned_state", "待人工批准的参数版本"),
        ("primary_outcome_ref", "outcome-not-owned-by-chain"),
        ("downstream_handoff", "向配置治理责任交付参数版本"),
    ),
)
def test_outline_discovery_rejects_level_one_atom_semantics_that_differ_from_its_chain(
    tmp_path,
    field,
    wrong_value,
):
    sample = _outline_discovery_validator_sample()
    sample["business_context"]["capability_atoms"][0][field] = wrong_value

    result = _run_review_validator(sample, tmp_path / f"discovery-atom-chain-mismatch-{field}.json")

    assert result.returncode != 0
    assert "semantic fields must match its business chain" in _review_validator_output(result)


def test_outline_discovery_rejects_level_one_business_chain_without_atom_or_project(tmp_path):
    sample = _outline_discovery_validator_sample()
    sample["business_context"]["outcomes"].append(
        {
            "outcome_id": "outcome-risk-decision",
            "label": "形成风险放行决定",
            "summary": "交易意图被明确放行或阻断。",
            "source_status": "doc",
            "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
        }
    )
    sample["business_context"]["business_chains"].append(
        {
            "chain_id": "chain-risk-decision",
            "label": "交易意图风险裁定",
            "chain_kind": "primary",
            "trigger_kind": "business_event",
            "trigger_or_input": "策略交易意图到达",
            "owned_state": "已完成风险裁定的交易意图",
            "object_refs": ["object-order"],
            "operation_refs": ["operation-decide-order"],
            "outcome_refs": ["outcome-risk-decision"],
            "primary_outcome_ref": "outcome-risk-decision",
            "downstream_handoff": "向订单执行责任交付放行决定或阻断事实",
            "source_status": "doc",
            "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
        }
    )

    result = _run_review_validator(sample, tmp_path / "discovery-orphan-level-one-chain.json")

    assert result.returncode != 0
    assert "exactly one Level 1 capability atom" in _review_validator_output(result)


def test_outline_discovery_rejects_candidate_bound_to_another_level_one_project(tmp_path):
    sample = _outline_discovery_validator_sample()
    sample["business_context"]["outcomes"].append(
        {
            "outcome_id": "outcome-risk-decision",
            "label": "形成风险放行决定",
            "summary": "交易意图被明确放行或阻断。",
            "source_status": "doc",
            "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
        }
    )
    sample["business_context"]["capability_atoms"].append(
        {
            "atom_id": "atom-risk-decision",
            "label": "裁定交易意图是否放行",
            "trigger_kind": "business_event",
            "trigger_or_input": "策略交易意图到达",
            "owned_state": "已完成风险裁定的交易意图",
            "object_refs": ["object-order"],
            "operation_refs": ["operation-decide-order"],
            "outcome_refs": ["outcome-risk-decision"],
            "primary_outcome_ref": "outcome-risk-decision",
            "downstream_handoff": "向订单执行责任交付放行决定或阻断事实",
            "business_chain_refs": ["chain-risk-decision"],
            "source_status": "doc",
            "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
        }
    )
    sample["business_context"]["business_chains"].append(
        {
            "chain_id": "chain-risk-decision",
            "label": "交易意图风险裁定",
            "chain_kind": "primary",
            "trigger_kind": "business_event",
            "trigger_or_input": "策略交易意图到达",
            "owned_state": "已完成风险裁定的交易意图",
            "object_refs": ["object-order"],
            "operation_refs": ["operation-decide-order"],
            "outcome_refs": ["outcome-risk-decision"],
            "primary_outcome_ref": "outcome-risk-decision",
            "downstream_handoff": "向订单执行责任交付放行决定或阻断事实",
            "source_status": "doc",
            "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
        }
    )
    sample["maps"].append(
        {
            "map_id": "map-risk-decision",
            "title": "风险决定",
            "summary": "裁定交易意图并交付放行或阻断结果。",
            "map_kind": "branch",
            "root_node_id": "node-risk-root",
            "parent_map_id": "map-overview",
        }
    )
    sample["outline_nodes"][0]["business_chain_refs"].append("chain-risk-decision")
    sample["outline_nodes"].extend(
        [
            {
                "node_id": "node-risk-entry",
                "parent_node_id": "node-project",
                "map_id": "map-overview",
                "node_kind": "map_link",
                "label": "风险决定",
                "summary": "进入交易意图风险裁定分图。",
                "source_status": "doc",
                "child_map_id": "map-risk-decision",
                "business_chain_refs": ["chain-risk-decision"],
                "capability_atom_refs": ["atom-risk-decision"],
            },
            {
                "node_id": "node-risk-root",
                "parent_node_id": None,
                "map_id": "map-risk-decision",
                "node_kind": "root",
                "label": "交易意图风险裁定",
                "summary": "根据风险规则形成放行决定或阻断事实。",
                "source_status": "doc",
                "business_chain_refs": ["chain-risk-decision"],
            },
        ]
    )
    candidate = sample["question_groups"][0]["questions"][0]["candidates"][0]
    candidate["business_chain_refs"] = ["chain-risk-decision"]
    candidate["capability_atom_refs"] = ["atom-risk-decision"]

    result = _run_review_validator(sample, tmp_path / "discovery-candidate-other-project.json")

    assert result.returncode != 0
    assert "current Level 1 project's complete capability atom and business chain sets" in _review_validator_output(result)


def test_outline_discovery_rejects_level_one_chains_that_share_a_primary_outcome(tmp_path):
    """Two independently verifiable projects must not claim the same acceptance result."""
    sample = _outline_discovery_validator_sample()
    sample["business_context"]["business_chains"].extend(
        [
            {
                "chain_id": "chain-order-recovery",
                "label": "中断后恢复交易事实",
                "chain_kind": "recovery",
                "trigger_kind": "exception_or_interruption",
                "trigger_or_input": "交易进程中断或券商状态与本地记录不一致",
                "owned_state": "恢复后可追溯的订单、成交与持仓事实",
                "object_refs": ["object-order"],
                "operation_refs": ["operation-decide-order"],
                "outcome_refs": ["outcome-controlled-order"],
                "primary_outcome_ref": "outcome-controlled-order",
                "downstream_handoff": "向策略和风控责任交付恢复后确认的交易事实",
                "source_status": "doc",
                "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"],
            }
        ]
    )
    sample["business_context"]["business_chains"][0].update(
        {
            "chain_kind": "primary",
            "trigger_kind": "business_event",
            "owned_state": "经过风险约束、等待执行的交易订单",
            "primary_outcome_ref": "outcome-controlled-order",
            "downstream_handoff": "向订单执行责任交付可执行订单或风险阻断事实",
        }
    )

    result = _run_review_validator(sample, tmp_path / "discovery-duplicate-primary-outcome.json")

    assert result.returncode != 0
    assert "primary outcome must be owned by exactly one Level 1 business chain" in _review_validator_output(result)


def test_outline_discovery_rejects_level_one_atoms_without_project_ownership(tmp_path):
    sample = _outline_discovery_validator_sample()
    next(node for node in sample["outline_nodes"] if node["node_id"] == "node-trading-entry").pop(
        "capability_atom_refs"
    )

    result = _run_review_validator(sample, tmp_path / "discovery-unowned-capability-atom.json")

    assert result.returncode != 0
    assert "capability atom must have exactly one Level 1 project owner" in _review_validator_output(result)


def test_outline_discovery_rejects_candidate_without_capability_atom_evidence(tmp_path):
    sample = _outline_discovery_validator_sample()
    sample["question_groups"][0]["questions"][0]["candidates"][0].pop("capability_atom_refs")

    result = _run_review_validator(sample, tmp_path / "discovery-candidate-without-atom.json")

    assert result.returncode != 0
    assert "capability_atom_refs must reference business_context" in _review_validator_output(result)

    for label, mutate, expected in (
        (
            "multiple-selection",
            lambda data: data["question_groups"][0]["questions"][0].__setitem__("selection_mode", "multiple"),
            "selection_mode must be single",
        ),
        (
            "feature-path-mismatch",
            lambda data: data["project"].__setitem__("feature", "002-other"),
            "project.feature must match artifact_path",
        ),
        (
            "unsafe-source-path",
            lambda data: data["source_snapshot"][0].__setitem__("path", "../prd.md"),
            "safe repository-relative path",
        ),
        (
            "one-candidate",
            lambda data: data["question_groups"][0]["questions"][0]["candidates"].pop(),
            "2-4 candidates",
        ),
        (
            "five-candidates",
            lambda data: data["question_groups"][0]["questions"][0]["candidates"].extend(
                [{"id": f"extra-{i}", "label": "额外方向", "value": "额外候选方向。", "rationale": "只用于越界测试。"} for i in range(3)]
            ),
            "2-4 candidates",
        ),
        (
            "missing-recommendation",
            lambda data: data["question_groups"][0]["questions"][0].__setitem__("recommended_candidate_ids", []),
            "recommended_candidate_ids",
        ),
        (
            "multiple-recommendations",
            lambda data: data["question_groups"][0]["questions"][0].__setitem__(
                "recommended_candidate_ids", ["risk-basic", "risk-multi"]
            ),
            "exactly one candidate",
        ),
        (
            "none-disabled",
            lambda data: data["question_groups"][0]["questions"][0].__setitem__("allow_none_of_the_above", False),
            "none-of-the-above",
        ),
        (
            "missing-operation",
            lambda data: data["question_groups"][0]["questions"][0]["free_input"]["allowed_operations"].pop(),
            "five discovery operations",
        ),
        (
            "unknown-question-node",
            lambda data: data["question_groups"][0]["questions"][0].__setitem__("outline_node_id", "node-missing"),
            "outline_node_id must reference",
        ),
        (
            "too-many-children",
            lambda data: data["outline_nodes"].append({"node_id": "node-abstract-spine", "parent_node_id": "node-project", "map_id": "map-overview", "node_kind": "goal", "label": "产品目标", "summary": "用抽象目标占据一级主干。", "source_status": "user"}),
            "direct children must be business or governance map links",
        ),
        (
            "too-deep",
            lambda data: data["outline_nodes"].extend([
                {"node_id": "node-depth-three", "parent_node_id": "node-data", "map_id": "map-trading-loop", "node_kind": "scenario", "label": "数据接收", "summary": "接收行情数据。", "source_status": "doc", "business_chain_refs": ["chain-trading-loop"]},
                {"node_id": "node-depth-four", "parent_node_id": "node-depth-three", "map_id": "map-trading-loop", "node_kind": "scenario", "label": "数据校验", "summary": "校验行情数据。", "source_status": "doc", "business_chain_refs": ["chain-trading-loop"]},
            ]),
            "maximum depth 3",
        ),
        (
            "unbalanced-layer",
            lambda data: data["outline_nodes"].extend([
                {"node_id": f"node-data-{i}", "parent_node_id": "node-data" if i < 4 else "node-order", "map_id": "map-trading-loop", "node_kind": "scenario", "label": f"数据场景 {i}", "summary": "用于密度失衡测试。", "source_status": "doc", "business_chain_refs": ["chain-trading-loop"]}
                for i in range(7)
            ]),
            "layer may contain at most 60%",
        ),
        (
            "map-parent-cycle",
            lambda data: (
                next(map_ for map_ in data["maps"] if map_["map_id"] == "map-trading-loop").__setitem__("parent_map_id", "map-governance"),
                next(map_ for map_ in data["maps"] if map_["map_id"] == "map-governance").__setitem__("parent_map_id", "map-trading-loop"),
            ),
            "must not contain parent cycles",
        ),
        (
            "duplicate-child-map-entry",
            lambda data: data["outline_nodes"].append({"node_id": "node-duplicate-entry", "parent_node_id": "node-project", "map_id": "map-overview", "node_kind": "map_link", "label": "重复交易入口", "summary": "重复链接业务分图。", "source_status": "doc", "child_map_id": "map-trading-loop", "business_chain_refs": ["chain-trading-loop"]}),
            "must be linked exactly once",
        ),
        (
            "map-link-with-same-map-child",
            lambda data: data["outline_nodes"].append({"node_id": "node-misplaced-detail", "parent_node_id": "node-trading-entry", "map_id": "map-overview", "node_kind": "scope", "label": "错挂的结果交接", "summary": "该事实应该位于交易闭环分图。", "source_status": "doc", "source_refs": ["specs/001-outline/prd.md#Core Trading Loop"], "business_chain_refs": ["chain-trading-loop"]}),
            "must not contain same-map children",
        ),
        (
            "empty-business-branch",
            lambda data: data.__setitem__("outline_nodes", [
                node for node in data["outline_nodes"]
                if node["node_id"] not in {"node-data", "node-strategy-risk", "node-order"}
            ]),
            "must expose at least one source-backed direct fact",
        ),
        (
            "node-source-promotes-atom",
            lambda data: data["business_context"]["capability_atoms"][0].__setitem__("source_status", "ai-proposed"),
            "source_status cannot exceed its capability atom or business chain evidence",
        ),
        (
            "overview-constraint-impact",
            lambda data: next(node for node in data["outline_nodes"] if node["node_id"] == "node-constitution-rule").__setitem__("affected_node_ids", ["node-project"]),
            "must reference business branch nodes",
        ),
        (
            "duplicate-global-constraint-impact",
            lambda data: next(node for node in data["outline_nodes"] if node["node_id"] == "node-constitution-rule").__setitem__("affected_node_ids", ["node-data", "node-data"]),
            "affected_node_ids must be unique",
        ),
        (
            "missing-business-object",
            lambda data: data["business_context"]["business_chains"][0].__setitem__("object_refs", []),
            "business chain must reference at least one business object",
        ),
        (
            "unknown-business-source",
            lambda data: data["business_context"]["business_chains"][0].__setitem__("source_refs", ["specs/001-outline/unknown.md#Fact"]),
            "source_refs must reference source_snapshot",
        ),
        (
            "evidence-gaps-not-array",
            lambda data: data["business_context"].__setitem__("evidence_gaps", {}),
            "evidence_gaps must be an array",
        ),
        (
            "duplicate-evidence-gap",
            lambda data: data["business_context"].__setitem__(
                "evidence_gaps",
                [
                    {"gap_id": "gap-1", "summary": "缺少策略边界。", "business_chain_refs": ["chain-trading-loop"]},
                    {"gap_id": "gap-1", "summary": "缺少风险边界。", "business_chain_refs": ["chain-trading-loop"]},
                ],
            ),
            "duplicate evidence gap_id",
        ),
        (
            "constitution-clauses-not-array",
            lambda data: data["constitution_snapshot"].__setitem__("clauses", {}),
            "constitution_snapshot.clauses must be an array",
        ),
        (
            "branch-without-business-chain",
            lambda data: next(node for node in data["outline_nodes"] if node["node_id"] == "node-trading-entry").pop("business_chain_refs"),
            "business branch must reference at least one business chain",
        ),
        (
            "unbound-ai-proposal",
            lambda data: data.__setitem__("question_groups", [{**data["question_groups"][0], "questions": []}]),
            "ai-proposed business node must bind a question",
        ),
        (
            "constitution-as-business-evidence",
            lambda data: data["business_context"]["business_chains"][0].__setitem__("source_refs", [".specify/memory/constitution.md#Risk Governance"]),
            "Constitution cannot be business evidence",
        ),
        (
            "mutable-constitution",
            lambda data: data["constitution_snapshot"].__setitem__("display_mode", "editable"),
            "constitution_snapshot.display_mode must be read_only",
        ),
        (
            "unknown-constitution-clause",
            lambda data: next(node for node in data["outline_nodes"] if node["node_id"] == "node-constitution-rule").__setitem__("constitution_clause_refs", ["missing-clause"]),
            "constitution_clause_refs must reference constitution_snapshot",
        ),
        (
            "candidate-without-business-evidence",
            lambda data: data["question_groups"][0]["questions"][0]["candidates"][0].pop("business_chain_refs"),
            "business_chain_refs",
        ),
        (
            "candidate-with-constitution-evidence",
            lambda data: data["question_groups"][0]["questions"][0]["candidates"][0].__setitem__("business_chain_refs", ["constitution-risk-review"]),
            "business_chain_refs",
        ),
    ):
        invalid = _outline_discovery_validator_sample()
        mutate(invalid)
        result = _run_review_validator(invalid, tmp_path / f"discovery-{label}.json")
        assert result.returncode != 0, label
        assert expected in _review_validator_output(result)

    for impact in (None, []):
        valid_without_known_impact = _outline_discovery_validator_sample()
        constraint = next(
            node for node in valid_without_known_impact["outline_nodes"]
            if node["node_id"] == "node-constitution-rule"
        )
        if impact is None:
            constraint.pop("affected_node_ids")
        else:
            constraint["affected_node_ids"] = impact
        accepted = _run_review_validator(
            valid_without_known_impact,
            tmp_path / f"discovery-unknown-impact-{impact is None}.json",
        )
        assert accepted.returncode == 0, _review_validator_output(accepted)


def test_outline_discovery_browser_runtime_matches_cli_fail_closed_contract():
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer runtime tests")

    overlays = REVIEW_ROOT / "renderer" / "scripts" / "simple-overlays.js"
    state_store = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    data_validator = REVIEW_ROOT / "renderer" / "scripts" / "data-validator.js"
    sample = _outline_discovery_validator_sample()
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = [
  {json.dumps(str(overlays))},
  {json.dumps(str(state_store))},
  {json.dumps(str(data_validator))}
].map((path) => fs.readFileSync(path, "utf8")).join(String.fromCharCode(10));
const context = {{
  window: {{ SpecCompassDom: {{}} }},
  localStorage: {{ setItem: () => undefined, removeItem: () => undefined, getItem: () => null }},
  console,
  SUPPORTED_SCHEMA_VERSIONS: new Set([1, 2]),
  SUPPORTED_SCHEMA_VERSION: 2
}};
vm.createContext(context);
vm.runInContext(source, context);
const valid = {json.dumps(sample, ensure_ascii=False)};
if (context.validateReviewData(valid) !== "") throw new Error("valid discovery rejected");
for (const [label, mutate] of [
  ["unsafe-path", (data) => data.artifact_path = "../outline-discovery-data.json"],
  ["missing-source", (data) => data.source_snapshot = []],
  ["duplicate-question", (data) => data.question_groups[0].questions.push(structuredClone(data.question_groups[0].questions[0]))],
  ["one-candidate", (data) => data.question_groups[0].questions[0].candidates.pop()],
  ["unknown-recommendation", (data) => data.question_groups[0].questions[0].recommended_candidate_ids = ["missing"]],
  ["multiple-recommendations", (data) => data.question_groups[0].questions[0].recommended_candidate_ids = ["goal-quality", "goal-speed"]],
  ["candidate-without-business-evidence", (data) => delete data.question_groups[0].questions[0].candidates[0].business_chain_refs],
  ["candidate-with-constitution-evidence", (data) => data.question_groups[0].questions[0].candidates[0].business_chain_refs = ["constitution-risk-review"]],
  ["multiple-selection", (data) => data.question_groups[0].questions[0].selection_mode = "multiple"],
  ["missing-operation", (data) => data.question_groups[0].questions[0].free_input.allowed_operations.pop()],
  ["missing-business-object", (data) => data.business_context.business_chains[0].object_refs = []],
  ["multiple-chain-outcomes", (data) => {{
    data.business_context.outcomes.push({{
      outcome_id: "outcome-recovered-facts",
      label: "恢复后交易事实一致",
      summary: "中断后的订单、成交和持仓重新核对并形成可追溯一致状态。",
      source_status: "doc",
      source_refs: ["specs/001-outline/prd.md#Core Trading Loop"]
    }});
    data.business_context.business_chains[0].outcome_refs.push("outcome-recovered-facts");
  }}],
  ["mixed-trigger-chain", (data) => data.business_context.capability_atoms[0].trigger_kind = "exception_or_interruption"],
  ["multiple-atoms-per-chain", (data) => {{
    const atom = structuredClone(data.business_context.capability_atoms[0]);
    atom.atom_id = "atom-broker-fact-update";
    atom.label = "接收券商回报并更新交易事实";
    data.business_context.capability_atoms.push(atom);
    data.outline_nodes.find((item) => item.node_id === "node-trading-entry").capability_atom_refs.push(atom.atom_id);
  }}],
  ["atom-owned-state-mismatch", (data) => data.business_context.capability_atoms[0].owned_state = "待人工批准的参数版本"],
  ["duplicate-primary-outcome", (data) => data.business_context.business_chains.push({{
    chain_id: "chain-order-recovery",
    label: "中断后恢复交易事实",
    chain_kind: "recovery",
    trigger_kind: "exception_or_interruption",
    trigger_or_input: "交易进程中断或券商状态与本地记录不一致",
    owned_state: "恢复后可追溯的订单、成交与持仓事实",
    object_refs: ["object-order"],
    operation_refs: ["operation-decide-order"],
    outcome_refs: ["outcome-controlled-order"],
    primary_outcome_ref: "outcome-controlled-order",
    downstream_handoff: "向策略和风控责任交付恢复后确认的交易事实",
    source_status: "doc",
    source_refs: ["specs/001-outline/prd.md#Core Trading Loop"]
  }})],
  ["unknown-business-source", (data) => data.business_context.business_chains[0].source_refs = ["specs/001-outline/unknown.md#Fact"]],
  ["evidence-gaps-not-array", (data) => data.business_context.evidence_gaps = {{}}],
  ["duplicate-evidence-gap", (data) => data.business_context.evidence_gaps = [
    {{ gap_id: "gap-1", summary: "缺少策略边界。", business_chain_refs: ["chain-trading-loop"] }},
    {{ gap_id: "gap-1", summary: "缺少风险边界。", business_chain_refs: ["chain-trading-loop"] }}
  ]],
  ["constitution-clauses-not-array", (data) => data.constitution_snapshot.clauses = {{}}],
  ["business-branch-without-chain", (data) => delete data.outline_nodes.find((item) => item.node_id === "node-trading-entry").business_chain_refs],
  ["unbound-ai-proposal", (data) => data.question_groups[0].questions = []],
  ["constitution-business-evidence", (data) => data.business_context.business_chains[0].source_refs = [".specify/memory/constitution.md#Risk Governance"]],
  ["mutable-constitution", (data) => data.constitution_snapshot.display_mode = "editable"],
  ["unknown-constitution-clause", (data) => data.outline_nodes.find((item) => item.node_id === "node-constitution-rule").constitution_clause_refs = ["missing-clause"]],
  ["map-parent-cycle", (data) => {{
    data.maps.find((map) => map.map_id === "map-trading-loop").parent_map_id = "map-governance";
    data.maps.find((map) => map.map_id === "map-governance").parent_map_id = "map-trading-loop";
  }}],
  ["duplicate-child-map-entry", (data) => {{
    const node = structuredClone(data.outline_nodes.find((item) => item.node_id === "node-trading-entry"));
    node.node_id = "node-trading-entry-duplicate";
    data.outline_nodes.push(node);
  }}],
  ["map-link-with-same-map-child", (data) => data.outline_nodes.push({{
    node_id: "node-misplaced-detail",
    parent_node_id: "node-trading-entry",
    map_id: "map-overview",
    node_kind: "scope",
    label: "错挂的结果交接",
    summary: "该事实应该位于交易闭环分图。",
    source_status: "doc",
    source_refs: ["specs/001-outline/prd.md#Core Trading Loop"],
    business_chain_refs: ["chain-trading-loop"]
  }})],
  ["empty-business-branch", (data) => {{
    data.outline_nodes = data.outline_nodes.filter((item) => !["node-data", "node-strategy-risk", "node-order"].includes(item.node_id));
  }}],
  ["node-source-promotes-atom", (data) => data.business_context.capability_atoms[0].source_status = "ai-proposed"],
  ["overview-constraint-impact", (data) => {{
    data.outline_nodes.find((item) => item.node_id === "node-constitution-rule").affected_node_ids = ["node-project"];
  }}],
  ["duplicate-global-constraint-impact", (data) => {{
    data.outline_nodes.find((item) => item.node_id === "node-constitution-rule").affected_node_ids = ["node-data", "node-data"];
  }}]
]) {{
  const invalid = structuredClone(valid);
  mutate(invalid);
  const result = context.validateReviewData(invalid);
  if (!result) throw new Error(label + " was accepted");
}}
for (const impact of [undefined, []]) {{
  const allowed = structuredClone(valid);
  const constraint = allowed.outline_nodes.find((item) => item.node_id === "node-constitution-rule");
  if (impact === undefined) delete constraint.affected_node_ids;
  else constraint.affected_node_ids = impact;
  const result = context.validateReviewData(allowed);
  if (result) throw new Error("unknown Constitution impact rejected: " + result);
}}
"""
    result = subprocess.run(["node", "-e", node_program], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr or result.stdout


def test_outline_discovery_response_cli_rejects_constitution_targets(tmp_path):
    if shutil.which("node") is None:
        pytest.skip("node is required for review response validation")

    source = _outline_discovery_validator_sample()
    source_path = tmp_path / "specs" / "001-outline" / "prd" / "review" / "outline-discovery-data.json"
    source_path.parent.mkdir(parents=True)
    source_path.write_text(json.dumps(source, ensure_ascii=False), encoding="utf-8")
    response = {
        "schema_version": 3,
        "format": "speccompass-outline-discovery-response",
        "response_id": "response-constitution",
        "review_type": "outline_discovery",
        "batch_id": source["batch_id"],
        "feature": source["project"]["feature"],
        "outline_maturity": source["outline_maturity"],
        "source_review_data": "specs/001-outline/prd/review/outline-discovery-data.json",
        "authorization_effect": "none",
        "next_route": "/sp.prd",
        "generated_at": "2026-07-18T08:00:00.000Z",
        "deltas": [
            {
                "delta_id": "delta-constitution",
                "question_id": "strategy-risk-scope",
                "outline_node_id": "node-constitution-rule",
                "target_kind": "goal",
                "operation": "replace",
                "candidate_id": None,
                "target_id": "constitution-risk-review",
                "value": "Modify governance from PRD.",
                "source_tag": "user",
                "none_of_the_above": False,
                "supersedes_delta_id": None,
            }
        ],
    }
    response_path = tmp_path / "response.json"
    response_path.write_text(json.dumps(response, ensure_ascii=False), encoding="utf-8")

    result = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(response_path)],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode != 0
    assert "constitution" in _review_validator_output(result).lower()


def test_outline_discovery_renderer_tracks_unexported_work_and_mobile_navigation_contract():
    renderer = (REVIEW_ROOT / "renderer" / "scripts" / "outline-discovery-renderer.js").read_text(encoding="utf-8")
    data_loader = (REVIEW_ROOT / "renderer" / "scripts" / "data-loader.js").read_text(encoding="utf-8")
    feature_nav = (REVIEW_ROOT / "renderer" / "scripts" / "feature-nav.js").read_text(encoding="utf-8")
    styles = (REVIEW_ROOT / "renderer" / "styles" / "review-ui.css").read_text(encoding="utf-8")
    prd = _command("prd")

    assert "hasUnexportedOutlineDiscoveryWork" in renderer
    assert "hasOutlineDiscoveryDraft" in renderer
    assert "outlineDiscoveryState.meta?.written_at" in renderer
    assert "updatedAt > persistedAt" in renderer
    assert "hasUnexportedOutlineDiscoveryWork" in data_loader
    assert "hasUnexportedOutlineDiscoveryWork" in feature_nav
    assert 'params.get("outline-discovery")' in feature_nav
    assert "has_outline_discovery" in feature_nav
    assert "has_outline_discovery" in prd
    assert re.search(
        r"@media\s*\(max-width:\s*600px\).*?\.discovery-non-authorizing-banner\s*\{[^}]*flex-direction:\s*column",
        styles,
        re.DOTALL,
    )
    assert re.search(r"\.discovery-non-authorizing-banner\s+strong\s*\{[^}]*white-space:\s*nowrap", styles, re.DOTALL)


def test_outline_discovery_renderer_is_mindmap_first_and_keeps_questions_on_selected_node():
    renderer = (REVIEW_ROOT / "renderer" / "scripts" / "outline-discovery-renderer.js").read_text(encoding="utf-8")
    styles = (REVIEW_ROOT / "renderer" / "styles" / "review-ui.css").read_text(encoding="utf-8")

    for token in (
        "outlineDiscoveryActiveMapId",
        "outlineDiscoveryActiveNodeId",
        "outlineDiscoveryMaps",
        "outlineDiscoveryNodesForMap",
        "outlineDiscoveryMapRootChildren",
        "outlineDiscoveryOverviewPreviewEntries",
        "outlineDiscoveryVisibleNodeOrdinal",
        "captureOutlineDiscoveryViewport",
        "restoreOutlineDiscoveryViewport",
        "renderOutlineDiscoveryMindmap",
        "selectOutlineDiscoveryNode",
        "openOutlineDiscoveryMap",
        "child_map_id",
        "affected_node_ids",
        "canvas.dataset.levelCount",
        "outline_node_id",
        "question.outline_node_id === outlineDiscoveryActiveNodeId",
        "writeOutlineDiscoveryResponse",
        "影响范围尚未映射",
    ):
        assert token in renderer, token

    for token in (
        ".discovery-map-list",
        ".discovery-mindmap",
        ".discovery-mindmap-node",
        ".discovery-mindmap-node.is-selected",
        ".discovery-mindmap-node[data-source-status",
        ".discovery-affected-nodes",
        '.discovery-mindmap[data-level-count="2"]',
        ".discovery-question-panel .discovery-candidates",
        ".discovery-question-panel .discovery-input-grid",
        ".diagram-view",
        "overflow: visible",
    ):
        assert token in styles, token


def test_outline_discovery_overview_preview_uses_child_map_root_children_only():
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer projection tests")

    renderer = REVIEW_ROOT / "renderer" / "scripts" / "outline-discovery-renderer.js"
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(renderer))}, "utf8");
const data = {{
  project: {{ feature: "000-product-root" }},
  maps: [
    {{ map_id: "overview", map_kind: "overview", root_node_id: "overview-root", title: "总图" }},
    {{ map_id: "branch-a", map_kind: "branch", root_node_id: "branch-a-root", title: "分图 A" }},
    {{ map_id: "branch-b", map_kind: "branch", root_node_id: "branch-b-root", title: "分图 B" }},
    {{ map_id: "constraints", map_kind: "global_constraints", root_node_id: "constraints-root", title: "全局约束" }}
  ],
  outline_nodes: [
    {{ node_id: "overview-root", map_id: "overview", node_kind: "root", parent_node_id: null }},
    {{ node_id: "link-a", map_id: "overview", node_kind: "map_link", parent_node_id: "overview-root", child_map_id: "branch-a" }},
    {{ node_id: "link-b", map_id: "overview", node_kind: "map_link", parent_node_id: "overview-root", child_map_id: "branch-b" }},
    {{ node_id: "link-c", map_id: "overview", node_kind: "map_link", parent_node_id: "overview-root", child_map_id: "constraints" }},
    {{ node_id: "branch-a-root", map_id: "branch-a", node_kind: "root", parent_node_id: null }},
    {{ node_id: "a-1", map_id: "branch-a", node_kind: "capability", parent_node_id: "branch-a-root" }},
    {{ node_id: "a-2", map_id: "branch-a", node_kind: "capability", parent_node_id: "branch-a-root" }},
    {{ node_id: "a-deep", map_id: "branch-a", node_kind: "acceptance", parent_node_id: "a-1" }},
    {{ node_id: "branch-b-root", map_id: "branch-b", node_kind: "root", parent_node_id: null }},
    {{ node_id: "constraints-root", map_id: "constraints", node_kind: "root", parent_node_id: null }},
    {{ node_id: "c-1", map_id: "constraints", node_kind: "constraint", parent_node_id: "constraints-root" }},
    {{ node_id: "c-2", map_id: "constraints", node_kind: "constraint", parent_node_id: "constraints-root" }}
  ]
}};
const context = {{ console, reviewData: data }};
vm.createContext(context);
vm.runInContext(source, context);
const overview = data.maps[0];
const entries = context.outlineDiscoveryOverviewPreviewEntries(overview, data);
const counts = Object.fromEntries(["link-a", "link-b", "link-c"].map((id) => [id, entries.filter((entry) => entry.parentId === id).length]));
if (context.outlineDiscoverySemanticMapOrdinal(overview, data) !== "000") throw new Error("overview lost feature code identity");
if (context.outlineDiscoverySemanticMapOrdinal(data.maps[1], data) !== "01") throw new Error("first candidate ordinal is not 01");
if (context.outlineDiscoverySemanticMapOrdinal(data.maps[2], data) !== "02") throw new Error("second candidate ordinal is not 02");
const branchPresentation = context.outlineDiscoveryMapPresentation(data.maps[1]);
if (branchPresentation.ordinalById.get("branch-a-root") !== "01") throw new Error("branch root ordinal is not 01");
if (branchPresentation.ordinalById.get("a-1") !== "01.1") throw new Error("branch fact ordinal is not 01.1");
if (JSON.stringify(counts) !== JSON.stringify({{"link-a": 2, "link-b": 0, "link-c": 2}})) throw new Error(JSON.stringify(counts));
if (entries.some((entry) => entry.node.node_id === "a-deep")) throw new Error("deep descendants leaked into overview preview");
if (new Set(entries.map((entry) => entry.key)).size !== entries.length) throw new Error("preview render keys are not unique");
if (entries.some((entry) => !entry.key.startsWith("preview:" + entry.parentId + ":"))) throw new Error("preview key lost map-link ownership");
data.schema_version = 4;
data.decomposition_window = {{ units: [{{ outline_node_id: "a-1" }}] }};
const recursiveEntries = context.outlineDiscoveryOverviewPreviewEntries(overview, data);
if (recursiveEntries.length !== 1 || recursiveEntries[0].node.node_id !== "a-1") {{
  throw new Error("v4 overview projected explanatory nodes as project units: " + JSON.stringify(recursiveEntries.map((entry) => entry.node.node_id)));
}}
"""
    result = subprocess.run(["node", "-e", node_program], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr or result.stdout


def test_outline_discovery_renderer_uses_business_context_and_shows_constitution_read_only():
    renderer = (REVIEW_ROOT / "renderer" / "scripts" / "outline-discovery-renderer.js").read_text(encoding="utf-8")
    styles = (REVIEW_ROOT / "renderer" / "styles" / "review-ui.css").read_text(encoding="utf-8")

    for token in (
        "outlineDiscoveryBusinessContext",
        "outlineDiscoveryBusinessTitle",
        "outlineDiscoveryBusinessSummary",
        "business_context",
        "product_subject",
        "business_chains",
        "mapChainIds",
        "outlineDiscoveryNodesForMap(map.map_id, data)",
        "chains.find((candidate) => mapChainIds.has(candidate.chain_id))",
        "trigger_or_input",
        "renderOutlineDiscoveryConstitution",
        "constitution_snapshot",
        "constitution.source_path",
        'constitution.availability === "available"',
        "constitution.clauses",
        "Array.isArray(constitution.clauses)",
        "只读",
        "项目治理",
        "未找到 Constitution",
        "openOutlineDiscoveryConstitution",
        "outlineDiscoveryConstitutionOpen",
        "renderOutlineDiscoveryConstitutionView",
        "按需查看项目治理条款",
        "具体内容已在中间栏展示",
        "outlineDiscoveryConstitutionApplicabilityLabel",
        "outlineDiscoveryConstitutionApplicabilityExplanation",
        "outlineDiscoveryConstitutionAffectedNodes",
        "outlineDiscoveryConstitutionNodeDescription",
        "appendOutlineDiscoveryConstitutionDetail",
        "条款总数",
        "直接适用",
        "可能适用",
        "关联节点",
        "尚未映射到具体 Outline 节点",
        "outlineDiscoveryNodeDepth",
        "outlineDiscoveryVisualParent",
        "visualDepthById.set(node.node_id, Math.min(outlineDiscoveryNodeDepth(node, nodesById), 3))",
        "levelOneOrder",
        "levelTwoOrder",
        "document.createElementNS",
        "discovery-mindmap-connectors",
        "discovery-mindmap-branch-stage",
        "discovery-mindmap-branch-group",
        "discovery-mindmap-parent-slot",
        "discovery-mindmap-child-list",
        "childrenByParent",
        "directParentNodeId",
        "discovery-mindmap-trunk",
        "discovery-mindmap-branch",
        "trunk.dataset.childCount",
        "trunk.dataset.laneIndex",
        "canvas.clientLeft",
        "canvas.clientTop",
        "ResizeObserver",
        "target.focus({ preventScroll: true })",
        "viewport.container.scrollTop += target.getBoundingClientRect().top - viewport.anchorTop",
        "parentNodeId",
        "childNodeId",
        "总图第三列是各分图根节点的直接子节点预览",
        "普通说明节点留在所属分图",
        'relationshipType: options.previewMapId ? "child_map_preview" : "in_map_parent"',
        "previewNodeCount",
        "thirdLevelNodeCount",
        'canvas.dataset.density = "dense"',
        "thirdLevelNodeCount >= 6",
        "previewMapId",
        "discovery-node-footer",
        "levelOne.dataset.nodeCount",
        "parentLevel.dataset.nodeCount",
        "childLevel.dataset.nodeCount",
        "canvas.dataset.connectionCount",
    ):
        assert token in renderer, token

    assert "alignOutlineDiscoveryParentNodes" not in renderer
    assert "translateY(" not in renderer
    assert "will-change: transform" not in styles
    for token in (
        ".discovery-mindmap-branch-stage",
        ".discovery-mindmap-branch-group",
        "grid-column: 2 / -1",
        "align-items: stretch",
        "justify-content: center",
    ):
        assert token in styles, token

    assert '$("item-title").textContent = "项目全局思维导图"' not in renderer
    assert "根节点保持稳定，分支节点承载业务语义" not in renderer
    assert "三级再按 Constitution 生成" not in renderer
    assert 'outlineDiscoveryBusinessSummary(reviewData, map)' in renderer

    constitution_renderer = renderer.split("function renderOutlineDiscoveryConstitution", 1)[1].split("\n}", 1)[0]
    for forbidden in (
        "outlineDiscoveryResponse(",
        "renderOutlineDiscoveryQuestion(",
        'document.createElement("input")',
        'document.createElement("select")',
        'document.createElement("textarea")',
        "addEventListener(",
    ):
        assert forbidden not in constitution_renderer

    for token in (
        ".discovery-business-context",
        ".discovery-constitution-panel",
        ".discovery-constitution-header",
        ".discovery-constitution-clause",
        ".discovery-constitution-source",
        ".discovery-constitution-button",
        ".discovery-constitution-panel.is-main-view",
        ".discovery-constitution-overview",
        ".discovery-constitution-metadata",
        ".discovery-constitution-details",
        ".discovery-constitution-status.status-applicable",
        ".discovery-mindmap-connectors",
        ".discovery-mindmap-connector.connector-level-3",
        ".discovery-mindmap-trunk",
        ".discovery-mindmap-branch",
        ".discovery-mindmap-node.is-map-preview",
        ".discovery-map-preview-badge",
        ".discovery-node-footer",
    ):
        assert token in styles, token

    for token in (
        "grid-template-columns: minmax(108px, 0.48fr) minmax(150px, 0.66fr) minmax(380px, 1.96fr)",
        "grid-template-columns: minmax(150px, 0.66fr) minmax(380px, 1.96fr)",
        '.discovery-mindmap[data-density="dense"]',
        "grid-template-columns: minmax(104px, 0.44fr) minmax(142px, 0.60fr) minmax(410px, 2.12fr)",
        "overflow: visible",
        "flex: 0 0 auto",
        ".discovery-mindmap-level.level-3",
        "grid-template-columns: max-content minmax(0, 1fr)",
        "grid-template-rows: auto auto",
        "min-height: 40px",
        "min-height: 36px",
        "padding: 4px 9px",
        "padding: 3px 8px",
        "text-overflow: ellipsis",
        "flex-wrap: nowrap",
        "gap: 4px",
    ):
        assert token in styles, token

    assert ".discovery-mindmap-level + .discovery-mindmap-level::before" not in styles
    assert ".discovery-mindmap-level + .discovery-mindmap-level .discovery-mindmap-node::before" not in styles

    rail_renderer = renderer.split("function renderOutlineDiscoveryRail()", 1)[1].split("\n}", 1)[0]
    assert "nodeList.appendChild(renderOutlineDiscoveryConstitution())" not in rail_renderer
    assert "if (outlineDiscoveryConstitutionOpen)" in rail_renderer


def test_outline_discovery_renderer_does_not_use_question_groups_as_primary_navigation():
    renderer = (REVIEW_ROOT / "renderer" / "scripts" / "outline-discovery-renderer.js").read_text(encoding="utf-8")
    assert "renderOutlineDiscoveryGroups();" not in renderer.split("function renderOutlineDiscoveryMindmap", 1)[0]
    assert "outlineDiscoveryNodesForMap" in renderer
    assert "renderOutlineDiscoveryNodeQuestions" in renderer
    assert re.search(r"function renderOutlineDiscoveryRail\(\) \{\s*updateOutlineDiscoveryProgress\(\);", renderer)


def test_outline_discovery_renderer_resets_writeback_fallback_when_leaving_mode():
    renderer = (REVIEW_ROOT / "renderer" / "scripts" / "outline-discovery-renderer.js").read_text(encoding="utf-8")
    leave_mode = renderer.split("function leaveOutlineDiscoveryMode()", 1)[1].split("\n}", 1)[0]

    assert "resetExportButtonLabels();" in leave_mode


def test_outline_intent_ledger_validator_rejects_duplicate_and_forward_supersede(tmp_path):
    valid = _run_review_validator(_outline_intent_ledger_sample(), tmp_path / "ledger-valid.json")
    assert valid.returncode == 0, _review_validator_output(valid)

    duplicate = _outline_intent_ledger_sample()
    duplicate["events"][1]["delta_id"] = "delta-001"
    result = _run_review_validator(duplicate, tmp_path / "ledger-duplicate.json")
    assert result.returncode != 0
    assert "duplicate delta_id" in _review_validator_output(result)

    forward = _outline_intent_ledger_sample()
    forward["events"][0]["supersedes_delta_id"] = "delta-002"
    result = _run_review_validator(forward, tmp_path / "ledger-forward.json")
    assert result.returncode != 0
    assert "earlier event" in _review_validator_output(result)


@pytest.mark.parametrize("schema_version", [1, 2])
def test_outline_intent_ledger_validator_rejects_legacy_versions(tmp_path, schema_version):
    legacy = _outline_intent_ledger_sample()
    legacy["schema_version"] = schema_version

    rejected = _run_review_validator(legacy, tmp_path / f"ledger-v{schema_version}.json")
    assert rejected.returncode != 0
    assert "schema_version 3" in _review_validator_output(rejected)


def test_outline_intent_ledger_validator_requires_v3_node_binding(tmp_path):
    invalid = _outline_intent_ledger_sample()
    invalid["events"][0].pop("outline_node_id")

    rejected = _run_review_validator(invalid, tmp_path / "ledger-v3-missing-node.json")
    assert rejected.returncode != 0
    assert "outline_node_id" in _review_validator_output(rejected)


def test_outline_intent_ledger_allows_empty_exclude_value_but_not_empty_content_operations(tmp_path):
    exclude = _outline_intent_ledger_sample()
    exclude["events"] = [
        {
            **exclude["events"][0],
            "operation": "exclude",
            "candidate_id": "goal-quality",
            "target_id": None,
            "value": "",
            "source_tag": "user",
        }
    ]
    result = _run_review_validator(exclude, tmp_path / "ledger-exclude-empty-value.json")
    assert result.returncode == 0, _review_validator_output(result)

    for operation in ("confirm_candidate", "add", "replace", "context_note"):
        invalid = _outline_intent_ledger_sample()
        event = invalid["events"][0]
        event.update(
            {
                "operation": operation,
                "candidate_id": "goal-quality" if operation == "confirm_candidate" else None,
                "target_id": "goal-primary" if operation == "replace" else None,
                "value": "",
                "source_tag": "user-confirmed" if operation == "confirm_candidate" else "user",
            }
        )
        result = _run_review_validator(invalid, tmp_path / f"ledger-{operation}-empty-value.json")
        assert result.returncode != 0, operation
        assert "value is required" in _review_validator_output(result)


@pytest.mark.parametrize(
    ("field", "value"),
    (
        ("artifact_path", "/tmp/specs/001-outline/prd/review/outline-review-data.json"),
        ("artifact_path", "specs/001-outline/../prd/review/outline-review-data.json"),
        ("outline_source_path", "C:/repo/specs/001-outline/spec-outline.md"),
        ("outline_source_path", "specs//001-outline/spec-outline.md"),
    ),
)
def test_outline_review_validator_rejects_unsafe_repository_paths(tmp_path, field, value):
    sample = _outline_review_validator_sample()
    sample[field] = value
    if field == "outline_source_path":
        for view in sample["modules"][0]["views"]:
            view["source_path"] = value

    result = _run_review_validator(sample, tmp_path / f"outline-unsafe-{field}.json")
    assert result.returncode != 0
    assert "safe repository-relative path" in _review_validator_output(result)


@pytest.mark.parametrize(
    ("field", "value"),
    (
        ("screens", [{"id": "screen-detail"}]),
        ("flow_steps", [{"id": "step-1"}]),
        ("api_endpoints", ["POST /confirm"]),
        ("database_models", ["OutlineConfirmation"]),
        ("implementation_tasks", ["create controller"]),
    ),
)
def test_outline_review_validator_rejects_downstream_design_detail(tmp_path, field, value):
    sample = _outline_review_validator_sample()
    sample["modules"][0]["views"][0][field] = value
    result = _run_review_validator(sample, tmp_path / f"outline-forbidden-{field}.json")
    assert result.returncode != 0
    assert "outline downstream design detail" in _review_validator_output(result)


def test_outline_renderer_launcher_package_and_digest_contracts_are_present():
    renderer = _review_renderer_bundle()
    launcher = (REVIEW_ROOT / "scripts" / "serve-review.mjs").read_text(encoding="utf-8")
    package = (REVIEW_ROOT / "renderer" / "scripts" / "confirmation-package.js").read_text(encoding="utf-8")
    assert 'data?.review_type === "outline" ? "views"' in renderer
    assert "renderOutlinePreview" in renderer
    assert "?outline=" in renderer and "outline-review-data.json" in renderer
    assert "--outline" in launcher and "prd/review/outline-review-data.json" in launcher
    assert "prd/review/outline-confirmation.md" in package
    assert "outline_digest" in package and "source_authority_ids" in package
    assert OUTLINE_DIGEST.is_file()


def test_outline_authorization_identity_and_v1_draft_migration_are_documented():
    prd = (COMMANDS_DIR / "prd.md").read_text(encoding="utf-8")
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")
    command_spec = COMMAND_SPEC.read_text(encoding="utf-8")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")

    for content, label in ((prd, "prd command"), (command_spec, "command spec"), (skill, "review-data skill")):
        assert "review-data-id.mjs" in content, label
        assert "current" in content and "complete" in content, label
        assert "recompute" in content, label

    assert "recursively sorts object keys" in command_spec
    assert "preserves array order" in command_spec
    assert "covers every review field" in command_spec
    assert "pre-v2 `localStorage` key" in renderer_readme
    assert "new key is absent" in renderer_readme
    assert "draft migration only" in renderer_readme


def test_outline_digest_is_deterministic_and_normalizes_text_and_authority_order(tmp_path):
    source = tmp_path / "spec-outline.md"
    source.write_bytes(b"# Outline\r\nvalue   \r\n")
    command = ["node", str(OUTLINE_DIGEST), str(source)]
    first = subprocess.run([*command, "source-b", "source-a"], text=True, capture_output=True, check=False)
    source.write_bytes(b"# Outline\nvalue\n")
    second = subprocess.run([*command, "source-a", "source-b", "source-a"], text=True, capture_output=True, check=False)
    assert first.returncode == second.returncode == 0, first.stderr + second.stderr
    assert re.fullmatch(r"[0-9a-f]{64}\n?", first.stdout)
    assert first.stdout.strip() == second.stdout.strip()


def test_review_data_validator_accepts_valid_flow_and_ui_samples(tmp_path):
    """The deterministic validator should accept minimal valid review data."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    for review_type in ("flow", "ui"):
        sample_path = tmp_path / f"{review_type}-review-data.json"
        sample_path.write_text(
            json.dumps(_review_validator_sample(review_type), ensure_ascii=False),
            encoding="utf-8",
        )
        result = subprocess.run(
            ["node", str(REVIEW_DATA_VALIDATOR), str(sample_path)],
            cwd=PROJECT_ROOT,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            check=False,
        )
        assert result.returncode == 0, _review_validator_output(result)
        assert "review data validation passed" in result.stdout


def test_review_priority_schema_supports_v2_without_changing_review_level_contract():
    """Priority is an orthogonal v2 field while legacy v1 remains declared as readable."""
    for path, review_type in ((FLOW_REVIEW_SCHEMA, "flow"), (UI_REVIEW_SCHEMA, "ui")):
        schema = json.loads(path.read_text(encoding="utf-8"))
        assert schema["properties"]["schema_version"] == {"type": "integer", "enum": [1, 2]}, review_type
        node_properties = schema["$defs"]["node"]["properties"]
        assert node_properties["confirmation_priority"]["enum"] == ["critical", "important", "normal"]
        assert node_properties["priority_reason"]["minLength"] == 18
        assert node_properties["critical_basis"]["minLength"] == 18
        assert node_properties["review_level"]["enum"] == [
            "must_confirm",
            "recommended",
            "uncertain",
            "key_step",
            "verified",
            "system_arch",
        ]


def test_review_priority_schemas_require_critical_qualification_fields():
    """Schema consumers must enforce the same critical evidence as the CLI and browser."""
    critical_rule = {
        "if": {
            "properties": {"confirmation_priority": {"const": "critical"}},
            "required": ["confirmation_priority"],
        },
        "then": {"required": ["critical_basis", "priority_reason"]},
    }

    for path, review_type in (
        (FLOW_REVIEW_SCHEMA, "flow"),
        (UI_REVIEW_SCHEMA, "ui"),
        (OUTLINE_REVIEW_SCHEMA, "outline"),
    ):
        schema = json.loads(path.read_text(encoding="utf-8"))
        assert critical_rule in schema["$defs"]["node"].get("allOf", []), review_type


def test_review_data_validator_accepts_legacy_v1_and_valid_priority_v2(tmp_path):
    """Existing review files remain readable while newly generated files use strict v2 priority data."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    for review_type in ("flow", "ui"):
        legacy = _run_review_validator(
            _review_validator_sample(review_type),
            tmp_path / f"{review_type}-legacy-v1.json",
        )
        assert legacy.returncode == 0, _review_validator_output(legacy)

        current = _run_review_validator(
            _priority_review_validator_sample(review_type),
            tmp_path / f"{review_type}-priority-v2.json",
        )
        assert current.returncode == 0, _review_validator_output(current)


def test_review_data_validator_requires_priority_on_v2_actionable_nodes_only(tmp_path):
    """Every actionable v2 node is prioritized, while informational nodes stay outside the budget."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    missing_priority = _priority_review_validator_sample("flow")
    nodes = missing_priority["modules"][0]["diagrams"][0]["nodes"]
    nodes[0].pop("confirmation_priority")
    result = _run_review_validator(missing_priority, tmp_path / "missing-priority.json")
    assert result.returncode != 0
    assert "confirmation_priority is required for actionable schema v2 nodes" in _review_validator_output(result)

    informational = _priority_review_validator_sample("flow")
    info_node = informational["modules"][0]["diagrams"][0]["nodes"][2]
    info_node.pop("confirmation_priority")
    info_node.pop("options")
    info_node.pop("recommended_option")
    info_node["node_kind"] = "flow"
    info_node["review_level"] = "verified"
    result = _run_review_validator(informational, tmp_path / "informational-without-priority.json")
    assert result.returncode == 0, _review_validator_output(result)


def test_review_data_validator_requires_concrete_critical_qualification(tmp_path):
    """Critical priority needs both a severe-impact basis and an explicit reviewer-facing reason."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    for missing_field in ("critical_basis", "priority_reason"):
        sample = _priority_review_validator_sample("ui", critical_indexes=(1,))
        sample["modules"][0]["screens"][0]["nodes"][0].pop(missing_field)
        result = _run_review_validator(sample, tmp_path / f"critical-missing-{missing_field}.json")
        assert result.returncode != 0
        assert missing_field in _review_validator_output(result)


@pytest.mark.parametrize(
    ("node_count", "allowed_critical", "rejected_critical"),
    (
        (0, 0, None),
        (1, 1, None),
        (10, 1, 2),
        (11, 2, 3),
        (20, 2, 3),
        (21, 3, None),
    ),
)
def test_review_data_validator_enforces_deterministic_critical_budget(
    tmp_path,
    node_count,
    allowed_critical,
    rejected_critical,
):
    """Critical is scarce: cap = N == 0 ? 0 : min(3, max(1, ceil(N / 10)))."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    allowed = _priority_review_validator_sample(
        "flow",
        node_count=node_count,
        critical_indexes=tuple(range(1, allowed_critical + 1)),
    )
    allowed_path = tmp_path / f"critical-budget-{node_count}-allowed.json"
    result = _run_review_validator(allowed, allowed_path)
    assert result.returncode == 0, _review_validator_output(result)

    if rejected_critical is None:
        return
    rejected = _priority_review_validator_sample(
        "flow",
        node_count=node_count,
        critical_indexes=tuple(range(1, rejected_critical + 1)),
    )
    rejected_path = tmp_path / f"critical-budget-{node_count}-rejected.json"
    original_bytes = json.dumps(rejected, ensure_ascii=False).encode("utf-8")
    rejected_path.write_bytes(original_bytes)
    result = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(rejected_path)],
        cwd=PROJECT_ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )
    assert result.returncode != 0
    assert f"critical priority count {rejected_critical} exceeds cap" in _review_validator_output(result)
    assert rejected_path.read_bytes() == original_bytes


def test_review_browser_runtime_enforces_priority_and_normalizes_legacy_in_memory():
    """Browser validation mirrors v2 priority rules while v1 is normalized without rewriting source data."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer runtime tests")

    overlays = REVIEW_ROOT / "renderer" / "scripts" / "simple-overlays.js"
    state_store = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    data_validator = REVIEW_ROOT / "renderer" / "scripts" / "data-validator.js"
    data_loader = (REVIEW_ROOT / "renderer" / "scripts" / "data-loader.js").read_text(encoding="utf-8")
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = [
  {json.dumps(str(overlays))},
  {json.dumps(str(state_store))},
  {json.dumps(str(data_validator))}
].map((path) => fs.readFileSync(path, "utf8")).join(String.fromCharCode(10)) + `
const baseNode = {{
  id: "N1",
  label: "确认发布边界",
  decision_background: "发布对象边界会决定真实数据由谁查看，错误选择将影响后续页面和验收。",
  decision_summary: "现在需要确认发布对象边界，以便后续工作依据明确的授权范围继续。",
  options: [{{ id: "OPTION_A", benefit: "明确边界", cost: "需要确认", consequence: "继续", next_exit: "continue", recommendation_reason: "当前证据最完整" }}, {{ id: "OPTION_B", benefit: "暂停", cost: "延期", consequence: "补充", next_exit: "needs-decision" }}],
  recommended_option: "OPTION_A"
}};
const payload = (version, nodes) => ({{ schema_version: version, review_type: "flow", modules: [{{ diagrams: [{{ title: "发布", nodes }}] }}] }});
if (validateReviewData(payload(1, [baseNode])) !== "") throw new Error("legacy v1 was rejected");
if (validateReviewData(payload(2, [baseNode])) !== "") throw new Error("schema v2 was rejected before runtime validation");
const missing = runtimeValidateReviewData(payload(2, [baseNode]));
if (!missing.errors.some((message) => message.includes("confirmation_priority"))) throw new Error(JSON.stringify(missing));
const overBudgetNodes = Array.from({{ length: 10 }}, (_, index) => ({{
  ...baseNode,
  id: "N" + (index + 1),
  confirmation_priority: index < 2 ? "critical" : "normal",
  critical_basis: index < 2 ? "错误决定会造成不可逆的敏感数据泄露，且没有安全默认值或可撤销路径。" : undefined,
  priority_reason: index < 2 ? "这个边界需要负责人逐项确认，不能由模型批量采用默认推荐选项。" : undefined
}}));
const overBudget = runtimeValidateReviewData(payload(2, overBudgetNodes));
if (!overBudget.errors.some((message) => message.includes("critical") && message.includes("上限"))) throw new Error(JSON.stringify(overBudget));
`;
const context = {{
  window: {{ SpecCompassDom: {{}} }},
  localStorage: {{ setItem: () => undefined, removeItem: () => undefined, getItem: () => null }},
  console,
  requiresNodeDecision: (node) => Boolean(node.recommended_option || (node.options || []).length || node.review_level === "must_confirm")
}};
vm.createContext(context);
vm.runInContext(source, context);
"""
    result = subprocess.run(["node", "-e", node_program], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr or result.stdout

    for token in (
        "normalizeLegacyReviewData",
        "schema_version === 1",
        'confirmation_priority: "normal"',
    ):
        assert token in data_loader


def test_outline_browser_runtime_matches_cli_identity_and_option_contracts():
    """Browser acceptance must block identity drift and unexplained binary Outline decisions."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer runtime tests")

    overlays = REVIEW_ROOT / "renderer" / "scripts" / "simple-overlays.js"
    state_store = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    data_validator = REVIEW_ROOT / "renderer" / "scripts" / "data-validator.js"
    sample = _outline_review_validator_sample()
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = [
  {json.dumps(str(overlays))},
  {json.dumps(str(state_store))},
  {json.dumps(str(data_validator))}
].map((path) => fs.readFileSync(path, "utf8")).join(String.fromCharCode(10));
const base = {json.dumps(sample, ensure_ascii=False)};
const context = {{
  window: {{ SpecCompassDom: {{}} }},
  localStorage: {{ setItem: () => undefined, removeItem: () => undefined, getItem: () => null }},
  console,
  requiresNodeDecision: (node) => Boolean(node.recommended_option || (node.options || []).length || node.review_level === "must_confirm")
}};
vm.createContext(context);
vm.runInContext(source, context);
const valid = context.runtimeValidateReviewData(structuredClone(base));
if (valid.errors.length) throw new Error("valid sample rejected: " + JSON.stringify(valid));
const normalizedDigestVariant = structuredClone(base);
normalizedDigestVariant.outline_digest = "sha256:" + "A".repeat(64);
const normalizedDigestBaseError = context.validateReviewData(normalizedDigestVariant);
if (normalizedDigestBaseError) {{
  throw new Error("normalized digest variant rejected by base validator: " + normalizedDigestBaseError);
}}
const normalizedDigestResult = context.runtimeValidateReviewData(normalizedDigestVariant);
if (normalizedDigestResult.errors.length) {{
  throw new Error("normalized digest variant rejected: " + JSON.stringify(normalizedDigestResult));
}}
const identityDrift = structuredClone(base);
identityDrift.source_authority_ids = ["different-authority"];
const identityResult = context.runtimeValidateReviewData(identityDrift);
if (!identityResult.errors.some((message) => message.includes("source_authority_ids") && message.includes("exactly"))) {{
  throw new Error("authority identity drift accepted: " + JSON.stringify(identityResult));
}}
const unexplainedBinary = structuredClone(base);
delete unexplainedBinary.modules[0].views[0].nodes[0].options_count_rationale;
const binaryResult = context.runtimeValidateReviewData(unexplainedBinary);
if (!binaryResult.errors.some((message) => message.includes("options_count_rationale"))) {{
  throw new Error("unexplained binary decision accepted: " + JSON.stringify(binaryResult));
}}
"""
    result = subprocess.run(["node", "-e", node_program], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr or result.stdout


def test_review_data_identity_covers_full_review_contract(tmp_path: Path):
    """Changing visible review meaning must invalidate draft and package identity."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer identity tests")

    script = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    sample = _outline_review_validator_sample()
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(script))}, "utf8");
const context = {{
  window: {{ SpecCompassDom: {{}} }},
  console,
  localStorage: {{ setItem: () => undefined, removeItem: () => undefined, getItem: () => null }},
  reviewData: null,
  state: {{}},
  STORAGE_PREFIX: "test:",
  create: () => ({{}}),
  requiresNodeDecision: () => true,
  $: () => ({{ textContent: "", classList: {{ toggle: () => undefined }} }})
}};
vm.createContext(context);
vm.runInContext(source, context);
const base = {json.dumps(sample, ensure_ascii=False)};
const baseId = context.reviewDataIdentifier(base);
const optionChanged = structuredClone(base);
optionChanged.modules[0].views[0].nodes[0].options[0].label = "接受不同的产品边界";
if (context.reviewDataIdentifier(optionChanged) === baseId) {{
  throw new Error("option content did not change review-data identity");
}}
const viewChanged = structuredClone(base);
viewChanged.modules[0].views[1].recommended_first_slice = "改为另一个首个交付切片";
if (context.reviewDataIdentifier(viewChanged) === baseId) {{
  throw new Error("outline view content did not change review-data identity");
}}
console.log(baseId);
"""
    result = subprocess.run(["node", "-e", node_program], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr or result.stdout

    review_data = tmp_path / "outline-review-data.json"
    review_data.write_text(json.dumps(sample, ensure_ascii=False), encoding="utf-8")
    cli_result = subprocess.run(
        ["node", REVIEW_DATA_ID, review_data],
        capture_output=True,
        text=True,
        check=False,
    )
    assert cli_result.returncode == 0, cli_result.stderr or cli_result.stdout
    assert cli_result.stdout.strip() == result.stdout.strip()


def test_schema_v1_renderer_loads_legacy_local_storage_identity():
    """Adding in-memory normal priority must not discard existing v1 browser drafts."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer state migration tests")

    state_store = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    data_loader = REVIEW_ROOT / "renderer" / "scripts" / "data-loader.js"
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const stateSource = fs.readFileSync({json.dumps(str(state_store))}, "utf8");
const loaderSource = fs.readFileSync({json.dumps(str(data_loader))}, "utf8");
const stored = {{ N1: {{ status: "DRAFT", draft_option: "OPTION_B", note: "保留旧草稿" }} }};
const storage = new Map();
const context = {{
  window: {{ SpecCompassDom: {{}}, location: {{ protocol: "http:", hostname: "127.0.0.1" }} }},
  console,
  STORAGE_PREFIX: "test:",
  reviewData: null,
  state: {{}},
  create: () => ({{}}),
  requiresNodeDecision: (node) => Boolean(node.recommended_option || (node.options || []).length),
  $: () => ({{ textContent: "", disabled: false, classList: {{ toggle: () => undefined }} }}),
  localStorage: {{
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  }}
}};
vm.createContext(context);
vm.runInContext(stateSource, context);
const legacy = {{
  schema_version: 1,
  review_type: "flow",
  artifact_path: "specs/001/flows/review/flow-review-data.json",
  batch_id: "FLOW-001",
  project: {{ name: "Demo", feature: "001" }},
  source_snapshot: [{{ path: "specs/001/spec.md" }}],
  modules: [{{ id: "M1", diagrams: [{{ id: "D1", nodes: [{{
    id: "N1",
    review_level: "must_confirm",
    options: [{{ id: "OPTION_A" }}, {{ id: "OPTION_B" }}],
    recommended_option: "OPTION_A"
  }}] }}] }}]
}};
const legacyKey = context.legacyStorageKey(legacy);
storage.set(legacyKey, JSON.stringify(stored));
const loaderContext = {{ ...context, acceptReviewData: () => true }};
vm.createContext(loaderContext);
vm.runInContext(loaderSource.split('$("review-mode-switch")')[0], loaderContext);
context.reviewData = loaderContext.normalizeLegacyReviewData(legacy);
context.loadState();
if (context.state.N1?.note !== "保留旧草稿") {{
  throw new Error("legacy v1 draft was not restored: " + JSON.stringify(context.state));
}}
"""
    result = subprocess.run(["node", "-e", node_program], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr or result.stdout


def test_review_renderer_exposes_priority_counts_filters_badges_and_individual_critical_handling():
    """The rail makes scarce critical decisions visible without changing review-level semantics."""
    renderer = _review_renderer_bundle()
    html = REVIEW_PAGE_RENDERER.read_text(encoding="utf-8")
    review_ui = (REVIEW_ROOT / "renderer" / "styles" / "review-ui.css").read_text(encoding="utf-8")

    for token in (
        "priorityLabel",
        "priorityCounts",
        "selectedPriority",
        "criticalRequiresIndividual",
        "非常重要",
        "重要",
        "普通",
    ):
        assert token in renderer
    for token in ('id="priority-filters"', 'data-priority="critical"', 'data-priority="important"', 'data-priority="normal"'):
        assert token in html
    assert "priority-badge" in review_ui
    assert "priority-critical" in review_ui
    assert "confirmation_priority" in renderer
    assert "review_level" in renderer


def test_flow_ui_generation_contract_controls_critical_priority_before_validation():
    """Generation guidance must rank and downgrade critical candidates rather than using the cap as a quota."""
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    for content, label in ((_command("flow"), "flow"), (_command("ui"), "ui"), (skill, "review-data skill")):
        assert "schema_version: 2" in content, label
        assert "confirmation_priority" in content, label
        assert "critical_basis" in content, label
        assert "priority_reason" in content, label
        assert "min(3, max(1, ceil(N / 10)))" in content, label
        assert "zero critical" in content or "0 个 critical" in content, label
        assert "downgrade" in content or "降级" in content, label
        assert "individual" in content or "逐项" in content or "单项" in content, label
        assert "bulk" in content or "批量" in content, label


def test_review_data_validator_rejects_missing_recommendation_and_unsplit_large_diagram(tmp_path):
    """Validator should catch the two most important low-capability agent failures."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    missing_recommendation = _review_validator_sample("flow")
    missing_recommendation["modules"][0]["diagrams"][0]["nodes"][0].pop("recommended_option")
    missing_path = tmp_path / "missing-recommendation.json"
    missing_path.write_text(json.dumps(missing_recommendation, ensure_ascii=False), encoding="utf-8")

    result = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(missing_path)],
        cwd=PROJECT_ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )
    assert result.returncode != 0
    assert "recommended_option" in _review_validator_output(result)

    unsplit_large = _review_validator_sample("flow", node_count=10, include_exception=False)
    large_path = tmp_path / "unsplit-large-flow.json"
    large_path.write_text(json.dumps(unsplit_large, ensure_ascii=False), encoding="utf-8")

    result = subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(large_path)],
        cwd=PROJECT_ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )
    assert result.returncode != 0
    assert "10+ business nodes" in _review_validator_output(result)


def test_review_data_validator_rejects_duplicate_node_ids_across_items(tmp_path):
    """Renderer browser state is keyed by node id, so IDs must be globally unique."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    duplicate_local_node = _review_validator_sample("flow")
    first_item_nodes = duplicate_local_node["modules"][0]["diagrams"][0]["nodes"]
    first_item_nodes[1]["id"] = first_item_nodes[0]["id"]
    result = _run_review_validator(
        duplicate_local_node,
        tmp_path / "duplicate-local-node-id.json",
    )
    assert result.returncode != 0
    assert "duplicate node id" in _review_validator_output(result)

    duplicate_global_node = _review_validator_sample("flow")
    first_item = duplicate_global_node["modules"][0]["diagrams"][0]
    second_item = json.loads(json.dumps(first_item))
    second_item["id"] = "D2"
    second_item["title"] = "问卷发布二次确认"
    second_item["nodes"][0]["id"] = first_item["nodes"][0]["id"]
    duplicate_global_node["modules"][0]["diagrams"].append(second_item)

    result = _run_review_validator(
        duplicate_global_node,
        tmp_path / "duplicate-global-node-id.json",
    )
    assert result.returncode != 0
    assert "duplicate node id" in _review_validator_output(result)
    assert "global" in _review_validator_output(result)


def test_review_data_validator_rejects_flow_like_ui_without_screen_structure(tmp_path):
    """UI data must contain screen regions/components/states, not only review nodes."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    flow_like_ui = _review_validator_sample("ui")
    screen = flow_like_ui["modules"][0]["screens"][0]
    screen.pop("screen_layout")
    screen.pop("screen_regions")
    result = _run_review_validator(flow_like_ui, tmp_path / "flow-like-ui.json")
    assert result.returncode != 0
    assert "UI review data requires screen_regions" in _review_validator_output(result)

    duplicate_component = _review_validator_sample("ui")
    components = duplicate_component["modules"][0]["screens"][0]["screen_regions"][0]["components"]
    components[1]["id"] = components[0]["id"]
    result = _run_review_validator(duplicate_component, tmp_path / "duplicate-ui-component.json")
    assert result.returncode != 0
    assert "duplicate component id" in _review_validator_output(result)


def test_review_data_validator_requires_specific_ui_screen_context(tmp_path):
    """Every UI screen must explain its business role, not merely name layout or visible objects."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    required_fields = (
        "business_context",
        "primary_users",
        "entry_scenarios",
        "user_goal",
        "user_outcome",
        "flow_refs",
    )
    for field in required_fields:
        sample = _review_validator_sample("ui")
        sample["modules"][0]["screens"][0].pop(field)
        result = _run_review_validator(sample, tmp_path / f"missing-{field}.json")
        assert result.returncode != 0, field
        assert field in _review_validator_output(result), field

    object_inventory = _review_validator_sample("ui")
    object_inventory["modules"][0]["screens"][0]["business_context"] = (
        "该屏展示命令、订单、成交、持仓、资金、风险事件、审计链路和对账结果。"
    )
    result = _run_review_validator(object_inventory, tmp_path / "object-inventory-context.json")
    assert result.returncode != 0
    assert "vague UI context copy" in _review_validator_output(result)

    layout_copy = _review_validator_sample("ui")
    layout_copy["modules"][0]["screens"][0]["user_goal"] = "列表加详情"
    result = _run_review_validator(layout_copy, tmp_path / "layout-context.json")
    assert result.returncode != 0
    assert "user_goal" in _review_validator_output(result)

    generic_role = _review_validator_sample("ui")
    generic_role["modules"][0]["screens"][0]["primary_users"] = ["用户"]
    result = _run_review_validator(generic_role, tmp_path / "generic-ui-role.json")
    assert result.returncode != 0
    assert "generic user wording" in _review_validator_output(result)


def test_ui_preview_display_contract_preserves_exact_visible_content(tmp_path):
    """Low-fidelity preview fields stay source-backed and component-specific."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    valid = _review_validator_sample("ui")
    component = valid["modules"][0]["screens"][0]["screen_regions"][0]["components"][0]
    component["display"] = {
        "value": "员工满意度调查",
        "placeholder": "请输入问卷标题",
        "helper_text": "填写用户看到的问卷名称。",
    }
    result = _run_review_validator(valid, tmp_path / "ui-display-valid.json")
    assert result.returncode == 0, _review_validator_output(result)

    wrong_options = _review_validator_sample("ui")
    button = wrong_options["modules"][0]["screens"][0]["screen_regions"][0]["components"][1]
    button["display"] = {"options": ["直接发布", "定时发布"]}
    result = _run_review_validator(wrong_options, tmp_path / "ui-button-options-invalid.json")
    assert result.returncode != 0
    assert "display.options is allowed only for select or filter" in _review_validator_output(result)

    mismatched_table = _review_validator_sample("ui")
    region = mismatched_table["modules"][0]["screens"][0]["screen_regions"][0]
    region["components"].append(
        {
            "id": "publish-table",
            "kind": "table",
            "label": "发布记录",
            "purpose": "核对发布对象与发布状态。",
            "source_ref": "specs/example/spec.md#问卷发布",
            "display": {
                "columns": ["发布对象", "状态"],
                "rows": [["全体员工"]],
            },
        }
    )
    result = _run_review_validator(mismatched_table, tmp_path / "ui-table-row-invalid.json")
    assert result.returncode != 0
    assert "same number of cells as display.columns" in _review_validator_output(result)

    renderer = _review_renderer_bundle()
    assert "显示规格标注" in renderer
    assert "目标 UI 预览区" in renderer
    assert "ui-preview-boundary-bar" in renderer
    assert "ui-preview-canvas" in renderer
    assert "查看全图" in renderer
    assert "showPreviewDialog" in renderer
    assert "ui-preview-inline" in renderer
    assert "speccompass-preview-dialog" in renderer
    assert "返回审核" in renderer
    assert "selectedUiComponentId" in renderer
    assert "ui-component-adjustment-panel" in renderer
    assert "修改建议" in renderer
    assert "显示文字" in renderer
    assert "位置与尺寸" in renderer
    assert "向左移动 8 像素" in renderer
    assert "UI_COMPONENT_ADJUSTMENT" in renderer
    assert "ui_component_adjustments" in renderer
    assert "整体布局建议" in renderer
    assert "UI_LAYOUT_ADJUSTMENT" in renderer
    assert "ui_layout_adjustments" in renderer
    assert "当前三栏改为两栏" in renderer
    assert "selectedUiLayoutId" in renderer
    assert "selectedUiLayoutEntry" in renderer
    assert "ui-layout-selectable" in renderer
    assert "调整${item?.title" in renderer
    assert "stays out of the right rail until" in (REVIEW_ROOT / "renderer" / "README.md").read_text(encoding="utf-8")
    assert "full-preview dialog remains" in (REVIEW_ROOT / "renderer" / "README.md").read_text(encoding="utf-8")
    assert "表格列文案未提供" in renderer
    assert "输入内容未提供" in renderer
    assert "选项文案未提供" in renderer
    assert 'appendText(table, "caption", label)' in renderer
    assert "用于集中展示检查结果或摘要。" not in renderer


def _run_review_validator(sample: dict, path: Path) -> subprocess.CompletedProcess[str]:
    path.write_text(json.dumps(sample, ensure_ascii=False), encoding="utf-8")
    return subprocess.run(
        ["node", str(REVIEW_DATA_VALIDATOR), str(path)],
        cwd=PROJECT_ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )


def _review_validator_output(result: subprocess.CompletedProcess[str]) -> str:
    return (result.stderr or "") + (result.stdout or "")


def test_review_data_validator_rejects_invalid_enums_and_missing_decision_tradeoff_fields(tmp_path):
    """Validator should catch schema-level review data drift even without a JSON Schema runtime."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    enum_cases = (
        ("review-level", ["modules", 0, "diagrams", 0, "nodes", 0, "review_level"], "approve"),
        ("node-kind", ["modules", 0, "diagrams", 0, "nodes", 0, "node_kind"], "gateway"),
        ("item-type", ["modules", 0, "diagrams", 0, "item_type"], "flow"),
    )

    for case_name, path_tokens, invalid_value in enum_cases:
        sample = _review_validator_sample("flow")
        target = sample
        for token in path_tokens[:-1]:
            target = target[token]
        target[path_tokens[-1]] = invalid_value
        result = _run_review_validator(sample, tmp_path / f"{case_name}.json")
        assert result.returncode != 0, case_name
        assert path_tokens[-1] in _review_validator_output(result)

    missing_consequence = _review_validator_sample("ui")
    missing_consequence["modules"][0]["screens"][0]["nodes"][0]["options"][0].pop("consequence")
    result = _run_review_validator(missing_consequence, tmp_path / "missing-consequence.json")
    assert result.returncode != 0
    assert "consequence" in _review_validator_output(result)

    missing_background = _review_validator_sample("flow")
    missing_background["modules"][0]["diagrams"][0]["nodes"][0].pop("decision_background")
    result = _run_review_validator(missing_background, tmp_path / "missing-decision-background.json")
    assert result.returncode != 0
    assert "decision_background" in _review_validator_output(result)

    missing_summary = _review_validator_sample("flow")
    missing_summary["modules"][0]["diagrams"][0]["nodes"][0].pop("decision_summary")
    result = _run_review_validator(missing_summary, tmp_path / "missing-decision-summary.json")
    assert result.returncode != 0
    assert "decision_summary" in _review_validator_output(result)

    empty_benefit = _review_validator_sample("flow")
    empty_benefit["modules"][0]["diagrams"][0]["nodes"][0]["options"][0]["benefit"] = "   "
    result = _run_review_validator(empty_benefit, tmp_path / "empty-benefit.json")
    assert result.returncode != 0
    assert "benefit" in _review_validator_output(result)

    empty_cost = _review_validator_sample("flow")
    empty_cost["modules"][0]["diagrams"][0]["nodes"][0]["options"][0]["cost"] = "   "
    result = _run_review_validator(empty_cost, tmp_path / "empty-cost.json")
    assert result.returncode != 0
    assert "cost" in _review_validator_output(result)

    loose_option_b_exit = _review_validator_sample("flow")
    loose_option_b_exit["modules"][0]["diagrams"][0]["nodes"][0]["options"][1]["next_exit"] = "continue-after-needs-decision"
    result = _run_review_validator(loose_option_b_exit, tmp_path / "loose-option-b-exit.json")
    assert result.returncode != 0
    assert "OPTION_B.next_exit must start with needs-decision" in _review_validator_output(result)


def test_review_data_validator_enforces_review_option_quality_rules(tmp_path):
    """Human choices should be actionable and sized by review risk, not generic approve/defer states."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    binary_must_confirm_without_rationale = _review_validator_sample("flow")
    node = binary_must_confirm_without_rationale["modules"][0]["diagrams"][0]["nodes"][0]
    node["options"] = node["options"][:2]
    result = _run_review_validator(binary_must_confirm_without_rationale, tmp_path / "binary-must-confirm-without-rationale.json")
    assert result.returncode != 0
    assert "options_count_rationale" in _review_validator_output(result)

    binary_must_confirm_with_rationale = _review_validator_sample("flow")
    node = binary_must_confirm_with_rationale["modules"][0]["diagrams"][0]["nodes"][0]
    node["options"] = node["options"][:2]
    node["options_count_rationale"] = "现有材料只支持继续当前发布校验或先补齐产品规则两个互斥出口，没有第三条可执行路径。"
    result = _run_review_validator(binary_must_confirm_with_rationale, tmp_path / "binary-must-confirm-with-rationale.json")
    assert result.returncode == 0, _review_validator_output(result)

    binary_without_rationale = _review_validator_sample("flow")
    node = binary_without_rationale["modules"][0]["diagrams"][0]["nodes"][0]
    node["review_level"] = "recommended"
    node["options"] = node["options"][:2]
    result = _run_review_validator(binary_without_rationale, tmp_path / "binary-without-rationale.json")
    assert result.returncode != 0
    assert "options_count_rationale" in _review_validator_output(result)

    binary_with_rationale = _review_validator_sample("flow")
    node = binary_with_rationale["modules"][0]["diagrams"][0]["nodes"][0]
    node["review_level"] = "recommended"
    node["options"] = node["options"][:2]
    node["options_count_rationale"] = "该判断只有继续当前发布规则或补齐业务口径两个互斥出口，没有第三条可执行路径。"
    result = _run_review_validator(binary_with_rationale, tmp_path / "binary-with-rationale.json")
    assert result.returncode == 0, _review_validator_output(result)

    ui_binary_must_confirm_with_rationale = _review_validator_sample("ui")
    node = ui_binary_must_confirm_with_rationale["modules"][0]["screens"][0]["nodes"][0]
    node["options"] = node["options"][:2]
    node["options_count_rationale"] = "这个界面判断只有保留当前发布检查或先补齐发布规则两个互斥出口，没有第三种可执行的界面调整路径。"
    result = _run_review_validator(ui_binary_must_confirm_with_rationale, tmp_path / "ui-binary-must-confirm-with-rationale.json")
    assert result.returncode != 0
    assert "UI must_confirm nodes require 3-4 options" in _review_validator_output(result)

    forbidden_exit = _review_validator_sample("ui")
    forbidden_exit["modules"][0]["screens"][0]["nodes"][0]["options"][0]["next_exit"] = "通过"
    result = _run_review_validator(forbidden_exit, tmp_path / "forbidden-empty-action-exit.json")
    assert result.returncode != 0
    assert "actionable exit" in _review_validator_output(result)


def test_review_data_validator_requires_business_flow_semantics(tmp_path):
    """Flow nodes and decision exits must carry business meaning, not just labels."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    repeated_summary = _review_validator_sample("flow")
    first_node = repeated_summary["modules"][0]["diagrams"][0]["nodes"][0]
    first_node["plain_summary"] = first_node["label"]
    result = _run_review_validator(repeated_summary, tmp_path / "repeated-flow-summary.json")
    assert result.returncode != 0
    assert "plain_summary must explain the business context" in _review_validator_output(result)

    vague_summary = _review_validator_sample("flow")
    vague_summary["modules"][0]["diagrams"][0]["nodes"][1]["plain_summary"] = "系统进入下一步"
    result = _run_review_validator(vague_summary, tmp_path / "vague-flow-summary.json")
    assert result.returncode != 0
    assert "plain_summary is too generic" in _review_validator_output(result)

    padded_summary = _review_validator_sample("flow")
    padded_summary["modules"][0]["diagrams"][0]["nodes"][1]["plain_summary"] = "该节点负责处理相关业务并推进后续流程。"
    result = _run_review_validator(padded_summary, tmp_path / "padded-flow-summary.json")
    assert result.returncode != 0
    assert "plain_summary is too generic" in _review_validator_output(result)

    missing_decision_edge_label = _review_validator_sample("flow")
    missing_decision_edge_label["modules"][0]["diagrams"][0]["edges"][0].pop("label")
    result = _run_review_validator(missing_decision_edge_label, tmp_path / "missing-decision-edge-label.json")
    assert result.returncode != 0
    assert "outgoing edges from decision or human_judgment nodes require" in _review_validator_output(result)

    vague_decision_edge_label = _review_validator_sample("flow")
    vague_decision_edge_label["modules"][0]["diagrams"][0]["edges"][0]["label"] = "继续"
    result = _run_review_validator(vague_decision_edge_label, tmp_path / "vague-decision-edge-label.json")
    assert result.returncode != 0
    assert "decision exit label is too generic" in _review_validator_output(result)

    numbered_decision_edge = _review_validator_sample("flow")
    numbered_decision_edge["modules"][0]["diagrams"][0]["edges"][0]["label"] = "进入第 2 个业务环节"
    result = _run_review_validator(numbered_decision_edge, tmp_path / "numbered-decision-edge.json")
    assert result.returncode != 0
    assert "decision exit label is too generic" in _review_validator_output(result)

    vague_decision_edge_variant = _review_validator_sample("flow")
    vague_decision_edge_variant["modules"][0]["diagrams"][0]["edges"][0]["label"] = "进入下一步"
    result = _run_review_validator(vague_decision_edge_variant, tmp_path / "vague-decision-edge-variant.json")
    assert result.returncode != 0
    assert "decision exit label is too generic" in _review_validator_output(result)

    flow_with_ui_fields = _review_validator_sample("flow")
    flow_with_ui_fields["modules"][0]["diagrams"][0]["business_context"] = "这是不应进入 Flow review-data 的 UI 页面背景字段。"
    result = _run_review_validator(flow_with_ui_fields, tmp_path / "flow-with-ui-fields.json")
    assert result.returncode != 0
    assert "keep Flow and UI review contracts separate" in _review_validator_output(result)


def test_review_data_validator_requires_flow_context_layers(tmp_path):
    """Project, module, and diagram summaries must carry real business context."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    cases = [
        ("business_overview", "该项目主要用于展示相关流程。", "business_overview"),
        ("review_goal", "帮助用户了解相关流程。", "review_goal"),
        ("module_summary", "该模块负责处理相关业务工作。", "module summary"),
        ("flow_summary", "这张图主要用于展示业务流程。", "flow summary"),
    ]
    for name, value, expected in cases:
        sample = _review_validator_sample("flow")
        if name in {"business_overview", "review_goal"}:
            sample["project"][name] = value
        elif name == "module_summary":
            sample["modules"][0]["summary"] = value
        else:
            sample["modules"][0]["diagrams"][0]["summary"] = value
        result = _run_review_validator(sample, tmp_path / f"generic-{name}.json")
        assert result.returncode != 0, name
        assert expected in _review_validator_output(result), name


def test_review_data_validator_rejects_boilerplate_review_option_copy(tmp_path):
    """Review options must explain the real business choice, not repeat stock phrases."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    boilerplate = _review_validator_sample("flow")
    option = boilerplate["modules"][0]["diagrams"][0]["nodes"][0]["options"][0]
    option["label"] = "推荐方案"
    option["benefit"] = "当前依据和风险边界看起来正确，可按推荐保留。"
    option["cost"] = "当前节点需要补充业务决策，责任人或风险口径。"
    option["consequence"] = "当前节点需要补充业务决策，责任人或风险口径。"
    option["recommendation_reason"] = "当前依据和风险边界看起来正确，可按推荐保留。"

    result = _run_review_validator(boilerplate, tmp_path / "boilerplate-option-copy.json")
    output = _review_validator_output(result)
    assert result.returncode != 0
    assert "option OPTION_A label is too generic" in output
    assert "boilerplate option copy" in output
    assert "option benefit must name a concrete upside" in output
    assert "option cost must name a concrete tradeoff" in output


def test_review_data_validator_rejects_legacy_when_to_choose_benefit_copy(tmp_path):
    """The benefit field should state the upside, not reuse old 'when to choose' wording."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    legacy_benefit = _review_validator_sample("flow")
    option = legacy_benefit["modules"][0]["diagrams"][0]["nodes"][0]["options"][0]
    option["benefit"] = "适合运营只想尽快发布问卷，并且愿意在线下自己检查目标人群和截止时间。"

    result = _run_review_validator(legacy_benefit, tmp_path / "legacy-when-to-choose-benefit.json")
    output = _review_validator_output(result)
    assert result.returncode != 0
    assert "option benefit must state the upside" in output


def test_review_data_validator_rejects_legacy_option_fields_in_new_data(tmp_path):
    """New review data should not keep legacy option-copy fields as generation output."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    legacy_fields = _review_validator_sample("flow")
    option = legacy_fields["modules"][0]["diagrams"][0]["nodes"][0]["options"][0]
    option["when_to_choose"] = "适合运营只想尽快发布问卷时使用。"
    option["project_impact"] = "项目影响会在后续再补充。"

    result = _run_review_validator(legacy_fields, tmp_path / "legacy-option-fields.json")
    output = _review_validator_output(result)
    assert result.returncode != 0
    assert "must not include legacy option field when_to_choose" in output
    assert "must not include legacy option field project_impact" in output


def test_review_data_validator_rejects_meta_model_boilerplate_options(tmp_path):
    """Options should not pass just because they mention a future model pass in vague terms."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    meta_copy = _review_validator_sample("flow")
    option = meta_copy["modules"][0]["diagrams"][0]["nodes"][0]["options"][2]
    option["benefit"] = "整体风险会更清楚，后续再确认具体影响。"
    option["cost"] = "后续如果不合适再调整。"
    option["consequence"] = "下一轮模型会把当前内容整体继续处理，相关人员之后再继续确认。"

    result = _run_review_validator(meta_copy, tmp_path / "meta-model-boilerplate-option.json")
    output = _review_validator_output(result)
    assert result.returncode != 0
    assert "boilerplate option copy" in output


def test_review_data_validator_rejects_lazy_repeated_review_options(tmp_path):
    """Repeated generic options across choices are a sign the model skipped real reasoning."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    repeated = _review_validator_sample("flow")
    node = repeated["modules"][0]["diagrams"][0]["nodes"][0]
    for option in node["options"]:
        option["benefit"] = "不改变当前一期范围，只增加后续证据要求。"
        option["cost"] = "需要后续补充验收证据或负责人记录。"
        option["consequence"] = "该节点可按当前方向进入复核记录。"

    result = _run_review_validator(repeated, tmp_path / "repeated-option-copy.json")
    output = _review_validator_output(result)
    assert result.returncode != 0
    assert "duplicate option copy" in output
    assert "boilerplate option copy" in output


def test_review_data_validator_rejects_unclear_needs_decision_options(tmp_path):
    """Needs-decision exits must say what is undecided, who decides, and what gets paused."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    unclear_needs_decision = _review_validator_sample("flow")
    option = unclear_needs_decision["modules"][0]["diagrams"][0]["nodes"][0]["options"][1]
    option["benefit"] = "可以先停下来再看一下，避免继续推进可能会有一些不确定。"
    option["cost"] = "会影响问卷发布流程、开发任务和验收测试，但具体影响要等后续再确认。"
    option["consequence"] = "下一轮模型先等待更多信息，再决定是否继续处理当前内容。"

    result = _run_review_validator(unclear_needs_decision, tmp_path / "unclear-needs-decision.json")
    output = _review_validator_output(result)
    assert result.returncode != 0
    assert "needs-decision option" in output
    assert "who decides" in output
    assert "what is missing" in output


def test_review_data_validator_rejects_unclear_split_flow_options(tmp_path):
    """Split-flow exits must name the actual subflows or review artifacts produced next."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    unclear_split = _review_validator_sample("flow")
    node = unclear_split["modules"][0]["diagrams"][0]["nodes"][0]
    split_option = {
        "id": "OPTION_D",
        "label": "拆分后再处理",
        "benefit": "复杂流程拆开后整体风险会更清楚。",
        "cost": "会影响问卷发布流程、开发任务和验收测试，但整体风险会更清楚。",
        "consequence": "下一轮模型会把当前内容拆分处理，相关人员之后再继续确认。",
        "next_exit": "split-flow",
    }
    node["options"].append(split_option)

    result = _run_review_validator(unclear_split, tmp_path / "unclear-split-flow.json")
    output = _review_validator_output(result)
    assert result.returncode != 0
    assert "split-flow option" in output
    assert "which subflows" in output


def test_review_data_validator_requires_recommended_option_rationale(tmp_path):
    """The recommended exit should explain why it is preferable to stricter or heavier routes."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    weak_recommendation = _review_validator_sample("flow")
    option = weak_recommendation["modules"][0]["diagrams"][0]["nodes"][0]["options"][0]
    option.pop("recommendation_reason")

    result = _run_review_validator(weak_recommendation, tmp_path / "weak-recommended-option.json")
    output = _review_validator_output(result)
    assert result.returncode != 0
    assert "recommended option must explain why it is preferred" in output


def test_review_data_validator_rejects_unexplained_technical_terms_in_options(tmp_path):
    """Reviewer-facing option copy should translate technical terms into business meaning."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    technical = _review_validator_sample("flow")
    option = technical["modules"][0]["diagrams"][0]["nodes"][0]["options"][0]
    option["label"] = "保留 Gateway Profile 风控路径"
    option["benefit"] = "Gateway Profile 和 Risk 设置都保持当前判断，继续进入发布流程。"
    option["cost"] = "业务审核人无法知道这些英文词具体代表什么。"
    option["consequence"] = "后续会按照 Gateway Profile 检查继续拆分开发任务。"
    option["recommendation_reason"] = "Gateway Profile 和 Risk 设置看起来合理。"

    result = _run_review_validator(technical, tmp_path / "unexplained-technical-option.json")
    output = _review_validator_output(result)
    assert result.returncode != 0
    assert "unexplained technical term" in output


def test_review_data_validator_allows_specific_tradeoff_copy_without_false_positive(tmp_path):
    """Specific tradeoff wording should pass even when it contains common impact words."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    specific_chinese = _review_validator_sample("flow")
    option = specific_chinese["modules"][0]["diagrams"][0]["nodes"][0]["options"][0]
    option["benefit"] = "相比直接暂停发布，问卷发布排期影响较小，页面和开发任务可以继续推进。"
    option["cost"] = "需要追加发布前验收测试和运营兜底说明，避免检查项漏掉后没人处理。"
    result = _run_review_validator(specific_chinese, tmp_path / "specific-chinese-impact.json")
    assert result.returncode == 0, _review_validator_output(result)

    english_impact = _review_validator_sample("ui")
    option = english_impact["modules"][0]["screens"][0]["nodes"][0]["options"][0]
    option["benefit"] = "Screen Scope, Implementation Tasks, and Acceptance Tests can continue with lower Release Risk."
    option["cost"] = "The reviewer still needs one release checklist item so operators know what to verify before publishing."
    result = _run_review_validator(english_impact, tmp_path / "english-impact.json")
    assert result.returncode == 0, _review_validator_output(result)


def test_review_data_validator_requires_system_arch_owner_route_and_current_vocabulary(tmp_path):
    """System/architecture confirmations and current decision vocabulary should be machine-checked."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    bad_system_arch = _review_validator_sample("flow")
    node = bad_system_arch["modules"][0]["diagrams"][0]["nodes"][1]
    node["review_layer"] = "system_arch"
    node["review_level"] = "system_arch"
    node["owner"] = "产品经理"
    node["plain_summary"] = "请确认这项支持流程。"
    result = _run_review_validator(bad_system_arch, tmp_path / "bad-system-arch.json")
    assert result.returncode != 0
    assert "system_arch" in _review_validator_output(result)
    assert "无需产品确认" in _review_validator_output(result) or "系统" in _review_validator_output(result)

    legacy_status = _review_validator_sample("flow")
    legacy_status["modules"][0]["diagrams"][0]["nodes"][0]["review_level"] = "APPROVED"
    result = _run_review_validator(legacy_status, tmp_path / "legacy-review-level.json")
    assert result.returncode != 0
    assert "new review data must not use legacy confirmation value APPROVED" in _review_validator_output(result)
    assert "APPROVED" in _review_validator_output(result)


def test_review_data_validator_rejects_embedded_page_code_and_technical_copy(tmp_path):
    """Generated review data must not smuggle renderer code or field-table copy into JSON."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    page_code = _review_validator_sample("flow")
    page_code["modules"][0]["diagrams"][0]["nodes"][0]["html"] = "<button>approve</button>"
    result = _run_review_validator(page_code, tmp_path / "embedded-page-code.json")
    assert result.returncode != 0
    assert "forbidden review-data key html" in _review_validator_output(result)

    schema_note_script = _review_validator_sample("flow")
    schema_note_script["schema_notes"] = ["<script>alert(1)</script>"]
    result = _run_review_validator(schema_note_script, tmp_path / "schema-note-script.json")
    assert result.returncode != 0
    assert "forbidden page code in review-data value" in _review_validator_output(result)

    embedded_page_code_variants = (
        ("mixed-case-div-class", '<DiV class = "layout">审核</DiV>'),
        ("svg-value", '<svg viewBox="0 0 1 1"></svg>'),
        ("js-url", "javascript:saveChoice()"),
        ("data-html-url", "data:text/html,<script>alert(1)</script>"),
        ("inline-style-attribute", '<p style="color:red">保存</p>'),
        ("event-handler", '<button\nOnClick = "save()">保存</button>'),
        ("form-tag", '<form action="/save">保存</form>'),
        ("anchor-tag", '<a href="javascript:save()">保存</a>'),
        ("image-error-handler", '<img src=x onerror="save()">'),
        ("list-tag", "<ul><li>保存</li></ul>"),
        ("table-tag", "<table><tr><td>保存</td></tr></table>"),
    )
    for case_name, injected_value in embedded_page_code_variants:
        variant = _review_validator_sample("flow")
        variant["schema_notes"] = [injected_value]
        result = _run_review_validator(variant, tmp_path / f"{case_name}.json")
        assert result.returncode != 0, case_name
        assert "forbidden page code in review-data value" in _review_validator_output(result)

    trace_note_handler = _review_validator_sample("ui")
    trace_note_handler["modules"][0]["trace_notes"] = ['<button onclick="save()">保存</button>']
    result = _run_review_validator(trace_note_handler, tmp_path / "trace-note-handler.json")
    assert result.returncode != 0
    assert "forbidden page code in review-data value" in _review_validator_output(result)

    unknown_field = _review_validator_sample("flow")
    unknown_field["modules"][0]["diagrams"][0]["renderer_instruction"] = "draw a custom button"
    result = _run_review_validator(unknown_field, tmp_path / "unknown-review-data-field.json")
    assert result.returncode != 0
    assert "unknown review-data key renderer_instruction" in _review_validator_output(result)

    technical_copy = _review_validator_sample("ui")
    technical_copy["modules"][0]["screens"][0]["nodes"][0]["plain_summary"] = "关联业务：问卷发布。为什么存在：判断点。"
    result = _run_review_validator(technical_copy, tmp_path / "technical-copy.json")
    assert result.returncode != 0
    assert "关联业务" in _review_validator_output(result)


def test_review_data_validator_counts_only_business_nodes_for_flow_budget(tmp_path):
    """System/architecture support nodes should not make a business flow fail the split budget."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    mixed_nodes = _review_validator_sample("flow", node_count=10, include_exception=False)
    nodes = mixed_nodes["modules"][0]["diagrams"][0]["nodes"]
    for node in nodes[5:]:
        node["review_layer"] = "system_arch"
        node["review_level"] = "system_arch"
        node["owner"] = "系统负责人"
        node["plain_summary"] = "系统负责人确认支撑规则，无需产品确认。"
    result = _run_review_validator(mixed_nodes, tmp_path / "mixed-business-system-nodes.json")
    assert result.returncode == 0, _review_validator_output(result)


def test_flow_ui_command_templates_do_not_embed_renderer_implementation_state_machine():
    """Routine commands should describe data obligations, leaving page behavior in the renderer README."""
    flow = _command("flow")
    ui = _command("ui")
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")

    forbidden_in_commands = (
        "aria-pressed",
        'role="button"',
        'tabindex="0"',
        "beforeunload",
        "copy-summary",
        "MISSING | DRAFT | SAVED_RECOMMENDED | SAVED_SUBMITTED",
        "localStorage",
        "280-320px",
    )
    for content, label in ((flow, "flow"), (ui, "ui")):
        for token in forbidden_in_commands:
            assert token not in content, (label, token)
        assert "只填结构化 review data" in content or "fill structured review data" in content
        assert "不得为确认页编写 HTML/CSS/JS" in content or "must not write HTML/CSS/JS" in content
        assert "globally unique `node.id` values across the whole review data file" in content

    for token in (
        "aria-pressed",
        'role="button"',
        'tabindex="0"',
        "beforeunload",
        "MISSING | DRAFT | SAVED_RECOMMENDED | SAVED_SUBMITTED",
        "localStorage",
    ):
        assert token in renderer_readme


def test_review_launcher_and_private_lan_mode_are_documented():
    """Interactive reviews use the launcher, with optional explicit private LAN mode."""
    flow = _command("flow")
    ui = _command("ui")
    prd = _command("prd")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")

    assert "node .specify/review/scripts/serve-review.mjs --flow <feature>" in flow
    assert "node .specify/review/scripts/serve-review.mjs --ui <feature>" in ui
    assert "node .specify/review/scripts/serve-review.mjs --outline <feature>" in prd
    assert "RFC1918" in prd and "0.0.0.0" in prd

    for content, label in (
        (flow, "flow command"),
        (ui, "ui command"),
        (skill, "review-data skill"),
        (renderer_readme, "renderer README"),
        (methodology, "methodology"),
    ):
        assert "serve-review.mjs" in content, label
        assert "SPECCOMPASS_REVIEW_URL=" in content, label
        assert "127.0.0.1" in content, label
        assert "RFC1918" in content or "私网" in content, label
        assert "renderer 和 review data 均返回 HTTP 200" in content, label
        assert "禁止使用 `file://`" in content, label
        assert "`localhost`" in content and "不接受" in content, label

    for content, label in (
        (skill, "review-data skill"),
        (renderer_readme, "renderer README"),
        (methodology, "methodology"),
    ):
        assert "当前视图按推荐保存" in content, label
        assert "当前模块按推荐保存" in content, label
        assert "当前需求按推荐保存" in content, label

    for content, label in (
        (renderer_readme, "renderer README"),
        (methodology, "methodology"),
    ):
        assert "specify init --force" in content, label


def test_review_renderer_writes_split_confirmation_packages_with_download_fallback():
    """The renderer should write split packages and retain a bounded download fallback."""
    renderer = _review_renderer_bundle()
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")
    for content, label in ((renderer, "renderer"), (renderer_readme, "renderer README")):
        assert "下载确认包" in content or "download confirmation package" in content or "download fallback" in content, label
        assert "100000" in content or "100K" in content, label
        assert "UTF-8" in content, label
        assert "speccompass-confirmation-package" in content, label
        assert "part_index" in content, label
        assert "part_count" in content, label
        assert "total_record_count" in content, label
        assert "part_record_count" in content, label
        assert "merge_verification" in content, label
        assert "package_session_id" in content, label
        assert "continuation_from" in content, label
        assert "continuation_to" in content, label
        assert "module_context" in content, label
        assert "target_path" in content, label
        assert "draft_excluded_items" in content or "unauthorized_draft" in content, label
        assert "flow-confirmation.md" in content, label
        assert "ui-confirmation.md" in content, label

    assert 'id="download-package"' in renderer
    assert 'id="download-package-links"' in renderer
    assert 'id="bulk-view-recommended"' in renderer
    assert 'id="bulk-module-recommended"' in renderer
    assert 'id="bulk-requirement-recommended"' in renderer
    assert "剩余未选项" in renderer
    assert "缺少推荐选项" in renderer
    assert "renderPackageDownloadLinks" in renderer
    assert "多包降级下载链接" in renderer
    assert "createObjectURL" in renderer
    assert "copy-summary" in renderer
    assert 'id="copy-summary" class="hidden"' in renderer
    assert '$("copy-summary").classList.remove("hidden")' in renderer


def test_review_writeback_is_mechanical_and_commands_regenerate_after_reset_choice():
    """Local writeback records input; owning commands ask before full regeneration."""
    renderer = _review_renderer_bundle()
    launcher = (REVIEW_ROOT / "scripts" / "serve-review.mjs").read_text(encoding="utf-8")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    commands = {
        name: (PROJECT_ROOT / "templates" / "commands" / f"{name}.md").read_text(encoding="utf-8")
        for name in ("prd", "flow", "ui")
    }

    assert 'id="download-package" class="primary">写入项目</button>' in renderer
    assert 'id="copy-summary" class="hidden"' in renderer
    assert 'fetchWithTimeout("/__speccompass/writeback-config"' in renderer
    assert '"X-SpecCompass-Writeback-Token"' in renderer
    assert "重试写入" in renderer
    assert "allowFallback === true" in renderer
    assert 'setAttribute("aria-busy", "true")' in renderer
    assert "AbortController" in renderer
    assert "RETRY_DELAYS_MS = [250, 750]" in renderer
    assert "WRITEBACK_TARGET_CHANGED" in launcher
    assert "expected_target_version" in launcher
    assert "withWriteLock" in launcher
    assert "handle.sync()" in launcher
    assert 'new Set(["EACCES", "EBUSY", "EEXIST", "EPERM"])' in launcher
    assert "outline-discovery-response-pending.json" in launcher
    assert "No model interpretation was performed during writeback." in launcher
    assert "currentUiComponentTargets" in launcher
    assert 'record.record_type === "ui_component_adjustment"' in launcher
    assert "validateUiComponentAdjustmentRecord" in launcher
    assert "currentUiLayoutTargets" in launcher
    assert 'record.record_type === "ui_layout_adjustment"' in launcher
    assert "validateUiLayoutAdjustmentRecord" in launcher
    assert "reviewTargetRefs.size !== expectedTargets.size" in launcher
    assert '"ui_component_adjustment", "ui_layout_adjustment"' in renderer

    for content, label in (
        (skill, "review-data skill"),
        (command_spec, "command spec"),
        (methodology, "methodology"),
    ):
        assert "mechanical" in content or "机械" in content, label
        assert "target_ref" in content, label
        assert "preserve-or-clear" in content or "保留" in content, label
        assert "full" in content or "完整" in content, label

    for name, content in commands.items():
        assert "revision_requests" in content, name
        assert "reset-command-artifacts.mjs inspect" in content, name
        assert "preserve-confirmed" in content, name
        assert "--ack-confirmed" in content, name
        assert "complete" in content or "full" in content, name
        assert "never authorization" in content or "not authorization" in content, name


def test_review_renderer_keeps_recommendation_actions_inside_mobile_viewport():
    """Narrow layouts must contain wide previews without pushing review actions off screen."""
    layout = (REVIEW_ROOT / "renderer" / "styles" / "layout.css").read_text(encoding="utf-8")
    review_ui = (REVIEW_ROOT / "renderer" / "styles" / "review-ui.css").read_text(encoding="utf-8")

    assert "grid-template-columns: minmax(0, 1fr);" in layout
    assert "overflow-x: hidden;" in layout
    assert ".brand,\n  .tools,\n  .shell,\n  .review-workspace" in layout
    assert ".diagram-view {\n    width: 100%;\n    max-width: 100%;" in review_ui
    assert ".rail-actions > button" in review_ui
    assert "flex: 1 1 150px;" in review_ui
    assert "white-space: normal;" in review_ui


def test_review_recommendation_completion_only_updates_missing_nodes():
    """Bulk recommendation completion must preserve drafts and saved human choices."""
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer state tests")

    script = REVIEW_ROOT / "renderer" / "scripts" / "state-store.js"
    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(script))}, "utf8");
const context = {{
  window: {{ SpecCompassDom: {{}} }},
  console,
  STORAGE_PREFIX: "test:",
  reviewData: null,
  localStorage: {{
    setItem: () => {{ throw new Error("storage disabled"); }},
    removeItem: () => undefined
  }},
  $: () => ({{ textContent: "", classList: {{ toggle: () => undefined }} }}),
  state: {{
    missing: {{ status: "MISSING" }},
    critical: {{ status: "MISSING" }},
    draft: {{ status: "DRAFT", draft_option: "OPTION_B", note: "keep draft" }},
    recommended: {{ status: "SAVED_RECOMMENDED", option: "OPTION_B" }},
    submitted: {{ status: "SAVED_SUBMITTED", option: "OPTION_B", note: "keep choice" }}
  }},
  create: () => ({{}}),
  requiresNodeDecision: () => true
}};
vm.createContext(context);
vm.runInContext(source, context);
const nodes = [
  {{ id: "missing", recommended_option: "OPTION_A", options: [{{ id: "OPTION_A" }}] }},
  {{ id: "critical", confirmation_priority: "critical", recommended_option: "OPTION_A", options: [{{ id: "OPTION_A" }}] }},
  {{ id: "draft", recommended_option: "OPTION_A", options: [{{ id: "OPTION_A" }}] }},
  {{ id: "recommended", recommended_option: "OPTION_A", options: [{{ id: "OPTION_A" }}] }},
  {{ id: "submitted", recommended_option: "OPTION_A", options: [{{ id: "OPTION_A" }}] }},
  {{ id: "without-recommendation", options: [{{ id: "OPTION_A" }}] }},
  {{ id: "invalid-recommendation", recommended_option: "OPTION_X", options: [{{ id: "OPTION_A" }}] }}
];
const before = JSON.parse(JSON.stringify(context.state));
const result = context.applyRecommendedToMissing(nodes);
if (result.savedRecommended !== 1) throw new Error(`expected one save, got ${{result.savedRecommended}}`);
if (result.drafts !== 1 || result.saved !== 2 || result.missingRecommendation !== 2 || result.criticalRequiresIndividual !== 1) {{
  throw new Error(`unexpected summary: ${{JSON.stringify(result)}}`);
}}
if (context.state.missing.status !== "SAVED_RECOMMENDED" || context.state.missing.option !== "OPTION_A") {{
  throw new Error("eligible missing node was not saved with its recommendation");
}}
if (JSON.stringify(context.state.critical) !== JSON.stringify(before.critical)) {{
  throw new Error("critical node was bulk-saved instead of requiring individual confirmation");
}}
for (const id of ["draft", "recommended", "submitted"]) {{
  if (JSON.stringify(context.state[id]) !== JSON.stringify(before[id])) {{
    throw new Error(`${{id}} was overwritten`);
  }}
}}
if (context.state["without-recommendation"] !== undefined) {{
  throw new Error("node without recommendation was mutated");
}}
if (context.state["invalid-recommendation"] !== undefined) {{
  throw new Error("node with an invalid recommendation was mutated");
}}
if (context.state.__meta?.copied_fingerprint !== "") throw new Error("summary was not invalidated");
if (context.saveState() !== false) throw new Error("storage failure must be reported to callers");
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


def test_confirmation_package_splitter_keeps_parts_under_100k_and_repeats_context(tmp_path):
    """The renderer package splitter should split large exports without orphaning module decisions."""
    script = REVIEW_ROOT / "renderer" / "scripts" / "confirmation-package.js"
    if shutil.which("node") is None:
        pytest.skip("node is required for renderer package tests")

    node_program = f"""
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync({json.dumps(str(script))}, "utf8");
const context = {{ window: {{}}, console, TextEncoder }};
vm.createContext(context);
vm.runInContext(source, context);
const api = context.window.SpecCompassConfirmationPackage;
const modules = [];
for (let moduleIndex = 0; moduleIndex < 4; moduleIndex += 1) {{
  const records = [];
  for (let recordIndex = 0; recordIndex < 22; recordIndex += 1) {{
    records.push({{
      target_ref: `module-${{moduleIndex}}:flow-${{moduleIndex}}:node-${{recordIndex}}`,
      target_label: `模块 ${{moduleIndex}} / 流程 ${{moduleIndex}} / 节点 ${{recordIndex}}`,
      selected_option: "OPTION_A",
      next_exit: "continue-to-next-step",
      line: `- 模块 ${{moduleIndex}} 节点 ${{recordIndex}} 已按推荐保存；` + "确认内容".repeat(210),
      revision_request: null
    }});
  }}
  modules.push({{
    module_id: `module-${{moduleIndex}}`,
    module_title: `模块 ${{moduleIndex}}`,
    module_summary: `这是模块 ${{moduleIndex}} 的确认结果。`,
    status: "AUTHORIZED",
    records
  }});
}}
const parts = api.splitConfirmationPackage({{
  review_type: "flow",
  batch_id: "FLOW-BATCH-TEST",
  review_data_id: "review-data-test",
  source_review_data: "specs/001-test/flows/review/flow-review-data.json",
  target_path: "specs/001-test/flows/review/flow-confirmation.md",
  groups: {{
    decision_records: Array.from({{ length: 90 }}, (_, index) => `group summary ${{index}} ` + "摘要内容".repeat(160)),
    revision_requests: Array.from({{ length: 20 }}, (_, index) => `revision ${{index}} ` + "修改意见".repeat(120))
  }},
  modules
}}, 100000);
if (parts.length < 2) throw new Error(`expected split parts, got ${{parts.length}}`);
const expectedTotalRecords = modules.reduce((count, module) => count + module.records.length, 0);
let observedPartRecords = 0;
parts.forEach((part, index) => {{
  const bytes = api.utf8Size(JSON.stringify(part, null, 2));
  if (bytes > 100000) throw new Error(`part ${{index + 1}} too large: ${{bytes}}`);
  if (part.format !== "speccompass-confirmation-package") throw new Error("missing package format");
  if (part.part_index !== index + 1) throw new Error("bad part index");
  if (part.part_count !== parts.length) throw new Error("bad part count");
  if (part.total_record_count !== expectedTotalRecords) throw new Error("bad total record count");
  if (part.part_record_count !== part.modules.reduce((count, module) => count + module.records.length, 0)) {{
    throw new Error("bad part record count");
  }}
  observedPartRecords += part.part_record_count;
  if (!part.package_session_id) throw new Error("missing package session id");
  if (part.package_session_id !== parts[0].package_session_id) throw new Error("mixed package session ids");
  if (!String(part.package_instruction?.writeback_rule || "").includes("collect all parts first")) {{
    throw new Error("missing collect-all-parts writeback instruction");
  }}
  if (!String(part.package_instruction?.writeback_rule || "").includes("do not write a single part")) {{
    throw new Error("missing single-part overwrite guard");
  }}
  if (!part.package_instruction?.merge_verification) {{
    throw new Error("missing merge verification instruction");
  }}
  if (!String(part.package_instruction.merge_verification).includes("sum(part_record_count) == total_record_count")) {{
    throw new Error("missing explicit part record count formula");
  }}
  if (!String(part.package_instruction.merge_verification).includes("package_session_id")) {{
    throw new Error("missing package session verification");
  }}
  if (Array.isArray(part.groups?.decision_records)) throw new Error("split package repeated full decision record groups");
  if (part.groups?.decision_records?.count !== 90) throw new Error("split package lost group count");
  if (!part.target_path || part.target_path !== "specs/001-test/flows/review/flow-confirmation.md") {{
    throw new Error("missing target path");
  }}
  if (!part.modules.length) throw new Error("empty package part");
  part.modules.forEach((module) => {{
    if (!module.module_context?.module_id) throw new Error("missing carried module id");
    if (!module.module_context?.module_title) throw new Error("missing carried module title");
    if (!module.records?.length) throw new Error("missing records");
    module.records.forEach((record) => {{
      if (!record.module_id) throw new Error("record missing module_id");
      if (!record.module_title) throw new Error("record missing module_title");
    }});
  }});
}});
if (observedPartRecords !== expectedTotalRecords) throw new Error("merged part record count mismatch");
if (parts[0].continuation_to !== parts[1].continuation_from) {{
  throw new Error("continuation chain does not connect adjacent parts");
}}

for (const unsafeTarget of [
  "package.json",
  "/tmp/flow-confirmation.md",
  "specs/001-test/flows/review/ui-confirmation.md",
  "specs/001-test/flows/review/../flow-confirmation.md"
]) {{
  try {{
    api.splitConfirmationPackage({{
      review_type: "flow",
      batch_id: "unsafe-target-test",
      source_review_data: "specs/001-test/flows/review/flow-review-data.json",
      target_path: unsafeTarget,
      modules: []
    }}, 100000);
    throw new Error(`unsafe target_path was accepted: ${{unsafeTarget}}`);
  }} catch (error) {{
    if (!String(error.message || error).includes("target_path")) throw error;
  }}
}}

const draftParts = api.splitConfirmationPackage({{
  review_type: "flow",
  batch_id: "draft-test",
  source_review_data: "specs/001-test/flows/review/flow-review-data.json",
  target_path: "specs/001-test/flows/review/flow-confirmation.md",
  groups: {{ draft_excluded_items: ["draft node"] }},
  modules: [{{
    module_id: "draft-module",
    module_title: "草稿模块",
    records: [{{
      target_ref: "draft-module:flow:node",
      target_label: "草稿模块 / 流程 / 节点",
      bucket: "draft_excluded_items",
      status: "DRAFT",
      selected_option: "OPTION_C",
      is_authorized_decision: false,
      authorization_state: "EXCLUDED_DRAFT"
    }}]
  }}]
}}, 100000);
if (!draftParts[0].has_unauthorized_drafts) throw new Error("missing draft warning flag");
if (draftParts[0].unauthorized_draft_count !== 1) throw new Error("missing draft warning count");
if (!String(draftParts[0].package_instruction?.draft_rule || "").includes("must not be written")) {{
  throw new Error("missing draft non-authorization instruction");
}}

const oversizeParts = api.splitConfirmationPackage({{
  review_type: "flow",
  batch_id: "oversize-record-test",
  source_review_data: "specs/001-test/flows/review/flow-review-data.json",
  target_path: "specs/001-test/flows/review/flow-confirmation.md",
  modules: [{{
    module_id: "oversize-module",
    module_title: "超大记录模块",
    records: [{{
      target_ref: "oversize-module:flow:node",
      target_label: "超大记录模块 / 流程 / 节点",
      selected_option: "OPTION_B",
      status: "SAVED_SUBMITTED",
      reviewer_note: "请保留这条审核意见，因为它决定下一轮如何修改。".repeat(12000),
      revision_request: {{
        target_ref: "oversize-module:flow:node",
        reviewer_note: "这里是需要模型执行的修改意见。".repeat(12000),
        expected_model_action: "下一轮根据审核意见修订。"
      }}
    }}]
  }}]
}}, 100000);
const oversizeRecord = oversizeParts[0].modules[0].records[0];
if (!oversizeRecord.reviewer_note) throw new Error("oversize compaction dropped reviewer_note");
if (!oversizeRecord.revision_request?.reviewer_note) throw new Error("oversize compaction dropped revision_request reviewer_note");
if (api.utf8Size(JSON.stringify(oversizeParts[0], null, 2)) > 100000) throw new Error("oversize compacted part exceeds limit");
console.log(JSON.stringify({{ partCount: parts.length, sizes: parts.map((part) => api.utf8Size(JSON.stringify(part, null, 2))) }}));
"""
    result = subprocess.run(
        ["node", "-e", node_program],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout


# ============================================================
# Source Capability Coverage Tests (Phase 4 - Level 1 serial compilation fix)
# ============================================================


class TestSourceCapabilityCoverage:
    """Tests for source_capability_coverage validation in outline discovery."""

    _VALIDATOR = "templates/project/.specify/review/scripts/validate-review-data.mjs"
    _FIXTURE_DIR = Path("tests/fixtures/source-capability-coverage")

    def _run(self, fixture_name: str):
        fixture_path = self._FIXTURE_DIR / fixture_name
        return subprocess.run(
            ["node", self._VALIDATOR, str(fixture_path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

    def test_valid_full_coverage_passes(self):
        """6 source capabilities → 6 atoms should pass validation."""
        result = self._run("valid-full-coverage.json")
        assert result.returncode == 0, (
            f"Valid full coverage should pass validation:\n{result.stderr}"
        )

    def test_density_merge_boilerplate_rejected(self):
        """Density-merge boilerplate in visible copy should be rejected."""
        result = self._run("invalid-density-merge.json")
        assert result.returncode != 0, (
            "Density merge boilerplate should cause validation failure"
        )
        combined = ((result.stdout or "") + (result.stderr or "")).lower()
        assert "density" in combined or "boilerplate" in combined, (
            f"Error message should mention density/boilerplate:\n{result.stderr}"
        )

    def test_multi_source_same_atom_rejected(self):
        """Two source capabilities pointing to same atom should be rejected."""
        result = self._run("invalid-multi-ref.json")
        assert result.returncode != 0, (
            "Multiple source capabilities referencing one atom should fail"
        )

    def test_atom_without_coverage_rejected(self):
        """A capability atom with no matching coverage entry should be rejected."""
        result = self._run("invalid-missing-coverage.json")
        assert result.returncode != 0, (
            "Capability atom with no coverage entry should fail validation"
        )

    def test_deprecated_child_count_budget_rejected(self, tmp_path):
        """Historical artifacts must not remain valid after child-count removal."""
        payload = json.loads((self._FIXTURE_DIR / "valid-full-coverage.json").read_text(encoding="utf-8"))
        payload["density_budget"]["max_children_per_node"] = 4
        artifact = tmp_path / "deprecated-density-budget.json"
        artifact.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        result = subprocess.run(
            ["node", self._VALIDATOR, str(artifact)],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        assert result.returncode != 0
        assert "deprecated max_children_per_node" in (result.stdout + result.stderr)
