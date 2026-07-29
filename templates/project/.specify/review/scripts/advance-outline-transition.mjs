#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  appendTransitionEvent,
  atomicWriteJson,
  validateOutlineBoundaries
} from "./outline-boundaries-lib.mjs";
import {
  artifactKey,
  assertTransitionIdentity,
  computeValidationReportDigest,
  digestRepositoryRef,
  requireCoverage,
  transitionEvent,
  validateEvidenceDocument,
  validateInventory,
  validateValidationReport
} from "./outline-transition-workflow-lib.mjs";
import { repositoryRootForBoundaries } from "./outline-adjustment-lib.mjs";
import {
  assertStagedArtifacts,
  validateStagingManifest
} from "./outline-transition-artifact-lib.mjs";
import {
  assertTransitionCommandLock,
  withTransitionCommandLock
} from "./outline-transition-lock-lib.mjs";

const args = process.argv.slice(2);
const action = args.shift();
const boundariesArgument = args.shift();
const journalArgument = args.shift();
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const inventoryArgument = option("--inventory");
const evidenceArgument = option("--evidence");
const reportArgument = option("--report");
const manifestArgument = option("--manifest");
const reason = option("--reason");
const recognized = new Set(["--inventory", "--evidence", "--report", "--manifest", "--reason"]);
const consumedArgs = new Set();
for (let index = 0; index < args.length; index += 1) {
  if (!recognized.has(args[index]) || index + 1 >= args.length) continue;
  consumedArgs.add(index);
  consumedArgs.add(index + 1);
  index += 1;
}
if (!new Set(["validate", "block", "resume", "require-rollback"]).has(action)
  || !boundariesArgument || !journalArgument || consumedArgs.size !== args.length) {
  console.error("Usage: node .specify/review/scripts/advance-outline-transition.mjs <validate|block|resume|require-rollback> specs/<root>/outline-boundaries.json <transition-log.jsonl> [--inventory <inventory.json> --evidence <evidence.json> --report <validation-report.json> --manifest <staging-manifest.json>] [--reason <text>]");
  process.exit(2);
}

const boundariesPath = resolve(boundariesArgument);
const journalPath = resolve(journalArgument);
const repositoryRoot = repositoryRootForBoundaries(boundariesPath);

async function loadEvidence(document) {
  if (!inventoryArgument || !evidenceArgument || !reportArgument) {
    throw new Error("validate requires --inventory, --evidence, and --report.");
  }
  const inventory = JSON.parse(await readFile(resolve(inventoryArgument), "utf8"));
  const evidence = JSON.parse(await readFile(resolve(evidenceArgument), "utf8"));
  validateInventory(inventory);
  assertTransitionIdentity(inventory, document.transition, document.proposed_baseline.proposal_digest, "Inventory");
  validateEvidenceDocument(evidence, inventory, document);
  return { inventory, evidence };
}

