/**
 * Export-ready briefing panel for sharing market climate status.
 * Generates copyable summaries for Slack, email, and slide briefs.
 */
"use client";

import { useMemo, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Toast } from "@base-ui/react/toast";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../../lib/types";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "../../components/dataProvenanceStrip";

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

const buildJiraMarkdownBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[]
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");
  const regimeLabel = getRegimeLabel(assessment.regime);
  const macroLines = macros.map(
    (macro) => `- ${macro.label}: ${formatNumber(macro.value, macro.unit)}`
  );
  const constraintLines = assessment.constraints.map((item) => `- ${item}`);

  return [
    `## Whether Report — ${treasury.record_date}`,
    `**Regime:** ${regimeLabel} (${assessment.regime})`,
    `**Tightness:** ${assessment.scores.tightness} / **Risk appetite:** ${assessment.scores.riskAppetite}`,
    `**Base rate:** ${formatNumber(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `**Curve slope:** ${formatNumber(curveSlope?.value ?? null, "%")}`,
    "",
    "### Macro signals",
    ...macroLines,
    "",
    "### Constraints",
    ...constraintLines,
    "",
    `Source: ${treasury.source}`,
  ].join("\n");
};

const buildConfluenceWikiBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[]
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");
  const regimeLabel = getRegimeLabel(assessment.regime);
  const macroLines = macros.map(
    (macro) => `* ${macro.label}: ${formatNumber(macro.value, macro.unit)}`
  );
  const constraintLines = assessment.constraints.map((item) => `* ${item}`);

  return [
    `h2. Whether Report — ${treasury.record_date}`,
    `*Regime:* ${regimeLabel} (${assessment.regime})`,
    `*Tightness:* ${assessment.scores.tightness} / *Risk appetite:* ${assessment.scores.riskAppetite}`,
    `*Base rate:* ${formatNumber(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `*Curve slope:* ${formatNumber(curveSlope?.value ?? null, "%")}`,
    "",
    "h3. Macro signals",
    ...macroLines,
    "",
    "h3. Constraints",
    ...constraintLines,
    "",
    `Source: [${treasury.source}|${treasury.source}]`,
  ].join("\n");
};

const buildLinearMarkdownBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[]
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");
  const regimeLabel = getRegimeLabel(assessment.regime);
  const macroLines = macros.map(
    (macro) => `- ${macro.label}: ${formatNumber(macro.value, macro.unit)}`
  );
  const constraintLines = assessment.constraints.map((item) => `- ${item}`);

  return [
    `## Whether Report — ${treasury.record_date}`,
    `**Regime:** ${regimeLabel} (${assessment.regime})`,
    `**Tightness:** ${assessment.scores.tightness} / **Risk appetite:** ${assessment.scores.riskAppetite}`,
    `**Base rate:** ${formatNumber(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `**Curve slope:** ${formatNumber(curveSlope?.value ?? null, "%")}`,
    "",
    "### Macro signals",
    ...macroLines,
    "",
    "### Constraints",
    ...constraintLines,
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
  const { add } = Toast.useToastManager();

  const briefing = useMemo(
    () => buildBrief(assessment, treasury, sensors, macroSeries),
    [assessment, treasury, sensors, macroSeries]
  );
  const jiraMarkdownBrief = useMemo(
    () => buildJiraMarkdownBrief(assessment, treasury, sensors, macroSeries),
    [assessment, treasury, sensors, macroSeries]
  );
  const confluenceWikiBrief = useMemo(
    () => buildConfluenceWikiBrief(assessment, treasury, sensors, macroSeries),
    [assessment, treasury, sensors, macroSeries]
  );
  const linearMarkdownBrief = useMemo(
    () => buildLinearMarkdownBrief(assessment, treasury, sensors, macroSeries),
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
      add({
        title: "Clipboard blocked",
        description: `Copy the ${label.toLowerCase()} manually.`,
        type: "error",
      });
      return;
    }
    setIsCopying(true);
    setCopyTarget(label);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setCopyError(false);
      setTimeout(() => setCopied(null), 2000);
      add({
        title: "Copied to clipboard",
        description: `${label} is ready to paste.`,
        type: "success",
      });
    } catch {
      setCopyError(true);
      add({
        title: "Copy failed",
        description: `Copy the ${label.toLowerCase()} manually.`,
        type: "error",
      });
    } finally {
      setIsCopying(false);
      setCopyTarget(null);
    }
  };

  const handlePrint = () => {
    window.print();
    add({
      title: "Print dialog opened",
      description: "Save to PDF or choose a printer.",
      type: "success",
    });
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    add({
      title: "Download started",
      description: `${filename} is downloading.`,
      type: "success",
    });
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
            <Button
              type="button"
              onClick={handlePrint}
              className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
            >
              Print / Save PDF
            </Button>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Slack-ready brief</p>
            <p className="mt-3 text-sm text-slate-300">
              One pasteable block tuned for status updates.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => handleCopy(briefing, "Slack")}
                disabled={isCopying}
                aria-busy={isCopying}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
              >
                {isCopying && copyTarget === "Slack" ? "Copying" : "Copy Slack brief"}
              </Button>
              <Button
                type="button"
                onClick={() =>
                  handleDownload(
                    briefing,
                    `whether-brief-${treasury.record_date}.txt`
                  )
                }
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Download brief
              </Button>
              <a
                href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Open email draft
              </a>
            </div>
          </div>
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Slide bullets</p>
            <p className="mt-3 text-sm text-slate-300">
              Compact bullets sized for quarterly planning decks.
            </p>
            <Button
              type="button"
              onClick={() => handleCopy(slideBullets, "Slides")}
              disabled={isCopying}
              aria-busy={isCopying}
              className="weather-button mt-4 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
            >
              {isCopying && copyTarget === "Slides" ? "Copying" : "Copy slide bullets"}
            </Button>
            <Button
              type="button"
              onClick={() =>
                handleDownload(
                  slideBullets,
                  `whether-slide-bullets-${treasury.record_date}.txt`
                )
              }
              className="weather-button mt-3 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
            >
              Download bullets
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Constraint headlines
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Plain-English summary lines that can drop into status updates or exec briefings.
            </p>
            <Button
              type="button"
              onClick={() => handleCopy(constraintHeadlines, "Headlines")}
              disabled={isCopying}
              aria-busy={isCopying}
              className="weather-button mt-4 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
            >
              {isCopying && copyTarget === "Headlines" ? "Copying" : "Copy constraint headlines"}
            </Button>
            <Button
              type="button"
              onClick={() =>
                handleDownload(
                  constraintHeadlines,
                  `whether-headlines-${treasury.record_date}.txt`
                )
              }
              className="weather-button mt-3 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
            >
              Download headlines
            </Button>
          </div>
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Headline preview
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Keep the text intact when sharing to preserve sourcing.
            </p>
            <textarea
              readOnly
              value={constraintHeadlines}
              rows={6}
              className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 font-mono text-base text-slate-200 touch-manipulation"
            />
          </div>
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
            Jira, Confluence, and Linear
          </p>
          <p className="mt-3 text-sm text-slate-300">
            Paste tool-optimized summaries into your issue trackers or documentation.
          </p>
          <div className="mt-4 grid gap-4">
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                Jira description
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Paste into the Jira issue description field.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => handleCopy(jiraMarkdownBrief, "Jira description")}
                  disabled={isCopying}
                  aria-busy={isCopying}
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
                >
                  {isCopying && copyTarget === "Jira description"
                    ? "Copying"
                    : "Copy Jira description"}
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      jiraMarkdownBrief,
                      `whether-jira-description-${treasury.record_date}.md`
                    )
                  }
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Download Jira description
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                Confluence page snippet
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Paste into the Confluence page body.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => handleCopy(confluenceWikiBrief, "Confluence page snippet")}
                  disabled={isCopying}
                  aria-busy={isCopying}
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
                >
                  {isCopying && copyTarget === "Confluence page snippet"
                    ? "Copying"
                    : "Copy Confluence page snippet"}
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      confluenceWikiBrief,
                      `whether-confluence-snippet-${treasury.record_date}.txt`
                    )
                  }
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Download Confluence page snippet
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                Linear issue description
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Paste into the Linear issue description field.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => handleCopy(linearMarkdownBrief, "Linear issue description")}
                  disabled={isCopying}
                  aria-busy={isCopying}
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
                >
                  {isCopying && copyTarget === "Linear issue description"
                    ? "Copying"
                    : "Copy Linear issue description"}
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      linearMarkdownBrief,
                      `whether-linear-description-${treasury.record_date}.md`
                    )
                  }
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Download Linear issue description
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 min-h-[260px]">
          {copyError ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
              <p className="text-xs font-semibold tracking-[0.12em] text-amber-200">
                Clipboard blocked
              </p>
              <p className="mt-2 text-amber-100/90">
                Select and copy the briefing below manually.
              </p>
              <textarea
                readOnly
                value={briefing}
                rows={8}
                className="mt-3 w-full rounded-lg border border-amber-400/30 bg-slate-950/80 p-3 font-mono text-base text-amber-100 touch-manipulation"
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
