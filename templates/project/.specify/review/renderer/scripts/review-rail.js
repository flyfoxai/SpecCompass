/* Fixed SpecCompass review renderer infrastructure. Review commands only fill JSON review data. */
const flowChangeTypes = [
  { value: "ADD_NODE", label: "新增流程节点" },
  { value: "DELETE_NODE", label: "删除流程节点" },
  { value: "MODIFY_NODE", label: "修改节点说明或规则" },
  { value: "MODIFY_BRANCH", label: "修改分支判断" },
  { value: "ADD_EXCEPTION_PATH", label: "补充异常路径" },
  { value: "SPLIT_SUBFLOW", label: "拆分子流程" },
  { value: "MERGE_SIMPLIFY", label: "合并或简化流程" },
  { value: "ADD_ENTRY_EXIT", label: "补充入口或出口" },
  { value: "OTHER", label: "其他流程修改" }
];

const uiChangeTypes = [
  { value: "ADD_SCREEN", label: "新增界面" },
  { value: "DELETE_SCREEN", label: "删除界面" },
  { value: "MODIFY_SCREEN_STRUCTURE", label: "调整界面结构" },
  { value: "ADD_REGION", label: "新增页面区域" },
  { value: "MODIFY_REGION_LAYOUT", label: "调整区域布局" },
  { value: "ADD_COMPONENT", label: "新增界面元素" },
  { value: "DELETE_COMPONENT", label: "删除界面元素" },
  { value: "MODIFY_FIELD_ACTION_COPY", label: "修改字段、按钮或文案" },
  { value: "ADD_STATE", label: "补充页面状态" },
  { value: "MODIFY_INTERACTION", label: "调整交互方式" },
  { value: "ADD_PERMISSION_DISPLAY", label: "补充权限展示" },
  { value: "OTHER", label: "其他 UI 修改" }
];

const outlineChangeTypes = [
  { value: "REVISE_INTENT", label: "调整产品意图" },
  { value: "REVISE_USERS", label: "调整用户或角色" },
  { value: "REVISE_PROBLEM_SLICE", label: "调整问题切片" },
  { value: "REVISE_CAPABILITY_BOUNDARY", label: "调整能力边界" },
  { value: "REVISE_SCOPE", label: "调整范围" },
  { value: "REVISE_NON_GOAL", label: "调整非目标" },
  { value: "REVISE_SCENARIO_COVERAGE", label: "补充场景或验收种子" },
  { value: "REVISE_FIRST_SLICE", label: "调整推荐首切片" },
  { value: "REVISE_SOURCE_AUTHORITY", label: "修正来源权威或追溯范围" },
  { value: "REVISE_READINESS", label: "调整风险、阻断项或下一路由" },
  { value: "OTHER", label: "其他纲要修改" }
];

function changeTypeOptions() {
  if (reviewData?.review_type === "flow") return flowChangeTypes;
  if (reviewData?.review_type === "ui") return uiChangeTypes;
  if (reviewData?.review_type === "outline") return outlineChangeTypes;
  return [];
}

function defaultChangeType() {
  if (reviewData?.review_type === "flow") return "MODIFY_NODE";
  if (reviewData?.review_type === "ui") return "MODIFY_SCREEN_STRUCTURE";
  if (reviewData?.review_type === "outline") return "REVISE_SCOPE";
  return "OTHER";
}

function hasDrafts() {
  return allNodes().some(({ node }) => nodeState(node.id).status === "DRAFT");
}

function summaryFingerprint() {
  return hashText(JSON.stringify(buildSummaryGroups()));
}

function hasUnexportedSavedChoices() {
  const copiedFingerprint = state.__meta?.copied_fingerprint || "";
  const groups = buildSummaryGroups();
  const savedCount = groups.decision_records.length
    + groups.needs_decision_items.length
    + groups.revision_requests.length;
  return Boolean(copiedFingerprint !== summaryFingerprint() && savedCount);
}

function resetExportButtonLabels() {
  const copyButton = $("copy-summary");
  const downloadButton = $("download-package");
  if (copyButton) {
    copyButton.textContent = "复制确认摘要兜底";
    copyButton.classList.add("hidden");
  }
  if (downloadButton && !writebackInProgress) {
    downloadButton.disabled = false;
    downloadButton.removeAttribute("aria-busy");
    downloadButton.textContent = defaultWritebackButtonLabel();
  }
  clearPackageDownloadLinks();
  writebackFallback = null;
}

function clearPackageDownloadLinks() {
  const container = $("download-package-links");
  if (container) {
    container.replaceChildren();
    container.classList.add("hidden");
  }
  for (const url of packageDownloadUrls) {
    URL.revokeObjectURL(url);
  }
  packageDownloadUrls = [];
}

function renderPackageDownloadLinks(parts) {
  const container = $("download-package-links");
  if (!container || !window.SpecCompassConfirmationPackage || typeof Blob === "undefined" || typeof URL === "undefined") {
    return;
  }

  clearPackageDownloadLinks();
  if (!parts?.length) return;

  appendText(container, "strong", parts.length > 1 ? "多包降级下载链接" : "确认包降级下载链接");
  appendText(
    container,
    "p",
    parts.length > 1
      ? "本地写回不可用。仅在降级交接时按 part 顺序下载全部文件。"
      : "本地写回不可用。仅在降级交接时下载此文件。"
  );

  const list = document.createElement("ol");
  for (const part of parts) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([JSON.stringify(part, null, 2)], { type: "application/json;charset=utf-8" }));
    packageDownloadUrls.push(url);
    link.href = url;
    link.download = window.SpecCompassConfirmationPackage.packageFilename(part);
    link.textContent = link.download;
    item.appendChild(link);
    list.appendChild(item);
  }
  container.appendChild(list);
  container.classList.remove("hidden");
}

function renderRail() {
  if (reviewData?.review_type === "outline" && reviewMode === "adjust") {
    renderOutlineAdjustmentRail();
    return;
  }
  const item = currentItem();
  const selectedLayout = selectedUiLayoutEntry();
  const selectedComponent = selectedUiComponentEntry();
  const associatedNodeId = selectedComponent ? uiComponentDecisionNodeId(selectedComponent.component) : "";
  $("authorization-steps").classList.toggle("hidden", Boolean(selectedLayout));
  $("priority-filters").classList.toggle("hidden", Boolean(selectedLayout));
  document.querySelector(".rail-actions")?.classList.toggle("hidden", Boolean(selectedLayout));
  $("rail-title").textContent = selectedLayout ? "整体布局建议" : selectedComponent ? "元素修改建议" : "当前确认";
  $("rail-summary").textContent = selectedLayout
    ? `正在调整「${selectedLayout.item.title || selectedLayout.item.id || "当前界面"}」的整体布局。`
    : selectedComponent
    ? associatedNodeId
      ? `正在调整「${selectedComponent.component.label || selectedComponent.component.id}」；下方保留关联确认点。`
      : `正在调整「${selectedComponent.component.label || selectedComponent.component.id}」；该元素没有绑定确认点，下方保留当前界面确认点。`
    : selectedNodeId
      ? "当前只显示选中的确认点。"
      : `${item?.title || "当前视图"}的确认点。`;
  $("show-all").classList.toggle("hidden", Boolean(selectedLayout) || !selectedNodeId);

  const counts = priorityCounts();
  for (const button of $("priority-filters").querySelectorAll("[data-priority]")) {
    const priority = button.dataset.priority;
    button.textContent = `${priority === "all" ? "全部" : priorityLabel(priority)} ${priority === "all" ? Object.values(counts).reduce((sum, value) => sum + value, 0) : counts[priority]}`;
    button.setAttribute("aria-pressed", String(selectedPriority === priority));
  }

  const list = $("node-list");
  list.replaceChildren();
  if (selectedLayout) {
    list.appendChild(renderUiLayoutAdjustmentPanel(selectedLayout));
  } else {
    if (selectedComponent) {
      list.appendChild(renderUiComponentAdjustmentPanel(selectedComponent));
    }
    for (const node of visibleNodes()) {
      list.appendChild(nodeCard(node));
    }
  }
  if (pendingFocusNodeId) {
    const textarea = document.querySelector(`[data-node-id="${CSS.escape(pendingFocusNodeId)}"] textarea`);
    if (textarea) textarea.focus();
    pendingFocusNodeId = null;
  }
}

