/* PRD Outline discovery: XMind-like maps first, node-scoped decisions second. */
const OUTLINE_DISCOVERY_OPERATIONS = ["confirm_candidate", "add", "replace", "exclude", "context_note"];
const OUTLINE_DISCOVERY_OPERATION_LABELS = {
  confirm_candidate: "确认一个候选方向",
  add: "新增业务需求",
  replace: "替换已有判断",
  exclude: "明确排除",
  context_note: "补充背景信息"
};
let outlineDiscoveryActiveMapId = null;
let outlineDiscoveryActiveNodeId = null;
let outlineDiscoveryState = { responses: {}, meta: {} };

function outlineDiscoveryStorageKey(data = reviewData) {
  return `speccompass-outline-discovery:${data?.project?.feature || "feature"}:${reviewDataIdentifier(data)}:${data?.batch_id || "batch"}`;
}

function loadOutlineDiscoveryState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(outlineDiscoveryStorageKey()) || "{}");
    outlineDiscoveryState = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    outlineDiscoveryState = {};
  }
  if (!outlineDiscoveryState.responses || typeof outlineDiscoveryState.responses !== "object") outlineDiscoveryState.responses = {};
  if (!outlineDiscoveryState.meta || typeof outlineDiscoveryState.meta !== "object") outlineDiscoveryState.meta = {};
}

function saveOutlineDiscoveryState(message = "探索草稿已保存在当前浏览器。", options = {}) {
  try {
    const savedAt = new Date().toISOString();
    outlineDiscoveryState.meta.updated_at = savedAt;
    outlineDiscoveryState.meta.active_map_id = outlineDiscoveryActiveMapId;
    outlineDiscoveryState.meta.active_node_id = outlineDiscoveryActiveNodeId;
    if (options.downloaded === true) outlineDiscoveryState.meta.downloaded_at = savedAt;
    localStorage.setItem(outlineDiscoveryStorageKey(), JSON.stringify(outlineDiscoveryState));
    setStatus(`${message} 这不是授权，下一步仍是 /sp.prd。`);
    return true;
  } catch {
    setStatus("浏览器未能保存探索草稿；请尽快下载响应文件。此页面不会授权 /sp.specify。", true);
    return false;
  }
}

function outlineDiscoveryMaps(data = reviewData) {
  return Array.isArray(data?.maps) ? data.maps : [];
}

function outlineDiscoveryNodes(data = reviewData) {
  return Array.isArray(data?.outline_nodes) ? data.outline_nodes : [];
}

function outlineDiscoveryMap(mapId, data = reviewData) {
  return outlineDiscoveryMaps(data).find((map) => map.map_id === mapId) || null;
}

function outlineDiscoveryNodesForMap(mapId, data = reviewData) {
  return outlineDiscoveryNodes(data).filter((node) => node.map_id === mapId);
}

function outlineDiscoveryNode(nodeId, data = reviewData) {
  return outlineDiscoveryNodes(data).find((node) => node.node_id === nodeId) || null;
}

function outlineDiscoveryQuestions(data = reviewData) {
  return (data?.question_groups || []).flatMap((group) => group.questions || []);
}

function outlineDiscoveryQuestionsForNode(nodeId, data = reviewData) {
  return outlineDiscoveryQuestions(data).filter((question) => question.outline_node_id === nodeId);
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
  return Boolean(response?.operation || response?.candidate_id || response?.target_id || String(response?.value || "").trim() || response?.none_of_the_above);
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
    response.target_id = null; response.value = ""; response.none_of_the_above = false;
  } else if (response.operation === "add") {
    response.candidate_id = null; response.target_id = null;
  } else if (response.operation === "replace") {
    response.candidate_id = null; response.none_of_the_above = false;
  } else if (response.operation === "exclude") {
    response.none_of_the_above = false;
    if (response.candidate_id && response.target_id) response.target_id = null;
  } else if (response.operation === "context_note") {
    response.candidate_id = null; response.target_id = null; response.none_of_the_above = false;
  }
}

function updateOutlineDiscoveryProgress() {
  const questions = outlineDiscoveryQuestions();
  const completed = questions.filter((question) => isMeaningfulOutlineDiscoveryResponse(outlineDiscoveryState.responses[question.id])).length;
  $("rail-summary").textContent = `已回应 ${completed}/${questions.length} 个探索问题。先看导图，再按节点补充；每次输出都只回到 /sp.prd。`;
  $("live-status").textContent = `探索成熟度：${reviewData?.outline_maturity || "explore"}；授权效果：none。`;
}

