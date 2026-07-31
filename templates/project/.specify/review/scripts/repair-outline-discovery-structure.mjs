#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [sourceArgument, ...flags] = process.argv.slice(2);
if (!sourceArgument || flags.some((flag) => !["--write", "--level-one"].includes(flag))) {
  console.error("Usage: node .specify/review/scripts/repair-outline-discovery-structure.mjs <outline-discovery-data.json> [--level-one] [--write]");
  process.exit(2);
}

const sourcePath = path.resolve(sourceArgument);
const write = flags.includes("--write");
const forceLevelOne = flags.includes("--level-one");
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
if (data?.review_type !== "outline_discovery" || data?.schema_version !== 3) {
  throw new Error("repair requires schema_version 3 outline_discovery data");
}

const asArray = (value) => Array.isArray(value) ? value : [];
const mapsById = new Map(asArray(data.maps).map((map) => [map.map_id, map]));
const nodesById = new Map(asArray(data.outline_nodes).map((node) => [node.node_id, node]));
const overview = asArray(data.maps).find((map) => map.map_kind === "overview");
const constraints = asArray(data.maps).find((map) => map.map_kind === "global_constraints");
if (!overview || !constraints) throw new Error("repair requires one overview and one global_constraints map");

const mapRoot = (map) => nodesById.get(map?.root_node_id);
const incomingMapLinks = new Map();
for (const node of asArray(data.outline_nodes)) {
  if (node.node_kind !== "map_link" || !node.child_map_id) continue;
  const incoming = incomingMapLinks.get(node.child_map_id) || [];
  incoming.push(node);
  incomingMapLinks.set(node.child_map_id, incoming);
}
const isPureGroupingMap = (map) => {
  const incomingOwnsAtom = asArray(incomingMapLinks.get(map?.map_id))
    .some((node) => asArray(node.capability_atom_refs).length);
  if (map?.map_kind !== "branch" || asArray(mapRoot(map)?.capability_atom_refs).length || incomingOwnsAtom) return false;
  const children = asArray(data.outline_nodes).filter((node) => node.map_id === map.map_id && node.parent_node_id === map.root_node_id);
  return children.length > 0 && children.every((node) => node.node_kind === "map_link");
};
const candidateMaps = asArray(data.maps).filter((map) => {
  if (map.map_kind !== "branch") return false;
  const rootAtoms = asArray(mapRoot(map)?.capability_atom_refs);
  const incoming = asArray(incomingMapLinks.get(map.map_id));
  const linkAtoms = incoming.flatMap((node) => asArray(node.capability_atom_refs));
  const parentMaps = incoming.map((node) => mapsById.get(node.map_id));
  const isLevelOnePosition = parentMaps.some((parent) => parent?.map_kind === "overview" || isPureGroupingMap(parent));
  return isLevelOnePosition && (rootAtoms.length || linkAtoms.length);
});
if (!candidateMaps.length) throw new Error("repair found no atom-backed Level 1 branch below the Overview or a pure grouping map");

const candidateMapIds = new Set(candidateMaps.map((map) => map.map_id));
const candidateLinks = new Map();
for (const node of asArray(data.outline_nodes)) {
  if (node.node_kind === "map_link" && candidateMapIds.has(node.child_map_id)) {
    if (candidateLinks.has(node.child_map_id)) throw new Error(`candidate map is linked more than once: ${node.child_map_id}`);
    candidateLinks.set(node.child_map_id, node);
  }
}
for (const map of candidateMaps) {
  const link = candidateLinks.get(map.map_id);
  const root = mapRoot(map);
  if (!link) throw new Error(`candidate map has no map_link: ${map.map_id}`);
  link.map_id = overview.map_id;
  link.parent_node_id = overview.root_node_id;
  link.business_chain_refs = asArray(link.business_chain_refs).length ? link.business_chain_refs : asArray(root.business_chain_refs);
  link.capability_atom_refs = asArray(link.capability_atom_refs).length ? link.capability_atom_refs : asArray(root.capability_atom_refs);
  map.parent_map_id = overview.map_id;
}

for (const link of candidateLinks.values()) {
  const childMap = mapsById.get(link.child_map_id);
  for (const node of data.outline_nodes) {
    if (node.parent_node_id !== link.node_id) continue;
    node.map_id = childMap.map_id;
    node.parent_node_id = childMap.root_node_id;
  }
}

