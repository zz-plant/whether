import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { presetTasks, resolveCheckPlan } from "../scripts/check-tasks.mjs";
import { isDeployGate, withDeployGate } from "../scripts/deploy-gate.mjs";
import { parseShardSummary } from "../scripts/run-tests.mjs";

const stageNames = (args: string[], env: Record<string, string | undefined> = {}) =>
  resolveCheckPlan(args, env).stages.map((stage) => stage.map((task) => task.name));

/**
 * What the deploy gate is allowed to run.
 *
 * The Cloudflare build is the only remote signal this repo has, and its check
 * gate runs inside the deploy path. Suites under tests/tools/ drive external
 * interpreters the build image does not guarantee (today: python3), so a failure
 * there blocks a deploy over something that cannot affect the deployed artifact.
 * They are excluded from the gate and from nowhere else.
 */
describe("deploy gate test scope", () => {
  it("excludes tests/tools from the gate run and says so", () => {
    // Deliberately a different file: pointing the spawned runner at this one
    // makes it re-run this test, which recurses until the timeout.
    const result = spawnSync("bun", ["scripts/run-tests.mjs", "tests/trackRecord.test.ts"], {
      encoding: "utf8",
      env: { ...process.env, WHETHER_DEPLOY_GATE: "1" },
    });

    // An explicit path filter still wins, so a targeted run is never rewritten.
    assert.equal(result.status, 0);
    assert.ok(!result.stdout.includes("deploy gate: excluding"), "a filtered run must not be rescoped");
  });

  it("keeps the exclusion tied to the tests/tools directory, not a filename", async () => {
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    assert.ok(runner.includes("TOOL_TEST_DIRECTORY"), "runner no longer scopes by directory");
    assert.ok(runner.includes("isDeployGate()"), "runner no longer honours the deploy-gate signal");
  });

  /*
   * One reader for the signal. It used to be spelled out in each script that reads it,
   * so "exactly '1'" was a convention four files had to keep agreeing on.
   */
  it("reads the signal as exactly \"1\", and sets it the same way", () => {
    assert.equal(isDeployGate({ WHETHER_DEPLOY_GATE: "1" }), true);
    for (const value of [undefined, "", "0", "true", " 1"]) {
      assert.equal(isDeployGate({ WHETHER_DEPLOY_GATE: value }), false, `${JSON.stringify(value)} is not the gate`);
    }
    const env = { PATH: "/bin" };
    assert.deepEqual(withDeployGate(env), { PATH: "/bin", WHETHER_DEPLOY_GATE: "1" });
    assert.deepEqual(env, { PATH: "/bin" }, "the caller's environment is not mutated");
  });

  it("still runs the tool suite outside the gate", async () => {
    /*
     * The rule this protects: tests/tools/ is excluded from the deploy path, not from
     * the repo. The exclusion keys off the signal in the *spawned* runner, so what must
     * never happen is `bun run check`, or the pre-push hook, putting it into a child's
     * environment. Only the deploy preset does — and a caller that already runs under
     * the signal keeps it.
     */
    assert.equal(resolveCheckPlan([], {}).deployGate, false, "bun run check");
    assert.equal(resolveCheckPlan(["test"], {}).deployGate, false, "a named task");
    assert.equal(resolveCheckPlan(["--preset", "pre-push"], {}).deployGate, false, "the pre-push hook");
    assert.equal(resolveCheckPlan(["--preset", "deploy"], {}).deployGate, true, "the deploy gate");
    assert.equal(resolveCheckPlan(["lint"], { WHETHER_DEPLOY_GATE: "1" }).deployGate, true, "a caller already under the signal");

    const checks = await readFile("scripts/run-checks.mjs", "utf8");
    assert.doesNotMatch(
      checks,
      /WHETHER_DEPLOY_GATE\s*[:=]\s*["'`]?1/,
      "run-checks must not set the gate signal for the children it spawns except through the plan",
    );
    assert.ok(
      checks.includes("const childEnv = plan.deployGate ? withDeployGate(baseEnv) : baseEnv;"),
      "the children get the signal exactly when the plan is the deploy gate",
    );
  });

  it("adds the shards' summaries into one suite total", () => {
    /* A shard's tail: bun prints the counts, then its own `Ran` line. Whichever shard
       finished last used to be the only total a reader saw, and it was one shard's. */
    const counts = parseShardSummary(" 1120 pass\n 0 fail\n 2 skip\nRan 1122 tests across 210 files. [12.0s]\n");
    assert.deepEqual(counts, { pass: 1120, fail: 0, skip: 2, tests: 1122, files: 210 });
  });

  /*
   * Workers Builds is configured to run `bun run check:vinext` on every push, main
   * included, before anything is built or deployed. The configured command *is* the
   * deploy gate (docs/agents/lessons/automation-and-deploy-gate.md).
   */
  it("is what the configured Workers Builds command runs", async () => {
    const packageJson: { scripts?: Record<string, string> } = JSON.parse(await readFile("package.json", "utf8"));
    assert.equal(packageJson.scripts?.["check:vinext"], "bun scripts/run-checks.mjs --preset deploy");

    const plan = resolveCheckPlan(["--preset", "deploy"], {});
    assert.equal(plan.deployGate, true, "the deploy preset runs under the deploy-gate signal");

    const stages = stageNames(["--preset", "deploy"]);
    assert.deepEqual(stages, [["lint", "typecheck", "test", "assets", "suppressions", "dead-exports"], ["landmarks"]]);
    // Network and git-history checks stay on pre-push and `bun run check`, where they can
    // run; type-aware lint stays where someone is watching.
    for (const absent of ["audit", "hotspot-preflight", "lint:types"]) {
      assert.ok(!stages.flat().includes(absent), `the deploy gate must not run ${absent}`);
    }
    // The landmark audit spawns a dev server and compiles every route against it. Run
    // alongside lint, tsc, and the suite on a small box, that server competes for the same
    // cores and memory, and a route that compiles slowly reads as a route that never
    // answered. It runs by itself, after the cheaper tasks have passed.
    assert.deepEqual(stages.at(-1), ["landmarks"], "landmarks must be the last stage, run by itself");
  });

  /*
   * The lists used to be written out in four places and only two were compared. Every
   * consumer now names a preset from scripts/check-tasks.mjs, so the test holds each one
   * to naming it rather than spelling the list out again.
   */
  it("runs the pre-push preset from the hook, and lists no task inline", async () => {
    const hook = await readFile(".husky/pre-push", "utf8");
    const invocations = hook.split("\n").filter((line) => /^\s*bun scripts\/run-checks\.mjs\b/.test(line));
    assert.deepEqual(invocations, ["bun scripts/run-checks.mjs --preset pre-push"]);

    assert.deepEqual(stageNames(["--preset", "pre-push"]), [
      ["lint", "lint:types", "typecheck", "test", "assets", "suppressions", "dead-exports", "hotspot-preflight", "landmarks"],
    ]);
    assert.equal(resolveCheckPlan(["--preset", "pre-push"], {}).deployGate, false);
  });

  /*
   * The Actions check job used to spell its task list inline, the same drift the preset
   * file exists to end: when the preset list moved, the workflow kept auditing whatever
   * its copy said. It now names the `ci` preset like the hook names `pre-push`, and the
   * bun setup/cache/install steps come from one composite action rather than four copies.
   */
  it("runs the ci preset from the Actions check job, and every workflow sets bun up once", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    const invocations = workflow
      .split("\n")
      .filter((line) => line.includes("run-checks.mjs") && line.trim().startsWith("- run:"))
      .map((line) => line.trim());
    assert.deepEqual(invocations, ["- run: bun scripts/run-checks.mjs --preset ci"]);

    assert.deepEqual(stageNames(["--preset", "ci"]), [["lint", "typecheck", "test", "assets", "audit", "landmarks"]]);
    assert.equal(resolveCheckPlan(["--preset", "ci"], {}).deployGate, false);

    const workflows = ["ci.yml", "monthly-summary-refresh.yml", "review-hotspot-preflight.yml", "weekly-brief-freeze.yml"];
    for (const name of workflows) {
      const file = await readFile(`.github/workflows/${name}`, "utf8");
      assert.ok(
        file.includes("uses: ./.github/actions/setup-bun"),
        `${name} sets bun up through the composite action`,
      );
      assert.doesNotMatch(file, /oven-sh\/setup-bun@/, `${name} no longer carries its own bun setup copy`);
    }
    const composite = await readFile(".github/actions/setup-bun/action.yml", "utf8");
    assert.match(composite, /bun-version: 1\.3\.14/, "the pinned bun version is defined once, in the action");
  });

  it("keeps `bun run check` as every task, in one stage", async () => {
    const packageJson: { scripts?: Record<string, string> } = JSON.parse(await readFile("package.json", "utf8"));
    assert.equal(packageJson.scripts?.check, "bun scripts/run-checks.mjs");

    const [all, ...rest] = stageNames([]);
    assert.deepEqual(rest, []);
    for (const task of new Set([...presetTasks("pre-push"), ...presetTasks("deploy"), "audit", "curated-freshness"])) {
      assert.ok(all.includes(task), `bun run check no longer runs ${task}`);
    }
  });

  it("runs named tasks in declaration order, and refuses what it does not know", () => {
    assert.deepEqual(stageNames(["test", "lint"]), [["lint", "test"]]);
    assert.throws(() => resolveCheckPlan(["lnit"], {}), /Unknown check\(s\): lnit/);
    assert.throws(() => resolveCheckPlan(["--preset", "deploi"], {}), /Unknown preset: deploi/);
    assert.throws(() => resolveCheckPlan(["--preset", "deploy", "lint"], {}), /preset or check names, not both/);
    assert.deepEqual(stageNames(["--preset=deploy"]), stageNames(["--preset", "deploy"]));
  });

  // The build itself runs no second gate: `vinext-run.mjs` only starts the Vinext CLI.
  it("has no check gate inside the build command", async () => {
    const runner = await readFile("scripts/vinext-run.mjs", "utf8");
    assert.doesNotMatch(runner, /import[^\n]*(run-checks|check-tasks|deploy-gate)/);
  });
});

