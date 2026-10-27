#!/usr/bin/env node
/**
 * Review preflight: the working tree compared with a base commit.
 *
 * Fails when a decision-logic file changed with no test change beside it, or when an
 * added line carries an `as` type assertion. One comparison: `base` to `head`, where head
 * is the working tree unless a commit is named, so a local run judges committed and
 * uncommitted work together.
 *
 *   base = --base <ref> | REVIEW_HOTSPOT_BASE | merge-base with main | HEAD~1
 *   head = --head <ref> | REVIEW_HOTSPOT_HEAD | the working tree
 *
 * The merge-base default means a branch is judged on what it changes against main,
 * however many commits that is, and a merge commit does not read the base's own lines
 * as new. On main itself (merge-base is HEAD) the last commit is the base. The pre-push
 * hook passes the remote and local shas, so a push is judged on exactly the commits it
 * sends, whichever ref is checked out. docs/agents/lessons/tests-and-copy-rules.md.
 *
 * Usage:
 *   node scripts/review-hotspot-preflight.mjs [--base <ref>] [--head <ref>]
 */

import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { execOutput, execText } from "./exec.mjs";

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

/** What `git diff` compares `base` with: a named commit, or the working tree when none is. */
function resolveHead() {
  return verifiedRef(readArg("--head", process.env.REVIEW_HOTSPOT_HEAD || ""));
}

function changedFiles(base, head) {
  const output = execText("git", ["diff", "--name-only", base, ...(head ? [head] : [])]);
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

function addedTypeAssertions(base, head) {
  const diff = execText("git", ["diff", "--unified=0", base, ...(head ? [head] : []), "--", "*.ts", "*.tsx"]);
  if (!diff) return [];

  // Comment context comes from the same tree the diff's new side describes: the named head
  // commit when there is one, the working tree otherwise. `execOutput`, not `execText`: a
  // trimmed leading blank line would shift every line number.
  const commentLinesFor = (file) => {
    if (head) {
      try {
        return blockCommentLines(execOutput("git", ["show", `${head}:${file}`]));
      } catch {
        return new Set();
      }
    }
    return existsSync(file) ? blockCommentLines(readFileSync(file, "utf8")) : new Set();
  };

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
      "  node scripts/review-hotspot-preflight.mjs [--base <ref>] [--head <ref>]",
      "",
      "Compares <base> with <head>, or with the working tree when no head is given.",
      "Default base: the merge-base with main, or HEAD~1 on main itself.",
      "REVIEW_HOTSPOT_BASE and REVIEW_HOTSPOT_HEAD set them from the environment.",
      "",
    ].join("\n"));
    process.exit(0);
  }

  const base = resolveBase();
  const head = resolveHead();
  const compared = head ? `${base}..${head}` : `working tree against ${base}`;
  const files = changedFiles(base, head);

  if (files.length === 0) {
    console.log(`No changed files (${compared}) for review-hotspot preflight.`);
    return;
  }

  const riskySourceChanges = files.filter(requiresTestCoverage);
  const hasTestChanges = files.some(isTestFile);
  const assertionOffenders = addedTypeAssertions(base, head);

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

  console.log(`Review hotspot preflight: ${compared}`);
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
