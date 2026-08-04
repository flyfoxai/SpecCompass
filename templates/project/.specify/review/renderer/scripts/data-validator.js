/* Fixed SpecCompass review renderer infrastructure. Review commands only fill JSON review data. */
const OUTLINE_DISCOVERY_DENSITY_BUDGET = Object.freeze({
  max_visible_nodes_per_map: 18,
  max_depth: 3,
  layer_balance_min_nodes: 8,
  max_layer_share: 0.6,
});
const OUTLINE_DISCOVERY_OVERVIEW_SAFETY_LIMIT = 64;

function outlineSourceStatusExceedsEvidence(sourceStatus, evidenceStatuses) {
  if (evidenceStatuses.includes("unresolved")) return sourceStatus !== "unresolved";
  if (evidenceStatuses.includes("ai-proposed")) return !new Set(["ai-proposed", "unresolved"]).has(sourceStatus);
  return false;
}

function validateBoundaryAdjustmentRuntime(data) {
  const value = data.boundary_adjustment;
  if (value === undefined) return "";
  if (data.review_type !== "outline" || !value || typeof value !== "object" || Array.isArray(value)) {
    return "boundary_adjustment 只能用于 Outline 审核。";
  }
  const keys = new Set([
    "operation", "proposal_id", "proposal_digest", "base_baseline_id", "base_baseline_digest",
    "impact_preview_digest", "initiated_by", "change_class", "affected_feature_codes",
    "proposal_path", "impact_preview_path", "decision_path", "writer_ledger_path",
    "decision_target_ref"
  ]);
  const requiredKeys = [...keys].filter((key) => key !== "operation");
  if (Object.keys(value).some((key) => !keys.has(key)) || requiredKeys.some((key) => !(key in value))) {
    return "boundary_adjustment 字段不完整或包含未知字段。";
  }
  const operation = value.operation || "ADJUSTMENT";
  const baseIdentityValid = operation === "ADOPTION"
    ? value.base_baseline_id === null && value.base_baseline_digest === null && value.change_class === "ADOPTION"
    : operation === "ADJUSTMENT" && typeof value.base_baseline_id === "string" && value.base_baseline_id
      && /^[a-f0-9]{64}$/.test(value.base_baseline_digest || "")
      && ["METADATA", "STRUCTURAL"].includes(value.change_class);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.proposal_id || "")
    || ![value.proposal_digest, value.impact_preview_digest]
      .every((digest) => /^[a-f0-9]{64}$/.test(digest || ""))
    || !["model", "user"].includes(value.initiated_by)
    || !baseIdentityValid) {
    return "boundary_adjustment 身份或分类无效。";
  }
  if (!Array.isArray(value.affected_feature_codes)
    || new Set(value.affected_feature_codes).size !== value.affected_feature_codes.length
    || value.affected_feature_codes.some((code) => !/^(?:[0-9]{3,}|[0-9]{8}-[0-9]{6})$/.test(code))) {
    return "boundary_adjustment affected_feature_codes 无效。";
  }
  const feature = String(data.project?.feature || "");
  const base = `specs/${feature}/boundary-adjustments`;
  const draft = `${base}/drafts/${value.proposal_id}`;
  const expected = {
    proposal_path: `${draft}/proposal.json`,
    impact_preview_path: `${draft}/impact-preview.json`,
    decision_path: `${draft}/decision.json`,
    writer_ledger_path: `${base}/writeback-ledger.jsonl`
  };
  for (const [field, path] of Object.entries(expected)) {
    if (!runtimeIsSafeRepoPath(value[field]) || value[field] !== path) return `boundary_adjustment ${field} 必须使用固定路径。`;
  }
  if (typeof value.decision_target_ref !== "string" || !value.decision_target_ref) {
    return "boundary_adjustment decision_target_ref 无效。";
  }
  return "";
}

