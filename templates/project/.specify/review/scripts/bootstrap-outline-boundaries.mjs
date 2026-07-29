#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteJson, readJson, sha256 } from "./outline-boundaries-lib.mjs";

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const requestedRoot = rootIndex >= 0 ? args[rootIndex + 1] : null;
const positional = args.filter((_, index) => index !== rootIndex && index !== rootIndex + 1);
if (positional.length !== 2 || (rootIndex >= 0 && !requestedRoot)) {
  console.error("Usage: node .specify/review/scripts/bootstrap-outline-boundaries.mjs specs/review-index.json <candidate-output.json> [--root <feature>]");
  process.exit(2);
}

const [reviewIndexPath, outputPath] = positional.map((argument) => resolve(argument));

try {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const validation = spawnSync(process.execPath, [resolve(scriptDir, "validate-review-index.mjs"), reviewIndexPath], { encoding: "utf8" });
  if (validation.status !== 0) throw new Error(`review-index is invalid:\n${validation.stderr || validation.stdout}`);
  const index = await readJson(reviewIndexPath);
  const rootFeature = requestedRoot || index.hierarchy.root_feature || (index.features.length === 1 ? index.features[0].feature : null);
  if (rootFeature && !index.features.some((entry) => entry.feature === rootFeature)) throw new Error(`Requested root feature is not present: ${rootFeature}`);
  const byFeature = new Map(index.features.map((entry) => [entry.feature, entry]));
  const issues = [];
  if (!rootFeature) issues.push({ code: "root_unconfirmed", feature: null, message: "The flat legacy index does not identify one authoritative root." });
  const specsRoot = dirname(reviewIndexPath);
  const candidates = [];
  for (const entry of index.features) {
    const blockingIssues = [];
    let directoryExists = true;
    try {
      await access(resolve(specsRoot, entry.feature));
    } catch {
      directoryExists = false;
      blockingIssues.push("feature_directory_missing");
      issues.push({ code: "feature_directory_missing", feature: entry.feature, message: `Feature directory is missing: specs/${entry.feature}` });
    }
    let parentCode = null;
    if (entry.parent_feature !== null) parentCode = byFeature.get(entry.parent_feature)?.feature_code || null;
    else if (rootFeature && entry.feature !== rootFeature) {
      blockingIssues.push("parent_unconfirmed");
      issues.push({ code: "parent_unconfirmed", feature: entry.feature, message: "Legacy flat data does not authorize a parent boundary." });
    }
    const alignment = entry.outline_alignment;
    const sourceStatus = alignment.status === "one_to_one" && alignment.outline_node_refs.length === 1
      ? "one_to_one"
      : alignment.status === "not_mapped" ? "unmapped" : "transition_only";
    if (sourceStatus !== "one_to_one") {
      blockingIssues.push("outline_alignment_unconfirmed");
      issues.push({ code: "outline_alignment_unconfirmed", feature: entry.feature, message: `Outline alignment ${alignment.status} cannot enter an aligned baseline without human confirmation.` });
    }
    candidates.push({
      order: entry.order,
      feature_code: entry.feature_code,
      feature: entry.feature,
      title: entry.title,
      parent_feature_code: parentCode,
      sibling_order: entry.sibling_order,
      outline_node_refs: alignment.outline_node_refs,
      source_status: sourceStatus,
      blocking_issues: [...new Set(blockingIssues)]
    });
    void directoryExists;
  }
  const report = {
    schema_version: 1,
    status: "NEEDS_HUMAN_CONFIRMATION",
    generated_at: new Date().toISOString(),
    source_review_index: relative(process.cwd(), reviewIndexPath).split("\\").join("/"),
    source_review_index_digest: sha256(index),
    root_feature: rootFeature,
    candidates,
    issues,
    candidate_digest: ""
  };
  const { generated_at: _generatedAt, candidate_digest: _candidateDigest, ...candidatePayload } = report;
  report.candidate_digest = sha256(candidatePayload);
  await atomicWriteJson(outputPath, report, 0o600);
  console.log(`Legacy boundary candidate generated: ${candidates.length} feature(s), ${issues.length} issue(s). Human confirmation is still required.`);
} catch (error) {
  console.error(`Legacy boundary bootstrap failed: ${error.message}`);
  process.exit(1);
}
