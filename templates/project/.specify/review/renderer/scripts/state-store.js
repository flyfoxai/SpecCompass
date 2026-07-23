/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. */
function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function itemCollectionKey(data = reviewData) {
  return data?.review_type === "outline" ? "views" : data?.review_type === "ui" ? "screens" : "diagrams";
}

function canonicalizeReviewValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeReviewValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeReviewValue(value[key])])
    );
  }
  return value;
}

function canonicalReviewData(data = reviewData) {
  return JSON.stringify(canonicalizeReviewValue(data));
}

function legacyReviewIdentityPayload(data = reviewData) {
  const key = itemCollectionKey(data);
  return {
    schema_version: data?.schema_version,
    review_type: data?.review_type,
    artifact_path: data?.artifact_path,
    batch_id: data?.batch_id,
    project: {
      name: data?.project?.name,
      feature: data?.project?.feature
    },
    source_snapshot: data?.source_snapshot || [],
    modules: (data?.modules || []).map((module) => ({
      id: module.id,
      items: (module[key] || []).map((item) => ({
        id: item.id,
        nodes: (item.nodes || []).map((node) => ({
          id: node.id,
          review_level: node.review_level,
          recommended_option: node.recommended_option
        }))
      }))
    }))
  };
}

function reviewDataIdentifier(data = reviewData) {
  return hashText(canonicalReviewData(data));
}

function legacyReviewDataIdentifier(data = reviewData) {
  return hashText(JSON.stringify(legacyReviewIdentityPayload(data)));
}

function appendText(parent, tag, text, className) {
  const element = create(tag, className, text);
  parent.appendChild(element);
  return element;
}

window.SpecCompassDom.appendText = appendText;

function itemKey() {
  return itemCollectionKey();
}

function storageKey() {
  const path = reviewData?.artifact_path || reviewData?.batch_id || "draft";
  return `${STORAGE_PREFIX}${reviewData?.review_type || "unknown"}:${reviewDataIdentifier()}:${path}`;
}

function legacyStorageKey(data = reviewData) {
  const path = data?.artifact_path || data?.batch_id || "draft";
  return `${STORAGE_PREFIX}${data?.review_type || "unknown"}:${legacyReviewDataIdentifier(data)}:${path}`;
}

function loadState() {
  try {
    let storedState = localStorage.getItem(storageKey());
    if (storedState === null && reviewData?.schema_version === 1) {
      storedState = localStorage.getItem(legacyStorageKey());
    }
    state = JSON.parse(storedState || "{}");
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      state = {};
    }
  } catch {
    state = {};
  }
  if (!state.__meta || typeof state.__meta !== "object" || Array.isArray(state.__meta)) {
    state.__meta = {};
  }
  reviewMode = reviewData?.review_type === "outline" && state.__meta.review_mode === "adjust"
    ? "adjust"
    : "confirm";
}

function setReviewMode(nextMode) {
  if (reviewData?.review_type !== "outline") return;
  reviewMode = nextMode === "adjust" ? "adjust" : "confirm";
  if (reviewMode === "adjust" && !selectedNodeId) {
    selectedNodeId = currentItemNodes().find((node) => node.review_level === "must_confirm")?.id
      || currentItemNodes()[0]?.id
      || null;
  }
  const previousState = snapshotReviewState();
  state.__meta = { ...(state.__meta || {}), review_mode: reviewMode };
  if (!saveState()) restoreReviewState(previousState);
  render();
}

function saveState() {
  try {
    if (!localStorageAvailable()) {
      throw new Error("localStorage unavailable");
    }
    if (!state.__meta || typeof state.__meta !== "object" || Array.isArray(state.__meta)) {
      state.__meta = {};
    }
    localStorage.setItem(storageKey(), JSON.stringify(state));
    return true;
  } catch {
    setStatus("浏览器未能保存本地草稿；正式授权仍以确认文档为准。", true);
    return false;
  }
}

function snapshotReviewState() {
  return JSON.parse(JSON.stringify(state));
}

function restoreReviewState(snapshot) {
  state = snapshot;
}

function markSummaryDirty() {
  state.__meta = { ...(state.__meta || {}), copied_fingerprint: "" };
  if (typeof clearPackageDownloadLinks === "function") {
    clearPackageDownloadLinks();
  }
}