function validateOutlineDiscoveryTopologyRuntime(data) {
  const budget = data.density_budget;
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) return "Outline 探索缺少密度预算。";
  if (Object.prototype.hasOwnProperty.call(budget, "max_children_per_node")) {
    return "Outline 探索密度预算不能包含已废弃的 max_children_per_node。";
  }
  for (const [key, expected] of Object.entries(OUTLINE_DISCOVERY_DENSITY_BUDGET)) {
    if (budget[key] !== expected) return `Outline 探索密度预算 ${key} 必须是 ${expected}。`;
  }
  if (!Array.isArray(data.maps) || data.maps.length < 3) return "Outline 探索至少需要总图、业务分图和全局约束图。";
  const mapsById = new Map();
  for (const map of data.maps) {
    if (["map_id", "title", "summary", "map_kind", "root_node_id"].some((key) => !String(map?.[key] || "").trim())) {
      return "Outline 探索导图字段不完整。";
    }
    if (mapsById.has(map.map_id)) return "Outline 探索 map_id 必须唯一。";
    if (!new Set(["overview", "branch", "global_constraints"]).has(map.map_kind)) return "Outline 探索 map_kind 不受支持。";
    if (!(typeof map.parent_map_id === "string" || map.parent_map_id === null)) return "Outline 探索 parent_map_id 必须是字符串或 null。";
    mapsById.set(map.map_id, map);
  }
  if (data.maps.filter((map) => map.map_kind === "overview").length !== 1) return "Outline 探索必须且只能有一个总图。";
  if (data.maps.filter((map) => map.map_kind === "global_constraints").length !== 1) return "Outline 探索必须且只能有一个全局约束图。";
  for (const map of data.maps) {
    if (map.map_kind === "overview" ? map.parent_map_id !== null : !mapsById.has(map.parent_map_id)) {
      return "Outline 探索导图的父图引用无效。";
    }
  }
  for (const map of data.maps) {
    const visited = new Set([map.map_id]);
    let cursor = map;
    while (cursor.parent_map_id !== null) {
      cursor = mapsById.get(cursor.parent_map_id);
      if (!cursor) break;
      if (visited.has(cursor.map_id)) return "Outline 导图之间不能包含父图循环。";
      visited.add(cursor.map_id);
    }
  }

  if (!Array.isArray(data.outline_nodes) || !data.outline_nodes.length) return "Outline 探索至少需要一个导图节点。";
  const nodeKinds = new Set(["root", "goal", "role", "domain", "scope", "problem", "scenario", "capability", "acceptance", "risk", "constraint", "map_link"]);
  const sourceStatuses = new Set(["user", "user-confirmed", "doc", "ai-proposed", "unresolved"]);
  const nodesById = new Map();
  const nodesByMap = new Map(data.maps.map((map) => [map.map_id, []]));
  for (const node of data.outline_nodes) {
    if (["node_id", "map_id", "node_kind", "label", "summary", "source_status"].some((key) => !String(node?.[key] || "").trim())) {
      return "Outline 探索节点字段不完整。";
    }
    if (!(typeof node.parent_node_id === "string" || node.parent_node_id === null)) return "Outline 探索 parent_node_id 必须是字符串或 null。";
    if (nodesById.has(node.node_id)) return "Outline 探索 node_id 必须唯一。";
    if (!mapsById.has(node.map_id) || !nodeKinds.has(node.node_kind) || !sourceStatuses.has(node.source_status)) {
      return "Outline 探索节点类型、来源或所属导图无效。";
    }
    nodesById.set(node.node_id, node);
    nodesByMap.get(node.map_id).push(node);
  }
  for (const map of data.maps) {
    const mapNodes = nodesByMap.get(map.map_id);
    if (map.map_kind === "overview" && mapNodes.length > OUTLINE_DISCOVERY_OVERVIEW_SAFETY_LIMIT) {
      return `Outline 总图最多显示 ${OUTLINE_DISCOVERY_OVERVIEW_SAFETY_LIMIT} 个节点。`;
    }
    if (map.map_kind !== "overview" && mapNodes.length > OUTLINE_DISCOVERY_DENSITY_BUDGET.max_visible_nodes_per_map) {
      return "单张 Outline 分图最多显示 18 个节点。";
    }
    const root = nodesById.get(map.root_node_id);
    if (!root || root.map_id !== map.map_id || root.node_kind !== "root" || root.parent_node_id !== null ||
        mapNodes.filter((node) => node.parent_node_id === null).length !== 1) {
      return "Outline 探索每张导图必须有且只有一个合法根节点。";
    }
  }
  const childrenByParent = new Map();
  for (const node of data.outline_nodes) {
    if (node.parent_node_id !== null) {
      const parent = nodesById.get(node.parent_node_id);
      if (!parent || parent.map_id !== node.map_id) return "Outline 节点的父节点必须存在于同一张导图。";
      const children = childrenByParent.get(parent.node_id) || [];
      children.push(node);
      childrenByParent.set(parent.node_id, children);
    }
  }
  for (const node of data.outline_nodes) {
    if (node.node_kind === "map_link" && (childrenByParent.get(node.node_id) || []).length) {
      return "Outline 分图入口不能同时承载本图子节点；下一级内容必须来自 child_map_id 指向的分图。";
    }
  }
  for (const map of data.maps) {
    const mapNodes = nodesByMap.get(map.map_id);
    const layers = new Map();
    for (const node of mapNodes) {
      let depth = 1;
      let cursor = node;
      const visited = new Set([node.node_id]);
      while (cursor.parent_node_id !== null) {
        const parent = nodesById.get(cursor.parent_node_id);
        if (!parent || parent.map_id !== map.map_id) break;
        if (visited.has(parent.node_id)) return "Outline 导图不能包含父子循环。";
        visited.add(parent.node_id);
        depth += 1;
        cursor = parent;
      }
      if (depth > OUTLINE_DISCOVERY_DENSITY_BUDGET.max_depth) return "单张 Outline 导图最多展示 3 层。";
      layers.set(depth, (layers.get(depth) || 0) + 1);
    }
    if (map.map_kind !== "overview" && mapNodes.length >= OUTLINE_DISCOVERY_DENSITY_BUDGET.layer_balance_min_nodes &&
        Math.max(...layers.values()) / mapNodes.length > OUTLINE_DISCOVERY_DENSITY_BUDGET.max_layer_share) {
      return "Outline 导图任一层不能承载超过 60% 的节点。";
    }
  }
  const childMapLinkCounts = new Map();
  const overviewMap = data.maps.find((map) => map.map_kind === "overview");
  const overviewRoot = overviewMap ? nodesById.get(overviewMap.root_node_id) : null;
  const globalMap = data.maps.find((map) => map.map_kind === "global_constraints");
  const businessChainsById = new Map((data.business_context?.business_chains || []).map((chain) => [chain?.chain_id, chain]));
  const businessChainIds = new Set(businessChainsById.keys());
  const capabilityAtomsById = new Map((data.business_context?.capability_atoms || []).map((atom) => [atom?.atom_id, atom]));
  const capabilityAtomOwnerCounts = new Map([...capabilityAtomsById.keys()].map((atomId) => [atomId, 0]));
  const businessChainProjectOwnerCounts = new Map([...businessChainIds].map((chainId) => [chainId, 0]));
  const clauseIds = new Set((data.constitution_snapshot?.clauses || []).map((clause) => clause?.clause_id));
  for (const node of data.outline_nodes) {
    const map = mapsById.get(node.map_id);
    const childMap = mapsById.get(node.child_map_id);
    const isBusinessNode = map.map_kind === "branch" || (map.map_kind === "overview" && node.node_kind !== "root" && childMap?.map_kind !== "global_constraints");
    const isLevelOneProjectLink = data.schema_version === 3 && data.outline_maturity === "explore" &&
      map.map_kind === "overview" &&
      node.parent_node_id === overviewRoot?.node_id &&
      node.node_kind === "map_link" &&
      childMap?.map_kind === "branch";
    const isOverviewBusinessMapLink = map.map_kind === "overview" &&
      node.parent_node_id === overviewRoot?.node_id &&
      node.node_kind === "map_link" &&
      childMap?.map_kind === "branch";
    if (node.parent_node_id === overviewRoot?.node_id && (node.node_kind !== "map_link" || !["branch", "global_constraints"].includes(childMap?.map_kind))) {
      return "总图根节点的直接子节点只能是业务分图或全局治理分图入口。";
    }
    if (isBusinessNode || (map.map_kind === "overview" && node.node_kind === "root")) {
      if (!Array.isArray(node.business_chain_refs) || !node.business_chain_refs.length) return "业务主干必须引用至少一条业务链。";
      if (node.business_chain_refs.some((id) => !businessChainIds.has(id))) return "业务节点引用了不存在的业务链。";
    } else if (node.business_chain_refs !== undefined) {
      return "业务链引用只能出现在业务节点。";
    }
    if (node.capability_atom_refs !== undefined &&
        (!isBusinessNode || !Array.isArray(node.capability_atom_refs) || !node.capability_atom_refs.length ||
         new Set(node.capability_atom_refs).size !== node.capability_atom_refs.length ||
         node.capability_atom_refs.some((id) => !capabilityAtomsById.has(id)))) {
      return "业务节点的 capability_atom_refs 必须引用结构化业务能力原子。";
    }
    if (map.map_kind !== "global_constraints" && !(map.map_kind === "overview" && node.node_kind === "root")) {
      const evidenceStatuses = [
        ...(node.capability_atom_refs || []).map((id) => capabilityAtomsById.get(id)?.source_status),
        ...(node.business_chain_refs || []).map((id) => businessChainsById.get(id)?.source_status),
      ].filter(Boolean);
      if (outlineSourceStatusExceedsEvidence(node.source_status, evidenceStatuses)) {
        return "业务节点的来源等级不能高于其能力原子或业务链证据。";
      }
    }
    if (isOverviewBusinessMapLink && (!Array.isArray(node.capability_atom_refs) || !node.capability_atom_refs.length)) {
      return "总图业务分图入口必须拥有至少一个业务能力原子。";
    }
    if (node.aggregation_basis !== undefined && !isLevelOneProjectLink) {
      return "aggregation_basis 只能用于旧版 Level 1 候选项目入口。";
    }
    if (isLevelOneProjectLink) {
      if (!Array.isArray(node.business_chain_refs) || !node.business_chain_refs.length ||
          new Set(node.business_chain_refs).size !== node.business_chain_refs.length) {
        return "Level 1 候选项目必须引用一组不重复的业务链。";
      }
      if (!Array.isArray(node.capability_atom_refs) || !node.capability_atom_refs.length ||
          new Set(node.capability_atom_refs).size !== node.capability_atom_refs.length) {
        return "Level 1 候选项目必须引用一组不重复的业务能力原子。";
      }
      for (const chainId of node.business_chain_refs) {
        if (businessChainProjectOwnerCounts.has(chainId)) {
          businessChainProjectOwnerCounts.set(chainId, businessChainProjectOwnerCounts.get(chainId) + 1);
        }
      }
      const atomChainRefs = new Set();
      for (const atomId of node.capability_atom_refs) {
        const atom = capabilityAtomsById.get(atomId);
        if (capabilityAtomOwnerCounts.has(atomId)) {
          capabilityAtomOwnerCounts.set(atomId, capabilityAtomOwnerCounts.get(atomId) + 1);
        }
        for (const chainId of atom?.business_chain_refs || []) atomChainRefs.add(chainId);
      }
      if (atomChainRefs.size !== node.business_chain_refs.length ||
          node.business_chain_refs.some((chainId) => !atomChainRefs.has(chainId))) {
        return "Level 1 候选项目的业务链必须等于其能力原子引用的业务链。";
      }
      if (node.capability_atom_refs.length === 1 && node.aggregation_basis !== undefined) {
        return "单能力 Level 1 候选项目不能声明 aggregation_basis。";
      }
      if (node.capability_atom_refs.length > 1) {
        const basis = node.aggregation_basis;
        if (!basis || typeof basis !== "object" || Array.isArray(basis)) {
          return "多能力 Level 1 候选项目必须提供文档或人工依据的 aggregation_basis。";
        }
        if (!new Set(["doc", "user", "user-confirmed"]).has(basis.authority)) {
          return "aggregation_basis.authority 必须是 doc、user 或 user-confirmed。";
        }
        for (const key of ["shared_business_goal", "shared_lifecycle_or_owner", "split_acceptance_harm"]) {
          if (String(basis[key] || "").trim().length < 20) return `aggregation_basis.${key} 必须包含具体业务理由。`;
        }
        if (!Array.isArray(basis.source_refs) || !basis.source_refs.length) return "aggregation_basis 必须提供来源引用。";
      }
    }
    if (node.constitution_clause_refs !== undefined &&
        (map.map_kind !== "global_constraints" || node.node_kind !== "constraint" || !Array.isArray(node.constitution_clause_refs) ||
         !node.constitution_clause_refs.length || node.constitution_clause_refs.some((id) => !clauseIds.has(id)))) {
      return "Constitution 条款引用必须属于只读全局约束节点。";
    }
    if (node.child_map_id !== undefined) {
      if (node.node_kind !== "map_link" || !childMap || childMap.parent_map_id !== node.map_id) return "Outline 下钻节点必须指向直接子图。";
      childMapLinkCounts.set(node.child_map_id, (childMapLinkCounts.get(node.child_map_id) || 0) + 1);
    } else if (node.node_kind === "map_link") {
      return "Outline 下钻节点缺少 child_map_id。";
    }
    if (node.affected_node_ids !== undefined) {
      if (map.map_kind !== "global_constraints" || node.node_kind !== "constraint" || !Array.isArray(node.affected_node_ids)) {
        return "affected_node_ids 只能用于全局约束节点。";
      }
      if (new Set(node.affected_node_ids).size !== node.affected_node_ids.length) {
        return "全局约束的受影响节点不能重复。";
      }
      for (const id of node.affected_node_ids) {
        const affected = nodesById.get(id);
        if (!affected || mapsById.get(affected.map_id).map_kind !== "branch") return "全局约束只能关联业务分图节点。";
      }
    }
  }
  for (const map of data.maps) {
    if (map.map_kind !== "overview" && childMapLinkCounts.get(map.map_id) !== 1) {
      return "Outline 子图必须且只能从父图链接一次。";
    }
  }
  const sourcesByPath = new Map((data.source_snapshot || []).map((source) => [String(source?.path || "").replace(/\\/g, "/"), source]));
  const isRecursiveDecompose = data.schema_version === 4 && data.decomposition_window?.generation_mode === "decompose";
  const recursiveUnitNodeIds = new Set(
    (data.decomposition_window?.units || []).map((unit) => unit?.outline_node_id)
  );
  for (const map of data.maps) {
    if (map.map_kind !== "branch") continue;
    const branchBusinessNodes = (nodesByMap.get(map.map_id) || []).filter((node) => node.node_id !== map.root_node_id);
    if (isRecursiveDecompose) {
      if (branchBusinessNodes.some((node) => !recursiveUnitNodeIds.has(node.node_id))) {
        return "v4 分解分图中的业务节点必须登记为本轮 Outline 单元；详细说明只能在终端单元的 detail 窗口生成。";
      }
      continue;
    }
    const directFacts = (nodesByMap.get(map.map_id) || []).filter(
      (node) => node.parent_node_id === map.root_node_id && node.node_kind !== "map_link"
    );
    if (!directFacts.length) return "Outline 业务分图必须在根节点下展开至少一个有来源支持的业务事实。";
    for (const node of directFacts) {
      if (!Array.isArray(node.source_refs) || !node.source_refs.length) return "Outline 分图业务事实必须提供来源引用。";
      for (const rawRef of node.source_refs) {
        const ref = String(rawRef || "").replace(/\\/g, "/");
        const hash = ref.indexOf("#");
        const sourcePath = hash < 0 ? ref : ref.slice(0, hash);
        const anchor = hash < 0 ? "" : ref.slice(hash + 1);
        const source = sourcesByPath.get(sourcePath);
        if (!source || (anchor && (!Array.isArray(source.anchors) || !source.anchors.includes(anchor)))) {
          return "Outline 分图业务事实必须引用来源快照及其声明锚点。";
        }
      }
    }
  }
  if (data.schema_version === 3 && data.outline_maturity === "explore" && [...capabilityAtomOwnerCounts.values()].some((ownerCount) => ownerCount !== 1)) {
    return "每个业务能力原子必须且只能归属一个 Level 1 候选项目。";
  }
  if (data.schema_version === 3 && data.outline_maturity === "explore" && [...businessChainProjectOwnerCounts.values()].some((ownerCount) => ownerCount !== 1)) {
    return "每条 Level 1 业务链必须且只能归属一个候选项目。";
  }
  return { mapsById, nodesById };
}

