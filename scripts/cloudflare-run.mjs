import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

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
  process.exit(runVinext(["build"], childEnv));
}

const deployArgs = rebuildDeployArgs(parsed, targetEnv);

if (!parsed.dryRun) {
  ensureWranglerAuth(childEnv);
}

if (!parsed.skipBuild && !parsed.dryRun) {
  const buildStatus = runVinext(["build"], childEnv);
  if (buildStatus !== 0) {
    process.exit(buildStatus);
  }
  deployArgs.push("--skip-build");
}

process.exit(runVinext(deployArgs, childEnv));

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
