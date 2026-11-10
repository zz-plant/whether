import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "bun:test";

/*
 * A Workers Builds log is a bounded window. On 2026-10-13 the gate's passing output
 * (~1,900 lines, ~700 of them one fallback warning), Vite's chunk tables and Wrangler's
 * module table filled it, and the deploy's own result was cut off. `cf` prints no module
 * table, so the filter that collapsed Wrangler's went with it on 2026-11-03. What passes says so
 * in a line; what fails keeps its output.
 */
describe("run-checks output", () => {
  const REPO_ROOT = process.cwd();
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  const runTask = (body: string[], env: Record<string, string> = {}) => {
    const root = mkdtempSync(join(tmpdir(), "run-checks-quiet-"));
    roots.push(root);
    const script = join(root, "task.mjs");
    writeFileSync(script, body.join("\n"));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "run-checks-fixture", scripts: { "check:suppressions": `node ${script}` } }),
    );
    return spawnSync("bun", [join(REPO_ROOT, "scripts/run-checks.mjs"), "suppressions"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CHECK_VERBOSE: "", ...env },
    });
  };

  const PASSING = [
    "for (let i = 1; i <= 200; i++) console.log(`(pass) filler ${i}`);",
    'console.log(" 200 pass");',
    'console.log(" 0 fail");',
    "process.exit(0);",
  ];

  it("reduces a passing task to the lines it closes with", () => {
    const { status, stdout } = runTask(PASSING);
    assert.equal(status, 0);
    assert.doesNotMatch(stdout, /filler 100\b/);
    assert.match(stdout, / 200 pass/);
    assert.match(stdout, /earlier line\(s\) hidden; CHECK_VERBOSE=1 prints them/);
  });

  /* A warn-only check passes on purpose: curated-freshness can print six stale series and a
     remedy, and the four closing lines alone would cut the heading and most of the series. */
  it("keeps a passing task's warning block, from its first ⚠ line to the end", () => {
    const { status, stdout } = runTask([
      "for (let i = 1; i <= 50; i++) console.log(`checked ${i}`);",
      'console.warn("⚠ Curated macro series past freshness SLA (warning only; run with --strict to fail):");',
      'for (const id of ["VC_FUNDING_VELOCITY", "TECH_LAYOFF_TREND", "SAAS_VALUATION_MULTIPLE", "EARNINGS_REVISION_INDEX", "AI_COMPUTE_COST_TREND", "REGULATORY_RISK_TRACKER"]) console.warn(`  ${id}: record 2026-03-01, 200d old (SLA 45d)`);',
      'console.warn("  Hand-refresh data/macro_snapshot.json with sourced values, then flip the gate to strict.");',
      "process.exit(0);",
    ]);
    assert.equal(status, 0);
    assert.match(stdout, /⚠ Curated macro series past freshness SLA/);
    assert.match(stdout, /VC_FUNDING_VELOCITY/, "the first series, eight lines from the end, survives");
    assert.match(stdout, /Hand-refresh data\/macro_snapshot\.json/);
    assert.doesNotMatch(stdout, /checked 25\b/, "what came before the warning is still hidden");
    assert.match(stdout, /earlier line\(s\) hidden/);
  });

  it("prints a passing task whole under CHECK_VERBOSE=1", () => {
    const { stdout } = runTask(PASSING, { CHECK_VERBOSE: "1" });
    assert.match(stdout, /filler 100\b/);
  });

  it("keeps a failing task's output, printing a repeated warning once with its count", () => {
    const { status, stdout } = runTask([
      'for (let i = 0; i < 50; i++) console.log("[families] Ingest error: FRED circuit breaker open");',
      'console.log("(fail) tests/x.test.ts > the real failure");',
      "process.exit(1);",
    ]);
    assert.equal(status, 1);
    const body = stdout.slice(0, stdout.indexOf("check(s) failed"));
    assert.equal(body.match(/FRED circuit breaker open/g)?.length, 1);
    assert.match(body, /×50, later repeats hidden/);
    assert.match(body, /the real failure/);

    const trailer = stdout.slice(stdout.indexOf("check(s) failed"));
    assert.ok((trailer.match(/FRED circuit breaker open/g)?.length ?? 0) <= 1, "the end repeat collapses it too");
    assert.match(trailer, /the real failure/);
  });

  /* The end-of-run repeat is for a log window that keeps only its last lines. `verify` is
     read whole, in an edit loop where failing is the common case, so it prints a failure once. */
  it("prints a failure once under the verify preset, and twice under a gate", () => {
    const run = (args: string[]) => {
      const root = mkdtempSync(join(tmpdir(), "run-checks-verify-"));
      roots.push(root);
      const ok = join(root, "ok.mjs");
      const broken = join(root, "broken.mjs");
      writeFileSync(ok, "process.exit(0);");
      writeFileSync(broken, 'console.log("a.ts(1,1): error TS0000: the real failure"); process.exit(1);');
      const scripts = { lint: `node ${ok}`, typecheck: `node ${broken}`, "test:changed": `node ${ok}` };
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "run-checks-fixture", scripts }));
      return spawnSync("bun", [join(REPO_ROOT, "scripts/run-checks.mjs"), ...args], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, CHECK_VERBOSE: "" },
      });
    };

    const verify = run(["--preset", "verify"]);
    assert.equal(verify.status, 1);
    assert.match(verify.stdout, /1 check\(s\) failed: typecheck/);
    assert.equal(verify.stdout.match(/the real failure/g)?.length, 1);
    assert.doesNotMatch(verify.stdout, /───── typecheck failed/);

    const named = run(["lint", "typecheck"]);
    assert.equal(named.status, 1);
    assert.equal(named.stdout.match(/the real failure/g)?.length, 2);
    assert.match(named.stdout, /───── typecheck failed/);
  });
});

