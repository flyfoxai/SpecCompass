import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  atomicWriteJson,
  readJson,
  sha256,
  stableStringify,
  validateOutlineBoundaries
} from "./outline-boundaries-lib.mjs";
import {
  assertLeaseClaim,
  refreshLeaseClaim,
  withLeaseClaim
} from "./lease-claim-lib.mjs";

const LEDGER_KEYS = new Set([
  "schema_version", "scope", "numbering_strategy", "minimum_width",
  "ledger_revision", "ledger_digest", "next_sequence", "updated_at", "entries"
]);
const ENTRY_KEYS = new Set([
  "allocation_id", "feature_code", "feature", "previous_features", "status",
  "proposal_id", "transition_id", "created_at", "updated_at", "reason"
]);
const STATUSES = new Set(["reserved", "active", "retired", "void"]);
const CODE_PATTERN = /^(?:[0-9]{3,}|[0-9]{8}-[0-9]{6})$/;
const SEQUENTIAL_CODE_PATTERN = /^[0-9]{3,}$/;
const TIMESTAMP_CODE_PATTERN = /^[0-9]{8}-[0-9]{6}$/;
const FEATURE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const LOCK_LEASE_MS = 60000;
const LOCK_HEARTBEAT_MS = 20000;
const LOCK_RETRY_DELAYS = [0, 25, 75, 150, 300];

