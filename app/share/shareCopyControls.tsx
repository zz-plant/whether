"use client";

import { useEffect, useMemo, useRef } from "react";
import { trackActivationEvent, type ActivationCommitment } from "../../lib/activationFunnel";
import { useClipboardCopy } from "../components/useClipboardCopy";

type ShareCopyControlsProps = {
  recordDate: string;
  slackBrief: string;
  emailBrief: string;
  meetingPack: string;
  calendarDetails: string;
};

type CopyTarget = "slack" | "email" | "meeting";

const copyLabels: Record<CopyTarget, string> = {
  slack: "Slack brief",
  email: "Email brief",
  meeting: "Meeting pack",
};

const isCopyTarget = (value: string | null): value is CopyTarget => value !== null && value in copyLabels;

/** Copying an artifact is the act with intent — the funnel's `committed` step. */
const copyCommitments: Record<CopyTarget, ActivationCommitment> = {
  slack: "copied_slack",
  email: "copied_email",
  meeting: "copied_meeting",
};

const nextMondayIsoDate = () => {
  const date = new Date();
  const daysUntilMonday = (1 + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return date.toISOString().split("T")[0];
};

export function ShareCopyControls({
  recordDate,
  slackBrief,
  emailBrief,
  meetingPack,
  calendarDetails,
}: ShareCopyControlsProps) {
  const { status, error, copiedTarget: copiedKey, copyToClipboard } = useClipboardCopy();
  const copiedTarget = isCopyTarget(copiedKey) ? copiedKey : null;
  const copyError = error ? "Clipboard access failed. Select the preview text and copy it manually." : null;
  const trackedRef = useRef<string | null>(null);
  // The funnel's `committed` step fires once per successful copy, after the
  // shared hook has confirmed the write actually happened.
  useEffect(() => {
    if (status === "copied" && copiedTarget && trackedRef.current !== copiedTarget) {
      trackedRef.current = copiedTarget;
      trackActivationEvent({ step: "committed", path: "/share", commitment: copyCommitments[copiedTarget] });
    }
    if (status !== "copied") trackedRef.current = null;
  }, [status, copiedTarget]);
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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      {/* content-start: the preview column beside this one is tall, and without
          it these four cards stretched to match, leaving a block of empty space
          under each button. */}
      <div className="grid gap-4 sm:grid-cols-2 content-start">
        <article className="weather-surface space-y-3 px-4 py-4">
          {/* One colour for four peer formats. These were sky / emerald / amber /
              violet, which reads as a status legend on a site where emerald and
              amber mean easing and tightening everywhere else — decoration
              spending the semantic palette on four things that differ only by
              destination. */}
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Slack</h2>
          <p className="text-xs leading-relaxed text-slate-300">Copy the current weekly operator brief for channel handoff.</p>
          <button
            type="button"
            className="weather-button min-h-[44px] px-4 py-2 text-xs font-semibold"
            onClick={() => void copyText("slack", slackBrief)}
          >
            {copiedTarget === "slack" ? "Copied Slack brief" : "Copy Slack brief"}
          </button>
        </article>

        <article className="weather-surface space-y-3 px-4 py-4">
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Email</h2>
          <p className="text-xs leading-relaxed text-slate-300">Copy the same call with citation context for leadership notes.</p>
          <button
            type="button"
            className="weather-button min-h-[44px] px-4 py-2 text-xs font-semibold"
            onClick={() => void copyText("email", emailBrief)}
          >
            {copiedTarget === "email" ? "Copied email brief" : "Copy email brief"}
          </button>
        </article>

        <article className="weather-surface space-y-3 px-4 py-4">
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Meeting pack</h2>
          <p className="text-xs leading-relaxed text-slate-300">Copy the board note, call snapshot, weekly brief, board summary, and citation.</p>
          <button
            type="button"
            className="weather-button min-h-[44px] px-4 py-2 text-xs font-semibold"
            onClick={() => void copyText("meeting", meetingPack)}
          >
            {copiedTarget === "meeting" ? "Copied meeting pack" : "Copy meeting pack"}
          </button>
        </article>

        <article className="weather-surface space-y-3 px-4 py-4">
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-100">Calendar</h2>
          <p className="text-xs leading-relaxed text-slate-300">Open a Monday review invite with the current call in the agenda.</p>
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

      <article className="weather-surface min-w-0 space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-300">
            Preview
          </h2>
          <span className="text-fluid-micro text-slate-400">
            {copiedTarget ? `${copyLabels[copiedTarget]} ready` : "Current Slack brief"}
          </span>
        </div>
        {copyError ? <p className="text-xs text-amber-200">{copyError}</p> : null}
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md border border-slate-800/80 bg-slate-950/80 p-3 text-xs leading-relaxed text-slate-200">
          {slackBrief}
        </pre>
      </article>
    </div>
  );
}
