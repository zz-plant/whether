/**
 * The built worker bundle's marker and the "is it current for this tree?" check.
 *
 * The landmark audit (`check-main-content-landmarks.mjs`) builds the bundle when it is
 * missing or older than its sources, then serves it (`scripts/serve-worker.mjs`). The
 * production deploy (`cloudflare-run.mjs`, `--skip-build-if-current`) reuses that same
 * bundle instead of building a second time, so one Workers Builds push pays one Vite build,
 * not two. Both callers decide with the same check, so the deploy never trusts a bundle the
 * audit would have rebuilt.
 *
 * The bundle is the Build Output the Cloudflare Vite plugin writes (`.cloudflare/output/v0/`).
 * Its root `config.json` records the mode it was built in, and only a production build counts:
 * a preview build in the same directory must never be what `deploy:cloudflare` reuses.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export const WORKER_BUNDLE_OUTPUT = ".cloudflare/output/v0";
export const WORKER_BUNDLE_MARKER = `${WORKER_BUNDLE_OUTPUT}/config.json`;
// Everything the bundle is compiled from. A source newer than the marker means the output was
// built before an edit; auditing or deploying it would report on the last build, not this tree.
export const WORKER_BUNDLE_SOURCES = [
  "app",
  "worker",
  "lib",
  "public",
  "content",
  "data",
  "vite.config.ts",
  "cloudflare.config.ts",
  "package.json",
  "bun.lock",
];

const recordedMode = (marker) => {
  try {
    const parsed = JSON.parse(readFileSync(marker, "utf8"));
    return typeof parsed?.buildContext?.mode === "string" ? parsed.buildContext.mode : null;
  } catch {
    return null;
  }
};

/**
 * Whether the built worker bundle is a production build that is current for the tree at
 * `cwd`: the marker exists, records the production mode, and no bundled source is newer.
 * Metadata-only walk; no content hashing. A find error means "not provably current", so
 * the caller rebuilds — a wasted build is cheaper than a deploy of stale code.
 */
export function isWorkerBundleCurrent(cwd = process.cwd()) {
  const marker = join(cwd, WORKER_BUNDLE_MARKER);
  if (!existsSync(marker) || recordedMode(marker) !== "production") return false;
  const newer = spawnSync(
    "find",
    [...WORKER_BUNDLE_SOURCES.filter((entry) => existsSync(join(cwd, entry))), "-newer", marker],
    { cwd, encoding: "utf8" },
  );
  return newer.status === 0 && newer.stdout.trim() === "";
}
