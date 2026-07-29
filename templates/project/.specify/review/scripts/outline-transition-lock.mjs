#!/usr/bin/env node

import { readJson } from "./outline-boundaries-lib.mjs";
import {
  acquireTransitionCommandLock,
  releaseTransitionCommandLock,
  transitionLockPaths
} from "./outline-transition-lock-lib.mjs";

const [action, boundariesArgument, ...extra] = process.argv.slice(2);
if (!new Set(["status", "recover"]).has(action) || !boundariesArgument || extra.length) {
  console.error("Usage: node .specify/review/scripts/outline-transition-lock.mjs <status|recover> specs/<root>/outline-boundaries.json");
  process.exit(2);
}

try {
  if (action === "status") {
    const { lockPath, recoveryPath } = transitionLockPaths(boundariesArgument);
    const [sidecar, recovery] = await Promise.all([
      readJson(lockPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error)),
      readJson(recoveryPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error))
    ]);
    console.log(JSON.stringify({
      command_lock: sidecar,
      recovery_claim: recovery,
      held: sidecar !== null || recovery !== null
    }, null, 2));
  } else {
    const lock = await acquireTransitionCommandLock(boundariesArgument);
    await releaseTransitionCommandLock(lock);
    console.log("Recovered any expired transition lock and released the maintenance command lock.");
  }
} catch (error) {
  console.error(`Outline transition lock maintenance failed: ${error.message}`);
  process.exit(1);
}
