import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function main() {
  const [action, ...rawArgs] = process.argv.slice(2);

  if (!action || !["build", "deploy"].includes(action)) {
    console.error("Usage: node scripts/cloudflare-run.mjs <build|deploy> [--env <name> | --preview] [deploy flags]");
    process.exit(1);
  }

  const parsed = parseArgs(rawArgs);
  const targetEnv = parsed.env ?? (parsed.preview ? "preview" : undefined);
  const childEnv = {
    ...process.env,
  };

  if (targetEnv) {
    childEnv.CLOUDFLARE_ENV = targetEnv;
  } else {
    delete childEnv.CLOUDFLARE_ENV;
  }

  if (targetEnv) {
    console.log(`Cloudflare target: ${targetEnv}`);
  } else {
    console.log("Cloudflare target: production");
  }

  if (action === "build") {
    const status = runVinext(["build"], childEnv);
    if (status === 0) dedupeWasmArtifacts();
    process.exit(status);
  }

  const deployArgs = rebuildDeployArgs(parsed, targetEnv);

  if (!parsed.dryRun) {
    ensureWranglerAuth(childEnv);
  }

  if (!parsed.skipBuild) {
    const buildStatus = runVinext(["build"], childEnv);
    if (buildStatus !== 0) {
      process.exit(buildStatus);
    }
    dedupeWasmArtifacts();
    deployArgs.push("--skip-build");
  }

  // Two layers, because neither sees what the other does. The adapter's own --dry-run
  // checks the adapter contract — router mode, ISR wiring, the data and image adapters the
  // routes require — and skips both the build and Wrangler. Wrangler's dry run packages the
  // Worker and catches invalid bindings, oversized bundles, and other upload-time failures.
  // An adapter-contract break surfaces here as a clear adapter error rather than as a
  // confusing packaging failure, or as a real deploy that fails after CI went green.
  if (parsed.dryRun) {
    // deployArgs already carries --dry-run and --skip-build, so this validates without
    // building or publishing.
    const adapterStatus = runCloudflareDeploy(deployArgs, childEnv);
    if (adapterStatus !== 0) {
      process.exit(adapterStatus);
    }
    process.exit(runWranglerDryRun(targetEnv, childEnv));
  }

  const { status, output } = await runCloudflareDeployCaptured(deployArgs, childEnv);
  if (status !== 0) {
    process.exit(status);
  }

  /* The adapter reports success on an upload that never happened. It runs Wrangler with
     execFileSync — which throws on a non-zero exit — then scans the output for a
     workers.dev URL and, finding none, returns the string
     "(URL not detected in wrangler output)" and resolves normally. So a Wrangler run that
     exits 0 after printing only the module table, uploading nothing, reaches the caller as
     a successful deploy. That happened on 2026-09-01: the command exited 0, printed its
     footer, and left production on the previous version. Nothing downstream noticed.

     `Current Version ID` is printed only once an upload actually lands, so its absence is
     the deploy not having happened. Judge on that, not on the exit code — the same lesson
     as briefPublishGuard, where a loader that degrades gracefully turned a failed run into
     a successful-looking one. */
  const versionId = findPublishedVersionId(output);
  if (!versionId) {
    console.error("[cloudflare-run] Wrangler exited 0 but never reported a published version.");
    console.error("[cloudflare-run] Nothing was uploaded; production is unchanged. Re-run the deploy.");
    console.error("[cloudflare-run] Confirm with: bunx wrangler deployments list");
    process.exit(1);
  }

  console.log(`[cloudflare-run] published version ${versionId}`);
  process.exit(0);
}


/**
 * The version id Wrangler prints once an upload has actually landed. Exported so the
 * rule can be tested without running a deploy.
 */
export function findPublishedVersionId(output) {
  const match = /Current Version ID:\s*([0-9a-fA-F-]{36})/.exec(output ?? "");
  return match ? match[1] : null;
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
    child.on("close", (code) => resolve({ status: code ?? 1, output }));
  });
}

function parseArgs(args) {
  const result = {
    preview: false,
    dryRun: false,
    skipBuild: false,
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

    result.passthrough.push(arg);
  }

  return result;
}

function rebuildDeployArgs(parsed, targetEnvName) {
  const args = ["deploy"];

  if (targetEnvName) {
    args.push("--env", targetEnvName);
  }

  args.push(...parsed.passthrough);
  return args;
}

function runVinext(args, env) {
  const result = spawnSync(process.execPath, ["scripts/vinext-run.mjs", ...args], {
    env,
    stdio: "inherit",
  });

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

function runWranglerDryRun(targetEnvName, env) {
  const wranglerPath = join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");

  if (!existsSync(wranglerPath)) {
    console.error(`Unable to locate Wrangler at ${wranglerPath}. Run bun install first.`);
    return 1;
  }

  const args = ["--no-deprecation", wranglerPath, "deploy", "--dry-run"];
  if (targetEnvName) args.push("--env", targetEnvName);

  const result = spawnSync(process.execPath, args, {
    env,
    stdio: "inherit",
  });

  return result.status ?? 1;
}

function dedupeWasmArtifacts() {
  const wasmRoot = join("dist", "server", "resvg.wasm");
  if (!existsSync(wasmRoot)) return;

  try {
    const entries = readdirSync(join("dist", "server", "assets")).filter(
      (f) => f.startsWith("resvg-") && f.endsWith(".wasm"),
    );
    for (const entry of entries) {
      const assetPath = join("dist", "server", "assets", entry);
      rmSync(assetPath, { force: true });
      console.log(`[cloudflare-run] Removed duplicate WASM asset: assets/${entry}`);
    }
  } catch {
    // assets dir may be empty or missing
  }
}

function ensureWranglerAuth(env) {
  if (env.CLOUDFLARE_API_TOKEN || (env.CLOUDFLARE_API_KEY && env.CLOUDFLARE_EMAIL)) {
    return;
  }

  const wranglerBin = join(process.cwd(), "node_modules", ".bin", "wrangler");

  if (!existsSync(wranglerBin)) {
    console.error("Unable to locate Wrangler. Run bun install first.");
    process.exit(1);
  }

  const result = spawnSync(wranglerBin, ["whoami"], {
    env,
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status === 0) {
    return;
  }

  console.error("Cloudflare authentication is required before deploy.");
  console.error("Run `wrangler login` for local use or set `CLOUDFLARE_API_TOKEN` for CI/non-interactive deploys.");

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
