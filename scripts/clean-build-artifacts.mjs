import { rmSync } from "node:fs";

const targets = [".next", "dist", ".wrangler", "out"];

for (const target of targets) {
  rmSync(target, { force: true, recursive: true });
  console.log(`Removed ${target}`);
}

console.log("Cleanup complete.");
