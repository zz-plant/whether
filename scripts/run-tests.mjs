#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const TEST_ROOT_ARG = './tests';
const TEST_ROOT = path.resolve(TEST_ROOT_ARG);
const TEST_FILE_PATTERN = /\.(test|spec)\.(c|m)?(t|j)sx?$/;
const testTimeoutMs = process.env.BUN_TEST_TIMEOUT_MS ?? "60000";

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
const excludeToolTests = process.env.WHETHER_DEPLOY_GATE === '1' && !hasPathFilter(extraArgs);

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
const concurrency = process.env.BUN_TEST_CONCURRENCY ?? '8';
const child = spawn('bun', ['test', `--timeout=${testTimeoutMs}`, `--max-concurrency=${concurrency}`, ...targetArgs], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
