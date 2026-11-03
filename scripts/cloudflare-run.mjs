import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { isWorkerBundleCurrent } from "./worker-bundle.mjs";

/**
 * Builds and deploys the Worker with `cf` (`cloudflare.config.ts`; Wrangler until 2026-11-03).
 * Production is the default. `--env preview` (or `--preview`) is a Worker Preview of `whether`
 * instead: the build sets `CLOUDFLARE_PREVIEW_BUILD=true`, which hands `isPreview` to
 * cloudflare.config.ts, and the deploy uploads it with `cf previews deploy`, named after the
 * branch. A production deploy is vinext's Cloudflare adapter, which runs `cf deploy --prebuilt`
 * against the Build Output in `.cloudflare/output/v0/`.
 */
async function main() {
  const [action, ...rawArgs] = process.argv.slice(2);

  if (!action || !["build", "deploy"].includes(action)) {
    console.error("Usage: node scripts/cloudflare-run.mjs <build|deploy> [--env preview | --preview] [deploy flags]");
    process.exit(1);
  }

  const parsed = parseArgs(rawArgs);
  if (parsed.env !== undefined && parsed.env !== "preview") {
    console.error(`Unknown target "${String(parsed.env)}": the Worker deploys to production, or to a Worker Preview with --env preview.`);
    process.exit(1);
  }
  const preview = parsed.preview || parsed.env === "preview";
  const childEnv = {
    ...process.env,
  };

  // On Workers Builds, Vite's per-chunk tables are ~1,000 lines nobody reads; warnings and
  // errors still print. Read by vite.config.ts; an explicit value wins.
  if (process.env.WORKERS_CI === "1" && !childEnv.WHETHER_BUILD_LOG_LEVEL) {
    childEnv.WHETHER_BUILD_LOG_LEVEL = "warn";
  }

  // What the Cloudflare Vite plugin reads to record a preview build (and to evaluate
  // cloudflare.config.ts with `isPreview: true`). Never inherited by a production build.
  if (preview) {
    childEnv.CLOUDFLARE_PREVIEW_BUILD = "true";
  } else {
    delete childEnv.CLOUDFLARE_PREVIEW_BUILD;
  }

  console.log(`Cloudflare target: ${preview ? "a Worker Preview of whether" : "production"}`);

  if (action === "build") {
    process.exit(runVinextBuild(childEnv));
  }

  const deployArgs = ["deploy", ...parsed.passthrough];

  if (!parsed.dryRun) {
    ensureCfAuth(childEnv);
  }

  // One build per Workers Builds push, not two. The landmark audit in the gate
  // (`check-main-content-landmarks.mjs`) builds the worker bundle and serves it, so when
  // that bundle is current for this tree the deploy can upload it directly. The freshness
  // check is the audit's own (`scripts/worker-bundle.mjs`), and production only — a preview
  // is a different build. When the bundle is missing or stale the check says no and this
  // builds, exactly as before.
  const reuseCurrentBundle = shouldReuseCurrentBundle({
    skipBuildIfCurrent: parsed.skipBuildIfCurrent,
    targetEnv: preview ? "preview" : "",
    current: isWorkerBundleCurrent(),
  });

  if (reuseCurrentBundle) {
    console.log("[cloudflare-run] reusing the current worker bundle (--skip-build-if-current); no rebuild.");
    if (!parsed.skipBuild) deployArgs.push("--skip-build");
  } else if (!parsed.skipBuild) {
    const buildStatus = runVinextBuild(childEnv);
    if (buildStatus !== 0) {
      process.exit(buildStatus);
    }
    deployArgs.push("--skip-build");
  }

  // Two layers, because neither sees what the other does. The adapter's own --dry-run
  // checks the adapter contract — router mode, ISR wiring, the data and image adapters the
  // routes require — and skips both the build and `cf`. `cf deploy --dry-run` validates the
  // Build Output and resolves every binding without sending a request. An adapter-contract
  // break surfaces here as a clear adapter error rather than as a confusing packaging
  // failure, or as a real deploy that fails after CI went green. A preview gets the first
  // layer only: `cf previews deploy` has no dry run, and `cf deploy` refuses preview output.
  const adapterContractArgs = deployArgs.includes("--dry-run") ? deployArgs : [...deployArgs, "--dry-run"];
  if (parsed.dryRun || preview) {
    const adapterStatus = runCloudflareDeploy(adapterContractArgs, childEnv);
    if (adapterStatus !== 0) {
      process.exit(adapterStatus);
    }
    if (preview) {
      process.exit(parsed.dryRun ? 0 : runCfPreviewDeploy(childEnv));
    }
    process.exit(runCfDryRun(childEnv));
  }

  const { status, output } = await runCloudflareDeployCaptured(deployArgs, childEnv);
  if (status !== 0) {
    process.exit(status);
  }

  /* The adapter reports success on an upload that never happened. It scans the deploy's
     output for a workers.dev URL and, finding none, returns the string
     "(URL not detected in cf output)" and resolves normally. Under Wrangler, a run that
     exited 0 after printing only the module table, uploading nothing, reached the caller as
     a successful deploy: that happened on 2026-09-01, and production stayed on the previous
     version without anything downstream noticing.

     `Current Version ID` is printed only once an upload actually lands (`cf` prints it as
     Wrangler did), so its absence is the deploy not having happened. Judge on that, not on
     the exit code — the same lesson as briefPublishGuard, where a loader that degrades
     gracefully turned a failed run into a successful-looking one. */
  const versionId = findPublishedVersionId(output);
  if (!versionId) {
    console.error("[cloudflare-run] The deploy exited 0 but never reported a published version.");
    console.error("[cloudflare-run] Nothing was uploaded; production is unchanged. Re-run the deploy.");
    console.error("[cloudflare-run] Confirm with: npx cf workers deployments list --worker whether");
    process.exit(1);
  }

  console.log(`[cloudflare-run] published version ${versionId}`);
  process.exit(0);
}

