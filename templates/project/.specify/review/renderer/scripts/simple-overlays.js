/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. */
const SUPPORTED_SCHEMA_VERSION = 3;
const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2, 3]);
const STORAGE_PREFIX = "speccompass-review:";
const DEFAULT_DATA_FILES = {
  flow: "flow-review-data.json",
  ui: "ui-review-data.json",
  outline: "outline-review-data.json",
  "outline-discovery": "outline-discovery-data.json"
};
let reviewData = window.SPECCOMPASS_REVIEW_DATA || null;
let selectedModuleIndex = 0;
let selectedItemIndex = 0;
let selectedNodeId = null;
let selectedPriority = "all";
let reviewMode = "confirm";
let state = {};
let pendingFocusNodeId = null;
let copyDraftWarningArmed = false;
let downloadDraftWarningArmed = false;
let packageDownloadUrls = [];
let writebackFallback = null;
let writebackInProgress = false;
let writebackDisabledControls = [];
let runtimeWarnings = [];
let runtimeErrors = [];

const $ = (id) => document.getElementById(id);

function defaultWritebackButtonLabel() {
  return reviewData?.review_type === "outline_discovery" ? "写入项目并继续" : "写入项目";
}

function beginWriteback() {
  if (writebackInProgress) {
    setStatus("项目写入正在进行，请等待当前请求完成。", true);
    return false;
  }
  writebackInProgress = true;
  writebackDisabledControls = Array.from(document.querySelectorAll("input, textarea, select, button"), (element) => ({
    element,
    wasDisabled: element.disabled
  }));
  for (const { element } of writebackDisabledControls) element.disabled = true;
  const button = $("download-package");
  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "正在写入...";
  }
  setStatus("正在将审核结果写入项目...");
  return true;
}

function finishWriteback() {
  writebackInProgress = false;
  for (const { element, wasDisabled } of writebackDisabledControls) {
    if (element.isConnected) element.disabled = wasDisabled;
  }
  writebackDisabledControls = [];
  const button = $("download-package");
  if (!button) return;
  button.disabled = false;
  button.removeAttribute("aria-busy");
  button.textContent = writebackFallback ? "重试写入" : defaultWritebackButtonLabel();
}

function writebackRecoveryGuidance(error) {
  if (error?.recoveryAction === "reload_review") return "请刷新页面后重新审核并写入。";
  if (error?.recoveryAction === "free_space_or_download") return "请释放磁盘空间或检查目录权限后重试。";
  if (error?.recoveryAction === "download_fallback") return "请求内容过大，无法直接写入。";
  if (error?.recoveryAction === "fix_and_retry") return "请检查审核数据后重试。";
  return "请检查本地审核服务后重试。";
}

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = text;
  return element;
}

function safeClassToken(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

window.SpecCompassDom = {
  $,
  create,
  safeClassToken
};

let activeInfoDialog = null;
let returnFocusTo = null;

function closeInfoDialog() {
  if (!activeInfoDialog) return;
  activeInfoDialog.close();
}

function showInfoDialog(options = {}) {
  const titleText = typeof options === "string" ? options : options.title;
  const bodyText = typeof options === "string" ? "" : options.body;
  const trigger = typeof options === "object" ? options.trigger : null;
  if (activeInfoDialog) {
    activeInfoDialog.close();
  }

  returnFocusTo = trigger instanceof HTMLElement ? trigger : document.activeElement;

  const dialog = document.createElement("dialog");
  dialog.className = "speccompass-dialog";
  dialog.setAttribute("aria-labelledby", "speccompass-dialog-title");
  dialog.setAttribute("aria-describedby", "speccompass-dialog-body");

  const content = create("div", "speccompass-dialog-content");
  const header = create("div", "speccompass-dialog-header");
  const kicker = create("span", "speccompass-dialog-kicker", "SpecCompass 说明");
  const title = create("h2", "speccompass-dialog-title", titleText || "说明");
  title.id = "speccompass-dialog-title";
  header.appendChild(kicker);
  header.appendChild(title);
  content.appendChild(header);

  const body = create("p", "speccompass-dialog-body");
  body.id = "speccompass-dialog-body";
  body.textContent = bodyText || "此弹窗只用于说明和预览；不处理推荐项、非推荐项、审核意见、授权确认、复制摘要或全局通知。";
  content.appendChild(body);

  const actions = create("div", "speccompass-dialog-actions");
  const closeButton = create("button", "speccompass-dialog-close primary", "关闭");
  closeButton.type = "button";
  closeButton.addEventListener("click", () => dialog.close());
  actions.appendChild(closeButton);
  content.appendChild(actions);

  dialog.appendChild(content);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    const focusTarget = returnFocusTo;
    activeInfoDialog = null;
    returnFocusTo = null;
    dialog.remove();
    if (focusTarget instanceof HTMLElement && document.contains(focusTarget)) {
      focusTarget.focus();
    }
  });

  document.body.appendChild(dialog);
  activeInfoDialog = dialog;
  dialog.showModal();
  closeButton.focus();
}

window.SpecCompassOverlay = {
  note(message) {
    setStatus(String(message || ""));
  },
  showInfoDialog,
  closeInfoDialog
};
