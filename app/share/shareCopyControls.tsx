"use client";

import { useMemo } from "react";
import type { ActivationCommitment } from "../../lib/activationFunnel";
import { ClipboardActionRow } from "../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../components/useClipboardCopy";
import { useOperatorRunway } from "../components/useOperatorRunway";
import {
  formatInvestorUpdateSnippet,
  type InvestorUpdateSnippetParts,
} from "../../lib/export/investorUpdateSnippet";

type ShareCopyControlsProps = {
  recordDate: string;
  slackBrief: string;
  emailBrief: string;
  standupLine: string;
  meetingPack: string;
  issueTrackerBrief: string;
  investorUpdate: InvestorUpdateSnippetParts;
  portfolioNote: string;
  calendarDetails: string;
};

type CopyTarget = "slack" | "email" | "standup" | "meeting" | "tracker" | "investor" | "portfolio";

const copyLabels: Record<CopyTarget, string> = {
  slack: "Slack brief",
  email: "Email brief",
  standup: "Standup line",
  meeting: "Meeting pack",
  tracker: "Ticket brief",
  investor: "Investor update",
  portfolio: "Portfolio note",
};

const isCopyTarget = (value: string | null): value is CopyTarget => value !== null && value in copyLabels;

/** Copying an artifact is the act with intent — the funnel's `committed` step. */
const copyCommitments: Record<CopyTarget, ActivationCommitment> = {
  slack: "copied_slack",
  email: "copied_email",
  standup: "copied_brief",
  meeting: "copied_meeting",
  /* The generic one rather than a fifth value: the funnel's question is whether
     a reader copied the call, and widening a telemetry union to split one
     destination off buys a distinction nothing reads. */
  tracker: "copied_brief",
  investor: "copied_brief",
  portfolio: "copied_brief",
};

