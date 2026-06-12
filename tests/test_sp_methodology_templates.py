"""Regression tests for SP methodology rules embedded in command templates."""

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
COMMANDS_DIR = PROJECT_ROOT / "templates" / "commands"
FEATURE_MEMORY_DIR = PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature" / "memory"
FEATURE_TEMPLATE_DIR = PROJECT_ROOT / "templates" / "project" / ".specify" / "templates" / "feature"
PROJECT_MEMORY_DIR = PROJECT_ROOT / "templates" / "project" / ".specify" / "memory"
METHODOLOGY_DOC = PROJECT_ROOT / "docs" / "reference" / "sp-project-methodology.md"


def _command(name: str) -> str:
    return (COMMANDS_DIR / f"{name}.md").read_text(encoding="utf-8")


def _paragraph_containing(content: str, needle: str) -> str:
    for paragraph in content.split("\n\n"):
        if needle in paragraph:
            return paragraph
    return ""


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
        assert "/sp-" not in content, command_file.name


def test_memory_templates_keep_open_items_and_trace_responsibilities_separate():
    """Open items carry risk detail while trace remains a lightweight lookup index."""
    open_items = (FEATURE_MEMORY_DIR / "open-items.md").read_text(encoding="utf-8")
    trace_index = (FEATURE_MEMORY_DIR / "trace-index.md").read_text(encoding="utf-8")

    assert "Start empty" in open_items
    assert "Do not add default `OPEN-*` or `RISK-*` blocks" in open_items
    assert "### OPEN-001" in open_items
    assert "Do not add risk or open-item status columns here" in trace_index
    assert "`memory/open-items.md` may point here" in trace_index


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
    assert "Closing, deleting, or downgrading `Blocker`" in constitution
    assert "Closing, deleting, or downgrading `Blocker`" in gate
    assert "closed, deleted, or downgraded" in analyze
    assert "closing, deleting, or downgrading `Blocker`" in implement


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
    assert "shared writeback must be serialized or batched" in constitution
    assert "disjoint write set and shared read-only files" in constitution
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


def test_specify_owns_stable_requirement_conflicts_with_optional_prd_discovery():
    """Optional /sp.prd discovery must not replace /sp.specify as the stable spec entry."""
    methodology = METHODOLOGY_DOC.read_text(encoding="utf-8")
    constitution = (PROJECT_MEMORY_DIR / "constitution.md").read_text(encoding="utf-8")
    prd = _command("prd")
    specify = _command("specify")
    command_spec = (PROJECT_ROOT / "templates" / "project" / "docs" / "reference" / "sp-command-spec.md").read_text(
        encoding="utf-8"
    )

    assert "`/sp.prd` 可以作为可选前置命令" in methodology
    assert "不是强制入口，也不是稳定事实源" in methodology
    assert "自上而下的需求生长" in methodology
    assert "战略目标、产品定位、业务目标、目标用户和能力版图" in methodology
    assert "足够交给 `/sp.specify` 提炼稳定规格" in methodology
    assert "不能默认输出完整界面元素清单" in methodology
    assert "`/sp.constitution` 面向整个项目" in methodology
    assert "候选治理区" in methodology
    assert "不能直接修改正式 constitution 正文" in methodology
    assert "候选状态只使用固定枚举" in methodology
    assert "单 feature 局部风险" in methodology
    assert "`sp.prd` may exist as an optional upstream discovery route" in constitution
    assert "It is not a stable fact source" in constitution
    assert "Constitution Candidates" in constitution
    assert "Candidates do not override formal constitution rules" in constitution
    assert "may only append or update the `Constitution Candidates` section" in constitution
    assert "Candidate strength threshold" in constitution
    assert "Status values are fixed" in constitution
    assert "Keep the active candidate table concise" in constitution
    assert "stable requirement intake and baseline specification point" in specify
    assert "`prd.md` is only an upstream draft" in specify
    assert "Do not stabilize `[src:ai-proposed]`" in specify
    assert "Do not treat `[src:ai-proposed]`" in specify
    assert "without user confirmation" in specify
    assert "# /sp.prd" in prd
    assert "hooks.before_prd" in prd
    assert "sp.constitution" in prd
    assert "optional upstream discovery" in prd
    assert "not a stable fact source" in prd
    assert "top-down requirement growth" in prd
    assert "[src:ai-proposed]" in prd
    assert "SP_STATUS: NEEDS_DECISION" in prd
    assert "SP_EXIT_CODE: 1" in prd
    assert "ready for /sp.specify" in prd
    assert "Constitution Candidates" in prd
    assert "may only append or update" in prd
    assert "Candidate status values are fixed" in prd
    assert "Do not rewrite formal constitution content" in prd
    assert "new independent business goal, role, workflow, acceptance boundary, release scope, or scope fork" in prd
    assert "route to `/sp.specify`" in prd
    assert "route to `/sp.clarify`" in prd
    assert "unresolved product boundary or scope fork questions were not turned into guessed features" in prd
    assert "requirement growth should be top-down" in command_spec
    assert "strategic goal, product positioning, business goals" in command_spec
    assert "capability map" in command_spec
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
    assert "fields to collect, business facts to show, events allowed, permissions, and error states" in flow

    assert "Bind each screen to the flow step" in ui
    assert "Bind each critical UI action to an allowed business event or flow effect" in ui
    assert "must not invent business validation" in ui

    assert "Check Flow-UI relation integrity" in analyze
    assert "Check orphan relation objects" in analyze
    assert "Check draft facts" in analyze

    assert "Verify Flow-UI relation integrity" in gate
    assert "cannot support PASS" in gate
    assert "critical flow port-contract gaps" in gate

    assert "Treat unchecked `/sp.flow` and `/sp.ui` outputs as draft facts" in plan
    assert "Preserve `FLOW` as the main relation axis" in plan

    assert "UI is a projection of flow" in command_spec
    assert "New or refreshed outputs from `sp.flow`, `sp.ui`, and `sp.plan` are draft facts" in memory_arch
    assert "Recommended relation verbs" in trace_index
    assert "UI screen, field, or action cannot trace" in open_items


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
    methodology = (PROJECT_ROOT / "docs" / "reference" / "SP复杂阻塞根因拆解与闭环处理方法论.md").read_text(
        encoding="utf-8"
    )
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
