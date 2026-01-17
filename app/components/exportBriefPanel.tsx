/**
 * Export-ready briefing panel for sharing market climate status.
 * Generates copyable summaries for Slack, email, and slide briefs.
 */
"use client";

import { useMemo, useState } from "react";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../../lib/types";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatNumber = (value: number | null, unit: string) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return `${numberFormatter.format(value)}${unit}`;
};

const buildBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[]
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");
  const macroLines = macros.map(
    (macro) => `• ${macro.label}: ${formatNumber(macro.value, macro.unit)}`
  );

  return [
    `Whether Report Brief — ${treasury.record_date}`,
    `Market climate: ${assessment.regime}`,
    `Tightness: ${assessment.scores.tightness} | Risk appetite: ${assessment.scores.riskAppetite}`,
    `Base rate: ${formatNumber(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `Curve slope: ${formatNumber(curveSlope?.value ?? null, "%")}`,
    "",
    "Macro signals:",
    ...macroLines,
    "",
    "Constraints:",
    ...assessment.constraints.map((item) => `• ${item}`),
    "",
    `Source: ${treasury.source}`,
  ].join("\n");
};

const buildSlideBullets = (assessment: RegimeAssessment, macros: MacroSeriesReading[]) => {
  return [
    `Market climate: ${assessment.regime}`,
    `Tightness ${assessment.scores.tightness} / Risk ${assessment.scores.riskAppetite}`,
    ...macros.map((macro) => `${macro.label}: ${formatNumber(macro.value, macro.unit)}`),
    ...assessment.constraints.map((item) => `Guardrail: ${item}`),
  ].join("\n");
};

const getRegimeLabel = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return "Survival Mode";
    case "DEFENSIVE":
      return "Safety Mode";
    case "VOLATILE":
      return "Stability Mode";
    case "EXPANSION":
      return "Growth Mode";
    default:
      return regime;
  }
};

const buildConstraintHeadlines = (assessment: RegimeAssessment, treasury: TreasuryData) => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const headline = `${regimeLabel}: capital tightness ${assessment.scores.tightness}/100 with bravery ${assessment.scores.riskAppetite}/100.`;
  const constraints = assessment.constraints.map((item) => `• ${item}`);

  return [
    `Whether Report Headlines — ${treasury.record_date}`,
    headline,
    "",
    "Execution constraints:",
    ...constraints,
    "",
    `Source: ${treasury.source}`,
  ].join("\n");
};

export const ExportBriefPanel = ({
  assessment,
  treasury,
  sensors,
  macroSeries,
  provenance,
}: {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  sensors: SensorReading[];
  macroSeries: MacroSeriesReading[];
  provenance: DataProvenance;
}) => {
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  const briefing = useMemo(
    () => buildBrief(assessment, treasury, sensors, macroSeries),
    [assessment, treasury, sensors, macroSeries]
  );
  const slideBullets = useMemo(
    () => buildSlideBullets(assessment, macroSeries),
    [assessment, macroSeries]
  );
  const constraintHeadlines = useMemo(
    () => buildConstraintHeadlines(assessment, treasury),
    [assessment, treasury]
  );
  const mailSubject = encodeURIComponent(`Whether Report — ${treasury.record_date}`);
  const mailBody = encodeURIComponent(briefing);

  const handleCopy = async (text: string, label: string) => {
    if (isCopying) {
      return;
    }
    if (!navigator.clipboard?.writeText) {
      setCopyError(true);
      return;
    }
    setIsCopying(true);
    setCopyTarget(label);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setCopyError(false);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopyError(true);
    } finally {
      setIsCopying(false);
      setCopyTarget(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section id="export-briefs" aria-labelledby="export-briefs-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Export briefs</p>
            <h3 id="export-briefs-title" className="type-section text-slate-100">
              Share the report
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Copy ready-made summaries for Slack, email, or slide decks, or print to PDF.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
            >
              Print / Save PDF
            </button>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="weather-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Slack-ready brief</p>
            <p className="mt-3 text-sm text-slate-300">
              One pasteable block tuned for status updates.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleCopy(briefing, "Slack")}
                disabled={isCopying}
                aria-busy={isCopying}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
              >
                {isCopying && copyTarget === "Slack" ? "Copying" : "Copy Slack brief"}
              </button>
              <a
                href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
              >
                Open email draft
              </a>
            </div>
          </div>
          <div className="weather-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Slide bullets</p>
            <p className="mt-3 text-sm text-slate-300">
              Compact bullets sized for quarterly planning decks.
            </p>
            <button
              type="button"
              onClick={() => handleCopy(slideBullets, "Slides")}
              disabled={isCopying}
              aria-busy={isCopying}
              className="weather-button mt-4 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
            >
              {isCopying && copyTarget === "Slides" ? "Copying" : "Copy slide bullets"}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="weather-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Constraint headlines
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Plain-English summary lines that can drop into status updates or exec briefings.
            </p>
            <button
              type="button"
              onClick={() => handleCopy(constraintHeadlines, "Headlines")}
              disabled={isCopying}
              aria-busy={isCopying}
              className="weather-button mt-4 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
            >
              {isCopying && copyTarget === "Headlines" ? "Copying" : "Copy constraint headlines"}
            </button>
          </div>
          <div className="weather-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Headline preview
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Keep the text intact when sharing to preserve sourcing.
            </p>
            <textarea
              readOnly
              value={constraintHeadlines}
              rows={6}
              className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 font-mono text-base text-slate-200"
            />
          </div>
        </div>
        <div className="mt-4 min-h-[260px]">
          {copyError ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200">
                Clipboard blocked
              </p>
              <p className="mt-2 text-amber-100/90">
                Select and copy the briefing below manually.
              </p>
              <textarea
                readOnly
                value={briefing}
                rows={8}
                className="mt-3 w-full rounded-lg border border-amber-400/30 bg-slate-950/80 p-3 font-mono text-base text-amber-100"
              />
            </div>
          ) : null}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {copied ? `${copied} brief copied to clipboard.` : ""}
        </p>
      </div>
    </section>
  );
};
