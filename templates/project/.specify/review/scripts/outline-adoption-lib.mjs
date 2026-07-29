import { lstat, readFile, realpath } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  adjustmentPaths,
  buildAdoptionImpactPreview,
  proposalFromInput,
  repositoryRootForBoundaries,
  sameFilePath,
  scanBoundaryArtifacts
} from "./outline-adjustment-lib.mjs";
import {
  readJson,
  sha256,
  stableStringify,
  validateOutlineBoundaries
} from "./outline-boundaries-lib.mjs";
import { isRepositoryRef } from "./outline-transition-workflow-lib.mjs";

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const REPORT_KEYS = new Set([
  "schema_version", "status", "generated_at", "source_review_index",
  "source_review_index_digest", "root_feature", "candidates", "issues", "candidate_digest"
]);
const CANDIDATE_KEYS = new Set([
  "order", "feature_code", "feature", "title", "parent_feature_code", "sibling_order",
  "outline_node_refs", "source_status", "blocking_issues"
]);
const ISSUE_KEYS = new Set(["code", "feature", "message"]);

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !(key in value));
  if (unknown.length || missing.length) {
    throw new Error(`${label} fields are invalid; unknown=${unknown.join(",") || "none"}, missing=${missing.join(",") || "none"}.`);
  }
}

function reportDigest(report) {
  const { generated_at: _generatedAt, candidate_digest: _candidateDigest, ...payload } = report;
  return sha256(payload);
}

export function validateAdoptionReport(report) {
  exactKeys(report, REPORT_KEYS, "Outline adoption candidate report");
  if (report.schema_version !== 1 || report.status !== "NEEDS_HUMAN_CONFIRMATION"
    || !Number.isFinite(Date.parse(report.generated_at)) || !isRepositoryRef(report.source_review_index)
    || !DIGEST_PATTERN.test(report.source_review_index_digest || "")
    || typeof report.root_feature !== "string" || !report.root_feature
    || !Array.isArray(report.candidates) || !report.candidates.length || !Array.isArray(report.issues)
    || !DIGEST_PATTERN.test(report.candidate_digest || "")) {
    throw new Error("Outline adoption candidate report header is invalid.");
  }
  for (const [index, candidate] of report.candidates.entries()) {
    exactKeys(candidate, CANDIDATE_KEYS, `Outline adoption candidate[${index}]`);
    if (!Number.isInteger(candidate.order) || candidate.order < 1 || typeof candidate.feature_code !== "string"
      || typeof candidate.feature !== "string" || typeof candidate.title !== "string"
      || !(candidate.parent_feature_code === null || typeof candidate.parent_feature_code === "string")
      || !Number.isInteger(candidate.sibling_order) || candidate.sibling_order < 0
      || !Array.isArray(candidate.outline_node_refs) || !Array.isArray(candidate.blocking_issues)
      || !["one_to_one", "transition_only", "unmapped"].includes(candidate.source_status)) {
      throw new Error(`Outline adoption candidate[${index}] is invalid.`);
    }
  }
  for (const [index, issue] of report.issues.entries()) {
    exactKeys(issue, ISSUE_KEYS, `Outline adoption issue[${index}]`);
    if (typeof issue.code !== "string" || !(issue.feature === null || typeof issue.feature === "string")
      || typeof issue.message !== "string" || !issue.message) throw new Error(`Outline adoption issue[${index}] is invalid.`);
  }
  if (reportDigest(report) !== report.candidate_digest) {
    throw new Error("Outline adoption candidate report digest does not match canonical content.");
  }
}

function normalizedRef(path) {
  return path.split(sep).join("/");
}

