#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

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

/**
 * Line numbers (1-based) that sit inside a comment. Exported because the scanner reads
 * comment state from the file rather than from the diff: tracking `/* *​/` across added
 * lines alone only works when the opening `/**` is itself added, so editing the middle of
 * an existing doc comment used to hand the matcher bare prose.
 */
export function blockCommentLines(source) {
  const inside = new Set();
  let inBlock = false;

  source.split("\n").forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (inBlock) {
      inside.add(lineNumber);
      if (trimmed.includes("*/")) inBlock = false;
      return;
    }

    const opensBlock = trimmed.includes("/*") && !trimmed.includes("*/", trimmed.indexOf("/*") + 2);
    if (opensBlock) {
      inBlock = true;
      // Only excuse the line when the comment starts it. `const x = y as Foo; /* note`
      // carries real code before the opener, and skipping the whole line would let an
      // assertion through — a false negative in a gate is worse than a false positive.
      if (trimmed.startsWith("/*")) inside.add(lineNumber);
      return;
    }

    if (trimmed.startsWith("//") || (trimmed.startsWith("/*") && trimmed.includes("*/"))) {
      inside.add(lineNumber);
    }
  });

  return inside;
}

/** Whether one line of code carries a type assertion, ignoring comments and string prose. */
export function isUnsafeAssertion(code) {
  const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
  // Quoted prose ("treats the window as unchanged") tripped the matcher too. A type
  // assertion cannot occur inside a string literal, so blank those out.
  // Template literals are left alone — `${...}` can hold real code.
  const withoutStrings = withoutComments
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');

  // Import renaming uses the same `as Name` tokens as a type assertion, but it does
  // not override or narrow a runtime value.
  if (/^\s*import\s+\{[^}]*\bas\s+[A-Za-z_$][\w$]*[^}]*\}\s+from\b/.test(withoutStrings)) {
    return false;
  }

  // English prose false positives ("as of", "as in", etc.)
  if (/\sas\s+(?:of|in|on|at|to|for|with|by|an|if|the|a|well|part|per|long|soon|far|much|late|early|such)\b/.test(withoutStrings)) {
    return false;
  }

  return /\sas\s+[A-Za-z_$<{(]/.test(withoutStrings) && !/\sas\s+const\b/.test(withoutStrings);
}

function addedTypeAssertions(diffRange) {
  const diff = sh("git", ["diff", "--unified=0", diffRange, "--", "*.ts", "*.tsx"]);
  if (!diff) return [];

  // Comment state comes from the file, not from the added lines. Tracking `/* */` across
  // added lines alone only works when the opening `/**` is itself added: editing the middle
  // of an existing doc comment hands the matcher bare prose, and every "renders as a
  // header" in it reads as a type assertion. The diff's hunk headers carry each added
  // line's number on the new side, so ask the file which lines are comments.
  const commentLinesFor = (file) =>
    existsSync(file) ? blockCommentLines(readFileSync(file, "utf8")) : new Set();

  const offenders = [];
  let file = null;
  let commentLines = new Set();
  let newLineNumber = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      file = line.slice("+++ b/".length);
      commentLines = commentLinesFor(file);
      continue;
    }

    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      newLineNumber = Number(hunk[1]);
      continue;
    }

    if (!line.startsWith("+") || line.startsWith("+++")) continue;

    const lineNumber = newLineNumber;
    newLineNumber += 1;

    if (!file || commentLines.has(lineNumber)) continue;

    const code = line.slice(1);
    if (isUnsafeAssertion(code)) {
      offenders.push(`${file}: ${code.trim()}`);
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

// Run only when invoked as the command, so importing the helpers for a test does not run
// a preflight as a side effect.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
