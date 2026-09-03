/**
 * Records that the deploy gate passed, so the build does not run it a second time.
 *
 * Workers Builds runs `bun run check:vinext` — lint, typecheck, the suite and the
 * asset check, then the landmark audit — and only afterwards runs the deploy
 * command, which reaches `vinext-run build`. That build then ran the *same* five
 * checks again on any non-production branch. Both gates were deliberate and each
 * was documented on its own; nothing recorded that on a preview build the second
 * one could never fail, because the first had just passed on the same tree. It was
 * the single most expensive thing in the build: measured on 2026-09-03 it repeated
 * roughly a minute of checks on every pull-request push, for no signal.
 *
 * Deleting the inner gate would have fixed the waste and given up the guarantee.
 * The build command lives in the Cloudflare dashboard, not in this repo, so no test
 * here can prove it still names `check:vinext` — and "a gate that quietly stops
 * running is worse than no gate at all" is a rule this repo has already paid to
 * learn. So the inner gate stays and gets a way to tell that the work is already
 * done: the outer run leaves a marker naming the commit and the checks that passed,
 * and the build skips only what that marker actually covers. Change the dashboard
 * command and no marker is written, so the inner gate runs the checks itself, as
 * before.
 *
 * The marker is per-container and per-commit by construction: `.cache/` is
 * gitignored and never uploaded, the filename is the commit, and a marker older
 * than MAX_AGE_MS is ignored so a resurrected container cannot vouch for a build
 * it did not run. Written only inside the deploy gate (WHETHER_DEPLOY_GATE=1), so
 * a local `bun run check` leaves nothing behind.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const MARKER_DIRECTORY = join(".cache", "check-gate");

/** Six hours: far longer than any build, far shorter than a container's useful life. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * The commit under test, or "" when there is no commit a record could honestly name.
 *
 * A dirty tree counts as no commit. The marker's whole claim is "these checks passed
 * for this commit", and that is false the moment the tree holds something the commit
 * does not — a marker written for HEAD against modified files would vouch for code
 * nobody checked. The build container checks out clean, so this only ever fires
 * locally, and firing costs a repeated run rather than a skipped gate.
 */
export function headCommit(cwd = process.cwd()) {
  const git = (args) => spawnSync("git", args, { cwd, encoding: "utf8" });

  try {
    const commit = (git(["rev-parse", "HEAD"]).stdout ?? "").trim();
    if (!/^[0-9a-f]{40}$/.test(commit)) return "";

    const status = git(["status", "--porcelain"]);
    if (status.status !== 0 || (status.stdout ?? "").trim() !== "") return "";

    return commit;
  } catch {
    return "";
  }
}

const markerPath = (commit) => join(MARKER_DIRECTORY, `${commit}.json`);

/**
 * The checks already known to pass for `commit`, or an empty array when nothing is
 * recorded, the record is for another commit, or it is too old to trust. Every
 * failure path answers "nothing passed", so a broken marker costs a repeated run
 * rather than a skipped gate.
 */
export function passedChecks(commit = headCommit(), now = Date.now()) {
  if (!commit) return [];

  let record;
  try {
    record = JSON.parse(readFileSync(markerPath(commit), "utf8"));
  } catch {
    return [];
  }

  if (record?.commit !== commit || !Array.isArray(record.tasks)) return [];

  const recordedAt = Date.parse(record.recordedAt ?? "");
  if (!Number.isFinite(recordedAt) || now - recordedAt > MAX_AGE_MS || recordedAt > now) return [];

  return record.tasks.filter((task) => typeof task === "string");
}

/**
 * Add `tasks` to what has passed for `commit`. Unions with an existing record
 * because `check:vinext` is two runs — the four cheap checks, then the landmark
 * audit alone — and the second must not erase the first.
 *
 * Best effort on purpose: a marker that cannot be written means the build runs the
 * checks again, which is the behaviour this replaces.
 */
export function recordPassedChecks(tasks, commit = headCommit()) {
  if (!commit || tasks.length === 0) return false;

  try {
    mkdirSync(MARKER_DIRECTORY, { recursive: true });
    const merged = [...new Set([...passedChecks(commit), ...tasks])].sort();
    writeFileSync(
      markerPath(commit),
      `${JSON.stringify({ commit, tasks: merged, recordedAt: new Date().toISOString() }, null, 2)}\n`,
    );
    return true;
  } catch {
    return false;
  }
}
