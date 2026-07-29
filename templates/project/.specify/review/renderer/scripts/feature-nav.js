/* Fixed SpecCompass review renderer infrastructure. Feature nav is demand-level navigation, not business-module navigation. */
(function initFeatureNav() {
  const REVIEW_INDEX_PATH = "../../../specs/review-index.json";
  const REVIEW_FLAGS = ["has_flow_review", "has_ui_review", "has_outline_review", "has_outline_discovery"];
  const V2_ROOT_KEYS = new Set(["schema_version", "project", "updated_at", "hierarchy", "features"]);
  const V1_ROOT_KEYS = new Set(["schema_version", "project", "updated_at", "features"]);
  const HIERARCHY_KEYS = new Set(["mode", "root_feature"]);
  const V2_FEATURE_KEYS = new Set([
    "order", "feature_code", "feature", "title", "parent_feature", "sibling_order",
    "boundary_source", "outline_alignment", ...REVIEW_FLAGS
  ]);
  const V1_FEATURE_KEYS = new Set(["order", "feature", "title", ...REVIEW_FLAGS]);
  const BOUNDARY_KEYS = new Set(["kind", "handoff_ref", "rationale"]);
  const ALIGNMENT_KEYS = new Set(["status", "outline_node_refs", "rationale"]);
  const BOUNDARY_KINDS = new Set(["root", "standalone", "subproject_handoff"]);
  const ALIGNMENT_STATUSES = new Set(["not_mapped", "one_to_one", "merged", "split", "diverged"]);

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

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function assertExactKeys(value, allowed, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 必须是对象。`);
    const unknown = Object.keys(value).filter((key) => !allowed.has(key));
    if (unknown.length) throw new Error(`${label} 包含不支持字段：${unknown.join(", ")}。`);
  }

  function urlConfig() {
    const params = new URLSearchParams(window.location.search);
    const flow = params.get("flow");
    const ui = params.get("ui");
    const outline = params.get("outline");
    const outlineDiscovery = params.get("outline-discovery");
    if ([flow, ui, outline, outlineDiscovery].filter(Boolean).length > 1) return null;
    const mode = flow ? "flow" : ui ? "ui" : outline ? "outline" : outlineDiscovery ? "outline-discovery" : "";
    const feature = flow || ui || outline || outlineDiscovery || "";
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

  function featureSort(left, right) {
    return left.sibling_order - right.sibling_order || left.order - right.order || left.feature.localeCompare(right.feature);
  }

  function normalizeFeatureIndex(indexData) {
    const rawFeatures = Array.isArray(indexData?.features) ? indexData.features : [];
    const isLegacy = indexData?.schema_version === 1;
    if (!isLegacy && indexData?.schema_version !== 2) throw new Error("review-index schema_version 必须是 1 或 2。");
    assertExactKeys(indexData, isLegacy ? V1_ROOT_KEYS : V2_ROOT_KEYS, "review-index");
    if (typeof indexData.project !== "string" || (rawFeatures.length && !isNonEmptyString(indexData.project))) {
      throw new Error("review-index project 在包含需求时必须是非空字符串。");
    }
    if (typeof indexData.updated_at !== "string" || (rawFeatures.length && !/^\d{4}-\d{2}-\d{2}$/.test(indexData.updated_at))) {
      throw new Error("review-index updated_at 在包含需求时必须使用 YYYY-MM-DD。");
    }
    if (!Array.isArray(indexData.features)) throw new Error("review-index features 必须是数组。");
    if (!isLegacy) assertExactKeys(indexData.hierarchy, HIERARCHY_KEYS, "review-index hierarchy");
    const alignmentOwners = new Map();
    const features = rawFeatures.map((entry, fallbackIndex) => {
      assertExactKeys(entry, isLegacy ? V1_FEATURE_KEYS : V2_FEATURE_KEYS, `review-index features[${fallbackIndex}]`);
      if (!isValidFeatureId(entry?.feature)) throw new Error(`review-index 包含无效 feature：${entry?.feature || "<empty>"}。`);
      const order = Number(entry.order);
      if (!Number.isInteger(order) || order < 1) throw new Error(`${entry.feature} 的 order 必须是正整数。`);
      const legacyCode = entry.feature.match(/^(\d{8}-\d{6}|\d{3,})-/)?.[1] || entry.feature.split("-")[0];
      const featureCode = isLegacy ? legacyCode : entry.feature_code;
      if (!featureCode || !entry.feature.startsWith(`${featureCode}-`)) throw new Error(`${entry.feature} 与 feature_code 不一致。`);
      const parentFeature = isLegacy ? null : entry.parent_feature;
      const siblingOrder = isLegacy ? 0 : Number(entry.sibling_order);
      if (!(parentFeature === null || isValidFeatureId(parentFeature))) throw new Error(`${entry.feature} 的 parent_feature 无效。`);
      if (!Number.isInteger(siblingOrder) || siblingOrder < 0) throw new Error(`${entry.feature} 的 sibling_order 无效。`);
      if (!isNonEmptyString(entry.title)) throw new Error(`${entry.feature} 的 title 必须是非空字符串。`);
      for (const flag of REVIEW_FLAGS) {
        if (typeof entry[flag] !== "boolean") throw new Error(`${entry.feature} 的 ${flag} 必须是布尔值。`);
      }
      if (!isLegacy) {
        const boundary = entry.boundary_source;
        assertExactKeys(boundary, BOUNDARY_KEYS, `${entry.feature} 的 boundary_source`);
        if (!BOUNDARY_KINDS.has(boundary.kind) || !isNonEmptyString(boundary.rationale)) {
          throw new Error(`${entry.feature} 的 boundary_source 无效。`);
        }
        if (!(boundary.handoff_ref === null || isNonEmptyString(boundary.handoff_ref))) {
          throw new Error(`${entry.feature} 的 boundary_source.handoff_ref 无效。`);
        }
        if (boundary.kind === "subproject_handoff") {
          if (parentFeature === null || !isNonEmptyString(boundary.handoff_ref)) throw new Error(`${entry.feature} 缺少已确认 Subproject Handoff。`);
        } else if (boundary.handoff_ref !== null) throw new Error(`${entry.feature} 只有 subproject_handoff 可以携带 handoff_ref。`);
        if (["root", "standalone"].includes(boundary.kind) && parentFeature !== null) throw new Error(`${entry.feature} 的 boundary_source 与 parent_feature 冲突。`);

        const alignment = entry.outline_alignment;
        assertExactKeys(alignment, ALIGNMENT_KEYS, `${entry.feature} 的 outline_alignment`);
        if (!ALIGNMENT_STATUSES.has(alignment.status) || !isNonEmptyString(alignment.rationale)) {
          throw new Error(`${entry.feature} 的 outline_alignment 无效。`);
        }
        const refs = alignment.outline_node_refs;
        if (!Array.isArray(refs) || refs.some((ref) => !isNonEmptyString(ref)) || new Set(refs).size !== refs.length) {
          throw new Error(`${entry.feature} 的 outline_node_refs 必须是唯一非空引用。`);
        }
        if (alignment.status === "not_mapped" && refs.length !== 0) throw new Error(`${entry.feature} 的 not_mapped 不能携带 Outline 引用。`);
        if (["one_to_one", "split"].includes(alignment.status) && refs.length !== 1) throw new Error(`${entry.feature} 的 ${alignment.status} 必须包含一个 Outline 引用。`);
        if (alignment.status === "merged" && refs.length < 2) throw new Error(`${entry.feature} 的 merged 必须包含至少两个 Outline 引用。`);
        if (alignment.status === "diverged" && refs.length < 1) throw new Error(`${entry.feature} 的 diverged 必须包含 Outline 引用。`);
        for (const ref of refs) {
          const owners = alignmentOwners.get(ref) || [];
          owners.push({ feature: entry.feature, status: alignment.status });
          alignmentOwners.set(ref, owners);
        }
      }
      return {
        order,
        feature_code: featureCode,
        sibling_order: siblingOrder,
        parent_feature: parentFeature,
        feature: entry.feature,
        title: entry.title,
        boundary_source: isLegacy ? null : entry.boundary_source,
        outline_alignment: isLegacy ? null : entry.outline_alignment,
        has_flow_review: entry.has_flow_review === true,
        has_ui_review: entry.has_ui_review === true,
        has_outline_review: entry.has_outline_review === true,
        has_outline_discovery: entry.has_outline_discovery === true
      };
    });
    const byFeature = new Map();
    const orders = new Set();
    const codes = new Set();
    const siblingSlots = new Set();
    for (const entry of features) {
      if (byFeature.has(entry.feature)) throw new Error(`review-index 重复 feature：${entry.feature}。`);
      if (orders.has(entry.order)) throw new Error(`review-index 重复 order：${entry.order}。`);
      if (codes.has(entry.feature_code)) throw new Error(`review-index 重复 feature_code：${entry.feature_code}。`);
      byFeature.set(entry.feature, entry);
      orders.add(entry.order);
      codes.add(entry.feature_code);
    }
    if (isLegacy) {
      features.sort((left, right) => left.order - right.order || left.feature.localeCompare(right.feature));
      return { features, byFeature, isLegacy };
    }

    for (const [ref, owners] of alignmentOwners) {
      const oneToOne = owners.filter((owner) => owner.status === "one_to_one");
      if (oneToOne.length > 1 || (oneToOne.length === 1 && owners.length > 1)) throw new Error(`Outline 引用 ${ref} 不能同时是一对一和多项目映射。`);
      if (owners.filter((owner) => owner.status === "split").length === 1) throw new Error(`Outline 引用 ${ref} 标记为 split，但只映射一个项目。`);
    }

    const mode = indexData?.hierarchy?.mode;
    const rootFeature = indexData?.hierarchy?.root_feature;
    if (!["flat", "explicit"].includes(mode)) throw new Error("review-index hierarchy.mode 必须是 flat 或 explicit。");
    for (const entry of features) {
      if (entry.parent_feature === null) {
        if (entry.sibling_order !== 0) throw new Error(`${entry.feature} 是根项，sibling_order 必须为 0。`);
      } else {
        if (!byFeature.has(entry.parent_feature)) throw new Error(`${entry.feature} 引用了不存在的父需求 ${entry.parent_feature}。`);
        if (entry.sibling_order < 1) throw new Error(`${entry.feature} 是子需求，sibling_order 必须从 1 开始。`);
        const slot = `${entry.parent_feature}:${entry.sibling_order}`;
        if (siblingSlots.has(slot)) throw new Error(`${entry.parent_feature} 下重复 sibling_order ${entry.sibling_order}。`);
        siblingSlots.add(slot);
      }
      const visited = new Set([entry.feature]);
      let cursor = entry;
      while (cursor.parent_feature !== null) {
        cursor = byFeature.get(cursor.parent_feature);
        if (!cursor) break;
        if (visited.has(cursor.feature)) throw new Error(`需求继承关系包含循环：${cursor.feature}。`);
        visited.add(cursor.feature);
      }
    }
    if (mode === "flat") {
      if (rootFeature !== null || features.some((entry) => entry.parent_feature !== null)) {
        throw new Error("flat review-index 不能包含 root_feature 或父子关系。");
      }
      features.sort((left, right) => left.order - right.order || left.feature.localeCompare(right.feature));
      return { features, byFeature, isLegacy: false };
    }
    if (!isValidFeatureId(rootFeature) || !byFeature.has(rootFeature)) throw new Error("explicit review-index 缺少有效 root_feature。");
    const root = byFeature.get(rootFeature);
    if (root.parent_feature !== null || root.boundary_source?.kind !== "root" || root.sibling_order !== 0) {
      throw new Error("root_feature 必须使用 root boundary、空 parent_feature 和 sibling_order 0。");
    }
    if (codes.has("000") && root.feature_code !== "000") throw new Error("存在 000 时，它必须是 explicit review-index 的根需求。");
    for (const entry of features) {
      if (entry.feature === rootFeature) continue;
      if (entry.parent_feature === null || entry.boundary_source?.kind !== "subproject_handoff") {
        throw new Error(`${entry.feature} 必须通过已确认 Subproject Handoff 继承根需求。`);
      }
      let cursor = entry;
      const visited = new Set();
      while (cursor && !visited.has(cursor.feature) && cursor.feature !== rootFeature) {
        visited.add(cursor.feature);
        cursor = byFeature.get(cursor.parent_feature);
      }
      if (!cursor || cursor.feature !== rootFeature) throw new Error(`${entry.feature} 没有继承到根需求 ${rootFeature}。`);
    }
    const childrenByParent = new Map();
    for (const entry of features) {
      if (entry.parent_feature === null) continue;
      const children = childrenByParent.get(entry.parent_feature) || [];
      children.push(entry);
      childrenByParent.set(entry.parent_feature, children);
    }
    for (const children of childrenByParent.values()) children.sort(featureSort);
    const ordered = [];
    const visit = (entry) => {
      ordered.push(entry);
      for (const child of childrenByParent.get(entry.feature) || []) visit(child);
    };
    visit(root);
    return { features: ordered, byFeature, isLegacy: false };
  }

  function featurePath(entry, byFeature) {
    const codes = [];
    const visited = new Set();
    let cursor = entry;
    while (cursor && !visited.has(cursor.feature)) {
      visited.add(cursor.feature);
      codes.unshift(cursor.feature_code);
      cursor = cursor.parent_feature ? byFeature.get(cursor.parent_feature) : null;
    }
    return codes.join(" › ");
  }

  function hasModeReview(entry, mode) {
    if (mode === "flow") return entry.has_flow_review;
    if (mode === "ui") return entry.has_ui_review;
    if (mode === "outline-discovery") return entry.has_outline_discovery;
    return entry.has_outline_review;
  }

  function hasUnsavedReviewWork() {
    try {
      const draftResult = typeof hasDrafts === "function" ? hasDrafts() : false;
      const unexportedResult = typeof hasUnexportedSavedChoices === "function" ? hasUnexportedSavedChoices() : false;
      const discoveryResult = typeof hasUnexportedOutlineDiscoveryWork === "function"
        ? hasUnexportedOutlineDiscoveryWork()
        : false;
      return Boolean(draftResult || unexportedResult || discoveryResult);
    } catch (_error) {
      return false;
    }
  }

  function navigateToFeature(mode, feature) {
    if (hasUnsavedReviewWork()) {
      const isDiscovery = mode === "outline-discovery";
      const confirmed = window.confirm(
        isDiscovery
          ? "当前页面有尚未写入项目的 Outline 探索响应。离开前请先写入项目；仍要切换到其他需求吗？"
          : "当前页面有本地选择或尚未写回的确认结果。离开前请先写入项目；仍要切换到其他需求吗？"
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
    const normalized = normalizeFeatureIndex(indexData);
    const { features, byFeature } = normalized;
    const currentIndex = features.findIndex((entry) => entry.feature === config.feature);

    if (!features.length || currentIndex < 0) {
      if (position) position.textContent = "需求 0/0";
      setDisabled(previous, true, "当前需求不在 specs/review-index.json 中。");
      setDisabled(next, true, "当前需求不在 specs/review-index.json 中。");
      setNote("当前需求未登记到 specs/review-index.json；请先补充需求索引。");
      return;
    }

    const current = features[currentIndex];
    const currentPath = featurePath(current, byFeature);
    if (position) position.textContent = `${currentPath} · 需求 ${currentIndex + 1}/${features.length}`;
    const currentStatus = hasModeReview(current, config.mode)
      ? `当前需求：${currentPath} ${current.title}`
      : `当前需求：${currentPath} ${current.title}，${config.mode === "flow" ? "flow" : config.mode === "ui" ? "UI" : config.mode === "outline-discovery" ? "Outline 探索" : "Outline"}数据待生成`;
    const legacyNote = normalized.isLegacy ? "；索引仍是 v1 平铺格式，不能表达需求继承，请在下一次命令运行时迁移" : "";
    setNote(`${currentStatus}${legacyNote}`);

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

  window.SpecCompassFeatureNav = Object.freeze({ normalizeFeatureIndex, featurePath });

  const config = urlConfig();
  if (!config) {
    setDisabled(navElement("prev-feature"), true, "未使用受支持的需求复核参数打开。");
    setDisabled(navElement("next-feature"), true, "未使用受支持的需求复核参数打开。");
    setNote("未识别当前需求；使用 ?flow=<feature>、?ui=<feature>、?outline=<feature> 或 ?outline-discovery=<feature> 后可显示需求级导航。");
    return;
  }

  loadFeatureIndex(config);
})();
