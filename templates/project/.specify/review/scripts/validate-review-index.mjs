#!/usr/bin/env node
import fs from "node:fs";

const [indexPath, ...extraArgs] = process.argv.slice(2);
if (!indexPath || extraArgs.length) {
  console.error("Usage: node .specify/review/scripts/validate-review-index.mjs specs/review-index.json");
  process.exit(2);
}

const errors = [];
let index;
try {
  index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
} catch (error) {
  console.error(`Review index could not be read: ${error.message}`);
  process.exit(1);
}

const featurePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const codePattern = /^(?:[0-9]{3,}|[0-9]{8}-[0-9]{6})$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const boundaryKinds = new Set(["root", "standalone", "subproject_handoff"]);
const alignmentStatuses = new Set(["not_mapped", "one_to_one", "merged", "split", "diverged"]);
const reviewFlags = ["has_flow_review", "has_ui_review", "has_outline_review", "has_outline_discovery"];
const rootKeys = new Set(["schema_version", "project", "updated_at", "hierarchy", "features"]);
const hierarchyKeys = new Set(["mode", "root_feature"]);
const featureKeys = new Set([
  "order", "feature_code", "feature", "title", "parent_feature", "sibling_order",
  "boundary_source", "outline_alignment", ...reviewFlags
]);
const boundaryKeys = new Set(["kind", "handoff_ref", "rationale"]);
const alignmentKeys = new Set(["status", "outline_node_refs", "rationale"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidFeature(value) {
  return isNonEmptyString(value) && featurePattern.test(value) && !value.includes("..");
}

function addError(message) {
  errors.push(message);
}

function rejectUnknownFields(value, allowedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const unknown = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknown.length) addError(`${label} has unsupported fields: ${unknown.join(", ")}.`);
}

if (!index || typeof index !== "object" || Array.isArray(index)) {
  addError("Review index root must be an object.");
} else {
  rejectUnknownFields(index, rootKeys, "review-index");
  if (index.schema_version !== 2) addError("review-index schema_version must be 2; migrate legacy flat indexes before updating them.");
  if (typeof index.project !== "string") addError("project must be a string.");
  if (typeof index.updated_at !== "string") addError("updated_at must be a string.");
  if (!index.hierarchy || typeof index.hierarchy !== "object" || Array.isArray(index.hierarchy)) {
    addError("hierarchy must be an object.");
  } else rejectUnknownFields(index.hierarchy, hierarchyKeys, "hierarchy");
  if (!Array.isArray(index.features)) addError("features must be an array.");
}

const features = Array.isArray(index?.features) ? index.features : [];
if (features.length && !isNonEmptyString(index.project)) addError("project must be non-empty when features exist.");
if (features.length && !datePattern.test(index.updated_at || "")) addError("updated_at must use YYYY-MM-DD when features exist.");

const mode = index?.hierarchy?.mode;
const rootFeature = index?.hierarchy?.root_feature;
if (!new Set(["flat", "explicit"]).has(mode)) addError("hierarchy.mode must be flat or explicit.");
if (!(rootFeature === null || isValidFeature(rootFeature))) addError("hierarchy.root_feature must be null or a valid feature slug.");

const byFeature = new Map();
const seenCodes = new Set();
const seenOrders = new Set();
const siblingSlots = new Set();
const alignmentOwners = new Map();

for (const [position, entry] of features.entries()) {
  const label = `features[${position}]`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    addError(`${label} must be an object.`);
    continue;
  }
  rejectUnknownFields(entry, featureKeys, label);
  if (!Number.isInteger(entry.order) || entry.order < 1) addError(`${label}.order must be a positive integer.`);
  else if (seenOrders.has(entry.order)) addError(`order ${entry.order} is duplicated.`);
  else seenOrders.add(entry.order);
  if (!isNonEmptyString(entry.feature_code) || !codePattern.test(entry.feature_code)) {
    addError(`${label}.feature_code must be a stable 3+ digit or timestamp code.`);
  } else if (seenCodes.has(entry.feature_code)) addError(`feature_code ${entry.feature_code} is duplicated.`);
  else seenCodes.add(entry.feature_code);
  if (!isValidFeature(entry.feature)) addError(`${label}.feature is not a safe feature slug.`);
  else {
    if (!entry.feature.startsWith(`${entry.feature_code}-`)) addError(`${entry.feature} must start with feature_code ${entry.feature_code}-.`);
    if (byFeature.has(entry.feature)) addError(`feature ${entry.feature} is duplicated.`);
    else byFeature.set(entry.feature, entry);
  }
  if (!isNonEmptyString(entry.title)) addError(`${label}.title must be non-empty.`);
  if (!(entry.parent_feature === null || isValidFeature(entry.parent_feature))) addError(`${label}.parent_feature must be null or a valid feature slug.`);
  if (!Number.isInteger(entry.sibling_order) || entry.sibling_order < 0) addError(`${label}.sibling_order must be a non-negative integer.`);
  for (const flag of reviewFlags) {
    if (typeof entry[flag] !== "boolean") addError(`${label}.${flag} must be boolean.`);
  }
  if ((entry.feature_code === "000" || entry.feature === "000" || entry.feature?.startsWith("000-"))
    && (entry.has_flow_review === true || entry.has_ui_review === true)) {
    addError(`${label} feature_code/slug 000 is portfolio-only and cannot advertise Flow or UI review.`);
  }

  const boundary = entry.boundary_source;
  if (!boundary || typeof boundary !== "object" || Array.isArray(boundary)) {
    addError(`${label}.boundary_source must be an object.`);
  } else {
    rejectUnknownFields(boundary, boundaryKeys, `${label}.boundary_source`);
    if (!boundaryKinds.has(boundary.kind)) addError(`${label}.boundary_source.kind is invalid.`);
    if (!(boundary.handoff_ref === null || isNonEmptyString(boundary.handoff_ref))) addError(`${label}.boundary_source.handoff_ref must be null or non-empty.`);
    if (!isNonEmptyString(boundary.rationale)) addError(`${label}.boundary_source.rationale must be non-empty.`);
    if (boundary.kind === "subproject_handoff") {
      if (entry.parent_feature === null) addError(`${label} uses subproject_handoff but has no parent_feature.`);
      if (!isNonEmptyString(boundary.handoff_ref)) addError(`${label} uses subproject_handoff but has no handoff_ref.`);
    } else if (boundary.handoff_ref !== null) {
      addError(`${label} may only carry handoff_ref when boundary_source.kind is subproject_handoff.`);
    }
    if (boundary.kind === "root" && entry.parent_feature !== null) addError(`${label} root boundary cannot have a parent_feature.`);
    if (boundary.kind === "standalone" && entry.parent_feature !== null) addError(`${label} standalone boundary cannot have a parent_feature.`);
  }

  const alignment = entry.outline_alignment;
  if (!alignment || typeof alignment !== "object" || Array.isArray(alignment)) {
    addError(`${label}.outline_alignment must be an object.`);
  } else {
    rejectUnknownFields(alignment, alignmentKeys, `${label}.outline_alignment`);
    const refs = alignment.outline_node_refs;
    if (!alignmentStatuses.has(alignment.status)) addError(`${label}.outline_alignment.status is invalid.`);
    if (!Array.isArray(refs) || refs.some((ref) => !isNonEmptyString(ref)) || new Set(refs || []).size !== (refs || []).length) {
      addError(`${label}.outline_alignment.outline_node_refs must contain unique non-empty refs.`);
    } else {
      if (alignment.status === "not_mapped" && refs.length !== 0) addError(`${label} not_mapped alignment must not carry outline refs.`);
      if (["one_to_one", "split"].includes(alignment.status) && refs.length !== 1) addError(`${label} ${alignment.status} alignment requires exactly one outline ref.`);
      if (alignment.status === "merged" && refs.length < 2) addError(`${label} merged alignment requires at least two outline refs.`);
      if (alignment.status === "diverged" && refs.length < 1) addError(`${label} diverged alignment requires at least one outline ref.`);
      for (const ref of refs) {
        const owners = alignmentOwners.get(ref) || [];
        owners.push({ feature: entry.feature, status: alignment.status });
        alignmentOwners.set(ref, owners);
      }
    }
    if (!isNonEmptyString(alignment.rationale)) addError(`${label}.outline_alignment.rationale must be non-empty.`);
  }
}

