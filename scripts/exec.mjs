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
    /* The default is 1 MiB. A push that brings a branch up to date with main hands the
       hotspot preflight a patch of every commit since (161 on 2026-10-27, past 1 MiB), and
       ENOBUFS failed the pre-push gate on a tree identical to main. */
    maxBuffer: 256 * 1024 * 1024,
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

/**
 * Puts every tracked file back to HEAD, for a build container only. Workers Builds restores
 * its build output cache over a fresh clone, so a tracked file can hold the previous build's
 * bytes (`public/` did on 2026-09-17), and git in that container still has the commit's own.
 * Untracked files are left alone. Returns the drift that remains, which is empty when the
 * restore worked, or `null` when git cannot answer. Never call it on a developer's tree:
 * it discards uncommitted edits, which is the point in a container and data loss anywhere else.
 */
export function restoreTrackedFromHead(cwd = process.cwd()) {
  spawnSync("git", ["reset", "--hard", "--quiet", "HEAD"], { cwd, encoding: "utf8" });
  return worktreeDrift(cwd);
}

/**
 * The commit a build should say it is, for `/api/health` (`vite.config.ts`). Workers Builds
 * names it in `WORKERS_CI_COMMIT_SHA`; a local build reads the checkout. A checkout holding
 * anything no commit has, tracked or untracked, is not HEAD: `bun run deploy:cloudflare`
 * builds whatever is on disk, and naming HEAD would answer "is my merge live?" about code
 * that is not running. That build, like one with no readable checkout, says "".
 */
export function buildCommit({ env = process.env, cwd = process.cwd() } = {}) {
  if (env.WORKERS_CI_COMMIT_SHA) return env.WORKERS_CI_COMMIT_SHA;
  const drift = worktreeDrift(cwd);
  if (!drift || drift.tracked.length > 0 || drift.untracked.length > 0) return "";
  return drift.commit;
}
