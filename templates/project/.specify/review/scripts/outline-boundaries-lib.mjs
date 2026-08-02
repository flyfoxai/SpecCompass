import { createHash, randomUUID } from "node:crypto";
import { open, readFile, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

export const TRANSITION_STATES = new Set([
  "ALIGNED",
  "OUTLINE_CHANGE_PROPOSED",
  "OUTLINE_CHANGE_APPROVED",
  "PROJECT_RESTRUCTURE_STAGED",
  "FLOW_UI_IMPACT_VALIDATED",
  "CROSS_ARTIFACT_VALIDATED",
  "LEGACY_ADOPTION_REQUIRED",
  "MIGRATION_BLOCKED",
  "ROLLBACK_REQUIRED"
]);

export const REVIEW_FLAGS = ["has_flow_review", "has_ui_review", "has_outline_review", "has_outline_discovery"];
export const EVIDENCE_TYPES = new Set(["test_pass", "contract_check", "hash_match", "source_trace", "human_approval"]);
export const IMPACT_OUTCOMES = new Set(["UNCHANGED_WITH_EVIDENCE", "REGENERATE", "MIGRATE", "RETIRE", "BLOCKED"]);
export const ARTIFACT_TYPES = new Set(["prd", "outline", "spec", "flow", "ui", "plan", "tasks", "implementation", "test", "trace", "memory", "open_item"]);

const ROOT_KEYS = new Set(["schema_version", "root_feature", "updated_at", "transition_state", "current_baseline", "proposed_baseline", "transition"]);
const BASELINE_KEYS = new Set(["baseline_id", "baseline_digest", "created_at", "created_by", "decision_ref", "project_boundaries", "tombstones"]);
const PROPOSAL_KEYS = new Set(["baseline_id", "proposal_digest", "base_baseline_id", "base_baseline_digest", "created_at", "created_by", "decision_ref", "change_reason", "project_boundaries", "tombstones"]);
const BOUNDARY_KEYS = new Set(["order", "feature_code", "feature", "title", "parent_feature_code", "sibling_order", "outline_node_id", "boundary_source", "lifecycle", "predecessor_codes"]);
const SOURCE_KEYS = new Set(["kind", "handoff_ref", "rationale"]);
const TOMBSTONE_KEYS = new Set(["feature_code", "feature", "title", "retired_at", "reason", "successor_codes"]);
const TRANSITION_KEYS = new Set(["transition_id", "transition_revision", "base_baseline_id", "base_baseline_digest", "proposal_digest", "started_at", "updated_at", "lock", "artifact_reassignments", "impact_assessments", "completed_steps", "next_action", "rollback_ref"]);
const LOCK_KEYS = new Set(["owner_id", "transition_id", "transition_revision", "baseline_digest", "pid", "created_at", "heartbeat_at", "lease_expires_at", "lease_seconds", "heartbeat_seconds"]);
const REASSIGNMENT_KEYS = new Set(["artifact_type", "artifact_ref", "disposition", "target_feature_code", "reason"]);
const IMPACT_KEYS = new Set(["artifact_type", "artifact_ref", "outcome", "evidence"]);
const EVIDENCE_KEYS = new Set(["evidence_type", "ref", "source_digest", "verified_at", "verifier", "result"]);
const FEATURE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CODE_PATTERN = /^(?:[0-9]{3,}|[0-9]{8}-[0-9]{6})$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const BOUNDARY_KINDS = new Set(["root", "standalone", "subproject_handoff"]);
const REASSIGNMENT_DISPOSITIONS = new Set(["successor", "shared", "retire", "blocked"]);
const EVIDENCE_RESULTS = new Set(["passed", "approved", "matched"]);
const TRANSITION_EVENT_TYPES = new Set([
  "TRANSITION_STARTED", "STEP_COMPLETED", "BASELINE_ACTIVATION_PREPARED",
  "ARTIFACTS_STAGED", "ARTIFACTS_PUBLISHED", "MIGRATION_BLOCKED",
  "ROLLBACK_REQUIRED", "ALIGNED_NEW_BASELINE"
]);
const TRANSITION_EVENT_KEYS = new Set([
  "schema_version", "event_id", "event_type", "transition_id", "transition_revision",
  "occurred_at", "baseline_id", "baseline_digest", "step", "details_digest"
]);
const TRANSIENT_RENAME_CODES = new Set(["EACCES", "EBUSY", "EEXIST", "EPERM"]);
const TRANSIENT_UNLINK_CODES = new Set(["EACCES", "EBUSY", "EPERM"]);
const RENAME_RETRY_DELAYS = [25, 75, 150, 300];

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableStringify(value)).digest("hex");
}