function validateOutlineDiscoveryDecompositionWindowRuntime(data, topology) {
  if (data.schema_version === 3) return "";
  const window = data.decomposition_window;
  if (!window || typeof window !== "object" || Array.isArray(window)) return "Outline v4 缺少递归分解窗口。";
  if (window.root_project_feature !== data.project?.feature) return "分解窗口的根项目必须与当前 feature 一致。";
  if (!Number.isInteger(window.root_project_depth) || window.root_project_depth < 0) return "分解窗口根深度无效。";
  if (!new Set(["decompose", "detail"]).has(window.generation_mode)) return "分解窗口 generation_mode 无效。";
  const expectedMode = data.outline_maturity === "explore" ? "decompose" : "detail";
  if (window.generation_mode !== expectedMode) return `当前 Outline 成熟度要求 generation_mode=${expectedMode}。`;
  if (!Number.isInteger(window.generated_depth) || window.generated_depth < 0 || window.generated_depth > 3) {
    return "单次 Outline 只能生成 0-3 个后代层级。";
  }
  if (String(window.depth_decision_reason || "").trim().length < 20) return "分解窗口必须说明本轮生成深度的业务理由。";
  if (!Array.isArray(window.parent_path) || window.parent_path.length !== window.root_project_depth) {
    return "分解窗口必须保留从顶级节点到当前根节点的完整父路径。";
  }
  for (let index = 0; index < window.parent_path.length; index += 1) {
    const entry = window.parent_path[index];
    if (!String(entry?.unit_id || "").trim() || !String(entry?.label || "").trim() || entry?.project_depth !== index) {
      return "分解窗口父路径的身份、名称或深度无效。";
    }
  }
  if (!Array.isArray(window.units) || !window.units.length) return "分解窗口至少需要一个 Outline 单元。";
  const atomsById = new Map((data.business_context?.capability_atoms || []).map((atom) => [atom.atom_id, atom]));
  const chainsById = new Map((data.business_context?.business_chains || []).map((chain) => [chain.chain_id, chain]));
  const sources = new Map((data.source_snapshot || []).map((source) => [String(source?.path || "").replace(/\\/g, "/"), source]));
  const statuses = new Set(["user", "user-confirmed", "doc", "ai-proposed", "unresolved"]);
  const aggregationAuthorities = new Set(["doc", "user", "user-confirmed"]);
  const unitsById = new Map();
  const childrenById = new Map();
  const refsError = (refs) => {
    if (!Array.isArray(refs) || !refs.length || new Set(refs).size !== refs.length) return true;
    return refs.some((rawRef) => {
      const ref = String(rawRef || "").replace(/\\/g, "/");
      const hash = ref.indexOf("#");
      const source = sources.get(hash < 0 ? ref : ref.slice(0, hash));
      const anchor = hash < 0 ? "" : ref.slice(hash + 1);
      return !source || (anchor && (!Array.isArray(source.anchors) || !source.anchors.includes(anchor)));
    });
  };
  const basisError = (basis, textFields, statusKey) => {
    if (!basis || typeof basis !== "object" || Array.isArray(basis) || !statuses.has(basis[statusKey])) return true;
    if (textFields.some((key) => String(basis[key] || "").trim().length < 20)) return true;
    return refsError(basis.source_refs);
  };
  for (const unit of window.units) {
    if (!String(unit?.unit_id || "").trim() || unitsById.has(unit.unit_id)) return "Outline unit_id 必须非空且唯一。";
    unitsById.set(unit.unit_id, unit);
    const node = topology.nodesById.get(unit.outline_node_id);
    if (!node || topology.mapsById.get(node.map_id)?.map_kind === "global_constraints") return "Outline 单元必须引用业务导图节点。";
    if (!(typeof unit.parent_unit_id === "string" || unit.parent_unit_id === null)) return "Outline 单元 parent_unit_id 无效。";
    if (!Number.isInteger(unit.project_depth) || unit.project_depth < 0) return "Outline 单元 project_depth 无效。";
    if (!new Set(["expanded", "frontier", "terminal"]).has(unit.decomposition_state)) return "Outline 单元 decomposition_state 无效。";
    if (String(unit.business_goal || "").trim().length < 20 || String(unit.overall_outcome || "").trim().length < 20) {
      return "每个 Outline 单元都必须保留自己的业务目标和整体结果。";
    }
    if (!statuses.has(unit.source_status) || refsError(unit.source_refs)) return "Outline 单元的来源状态或引用无效。";
    const atomRefs = unit.capability_atom_refs;
    const chainRefs = unit.business_chain_refs;
    if (!Array.isArray(atomRefs) || !atomRefs.length || new Set(atomRefs).size !== atomRefs.length || atomRefs.some((id) => !atomsById.has(id))) {
      return "Outline 单元必须引用有效且不重复的能力原子。";
    }
    if (!Array.isArray(chainRefs) || !chainRefs.length || new Set(chainRefs).size !== chainRefs.length || chainRefs.some((id) => !chainsById.has(id))) {
      return "Outline 单元必须引用有效且不重复的业务链。";
    }
    const atomChains = new Set(atomRefs.flatMap((id) => atomsById.get(id)?.business_chain_refs || []));
    if (atomChains.size !== chainRefs.length || chainRefs.some((id) => !atomChains.has(id))) return "Outline 单元的业务链必须与能力原子完全一致。";
    if (atomRefs.length > 1 && basisError(unit.grouping_basis,
      ["shared_business_goal", "shared_lifecycle_or_owner", "parent_cohesion"], "authority")) {
      return "多能力 Outline 单元必须提供完整 grouping_basis。";
    }
    if (unit.parent_unit_id !== null && atomRefs.length > 1
        && unit.grouping_basis?.authority === "unresolved") {
      return "非根多能力 Outline 单元不能用 unresolved 作为归组依据；请把不同划分方案交给 Web Discovery 决定。";
    }
    if (atomRefs.length === 1 && unit.grouping_basis !== undefined) return "单能力 Outline 单元不能声明 grouping_basis。";
    if (unit.decomposition_state === "expanded" && basisError(unit.decomposition_basis,
      ["complexity_reduction", "child_boundary_summary", "coordination_cost"], "source_status")) {
      return "已展开 Outline 单元必须说明分解如何降低复杂度及其协调成本。";
    }
    if (unit.decomposition_state === "terminal" && basisError(unit.terminal_basis,
      ["indivisible_business_goal", "split_complexity_cost", "manageable_implementation_scope"], "source_status")) {
      return "终端 Outline 单元必须说明为何继续拆分会增加复杂度。";
    }
    if (unit.decomposition_state === "frontier" && (unit.decomposition_basis !== undefined || unit.terminal_basis !== undefined)) {
      return "待继续展开的 Outline 单元不能提前声明分解或终止结论。";
    }
  }
  for (const unit of window.units) {
    if (unit.parent_unit_id === null) continue;
    const parent = unitsById.get(unit.parent_unit_id);
    if (!parent) return "Outline 单元的父节点必须位于当前分解窗口。";
    const children = childrenById.get(parent.unit_id) || [];
    children.push(unit);
    childrenById.set(parent.unit_id, children);
  }
  let containsParentCycle = false;
  const visitState = new Map();
  const visitUnit = (unit) => {
    const state = visitState.get(unit.unit_id) || 0;
    if (state === 1) {
      containsParentCycle = true;
      return;
    }
    if (state === 2) return;
    visitState.set(unit.unit_id, 1);
    for (const child of childrenById.get(unit.unit_id) || []) visitUnit(child);
    visitState.set(unit.unit_id, 2);
  };
  for (const unit of window.units) visitUnit(unit);
  if (containsParentCycle) return "分解窗口的 Outline 单元不能形成父子循环。";

  const roots = window.units.filter((unit) => unit.parent_unit_id === null);
  if (roots.length !== 1) return "分解窗口必须且只能有一个根 Outline 单元。";
  const root = roots[0];
  const reachable = new Set();
  const markReachable = (unit) => {
    if (reachable.has(unit.unit_id)) return;
    reachable.add(unit.unit_id);
    for (const child of childrenById.get(unit.unit_id) || []) markReachable(child);
  };
  markReachable(root);
  if (reachable.size !== window.units.length) return "分解窗口的所有 Outline 单元必须连接到展开根。";
  if (window.units.some((unit) => unit.parent_unit_id !== null
      && unit.project_depth !== unitsById.get(unit.parent_unit_id).project_depth + 1)) {
    return "Outline 单元的项目深度必须比父单元大一。";
  }
  if (root.outline_node_id !== window.expansion_root_node_id || root.project_depth !== window.root_project_depth) {
    return "分解窗口根节点身份或深度不一致。";
  }
  if (root.capability_atom_refs.length !== atomsById.size || [...atomsById.keys()].some((id) => !root.capability_atom_refs.includes(id))) {
    return "分解窗口根单元必须覆盖当前业务上下文的全部能力原子。";
  }
  for (const unit of window.units) {
    const children = childrenById.get(unit.unit_id) || [];
    if (unit.decomposition_state === "expanded" && !children.length) return "expanded Outline 单元必须拥有直接子单元。";
    if (unit.decomposition_state !== "expanded" && children.length) return "frontier 或 terminal Outline 单元不能拥有子单元。";
    if (!children.length) continue;
    const atoms = [];
    const chains = [];
    children.forEach((child) => { atoms.push(...child.capability_atom_refs); chains.push(...child.business_chain_refs); });
    if (new Set(atoms).size !== atoms.length || new Set(chains).size !== chains.length) return "同级 Outline 单元不能重叠拥有能力原子或业务链。";
    if (atoms.length !== unit.capability_atom_refs.length || unit.capability_atom_refs.some((id) => !atoms.includes(id)) ||
        chains.length !== unit.business_chain_refs.length || unit.business_chain_refs.some((id) => !chains.includes(id))) {
      return "已展开 Outline 单元的直接子单元必须完整覆盖父单元。";
    }
  }
  if (!Array.isArray(window.frontier_unit_ids) || !Array.isArray(window.terminal_unit_ids)) {
    return "分解窗口必须提供 frontier_unit_ids 和 terminal_unit_ids 数组。";
  }
  const frontier = new Set(window.frontier_unit_ids);
  const terminal = new Set(window.terminal_unit_ids);
  if (frontier.size !== window.frontier_unit_ids.length || terminal.size !== window.terminal_unit_ids.length) {
    return "frontier_unit_ids 和 terminal_unit_ids 不能包含重复单元。";
  }
  const expectedFrontier = new Set(window.units.filter((unit) => unit.decomposition_state === "frontier").map((unit) => unit.unit_id));
  const expectedTerminal = new Set(window.units.filter((unit) => unit.decomposition_state === "terminal").map((unit) => unit.unit_id));
  if (frontier.size !== expectedFrontier.size || [...frontier].some((id) => !expectedFrontier.has(id))) return "frontier_unit_ids 与单元状态不一致。";
  if (terminal.size !== expectedTerminal.size || [...terminal].some((id) => !expectedTerminal.has(id))) return "terminal_unit_ids 与单元状态不一致。";
  const maxDepth = Math.max(...window.units.map((unit) => unit.project_depth));
  if (window.generated_depth !== maxDepth - window.root_project_depth) return "generated_depth 必须等于实际生成的最深后代层数。";
  if (/^000(?:-|$)/.test(data.project.feature) && window.generation_mode === "decompose") {
    if (window.generated_depth !== 1 || root.decomposition_state !== "expanded") return "000 顶级 Outline 每次必须只生成一个直接后代层级。";
  } else if (window.generation_mode === "decompose" && ![2, 3].includes(window.generated_depth)) {
    const endedEarly = frontier.size === 0 && window.units.filter((unit) => unit.project_depth === maxDepth)
      .every((unit) => unit.decomposition_state === "terminal");
    if (!endedEarly) return "普通 Outline 分解每轮应生成两层或三层，除非所有分支提前到达末端。";
  }
  if (window.generation_mode === "detail") {
    if (window.generated_depth !== 0 || window.units.length !== 1 || root.decomposition_state !== "terminal") {
      return "详细编译只能从一个已确认的终端 Outline 单元开始。";
    }
    if (!new Set(["doc", "user", "user-confirmed"]).has(root.terminal_basis?.source_status)) {
      return "进入详细编译前必须正式确认 terminal_basis。";
    }
  }
  return "";
}

