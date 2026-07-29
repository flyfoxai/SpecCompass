import { createHash, randomUUID } from "node:crypto";
import {
  copyFile, lstat, mkdir, open, readFile, realpath, rename, unlink
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import {
  atomicWriteJson,
  readJson,
  sha256,
  writeJsonExclusive
} from "./outline-boundaries-lib.mjs";
import {
  ARTIFACT_TYPES,
  artifactKey,
  assertTransitionIdentity,
  exactObject,
  isRepositoryRef,
  validateEvidenceDocument,
  validateInventory
} from "./outline-transition-workflow-lib.mjs";
import { repositoryRootForBoundaries } from "./outline-adjustment-lib.mjs";

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const PLAN_KEYS = ["schema_version", "transition_id", "inventory_digest", "staging_root", "operations"];
const PLAN_OPERATION_KEYS = [
  "artifact_type", "source_artifact_ref", "operation", "target_artifact_ref",
  "target_feature_code", "staged_artifact_ref"
];
const MANIFEST_KEYS = [
  "schema_version", "transition_id", "transition_revision", "proposal_digest",
  "inventory_digest", "generated_at", "staging_root", "operations", "manifest_digest"
];
const MANIFEST_OPERATION_KEYS = [
  "operation_id", "artifact_type", "source_artifact_ref", "source_digest", "source_mode",
  "operation", "target_artifact_ref", "target_feature_code", "staged_artifact_ref",
  "staged_digest"
];
const RECEIPT_KEYS = [
  "schema_version", "transition_id", "proposal_digest", "inventory_digest",
  "manifest_digest", "phase", "updated_at", "completed_operations", "receipt_digest"
];
const OPERATIONS = new Set(["move", "copy", "rewrite", "retire"]);
const PHASES = new Set(["STAGED", "ARTIFACTS_PUBLISHED", "BASELINE_COMMITTED"]);
const TRANSIENT_RENAME_CODES = new Set(["EACCES", "EBUSY", "EEXIST", "EPERM"]);
const RENAME_DELAYS = [25, 75, 150, 300];

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

async function digestPath(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function pathExists(path) {
  try { await lstat(path); return true; }
  catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function relativeRef(repositoryRoot, path) {
  return relative(repositoryRoot, path).split(sep).join("/");
}

function resolveRef(repositoryRoot, ref) {
  if (!isRepositoryRef(ref) || ref.includes("#")) throw new Error(`Expected a file repository reference, got: ${ref}`);
  const target = resolve(repositoryRoot, ref);
  const rel = relative(repositoryRoot, target);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error(`Repository reference escapes the project: ${ref}`);
  return target;
}

async function assertNoSymlinkPath(repositoryRoot, target, allowMissingLeaf = false) {
  const rootReal = await realpath(repositoryRoot);
  const rel = relative(repositoryRoot, target);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error(`Path escapes the repository: ${target}`);
  const segments = rel.split(sep);
  let cursor = repositoryRoot;
  for (let index = 0; index < segments.length; index += 1) {
    cursor = resolve(cursor, segments[index]);
    let info;
    try { info = await lstat(cursor); }
    catch (error) {
      if (error.code === "ENOENT" && allowMissingLeaf) return;
      throw error;
    }
    if (info.isSymbolicLink()) throw new Error(`Symbolic links are not accepted in transition paths: ${relativeRef(repositoryRoot, cursor)}`);
  }
  const targetReal = await realpath(target);
  const realRel = relative(rootReal, targetReal);
  if (realRel === ".." || realRel.startsWith(`..${sep}`)) throw new Error(`Path resolves outside the repository: ${target}`);
}

function physicalExpectations(inventory, evidence) {
  const reassignments = new Map(evidence.artifact_reassignments.map((item) => [artifactKey(item), item]));
  const impacts = new Map(evidence.impact_assessments.map((item) => [artifactKey(item), item]));
  const expectations = new Map();
  for (const artifact of inventory.artifacts) {
    const key = artifactKey(artifact);
    const reassignment = reassignments.get(key);
    const impact = impacts.get(key);
    if (!reassignment || !impact) throw new Error(`Physical staging requires complete evidence for ${artifact.artifact_ref}.`);
    if (reassignment.disposition === "blocked" || impact.outcome === "BLOCKED") {
      throw new Error(`Blocked artifact cannot enter physical staging: ${artifact.artifact_ref}`);
    }
    if (impact.outcome === "UNCHANGED_WITH_EVIDENCE") {
      if (reassignment.disposition !== "shared") throw new Error(`Unchanged artifact must retain shared ownership: ${artifact.artifact_ref}`);
      continue;
    }
    if (impact.outcome === "RETIRE" || reassignment.disposition === "retire") {
      if (impact.outcome !== "RETIRE" || reassignment.disposition !== "retire") {
        throw new Error(`Retirement evidence is inconsistent for ${artifact.artifact_ref}.`);
      }
      expectations.set(key, { artifact, reassignment, impact, allowed: new Set(["retire"]) });
      continue;
    }
    if (impact.outcome === "MIGRATE") {
      if (reassignment.disposition !== "successor") throw new Error(`MIGRATE requires a successor owner: ${artifact.artifact_ref}`);
      expectations.set(key, { artifact, reassignment, impact, allowed: new Set(["move", "copy"]) });
      continue;
    }
    if (impact.outcome === "REGENERATE") {
      const allowed = reassignment.disposition === "successor" ? new Set(["move", "copy"]) : new Set(["rewrite"]);
      if (!new Set(["successor", "shared"]).has(reassignment.disposition)) {
        throw new Error(`REGENERATE requires successor or retained ownership: ${artifact.artifact_ref}`);
      }
      expectations.set(key, { artifact, reassignment, impact, allowed });
      continue;
    }
    throw new Error(`Unsupported physical impact outcome for ${artifact.artifact_ref}: ${impact.outcome}`);
  }
  return expectations;
}

export function computeManifestDigest(manifest) {
  const { manifest_digest: _ignored, ...payload } = manifest;
  return sha256(payload);
}

export function computePublicationReceiptDigest(receipt) {
  const { receipt_digest: _ignored, ...payload } = receipt;
  return sha256(payload);
}

export function validateStagingManifest(manifest, document = null, inventory = null) {
  exactObject(manifest, MANIFEST_KEYS, "outline-transition staging manifest");
  if (manifest.schema_version !== 1 || !Number.isFinite(Date.parse(manifest.generated_at))
    || Date.parse(manifest.generated_at) > Date.now() + 300000
    || !isRepositoryRef(manifest.staging_root) || manifest.staging_root.includes("#")
    || !Array.isArray(manifest.operations) || !manifest.operations.length) {
    throw new Error("Outline-transition staging manifest header is invalid.");
  }
  if (document) assertTransitionIdentity(manifest, document.transition, document.proposed_baseline.proposal_digest, "Staging manifest");
  if (inventory && manifest.inventory_digest !== inventory.inventory_digest) {
    throw new Error("Staging manifest inventory digest does not match the authoritative inventory.");
  }
  const ids = new Set();
  const sources = new Set();
  const targets = new Set();
  const stagedRefs = new Set();
  for (const [index, operation] of manifest.operations.entries()) {
    exactObject(operation, MANIFEST_OPERATION_KEYS, `staging manifest operations[${index}]`);
    if (operation.operation_id !== `op-${String(index + 1).padStart(4, "0")}` || ids.has(operation.operation_id)
      || !ARTIFACT_TYPES.has(operation.artifact_type) || !isRepositoryRef(operation.source_artifact_ref)
      || operation.source_artifact_ref.includes("#") || !DIGEST_PATTERN.test(operation.source_digest || "")
      || !Number.isInteger(operation.source_mode) || operation.source_mode < 0 || operation.source_mode > 0o777
      || !OPERATIONS.has(operation.operation)) throw new Error(`Staging manifest operation ${index} is invalid.`);
    ids.add(operation.operation_id);
    const key = `${operation.artifact_type}:${operation.source_artifact_ref.normalize("NFC").toLowerCase()}`;
    if (sources.has(key)) throw new Error(`Staging manifest duplicates source artifact ${operation.source_artifact_ref}.`);
    sources.add(key);
    const retiring = operation.operation === "retire";
    if (retiring !== (operation.target_artifact_ref === null && operation.target_feature_code === null
      && operation.staged_artifact_ref === null && operation.staged_digest === null)) {
      throw new Error(`Retire operation fields are inconsistent for ${operation.source_artifact_ref}.`);
    }
    if (!retiring && (!isRepositoryRef(operation.target_artifact_ref) || operation.target_artifact_ref.includes("#")
      || typeof operation.target_feature_code !== "string" || !operation.target_feature_code
      || !isRepositoryRef(operation.staged_artifact_ref) || operation.staged_artifact_ref.includes("#")
      || !DIGEST_PATTERN.test(operation.staged_digest || ""))) {
      throw new Error(`Published operation fields are invalid for ${operation.source_artifact_ref}.`);
    }
    if (!retiring) {
      const targetKey = operation.target_artifact_ref.normalize("NFC").toLowerCase();
      const stagedKey = operation.staged_artifact_ref.normalize("NFC").toLowerCase();
      if (targets.has(targetKey)) throw new Error(`Staging manifest duplicates target path ${operation.target_artifact_ref}.`);
      if (stagedRefs.has(stagedKey)) throw new Error(`Staging manifest reuses staged path ${operation.staged_artifact_ref}.`);
      targets.add(targetKey);
      stagedRefs.add(stagedKey);
    }
  }
  if (computeManifestDigest(manifest) !== manifest.manifest_digest) {
    throw new Error("Staging manifest digest does not match canonical content.");
  }
}

export function validatePublicationReceipt(receipt, manifest = null) {
  exactObject(receipt, RECEIPT_KEYS, "outline-transition publication receipt");
  if (receipt.schema_version !== 1 || !PHASES.has(receipt.phase)
    || !Number.isFinite(Date.parse(receipt.updated_at)) || Date.parse(receipt.updated_at) > Date.now() + 300000
    || !Array.isArray(receipt.completed_operations)
    || new Set(receipt.completed_operations).size !== receipt.completed_operations.length) {
    throw new Error("Outline-transition publication receipt is invalid.");
  }
  if (manifest && (receipt.transition_id !== manifest.transition_id
    || receipt.proposal_digest !== manifest.proposal_digest
    || receipt.inventory_digest !== manifest.inventory_digest
    || receipt.manifest_digest !== manifest.manifest_digest)) {
    throw new Error("Publication receipt identity does not match the staging manifest.");
  }
  if (manifest && receipt.completed_operations.some((id) => !manifest.operations.some((item) => item.operation_id === id))) {
    throw new Error("Publication receipt contains an unknown operation ID.");
  }
  if (receipt.phase !== "STAGED" && manifest && receipt.completed_operations.length !== manifest.operations.length) {
    throw new Error("Published receipt does not cover every manifest operation.");
  }
  if (computePublicationReceiptDigest(receipt) !== receipt.receipt_digest) {
    throw new Error("Publication receipt digest does not match canonical content.");
  }
}

export async function buildStagingManifest(boundariesPath, document, inventory, evidence, plan) {
  validateInventory(inventory);
  validateEvidenceDocument(evidence, inventory, document);
  exactObject(plan, PLAN_KEYS, "outline-transition staging plan");
  if (plan.schema_version !== 1 || plan.transition_id !== document.transition.transition_id
    || plan.inventory_digest !== inventory.inventory_digest || !isRepositoryRef(plan.staging_root)
    || plan.staging_root.includes("#") || !Array.isArray(plan.operations) || !plan.operations.length) {
    throw new Error("Outline-transition staging plan header is invalid.");
  }
  const repositoryRoot = repositoryRootForBoundaries(boundariesPath);
  const expectedStagingRoot = relativeRef(repositoryRoot, resolve(dirname(boundariesPath), "boundary-adjustments", "staging", document.transition.transition_id));
  if (plan.staging_root !== expectedStagingRoot) {
    throw new Error(`staging_root must be the transition-owned path ${expectedStagingRoot}.`);
  }
  const stagingRootPath = resolveRef(repositoryRoot, plan.staging_root);
  await assertNoSymlinkPath(repositoryRoot, stagingRootPath);
  const expectations = physicalExpectations(inventory, evidence);
  if (plan.operations.length !== expectations.size) {
    throw new Error(`Staging plan must contain exactly ${expectations.size} physical operation(s).`);
  }
  const seen = new Set();
  const proposedCodes = new Set(document.proposed_baseline.project_boundaries.map((item) => item.feature_code));
  const operations = [];
  for (const [index, operation] of plan.operations.entries()) {
    exactObject(operation, PLAN_OPERATION_KEYS, `staging plan operations[${index}]`);
    const key = `${operation.artifact_type}:${String(operation.source_artifact_ref).normalize("NFC").toLowerCase()}`;
    const expected = expectations.get(key);
    if (!expected || seen.has(key) || !expected.allowed.has(operation.operation)) {
      throw new Error(`Staging plan operation is not authorized by evidence: ${operation.source_artifact_ref}`);
    }
    seen.add(key);
    const sourcePath = resolveRef(repositoryRoot, operation.source_artifact_ref);
    await assertNoSymlinkPath(repositoryRoot, sourcePath);
    if (await digestPath(sourcePath) !== expected.artifact.source_digest) {
      throw new Error(`Source changed before staging manifest creation: ${operation.source_artifact_ref}`);
    }
    const sourceMode = (await lstat(sourcePath)).mode & 0o777;
    if (operation.operation === "retire") {
      if (operation.target_artifact_ref !== null || operation.target_feature_code !== null || operation.staged_artifact_ref !== null) {
        throw new Error(`Retire plan must not define target/staged paths: ${operation.source_artifact_ref}`);
      }
      operations.push({
        operation_id: `op-${String(index + 1).padStart(4, "0")}`,
        artifact_type: operation.artifact_type,
        source_artifact_ref: operation.source_artifact_ref,
        source_digest: expected.artifact.source_digest,
        source_mode: sourceMode,
        operation: "retire",
        target_artifact_ref: null,
        target_feature_code: null,
        staged_artifact_ref: null,
        staged_digest: null
      });
      continue;
    }
    if (!proposedCodes.has(operation.target_feature_code)
      || (expected.reassignment.disposition === "successor"
        && operation.target_feature_code !== expected.reassignment.target_feature_code)
      || !isRepositoryRef(operation.target_artifact_ref) || operation.target_artifact_ref.includes("#")
      || !isRepositoryRef(operation.staged_artifact_ref) || operation.staged_artifact_ref.includes("#")) {
      throw new Error(`Staging plan target identity is invalid: ${operation.source_artifact_ref}`);
    }
    if (operation.operation === "rewrite" && operation.target_artifact_ref !== operation.source_artifact_ref) {
      throw new Error(`rewrite must target the original artifact path: ${operation.source_artifact_ref}`);
    }
    if (operation.operation !== "rewrite" && operation.target_artifact_ref === operation.source_artifact_ref) {
      throw new Error(`move/copy must use a distinct target path: ${operation.source_artifact_ref}`);
    }
    const stagedPath = resolveRef(repositoryRoot, operation.staged_artifact_ref);
    const stagedRel = relative(stagingRootPath, stagedPath);
    if (!stagedRel || stagedRel === ".." || stagedRel.startsWith(`..${sep}`)) {
      throw new Error(`Staged artifact is outside staging_root: ${operation.staged_artifact_ref}`);
    }
    await assertNoSymlinkPath(repositoryRoot, stagedPath);
    operations.push({
      operation_id: `op-${String(index + 1).padStart(4, "0")}`,
      artifact_type: operation.artifact_type,
      source_artifact_ref: operation.source_artifact_ref,
      source_digest: expected.artifact.source_digest,
      source_mode: sourceMode,
      operation: operation.operation,
      target_artifact_ref: operation.target_artifact_ref,
      target_feature_code: operation.target_feature_code,
      staged_artifact_ref: operation.staged_artifact_ref,
      staged_digest: await digestPath(stagedPath)
    });
  }
  if (seen.size !== expectations.size) throw new Error("Staging plan does not cover every physical evidence decision.");
  const manifest = {
    schema_version: 1,
    transition_id: document.transition.transition_id,
    transition_revision: document.transition.transition_revision,
    proposal_digest: document.proposed_baseline.proposal_digest,
    inventory_digest: inventory.inventory_digest,
    generated_at: new Date().toISOString(),
    staging_root: plan.staging_root,
    operations,
    manifest_digest: ""
  };
  manifest.manifest_digest = computeManifestDigest(manifest);
  validateStagingManifest(manifest, document, inventory);
  return manifest;
}

export function createPublicationReceipt(manifest) {
  const receipt = {
    schema_version: 1,
    transition_id: manifest.transition_id,
    proposal_digest: manifest.proposal_digest,
    inventory_digest: manifest.inventory_digest,
    manifest_digest: manifest.manifest_digest,
    phase: "STAGED",
    updated_at: new Date().toISOString(),
    completed_operations: [],
    receipt_digest: ""
  };
  receipt.receipt_digest = computePublicationReceiptDigest(receipt);
  return receipt;
}

export async function assertStagedArtifacts(boundariesPath, manifest) {
  validateStagingManifest(manifest);
  const repositoryRoot = repositoryRootForBoundaries(boundariesPath);
  for (const operation of manifest.operations) {
    const source = resolveRef(repositoryRoot, operation.source_artifact_ref);
    await assertNoSymlinkPath(repositoryRoot, source);
    if (await digestPath(source) !== operation.source_digest) {
      throw new Error(`Source changed after staging: ${operation.source_artifact_ref}`);
    }
    if (operation.operation !== "retire") {
      const staged = resolveRef(repositoryRoot, operation.staged_artifact_ref);
      await assertNoSymlinkPath(repositoryRoot, staged);
      if (await digestPath(staged) !== operation.staged_digest) {
        throw new Error(`Staged artifact changed after manifest creation: ${operation.staged_artifact_ref}`);
      }
    }
  }
}

async function renameWithRetry(source, target) {
  for (let attempt = 0; ; attempt += 1) {
    try { await rename(source, target); return; }
    catch (error) {
      if (!TRANSIENT_RENAME_CODES.has(error.code) || attempt >= RENAME_DELAYS.length) throw error;
      await wait(RENAME_DELAYS[attempt]);
    }
  }
}

async function atomicWriteBuffer(target, content, mode) {
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", mode);
  try { await handle.writeFile(content); await handle.sync(); }
  finally { await handle.close(); }
  try { await renameWithRetry(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => undefined); throw error; }
}

async function archiveSource(repositoryRoot, manifest, operation) {
  const source = resolveRef(repositoryRoot, operation.source_artifact_ref);
  const recovery = resolveRef(repositoryRoot, `${manifest.staging_root}/_recovery/${operation.operation_id}-source`);
  await mkdir(dirname(recovery), { recursive: true });
  if (await pathExists(recovery)) {
    if (await digestPath(recovery) !== operation.source_digest) throw new Error(`Recovery backup digest changed for ${operation.source_artifact_ref}.`);
    if (await pathExists(source)) {
      if (await digestPath(source) !== operation.source_digest) throw new Error(`Source changed before publication: ${operation.source_artifact_ref}`);
      await unlink(source);
    }
    return;
  }
  if (!await pathExists(source) || await digestPath(source) !== operation.source_digest) {
    throw new Error(`Source is missing or changed before publication: ${operation.source_artifact_ref}`);
  }
  try { await renameWithRetry(source, recovery); }
  catch (error) {
    if (error.code !== "EXDEV") throw error;
    await copyFile(source, recovery);
    if (await digestPath(recovery) !== operation.source_digest) throw new Error(`Cross-device recovery copy failed for ${operation.source_artifact_ref}.`);
    await unlink(source);
  }
}

async function ensurePublicationClaim(repositoryRoot, manifest, operation) {
  const claimPath = resolveRef(
    repositoryRoot,
    `${manifest.staging_root}/_publication/${operation.operation_id}-claim.json`
  );
  const existing = await readJson(claimPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  const expected = {
    schema_version: 1,
    transition_id: manifest.transition_id,
    manifest_digest: manifest.manifest_digest,
    operation_id: operation.operation_id,
    source_digest: operation.source_digest,
    target_precondition: operation.operation === "rewrite" ? operation.source_digest : null
  };
  if (existing) {
    exactObject(existing, Object.keys(expected), `publication claim ${operation.operation_id}`);
    if (sha256(existing) !== sha256(expected)) throw new Error(`Publication claim changed for ${operation.operation_id}.`);
    return;
  }
  const source = resolveRef(repositoryRoot, operation.source_artifact_ref);
  if (!await pathExists(source) || await digestPath(source) !== operation.source_digest) {
    throw new Error(`Cannot create publication claim because source changed: ${operation.source_artifact_ref}`);
  }
  if (operation.operation !== "retire") {
    const target = resolveRef(repositoryRoot, operation.target_artifact_ref);
    const targetExists = await pathExists(target);
    if (operation.operation === "rewrite") {
      if (!targetExists || await digestPath(target) !== operation.source_digest) {
        throw new Error(`Rewrite target changed before publication claim: ${operation.target_artifact_ref}`);
      }
    } else if (targetExists) {
      throw new Error(`Publication target already exists before this transition writes it: ${operation.target_artifact_ref}`);
    }
  }
  await mkdir(dirname(claimPath), { recursive: true });
  await writeJsonExclusive(claimPath, expected, 0o600);
}

async function publishOperation(repositoryRoot, manifest, operation) {
  await ensurePublicationClaim(repositoryRoot, manifest, operation);
  const source = resolveRef(repositoryRoot, operation.source_artifact_ref);
  await assertNoSymlinkPath(repositoryRoot, source, true);
  if (operation.operation === "retire") {
    await archiveSource(repositoryRoot, manifest, operation);
    return;
  }
  const staged = resolveRef(repositoryRoot, operation.staged_artifact_ref);
  const target = resolveRef(repositoryRoot, operation.target_artifact_ref);
  await assertNoSymlinkPath(repositoryRoot, staged);
  await assertNoSymlinkPath(repositoryRoot, target, true);
  if (await digestPath(staged) !== operation.staged_digest) throw new Error(`Staged artifact changed: ${operation.staged_artifact_ref}`);
  const targetExists = await pathExists(target);
  if (operation.operation === "rewrite") {
    if (targetExists && await digestPath(target) === operation.staged_digest) return;
    await archiveSource(repositoryRoot, manifest, operation);
    await atomicWriteBuffer(target, await readFile(staged), operation.source_mode);
    return;
  }
  if (targetExists && await digestPath(target) !== operation.staged_digest) {
    throw new Error(`Target already exists with unrelated content: ${operation.target_artifact_ref}`);
  }
  if (!targetExists) await atomicWriteBuffer(target, await readFile(staged), operation.source_mode);
  if (operation.operation === "move") await archiveSource(repositoryRoot, manifest, operation);
  else if (!await pathExists(source) || await digestPath(source) !== operation.source_digest) {
    throw new Error(`Copy source changed during publication: ${operation.source_artifact_ref}`);
  }
}

export async function publishStagedArtifacts(boundariesPath, manifest, receipt, receiptPath, onProgress = null) {
  validateStagingManifest(manifest);
  validatePublicationReceipt(receipt, manifest);
  if (receipt.phase === "BASELINE_COMMITTED") return receipt;
  const repositoryRoot = repositoryRootForBoundaries(boundariesPath);
  const updated = structuredClone(receipt);
  for (const operation of manifest.operations) {
    if (!updated.completed_operations.includes(operation.operation_id)) {
      await publishOperation(repositoryRoot, manifest, operation);
      updated.completed_operations.push(operation.operation_id);
      updated.updated_at = new Date().toISOString();
      updated.receipt_digest = computePublicationReceiptDigest(updated);
      await atomicWriteJson(receiptPath, updated, 0o600);
      if (onProgress) await onProgress(operation, updated);
    }
  }
  updated.phase = "ARTIFACTS_PUBLISHED";
  updated.updated_at = new Date().toISOString();
  updated.receipt_digest = computePublicationReceiptDigest(updated);
  validatePublicationReceipt(updated, manifest);
  await atomicWriteJson(receiptPath, updated, 0o600);
  return updated;
}

export async function assertPublishedArtifacts(boundariesPath, manifest, receipt) {
  validateStagingManifest(manifest);
  validatePublicationReceipt(receipt, manifest);
  if (!new Set(["ARTIFACTS_PUBLISHED", "BASELINE_COMMITTED"]).has(receipt.phase)) {
    throw new Error("Artifact publication has not completed.");
  }
  const repositoryRoot = repositoryRootForBoundaries(boundariesPath);
  for (const operation of manifest.operations) {
    const source = resolveRef(repositoryRoot, operation.source_artifact_ref);
    const recovery = resolveRef(repositoryRoot, `${manifest.staging_root}/_recovery/${operation.operation_id}-source`);
    if (operation.operation === "retire" || operation.operation === "move" || operation.operation === "rewrite") {
      if (!await pathExists(recovery) || await digestPath(recovery) !== operation.source_digest) {
        throw new Error(`Published operation has no valid recovery source: ${operation.operation_id}`);
      }
    }
    if (operation.operation === "retire" || operation.operation === "move") {
      if (await pathExists(source)) throw new Error(`Published source was not retired from its original path: ${operation.source_artifact_ref}`);
    }
    if (operation.operation === "copy") {
      if (!await pathExists(source) || await digestPath(source) !== operation.source_digest) {
        throw new Error(`Published copy source changed: ${operation.source_artifact_ref}`);
      }
    }
    if (operation.operation !== "retire") {
      const target = resolveRef(repositoryRoot, operation.target_artifact_ref);
      if (!await pathExists(target) || await digestPath(target) !== operation.staged_digest) {
        throw new Error(`Published target is missing or changed: ${operation.target_artifact_ref}`);
      }
    }
  }
}

export async function markPublicationBaselineCommitted(receiptPath, manifest, receipt) {
  validatePublicationReceipt(receipt, manifest);
  if (receipt.phase === "BASELINE_COMMITTED") return receipt;
  if (receipt.phase !== "ARTIFACTS_PUBLISHED") throw new Error("Only published artifacts can be marked baseline-committed.");
  const updated = {
    ...receipt,
    phase: "BASELINE_COMMITTED",
    updated_at: new Date().toISOString(),
    receipt_digest: ""
  };
  updated.receipt_digest = computePublicationReceiptDigest(updated);
  await atomicWriteJson(receiptPath, updated, 0o600);
  return updated;
}

export function canonicalArtifactTransitionPaths(boundariesPath, transitionId) {
  const repositoryRoot = repositoryRootForBoundaries(boundariesPath);
  const stagingRootPath = resolve(dirname(boundariesPath), "boundary-adjustments", "staging", transitionId);
  return {
    stagingRootPath,
    stagingRootRef: relativeRef(repositoryRoot, stagingRootPath),
    manifestPath: resolve(stagingRootPath, "manifest.json"),
    receiptPath: resolve(stagingRootPath, "publication-receipt.json")
  };
}
