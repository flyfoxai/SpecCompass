#!/usr/bin/env node

import { readFile, unlink } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  appendTransitionEvent,
  atomicWriteJson,
  computeBaselineDigest,
  readJson,
  validateOutlineBoundaries
} from "./outline-boundaries-lib.mjs";
import {
  assertTransitionIdentity,
  digestRepositoryRef,
  transitionEvent,
  validateInventory,
  validateValidationReport
} from "./outline-transition-workflow-lib.mjs";
import { repositoryRootForBoundaries } from "./outline-adjustment-lib.mjs";
import {
  assertPublishedArtifacts,
  canonicalArtifactTransitionPaths,
  markPublicationBaselineCommitted,
  validatePublicationReceipt,
  validateStagingManifest
} from "./outline-transition-artifact-lib.mjs";
import {
  assertTransitionCommandLock,
  withTransitionCommandLock
} from "./outline-transition-lock-lib.mjs";
import {
  assertProposalFeatureCodes,
  featureCodeLedgerPath,
  reconcileFeatureCodeLedger
} from "./feature-code-ledger-lib.mjs";
import {
  acquireLeaseClaim,
  assertLeaseClaim,
  releaseLeaseClaim
} from "./lease-claim-lib.mjs";

const args = process.argv.slice(2);
const inventoryIndex = args.indexOf("--inventory");
const reportIndex = args.indexOf("--report");
const manifestIndex = args.indexOf("--manifest");
const publicationIndex = args.indexOf("--publication");
const inventoryArgument = inventoryIndex >= 0 ? args[inventoryIndex + 1] : null;
const reportArgument = reportIndex >= 0 ? args[reportIndex + 1] : null;
const manifestArgument = manifestIndex >= 0 ? args[manifestIndex + 1] : null;
const publicationArgument = publicationIndex >= 0 ? args[publicationIndex + 1] : null;
const consumed = new Set();
for (const index of [inventoryIndex, reportIndex, manifestIndex, publicationIndex]) {
  if (index >= 0) { consumed.add(index); consumed.add(index + 1); }
}
const positional = args.filter((_, index) => !consumed.has(index));
if (positional.length !== 3 || !inventoryArgument || !reportArgument
  || inventoryIndex + 1 >= args.length || reportIndex + 1 >= args.length
  || (Boolean(manifestArgument) !== Boolean(publicationArgument))) {
  console.error("Usage: node .specify/review/scripts/activate-outline-baseline.mjs specs/<root>/outline-boundaries.json specs/review-index.json <transition-log.jsonl> --inventory <inventory.json> --report <validation-report.json> [--manifest <staging-manifest.json> --publication <publication-receipt.json>]");
  process.exit(2);
}

const [boundariesPath, reviewIndexPath, journalPath] = positional.map((argument) => resolve(argument));
const inventoryPath = resolve(inventoryArgument);
const reportPath = resolve(reportArgument);
const manifestPath = manifestArgument ? resolve(manifestArgument) : null;
const publicationPath = publicationArgument ? resolve(publicationArgument) : null;
const codeLedgerPath = featureCodeLedgerPath(boundariesPath);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const finalizationClaimPath = join(dirname(boundariesPath), `.${basename(boundariesPath)}.activation-finalize.lock`);
const repositoryRoot = repositoryRootForBoundaries(boundariesPath);

