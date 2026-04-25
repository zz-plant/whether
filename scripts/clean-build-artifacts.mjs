import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const targets = [".next", ".wrangler", "out"];

// Remove the dist/ directory fully (children only, so we preserve `dist/` itself as a mount)
try {
  for (const entry of readdirSync("dist")) {
    rmSync(join("dist", entry), { force: true, recursive: true });
  }
  console.log("Cleaned dist/");
} catch {
  // dist/ may not exist
}

for (const target of targets) {
  rmSync(target, { force: true, recursive: true });
  console.log(`Removed ${target}`);
}

// Remove stale build directories with trailing spaces (e.g. "dist/client 2/")
try {
  for (const entry of readdirSync(".")) {
    if ((entry.startsWith("dist ") || entry.includes(" 2")) && entry !== "dist") {
      rmSync(entry, { force: true, recursive: true });
      console.log(`Removed stale: ${entry}`);
    }
  }
} catch {
  // no stale dirs present
}

console.log("Cleanup complete.");
