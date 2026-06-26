/* Fixed SpecCompass review renderer infrastructure. Normal /sp.flow and /sp.ui only fill JSON review data. */
const SUPPORTED_SCHEMA_VERSION = 1;
const STORAGE_PREFIX = "speccompass-review:";
const DEFAULT_DATA_FILES = {
  flow: "flow-review-data.json",
  ui: "ui-review-data.json"
};
let reviewData = window.SPECCOMPASS_REVIEW_DATA || null;
let selectedModuleIndex = 0;
let selectedItemIndex = 0;
let selectedNodeId = null;
let state = {};
let pendingFocusNodeId = null;
let copyDraftWarningArmed = false;
let runtimeWarnings = [];
let runtimeErrors = [];

const $ = (id) => document.getElementById(id);

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
