/**
 * The deployed Worker's identity, read from the `CF_VERSION_METADATA` binding.
 *
 * The binding has been declared in `wrangler.toml` since it was added, with a comment
 * promising `/api/health` would surface a live version reference — but nothing read it,
 * so the promise was never kept. On 2026-09-01 production served a build from two days
 * earlier while fifteen merges reported green, and there was no way to ask the running
 * Worker which commit it was. Answering that question from outside the deploy pipeline
 * is the point: a pipeline that lies about shipping cannot also be the thing that tells
 * you what shipped.
 *
 * Resolved through `globalThis` like every other binding (see `worker/index.ts`
 * `installBindings`), and structurally typed rather than via @cloudflare/workers-types so
 * the same code typechecks under bun tests and node scripts where it is absent.
 */
type DeployedVersion = {
  id: string;
  tag: string;
  timestamp: string;
};

const isDeployedVersion = (value: unknown): value is DeployedVersion =>
  typeof value === "object"
  && value !== null
  && typeof Reflect.get(value, "id") === "string"
  && typeof Reflect.get(value, "tag") === "string"
  && typeof Reflect.get(value, "timestamp") === "string";

/**
 * Null off Cloudflare — local dev, bun tests, node scripts — where the binding does not
 * exist. Callers report the absence rather than inventing a version, because a fabricated
 * commit reference is worse than an admitted unknown for the one job this field has.
 */
export const getDeployedVersion = (): DeployedVersion | null => {
  const binding: unknown = Reflect.get(globalThis, "CF_VERSION_METADATA");
  return isDeployedVersion(binding) ? binding : null;
};
