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
  return execFileSync(cmd, cmdArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
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
      return "HEAD~1";
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

  // Tracks /* */ state across added lines. Only `//` was stripped before, so
  // block and JSX ({/* */}) comments reached the matcher and any prose using
  // the English word "as" — "reads as boilerplate", "renders as a header" —
  // was reported as an unsafe type assertion.
  let inBlockComment = false;

  const stripBlockComments = (code) => {
    let out = "";
    let index = 0;
    while (index < code.length) {
      if (inBlockComment) {
        const end = code.indexOf("*/", index);
        if (end === -1) return out;
        inBlockComment = false;
        index = end + 2;
        continue;
      }
      const start = code.indexOf("/*", index);
      if (start === -1) return out + code.slice(index);
      out += code.slice(index, start);
      inBlockComment = true;
      index = start + 2;
    }
    return out;
  };

  for (const line of lines) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;

    const code = line.slice(1);
    // Strip comments before matching to avoid false positives
    const codeWithoutComments = stripBlockComments(code).replace(/\/\/.*/g, "");
    // Same class of false positive the block-comment strip fixed, one level in:
    // quoted prose ("treats the window as unchanged") tripped the matcher. A type
    // assertion cannot occur inside a string literal, so blank those out too.
    // Template literals are left alone — `${...}` can hold real code.
    const codeWithoutStrings = codeWithoutComments
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    const nonTypeAssertionPrepostions = /\sas\s+(?:of|in|on|at|to|for|with|by|an|if|the|a|well|part|per|long|soon|far|much|late|early|such)\b/.test(codeWithoutStrings);
    if (nonTypeAssertionPrepostions) {
      // English prose false positives ("as of", "as in", etc.)
      continue;
    }
    const hasAssertion = /\sas\s+[A-Za-z_$<{\(]/.test(codeWithoutStrings);
    const safePattern = /\sas\s+const\b/.test(codeWithoutStrings);

    if (hasAssertion && !safePattern) {
      offenders.push(code.trim());
    }
  }

  return offenders;
}

function requiresTestCoverage(file) {
  return /^(src|lib|app)\/.+\.(ts|tsx)$/.test(file) && /(regime|policy|classif|score|indicator)/i.test(file);
}

function isTestFile(file) {
  return /^tests\/.+\.test\.tsx?$/.test(file);
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
