import { spawnSync } from "node:child_process";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const command = isVercel ? "next" : "next-on-pages";
const args = isVercel ? ["build"] : [];

const result = spawnSync(command, args, { stdio: "inherit", shell: true });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
