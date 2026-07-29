import { createHash } from "node:crypto";
import { lstat, open, readFile, readdir, realpath, stat } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import {
  computeProposalDigest,
  readJson,
  sha256,
  stableStringify
} from "./outline-boundaries-lib.mjs";
import {
  ARTIFACT_TYPES,
  exactObject,
  isRepositoryRef
} from "./outline-transition-workflow-lib.mjs";

export const PROPOSAL_INPUT_KEYS = [
  "schema_version", "base_baseline_id", "base_baseline_digest", "baseline_id",
  "created_at", "created_by", "decision_ref", "change_reason", "rollback_ref",
  "project_boundaries", "tombstones"
];

const PREVIEW_KEYS = [
  "schema_version", "proposal_id", "proposal_digest", "base_baseline_id",
  "base_baseline_digest", "generated_at", "change_class", "affected_feature_codes",
  "artifact_inventory_digest", "artifacts", "impact_preview_digest"
];
const DECISION_KEYS = [
  "schema_version", "decision", "proposal_id", "proposal_digest", "base_baseline_id",
  "base_baseline_digest", "impact_preview_digest", "initiated_by", "change_class",
  "affected_feature_codes", "reviewer_note", "confirmed_by", "source", "receipt",
  "decision_digest"
];
const WRITER_EVENT_KEYS = [
  "schema_version", "event_type", "writeback_request_id", "review_session_id",
  "review_data_id", "proposal_id", "proposal_digest", "base_baseline_id",
  "base_baseline_digest", "impact_preview_digest", "receipt_id", "decision",
  "decision_digest", "recorded_at"
];
const CONSUMPTION_KEYS = [
  "schema_version", "event_type", "receipt_id", "decision_digest", "proposal_id",
  "proposal_digest", "base_baseline_id", "base_baseline_digest",
  "impact_preview_digest", "transition_id", "change_class", "consumed_at"
];
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const CODE_PATTERN = /^(?:[0-9]{3,}|[0-9]{8}-[0-9]{6})$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const EXCLUDED_ARTIFACT_NAMES = new Set([
  "outline-boundaries.json", "outline-transition.jsonl", "outline-transition-inventory.json",
  "outline-transition-evidence.json", "outline-transition-validation-report.json",
  "outline-transition-rollback.json", "feature-code-ledger.json"
]);

function isTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validateStringArray(value, label, pattern = null) {
  if (!Array.isArray(value) || new Set(value).size !== value.length
    || value.some((item) => typeof item !== "string" || !item || (pattern && !pattern.test(item)))) {
    throw new Error(`${label} must contain unique valid strings.`);
  }
}

function exactObjectWithOptionalOperation(value, keys, label) {
  const normalized = { ...value };
  delete normalized.operation;
  exactObject(normalized, keys, label);
  if ("operation" in value && !["ADJUSTMENT", "ADOPTION"].includes(value.operation)) {
    throw new Error(`${label} operation is invalid.`);
  }
}

export function proposalFromInput(input) {
  exactObject(input, PROPOSAL_INPUT_KEYS, "outline-transition proposal input");
  if (input.schema_version !== 1 || !isTimestamp(input.created_at)) {
    throw new Error("Proposal input schema_version/created_at is invalid.");
  }
  if (!(input.base_baseline_id === null || (typeof input.base_baseline_id === "string" && input.base_baseline_id.trim()))
    || !(input.base_baseline_digest === null || DIGEST_PATTERN.test(input.base_baseline_digest || ""))
    || ((input.base_baseline_id === null) !== (input.base_baseline_digest === null))
    || ![input.baseline_id, input.created_by, input.change_reason].every((value) => typeof value === "string" && value.trim())) {
    throw new Error("Proposal input identity, optional base baseline, creator, and reason are required.");
  }
  if (!isRepositoryRef(input.decision_ref) || !isRepositoryRef(input.rollback_ref) || !Array.isArray(input.project_boundaries)
    || !input.project_boundaries.length || !Array.isArray(input.tombstones)) {
    throw new Error("Proposal input baseline, references, or boundary arrays are invalid.");
  }
  const proposal = {
    baseline_id: input.baseline_id,
    proposal_digest: "",
    base_baseline_id: input.base_baseline_id,
    base_baseline_digest: input.base_baseline_digest,
    created_at: input.created_at,
    created_by: input.created_by,
    decision_ref: input.decision_ref,
    change_reason: input.change_reason,
    project_boundaries: input.project_boundaries,
    tombstones: input.tombstones
  };
  proposal.proposal_digest = computeProposalDigest(proposal);
  return proposal;
}

