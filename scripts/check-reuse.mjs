/**
 * A check that passed on a tree need not run again on the same tree.
 *
 * `bun run check` and the pre-push hook run the same tasks, and 202 of 421 pushes in three
 * months of agent sessions followed a passing `bun run check` within six turns: the same
 * suite, lint, types and landmark audit, twice, on an unchanged tree, about 38s each time.
 * `scripts/run-checks.mjs` records each pass against a fingerprint of the working tree, and
 * the pre-push preset skips a task whose pass is recorded for the tree it is about to judge.
 *
 * What makes that the same verdict and not a weaker one:
 * - the fingerprint is the content the task read: the tree git would write if every file
 *   on disk were added, plus the bun version. One changed byte is a new fingerprint,
 *   including a change by another session in a shared worktree. Committing the same
 *   bytes is not a change;
 * - a pass is recorded only if the fingerprint is the same after the run as before it;
 * - only tasks whose verdict is a function of the tree are reused (`REUSABLE_TASKS` in
 *   scripts/check-tasks.mjs). `hotspot-preflight` judges a push range and always runs;
 * - a pass stands for an hour. A few tests read the calendar, so a pass is not kept
 *   across a day;
 * - the deploy gate neither records nor reuses. Workers Builds runs every task on every push.
 *
 * The record lives in the worktree's git directory, not the working tree: a file there
 * would change the fingerprint it describes.
 */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** How long a recorded pass stands. */
export const REUSE_WINDOW_MS = 60 * 60 * 1000;

const RECORD_VERSION = 1;
const RECORD_NAME = "whether-check-passes.json";

/**
 * Variables under which a task judges something other than the tree as the gate would:
 * a live network, another NODE_ENV, another server, or the deploy gate's own scope and order.
 */
const VERDICT_CHANGING_ENV = [
  "WHETHER_DEPLOY_GATE",
  "WHETHER_TEST_ALLOW_NETWORK",
  "WHETHER_TEST_NODE_ENV",
  "LANDMARKS_BASE_URL",
];

/** The variable that rules reuse out for this run, or `null`. Such a run neither records nor reuses. */
export function reuseBlockedBy(env = process.env) {
  return VERDICT_CHANGING_ENV.find((name) => (env[name] ?? "") !== "") ?? null;
}

const git = (cwd, args, env = process.env) =>
  spawnSync("git", args, { cwd, env, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 });

const gitPath = (cwd, name) => {
  const result = git(cwd, ["rev-parse", "--git-path", name]);
  const relative = result.status === 0 ? result.stdout.toString("utf8").trim() : "";
  return relative ? path.resolve(cwd, relative) : null;
};

/**
 * The tree git would commit if everything on disk were added: every tracked file as it is
 * now, every untracked file git does not ignore, and nothing that was deleted. Built in a
 * throwaway copy of the index, so the real index, the branch and the stash are untouched.
 *
 * It names content, not history: the same bytes give the same tree whether they are
 * uncommitted, staged or committed, so a `bun run check` before the commit still stands
 * for the push after it. `null` when git cannot answer, which a caller treats as
 * "nothing to reuse".
 */
function treeFingerprint(cwd = process.cwd(), bunVersion = globalThis.Bun?.version ?? "") {
  const scratch = path.join(tmpdir(), `whether-check-index-${process.pid}-${randomUUID()}`);
  try {
    const index = gitPath(cwd, "index");
    if (!index) return null;
    try {
      // Starting from the real index keeps its stat cache, so only changed files are re-hashed.
      copyFileSync(index, scratch);
    } catch {
      // No index yet (a repository with nothing added): git starts the scratch one empty.
    }
    const env = { ...process.env, GIT_INDEX_FILE: scratch };
    if (git(cwd, ["add", "--all"], env).status !== 0) return null;
    const tree = git(cwd, ["write-tree"], env);
    const sha = tree.status === 0 ? tree.stdout.toString("utf8").trim() : "";
    return /^[0-9a-f]{40,64}$/.test(sha) ? `tree ${sha} bun ${bunVersion}` : null;
  } catch {
    return null;
  } finally {
    rmSync(scratch, { force: true });
    rmSync(`${scratch}.lock`, { force: true });
  }
}

/** Where this worktree's record lives: inside its git directory. `null` outside a checkout. */
function passRecordPath(cwd = process.cwd()) {
  return gitPath(cwd, RECORD_NAME);
}

const emptyRecord = (fingerprint) => ({ version: RECORD_VERSION, fingerprint, passes: {} });

/** The record on disk, or `null` when there is none or it cannot be read as one. */
function readPassRecord(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (parsed?.version !== RECORD_VERSION || typeof parsed.fingerprint !== "string") return null;
    if (typeof parsed.passes !== "object" || parsed.passes === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * How long ago `task` passed on the tree `fingerprint` names, in milliseconds, or `null`
 * when the record is for another tree, has no pass for the task, or the pass is older than
 * the window. A pass dated in the future is a clock that moved, and counts as none.
 */
export function passAge(record, fingerprint, task, now = Date.now()) {
  if (!record || !fingerprint || record.fingerprint !== fingerprint) return null;
  const passedAt = Object.hasOwn(record.passes, task) ? record.passes[task] : undefined;
  if (typeof passedAt !== "number" || !Number.isFinite(passedAt)) return null;
  const age = now - passedAt;
  return age >= 0 && age <= REUSE_WINDOW_MS ? age : null;
}

/** `record` with `tasks` passing at `now` on `fingerprint`. A record for another tree is dropped, not merged. */
export function withPasses(record, fingerprint, tasks, now = Date.now()) {
  const base = record && record.fingerprint === fingerprint ? record : emptyRecord(fingerprint);
  const passes = { ...base.passes };
  for (const task of tasks) passes[task] = now;
  return { ...base, passes };
}

/**
 * The run's handle on the record. `null` when reuse cannot apply at all: the deploy gate or
 * another verdict-changing variable, no git checkout, or nowhere to keep the record.
 *
 * `ageOf(task)` answers from the tree as it was when the run started. `record(tasks)` writes
 * the passes only if the tree is still that tree, and returns whether it wrote.
 */
export function openReuse({ cwd = process.cwd(), env = process.env, now = () => Date.now() } = {}) {
  if (reuseBlockedBy(env)) return null;
  const file = passRecordPath(cwd);
  const fingerprint = file ? treeFingerprint(cwd) : null;
  if (!file || !fingerprint) return null;

  const atStart = readPassRecord(file);
  return {
    ageOf: (task) => passAge(atStart, fingerprint, task, now()),
    record: (tasks) => {
      if (tasks.length === 0) return true;
      if (treeFingerprint(cwd) !== fingerprint) return false;
      try {
        // Re-read: another run on the same tree may have recorded its own passes meanwhile.
        writeFileSync(file, `${JSON.stringify(withPasses(readPassRecord(file), fingerprint, tasks, now()))}\n`);
        return true;
      } catch {
        return false;
      }
    },
  };
}
