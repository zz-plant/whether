#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const TEST_ROOT_ARG = './tests';
const TEST_ROOT = path.resolve(TEST_ROOT_ARG);
const TEST_FILE_PATTERN = /\.(test|spec)\.(c|m)?(t|j)sx?$/;
/*
 * The deploy gate runs inside the Cloudflare build container, which is smaller
 * than a dev machine. This repo already documents the consequence — vinext-run's
 * own comment notes "the flakiness in this repo is real: whetherCli tests fail
 * under CPU contention" — and the suite has grown past a thousand tests. Eight
 * workers and a 60s ceiling are tuned for a workstation, not for that box, where
 * they buy contention rather than speed.
 *
 * So the gate gets conservative defaults: fewer workers, a longer ceiling. It is
 * slower and it is not flaky, which is the right trade for the only remote signal
 * this repo has. Both stay overridable, and neither changes a local run.
 */
const inDeployGate = process.env.WHETHER_DEPLOY_GATE === '1';
const testTimeoutMs = process.env.BUN_TEST_TIMEOUT_MS ?? (inDeployGate ? "120000" : "60000");

async function hasDiscoveredTestFiles(dir) {
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (await hasDiscoveredTestFiles(fullPath)) {
        return true;
      }
      continue;
    }

    if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
      return true;
    }
  }

  return false;
}

if (!(await hasDiscoveredTestFiles(TEST_ROOT))) {
  console.error('[test-guard] No test files found under ./tests matching Bun test patterns (*.test|*.spec.[jt]s[x]).');
  process.exit(1);
}

// The runner only ever looks under ./tests, so a test file written anywhere else
// is silently never run — and reads as coverage in review because it is a real
// suite that passes when invoked directly. lib/report/forecastModel.test.ts sat
// outside for long enough to accumulate 14 cases against a core model, none of
// which the suite executed. Fail loudly instead: a stray file is either misplaced
// or a duplicate, and both want a decision rather than silence.
//
// Scanned from the repository root rather than from a list of source roots. An
// allowlist of roots reproduces the bug it is meant to catch, because the next
// stray file lands in the directory nobody thought to list — this repo has src/,
// packages/, e2e/, types/, tasks/ and content/ alongside the obvious ones. Only
// build output, vendored code and generated artifacts are skipped; a genuine
// second suite (a Playwright project, say) belongs in SKIP_DIRECTORIES with a
// note, so excluding it stays a decision on the record.
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

async function collectStrayTestFiles(dir, found = []) {
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Dot-directories are tooling and caches (.next, .wrangler, .git, .husky).
      if (entry.name.startsWith('.') || SKIP_DIRECTORIES.has(entry.name)) continue;
      await collectStrayTestFiles(fullPath, found);
      continue;
    }

    if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
      found.push(path.relative(process.cwd(), fullPath));
    }
  }

  return found;
}

const strayTestFiles = await collectStrayTestFiles(process.cwd());

if (strayTestFiles.length > 0) {
  console.error(
    `[test-guard] Test files found outside ./tests, which the runner never executes:\n` +
      strayTestFiles.map((file) => `  - ${file}`).join('\n') +
      `\nMove them under ./tests (fixing their relative imports), delete them if superseded,` +
      `\nor add their directory to SKIP_DIRECTORIES if they are a separate suite with its own runner.`,
  );
  process.exit(1);
}

// Flags that consume the following argv entry as their value, so we do not
// mistake that value for a test path filter.
const VALUE_FLAGS = new Set(['-t', '--test-name-pattern', '--timeout', '--reporter', '--reporter-outfile']);

