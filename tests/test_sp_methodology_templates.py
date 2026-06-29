"""Regression tests for SP methodology rules embedded in command templates."""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml


PROJECT_ROOT = Path(__file__).resolve().parent.parent
COMMANDS_DIR = PROJECT_ROOT / "templates" / "commands"
FEATURE_MEMORY_DIR = PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "memory"
FEATURE_TEMPLATE_DIR = PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature"
PROJECT_MEMORY_DIR = PROJECT_ROOT / "templates" / "project" / ".specify" / "memory"
METHODOLOGY_DOC = PROJECT_ROOT / "docs" / "reference" / "sp-project-methodology.md"
REVIEW_ROOT = PROJECT_ROOT / "templates" / "project" / ".specify" / "review"
FLOW_REVIEW_SCHEMA = REVIEW_ROOT / "schemas" / "flow-review-data.schema.json"
UI_REVIEW_SCHEMA = REVIEW_ROOT / "schemas" / "ui-review-data.schema.json"
REVIEW_DATA_VALIDATOR = REVIEW_ROOT / "scripts" / "validate-review-data.mjs"
REVIEW_PAGE_RENDERER = REVIEW_ROOT / "renderer" / "speccompass-review-renderer.html"
RENDERER_README = REVIEW_ROOT / "renderer" / "README.md"
REVIEW_RENDERER_STYLE_FILES = (
    REVIEW_ROOT / "renderer" / "styles" / "tokens.css",
    REVIEW_ROOT / "renderer" / "styles" / "layout.css",
    REVIEW_ROOT / "renderer" / "styles" / "review-ui.css",
)
REVIEW_RENDERER_SCRIPT_FILES = (
    REVIEW_ROOT / "renderer" / "scripts" / "simple-overlays.js",
    REVIEW_ROOT / "renderer" / "scripts" / "state-store.js",
    REVIEW_ROOT / "renderer" / "scripts" / "data-validator.js",
    REVIEW_ROOT / "renderer" / "scripts" / "confirmation-package.js",
    REVIEW_ROOT / "renderer" / "scripts" / "ui-preview-renderer.js",
    REVIEW_ROOT / "renderer" / "scripts" / "review-rail.js",
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
    """Usage docs should explain the single-command resume path and its stop rules."""
    usage_docs = [
        PROJECT_ROOT / "README.md",
        PROJECT_ROOT / "README.zh-CN.md",
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
    assert "check-prerequisites.sh --json" in prd
    assert "check-prerequisites.ps1 -Json" in prd
    assert "agent: sp.specify" in prd
    assert "agent: sp.clarify" in prd
    assert "agent: sp.constitution" in prd
    assert "agent: sp.plan" not in prd


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


def test_prd_is_mandatory_upstream_intake_but_not_stable_spec_entry():
    """Mandatory /sp.prd intake must not replace /sp.specify as the stable spec entry."""
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
    assert "不是稳定事实源" in methodology
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
    assert "stable requirement intake and baseline specification point" in specify
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
    assert "`prd.md` is only an upstream draft" in specify
    assert "Do not stabilize `[src:ai-proposed]`" in specify
    assert "Do not treat `[src:ai-proposed]`" in specify
    assert "without user confirmation" in specify
    assert "# /sp.prd" in prd
    assert "hooks.before_prd" in prd
    assert "sp.constitution" in prd
    assert "mandatory upstream requirement intake" in prd
    assert "not a stable fact source" in prd
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
    assert "SP_STATUS: NEEDS_DECISION" in prd
    assert "SP_EXIT_CODE: 1" in prd
    assert "ready for /sp.specify" in prd
    assert "Constitution Candidates" in prd
    assert "may only append or update" in prd
    assert "Candidate status values are fixed" in prd
    assert "Do not rewrite formal constitution content" in prd
    assert "new independent business goal, role, workflow, acceptance boundary, release scope, or scope fork" in prd
    assert "do not route directly to `/sp.specify`" in prd
    assert "route to `/sp.clarify`" in prd
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
    assert "2-3 options" in flow
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
    assert "2-3 options" in ui
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
    """Analyze/gate and README docs should review implementation deltas before broad source reads."""
    readme_en = (PROJECT_ROOT / "README.md").read_text(encoding="utf-8")
    readme_zh = (PROJECT_ROOT / "README.zh-CN.md").read_text(encoding="utf-8")
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
        (readme_en, "README.md"),
        (readme_zh, "README.zh-CN.md"),
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
    readme_en = (PROJECT_ROOT / "README.md").read_text(encoding="utf-8")
    readme_zh = (PROJECT_ROOT / "README.zh-CN.md").read_text(encoding="utf-8")

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
    assert "For controlled multi-agent work" in readme_en
    assert "one coordinator assigns eligible worksets" in readme_en
    assert "workers submit `Delta Summary` and `Proposed Updates`" in readme_en
    assert "failures fall back to single-agent recovery" in readme_en
    assert "受控多 agent 协作" in readme_zh
    assert "coordinator 分配符合条件的 workset" in readme_zh
    assert "提交 `Delta Summary` 和 `Proposed Updates`" in readme_zh
    assert "失败时兜底到单 agent 恢复路线" in readme_zh


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

    assert "end with an explicit review prompt" in prd
    assert "[src:ai-proposed]" in prd
    assert "[uncertain:*]" in prd
    assert "unconfirmed candidate requirements" in prd
    assert "whether the next safe route is `/sp.clarify`" in prd

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
        assert "DRAFT nodes must be listed only in `draft_excluded_items`" in content or "待提交草稿节点只能进入 `draft_excluded_items`" in content or "仍处于 `DRAFT` 的待提交草稿只能进入 `draft_excluded_items`" in content, label
        assert "ordinary unresolved" in content or "普通 unresolved" in content or "普通未处理决策" in content, label
        assert "下载确认包前" in content or "download confirmation package" in content, label
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
    assert "可执行出口" in skill or "actionable exit" in skill
    assert "5-7" in skill and "8+" in skill and "10+" in skill
    assert "localStorage" in renderer_readme
    assert "授权" in renderer_readme or "authorization" in renderer_readme
    assert "huashu-design" in renderer_readme
    assert "OPTION_B.next_exit" in skill
    assert "needs-decision" in skill
    assert "confirmed_items" in skill and "decision_recorded_items" in skill
    assert "最小完整 JSON" in skill or "Minimal complete JSON" in skill
    assert "window.SPECCOMPASS_REVIEW_DATA" in renderer_readme
    assert "file input" in renderer_readme or "本地 JSON 文件" in renderer_readme
    assert "colocated `flow-review-data.json`" in renderer_readme or "同目录" in renderer_readme
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
    assert "`consequence` (required)" in skill
    assert "`project_impact` (required)" in skill
    assert "`next_exit` (required)" in skill


def test_flow_ui_review_feedback_exports_revision_requests_without_direct_editing():
    """Review pages should collect model-actionable revision requests instead of editing designs directly."""
    flow = _command("flow")
    ui = _command("ui")
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    skill = REVIEW_DATA_SKILL.read_text(encoding="utf-8")
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")
    renderer = _review_renderer_bundle()
    readmes = {
        "README.md": (PROJECT_ROOT / "README.md").read_text(encoding="utf-8"),
        "README.zh-CN.md": (PROJECT_ROOT / "README.zh-CN.md").read_text(encoding="utf-8"),
    }

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

    for label, content in readmes.items():
        assert "revision request" in content or "修改请求" in content, label
        assert "not an editor" in content or "不是编辑器" in content, label
        assert "confirmation document" in content or "确认文档" in content, label

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


def test_flow_ui_review_pages_use_short_url_parameters_as_primary_entry():
    """Flow/UI review should open the web renderer directly and auto-load data from short URL params."""
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
    assert "URL 只能包含 flow 或 ui 其中一个短参数" in data_loader
    assert "validateFeatureId" in data_loader
    assert "includes(\"..\")" in data_loader
    assert "new URL(relativePath, window.location.href)" in data_loader
    assert "../../../specs/${encodeURIComponent(feature)}/flows/review/flow-review-data.json" in data_loader
    assert "../../../specs/${encodeURIComponent(feature)}/ui/review/ui-review-data.json" in data_loader
    assert "window.location.protocol === \"file:\"" in data_loader
    assert "path.sep" not in data_loader
    assert "\\\\" not in data_loader


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
    for schema, label in ((flow_schema, "flow"), (ui_schema, "ui")):
        properties = json.dumps(schema, ensure_ascii=False)
        assert schema["properties"]["schema_version"] == {"type": "integer", "const": 1}, label
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
            "consequence",
            "next_exit",
            "human_judgment",
            "must_confirm",
            "system_arch",
        ):
            assert token in properties, (label, token)
        option_required = schema["$defs"]["option"]["required"]
        assert "consequence" in option_required, label
        assert "options_count_rationale" in schema["$defs"]["node"]["properties"], label

    for token in (
        "allowedReviewLevels",
        "allowedNodeKinds",
        "allowedFlowItemTypes",
        "allowedUiItemTypes",
        "duplicate node id",
        "recommended_option",
        "consequence",
        "must_confirm nodes require 3-4 options",
        "options_count_rationale",
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
    for path in REVIEW_RENDERER_SCRIPT_FILES:
        relative_path = path.relative_to(REVIEW_PAGE_RENDERER.parent).as_posix()
        assert re.search(rf'defer src="{re.escape(relative_path)}(?:\?[^"]*)?"', renderer_entry)
    assert renderer_entry.count("<script") == len(REVIEW_RENDERER_SCRIPT_FILES)
    assert "localStorage" in renderer
    assert "flow-review-data.json" in renderer
    assert "ui-review-data.json" in renderer
    assert "window.SPECCOMPASS_REVIEW_DATA" in renderer
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
    for option_field in ("when_to_choose", "consequence", "project_impact", "next_exit"):
        assert option_field in renderer
    assert "review data 结构存在阻断问题" in renderer
    assert "authorization-steps" in renderer
    assert 'id="prev-module"' in renderer
    assert 'id="next-module"' in renderer
    assert 'id="module-position"' in renderer
    assert "goToModule" in renderer
    assert "上一模块" in renderer and "下一模块" in renderer
    assert "本地选择" in renderer and "复制摘要" in renderer and "写回确认文档" in renderer
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
        assert "must not carry recommendation choices" in content or "不得承载推荐/非推荐选择" in content, label

    assert "style\\s*=" in validator
    assert "data\\s*:\\s*text\\/html" in validator
    assert "img" in validator and "table" in validator

    assert "clipboard call fails" in renderer_readme
    assert "not authorization" in renderer_readme
    assert "must still run `validate-review-data.mjs`" in renderer_readme
    assert "native `<dialog>`" in renderer_readme
    assert "説明" not in renderer_readme
    assert "only for explanation or preview" in renderer_readme or "只用于说明或预览" in renderer_readme
    assert "must not carry recommendation choices" in renderer_readme or "不得承载推荐/非推荐选择" in renderer_readme


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
    assert "screen_layout" in review_item["required"]
    assert "screen_regions" in review_item["required"]
    assert "screen_region" in ui_schema["$defs"]
    assert "ui_component" in ui_schema["$defs"]
    assert "ui_state" in ui_schema["$defs"]
    assert "components" in ui_schema["$defs"]["screen_region"]["required"]
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
    ):
        assert token in renderer

    for content, label in ((skill, "skill"), (methodology, "methodology"), (ui_command, "ui command")):
        assert "UI review data is not flow review data" in content or "UI 审核数据不是 flow 审核数据" in content, label
        assert "screen_regions" in content and "components" in content and "states" in content, label
        assert "screen layout" in content or "屏幕布局" in content, label
        assert "dynamic marker" in content or "动态标注" in content or "纯文本标注" in content, label
        assert "decision options require deeper reasoning" in content or "决策选项需要深度推理" in content, label
        assert "when_to_choose" in content, label
        assert "background" in content, label


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
                "plain_summary": f"请判断第 {index} 个业务环节是否符合当前需求。",
                "review_layer": "business",
                "review_level": "must_confirm" if index == 1 else "verified",
                "owner": "产品经理" if index == 1 else "无需产品确认",
                "node_kind": "human_judgment" if index == 1 else "flow",
                "source_ref": "specs/example/spec.md#business",
                "options": [
                    {
                        "id": "OPTION_A",
                        "label": "按现有规则继续",
                        "when_to_choose": "需求已经覆盖这个业务判断。",
                        "consequence": "继续使用当前业务规则作为后续设计依据。",
                        "project_impact": "后续界面和计划可以按当前路径继续。",
                        "next_exit": "continue",
                        "recommended": True,
                    },
                    {
                        "id": "OPTION_B",
                        "label": "补充业务决策",
                        "when_to_choose": "当前资料还不能判断。",
                        "consequence": "暂停该节点下游设计，先补充业务判断。",
                        "project_impact": "需要先补充决策，相关实现暂不推进。",
                        "next_exit": "needs-decision",
                    },
                    {
                        "id": "OPTION_C",
                        "label": "局部调整后继续",
                        "when_to_choose": "业务目标不变，只需要改小范围规则。",
                        "consequence": "先修正这个节点的规则，再继续后续设计。",
                        "project_impact": "影响范围限制在当前流程或界面的局部内容。",
                        "next_exit": "revise-local-and-continue",
                    },
                ],
                "recommended_option": "OPTION_A",
            }
        )

    edges = [{"from": f"N{index}", "to": f"N{index + 1}"} for index in range(1, node_count)]
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
                "screen_layout": "form",
                "screen_regions": [
                    {
                        "id": "publish-form",
                        "title": "发布信息区",
                        "purpose": "让运营人员检查问卷发布前必须填写的信息。",
                        "position": "main",
                        "components": [
                            {
                                "id": "publish-title",
                                "kind": "input",
                                "label": "问卷标题",
                                "purpose": "填写用户看到的问卷名称。",
                                "source_ref": "specs/example/spec.md#问卷发布",
                            },
                            {
                                "id": "publish-button",
                                "kind": "button",
                                "label": "发布问卷",
                                "purpose": "确认信息无误后进入发布。",
                                "source_ref": "specs/example/spec.md#问卷发布",
                                "action_ref": "DEC1",
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


def test_review_data_validator_rejects_invalid_enums_and_missing_consequence(tmp_path):
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

    empty_impact = _review_validator_sample("flow")
    empty_impact["modules"][0]["diagrams"][0]["nodes"][0]["options"][0]["project_impact"] = "   "
    result = _run_review_validator(empty_impact, tmp_path / "empty-project-impact.json")
    assert result.returncode != 0
    assert "project_impact" in _review_validator_output(result)

    loose_option_b_exit = _review_validator_sample("flow")
    loose_option_b_exit["modules"][0]["diagrams"][0]["nodes"][0]["options"][1]["next_exit"] = "continue-after-needs-decision"
    result = _run_review_validator(loose_option_b_exit, tmp_path / "loose-option-b-exit.json")
    assert result.returncode != 0
    assert "OPTION_B.next_exit must start with needs-decision" in _review_validator_output(result)


def test_review_data_validator_enforces_review_option_quality_rules(tmp_path):
    """Human choices should be actionable and sized by review risk, not generic approve/defer states."""
    if shutil.which("node") is None:
        pytest.skip("node is required for review data validator tests")

    too_few_must_confirm = _review_validator_sample("flow")
    node = too_few_must_confirm["modules"][0]["diagrams"][0]["nodes"][0]
    node["options"] = node["options"][:2]
    result = _run_review_validator(too_few_must_confirm, tmp_path / "too-few-must-confirm.json")
    assert result.returncode != 0
    assert "must_confirm nodes require 3-4 options" in _review_validator_output(result)

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

    forbidden_exit = _review_validator_sample("ui")
    forbidden_exit["modules"][0]["screens"][0]["nodes"][0]["options"][0]["next_exit"] = "通过"
    result = _run_review_validator(forbidden_exit, tmp_path / "forbidden-empty-action-exit.json")
    assert result.returncode != 0
    assert "actionable exit" in _review_validator_output(result)


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


def test_review_renderer_downloads_split_confirmation_packages():
    """The fixed renderer should export confirmation packages instead of unlimited clipboard text."""
    renderer = _review_renderer_bundle()
    renderer_readme = RENDERER_README.read_text(encoding="utf-8")
    for content, label in ((renderer, "renderer"), (renderer_readme, "renderer README")):
        assert "下载确认包" in content or "download confirmation package" in content, label
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
    assert "renderPackageDownloadLinks" in renderer
    assert "多包下载链接" in renderer
    assert "createObjectURL" in renderer
    assert "copy-summary" in renderer


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
