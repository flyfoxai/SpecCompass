/* PRD Outline levels 1-2: structured discovery, never formal confirmation. */
const OUTLINE_DISCOVERY_OPERATIONS = ["confirm_candidate", "add", "replace", "exclude", "context_note"];
const OUTLINE_DISCOVERY_OPERATION_LABELS = {
  confirm_candidate: "确认一个候选方向",
  add: "新增业务需求",
  replace: "替换已有判断",
  exclude: "明确排除",
  context_note: "补充背景信息"
};
let outlineDiscoveryGroupIndex = 0;
let outlineDiscoveryState = { responses: {}, meta: {} };

function outlineDiscoveryStorageKey(data = reviewData) {
  return `speccompass-outline-discovery:${data?.project?.feature || "feature"}:${reviewDataIdentifier(data)}:${data?.batch_id || "batch"}`;
}

function loadOutlineDiscoveryState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(outlineDiscoveryStorageKey()) || "{}");
    outlineDiscoveryState = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    outlineDiscoveryState = {};
  }
  if (!outlineDiscoveryState.responses || typeof outlineDiscoveryState.responses !== "object") {
    outlineDiscoveryState.responses = {};
  }
  if (!outlineDiscoveryState.meta || typeof outlineDiscoveryState.meta !== "object") {
    outlineDiscoveryState.meta = {};
  }
}

function saveOutlineDiscoveryState(message = "探索草稿已保存在当前浏览器。", options = {}) {
  try {
    const savedAt = new Date().toISOString();
    outlineDiscoveryState.meta.updated_at = savedAt;
    if (options.downloaded === true) outlineDiscoveryState.meta.downloaded_at = savedAt;
    localStorage.setItem(outlineDiscoveryStorageKey(), JSON.stringify(outlineDiscoveryState));
    setStatus(`${message} 这不是授权，下一步仍是 /sp.prd。`);
    return true;
  } catch {
    setStatus("浏览器未能保存探索草稿；请尽快下载响应文件。此页面不会授权 /sp.specify。", true);
    return false;
  }
}

function outlineDiscoveryQuestions(data = reviewData) {
  return (data?.question_groups || []).flatMap((group) => group.questions || []);
}

function outlineDiscoveryResponse(questionId) {
  if (!outlineDiscoveryState.responses[questionId]) {
    outlineDiscoveryState.responses[questionId] = {
      question_id: questionId,
      operation: "",
      candidate_id: null,
      target_id: null,
      value: "",
      none_of_the_above: false
    };
  }
  return outlineDiscoveryState.responses[questionId];
}

function isMeaningfulOutlineDiscoveryResponse(response) {
  const hasCandidate = Boolean(response?.candidate_id);
  const hasTarget = Boolean(response?.target_id);
  const hasValue = Boolean(String(response?.value || "").trim());
  if (response?.operation === "confirm_candidate") return hasCandidate;
  if (response?.operation === "add" || response?.operation === "context_note") return hasValue;
  if (response?.operation === "replace") return hasTarget && hasValue;
  if (response?.operation === "exclude") return hasCandidate !== hasTarget;
  return false;
}

function hasOutlineDiscoveryDraft(response) {
  return Boolean(
    response?.operation || response?.candidate_id || response?.target_id ||
    String(response?.value || "").trim() || response?.none_of_the_above
  );
}

function hasUnexportedOutlineDiscoveryWork() {
  if (reviewData?.review_type !== "outline_discovery") return false;
  if (!Object.values(outlineDiscoveryState.responses || {}).some(hasOutlineDiscoveryDraft)) return false;
  const updatedAt = Date.parse(outlineDiscoveryState.meta?.updated_at || "");
  const downloadedAt = Date.parse(outlineDiscoveryState.meta?.downloaded_at || "");
  return !Number.isFinite(downloadedAt) || (Number.isFinite(updatedAt) && updatedAt > downloadedAt);
}