function localStorageAvailable() {
  try {
    const key = `${STORAGE_PREFIX}probe`;
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function storageStatusWarning() {
  return localStorageAvailable()
    ? ""
    : "浏览器未开放 localStorage，本地选择可能无法保存；正式授权仍以确认文档为准。";
}

function setStatus(message, isError = false) {
  $("live-status").textContent = message;
  $("live-status").classList.toggle("error", isError);
}

function currentModule() {
  return reviewData?.modules?.[selectedModuleIndex] || null;
}

function currentItems() {
  return currentModule()?.[itemKey()] || [];
}

function currentItem() {
  return currentItems()[selectedItemIndex] || null;
}

function currentItemNodes() {
  return currentItem()?.nodes || [];
}

function visibleNodes() {
  const priorityOrder = { critical: 0, important: 1, normal: 2 };
  const nodes = currentItemNodes()
    .filter((node) => selectedPriority === "all" || node.confirmation_priority === selectedPriority)
    .sort((left, right) => (priorityOrder[left.confirmation_priority] ?? 3) - (priorityOrder[right.confirmation_priority] ?? 3));
  return selectedNodeId ? nodes.filter((node) => node.id === selectedNodeId) : nodes;
}

function priorityCounts(nodes = currentItemNodes()) {
  return (nodes || []).reduce((counts, node) => {
    if (requiresNodeDecision(node) && Object.prototype.hasOwnProperty.call(counts, node.confirmation_priority)) {
      counts[node.confirmation_priority] += 1;
    }
    return counts;
  }, { critical: 0, important: 0, normal: 0 });
}

function priorityLabel(priority) {
  return {
    critical: "非常重要",
    important: "重要",
    normal: "普通"
  }[priority] || "未分级";
}

function currentModuleNodes() {
  return currentItems().flatMap((item) => item.nodes || []);
}

function allNodes() {
  const nodes = [];
  for (const module of reviewData?.modules || []) {
    for (const item of module[itemKey()] || []) {
      for (const node of item.nodes || []) {
        nodes.push({ module, item, node });
      }
    }
  }
  return nodes;
}

function nodeState(nodeId) {
  return state[nodeId] || { status: "MISSING" };
}

function isResolved(node) {
  const saved = nodeState(node.id);
  return saved.status === "SAVED_RECOMMENDED" || saved.status === "SAVED_SUBMITTED";
}

function recommendationNode(entry) {
  return entry?.node || entry;
}

function hasValidRecommendedOption(node) {
  return Boolean(
    node?.recommended_option &&
    (node.options || []).some((option) => option.id === node.recommended_option)
  );
}

function summarizeRecommendationCompletion(entries) {
  const summary = {
    unfinished: 0,
    canSaveRecommended: 0,
    drafts: 0,
    saved: 0,
    missingRecommendation: 0,
    criticalRequiresIndividual: 0,
    eligible: []
  };
  for (const entry of entries || []) {
    const node = recommendationNode(entry);
    if (!node || !requiresNodeDecision(node)) continue;
    const current = nodeState(node.id);
    const isCritical = node.confirmation_priority === "critical";
    if (isCritical && !isResolved(node)) {
      summary.criticalRequiresIndividual += 1;
    }
    if (current.status === "DRAFT") {
      summary.drafts += 1;
    } else if (isResolved(node)) {
      summary.saved += 1;
    } else if (current.status === "MISSING") {
      summary.unfinished += 1;
      if (isCritical) {
        continue;
      } else if (hasValidRecommendedOption(node)) {
        summary.canSaveRecommended += 1;
        summary.eligible.push(node);
      } else {
        summary.missingRecommendation += 1;
      }
    } else {
      summary.saved += 1;
    }
  }
  return summary;
}

function applyRecommendedToMissing(entries) {
  const summary = summarizeRecommendationCompletion(entries);
  const previousState = snapshotReviewState();
  for (const node of summary.eligible) {
    state[node.id] = { status: "SAVED_RECOMMENDED", option: node.recommended_option };
  }
  if (summary.eligible.length) markSummaryDirty();
  return { ...summary, savedRecommended: summary.eligible.length, previousState };
}

function isMust(node) {
  return node.review_level === "must_confirm";
}

function countModuleMust(module) {
  const items = module?.[itemKey()] || [];
  let total = 0;
  let pending = 0;
  for (const item of items) {
    for (const node of item.nodes || []) {
      if (!isMust(node)) continue;
      total += 1;
      if (!isResolved(node)) pending += 1;
    }
  }
  return { pending, total };
}

function countModuleRecommended(module) {
  const items = module?.[itemKey()] || [];
  let total = 0;
  let pendingRecommended = 0;
  for (const item of items) {
    for (const node of item.nodes || []) {
      if (node.review_level !== "recommended") continue;
      total += 1;
      if (!isResolved(node)) pendingRecommended += 1;
    }
  }
  return { pendingRecommended, total };
}

function levelLabel(level) {
  return {
    must_confirm: "必须确认",
    recommended: "建议确认",
    uncertain: "存疑",
    key_step: "关键环节",
    verified: "已验证",
    system_arch: "系统/架构确认"
  }[level] || level || "未分级";
}

function writebackTarget() {
  try {
    if (window.SpecCompassConfirmationPackage?.safeWritebackTarget && reviewData) {
      return window.SpecCompassConfirmationPackage.safeWritebackTarget(reviewData);
    }
  } catch {
    // Fallback below keeps the page usable; package download performs strict validation.
  }
  if (reviewData?.review_type === "outline") return "outline-confirmation.md";
  return reviewData?.review_type === "ui" ? "ui-confirmation.md" : "flow-confirmation.md";
}
