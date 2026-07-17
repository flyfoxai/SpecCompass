#!/usr/bin/env node

import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";

const OPERATIONS = new Set(["confirm_candidate", "add", "replace", "exclude", "context_note"]);
const MATURITIES = new Set(["explore", "frame"]);
const SOURCE_TAGS = new Set(["user", "user-confirmed"]);
const OUTLINE_MAP_KINDS = new Set(["overview", "branch", "global_constraints"]);
const OUTLINE_NODE_KINDS = new Set([
  "root", "goal", "role", "domain", "scope", "problem", "scenario", "capability",
  "acceptance", "risk", "constraint", "map_link",
]);
const OUTLINE_SOURCE_STATUSES = new Set(["user", "user-confirmed", "doc", "ai-proposed", "unresolved"]);
const DENSITY_BUDGET = Object.freeze({
  max_visible_nodes_per_map: 18,
  max_depth: 3,
  max_children_per_node: 4,
  layer_balance_min_nodes: 8,
  max_layer_share: 0.6,
});
const SECTION_BY_TARGET_KIND = new Map([
  ["goal", "Strategic Goal"],
  ["user", "Target Users and Roles"],
  ["problem", "Problem Domains"],
  ["scope", "Scope and Non-Goals"],
  ["non_goal", "Scope and Non-Goals"],
  ["scenario", "Core Scenarios"],
  ["acceptance_seed", "Acceptance Seeds"],
  ["risk", "Risks and Open Questions"],
  ["context", "Risks and Open Questions"],
]);

