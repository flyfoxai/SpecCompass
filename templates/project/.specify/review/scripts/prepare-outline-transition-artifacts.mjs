#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  appendTransitionEvent,
  atomicWriteJson,
  readJson,
  validateOutlineBoundaries
} from "./outline-boundaries-lib.mjs";
import {
  buildStagingManifest,
  canonicalArtifactTransitionPaths,
  createPublicationReceipt,
  validatePublicationReceipt,
  validateStagingManifest
} from "./outline-transition-artifact-lib.mjs";
import {
  stableEqual,
  transitionEvent,
  validateEvidenceDocument,
  validateInventory
} from "./outline-transition-workflow-lib.mjs";
import {
  assertTransitionCommandLock,
  withTransitionCommandLock
} from "./outline-transition-lock-lib.mjs";

const [boundariesArgument, inventoryArgument, evidenceArgument, planArgument, journalArgument, ...extra] = process.argv.slice(2);
if (!boundariesArgument || !inventoryArgument || !evidenceArgument || !planArgument || !journalArgument || extra.length) {
  console.error("Usage: node .specify/review/scripts/prepare-outline-transition-artifacts.mjs specs/<root>/outline-boundaries.json <inventory.json> <evidence.json> <staging-plan.json> <transition-log.jsonl>");
  process.exit(2);
}

const boundariesPath = resolve(boundariesArgument);
const inventoryPath = resolve(inventoryArgument);
const evidencePath = resolve(evidenceArgument);
const planPath = resolve(planArgument);
const journalPath = resolve(journalArgument);

async function journalContains(transitionId, step) {
  try {
    return (await readFile(journalPath, "utf8")).split(/\r?\n/).filter(Boolean).some((line) => {
      const event = JSON.parse(line);
      return event.transition_id === transitionId && event.step === step;
    });
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

try {
  await withTransitionCommandLock(boundariesPath, async (lock) => {
    const document = await assertTransitionCommandLock(lock);
    if (!new Set(["OUTLINE_CHANGE_APPROVED", "PROJECT_RESTRUCTURE_STAGED"]).has(document.transition_state)) {
      throw new Error(`Artifact staging requires OUTLINE_CHANGE_APPROVED or PROJECT_RESTRUCTURE_STAGED, got ${document.transition_state}.`);
    }
    const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
    const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
    const plan = JSON.parse(await readFile(planPath, "utf8"));
    validateInventory(inventory);
    validateEvidenceDocument(evidence, inventory, document);
    const paths = canonicalArtifactTransitionPaths(boundariesPath, document.transition.transition_id);
    if (plan.staging_root !== paths.stagingRootRef) {
      throw new Error(`Staging plan must use ${paths.stagingRootRef}.`);
    }
    let manifest = await readJson(paths.manifestPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
    let receipt = await readJson(paths.receiptPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
    if (manifest) {
      validateStagingManifest(manifest, document, inventory);
      const manifestPlan = {
        schema_version: 1,
        transition_id: manifest.transition_id,
        inventory_digest: manifest.inventory_digest,
        staging_root: manifest.staging_root,
        operations: manifest.operations.map((operation) => ({
          artifact_type: operation.artifact_type,
          source_artifact_ref: operation.source_artifact_ref,
          operation: operation.operation,
          target_artifact_ref: operation.target_artifact_ref,
          target_feature_code: operation.target_feature_code,
          staged_artifact_ref: operation.staged_artifact_ref
        }))
      };
      if (!stableEqual(manifestPlan, plan)) {
        throw new Error("Existing staging manifest conflicts with the requested staging plan; create a new proposal instead of mutating it.");
      }
    } else {
      manifest = await buildStagingManifest(boundariesPath, document, inventory, evidence, plan);
      await atomicWriteJson(paths.manifestPath, manifest, 0o600);
    }
    if (receipt) validatePublicationReceipt(receipt, manifest);
    else {
      receipt = createPublicationReceipt(manifest);
      await atomicWriteJson(paths.receiptPath, receipt, 0o600);
    }
    if (receipt.phase !== "STAGED") throw new Error(`Artifacts have already entered ${receipt.phase}; staging cannot be rewritten.`);

    const marker = `staging-manifest:${manifest.manifest_digest}`;
    const updated = structuredClone(document);
    updated.transition_state = "PROJECT_RESTRUCTURE_STAGED";
    updated.updated_at = new Date().toISOString();
    updated.transition.updated_at = updated.updated_at;
    updated.transition.artifact_reassignments = evidence.artifact_reassignments;
    updated.transition.impact_assessments = evidence.impact_assessments;
    if (!updated.transition.completed_steps.includes(marker)) updated.transition.completed_steps.push(marker);
    if (!updated.transition.completed_steps.includes("project-restructure-staged")) {
      updated.transition.completed_steps.push("project-restructure-staged");
    }
    updated.transition.next_action = "Validate the staged artifacts and all inventory-driven Flow/UI/cross-artifact impacts.";
    const errors = validateOutlineBoundaries(updated);
    if (errors.length) throw new Error(`Staged transition would be invalid:\n${errors.join("\n")}`);
    const latest = await assertTransitionCommandLock(lock);
    if (latest.transition.transition_id !== document.transition.transition_id
      || latest.proposed_baseline.proposal_digest !== document.proposed_baseline.proposal_digest) {
      throw new Error("Transition changed before staging compare-and-swap update.");
    }
    await atomicWriteJson(boundariesPath, updated, 0o600);
    if (!await journalContains(updated.transition.transition_id, "artifact-staging-manifest-created")) {
      await appendTransitionEvent(journalPath, transitionEvent(
        "ARTIFACTS_STAGED",
        updated.transition,
        updated.current_baseline,
        "artifact-staging-manifest-created",
        { manifest_digest: manifest.manifest_digest, inventory_digest: inventory.inventory_digest }
      ));
    }
    console.log(JSON.stringify({
      transition_id: updated.transition.transition_id,
      state: updated.transition_state,
      manifest: paths.manifestPath,
      publication_receipt: paths.receiptPath,
      manifest_digest: manifest.manifest_digest,
      command_lock_released: true
    }));
  });
} catch (error) {
  console.error(`Prepare Outline artifact staging failed: ${error.message}`);
  process.exit(1);
}
