/**
 * The deployed Worker's identity, read from the `CF_VERSION_METADATA` binding so the running
 * Worker can say which commit it is from outside the deploy pipeline. Resolved through
 * `globalThis` like every binding, structurally typed so it typechecks where the binding is
 * absent. docs/agents/lessons/runtime-helpers.md.
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

/** Null off Cloudflare, where the binding does not exist. Callers report the absence rather than invent a version. */
export const getDeployedVersion = (): DeployedVersion | null => {
  const binding: unknown = Reflect.get(globalThis, "CF_VERSION_METADATA");
  return isDeployedVersion(binding) ? binding : null;
};

/* Replaced at build time by vite.config.ts with the commit the bundle was built from. Never
   defined under `bun test`, where `typeof` keeps the read from throwing. */
declare const __WHETHER_BUILD_COMMIT__: string | undefined;

/**
 * The git commit this bundle was built from, so "is my merge live?" is one request rather
 * than a comparison of timestamps. The version binding cannot carry it: the deploy adapter
 * passes no `--tag` to Wrangler. Null when the build had no commit to read.
 */
export const getBuildCommit = (): string | null =>
  typeof __WHETHER_BUILD_COMMIT__ === "string" && /^[0-9a-f]{7,40}$/.test(__WHETHER_BUILD_COMMIT__)
    ? __WHETHER_BUILD_COMMIT__
    : null;
