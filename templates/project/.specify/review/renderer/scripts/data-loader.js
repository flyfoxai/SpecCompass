/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. */
const REVIEW_TRANSPORT_CONTROL_IDS = [
  "download-package",
  "copy-summary"
];

function isSupportedReviewTransport() {
  return window.location.protocol === "http:" && isAllowedReviewHost(window.location.hostname);
}

function isPrivateIPv4(host) {
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host || "")) return false;
  const octets = host.split(".").map((value) => Number(value));
  if (octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
    || (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127);
}

function isAllowedReviewHost(host) {
  return host === "127.0.0.1" || isPrivateIPv4(host);
}

function requireSupportedReviewTransport() {
  if (isSupportedReviewTransport()) return true;
  for (const id of REVIEW_TRANSPORT_CONTROL_IDS) {
    const control = $(id);
    if (control) control.disabled = true;
  }
  setStatus(
    "复核页必须通过 serve-review.mjs 的 HTTP 服务使用。默认使用 127.0.0.1；内网或 Tailscale 访问请显式使用 --host 10.x.x.x、172.16-31.x.x、192.168.x.x 或 100.64-127.x.x，并打开 SPECCOMPASS_REVIEW_URL= 输出的地址。",
    true
  );
  return false;
}

function acceptSupportedReviewData(data) {
  if (!requireSupportedReviewTransport()) return false;
  acceptReviewData(normalizeLegacyReviewData(data));
  return true;
}

function normalizeLegacyReviewData(data) {
  if (data && data.schema_version === 1) {
    if (data.review_type !== "flow" && data.review_type !== "ui") return data;
    const normalized = JSON.parse(JSON.stringify(data));
    const key = itemCollectionKey(normalized);
    for (const module of normalized.modules || []) {
      for (const item of module[key] || []) {
        item.nodes = (item.nodes || []).map((node) => requiresNodeDecision(node)
          ? { ...node, confirmation_priority: "normal" }
          : node);
      }
    }
    return normalized;
  }
  return data;
}

function containsPathSeparator(value) {
  for (const char of String(value || "")) {
    if (char === "/" || char.charCodeAt(0) === 92) return true;
  }
  return false;
}

function validateFeatureId(feature) {
  return (
    typeof feature === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(feature) &&
    !feature.includes("..") &&
    !containsPathSeparator(feature)
  );
}

function reviewDataUrl(type, feature) {
  const relativePath = type === "flow"
    ? `../../../specs/${encodeURIComponent(feature)}/flows/review/flow-review-data.json`
    : type === "ui"
      ? `../../../specs/${encodeURIComponent(feature)}/ui/review/ui-review-data.json`
      : type === "outline"
        ? `../../../specs/${encodeURIComponent(feature)}/prd/review/outline-review-data.json`
        : `../../../specs/${encodeURIComponent(feature)}/prd/review/outline-discovery-data.json`;
  return new URL(relativePath, window.location.href);
}

function autoLoadConfigFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const flowFeature = params.get("flow");
  const uiFeature = params.get("ui");
  const outlineFeature = params.get("outline");
  const discoveryFeature = params.get("outline-discovery");

  if ([flowFeature, uiFeature, outlineFeature, discoveryFeature].filter(Boolean).length > 1) {
    throw new Error("URL 只能包含 flow、ui 或 outline 其中一个短参数；outline-discovery 同样必须单独使用，不能同时加载多类数据。");
  }
  if (!flowFeature && !uiFeature && !outlineFeature && !discoveryFeature) return null;

  const type = flowFeature ? "flow" : uiFeature ? "ui" : outlineFeature ? "outline" : "outline-discovery";
  const feature = flowFeature || uiFeature || outlineFeature || discoveryFeature;
  if (!validateFeatureId(feature)) {
    throw new Error("feature 参数只能包含字母、数字、点、下划线和短横线，不能包含路径分隔符或上级目录。");
  }

  return {
    type,
    feature,
    url: reviewDataUrl(type, feature)
  };
}

async function loadFromUrlConfig(config) {
  if (!requireSupportedReviewTransport()) return;
  try {
    const response = await fetch(config.url, { cache: "no-store" });
    if (!response.ok) throw new Error(response.statusText);
    acceptSupportedReviewData(await response.json());
  } catch (error) {
    setStatus(`无法自动加载 ${config.type} review data（${config.feature}）：${error.message}。请回到 Codex 重新运行所属命令，并打开新输出的 SPECCOMPASS_REVIEW_URL。`, true);
  }
}