async function journalContains(transitionId, step) {
  try {
    const lines = (await readFile(journalPath, "utf8")).split(/\r?\n/).filter(Boolean);
    return lines.some((line) => {
      const event = JSON.parse(line);
      return event.transition_id === transitionId && event.step === step;
    });
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function validateImpactEvidence(inventory, evidence) {
  const inventoryByKey = new Map(inventory.artifacts.map((artifact) => [artifactKey(artifact), artifact]));
  for (const impact of evidence.impact_assessments) {
    const inventoried = inventoryByKey.get(artifactKey(impact));
    if (!inventoried) throw new Error(`Impact is not present in the inventory: ${impact.artifact_ref}`);
    if (impact.outcome === "UNCHANGED_WITH_EVIDENCE") {
      if (!impact.evidence.length) throw new Error(`UNCHANGED_WITH_EVIDENCE requires evidence: ${impact.artifact_ref}`);
      if (!impact.evidence.some((item) => item.source_digest === inventoried.source_digest)) {
        throw new Error(`UNCHANGED_WITH_EVIDENCE does not match the inventoried source digest: ${impact.artifact_ref}`);
      }
    }
  }
}

function phaseCheck(checkId, artifacts, blocked, executedReason, skippedReason) {
  if (blocked) return { check_id: checkId, status: "blocked", artifact_count: artifacts.length, reason: blocked };
  if (artifacts.length) return { check_id: checkId, status: "executed", artifact_count: artifacts.length, reason: executedReason };
  return { check_id: checkId, status: "skipped", artifact_count: 0, reason: skippedReason };
}

function buildReport(document, inventory, evidence) {
  const impactsByKey = new Map(evidence.impact_assessments.map((item) => [artifactKey(item), item]));
  const reassignmentsByKey = new Map(evidence.artifact_reassignments.map((item) => [artifactKey(item), item]));
  const flowArtifacts = inventory.artifacts.filter((item) => item.artifact_type === "flow");
  const uiArtifacts = inventory.artifacts.filter((item) => item.artifact_type === "ui");
  const restructureArtifacts = inventory.artifacts.filter((item) => {
    const reassignment = reassignmentsByKey.get(artifactKey(item));
    const impact = impactsByKey.get(artifactKey(item));
    return reassignment?.disposition !== "shared" || impact?.outcome !== "UNCHANGED_WITH_EVIDENCE";
  });
  const blockedReassignment = evidence.artifact_reassignments.find((item) => item.disposition === "blocked");
  const blockedImpact = evidence.impact_assessments.find((item) => item.outcome === "BLOCKED");
  const flowBlocked = evidence.impact_assessments.find((item) => item.artifact_type === "flow" && item.outcome === "BLOCKED");
  const uiBlocked = evidence.impact_assessments.find((item) => item.artifact_type === "ui" && item.outcome === "BLOCKED");
  const checks = [
    phaseCheck(
      "project_restructure",
      restructureArtifacts,
      blockedReassignment ? `Artifact reassignment is blocked: ${blockedReassignment.artifact_ref}` : null,
      "At least one inventoried artifact has an explicit migration, regeneration, retirement, or successor reassignment.",
      "All inventoried artifacts retain their current ownership and content with evidence; no physical staging is required."
    ),
    phaseCheck(
      "flow",
      flowArtifacts,
      flowBlocked ? `Flow impact is blocked: ${flowBlocked.artifact_ref}` : null,
      "Flow artifacts were present and every Flow impact outcome was evaluated.",
      "No Flow artifact exists in the authoritative inventory."
    ),
    phaseCheck(
      "ui",
      uiArtifacts,
      uiBlocked ? `UI impact is blocked: ${uiBlocked.artifact_ref}` : null,
      "UI artifacts were present and every UI impact outcome was evaluated.",
      "No UI artifact exists in the authoritative inventory."
    ),
    phaseCheck(
      "cross_artifact",
      inventory.artifacts,
      blockedImpact ? `Cross-artifact closure is blocked: ${blockedImpact.artifact_ref}` : null,
      "Every inventoried artifact has reassignment and impact coverage tied to current source digests.",
      "The authoritative inventory is empty, so cross-artifact closure has no artifact checks to execute."
    )
  ];
  const report = {
    schema_version: 1,
    transition_id: document.transition.transition_id,
    transition_revision: document.transition.transition_revision,
    proposal_digest: document.proposed_baseline.proposal_digest,
    inventory_digest: inventory.inventory_digest,
    generated_at: new Date().toISOString(),
    checks,
    report_digest: ""
  };
  report.report_digest = computeValidationReportDigest(report);
  validateValidationReport(report, document);
  return report;
}

try {
  await withTransitionCommandLock(boundariesPath, async (lock) => {
    const document = await assertTransitionCommandLock(lock);
    let targetState;
    let step;
    let eventType = "STEP_COMPLETED";
    let details = {};
    let inventory = null;
    let evidence = null;

    if (action === "validate") {
      if (!new Set(["OUTLINE_CHANGE_APPROVED", "PROJECT_RESTRUCTURE_STAGED", "CROSS_ARTIFACT_VALIDATED", "MIGRATION_BLOCKED"]).has(document.transition_state)) {
        throw new Error(`validate requires OUTLINE_CHANGE_APPROVED, PROJECT_RESTRUCTURE_STAGED, or CROSS_ARTIFACT_VALIDATED, got ${document.transition_state}.`);
      }
      if (document.transition_state === "MIGRATION_BLOCKED") {
        throw new Error("Run resume first; it returns the transition to OUTLINE_CHANGE_APPROVED for a fresh validation.");
      }
      ({ inventory, evidence } = await loadEvidence(document));
      requireCoverage(inventory, evidence.artifact_reassignments, () => true, "Artifact reassignment");
      requireCoverage(inventory, evidence.impact_assessments, () => true, "Cross-artifact impact assessment");
      validateImpactEvidence(inventory, evidence);
      for (const artifact of inventory.artifacts) {
        const currentDigest = await digestRepositoryRef(artifact.artifact_ref, repositoryRoot);
        if (currentDigest !== artifact.source_digest) throw new Error(`Artifact changed after inventory creation: ${artifact.artifact_ref}`);
      }
      for (const impact of evidence.impact_assessments) {
        for (const record of impact.evidence) {
          const evidenceDigest = await digestRepositoryRef(record.ref, repositoryRoot);
          if (evidenceDigest !== record.source_digest) {
            throw new Error(`Evidence reference digest does not match live content: ${record.ref}`);
          }
        }
      }
      const report = buildReport(document, inventory, evidence);
      const restructure = report.checks.find((check) => check.check_id === "project_restructure");
      let manifestDigest = null;
      if (restructure.status === "executed") {
        if (!manifestArgument) throw new Error("Physical project restructuring requires --manifest from prepare-outline-transition-artifacts.mjs.");
        if (document.transition_state !== "PROJECT_RESTRUCTURE_STAGED" && document.transition_state !== "CROSS_ARTIFACT_VALIDATED") {
          throw new Error("Physical project restructuring must enter PROJECT_RESTRUCTURE_STAGED before validation.");
        }
        const manifest = JSON.parse(await readFile(resolve(manifestArgument), "utf8"));
        validateStagingManifest(manifest, document, inventory);
        if (!document.transition.completed_steps.includes(`staging-manifest:${manifest.manifest_digest}`)) {
          throw new Error("Active transition is not bound to the supplied staging manifest.");
        }
        await assertStagedArtifacts(boundariesPath, manifest);
        manifestDigest = manifest.manifest_digest;
      } else if (document.transition_state === "PROJECT_RESTRUCTURE_STAGED") {
        throw new Error("PROJECT_RESTRUCTURE_STAGED cannot be validated without physical restructuring operations.");
      }
      await atomicWriteJson(resolve(reportArgument), report, 0o600);
      const blocked = report.checks.some((check) => check.status === "blocked");
      targetState = blocked ? "MIGRATION_BLOCKED" : "CROSS_ARTIFACT_VALIDATED";
      step = blocked ? "inventory-driven-validation-blocked" : "inventory-driven-validation-completed";
      eventType = blocked ? "MIGRATION_BLOCKED" : "STEP_COMPLETED";
      details = {
        report_digest: report.report_digest,
        inventory_digest: inventory.inventory_digest,
        ...(manifestDigest ? { manifest_digest: manifestDigest } : {})
      };
    } else if (action === "block") {
      if (!reason) throw new Error("block requires --reason.");
      if (document.transition_state === "ROLLBACK_REQUIRED") throw new Error("ROLLBACK_REQUIRED cannot be downgraded to MIGRATION_BLOCKED.");
      targetState = "MIGRATION_BLOCKED";
      step = "migration-blocked";
      eventType = "MIGRATION_BLOCKED";
      details = { reason };
    } else if (action === "resume") {
      if (document.transition_state !== "MIGRATION_BLOCKED") throw new Error("resume requires MIGRATION_BLOCKED.");
      if (document.proposed_baseline.base_baseline_id !== document.current_baseline.baseline_id
        || document.proposed_baseline.base_baseline_digest !== document.current_baseline.baseline_digest) {
        throw new Error("Blocked proposal base is stale; roll it back and create a rebased proposal.");
      }
      targetState = "OUTLINE_CHANGE_APPROVED";
      step = "migration-resumed-for-fresh-validation";
    } else {
      if (!reason) throw new Error("require-rollback requires --reason.");
      targetState = "ROLLBACK_REQUIRED";
      step = "rollback-required";
      eventType = "ROLLBACK_REQUIRED";
      details = { reason };
    }

    const updated = structuredClone(document);
    updated.transition_state = targetState;
    updated.updated_at = new Date().toISOString();
    updated.transition.updated_at = updated.updated_at;
    if (evidence) {
      updated.transition.artifact_reassignments = evidence.artifact_reassignments;
      updated.transition.impact_assessments = evidence.impact_assessments;
      const report = JSON.parse(await readFile(resolve(reportArgument), "utf8"));
      for (const check of report.checks) {
        const marker = `${check.check_id}:${check.status}`;
        if (!updated.transition.completed_steps.includes(marker)) updated.transition.completed_steps.push(marker);
      }
      for (const marker of [`impact-inventory:${inventory.inventory_digest}`, `validation-report:${report.report_digest}`]) {
        if (!updated.transition.completed_steps.includes(marker)) updated.transition.completed_steps.push(marker);
      }
    }
    if (!updated.transition.completed_steps.includes(step)) updated.transition.completed_steps.push(step);
    updated.transition.next_action = reason || (targetState === "CROSS_ARTIFACT_VALIDATED"
      ? "Revalidate inventory/report digests and activate the proposed baseline."
      : targetState === "MIGRATION_BLOCKED"
        ? "Resolve blocked evidence, then resume for a fresh inventory-driven validation."
        : targetState === "OUTLINE_CHANGE_APPROVED"
          ? "Regenerate inventory/evidence and run inventory-driven validation."
          : "Provide a pre-commit rollback proof or create a forward recovery proposal.");
    const errors = validateOutlineBoundaries(updated);
    if (errors.length) throw new Error(`Advanced transition would be invalid:\n${errors.join("\n")}`);
    const latest = await assertTransitionCommandLock(lock);
    if (latest.transition_state !== document.transition_state
      || latest.proposed_baseline.proposal_digest !== document.proposed_baseline.proposal_digest) {
      throw new Error("Transition changed before compare-and-swap update.");
    }
    const alreadyJournaled = await journalContains(updated.transition.transition_id, step);
    await atomicWriteJson(boundariesPath, updated, 0o600);
    if (!alreadyJournaled || evidence) {
      await appendTransitionEvent(journalPath, transitionEvent(eventType, updated.transition, updated.current_baseline, step, details));
    }
    console.log(JSON.stringify({
      transition_id: updated.transition.transition_id,
      state: targetState,
      step,
      command_lock_released: true
    }));
  });
} catch (error) {
  console.error(`Advance Outline transition failed: ${error.message}`);
  process.exit(1);
}