function boundaryWithoutMetadata(boundary) {
  const { title: _title, order: _order, sibling_order: _siblingOrder, ...structural } = boundary;
  return structural;
}

export function classifyBoundaryChange(currentBaseline, proposal) {
  const currentByCode = new Map(currentBaseline.project_boundaries.map((item) => [item.feature_code, item]));
  const proposedByCode = new Map(proposal.project_boundaries.map((item) => [item.feature_code, item]));
  const allCodes = [...new Set([...currentByCode.keys(), ...proposedByCode.keys()])].sort();
  const affected = allCodes.filter((code) => !currentByCode.has(code) || !proposedByCode.has(code)
    || stableStringify(currentByCode.get(code)) !== stableStringify(proposedByCode.get(code)));
  if (!affected.length && stableStringify(currentBaseline.tombstones) === stableStringify(proposal.tombstones)) {
    return { change_class: "NONE", affected_feature_codes: [] };
  }
  const metadataOnly = currentByCode.size === proposedByCode.size
    && allCodes.every((code) => currentByCode.has(code) && proposedByCode.has(code)
      && stableStringify(boundaryWithoutMetadata(currentByCode.get(code)))
        === stableStringify(boundaryWithoutMetadata(proposedByCode.get(code))))
    && stableStringify(currentBaseline.tombstones) === stableStringify(proposal.tombstones);
  return {
    change_class: metadataOnly ? "METADATA" : "STRUCTURAL",
    affected_feature_codes: affected
  };
}

function classifyArtifact(path) {
  const normalized = path.split(sep).join("/");
  const name = basename(path);
  if (name === "prd.md") return "prd";
  if (name === "spec-outline.md") return "outline";
  if (name === "spec.md") return "spec";
  if (name === "plan.md") return "plan";
  if (name === "tasks.md") return "tasks";
  if (normalized.includes("/flows/")) return "flow";
  if (normalized.includes("/ui/")) return "ui";
  if (name === "trace-index.md") return "trace";
  if (name === "open-items.md") return "open_item";
  if (normalized.includes("/memory/")) return "memory";
  if (/(^|\/)(tests?|__tests__)(\/|$)/i.test(normalized) || /(?:^|[._-])test\./i.test(name)) return "test";
  return "implementation";
}

async function digestFile(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function walkArtifacts(directory, featureCode, repositoryRoot, artifacts) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name.startsWith(".outline-boundaries.json") || EXCLUDED_ARTIFACT_NAMES.has(entry.name)
      || entry.name === "boundary-adjustments" || entry.name === "review") continue;
    const path = resolve(directory, entry.name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`Symbolic links are not accepted in an impact inventory: ${path}`);
    if (info.isDirectory()) await walkArtifacts(path, featureCode, repositoryRoot, artifacts);
    else if (info.isFile()) {
      const artifactRef = relative(repositoryRoot, path).split(sep).join("/");
      if (!isRepositoryRef(artifactRef)) throw new Error(`Artifact is outside the repository root: ${path}`);
      artifacts.push({
        artifact_type: classifyArtifact(path),
        artifact_ref: artifactRef,
        source_digest: await digestFile(path),
        source_feature_code: featureCode
      });
    }
  }
}

