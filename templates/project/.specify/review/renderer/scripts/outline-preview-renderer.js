/* Fixed Outline review visualization. It shows product intent and readiness, never downstream solution design. */
const outlineViewLabels = {
  intent_map: "意图地图",
  scope_slice: "范围与首切片",
  readiness_authority: "就绪度与来源权威"
};

function renderOutlinePreview(view) {
  const wrap = create("section", `outline-preview outline-${safeClassToken(view?.view_type)}`);
  const adjustment = outlineAdjustmentPresentation(view);
  if (adjustment.active) {
    wrap.classList.add("outline-adjustment-active");
    wrap.dataset.adjustmentTarget = adjustment.target?.id || "";
    const banner = create("div", "outline-adjustment-banner");
    appendText(banner, "span", "调整模式", "outline-view-label");
    appendText(banner, "strong", adjustment.target?.label || "当前调整目标");
    appendText(banner, "p", adjustment.target?.confirmation_priority === "critical"
      ? "该节点影响巨大，必须由 Owner 明确确认；其他结构保持原有三列与连线布局。"
      : "已标记建议调整的直接影响区域；未受影响内容保持原位。");
    wrap.appendChild(banner);
  }
  const heading = create("div", "outline-preview-heading");
  appendText(heading, "span", outlineViewLabels[view?.view_type] || "Outline 视图", "outline-view-label");
  appendText(heading, "strong", view?.title || "未命名 Outline 视图");
  appendText(heading, "p", view?.summary || "未提供视图说明。");
  wrap.appendChild(heading);

  if (view?.view_type === "intent_map") {
    wrap.appendChild(renderOutlineIntentMap(view));
  } else if (view?.view_type === "scope_slice") {
    wrap.appendChild(renderOutlineScopeSlice(view));
  } else if (view?.view_type === "readiness_authority") {
    wrap.appendChild(renderOutlineReadiness(view));
  } else {
    appendText(wrap, "p", `不支持的 Outline view_type：${view?.view_type || "未提供"}`, "error");
  }

  wrap.appendChild(renderOutlineDecisionPoints(view?.nodes || []));
  return wrap;
}

function renderOutlineIntentMap(view) {
  const map = create("div", "outline-intent-map");
  map.appendChild(outlineMapColumn("产品意图", [view.intent], "intent"));
  map.appendChild(outlineMapArrow());
  map.appendChild(outlineMapColumn("用户 / 角色", view.users || [], "users"));
  map.appendChild(outlineMapArrow());
  map.appendChild(outlineMapColumn("问题切片", view.problem_slices || [], "problems"));
  map.appendChild(outlineMapArrow());
  map.appendChild(outlineMapColumn("能力边界", view.capability_slices || [], "capabilities"));
  return map;
}

function outlineMapColumn(title, values, kind) {
  const column = create("section", `outline-map-column outline-map-${kind}`);
  applyOutlineAdjustmentState(column, kind);
  appendText(column, "h4", title);
  const list = create("ul", "outline-value-list");
  const entries = (values || []).filter((value) => String(value || "").trim());
  for (const value of entries) appendText(list, "li", value);
  if (!entries.length) appendText(list, "li", "未提供");
  column.appendChild(list);
  return column;
}

function outlineMapArrow() {
  const arrow = create("span", "outline-map-arrow", "→");
  applyOutlineAdjustmentState(arrow, "connector");
  arrow.setAttribute("aria-hidden", "true");
  return arrow;
}

function renderOutlineScopeSlice(view) {
  const content = create("div", "outline-scope-layout");
  content.appendChild(outlineListPanel("本期范围", view.in_scope || [], "in-scope"));
  content.appendChild(outlineListPanel("明确非目标", view.non_goals || [], "non-goals"));

  const coverage = create("section", "outline-coverage");
  applyOutlineAdjustmentState(coverage, "coverage");
  appendText(coverage, "h4", "场景与验收种子覆盖");
  for (const entry of view.scenario_coverage || []) {
    const row = create("article", "outline-coverage-row");
    appendText(row, "strong", entry.scenario || "未命名场景");
    const seeds = create("ul", "outline-value-list");
    for (const seed of entry.acceptance_seeds || []) appendText(seeds, "li", seed);
    row.appendChild(seeds);
    coverage.appendChild(row);
  }
  content.appendChild(coverage);

  const firstSlice = create("section", "outline-first-slice");
  applyOutlineAdjustmentState(firstSlice, "first-slice");
  appendText(firstSlice, "span", "推荐", "outline-view-label");
  appendText(firstSlice, "h4", "首个交付切片");
  appendText(firstSlice, "p", view.recommended_first_slice || "未提供推荐首切片。");
  content.appendChild(firstSlice);
  return content;
}