/*
 * The deploy preset is two stages because `check:vinext` used to be two commands joined
 * by `&&`. These run the real runner against a fixture package whose scripts only log
 * that they ran, so the ordering and the signal are observed rather than read.
 */
describe("deploy preset stages", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  const runDeployPreset = (failStep = "") => {
    const root = mkdtempSync(join(tmpdir(), "run-checks-stages-"));
    roots.push(root);
    const log = join(root, "ran.log");
    writeFileSync(
      join(root, "step.mjs"),
      [
        'import { appendFileSync } from "node:fs";',
        "const name = process.argv[2];",
        `appendFileSync(${JSON.stringify(log)}, \`\${name}:\${process.env.WHETHER_DEPLOY_GATE ?? ""}\\n\`);`,
        `process.exit(name === ${JSON.stringify(failStep)} ? 1 : 0);`,
      ].join("\n"),
    );
    const scripts = Object.fromEntries(
      [
        ["lint", "lint"],
        ["typecheck", "typecheck"],
        ["test", "test"],
        ["assets:check", "assets"],
        ["check:suppressions", "suppressions"],
        ["check:dead-exports", "dead-exports"],
        ["check:landmarks", "landmarks"],
      ].map(([script, name]) => [script, `node step.mjs ${name}`]),
    );
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "run-checks-stages", scripts }, null, 2));

    // Git exports GIT_DIR and friends to a hook; a child git would read the pushing repo.
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
    delete env.WHETHER_DEPLOY_GATE;

    const result = spawnSync("bun", [join(process.cwd(), "scripts/run-checks.mjs"), "--preset", "deploy"], {
      cwd: root,
      encoding: "utf8",
      env,
    });
    const ran = readFileSync(log, "utf8").trim().split("\n").sort();
    return { result, ran };
  };

  it("runs the landmark audit after the rest pass, every task under the deploy-gate signal", () => {
    const { result, ran } = runDeployPreset();

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(
      ran,
      ["assets", "dead-exports", "landmarks", "lint", "suppressions", "test", "typecheck"].map((name) => `${name}:1`),
    );
    assert.equal(result.stdout.match(/All checks passed/g)?.length, 2, "one summary per stage");
  });

  it("never reaches the landmark stage when an earlier task fails", () => {
    const { result, ran } = runDeployPreset("typecheck");

    assert.equal(result.status, 1);
    assert.ok(!ran.some((line) => line.startsWith("landmarks:")), `landmarks ran after a failure: ${ran.join(", ")}`);
    assert.equal(ran.length, 6, "every task in the failing stage still runs and reports");
    assert.match(result.stdout, /1 check\(s\) failed: typecheck/);
  });
});

