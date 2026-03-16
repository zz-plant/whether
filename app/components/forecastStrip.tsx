import type { ReactNode } from "react";

export type ForecastChipTone = "neutral" | "positive" | "warning" | "info";

const forecastChipToneClass: Record<ForecastChipTone, string> = {
  neutral: "border-slate-700/70 bg-slate-950/72 text-slate-200",
  positive: "border-emerald-300/55 bg-emerald-500/12 text-emerald-100",
  warning: "border-amber-300/55 bg-amber-500/12 text-amber-100",
  info: "border-sky-300/55 bg-sky-500/12 text-sky-100",
};

export type ForecastChipData = {
  label: string;
  tone?: ForecastChipTone;
  className?: string;
};

export const ForecastChip = ({
  label,
  tone = "neutral",
  className,
}: ForecastChipData) => (
  <span
    className={`inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${forecastChipToneClass[tone]} ${className ?? ""}`}
  >
    {label}
  </span>
);

export type ForecastConditionsHeaderProps = {
  eyebrow: string;
  headline: string;
  description: string;
  chips?: ForecastChipData[];
  trailing?: ReactNode;
  className?: string;
};

export const ForecastConditionsHeader = ({
  eyebrow,
  headline,
  description,
  chips = [],
  trailing,
  className,
}: ForecastConditionsHeaderProps) => (
  <div className={`flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between ${className ?? ""}`}>
    <div className="space-y-2">
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <ForecastChip
              key={`${chip.label}-${chip.tone ?? "neutral"}`}
              label={chip.label}
              tone={chip.tone}
              className={chip.className}
            />
          ))}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/85">{eyebrow}</p>
        <h2 className="text-lg font-semibold tracking-[0.01em] text-slate-50 sm:text-xl">{headline}</h2>
        <p className="text-xs leading-5 text-slate-300">{description}</p>
      </div>
    </div>
    {trailing}
  </div>
);

export type ForecastStatData = {
  label: string;
  value: string;
};

export const ForecastStatsGrid = ({
  stats,
  className,
}: {
  stats: ForecastStatData[];
  className?: string;
}) => (
  <div className={`grid gap-2 sm:grid-cols-3 ${className ?? ""}`}>
    {stats.map((stat) => (
      <div key={stat.label} className="weather-stat-card">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{stat.label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{stat.value}</p>
      </div>
    ))}
  </div>
);

export type ForecastStripCardTone = "neutral" | "positive" | "warning" | "info";

const forecastCardToneClass: Record<ForecastStripCardTone, string> = {
  neutral: "",
  positive: "border-emerald-400/25 bg-emerald-500/8",
  warning: "border-rose-400/25 bg-rose-500/8",
  info: "border-sky-400/25 bg-sky-500/8",
};

const forecastCardLabelToneClass: Record<ForecastStripCardTone, string> = {
  neutral: "text-slate-400",
  positive: "text-emerald-200",
  warning: "text-rose-200",
  info: "text-sky-200",
};

const forecastCardHeadlineToneClass: Record<ForecastStripCardTone, string> = {
  neutral: "text-slate-50",
  positive: "text-emerald-50",
  warning: "text-rose-50",
  info: "text-sky-50",
};

const forecastCardBodyToneClass: Record<ForecastStripCardTone, string> = {
  neutral: "text-slate-300",
  positive: "text-emerald-100/80",
  warning: "text-rose-100/80",
  info: "text-sky-100/80",
};

export type ForecastStripCardData = {
  id: string;
  label: string;
  headline: string;
  supportingText?: string;
  footerText?: string;
  tone?: ForecastStripCardTone;
  chips?: ForecastChipData[];
  items?: string[];
  itemLimit?: number;
  itemBulletClassName?: string;
};

const ForecastBulletList = ({
  items,
  itemLimit = items.length,
  itemBulletClassName = "bg-sky-300/80",
}: {
  items: string[];
  itemLimit?: number;
  itemBulletClassName?: string;
}) => {
  if (items.length === 0) {
    return null;
  }

  const visibleItems = items.slice(0, itemLimit);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <ul className="space-y-1.5 text-sm text-slate-100">
      {visibleItems.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 leading-relaxed">
          <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${itemBulletClassName}`} aria-hidden="true" />
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

const ForecastStripCard = ({
  label,
  headline,
  supportingText,
  footerText,
  tone = "neutral",
  chips = [],
  items = [],
  itemLimit,
  itemBulletClassName,
}: ForecastStripCardData) => (
  <article className={`weather-forecast-card ${forecastCardToneClass[tone]}`}>
    <div className="space-y-2">
      <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${forecastCardLabelToneClass[tone]}`}>{label}</p>
      <p className={`text-sm font-semibold leading-relaxed ${forecastCardHeadlineToneClass[tone]}`}>{headline}</p>
    </div>

    {supportingText ? (
      <p className={`text-xs leading-5 ${forecastCardBodyToneClass[tone]}`}>{supportingText}</p>
    ) : null}

    {items.length > 0 ? (
      <ForecastBulletList items={items} itemLimit={itemLimit} itemBulletClassName={itemBulletClassName} />
    ) : null}

    {chips.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <ForecastChip
            key={`${chip.label}-${chip.tone ?? "neutral"}`}
            label={chip.label}
            tone={chip.tone}
            className={chip.className}
          />
        ))}
      </div>
    ) : null}

    {footerText ? (
      <p className={`text-xs leading-5 ${forecastCardBodyToneClass[tone]}`}>{footerText}</p>
    ) : null}
  </article>
);

export const ForecastStrip = ({
  cards,
  ariaLabel,
  className,
}: {
  cards: ForecastStripCardData[];
  ariaLabel: string;
  className?: string;
}) => (
  <div className={`weather-forecast-strip ${className ?? ""}`} aria-label={ariaLabel}>
    {cards.map((card) => (
      <ForecastStripCard key={card.id} {...card} />
    ))}
  </div>
);
