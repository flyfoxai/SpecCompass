#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  appendTransitionEvent,
  computeBaselineDigest,
  readJson,
  stableStringify,
  validateOutlineBoundaries,
  writeJsonExclusive
} from "./outline-boundaries-lib.mjs";
import {
  adjustmentPaths,
  appendJsonLine,
  assertWriterAuthorization,
  proposalFromInput,
  readJsonLines,
  sameFilePath,
  validateConsumptionEvent,
  validateImpactPreview
} from "./outline-adjustment-lib.mjs";
import {
  adoptionPreviewMatches,
  buildFreshAdoptionPreview,
  validateAdoptionInputs
} from "./outline-adoption-lib.mjs";
import {
  ensureFeatureCodeLedger,
  featureCodeLedgerPath
} from "./feature-code-ledger-lib.mjs";
import {
  acquireLeaseClaim,
  assertLeaseClaim,
  releaseLeaseClaim
} from "./lease-claim-lib.mjs";
import { transitionEvent } from "./outline-transition-workflow-lib.mjs";

const args = process.argv.slice(2);
if (args.length !== 7) {
  console.error("Usage: node .specify/review/scripts/activate-outline-boundary-adoption.mjs specs/review-index.json <adoption-candidate.json> specs/<root>/outline-boundaries.json <proposal.json> <impact-preview.json> <decision.json> <adoption-log.jsonl>");
  process.exit(2);
}

const [reviewIndexPath, reportPath, boundariesPath, proposalPath, previewPath, decisionPath, journalPath] = args.map((argument) => resolve(argument));
const scriptDir = dirname(fileURLToPath(import.meta.url));
const codeLedgerPath = featureCodeLedgerPath(boundariesPath);
const claimPath = join(dirname(boundariesPath), `.${basename(boundariesPath)}.adoption.lock`);
const reviewDataPath = join(dirname(boundariesPath), "prd", "review", "outline-review-data.json");

