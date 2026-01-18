"use client";

import { useMemo, useState } from "react";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { insightDatabase } from "../../data/recommendations";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";

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

export const StrategyBriefPanel = ({
  assessment,
  recordDateLabel,
  provenance,
}: {
  assessment: RegimeAssessment;
  recordDateLabel: string;
  provenance: DataProvenance;
}) => {
  const [isCopying, setIsCopying] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  const briefing = useMemo(
    () => buildStrategyBrief(assessment, recordDateLabel),
    [assessment, recordDateLabel]
  );

  const handleCopy = async () => {
    if (isCopying) {
      return;
    }
    if (!navigator.clipboard?.writeText) {
      setCopyError(true);
      return;
    }
    setIsCopying(true);
    setCopyStatus("copying");
    try {
      await navigator.clipboard.writeText(briefing);
      setCopyError(false);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyError(true);
      setCopyStatus("error");
    } finally {
      setIsCopying(false);
    }
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
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
            >
              {isCopying ? "Copying" : "Copy strategy brief"}
            </button>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,0.6fr]">
          <div className="weather-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Generated narrative
            </p>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-200">
              {briefing}
            </pre>
          </div>
          <div className="weather-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
            <p className="mt-3 text-sm text-slate-300">
              {copyError
                ? "Clipboard unavailable in this environment."
                : copyStatus === "copied"
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