function uiAdjustmentIconButton(label, title, onClick) {
  const button = create("button", "ui-adjustment-icon-button", label);
  button.type = "button";
  button.title = title;
  button.setAttribute("aria-label", title);
  button.addEventListener("click", onClick);
  return button;
}

function syncUiLayoutAdjustmentPanel(entry) {
  const adjustment = uiLayoutAdjustment(entry.ref);
  const panel = document.querySelector(`[data-ui-layout-adjustment-ref="${CSS.escape(entry.ref)}"]`);
  const stateBadge = panel?.querySelector(".ui-adjustment-state");
  if (stateBadge) stateBadge.textContent = adjustment.suggestion.trim() ? "已有整体建议" : "待输入";
  const reset = panel?.querySelector(".ui-layout-adjustment-footer button");
  if (reset) reset.disabled = !adjustment.suggestion.trim();
}

function renderUiLayoutAdjustmentPanel(entry) {
  const adjustment = uiLayoutAdjustment(entry.ref);
  const panel = create("section", "ui-layout-adjustment-panel");
  panel.dataset.uiLayoutAdjustmentRef = entry.ref;

  const heading = create("div", "ui-adjustment-heading");
  const title = create("div");
  appendText(title, "span", "页面级调整", "ui-adjustment-kicker");
  appendText(title, "h3", "整体布局建议");
  heading.appendChild(title);
  appendText(heading, "span", adjustment.suggestion.trim() ? "已有整体建议" : "待输入", "ui-adjustment-state");
  panel.appendChild(heading);

  const facts = create("dl", "ui-adjustment-facts");
  appendAdjustmentFact(facts, "当前界面", entry.item.title || entry.item.id || "未命名界面");
  appendAdjustmentFact(facts, "现有布局", uiLayoutLabel(entry.item.screen_layout));
  panel.appendChild(facts);

  const suggestionLabel = create("label", "ui-adjustment-field");
  appendText(suggestionLabel, "span", "布局修改意见");
  const suggestion = document.createElement("textarea");
  suggestion.maxLength = 2000;
  suggestion.placeholder = "例如：当前三栏改为两栏，详情区改为点击后弹出。";
  suggestion.value = adjustment.suggestion;
  suggestion.addEventListener("input", () => {
    const previous = uiLayoutAdjustment(entry.ref).suggestion;
    if (!updateUiLayoutAdjustment(entry, suggestion.value)) {
      suggestion.value = previous;
      return;
    }
    syncUiLayoutAdjustmentPanel(entry);
    setStatus("整体布局意见已保存为 UI 修订建议。");
  });
  suggestionLabel.appendChild(suggestion);
  panel.appendChild(suggestionLabel);

  const footer = create("div", "ui-adjustment-footer ui-layout-adjustment-footer");
  appendText(footer, "span", "作用范围：当前页面整体结构。", "ui-adjustment-note");
  const reset = create("button", "", "清除整体建议");
  reset.type = "button";
  reset.disabled = !adjustment.suggestion.trim();
  reset.addEventListener("click", () => {
    if (!resetUiLayoutAdjustment(entry)) return;
    suggestion.value = "";
    syncUiLayoutAdjustmentPanel(entry);
    setStatus("已清除当前页面的整体布局建议。");
  });
  footer.appendChild(reset);
  panel.appendChild(footer);
  return panel;
}

function uiAdjustmentValue(adjustment) {
  const width = 100 + adjustment.width_step * 5;
  const height = 100 + adjustment.height_step * 5;
  return `位置 X ${adjustment.offset_x}px / Y ${adjustment.offset_y}px；尺寸 ${width}% × ${height}%`;
}

function syncUiAdjustmentPanel(entry) {
  const adjustment = uiComponentAdjustment(entry.ref);
  const meaningful = hasMeaningfulUiComponentAdjustment(adjustment, entry.component);
  const panel = document.querySelector(`[data-ui-adjustment-ref="${CSS.escape(entry.ref)}"]`);
  const stateBadge = panel?.querySelector(".ui-adjustment-state");
  if (stateBadge) stateBadge.textContent = meaningful ? "已有修改建议" : "待输入";
  const reset = panel?.querySelector(".ui-adjustment-footer button");
  if (reset) reset.disabled = !meaningful;
  const target = document.querySelector(`.ui-preview-inline [data-ui-component-ref="${CSS.escape(entry.ref)}"]`);
  target?.classList.toggle("ui-component-adjusted", meaningful);
}

function renderUiComponentAdjustmentPanel(entry) {
  const adjustment = uiComponentAdjustment(entry.ref);
  const component = entry.component;
  const panel = create("section", "ui-component-adjustment-panel");
  panel.dataset.uiAdjustmentRef = entry.ref;

  const heading = create("div", "ui-adjustment-heading");
  const title = create("div");
  appendText(title, "span", `${uiComponentKindLabel(component.kind)} · ${entry.region.title || entry.region.id || uiRegionPositionLabel(entry.region.position)}`, "ui-adjustment-kicker");
  appendText(title, "h3", component.label || component.id || "未命名元素");
  heading.appendChild(title);
  appendText(heading, "span", hasMeaningfulUiComponentAdjustment(adjustment, component) ? "已有修改建议" : "待输入", "ui-adjustment-state");
  panel.appendChild(heading);

  const facts = create("dl", "ui-adjustment-facts");
  appendAdjustmentFact(facts, "规格来源", component.source_ref || "未提供");
  appendAdjustmentFact(facts, "元素标识", entry.ref);
  panel.appendChild(facts);

  const suggestionLabel = create("label", "ui-adjustment-field");
  appendText(suggestionLabel, "span", "修改建议");
  const suggestion = document.createElement("textarea");
  suggestion.maxLength = 2000;
  suggestion.placeholder = "例如：将按钮移到筛选条件右侧，主操作文案改为“创建问卷”。";
  suggestion.value = adjustment.suggestion;
  suggestion.addEventListener("input", () => {
    if (updateUiComponentAdjustment(entry, { suggestion: suggestion.value })) syncUiAdjustmentPanel(entry);
  });
  suggestionLabel.appendChild(suggestion);
  panel.appendChild(suggestionLabel);

  const textLabel = create("label", "ui-adjustment-field");
  appendText(textLabel, "span", "显示文字");
  const textRow = create("div", "ui-adjustment-text-row");
  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.maxLength = 200;
  textInput.value = adjustment.text || component.label || component.id || "";
  textInput.setAttribute("aria-label", "调整元素显示文字");
  textInput.addEventListener("input", () => {
    if (!updateUiComponentAdjustment(entry, { text: textInput.value })) return;
    const target = document.querySelector(`.ui-preview-inline [data-ui-component-ref="${CSS.escape(entry.ref)}"]`);
    const oldFace = target?.querySelector(":scope > .ui-component-face");
    if (!oldFace) return;
    const replacement = renderUiComponentFace(component, uiComponentAdjustment(entry.ref).text);
    replacement.classList.add("ui-component-face");
    replacement.setAttribute("aria-hidden", "true");
    for (const control of replacement.querySelectorAll("button, input, select, textarea, [tabindex]")) control.tabIndex = -1;
    oldFace.replaceWith(replacement);
    syncUiAdjustmentPanel(entry);
  });
  textRow.appendChild(textInput);
  textRow.appendChild(uiAdjustmentIconButton("↺", "恢复原始文字", () => {
    if (!updateUiComponentAdjustment(entry, { text: "" })) return;
    render();
  }));
  textLabel.appendChild(textRow);
  panel.appendChild(textLabel);

  const controlLabel = create("span", "ui-adjustment-control-label", `位置与尺寸（${uiPreviewViewportLabel(uiPreviewViewport)}）`);
  panel.appendChild(controlLabel);
  const controls = create("div", "ui-adjustment-controls");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "调整元素位置和尺寸");
  controls.append(
    uiAdjustmentIconButton("←", "向左移动 8 像素", () => adjustUiComponentAndRender(entry, { offset_x: uiComponentAdjustment(entry.ref).offset_x - 8 })),
    uiAdjustmentIconButton("↑", "向上移动 8 像素", () => adjustUiComponentAndRender(entry, { offset_y: uiComponentAdjustment(entry.ref).offset_y - 8 })),
    uiAdjustmentIconButton("↓", "向下移动 8 像素", () => adjustUiComponentAndRender(entry, { offset_y: uiComponentAdjustment(entry.ref).offset_y + 8 })),
    uiAdjustmentIconButton("→", "向右移动 8 像素", () => adjustUiComponentAndRender(entry, { offset_x: uiComponentAdjustment(entry.ref).offset_x + 8 }))
  );
  controls.appendChild(create("span", "ui-adjustment-control-divider"));
  controls.append(
    uiAdjustmentIconButton("W−", "缩小宽度 5%", () => adjustUiComponentAndRender(entry, { width_step: uiComponentAdjustment(entry.ref).width_step - 1 })),
    uiAdjustmentIconButton("W+", "增大宽度 5%", () => adjustUiComponentAndRender(entry, { width_step: uiComponentAdjustment(entry.ref).width_step + 1 })),
    uiAdjustmentIconButton("H−", "缩小高度 5%", () => adjustUiComponentAndRender(entry, { height_step: uiComponentAdjustment(entry.ref).height_step - 1 })),
    uiAdjustmentIconButton("H+", "增大高度 5%", () => adjustUiComponentAndRender(entry, { height_step: uiComponentAdjustment(entry.ref).height_step + 1 }))
  );
  panel.appendChild(controls);
  appendText(panel, "p", uiAdjustmentValue(adjustment), "ui-adjustment-value");

  const footer = create("div", "ui-adjustment-footer");
  appendText(footer, "span", "临时预览，不直接改写 UI 规格。", "ui-adjustment-note");
  const reset = create("button", "", "重置此元素");
  reset.type = "button";
  reset.disabled = !hasMeaningfulUiComponentAdjustment(adjustment, component);
  reset.addEventListener("click", () => {
    if (!resetUiComponentAdjustment(entry)) return;
    setStatus("已清除此元素的临时修改建议。");
    render();
  });
  footer.appendChild(reset);
  panel.appendChild(footer);
  return panel;
}

