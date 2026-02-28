import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const isTruthyEnv = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const buildMetaPath = join(
  ".vercel",
  "output",
  "static",
  "_worker.js",
  "build-meta.json",
);
const workerIndexPath = join(
  ".vercel",
  "output",
  "static",
  "_worker.js",
  "index.js",
);
const vercelOutputConfigPath = join(".vercel", "output", "config.json");

const readBuildMeta = () => {
  if (!existsSync(buildMetaPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(buildMetaPath, "utf8"));
  } catch {
    return null;
  }
};

const currentCommitSha =
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  null;

const buildTarget = process.env.BUILD_TARGET;
const isVercelRuntime = isTruthyEnv(process.env.VERCEL);
const isCloudflarePages = isTruthyEnv(process.env.CF_PAGES);
const isCloudflareDeploy = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
const isCi = isTruthyEnv(process.env.CI);
const skipNextOnPagesBuild = isTruthyEnv(process.env.NEXT_ON_PAGES_SKIP_BUILD);
const hasVercelBuildOutput = existsSync(vercelOutputConfigPath);
const hasWorkerBuildOutput = existsSync(workerIndexPath);
const priorBuildMeta = readBuildMeta();

const hasReusableBuildOutput =
  hasVercelBuildOutput &&
  hasWorkerBuildOutput &&
  Boolean(priorBuildMeta?.useNextOnPages) &&
  Boolean(priorBuildMeta?.commandSucceeded) &&
  Boolean(currentCommitSha) &&
  priorBuildMeta?.commitSha === currentCommitSha;
const forceCloudflareBuild =
  buildTarget === "cloudflare" || buildTarget === "pages";
const forceNextBuild = buildTarget === "next";
const useNextOnPages =
  !isVercelRuntime &&
  (forceCloudflareBuild ||
    (!forceNextBuild && (isCloudflarePages || isCloudflareDeploy)));
const hasRestoredCloudflareOutput = hasVercelBuildOutput || hasWorkerBuildOutput;
const shouldAutoSkipInCi =
  useNextOnPages &&
  hasRestoredCloudflareOutput &&
  (isCi || isCloudflarePages || isCloudflareDeploy);
const shouldSkipNextOnPagesBuild =
  useNextOnPages &&
  (skipNextOnPagesBuild || hasReusableBuildOutput || shouldAutoSkipInCi);

const command = useNextOnPages ? "next-on-pages" : "next";
const args = useNextOnPages
  ? shouldSkipNextOnPagesBuild
    ? ["--skip-build"]
    : []
  : ["build", "--webpack"];

const result = spawnSync(command, args, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  },
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const commandSucceeded = result.status === 0;

if (useNextOnPages) {
  mkdirSync(join(".vercel", "output", "static", "_worker.js"), {
    recursive: true,
  });

  writeFileSync(
    buildMetaPath,
    JSON.stringify(
      {
        buildTarget: buildTarget ?? null,
        useNextOnPages,
        skipNextOnPagesBuild: shouldSkipNextOnPagesBuild,
        skipBuildReason: shouldSkipNextOnPagesBuild
          ? skipNextOnPagesBuild
            ? "NEXT_ON_PAGES_SKIP_BUILD"
            : hasReusableBuildOutput
              ? "cache-hit-same-commit"
              : "ci-prebuilt-vercel-output"
          : null,
        commitSha: currentCommitSha,
        command,
        args,
        commandSucceeded,
        workerIndexExists: existsSync(workerIndexPath),
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
}

if (useNextOnPages) {
  const assetsIgnorePath = join(".vercel", "output", "static", ".assetsignore");
  if (existsSync(join(".vercel", "output", "static"))) {
    writeFileSync(assetsIgnorePath, "_worker.js\n");
  }

  if (existsSync(workerIndexPath)) {
    const workerSource = readFileSync(workerIndexPath, "utf8");
    const rewrittenSource = workerSource.replaceAll(
      '"__next-on-pages-dist__/',
      '"./__next-on-pages-dist__/',
    );

    if (rewrittenSource !== workerSource) {
      writeFileSync(workerIndexPath, rewrittenSource);
    }
  }
}
