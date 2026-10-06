#!/usr/bin/env bun
/**
 * Counts the ways this repo can tell a check to look away, and fails when the
 * count goes up.
 *
 * Every ratchet in the gate — the disabled-rule burn-down, the type-aware
 * findings, the test suite — shares one cheap defeat: suppress the finding
 * instead of fixing it. `// oxlint-disable-next-line`, `@ts-expect-error`, and
 * `it.skip` all turn a red check green while leaving the defect in place, and
 * none of them show up in the number the ratchet reports. An agent (or a person)
 * optimizing "lint is clean" will find that path before it finds the fix,
 * because it is shorter.
 *
 * So the suppressions are themselves a metric, with a baseline that may fall and
 * may not rise. A burn-down that trades a lint finding for a disable comment
 * moves one number down and this one up, and the gate rejects it — which is the
 * whole point: it makes the shortcut cost more than the fix.
 *
 * This file is the mechanism and names nothing about the repository it scans.
 * The roots, the lint config, the self-exclusions, the baseline and the test-file
 * floor are `suppressionCensusConfig` in `scripts/census.config.ts`. The baseline
 * is a hand-edited value there rather than a generated file: lowering it is a real
 * edit, so it lands in the same diff as the work that earned it and is visible in
 * review, instead of being a regenerated artifact nobody reads.
 *
 * On a decrease the check passes and prints the replacement baseline. It does not
 * fail on an improvement: the gate's job is stopping regressions, and failing a
 * build because someone deleted an unused import teaches people to avoid the
 * check rather than to lower it.
 *
 * Usage:
 *   bun run scripts/check-suppression-census.ts
 */
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { suppressionCensusConfig } from './census.config';
import { walkFiles } from './walk-files.mjs';

const REPO_ROOT = join(import.meta.dirname ?? __dirname, '..');

/** What the census scans and allows in one repository. `scripts/census.config.ts` holds this one's. */
export type SuppressionCensusConfig = {
  /** Roots that hold code a check could be told to ignore. */
  scanRoots: string[];
  scanExtensions: string[];
  /** Names never read, wherever they sit. */
  ignoredDirectories: string[];
  /** Repo-relative files that spell the patterns out as literals: the meter, not debt. */
  selfExcluded: string[];
  /** The oxlint config whose disabled and override-disabled rules are counted. */
  lintConfig: string;
  /** What makes a scanned file a test file, for the floor. */
  testFileSuffixes: string[];
  /** Ceilings, keyed by count. */
  baseline: Record<string, number>;
  /** A floor on test files: deleting tests is the other way to make a suite green. */
  minimumTestFiles: number;
};

type Category = {
  key: string;
  label: string;
  /** What a reader should do about a finding in this category. */
  remedy: string;
  pattern: RegExp;
};

const CATEGORIES: Category[] = [
  {
    key: 'lintSuppressions',
    label: 'inline lint suppressions',
    remedy: 'fix the finding, or narrow the disable to one line with a `--` reason',
    // oxlint honours eslint-disable comments, so both spellings suppress.
    pattern: /\b(?:es|ox)lint-disable(?:-next-line|-line)?\b/g,
  },
  {
    key: 'typeSuppressions',
    label: 'type-checker suppressions',
    remedy: 'type the value, or narrow to @ts-expect-error with a reason',
    pattern: /@ts-(?:ignore|expect-error|nocheck)\b/g,
  },
  {
    key: 'skippedTests',
    label: 'skipped or todo tests',
    remedy: 'fix the test or delete it; a permanently skipped test is dead weight',
    pattern: /\b(?:it|test|describe)\.(?:skip|todo)\s*\(/g,
  },
];

/**
 * Rules switched off in the lint config without a scoped override that turns
 * them back on. A rule that is globally off only so an `overrides` block can
 * apply it where it matters — a file-size budget, an import fence — is
 * configuration, not debt, and is reported separately rather than counted.
 */
type RuleAudit = { disabled: string[]; scoped: string[]; overrideDisabled: string[] };

const isOff = (value: unknown): boolean =>
  value === 'off' || value === 0 || (Array.isArray(value) && (value[0] === 'off' || value[0] === 0));

const isEnabled = (value: unknown): boolean =>
  value === 'error' ||
  value === 'warn' ||
  value === 1 ||
  value === 2 ||
  (Array.isArray(value) && value[0] !== 'off' && value[0] !== 0);

/**
 * Narrow a parsed JSON value to a plain object. Asserting the config's shape
 * instead would let a malformed file report zero disabled rules — a meter that
 * lies clean is worse than one that fails, so `auditLintRules` throws instead.
 */
export function toRecord(value: unknown): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return record;
  for (const [key, entry] of Object.entries(value)) record[key] = entry;
  return record;
}

