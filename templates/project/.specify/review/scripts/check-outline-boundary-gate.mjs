#!/usr/bin/env node

import { access, readdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readJson, validateOutlineBoundaries } from "./outline-boundaries-lib.mjs";
import {
  validateOutlineDraftResetPlan,
  validateOutlineDraftResetReceipt
} from "./outline-draft-reset-lib.mjs";

const args = process.argv.slice(2);
const featureIndex = args.indexOf("--feature");
const requestedFeature = featureIndex >= 0 ? args[featureIndex + 1] : null;
const intentIndex = args.indexOf("--intent");
const intent = intentIndex >= 0 ? args[intentIndex + 1] : "ordinary";
const stageIndex = args.indexOf("--stage");
const stage = stageIndex >= 0 ? args[stageIndex + 1] : null;
const supportedStages = new Set([
  "prd", "specify", "flow", "ui", "bundle", "plan", "tasks", "analyze", "gate", "implement"
]);
const implementationStages = new Set([
  "specify", "flow", "ui", "bundle", "plan", "tasks", "analyze", "gate", "implement"
]);
const optionIndexes = new Set();
for (const index of [featureIndex, intentIndex, stageIndex]) {
  if (index >= 0) { optionIndexes.add(index); optionIndexes.add(index + 1); }
}
const positional = args.filter((_, index) => !optionIndexes.has(index));
if (positional.length !== 2 || (featureIndex >= 0 && !requestedFeature)
  || (stageIndex >= 0 && !stage) || (stage !== null && !supportedStages.has(stage))
  || (featureIndex >= 0 && stage === null)
  || (stage !== null && implementationStages.has(stage) && !requestedFeature)
  || !new Set(["ordinary", "regenerate"]).has(intent)) {
  console.error("Usage: node .specify/review/scripts/check-outline-boundary-gate.mjs specs/<root>/outline-boundaries.json specs/review-index.json [--feature <feature-slug>] [--intent <ordinary|regenerate>] [--stage <prd|specify|flow|ui|bundle|plan|tasks|analyze|gate|implement>]");
  process.exit(2);
}

const [boundariesArgument, reviewIndexArgument] = positional;
const [boundariesPath, reviewIndexPath] = positional.map((argument) => resolve(argument));
const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootFromPath = basename(dirname(boundariesPath));
const commandBoundariesPath = boundariesArgument.replaceAll("\\", "/");
const commandReviewIndexPath = reviewIndexArgument.replaceAll("\\", "/");

function hasPortfolioCode(feature) {
  return feature === "000" || feature?.startsWith("000-");
}

function emit(payload, exitCode) {
  console.log(JSON.stringify({ schema: "speccompass.outline-boundary-gate.v1", ...payload }, null, 2));
  process.exit(exitCode);
}

function block(document, reason, evidenceRefs, repairCommandExec, repairCommand = repairCommandExec, details = {}) {
  emit(
    {
      allowed: false,
      block_reason: reason,
      root_feature: document?.root_feature || rootFromPath,
      current_baseline_id: document?.current_baseline?.baseline_id || null,
      proposed_baseline_id: document?.proposed_baseline?.baseline_id || null,
      transition_state: document?.transition_state || "LEGACY_ADOPTION_REQUIRED",
      transition_id: document?.transition?.transition_id || null,
      blocked_since: document?.transition?.started_at || document?.updated_at || null,
      evidence_refs: evidenceRefs,
      repair_command_exec: repairCommandExec,
      repair_command: repairCommand,
      feature: requestedFeature,
      stage,
      ...details
    },
    1
  );
}

function blockPortfolioRoot(document = null) {
  const rootFeature = document?.root_feature || rootFromPath;
  const implementationFeatures = (document?.current_baseline?.project_boundaries || [])
    .filter((boundary) => boundary.feature !== rootFeature)
    .sort((left, right) => left.order - right.order)
    .map((boundary) => boundary.feature);
  block(
    document,
    "PORTFOLIO_ROOT_NOT_IMPLEMENTATION_TARGET",
    [boundariesPath, requestedFeature, `stage:${stage}`],
    "/sp.route all",
    `The portfolio root ${rootFeature} owns project-wide PRD, Outline, boundaries, constraints, and handoffs only. Select an implementation child for /sp.${stage}; never create or consume Spec, Flow, UI, Bundle, Plan, Tasks, analysis, gate, or implementation artifacts in the root.`,
    { implementation_features: implementationFeatures }
  );
}

