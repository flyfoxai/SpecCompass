import { randomUUID } from "node:crypto";
import { access, rename } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  atomicWriteJson,
  readJson,
  stableStringify,
  validateOutlineBoundaries,
  writeJsonExclusive
} from "./outline-boundaries-lib.mjs";
import {
  readClaimJson,
  removePathWithRetry,
  rewriteClaimInPlace
} from "./lease-claim-lib.mjs";

const LEASE_MILLISECONDS = 300_000;
const HEARTBEAT_MILLISECONDS = 30_000;
const LOCK_KEYS = [
  "owner_id", "transition_id", "transition_revision", "baseline_digest", "pid",
  "created_at", "heartbeat_at", "lease_expires_at", "lease_seconds", "heartbeat_seconds"
];

export function transitionLockPaths(boundariesPath) {
  const resolved = resolve(boundariesPath);
  const lockPath = join(dirname(resolved), `.${basename(resolved)}.transition.lock`);
  return { lockPath, recoveryPath: `${lockPath}.recovery` };
}

function lease(ownerId, transition, createdAt = null) {
  const now = new Date();
  return {
    owner_id: ownerId,
    transition_id: transition.transition_id,
    transition_revision: transition.transition_revision,
    baseline_digest: transition.base_baseline_digest,
    pid: process.pid,
    created_at: createdAt || now.toISOString(),
    heartbeat_at: now.toISOString(),
    lease_expires_at: new Date(now.getTime() + LEASE_MILLISECONDS).toISOString(),
    lease_seconds: 300,
    heartbeat_seconds: 30
  };
}

function validateLease(value, transition = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some((key) => !LOCK_KEYS.includes(key))
    || LOCK_KEYS.some((key) => !(key in value))) throw new Error("Transition lock sidecar fields are invalid.");
  if (typeof value.owner_id !== "string" || !value.owner_id
    || !Number.isInteger(value.transition_revision) || value.transition_revision < 1
    || typeof value.transition_id !== "string" || !value.transition_id
    || !/^[a-f0-9]{64}$/.test(value.baseline_digest || "")
    || !Number.isInteger(value.pid) || value.pid < 1) throw new Error("Transition lock sidecar identity is invalid.");
  if (transition && (value.transition_id !== transition.transition_id
    || value.transition_revision !== transition.transition_revision
    || value.baseline_digest !== transition.base_baseline_digest)) {
    throw new Error("Transition lock sidecar does not match the active transition.");
  }
  const heartbeat = Date.parse(value.heartbeat_at);
  const expires = Date.parse(value.lease_expires_at);
  if (!Number.isFinite(Date.parse(value.created_at)) || !Number.isFinite(heartbeat) || !Number.isFinite(expires)
    || expires - heartbeat !== LEASE_MILLISECONDS || value.lease_seconds !== 300 || value.heartbeat_seconds !== 30) {
    throw new Error("Transition lock sidecar lease is invalid.");
  }
}

async function loadActiveDocument(boundariesPath) {
  const document = await readJson(boundariesPath);
  const errors = validateOutlineBoundaries(document);
  if (errors.length) throw new Error(`outline-boundaries is invalid:\n${errors.join("\n")}`);
  if (!document.transition || document.transition_state === "ALIGNED") throw new Error("An active Outline transition is required.");
  return document;
}

