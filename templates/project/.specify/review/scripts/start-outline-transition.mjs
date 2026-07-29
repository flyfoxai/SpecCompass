#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  adjustmentPaths,
  appendJsonLine,
  assertWriterAuthorization,
  buildImpactPreview,
  proposalFromInput,
  readJsonLines,
  sameFilePath,
  scanBoundaryArtifacts,
  validateConsumptionEvent,
  validateImpactPreview
} from "./outline-adjustment-lib.mjs";
import { stableEqual, transitionEvent } from "./outline-transition-workflow-lib.mjs";
import {
  assertProposalFeatureCodes,
  bindProposalFeatureCodes,
  ensureFeatureCodeLedger,
  featureCodeLedgerPath,
  reconcileFeatureCodeLedger
} from "./feature-code-ledger-lib.mjs";
import {
  acquireLeaseClaim,
  assertLeaseClaim,
  releaseLeaseClaim
} from "./lease-claim-lib.mjs";

const [boundariesArgument, proposalArgument, previewArgument, decisionArgument, journalArgument, ...extra] = process.argv.slice(2);
if (!boundariesArgument || !proposalArgument || !previewArgument || !decisionArgument || !journalArgument || extra.length) {
  console.error("Usage: node .specify/review/scripts/start-outline-transition.mjs specs/<root>/outline-boundaries.json <proposal.json> <impact-preview.json> <decision.json> <transition-log.jsonl>");
  process.exit(2);
}

const boundariesPath = resolve(boundariesArgument);
const proposalPath = resolve(proposalArgument);
const previewPath = resolve(previewArgument);
const decisionPath = resolve(decisionArgument);
const journalPath = resolve(journalArgument);
const codeLedgerPath = featureCodeLedgerPath(boundariesPath);
const reviewIndexPath = join(dirname(dirname(boundariesPath)), "review-index.json");
const claimPath = join(dirname(boundariesPath), `.${basename(boundariesPath)}.start.lock`);
const scriptDir = dirname(fileURLToPath(import.meta.url));

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

