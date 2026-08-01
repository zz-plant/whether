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

const extraArgs = process.argv.slice(2);
const targetArgs = hasPathFilter(extraArgs) ? extraArgs : [...extraArgs, TEST_ROOT_ARG];
const child = spawn('bun', ['test', `--timeout=${testTimeoutMs}`, ...targetArgs], {
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