export function repositoryRootForBoundaries(boundariesPath) {
  return dirname(dirname(dirname(resolve(boundariesPath))));
}

export async function scanBoundaryArtifacts(boundariesPath, document) {
  const resolvedBoundaries = resolve(boundariesPath);
  const specsRoot = dirname(dirname(resolvedBoundaries));
  const repositoryRoot = repositoryRootForBoundaries(resolvedBoundaries);
  const realRepositoryRoot = await realpath(repositoryRoot);
  const realSpecsRoot = await realpath(specsRoot);
  const specsRelative = relative(realRepositoryRoot, realSpecsRoot);
  if (!specsRelative || specsRelative === ".." || specsRelative.startsWith(`..${sep}`)) {
    throw new Error("Outline boundaries must be stored below the repository specs directory.");
  }
  const artifacts = [];
  for (const boundary of document.current_baseline.project_boundaries) {
    const featureDirectory = resolve(specsRoot, boundary.feature);
    const featureRelative = relative(realSpecsRoot, await realpath(featureDirectory));
    const info = await lstat(featureDirectory);
    if (!featureRelative || featureRelative === ".." || featureRelative.startsWith(`..${sep}`)
      || !info.isDirectory() || info.isSymbolicLink()) {
      throw new Error(`Feature directory is missing or unsafe: ${boundary.feature}`);
    }
    await walkArtifacts(featureDirectory, boundary.feature_code, repositoryRoot, artifacts);
  }
  artifacts.sort((left, right) => left.artifact_ref.localeCompare(right.artifact_ref)
    || left.artifact_type.localeCompare(right.artifact_type));
  const normalizedRefs = new Set();
  for (const artifact of artifacts) {
    if (!ARTIFACT_TYPES.has(artifact.artifact_type) || !DIGEST_PATTERN.test(artifact.source_digest)
      || !CODE_PATTERN.test(artifact.source_feature_code)) throw new Error(`Invalid scanned artifact: ${artifact.artifact_ref}`);
    const normalized = `${artifact.artifact_type}:${artifact.artifact_ref.normalize("NFC").toLowerCase()}`;
    if (normalizedRefs.has(normalized)) throw new Error(`Duplicate normalized artifact: ${artifact.artifact_ref}`);
    normalizedRefs.add(normalized);
  }
  return artifacts;
}

export function computeArtifactInventoryDigest(artifacts) {
  return sha256({ artifacts });
}

export function computeImpactPreviewDigest(preview) {
  const { impact_preview_digest: _ignored, ...payload } = preview;
  return sha256(payload);
}

export function buildImpactPreview(document, proposal, artifacts, generatedAt = new Date().toISOString()) {
  const classification = classifyBoundaryChange(document.current_baseline, proposal);
  const preview = {
    schema_version: 1,
    proposal_id: proposal.baseline_id,
    proposal_digest: proposal.proposal_digest,
    base_baseline_id: proposal.base_baseline_id,
    base_baseline_digest: proposal.base_baseline_digest,
    generated_at: generatedAt,
    change_class: classification.change_class,
    affected_feature_codes: classification.affected_feature_codes,
    artifact_inventory_digest: computeArtifactInventoryDigest(artifacts),
    artifacts,
    impact_preview_digest: ""
  };
  preview.impact_preview_digest = computeImpactPreviewDigest(preview);
  return preview;
}

export function buildAdoptionImpactPreview(proposal, artifacts, generatedAt = new Date().toISOString()) {
  const preview = {
    schema_version: 1,
    operation: "ADOPTION",
    proposal_id: proposal.baseline_id,
    proposal_digest: proposal.proposal_digest,
    base_baseline_id: null,
    base_baseline_digest: null,
    generated_at: generatedAt,
    change_class: "ADOPTION",
    affected_feature_codes: proposal.project_boundaries.map((boundary) => boundary.feature_code).sort(),
    artifact_inventory_digest: computeArtifactInventoryDigest(artifacts),
    artifacts,
    impact_preview_digest: ""
  };
  preview.impact_preview_digest = computeImpactPreviewDigest(preview);
  return preview;
}

