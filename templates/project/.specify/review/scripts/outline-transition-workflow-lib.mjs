import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import {
  readJson,
  sha256,
  stableStringify,
  validateOutlineBoundaries
} from "./outline-boundaries-lib.mjs";

export const ARTIFACT_TYPES = new Set([
  "prd", "outline", "spec", "flow", "ui", "plan", "tasks",
  "implementation", "test", "trace", "memory", "open_item"
]);

export function isRepositoryRef(value) {
  if (typeof value !== "string" || !value.trim() || value.includes("\\") || value.includes("\0")
    || value.startsWith("/") || value.startsWith("~") || /^[A-Za-z]:/.test(value)
    || /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(value)) return false;
  const parts = value.split("#");
  if (parts.length > 2 || (parts.length === 2 && !parts[1])) return false;
  return parts[0].split("/").every((segment) => segment && segment !== "." && segment !== "..");
}

export function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const allowed = new Set(keys);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = keys.filter((key) => !(key in value));
  if (unknown.length || missing.length) {
    throw new Error(`${label} fields are invalid; missing=[${missing.join(", ")}], unsupported=[${unknown.join(", ")}].`);
  }
}

export function assertTransitionIdentity(value, transition, proposalDigest, label) {
  if (value.transition_id !== transition.transition_id
    || value.transition_revision !== transition.transition_revision
    || value.proposal_digest !== proposalDigest) {
    throw new Error(`${label} identity does not match the active transition.`);
  }
}

export function computeInventoryDigest(inventory) {
  const { inventory_digest: _ignored, ...payload } = inventory;
  return sha256(payload);
}

export function computeValidationReportDigest(report) {
  const { report_digest: _ignored, ...payload } = report;
  return sha256(payload);
}

export function validateValidationReport(report, document = null) {
  exactObject(
    report,
    ["schema_version", "transition_id", "transition_revision", "proposal_digest", "inventory_digest", "generated_at", "checks", "report_digest"],
    "outline-transition validation report"
  );
  if (report.schema_version !== 1 || !Number.isFinite(Date.parse(report.generated_at))
    || Date.parse(report.generated_at) > Date.now() + 300000
    || !/^[a-f0-9]{64}$/.test(report.inventory_digest || "") || !Array.isArray(report.checks)
    || report.checks.length !== 4) throw new Error("Outline-transition validation report header is invalid.");
  if (document) assertTransitionIdentity(report, document.transition, document.proposed_baseline.proposal_digest, "Validation report");
  const expectedIds = ["project_restructure", "flow", "ui", "cross_artifact"];
  for (const [index, check] of report.checks.entries()) {
    exactObject(check, ["check_id", "status", "artifact_count", "reason"], `validation report checks[${index}]`);
    if (check.check_id !== expectedIds[index] || !new Set(["executed", "skipped", "blocked"]).has(check.status)
      || !Number.isInteger(check.artifact_count) || check.artifact_count < 0
      || typeof check.reason !== "string" || !check.reason.trim()) {
      throw new Error(`validation report checks[${index}] is invalid.`);
    }
    if (check.status === "skipped" && check.artifact_count !== 0) {
      throw new Error(`Skipped validation check ${check.check_id} must have artifact_count 0.`);
    }
  }
  if (computeValidationReportDigest(report) !== report.report_digest) {
    throw new Error("Validation report digest does not match canonical content.");
  }
}

export function validateInventory(inventory) {
  exactObject(
    inventory,
    ["schema_version", "transition_id", "transition_revision", "proposal_digest", "generated_at", "inventory_digest", "artifacts"],
    "outline-transition inventory"
  );
  if (inventory.schema_version !== 1 || !Number.isFinite(Date.parse(inventory.generated_at))
    || Date.parse(inventory.generated_at) > Date.now() + 300000 || !Array.isArray(inventory.artifacts)) {
    throw new Error("Outline-transition inventory header is invalid.");
  }
  const refs = new Set();
  for (const [index, artifact] of inventory.artifacts.entries()) {
    exactObject(artifact, ["artifact_type", "artifact_ref", "source_digest", "source_feature_code"], `inventory.artifacts[${index}]`);
    if (!ARTIFACT_TYPES.has(artifact.artifact_type) || !isRepositoryRef(artifact.artifact_ref)
      || !/^[a-f0-9]{64}$/.test(artifact.source_digest || "")
      || !/^(?:[0-9]{3,}|[0-9]{8}-[0-9]{6})$/.test(artifact.source_feature_code || "")) {
      throw new Error(`inventory.artifacts[${index}] is invalid.`);
    }
    const key = `${artifact.artifact_type}:${String(artifact.artifact_ref).normalize("NFC").toLowerCase()}`;
    if (refs.has(key)) throw new Error(`Inventory contains a duplicate normalized artifact: ${artifact.artifact_ref}`);
    refs.add(key);
  }
  if (computeInventoryDigest(inventory) !== inventory.inventory_digest) throw new Error("Inventory digest does not match canonical content.");
}

