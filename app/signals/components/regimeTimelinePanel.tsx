import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { REGIME_LABELS, REGIME_STYLE_TOKENS } from "../../../lib/regimePresentation";
import { formatMonthLabel, formatMonthShortLabel } from "../../../lib/timeMachine/monthFormatting";
import { SectionPanelHeader } from "../../components/sectionPanelHeader";
import { summarizeConditionRuns } from "../../../lib/report/evidenceInstrumentSummaries";


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

const formatRunSpan = (run: RegimeRun) => {
  if (run.start.year === run.end.year && run.start.month === run.end.month) {
    return formatMonthLabel(run.start.year, run.start.month);
  }

  if (run.start.year === run.end.year) {
    return `${formatMonthShortLabel(run.start.year, run.start.month)}–${formatMonthShortLabel(run.end.year, run.end.month)} ${run.start.year}`;
  }

  return `${formatMonthLabel(run.start.year, run.start.month)}–${formatMonthLabel(run.end.year, run.end.month)}`;
};

export const RegimeTimelinePanel = ({
  series,
  selectedYear,
  selectedMonth,
  searchParams,
}: RegimeTimelinePanelProps) => {
  const currentLabel = formatMonthLabel(selectedYear, selectedMonth);
  const preservedParams = collectPreservedParams(searchParams);
  /* The runs through the function the disclosure summary over this panel reads.
     That summary already prints "3 changes across the last 24 months", so this
     panel no longer repeats it in a card of its own (2026-10-14). */
  const conditionRuns = summarizeConditionRuns(series);
  const { runs, longestRun } = conditionRuns;

  const buildHref = (month: number, year: number) => {
    const nextParams = new URLSearchParams(preservedParams.toString());
    nextParams.set("month", String(month));
    nextParams.set("year", String(year));

    const queryString = nextParams.toString();
    return queryString ? `/signals?${queryString}` : "/signals";
  };

  return (
    <section id="regime-timeline" aria-labelledby="regime-timeline-title" className="mt-6 border-t border-slate-800/60 pt-6">
      <div>
        <SectionPanelHeader
          label="Past conditions"
          title="Conditions, month by month, over 24 months"
          titleId="regime-timeline-title"
          description="Pick a month to load it."
          aside={
            /* A labelled value, not a control: it was set in `weather-pill`,
               which is the class every pill-shaped link on the page presses. */
            /* "Showing", not "Current": the strip ends at the last month-end,
               so on an October reading "Current: Aug 2026" named a month the
               brief above had already moved past. */
            <dl className="flex items-baseline gap-1.5 text-fluid-xs">
              <dt className="text-slate-400">Showing:</dt>
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
                    className="relative flex min-w-[3.25rem] flex-1 items-end border-r border-slate-950/70 last:border-r-0"
                    style={{ flexGrow: run.count }}
                  >
                    <div
                      className={`absolute inset-0 opacity-85 ${REGIME_STYLE_TOKENS[run.regime].marker}`}
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
                    className="relative h-full min-h-[44px] flex-1 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/90 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                    style={{ touchAction: "manipulation" }}
                  >
                    {/* The chosen month's rule is the link's own state, so it is drawn
                        inside the link, in the action colour (ui-ux-standards §XXVII).
                        The runs under these links never brighten on hover: the links
                        sit above them and take the pointer. */}
                    {isCurrent ? (
                      <span
                        className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-sky-300/95"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="sr-only">
                      {monthLabel} — {REGIME_LABELS[entry.regime]}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
          <div className="mt-4" aria-live="polite">
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
