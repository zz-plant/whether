import Link from "next/link";
import { ChevronRight, Cloud, AlertCircle, Shield } from "lucide-react";

export interface WhatCouldChangeCardProps {
  metricName?: string;
  conditionText?: string;
  summaryText?: string;
  signalsHref?: string;
  className?: string;
}

export function WhatCouldChangeCard({
  metricName = "Funding pressure",
  conditionText = "If risk appetite softens further, the posture turns Cloudy.",
  summaryText = "Funding pressure is already above the warning line. The overall call remains Sunny because risk appetite and operating performance still offset it.",
  signalsHref = "/signals",
  className = "",
}: WhatCouldChangeCardProps) {
  const isRisk = metricName.toLowerCase().includes("risk");
  const MetricIcon = isRisk ? Shield : (conditionText.toLowerCase().includes("cloud") ? Cloud : AlertCircle);

  return (
    <section
      aria-labelledby="what-could-change-heading"
      className={`weather-brief-card flex flex-col justify-between p-5 sm:p-6 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 id="what-could-change-heading" className="text-sm font-semibold tracking-tight text-white">
            What changes the call next
          </h3>
          <span className="text-xs font-medium text-slate-400">
            How the outlook could shift
          </span>
        </div>

        <div className="space-y-3.5">
          {/* Executive Synthesis */}
          <p className="text-xs text-slate-300 leading-relaxed">
            {summaryText}
          </p>

          {/* Interactive Trigger Callout */}
          <Link
            href={signalsHref}
            className="group flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-slate-950/40 p-3 transition-colors hover:border-teal-500/30 hover:bg-slate-900/60 focus-visible:outline-2 focus-visible:outline-teal-400 no-underline"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-slate-300 group-hover:text-teal-300 group-hover:border-teal-500/30 transition-colors">
                <MetricIcon size={16} />
              </div>
              <p className="text-xs text-slate-300 group-hover:text-white leading-snug">
                {conditionText}
              </p>
            </div>
            <ChevronRight
              size={16}
              className="shrink-0 text-slate-500 transition-all group-hover:text-teal-400 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