// Bun treats bare (non-flag) args as path filters. If the caller supplied one,
// appending TEST_ROOT_ARG would widen the run back to the whole suite, so only
// default to ./tests when no filter was given.
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
 * Tests that shell out to an interpreter this repo does not ship.
 *
 * tests/tools/ holds suites that drive external tooling — today the Python
 * analytics script in scripts/. They are real tests and run on every
 * `bun run test`, `bun run check`, and pre-push. What they must not do is gate a
 * deploy: the Cloudflare build image guarantees Bun and Node, not python3, and
 * the check gate in vinext-run.mjs runs inside the deploy path. A deploy that
 * fails because the build image lacks an interpreter used by an analytics script
 * is a deploy blocked by something that cannot affect the deployed artifact.
 *
 * So the gate excludes this directory and says so. Nothing is skipped or
 * quarantined — the suite still runs everywhere a contributor runs tests.
 */
const TOOL_TEST_DIRECTORY = path.join(TEST_ROOT, 'tools');

async function collectTestFiles(dir, found = []) {
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTestFiles(fullPath, found);
      continue;
    }
    if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
      found.push(fullPath);
    }
  }

  return found;
}

const extraArgs = process.argv.slice(2);
const excludeToolTests = inDeployGate && !hasPathFilter(extraArgs);

let defaultTargets = [TEST_ROOT_ARG];

if (excludeToolTests) {
  const allTests = await collectTestFiles(TEST_ROOT);
  const kept = allTests.filter((file) => !file.startsWith(`${TOOL_TEST_DIRECTORY}${path.sep}`));
  const excluded = allTests.length - kept.length;

  console.log(
    `[test-runner] deploy gate: excluding ${excluded} test file(s) under tests/tools/ ` +
      `(they drive external interpreters the build image does not guarantee). ` +
      `They still run on bun run test, bun run check, and pre-push.`,
  );

  defaultTargets = kept.map((file) => path.relative(process.cwd(), file));
}

const targetArgs = hasPathFilter(extraArgs) ? extraArgs : [...extraArgs, ...defaultTargets];
const concurrency = process.env.BUN_TEST_CONCURRENCY ?? (inDeployGate ? '2' : '8');
/*
 * `bun test` sets NODE_ENV=test only when nothing else has. A build container often
 * has — NODE_ENV=production is a common build variable — and then the suite runs in
 * production mode without anyone asking for it. Under that mode
 * lib/seo/programmaticPayloadBuilder.ts stops relaxing its freshness and provenance
 * contract, so on fallback data (any box that cannot reach FRED) one test fails that
 * passes everywhere NODE_ENV happens to be unset. A result that depends on ambient
 * NODE_ENV is not a result about the code, so the runner pins it. Overridable, for
 * the one run that deliberately wants another mode.
 */
const childEnv = { ...process.env, NODE_ENV: process.env.WHETHER_TEST_NODE_ENV ?? 'test' };
/*
 * The suite serves its own upstreams. A data key in the developer's shell would route
 * FRED or market-data reads to the real API in the middle of a test and make a fixture
 * miss, so the runner strips them: a result that depends on what happens to be exported
 * in a shell is not a result about the code.
 */
for (const key of ['FRED_API_KEY', 'ALPHA_VANTAGE_API_KEY']) {
  delete childEnv[key];
}

/*
 * Order. Bun runs every file in one process, so module-level state (mock.module patches,
 * memoized loaders, the FRED circuit breaker) leaks between files, and a suite that only
 * ever runs in one order can pass because of that order — CLAUDE.md records a build that
 * did. The deploy gate shuffles; bun prints the seed on every run, and BUN_TEST_SEED=<seed>
 * replays one. A local run keeps a fixed order unless BUN_TEST_RANDOMIZE=1 asks otherwise.
 */
const randomize = inDeployGate || process.env.BUN_TEST_RANDOMIZE === '1';
const seed = process.env.BUN_TEST_SEED;
const orderArgs = seed ? ['--randomize', `--seed=${seed}`] : randomize ? ['--randomize'] : [];

const child = spawn('bun', ['test', `--timeout=${testTimeoutMs}`, `--max-concurrency=${concurrency}`, ...orderArgs, ...targetArgs], {
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
