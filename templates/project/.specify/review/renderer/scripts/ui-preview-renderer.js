/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. UI dynamic marker behavior is displayed as plain text, not animation. */
function render() {
  if (!reviewData) {
    return;
  }
  const validationError = validateReviewData(reviewData);
  if (validationError) {
    rejectReviewData([validationError]);
    return;
  }
  $("page-title").textContent = `SpecCompass - ${reviewData.project?.name || "项目"} / ${reviewData.project?.feature || "feature"}`;
  $("project-overview").textContent = reviewData.project?.business_overview || "未提供项目业务地图。";
  const warnings = $("data-warnings");
  const runtimeMessages = runtimeErrors.length ? runtimeErrors : runtimeWarnings;
  warnings.classList.toggle("hidden", runtimeMessages.length === 0);
  warnings.textContent = runtimeMessages.length
    ? `${runtimeErrors.length ? "阻断问题" : "数据提示"}：${runtimeMessages.slice(0, 3).join("；")}${runtimeMessages.length > 3 ? "；更多问题请运行 validator。" : ""}`
    : "";
  renderModules();
  renderCenter();
  renderRail();
}

function renderModules() {
  const list = $("module-list");
  list.replaceChildren();
  (reviewData.modules || []).forEach((module, index) => {
    const count = countModuleMust(module);
    const recommendedCount = countModuleRecommended(module);
    const button = document.createElement("button");
    button.className = "module-button";
    button.type = "button";
    button.setAttribute("aria-pressed", String(index === selectedModuleIndex));
    appendText(button, "strong", module.title || module.id || "未命名模块");
    button.appendChild(document.createElement("br"));
    appendText(button, "span", module.summary || "");
    button.appendChild(document.createElement("br"));
    appendText(button, "span", `待处理必审 ${count.pending}/${count.total}`, "must-count");
    button.appendChild(document.createElement("br"));
    appendText(
      button,
      "span",
      `建议确认待处理 ${recommendedCount.pendingRecommended}/${recommendedCount.total}；建议确认不计入红色待处理必审`,
      "recommended-count"
    );
    button.addEventListener("click", () => {
      goToModule(index);
    });
    list.appendChild(button);
  });
}

function goToModule(index) {
  const count = reviewData?.modules?.length || 0;
  if (!count) return;
  const nextIndex = Math.min(Math.max(index, 0), count - 1);
  selectedModuleIndex = nextIndex;
  selectedItemIndex = 0;
  selectedNodeId = null;
  render();
}

function renderModuleStepper() {
  const count = reviewData?.modules?.length || 0;
  const prev = $("prev-module");
  const next = $("next-module");
  const position = $("module-position");
  if (!prev || !next || !position) return;
  position.textContent = count ? `业务模块 ${selectedModuleIndex + 1}/${count}` : "业务模块 0/0";
  prev.disabled = selectedModuleIndex <= 0;
  next.disabled = !count || selectedModuleIndex >= count - 1;
  prev.onclick = () => goToModule(selectedModuleIndex - 1);
  next.onclick = () => goToModule(selectedModuleIndex + 1);
}

function countItemMust(item) {
  let total = 0;
  let pending = 0;
  for (const node of item?.nodes || []) {
    if (!isMust(node)) continue;
    total += 1;
    if (!isResolved(node)) pending += 1;
  }
  return { pending, total };
}

