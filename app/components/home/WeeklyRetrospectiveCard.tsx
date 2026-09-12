"use client";

import { useRef, useState } from "react";
import { History, Clock } from "lucide-react";
import { SinceLastVisit } from "./SinceLastVisit";
import { LastWeekInHindsight } from "./LastWeekInHindsight";
import type { HindsightInput } from "../../../lib/report/hindsight";

export interface WeeklyRetrospectiveCardProps {
  currentVisit: {
    recordDate: string;
    recordDateLabel: string;
    regimeLabel: string;
    call: string;
  };
  hindsight: HindsightInput;
  className?: string;
}

export function WeeklyRetrospectiveCard({
  currentVisit,
  hindsight,
  className = "",
}: WeeklyRetrospectiveCardProps) {
  const [activeTab, setActiveTab] = useState<"hindsight" | "visit">("hindsight");
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: "hindsight" | "visit") => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const nextTab = current === "hindsight" ? "visit" : "hindsight";
      setActiveTab(nextTab);
      const nextIndex = nextTab === "hindsight" ? 0 : 1;
      tabsRef.current[nextIndex]?.focus();
    }
  };

  return (
    <div className={`weather-brief-card p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-white">
            Weekly Retrospective
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit trail, performance hindsight, and delta tracking
          </p>
        </div>

        {/* Tab switcher with keyboard navigation and roving tabindex */}
        <div
          role="tablist"
          aria-label="Retrospective views"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-800/80 bg-slate-950/60 p-1 self-start sm:self-auto"
        >
          <button
            ref={(el) => {
              tabsRef.current[0] = el;
            }}
            type="button"
            role="tab"
            tabIndex={activeTab === "hindsight" ? 0 : -1}
            aria-selected={activeTab === "hindsight"}
            onKeyDown={(e) => handleKeyDown(e, "hindsight")}
            onClick={() => setActiveTab("hindsight")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "hindsight"
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <History size={13} />
            <span>Hindsight accuracy</span>
          </button>
          <button
            ref={(el) => {
              tabsRef.current[1] = el;
            }}
            type="button"
            role="tab"
            tabIndex={activeTab === "visit" ? 0 : -1}
            aria-selected={activeTab === "visit"}
            onKeyDown={(e) => handleKeyDown(e, "visit")}
            onClick={() => setActiveTab("visit")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "visit"
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Clock size={13} />
            <span>Since your last visit</span>
          </button>
        </div>
      </div>

      <div>
        {/* Both panels mount; the inactive one is hidden, not unmounted.
            SinceLastVisit's effect is the only writer of `whether.lastSeenCall`,
            so unmounting it on the default tab stopped recording ordinary visits
            entirely — a reader who never opened the second tab was never seen. */}
        <div className={activeTab === "hindsight" ? undefined : "hidden"}>
          <LastWeekInHindsight
            regime={hindsight.regime}
            scores={hindsight.scores}
            deltas={hindsight.deltas}
            thresholds={hindsight.thresholds}
            recordDateLabel={hindsight.recordDateLabel}
          />
        </div>
        <div className={activeTab === "visit" ? "rounded-xl border border-white/[0.04] bg-slate-950/40 p-4" : "hidden"}>
          <SinceLastVisit current={currentVisit} />
        </div>
      </div>
    </div>
  );
}
