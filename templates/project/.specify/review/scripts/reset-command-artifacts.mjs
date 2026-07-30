#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  access, copyFile, lstat, mkdir, readFile, readdir, rename, rmdir, unlink, writeFile
} from "node:fs/promises";
import {
  basename, dirname, relative, resolve, sep
} from "node:path";

const COMMANDS = new Set(["prd", "flow", "ui"]);
const MODES = new Set(["clear", "preserve-confirmed"]);
const SAFE_FEATURE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DIGEST = /^[a-f0-9]{64}$/;
const PRESERVED_DIRECTORY = "regeneration-preserved";
const RESET_DIRECTORY = "regeneration-resets";
const TRANSIENT_FILE_CODES = new Set(["EACCES", "EBUSY", "EEXIST", "EPERM"]);
const RETRY_DELAYS_MS = [25, 75, 150, 300];

function usage() {
  console.error(
    "Usage:\n"
    + "  reset-command-artifacts.mjs inspect <prd|flow|ui> specs/<feature>\n"
    + "  reset-command-artifacts.mjs apply <prd|flow|ui> specs/<feature> --mode <clear|preserve-confirmed> --inventory-digest <sha256> [--ack-confirmed]"
  );
}

function parseOptions(values) {
  const options = { positional: [], mode: null, inventoryDigest: null, ackConfirmed: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--mode") options.mode = values[++index] || null;
    else if (value === "--inventory-digest") options.inventoryDigest = values[++index] || null;
    else if (value === "--ack-confirmed") options.ackConfirmed = true;
    else options.positional.push(value);
  }
  return options;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : canonical(value)).digest("hex");
}

async function exists(path) {
  try { await access(path); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function requireRegularFile(path, label) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.nlink > 1) {
    throw new Error(`${label} must be a regular, non-linked file: ${path}`);
  }
  return info;
}

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function withFileRetry(operation) {
  for (let attempt = 0; ; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      if (!TRANSIENT_FILE_CODES.has(error.code) || attempt >= RETRY_DELAYS_MS.length) throw error;
      await delay(RETRY_DELAYS_MS[attempt]);
    }
  }
}

async function ensureSafeDirectory(featureRoot, target) {
  const relativeTarget = relative(featureRoot, target);
  if (!relativeTarget || relativeTarget === ".." || relativeTarget.startsWith(`..${sep}`)) {
    throw new Error("Reset history directory must remain inside the feature root.");
  }
  let current = featureRoot;
  for (const part of relativeTarget.split(sep)) {
    current = resolve(current, part);
    try { await mkdir(current); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error(`Reset history path must be a real directory: ${current}`);
    }
  }
}

function repositoryRef(repositoryRoot, path) {
  const ref = relative(repositoryRoot, path).split(sep).join("/");
  if (!ref || ref === ".." || ref.startsWith("../") || ref.startsWith("/")) {
    throw new Error(`Generated artifact resolves outside the repository: ${path}`);
  }
  return ref;
}

async function validateFeatureRoot(pathArgument) {
  const featureRoot = resolve(pathArgument);
  const specsRoot = dirname(featureRoot);
  const repositoryRoot = dirname(specsRoot);
  const feature = basename(featureRoot);
  if (basename(specsRoot) !== "specs" || !SAFE_FEATURE.test(feature)) {
    throw new Error("Feature path must be a direct safe child of specs/.");
  }
  const info = await lstat(featureRoot);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Feature root must be a real directory.");
  return { repositoryRoot, featureRoot, feature };
}

function isHiddenRelative(relativePath) {
  return relativePath.split("/").some((part) => part.startsWith("."));
}

function isPrdOwned(relativePath) {
  if (relativePath === "spec-outline.md") return true;
  if (!relativePath.startsWith("prd/review/")) return false;
  if (relativePath.startsWith("prd/review/history/outline-draft-resets/")) return false;
  const name = basename(relativePath);
  if (name === "outline-draft-reset.json" || name === "outline-draft-reset-plan.json") return false;
  return name.startsWith("outline-");
}

