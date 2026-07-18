#!/usr/bin/env node
import fs from "node:fs";

const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error("Usage: node .specify/review/scripts/validate-review-data.mjs <review-data.json>");
  process.exit(2);
}

const reviewDataPath = args[0];
const errors = [];
const warnings = [];
const allowedReviewTypes = new Set(["flow", "ui", "outline"]);
const allowedConfirmStrategies = new Set(["batch", "hybrid", "rolling"]);
const allowedFlowItemTypes = new Set(["flowchart", "sequence", "state", "table", "index"]);
const allowedUiItemTypes = new Set(["screen", "screen_map", "prototype", "form", "state", "index"]);
const allowedUiLayouts = new Set([
  "dashboard",
  "form",
  "list_detail",
  "wizard",
  "detail",
  "settings",
  "screen_map",
  "modal",
  "custom"
]);
const allowedUiRegionPositions = new Set(["top", "left", "main", "right", "bottom", "modal", "drawer", "inline"]);
const allowedUiComponentKinds = new Set([
  "button",
  "input",
  "select",
  "textarea",
  "checkbox",
  "radio",
  "table",
  "card",
  "nav",
  "tab",
  "filter",
  "search",
  "badge",
  "chart-note",
  "modal-note",
  "dynamic-marker",
  "text",
  "empty-state",
  "error-note"
]);
const allowedUiStateTypes = new Set(["default", "empty", "loading", "error", "success", "permission", "dynamic_marker"]);
const allowedOutlineViewTypes = new Set(["intent_map", "scope_slice", "readiness_authority"]);
const allowedSourceAuthorityStatuses = new Set(["authoritative", "candidate", "archived", "missing"]);
const allowedModuleReviewLayers = new Set(["business", "system_arch", "mixed"]);
const allowedNodeReviewLayers = new Set(["business", "system_arch"]);
const allowedReviewLevels = new Set([
  "must_confirm",
  "recommended",
  "uncertain",
  "key_step",
  "verified",
  "system_arch"
]);
const allowedConfirmationPriorities = new Set(["critical", "important", "normal"]);
const allowedNodeKinds = new Set([
  "human_judgment",
  "flow",
  "decision",
  "error",
  "state",
  "ui",
  "system",
  "external",
  "role",
  "sequence"
]);
const allowedOptionIds = new Set(["OPTION_A", "OPTION_B", "OPTION_C", "OPTION_D"]);
const allowedDiscoveryOperations = new Set(["confirm_candidate", "add", "replace", "exclude", "context_note"]);
const outlineDiscoveryDensityBudget = Object.freeze({
  max_visible_nodes_per_map: 18,
  max_depth: 3,
  max_children_per_node: 4,
  layer_balance_min_nodes: 8,
  max_layer_share: 0.6,
});
const allowedOutlineMapKinds = new Set(["overview", "branch", "global_constraints"]);
const allowedOutlineNodeKinds = new Set([
  "root", "goal", "role", "domain", "scope", "problem", "scenario",
  "capability", "acceptance", "risk", "constraint", "map_link",
]);
const allowedOutlineSourceStatuses = new Set(["user", "user-confirmed", "doc", "ai-proposed", "unresolved"]);
const legacyConfirmationValues = new Set(["APPROVED", "REJECTED"]);
const supportedSchemaVersions = new Set([1, 2]);
const forbiddenReviewDataKeys = new Set([
  "html",
  "css",
  "script",
  "javascript",
  "style",
  "rendered_html",
  "inner_html",
  "outer_html",
  "onclick",
  "onload",
  "class",
  "classname",
  "classes",
  "svg"
]);
const forbiddenReviewDataValuePatterns = [
  /<\s*script\b/i,
  /<\s*style\b/i,
  /<\s*\/\s*script\s*>/i,
  /<\s*\/\s*style\s*>/i,
  /\bon[a-z]+\s*=/i,
  /\bjavascript\s*:/i,
  /\bdata\s*:\s*text\/html/i,
  /<\s*(a|button|canvas|details|dialog|div|form|iframe|img|input|label|li|link|main|meta|nav|ol|option|p|script|section|select|span|style|svg|table|tbody|td|textarea|th|thead|tr|ul)\b/i,
  /\bclass\s*=/i,
  /\bstyle\s*=/i
];
const allowedTopLevelKeys = new Set([
  "schema_version",
  "review_type",
  "artifact_path",
  "outline_source_path",
  "outline_digest",
  "source_authority_ids",
  "confirm_strategy",
  "batch_id",
  "project",
  "source_snapshot",
  "modules",
  "schema_notes"
]);
const allowedProjectKeys = new Set(["name", "feature", "business_overview", "review_goal"]);
const allowedSourceSnapshotKeys = new Set(["path", "anchors", "semantic_scope"]);
const allowedModuleKeys = new Set([
  "id",
  "title",
  "summary",
  "review_layer",
  "must_confirm_total",
  "diagrams",
  "screens",
  "views",
  "trace_notes"
]);
const allowedReviewItemKeys = new Set([
  "id",
  "title",
  "summary",
  "source_path",
  "item_type",
  "business_context",
  "primary_users",
  "entry_scenarios",
  "user_goal",
  "user_outcome",
  "flow_refs",
  "screen_layout",
  "screen_regions",
  "states",
  "framework_approximation",
  "framework_notes",
  "complex_flow_exception",
  "low_risk_linear_exception",
  "nodes",
  "edges",
  "trace_notes"
]);
const uiOnlyReviewItemKeys = new Set([
  "business_context",
  "primary_users",
  "entry_scenarios",
  "user_goal",
  "user_outcome",
  "flow_refs",
  "screen_layout",
  "screen_regions",
  "states",
  "framework_approximation",
  "framework_notes"
]);
const allowedOutlineViewKeys = new Set([
  "id",
  "title",
  "summary",
  "source_path",
  "view_type",
  "intent",
  "users",
  "problem_slices",
  "capability_slices",
  "in_scope",
  "non_goals",
  "scenario_coverage",
  "recommended_first_slice",
  "source_authorities",
  "risks",
  "open_items",
  "blockers",
  "next_route",
  "nodes",
  "trace_notes"
]);
const allowedScenarioCoverageKeys = new Set(["scenario", "acceptance_seeds"]);
const allowedSourceAuthorityKeys = new Set(["id", "path", "status", "scope"]);
const forbiddenOutlineDownstreamKeys = new Set([
  "api",
  "apis",
  "api_endpoint",
  "api_endpoints",
  "component",
  "components",
  "database",
  "database_model",
  "database_models",
  "endpoint",
  "endpoints",
  "flow_step",
  "flow_steps",
  "implementation",
  "implementation_task",
  "implementation_tasks",
  "screen",
  "screens",
  "screen_layout",
  "screen_regions",
  "sql",
  "task",
  "tasks"
]);
const forbiddenOutlineDownstreamValuePatterns = [
  /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/[^\s]+/i,
  /\b(?:CREATE|ALTER)\s+TABLE\b/i,
  /\b(?:React|Vue|Svelte|Angular)\s+(?:component|组件)\b/i,
  /(?:实现任务|implementation task)\s*[:：]/i
];
const allowedScreenRegionKeys = new Set([
  "id",
  "title",
  "purpose",
  "position",
  "source_ref",
  "components",
  "notes"
]);
const allowedUiComponentKeys = new Set([
  "id",
  "kind",
  "label",
  "purpose",
  "source_ref",
  "action_ref",
  "field_ref",
  "state_ref",
  "decision_node_id",
  "future_behavior_note"
]);
const allowedUiStateKeys = new Set([
  "id",
  "label",
  "state_type",
  "plain_note",
  "source_ref",
  "future_behavior_note"
]);
const allowedNodeKeys = new Set([
  "id",
  "label",
  "plain_summary",
  "decision_background",
  "decision_summary",
  "action_prompt",
  "review_layer",
  "review_level",
  "confirmation_priority",
  "priority_reason",
  "critical_basis",
  "owner",
  "node_kind",
  "source_ref",
  "options",
  "options_count_rationale",
  "recommended_option"
]);
const allowedOptionKeys = new Set([
  "id",
  "label",
  "benefit",
  "cost",
  "recommendation_reason",
  "when_to_choose",
  "consequence",
  "project_impact",
  "next_exit",
  "recommended"
]);
const allowedEdgeKeys = new Set(["from", "to", "label"]);

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function textOf(value) {
  return JSON.stringify(value ?? "", null, 2);
}

function hasText(value, needle) {
  return typeof value === "string" && value.includes(needle);
}

function validateEnum(scope, key, value, allowedValues) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (!allowedValues.has(value)) {
    fail(`${scope}: ${key} must be one of ${Array.from(allowedValues).join(", ")}`);
  }
}

function isHumanJudgment(node) {
  return node.node_kind === "human_judgment" || node.review_level === "must_confirm";
}

function hasDecisionOptions(node) {
  return Boolean(isHumanJudgment(node) || node.options || node.recommended_option);
}

function criticalPriorityCap(actionableCount) {
  return actionableCount === 0 ? 0 : Math.min(3, Math.max(1, Math.ceil(actionableCount / 10)));
}

function hasSubstantialText(value) {
  return typeof value === "string" && value.replace(/\s+/g, "").length >= 18;
}

function isSafeRepositoryRelativePath(value) {
  const normalized = String(value || "").trim().replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized) || normalized.includes("//")) {
    return false;
  }
  return normalized.split("/").every((segment) => segment && segment !== "." && segment !== "..");
}

const vagueFlowEdgeLabels = new Set([
  "下一步",
  "继续",
  "处理",
  "完成",
  "通过",
  "失败",
  "默认",
  "正常",
  "异常",
  "next",
  "continue",
  "process",
  "done",
  "success",
  "failure",
  "default"
]);
const vagueFlowEdgeLabelPatterns = [
  /^(继续|进入|执行|开始|转到|前往)?(下一步|后续|后续流程|流程|处理|完成)[。.!！]?$/i,
  /^(通过|失败|默认|正常|异常)(流程|路径|处理|分支)?[。.!！]?$/i,
  /^(next|continue|process|done|success|failure|default)(\s+(step|flow|path|process|branch))?$/i,
  /^进入第\s*\d+\s*个(业务)?环节[。.!！]?$/i,
  /^(执行|处理)(相关|后续|当前)?(操作|结果|工作|业务)[。.!！]?$/i
];

const vagueFlowSummaryPatterns = [
  /^(这一步|该步骤|本步骤)?(用于|负责|就是)?(处理|执行|完成|进入|继续)(相关|业务)?(数据|流程|操作|步骤|状态)?[。.!！]?$/i,
  /^(系统|流程|页面|该节点|本节点)?(继续|进入|完成)(下一步|后续流程|相关处理|流程)[。.!！]?$/i,
  /^(这一步|该步骤|本步骤|该节点|本节点)?(主要)?(用于|负责|进行|处理|执行|完成|推进)(相关|当前|后续)?(业务|数据|逻辑|工作|流程|操作)(处理|工作|流程)?[。.!！]?$/i,
  /^(系统|流程|该节点|本节点)?(会|将|负责)?(推进|执行|处理)(后续|相关|当前)?(业务|工作|流程|操作|处理)?[。.!！]?$/i,
  /^(该节点|本节点|这一步|该步骤)?(主要)?负责处理相关业务(并)?推进(后续|下一步)(业务|流程)?[。.!！]?$/i
];

