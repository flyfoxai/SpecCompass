import { randomUUID } from "node:crypto";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  readJson,
  sha256,
  stableStringify,
  writeJsonExclusive
} from "./outline-boundaries-lib.mjs";

const TRANSIENT_FILE_CODES = new Set(["EACCES", "EBUSY", "EPERM"]);
const FILE_RETRY_DELAYS = [25, 75, 150, 300];
const CLAIM_READ_RETRY_DELAYS = [10, 25, 50, 100, 200];

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

function validateClaim(claim, label) {
  if (!claim || typeof claim !== "object" || Array.isArray(claim)
    || typeof claim.owner_id !== "string" || !claim.owner_id
    || !Number.isFinite(Date.parse(claim.created_at))
    || !Number.isFinite(Date.parse(claim.lease_expires_at))) {
    throw new Error(`${label} is malformed; preserve it for manual inspection.`);
  }
}

export async function readClaimJson(path, label = "Lease claim") {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await readJson(path);
    } catch (error) {
      if (error.code === "ENOENT") return null;
      if (!(error instanceof SyntaxError) || attempt >= CLAIM_READ_RETRY_DELAYS.length) {
        if (error instanceof SyntaxError) {
          throw new Error(
            `${label} at ${path} is unreadable or only partially written; `
            + "preserve it for manual inspection."
          );
        }
        throw error;
      }
      // An exclusive file is visible after open("wx") and just before its JSON write completes.
      await wait(CLAIM_READ_RETRY_DELAYS[attempt]);
    }
  }
}

export async function removePathWithRetry(pathArgument, {
  allowMissing = false,
  label = "Lease claim",
  unlinkOperation = unlink
} = {}) {
  const path = resolve(pathArgument);
  for (let attempt = 0; ; attempt += 1) {
    try {
      await unlinkOperation(path);
      return true;
    } catch (error) {
      if (error.code === "ENOENT" && allowMissing) return false;
      if (!TRANSIENT_FILE_CODES.has(error.code) || attempt >= FILE_RETRY_DELAYS.length) {
        throw new Error(`${label} could not be removed at ${path}: ${error.code || error.message}`);
      }
      await wait(FILE_RETRY_DELAYS[attempt]);
    }
  }
}

async function renameWithRetry(source, target, label) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(source, target);
      return;
    } catch (error) {
      if (!TRANSIENT_FILE_CODES.has(error.code) || attempt >= FILE_RETRY_DELAYS.length) {
        throw new Error(`${label} could not be isolated: ${error.code || error.message}`);
      }
      await wait(FILE_RETRY_DELAYS[attempt]);
    }
  }
}

async function assertRecoveryAbsent(handle) {
  const recovery = await readClaimJson(handle.recoveryPath, `${handle.label} recovery claim`);
  if (!recovery) return;
  validateClaim(recovery, `${handle.label} recovery claim`);
  throw new Error(
    `${handle.label} recovery claim already exists at ${handle.recoveryPath}; `
    + "verify that no recovery process is active, then remove only the orphaned recovery claim."
  );
}

async function removeOwnedClaim(path, ownerId, label, { allowMissing = false, unlinkOperation = unlink } = {}) {
  const current = await readClaimJson(path, label);
  if (!current) {
    if (allowMissing) return false;
    throw new Error(`${label} disappeared before its owner released it.`);
  }
  validateClaim(current, label);
  if (current.owner_id !== ownerId) throw new Error(`${label} ownership changed; refusing to remove the replacement claim.`);
  await removePathWithRetry(path, { label, unlinkOperation });
  return true;
}