function renderCenter() {
  const module = currentModule();
  const item = currentItem();
  renderModuleStepper();
  $("module-title").textContent = module?.title || "模块";
  $("module-summary").textContent = module?.summary || "未提供模块简介。";
  $("item-title").textContent = item?.title || "流程或界面";
  $("item-summary").textContent = item?.summary || "未提供简介。";

  const tabs = $("item-tabs");
  tabs.replaceChildren();
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", reviewData.review_type === "ui" ? "当前业务模块内的界面切换" : "当前业务模块内的流程切换");
  currentItems().forEach((entry, index) => {
    const mustCount = countItemMust(entry);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `diagram-tab ${index === selectedItemIndex ? "active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(index === selectedItemIndex));
    button.tabIndex = index === selectedItemIndex ? 0 : -1;
    appendText(button, "span", entry.title || entry.id, "diagram-tab-title");
    appendText(button, "span", `待处理 ${mustCount.pending}/${mustCount.total}`, "diagram-tab-pending");
    button.addEventListener("click", () => {
      selectedItemIndex = index;
      selectedNodeId = null;
      render();
    });
    tabs.appendChild(button);
  });

  const view = $("diagram-view");
  view.replaceChildren();
  if (reviewData.review_type === "ui") {
    view.appendChild(renderUiScreen(item));
    return;
  }

  view.appendChild(renderFlowDiagram(item));
}

function renderFlowDiagram(item) {
  const nodes = item?.nodes || [];
  const edges = item?.edges || [];
  const wrap = create("div", "flow-chart");
  if (!nodes.length) {
    appendText(wrap, "p", "当前流程没有可展示的节点。");
    return wrap;
  }

  const layout = computeFlowLayout(nodes, edges);
  wrap.style.minWidth = `${layout.width}px`;
  const svg = svgEl("svg");
  svg.classList.add("flow-svg");
  svg.setAttribute("width", String(layout.width));
  svg.setAttribute("height", String(layout.height));
  svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${item?.title || "流程图"}，点击节点可查看右侧确认点。`);

  const defs = svgEl("defs");
  const marker = svgEl("marker");
  marker.setAttribute("id", "flow-arrow");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "5");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const arrow = svgEl("path");
  arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  arrow.classList.add("flow-arrow");
  marker.appendChild(arrow);
  defs.appendChild(marker);
  svg.appendChild(defs);

  for (const edge of edges) {
    const from = layout.positions.get(edge.from);
    const to = layout.positions.get(edge.to);
    if (!from || !to) continue;
    svg.appendChild(renderFlowEdge(edge, from, to, layout));
  }

  for (const node of nodes) {
    const box = layout.positions.get(node.id);
    if (!box) continue;
    svg.appendChild(renderFlowNode(node, box));
  }

  wrap.appendChild(svg);

  const note = create("div", "flow-chart-note");
  appendText(note, "span", "红点表示必须人工确认；点击图中节点会只显示该节点的右侧确认内容。");
  wrap.appendChild(note);
  return wrap;
}

function computeFlowLayout(nodes, edges) {
  const ids = new Set(nodes.map((node) => node.id));
  const orderById = new Map(nodes.map((node, index) => [node.id, index]));
  const layoutEdges = edges.filter((edge) => {
    if (!ids.has(edge.from) || !ids.has(edge.to)) return false;
    return (orderById.get(edge.to) ?? 0) > (orderById.get(edge.from) ?? 0);
  });
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of layoutEdges) {
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
    outgoing.get(edge.from).push(edge.to);
  }

  const queue = nodes.filter((node) => (indegree.get(node.id) || 0) === 0).map((node) => node.id);
  if (!queue.length && nodes[0]?.id) queue.push(nodes[0].id);
  const layerById = new Map(nodes.map((node) => [node.id, 0]));
  const visited = new Set();
  const mutableIndegree = new Map(indegree);

  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    for (const next of outgoing.get(id) || []) {
      layerById.set(next, Math.max(layerById.get(next) || 0, (layerById.get(id) || 0) + 1));
      mutableIndegree.set(next, (mutableIndegree.get(next) || 0) - 1);
      if ((mutableIndegree.get(next) || 0) <= 0) queue.push(next);
    }
  }

  let fallbackLayer = Math.max(0, ...Array.from(layerById.values()));
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    fallbackLayer += 1;
    layerById.set(node.id, fallbackLayer);
  }

  const sparseLayers = [];
  for (const node of nodes) {
    const layer = layerById.get(node.id) || 0;
    if (!sparseLayers[layer]) sparseLayers[layer] = [];
    sparseLayers[layer].push(node);
  }
  const layers = sparseLayers.filter((layer) => layer?.length);

  const nodeWidth = 240;
  const nodeHeight = 112;
  const gapX = 56;
  const gapY = 58;
  const padding = 38;
  const layerCount = layers.length || 1;
  const maxLayerSize = layers.reduce((max, layer) => Math.max(max, layer.length), 1);
  const width = Math.max(760, padding * 2 + maxLayerSize * nodeWidth + (maxLayerSize - 1) * gapX);
  const height = Math.max(460, padding * 2 + layerCount * nodeHeight + (layerCount - 1) * gapY);
  const positions = new Map();

  layers.forEach((layerNodes = [], layerIndex) => {
    const rowWidth = layerNodes.length * nodeWidth + Math.max(0, layerNodes.length - 1) * gapX;
    const startX = Math.max(padding, (width - rowWidth) / 2);
    layerNodes.forEach((node, rowIndex) => {
      const x = startX + rowIndex * (nodeWidth + gapX);
      const y = padding + layerIndex * (nodeHeight + gapY);
      positions.set(node.id, {
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        centerX: x + nodeWidth / 2,
        centerY: y + nodeHeight / 2,
        layer: layerIndex
      });
    });
  });

  return { width, height, positions };
}

