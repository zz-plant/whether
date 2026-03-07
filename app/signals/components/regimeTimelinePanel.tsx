import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { REGIME_LABELS, REGIME_STYLE_TOKENS } from "../../../lib/regimePresentation";
import { formatMonthLabel, formatMonthShortLabel } from "../../../lib/timeMachine/monthFormatting";


type RegimeRun = {
  regime: RegimeKey;
  count: number;
  start: TimeMachineRegimeEntry;
  end: TimeMachineRegimeEntry;
};

type RegimeTimelinePanelProps = {
  series: TimeMachineRegimeEntry[];
  selectedYear: number;
  selectedMonth: number;
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
};

const collectPreservedParams = (searchParams?: RegimeTimelinePanelProps["searchParams"]) => {
  const preservedParams = new URLSearchParams();

  if (!searchParams) {
    return preservedParams;
  }

  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (key === "month" || key === "year" || key === "draftMonth" || key === "draftYear") {
      return;
    }

    preservedParams.set(key, value);
  });

  return preservedParams;
};

const buildRegimeRuns = (series: TimeMachineRegimeEntry[]) => {
  return series.reduce<RegimeRun[]>((runs, entry) => {
    const lastRun = runs.at(-1);

    if (!lastRun || lastRun.regime !== entry.regime) {
      runs.push({
        regime: entry.regime,
        count: 1,
        start: entry,
        end: entry,
      });
      return runs;
    }

    lastRun.count += 1;
    lastRun.end = entry;
    return runs;
  }, []);
};

const formatRunSpan = (run: RegimeRun) => {
  if (run.start.year === run.end.year && run.start.month === run.end.month) {
    return formatMonthLabel(run.start.year, run.start.month);
  }

  if (run.start.year === run.end.year) {
    return `${formatMonthShortLabel(run.start.year, run.start.month)}–${formatMonthShortLabel(run.end.year, run.end.month)} ${run.start.year}`;
  }

  return `${formatMonthLabel(run.start.year, run.start.month)}–${formatMonthLabel(run.end.year, run.end.month)}`;
};

const getSelectedMonthIndex = (
  series: TimeMachineRegimeEntry[],
  selectedYear: number,
  selectedMonth: number,
) => {
  return series.findIndex((entry) => entry.year === selectedYear && entry.month === selectedMonth);
};

const getSelectedMarkerOffset = (selectedIndex: number, totalMonths: number) => {
  return `calc(${((selectedIndex + 0.5) / Math.max(totalMonths, 1)) * 100}% - 0.5px)`;
};

const getTimelineSummary = (runs: RegimeRun[]) => {
  const changeCount = Math.max(runs.length - 1, 0);
  const longestRun = runs.reduce<RegimeRun | null>((longest, run) => {
    if (!longest || run.count > longest.count) {
      return run;
    }

    return longest;
  }, null);

  return { changeCount, longestRun };
};

export const RegimeTimelinePanel = ({
  series,
  selectedYear,
  selectedMonth,
  searchParams,
}: RegimeTimelinePanelProps) => {
  const currentLabel = formatMonthLabel(selectedYear, selectedMonth);
  const preservedParams = collectPreservedParams(searchParams);
  const runs = buildRegimeRuns(series);
  const selectedIndex = getSelectedMonthIndex(series, selectedYear, selectedMonth);
  const { changeCount, longestRun } = getTimelineSummary(runs);

  const buildHref = (month: number, year: number) => {
    const nextParams = new URLSearchParams(preservedParams.toString());
    nextParams.set("month", String(month));
    nextParams.set("year", String(year));

    const queryString = nextParams.toString();
    return queryString ? `/signals?${queryString}` : "/signals";
  };

  return (
    <section id="regime-timeline" aria-labelledby="regime-timeline-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Regime timeline</p>
            <h3 id="regime-timeline-title" className="type-section text-slate-100">
              24-month regime sequence
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Timeline emphasizes continuity while keeping month-level navigation.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/50 p-3 sm:p-4">
            <div className="flex min-h-20 items-stretch">
              {runs.map((run) => {
                const spanLabel = formatRunSpan(run);
                const runLabel = REGIME_LABELS[run.regime];

                return (
                  <div
                    key={`${run.start.year}-${run.start.month}-${run.regime}`}
                    className="group relative flex min-w-[3.25rem] flex-1 items-end border-r border-slate-950/70 last:border-r-0"
                    style={{ flexGrow: run.count }}
                  >
                    <div
                      className={`absolute inset-0 opacity-85 transition-opacity group-hover:opacity-100 ${REGIME_STYLE_TOKENS[run.regime].marker}`}
                      aria-hidden="true"
                    />
                    <div className="relative z-10 w-full bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent px-2 pb-2 pt-8 sm:px-3">
                      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-100 sm:text-xs">
                        {runLabel}
                      </p>
                      <p className="hidden text-[10px] text-slate-200/90 sm:block">{spanLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedIndex >= 0 ? (
              <>
                <div
                  className="pointer-events-none absolute bottom-2 top-2 z-20 w-px bg-sky-300/95"
                  style={{ left: getSelectedMarkerOffset(selectedIndex, series.length) }}
                  aria-hidden="true"
                />
                <p className="pointer-events-none absolute right-2 top-2 z-20 rounded-md bg-slate-950/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200 sm:text-[11px]">
                  Current: {currentLabel}
                </p>
              </>
            ) : null}

            <div className="absolute inset-0 z-30 flex">
              {series.map((entry) => {
                const isCurrent = entry.year === selectedYear && entry.month === selectedMonth;
                const monthLabel = formatMonthLabel(entry.year, entry.month);
                const href = buildHref(entry.month, entry.year);

                return (
                  <a
                    key={`${entry.year}-${entry.month}`}
                    href={href}
                    aria-current={isCurrent ? "date" : undefined}
                    aria-label={`${monthLabel}: ${REGIME_LABELS[entry.regime]}`}
                    className="h-full min-h-[44px] flex-1 focus-visible:z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/90 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                    style={{ touchAction: "manipulation" }}
                  >
                    <span className="sr-only">
                      {monthLabel} — {REGIME_LABELS[entry.regime]}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400" aria-live="polite">
            Last {series.length} months: {changeCount} regime changes, longest run:{" "}
            {longestRun ? `${REGIME_LABELS[longestRun.regime]} (${longestRun.count} months)` : "n/a"}.
          </p>
        </div>
      </div>
    </section>
  );
};
