import { rmSync } from "node:fs";

const targets = [".next", "out", ".vercel", "node_modules"];

for (const target of targets) {
  rmSync(target, { force: true, recursive: true });
  console.log(`Removed ${target}`);
}

console.log("Cleanup complete.");
