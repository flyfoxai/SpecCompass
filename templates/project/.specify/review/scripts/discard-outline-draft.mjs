#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  access, lstat, mkdir, readFile, readdir, realpath, rename
} from "node:fs/promises";
import {
  basename, dirname, join, relative, resolve, sep
} from "node:path";
import { fileURLToPath } from "node:url";
import {
  atomicWriteJson, readJson, sha256, writeJsonExclusive
} from "./outline-boundaries-lib.mjs";
import {
  assertSafeRepositoryFile,
  computeOutlineDraftResetPlanDigest,
  computeOutlineDraftResetReceiptDigest,
  validateOutlineDraftResetPlan,
  validateOutlineDraftResetReceipt,
  validateOutlineDraftResetReceiptAgainstPlan
} from "./outline-draft-reset-lib.mjs";
import { voidFeatureCodeReservations } from "./feature-code-ledger-lib.mjs";
import { withLeaseClaim } from "./lease-claim-lib.mjs";
import { isRepositoryRef } from "./outline-transition-workflow-lib.mjs";

const TRANSIENT_RENAME_CODES = new Set(["EACCES", "EBUSY", "EEXIST", "EPERM"]);
const RENAME_RETRY_DELAYS = [25, 75, 150, 300];
const FIXED_REVIEW_FILES = new Set([
  "outline-review-data.json",
  "outline-confirmation.md",
  "outline-discovery-data.json",
  "outline-discovery-response-pending.json",
  "outline-intent-ledger.json"
]);
const ACTIVE_TRANSITION_ROOTS = ["transitions", "staging"];

function usage() {
  console.error(
    "Usage:\n"
    + "  discard-outline-draft.mjs plan specs/review-index.json specs/<root>/outline-boundaries.json specs/<root>/prd/review/outline-draft-reset-plan.json --root <root-feature>\n"
    + "  discard-outline-draft.mjs apply specs/review-index.json specs/<root>/outline-boundaries.json specs/<root>/prd/review/outline-draft-reset-plan.json --plan-digest <sha256>"
  );
}

function parseArguments(values, optionName) {
  const optionIndex = values.indexOf(optionName);
  const optionValue = optionIndex >= 0 ? values[optionIndex + 1] : null;
  const positional = values.filter((_, index) => index !== optionIndex && index !== optionIndex + 1);
  return { positional, optionValue };
}

function repositoryRef(repositoryRoot, path) {
  const ref = relative(repositoryRoot, resolve(path)).split(sep).join("/");
  if (!isRepositoryRef(ref)) throw new Error(`Path is not a safe repository reference: ${path}`);
  return ref;
}

function rawDigest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fileDigest(path) {
  return rawDigest(await readFile(path));
}

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

async function renameWithRetry(source, target) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(source, target);
      return;
    } catch (error) {
      if (!TRANSIENT_RENAME_CODES.has(error.code) || attempt >= RENAME_RETRY_DELAYS.length) throw error;
      await wait(RENAME_RETRY_DELAYS[attempt]);
    }
  }
}

