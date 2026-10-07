import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildDoctorReport,
  buildHandoffPacket,
  buildRepoIndex,
  classifyTask,
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
    assert.ok(packet.packet.readAnchors.includes(".claude/skills/subagent-handoff/SKILL.md"));
    assert.ok(packet.packet.constraints.some((item) => item.includes("subagent-handoff")));
    assert.deepEqual(packet.packet.returnContract, [
      "Changed files.",
      "Commands run and outcomes.",
      "Open risks, drift, or follow-ups.",
    ]);
  });

  /*
   * `.claude/skills` is the canonical directory and `.codex/skills` is generated from it.
   * The helpers read `.codex/skills` until 2026-10-06, so the two UI skills that only
   * exist in the canonical directory could never be anchored in a handoff or indexed.
   */
  it("resolves and indexes skills from the canonical .claude/skills directory", () => {
    for (const skill of ["whether-ui-loop", "whether-ui-standards"]) {
      const packet = buildHandoffPacket({ repoRoot: process.cwd(), job: "Tighten the home page spacing.", skill });
      assert.ok(
        packet.packet.readAnchors.includes(`.claude/skills/${skill}/SKILL.md`),
        `${skill} is not anchored in its handoff`,
      );
    }

    const index = buildRepoIndex({ repoRoot: process.cwd() });
    const names = index.skillsMap.skills.map((skill) => skill.name);
    assert.ok(names.includes("whether-ui-loop"));
    assert.ok(names.includes("whether-ui-standards"));
    assert.ok(index.skillsMap.skills.every((skill) => skill.path.startsWith(".claude/skills/")));
    assert.equal(index.fileMap.counts.skills, names.length);
  });

  it("reads skills from .claude/skills only, not from the generated runtime mirror", () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-skills-"));

    try {
      for (const file of [".claude/skills/canonical/SKILL.md", ".codex/skills/mirror-only/SKILL.md"]) {
        fs.mkdirSync(path.dirname(path.join(temporaryRoot, file)), { recursive: true });
        fs.writeFileSync(path.join(temporaryRoot, file), "---\nname: x\n---\n");
      }

      const index = buildRepoIndex({ repoRoot: temporaryRoot });
      assert.deepEqual(index.skillsMap.skills, [{ name: "canonical", path: ".claude/skills/canonical/SKILL.md" }]);
      assert.equal(index.fileMap.counts.skills, 1);

      const mirrorOnly = buildHandoffPacket({ repoRoot: temporaryRoot, job: "x", skill: "mirror-only" });
      assert.ok(!mirrorOnly.packet.readAnchors.some((anchor) => anchor.includes("mirror-only")));
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  /*
   * `git status` starts an unstaged change with a space. The doctor used to trim the whole
   * output before splitting it, which shifted the first line's columns: ` M a.txt` was
   * reported as status "M " for a file called ".txt", and the AGENTS.md lookup walked from
   * a path that does not exist.
   */
  it("reads the first changed file's status and path intact", () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-doctor-"));
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
    const git = (...args: string[]) => spawnSync("git", args, { cwd: temporaryRoot, encoding: "utf8", env });

    try {
      git("init", "--quiet");
      git("config", "user.email", "test@example.com");
      git("config", "user.name", "test");
      fs.writeFileSync(path.join(temporaryRoot, "a.txt"), "committed\n");
      git("add", "a.txt");
      git("commit", "--quiet", "-m", "initial");
      fs.writeFileSync(path.join(temporaryRoot, "a.txt"), "changed, not staged\n");
      fs.writeFileSync(path.join(temporaryRoot, "b.txt"), "new\n");

      const report = buildDoctorReport({ repoRoot: temporaryRoot });

      assert.deepEqual(report.changedFiles, [
        { status: " M", file: "a.txt" },
        { status: "??", file: "b.txt" },
      ]);
      assert.equal(report.clean, false);
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
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

  it("parses positional task words after the command", () => {
    const result = spawnSync(
      NODE_BIN,
      [SCRIPT_PATH, "route", "improve subagent handoff and skill routing"],
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

      assert.ok(fs.existsSync(written.paths.fileMap));
      assert.equal(JSON.parse(fs.readFileSync(written.paths.fileMap, "utf8")).counts.tests, written.index.fileMap.counts.tests);
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
