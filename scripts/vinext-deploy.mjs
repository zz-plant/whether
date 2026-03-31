import { copyFileSync, existsSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const vinextConfigPath = "wrangler.vinext.jsonc";
const tempWranglerTomlPath = "wrangler.next.toml.bak";
const activeWranglerJsoncPath = "wrangler.jsonc";
const activeWranglerTomlPath = "wrangler.toml";

if (!existsSync(vinextConfigPath)) {
  console.error(`Missing ${vinextConfigPath}.`);
  process.exit(1);
}

const hasWranglerToml = existsSync(activeWranglerTomlPath);
const hasWranglerJsonc = existsSync(activeWranglerJsoncPath);

if (hasWranglerJsonc) {
  console.error(
    "Refusing to run vinext deploy with an existing wrangler.jsonc because this spike wrapper needs exclusive control over the active Cloudflare config.",
  );
  process.exit(1);
}

try {
  if (hasWranglerToml) {
    renameSync(activeWranglerTomlPath, tempWranglerTomlPath);
  }

  copyFileSync(vinextConfigPath, activeWranglerJsoncPath);

  const result = spawnSync(
    process.execPath,
    ["scripts/vinext-run.mjs", "deploy", ...args],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  process.exitCode = result.status ?? 1;
} finally {
  if (existsSync(activeWranglerJsoncPath)) {
    rmSync(activeWranglerJsoncPath, { force: true });
  }

  if (existsSync(tempWranglerTomlPath)) {
    renameSync(tempWranglerTomlPath, activeWranglerTomlPath);
  }
}