function adjustUiComponentAndRender(entry, patch) {
  if (!updateUiComponentAdjustment(entry, patch)) return;
  const adjustment = uiComponentAdjustment(entry.ref);
  const target = document.querySelector(`.ui-preview-inline [data-ui-component-ref="${CSS.escape(entry.ref)}"]`);
  if (target) applyUiComponentAdjustment(target, adjustment);
  const panel = document.querySelector(`[data-ui-adjustment-ref="${CSS.escape(entry.ref)}"]`);
  const value = panel?.querySelector(".ui-adjustment-value");
  if (value) value.textContent = uiAdjustmentValue(adjustment);
  syncUiAdjustmentPanel(entry);
  setStatus("元素调整已保存为 UI 修订建议。");
}

function outlineAdjustmentTarget() {
  const nodes = currentItemNodes();
  return nodes.find((node) => node.id === selectedNodeId)
    || nodes.find((node) => node.review_level === "must_confirm")
    || nodes[0]
    || null;
}

function outlineAdjustmentImpact(node = outlineAdjustmentTarget()) {
  if (!node) return { affected: [], stable: [], level: "normal" };
  const moduleNodes = currentModuleNodes();
  const affected = moduleNodes.filter((candidate) => candidate.id !== node.id && (
    node.confirmation_priority === "critical"
    || candidate.confirmation_priority === "critical"
    || candidate.review_level === "must_confirm"
  ));
  const affectedIds = new Set(affected.map((candidate) => candidate.id));
  return {
    affected,
    stable: moduleNodes.filter((candidate) => candidate.id !== node.id && !affectedIds.has(candidate.id)),
    level: node.confirmation_priority || "normal"
  };
}

function outlineRecommendedOption(node) {
  return (node?.options || []).find((option) => option.id === node.recommended_option) || null;
}

function adjustmentSection(title, className = "") {
  const section = create("section", `adjustment-section ${className}`.trim());
  appendText(section, "h3", title);
  return section;
}

function appendAdjustmentFact(parent, label, value) {
  const row = create("div", "adjustment-fact");
  appendText(row, "span", label);
  appendText(row, "strong", value || "未提供");
  parent.appendChild(row);
}

function renderOutlineAdjustmentRail() {
  const node = outlineAdjustmentTarget();
  const list = $("node-list");
  list.replaceChildren();
  $("rail-title").textContent = "Outline 调整工作台";
  $("authorization-steps").classList.add("hidden");
  $("priority-filters").classList.add("hidden");
  document.querySelector(".rail-actions")?.classList.add("hidden");
  $("show-all").classList.add("hidden");

  if (!node) {
    $("rail-summary").textContent = "当前视图没有可调整的确认点。";
    appendText(list, "p", "请切换到包含确认点的 Outline 视图。", "status");
    return;
  }

  if (!selectedNodeId) selectedNodeId = node.id;
  const recommended = outlineRecommendedOption(node);
  const saved = nodeState(node.id);
  const impact = outlineAdjustmentImpact(node);
  $("rail-summary").textContent = `正在评估「${node.label || node.id}」的调整方案。中间结构保持不变，仅标记影响范围。`;

  const overview = adjustmentSection("调整提案", "adjustment-proposal");
  const heading = create("div", "adjustment-heading");
  appendText(heading, "span", node.confirmation_priority === "critical" ? "高影响 · 必须人工确认" : "模型建议", `priority-badge priority-${safeClassToken(node.confirmation_priority || "normal")}`);
  appendText(heading, "h4", recommended?.label || node.action_prompt || node.label);
  overview.appendChild(heading);
  appendText(overview, "p", recommended?.recommendation_reason || node.decision_summary || node.plain_summary);
  list.appendChild(overview);

  const comparison = adjustmentSection("调整前 / 调整后", "adjustment-comparison");
  const comparisonGrid = create("div", "adjustment-comparison-grid");
  const before = create("article", "adjustment-before");
  appendText(before, "span", "当前 Outline", "adjustment-kicker");
  appendText(before, "p", node.decision_background || node.plain_summary);
  const after = create("article", "adjustment-after");
  appendText(after, "span", "建议结果", "adjustment-kicker");
  appendText(after, "p", recommended?.consequence || node.decision_summary || "按建议重新生成 Outline。" );
  comparisonGrid.append(before, after);
  comparison.appendChild(comparisonGrid);
  list.appendChild(comparison);

  const evidence = adjustmentSection("依据与影响", "adjustment-evidence");
  appendAdjustmentFact(evidence, "依据位置", node.source_ref);
  appendAdjustmentFact(evidence, "影响级别", priorityLabel(impact.level));
  appendAdjustmentFact(evidence, "直接关联", impact.affected.length ? impact.affected.map((entry) => entry.label || entry.id).join("、") : "当前视图内部");
  appendAdjustmentFact(evidence, "保持稳定", impact.stable.length ? impact.stable.map((entry) => entry.label || entry.id).join("、") : "无额外节点");
  if (node.priority_reason) appendAdjustmentFact(evidence, "优先级原因", node.priority_reason);
  if (node.critical_basis) appendAdjustmentFact(evidence, "高影响依据", node.critical_basis);
  list.appendChild(evidence);

  const writeback = adjustmentSection("成熟度与写回计划", "adjustment-writeback");
  appendAdjustmentFact(writeback, "当前阶段", reviewData.outline_maturity || "specify_ready");
  appendAdjustmentFact(writeback, "调整后路由", recommended?.next_exit || "生成修订请求并刷新 Outline");
  appendText(writeback, "p", "语义调整不会直接改写当前渲染结果。系统会把选择和说明写入修订请求，由模型更新权威来源后重新生成 Outline；若证据不足，应回退到 frame 或 explore。", "adjustment-note");
  list.appendChild(writeback);

  const actions = adjustmentSection("Owner 操作", "adjustment-owner-actions");
  appendAdjustmentFact(actions, "责任人", node.owner || "待定");
  const actionRow = create("div", "adjustment-action-row");
  for (const option of node.options || []) {
    const button = create("button", option.id === node.recommended_option ? "primary" : "", option.id === node.recommended_option ? `接受建议：${option.label}` : `要求调整：${option.label}`);
    button.type = "button";
    button.addEventListener("click", () => chooseOption(node, option));
    actionRow.appendChild(button);
  }
  actions.appendChild(actionRow);
  if (saved.status === "DRAFT") {
    actions.appendChild(outlineAdjustmentDraftEditor(node, saved));
  }
  const status = create("div", "status");
  status.textContent = saved.status === "MISSING"
    ? (node.confirmation_priority === "critical" ? "高影响节点不能自动接受，必须由 Owner 明确选择。" : "尚未记录调整决定。")
    : nodeStatusLabel(node, saved);
  actions.appendChild(status);
  if (saved.status === "SAVED_RECOMMENDED" || saved.status === "SAVED_SUBMITTED") {
    const reset = create("button", "", "重新选择");
    reset.type = "button";
    reset.addEventListener("click", () => resetNodeChoice(node));
    actions.appendChild(reset);
  }
  list.appendChild(actions);
}

