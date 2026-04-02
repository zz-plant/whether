#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const TEST_ROOT_ARG = './tests';
const TEST_ROOT = path.resolve(TEST_ROOT_ARG);
const TEST_FILE_PATTERN = /\.(test|spec)\.(c|m)?(t|j)sx?$/;

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

const extraArgs = process.argv.slice(2);
const hasExplicitTimeoutArg = extraArgs.some((arg, index) => {
  if (arg === '--timeout') {
    return true;
  }

  if (arg.startsWith('--timeout=')) {
    return true;
  }

  if (arg === '-t') {
    return true;
  }

  return extraArgs[index - 1] === '-t';
});

const ciTimeoutMs = process.env.BUN_TEST_TIMEOUT_MS ?? '15000';
const testArgs = hasExplicitTimeoutArg || !process.env.CI
  ? ['test', ...extraArgs, TEST_ROOT_ARG]
  : ['test', '--timeout', ciTimeoutMs, ...extraArgs, TEST_ROOT_ARG];

const child = spawn('bun', testArgs, {
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
