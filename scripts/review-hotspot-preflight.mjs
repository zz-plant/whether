#!/usr/bin/env node

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

function isAllZeroSha(value) {
  return /^0{40}$/.test(value);
}

function sanitizeBaseRef(base) {
  if (!base || isAllZeroSha(base)) return "";

  try {
    return execText("git", ["rev-parse", "--verify", base]) ? base : "";
  } catch {
    return "";
  }
}

/**
 * What the scan compares, and whether that includes uncommitted work.
 *
 * The two modes differ in a way nothing said out loud. `--base` produces a
 * three-dot range, which is commit-to-commit and ignores the working tree
 * entirely. The default produces a single ref, and `git diff <ref>` compares
 * the working tree against it — so the default scan covers the last commit
 * *and* every uncommitted edit, while the CI mode covers neither's overlap.
 * Someone running `bun run check` before committing was reading a result that
 * included a commit they had already pushed, and someone reading a CI run was
 * reading one that could not see a dirty tree at all.
 *
 * `--working-tree` is the third, explicit case: uncommitted changes only.
 * `describeDiffRange` names whichever applies in the printed output, so the
 * line in the gate log says what was actually compared.
 */

/**
 * The default range, given what HEAD turns out to be.
 *
 * `HEAD~1` is the first parent, which is right for an ordinary commit and wrong
 * for a merge: on "merge the base branch into this PR", the first parent is the
 * pre-merge branch tip, so `git diff HEAD~1` reports every line the *base*
 * brought in as newly added by this change. The pre-push hook failed that way
 * on a routine base merge, flagging an `as` cast that had been on `main` for a
 * day, and the gate's own fix for a merge conflict could not be pushed without
 * `SKIP_PREPUSH=1`.
 *
 * For a merge, the second parent is the branch being merged *in* — the base —
 * so `HEAD^2...HEAD` is "everything on this branch since it last agreed with
 * the base", which is the change under review. It is a three-dot range, so it
 * ignores the working tree, which is the honest reading on a merge commit
 * anyway: what a merge commit contributes is committed by definition.
 *
 * Pure so the decision is testable without building a repository with two
 * parents; the caller supplies what git said.
 */
export function resolveDefaultDiffRange({ hasHeadParent, parentCount }) {
  if (!hasHeadParent) return ["HEAD"];
  /* Two ranges, because one cannot say both things. `HEAD^2...HEAD` is
     commit-to-commit and ignores the working tree, and the default mode's whole
     value is that it sees uncommitted work — a branch cut from this repo's main
     starts at a merge commit, so keying only off the merge would have made every
     fresh branch's edits invisible until the first commit. That is a worse bug
     than the one this fixes. */
  if (parentCount >= 2) return ["HEAD^2...HEAD", "HEAD"];
  return ["HEAD~1"];
}

function countHeadParents() {
  const line = execText("git", ["rev-list", "--parents", "-n", "1", "HEAD"]);
  if (!line) return 0;
  /* "<commit> <parent>..." — every field after the commit itself is a parent. */
  return line.trim().split(/\s+/).length - 1;
}

/** Every range the scan compares, in the order they are reported. */
function getDiffRanges() {
  const base = sanitizeBaseRef(readArg("--base", process.env.REVIEW_HOTSPOT_BASE || ""));
  const head = readArg("--head", process.env.REVIEW_HOTSPOT_HEAD || "HEAD");

  if (hasFlag("--working-tree")) {
    return ["HEAD"];
  }

  if (base) {
    return [`${base}...${head}`];
  }

  try {
    const hasHeadParent = Boolean(execText("git", ["rev-parse", "--verify", "HEAD~1"]));
    return resolveDefaultDiffRange({ hasHeadParent, parentCount: countHeadParents() });
  } catch {
    return ["HEAD"];
  }
}

/** Says, in words, which commits and which uncommitted edits a range covers. */
export function describeDiffRange(diffRange) {
  if (Array.isArray(diffRange)) {
    if (diffRange.length === 1) return describeDiffRange(diffRange[0]);
    return `${diffRange.join(" + ")} (a merge commit: this branch since it last agreed with the base, plus any uncommitted changes)`;
  }
  if (diffRange === "HEAD^2...HEAD") {
    return `${diffRange} (this branch since it last agreed with the base)`;
  }
  if (diffRange.includes("...")) {
    return `${diffRange} (commits only — uncommitted changes are NOT scanned)`;
  }
  if (diffRange === "HEAD") {
    return "HEAD (uncommitted changes only)";
  }
  return `${diffRange} (the last commit plus any uncommitted changes)`;
}

function changedFiles(diffRanges) {
  const files = new Set();
  for (const range of diffRanges) {
    const output = execText("git", ["diff", "--name-only", range]);
    if (!output) continue;
    for (const file of output.split("\n")) {
      const trimmed = file.trim();
      if (trimmed) files.add(trimmed);
    }
  }
  return [...files];
}

/**
 * Line numbers (1-based) that sit inside a comment. Exported because the scanner reads
 * comment state from the file rather than from the diff: tracking the block-comment open and
 * close markers across added lines alone only works when the opening `/**` is itself added,
 * so editing the middle of an existing doc comment used to hand the matcher bare prose.
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
  // not override or narrow a runtime value. Both forms: the named rename, and the
  // namespace import — `import * as nextNavigation from "next/navigation"`, which
  // this refused until a test needed one to spread the real module over a mock.
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

function addedTypeAssertions(diffRanges) {
  return [...new Set(diffRanges.flatMap((range) => addedTypeAssertionsForRange(range)))];
}

function addedTypeAssertionsForRange(diffRange) {
  const diff = execText("git", ["diff", "--unified=0", diffRange, "--", "*.ts", "*.tsx"]);
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
    console.log([
      "Review hotspot preflight",
      "",
      "Usage:",
      "  node scripts/review-hotspot-preflight.mjs [--base <sha>] [--head <sha>] [--working-tree]",
      "",
      "What each mode compares:",
      "  (default)       the last commit plus any uncommitted changes",
      "  --base <sha>    commit-to-commit; uncommitted changes are NOT scanned",
      "  --working-tree  uncommitted changes only",
      "",
    ].join("\n"));
    process.exit(0);
  }

  const diffRange = getDiffRanges();
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
    /*
     * Name them. `addedTypeAssertions` has collected `file: line` for each one
     * since this check existed, and the report printed only the count — so the
     * gate said "one unsafe assertion" and left you to find it by eye across the
     * whole range. A count is a verdict; the offender is the thing you can act
     * on, and withholding it is the same defect `run-checks.mjs` was fixed for
     * on 2026-09-15.
     */
    failures.push(
      [
        `Unsafe type assertions detected in added lines (${assertionOffenders.length}). Prefer runtime validation/narrowing.`,
        ...assertionOffenders.map((offender) => `    ${offender}`),
      ].join("\n"),
    );
  }

  console.log(`Review hotspot preflight range: ${describeDiffRange(diffRange)}`);
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