async function readExistingBoundaries() {
  try {
    return await readJson(boundariesPath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function journalHasActivation(baselineId) {
  try {
    const lines = (await readFile(journalPath, "utf8")).split(/\r?\n/).filter(Boolean);
    return lines.some((line, index) => {
      let event;
      try { event = JSON.parse(line); }
      catch { throw new Error(`Invalid adoption log JSON at line ${index + 1}.`); }
      return event.event_type === "ALIGNED_NEW_BASELINE" && event.baseline_id === baselineId
        && event.step === "legacy-boundary-adoption-activated";
    });
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
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

async function loadActivationInputs() {
  try {
    return await validateAdoptionInputs({ boundariesPath, reviewIndexPath, reportPath, proposalPath });
  } catch (validationError) {
    const existing = await readExistingBoundaries();
    if (!existing) throw validationError;
    const proposal = proposalFromInput(await readJson(proposalPath));
    const paths = adjustmentPaths(boundariesPath, proposal.baseline_id);
    const errors = validateOutlineBoundaries(existing);
    if (errors.length || existing.transition_state !== "ALIGNED"
      || proposal.base_baseline_id !== null || proposal.base_baseline_digest !== null
      || !sameFilePath(proposalPath, paths.proposalPath) || proposal.decision_ref !== paths.decisionRef
      || stableStringify(existing.current_baseline) !== stableStringify(baselineFromProposal(proposal))) {
      throw validationError;
    }
    return {
      proposal,
      paths,
      report: { root_feature: existing.root_feature },
      recovery_after_commit: true
    };
  }
}

function syncReviewIndex() {
  const result = spawnSync(process.execPath, [resolve(scriptDir, "sync-review-index.mjs"), boundariesPath, reviewIndexPath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Derived review-index could not be synchronized:\n${result.stderr || result.stdout}`);
}

function currentReviewDataId() {
  const result = spawnSync(process.execPath, [resolve(scriptDir, "review-data-id.mjs"), reviewDataPath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Bound Outline review data is missing or unreadable:\n${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

try {
  const initial = await loadActivationInputs();
  if (!sameFilePath(previewPath, initial.paths.previewPath) || !sameFilePath(decisionPath, initial.paths.decisionPath)
    || !sameFilePath(journalPath, join(dirname(boundariesPath), "outline-transition.jsonl"))) {
    throw new Error("Adoption preview, decision, and log must use their fixed project paths.");
  }
  const claim = await acquireLeaseClaim(claimPath, {
    label: "Outline boundary adoption claim",
    leaseMilliseconds: 300000,
    heartbeatMilliseconds: 30000,
    identity: { proposal_digest: initial.proposal.proposal_digest },
    retryDelays: [0, 50, 100, 200, 400, 800, 1600],
    activeMessage: "Another process is activating the Outline boundary adoption."
  });
  try {
    const liveInputs = await loadActivationInputs();
    const { proposal, paths } = liveInputs;
    if (claim.claim.proposal_digest !== proposal.proposal_digest) {
      throw new Error("Adoption proposal changed after the activation claim was acquired.");
    }
    const preview = await readJson(previewPath);
    validateImpactPreview(preview);
    const refreshed = await buildFreshAdoptionPreview(boundariesPath, proposal, preview.generated_at);
    if (!adoptionPreviewMatches(preview, refreshed) || preview.impact_preview_digest !== refreshed.impact_preview_digest) {
      throw new Error("Adoption preview is stale; project artifacts changed after human review began.");
    }
    const decision = await assertWriterAuthorization(decisionPath, paths.writerLedgerPath, {
      operation: "ADOPTION",
      proposal_id: proposal.baseline_id,
      proposal_digest: proposal.proposal_digest,
      base_baseline_id: null,
      base_baseline_digest: null,
      impact_preview_digest: preview.impact_preview_digest,
      change_class: "ADOPTION",
      affected_feature_codes: preview.affected_feature_codes
    });
    if (!liveInputs.recovery_after_commit && currentReviewDataId() !== decision.source.review_data_id) {
      throw new Error("Outline adoption review data changed after the human decision was recorded.");
    }
    if (decision.decision !== "CONFIRMED") {
      throw new Error(`Human decision is ${decision.decision}; no authoritative baseline may be adopted.`);
    }
    if (Date.parse(decision.source.recorded_at) < Date.parse(preview.generated_at)
      || Date.parse(decision.source.recorded_at) < Date.parse(proposal.created_at)) {
      throw new Error("Human adoption decision predates the immutable proposal or preview.");
    }

    const baseline = baselineFromProposal(proposal);
    const activated = {
      schema_version: 1,
      root_feature: initial.report.root_feature,
      updated_at: new Date().toISOString(),
      transition_state: "ALIGNED",
      current_baseline: baseline,
      proposed_baseline: null,
      transition: null
    };
    const boundaryErrors = validateOutlineBoundaries(activated);
    if (boundaryErrors.length) throw new Error(`Adopted Outline baseline would be invalid:\n${boundaryErrors.join("\n")}`);
    const existingBoundaries = await readExistingBoundaries();
    let idempotentRecovery = false;
    if (existingBoundaries) {
      const errors = validateOutlineBoundaries(existingBoundaries);
      if (errors.length || existingBoundaries.transition_state !== "ALIGNED"
        || stableStringify(existingBoundaries.current_baseline) !== stableStringify(baseline)) {
        throw new Error("An authoritative outline-boundaries.json already exists and does not match this adoption.");
      }
      idempotentRecovery = true;
    }
    const transitionId = `adoption-${proposal.proposal_digest.slice(0, 20)}`;
    const events = await readJsonLines(paths.consumedLedgerPath, validateConsumptionEvent);
    const receiptEvents = events.filter((event) => event.receipt_id === decision.receipt.receipt_id);
    if (receiptEvents.length > 1) throw new Error("Adoption decision receipt appears more than once in the consumed ledger.");
    const existingConsumption = receiptEvents[0] || null;
    const consumption = {
      schema_version: 1,
      operation: "ADOPTION",
      event_type: "DECISION_CONSUMED",
      receipt_id: decision.receipt.receipt_id,
      decision_digest: decision.decision_digest,
      proposal_id: proposal.baseline_id,
      proposal_digest: proposal.proposal_digest,
      base_baseline_id: null,
      base_baseline_digest: null,
      impact_preview_digest: preview.impact_preview_digest,
      transition_id: transitionId,
      change_class: "ADOPTION",
      consumed_at: existingConsumption?.consumed_at || new Date().toISOString()
    };
    if (existingConsumption && stableStringify(existingConsumption) !== stableStringify(consumption)) {
      throw new Error("Adoption receipt was already consumed by a different proposal or decision.");
    }
    if (!existingConsumption) await appendJsonLine(paths.consumedLedgerPath, consumption, validateConsumptionEvent);
    if (process.env.SPECCOMPASS_FAULT_AFTER_ADOPTION_CONSUME === "1") {
      throw new Error("Injected failure after adoption decision consumption.");
    }

    await ensureFeatureCodeLedger(codeLedgerPath, activated);
    await assertLeaseClaim(claim);
    if (!existingBoundaries) {
      await writeJsonExclusive(boundariesPath, activated, 0o600);
    }
    if (process.env.SPECCOMPASS_FAULT_AFTER_ADOPTION_COMMIT === "1") {
      throw new Error("Injected failure after the authoritative adoption commit point.");
    }
    syncReviewIndex();
    if (!await journalHasActivation(baseline.baseline_id)) {
      await appendTransitionEvent(journalPath, transitionEvent(
        "ALIGNED_NEW_BASELINE",
        { transition_id: transitionId, transition_revision: 1 },
        baseline,
        "legacy-boundary-adoption-activated",
        { receipt_id: decision.receipt.receipt_id, change_class: "ADOPTION" }
      ));
    }
    console.log(JSON.stringify({
      operation: "ADOPTION",
      proposal_id: proposal.baseline_id,
      baseline_id: baseline.baseline_id,
      baseline_digest: baseline.baseline_digest,
      state: "ALIGNED",
      idempotent_recovery: idempotentRecovery,
      next_command: `/sp.prd ${initial.report.root_feature}`
    }));
  } finally {
    await releaseLeaseClaim(claim);
  }
} catch (error) {
  console.error(`Activate Outline boundary adoption failed: ${error.message}`);
  process.exit(1);
}
