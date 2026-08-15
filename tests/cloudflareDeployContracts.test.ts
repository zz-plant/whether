import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("Cloudflare deploy contracts", () => {
  const source = readFileSync(new URL("../scripts/cloudflare-run.mjs", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("../.github/workflows/upgrade-guardrails.yml", import.meta.url), "utf8");

  it("uses the dedicated Cloudflare adapter instead of the deprecated vinext deploy shim", () => {
    assert.match(source, /node_modules[\s\S]*@vinext[\s\S]*cloudflare[\s\S]*dist[\s\S]*cli\.js/);
    assert.match(source, /runCloudflareDeploy\(deployArgs, childEnv\)/);
    assert.doesNotMatch(source, /runVinext\(deployArgs, childEnv\)/);
  });

  it("builds and asks Wrangler to package dry runs", () => {
    assert.match(source, /if \(!parsed\.skipBuild\)/);
    assert.match(source, /wranglerPath, "deploy", "--dry-run"/);
    assert.match(source, /runWranglerDryRun\(targetEnv, childEnv\)/);
  });

  it("packages a production dry run in upgrade CI", () => {
    assert.match(workflow, /bun run deploy:cloudflare:dry-run/);
  });
});