function outlineListPanel(title, values, kind) {
  const panel = create("section", `outline-list-panel outline-${kind}`);
  applyOutlineAdjustmentState(panel, kind);
  appendText(panel, "h4", title);
  const list = create("ul", "outline-value-list");
  const entries = (values || []).filter((value) => String(value || "").trim());
  for (const value of entries) appendText(list, "li", value);
  if (!entries.length) appendText(list, "li", "无");
  panel.appendChild(list);
  return panel;
}

function renderOutlineReadiness(view) {
  const content = create("div", "outline-readiness-layout");
  const authorities = create("section", "outline-authorities");
  applyOutlineAdjustmentState(authorities, "authority");
  appendText(authorities, "h4", "来源权威");
  for (const source of view.source_authorities || []) {
    const row = create("article", "outline-authority-row");
    const top = create("div", "outline-authority-heading");
    appendText(top, "strong", source.id || source.path || "未命名来源");
    appendText(top, "span", source.status || "unknown", `outline-status outline-status-${safeClassToken(source.status)}`);
    row.appendChild(top);
    appendText(row, "p", source.scope || "未提供权威范围。");
    appendText(row, "code", source.path || "未提供路径");
    authorities.appendChild(row);
  }
  content.appendChild(authorities);

  const signals = create("div", "outline-readiness-signals");
  applyOutlineAdjustmentState(signals, "readiness");
  signals.appendChild(outlineListPanel("风险", view.risks || [], "risks"));
  signals.appendChild(outlineListPanel("开放项", view.open_items || [], "open-items"));
  signals.appendChild(outlineListPanel("阻断项", view.blockers || [], "blockers"));
  content.appendChild(signals);

  const route = create("section", "outline-next-route");
  applyOutlineAdjustmentState(route, "route");
  appendText(route, "span", "确认完成后的工作路由", "outline-view-label");
  appendText(route, "strong", view.next_route || "未提供 next route");
  content.appendChild(route);
  return content;
}

function outlineAdjustmentPresentation(view) {
  if (reviewData?.review_type !== "outline" || reviewMode !== "adjust") {
    return { active: false, target: null, affected: [], stable: [] };
  }
  const target = outlineAdjustmentTarget?.() || (view?.nodes || [])[0] || null;
  if (!target) return { active: true, target: null, affected: [], stable: [] };
  const impact = outlineAdjustmentImpact?.(target) || { affected: [], stable: [] };
  return { active: true, target, ...impact };
}

function outlineAdjustmentTargetKey(target) {
  const ref = `${target?.source_ref || ""} ${target?.label || ""}`.toLowerCase();
  if (ref.includes("intent") || ref.includes("意图") || ref.includes("问题")) return "intent";
  if (ref.includes("scope") || ref.includes("范围") || ref.includes("首切片")) return "scope";
  if (ref.includes("ready") || ref.includes("authority") || ref.includes("权威") || ref.includes("路由")) return "readiness";
  return "all";
}

function applyOutlineAdjustmentState(element, semanticKey) {
  if (reviewData?.review_type !== "outline" || reviewMode !== "adjust") return;
  const target = outlineAdjustmentTarget?.();
  if (!target) return;
  const targetKey = outlineAdjustmentTargetKey(target);
  const applies = targetKey === "all"
    || semanticKey === targetKey
    || (targetKey === "scope" && ["in-scope", "non-goals", "coverage", "first-slice"].includes(semanticKey))
    || (targetKey === "readiness" && ["authority", "readiness", "route"].includes(semanticKey));
  element.classList.add(applies ? "is-adjustment-affected" : "is-adjustment-stable");
  if (semanticKey === "connector" && applies) element.classList.add("is-adjustment-connector");
}

function renderOutlineDecisionPoints(nodes) {
  const section = create("section", "outline-decision-points");
  appendText(section, "h4", "本视图确认点");
  const list = create("div", "outline-decision-list");
  for (const node of nodes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `outline-decision ${isMust(node) ? "must" : ""} ${isResolved(node) ? "resolved" : ""} ${selectedNodeId === node.id ? "selected" : ""}`;
    button.setAttribute("aria-pressed", String(selectedNodeId === node.id));
    appendText(button, "span", node.confirmation_priority ? priorityLabel(node.confirmation_priority) : levelLabel(node.review_level), "outline-decision-meta");
    appendText(button, "strong", node.label || node.id || "未命名确认点");
    appendText(button, "span", node.plain_summary || "点击后在右侧完成确认。", "outline-decision-summary");
    button.addEventListener("click", () => {
      selectedNodeId = selectedNodeId === node.id ? null : node.id;
      render();
    });
    list.appendChild(button);
  }
  if (!nodes.length) appendText(list, "p", "当前视图没有确认点。");
  section.appendChild(list);
  return section;
}
