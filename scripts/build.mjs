import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const binSuffix = isWindows ? ".cmd" : "";
const nextBin = resolve(rootDir, "node_modules", ".bin", `next${binSuffix}`);
const nextOnPagesBin = resolve(
  rootDir,
  "node_modules",
  ".bin",
  `next-on-pages${binSuffix}`,
);
const command = isVercel
  ? existsSync(nextBin)
    ? nextBin
    : "next"
  : existsSync(nextOnPagesBin)
    ? nextOnPagesBin
    : "next-on-pages";
const args = isVercel ? ["build"] : [];

const result = spawnSync(command, args, { stdio: "inherit", shell: true });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
