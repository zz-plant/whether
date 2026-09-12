import Link from "next/link";
import { ChevronRight, AlertTriangle, ArrowDown, Percent } from "lucide-react";

export interface WatchItem {
  id: string;
  label: string;
  description: string;
  icon?: "alert" | "arrow" | "percent";
}

export interface WhatCouldChangeCardProps {
  items?: WatchItem[];
  signalsHref?: string;
  className?: string;
}

const DEFAULT_WATCH_ITEMS: WatchItem[] = [
  {
    id: "funding",
    label: "Funding pressure > 72",
    description: "increases likelihood of Cloudy.",
    icon: "alert",
  },
  {
    id: "risk",
    label: "Risk appetite < 44",
    description: "likely flips to Cloudy.",
    icon: "arrow",
  },
  {
    id: "rates",
    label: "Further macro deterioration",
    description: "raises financing costs.",
    icon: "percent",
  },
];

export function WhatCouldChangeCard({
  items = DEFAULT_WATCH_ITEMS,
  signalsHref = "/signals",
  className = "",
}: WhatCouldChangeCardProps) {
  const watchItems = items.length > 0 ? items : DEFAULT_WATCH_ITEMS;

  return (
    <section
      aria-labelledby="what-to-watch-heading"
      className={`weather-brief-card flex flex-col justify-between p-5 sm:p-6 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 id="what-to-watch-heading" className="text-sm font-semibold tracking-tight text-white">
            What to watch
          </h3>
          <span className="text-xs font-medium text-slate-400">
            Triggers &amp; shifts
          </span>
        </div>

        <ul className="space-y-3">
          {watchItems.map((item) => {
            const Icon = item.icon === "arrow" ? ArrowDown : item.icon === "percent" ? Percent : AlertTriangle;
            const iconStyle = item.icon === "arrow"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
              : item.icon === "percent"
              ? "border-teal-500/20 bg-teal-500/10 text-teal-300"
              : "border-rose-500/20 bg-rose-500/10 text-rose-300";

            return (
              <li key={item.id}>
                <Link
                  href={signalsHref}
                  className="group flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-slate-950/40 p-3 transition-colors hover:border-teal-500/30 hover:bg-slate-900/60 focus-visible:outline-2 focus-visible:outline-teal-400 no-underline"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${iconStyle}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-slate-500 transition-all group-hover:text-teal-400 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