function isCommandOwned(command, relativePath) {
  if (isHiddenRelative(relativePath)) return false;
  if (relativePath.includes(`/review/history/${PRESERVED_DIRECTORY}/`)
    || relativePath.includes(`/review/history/${RESET_DIRECTORY}/`)) return false;
  if (command === "prd") return isPrdOwned(relativePath);
  if (command === "flow") return relativePath.startsWith("flows/");
  return relativePath.startsWith("ui/");
}

async function walk(directory, visitor, { missing = false } = {}) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if (missing && error.code === "ENOENT") return;
    throw error;
  }
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`Symbolic links are not allowed in generated command output: ${path}`);
    if (info.isDirectory()) await walk(path, visitor);
    else if (info.isFile()) {
      if (info.nlink > 1) throw new Error(`Hard-linked generated output is not safe to reset: ${path}`);
      await visitor(path);
    }
  }
}

function confirmationStatus(path, content) {
  const name = basename(path);
  const text = content.toString("utf8");
  if (name.endsWith("-confirmation.md")) {
    const status = text.match(/^human_confirmation:\s*([A-Z_]+)/m)?.[1]
      || text.match(/^batch_review_status:\s*([A-Z_]+)/m)?.[1]
      || null;
    const hasHumanRecord = /^document_type:\s*sp_human_confirmation\s*$/m.test(text)
      && (/^confirmed_by:\s*$/m.test(text) || /^decision_records:\s*$/m.test(text));
    if (hasHumanRecord || status === "CONFIRMED" || status === "SCOPED_CONFIRMATION") {
      return status || "RECORDED";
    }
  }
  if (name.endsWith("-review-batch.md")
    && /\|\s*(?:Batch Review Status|审核状态)\s*\|\s*(?:`)?(?:CONFIRMED|SCOPED_CONFIRMATION)(?:`)?\s*\|/i.test(text)) {
    return "CONFIRMED_BATCH_RECORD";
  }
  if (name === "decision.json") {
    try {
      const value = JSON.parse(text);
      if (value?.confirmed_by?.type === "human" || value?.source?.kind === "speccompass_loopback_writer") {
        return value.decision || "RECORDED";
      }
    } catch {
      // Invalid JSON remains an owned artifact, but cannot be trusted as confirmation evidence.
    }
  }
  if (name.startsWith("outline-discovery-response-") && name.endsWith(".json")) {
    return "RECORDED_HUMAN_INPUT";
  }
  if (name === "outline-intent-ledger.json") {
    try {
      const value = JSON.parse(text);
      const records = Array.isArray(value) ? value : value?.events;
      if (Array.isArray(records) && records.length) return "RECORDED_HUMAN_INPUT";
    } catch {
      // Invalid ledgers are cleared as generated data unless another formal record protects the run.
    }
  }
  return null;
}

