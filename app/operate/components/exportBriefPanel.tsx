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
import { buildStakeholderBriefs, type StakeholderRole } from "../../../lib/export/stakeholderBriefs";
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
import { DECISION_CONTRACT_LABELS, PRIMARY_AUDIENCE_SHARE_GUIDANCE } from "../../../lib/report/reportCopy";

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
    `${heading2}Whether Weekly Brief — ${treasury.record_date}`,
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
  const [customTeamNote, setCustomTeamNote] = useState("");
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
    customTeamNote: customTeamNote.trim() ? customTeamNote.trim() : undefined,
  }), [assessment, treasury, weeklyOperatorDate, decisionModel, customTeamNote]);
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
  const [activeStakeholderRole, setActiveStakeholderRole] = useState<StakeholderRole>("board");
  const stakeholderBriefs = useMemo(
    () => buildStakeholderBriefs(weeklyOperatorPayload),
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
  const mailSubject = encodeURIComponent(`Whether Weekly Brief — ${treasury.record_date}`);
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
    if (fallbackActive && !window.confirm("Cached snapshot active: U.S. market data is stale. Are you sure? Stale data can mislead decisions about hiring or spending.")) {
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
          title="Update"
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
                className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100 transition-colors hover:text-white"
              >
                <span className="inline-flex items-center gap-1.5"><DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />Print / PDF</span>
              </Button>
              {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
            </>
          }
        />

        <div className="mt-4 rounded-lg border border-sky-400/40 bg-slate-950/70 p-4">
          <p className="type-eyebrow text-sky-200">Share-ready brief</p>
          <p className="mt-1 text-fluid-xs text-slate-400">One click copies everything your team needs in a Slack-ready format.</p>
          <div className="mt-3">
            <label htmlFor="custom-team-note" className="block text-fluid-xs font-medium text-slate-300">
              Add note or company context (optional)
            </label>
            <input
              id="custom-team-note"
              type="text"
              value={customTeamNote}
              onChange={(e) => setCustomTeamNote(e.target.value)}
              placeholder="e.g. All-hands note: holding Q3 hiring open until review"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>
          <div className="mt-3">
            <ClipboardActionRow
              label={<span className="inline-flex items-center gap-1.5"><CopyIcon className="h-4 w-4" aria-hidden="true" />Copy share-ready brief</span>}
              state={clipboardState("Leadership team brief")}
              disabled={isCopyDisabled("Leadership team brief")}
              onClick={() => void handleCopy(applyOverride(weeklyOperatorPlainText), "Leadership team brief")}
              className="weather-cta-primary w-full justify-center px-5 py-3 text-sm"
              buttonProps={{
                "data-premium-intent": "export_brief",
                "data-premium-cta": "copy_weekly_operator_brief",
              }}
            />
          </div>
          <details className="weather-auto-chevron mt-3 border-t border-slate-800/60 pt-3">
            <summary data-chevron className="cursor-pointer list-none text-fluid-xs font-medium text-slate-400 hover:text-slate-300">
              More formats
            </summary>
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
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100 transition-colors hover:text-white"
            >
              <span className="inline-flex items-center gap-1.5"><DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />Print / PDF</span>
            </Button>
          </div>
          </details>
        </div>

        {hasOverride ? (
          <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">
            <p className="type-eyebrow text-amber-100">Override active</p>
            <p className="mt-2">{overrideLine}</p>
          </div>
        ) : null}

        <details className="weather-auto-chevron mt-4 rounded-lg border border-slate-800/80 bg-slate-950/60 p-4">
          <summary data-chevron className="cursor-pointer list-none type-eyebrow text-slate-200">
            Quick share formats
          </summary>
          <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-4">
            <p className="text-sm text-slate-300">
              Faster summaries and citations.
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
              <p className="text-fluid-micro leading-5 text-amber-200">
                Cached snapshot active: U.S. market data is stale. Stage decisions only. Do not lock hiring, spending, or vendor commitments until live data returns.
              </p>
            ) : null}
          </div>
        </details>

        <details className="weather-auto-chevron mt-4 rounded-lg border border-slate-800/80 bg-slate-950/60 p-4">
          <summary data-chevron className="cursor-pointer list-none type-eyebrow text-slate-200">
            Board and governance formats
          </summary>
          <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-4">
            <p className="text-sm text-slate-300">
              Board-ready and governance-specific packages.
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
              <p className="text-fluid-micro leading-5 text-amber-200">
                Cached snapshot active: U.S. market data is stale. Stage decisions only. Do not lock hiring, spending, or vendor commitments until live data returns.
              </p>
            ) : null}
          </div>
        </details>

        <details className="weather-auto-chevron mt-4 rounded-lg border border-amber-300/25 bg-amber-500/8 p-4">
          <summary data-chevron className="cursor-pointer list-none type-eyebrow text-slate-200">
            Company-specific exception
          </summary>
          <div className="mt-4 space-y-3 border-t border-amber-300/20 pt-4">
            <p className="text-sm text-amber-50">
              Add a company-specific exception to all exports.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="type-eyebrow text-amber-100/80">Reason</span>
                <input
                  className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="type-eyebrow text-amber-100/80">Local indicator</span>
                <input
                  className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideIndicator}
                  onChange={(event) => setOverrideIndicator(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="type-eyebrow text-amber-100/80">Owner</span>
                <input
                  className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideOwner}
                  onChange={(event) => setOverrideOwner(event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="type-eyebrow text-amber-100/80">{DECISION_CONTRACT_LABELS.reversal.changeCourseIf}</span>
                <input
                  className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
                  value={overrideReversal}
                  onChange={(event) => setOverrideReversal(event.target.value)}
                />
              </label>
            </div>
            <p className="text-fluid-xs leading-5 text-amber-100/80">
              When active, the exception is appended to the leadership team brief, plain-English brief, board note, meeting pack, one-screen summary, and board summary exports.
            </p>
          </div>
        </details>

        {/* Multi-Stakeholder Transmission Synthesizer */}
        <div className="weather-surface mt-6 p-5 border border-sky-500/30 bg-slate-900/60 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="type-label text-sky-400 font-semibold">AI Transmission Synthesizer</p>
              <h4 className="text-base font-bold text-slate-100">
                1-Click Multi-Stakeholder Briefs
              </h4>
              <p className="text-fluid-xs text-slate-400 mt-0.5">
                One verified macro call synthesized into 5 ready-to-send role perspectives.
              </p>
            </div>
            <ClipboardActionRow
              label={`Copy ${stakeholderBriefs[activeStakeholderRole].title}`}
              state={clipboardState(stakeholderBriefs[activeStakeholderRole].title)}
              disabled={isCopyDisabled(stakeholderBriefs[activeStakeholderRole].title)}
              buttonVariant="pill"
              onClick={() => void handleCopy(applyOverride(stakeholderBriefs[activeStakeholderRole].plainText), stakeholderBriefs[activeStakeholderRole].title)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3 mb-4">
            {(["board", "engineering", "sales", "allHands", "cfo"] as const).map((role) => {
              const brief = stakeholderBriefs[role];
              const isSelected = activeStakeholderRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveStakeholderRole(role)}
                  className={`rounded-md px-3 py-1.5 text-fluid-micro font-medium transition-all ${
                    isSelected
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  {brief.title}
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-fluid-nano text-slate-400 font-semibold uppercase tracking-wider">
                Recipient: {stakeholderBriefs[activeStakeholderRole].recipientLabel}
              </span>
              <span className="text-fluid-nano text-slate-500 font-mono">
                {stakeholderBriefs[activeStakeholderRole].summaryText}
              </span>
            </div>
            <pre className="text-fluid-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {applyOverride(stakeholderBriefs[activeStakeholderRole].plainText)}
            </pre>
          </div>
        </div>

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
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
                >
                Download Slack format
              </Button>
              <a
                href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
              className="weather-button mt-3 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
              className="weather-button mt-3 inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
              className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 font-mono text-base text-slate-200"
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
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
              className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 font-mono text-base text-slate-200"
            />
          </div>
        </div>
        <details className="weather-auto-chevron mt-4 rounded-lg border border-slate-800/80 bg-slate-950/60 p-4">
          <summary data-chevron className="cursor-pointer list-none type-eyebrow text-slate-200">
            Issue tracker formats
          </summary>
          <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-4">
            <p className="text-sm text-slate-300">
              <WorkAppLabel app="jira" label="Jira" className="inline-flex items-center gap-2" />, <WorkAppLabel app="confluence" label="Confluence" className="inline-flex items-center gap-2" />, and <WorkAppLabel app="linear" label="Linear" className="inline-flex items-center gap-2" /> paste tool-optimized summaries into your issue trackers or documentation.
            </p>
            <div className="grid gap-4">
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
                    className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
                    className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
                    className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
                  >
                    Download <WorkAppLabel app="linear" label="note" className="inline-flex items-center gap-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </details>
        <div className="mt-4 min-h-[260px]">
          {copyError ? (
            <div className="rounded-md border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
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
                className="mt-3 w-full rounded-lg border border-amber-400/30 bg-slate-950/80 p-3 font-mono text-base text-amber-100"
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