function validateOutlineDiscoveryBusinessRuntime(data) {
  const context = data.business_context;
  if (!context || typeof context !== "object" || Array.isArray(context)) return "Outline 探索缺少结构化业务语义。";
  const sources = new Map((data.source_snapshot || []).map((source) => [String(source?.path || "").replace(/\\/g, "/"), source]));
  const validateEvidence = (entry) => {
    if (!new Set(["user", "user-confirmed", "doc", "ai-proposed", "unresolved"]).has(entry?.source_status)) return "业务语义来源状态无效。";
    if (!Array.isArray(entry?.source_refs) || !entry.source_refs.length) return "业务语义必须提供来源引用。";
    for (const rawRef of entry.source_refs) {
      const ref = String(rawRef || "").replace(/\\/g, "/");
      const hash = ref.indexOf("#");
      const sourcePath = hash < 0 ? ref : ref.slice(0, hash);
      const anchor = hash < 0 ? "" : ref.slice(hash + 1);
      if (sourcePath === data.constitution_snapshot?.source_path || /(?:^|\/)constitution\.md$/i.test(sourcePath)) return "Constitution 不能作为业务能力证据。";
      const source = sources.get(sourcePath);
      if (!source || (anchor && (!Array.isArray(source.anchors) || !source.anchors.includes(anchor)))) return "业务来源引用必须对应来源快照及其锚点。";
    }
    return "";
  };
  if (!context.product_subject || !String(context.product_subject.label || "").trim() || !String(context.product_subject.summary || "").trim()) return "业务主语字段不完整。";
  let error = validateEvidence(context.product_subject);
  if (error) return error;
  const collect = (key, idKey, requiredTextFields = ["label", "summary"]) => {
    const values = context[key];
    if (!Array.isArray(values) || !values.length) return { error: `业务语义 ${key} 不能为空。` };
    const ids = new Set();
    for (const entry of values) {
      if (!String(entry?.[idKey] || "").trim() || requiredTextFields.some((field) => !String(entry?.[field] || "").trim()) || ids.has(entry[idKey])) {
        return { error: `业务语义 ${key} 字段不完整或 ID 重复。` };
      }
      ids.add(entry[idKey]);
      error = validateEvidence(entry);
      if (error) return { error };
    }
    return { values, ids };
  };
  const objects = collect("business_objects", "object_id"); if (objects.error) return objects.error;
  const operations = collect("operations", "operation_id"); if (operations.error) return operations.error;
  const outcomes = collect("outcomes", "outcome_id"); if (outcomes.error) return outcomes.error;
  for (const operation of operations.values) {
    if (!Array.isArray(operation.object_refs) || !operation.object_refs.length || operation.object_refs.some((id) => !objects.ids.has(id))) return "业务动作必须引用现有业务对象。";
  }
  const chainKinds = new Set(["primary", "recovery", "governance"]);
  const triggerKinds = new Set(["business_event", "exception_or_interruption", "governance_change"]);
  const triggerKindByChainKind = new Map([
    ["primary", "business_event"],
    ["recovery", "exception_or_interruption"],
    ["governance", "governance_change"],
  ]);
  const chains = collect("business_chains", "chain_id", [
    "label", "chain_kind", "trigger_kind", "trigger_or_input", "owned_state",
    "primary_outcome_ref", "downstream_handoff",
  ]); if (chains.error) return chains.error;
  const chainsById = new Map(chains.values.map((chain) => [chain.chain_id, chain]));
  const primaryOutcomeOwnerCounts = new Map();
  for (const chain of chains.values) {
    if (!chainKinds.has(chain.chain_kind) || !triggerKinds.has(chain.trigger_kind) ||
        !Array.isArray(chain.object_refs) || !chain.object_refs.length || chain.object_refs.some((id) => !objects.ids.has(id)) ||
        !Array.isArray(chain.operation_refs) || !chain.operation_refs.length || chain.operation_refs.some((id) => !operations.ids.has(id)) ||
        !Array.isArray(chain.outcome_refs) || !chain.outcome_refs.length || chain.outcome_refs.some((id) => !outcomes.ids.has(id))) return "业务链必须包含有效的输入、对象、动作和结果。";
    if (!outcomes.ids.has(chain.primary_outcome_ref) || !chain.outcome_refs.includes(chain.primary_outcome_ref)) return "业务链主要结果必须引用该链的现有结果。";
    if (data.outline_maturity === "explore") {
      if (chain.outcome_refs.length !== 1) return "Level 1 业务链必须且只能拥有一个可独立验收结果。";
      if (triggerKindByChainKind.get(chain.chain_kind) !== chain.trigger_kind) return "Level 1 业务链类型与实际触发类型不一致。";
      primaryOutcomeOwnerCounts.set(chain.primary_outcome_ref, (primaryOutcomeOwnerCounts.get(chain.primary_outcome_ref) || 0) + 1);
    }
  }
  if (data.outline_maturity === "explore" && [...primaryOutcomeOwnerCounts.values()].some((count) => count !== 1)) {
    return "Level 1 每个主要结果必须且只能由一条业务链负责。";
  }
  const atoms = collect("capability_atoms", "atom_id", ["label"]); if (atoms.error) return atoms.error;
  const capabilityAtomCountsByChain = new Map(chains.values.map((chain) => [chain.chain_id, 0]));
  for (const atom of atoms.values) {
    if (!triggerKinds.has(atom.trigger_kind) || !Array.isArray(atom.object_refs) || !atom.object_refs.length || atom.object_refs.some((id) => !objects.ids.has(id)) ||
        !Array.isArray(atom.operation_refs) || !atom.operation_refs.length || atom.operation_refs.some((id) => !operations.ids.has(id)) ||
        !Array.isArray(atom.outcome_refs) || !atom.outcome_refs.length || atom.outcome_refs.some((id) => !outcomes.ids.has(id)) ||
        !Array.isArray(atom.business_chain_refs) || !atom.business_chain_refs.length || atom.business_chain_refs.some((id) => !chains.ids.has(id))) {
      return "业务能力原子必须引用有效的对象、动作、结果和业务链。";
    }
    if (data.outline_maturity === "explore" && atom.business_chain_refs.length !== 1) {
      return "Level 1 业务能力原子必须且只能引用一条主要业务链。";
    }
    if (data.outline_maturity === "explore" && atom.business_chain_refs.length === 1) {
      const chain = chainsById.get(atom.business_chain_refs[0]);
      if (chain) capabilityAtomCountsByChain.set(chain.chain_id, capabilityAtomCountsByChain.get(chain.chain_id) + 1);
      if (chain && atom.trigger_kind !== chain.trigger_kind) return "Level 1 能力原子的触发类型必须与所属业务链一致。";
      if (chain && ["trigger_or_input", "owned_state", "primary_outcome_ref", "downstream_handoff"]
        .some((field) => atom?.[field] !== chain?.[field])) {
        return "Level 1 能力原子的业务语义必须与所属业务链一致。";
      }
      if (atom.outcome_refs.length !== 1 || (chain && atom.outcome_refs[0] !== chain.primary_outcome_ref)) {
        return "Level 1 能力原子必须指向所属业务链的主要结果。";
      }
    }
  }
  if (data.outline_maturity === "explore" && [...capabilityAtomCountsByChain.values()].some((count) => count !== 1)) {
    return "每条 Level 1 业务链必须且只能拥有一个业务能力原子。";
  }
  if (!Array.isArray(context.evidence_gaps)) return "业务证据缺口必须是数组。";
  const evidenceGapIds = new Set();
  for (const gap of context.evidence_gaps) {
    if (!String(gap?.gap_id || "").trim() || !String(gap?.summary || "").trim() || !Array.isArray(gap.business_chain_refs) || !gap.business_chain_refs.length || gap.business_chain_refs.some((id) => !chains.ids.has(id))) return "业务证据缺口必须引用现有业务链。";
    if (evidenceGapIds.has(gap.gap_id)) return "业务证据缺口包含重复 ID。";
    evidenceGapIds.add(gap.gap_id);
  }
  if (data.outline_maturity === "frame" && !chains.values.some((chain) => ["user", "user-confirmed", "doc"].includes(chain.source_status))) return "Frame 阶段至少需要一条有来源支持的完整业务链。";
  return "";
}

