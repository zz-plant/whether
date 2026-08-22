import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("Cloudflare deploy contracts", () => {
  const source = readFileSync(new URL("../scripts/cloudflare-run.mjs", import.meta.url), "utf8");
  // The Cloudflare packaging step moved here when Upgrade Guardrails was folded
  // into CI; the contract is that *some* CI workflow packages the dry run.
  const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

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

  // The adapter validator and Wrangler check different things: the adapter knows the
  // router mode, ISR wiring, and which data/image adapters the routes require; Wrangler
  // knows bindings and upload limits. Running only the second let an adapter-contract
  // break reach a real deploy after the dry run went green.
  it("validates the adapter contract before Wrangler packages the dry run", () => {
    const dryRunBranch = source.slice(source.indexOf("if (parsed.dryRun)"));
    const adapterIndex = dryRunBranch.indexOf("runCloudflareDeploy(deployArgs, childEnv)");
    const wranglerIndex = dryRunBranch.indexOf("runWranglerDryRun(targetEnv, childEnv)");

    assert.ok(adapterIndex >= 0, "dry run invokes the adapter validator");
    assert.ok(wranglerIndex > adapterIndex, "Wrangler packages only after adapter validation");
    assert.match(source, /if \(adapterStatus !== 0\)/, "a failed adapter validation stops the dry run");
  });

  it("packages a production dry run in CI", () => {
    assert.match(workflow, /bun run deploy:cloudflare:dry-run/);
  });
});
