#!/usr/bin/env node
/**
 * Runs repo checks concurrently, every task even when one fails, with output in
 * declaration order. Tasks and presets are declared in scripts/check-tasks.mjs; a preset
 * can have stages, and the next stage starts only after the one before it passed.
 *
 * Usage:
 *   bun scripts/run-checks.mjs                     # every task
 *   bun scripts/run-checks.mjs lint typecheck test # only these, still concurrent
 *   bun scripts/run-checks.mjs --preset pre-push   # what .husky/pre-push runs
 *   bun scripts/run-checks.mjs --preset deploy     # the deploy gate (`check:vinext`)
 *   bun scripts/run-checks.mjs --serial            # fail-fast sequencing
 *
 * Why the gate refuses a drifted tree, bounds each task, and repeats failures at the end:
 * docs/agents/lessons/automation-and-deploy-gate.md.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { availableParallelism } from "node:os";

import { resolveCheckPlan } from "./check-tasks.mjs";
import { withDeployGate } from "./deploy-gate.mjs";
import { worktreeDrift } from "./exec.mjs";

let plan;
try {
  plan = resolveCheckPlan(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
}

/*
 * Gate-only: a run that claims to test the commit it will deploy must be running against
 * that commit. A tracked file that differs from HEAD is refused and named; untracked files
 * are reported and allowed. A dirty tree is the normal state of a local `bun run check`.
 */
const refuseDriftedTree = () => {
  const drift = worktreeDrift();

  if (!drift) {
    process.stdout.write("[run-checks] no readable git checkout here; the checks below run against whatever is on disk.\n");
    return;
  }

  process.stdout.write(`[run-checks] HEAD ${drift.commit}\n`);

  if (drift.untracked.length > 0) {
    const shown = drift.untracked.slice(0, 5);
    process.stdout.write(
      `[run-checks] ${drift.untracked.length} untracked file(s) present, which is allowed: ${shown.join(", ")}` +
        `${drift.untracked.length > shown.length ? ", …" : ""}\n`,
    );
  }

  if (drift.tracked.length > 0) {
    process.stdout.write(
      `\n❌ the working tree is not the commit it claims to be\n\n` +
        `HEAD is ${drift.commit}, but ${drift.tracked.length} tracked file(s) on disk differ from it:\n\n` +
        `${drift.tracked.map(({ code, path }) => `  ${code.padEnd(2)} ${path}`).join("\n")}\n\n` +
        `Every check in this gate judges what is on disk, and so does the build that follows it,\n` +
        `so a run against this tree would score — and deploy — something other than ${drift.commit.slice(0, 8)}.\n` +
        `Refusing rather than reporting a result about a tree nobody pushed.\n\n` +
        `In a build container this means the checkout was written over after it was made. The build\n` +
        `output cache restore is the usual candidate: clear this project's build cache and re-run.\n` +
        `Locally, commit or stash the files above, or unset the deploy-gate signal and use \`bun run check\`.\n`,
    );
    process.exit(1);
  }
};

// Piping the children's output strips their color detection; hand it back on a terminal.
const baseEnv = process.stdout.isTTY
  ? { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? "1" }
  : process.env;
// Only the deploy preset passes the gate signal on; `bun run check` never sets it.
const childEnv = plan.deployGate ? withDeployGate(baseEnv) : baseEnv;

const running = new Set();
let aborted = false;

// Without this, Ctrl-C would detach the parent and leave the children running.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    aborted = true;
    for (const child of running) child.kill(signal);
    process.exit(130);
  });
}

// A hung task is a named failure with its output attached, not a build killed at the
// platform's ceiling with nothing printed. Far above any real task, far below the ceiling.
const TASK_TIMEOUT_MS = Number.parseInt(process.env.CHECK_TASK_TIMEOUT_MS ?? "600000", 10);

const assertTaskTimeout = () => {
  if (!Number.isFinite(TASK_TIMEOUT_MS) || TASK_TIMEOUT_MS <= 0) {
    console.error("CHECK_TASK_TIMEOUT_MS must be a positive integer of milliseconds.");
    process.exit(1);
  }
};

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
      // The kill below still delivers `close`; the timeout's verdict must not be overwritten.
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      running.delete(child);
      resolve({ task, ok, output: output + extra, ms: Date.now() - startedAt });
    };

    timer = setTimeout(() => {
      child.kill("SIGTERM");
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

/** A note, not a failure, when the running `bun` is older than `engines.bun`. */
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

/** One stage: every task in it, then the summary and the failure repeat. Resolves to whether all passed. */
const runStage = async (selected) => {
  if (plan.deployGate) refuseDriftedTree();
  assertTaskTimeout();

  // tsc and bun test are each CPU- and memory-hungry; more in flight than cores is thrash.
  const limit = Math.max(1, Math.min(selected.length, availableParallelism()));

  const startedAt = Date.now();
  const results = [];

  if (plan.serial) {
    for (const task of selected) {
      const result = await runTask(task);
      results.push(result);
      report(result);
      if (!result.ok) break;
    }
  } else {
    const queue = [...selected];
    const pending = new Map();

    // Await in declaration order so output order never depends on finish order.
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

  /*
   * Repeat each failure at the end with the lines that named it and the tail of its output:
   * a bounded log viewer keeps the end, so the end has to carry enough to act on.
   */
  if (failed.length > 0) {
    process.stdout.write(`\n[run-checks] ran on bun ${Bun.version}${engineMismatch() ?? ""}\n`);

    for (const result of failed) {
      const lines = result.output.trimEnd().split("\n");
      const tail = lines.slice(-FAILURE_TAIL_LINES);
      process.stdout.write(`\n───── ${result.task.name} failed (\`bun run ${result.task.script}\`) ─────\n`);

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

  return failed.length === 0;
};

for (const stage of plan.stages) {
  if (!(await runStage(stage))) process.exit(1);
}

process.exit(0);
