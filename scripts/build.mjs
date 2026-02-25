import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const isTruthyEnv = (value) => value === "1" || value === "true";

const buildTarget = process.env.BUILD_TARGET;
const isVercel = isTruthyEnv(process.env.VERCEL);
const isCloudflarePages = isTruthyEnv(process.env.CF_PAGES);
const isCloudflareDeploy = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
const skipNextOnPagesBuild = isTruthyEnv(process.env.NEXT_ON_PAGES_SKIP_BUILD);
const useNextOnPages =
  !isVercel &&
  (buildTarget === "pages" ||
    (buildTarget !== "vercel" && (isCloudflarePages || isCloudflareDeploy)));

const command = useNextOnPages ? "next-on-pages" : "next";
const args = useNextOnPages
  ? skipNextOnPagesBuild
    ? ["--skip-build"]
    : []
  : ["build"];

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

if (useNextOnPages) {
  const assetsIgnorePath = join(".vercel", "output", "static", ".assetsignore");
  if (existsSync(join(".vercel", "output", "static"))) {
    writeFileSync(assetsIgnorePath, "_worker.js\n");
  }

  const workerIndexPath = join(
    ".vercel",
    "output",
    "static",
    "_worker.js",
    "index.js",
  );

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
