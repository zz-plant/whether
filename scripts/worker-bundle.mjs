/**
 * The built worker bundle's marker and the "is it current for this tree?" check.
 *
 * The landmark audit (`check-main-content-landmarks.mjs`) builds the bundle when it is
 * missing or older than its sources, then serves it under `wrangler dev`. The production
 * deploy (`cloudflare-run.mjs`, `--skip-build-if-current`) reuses that same bundle instead
 * of building a second time, so one Workers Builds push pays one Vite build, not two.
 * Both callers decide with the same check, so the deploy never trusts a bundle the audit
 * would have rebuilt.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export const WORKER_BUNDLE_MARKER = "dist/server/wrangler.json";
export const WORKER_BUNDLE_REDIRECT = ".wrangler/deploy/config.json";
// Everything the bundle is compiled from. A source newer than the marker means dist/ was
// built before an edit; auditing or deploying it would report on the last build, not this tree.
export const WORKER_BUNDLE_SOURCES = [
  "app",
  "worker",
  "lib",
  "public",
  "content",
  "data",
  "vite.config.ts",
  "wrangler.toml",
  "package.json",
  "bun.lock",
];

/**
 * Whether the built worker bundle in dist/ is current for the tree at `cwd`: the build
 * marker and wrangler's redirect exist, and no bundled source is newer than the marker.
 * Metadata-only walk; no content hashing. A find error means "not provably current", so
 * the caller rebuilds — a wasted build is cheaper than a deploy of stale code.
 */
export function isWorkerBundleCurrent(cwd = process.cwd()) {
  const marker = join(cwd, WORKER_BUNDLE_MARKER);
  if (!existsSync(marker) || !existsSync(join(cwd, WORKER_BUNDLE_REDIRECT))) return false;
  const newer = spawnSync(
    "find",
    [...WORKER_BUNDLE_SOURCES.filter((entry) => existsSync(join(cwd, entry))), "-newer", marker],
    { cwd, encoding: "utf8" },
  );
  return newer.status === 0 && newer.stdout.trim() === "";
}