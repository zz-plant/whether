"use client";

import { useState } from "react";
import type { ActionStripItem } from "../../lib/report/operatingCalls";
import { ACTION_STRIP_DISPLAY_COPY } from "../../lib/report/reportCopy";
import { BoundedValue } from "./ui/boundedValue";

const STATE_BADGE_STYLE: Record<NonNullable<ActionStripItem["currentStateLabel"]>, string> = {
  Closed: "bg-rose-500/15 border border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
  Guarded: "bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  Staged: "bg-slate-800/80 border border-slate-700 text-slate-300",
  Open: "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
};

const STATE_BORDER_ACCENT: Record<NonNullable<ActionStripItem["currentStateLabel"]>, string> = {
  Closed: "border-l-rose-500",
  Guarded: "border-l-amber-500",
  Staged: "border-l-slate-600",
  Open: "border-l-emerald-500",
};

type RoleLens = "all" | "engineering" | "hiring" | "runway";

const LENS_CHIPS: Array<{ key: RoleLens; label: string }> = [
  { key: "all", label: "All Levers" },
  { key: "engineering", label: "🛠️ Engineering" },
  { key: "hiring", label: "👥 Hiring" },
  { key: "runway", label: "💰 Runway & Burn" },
];

export function ThreeWhethersCardClient({
  items,
  sharedFlipCorridor,
}: {
  items: ActionStripItem[];
  sharedFlipCorridor?: string | null;
}) {
  const [activeLens, setActiveLens] = useState<RoleLens>("all");

  const filteredItems = items.filter((item) => {
    if (activeLens === "all") return true;
    if (activeLens === "engineering") {
      return item.lever === "product-priorities" || item.lever === "investment-pace";
    }
    if (activeLens === "hiring") {
      return item.lever === "hiring-stance";
    }
    if (activeLens === "runway") {
      return item.lever === "sales-posture" || item.lever === "risk-tolerance";
    }
    return true;
  });

  const decisions = filteredItems.length > 0 ? filteredItems.slice(0, 3) : items.slice(0, 3);
  if (decisions.length === 0) return null;

  return (
    <section className="weather-section" aria-labelledby="three-whethers-heading">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 id="three-whethers-heading" className="type-section font-semibold tracking-tight text-white">
          {ACTION_STRIP_DISPLAY_COPY.heading}
        </h3>

        {/* Role Lens Filter Pills */}
        <div
          role="tablist"
          aria-label="Role lenses"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1 backdrop-blur-sm"
        >
          {LENS_CHIPS.map((chip) => {
            const isSelected = activeLens === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveLens(chip.key)}
                className={`rounded-md px-2.5 py-1 text-fluid-micro font-medium transition-all ${
                  isSelected
                    ? "bg-slate-800 text-sky-200 border border-slate-700 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {sharedFlipCorridor ? (
        <p className="mb-3 text-fluid-nano text-slate-300">
          <span className="font-semibold text-semantic-easing-fg">All three clear on the same lines:</span>{" "}
          <BoundedValue>{sharedFlipCorridor}</BoundedValue>
        </p>
      ) : null}

      <dl className="grid gap-3">
        {decisions.map((item) => {
          const accentClass = item.currentStateLabel
            ? STATE_BORDER_ACCENT[item.currentStateLabel]
            : "border-l-slate-700";

          return (
            <div
              key={item.lever}
              className={`weather-lever-card border-l-[3px] ${accentClass} grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)]`}
            >
              <div className="min-w-0 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-2">
                <dt className="text-sm font-semibold tracking-tight text-white">{item.label}</dt>
                {item.currentStateLabel ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-fluid-nano font-semibold ${STATE_BADGE_STYLE[item.currentStateLabel]}`}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {ACTION_STRIP_DISPLAY_COPY.state[item.currentStateLabel]}
                  </span>
                ) : null}
              </div>

              <dd className="min-w-0 space-y-2">
                <div className="space-y-1.5 text-fluid-nano text-slate-300">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-fluid-xs leading-relaxed text-slate-100 font-medium">
                    <span className="shrink-0 rounded bg-slate-800/80 px-1.5 py-0.5 text-fluid-nano font-semibold text-slate-300 border border-slate-700/60">
                      {ACTION_STRIP_DISPLAY_COPY.action}
                    </span>
                    <span>{item.areaActionNow}</span>
                  </p>
                  <p className="flex flex-wrap items-baseline gap-x-2 text-slate-300">
                    <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-fluid-nano font-semibold text-semantic-caution-fg border border-amber-500/25">
                      {ACTION_STRIP_DISPLAY_COPY.threshold}
                    </span>
                    <BoundedValue>{item.triggerThreshold}</BoundedValue>
                  </p>
                  <p className="flex flex-wrap items-baseline gap-x-2 text-slate-300">
                    <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-fluid-nano font-semibold text-semantic-easing-fg border border-emerald-500/25">
                      {ACTION_STRIP_DISPLAY_COPY.reversal}
                    </span>
                    <BoundedValue>{item.reversalCondition}</BoundedValue>
                  </p>
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