function leaveOutlineDiscoveryMode() {
  document.body.classList.remove("outline-discovery-mode");
  if (typeof clearPackageDownloadLinks === "function") {
    clearPackageDownloadLinks();
  }
  $("priority-filters")?.classList.remove("hidden");
  document.querySelector(".rail-actions")?.classList.remove("hidden");
  $("copy-summary")?.classList.remove("hidden");
  $("download-package").textContent = "下载确认包";
  $("page-note").textContent = "统一确认页只展示结构化 review data；正式授权需要写回 confirmation 文档。";
}

function renderOutlineDiscovery(data = reviewData) {
  document.body.classList.add("outline-discovery-mode");
  loadOutlineDiscoveryState();
  const maps = outlineDiscoveryMaps(data);
  outlineDiscoveryActiveMapId = outlineDiscoveryState.meta?.active_map_id || maps[0]?.map_id || null;
  if (!outlineDiscoveryMap(outlineDiscoveryActiveMapId, data)) outlineDiscoveryActiveMapId = maps[0]?.map_id || null;
  const activeMap = outlineDiscoveryMap(outlineDiscoveryActiveMapId, data);
  outlineDiscoveryActiveNodeId = outlineDiscoveryState.meta?.active_node_id || activeMap?.root_node_id || null;
  if (!outlineDiscoveryNode(outlineDiscoveryActiveNodeId, data) || outlineDiscoveryNode(outlineDiscoveryActiveNodeId, data)?.map_id !== outlineDiscoveryActiveMapId) {
    outlineDiscoveryActiveNodeId = activeMap?.root_node_id || null;
  }
  $("page-title").textContent = `SpecCompass - ${data.project?.name || "项目"} / Outline 探索`;
  $("page-note").textContent = "先看项目全局，再进入业务分图或全局约束图；保存结果只回到 /sp.prd，不会授权 /sp.specify。";
  $("project-overview").textContent = data.project?.current_understanding || "尚未形成稳定产品框架。";
  $("data-warnings").classList.add("hidden");
  $("download-package").textContent = "保存并继续完善";
  $("copy-summary").classList.add("hidden");
  $("priority-filters").classList.add("hidden");
  document.querySelector(".rail-actions")?.classList.add("hidden");
  const steps = $("authorization-steps");
  steps.replaceChildren();
  for (const text of [
    "点击节点查看该分支的问题；一级、二级由你补充，三级再按 Constitution 生成。",
    "点击地图入口可下钻；政策、合规和治理统一放在全局约束图，并标出影响的业务节点。",
    "保存后下载结构化探索响应，再交回 /sp.prd；本页没有授权能力。"
  ]) appendText(steps, "li", text);
  renderOutlineDiscoveryMaps();
  renderOutlineDiscoveryCurrentMap();
  renderOutlineDiscoveryRail();
  updateOutlineDiscoveryProgress();
}

