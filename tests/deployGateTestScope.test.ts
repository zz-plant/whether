import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

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
    // The rule this protects: excluded from the deploy path, not from the repo.
    const checks = await readFile("scripts/run-checks.mjs", "utf8");
    assert.ok(!checks.includes("WHETHER_DEPLOY_GATE"), "bun run check must not inherit the exclusion");
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

  it("runs the same tasks as the inner build gate", async () => {
    const packageJson: { scripts?: Record<string, string> } = JSON.parse(await readFile("package.json", "utf8"));
    const gate = await readFile("scripts/vinext-run.mjs", "utf8");
    const innerTasks = gate.match(/run-checks\.mjs",\s*((?:"[a-z-]+",?\s*)+)\]/)?.[1] ?? "";
    const inner = [...innerTasks.matchAll(/"([a-z-]+)"/g)].map((match) => match[1]).sort();
    const outer = (packageJson.scripts?.["check:vinext"] ?? "").split(/\s+/).filter((word) => /^[a-z-]+$/.test(word) && word !== "bun").sort();

    assert.deepEqual(outer, inner);
  });
});

describe("deploy gate resource defaults", () => {
  it("runs fewer workers and allows longer tests inside the gate", async () => {
    // The build container is smaller than a dev machine, and this repo already
    // documents that its suite fails under CPU contention. Defaults tuned for a
    // workstation buy contention there, not speed.
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    assert.match(runner, /inDeployGate \? '2' : '8'/);
    assert.match(runner, /inDeployGate \? "120000" : "60000"/);
  });

  it("leaves both overridable, so a slow box can be tuned without a code change", async () => {
    const runner = await readFile("scripts/run-tests.mjs", "utf8");
    assert.ok(runner.includes("process.env.BUN_TEST_CONCURRENCY ??"));
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
