#!/usr/bin/env node
/**
 * Runs repo checks concurrently.
 *
 * lint, typecheck, and test read the same sources and produce nothing the others
 * consume, so running them in sequence just adds their durations together — the
 * serial form spent roughly 90s to do about 35s of work. They run together here,
 * and their output is still emitted in declaration order so a parallel run reads
 * exactly like the serial one did.
 *
 * Every task runs even if an earlier one fails: a single run reports the lint
 * errors and the type errors, rather than surfacing them one build at a time.
 *
 * Usage:
 *   bun scripts/run-checks.mjs                     # every task
 *   bun scripts/run-checks.mjs lint typecheck test # only these, still concurrent
 *   bun scripts/run-checks.mjs --serial            # fail-fast sequencing
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { availableParallelism } from "node:os";

import { recordPassedChecks } from "./check-gate-marker.mjs";

const TASKS = [
  { name: "lint", script: "lint" },
  /*
   * Type-aware oxlint, advisory since 2026-09-06 and enforced from 2026-09-16.
   * It catches what the syntactic pass structurally cannot — a floating promise,
   * a value stringified through `Object.prototype.toString` — and it sat at zero
   * for ten days. It was at zero, rather: the two findings that promoting it
   * surfaced were both in code written the day before, one of them the exact
   * `RequestInfo | URL` trap the burn-down had already cleared from eight test
   * files. Advisory means nobody runs it, which is the whole argument.
   *
   * On pre-push and `bun run check`, not the deploy gate. It reads the type
   * graph, so it is the slowest task here, and CLAUDE.md records one run that
   * reported findings later runs could not reproduce. A check that might flake
   * belongs where a human is standing next to it, not where the only log is one
   * nobody can read.
   */
  { name: "lint:types", script: "lint:types" },
  { name: "typecheck", script: "typecheck" },
  { name: "test", script: "test" },
  { name: "assets", script: "assets:check" },
  // Guards every other ratchet in this gate. Each one — the disabled-rule
  // burn-down, lint:types, the suite — can be turned green by suppressing the
  // finding instead of fixing it, and no other task here notices. This counts
  // the suppressions themselves, so the shortcut costs more than the fix.
  { name: "suppressions", script: "check:suppressions" },
  // An export nothing references is not a lint finding, a type error, or a
  // failing test, so nothing else here notices one. A 2026-09-15 sweep found
  // 556 of them; this holds the count at zero.
  { name: "dead-exports", script: "check:dead-exports" },
  // The hand-curated macro series have no live fetcher, so nothing in the
  // ingest path refreshes them and nothing else notices when the quarterly
  // curation pass slips. Warn-only by default; see the script header for why.
  { name: "curated-freshness", script: "check:curated-freshness" },
  // Gated at `critical` on purpose. There are currently 38 high advisories, all
  // in transitive dev/build dependencies (picomatch via vinext's glob chain, for
  // one) rather than anything the Worker ships. Blocking on those would make
  // this permanently red, which is exactly how the old dependency-review check
  // became worthless. `bun audit` still prints the full report, so the highs
  // stay visible; only a critical advisory stops the build.
  { name: "audit", script: "audit" },
  { name: "hotspot-preflight", script: "review:hotspot-preflight" },
  // Boots a dev server and fetches every route: the skip-link target is
  // assembled from layouts and shells at request time, so nothing cheaper sees
  // a duplicated or missing <main>.
  { name: "landmarks", script: "check:landmarks" },
];

const args = process.argv.slice(2);
const serial = args.includes("--serial") || process.env.CHECK_SERIAL === "1";
const requested = args.filter((arg) => !arg.startsWith("-"));

const unknown = requested.filter((name) => !TASKS.some((task) => task.name === name));
if (unknown.length > 0) {
  process.stderr.write(
    `Unknown check(s): ${unknown.join(", ")}\nAvailable: ${TASKS.map((t) => t.name).join(", ")}\n`,
  );
  process.exit(2);
}

const selected = requested.length > 0 ? TASKS.filter((t) => requested.includes(t.name)) : TASKS;

/*
 * Cloudflare Workers Builds restores its build output cache directly over the
 * git clone. When the build output directory or cache includes tracked files
 * (such as public/ or generated artifacts), that restore stomps committed files
 * with whatever stale state was saved in a prior run.
 * Inside the deploy gate in remote CI, restore tracked files to HEAD before
 * any checks run.
 */
const inRemoteBuild = Boolean(
  process.env.WORKERS_CI === "1" ||
    process.env.WORKERS_CI_BUILD_UUID ||
    process.env.CF_PAGES === "1" ||
    process.env.CI === "1" ||
    process.env.CI === "true" ||
    process.env.WHETHER_FORCE_HEAD_RESTORE === "1",
);

