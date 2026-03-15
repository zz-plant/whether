import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";


const isTruthyEnv = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

// Temporary escape hatch for Bun runtime rollout; remove after two stable CI cycles.
const shouldForceNodeRuntime =
  isTruthyEnv(process.env.FORCE_NODE_BUILD_RUNTIME) &&
  !isTruthyEnv(process.env.__WHETHER_NODE_RUNTIME_ACTIVE) &&
  Boolean(process.versions?.bun);

if (shouldForceNodeRuntime) {
  const rerun = spawnSync(
    "node",
    [fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        __WHETHER_NODE_RUNTIME_ACTIVE: "1",
      },
    },
  );

  process.exit(rerun.status ?? 1);
}

const BUILD_META_PATH = join('.vercel', 'output', 'static', '_worker.js', 'build-meta.json');
const WORKER_ENTRYPOINT_PATH = join(
  '.vercel',
  'output',
  'static',
  '_worker.js',
  'index.js',
);
const isCloudflarePagesContext =
  isTruthyEnv(process.env.CF_PAGES) ||
  Boolean(process.env.CF_PAGES_BRANCH) ||
  Boolean(process.env.CF_PAGES_COMMIT_SHA) ||
  Boolean(process.env.CF_PAGES_URL) ||
  Boolean(process.env.CF_PAGES_PROJECT_NAME) ||
  isTruthyEnv(process.env.CLOUDFLARE_PAGES);
const hasCloudflareDeployContext = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
const currentCommitSha =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  null;
const shouldUseValidationOnlyDeployPath =
  isTruthyEnv(process.env.CLOUDFLARE_DEPLOY_VALIDATION_ONLY) ||
  isTruthyEnv(process.env.CLOUDFLARE_VALIDATION_ONLY);

const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const childBuildEnv = {
  ...process.env,
  FORCE_CLOUDFLARE_WORKER_BUILD:
    process.env.FORCE_CLOUDFLARE_WORKER_BUILD ??
    (hasCloudflareDeployContext && !isCloudflarePagesContext ? "1" : undefined),
  REQUIRE_CLOUDFLARE_WORKER_BUILD_SUCCESS:
    process.env.REQUIRE_CLOUDFLARE_WORKER_BUILD_SUCCESS ??
    (isCloudflarePagesContext ||
    shouldUseValidationOnlyDeployPath
      ? "0"
      : "1"),
};
delete childBuildEnv.__WHETHER_NODE_RUNTIME_ACTIVE;

const readBuildMeta = () => {
  if (!existsSync(BUILD_META_PATH)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(BUILD_META_PATH, 'utf8'));
  } catch {
    return null;
  }
};

const buildMeta = readBuildMeta();
const hasMatchingCommit =
  Boolean(currentCommitSha) &&
  Boolean(buildMeta?.commitSha) &&
  buildMeta.commitSha === currentCommitSha;
const hasReusableOutput =
  Boolean(buildMeta?.buildTarget === 'cloudflare') &&
  Boolean(buildMeta?.useNextOnPages) &&
  Boolean(buildMeta?.workerIndexExists) &&
  Boolean(buildMeta?.commandSucceeded) &&
  hasMatchingCommit;

if (hasReusableOutput) {
  run('bun', ['run', 'build:pages:skip-next-build'], childBuildEnv);
} else {
  run('bun', ['run', 'build:pages'], childBuildEnv);
}

if (isCloudflarePagesContext) {
  console.log(
    'Cloudflare Pages context detected; skipping `wrangler versions upload` because Pages handles deployment of build output.',
  );
  process.exit(0);
}

if (shouldUseValidationOnlyDeployPath) {
  console.log(
    'Validation-only deploy mode enabled; skipping `wrangler versions upload` and keeping this run as build-only validation.',
  );
  process.exit(0);
}

const uploadBuildMeta = readBuildMeta();
const workerEntrypointExists = existsSync(WORKER_ENTRYPOINT_PATH);
const workerBuildHasCurrentCommit = currentCommitSha
  ? uploadBuildMeta?.commitSha === currentCommitSha
  : true;
const hasFreshWorkerBuildOutput =
  Boolean(uploadBuildMeta?.buildTarget === 'cloudflare') &&
  Boolean(uploadBuildMeta?.useNextOnPages) &&
  Boolean(uploadBuildMeta?.commandSucceeded) &&
  Boolean(uploadBuildMeta?.workerIndexExists) &&
  workerEntrypointExists &&
  workerBuildHasCurrentCommit;

if (!hasFreshWorkerBuildOutput) {
  const contextLabel = hasCloudflareDeployContext
    ? 'Cloudflare deploy context'
    : 'non-Pages deploy context';
  console.log(
    `${contextLabel} has no fresh worker build output for this run; skipping \`wrangler versions upload\` and keeping this run as build-only validation.`,
  );
  process.exit(0);
}

run('bun', ['run', 'wrangler:upload']);