async function inspect(command, pathArgument) {
  const context = await validateFeatureRoot(pathArgument);
  const candidates = [];
  const roots = command === "prd"
    ? [resolve(context.featureRoot, "spec-outline.md"), resolve(context.featureRoot, "prd", "review")]
    : [resolve(context.featureRoot, command === "flow" ? "flows" : "ui")];

  for (const root of roots) {
    if (!await exists(root)) continue;
    const info = await lstat(root);
    if (info.isSymbolicLink()) throw new Error(`Generated output root must not be a symbolic link: ${root}`);
    if (info.isFile()) candidates.push(root);
    else await walk(root, async (path) => candidates.push(path));
  }

  const artifacts = [];
  const confirmedRecords = [];
  for (const path of [...new Set(candidates)].sort()) {
    const relativePath = relative(context.featureRoot, path).split(sep).join("/");
    if (!isCommandOwned(command, relativePath)) continue;
    const content = await readFile(path);
    const record = {
      ref: repositoryRef(context.repositoryRoot, path),
      digest: createHash("sha256").update(content).digest("hex"),
      size: content.length
    };
    artifacts.push(record);
    const status = confirmationStatus(path, content);
    if (status) confirmedRecords.push({ ref: record.ref, digest: record.digest, status });
  }
  artifacts.sort((left, right) => left.ref.localeCompare(right.ref, "en"));
  confirmedRecords.sort((left, right) => left.ref.localeCompare(right.ref, "en"));
  const inventoryDigest = sha256({ command, feature: context.feature, artifacts });
  let state = "NO_GENERATED_ARTIFACTS";
  if (artifacts.length && confirmedRecords.length) state = "CONFIRMED_RECORDS_REQUIRE_CHOICE";
  else if (artifacts.length) state = "CLEAR_AND_REGENERATE";
  return {
    schema: "speccompass.command-artifact-reset.v1",
    operation: "INSPECT",
    command,
    feature: context.feature,
    state,
    inventory_digest: inventoryDigest,
    generated_artifacts: artifacts,
    confirmed_records: confirmedRecords,
    default_action: state === "CLEAR_AND_REGENERATE" ? "clear" : null,
    confirmation_choices: state === "CONFIRMED_RECORDS_REQUIRE_CHOICE" ? [
      {
        id: "PRESERVE_FOR_REREVIEW",
        mode: "preserve-confirmed",
        meaning: "Archive the confirmed records as non-authoritative review input, clear active generated output, and require fresh confirmation."
      },
      {
        id: "CLEAR_ALL",
        mode: "clear",
        meaning: "Clear all prior command-generated output, including confirmed records, and regenerate without citing it."
      }
    ] : []
  };
}

async function preserveConfirmations(inspection, context) {
  if (!inspection.confirmed_records.length) return null;
  const reviewRoot = inspection.command === "prd"
    ? resolve(context.featureRoot, "prd", "review")
    : resolve(context.featureRoot, inspection.command === "flow" ? "flows" : "ui", "review");
  const archiveRoot = resolve(
    reviewRoot, "history", PRESERVED_DIRECTORY, inspection.inventory_digest.slice(0, 16)
  );
  await ensureSafeDirectory(context.featureRoot, archiveRoot);
  const manifest = [];
  for (const record of inspection.confirmed_records) {
    const source = resolve(context.repositoryRoot, record.ref);
    const targetName = `${createHash("sha256").update(record.ref).digest("hex").slice(0, 10)}-${basename(record.ref)}`;
    const target = resolve(archiveRoot, targetName);
    if (await exists(target)) {
      const existingDigest = createHash("sha256").update(await readFile(target)).digest("hex");
      if (existingDigest !== record.digest) throw new Error(`Preserved confirmation collision: ${target}`);
    } else {
      await withFileRetry(() => copyFile(source, target, 0));
    }
    manifest.push({ source_ref: record.ref, source_digest: record.digest, archived_ref: repositoryRef(context.repositoryRoot, target), status: record.status });
  }
  const manifestPath = resolve(archiveRoot, "preserved-confirmations.json");
  const manifestContent = `${JSON.stringify({
    schema: "speccompass.preserved-confirmations.v1",
    command: inspection.command,
    feature: inspection.feature,
    source_inventory_digest: inspection.inventory_digest,
    authority: "NON_AUTHORITATIVE_REREVIEW_INPUT",
    records: manifest
  }, null, 2)}\n`;
  if (await exists(manifestPath)) {
    if ((await readFile(manifestPath, "utf8")) !== manifestContent) throw new Error("Preserved confirmation manifest collision.");
  } else {
    await writeFile(manifestPath, manifestContent, { flag: "wx" });
  }
  return repositoryRef(context.repositoryRoot, manifestPath);
}

