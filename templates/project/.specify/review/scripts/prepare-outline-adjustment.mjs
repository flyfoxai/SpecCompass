#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { atomicWriteJson, readJson, validateOutlineBoundaries } from "./outline-boundaries-lib.mjs";
import {
  adjustmentPaths,
  buildImpactPreview,
  proposalFromInput,
  sameFilePath,
  scanBoundaryArtifacts,
  validateImpactPreview
} from "./outline-adjustment-lib.mjs";
import {
  assertProposalFeatureCodes,
  ensureFeatureCodeLedger,
  featureCodeLedgerPath
} from "./feature-code-ledger-lib.mjs";

const [boundariesArgument, proposalArgument, previewArgument, ...extra] = process.argv.slice(2);
if (!boundariesArgument || !proposalArgument || !previewArgument || extra.length) {
  console.error("Usage: node .specify/review/scripts/prepare-outline-adjustment.mjs specs/<root>/outline-boundaries.json specs/<root>/boundary-adjustments/drafts/<proposal-id>/proposal.json specs/<root>/boundary-adjustments/drafts/<proposal-id>/impact-preview.json");
  process.exit(2);
}

const boundariesPath = resolve(boundariesArgument);
const proposalPath = resolve(proposalArgument);
const previewPath = resolve(previewArgument);

try {
  const document = await readJson(boundariesPath);
  const errors = validateOutlineBoundaries(document);
  if (errors.length) throw new Error(`outline-boundaries is invalid:\n${errors.join("\n")}`);
  if (document.transition_state !== "ALIGNED") throw new Error("Draft preparation requires an ALIGNED current baseline.");
  const input = await readJson(proposalPath);
  const proposal = proposalFromInput(input);
  const paths = adjustmentPaths(boundariesPath, proposal.baseline_id);
  if (!sameFilePath(proposalPath, paths.proposalPath) || !sameFilePath(previewPath, paths.previewPath)) {
    throw new Error("Proposal and impact preview must use the fixed boundary-adjustments draft paths for proposal_id.");
  }
  if (proposal.decision_ref !== paths.decisionRef) throw new Error(`Proposal decision_ref must be ${paths.decisionRef}.`);
  if (proposal.base_baseline_id !== document.current_baseline.baseline_id
    || proposal.base_baseline_digest !== document.current_baseline.baseline_digest) {
    throw new Error("Draft proposal is stale; rebase it on the current authoritative baseline.");
  }
  if (proposal.baseline_id === document.current_baseline.baseline_id) throw new Error("proposal_id/baseline_id must differ from the current baseline_id.");
  const codeLedgerPath = featureCodeLedgerPath(boundariesPath);
  await ensureFeatureCodeLedger(codeLedgerPath, document);
  await assertProposalFeatureCodes(codeLedgerPath, document, proposal);
  const artifacts = await scanBoundaryArtifacts(boundariesPath, document);
  const preview = buildImpactPreview(document, proposal, artifacts);
  validateImpactPreview(preview);
  await mkdir(dirname(previewPath), { recursive: true });
  await atomicWriteJson(previewPath, preview, 0o600);
  console.log(JSON.stringify({
    proposal_id: preview.proposal_id,
    proposal_digest: preview.proposal_digest,
    impact_preview_digest: preview.impact_preview_digest,
    change_class: preview.change_class,
    artifact_count: preview.artifacts.length,
    transition_started: false,
    current_state: "ALIGNED"
  }));
} catch (error) {
  console.error(`Prepare Outline adjustment failed: ${error.message}`);
  process.exit(1);
}
