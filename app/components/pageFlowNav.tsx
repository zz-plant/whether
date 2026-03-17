"use client";

import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ScrollPlanItem } from "../../lib/navigation/scrollPlans";

const getSectionId = (href: `#${string}`) => href.slice(1);

const resolveActiveHref = ({
  hash,
  items,
}: {
  hash: string;
  items: ScrollPlanItem[];
}) => {
  if (hash && items.some((item) => item.href === hash)) {
    return hash as `#${string}`;
  }

  return items[0]?.href;
};

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
  const [activeHref, setActiveHref] = useState<`#${string}` | undefined>(items[0]?.href);

  const sectionIdByHref = useMemo(
    () =>
      items.reduce<Record<string, string>>((accumulator, item) => {
        accumulator[item.href] = getSectionId(item.href);
        return accumulator;
      }, {}),
    [items],
  );

  useEffect(() => {
    if (!items.length) {
      return;
    }

    const syncFromHash = () => {
      startTransition(() => {
        setActiveHref(resolveActiveHref({ hash: window.location.hash, items }));
      });
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

        if (!visibleEntry) {
          return;
        }

        const matchingHref = Object.entries(sectionIdByHref).find(([, sectionId]) => sectionId === visibleEntry.target.id)?.[0];

        if (matchingHref) {
          startTransition(() => {
            setActiveHref(matchingHref as `#${string}`);
          });
        }
      },
      { rootMargin: "-18% 0px -60% 0px", threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    );

    Object.values(sectionIdByHref).forEach((sectionId) => {
      const sectionElement = document.getElementById(sectionId);
      if (sectionElement) {
        observer.observe(sectionElement);
      }
    });

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      observer.disconnect();
    };
  }, [items, sectionIdByHref]);

  if (!items.length) {
    return null;
  }

  const activeIndex = Math.max(items.findIndex((item) => item.href === activeHref), 0);
  const activeItem = items[activeIndex] ?? items[0];
  const nextItem = items[activeIndex + 1];
  const gridClassName =
    items.length >= 5 ? "xl:grid-cols-5" : items.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3";

  if (compact) {
    return (
      <section className={`weather-panel weather-section-stage space-y-2.5 px-4 py-3.5 ${className ?? ""}`} aria-label={title}>
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                {activeIndex + 1} of {items.length}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">{title}</h2>
            <p className="max-w-3xl text-sm text-slate-300">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
        </div>

        <ol className={`grid gap-2 md:grid-cols-2 ${gridClassName}`}>
          {items.map((item, index) => {
            const isActive = item.href === activeItem.href;
            const isReviewed = index < activeIndex;
            const tone = isActive
              ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
              : isReviewed
                ? "border-emerald-300/30 bg-emerald-400/10 text-slate-100"
                : "border-slate-800/80 text-slate-200 hover:border-sky-400/70 hover:text-slate-100";

            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={isActive ? "location" : undefined}
                  data-active={isActive ? "true" : "false"}
                  data-reviewed={isReviewed ? "true" : "false"}
                  className={`weather-surface weather-step-card flex min-h-[84px] touch-manipulation flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${tone}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      <span
                        className={`inline-flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border text-[10px] ${
                          isActive
                            ? "border-sky-300/80 bg-sky-500/35 text-sky-50"
                            : isReviewed
                              ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-100"
                              : "border-slate-600/80 text-slate-300"
                        }`}
                      >
                        {index + 1}
                      </span>
                      {item.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      {isActive ? "Current" : isReviewed ? "Reviewed" : "Jump"}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-slate-300">{item.summary}</p>
                </a>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  return (
    <section className={`weather-panel weather-section-stage space-y-4 px-5 py-5 ${className ?? ""}`} aria-label={title}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">{title}</h2>
          <p className="max-w-3xl text-sm text-slate-300">{description}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[23rem]">
          <div className="weather-stat-card">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Current section</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{activeItem.label}</p>
            <p className="mt-1 text-xs text-slate-300">{activeItem.summary}</p>
          </div>
          <div className="weather-stat-card">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Progress</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {activeIndex + 1} of {items.length}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {nextItem ? `Up next: ${nextItem.label}` : "Final section in this page flow."}
            </p>
          </div>
        </div>
      </div>

      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}

      <ol className={`grid gap-3 md:grid-cols-2 ${gridClassName}`}>
        {items.map((item, index) => {
          const isActive = item.href === activeItem.href;
          const isReviewed = index < activeIndex;
          const tone = isActive
            ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
            : isReviewed
              ? "border-emerald-300/30 bg-emerald-400/10 text-slate-100"
              : "border-slate-800/80 text-slate-200 hover:border-sky-400/70 hover:text-slate-100";

          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={isActive ? "location" : undefined}
                data-active={isActive ? "true" : "false"}
                data-reviewed={isReviewed ? "true" : "false"}
                className={`weather-surface weather-step-card flex min-h-[124px] touch-manipulation flex-col gap-2 rounded-xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${tone}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[10px] ${
                        isActive
                          ? "border-sky-300/80 bg-sky-500/35 text-sky-50"
                          : isReviewed
                            ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-100"
                            : "border-slate-600/80 text-slate-300"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {item.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    {isActive ? "Current" : isReviewed ? "Reviewed" : "Jump"}
                  </span>
                </div>
                <p className="text-sm font-semibold tracking-[0.06em] text-slate-100">{item.summary}</p>
                <p className="text-xs text-slate-300">
                  {isActive ? "This is the current scroll checkpoint." : "Jump to this section."}
                </p>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
