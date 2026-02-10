import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const TEST_DIRECTORY = "tests";
const TEST_SUFFIX = ".test.ts";

const collectTestFiles = (directory) => {
  const entries = readdirSync(directory, { withFileTypes: true });
  const testFiles = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      testFiles.push(...collectTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(TEST_SUFFIX)) {
      testFiles.push(fullPath);
    }
  }

  return testFiles;
};

const testFiles = collectTestFiles(TEST_DIRECTORY).sort();
if (testFiles.length === 0) {
  console.error("No TypeScript test files found under tests/.");
  process.exit(1);
}

const watchModeEnabled = process.argv.includes("--watch");
const testArgs = ["--import", "tsx", "--test", ...(watchModeEnabled ? ["--watch"] : []), ...testFiles];

const result = spawnSync(process.execPath, testArgs, { stdio: "inherit" });

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error.message);
}

process.exit(1);
