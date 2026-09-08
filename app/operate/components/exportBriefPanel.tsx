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
import { type StakeholderRole } from "../../../lib/export/stakeholderBriefs";
import { buildExplainerBriefContent } from "../../../lib/export/explainerBrief";
import { type ExportDecisionModel } from "../../../lib/export/issueTrackerBrief";
import { buildExportBriefArtifacts } from "../../../lib/export/exportBriefArtifacts";
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
import {
  EMPTY_OVERRIDE,
  ExportDownloadButton,
  ExportOverrideFields,
  ExportPreviewPane,
  ExportTargetGrid,
  formatOverrideLine,
  isOverrideComplete,
  type OverrideDraft,
} from "./exportBriefFields";
import { WorkAppLabel } from "../../components/workAppIcon";
import { CopyIcon, DocumentIcon, DownloadIcon } from "../../components/uiIcons";
import { PRIMARY_AUDIENCE_SHARE_GUIDANCE } from "../../../lib/report/reportCopy";

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
  const [override, setOverride] = useState<OverrideDraft>(EMPTY_OVERRIDE);
  const [customTeamNote, setCustomTeamNote] = useState("");
  const fallbackActive = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const hasOverride = isOverrideComplete(override);
  const overrideLine = formatOverrideLine(override);
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

  // One pure builder instead of twenty memos. Everything here is derived from
  // props plus the team note; the override banner is applied per artifact below.
  const artifacts = useMemo(
    () => buildExportBriefArtifacts({ assessment, treasury, sensors, macroSeries, decisionModel, customTeamNote }),
    [assessment, treasury, sensors, macroSeries, decisionModel, customTeamNote],
  );
  const {
    weekEndingDate,
    briefing,
    weeklyOperatorPlainText,
    weeklyOperatorSlackBlocks,
    weeklyOperatorCardText,
    stakeholderBriefs,
    citation,
    markdownBrief,
    wikiBrief,
    slideBullets,
    boardBrief,
    boardNote,
    callSnapshot,
    constraintHeadlines,
    agentPayload,
    agentPrompt,
  } = artifacts;
  const [activeStakeholderRole, setActiveStakeholderRole] = useState<StakeholderRole>("board");
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
          label="Share"
          title="Pick a format and copy"
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
          <ExportOverrideFields draft={override} onChange={setOverride} />
        </details>

        {/* Briefs for each audience */}
        <div className="weather-surface mt-6 p-5 border border-sky-500/30 bg-slate-900/60 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="type-label text-sky-400 font-semibold">By audience</p>
              <h4 className="text-base font-bold text-slate-100">
                Briefs for each audience
              </h4>
              <p className="text-fluid-xs text-slate-400 mt-0.5">
                One call, five ready-to-send versions: board, engineering, sales, all-hands, finance.
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

        <ExportTargetGrid className="mt-6">
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
              <ExportDownloadButton
                label="Download leadership team brief"
                content={applyOverride(weeklyOperatorPlainText)}
                fileName={`whether-weekly-operator-brief-${weekEndingDate}.txt`}
                onDownload={handleDownload}
                className="mt-0"
              />
              <ExportDownloadButton
                label="Download Slack format"
                content={weeklyOperatorSlackBlocks}
                fileName={`whether-weekly-operator-slack-blocks-${weekEndingDate}.json`}
                onDownload={handleDownload}
                className="mt-0"
              />
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
            <ExportDownloadButton
              label="Download bullets"
              content={slideBullets}
              fileName={`whether-slide-bullets-${treasury.record_date}.txt`}
              onDownload={handleDownload}
            />
          </div>
        </ExportTargetGrid>
        <ExportTargetGrid>
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
            <ExportDownloadButton
              label="Download key lines"
              content={constraintHeadlines}
              fileName={`whether-headlines-${treasury.record_date}.txt`}
              onDownload={handleDownload}
            />
          </div>
          <ExportPreviewPane
            title="Key lines preview"
            description="Keep the text intact when sharing to preserve sourcing."
            value={constraintHeadlines}
          />
        </ExportTargetGrid>
        <ExportTargetGrid>
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
              <ExportDownloadButton
                label="Download JSON"
                content={agentPayload}
                fileName={`whether-agent-payload-${treasury.record_date}.json`}
                onDownload={handleDownload}
                className="mt-0"
              />
              <ClipboardActionRow
                label="Copy prompt"
                state={clipboardState("Agent prompt")}
                disabled={isCopyDisabled("Agent prompt")}
                onClick={() => void handleCopy(agentPrompt, "Agent prompt")}
              />
              <ExportDownloadButton
                label="Download prompt"
                content={agentPrompt}
                fileName={`whether-agent-prompt-${treasury.record_date}.txt`}
                onDownload={handleDownload}
                className="mt-0"
              />
            </div>
          </div>
          <ExportPreviewPane
            title="Agent payload preview"
            description="Keep the JSON intact to preserve provenance and timestamps."
            value={agentPayload}
            rows={10}
          />
        </ExportTargetGrid>
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
                    onClick={() => void handleCopy(markdownBrief, "Jira note")}
                  />
                  <ExportDownloadButton
                    label={<><span>Download</span> <WorkAppLabel app="jira" label="note" className="inline-flex items-center gap-2" /></>}
                    content={markdownBrief}
                    fileName={`whether-jira-note-${treasury.record_date}.md`}
                    onDownload={handleDownload}
                    className="mt-0"
                  />
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
                    onClick={() => void handleCopy(wikiBrief, "Confluence note")}
                  />
                  <ExportDownloadButton
                    label={<><span>Download</span> <WorkAppLabel app="confluence" label="note" className="inline-flex items-center gap-2" /></>}
                    content={wikiBrief}
                    fileName={`whether-confluence-note-${treasury.record_date}.txt`}
                    onDownload={handleDownload}
                    className="mt-0"
                  />
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
                    onClick={() => void handleCopy(markdownBrief, "Linear note")}
                  />
                  <ExportDownloadButton
                    label={<><span>Download</span> <WorkAppLabel app="linear" label="note" className="inline-flex items-center gap-2" /></>}
                    content={markdownBrief}
                    fileName={`whether-linear-note-${treasury.record_date}.md`}
                    onDownload={handleDownload}
                    className="mt-0"
                  />
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
        <output className="sr-only" aria-live="polite">
          {copiedTarget ? `${copiedTarget} brief copied to clipboard.` : ""}
        </output>
      </div>
    </section>
  );
};
