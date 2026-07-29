#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { atomicWriteJson } from "./outline-boundaries-lib.mjs";
import {
  ARTIFACT_TYPES,
  computeInventoryDigest,
  digestRepositoryRef,
  exactObject,
  validateInventory
} from "./outline-transition-workflow-lib.mjs";
import {
  repositoryRootForBoundaries,
  scanBoundaryArtifacts
} from "./outline-adjustment-lib.mjs";
import {
  assertTransitionCommandLock,
  withTransitionCommandLock
} from "./outline-transition-lock-lib.mjs";

const args = process.argv.slice(2);
const extraIndex = args.indexOf("--extra");
const extraPath = extraIndex >= 0 ? args[extraIndex + 1] : null;
const positional = extraIndex >= 0 ? args.filter((_, index) => index !== extraIndex && index !== extraIndex + 1) : args;
if (positional.length !== 2 || (extraIndex >= 0 && !extraPath)) {
  console.error("Usage: node .specify/review/scripts/scan-outline-transition-impact.mjs specs/<root>/outline-boundaries.json <inventory-output.json> [--extra <extra-artifacts.json>]");
  process.exit(2);
}

const [boundariesPath, outputPath] = positional.map((argument) => resolve(argument));

try {
  await withTransitionCommandLock(boundariesPath, async (lock) => {
    const document = await assertTransitionCommandLock(lock);
    if (document.transition_state === "OUTLINE_CHANGE_PROPOSED") {
      throw new Error("Human decision receipt has not finished consumption; retry start-outline-transition first.");
    }
    if (document.transition_state === "ROLLBACK_REQUIRED") throw new Error("ROLLBACK_REQUIRED cannot create a new impact inventory.");
    const artifacts = await scanBoundaryArtifacts(boundariesPath, document);
    if (extraPath) {
      const extra = JSON.parse(await readFile(resolve(extraPath), "utf8"));
      if (!Array.isArray(extra)) throw new Error("--extra must contain an array of artifact_type/artifact_ref/source_feature_code objects.");
      const activeCodes = new Set(document.current_baseline.project_boundaries.map((boundary) => boundary.feature_code));
      const repositoryRoot = repositoryRootForBoundaries(boundariesPath);
      for (const [index, item] of extra.entries()) {
        exactObject(item, ["artifact_type", "artifact_ref", "source_feature_code"], `extra[${index}]`);
        if (!ARTIFACT_TYPES.has(item.artifact_type) || !activeCodes.has(item.source_feature_code)) {
          throw new Error(`Extra artifact type or source feature code is invalid: ${item.artifact_ref}`);
        }
        artifacts.push({ ...item, source_digest: await digestRepositoryRef(item.artifact_ref, repositoryRoot) });
      }
    }
    artifacts.sort((left, right) => left.artifact_ref.localeCompare(right.artifact_ref)
      || left.artifact_type.localeCompare(right.artifact_type));
    const inventory = {
      schema_version: 1,
      transition_id: document.transition.transition_id,
      transition_revision: document.transition.transition_revision,
      proposal_digest: document.proposed_baseline.proposal_digest,
      generated_at: new Date().toISOString(),
      inventory_digest: "",
      artifacts
    };
    inventory.inventory_digest = computeInventoryDigest(inventory);
    validateInventory(inventory);
    const latest = await assertTransitionCommandLock(lock);
    if (latest.proposed_baseline.proposal_digest !== inventory.proposal_digest
      || latest.transition.transition_id !== inventory.transition_id) throw new Error("Transition changed during impact scan.");
    await atomicWriteJson(outputPath, inventory, 0o600);
    console.log(`Outline transition inventory created: ${artifacts.length} artifact(s), digest=${inventory.inventory_digest}. No successor was inferred; command lock released.`);
  });
} catch (error) {
  console.error(`Outline transition impact scan failed: ${error.message}`);
  process.exit(1);
}
