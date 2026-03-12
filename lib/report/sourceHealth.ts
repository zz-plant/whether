import type { MacroSeriesReading, TreasuryData } from "../types";

export type SourceFreshnessStatus = "fresh" | "stale" | "unknown";
export type SourceModeStatus = "live" | "fallback";

export type SourceHealthRow = {
  sourceName: string;
  freshnessStatus: SourceFreshnessStatus;
  freshnessSlaHours: number;
  lastSuccessfulFetchAt: string | null;
  activeFallbackReason: string | null;
  mode: SourceModeStatus;
};

const TREASURY_SOURCE_SLA_HOURS = 6;
const MACRO_SOURCE_SLA_HOURS = 24;

const classifyFreshness = (
  lastSuccessfulFetchAt: string | null | undefined,
  freshnessSlaHours: number,
  now: Date,
): SourceFreshnessStatus => {
  if (!lastSuccessfulFetchAt) {
    return "unknown";
  }

  const timestamp = Date.parse(lastSuccessfulFetchAt);
  if (Number.isNaN(timestamp)) {
    return "unknown";
  }

  return (now.getTime() - timestamp) / 3_600_000 > freshnessSlaHours ? "stale" : "fresh";
};

const resolveMacroFallbackReason = ({
  macroSeries,
  macroStatusLabel,
  treasuryFallbackReason,
}: {
  macroSeries: MacroSeriesReading[];
  macroStatusLabel?: string;
  treasuryFallbackReason?: string | null;
}) => {
  if (macroSeries.length > 0) {
    return null;
  }

  if (treasuryFallbackReason) {
    return `Macro series unavailable; ${treasuryFallbackReason}`;
  }

  if (macroStatusLabel && /fallback|unavailable/i.test(macroStatusLabel)) {
    return "Macro series unavailable; running with fallback snapshot.";
  }

  return null;
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

  const macroLastSuccessfulFetchAt =
    macroSeries
      .map((series) => series.fetched_at)
      .find((timestamp) => typeof timestamp === "string" && !Number.isNaN(Date.parse(timestamp))) ?? null;
  const macroFallbackReason = resolveMacroFallbackReason({
    macroSeries,
    macroStatusLabel,
    treasuryFallbackReason,
  });

  return [
    {
      sourceName: "Treasury",
      freshnessStatus: classifyFreshness(treasuryLastSuccessfulFetchAt, TREASURY_SOURCE_SLA_HOURS, now),
      freshnessSlaHours: TREASURY_SOURCE_SLA_HOURS,
      lastSuccessfulFetchAt: treasuryLastSuccessfulFetchAt,
      activeFallbackReason: treasuryFallbackReason,
      mode: treasuryFallbackReason ? "fallback" : treasury.isLive ? "live" : "fallback",
    },
    {
      sourceName: "Macro",
      freshnessStatus: classifyFreshness(macroLastSuccessfulFetchAt, MACRO_SOURCE_SLA_HOURS, now),
      freshnessSlaHours: MACRO_SOURCE_SLA_HOURS,
      lastSuccessfulFetchAt: macroLastSuccessfulFetchAt,
      activeFallbackReason: macroFallbackReason,
      mode: macroFallbackReason ? "fallback" : macroSeries.some((series) => series.isLive) ? "live" : "fallback",
    },
  ];
};
