#!/usr/bin/env node

import { access, readdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readJson, validateOutlineBoundaries } from "./outline-boundaries-lib.mjs";

const args = process.argv.slice(2);
const featureIndex = args.indexOf("--feature");
const requestedFeature = featureIndex >= 0 ? args[featureIndex + 1] : null;
const positional = featureIndex >= 0
  ? args.filter((_, index) => index !== featureIndex && index !== featureIndex + 1)
  : args;
if (positional.length !== 2 || (featureIndex >= 0 && !requestedFeature)) {
  console.error("Usage: node .specify/review/scripts/check-outline-boundary-gate.mjs specs/<root>/outline-boundaries.json specs/review-index.json [--feature <feature-slug>]");
  process.exit(2);
}

const [boundariesArgument, reviewIndexArgument] = positional;
const [boundariesPath, reviewIndexPath] = positional.map((argument) => resolve(argument));
const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootFromPath = basename(dirname(boundariesPath));
const commandBoundariesPath = boundariesArgument.replaceAll("\\", "/");
const commandReviewIndexPath = reviewIndexArgument.replaceAll("\\", "/");

function emit(payload, exitCode) {
  console.log(JSON.stringify({ schema: "speccompass.outline-boundary-gate.v1", ...payload }, null, 2));
  process.exit(exitCode);
}

function block(document, reason, evidenceRefs, repairCommandExec, repairCommand = repairCommandExec) {
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
      repair_command: repairCommand
    },
    1
  );
}

try {
  try {
    await access(boundariesPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
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
      feature: requestedFeature
    },
    0
  );
} catch (error) {
  console.error(`Outline boundary gate failed: ${error.message}`);
  process.exit(1);
}
