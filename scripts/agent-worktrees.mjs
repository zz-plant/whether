#!/usr/bin/env node
/**
 * Lists the checkout's git worktrees with the facts that decide whether one can go:
 * branch, last commit, dirty files, how far ahead of main it is, and size. `--prune`
 * removes only worktrees that are clean, not the main checkout, and older than 14 days
 * (`--older-than <days>` changes it), and only with `--yes`. A branch worktree is safe to
 * remove because the branch ref keeps its commits; a detached HEAD is only removed when
 * it is merged into main. Nothing dirty is ever removed.
 *
 * The machine carried 17 worktrees and 16GB under `.claude/worktrees` on 2026-11-08,
 * most of them weeks old and clean. They slow filesystem walks and make `git worktree
 * list` unreadable, which is a tax on every agent session.
 *
 * Usage:
 *   bun run agent:worktrees
 *   bun run agent:worktrees -- --size
 *   bun run agent:worktrees -- --prune          # print what would go
 *   bun run agent:worktrees -- --prune --yes    # remove it
 */
import { execFileSync, spawnSync } from "node:child_process";

import { execOutput } from "./exec.mjs";

/** `git worktree list --porcelain` → one record per worktree. */
export function parseWorktreeList(output) {
  const entries = [];
  let current = null;

  for (const line of output.split("\n")) {
    if (!line.trim()) {
      if (current) entries.push(current);
      current = null;
      continue;
    }

    const space = line.indexOf(" ");
    const key = space === -1 ? line : line.slice(0, space);
    const value = space === -1 ? "" : line.slice(space + 1);

    if (key === "worktree") {
      if (current) entries.push(current);
      current = { path: value, head: "", branch: "", detached: false, locked: false, prunable: "" };
      continue;
    }
    if (!current) continue;
    if (key === "HEAD") current.head = value;
    else if (key === "branch") current.branch = value.replace(/^refs\/heads\//, "");
    else if (key === "detached") current.detached = true;
    else if (key === "locked") current.locked = true;
    else if (key === "prunable") current.prunable = value;
  }

  if (current) entries.push(current);
  return entries;
}

/**
 * A worktree can go when it is not the main checkout, not locked, clean, and old enough.
 * A branch worktree is safe to remove because the branch ref keeps its commits; a detached
 * HEAD is only safe when it is already merged into main. Anything else needs a human.
 */
export function isPrunable(entry, { mainPath, merged, branchExists, ageDays = 0, minAgeDays = 0 }) {
  if (entry.path === mainPath || entry.locked || entry.prunable || entry.dirty !== 0) return false;
  if (ageDays < minAgeDays) return false;
  if (entry.branch) return branchExists;
  return merged;
}

function git(path, args) {
  // A worktree can live under a protected folder (macOS Documents) or on a slow volume.
  // Bound every call so one unreachable checkout cannot hang the report.
  return spawnSync("git", ["-C", path, ...args], {
    encoding: "utf8",
    timeout: 5000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

function inspect(entry) {
  const dirtyOutput = git(entry.path, ["status", "--porcelain"]);
  const dirty = dirtyOutput.status === 0 ? dirtyOutput.stdout.split("\n").filter((line) => line.trim()).length : -1;
  const last = git(entry.path, ["log", "-1", "--format=%cs"]);
  const merged = git(entry.path, ["merge-base", "--is-ancestor", "HEAD", "main"]).status === 0;
  const aheadOutput = git(entry.path, ["rev-list", "--count", "main..HEAD"]);
  const ahead = aheadOutput.status === 0 ? Number.parseInt(aheadOutput.stdout.trim(), 10) || 0 : -1;
  return {
    ...entry,
    dirty,
    last: last.status === 0 ? last.stdout.trim() : "?",
    merged,
    ahead,
  };
}

function sizeOf(path) {
  try {
    return execFileSync("du", ["-sh", path], { encoding: "utf8", timeout: 5000 }).split("\t")[0];
  } catch {
    return "?";
  }
}

function main() {
  const args = process.argv.slice(2);
  const withSize = args.includes("--size");
  const prune = args.includes("--prune");
  const confirmed = args.includes("--yes");
  const olderIndex = args.indexOf("--older-than");
  const minAgeDays = olderIndex === -1 ? 14 : Number.parseInt(args[olderIndex + 1] ?? "14", 10) || 14;
  const root = process.cwd();

  const entries = parseWorktreeList(execOutput("git", ["worktree", "list", "--porcelain"], root));
  const mainPath = entries[0]?.path ?? execText("git", ["rev-parse", "--show-toplevel"], root);
  const rows = entries.map((entry) => (entry.path === mainPath ? { ...entry, dirty: 0, last: "main", merged: true, ahead: 0 } : inspect(entry)));
  const branchExists = (branch) =>
    branch !== "" && spawnSync("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: root }).status === 0;

  const header = ["LAST", "DIRTY", "AHEAD", "MERGED", "BRANCH", "PATH"];
  if (withSize) header.splice(1, 0, "SIZE");
  console.log(header.join("\t"));

  for (const row of rows) {
    const cells = [row.last, row.dirty, row.ahead, row.merged ? "yes" : "no", row.branch || (row.detached ? "(detached)" : ""), row.path];
    if (withSize) cells.splice(1, 0, sizeOf(row.path));
    console.log(cells.join("\t"));
  }

  const ageDays = (row) => (row.last === "main" || row.last === "?" ? 0 : (Date.now() - Date.parse(row.last)) / 86_400_000);
  const prunable = rows.filter((row) =>
    isPrunable(row, { mainPath, merged: row.merged, branchExists: branchExists(row.branch), ageDays: ageDays(row), minAgeDays }),
  );

  if (!prune) {
    if (prunable.length > 0) {
      console.log(`\n${prunable.length} clean worktree(s) older than ${minAgeDays} day(s) can be removed with --prune --yes.`);
    }
    return;
  }

  if (prunable.length === 0) {
    console.log(`\nNothing clean and older than ${minAgeDays} day(s) to prune.`);
    return;
  }

  for (const row of prunable) {
    if (!confirmed) {
      console.log(`would remove ${row.path} (${row.branch || "detached"})`);
      continue;
    }
    const result = git(root, ["worktree", "remove", row.path]);
    console.log(result.status === 0 ? `removed ${row.path}` : `failed to remove ${row.path}: ${result.stderr.trim()}`);
  }

  if (!confirmed) console.log("\nRe-run with --prune --yes to remove them.");
  else execFileSync("git", ["worktree", "prune"], { cwd: root });
}

if (import.meta.main) {
  main();
}