async function baselineWasPreviouslyActivated(baselineId) {
  try {
    const lines = (await readFile(journalPath, "utf8")).split(/\r?\n/).filter(Boolean);
    return lines.some((line) => {
      const event = JSON.parse(line);
      return event.event_type === "ALIGNED_NEW_BASELINE" && event.baseline_id === baselineId;
    });
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function acquireStartClaim(baseDigest) {
  return acquireLeaseClaim(claimPath, {
    label: "Outline transition start claim",
    leaseMilliseconds: 300000,
    heartbeatMilliseconds: 30000,
    identity: { base_baseline_digest: baseDigest },
    activeMessage: "Another process is starting an Outline transition."
  });
}

async function releaseStartClaim(claim) {
  await releaseLeaseClaim(claim);
}

function proposedDocument(current, proposal, transition, state = "OUTLINE_CHANGE_PROPOSED") {
  return {
    ...current,
    updated_at: transition.updated_at,
    transition_state: state,
    proposed_baseline: proposal,
    transition
  };
}

function baselineFromProposal(proposal) {
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
  return baseline;
}

function syncReviewIndex(boundarySource) {
  const result = spawnSync(process.execPath, [resolve(scriptDir, "sync-review-index.mjs"), boundarySource, reviewIndexPath], {
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(`Derived review-index could not be synchronized:\n${result.stderr || result.stdout}`);
}

async function appendStep(type, transition, baseline, step, details = {}) {
  if (!await journalContains(transition.transition_id, step)) {
    await appendTransitionEvent(journalPath, transitionEvent(type, transition, baseline, step, details));
  }
}

async function activateMetadata(document, proposal, transition, decision) {
  const baseline = baselineFromProposal(proposal);
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
  if (activatedErrors.length) throw new Error(`Metadata activation would be invalid:\n${activatedErrors.join("\n")}`);
  const latest = await readJson(boundariesPath);
  if (latest.transition_state !== "OUTLINE_CHANGE_PROPOSED"
    || latest.transition?.transition_id !== transition.transition_id
    || latest.proposed_baseline?.proposal_digest !== proposal.proposal_digest) {
    throw new Error("Metadata transition changed before its commit point.");
  }
  await atomicWriteJson(boundariesPath, activated, 0o600);
  await reconcileFeatureCodeLedger(codeLedgerPath, activated);
  if (process.env.SPECCOMPASS_FAULT_AFTER_METADATA_COMMIT === "1") {
    throw new Error("Injected failure after metadata baseline commit and before derived synchronization.");
  }
  syncReviewIndex(boundariesPath);
  await appendStep("ALIGNED_NEW_BASELINE", transition, baseline, "metadata-baseline-activated", {
    receipt_id: decision.receipt.receipt_id,
    change_class: "METADATA"
  });
  return baseline;
}

try {
  const input = await readJson(proposalPath);
  const proposal = proposalFromInput(input);
  const preview = await readJson(previewPath);
  validateImpactPreview(preview);
  const paths = adjustmentPaths(boundariesPath, proposal.baseline_id);
  if (!sameFilePath(proposalPath, paths.proposalPath) || !sameFilePath(previewPath, paths.previewPath)
    || !sameFilePath(decisionPath, paths.decisionPath)) {
    throw new Error("Proposal, preview, and decision must use the fixed proposal-scoped boundary-adjustments paths.");
  }
  if (proposal.decision_ref !== paths.decisionRef) throw new Error(`Proposal decision_ref must be ${paths.decisionRef}.`);
  for (const field of ["proposal_id", "proposal_digest", "base_baseline_id", "base_baseline_digest"]) {
    const expected = field === "proposal_id" ? proposal.baseline_id : proposal[field];
    if (preview[field] !== expected) throw new Error(`Impact preview ${field} does not match proposal.json.`);
  }
  const decision = await assertWriterAuthorization(decisionPath, paths.writerLedgerPath, {
    proposal_id: proposal.baseline_id,
    proposal_digest: proposal.proposal_digest,
    base_baseline_id: proposal.base_baseline_id,
    base_baseline_digest: proposal.base_baseline_digest,
    impact_preview_digest: preview.impact_preview_digest,
    change_class: preview.change_class,
    affected_feature_codes: preview.affected_feature_codes
  });
  if (decision.decision !== "CONFIRMED") throw new Error(`Human decision is ${decision.decision}; no transition may start.`);
  if (Date.parse(decision.source.recorded_at) < Date.parse(preview.generated_at)
    || Date.parse(decision.source.recorded_at) < Date.parse(proposal.created_at)) {
    throw new Error("Human decision predates the immutable proposal or its impact preview.");
  }
  if (preview.change_class === "NONE") throw new Error("Proposal has no effective boundary change; nothing can be authorized.");

  const initial = await readJson(boundariesPath);
  const initialErrors = validateOutlineBoundaries(initial);
  if (initialErrors.length) throw new Error(`outline-boundaries is invalid:\n${initialErrors.join("\n")}`);
  await ensureFeatureCodeLedger(codeLedgerPath, initial);
  const claim = await acquireStartClaim(proposal.base_baseline_digest);
  try {
    let current = await readJson(boundariesPath);
    const currentErrors = validateOutlineBoundaries(current);
    if (currentErrors.length) throw new Error(`outline-boundaries changed to an invalid document:\n${currentErrors.join("\n")}`);
    const consumedEvents = await readJsonLines(paths.consumedLedgerPath, validateConsumptionEvent);
    const receiptEvents = consumedEvents.filter((event) => event.receipt_id === decision.receipt.receipt_id);
    if (receiptEvents.length > 1) throw new Error("Decision receipt appears more than once in the consumed ledger.");
    let consumed = receiptEvents[0] || null;

    const alreadyActivated = current.transition_state === "ALIGNED"
      && current.current_baseline.baseline_id === proposal.baseline_id
      && stableEqual(current.current_baseline, baselineFromProposal(proposal));
    if (alreadyActivated) {
      if (!consumed || consumed.decision_digest !== decision.decision_digest || consumed.proposal_digest !== proposal.proposal_digest) {
        throw new Error("Activated metadata baseline has no matching consumed human decision.");
      }
      syncReviewIndex(boundariesPath);
      const recoveredTransition = {
        transition_id: consumed.transition_id,
        transition_revision: 1,
        base_baseline_id: consumed.base_baseline_id,
        base_baseline_digest: consumed.base_baseline_digest,
        proposal_digest: consumed.proposal_digest
      };
      await appendStep("ALIGNED_NEW_BASELINE", recoveredTransition, current.current_baseline, "metadata-baseline-activated", {
        change_class: "METADATA",
        receipt_id: consumed.receipt_id
      });
      console.log(JSON.stringify({
        transition_id: consumed.transition_id,
        proposal_digest: proposal.proposal_digest,
        change_class: "METADATA",
        state: "ALIGNED",
        idempotent_recovery: true
      }));
      await releaseStartClaim(claim);
      process.exit(0);
    }

    if (current.transition_state === "ALIGNED" && await baselineWasPreviouslyActivated(proposal.baseline_id)) {
      throw new Error(`Proposal baseline_id ${proposal.baseline_id} was already activated historically and cannot be reused.`);
    }

    if (current.transition_state !== "ALIGNED") {
      if (current.proposed_baseline?.proposal_digest !== proposal.proposal_digest
        || current.transition?.base_baseline_digest !== proposal.base_baseline_digest) {
        throw new Error(`Only one active proposal is allowed; current state is ${current.transition_state}.`);
      }
      if (consumed && (consumed.decision_digest !== decision.decision_digest
        || consumed.transition_id !== current.transition.transition_id)) {
        throw new Error("Active proposal is bound to a different consumed decision receipt.");
      }
      if (current.transition_state === "OUTLINE_CHANGE_PROPOSED") {
        if (!consumed) {
          const artifacts = await scanBoundaryArtifacts(boundariesPath, current);
          const refreshed = buildImpactPreview(current, proposal, artifacts, preview.generated_at);
          if (refreshed.change_class !== preview.change_class
            || !stableEqual(refreshed.affected_feature_codes, preview.affected_feature_codes)
            || refreshed.artifact_inventory_digest !== preview.artifact_inventory_digest) {
            throw new Error("Impact preview became stale before decision-consumption recovery.");
          }
          consumed = {
            schema_version: 1,
            event_type: "DECISION_CONSUMED",
            receipt_id: decision.receipt.receipt_id,
            decision_digest: decision.decision_digest,
            proposal_id: proposal.baseline_id,
            proposal_digest: proposal.proposal_digest,
            base_baseline_id: proposal.base_baseline_id,
            base_baseline_digest: proposal.base_baseline_digest,
            impact_preview_digest: preview.impact_preview_digest,
            transition_id: current.transition.transition_id,
            change_class: preview.change_class,
            consumed_at: new Date().toISOString()
          };
          await appendJsonLine(paths.consumedLedgerPath, consumed, validateConsumptionEvent);
          await appendStep("STEP_COMPLETED", current.transition, current.current_baseline, "decision-consumed", {
            receipt_id: decision.receipt.receipt_id
          });
        }
        if (preview.change_class === "METADATA") {
          await activateMetadata(current, proposal, current.transition, decision);
          console.log(JSON.stringify({
            transition_id: current.transition.transition_id,
            proposal_digest: proposal.proposal_digest,
            change_class: "METADATA",
            state: "ALIGNED",
            idempotent_recovery: true
          }));
          await releaseStartClaim(claim);
          process.exit(0);
        } else {
          const approved = structuredClone(current);
          approved.transition_state = "OUTLINE_CHANGE_APPROVED";
          approved.updated_at = new Date().toISOString();
          approved.transition.updated_at = approved.updated_at;
          if (!approved.transition.completed_steps.includes("decision-consumed")) approved.transition.completed_steps.push("decision-consumed");
          if (!approved.transition.completed_steps.includes("outline-change-approved")) approved.transition.completed_steps.push("outline-change-approved");
          approved.transition.next_action = "Scan the authoritative artifact inventory and validate only the phases present in it.";
          const latest = await readJson(boundariesPath);
          if (latest.transition_state !== "OUTLINE_CHANGE_PROPOSED"
            || latest.proposed_baseline?.proposal_digest !== proposal.proposal_digest) throw new Error("Transition changed during start recovery.");
          await atomicWriteJson(boundariesPath, approved, 0o600);
          current = approved;
        }
      }
      await bindProposalFeatureCodes(codeLedgerPath, current, proposal, current.transition.transition_id);
      await appendStep("STEP_COMPLETED", current.transition, current.current_baseline, "outline-change-approved", {
        receipt_id: decision.receipt.receipt_id
      });
      console.log(JSON.stringify({
        transition_id: current.transition.transition_id,
        proposal_digest: proposal.proposal_digest,
        change_class: preview.change_class,
        state: current.transition_state,
        idempotent_recovery: true
      }));
      await releaseStartClaim(claim);
      process.exit(0);
    }

    if (current.current_baseline.baseline_id !== proposal.base_baseline_id
      || current.current_baseline.baseline_digest !== proposal.base_baseline_digest) {
      throw new Error("Proposal base baseline is stale; regenerate the preview and obtain a new human decision.");
    }
    if (consumed) throw new Error("Decision receipt was already consumed and cannot authorize another transition.");
    const artifacts = await scanBoundaryArtifacts(boundariesPath, current);
    const refreshed = buildImpactPreview(current, proposal, artifacts, preview.generated_at);
    if (refreshed.change_class !== preview.change_class
      || !stableEqual(refreshed.affected_feature_codes, preview.affected_feature_codes)
      || refreshed.artifact_inventory_digest !== preview.artifact_inventory_digest) {
      throw new Error("Impact preview is stale; baseline classification, artifact set, or source digest changed after review.");
    }
    await assertProposalFeatureCodes(codeLedgerPath, current, proposal);
    const now = new Date().toISOString();
    const transition = {
      transition_id: randomUUID(),
      transition_revision: 1,
      base_baseline_id: proposal.base_baseline_id,
      base_baseline_digest: proposal.base_baseline_digest,
      proposal_digest: proposal.proposal_digest,
      started_at: now,
      updated_at: now,
      lock: null,
      artifact_reassignments: [],
      impact_assessments: [],
      completed_steps: ["proposal-created"],
      next_action: "Consume the verified human decision receipt.",
      rollback_ref: input.rollback_ref
    };
    const proposed = proposedDocument(current, proposal, transition);
    const proposedErrors = validateOutlineBoundaries(proposed);
    if (proposedErrors.length) throw new Error(`Proposed transition is invalid:\n${proposedErrors.join("\n")}`);
    const rechecked = await readJson(boundariesPath);
    await assertLeaseClaim(claim);
    if (rechecked.transition_state !== "ALIGNED"
      || rechecked.current_baseline?.baseline_digest !== claim.claim.base_baseline_digest) {
      throw new Error("Authoritative baseline changed after the start claim was acquired.");
    }
    await atomicWriteJson(boundariesPath, proposed, 0o600);
    await bindProposalFeatureCodes(codeLedgerPath, current, proposal, transition.transition_id);
    await appendStep("TRANSITION_STARTED", transition, current.current_baseline, "proposal-created", {
      proposal_digest: proposal.proposal_digest,
      change_class: preview.change_class
    });
    if (process.env.SPECCOMPASS_FAULT_AFTER_PROPOSAL_START === "1") {
      throw new Error("Injected failure after proposal persistence and before decision consumption.");
    }

    const consumption = {
      schema_version: 1,
      event_type: "DECISION_CONSUMED",
      receipt_id: decision.receipt.receipt_id,
      decision_digest: decision.decision_digest,
      proposal_id: proposal.baseline_id,
      proposal_digest: proposal.proposal_digest,
      base_baseline_id: proposal.base_baseline_id,
      base_baseline_digest: proposal.base_baseline_digest,
      impact_preview_digest: preview.impact_preview_digest,
      transition_id: transition.transition_id,
      change_class: preview.change_class,
      consumed_at: new Date().toISOString()
    };
    await appendJsonLine(paths.consumedLedgerPath, consumption, validateConsumptionEvent);
    await appendStep("STEP_COMPLETED", transition, current.current_baseline, "decision-consumed", {
      receipt_id: decision.receipt.receipt_id
    });
    if (process.env.SPECCOMPASS_FAULT_AFTER_DECISION_CONSUME === "1") {
      throw new Error("Injected failure after decision consumption and before approved state persistence.");
    }

    if (preview.change_class === "METADATA") {
      await activateMetadata(proposed, proposal, transition, decision);
      console.log(JSON.stringify({
        transition_id: transition.transition_id,
        proposal_digest: proposal.proposal_digest,
        change_class: "METADATA",
        state: "ALIGNED"
      }));
    } else {
      const approved = structuredClone(proposed);
      approved.transition_state = "OUTLINE_CHANGE_APPROVED";
      approved.updated_at = new Date().toISOString();
      approved.transition.updated_at = approved.updated_at;
      approved.transition.completed_steps.push("decision-consumed", "outline-change-approved");
      approved.transition.next_action = "Scan the authoritative artifact inventory and validate only the phases present in it.";
      const approvedErrors = validateOutlineBoundaries(approved);
      if (approvedErrors.length) throw new Error(`Approved transition is invalid:\n${approvedErrors.join("\n")}`);
      const latest = await readJson(boundariesPath);
      if (latest.transition_state !== "OUTLINE_CHANGE_PROPOSED"
        || latest.transition?.transition_id !== transition.transition_id) throw new Error("Transition changed before approval persistence.");
      await atomicWriteJson(boundariesPath, approved, 0o600);
      await appendStep("STEP_COMPLETED", transition, current.current_baseline, "outline-change-approved", {
        receipt_id: decision.receipt.receipt_id
      });
      console.log(JSON.stringify({
        transition_id: transition.transition_id,
        transition_revision: 1,
        proposal_digest: proposal.proposal_digest,
        change_class: "STRUCTURAL",
        state: "OUTLINE_CHANGE_APPROVED"
      }));
    }
  } finally {
    await releaseStartClaim(claim);
  }
} catch (error) {
  console.error(`Start Outline transition failed: ${error.message}`);
  process.exit(1);
}
