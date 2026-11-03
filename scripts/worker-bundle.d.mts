/** The Build Output directory the Cloudflare Vite plugin writes (`.cloudflare/output/v0`). */
export const WORKER_BUNDLE_OUTPUT: string;
/** The built worker bundle's marker file: the Build Output's root `config.json`, which records the build's mode. */
export const WORKER_BUNDLE_MARKER: string;
/** Everything the worker bundle is compiled from, checked against the marker for staleness. */
export const WORKER_BUNDLE_SOURCES: readonly string[];

/**
 * Whether the built worker bundle is a production build that is current for the tree at
 * `cwd`: the marker exists, records the production mode, and no bundled source is newer
 * than it. A missing or unreadable marker, another mode, or a `find` error all mean "not
 * provably current", so the caller rebuilds.
 */
export function isWorkerBundleCurrent(cwd?: string): boolean;
