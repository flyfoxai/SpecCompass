#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

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
const allowedUiPreviewViewports = new Set(["desktop", "tablet", "mobile"]);
const allowedUiButtonVariants = new Set(["primary", "secondary", "danger", "ghost"]);
const allowedUiBadgeTones = new Set(["neutral", "info", "success", "warning", "danger"]);
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
  layer_balance_min_nodes: 8,
  max_layer_share: 0.6,
});
const outlineDiscoveryOverviewSafetyLimit = 64;
const allowedOutlineMapKinds = new Set(["overview", "branch", "global_constraints", "value_stream"]);
const allowedOutlineNodeKinds = new Set([
  "root", "goal", "role", "domain", "scope", "problem", "scenario",
  "capability", "acceptance", "risk", "constraint", "map_link",
]);
const allowedOutlineSourceStatuses = new Set(["user", "user-confirmed", "doc", "ai-proposed", "unresolved"]);
const supportedOutlineDiscoverySchemaVersions = new Set([3, 4, 5, 6]);
const allowedAggregationAuthorities = new Set(["doc", "user", "user-confirmed"]);
const allowedAggregationBasisKeys = new Set([
  "authority", "shared_business_goal", "shared_lifecycle_or_owner",
  "split_acceptance_harm", "source_refs",
]);
const allowedBusinessChainKinds = new Set(["primary", "recovery", "governance"]);
const allowedBusinessTriggerKinds = new Set(["business_event", "exception_or_interruption", "governance_change"]);
const triggerKindByChainKind = new Map([
  ["primary", "business_event"],
  ["recovery", "exception_or_interruption"],
  ["governance", "governance_change"],
]);
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
  "boundary_adjustment",
  "schema_notes"
]);
const allowedBoundaryAdjustmentKeys = new Set([
  "operation", "proposal_id", "proposal_digest", "base_baseline_id", "base_baseline_digest",
  "impact_preview_digest", "initiated_by", "change_class", "affected_feature_codes",
  "proposal_path", "impact_preview_path", "decision_path", "writer_ledger_path",
  "decision_target_ref"
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
  "preview_viewport",
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
  "preview_viewport",
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
  "future_behavior_note",
  "display"
]);
const allowedUiComponentDisplayKeys = new Set([
  "value",
  "placeholder",
  "helper_text",
  "options",
  "columns",
  "rows",
  "button_variant",
  "badge_tone"
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

// 通用能力原子标签模式（不允许）
const vagueCapabilityAtomPatterns = [
  // 空洞动词 + 泛化名词
  /^处理[^的]*$/,
  /^管理[^的]*$/,
  /^执行[^的]*$/,
  /^维护[^的]*$/,
  /^组织[^的]*$/,
  /^协调[^的]*$/,
  /^handle\s+[a-z\s]+$/i,
  /^manage\s+[a-z\s]+$/i,
  /^execute\s+[a-z\s]+$/i,
  /^process\s+[a-z\s]+$/i,

  // 元认知表达
  /业务对象|业务处理|业务流程|业务逻辑/,
  /系统功能|系统能力|系统模块/,
  /数据处理|数据管理|数据维护/,

  // 过于泛化的名词（没有具体领域含义）
  /^[^具体领域词汇]{0,6}(中心|平台|系统|模块|服务|引擎)$/,
];

// 通用状态描述模式（不允许）
const vagueStatePatterns = [
  /^[^→>]{0,10}状态$/,           // 只说"状态"，没有具体内容
  /^业务状态$/,
  /^数据状态$/,
  /^系统状态$/,
  /^state$/i,
  /^business\s+state$/i,
  /^data\s+state$/i,
];

// 通用触发器描述模式（不允许）
const vagueTriggerPatterns = [
  /^用户操作$/,
  /^业务事件$/,
  /^系统事件$/,
  /^外部触发$/,
  /^user\s+action$/i,
  /^business\s+event$/i,
  /^system\s+event$/i,
];

// 通用交接描述模式（不允许）
const vagueHandoffPatterns = [
  /^传递给下游$/,
  /^发送给.*系统$/,
  /^推送给.*模块$/,
  /^pass\s+to\s+downstream$/i,
  /^send\s+to\s+[a-z\s]+system$/i,
];

// 通用业务对象描述模式（不允许）
const vagueBusinessObjectPatterns = [
  /^数据$/,
  /^信息$/,
  /^对象$/,
  /^实体$/,
  /^业务数据$/,
  /^业务对象$/,
  /^data$/i,
  /^information$/i,
  /^object$/i,
  /^entity$/i,
];

// 密度合并话术黑名单 - 初始 Level 1 禁止出现
const densityMergeBoilerplateFragments = [
  "为满足 level 1 图的可读密度",
  "为满足level1图的可读密度",
  "为保持图形可读",
  "为满足密度预算",
  "为满足可读密度",
  "当前只提出三个候选",
  "当前只提出两个候选",
  "当前只提出四个候选",
  "压缩为三个候选",
  "合并为三个分支",
  "压缩候选数量",
  "reduce candidate count",
  "for readability",
  "for density budget",
  "to keep the map readable",
  "reduced for density",
  "merged for density",
  "limited to three candidates",
];

function hasDensityMergeBoilerplate(text) {
  const normalized = (text || "").toLowerCase().replace(/\s+/g, " ");
  return densityMergeBoilerplateFragments.some(fragment =>
    normalized.includes(fragment.toLowerCase())
  );
}

const aggregateAtomLabelWarnings = [
  "闭环", "治理", "观测", "平台", "能力体系", "核心链路", "主链路", "全链路", "整合", "集成",
  "core loop", "governance", "observability platform"
];

function warnIfAtomTooCoarse(atomLabel, atom, data) {
  if (data.outline_maturity !== "explore") return;
  const hasMultipleOps = (atom.operation_refs?.length ?? 0) > 1;
  const hasMultipleObjs = (atom.object_refs?.length ?? 0) > 1;
  const labelHasAggregateWord = aggregateAtomLabelWarnings.some(w =>
    (atom.label ?? "").toLowerCase().includes(w.toLowerCase())
  );
  if (hasMultipleOps && hasMultipleObjs && labelHasAggregateWord) {
    const message = `${atomLabel}: label "${atom.label}" with multiple operations and objects looks like a pre-merged capability group; split independently verifiable responsibilities before grouping Outline units`;
    if (data.schema_version >= 6) fail(message);
    else warn(message);
  }
}

function looksLikeCompoundResponsibility(value) {
  const text = compactText(value);
  const punctuationCount = (text.match(/[、,，;；]/g) || []).length;
  const conjunctionCount = (text.match(/(?:与|和|及|以及|\band\b)/gi) || []).length;
  return punctuationCount + conjunctionCount >= 2;
}

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

function canonicalOutlineDiscoveryProjectRoot(data) {
  const artifactPath = String(data?.artifact_path || "").replace(/\\/g, "/");
  const absoluteReviewPath = path.resolve(reviewDataPath).replace(/\\/g, "/");
  const suffix = `/${artifactPath}`;
  if (!artifactPath || !absoluteReviewPath.endsWith(suffix)) return null;
  return absoluteReviewPath.slice(0, -suffix.length);
}

function markdownHeadingSet(source) {
  const headings = new Set();
  for (const line of String(source || "").split(/\r?\n/)) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (match) headings.add(match[1].trim());
  }
  return headings;
}

function markdownSectionMap(source) {
  const text = String(source || "");
  const matches = [...text.matchAll(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm)];
  const sections = new Map();
  for (const [index, match] of matches.entries()) {
    const level = match[1].length;
    const next = matches.slice(index + 1).find((candidate) => candidate[1].length <= level);
    sections.set(match[2].trim(), text.slice(match.index + match[0].length, next?.index ?? text.length));
  }
  return sections;
}

function sourceStatusExceedsEvidence(sourceStatus, evidenceStatuses) {
  if (evidenceStatuses.includes("unresolved")) return sourceStatus !== "unresolved";
  if (evidenceStatuses.includes("ai-proposed")) {
    return !new Set(["ai-proposed", "unresolved"]).has(sourceStatus);
  }
  return false;
}

function markdownOutlineMetadata(source) {
  const text = String(source || "");
  const maturity = text.match(/\|\s*Outline Maturity\s*\|\s*`?(explore|frame|specify_ready)`?\s*\|/i)
    || text.match(/^Outline Maturity:\s*`?(explore|frame|specify_ready)`?\s*$/im);
  const reviewLevel = text.match(/\|\s*Review Level\s*\|\s*Level\s*([123])\b/i);
  return {
    outlineMaturity: maturity?.[1]?.toLowerCase() || null,
    reviewLevel: reviewLevel ? Number(reviewLevel[1]) : null,
  };
}

function validateOutlineDiscoveryProjectAuthority(data) {
  const projectRoot = canonicalOutlineDiscoveryProjectRoot(data);
  if (!projectRoot) {
    warn("outline discovery was validated outside its declared artifact_path; project authority and Markdown anchors were not checked");
    return;
  }

  const feature = String(data.project?.feature || "");
  const featureCode = feature.match(/^([0-9]{3,})(?:-|$)/)?.[1] || null;
  const reviewIndexPath = path.join(projectRoot, "specs", "review-index.json");
  if (fs.existsSync(reviewIndexPath)) {
    try {
      const reviewIndex = JSON.parse(fs.readFileSync(reviewIndexPath, "utf8"));
      const featureEntry = asArray(reviewIndex.features).find((entry) => entry?.feature === feature);
      if (!featureEntry) fail(`outline discovery feature ${feature} is missing from specs/review-index.json`);
      else if (featureCode && String(featureEntry.feature_code || "") !== featureCode) {
        fail(`outline discovery feature code ${featureCode} does not match specs/review-index.json`);
      }
    } catch (error) {
      fail(`outline discovery could not read specs/review-index.json: ${error.message}`);
    }
  }

  const sourceSectionsByPath = new Map();
  for (const source of asArray(data.source_snapshot)) {
    const sourcePath = path.join(projectRoot, String(source?.path || ""));
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      fail(`outline discovery source_snapshot path does not exist: ${source?.path || "<empty>"}`);
      continue;
    }
    if (!/\.md$/i.test(sourcePath)) continue;
    const markdown = fs.readFileSync(sourcePath, "utf8");
    const headings = markdownHeadingSet(markdown);
    sourceSectionsByPath.set(String(source.path).replace(/\\/g, "/"), markdownSectionMap(markdown));
    for (const anchor of asArray(source?.anchors)) {
      if (!headings.has(String(anchor || "").trim())) {
        fail(`outline discovery source anchor does not exist in ${source.path}: ${anchor}`);
      }
    }
  }

  const proposalEvidenceRefs = (refs) => asArray(refs).filter((ref) => {
    const normalized = String(ref || "").replace(/\\/g, "/");
    const hash = normalized.indexOf("#");
    if (hash === -1) return false;
    const section = sourceSectionsByPath.get(normalized.slice(0, hash))?.get(normalized.slice(hash + 1));
    return /\[src:ai-proposed\]/i.test(section || "");
  });
  const validateQuotedDocumentEvidence = (entry, label, { requireNamedLabel = false } = {}) => {
    if (data.schema_version < 6 || entry?.source_status !== "doc") return;
    const evidenceRef = String(entry?.evidence_ref || "").replace(/\\/g, "/");
    const evidenceQuote = compactText(entry?.evidence_quote);
    if (!evidenceRef || evidenceQuote.length < 8) {
      fail(`${label} with source_status doc requires evidence_ref and a verbatim evidence_quote`);
      return;
    }
    if (!asArray(entry?.source_refs).map((ref) => String(ref || "").replace(/\\/g, "/")).includes(evidenceRef)) {
      fail(`${label}.evidence_ref must also appear in source_refs`);
      return;
    }
    const hash = evidenceRef.indexOf("#");
    if (hash === -1) {
      fail(`${label}.evidence_ref must cite an exact Markdown heading`);
      return;
    }
    const section = sourceSectionsByPath.get(evidenceRef.slice(0, hash))?.get(evidenceRef.slice(hash + 1));
    if (!section || !compactText(section).includes(evidenceQuote)) {
      fail(`${label}.evidence_quote must occur verbatim in the evidence_ref Markdown section`);
      return;
    }
    if (requireNamedLabel && !evidenceQuote.includes(compactText(entry?.label))) {
      fail(`${label}.evidence_quote must contain the source-named label; inferred umbrella ownership must be ai-proposed`);
    }
  };
  const featurePrdPath = `specs/${feature}/prd.md`;
  const validateEntryAuthority = (entry, label) => {
    if (!entry?.source_status || new Set(["ai-proposed", "unresolved"]).has(entry.source_status)) return;
    const unanchoredFeaturePrdRef = asArray(entry.source_refs).find((ref) => {
      const normalized = String(ref || "").replace(/\\/g, "/");
      return normalized === featurePrdPath;
    });
    if (unanchoredFeaturePrdRef) {
      fail(`${label} cannot claim source_status ${entry.source_status} from the whole feature PRD; cite an exact Markdown heading so proposal authority cannot be promoted: ${unanchoredFeaturePrdRef}`);
    }
    const proposalRefs = proposalEvidenceRefs(entry.source_refs);
    if (proposalRefs.length) {
      fail(`${label} cannot claim source_status ${entry.source_status}; referenced Markdown section contains [src:ai-proposed]: ${proposalRefs[0]}`);
    }
  };
  validateEntryAuthority(data.business_context?.product_subject, "business product_subject");
  for (const [key, value] of Object.entries(data.business_context || {})) {
    if (!Array.isArray(value)) continue;
    value.forEach((entry, index) => validateEntryAuthority(entry, `business_context.${key}[${index}]`));
  }
  asArray(data.outline_nodes).forEach((node) => validateEntryAuthority(node, `outline node ${node.node_id}`));
  asArray(data.business_context?.responsibility_owners).forEach((owner, index) => {
    validateQuotedDocumentEvidence(owner, `business_context.responsibility_owners[${index}]`, { requireNamedLabel: true });
  });
  asArray(data.business_context?.business_lifecycles).forEach((lifecycle, index) => {
    validateQuotedDocumentEvidence(lifecycle, `business_context.business_lifecycles[${index}]`, { requireNamedLabel: true });
  });
  asArray(data.decomposition_window?.units).forEach((unit, index) => {
    validateEntryAuthority(unit, `decomposition unit[${index}]`);
    validateEntryAuthority(unit?.decomposition_basis, `decomposition unit[${index}] decomposition_basis`);
    validateEntryAuthority(unit?.terminal_basis, `decomposition unit[${index}] terminal_basis`);
    if (unit?.grouping_basis) {
      validateEntryAuthority(
        { ...unit.grouping_basis, source_status: unit.grouping_basis.authority },
        `decomposition unit[${index}] grouping_basis`,
      );
      asArray(unit.grouping_basis.coupling_invariants).forEach((invariant, invariantIndex) => {
        validateEntryAuthority(invariant, `decomposition unit[${index}] coupling_invariants[${invariantIndex}]`);
        if (unit?.project_depth > 0) {
          validateQuotedDocumentEvidence(invariant, `decomposition unit[${index}] coupling_invariants[${invariantIndex}]`);
        }
      });
      asArray(unit.grouping_basis.separation_test?.stable_handoffs).forEach((handoff, handoffIndex) => {
        validateEntryAuthority(handoff, `decomposition unit[${index}] stable_handoffs[${handoffIndex}]`);
      });
    }
  });

  const featureRoot = path.join(projectRoot, "specs", feature);
  for (const relativePath of ["prd.md", "spec-outline.md"]) {
    const metadataPath = path.join(featureRoot, relativePath);
    if (!fs.existsSync(metadataPath)) continue;
    const metadata = markdownOutlineMetadata(fs.readFileSync(metadataPath, "utf8"));
    if (metadata.outlineMaturity && metadata.outlineMaturity !== data.outline_maturity) {
      fail(`outline discovery maturity ${data.outline_maturity} does not match ${relativePath}: ${metadata.outlineMaturity}`);
    }
    if (data.schema_version === 3 && metadata.reviewLevel === 1 && data.outline_maturity !== "explore") {
      fail(`Level 1 portfolio-boundary discovery must use outline_maturity explore in ${relativePath}`);
    }
    if (data.schema_version === 3 && metadata.reviewLevel === 2 && data.outline_maturity !== "frame") {
      fail(`Level 2 child-project framing must use outline_maturity frame in ${relativePath}`);
    }
  }
}