const removableGroupingMaps = new Set(asArray(data.maps)
  .filter((map) => map.map_kind === "branch" && !candidateMapIds.has(map.map_id))
  .filter((map) => {
    const root = mapRoot(map);
    const children = asArray(data.outline_nodes).filter((node) => node.map_id === map.map_id && node.parent_node_id === map.root_node_id);
    return !asArray(root?.capability_atom_refs).length && children.every((node) => node.node_kind === "map_link");
  })
  .map((map) => map.map_id));
const removableNodeIds = new Set(asArray(data.outline_nodes)
  .filter((node) => removableGroupingMaps.has(node.map_id) || removableGroupingMaps.has(node.child_map_id))
  .map((node) => node.node_id));
const protectedRemovedRefs = [
  ...asArray(data.question_groups).flatMap((group) => asArray(group.questions).map((question) => question.outline_node_id)),
  ...asArray(data.outline_nodes).flatMap((node) => asArray(node.affected_node_ids)),
].filter((nodeId) => removableNodeIds.has(nodeId));
if (protectedRemovedRefs.length) {
  throw new Error(`repair refuses to remove grouping nodes referenced by questions or constraints: ${[...new Set(protectedRemovedRefs)].join(", ")}`);
}
data.maps = asArray(data.maps).filter((map) => !removableGroupingMaps.has(map.map_id));
data.outline_nodes = asArray(data.outline_nodes).filter((node) => !removableNodeIds.has(node.node_id));

const refreshedNodesById = new Map(data.outline_nodes.map((node) => [node.node_id, node]));