function reviewRootFor(command, featureRoot) {
  if (command === "prd") return resolve(featureRoot, "prd", "review");
  return resolve(featureRoot, command === "flow" ? "flows" : "ui", "review");
}

function recoveryEntryRef(context, recoveryRoot, artifact) {
  const name = `${createHash("sha256").update(artifact.ref).digest("hex").slice(0, 16)}-${basename(artifact.ref)}`;
  return repositoryRef(context.repositoryRoot, resolve(recoveryRoot, "files", name));
}

async function readJson(path, label) {
  let value;
  try {
    await requireRegularFile(path, label);
    value = JSON.parse(await readFile(path, "utf8"));
  }
  catch (error) { throw new Error(`${label} is unreadable: ${error.message}`); }
  return value;
}

function validateRecoveryPlan(plan, command, context, inventoryDigest, resetRoot) {
  const feature = context.feature;
  const reviewSegment = command === "prd" ? "prd/review" : command === "flow" ? "flows/review" : "ui/review";
  const recoveryPrefix = `specs/${feature}/${reviewSegment}/history/${RESET_DIRECTORY}/${inventoryDigest}/files/`;
  const artifacts = Array.isArray(plan?.artifacts) ? plan.artifacts : [];
  const inventoryArtifacts = artifacts.map(({ ref, digest, size }) => ({ ref, digest, size }));
  const artifactByRef = new Map(artifacts.map((artifact) => [artifact.ref, artifact]));
  const validArtifactPath = (artifact) => {
    if (typeof artifact.ref !== "string" || artifact.ref.includes("\\")) return false;
    const resolved = resolve(context.repositoryRoot, artifact.ref);
    let normalizedRef;
    try { normalizedRef = repositoryRef(context.repositoryRoot, resolved); }
    catch { return false; }
    if (normalizedRef !== artifact.ref) return false;
    const featureRelative = relative(context.featureRoot, resolved).split(sep).join("/");
    return featureRelative && !featureRelative.startsWith("../")
      && isCommandOwned(command, featureRelative)
      && artifact.recovery_ref === recoveryEntryRef(context, resetRoot, artifact);
  };
  if (plan?.schema !== "speccompass.command-artifact-reset-plan.v1"
    || plan.command !== command || plan.feature !== feature
    || plan.source_inventory_digest !== inventoryDigest
    || !MODES.has(plan.mode) || !Array.isArray(plan.artifacts)
    || !Array.isArray(plan.confirmed_records)
    || sha256({ command, feature, artifacts: inventoryArtifacts }) !== inventoryDigest
    || plan.artifacts.some((artifact) => !validArtifactPath(artifact) || !DIGEST.test(artifact.digest || "")
      || !artifact.recovery_ref?.startsWith(recoveryPrefix)
      || !Number.isInteger(artifact.size) || artifact.size < 0)
    || plan.confirmed_records.some((record) => !record.ref || !DIGEST.test(record.digest || "") || !record.status
      || artifactByRef.get(record.ref)?.digest !== record.digest)) {
    throw new Error("Command artifact reset recovery plan is invalid or belongs to another run.");
  }
  if (new Set(plan.artifacts.map((artifact) => artifact.ref)).size !== plan.artifacts.length
    || new Set(plan.artifacts.map((artifact) => artifact.recovery_ref)).size !== plan.artifacts.length) {
    throw new Error("Command artifact reset recovery plan contains duplicate paths.");
  }
}

