/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. */
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
$("bulk-recommended").addEventListener("click", () => {
  let saved = 0;
  let skippedSaved = 0;
  let skippedDraft = 0;
  let skippedMissingRecommendation = 0;
  for (const node of visibleNodes()) {
    if (!requiresNodeDecision(node) || !node.recommended_option) {
      skippedMissingRecommendation += 1;
      continue;
    }
    const current = nodeState(node.id);
    if (current.status === "DRAFT") {
      skippedDraft += 1;
      continue;
    }
    if (current.status && current.status !== "MISSING") {
      skippedSaved += 1;
      continue;
    }
    state[node.id] = { status: "SAVED_RECOMMENDED", option: node.recommended_option };
    markSummaryDirty();
    saved += 1;
  }
  saveState();
  copyDraftWarningArmed = false;
  $("copy-summary").textContent = "复制确认摘要";
  setStatus(`已按推荐保存 ${saved} 个；跳过已保存 ${skippedSaved} 个、草稿 ${skippedDraft} 个、无推荐 ${skippedMissingRecommendation} 个。`);
  render();
});
$("reset-visible").addEventListener("click", () => {
  for (const node of visibleNodes()) {
    delete state[node.id];
  }
  markSummaryDirty();
  saveState();
  copyDraftWarningArmed = false;
  $("copy-summary").textContent = "复制确认摘要";
  setStatus("已重置当前视图本地选择。");
  render();
});
$("copy-summary").addEventListener("click", copySummary);
window.addEventListener("beforeunload", (event) => {
  if (!reviewData || (!hasDrafts() && !hasUnexportedSavedChoices())) return;
  event.preventDefault();
  event.returnValue = "仍有待提交草稿或尚未写回确认文档的选择，正式授权以确认文档为准。";
  return event.returnValue;
});

if (reviewData) {
  acceptReviewData(reviewData);
}