function renderFlowEdge(edge, from, to, layout) {
  const group = svgEl("g");
  group.classList.add("flow-svg-edge-group");
  const path = svgEl("path");
  const backward = to.layer <= from.layer;
  path.classList.add("flow-svg-edge");
  if (backward) path.classList.add("back-edge");
  path.setAttribute("d", flowEdgePath(from, to, backward, layout));
  path.setAttribute("marker-end", "url(#flow-arrow)");
  group.appendChild(path);

  if (edge.label) {
    const labelX = backward ? layout.width - 70 : (from.centerX + to.centerX) / 2;
    const labelY = backward ? (from.centerY + to.centerY) / 2 : (from.y + from.height + to.y) / 2 - 6;
    const label = svgEl("text");
    label.classList.add("flow-edge-label");
    label.setAttribute("x", String(labelX));
    label.setAttribute("y", String(labelY));
    label.setAttribute("text-anchor", "middle");
    label.textContent = edge.label;
    group.appendChild(label);
  }
  return group;
}

function flowEdgePath(from, to, backward, layout) {
  if (backward) {
    const startX = from.x + from.width;
    const startY = from.centerY;
    const endX = to.x + to.width;
    const endY = to.centerY;
    const laneX = layout.width - 28;
    return `M ${startX} ${startY} L ${laneX} ${startY} L ${laneX} ${endY} L ${endX} ${endY}`;
  }
  const startX = from.centerX;
  const startY = from.y + from.height;
  const endX = to.centerX;
  const endY = to.y;
  const midY = startY + Math.max(28, (endY - startY) / 2);
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

function renderFlowNode(node, box) {
  const group = svgEl("g");
  group.classList.add("flow-svg-node");
  if (isMust(node)) group.classList.add("must");
  if (isResolved(node)) group.classList.add("resolved");
  if (selectedNodeId === node.id) group.classList.add("selected");
  group.setAttribute("tabindex", "0");
  group.setAttribute("role", "button");
  group.setAttribute("aria-pressed", String(selectedNodeId === node.id));
  group.dataset.nodeId = node.id;

  const title = svgEl("title");
  title.textContent = `${node.label || node.id || "未命名节点"}：${node.plain_summary || ""}`;
  group.appendChild(title);

  const rect = svgEl("rect");
  rect.setAttribute("x", String(box.x));
  rect.setAttribute("y", String(box.y));
  rect.setAttribute("width", String(box.width));
  rect.setAttribute("height", String(box.height));
  rect.setAttribute("rx", "10");
  group.appendChild(rect);

  if (isMust(node)) {
    const dot = svgEl("circle");
    dot.classList.add("flow-must-dot");
    dot.setAttribute("cx", String(box.x + box.width - 16));
    dot.setAttribute("cy", String(box.y + 16));
    dot.setAttribute("r", "6");
    group.appendChild(dot);
  }

  const level = svgEl("text");
  level.classList.add("flow-node-level");
  level.setAttribute("x", String(box.x + 14));
  level.setAttribute("y", String(box.y + 21));
  level.textContent = levelLabel(node.review_level);
  group.appendChild(level);

  const label = svgEl("text");
  label.classList.add("flow-node-label");
  label.setAttribute("x", String(box.x + 14));
  label.setAttribute("y", String(box.y + 47));
  appendSvgTextLines(label, node.label || node.id || "未命名节点", 12, 2, 17);
  group.appendChild(label);

  const summary = svgEl("text");
  summary.classList.add("flow-node-summary");
  summary.setAttribute("x", String(box.x + 14));
  summary.setAttribute("y", String(box.y + 82));
  appendSvgTextLines(summary, node.plain_summary || "", 17, 2, 15);
  group.appendChild(summary);

  group.addEventListener("click", () => {
    selectedNodeId = selectedNodeId === node.id ? null : node.id;
    render();
  });
  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectedNodeId = selectedNodeId === node.id ? null : node.id;
      render();
    }
  });
  return group;
}

