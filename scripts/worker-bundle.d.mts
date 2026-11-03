/** The Build Output directory the Cloudflare Vite plugin writes (`.cloudflare/output/v0`). */
export const WORKER_BUNDLE_OUTPUT: string;
/** The built worker bundle's marker file: the Build Output's root `config.json`, which records the build's mode and whether it is a preview. */
export const WORKER_BUNDLE_MARKER: string;
/** Everything the worker bundle is compiled from, checked against the marker for staleness. */
export const WORKER_BUNDLE_SOURCES: readonly string[];

/**
 * Whether the built worker bundle is a production build that is current for the tree at
 * `cwd`: the marker exists, records a production build that is not a preview, and no bundled
 * source is newer than it. A missing or unreadable marker, another mode, a preview build, or a
 * `find` error all mean "not provably current", so the caller rebuilds.
 */
export function isWorkerBundleCurrent(cwd?: string): boolean;