async function pathExists(path) {
  try { await access(path); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function assertBoundariesAbsent(boundariesPath) {
  if (await pathExists(boundariesPath)) {
    throw new Error("An authoritative outline-boundaries.json exists; discard-outline-draft is allowed only before the first authoritative baseline.");
  }
}

async function assertNoActiveTransition(rootDirectory) {
  const adjustmentRoot = join(rootDirectory, "boundary-adjustments");
  for (const name of ACTIVE_TRANSITION_ROOTS) {
    const directory = join(adjustmentRoot, name);
    if (!await pathExists(directory)) continue;
    const entries = await readdir(directory);
    if (entries.length) throw new Error(`Active or recoverable boundary ${name} exists; finish or recover it before discarding an Outline draft.`);
  }
  const claims = (await readdir(rootDirectory)).filter((name) => (
    name.startsWith(".outline-boundaries.json.")
    && (name.endsWith(".lock") || name.endsWith(".recovery") || name.endsWith(".staged.json"))
  ));
  if (claims.length) throw new Error(`Outline boundary command state is still present: ${claims.join(", ")}`);
}

function resetIndex(index, plannedAt) {
  return {
    ...index,
    updated_at: plannedAt.slice(0, 10),
    hierarchy: { mode: "flat", root_feature: null },
    features: index.features.map((entry) => ({
      ...entry,
      parent_feature: null,
      sibling_order: 0,
      boundary_source: {
        kind: "standalone",
        handoff_ref: null,
        rationale: "Preserved source container after the non-authoritative Outline draft was discarded."
      },
      outline_alignment: {
        status: "not_mapped",
        outline_node_refs: [],
        rationale: "The prior Outline mapping was non-authoritative and has been invalidated for regeneration."
      },
      has_outline_review: false,
      has_outline_discovery: false
    }))
  };
}

async function validateReviewIndex(indexPath) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const validation = spawnSync(process.execPath, [resolve(scriptDir, "validate-review-index.mjs"), indexPath], { encoding: "utf8" });
  if (validation.status !== 0) throw new Error(`review-index is invalid:\n${validation.stderr || validation.stdout}`);
}

async function walkFiles(directory, repositoryRoot, visitor, { allowMissing = false } = {}) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if (allowMissing && error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const path = resolve(directory, entry.name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`Symbolic links are not accepted by the Outline draft reset: ${repositoryRef(repositoryRoot, path)}`);
    if (info.isDirectory()) await walkFiles(path, repositoryRoot, visitor);
    else if (info.isFile()) {
      if (info.nlink > 1) throw new Error(`Hard-linked files are not accepted by the Outline draft reset: ${repositoryRef(repositoryRoot, path)}`);
      await visitor(path);
    }
  }
}

function isOutlineHistoryFile(ref, feature) {
  return new RegExp(`^specs/${feature}/prd/review/history/consumed/outline-discovery-response-[^/]+\\.json$`).test(ref);
}

function isPriorResetArtifact(ref) {
  return ref.includes("/prd/review/history/outline-draft-resets/")
    || ref.endsWith("/prd/review/outline-draft-reset-plan.json")
    || ref.endsWith("/prd/review/outline-draft-reset.json")
    || ref.endsWith("/.outline-draft-reset.lock")
    || ref.endsWith("/.outline-draft-reset.lock.recovery");
}

function isDraftOwnedFile(ref, rootFeature, feature) {
  if (ref === `specs/${feature}/spec-outline.md`) return true;
  const reviewMatch = ref.match(new RegExp(`^specs/${feature}/prd/review/([^/]+)$`));
  if (reviewMatch && FIXED_REVIEW_FILES.has(reviewMatch[1])) return true;
  if (isOutlineHistoryFile(ref, feature)) return true;
  if (ref === `specs/${rootFeature}/outline-boundaries-adoption.json`) return true;
  return ref.startsWith(`specs/${rootFeature}/boundary-adjustments/drafts/`);
}

async function inventoryFeatureDirectory(repositoryRoot, featureDirectory, rootFeature) {
  const preserved = [];
  const draftOwned = [];
  const realRepositoryRoot = await realpath(repositoryRoot);
  const realFeature = await realpath(featureDirectory);
  const outside = relative(realRepositoryRoot, realFeature);
  const featureInfo = await lstat(featureDirectory);
  if (!outside || outside === ".." || outside.startsWith(`..${sep}`)
    || !featureInfo.isDirectory() || featureInfo.isSymbolicLink()) {
    throw new Error(`Feature source container is missing or unsafe: ${featureDirectory}`);
  }
  await walkFiles(featureDirectory, repositoryRoot, async (path) => {
    const ref = repositoryRef(repositoryRoot, path);
    if (isPriorResetArtifact(ref)) return;
    const record = { ref, digest: await fileDigest(path) };
    if (isDraftOwnedFile(ref, rootFeature, basename(featureDirectory))) draftOwned.push(record);
    else preserved.push(record);
  });
  preserved.sort((left, right) => compareText(left.ref, right.ref));
  draftOwned.sort((left, right) => compareText(left.ref, right.ref));
  return { preserved, draftOwned };
}