function exactKeys(value, allowed, label, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label} must be an object.`);
    return false;
  }
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !(key in value));
  if (unknown.length) errors.push(`${label} has unsupported fields: ${unknown.join(", ")}.`);
  if (missing.length) errors.push(`${label} is missing fields: ${missing.join(", ")}.`);
  return !unknown.length && !missing.length;
}

function isTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function sequentialValue(code) {
  if (!SEQUENTIAL_CODE_PATTERN.test(code || "")) return null;
  const value = Number.parseInt(code, 10);
  return Number.isSafeInteger(value) ? value : null;
}

function formatCode(value, width = 3) {
  return String(value).padStart(width, "0");
}

function ledgerPayload(ledger) {
  const { ledger_digest: _ignored, ...payload } = ledger;
  return payload;
}

export function computeFeatureCodeLedgerDigest(ledger) {
  return sha256(ledgerPayload(ledger));
}

export function validateFeatureCodeLedger(ledger) {
  const errors = [];
  if (!exactKeys(ledger, LEDGER_KEYS, "feature-code-ledger", errors)) return errors;
  if (ledger.schema_version !== 1) errors.push("feature-code-ledger schema_version must be 1.");
  if (ledger.scope !== "repository") errors.push("feature-code-ledger scope must be repository.");
  if (ledger.numbering_strategy !== "sequential" || ledger.minimum_width !== 3) {
    errors.push("feature-code-ledger must use sequential numbering with minimum_width 3.");
  }
  if (!Number.isInteger(ledger.ledger_revision) || ledger.ledger_revision < 1) errors.push("ledger_revision must be a positive integer.");
  if (!DIGEST_PATTERN.test(ledger.ledger_digest || "")) errors.push("ledger_digest must be a SHA-256 digest.");
  if (!isTimestamp(ledger.updated_at)) errors.push("updated_at must be an ISO-8601 timestamp.");
  if (!Array.isArray(ledger.entries)) {
    errors.push("entries must be an array.");
    return errors;
  }

  const codes = new Set();
  const allocationIds = new Set();
  let highestSequential = 0;
  for (const [index, entry] of ledger.entries.entries()) {
    const label = `entries[${index}]`;
    if (!exactKeys(entry, ENTRY_KEYS, label, errors)) continue;
    if (typeof entry.allocation_id !== "string" || !entry.allocation_id.trim() || allocationIds.has(entry.allocation_id)) {
      errors.push(`${label}.allocation_id must be non-empty and unique.`);
    } else allocationIds.add(entry.allocation_id);
    if (!CODE_PATTERN.test(entry.feature_code || "") || codes.has(entry.feature_code)) {
      errors.push(`${label}.feature_code must be valid and unique.`);
    } else codes.add(entry.feature_code);
    const numeric = sequentialValue(entry.feature_code);
    if (numeric !== null) highestSequential = Math.max(highestSequential, numeric);
    if (!FEATURE_PATTERN.test(entry.feature || "") || !entry.feature.startsWith(`${entry.feature_code}-`)) {
      errors.push(`${label}.feature must start with feature_code and be a safe feature name.`);
    }
    if (!Array.isArray(entry.previous_features) || new Set(entry.previous_features || []).size !== (entry.previous_features || []).length
      || (entry.previous_features || []).some((feature) => !FEATURE_PATTERN.test(feature) || !feature.startsWith(`${entry.feature_code}-`) || feature === entry.feature)) {
      errors.push(`${label}.previous_features must contain unique prior names for the same code.`);
    }
    if (!STATUSES.has(entry.status)) errors.push(`${label}.status is invalid.`);
    if (entry.status === "reserved" && (typeof entry.proposal_id !== "string" || !entry.proposal_id.trim())) {
      errors.push(`${label}.proposal_id is required for a reserved code.`);
    }
    if (!(entry.proposal_id === null || (typeof entry.proposal_id === "string" && entry.proposal_id.trim()))) errors.push(`${label}.proposal_id is invalid.`);
    if (!(entry.transition_id === null || (typeof entry.transition_id === "string" && entry.transition_id.trim()))) errors.push(`${label}.transition_id is invalid.`);
    if (!isTimestamp(entry.created_at) || !isTimestamp(entry.updated_at)) errors.push(`${label} timestamps are invalid.`);
    if (typeof entry.reason !== "string" || !entry.reason.trim()) errors.push(`${label}.reason must be non-empty.`);
    if (TIMESTAMP_CODE_PATTERN.test(entry.feature_code || "") && !["active", "retired"].includes(entry.status)) {
      errors.push(`${label} timestamp codes are legacy-only and cannot be reserved or void.`);
    }
    if (entry.feature_code === "000" && !["active", "retired"].includes(entry.status)) {
      errors.push(`${label} code 000 is reserved for the root and cannot be ${entry.status}.`);
    }
  }
  if (!Number.isInteger(ledger.next_sequence) || ledger.next_sequence < 1 || ledger.next_sequence <= highestSequential) {
    errors.push("next_sequence must be a positive integer greater than every allocated sequential code.");
  }
  if (DIGEST_PATTERN.test(ledger.ledger_digest || "") && computeFeatureCodeLedgerDigest(ledger) !== ledger.ledger_digest) {
    errors.push("ledger_digest does not match canonical content.");
  }
  return [...new Set(errors)];
}

function boundaryRecords(document) {
  const baseline = document?.current_baseline;
  return {
    active: Array.isArray(baseline?.project_boundaries) ? baseline.project_boundaries : [],
    retired: Array.isArray(baseline?.tombstones) ? baseline.tombstones : []
  };
}

function assertValidBoundaries(document) {
  const errors = validateOutlineBoundaries(document);
  if (errors.length) throw new Error(`outline-boundaries is invalid:\n${errors.join("\n")}`);
}

function newEntry({ featureCode, feature, status, proposalId = null, transitionId = null, timestamp, reason }) {
  return {
    allocation_id: randomUUID(),
    feature_code: featureCode,
    feature,
    previous_features: [],
    status,
    proposal_id: proposalId,
    transition_id: transitionId,
    created_at: timestamp,
    updated_at: timestamp,
    reason
  };
}

function finalizeLedger(ledger, { incrementRevision = true, timestamp = new Date().toISOString() } = {}) {
  ledger.updated_at = timestamp;
  if (incrementRevision) ledger.ledger_revision += 1;
  ledger.ledger_digest = "";
  ledger.ledger_digest = computeFeatureCodeLedgerDigest(ledger);
  const errors = validateFeatureCodeLedger(ledger);
  if (errors.length) throw new Error(`feature-code-ledger is invalid:\n${errors.join("\n")}`);
  return ledger;
}

export function createFeatureCodeLedger(document, timestamp = new Date().toISOString()) {
  const { active, retired } = boundaryRecords(document);
  const entries = [
    ...active.map((boundary) => newEntry({
      featureCode: boundary.feature_code,
      feature: boundary.feature,
      status: "active",
      timestamp,
      reason: "Imported from the authoritative current baseline."
    })),
    ...retired.map((tombstone) => newEntry({
      featureCode: tombstone.feature_code,
      feature: tombstone.feature,
      status: "retired",
      timestamp,
      reason: "Imported from an authoritative baseline tombstone."
    }))
  ];
  const highest = entries.reduce((value, entry) => Math.max(value, sequentialValue(entry.feature_code) || 0), 0);
  const ledger = {
    schema_version: 1,
    scope: "repository",
    numbering_strategy: "sequential",
    minimum_width: 3,
    ledger_revision: 1,
    ledger_digest: "",
    next_sequence: Math.max(1, highest + 1),
    updated_at: timestamp,
    entries
  };
  ledger.ledger_digest = computeFeatureCodeLedgerDigest(ledger);
  const errors = validateFeatureCodeLedger(ledger);
  if (errors.length) throw new Error(`initial feature-code-ledger is invalid:\n${errors.join("\n")}`);
  return ledger;
}

function updateFeature(entry, feature, timestamp) {
  if (entry.feature === feature) return false;
  if (!entry.previous_features.includes(entry.feature)) entry.previous_features.push(entry.feature);
  entry.feature = feature;
  entry.updated_at = timestamp;
  return true;
}

function reconcileInMemory(ledger, document, timestamp) {
  let changed = false;
  const byCode = new Map(ledger.entries.map((entry) => [entry.feature_code, entry]));
  const { active, retired } = boundaryRecords(document);
  for (const boundary of active) {
    const existing = byCode.get(boundary.feature_code);
    if (!existing) {
      const entry = newEntry({
        featureCode: boundary.feature_code,
        feature: boundary.feature,
        status: "active",
        timestamp,
        reason: "Adopted from the authoritative current baseline."
      });
      ledger.entries.push(entry);
      byCode.set(entry.feature_code, entry);
      changed = true;
      continue;
    }
    if (["retired", "void"].includes(existing.status)) throw new Error(`Code ${boundary.feature_code} cannot become active from ${existing.status}.`);
    changed = updateFeature(existing, boundary.feature, timestamp) || changed;
    if (existing.status !== "active") {
      existing.status = "active";
      existing.updated_at = timestamp;
      existing.reason = "Activated by the authoritative Outline baseline.";
      changed = true;
    }
  }
  for (const tombstone of retired) {
    const existing = byCode.get(tombstone.feature_code);
    if (!existing) {
      const entry = newEntry({
        featureCode: tombstone.feature_code,
        feature: tombstone.feature,
        status: "retired",
        timestamp,
        reason: "Adopted from an authoritative baseline tombstone."
      });
      ledger.entries.push(entry);
      byCode.set(entry.feature_code, entry);
      changed = true;
      continue;
    }
    if (existing.status === "void") throw new Error(`Void code ${tombstone.feature_code} cannot become an authoritative tombstone.`);
    changed = updateFeature(existing, tombstone.feature, timestamp) || changed;
    if (existing.status !== "retired") {
      existing.status = "retired";
      existing.updated_at = timestamp;
      existing.reason = "Retired by the authoritative Outline baseline.";
      changed = true;
    }
  }
  const highest = ledger.entries.reduce((value, entry) => Math.max(value, sequentialValue(entry.feature_code) || 0), 0);
  if (ledger.next_sequence <= highest) {
    ledger.next_sequence = highest + 1;
    changed = true;
  }
  return changed;
}

async function readLedgerOrCreate(ledgerPath, document) {
  try {
    const ledger = await readJson(ledgerPath);
    const errors = validateFeatureCodeLedger(ledger);
    if (errors.length) throw new Error(`feature-code-ledger is invalid:\n${errors.join("\n")}`);
    return { ledger, created: false };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { ledger: createFeatureCodeLedger(document), created: true };
  }
}

export function featureCodeLedgerPath(boundariesPath) {
  const target = resolve(boundariesPath);
  if (basename(target) !== "outline-boundaries.json" || basename(dirname(dirname(target))) !== "specs") {
    throw new Error("Authoritative boundaries must use specs/<root-feature>/outline-boundaries.json.");
  }
  return join(dirname(dirname(target)), "feature-code-ledger.json");
}

export function assertFeatureCodeLedgerLocation(ledgerPath, boundariesPath) {
  const expected = featureCodeLedgerPath(boundariesPath);
  if (resolve(ledgerPath) !== expected) throw new Error(`Feature-code ledger must use ${expected}.`);
  return expected;
}

export async function withFeatureCodeLedgerLock(ledgerPath, callback) {
  const target = resolve(ledgerPath);
  const lockPath = join(dirname(target), `.${basename(target)}.lock`);
  return withLeaseClaim(lockPath, {
    label: "Feature-code ledger lock",
    leaseMilliseconds: LOCK_LEASE_MS,
    heartbeatMilliseconds: LOCK_HEARTBEAT_MS,
    retryDelays: LOCK_RETRY_DELAYS,
    activeMessage: "Another process owns the feature-code ledger lock. Retry the operation after the active writer completes."
  }, callback);
}

async function saveLedger(ledgerPath, ledger, { created = false, changed = true, lock } = {}) {
  if (!created && !changed) return ledger;
  if (!lock) throw new Error("Feature-code ledger writes require an owned lease claim.");
  if (changed) finalizeLedger(ledger);
  await refreshLeaseClaim(lock);
  await assertLeaseClaim(lock);
  await atomicWriteJson(ledgerPath, ledger, 0o600);
  await assertLeaseClaim(lock);
  return ledger;
}

export async function ensureFeatureCodeLedger(ledgerPath, document) {
  assertValidBoundaries(document);
  return withFeatureCodeLedgerLock(ledgerPath, async (lock) => {
    const { ledger, created } = await readLedgerOrCreate(ledgerPath, document);
    const changed = reconcileInMemory(ledger, document, new Date().toISOString());
    return saveLedger(ledgerPath, ledger, { created, changed, lock });
  });
}

function observedSequentialMaximum(ledgerPath) {
  const specsRoot = dirname(resolve(ledgerPath));
  const repositoryRoot = dirname(specsRoot);
  let highest = 0;
  return readdir(specsRoot, { withFileTypes: true }).catch(() => []).then((entries) => {
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const match = entry.name.match(/^([0-9]{3,})-/);
      if (match && !/^[0-9]{8}-[0-9]{6}-/.test(entry.name)) highest = Math.max(highest, Number.parseInt(match[1], 10));
    }
    const refs = spawnSync("git", ["-C", repositoryRoot, "for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"], {
      encoding: "utf8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      timeout: 10000,
      killSignal: "SIGKILL"
    });
    if (refs.error?.code === "ETIMEDOUT") throw new Error("Feature-code branch scan exceeded 10 seconds; no code was reserved.");
    if (refs.status === 0) {
      for (const ref of refs.stdout.split(/\r?\n/)) {
        const match = ref.match(/(?:^|\/)([0-9]{3,})-/);
        if (match && !/[0-9]{8}-[0-9]{6}-/.test(ref)) highest = Math.max(highest, Number.parseInt(match[1], 10));
      }
    }
    return highest;
  });
}

export async function reserveFeatureCode(ledgerPath, document, { slug, proposalId, reason }) {
  assertValidBoundaries(document);
  if (document.transition_state !== "ALIGNED") throw new Error(`Feature codes can be reserved only from ALIGNED, got ${document.transition_state}.`);
  if (!SLUG_PATTERN.test(slug || "")) throw new Error("Feature slug must contain lowercase letters, digits, and single hyphen-separated words.");
  if (typeof proposalId !== "string" || !proposalId.trim()) throw new Error("proposal_id is required to reserve a feature code.");
  if (proposalId === document.current_baseline?.baseline_id) throw new Error("proposal_id must differ from the current baseline_id.");
  if (typeof reason !== "string" || !reason.trim()) throw new Error("A non-empty reservation reason is required.");
  return withFeatureCodeLedgerLock(ledgerPath, async (lock) => {
    const { ledger, created } = await readLedgerOrCreate(ledgerPath, document);
    let changed = reconcileInMemory(ledger, document, new Date().toISOString());
    const prior = ledger.entries.find((entry) => (
      entry.status === "reserved"
      && entry.proposal_id === proposalId
      && entry.feature.slice(entry.feature_code.length + 1) === slug
    ));
    if (prior) {
      await saveLedger(ledgerPath, ledger, { created, changed, lock });
      return prior;
    }
    const observed = await observedSequentialMaximum(ledgerPath);
    const used = new Set(ledger.entries.map((entry) => entry.feature_code));
    let sequence = Math.max(ledger.next_sequence, observed + 1, 1);
    let featureCode = formatCode(sequence, ledger.minimum_width);
    while (used.has(featureCode) || featureCode === "000") {
      sequence += 1;
      featureCode = formatCode(sequence, ledger.minimum_width);
    }
    const timestamp = new Date().toISOString();
    const entry = newEntry({
      featureCode,
      feature: `${featureCode}-${slug}`,
      status: "reserved",
      proposalId,
      timestamp,
      reason
    });
    ledger.entries.push(entry);
    ledger.next_sequence = sequence + 1;
    changed = true;
    await saveLedger(ledgerPath, ledger, { created, changed, lock });
    return entry;
  });
}

export async function assertProposalFeatureCodes(ledgerPath, currentDocument, proposal, transitionId = null) {
  const ledger = await ensureFeatureCodeLedger(ledgerPath, currentDocument);
  const currentCodes = new Set(currentDocument.current_baseline?.project_boundaries?.map((item) => item.feature_code) || []);
  const currentTombstones = new Map(currentDocument.current_baseline?.tombstones?.map((item) => [item.feature_code, item]) || []);
  const proposedCodes = new Set(proposal.project_boundaries?.map((item) => item.feature_code) || []);
  const proposedTombstones = new Map(proposal.tombstones?.map((item) => [item.feature_code, item]) || []);
  for (const code of currentCodes) {
    if (!proposedCodes.has(code) && !proposedTombstones.has(code)) throw new Error(`Removed feature code ${code} must remain as a proposal tombstone.`);
  }
  for (const [code, tombstone] of currentTombstones) {
    const proposed = proposedTombstones.get(code);
    if (!proposed) throw new Error(`Existing tombstone ${code} cannot be removed from a proposal.`);
    if (stableStringify(proposed) !== stableStringify(tombstone)) throw new Error(`Existing tombstone ${code} is immutable.`);
  }
  for (const code of proposedTombstones.keys()) {
    if (!currentCodes.has(code) && !currentTombstones.has(code)) throw new Error(`Proposal tombstone ${code} was never an active or retired code.`);
  }
  const byCode = new Map(ledger.entries.map((entry) => [entry.feature_code, entry]));
  for (const boundary of proposal.project_boundaries || []) {
    if (currentCodes.has(boundary.feature_code)) continue;
    if (!SEQUENTIAL_CODE_PATTERN.test(boundary.feature_code)) throw new Error(`New feature ${boundary.feature} must use a sequential feature code.`);
    const entry = byCode.get(boundary.feature_code);
    if (!entry || entry.status !== "reserved") throw new Error(`New feature code ${boundary.feature_code} has no active reservation.`);
    if (entry.proposal_id !== proposal.baseline_id || entry.feature !== boundary.feature) {
      throw new Error(`Feature code ${boundary.feature_code} reservation does not match proposal ${proposal.baseline_id} and feature ${boundary.feature}.`);
    }
    if (entry.transition_id !== null && entry.transition_id !== transitionId) throw new Error(`Feature code ${boundary.feature_code} is bound to another transition.`);
  }
  return ledger;
}

export async function bindProposalFeatureCodes(ledgerPath, currentDocument, proposal, transitionId) {
  return withFeatureCodeLedgerLock(ledgerPath, async (lock) => {
    const { ledger, created } = await readLedgerOrCreate(ledgerPath, currentDocument);
    let changed = reconcileInMemory(ledger, currentDocument, new Date().toISOString());
    const currentCodes = new Set(currentDocument.current_baseline?.project_boundaries?.map((item) => item.feature_code) || []);
    const byCode = new Map(ledger.entries.map((entry) => [entry.feature_code, entry]));
    for (const boundary of proposal.project_boundaries || []) {
      if (currentCodes.has(boundary.feature_code)) continue;
      const entry = byCode.get(boundary.feature_code);
      if (!entry || entry.status !== "reserved" || entry.proposal_id !== proposal.baseline_id || entry.feature !== boundary.feature) {
        throw new Error(`Feature code ${boundary.feature_code} is not reserved for this proposal.`);
      }
      if (entry.transition_id !== null && entry.transition_id !== transitionId) throw new Error(`Feature code ${boundary.feature_code} is bound to another transition.`);
      if (entry.transition_id !== transitionId) {
        entry.transition_id = transitionId;
        entry.updated_at = new Date().toISOString();
        changed = true;
      }
    }
    return saveLedger(ledgerPath, ledger, { created, changed, lock });
  });
}

export async function voidFeatureCodeReservations(ledgerPath, { proposalId = null, transitionId = null, reason }) {
  if (!proposalId && !transitionId) throw new Error("proposal_id or transition_id is required to void feature-code reservations.");
  if (!reason) throw new Error("A reason is required to void feature-code reservations.");
  return withFeatureCodeLedgerLock(ledgerPath, async (lock) => {
    const ledger = await readJson(ledgerPath);
    const errors = validateFeatureCodeLedger(ledger);
    if (errors.length) throw new Error(`feature-code-ledger is invalid:\n${errors.join("\n")}`);
    let changed = false;
    const timestamp = new Date().toISOString();
    for (const entry of ledger.entries) {
      if (entry.status !== "reserved") continue;
      if (proposalId && entry.proposal_id !== proposalId) continue;
      if (transitionId && entry.transition_id !== transitionId) continue;
      entry.status = "void";
      entry.updated_at = timestamp;
      entry.reason = reason;
      changed = true;
    }
    return saveLedger(ledgerPath, ledger, { changed, lock });
  });
}

export async function reconcileFeatureCodeLedger(ledgerPath, document) {
  return ensureFeatureCodeLedger(ledgerPath, document);
}

export async function authorizeFeatureCreation(ledgerPath, featureCode, feature) {
  const target = resolve(ledgerPath);
  if (basename(target) !== "feature-code-ledger.json" || basename(dirname(target)) !== "specs") {
    throw new Error("Feature-code ledger must use specs/feature-code-ledger.json.");
  }
  if (!SEQUENTIAL_CODE_PATTERN.test(featureCode || "")) throw new Error("Outline-managed feature creation requires a sequential feature code.");
  const ledger = await readJson(target);
  const ledgerErrors = validateFeatureCodeLedger(ledger);
  if (ledgerErrors.length) throw new Error(`feature-code-ledger is invalid:\n${ledgerErrors.join("\n")}`);
  const entry = ledger.entries.find((item) => item.feature_code === featureCode);
  if (!entry || entry.status !== "active" || entry.feature !== feature) {
    throw new Error(`Feature ${feature} is not the active ledger allocation for code ${featureCode}.`);
  }

  const matches = [];
  for (const item of await readdir(dirname(target), { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const boundariesPath = join(dirname(target), item.name, "outline-boundaries.json");
    let document;
    try {
      document = await readJson(boundariesPath);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw new Error(`Cannot read authoritative boundaries at ${boundariesPath}: ${error.message}`);
    }
    const errors = validateOutlineBoundaries(document);
    if (errors.length) throw new Error(`outline-boundaries is invalid at ${boundariesPath}:\n${errors.join("\n")}`);
    const boundary = document.current_baseline?.project_boundaries?.find((candidate) => candidate.feature_code === featureCode);
    if (!boundary) continue;
    if (document.transition_state !== "ALIGNED") throw new Error(`Feature ${feature} belongs to a root in ${document.transition_state}, not ALIGNED.`);
    if (boundary.feature !== feature) throw new Error(`Feature code ${featureCode} names ${boundary.feature} in the current baseline, not ${feature}.`);
    matches.push(boundariesPath);
  }
  if (matches.length !== 1) throw new Error(`Feature ${feature} must appear in exactly one ALIGNED current baseline; found ${matches.length}.`);
  return { authorized: true, feature_code: featureCode, feature, boundary_source: matches[0] };
}

export function featureCodeLedgerSummary(ledger) {
  const counts = Object.fromEntries([...STATUSES].map((status) => [status, ledger.entries.filter((entry) => entry.status === status).length]));
  return {
    schema_version: ledger.schema_version,
    ledger_revision: ledger.ledger_revision,
    ledger_digest: ledger.ledger_digest,
    next_sequence: ledger.next_sequence,
    counts
  };
}

export function featureCodeLedgerStableEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}