function validateOutlineDiscoveryConstitutionRuntime(data) {
  const snapshot = data.constitution_snapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return "Outline 探索缺少 Constitution 只读快照。";
  if (!runtimeIsSafeRepoPath(snapshot.source_path)) return "Constitution 来源路径无效。";
  if (!new Set(["available", "missing"]).has(snapshot.availability)) return "Constitution 可用状态无效。";
  if (snapshot.display_mode !== "read_only" || snapshot.application_scope !== "governance_only") return "Constitution 在 PRD 中必须仅作只读治理展示。";
  if (!Array.isArray(snapshot.clauses) || (snapshot.availability === "missing" && snapshot.clauses.length)) return "Constitution 条款与可用状态不一致。";
  const ids = new Set();
  const applicabilityStatuses = new Set(["applicable", "possibly_applicable", "not_applicable"]);
  for (const clause of snapshot.clauses) {
    if (["clause_id", "title", "summary", "source_anchor", "applicability_status"].some((key) => !String(clause?.[key] || "").trim()) || ids.has(clause.clause_id)) return "Constitution 条款字段不完整或 ID 重复。";
    if (!applicabilityStatuses.has(clause.applicability_status)) return "Constitution 条款适用状态无效。";
    ids.add(clause.clause_id);
  }
  return "";
}

