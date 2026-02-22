"use client";

import { useMemo } from "react";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { insightDatabase } from "../../../data/recommendations";
import { DataProvenanceStrip, type DataProvenance } from "../../components/dataProvenanceStrip";
import { useClipboardCopy } from "../../components/useClipboardCopy";

const buildStrategyBrief = (
  assessment: RegimeAssessment,
  recordDateLabel: string
) => {
  const template = insightDatabase.strategyBriefing.regimes.find(
    (entry) => entry.key === assessment.regime
  );

  if (!template) {
    return "Strategy Brief unavailable for current market climate.";
  }

  return [
    `Strategy Brief — ${recordDateLabel}`,
    `Market climate: ${assessment.regime}`,
    "",
    `Headline: ${template.headline}`,
    `Narrative: ${template.narrative}`,
    "",
    "Priorities:",
    ...template.priorities.map((item) => `• ${item}`),
    "",
    "Watchlist:",
    ...template.watchlist.map((item) => `• ${item}`),
    "",
    "Reversal triggers:",
    ...template.reversalTriggers.map((item) => `• ${item}`),
  ].join("\n");
};

const strategySections = [
  {
    key: "priorities",
    title: "Priority now",
    badge: "Focus",
    icon: "🎯",
    surfaceClass: "border-sky-400/35 bg-sky-500/10",
  },
  {
    key: "watchlist",
    title: "Watch closely",
    badge: "Monitor",
    icon: "👀",
    surfaceClass: "border-amber-400/35 bg-amber-500/10",
  },
  {
    key: "reversalTriggers",
    title: "Pivot signals",
    badge: "Trigger",
    icon: "↩",
    surfaceClass: "border-violet-400/35 bg-violet-500/10",
  },
] as const;

export const StrategyBriefPanel = ({
  assessment,
  recordDateLabel,
  provenance,
}: {
  assessment: RegimeAssessment;
  recordDateLabel: string;
  provenance: DataProvenance;
}) => {
  const { status, error, copyToClipboard } = useClipboardCopy();
  const isCopying = status === "copying";
  const isCopied = status === "copied";

  const briefing = useMemo(
    () => buildStrategyBrief(assessment, recordDateLabel),
    [assessment, recordDateLabel]
  );

  const strategyTemplate = useMemo(
    () =>
      insightDatabase.strategyBriefing.regimes.find(
        (entry) => entry.key === assessment.regime
      ),
    [assessment.regime]
  );

  const handleCopy = () => {
    void copyToClipboard(briefing, "Strategy Brief");
  };

  return (
    <section
      id="strategy-brief"
      aria-labelledby="strategy-brief-title"
      className="mt-10"
    >
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Strategy brief</p>
            <h3 id="strategy-brief-title" className="type-section text-slate-100">
              {insightDatabase.strategyBriefing.title}
            </h3>
            <p className="mt-2 type-data text-slate-300">
              {insightDatabase.strategyBriefing.subtitle}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isCopying}
              aria-busy={isCopying}
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
            >
              {isCopying ? "Copying" : "Copy strategy brief"}
            </button>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,0.6fr]">
          <div className="space-y-4">
            {strategyTemplate ? (
              <>
                <div className="weather-surface border border-sky-400/40 bg-sky-500/10 p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                    At a glance
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-50">
                    {strategyTemplate.headline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-200">
                    {strategyTemplate.narrative}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {strategySections.map((section) => {
                    const entries = strategyTemplate[section.key];
                    return (
                      <article
                        key={section.key}
                        className={`weather-surface border p-4 ${section.surfaceClass}`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300">
                          {section.badge}
                        </p>
                        <h4 className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-50">
                          <span aria-hidden="true">{section.icon}</span>
                          {section.title}
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm text-slate-200">
                          {entries.map((entry) => (
                            <li key={entry} className="flex items-start gap-2">
                              <span
                                className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-current"
                                aria-hidden="true"
                              />
                              <span>{entry}</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="weather-surface p-4">
                <p className="text-sm text-slate-300">
                  Strategy Brief unavailable for current market climate.
                </p>
              </div>
            )}

            <details className="weather-surface p-4">
              <summary className="cursor-pointer text-xs font-semibold tracking-[0.12em] text-slate-300">
                Full copy-ready narrative
              </summary>
              <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-300">
                {briefing}
              </pre>
            </details>
          </div>
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Status</p>
            <p className="mt-3 text-sm text-slate-300">
              {error
                ? "Clipboard unavailable in this environment."
                : isCopied
                  ? "Brief copied to clipboard."
                  : "Ready to share in leadership updates."}
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Public data only. No internal company inputs required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
