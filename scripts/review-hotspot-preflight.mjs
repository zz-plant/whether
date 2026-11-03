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
 * hook passes a base and the local sha from scripts/pre-push-range.mjs, so a push is judged
 * on the commits it sends, less whatever it brings in from main, whichever ref is checked
 * out. Assertions are read from the parsed file, so a comment, a string or JSX text cannot
 * look like one. docs/agents/lessons/tests-and-copy-rules.md.
 *
 * Usage:
 *   node scripts/review-hotspot-preflight.mjs [--base <ref>] [--head <ref>]
 */

import { readFileSync } from "node:fs";
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
 * The lines (1-based) of the file that hold an `as` type assertion, read from its syntax
 * tree: `as const` narrows nothing and stays allowed. `null` when the file does not parse.
 * The file name picks the grammar, since `<T>value` means something else in `.tsx`. The
 * parser loads on first use (about 0.7s), so a run with no TypeScript to read never pays.
 */
export async function typeAssertionLines(file, source) {
  const { parseSync, Visitor } = await import("rolldown/utils");
  const { program, errors } = parseSync(file, source);
  if (errors.length > 0) return null;

  const lines = new Set();
  new Visitor({
    TSAsExpression({ typeAnnotation }) {
      if (typeAnnotation.type === "TSTypeReference" && typeAnnotation.typeName.name === "const") return;
      lines.add(source.slice(0, typeAnnotation.start).split("\n").length);
    },
  }).visit(program);
  return lines;
}

/**
 * The lines each file gains in a `--unified=0` diff, from the hunk headers alone. The counts
 * say how many lines to skip, so added code that reads like a header (`++ b/x`) stays code.
 */
export function addedLinesByFile(diff) {
  const added = new Map();
  let lines = null;
  let bodyLeft = 0;

  for (const line of diff.split("\n")) {
    if (bodyLeft > 0) {
      if (!line.startsWith("\\")) bodyLeft -= 1;
      continue;
    }
    if (line.startsWith("+++ b/")) {
      lines = new Set();
      added.set(line.slice("+++ b/".length), lines);
      continue;
    }
    const hunk = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk || !lines) continue;
    const removed = Number(hunk[1] ?? 1);
    const start = Number(hunk[2]);
    const count = Number(hunk[3] ?? 1);
    for (let offset = 0; offset < count; offset += 1) lines.add(start + offset);
    bodyLeft = removed + count;
  }

  return added;
}

async function addedTypeAssertions(base, head) {
  const diff = execText("git", ["diff", "--unified=0", base, ...(head ? [head] : []), "--", "*.ts", "*.tsx"]);
  if (!diff) return [];

  // The file comes from the same tree the diff's new side describes: the named head commit
  // when there is one, the working tree otherwise. `execOutput`, not `execText`: a trimmed
  // leading blank line would shift every line number.
  const read = (file) => (head ? execOutput("git", ["show", `${head}:${file}`]) : readFileSync(file, "utf8"));

  const offenders = [];
  for (const [file, added] of addedLinesByFile(diff)) {
    if (added.size === 0) continue;
    const source = read(file);
    const assertions = await typeAssertionLines(file, source);
    if (!assertions) {
      offenders.push(`${file}: does not parse, so its assertions cannot be read`);
      continue;
    }
    const sourceLines = source.split("\n");
    for (const line of assertions) {
      if (added.has(line)) offenders.push(`${file}: ${sourceLines[line - 1].trim()}`);
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

async function main() {
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
  const assertionOffenders = await addedTypeAssertions(base, head);

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
  await main();
}