const atomsById = new Map(asArray(data.business_context?.capability_atoms).map((entry) => [entry.atom_id, entry]));
const chainsById = new Map(asArray(data.business_context?.business_chains).map((entry) => [entry.chain_id, entry]));
const operationsById = new Map(asArray(data.business_context?.operations).map((entry) => [entry.operation_id, entry]));
const outcomesById = new Map(asArray(data.business_context?.outcomes).map((entry) => [entry.outcome_id, entry]));
const usedNodeIds = new Set(data.outline_nodes.map((node) => node.node_id));
const uniqueNodeId = (base) => {
  let candidate = base;
  let suffix = 2;
  while (usedNodeIds.has(candidate)) candidate = `${base}-${suffix++}`;
  usedNodeIds.add(candidate);
  return candidate;
};
const markdownHeadingSlug = (heading) => String(heading || "")
  .trim()
  .toLowerCase()
  .replace(/[`*_~]/g, "")
  .replace(/[^\p{L}\p{N}\s-]/gu, "")
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");
const addFact = (map, root, suffix, kind, label, summary, source, chainId, atomId = null) => {
  const node = {
    node_id: uniqueNodeId(`${root.node_id}-fact-${suffix}`),
    parent_node_id: root.node_id,
    map_id: map.map_id,
    node_kind: kind,
    label,
    summary,
    source_status: source?.source_status || root.source_status,
    source_refs: asArray(source?.source_refs).length ? source.source_refs : root.source_refs,
    business_chain_refs: [chainId],
  };
  if (atomId) node.capability_atom_refs = [atomId];
  data.outline_nodes.push(node);
};

for (const map of candidateMaps) {
  const root = refreshedNodesById.get(map.root_node_id);
  const link = candidateLinks.get(map.map_id);
  const atomId = asArray(root.capability_atom_refs)[0] || asArray(link?.capability_atom_refs)[0];
  const atom = atomsById.get(atomId);
  const chainId = asArray(atom?.business_chain_refs)[0] || asArray(root.business_chain_refs)[0] || asArray(link?.business_chain_refs)[0];
  const chain = chainsById.get(chainId);
  if (!atom || !chain) throw new Error(`candidate branch lacks atom/chain semantics: ${map.map_id}`);
  const existingFacts = data.outline_nodes.filter((node) => node.map_id === map.map_id && node.parent_node_id === root.node_id && node.node_kind !== "map_link");
  const representedKinds = new Set(existingFacts.map((node) => node.node_kind));
  if (!representedKinds.has("scenario")) {
    addFact(map, root, "trigger", "scenario", chain.trigger_or_input, `Trigger/input: ${chain.trigger_or_input}`, chain, chainId, atomId);
  }
  if (!representedKinds.has("scope")) {
    addFact(map, root, "state", "scope", chain.owned_state, `Owned state: ${chain.owned_state}`, chain, chainId, atomId);
  }
  const existingCapabilities = existingFacts.filter((node) => node.node_kind === "capability");
  let remainingOperationFacts = Math.max(0, asArray(chain.operation_refs).length - existingCapabilities.length);
  for (const operationId of asArray(chain.operation_refs)) {
    const operation = operationsById.get(operationId);
    if (!operation || existingFacts.some((node) => node.label === operation.label) || remainingOperationFacts === 0) continue;
    addFact(map, root, `operation-${operationId}`, "capability", operation.label, operation.summary, operation, chainId, atomId);
    remainingOperationFacts -= 1;
  }
  const outcome = outcomesById.get(chain.primary_outcome_ref);
  if (outcome && !existingFacts.some((node) => node.node_kind === "acceptance" || node.label === outcome.label)) {
    addFact(map, root, "outcome", "acceptance", outcome.label, outcome.summary, outcome, chainId, atomId);
  }
  if (!existingFacts.some((node) => node.label === chain.downstream_handoff)) {
    addFact(map, root, "handoff", "scope", chain.downstream_handoff, `Downstream handoff: ${chain.downstream_handoff}`, chain, chainId, atomId);
  }
}

if (forceLevelOne) data.outline_maturity = "explore";

const artifactPath = String(data.artifact_path || "").replace(/\\/g, "/");
const normalizedSourcePath = sourcePath.replace(/\\/g, "/");
const projectRoot = normalizedSourcePath.endsWith(`/${artifactPath}`)
  ? normalizedSourcePath.slice(0, -(artifactPath.length + 1))
  : null;
if (projectRoot) {
  let serialized = JSON.stringify(data);
  const markdownSections = new Map();
  for (const snapshot of asArray(data.source_snapshot)) {
    const markdownPath = path.join(projectRoot, snapshot.path);
    if (!fs.existsSync(markdownPath) || !/\.md$/i.test(markdownPath)) continue;
    const markdown = fs.readFileSync(markdownPath, "utf8");
    const headingMatches = [...markdown.matchAll(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm)];
    const headings = headingMatches.map((match) => match[2].trim());
    const usedAnchors = new Set([...serialized.matchAll(new RegExp(`${snapshot.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}#([^\"\\]]+)`, "g"))].map((match) => match[1]));
    const replacements = new Map();
    for (const anchor of usedAnchors) {
      if (headings.includes(anchor)) continue;
      const candidates = headings.filter((heading) =>
        heading.startsWith(anchor) ||
        markdownHeadingSlug(heading) === String(anchor).toLowerCase() ||
        (anchor === "Capability Map" && /Capability (?:Map|Candidates)/i.test(heading))
      );
      if (candidates.length !== 1) throw new Error(`cannot resolve Markdown anchor ${snapshot.path}#${anchor}`);
      replacements.set(anchor, candidates[0]);
    }
    const replaceRefs = (value) => {
      if (Array.isArray(value)) return value.map(replaceRefs);
      if (value && typeof value === "object") {
        for (const [key, entry] of Object.entries(value)) value[key] = replaceRefs(entry);
        return value;
      }
      if (typeof value !== "string") return value;
      for (const [before, after] of replacements) {
        if (value === `${snapshot.path}#${before}`) return `${snapshot.path}#${after}`;
      }
      return value;
    };
    replaceRefs(data);
    serialized = JSON.stringify(data);
    const validDeclaredAnchors = asArray(snapshot.anchors).filter((anchor) => headings.includes(anchor));
    snapshot.anchors = [...new Set([
      ...validDeclaredAnchors,
      ...[...usedAnchors].map((anchor) => replacements.get(anchor) || anchor),
    ])];
    const sections = new Map();
    for (const [index, match] of headingMatches.entries()) {
      const level = match[1].length;
      const next = headingMatches.slice(index + 1).find((candidate) => candidate[1].length <= level);
      sections.set(match[2].trim(), markdown.slice(match.index + match[0].length, next?.index ?? markdown.length));
    }
    markdownSections.set(String(snapshot.path).replace(/\\/g, "/"), sections);
  }

  const currentPrd = asArray(data.source_snapshot).find((snapshot) =>
    snapshot.source_type === "current_prd" && markdownSections.get(String(snapshot.path).replace(/\\/g, "/"))?.has("Strategic Goal")
  );
  if (currentPrd) {
    const strategicGoalRef = `${String(currentPrd.path).replace(/\\/g, "/")}#Strategic Goal`;
    if (data.business_context?.product_subject) data.business_context.product_subject.source_refs = [strategicGoalRef];
    const overviewRoot = data.outline_nodes.find((node) => node.node_id === overview.root_node_id);
    if (overviewRoot) overviewRoot.source_refs = [strategicGoalRef];
  }
  const governanceRefs = [...new Set(asArray(data.constitution_snapshot?.clauses)
    .map((clause) => clause.source_anchor)
    .filter((ref) => typeof ref === "string" && ref.includes("#")))];
  if (governanceRefs.length) {
    for (const node of data.outline_nodes) {
      const map = mapsById.get(node.map_id);
      const childMap = mapsById.get(node.child_map_id);
      if (map?.map_kind === "global_constraints" || childMap?.map_kind === "global_constraints") {
        const clauseRefs = asArray(node.constitution_clause_refs)
          .map((id) => asArray(data.constitution_snapshot?.clauses).find((clause) => clause.clause_id === id)?.source_anchor)
          .filter(Boolean);
        node.source_refs = clauseRefs.length ? clauseRefs : governanceRefs;
      }
    }
  }

  const refContainsAiProposal = (ref) => {
    const normalized = String(ref || "").replace(/\\/g, "/");
    const hash = normalized.indexOf("#");
    if (hash === -1) return false;
    const section = markdownSections.get(normalized.slice(0, hash))?.get(normalized.slice(hash + 1));
    return /\[src:ai-proposed\]/i.test(section || "");
  };
  const downgradeEntry = (entry) => {
    if (!entry || typeof entry !== "object" || !entry.source_status || entry.source_status === "unresolved") return;
    if (asArray(entry.source_refs).some(refContainsAiProposal)) entry.source_status = "ai-proposed";
  };
  downgradeEntry(data.business_context?.product_subject);
  for (const value of Object.values(data.business_context || {})) {
    if (Array.isArray(value)) value.forEach(downgradeEntry);
  }
  const atomsAfterRepair = new Map(asArray(data.business_context?.capability_atoms).map((entry) => [entry.atom_id, entry]));
  const chainsAfterRepair = new Map(asArray(data.business_context?.business_chains).map((entry) => [entry.chain_id, entry]));
  for (const node of asArray(data.outline_nodes)) {
    const map = mapsById.get(node.map_id);
    if (map?.map_kind === "global_constraints" || (map?.map_kind === "overview" && node.node_kind === "root")) continue;
    const evidence = [
      ...asArray(node.capability_atom_refs).map((id) => atomsAfterRepair.get(id)?.source_status),
      ...asArray(node.business_chain_refs).map((id) => chainsAfterRepair.get(id)?.source_status),
    ];
    if (evidence.includes("unresolved")) node.source_status = "unresolved";
    else if (evidence.includes("ai-proposed")) node.source_status = "ai-proposed";
  }
}

const output = `${JSON.stringify(data, null, 2)}\n`;
if (write) {
  const original = fs.readFileSync(sourcePath, "utf8");
  const validatorPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "validate-review-data.mjs");
  if (!fs.existsSync(validatorPath)) throw new Error(`repair validator is missing: ${validatorPath}`);
  fs.writeFileSync(sourcePath, output);
  const validation = spawnSync(process.execPath, [validatorPath, sourcePath], { encoding: "utf8" });
  if (validation.status !== 0) {
    fs.writeFileSync(sourcePath, original);
    const detail = [validation.stdout, validation.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`repaired outline failed validation and the original file was restored${detail ? `:\n${detail}` : ""}`);
  }
  console.log(`repaired outline discovery structure: ${sourceArgument}`);
} else {
  process.stdout.write(output);
}