const vagueFlowContextPatterns = [
  /^(本|该|此)?(项目|模块|流程|图)(主要)?(用于|用来)?(展示|说明|描述|呈现)(相关|业务)?(流程|路径|信息|内容)[。.!！]?$/i,
  /^(帮助|方便)(用户|相关人员)?(了解|查看|处理)(相关|业务)?(流程|信息|内容|工作)[。.!！]?$/i,
  /^(本|该|此)?(模块|流程|图)(主要)?(负责|处理|完成)(相关|业务)?(工作|流程|处理)[。.!！]?$/i,
  /^(当前模块|当前流程|当前图)(\s*\+\s*业务对象|：?说明当前业务(如何|怎样)被处理)[。.!！]?$/i
];

function isDecisionFlowNode(node) {
  return node.node_kind === "decision" || node.node_kind === "human_judgment" || node.review_level === "must_confirm";
}

function isVagueFlowEdgeLabel(value) {
  const label = compactText(value).toLowerCase();
  return vagueFlowEdgeLabels.has(label) || vagueFlowEdgeLabelPatterns.some((pattern) => pattern.test(label));
}

function validateFlowNodeSemantics(nodeLabel, node) {
  const label = compactText(node.label);
  const summary = compactText(node.plain_summary);
  if (label && summary && label === summary) {
    fail(`${nodeLabel}: plain_summary must explain the business context and outcome, not repeat the node label`);
  }
  if (summary.length < 18 || vagueFlowSummaryPatterns.some((pattern) => pattern.test(summary))) {
    fail(`${nodeLabel}: plain_summary is too generic; state the trigger, responsible role, business action, state/result change, and next responsibility`);
  }
}

function validateFlowContextCopy(scope, value, label) {
  const text = compactText(value);
  if (!hasSubstantialText(text)) {
    fail(`${scope}: ${label} must contain a substantive business context (at least 18 non-space characters)`);
  } else if (vagueFlowContextPatterns.some((pattern) => pattern.test(text))) {
    fail(`${scope}: ${label} is generic flow context; state who handles what business situation, the flow boundary, and the business result`);
  }
}

function validateFlowEdgeSemantics(itemLabel, nodes, edges) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  let unlabeledEdges = 0;
  edges.forEach((edge, edgeIndex) => {
    const edgeLabel = `${itemLabel}:edge-${edgeIndex + 1}`;
    const sourceNode = nodesById.get(edge.from);
    const label = compactText(edge.label);
    if (!label) {
      unlabeledEdges += 1;
      if (sourceNode && isDecisionFlowNode(sourceNode)) {
        fail(`${edgeLabel}: outgoing edges from decision or human_judgment nodes require a business condition or result label`);
      }
      return;
    }
    if (sourceNode && isDecisionFlowNode(sourceNode) && isVagueFlowEdgeLabel(label)) {
      fail(`${edgeLabel}: decision exit label is too generic; name the business condition, result, or recovery reason`);
    }
  });
  if (unlabeledEdges && !edges.some((edge) => compactText(edge.label))) {
    warn(`${itemLabel}: flow edges have no business labels; add conditions or results so reviewers can follow why work moves between nodes`);
  }
}

const vagueActionExits = new Set([
  "通过",
  "暂缓",
  "退回",
  "阻塞",
  "拒绝",
  "待定",
  "approve",
  "approved",
  "pass",
  "hold",
  "defer",
  "reject",
  "return",
  "block",
  "blocked",
  "pending",
  "rejected"
]);
const genericOptionLabels = new Set([
  "方案a",
  "方案b",
  "方案c",
  "方案d",
  "选项a",
  "选项b",
  "选项c",
  "选项d",
  "推荐方案",
  "默认方案",
  "当前方案",
  "保留当前",
  "按推荐",
  "按推荐继续",
  "补充内容",
  "补充信息",
  "补充业务决策",
  "确认通过",
  "暂缓处理",
  "退回修改",
  "阻塞处理"
]);
const boilerplateOptionCopyFragments = [
  "推荐这个选项，因为",
  "下一轮模型会",
  "下一轮模型先",
  "下一轮模型只",
  "相关人员之后再继续确认",
  "后续再确认",
  "当前依据和风险边界看起来正确",
  "可按推荐保留",
  "当前节点需要补充业务决策",
  "责任人或风险口径",
  "后续完善相关内容",
  "后续如果不合适再调整",
  "当前资料还不能判断",
  "需求已经覆盖这个业务判断",
  "后续界面和计划可以按当前路径继续",
  "影响范围限制在当前流程或界面的局部内容",
  "当前内容拆分处理",
  "当前内容整体继续处理",
  "按当前规则推进",
  "待后续补充相关内容",
  "后续再完善相关内容",
  "整体风险会更清楚",
  "业务方向同意，但希望后续补充验收证据或负责人记录",
  "该节点可按当前方向进入复核记录",
  "不改变当前一期范围，只增加后续证据要求"
];
const concreteImpactSignals = [
  "开发",
  "实现",
  "排期",
  "风险",
  "测试",
  "验收",
  "UI",
  "界面",
  "流程",
  "权限",
  "数据",
  "状态",
  "用户",
  "运营",
  "页面",
  "接口",
  "统计",
  "报表",
  "发布",
  "回收",
  "租户",
  "文档",
  "问卷",
  "成本",
  "范围",
  "计划",
  "下游",
  "阻断",
  "延后",
  "解锁",
  "scope",
  "schedule",
  "risk",
  "ui",
  "screen",
  "flow",
  "plan",
  "task",
  "tasks",
  "implementation",
  "test",
  "tests",
  "acceptance",
  "delivery",
  "release"
];
const continuationOwnerSignals = [
  "下一轮模型",
  "模型",
  "大模型",
  "产品经理",
  "产品负责人",
  "运营",
  "设计师",
  "设计团队",
  "开发人员",
  "开发团队",
  "工程师",
  "测试人员",
  "测试团队",
  "系统负责人",
  "架构负责人",
  "审核人",
  "业务团队",
  "项目团队",
  "PM",
  "product owner",
  "product manager",
  "designer",
  "developer",
  "engineer",
  "tester",
  "qa",
  "model",
  "next model",
  "reviewer",
  "owner",
  "team"
];
const decisionUrgencySignals = [
  "这个决定",
  "这个判断",
  "这个选择",
  "这一步",
  "本轮",
  "现在",
  "当前",
  "先定",
  "先确认",
  "先拍板",
  "拍板",
  "否则",
  "如果不",
  "不先",
  "必须确认",
  "必须明确",
  "需要确认",
  "需要明确",
  "this decision",
  "this choice",
  "decide now",
  "must decide",
  "must confirm",
  "otherwise",
  "if not"
];
const genericOptionLabelOpeners = [
  "保留",
  "补充",
  "调整",
  "确认",
  "继续",
  "完善",
  "按推荐",
  "局部调整"
];
const reviewerFacingTechnicalTerms = [
  "Gateway Profile",
  "Trusted View",
  "Risk",
  "Gateway",
  "Mock",
  "backend",
  "Raw",
  "Canonical",
  "Golden",
  "QMT",
  "OMS",
  "paper",
  "shadow"
];
const missingDecisionSignals = [
  "还没有定",
  "没有定",
  "未定",
  "没定",
  "还没说清",
  "没说清",
  "不清楚",
  "无法判断",
  "不能判断",
  "缺少",
  "缺失",
  "补充",
  "需要明确",
  "需要确认",
  "先确认",
  "先补",
  "到底",
  "unknown",
  "missing",
  "undecided",
  "unclear"
];
const needsDecisionPauseSignals = [
  "暂停",
  "先不",
  "等待",
  "延后",
  "暂缓进入",
  "不能继续",
  "不授权",
  "先停止",
  "pause",
  "wait",
  "defer",
  "hold"
];
const recommendationRationaleSignals = [
  "推荐",
  "更稳",
  "更合适",
  "更适合",
  "更少",
  "更低",
  "更快",
  "更清楚",
  "更容易",
  "最稳",
  "最少",
  "最低",
  "最小",
  "最清楚",
  "优先",
  "相比",
  "比",
  "避免",
  "减少",
  "降低",
  "因为",
  "代价",
  "权衡",
  "tradeoff",
  "preferred",
  "recommend",
  "because",
  "lower",
  "less",
  "faster",
  "safer",
  "clearer",
  "rather than"
];
const splitArtifactSignals = [
  "两个",
  "三个",
  "四个",
  "两条",
  "三条",
  "子流程",
  "短流程",
  "独立流程",
  "流程文件",
  "分别",
  "主流程",
  "异常流程",
  "内容检查",
  "投放检查",
  "失败处理",
  "再次发布",
  "提示内容",
  "返回编辑",
  "subflow",
  "subflows",
  "flow file",
  "separate"
];

function normalizedActionText(value) {
  return String(value || "").trim().toLowerCase();
}

function isVagueActionExit(value) {
  return vagueActionExits.has(normalizedActionText(value));
}

function hasQualifiedException(item) {
  return Boolean(item.complex_flow_exception || item.low_risk_linear_exception);
}