async function sourceContainersAndDraftFiles(repositoryRoot, specsRoot, index, rootFeature) {
  const sourceContainers = [];
  const draftFiles = [];
  for (const [position, entry] of index.features.entries()) {
    const featureDirectory = resolve(specsRoot, entry.feature);
    const { preserved, draftOwned } = await inventoryFeatureDirectory(repositoryRoot, featureDirectory, rootFeature);
    const prdRef = `specs/${entry.feature}/prd.md`;
    const prd = preserved.find((item) => item.ref === prdRef);
    if (!prd) throw new Error(`PRD source is required and must be preserved: ${prdRef}`);
    sourceContainers.push({
      source_container_id: `source-${String(position + 1).padStart(3, "0")}`,
      legacy_feature_code: entry.feature_code,
      feature: entry.feature,
      prd_ref: prdRef,
      prd_digest: prd.digest,
      preserved_artifact_count: preserved.length,
      preserved_artifacts_digest: sha256({ artifacts: preserved })
    });
    draftFiles.push(...draftOwned);
  }
  const normalized = new Set();
  for (const item of draftFiles) {
    const key = item.ref.normalize("NFC").toLowerCase();
    if (normalized.has(key)) throw new Error(`Draft reset source is duplicated after path normalization: ${item.ref}`);
    normalized.add(key);
  }
  draftFiles.sort((left, right) => compareText(left.ref, right.ref));
  return { sourceContainers, draftFiles };
}

function fixedPaths(boundariesPath, planPath) {
  const rootDirectory = dirname(boundariesPath);
  const repositoryRoot = dirname(dirname(dirname(boundariesPath)));
  const expectedBoundaries = join(rootDirectory, "outline-boundaries.json");
  const expectedReviewIndex = join(repositoryRoot, "specs", "review-index.json");
  const expectedPlan = join(rootDirectory, "prd", "review", "outline-draft-reset-plan.json");
  if (resolve(boundariesPath) !== resolve(expectedBoundaries)) throw new Error("Outline boundaries must use specs/<root>/outline-boundaries.json.");
  if (resolve(planPath) !== resolve(expectedPlan)) throw new Error("Outline draft reset plan must use specs/<root>/prd/review/outline-draft-reset-plan.json.");
  return {
    rootDirectory,
    repositoryRoot,
    specsRoot: dirname(rootDirectory),
    receiptPath: join(rootDirectory, "prd", "review", "outline-draft-reset.json"),
    lockPath: join(rootDirectory, ".outline-draft-reset.lock"),
    expectedReviewIndex
  };
}

function assertFixedReviewIndex(reviewIndexPath, paths) {
  if (resolve(reviewIndexPath) !== resolve(paths.expectedReviewIndex)) {
    throw new Error("Outline draft reset must use the fixed specs/review-index.json path.");
  }
}

function assertArchiveAllowlist(plan) {
  const features = new Set(plan.source_containers.map((source) => source.feature));
  const normalized = new Set();
  for (const entry of plan.archive_entries) {
    const feature = [...features].find((candidate) => entry.source_ref.startsWith(`specs/${candidate}/`));
    if (!feature || !isDraftOwnedFile(entry.source_ref, plan.root_feature, feature)) {
      throw new Error(`Reset plan attempts to archive a preserved artifact: ${entry.source_ref}`);
    }
    const expectedArchive = `${plan.archive_root}/${entry.source_ref}`;
    if (entry.archive_ref !== expectedArchive) {
      throw new Error(`Reset archive target is not derived from its source: ${entry.archive_ref}`);
    }
    const key = entry.source_ref.normalize("NFC").toLowerCase();
    if (normalized.has(key)) throw new Error(`Reset archive source is duplicated after normalization: ${entry.source_ref}`);
    normalized.add(key);
  }
}

async function ensureSafeArchiveParent(paths, archivePath) {
  const parent = dirname(archivePath);
  await mkdir(parent, { recursive: true });
  const archiveRootInfo = await lstat(paths.archiveRoot);
  if (!archiveRootInfo.isDirectory() || archiveRootInfo.isSymbolicLink()) {
    throw new Error(`Reset archive root must be a real directory: ${repositoryRef(paths.repositoryRoot, paths.archiveRoot)}`);
  }
  const realRepositoryRoot = await realpath(paths.repositoryRoot);
  const realArchiveRoot = await realpath(paths.archiveRoot);
  const realParent = await realpath(parent);
  const outsideRepository = relative(realRepositoryRoot, realParent);
  const outsideArchive = relative(realArchiveRoot, realParent);
  if (!outsideRepository || outsideRepository === ".." || outsideRepository.startsWith(`..${sep}`)
    || (outsideArchive === ".." || outsideArchive.startsWith(`..${sep}`))) {
    throw new Error(`Archive parent resolves outside the reset archive: ${repositoryRef(paths.repositoryRoot, parent)}`);
  }
  let current = paths.archiveRoot;
  const relativeParent = relative(paths.archiveRoot, parent);
  for (const segment of relativeParent.split(sep).filter(Boolean)) {
    current = join(current, segment);
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error(`Archive parent must contain only real directories: ${repositoryRef(paths.repositoryRoot, current)}`);
    }
  }
}

