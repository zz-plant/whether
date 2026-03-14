import { spawnSync } from "node:child_process";

const isTruthyEnv = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env,
  });

  process.exit(result.status ?? 1);
};

const branch = process.env.CF_PAGES_BRANCH ?? "";
const productionBranch = process.env.CF_PAGES_PRODUCTION_BRANCH ?? "main";
const forceWorkerBuild = isTruthyEnv(process.env.FORCE_CLOUDFLARE_WORKER_BUILD);

const shouldUseNonProdBuild =
  isTruthyEnv(process.env.CF_PAGES) &&
  !forceWorkerBuild &&
  Boolean(branch) &&
  branch !== productionBranch;

if (shouldUseNonProdBuild) {
  console.log(
    `Cloudflare preview branch detected (${branch}); using non-production branch build path. Set FORCE_CLOUDFLARE_WORKER_BUILD=1 to force next-on-pages conversion.`,
  );

  run("bun", ["run", "deploy:cloudflare:nonprod"], {
    ...process.env,
    ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG:
      process.env.ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG ?? "1",
  });
}

run("bun", ["run", "build:cloudflare"]);