function validateOutlineDiscoverySourceInventory(data) {
  if (data.schema_version < 5) return;
  const inventory = data.source_inventory;
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    fail("outline discovery schema_version 5 or later requires source_inventory");
    return;
  }
  const roots = asArray(inventory.roots);
  const entries = asArray(inventory.entries);
  if (!roots.length) fail("source_inventory.roots must contain at least one effective source root");
  if (!entries.length) fail("source_inventory.entries must account for at least one source file");

  const rootKinds = new Set(["directory", "file"]);
  const sourceOrigins = new Set(["default-prd", "feature-prd", "parent-reference", "human-specified"]);
  const dispositions = new Set(["used", "reviewed_no_capability", "duplicate", "deferred", "unreadable"]);
  const normalizedRoots = [];
  const rootPaths = new Set();
  for (const [index, root] of roots.entries()) {
    const rootPath = String(root?.path || "").replace(/\\/g, "/").replace(/\/$/, "");
    if (!isSafeRepositoryRelativePath(rootPath)) fail(`source_inventory.roots[${index}].path must be a safe repository-relative path`);
    if (rootPaths.has(rootPath)) fail(`source_inventory.roots contains duplicate path ${rootPath}`);
    rootPaths.add(rootPath);
    if (!rootKinds.has(root?.root_kind)) fail(`source_inventory.roots[${index}].root_kind is invalid`);
    if (!sourceOrigins.has(root?.source_origin)) fail(`source_inventory.roots[${index}].source_origin is invalid`);
    normalizedRoots.push({ path: rootPath, kind: root?.root_kind });
  }

  const entryByPath = new Map();
  const evidenceGapById = new Map(asArray(data.business_context?.evidence_gaps).map((gap) => [gap?.gap_id, gap]));
  const sourceSnapshotPaths = new Set(asArray(data.source_snapshot).map((source) => String(source?.path || "").replace(/\\/g, "/")));
  const entityCollections = [
    ["responsibility_owner", data.business_context?.responsibility_owners, "owner_id"],
    ["business_lifecycle", data.business_context?.business_lifecycles, "lifecycle_id"],
    ["business_state", data.business_context?.business_states, "state_id"],
    ["business_object", data.business_context?.business_objects, "object_id"],
    ["operation", data.business_context?.operations, "operation_id"],
    ["outcome", data.business_context?.outcomes, "outcome_id"],
    ["source_capability", data.business_context?.source_capability_coverage, "source_capability_id"],
    ["capability_atom", data.business_context?.capability_atoms, "atom_id"],
    ["business_chain", data.business_context?.business_chains, "chain_id"],
    ["outline_node", asArray(data.outline_nodes).filter((node) => node?.node_kind === "constraint"), "node_id"],
  ];
  const evidenceEntities = new Map();
  const sourceBackedEntityPaths = new Set();
  for (const [kind, values, idKey] of entityCollections) {
    for (const entity of asArray(values)) {
      const entityId = String(entity?.[idKey] || "");
      if (!entityId) continue;
      evidenceEntities.set(`${kind}:${entityId}`, entity);
      if (!["doc", "user", "user-confirmed"].includes(entity?.source_status)) continue;
      for (const ref of asArray(entity?.source_refs)) {
        const normalized = String(ref || "").replace(/\\/g, "/");
        sourceBackedEntityPaths.add(normalized.split("#", 1)[0]);
      }
    }
  }
  const belongsToRoot = (entryPath, root) => root.kind === "file"
    ? entryPath === root.path
    : (entryPath === root.path || entryPath.startsWith(`${root.path}/`));
  for (const [index, entry] of entries.entries()) {
    const entryPath = String(entry?.path || "").replace(/\\/g, "/");
    if (!isSafeRepositoryRelativePath(entryPath)) fail(`source_inventory.entries[${index}].path must be a safe repository-relative path`);
    if (entryByPath.has(entryPath)) fail(`source_inventory.entries contains duplicate path ${entryPath}`);
    entryByPath.set(entryPath, entry);
    if (!normalizedRoots.some((root) => belongsToRoot(entryPath, root))) {
      fail(`source_inventory entry ${entryPath} is outside every declared source root`);
    }
    if (!dispositions.has(entry?.disposition)) fail(`source_inventory entry ${entryPath} has invalid disposition`);
    if (String(entry?.rationale || "").trim().length < 20) {
      fail(`source_inventory entry ${entryPath} requires at least 20 characters of concrete rationale`);
    }
    if (entry?.disposition === "used" && !sourceSnapshotPaths.has(entryPath)) {
      fail(`source_inventory used entry ${entryPath} must appear in source_snapshot`);
    }
    if (entry?.disposition === "used" && !sourceBackedEntityPaths.has(entryPath)) {
      fail(`source_inventory used entry ${entryPath} has no source-backed business evidence; add an entity source_ref or mark the file reviewed_no_capability`);
    }
    if (data.schema_version >= 6) {
      const evidenceRefs = asArray(entry?.evidence_refs);
      if (entry?.disposition === "used" && !evidenceRefs.length) {
        fail(`source_inventory used entry ${entryPath} requires non-empty evidence_refs in schema_version 6`);
      }
      if (entry?.disposition !== "used" && entry?.evidence_refs !== undefined) {
        fail(`source_inventory entry ${entryPath} may declare evidence_refs only with used disposition`);
      }
      const seenEvidenceRefs = new Set();
      for (const [evidenceIndex, evidenceRef] of evidenceRefs.entries()) {
        const refKey = `${evidenceRef?.entity_kind || ""}:${evidenceRef?.entity_id || ""}`;
        if (seenEvidenceRefs.has(refKey)) fail(`source_inventory entry ${entryPath} contains duplicate evidence_ref ${refKey}`);
        seenEvidenceRefs.add(refKey);
        const entity = evidenceEntities.get(refKey);
        if (!entity) {
          fail(`source_inventory entry ${entryPath} evidence_refs[${evidenceIndex}] does not reference an existing business entity: ${refKey}`);
          continue;
        }
        if (!["doc", "user", "user-confirmed"].includes(entity?.source_status)) {
          fail(`source_inventory entry ${entryPath} evidence_ref ${refKey} must point to documented or human-confirmed evidence`);
        }
        const entityPaths = new Set(asArray(entity.source_refs).map((ref) => String(ref || "").replace(/\\/g, "/").split("#", 1)[0]));
        if (!entityPaths.has(entryPath)) {
          fail(`source_inventory entry ${entryPath} evidence_ref ${refKey} is not backed by that entity's source_refs`);
        }
      }
    } else if (entry?.evidence_refs !== undefined) {
      fail(`source_inventory evidence_refs require schema_version 6`);
    }
    if (entry?.disposition === "duplicate") {
      const duplicateOf = String(entry?.duplicate_of || "").replace(/\\/g, "/");
      if (!duplicateOf || duplicateOf === entryPath) fail(`source_inventory duplicate entry ${entryPath} requires a different duplicate_of path`);
    } else if (entry?.duplicate_of !== undefined) {
      fail(`source_inventory entry ${entryPath} may declare duplicate_of only with duplicate disposition`);
    }
    if (new Set(["deferred", "unreadable"]).has(entry?.disposition)) {
      const gap = evidenceGapById.get(entry?.evidence_gap_ref);
      const gapInventoryRefs = asArray(gap?.source_inventory_refs).map((sourcePath) => String(sourcePath || "").replace(/\\/g, "/"));
      if (!gap || !gapInventoryRefs.includes(entryPath)) {
        fail(`source_inventory ${entry.disposition} entry ${entryPath} must link an evidence gap that references the same path`);
      }
    } else if (entry?.evidence_gap_ref !== undefined) {
      fail(`source_inventory entry ${entryPath} may declare evidence_gap_ref only when deferred or unreadable`);
    }
  }
  for (const entry of entries) {
    if (entry?.disposition !== "duplicate") continue;
    const duplicateOf = String(entry.duplicate_of || "").replace(/\\/g, "/");
    const canonical = entryByPath.get(duplicateOf);
    if (!canonical) fail(`source_inventory duplicate_of path is not inventoried: ${duplicateOf}`);
    else if (!["used", "reviewed_no_capability"].includes(canonical.disposition)) {
      fail(`source_inventory duplicate_of path must point directly to a used or reviewed_no_capability entry: ${duplicateOf}`);
    }
  }
  for (const sourcePath of sourceSnapshotPaths) {
    if (entryByPath.get(sourcePath)?.disposition !== "used") {
      fail(`source_snapshot path ${sourcePath} must have a used source_inventory entry`);
    }
  }

  const projectRoot = canonicalOutlineDiscoveryProjectRoot(data);
  if (!projectRoot) {
    warn("source_inventory was validated outside artifact_path; filesystem completeness was not checked");
    return;
  }
  const defaultPrdPath = path.join(projectRoot, "prd");
  if (fs.existsSync(defaultPrdPath) && fs.statSync(defaultPrdPath).isDirectory()) {
    const defaultRoot = roots.find((root) => String(root?.path || "").replace(/\\/g, "/").replace(/\/$/, "") === "prd");
    if (!defaultRoot || defaultRoot.root_kind !== "directory" || defaultRoot.source_origin !== "default-prd") {
      fail("source_inventory must declare repository prd as the default-prd directory root when it exists");
    }
  }

  const actualPaths = new Set();
  const walk = (absolutePath, relativePath) => {
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      fail(`source_inventory root contains unsupported symbolic link: ${relativePath}`);
      return;
    }
    if (stat.isFile()) {
      actualPaths.add(relativePath.replace(/\\/g, "/"));
      return;
    }
    if (!stat.isDirectory()) return;
    for (const child of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      if (child.name.startsWith(".")) continue;
      walk(path.join(absolutePath, child.name), `${relativePath}/${child.name}`);
    }
  };
  for (const root of normalizedRoots) {
    const absoluteRoot = path.join(projectRoot, root.path);
    try {
      if (!fs.existsSync(absoluteRoot)) {
        fail(`source_inventory root does not exist: ${root.path}`);
        continue;
      }
      const stat = fs.statSync(absoluteRoot);
      if ((root.kind === "file" && !stat.isFile()) || (root.kind === "directory" && !stat.isDirectory())) {
        fail(`source_inventory root_kind does not match filesystem path: ${root.path}`);
        continue;
      }
      walk(absoluteRoot, root.path);
    } catch (error) {
      fail(`source_inventory could not scan root ${root.path}: ${error.message}`);
    }
  }
  for (const actualPath of actualPaths) {
    if (!entryByPath.has(actualPath)) fail(`source_inventory omitted file from effective source roots: ${actualPath}`);
  }
  for (const entryPath of entryByPath.keys()) {
    if (!actualPaths.has(entryPath)) fail(`source_inventory entry is not a regular file in the effective source roots: ${entryPath}`);
  }
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

/**
 * 检查文本是否为通用套话（跨领域替换测试的简化版）
 * @param {string} text - 要检查的文本
 * @param {Array<RegExp>} patterns - 通用模式列表
 * @returns {boolean} - 如果匹配任何通用模式则返回 true
 */
function isGenericBoilerplate(text, patterns) {
  const normalized = compactText(text);
  return patterns.some((pattern) => pattern.test(normalized));
}

/**
 * 验证 capability_atom 的语义具体性
 * @param {string} atomLabel - 用于错误消息的标签
 * @param {object} atom - capability_atom 对象
 */
function validateCapabilityAtomSemantics(atomLabel, atom) {
  // 检查 label 具体性
  if (isGenericBoilerplate(atom.label, vagueCapabilityAtomPatterns)) {
    fail(`${atomLabel}: label is too generic; name the concrete business object, specific action, and observable result (e.g., "采集券商实时行情推送" not "处理市场数据")`);
  }

  // 检查 owned_state 具体性
  const state = compactText(atom.owned_state);
  if (state.length < 10) {
    fail(`${atomLabel}: owned_state is too short; describe the concrete business state with key attributes (at least 10 chars)`);
  }
  if (isGenericBoilerplate(state, vagueStatePatterns)) {
    fail(`${atomLabel}: owned_state is too generic; describe a concrete state transition or business fact (e.g., "待支付订单 → 已确认订单" not "订单状态")`);
  }

  // 检查 trigger_or_input 具体性
  const trigger = compactText(atom.trigger_or_input);
  if (trigger.length < 8) {
    fail(`${atomLabel}: trigger_or_input is too short; name the concrete trigger source and event (at least 8 chars)`);
  }
  if (isGenericBoilerplate(trigger, vagueTriggerPatterns)) {
    fail(`${atomLabel}: trigger_or_input is too generic; name the specific business event or external system (e.g., "券商推送新tick数据" not "业务事件")`);
  }

  // 检查 downstream_handoff 具体性
  const handoff = compactText(atom.downstream_handoff);
  if (handoff.length < 10) {
    fail(`${atomLabel}: downstream_handoff is too short; describe what is handed off and to whom (at least 10 chars)`);
  }
  if (isGenericBoilerplate(handoff, vagueHandoffPatterns)) {
    fail(`${atomLabel}: downstream_handoff is too generic; name the specific business fact/command/event and target responsibility (e.g., "推送行情事件给策略引擎，包含价格和成交量" not "传递给下游系统")`);
  }
}

