import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const buildTarget = process.env.BUILD_TARGET;
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const isCloudflarePages =
  process.env.CF_PAGES === "1" || process.env.CF_PAGES === "true";
const useNextOnPages =
  buildTarget === "pages" || (buildTarget !== "vercel" && isCloudflarePages);
const command = useNextOnPages ? "next-on-pages" : "next";
const args = useNextOnPages ? [] : ["build"];

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
