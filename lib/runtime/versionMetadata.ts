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
