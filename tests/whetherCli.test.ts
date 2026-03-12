import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const CLI_PATH = path.join(process.cwd(), "scripts", "whether-cli.mjs");

describe("whether cli", () => {
  it("prints expanded help", () => {
    const result = spawnSync("node", [CLI_PATH, "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Whether CLI/);
    assert.match(result.stdout, /status/);
    assert.match(result.stdout, /export/);
    assert.match(result.stdout, /share/);
  });

  it("returns exit code 5 for invalid scenario input", () => {
    const result = spawnSync("node", [CLI_PATH, "scenario", "--tightness", "oops"], { encoding: "utf8" });
    assert.equal(result.status, 5);
  });

  it("prints subcommand help", () => {
    const result = spawnSync("node", [CLI_PATH, "call", "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage: whether call/);
  });


  it("keeps freshness line in status/call/changes text renderers", () => {
    const source = readFileSync(CLI_PATH, "utf8");
    assert.match(source, /Decision Stability: \$\{body\.decisionStability\}\nFreshness:\s+\$\{resolveFreshnessLine\(body\)\}/);
    assert.match(source, /const callText = \(body\) => `Call: \$\{body\.call\}\nFreshness: \$\{resolveFreshnessLine\(body\)\}/);
    assert.match(source, /const changesText = \(body\) => `What Changed Since Last Refresh\nFreshness: \$\{resolveFreshnessLine\(body\)\}/);
  });

});
