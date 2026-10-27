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

  /*
   * Until 2026-10-27 the router named docs, targets and checks only, so a task that needed
   * an advisory tool (no gate runs them) or a lessons file got neither.
   */
  it("routes a task to the specialised tool it needs, whatever profile wins", () => {
    const cases: Array<{ task: string; command: string }> = [
      { task: "find duplicated helper functions", command: "bun run audit:near-duplicates" },
      { task: "is this telemetry stream dead", command: "bun run telemetry:streams" },
      {
        task: "change a brief format string",
        command: "WHETHER_UPDATE_BRIEF_GOLDEN=1 bun run test tests/briefFormatsPinned.test.ts",
      },
      { task: "OG image font", command: "node scripts/generate-og-fonts.mjs" },
    ];

    for (const { task, command } of cases) {
      const route = classifyTask(task);
      assert.ok(
        route.tools.some((tool) => tool.command === command),
        `"${task}" should recommend ${command}; got ${route.tools.map((tool) => tool.command).join(", ") || "nothing"}`,
      );
    }

    const printed = spawnSync(NODE_BIN, [SCRIPT_PATH, "route", "is this telemetry stream dead"], { encoding: "utf8" });
    assert.equal(printed.status, 0);
    assert.match(printed.stdout, /Specialised Tools:\n- bun run telemetry:streams — /);
    assert.match(printed.stdout, /Read Before You Touch \(CLAUDE\.md\):\n- docs\/agents\/lessons\/toolchain-and-gates\.md/);
  });

  it("routes topics to lessons files from CLAUDE.md's table, which it reads rather than copies", () => {
    const cases: Array<{ task: string; lesson: string }> = [
      { task: "is this telemetry stream dead", lesson: "docs/agents/lessons/toolchain-and-gates.md" },
      { task: "the Slack send failed on Monday", lesson: "docs/agents/lessons/automation-and-deploy-gate.md" },
      { task: "reword the reader-facing strings on /trust", lesson: "docs/agents/lessons/tests-and-copy-rules.md" },
      { task: "update the share OG metadata", lesson: "docs/agents/lessons/dead-features-and-honesty.md" },
      { task: "change confidence in regimeEngineCore.ts", lesson: "docs/agents/lessons/regime-scoring.md" },
      { task: "add a retry around a KV read", lesson: "docs/agents/lessons/runtime-helpers.md" },
      { task: "choose a first file to read", lesson: "docs/agents/hot-files.md" },
    ];
    for (const { task, lesson } of cases) {
      assert.ok(classifyTask(task).lessons.includes(lesson), `"${task}" should name ${lesson}`);
    }

    // Every file the table links exists, so a route never sends a reader to a missing page.
    const claude = fs.readFileSync("CLAUDE.md", "utf8");
    const section = claude.slice(claude.indexOf("## Read before you touch"), claude.indexOf("### Rules that catch changes here"));
    const linked = [...section.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]);
    assert.ok(linked.length >= 7, `the lessons table no longer parses (${linked.length} links)`);
    for (const file of linked) assert.ok(fs.existsSync(file ?? ""), `CLAUDE.md links a missing lessons file: ${file}`);

    // A row added to the table is routed with no second edit.
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "whether-agent-lessons-"));
    try {
      fs.writeFileSync(
        path.join(temporaryRoot, "CLAUDE.md"),
        [
          "## Read before you touch",
          "",
          "| Touching… | Read |",
          "| --- | --- |",
          '| a widget cache, "left, right" | [widgets](docs/widgets.md) |',
          "",
          "### Next section",
          "| a widget | [not-this](docs/other.md) |",
        ].join("\n"),
      );
      const lessonsFor = (task: string) => classifyTask(task, { repoRoot: temporaryRoot }).lessons;
      // Plurals match, and every word of the phrase must appear.
      assert.deepEqual(lessonsFor("evict the widget caches"), ["docs/widgets.md"]);
      // A quoted topic is one phrase even with a comma in it.
      assert.deepEqual(lessonsFor("left then right"), ["docs/widgets.md"]);
      assert.deepEqual(lessonsFor("left only"), []);
      // The table ends at the next heading.
      assert.deepEqual(lessonsFor("a widget alone"), []);
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("names only skills, scripts and files that exist", () => {
    const { fileMap } = buildRepoIndex({ repoRoot: process.cwd() });
    const packageJson: { scripts: Record<string, string> } = JSON.parse(fs.readFileSync("package.json", "utf8"));

    for (const profile of [...fileMap.taskProfiles, classifyTask("")]) {
      for (const skill of profile.skills) {
        assert.ok(fs.existsSync(`.claude/skills/${skill}/SKILL.md`), `${profile.id} names a missing skill: ${skill}`);
      }
    }

    assert.ok(fileMap.toolHints.length > 0);
    for (const hint of fileMap.toolHints) {
      // Leading VAR=value assignments set the environment; the program follows them.
      const words = hint.command.split(/\s+/).filter((word) => !/^[A-Z_]+=/.test(word));
      const [program, first] = words;
      if (program === "bun" && first === "run") {
        const script = words[2] ?? "";
        assert.ok(packageJson.scripts[script], `${hint.id} runs a missing package script: ${script}`);
      } else {
        assert.ok(fs.existsSync(first ?? ""), `${hint.id} runs a missing file: ${first}`);
      }
      for (const file of words.filter((word) => /^(tests|scripts)\//.test(word))) {
        assert.ok(fs.existsSync(file), `${hint.id} names a missing file: ${file}`);
      }
    }
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