if (process.env.WHETHER_DEPLOY_GATE === "1" && inRemoteBuild) {
  try {
    const diff = spawnSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" });
    const modified = (diff.stdout ?? "").trim();
    if (diff.status === 0 && modified.length > 0) {
      const checkout = spawnSync("git", ["checkout", "HEAD", "--", "."], { encoding: "utf8" });
      if (checkout.status === 0) {
        const fileList = modified
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean)
          .join(", ");
        process.stdout.write(`[run-checks] restored tracked files stomped by build cache restore: ${fileList}\n`);
      }
    }
  } catch {
    // Best-effort if git is unavailable in the environment
  }
}

/*
 * tsc and bun test are each CPU- and memory-hungry (oxlint finishes in seconds). Running more of them
 * at once than the box has cores trades wall clock for thrash, and on a small CI
 * container it is also the difference between fitting in memory and not.
 */
const limit = Math.max(1, Math.min(selected.length, availableParallelism()));

// Piping the children's output strips their color detection. Hand it back when
// the parent is attached to a terminal, so local runs stay as readable as before.
const childEnv = process.stdout.isTTY
  ? { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? "1" }
  : process.env;

const running = new Set();
let aborted = false;

// Without this, Ctrl-C would detach the parent and leave oxlint/tsc/bun test
// running in the background.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    aborted = true;
    for (const child of running) child.kill(signal);
    process.exit(130);
  });
}

/*
 * A task that hangs used to hang the whole gate. `runTask` resolved only on the
 * child's `close` or `error`, and output is buffered until then — so on
 * 2026-08-31 the landmarks check waited on a route that never answered, printed
 * nothing, and the six finished tasks were the last thing anyone saw before
 * Cloudflare killed the build at its thirty-minute ceiling. "Build took too long"
 * was the entire diagnosis available.
 *
 * A bound turns that into a named failure with the child's output attached. Ten
 * minutes is far above any real task here (the slowest, the test suite, takes about
 * 35s in the build container) and far below the ceiling, so it only ever fires on a hang.
 */
const TASK_TIMEOUT_MS = Number.parseInt(process.env.CHECK_TASK_TIMEOUT_MS ?? "600000", 10);

if (!Number.isFinite(TASK_TIMEOUT_MS) || TASK_TIMEOUT_MS <= 0) {
  console.error("CHECK_TASK_TIMEOUT_MS must be a positive integer of milliseconds.");
  process.exit(1);
}

const runTask = (task) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn("bun", ["run", task.script], {
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    running.add(child);

    let output = "";
    const collect = (chunk) => {
      output += chunk;
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    let settled = false;
    let timer;

    const settle = (ok, extra = "") => {
      // The kill below still delivers `close`, so without this the timeout path
      // would be overwritten by the exit it just caused.
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      running.delete(child);
      resolve({ task, ok, output: output + extra, ms: Date.now() - startedAt });
    };

    timer = setTimeout(() => {
      child.kill("SIGTERM");
      // SIGTERM is enough for a well-behaved child; a wedged one needs the second.
      const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
      force.unref?.();
      settle(
        false,
        `\n[run-checks] ${task.name} produced no result within ${TASK_TIMEOUT_MS >= 1000 ? `${Math.round(TASK_TIMEOUT_MS / 1000)}s` : `${TASK_TIMEOUT_MS}ms`} and was killed.` +
          ` Its output up to that point is above. Override with CHECK_TASK_TIMEOUT_MS.\n`,
      );
    }, TASK_TIMEOUT_MS);

    child.on("error", (error) => settle(false, `\n${error.message}\n`));
    child.on("close", (code) => settle(code === 0));
  });

/** How much of a failing task's output the end-of-run repeat carries. */
const FAILURE_TAIL_LINES = Number.parseInt(process.env.CHECK_FAILURE_TAIL_LINES ?? "40", 10);

/**
 * A one-line note when the running `bun` does not satisfy `engines.bun`.
 *
 * Deliberately a note and not a failure: the declared range is what this repo
 * develops against, and a build image on something older may still be fine.
 * What must not happen is the mismatch going unmentioned next to a failure it
 * could explain.
 */
const engineMismatch = () => {
  try {
    const declared = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).engines?.bun;
    if (typeof declared !== "string") return null;
    const floor = declared.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!floor) return null;
    const [runningMajor, runningMinor, runningPatch] = Bun.version.split(".").map(Number);
    const [, major, minor, patch] = floor.map(Number);
    const older =
      runningMajor < major ||
      (runningMajor === major && (runningMinor < minor || (runningMinor === minor && runningPatch < patch)));
    return older ? ` — older than engines.bun "${declared}", which is what this repo is developed against` : null;
  } catch {
    return null;
  }
};

