/** The built worker bundle's marker file (dist/server/wrangler.json). */
export const WORKER_BUNDLE_MARKER: string;
/** The build's redirect that makes `wrangler dev` read the built config (`.wrangler/deploy/config.json`). */
export const WORKER_BUNDLE_REDIRECT: string;
/** Everything the worker bundle is compiled from, checked against the marker for staleness. */
export const WORKER_BUNDLE_SOURCES: readonly string[];

/**
 * Whether the built worker bundle in dist/ is current for the tree at `cwd`: the build
 * marker and wrangler's redirect exist, and no bundled source is newer than the marker.
 * A missing marker, a missing redirect, or a `find` error all mean "not provably
 * current", so the caller rebuilds.
 */
export function isWorkerBundleCurrent(cwd?: string): boolean;