async function assertRegularRepositoryRef(repositoryRoot, ref, label) {
  if (!isRepositoryRef(ref)) throw new Error(`${label} is not a safe repository reference.`);
  const pathRef = ref.split("#", 1)[0];
  const target = resolve(repositoryRoot, pathRef);
  const realRoot = await realpath(repositoryRoot);
  let realTarget;
  try {
    const info = await lstat(target);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${label} must name a regular file.`);
    realTarget = await realpath(target);
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`${label} does not exist: ${pathRef}`);
    throw error;
  }
  const outside = relative(realRoot, realTarget);
  if (!outside || outside === ".." || outside.startsWith(`..${sep}`)) {
    throw new Error(`${label} resolves outside the repository.`);
  }
  const fragment = ref.includes("#") ? ref.slice(ref.indexOf("#") + 1) : "";
  if (fragment) {
    const source = await readFile(realTarget, "utf8");
    const headingSlugs = source.split(/\r?\n/)
      .filter((line) => /^\s*#{1,6}\s+/.test(line))
      .map((line) => line.replace(/^\s*#{1,6}\s+/, "").trim().toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").replace(/-+/g, "-"));
    if (!source.includes(fragment) && !headingSlugs.includes(fragment.toLowerCase())) {
      throw new Error(`${label} references a missing fragment: #${fragment}`);
    }
  }
}

