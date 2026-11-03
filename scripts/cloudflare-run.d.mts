/**
 * The version id the deploy prints once an upload has actually landed, or null when the
 * output carries no such evidence — which is what a deploy that exited 0 without
 * publishing looks like.
 */
export function findPublishedVersionId(output: string | undefined | null): string | null;

/**
 * The https URLs a `cf previews deploy` result names (`preview_urls`, then `deployment_urls`),
 * or none when its output carries no parseable result.
 */
export function findPreviewUrls(stdout: string | undefined | null): string[];

/**
 * Whether the deploy may reuse the bundle already built instead of building again:
 * only when `--skip-build-if-current` was passed, the target is production (no `--env`), and
 * the bundle is current for this tree. `targetEnv` is `""` for production, `"preview"` for a
 * Worker Preview.
 */
export function shouldReuseCurrentBundle(options: {
  skipBuildIfCurrent?: boolean;
  targetEnv?: string;
  current?: boolean;
}): boolean;
