import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { sha256 } from "./outline-boundaries-lib.mjs";
import { isRepositoryRef } from "./outline-transition-workflow-lib.mjs";

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CODE_PATTERN = /^(?:[0-9]{3,}|[0-9]{8}-[0-9]{6})$/;
const PLAN_KEYS = new Set([
  "schema_version", "operation", "reset_id", "root_feature", "created_at",
  "source_review_index", "source_review_index_digest", "review_index_after_digest",
  "authoritative_boundaries", "receipt_ref", "archive_root", "source_containers",
  "archive_entries", "void_proposal_ids", "plan_digest"
]);
const RECEIPT_KEYS = new Set([
  "schema_version", "operation", "state", "reset_id", "root_feature",
  "planned_at", "applied_at", "plan_ref", "plan_digest", "source_review_index",
  "review_index_before_digest", "review_index_after_digest", "archive_root",
  "source_containers", "archived_entries", "void_proposal_ids", "next_command",
  "receipt_digest"
]);
const SOURCE_KEYS = new Set([
  "source_container_id", "legacy_feature_code", "feature", "prd_ref",
  "prd_digest", "preserved_artifact_count", "preserved_artifacts_digest"
]);
const ARCHIVE_KEYS = new Set(["source_ref", "source_digest", "archive_ref"]);

function isFileRepositoryRef(value) {
  return isRepositoryRef(value) && !value.includes("#");
}

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !(key in value));
  if (unknown.length || missing.length) {
    throw new Error(`${label} fields are invalid; unknown=${unknown.join(",") || "none"}, missing=${missing.join(",") || "none"}.`);
  }
}

function isTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validateSourceContainers(value) {
  if (!Array.isArray(value) || !value.length) throw new Error("Outline draft reset requires at least one PRD source container.");
  const containerIds = new Set();
  const features = new Set();
  for (const [index, source] of value.entries()) {
    exactKeys(source, SOURCE_KEYS, `source_containers[${index}]`);
    if (!SAFE_ID_PATTERN.test(source.source_container_id || "") || containerIds.has(source.source_container_id)) {
      throw new Error(`source_containers[${index}].source_container_id must be unique and safe.`);
    }
    containerIds.add(source.source_container_id);
    if (!CODE_PATTERN.test(source.legacy_feature_code || "")) throw new Error(`source_containers[${index}].legacy_feature_code is invalid.`);
    if (!SAFE_ID_PATTERN.test(source.feature || "") || features.has(source.feature)) throw new Error(`source_containers[${index}].feature must be unique and safe.`);
    features.add(source.feature);
    if (!isFileRepositoryRef(source.prd_ref) || source.prd_ref !== `specs/${source.feature}/prd.md`
      || !DIGEST_PATTERN.test(source.prd_digest || "")) {
      throw new Error(`source_containers[${index}] PRD identity is invalid.`);
    }
    if (!Number.isInteger(source.preserved_artifact_count) || source.preserved_artifact_count < 1
      || !DIGEST_PATTERN.test(source.preserved_artifacts_digest || "")) {
      throw new Error(`source_containers[${index}] preserved artifact inventory is invalid.`);
    }
  }
}

function validateArchiveEntries(value) {
  if (!Array.isArray(value)) throw new Error("archive_entries must be an array.");
  const sourceRefs = new Set();
  const archiveRefs = new Set();
  for (const [index, entry] of value.entries()) {
    exactKeys(entry, ARCHIVE_KEYS, `archive_entries[${index}]`);
    if (!isFileRepositoryRef(entry.source_ref) || !isFileRepositoryRef(entry.archive_ref)
      || !DIGEST_PATTERN.test(entry.source_digest || "")) {
      throw new Error(`archive_entries[${index}] is invalid.`);
    }
    const sourceKey = entry.source_ref.normalize("NFC").toLowerCase();
    const archiveKey = entry.archive_ref.normalize("NFC").toLowerCase();
    if (sourceRefs.has(sourceKey) || archiveRefs.has(archiveKey)) throw new Error("Outline draft reset archive paths must be unique after normalization.");
    if (sourceRefs.has(archiveKey) || archiveRefs.has(sourceKey) || sourceKey === archiveKey) {
      throw new Error("Outline draft reset source and archive paths must not conflict after normalization.");
    }
    sourceRefs.add(sourceKey);
    archiveRefs.add(archiveKey);
  }
}

function validateProposalIds(value) {
  if (!Array.isArray(value) || new Set(value).size !== value.length
    || value.some((item) => !SAFE_ID_PATTERN.test(item || ""))) {
    throw new Error("void_proposal_ids must contain unique safe IDs.");
  }
}

export function computeOutlineDraftResetPlanDigest(plan) {
  const { plan_digest: _ignored, ...payload } = plan;
  return sha256(payload);
}

export function computeOutlineDraftResetReceiptDigest(receipt) {
  const { receipt_digest: _ignored, ...payload } = receipt;
  return sha256(payload);
}

