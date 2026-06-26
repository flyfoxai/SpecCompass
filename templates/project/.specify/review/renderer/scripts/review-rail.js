/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. */
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
    if (event.target.closest("button, textarea, summary")) return;
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

  const optionRow = create("div", "option-row");
  card.appendChild(optionRow);
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = optionClassName(node, option, saved);
    appendText(button, "strong", `${option.label || option.id}${option.id === node.recommended_option ? "（推荐）" : ""}`);
    button.appendChild(document.createElement("br"));
    appendText(button, "span", option.when_to_choose || "");
    button.addEventListener("click", () => chooseOption(node, option));
    optionRow.appendChild(button);
  }

  const details = document.createElement("details");
  appendText(details, "summary", "为什么这样建议");
  appendText(details, "p", `依据位置：${node.source_ref || "未提供"}`);
  appendText(details, "p", node.plain_summary || "");
  card.appendChild(details);

  const feedback = create("div", `feedback ${saved.status === "DRAFT" ? "" : "hidden"}`);
  const textarea = document.createElement("textarea");
  textarea.placeholder = "请补充选择非推荐项的原因";
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
    state[node.id] = {
      status: "SAVED_SUBMITTED",
      option: draftOption,
      note
    };
    markSummaryDirty();
    saveState();
    copyDraftWarningArmed = false;
    $("copy-summary").textContent = "复制确认摘要";
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
      $("copy-summary").textContent = "复制确认摘要";
      setStatus("已重置该确认点。");
      render();
    });
    card.appendChild(reselect);
  }

  return card;
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
  return saved.status || "MISSING";
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
    $("copy-summary").textContent = "复制确认摘要";
    setStatus("已按推荐保存，可重新选择；正式授权需复制摘要并写回确认文档。");
    render();
    return;
  }

  state[node.id] = {
    status: "DRAFT",
    draft_option: option.id,
    note: nodeState(node.id).note || ""
  };
  markSummaryDirty();
  saveState();
  pendingFocusNodeId = node.id;
  copyDraftWarningArmed = false;
  $("copy-summary").textContent = "复制确认摘要";
  setStatus("非推荐选项已暂存为草稿，请补充审核意见。");
  render();
}

function optionById(node, optionId) {
  return (node.options || []).find((option) => option.id === optionId) || null;
}

function isNeedsDecisionExit(option) {
  return String(option?.next_exit || "").trim().toLowerCase().startsWith("needs-decision");
}

function requiresNodeDecision(node) {
  return Boolean(node.recommended_option || (node.options || []).length || node.review_level === "must_confirm");
}

function recordLine(module, item, node, saved, option) {
  const parts = [
    `${module.title || module.id} / ${item.title || item.id} / ${node.label || node.id}`,
    `selected_option: ${saved.option || saved.draft_option || "MISSING"}`,
    `status: ${saved.status || "MISSING"}`
  ];
  if (option?.next_exit) parts.push(`next_exit: ${option.next_exit}`);
  if (saved.note) parts.push(`note: ${saved.note}`);
  return `- ${parts.join("；")}`;
}

function buildSummaryGroups() {
  const groups = {
    confirmed_items: [],
    decision_records: [],
    decision_recorded_items: [],
    needs_decision_items: [],
    unresolved_decision_items: [],
    draft_excluded_items: []
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
    if (saved.option === "OPTION_B" && isNeedsDecisionExit(option)) {
      groups.needs_decision_items.push(line);
      continue;
    }
    if (saved.option === "OPTION_B") {
      groups.unresolved_decision_items.push(line);
      continue;
    }
    groups.decision_recorded_items.push(`${module.id || module.title}:${item.id || item.title}:${node.id}`);
    groups.decision_records.push(line);
  }

  return groups;
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
  $("copy-summary").textContent = "复制确认摘要";
  setStatus(`确认摘要已复制，请写回 ${target}。`);
}