async function assertNoRecoveryClaim(recoveryPath) {
  try {
    await access(recoveryPath);
    throw new Error("A transition-lock recovery claim is active.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function recoverExpiredLock(boundariesPath, observed) {
  const { lockPath, recoveryPath } = transitionLockPaths(boundariesPath);
  validateLease(observed);
  if (Date.parse(observed.lease_expires_at) >= Date.now()) throw new Error("Another command holds the active transition lock.");
  await assertNoRecoveryClaim(recoveryPath);
  const claim = {
    claim_id: randomUUID(),
    observed_owner_id: observed.owner_id,
    observed_transition_id: observed.transition_id,
    observed_transition_revision: observed.transition_revision,
    observed_lease_expires_at: observed.lease_expires_at,
    claimed_at: new Date().toISOString(),
    claim_expires_at: new Date(Date.now() + LEASE_MILLISECONDS).toISOString()
  };
  try {
    await writeJsonExclusive(recoveryPath, claim);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("A transition-lock recovery claim is active.");
    throw error;
  }
  try {
    const rechecked = await readClaimJson(lockPath, "Transition command lock");
    if (!rechecked) throw new Error("Transition command lock disappeared after recovery claim acquisition.");
    if (stableStringify(rechecked) !== stableStringify(observed)) throw new Error("Transition lock changed after recovery claim acquisition.");
    const document = await loadActiveDocument(boundariesPath);
    if (document.transition.transition_id !== observed.transition_id
      || document.transition.transition_revision !== observed.transition_revision) throw new Error("Transition changed before stale-lock recovery.");
    if (document.transition.lock?.owner_id === observed.owner_id) {
      const cleared = structuredClone(document);
      cleared.transition.lock = null;
      cleared.updated_at = new Date().toISOString();
      cleared.transition.updated_at = cleared.updated_at;
      await atomicWriteJson(boundariesPath, cleared, 0o600);
    } else if (document.transition.lock !== null) {
      throw new Error("Embedded transition lock differs from the stale sidecar owner.");
    }
    const quarantine = `${lockPath}.${randomUUID()}.stale`;
    await rename(lockPath, quarantine);
    await removePathWithRetry(quarantine, { label: "Transition lock stale quarantine" }).catch((error) => {
      console.warn(error.message);
    });
  } finally {
    const currentRecovery = await readClaimJson(recoveryPath, "Transition-lock recovery claim");
    if (!currentRecovery) throw new Error("Transition-lock recovery claim disappeared before its owner released it.");
    if (currentRecovery.claim_id !== claim.claim_id) {
      throw new Error("Transition-lock recovery claim ownership changed; refusing to remove the replacement claim.");
    }
    await removePathWithRetry(recoveryPath, { label: "Transition-lock recovery claim" });
  }
}

export async function acquireTransitionCommandLock(boundariesPath) {
  const resolved = resolve(boundariesPath);
  const { lockPath, recoveryPath } = transitionLockPaths(resolved);
  await assertNoRecoveryClaim(recoveryPath);
  let document = await loadActiveDocument(resolved);
  if (document.transition.lock !== null) {
    const sidecar = await readClaimJson(lockPath, "Transition command lock");
    if (!sidecar) throw new Error("Embedded transition lock has no sidecar; manual recovery is required.");
    await recoverExpiredLock(resolved, sidecar);
    document = await loadActiveDocument(resolved);
  }
  const ownerId = randomUUID();
  const currentLease = lease(ownerId, document.transition);
  try {
    await writeJsonExclusive(lockPath, currentLease);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const observed = await readClaimJson(lockPath, "Transition command lock");
    if (!observed) return acquireTransitionCommandLock(resolved);
    await recoverExpiredLock(resolved, observed);
    return acquireTransitionCommandLock(resolved);
  }
  try {
    await assertNoRecoveryClaim(recoveryPath);
    const latest = await loadActiveDocument(resolved);
    if (latest.transition.transition_id !== document.transition.transition_id
      || latest.transition.transition_revision !== document.transition.transition_revision
      || latest.proposed_baseline.proposal_digest !== document.proposed_baseline.proposal_digest
      || latest.transition.lock !== null) throw new Error("Transition changed while acquiring its command lock.");
    latest.transition.lock = currentLease;
    latest.updated_at = new Date().toISOString();
    latest.transition.updated_at = latest.updated_at;
    await atomicWriteJson(resolved, latest, 0o600);
  } catch (error) {
    const sidecar = await readClaimJson(lockPath, "Transition command lock");
    if (sidecar?.owner_id === ownerId) {
      await removePathWithRetry(lockPath, { label: "Transition command lock" });
    }
    throw error;
  }
  return { ownerId, lease: currentLease, lockPath, boundariesPath: resolved };
}

export async function assertTransitionCommandLock(lock) {
  const document = await loadActiveDocument(lock.boundariesPath);
  const sidecar = await readClaimJson(lock.lockPath, "Transition command lock");
  if (!sidecar) throw new Error("Transition command lock sidecar disappeared.");
  validateLease(sidecar, document.transition);
  if (sidecar.owner_id !== lock.ownerId || document.transition.lock?.owner_id !== lock.ownerId
    || Date.parse(sidecar.lease_expires_at) < Date.now()) throw new Error("Transition command lock is stale or owned by another process.");
  return document;
}

export async function heartbeatTransitionCommandLock(lock) {
  const document = await assertTransitionCommandLock(lock);
  await assertNoRecoveryClaim(`${lock.lockPath}.recovery`);
  const sidecar = await readClaimJson(lock.lockPath, "Transition command lock");
  if (!sidecar) throw new Error("Transition command lock sidecar disappeared during heartbeat.");
  const refreshed = lease(lock.ownerId, document.transition, sidecar.created_at);
  await rewriteClaimInPlace(lock.lockPath, sidecar, refreshed, { label: "Transition command lock" });
  await assertNoRecoveryClaim(`${lock.lockPath}.recovery`);
  lock.lease = refreshed;
  return refreshed;
}

export async function releaseTransitionCommandLock(lock) {
  let document = await readJson(lock.boundariesPath).catch(() => null);
  if (document?.transition?.lock?.owner_id === lock.ownerId) {
    const sidecar = await readClaimJson(lock.lockPath, "Transition command lock");
    if (sidecar?.owner_id !== lock.ownerId) throw new Error("Cannot release transition lock because sidecar ownership changed.");
    document.transition.lock = null;
    document.updated_at = new Date().toISOString();
    document.transition.updated_at = document.updated_at;
    const errors = validateOutlineBoundaries(document);
    if (errors.length) throw new Error(`Releasing transition lock would invalidate outline-boundaries:\n${errors.join("\n")}`);
    await atomicWriteJson(lock.boundariesPath, document, 0o600);
  }
  const finalSidecar = await readClaimJson(lock.lockPath, "Transition command lock");
  if (finalSidecar) {
    if (finalSidecar.owner_id !== lock.ownerId) throw new Error("Cannot remove a replacement transition lock owner.");
    await removePathWithRetry(lock.lockPath, { label: "Transition command lock" });
  }
}

export async function withTransitionCommandLock(boundariesPath, operation) {
  const lock = await acquireTransitionCommandLock(boundariesPath);
  let heartbeatError = null;
  const timer = setInterval(() => {
    void heartbeatTransitionCommandLock(lock).catch((error) => { heartbeatError = error; });
  }, HEARTBEAT_MILLISECONDS);
  timer.unref();
  try {
    const result = await operation(lock);
    if (heartbeatError) throw heartbeatError;
    return result;
  } finally {
    clearInterval(timer);
    await releaseTransitionCommandLock(lock);
  }
}