async function validateRecoverySnapshot(plan, context) {
  const confirmedRecords = [];
  for (const artifact of plan.artifacts) {
    const activePath = resolve(context.repositoryRoot, artifact.ref);
    const recoveryPath = resolve(context.repositoryRoot, artifact.recovery_ref);
    const activeExists = await exists(activePath);
    const recoveryExists = await exists(recoveryPath);
    if (activeExists === recoveryExists) {
      throw new Error(`${activeExists ? "Both active and recovery copies" : "Neither active nor recovery copy"} exists for ${artifact.ref}.`);
    }
    const currentPath = activeExists ? activePath : recoveryPath;
    await requireRegularFile(currentPath, "Generated artifact during reset");
    const content = await readFile(currentPath);
    const currentDigest = createHash("sha256").update(content).digest("hex");
    if (currentDigest !== artifact.digest || content.length !== artifact.size) {
      throw new Error(`Generated artifact changed during reset: ${artifact.ref}`);
    }
    const status = confirmationStatus(activePath, content);
    if (status) confirmedRecords.push({ ref: artifact.ref, digest: artifact.digest, status });
  }
  confirmedRecords.sort((left, right) => left.ref.localeCompare(right.ref, "en"));
  if (canonical(confirmedRecords) !== canonical(plan.confirmed_records)) {
    throw new Error("Recorded human-input inventory no longer matches the recovery plan.");
  }
}

async function writeExclusiveJson(path, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await withFileRetry(() => writeFile(path, content, { flag: "wx" }));
}

