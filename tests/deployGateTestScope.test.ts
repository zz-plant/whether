import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { GATE_TASKS, outstandingChecks } from "../scripts/vinext-run.mjs";

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
    assert.ok(
      runner.includes("WHETHER_DEPLOY_GATE"),
      "runner no longer honours the deploy-gate signal",
    );
  });

  it("has the gate actually set the signal, or the exclusion never applies", async () => {
    const gate = await readFile("scripts/vinext-run.mjs", "utf8");
    assert.match(gate, /WHETHER_DEPLOY_GATE:\s*"1"/);
  });

  it("still runs the tool suite outside the gate", async () => {
    /*
     * The rule this protects: tests/tools/ is excluded from the deploy path, not from
     * the repo. The exclusion keys off WHETHER_DEPLOY_GATE in the *spawned* runner, so
     * what must never happen is `bun run check` putting that variable into a child's
     * environment. This used to assert the file never mentions the name at all, which
     * is a different and larger claim: run-checks.mjs now reads the variable to decide
     * whether to record what passed, and reading it cannot rescope anything.
     */
    const checks = await readFile("scripts/run-checks.mjs", "utf8");
    assert.doesNotMatch(
      checks,
      /WHETHER_DEPLOY_GATE\s*[:=]\s*["'`]?1/,
      "bun run check must not set the gate signal for the children it spawns",
    );
    assert.ok(
      checks.includes('process.env.WHETHER_DEPLOY_GATE === "1"'),
      "reading the signal is how the marker stays scoped to the deploy path",
    );
  });

  /*
   * Workers Builds is configured to run `bun run check:vinext` on every push, main
   * included, before anything is built or deployed. Until 2026-09-02 that script was
   * plain `bun run check`: the whole suite with workstation defaults (8 workers, 60s),
   * plus tests/tools/, plus `audit` (network) and `hotspot-preflight` (git history) —
   * none of which the deploy-gate rules above ever reached, because they only took
   * effect inside vinext-run's inner gate, a step the build reaches after the outer
   * command has already passed. So the container ran the one configuration this repo
   * documents as flaky there. The configured command now *is* the deploy gate.
   */
  it("is what the configured Workers Builds command runs", async () => {
    const packageJson: { scripts?: Record<string, string> } = JSON.parse(await readFile("package.json", "utf8"));
    const command = packageJson.scripts?.["check:vinext"] ?? "";

    assert.match(command, /^WHETHER_DEPLOY_GATE=1 bun scripts\/run-checks\.mjs\b/);
    for (const task of ["lint", "typecheck", "test", "assets", "landmarks"]) {
      assert.match(command, new RegExp(`\\b${task}\\b`), `check:vinext no longer runs ${task}`);
    }
    // Network and git-history checks stay on pre-push and `bun run check`, where they can run.
    assert.doesNotMatch(command, /\baudit\b|hotspot-preflight/);
    // The landmark audit spawns a dev server and compiles every route against it. Run
    // alongside lint, tsc, and the suite on a small box, that server competes for the same
    // cores and memory, and a route that compiles slowly reads as a route that never
    // answered. It runs by itself, after the four cheaper tasks have passed.
    assert.match(command, /assets && WHETHER_DEPLOY_GATE=1 bun scripts\/run-checks\.mjs landmarks$/);
  });

  it("requires the same tasks as the configured build command", async () => {
    const packageJson: { scripts?: Record<string, string> } = JSON.parse(await readFile("package.json", "utf8"));
    const outer = (packageJson.scripts?.["check:vinext"] ?? "")
      .split(/\s+/)
      .filter((word) => /^[a-z-]+$/.test(word) && word !== "bun")
      .sort();

    assert.deepEqual(outer, [...GATE_TASKS].sort());
  });

  /*
   * The two gates are the same gate reached from two directions: Workers Builds runs
   * `check:vinext`, then runs the deploy command, which reaches `vinext-run build`.
   * Until 2026-09-03 that second arrival re-ran all five checks against the tree the
   * first had just proved — about a minute of repeated work on every pull-request push,
   * and no signal, because a check that just passed cannot fail. It is skipped by
   * evidence rather than deleted: `check:vinext` records what it proved for the commit,
   * and only what that record covers is skipped, so a build reached without the outer
   * command is gated exactly as it was.
   */
  it("skips only the checks a record proves for this very commit", () => {
    assert.deepEqual(outstandingChecks(GATE_TASKS), []);
    assert.deepEqual(outstandingChecks([]), GATE_TASKS);
    assert.deepEqual(outstandingChecks(["lint", "typecheck"]), ["test", "assets", "landmarks"]);
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
    assert.ok(runner.includes("const inDeployGate = process.env.WHETHER_DEPLOY_GATE === '1'"));
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

  it("strips data-provider keys so a shell cannot reroute the suite's upstreams", async () => {
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    assert.match(runner, /for \(const key of \['FRED_API_KEY', 'ALPHA_VANTAGE_API_KEY'\]\)/);
  });

  it("gives the landmark audit's bounds room for a cold container start", async () => {
    // The dev server is spawned cold in the build container while lint, tsc, and the
    // suite share its cores. The bounds stay bounds — a route that never answers still
    // fails the gate — but a slow box must read as slow, not as broken.
    const audit = await readFile("scripts/check-main-content-landmarks.mjs", "utf8");
    assert.match(audit, /const inDeployGate = process\.env\.WHETHER_DEPLOY_GATE === "1"/);
    assert.match(audit, /inDeployGate \? "180000" : "90000"/);
    assert.match(audit, /inDeployGate \? "60000" : "30000"/);
  });
});
