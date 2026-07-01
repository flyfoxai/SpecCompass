/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. */
function validateReviewData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "review data 必须是 JSON object。";
  }
  if (data.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    return `schema_version 必须是 ${SUPPORTED_SCHEMA_VERSION}，当前为 ${data.schema_version ?? "未提供"}。`;
  }
  if (data.review_type !== "flow" && data.review_type !== "ui") {
    return "review_type 必须是 flow 或 ui。";
  }
  return "";
}

const runtimeVagueActionExits = new Set([
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

function runtimeHasSubstantialText(value) {
  return typeof value === "string" && value.replace(/\s+/g, "").length >= 18;
}

function runtimeIsVagueActionExit(value) {
  return runtimeVagueActionExits.has(String(value || "").trim().toLowerCase());
}

function runtimeCompactText(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function runtimeIsLegacyApplicabilityBenefit(value) {
  const text = String(value || "").trim();
  const compact = runtimeCompactText(text);
  return (
    compact.startsWith("适合") ||
    compact.startsWith("适用于") ||
    compact.startsWith("适用在") ||
    compact.startsWith("用于判断什么情况") ||
    /^when\s+to\s+choose\b/i.test(text) ||
    /^choose\s+this\s+when\b/i.test(text)
  );
}

function runtimeValidateReviewData(data) {
  const result = { warnings: [], errors: [] };
  const key = itemCollectionKey(data);
  const nodeIds = new Set();
  const componentIds = new Set();

  for (const module of data.modules || []) {
    for (const item of module[key] || []) {
      const itemLabel = `${module.title || module.id || "未命名模块"} / ${item.title || item.id || "未命名视图"}`;
      if (data.review_type === "ui") {
        if (!item.screen_layout) {
          result.errors.push(`${itemLabel} 缺少 screen_layout，UI 确认数据必须说明屏幕布局。`);
        }
        if (!Array.isArray(item.screen_regions) || item.screen_regions.length === 0) {
          result.errors.push(`${itemLabel} 缺少 screen_regions，UI review data requires screen_regions; UI review data must describe UI screen regions/components; optional states may add screen-state notes, but review nodes alone are not enough。`);
        }
        for (const region of item.screen_regions || []) {
          if (!Array.isArray(region.components) || region.components.length === 0) {
            result.errors.push(`${itemLabel} / ${region.title || region.id || "未命名区域"} 缺少 components，无法展示界面元素。`);
          }
          for (const component of region.components || []) {
            if (!component.id) {
              result.errors.push(`${itemLabel} 有 UI 组件缺少 id，无法和确认点稳定关联。`);
              continue;
            }
            if (componentIds.has(component.id)) {
              result.errors.push(`duplicate component id: ${component.id}。重复组件 id 会导致 UI 预览选中态串到其他元素。`);
            }
            componentIds.add(component.id);
          }
        }
      }
      const localNodeIds = new Set();
      for (const node of item.nodes || []) {
        if (!node.id) {
          result.errors.push(`${itemLabel} 有节点缺少 id，无法保存对应确认状态。`);
          continue;
        }
        if (localNodeIds.has(node.id) || nodeIds.has(node.id)) {
          result.errors.push(`节点 id 重复：${node.id}。重复 node id 会导致本地选择串到其他确认点。`);
        }
        localNodeIds.add(node.id);
        nodeIds.add(node.id);
        if (requiresNodeDecision(node)) {
          if (!runtimeHasSubstantialText(node.decision_background)) {
            result.warnings.push(`${node.label || node.id} 缺少 decision_background，右侧栏需要用“背景信息”说明这个判断为什么存在。`);
          }
          if (!runtimeHasSubstantialText(node.decision_summary)) {
            result.warnings.push(`${node.label || node.id} 缺少 decision_summary，右侧栏需要用“决策摘要”说明现在要拍什么板。`);
          }
          const options = node.options || [];
          if (options.length < 2 || options.length > 4) {
            result.warnings.push(`${node.label || node.id} 的选项数量不是 2-4 个。`);
          }
          if (node.review_level === "must_confirm" && (options.length < 3 || options.length > 4)) {
            result.warnings.push(`${node.label || node.id} 是必须确认节点，应提供 3-4 个可执行选项。`);
          }
          if (options.length === 2 && node.review_level !== "must_confirm" && !runtimeHasSubstantialText(node.options_count_rationale)) {
            result.warnings.push(`${node.label || node.id} 只有 2 个选项，需要用 options_count_rationale 说明为什么二元选择足够。`);
          }
          const optionIds = new Set(options.map((option) => option.id));
          for (const option of options) {
            for (const field of ["benefit", "cost", "consequence", "next_exit"]) {
              if (!String(option?.[field] || "").trim()) {
                result.warnings.push(`${node.label || node.id} 的 ${option?.id || "选项"} 缺少 ${field}。`);
              }
            }
            for (const legacyField of ["when_to_choose", "project_impact"]) {
              if (Object.prototype.hasOwnProperty.call(option || {}, legacyField)) {
                result.warnings.push(
                  `${node.label || node.id} 的 ${option?.id || "选项"} 包含 legacy option field ${legacyField}。这是旧字段，只兼容读取；新数据请改用 benefit/cost/recommendation_reason。`
                );
              }
            }
            if (option?.id === node.recommended_option && !runtimeHasSubstantialText(option?.recommendation_reason)) {
              result.warnings.push(`${node.label || node.id} 的推荐选项缺少 recommendation_reason，无法展示“推荐理由”。`);
            }
            if (runtimeIsVagueActionExit(option?.label) || runtimeIsVagueActionExit(option?.next_exit)) {
              result.warnings.push(`${node.label || node.id} 的 ${option?.id || "选项"} 需要写成可执行出口，不能只写通过、暂缓、退回或阻塞。`);
            }
            if (runtimeIsLegacyApplicabilityBenefit(option?.benefit)) {
              result.warnings.push(`${node.label || node.id} 的 ${option?.id || "选项"} 把 benefit 写成了“适合什么情况”；请改成这个选择带来的收益。`);
            }
          }
          if (!node.recommended_option || !optionIds.has(node.recommended_option)) {
            result.warnings.push(`${node.label || node.id} 缺少可用推荐选项。`);
          }
        }
      }
    }
  }

  const storageWarning = storageStatusWarning();
  if (storageWarning) {
    result.warnings.push(storageWarning);
  }
  return result;
}

function rejectReviewData(messages) {
  reviewData = null;
  state = {};
  $("page-title").textContent = "SpecCompass Review";
  $("project-overview").textContent = "review data 无法用于确认。";
  $("data-warnings").classList.remove("hidden");
  $("data-warnings").textContent = `阻断问题：${messages.join("；")}`;
  $("module-list").replaceChildren();
  $("module-title").textContent = "review data 结构存在阻断问题";
  $("module-summary").textContent = "请先运行 validate-review-data.mjs 并修复数据，再打开确认页。";
  $("item-title").textContent = "无法开始确认";
  $("item-summary").textContent = "本页面不会加载可能导致本地状态串用的数据。";
  $("item-tabs").replaceChildren();
  $("diagram-view").replaceChildren(create("p", "error", messages.join("；")));
  $("node-list").replaceChildren();
  $("rail-summary").textContent = "请先修复 review data。";
  setStatus("review data 结构存在阻断问题，请先修复。", true);
  return false;
}

function acceptReviewData(data) {
  const validationError = validateReviewData(data);
  if (validationError) {
    reviewData = null;
    state = {};
    $("page-title").textContent = "SpecCompass Review";
    $("project-overview").textContent = "review data 无法加载。";
    $("module-list").replaceChildren();
    $("module-title").textContent = "模块";
    $("module-summary").textContent = validationError;
    $("item-title").textContent = "流程或界面";
    $("item-summary").textContent = "请先用 validate-review-data.mjs 修复数据，再打开确认页。";
    $("item-tabs").replaceChildren();
    $("diagram-view").replaceChildren(create("p", "error", validationError));
    $("node-list").replaceChildren();
    setStatus(validationError, true);
    return false;
  }
  reviewData = data;
  selectedModuleIndex = 0;
  selectedItemIndex = 0;
  selectedNodeId = null;
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  const runtimeValidation = runtimeValidateReviewData(data);
  runtimeWarnings = runtimeValidation.warnings;
  runtimeErrors = runtimeValidation.errors;
  if (runtimeErrors.length) {
    return rejectReviewData(runtimeErrors);
  }
  loadState();
  render();
  return true;
}
