#!/usr/bin/env node

import { resolve } from "node:path";
import { readJson } from "./outline-boundaries-lib.mjs";
import {
  assertFeatureCodeLedgerLocation,
  authorizeFeatureCreation,
  ensureFeatureCodeLedger,
  featureCodeLedgerSummary,
  reserveFeatureCode,
  voidFeatureCodeReservations,
  validateFeatureCodeLedger
} from "./feature-code-ledger-lib.mjs";

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function positionalArgs(args, optionNames) {
  const consumed = new Set();
  for (const name of optionNames) {
    const index = args.indexOf(name);
    if (index >= 0) {
      consumed.add(index);
      consumed.add(index + 1);
    }
  }
  return args.filter((_, index) => !consumed.has(index));
}

const [action, ...args] = process.argv.slice(2);

async function main() {
  if (action === "validate") {
    const [ledgerArgument] = args;
    if (!ledgerArgument || args.length !== 1) throw new Error("Usage: manage-feature-codes.mjs validate specs/feature-code-ledger.json");
    const ledger = await readJson(resolve(ledgerArgument));
    const errors = validateFeatureCodeLedger(ledger);
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(JSON.stringify(featureCodeLedgerSummary(ledger)));
    return;
  }

  if (action === "authorize-create") {
    const optionNames = ["--number", "--feature"];
    const positional = positionalArgs(args, optionNames);
    const featureCode = option(args, "--number");
    const feature = option(args, "--feature");
    if (positional.length !== 1 || !featureCode || !feature) {
      throw new Error("Usage: manage-feature-codes.mjs authorize-create specs/feature-code-ledger.json --number <feature-code> --feature <feature>");
    }
    console.log(JSON.stringify(await authorizeFeatureCreation(resolve(positional[0]), featureCode, feature)));
    return;
  }

  if (action === "init" || action === "reconcile") {
    if (args.length !== 2) throw new Error(`Usage: manage-feature-codes.mjs ${action} specs/feature-code-ledger.json specs/<root>/outline-boundaries.json`);
    const [ledgerPath, boundariesPath] = args.map((value) => resolve(value));
    assertFeatureCodeLedgerLocation(ledgerPath, boundariesPath);
    const ledger = await ensureFeatureCodeLedger(ledgerPath, await readJson(boundariesPath));
    console.log(JSON.stringify(featureCodeLedgerSummary(ledger)));
    return;
  }

  if (action === "reserve") {
    const optionNames = ["--slug", "--proposal", "--reason"];
    const positional = positionalArgs(args, optionNames);
    if (positional.length !== 2 || !option(args, "--slug") || !option(args, "--proposal") || !option(args, "--reason")) {
      throw new Error("Usage: manage-feature-codes.mjs reserve specs/feature-code-ledger.json specs/<root>/outline-boundaries.json --slug <slug> --proposal <proposal-id> --reason <reason>");
    }
    const [ledgerPath, boundariesPath] = positional.map((value) => resolve(value));
    assertFeatureCodeLedgerLocation(ledgerPath, boundariesPath);
    const entry = await reserveFeatureCode(ledgerPath, await readJson(boundariesPath), {
      slug: option(args, "--slug"),
      proposalId: option(args, "--proposal"),
      reason: option(args, "--reason")
    });
    console.log(JSON.stringify(entry));
    return;
  }

  if (action === "void") {
    const optionNames = ["--proposal", "--transition", "--reason"];
    const positional = positionalArgs(args, optionNames);
    if (positional.length !== 1 || !option(args, "--proposal") || !option(args, "--reason")) {
      throw new Error("Usage: manage-feature-codes.mjs void specs/feature-code-ledger.json --proposal <proposal-id> [--transition <transition-id>] --reason <reason>");
    }
    const ledger = await voidFeatureCodeReservations(resolve(positional[0]), {
      proposalId: option(args, "--proposal"),
      transitionId: option(args, "--transition"),
      reason: option(args, "--reason")
    });
    console.log(JSON.stringify(featureCodeLedgerSummary(ledger)));
    return;
  }

  throw new Error("Usage: manage-feature-codes.mjs <init|reserve|void|reconcile|validate|authorize-create> ...");
}

main().catch((error) => {
  console.error(`Feature code operation failed: ${error.message}`);
  process.exit(1);
});
