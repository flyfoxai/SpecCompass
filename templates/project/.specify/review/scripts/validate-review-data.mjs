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
  "当前依据和风险边界看起来正确",
  "可按推荐保留",
  "当前节点需要补充业务决策",
  "责任人或风险口径",
  "后续完善相关内容",
  "当前资料还不能判断",
  "需求已经覆盖这个业务判断",
  "后续界面和计划可以按当前路径继续",
  "影响范围限制在当前流程或界面的局部内容",
  "按当前规则推进",
  "待后续补充相关内容",
  "后续再完善相关内容"
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

function containsBoilerplateOptionCopy(value) {
  const text = String(value || "");
  return boilerplateOptionCopyFragments.some((fragment) => text.includes(fragment));
}

function validateOptionHumanCopy(scope, option) {
  const label = compactText(option.label);
  if (genericOptionLabels.has(label.toLowerCase()) || /^方案[a-d]$/i.test(label) || /^选项[a-d]$/i.test(label)) {
    fail(`${scope}: option ${option.id} label is too generic; name the real business action`);
  }

  for (const key of ["label", "when_to_choose", "consequence", "project_impact"]) {
    if (containsBoilerplateOptionCopy(option[key])) {
      fail(`${scope}: option ${option.id} contains boilerplate option copy in ${key}; explain the real background, action, and impact`);
    }
  }

  if (!hasSubstantialText(option.when_to_choose)) {
    fail(`${scope}: option ${option.id} when_to_choose must explain the business background in plain language`);
  }
  if (!hasSubstantialText(option.consequence)) {
    fail(`${scope}: option ${option.id} consequence must describe the concrete action after selection`);
  }
  if (!hasSubstantialText(option.project_impact) || !hasConcreteImpactSignal(option.project_impact)) {
    fail(`${scope}: option ${option.id} project_impact must name a concrete downstream impact`);
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

function validateOptions(scope, node) {
  if (!hasDecisionOptions(node)) {
    return;
  }

  const options = asArray(node.options);
  if (options.length < 2 || options.length > 4) {
    fail(`${scope}: human_judgment nodes require tiered executable options: must_confirm nodes require 3-4 options; ordinary human-judgment nodes default to 3 options; low-risk binary choices need options_count_rationale`);
    return;
  }
  if (node.review_level === "must_confirm" && (options.length < 3 || options.length > 4)) {
    fail(`${scope}: must_confirm nodes require 3-4 options`);
  }
  if (options.length === 2 && node.review_level !== "must_confirm" && !hasSubstantialText(node.options_count_rationale)) {
    fail(`${scope}: options_count_rationale is required when a human-judgment node uses only 2 options`);
  }

  const ids = new Set();
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
    for (const key of ["label", "when_to_choose", "consequence", "project_impact", "next_exit"]) {
      const value = option[key];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        fail(`${scope}: option ${option.id} is missing ${key}`);
      }
    }
    if (isVagueActionExit(option.label) || isVagueActionExit(option.next_exit)) {
      fail(`${scope}: option ${option.id} must use an actionable exit, not approve/defer/reject/block labels`);
    }
    validateOptionHumanCopy(scope, option);
    if (option.id === "OPTION_B" && !String(option.next_exit || "").trim().toLowerCase().startsWith("needs-decision")) {
      fail(`${scope}: OPTION_B.next_exit must start with needs-decision`);
    }
  }

  if (!node.recommended_option) {
    fail(`${scope}: missing recommended_option`);
    return;
  }

  if (!ids.has(node.recommended_option)) {
    fail(`${scope}: recommended_option ${node.recommended_option} does not match an option id`);
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

function validateItem(reviewType, module, item, itemIndex, globalNodeIds) {
  const itemLabel = `${module.id || "module"}:${item.id || `item-${itemIndex + 1}`}`;
  const nodes = asArray(item.nodes);
  const edges = asArray(item.edges);
  const nodeIds = new Set();

  validateKnownKeys(itemLabel, item, allowedReviewItemKeys);
  validateReadableCopy(itemLabel, item);

  if (!item.id) fail(`${itemLabel}: item id is required`);
  if (!item.title) fail(`${itemLabel}: item title is required`);
  if (!item.summary) fail(`${itemLabel}: item summary is required`);
  if (!item.source_path) fail(`${itemLabel}: item source_path is required`);
  if (reviewType === "flow") {
    validateEnum(itemLabel, "item_type", item.item_type, allowedFlowItemTypes);
  } else {
    validateEnum(itemLabel, "item_type", item.item_type, allowedUiItemTypes);
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
    validateOptions(nodeLabel, node);
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
    for (const key of ["name", "feature", "business_overview"]) {
      if (!data.project[key]) {
        fail(`project is missing ${key}`);
      }
    }
    validateReadableCopy("project", data.project);
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
