#!/usr/bin/env node

import { createServer, request as httpRequest } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { open, readFile, realpath, rename, stat, unlink } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const LOOPBACK_HOST = "127.0.0.1";
const MINIMUM_NODE_MAJOR = 18;
const SELF_CHECK_TIMEOUT_MS = 5_000;
const REQUEST_TIMEOUT_MS = 30_000;
const WRITEBACK_PATH = "/__speccompass/writeback";
const WRITEBACK_CONFIG_PATH = "/__speccompass/writeback-config";
const MAX_WRITEBACK_BYTES = 2_000_000;
const MAX_COMPLETED_RECEIPTS = 256;
const TRANSIENT_FILE_ERROR_CODES = new Set(["EACCES", "EBUSY", "EEXIST", "EPERM"]);
const FILE_RETRY_DELAYS_MS = [25, 75, 150, 300];
const LOCK_RETRY_DELAYS_MS = [25, 50, 100, 200, 400, 800];
const STALE_LOCK_AGE_MS = 120_000;
const FEATURE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const REVIEW_TYPES = new Set(["flow", "ui", "outline", "outline-discovery"]);
const DISCOVERY_OPERATIONS = new Set(["confirm_candidate", "add", "replace", "exclude", "context_note"]);
const REVISION_TYPES = {
  flow: new Set(["ADD_NODE", "DELETE_NODE", "MODIFY_NODE", "MODIFY_BRANCH", "ADD_EXCEPTION_PATH", "SPLIT_SUBFLOW", "MERGE_SIMPLIFY", "ADD_ENTRY_EXIT", "OTHER"]),
  ui: new Set(["ADD_SCREEN", "DELETE_SCREEN", "MODIFY_SCREEN_STRUCTURE", "ADD_REGION", "MODIFY_REGION_LAYOUT", "ADD_COMPONENT", "DELETE_COMPONENT", "MODIFY_FIELD_ACTION_COPY", "ADD_STATE", "MODIFY_INTERACTION", "ADD_PERMISSION_DISPLAY", "OTHER"]),
  outline: new Set(["ADD_ITEM", "DELETE_ITEM", "MODIFY_ITEM", "SPLIT_ITEM", "MERGE_ITEM", "MOVE_ITEM", "CHANGE_SCOPE", "CHANGE_AUTHORITY", "OTHER"])
};
const REVIEW_DATA_PATHS = {
  flow: (feature) => `specs/${feature}/flows/review/flow-review-data.json`,
  ui: (feature) => `specs/${feature}/ui/review/ui-review-data.json`,
  outline: (feature) => `specs/${feature}/prd/review/outline-review-data.json`,
  "outline-discovery": (feature) => `specs/${feature}/prd/review/outline-discovery-data.json`
};
const WRITEBACK_PATHS = {
  flow: (feature) => `specs/${feature}/flows/review/flow-confirmation.md`,
  ui: (feature) => `specs/${feature}/ui/review/ui-confirmation.md`,
  outline: (feature) => `specs/${feature}/prd/review/outline-confirmation.md`,
  "outline-discovery": (feature) => `specs/${feature}/prd/review/outline-discovery-response-pending.json`
};
const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".eot", "application/vnd.ms-fontobject"],
  [".txt", "text/plain; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"]
]);

let server = null;
let shuttingDown = false;
const targetWriteQueues = new Map();
const inFlightReceipts = new Map();
const completedReceipts = new Map();
const abandonedWriteLockTokens = new Set();

class WritebackError extends Error {
  constructor(statusCode, code, message, options = {}) {
    super(message);
    this.name = "WritebackError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = options.retryable === true;
    this.allowFallback = options.allowFallback === true;
    this.recoveryAction = options.recoveryAction || "fix_and_retry";
  }
}

function requireSupportedNodeRuntime() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (!Number.isInteger(major) || major < MINIMUM_NODE_MAJOR) {
    throw new Error(`SpecCompass review writeback requires Node.js ${MINIMUM_NODE_MAJOR} or newer; found ${process.versions.node}.`);
  }
}

function usageError(message) {
  throw new Error(
    `${message}\nUsage: node .specify/review/scripts/serve-review.mjs (--flow <feature> | --ui <feature> | --outline <feature> | --outline-discovery <feature>) [--port <0-65535>]`
  );
}

function parseArguments(argv) {
  let reviewType = null;
  let feature = null;
  let port = 0;
  let sawPort = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument.startsWith("--") && REVIEW_TYPES.has(argument.slice(2))) {
      if (reviewType) usageError("Provide exactly one of --flow, --ui, --outline, or --outline-discovery.");
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) usageError(`${argument} requires a feature.`);
      reviewType = argument.slice(2);
      feature = value;
      index += 1;
      continue;
    }
    if (argument === "--port") {
      if (sawPort) usageError("Provide --port at most once.");
      const value = argv[index + 1];
      if (!value || !/^(0|[1-9][0-9]*)$/.test(value)) {
        usageError("--port must be a decimal integer from 0 to 65535.");
      }
      port = Number(value);
      if (!Number.isSafeInteger(port) || port > 65_535) {
        usageError("--port must be a decimal integer from 0 to 65535.");
      }
      sawPort = true;
      index += 1;
      continue;
    }
    usageError(`Unknown argument: ${argument}`);
  }

  if (!reviewType || !feature) usageError("Provide exactly one of --flow, --ui, --outline, or --outline-discovery.");
  if (!FEATURE_PATTERN.test(feature) || feature.includes("..")) {
    usageError("Feature must start with an alphanumeric character and contain only letters, digits, dots, underscores, or hyphens, without '..'.");
  }
  return { reviewType, feature, port };
}

