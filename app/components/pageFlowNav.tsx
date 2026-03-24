import Link from "next/link";
import type { ReactNode } from "react";
import type { ScrollPlanItem } from "../../lib/navigation/scrollPlans";

export function PageFlowNav({
  eyebrow,
  title,
  description,
  items,
  actions,
  className,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: ScrollPlanItem[];
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  if (!items.length) {
    return null;
  }

  const gridClassName =
    items.length >= 5 ? "xl:grid-cols-5" : items.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3";

  if (compact) {
    return (
      <section className={`weather-hub-section space-y-2.5 ${className ?? ""}`} aria-label={title}>
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="weather-hub-section-eyebrow">{eyebrow}</p>
              <span className="weather-hub-chip !min-h-[1.85rem] px-2 py-0.5 text-[10px]">
                {items.length} checkpoints
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">{title}</h2>
            <p className="max-w-3xl text-sm text-slate-300">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
        </div>

        <ol className={`grid gap-2 md:grid-cols-2 ${gridClassName}`}>
          {items.map((item, index) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="weather-hub-link-card flex min-h-[84px] flex-col gap-1 px-3 py-2.5 text-left text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    <span className="inline-flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border border-slate-600/80 text-[10px] text-slate-300">
                      {index + 1}
                    </span>
                    {item.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Checkpoint</span>
                </div>
                <p className="text-xs leading-5 text-slate-300">{item.summary}</p>
                <span className="mt-auto text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">Jump to section</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className={`weather-hub-section ${className ?? ""}`} aria-label={title}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="weather-hub-section-eyebrow">{eyebrow}</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">{title}</h2>
          <p className="max-w-3xl text-sm text-slate-300">{description}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[23rem]">
          <div className="weather-hub-card px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">First checkpoint</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{items[0]?.label}</p>
            <p className="mt-1 text-xs text-slate-300">{items[0]?.summary}</p>
          </div>
          <div className="weather-hub-card px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total checkpoints</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {items.length}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Follow sections top to bottom for the intended decision flow.
            </p>
          </div>
        </div>
      </div>

      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}

      <ol className={`grid gap-3 md:grid-cols-2 ${gridClassName}`}>
        {items.map((item, index) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="weather-hub-link-card flex min-h-[124px] flex-col gap-2 p-4 text-left text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-600/80 text-[10px] text-slate-300">
                    {index + 1}
                  </span>
                  {item.label}
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Checkpoint</span>
              </div>
              <p className="text-sm font-semibold tracking-[0.06em] text-slate-100">{item.summary}</p>
              <p className="text-xs text-slate-300">Read this section in sequence.</p>
              <span className="mt-auto text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">Jump to section</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