/**
 * The version id the deploy prints once an upload has actually landed. Exported so the
 * rule can be tested without running a deploy.
 */
export function findPublishedVersionId(output) {
  const match = /Current Version ID:\s*([0-9a-fA-F-]{36})/.exec(output ?? "");
  return match ? match[1] : null;
}

/**
 * The URLs a `cf previews deploy` result names, or none. Its result is one JSON object on
 * stdout; an upload that printed no URL is, as with `findPublishedVersionId`, not a deploy.
 * Exported so the rule can be tested without uploading a preview.
 */
export function findPreviewUrls(stdout) {
  const start = (stdout ?? "").indexOf("{");
  if (start === -1) return [];
  try {
    const result = JSON.parse(stdout.slice(start));
    const urls = [...(Array.isArray(result?.preview_urls) ? result.preview_urls : []), ...(Array.isArray(result?.deployment_urls) ? result.deployment_urls : [])];
    return urls.filter((url) => typeof url === "string" && url.startsWith("https://"));
  } catch {
    return [];
  }
}

/**
 * Same as runCloudflareDeploy, but keeps the child's output while still streaming it, so
 * the deploy can be checked for evidence that it published. Streaming matters: this is
 * the slowest step, and buffering it would leave a minute of silence.
 */
function runCloudflareDeployCaptured(args, env) {
  const cliPath = join(process.cwd(), "node_modules", "@vinext", "cloudflare", "dist", "cli.js");

  if (!existsSync(cliPath)) {
    console.error(`Unable to locate the @vinext/cloudflare CLI at ${cliPath}. Run bun install first.`);
    return Promise.resolve({ status: 1, output: "" });
  }

  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--no-deprecation", cliPath, ...args], {
      env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    let output = "";
    const tee = (stream, sink) => {
      stream.on("data", (chunk) => {
        output += chunk;
        sink.write(chunk);
      });
    };
    tee(child.stdout, process.stdout);
    tee(child.stderr, process.stderr);

    child.on("error", (error) => {
      console.error(`[cloudflare-run] Failed to start the deploy: ${error.message}`);
      resolve({ status: 1, output });
    });
    child.on("close", (code) => {
      resolve({ status: code ?? 1, output });
    });
  });
}

function parseArgs(args) {
  const result = {
    preview: false,
    dryRun: false,
    skipBuild: false,
    skipBuildIfCurrent: false,
    env: undefined,
    passthrough: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--preview") {
      result.preview = true;
      continue;
    }

    if (arg === "--env") {
      result.env = args[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--env=")) {
      result.env = arg.slice("--env=".length);
      continue;
    }

    if (arg === "--dry-run") {
      result.dryRun = true;
      result.passthrough.push(arg);
      continue;
    }

    if (arg === "--skip-build") {
      result.skipBuild = true;
      result.passthrough.push(arg);
      continue;
    }

    if (arg === "--skip-build-if-current") {
      result.skipBuildIfCurrent = true;
      continue;
    }

    result.passthrough.push(arg);
  }

  return result;
}