function validateReviewData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "review data 必须是 JSON object。";
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.has(data.schema_version)) {
    return `schema_version 必须是 1、2、3 或 4，当前为 ${data.schema_version ?? "未提供"}。`;
  }
  if (!new Set(["flow", "ui", "outline", "outline_discovery"]).has(data.review_type)) {
    return "review_type 必须是 flow、ui、outline 或 outline_discovery。";
  }
  if (data.review_type === "outline_discovery") {
    reviewMode = "confirm";
    if (typeof document !== "undefined") {
      document.body.classList.remove("outline-adjustment-mode");
      $("review-mode-switch")?.classList.add("hidden");
    }
    if (![3, 4].includes(data.schema_version)) return "outline_discovery 必须使用 schema_version 3 或 4。";
    if (data.interaction_mode !== "discovery") return "outline_discovery 的 interaction_mode 必须是 discovery。";
    if (!new Set(["explore", "frame"]).has(data.outline_maturity)) return "outline_maturity 必须是 explore 或 frame。";
    if (data.authorization_effect !== "none" || data.next_route !== "/sp.prd") {
      return "Outline 探索不能授权 /sp.specify，且 next_route 必须回到 /sp.prd。";
    }
    const artifactPath = String(data.artifact_path || "").replace(/\\/g, "/");
    if (!runtimeIsSafeRepoPath(data.artifact_path) || !/^specs\/[^/]+\/prd\/review\/outline-discovery-data\.json$/.test(artifactPath)) {
      return "outline discovery artifact_path 必须是安全的 specs/<feature>/prd/review/outline-discovery-data.json 路径。";
    }
    const feature = String(data.project?.feature || "").trim();
    if (!data.project || typeof data.project !== "object" || Array.isArray(data.project)) return "Outline 探索 project 必须是 object。";
    for (const key of ["name", "feature", "current_understanding", "discovery_goal"]) {
      if (!String(data.project[key] || "").trim()) return `Outline 探索 project 缺少 ${key}。`;
    }
    if (!new RegExp(`^specs/${feature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/prd/review/outline-discovery-data\\.json$`).test(artifactPath)) {
      return "Outline 探索 project.feature 必须与 artifact_path 中的需求目录一致。";
    }
    if (!Array.isArray(data.source_snapshot) || !data.source_snapshot.length) return "Outline 探索至少需要一个来源。";
    for (const source of data.source_snapshot) {
      if (!runtimeIsSafeRepoPath(source?.path) || !String(source?.source_type || "").trim()) {
        return "Outline 探索来源必须包含安全的仓库相对 path 和非空 source_type。";
      }
    }
    let discoveryError = validateOutlineDiscoveryConstitutionRuntime(data);
    if (discoveryError) return discoveryError;
    discoveryError = validateOutlineDiscoveryBusinessRuntime(data);
    if (discoveryError) return discoveryError;
    const topology = validateOutlineDiscoveryTopologyRuntime(data);
    if (typeof topology === "string") return topology;
    discoveryError = validateOutlineDiscoveryDecompositionWindowRuntime(data, topology);
    if (discoveryError) return discoveryError;
    if (!Array.isArray(data.question_groups) || !data.question_groups.length) return "Outline 探索至少需要一个问题组。";
    const groupIds = new Set();
    const questionIds = new Set();
    const businessChainIds = new Set(data.business_context.business_chains.map((chain) => chain.chain_id));
    const capabilityAtomsById = new Map(data.business_context.capability_atoms.map((atom) => [atom.atom_id, atom]));
    for (const group of data.question_groups) {
      if (!String(group?.id || "").trim() || groupIds.has(group.id)) return "Outline 探索问题组 ID 必须非空且唯一。";
      groupIds.add(group.id);
      if (!String(group?.title || "").trim() || !String(group?.summary || "").trim()) return "Outline 探索问题组必须包含 title 和 summary。";
      if (!topology.mapsById.has(group.map_id)) return "Outline 探索问题组必须绑定现有导图。";
      if (!Array.isArray(group.questions) || !group.questions.length) return "Outline 探索问题组至少需要一个问题。";
      for (const question of group.questions) {
        if (!String(question?.id || "").trim() || questionIds.has(question.id)) return "Outline 探索问题 ID 必须非空且全局唯一。";
        questionIds.add(question.id);
        for (const key of ["outline_node_id", "target_kind", "prompt", "context", "recommendation_reason"]) {
          if (!String(question?.[key] || "").trim()) return `Outline 探索问题缺少 ${key}。`;
        }
        const questionNode = topology.nodesById.get(question.outline_node_id);
        if (!questionNode || questionNode.map_id !== group.map_id) return "Outline 探索问题必须绑定当前导图中的现有节点。";
        const questionMap = topology.mapsById.get(questionNode.map_id);
        if (questionMap?.map_kind === "global_constraints" || Array.isArray(questionNode.constitution_clause_refs)) return "Constitution 只读节点不能绑定确认问题。";
        const currentLevelOneProject = data.schema_version === 3 && data.outline_maturity === "explore"
          ? (questionMap?.map_kind === "branch"
            ? data.outline_nodes.find((node) => node?.child_map_id === questionMap.map_id)
            : (questionMap?.map_kind === "overview" && questionNode?.node_kind === "map_link" ? questionNode : null))
          : null;
        const currentLevelOneAtomId = currentLevelOneProject?.capability_atom_refs?.length === 1
          ? currentLevelOneProject.capability_atom_refs[0]
          : null;
        if (question.selection_mode !== "single") return "Outline 探索 selection_mode 必须是 single。";
        if (!Array.isArray(question.candidates) || question.candidates.length < 2 || question.candidates.length > 4) {
          return "Outline 探索问题必须提供 2-4 个候选。";
        }
        const candidateIds = new Set();
        for (const candidate of question.candidates) {
          if (["id", "label", "value", "rationale"].some((key) => !String(candidate?.[key] || "").trim()) || candidateIds.has(candidate.id)) {
            return "Outline 探索候选必须字段完整且 ID 唯一。";
          }
          if (!Array.isArray(candidate.business_chain_refs) || !candidate.business_chain_refs.length ||
              candidate.business_chain_refs.some((id) => !businessChainIds.has(id))) {
            return "Outline 探索候选必须引用有效业务链作为依据。";
          }
          if (data.schema_version === 3 && data.outline_maturity === "explore" && candidate.business_chain_refs.length !== 1) {
            return "Level 1 候选必须且只能引用一条主要业务链。";
          }
          if (!Array.isArray(candidate.capability_atom_refs) || !candidate.capability_atom_refs.length ||
              new Set(candidate.capability_atom_refs).size !== candidate.capability_atom_refs.length ||
              candidate.capability_atom_refs.some((id) => !capabilityAtomsById.has(id))) {
            return "Outline 探索候选必须引用有效业务能力原子作为依据。";
          }
          if (data.schema_version === 3 && data.outline_maturity === "explore") {
            if (candidate.capability_atom_refs.length !== 1 ||
                !currentLevelOneAtomId || candidate.capability_atom_refs[0] !== currentLevelOneAtomId) {
              return "Level 1 候选项只能引用当前候选项目的业务能力原子。";
            }
            const primaryChainId = candidate.business_chain_refs[0];
            if (candidate.capability_atom_refs.some((atomId) => {
              const atom = capabilityAtomsById.get(atomId);
              return atom.business_chain_refs.length !== 1 || atom.business_chain_refs[0] !== primaryChainId;
            })) {
              return "Level 1 候选的能力原子必须属于同一条主要业务链。";
            }
          }
          candidateIds.add(candidate.id);
        }
        const recommendations = question.recommended_candidate_ids;
        if (!Array.isArray(recommendations) || recommendations.length !== 1 || recommendations.some((id) => !candidateIds.has(id))) {
          return "Outline 探索推荐项必须且只能引用当前问题中的一个候选。";
        }
        const operations = question.free_input?.allowed_operations;
        const expectedOperations = new Set(["confirm_candidate", "add", "replace", "exclude", "context_note"]);
        if (question.allow_none_of_the_above !== true || question.free_input?.enabled !== true || !Array.isArray(operations) ||
            operations.length !== expectedOperations.size || new Set(operations).size !== expectedOperations.size ||
            operations.some((operation) => !expectedOperations.has(operation))) {
          return "Outline 探索必须启用以上都不符合和全部五种 Discovery 操作。";
        }
      }
    }
    const questionedNodeIds = new Set(data.question_groups.flatMap((group) => group.questions.map((question) => question.outline_node_id)));
    const questionedBranchMapIds = new Set(data.outline_nodes.flatMap((node) => {
      if (!questionedNodeIds.has(node.node_id)) return [];
      if (topology.mapsById.get(node.map_id)?.map_kind === "branch") return [node.map_id];
      if (node.node_kind === "map_link" && topology.mapsById.get(node.child_map_id)?.map_kind === "branch") return [node.child_map_id];
      return [];
    }));
    for (const node of data.outline_nodes) {
      const map = topology.mapsById.get(node.map_id);
      const childKind = topology.mapsById.get(node.child_map_id)?.map_kind;
      const isBusinessNode = map?.map_kind === "branch" ||
        (map?.map_kind === "overview" && node.node_kind !== "root" && childKind !== "global_constraints");
      const coveredByEntryQuestion = (map?.map_kind === "branch" && questionedBranchMapIds.has(map.map_id)) ||
        (node.node_kind === "map_link" && questionedBranchMapIds.has(node.child_map_id));
      if (node.source_status === "ai-proposed" && isBusinessNode && !questionedNodeIds.has(node.node_id) && !coveredByEntryQuestion) {
        return "AI 建议的业务节点必须由自身问题或所属分图入口问题承载审核。";
      }
    }
    return "";
  }
  if (data.review_type === "outline") {
    if (data.schema_version !== 2) return "outline review data 必须使用 schema_version 2。";
    if (!runtimeIsSafeRepoPath(data.outline_source_path)) return "outline_source_path 必须是安全的仓库相对路径。";
    if (!/^(?:sha256:)?[0-9a-f]{64}$/i.test(String(data.outline_digest || ""))) {
      return "outline_digest 必须是 64 位 SHA-256，可带 sha256: 前缀。";
    }
    if (!Array.isArray(data.source_authority_ids) || data.source_authority_ids.length === 0) {
      return "source_authority_ids 必须是非空数组。";
    }
    const boundaryError = validateBoundaryAdjustmentRuntime(data);
    if (boundaryError) return boundaryError;
  }
  return "";
}

function runtimeIsSafeRepoPath(value) {
  const path = String(value || "").trim().replace(/\\/g, "/");
  return Boolean(path) &&
    !path.startsWith("/") &&
    !/^[A-Za-z]:\//.test(path) &&
    !path.includes("//") &&
    path.split("/").every((segment) => segment && segment !== "." && segment !== "..");
}

const runtimeVagueActionExits = new Set([
  "通过",
  "暂缓",
  "退回",
  "阻塞",
  "拒绝",
  "待定",
  "approve",
  "approved",
  "pass",
  "hold",
  "defer",
  "reject",
  "return",
  "block",
  "blocked",
  "pending",
  "rejected"
]);

function runtimeHasSubstantialText(value) {
  return typeof value === "string" && value.replace(/\s+/g, "").length >= 18;
}

function runtimeIsVagueActionExit(value) {
  return runtimeVagueActionExits.has(String(value || "").trim().toLowerCase());
}

