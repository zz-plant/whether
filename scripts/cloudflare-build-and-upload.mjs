import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const BUILD_META_PATH = join('.vercel', 'output', 'static', '_worker.js', 'build-meta.json');

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

const currentCommitSha =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  null;

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
  run('bun', ['run', 'build:pages:skip-next-build']);
} else {
  run('bun', ['run', 'build:pages']);
}

run('bunx', ['wrangler', 'versions', 'upload']);
