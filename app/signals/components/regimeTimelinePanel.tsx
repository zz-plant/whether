import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { REGIME_LABELS, REGIME_STYLE_TOKENS } from "../../../lib/regimePresentation";
import { formatMonthLabel, formatMonthShortLabel } from "../../../lib/timeMachine/monthFormatting";
import { SectionPanelHeader } from "../../components/sectionPanelHeader";


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
        <SectionPanelHeader
          label="Past calls"
          title="The call, month by month, over 24 months"
          titleId="regime-timeline-title"
          description="Pick a month to load it."
          aside={
            /* A labelled value, not a control: it was set in `weather-pill`,
               which is the class every pill-shaped link on the page presses. */
            <dl className="flex items-baseline gap-1.5 text-fluid-xs">
              <dt className="text-slate-400">Current:</dt>
              <dd className="font-semibold tabular-nums text-slate-100">{currentLabel}</dd>
            </dl>
          }
        />

        <div className="mt-6">
          <div className="relative overflow-hidden rounded-lg border border-slate-800/70 bg-slate-950/50 p-3 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.04)] sm:p-4">
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
                      <p className="truncate type-eyebrow text-slate-100 sm:text-xs">
                        {runLabel}
                      </p>
                      <p className="hidden text-fluid-micro text-slate-200/90 sm:block">{spanLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedIndex >= 0 ? (
              <div
                className="pointer-events-none absolute bottom-2 top-2 z-20 w-px bg-sky-300/95"
                style={{ left: getSelectedMarkerOffset(selectedIndex, series.length) }}
                aria-hidden="true"
              />
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-live="polite">
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">Call changes</p>
              <p className="mt-2 text-sm text-slate-200">
                {changeCount} changes across the last {series.length} months.
              </p>
            </div>
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">Longest held</p>
              <p className="mt-2 text-sm text-slate-200">
                {longestRun ? `${REGIME_LABELS[longestRun.regime]} (${longestRun.count} months)` : "n/a"}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