async function assertOutlineNodePresent(repositoryRoot, rootFeature, boundary) {
  const refs = [
    `specs/${boundary.feature}/spec-outline.md`,
    `specs/${boundary.feature}/prd.md`,
    `specs/${boundary.feature}/prd/review/outline-review-data.json`,
    `specs/${rootFeature}/spec-outline.md`,
    `specs/${rootFeature}/prd.md`,
    `specs/${rootFeature}/prd/review/outline-review-data.json`
  ];
  for (const ref of new Set(refs)) {
    try {
      const source = await readFile(resolve(repositoryRoot, ref), "utf8");
      if (source.includes(boundary.outline_node_id)) return;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  throw new Error(`Outline mapping ${boundary.outline_node_id} for ${boundary.feature} is not present in current PRD/Outline sources.`);
}

export async function validateAdoptionInputs({ boundariesPath, reviewIndexPath, reportPath, proposalPath }) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const indexValidation = spawnSync(process.execPath, [resolve(scriptDir, "validate-review-index.mjs"), reviewIndexPath], { encoding: "utf8" });
  if (indexValidation.status !== 0) {
    throw new Error(`review-index is invalid:\n${indexValidation.stderr || indexValidation.stdout}`);
  }
  const [reviewIndex, report, proposalInput] = await Promise.all([
    readJson(reviewIndexPath), readJson(reportPath), readJson(proposalPath)
  ]);
  validateAdoptionReport(report);
  const repositoryRoot = repositoryRootForBoundaries(boundariesPath);
  const expectedReviewIndexPath = join(dirname(dirname(resolve(boundariesPath))), "review-index.json");
  const expectedReportPath = join(dirname(resolve(boundariesPath)), "outline-boundaries-adoption.json");
  if (!sameFilePath(reviewIndexPath, expectedReviewIndexPath) || !sameFilePath(reportPath, expectedReportPath)) {
    throw new Error("Adoption review-index and candidate report must use their fixed specs paths.");
  }
  const expectedIndexRef = normalizedRef(relative(repositoryRoot, resolve(reviewIndexPath)));
  if (report.source_review_index !== expectedIndexRef || report.source_review_index_digest !== sha256(reviewIndex)) {
    throw new Error("Outline adoption candidate is stale or bound to a different review-index.json.");
  }
  const proposal = proposalFromInput(proposalInput);
  if (proposal.base_baseline_id !== null || proposal.base_baseline_digest !== null) {
    throw new Error("Outline boundary adoption must use a null base baseline identity.");
  }
  const paths = adjustmentPaths(boundariesPath, proposal.baseline_id);
  if (!sameFilePath(proposalPath, paths.proposalPath) || proposal.decision_ref !== paths.decisionRef) {
    throw new Error("Adoption proposal and decision must use the fixed proposal-scoped boundary-adjustments paths.");
  }
  if (proposal.tombstones.length) throw new Error("Initial adoption cannot invent historical tombstones.");
  if (report.root_feature !== proposal.project_boundaries.find((item) => item.parent_feature_code === null)?.feature) {
    throw new Error("Adoption proposal root does not match the reviewed legacy root.");
  }
  const legacyDocument = {
    schema_version: 1,
    root_feature: report.root_feature,
    updated_at: proposal.created_at,
    transition_state: "LEGACY_ADOPTION_REQUIRED",
    current_baseline: null,
    proposed_baseline: proposal,
    transition: null
  };
  const boundaryErrors = validateOutlineBoundaries(legacyDocument);
  if (boundaryErrors.length) throw new Error(`Outline adoption proposal is invalid:\n${boundaryErrors.join("\n")}`);

  const indexByFeature = new Map(reviewIndex.features.map((entry) => [entry.feature, entry]));
  const reportByFeature = new Map(report.candidates.map((entry) => [entry.feature, entry]));
  const proposalByFeature = new Map(proposal.project_boundaries.map((entry) => [entry.feature, entry]));
  if (indexByFeature.size !== reportByFeature.size || indexByFeature.size !== proposalByFeature.size) {
    throw new Error("Adoption must cover every current review-index feature exactly once, without adding or removing projects.");
  }
  const indexCodeByFeature = new Map(reviewIndex.features.map((entry) => [entry.feature, entry.feature_code]));
  for (const [feature, indexEntry] of indexByFeature) {
    const candidate = reportByFeature.get(feature);
    const boundary = proposalByFeature.get(feature);
    if (!candidate || !boundary) throw new Error(`Adoption is missing current feature ${feature}.`);
    for (const field of ["order", "feature_code", "feature", "title", "sibling_order"]) {
      if (candidate[field] !== indexEntry[field]) throw new Error(`Candidate report drifted from review-index at ${feature}.${field}.`);
      if (field !== "sibling_order" && boundary[field] !== indexEntry[field]) {
        throw new Error(`Adoption cannot rewrite existing ${feature}.${field}.`);
      }
    }
    const normalizesUnknownLegacySibling = feature !== report.root_feature
      && indexEntry.parent_feature === null
      && candidate.parent_feature_code === null
      && candidate.sibling_order === 0
      && candidate.blocking_issues.includes("parent_unconfirmed")
      && boundary.parent_feature_code !== null;
    if (!normalizesUnknownLegacySibling && boundary.sibling_order !== indexEntry.sibling_order) {
      throw new Error(`Adoption cannot rewrite existing ${feature}.sibling_order.`);
    }
    const indexedParentCode = indexEntry.parent_feature === null ? null : indexCodeByFeature.get(indexEntry.parent_feature);
    if (indexEntry.parent_feature !== null && boundary.parent_feature_code !== indexedParentCode) {
      throw new Error(`Adoption cannot rewrite the explicit parent of ${feature}.`);
    }
    if (indexEntry.outline_alignment?.status === "one_to_one") {
      const refs = indexEntry.outline_alignment.outline_node_refs || [];
      if (refs.length !== 1 || boundary.outline_node_id !== refs[0]) {
        throw new Error(`Adoption cannot rewrite the confirmed Outline mapping of ${feature}.`);
      }
    }
    await assertOutlineNodePresent(repositoryRoot, report.root_feature, boundary);
    if (boundary.feature === report.root_feature) {
      if (boundary.boundary_source.kind !== "root" || boundary.boundary_source.handoff_ref !== null) {
        throw new Error("Adoption root must retain a root boundary source without a handoff.");
      }
    } else {
      if (boundary.boundary_source.kind !== "subproject_handoff" || !boundary.boundary_source.handoff_ref) {
        throw new Error(`Adoption child ${feature} requires one confirmed subproject handoff.`);
      }
      await assertRegularRepositoryRef(repositoryRoot, boundary.boundary_source.handoff_ref, `Handoff for ${feature}`);
    }
  }
  return { reviewIndex, report, proposal, proposalInput, legacyDocument, paths };
}

export async function buildFreshAdoptionPreview(boundariesPath, proposal, generatedAt = new Date().toISOString()) {
  const artifacts = await scanBoundaryArtifacts(boundariesPath, { current_baseline: proposal });
  return buildAdoptionImpactPreview(proposal, artifacts, generatedAt);
}

export function adoptionPreviewMatches(left, right) {
  return left.operation === "ADOPTION" && right.operation === "ADOPTION"
    && left.proposal_id === right.proposal_id && left.proposal_digest === right.proposal_digest
    && left.artifact_inventory_digest === right.artifact_inventory_digest
    && stableStringify(left.artifacts) === stableStringify(right.artifacts)
    && stableStringify(left.affected_feature_codes) === stableStringify(right.affected_feature_codes);
}

export async function assertBoundariesAbsent(boundariesPath) {
  try {
    await lstat(boundariesPath);
    throw new Error("Authoritative outline-boundaries.json already exists; adoption is no longer allowed.");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
}
