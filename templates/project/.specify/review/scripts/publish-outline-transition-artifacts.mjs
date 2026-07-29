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
  assertPublishedArtifacts,
  canonicalArtifactTransitionPaths,
  publishStagedArtifacts,
  validatePublicationReceipt,
  validateStagingManifest
} from "./outline-transition-artifact-lib.mjs";
import { transitionEvent } from "./outline-transition-workflow-lib.mjs";
import {
  assertTransitionCommandLock,
  withTransitionCommandLock
} from "./outline-transition-lock-lib.mjs";

const [boundariesArgument, journalArgument, ...extra] = process.argv.slice(2);
if (!boundariesArgument || !journalArgument || extra.length) {
  console.error("Usage: node .specify/review/scripts/publish-outline-transition-artifacts.mjs specs/<root>/outline-boundaries.json <transition-log.jsonl>");
  process.exit(2);
}
const boundariesPath = resolve(boundariesArgument);
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
    if (document.transition_state !== "CROSS_ARTIFACT_VALIDATED") {
      throw new Error(`Artifact publication requires CROSS_ARTIFACT_VALIDATED, got ${document.transition_state}.`);
    }
    const paths = canonicalArtifactTransitionPaths(boundariesPath, document.transition.transition_id);
    const manifest = await readJson(paths.manifestPath);
    let receipt = await readJson(paths.receiptPath);
    validateStagingManifest(manifest, document);
    validatePublicationReceipt(receipt, manifest);
    if (!document.transition.completed_steps.includes(`staging-manifest:${manifest.manifest_digest}`)) {
      throw new Error("Active transition is not bound to this staging manifest.");
    }
    let completedThisRun = 0;
    receipt = await publishStagedArtifacts(boundariesPath, manifest, receipt, paths.receiptPath, async () => {
      completedThisRun += 1;
      if (process.env.SPECCOMPASS_FAULT_AFTER_ARTIFACT_OPERATION === String(completedThisRun)) {
        throw new Error("Injected failure after a recoverable artifact publication operation.");
      }
    });
    await assertPublishedArtifacts(boundariesPath, manifest, receipt);
    const marker = `artifact-publication:${receipt.receipt_digest}`;
    const latest = await assertTransitionCommandLock(lock);
    const updated = structuredClone(latest);
    updated.updated_at = new Date().toISOString();
    updated.transition.updated_at = updated.updated_at;
    if (!updated.transition.completed_steps.includes(marker)) updated.transition.completed_steps.push(marker);
    if (!updated.transition.completed_steps.includes("artifacts-published")) updated.transition.completed_steps.push("artifacts-published");
    updated.transition.next_action = "Revalidate the publication receipt and activate the approved Outline baseline.";
    const errors = validateOutlineBoundaries(updated);
    if (errors.length) throw new Error(`Published transition state would be invalid:\n${errors.join("\n")}`);
    await atomicWriteJson(boundariesPath, updated, 0o600);
    if (!await journalContains(updated.transition.transition_id, "artifacts-published")) {
      await appendTransitionEvent(journalPath, transitionEvent(
        "ARTIFACTS_PUBLISHED",
        updated.transition,
        updated.current_baseline,
        "artifacts-published",
        { manifest_digest: manifest.manifest_digest, publication_receipt_digest: receipt.receipt_digest }
      ));
    }
    console.log(JSON.stringify({
      transition_id: updated.transition.transition_id,
      state: updated.transition_state,
      publication_phase: receipt.phase,
      completed_operations: receipt.completed_operations.length,
      command_lock_released: true
    }));
  });
} catch (error) {
  console.error(`Publish Outline transition artifacts failed: ${error.message}`);
  process.exit(1);
}