function normalizeOutlineDiscoveryDraftForOperation(response) {
  if (response.operation === "confirm_candidate") {
    response.target_id = null;
    response.value = "";
    response.none_of_the_above = false;
  } else if (response.operation === "add") {
    response.candidate_id = null;
    response.target_id = null;
  } else if (response.operation === "replace") {
    response.candidate_id = null;
    response.none_of_the_above = false;
  } else if (response.operation === "exclude") {
    response.none_of_the_above = false;
    if (response.candidate_id && response.target_id) response.target_id = null;
  } else if (response.operation === "context_note") {
    response.candidate_id = null;
    response.target_id = null;
    response.none_of_the_above = false;
  }
}

function updateOutlineDiscoveryProgress() {
  const questions = outlineDiscoveryQuestions();
  const completed = questions.filter((question) =>
    isMeaningfulOutlineDiscoveryResponse(outlineDiscoveryState.responses[question.id])
  ).length;
  $("rail-summary").textContent = `已回应 ${completed}/${questions.length} 个探索问题。可以分批保存；每次输出都只回到 /sp.prd 继续完善。`;
  $("live-status").textContent = `探索成熟度：${reviewData?.outline_maturity || "explore"}；授权效果：none。`;
}

function leaveOutlineDiscoveryMode() {
  document.body.classList.remove("outline-discovery-mode");
  $("priority-filters")?.classList.remove("hidden");
  document.querySelector(".rail-actions")?.classList.remove("hidden");
  $("copy-summary")?.classList.remove("hidden");
  $("download-package").textContent = "下载确认包";
  $("page-note").textContent = "统一确认页只展示结构化 review data；正式授权需要写回 confirmation 文档。";
}

function renderOutlineDiscovery(data = reviewData) {
  document.body.classList.add("outline-discovery-mode");
  loadOutlineDiscoveryState();
  outlineDiscoveryGroupIndex = Math.min(outlineDiscoveryGroupIndex, Math.max(0, (data.question_groups || []).length - 1));
  $("page-title").textContent = `SpecCompass - ${data.project?.name || "项目"} / Outline 探索`;
  $("page-note").textContent = "这里用于补齐和修正产品事实；保存结果只回到 /sp.prd，不会授权 /sp.specify。";
  $("project-overview").textContent = data.project?.current_understanding || "尚未形成稳定产品框架。";
  $("data-warnings").classList.add("hidden");
  $("download-package").textContent = "保存并继续完善";
  $("copy-summary").classList.add("hidden");
  $("priority-filters").classList.add("hidden");
  document.querySelector(".rail-actions")?.classList.add("hidden");

  const steps = $("authorization-steps");
  steps.replaceChildren();
  for (const text of [
    "选择最接近的候选，也可以直接输入真实业务需求。",
    "保存后下载结构化探索响应，再交回 /sp.prd 消化。",
    "本页没有授权能力；只有成熟度达到 specify_ready 后才进入正式 Outline 确认。"
  ]) appendText(steps, "li", text);

  renderOutlineDiscoveryGroups();
  renderOutlineDiscoveryCurrentGroup();
  renderOutlineDiscoveryRail();
  updateOutlineDiscoveryProgress();
}

