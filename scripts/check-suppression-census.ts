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
 * The baseline is deliberately inline rather than in a generated file. Lowering
 * it is a real edit to this script, so it lands in the same diff as the work that
 * earned it and is visible in review, instead of being a regenerated artifact
 * nobody reads.
 *
 * On a decrease the check passes and prints the replacement baseline. It does not
 * fail on an improvement: the gate's job is stopping regressions, and failing a
 * build because someone deleted an unused import teaches people to avoid the
 * check rather than to lower it.
 *
 * Usage:
 *   bun run scripts/check-suppression-census.ts
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(import.meta.dirname ?? __dirname, '..');

/** Roots that hold code a check could be told to ignore. */
const SCAN_ROOTS = ['app', 'lib', 'scripts', 'tests', 'worker'];

const SCAN_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.mjs', '.jsx'];

const IGNORED_DIRECTORIES = new Set([
  '.next',
  '.vercel',
  '.wrangler',
  'artifacts',
  'coverage',
  'dist',
  'node_modules',
  'out',
]);

/**
 * This file and its test both contain every pattern below as literals, so a scan
 * that included them would count the meter as debt and rise every time the
 * census gained a category.
 */
const SELF_EXCLUDED = new Set([
  'scripts/check-suppression-census.ts',
  'tests/suppressionCensus.test.ts',
]);

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
 * Rules switched off in `.oxlintrc.json` without a scoped override that turns
 * them back on. A rule that is globally off only so an `overrides` block can
 * apply it where it matters — `max-lines` for the two file-size budgets,
 * `no-restricted-imports` for the `lib/report/home` fence — is configuration,
 * not debt, and is reported separately rather than counted.
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

export /**
 * Narrow a parsed JSON value to a plain object. Asserting the config's shape
 * instead would let a malformed file report zero disabled rules — a meter that
 * lies clean is worse than one that fails, so `readConfig` throws instead.
 */
function toRecord(value: unknown): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return record;
  for (const [key, entry] of Object.entries(value)) record[key] = entry;
  return record;
}

export function auditLintRules(): RuleAudit {
  const parsed: unknown = JSON.parse(readFileSync(join(REPO_ROOT, '.oxlintrc.json'), 'utf8'));
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('.oxlintrc.json did not parse to an object; the rule census cannot be trusted');
  }

  const config = toRecord(parsed);
  const overrides = Array.isArray(config.overrides) ? config.overrides : [];

  const overridden = new Set<string>();
  const silenced = new Set<string>();
  for (const override of overrides) {
    for (const [rule, value] of Object.entries(toRecord(toRecord(override).rules))) {
      if (isEnabled(value)) overridden.add(rule);
      if (isOff(value)) silenced.add(rule);
    }
  }

  const topLevel = toRecord(config.rules);

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