export async function rewriteClaimInPlace(pathArgument, observed, replacement, {
  label = "Lease claim",
  mode = 0o600
} = {}) {
  const path = resolve(pathArgument);
  const file = await open(path, "r+");
  try {
    let opened;
    try {
      opened = JSON.parse(await file.readFile("utf8"));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`${label} at ${path} is unreadable or only partially written; preserve it for manual inspection.`);
      }
      throw error;
    }
    if (stableStringify(opened) !== stableStringify(observed)) {
      throw new Error(`${label} changed before its owner could update it.`);
    }

    const payload = Buffer.from(`${JSON.stringify(replacement, null, 2)}\n`, "utf8");
    let offset = 0;
    while (offset < payload.length) {
      const { bytesWritten } = await file.write(payload, offset, payload.length - offset, offset);
      if (!bytesWritten) throw new Error(`${label} update made no filesystem progress.`);
      offset += bytesWritten;
    }
    await file.truncate(payload.length);
    await file.chmod(mode);
    await file.sync();
  } finally {
    await file.close();
  }

  const committed = await readClaimJson(path, label);
  if (!committed || stableStringify(committed) !== stableStringify(replacement)) {
    throw new Error(`${label} was replaced by another owner during its update.`);
  }
  return committed;
}

function startHeartbeat(handle) {
  if (!handle.heartbeatMilliseconds) return;
  handle.timer = setInterval(() => {
    if (handle.heartbeatPromise) return;
    handle.heartbeatPromise = refreshLeaseClaim(handle)
      .catch((error) => { handle.heartbeatError = error; })
      .finally(() => { handle.heartbeatPromise = null; });
  }, handle.heartbeatMilliseconds);
  handle.timer.unref();
}

function buildHandle(lockPath, claim, options) {
  return {
    lockPath,
    recoveryPath: `${lockPath}.recovery`,
    claim,
    label: options.label,
    leaseMilliseconds: options.leaseMilliseconds,
    heartbeatMilliseconds: options.heartbeatMilliseconds,
    heartbeatError: null,
    heartbeatPromise: null,
    timer: null,
    released: false
  };
}

async function recoverExpiredClaim(handle, observed) {
  const now = new Date();
  const recovery = {
    owner_id: randomUUID(),
    observed_owner_id: observed.owner_id,
    observed_claim_digest: sha256(observed),
    created_at: now.toISOString(),
    lease_expires_at: new Date(now.getTime() + handle.leaseMilliseconds).toISOString()
  };
  try {
    await writeJsonExclusive(handle.recoveryPath, recovery, 0o600);
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(`${handle.label} recovery is already owned by another process.`);
    }
    throw error;
  }

  let mainClaimCreated = false;
  try {
    const rechecked = await readClaimJson(handle.lockPath, handle.label);
    if (!rechecked) throw new Error(`${handle.label} disappeared after recovery ownership was acquired.`);
    if (stableStringify(rechecked) !== stableStringify(observed)) {
      throw new Error(`${handle.label} changed after recovery ownership was acquired.`);
    }
    const quarantine = `${handle.lockPath}.${randomUUID()}.stale`;
    await renameWithRetry(handle.lockPath, quarantine, handle.label);
    await removePathWithRetry(quarantine, { label: `${handle.label} stale quarantine` }).catch((error) => {
      console.warn(error.message);
    });
    await writeJsonExclusive(handle.lockPath, handle.claim, 0o600);
    mainClaimCreated = true;
    await removeOwnedClaim(handle.recoveryPath, recovery.owner_id, `${handle.label} recovery claim`);
    startHeartbeat(handle);
    return handle;
  } catch (error) {
    const cleanupErrors = [];
    if (mainClaimCreated) {
      await removeOwnedClaim(handle.lockPath, handle.claim.owner_id, handle.label, { allowMissing: true })
        .catch((cleanupError) => cleanupErrors.push(cleanupError.message));
    }
    await removeOwnedClaim(handle.recoveryPath, recovery.owner_id, `${handle.label} recovery claim`, { allowMissing: true })
      .catch((cleanupError) => cleanupErrors.push(cleanupError.message));
    if (cleanupErrors.length) {
      throw new Error(`${error.message} Cleanup also failed: ${cleanupErrors.join("; ")}`);
    }
    throw error;
  }
}

