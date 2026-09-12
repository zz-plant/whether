"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Users, Cloud, Globe, Sliders, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { DecisionPlanStressTester } from "../DecisionPlanStressTester";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import type { StartupVariantMode } from "../../../lib/report/boundedDecisionRules";

export interface StressTestQuickCardProps {
  planHref?: string;
  assessment?: RegimeAssessment;
  recordDate?: string;
  activeStage?: StartupVariantMode;
  className?: string;
}

const SCENARIOS = [
  {
    id: "hire",
    icon: Users,
    title: "Hire 3 senior engineers",
    subtitle: "Model headcount impact",
    query: "hire",
  },
  {
    id: "cloud",
    icon: Cloud,
    title: "Sign a $50k cloud commit",
    subtitle: "Model spend impact",
    query: "cloud",
  },
  {
    id: "market",
    icon: Globe,
    title: "Open a second market",
    subtitle: "Model expansion impact",
    query: "market",
  },
  {
    id: "custom",
    icon: Sliders,
    title: "Custom scenario...",
    subtitle: "Input your own burn",
    query: "custom",
  },
];

export function StressTestQuickCard({
  planHref = "/operate",
  assessment,
  recordDate,
  activeStage,
  className = "",
}: StressTestQuickCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section
      aria-labelledby="stress-test-quick-heading"
      className={`weather-brief-card p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-teal-400 fill-teal-400/20 shrink-0" />
          <h3 id="stress-test-quick-heading" className="text-sm font-semibold tracking-tight text-white">
            Considering a decision?
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Test a hire, commitment, or expansion against this week&apos;s posture
        </span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Scenario Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
          {SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setIsExpanded(true)}
                className="group flex min-h-[52px] items-center justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-slate-950/50 px-3.5 py-2.5 transition-colors hover:border-teal-500/40 hover:bg-slate-900/80 focus-visible:outline-2 focus-visible:outline-teal-400 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-slate-400 group-hover:text-teal-400 group-hover:border-teal-500/30 transition-colors">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                      {sc.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {sc.subtitle}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={14} className="text-slate-500 group-hover:text-teal-400 shrink-0 transition-colors" />
                ) : (
                  <ChevronDown size={14} className="text-slate-500 group-hover:text-teal-400 shrink-0 transition-colors" />
                )}
              </button>
            );
          })}
        </div>

        {/* Open Plan CTA */}
        <Link
          href={planHref}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-teal-400 px-6 py-2.5 text-xs font-semibold text-slate-950 shadow-md transition-all hover:bg-teal-300 hover:shadow-teal-500/20 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 no-underline"
        >
          <span>Open in Planning</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Expanded Interactive Stress Tester */}
      {isExpanded && assessment && recordDate && (
        <div className="mt-5 pt-5 border-t border-white/[0.06]">
          <DecisionPlanStressTester
            assessment={assessment}
            recordDate={recordDate}
            activeStage={activeStage}
          />
        </div>
      )}
    </section>
  );
}
