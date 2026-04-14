import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  buildDoctorReport,
  buildHandoffPacket,
  classifyTask,
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
});
