/**
 * The version id Wrangler prints once an upload has actually landed, or null when the
 * output carries no such evidence — which is what a deploy that exited 0 without
 * publishing looks like.
 */
export function findPublishedVersionId(output: string | undefined | null): string | null;

/**
 * A line filter that replaces each box-drawn module table Wrangler prints with its row
 * count, and passes every other line through as it arrives.
 */
export function createModuleTableFilter(emit: (text: string) => void): {
  write(chunk: string): void;
  end(): void;
};

/**
 * Whether the deploy may reuse the bundle already in dist/ instead of building again:
 * only when `--skip-build-if-current` was passed, the target is the production lane (no
 * `--env`), and the bundle is current for this tree. `targetEnv` is `""` for production.
 */
export function shouldReuseCurrentBundle(options: {
  skipBuildIfCurrent?: boolean;
  targetEnv?: string;
  current?: boolean;
}): boolean;
