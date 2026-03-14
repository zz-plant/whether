import { spawnSync } from "node:child_process";

const isTruthyEnv = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const run = (command, args, env = process.env) =>
  spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env,
  });


const branch =
  process.env.CF_PAGES_BRANCH ??
  process.env.GITHUB_REF_NAME ??
  process.env.VERCEL_GIT_COMMIT_REF ??
  "";
const productionBranch = process.env.CF_PAGES_PRODUCTION_BRANCH ?? "main";
const forceWorkerBuild = isTruthyEnv(process.env.FORCE_CLOUDFLARE_WORKER_BUILD);
const isCloudflarePages = isTruthyEnv(process.env.CF_PAGES);
const isCloudflareDeploy = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
const branchIsKnown = Boolean(branch);
const isProductionBranch = branchIsKnown && branch === productionBranch;
const hasDeployContext = isCloudflarePages || isCloudflareDeploy;
const shouldDefaultToNonProdBuild =
  !hasDeployContext ||
  (isCloudflarePages && !branchIsKnown) ||
  (isCloudflarePages && !isProductionBranch);

const shouldUseNonProdBuild = !forceWorkerBuild && shouldDefaultToNonProdBuild;

const runNonProdBuild = () =>
  run("bun", ["run", "deploy:cloudflare:nonprod"], {
    ...process.env,
    ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG:
      process.env.ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG ?? "1",
  });

if (shouldUseNonProdBuild) {
  const branchLabel = branchIsKnown ? branch : "unknown branch";

  console.log(
    `Using non-production branch build path (branch: ${branchLabel}; CF_PAGES=${isCloudflarePages ? "1" : "0"}; deploy context=${hasDeployContext ? "1" : "0"}). Set FORCE_CLOUDFLARE_WORKER_BUILD=1 to force next-on-pages conversion.`,
  );

  const result = runNonProdBuild();
  process.exit(result.status ?? 1);
}

const workerBuildResult = run("bun", ["run", "build:cloudflare"]);

if (workerBuildResult.status === 0) {
  process.exit(0);
}

if (hasDeployContext) {
  console.error(
    "Cloudflare worker build failed in deploy context; aborting to avoid uploading stale worker artifacts.",
  );

  process.exit(workerBuildResult.status ?? 1);
}

console.warn(
  "Cloudflare worker build failed; falling back to `deploy:cloudflare:nonprod` to keep Pages builds shippable.",
);

const fallbackResult = runNonProdBuild();
process.exit(fallbackResult.status ?? workerBuildResult.status ?? 1);
