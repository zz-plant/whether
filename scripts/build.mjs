import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const command = isVercel ? "next" : "next-on-pages";
const args = isVercel ? ["build"] : [];

const result = spawnSync(command, args, { stdio: "inherit", shell: true });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

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