export function validateEvidenceDocument(evidence, inventory, document) {
  exactObject(
    evidence,
    ["schema_version", "transition_id", "transition_revision", "proposal_digest", "inventory_digest", "artifact_reassignments", "impact_assessments"],
    "outline-transition evidence"
  );
  if (evidence.schema_version !== 1 || evidence.inventory_digest !== inventory.inventory_digest
    || !Array.isArray(evidence.artifact_reassignments) || !Array.isArray(evidence.impact_assessments)) {
    throw new Error("Outline-transition evidence header is invalid.");
  }
  assertTransitionIdentity(evidence, document.transition, document.proposed_baseline.proposal_digest, "Evidence");
  const inventoryRefs = new Set(inventory.artifacts.map(artifactKey));
  for (const item of [...evidence.artifact_reassignments, ...evidence.impact_assessments]) {
    if (!inventoryRefs.has(artifactKey(item))) throw new Error(`Evidence references an artifact outside the inventory: ${item.artifact_ref}`);
  }
  const candidate = structuredClone(document);
  candidate.transition_state = "PROJECT_RESTRUCTURE_STAGED";
  candidate.transition.artifact_reassignments = evidence.artifact_reassignments;
  candidate.transition.impact_assessments = evidence.impact_assessments;
  const errors = validateOutlineBoundaries(candidate);
  if (errors.length) throw new Error(`Outline-transition evidence is invalid:\n${errors.join("\n")}`);
}

export function artifactKey(item) {
  return `${item.artifact_type}:${String(item.artifact_ref).normalize("NFC").toLowerCase()}`;
}

export function requireCoverage(inventory, items, predicate, label) {
  const expected = inventory.artifacts.filter(predicate);
  const actual = new Set(items.map(artifactKey));
  const missing = expected.filter((artifact) => !actual.has(artifactKey(artifact)));
  if (missing.length) throw new Error(`${label} is missing ${missing.length} inventoried artifact(s): ${missing.map((item) => item.artifact_ref).join(", ")}`);
}

export async function digestRepositoryRef(ref, repositoryRoot = process.cwd()) {
  const pathPart = String(ref).split("#", 1)[0];
  const target = resolve(repositoryRoot, pathPart);
  const relativeTarget = relative(repositoryRoot, target);
  if (!relativeTarget || relativeTarget === ".." || relativeTarget.startsWith(`..${sep}`) || resolve(repositoryRoot, relativeTarget) !== target) {
    throw new Error(`Artifact reference escapes or equals the repository root: ${ref}`);
  }
  let cursor = target;
  const rootReal = await realpath(repositoryRoot);
  while (cursor !== dirname(cursor)) {
    const info = await lstat(cursor);
    if (info.isSymbolicLink()) throw new Error(`Symbolic links are not accepted in transition evidence paths: ${ref}`);
    if (cursor === repositoryRoot) break;
    cursor = dirname(cursor);
  }
  const targetReal = await realpath(target);
  const realRelative = relative(rootReal, targetReal);
  if (realRelative === ".." || realRelative.startsWith(`..${sep}`)) throw new Error(`Artifact reference resolves outside the repository: ${ref}`);
  const content = await readFile(target);
  return createHash("sha256").update(content).digest("hex");
}

export async function assertLiveOwner(boundariesPath, ownerId) {
  const document = await readJson(boundariesPath);
  const errors = validateOutlineBoundaries(document);
  if (errors.length) throw new Error(`outline-boundaries is invalid:\n${errors.join("\n")}`);
  if (!document.transition || document.transition.lock?.owner_id !== ownerId) throw new Error("Active transition lock owner does not match --owner.");
  const lockPath = resolve(dirname(boundariesPath), `.${basename(boundariesPath)}.transition.lock`);
  const sidecar = await readJson(lockPath);
  if (sidecar.owner_id !== ownerId || sidecar.transition_id !== document.transition.transition_id
    || sidecar.transition_revision !== document.transition.transition_revision
    || Date.parse(sidecar.lease_expires_at) < Date.now()) throw new Error("Transition lock sidecar is stale or has a different owner.");
  return { document, sidecar, lockPath };
}

export function transitionEvent(eventType, transition, baseline, step, details = {}) {
  return {
    schema_version: 1,
    event_id: randomUUID(),
    event_type: eventType,
    transition_id: transition.transition_id,
    transition_revision: transition.transition_revision,
    occurred_at: new Date().toISOString(),
    baseline_id: baseline?.baseline_id || null,
    baseline_digest: baseline?.baseline_digest || null,
    step,
    details_digest: sha256({ eventType, step, transition_id: transition.transition_id, revision: transition.transition_revision, ...details })
  };
}

export function stableEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}
