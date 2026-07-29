#!/usr/bin/env node

import { readFile, unlink } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  appendTransitionEvent,
  atomicWriteJson,
  readJson,
  sha256,
  validateOutlineBoundaries
} from "./outline-boundaries-lib.mjs";
import {
  digestRepositoryRef,
  exactObject,
  transitionEvent
} from "./outline-transition-workflow-lib.mjs";
import { repositoryRootForBoundaries } from "./outline-adjustment-lib.mjs";
import {
  assertStagedArtifacts,
  canonicalArtifactTransitionPaths,
  validatePublicationReceipt,
  validateStagingManifest
} from "./outline-transition-artifact-lib.mjs";
import {
  assertTransitionCommandLock,
  withTransitionCommandLock
} from "./outline-transition-lock-lib.mjs";
import {
  featureCodeLedgerPath,
  voidFeatureCodeReservations
} from "./feature-code-ledger-lib.mjs";
import {
  acquireLeaseClaim,
  assertLeaseClaim,
  releaseLeaseClaim
} from "./lease-claim-lib.mjs";

const positional = process.argv.slice(2);
if (positional.length !== 4) {
  console.error("Usage: node .specify/review/scripts/rollback-outline-transition.mjs specs/<root>/outline-boundaries.json specs/review-index.json <transition-log.jsonl> <rollback-proof.json>");
  process.exit(2);
}

const [boundariesPath, reviewIndexPath, journalPath, proofPath] = positional.map((argument) => resolve(argument));
const codeLedgerPath = featureCodeLedgerPath(boundariesPath);
const repositoryRoot = repositoryRootForBoundaries(boundariesPath);
const finalizationClaimPath = join(dirname(boundariesPath), `.${basename(boundariesPath)}.rollback-finalize.lock`);
const proofKeys = [
  "schema_version", "transition_id", "transition_revision", "proposal_digest",
  "rollback_ref", "generated_at", "staging_disposition", "live_writes",
  "verification_refs", "reason"
];

