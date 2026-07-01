/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. */
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

function changeTypeOptions() {
  return reviewData?.review_type === "ui" ? uiChangeTypes : flowChangeTypes;
}

function defaultChangeType() {
  return reviewData?.review_type === "ui" ? "MODIFY_SCREEN_STRUCTURE" : "MODIFY_NODE";
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
  const savedCount = groups.decision_records.length + groups.needs_decision_items.length;
  return Boolean(copiedFingerprint !== summaryFingerprint() && savedCount);
}

function resetExportButtonLabels() {
  const copyButton = $("copy-summary");
  const downloadButton = $("download-package");
  if (copyButton) copyButton.textContent = "复制确认摘要兜底";
  if (downloadButton) downloadButton.textContent = "下载确认包";
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

  appendText(container, "strong", parts.length > 1 ? "多包下载链接" : "确认包下载链接");
  appendText(
    container,
    "p",
    parts.length > 1
      ? "浏览器可能拦截连续下载；请按 part 顺序确认每个文件都已下载。"
      : "如果自动下载没有出现，请点击下方链接。"
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
  const item = currentItem();
  $("rail-summary").textContent = selectedNodeId
    ? "当前只显示选中的确认点。"
    : `${item?.title || "当前视图"}的确认点。`;
  $("show-all").classList.toggle("hidden", !selectedNodeId);

  const list = $("node-list");
  list.replaceChildren();
  for (const node of visibleNodes()) {
    list.appendChild(nodeCard(node));
  }
  if (pendingFocusNodeId) {
    const textarea = document.querySelector(`[data-node-id="${CSS.escape(pendingFocusNodeId)}"] textarea`);
    if (textarea) textarea.focus();
    pendingFocusNodeId = null;
  }
}

function nodeCard(node) {
  const saved = nodeState(node.id);
  const card = document.createElement("article");
  card.dataset.nodeId = node.id;
  card.className = `node-card ${selectedNodeId === node.id ? "selected" : ""}`;
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-pressed", String(selectedNodeId === node.id));
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, textarea, select, label, summary")) return;
    selectedNodeId = selectedNodeId === node.id ? null : node.id;
    render();
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectedNodeId = selectedNodeId === node.id ? null : node.id;
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
  appendText(meta, "span", nodeStatusLabel(node, saved));
  card.appendChild(meta);

  appendText(card, "h4", node.label || node.id || "未命名确认点");
  appendText(card, "p", node.action_prompt || node.plain_summary || "请判断这个确认点是否符合业务要求。");
  const decisionIntro = create("div", "decision-intro");
  appendOptionDetail(decisionIntro, "背景信息", node.decision_background || node.plain_summary);
  appendOptionDetail(decisionIntro, "决策摘要", node.decision_summary || node.action_prompt);
  card.appendChild(decisionIntro);

  const optionRow = create("div", "option-row");
  card.appendChild(optionRow);
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = optionClassName(node, option, saved);
    appendText(button, "strong", `${option.label || option.id}${option.id === node.recommended_option ? "（推荐）" : ""}`);
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
  const changeTypeLabel = create("label", "feedback-label", reviewData?.review_type === "ui" ? "修改类型" : "流程修改类型");
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
      state[node.id] = { ...current, change_type: changeTypeSelect.value };
      markSummaryDirty();
      saveState();
    }
  });
  changeTypeLabel.appendChild(changeTypeSelect);
  feedback.appendChild(changeTypeLabel);
  const textarea = document.createElement("textarea");
  textarea.placeholder = "请用自然语言写清楚希望模型下一轮如何修改，不需要在这里直接改流程或界面。";
  textarea.value = saved.note || "";
  textarea.addEventListener("input", () => {
    const current = nodeState(node.id);
    if (current.status === "DRAFT") {
      state[node.id] = { ...current, note: textarea.value };
      markSummaryDirty();
      saveState();
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
    state[node.id] = {
      status: "SAVED_SUBMITTED",
      option: draftOption,
      change_type: changeType,
      note
    };
    markSummaryDirty();
    saveState();
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
    reselect.addEventListener("click", () => {
      delete state[node.id];
      markSummaryDirty();
      saveState();
      copyDraftWarningArmed = false;
      downloadDraftWarningArmed = false;
      resetExportButtonLabels();
      setStatus("已重置该确认点。");
      render();
    });
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
  if (!requiresNodeDecision(node)) {
    return "无需人工操作";
  }
  if (savedRecommendedOption(node, saved)) {
    return saved.status || "SAVED_RECOMMENDED";
  }
  return saved.status || "MISSING";
}

function savedRecommendedOption(node, saved) {
  return saved.option === node.recommended_option;
}

function chooseOption(node, option) {
  if (option.id === node.recommended_option && node.recommended_option) {
    setStatus("正在保存推荐选择。");
    state[node.id] = {
      status: "SAVED_RECOMMENDED",
      option: option.id
    };
    markSummaryDirty();
    saveState();
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
  saveState();
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
  const expectedAction = reviewData?.review_type === "ui"
    ? "下一轮 /sp.ui 根据修改类型和审核意见调整 UI review data，再重新生成确认页。"
    : "下一轮 /sp.flow 根据修改类型和审核意见调整 flow review data，再重新生成确认页。";
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

function revisionRequestMarkdown(request) {
  return [
    `- target_ref: ${summaryScalar(request.target_ref)}`,
    `  target_label: ${summaryScalar(request.target_label)}`,
    `  review_type: ${summaryScalar(request.review_type)}`,
    `  change_type: ${summaryScalar(request.change_type)}`,
    `  selected_option: ${summaryScalar(request.selected_option)}`,
    `  reviewer_note: ${summaryScalar(request.reviewer_note)}`,
    `  expected_model_action: ${summaryScalar(request.expected_model_action)}`,
    `  next_exit: ${summaryScalar(request.next_exit)}`
  ].join("\n");
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

function buildConfirmationPackageInput() {
  const groups = buildSummaryGroups();
  const modules = [];
  for (const module of reviewData?.modules || []) {
    const records = [];
    for (const item of module[itemKey()] || []) {
      for (const node of item.nodes || []) {
        records.push(buildConfirmationRecord(module, item, node));
      }
    }
    modules.push({
      module_id: module.id || module.title || "module",
      module_title: module.title || module.id || "未命名模块",
      module_summary: module.summary || "未提供模块说明。",
      status: records.some((record) => record.bucket === "unresolved_decision_items" || record.bucket === "draft_excluded_items")
        ? "HAS_OPEN_ITEMS"
        : "AUTHORIZED",
      records
    });
  }
  return {
    schema_version: SUPPORTED_SCHEMA_VERSION,
    review_type: reviewData.review_type,
    batch_id: reviewData.batch_id || "N/A",
    review_data_id: reviewDataIdentifier(),
    source_review_data: reviewData.artifact_path || "N/A",
    artifact_path: reviewData.artifact_path || "",
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
  state.__meta = {
    ...(state.__meta || {}),
    copied_fingerprint: summaryFingerprint(),
    copied_at: new Date().toISOString()
  };
  saveState();
  copyDraftWarningArmed = false;
  resetExportButtonLabels();
  setStatus(`确认摘要已复制，请写回 ${target}。`);
}

function downloadConfirmationPackage() {
  if (!window.SpecCompassConfirmationPackage) {
    setStatus("确认包下载模块未加载，请刷新页面后重试，或使用复制摘要兜底。", true);
    return;
  }
  const groups = buildSummaryGroups();
  if (groups.draft_excluded_items.length && !downloadDraftWarningArmed) {
    downloadDraftWarningArmed = true;
    $("download-package").textContent = "仍要下载确认包";
    setStatus("草稿不具备授权意义，下载确认包前请先处理草稿。再次点击会下载，但草稿只进入排除清单。", true);
    return;
  }

  let result;
  try {
    result = window.SpecCompassConfirmationPackage.downloadConfirmationPackage(buildConfirmationPackageInput());
  } catch (error) {
    setStatus(`确认包生成失败：${error.message || error}。请使用复制摘要兜底。`, true);
    return;
  }
  renderPackageDownloadLinks(result.parts);

  state.__meta = {
    ...(state.__meta || {}),
    copied_fingerprint: summaryFingerprint(),
    downloaded_at: new Date().toISOString(),
    downloaded_part_count: result.part_count,
    downloaded_filenames: result.filenames
  };
  saveState();
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  const target = writebackTarget();
  const splitText = result.part_count > 1
    ? `已按 100000 UTF-8 bytes 自动分为 ${result.part_count} 个确认包，请按 part_index 顺序发给模型写回 ${target}。`
    : `确认包已下载，请发给模型写回 ${target}。`;
  const fileText = result.filenames?.length ? ` 文件：${result.filenames.join("；")}` : "";
  setStatus(`${splitText}${fileText}`);
}
