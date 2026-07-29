#!/usr/bin/env node

import { readJson, validateOutlineBoundaries } from "./outline-boundaries-lib.mjs";

const [boundariesPath, ...extraArguments] = process.argv.slice(2);
if (!boundariesPath || extraArguments.length) {
  console.error("Usage: node .specify/review/scripts/validate-outline-boundaries.mjs specs/<root-feature>/outline-boundaries.json");
  process.exit(2);
}

try {
  const document = await readJson(boundariesPath);
  const errors = validateOutlineBoundaries(document);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }
  const active = document.current_baseline?.project_boundaries?.length || 0;
  const proposed = document.proposed_baseline?.project_boundaries?.length || 0;
  console.log(`Outline boundaries valid: state=${document.transition_state}, active=${active}, proposed=${proposed}.`);
} catch (error) {
  console.error(`Outline boundaries could not be validated: ${error.message}`);
  process.exit(1);
}