const nextMondayIsoDate = () => {
  const date = new Date();
  const daysUntilMonday = (1 + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return date.toISOString().split("T")[0];
};

/* Reported by the shared clipboard hook once the write is confirmed, the same
   path every other copy control on the site uses. */
const shareCommitment = (target: string | null) => (isCopyTarget(target) ? copyCommitments[target] : null);

export function ShareCopyControls({
  recordDate,
  slackBrief,
  emailBrief,
  standupLine,
  meetingPack,
  issueTrackerBrief,
  investorUpdate,
  portfolioNote,
  calendarDetails,
}: ShareCopyControlsProps) {
  const { status, error, activeTarget, copiedTarget: copiedKey, copyToClipboard } = useClipboardCopy({ commitment: shareCommitment });
  const clipboardState = (target: CopyTarget) =>
    getClipboardUiState(target, { status, error, activeTarget, copiedTarget: copiedKey });
  // The one paragraph that depends on the reader's company comes from the
  // browser: the page is cached, so the server built the reading without it.
  const { runwayBand } = useOperatorRunway();
  const investorUpdateText = useMemo(
    () => formatInvestorUpdateSnippet(investorUpdate, runwayBand),
    [investorUpdate, runwayBand],
  );
  const copiedTarget = isCopyTarget(copiedKey) ? copiedKey : null;
  const copyError = error ? "Clipboard access failed. Select the preview text and copy it manually." : null;
  const calendarHref = useMemo(() => {
    const date = nextMondayIsoDate();
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Whether weekly brief review — ${recordDate}`,
      dates: `${date.replaceAll("-", "")}T140000Z/${date.replaceAll("-", "")}T143000Z`,
      details: calendarDetails,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [calendarDetails, recordDate]);

  const copyText = (target: CopyTarget, text: string) => copyToClipboard(text, target);

  const previewText = useMemo(() => {
    switch (copiedTarget) {
      case "email":
        return emailBrief;
      case "standup":
        return standupLine;
      case "meeting":
        return meetingPack;
      case "tracker":
        return issueTrackerBrief;
      case "investor":
        return investorUpdateText;
      case "portfolio":
        return portfolioNote;
      default:
        return slackBrief;
    }
  }, [copiedTarget, emailBrief, standupLine, meetingPack, issueTrackerBrief, investorUpdateText, portfolioNote, slackBrief]);

  /* The card whose text the preview is showing, marked on the card itself:
     "Current Slack brief" in the preview's corner was the only link between
     the two, and no card looked chosen. */
  const previewed: CopyTarget = copiedTarget ?? "slack";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      {/* content-start: the preview column beside this one is tall, and without
          it these cards stretched to match, leaving a block of empty space
          under each button. */}
      <div className="grid gap-4 sm:grid-cols-2 content-start">
        <article className="weather-surface space-y-3 px-4 py-4" data-previewed={previewed === "slack" ? "true" : undefined}>
          {/* One colour for every peer format. These were sky / emerald / amber /
              violet, which reads as a status legend on a site where emerald and
              amber mean easing and tightening everywhere else — decoration
              spending the semantic palette on things that differ only by
              destination. */}
          <h3 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Slack</h3>
          <p className="text-xs leading-relaxed text-slate-300">Copy the current weekly operator brief for channel handoff.</p>
          <ClipboardActionRow
            label="Copy Slack brief"
            state={clipboardState("slack")}
            onClick={() => void copyText("slack", slackBrief)}
            buttonLabels={{ error: "Copy failed" }}
          />
        </article>

        <article className="weather-surface space-y-3 px-4 py-4" data-previewed={previewed === "email" ? "true" : undefined}>
          <h3 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Email</h3>
          <p className="text-xs leading-relaxed text-slate-300">Copy the same guidance with citation context for leadership notes.</p>
          <ClipboardActionRow
            label="Copy email brief"
            state={clipboardState("email")}
            onClick={() => void copyText("email", emailBrief)}
            buttonLabels={{ error: "Copy failed" }}
          />
        </article>

        <article className="weather-surface space-y-3 px-4 py-4" data-previewed={previewed === "standup" ? "true" : undefined}>
          <h3 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Standup</h3>
          <p className="text-xs leading-relaxed text-slate-300">Copy the one-sentence macro status line for daily standup.</p>
          <ClipboardActionRow
            label="Copy standup line"
            state={clipboardState("standup")}
            onClick={() => void copyText("standup", standupLine)}
            buttonLabels={{ error: "Copy failed" }}
          />
        </article>

        <article className="weather-surface space-y-3 px-4 py-4" data-previewed={previewed === "meeting" ? "true" : undefined}>
          <h3 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Meeting pack</h3>
          <p className="text-xs leading-relaxed text-slate-300">Copy the board note, guidance snapshot, weekly brief, board summary, and citation.</p>
          <ClipboardActionRow
            label="Copy meeting pack"
            state={clipboardState("meeting")}
            onClick={() => void copyText("meeting", meetingPack)}
            buttonLabels={{ error: "Copy failed" }}
          />
        </article>

        <article className="weather-surface space-y-3 px-4 py-4" data-previewed={previewed === "tracker" ? "true" : undefined}>
          <h3 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Issue tracker</h3>
          <p className="text-xs leading-relaxed text-slate-300">Copy the guidance in Markdown for a Jira or Linear ticket, or a wiki page.</p>
          <ClipboardActionRow
            label="Copy ticket brief"
            state={clipboardState("tracker")}
            onClick={() => void copyText("tracker", issueTrackerBrief)}
            buttonLabels={{ error: "Copy failed" }}
          />
        </article>

        <article className="weather-surface space-y-3 px-4 py-4" data-previewed={previewed === "investor" ? "true" : undefined}>
          <h3 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Investor update</h3>
          <p className="text-xs leading-relaxed text-slate-300">
            {runwayBand
              ? "Copy two paragraphs for the market section of a monthly letter: the conditions and how they moved since last month-end, then the guidance and what your runway band means for it."
              : "Copy two paragraphs for the market section of a monthly letter: the conditions and how they moved since last month-end, then the guidance. Pick a runway band on the brief to add what it means for your cash."}
          </p>
          <ClipboardActionRow
            label="Copy investor update"
            state={clipboardState("investor")}
            onClick={() => void copyText("investor", investorUpdateText)}
            buttonLabels={{ error: "Copy failed" }}
          />
        </article>

        <article className="weather-surface space-y-3 px-4 py-4" data-previewed={previewed === "portfolio" ? "true" : undefined}>
          <h3 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Portfolio note</h3>
          <p className="text-xs leading-relaxed text-slate-300">
            For an investor or accelerator writing to the companies it backs: the conditions, each area&apos;s rule
            and lines, and what the week means at every runway, with a link for each company to set its own lines.
          </p>
          <ClipboardActionRow
            label="Copy portfolio note"
            state={clipboardState("portfolio")}
            onClick={() => void copyText("portfolio", portfolioNote)}
            buttonLabels={{ error: "Copy failed" }}
          />
        </article>

        <article className="weather-surface space-y-3 px-4 py-4">
          <h3 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Calendar</h3>
          <p className="text-xs leading-relaxed text-slate-300">Open a Monday review invite with the current guidance in the agenda.</p>
          <a
            href={calendarHref}
            target="_blank"
            rel="noreferrer"
            className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold no-underline"
          >
            Add review
          </a>
        </article>
      </div>

      {/* Held beside the cards while they scroll, instead of stretching to their
          height with a block of empty panel under the text. */}
      <article className="weather-surface min-w-0 space-y-3 self-start px-4 py-4 lg:sticky lg:top-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-300">
            Preview
          </h3>
          <span className="text-fluid-micro text-slate-400">
            {copiedTarget ? `${copyLabels[copiedTarget]} ready` : "Current Slack brief"}
          </span>
        </div>
        {copyError ? <p className="text-xs text-amber-200">{copyError}</p> : null}
        <pre className="max-h-[32rem] overflow-auto overscroll-contain whitespace-pre-wrap rounded-md border border-slate-800/80 bg-slate-950/80 p-3 text-xs leading-relaxed text-slate-200">
          {previewText}
        </pre>
      </article>
    </div>
  );
}