function appendSvgTextLines(textElement, text, maxChars, maxLines, lineHeight) {
  const lines = wrapSvgText(text, maxChars, maxLines);
  lines.forEach((line, index) => {
    const tspan = svgEl("tspan");
    tspan.setAttribute("x", textElement.getAttribute("x"));
    tspan.setAttribute("dy", index === 0 ? "0" : String(lineHeight));
    tspan.textContent = line;
    textElement.appendChild(tspan);
  });
}

function wrapSvgText(text, maxChars, maxLines) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source) return [];
  const lines = [];
  let current = "";
  let width = 0;
  for (const char of source) {
    const charWidth = /[\u4e00-\u9fff]/.test(char) ? 1 : 0.55;
    if (width + charWidth > maxChars && current) {
      lines.push(current);
      current = char;
      width = charWidth;
      if (lines.length === maxLines) break;
    } else {
      current += char;
      width += charWidth;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && source.length > lines.join("").length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[，。；、,.!?！？;:]$/, "")}...`;
  }
  return lines;
}

function svgEl(tag) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function renderUiScreen(item) {
  const frame = create("section", `ui-screen-preview ui-layout-${safeClassToken(item?.screen_layout)}`);
  const heading = create("div", "ui-screen-heading");
  const headingText = create("div");
  appendText(headingText, "span", "界面实例预览", "ui-preview-label");
  appendText(headingText, "strong", item?.title || "界面预览");
  appendText(headingText, "span", `界面结构：${uiLayoutLabel(item?.screen_layout)}。下方描边范围是产品界面示意，外围内容是审核说明。`);
  heading.appendChild(headingText);
  if (item?.framework_approximation) {
    appendText(heading, "span", item.framework_approximation, "ui-framework-note");
  }
  frame.appendChild(heading);
  frame.appendChild(renderUiScreenContext(item));

  const productFrame = create("section", "ui-product-frame");
  const titlebar = create("div", "ui-product-titlebar");
  appendText(titlebar, "strong", item?.title || "业务页面");
  appendText(titlebar, "span", "产品页面显示范围", "ui-product-range");
  productFrame.appendChild(titlebar);

  const positions = new Set((item?.screen_regions || []).map((region) => region.position));
  const regionGrid = create(
    "div",
    [
      "ui-region-grid",
      positions.has("left") ? "ui-has-left" : "",
      positions.has("right") || positions.has("drawer") ? "ui-has-right" : "",
      positions.has("top") ? "ui-has-top" : "",
      positions.has("bottom") ? "ui-has-bottom" : ""
    ].join(" ")
  );
  for (const region of item?.screen_regions || []) {
    regionGrid.appendChild(renderUiRegion(region));
  }
  productFrame.appendChild(regionGrid);
  frame.appendChild(productFrame);

  const stateNotes = item?.states || [];
  if (stateNotes.length) {
    const states = create("section", "ui-state-notes");
    appendText(states, "h4", "界面状态");
    for (const state of stateNotes) {
      states.appendChild(renderUiState(state));
    }
    frame.appendChild(states);
  }

  const notes = item?.framework_notes || [];
  if (notes.length) {
    const details = document.createElement("details");
    appendText(details, "summary", "框架或实现偏差说明");
    for (const note of notes) {
      appendText(details, "p", note);
    }
    frame.appendChild(details);
  }

  return frame;
}

function renderUiScreenContext(item) {
  const context = create("section", "ui-screen-context");
  const heading = create("div", "ui-screen-context-heading");
  appendText(heading, "span", "功能说明", "ui-preview-label");
  appendText(heading, "h4", "这个界面为什么存在");
  context.appendChild(heading);
  appendText(context, "p", item?.business_context || "", "ui-screen-context-lead");

  const facts = create("dl", "ui-screen-context-grid");
  appendUiScreenContextFact(facts, "谁会使用", item?.primary_users || []);
  appendUiScreenContextFact(facts, "什么时候进入", item?.entry_scenarios || []);
  appendUiScreenContextFact(facts, "要完成的事", item?.user_goal || "");
  appendUiScreenContextFact(facts, "完成后得到", item?.user_outcome || "");
  context.appendChild(facts);

  const flowRefs = item?.flow_refs || [];
  if (flowRefs.length) {
    const details = document.createElement("details");
    details.className = "ui-screen-flow-refs";
    appendText(details, "summary", "业务流程依据（仅用于追溯，不是界面内容）");
    for (const ref of flowRefs) {
      appendText(details, "p", ref);
    }
    context.appendChild(details);
  }
  return context;
}

function appendUiScreenContextFact(container, label, value) {
  const row = create("div", "ui-screen-context-fact");
  appendText(row, "dt", label);
  appendText(row, "dd", Array.isArray(value) ? value.join("；") : value);
  container.appendChild(row);
}

function renderUiRegion(region) {
  const section = create("section", `ui-region ui-region-${safeClassToken(region.position)}`);
  const header = create("div", "ui-region-header");
  appendText(header, "strong", region.title || region.id || "未命名区域");
  appendText(header, "span", uiRegionPositionLabel(region.position));
  section.appendChild(header);
  appendText(section, "p", region.purpose || "未提供区域用途。", "ui-region-purpose");

  const components = create("div", "ui-components");
  for (const component of region.components || []) {
    components.appendChild(renderUiComponent(component));
  }
  section.appendChild(components);

  for (const note of region.notes || []) {
    appendText(section, "p", note, "ui-region-note");
  }
  return section;
}

function renderUiComponent(component) {
  const nodeId = component.decision_node_id || component.action_ref || "";
  const supportsInfoDialog = !nodeId && ["dynamic-marker", "chart-note", "modal-note"].includes(component.kind || "");
  const componentEl = document.createElement("button");
  componentEl.type = "button";
  componentEl.className = uiComponentClassName(component, nodeId, supportsInfoDialog);
  componentEl.setAttribute("aria-pressed", String(Boolean(selectedNodeId && nodeId === selectedNodeId)));
  componentEl.disabled = !nodeId && !supportsInfoDialog;
  appendText(componentEl, "span", uiComponentKindLabel(component.kind), "ui-component-kind");
  componentEl.appendChild(renderUiComponentFace(component));
  appendText(componentEl, "span", component.purpose || "", "ui-component-purpose");
  if (component.future_behavior_note || component.kind === "dynamic-marker") {
    appendText(
      componentEl,
      "span",
      component.future_behavior_note || "此处未来会按真实数据自动更新。",
      "ui-dynamic-marker"
    );
  }
  componentEl.addEventListener("click", () => {
    if (supportsInfoDialog) {
      window.SpecCompassOverlay?.showInfoDialog({
        title: component.label || component.id || "说明",
        body: component.future_behavior_note || component.purpose || "此处为只读说明，用于帮助理解界面预览。",
        trigger: componentEl
      });
      return;
    }
    if (!nodeId) return;
    selectedNodeId = selectedNodeId === nodeId ? null : nodeId;
    render();
  });
  return componentEl;
}

function uiComponentClassName(component, nodeId, supportsInfoDialog) {
  const base = nodeId && isResolved({ id: nodeId }) ? "ui-component resolved" : "ui-component";
  const classes = [base, `ui-component-${safeClassToken(component.kind)}`];
  if (nodeId || supportsInfoDialog) classes.push("has-decision");
  if (supportsInfoDialog) classes.push("has-info-dialog");
  if (selectedNodeId && nodeId === selectedNodeId) classes.push("selected");
  return classes.join(" ");
}

function renderUiComponentFace(component) {
  const kind = component.kind || "";
  const label = component.label || component.id || "未命名组件";
  if (kind === "button") {
    const face = create("span", `ui-button-face ${/确认|发布|新建|提交/.test(label) ? "primary" : ""}`, label);
    return face;
  }
  if (kind === "search" || kind === "input" || kind === "filter" || kind === "select" || kind === "textarea") {
    const face = create("span", `ui-input-face ui-input-${safeClassToken(kind)}`);
    appendText(face, "span", label, "ui-input-placeholder");
    if (kind === "search") appendText(face, "span", "⌕", "ui-input-icon");
    if (kind === "select" || kind === "filter") appendText(face, "span", "⌄", "ui-input-icon");
    return face;
  }
  if (kind === "table") {
    const face = create("span", "ui-table-face");
    appendText(face, "strong", label);
    for (let index = 0; index < 3; index += 1) {
      const row = create("span", "ui-table-row");
      row.appendChild(create("span"));
      row.appendChild(create("span"));
      row.appendChild(create("span"));
      face.appendChild(row);
    }
    return face;
  }
  if (kind === "badge") {
    return create("span", "ui-badge-face", label);
  }
  if (kind === "card") {
    const face = create("span", "ui-card-face");
    appendText(face, "strong", label);
    appendText(face, "span", "用于集中展示检查结果或摘要。");
    return face;
  }
  if (kind === "dynamic-marker" || kind === "chart-note" || kind === "modal-note") {
    const face = create("span", "ui-note-face");
    appendText(face, "strong", label);
    appendText(face, "span", component.future_behavior_note || "此处为未来动态信息的占位说明。");
    return face;
  }
  return create("strong", "ui-text-face", label);
}

function renderUiState(state) {
  const article = create("article", `ui-state-note ui-state-${safeClassToken(state.state_type)}`);
  appendText(article, "strong", `${state.label || state.id || "状态"} · ${uiStateTypeLabel(state.state_type)}`);
  appendText(article, "p", state.plain_note || "");
  if (state.future_behavior_note || state.state_type === "dynamic_marker") {
    appendText(article, "span", state.future_behavior_note || "此处数字未来会自动更新。", "ui-dynamic-marker");
  }
  return article;
}

function uiLayoutLabel(layout) {
  return {
    dashboard: "看板",
    form: "表单",
    list_detail: "列表加详情",
    wizard: "分步向导",
    detail: "详情页",
    settings: "设置页",
    screen_map: "页面地图",
    modal: "弹窗",
    custom: "自定义"
  }[layout] || layout || "未标注";
}

function uiRegionPositionLabel(position) {
  return {
    top: "顶部",
    left: "左侧",
    main: "主区域",
    right: "右侧",
    bottom: "底部",
    modal: "弹层",
    drawer: "抽屉",
    inline: "行内"
  }[position] || position || "区域";
}

function uiComponentKindLabel(kind) {
  return {
    button: "按钮",
    input: "输入",
    select: "选择",
    textarea: "多行输入",
    checkbox: "勾选",
    radio: "单选",
    table: "表格",
    card: "卡片",
    nav: "导航",
    tab: "标签页",
    filter: "筛选",
    search: "搜索",
    badge: "标记",
    "chart-note": "图表说明",
    "modal-note": "弹窗说明",
    "dynamic-marker": "动态标注",
    text: "文字",
    "empty-state": "空态",
    "error-note": "错误提示"
  }[kind] || kind || "组件";
}

function uiStateTypeLabel(type) {
  return {
    default: "默认",
    empty: "空态",
    loading: "加载",
    error: "错误",
    success: "成功",
    permission: "权限",
    dynamic_marker: "动态标注"
  }[type] || type || "状态";
}