export async function acquireLeaseClaim(lockPathArgument, {
  label = "Lease claim",
  leaseMilliseconds = 300000,
  heartbeatMilliseconds = Math.max(1000, Math.floor(leaseMilliseconds / 3)),
  identity = {},
  retryDelays = [0],
  activeMessage = `${label} is owned by another process.`
} = {}) {
  const lockPath = resolve(lockPathArgument);
  if (!Number.isInteger(leaseMilliseconds) || leaseMilliseconds < 1000
    || !Number.isInteger(heartbeatMilliseconds) || heartbeatMilliseconds < 0
    || heartbeatMilliseconds >= leaseMilliseconds) {
    throw new Error(`${label} lease/heartbeat settings are invalid.`);
  }
  await mkdir(dirname(lockPath), { recursive: true });
  const now = new Date();
  const claim = {
    ...identity,
    owner_id: randomUUID(),
    created_at: now.toISOString(),
    heartbeat_at: now.toISOString(),
    lease_expires_at: new Date(now.getTime() + leaseMilliseconds).toISOString()
  };
  const handle = buildHandle(lockPath, claim, { label, leaseMilliseconds, heartbeatMilliseconds });
  let lastError = new Error(activeMessage);

  for (const retryDelay of retryDelays) {
    if (retryDelay) await wait(retryDelay);
    await assertRecoveryAbsent(handle);
    try {
      await writeJsonExclusive(lockPath, claim, 0o600);
      try {
        await assertRecoveryAbsent(handle);
      } catch (error) {
        await removeOwnedClaim(lockPath, claim.owner_id, label, { allowMissing: true });
        throw error;
      }
      startHeartbeat(handle);
      return handle;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }

    let observed;
    try {
      observed = await readClaimJson(lockPath, label);
      if (!observed) {
        lastError = new Error(`${label} was released while acquisition was being retried.`);
        continue;
      }
      validateClaim(observed, label);
    } catch (error) {
      if (error.code === "ENOENT") {
        lastError = new Error(`${label} was released while acquisition was being retried.`);
        continue;
      }
      throw error;
    }
    if (Date.parse(observed.lease_expires_at) >= Date.now()) {
      lastError = new Error(activeMessage);
      continue;
    }
    try {
      return await recoverExpiredClaim(handle, observed);
    } catch (error) {
      lastError = error;
      if (!/owned by another process|changed after recovery ownership|disappeared after recovery ownership/.test(error.message)) throw error;
    }
  }
  throw lastError;
}

export async function assertLeaseClaim(handle) {
  if (handle.released) throw new Error(`${handle.label} has already been released.`);
  if (handle.heartbeatError) throw handle.heartbeatError;
  await assertRecoveryAbsent(handle);
  const current = await readJson(handle.lockPath);
  validateClaim(current, handle.label);
  if (current.owner_id !== handle.claim.owner_id) throw new Error(`${handle.label} is owned by another process.`);
  if (Date.parse(current.lease_expires_at) < Date.now()) throw new Error(`${handle.label} expired before the protected update.`);
  handle.claim = current;
  return current;
}

export async function refreshLeaseClaim(handle) {
  const current = await assertLeaseClaim(handle);
  const now = new Date();
  const refreshed = {
    ...current,
    heartbeat_at: now.toISOString(),
    lease_expires_at: new Date(now.getTime() + handle.leaseMilliseconds).toISOString()
  };
  const committed = await rewriteClaimInPlace(handle.lockPath, current, refreshed, { label: handle.label });
  await assertRecoveryAbsent(handle);
  if (committed.owner_id !== handle.claim.owner_id || stableStringify(committed) !== stableStringify(refreshed)) {
    throw new Error(`${handle.label} heartbeat was replaced by another owner.`);
  }
  handle.claim = committed;
  return committed;
}

export async function releaseLeaseClaim(handle, options = {}) {
  if (handle.released) return;
  if (handle.timer) clearInterval(handle.timer);
  if (handle.heartbeatPromise) await handle.heartbeatPromise;
  const heartbeatError = handle.heartbeatError;
  await removeOwnedClaim(handle.lockPath, handle.claim.owner_id, handle.label, options);
  handle.released = true;
  if (heartbeatError) throw heartbeatError;
}

export async function withLeaseClaim(lockPath, options, operation) {
  const handle = await acquireLeaseClaim(lockPath, options);
  let operationError = null;
  try {
    const result = await operation(handle);
    await assertLeaseClaim(handle);
    return result;
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    try {
      await releaseLeaseClaim(handle);
    } catch (releaseError) {
      if (operationError) {
        throw new Error(`${operationError.message} Lease cleanup also failed: ${releaseError.message}`);
      }
      throw releaseError;
    }
  }
}
