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
const allowedReviewTypes = new Set(["flow", "ui"]);
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
const legacyConfirmationValues = new Set(["APPROVED", "REJECTED"]);
const supportedSchemaVersion = 1;
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

function hasSubstantialText(value) {
  return typeof value === "string" && value.replace(/\s+/g, "").length >= 18;
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
  if (options.length < 2 || options.length > 4) {
    fail(`${scope}: ${reviewType} human_judgment nodes require 2-4 executable options; ordinary human-judgment nodes default to 3 options`);
    return;
  }
  if (node.review_level === "must_confirm" && reviewType !== "flow" && (options.length < 3 || options.length > 4)) {
    fail(`${scope}: UI must_confirm nodes require 3-4 options`);
  }
  if (options.length === 2 && (reviewType === "flow" || node.review_level !== "must_confirm") && !hasSubstantialText(node.options_count_rationale)) {
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

function validateItem(reviewType, module, item, itemIndex, globalNodeIds) {
  const itemLabel = `${module.id || "module"}:${item.id || `item-${itemIndex + 1}`}`;
  const nodes = asArray(item.nodes);
  const edges = asArray(item.edges);
  const nodeIds = new Set();

  validateKnownKeys(itemLabel, item, allowedReviewItemKeys);
  if (reviewType === "flow") {
    for (const key of uiOnlyReviewItemKeys) {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        fail(`${itemLabel}: flow review data must not use ${key}; keep Flow and UI review contracts separate`);
      }
    }
  }
  validateReadableCopy(itemLabel, item);

  if (!item.id) fail(`${itemLabel}: item id is required`);
  if (!item.title) fail(`${itemLabel}: item title is required`);
  if (!item.summary) fail(`${itemLabel}: item summary is required`);
  if (!item.source_path) fail(`${itemLabel}: item source_path is required`);
  if (reviewType === "flow") {
    validateEnum(itemLabel, "item_type", item.item_type, allowedFlowItemTypes);
  } else {
    validateEnum(itemLabel, "item_type", item.item_type, allowedUiItemTypes);
    validateUiScreenContext(itemLabel, item);
    validateUiScreenStructure(itemLabel, item);
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

    if (node.review_layer === "system_arch" || node.review_level === "system_arch") {
      const systemRouteText = `${node.owner || ""} ${node.plain_summary || ""} ${node.action_prompt || ""}`;
      if (/产品经理/.test(node.owner || "")) {
        fail(`${nodeLabel}: system_arch nodes must not route owner to 产品经理`);
      }
      if (!/(系统|架构)/.test(systemRouteText) || !/(无需产品确认|无需产品经理确认|不需要产品确认|不需要产品经理确认)/.test(systemRouteText)) {
        fail(`${nodeLabel}: system_arch nodes must route to a system/architecture owner and say 无需产品确认`);
      }
    }

    validateReadableCopy(nodeLabel, node);
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

function validate(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail("review data must be a JSON object");
    return;
  }

  validateNoForbiddenReviewDataKeys("review-data", data);
  validateNoEmbeddedPageCodeInValues("review-data", data);
  validateCurrentConfirmationVocabulary("review-data", data);
  validateKnownKeys("review-data", data, allowedTopLevelKeys);

  if (data.schema_version !== supportedSchemaVersion) {
    fail(`schema_version must be ${supportedSchemaVersion}`);
  }

  if (!allowedReviewTypes.has(data.review_type)) {
    fail("review_type must be flow or ui");
  }

  for (const key of ["schema_version", "artifact_path", "confirm_strategy", "batch_id", "project", "source_snapshot", "modules"]) {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      fail(`missing ${key}`);
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
    const requiredProjectKeys = data.review_type === "flow"
      ? ["name", "feature", "business_overview", "review_goal"]
      : ["name", "feature", "business_overview"];
    for (const key of requiredProjectKeys) {
      if (!data.project[key]) {
        fail(`project is missing ${key}`);
      }
    }
    validateReadableCopy("project", data.project);
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
    validateReadableCopy(moduleLabel, module);
    if (data.review_type === "flow") {
      validateFlowContextCopy(moduleLabel, module.summary, "module summary");
    }

    const itemsKey = data.review_type === "flow" ? "diagrams" : "screens";
    const wrongItemsKey = data.review_type === "flow" ? "screens" : "diagrams";
    if (module[wrongItemsKey]) {
      fail(`${moduleLabel}: ${data.review_type} review data must not use ${wrongItemsKey}`);
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
      validateItem(data.review_type, module, item, itemIndex, globalNodeIds);
      if (data.review_type === "flow") {
        validateFlowContextCopy(`${moduleLabel}:${item.id || `item-${itemIndex + 1}`}`, item.summary, "flow summary");
      }
    });
  });
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
