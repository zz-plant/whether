import { formatAgeSpan, formatTimestampUTC } from "../formatters";
import { SIGNAL_CADENCE } from "../ingestion/cadence";
import type { MacroSeriesId, MacroSeriesReading, TreasuryData } from "../types";

export type SourceFreshnessStatus = "fresh" | "stale" | "unknown";
type SourceModeStatus = "live" | "snapshot" | "fallback";

export type SourceHealthRow = {
  sourceName: string;
  cadenceLabel: string;
  freshnessStatus: SourceFreshnessStatus;
  freshnessSlaHours: number;
  lastSuccessfulFetchAt: string | null;
  /** Coarse age of lastSuccessfulFetchAt, stamped at build time so no consumer needs a clock. */
  ageLabel: string | null;
  activeFallbackReason: string | null;
  mode: SourceModeStatus;
  /** Whether this source is meant to answer live. False only for a curated snapshot by design. */
  expectsLive: boolean;
};

type SourceHealthCoverageSummary = {
  liveCount: number;
  cachedCount: number;
  missingCount: number;
  totalCount: number;
  inputsComplete: boolean;
};

export const summarizeSourceHealthCoverage = (rows: SourceHealthRow[]): SourceHealthCoverageSummary => {
  const summary: SourceHealthCoverageSummary = {
    liveCount: 0,
    cachedCount: 0,
    missingCount: 0,
    totalCount: rows.length,
    inputsComplete: true,
  };

  for (const row of rows) {
    const hasUsableFetch = Boolean(row.lastSuccessfulFetchAt) && row.freshnessStatus !== "unknown";

    if (!hasUsableFetch) {
      summary.missingCount += 1;
      continue;
    }

    if (row.mode === "live") {
      summary.liveCount += 1;
      continue;
    }

    summary.cachedCount += 1;
  }

  summary.inputsComplete = summary.missingCount === 0;

  return summary;
};

type SourceGroupDefinition = {
  sourceName: string;
  cadenceLabel: string;
  freshnessSlaHours: number;
  ids: MacroSeriesId[];
  supportsLive: boolean;
  useBusinessDays?: boolean;
};

/*
 * The Treasury row is the reading readers are served: the stored OperatingSnapshot, which only
 * the scheduled cron writes (02:00 UTC daily). The coordinator's hourly alarm refreshes the
 * materialized model behind it, but nothing republishes the snapshot from that, so this row can
 * be no fresher than the last cron run. A 6h window here read every healthy afternoon as stale.
 * Whether the hourly alarm is still refreshing is a separate check: /api/health's
 * `ingestModel`, against INGEST_MODEL_STALE_AFTER_MS.
 */
const TREASURY_SOURCE_SLA_HOURS = SIGNAL_CADENCE.TREASURY_10Y.staleAfterMs / 3_600_000;
const MARKET_SOURCE_SLA_HOURS = 24;
const MONTHLY_RELEASE_SLA_HOURS = 45 * 24;
const CURATED_SNAPSHOT_SLA_HOURS = 45 * 24;

const macroSourceGroups: SourceGroupDefinition[] = [
  {
    sourceName: "Market stress",
    cadenceLabel: "Intraday market",
    freshnessSlaHours: MARKET_SOURCE_SLA_HOURS,
    ids: ["BBB_CREDIT_SPREAD", "HY_CREDIT_SPREAD", "CHICAGO_FCI", "VIX_INDEX"],
    supportsLive: true,
    useBusinessDays: true,
  },
  {
    sourceName: "Inflation",
    cadenceLabel: "Monthly release",
    freshnessSlaHours: MONTHLY_RELEASE_SLA_HOURS,
    ids: ["CPI_YOY"],
    supportsLive: true,
  },
  {
    sourceName: "Labor",
    cadenceLabel: "Monthly release",
    freshnessSlaHours: MONTHLY_RELEASE_SLA_HOURS,
    ids: ["UNEMPLOYMENT_RATE"],
    supportsLive: true,
  },
  {
    sourceName: "Startup/private markets",
    cadenceLabel: "Curated snapshot",
    freshnessSlaHours: CURATED_SNAPSHOT_SLA_HOURS,
    ids: [
      "VC_FUNDING_VELOCITY",
      "TECH_LAYOFF_TREND",
      "SAAS_VALUATION_MULTIPLE",
      "EARNINGS_REVISION_INDEX",
      "AI_COMPUTE_COST_TREND",
      "REGULATORY_RISK_TRACKER",
    ],
    supportsLive: false,
  },
];

