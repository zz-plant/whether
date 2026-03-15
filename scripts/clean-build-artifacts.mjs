import { rmSync } from "node:fs";

const targets = [".next", "out", ".vercel"];

for (const target of targets) {
  rmSync(target, { force: true, recursive: true });
  console.log(`Removed ${target}`);
}

console.log("Cleanup complete.");