async function autoLoadFromUrl() {
  if (!requireSupportedReviewTransport()) return;
  try {
    const config = autoLoadConfigFromUrl();
    if (!config) {
      setStatus("复核 URL 缺少唯一的数据类型和 feature。请回到 Codex 重新运行所属命令，并打开新输出的 SPECCOMPASS_REVIEW_URL。", true);
      return;
    }
    await loadFromUrlConfig(config);
  } catch (error) {
    setStatus(`自动加载参数无效：${error.message}`, true);
  }
}

$("review-mode-switch")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-review-mode]");
  if (!button) return;
  setReviewMode(button.dataset.reviewMode);
});
$("show-all").addEventListener("click", () => {
  selectedNodeId = null;
  selectedUiComponentId = null;
  selectedUiLayoutId = null;
  render();
});
$("priority-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-priority]");
  if (!button) return;
  selectedPriority = button.dataset.priority || "all";
  selectedNodeId = null;
  selectedUiComponentId = null;
  selectedUiLayoutId = null;
  render();
});
function runRecommendationCompletion(entries, scopeLabel) {
  const summary = summarizeRecommendationCompletion(entries);
  const criticalText = summary.criticalRequiresIndividual
    ? `；${summary.criticalRequiresIndividual} 个非常重要确认点必须逐项处理`
    : "";
  if (!summary.unfinished || !summary.canSaveRecommended) {
    const missingText = summary.missingRecommendation
      ? `；另有 ${summary.missingRecommendation} 个未选项缺少推荐选项，需人工处理`
      : "";
    setStatus(`${scopeLabel}没有可按推荐自动保存的剩余未选项${missingText}${criticalText}；不会覆盖已有选择或草稿。`, Boolean(summary.missingRecommendation || summary.criticalRequiresIndividual));
    return;
  }
  const confirmed = window.confirm(
    `${scopeLabel}还有 ${summary.unfinished} 个确认点未完成，其中 ${summary.canSaveRecommended} 个剩余未选项可按推荐自动保存。${criticalText}\n不会覆盖已有选择或草稿；缺少推荐选项和非常重要确认点仍需人工处理。\n是否都按推荐设置进行保存？`
  );
  if (!confirmed) {
    setStatus(`已取消${scopeLabel}按推荐保存。`);
    return;
  }
  const result = applyRecommendedToMissing(entries);
  if (!saveState()) {
    restoreReviewState(result.previousState);
    return;
  }
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  const skippedMissingRecommendation = result.missingRecommendation;
  setStatus(`已按推荐保存 ${result.savedRecommended} 个；保留已保存 ${result.saved} 个、草稿 ${result.drafts} 个；缺少推荐选项 ${skippedMissingRecommendation} 个；非常重要需逐项处理 ${result.criticalRequiresIndividual} 个。`);
  render();
}

$("bulk-view-recommended").addEventListener("click", () => {
  runRecommendationCompletion(currentItemNodes(), "当前视图");
});
$("bulk-module-recommended").addEventListener("click", () => {
  runRecommendationCompletion(currentModuleNodes(), "当前模块");
});
$("bulk-requirement-recommended").addEventListener("click", () => {
  runRecommendationCompletion(allNodes().map(({ node }) => node), "当前需求");
});
$("reset-visible").addEventListener("click", () => {
  const previousState = snapshotReviewState();
  for (const node of visibleNodes()) {
    delete state[node.id];
  }
  markSummaryDirty();
  if (!saveState()) {
    restoreReviewState(previousState);
    return;
  }
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  setStatus("已重置当前视图本地选择。");
  render();
});
$("download-package").addEventListener("click", () => {
  if (!requireSupportedReviewTransport()) return;
  if (reviewData?.review_type === "outline_discovery") void writeOutlineDiscoveryResponse();
  else void writeConfirmationPackage();
});
$("copy-summary").addEventListener("click", () => {
  if (!requireSupportedReviewTransport()) return;
  if (reviewData?.review_type === "outline_discovery") {
    setStatus("探索结果请使用“写入项目并继续”；仅在本地写回不可用时使用降级下载。", true);
  } else copySummary();
});
window.addEventListener("beforeunload", (event) => {
  const hasDiscoveryWork = typeof hasUnexportedOutlineDiscoveryWork === "function" && hasUnexportedOutlineDiscoveryWork();
  if (!reviewData || (!hasDrafts() && !hasUnexportedSavedChoices() && !hasDiscoveryWork)) return;
  event.preventDefault();
  event.returnValue = hasDiscoveryWork
    ? "仍有尚未写入项目的 Outline 探索响应；这些内容只会回到 /sp.prd，不构成授权。"
    : "仍有待提交草稿或尚未写回确认文档的选择，正式授权以确认文档为准。";
  return event.returnValue;
});

if (!requireSupportedReviewTransport()) {
  reviewData = null;
} else {
  autoLoadFromUrl();
}