export function validateOutlineDraftResetPlan(plan) {
  exactKeys(plan, PLAN_KEYS, "Outline draft reset plan");
  if (plan.schema_version !== 1 || plan.operation !== "DISCARD_OUTLINE_DRAFT"
    || !SAFE_ID_PATTERN.test(plan.reset_id || "") || !SAFE_ID_PATTERN.test(plan.root_feature || "")
    || !isTimestamp(plan.created_at) || !isFileRepositoryRef(plan.source_review_index)
    || !DIGEST_PATTERN.test(plan.source_review_index_digest || "")
    || !DIGEST_PATTERN.test(plan.review_index_after_digest || "")
    || !isFileRepositoryRef(plan.authoritative_boundaries) || !isFileRepositoryRef(plan.receipt_ref)
    || !isFileRepositoryRef(plan.archive_root) || !DIGEST_PATTERN.test(plan.plan_digest || "")) {
    throw new Error("Outline draft reset plan header is invalid.");
  }
  validateSourceContainers(plan.source_containers);
  validateArchiveEntries(plan.archive_entries);
  validateProposalIds(plan.void_proposal_ids);
  const expectedRoot = `specs/${plan.root_feature}`;
  if (plan.source_review_index !== "specs/review-index.json"
    || plan.authoritative_boundaries !== `${expectedRoot}/outline-boundaries.json`
    || plan.receipt_ref !== `${expectedRoot}/prd/review/outline-draft-reset.json`
    || plan.archive_root !== `${expectedRoot}/prd/review/history/outline-draft-resets/${plan.reset_id}`) {
    throw new Error("Outline draft reset plan paths do not match its root/reset identity.");
  }
  if (computeOutlineDraftResetPlanDigest(plan) !== plan.plan_digest) throw new Error("Outline draft reset plan digest does not match canonical content.");
}

export function validateOutlineDraftResetReceipt(receipt) {
  exactKeys(receipt, RECEIPT_KEYS, "Outline draft reset receipt");
  if (receipt.schema_version !== 1 || receipt.operation !== "DISCARD_OUTLINE_DRAFT"
    || receipt.state !== "APPLIED_AWAITING_REGENERATION" || !SAFE_ID_PATTERN.test(receipt.reset_id || "")
    || !SAFE_ID_PATTERN.test(receipt.root_feature || "") || !isTimestamp(receipt.planned_at)
    || !isTimestamp(receipt.applied_at) || !isFileRepositoryRef(receipt.plan_ref)
    || !DIGEST_PATTERN.test(receipt.plan_digest || "") || !isFileRepositoryRef(receipt.source_review_index)
    || !DIGEST_PATTERN.test(receipt.review_index_before_digest || "")
    || !DIGEST_PATTERN.test(receipt.review_index_after_digest || "")
    || !isFileRepositoryRef(receipt.archive_root) || typeof receipt.next_command !== "string"
    || !receipt.next_command || !DIGEST_PATTERN.test(receipt.receipt_digest || "")) {
    throw new Error("Outline draft reset receipt header is invalid.");
  }
  validateSourceContainers(receipt.source_containers);
  validateArchiveEntries(receipt.archived_entries);
  validateProposalIds(receipt.void_proposal_ids);
  const expectedRoot = `specs/${receipt.root_feature}`;
  if (receipt.plan_ref !== `${expectedRoot}/prd/review/outline-draft-reset-plan.json`
    || receipt.source_review_index !== "specs/review-index.json"
    || receipt.archive_root !== `${expectedRoot}/prd/review/history/outline-draft-resets/${receipt.reset_id}`
    || receipt.next_command !== `/sp.prd ${receipt.root_feature} --regenerate-outline-draft --reset ${receipt.reset_id}`) {
    throw new Error("Outline draft reset receipt paths/command do not match its root/reset identity.");
  }
  if (computeOutlineDraftResetReceiptDigest(receipt) !== receipt.receipt_digest) {
    throw new Error("Outline draft reset receipt digest does not match canonical content.");
  }
}

export function validateOutlineDraftResetReceiptAgainstPlan(receipt, plan) {
  validateOutlineDraftResetReceipt(receipt);
  validateOutlineDraftResetPlan(plan);
  const matches = receipt.reset_id === plan.reset_id
    && receipt.root_feature === plan.root_feature
    && receipt.planned_at === plan.created_at
    && receipt.plan_ref === `specs/${plan.root_feature}/prd/review/outline-draft-reset-plan.json`
    && receipt.plan_digest === plan.plan_digest
    && receipt.source_review_index === plan.source_review_index
    && receipt.review_index_before_digest === plan.source_review_index_digest
    && receipt.review_index_after_digest === plan.review_index_after_digest
    && receipt.archive_root === plan.archive_root
    && sha256(receipt.source_containers) === sha256(plan.source_containers)
    && sha256(receipt.archived_entries) === sha256(plan.archive_entries)
    && sha256(receipt.void_proposal_ids) === sha256(plan.void_proposal_ids);
  if (!matches) throw new Error("Outline draft reset receipt does not match its immutable plan.");
}

export function repositoryRootForResetRef(pathArgument) {
  const target = resolve(pathArgument);
  return dirname(dirname(dirname(dirname(dirname(target)))));
}

export async function assertSafeRepositoryFile(repositoryRootArgument, ref, expectedDigest, label, { allowMissing = false } = {}) {
  if (!isRepositoryRef(ref)) throw new Error(`${label} is not a safe repository reference.`);
  const repositoryRoot = resolve(repositoryRootArgument);
  const target = resolve(repositoryRoot, ref);
  const lexical = relative(repositoryRoot, target);
  if (!lexical || lexical === ".." || lexical.startsWith(`..${sep}`)) throw new Error(`${label} resolves outside the repository.`);
  let info;
  try { info = await lstat(target); }
  catch (error) {
    if (allowMissing && error.code === "ENOENT") return null;
    throw error;
  }
  if (!info.isFile() || info.isSymbolicLink() || info.nlink > 1) {
    throw new Error(`${label} must be a regular file with no symbolic-link or hard-link aliases.`);
  }
  const realRoot = await realpath(repositoryRoot);
  const realTarget = await realpath(target);
  const outside = relative(realRoot, realTarget);
  if (!outside || outside === ".." || outside.startsWith(`..${sep}`)) throw new Error(`${label} resolves outside the repository.`);
  const digest = createHash("sha256").update(await readFile(realTarget)).digest("hex");
  if (expectedDigest && digest !== expectedDigest) throw new Error(`${label} changed after the reset plan was created.`);
  return { target, digest };
}