function runtimeCompactText(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function runtimeIsLegacyApplicabilityBenefit(value) {
  const text = String(value || "").trim();
  const compact = runtimeCompactText(text);
  return (
    compact.startsWith("适合") ||
    compact.startsWith("适用于") ||
    compact.startsWith("适用在") ||
    compact.startsWith("用于判断什么情况") ||
    /^when\s+to\s+choose\b/i.test(text) ||
    /^choose\s+this\s+when\b/i.test(text)
  );
}

const runtimeVagueUiContextPatterns = [
  /^(本|该|此)?(页面|界面|屏幕)?(主要)?(用于|用来)?(展示|查看|呈现|管理|处理)(相关|业务|系统|页面)?(信息|数据|内容|功能|详情|列表)[。.!！]?$/i,
  /^(帮助|方便)(用户|相关人员)?(查看|了解|管理|处理|完成)(相关|业务)?(信息|数据|内容|任务)[。.!！]?$/i,
  /^(本|该|此)?(页面|界面|屏幕|屏|screen)(主要)?(用于|用来)?(展示|查看|呈现|包含|列出|提供).+$/i,
  /^(布局[:：]?)?(列表加详情|列表详情|顶部加侧栏|表单|看板|仪表盘|详情页|设置页|向导|弹窗|自定义界面)[。.!！]?$/i
];

const runtimeGenericUiRolePattern = /^(用户|业务用户|相关人员|工作人员|管理员|操作员|user|users)$/i;

function runtimeIsVagueUiContextCopy(value) {
  const text = runtimeCompactText(value);
  return runtimeVagueUiContextPatterns.some((pattern) => pattern.test(text));
}

function runtimeValidateReviewData(data) {
  const result = { warnings: [], errors: [] };
  const key = itemCollectionKey(data);
  const nodeIds = new Set();
  const componentIds = new Set();
  let actionableCount = 0;
  let criticalCount = 0;
  const allowedPriorities = new Set(["critical", "important", "normal"]);
  const outlineViewTypes = new Set(["intent_map", "scope_slice", "readiness_authority"]);
  const outlineViewCounts = new Map(Array.from(outlineViewTypes, (type) => [type, 0]));
  const forbiddenOutlineKeys = new Set([
    "screens", "screen_regions", "components", "flow_steps", "edges", "api_endpoints",
    "database_models", "implementation_tasks", "solution_design"
  ]);

  if (!Array.isArray(data.modules) || data.modules.length === 0) {
    result.errors.push("review data 必须至少包含一个 module。");
  }

  if (data.review_type === "outline") {
    const artifactPath = String(data.artifact_path || "").replace(/\\/g, "/");
    const outlineSourcePath = String(data.outline_source_path || "").replace(/\\/g, "/");
    if (!runtimeIsSafeRepoPath(data.artifact_path) || !/^specs\/[^/]+\/prd\/review\/outline-review-data\.json$/.test(artifactPath)) {
      result.errors.push("outline artifact_path 必须是 specs/<feature>/prd/review/outline-review-data.json 形式的安全仓库相对路径。");
    }
    if (!runtimeIsSafeRepoPath(data.outline_source_path) || !/^specs\/[^/]+\/spec-outline\.md$/.test(outlineSourcePath)) {
      result.errors.push("outline_source_path 必须是 specs/<feature>/spec-outline.md 形式的安全仓库相对路径。");
    }
    const authorityIds = data.source_authority_ids || [];
    if (authorityIds.some((value) => !runtimeCompactText(value)) || new Set(authorityIds).size !== authorityIds.length) {
      result.errors.push("source_authority_ids 必须只包含唯一的非空 ID。");
    }
    const forbidden = runtimeFindForbiddenOutlineKey(data, forbiddenOutlineKeys);
    if (forbidden) result.errors.push(`outline downstream design detail is forbidden: ${forbidden}。`);
  }

  for (const module of data.modules || []) {
    for (const item of module[key] || []) {
      const itemLabel = `${module.title || module.id || "未命名模块"} / ${item.title || item.id || "未命名视图"}`;
      if (data.review_type === "outline") {
        if (!outlineViewTypes.has(item.view_type)) {
          result.errors.push(`${itemLabel} 的 view_type 无效。`);
        } else {
          outlineViewCounts.set(item.view_type, outlineViewCounts.get(item.view_type) + 1);
        }
      }
      if (data.review_type === "ui") {
        for (const key of ["business_context", "user_goal", "user_outcome"]) {
          if (!runtimeHasSubstantialText(item[key])) {
            result.errors.push(`${itemLabel} 缺少 ${key}，每个 Screen 必须说明业务背景、用户任务和完成结果。`);
          } else if (runtimeIsVagueUiContextCopy(item[key])) {
            result.errors.push(`${itemLabel} 的 ${key} 只有布局或通用展示话术，没有具体业务含义。`);
          }
        }
        if (!Array.isArray(item.primary_users) || item.primary_users.length === 0 || item.primary_users.some((value) => !runtimeCompactText(value))) {
          result.errors.push(`${itemLabel} 缺少 primary_users，必须说明哪些业务角色实际使用这个界面。`);
        } else if (item.primary_users.some((value) => runtimeGenericUiRolePattern.test(runtimeCompactText(value)))) {
          result.errors.push(`${itemLabel} 的 primary_users 只有“用户/管理员”等泛称，必须写具体业务角色。`);
        }
        if (!Array.isArray(item.entry_scenarios) || item.entry_scenarios.length === 0) {
          result.errors.push(`${itemLabel} 缺少 entry_scenarios，必须说明用户在什么业务时刻进入。`);
        } else {
          item.entry_scenarios.forEach((scenario, index) => {
            if (runtimeCompactText(scenario).length < 8 || runtimeIsVagueUiContextCopy(scenario)) {
              result.errors.push(`${itemLabel} 的 entry_scenarios[${index}] 没有写清具体触发条件或业务场景。`);
            }
          });
        }
        if (!Array.isArray(item.flow_refs) || item.flow_refs.length === 0 || item.flow_refs.some((value) => !runtimeCompactText(value))) {
          result.errors.push(`${itemLabel} 缺少 flow_refs。Flow 只能作为业务事实依据，不能替代 screen_regions 或 components。`);
        }
        if (!item.screen_layout) {
          result.errors.push(`${itemLabel} 缺少 screen_layout，UI 确认数据必须说明屏幕布局。`);
        }
        if (!Array.isArray(item.screen_regions) || item.screen_regions.length === 0) {
          result.errors.push(`${itemLabel} 缺少 screen_regions，UI review data requires screen_regions; UI review data must describe UI screen regions/components; optional states may add screen-state notes, but review nodes alone are not enough。`);
        }
        for (const region of item.screen_regions || []) {
          if (!runtimeCompactText(region.source_ref)) {
            result.errors.push(`${itemLabel} / ${region.title || region.id || "未命名区域"} 缺少 source_ref，无法核对区域内容来源。`);
          }
          if (!Array.isArray(region.components) || region.components.length === 0) {
            result.errors.push(`${itemLabel} / ${region.title || region.id || "未命名区域"} 缺少 components，无法展示界面元素。`);
          }
          for (const component of region.components || []) {
            if (!component.id) {
              result.errors.push(`${itemLabel} 有 UI 组件缺少 id，无法和确认点稳定关联。`);
              continue;
            }
            if (componentIds.has(component.id)) {
              result.errors.push(`duplicate component id: ${component.id}。重复组件 id 会导致 UI 预览选中态串到其他元素。`);
            }
            componentIds.add(component.id);
            for (const key of ["label", "purpose", "source_ref"]) {
              if (!runtimeCompactText(component[key])) {
                result.errors.push(`${itemLabel} / ${component.id} 缺少 ${key}，无法准确展示界面内容。`);
              }
            }
            const display = component.display;
            if (display && typeof display === "object" && !Array.isArray(display)) {
              if (display.options !== undefined && !["select", "filter"].includes(component.kind)) {
                result.errors.push(`${itemLabel} / ${component.id} 只有 select 或 filter 可以提供 display.options。`);
              }
              if ((display.columns !== undefined || display.rows !== undefined) && component.kind !== "table") {
                result.errors.push(`${itemLabel} / ${component.id} 只有 table 可以提供 display.columns 或 display.rows。`);
              }
              if (display.rows !== undefined && !Array.isArray(display.columns)) {
                result.errors.push(`${itemLabel} / ${component.id} 的 display.rows 必须同时提供 display.columns。`);
              }
              for (const [rowIndex, row] of (display.rows || []).entries()) {
                if (!Array.isArray(row) || row.length !== (display.columns || []).length) {
                  result.errors.push(`${itemLabel} / ${component.id} 的 display.rows[${rowIndex}] 单元格数量与 display.columns 不一致。`);
                }
              }
            }
          }
        }
      }
      const localNodeIds = new Set();
      for (const node of item.nodes || []) {
        if (!node.id) {
          result.errors.push(`${itemLabel} 有节点缺少 id，无法保存对应确认状态。`);
          continue;
        }
        if (localNodeIds.has(node.id) || nodeIds.has(node.id)) {
          result.errors.push(`节点 id 重复：${node.id}。重复 node id 会导致本地选择串到其他确认点。`);
        }
        localNodeIds.add(node.id);
        nodeIds.add(node.id);
        const actionable = requiresNodeDecision(node);
        if (data.schema_version === 2) {
          if (actionable) {
            actionableCount += 1;
            if (!allowedPriorities.has(node.confirmation_priority)) {
              result.errors.push(`${node.label || node.id} 缺少有效 confirmation_priority；可选值为 critical、important、normal。`);
            }
            if (node.confirmation_priority === "critical") {
              criticalCount += 1;
              if (!runtimeHasSubstantialText(node.critical_basis)) {
                result.errors.push(`${node.label || node.id} 的 critical_basis 不充分，必须说明严重影响且不存在安全默认值或可撤销路径。`);
              }
              if (!runtimeHasSubstantialText(node.priority_reason)) {
                result.errors.push(`${node.label || node.id} 的 priority_reason 不充分，必须说明为什么需要负责人逐项确认。`);
              }
            }
          } else if (node.confirmation_priority !== undefined || node.priority_reason !== undefined || node.critical_basis !== undefined) {
            result.errors.push(`${node.label || node.id} 是信息节点，必须省略 confirmation_priority、priority_reason 和 critical_basis。`);
          }
        }
        if (actionable) {
          if (!runtimeHasSubstantialText(node.decision_background)) {
            result.warnings.push(`${node.label || node.id} 缺少 decision_background，右侧栏需要用“背景信息”说明这个判断为什么存在。`);
          }
          if (!runtimeHasSubstantialText(node.decision_summary)) {
            result.warnings.push(`${node.label || node.id} 缺少 decision_summary，右侧栏需要用“决策摘要”说明现在要拍什么板。`);
          }
          const options = node.options || [];
          if (options.length < 2 || options.length > 4) {
            result.warnings.push(`${node.label || node.id} 的选项数量不是 2-4 个。`);
          }
          if (data.review_type === "ui" && node.review_level === "must_confirm" && (options.length < 3 || options.length > 4)) {
            result.warnings.push(`${node.label || node.id} 是必须确认节点，应提供 3-4 个可执行选项。`);
          }
          if (options.length === 2 && !runtimeHasSubstantialText(node.options_count_rationale)) {
            const message = `${node.label || node.id} 只有 2 个选项，需要用 options_count_rationale 说明为什么二元选择足够。`;
            if (data.review_type === "outline") result.errors.push(message);
            else if (data.review_type === "flow" || node.review_level !== "must_confirm") result.warnings.push(message);
          }
          const optionIds = new Set(options.map((option) => option.id));
          for (const option of options) {
            for (const field of ["benefit", "cost", "consequence", "next_exit"]) {
              if (!String(option?.[field] || "").trim()) {
                result.warnings.push(`${node.label || node.id} 的 ${option?.id || "选项"} 缺少 ${field}。`);
              }
            }
            for (const legacyField of ["when_to_choose", "project_impact"]) {
              if (Object.prototype.hasOwnProperty.call(option || {}, legacyField)) {
                result.warnings.push(
                  `${node.label || node.id} 的 ${option?.id || "选项"} 包含 legacy option field ${legacyField}。这是旧字段，只兼容读取；新数据请改用 benefit/cost/recommendation_reason。`
                );
              }
            }
            if (option?.id === node.recommended_option && !runtimeHasSubstantialText(option?.recommendation_reason)) {
              result.warnings.push(`${node.label || node.id} 的推荐选项缺少 recommendation_reason，无法展示“推荐理由”。`);
            }
            if (runtimeIsVagueActionExit(option?.label) || runtimeIsVagueActionExit(option?.next_exit)) {
              result.warnings.push(`${node.label || node.id} 的 ${option?.id || "选项"} 需要写成可执行出口，不能只写通过、暂缓、退回或阻塞。`);
            }
            if (runtimeIsLegacyApplicabilityBenefit(option?.benefit)) {
              result.warnings.push(`${node.label || node.id} 的 ${option?.id || "选项"} 把 benefit 写成了“适合什么情况”；请改成这个选择带来的收益。`);
            }
          }
          if (!node.recommended_option || !optionIds.has(node.recommended_option)) {
            result.warnings.push(`${node.label || node.id} 缺少可用推荐选项。`);
          }
        }
      }
    }
  }

  if (data.schema_version === 2) {
    const criticalCap = actionableCount === 0 ? 0 : Math.min(3, Math.max(1, Math.ceil(actionableCount / 10)));
    if (criticalCount > criticalCap) {
      result.errors.push(`critical 数量 ${criticalCount} 超过上限 ${criticalCap}（可确认节点 ${actionableCount} 个）；请先排序并将超额项降级为 important。`);
    }
  }

  if (data.review_type === "outline") {
    for (const type of outlineViewTypes) {
      if (outlineViewCounts.get(type) !== 1) {
        result.errors.push(`Outline view_type ${type} 必须全局 exactly once，当前 ${outlineViewCounts.get(type)} 个。`);
      }
    }
    const readinessAuthorityIds = new Set();
    for (const module of data.modules || []) {
      for (const view of module.views || []) {
        if (view.view_type !== "readiness_authority") continue;
        for (const authority of view.source_authorities || []) {
          if (runtimeCompactText(authority?.id)) readinessAuthorityIds.add(authority.id);
        }
      }
    }
    const declaredAuthorityIds = new Set(data.source_authority_ids || []);
    const metadataOnly = [...declaredAuthorityIds].filter((id) => !readinessAuthorityIds.has(id));
    const viewOnly = [...readinessAuthorityIds].filter((id) => !declaredAuthorityIds.has(id));
    if (metadataOnly.length || viewOnly.length) {
      result.errors.push(`source_authority_ids 必须 exactly match readiness_authority source_authorities（仅元数据：${metadataOnly.join(", ") || "无"}；仅视图：${viewOnly.join(", ") || "无"}）。`);
    }
  }

  const storageWarning = storageStatusWarning();
  if (storageWarning) {
    result.warnings.push(storageWarning);
  }
  return result;
}

function runtimeFindForbiddenOutlineKey(value, forbiddenKeys) {
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = runtimeFindForbiddenOutlineKey(entry, forbiddenKeys);
      if (found) return found;
    }
    return "";
  }
  for (const [key, entry] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) return key;
    const found = runtimeFindForbiddenOutlineKey(entry, forbiddenKeys);
    if (found) return found;
  }
  return "";
}