const getBusinessDayElapsedHours = (timestamp: string, now: Date): number => {
  const then = Date.parse(timestamp);
  if (Number.isNaN(then)) return Infinity;

  let elapsed = 0;
  const cursor = new Date(then);

  while (cursor < now) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const endOfDay = new Date(cursor);
      endOfDay.setHours(23, 59, 59, 999);
      const sliceEnd = endOfDay < now ? endOfDay : now;
      elapsed += (sliceEnd.getTime() - cursor.getTime()) / 3_600_000;
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return elapsed;
};

const classifyFreshness = (
  lastSuccessfulFetchAt: string | null | undefined,
  freshnessSlaHours: number,
  now: Date,
  useBusinessDays = false,
): SourceFreshnessStatus => {
  if (!lastSuccessfulFetchAt) {
    return "unknown";
  }

  const timestamp = Date.parse(lastSuccessfulFetchAt);
  if (Number.isNaN(timestamp)) {
    return "unknown";
  }

  const elapsedHours = useBusinessDays
    ? getBusinessDayElapsedHours(lastSuccessfulFetchAt, now)
    : (now.getTime() - timestamp) / 3_600_000;

  return elapsedHours > freshnessSlaHours ? "stale" : "fresh";
};

export const getLatestParseableTimestamp = (timestamps: Array<string | null | undefined>): string | null => {
  let latestTimestamp: string | null = null;
  let latestEpoch = Number.NEGATIVE_INFINITY;

  for (const timestamp of timestamps) {
    if (typeof timestamp !== "string") {
      continue;
    }

    const parsedTimestamp = Date.parse(timestamp);
    if (Number.isNaN(parsedTimestamp) || parsedTimestamp <= latestEpoch) {
      continue;
    }

    latestEpoch = parsedTimestamp;
    latestTimestamp = timestamp;
  }

  return latestTimestamp;
};

