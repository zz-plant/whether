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
import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";

const TASKS = [
  { name: "lint", script: "lint" },
  { name: "typecheck", script: "typecheck" },
  { name: "test", script: "test" },
  { name: "assets", script: "assets:check" },
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

process.stdout.write(
  `\n${failed.length === 0 ? "All checks passed" : `${failed.length} check(s) failed: ${failed.map((r) => r.task.name).join(", ")}`}` +
    ` in ${formatDuration(Date.now() - startedAt)}${notRun > 0 ? ` (${notRun} not run)` : ""}\n`,
);

process.exit(failed.length === 0 ? 0 : 1);
