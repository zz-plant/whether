/**
 * Running a command for its output, and reading git's view of the working tree.
 * One copy each; the scripts used to carry their own.
 */
import { execFileSync, spawnSync } from "node:child_process";

/**
 * A command's stdout, exactly as printed. Throws when it cannot run or exits non-zero.
 * Untrimmed on purpose: `git status --porcelain` starts an unstaged change with a space.
 */
export function execOutput(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** A command's stdout, trimmed: for a value (a sha, a branch name), not for columns. */
export function execText(command, args, cwd) {
  return execOutput(command, args, cwd).trim();
}

/**
 * `git status --porcelain` output as `{ code, path }` per entry: `code` is git's two status
 * columns exactly as printed (`" M"`, `"??"`, `"R "`), `path` the rest of the line.
 */
export function parseGitStatus(output) {
  const entries = [];
  for (const line of String(output ?? "").split("\n")) {
    if (line.trim() === "") continue;
    entries.push({ code: line.slice(0, 2), path: line.slice(3) });
  }
  return entries;
}

/**
 * What the working tree holds that its commit does not.
 *
 * `null` when git cannot answer at all: a different fact from "nothing changed", and a
 * caller that cannot tell must say so rather than report a clean tree. Tracked drift and
 * untracked files come back separately because a build container may legitimately leave
 * an extra file behind, while a modified tracked file means the tree is not the commit.
 */
export function worktreeDrift(cwd = process.cwd()) {
  const git = (args) => spawnSync("git", args, { cwd, encoding: "utf8" });

  try {
    const head = git(["rev-parse", "HEAD"]);
    const commit = (head.stdout ?? "").trim();
    if (head.status !== 0 || !/^[0-9a-f]{40}$/.test(commit)) return null;

    const status = git(["status", "--porcelain"]);
    if (status.status !== 0) return null;

    const tracked = [];
    const untracked = [];
    for (const { code, path } of parseGitStatus(status.stdout)) {
      if (code === "??") untracked.push(path);
      else tracked.push({ code: code.trim(), path });
    }

    return { commit, tracked, untracked };
  } catch {
    return null;
  }
}