function outlineAdjustmentDraftEditor(node, saved) {
  const editor = create("div", "adjustment-draft-editor");
  appendText(editor, "strong", "补充修订要求");
  const typeLabel = create("label", "feedback-label", "纲要修改类型");
  const typeSelect = document.createElement("select");
  for (const changeType of changeTypeOptions()) {
    const option = document.createElement("option");
    option.value = changeType.value;
    option.textContent = changeType.label;
    typeSelect.appendChild(option);
  }
  typeSelect.value = saved.change_type || defaultChangeType();
  typeSelect.addEventListener("change", () => updateAdjustmentDraft(node, { change_type: typeSelect.value }));
  typeLabel.appendChild(typeSelect);
  editor.appendChild(typeLabel);

  const note = document.createElement("textarea");
  note.placeholder = "说明希望模型如何修改权威来源、重新生成哪些 Outline 节点，以及可接受的成熟度回退。";
  note.value = saved.note || "";
  note.addEventListener("input", () => updateAdjustmentDraft(node, { note: note.value }));
  editor.appendChild(note);

  const submit = create("button", "primary", "提交修订请求");
  const feedback = create("div", "status");
  submit.type = "button";
  submit.addEventListener("click", () => {
    const current = nodeState(node.id);
    const reviewerNote = note.value.trim();
    if (!reviewerNote) {
      feedback.textContent = "请先写清楚修订要求。";
      feedback.classList.add("error");
      note.focus();
      return;
    }
    const previousState = snapshotReviewState();
    state[node.id] = {
      status: "SAVED_SUBMITTED",
      option: current.draft_option,
      change_type: typeSelect.value || current.change_type || defaultChangeType(),
      note: reviewerNote
    };
    markSummaryDirty();
    if (!saveState()) {
      restoreReviewState(previousState);
      return;
    }
    copyDraftWarningArmed = false;
    downloadDraftWarningArmed = false;
    resetExportButtonLabels();
    setStatus("已提交 Outline 修订请求；下载确认包后由模型写回权威来源并重新生成 Outline。");
    render();
  });
  editor.append(submit, feedback);
  return editor;
}

function updateAdjustmentDraft(node, patch) {
  const current = nodeState(node.id);
  if (current.status !== "DRAFT") return;
  const previousState = snapshotReviewState();
  state[node.id] = { ...current, ...patch };
  markSummaryDirty();
  if (!saveState()) restoreReviewState(previousState);
}

function resetNodeChoice(node) {
  const previousState = snapshotReviewState();
  delete state[node.id];
  markSummaryDirty();
  if (!saveState()) {
    restoreReviewState(previousState);
    return;
  }
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  setStatus("已重置该确认点。需要重新选择处理方式。");
  render();
}

function nodeVisualState(node, saved = nodeState(node.id)) {
  if (!requiresNodeDecision(node)) return "passive";
  if (saved.status === "DRAFT") return "draft";
  if (saved.status === "SAVED_RECOMMENDED" || saved.status === "SAVED_SUBMITTED") return "resolved";
  return "open";
}

function nodeEmphasisClass(node) {
  return node.confirmation_priority === "critical" ? "is-focus" : "";
}

function nodeStatusDisplayLabel(node, saved) {
  if (!requiresNodeDecision(node)) return "无需人工操作";
  if (saved.status === "DRAFT") return "待提交";
  if (saved.status === "SAVED_RECOMMENDED" || saved.status === "SAVED_SUBMITTED") return "已解决";
  return "待解决";
}

function currentNodeOrdinal(node) {
  return reviewNodeDisplayOrdinal(node, currentItem(), currentModule());
}

