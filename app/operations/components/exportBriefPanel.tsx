/**
 * Export-ready briefing panel for sharing capital posture status.
 * Generates copyable summaries for Slack, email, and slide briefs.
 */
"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@base-ui/react/button";
import { Toast } from "@base-ui/react/toast";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../../../lib/types";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { formatNumberWithUnit } from "../../../lib/formatters";
import { buildAgentPayloadJson, buildAgentPrompt } from "../../../lib/agentHandoff";
import { buildComplianceStamp } from "../../../lib/exportNotices";
import { formatRegimeLabel } from "../../../lib/regimeFormat";
import {
  buildBoardBrief,
  buildConstraintHeadlines,
  buildSlackBrief,
} from "../../../lib/export/briefBuilders";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { DataProvenanceStrip, type DataProvenance } from "../../components/dataProvenanceStrip";
import {
  getClipboardUiState,
  isClipboardTargetDisabled,
  useClipboardCopy,
  type ClipboardCopyState,
} from "../../components/useClipboardCopy";
import { SectionPanelHeader } from "../../components/sectionPanelHeader";
import { WorkAppLabel } from "../../components/workAppIcon";

const buildExportStamp = (
  treasury: TreasuryData,
  confidence: string
) =>
  buildComplianceStamp({
    sourceLine: treasury.source,
    timestamp: treasury.record_date,
    confidence,
  });

const buildJiraMarkdownBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[]
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");
  const regimeLabel = formatRegimeLabel(assessment.regime);
  const macroLines = macros.map(
    (macro) => `- ${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`
  );
  const constraintLines = assessment.constraints.map((item) => `- ${item}`);

  return [
    `## Whether Report — ${treasury.record_date}`,
    `**Regime:** ${regimeLabel} (${assessment.regime})`,
    `**Tightness:** ${assessment.scores.tightness} / **Risk appetite:** ${assessment.scores.riskAppetite}`,
    `**Base rate:** ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `**Curve slope:** ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    "",
    "### Macro signals",
    ...macroLines,
    "",
    "### Constraints",
    ...constraintLines,
    "",
    `Source: ${treasury.source}`,
    "",
    ...buildExportStamp(treasury, "Score-based posture confidence"),
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
  const regimeLabel = formatRegimeLabel(assessment.regime);
  const macroLines = macros.map(
    (macro) => `* ${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`
  );
  const constraintLines = assessment.constraints.map((item) => `* ${item}`);

  return [
    `h2. Whether Report — ${treasury.record_date}`,
    `*Regime:* ${regimeLabel} (${assessment.regime})`,
    `*Tightness:* ${assessment.scores.tightness} / *Risk appetite:* ${assessment.scores.riskAppetite}`,
    `*Base rate:* ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `*Curve slope:* ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    "",
    "h3. Macro signals",
    ...macroLines,
    "",
    "h3. Constraints",
    ...constraintLines,
    "",
    `Source: [${treasury.source}|${treasury.source}]`,
    "",
    ...buildExportStamp(treasury, "Score-based posture confidence"),
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
  const regimeLabel = formatRegimeLabel(assessment.regime);
  const macroLines = macros.map(
    (macro) => `- ${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`
  );
  const constraintLines = assessment.constraints.map((item) => `- ${item}`);

  return [
    `## Whether Report — ${treasury.record_date}`,
    `**Regime:** ${regimeLabel} (${assessment.regime})`,
    `**Tightness:** ${assessment.scores.tightness} / **Risk appetite:** ${assessment.scores.riskAppetite}`,
    `**Base rate:** ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `**Curve slope:** ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    "",
    "### Macro signals",
    ...macroLines,
    "",
    "### Constraints",
    ...constraintLines,
    "",
    `Source: ${treasury.source}`,
    "",
    ...buildExportStamp(treasury, "Score-based posture confidence"),
  ].join("\n");
};

const buildSlideBullets = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  macros: MacroSeriesReading[]
) => {
  return [
    `Capital posture: ${assessment.regime}`,
    `Tightness ${assessment.scores.tightness} / Risk ${assessment.scores.riskAppetite}`,
    ...macros.map((macro) => `${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`),
    ...assessment.constraints.map((item) => `Guardrail: ${item}`),
    "",
    ...buildExportStamp(treasury, "Score-based posture confidence"),
  ].join("\n");
};

