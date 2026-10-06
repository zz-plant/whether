/**
 * Running a command for its output, and reading `git status`.
 *
 * The review preflight, the agent workflow helpers and the preview-build gate each had
 * their own copy of "run this, give me trimmed stdout", and the gate marker and the
 * agent doctor each parsed `git status`'s short format themselves. One copy of each.
 */
import { execFileSync } from "node:child_process";

/**
 * A command's stdout, exactly as printed. Throws when it cannot run or exits non-zero,
 * so a caller that has a fallback says so with a `try`. stdin is closed and stderr
 * captured rather than printed.
 *
 * Untrimmed on purpose, for output whose leading whitespace means something: `git status
 * --porcelain` starts an unstaged change with a space, and trimming the whole output
 * shifted the first line's columns — the agent doctor reported ` M docs/README.md` as
 * `M ` and `ocs/README.md`.
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
 * `git status --porcelain` (or `--short`) output as `{ code, path }` per entry: `code` is
 * git's two status columns exactly as printed (`" M"`, `"??"`, `"R "`), and `path` is
 * the rest of the line after the separating space, a rename's `old -> new` included.
 * Blank lines are skipped.
 */
export function parseGitStatus(output) {
  const entries = [];
  for (const line of String(output ?? "").split("\n")) {
    if (line.trim() === "") continue;
    entries.push({ code: line.slice(0, 2), path: line.slice(3) });
  }
  return entries;
}