for (const entry of features) {
  if (!isValidFeature(entry?.feature)) continue;
  if (entry.parent_feature !== null && !byFeature.has(entry.parent_feature)) addError(`${entry.feature} references missing parent_feature ${entry.parent_feature}.`);
  if (entry.parent_feature === entry.feature) addError(`${entry.feature} cannot be its own parent.`);
  if (entry.parent_feature === null && entry.sibling_order !== 0) addError(`${entry.feature} is a root entry and must use sibling_order 0.`);
  if (entry.parent_feature !== null) {
    if (entry.sibling_order < 1) addError(`${entry.feature} is a child and must use sibling_order >= 1.`);
    const slot = `${entry.parent_feature}:${entry.sibling_order}`;
    if (siblingSlots.has(slot)) addError(`sibling_order ${entry.sibling_order} is duplicated under ${entry.parent_feature}.`);
    else siblingSlots.add(slot);
  }
  const visited = new Set([entry.feature]);
  let cursor = entry;
  while (cursor?.parent_feature !== null) {
    cursor = byFeature.get(cursor.parent_feature);
    if (!cursor) break;
    if (visited.has(cursor.feature)) {
      addError(`feature hierarchy contains a cycle through ${cursor.feature}.`);
      break;
    }
    visited.add(cursor.feature);
  }
}