/**
 * 验证 business_object 的语义具体性
 * @param {string} objectLabel - 用于错误消息的标签
 * @param {object} businessObject - business_object 对象
 */
function validateBusinessObjectSemantics(objectLabel, businessObject) {
  const label = compactText(businessObject.label);

  // 检查是否过于泛化
  if (isGenericBoilerplate(label, vagueBusinessObjectPatterns)) {
    fail(`${objectLabel}: label is too generic; name the concrete business entity with key attributes (e.g., "待支付订单（金额、收货地址、支付截止时间）" not "订单")`);
  }

  // 检查最小长度（避免单个词）
  if (label.length < 4) {
    fail(`${objectLabel}: label is too short; provide a descriptive business object name with context (at least 4 chars)`);
  }
}

/**
 * 验证 business_operation 的语义具体性
 * @param {string} operationLabel - 用于错误消息的标签
 * @param {object} operation - business_operation 对象
 */
function validateBusinessOperationSemantics(operationLabel, operation) {
  const label = compactText(operation.label);

  // 检查空洞动词
  const emptyVerbs = ['处理', '管理', '维护', '执行', '组织', '协调', 'handle', 'manage', 'process', 'execute', 'maintain'];
  const startsWithEmptyVerb = emptyVerbs.some(verb => label.startsWith(verb) || label.toLowerCase().startsWith(verb));

  if (startsWithEmptyVerb && label.length < 15) {
    fail(`${operationLabel}: label uses a generic verb without qualification; describe the specific input, action, and output (e.g., "解析券商推送的tick数据并更新价格缓存" not "处理市场数据")`);
  }

  // 检查最小长度
  if (label.length < 8) {
    fail(`${operationLabel}: label is too short; describe what happens, to what, and why (at least 8 chars)`);
  }
}

/**
 * 验证 business_outcome 的语义具体性
 * @param {string} outcomeLabel - 用于错误消息的标签
 * @param {object} outcome - business_outcome 对象
 */