function nodeCard(node) {
  const saved = nodeState(node.id);
  const visualState = nodeVisualState(node, saved);
  const nodeOrdinal = currentNodeOrdinal(node);
  const card = document.createElement("article");
  card.dataset.nodeId = node.id;
  card.dataset.reviewState = visualState;
  card.dataset.nodeOrdinal = nodeOrdinal;
  card.dataset.priority = node.confirmation_priority || "normal";
  card.className = [
    "node-card",
    `is-${visualState}`,
    nodeEmphasisClass(node),
    selectedNodeId === node.id ? "selected" : ""
  ].filter(Boolean).join(" ");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-pressed", String(selectedNodeId === node.id));
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, textarea, select, label, summary")) return;
    selectedNodeId = selectedNodeId === node.id ? null : node.id;
    selectedUiLayoutId = null;
    selectedUiComponentId = null;
    render();
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectedNodeId = selectedNodeId === node.id ? null : node.id;
      selectedUiLayoutId = null;
      selectedUiComponentId = null;
      render();
    }
  });

  const options = node.options || [];
  const meta = create("div", "node-meta");
  const metaLeft = document.createElement("span");
  const dot = create("span", `level-dot level-${safeClassToken(node.review_level)}`);
  metaLeft.appendChild(dot);
  metaLeft.appendChild(document.createTextNode(`${levelLabel(node.review_level)} · ${node.owner || "待定"}`));
  meta.appendChild(metaLeft);
  const metaRight = create("span", "node-meta-right");
  if (node.confirmation_priority) {
    appendText(metaRight, "span", priorityLabel(node.confirmation_priority), `priority-badge priority-${safeClassToken(node.confirmation_priority)}`);
  }
  appendText(metaRight, "span", nodeStatusLabel(node, saved), `node-state-badge node-state-${visualState}`);
  meta.appendChild(metaRight);
  card.appendChild(meta);

  const titleRow = create("div", "node-title-row");
  appendText(titleRow, "span", nodeOrdinal, "node-ordinal");
  appendText(titleRow, "h4", node.label || node.id || "未命名确认点");
  card.appendChild(titleRow);
  appendText(card, "p", node.action_prompt || node.plain_summary || "请判断这个确认点是否符合业务要求。");
  const decisionIntro = create("div", "decision-intro");
  appendOptionDetail(decisionIntro, "背景信息", node.decision_background || node.plain_summary);
  appendOptionDetail(decisionIntro, "决策摘要", node.decision_summary || node.action_prompt);
  card.appendChild(decisionIntro);

  const optionRow = create("div", "option-row");
  card.appendChild(optionRow);
  for (const [index, option] of options.entries()) {
    const optionOrdinal = reviewOptionDisplayOrdinal(nodeOrdinal, index);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.optionOrdinal = optionOrdinal;
    button.className = optionClassName(node, option, saved);
    const optionHeading = create("span", "option-heading");
    appendText(optionHeading, "span", optionOrdinal, "option-ordinal");
    appendText(optionHeading, "strong", `${option.label || option.id}${option.id === node.recommended_option ? "（推荐）" : ""}`);
    button.appendChild(optionHeading);
    const detailList = create("span", "option-detail-list");
    appendOptionDetail(detailList, "收益", option.benefit || option.project_impact || option.when_to_choose);
    appendOptionDetail(detailList, "代价", option.cost || option.project_impact);
    if (option.id === node.recommended_option) {
      appendOptionDetail(detailList, "推荐理由", option.recommendation_reason);
    }
    button.appendChild(detailList);
    button.addEventListener("click", () => chooseOption(node, option));
    optionRow.appendChild(button);
  }

  const details = document.createElement("details");
  appendText(details, "summary", "为什么这样建议");
  appendText(details, "p", `依据位置：${node.source_ref || "未提供"}`);
  appendText(details, "p", node.plain_summary || "");
  if (options.length) {
    const executionList = create("div", "option-detail-list");
    for (const option of options) {
      appendOptionDetail(executionList, `${option.id} 执行字段：选择后动作`, option.consequence);
      appendOptionDetail(executionList, `${option.id} 执行字段：后续出口`, option.next_exit);
    }
    details.appendChild(executionList);
  }
  card.appendChild(details);

  const feedback = create("div", `feedback ${saved.status === "DRAFT" ? "" : "hidden"}`);
  const changeTypeLabels = { flow: "流程修改类型", ui: "界面修改类型", outline: "纲要修改类型" };
  const changeTypeLabel = create("label", "feedback-label", changeTypeLabels[reviewData?.review_type] || "修改类型");
  const changeTypeSelect = document.createElement("select");
  changeTypeSelect.name = "change_type";
  for (const changeType of changeTypeOptions()) {
    const selectOption = document.createElement("option");
    selectOption.value = changeType.value;
    selectOption.textContent = changeType.label;
    changeTypeSelect.appendChild(selectOption);
  }
  changeTypeSelect.value = saved.change_type || defaultChangeType();
  changeTypeSelect.addEventListener("change", () => {
    const current = nodeState(node.id);
    if (current.status === "DRAFT") {
      const previousState = snapshotReviewState();
      state[node.id] = { ...current, change_type: changeTypeSelect.value };
      markSummaryDirty();
      if (!saveState()) restoreReviewState(previousState);
    }
  });
  changeTypeLabel.appendChild(changeTypeSelect);
  feedback.appendChild(changeTypeLabel);
  const textarea = document.createElement("textarea");
  textarea.placeholder = "请用自然语言写清楚希望模型下一轮如何修改，不需要在这里直接改流程、界面或纲要。";
  textarea.value = saved.note || "";
  textarea.addEventListener("input", () => {
    const current = nodeState(node.id);
    if (current.status === "DRAFT") {
      const previousState = snapshotReviewState();
      state[node.id] = { ...current, note: textarea.value };
      markSummaryDirty();
      if (!saveState()) restoreReviewState(previousState);
    }
  });
  feedback.appendChild(textarea);
  const submit = create("button", "submit-choice primary", "提交选择");
  submit.type = "button";
  feedback.appendChild(submit);
  const feedbackStatus = create("div", "status");
  feedback.appendChild(feedbackStatus);
  card.appendChild(feedback);

  const statusLine = create("div", "status");
  if (saved.status === "SAVED_RECOMMENDED") {
    statusLine.textContent = "已按推荐保存，可重新选择。";
  } else if (saved.status === "SAVED_SUBMITTED") {
    statusLine.textContent = "已提交非推荐选择，可重新选择。";
  } else if (saved.status === "DRAFT") {
    statusLine.textContent = "非推荐选项已暂存为草稿，请提交审核意见后才会进入授权摘要。";
  }
  card.appendChild(statusLine);

  submit.addEventListener("click", () => {
    const note = textarea.value.trim();
    if (!note) {
      feedbackStatus.textContent = "请先填写审核意见。";
      feedbackStatus.classList.add("error");
      textarea.focus();
      return;
    }
    const draftOption = nodeState(node.id).draft_option;
    if (!draftOption) {
      feedbackStatus.textContent = "请先选择一个非推荐选项。";
      feedbackStatus.classList.add("error");
      return;
    }
    const changeType = changeTypeSelect.value || nodeState(node.id).change_type || defaultChangeType();
    if (!changeType) {
      feedbackStatus.textContent = "请先选择修改类型。";
      feedbackStatus.classList.add("error");
      changeTypeSelect.focus();
      return;
    }
    const previousState = snapshotReviewState();
    state[node.id] = {
      status: "SAVED_SUBMITTED",
      option: draftOption,
      change_type: changeType,
      note
    };
    markSummaryDirty();
    if (!saveState()) {
      restoreReviewState(previousState);
      return;
    }
    copyDraftWarningArmed = false;
    downloadDraftWarningArmed = false;
    resetExportButtonLabels();
    setStatus("已提交非推荐选择。");
    render();
  });

  if (saved.status === "SAVED_RECOMMENDED" || saved.status === "SAVED_SUBMITTED") {
    const reselect = document.createElement("button");
    reselect.type = "button";
    reselect.textContent = "重新选择";
    reselect.addEventListener("click", () => resetNodeChoice(node));
    card.appendChild(reselect);
  }

  return card;
}

function appendOptionDetail(list, label, value) {
  const row = create("span", "option-detail-row");
  appendText(row, "span", label).className = "option-detail-label";
  appendText(row, "span", value || "未提供说明。").className = "option-detail-value";
  list.appendChild(row);
}

function optionClassName(node, option, saved) {
  const classes = [option.id === node.recommended_option ? "option recommended" : "option"];
  if (saved.option === option.id || saved.draft_option === option.id) classes.push("selected");
  return classes.join(" ");
}

function nodeStatusLabel(node, saved) {
  return nodeStatusDisplayLabel(node, saved);
}

function savedRecommendedOption(node, saved) {
  return saved.option === node.recommended_option;
}

function chooseOption(node, option) {
  const previousState = snapshotReviewState();
  if (option.id === node.recommended_option && node.recommended_option) {
    setStatus("正在保存推荐选择。");
    state[node.id] = {
      status: "SAVED_RECOMMENDED",
      option: option.id
    };
    markSummaryDirty();
    if (!saveState()) {
      restoreReviewState(previousState);
      return;
    }
    copyDraftWarningArmed = false;
    downloadDraftWarningArmed = false;
    resetExportButtonLabels();
    setStatus("已按推荐保存，可重新选择；正式授权需下载确认包并写回确认文档。");
    render();
    return;
  }

  state[node.id] = {
    status: "DRAFT",
    draft_option: option.id,
    change_type: nodeState(node.id).change_type || defaultChangeType(),
    note: nodeState(node.id).note || ""
  };
  markSummaryDirty();
  if (!saveState()) {
    restoreReviewState(previousState);
    return;
  }
  pendingFocusNodeId = node.id;
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  setStatus("非推荐选项已暂存为草稿，请补充审核意见。");
  render();
}

function optionById(node, optionId) {
  return (node.options || []).find((option) => option.id === optionId) || null;
}

function isNeedsDecisionExit(option) {
  return String(option?.next_exit || "").trim().toLowerCase().startsWith("needs-decision");
}

function summaryText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function summaryScalar(value) {
  return JSON.stringify(summaryText(value));
}

function requiresNodeDecision(node) {
  return Boolean(node.recommended_option || (node.options || []).length || node.review_level === "must_confirm");
}

function isSubmittedRevisionRequest(node, saved) {
  return Boolean(
    saved.status === "SAVED_SUBMITTED" &&
    saved.change_type &&
    saved.note &&
    saved.option &&
    saved.option !== node.recommended_option
  );
}