function isWithin(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

async function requireRegularFile(projectRoot, realProjectRoot, path) {
  const absolutePath = resolve(projectRoot, path);
  if (!isWithin(projectRoot, absolutePath)) throw new Error(`Required path escapes project root: ${path}`);
  const realPath = await realpath(absolutePath);
  if (!isWithin(realProjectRoot, realPath)) throw new Error(`Required path escapes project root: ${path}`);
  const details = await stat(realPath);
  if (!details.isFile()) throw new Error(`Required path is not a file: ${path}`);
  return realPath;
}

function responseHeaders(contentType, contentLength) {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (contentType) headers["Content-Type"] = contentType;
  if (contentLength !== undefined) headers["Content-Length"] = String(contentLength);
  return headers;
}

function sendText(response, status, message, extraHeaders = {}) {
  const body = Buffer.from(`${message}\n`, "utf-8");
  response.writeHead(status, {
    ...responseHeaders("text/plain; charset=utf-8", body.length),
    ...extraHeaders
  });
  response.end(body);
}

function sendJson(response, status, value) {
  const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf-8");
  response.writeHead(status, responseHeaders("application/json; charset=utf-8", body.length));
  response.end(body);
}

function sendWritebackError(response, error) {
  const known = error instanceof WritebackError;
  const status = known ? error.statusCode : 500;
  const code = known ? error.code : "INTERNAL_WRITEBACK_ERROR";
  const message = known ? error.message : "Internal writeback error.";
  sendJson(response, status, {
    ok: false,
    error: {
      code,
      message,
      retryable: known ? error.retryable : false,
      allow_fallback: known ? error.allowFallback : false,
      recovery_action: known ? error.recoveryAction : "reload_review"
    }
  });
  if (!known) console.error(`Review writeback failed: ${error?.message || error}`);
}

function canonicalizeReviewValue(value) {
  if (Array.isArray(value)) return value.map(canonicalizeReviewValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalizeReviewValue(value[key])]));
  }
  return value;
}

