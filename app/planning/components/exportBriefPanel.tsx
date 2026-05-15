/**
 * Export-ready briefing panel for sharing capital posture status.
 * Generates copyable summaries for Slack, email, and slide briefs.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Toast } from "@base-ui/react/toast";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../../../lib/types";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { formatNumberWithUnit, resolveWeekEndingIsoDateUTC } from "../../../lib/formatters";
import { buildAgentPayloadJson, buildAgentPrompt } from "../../../lib/agentHandoff";
import type { CanonicalDecisionCopy } from "../../../lib/report/canonicalDecisionCopy";
import {
  buildWeeklyBoardSnippetPlainText,
  buildWeeklyCallSnapshotPlainText,
  buildWeeklyOperatorBriefCardText,
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
  buildWeeklyOperatorBriefSlackBlocks,
} from "../../../lib/export/weeklyOperatorBrief";
import { buildExplainerBriefContent } from "../../../lib/export/explainerBrief";
import { buildComplianceStamp } from "../../../lib/exportNotices";
import { formatRegimeLabel } from "../../../lib/regimeFormat";
import {
  buildBoundedDecisionLines,
  buildBoardSlideBullets,
  buildBoardBrief,
  buildCallCitation,
  buildConstraintHeadlines,
  buildSlackBrief,
  type ModeledExportDecisionPayload,
} from "../../../lib/export/briefBuilders";
import { WeeklyDigestDownload } from "./weeklyDigestDownload";
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
import { CopyIcon, DocumentIcon, DownloadIcon } from "../../components/uiIcons";
import { PRIMARY_AUDIENCE_SHARE_GUIDANCE } from "../../../lib/report/reportCopy";

const buildExportStamp = (
  treasury: TreasuryData,
  confidence: string
) =>
  buildComplianceStamp({
    sourceLine: treasury.source,
    timestamp: treasury.record_date,
    confidence,
  });

type ExportDecisionModel = ModeledExportDecisionPayload & {
  confidenceLabel?: "HIGH" | "MED" | "LOW";
  confidencePercent?: number;
  compactFlipConditionLabels?: string[];
  canonicalDecisionCopy?: CanonicalDecisionCopy;
  decisionShiftSummary?: string;
  trendLabel?: string;
};

const buildIssueTrackerMarkdownBrief = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[],
  decisionModel?: ExportDecisionModel,
  format: "markdown" | "wiki" = "markdown",
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");
  const regimeLabel = formatRegimeLabel(assessment.regime);
  const postureLabel = decisionModel?.postureWithStageLabel ?? regimeLabel;
  const bullet = format === "wiki" ? "*" : "-";
  const heading2 = format === "wiki" ? "h2. " : "## ";
  const heading3 = format === "wiki" ? "h3. " : "### ";
  const macroLines = macros.map((macro) => `${bullet} ${macro.label}: ${formatNumberWithUnit(macro.value, macro.unit)}`);
  const boundedDecisionLines = buildBoundedDecisionLines(assessment, { modeledDecision: decisionModel })
    .map((line) => `${bullet} ${line.replace(/^•\s*/, "")}`);
  const sourceLine = format === "wiki"
    ? `Source: [${treasury.source}|${treasury.source}]`
    : `Source: ${treasury.source}`;

  return [
    `${heading2}Whether Report — ${treasury.record_date}`,
    `${format === "wiki" ? "*Posture:*" : "**Posture:**"} ${postureLabel}`,
    ...(postureLabel !== assessment.regime
      ? [`${format === "wiki" ? "*Regime:*" : "**Regime:**"} ${assessment.regime}`]
      : []),
    `${format === "wiki" ? "*Tightness:*" : "**Tightness:**"} ${assessment.scores.tightness} / ${format === "wiki" ? "*Risk appetite:*" : "**Risk appetite:**"} ${assessment.scores.riskAppetite}`,
    `${format === "wiki" ? "*Base rate:*" : "**Base rate:**"} ${formatNumberWithUnit(baseRate?.value ?? null, "%")} (${assessment.scores.baseRateUsed})`,
    `${format === "wiki" ? "*Curve slope:*" : "**Curve slope:**"} ${formatNumberWithUnit(curveSlope?.value ?? null, "%")}`,
    "",
    `${heading3}Macro signals`,
    ...macroLines,
    "",
    `${heading3}Bounded decision`,
    ...boundedDecisionLines,
    "",
    sourceLine,
    "",
    ...buildExportStamp(treasury, decisionModel?.confidenceLabel ? `${decisionModel.confidenceLabel} confidence` : "Score-based posture confidence"),
  ].join("\n");
};

export const ExportBriefPanel = ({
  assessment,
  treasury,
  sensors,
  macroSeries,
  decisionModel,
  provenance,
  showProvenance = true,
}: {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  sensors: SensorReading[];
  macroSeries: MacroSeriesReading[];
  decisionModel?: ExportDecisionModel;
  provenance: DataProvenance;
  showProvenance?: boolean;
}) => {
  const { status, error, errorReason, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy();
  const lastStatusRef = useRef<ClipboardCopyState["status"]>("idle");
  const lastLabelRef = useRef<string | null>(null);
  const { add } = Toast.useToastManager();
  const copyError = error;
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideIndicator, setOverrideIndicator] = useState("");
  const [overrideOwner, setOverrideOwner] = useState("");
  const [overrideReversal, setOverrideReversal] = useState("");
  const fallbackActive = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const hasOverride = [overrideReason, overrideIndicator, overrideOwner, overrideReversal].every(
    (value) => value.trim().length > 0,
  );
  const overrideLine = hasOverride
    ? `OVERRIDE ACTIVE: ${overrideReason.trim()} · Indicator: ${overrideIndicator.trim()} · Owner: ${overrideOwner.trim()} · Reverse when: ${overrideReversal.trim()}`
    : "";
  const applyOverride = (content: string) => (hasOverride ? `${content}\n${overrideLine}` : content);

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
    () => buildSlackBrief(assessment, treasury, sensors, macroSeries, { modeledDecision: decisionModel }),
    [assessment, treasury, sensors, macroSeries, decisionModel]
  );
  const weeklyOperatorDate = useMemo(
    () => resolveWeekEndingIsoDateUTC(treasury.record_date),
    [treasury.record_date],
  );
  const weeklyOperatorPayload = useMemo(() => buildWeeklyOperatorBriefPayload({
    assessment,
    treasury,
    date: weeklyOperatorDate,
    postureWithStageLabel: decisionModel?.postureWithStageLabel,
    confidenceLabel: decisionModel?.confidenceLabel,
    actionStripItems: decisionModel?.actionStripItems,
    flipConditionLabels: decisionModel?.compactFlipConditionLabels,
    canonicalDecisionCopy: decisionModel?.canonicalDecisionCopy,
  }), [assessment, treasury, weeklyOperatorDate, decisionModel]);
  const weeklyOperatorPlainText = useMemo(
    () => buildWeeklyOperatorBriefPlainText(weeklyOperatorPayload),
    [weeklyOperatorPayload],
  );
  const weeklyOperatorSlackBlocks = useMemo(
    () => buildWeeklyOperatorBriefSlackBlocks(weeklyOperatorPayload),
    [weeklyOperatorPayload],
  );
  const weeklyOperatorCardText = useMemo(
    () => buildWeeklyOperatorBriefCardText(weeklyOperatorPayload),
    [weeklyOperatorPayload],
  );
  const citation = useMemo(
    () => buildCallCitation(assessment, treasury, {
      postureWithStageLabel: decisionModel?.postureWithStageLabel,
      operatingStanceLine: decisionModel?.operatingStanceLine,
    }),
    [assessment, treasury, decisionModel],
  );
  const jiraMarkdownBrief = useMemo(
    () => buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macroSeries, decisionModel, "markdown"),
    [assessment, treasury, sensors, macroSeries, decisionModel]
  );
  const confluenceWikiBrief = useMemo(
    () => buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macroSeries, decisionModel, "wiki"),
    [assessment, treasury, sensors, macroSeries, decisionModel]
  );
  const linearMarkdownBrief = useMemo(
    () => buildIssueTrackerMarkdownBrief(assessment, treasury, sensors, macroSeries, decisionModel, "markdown"),
    [assessment, treasury, sensors, macroSeries, decisionModel]
  );
  const slideBullets = useMemo(
    () => buildBoardSlideBullets(assessment, treasury, macroSeries, { modeledDecision: decisionModel }),
    [assessment, treasury, macroSeries, decisionModel],
  );
  const boardBrief = useMemo(
    () => buildBoardBrief(assessment, treasury, sensors, macroSeries, { modeledDecision: decisionModel }),
    [assessment, treasury, sensors, macroSeries, decisionModel],
  );
  const boardNote = useMemo(
    () => buildWeeklyBoardSnippetPlainText({
      trustLine: fallbackActive
        ? `TRUST: FALLBACK SNAPSHOT · As of ${treasury.record_date}${treasury.fallback_reason ? ` · Reason: ${treasury.fallback_reason}` : ""}`
        : `TRUST: LIVE · As of ${treasury.record_date}`,
      postureLine: `POSTURE: ${decisionModel?.canonicalDecisionCopy?.currentRegimeLabel ?? decisionModel?.postureWithStageLabel ?? formatRegimeLabel(assessment.regime)} · ${decisionModel?.confidenceLabel ?? "Score-based"} confidence${decisionModel?.confidencePercent ? ` (${Math.round(decisionModel.confidencePercent)}%)` : ""}`,
      changedLine: `CHANGED: ${decisionModel?.decisionShiftSummary ?? "Use the current weekly call as the operating baseline."}`,
      guardrailLine: `GUARDRAIL: ${decisionModel?.guardrailThreshold ?? weeklyOperatorPayload.pauseIf}`,
      flipLine: `FLIP: ${decisionModel?.canonicalDecisionCopy?.flipTrigger ?? decisionModel?.reversalTrigger ?? weeklyOperatorPayload.changeCourseIf}`,
      stabilityLine: "STABILITY: Act on posture changes after 2 consecutive weekly reads, unless the flip trigger fires at HIGH confidence.",
    }),
    [assessment.regime, decisionModel, fallbackActive, treasury, weeklyOperatorPayload],
  );
  const callSnapshot = useMemo(
    () => buildWeeklyCallSnapshotPlainText({
      regime: decisionModel?.canonicalDecisionCopy?.currentRegimeLabel ?? decisionModel?.postureWithStageLabel ?? formatRegimeLabel(assessment.regime),
      call: decisionModel?.canonicalDecisionCopy?.operatingCall ?? decisionModel?.operatingStanceLine ?? weeklyOperatorPayload.currentCall,
      trend: decisionModel?.trendLabel ?? "Current",
      confidence: decisionModel?.confidencePercent
        ? `${Math.round(decisionModel.confidencePercent)}% (${decisionModel?.confidenceLabel ?? "Score-based"})`
        : decisionModel?.confidenceLabel ?? "Score-based confidence",
      doNow: decisionModel?.canonicalDecisionCopy?.doNowLines[0] ?? decisionModel?.actionNow ?? weeklyOperatorPayload.actionNow,
      avoid: decisionModel?.guardrailThreshold ?? weeklyOperatorPayload.pauseIf,
      watch: decisionModel?.canonicalDecisionCopy?.flipTrigger ?? decisionModel?.reversalTrigger ?? weeklyOperatorPayload.changeCourseIf,
      flipConditions: decisionModel?.canonicalDecisionCopy?.flipConditions ?? decisionModel?.compactFlipConditionLabels ?? weeklyOperatorPayload.flipConditionLabels,
    }),
    [assessment.regime, decisionModel, weeklyOperatorPayload],
  );
  const explainerBrief = buildExplainerBriefContent({
    boardSummary: applyOverride(boardBrief),
    weeklyOperatorBrief: applyOverride(weeklyOperatorPlainText),
    citation,
  });
  const meetingPack = [
    "BOARD NOTE",
    applyOverride(boardNote),
    "",
    "Call snapshot",
    applyOverride(callSnapshot),
    "",
    "WEEKLY BRIEF",
    applyOverride(weeklyOperatorPlainText),
    "",
    "BOARD SUMMARY",
    applyOverride(boardBrief),
    "",
    "CITATION",
    citation,
  ].join("\n");

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
    if (fallbackActive && !window.confirm("Cached snapshot active. Confirm export before sharing this brief.")) {
      return;
    }
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
          label="Share first"
          title="Pick the update"
          titleId="export-briefs-title"
          description={
            <>
              {PRIMARY_AUDIENCE_SHARE_GUIDANCE}
            </>
          }
          aside={
            <>
              <Button
                type="button"
                onClick={handlePrint}
                className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100 transition-colors hover:text-white touch-manipulation"
              >
                <span className="inline-flex items-center gap-1.5"><DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />Print / PDF</span>
              </Button>
              {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
            </>
          }
        />

        <div className="mt-4 rounded-lg border border-sky-400/40 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Default briefs</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <ClipboardActionRow
              label={<span className="inline-flex items-center gap-1.5"><CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />Copy leadership team brief</span>}
              state={clipboardState("Leadership team brief")}
              disabled={isCopyDisabled("Leadership team brief")}
              onClick={() => void handleCopy(applyOverride(weeklyOperatorPlainText), "Leadership team brief")}
              className="weather-button-primary"
              buttonProps={{
                "data-premium-intent": "export_brief",
                "data-premium-cta": "copy_weekly_operator_brief",
              }}
            />
            <ClipboardActionRow
              label={<span className="inline-flex items-center gap-1.5"><CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />Copy plain-English brief</span>}
              state={clipboardState("Plain-English brief")}
              disabled={isCopyDisabled("Plain-English brief")}
              onClick={() => void handleCopy(explainerBrief, "Plain-English brief")}
              className="weather-button-primary"
              buttonProps={{
                "data-premium-intent": "export_brief",
                "data-premium-cta": "copy_explainer_brief",
              }}
            />
            <ClipboardActionRow
              label={<span className="inline-flex items-center gap-1.5"><DocumentIcon className="h-3.5 w-3.5" aria-hidden="true" />Copy board summary</span>}
              state={clipboardState("Board summary")}
              disabled={isCopyDisabled("Board summary")}
              onClick={() => void handleCopy(applyOverride(boardBrief), "Board summary")}
              className="weather-button-primary"
              buttonProps={{
                "data-premium-intent": "export_brief",
                "data-premium-cta": "copy_board_summary",
              }}
            />
            <Button
              type="button"
              onClick={handlePrint}
              data-premium-intent="export_brief"
              data-premium-cta="export_pdf"
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100 transition-colors hover:text-white touch-manipulation"
            >
              <span className="inline-flex items-center gap-1.5"><DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />Print / PDF</span>
            </Button>
          </div>
        </div>

        {hasOverride ? (
          <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">Override active</p>
            <p className="mt-2">{overrideLine}</p>
          </div>
        ) : null}

        <details className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950/60 p-4">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
            Quick share formats
          </summary>
          <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-4">
            <p className="text-sm text-slate-300">
              Use these when the same call needs a faster summary or a direct citation.
            </p>
            <div className="flex flex-wrap gap-3">
              <ClipboardActionRow
                label="Copy one-screen summary"
                state={clipboardState("One-screen summary")}
                disabled={isCopyDisabled("One-screen summary")}
                onClick={() => void handleCopy(applyOverride(callSnapshot), "One-screen summary")}
              />
              <ClipboardActionRow
                label="Copy citation"
                state={clipboardState("Citation")}
                disabled={isCopyDisabled("Citation")}
                onClick={() => void handleCopy(citation, "Citation")}
              />
              <WeeklyDigestDownload />
            </div>
            {fallbackActive ? (
              <p className="text-[10px] leading-5 text-amber-200">
                Cached snapshot active: confirm irreversible sharing actions before circulating this package.
              </p>
            ) : null}
          </div>
        </details>

        <details className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950/60 p-4">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
            Board and governance formats
          </summary>
          <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-4">
            <p className="text-sm text-slate-300">
              Use these when the same call needs a board-ready or governance-specific package.
            </p>
            <div className="flex flex-wrap gap-3">
              <ClipboardActionRow
                label="Copy board note"
                state={clipboardState("Board note")}
                disabled={isCopyDisabled("Board note")}
                onClick={() => void handleCopy(applyOverride(boardNote), "Board note")}
              />
              <ClipboardActionRow
                label="Copy meeting pack"
                state={clipboardState("Meeting pack")}
                disabled={isCopyDisabled("Meeting pack")}
                onClick={() => void handleCopy(meetingPack, "Meeting pack")}
              />
            </div>
            {fallbackActive ? (
              <p className="text-[10px] leading-5 text-amber-200">
                Cached snapshot active: confirm irreversible sharing actions before circulating this package.
              </p>
            ) : null}
          </div>
        </details>

        <details className="mt-4 rounded-lg border border-amber-300/25 bg-amber-500/8 p-4">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">
            Company-specific exception
          </summary>
          <div className="mt-4 space-y-3 border-t border-amber-300/20 pt-4">
            <p className="text-sm text-amber-50">
              Use this only when the exported brief needs an explicit local exception layered onto the standard weekly call.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Reason</span>
                <input
                  className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Local indicator</span>
                <input
                  className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideIndicator}
                  onChange={(event) => setOverrideIndicator(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Owner</span>
                <input
                  className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideOwner}
                  onChange={(event) => setOverrideOwner(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Change course if</span>
                <input
                  className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideReversal}
                  onChange={(event) => setOverrideReversal(event.target.value)}
                />
              </label>
            </div>
            <p className="text-[11px] leading-5 text-amber-100/80">
              When active, the exception is appended to the leadership team brief, plain-English brief, board note, meeting pack, one-screen summary, and board summary exports.
            </p>
          </div>
        </details>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="weather-surface p-4">
            <p className="type-kicker"><WorkAppLabel app="slack" label="Slack brief" /></p>
            <p className="mt-3 text-sm text-slate-300">
              One pasteable block for status updates.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ClipboardActionRow
                label="Copy leadership team brief"
                state={clipboardState("Leadership team brief")}
                disabled={isCopyDisabled("Leadership team brief")}
                onClick={() => void handleCopy(applyOverride(weeklyOperatorPlainText), "Leadership team brief")}
              />
              <ClipboardActionRow
                label="Copy Slack format"
                state={clipboardState("Slack format")}
                disabled={isCopyDisabled("Slack format")}
                onClick={() => void handleCopy(weeklyOperatorSlackBlocks, "Slack format")}
              />
              <ClipboardActionRow
                label="Copy card text"
                state={clipboardState("Card text")}
                disabled={isCopyDisabled("Card text")}
                onClick={() => void handleCopy(weeklyOperatorCardText, "Card text")}
              />
              <ClipboardActionRow
                label={<><span>Copy</span> <WorkAppLabel app="slack" label="brief" className="inline-flex items-center gap-2" /></>}
                state={clipboardState("Slack brief")}
                disabled={isCopyDisabled("Slack brief")}
                onClick={() => void handleCopy(briefing, "Slack brief")}
              />
              <ClipboardActionRow
                label="Copy board summary"
                state={clipboardState("Board summary")}
                disabled={isCopyDisabled("Board summary")}
                onClick={() => void handleCopy(applyOverride(boardBrief), "Board summary")}
              />
              <Button
                type="button"
                onClick={() =>
                  handleDownload(
                    applyOverride(weeklyOperatorPlainText),
                    `whether-weekly-operator-brief-${weeklyOperatorDate}.txt`
                  )
                }
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                Download leadership team brief
              </Button>
              <Button
                type="button"
                onClick={() =>
                  handleDownload(
                    weeklyOperatorSlackBlocks,
                    `whether-weekly-operator-slack-blocks-${weeklyOperatorDate}.json`
                  )
                }
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                Download Slack format
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
              label="Copy key lines"
              state={clipboardState("Key lines")}
              disabled={isCopyDisabled("Key lines")}
              onClick={() => void handleCopy(constraintHeadlines, "Key lines")}
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
              Download key lines
            </Button>
          </div>
          <div className="weather-surface p-4">
            <p className="type-kicker">
              Key lines preview
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
              Agent handoff
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Structured JSON plus a ready-to-use prompt for PM assistants and copilots.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ClipboardActionRow
                label="Copy JSON"
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
                label="Copy prompt"
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
                <WorkAppLabel app="jira" label="Jira note" />
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Paste into the Jira issue description field.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <ClipboardActionRow
                  label={<><span>Copy</span> <WorkAppLabel app="jira" label="note" className="inline-flex items-center gap-2" /></>}
                  state={clipboardState("Jira note")}
                  disabled={isCopyDisabled("Jira note")}
                  onClick={() => void handleCopy(jiraMarkdownBrief, "Jira note")}
                />
                <Button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      jiraMarkdownBrief,
                      `whether-jira-note-${treasury.record_date}.md`
                    )
                  }
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Download <WorkAppLabel app="jira" label="note" className="inline-flex items-center gap-2" />
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                <WorkAppLabel app="confluence" label="Confluence note" />
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Paste into the Confluence page body.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <ClipboardActionRow
                  label={<><span>Copy</span> <WorkAppLabel app="confluence" label="note" className="inline-flex items-center gap-2" /></>}
                  state={clipboardState("Confluence note")}
                  disabled={isCopyDisabled("Confluence note")}
                  onClick={() => void handleCopy(confluenceWikiBrief, "Confluence note")}
                />
                <Button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      confluenceWikiBrief,
                      `whether-confluence-note-${treasury.record_date}.txt`
                    )
                  }
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Download <WorkAppLabel app="confluence" label="note" className="inline-flex items-center gap-2" />
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-300">
                <WorkAppLabel app="linear" label="Linear note" />
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Paste into the Linear issue description field.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <ClipboardActionRow
                  label={<><span>Copy</span> <WorkAppLabel app="linear" label="note" className="inline-flex items-center gap-2" /></>}
                  state={clipboardState("Linear note")}
                  disabled={isCopyDisabled("Linear note")}
                  onClick={() => void handleCopy(linearMarkdownBrief, "Linear note")}
                />
                <Button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      linearMarkdownBrief,
                      `whether-linear-note-${treasury.record_date}.md`
                    )
                  }
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Download <WorkAppLabel app="linear" label="note" className="inline-flex items-center gap-2" />
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
