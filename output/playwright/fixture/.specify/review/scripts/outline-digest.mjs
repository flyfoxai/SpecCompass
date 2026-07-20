#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const [, , sourcePath, ...authorityArguments] = process.argv;

if (!sourcePath) {
  console.error("Usage: node .specify/review/scripts/outline-digest.mjs <outline-path> [authority-id ...]");
  process.exit(2);
}

function normalizedHeading(line) {
  const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
  if (!match) return null;
  return {
    level: match[1].length,
    title: match[2].replace(/\s+#+\s*$/, "").trim().toLowerCase()
  };
}

function removeMutableSections(lines) {
  const result = [];
  let skippedLevel = null;

  for (const line of lines) {
    const heading = normalizedHeading(line);
    if (skippedLevel !== null) {
      if (!heading || heading.level > skippedLevel) continue;
      skippedLevel = null;
    }
    if (heading && (heading.title === "outline confirmation" || heading.title === "status history")) {
      skippedLevel = heading.level;
      continue;
    }
    result.push(line);
  }
  return result;
}

function normalizeMutableOutlineDecision(lines) {
  const result = [];
  let outlineDecisionLevel = null;

  for (const line of lines) {
    const heading = normalizedHeading(line);
    if (heading) {
      if (outlineDecisionLevel !== null && heading.level <= outlineDecisionLevel) {
        outlineDecisionLevel = null;
      }
      if (heading.title === "outline decision") {
        outlineDecisionLevel = heading.level;
      }
    }

    if (outlineDecisionLevel !== null) {
      if (/^\s*(?:[-*]\s*)?(?:\*\*)?status(?:\*\*)?\s*:/i.test(line)) {
        result.push("Status: AWAITING_OUTLINE_CONFIRMATION");
        continue;
      }
      if (/^\s*(?:[-*]\s*)?(?:\*\*)?(?:next[ _-]?route|handoff route|operational readiness)(?:\*\*)?\s*:/i.test(line)) {
        result.push("Next Route: OUTLINE_CONFIRMATION_GATE");
        continue;
      }
    }
    result.push(line);
  }
  return result;
}

function canonicalizeOutline(source) {
  const withoutBom = source.replace(/^\uFEFF/, "");
  const normalizedLines = withoutBom
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/g, ""));
  const stableLines = normalizeMutableOutlineDecision(removeMutableSections(normalizedLines));
  while (stableLines.length && stableLines[stableLines.length - 1] === "") stableLines.pop();
  return `${stableLines.join("\n")}\n`;
}

function canonicalizeAuthorityIds(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

try {
  const source = await readFile(sourcePath, "utf8");
  const canonicalOutline = canonicalizeOutline(source);
  const authorityIds = canonicalizeAuthorityIds(authorityArguments);
  const digestInput = `${canonicalOutline}\u0000${JSON.stringify(authorityIds)}\n`;
  console.log(createHash("sha256").update(digestInput, "utf8").digest("hex"));
} catch (error) {
  console.error(`outline digest failed: ${error.message}`);
  process.exit(2);
}
