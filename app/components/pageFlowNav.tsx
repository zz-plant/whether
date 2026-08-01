import Link from "next/link";
import type { ReactNode } from "react";
import type { ScrollPlanItem } from "../../lib/navigation/scrollPlans";

const checkpointStatus = (index: number) => (index === 0 ? "active" : index === 1 ? "next" : "queued");

const statusClasses = {
  active: {
    chip: "border-sky-400/40 bg-sky-500/12 text-sky-100",
    dot: "bg-sky-300 border-sky-200",
    rail: "bg-sky-400/60",
  },
  next: {
    chip: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    dot: "bg-emerald-300 border-emerald-200",
    rail: "bg-emerald-400/40",
  },
  queued: {
    chip: "border-slate-700/80 bg-slate-950/70 text-slate-300",
    dot: "bg-slate-700 border-slate-500",
    rail: "bg-slate-700/80",
  },
} as const;

export function PageFlowNav({
  eyebrow,
  title,
  description,
  items,
  actions,
  className,
  compact = false,
  maxItems,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: ScrollPlanItem[];
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
  maxItems?: number;
}) {
  if (!items.length) {
    return null;
  }
  const visibleItems = items.slice(0, Math.max(1, maxItems ?? items.length));
  const hiddenItemCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <section className={`weather-hub-section space-y-3 ${className ?? ""}`} aria-label={title}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="weather-hub-section-eyebrow">{eyebrow}</p>
            <span className="weather-hub-chip !min-h-[1.85rem] px-2 py-0.5 text-fluid-micro">
              {items.length} sections
            </span>
          </div>
          <h2 className={`${compact ? "text-fluid-lg" : "text-fluid-xl"} font-semibold text-slate-100`}>{title}</h2>
          <p className="max-w-3xl text-sm text-slate-300">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
      </div>

      <ol className={`grid gap-3 ${compact ? "" : "xl:grid-cols-3"}`}>
        {visibleItems.map((item, index) => {
          const status = checkpointStatus(index);
          const tone = statusClasses[status];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group relative block rounded-md border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100 transition-colors hover:border-sky-400/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                {index < items.length - 1 ? (
                  <span className={`pointer-events-none absolute left-[1.4rem] top-[3.4rem] h-[calc(100%-2.1rem)] w-px ${tone.rail}`} aria-hidden="true" />
                ) : null}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-sm border text-fluid-micro font-semibold ${tone.dot}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{item.label}</p>
                      <span className={`rounded-sm border px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.12em] ${tone.chip}`}>
                        {status === "active" ? "Current" : status === "next" ? "Next" : "Later"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-100">{item.summary}</p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
      {hiddenItemCount > 0 ? (
        <p className="px-1 text-xs text-slate-400">
          +{hiddenItemCount} more section{hiddenItemCount === 1 ? "" : "s"} below.
        </p>
      ) : null}
    </section>
  );
}
