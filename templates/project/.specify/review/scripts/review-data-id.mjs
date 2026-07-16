#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const [, , reviewDataPath] = process.argv;

if (!reviewDataPath) {
  console.error("Usage: node .specify/review/scripts/review-data-id.mjs <review-data-path>");
  process.exit(2);
}

function canonicalizeReviewValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeReviewValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeReviewValue(value[key])])
    );
  }
  return value;
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

try {
  const reviewData = JSON.parse(await readFile(reviewDataPath, "utf8"));
  console.log(hashText(JSON.stringify(canonicalizeReviewValue(reviewData))));
} catch (error) {
  console.error(`review-data identity failed: ${error.message}`);
  process.exit(2);
}
