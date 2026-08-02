#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { atomicWriteJson, readJson, REVIEW_FLAGS, stableStringify, validateOutlineBoundaries } from "./outline-boundaries-lib.mjs";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const positional = args.filter((argument) => argument !== "--check");
if (positional.length !== 2) {
  console.error("Usage: node .specify/review/scripts/sync-review-index.mjs specs/<root>/outline-boundaries.json specs/review-index.json [--check]");
  process.exit(2);
}

const [boundariesPath, reviewIndexPath] = positional.map((argument) => resolve(argument));

function fail(message) {
  throw new Error(message);
}

function deriveReviewIndex(document, existing) {
  if (document.transition_state !== "ALIGNED" || !document.current_baseline) {
    fail(`Cannot derive review-index while outline boundaries state is ${document.transition_state}.`);
  }
  const boundaries = document.current_baseline.project_boundaries;
  const byCode = new Map(boundaries.map((boundary) => [boundary.feature_code, boundary]));
  const existingByCode = new Map((existing?.features || []).map((entry) => [entry.feature_code, entry]));
  const root = boundaries.find((boundary) => boundary.feature === document.root_feature);
  return {
    schema_version: 2,
    project: root.title,
    updated_at: new Date().toISOString().slice(0, 10),
    hierarchy: { mode: "explicit", root_feature: document.root_feature },
    features: [...boundaries]
      .sort((left, right) => left.order - right.order || left.feature.localeCompare(right.feature))
      .map((boundary) => {
        const old = existingByCode.get(boundary.feature_code);
        const parent = boundary.parent_feature_code === null ? null : byCode.get(boundary.parent_feature_code)?.feature;
        const isPortfolioRoot = boundary.feature === document.root_feature
          || boundary.feature_code === "000"
          || boundary.feature.startsWith("000-");
        if (boundary.parent_feature_code !== null && !parent) fail(`Missing parent boundary ${boundary.parent_feature_code}.`);
        return {
          order: boundary.order,
          feature_code: boundary.feature_code,
          feature: boundary.feature,
          title: boundary.title,
          parent_feature: parent,
          sibling_order: boundary.sibling_order,
          boundary_source: boundary.boundary_source,
          outline_alignment: {
            status: "one_to_one",
            outline_node_refs: [boundary.outline_node_id],
            rationale: "Derived from the authoritative aligned Outline boundary."
          },
          ...Object.fromEntries(REVIEW_FLAGS.map((flag) => [
            flag,
            isPortfolioRoot && ["has_flow_review", "has_ui_review"].includes(flag)
              ? false
              : old?.[flag] === true
          ]))
        };
      })
  };
}

function comparisonView(index) {
  return {
    ...index,
    updated_at: "<ignored>",
    features: (index.features || []).map((entry) => ({
      ...entry,
      ...Object.fromEntries(REVIEW_FLAGS.map((flag) => [flag, Boolean(entry[flag])]))
    }))
  };
}

try {
  const boundaries = await readJson(boundariesPath);
  const boundaryErrors = validateOutlineBoundaries(boundaries);
  if (boundaryErrors.length) fail(`Outline boundaries invalid:\n${boundaryErrors.join("\n")}`);
  let existing = null;
  try {
    existing = await readJson(reviewIndexPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const derived = deriveReviewIndex(boundaries, existing);
  if (checkOnly) {
    if (!existing) fail("review-index does not exist.");
    if (stableStringify(comparisonView(existing)) !== stableStringify(comparisonView(derived))) {
      fail("review-index derived boundary fields do not match outline-boundaries; run sync-review-index.mjs without --check.");
    }
    console.log(`Review index matches authoritative boundaries: ${derived.features.length} feature(s).`);
    process.exit(0);
  }
  await atomicWriteJson(reviewIndexPath, derived, 0o644);
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const validation = spawnSync(process.execPath, [resolve(scriptDir, "validate-review-index.mjs"), reviewIndexPath], { encoding: "utf8" });
  if (validation.status !== 0) fail(`Generated review-index failed validation:\n${validation.stderr || validation.stdout}`);
  console.log(`Review index rebuilt from authoritative boundaries: ${derived.features.length} feature(s).`);
} catch (error) {
  console.error(`Review index synchronization failed: ${error.message}`);
  process.exit(1);
}