function compactText(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function hasConcreteImpactSignal(value) {
  const text = String(value || "").toLowerCase();
  return concreteImpactSignals.some((signal) => text.includes(signal));
}

function optionBenefitText(option) {
  return option.benefit || "";
}

function optionCostText(option) {
  return option.cost || "";
}

function isLegacyApplicabilityBenefit(value) {
  const text = String(value || "").trim();
  const compact = compactText(text);
  return (
    compact.startsWith("适合") ||
    compact.startsWith("适用于") ||
    compact.startsWith("适用在") ||
    compact.startsWith("用于判断什么情况") ||
    /^when\s+to\s+choose\b/i.test(text) ||
    /^choose\s+this\s+when\b/i.test(text)
  );
}

function optionExecutionText(option) {
  return [
    option.consequence,
    option.recommendation_reason,
    option.next_exit
  ].join(" ");
}

function isConcreteDecisionField(value) {
  return hasSubstantialText(value) && !containsBoilerplateOptionCopy(value) && hasConcreteImpactSignal(value);
}

function hasContinuationOwnerSignal(value) {
  const text = String(value || "").toLowerCase();
  return continuationOwnerSignals.some((signal) => text.includes(signal.toLowerCase()));
}

function hasDecisionUrgencySignal(value) {
  const text = String(value || "").toLowerCase();
  return (
    decisionUrgencySignals.some((signal) => text.includes(signal.toLowerCase())) &&
    hasConcreteImpactSignal(text)
  );
}

function containsBoilerplateOptionCopy(value) {
  const text = String(value || "");
  return boilerplateOptionCopyFragments.some((fragment) => text.includes(fragment));
}

function optionText(option) {
  return [
    option.label,
    option.benefit,
    option.cost,
    option.when_to_choose,
    option.consequence,
    option.recommendation_reason,
    option.project_impact,
    option.next_exit
  ].join(" ");
}

function optionExitStartsWith(option, prefix) {
  return String(option.next_exit || "").trim().toLowerCase().startsWith(prefix);
}

function hasAnySignal(value, signals) {
  const text = String(value || "").toLowerCase();
  return signals.some((signal) => text.includes(signal.toLowerCase()));
}

function hasNeedsDecisionTrigger(option) {
  return hasAnySignal(`${option.benefit || ""} ${option.cost || ""} ${option.consequence || ""} ${option.recommendation_reason || ""}`, missingDecisionSignals);
}

function hasNeedsDecisionPause(option) {
  return hasAnySignal(`${option.cost || ""} ${option.consequence || ""} ${option.next_exit || ""}`, needsDecisionPauseSignals);
}

function hasRecommendationRationale(option) {
  return (
    hasSubstantialText(option.recommendation_reason) &&
    !containsBoilerplateOptionCopy(option.recommendation_reason) &&
    hasAnySignal(`${option.recommendation_reason || ""} ${option.benefit || ""} ${option.cost || ""} ${option.consequence || ""}`, recommendationRationaleSignals)
  );
}

function hasSpecificSplitArtifact(option) {
  const text = optionText(option);
  const hasSplitAction = /拆(成|出|分|开)|split/i.test(text);
  const hasArtifact = hasAnySignal(text, splitArtifactSignals) || /[2-9]\s*(个|条|份|part|flow)/i.test(text);
  return hasSplitAction && hasArtifact;
}

function normalizedLooseCopy(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/(会|将|可以|能够|整体|当前|相关|后续|继续|保持|不改变|可控|较小|较低|影响|安排|内容|工作|范围|风险|the|a|an|and|or|to|of|for|with|can|will|should)/g, "")
    .replace(/[\s，。；;,.、:："'“”‘’（）()[\]{}<>《》_\-\/]+/g, "")
    .trim();
}

function ngrams(value, size = 2) {
  const text = normalizedLooseCopy(value);
  const result = new Set();
  for (let index = 0; index <= text.length - size; index += 1) {
    result.add(text.slice(index, index + size));
  }
  return result;
}

function textContainmentSimilarity(left, right) {
  const leftGrams = ngrams(left);
  const rightGrams = ngrams(right);
  if (leftGrams.size < 6 || rightGrams.size < 6) {
    return 0;
  }
  let overlap = 0;
  for (const gram of leftGrams) {
    if (rightGrams.has(gram)) overlap += 1;
  }
  return overlap / Math.min(leftGrams.size, rightGrams.size);
}

function labelGenericOpener(value) {
  const label = compactText(value);
  return genericOptionLabelOpeners.find((opener) => label.startsWith(opener));
}

function normalizeOptionCopy(option) {
  return ["benefit", "cost", "consequence", "recommendation_reason", "when_to_choose", "project_impact"]
    .map((key) => String(option[key] || "").toLowerCase().replace(/[\s，。；;,.、:："'“”‘’（）()[\]{}<>《》_-]+/g, ""))
    .join("|");
}

function hasChineseExplanation(value) {
  const text = String(value || "");
  return /[\u4e00-\u9fff]/.test(text) && /（[^）]*[\u4e00-\u9fff][^）]*\）|\([^)]*[\u4e00-\u9fff][^)]*\)|表示|指|意思是|中文|也就是|用于|代表/.test(text);
}

function unexplainedTechnicalTerms(value) {
  const text = String(value || "");
  if (!text) return [];
  return reviewerFacingTechnicalTerms.filter((term) => {
    const pattern = new RegExp(`(^|[^A-Za-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`, "i");
    if (!pattern.test(text)) return false;
    if (term.toLowerCase() === "risk" && !/[\u4e00-\u9fff]/.test(text) && !/\b(gateway|profile|setting|config|rule)\b/i.test(text)) {
      return false;
    }
    return !hasChineseExplanation(text);
  });
}

function validateOptionHumanCopy(scope, option) {
  const label = compactText(option.label);
  if (genericOptionLabels.has(label.toLowerCase()) || /^方案[a-d]$/i.test(label) || /^选项[a-d]$/i.test(label)) {
    fail(`${scope}: option ${option.id} label is too generic; name the real business action`);
  }

  for (const legacyKey of ["when_to_choose", "project_impact"]) {
    if (Object.prototype.hasOwnProperty.call(option, legacyKey)) {
      fail(`${scope}: option ${option.id} must not include legacy option field ${legacyKey}; write selection guidance in decision_background/decision_summary and use benefit/cost/recommendation_reason for visible copy`);
    }
  }

  for (const key of ["label", "benefit", "cost", "consequence", "recommendation_reason", "when_to_choose", "project_impact"]) {
    if (containsBoilerplateOptionCopy(option[key])) {
      fail(`${scope}: option ${option.id} contains boilerplate option copy in ${key}; explain the node background, decision summary, benefit, cost, action, and impact`);
    }
    const terms = unexplainedTechnicalTerms(option[key]);
    if (terms.length) {
      fail(`${scope}: option ${option.id} contains unexplained technical term in ${key}: ${terms.join(", ")}; add a Chinese explanation or replace it with business language`);
    }
  }

  if (!isConcreteDecisionField(optionBenefitText(option))) {
    fail(`${scope}: option ${option.id} option benefit must name a concrete upside`);
  }
  if (isLegacyApplicabilityBenefit(optionBenefitText(option))) {
    fail(`${scope}: option ${option.id} option benefit must state the upside, not when to choose this option`);
  }
  if (!isConcreteDecisionField(optionCostText(option))) {
    fail(`${scope}: option ${option.id} option cost must name a concrete tradeoff`);
  }
  if (!hasSubstantialText(option.consequence)) {
    fail(`${scope}: option ${option.id} consequence must describe the concrete action after selection`);
  }
  if (!hasContinuationOwnerSignal(optionExecutionText(option))) {
    fail(`${scope}: option ${option.id} must say who continues the work`);
  }
  if (optionExitStartsWith(option, "needs-decision")) {
    if (!hasNeedsDecisionTrigger(option) || !hasContinuationOwnerSignal(optionExecutionText(option)) || !hasNeedsDecisionPause(option)) {
      fail(`${scope}: option ${option.id} needs-decision option must say what is missing, who decides, and what downstream work pauses before confirmation`);
    }
  }
  if (optionExitStartsWith(option, "split-flow") && !hasSpecificSplitArtifact(option)) {
    fail(`${scope}: option ${option.id} split-flow option must say which subflows, short flows, or review artifacts will be produced next`);
  }
}

function validateReadableCopy(scope, value) {
  const text = textOf(value);
  const bannedFragments = [
    "对象类型",
    "判断点",
    "来源",
    "主流程图",
    "节点说明",
    "审核人要看什么",
    "关联业务",
    "为什么存在",
    "需要判断什么",
    "不需要确认",
    "不需要管什么",
    "节点做什么",
    "通过标准",
    "可以通过的标准",
    "风险提示",
    "常见风险",
    "Top Level Baseline",
    "主业务路径、关键判断、异常分支和完成条件"
  ];

  for (const fragment of bannedFragments) {
    if (text.includes(fragment)) {
      fail(`${scope}: copy contains technical/table residue "${fragment}"`);
    }
  }
}

function validateNoForbiddenReviewDataKeys(scope, value) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoForbiddenReviewDataKeys(`${scope}[${index}]`, item));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenReviewDataKeys.has(key.toLowerCase())) {
      fail(`${scope}: forbidden review-data key ${key}; write structured data only, not page HTML/CSS/JS`);
    }
    validateNoForbiddenReviewDataKeys(`${scope}.${key}`, child);
  }
}

function validateNoEmbeddedPageCodeInValues(scope, value) {
  if (typeof value === "string") {
    for (const pattern of forbiddenReviewDataValuePatterns) {
      if (pattern.test(value)) {
        fail(`${scope}: forbidden page code in review-data value; write structured data only, not embedded HTML/CSS/JS`);
        return;
      }
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoEmbeddedPageCodeInValues(`${scope}[${index}]`, item));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    validateNoEmbeddedPageCodeInValues(`${scope}.${key}`, child);
  }
}

function validateNoOutlineDownstreamDesign(scope, value) {
  if (typeof value === "string") {
    if (forbiddenOutlineDownstreamValuePatterns.some((pattern) => pattern.test(value))) {
      fail(`${scope}: outline downstream design detail is forbidden; keep review data at intent, scope, readiness, and authority level`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoOutlineDownstreamDesign(`${scope}[${index}]`, item));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenOutlineDownstreamKeys.has(key.toLowerCase())) {
      fail(`${scope}: outline downstream design detail ${key} is forbidden; do not define process steps, screens, APIs, database models, or implementation tasks`);
    }
    validateNoOutlineDownstreamDesign(`${scope}.${key}`, child);
  }
}

function validateKnownKeys(scope, value, allowedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      fail(`${scope}: unknown review-data key ${key}; use the schema fields only`);
    }
  }
}

function validateCurrentConfirmationVocabulary(scope, value) {
  if (typeof value === "string") {
    if (legacyConfirmationValues.has(value)) {
      fail(`${scope}: new review data must not use legacy confirmation value ${value}`);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => validateCurrentConfirmationVocabulary(`${scope}[${index}]`, item));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    validateCurrentConfirmationVocabulary(`${scope}.${key}`, child);
  }
}

function validateOptions(scope, node, reviewType) {
  if (!hasDecisionOptions(node)) {
    return;
  }

  const options = asArray(node.options);
  if (reviewType === "outline") {
    if (options.length < 2 || options.length > 4) {
      fail(`${scope}: outline human_judgment nodes require 2-4 executable options`);
      return;
    }
    if (options.length === 2 && !hasSubstantialText(node.options_count_rationale)) {
      fail(`${scope}: options_count_rationale is required when this outline human-judgment node uses only 2 options`);
    }
    if (!hasSubstantialText(node.decision_background)) {
      fail(`${scope}: decision_background must explain the real product background before options`);
    }
    if (!hasSubstantialText(node.decision_summary)) {
      fail(`${scope}: decision_summary must state what the reviewer is deciding`);
    }
    const ids = new Set();
    for (const option of options) {
      validateKnownKeys(`${scope}:option`, option, allowedOptionKeys);
      validateEnum(scope, "option.id", option.id, allowedOptionIds);
      if (!option.id) fail(`${scope}: option is missing id`);
      if (ids.has(option.id)) fail(`${scope}: duplicate option id ${option.id}`);
      ids.add(option.id);
      for (const key of ["label", "benefit", "cost", "consequence", "next_exit"]) {
        if (!compactText(option[key])) fail(`${scope}: option ${option.id || "unknown"} is missing ${key}`);
      }
      if (option.id === "OPTION_B" && !String(option.next_exit || "").trim().toLowerCase().startsWith("needs-decision")) {
        fail(`${scope}: OPTION_B.next_exit must start with needs-decision`);
      }
    }
    if (!node.recommended_option || !ids.has(node.recommended_option)) {
      fail(`${scope}: recommended_option must match an option id`);
    }
    const recommendedFlags = options.filter((option) => option.recommended === true);
    if (recommendedFlags.length > 1) fail(`${scope}: only one option may be marked recommended`);
    if (recommendedFlags.length === 1 && recommendedFlags[0].id !== node.recommended_option) {
      fail(`${scope}: recommended option flag does not match recommended_option`);
    }
    return;
  }

  if (options.length < 2 || options.length > 4) {
    fail(`${scope}: ${reviewType} human_judgment nodes require 2-4 executable options; ordinary human-judgment nodes default to 3 options`);
    return;
  }
  if (node.review_level === "must_confirm" && reviewType === "ui" && (options.length < 3 || options.length > 4)) {
    fail(`${scope}: UI must_confirm nodes require 3-4 options`);
  }
  if (options.length === 2 && (reviewType !== "ui" || node.review_level !== "must_confirm") && !hasSubstantialText(node.options_count_rationale)) {
    fail(`${scope}: options_count_rationale is required when this ${reviewType} human-judgment node uses only 2 options`);
  }
  if (node.review_level === "must_confirm" && !hasDecisionUrgencySignal(`${node.plain_summary || ""} ${node.action_prompt || ""}`)) {
    fail(`${scope}: must_confirm node must explain why this decision matters now`);
  }
  if (!hasSubstantialText(node.decision_background)) {
    fail(`${scope}: decision_background must explain the real business background before options`);
  }
  if (!hasSubstantialText(node.decision_summary)) {
    fail(`${scope}: decision_summary must state what the reviewer is deciding`);
  }

  const ids = new Set();
  const copyFingerprints = new Map();
  const genericLabelOpeners = [];
  for (const option of options) {
    validateKnownKeys(`${scope}:option`, option, allowedOptionKeys);
    if (!option.id) {
      fail(`${scope}: option is missing id`);
      continue;
    }
    validateEnum(scope, "option.id", option.id, allowedOptionIds);
    if (ids.has(option.id)) {
      fail(`${scope}: duplicate option id ${option.id}`);
    }
    ids.add(option.id);
    for (const key of ["label", "benefit", "cost", "consequence", "next_exit"]) {
      const value = option[key];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        fail(`${scope}: option ${option.id} is missing ${key}`);
      }
    }
    if (isVagueActionExit(option.label) || isVagueActionExit(option.next_exit)) {
      fail(`${scope}: option ${option.id} must use an actionable exit, not approve/defer/reject/block labels`);
    }
    const opener = labelGenericOpener(option.label);
    if (opener) {
      genericLabelOpeners.push(`${option.id}:${opener}`);
    }
    validateOptionHumanCopy(scope, option);
    const copyFingerprint = normalizeOptionCopy(option);
    if (copyFingerprint) {
      const previousOptionId = copyFingerprints.get(copyFingerprint);
      if (previousOptionId) {
        fail(`${scope}: duplicate option copy between ${previousOptionId} and ${option.id}; each option must explain a distinct benefit, cost, execution action, and downstream impact`);
      } else {
        copyFingerprints.set(copyFingerprint, option.id);
      }
    }
    if (option.id === "OPTION_B" && !String(option.next_exit || "").trim().toLowerCase().startsWith("needs-decision")) {
      fail(`${scope}: OPTION_B.next_exit must start with needs-decision`);
    }
  }
  if (genericLabelOpeners.length >= 2) {
    fail(`${scope}: option labels must not start with generic verbs; name the real business exit instead of ${genericLabelOpeners.join(", ")}`);
  }
  for (let leftIndex = 0; leftIndex < options.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < options.length; rightIndex += 1) {
      const left = options[leftIndex];
      const right = options[rightIndex];
      if (textContainmentSimilarity(`${left.benefit || ""} ${left.cost || ""}`, `${right.benefit || ""} ${right.cost || ""}`) >= 0.72) {
        fail(`${scope}: duplicate option copy between ${left.id} and ${right.id}; option benefit and cost must show real differences`);
      }
    }
  }

  if (!node.recommended_option) {
    fail(`${scope}: missing recommended_option`);
    return;
  }

  if (!ids.has(node.recommended_option)) {
    fail(`${scope}: recommended_option ${node.recommended_option} does not match an option id`);
  }

  const recommendedOption = options.find((option) => option.id === node.recommended_option);
  if (recommendedOption && !hasRecommendationRationale(recommendedOption)) {
    fail(`${scope}: recommended option must explain why it is preferred over stricter, slower, or larger-change alternatives`);
  }
  if (recommendedOption && !hasSubstantialText(recommendedOption.recommendation_reason)) {
    fail(`${scope}: recommended option must explain why it is preferred`);
  }

  const recommendedFlags = options.filter((option) => option.recommended === true);
  if (recommendedFlags.length > 1) {
    fail(`${scope}: only one option may be marked recommended`);
  }
  if (recommendedFlags.length === 1 && recommendedFlags[0].id !== node.recommended_option) {
    fail(`${scope}: recommended option flag does not match recommended_option`);
  }
}