function recordLine(module, item, node, saved, option) {
  const parts = [
    summaryText(`${module.title || module.id} / ${item.title || item.id} / ${node.label || node.id}`),
    `selected_option: ${summaryText(saved.option || saved.draft_option || "MISSING")}`,
    `status: ${summaryText(saved.status || "MISSING")}`
  ];
  if (option?.next_exit) parts.push(`next_exit: ${summaryText(option.next_exit)}`);
  if (saved.change_type) parts.push(`change_type: ${summaryText(saved.change_type)}`);
  if (saved.note) parts.push(`note: ${summaryText(saved.note)}`);
  return `- ${parts.join("；")}`;
}

function buildRevisionRequest(module, item, node, saved, option) {
  return revisionRequestObject(module, item, node, saved, option);
}

function revisionRequestObject(module, item, node, saved, option) {
  const targetRef = `${module.id || module.title}:${item.id || item.title}:${node.id}`;
  const targetLabel = `${module.title || module.id} / ${item.title || item.id} / ${node.label || node.id}`;
  const expectedActions = {
    flow: "下一轮 /sp.flow 根据修改类型和审核意见调整 flow review data，再重新生成确认页。",
    ui: "下一轮 /sp.ui 根据修改类型和审核意见调整 UI review data，再重新生成确认页。",
    outline: "下一轮 /sp.prd 根据修改类型和审核意见调整 spec-outline.md 与 Outline review data，再重新生成确认页。"
  };
  const expectedAction = expectedActions[reviewData?.review_type] || "停止处理并修正未知 review_type。";
  return {
    target_ref: summaryText(targetRef),
    target_label: summaryText(targetLabel),
    review_type: summaryText(reviewData?.review_type || "unknown"),
    change_type: summaryText(saved.change_type || "OTHER"),
    selected_option: summaryText(saved.option || saved.draft_option || "MISSING"),
    reviewer_note: summaryText(saved.note || ""),
    expected_model_action: summaryText(expectedAction),
    next_exit: summaryText(option?.next_exit || "needs-revision")
  };
}

function uiAdjustmentChangeType(adjustment) {
  const hasLayout = Object.values(adjustment.layout || {}).some((layout) => (
    layout.offset_x || layout.offset_y || layout.width_step || layout.height_step
  ));
  const hasText = Boolean(adjustment.text?.trim());
  if (hasLayout && hasText) return "OTHER";
  if (hasLayout) return "MODIFY_REGION_LAYOUT";
  if (hasText) return "MODIFY_FIELD_ACTION_COPY";
  return "OTHER";
}

function uiLayoutAdjustmentRevisionRequest(entry) {
  const suggestion = entry.adjustment.suggestion.trim();
  return {
    target_ref: entry.ref,
    target_label: `${entry.module.title || entry.module.id} / ${entry.item.title || entry.item.id} / 整体布局`,
    review_type: "ui",
    change_type: "MODIFY_SCREEN_STRUCTURE",
    selected_option: "UI_LAYOUT_ADJUSTMENT",
    reviewer_note: suggestion,
    expected_model_action: "下一轮 /sp.ui 根据页面级整体布局建议更新当前界面的结构化 UI review data，并重新生成受影响界面。",
    next_exit: "needs-revision",
    adjustment: {
      current_screen_layout: summaryText(entry.item.screen_layout || ""),
      layout_suggestion: summaryText(suggestion)
    }
  };
}

function uiLayoutAdjustmentRecordLine(entry) {
  return `- ${summaryText(`${entry.module.title || entry.module.id} / ${entry.item.title || entry.item.id} / 整体布局`)}；selected_option: UI_LAYOUT_ADJUSTMENT；status: SAVED_SUBMITTED；change_type: MODIFY_SCREEN_STRUCTURE；note: ${summaryText(entry.adjustment.suggestion)}`;
}

function uiAdjustmentReviewerNote(entry) {
  const adjustment = entry.adjustment;
  const notes = [];
  if (adjustment.suggestion?.trim()) notes.push(adjustment.suggestion.trim());
  if (adjustment.text?.trim()) notes.push(`将显示文字改为“${adjustment.text.trim()}”`);
  for (const [viewport, layout] of Object.entries(adjustment.layout || {})) {
    const viewportLabel = uiPreviewViewportLabel(viewport);
    if (layout.offset_x || layout.offset_y) {
      notes.push(`${viewportLabel}位置偏移为 X ${layout.offset_x}px、Y ${layout.offset_y}px`);
    }
    if (layout.width_step || layout.height_step) {
      notes.push(`${viewportLabel}尺寸调整为宽度 ${100 + layout.width_step * 5}%、高度 ${100 + layout.height_step * 5}%`);
    }
  }
  return notes.join("；") || "请重新评估此界面元素。";
}

function uiAdjustmentRevisionRequest(entry) {
  const layouts = Object.fromEntries(
    Object.entries(entry.adjustment.layout || {}).map(([viewport, layout]) => [viewport, {
      offset_x_px: layout.offset_x,
      offset_y_px: layout.offset_y,
      width_percent: 100 + layout.width_step * 5,
      height_percent: 100 + layout.height_step * 5
    }])
  );
  return {
    target_ref: entry.ref,
    target_label: `${entry.module.title || entry.module.id} / ${entry.item.title || entry.item.id} / ${entry.region.title || entry.region.id} / ${entry.component.label || entry.component.id}`,
    review_type: "ui",
    change_type: uiAdjustmentChangeType(entry.adjustment),
    selected_option: "UI_COMPONENT_ADJUSTMENT",
    reviewer_note: uiAdjustmentReviewerNote(entry),
    expected_model_action: "下一轮 /sp.ui 根据元素级修改建议更新 UI review data，并重新生成受影响界面。",
    next_exit: "needs-revision",
    adjustment: {
      replacement_text: summaryText(entry.adjustment.text || ""),
      layouts
    }
  };
}

function uiAdjustmentRecordLine(entry) {
  return `- ${summaryText(`${entry.module.title || entry.module.id} / ${entry.item.title || entry.item.id} / ${entry.region.title || entry.region.id} / ${entry.component.label || entry.component.id}`)}；selected_option: UI_COMPONENT_ADJUSTMENT；status: SAVED_SUBMITTED；change_type: ${uiAdjustmentChangeType(entry.adjustment)}；note: ${summaryText(uiAdjustmentReviewerNote(entry))}`;
}

function revisionRequestMarkdown(request) {
  const lines = [
    `- target_ref: ${summaryScalar(request.target_ref)}`,
    `  target_label: ${summaryScalar(request.target_label)}`,
    `  review_type: ${summaryScalar(request.review_type)}`,
    `  change_type: ${summaryScalar(request.change_type)}`,
    `  selected_option: ${summaryScalar(request.selected_option)}`,
    `  reviewer_note: ${summaryScalar(request.reviewer_note)}`,
    `  expected_model_action: ${summaryScalar(request.expected_model_action)}`,
    `  next_exit: ${summaryScalar(request.next_exit)}`
  ];
  if (request.adjustment) lines.push(`  adjustment: ${summaryScalar(JSON.stringify(request.adjustment))}`);
  return lines.join("\n");
}

