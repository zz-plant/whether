import { spawnSync } from "node:child_process";

const DEFAULT_START_YEAR = 2024;

const parseIntegerFlag = (flagName) => {
  const flagIndex = process.argv.indexOf(flagName);
  if (flagIndex === -1) {
    return undefined;
  }

  const value = process.argv[flagIndex + 1];
  if (!value) {
    throw new Error(`${flagName} requires a year value.`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${flagName} must be a whole-number year (received: ${value}).`);
  }

  return parsed;
};

const startYear = parseIntegerFlag("--start-year") ?? DEFAULT_START_YEAR;
const endYear = parseIntegerFlag("--end-year");
const dryRun = process.argv.includes("--dry-run");

if (endYear !== undefined && endYear < startYear) {
  throw new Error(`--end-year (${endYear}) cannot be before --start-year (${startYear}).`);
}

const scripts = [
  "scripts/generateWeeklySummaries.ts",
  "scripts/generateMonthlySummaries.ts",
  "scripts/generateQuarterlyYearlySummaries.ts",
];

const baseEnv = {
  ...process.env,
  HISTORY_START_YEAR: String(startYear),
};

if (endYear !== undefined) {
  baseEnv.HISTORY_END_YEAR = String(endYear);
}

for (const script of scripts) {
  const commandLabel = `bunx tsx ${script}`;
  if (dryRun) {
    console.log(`[dry-run] HISTORY_START_YEAR=${baseEnv.HISTORY_START_YEAR}${endYear !== undefined ? ` HISTORY_END_YEAR=${baseEnv.HISTORY_END_YEAR}` : ""} ${commandLabel}`);
    continue;
  }

  console.log(`\n→ Running ${commandLabel}`);
  const result = spawnSync("bunx", ["tsx", script], {
    stdio: "inherit",
    env: baseEnv,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
}

if (dryRun) {
  console.log("\nNo files were changed because --dry-run was supplied.");
}
