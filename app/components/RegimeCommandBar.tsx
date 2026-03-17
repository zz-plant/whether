import type { RegimeKey } from "../../lib/regimeEngine";
import {
  ForecastChip,
} from "./forecastStrip";

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
  const additionalDoNowCount = Math.max(0, doNow.length - 1);
  const additionalFlipCount = Math.max(0, flipConditions.length - 1);
  const cards = [
    {
      id: "outlook",
      label: "Outlook",
      headline: regimeStyle.label,
      detail: "Use this as the headline condition before you read the rest of the brief.",
    },
    {
      id: "do-now",
      label: "Do now",
      headline: primaryDoNow,
      detail: additionalDoNowCount > 0 ? `+${additionalDoNowCount} more supporting move${additionalDoNowCount === 1 ? "" : "s"}` : "Primary move for this cycle.",
      toneClass: "border-emerald-400/25 bg-emerald-500/10 text-emerald-50",
      labelClass: "text-emerald-200",
    },
    {
      id: "flip-watch",
      label: "Flip watch",
      headline: primaryFlipCondition,
      detail: additionalFlipCount > 0 ? `+${additionalFlipCount} more supporting cue${additionalFlipCount === 1 ? "" : "s"}` : "Primary trigger before you lock new fixed-cost commitments.",
      toneClass: "border-sky-400/25 bg-sky-500/10 text-sky-50",
      labelClass: "text-sky-200",
    },
  ];

  return (
    <section
      className="weather-command-bar weather-panel-static relative overflow-hidden border border-slate-700/80 bg-slate-950/95 px-3.5 py-3 sm:sticky sm:top-2 sm:z-40 sm:px-4"
      aria-label="Weekly command bar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_45%)]" aria-hidden="true" />
      <div className="relative grid gap-2.5 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.9fr))] xl:items-stretch">
        <div className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-950/72 px-3.5 py-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ForecastChip
                label={`${regimeStyle.label} outlook`}
                className={regimeStyle.toneClass}
              />
              <ForecastChip
                label={`Updated ${updatedAt}`}
                className="min-h-[30px] px-2.5 py-1 text-[10px] font-medium tracking-normal normal-case"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/85">Current conditions</p>
              <h2 className="max-w-3xl text-sm font-semibold leading-6 tracking-[0.01em] text-slate-50 sm:text-base">{call}</h2>
              <p className="max-w-3xl text-[11px] leading-5 text-slate-300">
                Planning baseline for this cycle. Open the deeper brief only when the call needs rationale or execution detail.
              </p>
            </div>
          </div>
        </div>
        {cards.map((card) => (
          <article
            key={card.id}
            className={`weather-command-bar__card rounded-2xl border border-slate-800/70 bg-slate-950/72 px-3 py-3 ${card.toneClass ?? ""}`}
            aria-label={card.label}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${card.labelClass ?? "text-slate-400"}`}>
              {card.label}
            </p>
            <p className="mt-1 text-sm font-semibold leading-5 text-inherit">{card.headline}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">{card.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