/**
 * Whether the deploy may reuse the bundle already built instead of building again.
 *
 * `--skip-build-if-current` is the reuse request. It applies only to production (no
 * `--env`): the landmark audit and the production deploy build the same tree, while a preview
 * is a different build. `current` is the audit's own freshness verdict
 * (`isWorkerBundleCurrent`), so a stale, missing or preview bundle never reuses. Exported so
 * the rule can be tested without running a deploy.
 */
export function shouldReuseCurrentBundle({ skipBuildIfCurrent = false, targetEnv = "", current = false } = {}) {
  return Boolean(skipBuildIfCurrent && !targetEnv && current);
}

/** `vinext build` runs Vite in its production mode; `CLOUDFLARE_PREVIEW_BUILD` in `env` makes it a preview build. */
function runVinextBuild(env) {
  const result = spawnSync(process.execPath, ["scripts/vinext-run.mjs", "build"], { env, stdio: "inherit" });

  return result.status ?? 1;
}

function runCloudflareDeploy(args, env) {
  const cliPath = join(process.cwd(), "node_modules", "@vinext", "cloudflare", "dist", "cli.js");

  if (!existsSync(cliPath)) {
    console.error(`Unable to locate the @vinext/cloudflare CLI at ${cliPath}. Run bun install first.`);
    return 1;
  }

  const result = spawnSync(process.execPath, ["--no-deprecation", cliPath, ...args], {
    env,
    stdio: "inherit",
  });

  return result.status ?? 1;
}

const cfBin = () => join(process.cwd(), "node_modules", "cf", "bin", "cf");

/** Vite builds record the mode they ran in, `production` here, and `cf` refuses a deploy that asks for another. */
function runCfDryRun(env) {
  if (!existsSync(cfBin())) {
    console.error(`Unable to locate cf at ${cfBin()}. Run bun install first.`);
    return 1;
  }

  const result = spawnSync(process.execPath, [cfBin(), "deploy", "--prebuilt", "--dry-run", "--mode", "production"], {
    env,
    stdio: "inherit",
  });

  if (result.error) console.error(`[cloudflare-run] cf dry run failed to start: ${result.error.message}`);
  return result.status ?? 1;
}

/** Uploads the preview build, named after the branch `cf` reads from Workers Builds or git, and prints its URL. */
function runCfPreviewDeploy(env) {
  if (!existsSync(cfBin())) {
    console.error(`Unable to locate cf at ${cfBin()}. Run bun install first.`);
    return 1;
  }

  const result = spawnSync(process.execPath, [cfBin(), "previews", "deploy", "--prebuilt", "--mode", "production"], {
    env,
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "inherit"],
    maxBuffer: 16 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? "");

  if (result.error) console.error(`[cloudflare-run] cf previews deploy failed to start: ${result.error.message}`);
  if ((result.status ?? 1) !== 0) return result.status ?? 1;

  const urls = findPreviewUrls(result.stdout);
  if (urls.length === 0) {
    console.error("[cloudflare-run] cf previews deploy exited 0 but reported no preview URL.");
    return 1;
  }
  for (const url of urls) console.log(`[cloudflare-run] preview: ${url}`);
  return 0;
}

/**
 * Workers Builds supplies CLOUDFLARE_API_TOKEN, and `cf` prefers it over any saved login.
 * Locally, `cf auth whoami` answers for the profile `cf auth login` saved.
 */
function ensureCfAuth(env) {
  if (env.CLOUDFLARE_API_TOKEN) {
    return;
  }

  if (!existsSync(cfBin())) {
    console.error(`Unable to locate cf at ${cfBin()}. Run bun install first.`);
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [cfBin(), "auth", "whoami"], {
    env,
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status === 0) {
    return;
  }

  console.error("Cloudflare authentication is required before deploy.");
  console.error("Run `npx cf auth login` for local use or set `CLOUDFLARE_API_TOKEN` for CI/non-interactive deploys.");

  if (result.stderr?.trim()) {
    console.error(result.stderr.trim());
  }

  process.exit(result.status ?? 1);
}

// Run only when invoked as the command, so importing findPublishedVersionId for a test
// does not start a deploy.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
