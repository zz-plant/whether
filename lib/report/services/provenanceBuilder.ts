import { formatAgeHours, formatDateUTC, formatTimestampUTC } from "../../formatters";
import type { MacroSeriesReading, TreasuryData } from "../../types";
import type { TimeMachineSelection } from "../../timeMachine/timeMachineSelection";

export const buildReportProvenance = ({
  historicalSelection,
  macroSeries,
  now,
  treasury,
}: {
  historicalSelection: TimeMachineSelection | null;
  macroSeries: MacroSeriesReading[];
  now: Date;
  treasury: TreasuryData;
}) => {
  const recordDateLabel = formatDateUTC(treasury.record_date);
  const fetchedAtLabel = formatTimestampUTC(treasury.fetched_at);
  const treasuryAgeLabel = formatAgeHours(treasury.fetched_at, now);
  const confidenceLabel = historicalSelection
    ? "Simulated (low)"
    : treasury.isLive
      ? "Live (high confidence)"
      : "Cached (medium)";

  const treasuryProvenance = {
    sourceLabel: "Federal Reserve Economic Data (FRED)",
    sourceUrl: treasury.source,
    recordDateLabel,
    timestampLabel: fetchedAtLabel,
    ageLabel: treasuryAgeLabel,
    statusLabel: confidenceLabel,
  };

  const macroTimestamp = macroSeries[0]?.fetched_at ?? treasury.fetched_at;
  const macroRecordDate = macroSeries[0]?.record_date ?? treasury.record_date;
  const macroAgeLabel = formatAgeHours(macroTimestamp, now);
  const macroProvenance = {
    sourceLabel: "FRED & US Treasury",
    sourceUrl: macroSeries[0]?.sourceUrl,
    recordDateLabel: formatDateUTC(macroRecordDate),
    timestampLabel: formatTimestampUTC(macroTimestamp),
    ageLabel: macroAgeLabel,
    statusLabel: historicalSelection
      ? "Simulated (low)"
      : macroSeries.some((signal) => signal.isLive)
        ? "Live (high confidence)"
        : "Cached (medium)",
  };

  const internalProvenance = {
    sourceLabel: "Whether curated playbook catalog",
    recordDateLabel: "Static",
    timestampLabel: "Static catalog",
    ageLabel: "Static.",
    statusLabel: "Simulated (low)",
  };

  return {
    fetchedAtLabel,
    internalProvenance,
    macroProvenance,
    recordDateLabel,
    treasuryProvenance,
  };
};