async function findJournalEvent(step, transitionId) {
  try {
    const lines = (await readFile(journalPath, "utf8")).split(/\r?\n/).filter(Boolean);
    return lines.map((line) => JSON.parse(line)).find((event) => (
      event.transition_id === transitionId && event.step === step
    )) || null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function syncReviewIndex() {
  const script = resolve(dirname(fileURLToPath(import.meta.url)), "sync-review-index.mjs");
  const result = spawnSync(process.execPath, [script, boundariesPath, reviewIndexPath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Review index could not be restored from the current baseline:\n${result.stderr || result.stdout}`);
}

function validateProof(proof) {
  exactObject(proof, proofKeys, "outline-transition rollback proof");
  if (proof.schema_version !== 1 || !Number.isFinite(Date.parse(proof.generated_at))
    || !new Set(["discarded", "preserved_isolated"]).has(proof.staging_disposition)
    || !Array.isArray(proof.live_writes) || proof.live_writes.length
    || !Array.isArray(proof.verification_refs) || !proof.verification_refs.length
    || new Set(proof.verification_refs).size !== proof.verification_refs.length
    || typeof proof.reason !== "string" || !proof.reason.trim()) {
    throw new Error("Rollback proof is incomplete or reports live writes.");
  }
}

async function acquireFinalizationClaim() {
  return acquireLeaseClaim(finalizationClaimPath, {
    label: "Outline rollback finalization claim",
    leaseMilliseconds: 300000,
    heartbeatMilliseconds: 30000,
    activeMessage: "Another command is finalizing rollback."
  });
}

async function releaseFinalizationClaim(claim) {
  await releaseLeaseClaim(claim);
}

try {
  const proof = JSON.parse(await readFile(proofPath, "utf8"));
  validateProof(proof);
  for (const ref of proof.verification_refs) await digestRepositoryRef(ref, repositoryRoot);
  const initial = await readJson(boundariesPath);
  const initialErrors = validateOutlineBoundaries(initial);
  if (initialErrors.length) throw new Error(`outline-boundaries is invalid:\n${initialErrors.join("\n")}`);
  const artifactPaths = canonicalArtifactTransitionPaths(boundariesPath, proof.transition_id);
  const manifest = await readJson(artifactPaths.manifestPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  const publication = await readJson(artifactPaths.receiptPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (manifest || publication) {
    if (!manifest || !publication) throw new Error("Artifact staging is incomplete; preserve it and use forward recovery.");
    validateStagingManifest(manifest);
    validatePublicationReceipt(publication, manifest);
    if (publication.phase !== "STAGED" || publication.completed_operations.length) {
      throw new Error("Published artifact writes cannot use pre-commit rollback; use manifest-bound forward recovery.");
    }
    await assertStagedArtifacts(boundariesPath, manifest);
    if (proof.staging_disposition === "discarded") {
      throw new Error("staging_disposition=discarded is false while the transition-owned staging manifest still exists.");
    }
  }

  if (initial.transition_state === "ALIGNED") {
    const claim = await acquireFinalizationClaim();
    try {
      const latest = await readJson(boundariesPath);
      await assertLeaseClaim(claim);
      const prepared = await findJournalEvent("rollback-prepared", proof.transition_id);
      if (!prepared) throw new Error("Aligned baseline has no matching rollback-prepared event.");
      const expectedDetails = sha256({
        eventType: "STEP_COMPLETED",
        step: "rollback-prepared",
        transition_id: proof.transition_id,
        revision: proof.transition_revision,
        reason: proof.reason,
        proposal_digest: proof.proposal_digest
      });
      if (prepared.details_digest !== expectedDetails) throw new Error("Rollback proof no longer matches the prepared rollback event.");
      await voidFeatureCodeReservations(codeLedgerPath, {
        transitionId: proof.transition_id,
        reason: proof.reason
      });
      syncReviewIndex();
      if (!await findJournalEvent("rollback-completed", proof.transition_id)) {
        await appendTransitionEvent(journalPath, transitionEvent("STEP_COMPLETED", proof, latest.current_baseline, "rollback-completed", {
          reason: proof.reason
        }));
      }
      console.log(`Finalized pre-commit rollback for transition ${proof.transition_id}.`);
    } finally {
      await releaseFinalizationClaim(claim);
    }
    process.exit(0);
  }

  await withTransitionCommandLock(boundariesPath, async (lock) => {
    const document = await assertTransitionCommandLock(lock);
    if (proof.transition_id !== document.transition.transition_id
      || proof.transition_revision !== document.transition.transition_revision
      || proof.proposal_digest !== document.proposed_baseline.proposal_digest
      || proof.rollback_ref !== document.transition.rollback_ref) {
      throw new Error("Rollback proof identity does not match the active transition.");
    }
    if (Date.parse(proof.generated_at) < Date.parse(document.proposed_baseline.created_at)) {
      throw new Error("Rollback proof predates the proposed baseline.");
    }
    if (!await findJournalEvent("rollback-prepared", proof.transition_id)) {
      await appendTransitionEvent(journalPath, transitionEvent("STEP_COMPLETED", document.transition, document.current_baseline, "rollback-prepared", {
        reason: proof.reason,
        proposal_digest: proof.proposal_digest
      }));
    }
    const aligned = {
      schema_version: 1,
      root_feature: document.root_feature,
      updated_at: new Date().toISOString(),
      transition_state: "ALIGNED",
      current_baseline: document.current_baseline,
      proposed_baseline: null,
      transition: null
    };
    const errors = validateOutlineBoundaries(aligned);
    if (errors.length) throw new Error(`Rollback result would be invalid:\n${errors.join("\n")}`);
    const latest = await assertTransitionCommandLock(lock);
    if (latest.transition.transition_id !== proof.transition_id
      || latest.proposed_baseline.proposal_digest !== proof.proposal_digest) {
      throw new Error("Transition changed before rollback compare-and-swap update.");
    }
    await atomicWriteJson(boundariesPath, aligned, 0o600);
    await voidFeatureCodeReservations(codeLedgerPath, {
      proposalId: document.proposed_baseline.baseline_id,
      transitionId: proof.transition_id,
      reason: proof.reason
    });
    if (process.env.SPECCOMPASS_FAULT_AFTER_ROLLBACK_COMMIT === "1") {
      throw new Error("Injected failure after rollback commit and before derived-file restoration.");
    }
    syncReviewIndex();
    if (!await findJournalEvent("rollback-completed", proof.transition_id)) {
      await appendTransitionEvent(journalPath, transitionEvent("STEP_COMPLETED", document.transition, document.current_baseline, "rollback-completed", {
        reason: proof.reason
      }));
    }
    const stagedPath = join(dirname(boundariesPath), `.${basename(boundariesPath)}.${proof.transition_id}.staged.json`);
    await unlink(stagedPath).catch(() => undefined);
    console.log(`Rolled back Outline transition ${proof.transition_id} before baseline activation; command lock released.`);
  });
} catch (error) {
  console.error(`Rollback Outline transition failed: ${error.message}`);
  process.exit(1);
}