/*
 * `bun run test` with no filter is the same problem without run-checks in front of it. The
 * runner asks the preload to hide the app's console output for that run (`shouldQuietAppLogs`
 * in scripts/run-tests.mjs); this holds the preload to what that promises: the noise goes,
 * and the failure, which bun's reporter prints without `console`, stays.
 */
describe("full-suite test output", () => {
  const REPO_ROOT = process.cwd();

  const runNoisyFailure = (quiet: string) => {
    const root = mkdtempSync(join(tmpdir(), "suite-quiet-"));
    try {
      writeFileSync(
        join(root, "noisy.test.ts"),
        [
          'import { expect, it } from "bun:test";',
          'it("warns, then fails", () => {',
          // Joined at run time: bun's code frame echoes this source, and must not match.
          '  console.warn(["FRED", "circuit", "breaker", "open"].join("-"));',
          '  console.error(["report", "dependency", "failure"].join("-"));',
          '  expect("the real failure").toBe("something else");',
          "});",
        ].join("\n"),
      );
      const { status, stdout, stderr } = spawnSync(
        "bun",
        ["test", "--preload", join(REPO_ROOT, "scripts/test-network-guard.ts"), "noisy.test.ts"],
        { cwd: root, encoding: "utf8", env: { ...process.env, WHETHER_TEST_QUIET: quiet } },
      );
      return { status, output: `${stdout}${stderr}` };
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  it("hides the app's console output and keeps the failure", () => {
    const { status, output } = runNoisyFailure("1");
    assert.equal(status, 1);
    assert.doesNotMatch(output, /FRED-circuit-breaker-open/);
    assert.doesNotMatch(output, /report-dependency-failure/);
    assert.match(output, /the real failure/);
    assert.match(output, /\(fail\) warns, then fails/);
  });

  it("prints the console output when the run did not ask for quiet", () => {
    const { status, output } = runNoisyFailure("");
    assert.equal(status, 1);
    assert.match(output, /FRED-circuit-breaker-open/);
    assert.match(output, /report-dependency-failure/);
  });
});