export const ExportBriefPanel = ({
  assessment,
  treasury,
  sensors,
  macroSeries,
  provenance,
  showProvenance = true,
}: {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  sensors: SensorReading[];
  macroSeries: MacroSeriesReading[];
  provenance: DataProvenance;
  showProvenance?: boolean;
}) => {
  const { status, error, errorReason, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy();
  const lastStatusRef = useRef<ClipboardCopyState["status"]>("idle");
  const lastLabelRef = useRef<string | null>(null);
  const { add } = Toast.useToastManager();
  const copyError = error;

  useEffect(() => {
    if (status === lastStatusRef.current) {
      return;
    }
    if (status === "copied" && copiedTarget) {
      add({
        title: "Copied to clipboard",
        description: `${copiedTarget} is ready to paste.`,
        type: "success",
      });
    }
    if (status === "error") {
      const label = lastLabelRef.current ?? "brief";
      const isBlocked = errorReason === "unavailable";
      add({
        title: isBlocked ? "Clipboard blocked" : "Copy failed",
        description: `Copy the ${label.toLowerCase()} manually.`,
        type: "error",
      });
    }
    lastStatusRef.current = status;
  }, [add, copiedTarget, errorReason, status]);

  const briefing = useMemo(
    () => buildSlackBrief(assessment, treasury, sensors, macroSeries),
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
    () => buildSlideBullets(assessment, treasury, macroSeries),
    [assessment, treasury, macroSeries]
  );
  const boardBrief = useMemo(
    () => buildBoardBrief(assessment, treasury, sensors, macroSeries),
    [assessment, treasury, sensors, macroSeries],
  );

  const constraintHeadlines = useMemo(
    () => buildConstraintHeadlines(assessment, treasury),
    [assessment, treasury]
  );
  const agentPayload = useMemo(
    () => buildAgentPayloadJson(assessment, treasury, sensors, macroSeries),
    [assessment, treasury, sensors, macroSeries]
  );
  const agentPrompt = useMemo(
    () => buildAgentPrompt(assessment, treasury),
    [assessment, treasury]
  );
  const mailSubject = encodeURIComponent(`Whether Report — ${treasury.record_date}`);
  const mailBody = encodeURIComponent(briefing);

  const handleCopy = async (text: string, label: string) => {
    if (status === "copying") {
      return;
    }
    lastLabelRef.current = label;
    await copyToClipboard(text, label);
  };

  const clipboardState = (target: string) =>
    getClipboardUiState(target, { status, error: copyError, activeTarget, copiedTarget });

  const isCopyDisabled = (target: string) =>
    isClipboardTargetDisabled(target, { status, activeTarget });

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
        <SectionPanelHeader
          label="Export briefs"
          title="Share the report"
          titleId="export-briefs-title"
          description={
            <>
              Copy ready-made summaries for Slack, email, or slide decks, or print to PDF.
            </>
          }
          aside={
            <>
              <Button
                type="button"
                onClick={handlePrint}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Print / Save PDF
              </Button>
              {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
            </>
          }
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="weather-surface p-4">
            <p className="type-kicker"><WorkAppLabel app="slack" label="Slack-ready brief" /></p>
            <p className="mt-3 text-sm text-slate-300">
              One pasteable block tuned for status updates.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ClipboardActionRow
                label={<><span>Copy</span> <WorkAppLabel app="slack" label="brief" className="inline-flex items-center gap-2" /></>}
                state={clipboardState("Slack")}
                disabled={isCopyDisabled("Slack")}
                onClick={() => void handleCopy(briefing, "Slack")}
              />
              <ClipboardActionRow
                label="Copy board summary"
                state={clipboardState("Board")}
                disabled={isCopyDisabled("Board")}
                onClick={() => void handleCopy(boardBrief, "Board")}
              />
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
            <p className="type-kicker">Slide bullets</p>
            <p className="mt-3 text-sm text-slate-300">
              Compact bullets sized for quarterly planning decks.
            </p>
            <ClipboardActionRow
              label="Copy slide bullets"
              state={clipboardState("Slides")}
              disabled={isCopyDisabled("Slides")}
              onClick={() => void handleCopy(slideBullets, "Slides")}
              className="mt-4"
            />
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
            <p className="type-kicker">
              Key recommendations
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Plain-English summary lines that can drop into status updates or exec briefings.
            </p>
            <ClipboardActionRow
              label="Copy constraint headlines"
              state={clipboardState("Headlines")}
              disabled={isCopyDisabled("Headlines")}
              onClick={() => void handleCopy(constraintHeadlines, "Headlines")}
              className="mt-4"
            />
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
            <p className="type-kicker">
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
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="weather-surface p-4">
            <p className="type-kicker">
              Autonomous agent handoff
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Structured JSON plus a ready-to-use prompt for PM assistants and copilots.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ClipboardActionRow
                label="Copy JSON payload"
                state={clipboardState("Agent JSON payload")}
                disabled={isCopyDisabled("Agent JSON payload")}
                onClick={() => void handleCopy(agentPayload, "Agent JSON payload")}
              />
              <Button
                type="button"
                onClick={() =>
                  handleDownload(
                    agentPayload,
                    `whether-agent-payload-${treasury.record_date}.json`
                  )
                }
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Download JSON
              </Button>
              <ClipboardActionRow
                label="Copy agent prompt"
                state={clipboardState("Agent prompt")}
                disabled={isCopyDisabled("Agent prompt")}
                onClick={() => void handleCopy(agentPrompt, "Agent prompt")}
              />
              <Button
                type="button"
                onClick={() =>
                  handleDownload(
                    agentPrompt,
                    `whether-agent-prompt-${treasury.record_date}.txt`
                  )
                }
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Download prompt
              </Button>
            </div>
          </div>
          <div className="weather-surface p-4">
            <p className="type-kicker">
              Agent payload preview
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Keep the JSON intact to preserve provenance and timestamps.
            </p>
            <textarea
              readOnly
              value={agentPayload}
              rows={10}
              className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 font-mono text-base text-slate-200 touch-manipulation"
            />
          </div>
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="type-kicker">
            <WorkAppLabel app="jira" label="Jira" className="inline-flex items-center gap-2" />, <WorkAppLabel app="confluence" label="Confluence" className="inline-flex items-center gap-2" />, and <WorkAppLabel app="linear" label="Linear" className="inline-flex items-center gap-2" />
          </p>
          <p className="mt-3 text-sm text-slate-300">
            Paste tool-optimized summaries into your issue trackers or documentation.
          </p>
          <div className="mt-4 grid gap-4">
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                <WorkAppLabel app="jira" label="Jira description" />
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Paste into the Jira issue description field.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <ClipboardActionRow
                  label={<><span>Copy</span> <WorkAppLabel app="jira" label="description" className="inline-flex items-center gap-2" /></>}
                  state={clipboardState("Jira description")}
                  disabled={isCopyDisabled("Jira description")}
                  onClick={() => void handleCopy(jiraMarkdownBrief, "Jira description")}
                />
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
                  Download <WorkAppLabel app="jira" label="description" className="inline-flex items-center gap-2" />
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                <WorkAppLabel app="confluence" label="Confluence page snippet" />
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Paste into the Confluence page body.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <ClipboardActionRow
                  label={<><span>Copy</span> <WorkAppLabel app="confluence" label="page snippet" className="inline-flex items-center gap-2" /></>}
                  state={clipboardState("Confluence page snippet")}
                  disabled={isCopyDisabled("Confluence page snippet")}
                  onClick={() => void handleCopy(confluenceWikiBrief, "Confluence page snippet")}
                />
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
                  Download <WorkAppLabel app="confluence" label="page snippet" className="inline-flex items-center gap-2" />
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                <WorkAppLabel app="linear" label="Linear issue description" />
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Paste into the Linear issue description field.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <ClipboardActionRow
                  label={<><span>Copy</span> <WorkAppLabel app="linear" label="issue description" className="inline-flex items-center gap-2" /></>}
                  state={clipboardState("Linear issue description")}
                  disabled={isCopyDisabled("Linear issue description")}
                  onClick={() => void handleCopy(linearMarkdownBrief, "Linear issue description")}
                />
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
                  Download <WorkAppLabel app="linear" label="issue description" className="inline-flex items-center gap-2" />
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
          {copiedTarget ? `${copiedTarget} brief copied to clipboard.` : ""}
        </p>
      </div>
    </section>
  );
};