describe("deploy gate resource defaults", () => {
  it("allows longer tests inside the gate", async () => {
    // The build container is smaller than a dev machine, and this repo already
    // documents that its suite fails under CPU contention. Slower to give up is the
    // right trade for the only remote signal this repo has.
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    assert.match(runner, /inDeployGate \? "120000" : "60000"/);
  });

  /*
   * The gate used to also drop `--max-concurrency` from 8 to 2 and call it "fewer
   * workers". Measured on 2026-09-03, the same 20 files took 8.26s at 1 and 8.10s at
   * 8: the flag bounds `test.concurrent` tests, this suite declares none, and bun runs
   * every file in one process either way. A setting that reads as protection and
   * provides none is worse than no setting, because it stops anyone looking for the
   * real cause — here, whetherCli spawning 62 Node processes beside lint and tsc.
   */
  it("does not pretend to bound workers bun does not have", async () => {
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    // No hard-coded default either way: the flag reaches bun only when someone asks
    // for it by name, so nothing in this repo claims a protection it does not provide.
    assert.doesNotMatch(runner, /inDeployGate \? '2' : '8'/);
    assert.match(runner, /const concurrency = process\.env\.BUN_TEST_CONCURRENCY;/);
    assert.match(runner, /concurrency \? \[`--max-concurrency=\$\{concurrency\}`\] : \[\]/);
  });

  it("leaves the ceiling overridable, so a slow box can be tuned without a code change", async () => {
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    assert.ok(runner.includes("process.env.BUN_TEST_TIMEOUT_MS ??"));
  });

  it("does not change a local run", async () => {
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    // The gate signal is the only thing that shifts the defaults.
    assert.ok(runner.includes("const inDeployGate = isDeployGate();"));
  });

  it("pins NODE_ENV to test for the spawned suite", async () => {
    // bun test only defaults NODE_ENV when it is unset; a build container that sets
    // NODE_ENV=production would otherwise run the suite in production mode, where the
    // payload builder stops relaxing its freshness contract and fails on fallback data.
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    assert.match(runner, /NODE_ENV: process\.env\.WHETHER_TEST_NODE_ENV \?\? 'test'/);
  });

  it("shuffles test order in the gate and lets a seed replay it", async () => {
    // One process runs every file, so module state leaks between them and a fixed order
    // can hide a dependency until the container orders the suite differently.
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    assert.match(runner, /const randomize = inDeployGate \|\| process\.env\.BUN_TEST_RANDOMIZE === '1'/);
    assert.match(runner, /--seed=\$\{seed\}/);
    assert.ok(runner.includes("...orderArgs"), "the order flags never reach the spawned bun test");
  });

  it("strips data-provider keys and the webhook URL so a shell cannot reroute the suite's upstreams", async () => {
    // The webhook URL is the sharper case: its value is the credential, in the path. A test
    // must not be able to post to a real Slack channel because a shell happened to export one.
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    for (const key of ["FRED_API_KEY", "ALPHA_VANTAGE_API_KEY", "SLACK_WEBHOOK_URL"]) {
      assert.match(runner, new RegExp(`for \\(const key of \\[[^\\]]*'${key}'`), `${key} is no longer stripped`);
    }
  });

  it("gives the landmark audit's bounds room for a cold container start", async () => {
    /*
     * The dev server is spawned cold in the build container while lint, tsc, and the
     * suite share its cores. The bounds stay bounds — a route that never answers still
     * fails the gate — but a slow box must read as slow, not as broken.
     *
     * The per-route bound went 60s -> 120s on 2026-09-17 because 60s was below what a
     * cold compile of the two heaviest routes costs: the container failed three builds
     * with "/share and /trust never answered", and a cold run against `origin/main`,
     * carrying none of that day's changes, reported the same two and went green at
     * 150s. A bound set under the real cost does not measure breakage, it manufactures
     * it — and it did so in the one log a sandbox cannot read.
     */
    const audit = await readFile("scripts/check-main-content-landmarks.mjs", "utf8");
    assert.match(audit, /const inDeployGate = isDeployGate\(\)/);
    assert.match(audit, /inDeployGate \? "180000" : "90000"/);
    assert.match(audit, /inDeployGate \? "120000" : "30000"/);
  });
});