async function readJournalEvents() {
  try {
    const source = await readFile(journalPath, "utf8");
    return source.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function journalContains(type, transitionId, baselineId) {
  return (await readJournalEvents()).some((item) => (
    item.event_type === type && item.transition_id === transitionId && item.baseline_id === baselineId
  ));
}

function syncReviewIndex(boundarySource) {
  const result = spawnSync(process.execPath, [resolve(scriptDir, "sync-review-index.mjs"), boundarySource, reviewIndexPath], {
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(`Derived review-index could not be synchronized:\n${result.stderr || result.stdout}`);
}

async function acquireFinalizationClaim() {
  return acquireLeaseClaim(finalizationClaimPath, {
    label: "Outline activation finalization claim",
    leaseMilliseconds: 300000,
    heartbeatMilliseconds: 30000,
    activeMessage: "Another command is finalizing Outline activation."
  });
}

async function releaseFinalizationClaim(claim) {
  await releaseLeaseClaim(claim);
}

async function finalizeCommitted(document) {
  const claim = await acquireFinalizationClaim();
  try {
    const latest = await readJson(boundariesPath);
    await assertLeaseClaim(claim);
    const errors = validateOutlineBoundaries(latest);
    if (errors.length || latest.transition_state !== "ALIGNED") {
      throw new Error("Committed activation finalization requires a valid ALIGNED baseline.");
    }
    const events = await readJournalEvents();
    const prepared = [...events].reverse().find((item) => (
      item.event_type === "BASELINE_ACTIVATION_PREPARED"
      && item.baseline_id === latest.current_baseline.baseline_id
      && item.baseline_digest === latest.current_baseline.baseline_digest
    ));
    if (!prepared) {
      if (events.some((item) => item.event_type === "ALIGNED_NEW_BASELINE"
        && item.baseline_id === latest.current_baseline.baseline_id)) {
        syncReviewIndex(boundariesPath);
        console.log(`Outline baseline ${latest.current_baseline.baseline_id} is already fully activated.`);
        return;
      }
      throw new Error("Committed baseline has no matching BASELINE_ACTIVATION_PREPARED event; manual journal repair is required.");
    }
    const artifactPaths = canonicalArtifactTransitionPaths(boundariesPath, prepared.transition_id);
    const manifest = await readJson(artifactPaths.manifestPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
    const publication = await readJson(artifactPaths.receiptPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
    if (manifest || publication) {
      if (!manifest || !publication) throw new Error("Committed artifact migration has an incomplete manifest/publication pair.");
      validateStagingManifest(manifest);
      validatePublicationReceipt(publication, manifest);
      await assertPublishedArtifacts(boundariesPath, manifest, publication);
      await markPublicationBaselineCommitted(artifactPaths.receiptPath, manifest, publication);
    }
    await reconcileFeatureCodeLedger(codeLedgerPath, latest);
    syncReviewIndex(boundariesPath);
    if (!await journalContains("ALIGNED_NEW_BASELINE", prepared.transition_id, prepared.baseline_id)) {
      await appendTransitionEvent(
        journalPath,
        transitionEvent("ALIGNED_NEW_BASELINE", prepared, latest.current_baseline, "outline-boundaries-commit-point")
      );
    }
    const stagedPath = join(dirname(boundariesPath), `.${basename(boundariesPath)}.${prepared.transition_id}.staged.json`);
    await unlink(stagedPath).catch(() => undefined);
    console.log(`Finalized committed Outline baseline ${latest.current_baseline.baseline_id}.`);
  } finally {
    await releaseFinalizationClaim(claim);
  }
}

try {
  const initial = await readJson(boundariesPath);
  if (initial.transition_state === "ALIGNED") {
    await finalizeCommitted(initial);
    process.exit(0);
  }
  if (initial.transition_state !== "MIGRATION_BLOCKED" && initial.transition && initial.current_baseline && initial.proposed_baseline
    && (initial.proposed_baseline.base_baseline_id !== initial.current_baseline.baseline_id
      || initial.proposed_baseline.base_baseline_digest !== initial.current_baseline.baseline_digest)) {
    if (initial.transition.lock !== null) throw new Error("Stale-base transition is currently locked by another command.");
    const blocked = structuredClone(initial);
    blocked.transition_state = "MIGRATION_BLOCKED";
    blocked.updated_at = new Date().toISOString();
    blocked.transition.updated_at = blocked.updated_at;
    if (!blocked.transition.completed_steps.includes("cas-conflict")) blocked.transition.completed_steps.push("cas-conflict");
    blocked.transition.next_action = "Roll back the stale proposal and create a new proposal from the current baseline.";
    const blockedErrors = validateOutlineBoundaries(blocked);
    if (blockedErrors.length) throw new Error(`CAS conflict could not be recorded safely:\n${blockedErrors.join("\n")}`);
    await atomicWriteJson(boundariesPath, blocked, 0o600);
    if (!await journalContains("MIGRATION_BLOCKED", blocked.transition.transition_id, blocked.current_baseline.baseline_id)) {
      await appendTransitionEvent(journalPath, transitionEvent("MIGRATION_BLOCKED", blocked.transition, blocked.current_baseline, "cas-conflict"));
    }
    throw new Error("Proposal base baseline is stale; transition entered MIGRATION_BLOCKED.");
  }

  await withTransitionCommandLock(boundariesPath, async (lock) => {
    const document = await assertTransitionCommandLock(lock);
    if (document.transition_state !== "CROSS_ARTIFACT_VALIDATED") {
      throw new Error(`Activation requires CROSS_ARTIFACT_VALIDATED, got ${document.transition_state}.`);
    }
    const transition = document.transition;
    const proposal = document.proposed_baseline;
    if (!proposal.decision_ref) throw new Error("Approved proposal must carry decision_ref before activation.");
    if (proposal.base_baseline_id !== document.current_baseline.baseline_id
      || proposal.base_baseline_digest !== document.current_baseline.baseline_digest) throw new Error("Proposal base baseline is stale.");
    if (transition.impact_assessments.some((impact) => impact.outcome === "BLOCKED")) {
      throw new Error("Activation cannot continue with BLOCKED impact assessments.");
    }
    const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    validateInventory(inventory);
    assertTransitionIdentity(inventory, transition, proposal.proposal_digest, "Inventory");
    validateValidationReport(report, document);
    if (report.inventory_digest !== inventory.inventory_digest) throw new Error("Validation report does not match the supplied inventory.");
    if (report.checks.some((check) => check.status === "blocked")) throw new Error("Validation report contains a blocked phase.");
    for (const marker of [`impact-inventory:${inventory.inventory_digest}`, `validation-report:${report.report_digest}`]) {
      if (!transition.completed_steps.includes(marker)) throw new Error(`Active transition is missing validation marker ${marker}.`);
    }
    const restructure = report.checks.find((check) => check.check_id === "project_restructure");
    let manifest = null;
    let publication = null;
    const physicalSources = new Set();
    if (restructure.status === "executed") {
      if (!manifestPath || !publicationPath) {
        throw new Error("Physical restructuring activation requires --manifest and --publication.");
      }
      const canonicalPaths = canonicalArtifactTransitionPaths(boundariesPath, transition.transition_id);
      if (manifestPath !== canonicalPaths.manifestPath || publicationPath !== canonicalPaths.receiptPath) {
        throw new Error("Activation accepts only the transition-owned canonical manifest and publication receipt paths.");
      }
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      publication = JSON.parse(await readFile(publicationPath, "utf8"));
      validateStagingManifest(manifest, document, inventory);
      validatePublicationReceipt(publication, manifest);
      if (!transition.completed_steps.includes(`staging-manifest:${manifest.manifest_digest}`)
        || !transition.completed_steps.includes(`artifact-publication:${publication.receipt_digest}`)) {
        throw new Error("Active transition is not bound to the supplied staging/publication receipts.");
      }
      await assertPublishedArtifacts(boundariesPath, manifest, publication);
      for (const operation of manifest.operations) physicalSources.add(`${operation.artifact_type}:${operation.source_artifact_ref}`);
    } else if (manifestPath || publicationPath) {
      throw new Error("A skipped project_restructure check must not supply artifact publication files.");
    }
    for (const artifact of inventory.artifacts) {
      if (physicalSources.has(`${artifact.artifact_type}:${artifact.artifact_ref}`)) continue;
      const currentDigest = await digestRepositoryRef(artifact.artifact_ref, repositoryRoot);
      if (currentDigest !== artifact.source_digest) throw new Error(`Artifact changed after validation: ${artifact.artifact_ref}`);
    }
    await assertProposalFeatureCodes(codeLedgerPath, document, proposal, transition.transition_id);

    const baseline = {
      baseline_id: proposal.baseline_id,
      baseline_digest: "",
      created_at: proposal.created_at,
      created_by: proposal.created_by,
      decision_ref: proposal.decision_ref,
      project_boundaries: proposal.project_boundaries,
      tombstones: proposal.tombstones
    };
    baseline.baseline_digest = computeBaselineDigest(baseline);
    const activated = {
      schema_version: 1,
      root_feature: document.root_feature,
      updated_at: new Date().toISOString(),
      transition_state: "ALIGNED",
      current_baseline: baseline,
      proposed_baseline: null,
      transition: null
    };
    const activatedErrors = validateOutlineBoundaries(activated);
    if (activatedErrors.length) throw new Error(`Activated baseline would be invalid:\n${activatedErrors.join("\n")}`);
    const latest = await assertTransitionCommandLock(lock);
    if (latest.transition_state !== "CROSS_ARTIFACT_VALIDATED"
      || latest.transition.transition_id !== transition.transition_id
      || latest.proposed_baseline.proposal_digest !== proposal.proposal_digest) {
      throw new Error("Transition changed before activation compare-and-swap.");
    }

    const stagedPath = join(dirname(boundariesPath), `.${basename(boundariesPath)}.${transition.transition_id}.staged.json`);
    await atomicWriteJson(stagedPath, activated, 0o600);
    if (!await journalContains("BASELINE_ACTIVATION_PREPARED", transition.transition_id, baseline.baseline_id)) {
      await appendTransitionEvent(
        journalPath,
        transitionEvent("BASELINE_ACTIVATION_PREPARED", transition, baseline, "derived-files-before-commit", {
          inventory_digest: inventory.inventory_digest,
          validation_report_digest: report.report_digest,
          ...(manifest ? {
            manifest_digest: manifest.manifest_digest,
            publication_receipt_digest: publication.receipt_digest
          } : {})
        })
      );
    }
    syncReviewIndex(stagedPath);
    if (process.env.SPECCOMPASS_FAULT_AFTER_INDEX_SYNC === "1") {
      throw new Error("Injected failure after review-index synchronization and before commit point.");
    }
    for (const artifact of inventory.artifacts) {
      if (physicalSources.has(`${artifact.artifact_type}:${artifact.artifact_ref}`)) continue;
      const currentDigest = await digestRepositoryRef(artifact.artifact_ref, repositoryRoot);
      if (currentDigest !== artifact.source_digest) throw new Error(`Artifact changed immediately before commit: ${artifact.artifact_ref}`);
    }
    if (manifest && publication) await assertPublishedArtifacts(boundariesPath, manifest, publication);
    await atomicWriteJson(boundariesPath, activated, 0o600);
    if (manifest && publication) {
      publication = await markPublicationBaselineCommitted(publicationPath, manifest, publication);
    }
    await reconcileFeatureCodeLedger(codeLedgerPath, activated);
    if (process.env.SPECCOMPASS_FAULT_AFTER_BOUNDARY_COMMIT === "1") {
      throw new Error("Injected failure after the authoritative commit point and before journal finalization.");
    }
    syncReviewIndex(boundariesPath);
    if (!await journalContains("ALIGNED_NEW_BASELINE", transition.transition_id, baseline.baseline_id)) {
      await appendTransitionEvent(
        journalPath,
        transitionEvent("ALIGNED_NEW_BASELINE", transition, baseline, "outline-boundaries-commit-point", {
          inventory_digest: inventory.inventory_digest,
          validation_report_digest: report.report_digest,
          ...(manifest ? {
            manifest_digest: manifest.manifest_digest,
            publication_receipt_digest: publication.receipt_digest
          } : {})
        })
      );
    }
    await unlink(stagedPath).catch(() => undefined);
    console.log(`Activated Outline baseline ${baseline.baseline_id} at the authoritative commit point; command lock released.`);
  });
} catch (error) {
  console.error(`Outline baseline activation failed: ${error.message}`);
  process.exit(1);
}