function renderOutlineDiscoveryGroups() {
  const list = $("module-list");
  list.replaceChildren();
  (reviewData.question_groups || []).forEach((group, index) => {
    const questions = group.questions || [];
    const completed = questions.filter((question) =>
      isMeaningfulOutlineDiscoveryResponse(outlineDiscoveryState.responses[question.id])
    ).length;
    const button = create("button", "module-button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(index === outlineDiscoveryGroupIndex));
    appendText(button, "strong", group.title || group.id);
    button.appendChild(document.createElement("br"));
    appendText(button, "span", group.summary || "");
    button.appendChild(document.createElement("br"));
    appendText(button, "span", `已回应 ${completed}/${questions.length}`, "discovery-progress-badge");
    button.addEventListener("click", () => {
      outlineDiscoveryGroupIndex = index;
      renderOutlineDiscoveryCurrentGroup();
    });
    list.appendChild(button);
  });
}

function renderOutlineDiscoveryCurrentGroup() {
  const groups = reviewData.question_groups || [];
  const group = groups[outlineDiscoveryGroupIndex];
  $("module-position").textContent = groups.length
    ? `问题组 ${outlineDiscoveryGroupIndex + 1}/${groups.length}`
    : "问题组 0/0";
  $("prev-module").disabled = outlineDiscoveryGroupIndex <= 0;
  $("next-module").disabled = !groups.length || outlineDiscoveryGroupIndex >= groups.length - 1;
  $("prev-module").onclick = () => {
    outlineDiscoveryGroupIndex = Math.max(0, outlineDiscoveryGroupIndex - 1);
    renderOutlineDiscoveryCurrentGroup();
  };
  $("next-module").onclick = () => {
    outlineDiscoveryGroupIndex = Math.min(groups.length - 1, outlineDiscoveryGroupIndex + 1);
    renderOutlineDiscoveryCurrentGroup();
  };
  $("module-title").textContent = group?.title || "Outline 探索";
  $("module-summary").textContent = group?.summary || reviewData.project?.discovery_goal || "继续补齐产品事实。";
  $("item-title").textContent = "需要你参与的产品判断";
  $("item-summary").textContent = "候选只是模型建议。请选择、排除或直接输入；未被选择的候选仍是 [src:ai-proposed]。";
  $("item-tabs").replaceChildren();
  const view = $("diagram-view");
  view.replaceChildren();
  const banner = create("section", "discovery-non-authorizing-banner");
  appendText(banner, "strong", "探索模式");
  appendText(banner, "span", "不会授权 /sp.specify；保存结果只供 /sp.prd 继续完善 PRD 和 Outline。");
  view.appendChild(banner);
  for (const question of group?.questions || []) view.appendChild(renderOutlineDiscoveryQuestion(question));
  renderOutlineDiscoveryGroups();
  updateOutlineDiscoveryProgress();
}

function renderOutlineDiscoveryQuestion(question) {
  const response = outlineDiscoveryResponse(question.id);
  const card = create("article", "discovery-question");
  const heading = create("div", "discovery-question-heading");
  appendText(heading, "span", question.target_kind || "business", "discovery-target-kind");
  appendText(heading, "h3", question.prompt || question.id);
  appendText(heading, "p", question.context || "");
  card.appendChild(heading);

  const candidates = create("div", "discovery-candidates");
  for (const candidate of question.candidates || []) {
    const recommended = (question.recommended_candidate_ids || []).includes(candidate.id);
    const label = create("label", `discovery-candidate${recommended ? " recommended" : ""}`);
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `discovery-${question.id}`;
    input.value = candidate.id;
    input.checked = response.candidate_id === candidate.id;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      response.operation = "confirm_candidate";
      response.candidate_id = candidate.id;
      response.target_id = null;
      response.value = "";
      response.none_of_the_above = false;
      saveOutlineDiscoveryState("候选方向已保存为探索草稿。");
      renderOutlineDiscoveryCurrentGroup();
    });
    label.appendChild(input);
    const copy = create("span", "discovery-candidate-copy");
    const title = create("span", "discovery-candidate-title");
    appendText(title, "strong", candidate.label || candidate.id);
    if (recommended) appendText(title, "span", "推荐", "discovery-recommended-badge");
    copy.appendChild(title);
    appendText(copy, "span", candidate.value || "");
    appendText(copy, "small", candidate.rationale || "");
    label.appendChild(copy);
    candidates.appendChild(label);
  }
  card.appendChild(candidates);

  const recommendation = create("p", "discovery-recommendation");
  recommendation.textContent = `推荐理由：${question.recommendation_reason || "未提供"}`;
  card.appendChild(recommendation);

  const direct = create("section", "discovery-direct-input");
  appendText(direct, "h4", question.free_input?.label || "直接补充业务需求");
  const fields = create("div", "discovery-input-grid");
  const operationLabel = create("label", "discovery-field");
  appendText(operationLabel, "span", "本次操作");
  const operation = document.createElement("select");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "请选择操作";
  operation.appendChild(placeholder);
  for (const value of OUTLINE_DISCOVERY_OPERATIONS) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = OUTLINE_DISCOVERY_OPERATION_LABELS[value];
    option.disabled = !(question.free_input?.allowed_operations || []).includes(value);
    operation.appendChild(option);
  }
  operation.value = response.operation || "";
  operation.addEventListener("change", () => {
    response.operation = operation.value;
    normalizeOutlineDiscoveryDraftForOperation(response);
    saveOutlineDiscoveryState("操作类型已保存为探索草稿。");
    renderOutlineDiscoveryCurrentGroup();
  });
  operationLabel.appendChild(operation);
  fields.appendChild(operationLabel);

  const targetLabel = create("label", "discovery-field");
  appendText(targetLabel, "span", "要替换或排除的已有条目 ID（需要时填写）");
  const target = document.createElement("input");
  target.type = "text";
  target.value = response.target_id || "";
  target.placeholder = "例如 goal-primary";
  target.addEventListener("change", () => {
    response.target_id = target.value.trim() || null;
    if (response.target_id && response.operation === "exclude") response.candidate_id = null;
    saveOutlineDiscoveryState();
    updateOutlineDiscoveryProgress();
  });
  targetLabel.appendChild(target);
  fields.appendChild(targetLabel);
  direct.appendChild(fields);

  const valueLabel = create("label", "discovery-field discovery-value-field");
  appendText(valueLabel, "span", "直接输入真实业务信息");
  const value = document.createElement("textarea");
  value.rows = 4;
  value.value = response.value || "";
  value.placeholder = "写下候选没有覆盖的目标、用户、问题、范围或背景。";
  value.addEventListener("change", () => {
    response.value = value.value.trim();
    if (response.value && (!response.operation || response.operation === "confirm_candidate")) {
      response.operation = "add";
      normalizeOutlineDiscoveryDraftForOperation(response);
    }
    saveOutlineDiscoveryState("直接输入已保存为探索草稿。");
    renderOutlineDiscoveryCurrentGroup();
  });
  valueLabel.appendChild(value);
  direct.appendChild(valueLabel);

  const noneLabel = create("label", "discovery-none-option");
  const none = document.createElement("input");
  none.type = "checkbox";
  none.checked = response.none_of_the_above === true;
  none.addEventListener("change", () => {
    response.none_of_the_above = none.checked;
    if (none.checked) {
      response.candidate_id = null;
      response.target_id = null;
      if (response.operation !== "context_note") response.operation = "add";
    }
    saveOutlineDiscoveryState("“以上都不符合”状态已保存。");
    renderOutlineDiscoveryCurrentGroup();
  });
  noneLabel.appendChild(none);
  appendText(noneLabel, "span", "以上候选都不符合，我会直接输入真实需求");
  direct.appendChild(noneLabel);
  card.appendChild(direct);
  return card;
}

