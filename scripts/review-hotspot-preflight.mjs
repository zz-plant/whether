#!/usr/bin/env node
/**
 * Review preflight: the working tree compared with a base commit.
 *
 * Fails when a decision-logic file changed with no test change beside it, or when an
 * added line carries an `as` type assertion. One comparison only: everything on disk
 * against `base`, so committed and uncommitted work are judged together.
 *
 *   base = --base <ref> | REVIEW_HOTSPOT_BASE | merge-base with main | HEAD~1
 *
 * The merge-base default means a branch is judged on what it changes against main,
 * however many commits that is, and a merge commit does not read the base's own lines
 * as new. On main itself (merge-base is HEAD) the last commit is the base. The pre-push
 * hook passes the remote's sha as REVIEW_HOTSPOT_BASE, so a push is judged on exactly
 * what it sends. docs/agents/lessons/tests-and-copy-rules.md has the history.
 *
 * Usage:
 *   node scripts/review-hotspot-preflight.mjs [--base <ref>]
 */

import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { execText } from "./exec.mjs";

const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

/** The ref, or "" when git cannot resolve it (an all-zero sha, a sha never fetched). */
function verifiedRef(ref) {
  if (!ref || /^0+$/.test(ref)) return "";
  try {
    return execText("git", ["rev-parse", "--verify", `${ref}^{commit}`]) ? ref : "";
  } catch {
    return "";
  }
}

function tryGit(gitArgs) {
  try {
    return execText("git", gitArgs);
  } catch {
    return "";
  }
}

/**
 * The base to diff against. Pure, so the choice is tested without a repository: the
 * caller supplies what git said.
 */
export function resolveDiffBase({ explicit = "", mergeBase = "", head = "", hasParent = false }) {
  if (explicit) return explicit;
  if (mergeBase && mergeBase !== head) return mergeBase;
  if (hasParent) return "HEAD~1";
  return "HEAD";
}

function resolveBase() {
  const explicit = verifiedRef(readArg("--base", process.env.REVIEW_HOTSPOT_BASE || ""));
  const head = tryGit(["rev-parse", "HEAD"]);
  const mergeBase = tryGit(["merge-base", "HEAD", "origin/main"]) || tryGit(["merge-base", "HEAD", "main"]);
  const hasParent = Boolean(verifiedRef("HEAD~1"));
  return resolveDiffBase({ explicit, mergeBase, head, hasParent });
}

function changedFiles(base) {
  const output = execText("git", ["diff", "--name-only", base]);
  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

/**
 * Line numbers (1-based) that sit inside a comment. Read from the file rather than the
 * diff: editing the middle of an existing doc comment hands a diff-only scanner bare prose.
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
      // Only excuse the line when the comment starts it: `const x = y as Foo; /* note`
      // carries real code before the opener.
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
  // A type assertion cannot occur inside a string literal. Template literals are left
  // alone: `${...}` can hold real code.
  const withoutStrings = withoutComments
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');

  // Import renaming uses the same `as Name` tokens but narrows no runtime value.
  if (
    /^\s*import\s+\{[^}]*\bas\s+[A-Za-z_$][\w$]*[^}]*\}\s+from\b/.test(withoutStrings) ||
    /^\s*import\s+\*\s+as\s+[A-Za-z_$][\w$]*\s+from\b/.test(withoutStrings)
  ) {
    return false;
  }

  // English prose false positives ("as of", "as in", etc.)
  if (/\sas\s+(?:of|in|on|at|to|for|with|by|an|if|the|a|well|part|per|long|soon|far|much|late|early|such)\b/.test(withoutStrings)) {
    return false;
  }

  return /\sas\s+[A-Za-z_$<{(]/.test(withoutStrings) && !/\sas\s+const\b/.test(withoutStrings);
}

function addedTypeAssertions(base) {
  const diff = execText("git", ["diff", "--unified=0", base, "--", "*.ts", "*.tsx"]);
  if (!diff) return [];

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
    console.log([
      "Review hotspot preflight",
      "",
      "Usage:",
      "  node scripts/review-hotspot-preflight.mjs [--base <ref>]",
      "",
      "Compares the working tree with <ref>. Default: the merge-base with main,",
      "or HEAD~1 on main itself. REVIEW_HOTSPOT_BASE sets it from the environment.",
      "",
    ].join("\n"));
    process.exit(0);
  }

  const base = resolveBase();
  const files = changedFiles(base);

  if (files.length === 0) {
    console.log(`No changed files against ${base} for review-hotspot preflight.`);
    return;
  }

  const riskySourceChanges = files.filter(requiresTestCoverage);
  const hasTestChanges = files.some(isTestFile);
  const assertionOffenders = addedTypeAssertions(base);

  const failures = [];

  if (riskySourceChanges.length > 0 && !hasTestChanges) {
    failures.push(
      `Risky decision-logic files changed without tests: ${riskySourceChanges.join(", ")}. Add/adjust tests under tests/*.test.ts.`,
    );
  }

  if (assertionOffenders.length > 0) {
    failures.push(
      [
        `Unsafe type assertions detected in added lines (${assertionOffenders.length}). Prefer runtime validation/narrowing.`,
        ...assertionOffenders.map((offender) => `    ${offender}`),
      ].join("\n"),
    );
  }

  console.log(`Review hotspot preflight: working tree against ${base}`);
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
