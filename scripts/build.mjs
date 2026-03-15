import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const isTruthyEnv = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};


// Temporary escape hatch for Bun runtime rollout; remove after two stable CI cycles.
const shouldForceNodeRuntime =
  isTruthyEnv(process.env.FORCE_NODE_BUILD_RUNTIME) &&
  !isTruthyEnv(process.env.__WHETHER_NODE_RUNTIME_ACTIVE) &&
  Boolean(process.versions?.bun);

if (shouldForceNodeRuntime) {
  const rerun = spawnSync(
    "node",
    [fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        __WHETHER_NODE_RUNTIME_ACTIVE: "1",
      },
      shell: true,
    },
  );

  process.exit(rerun.status ?? 1);
}

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
const wranglerConfigPath = "wrangler.toml";

const projectExpectsNextOnPagesWorker = (() => {
  if (!existsSync(wranglerConfigPath)) {
    return false;
  }

  try {
    const wranglerConfig = readFileSync(wranglerConfigPath, "utf8");
    return /main\s*=\s*["']\.vercel\/output\/static\/_worker\.js["']/.test(
      wranglerConfig,
    );
  } catch {
    return false;
  }
})();

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
const reusePrebuiltOutput = isTruthyEnv(
  process.env.NEXT_ON_PAGES_REUSE_PREBUILT,
);
const hasVercelBuildOutput = existsSync(vercelOutputConfigPath);
const hasWorkerBuildOutput = existsSync(workerIndexPath);
const priorBuildMeta = readBuildMeta();

const hasInstalledDependencies = existsSync("node_modules");

if (isCi && !hasInstalledDependencies) {
  console.error(
    "Missing node_modules in CI. Run `bun install --frozen-lockfile` once before invoking build commands.",
  );
  process.exit(1);
}

const hasReusableBuildOutput =
  hasVercelBuildOutput &&
  hasWorkerBuildOutput &&
  Boolean(priorBuildMeta?.useNextOnPages) &&
  Boolean(priorBuildMeta?.commandSucceeded) &&
  Boolean(currentCommitSha) &&
  priorBuildMeta?.commitSha === currentCommitSha;
const hasPriorBuildMeta = Boolean(priorBuildMeta?.commandSucceeded);
const prebuiltOutputCommitMatchesCurrent =
  Boolean(currentCommitSha) &&
  Boolean(priorBuildMeta?.commitSha) &&
  priorBuildMeta.commitSha === currentCommitSha;
const canReusePrebuiltOutputSafely =
  !reusePrebuiltOutput
    ? false
    : !hasVercelBuildOutput
      ? false
      : !currentCommitSha
        ? false
        : hasPriorBuildMeta
          ? prebuiltOutputCommitMatchesCurrent
          : true;
const forceCloudflareBuild =
  buildTarget === "cloudflare" || buildTarget === "pages";
const forceNextBuild = buildTarget === "next";
const shouldReuseCachedCloudflareOutputInCi =
  !forceCloudflareBuild &&
  !forceNextBuild &&
  isCi &&
  projectExpectsNextOnPagesWorker &&
  hasVercelBuildOutput &&
  hasWorkerBuildOutput;
// Guard auto-detection because next-on-pages currently requires all dynamic routes to run on Edge.
const enableAutoNextOnPages = isTruthyEnv(process.env.NEXT_ON_PAGES_AUTO);
const useNextOnPages =
  !isVercelRuntime &&
  (forceCloudflareBuild ||
    (!forceNextBuild &&
      enableAutoNextOnPages &&
      (isCloudflarePages || isCloudflareDeploy)) ||
    (!forceNextBuild &&
      enableAutoNextOnPages &&
      isCi &&
      projectExpectsNextOnPagesWorker));
const allowNextBuildWithoutWorkerOutput = isTruthyEnv(
  process.env.ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG,
);

if (
  !useNextOnPages &&
  (isCloudflarePages || isCloudflareDeploy) &&
  projectExpectsNextOnPagesWorker &&
  !allowNextBuildWithoutWorkerOutput
) {
  console.error(
    "Cloudflare environment detected with worker-based wrangler config, but NEXT_ON_PAGES_AUTO is disabled. Refusing to run `next build` because `wrangler versions upload` requires `.vercel/output/static/_worker.js`. Use `bun run build:cloudflare` (or set NEXT_ON_PAGES_AUTO=1) for production deploys, or `bun run deploy:cloudflare:nonprod` for branch validation. Set ALLOW_NEXT_BUILD_WITH_WORKER_CONFIG=1 to bypass this safeguard.",
  );
  process.exit(1);
}

const forceWebpackBuild = isTruthyEnv(process.env.NEXT_BUILD_FORCE_WEBPACK);
const hasAnyCloudflareBuildOutput = hasVercelBuildOutput || hasWorkerBuildOutput;
const shouldAutoSkipInCi =
  useNextOnPages &&
  !forceCloudflareBuild &&
  hasVercelBuildOutput &&
  (isCi || isCloudflarePages || isCloudflareDeploy);
