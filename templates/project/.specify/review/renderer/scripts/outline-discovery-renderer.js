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
let outlineDiscoveryConstitutionOpen = false;
let outlineDiscoveryConnectorObserver = null;
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

function outlineDiscoveryBusinessContext(data = reviewData) {
  return data?.business_context || {};
}

function outlineDiscoveryBusinessTitle(data = reviewData) {
  const subject = outlineDiscoveryBusinessContext(data).product_subject;
  return subject?.label || data?.project?.name || "业务全景";
}

function outlineDiscoveryBusinessSummary(data = reviewData, map = null) {
  const context = outlineDiscoveryBusinessContext(data);
  const chains = Array.isArray(context.business_chains) ? context.business_chains : [];
  const mapChainIds = new Set(
    map
      ? outlineDiscoveryNodesForMap(map.map_id, data).flatMap((node) => node.business_chain_refs || [])
      : []
  );
  const chain = chains.find((candidate) => mapChainIds.has(candidate.chain_id)) || chains[0] || null;
  if (!chain) return context.product_subject?.summary || data?.project?.current_understanding || "尚未形成可追溯的业务闭环。";
  const operations = new Map((context.operations || []).map((operation) => [operation.operation_id, operation.label]));
  const outcomes = new Map((context.outcomes || []).map((outcome) => [outcome.outcome_id, outcome.label]));
  const action = (chain.operation_refs || []).map((id) => operations.get(id)).filter(Boolean).join("、");
  const result = (chain.outcome_refs || []).map((id) => outcomes.get(id)).filter(Boolean).join("、");
  return [chain.trigger_or_input, action, result].filter(Boolean).join(" → ") || chain.label;
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
  outlineDiscoveryConstitutionOpen = false;
  const maps = outlineDiscoveryMaps(data);
  outlineDiscoveryActiveMapId = outlineDiscoveryState.meta?.active_map_id || maps[0]?.map_id || null;
  if (!outlineDiscoveryMap(outlineDiscoveryActiveMapId, data)) outlineDiscoveryActiveMapId = maps[0]?.map_id || null;
  const activeMap = outlineDiscoveryMap(outlineDiscoveryActiveMapId, data);
  outlineDiscoveryActiveNodeId = outlineDiscoveryState.meta?.active_node_id || activeMap?.root_node_id || null;
  if (!outlineDiscoveryNode(outlineDiscoveryActiveNodeId, data) || outlineDiscoveryNode(outlineDiscoveryActiveNodeId, data)?.map_id !== outlineDiscoveryActiveMapId) {
    outlineDiscoveryActiveNodeId = activeMap?.root_node_id || null;
  }
  $("page-title").textContent = `SpecCompass - ${data.project?.name || "项目"} / Outline 探索`;
  $("page-note").textContent = "先核对产品实际处理的业务，再进入分支补充；保存结果只回到 /sp.prd，不会授权 /sp.specify。";
  $("project-overview").textContent = outlineDiscoveryBusinessSummary(data);
  $("data-warnings").classList.add("hidden");
  $("download-package").textContent = "保存并继续完善";
  $("copy-summary").classList.add("hidden");
  $("priority-filters").classList.add("hidden");
  document.querySelector(".rail-actions")?.classList.add("hidden");
  const steps = $("authorization-steps");
  steps.replaceChildren();
  for (const text of [
    "先核对业务闭环和能力分支，再点击节点查看与该业务有关的问题。",
    "一级、二级需要你确认或补充；更细内容只能依据已确认业务事实继续展开。",
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
    button.setAttribute("aria-pressed", String(!outlineDiscoveryConstitutionOpen && map.map_id === outlineDiscoveryActiveMapId));
    appendText(button, "strong", map.title || map.map_id);
    appendText(button, "span", map.summary || "");
    appendText(button, "span", `${completed}/${questions.length} 个问题已回应`, "discovery-progress-badge");
    appendText(button, "span", `${nodes.length} 个节点`, "discovery-map-count");
    button.addEventListener("click", () => openOutlineDiscoveryMap(map.map_id));
    list.appendChild(button);
  }
  const constitutionButton = create("button", "module-button discovery-constitution-button");
  constitutionButton.type = "button";
  constitutionButton.setAttribute("aria-pressed", String(outlineDiscoveryConstitutionOpen));
  appendText(constitutionButton, "strong", "Constitution");
  appendText(constitutionButton, "span", "按需查看项目治理条款，不参与业务确认。", "discovery-constitution-button-copy");
  appendText(constitutionButton, "span", "只读治理参考", "discovery-read-only-badge");
  constitutionButton.addEventListener("click", openOutlineDiscoveryConstitution);
  list.appendChild(constitutionButton);
}

function openOutlineDiscoveryMap(mapId) {
  const map = outlineDiscoveryMap(mapId);
  if (!map) return;
  outlineDiscoveryConstitutionOpen = false;
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
  outlineDiscoveryConstitutionOpen = false;
  outlineDiscoveryActiveNodeId = nodeId;
  saveOutlineDiscoveryState("已选中导图节点。");
  renderOutlineDiscoveryMaps();
  renderOutlineDiscoveryCurrentMap();
  renderOutlineDiscoveryRail();
}

function openOutlineDiscoveryConstitution() {
  outlineDiscoveryConstitutionOpen = true;
  renderOutlineDiscoveryMaps();
  renderOutlineDiscoveryCurrentMap();
  renderOutlineDiscoveryRail();
  $("live-status").textContent = "正在查看只读 Constitution；返回任一导图可继续探索。";
}

function renderOutlineDiscoveryCurrentMap() {
  if (outlineDiscoveryConstitutionOpen) {
    renderOutlineDiscoveryConstitutionView();
    return;
  }
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
  $("item-title").textContent = outlineDiscoveryBusinessTitle();
  $("item-summary").textContent = outlineDiscoveryBusinessSummary(reviewData, map);
  $("item-tabs").replaceChildren();
  const view = $("diagram-view");
  view.replaceChildren();
  const banner = create("section", "discovery-non-authorizing-banner");
  appendText(banner, "strong", "探索模式");
  appendText(banner, "span", "不会授权 /sp.specify；地图和选择结果只供 /sp.prd 继续完善 PRD 和 Outline。");
  view.appendChild(banner);
  const businessContext = create("section", "discovery-business-context");
  appendText(businessContext, "span", "业务闭环", "discovery-context-label");
  appendText(businessContext, "strong", outlineDiscoveryBusinessTitle());
  appendText(businessContext, "p", outlineDiscoveryBusinessSummary(reviewData, map));
  view.appendChild(businessContext);
  view.appendChild(renderOutlineDiscoveryMindmap(map));
}

function renderOutlineDiscoveryConstitutionView() {
  const constitution = reviewData?.constitution_snapshot || {};
  $("module-position").textContent = "治理参考";
  $("prev-module").disabled = true;
  $("next-module").disabled = true;
  $("prev-module").onclick = null;
  $("next-module").onclick = null;
  $("module-title").textContent = "Constitution";
  $("module-summary").textContent = "项目级治理条款只在需要时查看，不占用日常节点确认空间。";
  $("item-title").textContent = "项目治理章程";
  $("item-summary").textContent = constitution.availability === "available"
    ? "以下内容来自只读 Constitution 快照，不会生成确认问题或修改业务 Outline。"
    : "当前未找到 Constitution；此状态不影响业务能力图的生成。";
  $("item-tabs").replaceChildren();
  const view = $("diagram-view");
  view.replaceChildren();
  const panel = renderOutlineDiscoveryConstitution();
  panel.classList.add("is-main-view");
  view.appendChild(panel);
}

function renderOutlineDiscoveryConstitution(data = reviewData) {
  const constitution = data?.constitution_snapshot || {};
  const constitutionClauses = Array.isArray(constitution.clauses) ? constitution.clauses : [];
  const panel = create("section", "discovery-constitution-panel");
  const header = create("div", "discovery-constitution-header");
  const heading = create("div");
  appendText(heading, "span", "项目治理", "discovery-context-label");
  appendText(heading, "h3", "Constitution", "discovery-constitution-title");
  header.appendChild(heading);
  appendText(header, "span", "只读", "discovery-read-only-badge");
  panel.appendChild(header);
  appendText(panel, "p", constitution.source_path || ".specify/memory/constitution.md", "discovery-constitution-source");

  if (constitution.availability === "available") {
    const overview = create("div", "discovery-constitution-overview");
    const applicableCount = constitutionClauses.filter((clause) => clause.applicability_status === "applicable").length;
    const possibleCount = constitutionClauses.filter((clause) => clause.applicability_status === "possibly_applicable").length;
    for (const [label, value] of [
      ["条款总数", constitutionClauses.length],
      ["直接适用", applicableCount],
      ["可能适用", possibleCount]
    ]) {
      const metric = create("div", "discovery-constitution-metric");
      appendText(metric, "span", label);
      appendText(metric, "strong", String(value));
      overview.appendChild(metric);
    }
    panel.appendChild(overview);
    const metadata = create("dl", "discovery-constitution-metadata");
    appendOutlineDiscoveryConstitutionDetail(metadata, "快照状态", "已加载项目 Constitution");
    appendOutlineDiscoveryConstitutionDetail(metadata, "展示方式", "按需打开 · 只读");
    appendOutlineDiscoveryConstitutionDetail(metadata, "作用范围", "项目治理与风险边界，不替代业务需求证据");
    panel.appendChild(metadata);
    appendText(
      panel,
      "p",
      "治理条款仅用于解释项目级约束和风险边界，不作为业务需求证据，也不会自动生成、合并或否决 Outline 节点。",
      "discovery-constitution-boundary"
    );
    const clauses = create("div", "discovery-constitution-clauses");
    if (constitutionClauses.length) {
      for (const clause of constitutionClauses) {
        const item = create("article", "discovery-constitution-clause");
        const clauseHeader = create("div", "discovery-constitution-clause-header");
        appendText(clauseHeader, "strong", clause.title);
        appendText(
          clauseHeader,
          "span",
          outlineDiscoveryConstitutionApplicabilityLabel(clause.applicability_status),
          `discovery-constitution-status status-${clause.applicability_status || "unknown"}`
        );
        item.appendChild(clauseHeader);
        appendText(item, "p", clause.summary);
        const details = create("dl", "discovery-constitution-details");
        appendOutlineDiscoveryConstitutionDetail(
          details,
          "适用说明",
          outlineDiscoveryConstitutionApplicabilityExplanation(clause.applicability_status)
        );
        appendOutlineDiscoveryConstitutionDetail(details, "条款标识", clause.clause_id || "未提供");
        appendOutlineDiscoveryConstitutionDetail(details, "来源锚点", clause.source_anchor || "未提供");
        const affectedNodes = outlineDiscoveryConstitutionAffectedNodes(clause.clause_id, data);
        appendOutlineDiscoveryConstitutionDetail(
          details,
          "关联节点",
          affectedNodes.length
            ? affectedNodes.map((node) => outlineDiscoveryConstitutionNodeDescription(node, data)).join("；")
            : "尚未映射到具体 Outline 节点；后续若确认该条款直接影响某项能力，应在全局约束节点中建立显式引用。"
        );
        item.appendChild(details);
        clauses.appendChild(item);
      }
    } else {
      appendText(clauses, "p", "当前 Constitution 中没有识别到与此需求直接相关的条款。", "discovery-constitution-empty");
    }
    panel.appendChild(clauses);
  } else {
    appendText(panel, "p", "未找到 Constitution。这里仅展示治理上下文，不影响业务能力图的生成。", "discovery-constitution-empty");
  }
  return panel;
}

function outlineDiscoveryConstitutionApplicabilityLabel(status) {
  return {
    applicable: "直接适用",
    possibly_applicable: "可能适用",
    not_applicable: "当前不适用"
  }[status] || "适用性未知";
}

function outlineDiscoveryConstitutionApplicabilityExplanation(status) {
  return status === "applicable"
    ? "已识别为当前产品范围内的直接治理约束；相关设计与实现需要保留可核验的遵循方式。"
    : status === "possibly_applicable"
      ? "当前业务事实尚不足以确认是否直接生效；当相关范围、数据或风险边界被确认后需要再次核对。"
      : "当前未识别出直接影响，仅作为项目级治理背景保留。";
}

function outlineDiscoveryConstitutionAffectedNodes(clauseId, data = reviewData) {
  if (!clauseId) return [];
  return outlineDiscoveryNodes(data).filter((node) => (
    Array.isArray(node.constitution_clause_refs) && node.constitution_clause_refs.includes(clauseId)
  ));
}

function appendOutlineDiscoveryConstitutionDetail(details, label, value) {
  appendText(details, "dt", label);
  appendText(details, "dd", value);
}

function outlineDiscoveryConstitutionNodeDescription(node, data = reviewData) {
  const map = (data?.maps || []).find((entry) => entry.map_id === node.map_id);
  const location = map?.title || node.map_id || "未标明导图";
  return `${node.label || node.node_id}（${location}）：${node.summary || "未提供节点摘要"}`;
}

function outlineDiscoveryNodeDepth(node, nodesById) {
  let depth = 1;
  let parent = node.parent_node_id ? nodesById.get(node.parent_node_id) : null;
  const visited = new Set([node.node_id]);
  while (parent && !visited.has(parent.node_id)) {
    depth += 1;
    visited.add(parent.node_id);
    parent = parent.parent_node_id ? nodesById.get(parent.parent_node_id) : null;
  }
  return depth;
}

function outlineDiscoveryVisualParent(node, visualDepth, nodesById, visualDepthById) {
  let parent = node.parent_node_id ? nodesById.get(node.parent_node_id) : null;
  const visited = new Set([node.node_id]);
  while (parent && !visited.has(parent.node_id)) {
    if ((visualDepthById.get(parent.node_id) || 1) < visualDepth) return parent;
    visited.add(parent.node_id);
    parent = parent.parent_node_id ? nodesById.get(parent.parent_node_id) : null;
  }
  return null;
}

function alignOutlineDiscoveryParentNodes(connections, nodeElements) {
  for (const element of nodeElements.values()) element.style.transform = "";
  const visualDepths = [...new Set(connections.map((connection) => connection.visualDepth))].sort((a, b) => b - a);
  for (const visualDepth of visualDepths) {
    const groups = new Map();
    for (const connection of connections.filter((entry) => entry.visualDepth === visualDepth)) {
      if (!groups.has(connection.parentId)) groups.set(connection.parentId, []);
      groups.get(connection.parentId).push(connection.childId);
    }
    for (const [parentId, childIds] of groups) {
      const parentElement = nodeElements.get(parentId);
      const childElements = childIds.map((childId) => nodeElements.get(childId)).filter(Boolean);
      if (!parentElement || !childElements.length) continue;
      const parentRect = parentElement.getBoundingClientRect();
      const childCenters = childElements.map((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top + (rect.height / 2);
      });
      const targetCenter = (Math.min(...childCenters) + Math.max(...childCenters)) / 2;
      const parentCenter = parentRect.top + (parentRect.height / 2);
      parentElement.style.transform = `translateY(${targetCenter - parentCenter}px)`;
    }
  }
}

function drawOutlineDiscoveryConnectors(canvas, connections, nodeElements) {
  if (!canvas.isConnected) return;
  const layer = canvas.querySelector(".discovery-mindmap-connectors");
  if (!layer) return;
  alignOutlineDiscoveryParentNodes(connections, nodeElements);
  const canvasRect = canvas.getBoundingClientRect();
  layer.setAttribute("viewBox", `0 0 ${canvasRect.width} ${canvasRect.height}`);
  layer.setAttribute("width", String(canvasRect.width));
  layer.setAttribute("height", String(canvasRect.height));
  layer.replaceChildren();
  const groups = new Map();
  for (const connection of connections) {
    const key = `${connection.visualDepth}:${connection.parentId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(connection);
  }
  const connectionGroups = [...groups.values()];
  for (const groupedConnections of connectionGroups) {
    const firstConnection = groupedConnections[0];
    const parentElement = nodeElements.get(firstConnection.parentId);
    if (!parentElement) continue;
    const parentRect = parentElement.getBoundingClientRect();
    const children = groupedConnections.map((connection) => ({
      connection,
      element: nodeElements.get(connection.childId)
    })).filter((entry) => entry.element);
    if (!children.length) continue;
    const startX = parentRect.right - canvasRect.left;
    const startY = parentRect.top + (parentRect.height / 2) - canvasRect.top;
    const childGeometry = children.map(({ connection, element }) => {
      const childRect = element.getBoundingClientRect();
      return {
        connection,
        endX: childRect.left - canvasRect.left,
        endY: childRect.top + (childRect.height / 2) - canvasRect.top
      };
    });
    const nearestEndX = Math.min(...childGeometry.map((entry) => entry.endX));
    const availableGap = Math.max(0, nearestEndX - startX);
    const peerGroups = connectionGroups.filter((group) => group[0]?.visualDepth === firstConnection.visualDepth);
    const laneIndex = peerGroups.indexOf(groupedConnections);
    const lanePadding = Math.min(10, availableGap * 0.22);
    const laneSpan = Math.max(0, availableGap - (lanePadding * 2));
    const trunkX = startX + lanePadding + (laneSpan * ((laneIndex + 1) / (peerGroups.length + 1)));
    const branchYs = childGeometry.map((entry) => entry.endY);
    const minY = Math.min(startY, ...branchYs);
    const maxY = Math.max(startY, ...branchYs);
    const trunk = document.createElementNS("http://www.w3.org/2000/svg", "path");
    trunk.setAttribute("d", `M ${startX} ${startY} H ${trunkX} M ${trunkX} ${minY} V ${maxY}`);
    trunk.setAttribute("class", `discovery-mindmap-connector discovery-mindmap-trunk connector-level-${firstConnection.visualDepth}`);
    trunk.dataset.parentNodeId = firstConnection.parentId;
    trunk.dataset.childCount = String(childGeometry.length);
    trunk.dataset.laneIndex = String(laneIndex);
    layer.appendChild(trunk);
    for (const { connection, endX, endY } of childGeometry) {
      const branch = document.createElementNS("http://www.w3.org/2000/svg", "path");
      branch.setAttribute("d", `M ${trunkX} ${endY} H ${endX}`);
      branch.setAttribute("class", `discovery-mindmap-connector discovery-mindmap-branch connector-level-${connection.visualDepth}`);
      branch.dataset.parentNodeId = connection.parentId;
      branch.dataset.childNodeId = connection.childId;
      layer.appendChild(branch);
    }
  }
}

function scheduleOutlineDiscoveryConnectors(canvas, connections, nodeElements) {
  outlineDiscoveryConnectorObserver?.disconnect();
  const redraw = () => window.requestAnimationFrame(() => drawOutlineDiscoveryConnectors(canvas, connections, nodeElements));
  redraw();
  if (typeof ResizeObserver === "function") {
    outlineDiscoveryConnectorObserver = new ResizeObserver(redraw);
    outlineDiscoveryConnectorObserver.observe(canvas);
  }
  document.fonts?.ready?.then(redraw);
}

function renderOutlineDiscoveryMindmap(map) {
  const canvas = create("div", "discovery-mindmap");
  if (!map) {
    appendText(canvas, "p", "暂无可展示的导图。", "error");
    return canvas;
  }
  const nodes = outlineDiscoveryNodesForMap(map.map_id);
  const nodesById = new Map(nodes.map((node) => [node.node_id, node]));
  const nodeOrder = new Map(nodes.map((node, index) => [node.node_id, index]));
  const visualDepthById = new Map();
  for (const node of nodes) visualDepthById.set(node.node_id, Math.min(outlineDiscoveryNodeDepth(node, nodesById), 3));
  const levels = new Map();
  for (const node of nodes) {
    const visualDepth = visualDepthById.get(node.node_id);
    if (!levels.has(visualDepth)) levels.set(visualDepth, []);
    levels.get(visualDepth).push(node);
  }
  const levelTwoOrder = new Map((levels.get(2) || []).map((node, index) => [node.node_id, index]));
  if (levels.has(3)) {
    levels.get(3).sort((left, right) => {
      const leftParent = outlineDiscoveryVisualParent(left, 3, nodesById, visualDepthById);
      const rightParent = outlineDiscoveryVisualParent(right, 3, nodesById, visualDepthById);
      const parentDelta = (levelTwoOrder.get(leftParent?.node_id) ?? Number.MAX_SAFE_INTEGER)
        - (levelTwoOrder.get(rightParent?.node_id) ?? Number.MAX_SAFE_INTEGER);
      return parentDelta || (nodeOrder.get(left.node_id) - nodeOrder.get(right.node_id));
    });
  }
  canvas.dataset.levelCount = String(levels.size || 1);
  const connectorLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  connectorLayer.setAttribute("class", "discovery-mindmap-connectors");
  connectorLayer.setAttribute("aria-hidden", "true");
  canvas.appendChild(connectorLayer);
  const connections = [];
  const nodeElements = new Map();
  for (const depth of [...levels.keys()].sort((a, b) => a - b)) {
    const level = create("div", `discovery-mindmap-level level-${depth}`);
    level.dataset.nodeCount = String(levels.get(depth).length);
    for (const node of levels.get(depth)) {
      const visualParent = depth > 1
        ? outlineDiscoveryVisualParent(node, depth, nodesById, visualDepthById)
        : null;
      const nodeElement = renderOutlineDiscoveryNode(node);
      if (visualParent) {
        nodeElement.dataset.parentNodeId = visualParent.node_id;
        connections.push({ parentId: visualParent.node_id, childId: node.node_id, visualDepth: depth });
      }
      nodeElements.set(node.node_id, nodeElement);
      level.appendChild(nodeElement);
    }
    canvas.appendChild(level);
  }
  canvas.dataset.connectionCount = String(connections.length);
  const hint = create("p", "discovery-mindmap-hint");
  hint.textContent = "连线按 parent_node_id 展示真实父子关系；第三列按第二列父节点归组，手机端可横向滚动查看完整分支。";
  canvas.appendChild(hint);
  scheduleOutlineDiscoveryConnectors(canvas, connections, nodeElements);
  return canvas;
}

function hasUnmappedConstitutionImpact(node) {
  return Array.isArray(node?.constitution_clause_refs)
    && node.constitution_clause_refs.length > 0
    && (!Array.isArray(node.affected_node_ids) || node.affected_node_ids.length === 0);
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
  } else if (hasUnmappedConstitutionImpact(node)) {
    appendText(button, "span", "影响范围尚未映射", "discovery-affected-count");
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
  if (outlineDiscoveryConstitutionOpen) {
    $("rail-summary").textContent = "Constitution 为只读治理参考；具体内容已在中间栏展示，无需在右侧确认。";
    return;
  }
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
  } else if (hasUnmappedConstitutionImpact(node)) {
    appendText(panel, "h4", "影响范围");
    appendText(panel, "p", "影响范围尚未映射。该条款仅供阅读，不会生成确认问题或修改业务 Outline。", "discovery-empty-copy");
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