export function validateImpactPreview(preview) {
  exactObjectWithOptionalOperation(preview, PREVIEW_KEYS, "outline adjustment impact preview");
  const operation = preview.operation || "ADJUSTMENT";
  const adoption = operation === "ADOPTION";
  if (preview.schema_version !== 1 || !["ADJUSTMENT", "ADOPTION"].includes(operation)
    || !SAFE_ID_PATTERN.test(preview.proposal_id || "") || !DIGEST_PATTERN.test(preview.proposal_digest || "")
    || !(adoption
      ? preview.base_baseline_id === null && preview.base_baseline_digest === null && preview.change_class === "ADOPTION"
      : typeof preview.base_baseline_id === "string" && preview.base_baseline_id
        && DIGEST_PATTERN.test(preview.base_baseline_digest || "") && preview.change_class !== "ADOPTION")
    || !isTimestamp(preview.generated_at) || !new Set(["NONE", "METADATA", "STRUCTURAL", "ADOPTION"]).has(preview.change_class)
    || !DIGEST_PATTERN.test(preview.artifact_inventory_digest || "") || !Array.isArray(preview.artifacts)) {
    throw new Error("Outline adjustment impact preview header is invalid.");
  }
  validateStringArray(preview.affected_feature_codes, "impact preview affected_feature_codes", CODE_PATTERN);
  const refs = new Set();
  for (const [index, artifact] of preview.artifacts.entries()) {
    exactObject(artifact, ["artifact_type", "artifact_ref", "source_digest", "source_feature_code"], `impact preview artifacts[${index}]`);
    if (!ARTIFACT_TYPES.has(artifact.artifact_type) || !isRepositoryRef(artifact.artifact_ref)
      || !DIGEST_PATTERN.test(artifact.source_digest || "") || !CODE_PATTERN.test(artifact.source_feature_code || "")) {
      throw new Error(`impact preview artifacts[${index}] is invalid.`);
    }
    const key = `${artifact.artifact_type}:${artifact.artifact_ref.normalize("NFC").toLowerCase()}`;
    if (refs.has(key)) throw new Error(`Impact preview contains a duplicate artifact: ${artifact.artifact_ref}`);
    refs.add(key);
  }
  if (computeArtifactInventoryDigest(preview.artifacts) !== preview.artifact_inventory_digest) {
    throw new Error("Impact preview artifact inventory digest does not match canonical content.");
  }
  if (computeImpactPreviewDigest(preview) !== preview.impact_preview_digest) {
    throw new Error("Impact preview digest does not match canonical content.");
  }
}

export function computeDecisionDigest(decision) {
  const { decision_digest: _ignored, ...payload } = decision;
  return sha256(payload);
}

