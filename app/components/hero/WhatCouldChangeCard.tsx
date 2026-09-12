import Link from "next/link";
import { ChevronRight, BarChart2, Shield } from "lucide-react";

export interface WhatCouldChangeCardProps {
  metricName?: string;
  conditionText?: string;
  signalsHref?: string;
  className?: string;
}

export function WhatCouldChangeCard({
  metricName = "Funding pressure",
  conditionText = "Rises above 70 (74 today), which could flip the call to Cloudy.",
  signalsHref = "/signals",
  className = "",
}: WhatCouldChangeCardProps) {
  const isRisk = metricName.toLowerCase().includes("risk");
  const MetricIcon = isRisk ? Shield : BarChart2;

  return (
    <section
      aria-labelledby="what-could-change-heading"
      className={`weather-brief-card ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 id="what-could-change-heading" className="text-sm font-semibold tracking-tight text-white">
          What could change next
        </h3>
        <span className="text-xs font-medium text-slate-400">
          Monitor for shifts
        </span>
      </div>

      <Link
        href={signalsHref}
        className="group flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-slate-950/40 p-3 transition-colors hover:border-teal-500/30 hover:bg-slate-900/60 focus-visible:outline-2 focus-visible:outline-teal-400"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400">
            <MetricIcon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
              {metricName}
            </p>
            <p className="text-xs text-slate-400 line-clamp-2">
              {conditionText}
            </p>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="shrink-0 text-slate-500 transition-colors group-hover:text-teal-400 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </section>
  );
}
