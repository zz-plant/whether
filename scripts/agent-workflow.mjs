#!/usr/bin/env node

import {
  buildDoctorReport,
  buildHandoffPacket,
  classifyTask,
  formatDoctorReport,
  formatHandoffPacket,
  formatIndexReport,
  formatRouteReport,
  writeRepoIndex,
} from "./agent-workflow-lib.mjs";

const BOOLEAN_FLAGS = new Set(["--help", "-h", "--json"]);

function printHelp() {
  console.log(`Whether agent workflow helper

Usage:
  node scripts/agent-workflow.mjs doctor [--task "<task>"] [--path <file>]... [--json]
  node scripts/agent-workflow.mjs route [--task "<task>" | <task words...>] [--json]
  node scripts/agent-workflow.mjs handoff --job "<job>" [--task "<task>"] [--why-now "..."] [--done-when "..."] [--skill <name>] [--write-scope <path>]... [--read-anchor <path>]... [--constraint "..."]... [--verify "<command>"]... [--out-of-scope "..."]... [--json]
  node scripts/agent-workflow.mjs index [--out-dir <dir>] [--json]
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

function main() {
  const parsed = parseArgs(process.argv);

  if (!parsed.command || parsed.command === "--help" || parsed.command === "-h" || parsed.command === "help") {
    printHelp();
    process.exit(0);
  }

  const wantsJson = parsed.has("--json");

  if (parsed.command === "route") {
    const route = classifyTask(parsed.get("--task", parsed.positionals.join(" ")));
    console.log(wantsJson ? JSON.stringify({ route }, null, 2) : formatRouteReport(route));
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

  fail(`Unknown command: ${parsed.command}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