function validateUiScreenStructure(itemLabel, item) {
  validateEnum(itemLabel, "screen_layout", item.screen_layout, allowedUiLayouts);

  if (!item.screen_layout) {
    fail(`${itemLabel}: UI review data requires screen_layout`);
  }

  const regions = asArray(item.screen_regions);
  if (!regions.length) {
    fail(`${itemLabel}: UI review data requires screen_regions; UI review data must describe UI screen regions/components; optional states may add screen-state notes, but review nodes alone are not enough`);
    return;
  }

  const regionIds = new Set();
  const componentIds = new Set();
  const stateIds = new Set();

  regions.forEach((region, regionIndex) => {
    const regionLabel = `${itemLabel}:region-${region.id || regionIndex + 1}`;
    validateKnownKeys(regionLabel, region, allowedScreenRegionKeys);
    validateReadableCopy(regionLabel, region);
    for (const key of ["id", "title", "purpose", "position"]) {
      if (!region[key]) {
        fail(`${regionLabel}: missing ${key}`);
      }
    }
    validateEnum(regionLabel, "position", region.position, allowedUiRegionPositions);
    if (region.id) {
      if (regionIds.has(region.id)) {
        fail(`${itemLabel}: duplicate region id ${region.id}`);
      }
      regionIds.add(region.id);
    }

    const components = asArray(region.components);
    if (!components.length) {
      fail(`${regionLabel}: UI screen regions/components require at least one component; optional states may add screen-state notes`);
    }
    components.forEach((component, componentIndex) => {
      const componentLabel = `${regionLabel}:component-${component.id || componentIndex + 1}`;
      validateKnownKeys(componentLabel, component, allowedUiComponentKeys);
      validateReadableCopy(componentLabel, component);
      for (const key of ["id", "kind", "label", "purpose", "source_ref"]) {
        if (!component[key]) {
          fail(`${componentLabel}: missing ${key}`);
        }
      }
      validateEnum(componentLabel, "kind", component.kind, allowedUiComponentKinds);
      if (component.id) {
        if (componentIds.has(component.id)) {
          fail(`${itemLabel}: duplicate component id ${component.id}`);
        }
        componentIds.add(component.id);
      }
    });
  });

  asArray(item.states).forEach((state, stateIndex) => {
    const stateLabel = `${itemLabel}:state-${state.id || stateIndex + 1}`;
    validateKnownKeys(stateLabel, state, allowedUiStateKeys);
    validateReadableCopy(stateLabel, state);
    for (const key of ["id", "label", "state_type", "plain_note", "source_ref"]) {
      if (!state[key]) {
        fail(`${stateLabel}: missing ${key}`);
      }
    }
    validateEnum(stateLabel, "state_type", state.state_type, allowedUiStateTypes);
    if (state.id) {
      if (stateIds.has(state.id)) {
        fail(`${itemLabel}: duplicate state id ${state.id}`);
      }
      stateIds.add(state.id);
    }
  });
}

const vagueUiContextPatterns = [
  /^(本|该|此)?(页面|界面|屏幕)?(主要)?(用于|用来)?(展示|查看|呈现|管理|处理)(相关|业务|系统|页面)?(信息|数据|内容|功能|详情|列表)[。.!！]?$/i,
  /^(帮助|方便)(用户|相关人员)?(查看|了解|管理|处理|完成)(相关|业务)?(信息|数据|内容|任务)[。.!！]?$/i,
  /^(本|该|此)?(页面|界面|屏幕|屏|screen)(主要)?(用于|用来)?(展示|查看|呈现|包含|列出|提供).+$/i,
  /^(布局[:：]?)?(列表加详情|列表详情|顶部加侧栏|表单|看板|仪表盘|详情页|设置页|向导|弹窗|自定义界面)[。.!！]?$/i
];

const genericUiRolePattern = /^(用户|业务用户|相关人员|工作人员|管理员|操作员|user|users)$/i;

function isVagueUiContextCopy(value) {
  const text = compactText(value);
  return vagueUiContextPatterns.some((pattern) => pattern.test(text));
}

function validateUiScreenContext(itemLabel, item) {
  for (const key of ["business_context", "user_goal", "user_outcome"]) {
    if (!hasSubstantialText(item[key])) {
      fail(`${itemLabel}: UI screen context requires ${key} with specific business meaning`);
    } else if (isVagueUiContextCopy(item[key])) {
      fail(`${itemLabel}: ${key} is vague UI context copy; explain the real business situation instead of layout or generic display wording`);
    }
  }

  const primaryUsers = asArray(item.primary_users);
  if (!primaryUsers.length || primaryUsers.some((value) => !compactText(value))) {
    fail(`${itemLabel}: UI screen context requires primary_users with at least one named business role`);
  } else if (primaryUsers.some((value) => genericUiRolePattern.test(compactText(value)))) {
    fail(`${itemLabel}: primary_users must name a concrete business role instead of generic user wording`);
  }

  const entryScenarios = asArray(item.entry_scenarios);
  if (!entryScenarios.length) {
    fail(`${itemLabel}: UI screen context requires entry_scenarios`);
  }
  entryScenarios.forEach((scenario, index) => {
    if (compactText(scenario).length < 8 || isVagueUiContextCopy(scenario)) {
      fail(`${itemLabel}: entry_scenarios[${index}] must name a concrete trigger or business situation`);
    }
  });

  const flowRefs = asArray(item.flow_refs);
  if (!flowRefs.length || flowRefs.some((value) => !compactText(value))) {
    fail(`${itemLabel}: UI screen context requires flow_refs as evidence references; flow references must not replace UI regions or components`);
  }
}

function requireNonEmptyStringArray(scope, key, value) {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(`${scope}: ${key} must contain at least one non-empty string`);
  }
}

function validateOutlineView(itemLabel, item, outlineAuthorityIds) {
  validateEnum(itemLabel, "view_type", item.view_type, allowedOutlineViewTypes);

  if (item.view_type === "intent_map") {
    if (!compactText(item.intent)) fail(`${itemLabel}: intent_map requires intent`);
    for (const key of ["users", "problem_slices", "capability_slices"]) {
      requireNonEmptyStringArray(itemLabel, key, item[key]);
    }
  } else if (item.view_type === "scope_slice") {
    for (const key of ["in_scope", "non_goals"]) {
      requireNonEmptyStringArray(itemLabel, key, item[key]);
    }
    if (!compactText(item.recommended_first_slice)) {
      fail(`${itemLabel}: scope_slice requires recommended_first_slice`);
    }
    const scenarios = asArray(item.scenario_coverage);
    if (!scenarios.length) fail(`${itemLabel}: scope_slice requires scenario_coverage`);
    scenarios.forEach((scenario, scenarioIndex) => {
      const scenarioLabel = `${itemLabel}:scenario-${scenarioIndex + 1}`;
      validateKnownKeys(scenarioLabel, scenario, allowedScenarioCoverageKeys);
      if (!compactText(scenario.scenario)) fail(`${scenarioLabel}: missing scenario`);
      requireNonEmptyStringArray(scenarioLabel, "acceptance_seeds", scenario.acceptance_seeds);
    });
  } else if (item.view_type === "readiness_authority") {
    const authorities = asArray(item.source_authorities);
    if (!authorities.length) fail(`${itemLabel}: readiness_authority requires source_authorities`);
    const localAuthorityIds = new Set();
    authorities.forEach((authority, authorityIndex) => {
      const authorityLabel = `${itemLabel}:authority-${authority.id || authorityIndex + 1}`;
      validateKnownKeys(authorityLabel, authority, allowedSourceAuthorityKeys);
      for (const key of ["id", "path", "status", "scope"]) {
        if (!compactText(authority[key])) fail(`${authorityLabel}: missing ${key}`);
      }
      validateEnum(authorityLabel, "status", authority.status, allowedSourceAuthorityStatuses);
      if (authority.id) {
        if (localAuthorityIds.has(authority.id)) fail(`${itemLabel}: duplicate source authority id ${authority.id}`);
        localAuthorityIds.add(authority.id);
        outlineAuthorityIds.add(authority.id);
      }
    });
    for (const key of ["risks", "open_items", "blockers"]) {
      if (!Array.isArray(item[key])) fail(`${itemLabel}: readiness_authority requires ${key} as an array`);
    }
    if (!compactText(item.next_route)) fail(`${itemLabel}: readiness_authority requires next_route`);
  }
}

