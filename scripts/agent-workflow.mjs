#!/usr/bin/env node

import {
  buildDoctorReport,
  buildHandoffPacket,
  buildPrewarmReport,
  classifyTask,
  classifyTaskWithLocalModel,
  formatDoctorReport,
  formatHandoffPacket,
  formatIndexReport,
  formatPrewarmReport,
  formatRouteReport,
  writeRepoIndex,
} from "./agent-workflow-lib.mjs";

const BOOLEAN_FLAGS = new Set([
  "--help",
  "-h",
  "--json",
  "--local",
  "--refresh-index",
  "--skip-index",
]);

function printHelp() {
  console.log(`Whether agent workflow helper

Usage:
  node scripts/agent-workflow.mjs doctor [--task "<task>"] [--path <file>]... [--json]
  node scripts/agent-workflow.mjs route [--task "<task>" | <task words...>] [--local] [--refresh-index] [--local-base-url <url>] [--local-model <model>] [--local-timeout-ms <ms>] [--json]
  node scripts/agent-workflow.mjs handoff --job "<job>" [--task "<task>"] [--why-now "..."] [--done-when "..."] [--skill <name>] [--write-scope <path>]... [--read-anchor <path>]... [--constraint "..."]... [--verify "<command>"]... [--out-of-scope "..."]... [--json]
  node scripts/agent-workflow.mjs index [--out-dir <dir>] [--json]
  node scripts/agent-workflow.mjs prewarm [--model-role <role>] [--out-dir <dir>] [--skip-index] [--json]
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0];
  const flags = new Map();
  const booleans = new Set();
  const positionals = [];

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    if (BOOLEAN_FLAGS.has(token)) {
      booleans.add(token);
      continue;
    }

    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      booleans.add(token);
      continue;
    }

    const existing = flags.get(token) ?? [];
    existing.push(next);
    flags.set(token, existing);
    index += 1;
  }

  return {
    command,
    positionals,
    get(name, fallback = "") {
      const values = flags.get(name);
      return values?.[values.length - 1] ?? fallback;
    },
    getAll(name) {
      return flags.get(name) ?? [];
    },
    has(name) {
      return booleans.has(name) || flags.has(name);
    },
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  const parsed = parseArgs(process.argv);

  if (!parsed.command || parsed.command === "--help" || parsed.command === "-h" || parsed.command === "help") {
    printHelp();
    process.exit(0);
  }

  const wantsJson = parsed.has("--json");

  if (parsed.command === "route") {
    const task = parsed.get("--task", parsed.positionals.join(" "));
    const routeResult = parsed.has("--local")
      ? await classifyTaskWithLocalModel({
        task,
        repoRoot: process.cwd(),
        baseUrl: parsed.get("--local-base-url", process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1"),
        model: parsed.get("--local-model", process.env.LMSTUDIO_FAST_MODEL || "qwen3.5-9b"),
        timeoutMs: Number(parsed.get("--local-timeout-ms", process.env.LMSTUDIO_ROUTE_TIMEOUT_MS || "4000")),
        refreshIndex: parsed.has("--refresh-index"),
      })
      : { route: classifyTask(task), mode: "keyword-router" };

    console.log(
      wantsJson
        ? JSON.stringify(routeResult, null, 2)
        : formatRouteReport(routeResult.route, routeResult),
    );
    return;
  }

  if (parsed.command === "doctor") {
    const report = buildDoctorReport({
      repoRoot: process.cwd(),
      task: parsed.get("--task", ""),
      inputPaths: parsed.getAll("--path"),
    });
    console.log(wantsJson ? JSON.stringify(report, null, 2) : formatDoctorReport(report));
    return;
  }

  if (parsed.command === "handoff") {
    const job = parsed.get("--job", parsed.positionals.join(" "));
    if (!job) {
      fail("`handoff` requires `--job` or positional job text.");
    }

    const packet = buildHandoffPacket({
      repoRoot: process.cwd(),
      task: parsed.get("--task", ""),
      job,
      whyNow: parsed.get("--why-now", ""),
      doneWhen: parsed.get("--done-when", ""),
      outOfScope: parsed.getAll("--out-of-scope"),
      writeScope: parsed.getAll("--write-scope"),
      readAnchors: parsed.getAll("--read-anchor"),
      constraints: parsed.getAll("--constraint"),
      verification: parsed.getAll("--verify"),
      skill: parsed.get("--skill", ""),
    });
    console.log(wantsJson ? JSON.stringify(packet, null, 2) : formatHandoffPacket(packet));
    return;
  }

  if (parsed.command === "index") {
    const report = writeRepoIndex({
      repoRoot: process.cwd(),
      outDir: parsed.get("--out-dir", ""),
    });
    console.log(wantsJson ? JSON.stringify(report, null, 2) : formatIndexReport(report));
    return;
  }

  if (parsed.command === "prewarm") {
    const report = buildPrewarmReport({
      repoRoot: process.cwd(),
      outDir: parsed.get("--out-dir", ""),
      skipIndex: parsed.has("--skip-index"),
      modelRole: parsed.get("--model-role", "fast"),
    });
    console.log(wantsJson ? JSON.stringify(report, null, 2) : formatPrewarmReport(report));
    return;
  }

  fail(`Unknown command: ${parsed.command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
