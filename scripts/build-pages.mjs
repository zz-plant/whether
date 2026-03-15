import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

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
const isCloudflarePagesContext =
  isTruthyEnv(process.env.CF_PAGES) ||
  Boolean(process.env.CF_PAGES_BRANCH) ||
  Boolean(process.env.CF_PAGES_COMMIT_SHA) ||
  Boolean(process.env.CF_PAGES_URL) ||
  Boolean(process.env.CF_PAGES_PROJECT_NAME) ||
  isTruthyEnv(process.env.CLOUDFLARE_PAGES);
const shouldRequireWorkerBuildSuccess = isTruthyEnv(
  process.env.REQUIRE_CLOUDFLARE_WORKER_BUILD_SUCCESS,
);
const hasWranglerUploadCredentials =
  Boolean(process.env.CLOUDFLARE_ACCOUNT_ID) &&
  Boolean(process.env.CLOUDFLARE_API_TOKEN);
const isCloudflareDeploy = hasWranglerUploadCredentials;
const branchIsKnown = Boolean(branch);
const isProductionBranch = branchIsKnown && branch === productionBranch;
const hasDeployContext = isCloudflarePagesContext || isCloudflareDeploy;
const shouldDefaultToNonProdBuild =
  !hasDeployContext ||
  // Keep Cloudflare Pages preview/unknown-branch builds on the resilient path by default.
  // next-on-pages currently fails when dynamic routes are not edge-compatible,
  // and this repo intentionally has non-edge dynamic routes.
  (isCloudflarePagesContext && !isProductionBranch);

const shouldUseNonProdBuild = !forceWorkerBuild && shouldDefaultToNonProdBuild;

const runNonProdBuild = () =>
  run("bun", ["run", "deploy:cloudflare:nonprod"], {
    ...process.env,
    ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG:
      process.env.ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG ?? "1",
  });

const STALE_NEXT_BUILD_ARTIFACT_PATHS = [".next/lock", ".next/cache"];

const clearStaleNextBuildArtifacts = () => {
  for (const artifactPath of STALE_NEXT_BUILD_ARTIFACT_PATHS) {
    if (!existsSync(artifactPath)) {
      continue;
    }

    try {
      rmSync(artifactPath, { force: true, recursive: true });
      console.warn(
        `Removed stale ${artifactPath} before running plain Next build fallback.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown error");

      console.warn(
        `Unable to remove stale ${artifactPath} before fallback build: ${message}`,
      );
    }
  }
};

if (shouldUseNonProdBuild) {
  const branchLabel = branchIsKnown ? branch : "unknown branch";
  const branchContext = branchIsKnown
    ? isProductionBranch
      ? "production"
      : "preview"
    : "unknown";

  console.log(
    `Using Cloudflare Pages resilient build path (branch: ${branchLabel}, context: ${branchContext}; CF_PAGES_CONTEXT=${isCloudflarePagesContext ? "1" : "0"}; deploy context=${hasDeployContext ? "1" : "0"}). Set FORCE_CLOUDFLARE_WORKER_BUILD=1 to force next-on-pages conversion.`,
  );

  clearStaleNextBuildArtifacts();
  const result = runNonProdBuild();
  process.exit(result.status ?? 1);
}

const workerBuildResult = run("bun", ["run", "build:cloudflare"]);

if (workerBuildResult.status === 0) {
  process.exit(0);
}

if (shouldRequireWorkerBuildSuccess) {
  console.error(
    "Cloudflare worker build failed while strict worker output is required; aborting to avoid uploading stale worker artifacts.",
  );

  process.exit(workerBuildResult.status ?? 1);
}

console.warn(
  "Cloudflare worker build failed; falling back to `deploy:cloudflare:nonprod` to keep Pages builds shippable.",
);

clearStaleNextBuildArtifacts();
const fallbackResult = runNonProdBuild();
process.exit(fallbackResult.status ?? workerBuildResult.status ?? 1);