function validateItem(reviewType, schemaVersion, module, item, itemIndex, globalNodeIds, outlineAuthorityIds) {
  const itemLabel = `${module.id || "module"}:${item.id || `item-${itemIndex + 1}`}`;
  const nodes = asArray(item.nodes);
  const edges = asArray(item.edges);
  const nodeIds = new Set();

  validateKnownKeys(itemLabel, item, reviewType === "outline" ? allowedOutlineViewKeys : allowedReviewItemKeys);
  if (reviewType === "flow") {
    for (const key of uiOnlyReviewItemKeys) {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        fail(`${itemLabel}: flow review data must not use ${key}; keep Flow and UI review contracts separate`);
      }
    }
  }
  if (reviewType !== "outline") validateReadableCopy(itemLabel, item);

  if (!item.id) fail(`${itemLabel}: item id is required`);
  if (!item.title) fail(`${itemLabel}: item title is required`);
  if (!item.summary) fail(`${itemLabel}: item summary is required`);
  if (!item.source_path) fail(`${itemLabel}: item source_path is required`);
  if (reviewType === "flow") {
    validateEnum(itemLabel, "item_type", item.item_type, allowedFlowItemTypes);
  } else if (reviewType === "ui") {
    validateEnum(itemLabel, "item_type", item.item_type, allowedUiItemTypes);
    validateUiScreenContext(itemLabel, item);
    validateUiScreenStructure(itemLabel, item);
  } else {
    validateOutlineView(itemLabel, item, outlineAuthorityIds);
  }

  if (reviewType === "flow") {
    const businessNodes = nodes.filter((node) => node.review_layer !== "system_arch");
    if (businessNodes.length >= 8 && businessNodes.length < 10) {
      warn(`${itemLabel}: 8+ business nodes should be split unless this is intentionally reviewable`);
    }
    if (businessNodes.length >= 10 && !hasQualifiedException(item)) {
      fail(`${itemLabel}: 10+ business nodes require complex_flow_exception or low_risk_linear_exception`);
    }
  }

  nodes.forEach((node, nodeIndex) => {
    const nodeLabel = `${itemLabel}:${node.id || `node-${nodeIndex + 1}`}`;
    validateKnownKeys(nodeLabel, node, allowedNodeKeys);
    if (!node.id) {
      fail(`${nodeLabel}: node id is required`);
      return;
    }
    if (nodeIds.has(node.id)) {
      fail(`${itemLabel}: duplicate node id ${node.id}`);
    }
    nodeIds.add(node.id);
    if (globalNodeIds.has(node.id)) {
      fail(`${nodeLabel}: duplicate node id ${node.id}; node ids must be global within review data because renderer state is scoped per review data and keyed by node id`);
    }
    globalNodeIds.add(node.id);

    for (const key of [
      "label",
      "plain_summary",
      "review_layer",
      "review_level",
      "owner",
      "node_kind",
      "source_ref"
    ]) {
      if (!node[key]) {
        fail(`${nodeLabel}: missing ${key}`);
      }
    }

    validateEnum(nodeLabel, "review_layer", node.review_layer, allowedNodeReviewLayers);
    validateEnum(nodeLabel, "review_level", node.review_level, allowedReviewLevels);
    validateEnum(nodeLabel, "node_kind", node.node_kind, allowedNodeKinds);
    validateEnum(nodeLabel, "confirmation_priority", node.confirmation_priority, allowedConfirmationPriorities);
    if (reviewType === "outline" && ["flow", "sequence", "ui", "system"].includes(node.node_kind)) {
      fail(`${nodeLabel}: outline downstream design detail node_kind ${node.node_kind} is forbidden; use shared confirmation nodes for outline judgments`);
    }

    if (schemaVersion === 2) {
      if (hasDecisionOptions(node) && !node.confirmation_priority) {
        fail(`${nodeLabel}: confirmation_priority is required for actionable schema v2 nodes`);
      }
      if (!hasDecisionOptions(node) && node.confirmation_priority) {
        fail(`${nodeLabel}: informational schema v2 nodes must omit confirmation_priority`);
      }
      if (node.confirmation_priority === "critical") {
        if (!hasSubstantialText(node.critical_basis)) {
          fail(`${nodeLabel}: critical_basis must describe the severe impact and lack of a safe reversible/default route`);
        }
        if (!hasSubstantialText(node.priority_reason)) {
          fail(`${nodeLabel}: priority_reason must explain why this point requires individual confirmation`);
        }
      }
    } else if (node.confirmation_priority || node.priority_reason || node.critical_basis) {
      fail(`${nodeLabel}: confirmation priority fields require schema_version 2`);
    }

    if (node.review_layer === "system_arch" || node.review_level === "system_arch") {
      const systemRouteText = `${node.owner || ""} ${node.plain_summary || ""} ${node.action_prompt || ""}`;
      if (/产品经理/.test(node.owner || "")) {
        fail(`${nodeLabel}: system_arch nodes must not route owner to 产品经理`);
      }
      if (!/(系统|架构)/.test(systemRouteText) || !/(无需产品确认|无需产品经理确认|不需要产品确认|不需要产品经理确认)/.test(systemRouteText)) {
        fail(`${nodeLabel}: system_arch nodes must route to a system/architecture owner and say 无需产品确认`);
      }
    }

    if (reviewType !== "outline") validateReadableCopy(nodeLabel, node);
    if (reviewType === "flow") {
      validateFlowNodeSemantics(nodeLabel, node);
    }
    validateOptions(nodeLabel, node, reviewType);
  });

  edges.forEach((edge, edgeIndex) => {
    const edgeLabel = `${itemLabel}:edge-${edgeIndex + 1}`;
    validateKnownKeys(edgeLabel, edge, allowedEdgeKeys);
    if (!edge.from || !edge.to) {
      fail(`${edgeLabel}: edge requires from and to`);
      return;
    }
    if (!nodeIds.has(edge.from)) {
      fail(`${edgeLabel}: edge.from references missing node ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      fail(`${edgeLabel}: edge.to references missing node ${edge.to}`);
    }
  });
  if (reviewType === "flow") {
    validateFlowEdgeSemantics(itemLabel, nodes, edges);
  }
}

function validateOutlineDiscoveryTopology(data) {
  const budget = data.density_budget;
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) {
    fail("outline discovery density_budget must be an object");
  } else {
    for (const [key, expected] of Object.entries(outlineDiscoveryDensityBudget)) {
      if (budget[key] !== expected) fail(`outline discovery density_budget.${key} must be ${expected}`);
    }
  }

  const maps = asArray(data.maps);
  if (maps.length < 3) fail("outline discovery maps must contain overview, branch, and global_constraints maps");
  const mapsById = new Map();
  for (const [index, map] of maps.entries()) {
    const label = `outline map[${index}]`;
    for (const key of ["map_id", "title", "summary", "map_kind", "root_node_id"]) {
      if (!String(map?.[key] || "").trim()) fail(`${label}: ${key} is required`);
    }
    if (mapsById.has(map?.map_id)) fail(`duplicate outline map_id ${map?.map_id}`);
    if (!allowedOutlineMapKinds.has(map?.map_kind)) fail(`${label}: unsupported map_kind ${map?.map_kind}`);
    if (!(typeof map?.parent_map_id === "string" || map?.parent_map_id === null)) {
      fail(`${label}: parent_map_id must be string or null`);
    }
    mapsById.set(map?.map_id, map);
  }
  const overviewMaps = maps.filter((map) => map?.map_kind === "overview");
  const constraintMaps = maps.filter((map) => map?.map_kind === "global_constraints");
  if (overviewMaps.length !== 1) fail("outline discovery must contain exactly one overview map");
  if (constraintMaps.length !== 1) fail("outline discovery must contain exactly one global_constraints map");
  for (const map of maps) {
    if (map.map_kind === "overview") {
      if (map.parent_map_id !== null) fail(`overview map ${map.map_id} parent_map_id must be null`);
    } else if (!mapsById.has(map.parent_map_id)) {
      fail(`outline map ${map.map_id} parent_map_id must reference an existing map`);
    }
  }
  for (const map of maps) {
    const visited = new Set([map.map_id]);
    let cursor = map;
    while (cursor.parent_map_id !== null) {
      cursor = mapsById.get(cursor.parent_map_id);
      if (!cursor) break;
      if (visited.has(cursor.map_id)) {
        fail("outline maps must not contain parent cycles");
        break;
      }
      visited.add(cursor.map_id);
    }
  }

  const nodes = asArray(data.outline_nodes);
  if (!nodes.length) fail("outline discovery outline_nodes must not be empty");
  const nodesById = new Map();
  const nodesByMap = new Map(maps.map((map) => [map.map_id, []]));
  for (const [index, node] of nodes.entries()) {
    const label = `outline node[${index}]`;
    for (const key of ["node_id", "map_id", "node_kind", "label", "summary", "source_status"]) {
      if (!String(node?.[key] || "").trim()) fail(`${label}: ${key} is required`);
    }
    if (!(typeof node?.parent_node_id === "string" || node?.parent_node_id === null)) {
      fail(`${label}: parent_node_id must be string or null`);
    }
    if (nodesById.has(node?.node_id)) fail(`duplicate outline node_id ${node?.node_id}`);
    if (!mapsById.has(node?.map_id)) fail(`${label}: map_id must reference an existing map`);
    if (!allowedOutlineNodeKinds.has(node?.node_kind)) fail(`${label}: unsupported node_kind ${node?.node_kind}`);
    if (!allowedOutlineSourceStatuses.has(node?.source_status)) fail(`${label}: unsupported source_status ${node?.source_status}`);
    nodesById.set(node?.node_id, node);
    if (nodesByMap.has(node?.map_id)) nodesByMap.get(node.map_id).push(node);
  }

  for (const map of maps) {
    const mapNodes = nodesByMap.get(map.map_id) || [];
    if (mapNodes.length > outlineDiscoveryDensityBudget.max_visible_nodes_per_map) {
      fail(`outline map ${map.map_id} may contain at most 18 visible nodes`);
    }
    const root = nodesById.get(map.root_node_id);
    if (!root || root.map_id !== map.map_id || root.node_kind !== "root" || root.parent_node_id !== null) {
      fail(`outline map ${map.map_id} root_node_id must reference its root node`);
    }
    if (mapNodes.filter((node) => node.parent_node_id === null).length !== 1) {
      fail(`outline map ${map.map_id} must contain exactly one root node`);
    }
  }

  const childrenByParent = new Map();
  for (const node of nodes) {
    if (node.parent_node_id !== null) {
      const parent = nodesById.get(node.parent_node_id);
      if (!parent || parent.map_id !== node.map_id) {
        fail(`outline node ${node.node_id} parent_node_id must reference a node in the same map`);
      } else {
        const children = childrenByParent.get(parent.node_id) || [];
        children.push(node);
        childrenByParent.set(parent.node_id, children);
      }
    }
  }
  for (const [parentId, children] of childrenByParent.entries()) {
    if (children.length > outlineDiscoveryDensityBudget.max_children_per_node) {
      fail(`outline node ${parentId} may have at most 4 direct children`);
    }
  }

  for (const map of maps) {
    const mapNodes = nodesByMap.get(map.map_id) || [];
    const layerCounts = new Map();
    for (const node of mapNodes) {
      let depth = 1;
      let cursor = node;
      const visited = new Set([node.node_id]);
      while (cursor.parent_node_id !== null) {
        const parent = nodesById.get(cursor.parent_node_id);
        if (!parent || parent.map_id !== map.map_id) break;
        if (visited.has(parent.node_id)) {
          fail(`outline map ${map.map_id} must not contain parent cycles`);
          break;
        }
        visited.add(parent.node_id);
        depth += 1;
        cursor = parent;
      }
      if (depth > outlineDiscoveryDensityBudget.max_depth) {
        fail(`outline map ${map.map_id} exceeds maximum depth 3`);
      }
      layerCounts.set(depth, (layerCounts.get(depth) || 0) + 1);
    }
    if (mapNodes.length >= outlineDiscoveryDensityBudget.layer_balance_min_nodes) {
      const largestLayer = Math.max(...layerCounts.values());
      if (largestLayer / mapNodes.length > outlineDiscoveryDensityBudget.max_layer_share) {
        fail(`outline map ${map.map_id} layer may contain at most 60% of visible nodes`);
      }
    }
  }

  const childMapLinkCounts = new Map();
  const overviewMap = overviewMaps[0];
  const overviewRoot = overviewMap ? nodesById.get(overviewMap.root_node_id) : null;
  const businessChainIds = new Set(asArray(data.business_context?.business_chains).map((chain) => chain?.chain_id));
  const constitutionClauseIds = new Set(asArray(data.constitution_snapshot?.clauses).map((clause) => clause?.clause_id));
  for (const node of nodes) {
    const map = mapsById.get(node.map_id);
    const isBusinessNode = map?.map_kind === "branch" || (map?.map_kind === "overview" && node.node_kind !== "root" && node.child_map_id !== constraintMaps[0]?.map_id);
    if (node.parent_node_id === overviewRoot?.node_id &&
        (node.node_kind !== "map_link" || !["branch", "global_constraints"].includes(mapsById.get(node.child_map_id)?.map_kind))) {
      fail("overview root direct children must be business or governance map links");
    }
    if (isBusinessNode || (map?.map_kind === "overview" && node.node_kind === "root")) {
      if (!Array.isArray(node.business_chain_refs) || !node.business_chain_refs.length) {
        fail(`outline business branch must reference at least one business chain: ${node.node_id}`);
      } else if (node.business_chain_refs.some((id) => !businessChainIds.has(id))) {
        fail(`outline node ${node.node_id} business_chain_refs must reference business_context`);
      }
    } else if (node.business_chain_refs !== undefined) {
      fail(`outline node ${node.node_id} business_chain_refs are only allowed on business nodes`);
    }
    if (node.constitution_clause_refs !== undefined) {
      if (map?.map_kind !== "global_constraints" || node.node_kind !== "constraint") {
        fail(`outline node ${node.node_id} constitution_clause_refs are only allowed on global constraint nodes`);
      }
      if (!Array.isArray(node.constitution_clause_refs) || !node.constitution_clause_refs.length ||
          node.constitution_clause_refs.some((id) => !constitutionClauseIds.has(id))) {
        fail(`outline node ${node.node_id} constitution_clause_refs must reference constitution_snapshot`);
      }
    }
    if (node.child_map_id !== undefined) {
      const childMap = mapsById.get(node.child_map_id);
      if (node.node_kind !== "map_link" || !childMap || childMap.parent_map_id !== node.map_id) {
        fail(`outline node ${node.node_id} child_map_id must link to a direct child map`);
      } else {
        childMapLinkCounts.set(node.child_map_id, (childMapLinkCounts.get(node.child_map_id) || 0) + 1);
      }
    } else if (node.node_kind === "map_link") {
      fail(`outline map_link node ${node.node_id} requires child_map_id`);
    }
    if (node.affected_node_ids !== undefined) {
      if (map?.map_kind !== "global_constraints" || node.node_kind !== "constraint" ||
          !Array.isArray(node.affected_node_ids)) {
        fail(`outline node ${node.node_id} affected_node_ids are only allowed on global constraint nodes`);
      } else {
        if (new Set(node.affected_node_ids).size !== node.affected_node_ids.length) {
          fail(`outline node ${node.node_id} affected_node_ids must be unique`);
        }
        for (const affectedId of node.affected_node_ids) {
          const affected = nodesById.get(affectedId);
          if (!affected || mapsById.get(affected.map_id)?.map_kind !== "branch") {
            fail(`outline node ${node.node_id} affected_node_ids must reference business branch nodes`);
          }
        }
      }
    }
  }
  for (const map of maps) {
    if (map.map_kind !== "overview" && childMapLinkCounts.get(map.map_id) !== 1) {
      fail(`outline map ${map.map_id} must be linked exactly once from its parent map`);
    }
  }
  return { mapsById, nodesById };
}

function validateOutlineDiscoveryBusinessContext(data) {
  const context = data.business_context;
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    fail("outline discovery business_context must be an object");
    return;
  }
  const sourcesByPath = new Map(asArray(data.source_snapshot).map((source) => [String(source?.path || "").replace(/\\/g, "/"), source]));
  const validateSourceRefs = (entry, label) => {
    if (!allowedOutlineSourceStatuses.has(entry?.source_status)) fail(`${label}: unsupported source_status`);
    const refs = asArray(entry?.source_refs);
    if (!refs.length) fail(`${label}: source_refs must not be empty`);
    for (const ref of refs) {
      const normalized = String(ref || "").replace(/\\/g, "/");
      const hash = normalized.indexOf("#");
      const sourcePath = hash === -1 ? normalized : normalized.slice(0, hash);
      const anchor = hash === -1 ? "" : normalized.slice(hash + 1);
      if (sourcePath === data.constitution_snapshot?.source_path || /(?:^|\/)constitution\.md$/i.test(sourcePath)) {
        fail(`${label}: Constitution cannot be business evidence`);
      }
      const source = sourcesByPath.get(sourcePath);
      if (!source || (anchor && (!Array.isArray(source.anchors) || !source.anchors.includes(anchor)))) {
        fail(`${label}: source_refs must reference source_snapshot and its declared anchors`);
      }
    }
  };
  const subject = context.product_subject;
  for (const key of ["label", "summary"]) if (!String(subject?.[key] || "").trim()) fail(`business product_subject.${key} is required`);
  validateSourceRefs(subject, "business product_subject");

  const collect = (key, idKey, requiredTextFields = ["label", "summary"]) => {
    const values = asArray(context[key]);
    if (!values.length) fail(`business_context.${key} must not be empty`);
    const ids = new Set();
    for (const [index, entry] of values.entries()) {
      const label = `business_context.${key}[${index}]`;
      for (const field of [idKey, ...requiredTextFields]) if (!String(entry?.[field] || "").trim()) fail(`${label}: ${field} is required`);
      if (ids.has(entry?.[idKey])) fail(`${label}: duplicate ${idKey}`);
      ids.add(entry?.[idKey]);
      validateSourceRefs(entry, label);
    }
    return { values, ids };
  };
  const objects = collect("business_objects", "object_id");
  const operations = collect("operations", "operation_id");
  const outcomes = collect("outcomes", "outcome_id");
  for (const [index, operation] of operations.values.entries()) {
    if (!Array.isArray(operation.object_refs) || !operation.object_refs.length || operation.object_refs.some((id) => !objects.ids.has(id))) {
      fail(`business operation[${index}] object_refs must reference business_objects`);
    }
  }
  const chains = collect("business_chains", "chain_id", ["label"]);
  for (const [index, chain] of chains.values.entries()) {
    if (!String(chain?.trigger_or_input || "").trim()) fail(`business chain[${index}] trigger_or_input is required`);
    if (!Array.isArray(chain.object_refs) || !chain.object_refs.length) fail("business chain must reference at least one business object");
    else if (chain.object_refs.some((id) => !objects.ids.has(id))) fail(`business chain[${index}] object_refs must reference business_objects`);
    if (!Array.isArray(chain.operation_refs) || !chain.operation_refs.length || chain.operation_refs.some((id) => !operations.ids.has(id))) {
      fail(`business chain[${index}] operation_refs must reference operations`);
    }
    if (!Array.isArray(chain.outcome_refs) || !chain.outcome_refs.length || chain.outcome_refs.some((id) => !outcomes.ids.has(id))) {
      fail(`business chain[${index}] outcome_refs must reference outcomes`);
    }
  }
  if (!Array.isArray(context.evidence_gaps)) fail("business_context.evidence_gaps must be an array");
  const evidenceGaps = Array.isArray(context.evidence_gaps) ? context.evidence_gaps : [];
  const evidenceGapIds = new Set();
  for (const [index, gap] of evidenceGaps.entries()) {
    if (!String(gap?.gap_id || "").trim() || !String(gap?.summary || "").trim()) fail(`business evidence_gap[${index}] fields are required`);
    if (evidenceGapIds.has(gap.gap_id)) fail(`duplicate evidence gap_id ${gap.gap_id}`);
    evidenceGapIds.add(gap.gap_id);
    if (!Array.isArray(gap?.business_chain_refs) || !gap.business_chain_refs.length || gap.business_chain_refs.some((id) => !chains.ids.has(id))) {
      fail(`business evidence_gap[${index}] business_chain_refs must reference business_chains`);
    }
  }
  if (data.outline_maturity === "frame" && !chains.values.some((chain) => ["user", "user-confirmed", "doc"].includes(chain.source_status))) {
    fail("frame maturity requires at least one source-backed complete business chain");
  }
}

function validateOutlineDiscoveryConstitution(data) {
  const snapshot = data.constitution_snapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) fail("constitution_snapshot must be an object");
  if (!isSafeRepositoryRelativePath(snapshot?.source_path)) fail("constitution_snapshot.source_path must be a safe repository-relative path");
  if (!new Set(["available", "missing"]).has(snapshot?.availability)) fail("constitution_snapshot.availability is invalid");
  if (snapshot?.display_mode !== "read_only") fail("constitution_snapshot.display_mode must be read_only");
  if (snapshot?.application_scope !== "governance_only") fail("constitution_snapshot.application_scope must be governance_only");
  if (!Array.isArray(snapshot?.clauses)) fail("constitution_snapshot.clauses must be an array");
  const clauses = Array.isArray(snapshot?.clauses) ? snapshot.clauses : [];
  if (snapshot?.availability === "missing" && clauses.length) fail("missing constitution_snapshot cannot contain clauses");
  const ids = new Set();
  for (const [index, clause] of clauses.entries()) {
    for (const key of ["clause_id", "title", "summary", "source_anchor", "applicability_status"]) {
      if (!String(clause?.[key] || "").trim()) fail(`constitution clause[${index}].${key} is required`);
    }
    if (ids.has(clause.clause_id)) fail(`duplicate constitution clause_id ${clause.clause_id}`);
    ids.add(clause.clause_id);
    if (!new Set(["applicable", "possibly_applicable", "not_applicable"]).has(clause.applicability_status)) {
      fail(`constitution clause[${index}].applicability_status is invalid`);
    }
  }
}

function validateOutlineDiscovery(data) {
  for (const key of [
    "schema_version", "review_type", "interaction_mode", "artifact_path", "outline_maturity",
    "batch_id", "project", "source_snapshot", "business_context", "constitution_snapshot", "density_budget", "maps", "outline_nodes",
    "question_groups", "authorization_effect", "next_route"
  ]) {
    if (data[key] === undefined || data[key] === null || data[key] === "") fail(`missing ${key}`);
  }
  if (data.schema_version !== 3) fail("outline discovery requires schema_version 3");
  if (data.interaction_mode !== "discovery") fail("outline discovery interaction_mode must be discovery");
  if (!new Set(["explore", "frame"]).has(data.outline_maturity)) {
    fail("outline discovery outline_maturity must be explore or frame");
  }
  if (data.authorization_effect !== "none") fail("outline discovery authorization_effect must be none");
  if (data.next_route !== "/sp.prd") fail("outline discovery next_route must be /sp.prd");
  if (!isSafeRepositoryRelativePath(data.artifact_path) ||
      !/^specs\/[^/]+\/prd\/review\/outline-discovery-data\.json$/.test(String(data.artifact_path || "").replace(/\\/g, "/"))) {
    fail("outline discovery artifact_path must be a safe specs/<feature>/prd/review/outline-discovery-data.json path");
  }
  if (!data.project || typeof data.project !== "object" || Array.isArray(data.project)) {
    fail("outline discovery project must be an object");
  } else {
    for (const key of ["name", "feature", "current_understanding", "discovery_goal"]) {
      if (!String(data.project[key] || "").trim()) fail(`outline discovery project is missing ${key}`);
    }
    if (String(data.artifact_path || "").replace(/\\/g, "/") !==
        `specs/${data.project.feature}/prd/review/outline-discovery-data.json`) {
      fail("outline discovery project.feature must match artifact_path");
    }
  }
  if (!Array.isArray(data.source_snapshot) || !data.source_snapshot.length) {
    fail("outline discovery source_snapshot must contain at least one source");
  } else {
    for (const [sourceIndex, source] of data.source_snapshot.entries()) {
      if (!isSafeRepositoryRelativePath(source?.path)) {
        fail(`outline discovery source_snapshot[${sourceIndex}].path must be a safe repository-relative path`);
      }
      if (!String(source?.source_type || "").trim()) {
        fail(`outline discovery source_snapshot[${sourceIndex}].source_type is required`);
      }
    }
  }

  validateOutlineDiscoveryConstitution(data);
  validateOutlineDiscoveryBusinessContext(data);
  const { mapsById, nodesById } = validateOutlineDiscoveryTopology(data);

  const groups = asArray(data.question_groups);
  if (!groups.length) fail("outline discovery question_groups must contain at least one group");
  const groupIds = new Set();
  const questionIds = new Set();
  for (const [groupIndex, group] of groups.entries()) {
    const groupLabel = `question_group[${groupIndex}]`;
    if (!String(group?.id || "").trim()) fail(`${groupLabel}: id is required`);
    else if (groupIds.has(group.id)) fail(`duplicate discovery group id ${group.id}`);
    groupIds.add(group?.id);
    for (const key of ["title", "summary"]) {
      if (!String(group?.[key] || "").trim()) fail(`${groupLabel}: ${key} is required`);
    }
    if (!mapsById.has(group?.map_id)) fail(`${groupLabel}: map_id must reference an existing map`);
    const questions = asArray(group?.questions);
    if (!questions.length) fail(`${groupLabel}: questions must contain at least one question`);
    for (const [questionIndex, question] of questions.entries()) {
      const questionLabel = `${groupLabel}:question[${questionIndex}]`;
      if (!String(question?.id || "").trim()) fail(`${questionLabel}: id is required`);
      else if (questionIds.has(question.id)) fail(`duplicate discovery question id ${question.id}`);
      questionIds.add(question?.id);
      for (const key of ["outline_node_id", "target_kind", "prompt", "context", "selection_mode", "recommendation_reason"]) {
        if (!String(question?.[key] || "").trim()) fail(`${questionLabel}: ${key} is required`);
      }
      const questionNode = nodesById.get(question?.outline_node_id);
      if (!questionNode) fail(`${questionLabel}: outline_node_id must reference an existing node`);
      else if (questionNode.map_id !== group?.map_id) fail(`${questionLabel}: outline_node_id must belong to the question group map`);
      const questionMap = questionNode ? mapsById.get(questionNode.map_id) : null;
      if (questionMap?.map_kind === "global_constraints" || Array.isArray(questionNode?.constitution_clause_refs)) {
        fail(`${questionLabel}: cannot bind a Constitution governance node`);
      }
      if (question?.selection_mode !== "single") {
        fail(`${questionLabel}: selection_mode must be single`);
      }
      const candidates = asArray(question?.candidates);
      if (candidates.length < 2 || candidates.length > 4) {
        fail(`${questionLabel}: discovery questions require 2-4 candidates`);
      }
      const candidateIds = new Set();
      for (const [candidateIndex, candidate] of candidates.entries()) {
        const candidateLabel = `${questionLabel}:candidate[${candidateIndex}]`;
        for (const key of ["id", "label", "value", "rationale"]) {
          if (!String(candidate?.[key] || "").trim()) fail(`${candidateLabel}: ${key} is required`);
        }
        if (candidateIds.has(candidate?.id)) fail(`${questionLabel}: duplicate candidate id ${candidate?.id}`);
        const businessChainIds = new Set(asArray(data.business_context?.business_chains).map((chain) => chain?.chain_id));
        if (!Array.isArray(candidate?.business_chain_refs) || !candidate.business_chain_refs.length ||
            candidate.business_chain_refs.some((id) => !businessChainIds.has(id))) {
          fail(`${candidateLabel}: business_chain_refs must reference business_context`);
        }
        candidateIds.add(candidate?.id);
      }
      const recommendations = asArray(question?.recommended_candidate_ids);
      if (recommendations.length !== 1 || recommendations.some((id) => !candidateIds.has(id))) {
        fail(`${questionLabel}: recommended_candidate_ids must reference exactly one candidate`);
      }
      if (question?.allow_none_of_the_above !== true) {
        fail(`${questionLabel}: none-of-the-above must be enabled`);
      }
      const allowedOperations = asArray(question?.free_input?.allowed_operations);
      if (question?.free_input?.enabled !== true ||
          allowedOperations.length !== 5 ||
          new Set(allowedOperations).size !== 5 ||
          allowedOperations.some((operation) => !allowedDiscoveryOperations.has(operation))) {
        fail(`${questionLabel}: free_input must enable all five discovery operations`);
      }
    }
  }
  const questionedNodeIds = new Set(groups.flatMap((group) => asArray(group?.questions).map((question) => question?.outline_node_id)));
  for (const node of asArray(data.outline_nodes)) {
    const map = mapsById.get(node.map_id);
    const childKind = mapsById.get(node.child_map_id)?.map_kind;
    const isBusinessNode = map?.map_kind === "branch" ||
      (map?.map_kind === "overview" && node.node_kind !== "root" && childKind !== "global_constraints");
    if (node?.source_status === "ai-proposed" && isBusinessNode && !questionedNodeIds.has(node.node_id)) {
      fail(`ai-proposed business node must bind a question: ${node.node_id}`);
    }
  }
}

function validateOutlineDiscoveryResponse(data) {
  if (data.schema_version !== 3) fail("outline discovery response requires schema_version 3");
  if (data.review_type !== "outline_discovery") fail("outline discovery response review_type must be outline_discovery");
  if (data.authorization_effect !== "none") fail("outline discovery response authorization_effect must be none");
  if (data.next_route !== "/sp.prd") fail("outline discovery response next_route must be /sp.prd");
  for (const key of ["response_id", "batch_id", "feature", "outline_maturity", "source_review_data", "generated_at"]) {
    if (!String(data[key] || "").trim()) fail(`outline discovery response is missing ${key}`);
  }
  if (!new Set(["explore", "frame"]).has(data.outline_maturity)) {
    fail("outline discovery response outline_maturity must be explore or frame");
  }
  const sourcePath = String(data.source_review_data || "").replace(/\\/g, "/");
  if (!isSafeRepositoryRelativePath(sourcePath) ||
      sourcePath !== `specs/${data.feature}/prd/review/outline-discovery-data.json`) {
    fail("outline discovery response source_review_data must match its feature");
  }
  let source = null;
  const resolvedSourcePath = new URL(sourcePath, `file://${process.cwd().replace(/\\/g, "/")}/`);
  try {
    source = JSON.parse(fs.readFileSync(resolvedSourcePath, "utf8"));
  } catch (error) {
    fail(`outline discovery response source data is unavailable or invalid: ${error.message}`);
  }
  if (source) {
    validateOutlineDiscovery(source);
    if (source.batch_id !== data.batch_id || source.project?.feature !== data.feature ||
        source.outline_maturity !== data.outline_maturity) {
      fail("outline discovery response identity must match its source data");
    }
  }
  const sourceMaps = new Map(asArray(source?.maps).map((map) => [map?.map_id, map]));
  const sourceNodes = new Map(asArray(source?.outline_nodes).map((node) => [node?.node_id, node]));
  const sourceQuestions = new Map(
    asArray(source?.question_groups).flatMap((group) =>
      asArray(group?.questions).map((question) => [question?.id, question]),
    ),
  );
  const constitutionClauseIds = new Set(
    asArray(source?.constitution_snapshot?.clauses).map((clause) => clause?.clause_id),
  );
  const deltas = asArray(data.deltas);
  if (!deltas.length) fail("outline discovery response deltas must contain at least one delta");
  const deltaIds = new Set();
  const questionIds = new Set();
  for (const [index, delta] of deltas.entries()) {
    const label = `discovery delta[${index}]`;
    if (!String(delta?.delta_id || "").trim()) fail(`${label}: delta_id is required`);
    else if (deltaIds.has(delta.delta_id)) fail(`duplicate delta_id ${delta.delta_id}`);
    deltaIds.add(delta?.delta_id);
    for (const key of ["question_id", "outline_node_id", "target_kind"]) {
      if (!String(delta?.[key] || "").trim()) fail(`${label}: ${key} is required`);
    }
    const sourceQuestion = sourceQuestions.get(delta?.question_id);
    const sourceNode = sourceNodes.get(delta?.outline_node_id);
    if (!sourceQuestion || sourceQuestion.outline_node_id !== delta?.outline_node_id ||
        sourceQuestion.target_kind !== delta?.target_kind) {
      fail(`${label}: question and node must match source discovery data`);
    }
    if (sourceMaps.get(sourceNode?.map_id)?.map_kind === "global_constraints" ||
        Array.isArray(sourceNode?.constitution_clause_refs) ||
        constitutionClauseIds.has(delta?.target_id) || /^constitution(?:-|$)/i.test(String(delta?.target_id || ""))) {
      fail(`${label}: Constitution content is read-only and cannot be a discovery target`);
    }
    if (questionIds.has(delta?.question_id)) fail(`${label}: question_id occurs more than once`);
    questionIds.add(delta?.question_id);
    if (!allowedDiscoveryOperations.has(delta?.operation)) fail(`${label}: unsupported operation ${delta?.operation}`);
    if (!new Set(["user", "user-confirmed"]).has(delta?.source_tag)) fail(`${label}: invalid source_tag`);
    if (!(typeof delta?.supersedes_delta_id === "string" || delta?.supersedes_delta_id === null)) {
      fail(`${label}: supersedes_delta_id must be string or null`);
    }
    const hasCandidate = Boolean(String(delta?.candidate_id || "").trim());
    const hasTarget = Boolean(String(delta?.target_id || "").trim());
    const hasValue = Boolean(String(delta?.value || "").trim());
    const none = delta?.none_of_the_above === true;
    if (delta?.operation === "confirm_candidate" &&
        (!hasCandidate || hasTarget || !hasValue || none || delta?.source_tag !== "user-confirmed")) {
      fail(`${label}: operation confirm_candidate has conflicting fields`);
    }
    if (delta?.operation === "add" && (hasCandidate || hasTarget || !hasValue || delta?.source_tag !== "user")) {
      fail(`${label}: operation add has conflicting fields`);
    }
    if (delta?.operation === "replace" &&
        (hasCandidate || !hasTarget || !hasValue || none || delta?.source_tag !== "user")) {
      fail(`${label}: operation replace has conflicting fields`);
    }
    if (delta?.operation === "exclude" &&
        (hasCandidate === hasTarget || none || delta?.source_tag !== "user")) {
      fail(`${label}: operation exclude has conflicting fields`);
    }
    if (delta?.operation === "context_note" &&
        (hasCandidate || hasTarget || !hasValue || none || delta?.source_tag !== "user")) {
      fail(`${label}: operation context_note has conflicting fields`);
    }
  }
}

function validateOutlineIntentLedger(data) {
  if (data.schema_version !== 3) fail("outline intent ledger requires schema_version 3");
  if (!String(data.feature || "").trim()) fail("outline intent ledger feature is required");
  if (!Array.isArray(data.events)) fail("outline intent ledger events must be an array");
  const earlierIds = new Set();
  for (const [index, event] of asArray(data.events).entries()) {
    const label = `intent event[${index}]`;
    if (!String(event?.delta_id || "").trim()) fail(`${label}: delta_id is required`);
    else if (earlierIds.has(event.delta_id)) fail(`duplicate delta_id ${event.delta_id}`);
    if (event?.supersedes_delta_id && !earlierIds.has(event.supersedes_delta_id)) {
      fail(`${label}: supersedes_delta_id must reference an earlier event`);
    }
    for (const key of ["response_id", "target_kind", "operation", "source_tag", "recorded_at"]) {
      if (!String(event?.[key] ?? "").trim()) fail(`${label}: ${key} is required`);
    }
    if (!(typeof event?.outline_node_id === "string" || event?.outline_node_id === null)) {
      fail(`${label}: outline_node_id must be string or null`);
    }
    if (!new Set(["explore", "frame"]).has(event?.maturity)) fail(`${label}: maturity must be explore or frame`);
    if (!allowedDiscoveryOperations.has(event?.operation)) fail(`${label}: unsupported operation ${event?.operation}`);
    if (!new Set(["user", "user-confirmed"]).has(event?.source_tag)) fail(`${label}: invalid source_tag`);
    const hasCandidate = Boolean(String(event?.candidate_id || "").trim());
    const hasTarget = Boolean(String(event?.target_id || "").trim());
    const hasValue = Boolean(String(event?.value || "").trim());
    if (event?.operation !== "exclude" && !hasValue) fail(`${label}: value is required`);
    if (event?.operation === "confirm_candidate" &&
        (!hasCandidate || hasTarget || event?.source_tag !== "user-confirmed")) {
      fail(`${label}: operation confirm_candidate has conflicting fields`);
    }
    if (event?.operation === "add" && (hasCandidate || hasTarget || event?.source_tag !== "user")) {
      fail(`${label}: operation add has conflicting fields`);
    }
    if (event?.operation === "replace" &&
        (hasCandidate || !hasTarget || event?.source_tag !== "user")) {
      fail(`${label}: operation replace has conflicting fields`);
    }
    if (event?.operation === "exclude" &&
        (hasCandidate === hasTarget || event?.source_tag !== "user")) {
      fail(`${label}: operation exclude has conflicting fields`);
    }
    if (event?.operation === "context_note" &&
        (hasCandidate || hasTarget || event?.source_tag !== "user")) {
      fail(`${label}: operation context_note has conflicting fields`);
    }
    earlierIds.add(event?.delta_id);
  }
}

function validate(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail("review data must be a JSON object");
    return;
  }

  if (data.format === "speccompass-outline-intent-ledger") {
    validateOutlineIntentLedger(data);
    return;
  }
  if (data.format === "speccompass-outline-discovery-response") {
    validateOutlineDiscoveryResponse(data);
    return;
  }
  if (data.review_type === "outline_discovery") {
    validateOutlineDiscovery(data);
    return;
  }

  validateNoForbiddenReviewDataKeys("review-data", data);
  validateNoEmbeddedPageCodeInValues("review-data", data);
  validateCurrentConfirmationVocabulary("review-data", data);
  if (data.review_type === "outline") validateNoOutlineDownstreamDesign("review-data", data);
  validateKnownKeys("review-data", data, allowedTopLevelKeys);

  if (!supportedSchemaVersions.has(data.schema_version)) {
    fail(`schema_version must be one of ${Array.from(supportedSchemaVersions).join(", ")}`);
  }

  if (!allowedReviewTypes.has(data.review_type)) {
    fail("review_type must be flow, ui, or outline");
  }
  if (data.review_type === "outline" && data.schema_version !== 2) {
    fail("outline review data requires schema_version 2");
  }

  for (const key of ["schema_version", "artifact_path", "confirm_strategy", "batch_id", "project", "source_snapshot", "modules"]) {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      fail(`missing ${key}`);
    }
  }

  if (data.review_type === "outline") {
    for (const key of ["outline_source_path", "outline_digest", "source_authority_ids"]) {
      if (data[key] === undefined || data[key] === null || data[key] === "") fail(`missing ${key}`);
    }
    if (!isSafeRepositoryRelativePath(data.artifact_path)) {
      fail("outline artifact_path must be a safe repository-relative path");
    } else if (!/^specs\/[^/]+\/prd\/review\/outline-review-data\.json$/.test(String(data.artifact_path || "").replace(/\\/g, "/"))) {
      fail("outline artifact_path must end with prd/review/outline-review-data.json");
    }
    if (!isSafeRepositoryRelativePath(data.outline_source_path)) {
      fail("outline_source_path must be a safe repository-relative path");
    } else if (!/^specs\/[^/]+\/spec-outline\.md$/.test(String(data.outline_source_path || "").replace(/\\/g, "/"))) {
      fail("outline_source_path must end with spec-outline.md");
    }
    if (!/^(?:sha256:)?[0-9a-f]{64}$/i.test(String(data.outline_digest || ""))) {
      fail("outline_digest must be a SHA-256 digest");
    }
    const authorityIds = asArray(data.source_authority_ids);
    if (!authorityIds.length || authorityIds.some((id) => typeof id !== "string" || !id.trim())) {
      fail("source_authority_ids must contain at least one non-empty authority id");
    }
    if (new Set(authorityIds).size !== authorityIds.length) {
      fail("source_authority_ids must not contain duplicates");
    }
  }

  if (!allowedConfirmStrategies.has(data.confirm_strategy)) {
    fail("confirm_strategy must be batch, hybrid, or rolling");
  }

  if (!Array.isArray(data.source_snapshot) || !data.source_snapshot.length) {
    fail("source_snapshot must contain at least one source");
  }

  if (!data.project || typeof data.project !== "object") {
    fail("project must be an object");
  } else {
    const requiredProjectKeys = data.review_type === "flow" || data.review_type === "outline"
      ? ["name", "feature", "business_overview", "review_goal"]
      : ["name", "feature", "business_overview"];
    for (const key of requiredProjectKeys) {
      if (!data.project[key]) {
        fail(`project is missing ${key}`);
      }
    }
    if (data.review_type !== "outline") validateReadableCopy("project", data.project);
    if (data.review_type === "flow") {
      validateFlowContextCopy("project", data.project.business_overview, "business_overview");
      validateFlowContextCopy("project", data.project.review_goal, "review_goal");
    }
    validateKnownKeys("project", data.project, allowedProjectKeys);
  }

  asArray(data.source_snapshot).forEach((source, index) => {
    validateKnownKeys(`source_snapshot[${index}]`, source, allowedSourceSnapshotKeys);
  });

  const modules = asArray(data.modules);
  if (!modules.length) {
    fail("modules must contain at least one module");
  }

  const moduleIds = new Set();
  const globalNodeIds = new Set();
  const outlineAuthorityIds = new Set();
  const outlineViewTypeCounts = new Map(Array.from(allowedOutlineViewTypes, (viewType) => [viewType, 0]));
  modules.forEach((module, moduleIndex) => {
    const moduleLabel = module.id || `module-${moduleIndex + 1}`;
    if (!module.id) {
      fail(`${moduleLabel}: module id is required`);
    } else if (moduleIds.has(module.id)) {
      fail(`duplicate module id ${module.id}`);
    }
    moduleIds.add(module.id);
    validateKnownKeys(moduleLabel, module, allowedModuleKeys);

    for (const key of ["title", "summary"]) {
      if (!module[key]) {
        fail(`${moduleLabel}: missing ${key}`);
      }
    }
    validateEnum(moduleLabel, "review_layer", module.review_layer, allowedModuleReviewLayers);
    if (data.review_type !== "outline") validateReadableCopy(moduleLabel, module);
    if (data.review_type === "flow") {
      validateFlowContextCopy(moduleLabel, module.summary, "module summary");
    }

    const itemsKey = data.review_type === "flow" ? "diagrams" : data.review_type === "ui" ? "screens" : "views";
    const wrongItemsKeys = ["diagrams", "screens", "views"].filter((key) => key !== itemsKey);
    for (const wrongItemsKey of wrongItemsKeys) {
      if (Object.prototype.hasOwnProperty.call(module, wrongItemsKey)) {
        const detail = data.review_type === "outline" ? "outline downstream design detail" : "review contract mismatch";
        fail(`${moduleLabel}: ${detail}; ${data.review_type} review data must not use ${wrongItemsKey}`);
      }
    }
    const items = asArray(module[itemsKey]);
    if (!items.length) {
      fail(`${moduleLabel}: ${data.review_type} review data requires ${itemsKey}`);
    }

    const itemIds = new Set();
    items.forEach((item, itemIndex) => {
      if (item.id) {
        if (itemIds.has(item.id)) {
          fail(`${moduleLabel}: duplicate item id ${item.id}`);
        }
        itemIds.add(item.id);
      }
      validateItem(data.review_type, data.schema_version, module, item, itemIndex, globalNodeIds, outlineAuthorityIds);
      if (data.review_type === "outline") {
        if (outlineViewTypeCounts.has(item.view_type)) {
          outlineViewTypeCounts.set(item.view_type, outlineViewTypeCounts.get(item.view_type) + 1);
        }
        if (item.source_path !== data.outline_source_path) {
          fail(`${moduleLabel}:${item.id || `item-${itemIndex + 1}`}: source_path must match outline_source_path`);
        }
      }
      if (data.review_type === "flow") {
        validateFlowContextCopy(`${moduleLabel}:${item.id || `item-${itemIndex + 1}`}`, item.summary, "flow summary");
      }
    });
  });

  if (data.review_type === "outline") {
    for (const viewType of allowedOutlineViewTypes) {
      const count = outlineViewTypeCounts.get(viewType);
      if (count !== 1) fail(`outline view_type ${viewType} must occur exactly once; found ${count}`);
    }
    const declaredAuthorityIds = new Set(asArray(data.source_authority_ids));
    const missingFromView = [...declaredAuthorityIds].filter((id) => !outlineAuthorityIds.has(id));
    const missingFromMetadata = [...outlineAuthorityIds].filter((id) => !declaredAuthorityIds.has(id));
    if (missingFromView.length || missingFromMetadata.length) {
      fail(`source_authority_ids must exactly match readiness_authority source_authorities (metadata-only: ${missingFromView.join(", ") || "none"}; view-only: ${missingFromMetadata.join(", ") || "none"})`);
    }
  }

  if (data.schema_version === 2) {
    const itemsKey = data.review_type === "flow" ? "diagrams" : data.review_type === "ui" ? "screens" : "views";
    const actionableNodes = modules.flatMap((module) =>
      asArray(module[itemsKey]).flatMap((item) => asArray(item.nodes).filter(hasDecisionOptions))
    );
    const criticalCount = actionableNodes.filter((node) => node.confirmation_priority === "critical").length;
    const cap = criticalPriorityCap(actionableNodes.length);
    if (criticalCount > cap) {
      fail(`critical priority count ${criticalCount} exceeds cap ${cap} for ${actionableNodes.length} actionable nodes`);
    }
  }
}

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(reviewDataPath, "utf8"));
} catch (error) {
  console.error(`review data JSON parse failed: ${error.message}`);
  process.exit(1);
}

validate(parsed);

for (const message of warnings) {
  console.warn(`warning: ${message}`);
}

if (errors.length) {
  console.error("review data validation failed:");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(`review data validation passed: ${reviewDataPath}`);