function buildSummaryGroups() {
  const groups = {
    confirmed_items: [],
    decision_records: [],
    decision_recorded_items: [],
    needs_decision_items: [],
    unresolved_decision_items: [],
    draft_excluded_items: [],
    revision_requests: []
  };

  for (const { module, item, node } of allNodes()) {
    const saved = nodeState(node.id);
    const selectedOptionId = saved.option || saved.draft_option || "";
    const option = optionById(node, selectedOptionId);
    const line = recordLine(module, item, node, saved, option);

    if (!requiresNodeDecision(node)) {
      groups.confirmed_items.push(`${module.id || module.title}:${item.id || item.title}:${node.id}`);
      continue;
    }
    if (saved.status === "DRAFT") {
      groups.draft_excluded_items.push(line);
      continue;
    }
    if (!saved.option || !option?.next_exit) {
      groups.unresolved_decision_items.push(line);
      continue;
    }
    if (isNeedsDecisionExit(option)) {
      groups.needs_decision_items.push(line);
      if (isSubmittedRevisionRequest(node, saved)) {
        groups.revision_requests.push(revisionRequestMarkdown(buildRevisionRequest(module, item, node, saved, option)));
      }
      continue;
    }
    groups.decision_recorded_items.push(`${module.id || module.title}:${item.id || item.title}:${node.id}`);
    groups.decision_records.push(line);
    if (isSubmittedRevisionRequest(node, saved)) {
      groups.revision_requests.push(revisionRequestMarkdown(buildRevisionRequest(module, item, node, saved, option)));
    }
  }

  for (const entry of savedUiComponentAdjustments()) {
    const line = uiAdjustmentRecordLine(entry);
    groups.needs_decision_items.push(line);
    groups.revision_requests.push(revisionRequestMarkdown(uiAdjustmentRevisionRequest(entry)));
  }

  for (const entry of savedUiLayoutAdjustments()) {
    const line = uiLayoutAdjustmentRecordLine(entry);
    groups.needs_decision_items.push(line);
    groups.revision_requests.push(revisionRequestMarkdown(uiLayoutAdjustmentRevisionRequest(entry)));
  }

  return groups;
}

function buildConfirmationRecord(module, item, node) {
  const saved = nodeState(node.id);
  const selectedOptionId = saved.option || saved.draft_option || "";
  const option = optionById(node, selectedOptionId);
  const targetRef = `${module.id || module.title}:${item.id || item.title}:${node.id}`;
  const targetLabel = `${module.title || module.id} / ${item.title || item.id} / ${node.label || node.id}`;
  const requiresDecision = requiresNodeDecision(node);
  const status = saved.status || "MISSING";
  let bucket = "unresolved_decision_items";
  if (!requiresDecision) {
    bucket = "confirmed_items";
  } else if (status === "DRAFT") {
    bucket = "draft_excluded_items";
  } else if (isNeedsDecisionExit(option)) {
    bucket = "needs_decision_items";
  } else if (saved.option && option?.next_exit) {
    bucket = "decision_recorded_items";
  }
  const isAuthorizedDecision = bucket === "confirmed_items" || bucket === "decision_recorded_items";
  const authorizationState = isAuthorizedDecision
    ? "AUTHORIZED"
    : bucket === "draft_excluded_items"
      ? "EXCLUDED_DRAFT"
      : "NOT_AUTHORIZED";

  const record = {
    target_ref: summaryText(targetRef),
    target_label: summaryText(targetLabel),
    module_id: summaryText(module.id || ""),
    module_title: summaryText(module.title || module.id || ""),
    item_id: summaryText(item.id || ""),
    item_title: summaryText(item.title || item.id || ""),
    node_id: summaryText(node.id || ""),
    node_label: summaryText(node.label || node.id || ""),
    review_layer: summaryText(node.review_layer || ""),
    review_level: summaryText(node.review_level || ""),
    confirmation_priority: summaryText(node.confirmation_priority || ""),
    priority_reason: summaryText(node.priority_reason || ""),
    critical_basis: summaryText(node.critical_basis || ""),
    owner: summaryText(node.owner || ""),
    bucket,
    status,
    authorization_state: authorizationState,
    is_authorized_decision: isAuthorizedDecision,
    selected_option: summaryText(saved.option || saved.draft_option || "MISSING"),
    selected_option_label: summaryText(option?.label || ""),
    next_exit: summaryText(option?.next_exit || ""),
    change_type: summaryText(saved.change_type || ""),
    reviewer_note: summaryText(saved.note || ""),
    line: recordLine(module, item, node, saved, option)
  };

  if (isSubmittedRevisionRequest(node, saved)) {
    record.revision_request = revisionRequestObject(module, item, node, saved, option);
  } else {
    record.revision_request = null;
  }
  return record;
}

function buildUiAdjustmentConfirmationRecord(entry) {
  const request = uiAdjustmentRevisionRequest(entry);
  return {
    record_type: "ui_component_adjustment",
    target_ref: entry.ref,
    target_label: request.target_label,
    module_id: summaryText(entry.module.id || ""),
    module_title: summaryText(entry.module.title || entry.module.id || ""),
    item_id: summaryText(entry.item.id || ""),
    item_title: summaryText(entry.item.title || entry.item.id || ""),
    region_id: summaryText(entry.region.id || ""),
    region_title: summaryText(entry.region.title || entry.region.id || ""),
    component_id: summaryText(entry.component.id || ""),
    component_kind: summaryText(entry.component.kind || ""),
    source_ref: summaryText(entry.component.source_ref || ""),
    node_id: summaryText(entry.component.id || ""),
    node_label: summaryText(entry.component.label || entry.component.id || ""),
    review_layer: "component",
    review_level: "revision_request",
    confirmation_priority: "",
    priority_reason: "",
    critical_basis: "",
    owner: "UI reviewer",
    bucket: "needs_decision_items",
    status: "SAVED_SUBMITTED",
    authorization_state: "NOT_AUTHORIZED",
    is_authorized_decision: false,
    selected_option: "UI_COMPONENT_ADJUSTMENT",
    selected_option_label: "元素级修改建议",
    next_exit: "needs-revision",
    change_type: request.change_type,
    reviewer_note: request.reviewer_note,
    requested_changes: request.adjustment,
    line: uiAdjustmentRecordLine(entry),
    revision_request: request
  };
}

function buildUiLayoutAdjustmentConfirmationRecord(entry) {
  const request = uiLayoutAdjustmentRevisionRequest(entry);
  return {
    record_type: "ui_layout_adjustment",
    target_ref: entry.ref,
    target_label: request.target_label,
    module_id: summaryText(entry.module.id || ""),
    module_title: summaryText(entry.module.title || entry.module.id || ""),
    item_id: summaryText(entry.item.id || ""),
    item_title: summaryText(entry.item.title || entry.item.id || ""),
    screen_layout: summaryText(entry.item.screen_layout || ""),
    node_id: "screen-layout",
    node_label: "整体布局",
    review_layer: "screen",
    review_level: "revision_request",
    confirmation_priority: "",
    priority_reason: "",
    critical_basis: "",
    owner: "UI reviewer",
    bucket: "needs_decision_items",
    status: "SAVED_SUBMITTED",
    authorization_state: "NOT_AUTHORIZED",
    is_authorized_decision: false,
    selected_option: "UI_LAYOUT_ADJUSTMENT",
    selected_option_label: "页面级整体布局建议",
    next_exit: "needs-revision",
    change_type: request.change_type,
    reviewer_note: request.reviewer_note,
    requested_changes: request.adjustment,
    line: uiLayoutAdjustmentRecordLine(entry),
    revision_request: request
  };
}

function buildConfirmationPackageInput() {
  const groups = buildSummaryGroups();
  const componentAdjustments = savedUiComponentAdjustments();
  const layoutAdjustments = savedUiLayoutAdjustments();
  const modules = [];
  for (const module of reviewData?.modules || []) {
    const records = [];
    for (const item of module[itemKey()] || []) {
      for (const node of item.nodes || []) {
        records.push(buildConfirmationRecord(module, item, node));
      }
    }
    for (const entry of componentAdjustments.filter((candidate) => candidate.module === module)) {
      records.push(buildUiAdjustmentConfirmationRecord(entry));
    }
    for (const entry of layoutAdjustments.filter((candidate) => candidate.module === module)) {
      records.push(buildUiLayoutAdjustmentConfirmationRecord(entry));
    }
    modules.push({
      module_id: module.id || module.title || "module",
      module_title: module.title || module.id || "未命名模块",
      module_summary: module.summary || "未提供模块说明。",
      status: records.some((record) => record.revision_request)
        ? "NEEDS_REVISION"
        : records.some((record) => record.bucket === "unresolved_decision_items" || record.bucket === "draft_excluded_items")
          ? "HAS_OPEN_ITEMS"
          : "AUTHORIZED",
      records
    });
  }
  return {
    schema_version: reviewData.schema_version,
    review_type: reviewData.review_type,
    batch_id: reviewData.batch_id || "N/A",
    review_data_id: reviewDataIdentifier(),
    source_review_data: reviewData.artifact_path || "N/A",
    artifact_path: reviewData.artifact_path || "",
    outline_digest: reviewData.outline_digest,
    source_authority_ids: reviewData.source_authority_ids,
    target_path: window.SpecCompassConfirmationPackage?.safeWritebackTarget(reviewData),
    generated_at: new Date().toISOString(),
    groups,
    modules
  };
}

