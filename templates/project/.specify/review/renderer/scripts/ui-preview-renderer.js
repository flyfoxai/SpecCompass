/* Fixed SpecCompass review renderer infrastructure. Review commands only fill JSON review data. UI dynamic marker behavior is displayed as plain text, not animation. */
let uiPreviewViewport = "desktop";
let uiPreviewAnnotations = false;
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
  renderReviewModeSwitch();
  renderModules();
  renderCenter();
  renderRail();
}

function renderReviewModeSwitch() {
  const switcher = $("review-mode-switch");
  if (!switcher) return;
  const isOutline = reviewData?.review_type === "outline";
  switcher.classList.toggle("hidden", !isOutline);
  document.body.classList.toggle("outline-adjustment-mode", isOutline && reviewMode === "adjust");
  for (const button of switcher.querySelectorAll("[data-review-mode]")) {
    button.setAttribute("aria-pressed", String(button.dataset.reviewMode === reviewMode));
  }
}

function reviewCountState(count) {
  if (!count?.total) return "passive";
  if (count.pending === 0) return "resolved";
  return "open";
}

function renderModules() {
  const list = $("module-list");
  list.replaceChildren();
  (reviewData.modules || []).forEach((module, index) => {
    const count = countModuleMust(module);
    const recommendedCount = countModuleRecommended(module);
    const moduleState = reviewCountState(count);
    const moduleOrdinal = reviewModuleDisplayOrdinal(module, index);
    const button = document.createElement("button");
    button.className = `module-button is-${moduleState}`;
    button.type = "button";
    button.dataset.reviewState = moduleState;
    button.dataset.displayOrdinal = moduleOrdinal;
    button.setAttribute("aria-pressed", String(index === selectedModuleIndex));
    const heading = create("span", "module-heading");
    appendText(heading, "span", moduleOrdinal, "module-ordinal");
    appendText(heading, "strong", module.title || module.id || "未命名模块");
    button.appendChild(heading);
    button.appendChild(document.createElement("br"));
    appendText(button, "span", module.summary || "");
    button.appendChild(document.createElement("br"));
    appendText(button, "span", `待处理必审 ${count.pending}/${count.total}`, `must-count must-count-${moduleState}`);
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
  selectedUiComponentId = null;
  selectedUiLayoutId = null;
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
  const tabLabels = {
    flow: "当前业务模块内的流程切换",
    ui: "当前业务模块内的界面切换",
    outline: "当前功能纲要的视图切换"
  };
  tabs.setAttribute("aria-label", tabLabels[reviewData.review_type]);
  currentItems().forEach((entry, index) => {
    const mustCount = countItemMust(entry);
    const tabState = reviewCountState(mustCount);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `diagram-tab is-${tabState} ${index === selectedItemIndex ? "active" : ""}`;
    button.dataset.reviewState = tabState;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(index === selectedItemIndex));
    button.tabIndex = index === selectedItemIndex ? 0 : -1;
    appendText(button, "span", reviewItemDisplayOrdinal(entry, module, index), "diagram-tab-ordinal");
    appendText(button, "span", entry.title || entry.id, "diagram-tab-title");
    appendText(button, "span", `待处理 ${mustCount.pending}/${mustCount.total}`, `diagram-tab-pending diagram-tab-pending-${tabState}`);
    button.addEventListener("click", () => {
      selectedItemIndex = index;
      selectedNodeId = null;
      selectedUiComponentId = null;
      selectedUiLayoutId = null;
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
  if (reviewData.review_type === "flow") {
    view.appendChild(renderFlowDiagram(item));
    return;
  }
  if (reviewData.review_type === "outline") {
    view.appendChild(renderOutlinePreview(item));
    return;
  }
  view.appendChild(create("p", "error", `不支持的 review_type：${reviewData.review_type}`));
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
  const frame = create(
    "section",
    `ui-screen-preview ui-layout-${safeClassToken(item?.screen_layout)} ${uiPreviewAnnotations ? "ui-preview-annotations" : ""}`
  );
  const heading = create("div", "ui-screen-heading ui-layout-selectable");
  const layoutEntry = currentUiLayoutEntry();
  const layoutRef = layoutEntry?.ref || uiLayoutReference(currentModule(), item);
  heading.dataset.uiLayoutRef = layoutRef;
  heading.setAttribute("role", "button");
  heading.setAttribute("tabindex", "0");
  heading.setAttribute("aria-label", `调整${item?.title || "当前界面"}整体布局`);
  heading.setAttribute("aria-pressed", String(selectedUiLayoutId === layoutRef));
  const headingText = create("div");
  appendText(headingText, "span", "低保真内容预览", "ui-preview-label");
  appendText(headingText, "strong", item?.title || "界面预览");
  appendText(headingText, "span", `界面结构：${uiLayoutLabel(item?.screen_layout)}。视觉细节已简化，控件和文字必须与 review data 一致。`);
  heading.appendChild(headingText);
  if (item?.framework_approximation) {
    appendText(heading, "span", item.framework_approximation, "ui-framework-note");
  }
  const activateLayout = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    selectedUiLayoutId = selectedUiLayoutId === layoutRef ? null : layoutRef;
    selectedUiComponentId = null;
    selectedNodeId = null;
    render();
    if (selectedUiLayoutId) {
      window.requestAnimationFrame(() => {
        document.querySelector(`[data-ui-layout-adjustment-ref="${CSS.escape(layoutRef)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };
  heading.addEventListener("click", activateLayout);
  heading.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    activateLayout(event);
  });
  frame.appendChild(heading);
  frame.appendChild(renderUiPreviewToolbar());

  const stage = create("section", `ui-preview-stage ui-preview-inline ui-preview-${safeClassToken(uiPreviewViewport)}`);
  stage.setAttribute("aria-label", "目标 UI 预览区");
  const boundaryBar = create("div", "ui-preview-boundary-bar");
  appendText(boundaryBar, "strong", "目标 UI 预览区");
  appendText(boundaryBar, "span", `${uiPreviewViewportLabel(uiPreviewViewport)}画布`);
  stage.appendChild(boundaryBar);

  const canvas = create("div", "ui-preview-canvas");
  const productFrame = create("section", "ui-product-frame");
  productFrame.setAttribute("aria-label", `${item?.title || "业务页面"}的低保真内容预览`);

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
    regionGrid.appendChild(renderUiRegion(region, item));
  }
  productFrame.appendChild(regionGrid);
  canvas.appendChild(productFrame);
  stage.appendChild(canvas);
  frame.appendChild(stage);
  frame.appendChild(renderUiScreenContext(item));

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

function renderUiPreviewToolbar() {
  const toolbar = create("div", "ui-preview-toolbar");
  const note = create("div", "ui-preview-accuracy-note");
  appendText(note, "strong", "内容校对模式");
  appendText(note, "span", "不补写未知文案；缺少表头、选项或示例值时直接标出缺口。");
  toolbar.appendChild(note);

  const controls = create("div", "ui-preview-toolbar-controls");
  controls.setAttribute("aria-label", "切换界面预览宽度");
  for (const [value, label] of [["desktop", "桌面"], ["tablet", "平板"], ["mobile", "手机"]]) {
    const button = create("button", "ui-preview-mode-button", label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(uiPreviewViewport === value));
    button.addEventListener("click", () => {
      uiPreviewViewport = value;
      render();
    });
    controls.appendChild(button);
  }
  const annotations = create(
    "button",
    "ui-preview-annotation-toggle",
    uiPreviewAnnotations ? "隐藏规格标注" : "显示规格标注"
  );
  annotations.type = "button";
  annotations.setAttribute("aria-pressed", String(uiPreviewAnnotations));
  annotations.addEventListener("click", () => {
    uiPreviewAnnotations = !uiPreviewAnnotations;
    render();
  });
  controls.appendChild(annotations);

  const fullPreview = create("button", "ui-preview-full-button", "查看全图");
  fullPreview.type = "button";
  fullPreview.setAttribute("aria-haspopup", "dialog");
  fullPreview.addEventListener("click", () => showUiFullPreview(fullPreview));
  controls.appendChild(fullPreview);
  toolbar.appendChild(controls);
  return toolbar;
}

function showUiFullPreview(trigger) {
  const screen = trigger.closest(".ui-screen-preview");
  const source = screen?.querySelector(".ui-preview-stage");
  if (!source || typeof window.SpecCompassOverlay?.showPreviewDialog !== "function") {
    setStatus("当前浏览器无法打开 UI 全图预览。", true);
    return;
  }

  const preview = source.cloneNode(true);
  preview.classList.remove("ui-preview-inline");
  preview.classList.add("ui-preview-dialog-stage");
  preview.setAttribute("aria-label", `${currentItem()?.title || "目标 UI"}只读全图预览`);
  for (const selected of preview.querySelectorAll(".selected, .resolved, .ui-component-adjustment-selected")) {
    selected.classList.remove("selected", "resolved", "ui-component-adjustment-selected");
  }
  for (const component of preview.querySelectorAll(".ui-component")) {
    component.removeAttribute("role");
    component.removeAttribute("tabindex");
    component.removeAttribute("aria-label");
    component.removeAttribute("aria-pressed");
    component.querySelector(":scope > .ui-component-face")?.removeAttribute("aria-hidden");
  }
  for (const control of preview.querySelectorAll("button, input, select, textarea, [tabindex]")) {
    control.tabIndex = -1;
    if ("disabled" in control) control.disabled = true;
    control.setAttribute("aria-disabled", "true");
    control.removeAttribute("aria-pressed");
  }

  window.SpecCompassOverlay.showPreviewDialog({
    title: currentItem()?.title || "目标 UI 全图",
    body: `${uiPreviewViewportLabel(uiPreviewViewport)}只读全图；关闭后回到内嵌预览继续确认。`,
    content: preview,
    trigger
  });
}

function uiPreviewViewportLabel(viewport) {
  return {
    desktop: "桌面",
    tablet: "平板",
    mobile: "手机"
  }[viewport] || "自定义";
}

function renderUiScreenContext(item) {
  const context = create("details", "ui-screen-context");
  appendText(context, "summary", "查看页面业务依据与进入条件");
  const body = create("div", "ui-screen-context-body");
  const heading = create("div", "ui-screen-context-heading");
  appendText(heading, "span", "功能说明", "ui-preview-label");
  appendText(heading, "h4", "这个界面为什么存在");
  body.appendChild(heading);
  appendText(body, "p", item?.business_context || "", "ui-screen-context-lead");

  const facts = create("dl", "ui-screen-context-grid");
  appendUiScreenContextFact(facts, "谁会使用", item?.primary_users || []);
  appendUiScreenContextFact(facts, "什么时候进入", item?.entry_scenarios || []);
  appendUiScreenContextFact(facts, "要完成的事", item?.user_goal || "");
  appendUiScreenContextFact(facts, "完成后得到", item?.user_outcome || "");
  body.appendChild(facts);

  const flowRefs = item?.flow_refs || [];
  if (flowRefs.length) {
    const details = document.createElement("details");
    details.className = "ui-screen-flow-refs";
    appendText(details, "summary", "业务流程依据（仅用于追溯，不是界面内容）");
    for (const ref of flowRefs) {
      appendText(details, "p", ref);
    }
    body.appendChild(details);
  }
  context.appendChild(body);
  return context;
}

function appendUiScreenContextFact(container, label, value) {
  const row = create("div", "ui-screen-context-fact");
  appendText(row, "dt", label);
  appendText(row, "dd", Array.isArray(value) ? value.join("；") : value);
  container.appendChild(row);
}

function renderUiRegion(region, item = currentItem()) {
  const section = create("section", `ui-region ui-region-${safeClassToken(region.position)}`);
  section.setAttribute("aria-label", region.title || region.id || "未命名区域");
  const header = create("div", "ui-region-header");
  appendText(header, "strong", region.title || region.id || "未命名区域");
  appendText(header, "span", uiRegionPositionLabel(region.position));
  header.classList.add("ui-annotation");
  section.appendChild(header);
  appendText(section, "p", region.purpose || "未提供区域用途。", "ui-region-purpose ui-annotation");

  const components = create("div", "ui-components");
  for (const component of region.components || []) {
    components.appendChild(renderUiComponent(component, region, item));
  }
  section.appendChild(components);

  for (const note of region.notes || []) {
    appendText(section, "p", note, "ui-region-note ui-annotation");
  }
  return section;
}

function uiComponentReference(module, item, region, component) {
  return [
    module?.id || module?.title || "module",
    item?.id || item?.title || "screen",
    region?.id || region?.title || region?.position || "region",
    component?.id || component?.label || "component"
  ].join(":");
}

function uiLayoutReference(module, item) {
  return [
    "ui-layout",
    module?.id || module?.title || "module",
    item?.id || item?.title || "screen"
  ].join(":");
}

function allUiLayoutEntries() {
  if (reviewData?.review_type !== "ui") return [];
  const entries = [];
  for (const module of reviewData.modules || []) {
    for (const item of module.screens || []) {
      entries.push({ module, item, ref: uiLayoutReference(module, item) });
    }
  }
  return entries;
}

function currentUiLayoutEntry() {
  if (reviewData?.review_type !== "ui") return null;
  const module = currentModule();
  const item = currentItem();
  return module && item ? { module, item, ref: uiLayoutReference(module, item) } : null;
}

function uiLayoutAdjustmentMap() {
  const adjustments = state?.__meta?.ui_layout_adjustments;
  return adjustments && typeof adjustments === "object" && !Array.isArray(adjustments) ? adjustments : {};
}

function uiLayoutAdjustment(ref) {
  const saved = uiLayoutAdjustmentMap()[ref] || {};
  return {
    suggestion: String(saved.suggestion || "").slice(0, 2000),
    updated_at: saved.updated_at || ""
  };
}

function savedUiLayoutAdjustments() {
  const adjustments = uiLayoutAdjustmentMap();
  return allUiLayoutEntries()
    .map((entry) => ({ ...entry, adjustment: uiLayoutAdjustment(entry.ref) }))
    .filter((entry) => adjustments[entry.ref] && entry.adjustment.suggestion.trim());
}

function updateUiLayoutAdjustment(entry, suggestion) {
  if (!entry?.ref) return false;
  const previousState = snapshotReviewState();
  const adjustments = { ...uiLayoutAdjustmentMap() };
  const normalized = String(suggestion || "").slice(0, 2000);
  if (normalized.trim()) {
    adjustments[entry.ref] = { suggestion: normalized, updated_at: new Date().toISOString() };
  } else {
    delete adjustments[entry.ref];
  }
  state.__meta = { ...(state.__meta || {}), ui_layout_adjustments: adjustments };
  markSummaryDirty();
  if (!saveState()) {
    restoreReviewState(previousState);
    return false;
  }
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  return true;
}

function resetUiLayoutAdjustment(entry) {
  return updateUiLayoutAdjustment(entry, "");
}

function allUiComponentEntries() {
  if (reviewData?.review_type !== "ui") return [];
  const entries = [];
  for (const module of reviewData.modules || []) {
    for (const item of module.screens || []) {
      for (const region of item.screen_regions || []) {
        for (const component of region.components || []) {
          entries.push({
            module,
            item,
            region,
            component,
            ref: uiComponentReference(module, item, region, component)
          });
        }
      }
    }
  }
  return entries;
}

function selectedUiComponentEntry() {
  if (!selectedUiComponentId) return null;
  return allUiComponentEntries().find((entry) => entry.ref === selectedUiComponentId) || null;
}

function selectedUiLayoutEntry() {
  if (!selectedUiLayoutId) return null;
  return allUiLayoutEntries().find((entry) => entry.ref === selectedUiLayoutId) || null;
}

function uiComponentAdjustmentMap() {
  const adjustments = state?.__meta?.ui_component_adjustments;
  return adjustments && typeof adjustments === "object" && !Array.isArray(adjustments) ? adjustments : {};
}

function uiComponentAdjustment(ref, viewport = uiPreviewViewport) {
  const saved = uiComponentAdjustmentMap()[ref] || {};
  const savedLayouts = saved.layout && typeof saved.layout === "object" && !Array.isArray(saved.layout)
    ? saved.layout
    : {};
  const layout = savedLayouts[viewport] || saved;
  return {
    suggestion: saved.suggestion || "",
    text: saved.text || "",
    offset_x: Number(layout.offset_x) || 0,
    offset_y: Number(layout.offset_y) || 0,
    width_step: Number(layout.width_step) || 0,
    height_step: Number(layout.height_step) || 0,
    layout: Object.fromEntries(
      ["desktop", "tablet", "mobile"]
        .filter((key) => savedLayouts[key] && typeof savedLayouts[key] === "object")
        .map((key) => [key, {
          offset_x: Number(savedLayouts[key].offset_x) || 0,
          offset_y: Number(savedLayouts[key].offset_y) || 0,
          width_step: Number(savedLayouts[key].width_step) || 0,
          height_step: Number(savedLayouts[key].height_step) || 0
        }])
    ),
    updated_at: saved.updated_at || ""
  };
}

function hasMeaningfulUiComponentAdjustment(adjustment, component = null) {
  const originalText = component?.label || component?.id || "未命名组件";
  return Boolean(
    adjustment?.suggestion?.trim()
    || (adjustment?.text?.trim() && adjustment.text.trim() !== originalText)
    || Object.values(adjustment?.layout || {}).some((layout) => (
      layout.offset_x || layout.offset_y || layout.width_step || layout.height_step
    ))
    || adjustment?.offset_x || adjustment?.offset_y || adjustment?.width_step || adjustment?.height_step
  );
}

function savedUiComponentAdjustments() {
  const adjustments = uiComponentAdjustmentMap();
  return allUiComponentEntries()
    .map((entry) => ({ ...entry, adjustment: uiComponentAdjustment(entry.ref) }))
    .filter((entry) => adjustments[entry.ref] && hasMeaningfulUiComponentAdjustment(entry.adjustment, entry.component));
}

function clampUiAdjustment(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function updateUiComponentAdjustment(entry, patch) {
  if (!entry?.ref) return false;
  const previousState = snapshotReviewState();
  const current = uiComponentAdjustment(entry.ref);
  const nextLayout = {
    offset_x: clampUiAdjustment(patch.offset_x ?? current.offset_x, -80, 80),
    offset_y: clampUiAdjustment(patch.offset_y ?? current.offset_y, -80, 80),
    width_step: clampUiAdjustment(patch.width_step ?? current.width_step, -4, 6),
    height_step: clampUiAdjustment(patch.height_step ?? current.height_step, -4, 6)
  };
  const layout = { ...(current.layout || {}), [uiPreviewViewport]: nextLayout };
  if (!nextLayout.offset_x && !nextLayout.offset_y && !nextLayout.width_step && !nextLayout.height_step) {
    delete layout[uiPreviewViewport];
  }
  const next = {
    suggestion: String(patch.suggestion ?? current.suggestion ?? "").slice(0, 2000),
    text: String(patch.text ?? current.text ?? "").slice(0, 200),
    layout,
    updated_at: new Date().toISOString()
  };
  const originalText = entry.component?.label || entry.component?.id || "未命名组件";
  if (!next.text?.trim() || next.text.trim() === originalText) next.text = "";
  const adjustments = { ...uiComponentAdjustmentMap() };
  if (hasMeaningfulUiComponentAdjustment(next, entry.component)) {
    adjustments[entry.ref] = next;
  } else {
    delete adjustments[entry.ref];
  }
  state.__meta = { ...(state.__meta || {}), ui_component_adjustments: adjustments };
  markSummaryDirty();
  if (!saveState()) {
    restoreReviewState(previousState);
    return false;
  }
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  return true;
}

function resetUiComponentAdjustment(entry) {
  if (!entry?.ref) return false;
  const previousState = snapshotReviewState();
  const adjustments = { ...uiComponentAdjustmentMap() };
  delete adjustments[entry.ref];
  state.__meta = { ...(state.__meta || {}), ui_component_adjustments: adjustments };
  markSummaryDirty();
  if (!saveState()) {
    restoreReviewState(previousState);
    return false;
  }
  resetExportButtonLabels();
  return true;
}

function applyUiComponentAdjustment(componentEl, adjustment) {
  const widthScale = Math.max(0.8, 1 + adjustment.width_step * 0.05);
  const heightScale = Math.max(0.8, 1 + adjustment.height_step * 0.05);
  componentEl.style.translate = adjustment.offset_x || adjustment.offset_y
    ? `${adjustment.offset_x}px ${adjustment.offset_y}px`
    : "";
  componentEl.style.scale = adjustment.width_step || adjustment.height_step
    ? `${widthScale} ${heightScale}`
    : "";
  componentEl.style.transformOrigin = adjustment.width_step || adjustment.height_step ? "top left" : "";
}

function uiComponentDecisionNodeId(component) {
  const knownNodeIds = new Set(currentItemNodes().map((node) => node.id));
  return component?.decision_node_id || (knownNodeIds.has(component?.action_ref) ? component.action_ref : "");
}

function renderUiComponent(component, region, item = currentItem()) {
  const module = currentModule();
  const componentRef = uiComponentReference(module, item, region, component);
  const adjustment = uiComponentAdjustment(componentRef);
  const nodeId = uiComponentDecisionNodeId(component);
  const componentEl = document.createElement("div");
  componentEl.className = uiComponentClassName(component, nodeId, componentRef, adjustment);
  componentEl.dataset.componentId = component.id || "";
  componentEl.dataset.uiComponentRef = componentRef;
  componentEl.dataset.sourceRef = component.source_ref || "";
  componentEl.setAttribute("role", "button");
  componentEl.setAttribute("tabindex", "0");
  componentEl.setAttribute("aria-label", `调整${component.label || component.id || "界面元素"}`);
  componentEl.setAttribute("aria-pressed", String(selectedUiComponentId === componentRef));
  const face = renderUiComponentFace(component, adjustment.text);
  face.classList.add("ui-component-face");
  face.setAttribute("aria-hidden", "true");
  for (const control of face.querySelectorAll("button, input, select, textarea, [tabindex]")) {
    control.tabIndex = -1;
  }
  componentEl.appendChild(face);
  applyUiComponentAdjustment(componentEl, adjustment);

  const annotation = create("div", "ui-component-annotation ui-annotation");
  appendText(annotation, "span", uiComponentKindLabel(component.kind), "ui-component-kind");
  appendText(annotation, "span", component.purpose || "未提供组件用途。", "ui-component-purpose");
  appendText(annotation, "span", component.source_ref || "未提供来源。", "ui-component-source");
  componentEl.appendChild(annotation);

  const activate = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    selectedUiComponentId = componentRef;
    selectedUiLayoutId = null;
    selectedNodeId = nodeId || null;
    render();
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-ui-adjustment-ref="${CSS.escape(componentRef)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  componentEl.addEventListener("click", activate);
  componentEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    activate(event);
  });
  return componentEl;
}

function uiComponentClassName(component, nodeId, componentRef, adjustment) {
  const base = nodeId && isResolved({ id: nodeId }) ? "ui-component resolved" : "ui-component";
  const classes = [base, "is-adjustable", `ui-component-${safeClassToken(component.kind)}`];
  if (nodeId) classes.push("has-decision");
  if (selectedNodeId && nodeId === selectedNodeId) classes.push("selected");
  if (selectedUiComponentId === componentRef) classes.push("ui-component-adjustment-selected");
  if (hasMeaningfulUiComponentAdjustment(adjustment, component)) classes.push("ui-component-adjusted");
  return classes.join(" ");
}

function renderUiComponentFace(component, replacementText = "") {
  const kind = component.kind || "";
  const label = replacementText?.trim() || component.label || component.id || "未命名组件";
  const display = component.display || {};
  if (kind === "button") {
    const button = create("button", `ui-button-face ui-button-${safeClassToken(display.button_variant || "secondary")}`, label);
    button.type = "button";
    return button;
  }
  if (kind === "search" || kind === "input" || kind === "textarea") {
    const field = create("label", `ui-input-face ui-input-${safeClassToken(kind)}`);
    appendText(field, "span", label, "ui-field-label");
    const control = document.createElement(kind === "textarea" ? "textarea" : "input");
    if (kind === "search") control.type = "search";
    if (display.value) control.value = display.value;
    if (display.placeholder) control.placeholder = display.placeholder;
    control.readOnly = true;
    field.appendChild(control);
    if (display.helper_text) appendText(field, "span", display.helper_text, "ui-field-helper");
    if (!display.value && !display.placeholder) {
      appendText(field, "span", "输入内容未提供", "ui-preview-content-gap ui-field-content-gap");
    }
    return field;
  }
  if (kind === "select" || kind === "filter") {
    const field = create("label", `ui-input-face ui-input-${safeClassToken(kind)}`);
    appendText(field, "span", label, "ui-field-label");
    const select = document.createElement("select");
    const options = display.options?.length ? display.options : display.value ? [display.value] : [];
    for (const optionLabel of options) select.appendChild(create("option", "", optionLabel));
    if (!options.length) {
      const missingOption = create("option", "", "选项文案未提供");
      missingOption.disabled = true;
      missingOption.selected = true;
      select.appendChild(missingOption);
    }
    field.appendChild(select);
    if (display.helper_text) appendText(field, "span", display.helper_text, "ui-field-helper");
    if (!options.length) {
      appendText(field, "span", "选项文案未提供", "ui-preview-content-gap ui-field-content-gap");
    }
    return field;
  }
  if (kind === "checkbox" || kind === "radio") {
    const choice = create("label", "ui-choice-face");
    const input = document.createElement("input");
    input.type = kind;
    input.addEventListener("click", (event) => event.preventDefault());
    choice.appendChild(input);
    appendText(choice, "span", label);
    return choice;
  }
  if (kind === "table") {
    const face = create("div", "ui-table-face");
    const table = document.createElement("table");
    appendText(table, "caption", label);
    const columns = display.columns || [];
    if (columns.length) {
      const head = document.createElement("thead");
      const row = document.createElement("tr");
      for (const column of columns) appendText(row, "th", column);
      head.appendChild(row);
      table.appendChild(head);
      const body = document.createElement("tbody");
      for (const values of display.rows || []) {
        const bodyRow = document.createElement("tr");
        for (const value of values) appendText(bodyRow, "td", value);
        body.appendChild(bodyRow);
      }
      if (!(display.rows || []).length) {
        const emptyRow = document.createElement("tr");
        const emptyCell = appendText(emptyRow, "td", "示例数据未提供", "ui-table-empty");
        emptyCell.colSpan = columns.length;
        body.appendChild(emptyRow);
      }
      table.appendChild(body);
    } else {
      appendText(face, "p", "表格列文案未提供", "ui-preview-content-gap");
    }
    face.appendChild(table);
    return face;
  }
  if (kind === "badge") {
    return create("span", `ui-badge-face ui-badge-${safeClassToken(display.badge_tone || "neutral")}`, label);
  }
  if (kind === "card") {
    const face = create("article", "ui-card-face");
    appendText(face, "strong", label);
    if (display.value) appendText(face, "span", display.value);
    if (display.helper_text) appendText(face, "span", display.helper_text);
    return face;
  }
  if (kind === "dynamic-marker" || kind === "chart-note" || kind === "modal-note") {
    const face = create("div", "ui-note-face");
    appendText(face, "strong", label);
    appendText(face, "span", component.future_behavior_note || "此处为未来动态信息的占位说明。");
    return face;
  }
  if (kind === "tab") {
    const tab = create("button", "ui-tab-face", label);
    tab.type = "button";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", "false");
    return tab;
  }
  if (kind === "nav") return create("nav", "ui-nav-face", label);
  if (kind === "empty-state" || kind === "error-note") {
    const message = create("div", `ui-message-face ui-message-${safeClassToken(kind)}`);
    appendText(message, "strong", label);
    if (display.helper_text) appendText(message, "span", display.helper_text);
    return message;
  }
  return create("p", "ui-text-face", label);
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
