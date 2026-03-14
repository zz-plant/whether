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

const shouldUseNonProdBuild =
  !forceWorkerBuild && shouldDefaultToNonProdBuild;

if (shouldUseNonProdBuild) {
  const branchLabel = branchIsKnown ? branch : "unknown branch";

  console.log(
    `Using non-production branch build path (branch: ${branchLabel}; CF_PAGES=${isCloudflarePages ? "1" : "0"}; deploy context=${hasDeployContext ? "1" : "0"}). Set FORCE_CLOUDFLARE_WORKER_BUILD=1 to force next-on-pages conversion.`,
  );

  run("bun", ["run", "deploy:cloudflare:nonprod"], {
    ...process.env,
    ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG:
      process.env.ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG ?? "1",
  });
}

run("bun", ["run", "build:cloudflare"]);
