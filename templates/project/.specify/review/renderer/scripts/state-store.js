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
  return data?.review_type === "ui" ? "screens" : "diagrams";
}

function reviewIdentityPayload(data = reviewData) {
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
  return hashText(JSON.stringify(reviewIdentityPayload(data)));
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

function loadState() {
  try {
    state = JSON.parse(localStorage.getItem(storageKey()) || "{}");
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      state = {};
    }
  } catch {
    state = {};
  }
  if (!state.__meta || typeof state.__meta !== "object" || Array.isArray(state.__meta)) {
    state.__meta = {};
  }
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
  } catch {
    setStatus("浏览器未能保存本地草稿；正式授权仍以确认文档为准。", true);
  }
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

function visibleNodes() {
  const nodes = currentItem()?.nodes || [];
  return selectedNodeId ? nodes.filter((node) => node.id === selectedNodeId) : nodes;
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
  return reviewData?.review_type === "ui" ? "ui-confirmation.md" : "flow-confirmation.md";
}