export function validateBoundaryDecision(decision) {
  exactObjectWithOptionalOperation(decision, DECISION_KEYS, "outline boundary decision");
  const operation = decision.operation || "ADJUSTMENT";
  const adoption = operation === "ADOPTION";
  if (decision.schema_version !== 1 || !new Set(["CONFIRMED", "REJECTED", "NEEDS_REVISION"]).has(decision.decision)
    || !SAFE_ID_PATTERN.test(decision.proposal_id || "") || !DIGEST_PATTERN.test(decision.proposal_digest || "")
    || !(adoption ? decision.base_baseline_id === null && decision.base_baseline_digest === null : typeof decision.base_baseline_id === "string" && decision.base_baseline_id && DIGEST_PATTERN.test(decision.base_baseline_digest || ""))
    || !DIGEST_PATTERN.test(decision.impact_preview_digest || "")
    || !new Set(["model", "user"]).has(decision.initiated_by)
    || !new Set(["METADATA", "STRUCTURAL", "ADOPTION"]).has(decision.change_class)
    || (adoption ? decision.change_class !== "ADOPTION" : decision.change_class === "ADOPTION")
    || typeof decision.reviewer_note !== "string") throw new Error("Outline boundary decision header is invalid.");
  validateStringArray(decision.affected_feature_codes, "decision affected_feature_codes", CODE_PATTERN);
  exactObject(decision.confirmed_by, ["type", "display_name"], "decision.confirmed_by");
  if (decision.confirmed_by.type !== "human" || typeof decision.confirmed_by.display_name !== "string" || !decision.confirmed_by.display_name) {
    throw new Error("Outline boundary decision must identify a human reviewer.");
  }
  exactObject(decision.source, ["kind", "writeback_request_id", "review_session_id", "review_data_id", "recorded_at"], "decision.source");
  if (decision.source.kind !== "speccompass_loopback_writer" || !isTimestamp(decision.source.recorded_at)
    || ![decision.source.writeback_request_id, decision.source.review_session_id, decision.source.review_data_id]
      .every((value) => typeof value === "string" && value)) throw new Error("Decision writer source is invalid.");
  if (Date.parse(decision.source.recorded_at) > Date.now() + 300000) {
    throw new Error("Decision writer timestamp is unreasonably far in the future.");
  }
  exactObject(decision.receipt, ["receipt_id", "status"], "decision.receipt");
  if (!DIGEST_PATTERN.test(decision.receipt.receipt_id || "") || decision.receipt.status !== "ISSUED_ONCE") {
    throw new Error("Decision receipt is invalid.");
  }
  if (computeDecisionDigest(decision) !== decision.decision_digest) throw new Error("Decision digest does not match canonical content.");
}

export function validateWriterEvent(event) {
  exactObjectWithOptionalOperation(event, WRITER_EVENT_KEYS, "outline boundary writeback ledger event");
  const operation = event.operation || "ADJUSTMENT";
  if (event.schema_version !== 1 || event.event_type !== "HUMAN_DECISION_RECORDED"
    || !["ADJUSTMENT", "ADOPTION"].includes(operation)
    || ![event.writeback_request_id, event.review_session_id, event.review_data_id, event.proposal_id]
      .every((value) => typeof value === "string" && value)
    || !(operation === "ADOPTION" ? event.base_baseline_id === null : typeof event.base_baseline_id === "string" && event.base_baseline_id)
    || !(operation === "ADOPTION" ? event.base_baseline_digest === null : DIGEST_PATTERN.test(event.base_baseline_digest || ""))
    || ![event.proposal_digest, event.impact_preview_digest, event.receipt_id, event.decision_digest]
      .every((value) => DIGEST_PATTERN.test(value || ""))
    || !new Set(["CONFIRMED", "REJECTED", "NEEDS_REVISION"]).has(event.decision)
    || !isTimestamp(event.recorded_at)) throw new Error("Outline boundary writeback ledger event is invalid.");
}

export function validateConsumptionEvent(event) {
  exactObjectWithOptionalOperation(event, CONSUMPTION_KEYS, "outline boundary decision consumption event");
  const operation = event.operation || "ADJUSTMENT";
  if (event.schema_version !== 1 || event.event_type !== "DECISION_CONSUMED"
    || !["ADJUSTMENT", "ADOPTION"].includes(operation)
    || ![event.proposal_id, event.transition_id].every((value) => typeof value === "string" && value)
    || !(operation === "ADOPTION" ? event.base_baseline_id === null : typeof event.base_baseline_id === "string" && event.base_baseline_id)
    || !(operation === "ADOPTION" ? event.base_baseline_digest === null : DIGEST_PATTERN.test(event.base_baseline_digest || ""))
    || ![event.receipt_id, event.decision_digest, event.proposal_digest, event.impact_preview_digest]
      .every((value) => DIGEST_PATTERN.test(value || ""))
    || !new Set(["METADATA", "STRUCTURAL", "ADOPTION"]).has(event.change_class)
    || (operation === "ADOPTION" ? event.change_class !== "ADOPTION" : event.change_class === "ADOPTION")
    || !isTimestamp(event.consumed_at)) {
    throw new Error("Outline boundary decision consumption event is invalid.");
  }
}

