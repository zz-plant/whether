/**
 * Time Machine panel for replaying historical regimes with client-side validation.
 * Keeps URL-driven state consistent while providing immediate feedback on availability.
 */
"use client";

import type { FormEvent } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import type { RegimeKey } from "../../lib/regimeEngine";

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
  historicalRegime,
  historicalSummary,
  comparison,
}: TimeMachinePanelProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const errorId = "time-machine-error";
  const monthRef = useRef<HTMLInputElement | null>(null);
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
  const currentMonthValue = `${year}-${String(month).padStart(2, "0")}`;
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
  const coverageMin = cacheCoverage.earliest ? formatMonthInput(cacheCoverage.earliest) : undefined;
  const coverageMax = cacheCoverage.latest ? formatMonthInput(cacheCoverage.latest) : undefined;

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  const formatScore = (value: number) => value.toFixed(0);
  const formatDelta = (thenValue: number, nowValue: number, unit = "") => {
    const delta = nowValue - thenValue;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(2)}${unit}`;
  };
  const formatCurve = (value: number | null) =>
    value === null ? "—" : `${value.toFixed(2)}%`;

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
      router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
    });
  };

  const handleMonthBlur = () => {
    if (isUnavailableSelection) {
      setErrorMessage("That month is not available for the selected year.");
    }
  };

  const handleMonthChange = (value: string) => {
    const parsed = parseMonthInput(value);
    if (!parsed) {
      return;
    }
    setErrorMessage(null);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("draftMonth", String(parsed.month));
    nextParams.set("draftYear", String(parsed.year));
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <section id="time-machine" aria-labelledby="time-machine-title" className="mt-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Time Machine</p>
            <h3 id="time-machine-title" className="type-section text-slate-100">
              Replay a prior regime
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Pull the latest available Treasury record on or before a chosen month to see the
              historical regime.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {isHistorical ? (
              <a
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 touch-manipulation"
              >
                Exit historical view
              </a>
            ) : null}
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="type-label text-slate-400">Historical mode</p>
            <p className="mt-3 type-data text-slate-300">
              You are replaying the macro regime from{" "}
              <span className="font-semibold text-slate-100">{selectedLabel}</span>. Treat the
              constraints as if those market conditions were active today.
            </p>
            {showHistoricalCallout ? (
              <div className="mt-4 rounded-lg border border-slate-700/70 bg-slate-950/80 p-3">
                <p className="type-label text-slate-400">
                  Operational implication · {historicalRegime?.toLowerCase()}
                </p>
                <p className="mt-2 text-sm text-slate-200">{historicalSummary}</p>
              </div>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="type-label text-slate-400">Snapshot</p>
            <p className="mt-3 text-lg font-semibold text-slate-100">{selectedLabel}</p>
            <p className="mt-2 text-xs text-slate-500">Highlights the month loaded into the report.</p>
          </div>
        </div>

        {showComparison && comparison ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="type-label text-slate-400">Then vs now</p>
              <p className="text-xs text-slate-500">
                Then: {formatDate(comparison.then.recordDate)} · Now:{" "}
                {formatDate(comparison.now.recordDate)}
              </p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Regime</p>
                <p className="mt-2 text-sm text-slate-100">
                  {comparison.then.regime.toLowerCase()} →{" "}
                  {comparison.now.regime.toLowerCase()}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Base rate</p>
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
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Curve slope</p>
                <p className="mt-2 text-sm text-slate-100">
                  {formatCurve(comparison.then.curveSlope)} →{" "}
                  {formatCurve(comparison.now.curveSlope)}
                  {comparison.then.curveSlope !== null && comparison.now.curveSlope !== null
                    ? ` (${formatDelta(comparison.then.curveSlope, comparison.now.curveSlope, "%")})`
                    : ""}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
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
          <label
            htmlFor="time-machine-month"
            className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400"
          >
            Month
            <input
              ref={monthRef}
              id="time-machine-month"
              name="month"
              type="month"
              value={currentMonthValue}
              min={coverageMin}
              max={coverageMax}
              onChange={(event) => handleMonthChange(event.target.value)}
              onBlur={handleMonthBlur}
              aria-invalid={isInvalid}
              aria-describedby={isInvalid ? errorId : undefined}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100 transition-colors hover:border-slate-700 touch-manipulation"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
          >
            {isPending ? (
              <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            ) : null}
            {isPending ? "Loading" : "Load snapshot"}
          </button>
        </form>
        <div className="mt-4 min-h-[20px]">
          {errorMessage ? (
            <p
              id={errorId}
              className="text-xs text-amber-200"
              role="status"
              aria-live="polite"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="mt-4 min-h-[20px]">
          {invalidSelection ? (
            <p className="text-xs text-amber-200" role="status" aria-live="polite">
              That month is not available in the cache. Showing the latest data instead.
            </p>
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
      </div>
    </section>
  );
};
