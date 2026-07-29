#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { open, readFile, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const [indexArgument, ...extraArguments] = process.argv.slice(2);
if (!indexArgument || extraArguments.length) {
  console.error("Usage: node .specify/review/scripts/migrate-review-index.mjs specs/review-index.json");
  process.exit(2);
}

const featurePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const codePattern = /^(?:[0-9]{3,}|[0-9]{8}-[0-9]{6})$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const reviewFlags = ["has_flow_review", "has_ui_review", "has_outline_review", "has_outline_discovery"];
const legacyRootKeys = new Set(["schema_version", "project", "updated_at", "features"]);
const legacyFeatureKeys = new Set(["order", "feature", "title", ...reviewFlags]);
const transientRenameCodes = new Set(["EACCES", "EBUSY", "EEXIST", "EPERM"]);
const renameRetryDelays = [25, 75, 150, 300];
const indexPath = resolve(indexArgument);
const backupPath = `${indexPath}.v1.backup.json`;

function fail(message) {
  throw new Error(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateLegacyIndex(index) {
  if (!index || typeof index !== "object" || Array.isArray(index) || index.schema_version !== 1) {
    fail("review-index must use schema_version 1 or 2.");
  }
  if (typeof index.project !== "string" || typeof index.updated_at !== "string" || !Array.isArray(index.features)) {
    fail("schema-v1 review-index must contain string project/updated_at fields and a features array.");
  }
  const unknownRootKeys = Object.keys(index).filter((key) => !legacyRootKeys.has(key));
  if (unknownRootKeys.length) fail(`schema-v1 review-index has unsupported root fields: ${unknownRootKeys.join(", ")}.`);
  if (index.features.length && (!isNonEmptyString(index.project) || !datePattern.test(index.updated_at))) {
    fail("schema-v1 project must be non-empty and updated_at must use YYYY-MM-DD when features exist.");
  }

  const seenOrders = new Set();
  const seenFeatures = new Set();
  const seenCodes = new Set();
  return index.features.map((entry, position) => {
    const label = `features[${position}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail(`${label} must be an object.`);
    const unknownEntryKeys = Object.keys(entry).filter((key) => !legacyFeatureKeys.has(key));
    if (unknownEntryKeys.length) fail(`${label} has unsupported fields: ${unknownEntryKeys.join(", ")}.`);
    if (!Number.isInteger(entry.order) || entry.order < 1 || seenOrders.has(entry.order)) {
      fail(`${label}.order must be a unique positive integer.`);
    }
    seenOrders.add(entry.order);
    if (!isNonEmptyString(entry.feature) || !featurePattern.test(entry.feature) || entry.feature.includes("..") || seenFeatures.has(entry.feature)) {
      fail(`${label}.feature must be a unique safe feature slug.`);
    }
    seenFeatures.add(entry.feature);
    const featureCode = entry.feature.match(/^(\d{8}-\d{6}|\d{3,})-/)?.[1];
    if (!featureCode || !codePattern.test(featureCode)) {
      fail(`${entry.feature} has no stable numeric feature-code prefix; migration will not invent one.`);
    }
    if (seenCodes.has(featureCode)) fail(`feature_code ${featureCode} would be duplicated after migration.`);
    seenCodes.add(featureCode);
    if (!isNonEmptyString(entry.title)) fail(`${label}.title must be non-empty.`);
    for (const flag of reviewFlags) {
      if (typeof entry[flag] !== "boolean") fail(`${label}.${flag} must be boolean.`);
    }
    return {
      order: entry.order,
      feature_code: featureCode,
      feature: entry.feature,
      title: entry.title,
      parent_feature: null,
      sibling_order: 0,
      boundary_source: {
        kind: "standalone",
        handoff_ref: null,
        rationale: "Migrated from schema-v1 flat index; no parentage was inferred."
      },
      outline_alignment: {
        status: "not_mapped",
        outline_node_refs: [],
        rationale: "Legacy index did not record an Outline projection."
      },
      ...Object.fromEntries(reviewFlags.map((flag) => [flag, entry[flag]]))
    };
  });
}

async function syncWriteExclusive(path, content, mode = 0o600) {
  const handle = await open(path, "wx", mode);
  try {
    await handle.writeFile(content, "utf8");
    await handle.chmod(mode);
    await handle.sync();
    await handle.close();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await unlink(path).catch(() => undefined);
    throw error;
  }
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function renameWithRetry(source, target) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(source, target);
      return;
    } catch (error) {
      if (!transientRenameCodes.has(error.code) || attempt >= renameRetryDelays.length) throw error;
      await delay(renameRetryDelays[attempt]);
    }
  }
}

async function preserveLegacyBackup(content) {
  try {
    await syncWriteExclusive(backupPath, content);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existing = await readFile(backupPath, "utf8");
    if (existing !== content) fail(`Existing backup differs from the current v1 index: ${backupPath}`);
  }
}

async function replaceAtomically(content, targetMode) {
  const temporaryPath = join(dirname(indexPath), `.${basename(indexPath)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await syncWriteExclusive(temporaryPath, content, targetMode);
    await renameWithRetry(temporaryPath, indexPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

try {
  const originalMode = (await stat(indexPath)).mode & 0o777;
  const source = await readFile(indexPath, "utf8");
  const index = JSON.parse(source);
  if (index?.schema_version === 2) {
    console.log(`Review index already uses schema v2: ${indexPath}`);
    process.exit(0);
  }
  const features = validateLegacyIndex(index);
  const migrated = {
    schema_version: 2,
    project: index.project,
    updated_at: index.updated_at,
    hierarchy: { mode: "flat", root_feature: null },
    features
  };
  const output = `${JSON.stringify(migrated, null, 2)}\n`;
  await preserveLegacyBackup(source);
  await replaceAtomically(output, originalMode);
  console.log(`Migrated review index from v1 to v2 (${features.length} feature(s)); backup: ${backupPath}`);
} catch (error) {
  console.error(`Review index migration failed: ${error.message}`);
  process.exit(1);
}
