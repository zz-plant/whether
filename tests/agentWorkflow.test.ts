import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildCompactIndexSummary,
  buildDoctorReport,
  buildHandoffPacket,
  buildPrewarmReport,
  buildRepoIndex,
  classifyTask,
  classifyTaskWithLocalModel,
  readRepoIndex,
  writeRepoIndex,
} from "../scripts/agent-workflow-lib.mjs";

const SCRIPT_PATH = path.join(process.cwd(), "scripts", "agent-workflow.mjs");
const NODE_BIN = process.execPath || "node";

describe("agent workflow helpers", () => {
  it("routes skill and delegation tasks to the skill-mcp profile", () => {
    const route = classifyTask("improve subagent handoff packet and MCP skill routing");

    assert.equal(route.id, "skill-mcp");
    assert.ok(route.docs.includes("docs/agents/mcp-and-skills-playbook.md"));
    assert.ok(route.checks.some((check) => check.includes("agentWorkflow.test.ts")));
  });

  it("builds a bounded handoff packet with skill anchors", () => {
    const packet = buildHandoffPacket({
      repoRoot: process.cwd(),
      task: "tighten delegation workflow docs",
      job: "Update the agent docs routing and handoff examples.",
      skill: "subagent-handoff",
      writeScope: ["docs/agents/README.md", "docs/agents/mcp-and-skills-playbook.md"],
    });

    assert.equal(packet.skill, "subagent-handoff");
    assert.ok(packet.packet.readAnchors.includes(".codex/skills/subagent-handoff/SKILL.md"));
    assert.ok(packet.packet.constraints.some((item) => item.includes("subagent-handoff")));
    assert.deepEqual(packet.packet.returnContract, [
      "Changed files.",
      "Commands run and outcomes.",
      "Open risks, drift, or follow-ups.",
    ]);
  });

  it("includes repo AGENTS guidance in doctor reports", () => {
    const report = buildDoctorReport({
      repoRoot: process.cwd(),
      task: "polish docs workflow",
      inputPaths: ["docs/agents/README.md"],
    });

    assert.ok(report.relevantAgentFiles.includes("AGENTS.md"));
  });

  it("prints a handoff packet from the CLI", () => {
    const result = spawnSync(
      NODE_BIN,
      [
        SCRIPT_PATH,
        "handoff",
        "--job",
        "Tighten the agent workflow docs.",
        "--task",
        "improve subagent handoff and skill routing",
        "--skill",
        "subagent-handoff",
        "--write-scope",
        "docs/agents/README.md",
      ],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Task profile: Skill or MCP workflow/);
    assert.match(result.stdout, /Skill: subagent-handoff/);
    assert.match(result.stdout, /Write scope/);
  });

  it("parses positional tasks after boolean local routing flags", () => {
    const result = spawnSync(
      NODE_BIN,
      [
        SCRIPT_PATH,
        "route",
        "--local",
        "--local-base-url",
        "http://127.0.0.1:1/v1",
        "--local-timeout-ms",
        "25",
        "improve subagent handoff and skill routing",
      ],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Task profile: Skill or MCP workflow/);
  });

  it("builds and writes the repo index", () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-index-"));

    try {
      const index = buildRepoIndex({ repoRoot: process.cwd() });
      assert.ok(index.skillsMap.skills.some((skill) => skill.name === "subagent-handoff"));
      assert.ok(index.testMap.tests.includes("tests/agentWorkflow.test.ts"));

      const written = writeRepoIndex({ repoRoot: process.cwd(), outDir: temporaryRoot });
      const loaded = readRepoIndex({ repoRoot: process.cwd(), outDir: temporaryRoot });

      assert.ok(fs.existsSync(written.paths.fileMap));
      assert.equal(loaded.index.fileMap.counts.tests, written.index.fileMap.counts.tests);

      const compact = buildCompactIndexSummary(written.index);
      assert.ok(compact.skills.includes("subagent-handoff"));
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("falls back when local routing is unavailable", async () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-route-"));

    try {
      const result = await classifyTaskWithLocalModel({
        task: "improve subagent handoff and skill routing",
        repoRoot: process.cwd(),
        fetchImpl: async () => {
          throw new Error("offline");
        },
        outDir: temporaryRoot,
      });

      assert.equal(result.mode, "fallback");
      assert.equal(result.route.id, "skill-mcp");
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("uses the local model response when it returns a known profile", async () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-local-"));

    try {
      const result = await classifyTaskWithLocalModel({
        task: "improve subagent handoff and skill routing",
        repoRoot: process.cwd(),
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              choices: [
                {
                  text: JSON.stringify({
                    profile_id: "skill-mcp",
                    rationale: "Local model picked the skill and delegation profile.",
                  }),
                },
              ],
            };
          },
        }),
        outDir: temporaryRoot,
      });

      assert.equal(result.mode, "local-model");
      assert.equal(result.route.source, "local-model");
      assert.equal(result.route.id, "skill-mcp");
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("accepts non-JSON local model replies when they mention a known profile", async () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-local-freeform-"));

    try {
      const result = await classifyTaskWithLocalModel({
        task: "improve subagent handoff and skill routing",
        repoRoot: process.cwd(),
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return {
              choices: [
                {
                  text: "profile_id=skill-mcp",
                },
              ],
            };
          },
        }),
        outDir: temporaryRoot,
      });

      assert.equal(result.mode, "local-model");
      assert.equal(result.route.id, "skill-mcp");
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("builds a prewarm report with injected command output", () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-prewarm-"));

    try {
      const report = buildPrewarmReport({
        repoRoot: process.cwd(),
        outDir: temporaryRoot,
        commandProbe() {
          return true;
        },
        commandRunner(command, args) {
          if (command === "lms") {
            return JSON.stringify({ running: true, port: 1234 });
          }
          if (command === "lmstudio-ensure-model") {
            return `ensured ${args[0]}`;
          }
          return "";
        },
      });

      assert.equal(report.lmStudio.running, true);
      assert.equal(report.modelWarm.ok, true);
      assert.equal(report.index.generated, true);
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