export function auditLintRules(config: SuppressionCensusConfig = suppressionCensusConfig): RuleAudit {
  const parsed: unknown = JSON.parse(readFileSync(join(REPO_ROOT, config.lintConfig), 'utf8'));
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${config.lintConfig} did not parse to an object; the rule census cannot be trusted`);
  }

  const lintConfig = toRecord(parsed);
  const overrides = Array.isArray(lintConfig.overrides) ? lintConfig.overrides : [];

  const overridden = new Set<string>();
  const silenced = new Set<string>();
  for (const override of overrides) {
    for (const [rule, value] of Object.entries(toRecord(toRecord(override).rules))) {
      if (isEnabled(value)) overridden.add(rule);
      if (isOff(value)) silenced.add(rule);
    }
  }

  const topLevel = toRecord(lintConfig.rules);

  const disabled: string[] = [];
  const scoped: string[] = [];
  for (const [rule, value] of Object.entries(topLevel)) {
    if (!isOff(value)) continue;
    (overridden.has(rule) ? scoped : disabled).push(rule);
  }

  /*
   * A rule enforced everywhere except one `overrides` block is not configuration —
   * it is a suppression with a wider blast radius than a disable comment, and until
   * this counted it was the cheapest way to silence a finding without moving any
   * number in this census.
   */
  const overrideDisabled = [...silenced].filter((rule) => !isOff(topLevel[rule]));

  return {
    disabled: disabled.sort(),
    scoped: scoped.sort(),
    overrideDisabled: overrideDisabled.sort(),
  };
}

function collectFiles(config: SuppressionCensusConfig): string[] {
  const ignored = new Set(config.ignoredDirectories);
  const selfExcluded = new Set(config.selfExcluded);
  const files: string[] = [];

  // A root that does not exist is not a failure; the repo layout may change. The walk
  // returns nothing for it, and skips any entry it cannot stat rather than crashing.
  for (const root of config.scanRoots) {
    for (const path of walkFiles(join(REPO_ROOT, root), { skip: (name) => ignored.has(name) })) {
      if (!config.scanExtensions.some((extension) => path.endsWith(extension))) continue;
      if (path.endsWith('.d.ts') || path.endsWith('.d.mts')) continue;
      const repoPath = relative(REPO_ROOT, path);
      if (selfExcluded.has(repoPath)) continue;
      files.push(repoPath);
    }
  }

  return files.sort();
}

export type CensusHit = { file: string; line: number; text: string };
export type Census = {
  counts: Record<string, number>;
  hits: Record<string, CensusHit[]>;
  lintRules: RuleAudit;
  testFiles: number;
};

export function takeCensus(
  files: string[] = collectFiles(suppressionCensusConfig),
  config: SuppressionCensusConfig = suppressionCensusConfig,
): Census {
  const hits: Record<string, CensusHit[]> = {};
  for (const category of CATEGORIES) hits[category.key] = [];

  for (const file of files) {
    const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const category of CATEGORIES) {
        category.pattern.lastIndex = 0;
        const matches = line.match(category.pattern);
        if (!matches) continue;
        for (let occurrence = 0; occurrence < matches.length; occurrence += 1) {
          hits[category.key].push({ file, line: index + 1, text: line.trim() });
        }
      }
    });
  }

  const lintRules = auditLintRules(config);

  return {
    counts: {
      ...Object.fromEntries(CATEGORIES.map((category) => [category.key, hits[category.key].length])),
      disabledLintRules: lintRules.disabled.length,
      overrideDisabledRules: lintRules.overrideDisabled.length,
    },
    hits,
    lintRules,
    testFiles: files.filter((file) => config.testFileSuffixes.some((suffix) => file.endsWith(suffix))).length,
  };
}

function main() {
  const config = suppressionCensusConfig;
  const census = takeCensus(collectFiles(config), config);
  const errors: string[] = [];
  const improvements: string[] = [];

  for (const key of Object.keys(config.baseline)) {
    const actual = census.counts[key] ?? 0;
    const allowed = config.baseline[key];
    const label =
      CATEGORIES.find((category) => category.key === key)?.label ??
      (key === 'overrideDisabledRules' ? 'lint rules disabled by an override' : 'disabled lint rules');

    if (actual > allowed) {
      errors.push(
        `${label}: ${actual} (baseline ${allowed}, +${actual - allowed}) — ${
          CATEGORIES.find((category) => category.key === key)?.remedy ??
          `enforce the rule in ${config.lintConfig} instead of leaving it off`
        }`,
      );
      for (const hit of (census.hits[key] ?? []).slice(0, 10)) {
        errors.push(`    ${hit.file}:${hit.line}  ${hit.text.slice(0, 100)}`);
      }
      if (key === 'disabledLintRules') {
        for (const rule of census.lintRules.disabled) errors.push(`    off: ${rule}`);
      }
      if (key === 'overrideDisabledRules') {
        for (const rule of census.lintRules.overrideDisabled) {
          errors.push(`    off in an override: ${rule}`);
        }
      }
    } else if (actual < allowed) {
      improvements.push(`${label}: ${actual} (baseline ${allowed}) — lower it to ${actual}`);
    }
  }

  if (census.testFiles < config.minimumTestFiles) {
    errors.push(
      `test files: ${census.testFiles} (floor ${config.minimumTestFiles}) — a suite that shrinks is a suite that got easier to pass`,
    );
  }

  const summary = Object.entries(census.counts)
    .map(([key, value]) => `${key} ${value}/${config.baseline[key]}`)
    .join(', ');

  if (improvements.length > 0) {
    console.log('\n⚠ BASELINE IS LOOSE — tighten it in scripts/census.config.ts:');
    for (const improvement of improvements) console.log(`  ⚠ ${improvement}`);
  }

  if (census.lintRules.scoped.length > 0) {
    console.log(
      `\n  ℹ off globally, enforced by an override (not counted): ${census.lintRules.scoped.join(', ')}`,
    );
  }

  console.log(
    `\n${errors.length === 0 ? '✅ Suppression census within baseline' : '❌ SUPPRESSIONS ROSE:'}  (${summary}, ${census.testFiles} test files)\n`,
  );

  if (errors.length > 0) {
    for (const error of errors) console.error(`  ❌ ${error}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