function renderOutlineDiscoveryMaps() {
  const list = $("module-list");
  list.replaceChildren();
  list.classList.add("discovery-map-list");
  for (const map of outlineDiscoveryMaps()) {
    const nodes = outlineDiscoveryNodesForMap(map.map_id);
    const questions = nodes.flatMap((node) => outlineDiscoveryQuestionsForNode(node.node_id));
    const completed = questions.filter((question) => isMeaningfulOutlineDiscoveryResponse(outlineDiscoveryState.responses[question.id])).length;
    const button = create("button", "module-button discovery-map-button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(map.map_id === outlineDiscoveryActiveMapId));
    appendText(button, "strong", map.title || map.map_id);
    appendText(button, "span", map.summary || "");
    appendText(button, "span", `${completed}/${questions.length} 个问题已回应`, "discovery-progress-badge");
    appendText(button, "span", `${nodes.length} 个节点`, "discovery-map-count");
    button.addEventListener("click", () => openOutlineDiscoveryMap(map.map_id));
    list.appendChild(button);
  }
}

function openOutlineDiscoveryMap(mapId) {
  const map = outlineDiscoveryMap(mapId);
  if (!map) return;
  outlineDiscoveryActiveMapId = mapId;
  outlineDiscoveryActiveNodeId = map.root_node_id;
  saveOutlineDiscoveryState("已切换导图。");
  renderOutlineDiscoveryMaps();
  renderOutlineDiscoveryCurrentMap();
  renderOutlineDiscoveryRail();
}

function selectOutlineDiscoveryNode(nodeId) {
  const node = outlineDiscoveryNode(nodeId);
  if (!node || node.map_id !== outlineDiscoveryActiveMapId) return;
  outlineDiscoveryActiveNodeId = nodeId;
  saveOutlineDiscoveryState("已选中导图节点。");
  renderOutlineDiscoveryMaps();
  renderOutlineDiscoveryCurrentMap();
  renderOutlineDiscoveryRail();
}

function renderOutlineDiscoveryCurrentMap() {
  const maps = outlineDiscoveryMaps();
  const map = outlineDiscoveryMap(outlineDiscoveryActiveMapId);
  const mapIndex = Math.max(0, maps.findIndex((entry) => entry.map_id === outlineDiscoveryActiveMapId));
  $("module-position").textContent = maps.length ? `导图 ${mapIndex + 1}/${maps.length}` : "导图 0/0";
  $("prev-module").disabled = mapIndex <= 0;
  $("next-module").disabled = !maps.length || mapIndex >= maps.length - 1;
  $("prev-module").onclick = () => openOutlineDiscoveryMap(maps[Math.max(0, mapIndex - 1)]?.map_id);
  $("next-module").onclick = () => openOutlineDiscoveryMap(maps[Math.min(maps.length - 1, mapIndex + 1)]?.map_id);
  $("module-title").textContent = map?.title || "Outline 导图";
  $("module-summary").textContent = map?.summary || reviewData.project?.discovery_goal || "继续补齐产品事实。";
  $("item-title").textContent = "项目全局思维导图";
  $("item-summary").textContent = "根节点保持稳定，分支节点承载业务语义；点击节点后，右侧只显示该节点绑定的问题。";
  $("item-tabs").replaceChildren();
  const view = $("diagram-view");
  view.replaceChildren();
  const banner = create("section", "discovery-non-authorizing-banner");
  appendText(banner, "strong", "探索模式");
  appendText(banner, "span", "不会授权 /sp.specify；地图和选择结果只供 /sp.prd 继续完善 PRD 和 Outline。");
  view.appendChild(banner);
  view.appendChild(renderOutlineDiscoveryMindmap(map));
}

function renderOutlineDiscoveryMindmap(map) {
  const canvas = create("div", "discovery-mindmap");
  if (!map) {
    appendText(canvas, "p", "暂无可展示的导图。", "error");
    return canvas;
  }
  const nodes = outlineDiscoveryNodesForMap(map.map_id);
  const levels = new Map();
  for (const node of nodes) {
    let depth = 1;
    let parent = node.parent_node_id ? outlineDiscoveryNode(node.parent_node_id) : null;
    while (parent && depth < 4) {
      depth += 1;
      parent = parent.parent_node_id ? outlineDiscoveryNode(parent.parent_node_id) : null;
    }
    if (!levels.has(depth)) levels.set(depth, []);
    levels.get(depth).push(node);
  }
  canvas.dataset.levelCount = String(levels.size || 1);
  for (const depth of [...levels.keys()].sort((a, b) => a - b)) {
    const level = create("div", `discovery-mindmap-level level-${depth}`);
    for (const node of levels.get(depth)) level.appendChild(renderOutlineDiscoveryNode(node));
    canvas.appendChild(level);
  }
  const hint = create("p", "discovery-mindmap-hint");
  hint.textContent = "节点数量和层级由 review data 的密度预算控制；手机端可横向滚动查看完整分支。";
  canvas.appendChild(hint);
  return canvas;
}

function renderOutlineDiscoveryNode(node) {
  const questions = outlineDiscoveryQuestionsForNode(node.node_id);
  const completed = questions.filter((question) => isMeaningfulOutlineDiscoveryResponse(outlineDiscoveryState.responses[question.id])).length;
  const button = create("button", `discovery-mindmap-node${node.node_id === outlineDiscoveryActiveNodeId ? " is-selected" : ""}`);
  button.type = "button";
  button.dataset.sourceStatus = node.source_status || "unresolved";
  button.dataset.nodeId = node.node_id;
  appendText(button, "strong", node.label || node.node_id);
  appendText(button, "span", node.summary || "");
  const meta = create("small", "discovery-node-meta");
  appendText(meta, "span", node.source_status || "unresolved", "discovery-source-status");
  appendText(meta, "span", questions.length ? `${completed}/${questions.length} 个问题` : "无待回应问题");
  button.appendChild(meta);
  if (node.child_map_id) appendText(button, "span", "进入分图 ↗", "discovery-map-link");
  if (Array.isArray(node.affected_node_ids) && node.affected_node_ids.length) {
    const affected = create("span", "discovery-affected-count");
    affected.textContent = `影响 ${node.affected_node_ids.length} 个节点`;
    button.appendChild(affected);
  }
  button.addEventListener("click", () => {
    if (node.child_map_id) openOutlineDiscoveryMap(node.child_map_id);
    else selectOutlineDiscoveryNode(node.node_id);
  });
  return button;
}

function renderOutlineDiscoveryRail() {
  updateOutlineDiscoveryProgress();
  const nodeList = $("node-list");
  nodeList.replaceChildren();
  const node = outlineDiscoveryNode(outlineDiscoveryActiveNodeId);
  const panel = create("section", "panel discovery-node-panel");
  if (!node) {
    appendText(panel, "h3", "选择一个导图节点");
    appendText(panel, "p", "先从项目全局图或左侧分图导航中选择节点。");
    nodeList.appendChild(panel);
    return;
  }
  appendText(panel, "span", node.source_status || "unresolved", "discovery-source-status");
  appendText(panel, "h3", node.label || node.node_id);
  appendText(panel, "p", node.summary || "");
  if (Array.isArray(node.affected_node_ids) && node.affected_node_ids.length) {
    appendText(panel, "h4", "影响范围");
    const affected = create("div", "discovery-affected-nodes");
    for (const affectedId of node.affected_node_ids) {
      const affectedNode = outlineDiscoveryNode(affectedId);
      if (affectedNode) appendText(affected, "span", affectedNode.label || affectedId);
    }
    panel.appendChild(affected);
  }
  nodeList.appendChild(panel);
  renderOutlineDiscoveryNodeQuestions(node, nodeList);
}

function renderOutlineDiscoveryNodeQuestions(node, nodeList = $("node-list")) {
  const questions = outlineDiscoveryQuestions().filter((question) => question.outline_node_id === outlineDiscoveryActiveNodeId);
  if (!questions.length) {
    const empty = create("section", "panel discovery-empty-panel");
    appendText(empty, "p", node.child_map_id ? "该节点是分图入口，点击节点即可进入下一张图。" : "该节点当前没有单独问题；它的语义来自来源和相邻分支。", "discovery-empty-copy");
    nodeList.appendChild(empty);
    return;
  }
  const questionPanel = create("section", "discovery-question-panel");
  appendText(questionPanel, "h3", "只确认这个节点");
  appendText(questionPanel, "p", "候选只是模型建议。请选择、排除或直接输入；未被选择的候选仍是 [src:ai-proposed]。", "discovery-panel-note");
  for (const question of questions) questionPanel.appendChild(renderOutlineDiscoveryQuestion(question));
  nodeList.appendChild(questionPanel);
}

function renderOutlineDiscoveryQuestion(question) {
  const response = outlineDiscoveryResponse(question.id);
  const card = create("article", "discovery-question");
  const heading = create("div", "discovery-question-heading");
  appendText(heading, "span", question.target_kind || "business", "discovery-target-kind");
  appendText(heading, "h4", question.prompt || question.id);
  appendText(heading, "p", question.context || "");
  card.appendChild(heading);
  const candidates = create("div", "discovery-candidates");
  for (const candidate of question.candidates || []) {
    const recommended = (question.recommended_candidate_ids || []).includes(candidate.id);
    const label = create("label", `discovery-candidate${recommended ? " recommended" : ""}`);
    const input = document.createElement("input");
    input.type = "radio"; input.name = `discovery-${question.id}`; input.value = candidate.id; input.checked = response.candidate_id === candidate.id;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      response.operation = "confirm_candidate"; response.candidate_id = candidate.id; response.target_id = null; response.value = ""; response.none_of_the_above = false;
      saveOutlineDiscoveryState("候选方向已保存为探索草稿。"); renderOutlineDiscoveryMaps(); renderOutlineDiscoveryCurrentMap(); renderOutlineDiscoveryRail();
    });
    label.appendChild(input);
    const copy = create("span", "discovery-candidate-copy");
    const title = create("span", "discovery-candidate-title");
    appendText(title, "strong", candidate.label || candidate.id);
    if (recommended) appendText(title, "span", "推荐", "discovery-recommended-badge");
    copy.appendChild(title); appendText(copy, "span", candidate.value || ""); appendText(copy, "small", candidate.rationale || "");
    label.appendChild(copy); candidates.appendChild(label);
  }
  card.appendChild(candidates);
  const recommendation = create("p", "discovery-recommendation");
  recommendation.textContent = `推荐理由：${question.recommendation_reason || "未提供"}`;
  card.appendChild(recommendation);
  const direct = create("section", "discovery-direct-input");
  appendText(direct, "h4", question.free_input?.label || "直接补充业务需求");
  const fields = create("div", "discovery-input-grid");
  const operationLabel = create("label", "discovery-field"); appendText(operationLabel, "span", "本次操作");
  const operation = document.createElement("select");
  const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "请选择操作"; operation.appendChild(placeholder);
  for (const value of OUTLINE_DISCOVERY_OPERATIONS) {
    const option = document.createElement("option"); option.value = value; option.textContent = OUTLINE_DISCOVERY_OPERATION_LABELS[value]; option.disabled = !(question.free_input?.allowed_operations || []).includes(value); operation.appendChild(option);
  }
  operation.value = response.operation || "";
  operation.addEventListener("change", () => { response.operation = operation.value; normalizeOutlineDiscoveryDraftForOperation(response); saveOutlineDiscoveryState("操作类型已保存为探索草稿。"); renderOutlineDiscoveryRail(); });
  operationLabel.appendChild(operation); fields.appendChild(operationLabel);
  const targetLabel = create("label", "discovery-field"); appendText(targetLabel, "span", "要替换或排除的已有条目 ID（需要时填写）");
  const target = document.createElement("input"); target.type = "text"; target.value = response.target_id || ""; target.placeholder = "例如 goal-primary";
  target.addEventListener("change", () => { response.target_id = target.value.trim() || null; if (response.target_id && response.operation === "exclude") response.candidate_id = null; saveOutlineDiscoveryState(); updateOutlineDiscoveryProgress(); });
  targetLabel.appendChild(target); fields.appendChild(targetLabel); direct.appendChild(fields);
  const valueLabel = create("label", "discovery-field discovery-value-field"); appendText(valueLabel, "span", "直接输入真实业务信息");
  const value = document.createElement("textarea"); value.rows = 4; value.value = response.value || ""; value.placeholder = "写下候选没有覆盖的目标、用户、问题、范围或背景。";
  value.addEventListener("change", () => { response.value = value.value.trim(); if (response.value && (!response.operation || response.operation === "confirm_candidate")) { response.operation = "add"; normalizeOutlineDiscoveryDraftForOperation(response); } saveOutlineDiscoveryState("直接输入已保存为探索草稿。"); renderOutlineDiscoveryRail(); });
  valueLabel.appendChild(value); direct.appendChild(valueLabel);
  const noneLabel = create("label", "discovery-none-option"); const none = document.createElement("input"); none.type = "checkbox"; none.checked = response.none_of_the_above === true;
  none.addEventListener("change", () => { response.none_of_the_above = none.checked; if (none.checked) { response.candidate_id = null; response.target_id = null; if (response.operation !== "context_note") response.operation = "add"; } saveOutlineDiscoveryState("“以上都不符合”状态已保存。"); renderOutlineDiscoveryRail(); });
  noneLabel.appendChild(none); appendText(noneLabel, "span", "以上候选都不符合，我会直接输入真实需求"); direct.appendChild(noneLabel); card.appendChild(direct);
  return card;
}

function downloadOutlineDiscoveryResponse() {
  if (!window.SpecCompassDiscoveryResponsePackage) { setStatus("探索响应模块未加载，请刷新页面后重试。", true); return; }
  const responses = outlineDiscoveryQuestions().map((question) => outlineDiscoveryState.responses[question.id]).filter(isMeaningfulOutlineDiscoveryResponse);
  if (!responses.length) { setStatus("至少回应一个探索问题后再保存。你可以选择候选，也可以直接输入业务信息。", true); return; }
  let result;
  try { result = window.SpecCompassDiscoveryResponsePackage.downloadDiscoveryResponse({ review_data: reviewData, responses }); }
  catch (error) { setStatus(`探索响应生成失败：${error.message || error}`, true); return; }
  outlineDiscoveryState.meta.downloaded_filename = result.filename;
  saveOutlineDiscoveryState(`已保存 ${responses.length} 条探索回应并下载 ${result.filename}。请交回 /sp.prd 继续完善。`, { downloaded: true });
  $("download-package-links").classList.remove("hidden");
  $("download-package-links").textContent = `已下载：${result.filename}；authorization_effect = none`;
}