function collectFiles(): string[] {
  const files: string[] = [];

  const walk = (absolute: string) => {
    for (const entry of readdirSync(absolute)) {
      if (IGNORED_DIRECTORIES.has(entry)) continue;
      const child = join(absolute, entry);
      if (statSync(child).isDirectory()) {
        walk(child);
        continue;
      }
      if (!SCAN_EXTENSIONS.some((extension) => entry.endsWith(extension))) continue;
      if (entry.endsWith('.d.ts') || entry.endsWith('.d.mts')) continue;
      const repoPath = relative(REPO_ROOT, child);
      if (SELF_EXCLUDED.has(repoPath)) continue;
      files.push(repoPath);
    }
  };

  for (const root of SCAN_ROOTS) {
    const absolute = join(REPO_ROOT, root);
    try {
      if (statSync(absolute).isDirectory()) walk(absolute);
    } catch {
      // A root that does not exist is not a failure; the repo layout may change.
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

export function takeCensus(files: string[] = collectFiles()): Census {
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

  const lintRules = auditLintRules();

  return {
    counts: {
      ...Object.fromEntries(CATEGORIES.map((category) => [category.key, hits[category.key].length])),
      disabledLintRules: lintRules.disabled.length,
      overrideDisabledRules: lintRules.overrideDisabled.length,
    },
    hits,
    lintRules,
    testFiles: files.filter((file) => file.endsWith('.test.ts') || file.endsWith('.test.tsx')).length,
  };
}

/**
 * Measured on 2026-09-03. Every entry is a ceiling: lower it when the work earns
 * it, never raise it. Raising one is a policy change and belongs in its own PR
 * with the reason, not folded into the change that needed the suppression.
 */
const BASELINE: Record<string, number> = {
  /*
   * 7 -> 8 on 2026-09-16, traded against `disabledLintRules` 2 -> 1. This is the
   * one direction a rise is allowed: `react/no-danger` was off for the whole
   * repo because fourteen surfaces embedded structured data by hand, and every
   * one was a `<script>` holding JSON — the case the rule cannot tell from an
   * HTML injection and the one React gives no other API for. Those uses are now
   * a single `app/components/jsonLdScript.tsx`, so what was a rule disabled
   * everywhere is a disable on one line someone has read. This file makes that
   * argument itself two entries down, about scoped overrides; it applies here.
   */
  lintSuppressions: 8,
  typeSuppressions: 3,
  skippedTests: 0,
  /*
   * 1 -> 0 on 2026-09-17. `react/set-state-in-effect` was the last rule off,
   * with 22 findings across 19 files, and they were not one problem: about half
   * read a browser-only source on mount, three mirrored a prop into state, the
   * rest were an animation and a reset-on-condition.
   *
   * What made it "not something to flip blind" was that nothing in this suite
   * exercises a client effect, and adding a DOM to get that is a far larger
   * change than the fix. The browser reads went to `useSyncExternalStore`
   * through `app/components/browserSource.ts`, which puts the one part that can
   * fail catastrophically — a `getSnapshot` that allocates, and so never settles
   * — in a pure module `tests/browserSource.test.ts` pins without a DOM. The
   * rest needed no new machinery: a value mirrored back through an effect is a
   * value the render already had, and an edit that has to survive until a prop
   * moves is an edit stamped with the prop it was made against.
   */
  disabledLintRules: 0,
  // Two rules are enforced everywhere but one small set of files:
  // nextjs/no-html-link-for-pages is off for app/layout.tsx, where /feed.xml is a
  // route handler serving a file that <Link> would client-navigate to; and
  // jsx-a11y/prefer-tag-over-role is off for TimelineBar and scrollProgressBar,
  // whose role="region"/"progressbar" wrappers would cost a landmark or a UA-styled
  // <progress> to satisfy. Counted, because a scoped `off` is still a suppression.
  overrideDisabledRules: 2,
};

/**
 * A floor rather than a ceiling. Deleting tests is the other way to make the
 * suite green, and it moves no number above.
 */
const MINIMUM_TEST_FILES = 212;

function main() {
  const census = takeCensus();
  const errors: string[] = [];
  const improvements: string[] = [];

  for (const key of Object.keys(BASELINE)) {
    const actual = census.counts[key] ?? 0;
    const allowed = BASELINE[key];
    const label =
      CATEGORIES.find((category) => category.key === key)?.label ??
      (key === 'overrideDisabledRules' ? 'lint rules disabled by an override' : 'disabled lint rules');

    if (actual > allowed) {
      errors.push(
        `${label}: ${actual} (baseline ${allowed}, +${actual - allowed}) — ${
          CATEGORIES.find((category) => category.key === key)?.remedy ??
          'enforce the rule in .oxlintrc.json instead of leaving it off'
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

  if (census.testFiles < MINIMUM_TEST_FILES) {
    errors.push(
      `test files: ${census.testFiles} (floor ${MINIMUM_TEST_FILES}) — a suite that shrinks is a suite that got easier to pass`,
    );
  }

  const summary = Object.entries(census.counts)
    .map(([key, value]) => `${key} ${value}/${BASELINE[key]}`)
    .join(', ');

  if (improvements.length > 0) {
    console.log('\n⚠ BASELINE IS LOOSE — tighten it in scripts/check-suppression-census.ts:');
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
