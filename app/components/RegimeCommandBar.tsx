import type { RegimeKey } from "../../lib/regimeEngine";

export type RegimeCommandBarProps = {
  regime: RegimeKey;
  call: string;
  doNow: string[];
  flipConditions: string[];
  updatedAt: string;
};

const regimeStyleByKey: Record<RegimeKey, { label: string; toneClass: string }> = {
  SCARCITY: {
    label: "Scarcity",
    toneClass: "border-rose-400/60 bg-rose-500/10 text-rose-100",
  },
  DEFENSIVE: {
    label: "Defensive",
    toneClass: "border-amber-300/70 bg-amber-300/10 text-amber-100",
  },
  VOLATILE: {
    label: "Volatile",
    toneClass: "border-sky-300/70 bg-sky-300/10 text-sky-100",
  },
  EXPANSION: {
    label: "Expansion",
    toneClass: "border-emerald-300/70 bg-emerald-300/10 text-emerald-100",
  },
};

const renderItems = ({
  items,
  bulletClassName = "bg-sky-300/80",
  limit = items.length,
}: {
  items: string[];
  bulletClassName?: string;
  limit?: number;
}) => {
  if (!items.length) {
    return <p className="text-sm text-slate-400">No updates available.</p>;
  }

  const visibleItems = items.slice(0, limit);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <ul className="space-y-1.5 text-sm text-slate-100">
      {visibleItems.map((item) => (
        <li key={item} className="flex items-start gap-2 leading-relaxed">
          <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${bulletClassName}`} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          +{hiddenCount} more
        </li>
      ) : null}
    </ul>
  );
};

const labelClassName = "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400";
const panelClassName = "weather-forecast-card min-h-[10rem] flex-col justify-between border-slate-700/75 bg-slate-950/78";

export const RegimeCommandBar = ({
  regime,
  call,
  doNow,
  flipConditions,
  updatedAt,
}: RegimeCommandBarProps) => {
  const regimeStyle = regimeStyleByKey[regime];
  const primaryDoNow = doNow[0] ?? "Keep this week’s plan staged and reversible.";
  const primaryFlipCondition = flipConditions[0] ?? "No live flip trigger available.";

  return (
    <section
      className="weather-panel-static relative overflow-hidden border border-slate-700/80 bg-slate-950/95 px-4 py-4 sm:sticky sm:top-0 sm:z-40 sm:px-5"
      aria-label="Weekly command bar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_45%)]" aria-hidden="true" />
      <div className="relative">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/85">
              Current Conditions
            </p>
            <h2 className="max-w-3xl text-lg font-semibold leading-tight text-slate-50 sm:text-xl">
              {call}
            </h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Scan this strip first, then drop into the weekly brief only when you need the reasoning or share actions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-[36px] items-center rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] ${regimeStyle.toneClass}`}>
              {regimeStyle.label} outlook
            </span>
            <span className="inline-flex min-h-[36px] items-center rounded-full border border-slate-700/70 bg-slate-950/72 px-3 py-1.5 text-xs font-medium text-slate-200">
              Updated {updatedAt}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.2fr_1.3fr_1.2fr]">
        <article className={panelClassName}>
            <div>
              <p className={labelClassName}>Outlook</p>
              <span className={`mt-3 inline-flex min-h-[34px] items-center rounded-full border px-3 text-xs font-semibold tracking-[0.08em] ${regimeStyle.toneClass}`}>
                {regimeStyle.label}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Use this as the headline condition before you read the rest of the brief.
            </p>
        </article>

        <article className={panelClassName}>
            <div>
              <p className={labelClassName}>Forecast</p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-50">{call}</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              The one-line operating read for this cycle.
            </p>
        </article>

        <article className={panelClassName}>
            <div>
              <p className={labelClassName}>Do Now</p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-emerald-50">{primaryDoNow}</p>
            </div>
            <div className="mt-3">
              {renderItems({ items: doNow, bulletClassName: "bg-emerald-300/80", limit: 2 })}
            </div>
        </article>

        <article className={panelClassName}>
            <div>
              <p className={labelClassName}>Flip Watch</p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-sky-50">{primaryFlipCondition}</p>
            </div>
            <div className="mt-3">
              {renderItems({ items: flipConditions, limit: 2 })}
            </div>
        </article>
        </div>
      </div>
    </section>
  );
};