export function computeBaselineDigest(baseline) {
  const { baseline_digest: _ignored, ...payload } = baseline;
  return sha256(payload);
}

export function computeProposalDigest(proposal) {
  const { proposal_digest: _ignored, ...payload } = proposal;
  return sha256(payload);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value) {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isRepoRef(value) {
  if (!isNonEmptyString(value) || value.includes("\\") || value.includes("\0") || value.startsWith("/")
    || value.startsWith("~") || /^[A-Za-z]:/.test(value) || /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(value)) return false;
  const parts = value.split("#");
  if (parts.length > 2 || (parts.length === 2 && !parts[1])) return false;
  const path = parts[0];
  const segments = path.split("/");
  return segments.length > 0 && segments.every((segment) => segment && segment !== "." && segment !== "..");
}

function exactKeys(value, allowed, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object.`);
    return false;
  }
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) errors.push(`${label} has unsupported fields: ${unknown.join(", ")}.`);
  return true;
}

function validateSource(source, boundary, label, errors) {
  if (!exactKeys(source, SOURCE_KEYS, `${label}.boundary_source`, errors)) return;
  if (!BOUNDARY_KINDS.has(source.kind)) errors.push(`${label}.boundary_source.kind is invalid.`);
  if (!(source.handoff_ref === null || isRepoRef(source.handoff_ref))) errors.push(`${label}.boundary_source.handoff_ref must be null or a POSIX repository reference.`);
  if (!isNonEmptyString(source.rationale)) errors.push(`${label}.boundary_source.rationale must be non-empty.`);
  if (source.kind === "subproject_handoff") {
    if (boundary.parent_feature_code === null || !isNonEmptyString(source.handoff_ref)) errors.push(`${label} requires a confirmed subproject handoff.`);
  } else if (source.handoff_ref !== null) errors.push(`${label} may carry handoff_ref only for subproject_handoff.`);
  if (["root", "standalone"].includes(source.kind) && boundary.parent_feature_code !== null) errors.push(`${label} boundary kind conflicts with parent_feature_code.`);
}

function validateBoundarySet(boundaries, tombstones, rootFeature, label, errors) {
  if (!Array.isArray(boundaries) || boundaries.length === 0) {
    errors.push(`${label}.project_boundaries must be a non-empty array.`);
    return;
  }
  if (!Array.isArray(tombstones)) errors.push(`${label}.tombstones must be an array.`);
  const codes = new Set();
  const features = new Set();
  const orders = new Set();
  const nodes = new Set();
  const siblings = new Set();
  const byCode = new Map();
  for (const [index, boundary] of boundaries.entries()) {
    const item = `${label}.project_boundaries[${index}]`;
    if (!exactKeys(boundary, BOUNDARY_KEYS, item, errors)) continue;
    if (!Number.isInteger(boundary.order) || boundary.order < 1 || orders.has(boundary.order)) errors.push(`${item}.order must be a unique positive integer.`);
    else orders.add(boundary.order);
    if (!isNonEmptyString(boundary.feature_code) || !CODE_PATTERN.test(boundary.feature_code) || codes.has(boundary.feature_code)) errors.push(`${item}.feature_code must be a unique stable code.`);
    else codes.add(boundary.feature_code);
    if (!isNonEmptyString(boundary.feature) || !FEATURE_PATTERN.test(boundary.feature) || boundary.feature.includes("..") || features.has(boundary.feature)) errors.push(`${item}.feature must be a unique safe slug.`);
    else features.add(boundary.feature);
    if (isNonEmptyString(boundary.feature_code) && isNonEmptyString(boundary.feature) && !boundary.feature.startsWith(`${boundary.feature_code}-`)) errors.push(`${item}.feature must start with feature_code.`);
    if (!isNonEmptyString(boundary.title)) errors.push(`${item}.title must be non-empty.`);
    if (!(boundary.parent_feature_code === null || (isNonEmptyString(boundary.parent_feature_code) && CODE_PATTERN.test(boundary.parent_feature_code)))) errors.push(`${item}.parent_feature_code is invalid.`);
    if (!Number.isInteger(boundary.sibling_order) || boundary.sibling_order < 0) errors.push(`${item}.sibling_order must be non-negative.`);
    if (!isNonEmptyString(boundary.outline_node_id) || nodes.has(boundary.outline_node_id)) errors.push(`${item}.outline_node_id must be unique and non-empty.`);
    else nodes.add(boundary.outline_node_id);
    if (boundary.lifecycle !== "active") errors.push(`${item}.lifecycle must be active.`);
    if (!Array.isArray(boundary.predecessor_codes) || boundary.predecessor_codes.some((code) => !CODE_PATTERN.test(code)) || new Set(boundary.predecessor_codes || []).size !== (boundary.predecessor_codes || []).length) errors.push(`${item}.predecessor_codes must contain unique stable codes.`);
    validateSource(boundary.boundary_source, boundary, item, errors);
    if (isNonEmptyString(boundary.feature_code)) byCode.set(boundary.feature_code, boundary);
  }
  for (const boundary of boundaries) {
    if (!isObject(boundary) || !isNonEmptyString(boundary.feature_code)) continue;
    if (boundary.parent_feature_code === null) {
      if (boundary.sibling_order !== 0) errors.push(`${label} root ${boundary.feature_code} must use sibling_order 0.`);
    } else {
      if (!byCode.has(boundary.parent_feature_code)) errors.push(`${label} boundary ${boundary.feature_code} references missing parent ${boundary.parent_feature_code}.`);
      if (boundary.sibling_order < 1) errors.push(`${label} child ${boundary.feature_code} must use sibling_order >= 1.`);
      const slot = `${boundary.parent_feature_code}:${boundary.sibling_order}`;
      if (siblings.has(slot)) errors.push(`${label} duplicates sibling slot ${slot}.`);
      siblings.add(slot);
    }
    const visited = new Set([boundary.feature_code]);
    let cursor = boundary;
    while (cursor?.parent_feature_code !== null) {
      cursor = byCode.get(cursor.parent_feature_code);
      if (!cursor) break;
      if (visited.has(cursor.feature_code)) {
        errors.push(`${label} hierarchy contains a cycle through ${cursor.feature_code}.`);
        break;
      }
      visited.add(cursor.feature_code);
    }
  }
  const root = boundaries.find((boundary) => boundary?.feature === rootFeature);
  if (!root) errors.push(`${label} must contain root_feature ${rootFeature}.`);
  else if (root.parent_feature_code !== null || root.boundary_source?.kind !== "root") errors.push(`${label} root_feature must use root boundary and no parent.`);
  if (root?.feature_code !== "000" || !root?.feature?.startsWith("000-")) errors.push(`${label} root_feature must use feature_code 000 and a 000-* feature slug.`);
  if (codes.has("000") && root?.feature_code !== "000") errors.push(`${label} feature_code 000 is reserved for root_feature.`);
  for (const boundary of boundaries) {
    if (!isObject(boundary) || boundary.feature === rootFeature) continue;
    let cursor = boundary;
    const visited = new Set();
    while (cursor && !visited.has(cursor.feature_code) && cursor.feature !== rootFeature) {
      visited.add(cursor.feature_code);
      cursor = byCode.get(cursor.parent_feature_code);
    }
    if (!cursor || cursor.feature !== rootFeature) errors.push(`${label} boundary ${boundary.feature_code} does not descend from root_feature.`);
  }

  const tombstoneCodes = new Set();
  for (const [index, tombstone] of (Array.isArray(tombstones) ? tombstones : []).entries()) {
    const item = `${label}.tombstones[${index}]`;
    if (!exactKeys(tombstone, TOMBSTONE_KEYS, item, errors)) continue;
    if (!isNonEmptyString(tombstone.feature_code) || !CODE_PATTERN.test(tombstone.feature_code) || tombstoneCodes.has(tombstone.feature_code)) errors.push(`${item}.feature_code must be unique.`);
    else tombstoneCodes.add(tombstone.feature_code);
    if (codes.has(tombstone.feature_code)) errors.push(`${item}.feature_code is still active.`);
    if (!isNonEmptyString(tombstone.feature) || !FEATURE_PATTERN.test(tombstone.feature) || !isNonEmptyString(tombstone.title)) errors.push(`${item} feature and title must be valid.`);
    if (!isTimestamp(tombstone.retired_at) || !isNonEmptyString(tombstone.reason)) errors.push(`${item} retired_at and reason are required.`);
    if (!Array.isArray(tombstone.successor_codes) || tombstone.successor_codes.some((code) => !CODE_PATTERN.test(code) || !codes.has(code)) || new Set(tombstone.successor_codes || []).size !== (tombstone.successor_codes || []).length) errors.push(`${item}.successor_codes must name unique active boundaries.`);
  }
  for (const boundary of boundaries) {
    for (const predecessor of boundary?.predecessor_codes || []) {
      if (!tombstoneCodes.has(predecessor)) errors.push(`${label} boundary ${boundary.feature_code} references missing tombstone ${predecessor}.`);
      const tombstone = (tombstones || []).find((entry) => entry?.feature_code === predecessor);
      if (!tombstone?.successor_codes?.includes(boundary.feature_code)) errors.push(`${label} predecessor/successor link is not reciprocal for ${predecessor} -> ${boundary.feature_code}.`);
    }
  }
  for (const tombstone of (Array.isArray(tombstones) ? tombstones : [])) {
    for (const successor of tombstone?.successor_codes || []) {
      const boundary = byCode.get(successor);
      if (!boundary?.predecessor_codes?.includes(tombstone.feature_code)) {
        errors.push(`${label} predecessor/successor link is not reciprocal for ${tombstone.feature_code} -> ${successor}.`);
      }
    }
  }
}

function validateBaseline(baseline, rootFeature, errors) {
  if (!exactKeys(baseline, BASELINE_KEYS, "current_baseline", errors)) return;
  if (!isNonEmptyString(baseline.baseline_id) || !DIGEST_PATTERN.test(baseline.baseline_digest || "")) errors.push("current_baseline identity/digest is invalid.");
  if (!isTimestamp(baseline.created_at) || !isNonEmptyString(baseline.created_by) || !isRepoRef(baseline.decision_ref)) errors.push("current_baseline provenance is incomplete or decision_ref is unsafe.");
  validateBoundarySet(baseline.project_boundaries, baseline.tombstones, rootFeature, "current_baseline", errors);
  if (DIGEST_PATTERN.test(baseline.baseline_digest || "") && computeBaselineDigest(baseline) !== baseline.baseline_digest) errors.push("current_baseline.baseline_digest does not match canonical content.");
}

function validateProposal(proposal, rootFeature, errors) {
  if (!exactKeys(proposal, PROPOSAL_KEYS, "proposed_baseline", errors)) return;
  if (!isNonEmptyString(proposal.baseline_id) || !DIGEST_PATTERN.test(proposal.proposal_digest || "")) errors.push("proposed_baseline identity/digest is invalid.");
  if (!(proposal.base_baseline_id === null || isNonEmptyString(proposal.base_baseline_id))) errors.push("proposed_baseline.base_baseline_id is invalid.");
  if (!(proposal.base_baseline_digest === null || DIGEST_PATTERN.test(proposal.base_baseline_digest))) errors.push("proposed_baseline.base_baseline_digest is invalid.");
  if (!isTimestamp(proposal.created_at) || !isNonEmptyString(proposal.created_by) || !(proposal.decision_ref === null || isRepoRef(proposal.decision_ref)) || !isNonEmptyString(proposal.change_reason)) errors.push("proposed_baseline provenance is incomplete or decision_ref is unsafe.");
  validateBoundarySet(proposal.project_boundaries, proposal.tombstones, rootFeature, "proposed_baseline", errors);
  if (DIGEST_PATTERN.test(proposal.proposal_digest || "") && computeProposalDigest(proposal) !== proposal.proposal_digest) errors.push("proposed_baseline.proposal_digest does not match canonical content.");
}

function validateBoundaryDelta(current, proposal, errors) {
  if (proposal.baseline_id === current.baseline_id) {
    errors.push("proposed_baseline.baseline_id must differ from current_baseline.baseline_id.");
  }
  const proposedActive = new Map(proposal.project_boundaries.map((item) => [item.feature_code, item]));
  const proposedTombstones = new Map(proposal.tombstones.map((item) => [item.feature_code, item]));
  for (const tombstone of current.tombstones) {
    const retained = proposedTombstones.get(tombstone.feature_code);
    if (!retained || stableStringify(retained) !== stableStringify(tombstone)) {
      errors.push(`proposed_baseline must retain historical tombstone ${tombstone.feature_code} unchanged.`);
    }
    if (proposedActive.has(tombstone.feature_code)) {
      errors.push(`proposed_baseline cannot reactivate tombstoned feature code ${tombstone.feature_code}.`);
    }
  }
  for (const boundary of current.project_boundaries) {
    if (proposedActive.has(boundary.feature_code)) continue;
    const retired = proposedTombstones.get(boundary.feature_code);
    if (!retired) {
      errors.push(`proposed_baseline must create a tombstone when active feature code ${boundary.feature_code} is removed.`);
      continue;
    }
    if (retired.feature !== boundary.feature || retired.title !== boundary.title) {
      errors.push(`proposed_baseline tombstone ${boundary.feature_code} must preserve the retired feature identity and title.`);
    }
  }
}

function validateLock(lock, transition, errors) {
  if (lock === null) return;
  if (!exactKeys(lock, LOCK_KEYS, "transition.lock", errors)) return;
  if (!isNonEmptyString(lock.owner_id) || lock.transition_id !== transition.transition_id || lock.transition_revision !== transition.transition_revision) errors.push("transition.lock identity does not match the transition.");
  if (!(lock.baseline_digest === null || DIGEST_PATTERN.test(lock.baseline_digest))) errors.push("transition.lock.baseline_digest is invalid.");
  if (!(lock.pid === null || (Number.isInteger(lock.pid) && lock.pid >= 1))) errors.push("transition.lock.pid is invalid.");
  if (![lock.created_at, lock.heartbeat_at, lock.lease_expires_at].every(isTimestamp)) errors.push("transition.lock timestamps are invalid.");
  if (lock.lease_seconds !== 300 || lock.heartbeat_seconds !== 30) errors.push("transition.lock must use lease_seconds 300 and heartbeat_seconds 30.");
  const heartbeat = Date.parse(lock.heartbeat_at);
  const expires = Date.parse(lock.lease_expires_at);
  if (Number.isFinite(heartbeat) && Number.isFinite(expires) && expires - heartbeat !== 300000) errors.push("transition.lock lease_expires_at must be exactly 300 seconds after heartbeat_at.");
}

function validateTransition(transition, current, proposal, state, errors) {
  if (!exactKeys(transition, TRANSITION_KEYS, "transition", errors)) return;
  if (!isNonEmptyString(transition.transition_id) || !Number.isInteger(transition.transition_revision) || transition.transition_revision < 1) errors.push("transition identity/revision is invalid.");
  if (!(transition.base_baseline_id === null || isNonEmptyString(transition.base_baseline_id)) || !(transition.base_baseline_digest === null || DIGEST_PATTERN.test(transition.base_baseline_digest))) errors.push("transition base baseline identity is invalid.");
  if (!DIGEST_PATTERN.test(transition.proposal_digest || "") || !isTimestamp(transition.started_at) || !isTimestamp(transition.updated_at)) errors.push("transition digest/timestamps are invalid.");
  if (!Array.isArray(transition.completed_steps) || transition.completed_steps.some((step) => !isNonEmptyString(step)) || new Set(transition.completed_steps || []).size !== (transition.completed_steps || []).length) errors.push("transition.completed_steps must contain unique non-empty values.");
  if (!isNonEmptyString(transition.next_action) || !(transition.rollback_ref === null || isRepoRef(transition.rollback_ref))) errors.push("transition next_action/rollback_ref is invalid.");
  validateLock(transition.lock, transition, errors);
  if (current && (transition.base_baseline_id !== current.baseline_id || transition.base_baseline_digest !== current.baseline_digest)
    && state !== "MIGRATION_BLOCKED") errors.push("transition base baseline does not match current_baseline.");
  if (!current && (transition.base_baseline_id !== null || transition.base_baseline_digest !== null)) errors.push("legacy adoption transition must use null base baseline identity.");
  if (proposal && transition.proposal_digest !== proposal.proposal_digest) errors.push("transition proposal_digest does not match proposed_baseline.");

  const targetCodes = new Set(proposal?.project_boundaries?.map((boundary) => boundary.feature_code) || []);
  const reassignmentRefs = new Set();
  if (!Array.isArray(transition.artifact_reassignments)) errors.push("transition.artifact_reassignments must be an array.");
  for (const [index, item] of (transition.artifact_reassignments || []).entries()) {
    const label = `transition.artifact_reassignments[${index}]`;
    if (!exactKeys(item, REASSIGNMENT_KEYS, label, errors)) continue;
    if (!ARTIFACT_TYPES.has(item.artifact_type) || !isRepoRef(item.artifact_ref) || !REASSIGNMENT_DISPOSITIONS.has(item.disposition) || !isNonEmptyString(item.reason)) errors.push(`${label} is invalid.`);
    const normalizedRef = `${item.artifact_type}:${String(item.artifact_ref).normalize("NFC").toLowerCase()}`;
    if (reassignmentRefs.has(normalizedRef)) errors.push(`${label}.artifact_ref duplicates another reassignment after path normalization.`);
    reassignmentRefs.add(normalizedRef);
    if (item.disposition === "successor") {
      if (!CODE_PATTERN.test(item.target_feature_code || "") || !targetCodes.has(item.target_feature_code)) errors.push(`${label} successor must name an active proposed feature.`);
    } else if (item.target_feature_code !== null) errors.push(`${label} target_feature_code must be null unless disposition is successor.`);
  }
  if (!Array.isArray(transition.impact_assessments)) errors.push("transition.impact_assessments must be an array.");
  const impactRefs = new Set();
  for (const [index, impact] of (transition.impact_assessments || []).entries()) {
    const label = `transition.impact_assessments[${index}]`;
    if (!exactKeys(impact, IMPACT_KEYS, label, errors)) continue;
    if (!ARTIFACT_TYPES.has(impact.artifact_type) || !isRepoRef(impact.artifact_ref) || !IMPACT_OUTCOMES.has(impact.outcome) || !Array.isArray(impact.evidence)) errors.push(`${label} is invalid.`);
    const normalizedRef = `${impact.artifact_type}:${String(impact.artifact_ref).normalize("NFC").toLowerCase()}`;
    if (impactRefs.has(normalizedRef)) errors.push(`${label}.artifact_ref duplicates another impact after path normalization.`);
    impactRefs.add(normalizedRef);
    for (const [evidenceIndex, evidence] of (impact.evidence || []).entries()) {
      const evidenceLabel = `${label}.evidence[${evidenceIndex}]`;
      if (!exactKeys(evidence, EVIDENCE_KEYS, evidenceLabel, errors)) continue;
      if (!EVIDENCE_TYPES.has(evidence.evidence_type) || !isRepoRef(evidence.ref) || !DIGEST_PATTERN.test(evidence.source_digest || "") || !isTimestamp(evidence.verified_at) || !isNonEmptyString(evidence.verifier) || !EVIDENCE_RESULTS.has(evidence.result)) errors.push(`${evidenceLabel} is invalid.`);
      if (proposal && isTimestamp(evidence.verified_at) && Date.parse(evidence.verified_at) < Date.parse(proposal.created_at)) errors.push(`${evidenceLabel}.verified_at predates the proposed baseline.`);
      if (isTimestamp(evidence.verified_at) && Date.parse(evidence.verified_at) > Date.now() + 300000) errors.push(`${evidenceLabel}.verified_at is unreasonably far in the future.`);
    }
    if (impact.outcome === "UNCHANGED_WITH_EVIDENCE" && impact.evidence.length === 0) errors.push(`${label} requires evidence for UNCHANGED_WITH_EVIDENCE.`);
  }
  if (state === "CROSS_ARTIFACT_VALIDATED"
    && (transition.impact_assessments || []).some((impact) => impact?.outcome === "BLOCKED")) {
    errors.push("CROSS_ARTIFACT_VALIDATED cannot contain BLOCKED impact assessments.");
  }
  if (state === "CROSS_ARTIFACT_VALIDATED"
    && (transition.artifact_reassignments || []).some((item) => item?.disposition === "blocked")) {
    errors.push("CROSS_ARTIFACT_VALIDATED cannot contain blocked artifact reassignments.");
  }
}

export function validateOutlineBoundaries(document) {
  const errors = [];
  if (!exactKeys(document, ROOT_KEYS, "outline-boundaries", errors)) return errors;
  if (document.schema_version !== 1) errors.push("outline-boundaries schema_version must be 1.");
  if (!isNonEmptyString(document.root_feature) || !FEATURE_PATTERN.test(document.root_feature) || document.root_feature.includes("..") || !document.root_feature.startsWith("000-")) errors.push("root_feature must be a safe 000-* Portfolio feature slug.");
  if (!isTimestamp(document.updated_at)) errors.push("updated_at must be an ISO-8601 timestamp.");
  if (!TRANSITION_STATES.has(document.transition_state)) errors.push("transition_state is invalid; ALIGNED_NEW_BASELINE is an event, not a state.");
  const hasCurrent = isObject(document.current_baseline);
  const hasProposal = isObject(document.proposed_baseline);
  const hasTransition = isObject(document.transition);
  if (!(document.current_baseline === null || hasCurrent)) errors.push("current_baseline must be null or an object.");
  if (!(document.proposed_baseline === null || hasProposal)) errors.push("proposed_baseline must be null or an object.");
  if (!(document.transition === null || hasTransition)) errors.push("transition must be null or an object.");
  if (hasCurrent) validateBaseline(document.current_baseline, document.root_feature, errors);
  if (hasProposal) validateProposal(document.proposed_baseline, document.root_feature, errors);
  if (document.transition_state === "ALIGNED") {
    if (!hasCurrent || hasProposal || hasTransition) errors.push("ALIGNED requires current_baseline and forbids proposed_baseline/transition.");
  } else if (document.transition_state === "LEGACY_ADOPTION_REQUIRED") {
    if (hasCurrent || !hasProposal) errors.push("LEGACY_ADOPTION_REQUIRED requires no current_baseline and one proposed_baseline candidate.");
    if (document.proposed_baseline?.base_baseline_id !== null || document.proposed_baseline?.base_baseline_digest !== null) errors.push("legacy adoption proposal must use null base baseline identity.");
  } else if (!hasCurrent || !hasProposal || !hasTransition) errors.push(`${document.transition_state} requires current_baseline, proposed_baseline, and transition.`);
  if (hasCurrent && hasProposal && document.transition_state !== "MIGRATION_BLOCKED") {
    if (document.proposed_baseline.base_baseline_id !== document.current_baseline.baseline_id || document.proposed_baseline.base_baseline_digest !== document.current_baseline.baseline_digest) errors.push("proposed_baseline base identity does not match current_baseline.");
  }
  if (hasCurrent && hasProposal) validateBoundaryDelta(document.current_baseline, document.proposed_baseline, errors);
  if (hasTransition) validateTransition(document.transition, hasCurrent ? document.current_baseline : null, hasProposal ? document.proposed_baseline : null, document.transition_state, errors);
  return [...new Set(errors)];
}

export function validateTransitionEvent(event) {
  const errors = [];
  if (!exactKeys(event, TRANSITION_EVENT_KEYS, "outline-transition-event", errors)) return errors;
  if (event.schema_version !== 1) errors.push("outline-transition-event schema_version must be 1.");
  if (!isNonEmptyString(event.event_id) || !TRANSITION_EVENT_TYPES.has(event.event_type)) errors.push("outline-transition-event identity/type is invalid.");
  if (!isNonEmptyString(event.transition_id) || !Number.isInteger(event.transition_revision) || event.transition_revision < 1) errors.push("outline-transition-event transition identity is invalid.");
  if (!isTimestamp(event.occurred_at) || !isNonEmptyString(event.step)) errors.push("outline-transition-event time/step is invalid.");
  if (!(event.baseline_id === null || isNonEmptyString(event.baseline_id))) errors.push("outline-transition-event baseline_id is invalid.");
  if (!(event.baseline_digest === null || DIGEST_PATTERN.test(event.baseline_digest))) errors.push("outline-transition-event baseline_digest is invalid.");
  if (!DIGEST_PATTERN.test(event.details_digest || "")) errors.push("outline-transition-event details_digest is invalid.");
  return [...new Set(errors)];
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function unlinkWithRetry(path, { allowMissing = false } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await unlink(path);
      return true;
    } catch (error) {
      if (error.code === "ENOENT" && allowMissing) return false;
      if (!TRANSIENT_UNLINK_CODES.has(error.code) || attempt >= RENAME_RETRY_DELAYS.length) throw error;
      await delay(RENAME_RETRY_DELAYS[attempt]);
    }
  }
}

export async function writeJsonExclusive(targetArgument, value, mode = 0o600) {
  const target = resolve(targetArgument);
  let handle;
  let created = false;
  try {
    handle = await open(target, "wx", mode);
    created = true;
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.chmod(mode);
    await handle.sync();
    await handle.close();
    handle = null;
    try {
      const directory = await open(dirname(target), "r");
      await directory.sync().catch(() => undefined);
      await directory.close();
    } catch {
      // Directory fsync is unavailable on some Windows/filesystem combinations.
    }
  } catch (error) {
    const cleanupErrors = [];
    if (handle) {
      await handle.close().catch((cleanupError) => cleanupErrors.push(`close: ${cleanupError.code || cleanupError.message}`));
    }
    if (created) {
      await unlinkWithRetry(target, { allowMissing: true })
        .catch((cleanupError) => cleanupErrors.push(`remove ${target}: ${cleanupError.code || cleanupError.message}`));
    }
    if (cleanupErrors.length) {
      throw new Error(`${error.message} Exclusive-file cleanup also failed: ${cleanupErrors.join("; ")}`);
    }
    throw error;
  }
}

export async function appendTransitionEvent(journalArgument, event) {
  const errors = validateTransitionEvent(event);
  if (errors.length) throw new Error(`Transition event is invalid:\n${errors.join("\n")}`);
  const journal = resolve(journalArgument);
  let mode = 0o600;
  let existed = true;
  try {
    mode = (await stat(journal)).mode & 0o777;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    existed = false;
  }
  const handle = await open(journal, "a", mode);
  try {
    await handle.writeFile(`${JSON.stringify(event)}\n`, "utf8");
    await handle.chmod(mode);
    await handle.sync();
  } finally {
    await handle.close();
  }
  if (!existed) {
    try {
      const directory = await open(dirname(journal), "r");
      await directory.sync().catch(() => undefined);
      await directory.close();
    } catch {
      // Directory fsync is unavailable on some Windows/filesystem combinations.
    }
  }
}

async function delay(milliseconds) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function renameWithRetry(source, target) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(source, target);
      return;
    } catch (error) {
      if (!TRANSIENT_RENAME_CODES.has(error.code) || attempt >= RENAME_RETRY_DELAYS.length) throw error;
      await delay(RENAME_RETRY_DELAYS[attempt]);
    }
  }
}

export async function atomicWriteJson(targetArgument, value, defaultMode = 0o600) {
  const target = resolve(targetArgument);
  let mode = defaultMode;
  try {
    mode = (await stat(target)).mode & 0o777;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const temporary = join(dirname(target), `.${basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  let handle;
  try {
    handle = await open(temporary, "wx", mode);
    await handle.writeFile(content, "utf8");
    await handle.chmod(mode);
    await handle.sync();
    await handle.close();
    handle = null;
    await renameWithRetry(temporary, target);
    try {
      const directory = await open(dirname(target), "r");
      await directory.sync().catch(() => undefined);
      await directory.close();
    } catch {
      // Directory fsync is unavailable on some Windows/filesystem combinations.
    }
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}