function rejectReviewData(messages) {
  reviewData = null;
  state = {};
  $("page-title").textContent = "SpecCompass Review";
  $("project-overview").textContent = "review data 无法用于确认。";
  $("data-warnings").classList.remove("hidden");
  $("data-warnings").textContent = `阻断问题：${messages.join("；")}`;
  $("module-list").replaceChildren();
  $("module-title").textContent = "review data 结构存在阻断问题";
  $("module-summary").textContent = "请先运行 validate-review-data.mjs 并修复数据，再打开确认页。";
  $("item-title").textContent = "无法开始确认";
  $("item-summary").textContent = "本页面不会加载可能导致本地状态串用的数据。";
  $("item-tabs").replaceChildren();
  $("diagram-view").replaceChildren(create("p", "error", messages.join("；")));
  $("node-list").replaceChildren();
  $("rail-summary").textContent = "请先修复 review data。";
  setStatus("review data 结构存在阻断问题，请先修复。", true);
  return false;
}

function acceptReviewData(data) {
  const validationError = validateReviewData(data);
  if (validationError) {
    reviewData = null;
    state = {};
    $("page-title").textContent = "SpecCompass Review";
    $("project-overview").textContent = "review data 无法加载。";
    $("module-list").replaceChildren();
    $("module-title").textContent = "模块";
    $("module-summary").textContent = validationError;
    $("item-title").textContent = "流程、界面或纲要视图";
    $("item-summary").textContent = "请先用 validate-review-data.mjs 修复数据，再打开确认页。";
    $("item-tabs").replaceChildren();
    $("diagram-view").replaceChildren(create("p", "error", validationError));
    $("node-list").replaceChildren();
    setStatus(validationError, true);
    return false;
  }
  if (data.review_type === "outline_discovery") {
    reviewData = data;
    selectedModuleIndex = 0;
    selectedItemIndex = 0;
    selectedNodeId = null;
    selectedUiComponentId = null;
    selectedUiLayoutId = null;
    runtimeWarnings = [];
    runtimeErrors = [];
    renderOutlineDiscovery(data);
    return true;
  }
  if (typeof leaveOutlineDiscoveryMode === "function") leaveOutlineDiscoveryMode();
  reviewData = data;
  selectedModuleIndex = 0;
  selectedItemIndex = 0;
  selectedNodeId = null;
  selectedUiComponentId = null;
  selectedUiLayoutId = null;
  reviewMode = "confirm";
  copyDraftWarningArmed = false;
  downloadDraftWarningArmed = false;
  resetExportButtonLabels();
  const runtimeValidation = runtimeValidateReviewData(data);
  runtimeWarnings = runtimeValidation.warnings;
  runtimeErrors = runtimeValidation.errors;
  if (runtimeErrors.length) {
    return rejectReviewData(runtimeErrors);
  }
  loadState();
  render();
  return true;
}
