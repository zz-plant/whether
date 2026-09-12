import Link from "next/link";
import { Zap, Users, Cloud, ArrowRight, ChevronRight } from "lucide-react";

export interface StressTestQuickCardProps {
  planHref?: string;
  className?: string;
}

export function StressTestQuickCard({
  planHref = "/operate",
  className = "",
}: StressTestQuickCardProps) {
  return (
    <section
      aria-labelledby="stress-test-quick-heading"
      className={`weather-brief-card ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-teal-400 fill-teal-400/20" />
          <h3 id="stress-test-quick-heading" className="text-sm font-semibold tracking-tight text-white">
            Stress-test a decision
          </h3>
        </div>
        <span className="text-xs font-medium text-slate-400">
          See how it changes the outlook
        </span>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Scenario Chips */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Link
            href={`${planHref}?plan=hire`}
            className="group flex min-h-[44px] flex-1 items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-slate-950/50 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-teal-500/40 hover:bg-slate-900/80 focus-visible:outline-2 focus-visible:outline-teal-400 sm:flex-initial"
          >
            <div className="flex items-center gap-2">
              <Users size={15} className="text-slate-400 group-hover:text-teal-400" />
              <span>Hire 3 senior engineers</span>
            </div>
            <ChevronRight size={14} className="text-slate-500 group-hover:text-teal-400" />
          </Link>

          <Link
            href={`${planHref}?plan=cloud`}
            className="group flex min-h-[44px] flex-1 items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-slate-950/50 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-teal-500/40 hover:bg-slate-900/80 focus-visible:outline-2 focus-visible:outline-teal-400 sm:flex-initial"
          >
            <div className="flex items-center gap-2">
              <Cloud size={15} className="text-slate-400 group-hover:text-teal-400" />
              <span>Sign a $50k cloud commit</span>
            </div>
            <ChevronRight size={14} className="text-slate-500 group-hover:text-teal-400" />
          </Link>
        </div>

        {/* Open Plan CTA */}
        <Link
          href={planHref}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-md transition-all hover:bg-teal-300 hover:shadow-teal-500/20 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <span>Open Plan</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