export async function readJsonLines(path, validator) {
  try {
    const source = await readFile(path, "utf8");
    const values = source.split(/\r?\n/).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line); }
      catch { throw new Error(`Invalid JSONL at ${path}:${index + 1}.`); }
    });
    values.forEach(validator);
    return values;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function appendJsonLine(path, value, validator) {
  validator(value);
  const target = resolve(path);
  let mode = 0o600;
  try { mode = (await stat(target)).mode & 0o777; }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const handle = await open(target, "a", mode);
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, "utf8");
    await handle.chmod(mode);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export function adjustmentPaths(boundariesPath, proposalId) {
  if (!SAFE_ID_PATTERN.test(proposalId || "")) throw new Error("proposal_id is unsafe.");
  const rootDirectory = dirname(resolve(boundariesPath));
  const rootRef = relative(repositoryRootForBoundaries(boundariesPath), rootDirectory).split(sep).join("/");
  const draftRef = `${rootRef}/boundary-adjustments/drafts/${proposalId}`;
  return {
    proposalPath: join(rootDirectory, "boundary-adjustments", "drafts", proposalId, "proposal.json"),
    previewPath: join(rootDirectory, "boundary-adjustments", "drafts", proposalId, "impact-preview.json"),
    decisionPath: join(rootDirectory, "boundary-adjustments", "drafts", proposalId, "decision.json"),
    writerLedgerPath: join(rootDirectory, "boundary-adjustments", "writeback-ledger.jsonl"),
    consumedLedgerPath: join(rootDirectory, "boundary-adjustments", "consumed-decisions.jsonl"),
    decisionRef: `${draftRef}/decision.json`
  };
}

export async function assertWriterAuthorization(decisionPath, writerLedgerPath, expected) {
  const decision = await readJson(decisionPath);
  validateBoundaryDecision(decision);
  for (const field of ["operation", "proposal_id", "proposal_digest", "base_baseline_id", "base_baseline_digest", "impact_preview_digest", "change_class"]) {
    const actual = field === "operation" ? (decision.operation || "ADJUSTMENT") : decision[field];
    const expectedValue = field === "operation" ? (expected.operation || "ADJUSTMENT") : expected[field];
    if (actual !== expectedValue) throw new Error(`Decision ${field} does not match the reviewed proposal.`);
  }
  if (stableStringify(decision.affected_feature_codes) !== stableStringify(expected.affected_feature_codes)) {
    throw new Error("Decision affected_feature_codes do not match the impact preview.");
  }
  const events = await readJsonLines(writerLedgerPath, validateWriterEvent);
  const matches = events.filter((event) => event.receipt_id === decision.receipt.receipt_id);
  if (matches.length !== 1) throw new Error("Decision receipt must have exactly one matching writer-ledger event.");
  const event = matches[0];
  for (const [eventField, decisionValue] of Object.entries({
    writeback_request_id: decision.source.writeback_request_id,
    review_session_id: decision.source.review_session_id,
    review_data_id: decision.source.review_data_id,
    proposal_id: decision.proposal_id,
    proposal_digest: decision.proposal_digest,
    base_baseline_id: decision.base_baseline_id,
    base_baseline_digest: decision.base_baseline_digest,
    impact_preview_digest: decision.impact_preview_digest,
    decision: decision.decision,
    decision_digest: decision.decision_digest,
    recorded_at: decision.source.recorded_at
  })) {
    if (event[eventField] !== decisionValue) throw new Error(`Writer ledger ${eventField} does not match decision.json.`);
  }
  return decision;
}

export function sameFilePath(left, right) {
  const normalize = (value) => resolve(value).normalize("NFC").toLowerCase();
  return normalize(left) === normalize(right);
}
