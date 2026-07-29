#!/usr/bin/env node

import { resolve } from "node:path";
import { atomicWriteJson } from "./outline-boundaries-lib.mjs";
import {
  assertBoundariesAbsent,
  buildFreshAdoptionPreview,
  validateAdoptionInputs
} from "./outline-adoption-lib.mjs";

const [reviewIndexArgument, reportArgument, boundariesArgument, proposalArgument, previewArgument, ...extra] = process.argv.slice(2);
if (!reviewIndexArgument || !reportArgument || !boundariesArgument || !proposalArgument || !previewArgument || extra.length) {
  console.error("Usage: node .specify/review/scripts/prepare-outline-boundary-adoption.mjs specs/review-index.json <adoption-candidate.json> specs/<root>/outline-boundaries.json <proposal.json> <impact-preview.json>");
  process.exit(2);
}

const reviewIndexPath = resolve(reviewIndexArgument);
const reportPath = resolve(reportArgument);
const boundariesPath = resolve(boundariesArgument);
const proposalPath = resolve(proposalArgument);
const previewPath = resolve(previewArgument);

try {
  await assertBoundariesAbsent(boundariesPath);
  const { proposal, paths } = await validateAdoptionInputs({ boundariesPath, reviewIndexPath, reportPath, proposalPath });
  if (resolve(previewPath) !== resolve(paths.previewPath)) {
    throw new Error("Adoption impact preview must use the fixed proposal-scoped boundary-adjustments path.");
  }
  const preview = await buildFreshAdoptionPreview(boundariesPath, proposal);
  await atomicWriteJson(previewPath, preview, 0o600);
  console.log(JSON.stringify({
    operation: "ADOPTION",
    proposal_id: proposal.baseline_id,
    proposal_digest: proposal.proposal_digest,
    impact_preview_digest: preview.impact_preview_digest,
    affected_feature_codes: preview.affected_feature_codes,
    authoritative_boundary_created: false,
    next_action: "Generate the bound Outline review page and obtain explicit human confirmation through the loopback writer."
  }));
} catch (error) {
  console.error(`Prepare Outline boundary adoption failed: ${error.message}`);
  process.exit(1);
}