function validateBusinessOutcomeSemantics(outcomeLabel, outcome) {
  const label = compactText(outcome.label);

  // 检查是否只是抽象成功/失败
  const abstractOutcomes = ['成功', '失败', '完成', '错误', 'success', 'failure', 'complete', 'error', 'done'];
  if (abstractOutcomes.includes(label.toLowerCase())) {
    fail(`${outcomeLabel}: label is too abstract; describe the concrete observable result with measurable criteria (e.g., "行情数据已更新，延迟 < 100ms" not "成功")`);
  }

  // 检查最小长度 (降低到6字符以支持简洁但具体的中文描述，如"形成受控订单")
  if (label.length < 6) {
    fail(`${outcomeLabel}: label is too short; describe what changed, what can be verified, and by whom (at least 6 chars)`);
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

function validateBoundaryAdjustment(data) {
  const value = data.boundary_adjustment;
  if (value === undefined) return;
  if (data.review_type !== "outline" || !value || typeof value !== "object" || Array.isArray(value)) {
    fail("boundary_adjustment is allowed only on outline review data");
    return;
  }
  validateKnownKeys("boundary_adjustment", value, allowedBoundaryAdjustmentKeys);
  for (const key of [...allowedBoundaryAdjustmentKeys].filter((field) => field !== "operation")) {
    if (!(key in value)) fail(`boundary_adjustment is missing ${key}`);
  }
  const operation = value.operation || "ADJUSTMENT";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.proposal_id || "")) fail("boundary_adjustment proposal_id is invalid");
  for (const key of ["proposal_digest", "impact_preview_digest"]) {
    if (!/^[a-f0-9]{64}$/.test(value[key] || "")) fail(`boundary_adjustment ${key} must be a SHA-256 digest`);
  }
  if (operation === "ADOPTION") {
    if (value.base_baseline_id !== null || value.base_baseline_digest !== null || value.change_class !== "ADOPTION") {
      fail("boundary_adjustment adoption must use null base identity and ADOPTION change class");
    }
  } else if (operation !== "ADJUSTMENT" || typeof value.base_baseline_id !== "string" || !value.base_baseline_id
    || !/^[a-f0-9]{64}$/.test(value.base_baseline_digest || "")
    || !new Set(["METADATA", "STRUCTURAL"]).has(value.change_class)) {
    fail("boundary_adjustment adjustment identity or classification is invalid");
  }
  if (!new Set(["model", "user"]).has(value.initiated_by)) fail("boundary_adjustment initiated_by is invalid");
  if (!Array.isArray(value.affected_feature_codes)
    || new Set(value.affected_feature_codes).size !== value.affected_feature_codes.length
    || value.affected_feature_codes.some((code) => !/^(?:[0-9]{3,}|[0-9]{8}-[0-9]{6})$/.test(code))) {
    fail("boundary_adjustment affected_feature_codes is invalid");
  }
  const feature = String(data.project?.feature || "");
  const base = `specs/${feature}/boundary-adjustments`;
  const draft = `${base}/drafts/${value.proposal_id}`;
  const expected = {
    proposal_path: `${draft}/proposal.json`,
    impact_preview_path: `${draft}/impact-preview.json`,
    decision_path: `${draft}/decision.json`,
    writer_ledger_path: `${base}/writeback-ledger.jsonl`
  };
  for (const [field, path] of Object.entries(expected)) {
    if (!isSafeRepositoryRelativePath(value[field]) || value[field] !== path) {
      fail(`boundary_adjustment ${field} must use the fixed proposal-scoped path`);
    }
  }
  if (typeof value.decision_target_ref !== "string" || !value.decision_target_ref) {
    fail("boundary_adjustment decision_target_ref is required");
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
  validateEnum(itemLabel, "preview_viewport", item.preview_viewport, allowedUiPreviewViewports);

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
    for (const key of ["id", "title", "purpose", "position", "source_ref"]) {
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
      if (component.display !== undefined) {
        if (!component.display || typeof component.display !== "object" || Array.isArray(component.display)) {
          fail(`${componentLabel}: display must be an object`);
        } else {
          validateKnownKeys(`${componentLabel}:display`, component.display, allowedUiComponentDisplayKeys);
          validateEnum(`${componentLabel}:display`, "button_variant", component.display.button_variant, allowedUiButtonVariants);
          validateEnum(`${componentLabel}:display`, "badge_tone", component.display.badge_tone, allowedUiBadgeTones);
          if (component.display.options !== undefined && !["select", "filter"].includes(component.kind)) {
            fail(`${componentLabel}: display.options is allowed only for select or filter components`);
          }
          if ((component.display.columns !== undefined || component.display.rows !== undefined) && component.kind !== "table") {
            fail(`${componentLabel}: display.columns and display.rows are allowed only for table components`);
          }
          if (component.display.rows !== undefined && !asArray(component.display.columns).length) {
            fail(`${componentLabel}: display.rows requires display.columns so visible cells keep their exact meaning`);
          }
          for (const [rowIndex, row] of asArray(component.display.rows).entries()) {
            if (asArray(row).length !== asArray(component.display.columns).length) {
              fail(`${componentLabel}: display.rows[${rowIndex}] must have the same number of cells as display.columns`);
            }
          }
          if (component.display.button_variant !== undefined && component.kind !== "button") {
            fail(`${componentLabel}: display.button_variant is allowed only for button components`);
          }
          if (component.display.badge_tone !== undefined && component.kind !== "badge") {
            fail(`${componentLabel}: display.badge_tone is allowed only for badge components`);
          }
        }
      }
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

function validateOutlineDiscoverySourceRefs(data, refs, label, sourceStatus = null) {
  if (!Array.isArray(refs) || !refs.length) {
    fail(`${label}: source_refs must not be empty`);
    return;
  }
  if (new Set(refs).size !== refs.length) {
    fail(`${label}: source_refs must be unique`);
  }
  const sourcesByPath = new Map(asArray(data.source_snapshot).map((source) => [
    String(source?.path || "").replace(/\\/g, "/"),
    source,
  ]));
  for (const ref of refs) {
    const normalized = String(ref || "").replace(/\\/g, "/");
    const hash = normalized.indexOf("#");
    const sourcePath = hash === -1 ? normalized : normalized.slice(0, hash);
    const anchor = hash === -1 ? "" : normalized.slice(hash + 1);
    const featurePrdPath = `specs/${data.project?.feature || ""}/prd.md`;
    if (["doc", "user", "user-confirmed"].includes(sourceStatus)
        && sourcePath === featurePrdPath && !anchor) {
      fail(`${label}: strong source authority cannot cite the feature PRD without an exact heading`);
    }
    if (sourcePath === data.constitution_snapshot?.source_path || /(?:^|\/)constitution\.md$/i.test(sourcePath)) {
      fail(`${label}: Constitution cannot be business evidence`);
      continue;
    }
    const source = sourcesByPath.get(sourcePath);
    if (!source || (anchor && (!Array.isArray(source.anchors) || !source.anchors.includes(anchor)))) {
      fail(`${label}: source_refs must reference source_snapshot and its declared anchors`);
    }
  }
}

function validateOutlineDiscoveryTopology(data) {
  const budget = data.density_budget;
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) {
    fail("outline discovery density_budget must be an object");
  } else {
    if (Object.prototype.hasOwnProperty.call(budget, "max_children_per_node")) {
      fail("outline discovery density_budget must not contain deprecated max_children_per_node");
    }
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
    if (map.map_kind === "overview" && mapNodes.length > outlineDiscoveryOverviewSafetyLimit) {
      fail(`outline overview map ${map.map_id} may contain at most ${outlineDiscoveryOverviewSafetyLimit} visible nodes`);
    } else if (map.map_kind !== "overview" && mapNodes.length > outlineDiscoveryDensityBudget.max_visible_nodes_per_map) {
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
  for (const node of nodes) {
    if (node.node_kind === "map_link" && (childrenByParent.get(node.node_id) || []).length) {
      fail(`outline map_link ${node.node_id} must not contain same-map children; put child facts under ${node.child_map_id || "its child map"}`);
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
    if (map.map_kind !== "overview" && mapNodes.length >= outlineDiscoveryDensityBudget.layer_balance_min_nodes) {
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
  const capabilityAtomsById = new Map(asArray(data.business_context?.capability_atoms).map((atom) => [atom?.atom_id, atom]));
  const capabilityAtomOwnerCounts = new Map([...capabilityAtomsById.keys()].map((atomId) => [atomId, 0]));
  const businessChainProjectOwnerCounts = new Map([...businessChainIds].map((chainId) => [chainId, 0]));
  const constitutionClauseIds = new Set(asArray(data.constitution_snapshot?.clauses).map((clause) => clause?.clause_id));
  for (const node of nodes) {
    const map = mapsById.get(node.map_id);
    const childMap = mapsById.get(node.child_map_id);
    const isBusinessNode = map?.map_kind === "branch" || (map?.map_kind === "overview" && node.node_kind !== "root" && node.child_map_id !== constraintMaps[0]?.map_id);
    const isLevelOneProjectLink = data.schema_version === 3 && data.outline_maturity === "explore" &&
      map?.map_kind === "overview" &&
      node.parent_node_id === overviewRoot?.node_id &&
      node.node_kind === "map_link" &&
      childMap?.map_kind === "branch";
    const isOverviewBusinessMapLink = map?.map_kind === "overview" &&
      node.parent_node_id === overviewRoot?.node_id &&
      node.node_kind === "map_link" &&
      childMap?.map_kind === "branch";
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
    if (node.capability_atom_refs !== undefined) {
      if (!isBusinessNode || !Array.isArray(node.capability_atom_refs) || !node.capability_atom_refs.length ||
          new Set(node.capability_atom_refs).size !== node.capability_atom_refs.length ||
          node.capability_atom_refs.some((id) => !capabilityAtomsById.has(id))) {
        fail(`outline node ${node.node_id} capability_atom_refs must reference business_context`);
      }
    }
    if (map?.map_kind !== "global_constraints" && !(map?.map_kind === "overview" && node.node_kind === "root")) {
      const evidenceStatuses = [
        ...asArray(node.capability_atom_refs).map((id) => capabilityAtomsById.get(id)?.source_status),
        ...asArray(node.business_chain_refs).map((id) => asArray(data.business_context?.business_chains).find((chain) => chain.chain_id === id)?.source_status),
      ].filter(Boolean);
      if (sourceStatusExceedsEvidence(node.source_status, evidenceStatuses)) {
        fail(`outline node ${node.node_id} source_status cannot exceed its capability atom or business chain evidence`);
      }
    }
    if (isOverviewBusinessMapLink && (!Array.isArray(node.capability_atom_refs) || !node.capability_atom_refs.length)) {
      fail(`outline overview business map_link ${node.node_id} must own at least one capability atom`);
    }
    if (node.aggregation_basis !== undefined && !isLevelOneProjectLink) {
      fail(`outline node ${node.node_id} aggregation_basis is only allowed on Level 1 project map links`);
    }
    if (isLevelOneProjectLink) {
      const projectChainRefs = asArray(node.business_chain_refs);
      const projectAtomRefs = asArray(node.capability_atom_refs);
      if (!projectChainRefs.length || new Set(projectChainRefs).size !== projectChainRefs.length) {
        fail(`outline Level 1 project ${node.node_id} must reference one or more unique business chains`);
      }
      if (!projectAtomRefs.length || new Set(projectAtomRefs).size !== projectAtomRefs.length) {
        fail(`outline Level 1 project ${node.node_id} must reference one or more unique capability atoms`);
      }
      if (projectAtomRefs.length === 1 && node.aggregation_basis !== undefined) {
        fail(`outline Level 1 project ${node.node_id} must not declare aggregation_basis when it owns one capability atom`);
      }
      if (projectAtomRefs.length > 1) {
        const basis = node.aggregation_basis;
        if (!basis || typeof basis !== "object" || Array.isArray(basis)) {
          fail(`outline Level 1 project ${node.node_id} groups multiple capability atoms without a documented or human-supplied aggregation_basis; keep independent candidates by default`);
        } else {
          for (const key of Object.keys(basis)) {
            if (!allowedAggregationBasisKeys.has(key)) {
              fail(`outline Level 1 project ${node.node_id} aggregation_basis contains unsupported key ${key}`);
            }
          }
          if (!allowedAggregationAuthorities.has(basis.authority)) {
            fail(`outline Level 1 project ${node.node_id} aggregation_basis.authority must be doc, user, or user-confirmed`);
          }
          for (const key of ["shared_business_goal", "shared_lifecycle_or_owner", "split_acceptance_harm"]) {
            if (String(basis[key] || "").trim().length < 20) {
              fail(`outline Level 1 project ${node.node_id} aggregation_basis.${key} must contain at least 20 characters of concrete business reasoning`);
            }
          }
          validateOutlineDiscoverySourceRefs(
            data,
            basis.source_refs,
            `outline Level 1 project ${node.node_id} aggregation_basis`,
          );
        }
        if (!allowedAggregationAuthorities.has(node.source_status)) {
          fail(`outline Level 1 project ${node.node_id} with multiple capability atoms requires documented or human-supplied source_status`);
        }
      }
      for (const chainId of projectChainRefs) {
        if (businessChainProjectOwnerCounts.has(chainId)) {
          businessChainProjectOwnerCounts.set(chainId, businessChainProjectOwnerCounts.get(chainId) + 1);
        }
      }
      const atomChainRefs = new Set();
      for (const atomId of projectAtomRefs) {
        const atom = capabilityAtomsById.get(atomId);
        if (capabilityAtomOwnerCounts.has(atomId)) {
          capabilityAtomOwnerCounts.set(atomId, capabilityAtomOwnerCounts.get(atomId) + 1);
        }
        if (atom && atom.business_chain_refs?.length === 1) {
          atomChainRefs.add(atom.business_chain_refs[0]);
        }
      }
      const projectChainSet = new Set(projectChainRefs);
      if (projectChainSet.size !== atomChainRefs.size ||
          [...projectChainSet].some((chainId) => !atomChainRefs.has(chainId))) {
        fail(`outline Level 1 project ${node.node_id} business_chain_refs must equal the chains referenced by its capability_atom_refs`);
      }
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
  if (data.schema_version === 3 && data.outline_maturity === "explore") {
    for (const [chainId, ownerCount] of businessChainProjectOwnerCounts.entries()) {
      if (ownerCount !== 1) {
        fail(`Level 1 business chain must have exactly one Level 1 project owner: ${chainId}`);
      }
    }
    for (const [atomId, ownerCount] of capabilityAtomOwnerCounts.entries()) {
      if (ownerCount !== 1) {
        fail(`capability atom must have exactly one Level 1 project owner: ${atomId}`);
      }
    }
  }
  return { mapsById, nodesById };
}

function validateOutlineDiscoveryDecompositionWindow(data, { mapsById, nodesById }) {
  if (data.schema_version === 3) return;
  const window = data.decomposition_window;
  if (!window || typeof window !== "object" || Array.isArray(window)) {
    fail("outline discovery schema_version 4 requires decomposition_window");
    return;
  }
  const requiredWindowFields = [
    "expansion_root_node_id", "root_project_feature", "root_project_depth",
    "generation_mode", "generated_depth", "depth_decision_reason", "parent_path",
    "units", "frontier_unit_ids", "terminal_unit_ids",
  ];
  for (const key of requiredWindowFields) {
    if (window[key] === undefined || window[key] === null || window[key] === "") {
      fail(`decomposition_window.${key} is required`);
    }
  }
  if (window.root_project_feature !== data.project?.feature) {
    fail("decomposition_window.root_project_feature must match project.feature");
  }
  if (!Number.isInteger(window.root_project_depth) || window.root_project_depth < 0) {
    fail("decomposition_window.root_project_depth must be a non-negative integer");
  }
  if (!new Set(["decompose", "detail"]).has(window.generation_mode)) {
    fail("decomposition_window.generation_mode must be decompose or detail");
  }
  const expectedMode = data.outline_maturity === "explore" ? "decompose" : "detail";
  if (window.generation_mode !== expectedMode) {
    fail(`outline_maturity ${data.outline_maturity} requires decomposition_window.generation_mode ${expectedMode}`);
  }
  if (!Number.isInteger(window.generated_depth) || window.generated_depth < 0 || window.generated_depth > 3) {
    fail("decomposition_window.generated_depth must be an integer from 0 to 3");
  }
  if (String(window.depth_decision_reason || "").trim().length < 20) {
    fail("decomposition_window.depth_decision_reason must contain at least 20 characters");
  }
  const parentPath = asArray(window.parent_path);
  if (parentPath.length !== window.root_project_depth) {
    fail("decomposition_window.parent_path must contain every ancestor before the expansion root");
  }
  const parentPathIds = new Set();
  parentPath.forEach((entry, index) => {
    if (!String(entry?.unit_id || "").trim() || !String(entry?.label || "").trim()) {
      fail(`decomposition_window.parent_path[${index}] requires unit_id and label`);
    }
    if (!Number.isInteger(entry?.project_depth) || entry.project_depth !== index) {
      fail(`decomposition_window.parent_path[${index}].project_depth must be ${index}`);
    }
    if (parentPathIds.has(entry?.unit_id)) fail(`duplicate decomposition parent path unit_id ${entry?.unit_id}`);
    parentPathIds.add(entry?.unit_id);
  });

  const capabilityAtomsById = new Map(asArray(data.business_context?.capability_atoms).map((atom) => [atom?.atom_id, atom]));
  const capabilityAtomIds = new Set(capabilityAtomsById.keys());
  const businessChainsById = new Map(asArray(data.business_context?.business_chains).map((chain) => [chain?.chain_id, chain]));
  const businessChainIds = new Set(businessChainsById.keys());
  const businessStatesById = new Map(asArray(data.business_context?.business_states).map((state) => [state?.state_id, state]));
  const businessObjectsById = new Map(asArray(data.business_context?.business_objects).map((object) => [object?.object_id, object]));
  const responsibilityOwnersById = new Map(asArray(data.business_context?.responsibility_owners).map((owner) => [owner?.owner_id, owner]));
  const businessLifecyclesById = new Map(asArray(data.business_context?.business_lifecycles).map((lifecycle) => [lifecycle?.lifecycle_id, lifecycle]));
  const responsibilityOwnerIds = new Set(responsibilityOwnersById.keys());
  const businessLifecycleIds = new Set(businessLifecyclesById.keys());
  const currentProposalSourceRoots = asArray(data.source_inventory?.roots)
    .filter((root) => root?.source_origin !== "feature-prd")
    .map((root) => ({
      path: String(root?.path || "").replace(/\\/g, "/").replace(/\/$/, ""),
      kind: root?.root_kind,
    }))
    .filter((root) => root.path);
  const isCurrentProposalSourceRef = (rawRef) => {
    const normalized = String(rawRef || "").replace(/\\/g, "/");
    const hash = normalized.indexOf("#");
    const sourcePath = hash < 0 ? normalized : normalized.slice(0, hash);
    return currentProposalSourceRoots.some((root) =>
      root.kind === "file"
        ? sourcePath === root.path
        : sourcePath === root.path || sourcePath.startsWith(`${root.path}/`),
    );
  };
  const units = asArray(window.units);
  if (!units.length) {
    fail("decomposition_window.units must contain at least one Outline unit");
    return;
  }
  const unitsById = new Map();
  const unitByNodeId = new Map();
  const childrenByUnitId = new Map();
  const validateBasis = (basis, label, textFields, statusKey) => {
    if (!basis || typeof basis !== "object" || Array.isArray(basis)) {
      fail(`${label} is required`);
      return;
    }
    if (!allowedOutlineSourceStatuses.has(basis[statusKey])) {
      fail(`${label}.${statusKey} has unsupported source authority`);
    }
    for (const key of textFields) {
      if (String(basis[key] || "").trim().length < 20) {
        fail(`${label}.${key} must contain at least 20 characters of concrete reasoning`);
      }
    }
    validateOutlineDiscoverySourceRefs(data, basis.source_refs, label);
  };
  const validateProjectBoundary = (boundary, label, unit, atomRefs, chainRefs) => {
    if (data.schema_version < 6) return;
    if (!boundary || typeof boundary !== "object" || Array.isArray(boundary)) {
      fail(`${label}.project_boundary is required; grouping_basis is not a project boundary contract`);
      return;
    }
    for (const field of ["owned_responsibility", "scope", "independent_acceptance", "unresolved_boundary"]) {
      const minimum = field === "unresolved_boundary" ? 12 : 20;
      if (String(boundary[field] || "").trim().length < minimum) {
        fail(`${label}.project_boundary.${field} must contain concrete business meaning`);
      }
    }
    const ownedObjectRefs = asArray(boundary.owned_object_refs);
    if (!ownedObjectRefs.length || new Set(ownedObjectRefs).size !== ownedObjectRefs.length
        || ownedObjectRefs.some((objectId) => !businessObjectsById.has(objectId))) {
      fail(`${label}.project_boundary.owned_object_refs must contain unique existing business objects`);
    }
    const atomObjectRefs = new Set(atomRefs.flatMap((atomId) => asArray(capabilityAtomsById.get(atomId)?.object_refs)));
    if (ownedObjectRefs.length !== atomObjectRefs.size
        || [...atomObjectRefs].some((objectId) => !ownedObjectRefs.includes(objectId))) {
      fail(`${label}.project_boundary.owned_object_refs must exactly match the business objects used by its capability atoms`);
    }
    const nonGoals = asArray(boundary.non_goals);
    if (!nonGoals.length || new Set(nonGoals).size !== nonGoals.length
        || nonGoals.some((value) => String(value || "").trim().length < 12)) {
      fail(`${label}.project_boundary.non_goals must name at least one concrete excluded responsibility`);
    }
    const contractIds = new Set();
    const validateContracts = (direction) => {
      const contracts = boundary[direction];
      if (!Array.isArray(contracts) || !contracts.length) {
        fail(`${label}.project_boundary.${direction} must contain at least one business contract`);
        return;
      }
      const coveredChainRefs = new Set();
      for (const [index, contract] of contracts.entries()) {
        const contractLabel = `${label}.project_boundary.${direction}[${index}]`;
        if (!String(contract?.contract_id || "").trim() || contractIds.has(contract?.contract_id)) {
          fail(`${contractLabel}.contract_id must be non-empty and unique across both contract directions`);
        }
        contractIds.add(contract?.contract_id);
        for (const field of ["counterparty", "business_fact", "counterparty_responsibility"]) {
          if (String(contract?.[field] || "").trim().length < (field === "counterparty" ? 4 : 12)) {
            fail(`${contractLabel}.${field} must contain concrete business meaning`);
          }
        }
        const refs = asArray(contract?.business_chain_refs);
        if (!refs.length || new Set(refs).size !== refs.length || refs.some((chainId) => !businessChainIds.has(chainId))) {
          fail(`${contractLabel}.business_chain_refs must reference unique existing business chains`);
        } else if (refs.some((chainId) => !chainRefs.includes(chainId))) {
          fail(`${contractLabel}.business_chain_refs may reference only this unit's business chains`);
        }
        refs.forEach((chainId) => coveredChainRefs.add(chainId));
        validateOutlineDiscoverySourceRefs(data, contract?.source_refs, contractLabel, unit?.source_status);
        for (const chainId of refs) {
          const chainSourceRefs = asArray(businessChainsById.get(chainId)?.source_refs);
          if (!asArray(contract?.source_refs).some((sourceRef) => chainSourceRefs.includes(sourceRef))) {
            fail(`${contractLabel}.source_refs must directly support every referenced business chain`);
          }
        }
      }
      if (chainRefs.some((chainId) => !coveredChainRefs.has(chainId))) {
        fail(`${label}.project_boundary.${direction} must cover every business chain owned by this unit`);
      }
    };
    validateContracts("upstream_contracts");
    validateContracts("downstream_contracts");
  };
  const connectGraphNodes = (graph, ids) => {
    const values = [...new Set(ids)].filter(Boolean);
    for (const id of values) {
      if (!graph.has(id)) graph.set(id, new Set());
    }
    for (let left = 0; left < values.length; left += 1) {
      for (let right = left + 1; right < values.length; right += 1) {
        graph.get(values[left]).add(values[right]);
        graph.get(values[right]).add(values[left]);
      }
    }
  };
  const graphCovers = (ids, graph) => {
    const expected = [...new Set(ids)];
    if (!expected.length) return true;
    const visited = new Set();
    const queue = [expected[0]];
    while (queue.length) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of graph.get(current) || []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    return expected.every((id) => visited.has(id));
  };
  const validateV5GroupingBasis = (basis, label, unit, atomRefs) => {
    const atomStateRefs = atomRefs.map((atomId) => asArray(capabilityAtomsById.get(atomId)?.owned_state_refs)[0]);
    const atomStates = atomStateRefs.map((stateId) => businessStatesById.get(stateId)).filter(Boolean);
    const sharedOwnerRef = basis?.shared_responsibility_owner_ref;
    const sharedLifecycleRef = basis?.shared_lifecycle_ref;
    // The expansion root may be detached from its parent in a local window;
    // absolute project depth is the stable non-root signal.
    const isGeneratedChild = unit.project_depth > window.root_project_depth;
    if (isGeneratedChild && sharedOwnerRef === null && sharedLifecycleRef === null) {
      fail(`${label} must name a responsibility owner or lifecycle shared by every grouped atom`);
    }
    if (sharedOwnerRef !== null) {
      if (!responsibilityOwnerIds.has(sharedOwnerRef)) fail(`${label}.shared_responsibility_owner_ref must reference responsibility_owners`);
      if (atomStates.length !== atomRefs.length || atomStates.some((state) => state.responsibility_owner_ref !== sharedOwnerRef)) {
        fail(`${label}.shared_responsibility_owner_ref must be shared by every grouped atom`);
      }
    }
    if (sharedLifecycleRef !== null) {
      if (!businessLifecycleIds.has(sharedLifecycleRef)) fail(`${label}.shared_lifecycle_ref must reference business_lifecycles`);
      if (atomStates.length !== atomRefs.length || atomStates.some((state) => state.lifecycle_ref !== sharedLifecycleRef)) {
        fail(`${label}.shared_lifecycle_ref must be shared by every grouped atom`);
      }
    }
    if (data.schema_version >= 6 && isGeneratedChild) {
      const sharedAuthorities = [
        sharedOwnerRef === null ? null : responsibilityOwnersById.get(sharedOwnerRef)?.source_status,
        sharedLifecycleRef === null ? null : businessLifecyclesById.get(sharedLifecycleRef)?.source_status,
      ].filter(Boolean);
      const hasStrongSharedAuthority = sharedAuthorities.some((status) => ["doc", "user", "user-confirmed"].includes(status));
      const hasProposedSharedAuthority = sharedAuthorities.some((status) => status === "ai-proposed");
      const hasUnresolvedSharedAuthority = sharedAuthorities.some((status) => status === "unresolved");
      const isCurrentModelProposal = basis?.authority === "ai-proposed" || hasProposedSharedAuthority;
      if (hasUnresolvedSharedAuthority) {
        fail(`${label} cannot use an unresolved shared owner or lifecycle for a generated grouped child`);
      } else if (isCurrentModelProposal) {
        if (basis?.authority !== "ai-proposed") {
          fail(`${label}.authority must remain ai-proposed when its shared owner or lifecycle is model-proposed`);
        }
        if (basis?.proposal_origin !== "current-discovery") {
          fail(`${label}.proposal_origin must be current-discovery for a generated ai-proposed grouping`);
        }
        const proposalRefs = [
          ...asArray(basis?.source_refs),
          ...asArray(sharedOwnerRef === null ? [] : responsibilityOwnersById.get(sharedOwnerRef)?.source_refs),
          ...asArray(sharedLifecycleRef === null ? [] : businessLifecyclesById.get(sharedLifecycleRef)?.source_refs),
          ...asArray(basis?.coupling_invariants).flatMap((invariant) => asArray(invariant?.source_refs)),
          ...asArray(basis?.separation_test?.stable_handoffs).flatMap((handoff) => asArray(handoff?.source_refs)),
        ];
        if (!proposalRefs.length || proposalRefs.some((ref) => !isCurrentProposalSourceRef(ref))) {
          fail(`${label} current-discovery proposal evidence must come from original business sources, human-specified roots, or confirmed parent references; feature PRD and memory output cannot certify a new grouping`);
        }
      } else if (!hasStrongSharedAuthority || !["doc", "user", "user-confirmed"].includes(basis?.authority)) {
        fail(`${label} must use a documented, human-supplied, or fresh current-discovery shared boundary`);
      } else if (basis?.proposal_origin !== undefined) {
        fail(`${label}.proposal_origin is only allowed for ai-proposed current-discovery grouping`);
      }
    }
    const test = basis?.separation_test;
    if (!test || typeof test !== "object" || Array.isArray(test)) {
      fail(`${label}.separation_test is required`);
      return;
    }
    for (const field of ["keep_together_complexity", "split_coordination_cost", "decision_reason"]) {
      if (String(test?.[field] || "").trim().length < 20) fail(`${label}.separation_test.${field} must contain at least 20 characters`);
    }
    const alternativeGroups = asArray(test.alternative_groups);
    if (alternativeGroups.length < 2) fail(`${label}.separation_test must contain at least two alternative groups`);
    const groupIds = new Set();
    const alternativeAtomCounts = new Map();
    for (const [groupIndex, group] of alternativeGroups.entries()) {
      const groupLabel = `${label}.separation_test.alternative_groups[${groupIndex}]`;
      if (!String(group?.group_id || "").trim() || groupIds.has(group?.group_id)) fail(`${groupLabel}.group_id must be non-empty and unique`);
      groupIds.add(group?.group_id);
      if (String(group?.business_responsibility || "").trim().length < 20) fail(`${groupLabel}.business_responsibility must contain at least 20 characters`);
      const refs = asArray(group?.capability_atom_refs);
      if (!refs.length || new Set(refs).size !== refs.length || refs.some((atomId) => !atomRefs.includes(atomId))) {
        fail(`${groupLabel}.capability_atom_refs must be a unique non-empty subset of the grouped unit`);
      }
      for (const atomId of refs) alternativeAtomCounts.set(atomId, (alternativeAtomCounts.get(atomId) || 0) + 1);
    }
    if (atomRefs.some((atomId) => alternativeAtomCounts.get(atomId) !== 1)
        || [...alternativeAtomCounts.keys()].some((atomId) => !atomRefs.includes(atomId))) {
      fail(`${label}.separation_test alternative groups must partition every grouped atom exactly once`);
    }
    const groupIdByAtom = new Map();
    for (const group of alternativeGroups) {
      for (const atomId of asArray(group?.capability_atom_refs)) groupIdByAtom.set(atomId, group.group_id);
    }
    if (data.schema_version >= 6 && isGeneratedChild) {
      const invariants = asArray(basis?.coupling_invariants);
      if (!invariants.length) fail(`${label}.coupling_invariants must contain source-backed cross-partition evidence for a generated grouped child`);
      const invariantIds = new Set();
      const invariantAtomCoverage = new Set();
      const invariantGroupGraph = new Map([...groupIds].map((groupId) => [groupId, new Set()]));
      const invariantKinds = new Set(["atomic_acceptance", "single_writer_transaction", "regulated_joint_control", "inseparable_lifecycle", "cohesive_data_lifecycle"]);
      for (const [invariantIndex, invariant] of invariants.entries()) {
        const invariantLabel = `${label}.coupling_invariants[${invariantIndex}]`;
        if (!String(invariant?.invariant_id || "").trim() || invariantIds.has(invariant?.invariant_id)) fail(`${invariantLabel}.invariant_id must be non-empty and unique`);
        invariantIds.add(invariant?.invariant_id);
        if (!invariantKinds.has(invariant?.invariant_kind)) fail(`${invariantLabel}.invariant_kind is invalid`);
        if (String(invariant?.business_rule || "").trim().length < 20) fail(`${invariantLabel}.business_rule must contain at least 20 characters`);
        if (!["doc", "user", "user-confirmed"].includes(invariant?.source_status)) fail(`${invariantLabel}.source_status must be documented or human-confirmed`);
        validateOutlineDiscoverySourceRefs(data, invariant?.source_refs, invariantLabel);
        if (!String(invariant?.evidence_ref || "").trim() || String(invariant?.evidence_quote || "").trim().length < 8
            || !asArray(invariant?.source_refs).includes(invariant?.evidence_ref)) {
          fail(`${invariantLabel} must include evidence_ref in source_refs and a verbatim evidence_quote`);
        }
        const invariantAtoms = asArray(invariant?.capability_atom_refs);
        if (invariantAtoms.length < 2 || new Set(invariantAtoms).size !== invariantAtoms.length || invariantAtoms.some((atomId) => !atomRefs.includes(atomId))) {
          fail(`${invariantLabel}.capability_atom_refs must name at least two atoms in the grouped unit`);
        }
        if (new Set(invariantAtoms.map((atomId) => groupIdByAtom.get(atomId))).size < 2) {
          fail(`${invariantLabel} must cross at least two alternative groups; an internal rule does not justify keeping the groups together`);
        }
        for (const atomId of invariantAtoms) {
          invariantAtomCoverage.add(atomId);
          if (!asArray(capabilityAtomsById.get(atomId)?.source_refs).includes(invariant?.evidence_ref)) {
            fail(`${invariantLabel}.evidence_ref must directly support every capability atom named by the invariant`);
          }
        }
        connectGraphNodes(invariantGroupGraph, invariantAtoms.map((atomId) => groupIdByAtom.get(atomId)));
      }
      if (atomRefs.some((atomId) => !invariantAtomCoverage.has(atomId))) {
        fail(`${label}.coupling_invariants must cover every grouped capability atom; partial evidence cannot justify a larger bucket`);
      }
      if (!graphCovers(groupIds, invariantGroupGraph)) {
        fail(`${label}.coupling_invariants must connect every alternative group into one cohesion graph`);
      }
    } else if (data.schema_version >= 6 && basis?.coupling_invariants !== undefined && !Array.isArray(basis.coupling_invariants)) {
      fail(`${label}.coupling_invariants must be an array`);
    }
    if (!Array.isArray(test.stable_handoffs)) fail(`${label}.separation_test.stable_handoffs must be an array`);
    if (isGeneratedChild && asArray(test.stable_handoffs).length === 0) {
      fail(`${label}.separation_test.stable_handoffs must contain at least one stable business handoff for a non-root grouped unit`);
    }
    const handoffGroupGraph = new Map([...groupIds].map((groupId) => [groupId, new Set()]));
    for (const [handoffIndex, handoff] of asArray(test.stable_handoffs).entries()) {
      const handoffLabel = `${label}.separation_test.stable_handoffs[${handoffIndex}]`;
      if (!groupIds.has(handoff?.from_group_id) || !groupIds.has(handoff?.to_group_id) || handoff?.from_group_id === handoff?.to_group_id) {
        fail(`${handoffLabel} must connect two different alternative groups`);
      }
      if (String(handoff?.business_fact || "").trim().length < 12) fail(`${handoffLabel}.business_fact must name the exchanged business fact`);
      connectGraphNodes(handoffGroupGraph, [handoff?.from_group_id, handoff?.to_group_id]);
      if (data.schema_version >= 6) {
        const fromAtomId = handoff?.from_atom_ref;
        const toAtomId = handoff?.to_atom_ref;
        if (groupIdByAtom.get(fromAtomId) !== handoff?.from_group_id || groupIdByAtom.get(toAtomId) !== handoff?.to_group_id) {
          fail(`${handoffLabel} atom direction must match from_group_id and to_group_id`);
        }
        const fromAtom = capabilityAtomsById.get(fromAtomId);
        if (!fromAtom || !capabilityAtomsById.has(toAtomId)) fail(`${handoffLabel} must reference existing grouped atoms`);
        if (fromAtom && String(handoff?.business_fact || "").trim() !== String(fromAtom.downstream_handoff || "").trim()) {
          fail(`${handoffLabel}.business_fact must exactly match from_atom_ref.downstream_handoff`);
        }
        if (!allowedOutlineSourceStatuses.has(handoff?.source_status)) fail(`${handoffLabel}.source_status is invalid`);
        validateOutlineDiscoverySourceRefs(data, handoff?.source_refs, handoffLabel);
        if (fromAtom && sourceStatusExceedsEvidence(handoff?.source_status, [fromAtom.source_status])) {
          fail(`${handoffLabel}.source_status cannot exceed from_atom_ref evidence`);
        }
      }
    }
    if (isGeneratedChild && !graphCovers(groupIds, handoffGroupGraph)) {
      fail(`${label}.separation_test.stable_handoffs must connect every alternative group; disconnected responsibilities should be separate children`);
    }
    const duplicatedStateRefs = asArray(test.duplicated_state_refs);
    if (!Array.isArray(test.duplicated_state_refs) || new Set(duplicatedStateRefs).size !== duplicatedStateRefs.length
        || duplicatedStateRefs.some((stateId) => !atomStateRefs.includes(stateId))) {
      fail(`${label}.separation_test.duplicated_state_refs must be unique states owned by the grouped atoms`);
    }
    if (data.schema_version >= 6 && duplicatedStateRefs.length === 0
        && /(?:重复.{0,8}状态|状态.{0,8}重复|duplicat(?:e|ed|ion).{0,16}state)/i.test(String(test.split_coordination_cost || ""))) {
      fail(`${label}.separation_test cannot claim duplicated state cost when duplicated_state_refs is empty`);
    }
  };

  for (const [index, unit] of units.entries()) {
    const label = `decomposition_window.units[${index}]`;
    for (const key of ["unit_id", "outline_node_id", "business_goal", "overall_outcome", "source_status"]) {
      if (!String(unit?.[key] || "").trim()) fail(`${label}.${key} is required`);
    }
    if (unitsById.has(unit?.unit_id)) fail(`duplicate Outline unit_id ${unit?.unit_id}`);
    unitsById.set(unit?.unit_id, unit);
    if (unitByNodeId.has(unit?.outline_node_id)) fail(`Outline node ${unit?.outline_node_id} represents multiple decomposition units`);
    unitByNodeId.set(unit?.outline_node_id, unit);
    const node = nodesById.get(unit?.outline_node_id);
    if (!node || mapsById.get(node.map_id)?.map_kind === "global_constraints") {
      fail(`${label}.outline_node_id must reference a business Outline node`);
    }
    if (!(typeof unit?.parent_unit_id === "string" || unit?.parent_unit_id === null)) {
      fail(`${label}.parent_unit_id must be a string or null`);
    }
    if (!Number.isInteger(unit?.project_depth) || unit.project_depth < 0) {
      fail(`${label}.project_depth must be a non-negative integer`);
    }
    if (!new Set(["expanded", "frontier", "terminal"]).has(unit?.decomposition_state)) {
      fail(`${label}.decomposition_state is invalid`);
    }
    for (const key of ["business_goal", "overall_outcome"]) {
      if (String(unit?.[key] || "").trim().length < 20) {
        fail(`${label}.${key} must contain at least 20 characters of business meaning`);
      }
    }
    if (!allowedOutlineSourceStatuses.has(unit?.source_status)) fail(`${label}.source_status is invalid`);
    validateOutlineDiscoverySourceRefs(data, unit?.source_refs, label);
    const atomRefs = asArray(unit?.capability_atom_refs);
    const chainRefs = asArray(unit?.business_chain_refs);
    if (!atomRefs.length || new Set(atomRefs).size !== atomRefs.length || atomRefs.some((id) => !capabilityAtomIds.has(id))) {
      fail(`${label}.capability_atom_refs must contain unique business_context capability atoms`);
    }
    if (!chainRefs.length || new Set(chainRefs).size !== chainRefs.length || chainRefs.some((id) => !businessChainIds.has(id))) {
      fail(`${label}.business_chain_refs must contain unique business_context business chains`);
    }
    const atomChainRefs = new Set(atomRefs.flatMap((atomId) => capabilityAtomsById.get(atomId)?.business_chain_refs || []));
    if (chainRefs.length !== atomChainRefs.size || chainRefs.some((chainId) => !atomChainRefs.has(chainId))) {
      fail(`${label}.business_chain_refs must equal the chains referenced by its capability atoms`);
    }
    validateProjectBoundary(unit?.project_boundary, label, unit, atomRefs, chainRefs);
    if (sourceStatusExceedsEvidence(unit.source_status, [
      ...atomRefs.map((id) => capabilityAtomsById.get(id)?.source_status),
      ...chainRefs.map((id) => businessChainsById.get(id)?.source_status),
    ].filter(Boolean))) {
      fail(`${label}.source_status cannot exceed its capability atom or business chain evidence`);
    }
    if (atomRefs.length > 1) {
      if (data.schema_version >= 5) {
        validateBasis(unit.grouping_basis, `${label}.grouping_basis`, ["shared_business_goal", "parent_cohesion"], "authority");
        validateV5GroupingBasis(unit.grouping_basis, `${label}.grouping_basis`, unit, atomRefs);
      } else {
        validateBasis(
          unit.grouping_basis,
          `${label}.grouping_basis`,
          ["shared_business_goal", "shared_lifecycle_or_owner", "parent_cohesion"],
          "authority",
        );
      }
      if (unit.project_depth > window.root_project_depth && unit.grouping_basis?.authority === "unresolved") {
        fail(
          `${label}.grouping_basis.authority must not be unresolved for a non-root multi-atom unit; ` +
          "present the competing partitions as a Web Discovery decision instead of treating one grouping as chosen",
        );
      }
    } else if (unit.grouping_basis !== undefined) {
      fail(`${label}.grouping_basis is only allowed when the unit groups multiple capability atoms`);
    }
    if (unit.decomposition_state === "expanded") {
      validateBasis(
        unit.decomposition_basis,
        `${label}.decomposition_basis`,
        ["complexity_reduction", "child_boundary_summary", "coordination_cost"],
        "source_status",
      );
      if (unit.terminal_basis !== undefined) fail(`${label}.terminal_basis is not allowed on an expanded unit`);
    } else if (unit.decomposition_state === "terminal") {
      validateBasis(
        unit.terminal_basis,
        `${label}.terminal_basis`,
        ["indivisible_business_goal", "split_complexity_cost", "manageable_implementation_scope"],
        "source_status",
      );
      if (unit.decomposition_basis !== undefined) fail(`${label}.decomposition_basis is not allowed on a terminal unit`);
    } else if (unit.decomposition_basis !== undefined || unit.terminal_basis !== undefined) {
      fail(`${label} frontier units must not claim a decomposition or terminal decision`);
    }
  }

  if (data.schema_version >= 6) {
    const questions = asArray(data.question_groups).flatMap((group) => asArray(group?.questions));
    for (const unit of units) {
      if (unit.project_depth <= window.root_project_depth || asArray(unit.capability_atom_refs).length < 2) continue;
      const ownerStatus = responsibilityOwnersById.get(unit.grouping_basis?.shared_responsibility_owner_ref)?.source_status;
      const lifecycleStatus = businessLifecyclesById.get(unit.grouping_basis?.shared_lifecycle_ref)?.source_status;
      const requiresGroupingDecision = unit.grouping_basis?.authority === "ai-proposed"
        || [ownerStatus, lifecycleStatus].some((status) => ["ai-proposed", "unresolved"].includes(status))
        || ![ownerStatus, lifecycleStatus].some((status) => ["doc", "user", "user-confirmed"].includes(status));
      if (!requiresGroupingDecision) continue;
      const question = questions.find((entry) => entry?.outline_node_id === unit.outline_node_id);
      const completeCandidates = asArray(question?.candidates).filter((candidate) =>
        asArray(candidate?.capability_atom_refs).length === unit.capability_atom_refs.length
          && unit.capability_atom_refs.every((atomId) => candidate.capability_atom_refs.includes(atomId)),
      );
      const candidateCopy = completeCandidates.map((candidate) => compactText([
        candidate?.label, candidate?.rationale, candidate?.detail,
      ].join(" ")).toLowerCase());
      const hasKeep = candidateCopy.some((copy) => /(?:保留|维持|保持分离|keep|retain)/i.test(copy));
      const hasSplit = candidateCopy.some((copy) => /(?:拆分|分开|重新划分|split|separate|repartition)/i.test(copy));
      if (!question || question.target_kind !== "project_boundary" || !hasKeep || !hasSplit || completeCandidates.length < 2) {
        fail(`ai-proposed shared owner/lifecycle for ${unit.unit_id} requires a Web keep/split decision with complete atom coverage`);
      }
    }
  }

  for (const unit of units) {
    if (unit.parent_unit_id !== null) {
      const parent = unitsById.get(unit.parent_unit_id);
      if (!parent) {
        fail(`Outline unit ${unit.unit_id} parent_unit_id must reference this decomposition window`);
        continue;
      }
      if (unit.project_depth !== parent.project_depth + 1) {
        fail(`Outline unit ${unit.unit_id} project_depth must be one greater than its parent`);
      }
      const siblings = childrenByUnitId.get(parent.unit_id) || [];
      siblings.push(unit);
      childrenByUnitId.set(parent.unit_id, siblings);
    }
  }
  for (const [parentUnitId, children] of childrenByUnitId.entries()) {
    const signatures = new Map();
    for (const child of children.filter((unit) => asArray(unit.capability_atom_refs).length > 1)) {
      const test = child.grouping_basis?.separation_test;
      const signature = [test?.keep_together_complexity, test?.split_coordination_cost, test?.decision_reason]
        .map((value) => compactText(value).toLowerCase()).join("\n");
      if (signatures.has(signature)) {
        fail(`sibling grouped Outline units under ${parentUnitId} reuse the same complexity comparison; each allocation requires domain-specific evidence`);
      } else {
        signatures.set(signature, child.unit_id);
      }
    }
  }
  const roots = units.filter((unit) => unit.parent_unit_id === null);
  if (roots.length !== 1) fail("decomposition_window.units must contain exactly one expansion root unit");
  const rootUnit = roots[0];
  let containsParentCycle = false;
  const visitState = new Map();
  const visitUnit = (unit) => {
    const state = visitState.get(unit.unit_id) || 0;
    if (state === 1) {
      containsParentCycle = true;
      return;
    }
    if (state === 2) return;
    visitState.set(unit.unit_id, 1);
    for (const child of childrenByUnitId.get(unit.unit_id) || []) visitUnit(child);
    visitState.set(unit.unit_id, 2);
  };
  for (const unit of units) visitUnit(unit);
  if (containsParentCycle) fail("decomposition_window.units must not contain parent cycles");

  const reachableUnitIds = new Set();
  const markReachable = (unit) => {
    if (reachableUnitIds.has(unit.unit_id)) return;
    reachableUnitIds.add(unit.unit_id);
    for (const child of childrenByUnitId.get(unit.unit_id) || []) markReachable(child);
  };
  if (rootUnit) markReachable(rootUnit);
  if (reachableUnitIds.size !== units.length) {
    fail("decomposition_window.units must form one connected tree rooted at the expansion root");
  }
  if (rootUnit) {
    if (rootUnit.outline_node_id !== window.expansion_root_node_id) {
      fail("decomposition_window.expansion_root_node_id must reference the root Outline unit node");
    }
    if (rootUnit.project_depth !== window.root_project_depth) {
      fail("decomposition window root unit depth must match root_project_depth");
    }
    const rootAtoms = new Set(asArray(rootUnit.capability_atom_refs));
    const rootChains = new Set(asArray(rootUnit.business_chain_refs));
    if (rootAtoms.size !== capabilityAtomIds.size || [...capabilityAtomIds].some((id) => !rootAtoms.has(id))) {
      fail("decomposition window root unit must cover every capability atom in business_context");
    }
    if (rootChains.size !== businessChainIds.size || [...businessChainIds].some((id) => !rootChains.has(id))) {
      fail("decomposition window root unit must cover every business chain in business_context");
    }
  }

  for (const unit of units) {
    const children = childrenByUnitId.get(unit.unit_id) || [];
    if (unit.decomposition_state === "expanded" && !children.length) {
      fail(`expanded Outline unit ${unit.unit_id} must have direct child units`);
    }
    if (unit.decomposition_state !== "expanded" && children.length) {
      fail(`${unit.decomposition_state} Outline unit ${unit.unit_id} must not have child units`);
    }
    if (!children.length) continue;
    const childAtoms = new Set();
    const childChains = new Set();
    for (const child of children) {
      for (const atomId of asArray(child.capability_atom_refs)) {
        if (childAtoms.has(atomId)) fail(`sibling Outline units under ${unit.unit_id} must not overlap capability atom ${atomId}`);
        childAtoms.add(atomId);
      }
      for (const chainId of asArray(child.business_chain_refs)) {
        if (childChains.has(chainId)) fail(`sibling Outline units under ${unit.unit_id} must not overlap business chain ${chainId}`);
        childChains.add(chainId);
      }
    }
    const parentAtoms = new Set(asArray(unit.capability_atom_refs));
    const parentChains = new Set(asArray(unit.business_chain_refs));
    if (childAtoms.size !== parentAtoms.size || [...parentAtoms].some((id) => !childAtoms.has(id))) {
      fail(`expanded Outline unit ${unit.unit_id} children must exactly cover its capability atoms`);
    }
    if (childChains.size !== parentChains.size || [...parentChains].some((id) => !childChains.has(id))) {
      fail(`expanded Outline unit ${unit.unit_id} children must exactly cover its business chains`);
    }
  }

  const frontierIds = new Set(asArray(window.frontier_unit_ids));
  const terminalIds = new Set(asArray(window.terminal_unit_ids));
  if (frontierIds.size !== asArray(window.frontier_unit_ids).length || terminalIds.size !== asArray(window.terminal_unit_ids).length) {
    fail("decomposition_window frontier_unit_ids and terminal_unit_ids must be unique");
  }
  const expectedFrontierIds = new Set(units.filter((unit) => unit.decomposition_state === "frontier").map((unit) => unit.unit_id));
  const expectedTerminalIds = new Set(units.filter((unit) => unit.decomposition_state === "terminal").map((unit) => unit.unit_id));
  if (frontierIds.size !== expectedFrontierIds.size || [...frontierIds].some((id) => !expectedFrontierIds.has(id))) {
    fail("decomposition_window.frontier_unit_ids must exactly list frontier units");
  }
  if (terminalIds.size !== expectedTerminalIds.size || [...terminalIds].some((id) => !expectedTerminalIds.has(id))) {
    fail("decomposition_window.terminal_unit_ids must exactly list terminal units");
  }
  const maxDepth = Math.max(...units.map((unit) => unit.project_depth));
  const actualGeneratedDepth = maxDepth - window.root_project_depth;
  if (window.generated_depth !== actualGeneratedDepth) {
    fail("decomposition_window.generated_depth must equal the deepest generated descendant level");
  }
  if (/^000(?:-|$)/.test(String(data.project?.feature || "")) && window.generation_mode === "decompose") {
    if (window.generated_depth !== 1 || rootUnit?.decomposition_state !== "expanded") {
      fail("the 000 top Outline unit must generate exactly one direct descendant level");
    }
  } else if (window.generation_mode === "decompose" && ![2, 3].includes(window.generated_depth)) {
    const endedEarly = frontierIds.size === 0 && units
      .filter((unit) => unit.project_depth === maxDepth)
      .every((unit) => unit.decomposition_state === "terminal");
    if (!endedEarly) {
      fail("non-root Outline decomposition must generate two or three levels unless every branch terminates earlier");
    }
  }
  if (window.generation_mode === "detail") {
    if (window.generated_depth !== 0 || units.length !== 1 || rootUnit?.decomposition_state !== "terminal") {
      fail("detail framing requires exactly one confirmed terminal Outline unit and no new project levels");
    }
    if (!allowedAggregationAuthorities.has(rootUnit?.terminal_basis?.source_status)) {
      fail("detail framing requires a documented or human-confirmed terminal_basis");
    }
  }
}

function validateOutlineDiscoveryBranchFactExpansion(data, { mapsById, nodesById }) {
  const sourcesByPath = new Map(asArray(data.source_snapshot).map((source) => [
    String(source?.path || "").replace(/\\/g, "/"),
    source,
  ]));
  const validateNodeSourceRefs = (node) => {
    const refs = asArray(node.source_refs);
    if (!refs.length) {
      fail(`outline branch node ${node.node_id} source_refs must not be empty when provided`);
      return;
    }
    for (const ref of refs) {
      const normalized = String(ref || "").replace(/\\/g, "/");
      const hash = normalized.indexOf("#");
      const sourcePath = hash === -1 ? normalized : normalized.slice(0, hash);
      const anchor = hash === -1 ? "" : normalized.slice(hash + 1);
      if (sourcePath === data.constitution_snapshot?.source_path || /(?:^|\/)constitution\.md$/i.test(sourcePath)) {
        fail(`outline branch node ${node.node_id}: Constitution cannot be business evidence`);
        continue;
      }
      const source = sourcesByPath.get(sourcePath);
      if (!source || (anchor && (!Array.isArray(source.anchors) || !source.anchors.includes(anchor)))) {
        fail(`outline branch node ${node.node_id} source_refs must reference source_snapshot and its declared anchors`);
      }
    }
  };
  const isRecursiveDecompose = data.schema_version >= 4
    && data.decomposition_window?.generation_mode === "decompose";
  const recursiveUnitNodeIds = new Set(
    asArray(data.decomposition_window?.units).map((unit) => unit?.outline_node_id),
  );

  for (const map of mapsById.values()) {
    if (map?.map_kind !== "branch") continue;
    const branchBusinessNodes = [...nodesById.values()].filter(
      (node) => node.map_id === map.map_id && node.node_id !== map.root_node_id,
    );
    if (isRecursiveDecompose) {
      for (const node of branchBusinessNodes) {
        if (!recursiveUnitNodeIds.has(node.node_id)) {
          fail(
            `v4 decompose branch ${map.map_id} must register every business node as a decomposition_window unit; ` +
            `move detail node ${node.node_id} to the terminal unit's detail window`,
          );
        }
      }
      branchBusinessNodes.forEach(validateNodeSourceRefs);
      continue;
    }
    const directChildren = [...nodesById.values()].filter(
      (node) => node.map_id === map.map_id && node.parent_node_id === map.root_node_id,
    );
    if (!directChildren.length || directChildren.every((node) => node.node_kind === "map_link")) {
      fail(`outline branch map ${map.map_id} must expose at least one source-backed direct fact below its root`);
      continue;
    }
    directChildren.forEach(validateNodeSourceRefs);

    const childKinds = new Set(directChildren.map((node) => node.node_kind));
    const usesGenericTwoNodeLabels = directChildren.length === 2 &&
      childKinds.size === 2 &&
      childKinds.has("scenario") &&
      childKinds.has("acceptance") &&
      directChildren.some((node) => node.label === "独立业务触发与状态") &&
      directChildren.some((node) => node.label === "可观察交付结果");
    if (usesGenericTwoNodeLabels) {
      fail(
        `outline branch ${map.map_id} is compressed into a generic two-node skeleton; ` +
        "replace it with source-backed project-boundary notes for owned scope, overall outcome, or named handoffs. This is a semantic completeness rule, not a child-count limit",
      );
    }
  }
}

function validateOutlineDiscoveryNoDensityMerge(data) {
  const fieldsToCheck = [
    data?.project?.current_understanding,
    data?.project?.discovery_goal,
    ...(data?.maps ?? []).map(m => m?.summary),
    ...(data?.outline_nodes ?? []).map(n => n?.summary),
    ...(data?.outline_nodes ?? []).flatMap(n => [
      n?.grouping_basis?.shared_business_goal,
      n?.grouping_basis?.shared_lifecycle_or_owner,
      n?.grouping_basis?.parent_cohesion,
      n?.grouping_basis?.separation_test?.keep_together_complexity,
      n?.grouping_basis?.separation_test?.split_coordination_cost,
      n?.grouping_basis?.separation_test?.decision_reason,
    ]),
    ...(data?.decomposition_window?.units ?? []).flatMap(unit => [
      unit?.business_goal,
      unit?.overall_outcome,
      unit?.project_boundary?.owned_responsibility,
      unit?.project_boundary?.scope,
      ...(unit?.project_boundary?.non_goals || []),
      unit?.project_boundary?.independent_acceptance,
      unit?.project_boundary?.unresolved_boundary,
      ...(unit?.project_boundary?.upstream_contracts || []).flatMap(contract => [contract?.business_fact, contract?.counterparty_responsibility]),
      ...(unit?.project_boundary?.downstream_contracts || []).flatMap(contract => [contract?.business_fact, contract?.counterparty_responsibility]),
      unit?.grouping_basis?.shared_business_goal,
      unit?.grouping_basis?.shared_lifecycle_or_owner,
      unit?.grouping_basis?.parent_cohesion,
      unit?.grouping_basis?.separation_test?.keep_together_complexity,
      unit?.grouping_basis?.separation_test?.split_coordination_cost,
      unit?.grouping_basis?.separation_test?.decision_reason,
    ]),
    ...(data?.question_groups ?? []).flatMap(qg =>
      (qg?.questions ?? []).flatMap(q => [
        q?.prompt,
        q?.context,
        ...(q?.candidates ?? []).map(c => c?.value),
        ...(q?.candidates ?? []).map(c => c?.rationale),
        q?.recommendation_reason
      ])
    )
  ].filter(Boolean);

  for (const field of fieldsToCheck) {
    if (hasDensityMergeBoilerplate(field)) {
      fail(`visible copy contains density-merge boilerplate; density constraints may only add maps, never reduce or merge capability atoms. Offending text: "${String(field).substring(0, 120)}"`);
    }
  }
}

function validateOverviewMapLinkSummaryCompleteness(data) {
  const maps = asArray(data.maps);
  const nodes = asArray(data.outline_nodes);
  const nodesById = new Map(nodes.map((node) => [node.node_id, node]));
  const mapsById = new Map(maps.map((map) => [map.map_id, map]));

  const overviewMaps = maps.filter((map) => map?.map_kind === "overview");
  for (const overviewMap of overviewMaps) {
    const mapLinks = nodes.filter((node) =>
      node.map_id === overviewMap.map_id &&
      node.node_kind === "map_link" &&
      node.child_map_id
    );

    for (const mapLink of mapLinks) {
      const childMap = mapsById.get(mapLink.child_map_id);
      if (childMap?.map_kind === "branch") {
        const branchRoot = nodesById.get(childMap.root_node_id);
        if (branchRoot) {
          const mapLinkSummary = String(mapLink.summary || "").trim();
          const branchRootSummary = String(branchRoot.summary || "").trim();

          // Check length ratio (60% minimum)
          if (mapLinkSummary.length < branchRootSummary.length * 0.6) {
            warn(`outline map_link ${mapLink.node_id} summary is less than 60% of its branch root summary length; expand to include actor/trigger, operation, and outcome`);
          }

          // Check for three components using simple heuristics
          // This is a sanity check; the primary requirement is the three-component test
          const hasMultipleClauses = (mapLinkSummary.match(/[，。、；]/g) || []).length >= 2 ||
                                     (mapLinkSummary.match(/\s+(through|via|by|to|and|得到|形成|接入|发起|查看)\s+/gi) || []).length >= 2;

          if (mapLinkSummary.length < 30 && !hasMultipleClauses) {
            warn(`outline map_link ${mapLink.node_id} summary appears incomplete; ensure it contains actor/trigger, operation, and outcome (not just outcome fragment)`);
          }
        }
      }
    }
  }
}

function validateDiscoveryCandidateDetailField(data) {
  const questionGroups = asArray(data.question_groups);

  for (const [groupIndex, group] of questionGroups.entries()) {
    const questions = asArray(group?.questions);

    for (const [questionIndex, question] of questions.entries()) {
      const questionLabel = `question_group[${groupIndex}]:question[${questionIndex}]`;
      const candidates = asArray(question?.candidates);

      for (const [candidateIndex, candidate] of candidates.entries()) {
        const candidateLabel = `${questionLabel}:candidate[${candidateIndex}]`;

        // Check detail field exists and has minimum length
        if (!candidate?.detail || typeof candidate.detail !== "string") {
          fail(`${candidateLabel}: detail field is required for all discovery candidates`);
        } else if (candidate.detail.trim().length < 20) {
          fail(`${candidateLabel}: detail field must be at least 20 characters; describe the concrete responsibility, owned capabilities, outcomes, or revised joint responsibility after merge`);
        }
      }
    }
  }
}

function validateSourceCapabilityCoverage(data) {
  const context = data.business_context;
  const coverage = context?.source_capability_coverage;

  if (!Array.isArray(coverage) || coverage.length === 0) {
    fail("business_context.source_capability_coverage must be a non-empty array");
    return;
  }

  const atomsById = new Map(
    (context?.capability_atoms ?? []).map(a => [a?.atom_id, a])
  );
  const evidenceGapIds = new Set(
    asArray(context?.evidence_gaps).map(g => g?.gap_id)
  );

  const atomRefCounts = new Map();
  const coverageIds = new Set();

  for (const [index, entry] of coverage.entries()) {
    const entryLabel = `source_capability_coverage[${index}]`;

    if (!String(entry?.source_capability_id || "").trim()) {
      fail(`${entryLabel}: source_capability_id is required`);
    } else {
      if (coverageIds.has(entry.source_capability_id)) {
        fail(`${entryLabel}: duplicate source_capability_id ${entry.source_capability_id}`);
      }
      coverageIds.add(entry.source_capability_id);
    }

    validateOutlineDiscoverySourceRefs(data, entry?.source_refs, entryLabel);

    if (data.schema_version >= 6 && !allowedOutlineSourceStatuses.has(entry?.source_status)) {
      fail(`${entryLabel}: source_status is required and must be valid in schema_version 6`);
    }

    const allowedDispositions = new Set(["atom", "evidence_gap", "excluded_by_source"]);
    if (!allowedDispositions.has(entry?.disposition)) {
      fail(`${entryLabel}: disposition must be one of atom, evidence_gap, excluded_by_source`);
    }

    // Note: disposition "user_confirmed_merge" is excluded from the schema enum
    // so this case is handled by JSON Schema validation before reaching this code.
    // Listed here only to document intent for future schema extensions.

    if (entry?.disposition === "atom") {
      if (!entry?.capability_atom_ref) {
        fail(`${entryLabel}: disposition=atom requires capability_atom_ref`);
      } else if (!atomsById.has(entry.capability_atom_ref)) {
        fail(`${entryLabel}: capability_atom_ref ${entry.capability_atom_ref} does not reference a known capability atom`);
      } else {
        atomRefCounts.set(
          entry.capability_atom_ref,
          (atomRefCounts.get(entry.capability_atom_ref) ?? 0) + 1
        );
      }
      if (entry?.evidence_gap_ref !== undefined) {
        fail(`${entryLabel}: disposition=atom may not reference an evidence gap`);
      }
      if (data.schema_version >= 6 && String(entry?.independent_acceptance_reason || "").trim().length < 20) {
        fail(`${entryLabel}: disposition=atom requires a concrete independent_acceptance_reason of at least 20 characters`);
      }
      if (data.schema_version >= 6 && looksLikeCompoundResponsibility(entry?.label) && looksLikeCompoundResponsibility(entry?.owned_state)) {
        fail(`${entryLabel}: label and owned_state enumerate multiple responsibilities; extract each independently changing state or accepted result before grouping`);
      }
    }

    if (entry?.disposition === "evidence_gap") {
      if (!entry?.evidence_gap_ref) {
        fail(`${entryLabel}: disposition=evidence_gap requires evidence_gap_ref`);
      } else if (!evidenceGapIds.has(entry.evidence_gap_ref)) {
        fail(`${entryLabel}: evidence_gap_ref ${entry.evidence_gap_ref} does not reference a known evidence gap`);
      }
      if (entry?.capability_atom_ref !== undefined) {
        fail(`${entryLabel}: disposition=evidence_gap may not reference a capability atom`);
      }
    }

    if (entry?.disposition === "excluded_by_source"
        && (entry?.capability_atom_ref !== undefined || entry?.evidence_gap_ref !== undefined)) {
      fail(`${entryLabel}: disposition=excluded_by_source may not reference an atom or evidence gap`);
    }
  }

  if (data.schema_version >= 5) {
    for (const [atomId, count] of atomRefCounts.entries()) {
      if (count !== 1) {
        fail(`capability atom ${atomId} is referenced by ${count} source capabilities; every v5 atom requires exactly one source capability coverage entry (also required in v6)`);
      }
    }

    for (const [atomId] of atomsById.entries()) {
      if (!atomRefCounts.has(atomId)) {
        fail(`capability atom ${atomId} has no matching source_capability_coverage entry; every atom must trace back to a source capability`);
      }
    }
  }
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
    if (new Set(refs.map((ref) => String(ref || "").replace(/\\/g, "/"))).size !== refs.length) {
      fail(`${label}: source_refs must be unique`);
    }
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
  let responsibilityOwners = { values: [], ids: new Set() };
  let businessLifecycles = { values: [], ids: new Set() };
  let businessStates = { values: [], ids: new Set() };
  let businessStatesById = new Map();
  if (data.schema_version >= 5) {
    responsibilityOwners = collect("responsibility_owners", "owner_id", ["label", "accountability"]);
    businessLifecycles = collect("business_lifecycles", "lifecycle_id", ["label", "trigger_or_input", "completion_condition"]);
    businessStates = collect("business_states", "state_id", ["label"]);
    businessStatesById = new Map(businessStates.values.map((state) => [state.state_id, state]));
    for (const [index, state] of businessStates.values.entries()) {
      if (!responsibilityOwners.ids.has(state?.responsibility_owner_ref)) {
        fail(`business state[${index}] responsibility_owner_ref must reference responsibility_owners`);
      }
      if (!businessLifecycles.ids.has(state?.lifecycle_ref)) {
        fail(`business state[${index}] lifecycle_ref must reference business_lifecycles`);
      }
      if (!outcomes.ids.has(state?.acceptance_outcome_ref)) {
        fail(`business state[${index}] acceptance_outcome_ref must reference outcomes`);
      }
    }
  }

  // Semantic quality checks for business_objects
  for (const [index, obj] of objects.values.entries()) {
    validateBusinessObjectSemantics(`business_context.business_objects[${index}]`, obj);
  }

  // Semantic quality checks for operations
  for (const [index, op] of operations.values.entries()) {
    validateBusinessOperationSemantics(`business_context.operations[${index}]`, op);
  }

  // Semantic quality checks for outcomes
  for (const [index, outcome] of outcomes.values.entries()) {
    validateBusinessOutcomeSemantics(`business_context.outcomes[${index}]`, outcome);
  }

  for (const [index, operation] of operations.values.entries()) {
    if (!Array.isArray(operation.object_refs) || !operation.object_refs.length || operation.object_refs.some((id) => !objects.ids.has(id))) {
      fail(`business operation[${index}] object_refs must reference business_objects`);
    }
  }
  const chains = collect("business_chains", "chain_id", [
    "label", "chain_kind", "trigger_kind", "trigger_or_input", "owned_state",
    "primary_outcome_ref", "downstream_handoff",
  ]);
  const chainsById = new Map(chains.values.map((chain) => [chain.chain_id, chain]));
  const primaryOutcomeOwnerCounts = new Map();
  for (const [index, chain] of chains.values.entries()) {
    if (!allowedBusinessChainKinds.has(chain?.chain_kind)) fail(`business chain[${index}] chain_kind is invalid`);
    if (!allowedBusinessTriggerKinds.has(chain?.trigger_kind)) fail(`business chain[${index}] trigger_kind is invalid`);
    if (!Array.isArray(chain.object_refs) || !chain.object_refs.length) fail("business chain must reference at least one business object");
    else if (chain.object_refs.some((id) => !objects.ids.has(id))) fail(`business chain[${index}] object_refs must reference business_objects`);
    if (!Array.isArray(chain.operation_refs) || !chain.operation_refs.length || chain.operation_refs.some((id) => !operations.ids.has(id))) {
      fail(`business chain[${index}] operation_refs must reference operations`);
    }
    if (!Array.isArray(chain.outcome_refs) || !chain.outcome_refs.length || chain.outcome_refs.some((id) => !outcomes.ids.has(id))) {
      fail(`business chain[${index}] outcome_refs must reference outcomes`);
    }
    if (!outcomes.ids.has(chain?.primary_outcome_ref) || !asArray(chain?.outcome_refs).includes(chain?.primary_outcome_ref)) {
      fail(`business chain[${index}] primary_outcome_ref must reference one of its outcomes`);
    }
    if (data.schema_version >= 5) {
      const stateRefs = asArray(chain?.owned_state_refs);
      if (stateRefs.length !== 1 || !businessStates.ids.has(stateRefs[0])) {
        fail(`business chain[${index}] must reference exactly one business_state`);
      } else if (businessStatesById.get(stateRefs[0])?.acceptance_outcome_ref !== chain?.primary_outcome_ref) {
        fail(`business chain[${index}] business_state acceptance outcome must match primary_outcome_ref`);
      }
    }
    if (data.outline_maturity === "explore") {
      if (asArray(chain?.outcome_refs).length !== 1) {
        fail(`business chain[${index}] must have exactly one independently accepted outcome in Level 1`);
      }
      if (triggerKindByChainKind.get(chain?.chain_kind) !== chain?.trigger_kind) {
        fail(`business chain[${index}] chain_kind and trigger_kind are inconsistent`);
      }
      if (String(chain?.primary_outcome_ref || "").trim()) {
        primaryOutcomeOwnerCounts.set(
          chain.primary_outcome_ref,
          (primaryOutcomeOwnerCounts.get(chain.primary_outcome_ref) || 0) + 1,
        );
      }
    }
  }
  if (data.outline_maturity === "explore") {
    for (const [outcomeId, ownerCount] of primaryOutcomeOwnerCounts.entries()) {
      if (ownerCount !== 1) fail(`primary outcome must be owned by exactly one Level 1 business chain: ${outcomeId}`);
    }
  }
  const atoms = collect("capability_atoms", "atom_id", ["label"]);
  const capabilityAtomCountsByChain = new Map(chains.values.map((chain) => [chain.chain_id, 0]));
  for (const [index, atom] of atoms.values.entries()) {
    if (!allowedBusinessTriggerKinds.has(atom?.trigger_kind)) fail(`capability atom[${index}] trigger_kind is invalid`);
    if (!Array.isArray(atom.object_refs) || !atom.object_refs.length || atom.object_refs.some((id) => !objects.ids.has(id))) {
      fail(`capability atom[${index}] object_refs must reference business_objects`);
    }
    if (!Array.isArray(atom.operation_refs) || !atom.operation_refs.length || atom.operation_refs.some((id) => !operations.ids.has(id))) {
      fail(`capability atom[${index}] operation_refs must reference operations`);
    }
    if (!Array.isArray(atom.outcome_refs) || !atom.outcome_refs.length || atom.outcome_refs.some((id) => !outcomes.ids.has(id))) {
      fail(`capability atom[${index}] outcome_refs must reference outcomes`);
    }
    if (!Array.isArray(atom.business_chain_refs) || !atom.business_chain_refs.length || atom.business_chain_refs.some((id) => !chains.ids.has(id))) {
      fail(`capability atom[${index}] business_chain_refs must reference business_chains`);
    } else if (data.outline_maturity === "explore" && atom.business_chain_refs.length !== 1) {
      fail(`capability atom[${index}] must reference exactly one primary business chain`);
    }
    if (data.schema_version >= 5) {
      const stateRefs = asArray(atom?.owned_state_refs);
      if (stateRefs.length !== 1 || !businessStates.ids.has(stateRefs[0])) {
        fail(`capability atom[${index}] must reference exactly one business_state`);
      } else if (businessStatesById.get(stateRefs[0])?.acceptance_outcome_ref !== atom?.primary_outcome_ref) {
        fail(`capability atom[${index}] business_state acceptance outcome must match primary_outcome_ref`);
      }
    }
    if (data.outline_maturity === "explore" && atom.business_chain_refs?.length === 1) {
      const chain = chainsById.get(atom.business_chain_refs[0]);
      if (chain) {
        capabilityAtomCountsByChain.set(chain.chain_id, capabilityAtomCountsByChain.get(chain.chain_id) + 1);
      }
      if (chain && atom.trigger_kind !== chain.trigger_kind) {
        fail(`capability atom[${index}] trigger_kind must match its business chain`);
      }
      if (chain && ["trigger_or_input", "owned_state", "primary_outcome_ref", "downstream_handoff"]
        .some((field) => atom?.[field] !== chain?.[field])) {
        fail(`capability atom[${index}] semantic fields must match its business chain`);
      }
      if (data.schema_version >= 5 && chain
          && JSON.stringify(asArray(atom?.owned_state_refs)) !== JSON.stringify(asArray(chain?.owned_state_refs))) {
        fail(`capability atom[${index}] owned_state_refs must match its business chain`);
      }
      if (asArray(atom.outcome_refs).length !== 1 || (chain && atom.outcome_refs[0] !== chain.primary_outcome_ref)) {
        fail(`capability atom[${index}] must contribute to its Level 1 business chain primary outcome`);
      }
    }

    // Semantic quality check for capability_atoms
    validateCapabilityAtomSemantics(`business_context.capability_atoms[${index}]`, atom);
    warnIfAtomTooCoarse(`business_context.capability_atoms[${index}]`, atom, data);
  }
  if (data.outline_maturity === "explore") {
    for (const [chainId, atomCount] of capabilityAtomCountsByChain.entries()) {
      if (atomCount !== 1) {
        fail(`business chain ${chainId} must have exactly one Level 1 capability atom`);
      }
    }
  }
  if (!Array.isArray(context.evidence_gaps)) fail("business_context.evidence_gaps must be an array");
  const evidenceGaps = Array.isArray(context.evidence_gaps) ? context.evidence_gaps : [];
  const evidenceGapIds = new Set();
  for (const [index, gap] of evidenceGaps.entries()) {
    if (!String(gap?.gap_id || "").trim() || !String(gap?.summary || "").trim()) fail(`business evidence_gap[${index}] fields are required`);
    if (evidenceGapIds.has(gap.gap_id)) fail(`duplicate evidence gap_id ${gap.gap_id}`);
    evidenceGapIds.add(gap.gap_id);
    const chainRefs = asArray(gap?.business_chain_refs);
    const inventoryRefs = asArray(gap?.source_inventory_refs);
    if (data.schema_version >= 5) {
      if (!chainRefs.length && !inventoryRefs.length) {
        fail(`business evidence_gap[${index}] must reference a business chain or source inventory path`);
      }
      if (chainRefs.some((id) => !chains.ids.has(id))) {
        fail(`business evidence_gap[${index}] business_chain_refs must reference business_chains`);
      }
      const inventoryPaths = new Set(asArray(data.source_inventory?.entries).map((entry) => String(entry?.path || "").replace(/\\/g, "/")));
      if (inventoryRefs.some((sourcePath) => !inventoryPaths.has(String(sourcePath || "").replace(/\\/g, "/")))) {
        fail(`business evidence_gap[${index}] source_inventory_refs must reference source_inventory entries`);
      }
    } else if (!chainRefs.length || chainRefs.some((id) => !chains.ids.has(id))) {
      fail(`business evidence_gap[${index}] business_chain_refs must reference business_chains`);
    }
  }
  validateSourceCapabilityCoverage(data);
  if (data.schema_version >= 5) {
    const atomsById = new Map(atoms.values.map((atom) => [atom.atom_id, atom]));
    for (const [index, capability] of asArray(context.source_capability_coverage).entries()) {
      const label = `source_capability_coverage[${index}]`;
      if (capability?.disposition !== "atom") continue;
      if (!businessStates.ids.has(capability?.business_state_ref)) fail(`${label}: business_state_ref must reference business_states`);
      if (!responsibilityOwners.ids.has(capability?.responsibility_owner_ref)) fail(`${label}: responsibility_owner_ref must reference responsibility_owners`);
      if (!businessLifecycles.ids.has(capability?.lifecycle_ref)) fail(`${label}: lifecycle_ref must reference business_lifecycles`);
      const state = businessStatesById.get(capability?.business_state_ref);
      if (state && (state.responsibility_owner_ref !== capability?.responsibility_owner_ref || state.lifecycle_ref !== capability?.lifecycle_ref)) {
        fail(`${label}: owner and lifecycle must match its business_state`);
      }
      const atom = atomsById.get(capability?.capability_atom_ref);
      if (atom && asArray(atom.owned_state_refs)[0] !== capability?.business_state_ref) {
        fail(`${label}: business_state_ref must match its capability atom`);
      }
      if (data.schema_version >= 6 && atom) {
        const state = businessStatesById.get(capability?.business_state_ref);
        if (sourceStatusExceedsEvidence(capability?.source_status, [atom.source_status, state?.source_status].filter(Boolean))) {
          fail(`${label}: source_status cannot exceed its atom or state evidence; owner/lifecycle proposal authority is tracked separately`);
        }
      }
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
  if (!supportedOutlineDiscoverySchemaVersions.has(data.schema_version)) {
    fail("outline discovery requires supported schema_version 3, 4, 5, or 6");
  }
  if (supportedOutlineDiscoverySchemaVersions.has(data.schema_version) && data.schema_version < 5) {
    warn(
      `outline discovery schema_version ${data.schema_version} received compatibility validation only; ` +
      "source-root completeness, single-state ownership, and separation-test quality require regeneration as schema_version 6",
    );
  }
  if (data.schema_version >= 4 && !data.decomposition_window) {
    fail("outline discovery schema_version 4 or later requires decomposition_window");
  }
  if (data.schema_version >= 5 && !data.source_inventory) {
    fail("outline discovery schema_version 5 or later requires source_inventory");
  }
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

  validateOutlineDiscoveryProjectAuthority(data);
  validateOutlineDiscoveryConstitution(data);
  validateOutlineDiscoveryBusinessContext(data);
  validateOutlineDiscoverySourceInventory(data);
  const topology = validateOutlineDiscoveryTopology(data);
  const { mapsById, nodesById } = topology;
  validateOutlineDiscoveryDecompositionWindow(data, topology);
  validateOutlineDiscoveryBranchFactExpansion(data, topology);

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
      const businessChainIds = new Set(asArray(data.business_context?.business_chains).map((chain) => chain?.chain_id));
      const capabilityAtomsById = new Map(asArray(data.business_context?.capability_atoms).map((atom) => [atom?.atom_id, atom]));
      const currentLevelOneProject = data.schema_version === 3 && data.outline_maturity === "explore"
        ? (questionMap?.map_kind === "branch"
          ? asArray(data.outline_nodes).find((node) => node?.child_map_id === questionMap.map_id)
          : (questionMap?.map_kind === "overview" && questionNode?.node_kind === "map_link" ? questionNode : null))
        : null;
      const currentLevelOneAtomRefs = asArray(currentLevelOneProject?.capability_atom_refs);
      const currentLevelOneChainRefs = asArray(currentLevelOneProject?.business_chain_refs);
      for (const [candidateIndex, candidate] of candidates.entries()) {
        const candidateLabel = `${questionLabel}:candidate[${candidateIndex}]`;
        for (const key of ["id", "label", "value", "rationale"]) {
          if (!String(candidate?.[key] || "").trim()) fail(`${candidateLabel}: ${key} is required`);
        }
        if (candidateIds.has(candidate?.id)) fail(`${questionLabel}: duplicate candidate id ${candidate?.id}`);
        if (!Array.isArray(candidate?.business_chain_refs) || !candidate.business_chain_refs.length ||
            new Set(candidate.business_chain_refs).size !== candidate.business_chain_refs.length ||
            candidate.business_chain_refs.some((id) => !businessChainIds.has(id))) {
          fail(`${candidateLabel}: business_chain_refs must reference business_context`);
        }
        if (!Array.isArray(candidate?.capability_atom_refs) || !candidate.capability_atom_refs.length ||
            new Set(candidate.capability_atom_refs).size !== candidate.capability_atom_refs.length ||
            candidate.capability_atom_refs.some((id) => !capabilityAtomsById.has(id))) {
          fail(`${candidateLabel}: capability_atom_refs must reference business_context`);
        } else if (data.schema_version === 3 && data.outline_maturity === "explore") {
          const candidateAtomSet = new Set(candidate.capability_atom_refs);
          const candidateChainSet = new Set(candidate.business_chain_refs);
          const currentAtomSet = new Set(currentLevelOneAtomRefs);
          const currentChainSet = new Set(currentLevelOneChainRefs);
          if (!currentLevelOneProject ||
              candidateAtomSet.size !== currentAtomSet.size ||
              [...candidateAtomSet].some((atomId) => !currentAtomSet.has(atomId)) ||
              candidateChainSet.size !== currentChainSet.size ||
              [...candidateChainSet].some((chainId) => !currentChainSet.has(chainId))) {
            fail(`${candidateLabel}: must reference the current Level 1 project's complete capability atom and business chain sets`);
          }
          for (const atomId of candidate.capability_atom_refs) {
            const atom = capabilityAtomsById.get(atomId);
            if (atom && (atom.business_chain_refs?.length !== 1 || !candidateChainSet.has(atom.business_chain_refs[0]))) {
              fail(`${candidateLabel}: capability atom ${atomId} must reference one of the candidate business chains`);
            }
          }
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
  const questionedBranchMapIds = new Set(asArray(data.outline_nodes).flatMap((node) => {
    if (!questionedNodeIds.has(node.node_id)) return [];
    if (mapsById.get(node.map_id)?.map_kind === "branch") return [node.map_id];
    if (node.node_kind === "map_link" && mapsById.get(node.child_map_id)?.map_kind === "branch") return [node.child_map_id];
    return [];
  }));
  for (const node of asArray(data.outline_nodes)) {
    const map = mapsById.get(node.map_id);
    const childKind = mapsById.get(node.child_map_id)?.map_kind;
    const isBusinessNode = map?.map_kind === "branch" ||
      (map?.map_kind === "overview" && node.node_kind !== "root" && childKind !== "global_constraints");
    const coveredByEntryQuestion = (map?.map_kind === "branch" && questionedBranchMapIds.has(map.map_id)) ||
      (node.node_kind === "map_link" && questionedBranchMapIds.has(node.child_map_id));
    if (node?.source_status === "ai-proposed" && isBusinessNode && !questionedNodeIds.has(node.node_id) && !coveredByEntryQuestion) {
      fail(`ai-proposed business node must bind a question: ${node.node_id}`);
    }
  }
  validateOverviewMapLinkSummaryCompleteness(data);
  validateDiscoveryCandidateDetailField(data);
  validateOutlineDiscoveryNoDensityMerge(data);
}

function validateOutlineDiscoveryResponse(data) {
  if (!supportedOutlineDiscoverySchemaVersions.has(data.schema_version)) {
    fail("outline discovery response requires supported schema_version 3, 4, 5, or 6");
  }
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
    if (source.schema_version !== data.schema_version ||
        source.batch_id !== data.batch_id || source.project?.feature !== data.feature ||
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
    validateBoundaryAdjustment(data);
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