async function emitUnregisteredRegenerationAdvisory() {
  const rootDirectory = dirname(boundariesPath);
  const possibleEvidence = [
    boundariesPath,
    resolve(rootDirectory, "outline-boundaries-adoption.json"),
    resolve(rootDirectory, "prd", "review", "outline-draft-reset.json"),
    resolve(rootDirectory, "prd", "review", "outline-draft-reset-plan.json")
  ];
  const evidenceRefs = [];
  for (const path of possibleEvidence) {
    if (path === boundariesPath || await access(path).then(() => true, (error) => {
      if (error.code === "ENOENT") return false;
      throw error;
    })) evidenceRefs.push(path);
  }
  emit(
    {
      allowed: true,
      block_reason: null,
      root_feature: rootFromPath,
      current_baseline_id: null,
      current_baseline_digest: null,
      proposed_baseline_id: null,
      transition_state: "LEGACY_ADOPTION_REQUIRED",
      transition_id: null,
      feature: requestedFeature,
      authority_status: "UNREGISTERED",
      advisories: [
        {
          code: "AUTHORITATIVE_BOUNDARIES_MISSING",
          severity: "warning",
          blocks_regeneration: false,
          message: "Project-boundary registration is missing or stale. Regenerate the requested command output now; after generation, ask whether the old boundary candidate should be cleared and rebuilt. Do not open the boundary-adoption review as a substitute for this command."
        }
      ],
      evidence_refs: evidenceRefs
    },
    0
  );
}