function renderOutlineDiscoveryRail() {
  const nodeList = $("node-list");
  nodeList.replaceChildren();
  const panel = create("section", "panel discovery-route-panel");
  appendText(panel, "h3", "保存后发生什么");
  appendText(panel, "p", "页面下载 outline-discovery-response JSON。把该文件交给 /sp.prd 后，命令会验证并追加 intent ledger，再用来源标签更新 PRD/Outline。");
  appendText(panel, "strong", "不会发生什么");
  appendText(panel, "p", "不会生成 Outline confirmation，不会把模型候选当成事实，也不会允许 /sp.specify 继续。", "error");
  nodeList.appendChild(panel);
}

function downloadOutlineDiscoveryResponse() {
  if (!window.SpecCompassDiscoveryResponsePackage) {
    setStatus("探索响应模块未加载，请刷新页面后重试。", true);
    return;
  }
  const responses = outlineDiscoveryQuestions()
    .map((question) => outlineDiscoveryState.responses[question.id])
    .filter(isMeaningfulOutlineDiscoveryResponse);
  if (!responses.length) {
    setStatus("至少回应一个探索问题后再保存。你可以选择候选，也可以直接输入业务信息。", true);
    return;
  }
  let result;
  try {
    result = window.SpecCompassDiscoveryResponsePackage.downloadDiscoveryResponse({
      review_data: reviewData,
      responses
    });
  } catch (error) {
    setStatus(`探索响应生成失败：${error.message || error}`, true);
    return;
  }
  outlineDiscoveryState.meta.downloaded_filename = result.filename;
  saveOutlineDiscoveryState(
    `已保存 ${responses.length} 条探索回应并下载 ${result.filename}。请交回 /sp.prd 继续完善。`,
    { downloaded: true }
  );
  $("download-package-links").classList.remove("hidden");
  $("download-package-links").textContent = `已下载：${result.filename}；authorization_effect = none`;
}