const skipBuildWasRequested =
  skipNextOnPagesBuild ||
  hasReusableBuildOutput ||
  canReusePrebuiltOutputSafely ||
  shouldAutoSkipInCi;
const canSkipNextOnPagesBuild = hasVercelBuildOutput;
const shouldSkipNextOnPagesBuild =
  useNextOnPages &&
  skipBuildWasRequested &&
  canSkipNextOnPagesBuild;
const shouldBypassNextOnPagesConversion =
  useNextOnPages &&
  hasReusableBuildOutput &&
  !forceCloudflareBuild &&
  (isCi || isCloudflarePages || isCloudflareDeploy);

if (shouldBypassNextOnPagesConversion) {
  console.log(
    "Reusing cached Cloudflare Pages output for this commit; skipping next-on-pages conversion.",
  );
  process.exit(0);
}

if (shouldReuseCachedCloudflareOutputInCi) {
  console.log(
    "Reusing cached Cloudflare Pages build output from cache; skipping Next.js rebuild in CI.",
  );
  process.exit(0);
}

const command = useNextOnPages ? "bunx" : "next";
const disableWorkerMinification =
  useNextOnPages && !isTruthyEnv(process.env.NEXT_ON_PAGES_ENABLE_WORKER_MINIFICATION);

const nextOnPagesArgs = ["@cloudflare/next-on-pages"];

if (shouldSkipNextOnPagesBuild) {
  nextOnPagesArgs.push("--skip-build");
}

if (disableWorkerMinification) {
  nextOnPagesArgs.push("--disable-worker-minification");
}

const args = useNextOnPages
  ? nextOnPagesArgs
  : forceWebpackBuild
    ? ["build", "--webpack"]
    : ["build"];

const suppressedCloudflareWarningPatterns = [
  /^▲ \[WARNING\] Duplicate key "options" in object literal \[duplicate-object-key\]$/,
  /^\s*<stdin>:\d+:\d+:/,
  /^\s*The original key "options" is here:/,
  /^\s*\d+ │/,
  /^\s*╵/,
];

const shouldSuppressCloudflareWarningLine = (line) =>
  suppressedCloudflareWarningPatterns.some((pattern) => pattern.test(line));

const nextOnPagesSpawnMaxBufferBytes = 64 * 1024 * 1024;

const result = spawnSync(command, args, {
  stdio: useNextOnPages ? "pipe" : "inherit",
  encoding: "utf8",
  ...(useNextOnPages
    ? {
        maxBuffer: nextOnPagesSpawnMaxBufferBytes,
      }
    : {}),
  shell: true,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  },
});

if (useNextOnPages && skipBuildWasRequested && !canSkipNextOnPagesBuild) {
  console.warn(
    "Skipping next-on-pages prebuild reuse because `.vercel/output/config.json` is missing; running full next-on-pages build instead.",
  );
}

if (
  useNextOnPages &&
  reusePrebuiltOutput &&
  !canReusePrebuiltOutputSafely &&
  hasVercelBuildOutput
) {
  if (!currentCommitSha) {
    console.warn(
      "NEXT_ON_PAGES_REUSE_PREBUILT requested but commit SHA is unavailable; running a full rebuild to avoid stale static assets.",
    );
  } else if (hasPriorBuildMeta && !prebuiltOutputCommitMatchesCurrent) {
    console.warn(
      "NEXT_ON_PAGES_REUSE_PREBUILT requested but prebuilt output was generated for a different commit; running a full rebuild to avoid stale static assets.",
    );
  }
}

if (useNextOnPages) {
  const outputChannels = [
    { text: result.stdout ?? "", writer: process.stdout },
    { text: result.stderr ?? "", writer: process.stderr },
  ];


  for (const channel of outputChannels) {
    if (!channel.text) {
      continue;
    }

    const filteredLines = [];

    for (const line of channel.text.split(/\r?\n/)) {
      if (shouldSuppressCloudflareWarningLine(line)) {
        continue;
      }

      filteredLines.push(line);
    }

    channel.writer.write(filteredLines.join("\n"));
  }

}

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
              : canReusePrebuiltOutputSafely
                ? "NEXT_ON_PAGES_REUSE_PREBUILT"
                : "ci-prebuilt-vercel-output"
          : skipBuildWasRequested
            ? "missing-prebuilt-vercel-output"
          : null,
        commitSha: currentCommitSha,
        command,
        args,
        forceWebpackBuild,
        commandSucceeded,
        skipBuildWasRequested,
        canSkipNextOnPagesBuild,
        workerIndexExists: existsSync(workerIndexPath),
        vercelOutputConfigExists: existsSync(vercelOutputConfigPath),
        hasAnyCloudflareBuildOutput,
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