const buildLiveGroupFallbackReason = ({
  group,
  relevantSeries,
  macroStatusLabel,
}: {
  group: SourceGroupDefinition;
  relevantSeries: MacroSeriesReading[];
  macroStatusLabel?: string;
}) => {
  if (relevantSeries.length === 0) {
    return macroStatusLabel && /fallback|unavailable/i.test(macroStatusLabel)
      ? `${group.sourceName} unavailable; running without live coverage.`
      : `${group.sourceName} unavailable; no series were loaded for this refresh.`;
  }

  const liveSeriesCount = relevantSeries.filter((series) => series.isLive).length;
  if (liveSeriesCount === relevantSeries.length && relevantSeries.length === group.ids.length) {
    return null;
  }

  /*
   * Name the series that are not live, rather than only the group.
   *
   * A live group is all-or-nothing: `hasCompleteLiveCoverage` needs every id, so one cached
   * series presents "Market stress" as a wholly failed source while three of its four reads
   * are fine. The mode is right -- a composite of partly stale inputs is not a live reading --
   * but "is mixing live and cached values" told an operator that something was wrong without
   * telling them what, which is the whole question when a source degrades in production and
   * the box serving it cannot be reached to look.
   */
  const staleLabels = relevantSeries.filter((series) => !series.isLive).map((series) => series.label);
  const missingIds = group.ids.filter((id) => !relevantSeries.some((series) => series.id === id));
  const detail = [
    staleLabels.length > 0 ? `cached: ${staleLabels.join(", ")}` : null,
    missingIds.length > 0 ? `not loaded: ${missingIds.join(", ")}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join("; ");

  if (liveSeriesCount > 0) {
    return `${group.sourceName} is mixing live and cached values for this refresh (${detail}).`;
  }

  return detail
    ? `${group.sourceName} is running on cached snapshot values (${detail}).`
    : `${group.sourceName} is running on cached snapshot values.`;
};

const buildGroupedRow = ({
  group,
  macroSeries,
  macroStatusLabel,
  now,
}: {
  group: SourceGroupDefinition;
  macroSeries: MacroSeriesReading[];
  macroStatusLabel?: string;
  now: Date;
}): SourceHealthRow => {
  const relevantSeries = macroSeries.filter((series) => group.ids.includes(series.id));
  const lastSuccessfulFetchAt = getLatestParseableTimestamp(relevantSeries.map((series) => series.fetched_at));
  const liveSeriesCount = relevantSeries.filter((series) => series.isLive).length;
  const hasCompleteLiveCoverage =
    group.supportsLive &&
    relevantSeries.length === group.ids.length &&
    liveSeriesCount === group.ids.length;
  const mode: SourceModeStatus = group.supportsLive
    ? hasCompleteLiveCoverage
      ? "live"
      : "fallback"
    : liveSeriesCount > 0
      ? "live"
      : "snapshot";

  return {
    sourceName: group.sourceName,
    cadenceLabel: group.cadenceLabel,
    freshnessStatus: classifyFreshness(lastSuccessfulFetchAt, group.freshnessSlaHours, now, group.useBusinessDays),
    freshnessSlaHours: group.freshnessSlaHours,
    lastSuccessfulFetchAt,
    ageLabel: formatAgeSpan(lastSuccessfulFetchAt, now),
    activeFallbackReason: group.supportsLive
      ? buildLiveGroupFallbackReason({ group, relevantSeries, macroStatusLabel })
      : null,
    mode,
    expectsLive: group.supportsLive,
  };
};

/** Non-live sources in the shape the report shell and trust surfaces render. One builder, so every page counts the same rows. */
/*
 * Degraded means "not what this source is supposed to be right now". A live
 * source answering from a fallback is degraded; so is any source past its own
 * freshness window. A source that is a curated snapshot *by design*
 * ("Startup/private markets", `supportsLive: false`) and is inside its window
 * is exactly what it is supposed to be.
 *
 * This used to count every row that was not live, and that one curated group
 * is never live, so every page on every visit reported "Partly cached" in
 * warning amber and told the reader to "hold anything you can't undo until
 * every source is current" — a condition that can never be met — while /trust,
 * reading the same read, said no warning was active and it was fine to act. A
 * warning that is always on is one a reader learns to skip, including on the
 * week it is true, and it was the first thing a new visitor was told about the
 * data.
 */
const isDegradedSource = (row: SourceHealthRow) =>
  row.freshnessStatus !== "fresh" || (row.expectsLive && row.mode !== "live");

/**
 * The sources that are meant to answer live and have gone past their freshness window: what
 * a monitor should be told. A curated snapshot is current by design and never listed. On
 * 2026-10-13 /trust printed "Treasury · Stale · 14h old" while /api/health said "ok" — the
 * health check asked only whether a report loaded, and a report built from stale inputs loads.
 */
export const listStaleLiveSources = (rows: readonly SourceHealthRow[]) =>
  rows
    .filter((row) => row.expectsLive && row.freshnessStatus === "stale")
    .map((row) => ({ source: row.sourceName, age: row.ageLabel, lastSuccessfulFetchAt: row.lastSuccessfulFetchAt }));

export const buildDegradedSourceRows = (rows: SourceHealthRow[]) =>
  rows
    .filter(isDegradedSource)
    .map((row) => ({
      sourceName: row.sourceName,
      modeLabel: formatSourceModeLabel(row.mode),
      freshnessStatus: formatSourceFreshnessLabel(row),
    }));

/** One row of the `/trust` source board: what a reader checks about a source at a glance. */
export type SourceBoardRow = {
  sourceName: string;
  cadenceLabel: string;
  /** "Live", "Current", "Cached copy", "Stale · 9d old" or "Not confirmed". */
  stateLabel: string;
  /** Answering live and inside its window. */
  live: boolean;
  /** What the source is meant to be right now: the test the trust strip counts. A curated source inside its window is as intended without being live. */
  asIntended: boolean;
  /** When it last answered, in UTC, or the absence in words. */
  updatedLabel: string;
};

/*
 * The state word, in the strip's vocabulary ("All sources live", "Partly
 * cached"), so a reader who sees "Partly cached" under the h1 finds the cached
 * row by the same word. Age and absence come first: a live source that has not
 * answered inside its window is stale before it is anything else.
 */
const sourceBoardState = (row: SourceHealthRow): string => {
  if (row.freshnessStatus === "unknown") return "Not confirmed";
  if (row.freshnessStatus === "stale") return row.ageLabel ? `Stale · ${row.ageLabel} old` : "Stale";
  if (row.mode === "live") return "Live";
  return row.expectsLive ? "Cached copy" : "Current";
};

/**
 * The board `/trust` draws open under the score derivation: every source, how
 * often it updates, when it last answered and whether it answered live. The
 * degraded rows above are the subset the strip counts; this is the whole set,
 * so a healthy week shows what "All sources live" was judged from.
 */
export const buildSourceBoardRows = (rows: SourceHealthRow[]): SourceBoardRow[] =>
  rows.map((row) => ({
    sourceName: row.sourceName,
    cadenceLabel: row.cadenceLabel,
    stateLabel: sourceBoardState(row),
    live: row.mode === "live" && row.freshnessStatus === "fresh",
    asIntended: !isDegradedSource(row),
    updatedLabel: row.lastSuccessfulFetchAt
      ? `Updated ${formatTimestampUTC(row.lastSuccessfulFetchAt)}`
      : "No update on record",
  }));

export const formatSourceModeLabel = (mode: SourceModeStatus) => {
  if (mode === "live") return "Live";
  if (mode === "snapshot") return "Snapshot-backed";
  return "Fallback";
};

export const formatSourceFreshnessLabel = (row: SourceHealthRow) => {
  if (row.freshnessStatus === "unknown") {
    return `Unknown · ${row.cadenceLabel}`;
  }

  if (row.freshnessStatus === "fresh" && row.mode === "snapshot") {
    return `Current · ${row.cadenceLabel}`;
  }

  if (row.freshnessStatus === "stale") {
    // Say how stale. "Stale · Curated snapshot" reads the same whether a source is a day past
    // its SLA or seven months past it, and those are not the same decision.
    return row.ageLabel ? `Stale ${row.ageLabel} · ${row.cadenceLabel}` : `Stale · ${row.cadenceLabel}`;
  }

  return `Fresh · ${row.cadenceLabel}`;
};

export const buildSourceHealthRows = ({
  treasury,
  macroSeries,
  macroStatusLabel,
  now = new Date(),
}: {
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  macroStatusLabel?: string;
  now?: Date;
}): SourceHealthRow[] => {
  const treasuryFallbackReason = treasury.fallback_reason ?? null;
  const treasuryLastSuccessfulFetchAt = treasury.fetched_at ?? null;

  return [
    {
      sourceName: "Treasury",
      cadenceLabel: "Daily rates",
      freshnessStatus: classifyFreshness(treasuryLastSuccessfulFetchAt, TREASURY_SOURCE_SLA_HOURS, now, true),
      freshnessSlaHours: TREASURY_SOURCE_SLA_HOURS,
      lastSuccessfulFetchAt: treasuryLastSuccessfulFetchAt,
      ageLabel: formatAgeSpan(treasuryLastSuccessfulFetchAt, now),
      activeFallbackReason: treasuryFallbackReason,
      mode: treasuryFallbackReason ? "fallback" : treasury.isLive ? "live" : "snapshot",
      expectsLive: true,
    },
    ...macroSourceGroups.map((group) => buildGroupedRow({ group, macroSeries, macroStatusLabel, now })),
  ];
};
