/* Fixed SpecCompass review renderer infrastructure. Feature nav is demand-level navigation, not business-module navigation. */
(function initFeatureNav() {
  const REVIEW_INDEX_PATH = "../../../specs/review-index.json";

  function navElement(id) {
    return document.getElementById(id);
  }

  function containsPathSeparator(value) {
    for (const char of String(value || "")) {
      if (char === "/" || char.charCodeAt(0) === 92) return true;
    }
    return false;
  }

  function isValidFeatureId(feature) {
    return (
      typeof feature === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(feature) &&
      !feature.includes("..") &&
      !containsPathSeparator(feature)
    );
  }

  function urlConfig() {
    const params = new URLSearchParams(window.location.search);
    const flow = params.get("flow");
    const ui = params.get("ui");
    if (flow && ui) return null;
    const mode = flow ? "flow" : ui ? "ui" : "";
    const feature = flow || ui || "";
    if (!mode || !isValidFeatureId(feature)) return null;
    return { mode, feature };
  }

  function setDisabled(button, disabled, title) {
    if (!button) return;
    button.disabled = Boolean(disabled);
    if (title) button.title = title;
    else button.removeAttribute("title");
  }

  function setNote(text) {
    const note = navElement("feature-nav-note");
    if (note) note.textContent = text;
  }

  function normalizedFeatures(indexData) {
    return (Array.isArray(indexData?.features) ? indexData.features : [])
      .filter((entry) => isValidFeatureId(entry?.feature))
      .map((entry, fallbackIndex) => ({
        order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : fallbackIndex + 1,
        feature: entry.feature,
        title: entry.title || entry.feature,
        has_flow_review: entry.has_flow_review === true,
        has_ui_review: entry.has_ui_review === true
      }))
      .sort((left, right) => left.order - right.order || left.feature.localeCompare(right.feature));
  }

  function hasModeReview(entry, mode) {
    return mode === "flow" ? entry.has_flow_review : entry.has_ui_review;
  }

  function hasUnsavedReviewWork() {
    try {
      const draftResult = typeof hasDrafts === "function" ? hasDrafts() : false;
      const unexportedResult = typeof hasUnexportedSavedChoices === "function" ? hasUnexportedSavedChoices() : false;
      return Boolean(draftResult || unexportedResult);
    } catch (_error) {
      return false;
    }
  }

  function navigateToFeature(mode, feature) {
    if (hasUnsavedReviewWork()) {
      const confirmed = window.confirm(
        "当前页面有本地选择或尚未导出的确认结果。离开前请先下载确认包；仍要切换到其他需求吗？"
      );
      if (!confirmed) return;
    }
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set(mode, feature);
    window.location.href = url.toString();
  }

  function renderFeatureNav(indexData, config) {
    const previous = navElement("prev-feature");
    const next = navElement("next-feature");
    const position = navElement("feature-position");
    const features = normalizedFeatures(indexData);
    const currentIndex = features.findIndex((entry) => entry.feature === config.feature);

    if (!features.length || currentIndex < 0) {
      if (position) position.textContent = "需求 0/0";
      setDisabled(previous, true, "当前需求不在 specs/review-index.json 中。");
      setDisabled(next, true, "当前需求不在 specs/review-index.json 中。");
      setNote("当前需求未登记到 specs/review-index.json；请先补充需求索引。");
      return;
    }

    if (position) position.textContent = `需求 ${currentIndex + 1}/${features.length}`;
    const current = features[currentIndex];
    const currentStatus = hasModeReview(current, config.mode)
      ? `当前需求：${current.title}`
      : `当前需求：${current.title}，${config.mode === "flow" ? "flow" : "UI"} 复核数据待生成`;
    setNote(currentStatus);

    const previousFeature = features[currentIndex - 1];
    const nextFeature = features[currentIndex + 1];

    if (!previousFeature) {
      setDisabled(previous, true, "已经是第一个需求。");
    } else if (!hasModeReview(previousFeature, config.mode)) {
      setDisabled(previous, true, `上一需求 ${previousFeature.title} 的复核数据待生成。`);
      previous.dataset.targetFeature = previousFeature.feature;
      previous.dataset.unavailable = "true";
      previous.textContent = "上一需求（待生成）";
    } else {
      setDisabled(previous, false);
      previous.dataset.targetFeature = previousFeature.feature;
      previous.dataset.unavailable = "false";
      previous.textContent = "上一需求";
    }

    if (!nextFeature) {
      setDisabled(next, true, "已经是最后一个需求。");
    } else if (!hasModeReview(nextFeature, config.mode)) {
      setDisabled(next, true, `下一需求 ${nextFeature.title} 的复核数据待生成。`);
      next.dataset.targetFeature = nextFeature.feature;
      next.dataset.unavailable = "true";
      next.textContent = "下一需求（待生成）";
    } else {
      setDisabled(next, false);
      next.dataset.targetFeature = nextFeature.feature;
      next.dataset.unavailable = "false";
      next.textContent = "下一需求";
    }
  }

  function bindFeatureButton(button, config) {
    if (!button) return;
    button.addEventListener("click", () => {
      const target = button.dataset.targetFeature;
      if (button.disabled || !target || button.dataset.unavailable === "true") return;
      navigateToFeature(config.mode, target);
    });
  }

  async function loadFeatureIndex(config) {
    const previous = navElement("prev-feature");
    const next = navElement("next-feature");
    bindFeatureButton(previous, config);
    bindFeatureButton(next, config);
    try {
      const response = await fetch(new URL(REVIEW_INDEX_PATH, window.location.href), { cache: "no-store" });
      if (!response.ok) throw new Error(response.statusText || String(response.status));
      renderFeatureNav(await response.json(), config);
    } catch (error) {
      const position = navElement("feature-position");
      if (position) position.textContent = "需求 0/0";
      setDisabled(previous, true, "未读取到 specs/review-index.json。");
      setDisabled(next, true, "未读取到 specs/review-index.json。");
      setNote(`未能加载 specs/review-index.json：${error.message}。不影响当前复核页查看。`);
    }
  }

  const config = urlConfig();
  if (!config) {
    setDisabled(navElement("prev-feature"), true, "未使用 ?flow=<feature> 或 ?ui=<feature> 打开。");
    setDisabled(navElement("next-feature"), true, "未使用 ?flow=<feature> 或 ?ui=<feature> 打开。");
    setNote("未识别当前需求；使用 ?flow=<feature> 或 ?ui=<feature> 后可显示需求级导航。");
    return;
  }

  loadFeatureIndex(config);
})();