if (mode === "flat") {
  if (rootFeature !== null) addError("flat hierarchy must use root_feature: null.");
  if (features.some((entry) => entry?.parent_feature !== null || entry?.boundary_source?.kind === "root")) {
    addError("flat hierarchy cannot contain parent links or a root boundary.");
  }
} else if (mode === "explicit") {
  const root = byFeature.get(rootFeature);
  if (!root) addError("explicit hierarchy.root_feature must reference an existing feature.");
  else {
    if (root.parent_feature !== null || root.boundary_source?.kind !== "root" || root.sibling_order !== 0) {
      addError("explicit hierarchy root must use parent_feature null, boundary_source.kind root, and sibling_order 0.");
    }
    if (root.feature_code !== "000" && features.some((entry) => entry?.feature_code === "000")) {
      addError("feature_code 000 is reserved for the explicit hierarchy root when it exists.");
    }
    if (root.has_flow_review === true || root.has_ui_review === true) {
      addError("explicit hierarchy root is portfolio-only and cannot advertise Flow or UI review.");
    }
  }
  for (const entry of features) {
    if (entry?.feature === rootFeature) continue;
    if (entry?.parent_feature === null || entry?.boundary_source?.kind !== "subproject_handoff") {
      addError(`${entry?.feature || "unknown feature"} must descend from the explicit root through a confirmed subproject_handoff.`);
      continue;
    }
    let cursor = entry;
    const visited = new Set();
    while (cursor && !visited.has(cursor.feature) && cursor.feature !== rootFeature) {
      visited.add(cursor.feature);
      cursor = byFeature.get(cursor.parent_feature);
    }
    if (!cursor || cursor.feature !== rootFeature) addError(`${entry.feature} does not descend from hierarchy.root_feature ${rootFeature}.`);
  }
}

for (const [ref, owners] of alignmentOwners) {
  const oneToOneOwners = owners.filter((owner) => owner.status === "one_to_one");
  if (oneToOneOwners.length > 1 || (oneToOneOwners.length === 1 && owners.length > 1)) {
    addError(`outline ref ${ref} cannot be one_to_one because it maps to multiple features.`);
  }
  const splitOwners = owners.filter((owner) => owner.status === "split");
  if (splitOwners.length === 1) addError(`outline ref ${ref} is marked split but maps to only one feature.`);
}

if (errors.length) {
  for (const error of [...new Set(errors)]) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log(`Review index valid: ${features.length} feature(s), hierarchy=${mode}.`);
