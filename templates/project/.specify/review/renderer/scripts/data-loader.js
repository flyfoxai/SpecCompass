/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. */
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
    : `../../../specs/${encodeURIComponent(feature)}/ui/review/ui-review-data.json`;
  return new URL(relativePath, window.location.href);
}

function autoLoadConfigFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const flowFeature = params.get("flow");
  const uiFeature = params.get("ui");

  if (flowFeature && uiFeature) {
    throw new Error("URL 只能包含 flow 或 ui 其中一个短参数，不能同时加载两类审核数据。");
  }
  if (!flowFeature && !uiFeature) return null;

  const type = flowFeature ? "flow" : "ui";
  const feature = flowFeature || uiFeature;
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
  try {
    const response = await fetch(config.url, { cache: "no-store" });
    if (!response.ok) throw new Error(response.statusText);
    acceptReviewData(await response.json());
  } catch (error) {
    const protocolHint = window.location.protocol === "file:"
      ? "当前通过 file:// 打开时浏览器可能禁止读取 JSON；请使用本地预览服务，或点击上方按钮/选择 JSON 文件兜底。"
      : "请确认对应 feature 已生成 review data，或点击上方按钮/选择 JSON 文件兜底。";
    setStatus(`无法自动加载 ${config.type} review data（${config.feature}）：${error.message}。${protocolHint}`, true);
  }
}

async function autoLoadFromUrl() {
  try {
    const config = autoLoadConfigFromUrl();
    if (!config) {
      setStatus("未指定自动加载参数。Flow 审核页使用 ?flow=<feature>，UI 审核页使用 ?ui=<feature>；也可以点击上方按钮手动加载。");
      return;
    }
    await loadFromUrlConfig(config);
  } catch (error) {
    setStatus(`自动加载参数无效：${error.message}`, true);
  }
}

async function loadDefault(type) {
  try {
    const response = await fetch(DEFAULT_DATA_FILES[type], { cache: "no-store" });
    if (!response.ok) throw new Error(response.statusText);
    acceptReviewData(await response.json());
  } catch (error) {
    setStatus(`无法自动加载 ${DEFAULT_DATA_FILES[type]}，请手动选择 JSON 文件。`, true);
    $("file-input").click();
  }
}

$("load-flow").addEventListener("click", () => loadDefault("flow"));
$("load-ui").addEventListener("click", () => loadDefault("ui"));
$("file-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    acceptReviewData(JSON.parse(await file.text()));
  } catch (error) {
    setStatus(`JSON 文件解析失败：${error.message}`, true);
  }
});
$("show-all").addEventListener("click", () => {
  selectedNodeId = null;
  render();
});
function runRecommendationCompletion(entries, scopeLabel) {
  const summary = summarizeRecommendationCompletion(entries);
  if (!summary.unfinished || !summary.canSaveRecommended) {
    const missingText = summary.missingRecommendation
      ? `；另有 ${summary.missingRecommendation} 个未选项缺少推荐选项，需人工处理`
      : "";
    setStatus(`${scopeLabel}没有可按推荐自动保存的剩余未选项${missingText}；不会覆盖已有选择或草稿。`, Boolean(summary.missingRecommendation));
    return;
  }
  const confirmed = window.confirm(
    `${scopeLabel}还有 ${summary.unfinished} 个确认点未完成，其中 ${summary.canSaveRecommended} 个剩余未选项可按推荐自动保存。\n不会覆盖已有选择或草稿；缺少推荐选项的确认点仍需人工处理。\n是否都按推荐设置进行保存？`
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
  setStatus(`已按推荐保存 ${result.savedRecommended} 个；保留已保存 ${result.saved} 个、草稿 ${result.drafts} 个；缺少推荐选项 ${skippedMissingRecommendation} 个。`);
  render();
}

const bulkAllRecommended = $("bulk-all-recommended");
if (bulkAllRecommended) {
  bulkAllRecommended.addEventListener("click", () => {
    runRecommendationCompletion(allNodes().map(({ node }) => node), "所有模块和流程");
  });
}
$("bulk-recommended").addEventListener("click", () => {
  const scopeLabel = selectedNodeId ? "当前节点" : "当前流程或界面";
  runRecommendationCompletion(visibleNodes(), `${scopeLabel}（只保存当前可见流程或节点）`);
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
$("download-package").addEventListener("click", downloadConfirmationPackage);
$("copy-summary").addEventListener("click", copySummary);
window.addEventListener("beforeunload", (event) => {
  if (!reviewData || (!hasDrafts() && !hasUnexportedSavedChoices())) return;
  event.preventDefault();
  event.returnValue = "仍有待提交草稿或尚未写回确认文档的选择，正式授权以确认文档为准。";
  return event.returnValue;
});

if (reviewData) {
  acceptReviewData(reviewData);
} else {
  autoLoadFromUrl();
}
