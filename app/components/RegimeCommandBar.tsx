import type { RegimeKey } from "../../lib/regimeEngine";
import {
  ForecastChip,
  ForecastConditionsHeader,
  ForecastStrip,
  type ForecastStripCardData,
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
  const cards: ForecastStripCardData[] = [
    {
      id: "outlook",
      label: "Outlook",
      headline: regimeStyle.label,
      supportingText: "Use this as the headline condition before you read the rest of the brief.",
    },
    {
      id: "forecast",
      label: "Forecast",
      headline: call,
      supportingText: "The one-line operating read for this cycle.",
    },
    {
      id: "do-now",
      label: "Do now",
      headline: primaryDoNow,
      tone: "positive",
      items: doNow,
      itemLimit: 2,
      itemBulletClassName: "bg-emerald-300/80",
    },
    {
      id: "flip-watch",
      label: "Flip watch",
      headline: primaryFlipCondition,
      tone: "info",
      items: flipConditions,
      itemLimit: 2,
    },
  ];

  return (
    <section
      className="weather-panel-static relative overflow-hidden border border-slate-700/80 bg-slate-950/95 px-4 py-4 sm:sticky sm:top-0 sm:z-40 sm:px-5"
      aria-label="Weekly command bar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_45%)]" aria-hidden="true" />
      <div className="relative">
        <ForecastConditionsHeader
          eyebrow="Current conditions"
          headline={call}
          description="Scan this strip first, then drop into the weekly brief only when you need the reasoning or share actions."
          chips={[
            {
              label: `${regimeStyle.label} outlook`,
              className: regimeStyle.toneClass,
            },
          ]}
          trailing={(
            <ForecastChip
              label={`Updated ${updatedAt}`}
              className="min-h-[36px] px-3 py-1.5 text-xs font-medium tracking-normal normal-case"
            />
          )}
          className="md:items-end"
        />
        <ForecastStrip cards={cards} ariaLabel="Weekly command bar current conditions strip" className="mt-4" />
      </div>
    </section>
  );
};
