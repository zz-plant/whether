import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2);
const [command, ...rest] = args;
const majorVersion = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);

if (!command) {
  console.error("Usage: node scripts/vinext-run.mjs <command> [...args]");
  process.exit(1);
}

if (majorVersion < 22) {
  console.error(
    `Vinext requires Node >=22. Current runtime is ${process.version}. Switch to Node 22+ before using the Vinext lane.`,
  );
  process.exit(1);
}

const vinextCliPath = join(process.cwd(), "node_modules", "vinext", "dist", "cli.js");

if (!existsSync(vinextCliPath)) {
  console.error(`Unable to locate the Vinext CLI at ${vinextCliPath}. Run bun install first.`);
  process.exit(1);
}
const result = spawnSync(process.execPath, [vinextCliPath, command, ...rest], {
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
