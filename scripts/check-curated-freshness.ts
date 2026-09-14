#!/usr/bin/env bun
/**
 * Ages the hand-curated macro series against their freshness SLA and fails the
 * gate when one of them drifts past it.
 *
 * The six startup/structural series in `data/macro_snapshot.json` have no live
 * fetcher — they are curated by hand each quarter, and
 * `scripts/refreshFallbackSnapshots.ts` carries their values and timestamps
 * forward on every run. That is correct behavior for a deterministic fallback,
 * and it is also why the drift is invisible: nothing in the ingest path refreshes
 * them, so nothing notices when the curation pass itself slips. On 2026-09-14
 * the snapshot had ridden at a February record date for 223 days — five times
 * its SLA — and every check was green.
 *
 * This check is the thing that notices. It reads the same curated series the
 * trust surface reports on and fails when one exceeds its SLA, so a slipped
 * curation pass costs a red gate instead of a silent quarter of stale overlays.
 *
 * The SLA is deliberately the same constant the trust surface uses
 * (`CURATED_SNAPSHOT_SLA_HOURS`), so the gate and the rendered trust state can
 * never disagree about how old is too old.
 *
 * The check is warn-only by default and fails under `--strict`. A curated
 * series can only go current through a human curation pass, so a blocking
 * default would hold the whole gate red until that pass lands — the same
 * permanently-red trap that made the old dependency-review check worthless.
 * Run with `--strict` once the data is refreshed to make the drift a merge
 * blocker instead of a warning.
 *
 * Usage:
 *   bun run scripts/check-curated-freshness.ts            # warn on drift
 *   bun run scripts/check-curated-freshness.ts --strict   # fail on drift
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dirname ?? __dirname, '..');
const SNAPSHOT_PATH = join(REPO_ROOT, 'data', 'macro_snapshot.json');

/** Kept identical to `CURATED_SNAPSHOT_SLA_HOURS` in lib/report/sourceHealth.ts. */
const CURATED_SNAPSHOT_SLA_HOURS = 45 * 24;

const CURATED_SERIES_IDS = [
  'VC_FUNDING_VELOCITY',
  'TECH_LAYOFF_TREND',
  'SAAS_VALUATION_MULTIPLE',
  'EARNINGS_REVISION_INDEX',
  'AI_COMPUTE_COST_TREND',
  'REGULATORY_RISK_TRACKER',
];

type CuratedSeries = {
  id: string;
  record_date?: string;
  fetched_at?: string;
};

type SnapshotPayload = {
  fetched_at?: string;
  series?: CuratedSeries[];
};

export const findStaleCuratedSeries = (
  payload: SnapshotPayload,
  now: Date = new Date(),
): Array<{ id: string; recordDate: string | null; ageDays: number }> => {
  const series = payload.series ?? [];
  const stale: Array<{ id: string; recordDate: string | null; ageDays: number }> = [];

  for (const id of CURATED_SERIES_IDS) {
    const entry = series.find((s) => s.id === id);
    if (!entry) {
      stale.push({ id, recordDate: null, ageDays: Number.POSITIVE_INFINITY });
      continue;
    }

    const timestamp = entry.record_date ?? entry.fetched_at ?? null;
    if (!timestamp) {
      stale.push({ id, recordDate: null, ageDays: Number.POSITIVE_INFINITY });
      continue;
    }

    const parsed = Date.parse(`${timestamp}T00:00:00.000Z`);
    if (Number.isNaN(parsed)) {
      stale.push({ id, recordDate: timestamp, ageDays: Number.POSITIVE_INFINITY });
      continue;
    }

    const ageDays = (now.getTime() - parsed) / 86_400_000;
    if (ageDays * 24 > CURATED_SNAPSHOT_SLA_HOURS) {
      stale.push({ id, recordDate: timestamp, ageDays: Math.round(ageDays) });
    }
  }

  return stale;
};

const main = () => {
  const strict = process.argv.includes('--strict');
  const payload = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as SnapshotPayload;
  const stale = findStaleCuratedSeries(payload);

  if (stale.length === 0) {
    console.log(`✅ Curated macro series are within the ${CURATED_SNAPSHOT_SLA_HOURS / 24}-day SLA.`);
    return;
  }

  const lines = stale.map(
    (entry) =>
      `  ${entry.id}: record ${entry.recordDate ?? 'missing'}, ${Number.isFinite(entry.ageDays) ? `${entry.ageDays}d old` : 'age unknown'} (SLA ${CURATED_SNAPSHOT_SLA_HOURS / 24}d)`,
  );

  if (strict) {
    console.error(`❌ Curated macro series past freshness SLA — hand-refresh data/macro_snapshot.json:\n${lines.join('\n')}`);
    process.exit(1);
  }

  console.warn(
    `⚠ Curated macro series past freshness SLA (warning only; run with --strict to fail):\n${lines.join('\n')}\n` +
      `  Hand-refresh data/macro_snapshot.json with sourced values, then flip the gate to strict.`,
  );
};

if (import.meta.main) {
  main();
}
