/**
 * Time Machine panel for replaying historical regimes with client-side validation.
 * Keeps URL-driven state consistent while providing immediate feedback on availability.
 */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";

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

type TimeMachinePanelProps = {
  selectedYear: number;
  selectedMonth: number;
  years: number[];
  isHistorical: boolean;
  latestRecordDate: string;
  cacheCoverage: { earliest: string | null; latest: string | null };
  monthsByYear: Record<number, number[]>;
  invalidSelection: boolean;
  provenance: DataProvenance;
};

export const TimeMachinePanel = ({
  selectedYear,
  selectedMonth,
  years,
  isHistorical,
  latestRecordDate,
  cacheCoverage,
  monthsByYear,
  invalidSelection,
  provenance,
}: TimeMachinePanelProps) => {
  const [month, setMonth] = useState(selectedMonth);
  const [year, setYear] = useState(selectedYear);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorId = "time-machine-error";
  const monthRef = useRef<HTMLSelectElement | null>(null);
  const yearRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    setMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    setYear(selectedYear);
  }, [selectedYear]);

  const availableMonths = useMemo(() => monthsByYear[year] ?? [], [monthsByYear, year]);
  const isUnavailableSelection =
    invalidSelection || (availableMonths.length > 0 && !availableMonths.includes(month));
  const isInvalid = Boolean(errorMessage);
  const requestedMonthLabel =
    monthOptions.find((option) => option.value === month)?.label ?? `Month ${month}`;
  const coverageLabel =
    cacheCoverage.earliest && cacheCoverage.latest
      ? `${formatDate(cacheCoverage.earliest)} → ${formatDate(cacheCoverage.latest)}`
      : "No cache loaded";
  const latestRecordLabel = formatDate(latestRecordDate);
  const selectedLabel = `${requestedMonthLabel} ${year}`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!isUnavailableSelection) {
      return;
    }
    event.preventDefault();
    setErrorMessage("That month is not available for the selected year.");
    monthRef.current?.focus();
  };

  const handleMonthBlur = () => {
    if (isUnavailableSelection) {
      setErrorMessage("That month is not available for the selected year.");
    }
  };

  const handleYearBlur = () => {
    if (isUnavailableSelection) {
      setErrorMessage("That month is not available for the selected year.");
    }
  };

  const handleMonthChange = (value: number) => {
    setMonth(value);
    setErrorMessage(null);
  };

  const handleYearChange = (value: number) => {
    setYear(value);
    setErrorMessage(null);
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
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100"
              >
                Exit historical view
              </a>
            ) : null}
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Historical context</p>
            <p className="mt-3 type-data text-slate-300">
              You are replaying the macro regime from{" "}
              <span className="font-semibold text-slate-100">{selectedLabel}</span>. Treat the
              constraints as if those market conditions were active today.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected snapshot</p>
            <p className="mt-3 text-lg font-semibold text-slate-100">{selectedLabel}</p>
            <p className="mt-2 text-xs text-slate-500">
              Highlights the month loaded into the report.
            </p>
          </div>
        </div>

        <form method="GET" onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-[1fr,1fr,auto]">
          <label
            htmlFor="time-machine-month"
            className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400"
          >
            Month
            <select
              ref={monthRef}
              id="time-machine-month"
              name="month"
              value={month}
              onChange={(event) => handleMonthChange(Number(event.target.value))}
              onBlur={handleMonthBlur}
              aria-invalid={isInvalid}
              aria-describedby={isInvalid ? errorId : undefined}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100 transition-colors hover:border-slate-700"
            >
              {isUnavailableSelection ? (
                <option value={month} disabled>
                  {requestedMonthLabel} (not available)
                </option>
              ) : null}
              {monthOptions
                .filter((option) => !(isUnavailableSelection && option.value === month))
                .map((option) => {
                  const isUnavailable =
                    availableMonths.length > 0 && !availableMonths.includes(option.value);
                  return (
                    <option key={option.value} value={option.value} disabled={isUnavailable}>
                      {option.label}
                      {isUnavailable ? " (not available)" : ""}
                    </option>
                  );
                })}
            </select>
          </label>
          <label
            htmlFor="time-machine-year"
            className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400"
          >
            Year
            <select
              ref={yearRef}
              id="time-machine-year"
              name="year"
              value={year}
              onChange={(event) => handleYearChange(Number(event.target.value))}
              onBlur={handleYearBlur}
              aria-invalid={isInvalid}
              aria-describedby={isInvalid ? errorId : undefined}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100 transition-colors hover:border-slate-700"
            >
              {years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100"
          >
            Load snapshot
          </button>
        </form>
        {errorMessage ? (
          <p
            id={errorId}
            className="mt-4 text-xs text-amber-200"
            role="status"
            aria-live="polite"
          >
            {errorMessage}
          </p>
        ) : null}
        {invalidSelection ? (
          <p className="mt-4 text-xs text-amber-200" role="status" aria-live="polite">
            That month is not available in the cache. Showing the latest data instead.
          </p>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          Latest available record: <span className="mono text-slate-300">{latestRecordLabel}</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Cache coverage: <span className="mono text-slate-300">{coverageLabel}</span>
        </p>
      </div>
    </section>
  );
};