/** Lines worth lifting out of a long run: what each of these tools calls a failure. */
const FAILURE_LINE_PATTERN = /\(fail\)|^\s*✗|AssertionError|error: |Error: |^\s*✘|FAIL /;
const FAILURE_MARKED_LINES = 20;

const formatDuration = (ms) => `${(ms / 1000).toFixed(1)}s`;

const report = ({ task, ok, output, ms }) => {
  process.stdout.write(`\n${ok ? "✅" : "❌"} ${task.name} (${formatDuration(ms)})\n`);
  const trimmed = output.trim();
  if (trimmed) process.stdout.write(`${trimmed}\n`);
};

const startedAt = Date.now();
const results = [];

if (serial) {
  for (const task of selected) {
    const result = await runTask(task);
    results.push(result);
    report(result);
    if (!result.ok) break;
  }
} else {
  const queue = [...selected];
  const pending = new Map();

  // Await in declaration order so output order never depends on finish order,
  // while keeping `limit` tasks in flight.
  for (const task of selected) {
    while (pending.size < limit && queue.length > 0) {
      const next = queue.shift();
      pending.set(next, runTask(next));
    }

    const result = await pending.get(task);
    pending.delete(task);
    results.push(result);
    report(result);

    if (aborted) break;
  }
}

const failed = results.filter((result) => !result.ok);
const notRun = selected.length - results.length;

/*
 * Inside the deploy gate, leave a note of what passed so `vinext-run build` does not
 * repeat it. `check:vinext` is the outer gate and the build is reached afterwards;
 * until 2026-09-03 both ran the same five checks against the same commit. See
 * scripts/check-gate-marker.mjs for why the inner gate is skipped rather than deleted.
 */
if (process.env.WHETHER_DEPLOY_GATE === "1") {
  const passed = results.filter((result) => result.ok).map((result) => result.task.name);
  if (passed.length > 0 && recordPassedChecks(passed)) {
    process.stdout.write(`[run-checks] recorded for this commit: ${passed.join(", ")}\n`);
  }
}

process.stdout.write(
  `\n${failed.length === 0 ? "All checks passed" : `${failed.length} check(s) failed: ${failed.map((r) => r.task.name).join(", ")}`}` +
    ` in ${formatDuration(Date.now() - startedAt)}${notRun > 0 ? ` (${notRun} not run)` : ""}\n`,
);

/*
 * Repeat each failure at the very end, with the tail of its own output.
 *
 * The full report above is printed task by task as they finish, and a passing
 * `test` task alone can be 1,700 lines on a runner whose `bun` prints a line
 * per test. Cloudflare's build log viewer keeps a bounded window, so on a red
 * build the `❌` line and the assertion that caused it scroll out of reach and
 * the only thing left is `exited with code 1` — which is the whole diagnosis,
 * and the same "a red build is unreadable" failure this file already fixed once
 * with per-task timeouts. Whatever the window keeps, it keeps the end, so the
 * end has to carry enough to act on.
 */
if (failed.length > 0) {
  /*
   * The runtime, in the part of the log that survives.
   *
   * `package.json` declares `engines.bun`, and nothing enforces it: a build
   * image that ships its own `bun` runs the gate on whatever it has. That is
   * not a hypothetical — a container failing this gate in September 2026 was
   * printing a line per passing test, which only `bun` 1.1.x does, while the
   * repo pinned 1.3.14. Whoever reads the failure should not have to infer the
   * toolchain from its output formatting.
   */
  process.stdout.write(`\n[run-checks] ran on bun ${Bun.version}${engineMismatch() ?? ""}\n`);

  for (const result of failed) {
    const lines = result.output.trimEnd().split("\n");
    const tail = lines.slice(-FAILURE_TAIL_LINES);
    process.stdout.write(`\n───── ${result.task.name} failed (\`bun run ${result.task.script}\`) ─────\n`);

    /*
     * The tail alone is not enough for the suite: bun reports a failing test
     * where it runs, which on 1,700 tests is hundreds of lines before the end.
     * These lines are the answer to "what failed", so they are lifted out and
     * printed first, and the tail follows as context.
     */
    const marked = lines.filter((line) => FAILURE_LINE_PATTERN.test(line) && !tail.includes(line));
    if (marked.length > 0) {
      const shown = marked.slice(0, FAILURE_MARKED_LINES);
      process.stdout.write(`[run-checks] failure lines${marked.length > shown.length ? ` (first ${shown.length} of ${marked.length})` : ""}:\n`);
      process.stdout.write(`${shown.join("\n")}\n\n`);
    }

    if (lines.length > tail.length) {
      process.stdout.write(`[run-checks] last ${tail.length} of ${lines.length} lines; the rest is above.\n`);
    }
    process.stdout.write(`${tail.join("\n")}\n`);
  }
}

process.exit(failed.length === 0 ? 0 : 1);
