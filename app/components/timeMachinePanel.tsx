/**
 * Time Machine panel for replaying historical market climates with client-side validation.
 * Keeps URL-driven state consistent while providing immediate feedback on availability.
 */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { Popover } from "@base-ui/react/popover";
import { Tabs } from "@base-ui/react/tabs";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import type { RegimeKey } from "../../lib/regimeEngine";
import type { SummaryArchiveEntry } from "../../lib/summaryArchive";
import { MonthlySummaryCard } from "./monthlySummaryCard";
import { QuarterlySummaryCard } from "./quarterlySummaryCard";
import { WeeklySummaryCard } from "./weeklySummaryCard";
import { YearlySummaryCard } from "./yearlySummaryCard";

const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatMonthInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return undefined;
  }
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
};

const parseMonthInput = (value: string) => {
  const [yearPart, monthPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (
    !yearPart ||
    !monthPart ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return { year, month };
};

type TimeMachinePanelProps = {
  selectedYear: number;
  selectedMonth: number;
  isHistorical: boolean;
  latestRecordDate: string;
  cacheCoverage: { earliest: string | null; latest: string | null };
  monthsByYear: Record<number, number[]>;
  invalidSelection: boolean;
  provenance: DataProvenance;
  summaryArchive: SummaryArchiveEntry[];
  historicalRegime?: RegimeKey | null;
  historicalSummary?: string | null;
  comparison?: {
    then: {
      regime: RegimeKey;
      recordDate: string;
      baseRate: number;
      curveSlope: number | null;
      tightness: number;
      riskAppetite: number;
    };
    now: {
      regime: RegimeKey;
      recordDate: string;
      baseRate: number;
      curveSlope: number | null;
      tightness: number;
      riskAppetite: number;
    };
  } | null;
};

export const TimeMachinePanel = ({
  selectedYear,
  selectedMonth,
  isHistorical,
  latestRecordDate,
  cacheCoverage,
  monthsByYear,
  invalidSelection,
  provenance,
  summaryArchive,
  historicalRegime,
  historicalSummary,
  comparison,
}: TimeMachinePanelProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const errorId = "time-machine-error";
  const monthRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parseQueryNumber = (value: string | null, fallback: number) => {
    if (!value) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const draftMonthParam = searchParams.get("draftMonth");
  const draftYearParam = searchParams.get("draftYear");
  const queryMonthParam = draftMonthParam ?? searchParams.get("month");
  const queryYearParam = draftYearParam ?? searchParams.get("year");
  const month = parseQueryNumber(queryMonthParam, selectedMonth);
  const year = parseQueryNumber(queryYearParam, selectedYear);
  const isDraft = Boolean(draftMonthParam || draftYearParam);

  const availableMonths = useMemo(() => monthsByYear[year] ?? [], [monthsByYear, year]);
  const isUnavailableSelection =
    invalidSelection || (availableMonths.length > 0 && !availableMonths.includes(month));
  const isInvalid = Boolean(errorMessage);
  const requestedMonthLabel =
    monthOptions.find((option) => option.value === month)?.label ?? `Month ${month}`;
  const coverageLabel =
    cacheCoverage.earliest && cacheCoverage.latest
      ? {
          earliest: formatDate(cacheCoverage.earliest),
          latest: formatDate(cacheCoverage.latest),
        }
      : null;
  const latestRecordLabel = formatDate(latestRecordDate);
  const selectedLabel = `${requestedMonthLabel} ${year}`;
  const showHistoricalCallout = isHistorical && historicalSummary;
  const showComparison = Boolean(isHistorical && comparison);
  const statusMessages = [
    errorMessage
      ? { key: "error", message: errorMessage, includeId: true }
      : null,
    invalidSelection
      ? {
          key: "invalid",
          message: "That month is not available in the cache. Showing the latest data instead.",
          includeId: false,
        }
      : null,
  ].filter((item): item is { key: string; message: string; includeId: boolean } => Boolean(item));
  const coverageMin = cacheCoverage.earliest ? formatMonthInput(cacheCoverage.earliest) : undefined;
  const coverageMax = cacheCoverage.latest ? formatMonthInput(cacheCoverage.latest) : undefined;
  const latestMonthValue = formatMonthInput(latestRecordDate);
  const availableYears = useMemo(
    () =>
      Object.keys(monthsByYear)
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b),
    [monthsByYear]
  );
  const minYear = availableYears.at(0) ?? year;
  const maxYear = availableYears.at(-1) ?? year;
  const [calendarYear, setCalendarYear] = useState(year);
  const calendarMonths = monthsByYear[calendarYear] ?? [];

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  const formatScore = (value: number) => value.toFixed(0);
  const formatDelta = (thenValue: number, nowValue: number, unit = "") => {
    const delta = nowValue - thenValue;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(2)}${unit}`;
  };
  const formatCurve = (value: number | null) =>
    value === null ? "—" : `${value.toFixed(2)}%`;
  const cadenceOptions = ["weekly", "monthly", "quarterly", "yearly"] as const;

  const buildProvenanceTooltip = (
    provenanceData: SummaryArchiveEntry["summary"]["provenance"]
  ) => {
    return [
      `Source: ${provenanceData.sourceLabel}`,
      provenanceData.sourceUrl ? `URL: ${provenanceData.sourceUrl}` : null,
      `Timestamp: ${provenanceData.timestampLabel}`,
      `Data age: ${provenanceData.ageLabel}`,
      `Confidence: ${provenanceData.statusLabel}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const [timelineCadence, setTimelineCadence] = useState<
    "weekly" | "monthly" | "quarterly" | "yearly"
  >("monthly");
  const cadenceEntries = useMemo(
    () => summaryArchive.filter((entry) => entry.cadence === timelineCadence),
    [summaryArchive, timelineCadence]
  );
  const cadenceRange = useMemo(() => {
    if (cadenceEntries.length === 0) {
      return { min: null, max: null };
    }
    const sorted = [...cadenceEntries].sort(
      (a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime()
    );
    return { min: sorted[0].asOf, max: sorted.at(-1)?.asOf ?? null };
  }, [cadenceEntries]);
  const { min: cadenceMin, max: cadenceMax } = cadenceRange;
  const [rangeStart, setRangeStart] = useState(() => cadenceRange.min ?? "");
  const [rangeEnd, setRangeEnd] = useState(() => cadenceRange.max ?? "");

  useEffect(() => {
    setCalendarYear(year);
  }, [year]);

  useEffect(() => {
    if (!cadenceMin || !cadenceMax) {
      setRangeStart("");
      setRangeEnd("");
      return;
    }
    setRangeStart((previous) => {
      if (!previous || previous < cadenceMin || previous > cadenceMax) {
        return cadenceMin;
      }
      return previous;
    });
    setRangeEnd((previous) => {
      if (!previous || previous < cadenceMin || previous > cadenceMax) {
        return cadenceMax;
      }
      return previous;
    });
  }, [cadenceMax, cadenceMin]);

  const filteredEntries = useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      return [];
    }
    if (rangeEnd < rangeStart) {
      return [];
    }
    return cadenceEntries
      .filter((entry) => entry.asOf >= rangeStart && entry.asOf <= rangeEnd)
      .sort((a, b) => new Date(b.asOf).getTime() - new Date(a.asOf).getTime());
  }, [cadenceEntries, rangeEnd, rangeStart]);

  const handleExportTimeline = () => {
    if (filteredEntries.length === 0) {
      return;
    }
    const filename = `time-machine-${timelineCadence}-${rangeStart}-to-${rangeEnd}.json`;
    const blob = new Blob([JSON.stringify(filteredEntries, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isUnavailableSelection) {
      setErrorMessage("That month is not available for the selected year.");
      monthRef.current?.focus();
      return;
    }
    setErrorMessage(null);
    startTransition(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("draftMonth");
      nextParams.delete("draftYear");
      nextParams.set("month", String(month));
      nextParams.set("year", String(year));
      router.push(`${pathname}?${nextParams.toString()}` as Route, { scroll: false });
    });
  };

  const handleMonthChange = (nextYear: number, nextMonth: number) => {
    setErrorMessage(null);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("draftMonth", String(nextMonth));
    nextParams.set("draftYear", String(nextYear));
    router.push(`${pathname}?${nextParams.toString()}` as Route, { scroll: false });
  };

  const clearDraftHref = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("draftMonth");
    nextParams.delete("draftYear");
    const queryString = nextParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);

  const jumpToLatestHref = useMemo(() => {
    if (!latestMonthValue) {
      return `${pathname}?${searchParams.toString()}`;
    }
    const parsed = parseMonthInput(latestMonthValue);
    if (!parsed) {
      return `${pathname}?${searchParams.toString()}`;
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("draftMonth");
    nextParams.delete("draftYear");
    nextParams.set("month", String(parsed.month));
    nextParams.set("year", String(parsed.year));
    const queryString = nextParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [latestMonthValue, pathname, searchParams]);

  return (
    <section id="time-machine" aria-labelledby="time-machine-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Time Machine</p>
            <h3 id="time-machine-title" className="type-section text-slate-100">
              Replay a prior market climate
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Pull the latest available Treasury record on or before a chosen month to see the
              historical climate read.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {isHistorical ? (
              <a
                href="/"
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Exit historical view
              </a>
            ) : null}
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Historical mode</p>
            <p className="mt-3 type-data text-slate-300">
              You are replaying the macro climate from{" "}
              <span className="font-semibold text-slate-100">{selectedLabel}</span>. Treat the
              constraints as if those market conditions were active today.
            </p>
            {showHistoricalCallout ? (
              <div className="weather-surface mt-4 rounded-lg p-3">
                <p className="type-label text-slate-400">
                  Operational implication · {historicalRegime?.toLowerCase()}
                </p>
                <p className="mt-2 text-sm text-slate-200">{historicalSummary}</p>
              </div>
            ) : null}
          </div>
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Snapshot</p>
            <p className="mt-3 text-lg font-semibold text-slate-100">{selectedLabel}</p>
            <p className="mt-2 text-xs text-slate-500">Highlights the month loaded into the report.</p>
          </div>
        </div>

        {showComparison && comparison ? (
          <div className="weather-surface mt-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="type-label text-slate-400">Then vs now</p>
              <p className="text-xs text-slate-500">
                Then: {formatDate(comparison.then.recordDate)} · Now:{" "}
                {formatDate(comparison.now.recordDate)}
              </p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="weather-surface rounded-lg p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Market climate</p>
                <p className="mt-2 text-sm text-slate-100">
                  {comparison.then.regime.toLowerCase()} →{" "}
                  {comparison.now.regime.toLowerCase()}
                </p>
              </div>
              <div className="weather-surface rounded-lg p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Base rate</p>
                <p className="mt-2 text-sm text-slate-100">
                  {formatPercent(comparison.then.baseRate)} →{" "}
                  {formatPercent(comparison.now.baseRate)} (
                  {formatDelta(
                    comparison.then.baseRate,
                    comparison.now.baseRate,
                    "%"
                  )}
                  )
                </p>
              </div>
              <div className="weather-surface rounded-lg p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Curve slope</p>
                <p className="mt-2 text-sm text-slate-100">
                  {formatCurve(comparison.then.curveSlope)} →{" "}
                  {formatCurve(comparison.now.curveSlope)}
                  {comparison.then.curveSlope !== null && comparison.now.curveSlope !== null
                    ? ` (${formatDelta(comparison.then.curveSlope, comparison.now.curveSlope, "%")})`
                    : ""}
                </p>
              </div>
              <div className="weather-surface rounded-lg p-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Tightness vs risk
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  {formatScore(comparison.then.tightness)}/
                  {formatScore(comparison.then.riskAppetite)} →{" "}
                  {formatScore(comparison.now.tightness)}/
                  {formatScore(comparison.now.riskAppetite)} (
                  {formatDelta(
                    comparison.then.tightness,
                    comparison.now.tightness
                  )}
                  /{formatDelta(comparison.then.riskAppetite, comparison.now.riskAppetite)})
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-[1fr,auto]">
          <Field.Root className="space-y-2 text-xs font-semibold tracking-[0.12em] text-slate-300">
            <Field.Label>Month</Field.Label>
            <Popover.Root>
              <Popover.Trigger
                ref={monthRef}
                id="time-machine-month"
                aria-invalid={isInvalid}
                aria-describedby={isInvalid ? errorId : undefined}
                className="weather-input inline-flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-base transition-colors hover:border-sky-500/70 touch-manipulation"
              >
                <span>{selectedLabel}</span>
                <span className="text-xs text-slate-400">Pick month</span>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner side="bottom" align="start" sideOffset={10}>
                  <Popover.Popup className="w-72 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-4 text-xs text-slate-300 shadow-xl">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setCalendarYear((prev) => Math.max(minYear, prev - 1))}
                        disabled={calendarYear <= minYear}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-800/70 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800/70 disabled:text-slate-600"
                      >
                        ‹
                      </button>
                      <span className="text-sm font-semibold text-slate-100">{calendarYear}</span>
                      <button
                        type="button"
                        onClick={() => setCalendarYear((prev) => Math.min(maxYear, prev + 1))}
                        disabled={calendarYear >= maxYear}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-800/70 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800/70 disabled:text-slate-600"
                      >
                        ›
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {monthOptions.map((option) => {
                        const isAvailable =
                          calendarMonths.length === 0
                            ? false
                            : calendarMonths.includes(option.value);
                        const isActive = calendarYear === year && option.value === month;
                        return (
                          <Popover.Close
                            key={`${calendarYear}-${option.value}`}
                            type="button"
                            onClick={() => {
                              if (isAvailable) {
                                handleMonthChange(calendarYear, option.value);
                              } else {
                                setErrorMessage(
                                  "That month is not available for the selected year."
                                );
                              }
                            }}
                            disabled={!isAvailable}
                            className={`inline-flex min-h-[36px] items-center justify-center rounded-lg border px-2 py-1 text-[11px] font-semibold tracking-[0.12em] transition-colors ${
                              isActive
                                ? "border-sky-400/70 text-slate-100"
                                : "border-slate-800/70 text-slate-300"
                            } ${
                              isAvailable
                                ? "hover:border-sky-400/70 hover:text-slate-100"
                                : "cursor-not-allowed text-slate-600"
                            }`}
                          >
                            {option.label.slice(0, 3)}
                          </Popover.Close>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500">
                      {coverageMin && coverageMax
                        ? `Coverage: ${coverageMin} → ${coverageMax}`
                        : "No cache loaded yet."}
                    </div>
                    <Popover.Arrow className="h-3 w-3 translate-y-[1px] rotate-45 rounded-[3px] bg-slate-950/95" />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </Field.Root>
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="weather-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
          >
            {isPending ? (
              <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            ) : null}
            {isPending ? "Loading" : "Load snapshot"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <a
            href={clearDraftHref}
            className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:border-slate-500/70 hover:text-slate-100 touch-manipulation"
          >
            Clear draft
          </a>
          <a
            href={jumpToLatestHref}
            className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
          >
            Jump to latest
          </a>
        </div>
        <div className="mt-4 min-h-[20px]">
          {statusMessages.length > 0 ? (
            <div
              id={statusMessages.some((message) => message.includeId) ? errorId : undefined}
              className="space-y-2 text-xs text-amber-200"
              role="status"
              aria-live="polite"
            >
              {statusMessages.map((message) => (
                <p key={message.key}>{message.message}</p>
              ))}
            </div>
          ) : null}
        </div>
        {isDraft ? (
          <p className="mt-2 text-xs text-slate-500">
            Draft selection is staged in the URL. Load snapshot to apply.
          </p>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          Latest available record:{" "}
          <span className="mono text-slate-300">
            <time dateTime={latestRecordDate}>{latestRecordLabel}</time>
          </span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Cache coverage:{" "}
          <span className="mono text-slate-300">
            {coverageLabel && cacheCoverage.earliest && cacheCoverage.latest ? (
              <>
                <time dateTime={cacheCoverage.earliest}>{coverageLabel.earliest}</time> →{" "}
                <time dateTime={cacheCoverage.latest}>{coverageLabel.latest}</time>
              </>
            ) : (
              "No cache loaded"
            )}
          </span>
        </p>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="type-label text-slate-400">Summary timeline</p>
              <p className="mt-2 text-sm text-slate-300">
                Browse archived action summaries and export a filtered slice for offline review.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportTimeline}
              disabled={filteredEntries.length === 0}
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
            >
              Export timeline (JSON)
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">Filters</p>
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                    Cadence
                  </p>
                  <Tabs.Root
                    value={timelineCadence}
                    onValueChange={(value) => {
                      if (value) {
                        setTimelineCadence(value as (typeof cadenceOptions)[number]);
                      }
                    }}
                    className="mt-2"
                  >
                    <Tabs.List className="flex flex-wrap gap-2">
                      {cadenceOptions.map((cadence) => (
                        <Tabs.Tab
                          key={cadence}
                          value={cadence}
                          className={({ active }) =>
                            `weather-pill inline-flex min-h-[40px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] transition-colors touch-manipulation ${
                              active
                                ? "border-sky-400/70 text-slate-100"
                                : "text-slate-300 hover:border-slate-500/70 hover:text-slate-100"
                            }`
                          }
                        >
                          {cadence}
                        </Tabs.Tab>
                      ))}
                    </Tabs.List>
                    {cadenceOptions.map((cadence) => (
                      <Tabs.Panel key={cadence} value={cadence} className="mt-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field.Root className="space-y-2 text-xs font-semibold tracking-[0.12em] text-slate-300">
                            <Field.Label>Start date</Field.Label>
                            <Input
                              type="date"
                              value={rangeStart}
                              min={cadenceRange.min ?? undefined}
                              max={cadenceRange.max ?? undefined}
                              onChange={(event) => setRangeStart(event.target.value)}
                              className="weather-input min-h-[44px] w-full px-3 py-2 text-base transition-colors hover:border-sky-500/70 touch-manipulation"
                            />
                          </Field.Root>
                          <Field.Root className="space-y-2 text-xs font-semibold tracking-[0.12em] text-slate-300">
                            <Field.Label>End date</Field.Label>
                            <Input
                              type="date"
                              value={rangeEnd}
                              min={cadenceRange.min ?? undefined}
                              max={cadenceRange.max ?? undefined}
                              onChange={(event) => setRangeEnd(event.target.value)}
                              className="weather-input min-h-[44px] w-full px-3 py-2 text-base transition-colors hover:border-sky-500/70 touch-manipulation"
                            />
                          </Field.Root>
                        </div>
                        <p className="text-xs text-slate-500">
                          {rangeStart && rangeEnd
                            ? `${filteredEntries.length} entries match the range.`
                            : "Select a date range to load the timeline."}
                        </p>
                      </Tabs.Panel>
                    ))}
                  </Tabs.Root>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {filteredEntries.length === 0 ? (
                <div className="weather-surface p-4">
                  <p className="type-label text-slate-400">No entries</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Adjust the range or cadence to load historical summaries.
                  </p>
                </div>
              ) : null}
              {filteredEntries.map((entry) => {
                const label = (() => {
                  switch (entry.cadence) {
                    case "weekly":
                      return `Week ${entry.week}, ${entry.year}`;
                    case "monthly":
                      return `${monthOptions.find((option) => option.value === entry.month)?.label ?? "Month"} ${entry.year}`;
                    case "quarterly":
                      return `Q${entry.quarter} ${entry.year}`;
                    case "yearly":
                      return `${entry.year}`;
                    default:
                      return "Unknown";
                  }
                })();
                const tooltip = buildProvenanceTooltip(entry.summary.provenance);
                return (
                  <div key={`${entry.cadence}-${entry.asOf}`} className="weather-surface p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="type-label text-slate-400">{label}</p>
                        <p className="mt-2 text-sm text-slate-200">
                          As of{" "}
                          <time dateTime={entry.asOf}>{formatDate(entry.asOf)}</time>
                        </p>
                      </div>
                      <span
                        title={tooltip}
                        aria-label="Summary provenance"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 text-xs font-semibold text-slate-300"
                      >
                        ⓘ
                      </span>
                    </div>
                    {entry.cadence === "weekly" ? (
                      <WeeklySummaryCard summary={entry.summary} />
                    ) : entry.cadence === "monthly" ? (
                      <MonthlySummaryCard summary={entry.summary} />
                    ) : entry.cadence === "quarterly" ? (
                      <QuarterlySummaryCard summary={entry.summary} />
                    ) : (
                      <YearlySummaryCard summary={entry.summary} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