async function proposalIds(rootDirectory) {
  const drafts = join(rootDirectory, "boundary-adjustments", "drafts");
  let entries;
  try { entries = await readdir(drafts, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const ids = [];
  for (const entry of entries) {
    const path = join(drafts, entry.name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`Draft proposal path is a symbolic link: ${entry.name}`);
    if (!info.isDirectory()) throw new Error(`boundary-adjustments/drafts may contain only proposal directories: ${entry.name}`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.name)) throw new Error(`Draft proposal ID is unsafe: ${entry.name}`);
    ids.push(entry.name);
  }
  return ids.sort();
}

async function buildPlan(reviewIndexPath, boundariesPath, planPath, rootFeature) {
  const paths = fixedPaths(boundariesPath, planPath);
  assertFixedReviewIndex(reviewIndexPath, paths);
  if (basename(paths.rootDirectory) !== rootFeature) throw new Error("Requested root must match the fixed boundaries path.");
  await assertBoundariesAbsent(boundariesPath);
  await assertNoActiveTransition(paths.rootDirectory);
  if (await pathExists(paths.receiptPath)) throw new Error("An applied Outline draft reset receipt already exists; resume regeneration instead of creating another plan.");
  await validateReviewIndex(reviewIndexPath);
  const index = await readJson(reviewIndexPath);
  if (!index.features.some((entry) => entry.feature === rootFeature)) throw new Error(`Root feature is not present in review-index: ${rootFeature}`);
  const createdAt = new Date().toISOString();
  const resetId = `reset-${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const { sourceContainers, draftFiles } = await sourceContainersAndDraftFiles(
    paths.repositoryRoot, paths.specsRoot, index, rootFeature
  );
  const archiveRoot = `specs/${rootFeature}/prd/review/history/outline-draft-resets/${resetId}`;
  const archiveEntries = draftFiles.map((item) => ({
    source_ref: item.ref,
    source_digest: item.digest,
    archive_ref: `${archiveRoot}/${item.ref}`
  }));
  const afterIndex = resetIndex(index, createdAt);
  const plan = {
    schema_version: 1,
    operation: "DISCARD_OUTLINE_DRAFT",
    reset_id: resetId,
    root_feature: rootFeature,
    created_at: createdAt,
    source_review_index: repositoryRef(paths.repositoryRoot, reviewIndexPath),
    source_review_index_digest: sha256(index),
    review_index_after_digest: sha256(afterIndex),
    authoritative_boundaries: repositoryRef(paths.repositoryRoot, boundariesPath),
    receipt_ref: repositoryRef(paths.repositoryRoot, paths.receiptPath),
    archive_root: archiveRoot,
    source_containers: sourceContainers,
    archive_entries: archiveEntries,
    void_proposal_ids: await proposalIds(paths.rootDirectory),
    plan_digest: ""
  };
  plan.plan_digest = computeOutlineDraftResetPlanDigest(plan);
  validateOutlineDraftResetPlan(plan);
  await mkdir(dirname(planPath), { recursive: true });
  await atomicWriteJson(planPath, plan, 0o600);
  console.log(JSON.stringify({
    operation: plan.operation,
    reset_id: plan.reset_id,
    plan_digest: plan.plan_digest,
    source_container_count: plan.source_containers.length,
    archive_entry_count: plan.archive_entries.length,
    preserved_prds: plan.source_containers.map((item) => item.prd_ref),
    apply_command: `node .specify/review/scripts/discard-outline-draft.mjs apply ${plan.source_review_index} ${plan.authoritative_boundaries} ${repositoryRef(paths.repositoryRoot, planPath)} --plan-digest ${plan.plan_digest}`
  }, null, 2));
}

async function assertPlanLiveSources(plan, paths, index) {
  const { sourceContainers, draftFiles } = await sourceContainersAndDraftFiles(
    paths.repositoryRoot, paths.specsRoot, index, plan.root_feature
  );
  if (sha256(sourceContainers) !== sha256(plan.source_containers)) {
    throw new Error("Preserved PRD/code/Flow/UI source inventory changed after the reset plan was created; create a fresh plan.");
  }
  for (const source of plan.source_containers) {
    await assertSafeRepositoryFile(paths.repositoryRoot, source.prd_ref, source.prd_digest, `PRD source ${source.prd_ref}`);
  }
  const plannedDrafts = new Map(plan.archive_entries.map((entry) => [entry.source_ref, entry.source_digest]));
  for (const draft of draftFiles) {
    if (plannedDrafts.get(draft.ref) !== draft.digest) {
      throw new Error(`Live Outline draft artifact is missing from the immutable reset plan: ${draft.ref}`);
    }
  }
}

async function inspectArchiveEntry(paths, entry) {
  const sourcePath = resolve(paths.repositoryRoot, entry.source_ref);
  const archivePath = resolve(paths.repositoryRoot, entry.archive_ref);
  const archiveLexical = relative(resolve(paths.repositoryRoot, paths.archiveRoot), archivePath);
  if (archiveLexical === ".." || archiveLexical.startsWith(`..${sep}`)) throw new Error(`Archive target escapes the reset archive: ${entry.archive_ref}`);
  const source = await assertSafeRepositoryFile(paths.repositoryRoot, entry.source_ref, entry.source_digest, `Draft source ${entry.source_ref}`, { allowMissing: true });
  const archived = await assertSafeRepositoryFile(paths.repositoryRoot, entry.archive_ref, entry.source_digest, `Draft archive ${entry.archive_ref}`, { allowMissing: true });
  if (source && archived) throw new Error(`Both live and archived copies exist for ${entry.source_ref}; preserve both and resolve the conflict manually.`);
  if (!source && archived) return { state: "archived", sourcePath, archivePath };
  if (!source) throw new Error(`Neither live nor archived copy exists for ${entry.source_ref}.`);
  return { state: "live", sourcePath, archivePath };
}

async function archiveEntry(paths, entry) {
  const inspected = await inspectArchiveEntry(paths, entry);
  if (inspected.state === "archived") return;
  const { sourcePath, archivePath } = inspected;
  await ensureSafeArchiveParent(paths, archivePath);
  await renameWithRetry(sourcePath, archivePath);
  await assertSafeRepositoryFile(paths.repositoryRoot, entry.archive_ref, entry.source_digest, `Draft archive ${entry.archive_ref}`);
}

async function existingReceipt(receiptPath, plan) {
  try {
    const receipt = await readJson(receiptPath);
    validateOutlineDraftResetReceiptAgainstPlan(receipt, plan);
    return receipt;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function applyPlan(reviewIndexPath, boundariesPath, planPath, expectedDigest) {
  const paths = fixedPaths(boundariesPath, planPath);
  assertFixedReviewIndex(reviewIndexPath, paths);
  const plan = await readJson(planPath);
  validateOutlineDraftResetPlan(plan);
  assertArchiveAllowlist(plan);
  if (plan.plan_digest !== expectedDigest) throw new Error("--plan-digest does not match the immutable reset plan.");
  if (plan.authoritative_boundaries !== repositoryRef(paths.repositoryRoot, boundariesPath)
    || plan.source_review_index !== repositoryRef(paths.repositoryRoot, reviewIndexPath)
    || plan.receipt_ref !== repositoryRef(paths.repositoryRoot, paths.receiptPath)) {
    throw new Error("Outline draft reset plan is bound to different fixed repository paths.");
  }
  paths.archiveRoot = resolve(paths.repositoryRoot, plan.archive_root);
  const alreadyApplied = await existingReceipt(paths.receiptPath, plan);
  if (alreadyApplied) {
    console.log(JSON.stringify(alreadyApplied, null, 2));
    return;
  }

  await withLeaseClaim(paths.lockPath, {
    label: "Outline draft reset lock",
    leaseMilliseconds: 300000,
    heartbeatMilliseconds: 30000,
    retryDelays: [0, 25, 75, 150, 300],
    activeMessage: "Another process owns the Outline draft reset lock; retry after it completes."
  }, async () => {
    const recovered = await existingReceipt(paths.receiptPath, plan);
    if (recovered) return;
    await assertBoundariesAbsent(boundariesPath);
    await assertNoActiveTransition(paths.rootDirectory);

    const index = await readJson(reviewIndexPath);
    const currentDigest = sha256(index);
    const indexIsBefore = currentDigest === plan.source_review_index_digest;
    const indexIsAfter = currentDigest === plan.review_index_after_digest;
    if (!indexIsBefore && !indexIsAfter) throw new Error("review-index changed after the reset plan was created; create a fresh plan.");
    const sourceIndex = indexIsBefore ? index : {
      ...index,
      hierarchy: { mode: index.features.some((entry) => entry.feature === plan.root_feature) ? "flat" : index.hierarchy.mode, root_feature: null }
    };
    await assertPlanLiveSources(plan, paths, sourceIndex);

    // Validate the complete write set before the first rename. A stale late entry
    // must not cause avoidable partial archival; interrupted prior runs remain resumable.
    for (const entry of plan.archive_entries) await inspectArchiveEntry(paths, entry);
    for (const entry of plan.archive_entries) await archiveEntry(paths, entry);

    const ledgerPath = join(paths.specsRoot, "feature-code-ledger.json");
    if (await pathExists(ledgerPath)) {
      for (const proposalId of plan.void_proposal_ids) {
        await voidFeatureCodeReservations(ledgerPath, {
          proposalId,
          reason: `Draft Outline reset ${plan.reset_id} invalidated the unconfirmed proposal.`
        });
      }
    }

    const afterIndex = resetIndex(index, plan.created_at);
    if (sha256(afterIndex) !== plan.review_index_after_digest) {
      throw new Error("The deterministic post-reset review-index no longer matches the planned digest.");
    }
    if (indexIsBefore) await atomicWriteJson(reviewIndexPath, afterIndex, 0o600);
    await validateReviewIndex(reviewIndexPath);

    const receipt = {
      schema_version: 1,
      operation: "DISCARD_OUTLINE_DRAFT",
      state: "APPLIED_AWAITING_REGENERATION",
      reset_id: plan.reset_id,
      root_feature: plan.root_feature,
      planned_at: plan.created_at,
      applied_at: new Date().toISOString(),
      plan_ref: repositoryRef(paths.repositoryRoot, planPath),
      plan_digest: plan.plan_digest,
      source_review_index: plan.source_review_index,
      review_index_before_digest: plan.source_review_index_digest,
      review_index_after_digest: plan.review_index_after_digest,
      archive_root: plan.archive_root,
      source_containers: plan.source_containers,
      archived_entries: plan.archive_entries,
      void_proposal_ids: plan.void_proposal_ids,
      next_command: `/sp.prd ${plan.root_feature} --regenerate-outline-draft --reset ${plan.reset_id}`,
      receipt_digest: ""
    };
    receipt.receipt_digest = computeOutlineDraftResetReceiptDigest(receipt);
    validateOutlineDraftResetReceipt(receipt);
    await writeJsonExclusive(paths.receiptPath, receipt, 0o600);
    console.log(JSON.stringify(receipt, null, 2));
  });
}

const [action, ...argumentsAfterAction] = process.argv.slice(2);
try {
  if (action === "plan") {
    const { positional, optionValue: rootFeature } = parseArguments(argumentsAfterAction, "--root");
    if (positional.length !== 3 || !rootFeature) { usage(); process.exit(2); }
    await buildPlan(...positional.map((value) => resolve(value)), rootFeature);
  } else if (action === "apply") {
    const { positional, optionValue: planDigest } = parseArguments(argumentsAfterAction, "--plan-digest");
    if (positional.length !== 3 || !/^[a-f0-9]{64}$/.test(planDigest || "")) { usage(); process.exit(2); }
    await applyPlan(...positional.map((value) => resolve(value)), planDigest);
  } else {
    usage();
    process.exit(2);
  }
} catch (error) {
  console.error(`Discard Outline draft failed: ${error.message}`);
  process.exit(1);
}
