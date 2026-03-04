#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function sh(cmd, cmdArgs) {
  return execFileSync(cmd, cmdArgs, { encoding: "utf8" }).trim();
}

function isAllZeroSha(value) {
  return /^0{40}$/.test(value);
}

function sanitizeBaseRef(base) {
  if (!base || isAllZeroSha(base)) return "";

  try {
    return sh("git", ["rev-parse", "--verify", base]) ? base : "";
  } catch {
    return "";
  }
}

function getDiffRange() {
  const base = sanitizeBaseRef(readArg("--base", process.env.REVIEW_HOTSPOT_BASE || ""));
  const head = readArg("--head", process.env.REVIEW_HOTSPOT_HEAD || "HEAD");

  if (base) {
    return `${base}...${head}`;
  }

  try {
    const hasHeadParent = sh("git", ["rev-parse", "--verify", "HEAD~1"]);
    if (hasHeadParent) {
      return "HEAD~1...HEAD";
    }
  } catch {
    return "HEAD";
  }

  return "HEAD";
}

function changedFiles(diffRange) {
  const output = sh("git", ["diff", "--name-only", diffRange]);
  if (!output) return [];
  return output.split("\n").map((file) => file.trim()).filter(Boolean);
}

function addedTypeAssertions(diffRange) {
  const diff = sh("git", ["diff", "--unified=0", diffRange, "--", "*.ts", "*.tsx"]);
  if (!diff) return [];

  const lines = diff.split("\n");
  const offenders = [];

  for (const line of lines) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;

    const code = line.slice(1);
    const hasAssertion = /\sas\s+[A-Za-z_$<{(]/.test(code);
    const safePattern = /\sas\s+const\b/.test(code);

    if (hasAssertion && !safePattern) {
      offenders.push(code.trim());
    }
  }

  return offenders;
}

function requiresTestCoverage(file) {
  return /^src\/.+\.(ts|tsx)$/.test(file) && /(regime|policy|classif|score|indicator)/i.test(file);
}

function isTestFile(file) {
  return /^tests\/.+\.test\.ts$/.test(file);
}

function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(`Review hotspot preflight\n\nUsage:\n  node scripts/review-hotspot-preflight.mjs [--base <sha>] [--head <sha>]\n`);
    process.exit(0);
  }

  const diffRange = getDiffRange();
  const files = changedFiles(diffRange);

  if (files.length === 0) {
    console.log("No changed files detected for review-hotspot preflight.");
    return;
  }

  const riskySourceChanges = files.filter(requiresTestCoverage);
  const hasTestChanges = files.some(isTestFile);
  const assertionOffenders = addedTypeAssertions(diffRange);

  const failures = [];

  if (riskySourceChanges.length > 0 && !hasTestChanges) {
    failures.push(
      `Risky decision-logic files changed without tests: ${riskySourceChanges.join(", ")}. Add/adjust tests under tests/*.test.ts.`,
    );
  }

  if (assertionOffenders.length > 0) {
    failures.push(
      `Unsafe type assertions detected in added lines (${assertionOffenders.length}). Prefer runtime validation/narrowing.`,
    );
  }

  console.log(`Review hotspot preflight range: ${diffRange}`);
  console.log(`Changed files: ${files.length}`);
  console.log(`Risk-tagged source files: ${riskySourceChanges.length}`);
  console.log(`Test files changed: ${hasTestChanges ? "yes" : "no"}`);
  console.log(`Unsafe assertion additions: ${assertionOffenders.length}`);

  if (failures.length > 0) {
    console.error("\nPreflight failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("\nPreflight passed.");
}

main();