async function cleanupRecoveryFiles(plan, context) {
  for (const artifact of plan.artifacts) {
    const recoveryPath = resolve(context.repositoryRoot, artifact.recovery_ref);
    try {
      await requireRegularFile(recoveryPath, "Command artifact recovery file");
      await withFileRetry(() => unlink(recoveryPath));
    }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  await removeEmptyParents(
    plan.artifacts.map((artifact) => resolve(context.repositoryRoot, artifact.recovery_ref)),
    context.featureRoot
  );
}

async function removeEmptyParents(paths, featureRoot) {
  const directories = new Set();
  for (const path of paths) {
    let current = dirname(path);
    while (current !== featureRoot && current.startsWith(`${featureRoot}${sep}`)) {
      directories.add(current);
      current = dirname(current);
    }
  }
  for (const directory of [...directories].sort((left, right) => right.length - left.length)) {
    try { await rmdir(directory); }
    catch (error) { if (!new Set(["ENOENT", "ENOTEMPTY", "EEXIST"]).has(error.code)) throw error; }
  }
}

async function applyReset(command, pathArgument, mode, inventoryDigest, ackConfirmed) {
  if (!MODES.has(mode) || !DIGEST.test(inventoryDigest || "")) throw new Error("Reset mode or inventory digest is invalid.");
  const context = await validateFeatureRoot(pathArgument);
  const resetRoot = resolve(reviewRootFor(command, context.featureRoot), "history", RESET_DIRECTORY, inventoryDigest);
  const planPath = resolve(resetRoot, "reset-plan.json");
  const receiptPath = resolve(resetRoot, "reset-receipt.json");
  await ensureSafeDirectory(context.featureRoot, resolve(resetRoot, "files"));

  if (await exists(receiptPath)) {
    const receipt = await readJson(receiptPath, "Command artifact reset receipt");
    if (receipt?.schema !== "speccompass.command-artifact-reset-receipt.v1"
      || receipt.command !== command || receipt.feature !== context.feature
      || receipt.source_inventory_digest !== inventoryDigest || receipt.mode !== mode) {
      throw new Error("Command artifact reset receipt does not match this invocation.");
    }
    const completedPlan = await readJson(planPath, "Command artifact reset recovery plan");
    validateRecoveryPlan(completedPlan, command, context, inventoryDigest, resetRoot);
    await cleanupRecoveryFiles(completedPlan, context);
    return receipt;
  }

  let plan;
  if (await exists(planPath)) {
    plan = await readJson(planPath, "Command artifact reset recovery plan");
    validateRecoveryPlan(plan, command, context, inventoryDigest, resetRoot);
    if (plan.mode !== mode) throw new Error("An interrupted reset must resume with its original mode.");
  } else {
    const inspection = await inspect(command, pathArgument);
    if (inspection.inventory_digest !== inventoryDigest) {
      throw new Error("Generated artifacts changed after inspection; inspect again before clearing them.");
    }
    if (inspection.confirmed_records.length && mode === "clear" && !ackConfirmed) {
      throw new Error("Confirmed records exist; clear mode requires the user's explicit --ack-confirmed choice.");
    }
    plan = {
      schema: "speccompass.command-artifact-reset-plan.v1",
      command,
      feature: context.feature,
      mode,
      source_inventory_digest: inspection.inventory_digest,
      confirmed_records: inspection.confirmed_records,
      artifacts: inspection.generated_artifacts.map((artifact) => ({
        ...artifact,
        recovery_ref: recoveryEntryRef(context, resetRoot, artifact)
      }))
    };
    validateRecoveryPlan(plan, command, context, inventoryDigest, resetRoot);
    await writeExclusiveJson(planPath, plan);
  }

  await validateRecoverySnapshot(plan, context);

  const inspectionForPreservation = {
    command,
    feature: context.feature,
    inventory_digest: inventoryDigest,
    confirmed_records: plan.confirmed_records
  };
  const preservedManifest = mode === "preserve-confirmed"
    ? await preserveConfirmations(inspectionForPreservation, context)
    : null;
  const cleared = [];
  let movedThisRun = 0;
  for (const artifact of plan.artifacts) {
    const path = resolve(context.repositoryRoot, artifact.ref);
    const recoveryPath = resolve(context.repositoryRoot, artifact.recovery_ref);
    const sourceExists = await exists(path);
    const recoveryExists = await exists(recoveryPath);
    if (sourceExists && recoveryExists) throw new Error(`Both active and recovery copies exist for ${artifact.ref}.`);
    if (!sourceExists && !recoveryExists) throw new Error(`Neither active nor recovery copy exists for ${artifact.ref}.`);
    const currentPath = sourceExists ? path : recoveryPath;
    await requireRegularFile(currentPath, "Generated artifact during reset");
    const content = await readFile(currentPath);
    const liveDigest = createHash("sha256").update(content).digest("hex");
    if (liveDigest !== artifact.digest || content.length !== artifact.size) {
      throw new Error(`Generated artifact changed during reset: ${artifact.ref}`);
    }
    if (sourceExists) {
      await withFileRetry(() => rename(path, recoveryPath));
      movedThisRun += 1;
    }
    cleared.push(artifact.ref);
    if (process.env.SPECCOMPASS_FAULT_AFTER_COMMAND_ARTIFACT_MOVE === String(movedThisRun)) {
      throw new Error("Injected failure after command artifact move.");
    }
  }
  await removeEmptyParents(cleared.map((ref) => resolve(context.repositoryRoot, ref)), context.featureRoot);
  const receipt = {
    schema: "speccompass.command-artifact-reset-receipt.v1",
    operation: "APPLY",
    command,
    feature: context.feature,
    state: "READY_TO_REGENERATE",
    mode,
    source_inventory_digest: inventoryDigest,
    cleared_artifacts: cleared,
    preserved_confirmation_manifest: preservedManifest,
    prior_confirmations_authoritative: false,
    recovery_plan: repositoryRef(context.repositoryRoot, planPath)
  };
  await writeExclusiveJson(receiptPath, receipt);
  await cleanupRecoveryFiles(plan, context);
  return receipt;
}

const options = parseOptions(process.argv.slice(2));
const [operation, command, featurePath] = options.positional;
if (!new Set(["inspect", "apply"]).has(operation) || !COMMANDS.has(command) || !featurePath
  || (operation === "inspect" && (options.mode || options.inventoryDigest || options.ackConfirmed))) {
  usage();
  process.exit(2);
}

try {
  const result = operation === "inspect"
    ? await inspect(command, featurePath)
    : await applyReset(command, featurePath, options.mode, options.inventoryDigest, options.ackConfirmed);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Command artifact reset failed: ${error.message}`);
  process.exit(1);
}
