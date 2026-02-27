import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const isTruthyEnv = (value) => value === "1" || value === "true";

const buildTarget = process.env.BUILD_TARGET;
const isVercelRuntime = isTruthyEnv(process.env.VERCEL);
const isCloudflarePages = isTruthyEnv(process.env.CF_PAGES);
const isCloudflareDeploy = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
const skipNextOnPagesBuild = isTruthyEnv(process.env.NEXT_ON_PAGES_SKIP_BUILD);
const forceCloudflareBuild =
  buildTarget === "cloudflare" || buildTarget === "pages";
const forceNextBuild = buildTarget === "next";
const useNextOnPages =
  !isVercelRuntime &&
  (forceCloudflareBuild ||
    (!forceNextBuild && (isCloudflarePages || isCloudflareDeploy)));

const command = useNextOnPages ? "next-on-pages" : "next";
const args = useNextOnPages
  ? skipNextOnPagesBuild
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

const buildMetaPath = join(
  ".vercel",
  "output",
  "static",
  "_worker.js",
  "build-meta.json",
);
const commandSucceeded = result.status === 0;
const workerIndexPath = join(
  ".vercel",
  "output",
  "static",
  "_worker.js",
  "index.js",
);

if (useNextOnPages) {
  mkdirSync(join(".vercel", "output", "static", "_worker.js"), {
    recursive: true,
  });

  const commitSha =
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    null;

  writeFileSync(
    buildMetaPath,
    JSON.stringify(
      {
        buildTarget: buildTarget ?? null,
        useNextOnPages,
        skipNextOnPagesBuild,
        commitSha,
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
