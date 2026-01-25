import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import type { RegimeKey } from "../../../lib/regimeEngine";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const formatMonthLabel = (year: number, month: number) => {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
};

const regimeLabels: Record<RegimeKey, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Volatile",
  EXPANSION: "Expansion",
};

const regimeMarkerStyles: Record<RegimeKey, string> = {
  SCARCITY: "bg-rose-400",
  DEFENSIVE: "bg-amber-400",
  VOLATILE: "bg-indigo-400",
  EXPANSION: "bg-emerald-400",
};

type RegimeTimelinePanelProps = {
  series: TimeMachineRegimeEntry[];
  selectedYear: number;
  selectedMonth: number;
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
};

export const RegimeTimelinePanel = ({
  series,
  selectedYear,
  selectedMonth,
  searchParams,
}: RegimeTimelinePanelProps) => {
  const currentLabel = formatMonthLabel(selectedYear, selectedMonth);
  const preservedParams = new URLSearchParams();

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (!value) {
        return;
      }
      if (key === "month" || key === "year" || key === "draftMonth" || key === "draftYear") {
        return;
      }
      preservedParams.set(key, value);
    });
  }

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
              Track monthly regime changes and jump into the Time Machine for any month.
            </p>
          </div>
          <div className="rounded-full border border-slate-700/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            Current: {currentLabel}
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {series.map((entry, index) => {
            const isCurrent = entry.year === selectedYear && entry.month === selectedMonth;
            const previous = series[index - 1];
            const isChange = Boolean(previous && previous.regime !== entry.regime);
            const monthLabel = formatMonthLabel(entry.year, entry.month);
            const href = buildHref(entry.month, entry.year);
            return (
              <a
                key={`${entry.year}-${entry.month}`}
                href={href}
                aria-current={isCurrent ? "date" : undefined}
                className={`group flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition ${
                  isCurrent
                    ? "border-sky-400/80 bg-sky-500/10"
                    : "border-slate-800/70 bg-slate-950/40 hover:border-slate-600/80 hover:bg-slate-900/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${regimeMarkerStyles[entry.regime]}`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{monthLabel}</p>
                    <p className="text-xs text-slate-400">{regimeLabels[entry.regime]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                  {isChange ? (
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-200">
                      Change
                    </span>
                  ) : null}
                  {isCurrent ? (
                    <span className="rounded-full border border-sky-400/60 bg-sky-500/10 px-2 py-1 text-sky-200">
                      Current
                    </span>
                  ) : null}
                </div>
              </a>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Change markers appear when the regime label differs from the prior month.
        </p>
      </div>
    </section>
  );
};