try {
  // The caller's boundaries path explicitly identifies the root. Keep an
  // unregistered portfolio root from using regeneration advisories to enter an
  // implementation stage before an authoritative baseline exists.
  if (implementationStages.has(stage) && (hasPortfolioCode(requestedFeature) || requestedFeature === rootFromPath)) {
    try {
      await access(boundariesPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      blockPortfolioRoot();
    }
  }

  try {
    await access(boundariesPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    if (intent === "regenerate") await emitUnregisteredRegenerationAdvisory();
    const rootDirectory = dirname(boundariesPath);
    const resetReceiptPath = resolve(rootDirectory, "prd", "review", "outline-draft-reset.json");
    const resetPlanPath = resolve(rootDirectory, "prd", "review", "outline-draft-reset-plan.json");
    try {
      const receipt = await readJson(resetReceiptPath);
      validateOutlineDraftResetReceipt(receipt);
      if (receipt.root_feature !== rootFromPath) {
        throw new Error("reset receipt root_feature does not match its fixed root directory");
      }
      const validation = spawnSync(process.execPath, [resolve(scriptDir, "validate-outline-draft-reset.mjs"), resetReceiptPath], { encoding: "utf8" });
      if (validation.status !== 0) {
        throw new Error((validation.stderr || validation.stdout).trim() || "reset receipt repository validation failed");
      }
      block(
        { root_feature: receipt.root_feature, updated_at: receipt.applied_at, transition_state: "LEGACY_ADOPTION_REQUIRED" },
        "OUTLINE_DRAFT_REGENERATION_REQUIRED",
        [resetReceiptPath, ...receipt.source_containers.map((source) => source.prd_ref)],
        receipt.next_command,
        "The prior Outline was a non-authoritative draft and has been archived. Regenerate a real Outline from the preserved PRDs and implementation evidence; temporary draft node IDs are not stable project codes."
      );
    } catch (resetError) {
      if (resetError.code !== "ENOENT") {
        block(
          null,
          "OUTLINE_DRAFT_RESET_INVALID",
          [resetReceiptPath, resetError.message],
          `node .specify/review/scripts/discard-outline-draft.mjs apply ${commandReviewIndexPath} ${commandBoundariesPath} ${commandBoundariesPath.slice(0, commandBoundariesPath.lastIndexOf("/") + 1)}prd/review/outline-draft-reset-plan.json --plan-digest <plan-digest>`,
          "The draft reset receipt is incomplete or invalid. Preserve the archive and resume only from its digest-bound plan."
        );
      }
    }
    try {
      const plan = await readJson(resetPlanPath);
      validateOutlineDraftResetPlan(plan);
      const validation = spawnSync(process.execPath, [resolve(scriptDir, "validate-outline-draft-reset.mjs"), resetPlanPath], { encoding: "utf8" });
      if (validation.status !== 0) {
        throw new Error((validation.stderr || validation.stdout).trim() || "reset plan repository validation failed");
      }
      block(
        { root_feature: plan.root_feature, updated_at: plan.created_at, transition_state: "LEGACY_ADOPTION_REQUIRED" },
        "OUTLINE_DRAFT_RESET_PENDING",
        [resetPlanPath, ...plan.archive_entries.map((entry) => entry.source_ref)],
        `node .specify/review/scripts/discard-outline-draft.mjs apply ${plan.source_review_index} ${plan.authoritative_boundaries} ${plan.source_review_index.replace(/specs\/review-index\.json$/, `specs/${plan.root_feature}/prd/review/outline-draft-reset-plan.json`)} --plan-digest ${plan.plan_digest}`,
        "A digest-bound draft reset plan exists but has not reached its receipt commit point. Resume the same plan; do not bootstrap legacy adoption from the old draft index."
      );
    } catch (planError) {
      if (planError.code !== "ENOENT") {
        block(
          null,
          "OUTLINE_DRAFT_RESET_PLAN_INVALID",
          [resetPlanPath, planError.message],
          `/sp.prd ${rootFromPath} --discard-outline-draft`,
          "The unapplied reset plan is invalid. Preserve it for diagnosis and explicitly create a fresh plan before any adoption attempt."
        );
      }
    }
    const adoptionPath = `${commandBoundariesPath.slice(0, commandBoundariesPath.lastIndexOf("/") + 1)}outline-boundaries-adoption.json`;
    block(
      null,
      "AUTHORITATIVE_BOUNDARIES_MISSING",
      [boundariesPath],
      `/sp.prd ${rootFromPath} --adopt-outline-boundaries`,
      `Run /sp.prd ${rootFromPath} --adopt-outline-boundaries to generate a real model-reviewed adoption page; only the user's loopback confirmation may establish the first baseline. Candidate report: ${adoptionPath}`
    );
  }

  let document;
  try {
    document = await readJson(boundariesPath);
  } catch (error) {
    block(
      null,
      "AUTHORITATIVE_BOUNDARIES_UNREADABLE",
      [boundariesPath, error.message],
      `node .specify/review/scripts/validate-outline-boundaries.mjs ${commandBoundariesPath}`
    );
  }
  const errors = validateOutlineBoundaries(document);
  if (errors.length) {
    block(
      document,
      "AUTHORITATIVE_BOUNDARIES_INVALID",
      [boundariesPath, ...errors],
      `node .specify/review/scripts/validate-outline-boundaries.mjs ${commandBoundariesPath}`
    );
  }
  const boundaryDirectory = dirname(boundariesPath);
  const boundaryName = basename(boundariesPath);
  const commandClaims = [
    `.${boundaryName}.start.lock`,
    `.${boundaryName}.start.lock.recovery`,
    `.${boundaryName}.adoption.lock`,
    `.${boundaryName}.adoption.lock.recovery`,
    `.${boundaryName}.transition.lock`,
    `.${boundaryName}.transition.lock.recovery`,
    `.${boundaryName}.activation-finalize.lock`,
    `.${boundaryName}.activation-finalize.lock.recovery`,
    `.${boundaryName}.rollback-finalize.lock`,
    `.${boundaryName}.rollback-finalize.lock.recovery`
  ];
  const directoryEntries = await readdir(boundaryDirectory);
  const activeClaims = commandClaims.filter((name) => directoryEntries.includes(name));
  const stagedBaselines = directoryEntries.filter((name) => (
    name.startsWith(`.${boundaryName}.`) && name.endsWith(".staged.json")
  ));
  if (document.transition_state === "ALIGNED" && (activeClaims.length || stagedBaselines.length)) {
    block(
      document,
      stagedBaselines.length ? "OUTLINE_BASELINE_FINALIZATION_REQUIRED" : "OUTLINE_BOUNDARY_COMMAND_ACTIVE",
      [boundariesPath, ...activeClaims.map((name) => resolve(boundaryDirectory, name)), ...stagedBaselines.map((name) => resolve(boundaryDirectory, name))],
      `/sp.prd ${document.root_feature} --finalize-outline-transition`,
      "Finalize the interrupted Outline command before ordinary project writes resume."
    );
  }
  if (document.transition_state !== "ALIGNED") {
    const transitionArgument = document.transition?.transition_id ? ` --transition ${document.transition.transition_id}` : "";
    block(
      document,
      "OUTLINE_BOUNDARY_TRANSITION_ACTIVE",
      [boundariesPath, ...(document.transition?.completed_steps || [])],
      `/sp.prd ${document.root_feature} --resume-outline-transition${transitionArgument}`,
      `Resume the single active Outline transition through /sp.prd; ordinary feature work remains blocked.`
    );
  }

  if (requestedFeature && !document.current_baseline.project_boundaries.some((boundary) => boundary.feature === requestedFeature)) {
    block(
      document,
      "FEATURE_NOT_IN_AUTHORITATIVE_BASELINE",
      [boundariesPath, requestedFeature],
      `/sp.prd ${document.root_feature} --review-project-boundaries`,
      `Review whether ${requestedFeature} is an analytical Outline node or a confirmed project boundary in /sp.prd.`
    );
  }

  if (implementationStages.has(stage) && (hasPortfolioCode(requestedFeature) || requestedFeature === document.root_feature)) {
    blockPortfolioRoot(document);
  }

  const sync = spawnSync(
    process.execPath,
    [resolve(scriptDir, "sync-review-index.mjs"), boundariesPath, reviewIndexPath, "--check"],
    { encoding: "utf8" }
  );
  if (sync.status !== 0) {
    block(
      document,
      "DERIVED_REVIEW_INDEX_MISMATCH",
      [boundariesPath, reviewIndexPath, (sync.stderr || sync.stdout).trim()],
      `node .specify/review/scripts/sync-review-index.mjs ${commandBoundariesPath} ${commandReviewIndexPath}`
    );
  }

  emit(
    {
      allowed: true,
      block_reason: null,
      root_feature: document.root_feature,
      current_baseline_id: document.current_baseline.baseline_id,
      current_baseline_digest: document.current_baseline.baseline_digest,
      transition_state: "ALIGNED",
      transition_id: null,
      feature: requestedFeature,
      stage,
      authority_status: "REGISTERED",
      advisories: []
    },
    0
  );
} catch (error) {
  console.error(`Outline boundary gate failed: ${error.message}`);
  process.exit(1);
}
