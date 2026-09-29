import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { findPublishedVersionId } from "../scripts/cloudflare-run.mjs";

describe("Cloudflare deploy contracts", () => {
  const source = readFileSync(new URL("../scripts/cloudflare-run.mjs", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const prePush = readFileSync(new URL("../.husky/pre-push", import.meta.url), "utf8");
  const preCommit = readFileSync(new URL("../.husky/pre-commit", import.meta.url), "utf8");
  const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");

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

  // CI no longer runs on push or pull request — the workflows went manual-only when the
  // account stopped paying for Actions minutes — so "CI packages the dry run" stopped being
  // a gate the moment that changed. What still holds: the command exists, the workflow can
  // still run it by hand, and Cloudflare Workers Builds packages every push whether or not
  // anyone remembers to.
  it("keeps the packaging dry run runnable by hand and by a restored workflow", () => {
    assert.match(packageJson, /"deploy:cloudflare:dry-run":/);
    assert.match(workflow, /bun run deploy:cloudflare:dry-run/);
  });

  // The local hook is the only thing running the check list now, so it has to cover at
  // least what the workflow would have. A task dropped here is a task nobody runs.
  it("runs at least the workflow's check tasks in the local gate", () => {
    const taskList = (source: string) =>
      source.match(/bun scripts\/run-checks\.mjs ([^\n]+)/)?.[1].trim().split(/\s+/) ?? [];

    const workflowTasks = taskList(workflow);
    const hookTasks = taskList(prePush);

    assert.ok(workflowTasks.length > 0, "the workflow names its check tasks");
    assert.ok(hookTasks.length > 0, "the pre-push hook names its check tasks");

    // `audit` is the one deliberate omission: it needs the network, and a hook that fails
    // offline would just teach people to pass --no-verify. It runs in `bun run check`
    // before a merge instead. Any other gap is a task nobody runs.
    const missing = workflowTasks.filter((task) => task !== "audit" && !hookTasks.includes(task));
    assert.deepEqual(missing, [], "every workflow check task except audit also runs before a push");
    assert.ok(
      hookTasks.includes("hotspot-preflight"),
      "the preflight lost its own workflow, so the hook has to carry it",
    );
  });

  /**
   * On 2026-09-01 `bun run deploy:cloudflare` exited 0 without deploying: Wrangler printed
   * the module table, uploaded nothing, and exited 0. The adapter runs Wrangler through
   * execFileSync — which throws only on a non-zero exit — then scans for a workers.dev URL
   * and, finding none, returns "(URL not detected in wrangler output)" and resolves
   * normally. Production stayed on the previous version and the command reported success.
   * The captured output of both runs is the fixture here.
   */
  const PUBLISHED_RUN = [
    "  Total Upload: 6715.93 KiB / gzip: 2093.33 KiB",
    "  Uploaded whether (7.01 sec)",
    "  Current Version ID: de266f59-b3d4-4507-97e0-24150149713c",
    "  Deployed to: https://whether.kanavj.workers.dev",
  ].join("\n");

  const SILENT_NO_OP_RUN = [
    "  │ Total (465 modules)                    │               │ 6413.89 KiB │",
    "  └────────────────────────────────────────┴───────────────┴─────────────┘",
    "  Deployed to: (URL not detected in wrangler output)",
  ].join("\n");

  it("recognizes a deploy that actually published", () => {
    assert.equal(findPublishedVersionId(PUBLISHED_RUN), "de266f59-b3d4-4507-97e0-24150149713c");
  });

  it("refuses to call the 2026-09-01 silent no-op a deploy", () => {
    assert.equal(findPublishedVersionId(SILENT_NO_OP_RUN), null);
    // The footer alone must never count as evidence: it is printed either way.
    assert.match(SILENT_NO_OP_RUN, /Deployed to:/);
  });

  it("treats empty or absent output as not deployed", () => {
    assert.equal(findPublishedVersionId(""), null);
    assert.equal(findPublishedVersionId(undefined), null);
  });

  it("fails the deploy when no published version is reported", () => {
    const deployBranch = source.slice(source.indexOf("runCloudflareDeployCaptured(deployArgs, childEnv)"));
    assert.match(deployBranch, /findPublishedVersionId\(output\)/);
    assert.match(deployBranch, /if \(!versionId\)[\s\S]*process\.exit\(1\)/);
  });

  it("streams the deploy rather than buffering it, so the slowest step stays visible", () => {
    assert.match(source, /stdio: \["inherit", "pipe", "pipe"\]/);
    assert.match(source, /sink\.write\(chunk\)/);
  });

  it("does not run a deploy when imported", () => {
    assert.match(source, /import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href/);
  });

  /**
   * The gate silently did not run from a linked git worktree. core.hooksPath pointed at
   * husky's generated `.husky/_`, which is gitignored and therefore exists only where
   * `bun install` has run — never in a fresh worktree. Git skips a missing hooks
   * directory without a word, so a push from a worktree was unverified and looked
   * identical to a verified one. That happened on 2026-09-01 while pushing from a
   * worktree specifically to avoid moving HEAD under a concurrent session, which puts
   * "isolate work in worktrees" and "the pre-push hook is the only gate left" in direct
   * conflict unless the hooks are tracked.
   */
  it("runs hooks from a tracked directory, so linked worktrees get them too", () => {
    const pkg: { scripts?: Record<string, string> } = JSON.parse(packageJson);
    const prepare = pkg.scripts?.prepare ?? "";
    // husky rewrites core.hooksPath to .husky/_ on every install, so prepare has to put
    // it back or the fix silently reverts the next time anyone installs.
    assert.match(prepare, /^husky\b/, "prepare should still run husky");
    assert.match(
      prepare,
      /git config core\.hooksPath \.husky(?!\/_)/,
      "prepare must re-point core.hooksPath at the tracked .husky, not husky's gitignored .husky/_",
    );
  });

  it("keeps the hooks directly executable, since git invokes them without husky's shim", () => {
    // With hooksPath at .husky there is no `_/pre-push` wrapper to exec these under sh.
    assert.match(prePush, /^#!\/usr\/bin\/env sh\n/, "pre-push needs a shebang");
    assert.match(preCommit, /^#!\/usr\/bin\/env sh\n/, "pre-commit needs a shebang");
  });
});
