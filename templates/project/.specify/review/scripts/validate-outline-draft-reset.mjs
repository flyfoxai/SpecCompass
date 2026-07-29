#!/usr/bin/env node

import { lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { readJson, sha256 } from "./outline-boundaries-lib.mjs";
import {
  assertSafeRepositoryFile,
  repositoryRootForResetRef,
  validateOutlineDraftResetPlan,
  validateOutlineDraftResetReceipt,
  validateOutlineDraftResetReceiptAgainstPlan
} from "./outline-draft-reset-lib.mjs";

const [pathArgument, ...extra] = process.argv.slice(2);
if (!pathArgument || extra.length) {
  console.error("Usage: node .specify/review/scripts/validate-outline-draft-reset.mjs <outline-draft-reset-plan.json|outline-draft-reset.json>");
  process.exit(2);
}

async function assertMissing(path, label) {
  try {
    await lstat(path);
    throw new Error(`${label} must not exist during a pre-baseline Outline draft reset.`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function inspectArchiveEntry(repositoryRoot, entry, { requireArchived }) {
  const source = await assertSafeRepositoryFile(
    repositoryRoot, entry.source_ref, entry.source_digest, `Draft source ${entry.source_ref}`, { allowMissing: true }
  );
  const archived = await assertSafeRepositoryFile(
    repositoryRoot, entry.archive_ref, entry.source_digest, `Draft archive ${entry.archive_ref}`, { allowMissing: true }
  );
  if (source && archived) throw new Error(`Both live and archived copies exist for ${entry.source_ref}.`);
  if (!source && !archived) throw new Error(`Neither live nor archived copy exists for ${entry.source_ref}.`);
  if (requireArchived && source) throw new Error(`Receipt claims an unapplied archive entry: ${entry.source_ref}.`);
}

async function validateRepositoryState(documentPath, document) {
  const repositoryRoot = repositoryRootForResetRef(documentPath);
  const expectedDocumentRef = document.state === "APPLIED_AWAITING_REGENERATION"
    ? `specs/${document.root_feature}/prd/review/outline-draft-reset.json`
    : `specs/${document.root_feature}/prd/review/outline-draft-reset-plan.json`;
  if (resolve(repositoryRoot, expectedDocumentRef) !== documentPath) {
    throw new Error(`Outline draft reset document must use ${expectedDocumentRef}.`);
  }
  await assertMissing(resolve(repositoryRoot, `specs/${document.root_feature}/outline-boundaries.json`), "Authoritative boundaries");

  const reviewIndex = await readJson(resolve(repositoryRoot, document.source_review_index));
  const reviewIndexDigest = sha256(reviewIndex);
  const acceptedIndexDigests = document.state === "APPLIED_AWAITING_REGENERATION"
    ? new Set([document.review_index_after_digest])
    : new Set([document.source_review_index_digest, document.review_index_after_digest]);
  if (!acceptedIndexDigests.has(reviewIndexDigest)) {
    throw new Error("Live specs/review-index.json does not match the reset plan/receipt state.");
  }
  for (const source of document.source_containers) {
    await assertSafeRepositoryFile(repositoryRoot, source.prd_ref, source.prd_digest, `PRD source ${source.prd_ref}`);
  }
  const archiveEntries = document.archived_entries || document.archive_entries;
  for (const entry of archiveEntries) {
    await inspectArchiveEntry(repositoryRoot, entry, {
      requireArchived: document.state === "APPLIED_AWAITING_REGENERATION"
    });
  }
  return repositoryRoot;
}

try {
  const documentPath = resolve(pathArgument);
  const documentInfo = await lstat(documentPath);
  if (!documentInfo.isFile() || documentInfo.isSymbolicLink()) {
    throw new Error("Outline draft reset document must be a regular non-symbolic-link file.");
  }
  const document = await readJson(documentPath);
  if (document?.state === "APPLIED_AWAITING_REGENERATION") {
    validateOutlineDraftResetReceipt(document);
    const repositoryRoot = repositoryRootForResetRef(documentPath);
    const planPath = resolve(repositoryRoot, document.plan_ref);
    await assertSafeRepositoryFile(repositoryRoot, document.plan_ref, null, `Reset plan ${document.plan_ref}`);
    const plan = await readJson(planPath);
    validateOutlineDraftResetReceiptAgainstPlan(document, plan);
    await validateRepositoryState(documentPath, document);
    console.log(`Outline draft reset receipt valid: reset=${document.reset_id}, sources=${document.source_containers.length}.`);
  } else {
    validateOutlineDraftResetPlan(document);
    await validateRepositoryState(documentPath, document);
    console.log(`Outline draft reset plan valid: reset=${document.reset_id}, archive_entries=${document.archive_entries.length}.`);
  }
} catch (error) {
  console.error(`Outline draft reset validation failed: ${error.message}`);
  process.exit(1);
}
