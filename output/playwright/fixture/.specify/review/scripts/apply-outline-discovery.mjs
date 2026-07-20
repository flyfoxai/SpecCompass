#!/usr/bin/env node

import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";

const OPERATIONS = new Set(["confirm_candidate", "add", "replace", "exclude", "context_note"]);
const MATURITIES = new Set(["explore", "frame"]);
const SOURCE_TAGS = new Set(["user", "user-confirmed"]);
const SECTION_BY_TARGET_KIND = new Map([
  ["goal", "Strategic Goal"],
  ["user", "Target Users and Roles"],
  ["problem", "Problem Domains"],
  ["scope", "Scope and Non-Goals"],
  ["non_goal", "Scope and Non-Goals"],
  ["scenario", "Core Scenarios"],
  ["acceptance_seed", "Acceptance Seeds"],
  ["risk", "Risks and Open Questions"],
  ["context", "Risks and Open Questions"],
]);

function fail(message) {
  throw new Error(message);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!new Set(["--response", "--prd-temp", "--outline-temp"]).has(flag)) {
      fail(`unknown argument: ${flag}`);
    }
    if (result[flag]) fail(`argument occurs more than once: ${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`missing value for ${flag}`);
    result[flag] = value;
    index += 1;
  }
  for (const flag of ["--response", "--prd-temp", "--outline-temp"]) {
    if (!result[flag]) fail(`missing required argument ${flag}`);
  }
  return result;
}

function repositoryPath(root, value, label) {
  const normalized = String(value || "").replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.includes("//") ||
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    fail(`${label} must be a safe repository-relative path`);
  }
  const resolved = path.resolve(root, ...normalized.split("/"));
  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
    fail(`${label} escapes the project root`);
  }
  return { normalized, resolved };
}

async function readJson(filePath, label) {
  let content;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (error) {
    fail(`${label} cannot be read: ${error.message}`);
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

async function readText(filePath, label) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    fail(`${label} cannot be read: ${error.message}`);
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
}

function requireString(value, label) {
  if (!text(value)) fail(`${label} must be a non-empty string`);
}

function requireNullableString(value, label) {
  if (!(typeof value === "string" || value === null)) fail(`${label} must be string or null`);
}

function validateResponseEnvelope(response) {
  requireObject(response, "response");
  if (response.schema_version !== 1) fail("response schema_version must be 1");
  if (response.format !== "speccompass-outline-discovery-response") fail("response format is not an Outline discovery response");
  if (response.review_type !== "outline_discovery") fail("response review_type must be outline_discovery");
  for (const key of ["response_id", "batch_id", "feature", "source_review_data", "generated_at"]) {
    requireString(response[key], `response ${key}`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(response.feature)) fail("response feature is invalid");
  if (!MATURITIES.has(response.outline_maturity)) fail("response maturity must be explore or frame");
  if (response.authorization_effect !== "none" || response.next_route !== "/sp.prd") {
    fail("response must be non-authorizing and return to /sp.prd");
  }
  if (Number.isNaN(Date.parse(response.generated_at))) fail("response generated_at must be a date-time");
  if (!Array.isArray(response.deltas) || response.deltas.length === 0) fail("response deltas must not be empty");
}

function buildQuestionIndex(source) {
  const questions = new Map();
  const groupIds = new Set();
  const groups = Array.isArray(source.question_groups) ? source.question_groups : [];
  if (groups.length === 0) fail("source question_groups must not be empty");
  for (const [groupIndex, group] of groups.entries()) {
    requireObject(group, `source question_group[${groupIndex}]`);
    for (const key of ["id", "title", "summary"]) requireString(group[key], `source question_group[${groupIndex}] ${key}`);
    if (groupIds.has(group.id)) fail(`duplicate source question_group id: ${group.id}`);
    groupIds.add(group.id);
    if (!Array.isArray(group.questions) || group.questions.length === 0) {
      fail(`source question_group ${group.id} questions must not be empty`);
    }
    for (const question of Array.isArray(group?.questions) ? group.questions : []) {
      requireString(question?.id, "source question_id");
      if (questions.has(question.id)) fail(`duplicate source question_id: ${question.id}`);
      requireString(question.target_kind, `source question ${question.id} target_kind`);
      if (!SECTION_BY_TARGET_KIND.has(question.target_kind)) {
        fail(`source question ${question.id} target_kind is unsupported`);
      }
      for (const key of ["prompt", "context", "recommendation_reason"]) {
        requireString(question[key], `source question ${question.id} ${key}`);
      }
      if (question.selection_mode !== "single") fail(`source question ${question.id} selection_mode must be single`);
      if (question.allow_none_of_the_above !== true) {
        fail(`source question ${question.id} must allow none of the above`);
      }
      if (!Array.isArray(question.candidates) || question.candidates.length < 2 || question.candidates.length > 4) {
        fail(`source question ${question.id} must contain 2-4 candidates`);
      }
      const candidates = new Map();
      for (const candidate of question.candidates) {
        requireString(candidate?.id, `source question ${question.id} candidate_id`);
        for (const key of ["label", "value", "rationale"]) {
          requireString(candidate?.[key], `source candidate ${candidate.id} ${key}`);
        }
        if (candidates.has(candidate.id)) fail(`duplicate candidate_id on question ${question.id}: ${candidate.id}`);
        candidates.set(candidate.id, candidate);
      }
      if (
        !Array.isArray(question.recommended_candidate_ids) ||
        question.recommended_candidate_ids.length !== 1 ||
        !candidates.has(question.recommended_candidate_ids[0])
      ) {
        fail(`source question ${question.id} must recommend exactly one existing candidate`);
      }
      requireObject(question.free_input, `source question ${question.id} free_input`);
      requireString(question.free_input.label, `source question ${question.id} free_input label`);
      if (question.free_input.enabled !== true) fail(`source question ${question.id} free_input must be enabled`);
      const allowedOperations = question.free_input.allowed_operations;
      if (
        !Array.isArray(allowedOperations) ||
        allowedOperations.length !== OPERATIONS.size ||
        new Set(allowedOperations).size !== OPERATIONS.size ||
        allowedOperations.some((operation) => !OPERATIONS.has(operation))
      ) {
        fail(`source question ${question.id} allowed_operations must contain all five operations exactly once`);
      }
      questions.set(question.id, { ...question, candidatesById: candidates });
    }
  }
  if (questions.size === 0) fail("source must contain at least one question");
  return questions;
}

function validateSourceIdentity(source, response, expectedSourcePath) {
  requireObject(source, "source discovery data");
  if (source.schema_version !== 1) fail("source schema_version must be 1");
  if (source.review_type !== "outline_discovery" || source.interaction_mode !== "discovery") {
    fail("source must be Outline discovery data");
  }
  if (source.artifact_path !== expectedSourcePath) fail("source artifact_path does not match response source_review_data");
  requireObject(source.project, "source project");
  for (const key of ["name", "feature", "current_understanding", "discovery_goal"]) {
    requireString(source.project[key], `source project ${key}`);
  }
  if (source.project?.feature !== response.feature) fail("source feature does not match response feature");
  if (source.batch_id !== response.batch_id) fail("source batch_id does not match response batch_id");
  if (source.outline_maturity !== response.outline_maturity) fail("source maturity does not match response maturity");
  if (source.authorization_effect !== "none" || source.next_route !== "/sp.prd") {
    fail("source discovery data must be non-authorizing");
  }
  if (!Array.isArray(source.source_snapshot) || source.source_snapshot.length === 0) {
    fail("source source_snapshot must not be empty");
  }
  for (const [index, snapshot] of source.source_snapshot.entries()) {
    requireObject(snapshot, `source snapshot[${index}]`);
    requireString(snapshot.path, `source snapshot[${index}] path`);
    requireString(snapshot.source_type, `source snapshot[${index}] source_type`);
  }
}

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateDeltaShape(delta, index, questions, seenDeltaIds, seenQuestionIds) {
  const label = `delta[${index}]`;
  requireObject(delta, label);
  for (const key of ["delta_id", "question_id", "target_kind", "operation", "source_tag"]) {
    requireString(delta[key], `${label} ${key}`);
  }
  if (seenDeltaIds.has(delta.delta_id)) fail(`duplicate delta_id: ${delta.delta_id}`);
  seenDeltaIds.add(delta.delta_id);
  if (seenQuestionIds.has(delta.question_id)) fail(`question_id occurs more than once: ${delta.question_id}`);
  seenQuestionIds.add(delta.question_id);
  const question = questions.get(delta.question_id);
  if (!question) fail(`${label} question_id is unknown: ${delta.question_id}`);
  if (delta.target_kind !== question.target_kind) fail(`${label} target_kind does not match question_id ${delta.question_id}`);
  if (!SECTION_BY_TARGET_KIND.has(delta.target_kind)) fail(`${label} target_kind is unsupported: ${delta.target_kind}`);
  if (!OPERATIONS.has(delta.operation)) fail(`${label} operation is unsupported: ${delta.operation}`);
  if (!SOURCE_TAGS.has(delta.source_tag)) fail(`${label} source tag is invalid`);
  if (typeof delta.none_of_the_above !== "boolean") fail(`${label} none_of_the_above must be boolean`);
  if (!(typeof delta.supersedes_delta_id === "string" || delta.supersedes_delta_id === null)) {
    fail(`${label} supersedes_delta_id must be string or null`);
  }
  if (!(typeof delta.candidate_id === "string" || delta.candidate_id === null)) fail(`${label} candidate_id must be string or null`);
  if (!(typeof delta.target_id === "string" || delta.target_id === null)) fail(`${label} target_id must be string or null`);
  if (typeof delta.value !== "string") fail(`${label} value must be a string`);

  const hasCandidate = present(delta.candidate_id);
  const hasTarget = present(delta.target_id);
  const hasValue = present(delta.value);
  const candidate = hasCandidate ? question.candidatesById.get(delta.candidate_id) : null;
  if (hasCandidate && !candidate) fail(`${label} candidate_id is unknown for question_id ${delta.question_id}`);
  if (delta.operation === "confirm_candidate") {
    if (!candidate || hasTarget || !hasValue || delta.none_of_the_above || delta.source_tag !== "user-confirmed") {
      fail(`${label} confirm_candidate fields are invalid`);
    }
    if (delta.value !== candidate.value) fail(`${label} value must exactly match candidate_id ${delta.candidate_id}`);
  } else if (delta.operation === "add") {
    if (hasCandidate || hasTarget || !hasValue || delta.source_tag !== "user") fail(`${label} add fields are invalid`);
  } else if (delta.operation === "replace") {
    if (hasCandidate || !hasTarget || !hasValue || delta.none_of_the_above || delta.source_tag !== "user") {
      fail(`${label} replace fields are invalid`);
    }
  } else if (delta.operation === "exclude") {
    if (hasCandidate === hasTarget || delta.none_of_the_above || delta.source_tag !== "user") {
      fail(`${label} exclude fields are invalid`);
    }
  } else if (delta.operation === "context_note") {
    if (hasCandidate || hasTarget || !hasValue || delta.none_of_the_above || delta.source_tag !== "user") {
      fail(`${label} context_note fields are invalid`);
    }
  }
  return delta;
}

function markdownSections(markdown) {
  const headings = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)];
  return headings.map((match, index) => ({
    title: match[1].trim(),
    start: match.index,
    end: headings[index + 1]?.index ?? markdown.length,
    content: markdown.slice(match.index, headings[index + 1]?.index ?? markdown.length),
  }));
}

function anchorCount(markdown, anchor) {
  return markdown.split(anchor).length - 1;
}

function sectionForTarget(markdown, targetKind) {
  const expected = SECTION_BY_TARGET_KIND.get(targetKind);
  const section = markdownSections(markdown).find((entry) => entry.title === expected);
  if (!section) fail(`PRD is missing intended section: ${expected}`);
  return section;
}

function validateTargetReference(prd, delta) {
  if (!present(delta.target_id)) return;
  const anchor = `<!-- intent-target:${delta.target_id} -->`;
  if (anchorCount(prd, anchor) !== 1) fail(`target_id must identify exactly one existing PRD target: ${delta.target_id}`);
  const section = sectionForTarget(prd, delta.target_kind);
  if (!section.content.includes(anchor)) fail(`target_id ${delta.target_id} is outside its intended section`);
}

function validateExistingLedger(ledger, feature) {
  requireObject(ledger, "intent ledger");
  if (ledger.schema_version !== 1 || ledger.format !== "speccompass-outline-intent-ledger") {
    fail("intent ledger format or schema_version is invalid");
  }
  if (ledger.feature !== feature) fail("intent ledger feature does not match response feature");
  if (!Array.isArray(ledger.events)) fail("intent ledger events must be an array");
  const earlier = new Set();
  for (const [index, event] of ledger.events.entries()) {
    const label = `intent event[${index}]`;
    requireObject(event, label);
    for (const key of ["delta_id", "response_id", "target_kind", "operation", "source_tag", "recorded_at"]) {
      requireString(event[key], `${label} ${key}`);
    }
    if (!MATURITIES.has(event.maturity)) fail(`${label} maturity must be explore or frame`);
    if (!SECTION_BY_TARGET_KIND.has(event.target_kind)) fail(`${label} target_kind is unsupported`);
    if (!OPERATIONS.has(event.operation)) fail(`${label} operation is unsupported`);
    if (!SOURCE_TAGS.has(event.source_tag)) fail(`${label} source_tag is invalid`);
    if (Number.isNaN(Date.parse(event.recorded_at))) fail(`${label} recorded_at must be a date-time`);
    requireNullableString(event.candidate_id, `${label} candidate_id`);
    requireNullableString(event.target_id, `${label} target_id`);
    requireNullableString(event.supersedes_delta_id, `${label} supersedes_delta_id`);
    if (typeof event.value !== "string") fail(`${label} value must be a string`);
    const hasCandidate = present(event.candidate_id);
    const hasTarget = present(event.target_id);
    const hasValue = present(event.value);
    if (event.operation === "confirm_candidate") {
      if (!hasCandidate || hasTarget || !hasValue || event.source_tag !== "user-confirmed") {
        fail(`${label} confirm_candidate fields are invalid`);
      }
    } else if (event.operation === "add") {
      if (hasCandidate || hasTarget || !hasValue || event.source_tag !== "user") fail(`${label} add fields are invalid`);
    } else if (event.operation === "replace") {
      if (hasCandidate || !hasTarget || !hasValue || event.source_tag !== "user") fail(`${label} replace fields are invalid`);
    } else if (event.operation === "exclude") {
      if (hasCandidate === hasTarget || event.source_tag !== "user") fail(`${label} exclude fields are invalid`);
    } else if (event.operation === "context_note") {
      if (hasCandidate || hasTarget || !hasValue || event.source_tag !== "user") {
        fail(`${label} context_note fields are invalid`);
      }
    }
    if (earlier.has(event.delta_id)) fail(`intent ledger has duplicate delta_id: ${event.delta_id}`);
    if (event.supersedes_delta_id && !earlier.has(event.supersedes_delta_id)) {
      fail(`intent event[${index}] supersedes_delta_id must reference an earlier event`);
    }
    earlier.add(event.delta_id);
  }
}

function eventFor(response, delta) {
  return {
    delta_id: delta.delta_id,
    response_id: response.response_id,
    maturity: response.outline_maturity,
    target_kind: delta.target_kind,
    operation: delta.operation,
    candidate_id: delta.candidate_id,
    target_id: delta.target_id,
    value: delta.value,
    source_tag: delta.source_tag,
    recorded_at: response.generated_at,
    supersedes_delta_id: delta.supersedes_delta_id,
  };
}

function sameEvent(left, right) {
  return [
    "delta_id",
    "response_id",
    "maturity",
    "target_kind",
    "operation",
    "candidate_id",
    "target_id",
    "value",
    "source_tag",
    "recorded_at",
    "supersedes_delta_id",
  ].every((key) => left[key] === right[key]);
}

function prepareLedger(response, deltas, ledger, currentPrd) {
  const byId = new Map(ledger.events.map((event) => [event.delta_id, event]));
  const acceptedIds = new Set(
    ledger.events
      .filter((event) => anchorCount(currentPrd, `<!-- intent-delta:${event.delta_id} -->`) === 1)
      .map((event) => event.delta_id),
  );
  const nextEvents = [...ledger.events];
  for (const delta of deltas) {
    const expected = eventFor(response, delta);
    const existing = byId.get(delta.delta_id);
    if (existing) {
      if (!sameEvent(existing, expected)) fail(`delta_id already exists with different content: ${delta.delta_id}`);
      if (acceptedIds.has(delta.delta_id)) fail(`delta_id already consumed: ${delta.delta_id}`);
    } else {
      if (delta.supersedes_delta_id && !acceptedIds.has(delta.supersedes_delta_id)) {
        fail(
          `supersedes_delta_id must reference an earlier accepted event consumed by the current formal PRD: ${delta.supersedes_delta_id}`,
        );
      }
      nextEvents.push(expected);
      byId.set(delta.delta_id, expected);
    }
  }
  return { ...ledger, events: nextEvents };
}

function validateTemporaryPrd(prd, deltas) {
  for (const delta of deltas) {
    const anchor = `<!-- intent-delta:${delta.delta_id} -->`;
    if (anchorCount(prd, anchor) !== 1) fail(`temporary PRD must contain exactly one delta anchor: ${delta.delta_id}`);
    const section = sectionForTarget(prd, delta.target_kind);
    if (!section.content.includes(anchor)) fail(`delta ${delta.delta_id} is not in its intended section ${section.title}`);
    const afterAnchor = section.content.slice(section.content.indexOf(anchor) + anchor.length);
    const nextBoundary = afterAnchor.search(/(?:^##\s|<!-- intent-delta:)/m);
    const block = nextBoundary >= 0 ? afterAnchor.slice(0, nextBoundary) : afterAnchor;
    const blockSourceTags = new Set([...block.matchAll(/\[src:([^\]]+)\]/g)].map((match) => match[1]));
    if (blockSourceTags.size !== 1 || !blockSourceTags.has(delta.source_tag)) {
      fail(`delta ${delta.delta_id} has the wrong or conflicting source tag`);
    }
    if (delta.value && !block.includes(delta.value)) fail(`delta ${delta.delta_id} must preserve the exact delta value`);
    const referenceId = delta.target_id || (delta.operation === "exclude" ? delta.candidate_id : null);
    if (referenceId) {
      const reference = `<!-- intent-ref:${delta.delta_id}:${referenceId} -->`;
      if (!block.includes(reference)) fail(`delta ${delta.delta_id} must include intent-ref:${delta.delta_id}:${referenceId}`);
    }
  }
}

function validateTemporaryOutline(outline, maturity) {
  const matches = [...outline.matchAll(/^outline_maturity:\s*(\S+)\s*$/gm)];
  if (matches.length !== 1 || matches[0][1] !== maturity) {
    fail(`temporary Outline outline_maturity must remain ${maturity}`);
  }
  if (/\b(?:AWAITING_OUTLINE_CONFIRMATION|READY_FOR_SPECIFY)\b/.test(outline)) {
    fail("temporary Outline must remain non-authorizing during discovery");
  }
}

async function writeJsonAtomic(filePath, value) {
  const temporary = `${filePath}.write-${process.pid}-${Date.now()}`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    fail(`cannot inspect Outline discovery writeback lock owner ${pid}: ${error.message}`);
  }
}

function validateLockOwner(owner, feature, label, { requireLockId = false } = {}) {
  requireObject(owner, label);
  if (
    owner.schema_version !== 1 ||
    owner.feature !== feature ||
    !Number.isSafeInteger(owner.pid) ||
    owner.pid <= 0 ||
    !text(owner.acquired_at) ||
    Number.isNaN(Date.parse(owner.acquired_at)) ||
    (requireLockId && !text(owner.lock_id)) ||
    (owner.lock_id !== undefined && !text(owner.lock_id))
  ) {
    fail(`${label} is invalid`);
  }
  return owner;
}

function lockIdentity(owner) {
  return text(owner.lock_id) || JSON.stringify({
    schema_version: owner.schema_version,
    feature: owner.feature,
    pid: owner.pid,
    acquired_at: owner.acquired_at,
  });
}

async function createOwnedLock(lockPath, feature, label) {
  const owner = {
    schema_version: 1,
    feature,
    pid: process.pid,
    acquired_at: new Date().toISOString(),
    lock_id: randomUUID(),
  };
  let handle;
  try {
    handle = await fs.open(lockPath, "wx");
    await handle.writeFile(`${JSON.stringify(owner, null, 2)}\n`, "utf8");
    await handle.close();
    return owner;
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
      await fs.unlink(lockPath).catch(() => {});
    }
    if (error?.code === "EEXIST") throw error;
    fail(`cannot create ${label}: ${error.message}`);
  }
}

async function releaseOwnedLock(lockPath, owner, label) {
  try {
    const current = validateLockOwner(await readJson(lockPath, label), owner.feature, label, { requireLockId: true });
    if (current.lock_id !== owner.lock_id) {
      process.stderr.write(`${label} cleanup warning: ownership changed at ${lockPath}; lock was preserved\n`);
      return;
    }
    await fs.unlink(lockPath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      process.stderr.write(`${label} cleanup warning: ${lockPath}: ${error.message}\n`);
    }
  }
}

async function acquireRecoveryClaim(recoveryPath, feature) {
  const label = "Outline discovery stale-lock recovery claim";
  try {
    return await createOwnedLock(recoveryPath, feature, label);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }

  const observed = validateLockOwner(
    await readJson(recoveryPath, label),
    feature,
    label,
    { requireLockId: true },
  );
  if (processIsAlive(observed.pid)) {
    fail(`${label} is held by active process ${observed.pid}: ${recoveryPath}`);
  }
  fail(`${label} was left by dead process ${observed.pid}; preserve both lock files, verify no writeback is running, remove ${recoveryPath}, and retry`);
}

async function reconcileRecoveryClaimAfterFreshLock(recoveryPath, feature) {
  if (!await exists(recoveryPath)) return;
  const label = "Outline discovery stale-lock recovery claim";
  const observed = validateLockOwner(
    await readJson(recoveryPath, label),
    feature,
    label,
    { requireLockId: true },
  );
  if (processIsAlive(observed.pid)) {
    fail(`${label} is still held by active process ${observed.pid}: ${recoveryPath}`);
  }
  await fs.unlink(recoveryPath);
}

async function acquireFeatureLock(featureRoot, feature) {
  const lockPath = path.join(featureRoot, "prd", "review", ".outline-discovery-writeback.lock");
  const recoveryPath = path.join(featureRoot, "prd", "review", ".outline-discovery-writeback.recovery.lock");
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const owner = await createOwnedLock(lockPath, feature, "Outline discovery writeback lock");
      try {
        await reconcileRecoveryClaimAfterFreshLock(recoveryPath, feature);
      } catch (error) {
        await releaseOwnedLock(lockPath, owner, "Outline discovery writeback lock");
        throw error;
      }
      return async () => releaseOwnedLock(lockPath, owner, "Outline discovery writeback lock");
    } catch (error) {
      if (error?.code !== "EEXIST") {
        fail(`cannot acquire Outline discovery writeback lock: ${error.message}`);
      }
    }

    const observed = validateLockOwner(
      await readJson(lockPath, "Outline discovery writeback lock"),
      feature,
      "Outline discovery writeback lock",
    );
    if (processIsAlive(observed.pid)) {
      fail(`Outline discovery writeback lock is held by active process ${observed.pid}: ${lockPath}`);
    }

    const recoveryOwner = await acquireRecoveryClaim(recoveryPath, feature);
    try {
      if (!await exists(lockPath)) continue;
      const current = validateLockOwner(
        await readJson(lockPath, "Outline discovery writeback lock"),
        feature,
        "Outline discovery writeback lock",
      );
      if (lockIdentity(current) !== lockIdentity(observed)) continue;
      if (processIsAlive(current.pid)) {
        fail(`Outline discovery writeback lock changed to active process ${current.pid}: ${lockPath}`);
      }
      await fs.unlink(lockPath);
    } finally {
      await releaseOwnedLock(recoveryPath, recoveryOwner, "Outline discovery stale-lock recovery claim");
    }
  }
  fail(`cannot acquire Outline discovery writeback lock after stale-lock recovery: ${lockPath}`);
}

async function replaceDocumentPair(prdPath, outlinePath, prdTempPath, outlineTempPath) {
  const token = `${process.pid}-${Date.now()}`;
  const prdBackup = `${prdPath}.backup-${token}`;
  const outlineBackup = `${outlinePath}.backup-${token}`;
  let prdBackedUp = false;
  let outlineBackedUp = false;
  let prdReplaced = false;
  let outlineReplaced = false;
  try {
    await fs.rename(prdPath, prdBackup);
    prdBackedUp = true;
    await fs.rename(outlinePath, outlineBackup);
    outlineBackedUp = true;
    await fs.rename(prdTempPath, prdPath);
    prdReplaced = true;
    await fs.rename(outlineTempPath, outlinePath);
    outlineReplaced = true;
  } catch (error) {
    try {
      if (prdReplaced && await exists(prdPath)) await fs.rename(prdPath, prdTempPath);
      if (outlineReplaced && await exists(outlinePath)) await fs.rename(outlinePath, outlineTempPath);
      if (prdBackedUp && await exists(prdBackup)) await fs.rename(prdBackup, prdPath);
      if (outlineBackedUp && await exists(outlineBackup)) await fs.rename(outlineBackup, outlinePath);
    } catch (rollbackError) {
      fail(`document replacement failed (${error.message}) and rollback failed (${rollbackError.message})`);
    }
    fail(`document replacement failed; both formal documents were restored: ${error.message}`);
  }

  for (const backup of [prdBackup, outlineBackup]) {
    try {
      await fs.unlink(backup);
    } catch (error) {
      process.stderr.write(`Outline discovery backup cleanup warning: ${backup}: ${error.message}\n`);
    }
  }
}

async function main() {
  const root = path.resolve(process.cwd());
  const args = parseArgs(process.argv.slice(2));
  const responsePath = repositoryPath(root, args["--response"], "--response");
  const prdTempPath = repositoryPath(root, args["--prd-temp"], "--prd-temp");
  const outlineTempPath = repositoryPath(root, args["--outline-temp"], "--outline-temp");
  const response = await readJson(responsePath.resolved, "response");
  validateResponseEnvelope(response);

  const expectedSource = `specs/${response.feature}/prd/review/outline-discovery-data.json`;
  if (response.source_review_data !== expectedSource) fail("response source_review_data does not match feature");
  const sourcePath = repositoryPath(root, response.source_review_data, "response source_review_data");
  const expectedPrdTemp = `specs/${response.feature}/prd.md.tmp`;
  const expectedOutlineTemp = `specs/${response.feature}/spec-outline.md.tmp`;
  if (prdTempPath.normalized !== expectedPrdTemp) fail(`--prd-temp must be ${expectedPrdTemp}`);
  if (outlineTempPath.normalized !== expectedOutlineTemp) fail(`--outline-temp must be ${expectedOutlineTemp}`);

  const featureRoot = path.resolve(root, "specs", response.feature);
  const releaseLock = await acquireFeatureLock(featureRoot, response.feature);
  try {
    const source = await readJson(sourcePath.resolved, "source discovery data");
    validateSourceIdentity(source, response, expectedSource);
    const questions = buildQuestionIndex(source);
    const seenDeltaIds = new Set();
    const seenQuestionIds = new Set();
    const deltas = response.deltas.map((delta, index) =>
      validateDeltaShape(delta, index, questions, seenDeltaIds, seenQuestionIds));

    const prdPath = path.join(featureRoot, "prd.md");
    const outlinePath = path.join(featureRoot, "spec-outline.md");
    const ledgerPath = path.join(featureRoot, "prd", "review", "outline-intent-ledger.json");
    const currentPrd = await readText(prdPath, "current PRD");
    await readText(outlinePath, "current Outline");
    for (const delta of deltas) validateTargetReference(currentPrd, delta);

    const ledger = await exists(ledgerPath)
      ? await readJson(ledgerPath, "intent ledger")
      : { schema_version: 1, format: "speccompass-outline-intent-ledger", feature: response.feature, events: [] };
    validateExistingLedger(ledger, response.feature);
    const nextLedger = prepareLedger(response, deltas, ledger, currentPrd);
    await writeJsonAtomic(ledgerPath, nextLedger);

    const temporaryPrd = await readText(prdTempPath.resolved, "temporary PRD");
    const temporaryOutline = await readText(outlineTempPath.resolved, "temporary Outline");
    validateTemporaryPrd(temporaryPrd, deltas);
    validateTemporaryOutline(temporaryOutline, response.outline_maturity);
    await replaceDocumentPair(prdPath, outlinePath, prdTempPath.resolved, outlineTempPath.resolved);

    process.stdout.write(`${JSON.stringify({
      ok: true,
      feature: response.feature,
      response_id: response.response_id,
      consumed_delta_ids: deltas.map((delta) => delta.delta_id),
      ledger_path: path.relative(root, ledgerPath).replace(/\\/g, "/"),
    })}\n`);
  } finally {
    await releaseLock();
  }
}

main().catch((error) => {
  process.stderr.write(`Outline discovery writeback failed: ${error.message}\n`);
  process.exitCode = 1;
});