function formatSummaryList(items) {
  return items.length ? items.join("\n") : "- none";
}

async function copySummary() {
  const groups = buildSummaryGroups();
  if (groups.draft_excluded_items.length && !copyDraftWarningArmed) {
    copyDraftWarningArmed = true;
    $("copy-summary").textContent = "仍要复制摘要";
    setStatus("草稿不具备授权意义，复制摘要前请先处理草稿。再次点击会复制，但草稿只进入排除清单。", true);
    return;
  }
  const target = writebackTarget();
  const warning = groups.draft_excluded_items.length
    ? `[WARNING: ${groups.draft_excluded_items.length} 个节点仍是待提交草稿，未正式授权]\n\n`
    : "";
  const text = `# SpecCompass Confirmation Summary

${warning}schema_version: ${SUPPORTED_SCHEMA_VERSION}
review_type: ${reviewData.review_type}
batch_id: ${reviewData.batch_id || "N/A"}
review_data_id: ${reviewDataIdentifier()}
source_review_data: ${reviewData.artifact_path || "N/A"}
writeback_target: ${target}

confirmed_items:
${formatSummaryList(groups.confirmed_items)}

decision_recorded_items:
${formatSummaryList(groups.decision_recorded_items)}

decision_records:
${formatSummaryList(groups.decision_records)}

needs_decision_items:
${formatSummaryList(groups.needs_decision_items)}

unresolved_decision_items:
${formatSummaryList(groups.unresolved_decision_items)}

draft_excluded_items:
${formatSummaryList(groups.draft_excluded_items)}

revision_requests:
${formatSummaryList(groups.revision_requests)}
`;
  if (!navigator.clipboard?.writeText) {
    setStatus(`浏览器不支持自动复制；请改用本地服务或手动写回 ${target}。`, true);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    setStatus(`确认摘要未能复制：${error.message || error}。请改用本地服务或手动写回 ${target}。`, true);
    return;
  }
  const previousState = snapshotReviewState();
  state.__meta = {
    ...(state.__meta || {}),
    copied_fingerprint: summaryFingerprint(),
    copied_at: new Date().toISOString()
  };
  if (!saveState()) {
    restoreReviewState(previousState);
    setStatus(`确认摘要已复制，但浏览器未能记录复制状态；请直接写回 ${target}。`, true);
    return;
  }
  copyDraftWarningArmed = false;
  resetExportButtonLabels();
  setStatus(`确认摘要已复制，请写回 ${target}。`);
}

async function writeConfirmationPackage() {
  if (!window.SpecCompassConfirmationPackage) {
    setStatus("确认包模块未加载，请刷新页面后重试，或使用复制摘要兜底。", true);
    return;
  }
  const pendingFallback = writebackFallback?.kind === "confirmation" ? writebackFallback : null;
  const allReviewNodes = allNodes().map(({ node }) => node);
  const completion = summarizeRecommendationCompletion(allReviewNodes);
  if (completion.unfinished) {
    const criticalText = completion.criticalRequiresIndividual
      ? `\n其中 ${completion.criticalRequiresIndividual} 个非常重要确认点必须逐项处理，不会批量保存。`
      : "";
    const confirmed = window.confirm(
      `所有模块和流程还有 ${completion.unfinished} 个剩余未选项，其中 ${completion.canSaveRecommended} 个可按推荐自动保存。${criticalText}\n不会覆盖已有选择或草稿；缺少推荐选项或非常重要的确认点会阻止写回。\n是否将符合条件的剩余未选项按推荐设置并继续写回？`
    );
    if (!confirmed) {
      setStatus("已取消按推荐补齐，未写入项目。");
      return;
    }
    const result = applyRecommendedToMissing(allReviewNodes);
    if (result.savedRecommended) {
      if (!saveState()) {
        restoreReviewState(result.previousState);
        return;
      }
      copyDraftWarningArmed = false;
      downloadDraftWarningArmed = false;
      resetExportButtonLabels();
      if (!result.drafts) render();
    }
    if (result.missingRecommendation) {
      setStatus(`仍有 ${result.missingRecommendation} 个剩余未选项缺少推荐选项，请人工处理后再写入项目。`, true);
      return;
    }
    if (result.criticalRequiresIndividual) {
      setStatus(`仍有 ${result.criticalRequiresIndividual} 个非常重要确认点必须逐项处理，请完成后再写入项目。`, true);
      return;
    }
  }
  const groups = buildSummaryGroups();
  if (groups.unresolved_decision_items.length) {
    setStatus(`仍有 ${groups.unresolved_decision_items.length} 个确认点没有有效选择，请人工处理后再写入项目。`, true);
    return;
  }
  if (groups.draft_excluded_items.length && !downloadDraftWarningArmed) {
    downloadDraftWarningArmed = true;
    $("download-package").textContent = "仍要写入项目";
    setStatus("草稿不具备授权意义，写入前请先处理草稿。再次点击会写入，但草稿只进入排除清单。", true);
    return;
  }

  let parts = pendingFallback?.parts;
  let payload = pendingFallback?.payload;
  const target = pendingFallback?.target_path || writebackTarget();
  if (!parts || !payload) {
    try {
      parts = window.SpecCompassConfirmationPackage.splitConfirmationPackage(buildConfirmationPackageInput());
    } catch (error) {
      setStatus(`确认包生成失败：${error.message || error}。请使用复制摘要兜底。`, true);
      return;
    }
    payload = {
      kind: "confirmation",
      review_data_id: reviewDataIdentifier(),
      parts
    };
  }
  if (!beginWriteback()) return;
  let result;
  try {
    if (!window.SpecCompassWriteback) {
      const unavailable = new Error("本地写回客户端未加载");
      unavailable.allowFallback = true;
      unavailable.recoveryAction = "retry_then_download";
      throw unavailable;
    }
    result = await window.SpecCompassWriteback.submit(payload);
  } catch (error) {
    clearPackageDownloadLinks();
    if (error?.allowFallback === true) {
      writebackFallback = { kind: "confirmation", parts, payload, target_path: target };
      renderPackageDownloadLinks(parts);
      $("copy-summary").classList.remove("hidden");
      setStatus(`项目写入失败：${error.message || error}。可重试写入，或使用下方降级下载链接；复制摘要是最后兜底。`, true);
    } else {
      writebackFallback = null;
      $("copy-summary").classList.add("hidden");
      setStatus(`项目写入被拒绝：${error.message || error}。${writebackRecoveryGuidance(error)}`, true);
    }
    return;
  } finally {
    finishWriteback();
  }
  clearPackageDownloadLinks();

  const previousState = snapshotReviewState();
  state.__meta = {
    ...(state.__meta || {}),
    copied_fingerprint: summaryFingerprint(),
    written_at: new Date().toISOString(),
    written_target_path: result.target_path,
    written_review_data_id: result.review_data_id
  };
  const writeStateSaved = saveState();
  if (!writeStateSaved) restoreReviewState(previousState);
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  const revisionText = result.revision_request_count
    ? `记录了 ${result.revision_request_count} 条人工修订意见。`
    : "没有新的人工修订意见。";
  setStatus(
    writeStateSaved
      ? `已写入 ${result.target_path}。${revisionText} 回到 Codex 重新执行 ${result.next_command}。`
      : `已写入 ${result.target_path}，但浏览器未能记录本地状态。回到 Codex 重新执行 ${result.next_command}。`,
    !writeStateSaved
  );
}