function fail(message) {
  throw new Error(message);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!new Set(["--response", "--prd-temp", "--outline-temp"]).has(flag)) {
      fail(`unknown argument: ${flag}`);
    }
    if (result[flag]) fail(`argument occurs more than once: ${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`missing value for ${flag}`);
    result[flag] = value;
    index += 1;
  }
  for (const flag of ["--response", "--prd-temp", "--outline-temp"]) {
    if (!result[flag]) fail(`missing required argument ${flag}`);
  }
  return result;
}

function repositoryPath(root, value, label) {
  const normalized = String(value || "").replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.includes("//") ||
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    fail(`${label} must be a safe repository-relative path`);
  }
  const resolved = path.resolve(root, ...normalized.split("/"));
  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
    fail(`${label} escapes the project root`);
  }
  return { normalized, resolved };
}

async function readJson(filePath, label) {
  let content;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (error) {
    fail(`${label} cannot be read: ${error.message}`);
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

async function readText(filePath, label) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    fail(`${label} cannot be read: ${error.message}`);
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
}

function requireString(value, label) {
  if (!text(value)) fail(`${label} must be a non-empty string`);
}

function requireNullableString(value, label) {
  if (!(typeof value === "string" || value === null)) fail(`${label} must be string or null`);
}

function validateResponseEnvelope(response) {
  requireObject(response, "response");
  if (response.schema_version !== 2) fail("response schema_version must be 2");
  if (response.format !== "speccompass-outline-discovery-response") fail("response format is not an Outline discovery response");
  if (response.review_type !== "outline_discovery") fail("response review_type must be outline_discovery");
  for (const key of ["response_id", "batch_id", "feature", "source_review_data", "generated_at"]) {
    requireString(response[key], `response ${key}`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(response.feature)) fail("response feature is invalid");
  if (!MATURITIES.has(response.outline_maturity)) fail("response maturity must be explore or frame");
  if (response.authorization_effect !== "none" || response.next_route !== "/sp.prd") {
    fail("response must be non-authorizing and return to /sp.prd");
  }
  if (Number.isNaN(Date.parse(response.generated_at))) fail("response generated_at must be a date-time");
  if (!Array.isArray(response.deltas) || response.deltas.length === 0) fail("response deltas must not be empty");
}

function buildQuestionIndex(source, topology) {
  const questions = new Map();
  const groupIds = new Set();
  const groups = Array.isArray(source.question_groups) ? source.question_groups : [];
  if (groups.length === 0) fail("source question_groups must not be empty");
  for (const [groupIndex, group] of groups.entries()) {
    requireObject(group, `source question_group[${groupIndex}]`);
    for (const key of ["id", "title", "summary", "map_id"]) requireString(group[key], `source question_group[${groupIndex}] ${key}`);
    if (groupIds.has(group.id)) fail(`duplicate source question_group id: ${group.id}`);
    if (!topology.mapsById.has(group.map_id)) fail(`source question_group ${group.id} map_id is unknown`);
    groupIds.add(group.id);
    if (!Array.isArray(group.questions) || group.questions.length === 0) {
      fail(`source question_group ${group.id} questions must not be empty`);
    }
    for (const question of Array.isArray(group?.questions) ? group.questions : []) {
      requireString(question?.id, "source question_id");
      if (questions.has(question.id)) fail(`duplicate source question_id: ${question.id}`);
      requireString(question.target_kind, `source question ${question.id} target_kind`);
      requireString(question.outline_node_id, `source question ${question.id} outline_node_id`);
      const questionNode = topology.nodesById.get(question.outline_node_id);
      if (!questionNode || questionNode.map_id !== group.map_id) {
        fail(`source question ${question.id} outline_node_id must belong to its question group map`);
      }
      if (!SECTION_BY_TARGET_KIND.has(question.target_kind)) {
        fail(`source question ${question.id} target_kind is unsupported`);
      }
      for (const key of ["prompt", "context", "recommendation_reason"]) {
        requireString(question[key], `source question ${question.id} ${key}`);
      }
      if (question.selection_mode !== "single") fail(`source question ${question.id} selection_mode must be single`);
      if (question.allow_none_of_the_above !== true) {
        fail(`source question ${question.id} must allow none of the above`);
      }
      if (!Array.isArray(question.candidates) || question.candidates.length < 2 || question.candidates.length > 4) {
        fail(`source question ${question.id} must contain 2-4 candidates`);
      }
      const candidates = new Map();
      for (const candidate of question.candidates) {
        requireString(candidate?.id, `source question ${question.id} candidate_id`);
        for (const key of ["label", "value", "rationale"]) {
          requireString(candidate?.[key], `source candidate ${candidate.id} ${key}`);
        }
        if (candidates.has(candidate.id)) fail(`duplicate candidate_id on question ${question.id}: ${candidate.id}`);
        candidates.set(candidate.id, candidate);
      }
      if (
        !Array.isArray(question.recommended_candidate_ids) ||
        question.recommended_candidate_ids.length !== 1 ||
        !candidates.has(question.recommended_candidate_ids[0])
      ) {
        fail(`source question ${question.id} must recommend exactly one existing candidate`);
      }
      requireObject(question.free_input, `source question ${question.id} free_input`);
      requireString(question.free_input.label, `source question ${question.id} free_input label`);
      if (question.free_input.enabled !== true) fail(`source question ${question.id} free_input must be enabled`);
      const allowedOperations = question.free_input.allowed_operations;
      if (
        !Array.isArray(allowedOperations) ||
        allowedOperations.length !== OPERATIONS.size ||
        new Set(allowedOperations).size !== OPERATIONS.size ||
        allowedOperations.some((operation) => !OPERATIONS.has(operation))
      ) {
        fail(`source question ${question.id} allowed_operations must contain all five operations exactly once`);
      }
      questions.set(question.id, { ...question, map_id: group.map_id, candidatesById: candidates });
    }
  }
  if (questions.size === 0) fail("source must contain at least one question");
  return questions;
}

function validateSourceTopology(source) {
  requireObject(source.density_budget, "source density_budget");
  for (const [key, expected] of Object.entries(DENSITY_BUDGET)) {
    if (source.density_budget[key] !== expected) fail(`source density_budget.${key} must be ${expected}`);
  }
  if (!Array.isArray(source.maps) || source.maps.length < 3) fail("source maps must contain overview, branch, and global constraints");
  const mapsById = new Map();
  for (const [index, map] of source.maps.entries()) {
    requireObject(map, `source map[${index}]`);
    for (const key of ["map_id", "title", "summary", "map_kind", "root_node_id"]) requireString(map[key], `source map[${index}] ${key}`);
    requireNullableString(map.parent_map_id, `source map[${index}] parent_map_id`);
    if (mapsById.has(map.map_id)) fail(`duplicate source map_id: ${map.map_id}`);
    if (!OUTLINE_MAP_KINDS.has(map.map_kind)) fail(`source map ${map.map_id} map_kind is unsupported`);
    mapsById.set(map.map_id, map);
  }
  if (source.maps.filter((map) => map.map_kind === "overview").length !== 1) fail("source must contain exactly one overview map");
  if (source.maps.filter((map) => map.map_kind === "global_constraints").length !== 1) fail("source must contain exactly one global_constraints map");
  for (const map of source.maps) {
    if (map.map_kind === "overview" ? map.parent_map_id !== null : !mapsById.has(map.parent_map_id)) {
      fail(`source map ${map.map_id} parent_map_id is invalid`);
    }
  }
  for (const map of source.maps) {
    const visited = new Set([map.map_id]);
    let cursor = map;
    while (cursor.parent_map_id !== null) {
      cursor = mapsById.get(cursor.parent_map_id);
      if (!cursor) break;
      if (visited.has(cursor.map_id)) fail("source maps must not contain parent cycles");
      visited.add(cursor.map_id);
    }
  }

  if (!Array.isArray(source.outline_nodes) || !source.outline_nodes.length) fail("source outline_nodes must not be empty");
  const nodesById = new Map();
  const nodesByMap = new Map(source.maps.map((map) => [map.map_id, []]));
  for (const [index, node] of source.outline_nodes.entries()) {
    requireObject(node, `source outline_node[${index}]`);
    for (const key of ["node_id", "map_id", "node_kind", "label", "summary", "source_status"]) requireString(node[key], `source outline_node[${index}] ${key}`);
    requireNullableString(node.parent_node_id, `source outline_node[${index}] parent_node_id`);
    if (nodesById.has(node.node_id)) fail(`duplicate source node_id: ${node.node_id}`);
    if (!mapsById.has(node.map_id)) fail(`source node ${node.node_id} map_id is unknown`);
    if (!OUTLINE_NODE_KINDS.has(node.node_kind)) fail(`source node ${node.node_id} node_kind is unsupported`);
    if (!OUTLINE_SOURCE_STATUSES.has(node.source_status)) fail(`source node ${node.node_id} source_status is unsupported`);
    nodesById.set(node.node_id, node);
    nodesByMap.get(node.map_id).push(node);
  }
  const childrenByParent = new Map();
  for (const node of source.outline_nodes) {
    if (node.parent_node_id !== null) {
      const parent = nodesById.get(node.parent_node_id);
      if (!parent || parent.map_id !== node.map_id) fail(`source node ${node.node_id} parent_node_id is invalid`);
      const children = childrenByParent.get(parent.node_id) || [];
      children.push(node);
      childrenByParent.set(parent.node_id, children);
    }
  }
  for (const [parentId, children] of childrenByParent.entries()) {
    if (children.length > DENSITY_BUDGET.max_children_per_node) fail(`source node ${parentId} exceeds child density budget`);
  }
  for (const map of source.maps) {
    const mapNodes = nodesByMap.get(map.map_id);
    if (mapNodes.length > DENSITY_BUDGET.max_visible_nodes_per_map) fail(`source map ${map.map_id} exceeds visible node budget`);
    const root = nodesById.get(map.root_node_id);
    if (!root || root.map_id !== map.map_id || root.node_kind !== "root" || root.parent_node_id !== null ||
        mapNodes.filter((node) => node.parent_node_id === null).length !== 1) fail(`source map ${map.map_id} root is invalid`);
    const layers = new Map();
    for (const node of mapNodes) {
      let depth = 1;
      let cursor = node;
      const visited = new Set([node.node_id]);
      while (cursor.parent_node_id !== null) {
        const parent = nodesById.get(cursor.parent_node_id);
        if (visited.has(parent.node_id)) fail(`source map ${map.map_id} contains a parent cycle`);
        visited.add(parent.node_id);
        depth += 1;
        cursor = parent;
      }
      if (depth > DENSITY_BUDGET.max_depth) fail(`source map ${map.map_id} exceeds depth budget`);
      layers.set(depth, (layers.get(depth) || 0) + 1);
    }
    if (mapNodes.length >= DENSITY_BUDGET.layer_balance_min_nodes &&
        Math.max(...layers.values()) / mapNodes.length > DENSITY_BUDGET.max_layer_share) {
      fail(`source map ${map.map_id} exceeds layer balance budget`);
    }
  }
  const childMapLinkCounts = new Map();
  for (const node of source.outline_nodes) {
    const map = mapsById.get(node.map_id);
    if (map.map_kind === "global_constraints" && node.node_kind === "constraint" &&
        (!Array.isArray(node.affected_node_ids) || !node.affected_node_ids.length)) {
      fail(`source global constraint node ${node.node_id} must list at least one affected business node`);
    }
    if (node.child_map_id !== undefined) {
      const childMap = mapsById.get(node.child_map_id);
      if (node.node_kind !== "map_link" || !childMap || childMap.parent_map_id !== node.map_id) fail(`source node ${node.node_id} child_map_id is invalid`);
      childMapLinkCounts.set(node.child_map_id, (childMapLinkCounts.get(node.child_map_id) || 0) + 1);
    } else if (node.node_kind === "map_link") fail(`source map_link node ${node.node_id} requires child_map_id`);
    if (node.affected_node_ids !== undefined) {
      if (map.map_kind !== "global_constraints" || node.node_kind !== "constraint" || !Array.isArray(node.affected_node_ids) || !node.affected_node_ids.length) {
        fail(`source node ${node.node_id} affected_node_ids are invalid`);
      }
      if (new Set(node.affected_node_ids).size !== node.affected_node_ids.length) {
        fail(`source node ${node.node_id} affected_node_ids must be unique`);
      }
      for (const affectedId of node.affected_node_ids) {
        const affected = nodesById.get(affectedId);
        if (!affected || mapsById.get(affected.map_id).map_kind !== "branch") {
          fail(`source node ${node.node_id} affected_node_ids must reference business branch nodes`);
        }
      }
    }
  }
  for (const map of source.maps) {
    if (map.map_kind !== "overview" && childMapLinkCounts.get(map.map_id) !== 1) {
      fail(`source map ${map.map_id} must be linked exactly once from its parent map`);
    }
  }
  return { mapsById, nodesById };
}

function validateSourceIdentity(source, response, expectedSourcePath) {
  requireObject(source, "source discovery data");
  if (source.schema_version !== 2) fail("source schema_version must be 2");
  if (source.review_type !== "outline_discovery" || source.interaction_mode !== "discovery") {
    fail("source must be Outline discovery data");
  }
  if (source.artifact_path !== expectedSourcePath) fail("source artifact_path does not match response source_review_data");
  requireObject(source.project, "source project");
  for (const key of ["name", "feature", "current_understanding", "discovery_goal"]) {
    requireString(source.project[key], `source project ${key}`);
  }
  if (source.project?.feature !== response.feature) fail("source feature does not match response feature");
  if (source.batch_id !== response.batch_id) fail("source batch_id does not match response batch_id");
  if (source.outline_maturity !== response.outline_maturity) fail("source maturity does not match response maturity");
  if (source.authorization_effect !== "none" || source.next_route !== "/sp.prd") {
    fail("source discovery data must be non-authorizing");
  }
  if (!Array.isArray(source.source_snapshot) || source.source_snapshot.length === 0) {
    fail("source source_snapshot must not be empty");
  }
  for (const [index, snapshot] of source.source_snapshot.entries()) {
    requireObject(snapshot, `source snapshot[${index}]`);
    requireString(snapshot.path, `source snapshot[${index}] path`);
    requireString(snapshot.source_type, `source snapshot[${index}] source_type`);
  }
  return validateSourceTopology(source);
}

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateDeltaShape(delta, index, questions, seenDeltaIds, seenQuestionIds) {
  const label = `delta[${index}]`;
  requireObject(delta, label);
  for (const key of ["delta_id", "question_id", "outline_node_id", "target_kind", "operation", "source_tag"]) {
    requireString(delta[key], `${label} ${key}`);
  }
  if (seenDeltaIds.has(delta.delta_id)) fail(`duplicate delta_id: ${delta.delta_id}`);
  seenDeltaIds.add(delta.delta_id);
  if (seenQuestionIds.has(delta.question_id)) fail(`question_id occurs more than once: ${delta.question_id}`);
  seenQuestionIds.add(delta.question_id);
  const question = questions.get(delta.question_id);
  if (!question) fail(`${label} question_id is unknown: ${delta.question_id}`);
  if (delta.outline_node_id !== question.outline_node_id) {
    fail(`${label} outline_node_id does not match question_id ${delta.question_id}`);
  }
  if (delta.target_kind !== question.target_kind) fail(`${label} target_kind does not match question_id ${delta.question_id}`);
  if (!SECTION_BY_TARGET_KIND.has(delta.target_kind)) fail(`${label} target_kind is unsupported: ${delta.target_kind}`);
  if (!OPERATIONS.has(delta.operation)) fail(`${label} operation is unsupported: ${delta.operation}`);
  if (!SOURCE_TAGS.has(delta.source_tag)) fail(`${label} source tag is invalid`);
  if (typeof delta.none_of_the_above !== "boolean") fail(`${label} none_of_the_above must be boolean`);
  if (!(typeof delta.supersedes_delta_id === "string" || delta.supersedes_delta_id === null)) {
    fail(`${label} supersedes_delta_id must be string or null`);
  }
  if (!(typeof delta.candidate_id === "string" || delta.candidate_id === null)) fail(`${label} candidate_id must be string or null`);
  if (!(typeof delta.target_id === "string" || delta.target_id === null)) fail(`${label} target_id must be string or null`);
  if (typeof delta.value !== "string") fail(`${label} value must be a string`);

  const hasCandidate = present(delta.candidate_id);
  const hasTarget = present(delta.target_id);
  const hasValue = present(delta.value);
  const candidate = hasCandidate ? question.candidatesById.get(delta.candidate_id) : null;
  if (hasCandidate && !candidate) fail(`${label} candidate_id is unknown for question_id ${delta.question_id}`);
  if (delta.operation === "confirm_candidate") {
    if (!candidate || hasTarget || !hasValue || delta.none_of_the_above || delta.source_tag !== "user-confirmed") {
      fail(`${label} confirm_candidate fields are invalid`);
    }
    if (delta.value !== candidate.value) fail(`${label} value must exactly match candidate_id ${delta.candidate_id}`);
  } else if (delta.operation === "add") {
    if (hasCandidate || hasTarget || !hasValue || delta.source_tag !== "user") fail(`${label} add fields are invalid`);
  } else if (delta.operation === "replace") {
    if (hasCandidate || !hasTarget || !hasValue || delta.none_of_the_above || delta.source_tag !== "user") {
      fail(`${label} replace fields are invalid`);
    }
  } else if (delta.operation === "exclude") {
    if (hasCandidate === hasTarget || delta.none_of_the_above || delta.source_tag !== "user") {
      fail(`${label} exclude fields are invalid`);
    }
  } else if (delta.operation === "context_note") {
    if (hasCandidate || hasTarget || !hasValue || delta.none_of_the_above || delta.source_tag !== "user") {
      fail(`${label} context_note fields are invalid`);
    }
  }
  return delta;
}

function markdownSections(markdown) {
  const headings = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)];
  return headings.map((match, index) => ({
    title: match[1].trim(),
    start: match.index,
    end: headings[index + 1]?.index ?? markdown.length,
    content: markdown.slice(match.index, headings[index + 1]?.index ?? markdown.length),
  }));
}

function anchorCount(markdown, anchor) {
  return markdown.split(anchor).length - 1;
}

function sectionForTarget(markdown, targetKind) {
  const expected = SECTION_BY_TARGET_KIND.get(targetKind);
  const section = markdownSections(markdown).find((entry) => entry.title === expected);
  if (!section) fail(`PRD is missing intended section: ${expected}`);
  return section;
}

function validateTargetReference(prd, delta) {
  if (!present(delta.target_id)) return;
  const anchor = `<!-- intent-target:${delta.target_id} -->`;
  if (anchorCount(prd, anchor) !== 1) fail(`target_id must identify exactly one existing PRD target: ${delta.target_id}`);
  const section = sectionForTarget(prd, delta.target_kind);
  if (!section.content.includes(anchor)) fail(`target_id ${delta.target_id} is outside its intended section`);
}

function validateExistingLedger(ledger, feature) {
  requireObject(ledger, "intent ledger");
  if (![1, 2].includes(ledger.schema_version) || ledger.format !== "speccompass-outline-intent-ledger") {
    fail("intent ledger format or schema_version is invalid");
  }
  if (ledger.feature !== feature) fail("intent ledger feature does not match response feature");
  if (!Array.isArray(ledger.events)) fail("intent ledger events must be an array");
  const earlier = new Set();
  const normalizedEvents = [];
  for (const [index, rawEvent] of ledger.events.entries()) {
    const event = ledger.schema_version === 1 ? { ...rawEvent, outline_node_id: null } : rawEvent;
    const label = `intent event[${index}]`;
    requireObject(event, label);
    for (const key of ["delta_id", "response_id", "target_kind", "operation", "source_tag", "recorded_at"]) {
      requireString(event[key], `${label} ${key}`);
    }
    if (!MATURITIES.has(event.maturity)) fail(`${label} maturity must be explore or frame`);
    if (!SECTION_BY_TARGET_KIND.has(event.target_kind)) fail(`${label} target_kind is unsupported`);
    if (!OPERATIONS.has(event.operation)) fail(`${label} operation is unsupported`);
    if (!SOURCE_TAGS.has(event.source_tag)) fail(`${label} source_tag is invalid`);
    if (Number.isNaN(Date.parse(event.recorded_at))) fail(`${label} recorded_at must be a date-time`);
    requireNullableString(event.candidate_id, `${label} candidate_id`);
    requireNullableString(event.target_id, `${label} target_id`);
    requireNullableString(event.supersedes_delta_id, `${label} supersedes_delta_id`);
    requireNullableString(event.outline_node_id, `${label} outline_node_id`);
    if (typeof event.value !== "string") fail(`${label} value must be a string`);
    const hasCandidate = present(event.candidate_id);
    const hasTarget = present(event.target_id);
    const hasValue = present(event.value);
    if (event.operation === "confirm_candidate") {
      if (!hasCandidate || hasTarget || !hasValue || event.source_tag !== "user-confirmed") {
        fail(`${label} confirm_candidate fields are invalid`);
      }
    } else if (event.operation === "add") {
      if (hasCandidate || hasTarget || !hasValue || event.source_tag !== "user") fail(`${label} add fields are invalid`);
    } else if (event.operation === "replace") {
      if (hasCandidate || !hasTarget || !hasValue || event.source_tag !== "user") fail(`${label} replace fields are invalid`);
    } else if (event.operation === "exclude") {
      if (hasCandidate === hasTarget || event.source_tag !== "user") fail(`${label} exclude fields are invalid`);
    } else if (event.operation === "context_note") {
      if (hasCandidate || hasTarget || !hasValue || event.source_tag !== "user") {
        fail(`${label} context_note fields are invalid`);
      }
    }
    if (earlier.has(event.delta_id)) fail(`intent ledger has duplicate delta_id: ${event.delta_id}`);
    if (event.supersedes_delta_id && !earlier.has(event.supersedes_delta_id)) {
      fail(`intent event[${index}] supersedes_delta_id must reference an earlier event`);
    }
    earlier.add(event.delta_id);
    normalizedEvents.push(event);
  }
  return { ...ledger, schema_version: 2, events: normalizedEvents };
}

function eventFor(response, delta) {
  return {
    delta_id: delta.delta_id,
    response_id: response.response_id,
    maturity: response.outline_maturity,
    outline_node_id: delta.outline_node_id,
    target_kind: delta.target_kind,
    operation: delta.operation,
    candidate_id: delta.candidate_id,
    target_id: delta.target_id,
    value: delta.value,
    source_tag: delta.source_tag,
    recorded_at: response.generated_at,
    supersedes_delta_id: delta.supersedes_delta_id,
  };
}

function sameEvent(left, right) {
  return [
    "delta_id",
    "response_id",
    "maturity",
    "outline_node_id",
    "target_kind",
    "operation",
    "candidate_id",
    "target_id",
    "value",
    "source_tag",
    "recorded_at",
    "supersedes_delta_id",
  ].every((key) => left[key] === right[key]);
}

function prepareLedger(response, deltas, ledger, currentPrd) {
  const byId = new Map(ledger.events.map((event) => [event.delta_id, event]));
  const acceptedIds = new Set(
    ledger.events
      .filter((event) => anchorCount(currentPrd, `<!-- intent-delta:${event.delta_id} -->`) === 1)
      .map((event) => event.delta_id),
  );
  const nextEvents = [...ledger.events];
  for (const delta of deltas) {
    const expected = eventFor(response, delta);
    const existing = byId.get(delta.delta_id);
    if (existing) {
      if (!sameEvent(existing, expected)) fail(`delta_id already exists with different content: ${delta.delta_id}`);
      if (acceptedIds.has(delta.delta_id)) fail(`delta_id already consumed: ${delta.delta_id}`);
    } else {
      if (delta.supersedes_delta_id && !acceptedIds.has(delta.supersedes_delta_id)) {
        fail(
          `supersedes_delta_id must reference an earlier accepted event consumed by the current formal PRD: ${delta.supersedes_delta_id}`,
        );
      }
      nextEvents.push(expected);
      byId.set(delta.delta_id, expected);
    }
  }
  return { ...ledger, events: nextEvents };
}

function validateTemporaryPrd(prd, deltas) {
  for (const delta of deltas) {
    const anchor = `<!-- intent-delta:${delta.delta_id} -->`;
    if (anchorCount(prd, anchor) !== 1) fail(`temporary PRD must contain exactly one delta anchor: ${delta.delta_id}`);
    const section = sectionForTarget(prd, delta.target_kind);
    if (!section.content.includes(anchor)) fail(`delta ${delta.delta_id} is not in its intended section ${section.title}`);
    const afterAnchor = section.content.slice(section.content.indexOf(anchor) + anchor.length);
    const nextBoundary = afterAnchor.search(/(?:^##\s|<!-- intent-delta:)/m);
    const block = nextBoundary >= 0 ? afterAnchor.slice(0, nextBoundary) : afterAnchor;
    const blockSourceTags = new Set([...block.matchAll(/\[src:([^\]]+)\]/g)].map((match) => match[1]));
    if (blockSourceTags.size !== 1 || !blockSourceTags.has(delta.source_tag)) {
      fail(`delta ${delta.delta_id} has the wrong or conflicting source tag`);
    }
    if (delta.value && !block.includes(delta.value)) fail(`delta ${delta.delta_id} must preserve the exact delta value`);
    const referenceId = delta.target_id || (delta.operation === "exclude" ? delta.candidate_id : null);
    if (referenceId) {
      const reference = `<!-- intent-ref:${delta.delta_id}:${referenceId} -->`;
      if (!block.includes(reference)) fail(`delta ${delta.delta_id} must include intent-ref:${delta.delta_id}:${referenceId}`);
    }
  }
}

function validateTemporaryOutline(outline, maturity) {
  const matches = [...outline.matchAll(/^outline_maturity:\s*(\S+)\s*$/gm)];
  if (matches.length !== 1 || matches[0][1] !== maturity) {
    fail(`temporary Outline outline_maturity must remain ${maturity}`);
  }
  if (/\b(?:AWAITING_OUTLINE_CONFIRMATION|READY_FOR_SPECIFY)\b/.test(outline)) {
    fail("temporary Outline must remain non-authorizing during discovery");
  }
}

async function writeJsonAtomic(filePath, value) {
  const temporary = `${filePath}.write-${process.pid}-${Date.now()}`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    fail(`cannot inspect Outline discovery writeback lock owner ${pid}: ${error.message}`);
  }
}

function validateLockOwner(owner, feature, label, { requireLockId = false } = {}) {
  requireObject(owner, label);
  if (
    owner.schema_version !== 1 ||
    owner.feature !== feature ||
    !Number.isSafeInteger(owner.pid) ||
    owner.pid <= 0 ||
    !text(owner.acquired_at) ||
    Number.isNaN(Date.parse(owner.acquired_at)) ||
    (requireLockId && !text(owner.lock_id)) ||
    (owner.lock_id !== undefined && !text(owner.lock_id))
  ) {
    fail(`${label} is invalid`);
  }
  return owner;
}

function lockIdentity(owner) {
  return text(owner.lock_id) || JSON.stringify({
    schema_version: owner.schema_version,
    feature: owner.feature,
    pid: owner.pid,
    acquired_at: owner.acquired_at,
  });
}

async function createOwnedLock(lockPath, feature, label) {
  const owner = {
    schema_version: 1,
    feature,
    pid: process.pid,
    acquired_at: new Date().toISOString(),
    lock_id: randomUUID(),
  };
  let handle;
  try {
    handle = await fs.open(lockPath, "wx");
    await handle.writeFile(`${JSON.stringify(owner, null, 2)}\n`, "utf8");
    await handle.close();
    return owner;
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
      await fs.unlink(lockPath).catch(() => {});
    }
    if (error?.code === "EEXIST") throw error;
    fail(`cannot create ${label}: ${error.message}`);
  }
}

async function releaseOwnedLock(lockPath, owner, label) {
  try {
    const current = validateLockOwner(await readJson(lockPath, label), owner.feature, label, { requireLockId: true });
    if (current.lock_id !== owner.lock_id) {
      process.stderr.write(`${label} cleanup warning: ownership changed at ${lockPath}; lock was preserved\n`);
      return;
    }
    await fs.unlink(lockPath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      process.stderr.write(`${label} cleanup warning: ${lockPath}: ${error.message}\n`);
    }
  }
}

async function acquireRecoveryClaim(recoveryPath, feature) {
  const label = "Outline discovery stale-lock recovery claim";
  try {
    return await createOwnedLock(recoveryPath, feature, label);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }

  const observed = validateLockOwner(
    await readJson(recoveryPath, label),
    feature,
    label,
    { requireLockId: true },
  );
  if (processIsAlive(observed.pid)) {
    fail(`${label} is held by active process ${observed.pid}: ${recoveryPath}`);
  }
  fail(`${label} was left by dead process ${observed.pid}; preserve both lock files, verify no writeback is running, remove ${recoveryPath}, and retry`);
}

async function reconcileRecoveryClaimAfterFreshLock(recoveryPath, feature) {
  if (!await exists(recoveryPath)) return;
  const label = "Outline discovery stale-lock recovery claim";
  const observed = validateLockOwner(
    await readJson(recoveryPath, label),
    feature,
    label,
    { requireLockId: true },
  );
  if (processIsAlive(observed.pid)) {
    fail(`${label} is still held by active process ${observed.pid}: ${recoveryPath}`);
  }
  await fs.unlink(recoveryPath);
}

async function acquireFeatureLock(featureRoot, feature) {
  const lockPath = path.join(featureRoot, "prd", "review", ".outline-discovery-writeback.lock");
  const recoveryPath = path.join(featureRoot, "prd", "review", ".outline-discovery-writeback.recovery.lock");
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const owner = await createOwnedLock(lockPath, feature, "Outline discovery writeback lock");
      try {
        await reconcileRecoveryClaimAfterFreshLock(recoveryPath, feature);
      } catch (error) {
        await releaseOwnedLock(lockPath, owner, "Outline discovery writeback lock");
        throw error;
      }
      return async () => releaseOwnedLock(lockPath, owner, "Outline discovery writeback lock");
    } catch (error) {
      if (error?.code !== "EEXIST") {
        fail(`cannot acquire Outline discovery writeback lock: ${error.message}`);
      }
    }

    const observed = validateLockOwner(
      await readJson(lockPath, "Outline discovery writeback lock"),
      feature,
      "Outline discovery writeback lock",
    );
    if (processIsAlive(observed.pid)) {
      fail(`Outline discovery writeback lock is held by active process ${observed.pid}: ${lockPath}`);
    }

    const recoveryOwner = await acquireRecoveryClaim(recoveryPath, feature);
    try {
      if (!await exists(lockPath)) continue;
      const current = validateLockOwner(
        await readJson(lockPath, "Outline discovery writeback lock"),
        feature,
        "Outline discovery writeback lock",
      );
      if (lockIdentity(current) !== lockIdentity(observed)) continue;
      if (processIsAlive(current.pid)) {
        fail(`Outline discovery writeback lock changed to active process ${current.pid}: ${lockPath}`);
      }
      await fs.unlink(lockPath);
    } finally {
      await releaseOwnedLock(recoveryPath, recoveryOwner, "Outline discovery stale-lock recovery claim");
    }
  }
  fail(`cannot acquire Outline discovery writeback lock after stale-lock recovery: ${lockPath}`);
}

async function replaceDocumentPair(prdPath, outlinePath, prdTempPath, outlineTempPath) {
  const token = `${process.pid}-${Date.now()}`;
  const prdBackup = `${prdPath}.backup-${token}`;
  const outlineBackup = `${outlinePath}.backup-${token}`;
  let prdBackedUp = false;
  let outlineBackedUp = false;
  let prdReplaced = false;
  let outlineReplaced = false;
  try {
    await fs.rename(prdPath, prdBackup);
    prdBackedUp = true;
    await fs.rename(outlinePath, outlineBackup);
    outlineBackedUp = true;
    await fs.rename(prdTempPath, prdPath);
    prdReplaced = true;
    await fs.rename(outlineTempPath, outlinePath);
    outlineReplaced = true;
  } catch (error) {
    try {
      if (prdReplaced && await exists(prdPath)) await fs.rename(prdPath, prdTempPath);
      if (outlineReplaced && await exists(outlinePath)) await fs.rename(outlinePath, outlineTempPath);
      if (prdBackedUp && await exists(prdBackup)) await fs.rename(prdBackup, prdPath);
      if (outlineBackedUp && await exists(outlineBackup)) await fs.rename(outlineBackup, outlinePath);
    } catch (rollbackError) {
      fail(`document replacement failed (${error.message}) and rollback failed (${rollbackError.message})`);
    }
    fail(`document replacement failed; both formal documents were restored: ${error.message}`);
  }

  for (const backup of [prdBackup, outlineBackup]) {
    try {
      await fs.unlink(backup);
    } catch (error) {
      process.stderr.write(`Outline discovery backup cleanup warning: ${backup}: ${error.message}\n`);
    }
  }
}

async function main() {
  const root = path.resolve(process.cwd());
  const args = parseArgs(process.argv.slice(2));
  const responsePath = repositoryPath(root, args["--response"], "--response");
  const prdTempPath = repositoryPath(root, args["--prd-temp"], "--prd-temp");
  const outlineTempPath = repositoryPath(root, args["--outline-temp"], "--outline-temp");
  const response = await readJson(responsePath.resolved, "response");
  validateResponseEnvelope(response);

  const expectedSource = `specs/${response.feature}/prd/review/outline-discovery-data.json`;
  if (response.source_review_data !== expectedSource) fail("response source_review_data does not match feature");
  const sourcePath = repositoryPath(root, response.source_review_data, "response source_review_data");
  const expectedPrdTemp = `specs/${response.feature}/prd.md.tmp`;
  const expectedOutlineTemp = `specs/${response.feature}/spec-outline.md.tmp`;
  if (prdTempPath.normalized !== expectedPrdTemp) fail(`--prd-temp must be ${expectedPrdTemp}`);
  if (outlineTempPath.normalized !== expectedOutlineTemp) fail(`--outline-temp must be ${expectedOutlineTemp}`);

  const featureRoot = path.resolve(root, "specs", response.feature);
  const releaseLock = await acquireFeatureLock(featureRoot, response.feature);
  try {
    const source = await readJson(sourcePath.resolved, "source discovery data");
    const topology = validateSourceIdentity(source, response, expectedSource);
    const questions = buildQuestionIndex(source, topology);
    const seenDeltaIds = new Set();
    const seenQuestionIds = new Set();
    const deltas = response.deltas.map((delta, index) =>
      validateDeltaShape(delta, index, questions, seenDeltaIds, seenQuestionIds));

    const prdPath = path.join(featureRoot, "prd.md");
    const outlinePath = path.join(featureRoot, "spec-outline.md");
    const ledgerPath = path.join(featureRoot, "prd", "review", "outline-intent-ledger.json");
    const currentPrd = await readText(prdPath, "current PRD");
    await readText(outlinePath, "current Outline");
    for (const delta of deltas) validateTargetReference(currentPrd, delta);

    const ledger = await exists(ledgerPath)
      ? await readJson(ledgerPath, "intent ledger")
      : { schema_version: 2, format: "speccompass-outline-intent-ledger", feature: response.feature, events: [] };
    const normalizedLedger = validateExistingLedger(ledger, response.feature);
    const nextLedger = prepareLedger(response, deltas, normalizedLedger, currentPrd);
    await writeJsonAtomic(ledgerPath, nextLedger);

    const temporaryPrd = await readText(prdTempPath.resolved, "temporary PRD");
    const temporaryOutline = await readText(outlineTempPath.resolved, "temporary Outline");
    validateTemporaryPrd(temporaryPrd, deltas);
    validateTemporaryOutline(temporaryOutline, response.outline_maturity);
    await replaceDocumentPair(prdPath, outlinePath, prdTempPath.resolved, outlineTempPath.resolved);

    process.stdout.write(`${JSON.stringify({
      ok: true,
      feature: response.feature,
      response_id: response.response_id,
      consumed_delta_ids: deltas.map((delta) => delta.delta_id),
      ledger_path: path.relative(root, ledgerPath).replace(/\\/g, "/"),
    })}\n`);
  } finally {
    await releaseLock();
  }
}

main().catch((error) => {
  process.stderr.write(`Outline discovery writeback failed: ${error.message}\n`);
  process.exitCode = 1;
});