function reviewDataIdentifier(value) {
  const text = JSON.stringify(canonicalizeReviewValue(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function targetVersion(content) {
  return content === null ? "missing" : `sha256:${sha256(content)}`;
}

async function currentTargetVersion(path) {
  try {
    return targetVersion(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return "missing";
    throw error;
  }
}

function normalizeLegacyReviewData(value) {
  if (value?.schema_version !== 1 || (value.review_type !== "flow" && value.review_type !== "ui")) return value;
  const normalized = JSON.parse(JSON.stringify(value));
  const itemKey = normalized.review_type === "ui" ? "screens" : "diagrams";
  for (const module of normalized.modules || []) {
    for (const item of module[itemKey] || []) {
      item.nodes = (item.nodes || []).map((node) => (
        node.recommended_option || (node.options || []).length || node.review_level === "must_confirm"
          ? { ...node, confirmation_priority: "normal" }
          : node
      ));
    }
  }
  return normalized;
}

function cleanText(value, fallback = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

function jsonYaml(value) {
  return JSON.stringify(value ?? null);
}

function recordReference(record) {
  return cleanText(record?.target_ref || record?.id, "unknown-review-item");
}

function currentReviewTargets(reviewData) {
  const collectionKey = reviewData.review_type === "outline" ? "views" : reviewData.review_type === "ui" ? "screens" : "diagrams";
  const targets = new Map();
  for (const module of reviewData.modules || []) {
    for (const item of module[collectionKey] || []) {
      for (const node of item.nodes || []) {
        const targetRef = `${module.id || module.title}:${item.id || item.title}:${node.id}`;
        targets.set(targetRef, node);
      }
    }
  }
  return targets;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeConfirmationParts(parts, context, reviewData) {
  if (!Array.isArray(parts) || parts.length === 0) throw new Error("parts must contain at least one confirmation package part");
  const ordered = [...parts].sort((left, right) => Number(left?.part_index) - Number(right?.part_index));
  const first = ordered[0];
  const repeatedFields = [
    "format", "version", "schema_version", "review_type", "package_session_id", "batch_id",
    "review_data_id", "outline_digest", "source_authority_ids", "source_review_data", "target_path",
    "total_record_count", "part_count"
  ];
  if (first?.format !== "speccompass-confirmation-package" || first?.version !== 1) {
    throw new Error("unsupported confirmation package format or version");
  }
  if (first.review_type !== context.reviewType) throw new Error("confirmation review_type does not match this review server");
  if (first.schema_version !== reviewData.schema_version) throw new Error("confirmation schema_version does not match current review data");
  if (first.batch_id !== reviewData.batch_id) throw new Error("confirmation batch_id does not match current review data");
  if (first.source_review_data !== context.dataPath) throw new Error("confirmation source_review_data does not match this review server");
  if (first.target_path !== context.targetPath) throw new Error("confirmation target_path does not match this review server");
  if (first.review_data_id !== context.reviewDataId) throw new Error("confirmation review_data_id is stale or does not match current review data");
  if (!Number.isSafeInteger(first.part_count) || first.part_count !== ordered.length) {
    throw new Error("confirmation package part_count does not match supplied parts");
  }
  const sessionId = cleanText(first.package_session_id);
  if (!sessionId) throw new Error("confirmation package_session_id is required");
  if (context.reviewType === "outline") {
    const packageDigest = cleanText(first.outline_digest).replace(/^sha256:/i, "").toLowerCase();
    const reviewDigest = cleanText(reviewData.outline_digest).replace(/^sha256:/i, "").toLowerCase();
    if (!packageDigest || packageDigest !== reviewDigest) throw new Error("confirmation outline_digest does not match current review data");
    if (!sameJson(first.source_authority_ids, reviewData.source_authority_ids)) {
      throw new Error("confirmation source_authority_ids do not match current review data");
    }
  }
  const records = [];
  const targetRefs = new Set();
  const expectedTargets = currentReviewTargets(reviewData);
  let summedRecordCount = 0;
  for (const [index, part] of ordered.entries()) {
    if (part.part_index !== index + 1) throw new Error("confirmation parts must be complete and use consecutive part_index values");
    for (const field of repeatedFields) {
      if (JSON.stringify(part[field]) !== JSON.stringify(first[field])) {
        throw new Error(`confirmation package field differs across parts: ${field}`);
      }
    }
    const partRecords = (part.modules || []).flatMap((module) => module.records || []);
    if (part.part_record_count !== partRecords.length) throw new Error(`confirmation part_record_count mismatch in part ${part.part_index}`);
    summedRecordCount += partRecords.length;
    for (const record of partRecords) {
      const targetRef = recordReference(record);
      if (targetRefs.has(targetRef)) throw new Error(`duplicate confirmation target_ref: ${targetRef}`);
      const sourceNode = expectedTargets.get(targetRef);
      if (!sourceNode) throw new Error(`confirmation target_ref is not present in current review data: ${targetRef}`);
      const optionIds = new Set((sourceNode.options || []).map((option) => option.id));
      if (record.selected_option !== "MISSING" && record.selected_option && !optionIds.has(record.selected_option)) {
        throw new Error(`confirmation selected_option is not present on current review node: ${targetRef}`);
      }
      if (record.revision_request && record.revision_request.target_ref !== targetRef) {
        throw new Error(`revision_request target_ref does not match its confirmation record: ${targetRef}`);
      }
      if (record.revision_request) {
        const request = record.revision_request;
        if (request.review_type !== context.reviewType || !REVISION_TYPES[context.reviewType].has(request.change_type)) {
          throw new Error(`revision_request review_type or change_type is invalid: ${targetRef}`);
        }
        if (!cleanText(request.reviewer_note) || !cleanText(request.expected_model_action)) {
          throw new Error(`revision_request must preserve reviewer_note and expected_model_action: ${targetRef}`);
        }
      }
      targetRefs.add(targetRef);
      records.push(record);
    }
  }
  if (summedRecordCount !== first.total_record_count) throw new Error("sum(part_record_count) does not equal total_record_count");
  if (targetRefs.size !== expectedTargets.size) throw new Error("confirmation package does not contain every current review target");
  return { package: first, records };
}

function confirmationMarkdown(merged, reviewData, context) {
  const { package: packagePart, records } = merged;
  const authorized = records.filter((record) => record.authorization_state === "AUTHORIZED" && record.is_authorized_decision !== false);
  const revisionRequests = records.map((record) => record.revision_request).filter(Boolean);
  const refsFor = (bucket) => records.filter((record) => record.bucket === bucket).map(recordReference);
  const openItems = [
    ...refsFor("needs_decision_items"),
    ...refsFor("unresolved_decision_items"),
    ...refsFor("draft_excluded_items")
  ];
  const status = openItems.length || revisionRequests.length ? "NEEDS_REVISION" : "CONFIRMED";
  const command = { flow: "/sp.flow", ui: "/sp.ui", outline: "/sp.prd" }[context.reviewType];
  const authorizationScope = status === "CONFIRMED"
    ? { flow: "READY_FOR_UI", ui: "READY_FOR_PLAN", outline: "READY_FOR_SPECIFY" }[context.reviewType]
    : "BLOCKED";
  const authorityIds = context.reviewType === "outline" ? packagePart.source_authority_ids : undefined;
  const recordedAt = new Date().toISOString();
  const sourceArtifacts = (reviewData.source_snapshot || []).map((source) => ({
    ...source,
    digest: source.digest || "not-computed"
  }));
  const lines = [
    "---",
    "document_type: sp_human_confirmation",
    `command: ${command}`,
    `feature: ${context.feature}`,
    "schema_version: 1",
    `review_type: ${context.reviewType}`,
    "review_artifact: .specify/review/renderer/speccompass-review-renderer.html",
    "review_artifact_mode: local-writer",
    `review_data_artifact: ${context.dataPath}`,
    `review_data_schema: .specify/review/schemas/${context.reviewType}-review-data.schema.json`,
    "review_validator: .specify/review/scripts/validate-review-data.mjs",
    `review_data_id: ${packagePart.review_data_id}`,
    "review_data_identity_verified: MATCH",
    `confirm_strategy: ${cleanText(reviewData.confirm_strategy, "batch")}`,
    `batch_id: ${jsonYaml(packagePart.batch_id)}`,
    `batch_scope: ${jsonYaml(records.map(recordReference))}`,
    `package_session_id: ${jsonYaml(packagePart.package_session_id)}`,
    `batch_review_status: ${status}`,
    `human_confirmation: ${status}`,
    `authorization_scope: ${authorizationScope}`,
    `source_artifacts_snapshot: ${jsonYaml(sourceArtifacts)}`,
    "source_hash_verified: NOT_CHECKED",
    `confirmed_by: ${jsonYaml({ name: "local-reviewer", role: "reviewer", confirmed_at: recordedAt })}`,
    `owner_approval: ${jsonYaml({ required: true, status: status === "CONFIRMED" ? "CONFIRMED" : "PENDING" })}`,
    `confirmed_items: ${jsonYaml(refsFor("confirmed_items"))}`,
    `decision_recorded_items: ${jsonYaml(authorized.filter((record) => record.bucket === "decision_recorded_items").map(recordReference))}`,
    `needs_decision_items: ${jsonYaml(refsFor("needs_decision_items"))}`,
    `unresolved_decision_items: ${jsonYaml(refsFor("unresolved_decision_items"))}`,
    `draft_excluded_items: ${jsonYaml(refsFor("draft_excluded_items"))}`,
    `decision_records: ${jsonYaml(records)}`,
    `revision_requests: ${jsonYaml(revisionRequests)}`
  ];
  if (context.reviewType === "outline") {
    lines.splice(9, 0,
      `outline_digest: ${packagePart.outline_digest}`,
      `source_authority_ids: ${jsonYaml(authorityIds)}`
    );
  }
  lines.push(
    "---",
    "",
    `# ${context.reviewType === "outline" ? "Outline" : context.reviewType === "ui" ? "UI" : "Flow"} Confirmation`,
    "",
    `Recorded mechanically by the local SpecCompass review writer at ${recordedAt}.`,
    "No model interpretation was performed during writeback. Rerun the owning command to apply revision requests and regenerate only affected review items.",
    "",
    "## Review Records",
    "",
    "```json",
    JSON.stringify(records, null, 2),
    "```",
    ""
  );
  return lines.join("\n");
}

function validateDiscoveryDelta(delta, question) {
  const operation = cleanText(delta?.operation);
  if (!DISCOVERY_OPERATIONS.has(operation) || !(question.free_input?.allowed_operations || []).includes(operation)) {
    throw new Error(`Discovery response operation is invalid for question: ${question.id}`);
  }
  if (delta.target_kind !== cleanText(question.target_kind, "context")) {
    throw new Error(`Discovery response target_kind does not match question: ${question.id}`);
  }
  const candidateId = cleanText(delta.candidate_id) || null;
  const candidate = candidateId ? (question.candidates || []).find((entry) => entry.id === candidateId) : null;
  if (candidateId && !candidate) throw new Error(`Discovery response candidate is unknown for question: ${question.id}`);
  const targetId = cleanText(delta.target_id) || null;
  const value = cleanText(delta.value);
  const noneOfTheAbove = delta.none_of_the_above === true;
  if (noneOfTheAbove && question.allow_none_of_the_above !== true) {
    throw new Error(`Discovery response none_of_the_above is not allowed for question: ${question.id}`);
  }
  if (operation === "confirm_candidate") {
    if (!candidate || targetId || noneOfTheAbove || value !== cleanText(candidate.value) || delta.source_tag !== "user-confirmed") {
      throw new Error(`Discovery confirm_candidate delta is invalid for question: ${question.id}`);
    }
  } else if (operation === "add") {
    if (candidateId || targetId || !value || delta.source_tag !== "user") throw new Error(`Discovery add delta is invalid for question: ${question.id}`);
  } else if (operation === "replace") {
    if (candidateId || !targetId || !value || noneOfTheAbove || delta.source_tag !== "user") throw new Error(`Discovery replace delta is invalid for question: ${question.id}`);
  } else if (operation === "exclude") {
    if (Boolean(candidateId) === Boolean(targetId) || noneOfTheAbove || delta.source_tag !== "user") throw new Error(`Discovery exclude delta is invalid for question: ${question.id}`);
  } else if (candidateId || targetId || !value || noneOfTheAbove || delta.source_tag !== "user") {
    throw new Error(`Discovery context_note delta is invalid for question: ${question.id}`);
  }
  if (delta.supersedes_delta_id !== null && delta.supersedes_delta_id !== undefined) {
    throw new Error(`Discovery pending response cannot supersede ledger events directly: ${question.id}`);
  }
}

async function readJsonFile(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function retryTransientFileOperation(operation) {
  let lastError;
  for (let attempt = 0; attempt <= FILE_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!TRANSIENT_FILE_ERROR_CODES.has(error?.code) || attempt === FILE_RETRY_DELAYS_MS.length) throw error;
      await delay(FILE_RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

async function cleanupTemporaryFile(path) {
  try {
    await retryTransientFileOperation(() => unlink(path));
  } catch (error) {
    if (error?.code !== "ENOENT") console.warn(`Could not remove temporary writeback file ${path}: ${error?.code || error}`);
  }
}

function processIsRunning(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function removeStaleWriteLock(lockPath) {
  try {
    const [rawOwner, details] = await Promise.all([readFile(lockPath, "utf8"), stat(lockPath)]);
    const owner = JSON.parse(rawOwner);
    const abandonedByThisProcess = abandonedWriteLockTokens.has(owner?.token);
    if (!abandonedByThisProcess && (Date.now() - details.mtimeMs < STALE_LOCK_AGE_MS || processIsRunning(Number(owner?.pid)))) return false;
    const currentOwner = await readFile(lockPath, "utf8");
    if (currentOwner !== rawOwner) return false;
    await retryTransientFileOperation(() => unlink(lockPath));
    abandonedWriteLockTokens.delete(owner?.token);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    return false;
  }
}

async function acquireWriteLock(target) {
  const lockPath = `${target}.speccompass-writeback.lock`;
  const token = randomBytes(16).toString("hex");
  const owner = `${JSON.stringify({ pid: process.pid, token, created_at: new Date().toISOString() })}\n`;
  for (let attempt = 0; attempt <= LOCK_RETRY_DELAYS_MS.length; attempt += 1) {
    let handle = null;
    try {
      handle = await open(lockPath, "wx", 0o600);
      await handle.writeFile(owner, { encoding: "utf8" });
      await handle.sync();
      await handle.close();
      return async () => {
        try {
          const currentOwner = await readFile(lockPath, "utf8");
          if (currentOwner === owner) {
            try {
              await retryTransientFileOperation(() => unlink(lockPath));
              abandonedWriteLockTokens.delete(token);
            } catch (error) {
              abandonedWriteLockTokens.add(token);
              throw error;
            }
          }
        } catch (error) {
          if (error?.code !== "ENOENT") console.warn(`Could not release writeback lock ${lockPath}: ${error?.code || error}`);
        }
      };
    } catch (error) {
      try { await handle?.close(); } catch { /* best effort */ }
      if (error?.code !== "EEXIST") {
        if (TRANSIENT_FILE_ERROR_CODES.has(error?.code) && attempt < LOCK_RETRY_DELAYS_MS.length) {
          await delay(LOCK_RETRY_DELAYS_MS[attempt]);
          continue;
        }
        if (TRANSIENT_FILE_ERROR_CODES.has(error?.code)) {
          throw new WritebackError(503, "WRITE_TARGET_TEMPORARILY_UNAVAILABLE", "The target lock is temporarily busy or inaccessible.", {
            retryable: true,
            allowFallback: true,
            recoveryAction: "retry_then_download"
          });
        }
        throw error;
      }
      if (await removeStaleWriteLock(lockPath)) continue;
      if (attempt === LOCK_RETRY_DELAYS_MS.length) {
        throw new WritebackError(503, "WRITEBACK_TARGET_LOCKED", "Another review process is writing this target.", {
          retryable: true,
          allowFallback: true,
          recoveryAction: "retry_then_download"
        });
      }
      await delay(LOCK_RETRY_DELAYS_MS[attempt]);
    }
  }
  throw new WritebackError(503, "WRITEBACK_TARGET_LOCKED", "Another review process is writing this target.", {
    retryable: true,
    allowFallback: true,
    recoveryAction: "retry_then_download"
  });
}

async function withWriteLock(target, operation) {
  const release = await acquireWriteLock(target);
  try {
    return await operation();
  } finally {
    await release();
  }
}

async function atomicWrite(target, content) {
  const temporary = `${target}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`;
  let handle = null;
  let renamed = false;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(content, { encoding: "utf8" });
    await handle.sync();
    await handle.close();
    handle = null;
    await retryTransientFileOperation(() => rename(temporary, target));
    renamed = true;

    if (process.platform !== "win32") {
      let directoryHandle = null;
      try {
        directoryHandle = await open(dirname(target), "r");
        await directoryHandle.sync();
      } catch (error) {
        console.warn(`Could not sync writeback directory ${dirname(target)}: ${error?.code || error}`);
      } finally {
        try { await directoryHandle?.close(); } catch { /* best effort */ }
      }
    }
  } catch (error) {
    try { await handle?.close(); } catch { /* best effort */ }
    if (!renamed) await cleanupTemporaryFile(temporary);
    if (TRANSIENT_FILE_ERROR_CODES.has(error?.code)) {
      throw new WritebackError(503, "WRITE_TARGET_TEMPORARILY_UNAVAILABLE", "The target file is temporarily busy or inaccessible.", {
        retryable: true,
        allowFallback: true,
        recoveryAction: "retry_then_download"
      });
    }
    if (["ENOSPC", "EDQUOT", "EROFS"].includes(error?.code)) {
      throw new WritebackError(507, "WRITE_TARGET_STORAGE_UNAVAILABLE", "The project cannot accept this write because storage is full or read-only.", {
        allowFallback: true,
        recoveryAction: "free_space_or_download"
      });
    }
    throw error;
  }
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    let exceeded = false;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };
    const timeout = setTimeout(() => {
      request.resume();
      finish(rejectBody, new WritebackError(408, "REQUEST_BODY_TIMEOUT", "Timed out while receiving the writeback request.", {
        retryable: true,
        allowFallback: true,
        recoveryAction: "retry_then_download"
      }));
    }, REQUEST_TIMEOUT_MS);
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_WRITEBACK_BYTES) {
        exceeded = true;
        return;
      }
      if (!exceeded) chunks.push(chunk);
    });
    request.on("end", () => {
      if (exceeded) {
        finish(rejectBody, new WritebackError(413, "WRITEBACK_PAYLOAD_TOO_LARGE", "The writeback request is too large.", {
          allowFallback: true,
          recoveryAction: "download_fallback"
        }));
        return;
      }
      try { finish(resolveBody, JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { finish(rejectBody, new WritebackError(400, "INVALID_JSON", "The writeback body must be valid JSON.")); }
    });
    request.on("error", (error) => finish(rejectBody, error));
  });
}

function writebackRequestId(payload, context) {
  const fallbackId = context.reviewType === "outline-discovery"
    ? payload?.response?.response_id
    : payload?.parts?.[0]?.package_session_id;
  const requestId = cleanText(payload?.request_id || fallbackId);
  if (!requestId || requestId.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(requestId)) {
    throw new WritebackError(400, "INVALID_REQUEST_ID", "A stable writeback request ID is required.");
  }
  return requestId;
}

function enqueueTargetWrite(target, operation) {
  const previous = targetWriteQueues.get(target) || Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  targetWriteQueues.set(target, current);
  void current.finally(() => {
    if (targetWriteQueues.get(target) === current) targetWriteQueues.delete(target);
  }).catch(() => undefined);
  return current;
}

function rememberCompletedReceipt(key, fingerprint, result) {
  completedReceipts.delete(key);
  completedReceipts.set(key, { fingerprint, result });
  while (completedReceipts.size > MAX_COMPLETED_RECEIPTS) {
    completedReceipts.delete(completedReceipts.keys().next().value);
  }
}

async function executeIdempotentWrite(payload, context) {
  const requestId = writebackRequestId(payload, context);
  const key = `${context.targetPath}:${requestId}`;
  const fingerprint = sha256(JSON.stringify(canonicalizeReviewValue(payload)));
  const completed = completedReceipts.get(key);
  if (completed) {
    if (completed.fingerprint !== fingerprint) {
      throw new WritebackError(409, "REQUEST_ID_REUSED", "The writeback request ID was reused with different content.", {
        recoveryAction: "reload_review"
      });
    }
    if (await currentTargetVersion(context.absoluteTargetPath) !== completed.result.target_version) {
      throw new WritebackError(409, "WRITEBACK_TARGET_CHANGED", "The writeback target changed after this request completed.", {
        recoveryAction: "reload_review"
      });
    }
    return { ...completed.result, idempotent_replay: true };
  }
  const inFlight = inFlightReceipts.get(key);
  if (inFlight) {
    if (inFlight.fingerprint !== fingerprint) {
      throw new WritebackError(409, "REQUEST_ID_REUSED", "The writeback request ID is already processing different content.", {
        recoveryAction: "reload_review"
      });
    }
    const result = await inFlight.promise;
    return { ...result, idempotent_replay: true };
  }

  const promise = enqueueTargetWrite(
    context.absoluteTargetPath,
    () => withWriteLock(context.absoluteTargetPath, () => processWriteback(payload, context))
  );
  inFlightReceipts.set(key, { fingerprint, promise });
  try {
    const result = await promise;
    rememberCompletedReceipt(key, fingerprint, result);
    return result;
  } finally {
    if (inFlightReceipts.get(key)?.promise === promise) inFlightReceipts.delete(key);
  }
}

async function processWriteback(payload, context) {
  const reviewData = normalizeLegacyReviewData(await readJsonFile(context.absoluteDataPath));
  const currentReviewDataId = reviewDataIdentifier(reviewData);
  const expectedReviewType = context.reviewType === "outline-discovery" ? "outline_discovery" : context.reviewType;
  if (reviewData.review_type !== expectedReviewType || reviewData.project?.feature !== context.feature || reviewData.artifact_path !== context.dataPath) {
    throw new WritebackError(409, "REVIEW_DATA_MISMATCH", "Current review data does not match this review server.", {
      recoveryAction: "reload_review"
    });
  }
  if (payload?.review_data_id !== currentReviewDataId) {
    throw new WritebackError(409, "REVIEW_DATA_STALE", "Review data changed after the page was loaded. Reload before writing.", {
      recoveryAction: "reload_review"
    });
  }
  const currentVersion = await currentTargetVersion(context.absoluteTargetPath);
  const expectedTargetVersion = cleanText(payload?.expected_target_version);
  if (!expectedTargetVersion) {
    throw new WritebackError(400, "MISSING_TARGET_VERSION", "The expected writeback target version is required.", {
      recoveryAction: "reload_review"
    });
  }
  if (currentVersion !== expectedTargetVersion) {
    throw new WritebackError(409, "WRITEBACK_TARGET_CHANGED", "The confirmation target changed after this page loaded.", {
      recoveryAction: "reload_review"
    });
  }

  if (context.reviewType === "outline-discovery") {
    const discovery = payload?.response;
    if (payload?.kind !== "outline_discovery" || discovery?.format !== "speccompass-outline-discovery-response") {
      throw new WritebackError(400, "INVALID_DISCOVERY_RESPONSE", "Expected an Outline Discovery response.");
    }
    if (discovery.review_type !== "outline_discovery" || discovery.feature !== context.feature || discovery.batch_id !== reviewData.batch_id) {
      throw new WritebackError(409, "DISCOVERY_RESPONSE_MISMATCH", "Discovery response does not match this feature and review batch.", {
        recoveryAction: "reload_review"
      });
    }
    if (discovery.source_review_data !== context.dataPath || discovery.authorization_effect !== "none" || discovery.next_route !== "/sp.prd") {
      throw new WritebackError(400, "INVALID_DISCOVERY_ROUTE", "Discovery response source or routing contract is invalid.");
    }
    if (discovery.schema_version !== 3 || discovery.outline_maturity !== reviewData.outline_maturity || !cleanText(discovery.response_id)) {
      throw new WritebackError(400, "INVALID_DISCOVERY_IDENTITY", "Discovery response identity or schema is invalid.");
    }
    const questions = new Map(
      (reviewData.question_groups || []).flatMap((group) => group.questions || []).map((question) => [question.id, question])
    );
    if (!Array.isArray(discovery.deltas) || discovery.deltas.length === 0) {
      throw new WritebackError(400, "EMPTY_DISCOVERY_RESPONSE", "Discovery response must contain at least one delta.");
    }
    const seenQuestions = new Set();
    const seenDeltaIds = new Set();
    for (const delta of discovery.deltas) {
      const question = questions.get(delta?.question_id);
      const deltaId = cleanText(delta?.delta_id);
      if (!question || seenQuestions.has(delta.question_id) || !deltaId || seenDeltaIds.has(deltaId) || delta.outline_node_id !== question.outline_node_id) {
        throw new WritebackError(400, "INVALID_DISCOVERY_DELTA", "Discovery response contains an unknown, duplicate, or mismatched question.");
      }
      try { validateDiscoveryDelta(delta, question); }
      catch (error) { throw new WritebackError(400, "INVALID_DISCOVERY_DELTA", error.message || "Discovery response delta is invalid."); }
      seenQuestions.add(delta.question_id);
      seenDeltaIds.add(deltaId);
    }
    const content = `${JSON.stringify(discovery, null, 2)}\n`;
    await atomicWrite(context.absoluteTargetPath, content);
    context.targetVersion = targetVersion(content);
    return {
      ok: true,
      kind: payload.kind,
      target_path: context.targetPath,
      target_version: context.targetVersion,
      next_command: `/sp.prd ${context.feature}`,
      authorization_effect: "none"
    };
  }

  if (payload?.kind !== "confirmation") {
    throw new WritebackError(400, "INVALID_CONFIRMATION_PACKAGE", "Expected a confirmation writeback.");
  }
  let merged;
  try {
    merged = mergeConfirmationParts(payload.parts, { ...context, reviewDataId: currentReviewDataId }, reviewData);
  } catch (error) {
    throw new WritebackError(400, "INVALID_CONFIRMATION_PACKAGE", error.message || "Invalid confirmation package.");
  }
  const content = confirmationMarkdown(merged, reviewData, context);
  await atomicWrite(context.absoluteTargetPath, content);
  context.targetVersion = targetVersion(content);
  const revisionCount = merged.records.filter((record) => record.revision_request).length;
  return {
    ok: true,
    kind: payload.kind,
    target_path: context.targetPath,
    target_version: context.targetVersion,
    next_command: `${{ flow: "/sp.flow", ui: "/sp.ui", outline: "/sp.prd" }[context.reviewType]} ${context.feature}`,
    review_data_id: currentReviewDataId,
    revision_request_count: revisionCount
  };
}

async function handleWriteback(request, response, context) {
  try {
    if (request.headers.origin !== context.origin) {
      throw new WritebackError(403, "FORBIDDEN_ORIGIN", "Forbidden origin.", { recoveryAction: "reload_review" });
    }
    if (request.headers["x-speccompass-writeback-token"] !== context.writebackToken) {
      throw new WritebackError(403, "INVALID_WRITEBACK_TOKEN", "Invalid writeback token.", { recoveryAction: "reload_review" });
    }
    if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      throw new WritebackError(415, "UNSUPPORTED_MEDIA_TYPE", "Writeback requires application/json.");
    }
    const declaredLength = Number(request.headers["content-length"] || 0);
    if (declaredLength > MAX_WRITEBACK_BYTES) {
      throw new WritebackError(413, "WRITEBACK_PAYLOAD_TOO_LARGE", "The writeback request is too large.", {
        allowFallback: true,
        recoveryAction: "download_fallback"
      });
    }
    const payload = await readJsonBody(request);
    sendJson(response, 200, await executeIdempotentWrite(payload, context));
  } catch (error) {
    if (!response.headersSent && !response.destroyed) sendWritebackError(response, error);
    else if (!response.destroyed) response.destroy();
  }
}

function createRequestHandler(context) {
  const { projectRoot, realProjectRoot, expectedHost } = context;
  return async (request, response) => {
    if (request.headers.host !== expectedHost) {
      sendText(response, 403, "Forbidden host.");
      return;
    }
    let pathname;
    try {
      const requestUrl = new URL(request.url || "/", `http://${expectedHost}`);
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      sendText(response, 400, "Invalid request path.");
      return;
    }
    if (pathname.includes("\0") || pathname.includes("\\")) {
      sendText(response, 403, "Forbidden path.");
      return;
    }

    if (pathname === WRITEBACK_CONFIG_PATH) {
      if (request.method !== "GET") {
        sendText(response, 405, "Method not allowed.", { Allow: "GET" });
        return;
      }
      context.targetVersion = await currentTargetVersion(context.absoluteTargetPath);
      sendJson(response, 200, {
        endpoint: WRITEBACK_PATH,
        token: context.writebackToken,
        review_type: context.reviewType,
        feature: context.feature,
        target_path: context.targetPath,
        target_version: context.targetVersion,
        request_timeout_ms: REQUEST_TIMEOUT_MS,
        minimum_node_major: MINIMUM_NODE_MAJOR
      });
      return;
    }
    if (pathname === WRITEBACK_PATH) {
      if (request.method !== "POST") {
        sendText(response, 405, "Method not allowed.", { Allow: "POST" });
        return;
      }
      await handleWriteback(request, response, context);
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendText(response, 405, "Method not allowed.", { Allow: "GET, HEAD" });
      return;
    }

    const absolutePath = resolve(projectRoot, `.${pathname}`);
    if (!isWithin(projectRoot, absolutePath)) {
      sendText(response, 403, "Forbidden path.");
      return;
    }

    try {
      const realPath = await realpath(absolutePath);
      if (!isWithin(realProjectRoot, realPath)) {
        sendText(response, 403, "Forbidden path.");
        return;
      }
      const details = await stat(realPath);
      if (!details.isFile()) {
        sendText(response, 404, "Not found.");
        return;
      }
      const body = await readFile(realPath);
      const contentType = MIME_TYPES.get(extname(realPath).toLowerCase()) || "application/octet-stream";
      response.writeHead(200, responseHeaders(contentType, body.length));
      response.end(request.method === "HEAD" ? undefined : body);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTDIR" || error?.code === "EACCES") {
        sendText(response, 404, "Not found.");
        return;
      }
      throw error;
    }
  };
}

function checkUrl(url) {
  return new Promise((resolveCheck, rejectCheck) => {
    const request = httpRequest(url, { method: "GET", headers: { Connection: "close" } }, (response) => {
      response.resume();
      response.once("end", () => {
        if (response.statusCode === 200) {
          resolveCheck();
        } else {
          rejectCheck(new Error(`Self-check returned HTTP ${response.statusCode} for ${url}`));
        }
      });
    });
    request.setTimeout(SELF_CHECK_TIMEOUT_MS, () => {
      request.destroy(new Error(`Self-check timed out after ${SELF_CHECK_TIMEOUT_MS}ms for ${url}`));
    });
    request.once("error", rejectCheck);
    request.end();
  });
}

function shutdown(exitCode, error = null) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (error) console.error(`Review server failed: ${error.message || error}`);

  const finish = () => process.exit(exitCode);
  if (server?.listening) {
    server.close(finish);
    setTimeout(finish, 2_000).unref();
  } else {
    finish();
  }
}

async function main() {
  requireSupportedNodeRuntime();
  const { reviewType, feature, port } = parseArguments(process.argv.slice(2));
  const launcherPath = await realpath(fileURLToPath(import.meta.url));
  const projectRoot = resolve(dirname(launcherPath), "../../..");
  const realProjectRoot = await realpath(projectRoot);
  const rendererPath = ".specify/review/renderer/speccompass-review-renderer.html";
  const dataPath = REVIEW_DATA_PATHS[reviewType](feature);
  const targetPath = WRITEBACK_PATHS[reviewType](feature);

  await Promise.all([
    requireRegularFile(projectRoot, realProjectRoot, rendererPath),
    requireRegularFile(projectRoot, realProjectRoot, dataPath)
  ]);

  server = createServer();
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = Math.min(REQUEST_TIMEOUT_MS, 15_000);
  server.keepAliveTimeout = 5_000;
  await new Promise((resolveListening, rejectListening) => {
    const onError = (error) => rejectListening(error);
    server.once("error", onError);
    server.listen({ host: LOOPBACK_HOST, port }, () => {
      server.off("error", onError);
      resolveListening();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not determine review server port.");
  const expectedHost = `${LOOPBACK_HOST}:${address.port}`;
  const origin = `http://${expectedHost}`;
  const writebackToken = randomBytes(32).toString("base64url");
  const absoluteDataPath = resolve(projectRoot, dataPath);
  const absoluteTargetPath = resolve(projectRoot, targetPath);
  const context = {
    projectRoot,
    realProjectRoot,
    expectedHost,
    origin,
    writebackToken,
    reviewType,
    feature,
    dataPath,
    targetPath,
    absoluteDataPath,
    absoluteTargetPath,
    targetVersion: await currentTargetVersion(absoluteTargetPath)
  };
  const requestHandler = createRequestHandler(context);
  server.on("request", (request, response) => {
    void requestHandler(request, response).catch((error) => {
      if (!response.headersSent) sendText(response, 500, "Internal server error.");
      else response.destroy();
      console.error(`Review request failed: ${error.message || error}`);
    });
  });

  const encodedFeature = encodeURIComponent(feature);
  const rendererUrl = `${origin}/${rendererPath}?${reviewType}=${encodedFeature}`;
  const dataUrl = `${origin}/${dataPath}`;
  await Promise.all([checkUrl(rendererUrl), checkUrl(dataUrl)]);

  console.log(`SPECCOMPASS_REVIEW_URL=${rendererUrl}`);
  console.log(`Review server is running on ${origin}. Press Ctrl+C to stop.`);
}

process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));
process.once("uncaughtException", (error) => shutdown(1, error));
process.once("unhandledRejection", (error) => shutdown(1, error));

main().catch((error) => shutdown(1, error));
