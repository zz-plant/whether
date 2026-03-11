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

const renderItems = (items: string[]) => {
  if (!items.length) {
    return <p className="text-sm text-slate-400">No updates available.</p>;
  }

  return (
    <ul className="space-y-1.5 text-sm text-slate-100">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-300/80" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

const labelClassName = "text-[11px] font-semibold tracking-[0.18em] text-slate-400";

export const RegimeCommandBar = ({
  regime,
  call,
  doNow,
  flipConditions,
  updatedAt,
}: RegimeCommandBarProps) => {
  const regimeStyle = regimeStyleByKey[regime];

  return (
    <section
      className="weather-panel-static relative overflow-hidden border border-slate-700/80 bg-slate-950/95 px-4 py-4 sm:sticky sm:top-0 sm:z-40 sm:px-5"
      aria-label="Weekly command bar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_45%)]" aria-hidden="true" />
      <div className="relative grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-[0.85fr,1.15fr,1.4fr,1.4fr,0.85fr]">
        <article className="weather-surface rounded-xl border border-slate-700/70 bg-slate-950/70 p-3">
          <p className={labelClassName}>REGIME</p>
          <span className={`mt-2 inline-flex min-h-[30px] items-center rounded-full border px-2.5 text-xs font-semibold tracking-[0.08em] ${regimeStyle.toneClass}`}>
            {regimeStyle.label}
          </span>
        </article>

        <article className="weather-surface rounded-xl border border-slate-700/70 bg-slate-950/70 p-3">
          <p className={labelClassName}>CALL</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-50">{call}</p>
        </article>

        <article className="weather-surface rounded-xl border border-slate-700/70 bg-slate-950/70 p-3">
          <p className={labelClassName}>DO NOW</p>
          <div className="mt-2">{renderItems(doNow)}</div>
        </article>

        <article className="weather-surface rounded-xl border border-slate-700/70 bg-slate-950/70 p-3">
          <p className={labelClassName}>FLIP CONDITIONS</p>
          <div className="mt-2">{renderItems(flipConditions)}</div>
        </article>

        <article className="weather-surface rounded-xl border border-slate-700/70 bg-slate-950/70 p-3">
          <p className={labelClassName}>Updated</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{updatedAt}</p>
        </article>
      </div>
    </section>
  );
};
