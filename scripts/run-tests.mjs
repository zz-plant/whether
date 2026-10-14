#!/usr/bin/env node
/**
 * Runs the suite under ./tests with the environment the suite owns.
 *
 * Rules, each recorded in docs/agents/lessons/toolchain-and-gates.md:
 * - a test file outside ./tests fails the run, because the runner would never execute it;
 * - the deploy gate leaves out tests/tools/ (external interpreters), shuffles the order
 *   and takes a longer per-test ceiling; a local run is unchanged;
 * - NODE_ENV is pinned to test, and provider keys, webhook URLs and Cloudflare credentials
 *   are stripped, so a result never depends on what a shell or a build container exports.
 */
import path from 'node:path';
import { spawn } from 'node:child_process';

import { isDeployGate } from './deploy-gate.mjs';
import { walkFiles } from './walk-files.mjs';

const TEST_ROOT_ARG = './tests';
const TEST_ROOT = path.resolve(TEST_ROOT_ARG);
const TEST_FILE_PATTERN = /\.(test|spec)\.(c|m)?(t|j)sx?$/;

const inDeployGate = isDeployGate();
// The build container is smaller than a dev machine; slower to give up is the right trade there.
const testTimeoutMs = process.env.BUN_TEST_TIMEOUT_MS ?? (inDeployGate ? "120000" : "60000");

const isTestFile = (file) => TEST_FILE_PATTERN.test(path.basename(file));

/** Every test file under ./tests, in directory order. Symlinks are left out, as a `Dirent` walk does. */
const collectTestFiles = () => walkFiles(TEST_ROOT, { followSymlinks: false }).filter(isTestFile);

if (collectTestFiles().length === 0) {
  console.error('[test-guard] No test files found under ./tests matching Bun test patterns (*.test|*.spec.[jt]s[x]).');
  process.exit(1);
}

// Scanned from the repository root: an allowlist of source roots is how the next stray
// file lands in the directory nobody listed. Only build output and generated artifacts
// are skipped; a genuine second suite belongs here with a note.
const SKIP_DIRECTORIES = new Set([
  'node_modules',
  'tests', // the suite the runner already executes
  'artifacts', // generated capture output
  'coverage',
  'dist',
  'build',
  'out',
  'public',
]);

const strayTestFiles = walkFiles(process.cwd(), {
  followSymlinks: false,
  // Dot-directories are tooling and caches (.next, .wrangler, .git, .husky).
  skip: (name, isDirectory) => isDirectory && (name.startsWith('.') || SKIP_DIRECTORIES.has(name)),
})
  .filter(isTestFile)
  .map((file) => path.relative(process.cwd(), file));

if (strayTestFiles.length > 0) {
  console.error(
    `[test-guard] Test files found outside ./tests, which the runner never executes:\n` +
      strayTestFiles.map((file) => `  - ${file}`).join('\n') +
      `\nMove them under ./tests (fixing their relative imports), delete them if superseded,` +
      `\nor add their directory to SKIP_DIRECTORIES if they are a separate suite with its own runner.`,
  );
  process.exit(1);
}

// Flags that consume the following argv entry, so its value is not mistaken for a path filter.
const VALUE_FLAGS = new Set(['-t', '--test-name-pattern', '--timeout', '--reporter', '--reporter-outfile']);

// Bun treats bare args as path filters; appending ./tests to one would widen the run back out.
function hasPathFilter(args) {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--') continue;
    if (arg.startsWith('-')) {
      if (VALUE_FLAGS.has(arg)) i += 1;
      continue;
    }
    return true;
  }
  return false;
}

/*
 * tests/tools/ holds suites that drive interpreters the build image does not guarantee.
 * They run on every `bun run test`, `bun run check` and pre-push; they do not gate a deploy.
 * The directory is empty today; the guard prints only when it excluded something.
 */
const TOOL_TEST_DIRECTORY = path.join(TEST_ROOT, 'tools');

const extraArgs = process.argv.slice(2);
const excludeToolTests = inDeployGate && !hasPathFilter(extraArgs);

let defaultTargets = [TEST_ROOT_ARG];

if (excludeToolTests) {
  const allTests = collectTestFiles();
  const kept = allTests.filter((file) => !file.startsWith(`${TOOL_TEST_DIRECTORY}${path.sep}`));
  const excluded = allTests.length - kept.length;

  if (excluded > 0) {
    console.log(
      `[test-runner] deploy gate: excluding ${excluded} test file(s) under tests/tools/ ` +
        `(they drive external interpreters the build image does not guarantee). ` +
        `They still run on bun run test, bun run check, and pre-push.`,
    );
  }

  defaultTargets = kept.map((file) => path.relative(process.cwd(), file));
}

const targetArgs = hasPathFilter(extraArgs) ? extraArgs : [...extraArgs, ...defaultTargets];
// Passed only when asked for: `--max-concurrency` bounds `test.concurrent`, which this suite has none of.
const concurrency = process.env.BUN_TEST_CONCURRENCY;
const concurrencyArgs = concurrency ? [`--max-concurrency=${concurrency}`] : [];
// `bun test` defaults NODE_ENV only when it is unset; a build container often sets production.
const childEnv = { ...process.env, NODE_ENV: process.env.WHETHER_TEST_NODE_ENV ?? 'test' };
// The suite serves its own upstreams. A webhook URL is a credential in its entirety; the
// Cloudflare four are always present in the build container and nowhere else.
for (const key of [
  'FRED_API_KEY',
  'ALPHA_VANTAGE_API_KEY',
  'SLACK_WEBHOOK_URL',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ANALYTICS_READ_TOKEN',
  'WHETHER_TELEMETRY_DATASET',
]) {
  delete childEnv[key];
}

// One process runs every file, so module state leaks between them; the gate shuffles and
// bun prints the seed, which BUN_TEST_SEED replays.
const randomize = inDeployGate || process.env.BUN_TEST_RANDOMIZE === '1';
const seed = process.env.BUN_TEST_SEED;
const orderArgs = seed ? ['--randomize', `--seed=${seed}`] : randomize ? ['--randomize'] : [];

// The gate prints failures only: a line per passing test is ~3,000 lines a build log
// window drops the failure behind. BUN_TEST_ONLY_FAILURES=1 asks for the same anywhere.
const quietArgs = inDeployGate || process.env.BUN_TEST_ONLY_FAILURES === '1' ? ['--only-failures'] : [];

const child = spawn('bun', ['test', `--timeout=${testTimeoutMs}`, ...concurrencyArgs, ...orderArgs, ...quietArgs, ...targetArgs], {
  stdio: 'inherit',
  env: childEnv,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
